# Glance — Status persiapan G2 Hackathon

Terakhir diperbarui: 21 Nov 2026, ~19:40 WITA.
Repo: `~/workspace/g2-hackathon/`. Konsep: aplikasi glanceable read-only
CoinGecko untuk kacamata Even Realities G2, track Crypto & DeFi.

## Jadwal penting

| Kapan | Apa |
| --- | --- |
| Senin 23 Nov 2026, 16:00 WITA | Kickoff (12:00 Dubai) — build week dimulai |
| 23–29 Nov 2026 | Build week (online) |
| Minggu 29 Nov 23:59 Dubai = Senin 30 Nov 03:59 WITA | Batas submit |
| 30 Nov–1 Des | Penjurian, finalis diumumkan |
| Kamis 3 Des 18:00–22:00 WITA | Demo Day, Dubai (demo remote boleh) |
| ≤ 7 hari setelah Demo Day | Hadiah USDT dibayar (total $10.000) |

Hadiah track Crypto & DeFi: juara 1 $1.250 + kacamata G2, juara 2 $500.
Grand Prize $2.000 + 2 pasang G2. Satu proyek hanya bisa menang satu
hadiah uang.

## Yang sudah siap

- **Repo lengkap di `~/workspace/g2-hackathon/`**: Vite + TypeScript,
  SDK `@evenrealities/even_hub_sdk@0.0.16`, CLI evenhub 0.2.0,
  simulator 0.9.5. Manifest `app.json` (package `com.turas.glance`).
- **Aplikasi Glance jadi dan berfungsi**: daftar harga BTC/ETH/SOL/HYPE
  dari CoinGecko public API (tanpa key, polling 60 detik, backoff saat
  429), tap baris untuk arm/disarm alert ±5%, header menampilkan banner
  ALERT saat harga melewati ambang. Companion UI di HP memakai logika
  yang sama.
- **Unit test 28/28 lolos** (alerts 9, coingecko 8, render 11).
- **Build lolos** (`tsc` + Vite, `dist/` terhasilkan).
- **Pack lolos**: `out.ehpk` 40.131 byte, `evenhub pack` sukses
  (min_app_version 2.2.10). File `.ehpk` opsional untuk submission.
- **Simulator terverifikasi END-TO-END di VM ini** (21 Nov 2026,
  sim-check PASSED):
  - Aplikasi dimuat, bridge terhubung (`[glance] ready (bridge: connected)`).
  - Harga LIVE CoinGecko tampil di framebuffer kacamata 576x288
    (BTC $58.244 -5,7%, ETH $1.657 -5,3%, SOL $68,98 -4,2%,
    HYPE $59,21 -7,9% pada 11:36 UTC).
  - Input bekerja: down+click mengaktifkan alert di baris ETH —
    marker `!` muncul di screenshot sesudahnya.
  - Console bersih: 0 error. Bukti di `docs/sim-2026-11-21-*.png`.
  - Skrip verifikasi: `scripts/sim-check.py`.
- **Satu bug aplikasi nyata ditemukan lewat simulator dan diperbaiki**:
  simulator menolak pembuatan halaman bila dua container memakai
  `isEventCapture: 1` ("multiple event listeners (2) not allowed").
  Header sekarang display-only, hanya list yang menangkap input.
  Perbaikan sudah masuk build + pack terbaru.
- **Setup simulator di VM terdokumentasi penuh**:
  `docs/simulator-vm-setup.md` (library di `~/g2-sim-libs/`, symlink
  sistem, environment, cara jalan + verifikasi). Di PC Windows doom
  tidak perlu semua itu: cukup Node.js LTS + dua paket global.
- **Riset registrasi selesai**: `REGISTRATION.md` — cara daftar
  DoraHacks, akun yang dibutuhkan, alur submit. Belum ada yang
  didaftarkan atau di-sign-in atas nama doom.
