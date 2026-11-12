# PAKAIAN.EXE — Approved LGR wardrobe v2

Updated 2026-11-12. Active Genesis is read from site/media/lgr1/base/index.json (currently official-7). Never hardcode Official 5 or automatically apply outdated wardrobe when Genesis changes.

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
