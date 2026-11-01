# NPC "Babeh loak" x3 (pedagang pasar loak) - gaya v6b, PREVIEW SAJA (belum diintegrasikan, tidak di-deploy)
Build: `python3 make_outputs.py && python3 make_mock.py` (~30 dtk). `babeh_base.py` memanggil generator v6b yang sama dengan Pak Ogah /
Manusia Silver (`../npc_pak_ogah/job_common.py` -> live_v6b / npc_v6b: make_cfg, build_char_layers, back_layers, pose_layers,
face_layer, nv.skirt). Opsi generator yang dipakai: kacamata (glasses / glasses_shape round), kumis + jenggot (mustache / stubble),
sarung (nv.skirt 'long'), baris idle (4), walk (6), sit (generator, 4 f dengan napas + kedip).
Ditambahkan: perut buncit, peci / topi pet / topi koboi, detail koko / polo / kemeja kotak, motif sarung, sandal, handuk, bangku,
lengan pose kerja `limb()` (cara Manusia Silver v2: bahu + lengan baju + lengan atas + lengan bawah diarsir melintang + tangan
sederhana, siku), properti (uang, kalkulator, tas, radio), etalase. Frame 64x112, pivot (32,100), bayangan ellipse (0,0,0,56)
rx 11 ry 2.4 (duduk: cx 33). Alpha hanya 0/56/255. sw/nw = mirror. Tanpa outline hitam.

## Tiga babeh
| file | siapa | ciri siluet |
|---|---|---|
| `babeh_pemilik` | Babeh Pemilik Toko Loak, kulit medium (sawo matang) | peci hitam, koko putih lengan pendek, sarung kotak teal, kacamata bulat, kumis abu, sandal kulit, kalkulator |
| `babeh_jam` | Babeh Lapak Jam & Aksesori (dari foto), kulit tan | topi pet khaki ber-pet ke depan, polo hijau, celana kain khaki, kacamata, kumis, sandal jepit gelap |
| `babeh_tas` | Babeh Lapak Tas / Barang Bekas, kulit brown | topi koboi cokelat bertepi lebar, kemeja kotak merah lengan digulung, kumis + jenggot putih, handuk di bahu, sandal jepit teal |
Rambut putih/abu (generator 'silver') terlihat di bawah topi. Siluet dibedakan oleh topi (peci rata / pet berpet / koboi lebar),
warna atasan (putih / hijau / merah), dan bawahan (sarung lebar / khaki / gelap).

## Animasi (per babeh, 4 arah: se sw ne nw)
- `idle` f0-3, `walk` f0-5 (generator), `sit` f0-3 (duduk di bangku: f1 kedip, f2-3 badan naik 1 px = napas)
- `offer` f0-3 menawarkan: tangan terbuka ke samping, f2 menunjuk barang, mulut bicara
- `count` f0-3: pemilik = kalkulator (telunjuk mengetik, LCD berkedip); jam = menghitung uang (lembar pindah dari tumpukan ke tangan lain);
  tas = menimbang tas di tangan (naik-turun)
- `haggle` f0-3 menawar: kepala geleng (kepala + topi geser kaku -1/0/+1), telapak diangkat "nggak bisa", tangan lain di pinggang
- pemilik saja: `counter` f0-5 di balik etalase: tangan di meja -> menerima barang -> pegang radio -> periksa dekat wajah -> bayar (uang di tangan jauh) -> senyum
- frames/<nama>_<arah>_<anim>_f<i>.png (336 file). poses/: idle, sit, *_key per arah; prop_stool_<nama>_se/ne.png (bangku terpisah,
  frame 64x112 pivot 32,100; sit frames sudah memuat bangku); prop_etalase_se.png / _sw.png (84x64, pivot (42,50) / (41,50), 1.2 x 0.4 sel).
- Etalase TIDAK dipanggang ke frame counter (berada di depan NPC dan keluar dari frame 112). Di preview diletakkan +0.55 sel c di depan.

## File gambar utama
- `babeh_loak_all_4x_darkbg.png`, `babeh_loak_all_4x_transparent.png` (gabungan pose kunci 3 babeh x 4 arah)
- `<nama>_sheet_4x.png` (semua anim x 4 arah, transparan)
- GIF 4x (4 arah berdampingan): `<nama>_idle_`, `_walk_`, `_sit_`, `_work_` (offer+count+haggle) `4views_4x.gif`, `babeh_pemilik_counter_etalase_4views_4x.gif`
- `babeh_pemilik_counter_etalase_4x_darkbg.png`
- `mock_lorong_babeh_4x.png`: close-up lorong loak (layout street_buildings/_work/closeup.py, kamera seberang). Pedagang kotak lama
  dihapus (prop `pedagang_duduk_b_nw` tidak dipasang; figur kotak di `lapak_tas_b`, `lapak_jam_dinding`, `lapak_jam_tangan`,
  `lapak_barang_bekas` dirender ulang DI MEMORI tanpa person_seated). Babeh Jam duduk di bangku biru depan lapak jam dinding,
  Babeh Tas menimbang tas dekat gapura, Babeh Pemilik di balik etalase Toko Loak, plus Babeh Jam versi nw (punggung) di lapak jam tangan sisi kanan.
  Tidak ada file di street_buildings yang ditulis.

## Palet
Audit `colour_audit.json`: 75 warna, **0 hex baru** (semua ada di index.html atau sprite game/aset yang sudah ada; 16 tidak tertulis
di index.html tetapi sudah dipakai di sprite v6b / street_buildings / Pak Ogah, mis. #A9B1BF, #7A2E35, #3D7A80). Peci = night/charcoal/slate,
topi pet = ramp khaki pal6, koboi/bangku kayu = walnut + #A87A4E, sarung = teal Theodore + night + lgrey, bangku = ramp bangku_plastik
merah/biru street_buildings, uang = merah/biru bangku, etalase = biru bangku + walnut.

## Keterbatasan (jujur)
- Perut buncit = pelebaran baris perut 1-3 px (lebih besar ke arah hadap) + bayangan bawah perut; di 1x terbaca sebagai badan gemuk, bukan perut menonjol tajam. Bahu 1-2 px lebih lebar dari NPC standar; tinggi sama.
- Lengan pose kerja tetap custom (bukan lengan generator); jari 1-3 px. Lengan idle/walk/sit = lengan generator (balok 3 px).
- ne/nw: tangan yang di depan dada (menghitung, counter) tertutup punggung - yang terlihat siku / tangan yang dibawa ke samping
  (kalkulator/uang dipindah ke tangan samping di count ne). Tidak ada tangan yang tertutup kepala.
- Kepala tidak dikompres; geleng = geser kaku 1 px. Rambut generator 'short' bervolume, jadi topi pet tampak agak tebal.
- Motif kotak kemeja/sarung digambar di atas pola lipatan generator, jadi sedikit "berisik" di 1x. Kumis/jenggot kecil (generator).
- Bangku dan etalase digambar sederhana; tangan pemilik di f1-f2 counter sedikit tertutup tepi atas etalase di preview.
- sw/nw = mirror (arah cahaya ikut terbalik, sama dengan game). GIF: alpha 56 diratakan jadi abu gelap.
- Di mock, Babeh Jam duduk sebagian tertutup terpal lapak rendah sisi kanan, tangan Babeh Tas sebagian tertutup pilar gapura (urutan kedalaman iso).
- Mock memakai "kamera seberang" (diputar 180°). Di kamera game sekarang, muka bangunan seberang menghadap ne (tidak terlihat); lihat README street_buildings.
