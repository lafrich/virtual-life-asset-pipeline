# Virtual Life — asset pipeline (isometric pixel art, code-drawn)

This repository holds the **generators** for the sprites, sheets, animations, UI screens and mocks of *Virtual Life*,
an isometric (2:1) pixel-art office/street life game. Every asset is **drawn by code, pixel by pixel** (numpy + Pillow):
no image AI, no painting program, no photo tracing. A generator is a Python file; its output (PNG/GIF/JSON) is
reproducible by running it again. (One historical exception, kept as data: the v6b base body/face template was
recovered once from a supplied pixel-art reference sprite onto its native pixel grid; only the resulting numeric
arrays `chars-iso/v6b/study/*.npy` are included, not the image. Everything else is drawn from code.)

It is a **snapshot for reproduction**, not the game. The game itself (`index.html` and its asset folder) lives
elsewhere; this repo only carries the small read-only bits the generators need (`game/`).

* Quick start: `pip install -r requirements.txt && make verify` (from the repo root). See `run_all.md`.
* Rules for art: `STYLE.md`. Rules for an AI agent working here: `AGENTS.md`.
* **Every approved asset improves the pipeline:** owner review → reusable code or documented learning → regression check. See `docs/pipeline-learning.md`, `docs/asset-lessons/`, and `tools/iso_asset_primitives.py`.
* Small sample outputs: `examples/` (what the generators produce).

## Layout
```
assets/            generators per asset family (folder names = the game's asset folders, kept so imports keep working)
chars-iso/v6b/     the v6b character generator (player avatars + game NPCs): tools/live_v6b.py, npc_v6b.py, parts, study data
game/              read-only extracts of the live game: index_extract.txt (pixel font PXF + every game colour), assets/chars/*_v6b_sheet.png (reference sheets for 0-px diffs)
tools/             audit_colors.py (palette/alpha audit), diff_sheet.py (pixel diff vs the game sheet)
examples/          small sample outputs per family
Makefile, run_all.md, requirements.txt
```

### Families by topic
| Topic | Folder(s) | Entry point(s) |
|---|---|---|
| Characters / NPC v6b (player avatar, game NPCs) | `chars-iso/v6b/tools/` | `live_v6b.py <char.json>`, `npc_v6b.py [names]` |
| Custom NPCs (jobs, street people) | `assets/npc_*` (`npc_pak_ogah/job_common.py` = shared NPC renderer + `NPC` dicts) | `make_*.py` |
| Animations on top of v6b | `assets/anim_ambil_barang`, `assets/anim_nyebrang`, `assets/spawn_hobo/src/spawn.py`, `assets/barista_famima/src/barista.py` | see run_all.md |
| Street / vehicles / riders | `assets/street_vehicles/_work`, `riders_v3/_work` (`scoot.py`, `chars.py`) | `produce.py`, `sheets.py` |
| Buildings, roads, signals, props (shared iso engine) | `assets/street_buildings/_work/engine.py`, `lib.py` | `produce.py` |
| Vegetation | `assets/vegetation_kebonsirih/_work` | `build.py` |
| Office environment (tiles/furniture) | `assets/environment/tools` (+ `palette.json`) | `build.py` |
| Items | `assets/item_temuan/_work` | `render_items.py`, `props.py` |
| Rooms / Cove | `assets/kamar_cove_kosong/src` | `build_a.py`, `ui_kamar.py` |
| Hobo spawn | `assets/spawn_hobo/src` | `build_b.py` |
| UI (Y2K/Vista, loak/tas, Nokia, older mockups) | `assets/ui_y2k`, `assets/ui_loak_tas`, `assets/ui_nokia`, `assets/ui_mockups`, `assets/ui` | see run_all.md |
| Pets | `assets/pets/migi/tools` | `build.py` |
| Instagram story video builder | `assets/video_ig_story` | `make_video_ig_story.py` (ffmpeg) |

Most family folders have their own `README.md` (Indonesian or English) with sizes, pivots and states; manifests
(`manifest.json`) describe every output file. Those READMEs are copied as they were written; their paths now
read `assets/...` (repo-root relative).

## How assets are made
1. **Geometry first.** Positions come from the game's world grid (tile = 64×32 px; see "Camera / iso" below). A
   generator places boxes, slopes, cylinders, textures in world units; `street_buildings/_work/engine.py` turns them
   into pixels with a per-pixel depth buffer (`Spr.box/top/face_sw/face_se/slope/points/cyl/dome`, materials = 5-tone
   ramps `mat('NAME', [...])`, `Tex` for face textures/text, `Loc` for a local facade frame with `sw/se` orientation).
2. **Characters** are layered sprites from `live_v6b` (hair back, body, arms, shoes, pants, shirt, outer, face, hair
   front, glasses, brows) recoloured by the character json (`hair_map`, `skin_map`, outfit ramps). New poses are
   written per frame: offsets of layers, `limb()` arms (shoulder → elbow → wrist + hand shape), `squat_legs()`,
   `lie_flat()`; expressions via `face_layer(expr, ...)`.
