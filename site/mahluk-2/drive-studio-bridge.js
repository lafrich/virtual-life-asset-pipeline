/* Google Drive controls for the Mahluk Hidup 2 character root editor.
 * This file intentionally does NOT load Emotion Studio or alter Semesta.
 * No cloud write occurs until Google grants explicit user consent.
 */
(function(window){"use strict";
const D=window.MH2DriveSync,A=window.MH2DriveAdapter;
const $=id=>document.getElementById(id);
let loaded=new Map(),masterFile=null,working=false;
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
 message("LOADING GOOGLE DRIVE ROOTS + MASTER ...");
 const result=await D.loadAll();
 loaded=new Map(result.records.map(x=>[x.id,x]));
 masterFile=result.master||null;
 A.updateCloudRecords(result.records);
 message("✓ GOOGLE DRIVE READY · "+loaded.size+" ROOT(S) · "+
  (masterFile?"MASTER RIG AVAILABLE":"NO MASTER SAVED")+
  (result.errors.length?" · "+result.errors.length+" invalid file(s) skipped":""));
 return result;
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
  const known=loaded.get(record.id);
  const result=await D.saveCharacter(record,known?.driveModifiedTime||null);
  const cloud={...record,driveFileId:result.file.id,driveModifiedTime:result.file.modifiedTime};
  loaded.set(record.id,cloud);
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
  const result=await D.saveMaster(doc,masterFile?.modifiedTime||null);
  masterFile={id:result.file.id,name:"master-rig.json",modifiedTime:result.file.modifiedTime};
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
  const prior=await D.loadLibrary();
  const indexFile=await D.saveLibrary(snapshot,prior?.file?.modifiedTime||null);
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
 updateButtons();
}
document.addEventListener("DOMContentLoaded",init);
})(window);
