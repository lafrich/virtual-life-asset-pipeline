/* User-made v6p projects: accessories, custom clips, and a live index of part edits.
   Never writes into the 133-part whitelist or stock media/v6p files. */
(function(root,factory){"use strict";const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.V6PProjectCatalog=api;})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(root){"use strict";
const KEY="vl-v6p-project-catalog-v1";
const FORMAT="v6p-project-catalog-v1";
const SEMESTA_CLIPS=Object.freeze(["idle","walk","talk","sit","lie","sleep","custom"]);
const SHEET_ONLY=Object.freeze(["sit_type","tired","swim","float","perch"]);
function catalog(){return (root&&root.V6PPartCatalog)||(typeof require==="function"?require("./v6p-part-catalog.js"):null);}
function overrides(){return (root&&root.V6PPartOverrides)||null;}
function storage(){try{return root&&root.localStorage;}catch{return null;}}
function now(){return new Date().toISOString();}
function slug(name){
 const s=String(name||"item").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,24);
 return s||"item";
}
function validId(id){return typeof id==="string"&&/^[a-z][a-z0-9_]{0,47}$/i.test(id);}
function cleanName(name){
 const n=String(name||"").trim().replace(/\s+/g," ").slice(0,48);
 if(!n)throw Error("Project needs a name");
 return n;
}
function emptyStore(){return {format:FORMAT,items:[]};}
function readStore(){
 const raw=storage()?.getItem(KEY);
 if(!raw)return emptyStore();
 try{
  const obj=JSON.parse(raw);
  if(!obj||obj.format!==FORMAT||!Array.isArray(obj.items))return emptyStore();
  return {format:FORMAT,items:obj.items.filter(it=>it&&validId(it.id)&&(it.type==="accessory"||it.type==="clip"))};
 }catch{return emptyStore();}
}
function writeStore(store){
 const s=storage();
 if(!s)throw Error("localStorage unavailable");
 s.setItem(KEY,JSON.stringify({format:FORMAT,items:store.items}));
}
function list(){return readStore().items.map(it=>({...it}));}
function get(id){return list().find(it=>it.id===id)||null;}
function create(opts){
 const type=opts&&opts.type;
 if(type!=="accessory"&&type!=="clip")throw Error("Project type must be accessory or clip");
 const name=cleanName(opts.name||(type==="accessory"?"Aksesoris baru":"Clip baru"));
 const placement=type==="accessory"?((opts.placement==="back")?"back":"front"):null;
 const id=(opts.id&&validId(opts.id))?opts.id:((type==="accessory"?"acc":"clp")+"_"+slug(name)+"_"+Date.now().toString(36));
 if(get(id))throw Error("Project id already exists");
 const item={
  id,type,name,placement,
  sheetDataUrl:opts.sheetDataUrl||"",
  thumbDataUrl:opts.thumbDataUrl||"",
  paintedActions:Array.isArray(opts.paintedActions)?opts.paintedActions.slice():[],
  frameMs:Number.isInteger(opts.frameMs)&&opts.frameMs>=40&&opts.frameMs<=800?opts.frameMs:140,
  saveStatus:"local",
  driveFile:null,
  createdAt:now(),updatedAt:now(),
  note:type==="accessory"?
   "Transparent accessory layer · painted frames only · no auto-animation":
   "Custom painted clip · painted frames only · no auto-animation"
 };
 const store=readStore();
 store.items.unshift(item);
 writeStore(store);
 return {...item};
}
function update(id,patch){
 const store=readStore();
 const i=store.items.findIndex(it=>it.id===id);
 if(i<0)throw Error("Unknown project "+id);
 const cur=store.items[i];
 const next={...cur,...patch,id:cur.id,type:cur.type};
 if(patch&&patch.name)next.name=cleanName(patch.name);
 if(cur.type==="accessory"&&patch&&(patch.placement==="front"||patch.placement==="back"))
  next.placement=patch.placement;
 if(patch&&Array.isArray(patch.paintedActions))next.paintedActions=patch.paintedActions.slice();
 next.updatedAt=now();
 store.items[i]=next;
 writeStore(store);
 return {...next};
}
function saveSheet(id,dataUrl,meta){
 if(typeof dataUrl!=="string"||dataUrl.indexOf("data:image/png;base64,")!==0)
  throw Error("Project sheet must be a PNG data URL");
 if(dataUrl.length>9000000)throw Error("Project PNG too large for localStorage");
 return update(id,{
  sheetDataUrl:dataUrl,
  thumbDataUrl:meta&&meta.thumbDataUrl||"",
  paintedActions:meta&&Array.isArray(meta.paintedActions)?meta.paintedActions:[],
  saveStatus:(meta&&meta.saveStatus)||"local"
 });
}
function markDrive(id,info){
 return update(id,{saveStatus:"drive",driveFile:info||null});
}
function remove(id){
 const store=readStore();
 store.items=store.items.filter(it=>it.id!==id);
 writeStore(store);
}
function compatibility(item){
 const C=catalog();
 const painted=Array.isArray(item&&item.paintedActions)?item.paintedActions:[];
 const semestaMissing=SEMESTA_CLIPS.filter(a=>a!=="custom"&&!painted.includes(a));
 const extraOnSheet=painted.filter(a=>SHEET_ONLY.includes(a));
 const lines=[];
 if(item&&item.type==="accessory"){
  lines.push("Any v6p appearance");
  lines.push(item.placement==="back"?"Z back · behind body (like hair_back)":"Z front · above hair (like glasses)");
 }else if(item&&item.type==="clip"){
  lines.push("Custom clip project · not a stock animation");
 }
 lines.push(painted.length?"Painted: "+painted.join(", "):"No painted frames yet");
 if(semestaMissing.length)lines.push("Unpainted Semesta clips: "+semestaMissing.join(", "));
 if(extraOnSheet.length)lines.push("Sheet-only (not consumed by Semesta): "+extraOnSheet.join(", "));
 lines.push("Follows painted frames only · no auto-animation");
 return lines.join(" · ");
}
function editorUrl(item,opts){
 const u=(opts&&opts.base)||"./pixel-editor.html";
 const params=new URLSearchParams();
 params.set("source","v6p");
 if(item&&(item.type==="accessory"||item.type==="clip")) params.set("project",item.id);
 else if(item&&item.part) params.set("part",item.part);
 if(opts&&opts.action) params.set("action",opts.action);
 if(opts&&opts.dir) params.set("dir",opts.dir);
 if(opts&&opts.frame!=null) params.set("frame",String(opts.frame));
 return u+(u.indexOf("?")>=0?"&":"?")+params.toString();
}
function partEditEntries(){
 const C=catalog(),O=overrides();
 if(!C||!O||typeof O.list!=="function")return [];
 return O.list().map(part=>{
  const row=O.get(part);
  return {
   id:"edit_"+part.replaceAll("/","__"),
   type:"part-edit",
   origin:"user",
   name:part,
   part,
   placement:null,
   sheetDataUrl:row&&row.dataUrl||"",
   thumbDataUrl:"",
   paintedActions:[],
   saveStatus:"local",
   driveFile:null,
   updatedAt:row&&row.updatedAt||"",
   compatibility:"Local override of stock "+part+" · original media/v6p file untouched until Drive ingest",
   openUrl:editorUrl({part})
  };
 });
}
function builtinEntries(){
 const C=catalog();
 if(!C)return [];
 return C.PARTS.filter(part=>!C.isCustomWear?.(part)).map(part=>({
  id:"stock_"+part.replaceAll("/","__"),
  type:"part",
  origin:"built-in",
  name:part,
  part,
  placement:null,
  sheetDataUrl:"",
  thumbDataUrl:"",
  paintedActions:[],
  saveStatus:"stock",
  driveFile:null,
  updatedAt:"",
  compatibility:"Built-in whitelist part · open to edit a local override · never overwritten by user projects",
  openUrl:editorUrl({part})
 }));
}
function entries(opts){
 const includeBuiltIn=!!(opts&&opts.includeBuiltIn);
 const user=list().map(it=>({
  ...it,
  origin:"user",
  part:null,
  compatibility:compatibility(it),
  openUrl:editorUrl(it)
 }));
 const edits=partEditEntries();
 return includeBuiltIn?user.concat(edits,builtinEntries()):user.concat(edits);
}
return Object.freeze({
 KEY,FORMAT,SEMESTA_CLIPS,SHEET_ONLY,
 list,get,create,update,saveSheet,markDrive,remove,
 compatibility,editorUrl,entries,partEditEntries,builtinEntries
});
});
