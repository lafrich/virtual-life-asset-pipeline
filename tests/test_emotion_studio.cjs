"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const U=require("../site/emotion-studio/emotion-library.js");
test("GitHub has a single universal catalog with several editable templates",()=>{
 const d=JSON.parse(read("site/emotion-studio/catalog.json"));
 assert.equal(U.validateCatalog(d),d);
 assert.ok(d.entries.length>=10);
 assert.ok(d.entries.some(x=>x.template==="bleh"));
 assert.ok(d.entries.some(x=>x.template==="shy"));
 assert.ok(d.entries.every(x=>x.base==="universal"));
 assert.ok(d.entries.every(x=>x.frames>0&&x.frames<=48));
 assert.ok(!read("site/emotion-studio/studio.js").includes("localStorage"),"Emotion Studio must not save to local browser storage");
});
test("Emotion Studio uses standalone shared pixel editor and publishes GitHub updates",()=>{
 const html=read("site/emotion-studio/index.html"),js=read("site/emotion-studio/studio.js");
 for(const id of ["cards","timeline","name","base","fps","token","connect","save","pixelOverlay","pixelCanvas","pixelApply","pixelSaveDefault","preview"])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/shared-pixel-editor\.js/);
 assert.match(js,/P\.create\(/);
 assert.match(js,/U\.saveEntry\(entry,authToken\)/);
 assert.match(js,/function addFrame\(/);
 assert.match(js,/function removeFrame\(/);
 assert.match(js,/function applyFrame\(/);
 assert.match(js,/beforeunload/);
});
test("Mahluk Hidup 1 reads published and local Emosi faces non-destructively",()=>{
 const bridge=read("site/emosi-bridge.js");
 assert.match(bridge,/emotion-studio-local-v1/);
 assert.match(bridge,/U\.loadCatalog/);
 assert.match(bridge,/source:"emosi"/);
});
test("GitHub integration uses authenticated content API without persisting credentials",()=>{
 const js=read("site/emotion-studio/emotion-library.js");
 assert.match(js,/Authorization/);
 assert.match(js,/method:"PUT"/);
 assert.match(js,/sha:latest\.sha/);
 assert.match(js,/validateCatalog/);
 assert.ok(!/localStorage|sessionStorage/.test(js));
});