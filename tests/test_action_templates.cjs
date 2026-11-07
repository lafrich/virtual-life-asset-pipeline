"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const saved=new Map();
global.localStorage={
 getItem:k=>saved.get(k)||null,
 setItem:(k,v)=>saved.set(k,v),
 removeItem:k=>saved.delete(k)
};
const frames=require("../site/action-frame-bridge.js");
global.window={VLActionFrames:frames};
const templates=require("../site/action-template-bridge.js");
const PNG="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";
frames.registerActions(["idle","walk","clock_in","clock_out","toilet_sit","cook_stir","phone_scroll","ride_motor"]);
assert.throws(()=>templates.save("ichsan","clock_in",{}),/Paint and SAVE FRAME/);
frames.set("ichsan","clock_in","se",0,PNG);
let t=templates.save("ichsan","clock_in",{name:"Clock In / Office",objectLayer:"behind",
 frameMs:320,frames:4,rotation:90,expression:"sleepy",loop:false});
assert.equal(t.ready,false);
assert.deepEqual(t.coverage.directions.se,[0]);
assert.equal(templates.frame("ichsan","clock_in","se",0),null,"Draft must never be playable");
for(const d of ["sw","ne","nw"])frames.set("ichsan","clock_in",d,0,PNG);
t=templates.get("ichsan","clock_in");
assert.equal(t.ready,true,"One authored frame in each direction can form a hold-frame action");
assert.equal(t.objectLayer,"behind");
assert.equal(t.frameMs,320);
assert.equal(t.rotation,90);
assert.equal(t.expression,"sleepy");
assert.equal(t.loop,false);
assert.equal(templates.get("ichsan","clock_in").rotation,90);
assert.equal(templates.frame("ichsan","clock_in","se",3),PNG,
 "Missing animation slots hold/cycle authored frames, not the idle sheet");
assert.equal(templates.list("ichsan").length,1);
assert.equal(templates.list("human_male_base").length,0);
frames.remove("ichsan","clock_in","nw",0);
assert.equal(templates.get("ichsan","clock_in").ready,false,
 "Deleting the last rear-facing frame unpublishes the playable action");
assert.equal(templates.frame("ichsan","clock_in","ne",0),null);
frames.set("ichsan","clock_in","nw",1,PNG);
assert.equal(templates.get("ichsan","clock_in").ready,true);
assert.equal(templates.frame("ichsan","clock_in","nw",0),PNG);
templates.save("ichsan","clock_in",{name:"Clock In",objectLayer:"front",
 frameMs:120,frames:6,rotation:-90,expression:"angry",loop:true});
assert.equal(templates.get("ichsan","clock_in").objectLayer,"front");
assert.equal(templates.get("ichsan","clock_in").rotation,270);
assert.equal(templates.get("ichsan","clock_in").expression,"angry");
assert.equal(templates.get("ichsan","clock_in").loop,true);
const stored=JSON.parse(saved.get(templates.key));
delete stored.templates["ichsan:clock_in"].rotation;
delete stored.templates["ichsan:clock_in"].expression;
saved.set(templates.key,JSON.stringify(stored));
templates.invalidate();
assert.equal(templates.get("ichsan","clock_in").rotation,0,
 "Existing saved templates without rotation must load upright");
assert.equal(templates.get("ichsan","clock_in").expression,"neutral",
 "Existing saved templates without expression must preserve original pixels");
templates.invalidate();
assert.equal(templates.get("ichsan","clock_in").name,"Clock In");
assert.ok(templates.remove("ichsan","clock_in"));
assert.equal(templates.list("ichsan").length,0);
assert.equal(frames.get("ichsan","clock_in","se",0),PNG,
 "Removing a template does not destroy original local player frame edits");
console.log("PASS 4-view Semesta action templates, draft gating, frame holds, front/back object layer and non-destructive editing");
