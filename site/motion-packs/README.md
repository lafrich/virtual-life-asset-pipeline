# Mahluk Hidup — Genesis V6B motion assets

This directory is the single **JSON asset registry** for the existing Animation Gallery,
Character Preview QA, and Action Editor. No editor dropdown or renderer source needs
modification when adding a motion.

To add an animation:

1. Save **one new** `<id>.motion.json` file here, e.g. `clp_standing_punch.motion.json`.
2. Commit and let GitHub Pages deploy. Refresh Mahluk Hidup.

The Pages build automatically discovers all `*.motion.json` files and regenerates
`index.json` using `tools/build_mahluk_motion_registry.py`. There is **no
manual index edit and no JavaScript/UI edit**. If running an unbuilt local
server, run `python3 tools/build_mahluk_motion_registry.py site/motion-packs`
once to refresh the local index.

Every motion JSON must contain a unique `id`, `name`, `category` (e.g. punch/kick),
`format: "genesis-v6b-universal-motion-v1"`, `sourceAction: "idle"`
(or another approved V6B source pose), `frames`, and complete
`tracks` for **SE/SW/NE/NW** and all six body parts in every frame.

Only the new JSON asset changes; do **not** modify Character Wizard,
Animation Studio, Action Editor, Genesis base sprites, Emosi, or Custom Wear.

Bundled data is immutable. `status: "draft"` (or absent) appears as REVIEW;
only explicitly approved records may set `status: "stock"`. Existing
user/local/Drive clips take precedence for their own IDs. The five retired
incompatible activity stock entries are filtered from the active database.
Original native `idle` and `walk` atlas art is never modified by this registry.

A new motion is not proven visually correct until its 4 directions and
Male/Female/Custom Wear/Emosi combinations have been checked in the existing
preview controls. No extra preview UI is needed.
