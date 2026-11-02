# Character Stock — Virtual Life (v6b)

This is the repository's **permanent, game-ready character library**. It is separate from the Kota Shift playable game. Store new characters here as reproducible, reviewed v6b assets instead of one-off image-generator illustrations or temporary GitHub Actions artifacts.

## Catalog

The machine-readable index is `assets/character_stock/index.json`. Every character entry links to its source generator, transparent sprite sheet, walking GIF, and manifest.

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

- `aladdin_sane` — Bowie-inspired glam rock NPC; copper-red spiky mullet, Aladdin Sane face paint, shirtless, slate jeans, brown boots. Follow `assets/npc_aladdin_sane/manifest.json`.

For future characters, add one entry to `index.json`, check that all linked files are committed, and keep the same layout and validation requirements.
