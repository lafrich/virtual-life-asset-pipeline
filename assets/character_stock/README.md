# Character Stock — Virtual Life (v6b)

This is the repository's **permanent, game-ready character library**. It is separate from the Kota Shift playable game. Store new characters here as reproducible, reviewed v6b assets instead of one-off image-generator illustrations or temporary GitHub Actions artifacts.

## Catalog

The landing page is built automatically from committed `assets/npc_*/manifest.json` and `assets/player_*/manifest.json` files by `tools/build_character_catalog.py`. It requires a transparent 384×4928 v6b sprite sheet and an original four-direction walking GIF, then generates a clean catalog preview from the sheet itself. **Do not edit the landing-page HTML to add a character.**

The machine-readable `assets/character_stock/index.json` is optional for display-name / description overrides; **new valid characters are discovered even if they are not added to that index**. Existing listed entries keep their custom labels.

Landing page (after GitHub Pages is enabled): **https://lafrich.github.io/virtual-life-asset-pipeline/**

Every new commit to `main` touching `assets/**` triggers the [Character Stock — Build and Deploy](../../.github/workflows/deploy-character-catalog.yml) workflow. It rebuilds and deploys the landing page with no manual card updates.

## Required layout per character

Each new character uses its own `assets/npc_<slug>/` folder:

```text
assets/npc_<slug>/
  README.md
  src/make_<slug>.py
  manifest.json
  sprites/<slug>_v6b_sheet.png
  sprites/<slug>_v6b_f*.png
  preview/<slug>_walk_4dirs_4x.gif
  preview/contact_sheet_4x.png
```

- Use the native Python v6b pipeline and reusable game primitives for body, hair, clothes, shadows and animations.
- Preserve native RGBA frame 64x112, 6 columns, 44 rows, pivot (32,100), directions SE/SW/NE/NW.
- Preview requested: **animated walking GIF** for all four directions. Other previews are optional.
- Run `bash ./run_all.sh verify`, then your character generator, then `python tools/audit_colors.py assets/npc_<slug>/sprites`.
- Do not integrate a character into Kota Shift before visual review. Changes to the playable game are separate.
- **Commit the generated files permanently** alongside the Python generator. A GitHub Actions artifact is a backup, not the library.

## Current character stock

- `aladdin_sane` — copper-red spiky mullet, lightning makeup, jeans, boots.
- `milk_mascot` — walking anthropomorphic milk-carton costume; slim white arms, face panel, angled typography and barcode.

For future characters, commit the required sprite sheet, four-direction walking GIF, and manifest to the proper folder. The catalog auto-discovers the new character. Optionally add an `index.json` entry for its custom display name and description. Before Pages can be viewed for the first time, the repository owner must select **Settings → Pages → Build and deployment → Source: GitHub Actions**; if the first deployment failed, rerun the deploy workflow.

## Landing page — XP Paint-style viewer

The gallery is a single Paint-inspired workspace: a character file drawer, native pixel canvas, sprite controls, an expression inspector and a clickable background-color palette. Use **Space** to play/pause, **←/→** to switch character, **E** for facial expressions, **G** for grid, **+/-** to zoom and **/** to search. The File and Help menus link to the GitHub library and instructions.

The builder copies each character's native RGBA sheet for real-time four-direction walk rendering in the canvas. It also exports transparent 64x112 idle thumbnails and facial-expression sprites, compositing committed `*_v6b_f*.png` overlays onto the base idle sprite. The expression inspector only shows actual existing overlays. A new verified character in `assets/npc_*` or `assets/player_*` still appears automatically on the next Pages deployment, without adding HTML or JS.
