# Glance demo recording — notes for Tuesday 24 Nov 2026

Pipeline built and smoke-tested Mon 23 Nov 2026 (~11:00 WITA).
Recorder: `scripts/record-demo.py`. Demo script: `docs/demo-video-script.md`.
Simulator setup (libs, env vars): `docs/simulator-vm-setup.md`.

## Status

- x11grab path WORKS. Smoke take 23 Nov: 1920x1080 H.264 30fps,
  24.1 s, 0.2 MB, all inputs ok (down, click, long_press), ffmpeg
  stopped clean (code 0), 3/3 sampled frames non-blank and visually
  confirmed (live CoinGecko prices + ETH armed with `!`).
  Clip: `docs/smoke-recording-test.mp4`
  (+ `.ffmpeg.log` and `.frames/` beside it).
- Screenshot-API fallback was NOT needed and is untested; see §7.

## 1. Tuesday runbook (exact commands, in order)

All commands from `~/workspace/g2-hackathon` unless noted.
The VM may have been replaced overnight: ALWAYS redo step 1a.

### 1a. Recreate the system symlinks (die on every VM replacement)

```sh
ls /usr/lib/x86_64-linux-gnu/webkit2gtk-4.1 \
   /usr/share/glvnd/egl_vendor.d/50_mesa.json || {
  ln -s ~/g2-sim-libs/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1 \
        /usr/lib/x86_64-linux-gnu/webkit2gtk-4.1
  mkdir -p /usr/share/glvnd/egl_vendor.d
  ln -s ~/g2-sim-libs/usr/share/glvnd/egl_vendor.d/50_mesa.json \
        /usr/share/glvnd/egl_vendor.d/50_mesa.json
}
```

### 1b. Start Xvfb on the fixed display :99 (1920x1080)

```sh
Xvfb :99 -screen 0 1920x1080x24 >/tmp/xvfb-99.log 2>&1 &
```

Do NOT use `xvfb-run -a` for recording: the recorder needs a known
display number (`:99`) for the x11grab input.

### 1c. Start the dev server

```sh
cd ~/workspace/g2-hackathon
nohup npm run dev >/tmp/glance-dev.log 2>&1 &
# wait for "VITE ready" on http://localhost:5173
```

### 1d. Start the simulator (same env as simulator-vm-setup.md §4)

```sh
export PATH=~/.npm-global/bin:$PATH
export LD_LIBRARY_PATH=~/g2-sim-libs/usr/lib/x86_64-linux-gnu
export WEBKIT_DISABLE_COMPOSITING_MODE=1
export WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1
export LIBGL_ALWAYS_SOFTWARE=1
export GALLIUM_DRIVER=llvmpipe
export LIBGL_DRIVERS_PATH=~/g2-sim-libs/usr/lib/x86_64-linux-gnu/dri
export GIO_MODULE_DIR=~/g2-sim-libs/usr/lib/x86_64-linux-gnu/gio/modules-tls
cd ~/workspace/g2-hackathon
DISPLAY=:99 nohup evenhub-simulator http://localhost:5173 \
  --automation-port 9898 >/tmp/evenhub-sim.log 2>&1 &
```

### 1e. Verify readiness WITHOUT sending inputs

`scripts/sim-check.py` sends down+click, which arms ETH — that ruins
the fresh state the full take needs. Use the no-input check instead
(ping + ready marker + one screenshot, no inputs):

```sh
python3 - << 'EOF'
import importlib.util, time
spec = importlib.util.spec_from_file_location(
    "sim_check", "scripts/sim-check.py")
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
base = "http://127.0.0.1:9898"
m.wait_for_ping(base); m.wait_for_ready(base); time.sleep(2)
img = m.get_png(base, "/api/screenshot/glasses")
print(f"boot: {img.size} lit={m.lit_pixel_count(img)} (expect lit > 100)")
EOF
```

### 1f. Smoke-test the pipeline again on the day (~25 s)

```sh
python3 scripts/record-demo.py --mode smoke --out /tmp/smoke-tue.mp4
```

Expect `RECORDING OK`, 1920x1080, ~24 s. This arms ETH, so the
simulator MUST be restarted before the full take (step 1g).

### 1g. Restart the simulator for a FRESH state (focus row 0, no alerts)

Kill by PID (find with `ps aux | grep evenhub`), never `pkill -f`
with a pattern that matches your own shell command line:

```sh
kill <node-wrapper-pid> <native-sim-pid>
sleep 3
# then repeat step 1d, and re-run the step 1e readiness check
```

### 1h. Record the full take (~2:43 incl. overhead)

```sh
python3 scripts/record-demo.py --mode full --out docs/demo-raw.mp4
```

The script prints each input as it fires, stops ffmpeg cleanly, then
self-verifies with ffprobe + 3 extracted frames. Expect `RECORDING OK`,
1920x1080 H.264 30fps, ~163 s, a few MB. View one frame in
`docs/demo-raw.mp4.frames/` before calling it done.

### 1i. Clean up (no background processes left running)

```sh
kill <sim-pids> <vite-pid> <xvfb-pid>
ps aux | grep -E 'evenhub|vite|Xvfb :99' | grep -v grep  # expect none
```

## 2. Display layout (measured 23 Nov, 1920x1080)

