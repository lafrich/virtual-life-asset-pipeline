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

test("Pixel ownership masks have one non-overlapping owner per source pixel",()=>{
 const weights=require("../site/pose-weights.js");
 const source={data:new Uint8ClampedArray(64*112*4)};
 for(let i=0;i<64*112;i++)source.data[4*i+3]=255;
 const mask=weights.defaultMap(source);
 assert.equal(mask.length,64*112);
 assert.ok(mask.every(v=>v>0&&v<weights.SEGMENTS.length));
 const x=22,y=55,index=y*64+x,before=mask[index];
 assert.ok(weights.brush(mask,x,y,0,weights.SEGMENTS.length-1,source.data)>0);
 assert.equal(mask[index],weights.SEGMENTS.length-1);
 assert.notEqual(mask[index],before);
 assert.equal(weights.decode(weights.encode(mask))[index],mask[index]);
 assert.equal(weights.decode("bad"),null);
});
test("Pose Maker includes pixel weight canvas without changing rig",()=>{
 const fs=require("node:fs"),html=fs.readFileSync("site/index.html","utf8");
 const source=fs.readFileSync("site/pose-maker.js","utf8");
 for(const id of ["pose-weight-canvas","pose-weight-base","pose-weight-bone",
  "pose-weight-size","pose-weight-reset","pose-weight-info"])
  assert.ok(html.includes('id="'+id+'"'),id+" missing");
 assert.ok(html.includes("./pose-weights.js"));
 assert.ok(source.includes("root.VLPoseWeights.paint(ctx,img,base,dir,a,P0,frame)"));
 assert.ok(source.includes("root.VLPoseWeights?.serialize"));
});

test("Torso and left/right arms have independently selectable pixel layers",()=>{
 const weights=require("../site/pose-weights.js");
 assert.deepEqual(weights.FOCUS.body.segments,[1]);
 assert.deepEqual(weights.FOCUS.arm_l.segments,[3,4]);
 assert.deepEqual(weights.FOCUS.arm_r.segments,[5,6]);
 assert.ok(weights.focusOwns("arm_l",3));
 assert.ok(weights.focusOwns("arm_l",4));
 assert.equal(weights.focusOwns("arm_l",1),false);
 assert.equal(weights.focusOwns("arm_r",3),false);
 assert.ok(weights.inFocusRegion("body",22,45));
 assert.ok(weights.inFocusRegion("arm_l",21,45),"shoulder can be reassigned");
 assert.equal(weights.inFocusRegion("arm_l",43,45),false);
 const image=new Uint8ClampedArray(64*112*4);
 image.fill(255);
 const owned=new Uint8Array(64*112);
 const guard=(x,y)=>weights.inFocusRegion("arm_l",x,y);
 const affected=weights.brush(owned,43,45,3,3,image,guard);
 assert.equal(affected,0,"left-arm edit cannot paint right arm");
 assert.equal(owned[45*64+43],0);
 assert.ok(weights.brush(owned,21,45,0,3,image,guard)>0);
 assert.equal(owned[45*64+21],3);
});
test("Split layer picker and zoom render in Human Pose Maker UI",()=>{
 const fs=require("node:fs");
 const html=fs.readFileSync("site/index.html","utf8");
 const js=fs.readFileSync("site/pose-weights.js","utf8");
 for(const layer of ["body","arm_l","arm_r","head","legs","all"])
  assert.ok(html.includes('data-pose-weight-isolate="'+layer+'"'),layer);
 assert.ok(html.includes('id="pose-weight-zoom"'));
 assert.ok(js.includes("syncSelect()"),"group bone dropdown is filtered");
 assert.ok(js.includes("inFocusRegion(focus,px,py,editRegion)"),"strokes honor movable per-view edit region");
 assert.ok(js.includes("drawThumbnails(item)"),"part previews update with masks");
});

