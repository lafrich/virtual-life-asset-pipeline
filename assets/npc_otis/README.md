# Otis — HELMETED character (Theodore-body variant)

**Owner visual references:** owner-supplied images and the owner-approved Otis pixel concept: compact turquoise rectangular mechanical shell, short red horn tips, four white lights, completely opaque chrome cylinder instead of a human face, one side socket, a black/red rotating muzzle, and a plain square rear box.

## Design contract

- **Body is exactly Theodore**: same original V6B (64 × 112 px, pivot 32,100), wine-red suit, red gloves, white boots, chest emblem and marble window, waist trim, backpack, grounding and per-frame pose. This generator never generates another body. It opens Theodore's **actual pixel PNG frames**, copies them unchanged and edits only the headpiece and its protruding muzzle.
- **Face:** entirely hidden. Otis now uses a solid chrome visor with **no eyes, no skin, no visible glasses**. The underlying Theodore face is never shown in the published sprite, and Otis intentionally publishes **zero facial expression options**; interactions use body and helmet motion instead.
- **Approved pixel helm:** compact near-square cyan/teal shell, twin red horns, four roof lights, substantial horizontal *opaque* metal cylinder, one round chrome endcap, and a short black/red rotating port. The full head assembly is scaled to the original Theodore 64×112 body rather than enlarging or modifying the body.
- **Animated rotation:** the forward muzzle's spokes change phase across original body motion frames. The rotation is encoded in actual generated actor PNG pixels, not CSS or GIF substitution.
- **Directions:** SE/SW/NE/NW. Front two directions show a completely **opaque** visor and rotating snout. Both rear views show the flat-topped clean turquoise rectangular back with side disk and no rear snout; the original silver backpack is unchanged Theodore artwork. Mirroring preserves the four-direction projection.
- **Model category:** `HELMETED` (same semantic skeleton category as Theodore). This is **not** a newly created skeletal skin; it is a complete source-specific pixel sheet and motion library, with shared bone channels available separately.

## Generation

From repository root, after building the Theodore source:

```bash
python assets/npc_theodore/make_theodore.py
python assets/npc_otis/make_otis.py
python tools/build_character_catalog.py
```

The official CI asset build invokes `tools/generate_archive_previews.py`, which now renders Theodore and then Otis in that order. It publishes `legacy_otis` in `catalog.json`, `rigs.json`, and the seven authored sprite actions in `motion-packs/legacy_otis.json`.

Outputs under `assets/npc_otis/` are generated on build: `frames/otis_<dir>_<idle|walk>_fN.png`, `poses/otis_<dir>_<action>_fN.png`, No face variants are produced because the visor is fully opaque. These are intentionally build-generated (rather than commit copies of Theodore's existing sprites), and the site builder produces the canonical full atlas, GIF and thumbnail automatically.

**Live game:** Character Stock previews are not automatically a change to Virtual Life's encrypted game or NPC spawning. Gameplay inclusion is a separate, authorized integration step.
