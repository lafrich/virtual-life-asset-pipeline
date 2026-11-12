# Official LGR-1 Genesis bases — Nova (official-5)

**Current approved base for the Mahluk Hidup / LGRActor gameplay system:**

- Male: `genesis-base-male-official-5.json`
- Female: `genesis-base-female-official-5.json`

Approved by Lafrich on 2026-11-12. `index.json` is the only active
pointer for the LGR-1 actor/Genesis editor. Its `rigSha256` is checked on
load. These packages store skin as **canonical V6P LGR key colours**:
`#F1D3B5 → #FF2CE8 (i)`, `#EBC8A8 → #FF32E5 (h)`,
`#A8704E → #FF44DC (7)`. Non-skin pink accents are unchanged. Converting
back to the `light` ramp reproduces the uploaded pixel art exactly for all
four views of each gender.

The original artist drafts are retained **byte-for-byte** at
`candidates/nova-male-final-20261112.json` and
`candidates/nova-female-final-20261112.json`. The Female upload accidentally
had Male metadata; the promoted Female package changes only identity fields
(`id`, `gender`, `name`) and skin-key encoding, without changing artwork,
mask, pivots, placements, joint structure, draw order or manual slice flags.

## Rollback

- Previous active index: `archive/index-official-4.json` (historical approved Male official-3 / Female official-4).
- All original official-2/3/4 packages, archive indices and drafts remain in place.
- To roll back, restore an archived index as a **new** version and bump
  `OFFICIAL_BASE_VERSION` in `site/genesis-base-app.js` accordingly; never
  modify an older approved package in place.

Existing browser-local Genesis draft edits are not silently overwritten. Use
`↻ RESET TO OFFICIAL BASE` in Genesis Base to load Nova into an existing draft.
The normal LGRActor path loads `index.json` for Mahluk Hidup/Mainkan. Wear
and facial alignment must still be checked visually with the new body geometry.

Validation: `tests/test_genesis_base.cjs`, `tests/test_lgr_slice_candidate.cjs`,
`tests/test_nova_official_5.py`.
