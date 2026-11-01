# Virtual Life · HP gaya Nokia 3310 (preview UI)

Desain HP in-game sebagai **handset Nokia yang digambar utuh di layar** (bukan window XP). Semua navigasi lewat tombol fisik HP.
Kode game tidak disentuh. Background = mockup HUD lama (`../ui_mockups/1x_native/01_hud.png` dan versi 667x375), digelapkan.

## File
| File | Isi |
|---|---|
| `NN_nama.png` | layar 844x390 dengan HP utuh di atas HUD yang digelapkan, **2x** (1688x780), nearest-neighbour |
| `1x_native/NN_nama.png` | sumber 1x (844x390) |
| `667x375/NN_nama_667x375@2x.png` | semua layar untuk 667x375, 2x |
| `00_contact_sheet.png` | ringkasan semua layar (crop HP, 1x) |
| `00_button_map.png` | diagram: tombol mana melakukan apa (HP 3x) |
| `13_menu_scroll.gif` | navigasi: Standby → Menu → gulir 1..9 → naik → buka Kontak → Kembali → End (tombol yang ditekan tampil tertekan) |
| `prototype.html` | prototipe klik self-contained (JS + 2 background di-embed, tanpa internet) |
| `src/phone.js` | seluruh renderer (font, ikon, layar, badan HP, logika tombol); `template.html`, `build.py` (bikin prototype.html), `export.py` (PNG/GIF via Chrome headless + Playwright), `sheets.py` (contact sheet + button map) |

Rebuild: `cd src && python3 build.py && python3 export.py && python3 sheets.py`.

## Daftar layar
01_standby · 02_menu · 02b_menu_scroll · 03_dompet · 03b_dompet_detail · 04_skill · 04b_skill_detail · 05_kursus · 05b_kursus_detail · 05c_kursus_bayar · 05d_kursus_progress (timer) · 05e_kursus_selesai · 06_marketplace (Beli/Jual/Listing) · 06b_market_beli · 06c_market_item · 06d_market_jual · 06e_market_harga (input angka, softkey Hapus) · 06f_market_listing · 07_furnitur · 07b_furnitur_detail ("Dikirim ke storage kamar") · 07c_furnitur_dibeli · 08_peta · 09_kontak · 09b_kontak_detail · 10_profil · 11_pengaturan · 11b_kontras · 12_hp_tertutup (HUD normal, HP ditutup).
Menu utama (urut, bernomor 1–9): Dompet, Skill, Kursus Online, Marketplace, Toko Furnitur, Peta, Kontak, Profil, Pengaturan. Tidak ada tas/inventori, daftar Jobs, atau sekolah.

## Pilihan ukuran & resolusi (kompromi)
- **HP tegak (portrait), di tengah, tinggi 366 px logis** → muat di 390 dan 375 (sisa 4–12 px). Ukuran HP 244x366, sama di kedua layar.
- **LCD 96x64 piksel** (bukan 84x48 asli), tiap piksel LCD = 2x2 px logis (192x128). 84x48 terlalu sempit untuk label Indonesia ("Kursus Online", "Toko Furnitur") + nomor + ikon; 96x64 memberi 4 baris list + status bar + judul + softkey.
- Akibatnya **proporsi HP dipendekkan/"chibi"** (~1:1,5 vs asli ~1:2,4): layar dibesarkan, keypad dipadatkan. Dengan proporsi asli pada tinggi 366 px, LCD hanya bisa skala 1x (teks 7 px logis ≈ 1 mm di HP), jadi tidak dipakai.
- **Versi diputar (landscape) tidak dipilih**: teks/keypad jadi miring atau keypad harus pindah ke samping, kehilangan bentuk Nokia. Tidak dirender.
- Di layar 2x/3x fisik, teks LCD tingginya 14 px logis (caps 7 px LCD × 2). Kecil tapi terbaca; belum dites di HP fisik.

