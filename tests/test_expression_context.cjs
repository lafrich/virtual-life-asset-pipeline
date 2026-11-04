"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const db=JSON.parse(fs.readFileSync("assets/animation_library/expression_contexts.json","utf8"));
const E=require("../site/expression-context.js");
assert.equal(E.validate(db),true);
assert.equal(db.gallery.length,9);
const counts={walk:6,idle:4,sit:4,sit_type:4,sleep_seat:4,nap_stand:4,
 talk:4,lie:4,bathe:4,bathtub_bathe:6,
 squat_idle:4,bent_over_idle:4,lie_idle:4};
for(const [id,n]of Object.entries(counts)){
 assert.equal(E.track(db,id).length,n,id);
 assert.equal(E.at(db,id,n),E.at(db,id,0),id+" face sequence wraps");
}
assert.deepEqual(db.motions.talk,["talk_closed","talk_open","talk_open","talk_closed"]);
assert.deepEqual([...new Set(db.motions.sleep_seat)],["blink"]);
assert.equal(E.at(db,"cry",1),"sad");
assert.equal(E.at(db,"squat_idle",2),"blink");
assert.equal(E.at(db,"bent_over_idle",3),"embarrassed");
assert.equal(E.at(db,"lie_idle",0),"sleepy");
assert.equal(E.at(db,"fart",1),"embarrassed");
assert.equal(E.at(db,"bathe",2),"happy");
assert.equal(E.playbackFace(db,{id:"walk"},2,
 {id:"angry",motion_sheets:{walk:"actor-walk-angry.png"}},false).sheet,
 "actor-walk-angry.png");
const unsupported=E.playbackFace(db,{id:"talk"},1,
 {id:"angry",motion_sheets:{idle:"actor-idle-angry.png"}},false);
assert.equal(unsupported.source,"action");
assert.equal(unsupported.id,"talk_open");
assert.equal(E.validate({...db,motions:{walk:["missing"]}}),false);
const html=fs.readFileSync("site/index.html","utf8");
const app=fs.readFileSync("site/app.js","utf8");
assert.ok(html.indexOf("expression-context.js")<html.indexOf("app.js"));
assert.ok(html.includes('id="motion-auto-face"'));
assert.ok(app.includes("state.expressionContext=faceDatabase"));
assert.ok(app.includes("syncActionFaceLabel()"));
console.log("PASS contextual expression DB, action face sequences, non-cross-actor manual fallback");
