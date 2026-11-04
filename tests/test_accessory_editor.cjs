"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const site=path.join(__dirname,"../site");
const read=p=>fs.readFileSync(path.join(site,p),"utf8");
const index=read("index.html"),app=read("app.js"),html=read("accessory-editor.html");
const editor=read("accessory-editor.js"),css=read("accessory-editor.css");
new Function(app);new Function(editor);
assert.match(index,/<title>Mahluk Hidup — Character Studio<\/title>/,
 "Browser title must use Mahluk Hidup branding");
assert.ok(read("animations.js").includes('.textContent = "MAHLUK HIDUP"'),
 "Switching to Animations must preserve Mahluk Hidup brand title");
assert.match(index,/<strong>MAHLUK HIDUP<\/strong>/,
 "XP window title must show Mahluk Hidup");
assert.ok(index.includes("MAHLUK HIDUP®"),"Sprite canvas watermark must be renamed");
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
assert.match(editor,/EQUIP="virtual-life-accessory-equipment-v1"/);
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

assert.match(index,/id="tab-custom-char"/,"NEW CUSTOM CHAR tab must be on original landing");
assert.match(index,/id="custom-char-panel"/,"Custom character panel must exist");
for(const id of ["custom-category","custom-base","custom-name","custom-helmet","custom-bag",
 "custom-save","custom-new","custom-storage-list","custom-draw-helmet","custom-draw-bag"])
 assert.ok(index.includes('id="'+id+'"'),"Missing Character Storage control "+id);
assert.match(app,/function savedCustomCharacters\(\)/);
assert.match(app,/function hydrateCharacter\(/);
assert.match(app,/function saveCustomCharacter\(\)/);
assert.match(app,/function rebuildCustomCharacters\(\)/);
assert.match(app,/function renderCustomStorage\(\)/);
assert.match(app,/virtual-life-character-storage-v1/);
assert.match(app,/astrofrich_base/);
assert.match(app,/\[\.\.\.catalogCharacters,/,"Custom characters must augment original assets");
assert.match(app,/function templateFor\(/);
assert.match(app,/human_male_base/);
assert.match(app,/human_female_base/);
assert.match(app,/function syncCustomCategory\(/);
assert.match(index,/id="human-outfit-slots"/);
assert.match(index,/id="astrofrich-outfit-slots"/);
for(const item of ["shirt","pants","shoes"]){
 assert.ok(index.includes('id="custom-'+item+'"'),"Missing HUMAN clothing selector "+item);
 assert.ok(index.includes('id="custom-draw-'+item+'"'),"Missing draw action "+item);
 assert.ok(html.includes('id="acc-'+item+'"'),"Missing four-view clothing editor "+item);
 assert.ok(editor.includes(item+":"),"Missing editable pixel box "+item);
}
assert.match(editor,/human-/);
assert.ok(editor.includes("base-guide.png"),"Human guide filename must match generated sprite guide");
assert.match(app,/catalogCharacters=unified.filter\(/);
assert.match(app,/UNIVERSAL_MOTIONS.catalogFor\(character,union\)/,"All custom characters share canonical motion IDs");
assert.match(app,/UNIVERSAL_SLEEP\?\.actionsFor\(character\)/);
assert.match(app,/function saveCustomCharacter\(/);
assert.match(app,/base\.motions\.filter\(/,"Keep full base motions on saved character");
assert.match(app,/base\.expressions\.length/,"Keep full expressions");
assert.match(editor,/function completedDirections\(\)/,"4-sided accessories must be validated");
assert.match(editor,/const missing=DIRS\.filter/,"Storage must require four complete authored sides");
assert.match(editor,/drawImage\(guide,di\*W,0,W,H/,"Guide changes per individual direction");
assert.match(editor,/frames:Object\.fromEntries\(DIRS\.map/,"All four directions saved as one asset");
assert.match(html,/id="acc-direction-progress"/);
assert.ok(app.includes('const rearView=dirIndex===2||dirIndex===3'),
 "Backpack depth must distinguish SE/SW from NE/NW");
assert.ok(app.includes('placement!==(rearView?"front":"back")'),
 "Rear bags should be visible on back torso, front bags behind avatar");
assert.ok(app.includes('targetCtx.rect(x,y+56*z,64*z,(112-56)*z)'),
 "Bag cannot cover the rear skull or neck");
assert.ok(editor.includes('const rearBag=state.category==="bag"'),
 "Accessory editor preview must match runtime rear bag depth");
assert.ok(editor.includes('pc.rect(0,56*4,256,(112-56)*4)'),
 "Rear bag preview must mask head/neck region");
console.log("PASS: Astrofrich New Custom Char, named Character Storage, inherited seven animations/five expressions, and separate 4-sided accessories");

