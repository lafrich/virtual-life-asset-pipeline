"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const V=require("../site/mahluk-2/view-projection.js");
const P=require("../site/mahluk-2/plane-pixel-editor.js");
const all=["se","sw","ne","nw"];
const close=(a,b)=>assert.ok(Math.abs(a-b)<0.00001,"Expected "+a+" near "+b);

test("Four orbit directions share one world rig and alternate native camera projections",()=>{
 const p={x:23,y:53,z:4};
 for(const dir of all){
  const c=V.config(dir);
  const view=V.planePosition(p,dir);
  close(view.x,(c.mirror?64-p.x:p.x)+c.zx*p.z);
  close(view.y,p.y+c.zy*p.z);
  const flat=V.planePosition(p,dir,true);
  close(flat.x,c.mirror?64-p.x:p.x);
  close(flat.y,p.y);
 }
 assert.equal(V.orbit("se",1),"sw");
 assert.equal(V.orbit("sw",1),"nw");
 assert.equal(V.orbit("nw",1),"ne");
 assert.equal(V.orbit("ne",1),"se");
 assert.equal(V.orbit("se",-1),"ne");
});

test("Dragging an axis in any of the 4 cameras updates identical MASTER coordinates",()=>{
 const px=5,py=-3,zoom=3.25,p={x:26,y:54,z:2};
 for(const dir of all){
  const c=V.config(dir),prior=V.planePosition(p,dir);
  const xDelta=V.dragDelta(px*zoom,0,zoom,dir,"x");
  const nowX=V.planePosition({...p,x:p.x+xDelta},dir);
  close(nowX.x-prior.x,px);
  const yDelta=V.dragDelta(0,py*zoom,zoom,dir,"y");
  const nowY=V.planePosition({...p,y:p.y+yDelta},dir);
  close(nowY.y-prior.y,py);
  const zDelta=V.dragDelta(c.zx*zoom*2,c.zy*zoom*2,zoom,dir,"z");
  close(zDelta,2);
  const nowZ=V.planePosition({...p,z:p.z+zDelta},dir);
  close(nowZ.x-prior.x,c.zx*2);
  close(nowZ.y-prior.y,c.zy*2);
 }
 close(V.rotationDelta(30,"se"),30);
 close(V.rotationDelta(30,"sw"),-30);
 close(V.rotationDelta(30,"ne"),30);
 close(V.rotationDelta(30,"nw"),-30);
});

test("Rear cameras reverse Z depth but retain same source character state",()=>{
 assert.equal(V.depth({z:5},"se"),5);
 assert.equal(V.depth({z:5},"sw"),5);
 assert.equal(V.depth({z:5},"ne"),-5);
 assert.equal(V.depth({z:5},"nw"),-5);
 assert.deepEqual(V.explosion(2,5,0,"se"),{x:0,y:0});
 assert.ok(V.explosion(4,5,2,"se").x>0);
 assert.ok(V.explosion(4,5,2,"sw").x<0);
});

test("Pixel editor syncs small brush strokes across views by mirroring source position, not overwriting whole back atlas",()=>{
 assert.equal(P.mirroredX(7,0,0),7);
 assert.equal(P.mirroredX(7,0,1),56);
 assert.equal(P.mirroredX(7,0,2),7);
 assert.equal(P.mirroredX(7,0,3),56);
 assert.equal(P.mirroredX(56,3,0),7);
 assert.equal(P.mirroredX(20,1,3),20);
 const html=fs.readFileSync("site/mahluk-2/index.html","utf8");
 assert.match(html,/id="pixelSync"> SYNC BRUSH/);
 assert.doesNotMatch(html,/id="pixelSync" checked/);
 assert.match(html,/id="pixelSyncExisting"/);
 const editor=fs.readFileSync("site/mahluk-2/plane-pixel-editor.js","utf8");
 assert.match(editor,/els\.syncExisting\.onclick=/);
 assert.match(editor,/before\[p\+3\]===0/);
 assert.match(editor,/if\(data\[to\+3\]===0\)continue/);
});

test("Editor includes clickable orbit gizmo, actual 4-way previews, editor-only depth guides, and publishes unchanged 4-view game output",()=>{
 const html=fs.readFileSync("site/mahluk-2/index.html","utf8");
 const js=fs.readFileSync("site/mahluk-2/studio.js","utf8");
 for(const id of ["orbitGizmo","orbitPrev","orbitNext","togglePlaneDepth","planeGap","planeGapLabel",
  "orbitDirectionLabel","previewSE","previewSW","previewNE","previewNW","depthReadout"])
  assert.ok(html.includes('id="'+id+'"'),"Missing "+id);
 for(const dir of all){
  assert.ok(html.includes('data-orbit-dir="'+dir+'"'));
  assert.ok(html.includes('data-preview-dir="'+dir+'"'));
 }
 assert.match(js,/const exploding=Boolean\(editorMode&&view==="iso"&&inspectPlaneDepth&&planeGap>0\)/);
 assert.match(js,/renderLayers\(preview,dir,0,0,1,false\)/);
 assert.match(js,/V\.dragDelta\(dx,dy,scale,direction,"x"\)/);
 assert.match(js,/V\.dragDelta\(dx,dy,scale,direction,"z"\)/);
 assert.match(js,/V\.rotationDelta\(delta,direction\)/);
 assert.match(js,/function setDirection\(dir\)/);
 assert.match(html,/id="toolOrbit"/);
 assert.match(js,/if\(drag\.mode==="orbit"\)/);
 assert.match(js,/V\.orbit\(drag\.baseDir,step\)/);
 assert.match(js,/function drawPlaneDepthGuides\(/);
 assert.match(js,/previewExplode|inspectPlaneDepth/);
});
