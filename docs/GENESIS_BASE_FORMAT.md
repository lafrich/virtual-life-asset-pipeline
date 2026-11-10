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
  "skin": {                              // see § Skin (game contract)
    "encoding": "v6p-key-ramp-v1",
    "keys": {"i":"#FF2CE8","h":"#FF32E5","e":"#FF38E2","a":"#FF3EDF","7":"#FF44DC","5":"#FF4AD9"},
    "order": ["i","h","e","a","7","5"],
    "tones": {"porcelain": {...}, "light": {...}, "tan": {...}, "medium": {...}, "brown": {...}, "deep": {...}},
    "toneOrder": ["porcelain","light","tan","medium","brown","deep"],
    "baseTone": "light",
    "preview": {"tone": "deep"} | {"tone": "custom", "custom": "#RRGGBB"},
    "keyedPixels": 4321,                 // skin pixels written as keys
    "offRamp": {"count": 16, "colors": {"#4A3A30": 12, "#E18A84": 4}}
  },
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

## Skin (game contract)

Skin pixels in `rig.layers` are stored as the **key ramp** of the old V6P
character customizer (`site/v6p-compositor.js`, keys `Ki Kh Ke Ka K7 K5`,
skin list `P.skin`; the copy in `site/lgr-skin.js` is tested to match it):

| key | role | key colour | light (V6B base) |
|---|---|---|---|
| i | highlight | `#FF2CE8` | `#F1D3B5` |
| h | main | `#FF32E5` | `#EBC8A8` |
| e | shade | `#FF38E2` | `#E0AE8A` |
| a | deep shade | `#FF3EDF` | `#D9A47E` |
| 7 | dark / outline in | `#FF44DC` | `#A8704E` |
| 5 | outline | `#FF4AD9` | `#8A5A3C` |

Tones (i, h, e, a, 7, 5):
- porcelain `#F8E4D6 #F2D8C7 #E7BCA3 #DFB195 #AD795C #8E6147`
- light `#F1D3B5 #EBC8A8 #E0AE8A #D9A47E #A8704E #8A5A3C`
- tan `#E3B791 #DDAD87 #D3976F #CC8E65 #9E613E #824E30`
- medium `#C99364 #C48B5D #BB794C #B57246 #8C4E2B #733F21`
- brown `#9A6644 #96613F #8F5434 #8B4F2F #6B361D #582C17`
- deep `#66412B #633E28 #5F3621 #5C331E #472313 #3A1C0E`
- custom: picked colour = `i`; every other key = picked × (light key ÷ light `i`) per RGB channel.

Bake / game: replace every fully-opaque pixel whose RGB equals a key with the
chosen tone's colour for that key, at draw time (exactly like V6P `cmap`).
Pixels listed in `skin.offRamp` look like skin but are not on the ramp (e.g.
lips, body hair); they keep their colour in every tone.

In the editor the draft keeps the light tone (1:1 with the keys); the SKIN TONE
buttons only preview a tone (stage, thumbnails, motion preview, pixel editor,
PNG sheets). Export writes keys, import turns keys back into light. Emosi faces
are separate and never recoloured.

## Auto-slice on APPLY (pixel editor)

With **AUTO-SLICE NEW PIXELS** (default on): pixels added, moved or pasted while
editing part P join P's slice; pixels erased from P that no other layer covers
become *no part*; pixels another part's slice owns by hand painting (manual
lock) stay that part's; everything else keeps its slice.

## Ingest

1. `JSON.parse`, require `format === "lafrich-genesis-base-v1"`.
2. Verify `sha256(JSON.stringify(pkg.rig)) === pkg.rigSha256` (rig is in key form).
3. `LafrichPuppetCore.validateMaster(pkg.rig)` (same validator as the engine);
   `rig.gender` must equal `pkg.gender`.
4. Use `rig` as the frozen base for that gender; `manualSlice` only tells which
   mask pixels were hand-painted (keep them if re-slicing).
