"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const E=require("../site/mahluk-2/emotion-planes.js");
const R=require("../site/modular-rig-v2.js");
test("Emotion Plane is one source asset, separate from head and accessories",()=>{
 assert.equal(E.slotKind({source:"face",expression:true,bone:"mouth"}),"emotion");
 assert.equal(E.slotKind({source:"brows",expression:true,bone:"brow_r"}),"emotion");
 assert.equal(E.slotKind({source:"acc_head",expression:true,bone:"glasses"}),"glasses");
 assert.equal(E.slotKind({source:"hair_front",bone:"fringe_l"}),null);
 const js=fs.readFileSync("site/mahluk-2/studio.js","utf8");
 assert.match(js,/\["HEAD \/ FACE & ACCESSORY",\["head","emotion","glasses"/);
 assert.doesNotMatch(js,/\["EYES \/ EXPRESSION"/);
 assert.match(js,/faceSource\(dir,asset.native\)/);
});
test("4-direction animated face atlas must match the game's native frame grid",()=>{
 assert.deepEqual(E.classifyAtlas(384,448),{frames:6,directions:4,width:384,height:448});
 assert.deepEqual(E.classifyAtlas(64,448).frames,1);
 for(const [w,h] of [[65,448],[384,112],[0,448],[64*49,448]]){
  assert.throws(()=>E.classifyAtlas(w,h),/transparent PNG atlas/);
 }
});
test("asset swaps have their own timeline, independent of body bone keys",()=>{
 const keys=E.insert(E.insert([],2,"native:happy"),5,"native:angry");
 assert.equal(E.sample(keys,1,"native:neutral"),"native:neutral");
 assert.equal(E.sample(keys,3,"native:neutral"),"native:happy");
 assert.equal(E.sample(keys,6,"native:neutral"),"native:angry");
 assert.equal(E.insert(keys,2,"native:blush").length,2);
});
test("glasses follows head but does not inherit Emotion Plane motion",()=>{
 const m=R.referencePose();
 const initial=E.accessoryWorld(m,R);
 m.parts.emotion.x+=11;m.parts.emotion.angle=21;
 const moved=E.accessoryWorld(m,R);
 assert.equal(initial.glasses.x,moved.glasses.x);
 assert.equal(initial.glasses.y,moved.glasses.y);
 m.parts.head.x+=6;m.parts.head.y-=4;
 const headMoved=E.accessoryWorld(m,R);
 assert.equal(headMoved.glasses.x-initial.glasses.x,6);
 assert.equal(headMoved.glasses.y-initial.glasses.y,-4);
});
test("2.0 editor has asset pickers, independent glasses import and published game preview",()=>{
 const html=fs.readFileSync("site/mahluk-2/index.html","utf8");
 const app=fs.readFileSync("site/mahluk-2/studio.js","utf8");
 for(const id of ["emotionAsset","emotionRefresh","emotionDatabaseStatus","emotionKey","emotionUnkey",
  "glassesAsset","glassesImport","game","editor"])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(app,/emotionPlane:\{asset:emotionAssetId,keys:clone\(emotionKeys\)\}/);
 assert.match(app,/accessoryPlanes:\{glasses:glassesAssetId\}/);
 assert.match(app,/new StorageEvent\("storage"/);
 assert.ok(!html.includes('id="emotionImport"'),"Use Emotion Studio for pixel authoring, Mahluk 2 for read-only face preview");
 assert.match(app,/loadDriveEmotions/);
 assert.match(app,/installEmotionEntries/);
});
