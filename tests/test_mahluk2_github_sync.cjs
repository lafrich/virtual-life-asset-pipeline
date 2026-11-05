"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),S=require("../site/mahluk-2/github-master-sync.js");
const doc=t=>({format:"mahluk-2-general-rig-v1",version:1,revision:1,savedAt:t,rules:{},defaultParts:{}});
test("validates published masters not placeholder",()=>{assert.ok(S.valid(doc("2026-11-06")));assert.ok(!S.valid({...doc("2026-11-06"),revision:0}));});
test("preserves newer unsynced PC master",()=>{const recent=doc("2026-11-06"),old=doc("2026-11-04");
 assert.equal(S.adopt(recent,old,null),false);assert.equal(S.adopt(null,recent,null),true);
 assert.equal(S.adopt(old,recent,null),true);assert.equal(S.adopt(recent,old,{sha:"sha",savedAt:"2026-11-04"}),false);});
test("never publishes without authorization",async()=>{await assert.rejects(S.publish(doc("2026-11-06"),{}),/Connect GitHub/);});
