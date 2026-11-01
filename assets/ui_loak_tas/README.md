# Virtual Life · UI Toko Loak (jual) + Tas berisi item (PREVIEW)

Preview saja: tidak ada yang di-deploy, `virtual-office/index.html` tidak diubah, tidak ada agen lain yang dihubungi. Dibuat 1 Nov 2026 (WIB).
Gaya mengikuti HUD Vista di `../ui_y2k/` (revisi Vista): kaca Aero semi-transparan (warna kapsul bar HUD), orb Action hijau, kapsul uang+HP+Tas, joystick lama, font Tahoma 11 (klon Wine, `../ui_y2k/fonts/`), pixel 1x, perbesaran integer nearest-neighbour, tanpa bunga.
Data: barang, nama, rarity, harga dari `../item_temuan/item_catalog.json`; ikon 32x32 dari `../item_temuan/icons/`; potret dari `../npc_babeh_loak/poses/babeh_pemilik_se_{offer,haggle,count}_key.png` / `_idle.png`; latar = `npc_babeh_loak/mock_lorong_babeh_4x.png` (loak) dan `item_temuan/sheets/mock_taman_gang_4x.png` (taman), diperkecil 1/4 nearest (= piksel 1x asli). HUD = `ui_y2k/src/y2k.py` (dipanggil, tidak diubah).

## File
| File | Isi |
|---|---|
| `01_loak_jual.png` | panel Toko Loak: header + potret babeh (orb kaca), daftar barang dibawa (ikon 32 di slot border rarity, nama, rarity, jumlah, tawaran per buah + subtotal), baris dipilih + baris hover, scrollbar, balon babeh, indikator harga hari ini (x1,10), ringkasan (Dipilih / Total semua / Saldo), Jual / Jual semua / Tawar, Tutup |
| `02_loak_tawar.png` | popup Tawar: potret haggle, balon tawaran babeh, harga minta dengan - / + (+9%, maks +20%), peluang diterima (usulan) |
| `03_loak_konfirmasi.png` | popup konfirmasi Jual semua: ikon semua barang, total, saldo setelah, Ya, jual (hover) / Batal |
| `04_loak_terjual.png` | kartu "Terjual!": +Rp besar (Tahoma Bold 22), kilau, potret count, barang terjual, saldo lama > baru; kapsul uang HUD sudah saldo baru + balon +Rp |
| `05_loak_kosong.png` | tas kosong: daftar kosong + pesan, tombol jual disabled |
| `10_tas_8slot.png` | Tas awal Basic Bag 5/8: slot terisi (border rarity, badge tumpukan), kosong (titik-titik), terkunci 9–16 (dither + gembok), dipilih; detail: ikon besar, nama, rarity, tumpukan n/5, harga jual + rentang Toko Loak x0,8–1,2, deskripsi katalog, Buang |
| `11_tas_12_penuh.png` | Medium Bag 12/12: kapasitas merah + label "Tas penuh", tumpukan x5 (maks, emas) |
| `12_tas_16slot.png` | Large Bag 15/16 |
| `13_tas_buang_konfirmasi.png` | popup Buang barang? (Buang hover / Batal) |
| `20_toast_dapat_f0..f2.png`, `20_toast_dapat.gif` | notifikasi "Dapat: Radio tua" + kilau 3 frame (kilau_item item_temuan + bintang 4 titik), badge +1 di orb Tas |
| `21_toast_tas_penuh.png` | toast Tas penuh (8/8), badge 8/8 di orb Tas |
| `30_komponen_4x.png` | sheet komponen 4x: tombol kaca 4 warna x normal/hover/pressed/disabled, Tutup, slot (kosong/umum/jarang/langka/dipilih/terkunci/x2–x5), rarity, indikator harga x0,8–1,2, potret 4 pose, kapasitas 8/12/16/penuh, balon, panel kaca, toast 3 frame |
| `31_contoh_isi_item_4x.png` | sheet 4x semua 48 ikon / 37 jenis katalog: slot rarity + nama + varian + rarity + harga Rp |
| `slices_atlas_4x.png`, `slices/atlas_1x.png`, `slices/*.png` | 61 slice RGBA (alpha kaca dipertahankan): tombol (dengan & tanpa label) per state, Tutup, slot 38/40/72 per rarity, kosong, terkunci, ring pilih, badge x2–x5, potret babeh, panel kaca 64 (9-slice), well 32, latar toast, kilau f0–f2 |
| `manifest.json` | rect atlas (x,y,w,h) + posisi/ukuran tiap elemen per layar per resolusi (`layar.<nama>.<844x390|667x375>`: panel, daftar, baris_i, slot_i, tombol, popup, toast, dll.), koordinat logis 1x |
| `1x_native/` | semua layar 1x (844x390 tanpa akhiran, 667x375 berakhiran `_667x375`) + sheet 1x |
| `667x375/` | semua layar 667x375 di 2x |
| `src/` | generator: `lt.py` (komponen), `loak_screens.py` (layar), `sheets.py` (sheet, atlas, manifest). Jalankan: `cd src && python3 loak_screens.py && python3 sheets.py` (±10 dtk; butuh `../ui_y2k/src`, `../ui_mockups/src`, font Wine Tahoma di `/usr/share/fonts/truetype/wine/`) |

