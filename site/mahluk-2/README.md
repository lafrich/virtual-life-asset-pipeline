# Mahluk Hidup 2.0 — 2.5D Plane Studio

Standalone replacement candidate (not the existing production editor).
Open: https://lafrich.github.io/virtual-life-asset-pipeline/mahluk-2/

## Design

- Original V6B 64×112 RGBA art is read **non-destructively** from `../media/original-rig/manifest.json` (the same source pipeline as the existing Mahluk Hidup rig). No automatic low-poly character.
- Each body, hair and face cutout is a child of its own bone/node.
- Selected plane: X/Y position, Z depth and occlusion, angle, scale, visible.
- Body/head parenting is inherited. Facial planes (eyes, brows, mouth, blush, glasses) can choose a separate expression image while still following the head.
- Scene viewport is a **2.5D projected isometric editor**, not a volumetric 3D mesh. The right-hand 64×112 panel shows the actual composited game pixels.
- Move (W), rotate (E), scale (R) gizmos, axis X/Y/Z (1/2/3), keyframe (K), delete key, middle-drag pan, wheel zoom.
- The authored clip is exported as 64 × N pixel columns and 4 × 112 pixel rows (SE, SW, NE, NW) using the source cutouts. Movement/animation in game uses the same images and per-frame durations.

## Shared-origin game bridge

- Clicking `SAVE + SYNC CHARACTER` stores a JSON record in `localStorage["mahluk-2-library-v1"]`.
- Published actor ID: `mh2_...`. The record contains `format:"mahluk-2-character-v1"`, rig tree and transforms, `clips` (each a PNG data URL, number of frames and frame times), plus a composed preview sprite.
- `virtual-office/world-builder/mahluk-hidup-bridge.js` adds these published actors to the Semesta and Bangun Ruang catalogs. `pipeline-character-rig.js` composes the actual 3D-world billboard from the same four-direction frame strip. Only actions with an authored clip are advertised; missing actions remain unimplemented.
- Semesta character palette includes the `character:mh2_...` entry. Bangun Ruang `Mahluk Hidup / Scale Test` can preview the identical actor.
- Same **origin + browser profile** is required for this v1. Storage is local only; it does not upload custom characters to GitHub, and does not share between devices. Export Project JSON for a backup.
- Legacy character data, prior Mahluk Hidup, and city drafts are not deleted.

## Limitations

This version is an editable 2.5D *cutout* rig, not IK, dynamic skin weighting or a 3D mesh. It bakes the composed four-direction sprite clips; it does not preserve live C4D plane gizmos in Semesta. Game mechanics and non-authored actions still belong to Jiwa / dedicated animation data. Publish idle and, optionally, walk or other clips before using those actions in the game.
