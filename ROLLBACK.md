# Rollback — virtual-life-asset-pipeline 2026-11-07

Repo: `lafrich/virtual-life-asset-pipeline`  
Branch: `main`  
Live: https://lafrich.github.io/virtual-life-asset-pipeline/

## This deploy (v6p compositor + grass_v2)

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
