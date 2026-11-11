# Virtual Life asset pipeline. Run every target FROM THE REPO ROOT (scripts use repo-root-relative paths).
# Outputs are written next to the generators (assets/<family>/...) and are git-ignored.
PY ?= python3
NP ?= 4
.PHONY: help verify chars npc streets vehicles buildings vegetation environment items npc-families anim-ambil anim-nyebrang \
        barista kamar spawn-hobo ui ui-y2k ui-loak ui-mockups pets video all audit
help:
	@echo "targets: verify (3 reference pipelines) | chars npc | buildings vehicles vegetation environment items |"
	@echo "         npc-families anim-ambil anim-nyebrang barista kamar spawn-hobo | ui ui-y2k ui-loak ui-mockups | pets video | all | audit"
# ---------------------------------------------------------------- characters (v6b generator)
chars:            ## player avatar sheet from a character json (default: ichsan) -> chars-iso/v6b/live/ichsan_v6b_sheet.png
	$(PY) chars-iso/v6b/tools/live_v6b.py chars-iso/v6b/live/chars/ichsan.json
	$(PY) tools/diff_sheet.py chars-iso/v6b/live/ichsan_v6b_sheet.png game/assets/chars/ichsan_v6b_sheet.png
npc:              ## all game NPC sheets -> chars-iso/v6b/live/npc/*_v6b_sheet.png (NPCS=raka for one)
	NP=$(NP) $(PY) chars-iso/v6b/tools/npc_v6b.py $(NPCS)
# ---------------------------------------------------------------- world
buildings:        ## street buildings, signals, roads (engine.py) -> assets/street_buildings/*
	$(PY) assets/street_buildings/_work/produce.py
	$(PY) assets/street_buildings/_work/sheets.py
vehicles:         ## cars/motorbikes + riders -> assets/street_vehicles/*
	$(PY) assets/street_vehicles/_work/produce.py
vegetation:
	$(PY) assets/vegetation_kebonsirih/_work/build.py
	$(PY) assets/vegetation_kebonsirih/_work/sheet.py
environment:      ## office furniture/tiles (oldest pipeline)
	$(PY) assets/environment/tools/build.py
	$(PY) assets/environment/tools/sheets.py
items: buildings  ## found items + props
	$(PY) assets/item_temuan/_work/render_items.py
	$(PY) assets/item_temuan/_work/props.py
	$(PY) assets/item_temuan/_work/catalog_sheets_mock.py
# ---------------------------------------------------------------- NPC families + animations
npc-families:
	$(PY) assets/npc_babeh_loak/make_outputs.py
	$(PY) assets/npc_babeh_loak/make_mock.py
	$(PY) assets/npc_pak_ogah/make_pak_ogah.py
	$(PY) assets/npc_kang_parkir/make_kang_parkir.py
	$(PY) assets/npc_manusia_silver/make_manusia_silver.py
	$(PY) assets/npc_pemuda_golda/make_pemuda_golda.py
anim-ambil:       ## pick-up / search animation (Ichsan + NPC)
	$(PY) assets/anim_ambil_barang/make_anim_ambil_barang.py
anim-nyebrang: buildings vehicles   ## zebra-crossing animation set + mock GIF
	$(PY) assets/anim_nyebrang/make_anim_nyebrang.py
barista: buildings
	$(PY) assets/barista_famima/src/barista.py
	$(PY) assets/barista_famima/src/props.py
	$(PY) assets/barista_famima/src/mock.py
	$(PY) assets/barista_famima/src/contact.py
kamar:            ## empty Cove room + lobby door states + UI dialogs
	$(PY) assets/kamar_cove_kosong/src/build_a.py
	$(PY) assets/kamar_cove_kosong/src/ui_kamar.py
spawn-hobo:       ## hobo tent + spawn animation + ragged outfit
	$(PY) assets/spawn_hobo/src/build_b.py
# ---------------------------------------------------------------- UI
ui:
	$(PY) assets/ui/src/generate.py
ui-y2k: ui-mockups
	$(PY) assets/ui_y2k/src/screens.py
	$(PY) assets/ui_y2k/src/sheets.py
ui-loak: ui-y2k npc-families
	$(PY) assets/ui_loak_tas/src/loak_screens.py
	$(PY) assets/ui_loak_tas/src/sheets.py
ui-mockups:
	mkdir -p build/uimock
	$(PY) assets/ui_mockups/src/render.py
	$(PY) assets/ui_mockups/src/extras.py
pets:
	$(PY) assets/pets/migi/tools/build.py
video:            ## needs ffmpeg + outputs of the families it shows
	$(PY) assets/video_ig_story/make_video_ig_story.py
# ---------------------------------------------------------------- checks
verify: chars kamar anim-nyebrang spawn-hobo   ## the pipelines verified from a fresh clone
	$(PY) tools/diff_sheet.py chars-iso/v6b/live/ichsan_v6b_sheet.png game/assets/chars/ichsan_v6b_sheet.png
	NP=2 $(PY) chars-iso/v6b/tools/npc_v6b.py raka
	$(PY) tools/diff_sheet.py chars-iso/v6b/live/npc/raka_v6b_sheet.png game/assets/chars/raka_v6b_sheet.png
	$(PY) assets/spawn_hobo/src/chars.py
	$(PY) tools/audit_colors.py assets/kamar_cove_kosong/props assets/spawn_hobo/sprites assets/spawn_hobo/props
audit:            ## colour/alpha audit, e.g. make audit DIR=assets/spawn_hobo/sprites
	$(PY) tools/audit_colors.py $(DIR)
all: chars npc buildings vehicles vegetation environment items npc-families anim-ambil anim-nyebrang barista kamar spawn-hobo ui ui-y2k ui-loak ui-mockups pets
