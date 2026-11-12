# Official LGR-1 Genesis bases (official-9, 2026-11-12)

The canonical registry `site/media/lgr1/base/index.json` is used by Mahluk Hidup, Genesis Base, LGRActor and Mainkan.

- Male: `genesis-base-male-official-8.json`, unchanged since `male final 2.json`
- Female: `genesis-base-female-official-9.json`, from the latest approved `genesis_female_very final.json`

The new Female source is preserved byte-for-byte at `candidates/female-very-final-20261112-v5.json`. Its authored SE/SW/NE/NW artwork, 11-part hierarchy, 64×112 frames, slicing masks, pivots, draw orders, placements and manual locks are carried into the new immutable official package. The Light ramp is encoded with reversible V6P skin keys (5,101 keyed pixels); pink accents retain their original colors. No parts or pixels were added, removed or redrawn.

`archive/index-official-8.json` preserves the preceding active index, and all older packages remain unchanged. Browser-saved Genesis drafts are not silently overwritten: use **↻ RESET TO OFFICIAL BASE** to seed a fresh draft from official-9.

This promotion does not modify clothing, Emosi, or existing character saves. Wardrobe assets might require separate fit checks when character geometry changes.

Validation: `tests/test_genesis_official_9.py`, historical `test_genesis_official_8.py` and `test_genesis_official_7.py`, plus `test_genesis_base.cjs`.
