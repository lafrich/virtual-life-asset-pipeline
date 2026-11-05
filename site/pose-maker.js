/* Mahluk Hidup / Pose Maker.
 * Joint-driven four-direction Human Base motion authoring.
 * Drafts and rendered PNGs are browser-local; original atlases are immutable.
 */
(function(root,factory){
  "use strict";
  const api=factory(root);
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root){root.VLPoseMakerMotion=api;
    if(root.document)root.document.addEventListener("DOMContentLoaded",api.mount);
  }
})(typeof window!=="undefined"?window:null,function(root){
"use strict";
const KEY="virtual-life-human-pose-maker-v1";
const BASE_IDS=["human_male_base","human_female_base"];
const DIR=["se","sw","ne","nw"];
const BONES=[
 ["pelvis","spine"],["spine","chest"],["chest","neck"],["neck","head"],
 ["chest","shoulder_l"],["shoulder_l","elbow_l"],["elbow_l","wrist_l"],
 ["chest","shoulder_r"],["shoulder_r","elbow_r"],["elbow_r","wrist_r"],
 ["pelvis","hip_l"],["hip_l","knee_l"],["knee_l","ankle_l"],
 ["pelvis","hip_r"],["hip_r","knee_r"],["knee_r","ankle_r"]
];
const P0=Object.freeze({
 pelvis:[32,61,0],spine:[32,48,0],chest:[32,36,0],neck:[32,28,0],head:[32,16,0],
 shoulder_l:[20,37,0],elbow_l:[17,51,0],wrist_l:[18,65,0],
 shoulder_r:[44,37,0],elbow_r:[47,51,0],wrist_r:[46,65,0],
 hip_l:[26,64,0],knee_l:[26,80,0],ankle_l:[25,98,0],
 hip_r:[38,64,0],knee_r:[38,80,0],ankle_r:[39,98,0]
});
const CHILD={pelvis:["spine","chest","neck","head","shoulder_l","elbow_l","wrist_l","shoulder_r","elbow_r","wrist_r","hip_l","knee_l","ankle_l","hip_r","knee_r","ankle_r"],
 spine:["chest","neck","head","shoulder_l","elbow_l","wrist_l","shoulder_r","elbow_r","wrist_r"],
 chest:["neck","head","shoulder_l","elbow_l","wrist_l","shoulder_r","elbow_r","wrist_r"],
 neck:["head"],shoulder_l:["elbow_l","wrist_l"],shoulder_r:["elbow_r","wrist_r"],
 elbow_l:["wrist_l"],elbow_r:["wrist_r"],hip_l:["knee_l","ankle_l"],
 hip_r:["knee_r","ankle_r"],knee_l:["ankle_l"],knee_r:["ankle_r"]};
const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number(n)||0));
const clone=p=>Object.fromEntries(Object.entries(p).map(([k,v])=>[k,[...v]]));
const neutral=()=>clone(P0);
const validId=id=>typeof id==="string"&&/^poser_[a-z0-9_]{1,60}$/.test(id);
function normalized(p){
 const result=neutral();
 if(p&&typeof p==="object")for(const id of Object.keys(result)){
   if(Array.isArray(p[id])&&p[id].length===3&&p[id].every(Number.isFinite))
     result[id]=[clamp(p[id][0],-16,80),clamp(p[id][1],-10,125),clamp(p[id][2],-25,25)];
 }
 return result;
}
function interpolate(a,b,t){
 const res={};t=clamp(t,0,1);
 for(const id of Object.keys(P0))res[id]=[0,1,2].map(i=>a[id][i]*(1-t)+b[id][i]*t);
 return res;
}
function sample(keyframes,t){
 if(!Array.isArray(keyframes)||!keyframes.length)return neutral();
 const keys=[...keyframes].sort((a,b)=>a.at-b.at);
 if(t<=keys[0].at)return normalized(keys[0].pose);
 for(let i=1;i<keys.length;i++)if(t<=keys[i].at){
   const a=keys[i-1],b=keys[i];
   const u=(t-a.at)/Math.max(.00001,b.at-a.at);
   // smoothstep keeps idle loops gentle without shaking a joint.
   return interpolate(normalized(a.pose),normalized(b.pose),u*u*(3-2*u));
 }
 return normalized(keys[keys.length-1].pose);
}
function read(){
 try{
  const list=JSON.parse(root?.localStorage?.getItem(KEY)||"[]");
  return Array.isArray(list)?list.filter(x=>validId(x?.id)&&
   BASE_IDS.includes(x.base_id)&&typeof x.sheet==="string"&&
   x.sheet.startsWith("data:image/png;base64,")):[];
 }catch{return [];}
}
function listFor(baseId){
 if(!BASE_IDS.includes(baseId))return [];
 return read().filter(x=>x.base_id===baseId).map(x=>({
  id:x.id,name:x.name,category:"pose_maker",source:"custom",sheet:x.sheet,
  row:0,frames:x.frames,frame_ms:Array(x.frames).fill(Math.round(x.duration_ms/x.frames)),
  loop:true,available:true,playback:"authored",pose_maker:true
 }));
}
function store(entries){
 const kept=read().filter(x=>!entries.some(y=>y.id===x.id&&y.base_id===x.base_id));
 const all=[...kept,...entries];
 // Browser localStorage is finite. Do not destroy earlier saved work when full.
 root.localStorage.setItem(KEY,JSON.stringify(all));
 return all;
}
function slug(s){return String(s||"idle_pose").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,55)||"idle_pose";}
function move(p,id,dx,dy){
 if(!P0[id])return;
 const members=[id,...(CHILD[id]||[])];
 for(const k of members){p[k][0]=clamp(p[k][0]+dx,-16,80);p[k][1]=clamp(p[k][1]+dy,-10,125);}
 // Dragging a hand or foot acts like a small IK chain. A bend remains between
 // the anchored shoulder/hip and the moved wrist/ankle, not a detached limb.
 const ik={wrist_l:["shoulder_l","elbow_l"],wrist_r:["shoulder_r","elbow_r"],
   ankle_l:["hip_l","knee_l"],ankle_r:["hip_r","knee_r"]}[id];
 if(ik){
   const a=p[ik[0]],m=p[ik[1]],end=p[id],old=P0;
   const l1=Math.hypot(old[ik[1]][0]-old[ik[0]][0],old[ik[1]][1]-old[ik[0]][1]);
   const l2=Math.hypot(old[id][0]-old[ik[1]][0],old[id][1]-old[ik[1]][1]);
   let dx=end[0]-a[0],dy=end[1]-a[1],d=Math.max(.001,Math.hypot(dx,dy));
   const max=l1+l2-.05;if(d>max){dx*=max/d;dy*=max/d;d=max;end[0]=a[0]+dx;end[1]=a[1]+dy;}
   const along=(l1*l1-l2*l2+d*d)/(2*d);
   const height=Math.sqrt(Math.max(0,l1*l1-along*along));
   const side=id.endsWith("_l")?-1:1;
   m[0]=a[0]+dx*along/d-dy*height/d*side;
   m[1]=a[1]+dy*along/d+dx*height/d*side;
 }
}
function project(p,yaw){
 const r=yaw*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
 return {x:160+((p[0]-32)*c+p[2]*s)*3.5,
  y:15+p[1]*3.5+((p[0]-32)*s-p[2]*c)*.4};
}
function loadImage(src){
 return new Promise((resolve,reject)=>{
  const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error("Human Base atlas could not load"));
  im.src=src;
 });
}
// Texture-assisted sprite conversion: crop each native actor's OWN idle
// head, torso and articulated limb parts and rotate those portions around
// stickman joints. No different actor's pixels or costumes are substituted.
function paintHuman(ctx,img,base,dir,pose,frame=0){
 ctx.clearRect(0,0,64,112);ctx.imageSmoothingEnabled=false;
 const row=(Number(base.row_starts?.idle)||4)+dir;
 const col=frame%Math.max(1,Number(base.idle_frames)||4);
 const sourceX=col*64,sourceY=row*112;
 const a=normalized(pose);
 // View-specific depth offset gives front/back drawings distinct perspective.
 const view=[.22,-.22,.22,-.22][dir],back=dir>=2;
 function xy(id){const v=a[id];return [v[0]+v[2]*view,v[1]-v[2]*.12];}
 function piece(sx,sy,sw,sh,from,to,pivotX,pivotY){
  const f=xy(from),g=xy(to),o=P0[from],e=P0[to];
  const origAngle=Math.atan2(e[1]-o[1],e[0]-o[0]);
  const newAngle=Math.atan2(g[1]-f[1],g[0]-f[0]);
  const oldLen=Math.max(1,Math.hypot(e[0]-o[0],e[1]-o[1]));
  const newLen=Math.max(1,Math.hypot(g[0]-f[0],g[1]-f[1]));
  ctx.save();ctx.translate(Math.round(f[0]),Math.round(f[1]));
  ctx.rotate(newAngle-origAngle);ctx.scale(1,clamp(newLen/oldLen,.65,1.35));
  ctx.drawImage(img,sourceX+sx,sourceY+sy,sw,sh,
   Math.round(sx-pivotX),Math.round(sy-pivotY),sw,sh);ctx.restore();
 }
 function torso(){
  const f=xy("chest"),g=xy("pelvis");
  const angle=Math.atan2(g[0]-f[0],g[1]-f[1]);
  ctx.save();ctx.translate(Math.round(f[0]),Math.round(f[1]));ctx.rotate(-angle);
  ctx.drawImage(img,sourceX+21,sourceY+30,22,37,-11,-6,22,37);ctx.restore();
 }
 function arm(side){
  const left=side==="l",sx=left?10:40;
  piece(sx,35,14,21,"shoulder_"+side,"elbow_"+side,left?20:44,37);
  piece(sx,50,14,19,"elbow_"+side,"wrist_"+side,left?17:47,51);
 }
 function leg(side){
  const left=side==="l",sx=left?20:31;
  piece(sx,62,14,22,"hip_"+side,"knee_"+side,left?26:38,64);
  piece(sx,80,14,23,"knee_"+side,"ankle_"+side,left?26:38,80);
 }
 function head(){
  const f=xy("neck"),g=xy("head"),o=P0.neck,e=P0.head;
  const angle=Math.atan2(g[0]-f[0],f[1]-g[1])-Math.atan2(e[0]-o[0],o[1]-e[1]);
  ctx.save();ctx.translate(Math.round(f[0]),Math.round(f[1]));ctx.rotate(-angle);
  ctx.drawImage(img,sourceX+13,sourceY+0,38,36,-19,-28,38,36);ctx.restore();
 }
 if(back){arm("l");leg("l");arm("r");leg("r");torso();head();}
 else{leg("r");arm("r");torso();leg("l");arm("l");head();}
}
function renderSheet(base,img,keyframes,n,duration){
 const out=document.createElement("canvas");out.width=64*n;out.height=112*4;
 const ctx=out.getContext("2d");ctx.imageSmoothingEnabled=false;
 const tile=document.createElement("canvas");tile.width=64;tile.height=112;
 const brush=tile.getContext("2d");
 for(let dir=0;dir<4;dir++)for(let frame=0;frame<n;frame++){
  const pose=sample(keyframes,frame/n);
  paintHuman(brush,img,base,dir,pose,0);
  ctx.drawImage(tile,frame*64,dir*112);
 }
 return out;
}

