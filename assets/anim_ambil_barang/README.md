# anim_ambil_barang — animasi "ambil barang" + "cari barang" (v6b, PREVIEW SAJA)

Belum dipasang ke game, tidak di-deploy, dan `index.html` tidak diubah.

## Isi folder
| file | isi |
|---|---|
| `make_anim_ambil_barang.py` | generator. Jalankan dengan `python3 make_anim_ambil_barang.py`; semua output dibuat ulang |
| `frames/` | 176 PNG, 64×112, pivot (32,100). Nama file: `{char}_ambil_{item\|kosong}_{dir}_f{i}.png` (9 frame) dan `{char}_cari_{dir}_f{i}.png` (4 frame) |
| `ichsan_ambil_4arah_4x.gif`, `ichsan_cari_4arah_4x.gif` | GIF 4x, 4 arah berdampingan (se, sw, ne, nw), timing per frame sesuai manifest |
| `npc_ambil_4arah_4x.gif`, `npc_cari_4arah_4x.gif` | sama, untuk NPC generik |
| `ichsan_ambil_cari_sheet_4x.png`, `npc_ambil_cari_sheet_4x.png` | sheet 4x: baris ambil se/sw/ne/nw lalu cari se/sw/ne/nw. Tanda `*` = frame item_diambil |
| `manifest.json` | fps, `frame_ms` per frame, `item_diambil`, event, posisi tangan per frame dan per arah (`hand_px`), offset barang di tanah dari pivot |
| `held_kaleng_minuman_merah.png`, `ground_kecil_kaleng_minuman_merah.png` | penanda barang di tangan dan versi tergeletak (skala tangan) untuk preview |

## Karakter
- **ichsan (pemain)**: dibuat dengan generator yang sama dengan sheet game `assets/chars/ichsan_v6b_sheet.png`, yaitu `live_v6b` pada `v6b/live/chars/ichsan.json`. Generator mengecek setiap build: idle f0 se dan ne hasil render ulang identik piksel dengan sheet game (selisih 0 px).
- **npc (generik)**: lewat jalur `npc_v6b.make_cfg` + `job_common.render`, jalur yang sama dengan `npc_v6b.build`. Config: pria, kulit medium, rambut pendek hitam, kaos steel, celana charcoal, sneakers putih. Ganti `NPC` di generator untuk NPC lain. Config yang memakai topi, hijab, rok, atau outfit khusus belum dicoba.

## Animasi
**ambil** (9 frame, tidak loop, total 1530 ms)

| f | pose | jongkok (px) | ms |
|---|---|---|---|
| 0 | berdiri (idle generator) | 0 | 260 |
| 1 | mulai menekuk, tangan turun | 3 | 110 |
| 2 | jongkok, tangan meraih | 8 | 110 |
| 3 | jongkok penuh, tangan terbuka di atas barang; tangan lain di lutut | 12 | 120 |
| **4** | **genggam barang = `item_diambil`** (t = 600 ms) | 12 | 260 |
| 5 | angkat barang | 11 | 120 |
| 6 | bangkit, barang di depan perut (se) / di samping (ne) | 7 | 110 |
| 7 | hampir berdiri, barang di dada | 2 | 120 |
| 8 | berdiri memegang barang (selesai; game memasukkan barang ke tas) | 0 | 320 |

- Ada 2 set frame: `_item` (kaleng di tangan mulai f4) dan `_kosong` (tangan tanpa barang). Pakai `_kosong` bila game menempel ikon barang sendiri di `hand_px`, atau bila pencarian gagal.
- Barang di tanah diletakkan pada `ground_item_offset_from_pivot`, yaitu se (+13.5, −5) px dari pivot (sedikit di kanan-belakang kaki, tepat di bawah tangan f4). Arah lain ada di manifest. Sprite barang di tanah dihapus pada `item_diambil`.

**cari** (4 frame, loop, 140 ms/frame ≈ 7 fps): jongkok 9 px. Satu tangan mengorek ke bawah (terbuka) dan tangan lain menarik sampah ke atas (genggam), bergantian. Serpihan kertas/kardus 2×2 px terlempar di f1 dan f3. Pose ini cocok untuk kardus atau tong rendah. Saran urutan: cari ×2–3 → ambil f3..f8 bila dapat barang, atau ambil f6..f8 versi `_kosong` bila tidak dapat.

## Aturan yang dipatuhi
- Frame 64×112, pivot (32,100), 4 arah. sw dan nw adalah cerminan horizontal se dan ne, seperti sheet game.
- Alpha hanya 0/56/255, bayangan alpha 56. Tidak ada outline hitam: tepi memakai tone tergelap dari material yang sama.
- Warna: 59 warna, semuanya ada di daftar palet game (`npc_babeh_loak/_tools/known.json`), jadi tidak ada hex baru.
- Kepala, rambut, wajah, dan kacamata tidak dikompres. Seluruh tubuh atas hanya digeser turun sesuai kedalaman jongkok (+1–2 px condong ke depan).
- Lengan dibuat dengan `limb()` yang juga dipakai babeh loak dan kang parkir: bahu bulat, lengan kaos dengan hem, siku bertekuk (titik siku gelap), lengan bawah meruncing, lalu tangan (terbuka/genggam).
- Di ne/nw, tangan yang mengambil selalu berada di samping badan (kanan layar di ne, kiri di nw), di bawah bahu, dan tidak pernah tertutup kepala atau rambut.

## Keterbatasan
- **Skala barang**: sprite `item_temuan/ground` dibuat 1,5× lebih besar agar terbaca di peta (kaleng ±20×15 px). Kalau ditaruh di tangan, ukurannya hampir separuh kepala. Karena itu, penanda di tangan memakai generator item_temuan yang sama pada skala tangan (k = 0,75, kaleng ±10×8 px). GIF juga memakai versi kecil itu untuk barang yang masih tergeletak. Di game, sprite tanah yang asli 2× lebih besar, jadi ukurannya akan meloncat pada `item_diambil`. Pilihannya: (a) pakai frame `_kosong` + ikon kecil di `hand_px`, atau (b) kecilkan sprite tanah saat diambil.
- Kaki jongkok digambar baru (paha/betis dari ramp warna celana asli, lutut melebar ke samping) dengan konvensi pixel-art, bukan proyeksi 3D. Dari se, lutut tidak terlihat maju ke kamera, dan dari ne lutut tertutup pantat. Sepatu tetap di tempat (tumit tidak terangkat).
- Badan tidak membungkuk. Pose ini jongkok dengan punggung tegak (ala "jongkok Asia"), dan badan hanya condong 1–2 px.
- Pada jongkok penuh (f3–f4), lengan pengambil sekitar 20% lebih panjang daripada lengan berdiri supaya bisa mencapai tanah. Di ukuran 1x hal ini hampir tidak terlihat, tetapi tampak di zoom 4x.
- Ekspresi wajah hanya ada di se/sw: netral → kaget (f4–f5) → senang (f6–f7) → senyum (f8). Di ne/nw kepala terlihat dari belakang. Sheet game memakai overlay wajah terpisah; frame ini sudah memuat wajahnya (baked).
- Pada `cari`, kardus/tong tidak termasuk dalam frame. Di game, tangan yang masuk "ke dalam" tong akan tertutup oleh prop yang di-depth-sort di depan karakter. Posisi prop di depan karakter belum dicek di mock.
- Belum diuji di engine game (belum ada baris sheet atau ROWMAP untuk animasi ini). Frame masih berupa PNG lepas.
