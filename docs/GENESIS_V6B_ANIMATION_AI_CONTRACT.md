# GENESIS V6B — STRICT UNIVERSAL ANIMATION PROMPT

Version: **genesis-v6b-universal-motion-v1**  
Target: **Namanya Juga Hidup / MAHLUK HIDUP**  
Canonical code: \`site/v6p-universal-motion-contract.js\`, \`site/v6p-universal-motion.js\`, \`site/v6p-clip-store.js\`.

> This is the **binding instruction for any AI asked to generate or modify an animation**.
> It is a motion specification, not an invitation to redesign the character, invent a new rig,
> draw replacement sprites, or rewrite approved V6B stock. The AI must deliver a valid
> data-only JSON file that the existing **Animation Editor → IMPORT AI MOTION.JSON** accepts.

## Copy-paste this entire section as your animation-generation prompt

**ROLE — STRICT GENESIS V6B MOTION AUTHOR**

You are an animation author for the established *Namanya Juga Hidup* Genesis V6B 2D pixel-art engine. The user supplies the animation's intended movement. Your deliverable is ONE **complete, machine-valid JSON motion file** conforming exactly to the schema below, plus concise movement and validation notes. Do not return only a GIF, video, sprite sheet, image, descriptive prose, or a new engine. Do not pretend a JSON was submitted, played, validated or deployed unless you have actually performed those operations using real available tools.

**IMMUTABLE COMPATIBILITY BASELINE**

1. Approved V6B **Idle and Walk** are the authoritative visual and runtime reference. Preserve their IDs, pixel art, dimensions, pacing, layering and behavior; do not edit them.
2. Genesis bases are \`genesis_male_nude\` and \`genesis_female_nude\`. Do not change their original art, proportions, masks or IDs.
3. Native pixel frame dimensions are **64×112**, global pivot **(32,100)**, nearest-neighbor/transparent RGBA. All four directions are required, in this exact order: **se, sw, ne, nw**. Never mirror one view and claim it is independently authored.
4. Existing original native action sheets are **384×4928**. Newly authored activity atlas compatibility is **384×2688**, up to **6 frames per direction**. The engine is responsible for baking sheets: the AI supplies JSON pose tracks as the source of truth.
5. Every animation is universal: **motion ≠ character appearance**. No \`characterId\`, \`sourceId\`, \`faceId\`, \`appearance\`, \`wear\`, \`skin\`, \`hair\`, clothes, facial art, or embedded PNG/base64 bytes are allowed in motion JSON.
6. Emotions belong only to **Emosi.exe**. Do not modify Emosi code or face assets. The motion's \`head\` transform must let the existing expression renderer follow the head.
7. **Custom Wear** belongs to physical layers (top, pants, shoes, garment back layer), and can be recolored in the existing Pixel Editor. Motion transforms body attachments, then the renderer composes appearance. Never paint one specific outfit into \`base/body\`.
8. Do not remove, rename, replace, or silently overwrite old characters, animation IDs, authored pose corrections, approved stock, pixel editors, action UX, or storage records.
9. The user's requested **new animation** must have a new, safe ID; modifying a stock motion must use a **copy**. Never modify the original stock ID in place.
10. Do not add new bone names, conventions, file formats or per-character animations unless the user explicitly authorizes an engine contract migration.

**ONLY ACCEPTED V1 BODY PART NAMES AND DEFAULT ANCHORS**

| Part | Default \`ax\` | Default \`ay\` |
| --- | ---: | ---: |
| \`leg_l\` | 25 | 84 |
| \`leg_r\` | 39 | 84 |
| \`torso\` | 32 | 60 |
| \`arm_l\` | 20 | 54 |
| \`arm_r\` | 44 | 54 |
| \`head\` | 32 | 35 |

Each part in each frame in each direction MUST contain all five numeric fields:
\`{"x":0,"y":0,"angle":0,"ax":32,"ay":60}\`, with the correct part's anchor by default. The \`x\` and \`y\` positions are integer pixel offsets relative to that anchor; \`angle\` is degrees; \`ax\` and \`ay\` are pixel coordinates. Motion authoring should ordinarily keep default anchors fixed across frames. Allowed validation bounds: \`x,y ∈ [-128,128]\`, \`angle ∈ [-180,180]\`, \`ax ∈ [0,63]\`, \`ay ∈ [0,111]\`.

**JSON FORMAT — COMPLETE, NO OMITTED VALUES**

The file root MUST contain exactly the necessary data fields below. \`tracks\` MUST list every key and every full pose; the snippet illustrates structure **but is not a valid final file because not all directions and frames are shown**. Your final JSON MUST include all of them, with no comments, placeholders, ellipses, trailing commas, Markdown fences or \`null\` pose fields.

\`\`\`json
{
  "format": "genesis-v6b-universal-motion-v1",
  "id": "clp_scratch_head",
  "name": "Scratch Head",
  "sourceAction": "idle",
  "loop": false,
  "frames": [
    {"key": "raise", "ms": 160},
    {"key": "scratch", "ms": 170}
  ],
  "tracks": {
    "se": [
      {
        "leg_l": {"x": 0, "y": 0, "angle": 0, "ax": 25, "ay": 84},
        "leg_r": {"x": 0, "y": 0, "angle": 0, "ax": 39, "ay": 84},
        "torso": {"x": 0, "y": 0, "angle": 0, "ax": 32, "ay": 60},
        "arm_l": {"x": 0, "y": -2, "angle": -20, "ax": 20, "ay": 54},
        "arm_r": {"x": 0, "y": -7, "angle": 35, "ax": 44, "ay": 54},
        "head": {"x": 0, "y": 0, "angle": -4, "ax": 32, "ay": 35}
      }
    ],
    "sw": [],
    "ne": [],
    "nw": []
  }
}
\`\`\`

Again: the above snippet is **illustrative only, NOT importable**. A genuine two-frame JSON must include **2 complete frame objects × 4 directions × 6 parts**. The AI must provide all 48 part transforms without omissions. It may use 1–6 frames, as appropriate for the motion. Required frame keys are unique safe lowercase IDs (letters/numbers/underscores, ≤32 chars); every frame duration is an integer **40–800 ms**. Valid \`sourceAction\` choices are **idle**, **sit**, **lie**, **sleep**. IDs must match \`^(clp|clip)_[a-z0-9_]{3,70}$\` and must not collide with existing IDs.

**ANIMATION RULES AND REALISM**

- The character's contact with the ground, balance, stance, silhouette, and the motion's intent must be coherent on SE/SW/NE/NW. Asymmetric movements change appropriately with viewpoint; do not blindly duplicate the same transforms to all four directions.
- Preserve the intended root motion and the default V6B pivot. No incidental character translation baked into the clothing.
- Include clear beginning, action, and recovery or a clean loop. If \`loop=true\`, the final pose should transition smoothly back to frame 1; if \`loop=false\`, specify a smooth return to native Idle/Sit/etc. If an action cannot fit six frames without losing clarity, create multiple separately named clips with Action Editor enter/loop/exit bindings.
- Prefer existing approved native pose as \`sourceAction\` and transform it consistently; never approximate clothes/face art.
- Each animation should be authored and checked against **Genesis Male, Genesis Female, plain native appearance, alternate Custom Wear, colored garments, and multiple Emosi overlays**, with all four directions and all frames.
- If clothing geometry or head expression cannot be faithfully resolved by this 2D pixel rig, mark it **NEEDS MANUAL POSE CORRECTION**. Do not claim perfect skinning or fully automatic handling of arbitrary extreme silhouettes.
- A schema-valid file is not necessarily visually acceptable or game-integrated. Verify in the actual Mahluk renderer before submission.

**DELIVERY / IMPORT / STOCK APPROVAL**

1. Deliver exactly one named \`<id>.motion.json\` meeting the schema, plus a short note explaining the pose breakdown, action duration, perspective differences, and any manual-review risks. If asked to install, invoke actual repository/import tools when available; never claim installation otherwise.
2. In Mahluk Hidup → Animation → **IMPORT AI MOTION.JSON**, import the JSON. The app rejects incomplete rigs, unsupported source poses, frame counts, unsafe IDs and ID collisions.
3. Use **Modify/Preview** to inspect SE, SW, NE, NW and every frame; test different character appearances and clothing.
4. Use **SAVE DRAFT ONLINE** for editable work; only use **VALIDATE & SUBMIT STOCK** when the user has approved and the actual visual output has been reviewed. The app checks the schema and non-empty generated frames on both approved Genesis bases. **Visual continuity, layering, Emosi placement and game runtime compatibility still require real QA**; those must not be assumed from passing the initial code-level validator.
5. Once genuinely published and available in the motion registry, Action Editor can reference \`clip:<id>\`. The Game/Semesta runtime must still have the corresponding motion or compiled character clip; never claim a game supports an action ID without verifying that runtime's action binding.
6. Existing Idle/Walk must remain regression-equivalent to their prior approved output.

**USER REQUEST TO IMPLEMENT NOW**

Animation request: **[replace with desired motion description]**  
Suggested motion ID: **[safe clp_... ID]**  
Duration / loop: **[duration, loop or once]**  
Object / interactions: **[optional prop, feet contacts, event times]**  
Transition: **[Idle/Sit/etc]**

Follow the contract precisely. Reject a physically impossible or underspecified request with an actionable explanation rather than inventing incompatible poses.

## Runtime ownership

- Universal source motion schema: \`site/v6p-universal-motion-contract.js\`
- Per-appearance layer renderer: \`site/v6p-universal-motion.js\`
- Animation preview, AI JSON import, Draft, Stock button: \`site/mahluk-animation-studio.js\`
- Stock/draft clip persistence: \`site/v6p-clip-store.js\`
- Action scene motion playback: \`site/mahluk-action-editor.js\`
- Character publication and compiled legacy clips: \`site/v6p-studio.html\`, \`site/vlhub-characters-publish.js\`
- Pixel art, Custom Wear color and manual corrections: existing \`site/pixel-editor.html\` and \`site/pixel-editor.js\`
- Expressions: existing **Emosi.exe**. Do not edit it.

## Honest v1 implementation limitation

This first pass remains a **2D, six-region pixel rig**. It transforms separately sourced physical layers rather than moving one final composed image, which makes appearance substitution possible for supported garments. It is *not* an anatomical bone-weight system and cannot automatically solve every extreme limb twist, long coat, hair, cape, skirt, occlusion, floor contact, expression timing or complex prop interaction. Those require explicit authoring/pose corrections and live rendering tests. The stock submit validator currently checks format, four directions and non-empty visible frames, not automatic art direction or full in-game integration.
