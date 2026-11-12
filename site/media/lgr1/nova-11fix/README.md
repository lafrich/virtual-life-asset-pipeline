# NOVA 11-FIX — Editable Genesis Draft (Male + Female)

**Purpose:** Let Lafrich open the accepted NOVA 11-FIX pixel character as
a *draft in the existing Genesis Base editor*, fine-tune the pixels, masks
and pivots, and export that exact edited JSON for subsequent review.

**Entry:** `site/genesis-nova.html`, linked in `MAHLUK HIDUP.EXE`.

- `male-package.gz.b64` and `female-package.gz.b64` are deterministic
  `gzip(JSON)` encoded as Base64 text to ship valid editable
  `lafrich-genesis-base-v1` packages on GitHub Pages.
- Their `rigSha256` values are validated through `GenesisBase.readPackage`:
  - Male: `22c8913421e75adbba2eddebfd1093062d757de1fa035eadd7e79e712f06db0b`
  - Female: `b67152f408aeb3629c7b27f118d554059626fb8fd8bb4fece3c3e55f33918c66`
- Each carries 4 directions and 11 LGR-1 body parts in 64x112 art.
  The app uses normal skin-key conversion for Pixel Editor.
- Both were generated from `LGR-Nova-11FIX-Bow.zip`; Bow itself is a
  **separate motion JSON**, not installed globally when editing the body.
- New draft import is **explicit** and warns that the same-gender local
  draft is replaced. Existing approved official-4 index, Drive records,
  and opposite-gender drafts are unchanged.
- Saving is through built-in **EXPORT BASE .JSON** or the dedicated
  **EXPORT EDITED JSON** shortcut. Ask the artist to send this JSON back.
- **Technical note:** The standard LGR-1 Genesis Base JSON contains a
  composited art layer + pixel ownership masks. Diagnostic overlapping
  underpaint in the Nova Python review source is not a separate editable
  physical layer in this format. Do not claim complete visual parity of
  diagnostic poses and the current stock LGR1Raster until engine testing.
- Test: `node tests/test_nova_genesis.cjs`, including two package
  decompressions, sha validation, native 11-part mask validation, and
  in-memory imports into a simulated editor. Real browser import/export is
  covered by Genesis Workbench Chromium CI.
