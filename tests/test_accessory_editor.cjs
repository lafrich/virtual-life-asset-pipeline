"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const site=path.join(__dirname,"../site");
const read=p=>fs.readFileSync(path.join(site,p),"utf8");
const index=read("index.html"),app=read("app.js"),html=read("accessory-editor.html");
const editor=read("accessory-editor.js"),css=read("accessory-editor.css");
new Function(app);new Function(editor);
assert.match(index,/id="tab-accessories"/,"AKSESORIS must be on original character inspector");
assert.match(index,/id="accessories-panel"/,"AKSESORIS tab content must exist");
assert.match(index,/id="make-helmet"/);
assert.match(index,/id="make-bag"/);
assert.match(app,/function openAccessoryEditor\(category\)/);
assert.match(app,/accessory-editor\.html/);
assert.match(app,/function refreshAccessoryEquipment\(\)/);
assert.match(app,/function drawEquippedAccessory\(/);
assert.match(app,/drawEquippedAccessory\(x,y,z,d\)/);
assert.match(app,/VirtualLifeAccessoryRefresh/);
for(const category of ["helmet","bag"])
 assert.match(editor,new RegExp(''+category+':\\[[0-9,]+\\]'),
  "Category must have bounded painting area: "+category);
for(const direction of ["se","sw","ne","nw"])
 assert.ok(html.includes('data-acc-dir="'+direction+'"'),"Missing "+direction+" layer");
for(const id of ["acc-canvas","acc-palette","acc-save","acc-equip","acc-helmet","acc-bag",
 "acc-preview","acc-guide-alpha","acc-list","acc-export","acc-undo","acc-redo",
 "acc-cursor","acc-apply","acc-pan","acc-flip-h","acc-flip-v"])
 assert.ok(html.includes('id="'+id+'"'),"Missing accessory authoring control "+id);
for(const t of ["pencil","erase","pick","fill","rect","wand","move"])
 assert.ok(html.includes('data-acc-tool="'+t+'"'),"Missing pixel-editing tool "+t);
for(const t of ["replace","add","subtract"])
 assert.ok(html.includes('data-acc-mode="'+t+'"'),"Missing selection mode "+t);
assert.match(editor,/theodore-accessory-fitting-guide\.png/,"Original Theodore fitting guide is required");
assert.match(editor,/drawImage\(guide/,"Guide should be drawn on preview below overlay");
assert.match(editor,/toDataURL\("image\/png"\)/,"Storage export must be PNG from separate canvas layers");
assert.match(editor,/const STORE="virtual-life-accessories-v1"/);
assert.match(editor,/const EQUIP="virtual-life-accessory-equipment-v1"/);
assert.match(editor,/state\.cursorMode/);
assert.match(editor,/core\.moveMasked/);
assert.match(editor,/core\.flipMasked/);
assert.match(editor,/core\.wandMask/);
assert.match(editor,/function saveToStorage\(\)/);
assert.match(editor,/function equip\(\)/);
assert.match(editor,/window\.VirtualLifeAccessoryEditor=/);
assert.match(css,/@media\(max-width:900px\)/);
assert.match(css,/min-width:0/);
const keys=[...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]);
assert.equal(new Set(keys).size,keys.length,"Duplicate accessory HTML IDs");
assert.match(read("pixel-editor.css"),/--xp-face:#c9c8c4/,"Reuse classic XP theme");
console.log("PASS: original AKSESORIS tab, 4-view helmet/bag editor, separate Theodore guide, storage/equip and touchpad controls");