## Tombol (lihat `00_button_map.png`)
| Tombol | Fungsi |
|---|---|
| Softkey kiri | aksi label kiri-bawah LCD: Menu / Pilih / Mulai / Beli / Ya / OK / Tandai |
| Tombol tengah (oval, lampu biru) | OK = sama dengan softkey kiri |
| Atas / Bawah (bagian atas/bawah tombol oval) | gulir list (melingkar seperti Nokia), atur kontras |
| Softkey kanan | **Kembali** 1 layar · **Hapus** 1 digit saat mengetik harga (jadi Kembali saat kosong) · **Tutup** di Standby · **Tidak** di konfirmasi |
| End (merah) | dari layar mana pun → Standby; di Standby → tutup HP |
| Call (hijau) | di Standby → Kontak (lainnya cadangan, mis. fitur panggil teman nanti) |
| 1–9 | di list bernomor: langsung buka item (Menu, Marketplace, Pengaturan; list lain juga). Di Standby: buka item menu itu langsung. Peta: 1–6 pilih landmark. Harga jual: 0–9 = input |
| * · # | belum dipakai |
Tidak ada tombol X. Hanya satu layar aktif (stack: Standby → Menu → app → sub-layar). Selama HP terbuka, HUD digelapkan dan **joystick, Action, Tas diberi gembok** (input game diblok). HP tertutup: tombol HP di HUD (kanan atas) membuka ke Standby.
Keyboard di prototipe: ↑↓, Enter/Space = tengah, ←/F1 = softkey kiri, →/Backspace/F2 = softkey kanan, 0–9 * #, C = Call, Esc/E = End, H/Enter = buka HP.

Konvensi kecil ala Nokia 3310 yang dipakai: nomor posisi di kanan atas (mis. `4-1-2`), baris terpilih = bar terbalik (inverted), scrollbar titik-titik + thumb di kanan, softkey label di baris bawah.
**Beda dari 3310 asli** (disengaja karena brief): 3310 asli hanya punya 1 tombol Navi + C + scroll, tanpa Call/End dan tanpa 2 softkey. Di sini bentuk badan, warna, layar, logo, slot speaker, "senyum" abu-abu dan keypad oval mengikuti 3310, tapi kelompok tombol navigasi mengikuti susunan Nokia 2-softkey + Call/End.

## Palet
Badan: `#3E4A5C` (dasar), `#56647B`/`#6E7D94` (highlight), `#2E3746`/`#232A36` (bayangan), outline `#14181F`.
Bingkai abu-abu: `#AEB4BB`, `#D5D9DE`, `#858B94`. Jendela LCD: `#1B2028`, `#313946`. Plat logo `#262E3B`, teks `#DCE1E7`.
Tombol: `#BFC3C8`, highlight `#E4E7EA`, bayangan `#8A9097`, ditekan `#A2A7AE`, label `#262B33`. Lampu biru `#56C3F0`/`#B4EBFF`/`#2A82BE`. Call `#2E9E4C`, End `#CF3A3A`.
LCD: latar `#8DA37D`, piksel `#1E2A1E` (kontras level 3 dari 5: `#55684F #3A4A38 #1E2A1E #121A12 #080D08`), bayangan piksel `#7B906C` (offset 1 px kanan-bawah, efek LCD Nokia), tepi `#76896A`.
HUD saat HP terbuka: overlay `rgba(6,8,12,.62)`, gembok brass `#C99A2E` di atas `#10141B` (gaya label game).

## Font & ikon
- Font LCD buatan sendiri (bitmap) di `phone.js`: **proporsional, caps 7 px, x-height 5, descender 1 px, tinggi baris 9 px**, gaya font Nokia; bold = digambar 2x geser 1 px (judul, saldo). Font kecil **3x5** untuk jam status, nomor posisi, huruf keypad (abc..). Hanya karakter Latin dasar + `. , : - + / ( ) ! ? % * # < > = ' _ ·`.
- Ikon 1-bit 7x7 untuk 9 item menu + landmark peta, ikon status (sinyal, baterai), online/offline 5x5, avatar 14x14, gambar furnitur 12x9 (ditampilkan 2x di detail). Tanpa warna.

