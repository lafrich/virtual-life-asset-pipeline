/* Read-only review browser for Grok-authored stock motion sprites.
 * No writes to V6PClipStore, the official action registry, Emosi, or Semesta.
 * Keeps pending_owner_review work distinct from approved gameplay actions. */
(function(root){
"use strict";
const DIR=["se","sw","ne","nw"],CAT_URL="./grok-motion-preview/catalog.json";
const $=id=>document.getElementById(id);
const state={library:null,selected:null,actor:"ichsan",dir:"se",frame:0,playing:false,timer:null,drawToken:0,images:new Map()};
let mounted=false;
function status(message,error=false){const n=$("motion-status");if(n){n.textContent=message;n.classList.toggle("err",!!error)}}
function stop(){state.playing=false;if(state.timer)clearTimeout(state.timer);state.timer=null;const b=$("motion-play");if(b)b.textContent="▶ PLAY"}
function selectedSheet(){return state.selected?.sheets?.[state.actor]||null}
function escapeText(v){return String(v??"")}
function updateFrameControls(){
 const a=state.selected,frames=a?.frames||1;
 state.frame=Math.min(state.frame,frames-1);
 const slider=$("motion-frame");
 if(slider){slider.max=String(frames-1);slider.value=String(state.frame);slider.disabled=!selectedSheet()}
 const label=$("motion-frame-label");if(label)label.textContent=(state.frame+1)+" / "+frames;
 $("motion-play").disabled=!selectedSheet();
 $("motion-download").disabled=!selectedSheet();
}
function render(){
 const a=state.selected,view=selectedSheet(),cv=$("motion-canvas");
 if(!cv)return;
 const ctx=cv.getContext("2d");ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,cv.width,cv.height);
 updateFrameControls();
 const details=$("motion-detail");
 if(!a){if(details)details.textContent="Pilih animasi dari daftar.";return}
 const suffix=a.native?"Native reused · ":"Authored draft · ";
 if(details)details.textContent=suffix+(a.frames||0)+" frame · "+a.category+" · 4 views · "+(a.loop?"loop":"one-shot")+
  (a.notes?" · "+a.notes:"");
 const note=$("motion-actor-note");
 if(!view){if(note)note.textContent="Belum ada sheet "+state.actor.toUpperCase()+" untuk action ini.";return}
 if(note)note.textContent="Grok v1 · "+state.actor.toUpperCase()+" · "+state.dir.toUpperCase()+" · PENDING REVIEW / NOT INSTALLED";
 const token=++state.drawToken,url=view.url;
 let promise=state.images.get(url);
 if(!promise){
  promise=new Promise((resolve,reject)=>{
   const img=new Image();
   img.onload=()=>resolve(img);img.onerror=()=>reject(Error("PNG belum tersedia: "+url));img.src=url;
  });state.images.set(url,promise)
 }
 promise.then(img=>{
  if(token!==state.drawToken||selectedSheet()?.url!==url)return;
  const w=64,h=112,n=DIR.indexOf(state.dir),frame=Math.min(state.frame,a.frames-1);
  ctx.clearRect(0,0,cv.width,cv.height);
  ctx.drawImage(img,frame*w,n*h,w,h,0,0,cv.width,cv.height);
 }).catch(e=>{if(token===state.drawToken)status(e.message,true)});
}
function nextFrame(){
 if(!state.playing||!state.selected||!selectedSheet())return;
 const a=state.selected;
 const delay=Math.min(1000,Math.max(40,Number(a.frame_ms?.[state.frame])||180));
 state.timer=setTimeout(()=>{
  if(!state.playing)return;
  const last=state.frame+1>=a.frames;
  if(last&&!a.loop){stop();return}
  state.frame=last?0:state.frame+1;render();nextFrame();
 },delay);
}
function play(){if(state.playing){stop();return}if(!selectedSheet())return;state.playing=true;$("motion-play").textContent="❚❚ PAUSE";nextFrame()}
function choose(id){
 const a=state.library?.actions.find(x=>x.id===id);if(!a)return;
 stop();state.selected=a;state.frame=0;
 const actor=$("motion-actor").value;
 if(!a.sheets?.[actor]){
  const first=["ichsan","npc"].find(k=>!!a.sheets?.[k]);if(first){state.actor=first;$("motion-actor").value=first}
 }
 const selected=$("motion-list").querySelectorAll("button[data-motion-id]");
 selected.forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.motionId===id)));
 render();
}
function fillList(){
 const holder=$("motion-list");if(!holder||!state.library)return;
 const query=$("motion-search").value.toLowerCase().trim(),filter=$("motion-filter").value;
 const matches=state.library.actions.filter(a=>(!query||(a.id+" "+a.label+" "+a.category).toLowerCase().includes(query))&&
  (filter==="all"||filter===a.category||filter==="authored"&&!a.native));
 holder.replaceChildren();
 for(const a of matches){
  const b=document.createElement("button");b.type="button";b.className="motion-item";b.dataset.motionId=a.id;
  b.setAttribute("aria-pressed",String(state.selected?.id===a.id));
  const title=document.createElement("strong");title.textContent=a.label;
  const meta=document.createElement("small");meta.textContent=a.frames+" FR · "+(a.native?"NATIVE":"REVIEW");
  b.append(title,meta);b.onclick=()=>choose(a.id);holder.append(b);
 }
 $("motion-count").textContent=matches.length+" / "+state.library.actions.length+" ACTIONS";
}
async function load(){
 try{
  const response=await fetch(CAT_URL,{cache:"no-store"});if(!response.ok)throw Error("HTTP "+response.status);
  const library=await response.json();
  if(library?.schema!=="mahluk-grok-motion-preview-v1"||library?.reviewStatus!=="pending_owner_review"||
     library?.isGameInstalled!==false||library?.actions?.length!==49)throw Error("Unknown / unreviewed catalog format");
  if(library.actions.some(a=>!a.id||!a.sheets||!a.frames||a.reviewStatus!=="pending_owner_review"))throw Error("Incomplete motion metadata");
  state.library=library;fillList();choose(library.actions.find(x=>x.id==="yoga_mountain")?.id||library.actions[0].id);
  status("49 ACTIONS · GROK V1 · 44 AUTHORED + 5 NATIVE REUSED · OWNER REVIEW");
 }catch(e){status("Motion Library belum tersedia: "+e.message,true)}
}
function mount(){
 if(mounted)return;mounted=true;
 $("motion-search").oninput=fillList;$("motion-filter").onchange=fillList;
 $("motion-actor").onchange=e=>{stop();state.actor=e.target.value;state.frame=0;render()};
 $("motion-direction").onchange=e=>{stop();state.dir=e.target.value;render()};
 $("motion-frame").oninput=e=>{stop();state.frame=Math.max(0,Number(e.target.value)||0);render()};
 $("motion-prev").onclick=()=>{stop();state.frame=Math.max(0,state.frame-1);render()};
 $("motion-next").onclick=()=>{stop();state.frame=Math.min((state.selected?.frames||1)-1,state.frame+1);render()};
 $("motion-play").onclick=play;
 $("motion-copy").onclick=async()=>{
  if(!state.selected||!selectedSheet())return;
  const button=$("motion-copy");button.disabled=true;
  try{status("Copying native four-view sprite to Pixel Editor…");
    const id=await root.V6PGrokMotionCopy.makeCopy(state.selected,state.actor);
    const url="./pixel-editor.html?source=v6p&project="+encodeURIComponent(id);
    if(root.parent&&root.parent!==root&&root.parent.VLMahlukWorkspace){root.parent.VLMahlukWorkspace.openEditor(url)}
    else location.href=url;
  }catch(e){status(e.message,true)}finally{button.disabled=false}
 };
 $("motion-download").onclick=()=>{
  const sheet=selectedSheet();if(!sheet)return;
  const a=document.createElement("a");a.href=sheet.url;a.download=state.actor+"_"+state.selected.id+"_sheet.png";
  document.body.append(a);a.click();a.remove();
 };
 document.addEventListener("visibilitychange",()=>{if(document.hidden)stop()});
 void load();
}
root.addEventListener("message",e=>{
 if(e.origin!==location.origin||e.data?.type!=="mahluk:select-motion"||typeof e.data.id!=="string")return;
 if(state.library)choose(e.data.id);
});
root.V6PMotionReview=Object.freeze({mount,stop,refresh:load});
})(window);
