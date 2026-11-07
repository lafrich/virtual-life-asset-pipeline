"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const path=require("node:path"),root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const U=require("../site/emotion-studio/emotion-library.js");
test("Archived starter catalog stays valid but is not the live selectable library",()=>{
 const archive="site/emotion-studio/archive/universal-starter-templates.catalog.json";
 const d=JSON.parse(read(archive));
 assert.equal(U.validateCatalog(d),d);
 assert.equal(d.entries.length,12);
 assert.ok(d.entries.every(e=>e.frames>=1&&e.frames<=48));
 assert.ok(fs.existsSync(path.join(root,"site/emotion-studio/catalog.json")));
 assert.equal(JSON.parse(read("site/emotion-studio/catalog.json")).format,"mahluk-2-universal-emotions-v1");
 assert.ok(!read("site/emosi-bridge.js").includes("emotion-studio/catalog.json"));
 const ids=d.entries.map(e=>e.id);
 assert.deepEqual(ids,[
  "universal-neutral","universal-happy","universal-angry","universal-sad",
  "universal-surprised","universal-shy","universal-cheeky","universal-bleh",
  "universal-wink","universal-sleepy","universal-cry","universal-grimace"
 ]);
});
test("Old standalone Emotion Studio app is retired and redirects to Emosi.exe",()=>{
 const html=read("site/emotion-studio/index.html");
 assert.match(html,/location\.replace\("https:\/\/lafrich\.github\.io\/virtual-office\/emotion-studio\/"/);
 assert.doesNotMatch(html,/id="token"|studio\.js|SAVE TO GITHUB/);
 assert.ok(!fs.existsSync(path.join(root,"site/emotion-studio/studio.js")));
 assert.ok(!fs.existsSync(path.join(root,"site/emotion-studio/studio.css")));
});
test("Mahluk Hidup bridge loads Emosi.exe local and Drive database, never old published catalog",()=>{
 const js=read("site/emosi-bridge.js");
 const studio=read("site/v6p-studio.html");
 assert.match(js,/emotion-studio-local-v1/);
 assert.match(js,/D\.loadAll\(/);
 assert.doesNotMatch(js,/U\.loadCatalog\(/);
 assert.match(js,/source:"emosi"/);
 assert.match(studio,/emosi-bridge\.js/);
 assert.doesNotMatch(studio,/v6b-reset-studio\.html/);
});
