"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const BODY=require("../site/universal-body-actions.js");
const names=["use_toilet","pee","poop","toilet","bathe","shower","bath"];
for(const name of names)assert.ok(BODY.rule(name),"No universal action for "+name);
for(const name of ["sit","walk","sleep","work"])
 assert.equal(BODY.rule(name),null,"Normal actions must keep original clothing");
const male={id:"custom_human_n",baseId:"human_male_base",gender:"male",skinTone:"tan"};
const female={id:"custom_human_f",baseId:"human_female_base",gender:"female",skinTone:"deep"};
const citizen={id:"legacy_ichsan",category:"npc"};
const robot={id:"grok_bot",category:"npc"};
for(const ch of [male,female,citizen]){
 for(const action of names){
  const rule=BODY.resolve(ch,action);
  assert.ok(rule,ch.id+" missing "+action);
  assert.equal(rule.frames,4);
  assert.deepEqual([...rule.directions],["se","sw","ne","nw"]);
  assert.ok(rule.sheet.startsWith("media/human-"));
  assert.equal(rule.source,"universal-human-body");
  assert.equal(rule.coverage,["bathe","shower","bath"].includes(action)?"full":"lower");
 }
}
assert.equal(BODY.resolve(male,"use_toilet").sheet,
 "media/human-male-base-action-sit.png");
assert.equal(BODY.resolve(female,"bathe").sheet,
 "media/human-female-base-action-bathe.png");
assert.equal(BODY.resolve(citizen,"bathe").bodyType,"neutral");
assert.equal(BODY.resolve(robot,"bathe"),null,"Do not convert robots to human anatomy");
assert.equal(BODY.resolve(female,"walk"),null);
const actorFace=new Uint8ClampedArray(64*112*4);
for(let y=35;y<49;y++)for(let x=20;x<40;x++){
 const k=(y*64+x)*4;actorFace.set([147,101,76,255],k);
}
const tone=BODY.recolorTone({data:actorFace});
assert.deepEqual(tone,[147,101,76],"Must sample actual actor skin, not hardcode light mannequin skin");
const img={data:new Uint8ClampedArray([214,171,135,255,25,24,25,255])};
BODY.recolorBody(img,tone);
assert.ok(img.data[0]<195&&img.data[0]>80);
assert.deepEqual([...img.data.slice(4)],[25,24,25,255],
 "Black facial outlines must not be recoloured");
const script=fs.readFileSync("site/app.js","utf8");
const anim=fs.readFileSync("site/animations.js","utf8");
const index=fs.readFileSync("site/index.html","utf8");
assert.match(script,/UNIVERSAL_BODY\.apply/);
assert.match(script,/body_override:"toilet_lower"/);
assert.match(script,/body_override:"bath_full"/);
assert.ok(index.indexOf("universal-body-actions.js")<index.indexOf("app.js"));
assert.match(anim,/bathe_male_v1/);assert.match(anim,/bathe_female_v1/);
console.log("PASS WC bare lower body, male/female nude bathing and character-matched skin in four views");
