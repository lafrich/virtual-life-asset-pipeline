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
console.log("PASS: real 64x112 pixel editor, region lock, brush/fill, validated import/export and Otis-only launch");
