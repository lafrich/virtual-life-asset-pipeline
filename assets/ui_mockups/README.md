# Virtual Office · UI mockups (Pixel XP), preview saja

Mockup statis + prototipe HTML yang bisa diklik untuk sistem gameplay baru (HUD, Action, HP, Tas, Kerja, Sekolah, Kamar).
Kode game tidak disentuh. Semua angka, nama item, nama NPC, dan teks dialog adalah **data contoh**, kecuali yang tertulis di brief
(Rp 1.250.000, Basic Trading Course Rp 300 / 90 detik / +40 Trading XP, Business School Rp 3.000, Basic/Medium/Large Bag 12/20/28).

## File
| File | Isi |
|---|---|
| `NN_nama.png` | layar 844x390 ditampilkan **2x** (1688x780) |
| `3x/NN_nama.png` | layar yang sama 3x (2532x1170) |
| `1x_native/NN_nama.png` | 1x native (sumber pixel-perfect) |
| `667x375/*_667x375@2x.png` | semua layar dirender ulang untuk 667x375 (layout mengikuti sudut layar) |
| `00_overview.png` | contact sheet semua layar (1x), termasuk set 11* di akhir |
| `09_components.png` | sheet komponen + palet |
| `10_flow.png` | diagram flow pemain |
| `prototype.html` | prototipe klik, self-contained (gambar di-embed). Action: tap = dialog NPC, tahan 0,5 detik = menu radial. Centang "tampilkan hotspot" untuk melihat area klik. |
| `src/` | script Python/PIL pembuat semua gambar (`python3 render.py && python3 extras.py`, jalankan dari `src/` setelah salin ke folder kerja; butuh Pillow + `environment/tools/mock.py`) |

## Daftar layar
01_hud · 01b_hud_usulan_baymax · 02_action_radial · 03_hp_home · 04a_dompet · 04b_skill · 04c_course · 04d_market · 04e_furniture · 04f_peta · 04g_kontak · 04h_profil · 04i_pengaturan · 05_tas · 05b_tas_penuh · 05c_tas_12of12 · 06a_npc_dialog · 06b_working · 06c_pending · 06d_result · 07a_school · 07b_school_progress · 07c_bag_shop · 08_room_edit · 09_components · 10_flow

