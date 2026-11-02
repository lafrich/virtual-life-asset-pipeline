# Otis — HELMETED character (Theodore-body variant)

**Owner visual references:** two supplied screenshots showing a retro-futurist turquoise helmet, two red horn tips, four white cap lights, transparent chrome visor, large round chrome side socket, and a front-facing rotating black muzzle with a radial metal cage and red inner aperture.

## Design contract

- **Body is exactly Theodore**: same original V6B (64 × 112 px, pivot 32,100), wine-red suit, red gloves, white boots, chest emblem and marble window, waist trim, backpack, grounding and per-frame pose. This generator never generates another body. It opens Theodore's **actual pixel PNG frames**, copies them unchanged and edits only the headpiece and its protruding muzzle.
- **Face:** preserve Theodore's original round spectacles, skin, eyes, and five authored facial expressions, visible through the helmet visor.
- **New helmet:** broad cyan/teal shell; two small red angled horns; white running lights; horizontal chrome visor enclosure; rounded chrome side-disc; black-red front port and rotating 4-spoke silver cage.
- **Animated rotation:** the forward muzzle's spokes change phase on each original idle, walk, talk, sit and other pose frame. A visible spin is encoded in the **actual generated sprite pixels**, not a CSS illusion or a renamed JSON animation.
- **Directions:** SE/SW/NE/NW. West-facing images mirror the correctly authored east-facing shell, rear directions show proper helmet backing rather than an impossible second muzzle.
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
