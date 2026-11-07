"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const sleep=require("../site/universal-sleep.js");
assert.deepEqual([...sleep.IDs],["sleep_bed_right","sleep_bed_left"]);
const original={
 id:"ichsan",sheet:"media/ichsan-sheet.png",row_starts:{walk:0,idle:4,lie:36},
 motions:[{id:"idle",available:true,frames:4,row:4}]
};
const custom={
 id:"human_female_base",sheet:"media/human-female-base-sheet.png",
 motions:[{id:"lie",name:"LIE",available:true,
  frames:4,row:0,sheet:"media/human-female-base-action-lie.png"}]
};
const clone={...custom,id:"custom_human_maya"};
const unavailable={id:"no_pose",sheet:"media/no-pose.png",
 motions:[{id:"sleep_seat",available:true,frames:4,row:0,
 sheet:"media/no-pose-action-sleep_seat.png"}],row_starts:{walk:0,idle:4}};
for(const actor of [original,custom,clone]){
 for(const id of sleep.IDs){
  const item=sleep.resolve(actor,id);
  assert.ok(item,actor.id+" should inherit "+id);
  assert.equal(item.frames,4);
  assert.equal(item.source,"native-lie");
  assert.equal(item.loop,true);
  assert.equal(item.objectLayer,"behind");
  assert.ok(item.row===0||item.row===36);
  assert.equal(item.frame_ms.length,4);
 }
 assert.equal(sleep.actionsFor(actor).length,2);
}
assert.equal(sleep.resolve(original,"sleep_bed_right").row,36);
assert.equal(sleep.resolve(custom,"sleep_bed_left").sheet,
 "media/human-female-base-action-lie.png");
assert.equal(sleep.resolve(unavailable,"sleep_bed_right"),null);
assert.equal(sleep.resolve({...original,row_starts:{lie:0}},"sleep_bed_right"),null);
assert.equal(sleep.resolve({...original,sheet:"https://evil.invalid/img.png"},"sleep_bed_right"),null);
assert.equal(sleep.resolve({...original,sheet:"media/other.png",motions:[{id:"lie",available:true,
 frames:4,row:0,sheet:"https://untrusted.invalid/x.png"}]},"sleep_bed_right"),null);
assert.equal(sleep.directionFor("sleep_bed_right","se"),"se");
assert.equal(sleep.directionFor("sleep_bed_right","sw"),"sw");
assert.equal(sleep.directionFor("sleep_bed_right","ne"),"ne");
assert.equal(sleep.directionFor("sleep_bed_right","nw"),"nw");
assert.equal(sleep.directionFor("sleep_bed_left","se"),"sw");
assert.equal(sleep.directionFor("sleep_bed_left","sw"),"se");
assert.equal(sleep.directionFor("sleep_bed_left","ne"),"nw");
assert.equal(sleep.directionFor("sleep_bed_left","nw"),"ne");
assert.deepEqual([0,1,2,3].map(sleep.breathing),[0,-1,0,1]);
console.log("PASS distinct 4-direction sleep right/left with genuine actor poses and no fake fallback");
