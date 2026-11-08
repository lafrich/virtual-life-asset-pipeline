/* Publish a Mahluk Hidup character onto the VLHub `characters` topic.
 * Writes the same-origin keys Semesta/Bangun/Jiwa already read.
 * Does not edit /workspace/semesta-hub; extra shared-base fields are additive.
 */
(function(root,factory){
 "use strict";
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.VLHubCharactersPublish=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(root){
"use strict";
const V2_KEY="mahluk-2-library-v1";
const V1_KEY="virtual-life-character-storage-v1";
const CLIP_CONSUMED=/^(idle|walk|talk|sit|lie|sleep|custom|pushup|yoga_sphinx_idle|yoga_puppy_idle|hip_shake|yoga_happy_baby_idle)$/;
const TINY="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
function slug(name){
 return String(name||"char").toLowerCase().replace(/[^a-z0-9]+/g,"").slice(0,18)||"char";
}
function read(store,key,fallback){
 try{
  const raw=store.getItem(key);
  const parsed=raw?JSON.parse(raw):fallback;
  return Array.isArray(parsed)?parsed:fallback;
 }catch{return fallback;}
}
function v2Record(input){
 const gender=input.gender==="female"?"female":"male";
 const id=input.id&&/^mh2_[a-z0-9]+$/.test(input.id)?input.id:"mh2_"+slug(input.name)+Math.random().toString(36).slice(2,6);
 const clips={};
 if(input.clips&&typeof input.clips==="object"){
  for(const [cid,clip] of Object.entries(input.clips)){
   if(!clip)continue;
   clips[cid]={sheet:clip.sheet||clip.url||input.sprite||TINY,
    frames:Number(clip.frames)||1,
    frame_ms:Array.isArray(clip.frame_ms)?clip.frame_ms.slice():[240],
    loop:clip.loop!==false,
    source:clip.source||"shared-base-rig"};
  }
 }
 if(!clips.idle)clips.idle={sheet:input.sprite||TINY,frames:1,frame_ms:[240],loop:true,source:"shared-base-rig"};
 return {
  format:"mahluk-2-character-v1",version:1,id,
  name:String(input.name||"Untitled").slice(0,60),
  base:gender,template_base:gender==="female"?"human_female_base":"human_male_base",
  rigSystem:input.rigSystem||"modular-v2",
  facelessBase:input.facelessBase||null,
  sprite:input.sprite||TINY,
  clips,
  emotionPlane:input.emotionPlane||null,
  sharedBaseRig:{
   format:"mahluk-shared-base-actions-v1",
   actions:Array.isArray(input.sharedActions)?input.sharedActions.slice():Object.keys(clips),
   hairStyle:input.hairStyle||"default",
   clothesColor:input.clothesColor||"default"
  },
  tracks:input.tracks||undefined,
  faceId:typeof input.faceId==="string"?input.faceId:"",
  v6p:input.v6p&&typeof input.v6p==="object"?input.v6p:null,
  updated:new Date().toISOString()
 };
}
function v1Record(v2){
 return {
  id:"custom_human_"+v2.id.replace(/^mh2_/,""),
  name:v2.name,
  base:v2.template_base,
  skinTone:"base",
  source:"shared-base-rig"
 };
}
function unsupportedClips(record){
 return Object.keys(record.clips||{}).filter(id=>!CLIP_CONSUMED.test(id));
}
function publish(input,env){
 const store=(env&&env.localStorage)||(root&&root.localStorage);
 if(!store)return {ok:false,error:"no localStorage"};
 const record=v2Record(input);
 const v1=v1Record(record);
 const library=read(store,V2_KEY,[]).filter(row=>row&&row.id!==record.id);
 library.push(record);
 store.setItem(V2_KEY,JSON.stringify(library));
 const customs=read(store,V1_KEY,[]).filter(row=>row&&row.id!==v1.id);
 customs.push(v1);
 store.setItem(V1_KEY,JSON.stringify(customs));
 const hub=(env&&env.VLHub)||(root&&root.VLHub);
 if(hub&&typeof hub.publish==="function"){
  hub.publish("characters",{source:"mahluk-hidup",v2:record,v1,
   project:"Namanya Juga Hidup: The Game"});
 }
 return {
  ok:true,id:record.id,v1Id:v1.id,record,
  unsupportedBySemestaClips:unsupportedClips(record),
  note:"Semesta currently consumes idle|walk|talk|sit|lie|sleep|custom clip keys and requires data-URL sheets."
 };
}
/* Graceful quota path: the complete character stays in IndexedDB.
 * Existing full published records are never compacted or deleted. The
 * lightweight localStorage entry is for legacy gallery discovery only.
 * Semesta requires a separate indexed-clip runtime for newly archived clips. */
function isQuota(error){
 return error?.name==="QuotaExceededError"||
  /quota.*exceed|exceed.*quota|storage.*full/i.test(String(error?.message||error||""));
}
async function publishAsync(input,env){
 const store=(env&&env.localStorage)||(root&&root.localStorage);
 if(!store)return {ok:false,error:"localStorage unavailable"};
 try{return publish(input,env)}
 catch(error){
  if(!isQuota(error))throw error;
  const archive=(env&&env.archive)||(root&&root.V6PPublishedArchive);
  if(!archive?.put)return {ok:false,error:"Browser storage full and IndexedDB archive unavailable. Keep the tab open and back up your draft."};
  const record=v2Record(input),v1=v1Record(record);
  // If the full V2 write succeeded but V1 legacy metadata hit the quota,
  // the original complete V2 record is already durable. Do not downgrade it.
  const existing=read(store,V2_KEY,[]).find(x=>x.id===record.id);
  if(existing&&Object.values(existing.clips||{}).some(c=>typeof c.sheet==="string"&&c.sheet.startsWith("data:image/"))){
   return {ok:true,id:record.id,v1Id:v1.id,record,stored:"localStorage",warning:"Legacy V1 index could not be updated; complete V2 character is saved."};
  }
  await archive.put(record); // Commit lossless source FIRST.
  let indexed=false,legacy=false;
  try{
   const rows=read(store,V2_KEY,[]).filter(x=>x&&x.id!==record.id);
   rows.push(archive.index(record));
   store.setItem(V2_KEY,JSON.stringify(rows));indexed=true;
  }catch(e){if(!isQuota(e))throw e}
  try{
   const rows=read(store,V1_KEY,[]).filter(x=>x&&x.id!==v1.id);
   rows.push(v1);store.setItem(V1_KEY,JSON.stringify(rows));legacy=true;
  }catch(e){if(!isQuota(e))throw e}
  try{root?.dispatchEvent?.(new CustomEvent("mahluk:published-archive",{detail:{id:record.id}}))}catch{}
  return {ok:true,id:record.id,v1Id:v1.id,record,stored:"indexeddb",
    indexed,legacy,unsupportedBySemestaClips:unsupportedClips(record),
    warning:"Full sprite clips saved to browser IndexedDB. Older Semesta readers may not play archived clips until synchronized through the updated character bridge."};
 }
}
return Object.freeze({V1_KEY,V2_KEY,CLIP_CONSUMED,v2Record,v1Record,publish,publishAsync,unsupportedClips,isQuota});
});
