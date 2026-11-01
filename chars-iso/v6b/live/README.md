# v6b-live preview (NOT integrated, NOT deployed)
This version uses the v6b drawing language (reference pixel grid, 1 block = 1 px, the same edge/shade rules and expressive face) while keeping the identity and outfits of the live characters (taken from examples/reference_man.json and examples/noor.json).

The arms now hang down and swing while walking, opposite to the leg on the same side, by 2 blocks at the hand. Neither character holds an item.

- **Ichsan:** fair skin (base_light ramp).
  - Black hair, mid-length (halfway to the shoulders), covering the ears, with a slate-blue sheen.
  - Glasses with slate rims: pure black read as sunglasses on the v6b eyes.
  - A slight split mustache.
  - Charcoal tee (#2A3242), slate jeans (#3A4458) and walnut shoes.
- **Noor:** fair skin. Black wavy hair just past the shoulders, with the same blue sheen.
  - Charcoal cardigan with long sleeves and white dots (live: hoodie_charcoal plus the bird-print dots), over a dotted black inner top.
  - Night pants (#1C2330) and night shoes.

Alignment (31 Oct, after feedback): the torso is moved 2 px right so the neck, chest, hips and feet share one centre line. The back views are moved 5 px left onto the pivot; the mirrored canvas had put them off-centre. See previews/*_centreline_debug.png.

The frame is 64x112 with the pivot at (32,100), using the same row map and four directions (sw and nw are mirrored). Layers are modular: shadow, hair_back, body, arm_far, shoes, pants, shirt, outer, arm_near, face, hair_front, acc_head (glasses) and brows. They are in parts/<name>/.

Build: `python3 tools/live_v6b.py live/chars/<name>.json`, then `python3 tools/preview_live.py`.

## Sit redesign + Ichsan no-fringe (pt242u)
- Sit (rows 12-15, all 4 dirs, both chars): upper body no longer drops 3 px (SIT_D=0) -> crotch/hips at frame y 80 (live sit hip line);
  warteg/FamilyMart split cut y 84 sits just under the seat.
- Front (se/sw): thighs foreshortened diagonally toward the viewer, knee crease, shins straight down, shoes flat under the knees
  (feet ~8 px forward like the live sit). Hands rest on the lap (near forearm + hand over the near thigh, far hand on the far thigh).
- Back (ne/nw): trouser seat block at the hips, lower legs drop below/right of the seat with heels visible, elbows at the sides.
- Ichsan: `"fringe": false` -> forehead skin rows 8-12, hairline/side-part, hair swept back, side curtains kept; brows at row 11
  (above the glasses rim). Noor keeps her fringe.
- Previews: previews/<n>_sit_zoom_vs_live.png, game_<n>_ingame_{warteg,famima}_sit.png (runtime sheet injection only, no repo change).

## Ichsan curtain fringe from the photo reference (pt243u)
- `"fringe": "curtain"` replaces `"fringe": false`: centre part at ref x 15/16, strands sweep down/out over both sides of the
  forehead (rows 8-12), covering the outer brow ends, V of forehead open in the middle; flyaway strands on top.
- Side/back hair +3 rows (MID_LEN=3): falls to the jaw/shoulder line, ragged tips, covers ears.
- Round thick-ish glasses (`"glasses_shape": "round"`), dark slate rim #4C5468 (darker rims merged with the black hair).
- Thin mustache with drooping corners + light chin/jaw stubble (`"stubble": [light, core]`), mouth neutral.
- Preview: previews/ichsan_photo_vs_sprite.png (photo, photo at sprite resolution, idle se/sw/ne at 10x). Noor unchanged (identical sheet md5).
