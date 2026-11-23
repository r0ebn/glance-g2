# Glance — Status persiapan G2 Hackathon

Terakhir diperbarui: 23 Nov 2026, ~12:30 WITA (audit pra-entry: tes 28/28, build + pack lolos ulang; naskah video, voiceover Jenny, pipeline rekaman siap; rekam video Selasa 24 Nov).
Repo: `~/workspace/g2-hackathon/` dan https://github.com/r0ebn/glance-g2 (publik, 5 commit setelah sinkron 23 Nov, dibuat 2026-11-21T13:50:26Z). Konsep: aplikasi glanceable read-only
Hyperliquid untuk kacamata Even Realities G2, track Crypto & DeFi.

## Jadwal penting

| Kapan | Apa |
| --- | --- |
| Senin 23 Nov 2026, 16:00 WITA | Kickoff (12:00 Dubai) — build week dimulai |
| 23–29 Nov 2026 | Build week (online) |
| Minggu 29 Nov 23:59 Dubai = Senin 30 Nov 03:59 WITA | Batas submit |
| 30 Nov–1 Des | Penjurian, finalis diumumkan |
| Kamis 3 Des 18:00–22:00 WITA | Demo Day, Dubai (demo remote boleh) |
| ≤ 7 hari setelah Demo Day | Hadiah USDT dibayar (total $10.000) |

Hadiah track Crypto & DeFi: juara 1 $1.250 + kacamata G2, juara 2 $375.
(Koreksi 23 Nov: juara 2 $375, bukan $500 — tabel hadiah di halaman
DoraHacks; total pool $10.000 pas: Grand $2.000 + 4x$1.250 + 4x$375
+ $1.000 Telegram + $500 Community.)
Grand Prize $2.000 + 2 pasang G2. Satu proyek hanya bisa menang satu
hadiah uang.

## Yang sudah siap

- **Registrasi DoraHacks SELESAI 21 Nov 2026** — akun lakusaturas, GitHub @r0ebn terhubung, solo, Demo Day remote. Dikonfirmasi di chat utama 21 Nov 21:23 WITA.
- **Repo publik SELESAI 21 Nov 2026** — https://github.com/r0ebn/glance-g2, publik, 4 commit, 25 file (21 file + 3 screenshot simulator + out.ehpk), diverifikasi 22 Nov 09:34 WITA lewat halaman GitHub (commit terbaru 4fa24e1407b6dcbf900494741124122c9274ec97). Sinkron audit 23 Nov: +9 file (naskah video, pipeline rekaman, teks narasi) → 34 file, 5 commit.
- **Repo lengkap di `~/workspace/g2-hackathon/`**: Vite + TypeScript,
  SDK `@evenrealities/even_hub_sdk@0.0.16`, CLI evenhub 0.2.0,
  simulator 0.9.5. Manifest `app.json` (package `com.turas.glance`).
- **Aplikasi Glance jadi dan berfungsi**: daftar harga BTC/ETH/SOL/HYPE
  dari Hyperliquid public info API (tanpa key, polling 60 detik, backoff
  saat 429; harga dari `allMids`, change 24h rolling dari candle 1h,
  HYPE via pair spot @107), tap baris untuk arm/disarm alert ±5%, header
  menampilkan banner ALERT saat harga melewati ambang (state machine
  terverifikasi 9 unit test; banner terpicu belum teramati live di
  simulator). Companion UI di HP memakai logika yang sama.
- **Unit test 35/35 lolos** (alerts 9, hyperliquid 15, render 11).
- **Build lolos** (`tsc` + Vite, `dist/` terhasilkan).
- **Pack lolos**: `out.ehpk` 40.417 byte, `evenhub pack` sukses
  (min_app_version 2.2.10). File `.ehpk` opsional untuk submission.
- **Data source PINDAH CoinGecko → Hyperliquid 23 Nov 2026** (keputusan
  doom 12:39 WITA): CoinGecko TIDAK tercantum di daftar aplikasi Track 02
  (verifikasi ganda ke halaman DoraHacks), Hyperliquid tercantum. Klien
  baru `src/hyperliquid.ts` + 15 tes; `src/coingecko.ts` dihapus lokal
  (versi CoinGecko tersimpan di histori GitHub). Simulator diverifikasi
  ulang 23 Nov (sim-check PASSED, harga live Hyperliquid tampil di
  framebuffer, toggle alert bekerja, 0 error console; bukti di
  `docs/sim-2026-11-23/`).
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
  DoraHacks, akun yang dibutuhkan, alur submit. Registrasi SUDAH
  dilakukan 21 Nov (Google sign-up lakusaturas@gmail.com).
- **README** berisi cara build/run, pengungkapan pra-23-Nov yang
  diwajibkan aturan (scaffold + implementasi awal disiapkan 21 Nov),
  dan catatan desain (termasuk: tidak ada background alert, karena G2
  tidak bisa menampilkan apa pun saat pengguna pindah aplikasi).

## Yang belum siap / celah

- **Video demo belum dibuat** (maks 3 menit, simulator atau G2).
  Naskah + shot list siap di docs/demo-video-script.md (23 Nov).
  Rekam Selasa 24 Nov (doom memilih lebih awal dari rencana awal
  Jumat 28 Nov); screenshot button simulator + rekaman layar
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

## Yang dibutuhkan dari doom selama build week

Registrasi dan repo publik sudah beres (lihat atas). Yang tersisa:
video demo maks 3 menit (naskah + narasi siap, rekam Selasa 24 Nov).

1. **(Nanti, bila menang)** alamat wallet USDT untuk menerima hadiah —
   cara pengumpulannya belum didokumentasikan di halaman publik;
   dikonfirmasi saat pengumuman finalis. Wallet TIDAK dibutuhkan
   untuk registrasi atau submit.

Tidak ada yang perlu dibayar. Tidak ada kacamata yang perlu dibeli —
simulator gratis sudah cukup untuk build, uji, dan demo.

## Batasan yang sudah diverifikasi

- Track Crypto & DeFi HANYA mengizinkan 4 aplikasi (verifikasi 23 Nov,
  browser masuk DoraHacks + teks halaman): Gram Wallet, Polymarket,
  Hyperliquid, Trust Wallet. CoinGecko dan Kalshi TIDAK tercantum,
  padahal catatan 21 Nov menyebut 6 aplikasi termasuk CoinGecko.
  Aplikasi ini SUDAH pindah ke Hyperliquid 23 Nov 2026 (keputusan doom
  12:39 WITA); CoinGecko tidak lagi dipakai di mana pun. Data screener v2
  (DEX Screener/pump.fun) TIDAK boleh dipakai.
- Demo harus read-only / testnet / paper trading. Aplikasi ini
  read-only: tidak ada dana pengguna, tidak ada kunci, tidak ada
  saran finansial.
- Satu aplikasi tampil dalam satu waktu; tidak ada akses ke notifikasi
  aplikasi lain; tidak ada alert latar belakang.
- Google sign-in tidak bekerja di WebView — tidak dipakai.
- Template repo `evenhub-templates` tidak bisa diakses (URL belum
  terverifikasi); scaffold dibuat manual dari Vite + docs dan sudah
  terbukti jalan + ter-pack.
