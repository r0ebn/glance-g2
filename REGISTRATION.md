# Registration — what is needed (NOT done by us)

No account was created and nothing was signed in on doom's behalf. This file
records exactly what registration requires, so doom can do it himself before
kickoff (Monday 23 Nov 2026, 16:00 WITA).

## 1. DoraHacks account (required to register + submit)

- **Where:** https://dorahacks.io (Sign in / Sign up, top right), then the
  hackathon page https://dorahacks.io/hackathon/even-realities/detail
- **Account options (verified from DoraHacks guides):** email, GitHub, or a
  crypto wallet. Any one of them creates an account.
- **Recommended for doom:** sign up with email (lakusaturas@gmail.com, his
  default account) and connect GitHub (@r0ebn) to the same account. The
  submission needs a public GitHub repo URL anyway, and DoraHacks recommends
  connecting GitHub so people can see what you are building.
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
- Suggested: `github.com/r0ebn/glance-g2` (or any public repo under @r0ebn).
- Pushing this code to GitHub needs doom's approval at the time; nothing has
  been pushed yet.

## 4. Even Realities developer access (NOT required for this entry)

- Developer access on https://hub.evenrealities.com is free and self-serve
  (signing in flips the account to developer). It is only needed to test on
  real G2 glasses or to publish to the Even Hub store.
- Doom has no G2 glasses, and the hackathon explicitly allows building and
  testing in the free simulator with no glasses. Skip this unless we get
  hardware.

## Checklist for doom (before kickoff, Mon 23 Nov 16:00 WITA)

- [ ] DoraHacks account created + email verified
- [ ] GitHub @r0ebn connected to the DoraHacks account
- [ ] Click through registration on the hackathon page (confirm what the
      register button asks for — it may just be the Submit BUIDL flow)
- [ ] Approve pushing this repo to a public GitHub repo (name of his choice)
