# Otis — HELMETED character (Theodore-body variant)

**Owner visual references:** two supplied screenshots showing a retro-futurist turquoise helmet, two red horn tips, four white cap lights, transparent chrome visor, large round chrome side socket, and a front-facing rotating black muzzle with a radial metal cage and red inner aperture.

## Design contract

- **Body is exactly Theodore**: same original V6B (64 × 112 px, pivot 32,100), wine-red suit, red gloves, white boots, chest emblem and marble window, waist trim, backpack, grounding and per-frame pose. This generator never generates another body. It opens Theodore's **actual pixel PNG frames**, copies them unchanged and edits only the headpiece and its protruding muzzle.
- **Face:** preserve Theodore's original round spectacles, skin, eyes, and five authored facial expressions, visible through the helmet visor.
- **Revised compact helmet:** cyan/teal cap reduced from an approximately 39 px-wide 25–44 px roof to a ~25 px-wide 30–42 px roof (full front including compact side socket spans about 31 px). Two shorter red horns, four miniature lights, smaller chrome side disk and narrower black-red rotating front port ending at y66. Head/body ratio follows the full-body reference rather than the initial oversized close-up crop.
- **Animated rotation:** the forward muzzle's spokes change phase on each original idle, walk, talk, sit and other pose frame. A visible spin is encoded in the **actual generated sprite pixels**, not a CSS illusion or a renamed JSON animation.
- **Directions:** SE/SW/NE/NW. Front views retain the transparent goggle window and rotating snout. Both rear views use a **flat-topped, mostly plain turquoise rectangular helmet box** (not an oversized rounded helmet or second snout); the original silver backpack below the head is still Theodore's unchanged body part. West-facing images mirror the correctly authored east-facing geometry.
- **Model category:** `HELMETED` (same semantic skeleton category as Theodore). This is **not** a newly created skeletal skin; it is a complete source-specific pixel sheet and motion library, with shared bone channels available separately.

## Generation

From repository root, after building the Theodore source:

```bash
python assets/npc_theodore/make_theodore.py
python assets/npc_otis/make_otis.py
python tools/build_character_catalog.py
```

The official CI asset build invokes `tools/generate_archive_previews.py`, which now renders Theodore and then Otis in that order. It publishes `legacy_otis` in `catalog.json`, `rigs.json`, and the seven authored sprite actions in `motion-packs/legacy_otis.json`.

Outputs under `assets/npc_otis/` are generated on build: `frames/otis_<dir>_<idle|walk>_fN.png`, `poses/otis_<dir>_<action>_fN.png`, `expr/otis_se_<expression>.png`. These are intentionally build-generated (rather than commit copies of Theodore's existing sprites), and the site builder produces the canonical full atlas, GIF, portrait and 4-way face sheets automatically.

**Live game:** Character Stock previews are not automatically a change to Virtual Life's encrypted game or NPC spawning. Gameplay inclusion is a separate, authorized integration step.
