/* Mahluk Hidup multi-actor ACT scenes — shared same-origin placement contract.
 * Sprite references and local equipment IDs only; canonical sprites are immutable.
 * Semesta/Bangun Ruang can read this script and its same-origin localStorage.
 */
(function(root,factory){"use strict";
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.VLActionScenes=api;
})(typeof window!=="undefined"?window:null,function(root){"use strict";
 const KEY="virtual-life-action-scenes-v1";
 const BIND_KEY="virtual-life-action-scene-placements-v1";
 const DIR=["se","sw","ne","nw"];
 const SLOTS=["hair","shirt","pants","shoes","bag","helmet"];
 const ID=/^[a-z][a-z0-9_-]{0,89}$/;
 const safe=id=>typeof id==="string"&&ID.test(id);
 const clamp=(n,min,max,fallback=0)=>{
  const value=Number(n);return Number.isFinite(value)?Math.min(max,Math.max(min,Math.round(value))):fallback;
 };
 const storage=()=>{try{return root?.localStorage||null}catch{return null}};
 function cleanParticipant(raw,ordinal){
  if(!raw||!safe(raw.actorId)||!safe(raw.motionId||"idle"))return null;
  const equipment={};
  for(const slot of SLOTS){
   const id=raw.equipment?.[slot];
   if(id==="inherit"||id==="none"||safe(id))equipment[slot]=id;
   else equipment[slot]="inherit";
  }
  return {
   slot:clamp(raw.slot,1,8,ordinal+1),
   actorId:raw.actorId,
   motionId:raw.motionId||"idle",
   direction:DIR.includes(raw.direction)?raw.direction:"se",
   expressionId:safe(raw.expressionId) ? raw.expressionId:"neutral",
   faceAssetId:safe(raw.faceAssetId)?raw.faceAssetId:
    (safe(raw.expressionId)?raw.expressionId:"neutral"),
   faceAssetData:typeof raw.faceAssetData==="string"&&
    raw.faceAssetData.length<100000&&
    /^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(raw.faceAssetData)?
     raw.faceAssetData:null,
   autoFace:raw.autoFace!==false,
   x:clamp(raw.x,-390,390),y:clamp(raw.y,-230,190),
   layer:clamp(raw.layer,-20,20,ordinal),
   objectLayer:raw.objectLayer==="behind"?"behind":"front",
   faceOffsetX:clamp(raw.faceOffsetX,-32,32),
   faceOffsetY:clamp(raw.faceOffsetY,-32,32),
   colors:{
    shirt:/^#[0-9a-f]{6}$/i.test(raw.colors?.shirt||"")?
     raw.colors.shirt:"#5072b4",
    pants:/^#[0-9a-f]{6}$/i.test(raw.colors?.pants||"")?
     raw.colors.pants:"#424956"
   },
   equipment
  };
 }
 function clean(raw){
  if(!raw||typeof raw!=="object"||!Array.isArray(raw.participants))return null;
  const participants=[],seen=new Set();
  for(const item of raw.participants.slice(0,8)){
   const c=cleanParticipant(item,participants.length);
   if(!c)continue;
   if(seen.has(c.slot)){
    c.slot=Array.from({length:8},(_,i)=>i+1).find(x=>!seen.has(x));
    if(!c.slot)break;
   }
   seen.add(c.slot);participants.push(c);
  }
  if(!participants.length)return null;
  const id=safe(raw.id)?raw.id:"";
  const tag=typeof raw.name==="string"?raw.name.trim().slice(0,64):"";
  return {
   version:1,id,name:tag||"UNTITLED ACT",
   trigger:safe(raw.trigger)?raw.trigger:"interact",
   fixture:safe(raw.fixture)?raw.fixture:"any",
   loop:raw.loop!==false,
   durationMs:clamp(raw.durationMs,600,12000,2400),
   updatedAt:clamp(raw.updatedAt,0,9999999999999,0),
   participants
  };
 }
 function read(store=storage()){
  if(!store)return [];
  try{
   const data=JSON.parse(store.getItem(KEY)||"[]");
   if(!Array.isArray(data))return [];
   const seen=new Set(),out=[];
   for(const entry of data.slice(0,80)){
    const item=clean(entry);
    if(!item||!item.id||seen.has(item.id))continue;
    seen.add(item.id);out.push(item);
   }
   return out;
  }catch{return []}
 }
 const list=(store=storage())=>read(store).sort((a,b)=>b.updatedAt-a.updatedAt);
 const get=(id,store=storage())=>list(store).find(x=>x.id===id)||null;
 function write(rows,store=storage()){
  if(!store)throw Error("Browser storage is unavailable");
  store.setItem(KEY,JSON.stringify(rows));
  const verify=read(store);
  if(verify.length!==rows.length)throw Error("Could not verify saved ACT preset");
  if(root?.dispatchEvent&&root?.CustomEvent)root.dispatchEvent(
   new root.CustomEvent("mahluk-act-saved",{detail:{key:KEY}}));
 }
 function save(raw,store=storage()){
  const cleanScene=clean(raw);
  if(!cleanScene)throw Error("ACT needs at least one valid character");
  const rows=read(store);
  if(!cleanScene.id)cleanScene.id="act_"+Date.now().toString(36)+"_"+
   Math.random().toString(36).slice(2,7);
  cleanScene.updatedAt=Date.now();
  const position=rows.findIndex(x=>x.id===cleanScene.id);
  if(position>=0)rows.splice(position,1);
  rows.unshift(cleanScene);
  if(rows.length>60)throw Error("Maximum 60 ACT presets reached");
  write(rows,store);return cleanScene;
 }
 function remove(id,store=storage()){
  if(!safe(id))return false;
  const rows=read(store),kept=rows.filter(x=>x.id!==id);
  if(kept.length===rows.length)return false;
  write(kept,store);return true;
 }
 function readBindings(store=storage()){
  if(!store)return {};
  try{
   const v=JSON.parse(store.getItem(BIND_KEY)||"{}");
   if(!v||typeof v!=="object"||Array.isArray(v))return {};
   const out={};
   for(const [key,id] of Object.entries(v).slice(0,300))
    if(/^[a-z][a-z0-9_-]{0,89}::[a-z][a-z0-9_-]{0,89}$/.test(key)&&safe(id))
     out[key]=id;
   return out;
  }catch{return {}}
 }
 function bind(fixture,action,sceneId,store=storage()){
  if(!safe(fixture)||!safe(action)||!get(sceneId,store))return false;
  const rows=readBindings(store);
  rows[fixture+"::"+action]=sceneId;
  try{store.setItem(BIND_KEY,JSON.stringify(rows));return true}catch{return false}
 }
 function unbind(fixture,action,store=storage()){
  if(!safe(fixture)||!safe(action))return false;
  const rows=readBindings(store);delete rows[fixture+"::"+action];
  try{store.setItem(BIND_KEY,JSON.stringify(rows));return true}catch{return false}
 }
 function forPlacement(fixture,action,store=storage()){
  const rows=list(store),bound=readBindings(store)[fixture+"::"+action];
  const linked=bound&&rows.find(x=>x.id===bound);
  return linked||rows.find(x=>x.trigger===action&&
   (x.fixture==="any"||x.fixture===fixture))||null;
 }
 function decode(text){
  if(typeof text!=="string"||text.length>200000)throw Error("Invalid ACT file");
  const raw=JSON.parse(text);
  const value=raw?.scene||raw;
  const parsed=clean(value);
  if(!parsed)throw Error("ACT file has no valid participants");
  return parsed;
 }
 // Analyze ONLY the native 64x112 actor frame: the first substantial
 // horizontal silhouette is the skull on upright actions. Do not use the
 // already-composited stage, which can include tall bags and helmets.
 function headAnchor(imageData,width=64,height=112){
  const pixels=imageData?.data||imageData;
  if(!pixels||pixels.length<width*height*4)return null;
  const limit=Math.min(height,88);
  let top=-1;
  for(let y=0;y<limit;y++){
   let occupied=0;
   for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]>=128)occupied++;
   if(occupied>=5){top=y;break;}
  }
  if(top<0)return null;
  const xs=[];
  for(let y=top;y<Math.min(limit,top+12);y++)
   for(let x=0;x<width;x++)
    if(pixels[(y*width+x)*4+3]>=128)xs.push(x);
  if(xs.length<8)return null;
  xs.sort((a,b)=>a-b);
  return {x:xs[Math.floor(xs.length/2)],y:top};
 }
 // Never paste a whole idle head over a posed head. Native expression
 // sheets are 64x112 FULL BODIES; just the 15x14 INNER face is transferable.
 // Source & destination are independently measured (squat/bend/idle).
 function nativeFacePatch(sourceHead,posedHead,offsetX=0,offsetY=0){
  if(!sourceHead||!posedHead)return null;
  const sx=Math.round(sourceHead.x)-7,sy=Math.round(sourceHead.y)+10;
  const dx=Math.round(posedHead.x)-7+Math.round(Number(offsetX)||0);
  const dy=Math.round(posedHead.y)+10+Math.round(Number(offsetY)||0);
  const w=15,h=14;
  if(sx<0||sy<0||sx+w>64||sy+h>112||
     dx<0||dy<0||dx+w>64||dy+h>112)return null;
  return {sx,sy,dx,dy,w,h};
 }
 return Object.freeze({KEY,BIND_KEY,DIR,SLOTS,clean,read,list,get,save,remove,
  bind,unbind,readBindings,forPlacement,decode,headAnchor,nativeFacePatch});
});
