# Street buildings: seberang jalan, gang pasar loak, kampung, lampu penyeberangan (PREVIEW)

Status: **preview saja.** Tidak ada yang dipasang ke game. `game/index_extract.txt` hanya dibaca. Folder vegetation/npc/ui tidak diubah. Tidak ada agen yang dihubungi.
Dibuat 1 Nov 2026 (WIB) dengan generator Python prosedural (`_work/`). Rebuild (~40 dtk):
`cd _work && python3 produce.py && python3 sheets.py && python3 scene.py && python3 closeup.py` (lalu potongan 4x/malam: lihat akhir README).

## Yang dibaca dari game (index.html, OUTSIDE ~2730-3230)
- `P(c,r)` = (X0+(c-r)·TW/2, Y0+(c+r)·TH/2), tile 32×16 unit, sprite 1 px = 0.5 unit (PPU 2). Tinggi luar: `HS=1.6`, jadi 1 unit-h = 3.2 px.
- Sisi yang sudah ada: Cove kost (c −21.8..−12.6), FamilyMart (c −10.6..−0.9), studio/kantor (c 0..27), warteg (c 28.3..35.3). Muka gedung ada di **r ≈ 27.3-28** dan menghadap **sw (+r)** ke jalan.
- Penampang jalan (r naik ke arah kamera): halaman r 28.25..32.35, strip pemandu kuning r 31.95..32.25, kerb r 32.5..32.75, aspal r 32.75..36.3 (garis tepi 32.92 dan 36.07, marka tengah putus-putus kuning r 34.47..34.58), lajur **se r 33.05** (bergerak +c), lajur **nw r 34.85** (bergerak −c), kerb seberang r 36.3..36.55, **trotoar seberang r 36.55..37.7**. Rumput meluas sampai r 43, dan jalan dibangun dari c −29 sampai 43.
- **Zebra cross SUDAH ADA:** strip c 21.2..23.9 (setiap 0.6, lebar 0.32), r 32.98..36.07; strip peringatan kuning c 20.6..24.4 di r 31.95..32.5 dan 36.55..37.0. Jadi sprite zebra baru tidak dibuat; mock menggambar ulang zebra itu dari koordinat ini.
- Cahaya: kiri-atas (bidang sw terang, bidang se gelap, atas paling terang), sama dengan style sheet dan v6b.

## Sisi seberang dan arah muka (keputusan)
- **Seberang = sisi dengan r LEBIH BESAR**: lot mulai di belakang trotoar seberang, **r 37.7** sampai sekitar **r 44-45** (kedalaman 6-7 sel), dan menutupi **c −29.5..43.5** (hampir sama dengan CL..CR −29..43).
- Muka bangunan seberang yang menghadap jalan menghadap **−r (ne)**. Di kamera game sekarang, sisi ne **tidak terlihat** (kamera hanya melihat bidang sw dan se), jadi kamera akan melihat punggung gedung.
- Karena itu semua sprite dibuat dengan muka ke kamera:
  - **`_sw`**: muka di bidang sw (terang), lebar W sepanjang +c. Ini yang dipakai untuk deretan jalan besar dalam **"kamera seberang"**: tampilan diputar 180° (`c' = 43 − c`, `r' = 69.05 − r`). Pada tampilan itu jalan ada di depan (kiri-bawah) dan gang masuk ke **kanan-atas**. Semua mock memakai tampilan ini.
  - **`_se`**: muka di bidang se (bayangan, satu nada lebih gelap). Dipakai untuk bangunan yang menghadap jalan atau lorong yang memanjang sepanjang r, misalnya lapak sisi kiri lorong, toko loak, dan warung madura di mock. Bisa juga untuk jalan samping.
  - **Tidak ada mirror.** Kedua arah dirender ulang dari geometri 3D yang sama dengan cahaya kiri yang sama. Karena itu bidang muka pada `_se` memang lebih gelap, dan papan/huruf tetap terbaca kiri-ke-kanan.
  - `_ne` / `_nw` (hanya lapak rendah, motor, bangku, pedagang, dan lampu): versi "membelakangi kamera". Lapak rendah/motor/pedagang dibalik muka-belakang (pedagang terlihat dari punggung). Untuk lampu, kepala lampu menghadap menjauh, jadi kamera melihat punggung rumah lampu dan tombol.
- Untuk menaruh deretan ini di kamera game yang sekarang tanpa kamera seberang, perlu varian "punggung gedung" (muka ne). Varian ini **belum dibuat**. Engine `_work/engine.py` bisa membuatnya dengan memasang tekstur belakang pada `Loc(...).flip=True`.

## Tata letak deretan (mock = kamera seberang; game = koordinat asli)
| bangunan (sw) | c' mock | c game | r game (lot, muka di 37.7+apron) |
|---|---|---|---|
| kantor_b | -0.5 .. 5.5 | 37.5 .. 43.5 | 37.7 .. 43.7 |
| masjid | 5.5 .. 14.5 | 28.5 .. 37.5 | 37.7 .. 44.7 |
| ruko_a | 14.5 .. 17.5 | 25.5 .. 28.5 | 37.7 .. 43.7 |
| (mulut gang + lapak) | 17.5 .. 22.5 | 20.5 .. 25.5 | 37.7 .. 43.7 |
| ruko_b | 22.5 .. 25.5 | 17.5 .. 20.5 | 37.7 .. 43.7 |
| ruko_c | 25.5 .. 28.5 | 14.5 .. 17.5 | 37.7 .. 43.7 |
| kantor_a | 28.5 .. 35.5 | 7.5 .. 14.5 | 37.7 .. 43.7 |
| bank_bca | 35.5 .. 41.5 | 1.5 .. 7.5 | 37.7 .. 43.7 |
| kafe_blue_doors | 41.5 .. 46.5 | -3.5 .. 1.5 | 37.7 .. 42.7 |
| indomaret | 46.5 .. 52.5 | -9.5 .. -3.5 | 37.7 .. 43.7 |
| hotel | 52.5 .. 60.5 | -17.5 .. -9.5 | 37.7 .. 43.7 |
| mall | 60.5 .. 72.5 | -29.5 .. -17.5 | 37.7 .. 44.7 |

