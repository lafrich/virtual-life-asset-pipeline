"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const core=require("../site/pixel-edit-core.js");
const base=path.join(__dirname,"../site");
const page=fs.readFileSync(path.join(base,"pixel-editor.html"),"utf8");
const controller=fs.readFileSync(path.join(base,"pixel-editor.js"),"utf8");
const homepage=fs.readFileSync(path.join(base,"index.html"),"utf8");
const app=fs.readFileSync(path.join(base,"app.js"),"utf8");
assert.equal(core.key("walk","se",0),"walk|se|0");
assert.throws(()=>core.key("walk","se",6),/Invalid/);
assert.throws(()=>core.key("walk","side",0),/Invalid/);
assert.equal(core.isEditable(8,18),true);
assert.equal(core.isEditable(55,71),true);
for(const point of [[7,18],[56,20],[32,72],[32,0],[0,100]])
 assert.equal(core.isEditable(...point),false);
const standard={format:"virtual-life-pixel-patch-v1",version:1,actor:"legacy_otis",frame_size:[64,112],region:[8,18,56,72],
 frames:[{action:"walk",direction:"sw",frame:2,png:"data:image/png;base64,QUJDRA=="}]};
assert.equal(core.validatePatch(standard),true);
assert.throws(()=>core.validatePatch({...standard,actor:"legacy_theodore"}));
assert.throws(()=>core.validatePatch({...standard,region:[0,0,64,112]}));
assert.throws(()=>core.validatePatch({...standard,frames:standard.frames.concat(standard.frames)}));
assert.throws(()=>core.validatePatch({...standard,frames:[{...standard.frames[0],png:"https://evil.test/edit.png"}]}));
assert.deepEqual(core.bresenham(1,1,3,2),[[1,1],[2,1],[3,2]]);
const data=new Uint8ClampedArray(64*112*4);
const image={data};let i=(18*64+8)*4;
data.set([3,4,5,255],i);
assert.equal(core.flood(image,8,18,[30,40,50,255]),true);
assert.deepEqual([...data.slice(i,i+4)],[30,40,50,255]);
assert.deepEqual([...data.slice(0,4)],[0,0,0,0],"outside head remains locked");
assert.ok(homepage.includes('id="edit-pixels"'));
assert.ok(app.includes('character.id !== "legacy_otis"'));
for(const id of ["pixel-canvas","action","direction","frame","undo","redo",
 "export-patch","import-patch","color","grid","zoom","small-preview"])
 assert.ok(page.includes('id="'+id+'"'),"Missing required editor control "+id);
assert.ok(controller.includes("localStorage.setItem(LOCAL"),"draft must save in browser");
assert.ok(controller.includes("core.validatePatch(p"),"import must validate patch");
assert.ok(controller.includes("toPNG(data)"),"must export exact PNG frames");

const region=[8,18,56,72];
const rect=core.selectionRect(22,32,20,30,region);
assert.deepEqual(rect,[20,30,23,33]);
const bitmap=()=>({data:new Uint8ClampedArray(64*112*4)});
const original=bitmap();
const put=(target,x,y,r)=>target.data.set([r,0,0,255],(y*64+x)*4);
const get=(target,x,y)=>Array.from(target.data.slice((y*64+x)*4,(y*64+x)*4+4));
put(original,20,30,101);put(original,22,31,202);put(original,0,0,99);
const flippedH=core.flipPixels(original,rect,"horizontal",region);
assert.deepEqual(get(flippedH,22,30),[101,0,0,255]);
assert.deepEqual(get(flippedH,20,31),[202,0,0,255]);
const flippedV=core.flipPixels(original,rect,"vertical",region);
assert.deepEqual(get(flippedV,20,32),[101,0,0,255]);
const translated=core.movePixels(original,rect,3,2,region);
assert.deepEqual(translated.box,[23,32,26,35]);
assert.deepEqual(get(translated,23,32),[101,0,0,255]);
assert.deepEqual(get(translated,20,30),[0,0,0,0]);
assert.deepEqual(get(translated,0,0),[99,0,0,255],"unchanged pixels outside body part");
assert.deepEqual(core.movePixels(original,rect,999,-999,region).box,[53,18,56,21]);
assert.throws(()=>core.flipPixels(original,[0,0,10,10],"horizontal",region));
assert.throws(()=>core.movePixels(original,rect,1.5,0,region));
for(const id of ["pan-toggle","cursor-toggle","cursor-tap","cursor-left","cursor-right",
 "cursor-up","cursor-down","flip-horizontal","flip-vertical","deselect",
 "nudge-left","nudge-right","nudge-up","nudge-down","selection-info"])
 assert.ok(page.includes('id="'+id+'"'),"Missing touchpad/selection control "+id);
for(const tool of ["select","move","pencil","erase","pick","fill"])
 assert.ok(page.includes('data-tool="'+tool+'"'),"Missing tool "+tool);
assert.ok(controller.includes("function cursorTap()"),"touch cursor needs an apply handler");
assert.ok(controller.includes("function editMove(e)"),"cursor must track pointer movement");
assert.ok(controller.includes("core.flipPixels("),"flip must alter image data");
assert.ok(controller.includes("core.movePixels("),"move must alter image data");
assert.ok(controller.includes("commit(d.before,d.box)"),"move must support undo");
assert.ok(controller.includes("cursorMode:MOBILE_TOUCH"),"mobile must use non-paint touchpad by default");


const xpStyle=fs.readFileSync(path.join(base,"pixel-editor.css"),"utf8");
const shellStyle=fs.readFileSync(path.join(base,"style.css"),"utf8");
assert.ok(xpStyle.includes("--xp-face:#c9c8c4"),"editor must match original XP chrome");
assert.ok(xpStyle.includes("html{width:100%;max-width:100%;min-width:0;overflow-x:hidden}"),"no horizontal page overflow on phones");
assert.ok(xpStyle.includes("overflow:auto;padding:0"),"higher zooms scroll inside editor viewport");
assert.ok(xpStyle.includes("padding:16px"),"canvas needs a non-paintable gutter on mobile");
assert.ok(page.includes('<option value="2">2×</option>')&&page.includes('<option value="3">3×</option>'),"mobile needs smaller exact-pixel zoom values");
assert.ok(controller.includes("function fitMobileZoom()")&&controller.includes("userSetZoom=true"),"mobile fit should yield to manual zoom");
assert.ok(shellStyle.includes(".pixel-editor-overlay{inset:0;width:100%;max-width:100vw"),"original landing modal must fit the phone");
assert.ok(app.includes('editorUrl.searchParams.set("embedded", "1")'),"original landing remains the editor entry point");

console.log("PASS: real 64x112 pixel editor, region lock, brush/fill, validated import/export and Otis-only launch");
