# Street riders v2 (ojol, SMA triple, batik commuter): preview only

Made 1 Nov 2026, ~02:40 WIB (UTC+7). **Preview only. Nothing is wired into the game.** `game/index_extract.txt` and the v1 files (`../riders/`, `../manifest.json`, `../_work/`) were not changed, and no other agent was contacted.

## What changed from v1
- **Bodies now come from the office-NPC generator.** v1 riders were custom SDF figures, taller and with small heads. v2 riders are built with the same v6b generator the office NPCs use (`chars-iso/v6b/tools`: `live_v6b` poses, `parts_v6b`, `npc_v6b` make_cfg/hijab/skirt/ponytail). They use the game's seated pose rows unscaled: drivers use `sit_type` (arms forward), passengers and SMA girls use `sit`. Head, body, arm and leg sizes are the same pixels as the NPCs.
- **Scooter:** the v1 scooter geometry and renderer (`../_work/sdf.py`, ramps from `../_work/cars.py`), rendered in 3 groups so the riders can sit between them: wheels + flat shadow, rear body (cowl, seat, bag), front body (floor, leg shield, headlamp, bars). Draw order: se/sw = wheels, rear, riders back-to-front, front; ne/nw = wheels, front, riders front-to-back, rear.
- **Rider-only extras** are drawn as code layers on the v6b canvas, the same way npc_v6b adds hijab/cap (`_work/chars.py`):
  - **Helmet:** the hair becomes a shell with 1 px of extra bulk, edge tone, top-left highlight and a dark visor band at rows 11-12, just above the eyes. Brows are hidden. Long hair (Gojek passenger) still shows below the shell.
  - **Gojek:** green jacket (`hoodie` = cardigan, dark inner shirt), green helmet, brown trousers, red food bag on the solo rider, and a white logo mark (2×2 on the chest, ring on the back).
  - **Maxim:** yellow jacket, yellow helmet, and a red mark on the chest and back. The passenger has a dark helmet and a maroon tee.
  - **SMA triple:** long-sleeve white shirts and long grey skirts (npc_v6b `skirt('long')`). Front and back girls wear white hijab; the middle girl has black hair, so the three heads read as three. Faces are `happy`/`smile`/`happy` (laughing, as in the photo). They wear no helmets, as in the photo.
  - **New: plain commuter** in a short-sleeve batik shirt, 3 variants:
    - `sogan`: brown `#6B4F3A` with ivory broken diagonal *parang* bands, black helmet, black scooter.
    - `blue`: indigo `#27386B` with `#7A9FB2` 4-px *kawung* rosettes, white helmet, silver scooter.
    - `red`: maroon `#7A2E35` with gold `#E0A526` 3-px *truntum* dots, grey helmet, red scooter.
    - The motif repeats every 3-4 px and is shaded: light motif on lit tones, darker motif on shaded tones, and the shirt edge tone is kept.
- **Animation (all 4 directions, 4 frames, loop, 120 ms suggested):**
  - scooter body bobs `[0,-1,0,0]` px;
  - riders follow one frame later `[0,-1,-1,0]`;
  - the wheel spokes switch between 2 phases (f0/f2 vs f1/f3);
  - the wheels and the alpha-56 shadow stay on the ground.

## Files
| path | what |
|---|---|
| `frames/<name>_<dir>_f<0-3>.png` | 8 riders × 4 dirs (se, sw, ne, nw) × 4 frames = 128 PNGs, transparent, 1x |
| `sheets/<name>_sheet.png` | per rider: 4 columns (f0-f3) × 4 rows (se, sw, ne, nw). Cell = the `size` below |
| `manifest.json` | per rider+dir: frames, size, pivot, footprint, game anchor (se/nw), note; plus animation offsets |
| `previews/riders_v2_all_4x.png` | 4x sheet: v1 se (old) next to v2 se/sw/ne/nw f0 + se f1-f3 for every rider |
| `previews/riders_v2_ride_loop_4x.gif` | all riders, 4 dirs, ride loop, 4x |
| `previews/street_lanes_riders_v2_4x.gif` (+ `_frame.png`) | both game street lanes (se lane r 33.05, nw lane r 34.85, road rebuilt from the v1 scene colours), 14 riders moving, 4x |
| `_work/` | `chars.py` (v6b riders + helmet/logo/batik), `scoot.py` (split scooter), `riders_v2.py` (rider list + compositing), `produce.py` (frames, sheets, manifest), `previews.py`, `colour_audit.json` |

