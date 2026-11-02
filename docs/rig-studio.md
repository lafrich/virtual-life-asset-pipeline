# Virtual Life / Rig Studio v1 — model types, motion packs, and inclusion

The public [Rig Studio](https://lafrich.github.io/virtual-life-asset-pipeline/#rigs)
is the **Mixamo-style front end** of the same repository as Characters and
Animations. It uses real, character-authored sprite atlases, not a generic
character's GIF. It is a functional selector, original-pixel preview,
and export pipeline; it is **not** an automatic universal 2D skeletal retargeter.

## 1. Model families / different rig treatments

Four model families are registered in
`assets/animation_library/model_types.json`:

| Model type | Character examples | Adapter | Geometry constraints |
| --- | --- | --- | --- |
| `HUMANOID` | Ichsan, Bowie, game-native humans | `native_v6b` | head, hips, articulated arms, independent legs |
| `MASCOT` | Milk Mascot | `costume_puppet` | carton torso is rigid, arms use costume sockets, never deform barcode or typography |
| `ALIEN_SUIT` | Gfunk, Yerbies | `alien_exosuit` | keep head/helmet/claws/hover gear with source-specific layer ordering |
| `HELMETED` | Theodore | `helmeted_human` | human under rigid helmet, backpack, gloves; faces stay inside mask |

All still use 64×112 original pixel tiles, pivot (32,100), with four
directions SE/SW/NE/NW. Some legacy people are classified as provisional
`HUMANOID`, and retain a `source_evidence` marker. **Classification
alone does not approve an animation or generate arm/leg bones.**

Each model lists its semantic topology and capabilities; it is a contract
for **future adapter authoring**, not coordinates or a 3D bone skeleton.

## 2. Shared animations vs actor-specific output

The centralized `assets/animation_library/actions.json` contains 203
action IDs, including 196 `planned` actions. This provides a *shared
action vocabulary*, not 203 rendered sprite sheets.

Each actor is built from existing source assets into:

- `rigs.json`: model types, the 203 shared action definitions and
  character-to-rig index
- `catalog.json`: existing character catalog extended with
  `model_type`, `rig_adapter`, `rig_evidence`, `rig_ready_count`,
  `motion_pack`
- `motion-packs/<actor>.json`: a **directly importable per-actor motion
  package**. Each `ready` clip references the actor's original published
  atlas URL, row, frame count, four-direction layout, frame timing, loop.
  `native` clips refer to a validated v6b 384×4928 sheet; `custom`
  clips point to a reviewed 4-direction PNG for that same actor.

**Never** silently apply an `ALIEN_SUIT` pose to Milk or copy Bowie
pixels onto a different actor. Gfunk and Yerbies can share action IDs
(e.g. WALK) while each is rendered from their *own* source rigs.

The build refuses wrong or missing atlas files, duplicate actual
motion IDs, unsupported action geometry, or invalid durations. Planned
actions have no frame data, won't be in the actor's ready clips, and
can't be included from Rig Studio.

## 3. Mixamo-style workflow

1. Open **RIG STUDIO** (third library tab).
2. Choose your character, e.g. Bowie, Milk, Gfunk, Theodore or Yerbies.
3. See model type and exact adapter.
4. Choose **READY** to live-preview actual available animations. Change
   SE/SW/NE/NW and play/pause; original pixels remain intact.
5. Switch to **PLAN** to see all 196 requests; they are disabled for
   inclusion until an actor-specific clip is authored and validated.
6. Click **INCLUDE MOTION.JSON** to export a single, source-specific
   motion clip with an atlas URL; **COPY IMPORT SNIPPET** provides code.

The site remains a standalone asset pipeline. No live game deployment,
multiplayer state, movement controller, or inventory trigger is installed.

## 4. Include in a JavaScript game

The runtime is public at
`https://lafrich.github.io/virtual-life-asset-pipeline/rig-runtime.js`.
It works in the browser (UMD) or Node (CommonJS).

Browser example:

```html
<script src="https://lafrich.github.io/virtual-life-asset-pipeline/rig-runtime.js"></script>
<script>
(async () => {
  const base = "https://lafrich.github.io/virtual-life-asset-pipeline/";
  const pack = await VirtualLifeRig.fetchPack(base + "motion-packs/aladdin_sane.json");
  const walk = VirtualLifeRig.clipFor(pack, "walk");
  if (!walk) throw new Error("Actor does not have the authored WALK motion");
  const image = new Image();
  image.src = new URL(walk.atlas, base).href;
  await image.decode();
  const canvas = document.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const started = performance.now();
  function tick(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    VirtualLifeRig.draw(ctx, image, walk, "se", now-started, 200, 330, 3);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
</script>
```

`VirtualLifeRig.frameAt(clip, direction, elapsedMs)` also returns exact
sprite frame, source rectangle, direction and whether a one-shot ended;
game engines can use it for their own batching/renderers rather than
canvas `drawImage`. `exportedClip(pack, clip, base)` generates the same
portable include object that Rig Studio downloads.

**Events:** A movement *visual* is separate from inventory, bladder, pay,
or social/paired interaction state. Only fire gameplay effects from
explicit registered event markers, after validating prop proximity,
direction/facing, and multiplayer authoritative state; v1 export does
not automatically change gameplay.

## 5. Building a new reusable motion by model family

1. Define the action once in `actions.json` with phase metadata and
   gameplay intent.
2. Author a canonical motion plan in the shared choreography library.
3. Implement **model-specific geometry/anchor mapping**, first for
   HUMANOID, then separately MASCOT, ALIEN_SUIT, and HELMETED.
4. Render original source rig poses per actor. Verify the four directions,
   foot contact, prop hand contact, opacity, facial layers, layer order,
   and pivots at native pixel resolution.
5. Add the validated original action to the actor's `motions.json`
   (or authored legacy frame source), build and test. It becomes READY
   in that actor's Rig Studio without changing UI code.
6. Export the pack and include in the game *after* its logic/event
   bindings and multiplayer synchronization are explicitly tested.

**Current limit:** v1 provides model-aware compatibility and ready
original sprite playback/exports. It does not yet synthesize a new pose
for all model types when only one character has the animation.
