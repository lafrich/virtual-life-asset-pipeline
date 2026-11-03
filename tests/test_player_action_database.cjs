"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const registry=JSON.parse(fs.readFileSync("assets/animation_library/actions.json","utf8")).actions;
const bindings=JSON.parse(fs.readFileSync("assets/animation_library/gameplay_bindings.json","utf8"));
const root=fs.readFileSync("tools/build_character_catalog.py","utf8");
const editor=fs.readFileSync("site/action-editor.js","utf8");
const html=fs.readFileSync("site/action-editor.html","utf8");
const bridge=fs.readFileSync("site/action-frame-bridge.js","utf8");
const animations=fs.readFileSync("site/animations.js","utf8");
const index=fs.readFileSync("site/index.html","utf8");
const all=new Set(registry.map(x=>x.id));
assert.equal(registry.length,203,"Existing 203 canonical action definitions must not disappear");
assert.equal(all.size,203,"Canonical action IDs must remain unique");
assert.equal(registry.filter(x=>x.status==="planned").length,196,
 "Unrendered sprites cannot be relabelled as playable");
assert.equal(registry.filter(x=>x.status!=="planned").length,7);
assert.ok([...new Set(registry.map(x=>x.category))].length>=13);
assert.equal(bindings.bindings.length,16,"Every Bangun Ruang action verb needs a mapping");
assert.equal(new Set(bindings.bindings.map(x=>x.game_action)).size,16);
assert.equal(bindings.variants.length,4);
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
assert.ok(editor.includes('new URL("player-actions.json",BASE)'),"Action Editor not loading canonical database");
assert.ok(editor.includes('new URL("gameplay-bindings.json",BASE)'),"Action Editor not loading Bangun bindings");
assert.ok(editor.includes("renderActionList()"),"All actions need an accessible browser file list");
assert.ok(editor.includes('state.actions=[...compatActions,...definitions.actions]'),"All 203 registry actions must be visible");
assert.ok(editor.includes('if(!state.prop')===false,"Unbound actions must still simulate without a fixture");
assert.ok(editor.includes('"PLANNED / UNRENDERED"')&&editor.includes('"LOCAL DRAFT · NOT PUBLISHED"'),
 "Planned or edited-but-unpublished actions must never be labeled playable");
assert.ok(editor.includes('A.entries(state.actor,row.id)'),"Local player sprite work must show coverage per action");
for(const id of ["action-search","action-category","player-action-count",
 "action-readiness","action-coverage","action-requirements"])
 assert.ok(html.includes('id="'+id+'"'),"Missing action editor control: "+id);
assert.ok(index.includes('id="animation-author"'),"Animation roadmap needs an editor entry point");
assert.ok(animations.includes('id=actionForClip(selected)')||animations.includes('const id=actionForClip(selected)'),
 "Editor button must preserve chosen action ID");
assert.ok(animations.includes('openActionTab({actor:selectedTarget()?.id||"ichsan",action:id})'));
console.log("PASS player-action DB: 203 canonical definitions, 16 game bindings + 4 variants, 205 editable action IDs, honest rig states and cross-app wiring");