Rebuild: `cd _work && python3 produce.py && python3 previews.py` (~25 s).

## Sizes, pivots, anchors
`pivot` = px of the ground point under the scooter footprint centre, same meaning as v1. `anchor P(0,lane)` uses the same formula as v1 (footprint c 0..L, r lane+0.15..lane+0.85). Every frame and direction of one rider has the same size. sw/ne have no game anchor because the street only uses se/nw.

| rider | size w×h | pivot | anchor se / nw | footprint tiles | note |
|---|---|---|---|---|---|
| `gojek` | 60×87 | 30,75 | [25, 57] / [25, 57] | 1.3 × 0.7 | Gojek driver + red food bag (replaces game moto) |
| `gojek_pax` | 54×92 | 27,80 | [22, 62] / [22, 62] | 1.3 × 0.7 | Gojek driver + passenger (green pax helmet) |
| `maxim` | 54×87 | 27,75 | [22, 57] / [22, 57] | 1.3 × 0.7 | Maxim driver |
| `maxim_pax` | 54×92 | 27,80 | [22, 62] / [22, 62] | 1.3 × 0.7 | Maxim driver + passenger |
| `sma_triple` | 66×96 | 33,82 | [24, 62] / [24, 62] | 1.55 × 0.7 | 3 SMA girls on one scooter (front + back hijab, middle hair) |
| `commuter_batik_sogan` | 54×87 | 27,75 | [22, 57] / [22, 57] | 1.3 × 0.7 | plain commuter, brown sogan batik (parang stripes), black helmet |
| `commuter_batik_blue` | 54×87 | 27,75 | [22, 57] / [22, 57] | 1.3 × 0.7 | plain commuter, indigo batik (kawung rosettes), white helmet |
| `commuter_batik_red` | 54×87 | 27,75 | [22, 57] / [22, 57] | 1.3 × 0.7 | plain commuter, maroon batik (gold truntum dots), grey helmet |

The v6b figures inside keep their 64×112 / pivot (32,100) logic. Each figure's pivot is placed at scooter-local (hip_x + 1.5, 0, 2), which puts the v6b seated hip line (frame y 80) on the seat top (~22 px). The sprite canvas is cropped to the union bbox, so it is not 64×112.

## Limitations
- **No handlebar grip pose.** The generator has no riding pose. Drivers use `sit_type` arms, and the hands end at lap height behind the leg shield, with the handlebar drawn in front. At 1x this reads as holding the bars, but at 4x the hands do not touch the grips.
- **Legs are mostly hidden.** In se/sw the leg shield covers the driver's shins. In ne/nw the rear body (and the Gojek bag) is drawn over the riders' lower bodies. The v6b back-view sit legs hang straight down, so they are hidden instead of straddling the seat.
- **sw/nw riders are mirrors of se/ne**, as in the game, while the scooter is rendered per direction. The chest logo and batik pattern flip with the figure.
- **Overlap:** the v6b heads are large compared with the v1 scooter (which was not rescaled). Two- and three-person riders overlap a lot: in se/sw the SMA heads overlap by about half. In ne/nw the SMA girls show as two white hijab backs and one black head, with no faces.
- **SMA hijab count:** the brief said "hijab on some", so 2 of 3 wear hijab. The reference photo shows all 3 in hijab; switching the middle girl is a one-line change in `riders_v2.py`.
- **Maxim helmet:** yellow as briefed. Many drivers in the Maxim reference wear black helmets.
- **Logos** are 2×2 / 5×4 px marks, not the real Gojek or Maxim logos.
- **Batik at 1x:** the blue kawung and red truntum read as a repeated motif. The sogan parang reads more like fine diagonal hatching than true parang.
- **Animation is minimal.** The bob is 1 px. The spoke flicker uses only 2 phases, so the wheel direction is ambiguous, and the spokes are 1-2 px at 1x. The game currently moves vehicles with one CSS translate and no frames, so using these needs a per-frame image swap (e.g. a CSS `steps()` sprite-sheet animation on the `sheets/` row).
- **Not checked in-game** (headless render or AD review).

