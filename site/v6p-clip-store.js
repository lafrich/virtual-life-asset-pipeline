/* Persistence for user-authored clips and universal V6B motion tracks.
   Retired incompatible five-band legacy stock is no longer part of active Mahluk. */
(function(root,factory){"use strict";const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.V6PClipStore=api;})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(root){"use strict";
const KEY="vl-v6p-act-clips-v1";
const FORMAT="v6p-act-clips-store-v1";
// Retired five-band stock: never re-create it from previous browser/Drive records.
const RETIRED_STOCK_IDS=Object.freeze(["pushup","yoga_sphinx_idle","yoga_puppy_idle","hip_shake","yoga_happy_baby_idle"]);
const RETIRED=new Set(RETIRED_STOCK_IDS.flatMap(id=>[id,"clip_"+id]));
const BUILTIN_IDS=Object.freeze([]);
const bundled=new Map();
let bundlePromise=null;
// Owner-requested one-time deletion of EVERY non-native authored animation.
// This removes storage bytes, including legacy drafts, not merely gallery rows.
const NATIVE_ACTIONS=new Set(["walk","idle","talk","sit","sit_type","sleep","tired","swim","float","lie","perch"]);
const PURGE_KEY="mahluk-native-animation-purge-20261109-v1";
function purgeNonNativeAnimations(){
 try{
  const disk=root?.localStorage;
  if(!disk||disk.getItem(PURGE_KEY)==="1")return;
  disk.removeItem(KEY);
  disk.removeItem("vl-mahluk-animation-anchor-poses-v1");
  const lib=disk.getItem("mahluk-2-library-v1");
  if(lib){
   const rows=JSON.parse(lib);
   if(Array.isArray(rows)){
    for(const row of rows){
     if(!row||typeof row!=="object")continue;
     if(row.clips&&typeof row.clips==="object")
      row.clips=Object.fromEntries(Object.entries(row.clips).filter(([id])=>NATIVE_ACTIONS.has(id)));
     if(Array.isArray(row.sharedBaseRig?.actions))
      row.sharedBaseRig.actions=row.sharedBaseRig.actions.filter(id=>NATIVE_ACTIONS.has(id));
    }
    disk.setItem("mahluk-2-library-v1",JSON.stringify(rows));
   }
  }
  const saved=disk.getItem("mahluk-action-situations-v1");
  if(saved){
   const data=JSON.parse(saved);
   if(Array.isArray(data?.items)){
    for(const row of data.items){
     for(const actor of [row,...(Array.isArray(row?.actors)?row.actors:[])]){
      if(!actor||typeof actor!=="object")continue;
      for(const phase of ["enter","loop","exit"])
       if(typeof actor[phase]==="string"&&/^(?:clip:|motion:|grok:)/.test(actor[phase]))
        actor[phase]=phase==="loop"?"native:idle":"";
     }
    }
    disk.setItem("mahluk-action-situations-v1",JSON.stringify(data));
   }
  }
  // The Mahluk shell has a separate session RAM draft store.
  const draft=root?.parent?.VLMahlukWorkspace?.draftStorage;
  draft?.removeItem?.(KEY);draft?.removeItem?.("vl-mahluk-animation-anchor-poses-v1");
  disk.setItem(PURGE_KEY,"1");
 }catch(error){
  // Unset marker allows retry; no Emosi keys are touched.
  try{root?.console?.warn?.("Native-only animation cleanup pending",error)}catch{}
 }
}
purgeNonNativeAnimations();
function universalContract(){
 return root?.V6PUniversalMotionContract||
  (typeof require==="function"?require("./v6p-universal-motion-contract.js"):null);
}
// GitHub Pages cannot enumerate a directory. index.json is the only motion
// asset registry; new motions change JSON files, never editor dropdown code.
async function loadBundled(){
 if(bundlePromise)return bundlePromise;
 bundlePromise=(async()=>{
  const request=typeof root?.fetch==="function"?root.fetch.bind(root):
   typeof fetch==="function"?fetch:null;
  if(!request)throw Error("JSON asset loading unavailable");
  const response=await request("./motion-packs/index.json",{cache:"no-store"});
  if(!response.ok)throw Error("Motion registry unavailable: "+response.status);
  const index=await response.json();
  if(index?.format!=="genesis-v6b-motion-registry-v1"||
     !Array.isArray(index.files)||index.files.length>150)
   throw Error("Invalid Genesis motion registry");
  const C=universalContract(),A=contract(),next=new Map();
  if(!C||!A)throw Error("Genesis motion contract not loaded");
  for(const name of index.files){
   if(typeof name!=="string"||!/^(?:clp|clip)_[a-z0-9_]+\.motion\.json$/.test(name))
    throw Error("Invalid Genesis motion asset path");
   const result=await request("./motion-packs/"+name,{cache:"no-store"});
   if(!result.ok)throw Error("Missing motion asset "+name+": "+result.status);
   const data=await result.json();
   if(!/^(?:clp|clip)_[a-z0-9_]{3,70}$/.test(String(data?.id||""))||
      name!==data.id+".motion.json"||isRetired(data.id)||next.has(data.id))
    throw Error("Invalid, duplicate, or retired motion ID: "+name);
   if(!Array.isArray(data.frames)||data.frames.some(f=>
      !/^[a-z0-9_]{1,32}$/.test(String(f?.key||""))))
    throw Error("Invalid frame keys: "+name);
   const status=data.status==="stock"?"stock":"draft";
   const motion=C.make({sourceAction:data.sourceAction,frames:data.frames,
    tracks:data.tracks,status});
   const category=String(data.category||"motions").toLowerCase();
   if(!/^[a-z][a-z0-9_]{0,31}$/.test(category))
    throw Error("Invalid motion category: "+name);
   const manifest={...A.emptyManifest({id:data.id,name:data.name,
      frames:data.frames,loop:data.loop!==false,requiredParts:[]}),
     source:C.FORMAT,category,reviewCandidate:status!=="stock",motion};
   C.validateManifest(manifest);
   next.set(data.id,{manifest,layers:{},origin:"bundled",
    saveStatus:status==="stock"?"stock":"review"});
  }
  bundled.clear();for(const [id,row] of next)bundled.set(id,row);
  return [...bundled.keys()];
 })();
 try{return await bundlePromise}catch(e){bundlePromise=null;throw e}
}
function isRetired(id){return RETIRED.has(String(id||""))}
function builtinBand(id){return String(id||"").replace(/^clip_/,"")}
function isBuiltin(_id){return false}
function contract(){return (root&&root.V6PActivityContract)||(typeof require==="function"?require("./v6p-activity-contract.js"):null);}
function storage(){try{return root?.parent?.VLMahlukWorkspace?.draftStorage||root?.localStorage}catch{return null}}
function empty(){return {format:FORMAT,clips:{}};}
function read(){
 const raw=storage()?.getItem(KEY);
 if(!raw)return empty();
 try{
  const obj=JSON.parse(raw);
  if(!obj||obj.format!==FORMAT||!obj.clips||typeof obj.clips!=="object")return empty();
  let removed=false;
  // Remove retired legacy stock while retaining every other user-owned clip.
  for(const [id,row] of Object.entries(obj.clips)){
   if(isRetired(id)||isRetired(row?.manifest?.id)||
      id.startsWith("clp_grok_")||row?.manifest?.source==="grok-stock-animation-v1"){
    delete obj.clips[id];removed=true;
   }
  }
  if(removed){
   try{storage()?.setItem(KEY,JSON.stringify({format:FORMAT,clips:obj.clips}))}catch{}
  }
  return {format:FORMAT,clips:obj.clips};
 }catch{return empty();}
}
function write(store){
 const s=storage();
 if(!s)throw Error("localStorage unavailable");
 s.setItem(KEY,JSON.stringify(store));
}
function now(){return new Date().toISOString();}
function recordFromStore(id,row){
 const A=contract();
 const fallback=A.emptyManifest({id,name:id});
 const stored=row||null;
 const manifest=stored?.manifest?{...fallback,...stored.manifest,
  frames:(stored.manifest.frames||fallback.frames).map(f=>({key:f.key,ms:f.ms}))}:fallback;
 return {
  id,type:"clip",origin:row&&row.origin||"user",
  name:manifest.name,
  manifest,
  layers:stored&&stored.layers&&typeof stored.layers==="object"?stored.layers:{},
  saveStatus:row&&row.saveStatus||"local",
  driveFile:row&&row.driveFile||null,
  updatedAt:row&&row.updatedAt||"",
  thumbDataUrl:row&&row.thumbDataUrl||"",
  frameMs:manifest.frames[0]?manifest.frames[0].ms:140
 };
}
function importCloudRecord(rec){
 if(!rec||!rec.id||!rec.clip||!rec.clip.manifest||!rec.meta)throw Error("Invalid cloud animation record");
 if(isRetired(rec.id)||isRetired(rec.clip.manifest.id))return null;
 const store=read();
 store.clips[rec.id]={manifest:rec.clip.manifest,layers:rec.clip.layers||{},
  origin:"user",saveStatus:"drive",updatedAt:rec.meta.updated||new Date().toISOString()};
 write(store);
 return get(rec.id);
}
function normalizeId(id){return id;}
function get(id){
 id=normalizeId(id);
 if(isRetired(id))return null;
 const row=read().clips[id]||bundled.get(id);
 if(!row)return null;
 return recordFromStore(id,row);
}
function list(){
 const store=read();
 const ids=new Set([...bundled.keys(),...Object.keys(store.clips)]);
 return [...ids].filter(id=>!isRetired(id)).map(id=>recordFromStore(id,store.clips[id]||bundled.get(id)));
}
function create(opts){
 const A=contract();
 const man=A.emptyManifest(opts||{});
 if(isRetired(man.id))throw Error("Retired legacy stock ID cannot be used");
 if(get(man.id))throw Error("Clip id exists");
 const store=read();
 store.clips[man.id]={manifest:man,layers:{},origin:"user",saveStatus:"local",updatedAt:now()};
 write(store);
 return get(man.id);
}
function updateManifest(id,patch){
 id=normalizeId(id);
 const rec=get(id); if(!rec)throw Error("Unknown clip "+id);
 if(rec.origin==="bundled")throw Error("Bundled stock is read-only; use MODIFY to make a new draft");
 const manifest={...rec.manifest,...patch,id:rec.manifest.id};
 if(patch&&Array.isArray(patch.frames))manifest.frames=patch.frames.map(f=>({key:String(f.key||"f0").slice(0,32),ms:Math.max(40,Math.min(800,Number(f.ms)||140))}));
 const store=read();
 const row=store.clips[id]||{layers:{},origin:rec.origin};
 row.manifest=manifest;row.updatedAt=now();
 if(rec.origin==="pilot")row.origin="pilot";
 if(row.saveStatus!=="drive")row.saveStatus="local";
 store.clips[id]=row;write(store);
 return get(id);
}
function setLayer(id,part,dataUrl,meta){
 id=normalizeId(id);
 if(typeof dataUrl!=="string"||dataUrl.indexOf("data:image/png;base64,")!==0)throw Error("Layer must be a PNG data URL");
 if(dataUrl.length>9000000)throw Error("Activity sheet too large for localStorage");
 const rec=get(id); if(!rec)throw Error("Unknown clip "+id);
 if(rec.origin==="bundled")throw Error("Bundled motion is read-only; use MODIFY");
 const store=read();
 const row=store.clips[id]||{manifest:rec.manifest,layers:{},origin:rec.origin,saveStatus:"local"};
 row.layers=row.layers||{};row.layers[part]=dataUrl;
 if(meta&&meta.thumbDataUrl)row.thumbDataUrl=meta.thumbDataUrl;
 row.updatedAt=now();row.saveStatus="local";
 store.clips[id]=row;write(store);
 return get(id);
}
function replaceLayers(id,layers){
 id=normalizeId(id);
 const rec=get(id); if(!rec)throw Error("Unknown clip "+id);
 if(rec.origin==="bundled")throw Error("Bundled motion is read-only; use MODIFY");
 const store=read();
 const row=store.clips[id]||{manifest:rec.manifest,layers:{},origin:rec.origin};
 row.layers=layers&&typeof layers==="object"?layers:{};
 row.updatedAt=now();
 store.clips[id]=row;write(store);
 return get(id);
}
function layerUrl(id,part){
 id=normalizeId(id);
 const rec=get(id);
 if(rec&&rec.layers&&rec.layers[part])return rec.layers[part];
 return null;
}
function hasLayer(id,part){return !!layerUrl(id,part);}
function markDrive(id,info){
 id=normalizeId(id);
 const store=read();
 const rec=get(id); if(!rec)throw Error("Unknown clip "+id);
 const row=store.clips[id]||{manifest:rec.manifest,layers:rec.layers||{}};
 row.saveStatus="drive";row.driveFile=info||null;row.updatedAt=now();
 store.clips[id]=row;write(store);
 return get(id);
}
function remove(id){
 id=normalizeId(id);
 if(isRetired(id))throw Error("Retired legacy stock cannot be created or modified");
 if(bundled.has(id))throw Error("Bundled motion cannot be removed");
 const store=read();delete store.clips[id];write(store);
}
function compatibility(rec){
 const man=rec&&rec.manifest;
 if(!man)return "Custom clip";
 const n=(man.frames||[]).length;
 const ms=(man.frames||[]).map(f=>f.ms).join(",");
 const extra=man.motion?.format==="genesis-v6b-universal-motion-v1"?
  "Universal Genesis V6B motion · per-character appearance":
  "User legacy pixel clip · requires review";
 return n+" frame(s) · "+(man.loop?"loop":"once")+" · ms ["+ms+"] · "+extra;
}
function galleryEntry(rec){
 return {
  id:rec.id,type:"clip",origin:"user",
  name:rec.name,part:null,placement:null,
  sheetDataUrl:"",thumbDataUrl:rec.thumbDataUrl||"",
  paintedActions:[rec.manifest&&rec.manifest.band||"custom"],
  saveStatus:rec.saveStatus,driveFile:rec.driveFile||null,
  updatedAt:rec.updatedAt||"",
  compatibility:compatibility(rec),
  openUrl:rec.manifest?.motion?.format==="genesis-v6b-universal-motion-v1"?
   "./mahluk-animation-native.html?motion="+encodeURIComponent(rec.id):
   "./pixel-editor.html?source=v6p&project="+encodeURIComponent(rec.id),
  manifest:rec.manifest,frameMs:rec.frameMs
 };
}
function galleryEntries(){return list().map(galleryEntry);}
return Object.freeze({
 KEY,FORMAT,BUILTIN_IDS,RETIRED_STOCK_IDS,isRetired,loadBundled,get,list,create,updateManifest,setLayer,replaceLayers,importCloudRecord,layerUrl,hasLayer,markDrive,remove,
 compatibility,galleryEntry,galleryEntries
});
});
