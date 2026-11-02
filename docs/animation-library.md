# Virtual Life / Animation Library v1

## Central animation registry — 203 action definitions

The canonical registry `assets/animation_library/actions.json` now has
**203 entries**: the original 7 reviewed/shared animation definitions and
196 life-sim actions (status `planned`) from the production backlog.

Each planned entry stores the action ID, label, movement vs facial modality,
priority, phases, object requirements, gameplay event, synchronization type,
direction/pivot contract, and `needs_rig: true`. Planned records carry
`type: "planned"`, `frames: 0` and `frame_ms: []`: no authored frames
are implied. Existing original action definitions are not overwritten.

- `tools/build_character_catalog.py:motion_actions()` exposes only the
  existing **7 reviewed/shared definitions** to per-character Motion
  Studio; `motion_actions(include_planned=True)` returns all 203 entries.
  This preserves existing valid native actions and avoids 196 false
  per-character motion options.
- `tools/animation_backlog.py:assert_backlog_synced()` ensures the
  central registry and `backlog.json` match exactly. A change to priority
  or requirements in only one file fails tests/build until reconciled.
- The animation gallery shows all planned entries under **PLAN** or **P0**,
  and never represents them as rendered/interactive GIFs.
- A future original animation can be moved from `planned` to a
  character-appropriate reviewed action only after producing, validating
  and binding the real 64×112 sprite sheet (SE/SW/NE/NW). This is a
  separate task from registration.


## Life Sim animation roadmap (196 additional specifications)

The Animation Library now carries a separate, **unrendered production backlog** in
[`assets/animation_library/backlog.json`](../assets/animation_library/backlog.json).
These are **196 newly defined action requests**, not 196 new sprites or playable GIFs.
The 7 existing registered shared action definitions remain unchanged.

- **P0 (55)**: practical essentials for navigation, needs, hygiene, phone, office,
  jobs, commerce, city/NPC behaviors, and distinctive Indonesian sandbox actions.
- **P1 (112)**: greater context and richer domestic/social/economic activities.
- **P2 (29)**: specialist, humorous, expensive or non-essential variants.
- **13 categories**: movement, posture, objects, food, hygiene, social, office,
  trading, phone, city, funny, NPC-specific, and facial.
- **16 design-only action workflows** in
  [`assets/animation_library/workflows.json`](../assets/animation_library/workflows.json)
  describe ordering, prop reservations and important gameplay events.
  They are **not** a live state machine or automatic NPC behavior.

### How to browse the roadmap

Open the site's **ANIMATIONS** tab. **ALL / ACT / NPC / SCN / TPL** retain
their existing real/reference previews (no enormous wall of fake placeholder
GIFs). Select **PLAN** to see every unrendered life-sim action, or **P0** for
the first production candidates. Search works by ID, name, category,
priority and required prop. The right inspector shows priority/batch,
`enter → loop/contact → exit` phases, prerequisites, trigger event,
and whether synchronization with another actor is needed. The **TRY ON**
button stays disabled for all `planned` items, including cases where a
separate actor-specific GIF happens to use an identical action ID.
No footage is invented.

### Stable source-of-truth / approval path

1. **Planned specification:** `backlog.json` action ID, category,
   priority, batch, phases, requirements, gameplay event, loop and sync.
   There is **no** frame timing yet because no original sprites have been made.
2. **Source authoring:** use native 64×112 pixel rig and pivot (32,100);
   author specific SE/SW/NE/NW poses without replacing the character's
   design. Existing rigs may reuse pose logic but never receive copied
   pixels from another actor.
3. **Review:** inspect 1× and 4× alpha, layers, pivots, object contact,
   timing, character facing and transitions. In paired interactions,
   both actors must agree on the contact marker.
4. **Preview:** after original pose frames are approved, publish real
   actor-specific GIFs/PNG sheets and their per-character
   `motions.json` binding. Review status must come from real files.
5. **Game:** install/enable gameplay transitions and event markers
   separately from the public library; event effects and economy/network
   logic are never inferred from an animation name.

For a toilet or bed, `enter` approaches and aligns, `loop` sustains
the action, and `exit` returns the avatar to a valid standing position.
For a transaction, `contact` marks the **single atomic inventory/money
transfer**. For `pee_wall`, the wall must be within range and the character
must face it; an away-facing action is invalid and should abort.

*Facial backlog items are shared-coverage goals, not claims that no
character currently has expressions.* Existing Gfunk, Theodore, Yerbies,
Bowie and Milk source-specific face assets are not overwritten by this
planning data.


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