3. **Animation = per-frame pose code + timing in the manifest.** Each phase is a list of pose dicts (see
   `anim_ambil_barang/make_anim_ambil_barang.py` POSES / `A(...)`, `spawn_hobo/src/spawn.py` PH + MS). Timing is ms per
   frame, written to `manifest.json` together with frame counts, root motion and anchors. GIF previews are 3–4× nearest.
4. **Output** at 1× (the game scale) plus integer-scaled previews (2×/3×/4×, NEAREST), contact sheets on a dark
   background, and mocks that put the new asset into a scene.
5. **Verify** (always, before reporting): colour audit, alpha audit, 0-px diff for anything that must equal the game,
   and look at the 4× mock yourself.

## v6b style rules (locked)
* **No black outline.** Edges are the material's own darker tone (the engine darkens right/bottom silhouette pixels by 1 tone).
* **Light from the left/top-left:** top faces brightest, sw-facing (left) faces lit, se-facing (right) faces one tone darker.
* **4–5 tones per material** (a ramp from dark to light); no gradients, no dithering on objects.
* **Shadow:** flat pure-black ellipse/footprint at **alpha 56**. Pixels are **alpha 0, 56 or 255 only**
  (separate `__glow` layers for lamps may use a 90 halo; the game's own lie/swim rows contain 46/220 — legacy).
* **No anti-aliasing**, no sub-pixel rotation, integer scaling only, even paste offsets for text on iso faces.
* **Palette from the game.** Every opaque colour must already exist in the game (`game/index_extract.txt`), in an
  existing sprite (`assets/npc_babeh_loak/_tools/known.json`) or in `assets/environment/palette.json`. New hex = needs approval and must be reported.
* No flowers/shrubs unless asked (project-specific restriction used for street scenes).

## Character / NPC format
* Frame **64×112 px**, pivot **(32,100)** (feet on the ground point), figure ≈ 84–88 px tall.
* **4 directions**: `se`, `sw`, `ne`, `nw`; **sw = horizontal mirror of se, nw = mirror of ne** (so no one-sided details).
* Game sheet: 6 columns; rows = animation × direction (se, sw, ne, nw). Row starts: walk 0, idle 4, talk 8, sit 12,
  sit_type 16, sleep 20, tired 24, swim 28, float 32, lie 36, perch 40. **idle = 4 frames, walk = 6 frames.**
* Expressions: neutral, smile, happy, sad, angry, surprised, sleepy, blink, talk_open, talk_closed, embarrassed.

## Camera / iso geometry
* Tile 64×32. World (c, r) → screen: `x = (c − r)·32`, `y = (c + r)·16` (+ origin). +c goes screen right-down (se),
  +r goes screen left-down (sw). Depth sort key ≈ `c + r (+ z/32)`.
* Heights: game h-unit = HS 1.6 × PPU 2 = **3.2 px**; a full wall is 40 h = 128 px. Engine `z` is in pixels.
* `sw` sprites show their front on the sw (lit) face, `se` sprites on the se (shade) face; `ne`/`nw` are the backs.
* Sprite metadata: `pivot` = footprint centre on the ground (or feet for characters), `anchor` = named points
  (doors, seats, hand positions) in sprite pixels; listed in each `manifest.json`.

## Verification
* `python3 tools/audit_colors.py <dir|glob>` → new colours, alpha outside 0/56/255, non-black semi-transparent pixels. Run on sprites, not mocks.
* `python3 tools/diff_sheet.py new.png game.png` → number of differing pixels (goal 0 for regenerated game characters).
* `python3 assets/spawn_hobo/src/chars.py` → per-frame identity check of the player layers vs the game sheet.
* Visual: open the 4× mock/contact sheet and check it, every time.

## Not included (on purpose)
Generated outputs (PNG/GIF/MP4/frames — re-create them), old `_prev*` iterations, scratch files, reference photos
(people, a pet, third-party brands), the game's `index.html`, test harnesses with logins, files > 600 KB. See `run_all.md` → "Known gaps".

## Character Stock landing page

View the automatically generated character gallery at **https://lafrich.github.io/virtual-life-asset-pipeline/** (after the repository's GitHub Pages is enabled).

The site uses only static HTML/CSS/JavaScript. `tools/build_character_catalog.py` scans new committed v6b character manifests, validates their sprites, and generates the live catalog and walking-GIF thumbnails. The `.github/workflows/deploy-character-catalog.yml` workflow rebuilds it on commits to `main` and publishes through GitHub Pages. No manual edits to the landing page are required for new characters. See `assets/character_stock/README.md` for naming and required files.

## Animation Library / Paint catalog

The existing Character Stock Paint page now has an **ANIMATIONS** tab with real saved GIF previews, preview-only status, timing metadata, and reusable draft action presets. Existing examples remain separate from the playable game. The auto-discovered index is generated by `tools/build_animation_catalog.py`, with legacy GIF provenance stored in `assets/animation_library/library.json`.

To scaffold a new native v6b animation:

```bash
python tools/new_animation_template.py --name scratch_head --preset emote_loop
```

The scaffold contains an editable 4-direction timing manifest, frame paths and a GIF packager, **not fabricated pose animation**. See `docs/animation-library.md`.
