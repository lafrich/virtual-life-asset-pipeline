# Bergerak format — `lgr1-bergerak-v1` (LGR-1 animation database entry)

Stable since `mh-subapps-1` (2026-11-10). Made in **Mahluk Hidup → ✦ BERGERAK**, stored in the cloud
database (see `docs/LGR_DB.md`), played by the game through `site/lgr-db.js` + `site/lgr1-motion.js`.
Validator: `LGRDB.validateBergerak(entry, poses)` (strict; the same check runs on every save and on every
entry pulled from Drive). Import helper (auto-fix + Indonesian errors): `LGRImport.normalizeBergerak`.

```json
{
  "format": "lgr1-bergerak-v1",
  "schema": 1,
  "id": "ogah_flag",
  "name": "Pak Ogah · kibar bendera",
  "category": "kerja",
  "notes": "",
  "rev": 3,
  "created": "2026-11-10T13:20:00.000Z",
  "updated": "2026-11-10T13:40:00.000Z",
  "basedOn": "builtin:wave",
  "preview": { "gender": "male" },
  "motion": {
    "source": "neutral",
    "angleSnap": 5,
    "loop": true,
    "frames": [
      { "ms": 150, "parts": { "arm_r_upper": { "a": -150 }, "arm_r_lower": { "a": -20 } } },
      { "ms": 150, "parts": { "arm_r_upper": { "a": -120 }, "pelvis": { "y": 1 } },
        "dirs": { "sw": { "head": { "a": 10 } } }, "behindTorso": ["arm_l_upper"] }
    ]
  }
}
```

| field | rule |
|---|---|
| `format` | always `lgr1-bergerak-v1` (required) |
| `schema` | `1` (written by the database; readers ignore unknown higher-level fields) |
| `id` | `a-z 0-9 _`, 1–40 chars; this is what the game references as `bergerak:<id>`. Ids of `media/lgr1/needed-motions.json` are the game's required actions |
| `name` / `category` / `notes` | text ≤ 60 / 30 / 500. Category `placeholder` = temporary version (checklist shows ◐) |
| `rev`, `created`, `updated` | set by the database on save (rev +1). `updated` decides sync conflicts (newest wins) |
| `basedOn` | optional `builtin:<id>` / `bergerak:<id>` it was copied from |
| `preview.gender` | `male` / `female`, preview only — every motion works on both bases |
| `motion.source` | base pose id from `media/lgr1/motions.json` `poses` (`neutral`, `crouch`, `arms_up`) |
| `motion.angleSnap` | one of 1, 5, 10, 15, 30, 45, 90 (render-time angle rounding) |
| `motion.loop` | `true` loops; `false` holds the last frame |
| `motion.frames` | **1–60** frames (the built-in library file keeps its own 1–6) |
| `frames[i].ms` | integer 40–2000 (how long the frame shows; stepped pixel-art frames) |
| `frames[i].parts` | `{ <joint>: {a, x, y} }` **deltas** on top of the source pose, authored as seen in **SE**. Missing joint = 0 |
| joints | `head` (incl. neck), `torso`, `pelvis` (root), `arm_r_upper`, `arm_r_lower`, `arm_l_upper`, `arm_l_lower`, `leg_r_upper`, `leg_r_lower`, `leg_l_upper`, `leg_l_lower` (anatomical right/left) |
| `a` | degrees, −360…360, positive = clockwise on screen, rotation around the joint pivot of the official base, relative to the parent |
| `x`, `y` | pixels, −32…32 (normally only `pelvis` = root offset; `torso` x/y also moves the whole body) |
| `frames[i].dirs` | optional per-view overrides `{se|sw|ne|nw: {<joint>: {a,x,y}}}` — **absolute screen values** for that view, used instead of the mirrored delta |
| `frames[i].behindTorso` | optional list of limb joints drawn behind the torso in that frame |
| `frames[i].shadow` | optional ground shadow per frame: `{enabled:true,x:0,y:0,rx:11,ry:3}`. When absent, default is a black ellipse (alpha 56) at foot (32,101). Integer ranges: x −24..24, y −16..16, rx 2..28, ry 1..10. `enabled:false` hides the shadow. Used by Beraksi stage. |

Views: SE edits apply to every view. SW/NW mirror x and angle (the same anatomical hand moves), NE uses SE values.
Runtime mapping is exactly `LGR1Motion.framePose(poses, motion, frameIndex, dir, sides)` and
`LGR1Motion.frameOrder(...)`; frame timing `LGR1Motion.frameIndexAt(motion, ms)`.
For playback validate with `LGRDB.validateMotionLong` (or use `LGRDB.motion(id)`) — it applies
`LGR1Motion.validateMotion` in chunks of 6, so the shared core is unchanged.

Import also accepts (and converts, listing every fix): a bare `{frames:[…]}` motion, a `lgr1-motion-v1`, an array /
`motions.json` library (pick one), a Drive file (`lgr1-db-file-v1`), JSON wrapped in ```json fences, trailing commas,
joint aliases (`rightUpperArm`, `left_forearm`, `hips`, `arm_near_upper`…), `angle`/`rotation` keys, plain numbers as
angles, radians (all |a| ≤ 6.3 with decimals, or `"angleUnit":"rad"`), `fps` instead of `ms`, seconds instead of ms.
Anything that changes meaning (unknown joint, angle/offset out of range, missing frames, unknown pose) blocks the save.

## Stock animations and game-required list (2026-11-13)

The stock motions are **builtin:<id>** entries in `site/media/lgr1/motions.json`. To replace a stock animation from a Bergerak export, copy the exported `motion.source`, `angleSnap`, `loop`, and `frames` into the corresponding built-in motion while preserving its canonical stock `id` and `name`. This keeps all existing game references stable.

**Mahluk Hidup → Bergerak** now has one **DATABASE ANIMASI · KEBUTUHAN GAME** list. The required IDs from `site/media/lgr1/needed-motions.json` are shown **in the same list** as database/cloud and built-in animations. Entries without a motion show **＋ / BELUM ADA** and open a new animation using the required game ID; `placeholder` remains a separate status. The requirements JSON remains a source of IDs and categories, not a second UI list and not a set of fabricated playable clips. User-created database animations and other built-ins remain visible.

## Shadow authoring
In **Bergerak → SHADOW · BAYANGAN**, adjust X/Y, width and depth or drag the shadow with **✥ GESER DI PREVIEW**. Values apply to the selected frame. **⇢ TERAPKAN SEMUA FRAME** applies values to each frame; **RESET FRAME** restores defaults. Flat black alpha 56, no blur or antialiasing.

The LGR-1 motion validator is unchanged for JS/Python parity. LGRDB validates and retains optional `frames[].shadow` in cloud sync and JSON import/export. Shadow is drawn separately on the Beraksi stage, not baked into Genesis or clothing sprites.