- Simulator window: ~1200x800, centered at about (360, 140).
- Companion (phone) UI: x 364..959, y 140..939 (596x800).
- Glasses framebuffer: x 972..1548, y 140..428 (576x288).
  Crop verified visually 23 Nov: nothing cut off.
- Simulator buttons (Up/Down/Click/Double Click/Long Press/Menu):
  y ~430..470, under the glasses frame.
- X cursor: a small X sits near the display centre (~965, 540), in the
  black gap between the panels. Visible but tiny; glasses-region crops
  exclude it. No xdotool/unclutter on this VM to move or hide it.

Post-production crops (ffmpeg):

```sh
# Glasses only, 2x upscale for legibility (shots 1-4):
ffmpeg -i docs/demo-raw.mp4 -vf "crop=576:288:972:140,scale=1152:576:flags=neighbor" -c:a copy glasses.mp4
# Phone companion UI only (shot 5):
ffmpeg -i docs/demo-raw.mp4 -vf "crop=596:800:364:140" phone.mp4
```

## 3. Control-plane actions (verified 23 Nov)

- `down`, `up`, `click` — ok.
- `long_press` — ok (NOT `longpress`: that returns HTTP 400).
- `double_click` — NEVER send during a take: the app calls
  `shutDownPageContainer` (exits the app page).
- The recorder imports these from `scripts/sim-check.py` via importlib
  (the hyphenated filename is not a normal import).

## 4. Focus-border quirk (verified 23 Nov)

- `down`/`up` move the selection border visibly through the rows
  (BTC -> ETH -> SOL -> HYPE and back), as long as no click happens.
- After a `click`, the app rebuilds the page and the border resets to
  row 0 (BTC), even though the toggle landed on the correct row.
  The armed `!` marker on the row persists — that is what the camera
  needs to see, not the border.
- Consequence for the shot plan: the pan (shot 2) does all its moves
  BEFORE the arming click (shot 3). No navigation is needed after the
  click (shots 4-6 are holds + one long-press).

## 5. The ALERT banner (shot 4) — read this before Tuesday

- The banner (`ALERT ETH +5.0%` in the header) triggers ONLY on a real
  +/-5% price move from the armed base price, checked on the 60 s
  CoinGecko poll. Confirmed by reading `src/alerts.ts` + `src/main.ts`:
  there is NO simulation hook, test mode, or query param to fake it.
- A 5% move will not happen during a ~3-minute recording. The
  recorder therefore HOLDS on the armed ETH row for shot 4 (30 s);
  the editor cuts in a still as the script says.
- Honesty caveat: `docs/sim-2026-11-21-toggle.png` shows the ARMED
  state (`!`), NOT the triggered state (`!!` + banner). No
  triggered-state image exists anywhere — it has never been seen on
  screen. Do NOT fabricate a triggered banner graphic and present it
  as live footage. The triggered header rendering IS covered by unit
  tests (`src/__tests__/render.test.ts`), so the honest narration is:
  arm the alert on camera, explain what happens at +/-5%, cut to the
  armed still.
- If a live triggered demo is wanted, it needs a code change (a demo
  hook) + re-verification. That is a decision for doom, NOT part of
  this pipeline task. Do not modify app code for the recording.

## 6. Encoder performance (measured 23 Nov)

- `veryfast` + 30fps: final speed ~0.996x, 1 dropped frame in 24 s.
  The sub-1.0x average is startup warm-up (fps climbs 10 -> 30 in the
  first ~2 s); steady state holds 30fps. One dropped frame on mostly
  static content is invisible.
- `superfast` + 24fps tested as an alternative: same ~0.996x. The
  bottleneck is x11grab/llvmpipe capture, not the x264 preset.
  Keep `veryfast` + 30fps (the script default).
- Output is small (0.2 MB for 24 s; expect ~1-2 MB for the full take)
  because most of the frame is static black. `-movflags +faststart`
  is set, so the file is streamable immediately.
- The raw mp4 has NO audio track (x11grab is video-only). Voiceover
  is recorded after the footage, per the demo script.

## 7. Fallback if x11grab ever fails (NOT tested)

Grab framebuffer stills from the control plane in a loop and assemble:

```sh
# ~10 fps for N seconds, then:
ffmpeg -framerate 10 -i frame-%04d.png -c:v libx264 -pix_fmt yuv420p \
  -vf "scale=1152:576:flags=neighbor" fallback.mp4
```

Caveats: the `/api/screenshot/glasses` PNGs are RGBA 576x288 with
alpha 0 = background — composite over black first (PIL
`alpha_composite` on a black background), or the video comes out
transparent/black. This path captures ONLY the glasses framebuffer,
not the phone companion UI, so shots 5-6 would need a second source.

## 8. Files

- `scripts/record-demo.py` — the recorder (smoke + full modes).
- `docs/smoke-recording-test.mp4` — 23 Nov smoke take (24.1 s,
  1920x1080 H.264 30fps, 0.2 MB) + `.ffmpeg.log` + `.frames/`.
- `docs/demo-video-script.md` — shot table the recorder follows.
- `docs/sim-2026-11-21-toggle.png` — armed-state still for the
  shot-4 cutaway (see §5 caveat).
