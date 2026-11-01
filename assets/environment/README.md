# Virtual Office · Aset Lingkungan (isometrik pixel art)

Paket tile, dinding, furnitur, dan properti untuk `game/index_extract.txt`.
Semua dibuat secara prosedural dengan Python/PIL (`tools/`) dari palet art director
(`../art-direction/style-sheet.md` **v1.1**, `palette.png`). Tidak ada anti-aliasing, dan setiap piksel
tidak transparan memakai warna palet. Pemeriksaan otomatis menemukan 0 pelanggaran palet.
Status: **disetujui AD (environment v1.1)**. Shade aksen sudah dihitung ulang, dan rug lounge dinaikkan satu langkah nilai.

- 243 varian aset dan 422 PNG. Setiap varian punya PNG utama, lalu bila perlu `__back`, `__front`, dan `__glow`, ditambah frame animasi.
- `manifest.json` berisi metadata lengkap tiap aset, dan `palette.json` berisi palet.
- `previews/` berisi `contact_sheet.png` (2×), `contact_sheet_all_variants.png` (1×), `slices_seating.png`,
  `mock_{workspace,library,lounge,coordination,gallery,sharing}.png` (2×), serta `anim_campfire.gif` dan `anim_coffee_counter_sw.gif`.

## 1. Skala (terkunci, style sheet v1.1)
| Hal | Nilai (px pada 1×) |
|---|---|
| Tile lantai | **64 × 32** (2:1, setiap diagonal 2 px ke samping per 1 px ke atas) |
| Langkah tinggi | 32 px |
| Dinding penuh / setengah (partisi) | 96 px / 32 px; tebal dinding 0,125 tile, dibangun **di luar** tepi ruangan |
| Avatar | frame 64×112, pivot (32,100), tinggi berdiri 84–88 px (dari `virtual-office-chars-iso`) |
| Dudukan kursi (`seat_z`) | **14 px** di atas pivot (sama dengan pose sit di metadata karakter) |
| Permukaan meja (`surface_z`) | **26 px** (meja 1×1 setinggi ±58 px; tangan `sit_type` 29–38 px tetap di atas tepi meja) |
| Kursi | lebar setengah tile, tinggi sprite ±51–60 px |

Di index.html v1.1, tile = **32×16 unit pada 2 px/unit**. Jadi 1 px sprite = 0,5 unit SVG.

## 2. Koordinat dan anchor
```
Layar (px 1×):   sx = X0 + (c - r) * 32 ;   sy = Y0 + (c + r) * 16 - z
SVG (unit):      P(c,r) = { x: X0 + (c - r) * 16, y: Y0 + (c + r) * 8 }      // TW=32, TH=16
```
`anchor` = piksel di PNG yang menempel ke **P(c,r)**, dengan (c,r) = sudut minimum (titik utara)
footprint objek.
```js
// a = entri manifest; letakkan objek di sel (c,r)
const p = P(c, r), S = 0.5;                       // 0.5 unit per px
img.x = p.x - a.anchor[0]*S;  img.y = p.y - a.anchor[1]*S;
img.width = a.size[0]*S;      img.height = a.size[1]*S;
img.style.imageRendering = 'pixelated';            // + shape-rendering crispEdges pada <svg>
```
- **Tile lantai:** 64×32, anchor (32,0) adalah puncak belah ketupat. Pakai `_a`/`_b` berselang-seling dengan `(c+r)%2`.
  `floor_edge_L/R` adalah sisi lempeng di tepi depan ruangan (baris r=R-1 / kolom c=C-1).
- **Dinding belakang:** `wall_R_*` berjalan sepanjang +c pada r=0, dengan anchor = P(c,0). `wall_L_*` berjalan sepanjang +r pada c=0, dengan anchor = P(0,r).
  `wall_corner` di P(0,0). `wall_R_cap` di P(C,0) dan `wall_L_cap` di P(0,R) menutup ujung depan.
  Skin: default (malam), `_gallery` (putih hangat), `_library` (wainscot walnut).
  Varian: `plain`, `window`, `door` (tertutup), `doorway` (terbuka), `door_open` (daun pintu = layer `front`).
