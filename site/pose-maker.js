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
/* Four independently editable parts. Joints are shared by both Human bases.
 * Keeping all parts in a single pose object preserves old saved keyframes. */
const PARTS=Object.freeze({
 body:Object.freeze({label:"BODY",color:"#3568ba",joints:Object.freeze(["pelvis","spine","chest"])}),
 head:Object.freeze({label:"HEAD",color:"#a66e1c",joints:Object.freeze(["neck","head"])}),
 arms:Object.freeze({label:"ARMS",color:"#9b4b88",joints:Object.freeze(["shoulder_l","elbow_l","wrist_l","shoulder_r","elbow_r","wrist_r"])}),
 legs:Object.freeze({label:"LEGS",color:"#208879",joints:Object.freeze(["hip_l","knee_l","ankle_l","hip_r","knee_r","ankle_r"])})
});
const JOINT_PART=Object.freeze(Object.fromEntries(Object.entries(PARTS)
 .flatMap(([part,definition])=>definition.joints.map(id=>[id,part]))));
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

/* Per-part diamond keyframes use integer frames, like a DCC dope sheet.
 * Child parts are saved relative to their body's anchor, so body motion
 * carries the head/arms/legs without resetting or overwriting those tracks. */
const PART_NAMES=Object.freeze(Object.keys(PARTS));
const partAnchor=part=>part==="legs"?"pelvis":"chest";
function timing(frames,fps){
 return {frames:Math.round(clamp(frames,4,96)),fps:Math.round(clamp(fps,4,30))};
}
function partSnapshot(full,part){
 const p=normalized(full),anchor=partAnchor(part);
 const delta=part==="body"?[0,0,0]:[0,1,2].map(i=>p[anchor][i]-P0[anchor][i]);
 return Object.fromEntries(PARTS[part].joints.map(id=>[id,p[id].map((v,i)=>v-delta[i])]));
}
function initialTracks(){
 const base=neutral();
 return Object.fromEntries(PART_NAMES.map(part=>[part,[{frame:0,pose:partSnapshot(base,part)}]]));
}
function sanitizeTracks(source,frames){
 const count=timing(frames,12).frames;
 const result={};
 for(const part of PART_NAMES){
  const records=Array.isArray(source?.[part])?source[part]:[];
  const keyed=new Map();
  for(const entry of records){
   if(!Number.isFinite(entry?.frame))continue;
   const frame=Math.round(clamp(entry.frame,0,count-1));
   if(!entry.pose||typeof entry.pose!=="object")continue;
   const full=neutral();
   for(const id of PARTS[part].joints){
    const v=entry.pose[id];
    if(Array.isArray(v)&&v.length===3&&v.every(Number.isFinite))
     full[id]=v.map((x,i)=>clamp(x,i===2?-60:i===1?-40:-50,i===2?60:i===1?160:114));
   }
   keyed.set(frame,{frame,pose:Object.fromEntries(PARTS[part].joints.map(id=>[id,[...full[id]]]))});
  }
  result[part]=[...keyed.values()].sort((a,b)=>a.frame-b.frame);
 }
 return result;
}
function legacyTracks(keys,frames){
 const result=Object.fromEntries(PART_NAMES.map(part=>[part,[]]));
 for(const key of keys||[]){
  if(!Number.isFinite(key?.at))continue;
  const frame=Math.round(clamp(key.at,0,1)*(frames-1));
  const pose=normalized(key.pose);
  for(const part of PART_NAMES)result[part].push({frame,pose:partSnapshot(pose,part)});
 }
 return sanitizeTracks(result,frames);
}
function tweenTrack(records,frame,frames,part){
 if(!records?.length)return partSnapshot(neutral(),part);
 const sorted=[...records].sort((a,b)=>a.frame-b.frame);
 if(sorted.length===1)return sorted[0].pose;
 const at=((frame%frames)+frames)%frames;
 const exact=sorted.find(key=>key.frame===at);
 if(exact)return exact.pose;
 let left=sorted[sorted.length-1],right=sorted[0],span=frames-left.frame+right.frame,pos=at-left.frame;
 for(let i=0;i<sorted.length-1;i++){
  if(at>=sorted[i].frame&&at<sorted[i+1].frame){
   left=sorted[i];right=sorted[i+1];span=right.frame-left.frame;pos=at-left.frame;break;
  }
 }
 if(at<sorted[0].frame)pos=at+frames-left.frame;
 const t=clamp(pos/Math.max(1,span),0,1),ease=t*t*(3-2*t);
 return Object.fromEntries(PARTS[part].joints.map(id=>[id,[0,1,2].map(i=>
  left.pose[id][i]*(1-ease)+right.pose[id][i]*ease)]));
}
function sampleTracks(tracks,frame,frames){
 const p=neutral();
 const body=tweenTrack(tracks?.body,frame,frames,"body");
 for(const id of PARTS.body.joints)p[id]=[...body[id]];
 for(const part of ["head","arms","legs"]){
  const stored=tweenTrack(tracks?.[part],frame,frames,part),anchor=partAnchor(part);
  const delta=[0,1,2].map(i=>p[anchor][i]-P0[anchor][i]);
  for(const id of PARTS[part].joints)
   p[id]=stored[id].map((v,i)=>clamp(v+delta[i],
     i===2?-25:i===1?-10:-16,i===2?25:i===1?125:80));
 }
 return p;
}
function setTrackKey(tracks,part,frame,fullPose){
 if(!PARTS[part])throw Error("Unknown rig part");
 const record={frame,pose:partSnapshot(fullPose,part)};
 const row=tracks[part]||(tracks[part]=[]);
 const index=row.findIndex(k=>k.frame===frame);
 if(index>=0)row[index]=record;else row.push(record);
 row.sort((a,b)=>a.frame-b.frame);
 return record;
}
function deleteTrackKey(tracks,part,frame){
 if(!PARTS[part])throw Error("Unknown rig part");
 const row=tracks[part]||[],index=row.findIndex(k=>k.frame===frame);
 if(index<0)return false;
 row.splice(index,1);return true;
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
const LIMBS=Object.freeze({
 wrist_l:["shoulder_l","elbow_l",1],
 wrist_r:["shoulder_r","elbow_r",-1],
 ankle_l:["hip_l","knee_l",1],
 ankle_r:["hip_r","knee_r",-1]
});
const MID=Object.freeze(Object.fromEntries(Object.entries(LIMBS)
 .map(([end,[root,middle]])=>[middle,[root,end]])));
function length(a,b){return Math.hypot(P0[a][0]-P0[b][0],P0[a][1]-P0[b][1]);}
function solveIK(p,endId){
 const spec=LIMBS[endId];if(!spec)return;
 const [rootId,midId,bend]=spec;
 const a=p[rootId],b=p[midId],c=p[endId];
 const l1=length(rootId,midId),l2=length(midId,endId);
 let dx=c[0]-a[0],dy=c[1]-a[1],d=Math.hypot(dx,dy);
 // Physical two-bone reach; no detached forearms, backward knees or
 // random elbow flipping when the arm is almost straight.
 if(d<.01){dx=0;dy=l1+l2;d=l1+l2;}
 const reach=Math.min(l1+l2-.01,Math.max(Math.abs(l1-l2)+.01,d));
 if(reach!==d){c[0]=clamp(a[0]+dx/d*reach,-16,80);c[1]=clamp(a[1]+dy/d*reach,-10,125);}
 dx=c[0]-a[0];dy=c[1]-a[1];d=Math.max(.01,Math.hypot(dx,dy));
 const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
 // Left side bends toward the left and right side toward the right in
 // source character coordinates (the old signs were reversed).
 b[0]=a[0]+dx/d*along-bend*dy/d*height;
 b[1]=a[1]+dy/d*along+bend*dx/d*height;
}
function move(p,id,dx,dy){
 if(!P0[id]||!Number.isFinite(dx)||!Number.isFinite(dy))return;
 dx=clamp(dx,-40,40);dy=clamp(dy,-40,40);
 const middle=MID[id];
 if(middle){
  const anchor=p[middle[0]],l=length(middle[0],id),old=p[id];
  let x=old[0]+dx-anchor[0],y=old[1]+dy-anchor[1];
  const d=Math.hypot(x,y)||1;
  x=x/d*l;y=y/d*l;
  const nx=clamp(anchor[0]+x,-16,80),ny=clamp(anchor[1]+y,-10,125);
  dx=nx-old[0];dy=ny-old[1];
 }
 const members=[id,...(CHILD[id]||[])];
 for(const k of members){
  p[k][0]=clamp(p[k][0]+dx,-16,80);
  p[k][1]=clamp(p[k][1]+dy,-10,125);
 }
 if(LIMBS[id])solveIK(p,id);
}
function moveDepth(p,id,target){
 if(!P0[id])return;
 const amount=clamp(target,-25,25)-p[id][2];
 for(const joint of [id,...(CHILD[id]||[])])
  p[joint][2]=clamp(p[joint][2]+amount,-25,25);
}
function resetPart(p,part){
 if(!PARTS[part])return;
 // Only reset the chosen part; other parts keep their keyed articulation.
 // Child parts follow a changed shoulder / hip anchor without being reset.
 const before=clone(p);
 const parent=part==="head"||part==="arms"?"chest":part==="legs"?"pelvis":null;
 const baseOffset=parent?[0,1,2].map(i=>p[parent][i]-P0[parent][i]):[0,0,0];
 for(const id of PARTS[part].joints)
  p[id]=P0[id].map((v,i)=>clamp(v+baseOffset[i],
   i===2?-25:i===1?-10:-16,i===2?25:i===1?125:80));
 if(part==="body"){
  for(const child of ["head","arms","legs"]){
   const anchor=child==="legs"?"pelvis":"chest";
   const shift=[0,1,2].map(i=>p[anchor][i]-before[anchor][i]);
   for(const id of PARTS[child].joints)for(let i=0;i<3;i++)
    p[id][i]=clamp(before[id][i]+shift[i],
      i===2?-25:i===1?-10:-16,i===2?25:i===1?125:80);
  }
 }
 return p;
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
  ctx.rotate(newAngle-origAngle);const ratio=clamp(newLen/oldLen,.8,1.2);ctx.scale(ratio,ratio);
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
  ctx.save();ctx.translate(Math.round(f[0]),Math.round(f[1]));ctx.rotate(angle);
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
  const pose=Array.isArray(keyframes)?sample(keyframes,frame/n):sampleTracks(keyframes,frame,n);
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
 const $=id=>document.getElementById(id),rig=$("pose-rig");
 let tracks=initialTracks(),total=24,fps=12,currentFrame=0,part="body",chosen="pelvis";
 let draft=sampleTracks(tracks,0,total),yaw=32,isolate=false,playing=false,lastTick=0,accum=0,dirty=false;
 let source={},images={},savedId="",drag=null;
 const allJoints=Object.keys(P0);
 const inform=t=>{$("pose-feedback").textContent=t;};
 const stop=()=>{
  playing=false;lastTick=0;accum=0;
  $("pose-play").textContent="▶ PLAY";
 };
 function renderRig(){
  const projected=Object.fromEntries(allJoints.map(id=>[id,project(draft[id],yaw)]));
  const bg='<defs><pattern id="poser-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#a8b5c3" stroke-width=".6"/></pattern></defs>'+
   '<rect width="320" height="410" fill="#e8edf3"/><rect width="320" height="410" fill="url(#poser-grid)"/>'+
   '<ellipse cx="160" cy="375" rx="65" ry="12" fill="#334155" opacity=".12"/>';
  const edges=BONES.map(([start,end])=>{
   const segment=JOINT_PART[end],active=segment===part;
   if(isolate&&!active)return "";
   const a=projected[start],b=projected[end],color=PARTS[segment].color;
   return '<g class="pose-segment'+(active?" is-active":" is-muted")+'">'+
     '<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="#344254" stroke-width="9" stroke-linecap="round"/>'+
     '<line x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" stroke="'+color+'" stroke-width="5" stroke-linecap="round"/></g>';
  }).join("");
  const dots=allJoints.map(id=>{
   const active=JOINT_PART[id]===part,on=id===chosen;
   if(isolate&&!active)return "";
   const pt=projected[id],color=PARTS[JOINT_PART[id]].color;
   const label=active?'<text class="pose-joint-label" x="'+(pt.x+10)+'" y="'+(pt.y-9)+'">'+
     id.toUpperCase().replaceAll("_"," ")+'</text>':"";
   return '<g class="pose-handle'+(active?" is-active":" is-muted")+'">'+
    '<circle '+(active?'data-joint="'+id+'" ':'')+'cx="'+pt.x+'" cy="'+pt.y+
    '" r="'+(on?11:active?8:4)+'" fill="'+(on?"#ffd166":active?"#fff":"#aeb9c5")+
    '" stroke="'+(on?"#6c4704":color)+'" stroke-width="'+(on?3:2)+'" />'+label+'</g>';
  }).join("");
  rig.innerHTML=bg+edges+dots+
   '<text class="pose-part-stage-label" x="13" y="27" fill="'+PARTS[part].color+'">'+PARTS[part].label+' / EDIT</text>';
  $("pose-joint-name").textContent=chosen.toUpperCase().replaceAll("_"," ");
  $("pose-depth").value=String(draft[chosen][2]);
  $("pose-depth-value").textContent=String(Math.round(draft[chosen][2]));
  $("pose-joint-select").value=chosen;
 }
 function preview(){
  for(const [gender,baseId] of [["male",BASE_IDS[0]],["female",BASE_IDS[1]]]){
   const canvas=$("pose-preview-"+gender),ctx=canvas.getContext("2d");
   ctx.clearRect(0,0,64,112);
   if(images[baseId]&&source[baseId])
    paintHuman(ctx,images[baseId],source[baseId],Number($("pose-facing").value),draft);
  }
 }
 function updatePlayhead(){
  $("pose-current-frame").textContent=String(currentFrame+1).padStart(2,"0");
  $("pose-frame-total").textContent=String(total);
  $("pose-playhead-label").textContent="F "+String(currentFrame+1).padStart(2,"0");
  $("pose-time").max=String(total-1);
  $("pose-time").value=String(currentFrame);
  $("pose-duration-label").textContent=(total/fps).toFixed(2)+"S";
  panel.querySelectorAll("[data-pose-frame]").forEach(node=>{
   const on=Number(node.dataset.poseFrame)===currentFrame;
   node.classList.toggle("is-playhead",on);
   if(node.dataset.poseRuler!==undefined)node.setAttribute("aria-pressed",String(on));
  });
 }
 function renderTimeline(){
  const ruler=$("pose-ruler"),rows=$("pose-keys");
  ruler.replaceChildren();rows.replaceChildren();
  ruler.style.gridTemplateColumns="repeat("+total+",26px)";
  for(let f=0;f<total;f++){
   const b=document.createElement("button");b.type="button";
   b.className="pose-frame-cell";b.dataset.poseFrame=f;b.dataset.poseRuler="true";
   b.textContent=f===0||f===total-1||f%5===4?String(f+1):"·";
   b.title="Go to frame "+(f+1);b.setAttribute("aria-label","Frame "+(f+1));
   b.onclick=()=>gotoFrame(f);ruler.append(b);
  }
  for(const trackPart of PART_NAMES){
   const line=document.createElement("div");line.className="pose-track-row"+(part===trackPart?" active":"");
   const label=document.createElement("button");label.type="button";label.className="pose-track-label";
   label.textContent=PARTS[trackPart].label;
   label.style.setProperty("--track-color",PARTS[trackPart].color);
   label.onclick=()=>selectPart(trackPart);line.append(label);
   const cells=document.createElement("div");cells.className="pose-track-cells";
   cells.style.gridTemplateColumns="repeat("+total+",26px)";
   for(let f=0;f<total;f++){
    const keyed=(tracks[trackPart]||[]).some(k=>k.frame===f);
    const cell=document.createElement("button");cell.type="button";
    cell.dataset.poseFrame=f;cell.dataset.posePartKey=trackPart;
    cell.className="pose-diamond-cell"+(keyed?" is-keyed":"");
    cell.innerHTML='<span class="pose-diamond">'+(keyed?"◆":"◇")+'</span>';
    cell.title=(keyed?"Delete ":"Add ")+PARTS[trackPart].label+" key at frame "+(f+1);
    cell.setAttribute("aria-label",cell.title);
    cell.onclick=()=>{
     const current=f===currentFrame;
     if(!current)gotoFrame(f);
     selectPart(trackPart);
     if(keyed){
      deleteTrackKey(tracks,trackPart,f);
      draft=sampleTracks(tracks,currentFrame,total);
      dirty=false;inform("◇ DELETED / "+PARTS[trackPart].label+" at F"+(f+1));
     }else{
      setTrackKey(tracks,trackPart,f,draft);
      dirty=false;inform("◆ SET / "+PARTS[trackPart].label+" at F"+(f+1));
     }
     renderRig();preview();renderTimeline();
    };
    cells.append(cell);
   }
   line.append(cells);rows.append(line);
  }
  updatePlayhead();
 }
 function gotoFrame(next,keepPlaying=false){
  currentFrame=Math.round(clamp(next,0,total-1));
  if(!keepPlaying)stop();
  draft=sampleTracks(tracks,currentFrame,total);
  dirty=false;
  renderRig();preview();updatePlayhead();
 }
 function selectPart(next){
  if(!PARTS[next])return;
  part=next;chosen=PARTS[part].joints[0];stop();
  const selector=$("pose-joint-select");selector.replaceChildren();
  for(const id of PARTS[part].joints){
   const opt=document.createElement("option");opt.value=id;
   opt.textContent=id.toUpperCase().replaceAll("_"," ");selector.append(opt);
  }
  document.querySelectorAll("[data-pose-part]").forEach(b=>{
   const selected=b.dataset.posePart===part;
   b.classList.toggle("active",selected);b.setAttribute("aria-pressed",String(selected));
  });
  $("pose-part-guide").textContent={
   body:"PELVIS CONTROLS ROOT / SPINE AND CHEST MOVE UPPER BODY.",
   head:"NECK + HEAD ONLY. SHOULDERS AND BODY STAY IN POSITION.",
   arms:"LEFT / RIGHT ARMS. DRAG WRISTS FOR 2-BONE IK.",
   legs:"LEFT / RIGHT LEGS. DRAG ANKLES FOR 2-BONE IK."
  }[part];
  panel.querySelectorAll(".pose-track-row").forEach((row,i)=>
   row.classList.toggle("active",PART_NAMES[i]===part));
  renderRig();
 }
 function selectJoint(id){
  if(!P0[id]||JOINT_PART[id]!==part)return;
  chosen=id;renderRig();
 }
 function commitPart(){
  if(playing)stop();
  setTrackKey(tracks,part,currentFrame,draft);
  dirty=false;renderTimeline();
  inform("◆ "+PARTS[part].label+" KEYFRAME SAVED / FRAME "+(currentFrame+1));
 }
 function removePart(){
  stop();
  if(deleteTrackKey(tracks,part,currentFrame)){
   draft=sampleTracks(tracks,currentFrame,total);
   dirty=false;renderRig();preview();renderTimeline();
   inform("◇ KEYFRAME REMOVED / "+PARTS[part].label+" / F"+(currentFrame+1));
  }else inform("No "+PARTS[part].label+" keyframe at F"+(currentFrame+1));
 }
 rig.addEventListener("pointerdown",e=>{
  const target=e.target.closest("[data-joint]");
  if(!target||JOINT_PART[target.dataset.joint]!==part)return;
  selectJoint(target.dataset.joint);stop();
  rig.setPointerCapture(e.pointerId);
  drag={x:e.clientX,y:e.clientY,id:chosen};
 });
 rig.addEventListener("pointermove",e=>{
  if(!drag||!rig.hasPointerCapture(e.pointerId))return;
  const rect=rig.getBoundingClientRect(),scaleX=320/rect.width,scaleY=410/rect.height;
  const cosine=Math.cos(yaw*Math.PI/180),den=Math.abs(cosine)<.28?(cosine<0?-.28:.28):cosine;
  const dx=(e.clientX-drag.x)*scaleX/(3.5*den),dy=(e.clientY-drag.y)*scaleY/3.5;
  drag.x=e.clientX;drag.y=e.clientY;
  move(draft,chosen,dx,dy);dirty=true;renderRig();preview();
 });
 const endDrag=e=>{
  if(rig.hasPointerCapture(e.pointerId))rig.releasePointerCapture(e.pointerId);
  if(drag){drag=null;if(dirty)inform("POSE MODIFIED / CLICK ◆ SET KEY TO SAVE "+PARTS[part].label);}
 };
 rig.addEventListener("pointerup",endDrag);rig.addEventListener("pointercancel",endDrag);
 $("pose-joint-select").addEventListener("change",e=>selectJoint(e.target.value));
 $("pose-depth").addEventListener("input",e=>{
  moveDepth(draft,chosen,Number(e.target.value));dirty=true;renderRig();preview();
 });
 document.querySelectorAll("[data-pose-part]").forEach(b=>b.addEventListener("click",()=>selectPart(b.dataset.posePart)));
 $("pose-isolate").addEventListener("change",e=>{isolate=e.target.checked;renderRig();});
 $("pose-reset-part").addEventListener("click",()=>{
  stop();resetPart(draft,part);dirty=true;renderRig();preview();
  inform(PARTS[part].label+" RESET / click ◆ SET KEY to record");
 });
 $("pose-reset").addEventListener("click",()=>{
  stop();draft=neutral();dirty=true;renderRig();preview();
  inform("WHOLE POSE RESET / set diamonds for each part to record");
 });
 document.querySelectorAll("[data-pose-camera]").forEach(b=>b.addEventListener("click",()=>{
  const index=[32,-32,148,212].indexOf(Number(b.dataset.poseCamera));
  yaw=Number(b.dataset.poseCamera);$("pose-facing").value=String(Math.max(0,index));
  document.querySelectorAll("[data-pose-camera]").forEach(x=>x.classList.toggle("active",x===b));
  renderRig();preview();
 }));
 $("pose-facing").addEventListener("change",e=>{
  yaw=[32,-32,148,212][Number(e.target.value)]||32;
  document.querySelectorAll("[data-pose-camera]").forEach(b=>
   b.classList.toggle("active",Number(b.dataset.poseCamera)===yaw));
  renderRig();preview();
 });
 $("pose-key-add").addEventListener("click",commitPart);
 $("pose-key-delete").addEventListener("click",removePart);
 $("pose-time").addEventListener("input",e=>gotoFrame(Number(e.target.value)));
 $("pose-frame-count").addEventListener("change",e=>{
  total=timing(e.target.value,fps).frames;e.target.value=String(total);
  tracks=sanitizeTracks(tracks,total);currentFrame=Math.min(currentFrame,total-1);
  stop();draft=sampleTracks(tracks,currentFrame,total);dirty=false;
  renderRig();preview();renderTimeline();
 });
 $("pose-fps").addEventListener("change",e=>{
  fps=timing(total,e.target.value).fps;e.target.value=String(fps);
  updatePlayhead();
 });
 $("pose-play").addEventListener("click",()=>{
  playing=!playing;lastTick=0;accum=0;
  if(playing&&dirty){
   draft=sampleTracks(tracks,currentFrame,total);dirty=false;
  }
  $("pose-play").textContent=playing?"Ⅱ PAUSE":"▶ PLAY";
 });
 async function loadBases(){
  try{
   const res=await fetch("./catalog.json",{cache:"no-store"});
   if(!res.ok)throw Error("Human catalog HTTP "+res.status);
   const payload=await res.json();
   for(const id of BASE_IDS){
    const found=payload.characters?.find(x=>x.id===id);
    if(!found?.sheet)throw Error(id+" missing its own atlas");
    source[id]=found;
    images[id]=await loadImage(found.sheet+(found.sheet.startsWith("data:")?"":(found.sheet.includes("?")?"&":"?")+"poser="+encodeURIComponent(payload.build_version||"1")));
   }
   preview();inform("Human Base Male + Female ready. Select Body / Head / Arms / Legs.");
  }catch(e){inform("Human Base loading error: "+e.message);}
 }
 function showSaved(){
  const place=$("pose-saved");place.replaceChildren();
  const records=read().filter(x=>x.base_id===BASE_IDS[0]);
  $("pose-saved-count").textContent=String(records.length).padStart(2,"0");
  if(!records.length){place.textContent="NO CUSTOM MOTION YET";return;}
  records.slice().reverse().forEach(record=>{
   const line=document.createElement("div");line.className="pose-saved-row";
   const button=document.createElement("button");button.type="button";button.textContent=record.name;
   const detail=document.createElement("small");detail.textContent="MALE + FEMALE / "+record.frames+" FR";
   button.append(detail);
   button.onclick=()=>{
    total=timing(record.frames,record.fps||12).frames;
    fps=timing(total,record.fps||Math.max(4,Math.round(total/(record.duration_ms/1000)||12))).fps;
    tracks=record.tracks?sanitizeTracks(record.tracks,total):
     legacyTracks(Array.isArray(record.keyframes)?record.keyframes:[],total);
    currentFrame=0;savedId=record.id;draft=sampleTracks(tracks,0,total);
    dirty=false;stop();
    $("pose-motion-name").value=record.name;
    $("pose-frame-count").value=String(total);$("pose-fps").value=String(fps);
    selectPart("body");renderTimeline();preview();
    inform("OPENED "+record.name.toUpperCase()+" / 4 INDEPENDENT KEYFRAME TRACKS");
   };
   line.append(button);place.append(line);
  });
 }
 function download(name,content,type){
  const blob=content instanceof Blob?content:new Blob([content],{type});
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
 }
 async function exportSet(){
  if(!source[BASE_IDS[0]]||!source[BASE_IDS[1]])throw Error("Both Human Base sprite atlases must load first");
  if(dirty)throw Error("Unsaved pose — click ◆ SET KEY for the active body part first");
  const frames=total,duration_ms=Math.round(total/fps*1000);
  const name=$("pose-motion-name").value.trim()||"New Idle",id=savedId||("poser_"+slug(name));
  if(!validId(id))throw Error("Invalid motion name");
  return BASE_IDS.map(base_id=>{
   const canvas=renderSheet(source[base_id],images[base_id],tracks,frames,duration_ms);
   return {format:"virtual-life-human-pose-v2",id,name,base_id,frames,fps,duration_ms,
    directions:[...DIR],frame_size:[64,112],pivot:[32,100],
    source:"pose-maker",row:0,tracks:sanitizeTracks(tracks,total),
    sheet:canvas.toDataURL("image/png"),created_at:new Date().toISOString()};
  });
 }
 $("pose-save").addEventListener("click",async()=>{
  try{
   const records=await exportSet();store(records);savedId=records[0].id;
   showSaved();inform("SAVED / " +total+" FR / "+fps+" FPS / MALE + FEMALE MOTION");
   document.dispatchEvent(new CustomEvent("mahluk:pose-saved",{detail:{id:savedId}}));
  }catch(e){inform("SAVE FAILED: "+e.message);}
 });
 $("pose-export").addEventListener("click",async()=>{
  try{
   const records=await exportSet(),name=records[0].id,files=[],meta=[];
   for(const rec of records){
    const bytes=new Uint8Array(await (await fetch(rec.sheet)).arrayBuffer());
    const relative="assets/animation_library/human_pose_maker/"+rec.base_id+"/"+name+".png";
    files.push({name:relative,bytes});
    const {sheet,...values}=rec;meta.push({...values,atlas:relative});
   }
   files.push({name:"assets/animation_library/human_pose_maker/"+name+".json",
    bytes:new TextEncoder().encode(JSON.stringify({format:"virtual-life-human-pose-v2",motions:meta},null,2))});
   download(name+"_human_motions.zip",zipFiles(files),"application/zip");
   inform("EXPORTED / 4-DIR PNG FOR BOTH BASES + EDITABLE DIAMOND TIMELINE JSON");
  }catch(e){inform("EXPORT FAILED: "+e.message);}
 });
 $("pose-new").addEventListener("click",()=>{
  tracks=initialTracks();total=24;fps=12;currentFrame=0;savedId="";dirty=false;stop();
  $("pose-motion-name").value="New Idle";$("pose-frame-count").value="24";$("pose-fps").value="12";
  draft=sampleTracks(tracks,0,total);selectPart("body");renderTimeline();preview();
  inform("NEW MOTION / 24 FR / 12 FPS / SEPARATE BODY, HEAD, ARMS, LEGS");
 });
 function tick(now){
  if(playing&&!panel.hidden){
   if(lastTick)accum+=Math.min(250,now-lastTick);
   lastTick=now;
   if(accum>=1000/fps){
    const advance=Math.floor(accum/(1000/fps));
    accum=accum%(1000/fps);
    gotoFrame((currentFrame+advance)%total,true);
   }
  }else lastTick=0;
  root.requestAnimationFrame(tick);
 }
 selectPart("body");renderTimeline();preview();showSaved();loadBases();
 root.requestAnimationFrame(tick);
}

return Object.freeze({KEY,BASE_IDS,BONES,PARTS,JOINT_PART,neutral,normalized,interpolate,sample,
  timing,partSnapshot,initialTracks,sanitizeTracks,legacyTracks,sampleTracks,
  setTrackKey,deleteTrackKey,move,moveDepth,resetPart,project,paintHuman,renderSheet,read,listFor,store,slug,mount});
});