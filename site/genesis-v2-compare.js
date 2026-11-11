/* Read-only Genesis Candidate Lab V2/V4 comparison. NO persistence, Drive, import or official-base mutations. */
(async function(){
'use strict';
const C=window.LafrichPuppetCore,R=window.LafrichPuppetRenderer,A=window.LGRActor,M=window.LGR1Motion;
const $=id=>document.getElementById(id),DIRS=['se','sw','ne','nw'];
const COLORS=['#4db6ac','#2667dc','#a677e8','#f5a75c','#6ab850','#2984a8','#cb65a1','#e0c34b','#c67653','#f17e83','#8c91dc'];
let gender='female',version='v4',dir='se',mode='motion',motion=null,lib=null,index=null,patch=null,v4Patch=null;
let playing=true,frame=0,lastFrameAt=performance.now(),busy=false,revision=0,dirty=true,lastKey='';
const cached=new Map();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function fillVerticalGaps(data,x0,x1,y0,y1,maxGap){
 let added=0; const W=64,H=112;
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
  const o=(y*W+x)*4;if(data[o+3])continue;
  let up=-1,down=-1,du=0,dd=0;
  for(let k=1;k<=maxGap;k++){const yy=y-k;if(yy<0)break;const i=(yy*W+x)*4;if(data[i+3]){up=i;du=k;break}}
  for(let k=1;k<=maxGap;k++){const yy=y+k;if(yy>=H)break;const i=(yy*W+x)*4;if(data[i+3]){down=i;dd=k;break}}
  if(up<0||down<0||du+dd>maxGap+1)continue;
  const src=du<=dd?up:down; data[o]=data[src];data[o+1]=data[src+1];data[o+2]=data[src+2];data[o+3]=data[src+3]; added++;
 }
 return added;
}
function fillHorizontalGaps(data,x0,x1,y0,y1,maxGap){
 let added=0; const W=64;
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const o=(y*W+x)*4;if(data[o+3])continue;
  let lf=-1,rt=-1,dl=0,dr=0;
  for(let k=1;k<=maxGap;k++){const xx=x-k;if(xx<0)break;const i=(y*W+xx)*4;if(data[i+3]){lf=i;dl=k;break}}
  for(let k=1;k<=maxGap;k++){const xx=x+k;if(xx>=W)break;const i=(y*W+xx)*4;if(data[i+3]){rt=i;dr=k;break}}
  if(lf<0||rt<0||dl+dr>maxGap+1)continue;
  const src=dl<=dr?lf:rt; data[o]=data[src];data[o+1]=data[src+1];data[o+2]=data[src+2];data[o+3]=data[src+3]; added++;
 }
 return added;
}
function addAdaptiveBridge(canvas,d,meta){
 if(!meta||!meta.style||meta.style==='motion' || meta.style==='rest') return 0;
 const ctx=canvas.getContext('2d');const img=ctx.getImageData(0,0,64,112);const data=img.data;
 const side=['sw','nw'].includes(d)?-1:0;let added=0;
 if(meta.style==='bend'){
  const strength=clamp((meta.degrees/65)*(meta.t||0),0,1); if(strength<0.14) return 0;
  added+=fillVerticalGaps(data,24+side,39+side,68,80,3+(strength>.55?1:0));
  added+=fillHorizontalGaps(data,25+side,39+side,70,78,2);
  if(strength>.45) added+=fillVerticalGaps(data,28+side,35+side,51,57,2); // neck
  if(strength>.35) added+=fillHorizontalGaps(data,22+side,41+side,60,68,2); // shoulder seam
 }
 if(meta.style==='squat'){
  const strength=clamp(meta.t||0,0,1); if(strength<0.1) return 0;
  added+=fillVerticalGaps(data,24+side,39+side,74,87,3);
  added+=fillHorizontalGaps(data,24+side,39+side,78,86,2);
 }
 if(meta.style==='reach'){
  const strength=clamp(meta.t||0,0,1); if(strength<0.1) return 0;
  added+=fillHorizontalGaps(data,20+side,43+side,58,69,2);
 }
 if(added) ctx.putImageData(img,0,0);
 return added;
}

