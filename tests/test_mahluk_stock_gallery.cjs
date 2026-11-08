'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const A=require('../site/v6p-activity-contract.js'),C=require('../site/v6p-universal-motion-contract.js');
test('all non-native bundled animations are physically absent',async()=>{
 const index=JSON.parse(read('site/motion-packs/index.json'));
 assert.equal(index.format,'genesis-v6b-motion-registry-v1');
 assert.deepEqual(index.files,[]);
 assert.equal(fs.existsSync(path.join(root,'site/motion-packs/clp_standing_punch.motion.json')),false);
 const bag=new Map(),storage={getItem:k=>bag.get(k)||null,setItem:(k,v)=>bag.set(k,String(v)),removeItem:k=>bag.delete(k)};
 const window={localStorage:storage,V6PActivityContract:A,V6PUniversalMotionContract:C,
  fetch:async url=>({ok:url==='./motion-packs/index.json',status:200,json:async()=>index})};
 const ctx={window,module:{exports:{}},Map,Set,Date,JSON,Object,Array,String,Number,RegExp};
 vm.runInNewContext(read('site/v6p-clip-store.js'),ctx);
 const Store=ctx.module.exports;
 await Store.loadBundled();
 assert.equal(Store.list().length,0);
 assert.equal(Store.get('clp_standing_punch'),null);
});
test('original 11 native V6B actions, dimensions and layering stay unchanged',()=>{
 const V=require('../site/v6p-compositor.js');
 assert.deepEqual(Object.keys(V.ROWS).sort(),
  ['walk','idle','talk','sit','sit_type','sleep','tired','swim','float','lie','perch'].sort());
 assert.equal(V.ROWS.idle,4);assert.equal(V.ROWS.walk,0);
 assert.equal(V.FW,64);assert.equal(V.FH,112);assert.equal(V.H,4928);
});
test('no Punch hardcoding remains in the active editors',()=>{
 const paths=['site/mahluk-animation-studio.js','site/mahluk-action-editor.js',
  'site/v6p-studio.html','site/v6p-character-wizard.js','site/v6p-character-workflow.js'];
 for(const p of paths)assert.doesNotMatch(read(p),/motion:clp_standing_punch|clp_standing_punch\.motion\.json/);
});