## Gaya
- Layar didesain di **1x** lalu diperbesar integer (2x/3x) nearest-neighbour. Tidak ada anti-aliasing (teks dirender bitmap/aliased).
- Background = adegan asli dari aset game (`environment/manifest.json` lewat `environment/tools/mock.py`) + sprite karakter v6b (`ichsan`, `fm_barista`, `theodore`, `fm_kasir`, `raka`). Thumbnail furnitur = sprite furnitur asli (diperkecil 1/2 bila tidak muat).
- **UI layar (window, tombol, tab, bar)** = Windows XP Luna dalam pixel art. **Label dunia (nameplate NPC, prompt "Bicara", chip aksi)** = gaya game yang sudah ada (gelap #10141B + bingkai brass #C99A2E, teks glow #FFD166), supaya label di dunia tetap terasa bagian dari game.
- Font: **DejaVu Sans 11 px / Bold 11 px** dirender aliased (mirip Tahoma/Verdana XP, tersedia di box). Implementasi web: `Tahoma, Verdana, "DejaVu Sans"` (sama dengan `--xpf` di index.html) dengan `-webkit-font-smoothing:none` bila perlu.

## Palet (hex)
XP: Luna dark `#0831D9`, Luna `#0A5FE8`, Luna mid `#2A7BF6`, Luna light `#4C96FF`, title shadow `#0F2E8C`, face `#ECE9D8`, border tombol `#003C74`, border edit/slot `#7F9DB9`, seleksi `#316AC5`, tab border `#919B9C`, tab aktif oranye `#E68B2C`/`#FFC73C`, hover `#FDD889`/`#F8B330`, default ring `#CEE7FF`/`#98B8EA`, disabled `#ACA899`, close `#E35A2F`/`#F08A64`/`#B8361A`, balloon `#FFFFE1`, Start/Action `#3C9A3C`/`#6CC56C`/`#2B6F2B`/`#1D4F1D`, tray `#0F8DEB`/`#1042AF`, taskbar `#245EDC`/`#3C81F3`/`#1941A5`, progress `#2BC12B`/`#A9EBA9`/`#1E9E1E`.
Game (style-sheet): `#0B0E13 #10141B #1C2330 #2A3242 #3A4458 #5A6577 #8D97A8 #E7EBF2`, brass `#C99A2E #E0A526 #FFD166`, need bar: Hunger `#F5B941`, Hygiene `#5CB8FF`, Bladder `#F5D547` (tambahan, perlu cek AD), Energy `#3DDC84`, error `#E5484D`.

## Ukuran (1x, logical px)
Window title bar 22, border 4, tombol X 21x21 · XP button tinggi 21–26, sudut potong 2 px · slot tas 44x44 (ikon 32) · tab tinggi 20 · list row 22–30 · Action Ø60, Tas Ø44, HP Ø36 · joystick Ø68 · need bar 84x18 · kartu avatar 150x40 · minimap 72x72 · window app 560x330 maks (menyusut ke lebar layar − 40).

## Komponen reusable (lihat `09_components.png`, kode `src/ui.py`)
`window(title, icon, close)` · `close_btn(state)` · `button(label, state: normal/hover/default/pressed/disabled, icon)` · `progress(frac, warna)` · `need_bar` · `slot(icon, count, sel, empty, tag)` · `tabs(labels, active)` · `row(cells, sel/alt/dis)` · `groupbox` · `balloon` (toast) · `round_btn` (Action/Tas/HP) · `avatar_card` · `money_pill` · `minimap` · `joystick` · `nameplate` · `prompt` / `chip` (label dunia) · 52 ikon 16 px.
Cara pakai implementer: buat tiap fungsi jadi satu komponen (CSS/canvas) dengan parameter yang sama. Semua window = 1 komponen `Window` + isi; hanya satu window aktif (state manager tunggal: `null | 'hp' | 'app:X' | 'tas' | 'dialog:npc' | ...`). Saat window/HP/tas terbuka, input joystick & Action diblok. Angka saldo/XP/item hanya dibaca dari state server, UI tidak mengubahnya sendiri (tampilkan state "menunggu konfirmasi server", lihat `06c_pending`).

## Mana yang dari brief user, mana usulan Baymax
**Mengikuti brief user (layar utama):** semua layar 01–10. Tap di area kosong = Kentut (01/02 legenda), need bar di kiri bawah, ukuran tombol standar.
**Usulan Baymax yang sudah dimasukkan karena hanya memperluas brief:**
- (2) Action menampilkan ikon kecil target saat ini (badge di kanan atas tombol Action, contoh: ikon bicara saat dekat NPC). Prioritas target yang diusulkan: NPC > makanan/kopi > kursi/kasur > barang (aturan, tidak tergambar terpisah).
- (3) Saat tahan, ada progress ring kuning di tombol Action dan menu radial muncul dekat jempol (kanan bawah).
- (5) Pipis tetap terlihat tapi abu-abu + gembok, dengan pesan "Hadap tembok dulu".
- (6) Tas penuh: Buang selalu aktif di panel tas (`05c_tas_12of12`); Simpan aktif saat di kamar.
**Usulan Baymax yang mengubah brief, hanya di `01b_hud_usulan_baymax` (belum diputuskan):** (1) tap area kosong tidak melakukan apa-apa, Kentut hanya di menu hold; (4) need bar tipis di atas, tombol lebih besar, margin safe area/notch 24 px (garis merah putus-putus).


## Set tambahan: Usulan Baymax (belum diputuskan), layar 11*
Semua layar di bawah punya label kuning "USULAN BAYMAX (belum diputuskan)". Layar utama 01–10 tidak diubah (file lama tidak dirender ulang).
| File | Usulan |
|---|---|
| `11a_hp_input_lock` | HP terbuka, hanya satu window/HP. Joystick, Action, Tas digembok/abu-abu (input terkunci). Catatan navigasi: **X di app = kembali ke HP Home, X di HP Home = tutup HP** |
| `11b_paket_storage` | Pembelian HP (Furniture Shop **dan Marketplace**) datang sebagai **paket di storage kamar**, bukan tas; status Tiba / Dikirim; tombol Buka. (Mengubah layar utama `04d_market` yang bilang barang Marketplace masuk tas.) |
| `11c_tas_penuh_buang` | Tas 12/12 + label "Tas Penuh"; **Buang selalu ada** dengan konfirmasi inline di panel detail (bukan window kedua); Simpan abu-abu "hanya di kamar" |
| `11c2_tas_di_kamar` | Tas yang sama di kamar sendiri: Simpan aktif |
| `11d_kerja_berhenti` | Mode kerja hanya dengan tombol **Berhenti** (berhenti = tidak dibayar, tanpa penalti); joystick & Action nonaktif. (Mengganti "Batal" di `06b_working`.) |
| `11e_hunger_blink_f1/_f2` + `11e_hunger_blink.gif` | Hunger 25%: bar berkedip pelan (2 frame, 600 ms/frame di GIF), tanpa popup |
| `11f_level_total_xp` | Kartu avatar hanya satu angka = total XP semua skill (contoh 120+60+170 = 350), tanpa bar XP; XP per skill tetap di app Skill. (Mengganti "Lv. 4" + bar di HUD utama.) |
| `11g_room_edit_v2` | Edit Mode v2: tap untuk pilih (outline kuning), grid terlihat + snap (tile hijau tujuan), tombol besar Putar & Selesai, storage tray ringkas |

Usulan Baymax yang sudah masuk ke layar utama di pass pertama (ikon target di Action, ring hold, Pipis abu-abu "Hadap tembok dulu", Buang selalu aktif) tetap seperti ditulis di atas. `01b_hud_usulan_baymax` tetap varian HUD usulan.
Kode: `src/baymax.py` (layar 11*) dan `src/overview2.py` (overview + menambah layar ke prototipe).
Keterbatasan set 11: layar 11* ada di sidebar prototipe tapi tanpa hotspot klik; paket ditampilkan sebagai ikon kotak + ikon/thumbnail isi (belum ada sprite paket iso); kedipan hanya 2 frame statis + GIF; varian 667x375 tidak dicek satu per satu.

## Asumsi
- Label di luar teks brief adalah usulan: teks dialog NPC, "Daftar", "Lanjut", "Upgrade", "Batal", "Mulai", "Selesai", isi Pengaturan, ikon toolbar Edit Mode (Pindah/Putar/Simpan/Batal), nama item (Air Mineral, Kunci, Buku, Kotak), nama landmark selain Sekolah/Toko Tas/Toko Perlengkapan, skill "Barista".
- Panel progres kerja (`06b`) dan storage kamar (`08`) adalah panel HUD (tanpa X), bukan window, supaya aturan "satu window" tetap terjaga.
- HP Home memakai tombol X di luar bingkai HP untuk kembali ke gameplay; X di window app kembali ke HP Home.

## Yang TIDAK dicakup / keterbatasan
- Bukan adegan jalan/kota luar: background memakai interior (kafe/lounge, perpustakaan sebagai "dalam Sekolah", toko tas, kamar) karena belum ada adegan jalan tergabung; tidak ada gedung Sekolah tampak luar.
- Tidak ada aset kasur/shower di pack environment, jadi kamar tidak punya kasur; ikon Tidur/Mandi hanya ikon.
- Ikon HUD dan app tampil 2x di atas sprite 1x (campuran skala piksel, melanggar style-sheet §9; perlu ikon 32 px native kalau mau patuh penuh).
- Label kecil "Marketplace"/"Pengaturan" di HP Home agak mepet; Profil, Pengaturan, Kontak, dan Peta lebih sederhana dibanding Tas/Kursus/Kerja.
- Animasi (ring hold, timer) hanya digambar statis; prototipe HTML berupa gambar + hotspot, bukan UI hidup. Varian 667x375 digenerate otomatis dan tidak dicek satu per satu.
- Tidak ada state hover/pressed per layar (hanya di sheet komponen), tidak ada layar login, chat, atau Marketplace tab Jual/Listing secara penuh (hanya tab Beli aktif).
