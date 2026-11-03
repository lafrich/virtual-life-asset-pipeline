/* Mahluk Hidup -> Semesta: local, named gameplay animation templates.
 * Metadata lives separately from the per-frame PNG editor data; no duplicated
 * pixels or changes to the original published character art.
 * Templates are playable ONLY with authored frames for all four directions.
 */
(function(root,factory){
 "use strict";
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.VLActionTemplates=api;
})(typeof window!=="undefined"?window:null,function(root){
 "use strict";
 const KEY="virtual-life-action-templates-v1",FRAME_KEY="virtual-life-action-frame-edits-v1";
 const DIR=["se","sw","ne","nw"],ID=/^[a-z0-9_-]{1,90}$/;
 const safe=(actor,action)=>ID.test(actor||"")&&ID.test(action||"");
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,Math.round(Number(v)||lo)));
 const rotation=v=>((Math.round((Number(v)||0)/90)*90)%360+360)%360;
 const expression=v=>ID.test(v||"")?v:"neutral";
 const source=()=>root?.VLActionFrames;
 let cache=null;
 function read(){
  if(cache)return cache;
  try{
   const raw=JSON.parse(localStorage.getItem(KEY)||"null");
   cache=raw?.version===1&&raw.templates&&typeof raw.templates==="object"?
    raw:{version:1,templates:{}};
  }catch{cache={version:1,templates:{}};}
  return cache;
 }
 function persist(){
  localStorage.setItem(KEY,JSON.stringify(read()));
  if(root?.dispatchEvent&&root?.CustomEvent)
   root.dispatchEvent(new root.CustomEvent("mahluk-action-template-saved",{detail:{key:KEY}}));
 }
 const k=(actor,action)=>actor+":"+action;
 function coverage(actor,action){
  const store=source(),found={};
  for(const d of DIR){
   const frames=(store?.entries(actor,action)||[])
    .map(x=>x.split(":")).filter(x=>x[0]===d)
    .map(x=>Number(x[1])).filter(n=>Number.isInteger(n)&&n>=0&&n<40)
    .sort((a,b)=>a-b);
   found[d]=[...new Set(frames)];
  }
  return {directions:found,authored:DIR.reduce((n,d)=>n+found[d].length,0),
   complete:DIR.every(d=>found[d].length>0)};
 }
 function get(actor,action){
  if(!safe(actor,action))return null;
  const value=read().templates[k(actor,action)];
  if(!value||value.actor!==actor||value.action!==action)return null;
  const progress=coverage(actor,action);
  return {...value,rotation:rotation(value.rotation),
   expression:expression(value.expression),loop:value.loop!==false,
   ready:progress.complete,coverage:progress};
 }
 function list(actor){
  return Object.values(read().templates).filter(row=>row&&
   (!actor||row.actor===actor)&&safe(row.actor,row.action))
   .map(row=>get(row.actor,row.action)).filter(Boolean)
   .sort((a,b)=>a.name.localeCompare(b.name));
 }
 function save(actor,action,options={}){
  if(!safe(actor,action))throw Error("Invalid player / action identifier");
  const progress=coverage(actor,action);
  if(!progress.authored)throw Error("Paint and SAVE FRAME before saving the template");
  const name=String(options.name||action.replace(/_/g," ")).trim().slice(0,64);
  if(!name)throw Error("Enter a template name");
  const value={actor,action,name,objectLayer:options.objectLayer==="behind"?"behind":"front",
   frames:clamp(options.frames||4,1,12),frameMs:clamp(options.frameMs||210,60,1000),
   rotation:rotation(options.rotation),expression:expression(options.expression),
   loop:options.loop!==false,version:1};
  read().templates[k(actor,action)]=value;
  persist();
  return get(actor,action);
 }
 function remove(actor,action){
  if(!safe(actor,action))return false;
  const db=read(),key=k(actor,action);
  if(!db.templates[key])return false;
  delete db.templates[key];persist();return true;
 }
 function frame(actor,action,dir,index){
  const record=get(actor,action);
  if(!record?.ready||!DIR.includes(dir))return null;
  const available=record.coverage.directions[dir];
  if(!available?.length)return null;
  const requested=clamp(index,0,record.frames-1);
  const chosen=available.includes(requested)?requested:available[requested%available.length];
  return source()?.get(actor,action,dir,chosen)||null;
 }
 function invalidate(){cache=null;source()?.invalidate?.();}
 if(root?.addEventListener)root.addEventListener("storage",e=>{
  if(e.key===KEY||e.key===FRAME_KEY)invalidate();
 });
 return Object.freeze({key:KEY,frameKey:FRAME_KEY,DIR,coverage,get,list,save,remove,frame,invalidate});
});
