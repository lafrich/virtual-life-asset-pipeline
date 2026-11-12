# LGR Nova — candidate V1 (review only)

Owner request: redraw an original LGR body for Mahluk Hidup and author game-style
procedural motion with improved weight, leg overlap, and four-direction coherence.

## Deliverables produced on 2026-11-12

The review bundle, `LGR-Nova-Review.zip`, was generated in the conversation as
two `lafrich-genesis-base-v1` candidate JSON packages (male/female), eight
64×112 1× source images, exact 64×112 part-index masks, four candidate
`lgr1-motion-v1` clips, six diagnostic GIFs and the Python/Pillow generator.

The ZIP lives as a user-downloadable conversation attachment. **It is not in
this Git branch**; do not interpret the branch as a complete asset import.

Use the standalone `site/lgr-nova-lab.html` review page once served by a
local site or a preview deployment:

1. Choose `candidates/lgr-nova-male.json` or `lgr-nova-female.json`
   from the downloaded ZIP.
2. Optionally choose `candidates/lgr-nova-motions.json`.
3. Switch all four directions and inspect each motion and skin tone.
4. Compare against the current official master. The page uses
   `LGR1Motion`, `LafrichPuppetRenderer` and `LGR1Raster`.
5. Import into Genesis Base only for manual editor testing; do not approve,
   save over official or publish until the owner accepts the redraw.

## Format and safety

- 64×112 source PNG, foot/game pivot (32,100), 11 bone pieces.
- Four views SE/SW/NE/NW; front/back drawn separately, reflected to opposite angles.
- No AI image generation; native 1× Python/Pillow pixel drawing, nearest-neighbor
  scaling only for diagnostics.
- Canonical V6P/LGR skin key palette, no additional RGB game-art colours.
- Faces left blank for Emosi.exe; outfits not baked.
- Official `site/media/lgr1/base/index.json`, male official-3 and female
  official-4 remain **untouched**. No Drive writes.
- Experimental motion IDs `nova_idle`, `nova_walk`, `nova_run`,
  `nova_wave` are separate from the built-in shared animation library.

## QA already completed

- Both candidate packages created, both 4-view masks decode to 64×112 bytes.
- Every visible source pixel has an owned part and there are zero assignments
  in transparent source regions.
- All opaque art pixels belong to the canonical skin key colours.
- Six diagnostic animated GIFs built and human-inspected from a local
  Pillow cutout renderer.

## QA still required before game readiness

- Load each candidate package into the real LGR core and confirm checksum validation.
- Inspect seams on walk/run extreme key poses using **native LGR1Raster**
  (Pillow diagnostic GIF is **not** native parity evidence).
- Check baseline facing anatomical near/far part mappings on every direction.
- Test Emosi face alignment, clothing strips, hair, and small-scale legibility.
- Run existing Genesis/base tests and visual regression tests.
- Obtain owner approval; only then prepare an independent catalog revision.

**Current review status:** unapproved experimental, no live deployment.

## 2026-11-12 follow-up: strict no-redraw stress test (LGR Nova V2)

The owner ruled out **all action-specific painting**. The new V2 candidate
rebuilds slimmer **static master art once** (per gender/per view), then uses
those unchanged PNG layers, masks, slice ownership and pivots for every motion.

In the separate conversation ZIP `LGR-Nova-V2-No-Redraw-Stress-Test.zip`:

- Male/Female `lafrich-genesis-base-v1` candidates; four 64×112 views.
- Six `lgr1-motion-v1` actions: idle, walk, sit-chair, sit-floor (legs
  forward), sleep and both-hands-up. Every pose is numerical transforms only.
- 4-view mask and source RGB audit, plus expanded 160×112 diagnostic GIFs.
- Chair, floor sit and raise-hands final poses have **zero** opaque pixels
  outside the original 64px-wide viewport in the Pillow diagnostic.
- Lying pose loses about one-quarter of visible pixels if cropped to the
  original 64px viewport. The **experiment-only**
  `site/lgr-nova-wide-render.js` explores stitching translations of the
  SAME pose into a wider frame; it does not change base pixels.
- `tests/test_lgr_nova_wide.cjs` covers pure tiling and immutability math.

**Do not merge as production-ready.** The Pillow diagnostic is not the native
LGR1Raster implementation. JS/Python pixel parity, native browser joint seams,
Emosi/wardrobe fitting, memory/performance and floor collision have not been
verified. A rigid 11-part cutout cannot guarantee all possible animations
without better IK, foot/hand articulations and procedural deformation. **No
per-action redraw is required to pursue those engine upgrades.**
