/* Persistence for activity-contract clips + per-layer 384×2688 sheets.
   Built-in approved activity layers come from media/v6p-act/; user edits are local overrides. */
(function(root,factory){"use strict";const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.V6PClipStore=api;})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(root){"use strict";
const KEY="vl-v6p-act-clips-v1";
const FORMAT="v6p-act-clips-store-v1";
// Canonical preallocated activities are listed in Mahluk alongside Idle/Walk.
// Reserved slots are visible for planning but never playable until authored.
const BUILTIN_IDS=["pushup","yoga_sphinx_idle","yoga_puppy_idle","hip_shake","yoga_happy_baby_idle"];
function builtinBand(id){return id.startsWith("clip_")?id.slice(5):id;}
function isBuiltin(id){return BUILTIN_IDS.includes(builtinBand(id));}
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
  // Only rejected Grok REVIEW imports are retired; never touch approved
  // built-in V6P clips or user-created animations.
  for(const [id,row] of Object.entries(obj.clips)){
   if(id.startsWith("clp_grok_")||row?.manifest?.source==="grok-stock-animation-v1"){
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
 const band=builtinBand(id);
  const builtin=isBuiltin(id);
  const fallback=builtin?A.emptyManifest({id,name:band.replaceAll("_"," "),band,requiredParts:A.PILOT_PARTS.slice()}):A.emptyManifest({id,name:id});
 // Legacy four-frame Push-up overrides must never mask the approved six-frame stock.
 const stale=builtin&&row?.manifest?.frames?.length&&row.manifest.frames.length!==fallback.frames.length;
 const stored=stale?null:row;
 const manifest=stored&&stored.manifest?{...fallback,...stored.manifest,frames:(stored.manifest.frames||fallback.frames).map(f=>({key:f.key,ms:f.ms}))}:fallback;
 return {
  id,type:"clip",origin:row&&row.origin||(builtin?"pilot":"user"),
  name:manifest.name,
  manifest,
  layers:stored&&stored.layers&&typeof stored.layers==="object"?stored.layers:{},
  saveStatus:row&&row.saveStatus||(builtin?(A.isPlayable(band)?"stock":"review"):"local"),
  driveFile:row&&row.driveFile||null,
  updatedAt:row&&row.updatedAt||"",
  thumbDataUrl:row&&row.thumbDataUrl||"",
  frameMs:manifest.frames[0]?manifest.frames[0].ms:140
 };
}
function importCloudRecord(rec){
 if(!rec||!rec.id||!rec.clip||!rec.clip.manifest||!rec.meta)throw Error("Invalid cloud animation record");
 const store=read();
 store.clips[rec.id]={manifest:rec.clip.manifest,layers:rec.clip.layers||{},
  origin:"user",saveStatus:"drive",updatedAt:rec.meta.updated||new Date().toISOString()};
 write(store);
 return get(rec.id);
}
function normalizeId(id){
 return BUILTIN_IDS.includes(id)?"clip_"+id:id;
}
function get(id){
 id=normalizeId(id);
 const row=read().clips[id];
 if(!row&&!isBuiltin(id))return null;
 return recordFromStore(id,row);
}
function list(){
 const store=read();
 const ids=new Set([...BUILTIN_IDS.map(id=>"clip_"+id),...Object.keys(store.clips)]);
 return [...ids].map(id=>recordFromStore(id,store.clips[id]));
}
function create(opts){
 const A=contract();
 const man=A.emptyManifest(opts||{});
 if(get(man.id)&&man.id!=="clip_pushup")throw Error("Clip id exists");
 const store=read();
 store.clips[man.id]={manifest:man,layers:{},origin:"user",saveStatus:"local",updatedAt:now()};
 write(store);
 return get(man.id);
}
function updateManifest(id,patch){
 id=normalizeId(id);
 const rec=get(id); if(!rec)throw Error("Unknown clip "+id);
 const manifest={...rec.manifest,...patch,id:rec.manifest.id};
 if(patch&&Array.isArray(patch.frames))manifest.frames=patch.frames.map(f=>({key:String(f.key||"f0").slice(0,32),ms:Math.max(40,Math.min(800,Number(f.ms)||140))}));
 const store=read();
 const row=store.clips[id]||{layers:{},origin:rec.origin};
 row.manifest=manifest;row.updatedAt=now();
 if(rec.origin==="pilot")row.origin="pilot";
 if(row.saveStatus!=="drive")row.saveStatus=isBuiltin(id)&&!Object.keys(row.layers||{}).length?"stock":"local";
 store.clips[id]=row;write(store);
 return get(id);
}
function setLayer(id,part,dataUrl,meta){
 id=normalizeId(id);
 if(typeof dataUrl!=="string"||dataUrl.indexOf("data:image/png;base64,")!==0)throw Error("Layer must be a PNG data URL");
 if(dataUrl.length>9000000)throw Error("Activity sheet too large for localStorage");
 const rec=get(id); if(!rec)throw Error("Unknown clip "+id);
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
 if(isBuiltin(id) && contract().isPlayable(builtinBand(id)) &&
    (contract().PILOT_PARTS.indexOf(part)>=0 || part==="base/fx"))
   return contract().mediaUrl(part);
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
 if(isBuiltin(id))throw Error("Cannot delete a built-in activity");
 const store=read();delete store.clips[id];write(store);
}
function compatibility(rec){
 const man=rec&&rec.manifest;
 if(!man)return "Custom clip";
 const n=(man.frames||[]).length;
 const ms=(man.frames||[]).map(f=>f.ms).join(",");
 const extra=isBuiltin(man.id)?(
    contract().isPlayable(man.band)?
      "Built-in native Mahluk activity · V6P keyed part sheets":
      "Reserved activity · REVIEW ONLY · not playable yet"
  ):"User clip · activity sheet 384×2688 · painted frames only · no auto-strip";
 return n+" frame(s) · "+(man.loop?"loop":"once")+" · ms ["+ms+"] · "+extra;
}
function galleryEntry(rec){
 return {
  id:rec.id,type:"clip",origin:rec.origin==="pilot"?"built-in":"user",
  name:rec.name,part:null,placement:null,
  sheetDataUrl:"",thumbDataUrl:rec.thumbDataUrl||"",
  paintedActions:[rec.manifest&&rec.manifest.band||"custom"],
  saveStatus:rec.saveStatus,driveFile:rec.driveFile||null,
  updatedAt:rec.updatedAt||"",
  compatibility:compatibility(rec),
  openUrl:"./pixel-editor.html?source=v6p&project="+encodeURIComponent(rec.id),
  manifest:rec.manifest,frameMs:rec.frameMs
 };
}
function galleryEntries(){return list().map(galleryEntry);}
return Object.freeze({
 KEY,FORMAT,BUILTIN_IDS,get,list,create,updateManifest,setLayer,replaceLayers,layerUrl,hasLayer,markDrive,remove,
 compatibility,galleryEntry,galleryEntries
});
});
