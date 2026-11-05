/* Pixel-accurate ownership masks for Human Base Pose Maker.
 * Each opaque source pixel belongs to exactly one independently articulated
 * segment (or the static/unassigned layer). The source atlas is never edited.
 */
(function(root,factory){
 "use strict";
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.VLPoseWeights=api;
})(typeof window!=="undefined"?window:null,function(root){
 "use strict";
 const W=64,H=112,PIXELS=W*H,KEY="virtual-life-human-pose-pixel-weights-v1";
 const SEGMENTS=Object.freeze([
  {id:"unassigned",label:"UNASSIGNED / STATIC"},
  {id:"torso",label:"BODY / TORSO",rect:[21,30,22,37]},
  {id:"head",label:"HEAD",rect:[13,0,38,36]},
  {id:"upper_arm_l",label:"LEFT / UPPER ARM",rect:[10,35,14,21]},
  {id:"lower_arm_l",label:"LEFT / FOREARM + HAND",rect:[10,50,14,19]},
  {id:"upper_arm_r",label:"RIGHT / UPPER ARM",rect:[40,35,14,21]},
  {id:"lower_arm_r",label:"RIGHT / FOREARM + HAND",rect:[40,50,14,19]},
  {id:"upper_leg_l",label:"LEFT / THIGH",rect:[20,62,14,22]},
  {id:"lower_leg_l",label:"LEFT / SHIN + FOOT",rect:[20,80,14,23]},
  {id:"upper_leg_r",label:"RIGHT / THIGH",rect:[31,62,14,22]},
  {id:"lower_leg_r",label:"RIGHT / SHIN + FOOT",rect:[31,80,14,23]}
 ]);
 const maps=new Map(),versions=new Map(),layerCache=new WeakMap();
 let loaded=null,changeCallback=null,editorRefresh=null;
 const idKey=(base,dir)=>base+":"+dir;
 function encode(map){return Array.from(map,n=>String.fromCharCode(48+n)).join("");}
 function decode(text){
  if(typeof text!=="string"||text.length!==PIXELS)return null;
  const out=new Uint8Array(PIXELS);
  for(let i=0;i<PIXELS;i++){const n=text.charCodeAt(i)-48;if(n<0||n>=SEGMENTS.length)return null;out[i]=n;}
  return out;
 }
 function readStorage(){
  if(loaded)return loaded;
  try{const parsed=JSON.parse(root?.localStorage?.getItem(KEY)||"{}");
   loaded=parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed:{};
  }catch{loaded={};}
  return loaded;
 }
 function persist(){
  const db=readStorage();
  for(const [key,map]of maps)db[key]=encode(map);
  try{root?.localStorage?.setItem(KEY,JSON.stringify(db));return true;}
  catch{return false;}
 }
 function tile(img,base,dir,frame=0){
  const c=root.document.createElement("canvas");c.width=W;c.height=H;
  const ctx=c.getContext("2d",{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
  const row=(Number(base.row_starts?.idle)||4)+dir;
  const col=frame%Math.max(1,Number(base.idle_frames)||4);
  ctx.drawImage(img,col*W,row*H,W,H,0,0,W,H);
  return {canvas:c,data:ctx.getImageData(0,0,W,H)};
 }
 function defaultMap(data){
  const mask=new Uint8Array(PIXELS),rgba=data.data;
  // Set an exclusive owner for overlapping crops instead of drawing
  // the same pixel twice. Head and distal joints have last priority.
  for(let b=1;b<SEGMENTS.length;b++){
   const [x,y,w,h]=SEGMENTS[b].rect;
   for(let iy=y;iy<Math.min(H,y+h);iy++)for(let ix=x;ix<Math.min(W,x+w);ix++){
    const pos=iy*W+ix;
    if(rgba[pos*4+3])mask[pos]=b;
   }
  }
  // Opaque pixels outside all initial regions go to their nearest segment.
  // A sprite never silently loses hair, shoes, or edge pixels.
  for(let pos=0;pos<PIXELS;pos++){
   if(!rgba[pos*4+3]||mask[pos])continue;
   const x=pos%W,y=Math.floor(pos/W);
   let best=1,score=Infinity;
   for(let b=1;b<SEGMENTS.length;b++){
    const [sx,sy,sw,sh]=SEGMENTS[b].rect;
    const dx=Math.max(sx-x,0,x-(sx+sw-1)),dy=Math.max(sy-y,0,y-(sy+sh-1));
    const d=dx*dx+dy*dy;
    if(d<score){score=d;best=b;}
   }
   mask[pos]=best;
  }
  return mask;
 }
 function getMap(baseId,dir,img,base){
  const key=idKey(baseId,dir);
  if(maps.has(key))return maps.get(key);
  const saved=decode(readStorage()[key]);
  const mask=saved||defaultMap(tile(img,base,dir).data);
  maps.set(key,mask);
  return mask;
 }
 function touch(baseId,dir){
  const key=idKey(baseId,dir);versions.set(key,(versions.get(key)||0)+1);
  if(changeCallback)changeCallback();
 }
 function brush(mask,x,y,radius,segment,transparent){
  if(!mask||mask.length!==PIXELS||!Number.isInteger(segment)||
    segment<0||segment>=SEGMENTS.length)return 0;
  const px=Math.floor(x),py=Math.floor(y),r=Math.max(0,Math.min(12,Math.floor(radius)));
  let changed=0;
  for(let iy=Math.max(0,py-r);iy<=Math.min(H-1,py+r);iy++)
   for(let ix=Math.max(0,px-r);ix<=Math.min(W-1,px+r);ix++){
    if((ix-px)**2+(iy-py)**2>r*r)continue;
    const n=iy*W+ix;
    if(transparent&&transparent[n*4+3]===0)continue;
    if(mask[n]!==segment){mask[n]=segment;changed++;}
   }
  return changed;
 }
 function layers(img,base,dir,frame=0){
  const baseId=base.id||base.base_id||"unknown";
  const key=idKey(baseId,dir),rev=versions.get(key)||0;
  let cache=layerCache.get(img);
  if(!cache){cache=new Map();layerCache.set(img,cache);}
  const cacheKey=key+":"+frame+":"+rev;
  if(cache.has(cacheKey))return cache.get(cacheKey);
  const mask=getMap(baseId,dir,img,base),src=tile(img,base,dir,frame).data;
  const outputs=SEGMENTS.map(()=>root.document.createElement("canvas"));
  const buffers=outputs.map(c=>{c.width=W;c.height=H;return c.getContext("2d").createImageData(W,H);});
  for(let p=0;p<PIXELS;p++){
   const target=buffers[mask[p]].data,offset=p*4;
   target[offset]=src.data[offset];target[offset+1]=src.data[offset+1];
   target[offset+2]=src.data[offset+2];target[offset+3]=src.data[offset+3];
  }
  outputs.forEach((c,i)=>c.getContext("2d").putImageData(buffers[i],0,0));
  // Bounded cache; a brush stroke invalidates old layers.
  if(cache.size>14)cache.clear();
  cache.set(cacheKey,outputs);return outputs;
 }
 function paint(ctx,img,base,dir,pose,p0,frame=0){
  const images=layers(img,base,dir,frame);
  const view=[.22,-.22,.22,-.22][dir],back=dir>=2;
  function xy(id){const p=pose[id];return [p[0]+p[2]*view,p[1]-p[2]*.12];}
  function limb(index,from,to){
   const f=xy(from),g=xy(to),o=p0[from],e=p0[to];
   const orig=Math.atan2(e[1]-o[1],e[0]-o[0]);
   const angle=Math.atan2(g[1]-f[1],g[0]-f[0])-orig;
   const oldLength=Math.max(1,Math.hypot(e[0]-o[0],e[1]-o[1]));
   const newLength=Math.max(1,Math.hypot(g[0]-f[0],g[1]-f[1]));
   const ratio=Math.max(.8,Math.min(1.2,newLength/oldLength));
   ctx.save();ctx.translate(Math.round(f[0]),Math.round(f[1]));
   ctx.rotate(angle);ctx.scale(ratio,ratio);
   ctx.drawImage(images[index],-o[0],-o[1]);ctx.restore();
  }
  function torso(){
   const f=xy("chest"),g=xy("pelvis");
   ctx.save();ctx.translate(Math.round(f[0]),Math.round(f[1]));
   ctx.rotate(-Math.atan2(g[0]-f[0],g[1]-f[1]));
   ctx.drawImage(images[1],-p0.chest[0],-p0.chest[1]);ctx.restore();
  }
  function head(){
   const f=xy("neck"),g=xy("head"),o=p0.neck,e=p0.head;
   const angle=Math.atan2(g[0]-f[0],f[1]-g[1])-Math.atan2(e[0]-o[0],o[1]-e[1]);
   ctx.save();ctx.translate(Math.round(f[0]),Math.round(f[1]));
   ctx.rotate(angle);ctx.drawImage(images[2],-o[0],-o[1]);ctx.restore();
  }
  const arm=side=>{
   limb(side==="l"?3:5,"shoulder_"+side,"elbow_"+side);
   limb(side==="l"?4:6,"elbow_"+side,"wrist_"+side);
  };
  const leg=side=>{
   limb(side==="l"?7:9,"hip_"+side,"knee_"+side);
   limb(side==="l"?8:10,"knee_"+side,"ankle_"+side);
  };
  ctx.drawImage(images[0],0,0);
  if(back){arm("l");leg("l");arm("r");leg("r");torso();head();}
  else{leg("r");arm("r");torso();leg("l");arm("l");head();}
 }
 function serialize(baseId,img,base){
  const directions={};
  for(let d=0;d<4;d++)directions[["se","sw","ne","nw"][d]]=encode(getMap(baseId,d,img,base));
  return {format:"human-pixel-weight-ownership-v1",width:W,height:H,segments:SEGMENTS.map(s=>s.id),directions};
 }
 function mount({source,images,onChange}){
  const $=id=>root.document.getElementById(id);
  const canvas=$("pose-weight-canvas");if(!canvas)return;
  const select=$("pose-weight-bone"),basePicker=$("pose-weight-base"),facing=$("pose-facing");
  SEGMENTS.forEach((s,index)=>{
   const option=root.document.createElement("option");option.value=String(index);
   option.textContent=s.label;select.append(option);
  });
  select.value="1";
  changeCallback=onChange;
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  let drawing=false,mode="paint",lastPoint=null;
  const overlayCanvas=root.document.createElement("canvas");overlayCanvas.width=W;overlayCanvas.height=H;
  const current=()=>{
   const baseId=basePicker.value,dir=Number(facing.value);
   if(!source[baseId]||!images[baseId])return null;
   const t=tile(images[baseId],source[baseId],dir);
   return {baseId,dir,base:source[baseId],img:images[baseId],tile:t,
    mask:getMap(baseId,dir,images[baseId],source[baseId])};
  };
  function refresh(){
   const item=current();ctx.clearRect(0,0,W,H);
   if(!item)return;
   ctx.imageSmoothingEnabled=false;ctx.drawImage(item.tile.canvas,0,0);
   const selected=Number(select.value),overlay=ctx.createImageData(W,H);
   let assigned=0;
   for(let p=0;p<PIXELS;p++){
    const alpha=item.tile.data.data[p*4+3];if(!alpha)continue;
    const on=item.mask[p]===selected;
    if(on)assigned++;
    const pos=p*4;
    overlay.data[pos]=on?43:17;
    overlay.data[pos+1]=on?134:31;
    overlay.data[pos+2]=on?255:51;
    overlay.data[pos+3]=on?132:37;
   }
   overlayCanvas.getContext("2d").putImageData(overlay,0,0);
   ctx.drawImage(overlayCanvas,0,0);
   ctx.save();ctx.strokeStyle="rgba(20,52,91,.35)";ctx.lineWidth=.18;
   for(let x=0;x<=W;x+=8){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
   for(let y=0;y<=H;y+=8){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
   ctx.restore();
   $("pose-weight-info").textContent=assigned+" PX / "+SEGMENTS[selected].label+
    " / "+(item.dir+1)+" OF 4 · PAINT SAVES MASK AUTOMATICALLY";
  }
  editorRefresh=refresh;
  function stroke(e){
   const item=current();if(!item)return;
   const rect=canvas.getBoundingClientRect();
   const x=(e.clientX-rect.left)*W/rect.width,y=(e.clientY-rect.top)*H/rect.height;
   const n=mode==="erase"?0:Number(select.value);
   const start=lastPoint||[x,y],distance=Math.hypot(x-start[0],y-start[1]);
   const steps=Math.max(1,Math.ceil(distance)),radius=Number($("pose-weight-size").value);
   let changed=0;
   for(let i=0;i<=steps;i++){
    const t=i/steps;
    changed+=brush(item.mask,start[0]+(x-start[0])*t,start[1]+(y-start[1])*t,
     radius,n,item.tile.data);
   }
   lastPoint=[x,y];
   if(changed){touch(item.baseId,item.dir);refresh();}
  }
  canvas.addEventListener("pointerdown",e=>{
   if(!current())return;
   drawing=true;lastPoint=null;canvas.setPointerCapture(e.pointerId);stroke(e);e.preventDefault();
  });
  canvas.addEventListener("pointermove",e=>{if(drawing&&canvas.hasPointerCapture(e.pointerId))stroke(e);});
  function finish(e){
   if(!drawing)return;
   drawing=false;lastPoint=null;
   if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
   persist();refresh();
  }
  canvas.addEventListener("pointerup",finish);canvas.addEventListener("pointercancel",finish);
  for(const button of root.document.querySelectorAll("[data-pose-weight-tool]"))
   button.addEventListener("click",()=>{
    mode=button.dataset.poseWeightTool;
    for(const b of root.document.querySelectorAll("[data-pose-weight-tool]")){
     const on=b===button;b.classList.toggle("active",on);b.setAttribute("aria-pressed",String(on));
    }
   });
  $("pose-weight-reset").addEventListener("click",()=>{
   const item=current();if(!item)return;
   maps.set(idKey(item.baseId,item.dir),defaultMap(item.tile.data));
   touch(item.baseId,item.dir);persist();refresh();
  });
  select.addEventListener("change",refresh);
  basePicker.addEventListener("change",refresh);
  facing.addEventListener("change",refresh);
  $("pose-weight-size").addEventListener("input",e=>
   $("pose-weight-size-label").textContent=String(2*Number(e.target.value)+1)+" PX");
  refresh();
  return {refresh};
 }
 return Object.freeze({W,H,KEY,SEGMENTS,encode,decode,defaultMap,brush,getMap,
  layers,paint,serialize,mount,refresh:()=>editorRefresh?.()});
});