function tests(){
 const phases=[0,.18,.4,.7,1,.7,.4,.18];
 const make=(id,name,style,degrees)=>({id,name,style,degrees,loop:true,frames:phases.map(t=>({ms:230,t}))});
 return [make('v4_bend35','BUNGKUK 35° / LIGHT','bend',35),make('v4_bend48','BUNGKUK 48° / STRESS','bend',48),make('v4_bend65','BUNGKUK 65° / EXTREME','bend',65),
  make('v4_squat','SQUAT / KNEE','squat',1),make('v4_reach','RAISE ARMS / SHOULDER','reach',1)];
}
function poseFor(master,m,f,d){
 if(!m)return {pose:C.blankPose(),order:A.baseOrder(master,d),style:'rest',t:0,degrees:0};
 if(!m.style){const p=A.poseOf(master,lib,m,f,d);return {...p,style:'motion',t:0,degrees:0}}
 const sign=['se','ne'].includes(d)?1:-1,t=m.frames[f]?.t??0;
 const pose=C.blankPose();
 function set(part,a,x=0,y=0){pose[part]={a,x,y}}
 if(m.style==='bend'){
  const raw=sign*m.degrees*t;
  const torsoA=raw*0.64,pelvisA=raw*0.22,headA=-raw*0.30;
  set('torso',torsoA,sign*0.8*t,0);
  set('pelvis',pelvisA,-sign*(m.degrees>=60?2.8:1.6)*t,1.2*t);
  set('head',headA,0,-0.8*t);
  set('arm_near_upper',raw*0.10);set('arm_far_upper',-raw*0.05);
  set('leg_near_upper',-raw*0.08,0,0.3*t);set('leg_far_upper',-raw*0.08,0,0.3*t);
 }else if(m.style==='squat'){
  set('torso',sign*11*t,0,-0.5*t);set('pelvis',sign*7*t,0,2.4*t);
  set('leg_near_upper',-sign*39*t);set('leg_far_upper',sign*34*t);
  set('leg_near_lower',sign*68*t);set('leg_far_lower',-sign*58*t);
 }else if(m.style==='reach'){
  set('torso',-sign*9*t);set('pelvis',sign*4*t,0,0.8*t);
  set('arm_near_upper',-sign*95*t);set('arm_near_lower',sign*24*t);
  set('arm_far_upper',-sign*52*t);set('head',sign*4*t);
 }
 return {pose,order:A.baseOrder(master,d),style:m.style,t,degrees:m.degrees||0};
}

