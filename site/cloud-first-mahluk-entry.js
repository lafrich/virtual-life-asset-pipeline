/* Mahluk Hidup native Drive-first startup. No browser-data deletion.
 * Uses verified Mahluk Online Database, not separate Universal Trial folder.
 * Emosi.exe is a separate Drive-native editor with its own cloud connection.
 */
(function(root){"use strict";
// LGR-1 PERMANENT RETIREMENT: keep code as historical archive ONLY.
// No init, character writes, background sync, event handlers or storage mutation.
return;
 function init(){
  // Recovery-only compatibility route for the previous workspace and its tests.
  // No storage is modified by selecting legacy mode.
  if(new URLSearchParams(root.location?.search||"").get("legacyCloud")==="1"){
   for(const id of ["drive-save","drive-load"]){
    const btn=document.getElementById(id);if(btn){btn.hidden=false;btn.style.display="";}
   }
   return;
  }
  const U=root.MembangunUniversal,Gate=root.MembangunCloudStartup,D=root.VLMahlukHubDrive;
  if(!U||!Gate||!D)throw Error("Mahluk cloud modules not ready");
  const KINDS=["character","action","animation"];
  const row=(kind,data)=>({app:"mahluk",kind,id:data.id,data});
  async function records(){
   if(!D.connected())throw Error("Connect Google Drive first");
   const groups=await Promise.all(KINDS.map(kind=>D.listRecords(kind)));
   return groups.flatMap((entries,i)=>entries.map(item=>row(KINDS[i],item)));
  }
  function announce(){
   for(const id of ["character-frame","action-frame","motion-frame"]){
    const frame=document.getElementById(id);
    if(frame?.contentWindow)frame.contentWindow.postMessage({type:"mahluk:cloud-connected"},location.origin);
   }
  }
  const adapter={
   async connect(){if(!D.connected())await D.connect()},
   async loadAll(){
    const rows=await records();
    return {verified:true,records:rows,count:rows.length};
   },
   async upload(incoming){
    if(incoming.app!=="mahluk"||!KINDS.includes(incoming.kind)||incoming.data.id!==incoming.id)
     throw Error("Invalid Mahluk import record");
    const existing=await D.loadRecord(incoming.kind,incoming.id);
    if(existing){
     if(await U.hash(existing)!==incoming.sha256)
      throw Error("CLOUD CONFLICT: "+incoming.id+" already has a different Drive version. Nothing overwritten.");
     return {verified:true,unchanged:true};
    }
    const receipt=await D.saveRecord(incoming.kind,incoming.id,incoming.data);
    if(receipt.verified!==true)throw Error("Drive did not verify "+incoming.id);
    return receipt;
   },
   async readback(incoming){const data=await D.loadRecord(incoming.kind,incoming.id);
    if(!data)throw Error("Drive record missing after upload");
    return row(incoming.kind,data);
   },
   async apply(){announce()},
   async exportRows(){return records()},
   async cleanup(){/* Intentional: no localStorage/IndexedDB clearing. */}
  };
  const gate=Gate.mount({app:"mahluk",adapter,onReady:async()=>{
   announce();
   const tools=document.querySelector(".sync-tools");
   if(!tools)return;
   const status=document.createElement("span");status.textContent="✓ DRIVE VERIFIED";
   status.style.cssText="font:10px Tahoma;color:#174d39;align-self:center";
   const exportBtn=document.createElement("button");exportBtn.textContent="↓ UNIVERSAL";exportBtn.type="button";
   exportBtn.title="Download verified Character, Action and Animation Drive records";
   exportBtn.onclick=async()=>{
    exportBtn.disabled=true;status.textContent="EXPORTING...";
    try{await gate.exportUniversal();status.textContent="✓ UNIVERSAL EXPORTED"}
    catch(e){status.textContent="EXPORT FAILED: "+e.message}
    finally{exportBtn.disabled=false}
   };
   const again=document.createElement("button");again.type="button";again.textContent="↻ SYNC NOW";
   again.onclick=async()=>{again.disabled=true;status.textContent="SYNCING...";
    try{await adapter.loadAll();announce();status.textContent="✓ DRIVE REFRESHED"}
    catch(e){status.textContent="SYNC FAILED: "+e.message}finally{again.disabled=false}};
   tools.prepend(status,again,exportBtn);
   document.getElementById("drive-connect").textContent="☁ CONNECTED";
   document.getElementById("help").textContent="DRIVE ONLINE · EXISTING BROWSER DATA PRESERVED";
  }});
  root.MahlukCloudEntry=Object.freeze({gate,adapter});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{try{init()}catch(e){console.error(e)}});
 else try{init()}catch(e){console.error(e)}
})(window);