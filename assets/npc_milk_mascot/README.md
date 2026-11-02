# Milk Mascot — v6b stock NPC

A new game-ready **anthropomorphic milk-carton costume** based on the uploaded image, reinterpreted as code-drawn pixel art. This is not a human head with milk-print clothing: the entire head and upper body are hidden inside a 3D gable-top carton. Slim white costume sleeves and small gloves now attach at the mid-height of the carton side panels, with visible 2px cuff connections; white trousers and shoes use the native v6b leg rig.

- Front: cream and teal/blue milk branding, simple friendly eyes and smile. The word MILK is projected onto the panel's isometric slope, including the mirrored view.
- Back: blue label and minimal packaging markings, **no duplicate smile**. Barcode uses upright vertical bars on the cardboard surface, while the collective barcode edge follows the direction-correct isometric panel slope: downward-right in NE, downward-left in NW.
- Sides/top: angled, readable isometric planes and carton fold.
- Display text: `milk` made from pixel glyphs (the SW reflection follows v6b direction rules).
- Movement: native `live_v6b` leg poses + procedural swinging mascot arms.
- Native frame: 64×112 px, pivot (32,100), 4 directions (SE SW NE NW), 6 walking frames per direction.
- Sprite sheet: 384×4928 px RGBA + 8 expression overlays; walk GIF 4× nearest-neighbor.

## Generate / audit

Run from repo root with the dependencies in `requirements.txt`:

```bash
./run_all.sh verify
python3 assets/npc_milk_mascot/src/make_milk_mascot.py
python3 tools/audit_colors.py assets/npc_milk_mascot/sprites
```

All published PNGs and walking GIFs are stored inside this folder, **not only as temporary GitHub Actions artifacts**. The Character Stock landing page auto-discovers the manifest after merge.

## Animation limitations

Walking, idle, and talk rows share the working carton rig. The remaining v6b animation slots are provided for layout compatibility but contain simplified placeholder costume poses; swimming/lying/sleeping and seated interactions require dedicated design and should **not** be treated as finished gameplay animation. This does not edit the live game or Kota Shift.

## Expression previews

The face-expression overlay PNGs are stored beside the base sprite sheet. The Character Stock page composites overlays onto the native idle/SE sprite and shows an expandable **Expression Preview** selector (neutral plus the available expressions); no extra illustration or image-generation process is used.

## Positioning revision

Shoulder anchors now attach around body midpoint on the sides (not on the upper/back corner). Sleeve seams stay visible in front of the carton for a connected costume look. White-glove silhouette and 6-frame four-direction walk are retained.

## Rear barcode regression check

NE and NW now draw the barcode **after mirror transformation** using the appropriate panel slope. The individual bars remain vertical on the carton, while their overall top/bottom edges run in opposite, correctly mirrored directions. The generator asserts these NE/NW slope signs on every build.
