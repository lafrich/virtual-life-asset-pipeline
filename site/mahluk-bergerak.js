/* MAHLUK HIDUP · BERGERAK — frame-by-frame LGR-1 animation maker.
 * Tap/drag a part to rotate it around its pivot (or use the slider), move the
 * pelvis root, add/duplicate/reorder frames, onion skin, play/loop, 4 views
 * (SE edits mirror to SW and NE→NW; "khusus view ini" stores a per-view
 * override), Male/Female + outfit/hair/skin preview. Saves lgr1-bergerak-v1
 * entries (keyframe joint angles, same frame shape as media/lgr1/motions.json)
 * to the LGR database (lgr-db.js → Drive Database/Bergerak).
 */
(function(root){"use strict";
const U=root.MHUI,el=U.el,DB=()=>root.LGRDB,A=()=>root.LGRActor,M=()=>root.LGR1Motion,X=()=>root.LGR1Raster,C=()=>root.LafrichPuppetCore;
const DIRS=["se","sw","ne","nw"],FACING={se:1,sw:-1,ne:1,nw:-1},Z=4;
const ANAT_ORDER=["head","torso","pelvis","arm_r_upper","arm_r_lower","arm_l_upper","arm_l_lower","leg_r_upper","leg_r_lower","leg_l_upper","leg_l_lower"];
const SHORT={head:"KEPALA",torso:"BADAN",pelvis:"PINGGUL (ROOT)",arm_r_upper:"LENGAN KANAN ATAS",arm_r_lower:"LENGAN KANAN BAWAH",
 arm_l_upper:"LENGAN KIRI ATAS",arm_l_lower:"LENGAN KIRI BAWAH",leg_r_upper:"PAHA KANAN",leg_r_lower:"BETIS KANAN",leg_l_upper:"PAHA KIRI",leg_l_lower:"BETIS KIRI"};
const S={lib:null,entry:null,isNew:true,dirty:false,frame:0,part:"arm_r_upper",dir:"se",perView:false,mode:"rotate",
 gender:"male",outfit:"none",hair:"none",tone:"light",onion:true,playing:false,playMs:0,raf:0,drag:null,ui:{},ready:false,
 shown:{pose:null,order:null,rig:null},renderTicket:0};
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
function blankEntry(){
 return {format:"lgr1-bergerak-v1",id:"",name:"Animasi baru",category:"umum",notes:"",basedOn:null,preview:{gender:S.gender},
  motion:{source:"neutral",angleSnap:5,loop:true,frames:[{ms:150,parts:{}}]}};
}
function fromMotion(m,basedOn){
 return {format:"lgr1-bergerak-v1",id:"",name:(m.name||m.id)+" (copy)",category:"umum",notes:"",basedOn,preview:{gender:S.gender},
  motion:U.clone({source:m.source||"neutral",angleSnap:m.angleSnap||5,loop:m.loop!==false,frames:m.frames})};
}
const motion=()=>S.entry.motion,frame=()=>motion().frames[S.frame];
function validated(){try{return DB().validateMotionLong({...motion(),id:"preview"},S.lib.poses)}catch(e){return null}}
function actor(){const w=S.hair!=="none"?{hair:S.hair,hairColor:"brown"}:null;return {gender:S.gender,skin:{tone:S.tone},outfit:S.outfit,wear:w}}
function sides(){return M().sidesOf(S.shown.rig)}
function pieceOf(anat,d){return M().rigPart(anat,d||S.dir,sides())}
function anatOf(piece,d){return ANAT_ORDER.find(a=>pieceOf(a,d)===piece)||null}
/* ---- screen value of one anatomical part in the current frame/view ---- */
function screenValue(anat,f=frame(),d=S.dir){
 const o=f.dirs?.[d]?.[anat];if(o)return {x:num(o.x),y:num(o.y),a:num(o.a),override:true};
 const b=S.lib.poses[motion().source]?.[anat]||{},p=f.parts[anat]||{},fc=FACING[d];
 return {x:(num(b.x)+num(p.x))*fc,y:num(b.y)+num(p.y),a:(num(b.a)+num(p.a))*fc,override:false};
}
function setScreen(anat,v){
 const f=frame(),d=S.dir,cur=screenValue(anat,f,d),next={x:cur.x,y:cur.y,a:cur.a,...v};
 next.a=Math.max(-360,Math.min(360,Math.round(next.a)));next.x=Math.max(-32,Math.min(32,Math.round(next.x)));next.y=Math.max(-32,Math.min(32,Math.round(next.y)));
 if(cur.override||S.perView){f.dirs??={};f.dirs[d]??={};f.dirs[d][anat]={x:next.x,y:next.y,a:next.a}}
 else{
  const b=S.lib.poses[motion().source]?.[anat]||{},fc=FACING[d];
  const p={x:next.x/fc-num(b.x),y:next.y-num(b.y),a:next.a/fc-num(b.a)};
  const clean={};for(const k of ["x","y","a"])if(Math.abs(p[k])>1e-9)clean[k]=Math.round(p[k]);
  if(Object.keys(clean).length)f.parts[anat]=clean;else delete f.parts[anat];
 }
 touch();
}
function togglePerView(on){
 const f=frame(),d=S.dir,anat=S.part;
 if(on){const v=screenValue(anat);f.dirs??={};f.dirs[d]??={};f.dirs[d][anat]={x:v.x,y:v.y,a:v.a}}
 else if(f.dirs?.[d]?.[anat]){delete f.dirs[d][anat];if(!Object.keys(f.dirs[d]).length)delete f.dirs[d];if(f.dirs&&!Object.keys(f.dirs).length)delete f.dirs}
 S.perView=on;touch();
}
function shadowValue(i=S.frame){return DB().shadowAt(motion(),i)}
function setShadow(patch){
 const f=frame(),old=shadowValue();
 f.shadow={...old,...patch};
 for(const k of ["x","y","rx","ry"])f.shadow[k]=Math.round(Number(f.shadow[k]));
 touch();
}
function drawShadow(g,shadow,scale=1){
 if(!shadow.enabled)return;
 g.fillStyle="rgba(0,0,0,"+(56/255)+")";
 g.beginPath();g.ellipse((32+shadow.x)*scale,(101+shadow.y)*scale,shadow.rx*scale,shadow.ry*scale,0,0,Math.PI*2);g.fill();
}
function touch(){S.dirty=true;syncControls();scheduleRender(true)}
/* ---- rendering ---- */
let renderQueued=false,thumbsQueued=false;
function scheduleRender(thumbs){if(thumbs)thumbsQueued=true;if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;void render()})}
async function frameImage(i,d,mo){
 return A().frameCanvas(actor(),{motion:mo,frame:i,dir:d});
}
async function render(){
 if(!S.ready)return;
 const ticket=++S.renderTicket,mo=validated(),cv=S.ui.canvas,g=cv.getContext("2d");
 if(!mo){U.status("Animasi belum valid (cek durasi frame 40–2000 ms).",true);return}
 const fi=S.playing?M().frameIndexAt(mo,S.playMs):Math.min(S.frame,mo.frames.length-1);
 try{
  const rig=await A().rigOf(S.gender);S.shown.rig=rig;
  const cur=await frameImage(fi,S.dir,mo);
  let prev=null,next=null;
  if(S.onion&&!S.playing&&mo.frames.length>1){
   if(fi>0||mo.loop)prev=await frameImage((fi-1+mo.frames.length)%mo.frames.length,S.dir,mo);
   if(fi<mo.frames.length-1)next=await frameImage(fi+1,S.dir,mo);
  }
  if(ticket!==S.renderTicket)return;
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,cv.width,cv.height);g.imageSmoothingEnabled=false;
  // ground line under the feet
  g.fillStyle="rgba(23,74,150,.18)";g.fillRect(0,101*Z,cv.width,1*Z);
   drawShadow(g,shadowValue(fi),Z);
  for(const [img,tint,alpha] of [[next,"#3a8f4a",.18],[prev,"#c0392b",.28]]){
   if(!img)continue;const t=document.createElement("canvas");t.width=64;t.height=112;const tg=t.getContext("2d");
   tg.drawImage(img,0,0);tg.globalCompositeOperation="source-atop";tg.fillStyle=tint;tg.globalAlpha=.55;tg.fillRect(0,0,64,112);
   g.globalAlpha=alpha;g.drawImage(t,0,0,64*Z,112*Z);g.globalAlpha=1;
  }
  g.drawImage(cur,0,0,64*Z,112*Z);
  const sides0=M().sidesOf(rig),pose=Object.assign(C().blankPose(),M().framePose(S.lib.poses,mo,fi,S.dir,sides0));
  S.shown.pose=pose;S.shown.order=M().frameOrder(A().baseOrder(rig,S.dir),mo,fi,S.dir,sides0);
  if(!S.playing)drawPivots(g,rig,pose);
  if(thumbsQueued&&!S.playing){thumbsQueued=false;void renderThumbs(mo)}
 }catch(e){U.status("Preview: "+e.message,true)}
}
function inv(m){const [a,b,c,d,x,y]=m,det=a*d-b*c;return [d/det,-b/det,-c/det,a/det,(c*y-d*x)/det,(b*x-a*y)/det]}
const mp=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
function transforms(rig,pose){return X().matrices(rig.pivots[S.dir],rig.placements?.[S.dir]||{},pose)}
function pivotScreen(rig,pose,piece){const tr=transforms(rig,pose),p=rig.pivots[S.dir][piece];return mp(tr[piece].mat,p.x+.5,p.y+.5)}
function drawPivots(g,rig,pose){
 const tr=transforms(rig,pose),sel=pieceOf(S.part);
 for(const piece of X().PARTS){
  const p=rig.pivots[S.dir][piece],[x,y]=mp(tr[piece].mat,p.x+.5,p.y+.5),on=piece===sel;
  g.beginPath();g.arc(x*Z,y*Z,on?6:3,0,Math.PI*2);g.fillStyle=on?"#e5352d":"rgba(23,74,150,.75)";g.fill();
  if(on){g.strokeStyle="#e5352d";g.lineWidth=1.5;g.beginPath();g.arc(x*Z,y*Z,22,0,Math.PI*2);g.setLineDash([4,4]);g.stroke();g.setLineDash([])}
 }
}
async function renderThumbs(mo){
 const box=S.ui.frames;const cells=[...box.querySelectorAll("canvas")];
 for(let i=0;i<cells.length&&i<mo.frames.length;i++){
  const c=cells[i],img=await frameImage(i,S.dir,mo).catch(()=>null);if(!img)continue;
  const g=c.getContext("2d");g.clearRect(0,0,64,112);drawShadow(g,shadowValue(i));g.drawImage(img,0,0);
 }
 for(const d of DIRS){
  const c=S.ui.views[d],img=await frameImage(Math.min(S.frame,mo.frames.length-1),d,mo).catch(()=>null);if(!img)continue;
  const g=c.getContext("2d");g.clearRect(0,0,64,112);g.drawImage(img,0,0);
 }
}
/* ---- canvas interaction: tap selects a part, drag rotates (or moves the root) ---- */
function spritePoint(e){const r=S.ui.canvas.getBoundingClientRect();return [(e.clientX-r.left)/r.width*64,(e.clientY-r.top)/r.height*112]}
function hitPiece(x,y){
 const rig=S.shown.rig,pose=S.shown.pose;if(!rig||!pose)return null;
 const mask=C().decode(rig.masks[S.dir]),tr=transforms(rig,pose),order=(S.shown.order||A().baseOrder(rig,S.dir)).slice().reverse();
 for(const piece of order){
  const [sx,sy]=mp(inv(tr[piece].mat),x,y),ix=Math.floor(sx),iy=Math.floor(sy);
  if(ix<0||iy<0||ix>=64||iy>=112)continue;
  if(mask[iy*64+ix]===X().PARTS.indexOf(piece))return piece;
 }
 return null;
}
function onDown(e){
 if(S.playing)stop();
 const [x,y]=spritePoint(e);
 if(S.mode==="shadow"){
  S.drag={id:e.pointerId,x0:x,y0:y,shadow0:{...shadowValue()},moved:false};
  S.ui.canvas.setPointerCapture?.(e.pointerId);e.preventDefault();return;
 }
 const piece=hitPiece(x,y);
 if(piece){const a=anatOf(piece);if(a&&a!==S.part){S.part=a;S.perView=!!frame().dirs?.[S.dir]?.[a];syncControls();scheduleRender()}}
 const rig=S.shown.rig,pose=S.shown.pose;if(!rig||!pose)return;
 const [cx,cy]=pivotScreen(rig,pose,pieceOf(S.part)),v=screenValue(S.part);
 S.drag={id:e.pointerId,x0:x,y0:y,cx,cy,a0:Math.atan2(y-cy,x-cx),v0:v,moved:false};
 S.ui.canvas.setPointerCapture?.(e.pointerId);e.preventDefault();
}
function onMove(e){
 const d=S.drag;if(!d||d.id!==e.pointerId)return;
 const [x,y]=spritePoint(e);
 if(!d.moved&&Math.hypot(x-d.x0,y-d.y0)<1.2)return;d.moved=true;
 if(d.shadow0){
  setShadow({x:Math.max(-24,Math.min(24,d.shadow0.x+Math.round(x-d.x0))),
   y:Math.max(-16,Math.min(16,d.shadow0.y+Math.round(y-d.y0)))});
  return;
 }
 if(S.mode==="move"&&S.part==="pelvis"){setScreen("pelvis",{x:d.v0.x+Math.round(x-d.x0),y:d.v0.y+Math.round(y-d.y0)});return}
 if(Math.hypot(x-d.cx,y-d.cy)<1.5)return;
 let da=(Math.atan2(y-d.cy,x-d.cx)-d.a0)*180/Math.PI;while(da>180)da-=360;while(da<-180)da+=360;
 const snap=motion().angleSnap||1;setScreen(S.part,{a:Math.round((d.v0.a+da)/snap)*snap});
}
function onUp(e){if(S.drag?.id===e.pointerId)S.drag=null}
/* ---- frames ---- */
function addFrame(dup){
 const fs=motion().frames;if(fs.length>=DB().MAX_FRAMES){U.status("Maksimal "+DB().MAX_FRAMES+" frame.",true);return}
 const f=dup?U.clone(frame()):{ms:frame().ms,parts:U.clone(frame().parts),...(frame().dirs?{dirs:U.clone(frame().dirs)}:{}),...(frame().shadow?{shadow:U.clone(frame().shadow)}:{})};
 if(!dup){/* new frame starts as a copy of the pose so you only nudge what changes */}
 fs.splice(S.frame+1,0,f);S.frame++;rebuildFrames();touch();
}
function deleteFrame(){const fs=motion().frames;if(fs.length<=1){U.status("Minimal 1 frame.",true);return}fs.splice(S.frame,1);S.frame=Math.min(S.frame,fs.length-1);rebuildFrames();touch()}
function moveFrame(dir){const fs=motion().frames,j=S.frame+dir;if(j<0||j>=fs.length)return;[fs[S.frame],fs[j]]=[fs[j],fs[S.frame]];S.frame=j;rebuildFrames();touch()}
function resetPart(){const f=frame();delete f.parts[S.part];if(f.dirs?.[S.dir])delete f.dirs[S.dir][S.part];S.perView=false;touch()}
function resetFrame(){const f=frame();f.parts={};delete f.dirs;delete f.behindTorso;delete f.shadow;S.perView=false;touch()}
let poseClip=null;
function copyPose(){poseClip=U.clone({parts:frame().parts,dirs:frame().dirs,behindTorso:frame().behindTorso,shadow:frame().shadow});U.status("Pose frame "+(S.frame+1)+" dicopy.")}
function pastePose(){if(!poseClip)return;const f=frame();f.parts=U.clone(poseClip.parts||{});if(poseClip.dirs)f.dirs=U.clone(poseClip.dirs);else delete f.dirs;
 if(poseClip.behindTorso)f.behindTorso=U.clone(poseClip.behindTorso);else delete f.behindTorso;
 if(poseClip.shadow)f.shadow=U.clone(poseClip.shadow);else delete f.shadow;touch();U.status("Pose di-paste ke frame "+(S.frame+1)+".")}
