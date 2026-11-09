/* Membangun Drive storage — copied from virtual-office/world-builder/drive-sync.js
 * and extended for Mahluk Hidup v6p part sheets.
 * Same public Google OAuth Web Client ID (drive.file). OAuth tokens are never persisted.
 */
(function(root,factory){"use strict";const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.MembangunCloudDrive=api;})(typeof window!=="undefined"?window:null,function(root){
"use strict";
const CLIENT_ID="369223065433-idbuhhj6akuf2cmo6vpbiblkhu019csn.apps.googleusercontent.com";
const SCOPE="https://www.googleapis.com/auth/drive.file";
const API="https://www.googleapis.com/drive/v3/files",UPLOAD="https://www.googleapis.com/upload/drive/v3/files";
const FOLDER="application/vnd.google-apps.folder",ROOT="Membangun",FORMAT="membangun-cloud-1";
const APPS={semesta:{folder:"Semesta",kind:"city"},bangun:{folder:"Bangun Ruang",kind:"building"},mahluk:{folder:"Mahluk Hidup",kind:"v6pPart"}};
const KEY="membangun-google-client-id-v1";
const ASSET_KINDS=new Set(["assetCatalog","assetBuilding","assetObject"]);
const ASSET_FORMAT="semesta-asset-library-v1";
let client=CLIENT_ID,token="",expires=0,folders={};
try{const id=root?.localStorage?.getItem(KEY);if(id)client=id}catch{}
function getClient(){return client}
function connected(){return !!token&&Date.now()+60000<expires}
function configure(value){
 const s=String(value||"").trim();
 if(!/^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(s))throw Error("Invalid Google OAuth Web Client ID");
 client=s;token="";expires=0;folders={};
 try{root.localStorage.setItem(KEY,s)}catch{}
}
function disconnect(){token="";expires=0;folders={}}
async function connect(){
 const oauth=root?.google?.accounts?.oauth2;
 if(!oauth?.initTokenClient)throw Error("Google Sign-In belum siap. Reload lewat Chrome.");
 const granted=await new Promise((resolve,reject)=>{
  try{oauth.initTokenClient({client_id:client,scope:SCOPE,include_granted_scopes:true,
   callback:r=>{if(r?.error||!r?.access_token){reject(Error(r?.error_description||r?.error||"Sign-In rejected"));return}
    if(oauth.hasGrantedAllScopes&&!oauth.hasGrantedAllScopes(r,SCOPE)){reject(Error("Google Drive permission not granted"));return}
    resolve(r)},
   error_callback:e=>reject(Error(e?.message||e?.type||"Popup closed"))
  }).requestAccessToken({prompt:""});}
  catch(e){reject(e)}
 });
 token=granted.access_token;expires=Date.now()+1000*(Number(granted.expires_in)||3500);folders={};
 return true;
}
async function request(url,options={}){
 if(!connected())throw Error("Google Drive session expired. Reconnect.");
 const headers=new Headers(options.headers||{});headers.set("Authorization","Bearer "+token);
 const res=await fetch(url,{...options,headers,cache:"no-store"});
 if(!res.ok){let message="Drive HTTP "+res.status;
  try{const obj=await res.json();message+=": "+(obj?.error?.message||"unknown")}catch{}
  if(res.status===401)disconnect();
  throw Error(message)}
 return res;
}
const quote=s=>String(s).replace(/\\/g,"\\\\").replace(/'/g,"\\'");
async function search(parent,filter=""){
 let files=[],next="";
 do{const q=new URLSearchParams({q:"'"+quote(parent)+"' in parents and trashed=false"+(filter?" and "+filter:""),
  fields:"nextPageToken,files(id,name,mimeType,modifiedTime,appProperties,webViewLink,size)",pageSize:"1000"});
  if(next)q.set("pageToken",next);
  const data=await(await request(API+"?"+q)).json();files.push(...(data.files||[]));next=data.nextPageToken||"";
 }while(next);
 return files;
}
async function ensureFolder(parent,name){
 const arr=await search(parent,"mimeType = '"+FOLDER+"' and name = '"+quote(name)+"'");
 if(arr[0])return arr[0].id;
 const r=await request(API+"?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({name,mimeType:FOLDER,parents:[parent]})});
 return (await r.json()).id;
}
async function folder(app,kind=null){
 if(!APPS[app])throw Error("Unknown app: "+app);
 if(ASSET_KINDS.has(kind)){
  const key=app+"Assets";
  if(folders[key])return folders[key];
  folders[key]=await ensureFolder(await folder(app),"Asset Library");
  return folders[key];
 }
 if(folders[app])return folders[app];
 const top=await ensureFolder("root",ROOT);
 folders[app]=await ensureFolder(top,APPS[app].folder);
 return folders[app];
}
function safeId(value){
 const id=String(value||"").trim();
 if(!id||id.length>160||/[\u0000-\u001f]/.test(id))throw Error("Invalid document id");
 return id;
}
function filename(kind,id){return kind+"--"+encodeURIComponent(safeId(id))+".json"}
function validateRecord(app,kind,record){
 if(!APPS[app])throw Error("Unknown app");
 if(!record||typeof record!=="object")throw Error("Missing asset");
 if(!["city","building","object",...ASSET_KINDS].includes(kind))throw Error("Unsupported document kind");
 if(app==="semesta"){
  if(kind==="city"){
   if(record.format!=="vl-city-draft-1"||!Array.isArray(record.document?.objects))throw Error("Invalid Semesta city");
  }else if(kind==="assetCatalog"){
   if(record.format!==ASSET_FORMAT||!Array.isArray(record.entries)||record.entries.length>6000||
      record.entries.some(x=>!x||typeof x.file!=="string"||typeof x.id!=="string"||
       typeof x.source!=="string"))throw Error("Invalid Semesta Asset Library index");
  }else if(kind==="assetBuilding"){
   if(!/^br-[a-z0-9-]{1,72}$/.test(record.id)||!record.config||!record.views||
      !Object.values(record.views).some(v=>/^data:image\/png;base64,/.test(v?.url||"")))
    throw Error("Invalid custom building (missing native PNG views)");
  }else if(kind==="assetObject"){
   if(!/^obj-[a-z0-9-]{3,66}$/.test(record.id)||
      !["sw","se","ne","nw"].every(d=>/^data:image\/png;base64,/.test(record.views?.[d]?.url||"")))
    throw Error("Invalid custom Pixel Creator object");
  }else throw Error("Semesta cannot store this kind of asset");
 }else if(app==="bangun"){
  if(kind==="assetCatalog"){
   if(record.format!=="bangun-ruang-asset-library-v1"||!Array.isArray(record.entries)||
      record.entries.length>6000)throw Error("Invalid Bangun Ruang built-in asset catalog");
  }else if(!["building","object"].includes(kind))throw Error("Invalid Bangun Ruang asset kind");
  if(kind==="building"&&(!record.config||!record.views))throw Error("Invalid Bangun Ruang building");
  if(kind==="object"&&(!record.variants&&!record.views))throw Error("Invalid Bangun Ruang pixel object");
 }
 return safeId(record.id);
}
async function list(app,kind=null){
 const base=await folder(app,kind);
 const files=await search(base);
 return files.filter(f=>f.name.endsWith(".json")&&(!kind||f.name.startsWith(kind+"--")));
}
async function save(app,kind,record,knownFile=null){
 if(app==="mahluk")throw Error("Legacy Mahluk Drive writer retired; only dedicated LGR-1 master sync is active.");
 const id=validateRecord(app,kind,record),folderId=await folder(app,kind);
 const name=filename(kind,id),existing=(await search(folderId,"name = '"+quote(name)+"'"))[0]||null;
 if(existing&&(!knownFile?.id||knownFile.id!==existing.id||knownFile.modifiedTime!==existing.modifiedTime))
  throw Error("A newer Drive version exists. Reload Drive before overwriting "+record.name);
 const data=JSON.stringify({format:FORMAT,app,kind,id,record,savedAt:new Date().toISOString()});
 let file;
 if(existing){
  file=await (await request(UPLOAD+"/"+encodeURIComponent(existing.id)+"?uploadType=media&fields=id,name,modifiedTime",
   {method:"PATCH",headers:{"Content-Type":"application/json"},body:data})).json();
 }else{
  const boundary="mb_"+Math.random().toString(36).slice(2);
  const body=new Blob(["--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n",
   JSON.stringify({name,mimeType:"application/json",parents:[folderId],appProperties:{app,kind,recordId:id}}),
   "\r\n--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n",data,
   "\r\n--"+boundary+"--"],{type:"multipart/related; boundary="+boundary});
  file=await (await request(UPLOAD+"?uploadType=multipart&fields=id,name,modifiedTime",
   {method:"POST",headers:{"Content-Type":"multipart/related; boundary="+boundary},body})).json();
 }
 return {file,folderId};
}
async function load(file){
 if(!file?.id)throw Error("Select a Drive file");
 const payload=await(await request(API+"/"+encodeURIComponent(file.id)+"?alt=media")).json();
 if(payload?.format!==FORMAT||!APPS[payload.app]||!payload.id||!["city","building","object",...ASSET_KINDS].includes(payload.kind))
  throw Error("Unknown cloud format");
 validateRecord(payload.app,payload.kind,payload.record);
 if(payload.record.id!==payload.id)throw Error("Record identifier mismatch");
 return payload;
}

const PART_W=384,PART_H=4928;
const MAHLUK_APP="mahluk",PIXEL_EDITS_DIR="Pixel Edits";
const catalog=(root&&root.V6PPartCatalog)||(typeof require==="function"?require("./v6p-part-catalog.js"):null);
function partName(part){
 if(!catalog)throw Error("V6P part catalog not loaded");
 return catalog.filename(part);
}
async function pixelEditsFolder(){
 if(folders.mahlukPixelEdits)return folders.mahlukPixelEdits;
 const top=await ensureFolder("root",ROOT);
 const mahluk=await ensureFolder(top,APPS.mahluk.folder);
 folders.mahlukPixelEdits=await ensureFolder(mahluk,PIXEL_EDITS_DIR);
 return folders.mahlukPixelEdits;
}
function asBytes(png){
 if(png instanceof Uint8Array)return png;
 if(typeof Blob!=="undefined"&&png instanceof Blob)throw Error("Pass raw bytes or call saveV6pPart with arrayBuffer first");
 if(typeof png==="string"&&png.indexOf("data:image/png;base64,")===0){
  const bin=atob(png.split(",",2)[1]);const out=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);
  return out;
 }
 throw Error("Expected PNG bytes");
}
async function toBytes(png){
 if(typeof Blob!=="undefined"&&png instanceof Blob)return new Uint8Array(await png.arrayBuffer());
 return asBytes(png);
}
async function upsertBinary(name,mime,bytes,appProperties){
 const folderId=await pixelEditsFolder();
 const existing=(await search(folderId,"name = '"+quote(name)+"'"))[0]||null;
 const meta={name,mimeType:mime,appProperties};
 const boundary="mb_"+Math.random().toString(36).slice(2);
 const head="--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"+JSON.stringify(existing?{name,mimeType:mime,appProperties}:Object.assign({parents:[folderId]},meta))+"\r\n--"+boundary+"\r\nContent-Type: "+mime+"\r\n\r\n";
 const tail="\r\n--"+boundary+"--";
 const body=new Blob([head,bytes,tail],{type:"multipart/related; boundary="+boundary});
 const url=existing
  ?UPLOAD+"/"+encodeURIComponent(existing.id)+"?uploadType=multipart&fields=id,name,modifiedTime,appProperties,webViewLink"
  :UPLOAD+"?uploadType=multipart&fields=id,name,modifiedTime,appProperties,webViewLink";
 const file=await(await request(url,{method:existing?"PATCH":"POST",headers:{"Content-Type":"multipart/related; boundary="+boundary},body})).json();
 return {file,folderId,overwrote:!!existing};
}
async function saveV6pPart(opts){
 throw Error("V6P part-sheet upload retired. Only LGR-1 Genesis Masters may sync.");
 if(!connected())await connect();
 const part=catalog.normalizePart(opts&&opts.part);
 const sha=String(opts&&opts.sha256||"");
 if(!/^[0-9a-f]{64}$/.test(sha))throw Error("sha256 must be 64 hex chars");
 const bytes=await toBytes(opts.png);
 if((opts.width!=null&&Number(opts.width)!==PART_W)||(opts.height!=null&&Number(opts.height)!==PART_H))
  throw Error("v6p part sheets must be "+PART_W+"x"+PART_H+" RGBA");
 const props=catalog.appProperties(part,sha);
 const png=await upsertBinary(catalog.filename(part),"image/png",bytes,props);
 let json=null;
 if(opts.jsonText){
  const text=new TextEncoder().encode(String(opts.jsonText));
  json=await upsertBinary(catalog.sidecarName(part),"application/json",text,props);
 }
 return {png,json,part,filename:catalog.filename(part),appProperties:props,
  status:"Tersimpan ke Drive, akan masuk game otomatis"};
}

function userProjectFilename(type,id){
 if(type!=="accessory"&&type!=="clip")throw Error("User project type must be accessory or clip");
 if(typeof id!=="string"||!/^[a-z][a-z0-9_]{0,47}$/i.test(id))throw Error("Invalid project id");
 return "v6p-user--"+type+"__"+id+".png";
}
async function saveV6pUserProject(opts){
 throw Error("V6P user project upload retired. Only LGR-1 Genesis Masters may sync.");
 if(!connected())await connect();
 const type=opts&&opts.type,id=opts&&opts.id;
 const name=userProjectFilename(type,id);
 if(name.indexOf("v6p--")===0)throw Error("User projects must not use stock v6p-- filenames");
 const sha=String(opts&&opts.sha256||"");
 if(!/^[0-9a-f]{64}$/.test(sha))throw Error("sha256 must be 64 hex chars");
 const bytes=await toBytes(opts.png);
 if((opts.width!=null&&Number(opts.width)!==PART_W)||(opts.height!=null&&Number(opts.height)!==PART_H))
  throw Error("user project sheets must be "+PART_W+"x"+PART_H+" RGBA");
 const props={app:MAHLUK_APP,kind:"v6pUserProject",type:String(type),id:String(id),
  width:String(PART_W),height:String(PART_H),sha256:sha};
 const png=await upsertBinary(name,"image/png",bytes,props);
 let json=null;
 if(opts.jsonText){
  const text=new TextEncoder().encode(String(opts.jsonText));
  json=await upsertBinary(name.replace(/\.png$/,".project.json"),"application/json",text,props);
 }
 return {png,json,id,type,filename:name,appProperties:props,
  status:"Tersimpan ke Drive sebagai proyek pengguna · tidak menimpa aset stock"};
}

return Object.freeze({CLIENT_ID,SCOPE,APPS,FORMAT,ASSET_FORMAT,ASSET_KINDS,connected,getClient,configure,disconnect,connect,folder,list,save,load,filename,validateRecord,pixelEditsFolder,saveV6pPart,saveV6pUserProject,userProjectFilename,partName,PART_W,PART_H});
});
