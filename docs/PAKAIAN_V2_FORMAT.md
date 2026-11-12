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


## Lafrich's six artist-approved fitting references (2026-11-13)

**The uploaded filenames are authoritative for the category** even though the
old Pixel Editor mistakenly exported all six JSON files as `group: top`,
`variant: tee` with `top/tee` artwork. A filename containing `celana` /
`clana` is pants; `sepatu` / `tshoes` is shoes. Those are real pixel artworks
drawn in the correct anatomical positions, not more shirt iterations.

| Uploaded category | Male reference | Female reference | Pakaian v2 ID / sprite path |
| --- | --- | --- | --- |
| Top | `LGR_REF_male_top_tee_4view.json` | `LGR_REF_female_top_tee_4view.json` | `male_top_tee` / `top/tee`; `female_top_tee` / `top/tee_f` |
| Pants | `LGR_REF_male_clana_4view (1).json` | `LGR_REF_female_celana_4view (1).json` | `male_pants_trousers` / `pants/trousers`; `female_pants_trousers` / `pants/trousers_f` |
| Shoes | `LGR_REF_male_tshoes (1).json` | `LGR_REF_female_sepatu_4view (1).json` | `male_shoes_shoes` / `shoes/shoes`; `female_shoes_shoes` / `shoes/shoes_f` |

Immutable artist source records (including all four directions) live at
`site/media/lgr1/wardrobe-artist-reference/<gender>_<group>_<variant>.json`.
`tools/build_lgr_wardrobe_reference_v2.py` promotes them to validated v2
published defaults at `_site/media/lgr1/wardrobe-approved/`.

The only pixel edit performed by that builder is a **colour-key conversion**:
C1–C5 → P1–P4 for pants, or C1–C5 → S0–S3 for shoes. No pixel position,
alpha, front silhouette, direction, size, or scale may change. The vestigial
`top/tee_back_f` in female pants/shoes source exports is **not** shoe/pants
artwork and must not be imported into that category.

**Runtime precedence:** a compatible Drive/local `lgr1-pakaian-v2` master
wins; otherwise only the six published approved artist-reference masters are
loaded for their exact IDs, if baseVersion and baseRigSha256 match active
Genesis. Other V6P stock outfits do not come back automatically. Existing
official Male-8 / Female-9 Genesis art/masks/pivots are never changed.

**Import compatibility:** the separate Wardrobe Fit workbench recognizes
`LGR_REF_*celana*`, `*clana*`, `*sepatu*` or `*tshoes*` filenames and
converts their original exported `top/tee` layer into proper pants/shoes
drafts with P/S colour keys. Import is not an automatic master overwrite.

Artwork baselines are user-authored references; gameplay motion-geometry
inspection remains separate and must be completed for Walk/Bow/Sit/Arms Up
before declaring every garment variant finished.
