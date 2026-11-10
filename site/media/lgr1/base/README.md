# Official LGR-1 base

Current approved revision: **official-3** (2026-11-11, approved by Lafrich).

- **Male active:** `genesis-base-male-official-3.json` (per `index.json`). Uses the four-view masks/pivots/placements from Lafrich's `LGR male test.json`. Retains the exact approved official-2 body art, 64×112 PNG layers, ID, skin-key encoding, draw order, anatomical hierarchy, and motion definitions.
- **Male previous:** `genesis-base-male.json` is the original official-2 package **unchanged**, with a redundant archived copy at `archive/genesis-base-male-official-2.json`. `archive/index-official-2.json` keeps the former catalog pointer.
- **Male source:** `candidates/lgr-male-slice-test-20261111.json` is kept byte-identical as the original user-supplied draft; its `approved:false` flag is preserved. Approval for runtime use is in the **official-3 index**, not by rewriting the user's source file.
- **Female active:** `genesis-base-female.json`, untouched from official-2.

The active bases are selected through `index.json` in Mahluk Hidup, Bergerak, Beraksi and Mainkan (LGRActor). Genesis Base Editor also resolves the index before resetting to an official seed; it never overwrites an existing local draft without the user's action. To roll back, point `index.bases.male` back to the official-2 package/hash/source and advance the index version.

Format and ingest rules: `docs/GENESIS_BASE_FORMAT.md` (§ Official LGR-1 base). Never edit a previously approved version in place; create a versioned package and preserve prior versions.
