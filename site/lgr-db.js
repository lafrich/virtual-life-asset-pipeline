/* LGR-1 DATABASE — shared cloud loader for Mahluk Hidup (Bergerak + Beraksi)
 * and the game apps (Mainkan / Semesta / Bangun Ruang on lafrich.github.io).
 *
 *  kinds     bergerak  → animation database (lgr1-bergerak-v1, docs/BERGERAK_FORMAT.md)
 *            beraksi   → action-scene database (lgr1-beraksi-v1, docs/BERAKSI_FORMAT.md)
 *  Drive     Membangun / Mahluk Hidup / Database / Bergerak / <id>.json
 *            Membangun / Mahluk Hidup / Database / Beraksi  / <id>.json
 *            Membangun / Mahluk Hidup / Database / Backup   / <kind>.<id>.<when>.<why>.json
 *            (drive.file scope: only files this app created are ever seen or touched)
 *  cache     localStorage "lgr1-db-cache-v1" (same origin for every lafrich.github.io app)
 *  sync      newest `updated` wins; the losing copy is written to Backup first.
 *            Deleting moves the Drive file into Backup (never destroys it).
 *  Docs: docs/LGR_DB.md. Pure helpers run in node (tests/test_lgr_db.cjs).
 */
(function(root,factory){"use strict";const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root&&root.document)root.LGRDB=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(root){
"use strict";
const VERSION="lgr-db-1";
const CLIENT="369223065433-idbuhhj6akuf2cmo6vpbiblkhu019csn.apps.googleusercontent.com";
const SCOPE="https://www.googleapis.com/auth/drive.file";
const API="https://www.googleapis.com/drive/v3/files",UPLOAD="https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_MIME="application/vnd.google-apps.folder";
const BASE_PATH=Object.freeze(["Membangun","Mahluk Hidup","Database"]);
const KINDS=Object.freeze({
 bergerak:Object.freeze({folder:"Bergerak",format:"lgr1-bergerak-v1"}),
 beraksi:Object.freeze({folder:"Beraksi",format:"lgr1-beraksi-v1"})});
const BACKUP_FOLDER="Backup",FILE_SCHEMA="lgr1-db-file-v1",CACHE_KEY="lgr1-db-cache-v1",TOKEN_KEY="lgr1-db-session-v1";
const MAX_FRAMES=60,MAX_ACTORS=8,MAX_TRACK=24,MAX_EMOSI=24,MAX_SCENE_MS=600000;
const DIRS=["se","sw","ne","nw"];
const ID_RE=/^[a-z0-9_]{1,40}$/;
const M=()=>root?.LGR1Motion||(typeof require==="function"?require("./lgr1-motion.js"):null);
/* ---------------- helpers ---------------- */
function assert(c,msg){if(!c)throw Error(msg)}
const str=(v,n)=>String(v==null?"":v).slice(0,n);
const int=(v,lo,hi,def)=>{const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):def};
function slug(s){return String(s||"").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,40)||"tanpa_nama"}
function canonical(v){ // stable JSON (sorted keys) → same entry = same sha everywhere
 if(Array.isArray(v))return "["+v.map(canonical).join(",")+"]";
 if(v&&typeof v==="object")return "{"+Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
 return JSON.stringify(v);
}
async function sha256(s){
 const bytes=new TextEncoder().encode(s);
 const subtle=root?.crypto?.subtle||(typeof require==="function"?require("crypto").webcrypto.subtle:null);
 const d=await subtle.digest("SHA-256",bytes);
 return Array.from(new Uint8Array(d),b=>b.toString(16).padStart(2,"0")).join("");
}
const contentSha=e=>sha256(canonical({...e,rev:undefined,updated:undefined}));
/* ---------------- Bergerak (animation) ---------------- */
// Motion frames use the SAME lgr1-motion-v1 frame shape as media/lgr1/motions.json
// and are validated by LGR1Motion.validateMotion in chunks of 6 (its keyframe
// limit), so a Bergerak motion up to 60 frames plays through the unchanged
// LGR1Motion.framePose / frameIndexAt / frameOrder runtime.
function validateMotionLong(m,poses){
 const Mo=M();assert(Mo?.validateMotion,"LGR1Motion not loaded");
 assert(m&&typeof m==="object","Motion missing");
 assert(Array.isArray(m.frames)&&m.frames.length>=1&&m.frames.length<=MAX_FRAMES,"Motion needs 1–"+MAX_FRAMES+" frames");
 const out=[];let head=null;
 for(let i=0;i<m.frames.length;i+=6){
  const v=Mo.validateMotion({...m,frames:m.frames.slice(i,i+6)},poses);
  if(!head)head=v;out.push(...v.frames);
 }
 return {...head,frames:out};
}
function validateBergerak(e,poses){
 assert(e&&e.format===KINDS.bergerak.format,"Not an lgr1-bergerak-v1 entry");
 assert(ID_RE.test(String(e.id||"")),"Bergerak id must be a-z0-9_ (1–40)");
 const motion=validateMotionLong({...e.motion,id:e.id},poses);
 const out={format:KINDS.bergerak.format,schema:1,id:e.id,name:str(e.name||e.id,60),category:str(e.category||"umum",30),
  notes:str(e.notes,500),rev:int(e.rev,1,1e9,1),updated:validDate(e.updated),created:validDate(e.created||e.updated),
  basedOn:e.basedOn?str(e.basedOn,60):null,
  preview:{gender:e.preview?.gender==="female"?"female":"male"},motion};
 motion.name=out.name;
 return out;
}
function validDate(d){const t=Date.parse(d||"");return Number.isFinite(t)?new Date(t).toISOString():new Date(0).toISOString()}
/* ---------------- Beraksi (scene) ---------------- */
const TONES=["porcelain","light","tan","medium","brown","deep"];
const WEAR_KEYS={top:/^[a-z_]{1,30}$/,topColor:/^[a-z]{1,20}$/,pants:/^[a-z_]{1,30}$/,pantsColor:/^[a-z]{1,20}$/,
 shoes:/^[a-z_]{1,30}$/,shoesColor:/^[a-z]{1,20}$/,hair:/^[a-z_]{1,30}$/,hairColor:/^[a-z]{1,20}$/};
