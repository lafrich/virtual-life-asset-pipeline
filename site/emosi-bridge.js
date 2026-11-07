/* Mahluk Hidup 1 ↔ canonical EMOSI.EXE (virtual-office).
 * Reads native Emosi local IndexedDB, preview authored stock, and Drive.
 * The 12 packaged universal starters are archive-only and never selectable.
 * Does not change V6B anatomy, characters or source sprites.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.VLMahlukEmosiBridge=api;
})(typeof window==="undefined"?null:window,function(){
"use strict";
const DIR=["se","sw","ne","nw"],FALLBACK="emotion-studio-local-fallback-v1";
const STARTER_IDS=Object.freeze([
  "universal-neutral","universal-happy","universal-angry","universal-sad",
  "universal-surprised","universal-shy","universal-cheeky","universal-bleh",
  "universal-wink","universal-sleepy","universal-cry","universal-grimace"
]);
const PREVIEW_STOCK_INDEX="./emotion-studio/preview-stock/index.json";
let faces=[],lastError="",lastCount=0,lastStatus="Drive stock not loaded";
let lastPreview=0,lastDrive=0,lastLocal=0,lastConflicts=0,lastConnected=false;
const compatible=(base,actor)=>{
  if(base==="universal")return true;
  const id=String(actor?.base_id||actor?.id||"");
  const cat=String(actor?.template_category||actor?.category||"");
  const gender=String(actor?.gender||actor?.bodyType||"");
  if(base==="male")return gender==="male"||/human_male/.test(id);
  if(base==="female")return gender==="female"||/human_female/.test(id);
  return base==="original"&&cat!=="human";
};
function isHumanBaseActor(actor){
  const bases=["human_male_base","human_female_base"];
  return bases.includes(actor?.id)||bases.includes(actor?.base_id)||bases.includes(actor?.baseId);
}
function rawId(id){return String(id||"").replace(/^emosi_/,"")}
function isStarterId(id){return STARTER_IDS.includes(rawId(id))}
function hasAuthoredPng(entry){
  return typeof entry?.png==="string"&&/^data:image\/png;base64,[a-z\d+/=]+$/i.test(entry.png);
}
function isStarterEntry(entry){
  if(!entry||!isStarterId(entry.id))return false;
  // Packaged starters are template-only. A same-ID project with an authored
  // PNG is user/Drive stock and must remain selectable.
  return !hasAuthoredPng(entry);
}
function unwrapEntries(payload){
  if(!payload)return [];
  if(Array.isArray(payload.entries))return payload.entries.filter(Boolean);
  if(payload.id)return [payload];
  return [];
}
function entrySignature(entry){
  return JSON.stringify({
    id:entry?.id,name:entry?.name,base:entry?.base,frames:entry?.frames,
    fps:entry?.fps,png:entry?.png||"",template:entry?.template||""
  });
}
function mergeIncoming(map,incoming,sourceLabel){
  const conflicts=[];
  for(const entry of incoming||[]){
    if(!entry||isStarterEntry(entry))continue;
    const prev=map.get(entry.id);
    if(prev&&entrySignature(prev)!==entrySignature(entry)){
      let copyId=entry.id+"__conflict_"+sourceLabel;
      if(map.has(copyId))copyId=copyId+"_"+Date.now().toString(36);
      const copy={...entry,id:copyId,name:(entry.name||entry.id)+" (conflict copy)"};
      map.set(copy.id,copy);
      conflicts.push(copy);
    }else if(!prev){
      map.set(entry.id,entry);
    }
  }
  return conflicts;
}
function statusMessage(info){
  const preview=Number(info?.preview)||0;
  const drive=Number(info?.drive)||0;
  const localAuthored=Number(info?.localAuthored)||0;
  const count=Number(info?.count)||0;
  const conflicts=Number(info?.conflicts)||0;
  const connected=!!info?.connected;
  const driveStock=preview+drive;
  if(driveStock===0&&!connected){
    const extra=localAuthored?" · "+localAuthored+" local user expressions":"";
    const err=info?.error?" · "+info.error:"";
    return "Drive stock not loaded"+extra+err;
  }
  const parts=["EMOSI.EXE · "+count+" expressions"];
  if(preview)parts.push(preview+" preview stock");
  if(info?.local!=null)parts.push((Number(info.local)||0)+" local");
  if(drive)parts.push(drive+" Google Drive");
  parts.push(connected?"CONNECTED":"Drive not connected");
  if(conflicts)parts.push(conflicts+" conflict copies");
  if(info?.error)parts.push(info.error);
  return parts.join(" · ");
}
function localFallback(){
  try{const v=JSON.parse(localStorage.getItem(FALLBACK)||"[]");return Array.isArray(v)?v:[]}
  catch{return []}
}
async function localDatabase(){
  if(typeof indexedDB==="undefined")return localFallback();
  return new Promise(resolve=>{
    let request;
    try{request=indexedDB.open("emotion-studio-local-v1",1)}
    catch{return resolve(localFallback())}
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains("emotion-assets"))
      request.result.createObjectStore("emotion-assets",{keyPath:"id"})};
    request.onerror=()=>resolve(localFallback());
    request.onsuccess=()=>{
      const db=request.result;
      try{const tx=db.transaction("emotion-assets","readonly");
        const get=tx.objectStore("emotion-assets").getAll();
        get.onsuccess=()=>resolve(Array.isArray(get.result)?get.result:[]);
        get.onerror=()=>resolve(localFallback());
        tx.oncomplete=()=>db.close();
        tx.onabort=()=>{db.close();resolve(localFallback())};
      }catch{db.close();resolve(localFallback())}
    };
  });
}
async function fetchJSON(url){
  const response=await fetch(url,{cache:"no-store"});
  if(!response.ok)throw Error(url+" HTTP "+response.status);
  return response.json();
}
async function loadPreviewStock(indexUrl){
  if(typeof fetch!=="function")return {entries:[],loaded:false,error:"no fetch",source:""};
  const url=indexUrl||PREVIEW_STOCK_INDEX;
  try{
    const index=await fetchJSON(url);
    const files=Array.isArray(index.entries)?index.entries:[];
    const dir=url.replace(/[^/]+$/,"");
    const entries=[];
    for(const file of files){
      try{
        const payload=await fetchJSON(dir+file);
        for(const entry of unwrapEntries(payload)){
          if(!isStarterEntry(entry))entries.push(entry);
        }
      }catch(error){
        // Keep going so one missing file does not hide the rest.
        lastError=error.message||String(error);
      }
    }
    return {entries,loaded:entries.length>0,error:"",source:url};
  }catch(error){
    return {entries:[],loaded:false,error:error.message||String(error),source:url};
  }
}
async function toFace(entry,U){
  if(!U.validEntry(entry)||isStarterEntry(entry))return null;
  const atlas=await U.renderAtlas(entry); // validates 64×N by 448 PNGs
  const thumb=document.createElement("canvas");thumb.width=64;thumb.height=112;
  thumb.getContext("2d").drawImage(atlas,0,0,64,112,0,0,64,112);
  const duration=Math.round(1000/Math.max(1,Math.min(30,Number(entry.fps)||6)));
  return {id:"emosi_"+entry.id,label:entry.name+" / EMOSI.EXE",base:entry.base,
    source:"emosi",overlay:atlas.toDataURL("image/png"),
    portrait:thumb.toDataURL("image/png"),
    frames:entry.frames,frame_ms:Array(entry.frames).fill(duration)};
}
async function connectDrive(){
  const D=typeof window!=="undefined"?window.EmotionDrive:null;
  if(!D)throw Error("Emosi.exe Google Drive module not available");
  if(!D.connected())await D.connect();
  return true;
}
async function refresh(){
  const U=typeof window!=="undefined"?window.MH2UniversalEmotions:null;
  if(!U)throw Error("Emosi.exe RGBA atlas reader not loaded");
  const local=await localDatabase().catch(()=>[]);
  const entries=new Map();
  let localAuthored=0;
  for(const e of local){
    if(!U.validEntry(e)||isStarterEntry(e))continue;
    entries.set(e.id,e);
    localAuthored++;
  }
  const preview=await loadPreviewStock();
  const conflicts=mergeIncoming(entries,preview.entries,"preview");
  let driveCount=0,driveError=preview.error||"";
  const D=typeof window!=="undefined"?window.EmotionDrive:null;
  if(D?.connected()){
    try{
      const response=await D.loadAll();
      driveCount=response.entries.length;
      const driveEntries=(response.entries||[]).filter(e=>U.validEntry(e)&&!isStarterEntry(e));
      conflicts.push(...mergeIncoming(entries,driveEntries,"drive"));
      if(response.errors?.length)driveError=response.errors.length+" Drive project(s) unreadable";
    }catch(error){driveError=error.message||String(error)}
  }
  const loaded=typeof document==="undefined"?[]:
    await Promise.all([...entries.values()].slice(0,250).map(e=>toFace(e,U).catch(()=>null)));
  faces=loaded.filter(Boolean);lastCount=faces.length;lastError=driveError;
  lastPreview=preview.entries.length;lastDrive=driveCount;lastLocal=localAuthored;
  lastConflicts=conflicts.length;lastConnected=!!D?.connected();
  lastStatus=statusMessage({
    count:lastCount,local:local.length,localAuthored,preview:lastPreview,
    drive:driveCount,connected:lastConnected,conflicts:lastConflicts,error:lastError
  });
  return {count:lastCount,local:local.length,localAuthored,drive:driveCount,
    preview:lastPreview,conflicts:lastConflicts,connected:lastConnected,
    stockLoaded:lastPreview>0||driveCount>0,published:false,error:lastError,
    status:lastStatus};
}
function apply(actor){
  if(!actor)return actor;
  const native=Array.isArray(actor.expressions)?
    actor.expressions.filter(e=>e?.source!=="emosi"):[];
  const extras=faces.filter(f=>compatible(f.base,actor));
  actor.expressions=[...native,...extras];
  return actor;
}
return Object.freeze({
  refresh,connectDrive,apply,compatible,isHumanBaseActor,
  STARTER_IDS,isStarterId,isStarterEntry,unwrapEntries,entrySignature,
  mergeIncoming,statusMessage,loadPreviewStock,hasAuthoredPng,
  PREVIEW_STOCK_INDEX,
  get count(){return lastCount},
  get error(){return lastError},
  get status(){return lastStatus},
  get preview(){return lastPreview},
  get stockLoaded(){return lastPreview>0||lastDrive>0}
});
});
