# Milk Mascot — v6b stock NPC

A new game-ready **anthropomorphic milk-carton costume** based on the uploaded image, reinterpreted as code-drawn pixel art. This is not a human head with milk-print clothing: the entire head and upper body are hidden inside a 3D gable-top carton. White costume sleeves, gloves, trousers and shoes animate under/around the rigid carton.

- Front: cream and teal/blue milk branding, simple friendly eyes and smile.
- Back: blue label and minimal packaging markings, **no duplicate smile**.
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
