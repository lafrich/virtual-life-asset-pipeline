# Street riders v3: hands on the handlebar grips (preview only)

Made 1 Nov 2026, ~03:00 WIB (UTC+7). **Preview only.** Nothing was wired into the game, `index.html` was not edited, v1/v2 were not overwritten, and nobody was contacted.
Based on `../riders_v2`. Orientation is **unchanged** (se / sw / ne / nw, 3/4 iso, same as v2 and the live cars). A side-profile rebuild was asked for and then cancelled, so it was not done.

## What changed from v2
**Only the arms.**
- The v6b `sit_type`/`sit` arm layers are no longer drawn. `chars.frame(..., noarms=True)` returns the arm pixels so the arms can be redrawn with the same sleeve and skin tones.
- **Each arm is redrawn** as a 2-segment v6b-thick arm:
  - It runs from the v6b shoulder (top of the original arm layer) through an elbow that sags 2 px.
  - The fist is a 3×3 skin block with rounded corners.
  - Sleeve tones cover the whole arm for long sleeves (`hoodie`/`tee_long`/`shirt_l`: ojol jackets, Gojek passenger, SMA shirts). Otherwise they cover the upper 70 % and the forearm is skin (batik shirts, Maxim passenger tee).
  - Shading is left/top-lit; the edges use the darkest tone of the same material.
- **Drivers** (Gojek, Maxim, the 3 batik commuters, the SMA front girl): both fists sit on the grips at scooter-local (12.3, ±6.4, 32.5).
  - A dark bar-end (2 px) sticks out past each fist, so the hand reads as wrapped round the grip.
  - The grips follow the scooter bob and the shoulders follow the rider bob, so the arms flex by 1 px during the ride loop.
- **Passengers** (Gojek/Maxim pax, SMA middle and back girls): both hands are on the waist of the rider in front, at local (front hip − 1, ±4.6, 30).
- **Draw order:**
  - se/sw: rear body → far arm → rider → front body → far fist → near arm and fist.
  - ne/nw: front body → arms → rider → rear body.
  - Shoulder and target are paired by screen x, so arms never cross.
- **Unchanged from v2:** sizes, pivots, anchors, 4-frame ride loop, scooter, colours.
- **One new colour:** `#19202B`. It is 2 px in the Gojek jacket arm (se/sw), a dark cuff tone the v6b generator produces in the arm layer. All other colours match v2 (see `../riders_v2/README.md` for the 39 new rider colours awaiting sign-off). Alpha is still only 0 / 56 / 255.

## Files
| path | what |
|---|---|
| `frames/<name>_<dir>_f<0-3>.png` | 8 riders × 4 dirs × 4 frames = 128 PNGs, 1x, transparent |
| `sheets/<name>_sheet.png` | 4 cols (f0-f3) × 4 rows (se, sw, ne, nw) |
| `manifest.json` | size, pivot, footprint, game anchor (se/nw), frames, animation offsets. Same values as v2, so v3 is a drop-in swap |
| `previews/riders_v3_all_4x.png` | v2 se (old) next to v3 se/sw/ne/nw f0 + se f1-f3 |
| `previews/riders_v3_ride_loop_4x.gif` | all riders, 4 dirs, ride loop |
| `previews/street_lanes_riders_v3_with_cars_4x.gif` (+ `_frame.png`) | both lanes (se r 33.05, nw r 34.85) with the live car sprites from `game/assets/vehicles/` (byte-identical to `../cars/`, static as in the game) mixed with the riders |
| `_work/` | `chars.py`, `scoot.py`, `riders_v3.py` (arm/grip code in `build()`), `produce.py`, `previews.py` |

Rebuild: `cd _work && python3 produce.py && python3 previews.py` (~40 s).

| rider | size | pivot | anchor se / nw |
|---|---|---|---|
| `gojek` | 60×87 | [30, 75] | [25, 57] / [25, 57] |
| `gojek_pax` | 54×92 | [27, 80] | [22, 62] / [22, 62] |
| `maxim` | 54×87 | [27, 75] | [22, 57] / [22, 57] |
| `maxim_pax` | 54×92 | [27, 80] | [22, 62] / [22, 62] |
| `sma_triple` | 66×96 | [33, 82] | [24, 62] / [24, 62] |
| `commuter_batik_sogan` | 54×87 | [27, 75] | [22, 57] / [22, 57] |
| `commuter_batik_blue` | 54×87 | [27, 75] | [22, 57] / [22, 57] |
| `commuter_batik_red` | 54×87 | [27, 75] | [22, 57] / [22, 57] |

## Fix 1 Nov ~03:05 WIB: seat drawn over the rider in ne/nw
**Bug:** in the away-from-viewer views (ne, and its mirror nw) the whole rear body, seat included, was drawn after the riders, so the seat sat on top of the rider.
**Fix (`_work/riders_v3.py`, back-view branch; `_work/scoot.py` can now render `cowl`, `seat` and `bag` on their own). New draw order for ne/nw:
1. front body
2. rear cowl + seat (one render, shading unchanged)
3. arms + riders, front rider first
4. the cowl again, only where it overlaps a rider's lower legs (v6b frame rows >= 86), so the shins look tucked behind the side panels
5. the Gojek bag, behind the rider's back

se/sw are byte-identical to before (checked on the sheets). Sizes, pivots and anchors did not change. No new colours.
**Backup of the buggy version:** `_prev_ne_nw_bug/` (old ne/nw frames, old sheets, old 4x sheet, old manifest, old `riders_v3_buggy.py`).
**Still off in ne/nw:**
- The seat part nearer the viewer than the rider's hips no longer overlaps the butt at all, so the rider sits slightly "on" the seat rather than "in" it.
- The SMA girls' grey skirts and the legs of the pax still show as columns above the cowl.
- The riders sit toward the front of the seat, so an empty stretch of seat shows behind solo riders (the pillion space).

## Limitations
- **Back views (ne/nw):** the far fist is behind the torso and the near arm is mostly hidden by the body. Only the fists on the bar and 1-3 arm px show beside the torso. This is real occlusion, but the grip reads less clearly than in se/sw.
- **Arm length:** the arms are straight 2-segment tubes. They reach about 16-18 px from shoulder to grip, which is longer than the v6b hanging arm, so the drivers look a little long-armed at 4x.
- **SMA passengers' arms:** the middle and back girls' white sleeves cross the front girl's lap and skirt as thin grey-white lines. At 1x they read as hands at her waist, but it is busy.
- **Waist hold only:** passengers hold the waist, not shoulders or a rear grab bar. The scooter model has no grab bar.
- **Hidden passenger arms in se/sw:** the passenger's near hand is drawn over the driver, but the rest of the arm is behind the driver, so in se/sw usually only the fist shows.
- **Orientation is unchanged 3/4 iso**, as cancelled above (no side profile).
- **Everything else from v2 still applies:** legs hidden by the leg shield or rear body, sw/nw riders are mirrors, large heads overlap on multi-rider scooters, the logos are marks, and the sogan batik reads as hatching.
- **Not checked in-game.** The game moves vehicles with one CSS translate, so these frames need a per-frame swap to animate.
