# LGR-1 — Lafrich Genesis Rig

**Canonical name:** Lafrich Genesis Rig, version 1 (**LGR-1**).

**Technical category:** 2D skeletal cutout pixel rig (2.5D / four-direction isometric puppet).

It is *not* a 3D skeleton, not a simple spritesheet animation and not a new image-generation style. LGR-1 combines **independently editable pixel art** with **per-direction joint positions and mask ownership**. Animations move those parts using procedural, time-based transform data rather than rasterizing and storing each animation frame in advance.

## Required identity

- Source bases: frozen `genesis_male_nude` and `genesis_female_nude` from original V6B.
- Final master IDs: `lafrich_genesis_male` and `lafrich_genesis_female`.
- Format marker: `rigFormat: "LGR-1"`.
- Compatibility wire formats: `lafrich-genesis-binding-v1` for the binding and `lafrich-genesis-master-v1` for approved masters.
- Export: verified JSON master, declarative Python geometry source, plus 64×112 PNG artwork encoded as source RGBA layers inside the JSON. A future `.lgr` binary/container is **not** implemented.
- Original body is **not** keyed to any historical Mahluk-1/2 character ID.

## Geometry

- Four authored directions: `se`, `sw`, `ne`, `nw`.
- Native coordinate system: 64×112 pixels, original V6B anchor [32,100].
- Eleven body pieces (since 10 Nov 2026): pelvis (root), torso (upper body), head, both upper arms and forearms, both thighs and lower legs (near/far relative to viewer). Older 10-piece masters (no pelvis) still open; see "Pelvis split" below.
- Each angle keeps independent per-part pivot coordinates and a pixel mask assigning every visible original pixel to one of the ten pieces.
- A part that is **occluded** in one direction may have zero visible pixels there, while its pivot and parent relationship still exist.
- Parent hierarchy transports child joints; nearest-neighbor rendering preserves source pixels.
- Physical layers retain independence: body/skin, body-front, hair front/back, tops front/back, pants, shoes and accessories. A character outfit can replace layers before applying the SAME 10-part mask and pose.

## Animation and expression

- `site/genesis_procedural_runtime.py` computes affine transforms from animation time, per-joint x/y offsets and angular rotations; supports optional appearance-layer overrides, no frame atlas required.
- Faces, eyes, mouth and lipsync use the separately authored **Emosi.exe** database. They are composited with the head transform and must never be baked into the underlying body PNG.
- Procedural example motions (idle/walk/wave) are diagnostic checks, not a completed Mainkan animation library.

## One active authoring pipeline

`Pixel Editor → Pivot & Slicing (4 directions) → Bind → Check Binding → Approve & Save LGR-1 Master.`

The active app is `site/genesis-workbench.html`, reached through `site/mahluk-hidup.html` and `site/index.html`. The only separate authoring sub-app linked from this UI is Emosi.exe.

The following historical Mahluk pages are **hard-retired**: `lafrich-puppet-studio.html`, `genesis-editor.html`, `mahluk-action-editor.html`, `mahluk-animation-native.html`, `v6p-studio.html`, and `pixel-editor.html`. They serve static retirement pages and execute no old JavaScript. Their entry controllers also return immediately before initialization.

**Old synchronization is fail-closed:**

- `site/mahluk-hub-drive.js` rejects connect, backup/restore, list, save and load for legacy Mahluk.
- `site/drive-sync.js` rejects writing anything with `app="mahluk"`, and rejects V6P part/user project uploads. It does **not** block independent Semesta and Bangun Ruang Drive operations.
- `site/vlhub-characters-publish.js` rejects old V1/V2 sync into same-origin Semesta character keys and its async archive fallback.
- `tools/build_mahluk_motion_registry.py` leaves the old `genesis-v6b-motion-registry-v1` index empty and rejects any newly authored six-part motion-packs.
- `site/v6p-compositor.js` bypasses legacy local part overrides for immutable, frozen Genesis Male/Female sources.
- `site/genesis-cloud.js` writes **only** canonical Male/Female approved LGR-1 masters to `My Drive/Membangun/Mahluk Hidup/Genesis Masters`, validates matching base IDs and every direction's rig, pivot and mask, and verifies the SHA-256 readback.

