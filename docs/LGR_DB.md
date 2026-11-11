# LGR database — cloud storage for Bergerak + Beraksi (`site/lgr-db.js`, `lgr-db-1`)

One shared loader for Mahluk Hidup and the game apps (Mainkan, Semesta, Bangun Ruang). All apps live on
`https://lafrich.github.io/` (same origin), so they share the same browser cache and Google login client.

## Drive layout (Google Drive, `drive.file` scope — only files these apps created are visible)

```
Membangun/
  Mahluk Hidup/
    Database/
      Bergerak/<id>.json     one animation   (lgr1-bergerak-v1, docs/BERGERAK_FORMAT.md)
      Beraksi/<id>.json      one scene       (lgr1-beraksi-v1,  docs/BERAKSI_FORMAT.md)
      Backup/<kind>.<id>.<time>.<why>.json   why = overwritten | drive-older | local-older | deleted
```

Each file: `{"schema":"lgr1-db-file-v1","app":"lgr-db-1","kind":"bergerak|beraksi","id":…,"sha256":…,"entry":{…}}`
where `sha256` = SHA-256 of the canonical (sorted-key) JSON of `entry`. Drive `appProperties`
(`lgrKind lgrId lgrRev lgrUpdated lgrSha`) let a sync skip unchanged files. Other Drive files and folders
(Genesis Base, Genesis Masters, Emosi, masters) are never read or written.

## Sync rules

- Opening Mahluk Hidup shows **SYNC DATABASE** first (or syncs silently **once** if this tab already has a Drive session).
  ↻ SYNC runs **one** sync. A save schedules **at most one** debounced flush (overlapping saves share it). Coming back
  online only flushes unsynced local edits — it does not start a full refresh, and a failed sync is never auto-retried.
  An already-running sync is reused (including across tabs: the other tab waits and reads the shared cache).
  "Lanjut offline" uses the local cache; the status bar shows `☁ DATABASE TERSINKRON hh.mm` / pending count.
- Local cache: `localStorage["lgr1-db-cache-v1"]` (works offline; saves made offline are pushed on the next sync).
- Per id: unchanged → nothing; only one side changed → that side wins; **both changed → newest `updated` wins and the
  other version is written to `Backup/` first**. Every write is read back and checksum-verified.
- Delete = the Drive file is **moved** to `Backup/` (`…deleted.json`), never destroyed.
- A confirmed overwrite (e.g. IMPORT with an existing name) writes the replaced version to `Backup/` (`…overwritten.json`).
- Strict: every entry is validated on save and again when pulled from Drive; an invalid or tampered file is skipped
  (reported in the sync result) and never enters the cache.

## Game runtime API (no repo commit or deploy needed for new animations / scenes)

```html
<script src="https://lafrich.github.io/virtual-life-asset-pipeline/lgr1-motion.js"></script>
<script src="https://lafrich.github.io/virtual-life-asset-pipeline/lgr-db.js"></script>
<script>LGRDB_BASE="https://lafrich.github.io/virtual-life-asset-pipeline/"</script>
```

| call | what |
|---|---|
| `await LGRDB.ready({sync:true})` | loads built-in `media/lgr1/motions.json`; syncs if a Drive session exists |
| `await LGRDB.connect()` then `await LGRDB.sync()` | Google login (button click) + sync |
| `LGRDB.motion("ogah_flag")` / `LGRDB.motion("builtin:walk")` | validated, playable motion or `null` |
| `LGRDB.scene("ngobrol_warung")` | a Beraksi scene or `null` |
| `LGRDB.all("bergerak" \| "beraksi")` | all entries |
| `LGRDB.trackAt`, `LGRDB.emosiAt`, `LGRDB.drawOrder`, `LGRDB.sceneDuration` | scene playback helpers |
| `LGRDB.onStatus(cb)` / `LGRDB.onChange(cb)` | sync status · cache changed by another tab (e.g. Mahluk Hidup saved) |
| `LGRDB.state`, `LGRDB.pending()` | status / unsynced count |

Drawing a character: `site/lgr-actor.js` (`LGRActor.frameCanvas(actor, {motion, frame, dir, faceId, faceMs})`), needs
`lafrich-puppet-core.js`, `lgr1-raster.js`, `lafrich-puppet-renderer.js`, `lgr-skin.js`, `lgr-wear.js`, and for faces
`emotion-studio/emotion-library.js` + `emosi-bridge.js`. Feet anchor (32, 101) of the 64×112 cell.

Required game motions: `media/lgr1/needed-motions.json` (`lgr1-needed-motions-v1`): the Bergerak checklist marks each id as
built-in / in database / placeholder / missing. The game references them as `builtin:<id>` or `bergerak:<id>`
(`LGRDB.motion("sit")` = `bergerak:sit` from the database; pass `"builtin:sit"` for the built-in library).

Tests: `node --test tests/test_lgr_db.cjs` (schema, sync, conflicts, backups, offline, import).

## Game runtime (`site/lgr-game.js`, `lgr-game-2`)

Used by virtual-office `shared/genesis-player.js` (Mainkan test play, Semesta, Bangun Ruang). Thin adapter over
`LGRActor` + `LGRWear` + `LGRDB`; no V6P runtime. `LGRGame.frame(profile, dir, action, seconds, emosiAtlas, column)`
returns a 64×112 canvas (or `null` while loading). Motion lookup for a game action id:

1. cloud DB `bergerak:<id>` (whatever Lafrich saved in Mahluk Hidup → Bergerak, via the shared `lgr1-db-cache-v1` cache / Drive sync)
2. built-in `builtin:<id>` (`media/lgr1/motions.json`: idle, walk, wave, crouch, arms_up, bow, sit, lie_sleep, talk)
3. stand-in built-in from `LGRGame.STAND_INS` (marked `standIn:true` in `LGRGame.actionTable()`)
   A stand-in may be an ordered array (explicit chain, each step DB → built-in, no further hops), e.g. `tired: ["tired_walk","idle"]`.

Legacy game actions alias onto the needed ids (`sleep→lie_sleep`, `toilet→wc_squat`, `pee→pee_stand`, `bathe→mandi`, …).
Glasses / facial hair use the `mh-wear/glasses` and `mh-wear/facial` strips (accessory layer).

## Wear (`media/lgr1/mh-wear`, single wear directory)

`tools/bake_lgr_wear.py` bakes the stock garments once. Tops, pants and shoes get the approved outfit-refit warp onto the
official LGR-1 base (old V6B body silhouette in `tools/data/v6b-silhouette.json`); hair, facial hair and glasses are
copied unchanged. `index.json → meta` lists each strip's sha256 and moved pixels.

## Live face previews and directional actions

Beraksi refreshes authored Emosi when its tab is reopened. The face bridge can
reuse the canonical editor iframe's public EmotionDrive adapter only on the same
origin; it does not copy or persist its token. Changed face atlases invalidate
image and prepared-actor caches even when the face ID remains unchanged.
Mainkan's published `emosi-source.js` remains an explicit release snapshot;
refreshing a preview does not promote user artwork into approved game stock.

Bed-left/right action aliases apply their resolved SE/SW orientation consistently
to preparation, poses, and cached frames. Ordinary action directions are unchanged.
