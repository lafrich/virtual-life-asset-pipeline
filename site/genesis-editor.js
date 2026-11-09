/* Two existing Genesis masters only: puppet/slice authoring and cloud overwrite. */
(function(root){"use strict";
const $=id=>document.getElementById(id),M=root.GenesisMasterRig,P=root.GenesisPuppetRenderer,
 C=root.GenesisNativePythonContract,V=root.V6PCompositor,Pixel=root.GenesisMasterPixel;
if(!M||!P||!C||!V){document.body.textContent="Genesis master dependencies missing";return}
let gender="male",dir="se",mode="puppet",profile=M.load(gender),sheet=null,selected="head",pivot="head",
 maskPart="head",sliceTool="select",clipboard=null,mouse=null,playTimer=0,working=false,dirty=false,revision=0,changeVersion=0,
 pixelEditor=null,pixelSession=null,pixelOpening=false;
const verifiedCloud={male:false,female:false};
const stage=$("stage"),viewport=$("stage-viewport"),ctx=stage.getContext("2d"),srcCtx=$("source-preview").getContext("2d");
let zoom=4,zoomFit=true,pan=false;
function cursor(){
 stage.style.cursor=pan?"grab":mode==="slice"?"crosshair":"default";
}
function fittedZoom(){
 return val(Math.floor(Math.min((viewport.clientWidth-12)/64,(viewport.clientHeight-12)/112)),1,16);
}
function setZoom(requested,{fit=false}={}){
 if(mouse)return;
 const previousW=stage.getBoundingClientRect().width||64*zoom;
 const previousH=stage.getBoundingClientRect().height||112*zoom;
 const centerX=previousW<=viewport.clientWidth?0.5:
  (viewport.scrollLeft+viewport.clientWidth/2)/previousW;
 const centerY=previousH<=viewport.clientHeight?0.5:
  (viewport.scrollTop+viewport.clientHeight/2)/previousH;
 zoom=val(requested,1,16);zoomFit=fit;
 // Explicit integer CSS pixels per native pixel keeps all brush coordinates exact.
 stage.style.width=String(64*zoom)+"px";
 stage.style.height=String(112*zoom)+"px";
 $("zoom").value=String(zoom);
 $("zoom-label").textContent=String(zoom*100)+"%";
 $("zoom-out").disabled=zoom<=1;
 $("zoom-in").disabled=zoom>=16;
 viewport.scrollLeft=Math.max(0,centerX*64*zoom-viewport.clientWidth/2);
 viewport.scrollTop=Math.max(0,centerY*112*zoom-viewport.clientHeight/2);
}
function setPan(value){
 pan=!!value;$("zoom-pan").setAttribute("aria-pressed",String(pan));cursor();
}
const bridge=()=>{try{return root.parent!==root?root.parent.VLMahlukWorkspace:null}catch{return null}};
const show=(s,err=false)=>{$("status").textContent=s;$("status").classList.toggle("error",!!err)};
function sourceLabel(){
 const info=M.inspect(gender);
 if(info.source==="invalid")return "LOCAL CACHE INVALID · "+info.error+" · do not overwrite";
 if(verifiedCloud[gender])return "DRIVE SYNCED · saved "+(profile.updated||"unknown time");
 if(info.source==="local")return "LOCAL CACHE (NOT VERIFIED AGAINST DRIVE) · saved "+(profile.updated||"unknown time");
 return "DEFAULT GENESIS (NOT YOUR LAST CLOUD SAVE) · CONNECT DRIVE and LOAD MASTER";
}
const val=(x,min,max)=>Math.max(min,Math.min(max,Math.round(Number(x)||0)));
function stop(){clearTimeout(playTimer);playTimer=0;$("play").textContent="▶ PLAY"}
function setMode(m){
 mode=m;$("mode-puppet").setAttribute("aria-pressed",String(m==="puppet"));
 $("mode-slice").setAttribute("aria-pressed",String(m==="slice"));
 $("puppet-tools").hidden=m!=="puppet";$("slice-tools").hidden=m!=="slice";
 cursor();
 $("preview-title").textContent=m==="puppet"?"ADJUST PUPPET / COORDINATES":"ADJUST SLICE / PIXEL MASK";
 paint();
}
function markEdited(){dirty=true;changeVersion++;$("save").textContent="☁ SAVE · OVERWRITE "+gender.toUpperCase();paint()}
function selectSliceTool(tool){
 if(tool!=="select"&&tool!=="unselect")return;
 sliceTool=tool;
 $("slice-select").setAttribute("aria-pressed",String(tool==="select"));
 $("slice-unselect").setAttribute("aria-pressed",String(tool==="unselect"));
 cursor();
 show(tool==="unselect"?"UNSELECT · erase only the blue selection for "+maskPart.toUpperCase()+"; native pixels remain unchanged":
  "SELECT / PAINT · mark pixels blue for "+maskPart.toUpperCase());
}
function jointInput(){
 const j=profile.joints[dir][selected],p=profile.pivots[dir][pivot];
 $("joint-name").value=selected;$("joint-x").value=j.x;$("joint-y").value=j.y;
 $("pivot-name").value=pivot;$("pivot-x").value=p.x;$("pivot-y").value=p.y;
 for(const b of $("joints").querySelectorAll("button"))b.setAttribute("aria-pressed",String(b.dataset.joint===selected));
}
function probePose(){
 const p=C.pose(),intensity=Number($("probe").value)/100;
 p.joints.hand_near.x+=Math.round(intensity*11);
 p.joints.hand_near.y-=Math.round(intensity*14);
 p.joints.elbow_near.x+=Math.round(intensity*5);
 p.joints.head.x+=Math.round(intensity*2);
 p.angles.elbow_near=Math.round(intensity*30);
 p.angles.head=Math.round(intensity*12);
 return p;
}
function paint(){
 if(!sheet)return;
 const action=$("native-action").value,f=Math.max(0,Number($("native-frame").value)-1);
 const original=P.nativeFrame(sheet,action,dir,f);
 srcCtx.clearRect(0,0,64,112);srcCtx.drawImage(original,0,0);
 const changed=P.render({sheet,template:action,direction:dir,frame:f,pose:probePose(),profile});
 ctx.clearRect(0,0,64,112);ctx.drawImage(changed,0,0);
 ctx.save();
 const mask=M.decode(profile.masks[dir]),partIndex=M.PARTS.indexOf(maskPart);
 if(mode==="slice"){
  ctx.fillStyle="rgba(36,187,255,.32)";
  for(let i=0;i<mask.length;i++)if(mask[i]===partIndex)ctx.fillRect(i%64,(i/64)|0,1,1);
  // Unselected areas have NO overlay: this is an eraser for blue selection,
  // not another colored mask layer. Keep underlying Genesis pixels visible.
 }else{
  for(const [a,b] of [["head","neck"],["neck","torso"],["torso","hip_near"],["torso","hip_far"],
   ["shoulder_near","elbow_near"],["elbow_near","hand_near"],["shoulder_far","elbow_far"],["elbow_far","hand_far"],
   ["hip_near","knee_near"],["knee_near","foot_near"],["hip_far","knee_far"],["knee_far","foot_far"]]){
    const u=profile.joints[dir][a],v=profile.joints[dir][b];
    ctx.beginPath();ctx.moveTo(u.x+.5,u.y+.5);ctx.lineTo(v.x+.5,v.y+.5);
    ctx.strokeStyle=a.includes("far")?"#efa926":"#29bded";ctx.lineWidth=.8;ctx.stroke();
  }
  for(const name of C.JOINTS){
    const j=profile.joints[dir][name];ctx.beginPath();ctx.arc(j.x+.5,j.y+.5,name===selected?2.7:1.5,0,Math.PI*2);
    ctx.fillStyle=name===selected?"#ff3c5d":"white";ctx.strokeStyle="#15345b";ctx.fill();ctx.stroke();
  }
  const p=profile.pivots[dir][pivot];ctx.strokeStyle="#f022b8";
  ctx.beginPath();ctx.moveTo(p.x-3,p.y);ctx.lineTo(p.x+3,p.y);
  ctx.moveTo(p.x,p.y-3);ctx.lineTo(p.x,p.y+3);ctx.stroke();
 }
 ctx.restore();
}
async function reloadSheet(){
 const serial=++revision;stop();sheet=null;show("Loading approved Genesis "+gender+" Custom Wear…");
 try{
  const next=await P.genesisSheet(gender);
  if(serial!==revision)return;
  sheet=next;paint();show("GENESIS "+gender.toUpperCase()+" · "+sourceLabel(),M.inspect(gender).source==="invalid");
 }catch(e){if(serial===revision){sheet=null;show("GENESIS SOURCE FAILED: "+e.message,true)}}
}
function changeGender(next){
 if(dirty&&!root.confirm("Discard unsaved Genesis "+gender+" edits?")){$("gender").value=gender;return}
 if(pixelEditor?.isOpen()){pixelEditor.close();pixelSession=null}
 Pixel?.clearPreview(gender);
 gender=next;changeVersion++;profile=M.load(gender);dir="se";$("dir").value=dir;
 refreshPixelParts();
 dirty=false;setFrame();jointInput();void reloadSheet();
}
function setFrame(){
 const action=$("native-action").value,n=V.FRAMES[action];
 $("native-frame").max=String(n);
 $("native-frame").value=String(Math.min(n,Math.max(1,Number($("native-frame").value)||1)));
 paint();
}
function coords(e){
 const r=stage.getBoundingClientRect();
 return {x:val(Math.floor((e.clientX-r.left)*64/r.width),0,63),y:val(Math.floor((e.clientY-r.top)*112/r.height),0,111)}
}
function editPixel(point){
 const mask=M.decode(profile.masks[dir]),size=Number($("brush").value),idx=M.PARTS.indexOf(maskPart);
 const radius=Math.floor(size/2);
 let changed=false;
 for(let y=Math.max(0,point.y-radius);y<=Math.min(111,point.y+radius);y++)
 for(let x=Math.max(0,point.x-radius);x<=Math.min(63,point.x+radius);x++){
  if(Math.hypot(x-point.x,y-point.y)>radius+.3)continue;
  const at=y*64+x;
  // Unselect ONLY erases the blue mask of the currently selected body part.
  // Do not silently erase ownership of other head/arm/torso/leg pieces.
  const next=sliceTool==="unselect"?M.UNSELECTED:idx;
  if(sliceTool==="unselect"&&mask[at]!==idx)continue;
  if(mask[at]!==next){mask[at]=next;changed=true}
 }
 if(changed){profile.masks[dir]=M.encode(mask);markEdited()}
}
stage.addEventListener("pointerdown",e=>{
 if(!sheet)return;
 if(pan){
  mouse={id:e.pointerId,kind:"pan",x:e.clientX,y:e.clientY,
   left:viewport.scrollLeft,top:viewport.scrollTop};
  stage.setPointerCapture(e.pointerId);
  stage.style.cursor="grabbing";
  return;
 }
 const p=coords(e);
 if(mode==="slice"){mouse={id:e.pointerId};editPixel(p)}
 else{
  let best=Infinity,nearest=null;
  for(const k of C.JOINTS){
   const j=profile.joints[dir][k],dist=Math.hypot(j.x-p.x,j.y-p.y);
   if(dist<best){best=dist;nearest=k}
  }
  if(best>9)return;
  selected=nearest;mouse={id:e.pointerId};profile.joints[dir][selected]={x:p.x,y:p.y};
  jointInput();markEdited();
 }
 stage.setPointerCapture(e.pointerId);
});
stage.addEventListener("pointermove",e=>{
 if(!mouse||mouse.id!==e.pointerId)return;
 if(mouse.kind==="pan"){
  viewport.scrollLeft=mouse.left+mouse.x-e.clientX;
  viewport.scrollTop=mouse.top+mouse.y-e.clientY;
  return;
 }
 const p=coords(e);
 if(mode==="slice")editPixel(p);
 else{profile.joints[dir][selected]={x:p.x,y:p.y};jointInput();markEdited()}
});
for(const type of ["pointerup","pointercancel"])stage.addEventListener(type,()=>{mouse=null;cursor()});
function saveLocalBackup(){
 const bytes=JSON.stringify(M.validate(profile),null,2),u=URL.createObjectURL(new Blob([bytes],{type:"application/json"}));
 const a=document.createElement("a");a.href=u;a.download=profile.id+".rig-backup.json";a.click();
 setTimeout(()=>URL.revokeObjectURL(u),15000);
 show("Rig backup downloaded. Cloud master unchanged.");
}
async function loadCloud(){
 const b=bridge();if(!b?.isOnline?.())throw Error("Connect Drive in Mahluk toolbar");
 if(working)return;
 if(dirty&&!root.confirm("Unsaved edits exist. Export backup before replacing them from Drive. Reload saved master?"))return;
 const version=changeVersion,currentGender=gender;
 show("READING LAST SAVED MASTER FROM DRIVE · no writes…");
 const rows=await b.listOnline("genesis");
 if(version!==changeVersion||currentGender!==gender||working||dirty){
  show("DRIVE LOAD CANCELLED · edits on screen were preserved. Save backup before reloading.");return;
 }
 // Do not silently substitute the built-in default when Drive has no record.
 const active=rows.filter(x=>x?.id===M.IDS[gender])
  .sort((a,b)=>String(b.updated).localeCompare(String(a.updated)))[0];
 if(!active){
  verifiedCloud[gender]=false;
  show("NO "+M.IDS[gender]+" RECORD ON DRIVE · "+sourceLabel()+
   " · No data was changed.",true);
  return;
 }
 const local=M.inspect(gender);
 if(local.source==="invalid"){
  show("LOCAL GENESIS CACHE INVALID · "+local.error+
   " · export or recover it before loading Drive. Nothing overwritten.",true);
  return;
 }
 if(M.newerThan(local.row,active)){
  verifiedCloud[gender]=false;
  show("LOCAL GENESIS SAVED REVISION IS NEWER THAN DRIVE ("+
   (local.row.updated||"unknown time")+") · kept local. Export backup before any overwrite.",true);
  return;
 }
 const count=M.cloudRows(rows);
 verifiedCloud[gender]=true;
 Pixel?.clearPreview(gender);V.clearCache();
 profile=M.load(gender);dirty=false;jointInput();
 await reloadSheet();
 show("LOADED FROM DRIVE · "+profile.id+" · saved "+(profile.updated||"unknown time")+
  " · "+count+" master(s) synced · original slicing restored.");
}
async function saveMaster(){
 if(working)return;const b=bridge();
 if(!b?.isOnline?.())return show("CONNECT DRIVE FIRST · this is "+sourceLabel()+". Nothing overwritten.",true);
 try{
  working=true;$("save").disabled=true;
  const version=changeVersion,genderAtSave=gender,prior=M.validate(profile);
  const valid=M.validate({...prior,updated:new Date().toISOString()});
  show("CHECKING EXISTING DRIVE MASTER BEFORE OVERWRITE…");
  const remote=await b.loadOnline("genesis",valid.id);
  if(remote){
   const verified=M.validate(remote);
   if(prior.updated!==verified.updated){
    show("SAVE BLOCKED · DRIVE HAS A DIFFERENT MASTER REVISION (saved "+
     (verified.updated||"unknown time")+"). Your current slicing was NOT overwritten. "+
     "Export BACKUP PROFILE.JSON, then LOAD MASTER CLOUD to compare.",true);
    return;
   }
  }
  if(!root.confirm("OVERWRITE "+valid.id+" ("+(remote?"existing cloud version":"first cloud record")+
   ") with these exact current joints, slices and pixel edits?"))return;
  show("WRITING "+valid.id+" TO DRIVE · verifying read-back…");
  const receipt=await b.saveOnline("genesis",valid.id,valid);
  if(!receipt?.verified)throw Error("Drive read-back did not verify Save");
  verifiedCloud[genderAtSave]=true;
  if(version!==changeVersion||genderAtSave!==gender){
   show("CLOUD VERIFIED · snapshot saved to Drive, but newer unsaved edits remain on screen. "+
    "Save again to include them.",true);
   return;
  }
  try{
   M.apply(valid);Pixel?.clearPreview(gender);profile=valid;dirty=false;paint();V.clearCache();
  }catch(localError){
   show("CLOUD VERIFIED · "+valid.id+" saved at "+valid.updated+
    ", but local cache failed: "+localError.message+". Reconnect Drive to reload.",true);
   return;
  }
  $("save").textContent="✓ MASTER OVERWRITTEN · "+gender.toUpperCase();
  show("CLOUD VERIFIED · "+valid.id+" · saved "+valid.updated+
   " · same-ID master overwritten. Reopen after connecting Drive to restore exactly this revision.");
  try{root.parent?.postMessage({type:"genesis:master-overwritten",gender:valid.gender,id:valid.id},root.location.origin)}catch{}
 }catch(error){show("MASTER SAVE FAILED: "+error.message+" · current edits remain on screen.",true)}
 finally{working=false;$("save").disabled=false}
}
function refreshPixelParts(){
 const select=$("pixel-part"),keep=select.value;
 select.replaceChildren();
 for(const part of Pixel?.parts(gender)||[]){
  const option=document.createElement("option");
  option.value=part;option.textContent=part.toUpperCase().replaceAll("/"," / ");
  select.append(option);
 }
 if([...select.options].some(o=>o.value===keep))select.value=keep;
}
function applyPixelSource(){
 const session=pixelSession;
 if(!session||!pixelEditor||session.gender!==gender)return false;
 try{
  const previous=M.validate(profile),source=session.source;
  const frames=Pixel.updatedFrames(session.gender,session.part,session.action,session.frame,
   pixelEditor.getAtlas(),source.clean,previous,source.nativeOriginal);
  const next=M.validate({...previous,pixelFrames:frames});
  profile=next;Pixel.preview(gender,profile);pixelSession=null;
  V.clearCache();markEdited();void reloadSheet();
  show("PIXEL EDIT APPLIED · "+session.part+" / "+session.action.toUpperCase()+
   " / FRAME "+(session.frame+1)+" · SAVE · OVERWRITE MASTER to sync Drive");
  return true;
 }catch(e){show("GENESIS PIXEL SAVE REJECTED: "+e.message,true);return false}
}
async function openPixelEditor(){
 if(pixelOpening||working)return;
 if(!sheet||!Pixel||!root.MH2PlanePixelEditor){
  show("Genesis source or shared Pixel Editor is not ready",true);return;
 }
 const session={
  gender,dir,part:$("pixel-part").value,action:$("native-action").value,
  frame:Math.max(0,Number($("native-frame").value)-1),version:changeVersion
 };
 if(!session.part)return show("Choose the source part to edit",true);
 pixelOpening=true;$("pixel-open").disabled=true;$("pixel-open-side").disabled=true;
 try{
  const source=await Pixel.atlases(session.gender,session.part,session.action,session.frame,profile);
  if(session.gender!==gender||session.dir!==dir||session.version!==changeVersion||
   session.action!==$("native-action").value||session.part!==$("pixel-part").value||
   session.frame!==Math.max(0,Number($("native-frame").value)-1))return;
  const references={};
  for(const d of Pixel.DIRS)
   references[d]=P.nativeFrame(sheet,session.action,d,session.frame);
  if(!pixelEditor){
   pixelEditor=root.MH2PlanePixelEditor.create({
    overlay:$("pixelOverlay"),canvas:$("pixelCanvas"),
    onApply:applyPixelSource,onSaveDefault:applyPixelSource,onRestore:()=>{},onDirectionChange:()=>{}
   });
  }
  pixelSession={...session,source};
  pixelEditor.open({
   id:session.gender+" / "+session.part+" / "+session.action+" / F"+(session.frame+1),
   initialAtlas:source.edited,originalAtlas:source.clean,
   referenceImages:references,direction:session.dir
  });
  $("pixelStatus").textContent="GENESIS "+session.gender.toUpperCase()+" · SOURCE "+session.part+
   " · F"+(session.frame+1)+" · APPLY then OVERWRITE MASTER";
 }catch(e){show("PIXEL EDITOR FAILED: "+e.message,true)}
 finally{pixelOpening=false;$("pixel-open").disabled=false;$("pixel-open-side").disabled=false}
}
for(const action of C.TEMPLATES){
 const option=document.createElement("option");option.value=action;option.textContent=action.toUpperCase();$("native-action").append(option);
}
for(const name of C.JOINTS){
 const b=document.createElement("button");b.dataset.joint=name;b.textContent=name.replaceAll("_"," ");b.onclick=()=>{selected=name;jointInput();paint()};$("joints").append(b);
}
for(const name of M.PARTS){
 for(const id of ["pivot-name","slice-part"]){const o=document.createElement("option");o.value=name;o.textContent=name.replaceAll("_"," ").toUpperCase();$(id).append(o)}
}
$("gender").onchange=e=>changeGender(e.target.value);
$("dir").onchange=e=>{dir=e.target.value;jointInput();paint()};
$("mode-puppet").onclick=()=>setMode("puppet");
$("mode-slice").onclick=()=>setMode("slice");
$("pixel-open").onclick=()=>void openPixelEditor();
$("pixel-open-side").onclick=()=>void openPixelEditor();
$("zoom-out").onclick=()=>setZoom(zoom-1);
$("zoom-in").onclick=()=>setZoom(zoom+1);
$("zoom").oninput=e=>setZoom(e.target.value);
$("zoom-fit").onclick=()=>setZoom(fittedZoom(),{fit:true});
$("zoom-pan").onclick=()=>setPan(!pan);
stage.addEventListener("keydown",e=>{
 if(e.key==="Escape"&&pan){setPan(false);e.preventDefault()}
 else if(e.key==="+"
  ||e.key==="="){setZoom(zoom+1);e.preventDefault()}
 else if(e.key==="-"){setZoom(zoom-1);e.preventDefault()}
});
viewport.addEventListener("wheel",e=>{
 if(!e.ctrlKey&&!e.metaKey)return;
 e.preventDefault();setZoom(zoom+(e.deltaY<0?1:-1));
},{passive:false});
if(root.ResizeObserver)new ResizeObserver(()=>{
 if(zoomFit&&!mouse)setZoom(fittedZoom(),{fit:true});
}).observe(viewport);
$("native-action").onchange=()=>{$("native-frame").value="1";setFrame()};
$("native-frame").onchange=setFrame;
$("probe").oninput=paint;
$("prev-frame").onclick=()=>{$("native-frame").value=String(Math.max(1,Number($("native-frame").value)-1));setFrame()};
$("next-frame").onclick=()=>{$("native-frame").value=String(Math.min(V.FRAMES[$("native-action").value],Number($("native-frame").value)+1));setFrame()};
$("play").onclick=()=>{
 if(playTimer){stop();return}
 $("play").textContent="❚❚ PAUSE";
 const next=()=>{if(!playTimer)return;$("native-frame").value=String(Number($("native-frame").value)%V.FRAMES[$("native-action").value]+1);paint();playTimer=setTimeout(next,175)};
 playTimer=setTimeout(next,175);
};
for(const [id,axis] of [["joint-x","x"],["joint-y","y"]])$(id).onchange=e=>{
 profile.joints[dir][selected][axis]=val(e.target.value,0,axis==="x"?63:111);jointInput();markEdited();
};
$("pivot-name").onchange=e=>{pivot=e.target.value;jointInput();paint()};
for(const [id,axis] of [["pivot-x","x"],["pivot-y","y"]])$(id).onchange=e=>{
 profile.pivots[dir][pivot][axis]=val(e.target.value,0,axis==="x"?63:111);jointInput();markEdited();
};
$("slice-part").onchange=e=>{maskPart=e.target.value;paint()};
$("slice-select").onclick=()=>selectSliceTool("select");
$("slice-unselect").onclick=()=>selectSliceTool("unselect");
$("mask-copy").onclick=()=>{clipboard=M.decode(profile.masks[dir]);show("MASK copied from "+dir.toUpperCase())};
$("mask-paste").onclick=()=>{if(!clipboard)return show("Copy a mask first",true);profile.masks[dir]=M.encode(clipboard);markEdited()};
$("mask-flip").onclick=()=>{
 if(!clipboard)return show("Copy a mask first",true);
 const reversed=new Uint8Array(7168);
 for(let y=0;y<112;y++)for(let x=0;x<64;x++){
  const src=clipboard[y*64+(63-x)];
  if(src===M.UNSELECTED){reversed[y*64+x]=M.UNSELECTED;continue}
  const part=M.PARTS[src];
  const opposite=part==="arm_l"?"arm_r":part==="arm_r"?"arm_l":part==="leg_l"?"leg_r":part==="leg_r"?"leg_l":part;
  reversed[y*64+x]=M.PARTS.indexOf(opposite);
 }
 profile.masks[dir]=M.encode(reversed);markEdited();
};
$("export").onclick=saveLocalBackup;
$("reset").onclick=()=>{
 if(!root.confirm("Reset unsaved rig of "+gender+" to original defaults? Cloud master will not change until Save."))return;
 profile=M.initial(gender);Pixel?.preview(gender,profile);V.clearCache();
 markEdited();jointInput();void reloadSheet();
};
$("save").onclick=()=>void saveMaster();
$("load-cloud").onclick=()=>void loadCloud().catch(e=>show(e.message,true));
root.addEventListener("message",e=>{
 if(e.origin===location.origin&&e.data?.type==="mahluk:cloud-connected"&&!dirty)
  void loadCloud().catch(error=>show("DRIVE LOAD FAILED: "+error.message+
   " · local/default shown, not the verified last save.",true));
});
root.addEventListener("pagehide",stop);
$("native-action").value="idle";$("pivot-name").value="head";$("slice-part").value="head";
refreshPixelParts();setZoom(fittedZoom(),{fit:true});setMode("puppet");jointInput();
void reloadSheet().then(()=>{
 // A previously connected parent can exist before the iframe subscribes.
 if(bridge()?.isOnline?.()&&!dirty)void loadCloud().catch(error=>
  show("DRIVE LOAD FAILED: "+error.message+" · "+sourceLabel(),true));
});
})(window);