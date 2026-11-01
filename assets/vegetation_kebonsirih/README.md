# Vegetation: Kebon Sirih street trees, shrubs, ground plants, grass tiles (PREVIEW)

Status: **preview only.** Nothing here is wired into the game. `game/index_extract.txt` was read, not edited. Nobody was messaged.
v3 ~11:42 WIB (lawn without flowers, shrubs on hold). v1 built 1 Nov 2026 ~11:20 WIB; **v2 ~11:31 WIB** (feedback: plants looked split from the ground, shadows too weak, lawn too plain). Built with procedural pixel-art Python (`_work/`). Rebuild: `cd _work && python3 build.py && python3 sheet.py && python3 scene.py` (takes about 5 s).

## Deliverables
| file | what |
|---|---|
| `_prev_v2/` | backup of v2 (PNGs, sheets, manifest, README, generator) |
| `_prev_v1/` | backup of the v1 PNGs, sheets, manifest, README and generator |
| `trees/*.png` (17) | 12 species. Asam jawa has 3 sizes; trembesi, angsana and mahoni have 2 each |
| `shrubs_ditahan/*.png` (12) | **ON HOLD (v3)**: shrubs and roadside plants, not used for now (user decision). Moved out of `shrubs/`; marked `status: on hold` in the manifest; left out of the contact sheet and the street preview. The files are identical to v2 |
| `ground/*.png` (15, v3, no flowers) | ground tufts and lawn scatter overlays (4 more tuft shapes, clover, white/yellow/purple flower dots, small leaves) plus props (leaf litter, pebbles, stump) |
| `tiles/*.png` (35, v3, no flowers; the v2 description that follows is out of date) | 64×32 grass floor tiles: 6 plain (light/dark mottling plus tufts), 2 tufty, dark patch, light patch, 2 clover, 2 leaf litter, 3 flower (yellow, white, mixed), dry, bare dirt, 4 pavement edges, 4 outer corners, 4 inner corners |
| `contact_sheet_4x.png` | every sprite at 4×, laid out like the reference sheet (trees, shrubs, tufts, tile grid). Labels give the Indonesian name, Latin name and 1× size. The red cross marks the pivot |
| `preview_street_4x.png` | v2: a large lawn (about 20×17 tiles, weighted random tiles plus 220 scatter overlays) to judge repetition, a paved footpath into the lawn to show the edge and corner tiles, and a mock of the game street cross-section (lawn, paving, yellow tactile strip, black and white curb, asphalt, far sidewalk), using colours from index.html. The lawn uses the new tiles. Asam jawa trees line the lawn edge with a soka/bugenvil strip, and there is a far-side planting strip. For scale it includes one avatar (64×112, from `street_vehicles/_work/char_ref.png`) and the `street_vehicles` red sedan |
| `manifest.json` | size and pivot for every sprite, plus the anchor rules and shadow rule |
| `_work/` | generator: `veg.py` (engine, ramps), `species.py` (each plant), `tiles.py`, `build.py` (PNGs and manifest), `sheet.py`, `scene.py`, `colours.json` (colour audit) |

## Conventions followed
- Iso 2:1. Tile 64×32. PPU 2 (1 game unit = 2 px). Authored at 1× only and enlarged with nearest-neighbour. No anti-aliasing.
- Light comes from the left (top-left). Every material has a 5-tone ramp. **No black outline**: silhouette pixels use tone 0 of the same material on the right and bottom edges and tone 1 on the left and top edges.
- Shadow (v2, **two levels, so the 0/56/255 rule is NOT kept**): flat black, baked into the PNG. **Alpha 56** is the canopy/body projection: one ellipse per canopy clump, pushed right (away from the left light) in proportion to clump height, then merged. **Alpha 90** is a small ground-contact patch under the trunk or stem. Hedges get a footprint parallelogram offset to the right (56) and a contact band (90). Where shadow falls on the sprite's own grass skirt it is painted as darker grass tones, not as alpha. Audit: alpha values are 0, 56, 90 and 255 only.
- **Pivot** = the ground point under the trunk or plant centre. The sprite is horizontally centred on it (every width is even, so pivot x = w/2). In game: `<image x=P(c,r).x − pivot.x/2, y=P(c,r).y − pivot.y/2, width=w/2, height=h/2>`. Depth-sort by c+r of the pivot.
- Tiles use the same diamond mask and anchor (32,0) as `environment/tiles/grass_a.png`. The base tone is the street lawn colour `#2A9E52`, so the tiles sit on the current lawn without a colour jump.
- Each tree and plant stands in a grass skirt. Its tone 3 is exactly the lawn colour `#2A9E52`. It gets darker toward the stem (tones 2 and 1), its outer rim breaks up into the lawn, and its blades point outward. Grass pixels are exempt from the darker-edge rule, so the skirt has no rim line. Extra blades are drawn over the lowest trunk or foliage pixels so plants sit in the grass, not on it.