function zipFiles(entries){
 const encoder=new TextEncoder(),local=[],central=[];
 let offset=0,centralSize=0;
 function head(size){const data=new Uint8Array(size);return {data,v:new DataView(data.buffer)};}
 function crc32(bytes){
  let c=0xffffffff;
  for(const byte of bytes){c^=byte;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}
  return (c^0xffffffff)>>>0;
 }
 for(const entry of entries){
  const path=encoder.encode(entry.name),data=entry.bytes,crc=crc32(data);
  const l=head(30+path.length);l.v.setUint32(0,0x04034b50,true);
  l.v.setUint16(4,20,true);l.v.setUint32(14,crc,true);
  l.v.setUint32(18,data.length,true);l.v.setUint32(22,data.length,true);
  l.v.setUint16(26,path.length,true);l.data.set(path,30);
  local.push(l.data,data);
  const c=head(46+path.length);c.v.setUint32(0,0x02014b50,true);
  c.v.setUint16(4,20,true);c.v.setUint16(6,20,true);
  c.v.setUint32(16,crc,true);c.v.setUint32(20,data.length,true);
  c.v.setUint32(24,data.length,true);c.v.setUint16(28,path.length,true);
  c.v.setUint32(42,offset,true);c.data.set(path,46);
  central.push(c.data);centralSize+=c.data.length;offset+=l.data.length+data.length;
 }
 const end=head(22);end.v.setUint32(0,0x06054b50,true);
 end.v.setUint16(8,entries.length,true);end.v.setUint16(10,entries.length,true);
 end.v.setUint32(12,centralSize,true);end.v.setUint32(16,offset,true);
 return new Blob([...local,...central,end.data],{type:"application/zip"});
}

