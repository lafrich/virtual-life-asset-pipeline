# Indonesia Interior Pack v1 — Bangun Ruang

Procedural interior preset registry: **66** room recipes with actionable interior furniture metadata. Runtime source: `site/indonesia-interior-templates.js` (mirrored into Virtual Office Bangun Ruang as an offline fallback). Rooms do not replace Warteg Kharisma, legacy rooms or authored sprites.

- Projection: 2:1 isometric, 64×32 px native Semesta ground tile, one floor per scene.
- Layout: deterministic relative placement, with collision protection and door kept clear in the editor model.
- Actions: each type has valid interaction slots, an actor pose only when existing Mahluk Hidup rig can preview it. `cook`, `pray`, `laundry`, `pay` etc are **gameplay hooks**, not finished multiplayer actions or newly authored animation sprites.
- Default recommended footprints: houses 5×4; stores, public spaces and larger rooms 8×6. Smaller exteriors fit fewer items; verify after applying.
- Furnishings: additional reusable category/type registry with a visual proxy or code-drawn shape. Not photoreal sprites; project style follows existing Bangun Ruang / Virtual Life palette.

## QA
Review reachability, native pixel fidelity, character action docking and existing game compatibility before publishing to the multiplayer environment. User review/approval pending. Existing sprites are not overwritten.
