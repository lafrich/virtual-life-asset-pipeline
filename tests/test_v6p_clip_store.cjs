'use strict';
// Active clip registry excludes five incompatible 384x2688 stock activities.
// Native V6B Idle/Walk is owned by the unchanged physical-layer compositor.
const assert=require('node:assert/strict'),path=require('node:path');
global.window=global;
const mem={};
global.localStorage={
 getItem:k=>Object.hasOwn(mem,k)?mem[k]:null,
 setItem:(k,v)=>{mem[k]=String(v)},
 removeItem:k=>{delete mem[k]}
};
require(path.join(__dirname,'../site/v6p-activity-contract.js'));
const Store=require(path.join(__dirname,'../site/v6p-clip-store.js'));
const retired=['pushup','yoga_sphinx_idle','yoga_puppy_idle','hip_shake','yoga_happy_baby_idle'];
assert.deepEqual(Store.BUILTIN_IDS,[]);
for(const id of retired){
 assert.equal(Store.get(id),null);
 assert.equal(Store.get('clip_'+id),null);
 assert.equal(Store.hasLayer('clip_'+id,'base/body'),false);
 assert.ok(!Store.list().some(c=>c.id==='clip_'+id));
 assert.throws(()=>Store.create({id:'clip_'+id,name:'Retired'}),/retired/i);
}
mem[Store.KEY]=JSON.stringify({format:Store.FORMAT,clips:{
 clip_pushup:{manifest:{id:'clip_pushup',name:'Old Pushup'},layers:{'base/body':'data:image/png;base64,OLD'}},
 clp_grok_yoga_preview:{manifest:{id:'clp_grok_yoga_preview',name:'Rejected'}},
 clp_user_handmade:{origin:'user',manifest:{format:'v6p-act-clip-manifest-v1',id:'clp_user_handmade',
  name:'My Clip',frames:[{key:'f0',ms:180}],loop:true,dirs:['se','sw','ne','nw'],
  sheet:{cell:[64,112],pivot:[32,100]}}}
}});
assert.equal(Store.get('clip_pushup'),null);
assert.equal(Store.get('clp_grok_yoga_preview'),null);
assert.ok(Store.get('clp_user_handmade'));
const saved=JSON.parse(mem[Store.KEY]);
assert.deepEqual(Object.keys(saved.clips),['clp_user_handmade']);
assert.equal(Store.importCloudRecord({id:'clip_pushup',
 clip:{manifest:{id:'clip_pushup'},layers:{}},meta:{updated:'2026-11-08'}}),null);
assert.equal(Store.get('clip_pushup'),null);
const made=Store.create({name:'QA Clip',frames:[{key:'a',ms:120},{key:'b',ms:180}]});
assert.equal(made.manifest.frames[1].ms,180);
Store.updateManifest(made.id,{frames:[{key:'a',ms:200},{key:'b',ms:180},{key:'c',ms:90}]});
assert.equal(Store.get(made.id).manifest.frames.length,3);
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
Store.setLayer(made.id,'preview/composite',png);
assert.equal(Store.layerUrl(made.id,'preview/composite'),png);
assert.ok(Store.galleryEntries().some(e=>e.id===made.id&&e.origin==='user'));
assert.ok(Store.galleryEntries().every(e=>!retired.some(id=>e.id==='clip_'+id)));
Store.remove(made.id);
assert.equal(Store.get(made.id),null);
console.log('test_v6p_clip_store: retired stock absent, user clips safe');
