# Migi · Sprite Hewan Peliharaan (isometrik pixel art)

Migi adalah kucing asli milik pengguna: berbulu panjang, gemuk, dan sebagian besar putih dengan bercak hitam besar.
Folder ini berisi sprite, properti (mangkuk dan bantal tidur), metadata, dan pratinjau untuk
`game/index_extract.txt`. Semua aset dibuat secara prosedural dengan Python/PIL (`tools/`) dari palet resmi AD
(`../../art-direction/style-sheet.md` v1.4 + bagian **"Migi (the user's cat)"**). Status: **disetujui AD (Bima), 21 Okt 2026**.
**Tidak ada hex baru dan tidak ada warna yang menunggu persetujuan.** Pemeriksaan otomatis menemukan 0 pelanggaran palet,
dan alpha hanya bernilai 0/255 (bayangan 102).

## 1. Isi folder
| File | Isi |
|---|---|
| `migi_sheet.png` | Sheet sprite 192×768 (6 kolom × 24 baris, frame 32×32), **tanpa** bayangan |
| `migi_sheet_shadow.png` | Layer bayangan dengan grid yang sama (elips `#0B0E13` alpha 40%) |
| `migi_sheet_with_shadow.png` | Gabungan keduanya (untuk engine tanpa layer) |
| `metadata.json` | Ukuran frame, pivot, peta baris, fps, palet yang dipakai |
| `manifest.json` | Properti dengan **skema manifest environment** (mangkuk kosong/penuh, bantal tidur, `use_points`) |
| `props/` | `pet_bowl_empty`, `pet_bowl_full`, `pet_bed_grid` (+ `__shadow.png`) |
| `previews/` | GIF 4× per animasi, overview 1×/3×, mock dalam ruangan, perbandingan foto |
| `tools/` | Sumber: `model.py` (ray-cast 3D kecil), `cat.py` (pose, corak, wajah), `props.py`, `build.py`, `manifest.py`, `previews.py`, `refcompare.py`, `build_all.sh` |

## 2. Frame, pivot, skala
- **Frame 32×32 px, pivot (16, 24)** = titik kaki di pusat tile (artinya sama dengan pivot karakter (32,100)).
- Gambar frame di `(P.x − 16, P.y − 24)` dalam px sprite. Di index.html (0,5 unit/px): `<image x=P.x-8 y=P.y-12 width=16 height=16>`.
- Tinggi Migi (pivot → puncak siluet): duduk ±17 px, berjalan ±21 px (ekor terangkat), loaf ±12 px, tidur meringkuk ±9 px.
  Karakter setinggi 84–88 px (lutut ±23 px), jadi Migi kira-kira setinggi betis–lutut. Sedikit lebih besar dari ukuran asli, sama seperti properti kecil lain.
- Hanya skala bulat (2×, 3×, nearest-neighbour). Bayangan ada di layer terpisah.

## 3. Peta baris (`row = animIndex*4 + dirIndex`, `index = row*6 + frame`)
| Animasi | Baris se/sw/ne/nw | Frame | fps | Loop | Catatan |
|---|---|---|---|---|---|
| `walk` | 0 / 1 / 2 / 3 | 6 | 10 | ya | trot, kaki diagonal berpasangan, ekor bergoyang |
| `sit` | 4 / 5 / 6 / 7 | 6 | 4 | ya | idle duduk: f2 berkedip, f4–f5 ujung ekor menjentik |
| `eat` | 8 / 9 / 10 / 11 | 4 | 6 | ya | kepala turun ke mangkuk, kunyah (f1/f3) |
| `sleep` | 12 / 13 / 14 / 15 | 4 | 2 | ya | meringkuk, napas pelan, mata tertutup |
| `meow` | 16 / 17 / 18 / 19 | 4 | 6 | **tidak** | mulut terbuka (f1 kecil, f2 lebar) + tatapan melotot khas Migi; putar sekali lalu kembali ke `sit` |
| `loaf` | 20 / 21 / 22 / 23 | 4 | 3 | ya | rebahan "roti tawar", kaki terselip, napas, f3 berkedip |

Animasi 4 frame memakai kolom 0–3.

