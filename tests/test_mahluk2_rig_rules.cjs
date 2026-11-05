"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const R=require("../site/modular-rig-v2.js");
const G=require("../site/mahluk-2/rig-rules.js");
const ids=R.BONES.map(b=>b.id);

test("master rig retains original V6B appearance when anchors use their factory pivots",()=>{
 const pose=R.referencePose(),native=R.world(pose),world=G.world(pose,G.defaults(R),R);
 for(const b of R.BONES){
  assert.equal(world[b.id].x,native[b.id].x,b.id+" x");
  assert.equal(world[b.id].y,native[b.id].y,b.id+" y");
  assert.equal(world[b.id].z,native[b.id].z,b.id+" z");
 }
 assert.equal(world.glasses.parent,"head","Glasses must follow head, NOT Emotion");
});
test("per-plane pivots change rotation centers without inventing source pixels",()=>{
 const rules=G.defaults(R),pose=R.referencePose();
 assert.ok(G.setAnchor(rules,"head",45,52,R));
 assert.deepEqual(rules.anchors.head,{x:45,y:52});
 const before=G.world(pose,rules,R);
 assert.equal(before.head.x,45);assert.equal(before.head.y,52);
 assert.equal(before.emotion.parent,"head");
 pose.parts.head.angle=20;
 const tilted=G.world(pose,rules,R);
 assert.notEqual(tilted.emotion.x,before.emotion.x);
 assert.equal(tilted.glasses.parent,"head");
});
test("editable parenting cannot create cycles; root stays fixed",()=>{
 const rules=G.defaults(R);
 assert.equal(G.setParent(rules,"head","pelvis",R),true);
 assert.equal(rules.parents.head,"pelvis");
 assert.equal(G.canParent(rules,"pelvis","head",R),false);
 assert.equal(G.setParent(rules,"pelvis","head",R),false);
 assert.equal(G.setParent(rules,"root","head",R),false);
 assert.equal(G.setParent(rules,"glasses","emotion",R),true);
 assert.equal(G.setParent(rules,"emotion","glasses",R),false);
});
test("front/back layer order is deterministic, independent from hierarchy",()=>{
 const rules=G.defaults(R),view=["torso","head","emotion","glasses"];
 assert.deepEqual(G.effectiveOrder(rules,view),view);
 assert.equal(G.moveLayer(rules,"emotion",1,view),true);
 assert.deepEqual(G.effectiveOrder(rules,view),["torso","head","glasses","emotion"]);
 assert.equal(G.moveLayer(rules,"torso",-1,view),false);
 assert.equal(G.moveLayer(rules,"head",-1,view),true);
 assert.equal(G.layerRank(rules,"head",view),0);
});
test("local default rules retain anchors, safe hierarchy, ordering and universal pose",()=>{
 const store={items:new Map(),getItem(k){return this.items.get(k)||null},
  setItem(k,v){this.items.set(k,v)}};
 const rules=G.defaults(R);G.setAnchor(rules,"elbow_l",18,74,R);
 G.setParent(rules,"glasses","head",R);
 G.moveLayer(rules,"glasses",-1,["head","emotion","glasses"]);
 const pose=R.referencePose();pose.parts.shoulder_l.x=3;
 const saved=G.save(store,R,rules,pose.parts);
 assert.equal(saved.version,1);
 assert.equal(saved.revision,1);
 const read=G.read(store,R);
 assert.deepEqual(read.rules.anchors.elbow_l,{x:18,y:74});
 assert.equal(read.rules.parents.glasses,"head");
 assert.equal(read.defaultParts.shoulder_l.x,3);
 assert.equal(G.save(store,R,rules,pose.parts).revision,2);
});
test("master rig excludes hidden facial micro-bones from editable layer draw order",()=>{
 const src={anchors:{head:{x:500,y:-50}},order:["head","eye_l","glasses","head"]};
 const rules=G.normalize(src,R);
 assert.deepEqual(rules.order,["head","glasses"]);
 assert.deepEqual(rules.anchors.head,{x:64,y:0});
 assert.equal(ids.length>=30,true);
});
test("studio mounts anchor/pivot GUI, master save, Undo/Redo and mobile pinch+mouse wheel zoom",()=>{
 const html=fs.readFileSync("site/mahluk-2/index.html","utf8");
 const app=fs.readFileSync("site/mahluk-2/studio.js","utf8");
 const css=fs.readFileSync("site/mahluk-2/studio.css","utf8");
 for(const id of ["toolAnchor","anchorX","anchorY","parentBone","layerOrder",
  "layerFront","layerBack","undo","redo","zoomIn","zoomOut","zoomLabel",
  "saveGeneralRig","loadGeneralRig","factoryRig"]){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 for(const phrase of ["touchPoints.size===2","current.distance/pinch.distance",
  'studio.addEventListener("wheel"','zoomTo(zoom*1.25)',
  'e.key.toLowerCase()==="z"',"rigRules:G.normalize(rigRules,R)"]){
  assert.ok(app.includes(phrase),phrase);
 }
 assert.ok(css.includes("touch-action:none"));
 assert.ok(html.includes("rig-rules.js"));
});