- **Mulut gang**: c' 17.5..22.5 = **c game 20.5..25.5**, tepat di seberang zebra (c 21.2..23.9). Gapura c' 18.5..21.5. Lorong 2 sel **c game 22..24** masuk dari r 37.7 sampai sekitar **r 51.7** (mock r' 31.35 → 17.35, terlihat naik ke kanan-atas).
- **Pasar loak** sepanjang lorong. Sisi kiri (mock c' 17.5..19): lapak tinggi `_se` (tas, jam dinding, tas+pedagang, aksesori), r' 22.6..30.6. Sisi kanan (c' 21..22.5): lapak rendah `_nw` (jam tangan, mainan, barang bekas), motor, kardus, bangku, pedagang.
- **Toko Loak utama** (`toko_loak_se`, mock c' 15.5..19, r' 18.6..22.6 = **game c 24..27.5, r 46.45..50.45**). Titik interaksi dihitung dari sudut utara footprint, dalam sel (c,r): `_se` {'npc_buyer_cell': [2.95, 2.0], 'player_sell_cell': [3.3, 2.0], 'counter_rect': [2.25, 0.6, 2.65, 3.4]}; `_sw` {'npc_buyer_cell': [2.0, 2.95], 'player_sell_cell': [2.0, 3.3], 'counter_rect': [0.6, 2.25, 3.4, 2.65]}. Artinya: `player_sell_cell` = tempat pemain berdiri di depan meja etalase, `npc_buyer_cell` = tempat NPC pembeli nanti, `counter_rect` = meja etalase (blokir jalan).
- **Warung madura** ada di ujung kanan lorong (mock c' 21..24.2, r' 19.1..22.1). Kampung ada di belakang deretan: 5 rumah + pos ronda + jemuran + pot. Gang belakang dan lantai cor ada di r' < 25.35.

## Lampu penyeberangan (prioritas) dan lampu lalu lintas (pelengkap)
- `sinyal/lampu_pejalan_<merah|hijau|hijau_kedip_off|padam>_<sw|se|ne|nw>.png` (+`__glow`). Kepala 2 jendela: atas = **orang berdiri merah**, bawah = **orang berjalan hijau**. `hijau_kedip_off` = frame kedip (hijau padam), jadi hijau berkedip = selang-seling `hijau` ↔ `hijau_kedip_off` sekitar 400 ms. **Tombol seberang** = kotak kuning di tiang (z 44-66 px) dengan tombol bulat dan LED merah yang menyala pada state merah ("tunggu"). Tiang 150 px, pivot = kaki tiang, footprint 1×1.
- `sinyal/lampu_lalin_<merah|kuning|hijau>_<dir>.png` (+`__glow`). Tiang 196 px, lengan 1.4 sel, kepala 3 lampu (merah di atas) + kepala rendah di tiang. Pada `_sw/_se` lampu menghadap kamera dan lengan ke +a. Pada `_ne/_nw` lampu membelakangi kamera dan lengan ke −a.
- Penempatan yang disarankan (koordinat game; ada juga di `manifest.json → crossing`):
  - titik tunggu pejalan kaki: trotoar dekat **(22.55, 32.15)**, trotoar seberang **(22.55, 36.85)**
  - tiang pejalan: dekat **(20.45, 32.25)** dan **(24.55, 32.25)** pakai `_sw` (lampu menghadap seberang); seberang **(20.45, 36.8)** dan **(24.55, 36.8)** pakai `_ne` (kamera melihat punggung + tombol)
  - tiang kendaraan: untuk lajur se (r 33.05, bergerak +c, berhenti c ≈ 20.4) di **(20.0, 32.3)** `_nw`, lengan ke +r di atas jalan; untuk lajur nw (r 34.85, bergerak −c, berhenti c ≈ 24.6) di **(25.0, 36.75)** `_se`, lengan ke −r
  - Di mock (diputar 180°) arah ikut berputar: sw↔ne, se↔nw.
- Urutan fase yang disarankan (**catatan, bukan angka final**): 1) kendaraan HIJAU / pejalan MERAH (default; tombol ditekan → LED menyala) → 2) kendaraan KUNING (~3 dtk) → 3) semua MERAH (~1-2 dtk) → 4) pejalan HIJAU berjalan (avatar boleh masuk zebra) → 5) pejalan HIJAU KEDIP (jangan mulai menyeberang) → 6) pejalan MERAH + semua merah (~1-2 dtk) → kembali ke 1. Opsi nanti: angka hitung mundur di samping kepala (belum dibuat).

## File
| path | isi |
|---|---|
| `jalan_besar/` | indomaret, kantor_a (5 lt), kantor_b (8 lt), bank_bca, masjid, kafe_blue_doors, hotel (6 lt), mall, ruko_a/b/c. Masing-masing `_sw`, `_se`, + `__glow` |
| `pasar_loak/` | toko_loak, lapak_tas, lapak_tas_b, lapak_jam_dinding, lapak_aksesori (tinggi, terpal), lapak_jam_tangan, lapak_mainan, lapak_barang_bekas (rendah, 4 arah) |
| `kampung/` | warung_madura (+glow), rumah_kampung_a..e, pos_ronda |
| `gang/` | gapura_gang, tembok_gang_a/b, lorong_lurus (2×4), lorong_ujung (2×2), lorong_tikungan (2×2) |
| `props/` | tiang_listrik, tiang_trafo, kabel_4, bangku_plastik merah/biru, kardus_tumpuk, motor_parkir hitam/merah, pedagang_duduk a/b, rak_gantung_tas, papan_jam_dinding, nampan_jam_tangan, meja_mainan, terpal biru/merah/oranye, pot_tanaman (hijau, tanpa bunga), jemuran |
| `sinyal/` | lampu_pejalan (4 state × 4 arah), lampu_lalin (3 state × 4 arah), semua dengan `__glow` |
| `manifest.json` | ukuran, pivot, anchor_n, footprint, facing, glow, catatan, titik interaksi toko loak, blok `crossing` |
| `previews/` | contact sheet 4x per kelompok (+ ringkasan 1x), mock jalan seberang 1x/2x, mulut gang 4x, close-up lorong loak 4x, malam |
| `_work/` | generator: `engine.py` (renderer iso piksel-eksak dengan depth buffer, ramp material), `lib.py`, `roadside.py`, `gang.py`, `signals.py`, `produce.py`, `sheets.py`, `scene.py`, `closeup.py`, `colours.json` |

Pohon di mock diambil dari `vegetation_kebonsirih/trees` (v3). Semak dan bunga tidak dipakai. Mobil, bus, dan motor diambil dari `street_vehicles/cars`.

## Gaya (v6b)
- Iso 2:1 piksel-eksak (tepi diagonal 2:1 bersih), 1x, tanpa anti-aliasing. Lantai atas 90 px, lantai dasar 104 px (avatar 86 px).
- **Tanpa outline hitam.** Tepi kanan/bawah siluet memakai satu nada lebih gelap dari material yang sama. Sudut antar-bidang terbaca dari beda nada (atas +1, sw 0, se −1).
- Setiap material punya ramp 5 nada (gelap→terang), semuanya diambil dari palet game.
- Bayangan: proyeksi datar hitam **alpha 56**, didorong ke kanan (menjauh dari cahaya kiri). Bayangan yang jatuh di apron/trotoar milik sprite sendiri dibuat 1 nada lebih gelap. Audit alpha di PNG dasar: **0 / 56 / 255 saja**.
- `__glow`: hanya piksel emisif (papan, huruf, jendela menyala, lampu), alpha 255 + halo 2 px alpha 90, untuk blend screen/additive saat malam.

## Ukuran / pivot / footprint
`pivot` = piksel tanah di bawah pusat footprint. `anchor_n` = piksel sudut utara footprint (min c, min r) di tanah. Gambar di game: `<image x=P(c,r).x−pivot.x/2 y=P(c,r).y−pivot.y/2 width=w/2 height=h/2>`. Urutan kedalaman: c+r pusat footprint (lantai lorong digambar lebih dulu sebagai ground).