Layar 844x390 utama di root = 2x (1688x780). Sheet `*_4x` = 4x.

## Ukuran (1x)
Panel Toko Loak 600 x (H−36) (844: 600x354, 667: 600x339), kepala 34 · baris daftar 42 (6 terlihat di kedua resolusi, sisanya scroll) · slot daftar 38 · kolom kanan 190 · tombol 190x26 (popup 134x24) · Tutup 20 tinggi · Panel Tas 560 x (H−36) · slot 40, jarak 6, grid 4x4 · ikon besar = slot 72 berisi ikon 64 (2x) · popup 280–300 lebar · toast 258x50 (tas penuh 300x50) · potret orb r15 (kartu Terjual r18) · semua teks Tahoma 11 kecuali angka "+Rp" di kartu Terjual (Tahoma Bold 22).

## Warna
Tidak ada hex baru di generator: semua dari `ui_y2k` / `ui_mockups` / style-sheet / katalog.
- Kaca: atas `#566E8E`, badan `#142034` (alpha 212–225), tepi `#060A12`, garis atas `#EBF5FF`, garis glow `#6EA0D2` (= kapsul bar HUD ui_y2k).
- Tombol: hijau `#8EE08A→#1E7A22` (glow `#B8F5B0`), biru `#8CC4F5→#0B3F86` (`#A8DCFF`), brass/Tawar `#FFD166→#C99A2E` (`#E0A526`), merah/Tutup/Buang `#F08A64→#B8361A` (`#E35A2F`, merah close XP lama), disabled `#D0D0D0→#6A6A6A`. Hover = ring `#A8DCFF`.
- Rarity (dari katalog `warna_label`): umum `#86E59A`, jarang `#86CCFF`, langka `#FFD166`. **Catatan**: `#86E59A` dan `#86CCFF` baru dipakai di UI (sebelumnya hanya di katalog). Border slot bagian dalam = warna rarity digelapkan 35% (warna turunan, dihitung).
- Teks: putih + bayangan `#05080E`, redup `#9AA6B6`, uang/total `#3DDC84`, penuh/turun `#E5484D`, tumpukan maks `#FFD166`, balon `#FFFFE1`, seleksi baris `#316AC5` (alpha 150) + garis `#A6CAF0`.
- Warna turunan dari pencampuran alpha / mix (bayangan kaca di atas scene, hover lebih terang, pressed lebih gelap) tidak dihitung sebagai hex baru, tapi memang menghasilkan nilai piksel baru di PNG.

## Aturan tampilan (usulan, dari `mekanik_usulan` katalog)
- Harga tawaran = harga_jual_rp x pengali harian (x0,8–1,2), dibulatkan ke Rp 10; contoh layar x1,10. Bonus +20% untuk 3 langka pertama per hari ditampilkan sebagai catatan.
- Tas: awal 8, upgrade 12/16; varian beda = slot beda; sejenis menumpuk sampai 5 (badge emas di x5).
- Tawar (persentase, peluang, penalti "turun 5%") = **usulan UI baru**, tidak ada di katalog. Buang = hilang permanen tanpa uang.
- Saldo/uang hanya dari state server; UI tidak mengubah angka sendiri (sama seperti ui_y2k).

## Keterbatasan
- Kaca = pixel art: tidak ada blur di belakang panel (scene tetap tajam), alpha bertingkat datar, sudut keras. Badan panel dibuat cukup gelap (alpha ~212) supaya teks 11 px terbaca; jadi "transparan"-nya tipis.
- Ikon besar detail Tas = ikon 32 diperbesar 2x (campuran skala piksel); kartu Terjual memakai Tahoma Bold 22 (satu-satunya ukuran besar). Teks warna rarity "Jarang" (`#86CCFF`) di atas kaca biru sedikit kurang kontras dibanding Umum/Langka.
- Potret babeh = crop kepala 1x dari pose (28 px lebar) di orb r15; kecil, dagu terpotong.
- Font = klon Wine Tahoma, bukan Microsoft Tahoma. 667x375: semua layar dicek mata di 1x untuk 01, 03, 04, 10; layar lain dicek di 844 saja (layout sama, panel 600 muat di 667).
- Latar adalah mock 1x dari folder aset (tanpa avatar pemain di lorong loak); taman mock tidak memuat avatar juga. Lebar mock loak 772 px < 844 → tepi kiri/kanan diisi warna hijau tepi mock.
- Hover/pressed hanya ditunjukkan di sheet komponen + beberapa layar; tidak ada prototipe klik. Multi-pilih baris (jual beberapa sekaligus selain "Jual semua") belum didesain.
- Angka (saldo Rp 1.250.000, jumlah barang) = data contoh.
