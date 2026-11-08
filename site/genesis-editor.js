/* Two existing Genesis masters only: puppet/slice authoring and cloud overwrite. */
(function(root){"use strict";
const $=id=>document.getElementById(id),M=root.GenesisMasterRig,P=root.GenesisPuppetRenderer,
 C=root.GenesisNativePythonContract,V=root.V6PCompositor;
if(!M||!P||!C||!V){document.body.textContent="Genesis master dependencies missing";return}
let gender="male",dir="se",mode="puppet",profile=M.load(gender),sheet=null,selected="head",pivot="head",
 maskPart="head",clipboard=null,mouse=null,playTimer=0,working=false,dirty=false,revision=0;
const stage=$("stage"),ctx=stage.getContext("2d"),srcCtx=$("source-preview").getContext("2d");
const bridge=()=>{try{return root.parent!==root?root.parent.VLMahlukWorkspace:null}catch{return null}};
const show=(s,err=false)=>{$("status").textContent=s;$("status").classList.toggle("error",!!err)};
const val=(x,min,max)=>Math.max(min,Math.min(max,Math.round(Number(x)||0)));
function stop(){clearTimeout(playTimer);playTimer=0;$("play").textContent="▶ PLAY"}
function setMode(m){
 mode=m;$("mode-puppet").setAttribute("aria-pressed",String(m==="puppet"));
 $("mode-slice").setAttribute("aria-pressed",String(m==="slice"));
 $("puppet-tools").hidden=m!=="puppet";$("slice-tools").hidden=m!=="slice";
 $("preview-title").textContent=m==="puppet"?"ADJUST PUPPET / COORDINATES":"ADJUST SLICE / PIXEL MASK";
 paint();
}
function markEdited(){dirty=true;$("save").textContent="☁ SAVE · OVERWRITE "+gender.toUpperCase();paint()}
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
  sheet=next;paint();show("GENESIS "+gender.toUpperCase()+" · fixed master "+M.IDS[gender]+" · source: approved Genesis, not a sample character.");
 }catch(e){if(serial===revision){sheet=null;show("GENESIS SOURCE FAILED: "+e.message,true)}}
}
function changeGender(next){
 if(dirty&&!root.confirm("Discard unsaved Genesis "+gender+" edits?")){$("gender").value=gender;return}
 gender=next;profile=M.load(gender);dir="se";$("dir").value=dir;
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
 return {x:val((e.clientX-r.left)*64/r.width,0,63),y:val((e.clientY-r.top)*112/r.height,0,111)}
}
function editPixel(point){
 const mask=M.decode(profile.masks[dir]),size=Number($("brush").value),idx=M.PARTS.indexOf(maskPart);
 const radius=Math.floor(size/2);
 for(let y=Math.max(0,point.y-radius);y<=Math.min(111,point.y+radius);y++)
 for(let x=Math.max(0,point.x-radius);x<=Math.min(63,point.x+radius);x++)
  if(Math.hypot(x-point.x,y-point.y)<=radius+.3)mask[y*64+x]=idx;
 profile.masks[dir]=M.encode(mask);markEdited();
}
stage.addEventListener("pointerdown",e=>{
 if(!sheet)return;
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
 const p=coords(e);
 if(mode==="slice")editPixel(p);
 else{profile.joints[dir][selected]={x:p.x,y:p.y};jointInput();markEdited()}
});
for(const type of ["pointerup","pointercancel"])stage.addEventListener(type,()=>{mouse=null});
function saveLocalBackup(){
 const bytes=JSON.stringify(M.validate(profile),null,2),u=URL.createObjectURL(new Blob([bytes],{type:"application/json"}));
 const a=document.createElement("a");a.href=u;a.download=profile.id+".rig-backup.json";a.click();
 setTimeout(()=>URL.revokeObjectURL(u),15000);
 show("Rig backup downloaded. Cloud master unchanged.");
}
async function loadCloud(){
 const b=bridge();if(!b?.isOnline?.())throw Error("Connect Drive in Mahluk toolbar");
 show("Loading two fixed Genesis master IDs from Drive…");
 const rows=await b.listOnline("genesis");
 const count=M.cloudRows(rows);
 if(dirty&&!root.confirm("Reload saved Genesis rig and discard unsaved edits?"))return;
 profile=M.load(gender);dirty=false;jointInput();paint();
 show("Cloud master sync verified · "+count+" profile(s) · "+profile.id);
}
async function saveMaster(){
 if(working)return;const b=bridge();
 if(!b?.isOnline?.())return show("Connect Google Drive in Mahluk toolbar before overwriting Genesis master.",true);
 try{
  working=true;$("save").disabled=true;
  const valid=M.validate({...profile,updated:new Date().toISOString()});
  if(!root.confirm("OVERWRITE existing "+valid.id+" rig at the SAME ID? Original source sprites are preserved."))return;
  show("Overwriting "+valid.id+" rig profile in cloud and verifying…");
  const receipt=await b.saveOnline("genesis",valid.id,valid);
  if(!receipt?.verified)throw Error("Cloud did not verify overwrite");
  M.apply(valid);profile=valid;dirty=false;paint();
  $("save").textContent="✓ MASTER OVERWRITTEN · "+gender.toUpperCase();
  show("CLOUD VERIFIED · "+valid.id+" overwritten (not new character). Python and Animation use this Genesis master after reload.");
  try{root.parent?.postMessage({type:"genesis:master-overwritten",gender:valid.gender,id:valid.id},root.location.origin)}catch{}
 }catch(error){show("MASTER NOT OVERWRITTEN: "+error.message,true)}
 finally{working=false;$("save").disabled=false}
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
$("mask-copy").onclick=()=>{clipboard=M.decode(profile.masks[dir]);show("MASK copied from "+dir.toUpperCase())};
$("mask-paste").onclick=()=>{if(!clipboard)return show("Copy a mask first",true);profile.masks[dir]=M.encode(clipboard);markEdited()};
$("mask-flip").onclick=()=>{
 if(!clipboard)return show("Copy a mask first",true);
 const reversed=new Uint8Array(7168);
 for(let y=0;y<112;y++)for(let x=0;x<64;x++){
  const src=clipboard[y*64+(63-x)],part=M.PARTS[src];
  const opposite=part==="arm_l"?"arm_r":part==="arm_r"?"arm_l":part==="leg_l"?"leg_r":part==="leg_r"?"leg_l":part;
  reversed[y*64+x]=M.PARTS.indexOf(opposite);
 }
 profile.masks[dir]=M.encode(reversed);markEdited();
};
$("export").onclick=saveLocalBackup;
$("reset").onclick=()=>{
 if(!root.confirm("Reset unsaved rig of "+gender+" to original defaults? Cloud master will not change until Save."))return;
 profile=M.initial(gender);markEdited();jointInput();paint();
};
$("save").onclick=()=>void saveMaster();
$("load-cloud").onclick=()=>void loadCloud().catch(e=>show(e.message,true));
root.addEventListener("message",e=>{if(e.origin===location.origin&&e.data?.type==="mahluk:cloud-connected"&&!dirty)void loadCloud().catch(()=>{})});
root.addEventListener("pagehide",stop);
$("native-action").value="idle";$("pivot-name").value="head";$("slice-part").value="head";
setMode("puppet");jointInput();void reloadSheet();
})(window);