# Glance — Hyperliquid prices + alerts for Even G2

Entry for the **Heads Up: Even Realities Hackathon** (TVM Ventures × Daos Hub),
**Track 02 · Crypto & DeFi**. Solo entry by Turas (@r0ebn).

## The problem

A trader who follows crypto checks prices dozens of times a day, each time
pulling out their phone. Glance puts the four coins they care about on the G2
glasses: one look, no phone. When a price moves more than 5% from the moment
they armed the alert, the glasses say so.

## How it works

- **Glasses (576×288):** a header line plus a 4-row watchlist — BTC, ETH, SOL,
  HYPE — with live price and 24h change from Hyperliquid.
- **Tap a row** to arm or disarm a ±5% price alert for that coin. The alert
  triggers when the price moves ±5% from the price at arming time, and the
  header switches to an `ALERT BTC +5.2%` banner. Tapping the coin again
  acknowledges and disarms it.
- **Long-press** refreshes prices immediately. **Double-tap** exits: the
  handler calls the SDK shutdown for the root page. The system
  confirmation dialog itself was not observed in the simulator
  (see STATUS.md); on real hardware it should appear per the SDK docs.
- **Phone:** the same state is shown as a companion UI in the WebView, so the
  app is usable and demoable in a plain browser too.
- **Data:** Hyperliquid public info API, free, no API key, polled
  every 60 seconds. One `allMids` request fetches all four mid prices;
  four 1h-candle requests give the rolling 24h change (HYPE via the
  @107 spot pair). A 429 response backs off exponentially
  (60s → 5 min max); a failed fetch keeps the last good data
  and marks it STALE.

## Track compliance

- Uses **only Hyperliquid**, one of the apps listed in the Crypto & DeFi track
  (Gram Wallet, Polymarket, Hyperliquid, Trust Wallet). Switched from
  CoinGecko on 23 Nov 2026: CoinGecko is not on the track's list.
- **Read-only.** No orders, no bets, no funds held, no financial advice.
- No API keys or secrets anywhere in the repo or the app.

## What existed before Nov 23 (rule disclosure)

The hackathon rules ask the README to say what existed before build week
(Nov 23). Prepared on 21 Nov 2026, before build week:

- This Vite + TypeScript scaffold with the Even Hub SDK (0.0.16) wired in.
- The CoinGecko data client (replaced by the Hyperliquid client on
  23 Nov, build week — see below), alert state machine, glasses
  rendering, and the phone companion UI in `src/`.
- 28 unit tests, the `app.json` manifest, and this README.

Build-week work (Nov 23–29):
- 23 Nov: demo video script + shot list (`docs/demo-video-script.md`),
  voiceover narration, Jenny neural voice (`docs/voiceover/`), recording
  pipeline + smoke test (`scripts/record-demo.py`,
  `scripts/RECORDING-NOTES.md`). Full app re-verified the same day
  (28/28 tests, build + pack pass).
- 23 Nov: data source switched from CoinGecko to Hyperliquid for track
  compliance (CoinGecko is not on the Track 02 allowed-apps list;
  Hyperliquid is). New `src/hyperliquid.ts` client + 15 tests
  (35/35 total), build + pack pass, simulator re-verified end-to-end
  with live Hyperliquid prices (see `docs/sim-2026-11-23/`).
- 24 Nov: demo video recording (planned).

## Setup

Prerequisites: Node.js 20+ and npm.

```bash
npm install -g @evenrealities/evenhub-cli @evenrealities/evenhub-simulator
npm install
```

Run in the simulator:

```bash
# Terminal 1 — Vite dev server (http://localhost:5173)
npm run dev

# Terminal 2 — simulator pointed at the dev server
evenhub-simulator http://localhost:5173
```

Click a row in the simulator canvas to toggle its alert. Double-click sends
the exit event (the handler runs; the system dialog was not observed in the
simulator). The screenshot button exports the glasses display as a PNG
(useful for the demo video).

Headless verification (simulator automation API, port 9898):

```bash
evenhub-simulator http://localhost:5173 --automation-port 9898
python3 scripts/sim-check.py --port 9898 --outdir /tmp
```