## 4. Arah dan mirroring (keputusan)
**Keempat arah digambar eksplisit. Engine TIDAK BOLEH mem-flip baris Migi.**
Corak Migi asimetris, seperti di foto: sadel hitam besar di punggung yang turun ke sisi **kiri**, bercak bawah di panggul kiri,
bercak bulat "hati" di sisi **kanan**, dan bintik hitam di kaki belakang kiri. Modelnya diputar (bukan dicerminkan) untuk tiap arah,
jadi corak selalu berada di sisi tubuh yang sama dan cahaya tetap dari kiri-atas. Kalau di-flip, corak pindah sisi dan cahaya terbalik.
Wajah (topeng hitam dengan garis putih/blaze di tengah) simetris. Di arah se/sw kepala Migi sedikit menoleh ke kamera untuk menampilkan tatapannya.

## 5. Integrasi (index.html)
```js
// Migi = aktor seperti avatar, tetapi frame 32x32 dan pivot (16,24)
const M = metadata;                         // pets/migi/metadata.json
const a = M.animations[anim], row = a.rows[dir];
const sx = frame * 32, sy = row * 32;        // crop dari migi_sheet.png
const p = P(pet.c, pet.r), S = 0.5;          // 0,5 unit SVG per px
const dy = (usePoint?.pet_offset_y_px ?? 0) * S;
// 1) layer lantai (setelah rug/kolam cahaya): bayangan dari migi_sheet_shadow.png, posisi sama
// 2) dunia ter-sort: kunci depth = pet.c + pet.r + 0.05 (sama dengan avatar)
img.x = p.x - 16*S; img.y = p.y - 24*S + dy; img.width = img.height = 32*S;
img.style.imageRendering = 'pixelated';
```
- **Depth sort:** `c + r + 0.05`, sama dengan avatar. Properti: `c + r + depth_offset.back` (mangkuk 1,0, bantal 0,95).
- **Bayangan:** gambar `migi_sheet_shadow.png` / `props/*__shadow.png` di layer lantai (blend normal) sebelum objek yang di-sort.
  Matikan bila engine sudah menggambar bayangan sendiri.
- **Kecepatan jalan** yang cocok dengan walk 10 fps: ±1,2 tile/detik (lebih pelan dari avatar).
- **Pathfinding:** Migi memakai grid A* yang sama. Sel mangkuk dan bantal diblok untuk orang (`block_cells`), tetapi boleh dimasuki Migi
  (`pet_walkable_cells`) sebagai tujuan `use_points`, sama seperti sel kursi bagi avatar.
- **Perilaku yang disarankan:** wander → `sit` (idle) → sesekali `meow` saat avatar pengguna dekat → `eat` di mangkuk penuh →
  `sleep`/`loaf` di bantal. Setelah `eat`, mangkuk bisa diganti ke `pet_bowl_empty` (lihat `states`).

## 6. Properti (`manifest.json`, skema environment)
Field sama dengan `environment/manifest.json`: `id, base_id, area, kind, facing, size, anchor, footprint, main, floor_center_px,
blocking, block_cells, depth_offset, use_points`. **Anchor = piksel yang menempel ke P(c,r)** (titik utara footprint), persis seperti environment,
jadi `Room.add`/kode penempatan yang ada bisa dipakai tanpa diubah. Field tambahan:
`shadow` + `shadow_blend` (layer bayangan), `pivot_px` (titik kaki pusat tile = P(c+0,5, r+0,5) dalam px PNG),
`pet_walkable_cells`, `states` (mangkuk), dan di `use_points`: `actor: 'pet'`, `anim`, `z_px`, `pet_offset_y_px`, `recommended`.

| id | ukuran | anchor | use_points |
|---|---|---|---|
| `pet_bowl_empty` / `pet_bowl_full` | 20×13 | (10,−8) | 4 titik `eat`, 0,36 tile dari pusat mangkuk: (0,5, 0,14) menghadap sw dan (0,14, 0,5) menghadap se (**disarankan**, wajah terlihat; mangkuk menutup dagu), (0,5, 0,86) ne, (0,86, 0,5) nw |
| `pet_bed_grid` | 50×31 | (25,2) | (0,5, 0,5), `sleep` / `loaf` / `sit`, facing `any`, `z_px` 8, `pet_offset_y_px` −8 (Migi digambar 8 px lebih tinggi, di atas bantal) |

