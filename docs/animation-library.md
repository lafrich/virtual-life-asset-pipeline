# Virtual Life / Animation Library v1

The **ANIMATIONS** tab in the public Paint catalog exposes saved motion
previews from the existing pipeline, without changing any live game logic.
Existing preview-only assets are NOT automatically gameplay-ready.

## What exists

- Existing, real GIFs: pick-up, crosswalk press/walk, Pak Ogah waving a flag,
  Kang Parkir whistling, Babeh walking, and the hobo-spawn tent sequence.
  These are curated in `assets/animation_library/library.json`.
- **One Shot** — anticipate → perform → hold → recover.
- **Emote Loop** — idle → expression → hold → reset.
- **Prop Interact** — reach → contact event → release → reset.

The latter three are **timing/phase templates**, not completed pose animations.
Their Paint cards deliberately say TEMPLATE / NO FRAMES. Once actual approved
GIF previews exist, the catalog can show them without changing site markup.

## Generate a new animation family

Run from the repository root:

```bash
python tools/new_animation_template.py --name scratch_head --preset emote_loop
```

Accepted presets: `one_shot`, `emote_loop`, `interact_prop`.

The tool creates:

```text
assets/anim_scratch_head/
  manifest.json
  README.md
  src/make_animation.py
  frames/.gitkeep
  preview/.gitkeep
```

The manifest opts into `animation_catalog` auto-discovery.
No hand-written card or registry entry is needed.

**Author real poses** as 64×112 RGBA PNGs, pivot (32,100) using v6b with
the four directions SE/SW/NE/NW, no black outlines, alpha 0/56/255, native
palettes, and a 2:1 isometric camera. Filename:

```text
assets/anim_scratch_head/frames/scratch_head_se_f0.png
assets/anim_scratch_head/frames/scratch_head_sw_f0.png
assets/anim_scratch_head/frames/scratch_head_ne_f0.png
assets/anim_scratch_head/frames/scratch_head_nw_f0.png
...
```

Frame count/durations live in the generated manifest; adjust them before
authoring and keep lengths equal. Generate a **real** 4-direction GIF:

```bash
python assets/anim_scratch_head/src/make_animation.py
python tools/audit_colors.py assets/anim_scratch_head/frames
```

If the frame images are missing, the packager fails instead of manufacturing
a deceptive action. It only packages frames drawn with native generators.
Commit the GIF, native frames, source, manifest, and learning record together.

After **owner visual approval**, change the new manifest:
- `review_status`: from `unapproved_template` to a reviewed status;
- `animation_catalog.status`: from `template` to `preview`.
- A preview is still *not integrated* into the live game unless separately requested.

The next `main` build automatically adds the new animation and
poster to `animations.json`. Play/pause uses the actual GIF and its
first frame. For older four-view clips the directions are composited in the
stored GIF; the viewer doesn't invent a per-direction playback filter.

## Adding existing generated animations

For historical previews that predate the catalog field, add a verified GIF
and generator path to `assets/animation_library/library.json`. Later
generators should add `animation_catalog` metadata to their own
`assets/anim_*/manifest.json` instead, so discovery is automatic.

## Safety and learning

- Don't copy an existing GIF under another action's name and claim it was
  rendered as that action.
- Keep real source image pixel art; the web UI is a viewer only.
- Never auto-approve templates based on CI.
- Each approved animation contributes a `docs/asset-lessons/<family>.json` learning decision.
- `tests/test_animation_catalog.py` validates current previews and draft templates.
- No animation from this library is installed in Kota Shift by this feature.
