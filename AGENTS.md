# AGENTS — instructions for an AI agent (or person) making Virtual Life assets

## Ground rules
* **Preview first.** You produce files in this repo (generators + outputs). You never edit the live game
  (`index.html`, its asset folders) and you never deploy. Only the owner approves integration.
* Do not message other people/agents unless the owner asks. Report back to whoever gave you the job.
* One pass, minimal iterations: build → check yourself → fix the obvious → report honestly.
* Never call your own result "the best"/"great" (owner preference: describe, don't praise).
* Follow `STYLE.md` (v6b): no black outline, light from the left, 4–5 tones, black shadow alpha 56, alpha 0/56/255,
  no anti-aliasing, palette from the game, no new hex without listing it.
* Run everything **from the repo root** (paths are repo-root relative).
* **Every OWNER-APPROVED asset improves the pipeline.** A successful script run is not approval. Record an approved insight in `docs/asset-lessons/<family>.json`, promote reusable techniques to shared code with tests, or explain in the record why the lesson is local. Details: `docs/pipeline-learning.md`.
* Never silently alter already-approved sprites when upgrading shared code: run pixel-regression tests and get owner approval for intentional visual changes.

## Workflow
1. Read the request; find the closest existing family (`README.md` → "Families by topic") and reuse its generator.
2. Get geometry from the game: tile 64×32, `x=(c−r)·32, y=(c+r)·16`, 1 h-unit = 3.2 px. Use real coordinates if the asset has a place in the game.
3. Write the generator in `assets/<family>/src/` (or `_work/`). Import, don't copy, shared code:
   `street_buildings/_work/engine.py` + `lib.py` (props/buildings), `chars-iso/v6b/tools/live_v6b.py` (characters),
   `npc_pak_ogah/job_common.py` (`render(npc, anim, f, view, expr)`), `anim_ambil_barang/make_anim_ambil_barang.py`
   (`ichsan_layers`, `limb`, `squat_legs`, `compose_idle`, `shift`).
4. Write outputs: 1× sprites/sheets, 4× previews (NEAREST), a dark-background contact sheet, a mock in context, `manifest.json`, `README.md`.
5. Verify (below). Look at the 4× mock yourself.
6. **Learn from approval:** after the owner accepts the visual, write the learning record, promote transferable logic to existing shared modules/`tools/iso_asset_primitives.py` and add tests. If it is intentionally asset-specific, document why instead. Do not generalize rejected iterations.
7. Rebuild previously approved affected assets and compare unchanged sprites pixel-for-pixel; keep the live game untouched.
8. Report (below).

## How to add …
* **A character (player avatar):** copy `chars-iso/v6b/live/chars/ichsan.json` → set `hair_style`, `hair_map`, `skin_map`, outfits,
  glasses → `python3 chars-iso/v6b/tools/live_v6b.py chars-iso/v6b/live/chars/<name>.json`.
* **A game NPC:** add an entry to `NPCS` in `chars-iso/v6b/tools/npc_v6b.py` → `NP=2 python3 chars-iso/v6b/tools/npc_v6b.py <name>`.
* **A custom NPC with props/poses:** start from `assets/npc_pak_ogah/make_pak_ogah.py` or `assets/npc_babeh_loak/` (job_common.render + overlays).
* **An animation:** list phases → for each frame a pose dict (layer offsets, `limb()` arm targets, squat depth, expression).
  Keep 64×112 / pivot (32,100); se authored, sw = mirror; ne/nw from the back layers. Put frame counts, ms per frame,
  loop flag, root motion (tiles per frame) and anchors in `manifest.json`. Make 4× GIFs per direction + a key-pose sheet.
  Templates: `assets/anim_ambil_barang`, `assets/anim_nyebrang`, `assets/spawn_hobo/src/spawn.py`.
* **A building/prop:** `@asset(name, group, W, D, Hmax, oris=...)` + a function drawing with `Loc` (`L.box`, `L.top`,
  `L.front`, `L.side`, `L.gable`, `L.pts`, `bshadow`), then `build(name, ori)` → (img, glow, pivot, anchor). Examples:
  `assets/kamar_cove_kosong/src/props_kamar.py` (ember/gayung), `assets/spawn_hobo/src/tent.py`.
* **UI:** `assets/ui_y2k/src/y2k.py` (glass panels, buttons, orbs, icons) as in `assets/kamar_cove_kosong/src/ui_kamar.py`.

## Verify checklist
- [ ] `python3 tools/audit_colors.py <sprite dir>` → new colours: none (or listed), alpha only 0/56/255, shadows black.
- [ ] Characters: `python3 tools/diff_sheet.py <new sheet> game/assets/chars/<name>_v6b_sheet.png` → 0 px on frames you did not change.
- [ ] Sizes/pivots in `manifest.json` match the files.
- [ ] 4× mock and contact sheet opened and looked at; nothing clipped, hidden or floating; reads at 1×.
- [ ] Every changed asset generator/manifest has `docs/asset-lessons/<family>.json` with owner approval context.
- [ ] Generalizable techniques are in shared code with tests (or `promotion_rationale` explains why not).
- [ ] `python3 tools/check_asset_lessons.py` and shared primitive tests pass.
- [ ] Approved older sprites remain pixel-exact unless the owner authorized changes.
- [ ] Nothing in the game folder was touched.

## Report format
Plain text: folder paths, preview files (mock PNGs, GIFs), counts (frames, sprites), new colours (or "none"),
what you verified, **learning promoted / not promoted and why**, the owner's review status, and honest limitations (what looks off, what is approximate, what was not done).
