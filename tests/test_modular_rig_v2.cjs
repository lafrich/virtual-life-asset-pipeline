"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const R=require("../site/modular-rig-v2.js");

test("new v2 reference is approved while archived V6B actors remain hidden",()=>{
 const source=fs.readFileSync("site/character-reference-reset.js","utf8");
 assert.match(source,/human_pixel_reference_v2/);
 assert.match(source,/active:true/);
 assert.equal(R.ID,"human_pixel_reference_v2");
 assert.deepEqual(R.DIR,["se","sw","ne","nw"]);
 assert.equal(R.W,64);assert.equal(R.H,112);
});
test("hierarchical pixel cutouts have separate head, emotion, brows, eyes and mouth",()=>{
 assert.equal(R.HIERARCHY.torso,"pelvis");
 assert.equal(R.HIERARCHY.head,"neck");
 assert.equal(R.HIERARCHY.emotion,"head");
 for(const id of ["brow_l","brow_r","eye_l","eye_r","mouth"])
  assert.equal(R.HIERARCHY[id],"emotion",id+" must follow emotion which follows head");
 for(const id of ["shoulder_l","elbow_l","wrist_l","shoulder_r","elbow_r","wrist_r",
   "hip_l","knee_l","ankle_l","hip_r","knee_r","ankle_r"])
  assert.ok(R.BMAP[id],"independent body module "+id);
 assert.equal(R.HIERARCHY.phone,"wrist_l","phone prop follows wrist");
});
test("head rotation and translation carry all facial modules but not the torso",()=>{
 const a=R.neutral(),before=R.world(a);
 a.parts.head.x=6;a.parts.head.y=-4;
 const after=R.world(a);
 assert.equal(after.head.x-before.head.x,6);
 assert.equal(after.mouth.x-before.mouth.x,6);
 assert.equal(after.eye_l.x-before.eye_l.x,6);
 assert.equal(after.brow_r.y-before.brow_r.y,-4);
 assert.equal(after.torso.x,before.torso.x);
 a.parts.head.angle=30;
 const turned=R.world(a);
 assert.notEqual(Math.round(turned.eye_l.x*10),Math.round(after.eye_l.x*10));
 a.parts.emotion.x=3;
 const shifted=R.world(a);
 assert.notEqual(shifted.mouth.x,turned.mouth.x);
 assert.equal(shifted.head.x,turned.head.x);
});
test("body root moves shoes/face without losing cutout independence",()=>{
 const original=R.world(R.referencePose());
 const model=R.referencePose();model.parts.pelvis.x+=4;model.parts.pelvis.y+=3;
 const moved=R.world(model);
 assert.equal(moved.head.x-original.head.x,4);
 assert.equal(moved.ankle_r.y-original.ankle_r.y,3);
 model.parts.eye_l.x+=2;
 const edited=R.world(model);
 assert.notEqual(edited.eye_l.x,moved.eye_l.x);
 assert.equal(edited.eye_r.x,moved.eye_r.x);
});
test("independent per-part diamond keys and emotion IDs survive interpolation",()=>{
 const tracks=R.makeTracks(),base=R.referencePose();
 const target={...base.parts.head,x:7,angle:15};
 R.key(tracks,"head",8,target);
 R.key(tracks,"emotion",8,{...base.parts.emotion,x:2},"blush");
 const sampled=R.sampleTrack(tracks,8,24,base);
 assert.equal(sampled.parts.head.x,7);
 assert.equal(sampled.parts.emotion.x,2);
 assert.equal(sampled.emotion,"blush");
 const exported=R.exportModel(base,tracks);
 assert.equal(exported.emotion_parent,"head");
 assert.deepEqual(exported.facial_children,["brow_l","brow_r","eye_l","eye_r","mouth"]);
 assert.equal(exported.tracks.head[0].frame,8);
 assert.equal(exported.model.character_id,R.ID);
});
test("art and studio contain new pixel rig controls without replacing other app editors",()=>{
 const html=fs.readFileSync("site/index.html","utf8");
 const studio=fs.readFileSync("site/rig-studio-v2.js","utf8");
 for(const id of ["switch-rig-v2","rig-v2-workspace","rig-v2-main","rig-v2-tree",
  "rig-v2-emotion","rig-v2-track-label","rig-v2-tracks","rig-v2-key",
  "rig-v2-unkey","rig-v2-export","rig-v2-png","rig-v2-playhead"]){
  if(id==="rig-v2-track-label")assert.ok(studio.includes(id));else assert.ok(html.includes('id="'+id+'"'),id);
 }
 for(const id of ["switch-poser","switch-chars","switch-animations","switch-actions","tab-custom-char"])
  assert.ok(html.includes('id="'+id+'"'),id+" original function must remain");
 assert.ok(html.includes("modular-rig-v2.js"));
 assert.ok(html.includes("rig-studio-v2.js"));
 assert.ok(html.includes("rig-studio-v2.css"));
 assert.ok(studio.includes("R.key(tracks"));
});
