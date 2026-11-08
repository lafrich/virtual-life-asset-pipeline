/* One shared Python diagnostic preview bridge for Character's existing
 * 4-direction QA. Uploaded Python is only parsed as declarative JSON,
 * never executed. Source animations are not installed to gameplay.
 *
 * IMPORTANT: Python live_v6b currently renders approved Ichsan/Noor diagnostic
 * configurations, not arbitrary saved Genesis garments/Custom Wear. The UI
 * must accurately identify this native-pose-only limitation.
 */
(function(root){"use strict";
const Contract=root.GenesisNativePythonContract;
if(!Contract)return;
const dirs=Contract.DIRS;
const records=new Map();
const cloudIds=new Set();
const cache=new Map();
const waiting=new Map();
let worker=null,seq=0;
function register(data,origin="manual"){
 const valid=Contract.validate(data);
 records.set(valid.id,{data:valid,origin});
 // Re-importing a file under the same ID invalidates previously rendered pixels.
 for(const key of cache.keys())if(key.startsWith(valid.id+"|"))cache.delete(key);
 return valid;
}
function importFile(source){
 return register(Contract.fromPython(source),"manual");
}
function setCloud(rows){
 const accepted=[];
 const candidates=Array.isArray(rows)?rows:[];
 for(const row of candidates){
  try{
   if(row?.format!==Contract.FORMAT||typeof row.python!=="string")continue;
   const data=Contract.fromPython(row.python);
   accepted.push({data,updated:String(row.savedAt||"")});
  }catch{/* Ignore incompatible cloud data, never execute source. */}
 }
 // Prefer latest valid Drive record if duplicates were created previously.
 accepted.sort((a,b)=>a.updated.localeCompare(b.updated));
 const fresh=new Map(accepted.map(x=>[x.data.id,x.data]));
 for(const id of cloudIds){
  const existing=records.get(id);
  if(existing?.origin==="cloud")records.delete(id);
 }
 cloudIds.clear();
 for(const data of fresh.values()){
  const existing=records.get(data.id);
  if(existing?.origin==="manual")continue;
  register(data,"cloud");cloudIds.add(data.id);
 }
 return [...fresh.values()];
}
function list(){
 return [...records.values()].map(({data,origin})=>({id:data.id,name:data.name,template:data.template,frames:data.frames.length,origin}));
}
function get(id){return records.get(id)?.data||null}
function beginWorker(){
 if(worker)return worker;
 worker=new Worker("./genesis-native-worker.js?v=character-qa-batch-v1");
 worker.onmessage=e=>{
  const m=e.data||{},row=waiting.get(m.id);
  if(!row)return;
  if(m.type==="renderBatch"&&m.images){
   waiting.delete(m.id);row.resolve(m.images);
  }else if(m.type==="error"){
   waiting.delete(m.id);row.reject(Error("Python native renderer: "+m.message));
  }
 };
 worker.onerror=e=>{
  const error=Error("Python worker unavailable: "+(e.message||"startup error"));
  for(const row of waiting.values())row.reject(error);
  waiting.clear();worker.terminate();worker=null;
 };
 return worker;
}
async function render(id,gender,index){
 const data=get(id);
 if(!data)throw Error("Python animation not imported in Character");
 if(gender!=="male"&&gender!=="female")throw Error("Select a Genesis Male or Female base");
 if(!Number.isInteger(index)||index<0||index>=data.frames.length)throw Error("Frame out of range");
 const signature=JSON.stringify(data);
 const key=data.id+"|"+gender+"|"+index+"|"+signature.length+"|"+signature.slice(-40);
 if(cache.has(key))return cache.get(key);
 const idNum=++seq;
 const promise=new Promise((resolve,reject)=>{
  waiting.set(idNum,{resolve,reject});
  beginWorker().postMessage({type:"renderBatch",id:idNum,request:{data,gender,frame:index}});
 });
 try{
  const images=await promise;
  if(!dirs.every(dir=>typeof images?.[dir]==="string"&&images[dir].startsWith("data:image/png;base64,")))
   throw Error("Native Python preview is missing one of four directions");
  cache.set(key,images);
  return images;
 }catch(e){cache.delete(key);throw e}
}
async function draw(images,canvases,active){
 const bitmaps=await Promise.all(dirs.map(dir=>new Promise((resolve,reject)=>{
  const src=images[dir],im=new Image();
  im.onload=()=>resolve(im);im.onerror=()=>reject(Error("Cannot decode Python "+dir+" frame"));
  im.src=src;
 })));
 if(typeof active==="function"&&!active())return false;
 for(const cv of canvases){
  const i=dirs.indexOf(cv.dataset.qaDir);
  if(i<0)continue;
  const ctx=cv.getContext("2d");ctx.imageSmoothingEnabled=false;
  ctx.clearRect(0,0,64,112);ctx.drawImage(bitmaps[i],0,0,64,112);
 }
 return true;
}
root.GenesisCharacterPythonPreview=Object.freeze({importFile,setCloud,list,get,render,draw});
})(window);
