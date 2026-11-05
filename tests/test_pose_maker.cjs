"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
const maker=require("../site/pose-maker.js");
test("Male and Female use one articulated canonical pose",()=>{
 const start=maker.neutral();
 assert.ok(maker.BONES.length>=16);
 assert.equal(maker.BASE_IDS.length,2);
 assert.deepEqual(start.wrist_r,[46,65,0]);
 const next=maker.normalized({head:[100,-100,100],wrist_r:[40,44,8]});
 assert.deepEqual(next.head,[80,-10,25]);
 assert.deepEqual(next.wrist_r,[40,44,8]);
 assert.deepEqual(start.head,[32,16,0],"neutral base must not mutate");
});
test("Keyframes interpolate and preserve original source pose",()=>{
 const first=maker.neutral(),last=maker.neutral();
 last.head[0]+=12;last.wrist_l[1]-=8;
 const out=maker.sample([{at:0,pose:first},{at:1,pose:last}],.5);
 assert.equal(out.head[0],38);
 assert.equal(out.wrist_l[1],61);
 assert.equal(first.head[0],32);
});
test("Dragging a wrist uses its elbow IK, preserving shoulder",()=>{
 const pose=maker.neutral(),origin=[...pose.shoulder_r];
 maker.move(pose,"wrist_r",-12,-14);
 assert.deepEqual(pose.shoulder_r,origin);
 assert.notDeepEqual(pose.elbow_r,maker.neutral().elbow_r);
 const a=pose.shoulder_r,b=pose.elbow_r,c=pose.wrist_r;
 assert.ok(Math.abs(Math.hypot(a[0]-b[0],a[1]-b[1])-
    Math.hypot(44-47,37-51))<.01);
 assert.ok(Math.abs(Math.hypot(b[0]-c[0],b[1]-c[1])-
    Math.hypot(47-46,51-65))<.01);
});
test("Motion identity remains well formed",()=>{
 assert.equal(maker.slug("Idle / Head Bob!"),"idle_head_bob");
 assert.deepEqual(maker.listFor("legacy_otis"),[]);
 assert.deepEqual(maker.listFor("human_male_base"),[]);
});
