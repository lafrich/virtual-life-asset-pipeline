"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const path=require("node:path"),root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const U=require("../site/emotion-studio/emotion-library.js");
test("Emosi v1 atlas format stays compatible with the manual 64x112 four-view database",()=>{
 const d=JSON.parse(read("site/emotion-studio/catalog.json"));
 assert.equal(U.validateCatalog(d),d);
 assert.ok(d.entries.length>=10);
 assert.ok(d.entries.every(e=>e.frames>=1&&e.frames<=48));
});
test("Old standalone Emotion Studio app is retired and redirects to Emosi.exe",()=>{
 const html=read("site/emotion-studio/index.html");
 assert.match(html,/location\.replace\("https:\/\/lafrich\.github\.io\/virtual-office\/emotion-studio\/"/);
 assert.doesNotMatch(html,/id="token"|studio\.js|SAVE TO GITHUB/);
 assert.ok(!fs.existsSync(path.join(root,"site/emotion-studio/studio.js")));
 assert.ok(!fs.existsSync(path.join(root,"site/emotion-studio/studio.css")));
});
test("Mahluk Hidup 1 bridge loads Emosi.exe local and Drive database, never old published catalog",()=>{
 const js=read("site/emosi-bridge.js"),html=read("site/index.html"),app=read("site/app.js");
 assert.match(js,/emotion-studio-local-v1/);
 assert.match(js,/D\.loadAll\(/);
 assert.doesNotMatch(js,/U\.loadCatalog\(/);
 assert.match(js,/source:"emosi"/);
 assert.match(html,/id="connect-emosi-drive"/);
 assert.match(app,/connectDrive\(/);
});
test("V6B Studio reads native Emosi.exe Google Drive and local records, not GitHub token",()=>{
 const html=read("site/v6b-reset-studio.html");
 assert.match(html,/driveEmotions/);
 assert.match(html,/readLocalEmotions/);
 assert.match(html,/connect-emotion-drive/);
 assert.doesNotMatch(html,/U\.loadCatalog\(/);
 assert.doesNotMatch(html,/id="token"/);
});
test("Shared pixel tooling survives removal of duplicate Emotion Studio UI",()=>{
 const html=read("site/v6b-reset-studio.html");
 assert.match(html,/shared-pixel-editor\.js/);
 assert.match(html,/id="pixelCopySelection"/);
 assert.match(html,/id="pixelGrid"/);
 assert.match(html,/id="pixelUndo"/);
});
