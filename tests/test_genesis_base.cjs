// Genesis Base app (site/genesis-base.html): self-contained editor + package contract.
const assert=require("assert"),fs=require("fs"),path=require("path");
const read=f=>fs.readFileSync(path.join(__dirname,"..",f),"utf8");
const html=read("site/genesis-base.html"),app=read("site/genesis-base-app.js"),pkg=read("site/genesis-base.js"),cloud=read("site/genesis-cloud.js");
// own copy of the editor code, always in base mode
assert.match(html,/<script src="\.\/genesis-base-app\.js\?v=/);
assert.match(html,/<script src="\.\/genesis-base\.js\?v=/);
assert(!/genesis-workbench\.js/.test(html),"Genesis Base must not load the Mahluk Hidup workshop script");
assert.match(app,/const BASE_MODE=true;/);
assert.match(app,/"vl-lafrich-genesis-base-drafts-v1"/);
assert.match(html,/Genesis Base by Lafrich/);
// every element id the scripts touch exists in the page
const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
for(const src of [app,pkg])for(const m of src.matchAll(/\$\("([A-Za-z0-9_-]+)"\)/g))assert(ids.has(m[1]),"genesis-base.html missing #"+m[1]);
for(const d of ["se","sw","ne","nw"])assert(ids.has("rig-motion-"+d));
// only steps 01 + 02 are visible
for(const st of ["bind","test","motion","save"])assert.match(html,new RegExp('<button hidden data-step="'+st+'"'));
assert.match(html,/<button data-step="pixel"/);assert.match(html,/<button data-step="rig"/);
// package + Drive: own folder, append-only, read-back verified
assert.match(pkg,/FORMAT="lafrich-genesis-base-v1"/);
assert.match(cloud,/BASE_DIR=\["Membangun","Mahluk Hidup","Genesis Base"\]/);
const save=cloud.slice(cloud.indexOf("async function saveBase"),cloud.indexOf("async function listBases"));
assert.match(save,/createAndWrite\(folderId,name,raw\)/);
assert(!/PATCH|uploadType=media&|files\/"\+.*\?uploadType/.test(save),"saveBase must only create new files");
assert.match(save,/read-back mismatch/);
assert.match(cloud,/saveBase,listBases,loadBase/);
// t620u: changing part keeps 01 PIXEL EDITOR open and opens the layer holding the part
assert.match(app,/if\(step!=="rig"&&step!=="pixel"\)switchStep\("rig"\)/);
assert.match(app,/selected=part;syncControls\(\);void renderAll\(\);void autoLayer\(true\);/);
assert.match(app,/async function partLayerCounts/);
assert(!/SAVE MASTER to sync Drive/.test(html),"stale editor hint");
assert.match(html,/then ☁ SAVE BASE TO DRIVE/);
// t622u: preview redraws on pivot drag / joint / order changes, marks the pivot
assert.match(app,/syncControls\(\);refreshRigMotionNow\(\);/);
assert.match(app,/flushCache\(\);persistDraft\(\);refreshRigMotionNow\(\);/);
assert.match(app,/if\(rigMotion\.busy\)\{if\(force\)rigMotion\.again=true;return\}/);
assert(ids.has("rig-motion-note"));
// t624u: paste into any view (Emosi parity) + auto-slice on APPLY
const editor=read("site/emotion-studio/shared-pixel-editor.js");
assert(!/PASTE ONLY IN CURRENT VIEW/.test(editor),"paste must work across views like Emosi.exe");
assert(ids.has("pixel-auto-slice"));
assert.match(app,/const auto=\$\("pixel-auto-slice"\)\?\.checked!==false;/);
assert.match(app,/if\(lock&&lock\[k\]&&mask\[k\]!==255\)keptLocked\+\+/);
// t625u/t626u: skin key ramp = old V6P customizer keys + tones
const SKN=require(path.join(__dirname,"..","site","lgr-skin.js")),comp=read("site/v6p-compositor.js");
const VP=JSON.parse(comp.match(/^const P=(\{.*\});$/m)[1]),VK=JSON.parse(comp.match(/^const K=(\{.*\});$/m)[1]);
assert.deepStrictEqual([...SKN.TONE_ORDER],Object.keys(VP.skin));
for(const t of SKN.TONE_ORDER)for(const k of SKN.ORDER)assert.strictEqual(SKN.TONES[t][k],VP.skin[t][k].toUpperCase(),t+"/"+k);
for(const k of SKN.ORDER)assert.strictEqual(SKN.KEYS[k],VK["K"+k]);
const px=new Uint8ClampedArray([0xF1,0xD3,0xB5,255, 0x8A,0x5A,0x3C,255, 0xE1,0x8A,0x84,255, 1,2,3,0]);
assert.strictEqual(SKN.toKey(px),2);assert.deepStrictEqual([...px.slice(0,3)],[0xFF,0x2C,0xE8]);
assert.strictEqual(SKN.fromKey(px,SKN.TONES.deep),2);assert.deepStrictEqual([...px.slice(4,7)],[0x3A,0x1C,0x0E]);
assert.strictEqual(SKN.offRamp(new Uint8ClampedArray([0xE1,0x8A,0x84,255])).count,1);
assert.match(html,/\.\/lgr-skin\.js\?v=/);
for(const id of ["gb-skin-tones","gb-skin-custom","gb-skin-info"])assert(ids.has(id));
assert.match(read("docs/GENESIS_BASE_FORMAT.md"),/v6p-key-ramp-v1/);
// docs exist
assert.match(read("docs/GENESIS_BASE_FORMAT.md"),/lafrich-genesis-base-v1/);
console.log("genesis base contract ok");
