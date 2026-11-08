/* Membangun Universal Cloud Interchange v1.
 * No automatic persistent local storage; never delete unsynced data.
 * App adapters supply upload, Drive readback and editor hydration.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MembangunUniversal=api;
})(typeof window!=="undefined"?window:null,function(){"use strict";
 const FORMAT="membangun-universal-v1",VERSION=1,MAX_BYTES=25*1024*1024,MAX_ROWS=2000;
 const APPS=new Set(["semesta","bangun","jiwa","mahluk","emosi","mainkan","pipeline"]);
 const idPattern=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/;
 const kindPattern=/^[a-z][a-z0-9_-]{0,63}$/;
 const bytes=s=>new TextEncoder().encode(s).length;
 const obj=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
 const copy=x=>JSON.parse(JSON.stringify(x));
 const key=r=>r.app+"/"+r.kind+"/"+r.id;
 function validate(row){
  if(!obj(row)||!APPS.has(row.app)||!kindPattern.test(row.kind||"")||
     !idPattern.test(row.id||"")||!obj(row.data))throw Error("Invalid universal record");
  if(bytes(JSON.stringify(row.data))>MAX_BYTES)throw Error("Oversized record");
  return {app:row.app,kind:row.kind,id:row.id,data:copy(row.data)};
 }
 async function hash(value){
  const str=typeof value==="string"?value:JSON.stringify(value);
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(str));
  return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,"0")).join("");
 }
 async function pack(records,sourceApp="mixed"){
  if(!Array.isArray(records)||records.length>MAX_ROWS||
    (sourceApp!=="mixed"&&!APPS.has(sourceApp)))throw Error("Invalid universal package input");
  const seen=new Set(),rows=[];
  for(const r of records){const rec=validate(r),k=key(rec);
   if(seen.has(k))throw Error("Duplicate universal record: "+k);
   seen.add(k);rows.push({...rec,sha256:await hash(rec.data)});
  }
  const body={format:FORMAT,version:VERSION,sourceApp,records:rows};
  const payload={...body,sha256:await hash(body)};
  if(bytes(JSON.stringify(payload))>MAX_BYTES)throw Error("Universal file exceeds 25 MB");
  return payload;
 }
 async function unpack(json){
  if(typeof json!=="string"||bytes(json)>MAX_BYTES)throw Error("Universal import too large");
  let v;try{v=JSON.parse(json)}catch{throw Error("Invalid universal JSON")}
  if(!obj(v)||v.format!==FORMAT||v.version!==VERSION||
     !Array.isArray(v.records)||v.records.length>MAX_ROWS||
     (v.sourceApp!=="mixed"&&!APPS.has(v.sourceApp)))throw Error("Unsupported universal file");
  const seen=new Set(),rows=[];
  for(const item of v.records){const rec=validate(item),k=key(rec);
   if(seen.has(k))throw Error("Duplicate universal record: "+k);
   if(item.sha256!==await hash(rec.data))throw Error("Record checksum mismatch: "+k);
   seen.add(k);rows.push({...rec,sha256:item.sha256});
  }
  const body={format:FORMAT,version:VERSION,sourceApp:v.sourceApp,records:rows};
  if(v.sha256!==await hash(body))throw Error("Package checksum mismatch");
  return {...body,sha256:v.sha256};
 }
 async function syncImported(json,driver){
  if(!driver||typeof driver.upload!=="function"||typeof driver.readback!=="function")
   throw Error("Drive upload and readback are required");
  const file=await unpack(json),receipts=[];
  for(const r of file.records){
   const receipt=await driver.upload(r);
   if(receipt?.verified!==true)throw Error("Upload not verified: "+key(r));
   const actual=validate(await driver.readback(r,receipt));
   if(key(actual)!==key(r)||await hash(actual.data)!==r.sha256)
    throw Error("Drive readback failed: "+key(r));
   receipts.push({app:r.app,kind:r.kind,id:r.id,sha256:r.sha256,verified:true});
  }
  // Apply only AFTER the entire import is verified on Drive.
  if(typeof driver.apply==="function")await driver.apply(file.records);
  return {verified:true,receipts,count:receipts.length};
 }
 function cleanupSynced(store,items,receipts){
  if(typeof store?.getItem!=="function"||typeof store?.removeItem!=="function"||
     !Array.isArray(items)||!Array.isArray(receipts))
   throw Error("Explicit scoped cleanup inputs required");
  const valid=new Set(receipts.filter(x=>x?.verified===true&&APPS.has(x.app)&&
    kindPattern.test(x.kind||"")&&idPattern.test(x.id||"")&&
    /^[0-9a-f]{64}$/.test(x.sha256||"")).map(x=>key(x)+"#"+x.sha256));
  const removed=[],skipped=[];
  for(const item of items){
   if(!item||typeof item.key!=="string"||typeof item.value!=="string"||
     !APPS.has(item.app)||!kindPattern.test(item.kind||"")||
     !idPattern.test(item.id||"")||!/^[0-9a-f]{64}$/.test(item.sha256||"")||
     !valid.has(key(item)+"#"+item.sha256)||store.getItem(item.key)!==item.value){
    skipped.push(item?.key||"?");continue;
   }
   store.removeItem(item.key);removed.push(item.key);
  }
  return {removed,skipped};
 }
 return Object.freeze({FORMAT,VERSION,APPS,validate,hash,pack,unpack,syncImported,cleanupSynced});
});