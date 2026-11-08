/* One host, four preserved specialist editors. Navigation never resets editor storage. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const ORIGIN=location.origin;
const URLS=Object.freeze({
 emotion:"/virtual-office/emotion-studio/",
 character:"./v6p-studio.html?embedded=1&rev=idle-pivot-v2",
 action:"./mahluk-action-editor.html?embedded=1",
 animation:"./mahluk-animation-studio.html?embedded=1&rev=idle-pivot-v2"
});
const FRAMES=Object.freeze({
 emotion:"emotion-frame",character:"character-frame",action:"action-frame",
 animation:"motion-frame"
});
const TAB_IDS=["emotion","character","action","animation"];
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
 for(const id of ["character-frame","action-frame","motion-frame"])
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
 if(tab==="character"){
  const pixel=$("pixel-frame");
  try{
   const pending=pixel?.contentWindow?.VirtualLifePixelEditor?.flush?.();
   Promise.resolve(pending).then(refreshCharacter,refreshCharacter);
  }catch{refreshCharacter()}
 }
 if(tab==="animation")setPane();
 const u=new URL(location.href);u.searchParams.set("tab",tab);
 history.replaceState(null,"",u.pathname+u.search+u.hash);
 note({emotion:"EMOSI.EXE · emotion database and dialog lipsync are the original editor",
 character:"CHARACTER · Start → Base → Customize → Preview → Save",
 action:"ACTION EDITOR · situation binding is stored as a separate draft",
 animation:"ANIMATION · 4-direction frame-by-frame asset/anchor editor + Pixel Editor"}[tab]);
}
function openEditor(value){
 const url=fixedUrl(value),target=new URL(url);
 if(target.searchParams.get("character")&&target.searchParams.get("from")!=="animation"){
  show("character");
  const frame=$("character-pixel-frame");
  frame.src=url;
  $("character-pixel-overlay").hidden=false;
  note("Editing a character-local sprite · Back to Character preserves your wizard step");
  return;
 }
 show("animation");
 const frame=$("pixel-frame");frame.src=url;frame.dataset.loaded="1";
 $("animation-pixel-overlay").hidden=false;
 note("Editing animation pixels · Back returns to the Animation flow");
}
async function closeCharacterPixel(){
 const overlay=$("character-pixel-overlay");
 if(!overlay||overlay.hidden)return;
 const frame=$("character-pixel-frame");
 try{await frame?.contentWindow?.VirtualLifePixelEditor?.flush?.()}
 catch(error){note("Pixel save failed: "+error.message);return}
 overlay.hidden=true;show("character");
}
async function closeAnimationPixel(){
 const overlay=$("animation-pixel-overlay");
 if(!overlay||overlay.hidden)return;
 try{await $("pixel-frame")?.contentWindow?.VirtualLifePixelEditor?.flush?.()}
 catch(error){note("Animation pixel save failed: "+error.message);return}
 overlay.hidden=true;show("animation");
 const motion=$("motion-frame");
 try{motion?.contentWindow?.postMessage({type:"mahluk:refresh-animation"},ORIGIN)}catch{}
 note("Back to Sprite + Anchor · Character/Custom Wear corrections saved");
}
function refreshCharacter(){
 const el=$("character-frame");try{el?.contentWindow?.postMessage({type:"mahluk:refresh-character"},ORIGIN)}catch{}
}
function newClip(){
  // Only the Motion Editor creates animations. Pixel Editor edits Custom Wear.
  show("animation");
  note("CREATE ANIMATION or IMPORT AI MOTION.JSON; no separate Pixel Clip pipeline.");
}
function openFull(){
 const url=tab==="animation"&&!$("animation-pixel-overlay").hidden?$("pixel-frame").src:tab==="animation"?$("motion-frame").src:
  $(FRAMES[tab]).src||new URL(URLS[tab],location.href).href;
 // Explicit user click only; OAuth/clipboard/phone fallback can run in a top-level window.
 window.open(url,"_blank","noopener,noreferrer");
}
function bind(){
 for(const btn of document.querySelectorAll("[data-tab]"))btn.onclick=()=>show(btn.dataset.tab);
 $("view-library").onclick=()=>setPane();
 $("view-paint").onclick=()=>setPane();
 $("new-clip").onclick=newClip;
 $("character-pixel-back").onclick=()=>void closeCharacterPixel();
 $("animation-pixel-back").onclick=()=>void closeAnimationPixel();
 $("pixel-full").onclick=()=>window.open($("pixel-frame").src,"_blank","noopener,noreferrer");
 $("open-separate").onclick=openFull;
 window.addEventListener("message",e=>{
  if(e.origin!==ORIGIN||!e.data||typeof e.data!=="object")return;
  // Only permitted from our own embedded application frames.
  if(!Array.from(document.querySelectorAll("iframe")).some(f=>f.contentWindow===e.source))return;
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
    for(const id of ["character-frame","action-frame","motion-frame","pixel-frame"]){
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
