#!/usr/bin/env python3
"""Record the Glance demo video from the Even Hub simulator on this VM.

Captures the Xvfb display with ffmpeg x11grab at 1080p while driving the
simulator through the demo shot sequence via the HTTP control plane
(port 9898). Shot table: docs/demo-video-script.md. Full Tuesday runbook
(launcher, display, gotchas): scripts/RECORDING-NOTES.md.

Modes:
  --mode smoke : ~22 s, boot + arm ETH + long-press refresh (pipeline test)
  --mode full  : ~2:40, the full 6-shot demo sequence for Tuesday

The dev server and simulator must already be running on the given display
(see RECORDING-NOTES.md). This script waits for the app ready marker, then
starts ffmpeg, then runs the timed input sequence, then stops ffmpeg
cleanly and verifies the output with ffprobe + frame grabs.

Usage:
  python3 scripts/record-demo.py --mode smoke --out docs/smoke-recording-test.mp4
  python3 scripts/record-demo.py --mode full  --out docs/demo-raw.mp4

Exit code 0 when the recording exists, has the expected resolution and
duration, and the sampled frames are not blank.
"""
import argparse
import importlib.util
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

_spec = importlib.util.spec_from_file_location(
    "sim_check", os.path.join(HERE, "sim-check.py")
)
sim_check = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sim_check)
wait_for_ping = sim_check.wait_for_ping
wait_for_ready = sim_check.wait_for_ready
post_json = sim_check.post_json

DISPLAY = ":99"
WIDTH, HEIGHT, FPS = 1920, 1080, 30

# A step is (hold_seconds_after, action_or_None, label). The clock runs on
# monotonic deadlines so input latency does not drift the shot lengths.
SMOKE_STEPS = [
    (5.0, None, "settle: live watchlist"),
    (0.5, "down", "focus ETH"),
    (10.0, "click", "arm ETH alert"),
    (5.0, "long_press", "long-press refresh"),
    (2.0, None, "closing hold"),
]

# Full sequence follows docs/demo-video-script.md (total 160 s = 2:40).
# Shot 4 (ALERT banner) cannot trigger live: no +/-5% move happens during
# a recording and the app has no simulation hook (see RECORDING-NOTES.md).
# The recorder holds on the armed ETH row; the editor cuts in the
# 21 Nov armed-state screenshot as a still.
FULL_STEPS = [
    # Shot 1, 0:00-0:15: boot / live prices.
    (15.0, None, "shot 1: live watchlist"),
    # Shot 2, 0:15-0:45: slow pan down the rows and back (border moves
    # with down/up as long as no click/rebuild happens in between).
    (5.0, "down", "shot 2: focus ETH"),
    (5.0, "down", "shot 2: focus SOL"),
    (5.0, "down", "shot 2: focus HYPE"),
    (5.0, "up", "shot 2: back to SOL"),
    (5.0, "up", "shot 2: back to ETH"),
    (5.0, "up", "shot 2: back to BTC"),
    # Shot 3, 0:45-1:20: arm the ETH alert.
    (0.5, "down", "shot 3: focus ETH"),
    (34.5, "click", "shot 3: arm ETH, hold on '!' marker"),
    # Shot 4, 1:20-1:50: triggered-state slot (see note above).
    (30.0, None, "shot 4: hold armed ETH (banner cutaway in post)"),
    # Shot 5, 1:50-2:15: long-press refresh; phone UI is in frame already.
    (25.0, "long_press", "shot 5: refresh + phone companion UI"),
    # Shot 6, 2:15-2:40: closing frame, glasses + phone side by side.
    (25.0, None, "shot 6: closing hold"),
]


def send_input(base: str, action: str) -> bool:
    try:
        post_json(base, "/api/input", {"action": action})
        return True
    except Exception as e:  # noqa: BLE001 - a missed input must not kill the take
        print(f"  WARNING: input {action!r} failed: {e}", flush=True)
        return False


def start_ffmpeg(display: str, out_path: str, log_path: str) -> subprocess.Popen:
    log = open(log_path, "w")
    cmd = [
        "ffmpeg", "-y", "-hide_banner",
        "-f", "x11grab",
        "-video_size", f"{WIDTH}x{HEIGHT}",
        "-framerate", str(FPS),
        "-i", display,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "veryfast",
        "-crf", "20",
        "-movflags", "+faststart",
        out_path,
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=log,
                            stderr=subprocess.STDOUT)
    time.sleep(1.5)
    if proc.poll() is not None:
        raise RuntimeError(
            f"ffmpeg exited early (code {proc.returncode}); see {log_path}")
    print(f"ffmpeg recording {display} -> {out_path} (pid {proc.pid})",
          flush=True)
    return proc


