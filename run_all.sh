#!/usr/bin/env bash
# Same targets as the Makefile, for machines without `make`. Run from the repo root:  ./run_all.sh <target> [...]
set -e
cd "$(dirname "$0")"
PY=${PY:-python3}; export NP=${NP:-4}
run() { echo "+ $*"; "$@"; }
chars()        { run $PY chars-iso/v6b/tools/live_v6b.py chars-iso/v6b/live/chars/ichsan.json
                 run $PY tools/diff_sheet.py chars-iso/v6b/live/ichsan_v6b_sheet.png game/assets/chars/ichsan_v6b_sheet.png || true; }
npc()          { run $PY chars-iso/v6b/tools/npc_v6b.py ${NPCS:-}; }
buildings()    { run $PY assets/street_buildings/_work/produce.py; run $PY assets/street_buildings/_work/sheets.py; }
vehicles()     { run $PY assets/street_vehicles/_work/produce.py; }   # _work/sheets.py needs a 'before/' capture of the old game cars (not included)
vegetation()   { run $PY assets/vegetation_kebonsirih/_work/build.py; run $PY assets/vegetation_kebonsirih/_work/sheet.py; }
environment()  { run $PY assets/environment/tools/build.py; run $PY assets/environment/tools/sheets.py; }
items()        { run $PY assets/item_temuan/_work/render_items.py; run $PY assets/item_temuan/_work/props.py; run $PY assets/item_temuan/_work/catalog_sheets_mock.py; }
npc-families() { for s in npc_babeh_loak/make_outputs.py npc_babeh_loak/make_mock.py npc_pak_ogah/make_pak_ogah.py npc_kang_parkir/make_kang_parkir.py \
                          npc_manusia_silver/make_manusia_silver.py npc_pemuda_golda/make_pemuda_golda.py; do run $PY assets/$s; done; }
anim-ambil()   { run $PY assets/anim_ambil_barang/make_anim_ambil_barang.py; }
anim-nyebrang(){ run $PY assets/anim_nyebrang/make_anim_nyebrang.py; }      # needs: buildings vehicles
barista()      { for s in barista props mock contact; do run $PY assets/barista_famima/src/$s.py; done; }
kamar()        { run $PY assets/kamar_cove_kosong/src/build_a.py; run $PY assets/kamar_cove_kosong/src/ui_kamar.py; }
spawn-hobo()   { run $PY assets/spawn_hobo/src/build_b.py; }
ui()           { run $PY assets/ui/src/generate.py; }
ui-y2k()       { ui-mockups; run $PY assets/ui_y2k/src/screens.py; run $PY assets/ui_y2k/src/sheets.py; }
ui-loak()      { ui-y2k;   # also needs npc-families (babeh mock)
                  run $PY assets/ui_loak_tas/src/loak_screens.py; run $PY assets/ui_loak_tas/src/sheets.py; }
ui-mockups()   { mkdir -p build/uimock; run $PY assets/ui_mockups/src/render.py; run $PY assets/ui_mockups/src/extras.py; }
pets()         { run $PY assets/pets/migi/tools/build.py; }
video()        { run $PY assets/video_ig_story/make_video_ig_story.py; }
verify()       { chars; kamar; buildings; vehicles; anim-nyebrang; spawn-hobo
                 NP=2 run $PY chars-iso/v6b/tools/npc_v6b.py raka
                 run $PY tools/diff_sheet.py chars-iso/v6b/live/npc/raka_v6b_sheet.png game/assets/chars/raka_v6b_sheet.png
                 run $PY assets/spawn_hobo/src/chars.py
                 run $PY tools/audit_colors.py assets/kamar_cove_kosong/props assets/spawn_hobo/sprites assets/spawn_hobo/props || true; }
all()          { chars; npc; buildings; vehicles; vegetation; environment; items; npc-families; anim-ambil; anim-nyebrang; barista; kamar; spawn-hobo; ui; ui-loak; pets; }
[ $# -eq 0 ] && { echo "usage: ./run_all.sh <chars|npc|buildings|vehicles|vegetation|environment|items|npc-families|anim-ambil|anim-nyebrang|barista|kamar|spawn-hobo|ui|ui-y2k|ui-loak|ui-mockups|pets|video|verify|all>"; exit 1; }
for t in "$@"; do "$t"; done
