'use strict';
/* Retired legacy stock is not in the active Mahluk gallery. PUNCH is the first
   bundled idle-derived universal review motion; original 384×4928 Idle/Walk
   sheets remain unchanged. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const A=require('../site/v6p-activity-contract.js');
const C=require('../site/v6p-universal-motion-contract.js');
function makeStore(){
 const entries=new Map(),localStorage={
  getItem:k=>entries.has(k)?entries.get(k):null,
  setItem:(k,v)=>entries.set(k,String(v)),
  removeItem:k=>entries.delete(k)
 };
 entries.set('vl-v6p-act-clips-v1',JSON.stringify({format:'v6p-act-clips-store-v1',clips:{
  clip_pushup:{origin:'pilot',manifest:{id:'clip_pushup'},layers:{'base/body':'data:image/png;base64,OLD'}},
  clp_grok_yoga_preview:{manifest:{id:'clp_grok_yoga_preview',name:'Rejected Grok'}},
  clp_user_handmade:{origin:'user',manifest:A.emptyManifest({id:'clp_user_handmade',name:'User Clip',frames:[{key:'f0',ms:200}]})}
 }}));
 const context={window:{localStorage,V6PActivityContract:A},module:{exports:{}},Map,Set,Date,JSON,Object,Array,String,Number,RegExp};
 vm.runInNewContext(read('site/v6p-clip-store.js'),context);
 return {Store:context.module.exports,localStorage};
}
const retired=['pushup','yoga_sphinx_idle','yoga_puppy_idle','hip_shake','yoga_happy_baby_idle'];
test('retired five-band activity stock is unavailable, and custom clips stay intact',()=>{
 const {Store,localStorage}=makeStore(),rows=Store.list();
 for(const id of retired){
  assert.equal(A.isPlayable(id),false);
  assert.equal(Store.get('clip_'+id),null);
  assert.equal(Store.hasLayer('clip_'+id,'base/body'),false);
  assert.ok(!rows.some(c=>c.id==='clip_'+id));
 }
 assert.equal(Store.get('clp_grok_yoga_preview'),null);
 assert.ok(rows.some(c=>c.id==='clp_user_handmade'));
 const persist=JSON.parse(localStorage.getItem('vl-v6p-act-clips-v1'));
 assert.equal(Object.keys(persist.clips).length,1);
});
test('single JSON registry contains valid Idle-derived Punch and auto-discovers new motions',async()=>{
 const index=JSON.parse(read('site/motion-packs/index.json'));
 assert.equal(index.format,'genesis-v6b-motion-registry-v1');
 assert.ok(index.files.includes('clp_standing_punch.motion.json'));
 const entries=Object.fromEntries(index.files.map(filename=>[
  './motion-packs/'+filename,JSON.parse(read('site/motion-packs/'+filename))
 ]));
 entries['./motion-packs/index.json']=index;
 const make=()=>{
  const local=new Map();
  const window={
   localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,String(v))},
   V6PActivityContract:A,V6PUniversalMotionContract:C,
   fetch:async url=>({ok:!!entries[url],status:entries[url]?200:404,
    json:async()=>JSON.parse(JSON.stringify(entries[url]))})
  };
  const context={window,module:{exports:{}},Map,Set,Date,JSON,Object,Array,String,Number,RegExp};
  vm.runInNewContext(read('site/v6p-clip-store.js'),context);
  return {Store:context.module.exports,local};
 };
 const {Store}=make();
 assert.equal(Store.list().length,0,'No hardcoded package injected before asset discovery');
 await Store.loadBundled();
 const punch=Store.get('clp_standing_punch');
 assert.equal(punch.origin,'bundled');
 assert.equal(punch.manifest.category,'punch');
 assert.equal(punch.manifest.frames.length,5);
 assert.equal(punch.manifest.motion.sourceAction,'idle');
 assert.equal(C.validateManifest(punch.manifest),true);
 assert.throws(()=>Store.updateManifest(punch.id,{name:'overwrite'}),/read-only/);
 assert.equal(Store.get('clip_pushup'),null);
 const kick=JSON.parse(read('site/motion-packs/clp_standing_punch.motion.json'));
 kick.id='clp_test_kick';kick.name='Test Kick';kick.category='kick';
 entries['./motion-packs/clp_test_kick.motion.json']=kick;
 index.files.push('clp_test_kick.motion.json');
 const {Store:other}=make();await other.loadBundled();
 assert.equal(other.list().length,2);
 assert.equal(other.get('clp_test_kick').manifest.category,'kick');
 assert.equal(other.get('clp_standing_punch').manifest.category,'punch');
});
test('Animation, Character and Action use same dynamic registry with no Punch-specific ID cases',()=>{
 const studio=read('site/mahluk-animation-studio.js'),html=read('site/mahluk-animation-studio.html'),
  character=read('site/v6p-studio.html'),wizard=read('site/v6p-character-wizard.js'),
  workflow=read('site/v6p-character-workflow.js'),action=read('site/mahluk-action-editor.js'),
  store=read('site/v6p-clip-store.js');
 for(const file of [studio,wizard,workflow,action])assert.match(file,/loadBundled/,
  'Every editor must load the shared JSON registry');
 assert.match(store,/motion-packs\/index\.json/);
 assert.match(studio,/clipCategory\(clip\)/);
 assert.match(studio,/category\.replaceAll\("_"," "\)\.toUpperCase\(\)/);
 assert.match(wizard,/for\(const rec of root\.V6PClipStore\?\.list\(\)\|\|\[\]\)/);
 assert.match(character,/getQaMotion\(/);
 assert.match(character,/M\.renderPrepared\(/);
 assert.match(character,/partOverrides:existing\?\.parts\|\|base\?\.parts/);
 assert.match(action,/Store\?\.list\(\)/);
 assert.match(html,/animation-category/);
 for(const file of [studio,wizard,workflow,character,action])
  assert.doesNotMatch(file,/motion:clp_standing_punch|clp_standing_punch\.motion\.json/,
   'Editor must not contain an individually hardcoded animation asset');
});
test('approved V6B native compositor retains original Idle and Walk rows',()=>{
 const V=require('../site/v6p-compositor.js');
 assert.equal(V.ROWS.idle,4);
 assert.equal(V.ROWS.walk,0);
 assert.equal(V.FW,64);assert.equal(V.FH,112);assert.equal(V.H,4928);
});