- **Item dinding** (`kind: wall_item`): `_R` = menempel di dinding R, anchor P(c0,0). `_L` = menempel di dinding L, anchor P(0,r0).
  `wall_span_tiles` = lebar dalam tile, dan `mount_z_px` = tinggi pasang.
- **Prop permukaan** (`kind: surface_prop`): anchor = titik kontak (tengah alas).
  Letakkan di P(titik di atas meja), lalu geser ke atas `surface_z_px` milik meja (×0,5 unit).
- **Rug / overlay lantai:** anchor P(c,r) dan digambar di layer lantai. Untuk `fx/pool_*` dan `light_spot`, pakai `blend: screen`.

## 3. Facing dan varian
`sw` = depan objek menghadap +r (kiri-bawah layar), `se` = +c (kanan-bawah), `ne` = −r, `nw` = −c.
Untuk kursi, sofa, dan beanbag, facing = arah hadap **orang yang duduk**. Untuk meja, facing = sisi tempat orang duduk.
Duduk di meja `_sw` berarti menghadap `ne`; tulisan arahnya ada di `seats[].facing`.
Footprint `_se`/`_nw` adalah footprint `_sw` yang ditukar (W×D jadi D×W).

**Mirroring:** cahaya datang dari kiri-atas, jadi flip horizontal akan menukar sisi terang dan gelap.
Karena itu semua arah penting disediakan sebagai varian eksplisit, dan engine **tidak perlu** mem-flip
furnitur. Aset tidak memakai teks. Detail satu sisi dihindari, misalnya pintu punya gagang kuningan di kedua sisi.

## 4. Urutan gambar dan depth sort
1. Tile lantai, lalu `floor_edge`.
2. `floor_overlay`: rug, lalu kolam cahaya `fx/*` (mix-blend-mode: screen).
3. Dinding belakang (urut `c+r`), lalu item dinding.
4. **Dunia yang di-sort naik** berdasarkan kunci depth:
   - objek atau slice belakang: `c + r + depth_offset.back`
   - slice depan: `c + r + depth_offset.front`
   - avatar: `pos.c + pos.r + 0.05` (sama dengan index.html sekarang)
   - objek tanpa `depth_offset` khusus: `c + r + (W+D)/2` (pusat footprint)
5. `__glow.png`: dengan anchor dan ukuran yang sama seperti objeknya, digambar **sesudah** objek
   (atau di layer paling atas) dengan `mix-blend-mode: screen`.

## 5. Slice untuk duduk (kursi dan meja)
Aset yang punya `back` dan `front` (kursi, sofa, armchair, semua meja, cubicle, `door_open`):
- `main` = gabungan keduanya, untuk pratinjau atau engine tanpa layer.
- `back` digambar **di bawah** avatar. Untuk kursi isinya kaki, dudukan, dan sandaran bila sandaran ada di belakang orang.
- `front` digambar **di atas** avatar. Untuk kursi isinya sandaran tangan, ditambah sandaran punggung bila kursi membelakangi kamera.
  Untuk meja, saat orang **membelakangi** kamera (meja `_sw`/`_se`), isinya bidang depan meja; jalur selebar torso (±12 px)
  dikosongkan supaya hanya kaki yang tertutup. Saat orang **menghadap** kamera (meja `_ne`/`_nw`), isinya semua bidang tegak, monitor, dan lampu,
  sedangkan permukaan meja dan keyboard tetap di `back` supaya tangan `sit_type` tampil di atasnya.
- `depth_offset.back` = jumlah titik duduk − 0,05. `depth_offset.front` = +0,1 untuk kursi dan +0,08 untuk meja, sehingga urutannya
  meja-back < kursi-back < **avatar (+0,05)** < meja-front < kursi-front.

```js
// duduk: s = a.seats[k]
actor.pos = { c: c + s.point[0], r: r + s.point[1] };   // sel kursi = s.cell (relatif)
actor.dir = s.facing;                                    // 'ne' | 'nw' | 'se' | 'sw' | 'any'
actor.anim = 'sit' / 'sit_type';                          // s.anims
actor.dy  = s.avatar_offset_y_px * 0.5;                  // 0 untuk kursi; 8 px untuk floor_cushion
// avatar: <image x=P.x-16 y=P.y-50+dy width=32 height=56>  (frame 64x112, pivot 32,100)
```
Meja tidak menyertakan kursi. Kursi diletakkan di `seats[].cell`, dengan facing yang sama dengan `seats[].facing`
(contoh: `desk_double_sw` di (c,r) dipasangkan dengan `office_chair_ne` di (c,r+1) dan (c+1,r+1)).
`cubicle` dan `desk_L` punya `walkable_cells` (sel kursi di dalam footprint).

