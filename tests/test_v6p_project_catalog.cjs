"use strict";
const assert=require("node:assert/strict");
const path=require("node:path");
const store={};
const memory={};
const root={
 localStorage:{
  getItem(k){return store[k]||null;},
  setItem(k,v){store[k]=String(v);},
  removeItem(k){delete store[k];}
 }
};
global.window=root;
const catalog=require("../site/v6p-part-catalog.js");
root.V6PPartCatalog=catalog;
root.V6PPartOverrides={
 list(){return Object.keys(memory);},
 get(part){return memory[part]||null;}
};
const projects=require("../site/v6p-project-catalog.js");
root.V6PProjectCatalog=projects;

assert.equal(catalog.PARTS.length,133);
assert.equal(catalog.isPart("acc_hat"),false);
const hat=projects.create({type:"accessory",name:"Kacamata merah",placement:"front"});
assert.equal(hat.type,"accessory");
assert.equal(hat.placement,"front");
assert.equal(hat.saveStatus,"local");
assert.match(hat.id,/^acc_/);
assert.ok(projects.get(hat.id));
const back=projects.create({type:"accessory",name:"Ransel",placement:"back"});
assert.equal(back.placement,"back");
const clip=projects.create({type:"clip",name:"Geleng kepala"});
assert.equal(clip.type,"clip");
assert.equal(clip.placement,null);
projects.saveSheet(hat.id,"data:image/png;base64,AAAA",{paintedActions:["idle","walk"],thumbDataUrl:"data:image/png;base64,BBBB"});
const saved=projects.get(hat.id);
assert.equal(saved.sheetDataUrl,"data:image/png;base64,AAAA");
assert.deepEqual(saved.paintedActions,["idle","walk"]);
const compat=projects.compatibility(saved);
assert.match(compat,/Z front/);
assert.match(compat,/Painted: idle, walk/);
assert.match(compat,/Unpainted Semesta clips/);
assert.match(compat,/no auto-animation/i);
assert.match(compat,/sit/);
projects.markDrive(clip.id,{filename:"v6p-user--clip__"+clip.id+".png"});
assert.equal(projects.get(clip.id).saveStatus,"drive");
memory["top/tee"]={dataUrl:"data:image/png;base64,CCCC",updatedAt:"2026-11-07T00:00:00.000Z"};
const entries=projects.entries({includeBuiltIn:true});
assert.ok(entries.some(e=>e.type==="accessory"&&e.name==="Kacamata merah"));
assert.ok(entries.some(e=>e.type==="clip"&&e.saveStatus==="drive"));
assert.ok(entries.some(e=>e.type==="part-edit"&&e.part==="top/tee"));
assert.ok(entries.some(e=>e.origin==="built-in"&&e.part==="top/tee"));
assert.equal(entries.filter(e=>e.origin==="built-in").length,125);
assert.ok(!entries.some(e=>e.origin==="built-in"&&e.part==="top/custom"));
assert.match(projects.editorUrl(hat),/project=/);
assert.match(projects.editorUrl({part:"top/tee"}),/part=top%2Fnude|part=top\/nude/);
assert.doesNotMatch(JSON.stringify(projects.list()),/media\/v6p/);
assert.ok(!catalog.PARTS.includes(hat.id));
assert.throws(()=>projects.create({type:"part-edit",name:"nope"}));
console.log("PASS: user project catalog, compatibility, gallery entries, stock untouched");
