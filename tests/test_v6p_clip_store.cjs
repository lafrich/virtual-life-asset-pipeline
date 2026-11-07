const assert=require("assert");
const path=require("path");
global.window=global;
const mem={};
global.localStorage={
 getItem:k=>mem[k]||null,
 setItem:(k,v)=>{mem[k]=String(v);},
 removeItem:k=>{delete mem[k];}
};
require(path.join(__dirname,"../site/v6p-activity-contract.js"));
const Store=require(path.join(__dirname,"../site/v6p-clip-store.js"));
const rec=Store.get("pushup");
assert.ok(rec);
assert.strictEqual(rec.id,"clip_pushup");
assert.strictEqual(rec.manifest.band,"pushup");
assert.strictEqual(rec.manifest.frames.length,4);
assert.strictEqual(rec.manifest.frames[0].key,"plank_high");
assert.ok(Store.hasLayer("clip_pushup","base/body"));
assert.match(Store.layerUrl("clip_pushup","base/body"),/media\/v6p-act\/base\/body\.png/);
assert.ok(!Store.hasLayer("clip_pushup","top/tee"));
const names=Store.list().map(x=>x.id);
assert.ok(names.includes("clip_pushup"));
assert.ok(!names.includes("clip_squat"));
const made=Store.create({name:"QA Clip",frames:[{key:"a",ms:120},{key:"b",ms:180}]});
assert.strictEqual(made.manifest.frames[1].ms,180);
Store.updateManifest(made.id,{frames:[{key:"a",ms:200},{key:"b",ms:180},{key:"c",ms:90}]});
assert.strictEqual(Store.get(made.id).manifest.frames.length,3);
const png="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
Store.setLayer(made.id,"base/body",png);
assert.strictEqual(Store.layerUrl(made.id,"base/body"),png);
const gallery=Store.galleryEntries();
assert.ok(gallery.some(e=>e.id==="clip_pushup"&&e.origin==="built-in"));
assert.ok(gallery.some(e=>e.id===made.id&&e.origin==="user"&&e.openUrl.includes("project=")));
assert.throws(()=>Store.remove("clip_pushup"));
console.log("test_v6p_clip_store: ok");
