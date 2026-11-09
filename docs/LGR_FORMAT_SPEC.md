# LGR-1 — Lafrich Genesis Rig

**Canonical name:** Lafrich Genesis Rig, version 1 (**LGR-1**).

**Technical category:** 2D skeletal cutout pixel rig (2.5D / four-direction isometric puppet).

It is *not* a 3D skeleton, not a simple spritesheet animation and not a new image-generation style. LGR-1 combines **independently editable pixel art** with **per-direction joint positions and mask ownership**. Animations move those parts using procedural, time-based transform data rather than rasterizing and storing each animation frame in advance.

## Required identity

- Source bases: frozen `genesis_male_nude` and `genesis_female_nude` from original V6B.
- Final master IDs: `lafrich_genesis_male` and `lafrich_genesis_female`.
- Format marker: `rigFormat: "LGR-1"`.
- Compatibility wire formats: `lafrich-genesis-binding-v1` for the binding and `lafrich-genesis-master-v1` for approved masters.
- Export: verified JSON master, declarative Python geometry source, plus 64×112 PNG artwork encoded as source RGBA layers inside the JSON. A future `.lgr` binary/container is **not** implemented.
- Original body is **not** keyed to any historical Mahluk-1/2 character ID.

## Geometry

- Four authored directions: `se`, `sw`, `ne`, `nw`.
- Native coordinate system: 64×112 pixels, original V6B anchor [32,100].
- Ten body pieces: head, torso, both upper arms and forearms, both thighs and lower legs (near/far relative to viewer).
- Each angle keeps independent per-part pivot coordinates and a pixel mask assigning every visible original pixel to one of the ten pieces.
- A part that is **occluded** in one direction may have zero visible pixels there, while its pivot and parent relationship still exist.
- Parent hierarchy transports child joints; nearest-neighbor rendering preserves source pixels.
- Physical layers retain independence: body/skin, body-front, hair front/back, tops front/back, pants, shoes and accessories. A character outfit can replace layers before applying the SAME 10-part mask and pose.

## Animation and expression

- `site/genesis_procedural_runtime.py` computes affine transforms from animation time, per-joint x/y offsets and angular rotations; supports optional appearance-layer overrides, no frame atlas required.
- Faces, eyes, mouth and lipsync use the separately authored **Emosi.exe** database. They are composited with the head transform and must never be baked into the underlying body PNG.
- Procedural example motions (idle/walk/wave) are diagnostic checks, not a completed Mainkan animation library.

## One active authoring pipeline

`Pixel Editor → Pivot & Slicing (4 directions) → Bind → Check Binding → Approve & Save LGR-1 Master.`

The active app is `site/genesis-workbench.html`, reached through `site/mahluk-hidup.html` and `site/index.html`. The only separate authoring sub-app linked from this UI is Emosi.exe.

The following historical Mahluk pages are **hard-retired**: `lafrich-puppet-studio.html`, `genesis-editor.html`, `mahluk-action-editor.html`, `mahluk-animation-native.html`, `v6p-studio.html`, and `pixel-editor.html`. They serve static retirement pages and execute no old JavaScript. Their entry controllers also return immediately before initialization.

**Old synchronization is fail-closed:**

- `site/mahluk-hub-drive.js` rejects connect, backup/restore, list, save and load for legacy Mahluk.
- `site/drive-sync.js` rejects writing anything with `app="mahluk"`, and rejects V6P part/user project uploads. It does **not** block independent Semesta and Bangun Ruang Drive operations.
- `site/vlhub-characters-publish.js` rejects old V1/V2 sync into same-origin Semesta character keys and its async archive fallback.
- `tools/build_mahluk_motion_registry.py` leaves the old `genesis-v6b-motion-registry-v1` index empty and rejects any newly authored six-part motion-packs.
- `site/v6p-compositor.js` bypasses legacy local part overrides for immutable, frozen Genesis Male/Female sources.
- `site/genesis-cloud.js` writes **only** canonical Male/Female approved LGR-1 masters to `My Drive/Membangun/Mahluk Hidup/Genesis Masters`, validates matching base IDs and every direction's rig, pivot and mask, and verifies the SHA-256 readback.

Existing legacy character files, saved game assets and historical Git sources remain intact for backward-compatible **read-only** gameplay in Semesta/Mainkan. There is **no automatic migration** of V1/V2/V6P characters, actions, clips, or older Drive backups into LGR-1. Deleting those records without checking dependencies could break existing saved games, so they are archived, not physically destroyed.

**Mainkan integration is not yet implemented** in this repository. The next game integration should explicitly whitelist `rigFormat === "LGR-1"` and `format === "lafrich-genesis-master-v1"`, require four directions, require `approvedAt`, and reject imports from legacy character and motion tables. Until then, canonical LGR-1 masters are authoring exports only.

## Automated safety gate

`tests/test_lgr_retirement.cjs` and `.github/workflows/genesis-workbench-qa.yml` enforce retired routes, blocked old writes, and Genesis editor integrity. The Character Stock deployment additionally asserts retirement routes contain no scripts and LGR-1 exists. Legacy Mahluk-specific QA workflows were removed; independent Semesta/NPC asset publication remains active.
