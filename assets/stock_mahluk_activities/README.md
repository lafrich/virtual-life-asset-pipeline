# Mahluk Hidup — five additional activity motions (REVIEW ONLY)

This branch contains **a frame-baked pixel animation generator**, not a skeletal rig. It does not modify `game/`, `site/media/v6p-act/`, Mahluk Hidup character templates, existing clips, or deployment workflows.

## Generated previews

Run from the repository root:

```bash
python3 assets/stock_mahluk_activities/build_stock.py
```

Requires Python 3 and Pillow. Generated files are written under `assets/stock_mahluk_activities/`:
- `frames/`: 176 individual transparent PNGs, 64×112, SE/SW/NE/NW × Male/Female.
- `sheets/`: ten action-specific sprite sheets, plus two review-layout 384×2688 sheets for the existing activity bands.
- `previews/`: a five-action contact sheet and 11 GIF previews.
- `manifest.json`: frame durations, directions and preview-only status.
- `mahluk_stock_animation_review.zip`: bundled review files and generator.

| Motion | Rows start | Frames | ms/frame | Preview action |
| --- | ---: | ---: | ---: | --- |
| pushup | 4 | 4 | 160 | plank > descend > low > rise |
| yoga_sphinx_idle | 8 | 4 | 500 | supported chest + subtle breathing |
| yoga_puppy_idle | 12 | 4 | 500 | knees/forehead down, hips up, breathing |
| hip_shake | 16 | 6 | 120 | side-to-side hip movement |
| yoga_happy_baby_idle | 20 | 4 | 450 | supine, feet held, tiny rocking/breathing |

These positions mirror `site/v6p-activity-contract.js`. Each exported frame uses 64×112 pixels, nominal pivot (32,100), no antialias and no runtime bone transforms.

## Very important: not native-ready

**These are fully composited review sprites, not canonical editable V6P part sheets.**
The current Mahluk Hidup activity contract expects separate keyed parts (body, face, hair, top, pants, shoes) for each Male/Female variation, with appearance compatibility checks. Preview sheets must **not** be copied over `site/media/v6p-act/*`. The clip store and Semesta consumer must continue to reject unauthored slots. In particular, the **existing authored pushup** must be preserved as the source of truth; this preview redraw is for comparing motion only.

Before making any of the four reserved motions playable, manually map/repaint them onto the actual Male/Female modular native parts; test all four directions, compositing/occlusion, Emosi alignment, per-frame timing, Drive sync and Semesta consume, then obtain owner visual approval. Preserve untouched pixels and perform regression comparisons.

## QA

Run after building:

```bash
python3 assets/stock_mahluk_activities/test_stock.py
```

Checks that 176 PNG frames exist, are not empty or clipped, are pixel-transparent, have distinct animation phases, and that review-layout sheets retain the 384×2688 activity format.

No production deployment or stock-registration change has been made.
