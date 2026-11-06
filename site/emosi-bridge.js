/* Mahluk Hidup 1 ↔ EMOSI.EXE: read-only facial atlas bridge.
 * Uses the existing published catalog and same-origin local Emosi database.
 * Does not modify V6B character anatomy, saved characters or source sprites.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.VLMahlukEmosiBridge=api;
})(typeof window==="undefined"?null:window,function(){
"use strict";
const DIR=["se","sw","ne","nw"],FALLBACK="emotion-studio-local-fallback-v1";
let faces=[],lastError="",lastCount=0;
const compatible=(base,actor)=>{
  if(base==="universal")return true;
  const id=String(actor?.base_id||actor?.id||"");
  const cat=String(actor?.template_category||actor?.category||"");
  const gender=String(actor?.gender||actor?.bodyType||"");
  if(base==="male")return gender==="male"||/human_male/.test(id);
  if(base==="female")return gender==="female"||/human_female/.test(id);
  return base==="original"&&cat!=="human";
};
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
async function toFace(entry,U){
  if(!U.validEntry(entry))return null;
  const atlas=await U.renderAtlas(entry); // validates 64×N by 448 PNGs
  const thumb=document.createElement("canvas");thumb.width=64;thumb.height=112;
  thumb.getContext("2d").drawImage(atlas,0,0,64,112,0,0,64,112);
  const duration=Math.round(1000/Math.max(1,Math.min(30,Number(entry.fps)||6)));
  return {id:"emosi_"+entry.id,label:entry.name+" / EMOSI.EXE",base:entry.base,
    source:"emosi",overlay:atlas.toDataURL("image/png"),
    portrait:thumb.toDataURL("image/png"),
    frames:entry.frames,frame_ms:Array(entry.frames).fill(duration)};
}
async function refresh(){
  const U=typeof window!=="undefined"?window.MH2UniversalEmotions:null;
  if(!U)throw Error("Emosi catalog library not loaded");
  const [published,local]=await Promise.allSettled([U.loadCatalog(),localDatabase()]);
  const entries=new Map();
  if(published.status==="fulfilled")for(const e of published.value.catalog.entries)entries.set(e.id,e);
  if(local.status==="fulfilled")for(const e of local.value)if(U.validEntry(e))entries.set(e.id,e);
  if(!entries.size&&published.status==="rejected")
    lastError=String(published.reason?.message||published.reason);
  else lastError="";
  const loaded=await Promise.all([...entries.values()].slice(0,250).map(e=>toFace(e,U).catch(()=>null)));
  faces=loaded.filter(Boolean);lastCount=faces.length;
  return {count:lastCount,local:local.status==="fulfilled"?local.value.length:0,
    published:published.status==="fulfilled",error:lastError};
}
function apply(actor){
  if(!actor)return actor;
  const native=Array.isArray(actor.expressions)?
    actor.expressions.filter(e=>e?.source!=="emosi"):[];
  actor.expressions=[...native,...faces.filter(f=>compatible(f.base,actor))];
  return actor;
}
return Object.freeze({refresh,apply,compatible,get count(){return lastCount},
  get error(){return lastError}});
});