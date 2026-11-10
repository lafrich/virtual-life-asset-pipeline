# Rollback — virtual-life-asset-pipeline (latest first)

## 2026-11-10 · LGR-1 whole back head + better slice paint

- Previous `origin/main` (safe restore point): `5520232` (ROLLBACK notes for the neck stem)
- Feature commits: `9c5cb08` + the seed-order fix right after the ROLLBACK notes (NE/NW back head from the whole front head in the seed + 01 button with undo; slice paint visible-only, continuous strokes, RE-SLICE keeps hand-painted pixels on request)
- New tip: this ROLLBACK-notes commit

Restore (fast-forward only, never force-push):

```bash
git fetch origin && git checkout main && git pull --ff-only origin main
git revert --no-edit 5520232..origin/main   # newest first
git push origin main
```

Data safety: no Drive file is modified. Existing drafts change only when the
artist presses 01 · BACK HEAD FROM WHOLE FRONT HEAD (undo button) and saves.
Drafts gain an optional local `manual` map (ignored by older code).

---

## 2026-11-10 · LGR-1 head neck stem + female hand tip (artist revision notes)

- Previous `origin/main` (safe restore point): `22ccc1b` (11-part pelvis split, review count fix)
- Feature commit: `8bd6510` (shapeSlice: clean neck stem for the head, back views reach the neck bottom; Female hand tip stays arm)
- New tip: this ROLLBACK-notes commit

Restore (fast-forward only, never force-push):

```bash
git fetch origin && git checkout main && git pull --ff-only origin main
git revert --no-edit 22ccc1b..origin/main   # newest first
git push origin main
```

Data safety: slicing only changes the V6B seed default and what the manual
RE-SLICE FROM SHAPE button produces. No Drive file is modified; existing drafts
and Drive masters are untouched until the artist presses RE-SLICE and saves.

---

## 2026-11-10 · LGR-1 shape slicing + PELVIS split (11 parts)

- Previous `origin/main` (safe restore point): `8b1108d` (ROLLBACK notes for the LGR-1 app fixes)
- Feature commit(s): see `git log 8b1108d..origin/main` (shape slicing, RE-SLICE button, ownership highlight, pelvis split, motions)
- New tip: this ROLLBACK-notes commit

Restore (fast-forward only, never force-push):

```bash
git fetch origin && git checkout main && git pull --ff-only origin main
git revert --no-edit 8b1108d..origin/main   # newest first; creates revert commits
git push origin main
```

Data safety: no Drive file is modified by this deploy. Old 10-part drafts and
Drive masters keep opening (migrated in memory only). **Caution:** once the
artist SAVES a new 11-part master to Drive, the pre-pelvis code (`8b1108d`)
rejects it ("LGR-1 geometry contract incomplete"); the previous version stays
in that master's `.history.` archive on Drive. Local drafts that were edited
after this deploy are 11-part; the old app would refuse them too (they stay in
localStorage untouched).

Confirm after Pages rebuilds (`deploy-character-catalog.yml`):
- https://lafrich.github.io/virtual-life-asset-pipeline/genesis-workbench.html

---

## 2026-11-10 · LGR-1 app fixes (motions, joints, rotation, layers, outfits, seed, review, cleanup)

- Previous `origin/main` (safe restore point): `299a8ce` (Sync v6p pixel edits from Drive: shoes/hightops_over_f)
- Feature commits: `924608c8d300acdb9f5f24279a556c935eb144ed` (LGR-1 raster + shared motions + workbench), `69a987fb6f11dc7035d33703982b7181cbf73645` (retired JS/test cleanup + CI)
- New tip: the ROLLBACK-notes commit directly after `69a987f`

Restore (fast-forward only, never force-push), newest first:

```bash
git fetch origin && git checkout main && git pull --ff-only origin main
git revert --no-edit <this ROLLBACK notes commit>
git revert --no-edit 69a987fb6f11dc7035d33703982b7181cbf73645
git revert --no-edit 924608c8d300acdb9f5f24279a556c935eb144ed
git push origin main
```

Data safety: wire IDs/formats are unchanged; no Drive file is modified by this deploy.
New Drive motion files are separate immutable `lgr1_motion.*.json` versions. Local
user motions live in `vl-lgr1-user-motions-v1`, outfit tweaks in
`vl-lgr1-outfit-tweaks-v1`; reverting leaves them harmlessly unused. Optional rig
fields (`drawOrders`, `sides`, `capRadius`) are ignored by the old code.

Confirm after Pages rebuilds (`deploy-character-catalog.yml`):
- https://lafrich.github.io/virtual-life-asset-pipeline/genesis-workbench.html
- https://lafrich.github.io/virtual-life-asset-pipeline/mahluk-hidup.html

---

## Rollback — virtual-life-asset-pipeline 2026-11-07

Repo: `lafrich/virtual-life-asset-pipeline`  
Branch: `main`  
Live: https://lafrich.github.io/virtual-life-asset-pipeline/

## This deploy (tidied Mahluk pixel editor chrome)

