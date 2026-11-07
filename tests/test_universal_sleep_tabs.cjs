"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict");
const actor=fs.readFileSync("site/universal-sleep.js","utf8");
const build=fs.readFileSync("tools/build_animation_catalog.py","utf8");
for(const id of ["sleep_bed_right","sleep_bed_left"]){
 assert.ok(actor.includes(id),"Universal source does not declare "+id);
 assert.ok(build.includes(id),"Native renderer not publishing "+id);
}
console.log("PASS universal bed actions remain declared in universal-sleep.js and the catalog builder");