## Species and why they fit Kebon Sirih
| sprite | Indonesian / Latin | why it is here | source |
|---|---|---|---|
| asam_L/M/S (**hero**) | Asam jawa, *Tamarindus indica* | In the 1890s Kebon Sirih was lined with tall, shady asam trees, and the street nearby was called *Tamarindelaan* (Jl. Asem). This matches the "then" photo: tall trunks and high, arching crowns | jakrev.com "Menyimak Sejarah Kebon Sirih" (https://jakrev.com/megapolitan/asal-usul/menyimak-sejarah-kebon-sirih/); Alwi Shahab via http://softoh-jamaah.blogspot.com/2008/03/kebon-sirih-dan-kusni-kasdut.html |
| trembesi_L/M | Trembesi / ki hujan, *Samanea saman* | Standard Jakarta shade tree. Grows in the Bank Indonesia garden on Jl. Kebon Sirih | Trubus "Oasis di Kebonsirih" (https://trubus.id/oasis-di-kebonsirih/); Kompas 2022 street-tree list |
| angsana_L/M | Angsana, *Pterocarpus indicus* | Classic Jakarta street tree. Matches the dense, drooping green crowns in the "now" photo | Kompas 17 Jul 2022 (https://www.kompas.com/properti/read/2022/07/17/204609821/...) |
| mahoni_L/M | Mahoni, *Swietenia mahagoni* | Very common city street tree, with an upright dark crown | Kompas 2022; lindungihutan.com/blog/pohon-peneduh-jalan-raya |
| ketapang_kencana | *Terminalia mantaly* | Modern tiered street and median tree all over Jakarta | Kompas 2022 |
| beringin | *Ficus benjamina* | Old Batavia and Menteng park tree with aerial roots | general knowledge, **not verified for this street** |
| kiara_payung | *Filicium decipiens* | Neat dome-shaped shade tree in Jakarta parks and offices | general knowledge, **not verified** |
| flamboyan | *Delonix regia* | Grows in the Bank Indonesia Kebon Sirih garden | Trubus "Oasis di Kebonsirih" |
| tabebuya_kuning | *Handroanthus chrysotrichus* | Planted widely on Jakarta streets since about 2017 (yellow form chosen, so no cherry look) | general knowledge, **not verified for Kebon Sirih** |
| palem_raja | *Roystonea regia* | Avenue palm at Central Jakarta offices and boulevards | general knowledge, **not verified** |
| bungur | *Lagerstroemia speciosa* | Purple-flowered native street tree. The nearby area "Bungur" is named after it | general knowledge, **not verified** |
| glodokan_tiang | *Monoon (Polyalthia) longifolium* | Columnar tree common in Jakarta office frontages | general knowledge, **not verified** |
| bugenvil | *Bougainvillea* | Planted on the Kebon Sirih green strip along Kali Cideng (2021) | Lampu Hijau 9 Mar 2021 (https://lampuhijau.co.id/baca-berita/jakarta-city/7573/...) |
| soka | *Ixora* sp. | Planted on Jl. Menteng Raya / Fachrudin in 2021, and in the BI Kebon Sirih garden | Lampu Hijau 2021; Trubus |
| teh_tehan_pagar | *Acalypha siamensis* | Clipped hedges in the BI Kebon Sirih garden | Trubus |
| heliconia | *Heliconia rostrata* | 1,200 were planted on the Jl. Kebon Sirih green lane | Berita Jakarta (https://m.beritajakarta.id/en/read/31072/...) |
| bakung | *Crinum asiaticum* | Stands in for the "lily" planted on the same Kebon Sirih green lane (the article does not name the species) | Berita Jakarta, **species assumed** |
| sirih | *Piper betle* | The plant the area is named after | Kompas "Sejarah Penamaan Daerah Kebon Sirih"; ngopijakarta.com |
| pucuk_merah, puring, lidah_mertua, kuping_gajah (talas), andong_merah, lili_paris | *Syzygium myrtifolium*, *Codiaeum variegatum*, *Dracaena trifasciata*, *Alocasia* sp., *Cordyline fruticosa*, *Chlorophytum comosum* | Standard Jakarta roadside and median planting (from the brief) | general knowledge, **not verified for this street** |
| ground tufts | rumput gajah mini *Axonopus compressus*, kacang hias *Arachis pintoi*, seruni rambat *Sphagneticola trilobata*, *Imperata* | Common Jakarta lawn and groundcover. The Kebon Sirih lane got "hundreds of grass seeds" (species not named) | Berita Jakarta; the species are assumed |

`kriwil` from the brief was **not** made: I could not confirm which plant the name refers to.

## Sprite sizes and pivots (1×)
| file | name | Latin | size w×h | pivot | status |
|---|---|---|---|---|---|
| `trees/pohon_asam_L.png` | Asam jawa (besar, pohon utama) | *Tamarindus indica* | 190×206 | 95,177 | active |
| `trees/pohon_asam_M.png` | Asam jawa (sedang) | *Tamarindus indica* | 148×162 | 74,139 | active |
| `trees/pohon_asam_S.png` | Asam jawa (muda) | *Tamarindus indica* | 108×119 | 54,101 | active |
| `trees/pohon_trembesi_L.png` | Trembesi / ki hujan (besar) | *Samanea saman* | 202×145 | 101,114 | active |
| `trees/pohon_trembesi_M.png` | Trembesi / ki hujan (sedang) | *Samanea saman* | 140×103 | 70,78 | active |
| `trees/pohon_angsana_L.png` | Angsana (besar) | *Pterocarpus indicus* | 140×172 | 70,146 | active |
| `trees/pohon_angsana_M.png` | Angsana (sedang) | *Pterocarpus indicus* | 102×124 | 51,104 | active |
| `trees/pohon_mahoni_L.png` | Mahoni (besar) | *Swietenia mahagoni* | 106×180 | 53,158 | active |
| `trees/pohon_mahoni_M.png` | Mahoni (sedang) | *Swietenia mahagoni* | 78×130 | 39,113 | active |
| `trees/pohon_ketapang_kencana.png` | Ketapang kencana | *Terminalia mantaly* | 110×167 | 55,149 | active |
| `trees/pohon_beringin.png` | Beringin | *Ficus benjamina* | 178×187 | 89,156 | active |
| `trees/pohon_kiara_payung.png` | Kiara payung | *Filicium decipiens* | 112×118 | 56,97 | active |
| `trees/pohon_flamboyan.png` | Flamboyan | *Delonix regia* | 178×137 | 89,111 | active |
| `trees/pohon_tabebuya_kuning.png` | Tabebuya kuning | *Handroanthus chrysotrichus* | 104×156 | 52,139 | active |
| `trees/pohon_palem_raja.png` | Palem raja | *Roystonea regia* | 82×210 | 41,197 | active |
| `trees/pohon_bungur.png` | Bungur | *Lagerstroemia speciosa* | 102×143 | 51,124 | active |
| `trees/pohon_glodokan_tiang.png` | Glodokan tiang | *Monoon longifolium* | 62×186 | 31,175 | active |
| `shrubs_ditahan/semak_bugenvil.png` | Bugenvil | *Bougainvillea spectabilis* | 44×47 | 22,37 | on hold |
| `shrubs_ditahan/semak_soka.png` | Soka | *Ixora sp.* | 44×37 | 22,28 | on hold |
| `shrubs_ditahan/semak_pucuk_merah.png` | Pucuk merah | *Syzygium myrtifolium* | 34×55 | 17,46 | on hold |
| `shrubs_ditahan/semak_teh_tehan_pagar.png` | Teh-tehan (pagar pangkas) | *Acalypha siamensis* | 74×47 | 37,30 | on hold |
| `shrubs_ditahan/tanaman_heliconia.png` | Pisang-pisangan / heliconia | *Heliconia rostrata* | 40×61 | 20,51 | on hold |
| `shrubs_ditahan/tanaman_lidah_mertua.png` | Lidah mertua | *Dracaena trifasciata* | 32×42 | 16,34 | on hold |
| `shrubs_ditahan/tanaman_kuping_gajah.png` | Kuping gajah / talas hias | *Alocasia sp.* | 54×60 | 27,51 | on hold |
| `shrubs_ditahan/tanaman_puring.png` | Puring | *Codiaeum variegatum* | 34×36 | 17,27 | on hold |
| `shrubs_ditahan/tanaman_bakung.png` | Bakung | *Crinum asiaticum* | 48×44 | 24,35 | on hold |
| `shrubs_ditahan/tanaman_andong_merah.png` | Andong merah | *Cordyline fruticosa* | 36×43 | 18,35 | on hold |
| `shrubs_ditahan/tanaman_sirih.png` | Sirih (di tiang bambu) | *Piper betle* | 26×57 | 13,50 | on hold |
| `shrubs_ditahan/tanaman_lili_paris.png` | Lili paris | *Chlorophytum comosum* | 28×14 | 14,6 | on hold |
| `ground/tuft_rumput_a.png` | Rumput gajah mini | *Axonopus compressus* | 20×13 | 10,7 | active |
| `ground/tuft_rumput_b.png` | Rumput (rumpun rapat) | *Axonopus compressus* | 18×11 | 9,6 | active |
| `ground/tuft_ilalang.png` | Rumput liar tinggi | *Imperata cylindrica* | 18×17 | 9,13 | active |
| `ground/tuft_daun_asam_gugur.png` | Daun gugur | *(serasah daun)* | 26×11 | 13,5 | active |
| `ground/tuft_rumput_c.png` | Rumput (kecil) | *Axonopus compressus* | 14×8 | 7,4 | active |
| `ground/tuft_rumput_d.png` | Rumput (hamparan rendah) | *Axonopus compressus* | 26×13 | 13,7 | active |
| `ground/tuft_rumput_e.png` | Rumput (rumpun tinggi) | *Axonopus compressus* | 10×11 | 5,7 | active |
| `ground/tuft_rumput_f.png` | Rumput (sedang) | *Axonopus compressus* | 18×11 | 9,6 | active |
| `ground/overlay_semanggi.png` | Semanggi / daun kecil | *Oxalis sp. (tanpa bunga)* | 20×11 | 10,5 | active |
| `ground/overlay_rumput_kering.png` | Rumput kering hijau-kuning | *Axonopus compressus* | 18×10 | 9,6 | active |
| `ground/overlay_tanah_terbuka.png` | Tanah terbuka kecil | *(tanah)* | 18×9 | 9,4 | active |
| `ground/overlay_semanggi_b.png` | Semanggi hijau (hamparan) | *Oxalis sp. (tanpa bunga)* | 26×13 | 13,6 | active |
| `ground/overlay_daun_kecil.png` | Daun kecil gugur | *(serasah)* | 26×10 | 13,4 | active |
| `ground/prop_kerikil.png` | Kerikil | *(batu)* | 20×12 | 10,6 | active |
| `ground/prop_tunggul.png` | Tunggul pohon | *(potongan batang)* | 28×21 | 14,13 | active |

Tiles (64×32, anchor 32,0, footprint 1×1):
| file | label |
|---|---|
| `tiles/grass_plain_a.png` | Rumput polos A (bercak gelap/terang, rumpun) |
| `tiles/grass_plain_b.png` | Rumput polos B (bercak gelap/terang, rumpun) |
| `tiles/grass_plain_c.png` | Rumput polos C (bercak gelap/terang, rumpun) |
| `tiles/grass_plain_d.png` | Rumput polos D (bercak gelap/terang, rumpun) |
| `tiles/grass_plain_e.png` | Rumput polos E (bercak gelap/terang, rumpun) |
| `tiles/grass_plain_f.png` | Rumput polos F (bercak gelap/terang, rumpun) |
| `tiles/grass_tufty_a.png` | Rumput rimbun (banyak rumpun) A |
| `tiles/grass_tufty_b.png` | Rumput rimbun B |
| `tiles/grass_patch_dark.png` | Bercak gelap (lembap / teduh) |
| `tiles/grass_patch_light.png` | Bercak terang (kena matahari) |
| `tiles/grass_clover_a.png` | Semanggi / daun kecil A |
| `tiles/grass_clover_b.png` | Semanggi / daun kecil B |
| `tiles/grass_leaves_a.png` | Daun kecil gugur A |
| `tiles/grass_leaves_b.png` | Daun asam gugur B (teduh) |
| `tiles/grass_tufty_c.png` | Rumput rimbun C (terang) |
| `tiles/grass_clover_c.png` | Semanggi hijau C |
| `tiles/grass_leaves_c.png` | Daun gugur + rumput kekuningan |
| `tiles/grass_yellowgreen_a.png` | Rumput hijau-kekuningan A |
| `tiles/grass_yellowgreen_b.png` | Rumput hijau-kekuningan B (kering sebagian) |
| `tiles/grass_bare_a.png` | Rumput + tanah terbuka kecil A |
| `tiles/grass_bare_b.png` | Rumput + tanah terbuka kecil B |
| `tiles/grass_dry.png` | Rumput kering / menguning |
| `tiles/grass_dirt.png` | Rumput botak (tanah) |
| `tiles/grass_edge_sw.png` | Tepi paving sisi SW / +r, ke trotoar |
| `tiles/grass_edge_se.png` | Tepi paving sisi SE / +c |
| `tiles/grass_edge_nw.png` | Tepi paving sisi NW / -c |
| `tiles/grass_edge_ne.png` | Tepi paving sisi NE / -r |
| `tiles/grass_corner_out_s.png` | Sudut luar S (paving di sw+se) |
| `tiles/grass_corner_out_w.png` | Sudut luar W (paving di sw+nw) |
| `tiles/grass_corner_out_n.png` | Sudut luar N (paving di nw+ne) |
| `tiles/grass_corner_out_e.png` | Sudut luar E (paving di ne+se) |
| `tiles/grass_corner_in_s.png` | Sudut dalam S (paving hanya di titik S) |
| `tiles/grass_corner_in_w.png` | Sudut dalam W (paving hanya di titik W) |
| `tiles/grass_corner_in_n.png` | Sudut dalam N (paving hanya di titik N) |
| `tiles/grass_corner_in_e.png` | Sudut dalam E (paving hanya di titik E) |
Edge tiles: `edge_sw` is the side toward +r. In the game street that is the lawn's edge against the sidewalk (r 31). `edge_ne` is the opposite side and suits the far planting strip. The edge is a 2–3 px soil strip with darker grass. `corner_out_<v>` = the lawn tile has paving on the two sides that meet at vertex v (s = sw+se, w = sw+nw, n = nw+ne, e = ne+se). `corner_in_<v>` = paving touches only vertex v (a diagonal neighbour), so the tile gets a small soil nib there. In the preview the footpath into the lawn shows edge_se/edge_nw, corner_out_s/corner_out_w at the sidewalk end and corner_in_s/corner_in_w at the far end.

## Palette and NEW colours
Ramps (dark → light, 5 tones each) are in `_work/veg.py` (`R`). Wherever possible they reuse the game's existing greens and browns: `#1A6A3A #22894A #2A9A52 #4FB36B` (tRound/tWide), lawn `#2A9E52 #279249`, trunk `#8A5E3C #6B4F3A #3D2A1E #94704F`, style-sheet greys, guide-strip yellows `#B88C0E #E7B416 #FFD43B #FFE27A`, brass, oxblood.
Audit v3 (trees/, ground/, tiles/ only; the on-hold shrubs are not counted): **70 colours, 25 already in index.html or the style sheet, 45 NEW (need AD sign-off).** Alpha values: 0, 56, 90, 255. The lawn assets (tiles/ and ground/) contain no flower colours (white, yellow, purple). The yellow-green lawn patches reuse the existing `fresh` ramp (`#55A23E #78BE4E #A3D66A`), so no new colour was added.

| new hex | px | used in |
|---|---|---|
| `#155232` | 9738 | beringin, glodokan, mahoni |
| `#1F5F35` | 6459 | asam |
| `#23803F` | 5936 | trembesi |
| `#2A7A3E` | 4297 | asam |
| `#3C8834` | 4052 | flamboyan, ilalang, ketapang, rumput, tabebuya |
| `#2F9A48` | 3645 | trembesi |
| `#0F3F26` | 3440 | beringin, glodokan, mahoni |
| `#4F3727` | 3396 | asam, bare, corner, daun, edge, glodokan, kiara, leaves, mahoni, tanah, trembesi, tunggul |
| `#33AA5A` | 2913 | bare, clover, corner, dirt, dry, edge, leaves, patch, plain, tufty, yellowgreen |
| `#134F2E` | 2232 | angsana, bungur, palem |
| `#55A23E` | 2119 | flamboyan, ketapang, leaves, tabebuya, yellowgreen |
| `#2B6A2C` | 2013 | flamboyan, ilalang, ketapang, rumput, tabebuya |
| `#5E5347` | 1906 | angsana, beringin, bungur, flamboyan, ketapang, tabebuya |
| `#1A5E32` | 1881 | trembesi |
| `#1A6338` | 1863 | kiara |
| `#18492C` | 1622 | asam |
| `#3C944B` | 1373 | asam |
| `#4DB35A` | 1352 | trembesi |
| `#237F45` | 1091 | kiara |
| `#4A4038` | 1049 | angsana, beringin, bungur, flamboyan, ketapang, tabebuya |
| `#124A2B` | 763 | kiara |
| `#E0522B` | 633 | flamboyan |
| `#78BE4E` | 625 | flamboyan, ilalang, ketapang, leaves, rumput, tabebuya, yellowgreen |
| `#8F8574` | 594 | palem |
| `#9C7FD6` | 547 | bungur |
| `#B8381F` | 537 | flamboyan |
| `#7A5BB0` | 471 | bungur |
| `#FF7A3D` | 448 | flamboyan |
| `#AFA592` | 441 | palem |
| `#C4B0F0` | 387 | bungur |
| `#31A055` | 348 | kiara |
| `#3FA45E` | 271 | beringin, glodokan, mahoni |
| `#84CB6C` | 244 | trembesi |
| `#62B061` | 232 | asam |
| `#8A6A0C` | 148 | tabebuya |
| `#6E6658` | 146 | palem |
| `#A3D66A` | 128 | flamboyan, ketapang, leaves, tabebuya, yellowgreen |
| `#A8955A` | 123 | bare, dry, leaves |
| `#FFA25C` | 121 | flamboyan |
| `#8C7A3E` | 86 | bare, daun, dry, leaves, rumput, tunggul |
| `#58BD6B` | 46 | kiara |
| `#6B5A2E` | 42 | daun, rumput, tunggul |
| `#3E2B57` | 28 | bungur |
| `#8E2A1C` | 27 | flamboyan |
| `#A87C55` | 16 | tunggul |

## Limitations (read before using)
- **Preview quality, procedural.** Canopies are made from layered shaded leaf blobs. Up close the leaf texture is noisier and less "hand-clustered" than the reference sheet. Species read mainly by silhouette and colour, not by leaf detail (tamarind's fine pinnate leaves and angsana's drooping leaves are suggested, not drawn).
- **v2 sprite sizes grew** (for example asam_L is now wider) because the right-shifted canopy shadow is part of the PNG. Pivots stay at the trunk base, with pivot x = w/2 (canvas padded symmetrically).
- With shrubs sharing the lawn ramp, low green shrubs (bugenvil leaves, soka, pucuk merah base) separate from the lawn mainly through the shadow and the darker lower edge. The clipped teh-tehan hedge uses the darker `kiara` ramp so it still reads as a block.
- **Scale vs the current game trees:** the game draws trees as SVG at s=1.8 (tRound is about 94×120 px at PPU 2). The new hero asam_L is 172×205 and trembesi_L is 204×145 (about 3.2 tiles wide), so both are bigger than the current trees on purpose (old shade trees, about 2.3× avatar height). The M/S sizes are close to the current size. Real trees would be far taller; heights are compressed for the game.
- **Shadow mismatch:** the game's SVG trees use `SHD = rgba(28,35,48,.18)`. These sprites follow the baked-sprite rule (black, alpha 56, as in street_vehicles). Under the outdoor colour grade they may look slightly darker than the current tree shadows.
- Game colours: non-brand outdoor colours pass through `gradeRGB`/`palNear` in game. These PNGs are **ungraded**, so flowers and greens may shift if they are run through the grade.
- Pivot = trunk ground point. If the game places trees at tile centres (c+0.5, r+0.5), pass that point as P(c,r).
- Only one facing is drawn. Mirroring (sw ↔ se) works for every plant; the asam crown leans slightly toward +x.
- Grass tiles: every scatter feature is wrapped on a torus in tile (u,v) space, so a tile next to a copy of itself is seamless. Between different variants, a feature that crosses the border is cut. At 1× the lawn now reads mottled rather than flat, but the variation is deliberately low-contrast; at 4× close up it can still look fairly even. Only one new colour was added for it.
- Edge and corner tiles cover straight edges and 90° corners of the iso grid only; there are no curved edges.
- Species marked **not verified** above are common Jakarta street planting, not confirmed for Jl. Kebon Sirih itself. The "lily" → bakung and "grass" → rumput gajah mini mappings are assumptions.
- The heliconia, puring and andong merah shapes are simplified. Tabebuya and flamboyan are drawn in full bloom (seasonal); a green-only variant was not made.

## v2 changes (1 Nov 2026)
1. **Cohesion:** the grass skirt uses the lawn tone with darker contact tones and a dissolving rim, has no dark edge line, and adds blades over each base. Shrub foliage tone 3 is now the lawn colour.
2. **Shadows:** a bigger canopy shadow made from one ellipse per clump, shifted right (alpha 56), plus a contact patch (alpha 90). Every hedge, shrub, plant, stump and pebble has one. This **adds a second alpha level (90)** (see Conventions).
3. **Lawn:** 31 tiles (was 12), including 4 outer and 4 inner corners and torus-wrapped scatter. 9 new lawn scatter overlays in `ground/`. The preview shows a large lawn with a footpath.

## v3 changes (1 Nov 2026, ~11:42 WIB)
Feedback from Ichsan: the v2 trees are fine; don't use the shrubs for now; there are no flowers in Kebon Sirih; "try the grass without flowers".
1. Backup of v2 in `_prev_v2/`.
2. **Removed every flower from the lawn:**
   - tiles: `flowers_yellow`, `flowers_white` and `flowers_mixed` are gone. Yellow leaf litter is now brown/soil.
   - ground: `tuft_kacang_hias`, `tuft_seruni_rambat` and `overlay_bunga_putih/kuning/ungu` are gone. `tuft_daun_asam_gugur` and `overlay_daun_kecil` lost their yellow pixels.
3. **New non-flower variety:**
   - tiles: `tufty_c`, `clover_c` (green clover), `leaves_c`, `yellowgreen_a/b` (partly dry yellow-green grass), `bare_a/b` (small bare-soil patches). In total: 35 tiles = 23 fill + 4 edges + 4 outer corners + 4 inner corners.
   - ground: `overlay_rumput_kering`, `overlay_tanah_terbuka`, `overlay_semanggi_b`.
   - Edges and corners, the tree grass skirts, and the 2-level shadows (alpha 56/90) are unchanged.
4. **Shrubs on hold:** `shrubs_ditahan/`, `status: on hold` in the manifest, and they no longer appear in the contact sheet or the street preview.
5. **Street preview:** trees + lawn only. The flowering trees (flamboyan, tabebuya, bungur) are swapped in the preview for asam S, mahoni M and angsana M. The large lawn now fills the whole frame.
6. Small display versions: `/workspace/veg_close.png` (4× close-up, 1600×1000) and `/workspace/veg_street_small.png` (2× crop of the street, 2400×1556).

v3 limitations:
- The tree sprites are unchanged from v2. The **flamboyan, tabebuya and bungur sprites still have flowers** and still appear in the contact sheet (the brief said to keep the trees). They are just not used in the street preview. If "no flowers" also applies to trees, they need a green-only version or should be put on hold.
- Leaf litter and bare-soil pixels are brown. At small scale, single brown or reddish pixels can be mistaken for tiny flowers.
- The lawn green stays low-contrast; at 4× close up some areas still look fairly even.
