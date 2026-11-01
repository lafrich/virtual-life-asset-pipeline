# Street vehicles: preview-only redesign (Virtual Office / baymax)

Status: **preview only.** Nothing here is wired into the game. `game/index_extract.txt` was read but not edited, and nobody was messaged.
Run history: run 1 (31 Oct, ~23:00 WIB) drew all the sprites and 4 sheets but stopped before the GIF and this README. Run 2 (1 Nov, ~02:05 WIB) reused that work. It changed the SMA hijab/shirt ramps so the three white heads read as three separate heads, re-rendered everything, and added the street GIF, the colour audit and this README.

## What the game has now (read from index.html, `vehicle()` ~line 2701)
- Cars are **procedural SVG boxes** (`bx()` prisms plus flat polygon wheels), drawn once. Each one is moved by **one CSS translate animation** (`.extcar.cA` = driving +c / `cB` = driving −c). They have **no frames and no wheel animation**.
- The street runs along c only, so the game shows just **2 directions**: dirn +1 (screen **se**, lane r 33.05) and dirn −1 (screen **nw**, lane r 34.85).
- Kinds in code: `sedan` (L 2.9), `taxi` (MPV-ish, L 3.1), `van` (L 3.4, not in the traffic list), `bus` (Transjakarta, L 6.6, band r0−0.1..r0+1.2), `moto` (green rider, not in the traffic list). No angkot and no pickup.
- Traffic in use: sedan red `#FF5A5F/#E0434A/#B8323A`, sedan teal `#2EC4B6/#22A094/#1B7F76`, taxi `#45B3E6/#2F97CF/#2479AD`, bus `#2C6BD8/#F4F1EA/#2457B8`. Taxi and bus are `data-ng` (brand colours, not passed through the outdoor grade). Other outdoor colours go through `gradeRGB`/`palNear`. `_work/grade.py` ports that, so the new sedan and hatchback body colours are the **graded** versions of the game colours.
- The "before" column in the before/after sheet was baked from the live `vehicle()` code (headless Chrome) into `_work/before/`.