function motionChoices(){return version==='v4'&&gender==='female'?[...tests(),...lib.motions]:lib.motions;}
function resetMotionPicker(preferred){
 const motions=motionChoices();const select=$('motion');
 select.replaceChildren(...[{id:'',name:'REST / Netral'},...motions.map(m=>({id:m.id,name:m.name||m.id}))].map(o=>{const el=document.createElement('option');el.value=o.id;el.textContent=o.name;return el}));
 select.disabled=false;const id=preferred&&motions.some(m=>m.id===preferred)?preferred:(version==='v4'&&gender==='female'?'v4_bend48':(motions.some(m=>m.id==='walk')?'walk':''));
 select.value=id;motion=motions.find(m=>m.id===id)||null;frame=0;
 $('candidate-version').value=version;
 $('candidate-version').querySelector('[value="v4"]').disabled=gender!=='female';
 $('bridge-stat').hidden=version!=='v4';updateFrameInfo();
}
function safeSelection(){if(gender==='male'&&version==='v4')version='v2';}
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
async function pair(g,d,v){
 const key=g+'/'+d+'/'+v;if(cached.has(key))return cached.get(key);
 const promise=(async()=>{
  if(index.bases[g].rigSha256!==patch.baseSha256[g])throw Error('Official '+g+' checksum changed. Candidate disabled.');
  if(v==='v4'&&(g!=='female'||!v4Patch||index.bases.female.rigSha256!==v4Patch.officialSha256))throw Error('Female V4 base checksum mismatch.');
  const official=await A.master(g,'light');
  const candidate=apply(official,v==='v4'?v4Patch:patch.genders[g]);
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
 const activeRev=revision,g=gender,v=version,d=dir,m=motion,f=frame,overlayMode=mode==='slice';
 const key=g+'/'+v+'/'+d+'/'+(m?.id||'rest')+'/'+f+'/'+mode;
 if(!dirty&&key===lastKey)return;busy=true;dirty=false;
 try{
  const {official,candidate,prepared}=await pair(g,d,v);
  if(activeRev!==revision)return;
  const o=overlayMode?poseFor(official,null,0,d):poseFor(official,m,f,d);
  const t=overlayMode?poseFor(candidate,null,0,d):poseFor(candidate,m,f,d);
  const c0=R.render(prepared[0],o.pose,{order:o.order}),c1=R.render(prepared[1],t.pose,{order:t.order});
  let bridged=0;
  if(v==='v4'&&!overlayMode)bridged=addAdaptiveBridge(c1,d,t);
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
  $('bridge-count').textContent=String(bridged);
  $('original-label').textContent=g.toUpperCase()+' · '+(g==='male'?'official-3':'official-4');
  $('candidate-label').textContent=g.toUpperCase()+' · '+v.toUpperCase()+' (temporary)';
  $('candidate-title').textContent='CANDIDATE '+v.toUpperCase()+' · PREVIEW';
  $('candidate-description').textContent=v==='v4'?'Female V4 memakai patch slicing/pivot dan adaptive bridge sementara saat pose stress; tidak disimpan ke Genesis.':'Candidate V2 menguji mask ownership dan pivot pada artwork yang sama; tidak disimpan ke Genesis.';
  updateFrameInfo();lastKey=key;
  msg(g.toUpperCase()+' '+d.toUpperCase()+' · Official vs '+v.toUpperCase()+'. Read-only, no Genesis writes.');
 }catch(e){msg('Compare dibatalkan: '+(e.message||e),true)}
 finally{busy=false;if(activeRev!==revision){dirty=true;void paint()}}
}
function resetMotion(){frame=0;updateFrameInfo();markDirty()}
$('gender').addEventListener('change',()=>{gender=$('gender').value;safeSelection();resetMotionPicker(null);resetMotion()});
$('candidate-version').addEventListener('change',()=>{version=$('candidate-version').value;safeSelection();resetMotionPicker(null);resetMotion()});
document.querySelectorAll('[data-dir]').forEach(btn=>btn.addEventListener('click',()=>{dir=btn.dataset.dir;document.querySelectorAll('[data-dir]').forEach(x=>x.setAttribute('aria-pressed',String(x===btn)));resetMotion()}));
$('motion').addEventListener('change',()=>{motion=motionChoices().find(x=>x.id===$('motion').value)||null;resetMotion()});
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
 v4Patch=JSON.parse(document.getElementById('v4-patch-data').textContent);
 if(patch.format!=='lgr1-readonly-compare-patch-v1'||!patch.genders?.male||!patch.genders?.female)throw Error('Candidate V2 patch invalid');
 if(v4Patch.format!=='lgr1-female-v3-readonly-preview-v1'||v4Patch.gender!=='female')throw Error('Candidate V4 patch invalid');
 const q=new URLSearchParams(location.search);gender=q.get('gender')==='male'?'male':'female';version=q.get('candidate')==='v2'?'v2':'v4';safeSelection();
 $('gender').value=gender;resetMotionPicker(null);
 $('legend').replaceChildren(...C.PARTS.map((part,i)=>{const el=document.createElement('span'),sw=document.createElement('i');sw.style.background=COLORS[i];el.append(sw,document.createTextNode(part));return el}));
 updateFrameInfo();markDirty();requestAnimationFrame(tick);
}catch(e){msg('Gagal memuat compare: '+(e.message||e),true)}
})();