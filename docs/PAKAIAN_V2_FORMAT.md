# PAKAIAN.EXE — Approved LGR wardrobe v2

Updated 2026-11-12. Active Genesis is read from site/media/lgr1/base/index.json (currently official-9). Never hardcode Official 5 or automatically apply outdated wardrobe when Genesis changes.

## Workflow

1. Mahluk Hidup → Pakaian: choose gender, category, variant, and SE/SW/NE/NW, then edit the 64×112 KEY-colour artwork. PNG stock in site/media/lgr1/mh-wear/ is only a reference/edit seed.
2. Preview with LGRActor / LafrichPuppetRenderer / the official motion database; the editor uses the active official Genesis rig.
3. SAVE DRAFT stores an unfinished local browser draft. SAVE MASTER → GAME / DRIVE creates an approved Pakaian v2 record and calls LGRDB.save("pakaian",record,{overwrite:true}).
4. The master becomes available to local game runtime. A Drive-connected save performs a read-back-verified cloud sync. An offline save is pending and must be synced manually for other devices.

## Format

Format: lgr1-pakaian-v2 (schema 2), with id gender_group_variant, gender (male/female), group (top/pants/shoes/hair/glasses/facial), variant, baseVersion, baseRigSha256 (64 hex chars), files, approved true, rev, created, updated, name, optional note.

Files map keyed sprite paths such as top/tee and top/tee_back to PNG data URIs. Each is a 256×112 transparent strip containing SE | SW | NE | NW, four 64×112 cells. Colours remain KEY colours for recolouring by lgr-wear.js. Validator enforces key paths, dimensions, and rig binding metadata.

Drive location: Membangun / Mahluk Hidup / Database / Pakaian / <gender>_<group>_<variant>.json. Saved under lgr1-db-file-v1 wrapper; canonical hash, version, overwrite backups, and conflict handling follow the Bergerak/Beraksi database.

## Retirement / compatibility

- Runtime uses only approved Pakaian v2 masters that match both live Genesis baseVersion and baseRigSha256. No automatic remap of old garments is allowed.
- Old stock tops, pants, shoes, glasses, facial hair are no longer rendered when no new master exists. Source PNG files remain only as editable references/rollback, not gameplay fallback.
- Hair is temporarily exempt: old sprite art is reused because the artist kept the head proportions; approved hair v2 overrides the fallback.
- Bergerak / Beraksi authoring dropdowns filter old outfit presets unless every component has a compatible approved v2 master. New Beraksi characters start with no outfit.
- New approved clothing never mutates Genesis anatomy, its masks/pivots, Emosi, or motion masters.
- The user still must visually inspect the four directions and key animations. A successful schema test does not certify the sprite fit.

Tests: node tests/test_mahluk_pakaian.cjs, node --test tests/test_lgr_pakaian_v2.cjs; existing LGR tests remain mandatory.


## Canonical Genesis wardrobe BASE — approved artist exports 2026-11-13

The six NEW uploads below supersede all earlier references, including the old
misnamed `clana`, `celana`, `tshoes`, and `sepatu` export iterations.
These six files are the authoritative **pixel-level source of truth** for
Genesis Outfit Adjust, Mahluk Hidup (Pakaian, Bergerak, Beraksi), Mainkan
(`LGRGame`), and shared renderer `LGRWear`:

| Canonical ID | Uploaded source | Native key layer(s) |
| --- | --- | --- |
| `male_top_tee` | `LGR_REF_male_top_tee_4view.json` | `top/tee`, `top/tee_back` |
| `female_top_tee` | `LGR_REF_female_top_tee_4view.json` | `top/tee_f`, `top/tee_back_f` |
| `male_pants_trousers` | `LGR_REF_male_pants_trousers_4view.json` | `pants/trousers` |
| `female_pants_trousers` | `LGR_REF_female_pants_trousers_4view.json` | `pants/trousers_f` |
| `male_shoes_shoes` | `LGR_REF_male_shoes_shoes_4view.json` | `shoes/shoes` |
| `female_shoes_shoes` | `LGR_REF_female_shoes_shoes_4view.json` | `shoes/shoes_f` |

All files have `baseVersion: official-9`, immutable gender-specific
`baseRigSha256`, SE/SW/NE/NW views, RGBA `256×112` strips with native
`64×112` cells, and already-correct C (tops), P (pants) or S (shoes)
colour keys. **No colour conversion or change in pixel bytes** is permitted.
The male `top/tee_back` layer is transparent in the uploaded master; keep
it that way. Female rear-limb pixels remain exactly as exported.

**Data flow:** 
1. Immutable artist source JSONs are at
   `site/media/lgr1/wardrobe-artist-reference/<id>.json`, retaining the
   source PNG data URIs and source timestamp.
2. `tools/build_lgr_wardrobe_reference_v2.py` validates four-direction
   bounds, gender rig SHA and native keys; generates `lgr1-pakaian-v2`
   masters at `_site/media/lgr1/wardrobe-approved/<id>.json` and index
   with `artSha256`. The embedded PNG URI is preserved byte-for-byte.
3. `LGRWear.activeStrip` loads these exact six masters. An older
   compatible local/Drive master does **not** hide the canonical updated
   baseline; an explicitly approved **newer** master may override it.
   Other unapproved historic wardrobe variants do not silently revive.
4. `LGRGame` (Mainkan) and `LGRActor` (Mahluk Hidup) use these shared
   `LGRWear` layers; unsupported old outfit styles are temporarily
   rendered as equivalent base garments, not mistaken for approved refits.
5. Genesis Outfit Adjust edits only Male/Female Baju, Celana, Sepatu.
   It preserves a draft newer than source upload and backs up superseded
   old draft versions in localStorage. The user can select Reset Base to
   explicitly reload the new canonical source. Export is draft-only.

**Not included:** Automatically approving/rereleasing cardigan, baggy,
boots or other custom variants; replacing Genesis rig anatomy; certifying
motion visual quality for all animations. Those need separate review before
publishing as real distinct designs.