| file | w×h px | pivot | anchor_n | footprint W×D | glow |
|---|---|---|---|---|---|
| `jalan_besar/indomaret_sw.png` | 410×344 | 192,248 | 192,152 | 6×6 | ya |
| `jalan_besar/indomaret_se.png` | 384×344 | 192,248 | 192,152 | 6×6 | ya |
| `jalan_besar/kantor_a_sw.png` | 474×692 | 208,588 | 192,484 | 7×6 | ya |
| `jalan_besar/kantor_a_se.png` | 434×692 | 208,588 | 224,484 | 7×6 | ya |
| `jalan_besar/kantor_b_sw.png` | 442×950 | 192,854 | 192,758 | 6×6 | ya |
| `jalan_besar/kantor_b_se.png` | 402×952 | 192,855 | 192,759 | 6×6 | ya |
| `jalan_besar/bank_bca_sw.png` | 428×492 | 192,396 | 192,300 | 6×6 | ya |
| `jalan_besar/bank_bca_se.png` | 388×492 | 192,396 | 192,300 | 6×6 | ya |
| `jalan_besar/masjid_sw.png` | 512×430 | 256,301 | 224,173 | 9×7 | - |
| `jalan_besar/masjid_se.png` | 512×552 | 256,423 | 288,295 | 9×7 | - |
| `jalan_besar/kafe_blue_doors_sw.png` | 352×356 | 160,276 | 160,196 | 5×5 | ya |
| `jalan_besar/kafe_blue_doors_se.png` | 320×356 | 160,276 | 160,196 | 5×5 | ya |
| `jalan_besar/hotel_sw.png` | 504×798 | 224,686 | 192,574 | 8×6 | ya |
| `jalan_besar/hotel_se.png` | 458×798 | 224,686 | 256,574 | 8×6 | ya |
| `jalan_besar/mall_sw.png` | 568×720 | 304,568 | 224,416 | 12×7 | ya |
| `jalan_besar/mall_se.png` | 614×720 | 304,568 | 384,416 | 12×7 | ya |
| `jalan_besar/ruko_a_sw.png` | 332×442 | 144,370 | 192,298 | 3×6 | ya |
| `jalan_besar/ruko_a_se.png` | 294×442 | 144,370 | 96,298 | 3×6 | ya |
| `jalan_besar/ruko_b_sw.png` | 322×352 | 144,280 | 192,208 | 3×6 | ya |
| `jalan_besar/ruko_b_se.png` | 288×352 | 144,280 | 96,208 | 3×6 | ya |
| `jalan_besar/ruko_c_sw.png` | 332×442 | 144,370 | 192,298 | 3×6 | ya |
| `jalan_besar/ruko_c_se.png` | 294×442 | 144,370 | 96,298 | 3×6 | ya |
| `pasar_loak/lapak_tas_sw.png` | 128×180 | 56,152 | 48,124 | 2×1.5 | - |
| `pasar_loak/lapak_tas_se.png` | 112×180 | 56,152 | 64,124 | 2×1.5 | - |
| `pasar_loak/lapak_tas_b_sw.png` | 128×180 | 56,152 | 48,124 | 2×1.5 | - |
| `pasar_loak/lapak_tas_b_se.png` | 112×180 | 56,152 | 64,124 | 2×1.5 | - |
| `pasar_loak/lapak_jam_dinding_sw.png` | 128×180 | 56,152 | 48,124 | 2×1.5 | - |
| `pasar_loak/lapak_jam_dinding_se.png` | 112×180 | 56,152 | 64,124 | 2×1.5 | - |
| `pasar_loak/lapak_aksesori_sw.png` | 128×180 | 56,152 | 48,124 | 2×1.5 | - |
| `pasar_loak/lapak_aksesori_se.png` | 112×180 | 56,152 | 64,124 | 2×1.5 | - |
| `pasar_loak/lapak_jam_tangan_sw.png` | 112×168 | 56,140 | 48,112 | 2×1.5 | - |
| `pasar_loak/lapak_jam_tangan_se.png` | 112×168 | 56,140 | 64,112 | 2×1.5 | - |
| `pasar_loak/lapak_jam_tangan_ne.png` | 112×146 | 56,117 | 48,89 | 2×1.5 | - |
| `pasar_loak/lapak_jam_tangan_nw.png` | 112×146 | 56,117 | 64,89 | 2×1.5 | - |
| `pasar_loak/lapak_mainan_sw.png` | 112×168 | 56,140 | 48,112 | 2×1.5 | - |
| `pasar_loak/lapak_mainan_se.png` | 112×168 | 56,140 | 64,112 | 2×1.5 | - |
| `pasar_loak/lapak_mainan_ne.png` | 112×146 | 56,117 | 48,89 | 2×1.5 | - |
| `pasar_loak/lapak_mainan_nw.png` | 112×146 | 56,117 | 64,89 | 2×1.5 | - |
| `pasar_loak/lapak_barang_bekas_sw.png` | 112×168 | 56,140 | 48,112 | 2×1.5 | - |
| `pasar_loak/lapak_barang_bekas_se.png` | 112×168 | 56,140 | 64,112 | 2×1.5 | - |
| `pasar_loak/lapak_barang_bekas_ne.png` | 112×146 | 56,117 | 48,89 | 2×1.5 | - |
| `pasar_loak/lapak_barang_bekas_nw.png` | 112×146 | 56,117 | 64,89 | 2×1.5 | - |
| `pasar_loak/toko_loak_sw.png` | 264×238 | 120,178 | 112,118 | 4×3.5 | - |
| `pasar_loak/toko_loak_se.png` | 240×238 | 120,178 | 128,118 | 4×3.5 | - |
| `kampung/warung_madura_sw.png` | 214×196 | 96,148 | 96,100 | 3×3 | ya |
| `kampung/warung_madura_se.png` | 192×196 | 96,148 | 96,100 | 3×3 | ya |
| `kampung/rumah_kampung_a_sw.png` | 222×222 | 99,172 | 102,122 | 3×3.2 | - |
| `kampung/rumah_kampung_a_se.png` | 206×222 | 107,172 | 104,122 | 3×3.2 | - |
| `kampung/rumah_kampung_b_sw.png` | 222×222 | 99,172 | 102,122 | 3×3.2 | - |
| `kampung/rumah_kampung_b_se.png` | 206×222 | 107,172 | 104,122 | 3×3.2 | - |
| `kampung/rumah_kampung_c_sw.png` | 232×312 | 99,262 | 102,212 | 3×3.2 | - |
| `kampung/rumah_kampung_c_se.png` | 212×312 | 107,262 | 104,212 | 3×3.2 | - |
| `kampung/rumah_kampung_d_sw.png` | 254×238 | 115,180 | 102,122 | 4×3.2 | - |
| `kampung/rumah_kampung_d_se.png` | 238×238 | 123,180 | 136,122 | 4×3.2 | - |
| `kampung/rumah_kampung_e_sw.png` | 222×222 | 99,172 | 102,122 | 3×3.2 | - |
| `kampung/rumah_kampung_e_se.png` | 206×222 | 107,172 | 104,122 | 3×3.2 | - |
| `kampung/pos_ronda_sw.png` | 128×168 | 64,135 | 64,103 | 2×2 | - |
| `kampung/pos_ronda_se.png` | 128×168 | 64,135 | 64,103 | 2×2 | - |
| `gang/gapura_gang_sw.png` | 116×216 | 58,186 | 20,157 | 3×0.6 | - |
| `gang/gapura_gang_se.png` | 116×216 | 58,186 | 96,157 | 3×0.6 | - |
| `gang/tembok_gang_a_sw.png` | 74×102 | 37,82 | 10,64 | 2×0.3 | - |
| `gang/tembok_gang_a_se.png` | 74×102 | 37,82 | 64,64 | 2×0.3 | - |
| `gang/tembok_gang_b_sw.png` | 74×102 | 37,82 | 10,64 | 2×0.3 | - |
| `gang/tembok_gang_b_se.png` | 74×102 | 37,82 | 64,64 | 2×0.3 | - |
| `gang/lorong_lurus_sw.png` | 192×96 | 96,48 | 128,0 | 2×4 | - |
| `gang/lorong_lurus_se.png` | 192×96 | 96,48 | 64,0 | 2×4 | - |
| `gang/lorong_ujung_sw.png` | 128×128 | 64,96 | 64,64 | 2×2 | - |
| `gang/lorong_ujung_se.png` | 128×128 | 64,96 | 64,64 | 2×2 | - |
| `gang/lorong_tikungan_sw.png` | 128×64 | 64,32 | 64,0 | 2×2 | - |
| `gang/lorong_tikungan_se.png` | 128×64 | 64,32 | 64,0 | 2×2 | - |
| `props/tiang_listrik_sw.png` | 46×238 | 16,232 | 16,216 | 1×1 | - |
| `props/tiang_listrik_se.png` | 48×238 | 28,232 | 28,216 | 1×1 | - |
| `props/tiang_trafo_sw.png` | 46×238 | 16,232 | 16,216 | 1×1 | - |
| `props/tiang_trafo_se.png` | 48×238 | 28,232 | 28,216 | 1×1 | - |
| `props/kabel_4_sw.png` | 128×82 | 64,260 | 16,220 | 4×1 | - |
| `props/kabel_4_se.png` | 128×82 | 64,259 | 112,219 | 4×1 | - |
| `props/bangku_plastik_merah_sw.png` | 20×34 | 8,30 | 8,14 | 1×1 | - |
| `props/bangku_plastik_merah_se.png` | 20×34 | 8,30 | 8,14 | 1×1 | - |
| `props/bangku_plastik_merah_ne.png` | 20×34 | 8,30 | 8,14 | 1×1 | - |
| `props/bangku_plastik_merah_nw.png` | 20×34 | 8,30 | 8,14 | 1×1 | - |
| `props/bangku_plastik_biru_sw.png` | 20×34 | 8,30 | 8,14 | 1×1 | - |
| `props/bangku_plastik_biru_se.png` | 20×34 | 8,30 | 8,14 | 1×1 | - |
| `props/bangku_plastik_biru_ne.png` | 20×34 | 8,30 | 8,14 | 1×1 | - |
| `props/bangku_plastik_biru_nw.png` | 20×34 | 8,30 | 8,14 | 1×1 | - |
| `props/kardus_tumpuk_sw.png` | 28×60 | 14,54 | 14,38 | 1×1 | - |
| `props/kardus_tumpuk_se.png` | 30×60 | 12,52 | 12,36 | 1×1 | - |
| `props/motor_parkir_hitam_sw.png` | 54×60 | 23,52 | 7,28 | 2×1 | - |
| `props/motor_parkir_hitam_se.png` | 56×50 | 24,43 | 40,19 | 2×1 | - |
| `props/motor_parkir_hitam_ne.png` | 56×60 | 24,52 | 8,28 | 2×1 | - |
| `props/motor_parkir_hitam_nw.png` | 54×50 | 23,43 | 39,19 | 2×1 | - |
| `props/motor_parkir_merah_sw.png` | 54×60 | 23,52 | 7,28 | 2×1 | - |
| `props/motor_parkir_merah_se.png` | 56×50 | 24,43 | 40,19 | 2×1 | - |
| `props/motor_parkir_merah_ne.png` | 56×60 | 24,52 | 8,28 | 2×1 | - |
| `props/motor_parkir_merah_nw.png` | 54×50 | 23,43 | 39,19 | 2×1 | - |
| `props/pedagang_duduk_a_sw.png` | 30×86 | 12,77 | 12,61 | 1×1 | - |
| `props/pedagang_duduk_a_se.png` | 26×86 | 10,79 | 10,63 | 1×1 | - |
| `props/pedagang_duduk_a_ne.png` | 26×82 | 10,76 | 10,60 | 1×1 | - |
| `props/pedagang_duduk_a_nw.png` | 30×82 | 12,77 | 12,61 | 1×1 | - |
| `props/pedagang_duduk_b_sw.png` | 30×86 | 12,77 | 12,61 | 1×1 | - |
| `props/pedagang_duduk_b_se.png` | 26×86 | 10,79 | 10,63 | 1×1 | - |
| `props/pedagang_duduk_b_ne.png` | 26×82 | 10,76 | 10,60 | 1×1 | - |
| `props/pedagang_duduk_b_nw.png` | 30×82 | 12,77 | 12,61 | 1×1 | - |
| `props/rak_gantung_tas_sw.png` | 40×120 | 20,109 | 14,96 | 1×0.6 | - |
| `props/rak_gantung_tas_se.png` | 40×120 | 20,109 | 26,96 | 1×0.6 | - |
| `props/papan_jam_dinding_sw.png` | 40×120 | 20,109 | 14,96 | 1×0.6 | - |
| `props/papan_jam_dinding_se.png` | 40×120 | 20,109 | 26,96 | 1×0.6 | - |
| `props/nampan_jam_tangan_sw.png` | 40×52 | 20,41 | 20,25 | 1×1 | - |
| `props/nampan_jam_tangan_se.png` | 40×52 | 20,41 | 20,25 | 1×1 | - |
| `props/meja_mainan_sw.png` | 40×48 | 20,38 | 20,22 | 1×1 | - |
| `props/meja_mainan_se.png` | 40×48 | 20,38 | 20,22 | 1×1 | - |
| `props/terpal_biru_sw.png` | 106×170 | 53,144 | 45,116 | 2×1.5 | - |
| `props/terpal_biru_se.png` | 106×170 | 53,144 | 61,116 | 2×1.5 | - |
| `props/terpal_merah_sw.png` | 106×170 | 53,144 | 45,116 | 2×1.5 | - |
| `props/terpal_merah_se.png` | 106×170 | 53,144 | 61,116 | 2×1.5 | - |
| `props/terpal_oranye_sw.png` | 106×170 | 53,144 | 45,116 | 2×1.5 | - |
| `props/terpal_oranye_se.png` | 106×170 | 53,144 | 61,116 | 2×1.5 | - |
| `props/pot_tanaman_sw.png` | 28×48 | 13,43 | 13,27 | 1×1 | - |
| `props/pot_tanaman_se.png` | 28×48 | 13,43 | 13,27 | 1×1 | - |
| `props/jemuran_sw.png` | 58×88 | 30,72 | 6,52 | 2×0.5 | - |
| `props/jemuran_se.png` | 58×88 | 28,72 | 52,52 | 2×0.5 | - |
| `sinyal/lampu_pejalan_merah_sw.png` | 28×156 | 14,151 | 14,135 | 1×1 | ya |
| `sinyal/lampu_pejalan_merah_se.png` | 26×156 | 10,151 | 10,135 | 1×1 | ya |
| `sinyal/lampu_pejalan_merah_ne.png` | 24×156 | 10,152 | 10,136 | 1×1 | ya |
| `sinyal/lampu_pejalan_merah_nw.png` | 26×158 | 12,153 | 12,137 | 1×1 | ya |
| `sinyal/lampu_pejalan_hijau_sw.png` | 28×156 | 14,151 | 14,135 | 1×1 | ya |
| `sinyal/lampu_pejalan_hijau_se.png` | 26×156 | 10,151 | 10,135 | 1×1 | ya |
| `sinyal/lampu_pejalan_hijau_ne.png` | 24×156 | 10,152 | 10,136 | 1×1 | - |
| `sinyal/lampu_pejalan_hijau_nw.png` | 26×158 | 12,153 | 12,137 | 1×1 | - |
| `sinyal/lampu_pejalan_hijau_kedip_off_sw.png` | 28×156 | 14,151 | 14,135 | 1×1 | - |
| `sinyal/lampu_pejalan_hijau_kedip_off_se.png` | 26×156 | 10,151 | 10,135 | 1×1 | - |
| `sinyal/lampu_pejalan_hijau_kedip_off_ne.png` | 24×156 | 10,152 | 10,136 | 1×1 | - |
| `sinyal/lampu_pejalan_hijau_kedip_off_nw.png` | 26×158 | 12,153 | 12,137 | 1×1 | - |
| `sinyal/lampu_pejalan_padam_sw.png` | 28×156 | 14,151 | 14,135 | 1×1 | - |
| `sinyal/lampu_pejalan_padam_se.png` | 26×156 | 10,151 | 10,135 | 1×1 | - |
| `sinyal/lampu_pejalan_padam_ne.png` | 24×156 | 10,152 | 10,136 | 1×1 | - |
| `sinyal/lampu_pejalan_padam_nw.png` | 26×158 | 12,153 | 12,137 | 1×1 | - |
| `sinyal/lampu_lalin_merah_sw.png` | 58×202 | 10,198 | 10,182 | 1×1 | ya |
| `sinyal/lampu_lalin_merah_se.png` | 62×220 | 10,215 | 10,199 | 1×1 | ya |
| `sinyal/lampu_lalin_merah_ne.png` | 66×220 | 48,215 | 48,199 | 1×1 | - |
| `sinyal/lampu_lalin_merah_nw.png` | 66×202 | 48,198 | 48,182 | 1×1 | - |
| `sinyal/lampu_lalin_kuning_sw.png` | 58×202 | 10,198 | 10,182 | 1×1 | ya |
| `sinyal/lampu_lalin_kuning_se.png` | 62×220 | 10,215 | 10,199 | 1×1 | ya |
| `sinyal/lampu_lalin_kuning_ne.png` | 66×220 | 48,215 | 48,199 | 1×1 | - |
| `sinyal/lampu_lalin_kuning_nw.png` | 66×202 | 48,198 | 48,182 | 1×1 | - |
| `sinyal/lampu_lalin_hijau_sw.png` | 58×202 | 10,198 | 10,182 | 1×1 | ya |
| `sinyal/lampu_lalin_hijau_se.png` | 62×220 | 10,215 | 10,199 | 1×1 | ya |
| `sinyal/lampu_lalin_hijau_ne.png` | 66×220 | 48,215 | 48,199 | 1×1 | - |
| `sinyal/lampu_lalin_hijau_nw.png` | 66×202 | 48,198 | 48,182 | 1×1 | - |

