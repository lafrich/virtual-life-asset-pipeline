/* Universal Drive Online Database for Membangun.
 * Same scope/origin as existing apps, separate cloud-first database.
 * Does NOT migrate old app stores or replace their save handlers by itself.
 */
(function(root,factory){"use strict";
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MembangunCloudFirstDrive=api;
})(typeof window!=="undefined"?window:null,function(root){"use strict";
 const CLIENT="369223065433-idbuhhj6akuf2cmo6vpbiblkhu019csn.apps.googleusercontent.com";
 const SCOPE="https://www.googleapis.com/auth/drive.file";
 const API="https://www.googleapis.com/drive/v3/files";
 const UP="https://www.googleapis.com/upload/drive/v3/files";
 const FOLDER="application/vnd.google-apps.folder";
 const STORE_FORMAT="membangun-cloud-record-v1";
 function create(app,options={}){
  const U=root?.MembangunUniversal;
  if(!U||!U.APPS.has(app))throw Error("Unknown cloud app or universal core missing");
  let token="",expiry=0,rootFolder="",versions=new Map(),state=[];
  const connected=()=>Boolean(token)&&Date.now()+60000<expiry;
  const esc=x=>String(x).replace(/\\/g,"\\\\").replace(/'/g,"\\'");
  async function request(url,opts={}){
   if(!connected())throw Error("Google Drive session expired; reconnect");
   const headers=new Headers(opts.headers||{});headers.set("Authorization","Bearer "+token);
   const res=await fetch(url,{...opts,headers,cache:"no-store"});
   if(!res.ok){let msg="Drive HTTP "+res.status;try{msg+=": "+(await res.json())?.error?.message}catch{}
    if(res.status===401){token="";expiry=0}
    throw Error(msg);
   }return res;
  }
  async function query(parent,name,mime){
   const q=new URLSearchParams({q:"'"+esc(parent)+"' in parents and trashed=false"+
    (name?" and name = '"+esc(name)+"'":"")+(mime?" and mimeType = '"+esc(mime)+"'":""),
    fields:"nextPageToken,files(id,name,version,modifiedTime,mimeType)",pageSize:"1000"});
   let all=[],cursor="";do{if(cursor)q.set("pageToken",cursor);
    const result=await (await request(API+"?"+q)).json();
    all.push(...(result.files||[]));cursor=result.nextPageToken||"";
   }while(cursor);return all;
  }
  async function ensure(parent,name){
   const prior=await query(parent,name,FOLDER);if(prior[0])return prior[0].id;
   const res=await request(API+"?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({parents:[parent],name,mimeType:FOLDER})});
   return (await res.json()).id;
  }
  async function appFolder(targetApp){
   if(!U.APPS.has(targetApp))throw Error("Unknown app "+targetApp);
   if(!rootFolder)rootFolder=await ensure(await ensure("root","Membangun"),"Universal Cloud v1");
   return ensure(rootFolder,targetApp);
  }
  function name(r){return encodeURIComponent(r.kind)+"--"+encodeURIComponent(r.id)+".json"}
  function recKey(r){return U.recordKey?U.recordKey(r):r.app+"/"+r.kind+"/"+r.id}
  async function connect(){
   if(connected())return true;
   const oauth=root.google?.accounts?.oauth2;
   if(!oauth?.initTokenClient)throw Error("Google Sign-In unavailable. Open in HTTPS Chrome.");
   const grant=await new Promise((resolve,reject)=>{
    oauth.initTokenClient({client_id:CLIENT,scope:SCOPE,include_granted_scopes:true,
     callback:r=>r?.access_token?resolve(r):reject(Error(r?.error_description||r?.error||"Google sign-in rejected")),
     error_callback:e=>reject(Error(e?.message||e?.type||"Google popup dismissed"))
    }).requestAccessToken({prompt:""});
   });
   token=grant.access_token;expiry=Date.now()+1000*(Number(grant.expires_in)||3500);
   rootFolder="";versions.clear();state=[];
   return true;
  }
  async function readFile(file,expectedApp){
   const raw=await (await request(API+"/"+encodeURIComponent(file.id)+"?alt=media")).text();
   if(new TextEncoder().encode(raw).length>25*1024*1024)throw Error("Oversized cloud record");
   const env=JSON.parse(raw),row=U.validate(env.row);
   if(env.format!==STORE_FORMAT||env.sha256!==await U.hash(row.data)||
      (expectedApp&&row.app!==expectedApp))throw Error("Cloud record integrity failure: "+file.name);
   if(file.name!==name(row))throw Error("Cloud record filename mismatch: "+file.name);
   return row;
  }
  async function upload(incoming){
   const row=U.validate(incoming),dir=await appFolder(row.app),filename=name(row);
   const matches=await query(dir,filename,"application/json");
   if(matches.length>1)throw Error("Duplicate cloud filenames; resolve the conflict manually: "+filename);
   const existing=matches[0]||null;
   const hash=await U.hash(row.data),key=recKey(row);
   if(existing){
    const previous=await readFile(existing,row.app);
    if(await U.hash(previous.data)===hash){
     versions.set(key,{id:existing.id,version:existing.version});return {verified:true,id:existing.id,unchanged:true};
    }
    const seen=versions.get(key);
    if(!seen||seen.id!==existing.id||seen.version!==existing.version)
     throw Error("CLOUD CONFLICT: newer or unreviewed Drive version for "+key);
   }
   const envelope=JSON.stringify({format:STORE_FORMAT,row,sha256:hash});
   let id=existing?.id;
   if(!id){
    // Atomic multipart creation avoids leaving empty JSON files on failed upload.
    const boundary="cf_"+Math.random().toString(36).slice(2);
    const metadata=JSON.stringify({name:filename,mimeType:"application/json",parents:[dir]});
    const body=new Blob(["--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n",
     metadata,"\r\n--"+boundary+"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n",
     envelope,"\r\n--"+boundary+"--"],{type:"multipart/related; boundary="+boundary});
    const result=await request(UP+"?uploadType=multipart&fields=id",{method:"POST",
     headers:{"Content-Type":"multipart/related; boundary="+boundary},body});
    id=(await result.json()).id;
   }else{
    await request(UP+"/"+encodeURIComponent(id)+"?uploadType=media",{method:"PATCH",
     headers:{"Content-Type":"application/json; charset=UTF-8"},body:envelope});
   }
   const data=await readFile({id,name:filename},row.app);
   if(await U.hash(data.data)!==hash)throw Error("Drive upload readback differs: "+key);
   const after=(await query(dir,filename,"application/json"))[0];
   versions.set(key,{id,version:after?.version||""});
   state=state.filter(r=>recKey(r)!==key);if(row.app===app)state.push(row);
   return {verified:true,id};
  }
  async function readback(row,receipt){
   const id=receipt?.id;if(!id)throw Error("Missing cloud upload receipt");
   return readFile({id,name:name(row)},row.app);
  }
  async function loadAll(){
   const files=await query(await appFolder(app),null,"application/json");
   const loaded=[],seen=new Set();
   for(const f of files){
    const row=await readFile(f,app),key=recKey(row);
    if(seen.has(key))throw Error("Duplicate cloud record "+key);
    seen.add(key);loaded.push(row);versions.set(key,{id:f.id,version:f.version});
   }
   state=loaded;return {verified:true,records:loaded,count:loaded.length};
  }
  async function apply(rows){
   if(typeof options.apply==="function")await options.apply(rows.filter(r=>r.app===app));
  }
  async function exportRows(){await loadAll();return state.slice()}
  async function cleanup(data){if(typeof options.cleanup==="function")await options.cleanup(data)}
  return Object.freeze({connect,connected,loadAll,upload,readback,apply,exportRows,cleanup});
 }
 return Object.freeze({CLIENT,SCOPE,STORE_FORMAT,create});
});