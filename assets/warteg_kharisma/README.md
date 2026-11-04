# Warteg Kharisma Bahari — Bangun Ruang native pixel template (v2)

**Source of truth:** `site/warteg-kharisma-template.js` and `site/warteg-interior-paint.js`, both published to `https://lafrich.github.io/virtual-life-asset-pipeline/` by the existing character-catalog Pages workflow. `lafrich/virtual-office` uses the published script and retains an identical local offline fallback. The game itself is unchanged.

## Design and source photos

- SW/SE/NE/NW exterior sprite views, generated at 1× native scale in the browser, 2:1 isometric and 64×32 tile units.
- Single-floor 8×6 footprint, pivot at the footprint centre; roof + roof right fascia now extend to `a=8.52`, 0.52 tile past the 8-tile wall. The rear edge extends to depth 6.54. Both right and rear fascia continue under the dark corrugated roof.
- Reference identity: yellow masonry/tile wall, green frame, mint storefront lintel, black/charcoal corrugated sheet metal, Kharisma lettering, WKB emblem, terracotta front paving.
- 14 editable interior items on an 8×6 grid: snack shelves, 2 food counters, fridge, kitchen sink, cooking hob, cashier, dining tables and seats. No furniture overlaps or blocked entrance cell.
- The special saved room theme `warteg` triggers *only* Warteg-specific decorations in the shared isometric interior editor: yellow ceramic wall band, green shelving, snack packets, printed-photo/menu frieze, clock, ceiling fan and bulbs. Counters receive pixel food trays and raised glass framework; seats are green, kitchen fixtures have trays, bowls, sauces, pots, and drinks. All furniture items remain movable/rotatable/action-editable in Bangun Ruang; no photobaked floor layer.
- Actions: buy/sell mapped to talk previews; sit mapped to sit; cook/wash stored as gameplay hooks, not nonexistent animations.

## Pixel and palette contract

No anti-aliasing, gradients, black outlines or rotated bitmap sprites. Facets and lettering are rasterized with horizontal pixel scanlines or 1px native steps; 5-tone material ramps are reused from `assets/street_buildings/_work/engine.py` and the existing interior palette. Transparency is clean; no real character sprites baked into a location template. Exported four-view PNG data URLs have native size and ground pivot. This JavaScript runtime family is an **explicit interactive editor exception** to the repo's Python/offline raster generator convention: it must produce the same native pixel contract, and is the upstream source for the Bangun Ruang sprite package.

## Verification

```bash
node tests/test_warteg_template.cjs
node --check site/warteg-kharisma-template.js
node --check site/warteg-interior-paint.js
```

Expected: all four directions render with complete right roof eave and pixel-art pivot, a 14-fixture 8×6 interior is generated without overlaps, and `warteg` theme survives opening the saved Bangun Ruang template. Owner visual review still applies; PNGs in the game itself are **not** changed.

## Render architecture

```text
Virtual Life Asset Pipeline (this repository, site/*.js)
  ├─ warteg-kharisma-template.js → native 1× four-direction building sprites + saved interior scene
  └─ warteg-interior-paint.js → reusable warteg wall + fixture pixel layers
         |
         v
Bangun Ruang built-in Warteg template
  ├─ exterior native PNG + exact size/pivot
  └─ interior scene: 14 independently editable action objects + procedural warteg details
         |
         v
Semesta studio: locally saved building package (NOT production multiplayer game)
```
