# v6p frame editor milestones (preview)

Preview-only worktree for the Pixel Editor the user asked to match Emosi, plus accessory layers and an Asset Gallery.

## 1. Select / copy / paste like Emosi

Shipped in `site/pixel-editor.html` + `site/pixel-editor.js`, reusing `site/emotion-studio/shared-pixel-selection.js` (`MH2PixelSelection`) as-is.

| Emosi | v6p editor |
| --- | --- |
| Marquee select | Existing RECT + WAND (kept) |
| Copy / Ctrl+C | COPY, shared clipboard `mh2-rgba-clipboard-v1` |
| Paste as floating movable selection | PASTE switches to MOVE; drag never erases destination (frozen base) |
| Paste flip / Ctrl+Shift+V | PASTE FLIP |
| Cut / Ctrl+X, Select all / Ctrl+A, Delete | CUT, ALL, Delete |
| Paste replace | PASTE REPLACE checkbox |
| Move / flip H+V / undo | Existing MOVE, FLIP, Ctrl+Z (kept) |
| Touch / phone | Existing cursor mode + TAP; paste then MOVE + TAP to drop |
| Copy across views | Clipboard survives frame and direction changes inside a part sheet |

Not copied from the full 64×448 Emosi overlay editor: onion of another bone atlas, 4-view sync paint, Emosi-only swatches. Otis region lock, the 133-part picker, localStorage overrides, Edit di Pixel Editor, and Save ke Drive remain.

## 2. Accessory layers in the same editor

- New transparent user project (384×4928), type `accessory`.
- Placement: `front` (above hair, like glasses) or `back` (behind body, like hair_back).
- Locked character overlay for the current frame/direction, with opacity, show/hide, grid, and pivot (32,100). Overlay is display-only and never stamped into the sheet or export.
- Accessories follow animation only where painted. Copy/paste across frames is the way to duplicate poses. No auto-animation.
- Existing whitelist parts and originals are untouched.
- Studio picker composes the accessory at its z-position.

## 3. Custom clip projects

- Same editor, type `clip`, same sheet grid and copy/paste.
- Painted frames only. Compatibility lists painted Semesta clips vs unpainted (`idle walk talk sit lie sleep`) and sheet-only rows (`sit_type tired swim float perch`).
- This is not the queued character animation library (still on hold).

## 4. Asset Gallery tab

- `ASSET GALLERY` tab on `v6p-studio.html`, modelled on Semesta's Asset Library (search, filter, cards, detail, Open in editor).
- Lists user accessories, custom clips, and edited parts automatically after save (no JSON import).
- Built-in whitelist parts available under the Built-in filter; never overwritten.
- Honest save status: LOCAL ONLY vs SAVED TO DRIVE vs STOCK.
- Clip cards animate painted frames.

## Save paths

- Part edits: existing `vl-v6p-part-overrides-v1` + Drive `v6p--<part>.png` / `kind: v6pPart` (ingested).
- User projects: `vl-v6p-project-catalog-v1` + Drive `v6p-user--<type>__<id>.png` / `kind: v6pUserProject` (not ingested into `media/v6p/`).


## 5. Frame-by-frame clip editor (t361, activity contract v2)

Preview-only. Additive 384×2688 activity sheets + clip manifest (`vl-v6p-act-clips-v1`). The original 384×4928 / 44-row part sheets are not modified.

- Create a named clip (`+ Custom clip` or `?new=clip`).
- Frame strip: add, duplicate, remove, reorder (max 6 columns). Ops apply to every layer sheet plus the manifest.
- Per-frame millisecond timing, 4 directions (se/sw/ne/nw).
- Paint each frame per part/accessory with the same tools, including select/copy/paste across frames.
- Onion-skin of the previous frame (simple, current layer).
- Play / pause / loop preview through the real compositor on Male and Female (nude + mid_curtain appearance so authored pilot parts can play).
- Undo / redo for paint and for timeline structure.
- Save and reopen preserves frames, timing, and layers.
- Export the current layer as a PNG activity sheet.
- Availability: if a worn non-optional part has no authored activity layer, the clip is disabled. No auto-strip.
- Gallery lists clips (pilot + user) with an animated compose preview and “Open in editor”.

### Contract v2 bands (`site/v6p-activity-contract.js`)

Same sheet format as v1: `media/v6p-act`, 384×2688, 6×24, cell 64×112, pivot 32,100.

| start | id | frames | ms | emosi | status |
| --- | --- | --- | --- | --- | --- |
| 0 | squat | 6 | 140 | true | draft_inactive (pixels kept, not a consume target) |
| 4 | pushup | 4 | 160 | false | authored — first real clip |
| 8 | yoga_sphinx_idle | 4 | 500 | true | reserved_transparent |
| 12 | yoga_puppy_idle | 4 | 500 | false | reserved_transparent |
| 16 | hip_shake | 6 | 120 | true | reserved_transparent |
| 20 | yoga_happy_baby_idle | 4 | 450 | false | reserved_transparent |

Inactive / not consume targets: squat (as a live clip), jumping_jack, guard_jab, yoga_warrior, lie_supine.

First wired pilot: Ellen’s pushup art from `/workspace/v6p-act-incoming/` copied to `site/media/v6p-act/`. Compatible preview appearance: nude + mid_curtain or long hair, glasses/facial none, face blank. Default studio tee/trousers/shoes disables the clip honestly.

### Semesta consume-list (additive preview)

Pipeline: `site/vlhub-characters-publish.js` `CLIP_CONSUMED` now includes `pushup|yoga_sphinx_idle|yoga_puppy_idle|hip_shake|yoga_happy_baby_idle`.

Virtual-office isolated preview worktree `/workspace/vo-v6p-act-clips` on branch `preview/v6p-act-clips` (not pushed): the same additive regex in `shared/vlhub-characters-publish.js` and `world-builder/mahluk-hidup-bridge.js`. Do not treat reserved/inactive names as ready until authored.

## Backlog (log only — do not build or allocate)

- `crawl` — floor locomotion clip; not authored.
- `crawl_idle` — floor idle; not authored.
- `horse-riding` — moving animation synced to a mount reference when one exists; not authored.
- Hygiene animations (Ellen t377 / user request), non-graphic, no organs or waste:
  - shower
  - standing urination
  - bathtub soak
  - defecation
  - Poses must later align to real fixtures.
  - Later they will need additive allocation plus fixture anchors and occlusion refs.
  - No auto-strip.
  - Do **not** touch the v2 bands above when this work is eventually scheduled.
