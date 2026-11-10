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

- Opening Mahluk Hidup shows **SYNC DATABASE** first (or syncs silently if this tab already has a Drive session).
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
