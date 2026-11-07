"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const registry=JSON.parse(fs.readFileSync("assets/animation_library/actions.json","utf8")).actions;
const bindings=JSON.parse(fs.readFileSync("assets/animation_library/gameplay_bindings.json","utf8"));
const root=fs.readFileSync("tools/build_character_catalog.py","utf8");
const bridge=fs.readFileSync("site/action-frame-bridge.js","utf8");
const all=new Set(registry.map(x=>x.id));
assert.equal(registry.length,204,"Existing 203 canonical action definitions must not disappear");
assert.equal(all.size,204,"Canonical action IDs must remain unique");
assert.equal(registry.filter(x=>x.status==="planned").length,197,
 "Unrendered sprites cannot be relabelled as playable");
assert.equal(registry.filter(x=>x.status!=="planned").length,7);
assert.ok([...new Set(registry.map(x=>x.category))].length>=13);
assert.equal(bindings.bindings.length,16,"Every Bangun Ruang action verb needs a mapping");
assert.equal(new Set(bindings.bindings.map(x=>x.game_action)).size,16);
assert.equal(bindings.variants.length,4);
assert.equal(bindings.posture_presets.length,6);
for(const p of bindings.posture_presets){
 assert.ok(["squat_idle","squat_down","squat_up","knee_chest_idle","bent_over_idle","lie_idle"].includes(p.id));
 assert.deepEqual(p.directions,["se","sw","ne","nw"]);
 assert.deepEqual(p.pivot,[32,100]);
 assert.equal(p.frames,["squat_down","squat_up"].includes(p.id)?6:4);
}
for(const row of [...bindings.bindings,...bindings.variants]){
 assert.ok(all.has(row.animation_action),"Unknown canonical animation ID: "+row.animation_action);
 assert.ok(/^[a-z_]+$/.test(row.game_action));
 if(row.fixtures)assert.ok(Array.isArray(row.fixtures));
}
for(const id of ["use_toilet","pee","poop","sleep","rest","sit","relax","work","study",
 "bathe","wash","cook","buy","sell","browse","open"])
 assert.ok(bindings.bindings.some(x=>x.game_action===id),id+" not connected");
for(const id of ["clock_in","clock_out","office_type","take_order","accept_payment","serve_food",
 "phone_scroll","study_online","ride_motor","wait_bus","hail_ojek","pee_wall","fart","pet_cat"])
 assert.ok(all.has(id),"Missing critical open-world action: "+id);
assert.ok(root.includes('OUT / "player-actions.json"'),"Player registry not published with site");
assert.ok(root.includes('OUT / "gameplay-bindings.json"'),"Game binding registry not published");
assert.ok(bridge.includes("registerActions"),"Shared local frame storage needs registered action IDs");
assert.ok(bridge.includes("function actionData(actor,action)"),"Saved frames must remain accessible in Semesta");
assert.match(fs.readFileSync("site/universal-sleep.js","utf8"),/sleep_bed_right/);
console.log("PASS player-action DB: 204 canonical definitions, 16 game bindings + 4 variants, 208 registered action IDs including 2 universal native bed poses, honest rig states and cross-app wiring");