Existing legacy character files, saved game assets and historical Git sources remain intact for backward-compatible **read-only** gameplay in Semesta/Mainkan. There is **no automatic migration** of V1/V2/V6P characters, actions, clips, or older Drive backups into LGR-1. Deleting those records without checking dependencies could break existing saved games, so they are archived, not physically destroyed.

**Mainkan integration is not yet implemented** in this repository. The next game integration should explicitly whitelist `rigFormat === "LGR-1"` and `format === "lafrich-genesis-master-v1"`, require four directions, require `approvedAt`, and reject imports from legacy character and motion tables. Until then, canonical LGR-1 masters are authoring exports only.

## Automated safety gate

`tests/test_lgr_retirement.cjs` and `.github/workflows/genesis-workbench-qa.yml` enforce retired routes, blocked old writes, and Genesis editor integrity. The Character Stock deployment additionally asserts retirement routes contain no scripts and LGR-1 exists. Legacy Mahluk-specific QA workflows were removed; independent Semesta/NPC asset publication remains active.

## Workflow UX and data-safety update (November 10, 2026)

The authoring workflow was audited and rebuilt to remove the previous loop of having to return to Pixel Editor just to select a different body part:

- **Shared Body Part navigation** with direct selector, previous/next controls and an optional 10-part list remains accessible in Pixel Editor, Pivot & Slicing, Bind and Check Binding.
- **Forty part/angle review receipts**, one for each 10 parts × four directions, are now required before Bind. The matrix is navigable, not auto-approve. Clicking a cell chooses that part and angle; approval requires explicit visual inspection via the separate Mark Reviewed action. Fully occluded parts require an explicit confirmation.
- Changes to pivot/mask immediately clear affected review receipts. Changing pixel art invalidates all previous review receipts, binding, and motion approvals.
- **Isolate Selected** visually dims other body parts, red highlights visible pixels with no mask assignment, and per-part Copy/Paste avoids overwriting an entire angle's ten-part mask. Whole-mask Paste/Flip now explicitly warns before replacement.
- **Check Binding** includes continuous Walk/Wave preview, Play/Pause, speed, scrub slider, part rotation and X/Y translation. The four direction approvals must be marked separately before an approved master can be produced.
- **Pan mode** allows touch/mouse drag navigation on zoomed canvas without editing slices. Fullscreen uses the browser's actual Fullscreen API rather than opening a new tab.
- **Draft editing is recoverable before master approval**, using versioned Google Drive drafts or JSON Import/Export. Each cloud draft creates an immutable revision, and the user chooses which version to restore. Local storage errors no longer report false success.
- Canonical approved cloud master overwrites are **fail-closed** unless this browser has explicitly loaded and acknowledged that exact cloud revision. The previous approved master is archived with a timestamp and checksum before replacement; a changed remote checksum aborts the save.
- The Python geometry runtime now includes per-piece placement offsets from the authored core so its affine chain matches the JavaScript renderer. Python and Drive reject unreviewed 40-part bindings.

**Limits still remaining:** The 40 reviews are *human anatomical decisions*, not machine vision verifying a perfect cut. Automatic limb segmentation is not implemented. Per-direction near/far visual labels do not yet define a guaranteed anatomical left/right map for reusable *left-hand/right-hand* motion across all four directions; this must be calibrated before a fully automatic cross-angle motion library. The JavaScript and Python output images have not been proven pixel-for-pixel identical for every pose; geometry has dedicated tests. Mainkan/Character Editor runtime integration remains a separate future component and is not falsely advertised as complete.

## QA coverage

- `tests/test_genesis_procedural_runtime.py` checks procedural geometry, parent transforms, per-part placements, and all 40 QA receipts.
- `tests/test_lgr_cloud_safety.cjs` simulates two independent devices, stale-master conflicts, immutable draft versions and recoverable previous masters without accessing the user's Drive.
- `.github/workflows/genesis-workbench-qa.yml` launches Chromium and checks artist navigation, premature-bind rejection, 40 reviews, pivot-change invalidation, procedural motion playback, four-angle approval, approved master local storage, and strict Drive validation.

## Finding and clearing unassigned stray artwork (November 10, 2026)

The same source alpha and slice-mask contract drives both the Bind audit and a new artist-facing **Find Unassigned Pixels** panel in stage 02 (Pivot & Slicing), also reachable from the failed Bind stage. For each SE/SW/NE/NW direction:

