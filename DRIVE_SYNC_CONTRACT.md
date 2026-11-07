# Drive sync contract — v6p part sheets

Automated ingest for pixel-editor / v6p-studio **Save ke Drive**.
OAuth uses the shared Membangun Web Client ID
`369223065433-idbuhhj6akuf2cmo6vpbiblkhu019csn` with `drive.file` scope.
Tokens are never persisted in the browser.

## Folder

`My Drive / Membangun / Mahluk Hidup / Pixel Edits/`

Created on first save (`ensureFolder` from `site/drive-sync.js`).

## One file per edited part

| Field | Rule |
| --- | --- |
| Name | `v6p--<part path with '/' replaced by '__'>.png` |
| Examples | `v6p--top__nude.png`, `v6p--face__f_blank.png`, `v6p--top__nude_back.png` |
| Pixels | Exactly **384×4928** RGBA (frame 64×112, 6 columns, 44 direction-rows) |
| Re-save | Overwrite the same Drive file name (newest wins) |

Optional sidecar next to the PNG:

`v6p--<part with __>.pixel-edits.json`

(the portable PIXEL EDITS.JSON for that part). Useful for re-opening edits; the PNG is authoritative for the game.

## `appProperties` (all string values)

```
app:     mahluk
kind:    v6pPart
part:    top/nude          # original path under site/media/v6p/, no .png
width:   384
height:  4928
sha256:  <64 lowercase hex of the PNG bytes>
```

Only **whitelisted** parts are allowed: a path that already exists as
`site/media/v6p/<part>.png` (see `site/v6p-part-catalog.js`). Reject anything else,
including `../` or new filenames.

## Scheduled job

1. List files in that Drive folder (name starts with `v6p--` and ends with `.png`).
2. Download each PNG plus its Drive metadata (`appProperties`) as a sibling
   `<filename>.meta.json`, for example:
   ```
   inbox/v6p--top__nude.png
   inbox/v6p--top__nude.png.meta.json   # { "name": "...", "appProperties": { ... } }
   ```
3. Run:

   ```
   node tools/sync-v6p-from-drive.mjs inbox/
   ```

   The script checks whitelist, 384×4928, `sha256`, and non-empty alpha.
   It copies into `site/media/v6p/<part>.png`, writing a `.bak-<timestamp>`
   beside the previous file, and prints the changed paths.

4. Commit and push those media files so GitHub Pages / Semesta picks them up.

Do not push Ichsan baked sheets (`ichsan.json`, `ichsan_v6b_sheet.png`) from this job.