test("UNSELECT subtracts only the selected bone without deleting neighboring weights",()=>{
 const weights=require("../site/pose-weights.js");
 const pixels=new Uint8ClampedArray(64*112*4);
 pixels.fill(255);
 const map=new Uint8Array(64*112);
 const y=45,x=20,otherX=21;
 map[y*64+x]=3;
 map[y*64+otherX]=4;
 const removed=weights.subtract(map,x,y,1,3,pixels);
 assert.equal(removed,1,"one matching pixel is subtracted");
 assert.equal(map[y*64+x],0,"selected bone becomes unassigned/static");
 assert.equal(map[y*64+otherX],4,"neighbor bone ownership remains intact");
 assert.equal(weights.subtract(map,otherX,y,0,3,pixels),0,"cannot subtract other bone");
 assert.equal(weights.subtract(map,otherX,y,0,0,pixels),0,"unassigned bone is not a target");
 assert.equal(pixels[(y*64+x)*4+3],255,"the original source pixel is untouched");
});
test("UNSELECT button and hint exist in Pixel Weights UI",()=>{
 const fs=require("node:fs");
 const html=fs.readFileSync("site/index.html","utf8");
 const js=fs.readFileSync("site/pose-weights.js","utf8");
 assert.ok(html.includes('data-pose-weight-tool="subtract"'));
 assert.ok(html.includes('id="pose-weight-tool-hint"'));
 assert.ok(js.includes('mode==="subtract"'));
 assert.ok(js.includes('changed+=subtract('));
});

test("Blue area box can be moved and resized without changing the rig",()=>{
 const maker=require("../site/pose-maker.js"),weights=require("../site/pose-weights.js");
 const before=maker.neutral();
 const original=[9,0,46,39];
 assert.equal(weights.hitRegion(original,20,20),"move");
 assert.equal(weights.hitRegion(original,9,0),"nw");
 assert.equal(weights.hitRegion(original,55,39),"se");
 const shifted=weights.transformRegion(original,"move",4,7);
 assert.deepEqual(shifted,[13,7,46,39]);
 const resized=weights.transformRegion(shifted,"se",6,8);
 assert.deepEqual(resized,[13,7,51,47],"resize clamps at 64-pixel canvas edge");
 assert.deepEqual(weights.transformRegion([2,3,20,20],"nw",-10,-15),[0,0,22,23]);
 assert.deepEqual(weights.transformRegion([0,0,64,112],"move",10,10),[0,0,64,112]);
 assert.deepEqual(maker.neutral(),before,"existing rig defaults remain unchanged");
});
test("Saved selection boundaries are independent per base, direction, and body part",()=>{
 const weights=require("../site/pose-weights.js");
 const a=weights.getRegion("human_male_base",0,"head");
 const b=weights.getRegion("human_female_base",0,"head");
 const c=weights.getRegion("human_male_base",1,"head");
 const arm=weights.getRegion("human_male_base",0,"arm_l");
 weights.setRegion("human_male_base",0,"head",[11,13,30,34],false);
 assert.deepEqual(weights.getRegion("human_male_base",0,"head"),[11,13,30,34]);
 assert.deepEqual(weights.getRegion("human_female_base",0,"head"),b);
 assert.deepEqual(weights.getRegion("human_male_base",1,"head"),c);
 assert.deepEqual(weights.getRegion("human_male_base",0,"arm_l"),arm);
 assert.ok(weights.inFocusRegion("head",20,20,weights.getRegion("human_male_base",0,"head")));
 assert.equal(weights.inFocusRegion("head",3,20,weights.getRegion("human_male_base",0,"head")),false);
 weights.setRegion("human_male_base",0,"head",a,false);
});
test("UI exposes drag and resize mode for blue selection rectangle",()=>{
 const fs=require("node:fs");
 const html=fs.readFileSync("site/index.html","utf8");
 const js=fs.readFileSync("site/pose-weights.js","utf8");
 assert.ok(html.includes('data-pose-weight-tool="box"'));
 assert.ok(js.includes('mode==="box"'));
 assert.ok(js.includes("transformRegion(boxDrag.original"));
 assert.ok(js.includes("getRegion(item.baseId,item.dir,focus)"));
});
