"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const H=require("../site/human-gameplay-rig.js");
const actor=(gender)=>({
 id:"human_"+gender+"_base",gender,template:true,template_category:"human",
 sheet:"media/human-"+gender+"-base-sheet.png",
 motions:["idle","walk","sit","sit_type","lie","lie_idle","bathe",
  "bathtub_bathe","squat_idle","talk"].map(id=>({
   id,source:["idle","walk"].includes(id)?"native":"custom",
   sheet:"media/human-"+gender+"-base-action-"+id+".png",
   row:0,frames:id==="walk"||id==="bathtub_bathe"?6:4,available:true
  }))
});
test("Male and Female are authoritative rig references, with same action IDs",()=>{
 const male=actor("male"),female=actor("female"),runtime=H.compile([male,female]);
 assert.equal(runtime.ready,true);
 assert.deepEqual([...H.BASE_IDS],["human_male_base","human_female_base"]);
 for(const a of [male,female]){
  assert.equal(runtime.forActor(a,"walk").visualStatus,"authored");
  assert.equal(runtime.forActor(a,"bathtub_bathe").visualStatus,"authored");
  assert.equal(runtime.forActor(a,"squat_idle").visualStatus,"authored");
  assert.equal(runtime.forActor(a,"use_toilet").actionId,"toilet_sit");
  assert.equal(runtime.forActor(a,"use_toilet").visualStatus,"pose-compatible");
  assert.equal(runtime.forActor(a,"work").motionId,"sit_type");
  assert.equal(runtime.forActor(a,"rest").motionId,"lie_idle");
  assert.equal(runtime.forActor(a,"run").visualStatus,"missing");
  assert.equal(runtime.forActor(a,"run").motion,null);
  assert.equal(runtime.forActor(a,"run").gameplayImplemented,false);
 }
 assert.equal(runtime.forActor(male,"walk").sourceActor,male.id);
 assert.equal(runtime.forActor(female,"walk").sourceActor,female.id);
 assert.notEqual(runtime.forActor(male,"walk").sourceActor,
  runtime.forActor(female,"walk").sourceActor);
});
test("Archived characters and NPCs remain unchanged and never borrow base pixels",()=>{
 const legacy={id:"legacy_theodore",sheet:"media/theodore-sheet.png",
  motions:[{id:"wave_flag",available:true,source:"custom",
   sheet:"media/theodore-wave.png",row:0,frames:4}]};
 const snapshot=JSON.stringify(legacy);
 const g=H.compile([actor("male"),actor("female"),legacy]);
 const wave=g.forActor(legacy,"wave_flag");
 assert.equal(wave.animationReady,true);
 assert.equal(wave.sourceActor,"legacy_theodore");
 assert.equal(wave.baseline,null);
 const sit=g.forActor(legacy,"use_toilet");
 assert.equal(sit.previewReady,false);
 assert.equal(sit.motionId,null);
 assert.equal(JSON.stringify(legacy),snapshot);
});
test("Custom humans inherit base action source, not third-party sprites",()=>{
 const male=actor("male"),custom={...male,id:"custom_human_icha",
  baseId:"human_male_base",template:false};
 const g=H.compile([male,actor("female")]);
 const clip=g.forActor(custom,"sit");
 assert.equal(clip.baseline,"human_male_base");
 assert.equal(clip.sourceActor,"custom_human_icha");
 assert.equal(clip.motionId,"sit");
 assert.equal(g.canonicalAction("pee","outdoor_wall"),"pee_wall");
 assert.equal(g.canonicalAction("study","phone"),"study_online");
 assert.equal(g.canonicalAction("open","fridge"),"open_fridge");
 assert.equal(g.canonicalAction("cook","street_stall"),"cook_stall");
});
test("A missing base leaves named characters intact and reports unready",()=>{
 const m=actor("male"),g=H.compile([m]);
 assert.equal(g.ready,false);
 assert.equal(g.bases.female,null);
 assert.equal(g.forActor(m,"idle").visualStatus,"authored");
});
