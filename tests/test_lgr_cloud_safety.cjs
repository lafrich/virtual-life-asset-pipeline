"use strict";
/* LGR-1 cloud safety: two independent device sessions, immutable drafts and
 * master conflict detection tested without any real Google tokens or network. */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const {webcrypto}=require("node:crypto");
const C=require("../site/lafrich-puppet-core.js");
const LM=require("../site/lgr1-motion.js");
const source=fs.readFileSync(path.join(__dirname,"../site/genesis-cloud.js"),"utf8");
const files=new Map();
let seq=0;
function response(data,status=200){
 return {ok:status>=200&&status<300,status,
  json:async()=>typeof data==="string"?JSON.parse(data):data,
  text:async()=>typeof data==="string"?data:JSON.stringify(data)};
}
async function fakeFetch(url,opts={}){
 const u=new URL(String(url)),method=opts.method||"GET";
 const parts=u.pathname.split("/").filter(Boolean),id=parts[parts.length-1];
 if(method==="POST"&&u.pathname==="/drive/v3/files"){
  const meta=JSON.parse(opts.body),newId="f"+(++seq);
  files.set(newId,{id:newId,name:meta.name,mimeType:meta.mimeType,
   parents:meta.parents||[],content:"",createdTime:new Date(Date.now()+seq*1000).toISOString()});
  return response({id:newId});
 }
 if(method==="PATCH"&&u.pathname.startsWith("/upload/drive/v3/files/")){
  const file=files.get(id);if(!file)return response({error:{message:"Missing file"}},404);
  file.content=opts.body;return response({id:file.id});
 }
 if(method==="GET"&&u.pathname==="/drive/v3/files"){
  const q=u.searchParams.get("q")||"";
  const parent=/^'([^']+)' in parents/.exec(q)?.[1];
  const name=/name = '([^']+)'/.exec(q)?.[1];
  const prefix=/name contains '([^']+)'/.exec(q)?.[1];
  const mime=/mimeType = '([^']+)'/.exec(q)?.[1];
  const found=[...files.values()].filter(f=>(!parent||f.parents.includes(parent))&&
   (!name||f.name===name)&&(!prefix||f.name.includes(prefix))&&
   (!mime||f.mimeType===mime)).map(f=>({id:f.id,name:f.name,
    mimeType:f.mimeType,createdTime:f.createdTime}));
  return response({files:found,nextPageToken:""});
 }
 if(method==="GET"&&u.pathname.startsWith("/drive/v3/files/")&&u.searchParams.get("alt")==="media"){
  const file=files.get(id);
  return file?response(file.content):response({error:{message:"Missing file"}},404);
 }
 throw Error("Fake Drive API unexpected: "+method+" "+url);
}
function device(){
 const world={LafrichPuppetCore:C,LGR1Motion:LM,google:{accounts:{oauth2:{initTokenClient({callback}){
  return {requestAccessToken(){callback({access_token:"mock-token",expires_in:3600})}};
 }}}}};
 const context=vm.createContext({window:world,fetch:fakeFetch,Headers,URLSearchParams,
  TextEncoder,crypto:webcrypto,Date,Promise,JSON,Array,Uint8Array,Error});
 vm.runInContext(source,context,{filename:"site/genesis-cloud.js"});
 return world.VLGenesisCloud;
}
const D=["se","sw","ne","nw"],id="lafrich_genesis_male";
function mockMaster(){
 const rig=C.master("male"),png="data:image/png;base64,AAAA";
 const binding={
  format:"lafrich-genesis-binding-v1",rigFormat:"LGR-1",id,gender:"male",
  sourceId:"genesis_male_nude",faceSource:"emosi.exe",originalNative:"V6B",
  frame:{width:64,height:112,directions:[...D]},
  hierarchy:{parts:[...C.PARTS],parents:{...C.PARENTS},drawOrder:[...C.DRAW_ORDER]},
  views:Object.fromEntries(D.map(d=>[d,{maskBase64:rig.masks[d],
   pivots:rig.pivots[d],spritePng:png}])),
  reviewed:Object.fromEntries(D.flatMap(d=>C.PARTS.map(p=>[d+"|"+p,true]))),
  rig
 };
 return {format:"lafrich-genesis-master-v1",rigFormat:"LGR-1",id,gender:"male",
  sourceId:"genesis_male_nude",faceSource:"emosi.exe",
  approvedAt:"2026-11-10T00:00:00.000Z",binding};
}
function mockLegacyFemale(){
 // A master saved before the PELVIS split (10 parts, 40 reviews).
 const fid="lafrich_genesis_female",rig=C.master("female"),png="data:image/png;base64,AAAA";
 const P=C.PARTS.indexOf("pelvis"),T=C.PARTS.indexOf("torso");
 for(const d of D){
  const m=C.decode(rig.masks[d]);for(let k=0;k<m.length;k++)if(m[k]===P)m[k]=T;
  rig.masks[d]=Buffer.from(m).toString("base64");
  delete rig.pivots[d].pelvis;delete rig.placements[d].pelvis;rig.pivots[d].torso={x:32,y:66};
 }
 const binding={
  format:"lafrich-genesis-binding-v1",rigFormat:"LGR-1",id:fid,gender:"female",
  sourceId:"genesis_female_nude",faceSource:"emosi.exe",originalNative:"V6B",
  frame:{width:64,height:112,directions:[...D]},
  hierarchy:{parts:[...C.LEGACY.PARTS],parents:{...C.LEGACY.PARENTS},drawOrder:[...C.LEGACY.DRAW_ORDER]},
  views:Object.fromEntries(D.map(d=>[d,{maskBase64:rig.masks[d],pivots:rig.pivots[d],spritePng:png}])),
  reviewed:Object.fromEntries(D.flatMap(d=>C.LEGACY.PARTS.map(p=>[d+"|"+p,true]))),
  rig
 };
 return {format:"lafrich-genesis-master-v1",rigFormat:"LGR-1",id:fid,gender:"female",
  sourceId:"genesis_female_nude",faceSource:"emosi.exe",approvedAt:"2026-11-09T00:00:00.000Z",binding};
}
async function run(){
 const a=device(),b=device();
 await Promise.all([a.connect(),b.connect()]);
 // Old 10-part master: still loads untouched; core migrates it in memory only.
 const legacy=mockLegacyFemale(),legacyJson=JSON.stringify(legacy);
 assert.equal((await a.save(legacy.id,legacy)).verified,true);
 const back=await b.load(legacy.id);
 assert.equal(JSON.stringify(back),legacyJson,"legacy master must round-trip unchanged");
 const migrated=C.validateMaster(back.binding.rig);
 assert.deepEqual(migrated.pivots.se.pelvis,{x:32,y:79});
 assert.deepEqual(migrated.pivots.se.torso,{x:32,y:75});
 assert(C.decode(migrated.masks.se).includes(C.PARTS.indexOf("pelvis")));
 assert.equal(JSON.stringify(back),legacyJson,"in-memory migration must not mutate the loaded master");
 const master=mockMaster();
 assert.equal((await a.save(id,master)).verified,true);
 const initial=await b.load(id);
 assert.equal(initial.approvedAt,master.approvedAt);
 // Merely reading another device's master must NOT authorize overwrite.
 const changed={...master,approvedAt:"2026-11-10T01:00:00.000Z"};
 await assert.rejects(()=>b.save(id,changed),/DRIVE CONFLICT/);
 assert.equal((await a.load(id)).approvedAt,master.approvedAt);
 // Explicit acceptance allows upgrade and creates immutable history first.
 await b.acknowledgeLoadedMaster(id,initial);
 assert.equal((await b.save(id,changed)).verified,true);
 assert.equal((await b.load(id)).approvedAt,changed.approvedAt);
 assert([...files.values()].some(x=>x.name.startsWith(id+".history.")),
  "Old approved master wasn't archived");
 // The original browser has an old baseline; it cannot erase b's revision.
 await assert.rejects(()=>a.save(id,{...master,approvedAt:"2026-11-10T02:00:00.000Z"}),/DRIVE CONFLICT/);
 const restored=await a.load(id);assert.equal(restored.approvedAt,changed.approvedAt);
 // Two draft revisions coexist instead of overwriting one another.
 const one={rig:C.master("male"),reviewed:{},edited:"first"};
 const two={rig:C.master("male"),reviewed:{"se|torso":true},edited:"second"};
 const receipt1=await a.saveDraft(id,one),receipt2=await b.saveDraft(id,two);
 assert.notEqual(receipt1.fileId,receipt2.fileId);
 const versions=await a.listDrafts(id);assert.equal(versions.length,2);
 assert.equal((await b.loadDraft(id,receipt1.fileId)).record.edited,"first");
 assert.equal((await a.loadDraft(id,receipt2.fileId)).record.edited,"second");
 assert.equal((await a.load(id)).approvedAt,changed.approvedAt,"Draft save replaced approved master");
 // LGR-1 motions: every save is a NEW immutable, read-back-verified file.
 const motion={id:"my_wave",name:"My wave",frames:[{ms:120,parts:{arm_r_upper:{a:150}}}]};
 const before=new Map([...files].map(([k,v])=>[k,v.content]));
 const m1=await a.saveMotion(motion),m2=await b.saveMotion({...motion,name:"My wave v2"});
 assert.equal(m1.verified,true);assert.notEqual(m1.fileId,m2.fileId);
 assert.match(m1.name,/^lgr1_motion\.my_wave\./);
 for(const [k,v] of before)assert.equal(files.get(k).content,v,"Motion save modified an existing Drive file");
 const listed=await a.listMotions();assert.equal(listed.length,2);
 assert.equal((await b.loadMotion(m1.fileId)).motion.name,"My wave");
 assert.equal((await a.loadMotion(m2.fileId)).motion.name,"My wave v2");
 await assert.rejects(()=>a.saveMotion({id:"Bad Id",frames:[{ms:120,parts:{}}]}),/a-z0-9_/);
 await assert.rejects(()=>a.loadMotion(receipt1.fileId),/not found/);
 const tampered=files.get(m1.fileId);tampered.content=tampered.content.replace("My wave","Evil");
 await assert.rejects(()=>a.loadMotion(m1.fileId),/checksum/);
 assert.equal((await a.load(id)).approvedAt,changed.approvedAt,"Motion save replaced approved master");
 console.log("PASS LGR-1 Drive: stale overwrite blocked, accepted update archived, immutable draft + motion versions verified");
}
run().catch(err=>{console.error(err);process.exitCode=1});
