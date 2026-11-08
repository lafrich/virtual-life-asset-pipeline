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
test('Standing Punch is a complete idle-derived 5-frame four-direction review package',()=>{
 const data=JSON.parse(read('site/motion-packs/clp_standing_punch.motion.json'));
 assert.equal(data.id,'clp_standing_punch');
 assert.equal(data.sourceAction,'idle');
 assert.equal(data.frames.length,5);
 const motion=C.make({sourceAction:data.sourceAction,frames:data.frames,tracks:data.tracks,status:'draft'});
 assert.equal(C.validate(motion,data.frames),true);
 for(const dir of C.DIRS)assert.equal(data.tracks[dir].length,5);
 const studio=read('site/mahluk-animation-studio.js'),html=read('site/mahluk-animation-studio.html');
 assert.match(studio,/clp_standing_punch\.motion\.json/);
 assert.match(studio,/category:"punch"/);
 assert.match(studio,/clipCategory\(/);
 assert.match(html,/animation-category/);
});
test('existing Character Preview 4-view QA exposes Punch and renders through universal Genesis',()=>{
 const h=read('site/v6p-studio.html'),wizard=read('site/v6p-character-wizard.js'),
  workflow=read('site/v6p-character-workflow.js');
 assert.match(wizard,/motion:clp_standing_punch/);
 assert.match(workflow,/motion:clp_standing_punch/);
 assert.match(h,/getQaMotion\(/);
 assert.match(h,/M\.renderPrepared\(/);
 assert.match(h,/partOverrides:existing\?\.parts\|\|base\?\.parts/);
 assert.match(h,/V\.extractFrame\(state\.sheet,action,cv\.dataset\.qaDir,state\.frame\)/);
});
test('approved V6B native compositor retains original Idle and Walk rows',()=>{
 const V=require('../site/v6p-compositor.js');
 assert.equal(V.ROWS.idle,4);
 assert.equal(V.ROWS.walk,0);
 assert.equal(V.FW,64);assert.equal(V.FH,112);assert.equal(V.H,4928);
});
