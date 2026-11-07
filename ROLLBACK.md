# Rollback — virtual-life-asset-pipeline 2026-11-07

Repo: `lafrich/virtual-life-asset-pipeline`  
Branch: `main`  
Live: https://lafrich.github.io/virtual-life-asset-pipeline/

## SHAs

- Previous `origin/main` (safe restore point): `9e24b7c1ee9066563ade0d13fa0221649efffa2a`
- This deploy: `d6743b40984bc1d12da0a63d61317699a81b9b22`

## Fast-forward rollback (do not force-push)

From a clean checkout of `main`:

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git revert --no-edit d6743b40984bc1d12da0a63d61317699a81b9b22
git push origin main
```

If more than this commit landed after the deploy, revert only `d6743b40984bc1d12da0a63d61317699a81b9b22` (or revert the range back to `9e24b7c1ee9066563ade0d13fa0221649efffa2a`) so history stays a fast-forward.

After the revert reaches GitHub Pages (workflow `deploy-character-catalog.yml`), confirm:

- https://lafrich.github.io/virtual-life-asset-pipeline/v6b-reset-studio.html
- The page is the previous studio (no preview blank-head / authored-face / QA'd-action set from `d6743b40984bc1d12da0a63d61317699a81b9b22`).

Pages build artifacts live on `gh-pages` or the Actions-produced `_site`; restoring `main` to `9e24b7c1ee9066563ade0d13fa0221649efffa2a` (via revert) re-runs that workflow and republishes the old catalog.
