/* Lossless published-character archive. Store large PNG clips in IndexedDB
 * when the 5MB-ish origin localStorage quota rejects the compatibility index.
 * Never delete or rewrite an existing user's published character or draft. */
(function(root,factory){
 "use strict";
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.V6PPublishedArchive=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(root){
"use strict";
const DB="mahluk-published-character-archive-v1", STORE="records";
async function database(){
 if(!root?.indexedDB)throw Error("IndexedDB is unavailable. Cannot safely archive a large character.");
 return await new Promise((resolve,reject)=>{
  const req=root.indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{
   if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:"id"});
  };
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error("Cannot open character archive"));
  req.onblocked=()=>reject(Error("Close other Mahluk tabs before using character archive"));
 });
}
async function operation(mode,fn){
 const db=await database();
 try{
  return await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
   let result;
   try{fn(store,v=>{result=v})}catch(e){reject(e);try{tx.abort()}catch{}return}
   tx.oncomplete=()=>resolve(result);
   tx.onerror=()=>reject(tx.error||Error("Character archive transaction failed"));
   tx.onabort=()=>reject(tx.error||Error("Character archive aborted"));
  });
 }finally{db.close()}
}
function valid(row){return row&&/^mh2_[a-z0-9]+$/.test(row.id)&&row.format==="mahluk-2-character-v1"&&typeof row.clips==="object"}
async function put(row){
 if(!valid(row))throw Error("Invalid published character for archive");
 await operation("readwrite",store=>{store.put(row)});
 return row.id;
}
async function get(id){
 if(!/^mh2_[a-z0-9]+$/.test(id||""))return null;
 return await operation("readonly",(store,result)=>{
  const req=store.get(id);req.onsuccess=()=>result(req.result||null);
 });
}
async function list(){
 return await operation("readonly",(store,result)=>{
  const req=store.getAll();req.onsuccess=()=>result((req.result||[]).filter(valid));
 });
}
async function replace(rows){
 if(!Array.isArray(rows)||!rows.every(valid))throw Error("Invalid character archive backup");
 await operation("readwrite",store=>{
  store.clear();for(const row of rows)store.put(row);
 });
}
function index(row){
 if(!valid(row))throw Error("Invalid published character index");
 const clips={};
 for(const [id,clip] of Object.entries(row.clips||{})){
  clips[id]={frames:clip.frames,frame_ms:clip.frame_ms,loop:clip.loop,source:clip.source};
 }
 return {...row,clips,archived:"indexeddb-v1"};
}
return Object.freeze({DB,STORE,put,get,list,replace,index});
});