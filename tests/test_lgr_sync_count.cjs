'use strict';
// Sync-call counts for Mahluk Hidup / lgr-db.js: open, idle, save, SYNC button,
// in-flight reuse, no auto-retry on error, and two tabs sharing one Drive sync.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const mem=new Map();
globalThis.localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
globalThis.sessionStorage={getItem:()=>null,setItem(){},removeItem(){}};
globalThis.LGR1Motion=require('../site/lgr1-motion.js');
const DB=require('../site/lgr-db.js');
const lib=LGR1Motion.validateLibrary(JSON.parse(fs.readFileSync(path.join(__dirname,'../site/media/lgr1/motions.json'),'utf8')));
DB.setPoses(lib.poses);
const source=fs.readFileSync(path.join(__dirname,'../site/lgr-db.js'),'utf8');
const shellSrc=fs.readFileSync(path.join(__dirname,'../site/mahluk-hidup-shell.js'),'utf8');

function fakeDrive(opts={}){
 const files=new Map();let n=0;let listSlow=opts.listSlow||0;
 const mk=(meta,content)=>{const id='f'+(++n);files.set(id,{id,name:meta.name,parents:meta.parents||['root'],mimeType:meta.mimeType||'application/json',appProperties:meta.appProperties||{},content:content??null,modifiedTime:new Date().toISOString()});return id};
 const mp=(body,ct)=>{const b=/boundary=([^;]+)/.exec(ct)[1];const parts=body.split('--'+b).filter(x=>x.trim()&&x.trim()!=='--');
  const get=p=>p.split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/,'');return [JSON.parse(get(parts[0])),get(parts[1])]};
 const res=(o,s=200)=>new Response(typeof o==='string'?o:JSON.stringify(o),{status:s});
 const pathOf=id=>{const out=[];let f=files.get(id);while(f){out.unshift(f.name);f=files.get(f.parents[0])}return out.join('/')};
 let failNext=false,listCalls=0,writes=0;
 async function fetch(url,init={}){
  const u=new URL(url),m=init.method||'GET';
  if(u.pathname==='/drive/v3/about')return res({user:{permissionId:opts.account||'account_a'}});
  if(failNext&&u.pathname.startsWith('/drive/v3/files')){failNext=false;throw Error('network down')}
  if(u.pathname==='/drive/v3/files'&&m==='GET'){
   listCalls++;
   if(listSlow){const d=listSlow;listSlow=0;await new Promise(r=>setTimeout(r,d))}
   const q=u.searchParams.get('q'),par=/'([^']*)' in parents/.exec(q)?.[1],name=/name = '([^']*)'/.exec(q)?.[1],mime=/mimeType = '([^']*)'/.exec(q)?.[1];
   return res({files:[...files.values()].filter(f=>(!par||f.parents.includes(par))&&(!name||f.name===name)&&(!mime||f.mimeType===mime))});
  }
  if(u.pathname==='/drive/v3/files'&&m==='POST')return res({id:mk(JSON.parse(init.body))});
  let k=/^\/drive\/v3\/files\/(.+)$/.exec(u.pathname);
  if(k&&m==='GET')return res(files.get(k[1]).content);
  if(k&&m==='PATCH'){const f=files.get(k[1]),b=JSON.parse(init.body||'{}');if(b.name)f.name=b.name;if(u.searchParams.get('addParents'))f.parents=[u.searchParams.get('addParents')];return res({id:f.id})}
  if(u.pathname==='/upload/drive/v3/files'&&m==='POST'){writes++;const [meta,c]=mp(init.body,init.headers.get('Content-Type'));return res({id:mk(meta,c)})}
  k=/^\/upload\/drive\/v3\/files\/(.+)$/.exec(u.pathname);
  if(k&&m==='PATCH'){writes++;const f=files.get(k[1]),[meta,c]=mp(init.body,init.headers.get('Content-Type'));f.content=c;f.appProperties=meta.appProperties;return res({id:f.id})}
  return res({error:{message:'unhandled'}},400);
 }
 return {files,fetch,pathOf,inDir:d=>[...files.values()].filter(f=>pathOf(f.id).startsWith(d+'/')),
  failOnce(){failNext=true},stats:()=>({listCalls,writes}),setListSlow:ms=>{listSlow=ms}};
}
const motionEntry=(id,a)=>({format:'lgr1-bergerak-v1',id,name:id,motion:{source:'neutral',angleSnap:5,loop:true,frames:[{ms:120,parts:{arm_r_upper:{a}}},{ms:120,parts:{}}]}});
function ls(map){return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}}
function loadTab(shared){
 const world={localStorage:shared.ls,sessionStorage:ls(new Map()),document:{},fetch:shared.fetch,crypto:shared.crypto||webcrypto,
  addEventListener(){},removeEventListener(){},LGR1Motion:globalThis.LGR1Motion};
 const module={exports:{}};
 const ctx=vm.createContext({window:world,globalThis:world,document:world.document,fetch:shared.fetch,
  Headers,URLSearchParams,URL,Response,TextEncoder,crypto:webcrypto,Date,Promise,JSON,Array,Object,Set,
  Uint8Array,Error,Math,setTimeout,clearTimeout,require,module,exports:module.exports,console});
 vm.runInContext(source,ctx,{filename:'lgr-db.js'});
 const api=world.LGRDB||module.exports;
 api.setPoses(lib.poses);api.setFetch(shared.fetch);api.useToken('t',3600);
 return api;
}

