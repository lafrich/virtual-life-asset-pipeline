# Private asset repo + public Paint character catalog

Keep the **master assets and Python rig private** while publishing **preview-only files** to a separate public repository.

## Repositories

| Repo | Desired visibility | Purpose |
| --- | --- | --- |
| `lafrich/virtual-life-asset-pipeline` | **Private** | Full 384×4928 master sheets, expression overlays, Python generators, project source and Git history |
| `lafrich/virtual-life-character-catalog` | **Public** | Paint-style landing page, limited 384×448 walking preview sheet, preview GIFs and composited face images |

The new public URL will be `https://lafrich.github.io/virtual-life-character-catalog/`. The old `/virtual-life-asset-pipeline/` URL will cease to be publicly served once the original repository is made private on a Free account.

## One-time owner setup (in this order)

1. Create a **new public repository** named `virtual-life-character-catalog` at https://github.com/new. Check **Add a README file** to create the initial `main` branch. Do not import or fork the private source repository, because that would copy private Git history.
2. Create a **fine-grained Personal Access Token** via https://github.com/settings/personal-access-tokens/new. Set owner to `lafrich`; choose **Only select repositories → virtual-life-character-catalog**; grant **Contents: Read and write** and no other write permissions. Keep the token out of commits, issues and chats.
3. In the **source repo** (still public for now), open **Settings → Secrets and variables → Actions → New repository secret**. Name it `CATALOG_PUBLISH_TOKEN` and paste the PAT there. Never store this value in source code.
4. Go to **Actions → Publish safe character previews to public catalog → Run workflow** on the `main` branch. This builds `_public_site`, runs `tools/audit_public_catalog.py`, checks out the destination using the narrow secret and pushes **only the public web output**.
5. In **virtual-life-character-catalog**, choose **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main / (root)**. Check `https://lafrich.github.io/virtual-life-character-catalog/` and verify characters, direction controls and expressions are working.
6. **Only after the new Pages URL succeeds**, in the source repo open **Settings → General → Danger Zone → Change repository visibility → Make private**. This setting requires account owner action; the connected GitHub tooling cannot change repository visibility. Public forks or previously copied source are **not** retroactively removed.
7. Future asset changes merged into the private repo's `main` automatically rebuild and push the sanitized public catalog. The token must be renewed when it expires; update the same secret.

## Security guarantees and limitations

- Public build: `python tools/build_character_catalog.py --public`
- Public export audit: `python tools/audit_public_catalog.py _public_site`
- Public destination receives **no** Python sources, no manifest files, no `assets/` directories, no full 384×4928 game sheets. The viewer gets only the minimum four-direction walk frames and 64×112 expression/thumbnail previews.
- Public Paint interface displays **WALK.PNG** instead of **SPRITE.PNG**, and **PRIVATE** instead of a source link. People can still download any images displayed publicly, including walk previews: this is unavoidable for a publicly visible static website.
- Do not place generated raw sheets in `site/` (which is copied into the public build).
- The publisher uses `CATALOG_PUBLISH_TOKEN` only to push generated public files to the **separate destination repo**. `rsync` excludes the destination `.git/`, `.github/`, and `README.md`.
- GitHub Actions logs, artifacts and repository contents will become private only after you actually change the original repository visibility.
- Previously published data may exist in forks, clones, third-party caches and archives. Visibility changes do not erase copies.

### Pipeline diagnosis

If the new public site stops updating, check the private-source **Publish safe character previews to public catalog** Action for a failed export audit or expired PAT. The public destination uses branch-based Pages; no Python, master file, or secret is needed there.
