# anim_nyebrang — animasi NYEBRANG di zebra cross (preview, belum dipasang)

Format sama dengan v6b: frame 64x112, pivot (32,100), 4 arah se/sw/ne/nw (sw = mirror se, nw = mirror ne),
alpha hanya 0/56/255, tanpa outline hitam, cahaya dari kiri, latar transparan. **index.html tidak diubah, tidak di-deploy.**

## File
| file | isi |
|---|---|
| `make_anim_nyebrang.py` | generator (live_v6b + chars/ichsan.json; npc_v6b untuk NPC) — `python3 make_anim_nyebrang.py` (~35 dtk) |
| `frames/{ichsan,npc}_{anim}_{dir}_f{i}.png` | frame per animasi (anim: idle, tunggu, tekan, jalan, lari, kaget, terima_kasih, ragu, terobos) |
| `frames/penyeberang_{a,b,c}_nyebrang_{dir}_f{i}.png` | 3 variasi NPC penyeberang, jalan 6 frame |
| `{char}_{anim}_4arah_4x.gif` | GIF 4 arah berdampingan (se, sw, ne, nw), 4x |
| `penyeberang_{a,b,c}_nyebrang_4arah_4x.gif` | GIF penyeberang 4 arah |
| `ichsan_nyebrang_sheet_4x.png`, `npc_nyebrang_sheet_4x.png`, `penyeberang_sheet_4x.png` | sheet 4x semua frame/arah |
| `nyebrang_pose_kunci_4x_darkbg.png` | satu pose kunci per animasi (se), latar gelap |
| `mock_nyebrang_4x.gif` | mock adegan (129 frame x 100 ms, ~6 MB) |
| `manifest.json` | timing per frame, fps, loop, event, titik tunggu, jalur, posisi tekan tombol, fase sinyal |
| `_work/bg_zebra_1x.png`, `_work/capture_bg.py`, `_work/mock_*_4x.png` | latar mock + still kunci (tekan/tunggu/nyebrang/kedip) |

## Animasi (Ichsan & NPC generik sama)
| anim | frame | frame_ms | fps | loop | catatan |
|---|---|---|---|---|---|
| idle | 4 | 250 | 4.0 | ya | = baris idle generator |
| tunggu | 4 | 700,700,650,900 | 1.36 | ya | lirik kiri, lirik kanan, lihat lampu, lihat jam tangan |
| tekan | 4 | 150,160,260,200 | 5.19 | tidak | f2 = tombol_ditekan (t=310 ms) → game mulai hitung fase |
| jalan | 6 | 139 | 7.2 | ya | = baris walk game (10 fps x 0.72), 1.95 sel/s |
| lari | 6 | 80 | 12.5 | ya | lari kecil saat hijau berkedip, ~3.1 sel/s |
| kaget | 4 | 100,160,420,320 | 4.0 | tidak | mobil lewat dekat; badan mundur 1-2 px (geser, tidak dikompres) |
| terima_kasih | 4 | 180 | 5.56 | tidak | angkat tangan ke mobil yang berhenti |
| ragu | 4 | 420,260,420,300 | 2.86 | ya | sebelum terobos: lirik, setengah langkah, lirik, mundur |
| terobos | 6 | 80 | 12.5 | ya | lari + telapak diangkat ke kendaraan |
| penyeberang nyebrang | 6 | 139 | 7.2 | ya | a: hijab + rok panjang; b: kemeja putih lihat HP; c: pelajar, telapak "permisi" |

Ichsan idle/jalan se & ne: selisih 0 px terhadap `assets/chars/ichsan_v6b_sheet.png` (dicek otomatis).

## Titik, jalur, tombol (dari street_buildings/manifest.json "crossing")
- Tunggu: sisi dekat (22.55, 32.15) hadap **sw**; sisi jauh (22.55, 36.85) hadap **ne**. Jalur lurus sepanjang r (dekat→jauh = sw, 2.4 dtk jalan).
- Antre di c 21.5..23.6, jarak antar pejalan >= 0.45 sel.
- Berdiri untuk tekan tombol (dihitung dari bbox tombol kuning sprite tiang + posisi tangan tekan f2):
  near_left (20.528, 31.484) nw · near_right (24.628, 31.484) nw · far_left (19.848, 36.964) ne · far_right (23.948, 36.964) ne.

## Fase sinyal (sprite `street_buildings/sinyal/`)
| id | fase | usulan game | lampu kendaraan | lampu pejalan | anim avatar |
|---|---|---|---|---|---|
| 1 | kendaraan jalan | sampai tombol | hijau | merah | tunggu / tekan |
| 2 | kuning | 3.0 s | kuning | merah | tunggu |
| 3 | semua merah | 1.5 s | merah | merah | tunggu |
| 4 | pejalan hijau | 7.0 s | merah | hijau | jalan, terima_kasih |
| 5 | hijau berkedip | 4.0 s | merah | hijau ↔ hijau_kedip_off tiap 400 ms | lari (yang masih di zebra) |
| 6 | semua merah | 1.5 s | merah | merah | — (ragu/terobos bila nekat) |
Di mock durasi dipadatkan (10/15/10/35/20/10 tick x 100 ms).

## Palet
70 warna, semuanya sudah ada di `npc_babeh_loak/_tools/known.json`; tidak ada hex baru.

## Latar mock
`_work/capture_bg.py` = salinan capture street_buildings: ZEBRA_FIX (garis sejajar jalan, r 33.1..35.7, c 21.2..23.9) dan penghapusan `.extcar`
dilakukan **di memori browser** saja; index.html di disk tidak disentuh. Mobil dari `street_vehicles` (sedan_teal lewat, hatchback_orange & taxi_bluebird berhenti).

## Keterbatasan
- Pose baru kecil (64x112): tangan tekan/terima kasih/kaget terbaca di 4x, di 1x hanya 2-3 px; kacamata Ichsan di frame terobos (kepala menoleh) agak aneh.
- sw/nw hasil mirror: tangan yang terangkat pindah sisi (tangan kiri di sw/nw).
- Mock tidak menampilkan kaget, ragu, terobos — hanya ada di GIF/sheet.
- Oklusi iso: tiang di sisi jauh berada tepat di depan kolom zebra di layar dan menutupi pejalan. Di mock, tiang `lampu_lalin_se`
  digeser dari (25.0, 36.75) ke (26.6, 36.75) agar Ichsan terlihat; tiang pejalan far_right tetap di posisi manifest dan masih menutupi sebagian penyeberang a.
- Posisi berhenti mobil di mock pakai pivot sprite (hatchback c 18.95, taxi c 26.6), dipilih dengan melihat gambar, bukan dari ukuran moncong yang diukur.
- Hijab penyeberang a dari belakang (ne/nw) terlihat seperti rambut merah.
- Mock GIF besar (~6 MB) karena 4x x 129 frame.
