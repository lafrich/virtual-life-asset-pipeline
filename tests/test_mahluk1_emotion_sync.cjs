"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const bridge=require("../site/emosi-bridge.js");
test("Mahluk Hidup 1 filters Emosi faces by actor base without modifying original rig",()=>{
  assert.equal(bridge.compatible("universal",{id:"legacy_theodore"}),true);
  assert.equal(bridge.compatible("male",{id:"human_male_base"}),true);
  assert.equal(bridge.compatible("female",{id:"human_male_base"}),false);
  assert.equal(bridge.compatible("original",{template_category:"human"}),false);
  const actor={id:"human_male_base",expressions:[{id:"neutral",label:"Native"}]};
  assert.equal(bridge.apply(actor).expressions[0].id,"neutral");
});
test("Mahluk Hidup imports Emosi catalog and preserves native face atlas",()=>{
  const studio=fs.readFileSync("site/v6p-studio.html","utf8");
  const src=fs.readFileSync("site/emosi-bridge.js","utf8");
  assert.match(studio,/emosi-bridge\.js/);
  assert.match(src,/source:"emosi"/);
  const reset=require("node:fs").readFileSync("site/character-reference-reset.js","utf8");
  assert.match(reset,/active:false/);
  assert.doesNotMatch(studio,/mahluk-2\//);
  assert.doesNotMatch(studio,/v6b-reset-studio\.html/);
});