function mount(){
 const tab=document.getElementById("switch-poser"),panel=document.getElementById("pose-workspace");
 if(!tab||!panel)return;
 const $=id=>document.getElementById(id);
 const rig=$("pose-rig");
 let keys=[{at:0,pose:neutral()},{at:.5,pose:neutral()},{at:1,pose:neutral()}];
 let active=0,chosen="wrist_r",yaw=32,playing=false,playTime=0,lastTick=0;
 let source={},images={},savedId="";
 const inform=(t)=>{$("pose-feedback").textContent=t;};
 const pose=()=>keys[active].pose;
 const allJoints=Object.keys(P0);
 let lastSvgNodes={};
 function renderRig(){
  const p=pose(),projected=Object.fromEntries(allJoints.map(id=>[id,project(p[id],yaw)]));
  const bg='<defs><pattern id="poser-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#a8b5c3" stroke-width=".6"/></pattern></defs>'+
    '<rect width="320" height="410" fill="#e8edf3"/><rect width="320" height="410" fill="url(#poser-grid)"/>'+
    '<ellipse cx="160" cy="375" rx="65" ry="12" fill="#334155" opacity=".12"/>';
  const parts=BONES.map(([start,end])=>{
    const a=projected[start],b=projected[end];
    return '<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="#273853" stroke-width="7" stroke-linecap="round"/>'+
     '<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="#75a9e0" stroke-width="3" stroke-linecap="round"/>';
  }).join("");
  const dots=allJoints.map(id=>{
   const pt=projected[id],on=id===chosen;
   return '<circle data-joint="'+id+'" cx="'+pt.x+'" cy="'+pt.y+'" r="'+(on?10:7)+'" fill="'+(on?"#f9b63a":"#eff5fd")+
    '" stroke="'+(on?"#633d00":"#1858a4")+'" stroke-width="2.5" />';}).join("");
  rig.innerHTML=bg+parts+dots;
  $("pose-joint-name").textContent=chosen.toUpperCase().replaceAll("_"," ");
  $("pose-depth").value=String(p[chosen][2]);
  $("pose-depth-value").textContent=String(Math.round(p[chosen][2]));
 }
 function showTimeline(){
  const wrap=$("pose-keys");wrap.replaceChildren();
  keys.forEach((key,i)=>{
   const b=document.createElement("button");b.type="button";
   b.className="pose-key"+(i===active?" active":"");
   b.textContent="F"+(i+1)+" · "+Math.round(key.at*100)+"%";
   b.onclick=()=>{active=i;playing=false;renderAll();};wrap.append(b);
  });
  $("pose-time").value=String(Math.round(keys[active].at*100));
  $("pose-time").disabled=active===0||active===keys.length-1;
 }
 function preview(){
  const p=playing?sample(keys,playTime):pose();
  for(const [gender,baseId] of [["male",BASE_IDS[0]],["female",BASE_IDS[1]]]){
    const canvas=$("pose-preview-"+gender),ctx=canvas.getContext("2d");
    ctx.clearRect(0,0,64,112);
    if(images[baseId]&&source[baseId])
      paintHuman(ctx,images[baseId],source[baseId],Number($("pose-facing").value),p);
  }
 }
 function renderAll(){renderRig();showTimeline();preview();}
 function setJoint(id){if(!P0[id])return;chosen=id;renderRig();}
 rig.addEventListener("pointerdown",e=>{
  const target=e.target.closest("[data-joint]");if(!target)return;
  setJoint(target.dataset.joint);playing=false;
  rig.setPointerCapture(e.pointerId);
  lastSvgNodes={x:e.clientX,y:e.clientY,id:chosen};
 });
 rig.addEventListener("pointermove",e=>{
  if(!rig.hasPointerCapture(e.pointerId)||!lastSvgNodes.id)return;
  const rect=rig.getBoundingClientRect(),scaleX=320/rect.width,scaleY=410/rect.height;
  const dx=(e.clientX-lastSvgNodes.x)*scaleX/(3.5*(Math.abs(Math.cos(yaw*Math.PI/180))<.28?.28:Math.cos(yaw*Math.PI/180)));
  const dy=(e.clientY-lastSvgNodes.y)*scaleY/3.5;
  lastSvgNodes.x=e.clientX;lastSvgNodes.y=e.clientY;
  move(pose(),chosen,dx,dy);renderRig();preview();
 });
 const endDrag=e=>{if(rig.hasPointerCapture(e.pointerId))rig.releasePointerCapture(e.pointerId);lastSvgNodes={};};
 rig.addEventListener("pointerup",endDrag);rig.addEventListener("pointercancel",endDrag);
 $("pose-depth").addEventListener("input",e=>{pose()[chosen][2]=Number(e.target.value);renderRig();preview();});
 document.querySelectorAll("[data-pose-camera]").forEach(b=>b.addEventListener("click",()=>{
   yaw=Number(b.dataset.poseCamera);document.querySelectorAll("[data-pose-camera]").forEach(x=>x.classList.toggle("active",x===b));
   renderRig();
 }));
 $("pose-facing").addEventListener("change",preview);
 $("pose-reset").addEventListener("click",()=>{keys[active].pose=neutral();playing=false;renderAll();inform("Current keyframe reset.");});
 $("pose-key-add").addEventListener("click",()=>{
  if(keys.length>=12)return inform("Maximum 12 keyframes.");
  const t=keys.length<2?.5:Math.min(.95,keys[active].at+.08);
  const item={at:t,pose:clone(pose())};keys.push(item);keys.sort((a,b)=>a.at-b.at);
  active=keys.indexOf(item);renderAll();
 });
 $("pose-key-delete").addEventListener("click",()=>{
  if(keys.length<=2)return inform("Keep at least 2 keyframes.");
  keys.splice(active,1);active=Math.min(active,keys.length-1);
  if(keys[0].at!==0)keys[0].at=0;
  keys[keys.length-1].at=1;renderAll();
 });
 $("pose-time").addEventListener("input",e=>{
  const v=Number(e.target.value)/100;
  if(active===0||active===keys.length-1)return;
  keys[active].at=clamp(v,keys[active-1].at+.01,keys[active+1].at-.01);
  showTimeline();
 });
 $("pose-play").addEventListener("click",()=>{playing=!playing;lastTick=0;$("pose-play").textContent=playing?"Ⅱ PAUSE":"▶ PLAY";});
 async function loadBases(){
  try{
   const res=await fetch("./catalog.json",{cache:"no-store"});
   if(!res.ok)throw Error("Human catalog HTTP "+res.status);
   const payload=await res.json();
   for(const id of BASE_IDS){
    const found=payload.characters?.find(x=>x.id===id);
    if(!found?.sheet)throw Error(id+" missing its own atlas");
    source[id]=found;
    const path=found.sheet;
    images[id]=await loadImage(path+(path.startsWith("data:")?"":(path.includes("?")?"&":"?")+"poser="+encodeURIComponent(payload.build_version||"1")));
   }
   preview();inform("Human Male + Female original atlases ready. Drag any joint.");
  }catch(e){inform("Human Base loading error: "+e.message);}
 }
 function showSaved(){
  const place=$("pose-saved");place.replaceChildren();
  const records=read().filter(x=>x.base_id===BASE_IDS[0]);
  $("pose-saved-count").textContent=String(records.length).padStart(2,"0");
  if(!records.length){place.textContent="NO CUSTOM MOTION YET";return;}
  records.slice().reverse().forEach(record=>{
   const line=document.createElement("div");line.className="pose-saved-row";
   const select=document.createElement("button");select.type="button";select.textContent=record.name;
   const detail=document.createElement("small");detail.textContent="MALE + FEMALE / "+record.frames+" FR";
   select.append(detail);
   select.onclick=()=>{
    const loaded=Array.isArray(record.keyframes)?record.keyframes:null;
    if(!loaded||loaded.length<2)return inform("Saved sprite exists, but its editable rig is missing.");
    keys=loaded.map(x=>({at:clamp(x.at,0,1),pose:normalized(x.pose)})).sort((a,b)=>a.at-b.at);
    active=0;savedId=record.id;$("pose-motion-name").value=record.name;
    $("pose-frame-count").value=String(record.frames);
    $("pose-duration").value=String(record.duration_ms);
    playing=false;renderAll();inform("Opened "+record.name+" for editing.");
   };
   line.append(select);place.append(line);
  });
 }
 function download(name,content,type){
  const blob=content instanceof Blob?content:new Blob([content],{type});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
 }
 async function exportSet(){
  if(!source[BASE_IDS[0]]||!source[BASE_IDS[1]])throw Error("Both base sprites must load first.");
  const frames=Number($("pose-frame-count").value),duration_ms=Number($("pose-duration").value);
  const name=$("pose-motion-name").value.trim()||"New Idle";
  const id=savedId||("poser_"+slug(name));
  if(!validId(id))throw Error("Motion name is invalid.");
  const byBase=BASE_IDS.map(base_id=>{
   const c=renderSheet(source[base_id],images[base_id],keys,frames,duration_ms);
   return {format:"virtual-life-human-pose-v1",id,name,base_id,
    frames,duration_ms,directions:[...DIR],frame_size:[64,112],
    pivot:[32,100],source:"pose-maker",row:0,
    keyframes:keys.map(x=>({at:x.at,pose:normalized(x.pose)})),
    sheet:c.toDataURL("image/png"),created_at:new Date().toISOString()};
  });
  return byBase;
 }
 $("pose-save").addEventListener("click",async()=>{
  try{
   const records=await exportSet();store(records);savedId=records[0].id;
   showSaved();inform("SAVED / Male + Female Motion · local browser database");
   document.dispatchEvent(new CustomEvent("mahluk:pose-saved",{detail:{id:savedId}}));
  }catch(e){inform("SAVE FAILED: "+e.message);}
 });
 $("pose-export").addEventListener("click",async()=>{
  try{
   const records=await exportSet();
   const name=records[0].id,files=[],meta=[];
   for(const rec of records){
    const bytes=new Uint8Array(await (await fetch(rec.sheet)).arrayBuffer());
    const relative="assets/animation_library/human_pose_maker/"+rec.base_id+"/"+name+".png";
    files.push({name:relative,bytes});
    const {sheet,...values}=rec;meta.push({...values,atlas:relative});
   }
   files.push({name:"assets/animation_library/human_pose_maker/"+name+".json",
    bytes:new TextEncoder().encode(JSON.stringify({format:"virtual-life-human-pose-v1",motions:meta},null,2))});
   download(name+"_human_motions.zip",zipFiles(files),"application/zip");
   inform("EXPORTED ZIP / 2 native-base PNG atlases + editable rig JSON.");
  }catch(e){inform("EXPORT FAILED: "+e.message);}
 });
 $("pose-new").addEventListener("click",()=>{
  keys=[{at:0,pose:neutral()},{at:.5,pose:neutral()},{at:1,pose:neutral()}];
  savedId="";active=0;playing=false;$("pose-motion-name").value="New Idle";
  renderAll();inform("New motion draft. Existing saved motions untouched.");
 });
 // The pose timeline is played only while its editor is visible.
 function tick(now){
  if(playing&&!panel.hidden){
    if(lastTick){playTime=(playTime+(now-lastTick)/Math.max(300,Number($("pose-duration").value)||1000))%1;}
    lastTick=now;preview();
  }else lastTick=0;
  root.requestAnimationFrame(tick);
 }
 renderAll();showSaved();loadBases();root.requestAnimationFrame(tick);
}
return Object.freeze({KEY,BASE_IDS,BONES,neutral,normalized,interpolate,sample,
  move,project,paintHuman,renderSheet,read,listFor,store,slug,mount});
});