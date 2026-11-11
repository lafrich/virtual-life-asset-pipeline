/* Read-only Genesis V2 candidate comparison. NO persistence, Drive, import or official-base mutations. */
(async function(){
'use strict';
const C=window.LafrichPuppetCore,R=window.LafrichPuppetRenderer,A=window.LGRActor,M=window.LGR1Motion;
const $=id=>document.getElementById(id),DIRS=['se','sw','ne','nw'];
const COLORS=['#4db6ac','#2667dc','#a677e8','#f5a75c','#6ab850','#2984a8','#cb65a1','#e0c34b','#c67653','#f17e83','#8c91dc'];
let gender='male',dir='se',mode='motion',motion=null,lib=null,index=null,patch=null;
let playing=true,frame=0,lastFrameAt=performance.now(),busy=false,revision=0,dirty=true,lastKey='';
const cached=new Map();
const msg=(s,err=false)=>{const el=$('status');el.textContent=s;el.style.color=err?'#a52626':'#234b7e'};
async function json(url){const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw Error(url+': HTTP '+res.status);return res.json()}
function decode(b64){const raw=atob(b64),arr=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)arr[i]=raw.charCodeAt(i);return arr}
function encode(arr){let s='';for(let i=0;i<arr.length;i++)s+=String.fromCharCode(arr[i]);return btoa(s)}
function apply(rig,delta){
 const out={...rig,masks:{...rig.masks},pivots:{...rig.pivots},placements:{...rig.placements}};
 for(const d of DIRS){
  const change=delta.views[d];if(!change)throw Error('Candidate '+d+' missing');
  const mask=decode(rig.masks[d]);if(mask.length!==64*112)throw Error('Mask '+d+' not 64×112');
  for(const [at,was,now] of change.m){
   if(!Number.isInteger(at)||at<0||at>=mask.length||mask[at]!==was||!Number.isInteger(now)||now<0||now>255)
    throw Error('Candidate patch mismatch at '+d+':'+at+'. Official changed; comparison cancelled.');
   mask[at]=now;
  }
  out.masks[d]=encode(mask);
  out.pivots[d]={...rig.pivots[d]};
  for(const [part,[ox,oy,nx,ny]] of Object.entries(change.p)){
   const p=rig.pivots[d][part];if(!p||p.x!==ox||p.y!==oy)throw Error('Pivot mismatch '+d+'/'+part);
   out.pivots[d][part]={x:nx,y:ny};
  }
  if(change.o){out.placements[d]={...rig.placements[d]};for(const [part,[ox,oy,nx,ny]] of Object.entries(change.o)){
   const p=rig.placements[d][part];if(!p||p.x!==ox||p.y!==oy)throw Error('Placement mismatch '+d+'/'+part);
   out.placements[d][part]={x:nx,y:ny};
  }}
 }
 return C.validateMaster(out);
}
function counts(raw,trial,d){
 const x=decode(raw.masks[d]),y=decode(trial.masks[d]);let m=0;
 for(let i=0;i<x.length;i++)if(x[i]!==y[i])m++;
 return [m,C.PARTS.filter(p=>raw.pivots[d][p].x!==trial.pivots[d][p].x||raw.pivots[d][p].y!==trial.pivots[d][p].y).length];
}
async function pair(g,d){
 const key=g+'/'+d;if(cached.has(key))return cached.get(key);
 const promise=(async()=>{
  if(index.bases[g].rigSha256!==patch.baseSha256[g])throw Error('Official '+g+' checksum changed. V2 disabled to protect your base.');
  const official=await A.master(g,'light');
  const candidate=apply(official,patch.genders[g]);
  const prepared=await Promise.all([R.prepare(official,null,d),R.prepare(candidate,null,d)]);
  return {official,candidate,prepared};
 })();cached.set(key,promise);promise.catch(()=>cached.delete(key));return promise;
}
function overlay(canvas,maskData,rig,d,changed){
 const ctx=canvas.getContext('2d');
 for(let k=0;k<maskData.length;k++){
  const part=maskData[k];if(part===255)continue;
  ctx.fillStyle=COLORS[part]||'#e24c4c';ctx.globalAlpha=.35;ctx.fillRect(k%64,Math.floor(k/64),1,1);
 }
 ctx.globalAlpha=.9;
 ctx.fillStyle='#ffdf37';for(const at of changed)ctx.fillRect(at%64,Math.floor(at/64),1,1);
 ctx.globalAlpha=1;
 for(const part of C.PARTS){const pt=rig.pivots[d][part];ctx.fillStyle='#1c2330';ctx.fillRect(pt.x-1,pt.y,3,1);ctx.fillRect(pt.x,pt.y-1,1,3);ctx.fillStyle='#ffffff';ctx.fillRect(pt.x,pt.y,1,1)}
}
function difference(x,y){
 const a=x.getContext('2d').getImageData(0,0,64,112).data,b=y.getContext('2d').getImageData(0,0,64,112).data;let count=0;
 for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3])count++;return count;
}
function updateFrameInfo(){const n=motion?.frames.length||1;$('scrub').max=n-1;$('scrub').value=Math.min(frame,n-1);$('scrub').disabled=mode==='slice'||!motion;$('frame-text').textContent=motion?(frame+1)+'/'+n:'REST'}
function markDirty(){revision++;dirty=true;lastKey='';lastFrameAt=performance.now();void paint()}
async function paint(){
 if(!lib||busy)return;
 const activeRev=revision,g=gender,d=dir,m=motion,f=frame,overlayMode=mode==='slice';
 const key=g+'/'+d+'/'+(m?.id||'rest')+'/'+f+'/'+mode;
 if(!dirty&&key===lastKey)return;busy=true;dirty=false;
 try{
  const {official,candidate,prepared}=await pair(g,d);
  if(activeRev!==revision)return;
  const o=overlayMode?A.poseOf(official,lib,null,0,d):A.poseOf(official,lib,m,f,d);
  const t=overlayMode?A.poseOf(candidate,lib,null,0,d):A.poseOf(candidate,lib,m,f,d);
  const c0=R.render(prepared[0],o.pose,{order:o.order}),c1=R.render(prepared[1],t.pose,{order:t.order});
  if(activeRev!==revision)return;
  const differenceCount=difference(c0,c1);
  const m0=decode(official.masks[d]),m1=decode(candidate.masks[d]),changed=[];
  for(let k=0;k<m0.length;k++)if(m0[k]!==m1[k])changed.push(k);
  for(const [id,rendered,rig,mask] of [['original',c0,official,m0],['candidate',c1,candidate,m1]]){
   const dest=$(id),ctx=dest.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,64,112);ctx.drawImage(rendered,0,0);
   if(overlayMode)overlay(dest,mask,rig,d,changed);
  }
  const [mc,pc]=counts(official,candidate,d);
  $('maskdiff').textContent=String(mc);$('pivotdiff').textContent=String(pc);$('framediff').textContent=String(differenceCount);
  $('original-label').textContent=g.toUpperCase()+' · '+(g==='male'?'official-3':'official-4');
  $('candidate-label').textContent=g.toUpperCase()+' · V2 (temporary)';
  updateFrameInfo();lastKey=key;
  msg(g.toUpperCase()+' '+d.toUpperCase()+' · Official vs V2. Patch verified. No Genesis data written.');
 }catch(e){msg('Compare dibatalkan: '+(e.message||e),true)}
 finally{busy=false;if(activeRev!==revision){dirty=true;void paint()}}
}
function resetMotion(){frame=0;updateFrameInfo();markDirty()}
$('gender').addEventListener('change',()=>{gender=$('gender').value;resetMotion()});
document.querySelectorAll('[data-dir]').forEach(btn=>btn.addEventListener('click',()=>{dir=btn.dataset.dir;document.querySelectorAll('[data-dir]').forEach(x=>x.setAttribute('aria-pressed',String(x===btn)));resetMotion()}));
$('motion').addEventListener('change',()=>{motion=lib.motions.find(x=>x.id===$('motion').value)||null;resetMotion()});
$('mode-motion').addEventListener('click',()=>{mode='motion';$('mode-motion').setAttribute('aria-pressed','true');$('mode-slice').setAttribute('aria-pressed','false');markDirty()});
$('mode-slice').addEventListener('click',()=>{mode='slice';$('mode-motion').setAttribute('aria-pressed','false');$('mode-slice').setAttribute('aria-pressed','true');markDirty()});
$('play').addEventListener('click',()=>{playing=!playing;$('play').textContent=playing?'Ⅱ Pause':'▶ Play';$('play').setAttribute('aria-pressed',String(playing));lastFrameAt=performance.now()});
$('scrub').addEventListener('input',()=>{frame=Number($('scrub').value);playing=false;$('play').textContent='▶ Play';$('play').setAttribute('aria-pressed','false');updateFrameInfo();markDirty()});
function tick(now){
 if(playing&&motion&&mode==='motion'){
  const ms=motion.frames[frame]?.ms||160;
  if(now-lastFrameAt>=ms){frame=(frame+1)%motion.frames.length;lastFrameAt=now;dirty=true}
 }else lastFrameAt=now;
 void paint();requestAnimationFrame(tick);
}
try{
 [index,patch,lib]=await Promise.all([json('./media/lgr1/base/index.json'),json('./media/lgr1/base/candidates/lgr-v2-compare-patches.json'),A.motions()]);
 if(patch.format!=='lgr1-readonly-compare-patch-v1'||!patch.genders?.male||!patch.genders?.female)throw Error('Candidate patch format invalid');
 const options=[{id:'',name:'Rest / netral'},...lib.motions.map(m=>({id:m.id,name:m.name||m.id}))];
 $('motion').replaceChildren(...options.map(o=>{const el=document.createElement('option');el.value=o.id;el.textContent=o.name;return el}));
 $('motion').disabled=false;$('motion').value=lib.motions.some(m=>m.id==='walk')?'walk':'';
 motion=lib.motions.find(x=>x.id===$('motion').value)||null;
 $('legend').replaceChildren(...C.PARTS.map((part,i)=>{const el=document.createElement('span'),sw=document.createElement('i');sw.style.background=COLORS[i];el.append(sw,document.createTextNode(part));return el}));
 updateFrameInfo();markDirty();requestAnimationFrame(tick);
}catch(e){msg('Gagal memuat compare: '+(e.message||e),true)}
})();