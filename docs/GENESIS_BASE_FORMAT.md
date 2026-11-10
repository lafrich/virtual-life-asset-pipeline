# Genesis Base package — `lafrich-genesis-base-v1`

Made by **Genesis Base by Lafrich** (`site/genesis-base.html`), the editor for
the Male / Female base characters ("patokan genesis"). One package = one
gender. It is the hand-off file the artist sends back as the base character
for the LGR engine (players, animations and Emosi are built on top of it).

## App

- 01 · PIXEL EDITOR — same editor as Emosi (select, copy, paste, paste flip,
  flip H/V, undo/redo, grid, phone layout), 4 views SE / SW / NE / NW, layers
  body / clothing kept separate. Back head (NE/NW) from the whole front head.
- 02 · PIVOT & SLICING — 11 LGR-1 parts, ✂ RE-SLICE FROM SHAPE, SLICE PAINT /
  UNASSIGN (hand-painted pixels are kept), pivots, draw order, near side,
  joint caps, ▶ PREVIEW MOTION (shared `media/lgr1/motions.json`).
- Autosave in the browser: `localStorage["vl-lafrich-genesis-base-drafts-v1"]`
  (separate from Mahluk Hidup).
- ↓ EXPORT BASE .JSON → `genesis-base-<gender>-<YYYYMMDD-HHMM>.json` (local time).
- ↓ PNG SHEETS → `…-art.png` (4 views, ×4) and `…-mask.png` (part colours).
- ☁ SAVE BASE TO DRIVE → `Membangun/Mahluk Hidup/Genesis Base/`
  `genesis-base-<gender>-<ISO time>.<sha10>.json`. Always a NEW file, read back
  and SHA-256 verified. Genesis Masters and other Drive files are never written.
- ↑ IMPORT BASE / ↓ OPEN SELECTED VERSION reopen a package (checksum checked).
  A plain LGR-1 master JSON (`lafrich-genesis-master-v1`) is also accepted.

## JSON

```jsonc
{
  "format": "lafrich-genesis-base-v1",
  "formatVersion": 1,
  "app": "genesis-base-1",
  "watermark": "Genesis Base by Lafrich",
  "gender": "male" | "female",
  "id": "lafrich_male",                 // rig.id
  "created": "ISO-8601 UTC", "edited": "ISO-8601 UTC",
  "canvas": {"width": 64, "height": 112},
  "dirs": ["se","sw","ne","nw"],        // NE/NW = back views
  "parts": [11 LGR-1 part ids],          // index = mask value
  "parents": {"pelvis": null, "torso": "pelvis", ...},
  "notes": "artist notes (≤4000 chars)",
  "manualSlice": {"se": "<base64 bitmap 64×112, 1 = hand-painted>", ...},
  "rigSha256": "sha256 hex of JSON.stringify(rig)",
  "rig": {                               // LGR-1 master, see LGR_FORMAT_SPEC.md
    "format": "lafrich-genesis-master-v1", "id", "gender", "name", "version", "updated",
    "layers": {"body": {"se": "data:image/png;base64,…", …}, "body_front": …, …},
    "masks": {"se": "<base64, 64×112 bytes, part index or 255 = no part>", …},
    "pivots": {"se": {"head": {"x": 0-63, "y": 0-111}, …}, …},
    "placements": {"se": {"head": {"x": 0, "y": 0}, …}, …},
    "drawOrders": {"se": [part ids back→front]},   // optional
    "sides": {"se": "left" | "right"},             // optional, near limb
    "capRadius": {"torso": 3, …}                    // optional, joint caps px
  }
}
```

## Ingest

1. `JSON.parse`, require `format === "lafrich-genesis-base-v1"`.
2. Verify `sha256(JSON.stringify(pkg.rig)) === pkg.rigSha256`.
3. `LafrichPuppetCore.validateMaster(pkg.rig)` (same validator as the engine);
   `rig.gender` must equal `pkg.gender`.
4. Use `rig` as the frozen base for that gender; `manualSlice` only tells which
   mask pixels were hand-painted (keep them if re-slicing).