const MOTION_REF=/^(builtin|bergerak):[a-z0-9_]{1,40}$/;
function validateWear(w){
 if(!w)return null;assert(typeof w==="object","Invalid wear");const out={};
 for(const [k,re] of Object.entries(WEAR_KEYS)){if(w[k]==null||w[k]==="")continue;assert(re.test(String(w[k])),"Invalid wear "+k);out[k]=String(w[k])}
 return Object.keys(out).length?out:null;
}
function validateBeraksi(e){
 assert(e&&e.format===KINDS.beraksi.format,"Not an lgr1-beraksi-v1 entry");
 assert(ID_RE.test(String(e.id||"")),"Beraksi id must be a-z0-9_ (1–40)");
 assert(Array.isArray(e.actors)&&e.actors.length>=1&&e.actors.length<=MAX_ACTORS,"Scene needs 1–"+MAX_ACTORS+" characters");
 const keys=new Set();
 const actors=e.actors.map((a,i)=>{
  const key=String(a?.key||"");assert(/^[a-z0-9_]{1,20}$/.test(key)&&!keys.has(key),"Actor "+(i+1)+": bad or duplicate key");keys.add(key);
  assert(a.gender==="male"||a.gender==="female","Actor "+key+": gender must be male/female");
  const track=(a.track||[]).map((t,j)=>{
   assert(MOTION_REF.test(String(t?.motion||"")),"Actor "+key+" animation "+(j+1)+": motion must be builtin:<id> or bergerak:<id>");
   return {motion:t.motion,ms:int(t.ms,40,MAX_SCENE_MS,1000)};
  });
  assert(track.length>=1&&track.length<=MAX_TRACK,"Actor "+key+" needs 1–"+MAX_TRACK+" animations");
  const emosi=(a.emosi||[]).map((f,j)=>{
   assert(/^[A-Za-z0-9_.:-]{1,120}$/.test(String(f?.face||"")),"Actor "+key+" emosi "+(j+1)+": face id missing");
   return {face:String(f.face),startMs:int(f.startMs,0,MAX_SCENE_MS,0),ms:int(f.ms,40,MAX_SCENE_MS,1000)};
  }).sort((x,y)=>x.startMs-y.startMs);
  assert(emosi.length<=MAX_EMOSI,"Actor "+key+": too many emosi");
  const tone=TONES.includes(a.skin?.tone)?a.skin.tone:"light";
  return {key,name:str(a.name||key,40),gender:a.gender,skin:{tone},outfit:str(a.outfit||"none",40),wear:validateWear(a.wear),
   x:int(a.x,-512,512,0),y:int(a.y,-256,256,0),dir:DIRS.includes(a.dir)?a.dir:"se",flip:!!a.flip,layer:int(a.layer,-99,99,i),
   track,emosi};
 });
 const auto=Math.max(...actors.map(a=>a.track.reduce((n,t)=>n+t.ms,0)));
 return {format:KINDS.beraksi.format,schema:1,id:e.id,name:str(e.name||e.id,60),category:str(e.category||"umum",30),notes:str(e.notes,500),
  rev:int(e.rev,1,1e9,1),updated:validDate(e.updated),created:validDate(e.created||e.updated),
  loop:e.loop!==false,durationMs:e.durationMs?int(e.durationMs,40,MAX_SCENE_MS,auto):null,
  stage:{units:"px",anchor:"feet",footX:32,footY:101,width:int(e.stage?.width,64,1024,256),height:int(e.stage?.height,64,512,160)},
  actors};
}
function validate(kind,e,poses){
 if(kind==="bergerak")return validateBergerak(e,poses);
 if(kind==="beraksi")return validateBeraksi(e);
 throw Error("Unknown LGR database kind "+kind);
}
/* ---------------- playback helpers (shared with the game) ---------------- */
function sceneDuration(s){return s.durationMs||Math.max(...s.actors.map(a=>a.track.reduce((n,t)=>n+t.ms,0)))}
// → {item, index, localMs} for an actor at scene time t (holds the last item at the end)
function trackAt(actor,t){
 let acc=0;
 for(let i=0;i<actor.track.length;i++){const it=actor.track[i];if(t<acc+it.ms)return {item:it,index:i,localMs:t-acc};acc+=it.ms}
 const last=actor.track[actor.track.length-1];return {item:last,index:actor.track.length-1,localMs:last.ms-1,ended:true};
}
function emosiAt(actor,t){let cur=null;for(const f of actor.emosi||[])if(t>=f.startMs&&t<f.startMs+f.ms)cur={...f,localMs:t-f.startMs};return cur}
function drawOrder(scene){return scene.actors.map((a,i)=>({a,i})).sort((p,q)=>p.a.layer-q.a.layer||p.i-q.i).map(p=>p.a)}
/* ---------------- local cache ---------------- */
function storage(){try{return root?.localStorage||null}catch{return null}}
function emptyCache(){return {format:CACHE_KEY,syncedAt:null,kinds:{bergerak:{},beraksi:{}}}}
function readCache(){
 try{const c=JSON.parse(storage()?.getItem(CACHE_KEY)||"null");
  if(c?.format===CACHE_KEY&&c.kinds)return {...emptyCache(),...c,kinds:{bergerak:c.kinds.bergerak||{},beraksi:c.kinds.beraksi||{}}}}catch{}
 return emptyCache();
}
function writeCache(c){try{storage()?.setItem(CACHE_KEY,JSON.stringify(c));return true}catch{return false}}
/* ---------------- Drive ---------------- */
let token="",expiry=0,connecting=null,folders={},fetchImpl=null,listeners=new Set(),state={status:"offline",message:"Belum sync",lastSync:null};
const doFetch=(...a)=>(fetchImpl||root.fetch.bind(root))(...a);
function setFetch(f){fetchImpl=f}
const connected=()=>Boolean(token)&&Date.now()+60000<expiry;
function emit(status,message){state={...state,status,message};if(status==="synced")state.lastSync=new Date().toISOString();for(const f of listeners)try{f(state)}catch{}}
function onStatus(f){listeners.add(f);try{f(state)}catch{}return()=>listeners.delete(f)}
function restoreSession(){
 try{const s=JSON.parse(root?.sessionStorage?.getItem(TOKEN_KEY)||"null");
  if(s&&s.token&&Date.now()+60000<s.expiry){token=s.token;expiry=s.expiry}}catch{}
 return connected();
}
function useToken(t,expiresInSec){ // for tests / apps that already hold a drive.file token
 token=String(t||"");expiry=Date.now()+(Number(expiresInSec)||3500)*1000;folders={};
 try{root?.sessionStorage?.setItem(TOKEN_KEY,JSON.stringify({token,expiry}))}catch{}
}
function disconnect(){token="";expiry=0;folders={};try{root?.sessionStorage?.removeItem(TOKEN_KEY)}catch{};emit("offline","Drive terputus")}
async function connect(){
 if(connected()||restoreSession())return true;
 if(connecting)return connecting;
 const auth=root?.google?.accounts?.oauth2;
 if(!auth?.initTokenClient)throw Error("Login Google belum siap; coba reload (Chrome)");
 connecting=new Promise((resolve,reject)=>{
  try{auth.initTokenClient({client_id:CLIENT,scope:SCOPE,include_granted_scopes:true,
   callback:r=>{if(r.error||!r.access_token){reject(Error(r.error_description||r.error||"Login ditolak"));return}
    useToken(r.access_token,r.expires_in);resolve(true)},
   error_callback:e=>reject(Error(e?.message||e?.type||"Login Google ditutup"))}).requestAccessToken({prompt:""})}
  catch(e){reject(e)}
 }).finally(()=>{connecting=null});
 return connecting;
}
async function request(url,init={}){
 assert(connected(),"Drive belum terhubung");
 const h=new Headers(init.headers||{});h.set("Authorization","Bearer "+token);
 const r=await doFetch(url,{...init,headers:h,cache:"no-store"});
 if(!r.ok){let m="";try{m=(await r.json())?.error?.message||""}catch{}
  if(r.status===401)disconnect();
  throw Error("Google Drive "+r.status+(m?": "+m:""))}
 return r;
}
const q=s=>String(s).replace(/\\/g,"\\\\").replace(/'/g,"\\'");
async function list(parent,extra){
 const params=new URLSearchParams({q:"'"+q(parent)+"' in parents and trashed = false"+(extra||""),
  fields:"nextPageToken,files(id,name,mimeType,modifiedTime,appProperties)",pageSize:"1000"});
 const out=[];let page="";
 do{if(page)params.set("pageToken",page);const r=await(await request(API+"?"+params)).json();out.push(...(r.files||[]));page=r.nextPageToken||""}while(page&&out.length<5000);
 return out;
}
async function ensureFolder(parent,name){
 const f=(await list(parent," and name = '"+q(name)+"' and mimeType = '"+FOLDER_MIME+"'"))[0];if(f)return f.id;
 const c=await(await request(API+"?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({name,parents:[parent],mimeType:FOLDER_MIME})})).json();
 assert(c?.id,"Folder "+name+" gagal dibuat");return c.id;
}
async function folder(name){
 if(folders[name])return folders[name];
 if(!folders.__base){let cur="root";for(const s of BASE_PATH)cur=await ensureFolder(cur,s);folders.__base=cur}
 folders[name]=await ensureFolder(folders.__base,name);return folders[name];
}
function multipart(meta,body){
 const b="lgrdb"+Math.random().toString(36).slice(2);
 return {headers:{"Content-Type":"multipart/related; boundary="+b},
  body:"--"+b+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+JSON.stringify(meta)+"\r\n--"+b+
   "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+body+"\r\n--"+b+"--"};
}
async function fileBody(kind,entry){
 const sha=await sha256(canonical(entry));
 return {sha,text:JSON.stringify({schema:FILE_SCHEMA,app:VERSION,kind,id:entry.id,sha256:sha,entry})};
}
const props=(entry,sha)=>({lgrKind:entry.format,lgrId:entry.id,lgrRev:String(entry.rev),lgrUpdated:entry.updated,lgrSha:sha.slice(0,40)});
async function readFile(fileId){
 const text=await(await request(API+"/"+encodeURIComponent(fileId)+"?alt=media")).text();
 assert(text.length<3000000,"Drive file too large");
 const v=JSON.parse(text);
 assert(v?.schema===FILE_SCHEMA,"Not an LGR database file");
 assert(await sha256(canonical(v.entry))===v.sha256,"Checksum mismatch in "+fileId);
 return v;
}
async function writeFile(kind,entry,fileId){
 const {sha,text}=await fileBody(kind,entry),parent=await folder(KINDS[kind].folder);
 const meta={name:entry.id+".json",mimeType:"application/json",appProperties:props(entry,sha)};
 let id=fileId;
 if(id){const m=multipart(meta,text);await request(UPLOAD+"/"+encodeURIComponent(id)+"?uploadType=multipart&fields=id",{method:"PATCH",...m})}
 else{const m=multipart({...meta,parents:[parent]},text);id=(await(await request(UPLOAD+"?uploadType=multipart&fields=id",{method:"POST",...m})).json()).id}
 const back=await readFile(id);
 assert(back.sha256===sha,"Read-back Drive tidak cocok; simpan belum terverifikasi");
 return {fileId:id,sha};
}
async function backup(kind,entry,why){
 const {text}=await fileBody(kind,entry),parent=await folder(BACKUP_FOLDER);
 const name=kind+"."+entry.id+"."+new Date().toISOString().replace(/[:.]/g,"-")+"."+why+".json";
 const m=multipart({name,mimeType:"application/json",parents:[parent]},text);
 await request(UPLOAD+"?uploadType=multipart&fields=id",{method:"POST",...m});
 return name;
}
async function moveToBackup(kind,id,fileId){
 const from=await folder(KINDS[kind].folder),to=await folder(BACKUP_FOLDER);
 const name=kind+"."+id+"."+new Date().toISOString().replace(/[:.]/g,"-")+".deleted.json";
 await request(API+"/"+encodeURIComponent(fileId)+"?addParents="+encodeURIComponent(to)+"&removeParents="+encodeURIComponent(from)+"&fields=id",
  {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({name})});
 return name;
}
/* ---------------- sync ---------------- */
let poses=null;
function setPoses(p){poses=p}
// Pure decision for one id (exported for tests):
//   local  = cache row {entry, sha, baseSha, dirty, deleted, fileId} | undefined
//   remote = {sha, updated, fileId} | undefined
function decide(local,remote){
 if(!local&&remote)return "pull";
 if(local&&!remote){
  if(local.deleted)return local.fileId?"forget":"forget";
  if(local.dirty||!local.fileId)return "push-new";
  return "remote-deleted";
 }
 if(!local&&!remote)return "none";
 if(local.deleted)return remote.sha===local.baseSha?"delete-remote":"pull"; // someone changed it after we deleted → keep theirs
 if(remote.sha===local.sha)return "same";
 if(!local.dirty)return "pull";
 if(remote.sha===local.baseSha)return "push";
 return Date.parse(local.entry.updated)>=Date.parse(remote.updated)?"conflict-local-wins":"conflict-remote-wins";
}
async function syncKind(kind,cache,report){
 const parent=await folder(KINDS[kind].folder),files=await list(parent," and mimeType = 'application/json'");
 const rows=cache.kinds[kind],remote={};
 for(const f of files){const id=f.appProperties?.lgrId||f.name.replace(/\.json$/,"");if(!ID_RE.test(id)||remote[id])continue;
  remote[id]={fileId:f.id,sha:f.appProperties?.lgrSha||"",updated:f.appProperties?.lgrUpdated||f.modifiedTime||""}}
 for(const id of new Set([...Object.keys(rows),...Object.keys(remote)])){
  const L=rows[id],R=remote[id];
  try{
   const local=L?{...L,sha:L.sha?.slice(0,40),baseSha:L.baseSha?.slice(0,40)}:undefined;
   const act=decide(local,R);
   if(act==="pull"||act==="conflict-remote-wins"){
    const v=await readFile(R.fileId),e=validate(kind,v.entry,poses); // invalid Drive data is never loaded
    if(act==="conflict-remote-wins"){report.backups.push(await backup(kind,L.entry,"local-older"));report.conflicts++}
    rows[id]={entry:e,sha:v.sha256,baseSha:v.sha256,fileId:R.fileId,dirty:false};report.pulled++;
   }else if(act==="push"||act==="push-new"||act==="conflict-local-wins"){
    if(act==="conflict-local-wins"){const v=await readFile(R.fileId);report.backups.push(await backup(kind,v.entry,"drive-older"));report.conflicts++}
    // confirmed overwrite (e.g. IMPORT over an existing name): keep the replaced version
    if(L.backupOf&&act!=="conflict-local-wins"){report.backups.push(await backup(kind,L.backupOf,"overwritten"))}
    const w=await writeFile(kind,L.entry,R?.fileId);rows[id]={...L,sha:w.sha,baseSha:w.sha,fileId:w.fileId,dirty:false};delete rows[id].backupOf;report.pushed++;
   }else if(act==="delete-remote"){report.backups.push(await moveToBackup(kind,id,R.fileId));delete rows[id];report.deleted++}
   else if(act==="forget"||act==="remote-deleted"){delete rows[id];if(act==="remote-deleted")report.deleted++}
  }catch(e){report.errors.push(kind+"/"+id+": "+e.message)}
 }
}
const SAVE_DEBOUNCE_MS=400,PEER_FRESH_MS=2500,LOCK_KEY="lgr-db-sync-lock-v1",LOCK_MS=120000;
const tabId="t"+Math.random().toString(36).slice(2);
let syncing=null,syncRunCount=0,lastSyncOk=false,lastSyncFailed=false;
let debounceTimer=null,debounceWait=null;
function peerJustSynced(){
 const t=Date.parse(readCache().syncedAt||"");
 return Number.isFinite(t)&&Date.now()-t<PEER_FRESH_MS&&pending()===0;
}
function lockOwner(){try{return JSON.parse(storage()?.getItem(LOCK_KEY)||"null")}catch{return null}}
function tryLock(){
 const s=storage();if(!s)return true;
 const cur=lockOwner();
 if(cur&&cur.owner!==tabId&&Date.now()-cur.at<LOCK_MS)return false;
 try{s.setItem(LOCK_KEY,JSON.stringify({owner:tabId,at:Date.now()}));
  const chk=lockOwner();return chk&&chk.owner===tabId}catch{return true}
}
function releaseLock(){try{if(lockOwner()?.owner===tabId)storage()?.removeItem(LOCK_KEY)}catch{}}
function tickLock(){try{if(lockOwner()?.owner===tabId)storage()?.setItem(LOCK_KEY,JSON.stringify({owner:tabId,at:Date.now()}))}catch{}}
async function acquireLock(){
 if(tryLock())return {waited:false};
 const start=Date.now();
 while(Date.now()-start<LOCK_MS){
  if(peerJustSynced())return {waited:true,shared:true};
  await new Promise(r=>setTimeout(r,40));
  if(tryLock())return {waited:true};
 }
 return {waited:true};
}
function skipAuto(opts){
 if(!opts.auto)return false;
 if(lastSyncFailed)return true; // never auto-retry a failed sync (no error loop)
 if(pending()>0)return false;   // coming back online with unsynced edits → one flush
 return lastSyncOk;             // already synced this session and nothing is dirty
}
function flushDebounce(runner){
 if(!debounceTimer)return runner;
 clearTimeout(debounceTimer);debounceTimer=null;
 const p=debounceWait;debounceWait=null;
 if(p)runner.then(p._res,p._rej);
 return runner;
}
function scheduleSync(opts={}){
 const ms=opts.debounceMs??0;
 if(ms<=0)return sync({...opts,debounceMs:0});
 if(!debounceWait){let res,rej;debounceWait=new Promise((r,j)=>{res=r;rej=j});debounceWait._res=res;debounceWait._rej=rej}
 clearTimeout(debounceTimer);
 debounceTimer=setTimeout(()=>{const p=debounceWait;debounceTimer=null;debounceWait=null;sync({...opts,debounceMs:0}).then(p._res,p._rej)},ms);
 return debounceWait;
}
async function runOnce(opts){
 if(opts.auto&&skipAuto(opts))return {pulled:0,pushed:0,deleted:0,conflicts:0,backups:[],errors:[],skipped:"auto"};
 const lock=await acquireLock();
 try{
  if((lock.shared||(lock.waited&&peerJustSynced()))&&!opts.force&&!opts.interactive&&pending()===0){
   lastSyncOk=true;lastSyncFailed=false;
   emit("synced","Tersinkron (tab lain) · "+count("bergerak")+" animasi · "+count("beraksi")+" adegan");
   return {pulled:0,pushed:0,deleted:0,conflicts:0,backups:[],errors:[],shared:true};
  }
  if(opts.auto&&skipAuto(opts))return {pulled:0,pushed:0,deleted:0,conflicts:0,backups:[],errors:[],skipped:"auto"};
  const report={pulled:0,pushed:0,deleted:0,conflicts:0,backups:[],errors:[]};
  try{
   if(!connected()&&!restoreSession()){if(opts.interactive)await connect();else throw Error("Drive belum terhubung")}
   emit("syncing","Sync database…");
   syncRunCount++;
   const cache=readCache();
   for(const kind of Object.keys(KINDS)){tickLock();await syncKind(kind,cache,report)}
   cache.syncedAt=new Date().toISOString();writeCache(cache);
   lastSyncOk=!report.errors.length;lastSyncFailed=!!report.errors.length;
   emit(report.errors.length?"error":"synced",report.errors.length?"Sync sebagian gagal: "+report.errors[0]:
    "Tersinkron · "+count("bergerak")+" animasi · "+count("beraksi")+" adegan"+(report.conflicts?" · "+report.conflicts+" konflik (backup disimpan)":""));
   return report;
  }catch(e){lastSyncOk=false;lastSyncFailed=true;emit("error","Sync gagal: "+e.message+" · pakai cache offline");throw e}
 }finally{releaseLock()}
}
async function sync(opts={}){
 if(opts.auto&&!syncing&&skipAuto(opts))return {pulled:0,pushed:0,deleted:0,conflicts:0,backups:[],errors:[],skipped:"auto"};
 if(syncing)return syncing;
 const run=runOnce(opts);
 syncing=flushDebounce(run).finally(()=>{syncing=null});
 return syncing;
}
function count(kind){return Object.values(readCache().kinds[kind]).filter(r=>!r.deleted).length}
/* ---------------- public read / write ---------------- */
let cacheGate=Promise.resolve();
function withCacheWrite(fn){const next=cacheGate.then(fn,fn);cacheGate=next.then(()=>{},()=>{});return next}
function all(kind){assert(KINDS[kind],"Unknown kind");return Object.values(readCache().kinds[kind]).filter(r=>!r.deleted).map(r=>r.entry).sort((a,b)=>a.name.localeCompare(b.name))}
function get(kind,id){const r=readCache().kinds[kind]?.[id];return r&&!r.deleted?r.entry:null}
function pending(){const c=readCache();let n=0;for(const k of Object.keys(KINDS))for(const r of Object.values(c.kinds[k]))if(r.dirty||r.deleted)n++;return n}
async function save(kind,entry,opts={}){
 const e=await withCacheWrite(async()=>{
  const c=readCache(),prev=c.kinds[kind][entry.id];
  const stamp=new Date().toISOString();
  const out=validate(kind,{...entry,rev:(prev?.entry?.rev||0)+1,updated:stamp,created:prev?.entry?.created||entry.created||stamp},poses);
  const sha=await sha256(canonical(out));
  const row={entry:out,sha,baseSha:prev?.baseSha||"",fileId:prev?.fileId||"",dirty:true};
  if(opts.overwrite&&prev&&!prev.deleted)row.backupOf=prev.backupOf||prev.entry; // replaced version → Drive Backup on push
  c.kinds[kind][out.id]=row;
  assert(writeCache(c),"Cache penuh: simpan gagal");
  return out;
 });
 let synced=false;
 if(opts.sync!==false&&(connected()||restoreSession())){
  try{
   await scheduleSync({debounceMs:SAVE_DEBOUNCE_MS});
   if(readCache().kinds[kind][e.id]?.dirty&&!lastSyncFailed)await sync(); // trailing: this save landed after the in-flight pass
   synced=!readCache().kinds[kind][e.id]?.dirty;
  }catch{}
 }
 else emit("pending","Tersimpan offline · "+pending()+" belum di-sync");
 return {entry:e,synced};
}
async function remove(kind,id,opts={}){
 const ok=await withCacheWrite(()=>{
  const c=readCache(),r=c.kinds[kind][id];if(!r)return false;
  if(!r.fileId)delete c.kinds[kind][id];else c.kinds[kind][id]={...r,deleted:true,dirty:true};
  writeCache(c);return true;
 });
 if(!ok)return false;
 if(opts.sync!==false&&(connected()||restoreSession())){
  try{await scheduleSync({debounceMs:SAVE_DEBOUNCE_MS});if(pending()&&!lastSyncFailed)await sync()}catch{}
 }
 return true;
}

function exportAll(){const c=readCache();return {format:"lgr1-db-export-v1",exported:new Date().toISOString(),
 bergerak:all("bergerak"),beraksi:all("beraksi"),syncedAt:c.syncedAt}}
/* ---------------- motion lookup for scenes / game ---------------- */
let builtin=null;
async function loadBuiltin(url){
 if(builtin)return builtin;
 const base=url||(root?.LGRDB_BASE||"")+"media/lgr1/motions.json";
 const lib=M().validateLibrary(await(await doFetch(base,{cache:"no-cache"})).json());
 builtin=lib;if(!poses)poses=lib.poses;return lib;
}
function resolveMotion(ref){
 const [src,id]=String(ref||"").split(":");
 if(src==="builtin")return builtin?.motions.find(m=>m.id===id)||null;
 if(src==="bergerak")return get("bergerak",id)?.motion||null;
 return null;
}
/* ---------------- game runtime API ---------------- */
// await LGRDB.ready({sync:true}) → built-ins loaded + (if a Drive session exists) fresh sync.
async function ready(opts={}){
 await loadBuiltin(opts.motionsUrl);
 if(opts.sync!==false&&(connected()||restoreSession()))try{await sync()}catch{}
 return {bergerak:all("bergerak").length,beraksi:all("beraksi").length,syncedAt:readCache().syncedAt};
}
// validated, playable lgr1-motion (LGR1Motion.framePose/frameIndexAt work on it)
function motion(ref){
 const r=String(ref||"").includes(":")?ref:"bergerak:"+ref,m=resolveMotion(r);if(!m)return null;
 if(r.startsWith("builtin:"))return m;
 try{return validateMotionLong({...m,id:r.slice(9)},poses||builtin?.poses)}catch{return null}
}
function scene(id){return get("beraksi",id)}
// fires when another tab (e.g. Mahluk Hidup) saved/synced the shared cache
function onChange(cb){const h=e=>{if(e.key===CACHE_KEY)cb()};root?.addEventListener?.("storage",h);return()=>root?.removeEventListener?.("storage",h)}
return Object.freeze({VERSION,ready,motion,scene,onChange,CLIENT,SCOPE,BASE_PATH,KINDS,BACKUP_FOLDER,FILE_SCHEMA,CACHE_KEY,MAX_FRAMES,MAX_ACTORS,TONES,
 slug,canonical,sha256,validate,validateBergerak,validateBeraksi,validateMotionLong,decide,
 sceneDuration,trackAt,emosiAt,drawOrder,
 connect,connected,disconnect,useToken,restoreSession,setFetch,onStatus,get state(){return state},
 sync,scheduleSync,SAVE_DEBOUNCE_MS,syncRuns:()=>syncRunCount,
 all,get,save,remove,pending,readCache,exportAll,setPoses,loadBuiltin,resolveMotion,
 get builtin(){return builtin}});
});
