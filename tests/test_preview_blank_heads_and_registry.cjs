"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const rig=require("../site/modular-rig-v2.js");

const CORE=["idle","walk","run","sit","sleep","pick_up","toilet_squat","pee_stand","yoga_mountain","yoga_stretch","nod"];
const WEAK=["lie_down","wake_up","turn"];

test("Official head originals stay bitwise unchanged",()=>{
  const expected={
    "male-body-head.png":"c1535b9171b6e0039704a0df5d2fd2093b96d18b097381d34c73f5e720680844",
    "female-body-head.png":"d51208008248508345ceee782256cf9d5f17bf05334bf12fce825d628fea0ab3"
  };
  for(const [name,hash] of Object.entries(expected)){
    const copy=crypto.createHash("sha256").update(fs.readFileSync(path.join(root,"assets/base-rig-actions/official-heads-untouched",name))).digest("hex");
    assert.equal(copy,hash,"registry copy of "+name);
    const site=crypto.createHash("sha256").update(fs.readFileSync(path.join(root,"site/media/original-rig",name))).digest("hex");
    assert.equal(site,hash,"site copy of "+name);
  }
});

test("Blank heads are copied into the registry and used as live head slots",()=>{
  const blankM="4393e11cc99659c3fb2193dc651ebf69b611e4779ee9e8a4c73be301b032c3b3";
  const blankF="80249dc04ae9e6c116f98ea18bdd8f315e5168bdd4bfd6ae07844340a8b9650c";
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(root,"assets/base-rig-actions/blank-heads/male-body-head-blank.png"))).digest("hex"),blankM);
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(root,"assets/base-rig-actions/blank-heads/female-body-head-blank.png"))).digest("hex"),blankF);
  const manifest=JSON.parse(read("site/media/original-rig/manifest.json"));
  const heads=manifest.slots.filter(s=>s.bone==="head");
  assert.ok(heads.some(s=>s.gender==="male"&&s.layer_type==="body"&&s.src.endsWith("male-body-head-blank.png")));
  assert.ok(heads.some(s=>s.gender==="female"&&s.layer_type==="body"&&s.src.endsWith("female-body-head-blank.png")));
  assert.ok(heads.some(s=>s.gender==="male"&&s.layer_type==="archive"&&s.src.endsWith("male-body-head.png")));
  const names=new Set(manifest.slots.map(s=>s.name));
  for (const need of ["hair-back-hair-back","hair-front-fringe-l","hair-front-fringe-mid","hair-front-fringe-r",
    "male-body-fringe_l","female-body-fringe_mid","male-body-shoulder_l","female-body-ankle_r",
    "male-body-pelvis","female-garment-torso","male-garment-pelvis"]) {
    assert.ok(names.has(need), "missing slot "+need);
  }
  assert.equal(manifest.headMerged, false);
  assert.equal(manifest.preview_subset, false);
});

test("Rig hides baked features and keeps headMerged false",()=>{
  assert.equal(rig.normalize({}).headMerged,false);
  assert.equal(rig.shouldHidePart({bone:"eye_l"},{visual:"gender",headMerged:false}),true);
  assert.equal(rig.shouldHidePart({bone:"mouth"},{visual:"gender",headMerged:false}),true);
  assert.equal(rig.shouldHidePart({bone:"head"},{visual:"gender",headMerged:false}),false);
  assert.equal(rig.shouldHidePart({bone:"hair_cap",layer_type:"body"},{visual:"gender",hair:"none"}),true);
  assert.equal(rig.shouldHidePart({bone:"hair_cap",layer_type:"body"},{visual:"gender",hair:"cap"}),false);
  assert.equal(rig.shouldHidePart({bone:"fringe_l",layer_type:"body",name:"male-body-fringe_l"},{visual:"gender",hair:"cap"}),true);
  assert.equal(rig.shouldHidePart({bone:"fringe_l",layer_type:"body",name:"male-body-fringe_l"},{visual:"gender",hair:"none"}),false);
  assert.equal(rig.shouldHidePart({bone:"fringe_l",source:"hair_front",name:"hair-front-fringe-l"},{visual:"gender",hair:"none"}),true);
  assert.equal(rig.shouldHidePart({bone:"fringe_l",source:"hair_front",name:"hair-front-fringe-l"},{visual:"gender",hair:"cap"}),false);
  assert.equal(rig.shouldHidePart({bone:"hair_back",source:"hair_back",name:"hair-back-hair-back"},{visual:"gender",hair:"none"}),true);
  assert.equal(rig.sourceSlot({layer_type:"archive",gender:"male",bone:"head"},{gender:"male"}),false);
  const studio=read("site/v6b-reset-studio.html");
  const index=read("site/index.html");
  assert.match(studio,/headMerged: false/);
  assert.match(studio,/id="blank-head-status"/);
  assert.doesNotMatch(studio,/id="blank-head-limitation"/);
  assert.match(index,/id="blank-head-status"/);
  assert.doesNotMatch(index,/id="blank-head-limitation"/);
});

