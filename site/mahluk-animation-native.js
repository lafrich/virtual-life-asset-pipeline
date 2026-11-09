/* Mahluk Genesis V6B Python Animation Editor.
 * Declarative native Python poses on approved Genesis sources. Editable puppet\n * masks are stored only in the two stable Genesis master IDs.
 */
(function(root){"use strict";
const C=root.GenesisNativePythonContract,$=id=>document.getElementById(id),
 Master=root.GenesisMasterRig,Puppet=root.GenesisPuppetRenderer,Clipboard=root.GenesisPoseClipboard;
if(!C){document.body.textContent="Genesis native contract unavailable";return;}
const STAGE=$("stage"),ctx=STAGE.getContext("2d");
ctx.imageSmoothingEnabled=false;
let draft=null,dir="se",frame=0,gender="male",joint="hand_near",angle="elbow_near";
let preview=null,rendered=false,timer=0,playing=false,serial=0,editVersion=0;
let copied=null;const genesisSheets=new Map();
let frameCache=new Map(),dragging=null,verifiedSrc="",saved=false,cacheKey="",galleryRevision=0;
const bridge=()=>{try{return root.parent!==root?root.parent.VLMahlukWorkspace:null;}catch{return null}};
const clone=x=>JSON.parse(JSON.stringify(x));
function message(text,error=false){$("status").textContent=text;$("status").classList.toggle("error",!!error)}
function show(screen){
 stop();
 for(const x of ["home","setup","editor"])$(x).hidden=x!==screen;
 if(screen==="editor")rebuild();else if(screen==="home")void gallery();
}
function notifyOnline(){const b=bridge();return !!b?.isOnline?.()}
function updateActions(){
 $("save-cloud").disabled=!draft||!rendered||!notifyOnline()||saved;
 $("save-cloud").textContent=saved?"✓ SAVED TO CLOUD":"☁ SAVE PYTHON TO CLOUD";
}
function begin(data){
 draft=C.validate(data);dir="se";frame=0;gender="male";joint="hand_near";angle="elbow_near";
 preview=null;rendered=false;verifiedSrc="";saved=false;frameCache.clear();editVersion++;
 show("editor");message("Starting Genesis master puppet preview…");requestRender();
}
function newFromSetup(){
 try{
  const name=$("setup-name").value.trim(),template=$("template").value;
  const count=Number($("setup-count").value),ms=Number($("setup-duration").value);
  begin(C.make({name,template,frameCount:count,ms,loop:$("setup-loop").checked}));
 }catch(error){$("setup-name").setCustomValidity(error.message);$("setup-name").reportValidity();$("setup-name").setCustomValidity("")}
}
async function fromFile(file){
 if(!file)return;
 if(!/\.py$/i.test(file.name)||file.size>200000)throw Error("Upload a Genesis native .py file under 200 KB");
 const data=C.fromPython(await file.text());
 begin(data);message("Imported "+file.name+". Rendering with approved Genesis master…");
}
function current(){return draft.poses[dir][frame]}
function setEdited(){
 rendered=false;verifiedSrc="";saved=false;editVersion++;frameCache.clear();
 updateActions();rebuild();requestRender();
}
function bounds(x,y){return {x:Math.max(0,Math.min(63,Math.round(x))),y:Math.max(0,Math.min(111,Math.round(y)))}}
function updateJoint(){
 const p=current();const xy=p.joints[joint];
 $("selected-joint").value=joint;$("joint-x").value=xy.x;$("joint-y").value=xy.y;
 $("angle-select").value=angle;$("angle-slider").value=p.angles[angle];$("angle-number").value=p.angles[angle];
 for(const b of $("joint-list").querySelectorAll("button"))b.setAttribute("aria-pressed",String(b.dataset.joint===joint));
}
const LINKS=[
 ["head","neck"],["neck","torso"],["torso","hip_near"],["torso","hip_far"],
 ["shoulder_near","elbow_near"],["elbow_near","hand_near"],
 ["shoulder_far","elbow_far"],["elbow_far","hand_far"],
 ["hip_near","knee_near"],["knee_near","foot_near"],
 ["hip_far","knee_far"],["knee_far","foot_far"]
];
function paint(){
 ctx.clearRect(0,0,64,112);ctx.imageSmoothingEnabled=false;
 if(preview?.complete&&preview.naturalWidth)ctx.drawImage(preview,0,0,64,112);
 if(!draft)return;
 const p=current();ctx.save();
 for(const [a,b] of LINKS){
  const u=p.joints[a],v=p.joints[b];ctx.beginPath();ctx.moveTo(u.x+.5,u.y+.5);ctx.lineTo(v.x+.5,v.y+.5);
  ctx.lineWidth=.7;ctx.strokeStyle=a.includes("far")?"#e0a433":"#2caee0";ctx.stroke();
 }
 for(const k of C.JOINTS){
  const pos=p.joints[k];
  ctx.fillStyle=k===joint?"#ff3d50":"#fff";
  ctx.strokeStyle="#172b54";ctx.lineWidth=.6;ctx.beginPath();ctx.arc(pos.x+.5,pos.y+.5,k===joint?2.4:1.4,0,Math.PI*2);ctx.fill();ctx.stroke();
 }
 ctx.restore();
}
async function renderGenesis(){
 const action=draft.template,model=Master.load(gender);
 if(!genesisSheets.has(gender))genesisSheets.set(gender,Puppet.genesisSheet(gender));
 const sheet=await genesisSheets.get(gender);
 const canvas=Puppet.render({sheet,template:action,direction:dir,
  frame,pose:clone(current()),profile:model});
 return canvas.toDataURL("image/png");
}
function requestRender(){
 if(!draft)return;
 const id=++serial,key=[editVersion,gender,dir,frame].join("|");
 cacheKey=key;rendered=false;verifiedSrc="";updateActions();
 if(frameCache.has(key)){showImage(frameCache.get(key));return}
 preview=null;paint();
 message("Rendering "+gender.toUpperCase()+" GENESIS MASTER · "+dir.toUpperCase()+" · frame "+(frame+1));
 void renderGenesis().then(src=>{
  if(id!==serial)return;
  frameCache.set(key,src);showImage(src);
 }).catch(error=>{
  if(id!==serial)return;
  rendered=false;verifiedSrc="";updateActions();paint();
  genesisSheets.delete(gender);
  message("Genesis puppet preview failed: "+error.message,true);
 });
}
function showImage(src){
 const img=new Image(),expected=serial;
 img.onload=()=>{
  if(expected!==serial)return;
  preview=img;rendered=true;verifiedSrc=src;
  paint();updateActions();
  message("GENESIS MASTER PUPPET PREVIEW · "+gender.toUpperCase()+" · "+dir.toUpperCase()+
   " · FRAME "+(frame+1)+"/"+draft.frames.length+" · native template + Python joint pose · NOT installed");
 };
 img.onerror=()=>{rendered=false;updateActions();message("Genesis native renderer returned an unreadable PNG",true)};
 img.src=src;
}
function stop(){playing=false;clearTimeout(timer);$("play").textContent="▶ PLAY"}
function tick(){
 if(!playing)return;
 const ms=draft.frames[frame].ms;
 timer=setTimeout(()=>{
  if(!playing)return;
  if(frame===draft.frames.length-1&&!draft.loop){stop();return}
  frame=(frame+1)%draft.frames.length;rebuild();requestRender();tick();
 },ms);
}
function playback(){if(!draft)return;if(playing){stop();return}playing=true;$("play").textContent="❚❚ PAUSE";tick()}
function rebuild(){
 if(!draft)return;
 $("editor-title").textContent=draft.name+" · "+dir.toUpperCase()+" · F"+(frame+1);
 $("animation-name").value=draft.name;
 $("template-label").value=draft.template.toUpperCase();
 $("gender").value=gender;$("loop").checked=draft.loop;$("frame-ms").value=draft.frames[frame].ms;
 const dirs=$("direction-buttons");dirs.replaceChildren();
 for(const d of C.DIRS){
  const b=document.createElement("button");b.textContent=d.toUpperCase();b.setAttribute("aria-pressed",String(d===dir));
  b.onclick=()=>{stop();dir=d;preview=null;rebuild();requestRender()};dirs.append(b)
 }
 const timeline=$("timeline");timeline.replaceChildren();
 for(let i=0;i<draft.frames.length;i++){
  const b=document.createElement("button");b.textContent="F"+(i+1);b.setAttribute("aria-pressed",String(frame===i));
  b.onclick=()=>{stop();frame=i;preview=null;rebuild();requestRender()};timeline.append(b)
 }
 updateJoint();updateActions();paint();
}
function reviseJoint(value,axis){
 if(!draft)return;const n=Number(value);if(!Number.isFinite(n))return;
 const currentPos=current().joints[joint];
 currentPos[axis]=Math.max(0,Math.min(axis==="x"?63:111,Math.round(n)));setEdited();
}
function reviseAngle(value){
 if(!draft)return;const n=Number(value);if(!Number.isFinite(n))return;
 current().angles[angle]=Math.max(-180,Math.min(180,Math.round(n)));setEdited();
}
function addFrame(duplicate){
 if(draft.frames.length>=C.MAX_FRAMES)return message("Maximum 24 frames",true);
 const index=frame+1,was=clone(current());
 draft.frames.splice(index,0,{key:"",ms:draft.frames[frame].ms});
 for(const d of C.DIRS){
  const next=duplicate?clone(draft.poses[d][frame]):C.pose();
  draft.poses[d].splice(index,0,next);
 }
 for(let i=0;i<draft.frames.length;i++)draft.frames[i].key="f"+i;
 frame=index;setEdited();
}
function removeFrame(){
 if(draft.frames.length===1)return message("An animation must have at least 1 frame",true);
 draft.frames.splice(frame,1);for(const d of C.DIRS)draft.poses[d].splice(frame,1);
 draft.frames.forEach((f,i)=>f.key="f"+i);frame=Math.min(frame,draft.frames.length-1);setEdited();
}
function exportPython(){
 try{
  const source=C.toPython(draft),blob=new Blob([source],{type:"text/x-python"});
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download=draft.id+".py";document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);message("EXPORTED "+draft.id+".py · not installed");
 }catch(error){message("Export failed: "+error.message,true)}
}
async function saveCloud(){
 const b=bridge();
 if(!notifyOnline())return message("Connect Google Drive in Mahluk toolbar first",true);
 if(!rendered||!verifiedSrc)return message("Native Python preview must succeed before Save",true);
 try{
  const data=C.validate(draft);
  message("Saving native Python source to Drive…");
  const receipt=await b.saveOnline("animation",data.id,{
   ...clone(data),python:C.toPython(data),status:"source_saved_not_installed",savedAt:new Date().toISOString()
  });
  if(!receipt?.verified)throw Error("Cloud read-back verification failed");
  saved=true;updateActions();message("CLOUD VERIFIED · "+data.name+" · Python source saved · NOT installed into game");
 }catch(error){message("Cloud save failed: "+error.message,true)}
}
async function reloadGenesisMaster(){
 if(!notifyOnline())return;
 try{
  const count=Master.cloudRows(await bridge().listOnline("genesis"));
  if(count){
   frameCache.clear();genesisSheets.clear();
   root.V6PCompositor?.clearCache?.();
   if(draft)requestRender();
  }
 }catch(error){message("Genesis master cloud sync: "+error.message,true)}
}
async function gallery(){
 const token=++galleryRevision;
 const area=$("gallery");area.replaceChildren();
 if(!notifyOnline()){
  area.textContent="Connect Google Drive from Mahluk Hidup before loading saved native Python animations.";return
 }
 try{
  // Duplicate cloud files may exist after earlier Drive migrations. Show one
  // validated source per stable animation ID, preferring the newest save.
  const raw=(await bridge().listOnline("animation")).filter(r=>r?.format===C.FORMAT&&r?.python);
  const unique=new Map();
  for(const row of raw){
   const prior=unique.get(row.id);
   if(!prior||String(row.savedAt||"")>=String(prior.savedAt||""))unique.set(row.id,row);
  }
  if(token!==galleryRevision)return; // Ignore an older concurrent cloud reload.
  const rows=[...unique.values()];
  area.replaceChildren();
  for(const data of rows){
   try{C.fromPython(data.python)}catch{continue}
   const b=document.createElement("button");const label=document.createElement("strong");
   label.textContent=data.name;const info=document.createElement("small");
   info.textContent=data.template.toUpperCase()+" · "+data.frames.length+" FRAMES · SOURCE SAVED / NOT INSTALLED";
   b.append(label,info);b.onclick=()=>{try{begin(C.fromPython(data.python));saved=true;updateActions()}catch(e){$("home-note").textContent=e.message}};
   area.append(b);
  }
  if(!rows.length)area.textContent="No saved Python native animation sources yet.";
  $("home-note").textContent="Cloud gallery loaded: "+rows.length+" native Python source(s).";
 }catch(e){if(token===galleryRevision)area.textContent="Cloud read failed: "+e.message}
}
for(const name of C.TEMPLATES){
 const option=document.createElement("option");option.value=name;option.textContent=name.toUpperCase().replaceAll("_"," ");
 $("template").append(option);
}
for(const name of C.JOINTS){
 const b=document.createElement("button");b.dataset.joint=name;b.textContent=name.replaceAll("_"," ");
 b.onclick=()=>{joint=name;updateJoint();paint()};$("joint-list").append(b)
}
for(const a of C.ANGLES){
 const opt=document.createElement("option");opt.value=a;opt.textContent=a.replaceAll("_"," ");
 $("angle-select").append(opt)
}
$("start-create").onclick=()=>{show("setup");$("setup-name").value="";$("template").value="idle"};
$("start-import").onclick=()=>$("python-file").click();
$("python-file").onchange=e=>{const f=e.target.files?.[0];e.target.value="";
 void fromFile(f).catch(error=>{$("home-note").textContent="Import rejected: "+error.message})
};
$("setup-back").onclick=() =>show("home");
$("setup-continue").onclick=newFromSetup;
$("back-home").onclick=()=>show("home");
$("reload-gallery").onclick=()=>void gallery();
$("animation-name").onchange=e=>{draft.name=e.target.value.trim().slice(0,80);setEdited()};
$("gender").onchange=e=>{gender=e.target.value;preview=null;rebuild();requestRender()};
$("loop").onchange=e=>{draft.loop=e.target.checked;setEdited()};
$("frame-ms").onchange=e=>{const ms=Number(e.target.value);if(Number.isInteger(ms)&&ms>=40&&ms<=1200){draft.frames[frame].ms=ms;setEdited()}else rebuild()};
$("add-frame").onclick=()=>addFrame(false);$("copy-frame").onclick=()=>addFrame(true);
$("remove-frame").onclick=removeFrame;
$("joint-x").onchange=e=>reviseJoint(e.target.value,"x");
$("joint-y").onchange=e=>reviseJoint(e.target.value,"y");
$("angle-select").onchange=e=>{angle=e.target.value;updateJoint()};
$("angle-slider").onchange=e=>reviseAngle(e.target.value);
$("angle-number").onchange=e=>reviseAngle(e.target.value);
$("reset-joint").onclick=()=>{current().joints[joint]=clone(C.pose().joints[joint]);setEdited()};
$("reset-frame").onclick=()=>{draft.poses[dir][frame]=C.pose();setEdited()};
function copyPose(all=false){
 if(!draft)return;
 copied={all,from:dir,items:all?clone(draft.poses[dir]):[clone(current())]};
 message("COPIED "+(all?"ALL "+draft.frames.length+" FRAMES":"F"+(frame+1))+" · "+dir.toUpperCase()+" · select target direction");
}
function pastePose(flip=false,all=false){
 if(!draft||!copied)return message("COPY a Python pose first",true);
 if(all&&!copied.all)return message("COPY ALL FRAMES before PASTE ALL",true);
 try{
  if(all){
   draft.poses[dir]=Clipboard.pasteDirection(copied.items,draft.poses[dir],{mirrored:flip});
  }else{
   const source=copied.items[copied.all?Math.min(frame,copied.items.length-1):0];
   draft.poses[dir][frame]=Clipboard.paste(source,flip);
  }
  setEdited();
  message("PASTED "+(all?"ALL FRAMES":"F"+(frame+1))+(flip?" · FLIPPED":"")+
   " · "+copied.from.toUpperCase()+" → "+dir.toUpperCase());
 }catch(e){message("Paste failed: "+e.message,true)}
}
$("pose-copy").onclick=()=>copyPose(false);
$("pose-paste").onclick=()=>pastePose(false,false);
$("pose-paste-flip").onclick=()=>pastePose(true,false);
$("pose-copy-all").onclick=()=>copyPose(true);
$("pose-paste-all").onclick=()=>pastePose(false,true);
$("pose-paste-all-flip").onclick=()=>pastePose(true,true);
$("export-python").onclick=exportPython;
$("save-cloud").onclick=()=>void saveCloud();
$("prev-frame").onclick=()=>{stop();frame=Math.max(0,frame-1);rebuild();requestRender()};
$("next-frame").onclick=()=>{stop();frame=Math.min(draft.frames.length-1,frame+1);rebuild();requestRender()};
$("play").onclick=playback;
function coords(e){
 const r=STAGE.getBoundingClientRect();
 return {x:(e.clientX-r.left)*64/r.width,y:(e.clientY-r.top)*112/r.height};
}
STAGE.addEventListener("pointerdown",e=>{
 if(!draft)return;stop();
 const pt=coords(e),p=current().joints;
 let candidate=null,dist=Infinity;
 for(const key of C.JOINTS){
  const d=Math.hypot(pt.x-p[key].x,pt.y-p[key].y);
  if(d<dist){dist=d;candidate=key}
 }
 if(dist>8)return;
 joint=candidate;dragging={id:e.pointerId};STAGE.setPointerCapture(e.pointerId);updateJoint();paint();
});
STAGE.addEventListener("pointermove",e=>{
 if(!dragging||dragging.id!==e.pointerId||!draft)return;
 const pt=coords(e);current().joints[joint]=bounds(pt.x,pt.y);setEdited();
});
for(const type of ["pointerup","pointercancel"])STAGE.addEventListener(type,()=>{dragging=null});
root.addEventListener("message",e=>{
 if(e.origin!==location.origin)return;
 if(e.data?.type==="mahluk:cloud-connected"){void gallery();void reloadGenesisMaster()}
 if(e.data?.type==="mahluk:select-motion"&&e.data?.id){void gallery()}
 if(e.data?.type==="genesis:master-overwritten"){
  frameCache.clear();genesisSheets.clear();root.V6PCompositor?.clearCache?.();
  void reloadGenesisMaster();if(draft)requestRender()
 }
});
root.addEventListener("pagehide",stop);
root.addEventListener("storage",e=>{
 if(e.key===Master.KEY){
  frameCache.clear();genesisSheets.clear();root.V6PCompositor?.clearCache?.();
  if(draft)requestRender()
 }
});
show("home");
})(window);
