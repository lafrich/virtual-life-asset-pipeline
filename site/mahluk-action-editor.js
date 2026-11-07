/* Action Editor = situation database, separate from frame animation database.
 * Zero writes to original motion registry, Semesta gameplay or Jiwa rules.
 */
(function(root){
"use strict";
const KEY="mahluk-action-situations-v1",FORMAT="mahluk-situation-database-v1";
const DIRS=["se","sw","ne","nw"];
const $=id=>document.getElementById(id);
const state={rows:[],selected:null,phase:"loop",frame:0,catalog:[],cache:new Map(),playing:false,timer:null,token:0};
function safeId(s){return /^[a-z][a-z0-9_]{1,47}$/.test(s)}
function status(s,err=false){$("status").textContent=s;$("status").classList.toggle("err",err)}
function load(){
 try{
  const stored=JSON.parse(localStorage.getItem(KEY)||"null");
  if(stored?.format===FORMAT&&Array.isArray(stored.items)){
   return stored.items.filter(v=>v&&safeId(v.id)).slice(0,150);
  }
 }catch{}
 return [];
}
function persist(){
 localStorage.setItem(KEY,JSON.stringify({format:FORMAT,savedAt:new Date().toISOString(),items:state.rows}));
 try{root.VLHub?.publish("actions",{count:state.rows.length,status:"draft_unapproved"})}catch{}
 root.dispatchEvent(new CustomEvent("mahluk:action-saved",{detail:{count:state.rows.length}}));
}
function blank(){
 return {id:"action_"+Date.now().toString(36),name:"New Situation",trigger:"interact",object:"any",
  enter:"",loop:"",exit:"",offsetX:0,offsetY:0,notes:"",status:"draft_unapproved"};
}
function readForm(){
 const id=$("action-id").value.trim().toLowerCase().replace(/\s+/g,"_");
 if(!safeId(id))throw Error("Action ID must be 2-48 lowercase letters, numbers or underscores; start with a letter");
 const name=$("action-name").value.trim();
 if(!name)throw Error("Action name is required");
 const offsetX=Number($("offset-x").value),offsetY=Number($("offset-y").value);
 if(!Number.isInteger(offsetX)||!Number.isInteger(offsetY)||Math.abs(offsetX)>256||Math.abs(offsetY)>256)
  throw Error("Foot offset must be an integer between -256 and +256");
 return {id,name,trigger:$("trigger").value,object:$("object").value,
  enter:$("phase-enter").value,loop:$("phase-loop").value,exit:$("phase-exit").value,
  offsetX,offsetY,notes:$("notes").value.slice(0,400),status:"draft_unapproved"};
}
function fillForm(row){
 const value=row||blank();
 $("action-id").value=value.id;$("action-name").value=value.name;
 $("trigger").value=value.trigger;$("object").value=value.object;
 $("phase-enter").value=value.enter||"";$("phase-loop").value=value.loop||"";
 $("phase-exit").value=value.exit||"";
 $("offset-x").value=Number(value.offsetX)||0;$("offset-y").value=Number(value.offsetY)||0;
 $("notes").value=value.notes||"";state.selected=value.id;
 drawList();render();
}
function drawList(){
 const host=$("draft-list");host.replaceChildren();
 for(const row of state.rows){
  const b=document.createElement("button");b.type="button";b.classList.toggle("selected",row.id===state.selected);
  b.textContent=row.name;
  const meta=document.createElement("small");meta.textContent=row.id+" · DRAFT";b.append(meta);
  b.onclick=()=>{stop();fillForm(row)};host.append(b);
 }
 if(!state.rows.length)host.textContent="No situation actions yet. Choose + NEW.";
}
function save(){
 try{
  const row=readForm(),index=state.rows.findIndex(x=>x.id===state.selected);
  if(state.rows.some((x,i)=>x.id===row.id&&i!==index))throw Error("This action ID already exists");
  if(index<0){if(state.rows.length>=150)throw Error("Action database limit 150 drafts");state.rows.unshift(row)}
  else state.rows[index]=row;
  state.selected=row.id;persist();drawList();status("SAVED LOCAL · "+row.name+" · pending review · Back up to Drive from MAHLUK toolbar");
 }catch(e){status(e.message,true)}
}
function newAction(){
 stop();const row=blank();state.selected=row.id;fillForm(row);
 status("New situation draft · click SAVE DRAFT to include it in the database");
}
function selectPhase(p){
 stop();state.phase=p;state.frame=0;
 document.querySelectorAll("[data-phase]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.phase===p)));
 render();
}
function ref(){
 const value=$("phase-"+state.phase).value;
 if(value.startsWith("grok:")){
  const a=state.catalog.find(x=>x.id===value.slice(5));
  if(!a)return null;
  const actor=$("actor").value;
  const source=a.sheets?.[actor]||a.sheets?.ichsan||a.sheets?.npc;
  return source?{url:source.url,frames:a.frames,frameMs:a.frame_ms,loop:a.loop!==false,layout:"grok",action:a,actor}:null;
 }
 if(value.startsWith("clip:")){
  const clip=root.V6PClipStore?.get(value.slice(5));
  if(!clip)return null;
  const part=Object.keys(clip.layers||{})[0]||clip.manifest.requiredParts?.[0];
  const url=part&&root.V6PClipStore.layerUrl(clip.id,part);
  return url?{url,frames:clip.manifest.frames.length,frameMs:clip.manifest.frames.map(x=>x.ms),
   loop:clip.manifest.loop!==false,layout:"activity",action:clip,actor:"user clip"}:null;
 }
 return null;
}
function getImage(url){
 if(!state.cache.has(url))state.cache.set(url,new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Cannot load animation sprite"));img.src=url;
 }));
 return state.cache.get(url);
}
function render(){
 const cv=$("action-canvas"),ctx=cv.getContext("2d");ctx.imageSmoothingEnabled=false;
 ctx.clearRect(0,0,cv.width,cv.height);
 const r=ref();
 const length=r?.frames||1;
 state.frame=Math.min(state.frame,length-1);
 $("frame").max=String(length-1);$("frame").value=String(state.frame);
 $("frame-number").textContent=(state.frame+1)+" / "+length;
 $("preview-note").textContent=r?(r.layout==="grok"?"GROK REVIEW · not playable · ":"CUSTOM CLIP LOCAL · ")+
   r.action?.id+" · "+$("dir").value.toUpperCase():"No animation assigned to "+state.phase.toUpperCase();
 if(!r)return;
 const token=++state.token;
 getImage(r.url).then(img=>{
  if(token!==state.token||ref()?.url!==r.url)return;
  const d=DIRS.indexOf($("dir").value);
  const frame=Math.min(state.frame,r.frames-1);
  const oy=r.layout==="activity"?(Number(r.action.manifest.bandStart)||0)*112:0;
  ctx.clearRect(0,0,cv.width,cv.height);
  ctx.drawImage(img,frame*64,oy+d*112,64,112,0,0,cv.width,cv.height);
 }).catch(e=>status(e.message,true));
}
function stop(){
 state.playing=false;if(state.timer)clearTimeout(state.timer);state.timer=null;$("play").textContent="▶ PLAY";
}
function tick(){
 const r=ref();if(!state.playing||!r)return;
 const delay=Math.max(40,Math.min(800,Number(r.frameMs[state.frame])||180));
 state.timer=setTimeout(()=>{
  if(!state.playing)return;
  if(state.frame+1>=r.frames){
   if(!r.loop){stop();return}state.frame=0;
  }else state.frame++;
  render();tick();
 },delay);
}
function togglePlay(){
 if(state.playing){stop();return}
 if(!ref())return;
 state.playing=true;$("play").textContent="❚❚ PAUSE";tick();
}
function bindMotion(){
 const value=$("phase-"+state.phase).value;
 if(!value){status("Choose an animation first",true);return}
 const open=url=>{
  if(root.parent&&root.parent!==root&&root.parent.VLMahlukWorkspace)root.parent.VLMahlukWorkspace.openEditor(url);
  else location.href=url;
 };
 if(value.startsWith("clip:")){
  open("./pixel-editor.html?source=v6p&project="+encodeURIComponent(value.slice(5)));return;
 }
 if(value.startsWith("grok:")){
  const action=state.catalog.find(x=>x.id===value.slice(5));
  if(!action||!root.V6PGrokMotionCopy){status("Grok importer not loaded",true);return}
  status("Creating safe local copy for Pixel Editor…");
  root.V6PGrokMotionCopy.makeCopy(action,$("actor").value).then(id=>{
   const url="./pixel-editor.html?source=v6p&project="+encodeURIComponent(id);
   open(url);
  }).catch(e=>status(e.message,true));
 }
}
async function loadMotions(){
 try{
  const r=await fetch("./grok-motion-preview/catalog.json",{cache:"no-store"});
  if(!r.ok)throw Error("Grok review catalog not yet deployed");
  const j=await r.json();
  if(j.schema!=="mahluk-grok-motion-preview-v1"||j.actions?.length!==49)throw Error("Invalid motion review registry");
  state.catalog=j.actions;
 }catch(e){status("Review catalog unavailable: "+e.message,true)}
 refreshOptions();
}
function refreshOptions(){
 const current={};
 for(const phase of ["enter","loop","exit"])current[phase]=$("phase-"+phase).value;
 const group=document.createDocumentFragment();
 const opts=[{value:"",text:"— NO ANIMATION —"}];
 for(const a of state.catalog)opts.push({value:"grok:"+a.id,text:"GROK / "+a.label+" · REVIEW"});
 for(const c of root.V6PClipStore?.list()||[])opts.push({value:"clip:"+c.id,text:"USER / "+c.name+" · "+c.manifest.frames.length+" FR"});
 for(const phase of ["enter","loop","exit"]){
  const select=$("phase-"+phase);select.replaceChildren();
  for(const row of opts){const op=document.createElement("option");op.value=row.value;op.textContent=row.text;select.append(op)}
  select.value=current[phase]||state.rows.find(x=>x.id===state.selected)?.[phase]||"";
 }
 render();
}
function exportData(){
 const body=JSON.stringify({format:FORMAT,items:state.rows},null,2);
 const a=document.createElement("a"),url=URL.createObjectURL(new Blob([body],{type:"application/json"}));
 a.download="mahluk-action-situations.json";a.href=url;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function wire(){
 state.rows=load();
 $("new").onclick=newAction;
 $("duplicate").onclick=()=>{
  const source=state.rows.find(x=>x.id===state.selected)||readForm();
  const row={...source,id:"action_"+Date.now().toString(36),name:source.name+" Copy"};
  fillForm(row);status("Duplicated as a new draft; click SAVE to keep it");
 };
 $("save").onclick=save;
 $("delete").onclick=()=>{
  if(!state.rows.some(x=>x.id===state.selected))return;
  if(!confirm("Delete only this local action draft? Published game animations remain untouched."))return;
  state.rows=state.rows.filter(x=>x.id!==state.selected);persist();
  if(state.rows[0])fillForm(state.rows[0]);else newAction();
  status("Draft deleted · original motion sprites untouched");
 };
 $("export").onclick=exportData;
 $("edit-motion").onclick=bindMotion;
 $("play").onclick=togglePlay;
 $("prev").onclick=()=>{stop();state.frame=Math.max(0,state.frame-1);render()};
 $("next").onclick=()=>{stop();state.frame=Math.min((ref()?.frames||1)-1,state.frame+1);render()};
 $("frame").oninput=e=>{stop();state.frame=Number(e.target.value)||0;render()};
 $("actor").onchange=()=>{stop();state.frame=0;render()};
 $("dir").onchange=()=>{stop();render()};
 for(const phase of ["enter","loop","exit"]){
  $("phase-"+phase).onchange=()=>{stop();state.frame=0;render()};
 }
 document.querySelectorAll("[data-phase]").forEach(b=>b.onclick=()=>selectPhase(b.dataset.phase));
 document.addEventListener("visibilitychange",()=>{if(document.hidden)stop()});
 if(state.rows.length)fillForm(state.rows[0]);else newAction();
 void loadMotions();
}
root.VLMahlukActionEditor=Object.freeze({load,persist,KEY,FORMAT});
wire();
})(window);
