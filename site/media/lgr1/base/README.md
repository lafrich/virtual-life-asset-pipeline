# Official LGR-1 Genesis bases — Male / Female (official-7)

Mahluk Hidup, LGRActor, Mainkan, and the Genesis Base editor resolve their current master via `site/media/lgr1/base/index.json`.

- Male: `genesis-base-male-official-7.json`
- Female: `genesis-base-female-official-7.json`

Approved 2026-11-12 from Lafrich's latest uploaded `male final 1.json` and `female final 1.json`. Exact original JSON files are preserved as `candidates/male-final-20261112-v3.json` and `candidates/female-final-20261112-v3.json`.

## Skin / geometry

- Male: uploaded `lafrich-genesis-base-v1` package, preserved verbatim with its canonical V6P skin keys (5,490 keyed pixels).
- Female: uploaded `lgr-1-draft-v1` rig. Its exact Light palette pixels are converted to V6P keys, with per-pixel reverse verification; 5,411 pixels are keyed. Non-skin accents remain original.
- Both: 64×112 sprites in SE/SW/NE/NW, 11-part hierarchy, masks, pivots, placements, draw orders, joint properties and manual slice flags preserved. Skin ramps: porcelain, light, tan, medium, brown, deep.

## History and rollback

`archive/index-official-6.json` contains the previous live index. All previous approved files and original drafts remain intact; **never edit historical official packages**. Browser autosave drafts are not silently replaced: in Genesis Base choose **↻ RESET TO OFFICIAL BASE** to seed a fresh draft from official-7.

Validate with `tests/test_genesis_official_7.py`, `tests/test_genesis_official_6.py` and `tests/test_genesis_base.cjs`. Existing outfits may need manual visual retargeting to the latest body geometry; this promotion does not overwrite wardrobe assets.
