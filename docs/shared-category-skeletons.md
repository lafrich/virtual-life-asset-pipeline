# Virtual Life — Shared Animation & Category Bone Pipeline

## The intended design

**One shared animation database, all characters, category-specific skeletons.**
The landing page is **Characters + Animations** only. There is no separate Rig Studio mode or per-actor "download a motion" workflow.

Animation IDs are defined **once** in `assets/animation_library/actions.json`. Characters are categorized as HUMANOID, MASCOT, ALIEN_SUIT, HELMETED. Each receives the **bone hierarchy appropriate to that body category** via `assets/animation_library/category_skeletons.json`. Shared bone actions use semantic channels:

```text
Action: WALK
  root, body, head, arm_l, arm_r, leg_l, leg_r
                      |
                      v
       Rig adapter for actor.model_type
         |             |             |
       Humanoid       Mascot        Alien / Helmeted
   shoulders/hips   arm sockets     claws / armored arms
```

The canonical animation timeline **never stores a single actor's pixels**. Every category's adapter maps shared channels onto its own joint IDs, preserving rigid-costume, helmet and suit parts.

## What is implemented

- `category_skeletons.json`: 4 model families with independent, parented 2D joint hierarchies, pivot coordinates and 7 standard semantic channels. These are generic **category prototypes**, not individual fitted character skins.
- `shared_bone_motions.json`: 7 independently authored canonical bone motion curves: `idle`, `walk`, `talk`, `sit`, `sit_type`, `press_button`, `pick_up`. Each one can be sampled on **all 4 category skeletons**.
- `site/shared-bone-runtime.js`: pure bone pose sampler with time interpolation, 4 facing directions, one-shot/loop timing and category-specific parent-chain joint transforms. No fake sprite rendering.
- Every built character catalog entry has `model_type`, `skeleton_profile`, `bone_actions`, `bone_skin_ready: false`. It inherits a category skeleton regardless of how many original sprite motions exist.
- Build publishes `category-skeletons.json`, `shared-bone-motions.json`, `shared-bone-runtime.js` and the existing original actor `motion-packs/*.json`. `rigs.json` is retained as the compatibility character/rig registry for existing game development consumers, **not a separate UI**.
- The existing **Animations** tab keeps showing GIFs and original-source action clips; the target dropdown reflects `SHARED BONES / SKIN PENDING` when shared motion exists but isn't rendered for that character.
- All previously exported original source-specific sprite packs are kept for backwards compatibility. They are an art fallback, not the target universal authoring architecture.

## Limitations that matter

The **203 action IDs** are the central action vocabulary, **not 203 completed reusable skeletal motions**. Currently **7/203 have shared bone tracks**; the remaining action definitions still need authoring. Shared bones also need **per-character sprite-part extraction, weight/anchor calibration, z-sorting, and QA** before motion is actually playable with that character's pixel artwork. A preset skeleton does not magically separate a flattened PNG into arms/head/legs.

Do **not** mark unfinished clips as "READY IN GAME" just because bone sampling works. `bone_skin_ready` stays false until each actor receives a real skinned art binding. Keep binary pixel sprites separate from skeleton motion contracts.

## Usage for the game developer

```html
<script src="https://lafrich.github.io/virtual-life-asset-pipeline/shared-bone-runtime.js"></script>
```

```js
const base = "https://lafrich.github.io/virtual-life-asset-pipeline/";
const [categories,motions] = await Promise.all([
  fetch(base+"category-skeletons.json").then(r=>r.json()),
  fetch(base+"shared-bone-motions.json").then(r=>r.json())
]);

// Same source WALK animation, different fitted joints for each category.
const humanPose = VirtualLifeBones.resolve(categories,motions,"HUMANOID","walk",350,"se");
const alienPose = VirtualLifeBones.resolve(categories,motions,"ALIEN_SUIT","walk",350,"se");
const mascotPose = VirtualLifeBones.resolve(categories,motions,"MASCOT","walk",350,"se");

// pose.joints: parent-chain world_x/world_y/world_angle in canonical units.
// Render skinned sprite parts ONLY after per-actor binding is authored.
```

`VirtualLifeBones.resolve(..., "run", ...)` returns **null** until `run` is authored with real canonical bone keys. It never substitutes an unrelated animation silently.

## Next technical work

1. Extract and register named pixel body part layers for each actor: head, torso/rigid costume, left/right hands, left/right feet, extras. Add per-direction art part maps and bone pivot calibration.
2. Build 2D pixel-skinned renderer and animation events/prop attachment points; keep silhouette crisp, layers correct, and foot pivots aligned.
3. Implement / QA missing canonical actions once and automatically reuse their bone curves across category adapters. Category-specific overrides are allowed for truly exceptional motion, **not** copied actor-specific GIFs.
4. Wire production game's original character renderer and network gameplay events into this shared animation controller **before the encryption build**, preserving inventory, economy, interaction logic and depth ordering. The current Asset Bridge developer inspector is not that integration.

Tests: `node tests/test_shared_bone_runtime.cjs` and `python -m unittest discover -s tests -p 'test_rig_studio.py'`.

**Old links:** `/#rigs` redirects to `/#animations` to preserve bookmarks; the old Rig Studio UI/JS and its separate guide were removed at the owner's request.
