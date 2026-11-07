/* Character-local layer sheets + editable appearances. No stock/global part mutation.
   Same-origin Mahluk storage, included in unified Drive snapshots. */
(function(root,factory){"use strict";const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.V6PCharacterStore=api;})(typeof window!=="undefined"?window:null,function(root){
"use strict";
const KEY="vl-v6p-character-workflow-v1",SELECTED="vl-v6p-selected-character-v1",FORMAT="v6p-character-workflow-v1";
const C=()=>root?.V6PPartCatalog||(typeof require==="function"?require("./v6p-part-catalog.js"):null);
const storage=()=>root?.localStorage;
const ID=/^mh2_[a-z0-9]+$/;
const text=(v,n=60)=>String(v||"").trim().slice(0,n);
function read(){try{const v=JSON.parse(storage()?.getItem(KEY)||"null");return v?.format===FORMAT&&Array.isArray(v.items)?v.items.filter(x=>x&&ID.test(x.id)).slice(0,150):[]}catch{return []}}
function write(items){if(!storage())throw Error("Local storage unavailable");storage().setItem(KEY,JSON.stringify({format:FORMAT,items}));try{root?.VLHub?.publish("characters",{source:"mahluk-character-workflow",count:items.length})}catch{}}
function list(){return read().map(x=>({...x,parts:undefined,partCount:Object.keys(x.parts||{}).length}))}
function get(id){return ID.test(id)?read().find(x=>x.id===id)||null:null}
function selected(){try{return storage()?.getItem(SELECTED)||""}catch{return ""}}
function select(id){if(id&&!get(id))throw Error("Unknown character "+id);if(id)storage().setItem(SELECTED,id);else storage().removeItem(SELECTED)}
function freshId(){return "mh2_"+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function starter(gender){return {body:gender==="female"?"female":"male",gender:gender==="female"?"female":"male",
 hair:"none",hairColor:"black",skin:"light",top:"nude",topColor:"white",pants:"nude",pantsColor:"slate",shoes:"nude",shoesColor:"black",glasses:"none",facial:"none",face:"blank",accessories:[]}}
function create({name,gender="male",from=""}={}){
 const source=from?get(from):null;if(from&&!source)throw Error("Missing clone source");
 const id=freshId(),row={id,name:text(name)||"New Character",gender:source?.gender||gender,
  appearance:source?{...source.appearance,accessories:[...(source.appearance?.accessories||[])]}:starter(gender),
  faceId:source?.faceId||"",parts:source?{...source.parts}:{},masters:source?JSON.parse(JSON.stringify(source.masters||{})):{},corrections:source?JSON.parse(JSON.stringify(source.corrections||{})):{},generated:source?JSON.parse(JSON.stringify(source.generated||{})):{},derived:source?{...source.derived}:{},
  origin:source?.id||"base",status:"draft",updated:new Date().toISOString()};
 const all=read();all.push(row);write(all);select(id);return row;
}
function update(id,patch){
 const all=read(),index=all.findIndex(x=>x.id===id);if(index<0)throw Error("Unknown character");
 const old=all[index],row={...old,name:patch.name!==undefined?(text(patch.name)||old.name):old.name,
  appearance:patch.appearance&&typeof patch.appearance==="object"?{...old.appearance,...patch.appearance}:old.appearance,
  faceId:patch.faceId!==undefined?text(patch.faceId,100):old.faceId,
  status:patch.status||old.status,updated:new Date().toISOString()};
 if(!patch.status&&(JSON.stringify(row.appearance)!==JSON.stringify(old.appearance)||
  row.name!==old.name||row.faceId!==old.faceId))row.status="draft";
 all[index]=row;write(all);return row;
}
function getPart(id,part){const row=get(id);return row?.parts?.[part]||null}
function setPart(id,part,dataUrl){
 if(!C()?.isPart(part))throw Error("Unknown V6P part "+part);
 if(typeof dataUrl!=="string"||!dataUrl.startsWith("data:image/png;base64,")||dataUrl.length>9000000)throw Error("PNG layer required");
 const all=read(),i=all.findIndex(x=>x.id===id);if(i<0)throw Error("Unknown character");
 all[i].parts={...(all[i].parts||{}),[part]:dataUrl};all[i].updated=new Date().toISOString();write(all);return all[i];
}
function resetPart(id,part){
 return writeRow(id,row=>{
  for(const field of ["parts","masters","corrections","generated"]){
   const next={...(row[field]||{})};delete next[part];row[field]=next;
  }
  row.status="draft";
 });
}
function writeRow(id,edit){
 const all=read(),i=all.findIndex(x=>x.id===id);if(i<0)throw Error("Unknown character "+id);
 edit(all[i]);all[i].updated=now();write(all);return all[i];
}
function now(){return new Date().toISOString()}
function master(id,part,dir){
 if(!C()?.isPart(part)||!C().DIRS.includes(dir))return null;
 return get(id)?.masters?.[part]?.[dir]||null;
}
function setMaster(id,part,dir,png){
 if(!C()?.isPart(part)||!C().DIRS.includes(dir))throw Error("Invalid part or direction");
 if(typeof png!=="string"||!png.startsWith("data:image/png;base64,")||png.length>350000)throw Error("Master must be a 64x112 PNG");
 return writeRow(id,row=>{row.masters={...(row.masters||{})};
  row.masters[part]={...(row.masters[part]||{}),[dir]:png};
  row.status="draft";
 });
}
function markCorrection(id,part,action,dir,frame){
 if(!C()?.isPart(part)||!C().ACTIONS.includes(action)||!C().DIRS.includes(dir)||!Number.isInteger(frame)||frame<0||frame>=C().FRAMES[action])throw Error("Invalid corrected frame");
 return writeRow(id,row=>{row.corrections={...(row.corrections||{})};
  row.corrections[part]={...(row.corrections[part]||{}),[action+"|"+dir+"|"+frame]:true};
  row.status="draft";
 });
}
function isCorrection(id,part,action,dir,frame){return !!get(id)?.corrections?.[part]?.[action+"|"+dir+"|"+frame]}
function clearCorrection(id,part,action,dir,frame){
 return writeRow(id,row=>{const c={...(row.corrections||{})};c[part]={...(c[part]||{})};delete c[part][action+"|"+dir+"|"+frame];row.corrections=c;});
}
/* Fix legacy edits where back-facing top masters were mistakenly saved on
   top/front before the distinct *_back source layer was wired into the UI.
   Non-destructive for user artwork: only relocate wrongly addressed master
   pointers; keep old full sheets and manual corrections for recovery. */
function repairTopBackMasters(id){
 const row=get(id);if(!row)return {moved:0,remainingCorrections:0};
 const changes=[],catalog=C();
 if(!catalog)return {moved:0,remainingCorrections:0};
 for(const [part,views] of Object.entries(row.masters||{})){
  if(!/^top\//.test(part)||/_back(?:_f)?$/.test(part))continue;
  const suffix=part.endsWith("_f")?"_f":"";
  const base=part.slice(0,part.length-suffix.length);
  const back=base+"_back"+suffix;
  if(!catalog.isPart(back))continue;
  for(const dir of ["ne","nw"])if(views?.[dir]){
   if(!row.masters?.[back]?.[dir])changes.push({from:part,to:back,dir,data:views[dir]});
  }
 }
 if(!changes.length)return {moved:0,remainingCorrections:0};
 let remaining=0;
 writeRow(id,record=>{
  const masters=JSON.parse(JSON.stringify(record.masters||{}));
  for(const ch of changes){
   masters[ch.to]={...(masters[ch.to]||{}),[ch.dir]:ch.data};
   delete masters[ch.from][ch.dir];
  }
  record.masters=masters;record.status="draft";
  remaining=Object.entries(record.corrections||{}).reduce((n,[part,flags])=>
   n+(/^top\//.test(part)&&!/_back(?:_f)?$/.test(part)?
    Object.keys(flags||{}).filter(k=>/\|(ne|nw)\|/.test(k)).length:0),0);
  record.backViewRepair={moved:changes.length,at:now(),remainingCorrections:remaining};
 });
 return {moved:changes.length,remainingCorrections:remaining};
}
function setGenerated(id,part,png,detail){
 if(!C()?.isPart(part)||typeof png!=="string"||!png.startsWith("data:image/png;base64,")||png.length>9000000)throw Error("Invalid generated V6P sheet");
 return writeRow(id,row=>{row.parts={...(row.parts||{}),[part]:png};
  row.generated={...(row.generated||{}),[part]:{...(detail||{}),at:now()}};
  row.status="draft";
 });
}
function markDerived(id,part,views){const all=read(),i=all.findIndex(x=>x.id===id);if(i<0)throw Error("Unknown character");all[i].derived={...(all[i].derived||{}),[part]:views};write(all)}
return Object.freeze({KEY,SELECTED,FORMAT,starter,list,get,create,update,getPart,setPart,resetPart,master,setMaster,markCorrection,isCorrection,clearCorrection,setGenerated,repairTopBackMasters,markDerived,selected,select});
});
