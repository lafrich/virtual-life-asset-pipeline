/* Mahluk Hidup 2.0 — standalone Google Drive persistence.
 * OAuth scope is drive.file, limited to app-created data. Access tokens stay in RAM.
 * Only character roots & master rig are stored; no Emotion Studio or Semesta sync.
 */
(function(root,factory){"use strict";const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.MH2DriveSync=api;})(typeof window!=="undefined"?window:null,function(root){
"use strict";
const CLIENT_DEFAULT="369223065433-idbuhhj6akuf2cmo6vpbiblkhu019csn.apps.googleusercontent.com";
const CLIENT_STORAGE="mh2-google-drive-client-v1";
const SCOPE="https://www.googleapis.com/auth/drive.file",ROOT="Membangun",CHILD="Mahluk Hidup 2";
const API="https://www.googleapis.com/drive/v3/files",UPLOAD="https://www.googleapis.com/upload/drive/v3/files";
const FOLDER="application/vnd.google-apps.folder",ROOT_FORMAT="mahluk-2-character-v1",MASTER_FORMAT="mahluk-2-general-rig-v1";
let clientId=CLIENT_DEFAULT,token="",expires=0,folderId="";
try{const stored=root?.localStorage?.getItem(CLIENT_STORAGE);if(stored)clientId=stored}catch{}
const connected=()=>!!token&&Date.now()+60000<expires;
function getClient(){return clientId}
function configure(s){
 const v=String(s||"").trim();
 if(!/^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(v))throw Error("Invalid OAuth Web Client ID");
 clientId=v;token="";expires=0;folderId="";
 try{root.localStorage.setItem(CLIENT_STORAGE,v)}catch{}
 return v;
}
function disconnect(){token="";expires=0;folderId=""}
async function connect(){
 if(!root?.google?.accounts?.oauth2?.initTokenClient)throw Error("Google login belum siap. Buka di Chrome dan reload.");
 const result=await new Promise((resolve,reject)=>{
  try{root.google.accounts.oauth2.initTokenClient({
   client_id:clientId,scope:SCOPE,include_granted_scopes:true,
   callback:r=>{
    if(r?.error||!r?.access_token)return reject(Error(r?.error_description||r?.error||"Google sign-in not authorized"));
    if(root.google.accounts.oauth2.hasGrantedAllScopes&&!root.google.accounts.oauth2.hasGrantedAllScopes(r,SCOPE))
     return reject(Error("Izin Google Drive belum diberikan"));
    resolve(r);
   },
   error_callback:e=>reject(Error(e?.message||e?.type||"Google popup cancelled"))
  }).requestAccessToken({prompt:""});
  }catch(e){reject(e)}
 });
 token=result.access_token;expires=Date.now()+1000*(Number(result.expires_in)||3500);
 return {connected:true,clientId,scope:SCOPE};
}
async function request(url,options={}){
 if(!connected())throw Error("Sesi Google Drive tidak aktif. Klik Connect Drive.");
 const headers=new Headers(options.headers||{});headers.set("Authorization","Bearer "+token);
 const res=await fetch(url,{...options,headers,cache:"no-store"});
 if(!res.ok){let msg="Drive HTTP "+res.status;try{const data=await res.json();msg+=": "+(data?.error?.message||"")}catch{}
  if(res.status===401){disconnect()}throw Error(msg)}
 return res;
}
const qstr=s=>String(s).replace(/\\/g,"\\\\").replace(/'/g,"\\'");
async function search(parent,where=""){
 let pageToken="",files=[];
 do{const qs=new URLSearchParams({q:"'"+qstr(parent)+"' in parents and trashed = false"+(where?" and "+where:""),
  fields:"nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,appProperties,size)",pageSize:"1000"});
  if(pageToken)qs.set("pageToken",pageToken);
  const result=await(await request(API+"?"+qs)).json();files.push(...(result.files||[]));pageToken=result.nextPageToken||"";
 }while(pageToken);return files;
}
async function folder(parent,name){
 const old=(await search(parent,"mimeType = '"+FOLDER+"' and name = '"+qstr(name)+"'"))[0];
 if(old)return old.id;
 const r=await request(API+"?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({name,parents:[parent],mimeType:FOLDER})});
 return (await r.json()).id;
}
async function ensureLibrary(){
 if(folderId)return folderId;
 const rootFolder=await folder("root",ROOT);folderId=await folder(rootFolder,CHILD);return folderId;
}
const filename=id=>id+".character.json";
function validCharacter(x){return x?.format===ROOT_FORMAT&&typeof x.id==="string"&&/^mh2_[a-z0-9]+$/.test(x.id)&&
 typeof x.name==="string"&&x.model&&x.rest&&x.tracks&&x.rigRules&&x.pixelPlanes&&
 typeof x.sprite==="string"&&x.sprite.startsWith("data:image/png;base64,")}
function validMaster(x){return x?.format===MASTER_FORMAT&&x.rules&&x.defaultParts&&x.pixelPlanes&&typeof x.savedAt==="string"}
async function list(){
 const files=await search(await ensureLibrary());
 return {characters:files.filter(f=>/^mh2_[a-z0-9]+\.character\.json$/.test(f.name)),master:files.find(f=>f.name==="master-rig.json")||null,folderId};
}
async function upload(meta,content,existing){
 if(existing){
  const r=await request(UPLOAD+"/"+encodeURIComponent(existing.id)+"?uploadType=media&fields=id,name,modifiedTime",{method:"PATCH",
   headers:{"Content-Type":"application/json"},body:content});return r.json();
 }
 const boundary="mh2_"+Math.random().toString(36).slice(2),body=new Blob([
  "--"+boundary+"\r\nContent-Type: application/json; charset=utf-8\r\n\r\n",
  JSON.stringify(meta),"\r\n--"+boundary+"\r\nContent-Type: application/json; charset=utf-8\r\n\r\n",
  content,"\r\n--"+boundary+"--"
 ],{type:"multipart/related; boundary="+boundary});
 const r=await request(UPLOAD+"?uploadType=multipart&fields=id,name,modifiedTime",{method:"POST",
  headers:{"Content-Type":"multipart/related; boundary="+boundary},body});return r.json();
}
async function saveCharacter(record,expectedModifiedTime=null){
 if(!validCharacter(record))throw Error("Invalid Mahluk Hidup 2 root record");
 const folderId=await ensureLibrary(),files=await search(folderId,"name = '"+filename(record.id)+"'");
 const old=files[0]||null;
 if(old&&(!expectedModifiedTime||expectedModifiedTime!==old.modifiedTime))
  throw Error("Character exists on Drive or was updated elsewhere. LOAD DRIVE LIBRARY before overwriting.");
 const data={...record};delete data.driveFileId;delete data.driveModifiedTime;
 const file=await upload({name:filename(record.id),mimeType:"application/json",parents:[folderId],
  appProperties:{application:"mahluk-hidup-2",kind:"character-root",characterId:record.id}},
  JSON.stringify(data),old);
 return {file,folderId};
}
async function saveMaster(doc,expectedModifiedTime=null){
 if(!validMaster(doc))throw Error("No valid Master Rig saved. Save General Default first.");
 const folderId=await ensureLibrary(),files=await search(folderId,"name = 'master-rig.json'"),old=files[0]||null;
 if(old&&(!expectedModifiedTime||old.modifiedTime!==expectedModifiedTime))
  throw Error("Master Rig changed on another device; reload Drive first.");
 const file=await upload({name:"master-rig.json",mimeType:"application/json",parents:[folderId],
  appProperties:{application:"mahluk-hidup-2",kind:"general-master"}},
  JSON.stringify(doc),old);
 return {file,folderId};
}
async function download(file){if(!file?.id)throw Error("Drive file not found");
 return(await request(API+"/"+encodeURIComponent(file.id)+"?alt=media")).json()}
async function loadCharacter(file){
 const record=await download(file);
 if(!validCharacter(record))throw Error("Invalid remote Mahluk Hidup 2 root: "+file?.name);
 return {...record,driveFileId:file.id,driveModifiedTime:file.modifiedTime};
}
async function loadMaster(file){
 const doc=await download(file);if(!validMaster(doc))throw Error("Invalid remote Master Rig");
 return {doc,driveFileId:file.id,driveModifiedTime:file.modifiedTime};
}
async function loadAll(){
 const manifest=await list(),records=[],errors=[];
 for(let i=0;i<manifest.characters.length;i+=3){
  const chunk=manifest.characters.slice(i,i+3);
  const results=await Promise.all(chunk.map(f=>loadCharacter(f).catch(e=>{errors.push(f.name+": "+e.message);return null})));
  records.push(...results.filter(Boolean));
 }
 return {records,master:manifest.master,folderId:manifest.folderId,errors};
}

/* Read Emotion Studio's own Drive folder (read-only). Same OAuth Web client / drive.file grant.
 * No edits to Emotion Studio and no character-to-game sync.
 */
async function loadEmotionDatabase(){
 if(!connected())throw Error("Connect Google Drive to browse the Emotion Studio database");
 const roots=await search("root","mimeType = '"+FOLDER+"' and name = '"+qstr(ROOT)+"'");
 if(!roots.length)return {entries:[],errors:[],reason:"Folder Membangun belum ada"};
 const folders=await search(roots[0].id,"mimeType = '"+FOLDER+"' and name = 'Emotion Studio'");
 if(!folders.length)return {entries:[],errors:[],reason:"Emotion Studio belum menyimpan project ke Drive"};
 const files=(await search(folders[0].id)).filter(x=>x.name.endsWith(".emotion.json"));
 const entries=[],errors=[];
 for(let i=0;i<files.length;i+=4){
  const results=await Promise.all(files.slice(i,i+4).map(async file=>{
   try{
    const p=await download(file);
    if(p.format!=="mahluk-2-universal-emotions-v1"||
       JSON.stringify(p.cell)!=="[64,112]"||
       JSON.stringify(p.directions)!=='["se","sw","ne","nw"]'||
       !Array.isArray(p.entries)||p.entries.length!==1)throw Error("Incompatible emotion project format");
    const e=p.entries[0];
    if(!e||!/^[-a-z0-9_]{1,64}$/.test(e.id)||!Number.isInteger(e.frames)||
       e.frames<1||e.frames>48||
       (!e.png&&!e.template))throw Error("Invalid emotion entry");
    return e;
   }catch(error){errors.push(file.name+": "+error.message);return null}
  }));
  entries.push(...results.filter(Boolean));
 }
 return {entries,errors,folderId:folders[0].id};
}

/* Back up every existing Character Library record and its native source manifest.
 * Original published pixels continue to resolve to their first-party pipeline
 * source; user-authored PNG data is stored in full inside custom records. */
async function ensureAssetLibrary(){
 const parent=await ensureLibrary();
 return folder(parent,"Asset Library");
}
function validLibrary(snapshot){
 return snapshot&&snapshot.format==="mahluk-2-asset-library-v1"&&
 snapshot.id==="mahluk-2-all-v1"&&Array.isArray(snapshot.characters)&&
 Array.isArray(snapshot.published)&&Array.isArray(snapshot.customAssets)&&
 snapshot.characters.length<=300&&snapshot.published.length<=5000&&snapshot.customAssets.length<=100&&
 (snapshot.manifest===null||typeof snapshot.manifest==="object");
}
async function saveLibrary(snapshot,expectedModifiedTime=null){
 if(!validLibrary(snapshot))throw Error("Character asset library snapshot incomplete or invalid");
 const parent=await ensureAssetLibrary();
 const existing=(await search(parent,"name = 'mahluk-2-asset-library.json'"))[0]||null;
 if(existing&&(!expectedModifiedTime||existing.modifiedTime!==expectedModifiedTime))
  throw Error("Drive library exists or was updated. LOAD LIBRARY first to avoid overwriting.");
 const contents=JSON.stringify({...snapshot,savedAt:new Date().toISOString()});
 const file=await upload({name:"mahluk-2-asset-library.json",mimeType:"application/json",
  parents:[parent],appProperties:{application:"mahluk-hidup-2",kind:"asset-library"}},
  contents,existing);
 return file;
}
async function loadLibrary(){
 const parent=await ensureAssetLibrary();
 const file=(await search(parent,"name = 'mahluk-2-asset-library.json'"))[0]||null;
 if(!file)return null;
 const snapshot=await download(file);
 if(!validLibrary(snapshot))throw Error("Invalid Mahluk 2 Asset Library on Drive");
 return {file,snapshot};
}
return Object.freeze({CLIENT_DEFAULT,SCOPE,ROOT,CHILD,connected,getClient,configure,connect,disconnect,ensureLibrary,list,saveCharacter,saveMaster,loadCharacter,loadMaster,loadAll,loadEmotionDatabase,ensureAssetLibrary,saveLibrary,loadLibrary,validLibrary,validCharacter,validMaster});
});
