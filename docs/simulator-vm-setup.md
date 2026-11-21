# Simulator Even Hub di VM ini

Cara menjalankan simulator Even Hub (0.9.5) di VM Linux ini, yang tidak
punya tumpukan desktop/GL/WebKit. Semua library diambil dari paket
Ubuntu 24.04 (noble) yang diekstrak dengan `dpkg-deb -x` ke
`~/g2-sim-libs/` — BUKAN install sistem, jadi tahan ganti VM.
Tiga symlink sistem di bawah ini TIDAK tahan ganti VM dan harus
dibuat ulang setelah VM diganti.

Terakhir diverifikasi: 21 Nov 2026, sim check lolos end-to-end
(harga live CoinGecko tampil, toggle alert bekerja).

## 1. Library (sudah ada di ~/g2-sim-libs/)

Paket yang diekstrak (semua dari arsip noble via apt sources minimal
di `/tmp/apt-min/sources.list`, lists di `/tmp/apt-lists`):

- WebKit: libwebkit2gtk-4.1-0, libjavascriptcoregtk-4.1-0,
  libsoup-3.0-0, libgstreamer1.0-0, libgstreamer-plugins-base1.0-0,
  libgstreamer-plugins-bad1.0-0, libgstreamer-gl1.0-0,
  libmanette-0.2-0, libenchant-2-2, libsecret-1-0, libdw1t64,
  liborc-0.4-0t64, libevdev2, libgudev-1.0-0
- GL: libegl1, libglvnd0, libgl1, libglx-mesa0, libgl1-mesa-dri,
  mesa-libgallium, libgbm1, libdrm2, libglapi-mesa, libvulkan1,
  libegl-mesa0, libgles2, libgles1
- Jaringan: glib-networking, glib-networking-common,
  glib-networking-services, libproxy1v5, libduktape207

Unduh + ekstrak satu paket (ulangi per paket; jangan batch, karena
`apt-get download` menggagalkan seluruh batch bila satu paket
tidak punya kandidat):

```sh
cd ~/g2-sim-libs
apt-get download \
  -o Dir::Etc::sourcelist=/tmp/apt-min/sources.list \
  -o Dir::Etc::sourceparts=/dev/null \
  -o Dir::State::lists=/tmp/apt-lists \
  -o Dir::Cache=/tmp/apt-min <paket>
dpkg-deb -x <paket>*.deb .
```

Catatan:

- Nama paket noble memakai akhiran `t64` untuk library time_t
  (libdw1t64, liborc-0.4-0t64, libgnutls30t64).
- `libgles2-mesa` tidak ada di noble; paketnya `libgles2` (+ `libgles1`).
- `libgallium` ada di paket `mesa-libgallium`, BUKAN `libgl1-mesa-dri`.
- `mesa-utils` hanya metapaket; biner glxinfo/eglinfo ada di
  `mesa-utils-bin`.

## 2. Symlink sistem (buat ulang setelah ganti VM)

```sh
# Helper WebKit dicari di path absolut ini (LD_LIBRARY_PATH tidak berlaku)
ln -s ~/g2-sim-libs/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1 \
      /usr/lib/x86_64-linux-gnu/webkit2gtk-4.1

# Vendor EGL Mesa (tanpa ini eglInitialize gagal; tidak ada vendor dir sistem)
mkdir -p /usr/share/glvnd/egl_vendor.d
ln -s ~/g2-sim-libs/usr/share/glvnd/egl_vendor.d/50_mesa.json \
      /usr/share/glvnd/egl_vendor.d/50_mesa.json
```

Tidak perlu: `/usr/lib/x86_64-linux-gnu/dri` sudah berisi driver Mesa
25.2.8 yang sama (symlink farm ke `libdril_dri.so` adalah layout resmi
Mesa 25.x, bukan stub).

## 3. Modul GIO (khusus)

`GIO_MODULE_DIR` diarahkan ke direktori yang HANYA berisi dua modul:

```
~/g2-sim-libs/usr/lib/x86_64-linux-gnu/gio/modules-tls/
  libgiognutls.so    # backend TLS, tanpa ini fetch https gagal
  libgiolibproxy.so  # resolver proxy via libproxy (baca env http_proxy)
```

JANGAN masukkan `libgiognomeproxy.so`: modul itu fatal
(`Settings schema 'org.gnome.system.proxy' is not installed`)
karena schema GSettings tidak ada di VM ini. Tanpa modul proxy sama
sekali, GIO memakai `GDummyProxyResolver` (koneksi langsung, gagal
di VM ini karena egress hanya lewat proxy).

`libpxbackend-1.0.so` di-symlink ke direktori lib utama agar linker
menemukannya (aslinya di subdir `libproxy/`).

## 4. Menjalankan

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
npm run dev &  # Vite di http://localhost:5173
xvfb-run -a evenhub-simulator http://localhost:5173 --automation-port 9898
```

Tanpa display, simulator panic ("Failed to initialize GTK") —
`xvfb-run` wajib. Variabel proxy (`http_proxy`/`https_proxy`) sudah
ada di environment exec dan diwariskan ke simulator + WebKit.

## 5. Verifikasi otomatis

```sh
python3 scripts/sim-check.py --port 9898 --outdir /tmp
```

Memastikan: control plane menjawab pong, marker `[glance] ready`
muncul di console, framebuffer 576x288 tidak kosong, input
down+click mengubah framebuffer (toggle alert), dan tidak ada
error di console. Screenshot mentah RGBA disimpan di outdir;
komposit di atas hitam untuk melihatnya (alpha 0 = latar).

Bukti 21 Nov 2026 ada di `docs/sim-2026-11-21-*.png`.

## 6. Diagnosis yang pernah dilalui

| Gejala | Penyebab | Perbaikan |
| --- | --- | --- |
| `libwebkit2gtk-4.1.so.0: cannot open` | Library WebKit tidak ada | Ekstrak .deb ke ~/g2-sim-libs |
| `WebKitNetworkProcess (No such file)` | Helper di path absolut | Symlink webkit2gtk-4.1 |
| `Could not create default EGL display` | Tidak ada vendor EGL | libegl-mesa0 + symlink 50_mesa.json |
| `Couldn't open libGLESv2.so.2` | Dispatcher GLES hilang | libgles2 + libgles1 |
| WebProcess tidak pernah muncul | EGL gagal (di atas) | Perbaiki EGL, lalu WebProcess jalan |
| `[fetch] Load failed` (CoinGecko) | Tanpa backend TLS + tanpa proxy | glib-networking + libproxy (modul-tls) |
| `Settings schema 'org.gnome.system.proxy'` | libgiognomeproxy.so ikut dimuat | Hanya 2 modul di modules-tls |
| `createStartUpPageContainer failed: 1` | 2 container isEventCapture | BUG APLIKASI: header jadi display-only |
| Sim check timeout di /api/ping | /api/ping jawab teks biasa | Jangan parse JSON untuk ping |

Jangan pakai `pkill -f` dengan pola yang muncul di command sendiri:
pkill ikut mematikan shell pemanggil. Bunuh proses berdasarkan PID
dari `ps`.

## 7. Windows (PC doom)

Tidak perlu semua di atas. Yang dibutuhkan hanya Node.js LTS:

```bat
npm install -g @evenrealities/evenhub-cli @evenrealities/evenhub-simulator
cd g2-hackathon
npm install
npm run dev
evenhub-simulator http://localhost:5173
```

Internet langsung, tanpa proxy, tanpa library tambahan.