## Warna
Audit semua piksel opak (dasar + glow): **103 warna**. 97 di antaranya tertulis di index.html / style sheet. **6 tidak ada di sana, tetapi semuanya sudah dipakai dan dilaporkan di `street_vehicles` (masih menunggu sign-off AD):** `#2E3B52`, `#4F6A86` (ramp kaca), `#3F7FE0`, `#1A3F87` (biru TJ, dipakai untuk biru BCA/Indomaret), `#154E4B` (hijau tua lampu padam), `#1D5E80` (pintu Blue Doors). **Tidak ada hex yang benar-benar baru.** Rinciannya ada di `_work/colours.json`.

## Keterbatasan (jujur)
- **Merek dagang:** Indomaret (pita biru/merah/kuning + tulisan INDOMARET), BCA (papan biru "BCA", "BANK BCA", "ATM"), dan Blue Doors (tulisan + pintu biru) adalah **pendekatan piksel memakai font 3×5 game**, bukan logo resmi. Logo asli tidak ditiru per piksel. **Perlu keputusan user** apakah merek asli boleh dipakai di game; kalau tidak, cukup ganti teks (misal "INDOMART-KU", "BANK KS", "PINTU BIRU") di `roadside.py`. FamilyMart di game sudah memakai nama merek, jadi preseden sudah ada, tapi tetap keputusan user.
- Nama fiktif: MENARA SIRIH, GRAHA KS, HOTEL SIRIH, SIRIH MALL, MASJID AL-IKHLAS, GG. SIRIH II RT 005/RW 02.
- Untuk kamera game yang sekarang, muka gedung seberang menghadap ne dan tidak terlihat (lihat bagian sisi seberang). Sprite ini cocok untuk "kamera seberang" yang diputar 180°, atau untuk area/scene terpisah. Varian punggung gedung belum dibuat.
- Di lorong yang mengarah kanan-atas, gedung di sisi kanan (ruko_b) menutupi lapak sisi kanan di mock jalan. Ini konsekuensi sudut iso. Close-up lorong memakai susunan tanpa ruko tinggi di kanan agar lapak kedua sisi terbaca. Lapak sisi kanan sengaja rendah (barang terbaca dari atas).
- Pedagang = figur kotak sederhana (bukan avatar v6b). Ganti dengan NPC nanti.
- Teks kecil (3×5) di papan kecil (pos ronda, tembok "SEDOT WC", tiang "TERIMA/JUAL/BELI") hanya terbaca di 4x. Teks utama (INDOMARET, BCA, LOAK, WARUNG MADURA, GG. SIRIH II, PASAR LOAK) terbaca di 1x-2x.
- Zebra cross tidak dibuat ulang karena sudah ada di game. Kabel di mock digambar sebagai garis; sprite `kabel_4` hanya untuk segmen 4 sel.
- Lampu: belum ada angka hitung mundur. Lampu kendaraan dibuat sebagai pelengkap.
- Render malam = preview saja (gelap-biru + glow additive). Warnanya tidak dimaksudkan sebagai aset.


