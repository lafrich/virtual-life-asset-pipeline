# CHARACTER MOTION STUDIO — Mixamo-style workflow for native v6b

The Character Stock Paint viewer is now the primary place to **select a
character first**, then try a motion or animated facial expression on that same
character. The existing ANIMATIONS tab is the **reference/library** and still
shows genuine historical GIFs from Ichsan, Babeh, etc.

## Character → Motion → Face → Export

1. Go to the **CHARACTERS** tab and pick Bowie or Milk Mascot.
2. Click **MOTION** in the Properties panel to apply a named action.
   Available actions are rendered directly from that character's own native
   384×4928 sheet, preserving their unique body, face, hair, outfit and pivot.
3. Click **FACE** to animate idle breathing and eye blink on top of the
   character's own registered expression delta. The selected facial expression
   persists when you return to **MOTION**, so Bowie can walk, talk, sit or type
   while smiling/blinking. Change SE/SW/NE/NW manually;
   rear views generally have no visible facial features and may have no delta.
4. Use **Play / Pause**, facing direction, background palette and zoom. Export
   **MOTION SHEET.PNG** or **FACE SHEET.PNG** at native 1×, four-direction frames
   arranged in four rows. These are local client-side exports, not gameplay
   integration.
5. In **ANIMATIONS**, choose a historical clip and an intended character.
   **TRY ON** is enabled only when that character has a real authored
   compatible action. Unsupported actions say **NEEDS CHARACTER RIG**.

### Current rigged action coverage

| Action | Bowie | Milk Mascot |
| --- | --- | --- |
| Idle / Walk / Talk | yes | yes |
| Sit / Type | yes (native v6b rows) | needs rig (mascot placeholder rows) |
| Press Button / Pick Up | needs rig | needs rig |

**Important:** A clip generated using Ichsan or another NPC does not become
Bowie motion by relabeling it. The original body and face must remain Bowie.
Unavailable actions remain visibly disabled until dedicated per-character
frames are authored and reviewed. Facial expressions reuse real face-overlay
pixels from that character's full sheet, with idle frames and timed blink;
they are not 3D facial rigs or a deep-learning retarget model.

## Imported NPC facial animation (Gfunk, Theodore, Yerbies)

The former v2 prototype/archive NPCs (Cosmo, Rocketta, Sol, Zib, Klank,
Nebi) are excluded from the public Character Stock roster. Their source is
not deleted; they just do not appear as selectable catalog characters.

Gfunk, Theodore and Yerbies each have five original source-authored facial
variants: **Neutral, Happy, Surprised, Angry and Sleepy**. At catalog build
time, `tools/build_legacy_face_previews.py` renders actual original idle
poses with each actor's own generator. The Face inspector plays 12-frame,
four-direction sprite sheets (SE/SW/NE/NW); every ninth-frame blink uses the
original sleepy eyelids while preserving the chosen mouth. Back views remain
the genuine back-facing idle sprites with no imaginary facial detail.

Use **FACE** on these characters for live preview and **FACE SHEET.PNG** for
a native-pixel atlas. These are character-specific idle previews, **not**
generic 44-row v6b facial overlay atlases: they are not automatically blended
onto other actor motion rigs or installed in live gameplay. `motions.json`
bindings and unrelated character generators are unchanged.

## Motion database and storage

- Shared action definitions: `assets/animation_library/actions.json`.
- Per-character binding: `assets/npc_<name>/motions.json` (or
  `assets/player_<name>/motions.json`).
- Original code-built 44-row v6b sheet: the character's `manifest.json`
  `sheet` field.
- Optional non-native 4-direction action sheet:
  `assets/npc_<name>/motions/<action>_sheet.png` with 64×112 native tiles,
  4 directional rows SE, SW, NE, NW, columns equal to the action's frame count.
- Existing GIF reference catalog: `assets/animation_library/library.json`.
- Face/action combinations are only composed on native v6b rows with valid
  same-character expression overlays. Custom rig action sheets need separately
  authored expression alignment; no unsafe overlays are assumed.
- The site's builder `tools/build_character_catalog.py` auto-discovers any
  character manifest with a matching binding file; no UI edits are needed.

Example binding for a newly approved custom Press Button pose:

```json
{
  "version": 1,
  "character": "npc_aladdin_sane",
  "approved_native_actions": ["idle", "walk", "talk", "sit", "sit_type"],
  "custom_actions": [
    {
      "id": "press_button",
      "sheet": "motions/press_button_sheet.png"
    }
  ]
}
```

Create the actual PNG sheet using the *same character's* native v6b rig,
including true new arm/hand poses, shadow, pixel palette, anchors and timing.
Never paint another character's face over it. Run the color+alpha audit and
visual 1×/4× reviews, then commit source, sprites, metadata and a lesson record
to the private or public source repository as applicable (currently PUBLIC).

If you request a new animation in chat (e.g., `scratch head`, `fart`,
`push door`, `pick nose`):

1. I define the action, frame count, per-frame ms, phase labels, loop/event
   timing and affected character body parts in the central action database.
2. I author 64×112 frames in SE/SW/NE/NW **for the chosen character**, not a
   generic renamed Ichsan clip. If the action is reusable, build shared pose
   logic with a character-specific compatibility adapter.
3. I produce a genuine sprite sheet, animation GIF, a 4× contact preview, and
   tests. Keep it in a pending-review branch until approved.
4. After your visual approval, register the sheet in `motions.json`. The
   next Page build discovers and enables the action for this character.
5. Other characters show **NEEDS RIG** until their compatible adapter is
   authored and reviewed. Success on one character is not automatic universal
   retargeting.

For animation scaffolding, see `docs/animation-library.md` and
`tools/new_animation_template.py`. For approved asset-learning rules, see
`docs/pipeline-learning.md`.

No modifications to the live Kota Shift game are performed by the studio.
