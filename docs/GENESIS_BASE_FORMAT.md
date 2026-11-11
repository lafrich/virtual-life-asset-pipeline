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

## Official LGR-1 base (approved 2026-11-10)

Lafrich approved his Male and Female drafts as **the** LGR-1 base
("Ini ya versi oke coba jadiin base", 2026-11-10 18:45 WIB). They live in
`site/media/lgr1/base/`:

| file | what |
|---|---|
| `genesis-base-male.json`, `genesis-base-female.json` | official `lafrich-genesis-base-v1` packages (skin in key form, checksummed) |
| `genesis-base-<gender>-sheet.png` | 4-view preview, light + deep tone |
| `source/genesis_<gender>_draft.lafrich-20261110.json` | his original ↓ SAVE DRAFT files, byte-for-byte (`lgr-1-draft-v1`) |
| `index.json` | version, `rigSha256` per package, `sha256`/bytes of each source file |

**Draft format `lgr-1-draft-v1`** (old ↓ SAVE DRAFT button): `{format, gender,
record:{rig, manual, skin, reviewed, …}}`, skin in the *light* tone (not keyed),
no checksum, no notes. ↑ IMPORT accepts it; the official packages were made by
importing each draft and running the same `buildPackage()` as ↓ EXPORT BASE
(light → key, `rigSha256`). Unkeying a package gives the draft's pixels back
exactly; masks, pivots and placements are unchanged.

**Role.** Genesis Base seeds every *new* browser draft from these files
(↻ RESET TO OFFICIAL BASE; ↺ OLD V6B is the fallback, also used if the files
can't load). Drafts already in a browser are never overwritten. The Mahluk
Hidup rebuild (players & animations on LGR) and the later **Bake** step read
these packages through § Ingest; read `index.json` first and refuse a package
whose `rigSha256` doesn't match. A new approved base = new files + bump
`index.json.version` and `OFFICIAL_BASE_VERSION` in `genesis-base-app.js`;
never edit an approved package in place.

### official-2 (2026-11-10 20:05 WIB)

- Base pixels, slices and pivots are unchanged (same `rigSha256`).
- Hair back views (NE/NW) redrawn for this base in `site/media/v6p/hair/`:
  **short** keeps its original length/silhouette and gains strand + volume
  shading with darker under-layers toward the nape (jaw outline and the gap
  behind the ear covered); **swept** gets a tapered nape with both ears free.
  Front views (SE/SW) and the other six styles are untouched. Legacy rotated
  `float`/`lie` cells are left as they were (LGR does not use them).
- **Joint fill** (render time, `LGR1Raster.JOINT_FILL` = `JOINT_FILL` in
  `genesis_procedural_runtime.py`, radius 8 px, waist 10 px): after the parts
  are drawn, an empty pixel near a joint that is a ≤2 px crack or an enclosed
  hole is filled with the joint pair's own rest colour (child, then parent),
  else the commonest neighbour colour. It never draws over art, and gaps that
  already exist at rest (crotch, armpits) stay open, so the rest pose is
  byte-identical. JS and Python are pixel-identical (parity tests).


### official-4 (2026-11-11): Female slicing revision

Lafrich approved the adjusted slicing in `genesis_female_draft.json` as the new Genesis **Female** LGR base. The draft is stored byte-identically at `site/media/lgr1/base/candidates/genesis_female_draft-20261111.json`. `genesis-base-female-official-4.json` retains official-2 Female artwork/skin keys and anatomical structure, but uses the uploaded four-angle masks, pivots, placements and manual-slice flags. `genesis-base-female.json` remains the untouched previous package. `archive/index-official-3.json` keeps the previous catalog mapping. Male continues using `genesis-base-male-official-3.json`, unchanged. The active pointers are in `site/media/lgr1/base/index.json` (`official-4`).