- **README** berisi cara build/run, pengungkapan pra-23-Nov yang
  diwajibkan aturan (scaffold + implementasi awal disiapkan 21 Nov),
  dan catatan desain (termasuk: tidak ada background alert, karena G2
  tidak bisa menampilkan apa pun saat pengguna pindah aplikasi).

## Yang belum siap / celah

- **Registrasi DoraHacks belum dilakukan** — butuh doom (lihat bawah).
- **Repo belum di-push ke GitHub publik** — submission wajib repo publik.
  Butuh persetujuan doom sebelum push (nama repo + visibilitas publik).
- **Video demo belum dibuat** (maks 3 menit, simulator atau G2).
  Dibuat saat build week; screenshot button simulator + rekaman layar
  bisa dipakai. Doom belum punya kacamata G2 — demo memakai simulator.
- **Dialog keluar (exit confirmation) tidak teramati di simulator**:
  event double-click sampai ke aplikasi (eventType 3 tercatat di
  console) dan handler memanggil `shutDownPageContainer(1)` sesuai
  SDK, tapi tidak ada dialog yang muncul di framebuffer. Kemungkinan
  keterbatasan simulator; perilaku di perangkat nyata belum bisa
  dipastikan tanpa kacamata.
- **Quirk simulator (kosmetik)**: setelah rebuild halaman, border
  fokus tetap di baris BTC meski toggle mendarat di baris yang benar
  (ETH). Fungsionalitas tidak terganggu.
- **Ide pengembangan saat build week** (belum diputuskan): tambah
  Hyperliquid read-only (posisi/harga), suara (voice query butuh
  speech-to-text sendiri — SDK hanya memberi audio mentah), halaman
  detail koin, interval alert yang bisa diubah. Semua opsional;
  versi sekarang sudah memenuhi kriteria juri (usefulness, read+write
  via tap, eksekusi teknis, UX glance, safety).

## Yang dibutuhkan dari doom sebelum kickoff Senin 16:00 WITA

1. **Akun DoraHacks** — daftar di dorahacks.io dengan email
   lakusaturas@gmail.com, verifikasi email (kode verifikasi dikirim
   ke email). Gratis, tanpa KYC untuk registrasi.
2. **Hubungkan GitHub @r0ebn** ke akun DoraHacks (untuk submit repo).
3. **Konfirmasi registrasi** di halaman hackathon
   (https://dorahacks.io/hackathon/even-realities/detail) — klik
   Register/Join pada hackathon Even Realities. Solo (tim 1 orang)
   diperbolehkan.
4. **Setujui push ke repo GitHub publik** — nama repo yang diusulkan:
   `r0ebn/glance-g2` (atau nama lain pilihan doom). Submission wajib
   repo publik + README + video demo.
5. **(Nanti, bila menang)** alamat wallet USDT untuk menerima hadiah —
   cara pengumpulannya belum didokumentasikan di halaman publik;
   dikonfirmasi saat pengumuman finalis. Wallet TIDAK dibutuhkan
   untuk registrasi atau submit.

Tidak ada yang perlu dibayar. Tidak ada kacamata yang perlu dibeli —
simulator gratis sudah cukup untuk build, uji, dan demo.

## Batasan yang sudah diverifikasi

- Track Crypto & DeFi HANYA mengizinkan Polymarket, Kalshi,
  Hyperliquid, CoinGecko, Gram Wallet, Trust Wallet. Data screener v2
  (DEX Screener/pump.fun) TIDAK boleh dipakai — aplikasi ini hanya
  memakai CoinGecko.
- Demo harus read-only / testnet / paper trading. Aplikasi ini
  read-only: tidak ada dana pengguna, tidak ada kunci, tidak ada
  saran finansial.
- Satu aplikasi tampil dalam satu waktu; tidak ada akses ke notifikasi
  aplikasi lain; tidak ada alert latar belakang.
- Google sign-in tidak bekerja di WebView — tidak dipakai.
- Template repo `evenhub-templates` tidak bisa diakses (URL belum
  terverifikasi); scaffold dibuat manual dari Vite + docs dan sudah
  terbukti jalan + ter-pack.
