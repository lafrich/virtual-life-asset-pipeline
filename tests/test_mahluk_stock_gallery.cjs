'use strict';
/* Regression for Mahluk Animation Gallery. The five approved native clips
   are the only imported stock activities; rejected Grok review clips are not
   permitted in the active database. Existing user clips stay intact. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const A=require('../site/v6p-activity-contract.js');
const StoreFactory=read('site/v6p-clip-store.js');
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
const vm=require('node:vm');
function makeStore(){
 const data=new Map(),localStorage={
  getItem:k=>data.has(k)?data.get(k):null,
  setItem:(k,v)=>data.set(k,String(v)),
  removeItem:k=>data.delete(k)
 };
 data.set('vl-v6p-act-clips-v1',JSON.stringify({
  format:'v6p-act-clips-store-v1',clips:{
   clp_grok_yoga_preview:{manifest:{id:'clp_grok_yoga_preview',name:'Rejected import'}},
   clp_other_grok:{manifest:{id:'clp_other_grok',source:'grok-stock-animation-v1'}},
   clp_user_handmade:{origin:'user',manifest:A.emptyManifest({id:'clp_user_handmade',name:'My Own Clip',frames:[{key:'f0',ms:200}]})}
  }
 }));
 const window={localStorage,V6PActivityContract:A};
 const context={window,module:{exports:{}},Map,Set,Date,JSON,Object,Array,String,Number,RegExp};
 vm.runInNewContext(StoreFactory,context);
 return {Store:context.module.exports,localStorage};
}
const IDS=['pushup','yoga_sphinx_idle','yoga_puppy_idle','hip_shake','yoga_happy_baby_idle'];
test('five approved stock animation IDs remain playable in database',()=>{
 const {Store}=makeStore();
 const all=Store.list();
 for(const id of IDS){
  const clip=Store.get(id);
  assert.ok(clip,id+' missing from Mahluk stock database');
  assert.equal(clip.id,'clip_'+id);
  assert.equal(clip.origin,'pilot');
  assert.equal(clip.saveStatus,'stock');
  assert.equal(clip.manifest.band,id);
  assert.ok(A.isPlayable(id));
  assert.ok(Store.hasLayer(id,'base/body'));
  assert.ok(all.some(c=>c.id===clip.id));
  assert.ok(clip.manifest.frames.length===4||clip.manifest.frames.length===6);
 }
});
test('rejected Grok imported clips are removed, user-authored clips untouched',()=>{
 const {Store,localStorage}=makeStore();
 const rows=Store.list();
 assert.deepEqual(rows.filter(x=>x.id.startsWith('clp_grok_')).map(x=>x.id),[]);
 assert.equal(Store.get('clp_grok_yoga_preview'),null);
 assert.equal(Store.get('clp_other_grok'),null);
 assert.ok(Store.get('clp_user_handmade'));
 const persisted=JSON.parse(localStorage.getItem('vl-v6p-act-clips-v1'));
 assert.equal(Object.keys(persisted.clips).length,1);
 assert.ok(persisted.clips.clp_user_handmade);
});
test('approved native source sheets exist and carry the exact 384x2688 atlas dimensions',()=>{
 for(const part of A.PILOT_PARTS){
  const file=path.join(root,'site/media/v6p-act',part+'.png');
  assert.ok(fs.existsSync(file),part);
  const png=fs.readFileSync(file);
  assert.equal(png.subarray(1,4).toString(),'PNG',part);
  assert.equal(png.readUInt32BE(16),384,part);
  assert.equal(png.readUInt32BE(20),2688,part);
 }
});
test('Animation Studio opens stock through native composer, not editable anchor fallback',()=>{
 const js=read('site/mahluk-animation-studio.js'),html=read('site/mahluk-animation-studio.html');
 for(const id of ['animation-stock-preview','stock-canvas','stock-play','stock-gender','stock-dir','stock-timeline'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(js,/V\.composeActivity\(/);
 assert.match(js,/nativeOpen\(clip\);return/);
 assert.match(js,/function nativeTick\(/);
 assert.doesNotMatch(js,/mahluk-motion-library\.html/);
});
test('Action Editor sources native stock, never rejected Grok review',()=>{
 const js=read('site/mahluk-action-editor.js');
 assert.match(js,/Store\?\.list\(\)/);
 assert.match(js,/layout:"activity-native"/);
 assert.doesNotMatch(js,/grok-motion-preview/);
 assert.doesNotMatch(js,/GROK \/ /);
});
