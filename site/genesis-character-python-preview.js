/* Character Genesis Python pose preview. Uses the currently selected native
 * Character source sheet (including Custom Wear + Emosi), not sample people. */
(function(root){"use strict";
const Contract=root.GenesisNativePythonContract;
if(!Contract)return;
const dirs=Contract.DIRS;
const records=new Map();
const cloudIds=new Set();
function register(data,origin="manual"){
 const valid=Contract.validate(data);
 records.set(valid.id,{data:valid,origin});
 return valid;
}
function importFile(source){
 return register(Contract.fromPython(source),"manual");
}
function setCloud(rows,{preferCloud=false}={}){
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
 accepted.sort((a,b)=>b.updated.localeCompare(a.updated));
 const fresh=new Map();
 for(const row of accepted)if(!fresh.has(row.data.id))fresh.set(row.data.id,row.data);
 for(const id of cloudIds){
  const existing=records.get(id);
  if(existing?.origin==="cloud")records.delete(id);
 }
 cloudIds.clear();
 for(const data of fresh.values()){
  const existing=records.get(data.id);
  if(existing?.origin==="manual"&&!preferCloud)continue;
  register(data,"cloud");cloudIds.add(data.id);
 }
 return [...fresh.values()];
}
function list(){
 return [...records.values()].map(({data,origin})=>({id:data.id,name:data.name,template:data.template,frames:data.frames.length,origin}));
}
function get(id){return records.get(id)?.data||null}
/* A Python source is declarative geometry. Render it onto the *actual*
 * selected Character atlas and approved Genesis master rig. No hardcoded
 * sample configurations, no sample Python worker, and no source overwrite.
 * The Character compositor already stamps Emosi last into the native sheet;
 * the puppet renderer draws the head/face slice last again.
 */
async function render(id,gender,index,{sheet,profile}={}){
 const data=get(id);
 if(!data)throw Error("Python animation not imported in Character");
 if(!["male","female"].includes(gender))throw Error("Choose Genesis Male or Female");
 if(!Number.isInteger(index)||index<0||index>=data.frames.length)throw Error("Frame out of range");
 if(!sheet)throw Error("Selected Genesis character's Native/Custom Wear source sheet is unavailable");
 const master=root.GenesisMasterRig,puppet=root.GenesisPuppetRenderer;
 if(!master||!puppet)throw Error("Genesis master renderer not loaded");
 const rig=profile?master.validate(profile):master.load(gender);
 const images={};
 for(const dir of dirs){
  const frame=puppet.render({
   sheet,template:data.template,direction:dir,frame:index,
   pose:data.poses[dir][index],profile:rig
  });
  images[dir]=frame.toDataURL("image/png");
 }
 return images;
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
