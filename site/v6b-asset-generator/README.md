# V6B Asset Generator (standalone browser app)

The deployed app lives at https://lafrich.github.io/virtual-life-asset-pipeline/v6b-asset-generator/ after a successful GitHub Pages run.

It executes original NumPy/Pillow Python source from the user's I1-I6/B4 archived-proposal ZIP using Pyodide WebAssembly in the browser (no Python host, no usage fees). Browser source: index.html, ui-browser.js, browser-worker.js and style.css.

The source archive is losslessly split into 17 binary segments: data/part-00.bin to data/part-16.bin. Concatenate these segments in numeric order to recover V6B_Asset_Generator_Standalone.zip, 3,271,190 bytes, SHA-256 87995580a79f2b47505915c014e166c623e68d48e6e68f142ea702876d56a172. Original ZIP and detailed 244-PNG QA logs are backed up here: https://drive.google.com/file/d/1mDhJL4A8GA2WbcFeCSDvyOHHYQk04WlJ/view .

Supported: 61 I1-I6 furniture types (4 directions), B4 orange bajaj, original palette ramp editing, 4-view preview, PNG/ZIP export, append-only browser-local recipes and regeneration checks. NPC, becak, bentor, and delman are **unavailable** in the generator until authentic dependencies are tested; reference images are never substituted for a render.

Google Drive: existing OAuth public Client ID from Semesta, drive.file permission and official Google GIS popup, create-only new recipe JSON under folder 1iCns4hAiGteyHgS5C9GlpOsaLKDBF3MH, readback verification. Pages origin OAuth user-login is not verified until tested. No token is embedded or shared.

ZIP's semesta-assetObject-STAGING.json is a proposed import record. **Not installed:** Semesta Connect must be tested separately for actual size, pivot, placement, layering, collision. No game, existing asset, original character, rig or animation code was changed.

Validation: Javascript syntax checked; embedded browser-Python dispatch code verified using CPython against actual archived source for chair and orange bajaj (4/4 pixel-identical to review archive each; recipe regeneration hash stable; ZIP staging included). Native browser Pyodide, Google popup, and live Semesta integration were not yet verified.
