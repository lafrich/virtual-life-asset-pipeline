"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const R=require("../site/modular-rig-v2.js");
const G=require("../site/mahluk-2/rig-rules.js");
const P=require("../site/mahluk-2/plane-pixel-editor.js");

test("pixel editor is exact 64×112 per direction, no scaling of saved atlas",()=>{
 assert.equal(P.W,64);assert.equal(P.H,112);
 assert.deepEqual(P.DIR,["se","sw","ne","nw"]);
 const points=[];
 P.rasterLine(2,3,5,3,(x,y)=>points.push([x,y]));
 assert.deepEqual(points,[[2,3],[3,3],[4,3],[5,3]]);
});
test("eraser-ready RGBA flood fill changes connected pixels only",()=>{
 const image=new Uint8ClampedArray(4*2*4);
 // A B / A B: four pixels, left pair transparent and right pair red.
 for(const i of [1,3])image.set([255,0,0,255],i*4);
 assert.equal(P.flood(image,2,2,0,0,[30,60,90,255]),true);
 assert.deepEqual([...image.slice(0,4)],[30,60,90,255]);
 assert.deepEqual([...image.slice(8,12)],[30,60,90,255]);
 assert.deepEqual([...image.slice(4,8)],[255,0,0,255]);
 assert.equal(P.flood(image,2,2,0,0,[30,60,90,255]),false);
 assert.equal(P.flood(image,2,2,1,0,[0,0,0,0]),true);
 assert.deepEqual([...image.slice(4,8)],[0,0,0,0]);
});
test("universal rig stores verified PNG for wrist while leaving rest pose and hierarchy identical",()=>{
 const store={map:new Map(),getItem(k){return this.map.get(k)||null},setItem(k,v){this.map.set(k,v)}};
 const rules=G.defaults(R),parts=R.referencePose().parts;
 const pixels={wrist_l:"data:image/png;base64,aGVsbG8=",wrist_r:"data:image/png;base64,d29ybGQ="};
 const saved=G.save(store,R,rules,parts,pixels);
 assert.deepEqual(saved.pixelPlanes,pixels);
 const reopened=G.read(store,R);
 assert.deepEqual(reopened.pixelPlanes,pixels);
 assert.deepEqual(reopened.rules,saved.rules);
 assert.equal(reopened.defaultParts.wrist_l.x,parts.wrist_l.x);
 assert.equal(G.save(store,R,rules,parts).pixelPlanes.wrist_l,pixels.wrist_l);
});
test("pixel artwork sanitization rejects arbitrary files, unknown bones and hidden facial micro-bones",()=>{
 const result=G.sanitizePixelPlanes({
  wrist_l:"data:image/png;base64,QUJD",eye_l:"data:image/png;base64,QUJD",
  extra:"data:image/png;base64,QUJD",wrist_r:"data:text/html;base64,QUJD",
  head:"data:image/png;base64,"+"a".repeat(200001)
 },R);
 assert.deepEqual(result,{wrist_l:"data:image/png;base64,QUJD"});
});
test("studio uses painted plane instead of double-rendering source and exports it as 4-dir game pixel sprites",()=>{
 const s=fs.readFileSync("site/mahluk-2/studio.js","utf8");
 const h=fs.readFileSync("site/mahluk-2/index.html","utf8");
 const c=fs.readFileSync("site/mahluk-2/studio.css","utf8");
 for(const id of ["editPixelPlane","openPlaneEditor","clearPixelPlane","pixelCanvas",
  "pixelDirection","pixelSaveDefault","pixelApply","pixelUndo","pixelRedo","pixelRestore"]){
  assert.ok(h.includes('id="'+id+'"'),"Missing "+id);
 }
 assert.match(s,/kind:"pixel",bone:id/);
 assert.match(s,/for\(const \[id,image\] of planeImages\)/);
 assert.match(s,/if\(item.kind==="pixel"\)/);
 assert.match(s,/planeImages\.set\(id,img\)/);
 assert.match(s,/pixelPlanes:G\.sanitizePixelPlanes\(pixelPlanes,R\)/);
 assert.match(s,/G\.save\(window\.localStorage,R,rules,parts,merged,bone==="head"\?true:headMerged\)/);
 assert.match(s,/setPixelPlanes\(general\?\.pixelPlanes\|\|\{\}\)/);
 assert.match(c,/#pixelCanvas\{[^}]*image-rendering:pixelated/);
});
