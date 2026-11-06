'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const EP=require('../site/mahluk-2/emotion-preview.js');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Emosi.exe and Mahluk Hidup 2 share exact browser origin database identifiers',()=>{
 assert.equal(EP.DB,'emotion-studio-local-v1');
 assert.equal(EP.STORE,'emotion-assets');
 assert.equal(EP.FALLBACK,'emotion-studio-local-fallback-v1');
 assert.deepEqual(EP.DIR,['se','sw','ne','nw']);
});
test('new characters start with independent zeroed placement in four directions',()=>{
 const p=EP.placement();
 for(const dir of EP.DIR)assert.deepEqual(p[dir],{x:0,y:0,scale:1});
});
test('per-view adjustments do not mutate other directions or source',()=>{
 const origin=EP.placement();
 const se=EP.patchPlacement(origin,'se',{x:2.5,y:-3,scale:1.2},false);
 assert.deepEqual(origin,EP.placement());
 assert.deepEqual(se.se,{x:2.5,y:-3,scale:1.2});
 for(const other of ['sw','ne','nw'])assert.deepEqual(se[other],origin[other]);
 const sw=EP.patchPlacement(se,'sw',{x:8},false);
 assert.equal(sw.sw.x,8);
 assert.equal(sw.se.x,2.5);
});
test('all-directions placement, clamps and backward-compatible presets',()=>{
 const result=EP.patchPlacement({},'se',{x:-400,y:300,scale:0},true);
 for(const dir of EP.DIR)assert.deepEqual(result[dir],{x:-40,y:56,scale:.4});
 const restored=EP.placement({se:{x:1.5},nw:{scale:1.4}});
 assert.deepEqual(restored.se,{x:1.5,y:0,scale:1});
 assert.deepEqual(restored.nw,{x:0,y:0,scale:1.4});
});
test('face FPS is independent of body frame count and supports loop/pause scrub',()=>{
 assert.equal(EP.frameAt(0,6,6),0);
 assert.equal(EP.frameAt(166,6,6),0);
 assert.equal(EP.frameAt(167,6,6),1);
 assert.equal(EP.frameAt(1000,6,6),0);
 assert.equal(EP.frameAt(1000,6,6,false),5);
 assert.equal(EP.frameAt(1000,30,1),0);
});
test('valid database entry and transparent PNG from EMOSI.EXE are read-only',()=>{
 const x={id:'emotion-copy-99',name:'Happy / Variant 02',
  base:'universal',fps:7,frames:4,
  png:'data:image/png;base64,'+Buffer.from('PNG').toString('base64')};
 assert.equal(EP.valid(x),true);
 assert.equal(EP.valid({...x,id:'invalid!'}),false);
 assert.equal(EP.valid({...x,frames:49}),false);
 assert.equal(EP.valid({...x,png:'html<script>'}),false);
});
test('fallback EMOSI.EXE localStorage library recognizes multiple emotion entries',()=>{
 const x={id:'emotion-copy-99',name:'Happy / Variant 02',
  base:'male',fps:7,frames:4,png:'data:image/png;base64,AAAA'};
 const store={getItem:k=>k===EP.FALLBACK?JSON.stringify([x,{id:'invalid!!'}]):null};
 assert.deepEqual(EP.fromFallback(store),[x]);
 assert.deepEqual(EP.fromFallback({getItem:()=>'{oops'}),[]);
});
test('loadLocal uses previous EMOSI.EXE IndexedDB record format with no mutations',async()=>{
 const a={id:'emotion-a',name:'A',base:'universal',fps:9,frames:4,png:'data:image/png;base64,AAAA'};
 const b={id:'emotion-b',name:'B',base:'female',fps:7,frames:2,png:'data:image/png;base64,AAAA'};
 const fakeFactory={
  open(db,version){
   assert.equal(db,EP.DB);assert.equal(version,1);
   const req={result:{objectStoreNames:{contains:()=>true},close(){},
    transaction(store,mode){
     assert.equal(store,EP.STORE);assert.equal(mode,'readonly');
     return {objectStore(){return {getAll(){
      const x={result:[a,b]};setImmediate(()=>x.onsuccess?.());return x;
     }}}};
    }}};
   setImmediate(()=>req.onsuccess?.());return req;
  }
 };
 const data=await EP.loadLocal({indexedDB:fakeFactory,localStorage:null});
 assert.equal(data.entries.length,2);
 assert.deepEqual(data.entries.map(x=>x.name),['A','B']);
});
test('Mahluk 2 UI exposes read-only preview controls and respects root persistence',()=>{
 const html=read('site/mahluk-2/index.html');
 const src=read('site/mahluk-2/studio.js');
 for(const id of [
  'inspectorEmotionTab','emotionPreviewSection','emotionSearch','emotionAsset',
  'emotionRefresh','emotionPreviewCanvas','emotionPreviewPlay','emotionPreviewLoop',
  'emotionPreviewScrub','emotionPreviewReadout','emotionPlacementAll','emotionOffsetX',
  'emotionOffsetY','emotionScale','emotionPlacementReset','emotionPlacementSave'
 ])assert.ok(html.includes('id="'+id+'"'),'Missing read-only Emosi UI: '+id);
 assert.match(html,/emotion-preview\.js\?v=/);
 assert.match(src,/await EP\.loadLocal\(\)/);
 assert.match(src,/emotionPreviewFrame/);
 assert.match(src,/facePlace\.scale\*mag/);
 assert.match(src,/emotionPlacement:clone\(emotionPlacement\)/);
 assert.match(src,/placement:clone\(emotionPlacement\)/);
 assert.match(src,/window\.addEventListener\("mahluk2:drive-connected"/);
 assert.match(src,/getEmotionAsset\(emotionAt\(\)\)/);
 assert.doesNotMatch(src,/\$\("emotionAsset"\)\.onchange[\s\S]{0,450}matchAssetAnimation\(/,
  'Selecting preview must not change body timeline');
 assert.doesNotThrow(()=>new Function(src));
});
