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
// docs exist
assert.match(read("docs/GENESIS_BASE_FORMAT.md"),/lafrich-genesis-base-v1/);
console.log("genesis base contract ok");
