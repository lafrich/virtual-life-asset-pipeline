/* Mahluk Hidup workspace backup. Additive, separate from Emosi.exe's own Drive sync.
 * One Google Drive file stores V6P user keys + Action situation database +
 * Emosi IndexedDB/local drafts. Never stores an OAuth token.
 */
(function(root){
"use strict";
const CLIENT="369223065433-idbuhhj6akuf2cmo6vpbiblkhu019csn.apps.googleusercontent.com";
const API="https://www.googleapis.com/drive/v3/files";
const UP="https://www.googleapis.com/upload/drive/v3/files";
const KIND="mahluk-hidup-unified-backup-v1";
const FILENAME="mahluk-hidup-workspace-v1.json";
const KEYS=[
 "vl-v6p-part-overrides-v1","vl-v6p-project-catalog-v1","vl-v6p-act-clips-v1",
 "mahluk-action-situations-v1","emotion-studio-local-fallback-v1",
 "emosi-convo-projects-v1","emosi-convo-mouth-guide-v1"
];
const DB="emotion-studio-local-v1",STORE="emotion-assets";
const byteLimit=25*1024*1024;
let token="",expires=0,baseFolder="",savedFile="";
function connected(){return !!token&&Date.now()+60000<expires}
function oauth(){
 return root.google?.accounts?.oauth2;
}
function connect(){
 if(!oauth()?.initTokenClient)return Promise.reject(Error("Google Sign-In belum siap · reload via Chrome"));
 return new Promise((resolve,reject)=>{
  try{oauth().initTokenClient({
   client_id:CLIENT,scope:"https://www.googleapis.com/auth/drive.file",include_granted_scopes:true,
   callback:r=>{
    if(r.error||!r.access_token){reject(Error(r.error_description||r.error||"Google Drive denied"));return}
    token=r.access_token;expires=Date.now()+1000*(Number(r.expires_in)||3500);
    baseFolder="";savedFile="";resolve(true);
   },
   error_callback:e=>reject(Error(e?.message||e?.type||"Google popup closed"))
  }).requestAccessToken({prompt:""});}catch(e){reject(e)}
 });
}
async function api(url,opts={}){
 if(!connected())throw Error("Connect Google Drive first / session expired");
 const headers=new Headers(opts.headers||{});headers.set("Authorization","Bearer "+token);
 const r=await fetch(url,{...opts,headers,cache:"no-store"});
 if(!r.ok){let detail="";try{detail=(await r.json())?.error?.message||""}catch{}
  throw Error("Drive HTTP "+r.status+" "+detail)}
 return r;
}
function quoted(s){return String(s).replace(/\\/g,"\\\\").replace(/'/g,"\\'")}
async function find(parent,name,mime){
 const p=new URLSearchParams({q:"'"+quoted(parent)+"' in parents and name = '"+quoted(name)+"' and trashed = false"+
  (mime?" and mimeType = '"+quoted(mime)+"'":""),fields:"nextPageToken,files(id,name,mimeType,modifiedTime)",pageSize:"100"});
 const r=await(await api(API+"?"+p)).json();return (r.files||[])[0]||null;
}
async function createFolder(parent,name){
 const mime="application/vnd.google-apps.folder";
 const previous=await find(parent,name,mime);if(previous)return previous.id;
 const r=await api(API+"?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({name,mimeType:mime,parents:[parent]})});
 return (await r.json()).id;
}
async function folder(){
 if(baseFolder)return baseFolder;
 const main=await createFolder("root","Membangun");
 const mahluk=await createFolder(main,"Mahluk Hidup");
 baseFolder=await createFolder(mahluk,"Unified Workspace Backups");
 return baseFolder;
}
async function snapshotIdb(){
 if(!root.indexedDB)return [];
 const database=await new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>{
   if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:"id"});
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 });
 try{return await new Promise((resolve,reject)=>{
  const tx=database.transaction(STORE,"readonly");
  const req=tx.objectStore(STORE).getAll();
  tx.oncomplete=()=>resolve(req.result||[]);
  tx.onerror=()=>reject(tx.error||Error("Emotion database read failed"));
 })}finally{database.close()}
}
async function restoreIdb(entries){
 if(!entries.length||!root.indexedDB)return;
 const database=await new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:"id"})};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 });
 try{await new Promise((resolve,reject)=>{
  const tx=database.transaction(STORE,"readwrite"),store=tx.objectStore(STORE);
  for(const item of entries)store.put(item);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error("Emotion database restore failed"));
 })}finally{database.close()}
}
function localKeys(){
 const data={};
 for(const key of KEYS){const raw=localStorage.getItem(key);if(raw!==null){
  JSON.parse(raw);data[key]=raw;
 }}
 return data;
}
function validatePayload(payload){
 if(!payload||payload.format!==KIND||!payload.local||typeof payload.local!=="object"||
  !Array.isArray(payload.emotions)||payload.emotions.length>3000)throw Error("Invalid workspace backup");
 for(const key of Object.keys(payload.local)){
  if(!KEYS.includes(key)||typeof payload.local[key]!=="string")throw Error("Unexpected saved source "+key);
  JSON.parse(payload.local[key]);
 }
 for(const item of payload.emotions){
  if(!item||typeof item.id!=="string"||!/^[a-z0-9_-]{1,64}$/i.test(item.id)||
     typeof item.png!=="string"||!/^data:image\/png;base64,/.test(item.png))throw Error("Invalid emotion database entry");
 }
}
function utf8(str){return new TextEncoder().encode(str)}
async function hash(str){
 const digest=await crypto.subtle.digest("SHA-256",utf8(str));
 return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,"0")).join("");
}
async function collect(){
 const local=localKeys(),emotions=await snapshotIdb();
 const payload={format:KIND,savedAt:new Date().toISOString(),local,emotions};
 validatePayload(payload);
 const json=JSON.stringify(payload);
 if(utf8(json).byteLength>byteLimit)throw Error("Backup exceeds 25MB. Export clips individually first; nothing uploaded");
 return {payload,json};
}
async function backup(){
 const {json,payload}=await collect();
 const parent=await folder();
 let file=savedFile?{id:savedFile}:await find(parent,FILENAME,"application/json");
 if(!file){
  const r=await api(API+"?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({name:FILENAME,mimeType:"application/json",parents:[parent]})});
  file=await r.json();
 }
 const envelope=JSON.stringify({format:KIND,sha256:await hash(json),payload});
 await api(UP+"/"+encodeURIComponent(file.id)+"?uploadType=media",{method:"PATCH",
  headers:{"Content-Type":"application/json; charset=UTF-8"},body:envelope});
 savedFile=file.id;
 const verified=await(await api(API+"/"+encodeURIComponent(savedFile)+"?alt=media")).text();
 const received=JSON.parse(verified);
 if(received.sha256!==await hash(JSON.stringify(received.payload)))throw Error("Drive read-back hash mismatch");
 return {keys:Object.keys(payload.local).length+Number(payload.emotions.length>0),name:FILENAME,emotions:payload.emotions.length};
}
function downloadRecovery(obj){
 const data=JSON.stringify(obj),blob=new Blob([data],{type:"application/json"});
 const link=document.createElement("a"),url=URL.createObjectURL(blob);
 link.href=url;link.download="mahluk-before-restore-"+new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")+".json";
 document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function restore(){
 const parent=await folder();
 const file=await find(parent,FILENAME,"application/json");
 if(!file)throw Error("No unified workspace backup in this Google Drive account");
 const text=await(await api(API+"/"+encodeURIComponent(file.id)+"?alt=media")).text();
 if(utf8(text).byteLength>byteLimit)throw Error("Drive backup too large");
 const envelope=JSON.parse(text),payload=envelope.payload;
 validatePayload(payload);
 if(envelope.format!==KIND||envelope.sha256!==await hash(JSON.stringify(payload)))throw Error("Backup checksum mismatch");
 const current=await collect();
 // Always export the current database before replacing any local values.
 downloadRecovery(current.payload);
 for(const [key,raw] of Object.entries(payload.local))localStorage.setItem(key,raw);
 await restoreIdb(payload.emotions);
 try{
  root.VLHub?.publish("characters",{source:"mahluk-hidup",operation:"restore"});
  root.VLHub?.publish("accessories",{source:"mahluk-hidup",operation:"restore"});
  root.VLHub?.publish("emotions",{source:"mahluk-hidup",operation:"restore"});
  root.VLHub?.publish("actions",{source:"mahluk-hidup",operation:"restore"});
  root.VLHub?.publish("animations",{source:"mahluk-hidup",operation:"restore"});
 }catch{}
 savedFile=file.id;
 return {keys:Object.keys(payload.local).length+Number(payload.emotions.length>0),emotions:payload.emotions.length};
}
root.VLMahlukHubDrive=Object.freeze({connect,backup,restore,connected,KEYS,KIND});
})(window);