- A pixel is problematic only when its **composited RGBA alpha is visible** and its 10-part mask index is **255 (unassigned)**. Fully transparent background never needs a body-part assignment.
- The scanner groups those coordinates into **8-connected clusters**, lists their angle, count and bounding coordinates, highlights the active group in yellow over the red unassigned overlay, zooms to it and supports Next Issue.
- **If the visible pixel belongs to a limb**, use Slice Paint and select its correct body part. If it is **unwanted stray artwork**, select that cluster and click **Delete Highlighted Stray Group**. No arbitrary limb assignment is made.
- Cleanup requires an explicit confirmation and zeros only the RGBA pixels of the selected unassigned cluster in all present physical source layers at those coordinates. A separate **Delete All Unassigned in Current Angle** is available, still with confirmation. The mask bytes and part pivots are never edited by cleanup.
- Cleanup rebuilds the source composite, invalidates a previously generated binding/approval, persists the editable draft, and rescans. It **does not invalidate the existing 40 manual part×angle review receipts**, because their assigned pixels and joint transforms were untouched.
- **Undo Delete** restores all affected source layers for the latest cleanup until the page is reloaded. For permanent recoverability, the artist can export a draft JSON or save a versioned cloud draft before cleanup.
- All deletion paths recompute the current unassigned mask+alpha before applying any change; a stale UI selection cannot blindly delete pixels reassigned since the scan.
- Test coverage includes a synthetic visible-but-unassigned source pixel, the Find/Highlight/Erase flow, verification of transparent source with unmodified mask, successful Bind with original 40 receipts, and Undo restoring the original pixel.

This is **source-art cleanup**, not a workaround that classifies unwanted background noise as a body part.

## LGR-1 rendering + shared motions (November 10, 2026)

Single UI name: **LGR-1**. Wire IDs are unchanged (`lafrich-genesis-binding-v1`,
`lafrich-genesis-master-v1`, `rigFormat: "LGR-1"`, `lafrich_genesis_male/female`,
`lafrich_male/female`), so every saved draft and Drive master still opens.

**One raster, two languages.** `site/lgr1-raster.js` and
`site/genesis_procedural_runtime.py` implement the same integer pixel algorithm
(no canvas transforms). `tests/test_lgr1_parity.py` asserts 0 differing pixels
for every shared motion frame × 4 directions, with Custom Wear (+ tweak) and an
Emosi face.

- Layer slots: `hair_back` (behind everything) → body/pants/shoes/top_back/top/
  body_front → Emosi face (follows head) → `hair_front`, `accessory`.
- Per-direction part order: optional `rig.drawOrders[dir]` (11 parts; legacy 10-part orders get `pelvis` inserted before `torso`); the
  binding's `hierarchy.drawOrder` stays the canonical default. A motion frame may
  move limbs behind the torso with `behindTorso`.
- Joint caps: each parent keeps an underlay of child pixels within
  `capRadius[child]` (default head 2, limbs 3) of the joint, plus hidden fill for
  children drawn above the parent → no see-through holes at hips, crotch,
  shoulders, knees, elbows.
- Rotation: right angles are exact; other angles sample a Scale2x×3 (8×) image
  (RotSprite-style). Motion angles snap (default 5°).
- Custom Wear: inherits the body mask; clothing pixels outside the visible body go
  to the nearest part (BFS). Hair layers always follow the head. Optional
  per-outfit tweak (`character.maskTweaks[dir]`, base64 64×112: 0–9 part, 254
  inherit, 255 static).

**Shared motions.** `site/media/lgr1/motions.json` (`lgr1-motion-library-v1`)
is the only motion data, read by JS (`site/lgr1-motion.js`) and Python
(`load_library`, `frame_pose`, `render_motion`). Values are anatomical
(`arm_r_upper`, `leg_l_lower`, …), authored as seen in SE; the rig maps them to
near/far pieces per direction with `rig.sides` (default SE right, SW left,
NE right, NW left), so mirroring keeps the right hand the right hand. Sideways
moves use per-direction overrides (`frame.dirs[dir]`, absolute screen values).
Motions are stepped, 1–6 keyframes, 40–2000 ms each.