## 6. Pathfinding
`block_cells` (relatif ke (c,r)) diblok di grid A*. Sel kursi dan beanbag ikut diblok, tetapi boleh menjadi
**tujuan** bagi avatar yang akan duduk. `walkable_gap: true` pada dinding `doorway`/`door_open` menandai celah yang bisa dilewati.
`use_points` (dispenser, mesin kopi, papan, copier, ping-pong, pedestal) adalah titik berdiri beserta arah hadapnya.

## 7. Animasi
`animation.files[k]` = `{main, glow?}` per frame. Semua frame memakai ukuran dan anchor yang sama.
`campfire` punya 6 frame pada 8 fps (api dan glow), dan `coffee_counter_*` / `prop_coffee_machine_*` punya 3 frame uap pada 6 fps.

## 8. Galeri
`frame_*_empty` menyediakan `picture_quad` (TL, TR, BR, BL dalam px PNG) untuk memetakan thumbnail
dengan matriks afin: `matrix((TR-TL)/w, (BL-TL)/h, TL)`. Versi tanpa `_empty` sudah berisi lukisan abstrak.

## 9. Zoom
Agar piksel tetap tajam, skala layar per piksel sprite sebaiknya bilangan bulat
(`cam.sc * cssPxPerUnit * 0.5` ∈ {1,2,3,…}). Zoom bebas 1×–4,5× tetap bisa dipakai, tetapi pada skala pecahan
piksel akan tidak rata (nearest-neighbour).

## 10. Membangun ulang dan mengganti warna
```
python3 tools/build.py   # PNG + manifest.json (±25 dtk)
python3 tools/mocks.py   # 6 mock ruangan
python3 tools/sheets.py  # contact sheet, slices, cek palet
python3 tools/anims.py   # GIF animasi
```
Warna ada di `tools/palette.py` (`AD` = palet resmi, `DERIVED` = shade aksen hasil aturan sistem, `SHADE_STATUS` = status, nilai lama, nilai hitungan, dan alasan pengecualian). Ramp material 3 nilai
(atas/kiri/kanan) ada di `M`. Ganti hex di sana untuk recolor semua aset.

## 11. Catatan jujur / keterbatasan
- **Shade aksen (disetujui AD, 21 Okt 2026):** shade dihitung dengan aturan sistem, yaitu bayangan = lightness HLS ×0,75 dengan hue digeser 10° ke navy #1C2330, dan hilite = 30% ke paper (dingin) atau ke #FFD166 (hangat).
  Baize, oxblood, plum, dan steel memakai nilai yang **identik** dengan set karakter. Ada 3 pengecualian: `gallery_mid`, `gallery_dk`, dan `ember_dk` tetap memakai shade manual. Alasannya tercatat di `palette.json` (hasil hitungan berubah jadi mustard/olive atau merah-oranye neon).
- Slice depan meja untuk orang yang membelakangi kamera adalah kompromi: jalur torso ±12 px dikosongkan.
  Avatar yang jauh lebih lebar akan sedikit tertutup bidang depan meja.
- Depth sort memakai pusat footprint. Ini aman untuk objek 1–3 tile. Untuk objek besar (meja rapat 3×2, ping-pong) dengan avatar
  yang berdiri diagonal sangat dekat, bisa muncul salah urut 1–2 px. Objek seperti itu bisa dipecah per tile bila perlu.
- Cahaya dari kiri-atas dipanggang di sprite, jadi engine tidak boleh mem-flip furnitur (pakai varian facing).
- Ping-pong memakai plum (aksen lounge), bukan hijau atau biru standar, demi aturan 1 aksen per ruangan. Tanaman memakai ramp baize.
- Glow memakai warna palet dengan alpha rendah. Dither checker 50% hanya ada di kolam cahaya lantai (`fx/`).
- Mock memakai sheet karakter asli (`virtual-office-chars-iso/examples/*_sheet_no_overlay.png`) dan dirakit hanya
  dari kontrak di atas (`tools/mock.py`). Ini membuktikan anchor dan depth berfungsi, tetapi bukan engine index.html itu sendiri.