test('open does one Drive sync; online blips + 60s idle add none; one save is one debounced sync; SYNC button is one more',async()=>{
 const d=fakeDrive();DB.setFetch(d.fetch);DB.useToken('t',3600);mem.clear();
 // seed one remote animation so open has something to pull
 const seed=loadTab({ls:ls(new Map()),fetch:d.fetch});
 await seed.save('bergerak',motionEntry('lambai',-90));
 mem.clear(); // this tab is a fresh open with a restored Drive session
 const before=DB.syncRuns();
 // --- open (shell: restoreSession → syncOnce) ---
 await DB.sync();
 assert.equal(DB.syncRuns()-before,1,'open must start exactly one Drive sync');
 assert.equal(DB.get('bergerak','lambai').id,'lambai');
 // --- flaky online + 60s idle (shell now only auto-syncs when something is pending) ---
 for(let t=0;t<=60;t+=3)await DB.sync({auto:true});
 assert.equal(DB.syncRuns()-before,1,'online/idle must not start another sync when the cache is clean');
 // --- one save: at most one (debounced) Drive sync ---
 const r=await DB.save('bergerak',motionEntry('lambai',-45),{overwrite:true});
 assert.equal(r.synced,true);
 assert.equal(DB.syncRuns()-before,2,'one save must start at most one extra Drive sync');
 // several rapid scheduleSync calls still share that one in-flight/debounce window after the save completed;
 // a second explicit burst without waiting would have coalesced — already saved, so just confirm SYNC is one run:
 await DB.sync({interactive:true,force:true});
 assert.equal(DB.syncRuns()-before,3,'↻ SYNC must start exactly one Drive sync');
});

test('parallel sync() reuses the in-flight run; auto sync does not retry a failure',async()=>{
 const d=fakeDrive({listSlow:80});DB.setFetch(d.fetch);DB.useToken('t',3600);mem.clear();
 const before=DB.syncRuns();
 const a=DB.sync(),b=DB.sync(),c=DB.sync();
 const reps=await Promise.all([a,b,c]);
 assert.equal(DB.syncRuns()-before,1,'three overlapping sync() calls must be one Drive run');
 assert.equal(reps[0],reps[1]);assert.equal(reps[1],reps[2]);
 d.failOnce();
 await assert.rejects(()=>DB.sync(),/network down/);
 const failedAt=DB.syncRuns();
 for(let i=0;i<10;i++)await DB.sync({auto:true});
 assert.equal(DB.syncRuns(),failedAt,'a failed sync must not auto-retry in a loop');
 await DB.sync({interactive:true,force:true}); // user pressed ↻ SYNC
 assert.equal(DB.syncRuns(),failedAt+1);
});

