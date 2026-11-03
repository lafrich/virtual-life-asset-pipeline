"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const db=new Map(),draws=[];
const doc={createElement(tag){
 assert.equal(tag,"canvas");
 return {width:0,height:0,getContext(){return{imageSmoothingEnabled:false,
 drawImage(...args){draws.push(args)}}},
 toDataURL(){return "data:image/png;base64,QUJDRA=="}};
}};
const win={localStorage:{getItem:k=>db.get(k)||null,setItem:(k,v)=>db.set(k,String(v))},
 document:doc,dispatchEvent(){}};
const sandbox={window:win,CustomEvent:class{constructor(name,detail){this.type=name;this.detail=detail}},console};
vm.runInNewContext(fs.readFileSync("site/universal-rig.js","utf8"),sandbox);
const Rig=win.VLUniversalRig;
assert.ok(Rig,"Universal rig must initialize");
assert.equal(Object.keys(Rig.categoryNames).length,7);
assert.equal(Rig.bones.includes("hand_near"),true);
assert.equal(Rig.bones.includes("knee_far"),true);
assert.equal(Rig.suggestCategory({species:"human",prompt:"long hair",body:"female"}),"human_long_hair");
assert.equal(Rig.suggestCategory({species:"human",prompt:"blue dress"}),"human_skirt_dress");
assert.equal(Rig.suggestCategory({species:"animal",prompt:"cat",body:"custom"}),"nonhuman_custom");
const spec={name:"Alya",species:"human",body:"female",proportion:"standard",prompt:"long hair, green hoodie"};
const colors={skin:"#d6a88c",hair:"#39312f",upper:"#517e5b",lower:"#53647f",feet:"#343640"};
let row=Rig.createBase(spec,colors);
assert.equal(row.status,"draft_base");
row=Rig.save(row);
assert.equal(Rig.list().length,1);
assert.equal(Rig.get(row.id).name,"Alya");
row=Rig.save({...row,status:"base_approved"});
const rig=Rig.buildRig(row,Rig.suggestCategory(spec),["core","interior","job"]);
assert.equal(rig.family,"humanoid_v1");
assert.equal(rig.animationSlots.idle,"test_required");
assert.equal(rig.animationSlots.cook,"not_authored");
assert.ok(rig.anchors.root);
assert.ok(rig.attach.back);
const fakeRenderer={render(_spec,dir,_colors,kind,frame){
 const tag=kind==="walk"?frame:0;
 return {width:64,height:112,getContext(){return {getImageData(){return{data:Uint8Array.from([tag,dir.charCodeAt(0),0,255])}}}}};
}};
const candidate={...row,status:"rigging",rig};
const check=Rig.testCore(candidate,fakeRenderer);
assert.equal(check.pass,true,JSON.stringify(check.errors));
const ready=Rig.save(Rig.finishRig(candidate,check));
assert.equal(ready.status,"rig_ready");
assert.equal(Rig.canPreview(ready,"walk"),true);
assert.equal(Rig.canPreview(ready,"toilet"),false);
const sheet=Rig.sourceSheet(ready,fakeRenderer);
assert.equal(sheet,"data:image/png;base64,QUJDRA==");
assert.equal(draws.length,40,"6 walk + 4 idle frames for each of four directions");
const nonhumanoid={...ready,status:"rigging",rig:Rig.buildRig(ready,"nonhuman_custom",["core"])};
assert.equal(Rig.testCore(nonhumanoid,fakeRenderer).pass,false);
assert.equal(Rig.remove(row.id),true);
assert.equal(Rig.list().length,0);
console.log("PASS universal 2D rig categories, local asset storage, four-view core test and extension slots");
