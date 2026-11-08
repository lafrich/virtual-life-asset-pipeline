/* Action Studio v2: multi-character scene and existing situation database.
 * No changes to native character, Custom Wear, animation sources, Jiwa or Semesta.
 * Action entries remain drafts pending separate gameplay approval. */
(function(root){"use strict";
const KEY="mahluk-action-situations-v1",FORMAT="mahluk-situation-database-v1";
const DIRS=["se","sw","ne","nw"],PHASES=["enter","loop","exit"],$=id=>document.getElementById(id);
const V=root.V6PCompositor,Store=root.V6PClipStore,
 Motion=root.V6PUniversalMotion,MotionContract=root.V6PUniversalMotionContract;
const state={rows:[],selected:null,cast:[],active:"",phase:"loop",frame:0,playing:false,timer:null,
 cache:new Map(),sheets:new Map(),token:0,drag:null,screen:"home",message:"",onlineCharacters:[],
 camera:{zoom:1,x:0,y:0,grid:false},pointers:new Map(),pinch:null};
function safeId(s){return /^[a-z][a-z0-9_]{1,47}$/.test(s||"")}
function status(s,err=false){$("status").textContent=s;$("status").classList.toggle("err",err)}
function load(){
 try{
  const data=JSON.parse((root.parent?.VLMahlukWorkspace?.draftStorage||localStorage).getItem(KEY)||"null");
  if(data?.format!==FORMAT||!Array.isArray(data.items))return [];
  const rows=data.items.filter(x=>x&&safeId(x.id)).slice(0,150);
  // Retire ONLY unapproved Grok motion bindings; preserve the scene and other animations.
  let changed=false;
  for(const row of rows){
   const actors=[row,...(Array.isArray(row.actors)?row.actors:[])];
   for(const actor of actors)for(const phase of PHASES)
    if(typeof actor[phase]==="string"&&actor[phase].startsWith("grok:")){
     actor[phase]="";changed=true;
    }
  }
  if(changed)localStorage.setItem(KEY,JSON.stringify({format:FORMAT,savedAt:new Date().toISOString(),items:rows}));
  return rows;
 }catch{return []}
}
function persist(){
 (root.parent?.VLMahlukWorkspace?.draftStorage||localStorage).setItem(KEY,
  JSON.stringify({format:FORMAT,savedAt:new Date().toISOString(),items:state.rows}));
 try{root.VLHub?.publish("actions",{count:state.rows.length,status:"draft_unapproved"})}catch{}
 root.dispatchEvent(new CustomEvent("mahluk:action-saved",{detail:{count:state.rows.length}}));
}
function blank(){return {id:"action_"+Date.now().toString(36),name:"New Action",trigger:"interact",object:"any",enter:"",
 loop:"",exit:"",offsetX:0,offsetY:0,notes:"",actors:[],status:"draft_unapproved"}}
function clone(v){return JSON.parse(JSON.stringify(v))}
function member(characterId,index=state.cast.length){return {instance:"cast_"+Date.now().toString(36)+Math.random().toString(36).slice(2,7),
 characterId,x:Math.min(469,40+index*109),y:Math.min(218,164+(index%2)*19),dir:"se",enter:"",loop:"native:idle",exit:""}}
function current(){return state.cast.find(x=>x.instance===state.active)||state.cast[0]||null}
function stop(){state.playing=false;clearTimeout(state.timer);state.timer=null;$("play").textContent="▶ PLAY"}
function show(screen){
 stop();state.screen=screen;
 $("action-home").hidden=screen!=="home";$("action-choose").hidden=screen!=="choose";$("action-workspace").hidden=screen!=="editor";
 if(screen==="home")drawGallery();
 else if(screen==="choose"){refreshActors();drawChoose();}
 else{drawCast();void render()}
}
function home(message){
 if(message){state.message=message;$("action-home-note").textContent=message}
 $("action-home-heading").textContent="GALLERY · SAVED ACTIONS";
 show("home");
}
function drawGallery(){
 const target=$("action-gallery");target.replaceChildren();
 if(!state.rows.length){target.textContent="No saved actions. Choose CREATE ACTION.";return}
 for(const row of state.rows){
  const button=document.createElement("button"),title=document.createElement("strong"),caption=document.createElement("small");
  title.textContent=row.name;caption.textContent=row.id+" · "+(row.actors?.length||(row.characterId?1:0))+" character(s) · DRAFT";
  button.append(title,caption);button.onclick=()=>{fillForm(row);show("editor")};target.append(button);
 }
}
function drawChoose(){
 const target=$("choose-cast-list");target.replaceChildren();
 for(const row of state.cast){
  const button=document.createElement("button");button.textContent=actor(row.characterId).name+" · REMOVE";
  button.onclick=()=>{state.cast=state.cast.filter(x=>x.instance!==row.instance);
   if(state.active===row.instance)state.active=state.cast[0]?.instance||"";drawChoose()};
  target.append(button);
 }
 if(!state.cast.length)target.textContent="Add at least one character.";
}
function addCast(characterId,choosing=false){
 if(!characterId)return;
 if(state.cast.length>=10){status("Maximum 10 characters per action",true);return}
 const row=member(characterId);state.cast.push(row);state.active=row.instance;
 if(choosing)drawChoose();else drawCast();
 void render();
}
function realCharacters(){
 let rows=[];
 try{const saved=JSON.parse(localStorage.getItem("mahluk-2-library-v1")||"[]");
  if(Array.isArray(saved))rows=saved.filter(x=>x?.id&&x.clips&&Object.keys(x.clips).length)
 }catch{}
 const combined=new Map(rows.map(x=>[x.id,x]));
 for(const row of state.onlineCharacters)if(row?.id)combined.set(row.id,row);
 return [...combined.values()];
}
function refreshActors(){
 for(const name of ["actor","choose-actor"]){
  const el=$(name),value=el.value;el.replaceChildren();
  const add=(id,label)=>{const option=document.createElement("option");option.value=id;option.textContent=label;el.append(option)};
  // Action Editor consumes CREATED actors, never stock base mannequins.
  // Create one from either approved Genesis base in Character first.
  const seen=new Set();
  for(const row of root.V6PCharacterStore?.list()||[])if(!seen.has(row.id)){add(row.id,row.name+" · DRAFT");seen.add(row.id)}
  for(const row of realCharacters())if(!seen.has(row.id)){add(row.id,row.name+" · SAVED");seen.add(row.id)}
  if(!seen.size)add("","Create Genesis character in Character tab first");
  if([...el.options].some(x=>x.value===value))el.value=value;
 }
}
function actor(id=current()?.characterId||$("actor").value){
 const local=root.V6PCharacterStore?.get(id),published=realCharacters().find(x=>x.id===id);
 if(local)return {id,name:local.name,ch:{...local.appearance,characterId:id},clips:published?.clips||{},assetParts:local.parts||published?.assetParts||{},assetVersion:local.revision||0};
 if(published)return {id,name:published.name,ch:published.v6p?{...published.v6p,characterId:id}:null,clips:published.clips||{},assetParts:published.assetParts||{},assetVersion:published.updated||""};
 const female=id==="base:female";
 return {id,name:female?"Female Base":"Male Base",
  ch:V?.norm({...V.previewAppearance(female?"female":"male"),hair:"none",top:"tee",pants:"trousers",shoes:"shoes",face:"blank"}),clips:{}};
}
function publishedClip(entry,cid){
 const clip=entry.clips?.[cid];if(!clip?.sheet)return null;
 return {url:clip.sheet,frames:Math.max(1,Number(clip.frames)||1),frameMs:clip.frame_ms||[180],
  loop:clip.loop!==false,layout:"published",action:{id:cid}};
}
function refFor(entry,value){
 if(!entry)return null;
 if(value?.startsWith("native:")){
  const id=value.slice(7),published=publishedClip(entry,id);if(published)return published;
  if(entry.ch&&V&&V.ROWS[id]!=null)return {frames:V.FRAMES[id],frameMs:Array(V.FRAMES[id]).fill(id==="idle"?220:140),
   layout:"base",loop:true,action:{id},ch:entry.ch};
  return null;
 }
 if(value?.startsWith("clip:")){
  const id=value.slice(5),clip=Store?.get(id);
  const published=publishedClip(entry,id);
  if(!clip&&published)return published;
  if(!clip)return null;
   if(Motion&&MotionContract?.isUniversal(clip.manifest)&&entry.ch){
    try{MotionContract.validateManifest(clip.manifest)}catch{return null}
    return {frames:clip.manifest.frames.length,frameMs:clip.manifest.frames.map(x=>x.ms),
     loop:clip.manifest.loop!==false,layout:"universal",action:clip,ch:entry.ch,
     assetParts:entry.assetParts||{},assetVersion:entry.assetVersion||0};
   }
  // Canonical stock uses the same compositor, color keys and character appearance as Idle/Walk.
  if(clip.origin==="pilot"&&Store.hasLayer(id,"base/body")&&entry.ch){
    const base=/^base:(male|female)$/.test(entry.id||"");
    const ch=base?V.norm({...entry.ch,top:"nude",pants:"nude",shoes:"nude"}):entry.ch;
    return {frames:clip.manifest.frames.length,frameMs:clip.manifest.frames.map(x=>x.ms),
      loop:clip.manifest.loop!==false,layout:"activity-native",action:clip,ch};
  }
  if(published)return published;
  const part=Object.keys(clip.layers||{})[0]||clip.manifest.requiredParts?.[0];
  const url=part&&Store.layerUrl(id,part);
  return url?{url,frames:clip.manifest.frames.length,frameMs:clip.manifest.frames.map(x=>x.ms),
   loop:clip.manifest.loop!==false,layout:"activity",action:clip}:null;
 }
 return null;
}
function ref(){
 const row=current();return row?refFor(actor(row.characterId),row[state.phase]||"native:idle"):null;
}
function getImage(url){
 if(!state.cache.has(url))state.cache.set(url,new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Animation image unavailable"));img.src=url;
 }));return state.cache.get(url);
}
function drawObject(ctx){
 const key=$("object").value;ctx.save();ctx.fillStyle="#a8bacb";ctx.strokeStyle="#53647a";
 if(key==="chair"){ctx.fillRect(28,82,30,8);ctx.fillRect(28,58,6,30);ctx.fillRect(32,89,3,16);ctx.fillRect(52,89,3,16)}
 else if(key==="bed"){ctx.fillRect(4,78,56,16);ctx.fillRect(4,93,4,13);ctx.fillRect(56,93,4,13)}
 else if(key==="table"){ctx.fillRect(5,71,54,6);ctx.fillRect(10,78,4,30);ctx.fillRect(50,78,4,30)}
 else if(key==="toilet"){ctx.fillRect(20,82,27,14);ctx.fillRect(19,69,8,18)}
 else if(key==="vehicle"){ctx.fillRect(4,72,55,22);ctx.fillRect(12,93,10,10);ctx.fillRect(44,93,10,10)}
 else if(key==="door")ctx.strokeRect(16,12,32,88);
 ctx.restore();
}
const SCENE_W=576,SCENE_H=400,ACTOR_W=96,ACTOR_H=168;
function viewport(p){
 const cam=state.camera;
 return {x:(p.x-cam.x)/cam.zoom,y:(p.y-cam.y)/cam.zoom};
}
function eventCoords(e){
 const canvas=e.currentTarget,rect=canvas.getBoundingClientRect();
 return {x:(e.clientX-rect.left)*canvas.width/rect.width,
   y:(e.clientY-rect.top)*canvas.height/rect.height};
}
function zoomAt(value,anchor={x:SCENE_W/2,y:SCENE_H/2}){
 const cam=state.camera,z=Math.max(.5,Math.min(4,Math.round(value*4)/4));
 const prev=viewport(anchor);cam.zoom=z;
 cam.x=Math.round(anchor.x-prev.x*z);cam.y=Math.round(anchor.y-prev.y*z);
 $("scene-zoom").value=String(z*100);
 $("scene-zoom-value").textContent=Math.round(z*100)+"%";
 void render();
}
function drawGrid(ctx){
 if(!state.camera.grid)return;
 ctx.save();ctx.beginPath();ctx.strokeStyle="#8299b26b";ctx.lineWidth=1/state.camera.zoom;
 for(let x=0;x<=SCENE_W;x+=16){ctx.moveTo(x,0);ctx.lineTo(x,SCENE_H)}
 for(let y=0;y<=SCENE_H;y+=16){ctx.moveTo(0,y);ctx.lineTo(SCENE_W,y)}
 ctx.stroke();ctx.restore();
}
function worldTransform(ctx){
 ctx.setTransform(state.camera.zoom,0,0,state.camera.zoom,Math.round(state.camera.x),Math.round(state.camera.y));
 ctx.imageSmoothingEnabled=false;
}
function paintBackground(ctx){
 const {width:w,height:h}=ctx.canvas;
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);
 ctx.fillStyle="#e3ebf2";ctx.fillRect(0,0,w,h);
 ctx.save();worldTransform(ctx);
 ctx.fillStyle="#e3ebf2";ctx.fillRect(0,0,SCENE_W,SCENE_H);
 ctx.fillStyle="#c7d9b9";ctx.fillRect(0,SCENE_H-54,SCENE_W,54);
 const prop=document.createElement("canvas");prop.width=64;prop.height=112;drawObject(prop.getContext("2d"));
 // Nearest-neighbor sprites only. Fractional 1.5x enlargement made pixels
 // uneven; a native 64x112 sprite stays 1:1 at 100% scene zoom.
 ctx.drawImage(prop,246,95,64,112);
 drawGrid(ctx);ctx.restore();
}
async function render(){
 if(state.screen!=="editor")return;
 const ctx=$("action-canvas").getContext("2d"),token=++state.token;ctx.imageSmoothingEnabled=false;
 paintBackground(ctx);
 const row=current(),bound=ref();
 const n=Math.max(1,bound?.frames||1);state.frame=Math.min(state.frame,n-1);
 $("frame").max=String(n-1);$("frame").value=String(state.frame);$("frame-number").textContent=(state.frame+1)+" / "+n;
 $("preview-note").textContent=row?"ACTIVE "+actor(row.characterId).name+" · "+state.cast.length+" characters · "+state.phase.toUpperCase():"Add characters to the scene";
 const sprites=await Promise.all(state.cast.map(async m=>{
  const entry=actor(m.characterId),r=refFor(entry,m[state.phase]||"native:idle")||refFor(entry,"native:idle");
  if(!r)return {m,error:"No matching clip"};
  try{
   let img;if(r.layout==="base"){
    const key=JSON.stringify(r.ch);if(!state.sheets.has(key))state.sheets.set(key,V.sheet(r.ch,null,""));
    img=await state.sheets.get(key);
   }else if(r.layout==="universal"){
      img=await Motion.render(r.ch,r.action.manifest,state.frame%r.frames,m.dir,{
       partOverrides:r.assetParts,sourceKey:"action:"+entry.id+":"+r.assetVersion});
    }else if(r.layout==="activity-native"){
     img=await V.composeActivity(r.ch,r.action.manifest,state.frame%r.frames,m.dir);
     if(!img||img._disabled)return {m,error:img?._avail?.note||"Selected appearance has unsupported stock layers"};
   }else img=await getImage(r.url);
   return {m,entry,r,img};
  }catch(e){return {m,error:e.message}}
 }));
 if(token!==state.token||state.screen!=="editor")return;
 paintBackground(ctx);ctx.save();worldTransform(ctx);
 for(const s of sprites){
  const m=s.m,di=Math.max(0,DIRS.indexOf(m.dir)),x=m.x,y=m.y;
  const px=x+16,py=y+56;
  if(s.img&&s.r){
   if(s.r.layout==="activity-native"||s.r.layout==="universal"){
     ctx.drawImage(s.img,0,0,64,112,px,py,64,112);
   }else{
    const n=state.frame%s.r.frames,origin=s.r.layout==="activity"?(Number(s.r.action.manifest.bandStart)||0)+di:
     s.r.layout==="base"?V.ROWS[s.r.action.id]+di:di;
    ctx.drawImage(s.img,n*64,origin*112,64,112,px,py,64,112);
   }
  }else{ctx.fillStyle="#b15b60";ctx.fillRect(px,py,64,112)}
  if(m.instance===state.active){ctx.lineWidth=2;ctx.strokeStyle="#2463b4";ctx.strokeRect(x-2,y-2,100,172);
   ctx.fillStyle="#10467f";ctx.fillRect(x,y-17,Math.min(165,Math.max(85,(s.entry?.name||"CHARACTER").length*7)),16);
   ctx.fillStyle="white";ctx.font="11px Tahoma";ctx.fillText(s.entry?.name||"CHARACTER",x+3,y-5)}
 }
 ctx.restore();
}
function drawCast(){
 const host=$("cast-list");host.replaceChildren();
 for(const m of state.cast){
  const b=document.createElement("button");b.textContent=actor(m.characterId).name+" · "+m.dir.toUpperCase();
  b.setAttribute("aria-pressed",String(m.instance===state.active));
  b.onclick=()=>{stop();state.active=m.instance;drawCast();void render()};host.append(b);
 }
 syncControls();
}
function syncControls(){
 const m=current();if(!m)return;
 $("actor").value=m.characterId;$("dir").value=m.dir;
 for(const p of PHASES)$("phase-"+p).value=m[p]||"";
 $("offset-x").value=m.x;$("offset-y").value=m.y;
}
function fillForm(row){
 const value=row||blank();
 $("action-id").value=value.id;$("action-name").value=value.name;
 $("trigger").value=value.trigger||"interact";$("object").value=value.object||"any";
 $("notes").value=value.notes||"";
 state.selected=state.rows.some(r=>r.id===value.id)?value.id:null;
 state.cast=Array.isArray(value.actors)&&value.actors.length?clone(value.actors):
  value.characterId?[{...member(value.characterId,0),x:Number(value.offsetX)||45,y:Number(value.offsetY)||155,
    enter:value.enter||"",loop:value.loop||"native:idle",exit:value.exit||""}]:[];
 state.active=state.cast[0]?.instance||"";state.frame=0;drawCast();
}
function readForm(){
 const id=$("action-id").value.trim().toLowerCase().replace(/\s+/g,"_");
 if(!safeId(id))throw Error("Action ID must start with a letter and use 2–48 lowercase letters/numbers/underscores");
 const name=$("action-name").value.trim();if(!name)throw Error("Enter an action name");
 if(!state.cast.length)throw Error("Add at least one character");
 const m=current();
 return {id,name,trigger:$("trigger").value,object:$("object").value,actors:clone(state.cast),
  characterId:m.characterId,enter:m.enter,loop:m.loop,exit:m.exit,offsetX:m.x,offsetY:m.y,
  notes:$("notes").value.slice(0,400),status:"draft_unapproved"};
}
function saveLocal(){
 const row=readForm(),index=state.rows.findIndex(x=>x.id===state.selected);
 if(state.rows.some((r,i)=>r.id===row.id&&i!==index))throw Error("Action ID already exists");
 if(index<0){if(state.rows.length>=150)throw Error("Action limit 150");state.rows.unshift(row)}
 else state.rows[index]=row;
 state.selected=row.id;persist();return row;
}
async function save(){
 try{
  stop();const bridge=root.parent!==root&&root.parent?.VLMahlukWorkspace;
  if(!bridge?.isOnline?.())throw Error("Connect Google Drive in MAHLUK toolbar before Save Online");
  const row=readForm(),receipt=await bridge.saveOnline("action",row.id,row);
  if(!receipt.verified)throw Error("Drive write not verified");
  const index=state.rows.findIndex(x=>x.id===row.id);
  if(index>=0)state.rows[index]=row;else state.rows.unshift(row);
  state.selected=row.id;persist();
  home("CLOUD VERIFIED · "+row.name+" · "+row.actors.length+" characters");
 }catch(error){status("SAVE ONLINE FAILED: "+error.message,true)}
}
async function refreshCloud(){
 const bridge=root.parent!==root&&root.parent?.VLMahlukWorkspace;
 if(!bridge?.isOnline?.())return;
 try{
  const [rows,characters,motions]=await Promise.all([
    bridge.listOnline("action"),bridge.listOnline("character"),bridge.listOnline("animation")
  ]);
  state.onlineCharacters=characters;
  for(const clip of motions)try{Store.importCloudRecord(clip)}catch{}
  refreshActors();refreshOptions();
  const combined=new Map(state.rows.map(x=>[x.id,x]));
  for(const row of rows)if(row?.id&&safeId(row.id))combined.set(row.id,row);
  state.rows=[...combined.values()];
  if(state.screen==="home")drawGallery();
  $("action-home-note").textContent="ONLINE DATABASE · "+rows.length+" actions loaded";
 }catch(error){$("action-home-note").textContent="Cloud load failed: "+error.message}
}
function selectPhase(p){
 stop();state.phase=p;state.frame=0;
 document.querySelectorAll("[data-phase]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.phase===p)));
 void render();
}
function tick(){
 const r=ref();if(!state.playing||!r)return;
 const ms=Math.max(40,Math.min(800,Number(r.frameMs[state.frame%r.frames])||180));
 state.timer=setTimeout(()=>{if(!state.playing)return;
  if(state.frame+1>=r.frames){if(!r.loop){stop();return}state.frame=0}else state.frame++;
  void render();tick();
 },ms);
}
function togglePlay(){if(state.playing)return stop();if(!current())return;state.playing=true;$("play").textContent="❚❚ PAUSE";tick()}
function refreshOptions(){
 const options=[{value:"",label:"— NONE —"}];
 for(const id of ["idle","walk","talk","sit","sit_type","sleep","tired","swim","float","lie","perch"])
  options.push({value:"native:"+id,label:"NATIVE / "+id.toUpperCase()});
 for(const c of Store?.list()||[])options.push({value:"clip:"+c.id,
  label:(MotionContract?.isUniversal(c.manifest)?MotionContract.isStock(c.manifest)?"STOCK / ":"MOTION DRAFT / ":
   c.origin==="pilot"?"STOCK / ":"USER / ")+c.name.toUpperCase()+" · "+c.manifest.frames.length+" FR"});
 for(const phase of PHASES){
  const select=$("phase-"+phase);select.replaceChildren();
  for(const item of options){const o=document.createElement("option");o.value=item.value;o.textContent=item.label;select.append(o)}
 }
 syncControls();
}
function exportData(){
 const txt=JSON.stringify({format:FORMAT,items:state.rows},null,2),url=URL.createObjectURL(new Blob([txt],{type:"application/json"}));
 const a=document.createElement("a");a.href=url;a.download="mahluk-action-situations.json";document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function wire(){
 state.rows=load();refreshActors();refreshOptions();
 $("action-start-new").onclick=()=>{state.cast=[];state.active="";fillForm(blank());show("choose")};
 $("action-start-gallery").onclick=()=>home();
 $("action-start-modify").onclick=()=>{$("action-home-heading").textContent="MODIFY · SELECT AN ACTION BELOW";
  $("action-home-note").textContent="Select an action from the database to modify.";drawGallery()};
 $("choose-add").onclick=()=>addCast($("choose-actor").value,true);
 $("choose-back").onclick=()=>home();
 $("choose-next").onclick=()=>{if(!state.cast.length)return $("choose-cast-list").textContent="Choose at least one character first.";
  show("editor")};
 $("action-editor-back").onclick=()=>home("Unsaved changes remain only in this editor session.");
 $("cast-add").onclick=()=>addCast($("actor").value,false);
 $("cast-remove").onclick=()=>{const m=current();if(!m)return;
  state.cast=state.cast.filter(x=>x.instance!==m.instance);state.active=state.cast[0]?.instance||"";
  drawCast();void render()};
 $("actor").onchange=()=>{const m=current();if(m){m.characterId=$("actor").value;state.sheets.clear();drawCast();void render()}};
 $("refresh-actors").onclick=()=>{refreshActors();drawCast();void render()};
 $("dir").onchange=()=>{const m=current();if(m){m.dir=$("dir").value;drawCast();void render()}};
 for(const p of PHASES)$("phase-"+p).onchange=()=>{const m=current();if(m)m[p]=$("phase-"+p).value;stop();state.frame=0;void render()};
 document.querySelectorAll("[data-phase]").forEach(b=>b.onclick=()=>selectPhase(b.dataset.phase));
 $("object").onchange=()=>void render();
 for(const id of ["offset-x","offset-y"])$(id).oninput=()=>{const m=current();if(!m)return;
  m.x=Math.max(0,Math.min(480,Math.round(Number($("offset-x").value)||0)));
  m.y=Math.max(0,Math.min(232,Math.round(Number($("offset-y").value)||0)));void render()};
 $("save").onclick=()=>void save();$("action-save-sync").onclick=()=>void save();
 $("edit-motion").onclick=()=>{
  const m=current();if(!m)return;
  if(root.parent!==root&&root.parent.VLMahlukWorkspace)root.parent.VLMahlukWorkspace.show("animation");
  else location.href="./mahluk-animation-studio.html";
 };
 $("new").onclick=()=>{fillForm(blank());show("choose")};
 $("duplicate").onclick=()=>{const row=readForm();fillForm({...row,id:"action_"+Date.now().toString(36),name:row.name+" Copy"});show("editor")};
 $("delete").onclick=()=>{if(!state.selected||!root.confirm("Delete this local action draft?"))return;
  state.rows=state.rows.filter(x=>x.id!==state.selected);persist();home("Action removed locally.")};
 $("export").onclick=exportData;
 $("play").onclick=togglePlay;
 $("prev").onclick=()=>{stop();state.frame=Math.max(0,state.frame-1);void render()};
 $("next").onclick=()=>{stop();state.frame=Math.min((ref()?.frames||1)-1,state.frame+1);void render()};
 $("frame").oninput=()=>{stop();state.frame=Number($("frame").value)||0;void render()};
 $("scene-zoom").oninput=()=>zoomAt(Number($("scene-zoom").value)/100);
 $("scene-zoom-in").onclick=()=>zoomAt(state.camera.zoom+.25);
 $("scene-zoom-out").onclick=()=>zoomAt(state.camera.zoom-.25);
 $("scene-fit").onclick=()=>{
  state.camera.zoom=1;state.camera.x=0;state.camera.y=0;
  $("scene-zoom").value="100";$("scene-zoom-value").textContent="100%";
  void render();
 };
 $("scene-grid").onchange=()=>{state.camera.grid=$("scene-grid").checked;void render()};
 const stage=$("action-canvas");
 stage.addEventListener("wheel",e=>{
  e.preventDefault();
  zoomAt(state.camera.zoom+(e.deltaY<0?.25:-.25),eventCoords(e));
 },{passive:false});
 stage.addEventListener("pointerdown",e=>{
  const p=eventCoords(e),w=viewport(p);
  state.pointers.set(e.pointerId,p);
  if(state.pointers.size===2){
   const [a,b]=[...state.pointers.values()];
   state.pinch={distance:Math.hypot(b.x-a.x,b.y-a.y),zoom:state.camera.zoom};
   state.drag=null;
  }else{
   const hit=[...state.cast].reverse().find(m=>w.x>=m.x&&w.x<=m.x+ACTOR_W&&w.y>=m.y&&w.y<=m.y+ACTOR_H);
   if(hit){state.active=hit.instance;drawCast();
    state.drag={type:"actor",id:hit.instance,dx:w.x-hit.x,dy:w.y-hit.y};
   }else state.drag={type:"pan",x:p.x,y:p.y,ox:state.camera.x,oy:state.camera.y};
  }
  stage.setPointerCapture(e.pointerId);void render();
 });
 stage.addEventListener("pointermove",e=>{
  const p=eventCoords(e);
  if(state.pointers.has(e.pointerId))state.pointers.set(e.pointerId,p);
  if(state.pointers.size>=2&&state.pinch){
   const [a,b]=[...state.pointers.values()],distance=Math.hypot(b.x-a.x,b.y-a.y);
   const center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
   zoomAt(state.pinch.zoom*distance/Math.max(1,state.pinch.distance),center);
   return;
  }
  if(!state.drag)return;
  if(state.drag.type==="pan"){
   state.camera.x=Math.round(state.drag.ox+p.x-state.drag.x);
   state.camera.y=Math.round(state.drag.oy+p.y-state.drag.y);
  }else{
   const m=state.cast.find(v=>v.instance===state.drag.id);if(!m)return;
   const w=viewport(p);
   m.x=Math.max(0,Math.min(SCENE_W-ACTOR_W,Math.round(w.x-state.drag.dx)));
   m.y=Math.max(0,Math.min(SCENE_H-ACTOR_H,Math.round(w.y-state.drag.dy)));
   syncControls();
  }
  void render();
 });
 for(const t of ["pointerup","pointercancel"])stage.addEventListener(t,e=>{
  state.pointers.delete(e.pointerId);
  if(state.pointers.size<2)state.pinch=null;
  state.drag=null;
 });
 document.addEventListener("visibilitychange",()=>{if(document.hidden)stop()});
 root.addEventListener("message",e=>{
  if(e.origin===location.origin&&e.data?.type==="mahluk:cloud-connected")void refreshCloud();
 });
 home();void refreshCloud();
}
root.VLMahlukActionEditor=Object.freeze({load,persist,KEY,FORMAT});
wire();
})(window);