- Previous `origin/main` (safe restore point): `69fe8c8b717cfe4095886c0bd7ec57ebdd749920`
- Feature commits: `424b972647c79616ea95ee6658778e86a7810f38` (SOURCE/REF/SAVE drawers + compact clip row), `b059a954399dc2f38f23c5168bd813b281457f9c` (phone toolbar wrap)

Restore this deploy (fast-forward only — do not force-push):

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git revert --no-edit b059a954399dc2f38f23c5168bd813b281457f9c
git revert --no-edit 424b972647c79616ea95ee6658778e86a7810f38
git push origin main
```

If this ROLLBACK notes commit is also on `main`, revert it first (newest first), then the feature commits newest first. That restores the pre-tidy Emosi-same Mahluk chrome (extra panels stacked above the dialog) while keeping Emosi's native pixel dialog and the v6p adapter. Real-color mapping, accessories, gallery, clip timeline, and Drive save remain. It does not revert the V6B asset generator (`69fe8c8b717cfe4095886c0bd7ec57ebdd749920`) or the Emosi-same editor wiring (`b964b665c7c534953bd94def079a3c1c0f87c45f`). Stock 44-row sheets stay untouched.

Confirm after Pages rebuilds (`deploy-character-catalog.yml`):

- https://lafrich.github.io/virtual-life-asset-pipeline/v6p-studio.html
- https://lafrich.github.io/virtual-life-asset-pipeline/pixel-editor.html?source=v6p&project=clip_pushup
- Phone 390 and 360: toolbar wraps; SELECT, COPY, PASTE, PASTE FLIP, MOVE PIXELS, FILL, PICK, and HAND all visible without horizontal overflow
- Side-by-side with https://lafrich.github.io/virtual-office/emotion-studio/ (open PIXEL EDITOR)

## Previous deploy (Emosi pixel editor reused as-is for Mahluk)

- Previous `origin/main` (safe restore point): `e67f8f53848040db572e01c4f2e5426781ae155f`
- Feature commit: `b964b665c7c534953bd94def079a3c1c0f87c45f`

Restore this deploy (fast-forward only — do not force-push):

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git revert --no-edit b964b665c7c534953bd94def079a3c1c0f87c45f
git push origin main
```

If this ROLLBACK notes commit is also on `main`, revert it first (newest first), then the feature commit. That restores the previous Otis-chrome pixel editor shell while keeping Emosi's dialog out of Mahluk. It does not revert the unused V6B studio cleanup (`ce096dd442177fda5376bc2194e01a3a660244eb`) or the earlier v6p editor package (`5ec339f7102e504efe34ac316723a3089e567ac9`). Real-color mapping, accessories, gallery, clip timeline, and Drive save remain available through the adapter; stock 44-row sheets stay untouched.

Confirm after Pages rebuilds (`deploy-character-catalog.yml`):

- https://lafrich.github.io/virtual-life-asset-pipeline/v6p-studio.html
- https://lafrich.github.io/virtual-life-asset-pipeline/pixel-editor.html?source=v6p&project=clip_pushup
- Side-by-side with https://lafrich.github.io/virtual-office/emotion-studio/ (open PIXEL EDITOR) — same toolbar including PASTE FLIP

## Previous deploy (remove unused V6B Character Studio pages and stale preview/)


- Previous `origin/main` (safe restore point): `84457b213de9f0fa99a9d44606c5f3990669eb84`
- Feature commit: `ce096dd442177fda5376bc2194e01a3a660244eb`

Restore this deploy (fast-forward only — do not force-push):

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git revert --no-edit ce096dd442177fda5376bc2194e01a3a660244eb
git push origin main
```

If this ROLLBACK notes commit is also on `main`, revert it first (newest first), then the feature commit. That restores the old V6B Character Studio body inside `site/index.html`, `v6b-reset-studio.html`, the accessory/action/action-scene editors, the leftover studio scripts/CSS, the retired tests, and `preview/`. It does not revert the v6p editor package (`5ec339f7102e504efe34ac316723a3089e567ac9`) or the v6p-studio root redirect. Live modules fetched by v6p-studio, the pixel editor, or virtual-office (including `shared-pixel-selection.js`, action/universal/warteg/indonesia bridges, `site/media/`, and `preview-stock/`) were not removed.

Confirm after Pages rebuilds (`deploy-character-catalog.yml`):

- https://lafrich.github.io/virtual-life-asset-pipeline/ (redirects to v6p-studio.html)
- https://lafrich.github.io/virtual-life-asset-pipeline/v6p-studio.html
- https://lafrich.github.io/virtual-life-asset-pipeline/pixel-editor.html?source=v6p
- https://lafrich.github.io/virtual-life-asset-pipeline/v6b-reset-studio.html should 404

## Previous deploy (v6p editor package: real colors, copy/paste, accessories, gallery, clip timeline)

- Previous `origin/main` (safe restore point): `0bfeff4e8c29d5e39230d1c209bc848334849ce1`
- Feature commit: `5ec339f7102e504efe34ac316723a3089e567ac9`

Restore this deploy (fast-forward only — do not force-push):

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git revert --no-edit 5ec339f7102e504efe34ac316723a3089e567ac9
git push origin main
```

