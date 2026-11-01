# spawn_hobo — spawn sebagai tunawisma (preview)

Status: **preview saja**. index.html tidak disentuh, belum diintegrasikan atau di-deploy. Mekanik spawn (siapa yang dapat tenda, kapan dipanggil) diurus Baymax.
Gaya v6b: tanpa outline, alpha 0/56/255. Semua warna sudah ada di game. **Hex baru: tidak ada** (diaudit terhadap index.html + known.json + palette.json).

## Isi
- `sprites/tenda_tutup_{sw,se}.png`: tenda terpal biru model A di atas dinding kardus rendah, kardus barang di samping, tali pasak. Flap turun dengan jahitan dan jepitan jemuran.
- `sprites/tenda_buka_{sw,se}__belakang.png` + `__depan.png`: status buka (flap diangkat menjadi kanopi di 2 tongkat). Karakter digambar di antara dua layer ini. `tenda_buka_{sw,se}.png` = preview gabungan.
- `props/alas_kardus_*`, `kantong_plastik_*` (kresek merah), `cangkir_kaleng_*` (kaleng + receh); masing-masing sw/se.
- `sheets/spawn_{ichsan,npc}_{se,sw}.png`: 8 kolom x 5 baris, sel 64x112, pivot (32,100). Baris: bangun, merangkak, berdiri, peregangan, menoleh.
- `sheets/lusuh_{ichsan,npc}_walk_idle.png`: outfit lusuh dalam format sheet game: 6 kolom, baris 0–3 walk se/sw/ne/nw (6 frame), baris 4–7 idle se/sw/ne/nw (4 frame).
- `mock/spawn_{ichsan,npc}_tenda_{sw,se}_3x.gif` (1020x780, ±170 KB, 9.65 detik, tanpa loop-jeda): tenda tutup → buka → 5 fase → jalan ke trotoar.
- `mock/mock_{sw,se}_{tutup,bangun,merangkak,peregangan,menoleh}_4x.png` (+ `1x_native/`): still di pinggir taman/jalan (rumput, trotoar, kerb, aspal).
- `mock/kontak_{ichsan,npc}_4x.png`, `mock/kontak_tenda_props_4x.png`: contact sheet 4x di latar gelap.
- `manifest.json`: ukuran, pivot, anchor, timing, root motion, daftar layar/status. Generator ada di `src/` (chars.py, spawn.py, tent.py, build_b.py).

## Timing (ms per frame)
| fase | frame | ms | total |
|---|---|---|---|
| bangun | 6 | 420 320 320 260 320 380 | 2020 |
| merangkak | 6 | 140 x6 | 840 |
| berdiri | 6 | 150 150 140 140 140 220 | 940 |
| peregangan | 8 | 150 140 140 260 260 160 140 220 | 1470 |
| menoleh | 8 | 300 240 260 260 280 220 260 340 | 2160 |
Total 34 frame, 7.43 detik, tidak looping. Setelah itu lanjut ke idle/walk lusuh.

## Anchor dan akar
- Bangun: pivot (32,100) diletakkan di anchor tenda `tidur` + (0,+14).
- Merangkak: akar maju 1.45 tile ke arah hadap (0.2417 tile per frame; sw ≈ (−7.7,+3.9) px, se ≈ (+7.7,+3.9) px per frame).
- Berdiri, peregangan, dan menoleh: akar diam di titik akhir.
- Karakter berada di antara layer belakang dan depan tenda selama akarnya masih di dalam (b > 0.5 tile). Setelah keluar, karakter digambar di atas tenda.
- Tenda sw memakai sheet sw; tenda se memakai sheet se.

## Layar / status
1. Tenda tutup + props: pemain tanpa rumah sedang offline/tidur.
2. Spawn: bangun (di dalam), merangkak keluar, berdiri, peregangan, menoleh.
3. Bebas jalan dengan outfit lusuh. Tenda dibiarkan buka atau ditutup lagi (keputusan Baymax).
4. (Belum dibuat) Kembali tidur: bisa memakai urutan spawn terbalik.

## Batasan
- Saat bangun, tubuh yang rebah sebagian besar tertutup tenda. Dari pintu yang terbuka hanya kaki dan badan yang terlihat.
- Merangkak terbaca sebagai jongkok condong dengan tangan menapak (squat_legs + limb), bukan merangkak horizontal penuh. Ada lompatan pose dari rebah ke jongkok di frame pertama merangkak.
- Sheet sw adalah cermin dari se, jadi belahan rambut dan sisi tambalan ikut terbalik, sama seperti sheet game.
- Outfit lusuh berupa overlay piksel: tambalan dan sobekan ada di posisi tetap per frame, kadang bergeser 1 px saat walk.
- Tenda hanya tersedia arah sw/se. Atap sisi belakang tidak tampak karena kemiringannya (sesuai proyeksi).
- Bayangan rebah dari generator (alpha 46 di sheet game) dinormalkan ke 56.
- GIF: PIL menggabungkan frame identik (47 frame logis menjadi 42 tersimpan; durasinya dijumlahkan).
