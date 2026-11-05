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

test("Four anatomical parts have independent diamond tracks",()=>{
 assert.deepEqual(Object.keys(maker.PARTS),["body","head","arms","legs"]);
 const tracks=maker.initialTracks();
 assert.deepEqual(Object.keys(tracks),["body","head","arms","legs"]);
 const frame=maker.sampleTracks(tracks,5,24);
 maker.move(frame,"wrist_r",-8,-5);
 maker.setTrackKey(tracks,"arms",5,frame);
 const edited=maker.sampleTracks(tracks,5,24);
 assert.notDeepEqual(edited.wrist_r,maker.neutral().wrist_r);
 assert.deepEqual(edited.ankle_l,maker.neutral().ankle_l);
 assert.deepEqual(edited.head,maker.neutral().head);
 assert.deepEqual(maker.sampleTracks(tracks,0,24).wrist_r,maker.neutral().wrist_r);
 assert.equal(maker.deleteTrackKey(tracks,"arms",5),true);
 assert.deepEqual(maker.sampleTracks(tracks,5,24).wrist_r,maker.neutral().wrist_r);
 assert.equal(maker.deleteTrackKey(tracks,"arms",5),false);
});
test("Moving body carries attached head arms and legs without needing their own diamond",()=>{
 const tracks=maker.initialTracks();
 const at=maker.sampleTracks(tracks,12,24);
 maker.move(at,"pelvis",5,-5);
 maker.setTrackKey(tracks,"body",12,at);
 const composed=maker.sampleTracks(tracks,12,24),base=maker.neutral();
 for(const id of ["head","neck","shoulder_l","wrist_r","hip_l","ankle_r"]){
  assert.equal(Math.round(composed[id][0]-base[id][0]),5,id+" follows the root on X");
  assert.equal(Math.round(composed[id][1]-base[id][1]),-5,id+" follows the root on Y");
 }
});
test("Per-part keyed pose can be reloaded and animated over integer frames",()=>{
 const tracks=maker.initialTracks();
 const at=maker.sampleTracks(tracks,12,24);
 maker.move(at,"head",7,-3);
 maker.setTrackKey(tracks,"head",12,at);
 const normalized=maker.sanitizeTracks(JSON.parse(JSON.stringify(tracks)),24);
 assert.equal(normalized.head.length,2);
 assert.equal(maker.sampleTracks(normalized,12,24).head[0],39);
 const halfway=maker.sampleTracks(normalized,6,24).head[0];
 assert.ok(halfway>32&&halfway<39);
 const migrated=maker.legacyTracks([{at:0,pose:maker.neutral()},{at:1,pose:at}],24);
 assert.deepEqual(migrated.head.map(k=>k.frame),[0,23]);
});
test("Frame count and FPS are clamped to safe authored atlas limits",()=>{
 assert.deepEqual(maker.timing(24,12),{frames:24,fps:12});
 assert.deepEqual(maker.timing(500,0),{frames:96,fps:4});
 assert.deepEqual(maker.timing(-5,99),{frames:4,fps:30});
});
test("Pose Maker UI contains separate parts and a diamond dope sheet",()=>{
 const fs=require("node:fs");
 const html=fs.readFileSync("site/index.html","utf8");
 const source=fs.readFileSync("site/pose-maker.js","utf8");
 for(const id of ["pose-frame-count","pose-fps","pose-ruler","pose-keys",
  "pose-timeline-scroll","pose-time","pose-key-add","pose-key-delete",
  "pose-joint-select","pose-reset-part","pose-isolate","pose-play"])
  assert.ok(html.includes('id="'+id+'"'),id+" missing");
 for(const part of ["body","head","arms","legs"])
  assert.ok(html.includes('data-pose-part="'+part+'"'),part+" button missing");
 assert.ok(source.includes("pose-diamond-cell"));
 assert.ok(source.includes('setTrackKey(tracks,trackPart,f,draft)'));
 assert.ok(source.includes('deleteTrackKey(tracks,trackPart,f)'));
});
