# Aladdin Sane — v6b character stock

Permanent character folder in the [v6b character stock](../character_stock/README.md). This is **code-generated game pixel art**, not a freehand or image-generated sprite sheet.

## Look

Bowie-inspired glam-rock character with **copper-red / orange spiky mullet**, exposed ears, classic red-and-blue lightning face paint, bare torso, slate jeans and brown boots. Last revision: trim stray hair to the right of the back-facing ear and repair the back-facing right upper-arm / shoulder connection.

## Production assets (checked into GitHub)

- `sprites/aladdin_sane_v6b_sheet.png` — transparent RGBA 384×4928; 64×112 frame, 6 columns × 44 rows, pivot (32,100).
- `sprites/aladdin_sane_v6b_f*.png` — eight face-expression overlays.
- `preview/aladdin_sane_walk_4dirs_4x.gif` — **primary preview**; 6 walk frames for each of SE / SW / NE / NW, enlarged with nearest-neighbor.
- `preview/contact_sheet_4x.png` — static inspection sheet.
- `manifest.json` — machine-readable sheet layout, animation row starts and paths.
- `src/make_aladdin_sane.py` — generator using the repo's native `live_v6b`, `npc_v6b` and `parts_v6b`.

Other previews (mock and per-direction walk GIFs) are stored in `preview/`.

## Rebuild and validation

Run from the repository root, with Python, Pillow, NumPy, `fonts-dejavu-core` and `fonts-wine`:

```bash
./run_all.sh verify
python3 assets/npc_aladdin_sane/src/make_aladdin_sane.py
python3 tools/audit_colors.py assets/npc_aladdin_sane/sprites
```

All generated sprite colors must belong to the existing game palette; alpha must be 0/56/255, with alpha 56 reserved for black shadow. No new game colors introduced.

The character is stored in this asset repository and is **not automatically added to Kota Shift**. Review and integration are separate.
