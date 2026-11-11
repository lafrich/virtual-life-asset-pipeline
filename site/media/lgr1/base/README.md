# Official LGR-1 base

Current approved catalog revision: **official-4** (2026-11-11, approved by Lafrich).

- **Male active:** `genesis-base-male-official-3.json` (unchanged official-3 slicing); original `genesis-base-male.json` official-2 remains intact.
- **Female active:** `genesis-base-female-official-4.json`, using exactly the four-direction masks, pivots, placements and manual slice flags from Lafrich's `genesis_female_draft.json` (2026-11-11). The previous Female official-2 pixel art, skin-key encoding, draw order, anatomical hierarchy, name/ID and motion compatibility are preserved.
- **Female previous:** `genesis-base-female.json` is the untouched original official-2 package. `archive/index-official-3.json` retains the previous catalog pointer for rollback.
- **Female original candidate:** `candidates/genesis_female_draft-20261111.json` is the uploaded artist JSON byte-for-byte. Its original `approved:false` metadata is retained; runtime approval lives in `index.json`, not by rewriting source.
- **Male source and archive:** `candidates/lgr-male-slice-test-20261111.json`, `archive/genesis-base-male-official-2.json`, and `archive/index-official-2.json` stay untouched.

Active bases are selected through `index.json` by LGRActor (Mahluk Hidup / Bergerak / Beraksi / Mainkan) and Genesis Base's reset-to-official flow. Existing browser drafts are **not** silently replaced.

To roll back Female, restore `index.bases.female` from `archive/index-official-3.json` and advance the catalog/editor version consistently. Never rewrite previous approved packages in place.

Format / checksum: `docs/GENESIS_BASE_FORMAT.md`. Validation: `tests/test_genesis_base.cjs`, `tests/test_lgr_slice_candidate.cjs`.
