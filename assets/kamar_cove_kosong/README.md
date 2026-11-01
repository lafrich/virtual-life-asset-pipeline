# kamar_cove_kosong — kamar Cove versi kosongan (preview)

Status: **preview saja**. index.html tidak disentuh, belum diintegrasikan atau di-deploy.
Gaya v6b: iso 2:1, tile 64x32, cahaya dari kiri, 4–5 tone, tanpa outline. Alpha 0/56/255; satu-satunya pengecualian adalah file `__glow` (halo lampu, alpha 90, dipakai sebagai layer cahaya terpisah seperti aset street_buildings).

## Sumber ukuran (index.html, interior Cove)
- Ruang: CV c −21.6..−12.8, r 21.0..28.0, dinding HW 40 h-unit = 128 px (1 h-unit = 3.2 px).
- Sekat kamar mandi PW c = −16.5, ambang r 25.75–26.75; jendela dinding samping r 22.3–24.3, h 13–33; keset keluar c −20.2..−19.0, r 27.35..27.95.
- Kasur c −21.5..−19.3, r 21.05..23.65 (titik tidur −20.45, 22.9). WC gantung c −13.55..−13.02, r 21.05..21.78.
- Lobi r0 24.6, 5 pintu oranye di c −20.5 / −18.85 / −17.2 / −15.55 / −13.9.
Semua hex diambil dari Cove/engine game. **Hex baru: tidak ada** (sudah diaudit terhadap index.html + known.json + palette.json).

## File
- `sprites/kamar_shell_ruang.png` (585x460): lantai, 2 dinding, kamar mandi keramik, jendela berkerai, keset. `kamar_shell_sekat_penuh.png` / `kamar_shell_sekat_rendah_cutaway.png` memakai kanvas dan origin yang sama (origin_px 264,168 = sudut belakang c0,r0). Di game sekat penuh dibuat transparan (opacity 0.3); versi rendah dipakai untuk mock.
- `sprites/kasur_kost_{sw,se,ne,nw}.png`: kasur single (footprint 1.3 x 2.6 tile), rangka kayu, kasur putih, bantal, selimut terlipat.
- `sprites/wc_gantung_{sw,se,ne,nw}.png`: WC gantung + panel tangki + tombol flush (0.53 x 0.75 tile).
- `sprites/pintu_lobi_{milik,milik_orang_lain,terkunci,tersedia}_sw.png` (+ `__glow` untuk lampu merah milik orang lain).
- `sprites/papan_berdiri_{belum_bisa_disewa,tersedia}_{sw,se}.png`: papan berdiri kecil.
- `props/` (perlengkapan dasar kamar mandi, 4 arah sw/se/ne/nw, pivot = tengah footprint 0.5x0.5 tile di lantai, bayangan elips alpha 56):
  - `ember_*.png` (24x28): ember plastik biru kosong, pegangan kawat rebah ke belakang. Ø ±30 cm, tinggi 14 px.
  - `ember_air_*.png` (24x28): ember berisi air (GLASS, kilau di sisi kiri).
  - `ember_air_gayung_*.png` (24x28; se 24x30): gayung terapung di dalam ember berisi air, gagang bersandar di bibir.
  - `gayung_*.png` (sw/nw 18x16, se/ne 22x14): gayung pink berdiri di lantai.
  Warna: ramp BLUE, PINK, GLASS, CONC yang sudah ada di engine. Generator: `src/props_kamar.py`.
- `mock/mock_kamar_kosong_{1x,4x}.png`: kamar + kasur + WC + ember berisi air dengan gayung (`ember_air_gayung_sw`, untuk mandi) di sisi kanan kamar mandi, seberang depan dudukan WC, jauh dari pintu kamar mandi: dunia c −13.25, r 27.45 (lokal 8.35, 6.45), px mock 1x 285,364 / 4x 1140,1456; ±6 tile dari WC, ±3.5 tile dari ambang pintu + Ichsan idle (live_v6b + chars/ichsan.json).
- `mock/mock_lobi_status_pintu_{1x,4x}.png`: lobi dengan semua status pintu: 1 terkunci, 2 tersedia, 3 milik Raka, 4 Ichsan, 5 Noor.
- `ui/0X_*.png` (preview 2x, 844x390 dan 667x375) + `ui/1x_native/`: gaya ui_y2k (kaca Vista).
- `manifest.json`: ukuran, pivot, anchor, origin, rect UI, daftar layar/status. Generator ada di `src/` (make_kamar.py, build_a.py, ui_kamar.py).

## Layar / status
1. Kamar kosong (dalam): kasur + WC + ember/gayung di kamar mandi. Aksi tidur/WC memakai anchor Cove lama.
2. Pintu lobi – milik sendiri: papan nama pemilik.
3. Pintu lobi – milik orang lain: lampu merah kecil. Saat diklik muncul dialog `01_akses_ditolak` ("Kamar ini milik orang lain. Akses ditolak.", ikon gembok, tombol OK).
4. Pintu lobi – terkunci / belum bisa disewa: gembok + rantai + papan "BELUM BISA DISEWA". Saat diklik muncul toast `02`.
5. Pintu lobi – tersedia untuk dibeli: papan "TERSEDIA UNTUK DIBELI". Saat diklik muncul toast `03`. Alur beli ditangani Baymax.
6. Opsional: papan berdiri di depan pintu (dua varian).

## Batasan
- Pintu lobi hanya tersedia arah sw (sesuai dinding lobi di game). Papan berdiri tersedia sw/se.
- Teks papan memakai font piksel 3x5 kapital. Di 1x hurufnya kecil; terbaca di 2x ke atas.
- Mock memakai sekat rendah (cutaway). Di game sekat tetap setinggi dinding dengan opacity 0.3.
- Nama "RAKA" dan isi toast hanya contoh.
- Ember dan gayung kecil (±24 px). Di 1x, pegangan kawat hanya garis 1 px dan gagang gayung 2 px. Pada arah ne gagang gayung di dalam ember hampir tertutup badan ember, dan pada gayung sw/nw gagangnya pendek karena mengarah ke kamera.
- Belum ada animasi (air bergoyang, gayung dipakai). Belum dibuat versi ember warna lain.
