'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
function localStorage(){const map=new Map();return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),keys:()=>[...map.keys()]}}
function loadUMD(file,window){
 const context={window,module:{exports:{}},Math,Date,JSON,RegExp,Array,String,Object,Map,Set,Number};
 vm.runInNewContext(read(file),context,{filename:file});
 return context.module.exports;
}
test('male/female standard outfit defaults and isolated custom-wear sheets',()=>{
 const ls=localStorage(),window={localStorage:ls,V6PPartCatalog:{isPart:p=>p==='top/custom'||p==='top/custom_f',normalizePart:x=>x}};
 const S=loadUMD('site/v6p-character-store.js',window);
 const m=S.create({name:'Custom M',gender:'male'}),f=S.create({name:'Custom F',gender:'female'});
 assert.equal(m.appearance.hair,'none');assert.equal(f.appearance.body,'female');
 assert.equal(f.appearance.top,'tee');assert.equal(f.appearance.pants,'trousers');assert.equal(f.appearance.shoes,'shoes');
 S.setPart(m.id,'top/custom','data:image/png;base64,QUJD');
 assert.equal(S.getPart(m.id,'top/custom'),'data:image/png;base64,QUJD');
 assert.equal(S.getPart(f.id,'top/custom'),null,'female must not inherit male custom pixels');
 const copy=S.create({name:'Copy M',from:m.id});
 assert.equal(S.getPart(copy.id,'top/custom'),'data:image/png;base64,QUJD');
 S.resetPart(copy.id,'top/custom');
 assert.equal(S.getPart(copy.id,'top/custom'),null);
 assert.equal(S.getPart(m.id,'top/custom'),'data:image/png;base64,QUJD');
 assert.equal(S.list().length,3);
});
test('V6P composer uses character-local layer and preserves stock fallback',()=>{
 const ls=localStorage(),window={localStorage:ls,V6PPartCatalog:{isPart:p=>p==='top/custom'||p==='top/custom_f',normalizePart:x=>x}};
 const Store=loadUMD('site/v6p-character-store.js',window);window.V6PCharacterStore=Store;
 const ch=Store.create({name:'A',gender:'female'});
 Store.update(ch.id,{appearance:{top:'custom'}});
 Store.setPart(ch.id,'top/custom_f','data:image/png;base64,QUJD');
 const V=loadUMD('site/v6p-compositor.js',window);
 const n=V.norm({...Store.get(ch.id).appearance,characterId:ch.id});
 assert.equal(n.hair,'none');assert.equal(n.body,'female');assert.equal(n.characterId,ch.id);
 assert.ok(!V.files(n).some(part=>part.startsWith('hair/')),'hairless base should not invent hair');
 assert.ok(V.files(n).includes('top/custom_f'));
 assert.ok(V.key(n).includes(ch.id));
});
test('character wizard, female base, 4-view QA and pixel scope wired',()=>{
 const h=read('site/v6p-studio.html'),wf=read('site/v6p-character-workflow.js'),p=read('site/pixel-editor.js');
 for(const id of ['workflow-source','workflow-new','workflow-list','workflow-open','qa-animation','all-views','edit-hair','edit-body'])
  assert.ok(h.includes('id="'+id+'"'),id);
 for(const dir of ['se','sw','ne','nw'])assert.ok(h.includes('data-qa-dir="'+dir+'"'));
 assert.match(wf,/base:female/);assert.match(wf,/mahluk-2-library-v1/);
 assert.match(p,/V6PCharacterStore\.setPart/);assert.match(p,/autoFitCurrentDirection/);
 assert.match(h,/u\.searchParams\.set\("character",state\.characterId\)/);
});
test('animation editor is genuinely frame by frame with asset anchors',()=>{
 const h=read('site/mahluk-animation-studio.html'),js=read('site/mahluk-animation-studio.js');
 for(const id of ['stage','frame-strip','rotation','ax','ay','add-frame','duplicate','save','template','gender'])
  assert.ok(h.includes('id="'+id+'"'),id);
 assert.match(js,/function bake\(/);assert.match(js,/c\.rotate\(r\)/);
 assert.match(js,/Store\.setLayer\(state\.id,"base\/body"/);
 assert.match(js,/requiredParts:\["base\/body"\]/);
 assert.match(js,/hair:"none"/);
 assert.match(js,/state\.frames\.length>=6/);
});
test('action real character input has no phantom Noor',()=>{
 const h=read('site/mahluk-action-editor.html'),js=read('site/mahluk-action-editor.js');
 assert.doesNotMatch(h,/<option value="noor">/i);
 assert.match(js,/function refreshActors\(/);
 assert.match(js,/mahluk-2-library-v1/);
 assert.match(js,/function drawObject\(/);
 assert.doesNotMatch(js,/const native=publishedClip\(entry,a\.id\)/,'rejected Grok references must not survive');
 assert.match(js,/Store\?\.list\(\)/,'Action must offer approved native stock animations');
 assert.ok(h.includes('id="refresh-actors"'));
});
test('unified backup retains actual published character & editable animation records',()=>{
 const d=read('site/mahluk-hub-drive.js');
 for(const key of ['vl-v6p-character-workflow-v1','vl-mahluk-animation-anchor-poses-v1','mahluk-2-library-v1'])
  assert.ok(d.includes(key),key);
});
