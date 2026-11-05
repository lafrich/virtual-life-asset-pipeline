"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const S=require("../site/mahluk-2/pixel-selection.js");
const H=fs.readFileSync("site/mahluk-2/index.html","utf8");
const E=fs.readFileSync("site/mahluk-2/plane-pixel-editor.js","utf8");
const R=fs.readFileSync("site/mahluk-2/studio.js","utf8");
const C=fs.readFileSync("site/mahluk-2/studio.css","utf8");
const p=(v)=>[v,0,0,255];
function grid(){const pixels=new Uint8ClampedArray(4*3*4);for(let i=0;i<12;i++)pixels.set(p(i+1),i*4);return pixels}
function red(data,i){return data[i*4]}
test("rectangular native pixel select is inclusive and clamped",()=>{
 assert.deepEqual(S.rectFromPoints({x:3,y:2},{x:1,y:0},4,3),{x:1,y:0,w:3,h:3});
 assert.deepEqual(S.rectFromPoints({x:-10,y:5},{x:9,y:-5},4,3),{x:0,y:0,w:4,h:3});
 assert.equal(S.contains({x:1,y:0,w:2,h:2},2,1),true);
 assert.equal(S.contains({x:1,y:0,w:2,h:2},3,1),false);
});
test("flip horizontal affects only selected 2x2 region without altering other pixels",()=>{
 const rect={x:1,y:0,w:2,h:2},src=grid(),next=S.flip(src,4,3,rect,"horizontal");
 assert.equal(red(next,0),1);
 assert.equal(red(next,1),3);
 assert.equal(red(next,2),2);
 assert.equal(red(next,5),7);
 assert.equal(red(next,6),6);
 assert.equal(red(next,9),10);
 assert.equal(red(src,1),2);
});
test("flip vertical only selected region, preserves source opacity",()=>{
 const next=S.flip(grid(),4,3,{x:1,y:0,w:2,h:2},"vertical");
 assert.equal(red(next,1),6);
 assert.equal(red(next,2),7);
 assert.equal(red(next,5),2);
 assert.equal(red(next,6),3);
 assert.equal(red(next,0),1);
});
test("moving native selected artwork clears origin and paints destination without deleting outside",()=>{
 const original=grid();
 const next=S.translate(original,4,3,{x:1,y:0,w:2,h:1},0,1);
 assert.equal(next[1*4+3],0);
 assert.equal(next[2*4+3],0);
 assert.equal(red(next,5),2);
 assert.equal(red(next,6),3);
 assert.equal(red(next,0),1);
 assert.equal(red(original,1),2);
});
test("pixel editor has independently adjustable native-view ghost overlay and selection controls",()=>{
 for(const id of ["pixelReferenceView","pixelReferenceFlip","pixelReferenceOpacity","pixelReferenceOpacityLabel",
  "pixelReferenceX","pixelReferenceY","pixelSelectAll","pixelDeselect","pixelFlipH",
  "pixelFlipV","pixelDeleteSelection","pixelSelectionInfo"]){
  assert.ok(H.includes('id="'+id+'"'),id);
 }
 assert.match(H,/data-pixel-tool="select"/);
 assert.match(H,/data-pixel-tool="move-pixels"/);
 assert.match(E,/out\.drawImage\(atlas,0,ghost\*H,W,H,ox,oy,canvas\.width,canvas\.height\)/);
 assert.match(E,/ctx\.putImageData\(frame,0,dir\*H\)/);
 assert.match(E,/S\.flip\(image\.data,W,H,selection,axis\)/);
 assert.match(E,/S\.translate\(sourcePixels,W,H,rect,x,y\)/);
 assert.match(E,/S\.rectFromPoints\(active\.origin,next,W,H\)/);
 assert.match(E,/const updateSelection=\(\)=>/);
});
test("viewport picks visible source pixels, identifies part, and outlines actual alpha bounds",()=>{
 assert.match(H,/id="toolSelect"/);
 assert.match(H,/id="selectedPartChip"/);
 assert.match(R,/function planeAlphaBounds\(src\)/);
 assert.match(R,/function hitPlanesAt\(point\)/);
 assert.match(R,/function planePixelAt\(hit,x,y\)/);
 assert.match(R,/function drawSelectedPlaneOutline\(ctx,hits,id\)/);
 assert.match(R,/drawSelectedPlaneOutline\(ctx,lastPlaneHits,selected\)/);
 assert.match(R,/const hits=hitPlanesAt\(p\)/);
 assert.match(R,/const candidate=e\.shiftKey\?hits\[/);
 assert.match(R,/\$\("selectedPartChip"\)\.textContent=/);
});
test("Windows desktop style matches the Membangun light grey chrome and bevelled blue titlebar",()=>{
 assert.match(C,/background:linear-gradient\(90deg,#042777,#0755b5/);
 assert.match(C,/\.panel\{background:#d3d1cd/);
 assert.match(C,/\.pixel-dialog\{background:#cac9c6/);
 assert.match(C,/\.selected-part-chip\{position:absolute/);
 assert.match(C,/\.viewstage\{background:radial-gradient/);
});
