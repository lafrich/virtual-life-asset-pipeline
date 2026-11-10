# Beraksi format — `lgr1-beraksi-v1` (LGR-1 action-scene database entry)

Stable since `mh-subapps-1` (2026-11-10). Made in **Mahluk Hidup → ⚔ BERAKSI**, stored in the cloud database
(`docs/LGR_DB.md`), played by the game with `site/lgr-db.js` (+ `site/lgr-actor.js` to draw a character).
Validator: `LGRDB.validateBeraksi(entry)`; references are checked by `LGRImport.checkRefs` before saving.
Import helper: `LGRImport.normalizeBeraksi`.

```json
{
  "format": "lgr1-beraksi-v1",
  "schema": 1,
  "id": "ngobrol_warung",
  "name": "Ngobrol di warung",
  "category": "ngobrol",
  "notes": "",
  "rev": 1, "created": "2026-11-10T13:30:00.000Z", "updated": "2026-11-10T13:30:00.000Z",
  "loop": true,
  "durationMs": null,
  "stage": { "units": "px", "anchor": "feet", "footX": 32, "footY": 101, "width": 256, "height": 160 },
  "actors": [
    { "key": "a1", "name": "Budi", "gender": "male", "skin": { "tone": "tan" },
      "outfit": "tee_trousers", "wear": { "hair": "short", "hairColor": "brown" },
      "x": -24, "y": 0, "dir": "se", "flip": false, "layer": 0,
      "track": [ { "motion": "builtin:talk", "ms": 2000 }, { "motion": "bergerak:wave", "ms": 1200 } ],
      "emosi": [ { "face": "emosi_emotion-abc", "startMs": 0, "ms": 1500 }, { "face": "emosi_emotion-def", "startMs": 1500, "ms": 1700 } ] },
    { "key": "a2", "name": "Sari", "gender": "female", "skin": { "tone": "light" },
      "outfit": "none", "wear": { "hair": "long", "hairColor": "black" },
      "x": 24, "y": 0, "dir": "sw", "flip": false, "layer": 1,
      "track": [ { "motion": "builtin:idle", "ms": 3200 } ], "emosi": [] }
  ]
}
```

| field | rule |
|---|---|
| `format` | `lgr1-beraksi-v1` (required) · `schema` 1 |
| `id` | `a-z 0-9 _`, 1–40; game reference `beraksi:<id>` / `LGRDB.scene(id)` |
| `loop` | scene loops when it ends |
| `durationMs` | `null` = automatic (longest actor track); else 40–600000 |
| `stage` | positions are **relative**: `x` from the stage centre, `y` from the ground line (+ = towards the camera), in base pixels (1 px = one pixel of the 64×112 sprite). The sprite's **feet anchor** is pixel (`footX` 32, `footY` 101) of the 64×112 cell → draw the cell at (`x − 32`, `y − 101`) relative to the scene origin. `width`/`height` = the editor's stage size |
| `actors` | 1–8 characters |
| `key` | `a-z 0-9 _` ≤ 20, unique in the scene |
| `gender` | `male` / `female` → official LGR-1 base (`media/lgr1/base`) |
| `skin.tone` | `porcelain` `light` `tan` `medium` `brown` `deep` (LGR skin key ramp, `site/lgr-skin.js`) |
| `outfit` | `none` (nude base) · `tee_trousers` · `shirt_tie_baggy` · `cardigan_ripped` · `custom` (pieces in `wear`) |
| `wear` | optional `{top, topColor, pants, pantsColor, shoes, shoesColor, hair, hairColor}`; options = `LGRWear.OPT` (`site/lgr-wear.js`). `hair` also applies with presets / `none` |
| `dir` | `se` `sw` `ne` `nw` · `flip` mirrors the drawn cell horizontally around the feet |
| `layer` | draw order: lower first (behind), higher in front; ties keep array order (`LGRDB.drawOrder`) |
| `track` | 1–24 animations played **in sequence**: `motion` = `builtin:<id>` (media/lgr1/motions.json) or `bergerak:<id>` (database); `ms` 40–600000 = how long that animation runs (it loops inside if longer than one cycle). After the last item the last frame holds (`LGRDB.trackAt`) |
| `emosi` | 0–24 Emosi faces `{face, startMs, ms}`; `face` = Emosi.exe id (`emosi_<id>` as listed by `emosi-bridge.js`). No face outside the ranges. Drawn under the front hair with the head transform; not drawn in back views (NE/NW). Animated Emosi faces advance by their own frame time (`LGRDB.emosiAt` gives `localMs`) |

Playback at scene time `t`: for each actor in `LGRDB.drawOrder(scene)`: `ti = LGRDB.trackAt(actor, t)`,
`m = LGRDB.motion(ti.item.motion)`, `frame = LGR1Motion.frameIndexAt(m, ti.localMs)`,
`face = LGRDB.emosiAt(actor, t)`, then `LGRActor.frameCanvas(actor, {motion:m, frame, dir:actor.dir, faceId:face?.face, faceMs:face?.localMs})`.

Import accepts aliases (`characters`/`karakter`, `animations`/`animasi`, `emotions`/`faces`, `cowok/cewek/m/f`,
`"SE"`, `"flip":"true"`, motion ids without prefix, Emosi by name, durations in seconds) and lists each fix. Unknown
motions, Emosi faces, outfits, garments or out-of-range values block the save, with the field path in the message.
