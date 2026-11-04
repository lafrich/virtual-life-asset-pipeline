"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const U=require("../site/universal-motion-runtime.js");
const registry=JSON.parse(fs.readFileSync("assets/animation_library/actions.json","utf8")).actions;
const native={id:"native_one",sheet:"media/one.png",row_starts:{walk:0,idle:4},
 motions:[{id:"walk",source:"native",row:0,frames:6,available:true},
  {id:"idle",source:"native",row:4,frames:4,available:true}]};
const human={id:"human_female_base",sheet:"media/female.png",
 motions:[{id:"idle",source:"native",row:4,frames:4,available:true},
  {id:"bathe",source:"custom",sheet:"media/female-bathe.png",frames:4,available:true}]};
const legacy={id:"legacy_only",sheet:"",poster:"media/legacy.png",
 motions:[{id:"actor_special",source:"custom",sheet:"media/legacy-special.png",
  available:true,frames:4}]};
const entries=[...registry,{id:"actor_special",label:"SPECIAL",category:"social"},
 {id:"bathe",label:"BATHE",category:"hygiene"}];
test("same canonical union on native, female and archive actors",()=>{
 assert.equal(registry.length,204);
 const panels=[native,human,legacy].map(a=>U.catalogFor(a,entries));
 for(const p of panels){
  assert.deepEqual(p.map(a=>a.id),entries.map(a=>a.id));
  assert.ok(p.every(a=>a.available));
 }
 assert.equal(panels[0].find(a=>a.id==="walk").playback,"authored");
 assert.equal(panels[1].find(a=>a.id==="bathe").playback,"authored");
 assert.equal(panels[2].find(a=>a.id==="actor_special").playback,"authored");
 assert.equal(panels[2].find(a=>a.id==="dance").playback,"reference");
});
test("procedural fallback stays on this actor's own pixels",()=>{
 const a=U.catalogFor(native,registry).find(x=>x.id==="jump");
 const b=U.catalogFor(human,registry).find(x=>x.id==="jump");
 assert.equal(a.source,"procedural");
 assert.equal(a.prototype.sheet,native.sheet);
 assert.equal(b.prototype.sheet,human.sheet);
 assert.notEqual(a.prototype.sheet,b.prototype.sheet);
 const calls=[],ctx={drawImage(...args){calls.push(args)}};
 assert.equal(U.render(ctx,{action:a,image:{naturalWidth:384,naturalHeight:4928},
  dir:2,frame:2,x:35,y:40,scale:2}),true);
 assert.equal(calls[0][3],64);assert.equal(calls[0][4],112);
 assert.equal(calls[0][7],128);assert.equal(calls[0][8],224);
 assert.ok(calls[0][6]<40,"Jump should move up");
});
test("Bathtub always exists in Male/Female and every actor's motion union",()=>{
 const femaleNative={...human,motions:[...human.motions,
  {id:"bathtub_bathe",source:"custom",sheet:"media/female-soak.png",
   frames:6,available:true}]};
 const authored=U.catalogFor(femaleNative,registry).find(x=>x.id==="bathtub_bathe");
 assert.equal(authored.playback,"authored");
 assert.equal(authored.frames,6);
 const robot={id:"legacy_robot",sheet:"media/robot-sheet.png",
  motions:[{id:"lie",source:"custom",sheet:"media/robot-lie.png",
   frames:4,available:true}]};
 const auto=U.catalogFor(robot,registry).find(x=>x.id==="bathtub_bathe");
 assert.equal(auto.playback,"procedural");
 assert.equal(auto.primitive,"lie");
 assert.equal(auto.prototype.sheet,"media/robot-lie.png",
  "Never replace robots, aliens and customized humans with the base human atlas");
 assert.equal(auto.frames,6);
 assert.equal(U.catalogFor(native,registry).find(x=>x.id==="bathtub_bathe").prototype.id,
  "idle","No LIE rig still gets an explicitly labelled own-pixel fallback");
 const app=fs.readFileSync("site/app.js","utf8");
 assert.match(app,/const choices=\[/);
 assert.match(app,/m=>m.id==="bathtub_bathe"/);
 assert.match(app,/drawBathFoam/);
});

test("shared search UI and canonical registry are loaded",()=>{
 const app=fs.readFileSync("site/app.js","utf8");
 const html=fs.readFileSync("site/index.html","utf8");
 assert.ok(app.includes("UNIVERSAL_MOTIONS.catalogFor(character,union)"));
 assert.ok(html.includes("universal-motion-runtime.js?v="));
 assert.ok(html.includes('id="motion-search"'));
 assert.ok(html.includes('id="motion-category"'));
 assert.ok(!app.includes('"NEEDS RIG"'));
});

test("unrigged actors cannot fake squat, bent over or reclining idle",()=>{
 const defs=["squat_idle","bent_over_idle","lie_idle"].map(id=>
  ({id,label:id.toUpperCase(),category:"posture"}));
 const none=U.catalogFor(native,defs);
 assert.ok(none.every(p=>p.playback==="reference"));
 const female=U.catalogFor({...human,motions:[
  ...human.motions,...defs.map(d=>({id:d.id,source:"custom",available:true,
   sheet:"media/female-"+d.id+".png",frames:4}))]},defs);
 assert.ok(female.every(p=>p.playback==="authored"&&p.frames===4));
});