## Pembaruan 1 Nov 2026 (PREVIEW, belum di-deploy)

* **Indomaret v2** (`jalan_besar/indomaret_sw/_se/__glow`) ditimpa sesuai foto: papan kayu cokelat dengan garis merah/biru/kuning, papan logo kotak, kanopi baja hitam, fasad kaca berlampu, kursi/meja plastik hitam di teras, satu lantai tinggi. **Ukuran & pivot berubah** (lihat tabel di atas: sekarang 410×344 / 384×344, pivot 192,248; dulu 418×400 / 384×400, pivot 192,304) – game yang memakai pivot lama perlu ikut menyesuaikan sebelum dipakai.
  Versi lama disimpan di `jalan_besar/_prev_indomaret_v1/` (png + `__glow`, kode `roadside_indomaret_v1.py`, entri manifest `manifest_entries_v1.json`).
* **Motor parkir matic** baru, grup `parkir`, folder `parkir/`: `motor_matic_{hitam,merah,biru,putih,abu}_{sw,se,ne,nw}.png` (kode `_work/parkir.py`, footprint 2×1).
* `_work/build_partial.py <nama…>` membangun ulang aset tertentu dan menggabungkan entrinya ke `manifest.json` tanpa menjalankan `produce.py` penuh.
* Mock: `previews/mock_depan_indomaret_4x.png` (`_work/mock_indomaret.py`, koordinat kamera seberang/diputar 180°) dengan kang parkir (`../npc_kang_parkir`), motor, dan pemuda Golda (`../npc_pemuda_golda`).
* Alpha: sprite 0/56/255; file `__glow` tetap memakai mask alpha 90 seperti semua glow lain.

| file | ukuran | pivot | anchor_n | footprint | glow |
|---|---|---|---|---|---|
| `parkir/motor_matic_hitam_sw.png` | 54×68 | 22,60 | 6,36 | 2×1 | - |
| `parkir/motor_matic_hitam_se.png` | 54×54 | 23,46 | 39,22 | 2×1 | - |
| `parkir/motor_matic_hitam_ne.png` | 54×62 | 23,55 | 7,31 | 2×1 | - |
| `parkir/motor_matic_hitam_nw.png` | 54×50 | 22,43 | 38,19 | 2×1 | - |
| `parkir/motor_matic_merah_sw.png` | 54×68 | 22,60 | 6,36 | 2×1 | - |
| `parkir/motor_matic_merah_se.png` | 54×54 | 23,46 | 39,22 | 2×1 | - |
| `parkir/motor_matic_merah_ne.png` | 54×62 | 23,55 | 7,31 | 2×1 | - |
| `parkir/motor_matic_merah_nw.png` | 54×52 | 22,44 | 38,20 | 2×1 | - |
| `parkir/motor_matic_biru_sw.png` | 54×68 | 22,60 | 6,36 | 2×1 | - |
| `parkir/motor_matic_biru_se.png` | 54×54 | 23,46 | 39,22 | 2×1 | - |
| `parkir/motor_matic_biru_ne.png` | 54×62 | 23,55 | 7,31 | 2×1 | - |
| `parkir/motor_matic_biru_nw.png` | 54×50 | 22,43 | 38,19 | 2×1 | - |
| `parkir/motor_matic_putih_sw.png` | 54×68 | 22,60 | 6,36 | 2×1 | - |
| `parkir/motor_matic_putih_se.png` | 54×54 | 23,46 | 39,22 | 2×1 | - |
| `parkir/motor_matic_putih_ne.png` | 54×62 | 23,55 | 7,31 | 2×1 | - |
| `parkir/motor_matic_putih_nw.png` | 54×52 | 22,44 | 38,20 | 2×1 | - |
| `parkir/motor_matic_abu_sw.png` | 54×68 | 22,60 | 6,36 | 2×1 | - |
| `parkir/motor_matic_abu_se.png` | 54×54 | 23,46 | 39,22 | 2×1 | - |
| `parkir/motor_matic_abu_ne.png` | 54×62 | 23,55 | 7,31 | 2×1 | - |
| `parkir/motor_matic_abu_nw.png` | 54×50 | 22,43 | 38,19 | 2×1 | - |


## Jalan tambahan (jalan lokal) – kamera standar, tanpa rotasi (PREVIEW, 1 Nov 2026)

Permintaan user: kamera jangan diputar; gedung seberang tetap tampak depan seperti gedung yang sudah ada, dengan jalan tambahan di depannya.

