# Registration — DONE 21 Nov 2026 (akun DoraHacks lakusaturas, GitHub @r0ebn terhubung, solo, Demo Day remote)

Dikonfirmasi di chat utama 21 Nov 21:23 WITA; repo publik https://github.com/r0ebn/glance-g2 dibuat dan terisi 21 Nov, diverifikasi 22 Nov 09:34 WITA lewat halaman GitHub. File ini menyimpan cara registrasi dilakukan, untuk referensi saat submit.

## 1. DoraHacks account (required to register + submit)

- **Where:** https://dorahacks.io (Sign in / Sign up, top right), then the
  hackathon page https://dorahacks.io/hackathon/even-realities/detail
- **Account options (verified from DoraHacks guides):** email, GitHub, or a
  crypto wallet. Any one of them creates an account.
- **Recommended for doom:** sign up with email (lakusaturas@gmail.com, his
  default account) and connect GitHub (@r0ebn) to the same account. The
  submission needs a public GitHub repo URL anyway, and DoraHacks recommends
  connecting GitHub so people can see what you are building.
- **What actually happened (21 Nov):** registration used Google sign-up
  with lakusaturas@gmail.com (no email+password), GitHub @r0ebn connected
  to the same account. See the header of this file.
- **Email verification:** DoraHacks may send a verification code to the email
  address. The code does not expire within 10 minutes of clicking "send code".
- **Cost:** free. No entry fee, no KYC mentioned for registration.
- **Wallet:** NOT required to register or submit. (An old 2021 HackerLink
  grants guide describes a wallet + gas-fee flow — that was for grants on
  the old platform, not for current hackathon registration. Do not follow it.)
- **Payout (later, only if we win):** prizes are paid in USDT within 7 days
  of Demo Day. Winners will need to provide a USDT wallet address at that
  point; the exact collection step is not documented on the public page, so
  confirm it at kickoff or when finalists are announced.

## 2. Submit the project (during build week, before the deadline)

- On the hackathon page, click **Submit BUIDL**.
- Create a BUIDL project with: name, short description (problem, who it is
  for, how it works, track: Crypto & DeFi), the public GitHub repo URL, and
  the demo video URL (up to 3 minutes, simulator or real G2).
- You can submit early and edit the BUIDL before the deadline.
- **Deadline: Nov 29, 23:59 Dubai time = Nov 30, 03:59 WITA.**
- Optional: attach the packaged `.ehpk` build (`evenhub pack app.json dist`
  already produces `out.ehpk` from this repo).

## 3. Public GitHub repo (required for submission)

- The repo must be public so judges can open it.
- DONE 21 Nov 2026: `github.com/r0ebn/glance-g2` (publik, 4 commit, 25 file).
  Sinkron audit 23 Nov: +9 file (naskah video, pipeline rekaman, teks narasi)
  → 34 file, 5 commit. Switch Hyperliquid 23 Nov: +4 file (klien + tes +
  hl-verify.py + LICENSE), 2 file CoinGecko dihapus, +5 biner (out.ehpk baru +
  .gitkeep + 4 screenshot) → 41 file, 11 commit; push hitungan final → 12 commit.

## 4. Even Realities developer access (NOT required for this entry)

- Developer access on https://hub.evenrealities.com is free and self-serve
  (signing in flips the account to developer). It is only needed to test on
  real G2 glasses or to publish to the Even Hub store.
- Doom has no G2 glasses, and the hackathon explicitly allows building and
  testing in the free simulator with no glasses. Skip this unless we get
  hardware.

## Checklist for doom (before kickoff, Mon 23 Nov 16:00 WITA)

- [x] DoraHacks account created + email verified (21 Nov 2026)
- [x] GitHub @r0ebn connected to the DoraHacks account
- [x] Registration confirmed on the hackathon page
- [x] Repo pushed to public GitHub repo r0ebn/glance-g2
