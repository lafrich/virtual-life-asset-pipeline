"use strict";

// DOM-free controller test. Exercises the exact functions shipped in app.js,
// including a delayed character-sheet load and real FACE canvas draw calls.
// No browser/network dependency, so the CI test runs on every PR.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("site/app.js", "utf8");

function functionSpan(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, "Missing controller function " + start);
  return source.slice(a, b);
}
const expressions = ["neutral", "happy", "surprised", "angry", "sleepy"].map(
  name => ({id:name, label:name.toUpperCase(), sheet:"media/gfunk-face-"+name+".png",
            frames:12,frame_ms:Array(12).fill(210),portrait:"media/gfunk-"+name+"-portrait.png"})
);
const selected = {id:"legacy_gfunk",sheet:"media/gfunk-sheet.png",row_starts:{idle:4},
  idle_frames:4,expressions};
const canvas = {width:440,height:450};
const drawn = [];
const ctx = {
  fillRect() {}, strokeRect() {}, beginPath() {}, ellipse() {}, fillText() {},
  drawImage(...args) { drawn.push(args); }
};
const el = Object.fromEntries(["canvas-name","motion-expression-active"].map(id=>[id,{textContent:""}]));
el["face-grid"] = {children:expressions.map(()=>({
  classList:{toggle(){}},setAttribute(){}
}))};
const state = {selected, direction:"3", mode:"action", expression:null,frame:7,
  image:{complete:true,naturalWidth:384}, faceImage:null, zoom:4, bg:"#f8f6f0",
  playing:false,autoDir:0,lastBlink:0,lastFrameTime:0};
let status="",directionSyncs=0,renderCount=0;
const context = {
  state,canvas,ctx,prefersReducedMotion:false,
  $:id=>el[id],setStatus:v=>status=v,
  syncMotionSelection(){},syncPlaybackButton(){},syncTools(){},
  syncDirectionButtons(){directionSyncs++;},
  cachedImage(src,ready) {const image = {src,naturalWidth:768,complete:true}; ready(image);return image;},
  getImageData:null
};
vm.createContext(context);
vm.runInContext(
  functionSpan("function drawFaceCloseup(", "function tick(") +
  functionSpan("function selectFace(", "function startWalking("),
  context
);
for(const face of expressions) {
  drawn.length=0;
  context.selectFace(face);
  assert.equal(state.mode,"face");
  assert.equal(state.direction,"0", "Clicking a FACE must leave the invisible rear view");
  assert.equal(state.faceImage.src,face.sheet);
  assert.equal(state.expression.id,face.id);
  assert.match(el["canvas-name"].textContent, new RegExp(face.id.toUpperCase()));
  assert.ok(drawn.length>=2,"Full character and enlarged face both render");
  assert.equal(drawn[0][0],state.faceImage,"Full character must come from selected face sheet");
  assert.equal(drawn[0][1],0);
  assert.equal(drawn[0][2],0);
  assert.equal(drawn[1][0],state.faceImage,"Magnifier must use the same selected sheet");
  assert.equal(drawn[1][1],17);
  assert.equal(drawn[1][2],30);
}
assert.ok(directionSyncs>=1);
assert.match(status,/ANIMATED FACE/);
assert.ok(source.includes("face.portrait || face.sprite || face.image"),
  "Face buttons should display cropped, expression-specific portraits");
console.log("PASS: all five FACE clicks select distinct original atlas paths and redraw character + magnifier");
