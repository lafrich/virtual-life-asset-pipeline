# Feedback for Ellen — 7 November 2026 (Asia/Jakarta)

Baymax QA of delivered incoming files. Incoming `*.action.json` and art were not edited.

## 1. `lie_down` — not ready (do not mark available)

File: `incoming/actions/lie_down.action.json`  
Notes say: “Transition toward a reclined pose using squat enter then pelvis roll.”

What the tracks actually key:

- 4 frames, `loop: false`. Bones: ankles, knees, wrists, pelvis. No `head`, `torso`, or `root`.
- Frame 0, 2, and 3 are explicit rest (all zeros).
- Only frame 1 has offsets: pelvis `y+8`, ankles `y-4`, knees `(±5, -4)`, wrists `(+5/-4, -10)`.

Because frames 2 and 3 are keyed back to rest, playback is stand → brief crouch blip → stand. It does not enter or hold a reclined pose. Compare with authored `sleep`, which keys `head` / `torso` / `pelvis` / knees through the lying pose and already passed both-gender 4-dir QA.

Needed: a real stand→recline transition that *holds* the lie (like `sleep`’s side-lying silhouette) on both MaleBase and FemaleBase, all 4 directions, face following the head, hair/clothes unmoved by expression.

## 2. `wake_up` — not ready (do not mark available)

File: `incoming/actions/wake_up.action.json`  
Notes say: “Rise from recline toward stand.”

What the tracks actually key:

- 5 frames. Same bone set as `lie_down` (no `head` / `torso` / `root`).
- Frames 0–2 and 4 are rest. Only frame 3 has a similar crouch: pelvis `y+6`, ankles `y-3`, knees `(±5, -3)`, wrists `(+5/-4, -10)`.

It starts standing, flashes a crouch, and ends standing. It does not begin from a reclined pose and rise.

Needed: start from the held lie pose and interpolate to stand on both bases, 4 directions, face following head.

## 3. `turn` — not ready (do not mark available)

File: `incoming/actions/turn.action.json`  
Notes say: “In-place turn sketch via torso/pelvis lean sequence.”

What the tracks actually key:

- 5 frames. Bones: `head`, `torso`, `wrist_l`, `wrist_r`. There is no `pelvis` track despite the note.
- Peak torso motion is `x+2` and `angle: 6` (frame 2). Head slides `x+3`. Wrists shift a few pixels.
- Playback uses one track set for all four views; this does not change facing (`se`/`sw`/`ne`/`nw`).

This is a small upper-body twist, not a completed in-place 90° turn.

Needed: a finished turn that changes facing (or a documented facing-step the player can consume), on both bases, 4 directions, without inventing new rest anchors.

## 4. Walk inner-thigh garment gap at max stride — document only, no redraw from us

Native `male-garment-*` / `female-garment-*` are additive and the clothes toggle works. At walk frame 0 (max stride) a sliver of inner-thigh skin shows through the pants on both genders. Later walk frames cover better. This is authored garment coverage at that pose, not an anchor or depth-player bug. We did not redraw the art.

Evidence (preview QA, hair on, clothes on, Ahe):

- `preview/feedback-walk-stride-gap-male.png` (walk F0 crop)
- `preview/feedback-walk-stride-gap-female.png` (walk F0 crop)
- Full strips: `preview/qa-male-action-walk-frames.png`, `preview/qa-female-action-walk-frames.png`

If you can extend the hip/pelvis garment mattes on the spread-leg frame, the hole will close. No rest-table or hair-cap change is required.

## 5. What already passed (both genders, real Chromium QA)

Blank heads (bbox preserved; male +27 / female +28 interior px only). Navy hair with anatomical `body-fringe` crown when hair is off; no double fringe when hair is on. Additive clothes. Face list is NO FACE + the 6 authored Drive faces (Ahe, Sleep, Takut, Insecure, O, Kiss); 12 starters are not selectable. Save → reload → Load keeps `faceId`. Nod face-follow `dy ≈ +2`. These 11 actions are `available: true` in *our* registry only (incoming files stay `available: false`): idle, walk, run, sit, sleep, pick_up, toilet_squat, pee_stand, yoga_mountain, yoga_stretch, nod.
