/* Regression: legacy Mahluk routes/sync must fail closed, LGR-1 remains live.
 * This test intentionally does not erase old data used by Semesta.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const repo=path.resolve(__dirname,"..");
const read=f=>fs.readFileSync(path.join(repo,f),"utf8");
const legacy=[
  "site/lafrich-puppet-studio.html","site/genesis-editor.html",
  "site/mahluk-action-editor.html","site/mahluk-animation-native.html",
  "site/v6p-studio.html","site/pixel-editor.html"
];
// Retired controllers still read by kept regression tests stay as inert stubs.
const retiredControllers=["site/pixel-editor.js","site/cloud-first-mahluk-entry.js"];
for(const controller of retiredControllers){
 const code=read(controller);
 assert.match(code.slice(0,1100),/LGR-1 PERMANENT RETIREMENT/);
 assert.match(code.slice(0,1100),/return;/);
}
// Retired shipped JS with no remaining references is deleted outright.
const deletedControllers=[
  "site/lafrich-puppet-studio.js","site/mahluk-hub.js","site/mahluk-action-editor.js",
  "site/mahluk-animation-native.js","site/genesis-editor.js","site/genesis-master-rig.js",
  "site/genesis-puppet-renderer.js","site/genesis-pose-clipboard.js","site/genesis-native-worker.js",
  "site/genesis-native-render.py","site/genesis-native-python-contract.js",
  "site/genesis-character-python-preview.js","site/genesis-master-pixels.js","site/mahluk-emosi-chrome.js"
];
for(const f of deletedControllers)
 assert(!fs.existsSync(path.join(repo,f)),"Retired controller resurrected: "+f);
for(const f of fs.readdirSync(path.join(repo,"site")).filter(n=>n.endsWith(".html"))){
 const html=read("site/"+f);
 for(const gone of deletedControllers)
  assert(!html.includes(path.basename(gone)),f+" still loads deleted "+gone);
}
const removedLegacyWorkflows=[
  ".github/workflows/lafrich-puppet-qa.yml",
  ".github/workflows/mahluk-unified-regression.yml",
  ".github/workflows/genesis-native-animation-qa.yml",
  ".github/workflows/genesis-motion-checks.yml",
  ".github/workflows/mahluk-approved-stock-qa.yml",
  ".github/workflows/non-destructive-mahluk-cloud.yml"
];
for(const filename of removedLegacyWorkflows)
 assert(!fs.existsSync(path.join(repo,filename)),"Retired workflow unexpectedly reactivated: "+filename);
assert.match(read("tools/build_mahluk_motion_registry.py"),/Legacy six-part V6B motion packs are retired/);
for(const filename of legacy){
 const html=read(filename);
 assert.match(html,/LEGACY ROUTE INACTIVE/);
 assert.match(html,/genesis-workbench\.html/);
 assert.doesNotMatch(html,/<script\b/i,"Retired route must not run ANY old JS: "+filename);
 assert.doesNotMatch(html,/<iframe\b/i,"Retired route must not embed old apps: "+filename);
}
// Mahluk Hidup (t637u): ☺ Emosi.exe + ✦ Bergerak + ⚔ Beraksi on LGR-1 only;
// the base editor lives on as Genesis Base (genesis-base.html). No V6P runtime.
const shell=read("site/genesis-workbench.html");
for(const lib of ["emosi-bridge","mahluk-hidup-shell","lgr-db","lgr-import","lgr-actor","lgr-wear","lgr-skin","lgr1-raster","lgr1-motion","mahluk-bergerak","mahluk-beraksi"])
 assert.match(shell,new RegExp("\\./"+lib+"\\.js"),"shell must load "+lib);
assert.match(shell,/href="\.\/genesis-base\.html"/);
assert.match(shell,/BERGERAK/);assert.match(shell,/BERAKSI/);
assert.doesNotMatch(shell,/genesis-workbench\.js|v6p-|mahluk-hub|cloud-first|drive-sync/);
for(const f of ["site/lgr-db.js","site/lgr-actor.js","site/lgr-import.js","site/lgr-wear.js","site/mahluk-bergerak.js","site/mahluk-beraksi.js"])
 assert.doesNotMatch(read(f),/V6PCompositor|v6p-compositor|media\/v6p/,"no V6P runtime dependency: "+f);
assert(!fs.existsSync(path.join(repo,"site/genesis-workbench.js")),"Old workshop script came back");
assert.doesNotMatch(read("site/mahluk-hidup-shell.js"),/setItem|createAndWrite|saveMaster|saveDraft/);
const base=read("site/genesis-base.html"),baseApp=read("site/genesis-base-app.js");
for(const lib of ["genesis-cloud","emosi-bridge","lgr1-raster","lgr1-motion","lafrich-puppet-core","lafrich-puppet-renderer","genesis-base-app","genesis-base"])
 assert.match(base,new RegExp("\\./"+lib+"\\.js"));
assert.doesNotMatch(base,/\.\/(?:mahluk-hub|mahluk-hub-drive|cloud-first-mahluk-entry|drive-sync)\.js/);
const live=read("site/mahluk-hidup.html");
assert.match(live,/genesis-workbench\.html/);
const index=read("site/index.html");
assert.match(index,/mahluk-hidup\.html/);
const noWrites={
  setItem(){throw Error("BLOCKED TEST: legacy localStorage write")},getItem(){return null},
  removeItem(){throw Error("BLOCKED TEST: legacy localStorage delete")}
};
const world={localStorage:noWrites};
vm.runInNewContext(read("site/mahluk-hub-drive.js"),{window:world});
assert.strictEqual(world.VLMahlukHubDrive.retired,true);
assert.strictEqual(world.VLMahlukHubDrive.connected(),false);
const publisher={localStorage:noWrites};
vm.runInNewContext(read("site/vlhub-characters-publish.js"),{window:publisher});
assert.throws(()=>publisher.VLHubCharactersPublish.publish({name:"old"}),/RETIRED/);
const cloudWorld={localStorage:noWrites};
vm.runInNewContext(read("site/drive-sync.js"),{window:cloudWorld});
assert.ok(cloudWorld.MembangunCloudDrive,"Shared Semesta Drive adapter remains exported");
assert.match(read("site/v6p-compositor.js"),/const legacyOverride=genesis\?null:/);
const v6pWorld={localStorage:noWrites};
vm.runInNewContext(read("site/v6p-part-overrides.js"),{window:v6pWorld});
assert.throws(()=>v6pWorld.V6PPartOverrides.clear(),/READ-ONLY|read-only/);
vm.runInNewContext(read("site/v6p-character-store.js"),{window:v6pWorld});
assert.throws(()=>v6pWorld.V6PCharacterStore.create({name:"Legacy"}),/READ-ONLY|read-only/);
assert.throws(()=>v6pWorld.V6PCharacterStore.select(""),/retired/);

assert.match(baseApp,/RIG_FORMAT="LGR-1"/);
// Shape-based head/neck re-slice is a manual, confirmed action (never auto-run on drafts).
assert.match(base,/id="reslice-head"/);
assert.match(base,/empty canvas belongs to no part/);
assert.match(baseApp,/if\(!confirm\("RE-SLICE FROM SHAPE/);
assert.match(baseApp,/invalidateReviews\(p\.d,\[\.\.\.new Set\(\[\.\.\.p\.r\.parts/);
assert.match(baseApp,/isLegacyBound/);
assert.match(read("site/genesis-cloud.js"),/Wrong V6B rig base/);
assert(baseApp.includes("vl-lafrich-genesis-base-drafts-v1"));
async function test(){
 await assert.rejects(()=>world.VLMahlukHubDrive.connect(),/RETIRED/);
 await assert.rejects(()=>world.VLMahlukHubDrive.saveRecord("character","mh2_old",{}),/RETIRED/);
 await assert.rejects(()=>world.VLMahlukHubDrive.restore(),/RETIRED/);
 await assert.rejects(()=>publisher.VLHubCharactersPublish.publishAsync({name:"old"}),/RETIRED/);
 await assert.rejects(()=>cloudWorld.MembangunCloudDrive.save("mahluk","v6pPart",{}),/retired/);
 await assert.rejects(()=>cloudWorld.MembangunCloudDrive.saveV6pPart({}),/retired/);
 await assert.rejects(()=>cloudWorld.MembangunCloudDrive.saveV6pUserProject({}),/retired/);
 const isolated={};
 vm.runInNewContext(read("site/genesis-cloud.js"),{window:isolated});
 await assert.rejects(()=>isolated.VLGenesisCloud.save("mh2_old",{}),/canonical LGR-1/);
 await assert.rejects(()=>isolated.VLGenesisCloud.save("lafrich_genesis_male",{
   format:"mahluk-2-character-v1",id:"lafrich_genesis_male"
 }),/Legacy\/foreign/);
 console.log("LGR-1: six retired routes, old local/Drive/VLHub writes blocked, canonical master gate active");
}
test().catch(e=>{console.error(e);process.exitCode=1});