function mirrorPose(){ // swap left/right limbs (anatomical), e.g. wave with the other hand
 const f=frame(),out={};
 for(const [k,v] of Object.entries(f.parts)){const s=k.replace(/_r_/,"_X_").replace(/_l_/,"_r_").replace(/_X_/,"_l_");out[s]=v}
 f.parts=out;touch();
}
function setBehind(on){
 const f=frame(),a=S.part;if(["head","torso","pelvis"].includes(a))return;
 const set=new Set(f.behindTorso||[]);if(on)set.add(a);else set.delete(a);
 if(set.size)f.behindTorso=[...set];else delete f.behindTorso;touch();
}
/* ---- play ---- */
function play(){const mo=validated();if(!mo)return;S.playing=true;S.playMs=0;let last=performance.now();
 S.ui.play.textContent="■ STOP";
 const tick=now=>{if(!S.playing)return;S.playMs+=now-last;last=now;
  if(!mo.loop&&S.playMs>=DB().validateMotionLong({...motion(),id:"p"},S.lib.poses).frames.reduce((n,f)=>n+f.ms,0)){stop();return}
  scheduleRender();S.raf=requestAnimationFrame(tick)};
 S.raf=requestAnimationFrame(tick);
}
function stop(){S.playing=false;cancelAnimationFrame(S.raf);if(S.ui.play)S.ui.play.textContent="▶ PLAY";scheduleRender(true)}
/* ---- library ---- */
function listItems(){
 const db=DB().all("bergerak");
 return [...db.map(e=>({key:"bergerak:"+e.id,label:e.name,meta:e.category+" · "+e.motion.frames.length+"f",entry:e})),
  ...S.lib.motions.map(m=>({key:"builtin:"+m.id,label:m.name,meta:"bawaan · "+m.frames.length+"f",builtin:m}))];
}
function confirmLeave(){return !S.dirty||confirm("Perubahan animasi ini belum disimpan. Lanjut?")}
function openItem(it){
 if(!confirmLeave())return;stop();
 if(it.builtin){S.entry=fromMotion(it.builtin,"builtin:"+it.builtin.id);S.isNew=true;U.status("Animasi bawaan '"+it.builtin.name+"' dibuka sebagai salinan baru (bawaan tidak diubah).")}
 else{S.entry=U.clone(it.entry);S.isNew=false;U.status("Membuka "+it.entry.name+".")}
 S.frame=0;S.dirty=false;S.perView=false;rebuildAll();
}
function newEntry(){if(!confirmLeave())return;stop();S.entry=blankEntry();S.isNew=true;S.frame=0;S.dirty=false;rebuildAll();U.status("Animasi baru: pilih part, putar, tambah frame.")}
function uniqueId(base){
 const taken=new Set([...DB().all("bergerak").map(e=>e.id),...S.lib.motions.map(m=>m.id)]);
 let id=DB().slug(base),n=2;while(taken.has(id)){id=DB().slug(base).slice(0,36)+"_"+n++}return id;
}
async function save(asNew){
 const e=U.clone(S.entry);
 e.name=String(S.ui.name.value||"").trim()||"Animasi";e.category=String(S.ui.cat.value||"").trim()||"umum";e.preview={gender:S.gender};
 let overwrite=false;
 if(asNew||!e.id&&!S.isNew)e.id="";
 if(S.isNew||asNew||!e.id){
  const r0=U.resolveName(asNew?{...e,id:""}:e,DB().all("bergerak"),S.lib.motions.map(m=>m.id),"animasi");
  if(asNew&&r0.overwrite){r0.overwrite=false;r0.entry=U.resolveName({...e,id:"",name:e.name+" copy"},DB().all("bergerak"),S.lib.motions.map(m=>m.id),"animasi").entry}
  Object.assign(e,r0.entry);overwrite=r0.overwrite;
 }
 DB().validateBergerak({...e,rev:1,updated:new Date().toISOString()},S.lib.poses); // strict: invalid data never reaches the database
 U.status("Menyimpan "+e.name+"…");
 const r=await DB().save("bergerak",e,{overwrite});
 S.entry=U.clone(r.entry);S.isNew=false;S.dirty=false;rebuildAll();
 U.status((r.synced?"✓ TERSIMPAN DI CLOUD · ":"✓ TERSIMPAN (offline, sync nanti) · ")+r.entry.name+" · id "+r.entry.id+" · rev "+r.entry.rev);
 root.dispatchEvent(new CustomEvent("lgr-db-changed",{detail:{kind:"bergerak",id:r.entry.id}}));
}
function current(){
 const e=U.clone(S.entry);e.name=String(S.ui.name.value||"").trim()||"Animasi";e.category=String(S.ui.cat.value||"").trim()||"umum";e.preview={gender:S.gender};
 if(!e.id)e.id=DB().slug(e.name);return e;
}
function importJson(){
 U.importDialog({title:"↑ IMPORT JSON · ANIMASI (Bergerak)",
  check:(t,pick)=>root.LGRImport.normalizeBergerak(t,{poses:S.lib.poses,pick}),
  hint:"Format: lgr1-bergerak-v1 (docs/BERGERAK_FORMAT.md). Juga bisa motion mentah {frames:[…]}, motions.json, atau file dari ↓ EXPORT.",
  open:(e,r)=>{if(!confirmLeave())return;stop();S.entry=e;S.isNew=true;S.dirty=true;S.frame=0;S.perView=false;rebuildAll();
   U.status("IMPOR dibuka: "+e.motion.frames.length+" frame"+(r.fixes.length?" · "+r.fixes.length+" perbaikan otomatis":"")+" · cek preview, edit kalau perlu, lalu ☁ SIMPAN.")}});
}
function exportJson(){
 const e=current(),v=DB().validateBergerak({...e,rev:S.entry.rev||1,updated:S.entry.updated||new Date().toISOString()},S.lib.poses);
 U.exportDialog("↓ EXPORT JSON · "+v.name,"bergerak-"+v.id+".json",v);
}
async function removeEntry(){
 if(S.isNew||!S.entry.id)return;
 if(!confirm("Hapus animasi '"+S.entry.name+"'? File di Drive dipindah ke folder Backup (bisa dipulihkan)."))return;
 await DB().remove("bergerak",S.entry.id);S.dirty=false;newEntry();U.status("Animasi dihapus (backup di Drive).");
 root.dispatchEvent(new CustomEvent("lgr-db-changed",{detail:{kind:"bergerak"}}));
}
/* ---- "Animasi yang dibutuhkan game" checklist (media/lgr1/needed-motions.json) ---- */
let needed=[];
async function loadNeeded(){
 try{const j=await(await fetch((root.LGRDB_BASE||"")+"media/lgr1/needed-motions.json",{cache:"no-cache"})).json();
  if(j?.format==="lgr1-needed-motions-v1"&&Array.isArray(j.motions))needed=j.motions.filter(m=>/^[a-z0-9_]{1,40}$/.test(m?.id||""))}catch{needed=[]}
}
function neededStatus(id){
 const e=DB().get("bergerak",id);
 if(e)return e.category==="placeholder"?"placeholder":"done";
 if(S.lib.motions.some(m=>m.id===id))return "builtin";
 return "missing";
}
const NEED_LABEL={done:"✓ ADA DI DATABASE",builtin:"◇ BAWAAN",placeholder:"◐ PLACEHOLDER",missing:"✕ BELUM ADA"};
function openNeeded(n){
 const st=neededStatus(n.id);
 if(st==="done"||st==="placeholder"){openItem({key:"bergerak:"+n.id,entry:DB().get("bergerak",n.id)});return}
 if(st==="builtin"){openItem({key:"builtin:"+n.id,builtin:S.lib.motions.find(m=>m.id===n.id)});return}
 if(!confirmLeave())return;stop();
 S.entry={...blankEntry(),id:n.id,name:n.name||n.id,category:n.group||"game"};S.isNew=true;S.dirty=true;S.frame=0;rebuildAll();
 U.status("Bikin animasi game '"+n.id+"' ("+(n.name||"")+"): pose frame, ＋ FRAME, lalu ☁ SIMPAN — id-nya tetap '"+n.id+"' biar game langsung pakai.");
}
function rebuildNeeded(){
 const box=S.ui.needed;if(!box)return;box.replaceChildren();
 const c={done:0,builtin:0,placeholder:0,missing:0};
 for(const n of needed){const st=neededStatus(n.id);c[st]++;
  box.append(el("div",{class:"it need-"+st,"data-need":n.id,"data-status":st,onclick:()=>openNeeded(n),title:"Tap buat "+(st==="missing"?"mulai bikin":"buka")},
   el("input",{type:"checkbox",checked:st==="done"||st==="builtin",disabled:true,"aria-label":n.id}),el("b",{text:n.id}),el("span",{text:" "+(n.name||"")}),el("small",{text:NEED_LABEL[st]})))}
 S.ui.neededSum.textContent=(c.done+c.builtin)+"/"+needed.length+" siap · "+c.placeholder+" placeholder · "+c.missing+" belum";
}
/* ---- UI ---- */
function rebuildList(){
 const box=S.ui.list;box.replaceChildren();
 const cur=S.isNew?"":"bergerak:"+S.entry.id;
 for(const it of listItems())box.append(el("div",{class:"it",role:"option","aria-selected":String(it.key===cur),onclick:()=>openItem(it),"data-key":it.key},
  it.builtin?"◇ ":"✦ ",it.label,el("small",{text:it.meta})));
}
function rebuildFrames(){
 const box=S.ui.frames;box.replaceChildren();
 motion().frames.forEach((f,i)=>{
  const c=el("canvas",{width:64,height:112});
  box.append(el("div",{class:"fr","aria-pressed":String(i===S.frame),title:"Frame "+(i+1),onclick:()=>{stop();S.frame=i;S.perView=!!frame().dirs?.[S.dir]?.[S.part];rebuildFrames();syncControls();scheduleRender()}},c,el("div",{text:(i+1)+" · "+f.ms})));
 });
 thumbsQueued=true;
}
function rebuildParts(){
 const box=S.ui.parts;box.replaceChildren();
 for(const a of ANAT_ORDER){
  const ov=!!frame().dirs?.[S.dir]?.[a];
  box.append(el("button",{type:"button",class:ov?"ov":"","aria-pressed":String(a===S.part),title:M().LABELS[a]+(ov?" · khusus view ini":""),
   onclick:()=>{S.part=a;S.perView=ov;syncControls();scheduleRender()},text:SHORT[a]}));
 }
}
function syncControls(){
 if(!S.ui.angle)return;
 const v=screenValue(S.part),snap=motion().angleSnap||1;
 S.ui.angle.step=String(snap);S.ui.angle.value=String(Math.max(-180,Math.min(180,v.a)));S.ui.angleNum.value=String(v.a);S.ui.angleNum.step=String(snap);
 const root_=S.part==="pelvis";S.ui.rootRow.hidden=!root_;S.ui.px.value=String(v.x);S.ui.py.value=String(v.y);
 S.ui.partLabel.textContent=M().LABELS[S.part]+" · "+S.dir.toUpperCase()+(v.override?" · KHUSUS VIEW INI":" · (SE↔SW, NE↔NW mirror)");
 S.ui.perView.checked=v.override;S.ui.behind.checked=(frame().behindTorso||[]).includes(S.part);S.ui.behind.disabled=["head","torso","pelvis"].includes(S.part);
 S.ui.ms.value=String(frame().ms);S.ui.loop.checked=motion().loop;S.ui.snap.value=String(snap);S.ui.source.value=motion().source;
 S.ui.mode.hidden=!root_;
 const sh=shadowValue();S.ui.shadowEnabled.checked=sh.enabled;
 for(const k of ["x","y","rx","ry"])S.ui.shadowInputs[k].value=String(sh[k]);
 S.ui.shadowMove.setAttribute("aria-pressed",String(S.mode==="shadow"));
 S.ui.canvas.style.cursor=S.mode==="shadow"?"move":"crosshair";
 S.ui.frameLabel.textContent="FRAME "+(S.frame+1)+" / "+motion().frames.length+" · total "+motion().frames.reduce((n,f)=>n+f.ms,0)+" ms";
 S.ui.saveState.textContent=S.isNew?"BARU · belum disimpan":(S.dirty?"● belum disimpan":"✓ tersimpan · rev "+(S.entry.rev||1));
 S.ui.saveState.className="sa-tag"+(S.dirty||S.isNew?" warn":"");
 S.ui.del.disabled=S.isNew;
 for(const d of DIRS)S.ui.views[d].setAttribute("aria-pressed",String(d===S.dir));
 for(const b of S.ui.parts.querySelectorAll("button"))b.setAttribute("aria-pressed",String(b.textContent===SHORT[S.part]));
 const frs=S.ui.frames.children;for(let i=0;i<frs.length;i++){frs[i].setAttribute("aria-pressed",String(i===S.frame));frs[i].lastChild.textContent=(i+1)+" · "+motion().frames[i].ms}
 for(const b of S.ui.tones.children)b.setAttribute("aria-pressed",String(b.dataset.tone===S.tone));
 S.ui.gm.setAttribute("aria-pressed",String(S.gender==="male"));S.ui.gf.setAttribute("aria-pressed",String(S.gender==="female"));
}
function rebuildAll(){S.ui.name.value=S.entry.name;S.ui.cat.value=S.entry.category||"umum";rebuildList();rebuildNeeded();rebuildFrames();rebuildParts();syncControls();scheduleRender(true)}
function build(panel){
 const ui=S.ui;
 ui.canvas=el("canvas",{width:64*Z,height:112*Z,id:"bg-canvas","aria-label":"Pose editor: tap part, drag to rotate"});
 ui.canvas.addEventListener("pointerdown",onDown);ui.canvas.addEventListener("pointermove",onMove);
 ui.canvas.addEventListener("pointerup",onUp);ui.canvas.addEventListener("pointercancel",onUp);
 ui.views={};const views=el("div",{class:"sa-views"});
 for(const d of DIRS){ui.views[d]=el("canvas",{width:64,height:112,title:"View "+d.toUpperCase(),onclick:()=>{S.dir=d;S.perView=!!frame().dirs?.[d]?.[S.part];rebuildParts();syncControls();scheduleRender(true)}});
  views.append(el("figure",{},ui.views[d],el("figcaption",{text:d.toUpperCase()})))}
 ui.frames=el("div",{class:"sa-frames",id:"bg-frames"});
 ui.play=el("button",{type:"button",id:"bg-play",class:"primary",text:"▶ PLAY",onclick:()=>S.playing?stop():play()});
 ui.frameLabel=el("b",{style:"font-size:11px"});
 const frameBar=el("div",{class:"sa-box"},el("h3",{text:"FRAME (TIMELINE)"}),ui.frames,
  el("div",{class:"sa-row"},el("button",{type:"button",id:"bg-add",text:"＋ FRAME",title:"Tambah frame setelah ini (salin pose)",onclick:()=>addFrame(false)}),
   el("button",{type:"button",id:"bg-dup",text:"⧉ DUPLIKAT",onclick:()=>addFrame(true)}),
   el("button",{type:"button",text:"◀",title:"Geser frame ke kiri",onclick:()=>moveFrame(-1)}),el("button",{type:"button",text:"▶",title:"Geser frame ke kanan",onclick:()=>moveFrame(1)}),
   el("button",{type:"button",class:"danger",id:"bg-delframe",text:"✕ HAPUS FRAME",onclick:deleteFrame})),
  el("div",{class:"sa-row"},ui.play,ui.frameLabel));
 ui.ms=el("input",{type:"number",min:40,max:2000,step:10,id:"bg-ms",onchange:()=>{frame().ms=Math.max(40,Math.min(2000,Math.round(num(ui.ms.value))||150));touch();rebuildFrames()}});
 ui.fps=el("select",{},...[4,6,8,10,12,15].map(n=>new Option(n+" fps → semua frame",String(n))));ui.fps.prepend(new Option("set fps…",""));ui.fps.value="";
 ui.fps.onchange=()=>{const n=Number(ui.fps.value);if(n){const ms=Math.round(1000/n);for(const f of motion().frames)f.ms=ms;ui.fps.value="";touch();rebuildFrames()}};
 ui.loop=el("input",{type:"checkbox",onchange:()=>{motion().loop=ui.loop.checked;touch()}});
 ui.onion=el("input",{type:"checkbox",checked:true,onchange:()=>{S.onion=ui.onion.checked;scheduleRender()}});
 ui.snap=U.select(M().SNAPS.map(s=>({label:"snap "+s+"°",value:String(s)})),"5",v=>{motion().angleSnap=Number(v);touch()});
 ui.source=U.select(Object.keys(S.lib.poses).map(p=>({label:"pose dasar: "+p,value:p})),"neutral",v=>{motion().source=v;touch()});
 ui.angle=el("input",{type:"range",min:-180,max:180,step:5,id:"bg-angle",oninput:()=>setScreen(S.part,{a:num(ui.angle.value)})});
 ui.angleNum=el("input",{type:"number",min:-360,max:360,step:5,id:"bg-angle-num",onchange:()=>setScreen(S.part,{a:num(ui.angleNum.value)})});
 const nudge=d=>()=>setScreen(S.part,{a:screenValue(S.part).a+d*(motion().angleSnap||1)});
 ui.px=el("input",{type:"number",min:-32,max:32,id:"bg-px",onchange:()=>setScreen("pelvis",{x:num(ui.px.value)})});
 ui.py=el("input",{type:"number",min:-32,max:32,id:"bg-py",onchange:()=>setScreen("pelvis",{y:num(ui.py.value)})});
 const mv=(dx,dy)=>()=>{const v=screenValue("pelvis");setScreen("pelvis",{x:v.x+dx,y:v.y+dy})};
 ui.rootRow=el("div",{class:"sa-row"},el("label",{},"GESER ROOT X",ui.px),el("label",{},"Y",ui.py),
  el("button",{type:"button",text:"←",onclick:mv(-1,0)}),el("button",{type:"button",text:"→",onclick:mv(1,0)}),
  el("button",{type:"button",text:"↑",onclick:mv(0,-1)}),el("button",{type:"button",text:"↓",onclick:mv(0,1)}));
 ui.mode=el("div",{class:"sa-row"},el("span",{class:"sa-hint",text:"Drag di gambar:"}),
  ...[["rotate","⟳ PUTAR"],["move","✥ GESER"]].map(([k,l])=>{const b=el("button",{type:"button","aria-pressed":String(S.mode===k),text:l,onclick:()=>{S.mode=k;for(const x of b.parentNode.querySelectorAll("button"))x.setAttribute("aria-pressed",String(x===b))}});return b}));
 ui.perView=el("input",{type:"checkbox",id:"bg-perview",onchange:()=>togglePerView(ui.perView.checked)});
 ui.behind=el("input",{type:"checkbox",onchange:()=>setBehind(ui.behind.checked)});
 ui.partLabel=el("div",{class:"sa-hint",style:"font-weight:bold;color:#153f82"});
 ui.parts=el("div",{class:"sa-parts",id:"bg-parts"});
 const partBox=el("div",{class:"sa-box"},el("h3",{text:"PART · PUTAR DI PIVOT"}),ui.parts,ui.partLabel,
  el("div",{class:"sa-row"},el("button",{type:"button",text:"−",onclick:nudge(-1)}),ui.angle,el("button",{type:"button",text:"+",onclick:nudge(1)}),ui.angleNum,el("span",{text:"°"})),
  ui.mode,ui.rootRow,
  el("div",{class:"sa-row"},el("label",{},ui.perView,"khusus view ini"),el("label",{},ui.behind,"di belakang badan")),
  el("div",{class:"sa-row"},el("button",{type:"button",text:"↺ RESET PART",onclick:resetPart}),el("button",{type:"button",text:"↺ RESET FRAME",onclick:resetFrame}),
   el("button",{type:"button",text:"⎘ COPY POSE",onclick:copyPose}),el("button",{type:"button",text:"⎗ PASTE POSE",onclick:pastePose}),
   el("button",{type:"button",text:"⇄ TUKAR KIRI/KANAN",onclick:mirrorPose})),
  el("p",{class:"sa-hint",text:"Tap part di gambar buat milih, lalu drag buat muter di pivot (titik merah). Edit di SE otomatis ke semua view (SW/NW dicerminkan)."}));
 ui.shadowEnabled=el("input",{type:"checkbox",id:"bg-shadow-enabled",onchange:()=>setShadow({enabled:ui.shadowEnabled.checked})});
 ui.shadowInputs={};
 const shField=(k,label,lo,hi)=>{
  const field=el("input",{type:"number",min:lo,max:hi,step:1,"aria-label":"Shadow "+label,
   onchange:()=>{const v=Math.round(num(field.value));setShadow({[k]:Math.max(lo,Math.min(hi,v))})}});
  ui.shadowInputs[k]=field;return el("label",{},label,field);
 };
 ui.shadowMove=el("button",{type:"button",id:"bg-shadow-drag",text:"✥ GESER DI PREVIEW",onclick:()=>{
  S.mode=S.mode==="shadow"?"rotate":"shadow";syncControls();
 }});
 const shadowBox=el("details",{class:"sa-box",open:true,id:"bg-shadow-box"},
  el("summary",{},el("b",{text:"SHADOW · BAYANGAN"})),
  el("div",{class:"sa-row"},el("label",{},ui.shadowEnabled,"tampilkan shadow"),ui.shadowMove),
  el("div",{class:"sa-row"},shField("x","X",-24,24),shField("y","Y",-16,16)),
  el("div",{class:"sa-row"},shField("rx","Lebar / radius",2,28),shField("ry","Tebal / radius",1,10)),
  el("div",{class:"sa-row"},
   el("button",{type:"button",text:"↺ RESET FRAME",onclick:()=>{delete frame().shadow;touch()}}),
   el("button",{type:"button",text:"⇢ TERAPKAN SEMUA FRAME",onclick:()=>{
    const value=U.clone(shadowValue());
    for(const f of motion().frames)f.shadow=U.clone(value);
    touch();U.status("Shadow diterapkan ke "+motion().frames.length+" frame.");
   }})),
  el("p",{class:"sa-hint",text:"Shadow hitam flat alpha 56 (pixel-art). X/Y menggeser bayangan; lebar & tebal bisa beda per frame. Posisi mengikuti arah karakter. Edit shadow tidak mengubah Genesis atau pivot."}));
 const timingBox=el("div",{class:"sa-box"},el("h3",{text:"WAKTU · PREVIEW"}),
  el("div",{class:"sa-row"},el("label",{},"durasi frame",ui.ms,"ms"),ui.fps),
  el("div",{class:"sa-row"},el("label",{},ui.loop,"loop"),el("label",{},ui.onion,"onion skin"),ui.snap,ui.source));
 ui.gm=el("button",{type:"button",text:"♂ COWOK",onclick:()=>{S.gender="male";refreshOutfitChoices();touchPreview()}});
 ui.gf=el("button",{type:"button",text:"♀ CEWEK",onclick:()=>{S.gender="female";refreshOutfitChoices();touchPreview()}});
 ui.outfit=U.select([{label:"Tanpa baju (base)",value:"none"}],"none",v=>{S.outfit=v;touchPreview()});
 ui.hair=U.select(A().HAIRS.map(h=>({label:h==="none"?"tanpa rambut":"rambut "+h,value:h})),"none",v=>{S.hair=v;touchPreview()});
 ui.tones=el("div",{class:"sa-tones"});
 for(const t of root.LGRSkin.TONE_ORDER)ui.tones.append(el("button",{type:"button",title:t,"data-tone":t,style:"background:"+root.LGRSkin.TONES[t].i+";border-bottom-color:"+root.LGRSkin.TONES[t]["7"],onclick:()=>{S.tone=t;touchPreview()}}));
 const previewBox=el("div",{class:"sa-box"},el("h3",{text:"PREVIEW KARAKTER"}),el("div",{class:"sa-row"},ui.gm,ui.gf,ui.tones),el("div",{class:"sa-row"},ui.outfit,ui.hair),
  el("p",{class:"sa-hint",text:"Cuma preview. Animasi berlaku buat semua karakter LGR-1 (cowok/cewek, baju apa pun)."}));
 ui.name=el("input",{type:"text",class:"grow",id:"bg-name",maxLength:60,placeholder:"Nama animasi",oninput:()=>{S.dirty=true;syncControls()}});
 ui.cat=el("input",{type:"text",id:"bg-cat",maxLength:30,placeholder:"kategori",style:"width:110px",oninput:()=>{S.dirty=true;syncControls()}});
 ui.saveState=el("span",{class:"sa-tag"});
 ui.del=el("button",{type:"button",class:"danger",text:"🗑 HAPUS",onclick:U.guard(removeEntry)});
 ui.list=el("div",{class:"sa-list",id:"bg-list",role:"listbox"});
 const libBox=el("div",{class:"sa-box"},el("h3",{text:"DATABASE ANIMASI"}),
  el("div",{class:"sa-row"},ui.name,ui.cat),
  el("div",{class:"sa-row"},el("button",{type:"button",class:"primary",id:"bg-save",text:"☁ SIMPAN",onclick:U.guard(()=>save(false))}),
   el("button",{type:"button",id:"bg-saveas",text:"⧉ SIMPAN SEBAGAI BARU",onclick:U.guard(()=>save(true))}),
   el("button",{type:"button",id:"bg-new",text:"＋ BARU",onclick:newEntry}),ui.del,ui.saveState),
  el("div",{class:"sa-row"},el("button",{type:"button",id:"bg-import",text:"↑ IMPORT JSON",onclick:importJson}),el("button",{type:"button",id:"bg-export",text:"↓ EXPORT JSON",onclick:U.guard(exportJson)})),
  ui.list,el("p",{class:"sa-hint",text:"✦ = database kamu (cloud) · ◇ = bawaan LGR-1 (dibuka sebagai salinan)."}));
 ui.needed=el("div",{class:"sa-list sa-needed",id:"bg-needed"});ui.neededSum=el("span",{class:"sa-tag"});
 const needBox=el("details",{class:"sa-box",open:true},el("summary",{},el("b",{text:"ANIMASI YANG DIBUTUHKAN GAME "}),ui.neededSum),ui.needed,
  el("p",{class:"sa-hint",text:"Centang otomatis kalau animasi dengan id itu ada di database cloud. Tap item buat mulai bikin dengan id yang dipakai game. Kategori 'placeholder' = sementara."}));
 const stageCol=el("div",{class:"sa-stagecol"},el("div",{class:"sa-canvaswrap"},ui.canvas),views,frameBar);
 const side=el("div",{class:"sa-side"},libBox,needBox,partBox,shadowBox,timingBox,previewBox);
 panel.replaceChildren(el("div",{class:"sa-wrap"},stageCol,side));
 // drag-friendly canvas size
 const resize=()=>{const w=Math.min(stageCol.clientWidth-12,(root.innerHeight*(root.innerWidth<820?.5:.56))*64/112);ui.canvas.style.width=Math.max(160,Math.floor(w))+"px"};
 root.addEventListener("resize",resize);setTimeout(resize,0);
}
function refreshOutfitChoices(){
 const current=S.bases?.[S.gender],approved=(cat,v)=>DB().all("pakaian").some(e=>
  e.group===cat&&e.variant===v&&e.gender===S.gender&&e.approved&&e.baseVersion===current?.version&&e.baseRigSha256===current?.pkg?.rigSha256);
 const choices=Object.entries(A().OUTFITS).filter(([k,o])=>k==="none"||(k!=="custom"&&approved("top",o.top)&&approved("pants",o.pants)&&approved("shoes",o.shoes)));
 if(!S.ui.outfit)return;
 const value=choices.some(([k])=>k===S.outfit)?S.outfit:"none";
 S.ui.outfit.replaceChildren(...choices.map(([k,o])=>new Option(o.label,k)));
 S.ui.outfit.value=value;S.outfit=value;
}
function touchPreview(){S.entry.preview={gender:S.gender};A().clearCaches();syncControls();scheduleRender(true)}
async function init(panel){
 if(S.ready){scheduleRender(true);return}
 U.status("Bergerak: memuat base LGR-1…");
 S.lib=await A().motions();await DB().loadBuiltin();DB().setPoses(S.lib.poses);S.bases=await A().loadBases();
 await loadNeeded();S.entry=blankEntry();build(panel);S.ready=true;refreshOutfitChoices();rebuildAll();
 root.addEventListener("lgr-db-synced",()=>{if(S.ready){rebuildList();rebuildNeeded();refreshOutfitChoices()}});
 root.addEventListener("lgr-db-changed",()=>{if(S.ready)refreshOutfitChoices()});
 U.status("Bergerak siap: tap part di gambar, drag buat muter, ＋ FRAME buat frame baru, ☁ SIMPAN.");
}
root.MahlukBergerak=Object.freeze({neededStatus,get needed(){return needed},importJson,exportJson,init,get state(){return S},save,newEntry,openItem,listItems});
})(window);
