# Official LGR-1 Genesis base — final 2 (official-8)

Mahluk Hidup, Genesis Base, LGRActor, and Mainkan resolve the current base using `site/media/lgr1/base/index.json`.

- Male: `genesis-base-male-official-8.json`
- Female: `genesis-base-female-official-8.json`

Approved 2026-11-12 from `male final 2.json` and `female final 2.json`. The exact original uploads are stored in `candidates/male-final-20261112-v4.json` and `candidates/female-final-20261112-v4.json`.

## Integrity

- Male was an `lgr-1-draft-v1` with Light skin colours. Its three used Light ramp colours were converted pixel-exactly into V6P skin keys; 5,173 keyed pixels, four untouched pink accents.
- Female was a valid keyed package but exported with Male identity metadata. Only the female package's ID/gender/name identity and rig checksum were corrected, retaining the complete four-view artwork; 5,101 keyed pixels, six untinted accents.
- Both retain 64×112 SE/SW/NE/NW sprites, 11 anatomical parts, masks, manual slicing, pivots, placements, near/far side assignments, draw orders, and joint settings.

## History and usage

`archive/index-official-7.json` preserves the previous active index. All historical official-1 through official-7 files and source candidates are unchanged. Existing browser autosave drafts are not overwritten: in the Genesis Base editor select **↻ RESET TO OFFICIAL BASE** to load official-8.

Wardrobe and face overlays need separate visual retargeting checks if their fit changes. No clothing asset, Emosi database, or character save is modified by this base promotion.

Validation: `tests/test_genesis_official_8.py`, `tests/test_genesis_official_7.py`, `tests/test_genesis_base.cjs`.
