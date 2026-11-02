"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const src=JSON.parse(fs.readFileSync(path.join(__dirname,"../assets/animation_library/category_skeletons.json"),"utf8"));
const motions=JSON.parse(fs.readFileSync(path.join(__dirname,"../assets/animation_library/shared_bone_motions.json"),"utf8"));
const registry=JSON.parse(fs.readFileSync(path.join(__dirname,"../assets/animation_library/actions.json"),"utf8"));
const site=fs.readFileSync(path.join(__dirname,"../site/index.html"),"utf8");
const anim=fs.readFileSync(path.join(__dirname,"../site/animations.js"),"utf8");
const rt=require("../site/shared-bone-runtime.js");
assert.ok(!site.includes("switch-rigs")&&!site.includes("rig-workspace"),"no third Rig Studio tab");
assert.ok(!site.includes("rig-studio.js"),"no retired UI controller");
assert.ok(!anim.includes('el("rig-workspace")'),"animations don't depend on removed UI");
assert.equal(src.format,"virtual-life-category-skeletons-v1");
assert.equal(motions.format,"virtual-life-shared-bone-motion-v1");
assert.equal(Object.keys(src.types).length,4);
assert.equal(registry.actions.length,203);
assert.equal(motions.clips.length,7);
for(const [family,rig] of Object.entries(src.types)){
  rt.verifySkeleton(rig);
  assert.deepEqual(Object.keys(rig.channels).sort(),rt.CHANNELS.slice().sort());
  assert.ok(rig.bones.length>=10);
  const bones=new Set(rig.bones.map(b=>b.id));
  assert.ok(rig.rigid.every(k=>bones.has(k)));
  for(const clip of motions.clips){
    rt.verifyMotion(clip);
    assert.ok(registry.actions.some(a=>a.id===clip.id));
    for(const dir of rt.DIRECTIONS){
      const s=rt.resolve(src,motions,family,clip.id,clip.duration_ms/2,dir);
      assert.equal(s.action,clip.id);
      assert.equal(Object.keys(s.joints).length,rig.bones.length);
      assert.ok(Object.values(s.joints).every(b=>
        Number.isFinite(b.world_x)&&Number.isFinite(b.world_y)&&Number.isFinite(b.world_angle)));
      assert.equal(s.needs_skin,true,"do not claim finished sprite skins");
    }
  }
}
assert.equal(rt.resolve(src,motions,"MASCOT","pee_wall",500,"se"),null,
  "roadmapped motions must not be presented as authored");
const walk=motions.clips.find(m=>m.id==="walk");
const rig=src.types.HUMANOID;
const a=rt.sample(rig,walk,90,"se"),b=rt.sample(rig,walk,90,"sw");
assert.notEqual(a.joints.shoulder_l.world_angle,b.joints.shoulder_l.world_angle,
  "rig player should mirror pose rotation");
assert.equal(rt.sample(rig,motions.clips.find(m=>m.id==="sit"),9999,"se").ended,true);
assert.throws(()=>rt.sample(rig,walk,100,"sideways"));
console.log("PASS: removed Rig Studio UI; 7 canonical motion tracks sample on 4 distinct skeletal hierarchies and all 4 directions; planned actions are not fabricated");
