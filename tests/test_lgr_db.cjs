'use strict';
// LGR database (lgr-db.js) + JSON import (lgr-import.js): schema, sync, conflicts, backups.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const mem=new Map();
globalThis.localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
globalThis.sessionStorage={getItem:()=>null,setItem(){},removeItem(){}};
globalThis.LGR1Motion=require('../site/lgr1-motion.js');
const DB=require('../site/lgr-db.js'),I=require('../site/lgr-import.js');
const lib=LGR1Motion.validateLibrary(JSON.parse(fs.readFileSync(path.join(__dirname,'../site/media/lgr1/motions.json'),'utf8')));
DB.setPoses(lib.poses);
/* ---- tiny Drive v3 fake ---- */
function fakeDrive(){
 const files=new Map();let n=0;
 const mk=(meta,content)=>{const id='f'+(++n);files.set(id,{id,name:meta.name,parents:meta.parents||['root'],mimeType:meta.mimeType||'application/json',appProperties:meta.appProperties||{},content:content??null,modifiedTime:new Date().toISOString()});return id};
 const mp=(body,ct)=>{const b=/boundary=([^;]+)/.exec(ct)[1];const parts=body.split('--'+b).filter(x=>x.trim()&&x.trim()!=='--');
  const get=p=>p.split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/,'');return [JSON.parse(get(parts[0])),get(parts[1])]};
 const res=(o,s=200)=>new Response(typeof o==='string'?o:JSON.stringify(o),{status:s});
 const pathOf=id=>{const out=[];let f=files.get(id);while(f){out.unshift(f.name);f=files.get(f.parents[0])}return out.join('/')};
 async function fetch(url,init={}){
  const u=new URL(url),m=init.method||'GET';
  if(u.pathname==='/drive/v3/files'&&m==='GET'){
   const q=u.searchParams.get('q'),par=/'([^']*)' in parents/.exec(q)?.[1],name=/name = '([^']*)'/.exec(q)?.[1],mime=/mimeType = '([^']*)'/.exec(q)?.[1];
   return res({files:[...files.values()].filter(f=>(!par||f.parents.includes(par))&&(!name||f.name===name)&&(!mime||f.mimeType===mime))});
  }
  if(u.pathname==='/drive/v3/files'&&m==='POST')return res({id:mk(JSON.parse(init.body))});
  let k=/^\/drive\/v3\/files\/(.+)$/.exec(u.pathname);
  if(k&&m==='GET')return res(files.get(k[1]).content);
  if(k&&m==='PATCH'){const f=files.get(k[1]),b=JSON.parse(init.body||'{}');if(b.name)f.name=b.name;if(u.searchParams.get('addParents'))f.parents=[u.searchParams.get('addParents')];return res({id:f.id})}
  if(u.pathname==='/upload/drive/v3/files'&&m==='POST'){const [meta,c]=mp(init.body,init.headers.get('Content-Type'));return res({id:mk(meta,c)})}
  k=/^\/upload\/drive\/v3\/files\/(.+)$/.exec(u.pathname);
  if(k&&m==='PATCH'){const f=files.get(k[1]),[meta,c]=mp(init.body,init.headers.get('Content-Type'));f.content=c;f.appProperties=meta.appProperties;return res({id:f.id})}
  return res({error:{message:'unhandled'}},400);
 }
 return {files,fetch,pathOf,inDir:d=>[...files.values()].filter(f=>pathOf(f.id).startsWith(d+'/'))};
}
const motionEntry=(id,a)=>({format:'lgr1-bergerak-v1',id,name:id,motion:{source:'neutral',angleSnap:5,loop:true,frames:[{ms:120,parts:{arm_r_upper:{a}}},{ms:120,parts:{}}]}});
test('Bergerak: up to 60 frames, same frame shape as motions.json, plays through LGR1Motion',()=>{
 const frames=Array.from({length:60},(_,i)=>({ms:100,parts:{arm_r_upper:{a:-i*3}}}));
 const v=DB.validateBergerak({...motionEntry('long',0),motion:{source:'neutral',frames}},lib.poses);
 assert.equal(v.motion.frames.length,60);
 const pose=LGR1Motion.framePose(lib.poses,v.motion,59,'se',LGR1Motion.DEFAULT_SIDES);
 assert.equal(pose.arm_near_upper.a,LGR1Motion.snap(-177,5));
 assert.throws(()=>DB.validateBergerak({...motionEntry('x',0),motion:{frames:Array(61).fill({ms:100,parts:{}})}},lib.poses),/1–60/);
 assert.throws(()=>DB.validateBergerak({...motionEntry('x',0),motion:{frames:[{ms:100,parts:{tail:{a:1}}}]}},lib.poses),/unknown part/);
 assert.throws(()=>DB.validateBergerak({...motionEntry('Bad Id',0)},lib.poses));
});
test('Beraksi: schema, relative feet positions, layer order, track/emosi timing',()=>{
 const s=DB.validateBeraksi({format:'lgr1-beraksi-v1',id:'ngobrol',name:'Ngobrol',actors:[
  {key:'a1',gender:'male',x:-20,y:0,layer:1,track:[{motion:'builtin:walk',ms:500},{motion:'bergerak:lambai',ms:700}],emosi:[{face:'emosi_x',startMs:600,ms:300}]},
  {key:'a2',gender:'female',flip:true,layer:0,track:[{motion:'builtin:idle',ms:900}]}]});
 assert.equal(s.stage.footY,101);assert.equal(DB.sceneDuration(s),1200);
 assert.deepEqual(DB.drawOrder(s).map(a=>a.key),['a2','a1']);
 assert.equal(DB.trackAt(s.actors[0],650).item.motion,'bergerak:lambai');
 assert.equal(DB.trackAt(s.actors[0],650).localMs,150);
 assert.equal(DB.emosiAt(s.actors[0],650).face,'emosi_x');assert.equal(DB.emosiAt(s.actors[0],950),null);
 assert.throws(()=>DB.validateBeraksi({format:'lgr1-beraksi-v1',id:'x',actors:[{key:'a',gender:'robot',track:[{motion:'builtin:idle',ms:100}]}]}),/gender/);
 assert.throws(()=>DB.validateBeraksi({format:'lgr1-beraksi-v1',id:'x',actors:[{key:'a',gender:'male',track:[{motion:'walk',ms:100}]}]}),/builtin:<id>/);
});
test('sync decisions: newest wins, deleted, conflicts',()=>{
 assert.equal(DB.decide(undefined,{sha:'r'}),'pull');
 assert.equal(DB.decide({sha:'a',baseSha:'a',dirty:false,fileId:'f'},{sha:'a'}),'same');
 assert.equal(DB.decide({sha:'b',baseSha:'a',dirty:true,fileId:'f',entry:{}},{sha:'a'}),'push');
 assert.equal(DB.decide({sha:'b',baseSha:'a',dirty:true,entry:{updated:'2026-11-10T10:00:00Z'}},{sha:'c',updated:'2026-11-10T09:00:00Z'}),'conflict-local-wins');
 assert.equal(DB.decide({sha:'b',baseSha:'a',dirty:true,entry:{updated:'2026-11-10T08:00:00Z'}},{sha:'c',updated:'2026-11-10T09:00:00Z'}),'conflict-remote-wins');
 assert.equal(DB.decide({sha:'b',dirty:true,entry:{}},undefined),'push-new');
 assert.equal(DB.decide({sha:'b',dirty:false,fileId:'f',entry:{}},undefined),'remote-deleted');
 assert.equal(DB.decide({deleted:true,baseSha:'a',fileId:'f'},{sha:'a'}),'delete-remote');
});
test('cloud round-trip: save → Drive, cache wiped → sync pulls; overwrite + delete keep Backup; invalid Drive data never loads',async()=>{
 const d=fakeDrive();DB.setFetch(d.fetch);DB.useToken('t',3600);mem.clear();
 const r=await DB.save('bergerak',motionEntry('lambai',-90));
 assert.equal(r.synced,true);
 const f=d.inDir('Membangun/Mahluk Hidup/Database/Bergerak').find(x=>x.name==='lambai.json');
 const doc=JSON.parse(f.content);assert.equal(doc.schema,'lgr1-db-file-v1');assert.equal(doc.entry.format,'lgr1-bergerak-v1');assert.equal(doc.entry.rev,1);
 mem.clear();assert.equal(DB.all('bergerak').length,0);
 await DB.sync();assert.equal(DB.get('bergerak','lambai').motion.frames[0].parts.arm_r_upper.a,-90);
 // game runtime view
 assert.equal(DB.motion('lambai').frames.length,2);
 // confirmed overwrite keeps the replaced version in Backup
 await DB.save('bergerak',motionEntry('lambai',-45),{overwrite:true});
 assert.ok(d.inDir('Membangun/Mahluk Hidup/Database/Backup').some(x=>/^bergerak\.lambai\..*\.overwritten\.json$/.test(x.name)));
 assert.equal(DB.get('bergerak','lambai').rev,2);
 // a second device edited it meanwhile (newer) while we edited offline (older) → theirs wins, ours backed up
 const c=JSON.parse(mem.get(DB.CACHE_KEY));const row=c.kinds.bergerak.lambai;
 row.entry={...row.entry,updated:'2020-01-01T00:00:00.000Z',motion:{...row.entry.motion,frames:[{ms:300,parts:{}}]}};row.sha='local';row.dirty=true;mem.set(DB.CACHE_KEY,JSON.stringify(c));
 const remote=d.inDir('Membangun/Mahluk Hidup/Database/Bergerak').find(x=>x.name==='lambai.json');
 const other=JSON.parse(remote.content);other.entry.notes='from phone';other.entry.updated='2030-01-01T00:00:00.000Z';
 other.sha256=await DB.sha256(DB.canonical(other.entry));remote.content=JSON.stringify(other);remote.appProperties.lgrSha=other.sha256.slice(0,40);remote.appProperties.lgrUpdated=other.entry.updated;
 const rep=await DB.sync();assert.equal(rep.conflicts,1);assert.equal(DB.get('bergerak','lambai').notes,'from phone');
 assert.ok(d.inDir('Membangun/Mahluk Hidup/Database/Backup').some(x=>/local-older/.test(x.name)));
 // tampered Drive file is rejected (checksum) and never enters the cache
 const bad=d.inDir('Membangun/Mahluk Hidup/Database/Bergerak').find(x=>x.name==='lambai.json');
 const t=JSON.parse(bad.content);t.entry.motion.frames[0].parts={tail:{a:1}};bad.content=JSON.stringify(t);bad.appProperties.lgrSha='zzz';
 const rep2=await DB.sync();assert.equal(rep2.errors.length,1);assert.equal(DB.get('bergerak','lambai').notes,'from phone');
 // delete moves the Drive file to Backup
 bad.content=JSON.stringify(other);bad.appProperties.lgrSha=other.sha256.slice(0,40);await DB.sync();
 await DB.remove('bergerak','lambai');assert.equal(DB.get('bergerak','lambai'),null);
 assert.ok(d.inDir('Membangun/Mahluk Hidup/Database/Backup').some(x=>/^bergerak\.lambai\..*\.deleted\.json$/.test(x.name)));
 assert.equal(d.inDir('Membangun/Mahluk Hidup/Database/Bergerak').filter(x=>x.name==='lambai.json').length,0);
 // nothing outside Membangun/Mahluk Hidup/Database was created
 for(const f of d.files.values()){const p=d.pathOf(f.id);assert.ok(p==='Membangun'||p==='Membangun/Mahluk Hidup'||p.startsWith('Membangun/Mahluk Hidup/Database'),p)}
});
test('offline save is cached and pushed on the next sync',async()=>{
 const d=fakeDrive();DB.setFetch(d.fetch);mem.clear();DB.disconnect();
 const r=await DB.save('bergerak',motionEntry('offline_a',30));assert.equal(r.synced,false);assert.equal(DB.pending(),1);
 DB.useToken('t',3600);const rep=await DB.sync();assert.equal(rep.pushed,1);assert.equal(DB.pending(),0);
});
test('import Bergerak: AI JSON auto-fixed (fences, trailing comma, aliases, radians, fps); errors point to the field',()=>{
 const txt='```json\n{"name":"Pukul","fps":8,"frames":[{"pose":{"rightUpperArm":-1.2,"left_forearm":{"angle":0.5},"hips":{"y":1}}},{"parts":{"arm_near_upper":{"a":-0.3}}},]}\n```';
 const r=I.normalizeBergerak(txt,{poses:lib.poses});
 assert.deepEqual(r.errors,[]);assert.equal(r.entry.id,'pukul');assert.equal(r.entry.motion.frames[0].ms,125);
 assert.equal(r.entry.motion.frames[0].parts.arm_r_upper.a,-69);assert.equal(r.entry.motion.frames[0].parts.arm_l_lower.a,29);
 assert.ok(r.fixes.some(f=>/radian/.test(f)));
 const bad=I.normalizeBergerak({frames:[{ms:100,parts:{tail:{a:5},head:{a:900}}},{ms:5000,parts:{}}]},{poses:lib.poses});
 assert.equal(bad.entry,null);
 assert.ok(bad.errors.some(e=>/frames\[0\]\.parts: nama sendi 'tail'/.test(e)));
 assert.ok(bad.errors.some(e=>/frames\[0\]\.parts\.head\.a: 900/.test(e)));
 assert.ok(bad.errors.some(e=>/frames\[1\]\.ms: 5000/.test(e)));
 assert.match(I.normalizeBergerak({name:'x'},{poses:lib.poses}).errors[0],/frames: wajib/);
 assert.match(I.normalizeBergerak('{oops',{}).errors[0],/Bukan JSON/);
 // a motions.json library → candidates
 const L=I.normalizeBergerak(JSON.parse(fs.readFileSync(path.join(__dirname,'../site/media/lgr1/motions.json'),'utf8')),{poses:lib.poses,pick:1});
 assert.equal(L.candidates.length,lib.motions.length);assert.equal(L.entry.motion.frames.length,lib.motions[1].frames.length);
 // round trip: an exported entry imports unchanged
 const v=DB.validateBergerak({...motionEntry('rt',-30),rev:3,updated:'2026-11-10T00:00:00.000Z'},lib.poses);
 const back=I.normalizeBergerak(JSON.stringify(v),{poses:lib.poses});assert.deepEqual(back.errors,[]);assert.deepEqual(DB.validateMotionLong({...back.entry.motion,id:"rt"},lib.poses).frames,v.motion.frames);assert.equal(back.entry.id,"rt");
});
test('import Beraksi: aliases fixed; unknown motion / emosi / outfit blocked with field paths',()=>{
 const motions={'builtin:idle':{name:'Idle',duration:1000},'builtin:walk':{name:'Walk',duration:720},'bergerak:pukul':{name:'Pukul',duration:375}};
 const faces=[{id:'emosi_senyum',label:'Senyum / EMOSI.EXE',genders:['male','female']}];
 const r=I.normalizeBeraksi({title:'Ribut',characters:[{gender:'cowok',skin:'tan',animations:[{motion:'pukul',duration:1.5},'walk'],emotions:['Senyum']},{gender:'F',flip:'true',dir:'SW',animations:'idle'}]},{motions,faces});
 assert.deepEqual(r.errors,[]);const [a,b]=r.entry.actors;
 assert.deepEqual(a.track,[{motion:'bergerak:pukul',ms:1500},{motion:'builtin:walk',ms:720}]);
 assert.equal(a.emosi[0].face,'emosi_senyum');assert.equal(b.gender,'female');assert.equal(b.flip,true);assert.equal(b.dir,'sw');
 const bad=I.normalizeBeraksi({actors:[{gender:'male',outfit:'jas',track:['terbang'],emosi:['marah']}]},{motions,faces});
 assert.equal(bad.entry,null);
 assert.ok(bad.errors.some(e=>/actors\[0\]\.outfit: 'jas'/.test(e)));
 assert.ok(bad.errors.some(e=>/actors\[0\]\.track\[0\]\.motion: animasi 'terbang'/.test(e)));
 assert.ok(bad.errors.some(e=>/actors\[0\]\.emosi\[0\]\.face: Emosi 'marah'/.test(e)));
 assert.deepEqual(I.checkRefs(r.entry,motions,faces),[]);
 assert.equal(I.checkRefs({actors:[{name:'x',track:[{motion:'bergerak:gone'}],emosi:[]}]},motions,faces).length,1);
});
