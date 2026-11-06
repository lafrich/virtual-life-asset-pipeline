"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const B=require("../site/mahluk-2/body-planes.js");
const make=(bone,gender,layer_type,expression=false)=>({bone,gender,layer_type,expression});
const original=()=>({base:"original",outfit:"outfit",bodyPlane:"current"});
test("native clothed layout remains untouched in current mode",()=>{
 const state=original();
 assert.equal(B.selected(make("torso"),state),true);
 assert.equal(B.selected(make("torso","male","body"),state),false);
 assert.equal(B.selected(make("head"),state),true);
 assert.equal(B.selected(make("glasses"),state),true);
});
test("nude male only replaces body parts and suppresses all clothes",()=>{
 const state={...original(),bodyPlane:"male"};
 for(const bone of B.BONE_IDS){
  assert.equal(B.selected(make(bone),state),false,"remove original "+bone);
  assert.equal(B.selected(make(bone,"male","body"),state),true,"native male "+bone);
  assert.equal(B.selected(make(bone,"female","body"),state),false,"no female "+bone);
  assert.equal(B.selected(make(bone,"male","garment"),state),false,"no garment "+bone);
 }
 for(const bone of ["head","neck","emotion","glasses","hair_back","fringe_l","phone"]){
  assert.equal(B.selected(make(bone),state),true,"keep nonbody "+bone);
  assert.equal(B.selected(make(bone,"male","body"),state),false,"do not replace "+bone);
 }
 assert.equal(B.normalize("INVALID"),"current");
});
test("female nude swap respects existing Male base head and independent face",()=>{
 const state={base:"male",outfit:"outfit",bodyPlane:"female"};
 assert.equal(B.selected(make("head","male","body"),state),true);
 assert.equal(B.selected(make("head","female","body"),state),false);
 assert.equal(B.selected(make("shoulder_l","male","body"),state),false);
 assert.equal(B.selected(make("shoulder_l","female","body"),state),true);
 assert.equal(B.selected(make("shoulder_l","male","garment"),state),false);
 assert.equal(B.selected(make("mouth",undefined,undefined,true),state),true);
});
test("body replacement uses the painter order of the original cutout",()=>{
 const atlas=[make("hair_back"),make("torso"),make("head"),make("fringe_l"),make("torso","male","body")];
 assert.equal(B.drawIndex(atlas[4],4,atlas,"male","original")<3,true);
 assert.equal(B.drawIndex(atlas[4],4,atlas,"current","original"),4);
 assert.equal(B.drawIndex(atlas[4],4,atlas,"male","female"),4);
});
test("2.0 UI exposes body plane selector and keeps snapshots, JSON and game sprite baking aligned",()=>{
 const app=fs.readFileSync("site/mahluk-2/studio.js","utf8");
 const html=fs.readFileSync("site/mahluk-2/index.html","utf8");
 assert.match(html,/id="bodyPlane"/);
 assert.match(html,/body-planes.js/);
 assert.match(app,/remember\(\);bodyPlane=next;invalidateHead\(\);setProjectFields\(\);buildTree\(\);paint\(\)/);
 assert.match(app,/selected,type,outfit,bodyPlane,clip/);
 assert.match(app,/outfit,bodyPlane,model:R.normalize/);
 assert.match(app,/const payload=.*?outfit,bodyPlane,clip/);
 assert.match(app,/bodyPlane=B.matchingBase\(type,r.bodyPlane===undefined\?/);
 assert.match(app,/bodyPlane=B.matchingBase\(type,v.bodyPlane===undefined\?/);
 assert.match(app,/B\.selected\(s,\{base:type,outfit,bodyPlane\}\)/);
});

test("Male/Female base automatically chooses matching nude body, never opposite anatomy",()=>{
 assert.equal(B.defaultForBase("female"),"female");
 assert.equal(B.defaultForBase("male"),"male");
 assert.equal(B.defaultForBase("original"),"current");
 assert.equal(B.matchingBase("male","female"),"male");
 assert.equal(B.matchingBase("female","male"),"female");
 assert.equal(B.matchingBase("male","current"),"current");
 assert.equal(B.matchingBase("female","current"),"current");
 assert.equal(B.matchingBase("original","female"),"female");
});
