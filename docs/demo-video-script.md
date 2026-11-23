# Glance — Demo video script (max 3 minutes)

Prepared: 23 Nov 2026, ~10:35 WITA, hours before G2 kickoff (16:00 WITA).
Status of the app this morning, re-verified by running the repo:
28/28 unit tests pass, `npm run build` passes. No code changed for this script.

## Rules the video must respect

- Max 3 minutes, recorded in the Even Hub simulator (doom has no G2 glasses).
- Show only what is verified: live CoinGecko prices, tap to arm/disarm a
  ±5% alert, the ALERT banner, long-press refresh, phone companion UI.
- Do NOT claim the exit dialog appears on screen: on 21 Nov the double-tap
  event reached the app and the handler ran, but no dialog showed in the
  simulator framebuffer. Say "double-tap to exit" and cut before the dialog,
  or show the phone UI instead.
- Read-only, CoinGecko only, no orders, no financial advice. Say so once.

## Narration + shots (total ~2:40, leaves 20s spare)

| Time | Shot (simulator) | Narration (English, calm, one sentence per shot) |
| --- | --- | --- |
| 0:00–0:15 | Simulator glasses frame, watchlist loading then live prices | "Traders check prices dozens of times a day. Glance puts the four coins you care about on your glasses, one look, no phone." |
| 0:15–0:45 | Slow pan over the 4 rows: BTC, ETH, SOL, HYPE with price + 24h change | "Bitcoin, Ethereum, Solana and Hyperliquid, live from CoinGecko, refreshed every minute. No key, no account, read only." |
| 0:45–1:20 | Click ETH row, `!` marker appears; explain arming | "Tap a coin to arm an alert. If it moves five percent from this price, the glasses tell you." |
| 1:20–1:50 | Triggered state: header ALERT banner. No live trigger is possible without a real ±5% move, and no simulation hook exists, so cut in the 21 Nov toggle screenshot as a cutaway. That still shows the ARMED state (`!`), not the triggered banner — the narration describes the banner, the still shows the armed coin. Do not present the still as the triggered state. | "When the move happens, the header becomes an alert banner. Tap again to acknowledge and disarm." |
| 1:50–2:15 | Long-press to refresh; then phone companion UI in the browser | "Long-press refreshes on demand. The same state lives on your phone, so the app is demoable anywhere." |
| 2:15–2:40 | Closing frame: glasses + phone side by side, repo URL on screen | "Glance. Four coins, one look, built for Even G2. Code is public at github.com/r0ebn/glance-g2." |

## Recording checklist

1. `npm run dev` in terminal 1, `evenhub-simulator http://localhost:5173` in
   terminal 2 (see README; on this VM the extra libs in `~/g2-sim-libs/` apply).
2. Record the screen at 1080p; keep the simulator canvas large and the
   terminal out of frame.
3. Use the simulator screenshot button for the alert cutaway if a live
   ±5% move does not happen during recording.
4. Voiceover: record after the footage, one take per shot, then cut to the
   table above. No background music needed.
5. Export ≤3:00, upload unlisted to YouTube (Turasvid), paste the URL into
   the DoraHacks BUIDL.

## Build-week plan around the video

- Mon 23 Nov 16:00 WITA: kickoff. Check the DoraHacks page for any rule or
  track change; nothing else needs doom at kickoff, registration and repo
  are already done.
- Tue–Thu: optional polish only (coin detail page, adjustable alert
  interval, Hyperliquid read-only). None is required; the current app
  already meets the judging criteria in STATUS.md.
- Fri 28 Nov: record the video using this script, submit the BUIDL early
  (name, description, repo URL, video URL). Early submit is editable.
  UPDATE 23 Nov 10:48 WITA: doom chose to record EARLIER — recording day
  is now Tue 24 Nov (kickoff Mon 23 Nov confirms no rule change first).
  Wed–Thu becomes polish + re-take buffer; BUIDL submit moves up to
  Tue/Wed, still editable until the hard deadline.
- Sun 29 Nov 23:59 Dubai = Mon 30 Nov 03:59 WITA: hard submit deadline.
- Mon 30 Nov 03:59 WITA → Tue 1 Dec 06:00 WITA: ~26h window to build
  Hookline for #BuildHybridAI (Devpost registered, concept chosen).

## What still needs doom

- Voiceover: DONE 23 Nov 12:21 WITA. Doom picked Jenny
  (en-US-JennyNeural) from two samples. All 6 narration takes are
  generated in docs/voiceover/ (shot1–shot6.mp3, ~50s total, no
  clipping, each inside its shot slot) plus preview-full.mp3
  (55s, all 6 with 1s gaps). Mix into the footage after Tuesday's
  recording. The only remaining doom-only step is a USDT wallet
  address for the prize, collected only if we win.