## Colours
Audit of every opaque pixel in `frames/`: **151 colours. Alpha values are 0 / 56 / 255 only.**
- 55 already appear in index.html or the style sheet.
- 30 more appear in the live v6b NPC sheets.
- 27 more are v1 street_vehicles colours, already listed as NEW in `../README.md`.
- **39 do not appear anywhere before.** They are listed below as NEW and need AD sign-off.

Most of the new colours are generator ramps (`npc_v6b.ramp` / pal6 cloth tones) of these rider bases, added to the generator colour table in memory only:
- Gojek green `#2EB84A` (FamilyMart trim colour, already in the game)
- Maxim yellow `#F2C14E` (the v6b `tee_graphic` yellow)
- SMA skirt grey `#8D97A8`
- batik bases sogan `#6B4F3A`, indigo `#27386B`, maroon `#7A2E35`
- white hijab / white helmet (`paper` `#E7EBF2` ramp)
- the batik motif shade tones

| hex | px per frame (all riders) | used in |
|---|---|---|
| `#F2C14E` | 1702 | maxim, maxim_pax |
| `#289E40` | 845 | gojek, gojek_pax |
| `#7A614E` | 768 | commuter_batik_sogan, gojek, gojek_pax |
| `#7F8185` | 702 | commuter_batik_blue, sma_triple |
| `#AE8B38` | 669 | maxim, maxim_pax |
| `#218435` | 660 | gojek, gojek_pax |
| `#828995` | 611 | commuter_batik_blue |
| `#D0A643` | 608 | maxim, maxim_pax |
| `#39312F` | 478 | gojek_pax |
| `#C7CAD0` | 472 | commuter_batik_blue, sma_triple |
| `#196529` | 466 | gojek, gojek_pax |
| `#98A1B1` | 444 | sma_triple |
| `#DAAE46` | 407 | maxim, maxim_pax |
| `#636A76` | 389 | sma_triple |
| `#29A643` | 388 | gojek, gojek_pax |
| `#4B3729` | 346 | gojek, gojek_pax |
| `#51555C` | 328 | commuter_batik_blue |
| `#7C8594` | 322 | sma_triple |
| `#ABB0B8` | 308 | commuter_batik_blue |
| `#4D5766` | 304 | commuter_batik_red |
| `#856A2B` | 290 | maxim, maxim_pax |
| `#5E4633` | 267 | gojek, gojek_pax |
| `#5CC872` | 252 | gojek, gojek_pax |
| `#4D392A` | 228 | commuter_batik_sogan |
| `#ECEFF5` | 180 | commuter_batik_blue, sma_triple |
| `#F5CF75` | 168 | maxim, maxim_pax |
| `#323841` | 166 | commuter_batik_red |
| `#C69E40` | 122 | maxim, maxim_pax |
| `#26973D` | 110 | gojek, gojek_pax |
| `#1B274B` | 106 | gojek_pax |
| `#604734` | 90 | commuter_batik_sogan |
| `#22315E` | 88 | gojek_pax |
| `#7E8795` | 84 | commuter_batik_red |
| `#5F7C8B` | 76 | commuter_batik_blue |
| `#DBE0E5` | 50 | commuter_batik_blue |
| `#AF811E` | 40 | commuter_batik_red |
| `#423124` | 40 | commuter_batik_sogan |
| `#B9B3A8` | 40 | commuter_batik_sogan |
| `#45443C` | 6 | gojek_pax |
