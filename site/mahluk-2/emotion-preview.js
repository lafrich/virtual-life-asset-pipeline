/* Mahluk Hidup 2 / read-only Emosi.exe library and placement utilities.
 * Both GitHub Pages apps live on https://lafrich.github.io, so their IndexedDB
 * and localStorage entries share an ORIGIN; storage is not a cloud connection.
 * Google Drive entries are also supported by studio.js after OAuth sign-in.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MH2EmotionPreview=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const DIR=['se','sw','ne','nw'];
 const DB='emotion-studio-local-v1';
 const STORE='emotion-assets';
 const FALLBACK='emotion-studio-local-fallback-v1';
 const DEF=Object.freeze({x:0,y:0,scale:1});
 const clamp=(n,a,b,defaultValue)=>Number.isFinite(Number(n))?
  Math.min(b,Math.max(a,Number(n))):defaultValue;
 function placement(record){
  const p={};
  for(const dir of DIR){
   const source=record?.[dir]||record?.all||DEF;
   p[dir]={x:clamp(source?.x,-40,40,0),
    y:clamp(source?.y,-56,56,0),
    scale:clamp(source?.scale,.4,2.5,1)};
  }
  return p;
 }
 function patchPlacement(placements,dir,patch,all=false){
  const next=placement(placements);
  for(const d of all?DIR:[dir]){
   if(!DIR.includes(d))continue;
   next[d]={...next[d],
    ...(patch.x===undefined?{}:{x:clamp(patch.x,-40,40,0)}),
    ...(patch.y===undefined?{}:{y:clamp(patch.y,-56,56,0)}),
    ...(patch.scale===undefined?{}:{scale:clamp(patch.scale,.4,2.5,1)})};
  }
  return next;
 }
 function frameAt(elapsed,fps,frames,loop=true){
  const count=Math.max(1,Math.min(48,Math.trunc(Number(frames)||1)));
  const rate=clamp(fps,1,30,6);
  const n=Math.max(0,Math.floor(Math.max(0,Number(elapsed)||0)*rate/1000));
  return loop?n%count:Math.min(count-1,n);
 }
 function valid(entry){
  return Boolean(entry&&/^[-a-z0-9_]{1,64}$/.test(entry.id||'')&&
   typeof entry.name==='string'&&entry.name.length<=90&&
   Number.isInteger(entry.frames)&&entry.frames>=1&&entry.frames<=48&&
   ['universal','male','female','original'].includes(entry.base)&&
   ((typeof entry.png==='string'&&/^data:image\/png;base64,[a-z\d+/=]+$/i.test(entry.png)&&
    entry.png.length<3000000)||
    (typeof entry.template==='string'&&/^[a-z]+$/.test(entry.template))));
 }
 function fromFallback(store){
  try{
   const raw=JSON.parse(store?.getItem(FALLBACK)||'[]');
   return Array.isArray(raw)?raw.filter(valid):[];
  }catch{return []}
 }
 function openStore(factory){
  return new Promise((resolve,reject)=>{
   let req;
   try{req=factory.open(DB,1)}catch(error){reject(error);return}
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))
    req.result.createObjectStore(STORE,{keyPath:'id'})};
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||Error('Unable to open shared Emosi.exe database'));
   req.onblocked=()=>reject(Error('Emosi.exe database is currently locked'));
  });
 }
 async function loadLocal({indexedDB:dbFactory=typeof indexedDB==='undefined'?null:indexedDB,
  localStorage:store=typeof localStorage==='undefined'?null:localStorage}={}){
  const merged=new Map(fromFallback(store).map(row=>[row.id,row]));
  let source=merged.size?'browser fallback':'none',warning='';
  if(dbFactory){
   let db;
   try{
    db=await openStore(dbFactory);
    const rows=await new Promise((resolve,reject)=>{
     const tx=db.transaction(STORE,'readonly');
     const req=tx.objectStore(STORE).getAll();
     req.onsuccess=()=>resolve(req.result);
     req.onerror=()=>reject(req.error||Error('Emosi.exe storage read failed'));
     tx.onerror=()=>reject(tx.error||Error('Emosi.exe transaction failed'));
    });
    for(const item of rows||[])if(valid(item))merged.set(item.id,item);
    source='indexedDB';
   }catch(error){warning=String(error?.message||error)}
   finally{try{db?.close()}catch{}}
  }
  return {entries:[...merged.values()],source,warning};
 }
 return Object.freeze({DIR,DB,STORE,FALLBACK,DEF,placement,patchPlacement,
  frameAt,valid,fromFallback,loadLocal});
});
