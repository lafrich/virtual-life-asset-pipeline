/* One host, four preserved specialist editors. Navigation never resets editor storage. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const ORIGIN=location.origin;
const URLS=Object.freeze({
 emotion:"/virtual-office/emotion-studio/",
 character:"./v6p-studio.html?embedded=1",
 action:"./mahluk-action-editor.html?embedded=1",
 animation:"./mahluk-motion-library.html?embedded=1"
});
const FRAMES=Object.freeze({
 emotion:"emotion-frame",character:"character-frame",action:"action-frame",
 animation:"motion-frame"
});
const TAB_IDS=["emotion","character","action","animation"];
let tab="character",mobilePane="library";
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
  iframe.src=new URL(url,location.href).href;iframe.dataset.loaded="1";
 }
 return iframe;
}
function setPane(pane){
 mobilePane=pane==="paint"?"paint":"library";
 const narrow=matchMedia("(max-width:850px)").matches;
 $("motion-pane").hidden=narrow&&mobilePane!=="library";
 $("paint-pane").hidden=narrow&&mobilePane!=="paint";
 $("view-library").setAttribute("aria-pressed",String(mobilePane==="library"));
 $("view-paint").setAttribute("aria-pressed",String(mobilePane==="paint"));
}
function show(name){
 if(!TAB_IDS.includes(name))name="character";
 tab=name;
 document.querySelectorAll("[data-tab]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tab===tab)));
 document.querySelectorAll(".view").forEach(p=>p.classList.toggle("active",p.id===tab+"-view"));
 loadFrame(FRAMES[tab],URLS[tab]);
 if(tab==="animation"){
  loadFrame("pixel-frame","./pixel-editor.html?source=v6p&project=clip_pushup&embedded=1");
  setPane(mobilePane);
 }
 const u=new URL(location.href);u.searchParams.set("tab",tab);
 history.replaceState(null,"",u.pathname+u.search+u.hash);
 note({emotion:"EMOSI.EXE · emotion database and dialog lipsync are the original editor",
 character:"CHARACTER EDITOR · same source appearance and asset library",
 action:"ACTION EDITOR · situation binding is stored as a separate draft",
 animation:"ANIMATION · original Pixel Editor + Grok Motion Review (not playable until approved)"}[tab]);
}
function openEditor(value){
 const url=fixedUrl(value);
 const frame=$("pixel-frame");frame.src=url;frame.dataset.loaded="1";
 mobilePane="paint";show("animation");setPane("paint");
 note("Editing via existing Pixel Editor · current draft and stock sources preserved");
}
function refreshCharacter(){
 const el=$("character-frame");try{el?.contentWindow?.postMessage({type:"mahluk:refresh-character"},"*")}catch{}
}
function newClip(){
 openEditor("./pixel-editor.html?source=v6p&new=clip&name=New%20Animation");
}
function openFull(){
 const url=tab==="animation"&&mobilePane==="paint"?$("pixel-frame").src:tab==="animation"?$("motion-frame").src:
  $(FRAMES[tab]).src||new URL(URLS[tab],location.href).href;
 // Explicit user click only; OAuth/clipboard/phone fallback can run in a top-level window.
 window.open(url,"_blank","noopener,noreferrer");
}
function bind(){
 for(const btn of document.querySelectorAll("[data-tab]"))btn.onclick=()=>show(btn.dataset.tab);
 $("view-library").onclick=()=>setPane("library");
 $("view-paint").onclick=()=>setPane("paint");
 $("new-clip").onclick=newClip;
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
   show("animation");setPane("library");$("motion-frame").contentWindow?.postMessage({type:"mahluk:select-motion",id:e.data.id},ORIGIN);
  }
 });
 matchMedia("(max-width:850px)").addEventListener("change",()=>setPane(mobilePane));
 const drive=window.VLMahlukHubDrive;
 if(drive){
  $("drive-connect").onclick=async()=>{
   try{note("Connecting Google Drive…");await drive.connect();$("drive-save").disabled=false;$("drive-load").disabled=false;
    $("drive-connect").textContent="☁ CONNECTED";$("help").textContent="DRIVE READY";note("Google Drive connected · use BACKUP or RESTORE");
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
window.VLMahlukWorkspace=Object.freeze({show,openEditor,newClip,refreshCharacter,note});
bind();show(new URLSearchParams(location.search).get("tab")||"character");
})();