test('rapid saves coalesce to one debounced Drive sync',async()=>{
 const d=fakeDrive();DB.setFetch(d.fetch);DB.useToken('t',3600);mem.clear();
 const before=DB.syncRuns();
 const p=[DB.save('bergerak',motionEntry('satu',10)),DB.save('bergerak',motionEntry('dua',20)),DB.save('bergerak',motionEntry('tiga',30))];
 const rs=await Promise.all(p);
 assert.ok(rs.every(r=>r.synced),'every save waits for the shared flush');
 assert.equal(DB.syncRuns()-before,1,'three overlapping saves must share one Drive sync');
 assert.equal(DB.all('bergerak').length,3);
 assert.equal(DB.pending(),0);
});

test('two tabs share one Drive sync: the second waits and reads the cache',async()=>{
 const d=fakeDrive({listSlow:120});
 const store=new Map();
 const A=loadTab({ls:ls(store),fetch:d.fetch});
 const B=loadTab({ls:ls(store),fetch:d.fetch});
 // put a file on Drive with no local cache
 const seeder=loadTab({ls:ls(new Map()),fetch:d.fetch});
 await seeder.save('bergerak',motionEntry('lambai',-30));
 store.clear();
 d.setListSlow(120);
 const started=Date.now();
 const pa=A.sync(),pb=B.sync();
 const [ra,rb]=await Promise.all([pa,pb]);
 assert.ok((ra.shared?1:0)+(rb.shared?1:0)===1,'exactly one tab should reuse the other tab\'s sync');
 assert.equal(A.syncRuns()+B.syncRuns(),1,'only one tab talks to Drive');
 assert.equal(A.get('bergerak','lambai').id,'lambai');
 assert.equal(B.get('bergerak','lambai').id,'lambai');
 assert.ok(Date.now()-started>=80,'the second tab must wait, not start a parallel run');
});

