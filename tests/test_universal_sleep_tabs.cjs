"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict");
const html=fs.readFileSync("site/index.html","utf8");
const ui=fs.readFileSync("site/animations.js","utf8");
const editor=fs.readFileSync("site/action-editor.js","utf8");
const actor=fs.readFileSync("site/universal-sleep.js","utf8");
const build=fs.readFileSync("tools/build_animation_catalog.py","utf8");
for(const id of ["sleep_bed_right","sleep_bed_left"]){
 assert.ok(ui.includes(id),"Animation tab not whitelisting "+id);
 assert.ok(actor.includes(id),"Universal source does not declare "+id);
 assert.ok(build.includes(id),"Native renderer not publishing "+id);
}
assert.ok(html.indexOf("universal-sleep.js")<html.indexOf("animations.js"));
assert.match(ui,/window\.VLUniversalSleep\?\.actionsFor\(ch\)/);
assert.match(ui,/clip\.universal && clip\.status === "ready"/);
assert.ok(editor.includes("state.actions=[...universal,...compatActions,...definitions.actions]"),
 "The two universal bed actions must be the FIRST entries, not after 200+ actions");
assert.ok(editor.includes("Boolean(SLEEP?.resolve(actor(),row.id))"),
 "Action Editor should visibly list native sleep without local saved frames");
console.log("PASS universal bed actions are visible in Animations and pinned in Action Editor");