## Data: mana dari brief, mana contoh
Dari brief/dok sebelumnya: label menu, label tombol (Pilih, Kembali/Hapus, Tutup), "dikirim ke storage kamar", saldo **Rp 1.250.000**, **Basic Trading Course Rp 300 / 90 detik / +40 Trading XP**.
**Semua lainnya data contoh**: operator "VLife", jam 10:24, riwayat dompet, skill (Trading/Barista/Coding/Desain, level & XP; total 350 mengikuti contoh 11f), kursus lain & harganya, item/penjual Marketplace, listing, furnitur & harga, "Ukuran 2x1", nama landmark Peta (Rumah, Kafe, Kantor, Toko Furnitur, Taman, Pasar), teman & status, profil (Ichsan, Kamar 3B, Teman 5), item Pengaturan (Suara/Getar/Musik/Kontras/Bahasa/Keluar game), fitur "Tandai" di Peta.

## Cara pakai ulang sebagai komponen
- `List({title,num,items,rowH:9|18,numbered,header,y0,y1,soft})` – list Nokia (1 baris atau 2 baris dengan `sub`/`bar`), angka 1–9, scrollbar, gulir melingkar.
- `Text({title,lines|body,soft,onL})` – layar info/detail. `Confirm(q,lines,onYes)` – Ya/Tidak. `Msg(lines,back)` – notifikasi + OK.
- Layar khusus: `Standby`, `Progress` (timer kursus, tetap berjalan walau layar ditinggal), `Harga` (input angka + Hapus), `Peta`, `Kontras`.
- Helper LCD 1-bit 96x64: `tx/txR/txC` (teks), `bm` (bitmap), `fr` (kotak), `bar` (progress), `dots`, `status()`, `title()`, `soft()`, `scrollbar()`.
- Badan HP: `renderPhone()` (mask per-piksel + bevel otomatis), `KEYS` (mask + bounding box per tombol untuk hit-test), `hitTest()`.
- Implementasi game: render LCD ke canvas 96x64 lalu skala 2x nearest; state HP = stack layar tunggal; HP terbuka → blok input joystick/Action/Tas. Saldo/XP/pembelian hanya dibaca dari state server (prototipe ini mengubah state lokal saja).

## Keterbatasan (jujur)
- Proporsi HP tidak sama dengan 3310 asli (lebih pendek/lebar) demi LCD terbaca; logo bertuliskan "NOKIA" seperti referensi: **merek dagang**, perlu diganti (konstanta `L` di `renderPhone`) kalau dipakai di game publik.
- Belum dites di HP fisik/touch nyata; ukuran sentuh tombol keypad ~52x21 px logis (OK), tapi tombol atas/bawah pada oval navigasi hanya ~10 px tinggi → mungkin sulit ditekan jari. Belum dicek di iOS Safari.
- Kurang dipoles: Peta (ikon landmark kecil, tanpa nama di peta, jalan sederhana), detail Kontak/Profil (sederhana), layar Pengaturan "Bahasa" & "Keluar game" tanpa aksi nyata, Call key hampir tak berfungsi, * dan # tidak dipakai. Animasi transisi, backlight, nada tombol tidak ada.
- Rotasi tombol keypad/softkey dari rumus (bukan digambar tangan per piksel) → tepi agak bergerigi.
- Teks panjang dipotong dengan "." (fit), tidak ada scroll horizontal; karakter di luar set font jadi "?".
- GIF 128 warna per frame (palet adaptif), crop area HP saja.
- Background diambil dari mockup HUD lama (HUD XP-pixel), bukan dari game hidup.