Mangkuk: keramik paper/cool_grey dengan 1 px garis baize (aksen workspace). Isinya kibble walnut.
Bantal: bantal Migi yang asli, yaitu ramp black-hair (#3A4458/#2A3242/#1C2330) dengan garis grid gallery_mid #CFC6B4 di atas dan sisi.

## 7. Palet (hanya hex resmi)
| Peran | Hex |
|---|---|
| Bulu putih (terang / tengah+bayangan) | paper #E7EBF2 / cool_grey #8D97A8 |
| Bulu hitam (terang / tengah / bayangan) | #3A4458 / #2A3242 / #1C2330, + rim 1 px cool_grey di tepi kiri-atas siluet |
| Mata (2 px + kilau) | baize_lt #5B9C84 / baize #1F7A55 + 1 px paper |
| Hidung, telinga dalam | spark coral light #F4A182 (1 px masing-masing) |
| Mulut terbuka (meow) | oxblood #7A2E35 / oxblood_dk #5C2231 |
| Garis luar, bayangan | #0B0E13 (bayangan alpha 102) |

Rona krem di dada **tidak dipakai** (AD: boleh dihilangkan).

## 8. Pratinjau
- `previews/migi_{walk,sit,eat,sleep,meow,loaf}_4x.gif`: 4 arah di atas tile `floor_night`, dengan bayangan.
- `previews/migi_overview_1x.png` dan `_3x.png`: semua baris + properti.
- `previews/mock_workspace_migi_3x.png` dan `mock_closeup_4x.png`: Migi duduk di samping avatar pengguna (`reference_man_original`), meja, kursi, lemari, dan tanaman asli, dirakit dengan `environment/tools/mock.py`.
- `previews/mock_use_points_3x.png`: tidur di `pet_bed_grid`, makan di `pet_bowl_full` (titik sw), dan berjalan. Ada tiga pose sekaligus, hanya untuk demo.
- `previews/reference_comparison.png`: potongan foto di samping sprite.

## 9. Membangun ulang
```
sh tools/build_all.sh      # sheet + props + manifest + pratinjau (±20 dtk)
```
Bentuk tubuh ada di `tools/cat.py` → `pose()`. Corak ada di `markings()` (arah dan sudut tiap bercak), dan wajah di `face()`. Ramp warna ada di `tools/palette_migi.py`.

## 10. Catatan jujur / keterbatasan
- Sprite di-ray-cast dari model 3D kecil (elipsoid dan kapsul), lalu dibersihkan per piksel: 3 nilai, outline selektif, dan stempel wajah manual.
  Hasilnya konsisten di 4 arah, tetapi tidak sehalus pixel art yang digambar tangan.
- **Polish v1.1:** siluet ekor dan pipi sekarang tanpa noise. Ada pass `smooth_silhouette()` (mengisi takik 1 px dan memangkas tonjolan 1 px)
  dan pembersihan takik di cincin outline #0B0E13, sehingga tangga 1-2-3 px bersih di semua arah dan frame.
  Hasil pemeriksaan: jaggy 1 px pada siluet turun dari 357 menjadi **0**, dan pada outline dari 335 menjadi **0** (`cat.jaggies()`). Celah 1 px antar-kaki tetap dipertahankan.
- Pada 1× wajah hanya ±8 px: mata 2×2, blaze 1 px, hidung 1 px. Tatapan melotot paling jelas pada 2× ke atas. Di arah ne/nw wajah tidak terlihat (punggung menghadap kamera).
- `sleep` se/sw: kepala yang meringkuk tampil sebagai topeng hitam dengan blaze, kelopak mata abu-abu, dan hidung. Telinga hampir tidak keluar dari siluet bola.
- `eat` dari titik ne/nw: kepala tertutup tubuh sendiri. Pakai titik sw/se (`recommended`) agar wajah terlihat.
- Bob tubuh saat berjalan sub-piksel, jadi kadang tidak terlihat. Gerak terutama terlihat di kaki dan ekor.
- Rona krem di dada dihilangkan karena aturan "tanpa hex baru".
- Paper = **#E7EBF2** sudah dikonfirmasi AD (style sheet v1.4).
- Mock dirakit dari kontrak manifest dengan `environment/tools/mock.py`, bukan dari engine index.html.
