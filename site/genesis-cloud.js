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
    token=r.access_token;expiry=Date.now()+(Number(r.expires_in)||3500)*1000;parent="";
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
    (master.rigFormat!==undefined&&master.rigFormat!=="LGR-1")||
    b?.format!=="lafrich-genesis-binding-v1"||b.id!==id||
    b.gender!==gender||b.sourceId!==source||b.faceSource!=="emosi.exe"||
    (b.rigFormat!==undefined&&b.rigFormat!=="LGR-1")||
    b.originalNative!=="V6B")throw Error("Legacy/foreign master rejected: LGR-1 only");
 const core=root?.LafrichPuppetCore;
 if(!core?.validateMaster)throw Error("LGR-1 rig validator unavailable");
 const rig=core.validateMaster(b.rig);
 if(rig.id!==core.IDS[gender]||rig.gender!==gender)throw Error("Wrong V6B rig base");
 if(JSON.stringify(master).length>10000000)throw Error("Genesis master too large");
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
async function save(id,master){
 validate(id,master);
 const parentId=await folder(),name=fileName(id),data=JSON.stringify(master);
 const outer=JSON.stringify({schema:"lafrich-genesis-cloud-v1",id,
  sha256:await hash(data),master});
 let file=await find(parentId,name,"application/json");
 if(!file){
  file=await(await request(API+"?fields=id",{method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({name,parents:[parentId],mimeType:"application/json"})
  })).json();
 }
 if(!file?.id)throw Error("Cannot create Genesis master file");
 await request(UPLOAD+"/"+encodeURIComponent(file.id)+"?uploadType=media",{
  method:"PATCH",headers:{"Content-Type":"application/json; charset=UTF-8"},body:outer
 });
 const verified=await load(id);
 if(!verified||await hash(JSON.stringify(verified))!==await hash(data))
  throw Error("Drive read-back does not match this exact master upload");
 return {id,fileId:file.id,verified:true};
}
root.VLGenesisCloud=Object.freeze({connect,connected,save,load});
})(window);