test('Mahluk Hidup shell: open + SYNC button call patterns, online only flushes pending',()=>{
 assert.match(shellSrc,/\.sync\(\{interactive,force:!!interactive,auto:!!opts\.auto&&!interactive\}\)/);
 assert.match(shellSrc,/if\(syncNowRunning\)return syncNowRunning/);
 assert.match(shellSrc,/addEventListener\("online",\(\)=>\{if\(DB\(\)\.connected\(\)&&DB\(\)\.pending\(\)\)void syncNow\(false,\{auto:true\}\)\}/);
 assert.match(shellSrc,/if\(DB\(\)\.restoreSession\(\)\)void syncNow\(false\)/);
 assert.match(shellSrc,/\("db-sync"\)\.onclick=\(\)=>void syncNow\(true\)/);
 assert.doesNotMatch(shellSrc,/setInterval/);
 assert.doesNotMatch(shellSrc,/visibilitychange/);
});

// Hold a real Drive boundary after the sync snapshot has been taken.
function pausedDrive(d){
 let release,started;const gate=new Promise(r=>release=r),entered=new Promise(r=>started=r);let paused=false;
 return {entered,release,fetch:async(url,init)=>{
  if(!paused&&new URL(url).pathname==='/drive/v3/files'){
   paused=true;started();await gate;
  }
  return d.fetch(url,init);
 }};
}
for(const peer of [false,true])test(`save during sync survives (${peer?'another tab':'same tab'}) and only exact revision is acknowledged`,async()=>{
 const d=fakeDrive(),store=new Map(),shared={ls:ls(store),fetch:d.fetch};
 const A=loadTab(shared),B=peer?loadTab(shared):A;
 await A.save('bergerak',motionEntry('existing',10));
 const slow=pausedDrive(d);A.setFetch(slow.fetch);
 const run=A.sync();await slow.entered;
 const saved=await B.save('bergerak',motionEntry('new_edit',20),{sync:false});
 await B.save('bergerak',motionEntry('existing',30),{sync:false});
 slow.release();await run;
 assert.equal(A.get('bergerak','new_edit').motion.frames[0].parts.arm_r_upper.a,20);
 assert.equal(A.get('bergerak','existing').motion.frames[0].parts.arm_r_upper.a,30);
 assert.equal(A.pending(),2);
 await A.sync();assert.equal(A.pending(),0);
 const file=d.inDir('Membangun/Mahluk Hidup/Database/Bergerak').find(f=>f.name==='new_edit.json');
 assert.equal(JSON.parse(file.content).entry.id,saved.entry.id);
});
test('delete during first upload remains pending and moves that upload to Backup',async()=>{
 const d=fakeDrive(),A=loadTab({ls:ls(new Map()),fetch:d.fetch});
 await A.save('bergerak',motionEntry('remove_me',10),{sync:false});
 const slow=pausedDrive(d);A.setFetch(slow.fetch);const run=A.sync();await slow.entered;
 await A.remove('bergerak','remove_me',{sync:false});slow.release();await run;
 assert.equal(A.get('bergerak','remove_me'),null);assert.equal(A.pending(),1);
 await A.sync();assert.equal(A.pending(),0);
 assert.equal(d.inDir('Membangun/Mahluk Hidup/Database/Bergerak').length,0);
 assert.ok(d.inDir('Membangun/Mahluk Hidup/Database/Backup').some(f=>f.name.endsWith('.deleted.json')));
});
test('save receipt is false when a newer edit replaced the saved revision',async()=>{
 const d=fakeDrive(),A=loadTab({ls:ls(new Map()),fetch:d.fetch});
 const slow=pausedDrive(d);A.setFetch(slow.fetch);
 const receipt=A.save('bergerak',motionEntry('edit',10));await slow.entered;
 await A.save('bergerak',motionEntry('edit',40),{sync:false});slow.release();
 assert.equal((await receipt).synced,false);
 assert.equal(A.get('bergerak','edit').motion.frames[0].parts.arm_r_upper.a,40);
});
test('quota failures reject delete and sync without replacing stored data',async()=>{
 const d=fakeDrive(),store=new Map(),backing=ls(store);let full=false;
 const A=loadTab({ls:{...backing,setItem(k,v){if(full&&k===A.CACHE_KEY)throw Error('quota');backing.setItem(k,v)}},fetch:d.fetch});
 await A.save('bergerak',motionEntry('keep',10));full=true;
 await assert.rejects(A.remove('bergerak','keep',{sync:false}),/Cache penuh/);
 assert.equal(A.get('bergerak','keep').id,'keep');
 await assert.rejects(A.sync(),/Cache penuh/);
 assert.equal(A.state.status,'error');
});

test('account change keeps pending entries in their own cache and never uploads them to the other Drive',async()=>{
 const store=new Map(),dA=fakeDrive({account:'alice'}),dB=fakeDrive({account:'bob'});
 const A=loadTab({ls:ls(store),fetch:dA.fetch});await A.ensureAccount();
 await A.save('bergerak',motionEntry('private_a',10),{sync:false});
 const keyA=A.CACHE_KEY;A.disconnect();A.setFetch(dB.fetch);A.useToken('bob-token',3600);
 await A.sync();assert.notEqual(A.CACHE_KEY,keyA);assert.equal(A.all('bergerak').length,0);
 assert.equal(dB.stats().writes,0);assert.equal(JSON.parse(store.get(keyA)).kinds.bergerak.private_a.dirty,true);
 A.disconnect();A.setFetch(dA.fetch);A.useToken('alice-token',3600);await A.sync();
 assert.equal(A.get('bergerak','private_a').id,'private_a');assert.equal(A.pending(),0);
 assert.equal(dA.inDir('Membangun/Mahluk Hidup/Database/Bergerak').length,1);
});
test('unowned legacy cache is never uploaded automatically; explicit recovery copies it without old file IDs',async()=>{
 const store=new Map(),d=fakeDrive({account:'alice'}),A=loadTab({ls:ls(store),fetch:d.fetch});
 const e=await A.save('bergerak',motionEntry('source',10));
 const legacy={format:'lgr1-db-cache-v1',kinds:{bergerak:{source:{entry:e.entry,sha:'old',fileId:'foreign',baseSha:'foreign-sha',dirty:true}},beraksi:{}}};
 store.set('lgr1-db-cache-v1',JSON.stringify(legacy));
 // A different account starts with an empty scoped cache, even with legacy drafts.
 const dB=fakeDrive({account:'bob'});A.disconnect();A.setFetch(dB.fetch);A.useToken('bob',3600);
 await A.sync();assert.equal(dB.stats().writes,0);assert.equal(A.hasLegacy(),true);
 const preserved=store.get('lgr1-db-cache-v1');await A.recoverLegacy();
 const row=A.readCache().kinds.bergerak.source;
 assert.equal(row.fileId,'');assert.equal(row.baseSha,'');assert.equal(row.dirty,true);
 assert.equal(store.get('lgr1-db-cache-v1'),preserved);
 await A.sync();assert.equal(dB.stats().writes,1);
 await assert.rejects(A.recoverLegacy(),/already recovered/);
});
test('unverified account identity fails before any Drive folder or file write',async()=>{
 const d=fakeDrive(),A=loadTab({ls:ls(new Map()),fetch:async(u,i)=>new URL(u).pathname==='/drive/v3/about'?new Response('{}'):d.fetch(u,i)});
 await assert.rejects(A.sync(),/identity unavailable/);assert.equal(d.files.size,0);
});

test('legacy recovery preserves unrelated edits saved by another tab during hashing',async()=>{
 const store=new Map(),d=fakeDrive();let block=false,release,entered;
 const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
 const crypto={subtle:{digest:async(...args)=>{if(block){block=false;entered();await gate}return webcrypto.subtle.digest(...args)}}};
 const A=loadTab({ls:ls(store),fetch:d.fetch,crypto}),B=loadTab({ls:ls(store),fetch:d.fetch});
 const e=await A.save('bergerak',motionEntry('recover',10),{sync:false});
 const raw=store.get(A.CACHE_KEY);store.set('lgr1-db-cache-v1',raw);store.delete(A.CACHE_KEY);
 block=true;const recovering=A.recoverLegacy();await started;
 await B.save('bergerak',motionEntry('parallel',20),{sync:false});release();await recovering;
 assert.ok(A.get('bergerak','parallel'));assert.ok(A.get('bergerak','recover'));
 assert.equal(store.get('lgr1-db-cache-v1'),raw);
});
test('switching token during a sync aborts the old cache commit and retains its pending draft',async()=>{
 const store=new Map(),d=fakeDrive({account:'alice'}),A=loadTab({ls:ls(store),fetch:d.fetch});
 await A.save('bergerak',motionEntry('keep_a',10),{sync:false});const key=A.CACHE_KEY;
 const slow=pausedDrive(d);A.setFetch(slow.fetch);const run=A.sync();await slow.entered;
 A.useToken('new-account-token',3600);slow.release();await assert.rejects(run,/account changed/);
 assert.equal(JSON.parse(store.get(key)).kinds.bergerak.keep_a.dirty,true);
 const bob=fakeDrive({account:'bob'});A.setFetch(bob.fetch);await A.sync();
 assert.equal(bob.stats().writes,0);assert.equal(A.account,'bob');
});
