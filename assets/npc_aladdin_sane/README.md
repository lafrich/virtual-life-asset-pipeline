# Aladdin Sane — v6b NPC sprite asset

A **code-generated** glam-rock NPC study based on the supplied Aladdin Sane look: swept/spiky brown mullet, red/blue lightning makeup, bare torso (no shirt), slate jeans, and walnut-brown boots. Version 2 uses a swept, jagged quiff and feathered mid-length mullet.

This family **does not contain AI-generated drawings**. It reuses the established `npc_v6b`, `parts_v6b`, and `live_v6b` geometry, posing, hair, skin, clothes, and shadows. The lightning is generated in the native 1-pixel face-code grid and follows head bob, 4 directions (mirrors), and expression overlays.

## Build from repository root

```bash
pip install -r requirements.txt
./run_all.sh verify
python3 assets/npc_aladdin_sane/src/make_aladdin_sane.py
python3 tools/audit_colors.py assets/npc_aladdin_sane/sprites
```

The primary previews are animated **GIFs**: `preview/aladdin_sane_walk_4dirs_4x.gif` (all four directions) and `preview/aladdin_sane_idle_4dirs_4x.gif` (all four directions). They use the 1× engine sprites, enlarged 4× with nearest-neighbor scaling.\n\nOutputs (generated; not committed): `sprites/aladdin_sane_v6b_sheet.png` and eight `_f*.png` expression overlays, `preview/contact_sheet_4x.png`, `preview/mock_4x.png`, four 4x walk GIFs and `manifest.json`. GitHub Actions can store the generated artifacts.

Integration target: `384×4928` RGBA sprite sheet, 6 columns × 44 rows, native frame `64×112`, foot pivot `(32,100)`. Order per animation is SE / SW / NE / NW. Original game and other character sheets are **not edited**.

Existing game palette colors used for face paint: red `#DC3228` and `#D7261E`, blue `#3E6FA8` and `#78BAF5`. New colors added to the game palette: **none**.

**Quality note:** The face paint is severely simplified to be readable on the original v6b pixel grid; the exact photographic makeup cannot fit at that resolution. Check the nearest-neighbor contact sheet at 1× and 4× before integration. Original v6b lie/swim alpha exceptions remain unchanged.