### Keputusan penempatan (dari index.html OUTSIDE, tidak diedit)
- Kamera game hanya melihat bidang yang menghadap **+r (sw)** dan **+c (se)**. Sisi seberang (r 37.7..44.7) ada di antara jalan raya dan kamera, jadi muka yang menghadap jalan raya (−r) tidak pernah terlihat.
- **Solusi:** gedung seberang memakai varian `_sw` (muka ke +r = ke kamera). Lot tetap **r 37.7..44.7**, semua muka berada di garis **r 44.7**, dan bagian belakang di r 37.7 (gedung yang kedalamannya kurang dari 7 menyisakan halaman servis di belakang).
- **Jalan lokal baru: r 44.7..48.7** di depan muka gedung. Penampang: trotoar 44.7..45.55, kerb 45.55..45.7, aspal 45.7..48.0 (marka tengah putih putus-putus), kerb 48.0..48.15, trotoar luar 48.15..48.65, bibir 48.65..48.7. Jalan memanjang sepanjang c (c −29.5..43.5), sejajar jalan raya.
- **Gang loak:** lorong c 22..24 tetap menghubungkan zebra jalan raya (c 21.2..23.9) dengan jalan lokal. Gapura dipindah ke ujung jalan lokal (23, 44.4) supaya papannya menghadap kamera. Di ujung itu ada `simpang_gang` + `zebra`. Lapak di kedua sisi lorong; sisi c kecil `_se`, sisi c besar `_nw` (punggung).
  **Konflik:** toko loak dan lapak yang dulu berada di r 46.45..51.7 sekarang tertimpa jalan lokal. Usulannya, toko loak dipindah ke dalam lorong r 37.7..44.7 atau ke seberang jalan lokal (r ≥ 48.7).
- **Ujung deretan:** jalan lokal berbelok ke jalan raya lewat jalan samping (`tikungan_*_ke_raya` + `lurus_se/nw` + `mulut_sw/ne`, kerb jalan raya diturunkan). Mock memberi contoh di c 37.5..41.5; kantor_b perlu digeser ke c ≥ 41.5 atau dibuang.

### Konsekuensi untuk jalan raya
- **Yang terlihat dari sisi jalan raya:** atap datar + parapet, unit AC/toren, dan dinding samping +c tiap gedung. Dinding belakang (−r) tidak pernah digambar oleh kamera ini. Lot di belakang gedung yang dangkal (mis. kafe D5: r 37.7..39.7) tampak sebagai lantai servis (cor). Pagar belakang belum dibuat; bila dibuat, yang terlihat hanya sisi +r-nya (menghadap halaman belakang) dan tutupnya.
- **Oklusi:** gedung seberang berada lebih dekat ke kamera, jadi gambarnya naik ke atas layar dan **menutupi jalan raya**. Kolom "menutup sampai r" di tabel menunjukkan baris tanah tertinggi (pada garis vertikal lewat pusat gedung) yang masih tertutup puncak sprite:

| gedung (_sw) | c | r lot | pasang di (c, r) | menutup sampai |
|---|---|---|---|---|
| indomaret | -9.5 .. -3.5 | 38.7 .. 44.7 | (-6.5, 41.70) | r ≈ 33.95 |
| kafe_blue_doors | -3.5 .. 1.5 | 39.7 .. 44.7 | (-1.0, 42.20) | r ≈ 33.58 |
| bank_bca | 1.5 .. 7.5 | 38.7 .. 44.7 | (4.5, 41.70) | r ≈ 29.33 |
| kantor_a | 7.5 .. 14.5 | 38.7 .. 44.7 | (11.0, 41.70) | r ≈ 23.33 |
| ruko_c | 14.5 .. 17.5 | 38.7 .. 44.7 | (16.0, 41.70) | r ≈ 30.14 |
| ruko_b | 17.5 .. 20.5 | 38.7 .. 44.7 | (19.0, 41.70) | r ≈ 32.95 |
| ruko_a | 25.5 .. 28.5 | 38.7 .. 44.7 | (27.0, 41.70) | r ≈ 30.14 |
| masjid | 28.5 .. 37.5 | 37.7 .. 44.7 | (33.0, 41.20) | r ≈ 31.79 |

  Indomaret dan kafe menutup lajur nw (r 34.85) dan trotoar seberang; ruko_b hampir seluruh aspal. BCA, ruko_a/c, dan masjid menutup seluruh jalan raya sampai trotoar dekat. kantor_a (5 lt) menutup sampai halaman dan muka kantor (r ≈ 23). Di game perlu salah satu: (a) kelas `occf` (opacity .3) dipasang juga pada gedung seberang, (b) gedung tinggi diganti versi rendah, atau (c) deretan seberang hanya digambar saat kamera di bawah.
- **Batas kamera:** `updateCam` memakai WB.y1 = 680, jadi hanya c+r ≤ 76.25 yang bisa tampil. Jalan lokal (r sampai 48.7) hanya terlihat untuk c ≤ 27.5. Agar seluruh deretan sampai c 43.5 bisa terlihat, y1 perlu sekitar 830. Pemain tidak bisa berjalan ke sana (halaman r ≤ 32.35), jadi jalan lokal hanya terlihat saat zoom-out/fit atau di tepi bawah layar.
- Pohon seberang yang sekarang ada di r 38.6 dan 41.2 masuk ke lot gedung dan perlu dibuang pada rentang c gedung. Halte (3.0, 36.75) tetap di trotoar seberang.

### Aset `jalan_lokal/` (grup `lokal`, `_work/jalan_lokal.py`, alpha 0/255, 0 hex baru)
`lurus`, `parkir` (3 petak motor + huruf P), `zebra`, `simpang_gang`, `mulut` masing-masing 4 arah. Untuk modul 2×4 (`lurus`, `parkir`, `zebra`, `simpang_gang`): `_sw` = memanjang +c dengan sisi gedung di r kecil, `_se` = memanjang r dengan sisi gedung di c kecil, `_ne`/`_nw` = sisi gedung dibalik. `mulut` (4×1) terbalik: `_sw/_ne` untuk jalan samping yang memanjang r, `_se/_nw` untuk yang memanjang c. Tikungan 4×4 hanya `_sw`, ada empat varian: `kanan_ke_raya` (dari −c belok ke −r), `kiri_ke_raya` (dari +c ke −r), `kanan_ke_belakang`, `kiri_ke_belakang`.

| file | ukuran | pivot | footprint |
|---|---|---|---|
| `jalan_lokal/jalan_lokal_lurus_sw.png` | 192×96 | 96,48 | 2×4 |
| `jalan_lokal/jalan_lokal_lurus_se.png` | 192×96 | 96,48 | 2×4 |
| `jalan_lokal/jalan_lokal_lurus_ne.png` | 192×96 | 96,48 | 2×4 |
| `jalan_lokal/jalan_lokal_lurus_nw.png` | 192×96 | 96,48 | 2×4 |
| `jalan_lokal/jalan_lokal_parkir_sw.png` | 192×96 | 96,48 | 2×4 |
| `jalan_lokal/jalan_lokal_parkir_se.png` | 192×96 | 96,48 | 2×4 |
| `jalan_lokal/jalan_lokal_parkir_ne.png` | 192×96 | 96,48 | 2×4 |
| `jalan_lokal/jalan_lokal_parkir_nw.png` | 192×96 | 96,48 | 2×4 |
| `jalan_lokal/jalan_lokal_zebra_sw.png` | 192×96 | 96,48 | 2×4 |
| `jalan_lokal/jalan_lokal_zebra_se.png` | 192×96 | 96,48 | 2×4 |
| `jalan_lokal/jalan_lokal_zebra_ne.png` | 192×96 | 96,48 | 2×4 |
| `jalan_lokal/jalan_lokal_zebra_nw.png` | 192×96 | 96,48 | 2×4 |
| `jalan_lokal/jalan_lokal_simpang_gang_sw.png` | 192×96 | 96,48 | 2×4 |
| `jalan_lokal/jalan_lokal_simpang_gang_se.png` | 192×96 | 96,48 | 2×4 |
| `jalan_lokal/jalan_lokal_simpang_gang_ne.png` | 192×96 | 96,48 | 2×4 |
| `jalan_lokal/jalan_lokal_simpang_gang_nw.png` | 192×96 | 96,48 | 2×4 |
| `jalan_lokal/jalan_lokal_mulut_sw.png` | 160×80 | 80,40 | 4×1 |
| `jalan_lokal/jalan_lokal_mulut_se.png` | 160×80 | 80,40 | 4×1 |
| `jalan_lokal/jalan_lokal_mulut_ne.png` | 160×80 | 80,40 | 4×1 |
| `jalan_lokal/jalan_lokal_mulut_nw.png` | 160×80 | 80,40 | 4×1 |
| `jalan_lokal/jalan_lokal_tikungan_kanan_ke_raya_sw.png` | 256×128 | 128,64 | 4×4 |
| `jalan_lokal/jalan_lokal_tikungan_kiri_ke_raya_sw.png` | 256×128 | 128,64 | 4×4 |
| `jalan_lokal/jalan_lokal_tikungan_kanan_ke_belakang_sw.png` | 256×128 | 128,64 | 4×4 |
| `jalan_lokal/jalan_lokal_tikungan_kiri_ke_belakang_sw.png` | 256×128 | 128,64 | 4×4 |

