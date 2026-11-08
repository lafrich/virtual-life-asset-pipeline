/* Run with: node tools/test-genesis-motion-contract.cjs */
"use strict";
const assert=require("node:assert/strict");
const C=require("../site/v6b-asset-generator/genesis-motion-contract.js");

assert.deepEqual(C.DIRS,["se","sw","ne","nw"]);
assert.deepEqual(C.PIVOT,[32,100]);
assert.deepEqual(C.ATLAS,{w:384,h:2688,cols:6,rows:24,cell:[64,112],pivot:[32,100]});
assert.deepEqual(Object.keys(C.GENESIS).sort(),["female","male"]);
for(const gender of ["male","female"]){
 const draft=C.create({name:"GIF Squat Test",gender,frameCount:6,ms:100,loop:true});
 assert.equal(C.validate(draft),true);
 assert.equal(draft.genesis,C.GENESIS[gender]);
 assert.equal(draft.dirs.length,4);
 for(const dir of C.DIRS)assert.equal(draft.tracks[dir].length,6);
 const pack=C.record(draft,"data:image/png;base64,aGVsbG8=");
 assert.equal(pack.status,"REVIEW_ONLY_NOT_INSTALLED");
 assert.equal(pack.clip.manifest.format,"v6p-act-clip-manifest-v1");
 assert.equal(pack.clip.manifest.frames.length,6);
 assert.deepEqual(pack.clip.manifest.sheet.pivot,[32,100]);
 assert.deepEqual(Object.keys(pack.clip.layers),["base/body"]);
 assert.deepEqual(Object.keys(pack.meta.tracks),C.DIRS);
 assert.equal(pack.meta.gender,gender);
}
assert.throws(()=>C.create({name:"X",gender:"v6p-male"}),/Genesis/);
assert.throws(()=>C.create({name:"X",gender:"male",frameCount:7}),/1-6/);
const bad=C.create({name:"Valid",gender:"female"});
bad.tracks.nw.pop();
assert.throws(()=>C.validate(bad),/Missing nw frames/);
assert.throws(()=>C.record(C.create({name:"Valid"}),"gif-raster"),/Atlas PNG/);
console.log("Genesis motion draft schema checks passed.");
