/* Dedicated Genesis master cloud storage.
 * Uses only its OWN Membangun / Mahluk Hidup / Genesis Masters folder.
 * No migration, deletion or reads of historical Mahluk/Animation records.
 */
(function(root){"use strict";
const CLIENT="369223065433-idbuhhj6akuf2cmo6vpbiblkhu019csn.apps.googleusercontent.com";
const API="https://www.googleapis.com/drive/v3/files",UPLOAD="https://www.googleapis.com/upload/drive/v3/files";
const DIR=["Membangun","Mahluk Hidup","Genesis Masters"];
const ID=/^lafrich_genesis_(?:male|female)$/;
let token="",expiry=0,parent="",connection=null;
const baselines=new Map(); // exact SHA of master last read by THIS browser session
const connected=()=>Boolean(token)&&Date.now()+60000<expiry;
const q=s=>String(s).replace(/\\/g,"\\\\").replace(/'/g,"\\'");
async function request(url,init={}){
 if(!connected())throw Error("Google Drive connection is missing or expired");
 const h=new Headers(init.headers||{});h.set("Authorization","Bearer "+token);
 const r=await fetch(url,{...init,headers:h,cache:"no-store"});
 if(!r.ok){let message="";try{message=(await r.json())?.error?.message||""}catch{}
  throw Error("Google Drive "+r.status+": "+message)}
 return r;
}
async function hash(str){
 const bytes=new TextEncoder().encode(str),digest=await crypto.subtle.digest("SHA-256",bytes);
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
}
async function find(folder,name,mime){
 const params=new URLSearchParams({q:"'"+q(folder)+"' in parents and name = '"+q(name)+"' and mimeType = '"+mime+"' and trashed = false",
  pageSize:"100",fields:"files(id,name,mimeType),nextPageToken"});
 let page="",found=null;
 do{
  if(page)params.set("pageToken",page);
  const payload=await(await request(API+"?"+params)).json();
  found=(payload.files||[])[0]||null;
  if(found)return found;
  page=payload.nextPageToken||"";
 }while(page);
 return null;
}
async function folder(){
 if(parent)return parent;
 let current="root";
 for(const segment of DIR){
  const mime="application/vnd.google-apps.folder";
  const existing=await find(current,segment,mime);
  if(existing)current=existing.id;
  else{
   const created=await(await request(API+"?fields=id",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name:segment,parents:[current],mimeType:mime})
   })).json();
   if(!created?.id)throw Error("Could not create Genesis Masters folder");
   current=created.id;
  }
 }
 parent=current;return current;
}
async function connect(){
 if(connected())return true;
 if(connection)return connection;
 const auth=root.google?.accounts?.oauth2;
 if(!auth?.initTokenClient)throw Error("Google OAuth unavailable; try Chrome or reload");
 connection=new Promise((resolve,reject)=>{
  try{auth.initTokenClient({
   client_id:CLIENT,scope:"https://www.googleapis.com/auth/drive.file",include_granted_scopes:true,
   callback:r=>{
    if(r.error||!r.access_token){reject(Error(r.error_description||r.error||"Connection refused"));return}
    token=r.access_token;expiry=Date.now()+(Number(r.expires_in)||3500)*1000;parent="";baselines.clear();
    resolve(true);
   },error_callback:e=>reject(Error(e?.message||e?.type||"Google sign in closed"))
  }).requestAccessToken({prompt:""});}catch(e){reject(e)}
 }).finally(()=>{connection=null});
 return connection;
}
function validate(id,master){
 if(!ID.test(String(id||"")))throw Error("Only canonical LGR-1 Male/Female masters are accepted");
 const gender=id.endsWith("_female")?"female":"male";
 const source="genesis_"+gender+"_nude",b=master?.binding;
 if(master?.format!=="lafrich-genesis-master-v1"||master.id!==id||
    master.gender!==gender||master.sourceId!==source||master.faceSource!=="emosi.exe"||
    master.rigFormat!=="LGR-1"||
    b?.format!=="lafrich-genesis-binding-v1"||b.id!==id||
    b.gender!==gender||b.sourceId!==source||b.faceSource!=="emosi.exe"||
    b.rigFormat!=="LGR-1"||
    b.originalNative!=="V6B")throw Error("Legacy/foreign master rejected: LGR-1 only");
 const core=root?.LafrichPuppetCore;
 if(!core?.validateMaster)throw Error("LGR-1 rig validator unavailable");
 const rig=core.validateMaster(b.rig);
 if(rig.id!==core.IDS[gender]||rig.gender!==gender)throw Error("Wrong V6B rig base");
 if(JSON.stringify(master).length>10000000)throw Error("Genesis master too large");
 if(!Number.isFinite(Date.parse(master.approvedAt||"")))
  throw Error("LGR-1 approval timestamp required");
 for(const d of ["se","sw","ne","nw"])for(const part of core.PARTS)
  if(b.reviewed?.[d+"|"+part]!==true)
   throw Error("Unreviewed LGR-1 body part: "+d+" / "+part);
 const dirs=["se","sw","ne","nw"];
 if(b.frame?.width!==64||b.frame?.height!==112||
    JSON.stringify(b.frame.directions)!==JSON.stringify(dirs)||
    JSON.stringify(b.hierarchy?.parts)!==JSON.stringify(core.PARTS)||
    JSON.stringify(b.hierarchy?.parents)!==JSON.stringify(core.PARENTS)||
    JSON.stringify(b.hierarchy?.drawOrder)!==JSON.stringify(core.DRAW_ORDER)||
    Object.keys(b.views||{}).sort().join()!==dirs.slice().sort().join())
  throw Error("LGR-1 geometry contract incomplete");
 for(const d of dirs){
  const view=b.views[d];
  if(view?.maskBase64!==rig.masks[d]||
     JSON.stringify(view?.pivots)!==JSON.stringify(rig.pivots[d])||
     !/^data:image\/png;base64,[a-z0-9+/]+=*$/i.test(view?.spritePng||""))
   throw Error("LGR-1 source/mask/pivot mismatch: "+d);
 }
}
function fileName(id){if(!ID.test(String(id||"")))throw Error("Invalid Genesis master ID");return id+".json"}
async function load(id){
 const folderId=await folder(),file=await find(folderId,fileName(id),"application/json");
 if(!file)return null;
 const content=await(await request(API+"/"+encodeURIComponent(file.id)+"?alt=media")).text();
 if(content.length>15000000)throw Error("Genesis cloud master too large");
 const outer=JSON.parse(content);
 if(outer.schema!=="lafrich-genesis-cloud-v1"||outer.id!==id||
  outer.sha256!==await hash(JSON.stringify(outer.master)))throw Error("Genesis cloud integrity error");
 validate(id,outer.master);
 return outer.master;
}
async function createAndWrite(parentId,name,data){
 const created=await(await request(API+"?fields=id",{method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({name,parents:[parentId],mimeType:"application/json"})
 })).json();
 if(!created?.id)throw Error("Could not create Drive version "+name);
 await request(UPLOAD+"/"+encodeURIComponent(created.id)+"?uploadType=media",{
  method:"PATCH",headers:{"Content-Type":"application/json; charset=UTF-8"},body:data
 });
 return created.id;
}
async function acknowledgeLoadedMaster(id,master){
 validate(id,master);
 // Called only AFTER the user confirms a cloud master replaces their draft.
 baselines.set(id,await hash(JSON.stringify(master)));
}
async function save(id,master){
 validate(id,master);
 const parentId=await folder(),name=fileName(id),data=JSON.stringify(master);
 const newSha=await hash(data);
 const outer=JSON.stringify({schema:"lafrich-genesis-cloud-v1",id,sha256:newSha,master});
 let file=await find(parentId,name,"application/json");
 if(file){
  // Fail closed on unreviewed or stale cloud revisions. Never blindly overwrite.
  const original=await(await request(API+"/"+encodeURIComponent(file.id)+"?alt=media")).text();
  const stored=JSON.parse(original);
  if(stored.schema!=="lafrich-genesis-cloud-v1"||stored.id!==id||
     stored.sha256!==await hash(JSON.stringify(stored.master)))
   throw Error("Existing cloud master is corrupt. No overwrite performed.");
  if(!baselines.has(id)||baselines.get(id)!==stored.sha256)
   throw Error("DRIVE CONFLICT: this browser has not loaded the current master version. " +
    "Export your local draft, load cloud master, compare, then save. Nothing overwritten.");
  // Immutable snapshot before replacing canonical name: rollback remains possible.
  const archive=id+".history."+new Date().toISOString().replace(/[:.]/g,"-")+
   "."+stored.sha256.slice(0,12)+".json";
  await createAndWrite(parentId,archive,original);
  await request(UPLOAD+"/"+encodeURIComponent(file.id)+"?uploadType=media",{
   method:"PATCH",headers:{"Content-Type":"application/json; charset=UTF-8"},body:outer
  });
 }else{
  file={id:await createAndWrite(parentId,name,outer)};
 }
 const verified=await load(id);
 if(!verified||await hash(JSON.stringify(verified))!==newSha)
  throw Error("Drive read-back does not match this exact master upload");
 baselines.set(id,newSha);
 return {id,fileId:file.id,verified:true,historyPreserved:true};
}
const DRAFT_FORMAT="lgr-1-cloud-draft-v1";
function validateDraft(id,record){
 if(!ID.test(String(id||""))||!record||typeof record!=="object"||!record.rig)
  throw Error("Invalid LGR-1 draft");
 const gender=id.endsWith("_female")?"female":"male";
 const core=root?.LafrichPuppetCore;
 if(!core?.validateMaster)throw Error("LGR-1 rig validator unavailable");
 const rig=core.validateMaster(record.rig);
 if(rig.id!==core.IDS[gender]||rig.gender!==gender)throw Error("Draft base gender mismatched");
 if(record.bound&&(
    record.bound.format!=="lafrich-genesis-binding-v1"||
    record.bound.id!==id||record.bound.sourceId!=="genesis_"+gender+"_nude"))
  throw Error("Foreign binding in LGR draft");
 if(JSON.stringify(record).length>10000000)throw Error("LGR draft too large");
 return record;
}
async function saveDraft(id,record){
 validateDraft(id,record);
 const folderId=await folder();
 const raw=JSON.stringify(record),digest=await hash(raw);
 const name=id+".draft."+new Date().toISOString().replace(/[:.]/g,"-")+
  "."+digest.slice(0,10)+".json";
 const outer=JSON.stringify({schema:DRAFT_FORMAT,id,sha256:digest,record});
 const fileId=await createAndWrite(folderId,name,outer);
 const content=await(await request(API+"/"+encodeURIComponent(fileId)+"?alt=media")).text();
 const actual=JSON.parse(content);
 if(actual.schema!==DRAFT_FORMAT||actual.id!==id||
  actual.sha256!==digest||await hash(JSON.stringify(actual.record))!==digest)
  throw Error("Draft read-back mismatch; revision not verified");
 return {id,fileId,name,verified:true};
}
async function listDrafts(id){
 if(!ID.test(String(id||"")))throw Error("Invalid draft gender");
 const parentId=await folder();
 const params=new URLSearchParams({
  q:"'"+q(parentId)+"' in parents and name contains '"+q(id+".draft.")+
   "' and mimeType = 'application/json' and trashed = false",
  fields:"nextPageToken,files(id,name,createdTime)",pageSize:"100",orderBy:"createdTime desc"
 });
 const results=[];let cursor="";
 do{
  if(cursor)params.set("pageToken",cursor);
  const result=await(await request(API+"?"+params)).json();
  results.push(...(result.files||[]).filter(f=>f.name.startsWith(id+".draft.")));
  cursor=result.nextPageToken||"";
 }while(cursor&&results.length<300);
 return results.sort((a,b)=>String(b.createdTime||"").localeCompare(String(a.createdTime||"")));
}
async function loadDraft(id,fileId){
 if(!ID.test(String(id||"")))throw Error("Invalid draft gender");
 const versions=await listDrafts(id);
 const file=fileId?versions.find(f=>f.id===fileId):versions[0];
 if(!file)throw Error("No LGR-1 cloud draft revisions for "+id);
 const body=await(await request(API+"/"+encodeURIComponent(file.id)+"?alt=media")).text();
 if(body.length>15000000)throw Error("Cloud draft too large");
 const value=JSON.parse(body);
 if(value.schema!==DRAFT_FORMAT||value.id!==id||
  value.sha256!==await hash(JSON.stringify(value.record)))
  throw Error("Cloud draft checksum mismatch");
 validateDraft(id,value.record);
 return {record:value.record,name:file.name,fileId:file.id};
}
root.VLGenesisCloud=Object.freeze({connect,connected,save,load,acknowledgeLoadedMaster,saveDraft,listDrafts,loadDraft});
})(window);
