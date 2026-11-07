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
  faceId:source?.faceId||"",parts:source?{...source.parts}:{},derived:source?{...source.derived}:{},
  origin:source?.id||"base",status:"draft",updated:new Date().toISOString()};
 const all=read();all.push(row);write(all);select(id);return row;
}
function update(id,patch){
 const all=read(),index=all.findIndex(x=>x.id===id);if(index<0)throw Error("Unknown character");
 const old=all[index],row={...old,name:patch.name!==undefined?(text(patch.name)||old.name):old.name,
  appearance:patch.appearance&&typeof patch.appearance==="object"?{...old.appearance,...patch.appearance}:old.appearance,
  faceId:patch.faceId!==undefined?text(patch.faceId,100):old.faceId,
  status:patch.status||old.status,updated:new Date().toISOString()};
 all[index]=row;write(all);return row;
}
function getPart(id,part){const row=get(id);return row?.parts?.[part]||null}
function setPart(id,part,dataUrl){
 if(!C()?.isPart(part))throw Error("Unknown V6P part "+part);
 if(typeof dataUrl!=="string"||!dataUrl.startsWith("data:image/png;base64,")||dataUrl.length>9000000)throw Error("PNG layer required");
 const all=read(),i=all.findIndex(x=>x.id===id);if(i<0)throw Error("Unknown character");
 all[i].parts={...(all[i].parts||{}),[part]:dataUrl};all[i].updated=new Date().toISOString();write(all);return all[i];
}
function resetPart(id,part){const all=read(),i=all.findIndex(x=>x.id===id);if(i<0)throw Error("Unknown character");const parts={...all[i].parts};delete parts[part];all[i].parts=parts;write(all)}
function markDerived(id,part,views){const all=read(),i=all.findIndex(x=>x.id===id);if(i<0)throw Error("Unknown character");all[i].derived={...(all[i].derived||{}),[part]:views};write(all)}
return Object.freeze({KEY,SELECTED,FORMAT,starter,list,get,create,update,getPart,setPart,resetPart,markDerived,selected,select});
});