## Lantai v1.2 (review in-context AD, 21 Okt 2026)
Id, ukuran (64x32), anchor (32,0), dan aturan selang-seling `_a`/`_b` (`(c+r)%2==0` → `_a`) **tidak berubah**. Yang berubah hanya warnanya.
Semua lantai ruangan sekarang berbasis night navy (library memakai walnut) dengan kotak-kotak dua nilai yang kontrasnya rendah. Tint aksen dibatasi 12%: `<aksen>_fa = mix(floor_dk, aksen, 0.12)` dan `<aksen>_fb = mix(floor_lt, aksen, 0.12)`.
Default per ruangan tercatat di `manifest.json` → `_meta.floor_defaults`, dan setiap tile lantai punya field `recommended_default_for`.

| Ruangan | Tile | a | b |
|---|---|---|---|
| Workspace | floor_night | #10141B | #1C2330 |
| Library | wood_walnut | #6B4F3A | #644936 |
| Lounge | carpet_plum | #191926 | #242638 |
| Coordination | carpet_steel | #161F2C | #202C3E |
| Gallery | floor_gallery | #2B2D32 | #353A44 |
| Sharing | carpet_oxblood | #1D171E | #272431 |

`carpet_baize` (#122022 / #1C2D34) ikut dibuat ulang tetapi tidak menjadi default ruangan mana pun. `grass_*` tetap jenuh dan tidak direkomendasikan untuk lantai ruangan.
Warna aksen kini hanya muncul di rug, trim, dan props.

## v1.3: Area baru (Brainstorming, Meeting Room, Outdoor pool)
Area-area ini mengikuti style-sheet v1.3 dan lantai v1.2. Kontraknya sama dengan v1.1: anchor, slice `__back`/`__front`/`__glow`, `seats[]`, `block_cells`, `walkable_cells`, `use_points`, dan wall mount. Semua id lama tetap ada, dengan ukuran dan anchor yang sama.
Asetnya disimpan di folder `brainstorm/`, `meeting/`, dan `outdoor/`. Ubin lantai baru juga ada di folder area tersebut.

**Aksen.** Aksen `ACCENT_BRAINSTORM='coral'` dan `ACCENT_MEETING='teal'` masing-masing berupa satu konstanta di `tools/palette.py`, jadi gampang diganti. Hex-nya sudah disetujui di v1.3, dan detailnya ada di `palette.json` → `v13_*`.
Warna parasol (kuning redup) **masih menunggu AD**. Nilainya dihitung dengan aturan sistem.

**Lantai default.**

| Area | Tile | a | b |
|---|---|---|---|
| brainstorm | `carpet_coral` | #2A2023 | #342D35 |
| meeting | `carpet_teal` | #152027 | #202D3A |
| outdoor (dek) | `deck_stone` | #8D97A8, sambungan wall_top | #8D97A8, sambungan gallery_dk |
| outdoor (rumput) | `grass_night` | #155344 | #155344, bilah lebih rapat |

**Kursi tinggi.** `high_stool` punya `seat_z_px` 26, jadi frame `sit` digambar 12 px lebih tinggi (`avatar_offset_y_px` −12). Permukaan `high_table` ada di z 40.

**Meja rapat.** `meeting_table_teal_*` punya `chair_slots[]` berisi 6 kursi. Tiap slot mencatat sel relatif terhadap origin meja (boleh negatif), id kursi `meeting_chair_teal_<arah>`, titik duduk, dan arah hadap.

**Kaca.** Dinding kaca dibuat tanpa alpha: rangka cool_grey, satu garis highlight paper 1 px, dan isian `teal_glass`. Asetnya `wall_{L,R}_glass_meeting`, `wall_{L,R}_glassdoor_meeting` (`walkable_gap` true), dan `glass_partition_tall_{sw,se}`.

**Kolam.**
- `pool_water` adalah ubin air 4 frame (180 ms per frame) dengan layer glow berisi cahaya bawah air plus kaustik paper 40%. Field-nya: `zone="swim"`, `water_surface_z_px` −6, `water_line_px` 40, dan `swim_avatar_offset_y_px` 46.
- Pinggiran kolam (coping) berupa overlay yang digambar di atas sel air: `pool_edge_{n,e,s,w}`, `pool_corner_{n,e,s,w}`, dan `pool_inner_{n,e,s,w}`. Arahnya: n = sisi −r, e = +c, s = +r, w = −c.
- Untuk tumpahan cahaya, pakai `pool_spill` di sel dek yang bersebelahan dengan air, dan `door_spill` di depan `wall_*_glassdoor_outdoor`.

**Kursi berjemur.** `sun_lounger*_{se,sw,ne,nw}` berukuran 1x2. Nilai di `seats[0]`: `pose="lie"`, `anims=["lie"]`, dan `seat_z_px` 12. Titiknya ada di tengah footprint, dan arah hadapnya mengikuti arah kaki.

**Kontrak dengan job karakter** ada di `outdoor_contract.json`. Isinya `water_line_px` 40, offset renang 46, dan tinggi berbaring 12.

**Keterbatasan v1.3.**
- Sheet karakter belum punya baris swim, lie, dan float. Karena itu, di mock perenang memakai frame idle yang dipotong di garis air sebagai pengganti, dan kursi berjemur dibiarkan kosong.
- Avatar yang berbaring melintasi 2 sel, jadi kadang bisa salah urut 1–2 px.
- Sandaran kursi berjemur dari arah ne/nw terlihat dari belakang sebagai panel walnut tegak, dan panel itu ada di slice `__front`.

### v1.3.1: Revisi review AD (Meeting cutaway, Outdoor malam)
- **Cutaway (Meeting).** Kaca yang ada di sisi kamera, sehingga bisa menutupi avatar, dirender sebagai cutaway: rangka, rel atas, dan highlight paper 1 px, tanpa isian.
  - Varian baru: `glass_partition_tall_cutaway_{sw,se}`, `wall_{L,R}_glass_meeting_cutaway`, `wall_{L,R}_glassdoor_meeting_cutaway`.
  - Di manifest, tiap aset punya `cutaway_variant` atau `opaque_variant` dan `render_rule`. Kaca opak hanya dipakai di dinding belakang.
  - Dinding depan memakai potongan R di `P(c, R)` (atau potongan L di `P(C, r)`) dengan depth key `c + r + 0.5`.
- **Dek.** `deck_stone` sekarang memakai #2B2D32 / #353A44 (gallery_fa/fb) dengan sambungan floor_lt. Coping satu step lebih terang: wall_top / wall_lit / wall_shd.
- **Air.**
  - Badan air sekarang deep #1B4F6B, dengan kaustik paper 40% yang jarang.
  - Aset baru `pool_light` (2x2, 4 frame, screen) berisi gradien mid #2D8FB0 bertingkat dengan inti #7FE0E8. Pasang 2 per kolam.
  - Cahaya tetap tumpah 1 tile lewat `pool_spill` dan glow di coping.
- **Rumput.** `grass_dk` / `grass_md` diturunkan satu step lagi menjadi baize ×0,81: #134B3D / #196345.
- **Lampu gantung bar** berupa titik #FFD166 tunggal di tali cool_grey, ditambah tumpahan hangat 1 px di atas meja bar (layer glow). `door_spill` diperkuat (alpha 60).
- **Parasol.** Ramp #E3C376 / #D7BD7D / #A1995E kini APPROVED. Kedelapan panel diberi nilai berselang-seling plus hem 1 px.
- `mock_outdoor` sekarang memakai baris swim / float / lie dari sheet karakter (offset 46 dan lie z 12 sesuai `outdoor_contract.json`).

## Hewan peliharaan: Migi (pets/migi)
Sprite kucing pengguna (frame 32×32, pivot (16,24), 6 animasi × 4 arah eksplisit, **jangan di-mirror**) beserta properti
`pet_bowl_empty`, `pet_bowl_full`, dan `pet_bed_grid` ada di `../pets/migi/`. Properti memakai skema manifest ini, tetapi dicatat di
`../pets/migi/manifest.json` supaya `tools/build.py` tidak menimpanya. Anchor = P(c,r) seperti di sini, dengan tambahan layer `shadow` dan `use_points` khusus hewan.
Depth Migi = `c + r + 0.05` (sama dengan avatar). Detail lengkap ada di `../pets/migi/README.md`.