The check waits for the `[glance] ready` console marker, asserts the
576x288 framebuffer is not blank, drives down+click to toggle an alert,
and asserts the framebuffer changed with zero console errors.
Screenshots from the verified run on 21 Nov 2026 are in
`docs/sim-2026-11-21-*.png`.

Running the simulator on this Linux VM needs extra system libraries
(WebKitGTK, Mesa GL/EGL, GIO TLS + proxy modules) extracted under
`~/g2-sim-libs/` — see `docs/simulator-vm-setup.md` for the full
recipe. On Windows (doom's PC) none of that is needed: just Node.js
LTS and the two global packages above.

Run on real hardware (needs G2 glasses + the Even Realities phone app):

```bash
evenhub qr --url "http://<YOUR-LAN-IP>:5173"
```

Then tap **Scan QR** in the phone app. See the Even Hub docs for enabling
developer mode.

## Scripts

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Vite dev server with hot reload               |
| `npm run build`   | Type check (`tsc`) + production build (`dist/`) |
| `npm run preview` | Serve the production build locally            |
| `npm test`        | Unit tests (vitest), 35 tests                 |
| `npm run typecheck` | Type check only                             |

Package the optional `.ehpk` build for submission:

```bash
npm run build
evenhub pack app.json dist   # produces out.ehpk
```

## Project layout

```
app.json            Even Hub manifest (network whitelist: api.hyperliquid.xyz)
index.html          Phone companion UI shell
src/
  main.ts           Bridge wiring, poll loop, events, companion UI
  hyperliquid.ts    Hyperliquid client (mids + candles, parse, 429 backoff)
  alerts.ts         Alert state machine (pure, tested)
  render.ts         Glasses text/list rendering (pure, tested)
  style.css         Companion UI styles
  __tests__/        Vitest suites for the three logic modules
scripts/
  sim-check.py      Headless simulator verification (automation API)
  record-demo.py    Demo video recorder (x11grab + control plane)
  RECORDING-NOTES.md  Recording runbook + gotchas
docs/
  simulator-vm-setup.md  Running the simulator on this Linux VM
  sim-2026-11-21-*.png   Verified simulator screenshots (boot/toggle/exit)
  demo-video-script.md   Demo video narration + shots (max 3 min)
  voiceover/        Narration takes, Jenny voice (mp3 + text)
  smoke-recording-test.mp4  24s recording pipeline smoke test
REGISTRATION.md     DoraHacks registration (done 21 Nov 2026; submit steps inside)
STATUS.md           Preparation status, gaps, and what doom must do
out.ehpk            Packaged build (evenhub pack), optional for submission
```

## Design notes

- **One thing on screen.** The glasses show four prices and nothing else;
  the phone shows the detail. That is the whole point of a glanceable app.
- **No `listContainerUpgrade` in SDK 0.0.16.** List content can only change
  through `rebuildPageContainer`, so every price poll and every tap rebuilds
  the page. At one rebuild per minute this is fine.
- **One event-capturing container per page.** The simulator rejects page
  creation (`CreateStartUpPageContainer validation failed: multiple event
  listeners (2) not allowed`) when two containers set `isEventCapture: 1`.
  Only the coin list captures input; the header is display-only.
  Found live in the simulator on 21 Nov 2026.
- **No background alerts.** G2 cannot show anything while the user has
  switched away, so alerts only fire while the app is open. The README and
  the demo say so honestly instead of promising push alerts.
- **Direct Hyperliquid fetch, no backend.** The public info API answers CORS
  (`Access-Control-Allow-Origin: *`, verified live 23 Nov 2026) and needs no
  key, so there is no secret to protect and no server to run. If the
  real-device WebView ever blocks it, the fallback is a tiny same-origin
  proxy; the `app.json` network whitelist already covers
  `https://api.hyperliquid.xyz`.

## Links

- Hackathon: https://dorahacks.io/hackathon/even-realities/detail
- Even Hub docs: https://hub.evenrealities.com/docs/get-started/quickstart/first-app
- Simulator docs: https://hub.evenrealities.com/docs/test/simulator
- Hyperliquid API: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
