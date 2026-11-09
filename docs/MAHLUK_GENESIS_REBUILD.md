# MAHLUK HIDUP.EXE — Lafrich Genesis V6B Workbench

Implementation branch: `feature/mahluk-genesis-rebuild-20261110`.

## User-facing stages

1. **Pixel Editor:** choose approved Male Genesis or Female Genesis (frozen V6B source). Choose one of 10 anatomical pieces and one physical layer: skin/body, body-front, top-front/back, trousers, shoes, hair-front/back, accessory. Click Pixel Editor. The unchanged original editor provides pencil, eraser, select, copy/paste, mirrored paste, move pixels, fill, picker, pan, grid, onion-skin, zoom/pinch, horizontal/vertical flip, delete selection, undo/redo. SE, SW, NE and NW have separate source pixels. Applying a plane edits only that source layer and the selected anatomical slice, never Emosi.
2. **Pivot & Slicing:** define each native 64×112 pixel coordinate in SE/SW/NE/NW. Red cross = selected piece pivot; blue = selected slice ownership. Paint, unassign, copy/paste/mirror masks and undo/redo. The hierarchy uses 10 parts: torso/head, near/far upper arms/forearms, near/far thighs/calves. A fully occluded piece can have zero visible pixels in a view without becoming invalid.
3. **Bind:** validates all directions, 10-piece geometry, masks and original source. Generates `lafrich-genesis-binding-v1` with independent layer PNGs, per-angle masks/pivots, hierarchy, and declarative Python-compatible export. No arbitrary Python is executed by the browser.
4. **Check Binding:** rotate/move each joint; test neutral, arms raised, walk, crouch from the bound snapshot. A bad result can return to Pivot & Slicing via Edit Binding. That invalidates approval until binding is rebuilt and checked again.
5. **Save Master:** approve and store `lafrich_genesis_male` or `lafrich_genesis_female`. Save a JSON and a Python binding export, or use the dedicated checksum-verified Google Drive save. This provides an interchange source for the **future** Character Editor and Mainkan animation database; those other applications are **not** rewritten in this change.

## Runtime / source contract

- Approved original V6B bases: `genesis_male_nude`, `genesis_female_nude` from `site/genesis-source.js`.
- Canonical frame: 64×112 PNG with directions `se`, `sw`, `ne`, `nw`.
- Independent source layers: `hair_back`, `body`, `pants`, `shoes`, `top_back`, `top`, `body_front`, `hair_front`, `accessory`.
- The binding's `rig.layers` keeps those source PNGs separate so outfits/skin/hair can be replaced without recreating a character frame atlas.
- `site/genesis_procedural_runtime.py` validates the JSON contract and computes transform matrices and continuous test poses from time. Optional Pillow rendering takes layer overrides for future custom wear, cuts them by the same per-angle masks and transforms the 10-piece hierarchy without storing frame-by-frame sprite images.
- Emosi.exe remains the only authored facial/eye/mouth source. Its preview is a separate overlay that inherits the head transform. This workbench never bakes face pixels into Genesis.
- Cloud storage is isolated to `Membangun/Mahluk Hidup/Genesis Masters` and never runs destructive old animation migrations.

## New storage keys

- Editable local drafts: `vl-lafrich-genesis-workbench-drafts-v1`.
- Approved local masters: `vl-lafrich-genesis-approved-masters-v1`.
- Drive: `Membangun / Mahluk Hidup / Genesis Masters / lafrich_genesis_male.json` and female equivalent.

**Migration policy:** legacy browser/Drive records are **not imported or deleted**. The live Mahluk HTML entry now points only to the new workshop; Emosi.exe is the only other accessible sub-application from its navigation. Old source files and Git history stay available for safety and cross-app dependencies, but are not loaded or linked from the new entry.

## Verification

- `.github/workflows/genesis-workbench-qa.yml` runs JS parser checks, DOM/editor selector contract, and 9 Python geometry tests.
- Chromium smoke must load real frozen Male/Female images, open the original pixel editor, apply independent source edits without changing a different garment layer, adjust pivot, bind all four angles, test motion, approve, save a master, and verify its canonical ID/JSON.
- No `game/index.html` or existing published character sprite files are modified.
- The browser QA does **not** verify specific visual quality of every user-authored pivot/slice. Each view and attachment requires a human visual check before using the master in Mainkan.

## Known limits

- This workbench is a **new authoring route**, not an in-place migration of older Mahluk libraries.
- The built-in test poses and exported Python module demonstrate procedural transformations; a full motion catalogue, clothing parameter UI in Mainkan, and Mainkan's runtime importer are separate future integration tasks.
- Emosi preview requires the canonical Emosi.exe database and origin; cross-browser Google Drive sync requires the user to authorize Google Drive.
