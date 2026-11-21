#!/usr/bin/env python3
"""Headless simulator check for Glance (Even Hub simulator 0.7.0+).

Drives the simulator's HTTP control plane:
  1. waits for the app ready marker in the console buffer
  2. screenshots the 576x288 glasses framebuffer, asserts it is not blank
  3. sends down + click (toggle the alert on the 2nd row, ETH)
  4. screenshots again and asserts the framebuffer changed
  5. reports console errors (failed fetch, uncaught exceptions)

Usage:
  evenhub-simulator http://localhost:5173 --automation-port 9898
  python3 scripts/sim-check.py [--port 9898] [--outdir /tmp]

Exit code 0 when all assertions pass.
"""
import argparse
import io
import json
import sys
import time
from urllib.request import Request, urlopen
from urllib.error import URLError

from PIL import Image

READY_MARKER = "[glance] ready"
TIMEOUT_S = 60


def get_json(base: str, path: str):
    with urlopen(f"{base}{path}", timeout=10) as r:
        return json.loads(r.read())


def get_png(base: str, path: str) -> Image.Image:
    with urlopen(f"{base}{path}", timeout=15) as r:
        return Image.open(io.BytesIO(r.read()))


def post_json(base: str, path: str, body: dict):
    req = Request(
        f"{base}{path}",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(req, timeout=10) as r:
        return r.read()


def lit_pixel_count(img: Image.Image) -> int:
    assert img.mode == "RGBA", f"expected RGBA, got {img.mode}"
    return sum(1 for px in img.getdata() if px[3] > 0)


def get_text(base: str, path: str) -> str:
    with urlopen(f"{base}{path}", timeout=10) as r:
        return r.read().decode("utf-8", "replace").strip()


def wait_for_ping(base: str, timeout: float = TIMEOUT_S) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            # /api/ping answers plain text "pong", not JSON.
            if get_text(base, "/api/ping") == "pong":
                return
        except (URLError, OSError, ValueError):
            pass
        time.sleep(0.5)
    raise TimeoutError("simulator control plane did not answer /api/ping")


def wait_for_ready(base: str, timeout: float = TIMEOUT_S) -> list:
    """Poll the console buffer until the app logs its ready marker."""
    deadline = time.time() + timeout
    since_id = 0
    seen = []
    while time.time() < deadline:
        data = get_json(base, f"/api/console?since_id={since_id}")
        for entry in data.get("entries", []):
            since_id = max(since_id, entry.get("id", 0))
            seen.append(entry)
            if READY_MARKER in entry.get("message", ""):
                return seen
        time.sleep(0.5)
    raise TimeoutError(f"app did not log {READY_MARKER!r} within {timeout}s")


def console_errors(entries: list) -> list:
    bad = []
    for e in entries:
        msg = (e.get("message") or "").lower()
        level = (e.get("level") or "").lower()
        if level in ("error", "warning") and "429" not in msg:
            bad.append(e)
        if "failed" in msg or "uncaught" in msg or "typeerror" in msg:
            bad.append(e)
    return bad


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=9898)
    ap.add_argument("--outdir", default="/tmp")
    args = ap.parse_args()
    base = f"http://127.0.0.1:{args.port}"

    print("waiting for simulator control plane ...", flush=True)
    wait_for_ping(base)
    print("ping ok", flush=True)

    print("waiting for app ready marker ...", flush=True)
    entries = wait_for_ready(base)
    print("app ready", flush=True)
    time.sleep(2)  # let the first price poll land

    boot = get_png(base, "/api/screenshot/glasses")
    boot_path = f"{args.outdir}/glance-boot.png"
    boot.save(boot_path)
    boot_lit = lit_pixel_count(boot)
    print(f"boot screenshot: {boot.size} lit={boot_lit} -> {boot_path}", flush=True)
    assert boot_lit > 100, "framebuffer is blank after ready"

    post_json(base, "/api/input", {"action": "down"})
    time.sleep(0.5)
    post_json(base, "/api/input", {"action": "click"})
    time.sleep(1.5)

    after = get_png(base, "/api/screenshot/glasses")
    after_path = f"{args.outdir}/glance-toggle.png"
    after.save(after_path)
    after_lit = lit_pixel_count(after)
    print(
        f"after down+click: {after.size} lit={after_lit} -> {after_path}",
        flush=True,
    )
    assert after_lit != boot_lit, "framebuffer unchanged after toggle input"

    data = get_json(base, "/api/console")
    errors = console_errors(data.get("entries", []))
    print(f"console entries: {data.get('total')} errors: {len(errors)}", flush=True)
    for e in errors[:10]:
        print("  ERROR:", e.get("message"), flush=True)
    assert not errors, f"{len(errors)} console errors"

    print("SIM CHECK PASSED", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
