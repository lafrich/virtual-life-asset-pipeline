# video_ig_story — 3 video grid 15 detik untuk IG Story (v2, TANPA TEKS)

Revisi: tidak ada teks apa pun (tanpa judul, subjudul, caption, end card). Versi lama bertulisan ada di `_prev_teks/`.

Spec: MP4 H.264 High, yuv420p, +faststart, 1080x1920, 30 fps, 15.000 s (450 frame), audio AAC senyap (kompatibilitas IG), CRF 10.
Pixel art: nearest-neighbour faktor bulat saja (2x-6x), offset tempel genap. Latar #161A26, bingkai tile 2 px #3A425E, isi tile #1D2233.
Area aman: grid di y 254..1578 (atas 250 px, bawah 340 px kosong). Fade-in 0.5 s, fade-out ke latar 14.4-14.9 s (tanpa tulisan).
Grid: 3 kolom x 4 baris (sel 336x322, jarak 12): tile besar 2x2 + tile tinggi 1x2 (Manusia Silver di video 1 & 3) + tile lebar 2x1 + tile kecil.
Tiap tile looping dengan offset mulai acak.

Generator: `make_video_ig_story.py` (`python3 make_video_ig_story.py` = semua; `v1`/`v2`/`v3` satu video; `still v1` still uji ke `_work/`). Sumber hanya dibaca.
`_work/*_mp4_t{2,7.5,13}.png` = frame sampel hasil decode MP4. Poster = frame detik ke-1.

| file | ukuran |
|---|---|
| `ig_story_1_jalanan_jakarta.mp4` + `_poster.png` | 4.7 MB |
| `ig_story_2_cari_jual_barang.mp4` + `_poster.png` | 2.4 MB |
| `ig_story_3_hidup_di_kota.mp4` + `_poster.png` | 2.2 MB |

## 1 · jalanan jakarta
| posisi | isi | sumber | skala |
|---|---|---|---|
| 2x2 | nyebrang | `anim_nyebrang/mock_nyebrang_4x.gif` (1x crop x 0..322, y 12..312: papan "CROSS" dan keset bertulisan terpotong) | 2x |
| 1x2 tinggi | Manusia Silver | `npc_manusia_silver/manusia_silver_{idle ×2, statue_poses, bow ×2, walk ×4}_4views_4x.gif` (se) | 6x |
| 2x1 | ojol | `street_vehicles/riders_v3/frames/{gojek_se, gojek_pax_se, maxim_pax_sw, maxim_sw}_f0..3.png` (ride loop 120 ms) | 3x |
| 1x1 | Pak Ogah | `npc_pak_ogah/pak_ogah_{stop_car, wave_flag}_4views_4x.gif` | 4x |
| baris 4 (4 tile) | Kang Parkir · Parkir Indomaret · Pemuda Golda · Babeh Loak | `npc_kang_parkir/kang_parkir_{whistle,direct,money}`; `street_buildings/previews/mock_depan_indomaret_4x.png` (crop di bawah papan toko, pan pelan); `npc_pemuda_golda/pemuda_golda_{sit_sad,drink}`; `npc_babeh_loak/babeh_{jam,tas}_sit` | 3x / 2x / 3x / 3x |

## 2 · cari & jual barang
| posisi | isi | sumber | skala |
|---|---|---|---|
| 2x2 | Ichsan + NPC cari → ambil | `anim_ambil_barang/frames/ichsan_cari_se ×3 → ichsan_ambil_item_se`, `npc_cari_sw ×3 → npc_ambil_kosong_sw` | 5x |
| 1x2 tinggi | pasar loak | `street_buildings/previews/mock_loak_v3_4x.png` (1x crop 166x326 di lapak; papan toko/gapura di luar crop) | 2x |
| 2x1 | barang temuan | `item_temuan/props_temuan/*_se.png` + `__kilau_f0..2` (4x, crossfade), ikon `item_temuan/icons/*.png` naik-turun (3x) | 4x / 3x |
| 1x1 | Babeh pemilik | `npc_babeh_loak/babeh_pemilik_{counter_etalase, work}` | 3x |
| baris 4 | Babeh jam · Babeh tas · Barista Famima | `babeh_jam_work`, `babeh_tas_work` (sw), `barista_famima/npc/barista_famima_{giling,steam_tuang,seduh,serah}` | 3x |

## 3 · hidup di kota
| posisi | isi | sumber | skala |
|---|---|---|---|
| 2x2 | bangun di tenda | `spawn_hobo/mock/spawn_ichsan_tenda_se_3x.gif` (penuh, 1x 340x260) | 2x |
| 1x2 tinggi | Manusia Silver (arah sw) | `manusia_silver_{statue_poses, bow ×2, idle ×2}` view sw | 6x |
| 2x1 | spawn NPC | `spawn_hobo/mock/spawn_npc_tenda_sw_3x.gif` (crop y 40..199) | 2x |
| 1x1 | kamar kosong | `kamar_cove_kosong/mock/mock_kamar_kosong_1x.png` (statis) | 2x |
| baris 4 | G-Funk · Theodore · Yerbies | `npc_gfunk/poses/gfunk_{talk,sit_type}_se`, `npc_theodore/theodore_walk_se_4x.gif` (latar di-key) → `poses/theodore_talk_se`, `npc_yerbies/poses/yerbies_{talk,sit_type}_sw` | 3x |

## Yang dikeluarkan karena teks
- Layar UI loak/tas (`ui_loak_tas`) dan HUD Y2K (`ui_y2k`): isinya sebagian besar teks UI → tidak dipakai.
- Lobi status pintu kamar (papan & plat bertulisan) → tile kamar jadi statis tanpa crossfade.
- `street_lanes_riders_v3_with_cars_4x.gif`: bus TransJakarta bertulisan melintas → diganti frame ride loop riders_v3 (rider di tempat, tanpa jalan/latar).
- Tile tidur (ada huruf "z z") diganti Yerbies.

## Keterbatasan
- Ojol tampil sebagai ride loop di tempat (motor bergoyang), bukan melaju di jalan.
- Tile pasar loak, Indomaret, kamar = potongan mock statis (Indomaret pan pelan), bukan rekaman game.
- Tile spawn 2x tidak memenuhi tinggi tile (ada pita kosong atas-bawah ±64 px); tile Ichsan+NPC cari menyisakan ruang kosong di sekitar karakter.
- Pose duduk (Golda, Babeh) tampil tanpa bangku game di sebagian frame.
- Lampu pejalan di tile nyebrang memuat piktogram orang (ikon, bukan huruf); motif kecil di produk rak Indomaret bukan teks terbaca.
- yuv420p: tepi warna kontras sedikit berbayang saat dizoom; IG akan encode ulang.
