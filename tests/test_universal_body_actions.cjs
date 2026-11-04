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
 "media/human-male-base-action-toilet.png");
assert.equal(BODY.resolve(male,"use_toilet").facePolicy,"action-context");
assert.equal(BODY.resolve(citizen,"use_toilet").facePolicy,"preserve-actor");
assert.equal(BODY.resolve(citizen,"use_toilet").sheet,
 "media/human-male-base-action-sit.png");
assert.equal(BODY.resolve(female,"bathe").sheet,
 "media/human-female-base-action-bathe.png");
assert.equal(BODY.resolve(citizen,"bathe").bodyType,"neutral");
assert.equal(BODY.resolve(robot,"bathe"),null,"Do not convert robots to human anatomy");
assert.equal(BODY.resolve(female,"walk"),null);
for(const actor of [{id:"human_male_base",gender:"male"},{id:"human_female_base",gender:"female"}]){
 const soak=BODY.resolve(actor,"bathtub_bathe");
 assert.ok(soak,"Native Human base needs a real bathtub template");
 assert.equal(soak.kind,"bathtub");
 assert.equal(soak.coverage,"horizontal");
 assert.equal(soak.frames,6);
 assert.equal(soak.frameMs.length,6);
 assert.equal(soak.sheet,"media/human-"+actor.gender+"-base-action-bathtub_bathe.png");
}
for(const actor of [male,female])
 assert.equal(BODY.resolve(actor,"bathtub_bathe"),null,
  "Custom characters must retain their OWN head and LIE pose rather than the base mannequin");
assert.ok(BODY.rule("bathtub_bathe"));
const foamDraws=[];
const foamCtx={fillRect(...args){foamDraws.push(args)},fillStyle:""};
assert.equal(BODY.drawBathFoam(foamCtx,{frame:0}),true);
assert.ok(foamDraws.length>=12,"Foam visible in an isolated native actor frame");
const first=foamDraws[0].join(",");
foamDraws.length=0;
assert.equal(BODY.drawBathFoam(foamCtx,{frame:2}),true);
assert.notEqual(foamDraws[0].join(","),first,"Bath foam should animate independently");
assert.equal(BODY.resolve(citizen,"bathtub_bathe"),null,
 "Unknown body type must not borrow an unrelated adult human's face");
assert.equal(BODY.resolve(robot,"bathtub_bathe"),null);

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
const foamPixels={data:new Uint8ClampedArray([
  236,250,252,235, 147,213,227,255,
  214,171,135,255, 25,24,25,255
])};
BODY.recolorBody(foamPixels,[125,84,66]);
assert.deepEqual([...foamPixels.data.slice(0,4)],[236,250,252,235],
 "White bath foam must NEVER turn into skin color");
assert.deepEqual([...foamPixels.data.slice(4,8)],[147,213,227,255],
 "Blue water must NEVER turn into skin color");
assert.ok(foamPixels.data[8]<214,
 "Only warm body pixels should inherit darker skin tone");
const script=fs.readFileSync("site/app.js","utf8");
const anim=fs.readFileSync("site/animations.js","utf8");
const index=fs.readFileSync("site/index.html","utf8");
assert.match(script,/UNIVERSAL_BODY\.apply/);
assert.match(script,/body_override:"toilet_lower"/);
assert.match(script,/body_override:"bath_full"/);
assert.match(script,/const choices=\[/,"Character motion list must feature Bathtub for every actor");
assert.match(script,/drawBathFoam/,"Other character bath preview must overlay foam");
assert.ok(index.indexOf("universal-body-actions.js")<index.indexOf("app.js"));
assert.match(anim,/bathe_male_v1/);assert.match(anim,/bathe_female_v1/);
assert.match(anim,/bathtub_bathe_male_v1/);
assert.match(anim,/bathtub_bathe_female_v1/);
assert.match(anim,/APPROVED_ANIMATION_IDS/,
 "Published bathtub GIFs must be admitted by the animation browser's visible whitelist");
const actionEditor=fs.readFileSync("site/action-editor.js","utf8");
assert.match(actionEditor,/row\.id==="bathtub_bathe"/,
 "Action Editor must display bathtub for the selected actor, even before actor-specific rigging");
assert.match(actionEditor,/bathtub_bathe:\["bathtub_bathe","lie"\]/,
 "Authoring preview must prefer genuine horizontal bathtub frames");
// Body gender and skin palette are inherited from the immutable template.
assert.equal(BODY.bodyType({id:"custom_human_f",baseId:"human_female_base"}),"female");
assert.equal(BODY.bodyType({id:"custom_human_m",baseId:"human_male_base"}),"male");
assert.equal(BODY.resolve({baseId:"human_female_base"},"bathe").bodyType,"female");

// The human avatar must NOT discard independently painted shirt/pants/shoes.
const editor=fs.readFileSync("site/accessory-editor.js","utf8");
const paint=fs.readFileSync("site/accessory-editor.html","utf8");
const home=fs.readFileSync("site/index.html","utf8");
for(const key of ["hair","shirt","pants","shoes"]){
 assert.ok(script.includes('"'+key+'"'),"Missing equipment slot "+key);
 assert.ok(editor.includes('"'+key+'"'),"Missing painter category "+key);
}
assert.ok(script.includes('["helmet","bag","hair","shirt","pants","shoes"].includes(x.category)'),
 "Human assets were filtered out of the equipment storage loader");
assert.ok(home.includes('id="custom-skin-tone"'));
assert.ok(home.includes('id="custom-hair"'));
assert.ok(home.includes('id="custom-draw-hair"'));
assert.ok(paint.includes('id="acc-hair"'));
assert.match(script,/skinTone:HUMAN_BASES.includes\(row.base\)/);

// Palette matching only recolors the human base; untouched sprite art and
// equipment (including black outlines) keep their original pixel colours.
const frameData=new Uint8ClampedArray(64*112*4);
for(let i=0;i<frameData.length;i+=4)frameData.set([222,180,146,255],i);
frameData.set([19,20,21,255],(42*64+32)*4);
frameData.set([15,160,215,255],(80*64+32)*4);
const sampleCtx={
 getImageData(){return {data:new Uint8ClampedArray(frameData)}},
 putImageData(v){frameData.set(v.data)}
};
assert.equal(BODY.tintBase(sampleCtx,{baseId:"human_female_base",skinTone:"deep"}),true);
assert.ok(frameData[(65*64+32)*4]<200,"Body skin should change");
assert.deepEqual([...frameData.slice((42*64+32)*4,(42*64+32)*4+4)],[19,20,21,255],
 "Outline must not become skin coloured");
assert.deepEqual([...frameData.slice((80*64+32)*4,(80*64+32)*4+4)],[15,160,215,255],
 "Non-skin pixels must be unchanged");
assert.equal(BODY.tintBase(sampleCtx,{baseId:"astrofrich_base",skinTone:"deep"}),false);
console.log("PASS modular gender bases, independently saved equipment/hair, skin palettes and bath");
