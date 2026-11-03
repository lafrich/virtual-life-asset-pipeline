"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const store=new Map();
global.localStorage={
 getItem(k){return store.get(k)||null;},
 setItem(k,v){store.set(k,v);},
 removeItem(k){store.delete(k);}
};
const patch=require("../site/action-frame-bridge.js");
const PNG="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";
assert.equal(patch.get("ichsan","toilet","sw",0),null);
assert.deepEqual(patch.offset("ichsan","sleep"),{x:0,y:0});
assert.throws(()=>patch.set("ichsan","sit","sw",0,PNG),/Invalid/);
assert.throws(()=>patch.set("ichsan","toilet","sw",40,PNG),/Invalid/);
assert.throws(()=>patch.set("ichsan","toilet","sw",0,"https://unsafe.example/a.png"),/PNG/);
patch.set("ichsan","toilet","sw",0,PNG);
patch.set("human_female_base","bathe","se",1,PNG);
patch.setOffset("ichsan","toilet",-3,5);
assert.equal(patch.get("ichsan","toilet","sw",0),PNG);
assert.equal(patch.get("human_female_base","bathe","se",1),PNG);
assert.deepEqual(patch.offset("ichsan","toilet"),{x:-3,y:5});
patch.invalidate();
assert.equal(patch.get("ichsan","toilet","sw",0),PNG);
patch.remove("ichsan","toilet","sw",0);
assert.equal(patch.get("ichsan","toilet","sw",0),null);
assert.equal(patch.get("human_female_base","bathe","se",1),PNG,"separate actors remain isolated");
assert.throws(()=>patch.setOffset("ichsan","toilet",99,0),/32/);
const html=fs.readFileSync("site/action-editor.html","utf8");
const ui=fs.readFileSync("site/action-editor.js","utf8");
const gallery=fs.readFileSync("site/index.html","utf8");
for(const type of ["wc","shower","bathtub","bed"])
 assert.ok(ui.includes(type),"Action preview must use real Bangun furniture "+type);
for(const tool of ["actor","action","direction","building","floor","furniture",
 "simulation","pixel","frame","offset-x","offset-y","save","sync"])
 assert.ok(html.includes('id="'+tool+'"'),"Missing action editor control "+tool);
assert.ok(html.includes("/virtual-office/world-builder/bangun-ruang/interior-isometric.js"),
 "Simulator must import the canonical Bangun Ruang renderer");
assert.ok(ui.includes("ISO.actionAnchor(state.prop)"),"Must use canonical WC and bed docking");
assert.ok(ui.includes('localStorage.getItem(key)'),"Must use same-origin local Bangun Ruang browser storage");
assert.ok(gallery.includes('id="action-studio"'));
const studio=fs.readFileSync("site/app.js","utf8");
assert.ok(studio.includes("openActionEditor()"));
console.log("PASS Mahluk Hidup per-frame action edit storage, character isolation, floor/fixture UI and Bangun Ruang simulator imports");
