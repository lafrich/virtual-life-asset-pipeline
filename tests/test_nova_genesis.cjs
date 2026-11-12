'use strict';
// Nova is a selectable authoring draft, NOT a replacement for the official catalog.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const crypto=require('node:crypto');
const vm=require('node:vm');
const CORE=require('../site/lafrich-puppet-core.js');
const ROOT=path.resolve(__dirname,'../site');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const DIRS=['se','sw','ne','nw'];
const read=g=>{
 const p=path.join(ROOT,'media/lgr1/nova-11fix',g+'-package.gz.b64');
 const bytes=Buffer.from(fs.readFileSync(p,'utf8').trim(),'base64');
 const pkg=JSON.parse(zlib.gunzipSync(bytes));
 assert.equal(pkg.format,'lafrich-genesis-base-v1');
 assert.equal(pkg.gender,g);
 assert.equal(pkg.rig.gender,g);
 assert.equal(pkg.rig.id,'lafrich_'+g);
 assert.equal(pkg.rigSha256,hash(pkg.rig),'Package rig checksum invalid: '+g);
 assert.deepEqual(Object.keys(pkg.rig.masks),DIRS);
 const m=CORE.validateMaster(pkg.rig);
 assert.deepEqual(Object.keys(m.masks),DIRS);
 for(const d of DIRS){
  const mask=CORE.decode(m.masks[d]);
  assert.equal(mask.length,64*112,'wrong mask size '+g+'/'+d);
  for(const b of mask)assert.ok(b===255||b<11,'unknown part assignment');
  assert.equal(Object.keys(m.pivots[d]).length,11);
  const uri=m.layers.body[d];
  assert.match(uri,/^data:image\/png;base64,/);
  const png=Buffer.from(uri.slice(uri.indexOf(',')+1),'base64');
  assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16),64);
  assert.equal(png.readUInt32BE(20),112);
 }
 assert.equal(m.gender,g);
 return pkg;
};
for(const gender of ['male','female'])read(gender);
const shell=fs.readFileSync(path.join(ROOT,'genesis-workbench.html'),'utf8');
const entry=fs.readFileSync(path.join(ROOT,'genesis-nova.html'),'utf8');
assert.match(shell,/href="\.\/genesis-nova\.html"/);
assert.match(entry,/id="editor" src="\.\/genesis-base\.html/);
assert.match(entry,/id="load-male"/);
assert.match(entry,/id="load-female"/);
assert.match(entry,/id="export"/);
const ids={};
function node(id){
 if(!ids[id])ids[id]={
  id,events:{},disabled:false,textContent:'',value:'',
  classList:{toggle(){}},
  addEventListener(type,callback){this.events[type]=callback;},
  click(){this.events.click?.()},
  contentWindow:null
 };
 return ids[id];
}
let adopted=[],exported=0,readCount=0,confirmed=0;
const frame=node('editor');
frame.contentWindow={
 GenesisWorkbench:{
  async adopt(g,rig,manual,label,skin){
   const master=CORE.validateMaster(rig);
   adopted.push({gender:g,master,manual,label,skin});
  }
 },
 GenesisBase:{
  async readPackage(pkg){
   readCount++;assert.equal(pkg.rigSha256,hash(pkg.rig));
   return {g:pkg.gender,rig:pkg.rig,manual:pkg.manualSlice,skin:{tone:'light'}};
  }
 },
 LafrichPuppetCore:CORE,
 document:{getElementById(id){return id==='gb-export'?{click(){exported++}}:{value:''}}}
};
const source=fs.readFileSync(path.join(ROOT,'nova-genesis-loader.js'),'utf8');
const context={
 document:{getElementById:node},
 confirm:()=>{confirmed++;return true},
 fetch:async u=>{
  const match=String(u).match(/(male|female)-package\.gz\.b64$/);
  assert.ok(match,'Bad built-in asset URL '+u);
  return {ok:true,text:async()=>fs.readFileSync(path.join(ROOT,'media/lgr1/nova-11fix',match[1]+'-package.gz.b64'),'utf8')};
 },
 DecompressionStream,Blob,Response,Uint8Array,atob,Promise,setTimeout
};
vm.runInNewContext(source,context,{filename:'nova-genesis-loader.js'});
(async()=>{
 await node('load-male').events.click();
 await node('load-female').events.click();
 await node('export').events.click();
 assert.deepEqual(adopted.map(x=>x.gender),['male','female']);
 assert.equal(readCount,2);
 assert.equal(confirmed,2);
 assert.equal(exported,1);
 assert.ok(adopted.every(a=>a.master&&a.manual&&a.label.includes('NOVA 11-FIX')));
 console.log('Nova editable Genesis draft: male/female SHA, masks, PNG, native adopt and export PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