def stop_ffmpeg(proc: subprocess.Popen) -> None:
    """Graceful stop: 'q' on stdin, then SIGINT, then SIGKILL."""
    if proc.poll() is not None:
        return
    try:
        proc.stdin.write(b"q")
        proc.stdin.flush()
    except (BrokenPipeError, ValueError):
        pass
    try:
        proc.wait(timeout=10)
        return
    except subprocess.TimeoutExpired:
        pass
    proc.send_signal(2)  # SIGINT
    try:
        proc.wait(timeout=10)
        return
    except subprocess.TimeoutExpired:
        pass
    proc.kill()
    proc.wait(timeout=10)


def ffprobe_summary(path: str) -> dict:
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,codec_name,r_frame_rate",
        "-show_entries", "format=duration,size",
        "-of", "json",
        path,
    ]
    out = subprocess.run(cmd, capture_output=True, text=True, check=True)
    data = json.loads(out.stdout)
    stream = (data.get("streams") or [{}])[0]
    fmt = data.get("format") or {}
    return {
        "width": stream.get("width"),
        "height": stream.get("height"),
        "codec": stream.get("codec_name"),
        "fps": stream.get("r_frame_rate"),
        "duration": float(fmt.get("duration", 0) or 0),
        "size": int(fmt.get("size", 0) or 0),
    }


def extract_frames(path: str, duration: float, frames_dir: str) -> list:
    os.makedirs(frames_dir, exist_ok=True)
    times = [duration * f for f in (0.25, 0.5, 0.75)]
    paths = []
    for i, t in enumerate(times):
        fp = os.path.join(frames_dir, f"frame{i + 1}-t{t:.1f}s.png")
        subprocess.run(
            ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
             "-ss", f"{t:.2f}", "-i", path, "-frames:v", "1", fp],
            check=True)
        paths.append(fp)
    return paths


def frame_nonblack_fraction(path: str) -> float:
    from PIL import Image
    im = Image.open(path).convert("L")
    hist = im.histogram()
    total = sum(hist)
    black = sum(hist[:16])
    return 1.0 - black / total


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=("smoke", "full"), default="smoke")
    ap.add_argument("--display", default=DISPLAY)
    ap.add_argument("--port", type=int, default=9898)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    base = f"http://127.0.0.1:{args.port}"
    steps = SMOKE_STEPS if args.mode == "smoke" else FULL_STEPS
    total_s = sum(s[0] for s in steps)
    out_path = os.path.abspath(args.out)
    log_path = out_path + ".ffmpeg.log"
    frames_dir = out_path + ".frames"

    print(f"mode={args.mode} total~{total_s:.0f}s out={out_path}", flush=True)
    print("waiting for simulator control plane ...", flush=True)
    wait_for_ping(base)
    print("waiting for app ready marker ...", flush=True)
    wait_for_ready(base)
    time.sleep(2)  # let the first price poll land
    print("app ready, starting ffmpeg", flush=True)

    proc = start_ffmpeg(args.display, out_path, log_path)
    t0 = time.monotonic()
    try:
        for hold, action, label in steps:
            if action:
                ok = send_input(base, action)
                print(f"  t+{time.monotonic() - t0:6.1f}s {label} "
                      f"({'ok' if ok else 'FAILED'})", flush=True)
            else:
                print(f"  t+{time.monotonic() - t0:6.1f}s {label}", flush=True)
            deadline = time.monotonic() + hold
            while time.monotonic() < deadline:
                if proc.poll() is not None:
                    raise RuntimeError(
                        f"ffmpeg died mid-take (code {proc.returncode}); "
                        f"see {log_path}")
                time.sleep(0.2)
    finally:
        stop_ffmpeg(proc)
    print(f"ffmpeg stopped (code {proc.returncode}), "
          f"take lasted {time.monotonic() - t0:.1f}s", flush=True)

    info = ffprobe_summary(out_path)
    print(f"output: {info['width']}x{info['height']} {info['codec']} "
          f"{info['fps']}fps duration={info['duration']:.1f}s "
          f"size={info['size'] / 1e6:.1f} MB", flush=True)
    frames = extract_frames(out_path, info["duration"], frames_dir)
    problems = []
    if (info["width"], info["height"]) != (WIDTH, HEIGHT):
        problems.append(f"resolution {info['width']}x{info['height']} "
                        f"!= {WIDTH}x{HEIGHT}")
    if info["duration"] < total_s * 0.8:
        problems.append(f"duration {info['duration']:.1f}s < 80% of "
                        f"planned {total_s:.0f}s")
    for fp in frames:
        frac = frame_nonblack_fraction(fp)
        print(f"  frame {os.path.basename(fp)}: non-black {frac:.1%}",
              flush=True)
        if frac < 0.02:
            problems.append(f"frame {fp} looks blank")
    if problems:
        print("VERIFY FAILED:", "; ".join(problems), flush=True)
        return 1
    print("RECORDING OK", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
