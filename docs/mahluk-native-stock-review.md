# Mahluk Hidup: stock activity database (native V6P review)

This is the **replacement for the earlier drawn-from-scratch preview**. It reads the actual Mahluk Hidup V6P 384×4928 part images used by Idle and Walk, plus the existing authored Push-up activity band. Each frame is baked pixel-by-pixel to the existing 384×2688 activity sheet format.

## Current branch state
- **Idle/Walk/other 44-row stock:** entirely untouched; not overwritten.
- **Push-up:** authored stock preserved; the first 8 rows of EVERY affected 384×2688 part sheet are pixel-identical to the previous source.
- **Sphinx/Puppy/Hip Shake/Happy Baby:** four authored *review candidates* in rows 8..23 with the original body, hair and face palette-keys (no synthetic mannequin). Not approved and not currently playable.
- **Clip Store:** all five canonical activity IDs are discoverable as `[STOCK]` or `[STOCK DRAFT]`; the four review candidates are gated by `isPlayable()`. Game/Semesta must not consume review candidates yet.
- **No rig:** every frame is a real raster 64×112 sprite; no runtime bones or interpolated transforms.
- **Limits:** only the 18 existing native Push-up pilot layers are generated at present, covering the Male/Female faceless nude base and two supported hairstyles. More clothes and accessories need authored layers before the animation can be applied to arbitrary dressed characters. A missing part disables the clip without stripping the outfit.
- **Visual limits:** Happy Baby bends the legs upward but the hands do not yet grip the feet. Sphinx pose remains approximate. This is why the four remain in review and not enabled by changing the contract to `authored`.

## Rebuild and QA
From repository root:
```bash
python -m pip install Pillow numpy
python tools/build_native_mahluk_stock.py --out build/native-mahluk-stock-review
python tools/preview_native_mahluk_stock.py
node tests/test_v6p_clip_store.cjs
node tests/test_v6p_activity_contract.cjs
```
The branch's native-review GitHub Action builds, checks, packages, and stages the candidate activity sheet pixels under `site/media/v6p-act` **only on the preview branch**, then updates the associated readiness/hash records. This is not a Pages deployment.

## Next approval gate
After the owner reviews and approves the pose design, make a separate integration change:
1. Correct any pose anatomy / overlay offsets per view.
2. Verify all native layers are populated for chosen appearance(s), and all four directions / frame timings remain anchored.
3. Switch each verified action status from `review_artwork` to `authored` in the contract and READINESS together.
4. Run compositor, clip-store, and Semesta consume tests before any production deployment.

Do not merge / deploy this draft as a live animation without explicit approval.