If this ROLLBACK notes commit is also on `main`, revert it first (newest first), then the feature commit. That removes the real-color editor display, Emosi-style copy/paste wiring, accessory projects, Asset Gallery, frame-by-frame clip editor, activity contract v2, `site/media/v6p-act/` pushup art, and the additive `CLIP_CONSUMED` clip names. It does not revert the v6p-studio root redirect (`a6215a1e876222b0eab944c49f2eed2bf5e8bcac`) or the earlier Emosi topmost / Drive-save commit (`d88c7570ea985078e667f536de18823409570dc7`). The original 44-row 384×4928 part sheets stay in place either way.

Confirm after Pages rebuilds (`deploy-character-catalog.yml`):

- https://lafrich.github.io/virtual-life-asset-pipeline/v6p-studio.html
- https://lafrich.github.io/virtual-life-asset-pipeline/pixel-editor.html?source=v6p&project=clip_pushup

## Previous deploy (root URL → v6p-studio)

- Previous `origin/main` (safe restore point): `48ddc5b5da0cd91ddded9f27fdb9f9cfea6ba371`
- Feature commit: `a6215a1e876222b0eab944c49f2eed2bf5e8bcac`

Restore this deploy (fast-forward only — do not force-push):

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git revert --no-edit a6215a1e876222b0eab944c49f2eed2bf5e8bcac
git push origin main
```

If this ROLLBACK notes commit is also on `main`, revert it first (newest first), then the feature commit. That removes the `site/index.html` redirect to `v6p-studio.html` and restores the v6p banner links to Character Studio and Reset Studio. It does not delete or restore any character assets. The old Character Studio page and `v6b-reset-studio.html` were kept because tests and runtime still reference them.

Confirm after Pages rebuilds (`deploy-character-catalog.yml`):

- https://lafrich.github.io/virtual-life-asset-pipeline/ opens `v6p-studio.html`
- https://lafrich.github.io/virtual-life-asset-pipeline/v6p-studio.html

## This deploy (Emosi topmost + v6p pixel-editor Drive save)

- Previous `origin/main` (safe restore point): `3f7904b6cce5abdec60523deca4c536415650300`
- Feature commit: `d88c7570ea985078e667f536de18823409570dc7`

Restore this deploy (fast-forward only — do not force-push):

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git revert --no-edit d88c7570ea985078e667f536de18823409570dc7
git push origin main
```

If this ROLLBACK notes commit is also on `main`, revert it first (newest first), then the feature commit. That removes the Emosi topmost stamp order, the v6p pixel-editor source picker / local overrides, Save ke Drive, `DRIVE_SYNC_CONTRACT.md`, and `tools/sync-v6p-from-drive.mjs`. It does not revert the earlier v6p compositor preview (`5f84e510523b4d9ff80b1717d51dfa0102310647`).

Confirm after Pages rebuilds (`deploy-character-catalog.yml`):

- https://lafrich.github.io/virtual-life-asset-pipeline/site/v6p-studio.html
- https://lafrich.github.io/virtual-life-asset-pipeline/site/pixel-editor.html
- `DRIVE_SYNC_CONTRACT.md` and `tools/sync-v6p-from-drive.mjs` present on `main` for the "Mahluk Hidup: sync pixel edits from Drive" routine

## Previous deploy (v6p compositor + grass_v2)


- Previous `origin/main` (safe restore point): `5542e43c69f30a6693de4cdf1a08679a0feb5e6d`
- Feature commit: `5f84e510523b4d9ff80b1717d51dfa0102310647`

Restore this deploy (fast-forward only — do not force-push):

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git revert --no-edit 5f84e510523b4d9ff80b1717d51dfa0102310647
git push origin main
```

That removes the v6p studio/compositor, `site/media/v6p/`, `EDIT_GUIDE.md`, and `assets/kebon_sirih/terrain/grass_v2.png`. It does not revert the earlier Mahluk Hidup preview (`d6743b40984bc1d12da0a63d61317699a81b9b22`). `grass.png` was never overwritten.

Confirm after Pages rebuilds (`deploy-character-catalog.yml`):

- https://lafrich.github.io/virtual-life-asset-pipeline/v6b-reset-studio.html still loads
- https://lafrich.github.io/virtual-life-asset-pipeline/v6p-studio.html is gone after the revert
- https://raw.githubusercontent.com/lafrich/virtual-life-asset-pipeline/main/assets/kebon_sirih/terrain/grass.png is unchanged

## Previous deploy (preview Mahluk Hidup)

- Previous `origin/main` then: `9e24b7c1ee9066563ade0d13fa0221649efffa2a`
- That deploy: `d6743b40984bc1d12da0a63d61317699a81b9b22`
- ROLLBACK notes commit: `5542e43c69f30a6693de4cdf1a08679a0feb5e6d`

```bash
git revert --no-edit d6743b40984bc1d12da0a63d61317699a81b9b22
git push origin main
```

Pages build artifacts live on `gh-pages` or the Actions-produced `_site`; restoring `main` via revert re-runs `deploy-character-catalog.yml`.
