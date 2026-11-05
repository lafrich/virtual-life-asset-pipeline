"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const html=fs.readFileSync("site/index.html","utf8");
const app=fs.readFileSync("site/app.js","utf8");
const nav=fs.readFileSync("site/animations.js","utf8");
const mod=fs.readFileSync("site/custom-character-wardrobe.js","utf8");
new Function(mod);new Function(app);new Function(nav);
const top=html.indexOf('id="tab-custom-char"');
const inspector=html.indexOf('id="character-workspace"');
const endInspector=html.indexOf('id="custom-workspace"');
assert.ok(top>=0&&top<inspector,"Creator tab belongs to the top navigation");
assert.equal((html.match(/id="tab-custom-char"/g)||[]).length,1);
assert.ok(endInspector>inspector);
assert.ok(!html.slice(inspector,endInspector).includes('id="custom-char-panel"'),
  "The old inspector cannot still own Custom Character");
assert.ok(html.indexOf('id="custom-char-panel"')>endInspector);
for(const id of ["custom-preview","custom-preview-status","custom-preset-status",
 "custom-skin-tone","custom-hair","custom-shirt","custom-pants","custom-shoes",
 "custom-name","custom-save","custom-storage-list"])
 assert.ok(html.includes('id="'+id+'"'),id);
for(const d of ["se","sw","ne","nw"])
 assert.ok(html.includes('data-custom-dir="'+d+'"'),d);
assert.ok(nav.includes('window.VLMahlukNavigation=Object.freeze'));
assert.ok(nav.includes('customPanel.hidden = !custom'));
assert.match(app,/async function saveCustomCharacter\(\)/);
assert.match(app,/VLHumanWardrobe\?\.materializeSelected/);
assert.match(app,/VLHumanWardrobe\?\.createPortrait/);
assert.match(app,/VLHumanWardrobe\?\.populate/);
assert.match(mod,/for\(let i=0;i<4;i\+\+\)/);
assert.match(mod,/frames\[DIRS\[i\]\]=canvas\.toDataURL/);
assert.match(mod,/function createPortrait/);
assert.match(mod,/window|root\.VLHumanWardrobe/);
assert.ok(!mod.includes('setAttribute("src", "https://'));
console.log("PASS new top custom workspace / native Male Female wardrobe / preview / character save and local game sync");
