/* Google Drive controls for the Mahluk Hidup 2 character root editor.
 * This file intentionally does NOT load Emotion Studio or alter Semesta.
 * No cloud write occurs until Google grants explicit user consent.
 */
(function(window){"use strict";
const D=window.MH2DriveSync,A=window.MH2DriveAdapter;
const $=id=>document.getElementById(id);
let loaded=new Map(),masterFile=null,working=false,autoSyncing=false,assetSaveTimer=null;
const SYNC_KEY="mh2-drive-sync-metadata-v2";
function syncState(){try{return JSON.parse(localStorage.getItem(SYNC_KEY)||"{}")}catch{return {}}}
function writeSyncState(data){try{localStorage.setItem(SYNC_KEY,JSON.stringify(data))}catch(e){console.warn("MH2 cloud tracking unavailable",e)}}
function digest(record){
 const value=JSON.stringify(record,(k,v)=>
  ["driveModifiedTime","driveFileId","updatedAt","savedAt","createdAt","cloudSyncHash"].includes(k)?undefined:v);
 let hash=2166136261;for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619);
 return String(hash>>>0)+":"+value.length;
}
function markSynced(id,remote,record){
 const data=syncState();data[id]={id:remote.id,modifiedTime:remote.modifiedTime,hash:digest(record)};
 writeSyncState(data);
}

function message(msg,error=false){
 const el=$("driveStatus");if(el){el.textContent=msg;el.style.color=error?"#ffb4b4":"#9fe2bc"}
 A?.setStatus?.(msg,!error);
}
function updateButtons(){
 const on=!!D?.connected();
 for(const id of ["driveLoadLibrary","driveSaveRoot","driveLoadMaster","driveSaveMaster","driveSaveAllAssets","driveRestoreAllAssets","driveDisconnect"]){
  if($(id))$(id).disabled=!on;
 }
 if($("driveConnect"))$("driveConnect").textContent=on?"✓ DRIVE CONNECTED / RECONNECT":"☁ CONNECT GOOGLE DRIVE";
 if($("driveClientId"))$("driveClientId").value=D?.getClient()||"";
 if(!on)message("DRIVE NOT CONNECTED · LOCAL SAVE STILL WORKS");
}
async function refresh(){
 if(!D?.connected())throw Error("Connect Google Drive first");
 message("AUTO-LOADING DRIVE CHARACTERS + MASTER + ASSET LIBRARY ...");
 const result=await D.loadAll();
 loaded=new Map(result.records.map(r=>[r.id,r]));
 masterFile=result.master||null;
 A.updateCloudRecords(result.records);
 if(!autoSyncing)await autoReconcile(result);
 return result;
}
async function autoReconcile(result){
 if(autoSyncing)return;
 autoSyncing=true;
 let imported=0,uploaded=0,conflicts=0,failed=0;
 try{
  const local=new Map(A.localSavedRoots().map(x=>[x.id,x])),meta=syncState();
  for(const cloud of result.records){
   const own=local.get(cloud.id),prior=meta[cloud.id];
   try{
    if(!own){
     A.importCloudRoot(cloud);markSynced(cloud.id,cloud,cloud);imported++;continue;
    }
    const equal=digest(own)===digest(cloud);
    if(equal){markSynced(cloud.id,cloud,own);continue}
    if(prior&&prior.hash===digest(own)&&prior.modifiedTime!==cloud.driveModifiedTime){
     // Keep any in-progress edit open; never change its backing record behind the editor.
     if(A.activeIdentifier?.()===cloud.id){conflicts++;continue}
     A.importCloudRoot(cloud,{overwrite:true});markSynced(cloud.id,cloud,cloud);imported++;continue;
    }
    if(prior&&prior.modifiedTime===cloud.driveModifiedTime&&prior.hash!==digest(own)){
     if(await uploadRoot(own))uploaded++;else failed++;
     continue;
    }
    conflicts++;
   }catch(e){failed++;console.warn("MH2 character auto-load failure",cloud.id,e)}
  }
  for(const record of local.values()){
   if(loaded.has(record.id))continue;
   if(await uploadRoot(record))uploaded++;else failed++;
  }
  // Open/import the user's full native + custom asset library automatically.
  try{
   const archive=await D.loadLibrary();
   if(archive){
    cloudLibraryFile=archive.file;
    const r=A.restoreLibraryAssets(archive.snapshot);imported+=r.added;
    const current=A.librarySnapshot();
    if(digest(current)!==digest(archive.snapshot)){
     const updated=await D.saveLibrary(current,archive.file.modifiedTime);
     cloudLibraryFile=updated;uploaded++;
    }
   }else if(A.ready()){
    cloudLibraryFile=await D.saveLibrary(A.librarySnapshot());uploaded++;
   }
  }catch(error){failed++;console.warn("MH2 full library auto sync",error)}
  try{
   const own=A.localMaster();
   if(masterFile){
    const remote=await D.loadMaster(masterFile),prior=syncState()["#master"];
    if(!own||digest(own)===digest(remote.doc)){
     if(!own)A.importCloudMasterQuiet(remote.doc);
     markSynced("#master",masterFile,remote.doc);if(!own)imported++;
    }else if(prior&&prior.hash===digest(own)&&prior.modifiedTime!==masterFile.modifiedTime){
     A.importCloudMasterQuiet(remote.doc);
     markSynced("#master",masterFile,remote.doc);imported++;
    }else if(prior&&prior.modifiedTime===masterFile.modifiedTime&&prior.hash!==digest(own)){
     if(await uploadMaster(own))uploaded++;else failed++;
    }else conflicts++;
   }else if(D.validMaster(own)){
    if(await uploadMaster(own))uploaded++;else failed++;
   }
  }catch(error){failed++;console.warn("MH2 Master Rig auto-load",error)}
  message("✓ AUTO SYNC · "+imported+" DOWNLOADED · "+uploaded+" UPLOADED · "+
   conflicts+" CONFLICT(S) · "+failed+" ERRORS"+(conflicts?" · COMPARE LOCAL/DRIVE BEFORE OVERWRITING":""),
   !!(conflicts||failed));
 }finally{autoSyncing=false}
}
async function connect(){
 if(working)return;
 working=true;$("driveConnect").disabled=true;
 try{
  if(!D||!A)throw Error("Drive / editor script unavailable");
  const requested=$("driveClientId").value.trim();
  if(requested&&requested!==D.getClient())D.configure(requested);
  message("OPENING GOOGLE SIGN-IN ...");
  // User event must directly trigger requestAccessToken to allow Google popup.
  await D.connect();
  updateButtons();
  window.dispatchEvent(new CustomEvent("mahluk2:drive-connected"));
  await refresh();
 }catch(e){message("DRIVE CONNECT FAILED · "+e.message,true)}
 finally{working=false;$("driveConnect").disabled=false;updateButtons()}
}
async function uploadRoot(record){
 if(!D?.connected()||!record||!D.validCharacter(record))return false;
 try{
  message("SAVING ROOT "+record.name+" TO DRIVE ...");
  const known=loaded.get(record.id),prior=syncState()[record.id];
  if(known&&(!prior||prior.id!==known.driveFileId||prior.modifiedTime!==known.driveModifiedTime))
   throw Error("CONFLICT: remote character changed or has never been reconciled. Refresh the library first.");
  const result=await D.saveCharacter(record,known?.driveModifiedTime||null);
  const cloud={...record,driveFileId:result.file.id,driveModifiedTime:result.file.modifiedTime};
  loaded.set(record.id,cloud);
  markSynced(record.id,cloud,record);
  A.updateCloudRecords([...loaded.values()]);
  message("✓ ROOT "+record.name+" SAVED TO GOOGLE DRIVE · PC / HP");
  return true;
 }catch(error){
  message("LOCAL ROOT KEPT · DRIVE SAVE FAILED: "+error.message,true);
  return false;
 }
}
async function uploadMaster(doc){
 if(!D?.connected()||!D.validMaster(doc))return false;
 try{
  message("SAVING MASTER RIG + PIXEL PLANES TO DRIVE ...");
  const prior=syncState()["#master"];
  if(masterFile&&(!prior||prior.id!==masterFile.id||prior.modifiedTime!==masterFile.modifiedTime))
   throw Error("CONFLICT: remote Master Rig version has not been reconciled");
  const result=await D.saveMaster(doc,masterFile?.modifiedTime||null);
  masterFile={id:result.file.id,name:"master-rig.json",modifiedTime:result.file.modifiedTime};
  markSynced("#master",masterFile,doc);
  message("✓ MASTER RIG v"+doc.revision+" SAVED TO GOOGLE DRIVE · FOUR VIEWS");
  return true;
 }catch(error){message("LOCAL MASTER KEPT · DRIVE SAVE FAILED: "+error.message,true);return false}
}
function saveRoot(){
 if(!D?.connected()){message("CONNECT GOOGLE DRIVE FIRST",true);return}
 if(!A?.ready()){message("MAHLUK 2 ROOT ART NOT READY",true);return}
 // Existing editor saves locally then emits the safe root-saved-for-cloud event.
 A.saveRoot();
}
async function saveMaster(){
 if(!D?.connected()){message("CONNECT GOOGLE DRIVE FIRST",true);return}
 const doc=A.localMaster();
 if(!doc){message("SAVE AS GENERAL DEFAULT RIG LOCALLY FIRST",true);return}
 await uploadMaster(doc);
}

let cloudLibraryFile=null;
async function saveEntireCharacterLibrary(){
 if(!D?.connected()){message("CONNECT GOOGLE DRIVE FIRST",true);return}
 if(working)return;
 working=true;
 $("driveSaveAllAssets").disabled=true;$("driveRestoreAllAssets").disabled=true;
 let saved=0,failed=[];
 try{
  if(!A.ready())throw Error("Character source catalog is still loading");
  const roots=A.localSavedRoots();
  const snapshot=A.librarySnapshot();
  message("BACKING UP "+roots.length+" SAVED ROOTS + NATIVE CHARACTER SOURCE MANIFEST...");
  // The index includes all built-in actors + native rig reference, custom imported
  // accessories/emotions and all authored character IDs.
  const indexFile=await D.saveLibrary(snapshot,cloudLibraryFile?.modifiedTime||null);
  cloudLibraryFile=indexFile;saved++;
  if(D.validMaster(A.localMaster())){
   if(await uploadMaster(A.localMaster()))saved++;else failed.push("Master Rig");
  }
  for(let i=0;i<roots.length;i++){
   const record=roots[i];
   if(await uploadRoot(record))saved++;else failed.push(record.name||record.id);
   message("ASSET LIBRARY "+(i+1)+"/"+roots.length+" SAVED ROOTS · "+saved+" CLOUD FILES");
  }
  message("✓ ALL CHARACTER LIBRARY · NATIVE SOURCE INDEX + "+
   snapshot.customAssets.length+" IMPORTED FACE/ACCESSORY ASSETS + "+
   roots.length+" CUSTOM ROOTS · "+saved+" FILES SAVED"+
   (failed.length?" · FAILED: "+failed.slice(0,3).join(", "):""),!!failed.length);
 }catch(e){message("SAVE ALL CHARACTER ASSETS FAILED: "+e.message,true)}
 finally{working=false;$("driveSaveAllAssets").disabled=false;$("driveRestoreAllAssets").disabled=false}
}
async function restoreEntireCharacterLibrary(){
 if(!D?.connected()){message("CONNECT GOOGLE DRIVE FIRST",true);return}
 if(working)return;
 working=true;$("driveRestoreAllAssets").disabled=true;
 try{
  const archive=await D.loadLibrary();
  if(!archive){message("NO CHARACTER ASSET LIBRARY BACKUP YET · SAVE ALL ASSETS ON PC FIRST",true);return}
  if(!window.confirm("Restore character accessory/face assets saved in Google Drive? "+
   "Your original native characters already load from the published catalog; existing local custom assets are preserved."))return;
  const result=A.restoreLibraryAssets(archive.snapshot);
  cloudLibraryFile=archive.file;
  await refresh();
  message("✓ CHARACTER LIBRARY OPENED · "+loaded.size+" DRIVE ROOTS · "+
   result.added+" IMPORTED PIXEL ASSETS ADDED · "+result.skipped+" ALREADY PRESENT · "+
   "NATIVE CHARACTER SOURCE CATALOG AVAILABLE · LOAD MASTER SEPARATELY IF NEEDED");
 }catch(error){message("RESTORE CHARACTER LIBRARY FAILED: "+error.message,true)}
 finally{working=false;$("driveRestoreAllAssets").disabled=false}
}


function scheduleAssetLibraryAutoSave(){
 if(assetSaveTimer)clearTimeout(assetSaveTimer);
 if(!D.connected())return;
 assetSaveTimer=setTimeout(async()=>{
  assetSaveTimer=null;
  try{
   if(!A.ready())return;
   message("AUTO-SAVING IMPORTED CHARACTER ACCESSORIES TO DRIVE...");
   const snapshot=A.librarySnapshot();
   const result=await D.saveLibrary(snapshot,cloudLibraryFile?.modifiedTime||null);
   cloudLibraryFile=result;
   message("✓ ALL CHARACTER ASSETS AUTO-SAVED TO GOOGLE DRIVE");
  }catch(error){
   message("CHARACTER ASSET LIBRARY LOCAL BACKUP SAFE · CLOUD SYNC ERROR: "+error.message,true);
  }
 },2600);
}

async function loadMaster(){
 if(!D?.connected()){message("CONNECT GOOGLE DRIVE FIRST",true);return}
 try{
  if(!masterFile)await refresh();
  if(!masterFile){message("NO CLOUD MASTER RIG FOUND",true);return}
  const item=await D.loadMaster(masterFile);
  if(!window.confirm("Load Drive MASTER v"+(item.doc.revision||"?")+
   "? This replaces the current editor root pose, hierarchy and 4-view plane overrides. Save current changes first."))return;
  A.applyMasterFromDrive(item.doc);
  masterFile={...masterFile,modifiedTime:item.driveModifiedTime};
  message("✓ DRIVE MASTER LOADED · PIVOTS, BONES AND 4-VIEW PIXELS");
 }catch(error){message("LOAD MASTER FAILED · "+error.message,true)}
}
function disconnect(){
 D?.disconnect();loaded.clear();masterFile=null;cloudLibraryFile=null;A?.updateCloudRecords([]);
 updateButtons();message("DRIVE DISCONNECTED · LOCAL ROOTS AND MASTER UNCHANGED");
}
function init(){
 if(!D||!A){message("DRIVE CONNECTOR UNAVAILABLE · LOCAL ROOT EDITOR STILL WORKS",true);return}
 $("driveClientId").value=D.getClient();
 $("driveConnect").onclick=connect;
 $("driveDisconnect").onclick=disconnect;
 $("driveLoadLibrary").onclick=()=>refresh().catch(e=>message("DRIVE READ FAILED: "+e.message,true));
 $("driveSaveRoot").onclick=saveRoot;
 $("driveSaveMaster").onclick=saveMaster;
 $("driveLoadMaster").onclick=loadMaster;
 $("driveSaveAllAssets").onclick=saveEntireCharacterLibrary;
 $("driveRestoreAllAssets").onclick=restoreEntireCharacterLibrary;
 window.addEventListener("mahluk2:root-saved-for-cloud",event=>{
  if(D.connected())void uploadRoot(event.detail?.record);
 });
 window.addEventListener("mahluk2:master-saved-for-cloud",event=>{
  if(D.connected())void uploadMaster(event.detail?.doc);
 });
 window.addEventListener("mahluk2:asset-library-edited",()=>{
  if(D.connected())scheduleAssetLibraryAutoSave();
 });
 updateButtons();
}
document.addEventListener("DOMContentLoaded",init);
})(window);