Mock: `previews/mock_jalan_tambahan_4x.png` (`_work/mock_jalan_tambahan.py`, kamera standar). Tata letak usulan juga ada di `manifest.json → jalan_lokal_layout`.

## Mock gabungan dengan scene game yang sudah ada (PREVIEW, 1 Nov 2026)
- `previews/mock_gabungan_scene_{1x,2x,4x,overview}.png`: jujur (gedung seberang menutupi jalan raya apa adanya).
- `previews/mock_gabungan_scene_occf_{1x,2x,4x,overview}.png`: gedung tinggi seberang (kantor_a, BCA, masjid, ditambah hotel dan mall) digambar 30 % seperti `.occf.occl` di game.
- 1x = 3100×2040 (2 px per unit game = skala sprite), 4x = 12400×8160, overview = setengah 1x.
- Isi scene existing berasal dari render game sendiri: `_work/capture_game_outside.py` (Chrome headless, `goOutside()`, kamera dibekukan pada rect dunia x −690..860, y −200..820, HUD dan avatar HTML disembunyikan) → `_work/_game_outside_1x.png`. `index.html` di disk tidak diubah; halaman disajikan dari memori dengan satu baris tambahan (`window.__dbg`). Pohon seberang di r ≥ 37.7 (42 grup `occf vegt`) dibuang di DOM saja.
- Lapisan usulan ditambahkan oleh `_work/mock_gabungan.py [occf]`: lot + jalan lokal, deretan `_sw` (mall, hotel, Indomaret, kafe, BCA, kantor_a, ruko_c/b, gang, ruko_a, masjid), jalan samping di c 37.5..41.5 (kantor_b tidak dipasang), Indomaret dengan 5 motor/kang parkir/pemuda, gang dengan lapak dan 2 babeh, serta lampu pejalan `sinyal/` di zebra yang sudah ada.


## mock_gabungan_v2: pengalaman pemain tidak terganggu (PREVIEW, 1 Nov 2026)
File: `previews/mock_gabungan_v2_{overview,1x,2x,4x}.png`. Kode: `_work/mock_gabungan_v2.py`, render game `_work/_game_outside_v2_1x.png` (`capture_game_outside.py <out> -930 -200 1790 1110`), hasil cek `_work/_mock_gabungan_v2_coverage.json`.

**Geometri (kamera standar):** sprite di (c,r) dengan tinggi z px menutup layar ke atas sampai baris tanah r − z/32 pada kolom yang sama. Artinya, makin **dekat** gedung ke jalan raya, makin banyak jalan yang ditutup. "Barisan belakang jauh dari kamera" di sisi seberang berarti lebih dekat ke jalan raya, jadi justru lebih buruk. Gedung tinggi hanya aman jika lot-nya digeser **menjauh dari jalan raya** (r besar) atau gedungnya dipendekkan. Aturan yang dipakai: semua sprite seberang hanya boleh menutup sampai **r ≥ 36.55** (kerb seberang), dan dicek per piksel (`coverage()`).

**Tata letak v2:** muka deretan di **r 51.0**, jalan lokal r 51.0..55.0. Di antara trotoar seberang (37.7) dan belakang lot ada sabuk rumput 4–6 tile (bukan 2–3; 2–3 tile hanya cukup untuk gedung 1 lantai). Gedung tinggi diganti varian 2 lantai baru di `jalan_besar/pendek/` (kantor_a, bank_bca, hotel, mall, ruko_a, ruko_c; `_sw/_se`, 0 hex baru). Indomaret, kafe, dan masjid asli. Masjid tepat di batas (puncak menara r 36.55).
Indomaret punya halaman paving 2.5 tile di dalam lot dengan petak motor (garis putih) dan jalur ke pintu. Motor dan kang parkir ada di halaman, pemuda di teras. Toko Loak (`toko_loak_se`) ada di sisi kiri lorong (c 18..21.5, r F−4.5..F−0.5) dengan babeh pemilik + etalase; ruko_b dilepas untuk memberi tempat. Lapak + 2 babeh di sepanjang lorong, lorong menembus sabuk rumput sampai zebra.

Sprite yang paling dekat batas:
| sprite | menutup sampai r |
|---|---|
| masjid_sw @(33.00,47.50) | 36.55 |
| lapak_jam_dinding_se @(21.25,42.50) | 37.65 |
| indomaret_sw @(-6.50,45.50) | 37.74 |
| mall_pendek_sw @(-23.50,47.50) | 37.87 |
| hotel_pendek_sw @(-13.50,48.00) | 38.3 |
| kantor_a_pendek_sw @(11.00,48.00) | 38.3 |
| bank_bca_pendek_sw @(4.50,48.00) | 38.43 |
| ruko_c_pendek_sw @(16.00,48.00) | 38.49 |

**Efek ke pemain:** pemain hanya bisa berjalan di halaman r ≤ 32.35. Di zoom default desktop (4 px/unit, layar ±1440×856) kamera mengikuti pemain dan batas bawah layar ada sekitar r 37.5 pada kolom yang sama. Jadi deretan baru hampir tidak terlihat saat bermain normal (paling hanya pinggir atap di tepi bawah), dan jalan raya/zebra/karakter tidak tertutup sama sekali. Di 1x (HP) batas bawah sekitar r 42: sabuk rumput dan lapak gang terlihat, muka toko belum. Muka toko + jalan lokal hanya terlihat dalam mode fit/zoom-out, dan untuk itu batas kamera perlu dibesarkan: **WB.y1 680 → sekitar 880, WB.x0 −430 → sekitar −910**. Akibatnya mode fit jadi lebih kecil skalanya, dan di ujung kanan (warteg, c ≈ 35) clamp kamera bawah (sekarang menggeser ~12 unit) tidak lagi aktif. occf 30% tidak diperlukan karena tidak ada yang menutupi jalan; bisa tetap disiapkan untuk NPC/pemain di sisi seberang bila nanti sisi itu bisa dijelajahi.