**Motion editor (step 05).** Pick a motion or NEW, source pose, keyframes 1–6,
per-part rotate/move, ms per frame, angle snap, loop, "this direction only",
"behind torso". Editing a library motion creates `<id>_mine`. Save local
(`vl-lgr1-user-motions-v1`) or Drive (immutable
`lgr1_motion.<id>.<timestamp>.<sha10>.json`, schema `lgr-1-cloud-motion-v1`,
SHA read-back verified; never overwrites anything). JSON export is the path into
the shared library.

**Review gate.** "AUTO-CHECK + REVIEW THIS ANGLE" marks the parts that pass
(pixels present, ≤2 islands, pivot ≤3 px from the part and its parent, near arm on
the expected screen side); flagged parts need a manual MARK. Pixel edits reset
only the changed part(s) in the changed direction(s).

**Seed.** NE/NW back heads are rebuilt from SE/SW where the V6B back view was bald
(V6B paints the skull with hair); islands ≤3 px are removed. Old drafts get a
warning and "REBUILD NE/NW BACK HEAD". Find Unassigned also flags isolated
floaters (≤6 px) and outfit overhang.

## Shape-based slicing + pelvis split (November 10, 2026)

**Slicing from the body shape** (`LafrichPuppetCore.shapeSlice`, used by the V6B
seed and by the manual *02 · ✂ RE-SLICE FROM SHAPE* button):

- Only visible pixels get a part. Empty canvas is `255` (no part), so the
  highlight/Isolate never shows a "head" around the head.
- **Head** = skull + chin + neck down to the shoulder line. The shoulder row is
  the first row below the narrowest neck row (y 46–57) that is ≥ 4 px wider.
  The head pivot is the neck base (centre of the last neck row, y = shoulder).
  The head ends in a clean **neck stem** (artist revision, Nov 10): below the
  narrowest neck row only the neck's own columns are head (the flare into the
  shoulders is torso), and a real neck (≤ 8 px, back views NE/NW) runs on below
  the shoulder line while rows are < neck + 6 px wide (max 3 rows), so the head
  piece is whole down to the bottom of the neck. Front views (chin hides the
  neck) keep the chest as torso.
- **Hand tip**: a fingertip row that tapers in over the hip (Female) stays arm.
- **Arms** = only the arm. The inner arm edge is found per side from rows
  where the arm hangs free (empty gap to the body, typical for Female) or
  from the dark inner outline 2–5 px inside the outer edge (Male). Shoulder
  rows above the armpit stay torso. Upper/lower split stays at the elbow (y69).
- **Legs** split per row at the real empty gap between the legs (no column
  crossing), starting at the first crotch row (legTop, usually y81). Knee y94.
- **Pelvis** = the hips/crotch band `legTop − 6 … legTop − 1` (usually y75–80).
- RE-SLICE never runs by itself, asks for confirmation, does not touch pixel
  art or Drive, moves a head/torso/pelvis pivot only while it is still at its
  default spot, resets reviews only for parts whose pixels changed, and can be
  undone per angle with RIG UNDO.

**Pelvis split — 11 parts.** `PARTS` appends `pelvis` as index 10 (old mask
indices keep their meaning). Hierarchy: `pelvis` is the root and the parent of
both thighs; `torso` is a child of `pelvis` and the parent of head and arms.
Default pivots: pelvis (32,79) hip centre, torso (32,75) waist. Default draw
order puts `pelvis` directly before `torso`. Joint caps: pelvis 0 (root),
torso 3 (waist).

Motions (`lgr1-motion-library-v1`, unchanged format) gain the `pelvis` part:
`torso` x/y **and** `pelvis` x/y move the whole body (so older motions that
used torso x/y look identical), `pelvis` a tilts the hips (legs and upper body
follow), `torso` a bends the upper body at the waist. Library: walk bobs and
sways the pelvis, crouch lowers the pelvis and leans the torso 10°, new
`bow` bends at the waist.

**Backward compatibility.** A 10-part rig (no `pelvis` pivot) is migrated **in
memory only**, identically in JS (`migrateLegacyView`) and Python
(`migrate_legacy_view`): torso pixels with y ≥ 75 → pelvis; pelvis pivot =
(torso.x, 79); a torso pivot still at the old default y66 moves to y75. Drive
and Python accept legacy bindings (10 parts, 40 reviews) unchanged; the
workbench opens them, asks for PELVIS review in 4 angles (44 total), and only
writes the new 11-part master when the artist saves.
