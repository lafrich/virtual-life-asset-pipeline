/* Lafrich Puppet live workspace: legacy editors archived, no user data deleted. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const ORIGIN=location.origin;
const URLS=Object.freeze({
 emotion:"/virtual-office/emotion-studio/",
 character:"./lafrich-puppet-studio.html?embedded=1&mode=character&rev=lafrich-nude-body-restore-1",
 action:"./lafrich-puppet-studio.html?embedded=1&mode=animation&rev=lafrich-nude-body-restore-1",
 animation:"./lafrich-puppet-studio.html?embedded=1&mode=animation&rev=lafrich-nude-body-restore-1",
 genesis:"./lafrich-puppet-studio.html?embedded=1&mode=master&rev=lafrich-nude-body-restore-1"
});
const FRAMES=Object.freeze({
 emotion:"emotion-frame",character:"character-frame",action:"action-frame",
 animation:"motion-frame",genesis:"genesis-frame"
});
const TAB_IDS=["emotion","character","animation","genesis","action"];
let tab="character";
const ephemeral=new Map();
const SESSION_KEYS=new Set(["vl-v6p-character-workflow-v1","vl-v6p-selected-character-v1",
 "vl-v6p-act-clips-v1","vl-mahluk-animation-anchor-poses-v1","mahluk-action-situations-v1"]);
const draftStorage=Object.freeze({
 getItem(key){
  if(ephemeral.has(key))return ephemeral.get(key);
  if(SESSION_KEYS.has(key)){
   const previous=localStorage.getItem(key);
   ephemeral.set(key,previous);
   return previous;
  }
  return localStorage.getItem(key);
 },
 setItem(key,value){ephemeral.set(key,String(value))},
 removeItem(key){ephemeral.set(key,null)},
 key(n){return [...ephemeral.keys()][n]||null},
 get length(){return ephemeral.size}
});
function announceOnline(target){
 const frame=$(target);
 try{
  if(frame?.contentWindow&&window.VLMahlukHubDrive?.connected())
   frame.contentWindow.postMessage({type:"mahluk:cloud-connected"},ORIGIN);
 }catch{}
}
function announceAllOnline(){
 for(const id of ["character-frame","action-frame","motion-frame","genesis-frame"])
  announceOnline(id);
}
function note(s){$("status-msg").textContent=String(s)}
function fixedUrl(value){
 try{const u=new URL(value,location.href);if(u.origin!==ORIGIN)throw Error("Outside Mahluk origin");
  if(!u.pathname.startsWith("/virtual-life-asset-pipeline/")||
    !u.pathname.endsWith("/pixel-editor.html"))throw Error("Only Mahluk Pixel Editor can open here");
  u.searchParams.set("embedded","1");return u.href;
 }catch{throw Error("Unrecognized Mahluk editor route")}
}
function loadFrame(id,url){
 const iframe=$(id);if(iframe&&!iframe.dataset.loaded){
  iframe.addEventListener("load",()=>announceOnline(id));
  iframe.src=new URL(url,location.href).href;iframe.dataset.loaded="1";
 }
 return iframe;
}
function setPane(){/* Animation is a single editor; no side-by-side pixel pane. */}
function show(name){
 if(!TAB_IDS.includes(name))name="character";
 tab=name;
 document.querySelectorAll("[data-tab]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tab===tab)));
 document.querySelectorAll(".view").forEach(p=>p.classList.toggle("active",p.id===tab+"-view"));
 loadFrame(FRAMES[tab],URLS[tab]);
 announceOnline(FRAMES[tab]);
 if(tab==="character")refreshCharacter();
 if(tab==="animation")setPane();
 const u=new URL(location.href);u.searchParams.set("tab",tab);
 history.replaceState(null,"",u.pathname+u.search+u.hash);
 note({emotion:"EMOSI.EXE · emotion database and dialog lipsync are the original editor",
 character:"LAFRICH CHARACTER · Four-view Custom Wear + Emosi · fitted to 10-piece puppet",
 action:"LAFRICH PYTHON MOTION · old Action legacy disabled",
 animation:"LAFRICH PYTHON ANIMATION · new database (zero stock animations) · 10-piece rig",
 genesis:"LAFRICH MASTER · fixed Lafrich Male/Female · four-view pixel art + 10-piece puppet rig"}[tab]);
}
function openEditor(value){
 const url=fixedUrl(value);
 // Clothing pixels remain scoped to Character; old Animation pixel editor removed.
 show("character");
 $("character-pixel-frame").src=url;
 $("character-pixel-overlay").hidden=false;
 note("Editing a character-local sprite · Back returns to Character");
}
async function closeCharacterPixel(){
 const overlay=$("character-pixel-overlay");
 if(!overlay||overlay.hidden)return;
 try{await $("character-pixel-frame")?.contentWindow?.VirtualLifePixelEditor?.flush?.()}
 catch(error){note("Pixel save failed: "+error.message);return}
 overlay.hidden=true;show("character");
}
async function closeAnimationPixel(){
 // Legacy Pixel Editor backlink safely closes through Character.
 await closeCharacterPixel();
}
function refreshCharacter(){
 const el=$("character-frame");try{el?.contentWindow?.postMessage({type:"mahluk:refresh-character"},ORIGIN)}catch{}
}
function newClip(){
  // Only the Motion Editor creates animations. Pixel Editor edits Custom Wear.
  show("animation");
  note("Lafrich Puppet: create a NEW Python motion. No stock animations are active.");
}
function openFull(){
 const url=$(FRAMES[tab]).src||new URL(URLS[tab],location.href).href;
 // Explicit user click only; OAuth/clipboard/phone fallback can run in a top-level window.
 window.open(url,"_blank","noopener,noreferrer");
}
function bind(){
 for(const btn of document.querySelectorAll("[data-tab]"))btn.onclick=()=>show(btn.dataset.tab);
 $("character-pixel-back").onclick=()=>void closeCharacterPixel();
 $("open-separate").onclick=openFull;
 window.addEventListener("message",e=>{
  if(e.origin!==ORIGIN||!e.data||typeof e.data!=="object")return;
  // Only permitted from our own embedded application frames.
  if(!Array.from(document.querySelectorAll("iframe")).some(f=>f.contentWindow===e.source))return;
  if(e.data.type==="genesis:master-overwritten"&&["male","female"].includes(e.data.gender)){
   for(const id of ["motion-frame","character-frame"]){
    try{$(id)?.contentWindow?.postMessage({type:"genesis:master-overwritten",gender:e.data.gender},ORIGIN)}catch{}
   }
   note("Historic Genesis master notification received; Lafrich Puppet is the active engine");
  }
  if(e.data.type==="lafrich:master-saved"&&["male","female"].includes(e.data.gender)){
   for(const id of ["character-frame","motion-frame"]){
    try{$(id)?.contentWindow?.postMessage({type:"lafrich:master-updated",gender:e.data.gender},ORIGIN)}catch{}
   }
   note("Lafrich "+e.data.gender+" master saved · Character and Animation will reload it");
  }
  if(e.data.type==="mahluk:open-editor"&&typeof e.data.url==="string"){
   try{openEditor(e.data.url)}catch(error){note("Editor link rejected: "+error.message)}
  }
  if(e.data.type==="mahluk:goto"&&TAB_IDS.includes(e.data.tab))show(e.data.tab);
  if(e.data.type==="mahluk:open-review"&&typeof e.data.id==="string"){
   show("animation");$("motion-frame").contentWindow?.postMessage({type:"mahluk:select-motion",id:e.data.id},ORIGIN);
  }
 });
 matchMedia("(max-width:850px)").addEventListener("change",()=>setPane());
 const drive=window.VLMahlukHubDrive;
 if(drive){
  $("drive-connect").onclick=async()=>{
   try{note("Connecting Google Drive…");await drive.connect();$("drive-save").disabled=false;$("drive-load").disabled=false;
    $("drive-connect").textContent="☁ CONNECTED";$("help").textContent="CLOUD ONLINE";
    note("Online Drive connected · loading gallery from cloud");announceAllOnline();
   }catch(e){note("Drive connection failed: "+e.message)}
  };
  $("drive-save").onclick=async()=>{
   try{note("Backing up Mahluk character/action/animation data…");const info=await drive.backup();
    note("Backup verified in Google Drive · "+info.keys+" record groups · "+info.name);
   }catch(e){note("Backup failed: "+e.message)}
  };
  $("drive-load").onclick=async()=>{
   if(!confirm("Restore the latest Mahluk backup from Google Drive? Existing local drafts will be kept as a separate backup first."))return;
   try{note("Restoring verified Mahluk snapshot…");const info=await drive.restore();
    note("RESTORE COMPLETE · "+info.keys+" record groups · reload editors to use restored changes");
    // Reload editors only after restore, to avoid stale in-memory state.
    for(const id of ["character-frame","action-frame","motion-frame"]){
     const f=$(id);if(f?.dataset.loaded==="1"&&f.src)f.contentWindow.location.reload();
    }
   }catch(e){note("Restore failed: "+e.message)}
  };
 }
}
async function syncDrive(){
 const drive=window.VLMahlukHubDrive;
 if(!drive?.connected())throw Error("Connect Google Drive from the Mahluk toolbar first");
 const result=await drive.backup();note("Drive verified · "+result.name);
 return result;
}
async function saveOnline(kind,id,record){
 const drive=window.VLMahlukHubDrive;
 if(!drive?.connected())throw Error("Connect Google Drive before Save Online. No data was saved.");
 return drive.saveRecord(kind,id,record);
}
async function listOnline(kind){
 const drive=window.VLMahlukHubDrive;
 if(!drive?.connected())throw Error("Connect Google Drive first");
 return drive.listRecords(kind);
}
async function loadOnline(kind,id){
 const drive=window.VLMahlukHubDrive;
 if(!drive?.connected())throw Error("Connect Google Drive first");
 return drive.loadRecord(kind,id);
}
window.VLMahlukWorkspace=Object.freeze({show,openEditor,closeCharacterPixel,closeAnimationPixel,newClip,refreshCharacter,note,
 syncDrive,saveOnline,listOnline,loadOnline,isOnline:()=>!!window.VLMahlukHubDrive?.connected(),draftStorage});
bind();show(new URLSearchParams(location.search).get("tab")||"character");
})();