## mock_gabungan_v3: area loak ramai + zebra diperbaiki (PREVIEW, 1 Nov 2026)
File: `previews/mock_gabungan_v3_{overview,1x,2x,4x}.png`, close-up `previews/mock_loak_v3_4x.png`. Kode: `_work/mock_gabungan_v3.py`. Render game: `_work/_game_outside_v3_1x.png` (`ZEBRA_FIX=1 python3 capture_game_outside.py <out> -930 -200 1790 1110`). Hasil cek tutupan: `_work/_mock_gabungan_v3_coverage.json` (0 pelanggaran).
Keputusan v2 tetap: gedung pendek, jalan lokal di r 51..55, parkir Indomaret di halaman. ruko_c_pendek dan ruko_a_pendek dilepas, sehingga kampung loak menempati c 14.5..28.5, r 39..51 (lantai cor gang). Isinya:
- **Lorong:** c 22..24 menembus dari zebra jalan raya sampai jalan lokal. Gapura ada di mulut jalan lokal.
- **Sisi kiri:** Toko Loak (`_se`, menghadap lorong) + etalase, lalu lapak tas, jam dinding, aksesori. Babeh pemilik berdiri di depan toko karena di posisi meja ia tertutup balok gapura. Babeh tas dan babeh jam ada di lapak masing-masing.
- **Sisi kanan:** lapak jam tangan, mainan, barang bekas (`_nw`), motor merah, kardus.
- **Mulut gang:** lapak tas_b menghadap jalan lokal, motor hitam di trotoar dekat gapura.
- **Sekitar:** warung madura di sisi kiri mulut, rumah kampung e dan d di belakangnya, pos ronda + jemuran + rumah kampung a di kanan.
- **Utilitas:** 2 tiang listrik dengan kabel di atas lorong, dan kabel ke deretan kantor.
- Pedagang kotak lama yang ditanam di lapak (tas_b, jam dinding, jam tangan, barang bekas) dimatikan di memori, seperti di mock_lorong_babeh. Aset di disk tidak diubah.
Keterbatasan kamera standar: benda di sisi kanan lorong (c lebih besar) menutupi sebagian lapak `_nw` di kanan. Lapak tinggi tidak bisa berdiri lebih dekat ke jalan raya dari r ±41.5 (atapnya akan menutupi kerb seberang), jadi sisi kiri muat toko + 3 lapak, dan lapak ke-4 (tas_b) dipindah ke mulut gang.

| sprite (paling dekat batas 36.55) | menutup sampai r |
|---|---|
| masjid_sw @(33.00,47.50) | 36.55 |
| rumah_kampung_d_sw @(16.60,41.40) | 36.71 |
| tiang_listrik_se @(24.15,44.15) | 36.74 |
| lapak_aksesori_se @(21.25,41.60) | 36.76 |
| kabel_0 | 37.06 |
| indomaret_sw @(-6.50,45.50) | 37.74 |
| mall_pendek_sw @(-23.50,47.50) | 37.87 |

### Zebra cross: arah strip dibetulkan
Referensi foto (Jakarta): strip putih memanjang **sejajar arah lalu lintas** dan berjajar melintang jalan, sehingga pejalan menyeberang tegak lurus terhadap panjang strip.
- **Aset kita:** `jalan_lokal_zebra_*` dan `jalan_lokal_simpang_gang_*` di `_work/jalan_lokal.py` sudah dibalik: 5 strip LITE sepanjang x (arah jalan) berjajar melintang d.
  - Ditemukan juga bug: `S()` dari `section()` tidak menulis ke larik yang dikembalikan. Akibatnya marka tambahan (zebra, ramp kuning, garis petak & huruf P pada `jalan_lokal_parkir`) tidak pernah tergambar di png lama. Sudah diperbaiki: S menulis in-place, dan `jalan_lokal_parkir_*` sekarang benar-benar punya garis petak.
  - `jalan_lokal_mulut_*` tidak punya zebra (tidak perlu diubah).
  - Mock lama (mock_jalan_tambahan, mock_gabungan_scene, v2) belum dirender ulang dan masih memakai tile lama.
- **Game existing (index.html, baris zebra di blok "ground ... zebra"):** strip saat ini melintang jalan (memanjang arah r, berjajar arah c), jadi **kebalik**. Perlu dibalik oleh Baymax (urusan game, belum diubah):
  - sekarang: `for(let c=21.2;c<23.9;c+=0.6) el('polygon',{points:quad(c,32.98,c+0.32,36.07),...},g);`
  - usulan: `for(let r=33.1;r<35.7;r+=0.5) el('polygon',{points:quad(21.2,r,23.9,r+0.28),fill:'#F7F4EE',stroke:'#C7CFDC','stroke-width':0.4},g);`
  - Mock v3 sudah memakai versi usulan ini, disisipkan hanya di memori saat capture. index.html di disk tidak diubah.


## mock_gabungan_v4: taman di lahan kosong sisi seberang (PREVIEW, 1 Nov 2026)
File: `previews/mock_gabungan_v4_{overview,1x,2x,4x}.png`, close-up `previews/mock_taman_v4_4x.png`. Kode: `_work/mock_gabungan_v4.py` (memakai v3 apa adanya + `layout()` taman), aset `_work/taman.py`. Hasil cek tutupan: `_work/_mock_gabungan_v4_coverage.json`.

**Aset baru di `taman/`** (palet engine, 0 hex baru; alpha 0/56/255, hanya `lampu_taman_*__glow.png` ber-alpha 90 seperti glow lain):
- `bangku_taman_{sw,se,ne,nw}`: bilah kayu, rangka besi hitam; ne/nw = dilihat dari belakang
- `lampu_taman_{sw,se}` (+ `__glow`)
- `tong_sampah_{sw,se}`: bak hijau organik + kuning anorganik
- `meja_taman_{sw,se}`: meja + 4 bangku bulat beton
- `pergola_{sw,se}`: kayu terbuka, tanpa tanaman rambat, 2 bangku
- `gazebo_{sw,se}`: lantai panggung, bangku keliling, atap genteng pelana
- ground: `jalur_paving_lurus_{sw,se}`, `jalur_paving_simpang_{sw,se}`, `plaza_paving_{sw,se}` (4×4)
Juga baru di `props/`: `tiang_listrik_polos_{sw,se}` (tiang tanpa ujung kabel menjuntai).

**Tata letak:**
- **Seberang jalan lokal (r 55..72):** promenade paving di r 56..58 sepanjang jalan lokal. Lampu dan bangku (menghadap promenade) + tong sampah ada di jalur hijau r 55..56, dan bangku di seberang promenade.
  - 4 jalur silang (c −20, −4, 12, 28), masing-masing dengan plaza 4×4: meja taman, gazebo, pergola, meja taman.
  - Pohon Kebon Sirih tanpa jenis berbunga (asam, trembesi, angsana, mahoni, ketapang kencana, beringin, kiara payung, palem raja, glodokan).
  - Rumput: 1515 tile `vegetation_kebonsirih/tiles` acak berbobot + 420 tuft/overlay. Tanpa bunga, tanpa semak.
- **Sabuk di belakang lot (antara trotoar seberang dan belakang lot):** hanya jalur paving r 38.2..40.2. Di kamera standar sabuk ini tertutup deretan gedung. Bangku dan lampu yang dicoba di sana tidak terlihat, atau kepala lampunya menyembul di atas atap, jadi dibuang. Furnitur sabuk hanya ada di lahan terbuka antara masjid dan jalan samping.
- **Sepanjang jalan samping:** jalur paving c 42..44, lampu, tong sampah.
- **Batas kanan c 44:** jalan raya game berakhir di c ±44. Taman tidak melewati batas itu.

**Aturan tutupan (dicek per piksel):** keras r ≥ 36.55 untuk semua sprite seberang (jalan raya, zebra, karakter); 0 pelanggaran. Tambahan untuk taman di seberang jalan lokal: r ≥ 51.0, supaya pohon/lampu tidak menutupi muka gedung baru; 0 pelanggaran.

| sprite terdekat batas | r |
|---|---|
| masjid_sw @(33.00,47.50) | 36.55 |
| rumah_kampung_d_sw @(16.60,41.40) | 36.71 |
| tiang_listrik_polos_se @(24.15,44.15) | 36.74 |
| lapak_aksesori_se @(21.25,41.60) | 36.76 |
| lampu_taman_sw @(33.00,40.65) | 36.84 |
| kabel_0 | 37.06 |

**Kabel gang (perbaikan v4):** kabel dari tiang gang ke kantor biru (kantor_a_pendek) ujungnya menggantung di udara, jadi dihapus dari `loak()` (mock v3/v4). Yang dipertahankan hanya bentang antar 2 tiang gang, dan kedua tiang memakai `tiang_listrik_polos`. Sprite `lorong_*` sendiri tidak berisi kabel. `tiang_listrik_*` lama (dengan ujung kabel) tetap ada untuk pemakaian lain.
Catatan: file `mock_gabungan_v3_*` / `mock_loak_v3_4x` tidak dirender ulang, jadi masih memperlihatkan kabel lama. Versi terbaru ada di v4.