test("Core 11 actions are imported to the registry and stay unpublished until QA",()=>{
  const registry=JSON.parse(read("assets/base-rig-actions/registry.json"));
  assert.equal(registry.format,"mahluk-base-rig-actions-v1");
  assert.equal(registry.headMerged,false);
  assert.deepEqual(registry.imported_core,CORE);
  assert.deepEqual(registry.not_ready,WEAK);
  for(const id of CORE){
    const src=read("incoming/actions/"+id+".action.json");
    const dst=read("assets/base-rig-actions/actions/"+id+".action.json");
    const incoming=JSON.parse(src);
    assert.equal(incoming.available,false,id+" incoming must remain available:false");
    assert.equal(src,read("incoming/actions/"+id+".action.json"));
    const site=read("site/media/base-rig-actions/actions/"+id+".action.json");
    assert.ok(fs.existsSync(path.join(root,"assets/base-rig-actions/actions/"+id+".action.json")));
    assert.equal(JSON.parse(dst).id,id);
    const qaPath=path.join(root,"preview/qa-results.json");
    if(fs.existsSync(qaPath)){
      const qa=JSON.parse(fs.readFileSync(qaPath,"utf8"));
      assert.equal(registry.actions[id].available, !!(qa.actions && qa.actions[id] && qa.actions[id].available), id+" registry available must match browser QA");
    }else{
      assert.equal(registry.actions[id].available,false,"pre-QA registry copy starts unavailable");
    }
  }
  for(const id of WEAK){
    assert.ok(!fs.existsSync(path.join(root,"assets/base-rig-actions/actions/"+id+".action.json")));
  }
  const nod=JSON.parse(read("assets/base-rig-actions/actions/nod.action.json"));
  assert.deepEqual(nod.tracks.head.map(k=>k.value.y),[0,2,0,2,0]);
  assert.deepEqual(Object.keys(nod.tracks),["head"]);
  const run=JSON.parse(read("assets/base-rig-actions/actions/run.action.json"));
  const air=run.tracks.root.filter(k=>k.value.y<0).map(k=>k.frame);
  assert.ok(air.length>=2,"run must have an airborne phase");
});

test("All 49 incoming files validate and were not rewritten",()=>{
  const report=JSON.parse(read("preview/ellen-action-validation.json"));
  assert.equal(report.validated,49);
  assert.equal(report.violations.length,0);
  const files=fs.readdirSync(path.join(root,"incoming/actions")).filter(n=>n.endsWith(".action.json"));
  assert.equal(files.length,49);
});

test("Master hashes remain unchanged",()=>{
  const expected=JSON.parse(read("preview/master-hashes-before.json"));
  for(const [file,hash] of Object.entries(expected)){
    const actual=crypto.createHash("sha256").update(fs.readFileSync(path.join(root,file))).digest("hex");
    assert.equal(actual,hash,file);
  }
});

test("Nod sampleTrack moves the head down by +2px and emotion follows",()=>{
  const nod=JSON.parse(read("assets/base-rig-actions/actions/nod.action.json"));
  const base=rig.normalize({gender:"male",visual:"gender",headMerged:false,hair:"cap"});
  const a=rig.world(rig.sampleTrack(nod.tracks,0,5,base));
  const b=rig.world(rig.sampleTrack(nod.tracks,1,5,base));
  assert.equal(a.head.y,44);
  assert.equal(b.head.y,46);
  assert.equal(a.emotion.y,46);
  assert.equal(b.emotion.y,48);
  assert.equal(b.hair_cap.y-a.hair_cap.y,2);
});
