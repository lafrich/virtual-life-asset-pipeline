'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
function loadStore(){
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
 const catalog={isPart:p=>['top/shirt_f','top/shirt_back_f','top/shirt','top/shirt_back'].includes(p),
  DIRS:['se','sw','ne','nw'],ACTIONS:['idle','walk'],FRAMES:{idle:4,walk:6}};
 const context={window:{localStorage:storage,V6PPartCatalog:catalog},module:{exports:{}},Date,Math,Uint8ClampedArray,JSON};
 vm.runInNewContext(read('site/v6p-character-store.js'),context);
 return {S:context.module.exports,data};
}
test('existing female character back masters are recovered into physical top_back_f without losing front views',()=>{
 const {S}=loadStore(),char=S.create({name:'test female',gender:'female'}),png='data:image/png;base64,QUJD';
 for(const dir of ['se','sw','ne','nw'])S.setMaster(char.id,'top/shirt_f',dir,png);
 const before=S.get(char.id);
 assert.equal(Object.keys(before.masters['top/shirt_f']).length,4);
 const result=S.repairTopBackMasters(char.id);
 assert.equal(result.moved,2);
 const after=S.get(char.id);
 assert.deepEqual(Object.keys(after.masters['top/shirt_f']).sort(),['se','sw']);
 assert.deepEqual(Object.keys(after.masters['top/shirt_back_f']).sort(),['ne','nw']);
 assert.equal(S.master(char.id,'top/shirt_back_f','ne'),png);
 assert.equal(S.repairTopBackMasters(char.id).moved,0,'repair must be idempotent');
});
test('legacy hand-corrected rear poses stay recoverable rather than silently erased',()=>{
 const {S}=loadStore(),char=S.create({name:'test female',gender:'female'});
 S.setMaster(char.id,'top/shirt_f','ne','data:image/png;base64,QUJD');
 S.markCorrection(char.id,'top/shirt_f','walk','nw',1);
 const result=S.repairTopBackMasters(char.id);
 assert.equal(result.moved,1);
 assert.equal(result.remainingCorrections,1);
 assert.equal(S.isCorrection(char.id,'top/shirt_f','walk','nw',1),true);
});
test('rear top drawing is routed to the separate matching physical sprite part',()=>{
 const s=read('site/v6p-studio.html'),p=read('site/pixel-editor.js');
 assert.match(s,/if\(kind==="top"\)[\s\S]+?dir==="ne"\|\|dir==="nw"/);
 assert.match(s,/editorPartFor\(kind,opts\.dir\|\|state\.dir\)/);
 assert.match(p,/function topPartForDirection\(part,dir\)/);
 assert.match(p,/topPartForDirection\(state\.v6pPart,dir\)/);
 assert.match(p,/loadV6pPart\(target,params\)/);
 assert.match(p,/topPartForDirection\(state\.v6pPart,dir\)!==state\.v6pPart\)continue/);
});
test('generator does not re-use already generated mangled back sprite as a source',()=>{
 const retarget=read('site/v6p-character-retarget.js');
 assert.match(retarget,/S\.repairTopBackMasters\?\.\(id\)/);
 assert.match(retarget,/existing&&!row\.generated\?\.\[part\]/);
 assert.match(retarget,/repairedBackMasters:repair\.moved/);
});
test('character gallery is available at the first screen and is intentionally read-only',()=>{
 const page=read('site/v6p-studio.html'),wizard=read('site/v6p-character-wizard.js');
 for(const id of ['wizard-tab-gallery','wizard-tab-start','wizard-gallery','wizard-gallery-grid','wizard-gallery-count'])
  assert.ok(page.includes('id="'+id+'"'),id);
 assert.match(wizard,/function renderGallery\(\)/);
 assert.match(wizard,/const list=published\(\)/);
 assert.match(wizard,/clip\?\.sheet\|\|row\.sprite/);
 assert.match(wizard,/ctx\.drawImage\(image,0,di\*112,rowWidth,112,0,0,64,112\)/);
 assert.match(wizard,/Preview only/);
 assert.doesNotMatch(wizard,/card\.onclick/);
});
test('all touched JS modules and studio inline scripts parse',()=>{
 for(const p of ['site/v6p-character-store.js','site/v6p-character-wizard.js','site/v6p-character-retarget.js','site/pixel-editor.js'])
  assert.doesNotThrow(()=>new Function(read(p)),p);
 const html=read('site/v6p-studio.html');
 for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))if(m[1].trim())
  assert.doesNotThrow(()=>new Function(m[1]));
});