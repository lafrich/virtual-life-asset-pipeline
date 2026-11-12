# Official LGR-1 Genesis bases — final Male / Female (official-6)

Current active bases for Mahluk Hidup / LGRActor / Mainkan, chosen by `index.json`:

- Male: `genesis-base-male-official-6.json`
- Female: `genesis-base-female-official-6.json`

Approved by Lafrich 2026-11-12 from the latest user uploads `male final.json` and
`female final.json`. Originals are retained byte-for-byte in
`candidates/male-final-20261112-v2.json` and
`candidates/female-final-20261112-v2.json`.

## Skin-key, anatomy and metadata

Both uploads already store their skin pixels as canonical `v6p-key-ramp-v1`
key colours. There is **no need to paint them again**. Six ramp choices
(porcelain, light, tan, medium, brown, deep) and custom editor colour continue
to work at draw time via `LGRSkin` and `LGRActor`. Male has 5,531 keyed skin
pixels; Female has 5,452. The remaining pink accents (4 Male, 8 Female) stay
untinted by design.

The Female upload was mislabeled as Male. The final Female package corrects
only `gender`, `id`, `rig.gender`, `rig.id`, `rig.name`, and recalculates
`rigSha256` to satisfy the engine's integrity gate. Male metadata is unchanged.
Every original pixel layer, mask, pivot, placement, manual slicing flag, draw
order and joint property is preserved exactly.

## Rollback / drafts

- Previous active catalog preserved: `archive/index-official-5.json`.
- Old official-2, -3, -4, -5 packages, catalogs and input drafts stay intact.
- Restore an archive **via a new catalog revision**, never edit an older approved package.
- Browser-local drafts stay untouched until explicit `↻ RESET TO OFFICIAL BASE`.
- Outfit and Emosi facial alignment need visual verification against new geometry.

Validation: `tests/test_genesis_base.cjs`, `tests/test_nova_official_5.py`,
`tests/test_genesis_official_6.py`.
