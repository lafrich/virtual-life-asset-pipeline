'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const rgba=()=>new Uint8ClampedArray(64*112*4);
function paintBox(arr,{x0,x1,y0,y1},rgb=[200,0,0],alpha=255){
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*64+x)*4;arr[i]=rgb[0];arr[i+1]=rgb[1];arr[i+2]=rgb[2];arr[i+3]=alpha}
}
function readColor(data,x,y){return [...data.slice((y*64+x)*4,(y*64+x)*4+4)]}
function store(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}}
function umd(file,window){const ctx={module:{exports:{}},window,Array,Uint8ClampedArray,Map,Set,Number,Object,Math,Date,JSON,Error,String};vm.runInNewContext(read(file),ctx,{filename:file});return ctx.module.exports;}
test('master style is transferred to every shifted native pose without a skeleton',()=>{
 const R=umd('site/v6p-character-retarget.js',{localStorage:store()});
 const source=rgba(),drawn=rgba(),target=rgba();
 paintBox(source,{x0:22,x1:41,y0:35,y1:72},[180,80,20]);
 paintBox(drawn,{x0:22,x1:41,y0:35,y1:72},[14,170,242]);
 paintBox(target,{x0:29,x1:48,y0:38,y1:76},[180,80,20]);
 const out=R.transferFrame(source,drawn,target);
 assert.deepEqual(readColor(out,35,50),[14,170,242,255]);
 assert.deepEqual(readColor(out,15,20),[0,0,0,0]);
 assert.deepEqual(readColor(target,35,50),[180,80,20,255],'retarget must not mutate stock target source');
});
test('per-frame detail edit is transported instead of simply changing the palette globally',()=>{
 const R=umd('site/v6p-character-retarget.js',{localStorage:store()});
 const source=rgba(),drawn=rgba(),target=rgba();
 const box={x0:23,x1:42,y0:40,y1:74};
 paintBox(source,box,[180,80,20]);paintBox(drawn,box,[180,80,20]);
 paintBox(drawn,{x0:27,x1:32,y0:54,y1:59},[10,240,25]);
 paintBox(target,{x0:28,x1:47,y0:42,y1:76},[180,80,20]);
 const out=R.transferFrame(source,drawn,target);
 let detailed=0,native=0;
 for(let i=0;i<out.length;i+=4)if(out[i+3]){if(out[i]===10&&out[i+1]===240)detailed++;if(out[i]===180&&out[i+1]===80)native++}
 assert.ok(detailed>0,'detail should follow the target pose');assert.ok(native>0,'rest of native target should remain unchanged');
});
test('new four-view hair/garment remains visible when old stock animation layer is blank',()=>{
 const R=umd('site/v6p-character-retarget.js',{localStorage:store()});
 const empty=rgba(),painted=rgba(),person=rgba(),moved=rgba();
 paintBox(painted,{x0:25,x1:39,y0:21,y1:37},[60,20,140]);
 paintBox(person,{x0:18,x1:46,y0:12,y1:104},[120,80,40]);
 paintBox(moved,{x0:24,x1:52,y0:15,y1:107},[120,80,40]);
 const out=R.transferFrame(empty,painted,empty,person,moved);
 let count=0;for(let i=3;i<out.length;i+=4)if(out[i])count++;
 assert.ok(count>0,'new hair should transfer using body pose anchor instead of vanish');
 assert.deepEqual(readColor(empty,30,30),[0,0,0,0],'native source remains immutable');
});
test('cloning a character retains four masters and per-pose fixes without global leakage',()=>{
 const ls=store(),w={localStorage:ls,V6PPartCatalog:{isPart:p=>p==='top/nude',normalizePart:x=>x,DIRS:['se','sw','ne','nw'],ACTIONS:['idle','walk'],FRAMES:{idle:4,walk:6}}};
 const S=umd('site/v6p-character-store.js',w);
 const original=S.create({name:'Source',gender:'female'}),master='data:image/png;base64,QUJD';
 for(const d of w.V6PPartCatalog.DIRS)S.setMaster(original.id,'top/nude',d,master);
 S.markCorrection(original.id,'top/nude','walk','ne',2);
 const clone=S.create({name:'Clone',from:original.id});
 assert.equal(Object.keys(S.get(clone.id).masters['top/nude']).length,4);
 assert.equal(S.isCorrection(clone.id,'top/nude','walk','ne',2),true);
 S.clearCorrection(clone.id,'top/nude','walk','ne',2);
 assert.equal(S.isCorrection(original.id,'top/nude','walk','ne',2),true);
 assert.equal(S.isCorrection(clone.id,'top/nude','walk','ne',2),false);
 assert.equal(ls.getItem('vl-v6p-part-overrides-v1'),null,'never overwrite global stock part overrides');
});
test('character editor is the main path: four master directions, generate, inspect, correction, save',()=>{
 const page=read('site/v6p-studio.html'),script=read('site/v6p-character-workflow.js'),pixel=read('site/pixel-editor.js');
 for(const id of ['workflow-new','workflow-clone','workflow-source','qa-animation','qa-frame','qa-prev','qa-next','qa-play','generate-character','generate-result','save'])
 assert.ok(page.includes('id="'+id+'"'),id);
 assert.match(page,/v6p-character-retarget\.js/);
 assert.match(script,/generateCharacter\(id/);
 assert.match(script,/H\.edit\(part\.value,cv\.dataset\.qaDir,qa\.value,state\.frame\)/);
 assert.match(page,/G\.generateCharacter\(state\.characterId\)/,'save must auto-generate if user forgot the button');
 assert.match(page,/Object\.keys\(V\.ROWS\)/,'save full native motion catalog');
 assert.match(page,/generateAnchorClips\(state\.sheet\)/,'retarget compatible user anchor database');
 assert.match(pixel,/setMaster\(state\.characterId,state\.v6pPart,dir/);
 assert.match(pixel,/markCorrection\(state\.characterId,state\.v6pPart,state\.action,dir,state\.frame\)/);
 assert.match(pixel,/state\.masterMode\?0/);
});
test('generator uses canonical native poses, retains fresh corrections and archives stale locks',()=>{
 const s=read('site/v6p-character-retarget.js');
 assert.match(s,/g\.drawImage\(base,0,0\)/);
 assert.doesNotMatch(s,/g\.drawImage\(existing\|\|base,0,0\)/);
 assert.match(s,/const fresh=corrected&&\(Number\.isInteger\(correctionVersion\)/);
 assert.match(s,/if\(fresh&&existing\)/);
 assert.match(s,/S\.archiveStaleCorrections\(id,part,stale\)/);
 assert.match(s,/put\(output,C,action,dir,n,painted\)/);
 assert.match(s,/S\.setGenerated\(id,part/);
 assert.match(s,/S\.master\(id,part,dir\)/);
});
test('Grok review-only frames are not silently added as playable motions',()=>{
 const page=read('site/v6p-character-workflow.js'),generator=read('site/v6p-character-retarget.js');
 assert.doesNotMatch(generator,/pending_owner_review.*[=]true/);
 assert.doesNotMatch(generator,/grok-motion-preview/);
 assert.match(page,/NO UNIVERSAL ANCHOR/);
});
test('all newly touched JavaScript parses',()=>{
 for(const p of ['site/v6p-character-store.js','site/v6p-character-retarget.js','site/v6p-character-workflow.js','site/pixel-editor.js'])
 assert.doesNotThrow(()=>new Function(read(p)),p);
 const s=read('site/v6p-studio.html');
 for(const match of s.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))if(match[1].trim())
 assert.doesNotThrow(()=>new Function(match[1]),'inline studio script');
});
