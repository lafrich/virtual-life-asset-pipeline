"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const mp=require("../site/master-parts.js");
const old=require("../site/pixel-edit-core.js");
const inner=fs.readFileSync(path.join(__dirname,"../site/pixel-editor.html"),"utf8");
const ctrl=fs.readFileSync(path.join(__dirname,"../site/pixel-editor.js"),"utf8");
assert.equal(Object.keys(mp.PARTS).length,6);
for(const part of Object.keys(mp.PARTS)){
 const box=mp.PARTS[part].box;
 assert(mp.contains(part,box[0],box[1]));
 assert(!mp.contains(part,box[0]-1,box[1]));
}
const img=()=>({data:new Uint8ClampedArray(64*112*4)});
const source=img(),edited=img(),target=img(),original=img();
const i=(30*64+25)*4;
edited.data.set([100,150,200,255],i);
const diff=mp.changed(source,edited,"head");
assert.deepEqual(diff,[[25,30,100,150,200,255]]);
const shift=mp.offset(source,original,"head");
assert.deepEqual(shift,[0,0]);
mp.apply(target,original,[],diff,shift,shift,"head");
assert.deepEqual([...target.data.slice(i,i+4)],[100,150,200,255]);
assert.deepEqual([...target.data.slice(0,4)],[0,0,0,0]);
mp.apply(target,original,diff,[],shift,shift,"head");
assert.deepEqual([...target.data.slice(i,i+4)],[0,0,0,0]);
assert.equal(old.validatePatch({
 format:"virtual-life-pixel-patch-v2",version:2,actor:"legacy_otis",frame_size:[64,112],
 region:[0,0,64,112],frames:[],masters:[]
}),true);
assert(inner.includes('id="edit-mode"'));
assert(inner.includes('id="part"'));
assert(inner.includes('src="./master-parts.js'));
assert(ctrl.includes('queueMasterSync()'));
assert(ctrl.includes('state.syncPromise'));
assert(ctrl.includes('state.masterDiff'));
console.log("PASS master semantic part corrections, projection rollback, v2 patches and integrated modal");
