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
const retiredControllers=[
  "site/lafrich-puppet-studio.js","site/mahluk-hub.js",
  "site/mahluk-action-editor.js","site/mahluk-animation-native.js",
  "site/genesis-editor.js","site/pixel-editor.js",
  "site/cloud-first-mahluk-entry.js"
];
for(const controller of retiredControllers){
 const code=read(controller);
 assert.match(code.slice(0,1100),/LGR-1 PERMANENT RETIREMENT/);
 assert.match(code.slice(0,1100),/return;/);
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
const shell=read("site/genesis-workbench.html");
assert.match(shell,/\.\/genesis-cloud\.js/);
assert.match(shell,/\.\/genesis-workbench\.js/);
assert.match(shell,/\.\/emosi-bridge\.js/);
assert.doesNotMatch(shell,/\.\/(?:mahluk-hub|mahluk-hub-drive|cloud-first-mahluk-entry|drive-sync)\.js/);
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
assert.match(read("site/genesis-workbench.js"),/RIG_FORMAT="LGR-1"/);
assert.match(read("site/genesis-cloud.js"),/Wrong V6B rig base/);
const storageKeys=["vl-lafrich-genesis-workbench-drafts-v1","vl-lafrich-genesis-approved-masters-v1"];
for(const key of storageKeys)assert(shell.includes("genesis-workbench.js")&&read("site/genesis-workbench.js").includes(key));
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
