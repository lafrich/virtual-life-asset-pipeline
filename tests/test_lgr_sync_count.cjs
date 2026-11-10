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
 const world={localStorage:shared.ls,sessionStorage:ls(new Map()),document:{},fetch:shared.fetch,crypto:webcrypto,
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
