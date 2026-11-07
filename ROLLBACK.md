# Rollback — virtual-life-asset-pipeline 2026-11-07

Repo: `lafrich/virtual-life-asset-pipeline`  
Branch: `main`  
Live: https://lafrich.github.io/virtual-life-asset-pipeline/

## This deploy (remove unused V6B Character Studio pages and stale preview/)

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
