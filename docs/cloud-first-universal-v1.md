# Cloud-first + Universal File v1 — implementation contract

Status: **FOUNDATION ONLY, not enabled on production pages**. Existing browser saves/Drive UIs remain unchanged until application adapters and real-device tests pass.

## Non-negotiable rules
1. The same Windows-98-style startup entry is used by Mahluk/Emosi/Animation/Action, Semesta, Bangun Ruang, Jiwa, Mainkan and any other builder app.
2. At start, editor is locked until (A) CONNECT GOOGLE DRIVE AND SYNC, or (B) IMPORT UNIVERSAL FILE, CONNECT GOOGLE DRIVE, UPLOAD and **VERIFY READBACK**. Import never becomes a usable local-only project.
3. The Drive copy is authoritative. Working edits can exist only in RAM while the tab is open. Browser localStorage, sessionStorage or IndexedDB must NOT be the durable source.
4. Cloud save is debounced and serialized; report SAVING / SAVED TO DRIVE / OFFLINE-UNSAVED / CONFLICT. Do not claim saved before readback verifies bytes/digest.
5. Before destructive cleanup, take an exact snapshot of candidate app-owned browser keys and their corresponding data records. Clear **only** those keys with successful upload/readback receipts for the same data hash, and only when their value has not changed since snapshot. Do not call localStorage.clear(), indexedDB.deleteDatabase() or remove unrelated app credentials/settings.
6. Any offline edits, interrupted uploads, stale Drive versions, unsupported legacy format, empty cloud result, or failed checksum BLOCKS cleanup. Leave the draft accessible for recovery. Never silently overwrite a newer version.
7. Universal export is a manually downloaded `membangun-universal-v1` JSON containing typed `{app,kind,id,data,sha256}` records and an envelope checksum; upload on manual import happens BEFORE editor hydration. Keep compatibility importers for old app-native files.
8. Google OAuth tokens are memory-only and requested by user action. `drive.file` scope limits available content to user-chosen/app-created files, so a different account or historical Drive backups may not be visible.
9. Cloud save is separate from GitHub publication; saving edited sprites must not silently change approved asset stock in the game.
10. When closing/navigating with pending changes, block in-app navigation and show an unsaved warning; Android/browser forced termination cannot be intercepted reliably, therefore autosave must be frequent.

## Required app migrations
| App | Existing storage dependency | New adapter requirement |
| --- | --- | --- |
| Mahluk Character | v6p store, published archive, local draft keys + Online Database | Upload/load every character and character-local pixel part; migrate old drafts before cleanup |
| Emosi | emotion IndexedDB, local drafts, own Drive JSON+atlas | Import/export face atlases, convo mouth guides, IDs and order; load on startup; no local persistence |
| Mahluk Action/Animation | action situation draft keys, V6P clip store, online records | Save full scene, references and all painted frames; resolve cross-reference IDs |
| Semesta | city-drafts IndexedDB + local fallback, Drive city/asset catalog | Ensure city, objects, asset mappings, HUD, terrain and building links survive a new session |
| Bangun Ruang | local saved buildings and object pixel art, mixed Drive assets | Save building and interior, asset variants, pivots, action adjustments and source links |
| Jiwa | IndexedDB project storage/local fallback + global activity Drive | Save each city ruleset, economy, interactions, entity links and catalog |
| Mainkan | login/character/flow data and imported flow editor | Separate gameplay user credentials from editable cloud data; persist startup flow and save slots |
| V6B Pipeline | static approved sprites, draft editor state and Drive edits | Preserve approved stock; Drive-backed user edits only until explicit GitHub publish |

## Adapter interface
`MembangunUniversal.pack(records, sourceApp)` creates the downloadable universal file. `unpack(json)` verifies file and every record.

`syncImported(json,{upload,readback,apply})`: upload each record to Drive, require a verified upload receipt, fetch it back and compare its exact SHA-256, then and ONLY then invoke `apply()`. If any record fails, nothing is applied to editor state. The Drive may contain already uploaded earlier records; retries should be idempotent.

`cleanupSynced(storage, items, receipts)` implements narrow last-mile cleanup for localStorage keys. It never enumerates or deletes unknown keys. IndexedDB cleanup requires an equivalent explicit per-record adapter with separate tests, not a blanket database deletion.

## Quality gate before enabling
- Node unit tests: intact roundtrip, corruption rejection, readback failure, no early apply, unchanged-only cleanup, unverified cleanup blocked.
- Test on Android Fold and desktop Chrome with two real Google accounts.
- Test OAuth cancellation, access-token expiry, offline, 429/503, 25 MB files, multi-device conflict, and no pre-existing online records.
- Test import/export of actual samples from *every* editor; closing/reopening from a clean browser must give pixel-exact artwork and identical game/scene metadata.
- Verify all old data is present and checksummed in Drive; only then run one-time per-app cleanup.
- Remove old BACKUP / RESTORE controls only after the full new flow passes. Do not delete data just because a splash screen renders.

## Repository rollout safety
This branch implements the pure transport/verification core and tests. It does NOT activate startup gating, legacy migration, removal of old buttons, or data cleanup in production. No user data is modified by merging this core alone.
