# run_all — commands per asset family

Everything runs **from the repo root** (paths in the scripts are repo-root relative). Outputs are written next to the
generators (`assets/<family>/…`, `chars-iso/v6b/live/…`) and are git-ignored.

```bash
pip install -r requirements.txt          # pillow, numpy
sudo apt-get install fonts-dejavu-core fonts-wine ffmpeg   # label fonts, Tahoma clone (UI), video only
./run_all.sh verify                      # the reference pipelines (or: make verify)
./run_all.sh <target> [...]              # any target below; `make <target>` is identical where make exists
```

| Target | What it makes | Commands (from repo root) | Needs first | Time* |
|---|---|---|---|---|
| `chars` | player avatar sheet (Ichsan) + diff vs game sheet | `python3 chars-iso/v6b/tools/live_v6b.py chars-iso/v6b/live/chars/ichsan.json` → `chars-iso/v6b/live/ichsan_v6b_sheet.png` | – | 9 s |
| `npc` | all game NPC sheets (`NPCS=raka` for one) | `python3 chars-iso/v6b/tools/npc_v6b.py [name…]` → `chars-iso/v6b/live/npc/*_v6b_sheet.png` | – | 40 s |
| `buildings` | street buildings, roads, signals, props (iso engine) | `python3 assets/street_buildings/_work/produce.py`; `…/sheets.py` | – | 15 s |
| `vehicles` | cars, motorbikes, riders | `python3 assets/street_vehicles/_work/produce.py` | – | 27 s |
| `vegetation` | trees/ground cover | `python3 assets/vegetation_kebonsirih/_work/build.py`; `…/sheet.py` | – | 2 s |
| `environment` | office tiles + furniture (oldest pipeline) | `python3 assets/environment/tools/build.py`; `…/sheets.py` | – | 40 s |
| `items` | found items, icons, props | `python3 assets/item_temuan/_work/render_items.py`; `props.py`; `catalog_sheets_mock.py` | buildings | 2 s |
| `npc-families` | custom NPCs (babeh loak, pak ogah, kang parkir, manusia silver, pemuda golda) | `python3 assets/npc_babeh_loak/make_outputs.py`; `make_mock.py`; `assets/npc_*/make_*.py` | – | 40 s |
| `anim-ambil` | pick-up / search animation (Ichsan + NPC) | `python3 assets/anim_ambil_barang/make_anim_ambil_barang.py` | – | 9 s |
| `anim-nyebrang` | zebra-crossing animation set, mock GIF | `python3 assets/anim_nyebrang/make_anim_nyebrang.py` | buildings, vehicles | 35 s |
| `barista` | FamiCafe barista NPC, props, UI, mock | `python3 assets/barista_famima/src/{barista,props,mock,contact}.py` | buildings | 11 s |
| `kamar` | empty Cove room, ember/gayung, lobby door states, UI dialogs | `python3 assets/kamar_cove_kosong/src/build_a.py`; `ui_kamar.py` | – | 2 s |
| `spawn-hobo` | hobo tent, spawn animation, ragged outfit, mock GIFs | `python3 assets/spawn_hobo/src/build_b.py` | – | 16 s |
| `ui` | first UI kit (font, panels, emotes) | `python3 assets/ui/src/generate.py` | – | 4 s |
| `ui-mockups` | older HUD mockups (writes `build/uimock/`) | `mkdir -p build/uimock`; `python3 assets/ui_mockups/src/render.py`; `extras.py` | – | 4 s |
| `ui-y2k` | Y2K/Vista UI kit, screens, icon sheet | `python3 assets/ui_y2k/src/screens.py`; `sheets.py` | ui-mockups | – |
| `ui-loak` | loak/tas (sell/bag) screens | `python3 assets/ui_loak_tas/src/loak_screens.py`; `sheets.py` | ui-y2k, npc-families | – |
| `pets` | Migi the cat (sheet, props) | `python3 assets/pets/migi/tools/build.py` | – | 9 s |
| `video` | Instagram-story MP4s from existing previews | `python3 assets/video_ig_story/make_video_ig_story.py` | ffmpeg + most families | – |
| `all` | everything above except video | `./run_all.sh all` | – | ≈5 min |

\* measured on the build box (8 cores) from a fresh clone.

## Checks
```bash
python3 tools/audit_colors.py assets/spawn_hobo/sprites           # new colours / alpha outside 0,56,255
python3 tools/diff_sheet.py chars-iso/v6b/live/npc/raka_v6b_sheet.png game/assets/chars/raka_v6b_sheet.png   # expect 0 px
python3 assets/spawn_hobo/src/chars.py                            # per-frame identity of Ichsan layers vs the game sheet
```

## Known gaps (not reproducible offline from this repo)
* `assets/street_buildings/_work/capture_game_outside.py`, `assets/anim_nyebrang/_work/capture_bg.py`: render the **live game**
  in headless Chrome (playwright + a local copy of the game's `index.html`, not included). The one capture the nyebrang
  mock needs is shipped as `assets/anim_nyebrang/_work/bg_zebra_1x.png`.
* `assets/ui_nokia/src/export.py`: playwright export of the Nokia UI page; its two outputs that `ui_y2k` reads are shipped
  (`assets/ui_nokia/1x_native/01_standby.png`, `assets/ui_nokia/src/bg_844.png`).
* `assets/street_vehicles/_work/sheets.py`: before/after sheet needs a `before/` capture of the old game cars (not included).
* `assets/npc_babeh_loak/_tools/known.py`: rebuilds `known.json` from the game's sprite folders (not included); the resulting `known.json` is shipped.
* `assets/pets/migi/tools/refcompare.py`, `chars-iso/v6b/tools/photo_compare.py`, `chars-iso/v6b/tools/extract.py`:
  compare against / extract from reference photos or the original reference image, which are **not included** (privacy / third-party).
* `npc_all/*`, `npc_gfunk`, `npc_theodore`, `npc_yerbies`, `npc_preview*`, `street_vehicles/riders_v2|v3`: included as code, not
  smoke-tested; some read outputs of other families or write scratch files to `/tmp`.
* Scripts using `/tmp/...` keep it as scratch space (Linux). Fonts are read from `/usr/share/fonts/truetype/{dejavu,wine}/`.
