# STYLE — Virtual Life art direction (condensed)

Condensed from the project's art-direction style sheet (v1.0–v1.4, v2 "bright pop") and review log, updated to the
current **v6b** rules. Where the old sheet and v6b disagree, **v6b wins** (notably: v1 had a 1 px dark outline; v6b has none).

## Projection and scale
* Isometric 2:1 only: diagonals step 2 px across per 1 px up; otherwise only true vertical/horizontal.
* Floor tile 64×32. Character frame 64×112, pivot (32,100), figure 84–88 px (≈2.7 height steps), slightly large head, slim body.
* Furniture footprints snap to tiles; chairs ≈ half a tile wide, 51–60 px tall (seat z 14); desks ≈ 58 px; small props a bit larger than life.
* Slices: desks have a front slice drawn over seated legs; chairs have a back slice behind and an arm slice in front.
  Front-facing partitions that can hide avatars are drawn **cutaway** (frame + top rail, no fill) or low.
* sw/nw are mirrors of se/ne → no one-sided details on mirrored characters (pets with asymmetric markings get 4 drawn views instead).
* Author at 1×, scale only by integers with nearest-neighbour. No smoothing, no anti-aliasing, no sub-pixel rotation.
  Rotating sprites (e.g. lying from standing) gives rough edges — prefer native redraws when it shows.
* Glows (lamps, screens, fire) live on a **separate layer**, never baked in.

## Light, tones, shadow (v6b)
* Light from the top-left: top planes lightest, left (sw) faces mid, right (se) faces darkest.
* 4–5 tones per material ramp. Flat cel shading, no gradients on objects, no dithering.
* **No black outline.** Silhouette edges use the material's own darker tone; inner lines too. Never pure black on objects.
* Shadow = flat **black ellipse at alpha 56**, no blur. Alpha values allowed: 0, 56, 255.
* Shade rule for derived tones: ×0.75 lightness and ~10° hue toward night navy; highlights ≤ 40% toward paper, warm hues lighten toward `#FFD166` (not toward white).

## Palette
* Use colours that already exist in the game. A new hex needs owner/AD approval and must be listed in the report.
* Bright-pop v2 palette is current for the office (sky-blue floors `#8ECDEB/#A4D9F2`, cream walls `#CFC3A8/#E8DEC6/#FFF7E4`,
  royal blue `#3F63E8`, sky `#3AA6F2`, pink `#EE4D72`, green `#35C46A`, brass/yellow `#F2B530`; the exact v1→v2 map is in `assets/environment/palette.json`).
* Street/world materials are the 5-tone ramps in `assets/street_buildings/_work/engine.py` (WHITE, CREAM, CONC, DARK, GLASS, WARM, RED, BLUE, GREEN, GRASS, WOOD, PAVE, ASPH, TARPB, CARD, SKIN, …). Reuse them.
* Accents sparingly (≈5% of the screen); materials over decoration; leave floor space.

## Characters
* Consistent head/body ratio and shading; faces minimal (2 px eyes, optional 1 px mouth); glasses/hair/one accessory carry personality.
* Dark hair on dark floors: lift the darkest hair tone one step and add a 1 px rim on the top-left of the head silhouette.
* Identity must survive new outfits/poses: same hair, glasses, face; verify against the game sheet (0 px on untouched frames).

## Text in pixel art
* Pixel font 3×5 (game `PXF`) for in-world text; on iso faces compensate the shear per glyph and use even offsets.
* UI uses the Y2K/Vista kit (`assets/ui_y2k`, Wine Tahoma, aliased). No proportional system font in-world.

## Lessons from reviews
1. Read at 1× first; check 4× only for detail. If it does not read at 1×, simplify (bigger shapes, a contrasting cuff, one cue).
2. Full-saturation accent floors turn the scene into a game board — tint floors ≤ 10–15% toward the accent; put accents on props.
3. Rotated poses (lie/float) look melted; redraw natively or separate the figure with a contrasting layer (towel, water overlay).
4. Labels must never clip or sit over sprites; show names on hover/proximity, in the pixel font.
5. Keep strokes inside their container (arms inside the pool, handles inside the cup silhouette, etc.).
6. Mocks are where problems show: always compose the asset into its scene before reporting.
