/* Action Editor = situation database, separate from frame animation database.
 * Zero writes to original motion registry, Semesta gameplay or Jiwa rules.
 */
(function(root){
"use strict";
const KEY="mahluk-action-situations-v1",FORMAT="mahluk-situation-database-v1";
const DIRS=["se","sw","ne","nw"];
const $=id=>document.getElementById(id);
const state={rows:[],selected:null,phase:"loop",frame:0,catalog:[],cache:new Map(),playing:false,timer:null,token:0,sheets:new Map()};
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
  offsetX,offsetY,characterId:$("actor").value,notes:$("notes").value.slice(0,400),status:"draft_unapproved"};
}
function fillForm(row){
 const value=row||blank();
 $("action-id").value=value.id;$("action-name").value=value.name;
 $("trigger").value=value.trigger;$("object").value=value.object;
 $("phase-enter").value=value.enter||"";$("phase-loop").value=value.loop||"";
 $("phase-exit").value=value.exit||"";
 $("offset-x").value=Number(value.offsetX)||0;$("offset-y").value=Number(value.offsetY)||0;
 $("notes").value=value.notes||"";state.selected=value.id;
 if(value.characterId&&[...$("actor").options].some(o=>o.value===value.characterId))$("actor").value=value.characterId;
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
function realCharacters(){
 let saved=[];try{const v=JSON.parse(localStorage.getItem("mahluk-2-library-v1")||"[]");if(Array.isArray(v))saved=v.filter(x=>x&&x.id&&x.clips&&Object.keys(x.clips).length)}catch{}
 return saved;
}
function refreshActors(){
 const select=$("actor"),current=select.value;select.replaceChildren();
 const add=(id,name)=>{const option=document.createElement("option");option.value=id;option.textContent=name;select.append(option)};
 add("base:male","MALE BASE · NUDE / NO HAIR");add("base:female","FEMALE BASE · NUDE / NO HAIR");
 const seen=new Set(["base:male","base:female"]);
 for(const row of root.V6PCharacterStore?.list()||[]){if(!seen.has(row.id)){add(row.id,row.name+" · DRAFT");seen.add(row.id)}}
 for(const row of realCharacters()){if(!seen.has(row.id)){add(row.id,row.name+" · SAVED");seen.add(row.id)}}
 select.value=[...select.options].some(x=>x.value===current)?current:"base:male";
}
function actor(){
 const id=$("actor").value,local=root.V6PCharacterStore?.get(id),pub=realCharacters().find(x=>x.id===id);
 if(local)return {id,name:local.name,gender:local.gender,ch:{...local.appearance,characterId:id},clips:pub?.clips||{}};
 if(pub)return {id,name:pub.name,gender:pub.base||"male",ch:pub.v6p?{...pub.v6p,characterId:id}:null,clips:pub.clips||{}};
 const female=id==="base:female";return {id,name:female?"Female Base":"Male Base",gender:female?"female":"male",
  ch:{...root.V6PCompositor?.previewAppearance(female?"female":"male"),hair:"none",top:"nude",pants:"nude",shoes:"nude",face:"blank"},
  clips:{}};
}
function publishedClip(entry,cid){
 const clip=entry.clips?.[cid];if(!clip||!clip.sheet)return null;
 return {url:clip.sheet,frames:Math.max(1,Number(clip.frames)||1),frameMs:clip.frame_ms||[180],
  loop:clip.loop!==false,layout:"published",actor:entry.name,action:{id:cid}};
}
function ref(){
 const value=$("phase-"+state.phase).value,entry=actor(),V=root.V6PCompositor;
 if(value.startsWith("grok:")){
  const a=state.catalog.find(x=>x.id===value.slice(5));if(!a)return null;
  const native=publishedClip(entry,a.id);if(native)return native;
  if(entry.ch&&V&&V.ROWS[a.id]!=null)return {frames:V.FRAMES[a.id],frameMs:Array(V.FRAMES[a.id]).fill(140),
   loop:a.loop!==false,layout:"base",actor:entry.name,action:a,ch:entry.ch};
  return null; // NEVER substitute Ichsan/Noor/NPC pixels for another character
 }
 if(value.startsWith("clip:")){
  const id=value.slice(5),native=publishedClip(entry,id);if(native)return native;
  const clip=root.V6PClipStore?.get(id);if(!clip)return null;
  const part=Object.keys(clip.layers||{})[0]||clip.manifest.requiredParts?.[0],url=part&&root.V6PClipStore.layerUrl(id,part);
  return url?{url,frames:clip.manifest.frames.length,frameMs:clip.manifest.frames.map(x=>x.ms),
   loop:clip.manifest.loop!==false,layout:"activity",action:clip,actor:entry.name}:null;
 }
 return null;
}
function getImage(url){
 if(!state.cache.has(url))state.cache.set(url,new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Cannot load animation sprite"));img.src=url;
 }));
 return state.cache.get(url);
}
function drawObject(ctx){
 const obj=$("object").value;ctx.save();ctx.fillStyle="#a8bacb";ctx.strokeStyle="#53647a";ctx.lineWidth=1;
 if(obj==="chair"){ctx.fillRect(28,82,30,8);ctx.fillRect(28,58,6,30);ctx.fillRect(32,89,3,16);ctx.fillRect(52,89,3,16)}
 else if(obj==="bed"){ctx.fillRect(4,78,56,16);ctx.fillRect(4,93,4,13);ctx.fillRect(56,93,4,13)}
 else if(obj==="table"){ctx.fillRect(5,71,54,6);ctx.fillRect(10,78,4,30);ctx.fillRect(50,78,4,30)}
 else if(obj==="toilet"){ctx.fillRect(20,82,27,14);ctx.fillRect(19,69,8,18)}
 else if(obj==="vehicle"){ctx.fillRect(4,72,55,22);ctx.fillRect(12,93,10,10);ctx.fillRect(44,93,10,10)}
 else if(obj==="door"){ctx.strokeRect(16,12,32,88)}
 else if(obj==="shower"){ctx.strokeRect(14,15,36,88);ctx.fillRect(20,22,24,3)}
 ctx.restore();
}
function render(){
 const cv=$("action-canvas"),ctx=cv.getContext("2d");ctx.imageSmoothingEnabled=false;
 ctx.clearRect(0,0,cv.width,cv.height);
 const r=ref(),length=r?.frames||1;state.frame=Math.min(state.frame,length-1);
 $("frame").max=String(length-1);$("frame").value=String(state.frame);$("frame-number").textContent=(state.frame+1)+" / "+length;
 const who=actor().name,choose=$("phase-"+state.phase).value;
 $("preview-note").textContent=r?(r.layout==="activity"?"LOCAL ANIMATION TEMPLATE · not automatically fitted to "+who:
  r.layout==="published"?"ACTUAL CHARACTER CLIP · "+who:"V6P CHARACTER PREVIEW · "+who)+
  " · "+r.action?.id+" · "+$("dir").value.toUpperCase():
  (choose?"No compatible frames for "+who+" / "+choose+". Use Animation Editor to author frames.":"Select ENTER / LOOP / EXIT animation for "+who);
 const token=++state.token;
 if(!r)return;
 const draw=img=>{
  if(token!==state.token)return;ctx.clearRect(0,0,cv.width,cv.height);
  const surface=document.createElement("canvas");surface.width=64;surface.height=112;
  const c=surface.getContext("2d");c.imageSmoothingEnabled=false;drawObject(c);
  const d=DIRS.indexOf($("dir").value),n=Math.min(state.frame,r.frames-1);
  const oy=r.layout==="activity"?(Number(r.action.manifest.bandStart)||0)*112:r.layout==="base"?
   (root.V6PCompositor.ROWS[r.action.id]+d)*112:d*112;
  c.drawImage(img,n*64,oy,64,112,Number($("offset-x").value)||0,Number($("offset-y").value)||0,64,112);
  ctx.drawImage(surface,0,0,cv.width,cv.height);
 };
 if(r.layout==="base"){
  const key=JSON.stringify({ch:r.ch});
  let p=state.sheets.get(key);
  if(!p){p=root.V6PCompositor.sheet(r.ch,null,"");state.sheets.set(key,p)}
  p.then(draw).catch(e=>status(e.message,true));return;
 }
 getImage(r.url).then(draw).catch(e=>status(e.message,true));
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
  status("Grok is a motion reference, not this actor's sprite. Opening Animation Editor for a proper Male/Female base draft.");
  if(root.parent&&root.parent!==root&&root.parent.VLMahlukWorkspace)root.parent.VLMahlukWorkspace.show("animation");
  else location.href="./mahluk-animation-studio.html";
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
 $("refresh-actors").onclick=()=>{refreshActors();render()};
 $("dir").onchange=()=>{stop();render()};
 for(const id of ["object","offset-x","offset-y"]) $(id).addEventListener("input",render);
 for(const phase of ["enter","loop","exit"]){
  $("phase-"+phase).onchange=()=>{stop();state.frame=0;render()};
 }
 document.querySelectorAll("[data-phase]").forEach(b=>b.onclick=()=>selectPhase(b.dataset.phase));
 document.addEventListener("visibilitychange",()=>{if(document.hidden)stop()});
 refreshActors();
 if(state.rows.length)fillForm(state.rows[0]);else newAction();
 void loadMotions();
}
root.VLMahlukActionEditor=Object.freeze({load,persist,KEY,FORMAT});
wire();
})(window);