## Deliverables
| file | what |
|---|---|
| `cars/*.png` | 7 vehicles × 4 dirs (se, nw, sw, ne): sedan red, sedan teal, hatchback orange (new kind), MPV silver (Avanza/Innova-ish, new kind), Bluebird taxi (Vios-style sedan, replaces the game's boxy taxi), van cream, Transjakarta bus |
| `riders/*.png` | gojek, gojek_pax, maxim, maxim_pax, sma_triple × 4 dirs |
| `previews/before_after_4x.png` | game sprites (before) next to the new ones (after), se + nw, 4x |
| `previews/cars_all_4x.png`, `bus_4x.png`, `riders_all_4x.png` | all new sprites, 4 dirs, 4x |
| `previews/street_scene_4x.gif` (+ `_frame.png`) | 64 frames at 80 ms, 4x. Both lanes of the game's street cross-section (paving, tactile strip, curb, asphalt, edge lines, yellow dashed centre) rebuilt from the index.html colours as a flat strip, with traffic at roughly the game speed (~5 tiles/s) |
| `manifest.json` | per-sprite size, pivot, footprint and game anchor |
| `_work/` | generator (Python SDF raymarch then quantise to material ramps): `car_defs.py`, `cars.py`, `riders.py`, `sdf.py`, `grade.py`, `produce.py` (sprites + manifest), `sheets.py` (4x sheets), `scene.py` (GIF). `riders_v1_backup.py` = run-1 riders before the hijab ramp tweak |

Rebuild: `cd _work && python3 produce.py && python3 sheets.py && python3 scene.py` (~1 min).

## Style rules followed
1x pixels, transparent background, iso 2:1 (1 tile = 64×32 px, 1 height unit = 3.2 px, the same PPU 2 the baked game sprites use). v6b: no black outline; edges use a darker tone of the same material; light from the left; a 4 or 5 tone ramp per material. Shadow: flat black at **alpha 56** (the audit found only alpha values 0 / 56 / 255).
Less boxy: rounded hood and trunk, sloped windscreen and rear glass, wheel arches, a slight roof curve, diagonal glass glints, bumpers with head/tail lights.

## Mapping to the game (sizes, pivots)
`pivot` = pixel of the ground point under the footprint centre. `anchor P(0,lane)` = pixel of the world point `P(0,lane)` at h=0, which is the origin `vehicle()` draws from. To swap one in, put an `<image>` at `P(0,lane) − anchor/PPU` with width = size/PPU (PPU 2) inside the same `.extcar` group. The CSS translate animation stays as it is. Footprint lengths and lane bands match the game kinds (sedan 2.9, taxi 3.1, van 3.4, bus 6.6), so they fit the current lanes. The sw/ne sprites are extras: the current street has no use for them.

| sprite (x4 dirs: se, nw, sw, ne) | size px (w×h) | pivot = footprint-centre ground px | game anchor P(0,lane) px (se / nw) | footprint tiles (L × w) | game equivalent |
|---|---|---|---|---|---|
| `cars/sedan_red_<dir>.png` | 146×138 | 73,100 | [45, 68] / [45, 68] | 2.9 × 1.05 | vehicle('sedan',lane,dirn,['#FF5A5F','#E0434A','#B8323A']) |
| `cars/sedan_teal_<dir>.png` | 146×138 | 73,100 | [45, 68] / [45, 68] | 2.9 × 1.05 | vehicle('sedan',lane,dirn,['#2EC4B6','#22A094','#1B7F76']) |
| `cars/hatchback_orange_<dir>.png` | 136×132 | 68,96 | [45, 66] / [45, 66] | 2.6 × 1.05 | new kind (no game equivalent) |
| `cars/mpv_silver_<dir>.png` | 152×144 | 76,104 | [45, 70] / [45, 70] | 3.1 × 1.08 | new kind (no game equivalent) |
| `cars/taxi_bluebird_<dir>.png` | 152×148 | 76,108 | [45, 74] / [45, 74] | 3.1 × 1.05 | vehicle('taxi',lane,dirn,['#45B3E6','#2F97CF','#2479AD']) (data-ng brand colours) |
| `cars/van_cream_<dir>.png` | 162×162 | 81,120 | [46, 83] / [46, 83] | 3.4 × 1.1 | vehicle('van',...) (in code, not in the current traffic list) |
| `cars/bus_transjakarta_<dir>.png` | 272×256 | 136,186 | [48, 124] / [48, 124] | 6.6 × 1.3 | vehicle('bus',lane,dirn,['#2C6BD8','#F4F1EA','#2457B8']) (data-ng brand colours) |
| `riders/gojek_<dir>.png` | 80×116 | 40,94 | [35, 76] / [35, 76] | 1.3 × 0.7 | replaces vehicle('moto',...) (in code, not in the current traffic list) |
| `riders/gojek_pax_<dir>.png` | 80×116 | 40,94 | [35, 76] / [35, 76] | 1.3 × 0.7 | new (moto + passenger) |
| `riders/maxim_<dir>.png` | 80×116 | 40,94 | [35, 76] / [35, 76] | 1.3 × 0.7 | new (moto variant) |
| `riders/maxim_pax_<dir>.png` | 80×116 | 40,94 | [35, 76] / [35, 76] | 1.3 × 0.7 | new (moto + passenger) |
| `riders/sma_triple_<dir>.png` | 88×120 | 44,96 | [35, 76] / [35, 76] | 1.55 × 0.7 | new (moto variant, 3 riders) |

## Colours
Audit of every opaque pixel in `cars/` + `riders/`: **136 colours. 46 of them already appear in index.html or the style sheet. 90 do not. All 90 are marked NEW and need AD sign-off.** Most fall into three groups:
- **graded body ramps**: sedan/hatch/MPV/van tones from the game colours run through the ported outdoor grade. The game produces similar values at runtime, but they are not written in the source.
- **glass ramp** `#7A9FB2 → #4F6A86 → #2E3B52 → #1C2330`. `#4F6A86` and `#2E3B52` are new and are the most-used new colours.
- **brand ramps**: Bluebird `#5CC3EE`…, TJ blue `#3F7FE0`/`#5C95EA`/`#1A3F87`, Gojek green `#3FC15F`…, Maxim yellow, the SMA hijab/shirt whites.
Main brand bases chosen in the generator: TJ bus `#3F7FE0` (lighter and brighter than the game's `#2C6BD8`, to match the real TJ blue), Bluebird `#5CC3EE`, Gojek green from `#35C46A` graded, Maxim yellow `#FFC93C`/`#FFE27A`, SMA skirt `#8D97A8` grey-blue, scooter blue `#3F63E8`.

Full list of NEW colours (sorted by pixel count):

| hex | px (all sprites) | used in |
|---|---|---|
| `#2E3B52` | 26636 | bus_transjakarta, gojek, gojek_pax, hatchback_orange, maxim, maxim_pax, mpv_silver, sedan_red, sedan_teal, taxi_bluebird, van_cream |
| `#4F6A86` | 26106 | bus_transjakarta, gojek, gojek_pax, hatchback_orange, maxim, maxim_pax, mpv_silver, sedan_red, sedan_teal, taxi_bluebird, van_cream |
| `#3F7FE0` | 24185 | bus_transjakarta |
| `#E6D9C0` | 12867 | van_cream |
| `#CFC2AA` | 11524 | van_cream |
| `#AAA191` | 10760 | van_cream |
| `#BFCAD0` | 8366 | mpv_silver |
| `#DC5F5D` | 7413 | sedan_red |
| `#35B4A6` | 7413 | sedan_teal |
| `#5CC3EE` | 7232 | taxi_bluebird |
| `#D79054` | 7047 | hatchback_orange |
| `#A0A8B3` | 6588 | maxim, maxim_pax, mpv_silver |
| `#787F8D` | 4567 | mpv_silver |
| `#D2702F` | 4056 | hatchback_orange |
| `#D54446` | 4032 | sedan_red |
| `#27908A` | 4032 | sedan_teal |
| `#AF3644` | 3433 | sedan_red |
| `#227D79` | 3433 | sedan_teal |
| `#A46030` | 3373 | hatchback_orange |
| `#5C95EA` | 2207 | bus_transjakarta |
| `#3FC15F` | 1796 | gojek, gojek_pax |
| `#1A3F87` | 1621 | bus_transjakarta |
| `#D5DDE0` | 1494 | mpv_silver |
| `#ECD077` | 1409 | maxim, maxim_pax |
| `#69645A` | 1304 | van_cream |
| `#242633` | 1099 | gojek, gojek_pax, sma_triple |
| `#4A4F57` | 991 | mpv_silver |
| `#95D8F4` | 987 | taxi_bluebird |
| `#EC818E` | 923 | van_cream |
| `#E5B790` | 914 | hatchback_orange |
| `#DF506C` | 912 | van_cream |
| `#E89796` | 908 | sedan_red |
| `#7CCEC5` | 908 | sedan_teal |
| `#663C1E` | 894 | hatchback_orange |
| `#EFE6D6` | 881 | van_cream |
| `#329C54` | 868 | gojek, gojek_pax |
| `#6C212A` | 854 | sedan_red |
| `#154E4B` | 854 | sedan_teal |
| `#1D5E80` | 812 | taxi_bluebird |
| `#E9E1D4` | 810 | maxim, maxim_pax |
| `#444A58` | 807 | gojek, gojek_pax |
| `#D9DEE6` | 752 | sma_triple |
| `#E0B145` | 651 | maxim, maxim_pax |
| `#19522B` | 639 | gojek, gojek_pax |
| `#288445` | 607 | gojek, gojek_pax |
| `#5A4130` | 593 | gojek, gojek_pax |
| `#DDA739` | 593 | maxim, maxim_pax |
| `#2E2F3D` | 590 | gojek, gojek_pax |
| `#C7D0D7` | 589 | maxim, maxim_pax |
| `#82D797` | 572 | gojek, gojek_pax |
| `#896823` | 537 | maxim, maxim_pax |
| `#D7494A` | 458 | gojek, gojek_pax, maxim, maxim_pax |
| `#3B4A91` | 424 | sma_triple |
| `#4C64BE` | 402 | sma_triple |
| `#F3E0A7` | 396 | maxim, maxim_pax |
| `#63686F` | 344 | maxim, maxim_pax |
| `#161820` | 336 | gojek, gojek_pax |
| `#2D5A8A` | 314 | gojek_pax, maxim_pax |
| `#7A66A0` | 244 | maxim_pax |
| `#2A1C14` | 233 | gojek, gojek_pax |
| `#564367` | 192 | maxim_pax |
| `#4251A0` | 187 | sma_triple |
| `#443452` | 176 | maxim_pax |
| `#B07A55` | 172 | gojek_pax, maxim_pax, sma_triple |
| `#B33553` | 164 | gojek, gojek_pax, maxim, maxim_pax |
| `#24466E` | 164 | gojek_pax, maxim_pax |
| `#E0DED5` | 153 | gojek, gojek_pax, maxim, maxim_pax, taxi_bluebird |
| `#472522` | 152 | gojek, gojek_pax, maxim, maxim_pax |
| `#252E5A` | 146 | sma_triple |
| `#7C879B` | 129 | sma_triple |
| `#1A3350` | 128 | gojek_pax, maxim_pax |
| `#5A1F26` | 127 | gojek, maxim, maxim_pax |
| `#1D2F80` | 118 | taxi_bluebird |
| `#24399A` | 104 | taxi_bluebird |
| `#723B37` | 104 | gojek, gojek_pax, maxim, maxim_pax |
| `#2A2033` | 85 | maxim_pax |
| `#F1ECE3` | 57 | maxim, maxim_pax |
| `#858992` | 56 | gojek, gojek_pax |
| `#8A3243` | 54 | van_cream |
| `#E58989` | 50 | gojek, gojek_pax, maxim, maxim_pax |
| `#EE8997` | 37 | van_cream |
| `#F7E1CB` | 37 | sma_triple |
| `#3A8FD0` | 30 | bus_transjakarta |
| `#8B9AD5` | 28 | sma_triple |
| `#0A0C0F` | 24 | sma_triple |
| `#191C24` | 24 | sma_triple |
| `#A99CC1` | 23 | maxim_pax |
| `#15215C` | 22 | taxi_bluebird |
| `#71727A` | 13 | sma_triple |
| `#101318` | 13 | sma_triple |

## Limitations (honest)
- **These do not drop in as-is.** The game draws vehicles as SVG vectors and has no sprite path for them. Swapping them in means changing `vehicle()` to place an `<image>` at the anchor. The anchors and footprints are in the manifest, but nobody has tested them in the live game.
- **No animation frames.** The game has no per-vehicle frames (only the CSS translate), so these are single static frames. They have no wheel spin and no rider bob. The brief asked for 2 frames only "if vehicles are animated in game", and they are not.
- **Missing types:** no pickup and no angkot, because the game has neither. The set covers sedan ×2, hatchback, MPV, taxi, van and bus.
- **Brand marks are tiny.** At this scale, the Bluebird "bird" is a 7×5 px mark on the door, the TRANSJAKARTA side lettering is a 5 px pixel font, the Gojek "gojek" text is a white band on the sleeve, and the Maxim logo is a ~4 px red ring (chest and back). None of them are faithful logos. No Indonesian flag patch. The Maxim face mask is only a dark lower-face band.
- **TJ bus** is a generic single-body low-floor bus in TJ blue with a white lower stripe and side doors. It does not copy a specific real model or the exact livery.
- **SMA triple:** the three riders are at the edge of what reads at 1x. The hijabs read as three white blobs; "covering face" and "waving" read as arm poses, not expressions. White socks and black shoes are only a couple of pixels.
- **Rider scale:** riders are a little larger than the game's old `moto` (a ~30 px vertical stick) so the people read at all. Compare them with the avatar size before you use them.
- **Street GIF:** the road is a flat Python re-draw from the game's colours and patterns, not a capture of the live game. Vehicles pop in and out at the strip ends. Depth sort is lane first, then c.
- Run 2 checked the sheets once at 4x and fixed only the SMA head separation and the GIF depth order. Nothing else was revised.
