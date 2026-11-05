/* Mahluk Hidup · Action Editor LOCAL Pose Maker.
 * This is intentionally unrelated to the canonical Human Pose Maker database.
 * Only the selected actor/action/direction/frame receives the rendered PNG;
 * existing joints, shared motion tracks and source sprites stay untouched.
 */
(function(root,factory){
 "use strict";
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.VLActionLocalPoser=api;
})(typeof window!=="undefined"?window:null,function(root){
 "use strict";
 const W=64,H=112,KEY="virtual-life-action-local-poser-v1";
 const PARTS=Object.freeze([
  {id:"head",label:"HEAD",rect:[13,0,38,35]},
  {id:"body",label:"BODY / TORSO",rect:[21,30,22,36]},
  {id:"arm_l",label:"LEFT ARM",rect:[10,34,15,36]},
  {id:"arm_r",label:"RIGHT ARM",rect:[39,34,15,36]},
  {id:"leg_l",label:"LEFT LEG",rect:[19,63,14,45]},
  {id:"leg_r",label:"RIGHT LEG",rect:[32,63,14,45]}
 ]);
 const ORDER=Object.freeze(["body","leg_r","arm_r","leg_l","arm_l","head"]);
 const byId=Object.fromEntries(PARTS.map(p=>[p.id,p]));
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number(n)||0));
 const defaultPose=()=>Object.fromEntries(PARTS.map(part=>[part.id,{
  dx:0,dy:0,angle:0,scale:100,layer:"front"}]));
 const defaultRegions=()=>Object.fromEntries(PARTS.map(p=>[p.id,[...p.rect]]));
 function region(rect,initial=[0,0,W,H]){
  if(!Array.isArray(rect)||rect.length!==4||!rect.every(Number.isFinite))rect=initial;
  const x=Math.round(clamp(rect[0],0,W-3)),y=Math.round(clamp(rect[1],0,H-3));
  return [x,Math.round(y),Math.round(clamp(rect[2],3,W-x)),Math.round(clamp(rect[3],3,H-y))];
 }
 function transforms(v){
  const out=defaultPose();
  for(const part of PARTS){
   const src=v?.[part.id]||{},target=out[part.id];
   target.dx=Math.round(clamp(src.dx,-48,48));
   target.dy=Math.round(clamp(src.dy,-64,64));
   target.angle=Math.round(clamp(src.angle,-180,180));
   target.scale=Math.round(clamp(src.scale,40,200))||100;
   target.layer=src.layer==="back"?"back":"front";
  }
  return out;
 }
 function normalizedModel(value){
  const rects=defaultRegions();
  for(const part of PARTS)rects[part.id]=region(value?.regions?.[part.id],part.rect);
  return {regions:rects,pose:transforms(value?.pose)};
 }
 const inside=(rect,x,y)=>x>=rect[0]&&y>=rect[1]&&x<rect[0]+rect[2]&&y<rect[1]+rect[3];
 function ownership(rgba,regions){
  const owner=new Int8Array(W*H).fill(-1);
  // Explicit priority guarantees an opaque pixel cannot be duplicated even
  // where the original flattened source's head/arm boxes overlap the torso.
  const priority=["head","arm_l","arm_r","leg_l","leg_r","body"];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const i=y*W+x;if(!rgba[i*4+3])continue;
   for(const id of priority){
    if(inside(regions[id],x,y)){owner[i]=PARTS.findIndex(p=>p.id===id);break;}
   }
  }
  return owner;
 }
 function split(sourceCanvas,regions,doc){
  const context=sourceCanvas.getContext("2d",{willReadFrequently:true});
  const image=context.getImageData(0,0,W,H);
  const mask=ownership(image.data,regions);
  const layers=new Map();
  for(const id of ["static",...PARTS.map(x=>x.id)]){
   const canvas=doc.createElement("canvas");canvas.width=W;canvas.height=H;
   layers.set(id,canvas);
  }
  const contexts=new Map([...layers].map(([id,canvas])=>
   [id,canvas.getContext("2d",{willReadFrequently:true})]));
  const buffers=new Map([...contexts].map(([id,ctx])=>[id,ctx.createImageData(W,H)]));
  for(let i=0;i<W*H;i++){
   const id=mask[i]<0?"static":PARTS[mask[i]].id;
   const sourceIndex=i*4,out=buffers.get(id).data;
   for(let j=0;j<4;j++)out[sourceIndex+j]=image.data[sourceIndex+j];
  }
  for(const [id,ctx] of contexts)ctx.putImageData(buffers.get(id),0,0);
  return layers;
 }
 function compose(ctx,sourceCanvas,model,doc){
  const layers=split(sourceCanvas,model.regions,doc);
  ctx.clearRect(0,0,W,H);ctx.imageSmoothingEnabled=false;
  ctx.drawImage(layers.get("static"),0,0);
  function part(id){
   const shape=model.regions[id],t=model.pose[id];
   const cx=shape[0]+shape[2]/2,cy=shape[1]+shape[3]/2;
   ctx.save();ctx.translate(Math.round(cx+t.dx),Math.round(cy+t.dy));
   ctx.rotate(t.angle*Math.PI/180);ctx.scale(t.scale/100,t.scale/100);
   ctx.drawImage(layers.get(id),-cx,-cy);ctx.restore();
  }
  for(const id of ORDER)if(model.pose[id].layer==="back")part(id);
  for(const id of ORDER)if(model.pose[id].layer!=="back")part(id);
  return ctx;
 }
 function hitBox(rect,x,y){
  const [l,t,w,h]=rect,r=l+w,b=t+h,delta=2.5;
  const L=Math.abs(x-l)<=delta,R=Math.abs(x-r)<=delta;
  const T=Math.abs(y-t)<=delta,B=Math.abs(y-b)<=delta;
  if(L&&T)return "nw";if(R&&T)return "ne";
  if(L&&B)return "sw";if(R&&B)return "se";
  if(L&&y>=t-delta&&y<=b+delta)return "w";
  if(R&&y>=t-delta&&y<=b+delta)return "e";
  if(T&&x>=l-delta&&x<=r+delta)return "n";
  if(B&&x>=l-delta&&x<=r+delta)return "s";
  return inside(rect,x,y)?"move":null;
 }
 function editBox(rect,handle,dx,dy){
  const [sx,sy,sw,sh]=rect;
  let l=sx,t=sy,r=l+sw,b=t+sh;
  dx=Math.round(dx);dy=Math.round(dy);
  if(handle==="move")return [
   Math.round(clamp(l+dx,0,W-sw)),Math.round(clamp(t+dy,0,H-sh)),sw,sh];
  if(handle.includes("w"))l=Math.round(clamp(l+dx,0,r-3));
  if(handle.includes("e"))r=Math.round(clamp(r+dx,l+3,W));
  if(handle.includes("n"))t=Math.round(clamp(t+dy,0,b-3));
  if(handle.includes("s"))b=Math.round(clamp(b+dy,t+3,H));
  return [l,t,r-l,b-t];
 }
 const itemKey=o=>[o.actor,o.action,o.direction,o.frame].join(":");
 const safeKey=key=>/^[a-z0-9_-]{1,90}:[a-z0-9_-]{1,90}:(se|sw|ne|nw):([0-9]|[1-3][0-9])$/.test(key);
 function read(){
  try{const x=JSON.parse(root?.localStorage?.getItem(KEY)||"{}");
   return x&&typeof x==="object"&&!Array.isArray(x)?x:{};
  }catch{return {};}
 }
 function mount({onApply,onStatus}){
  const doc=root?.document,$=id=>doc.getElementById(id);
  const panel=$("ae-local-pose-overlay");
  if(!panel)return null;
  const canvas=$("ae-local-pose-canvas"),ctx=canvas.getContext("2d");
  const source=doc.createElement("canvas");source.width=W;source.height=H;
  const stage=doc.createElement("canvas");stage.width=W;stage.height=H;
  const stageCtx=stage.getContext("2d");
  const selection=$("ae-local-pose-part");
  selection.replaceChildren();
  for(const part of PARTS){
   const o=doc.createElement("option");o.value=part.id;o.textContent=part.label;selection.append(o);
  }
  let active=false,context=null,part="head",mode="pose",model=normalizedModel({}),drag=null;
  let pending=null,basePNG="";
  function status(note){$("ae-local-pose-note").textContent=note;onStatus?.(note);}
  function sync(){
   const t=model.pose[part],rect=model.regions[part];
   for(const [name,value]of [["x",t.dx],["y",t.dy],["angle",t.angle],
    ["scale",t.scale],["layer",t.layer],["rx",rect[0]],["ry",rect[1]],
    ["rw",rect[2]],["rh",rect[3]]]){
    const node=$("ae-local-pose-"+name);
    if(node)node.value=String(value);
   }
   $("ae-local-pose-part").value=part;
   $("ae-local-pose-current").textContent=byId[part].label;
   $("ae-local-pose-context").textContent=context?
    context.actor.toUpperCase()+" / "+context.action.toUpperCase()+
    " / "+context.direction.toUpperCase()+" / F"+(context.frame+1):"NO FRAME";
   for(const button of doc.querySelectorAll("[data-ae-local-mode]")){
    const on=button.dataset.aeLocalMode===mode;
    button.classList.toggle("active",on);button.setAttribute("aria-pressed",String(on));
   }
  }
  function display(){
   if(!active)return;
   compose(stageCtx,source,model,doc);
   ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,W,H);ctx.drawImage(stage,0,0);
   const rect=model.regions[part],t=model.pose[part];
   const [x,y,w,h]=mode==="region"?rect:[rect[0]+t.dx,rect[1]+t.dy,
    rect[2]*t.scale/100,rect[3]*t.scale/100];
   ctx.save();ctx.strokeStyle="#159bff";ctx.lineWidth=.6;ctx.setLineDash([2,1]);
   ctx.strokeRect(x+.25,y+.25,w-.5,h-.5);
   if(mode==="region"){
    ctx.setLineDash([]);ctx.fillStyle="#ffffff";ctx.strokeStyle="#164998";
    for(const [hx,hy]of [[x,y],[x+w,y],[x,y+h],[x+w,y+h],
      [x+w/2,y],[x+w/2,y+h],[x,y+h/2],[x+w,y+h/2]]){
     ctx.fillRect(hx-1.2,hy-1.2,2.4,2.4);ctx.strokeRect(hx-1.2,hy-1.2,2.4,2.4);
    }
   }
   ctx.restore();
  }
  function setPart(next){
   if(!byId[next])return;
   part=next;sync();display();
  }
  function open(options){
   if(!options?.canvas||!safeKey(itemKey(options)))return false;
   context={actor:options.actor,action:options.action,
    direction:options.direction,frame:options.frame};
   active=true;drag=null;mode="pose";part="head";model=normalizedModel({});
   panel.hidden=false;
   function fromCanvas(){
    source.getContext("2d").clearRect(0,0,W,H);
    source.getContext("2d").drawImage(options.canvas,0,0);
    basePNG=source.toDataURL("image/png");model=normalizedModel({});
    pending=null;sync();display();
    status("EDITING THIS ACTION FRAME ONLY · DRAG A PART TO REPOSITION IT");
   }
   const record=read()[itemKey(context)];
   const currentPNG=options.canvas.toDataURL("image/png");
   if(record&&record.result===currentPNG&&record.base&&record.model){
    const image=new root.Image();
    image.onload=()=>{
     if(!active||itemKey(context)!==itemKey(options))return;
     const c=source.getContext("2d");c.clearRect(0,0,W,H);c.drawImage(image,0,0,W,H);
     basePNG=record.base;model=normalizedModel(record.model);
     pending=null;sync();display();
     status("LOADED SAVED ACTION-ONLY PART ADJUSTMENTS");
    };
    image.onerror=fromCanvas;image.src=record.base;
    sync();return true;
   }
   fromCanvas();return true;
  }
  function close(){active=false;drag=null;panel.hidden=true;}
  function coords(e){
   const r=canvas.getBoundingClientRect();
   return [(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height];
  }
  canvas.addEventListener("pointerdown",e=>{
   if(!active||e.button!==0)return;
   const [x,y]=coords(e),rect=model.regions[part];
   const handle=mode==="region"?hitBox(rect,x,y):"move";
   if(!handle)return;
   drag={x,y,handle,region:[...rect],dx:model.pose[part].dx,dy:model.pose[part].dy};
   canvas.setPointerCapture(e.pointerId);e.preventDefault();
  });
  canvas.addEventListener("pointermove",e=>{
   if(!drag||!canvas.hasPointerCapture(e.pointerId))return;
   const [x,y]=coords(e);
   if(mode==="region")model.regions[part]=editBox(drag.region,drag.handle,x-drag.x,y-drag.y);
   else{
    model.pose[part].dx=Math.round(clamp(drag.dx+x-drag.x,-48,48));
    model.pose[part].dy=Math.round(clamp(drag.dy+y-drag.y,-64,64));
   }
   sync();display();
  });
  function end(e){
   if(!drag)return;drag=null;
   if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  }
  canvas.addEventListener("pointerup",end);canvas.addEventListener("pointercancel",end);
  selection.addEventListener("change",()=>setPart(selection.value));
  for(const button of doc.querySelectorAll("[data-ae-local-mode]"))
   button.addEventListener("click",()=>{
    if(!active)return;mode=button.dataset.aeLocalMode;sync();display();
   });
  const transformNames=["x","y","angle","scale","layer"];
  for(const name of transformNames){
   $("ae-local-pose-"+name).addEventListener("input",e=>{
    if(!active)return;
    const prop=name==="x"?"dx":name==="y"?"dy":name;
    model.pose[part][prop]=name==="layer"?e.target.value:Number(e.target.value);
    display();
   });
  }
  for(const [index,name]of ["rx","ry","rw","rh"].entries()){
   $("ae-local-pose-"+name).addEventListener("change",e=>{
    if(!active)return;
    const r=[...model.regions[part]];r[index]=Number(e.target.value);
    model.regions[part]=region(r,byId[part].rect);sync();display();
   });
  }
  $("ae-local-pose-reset-part").addEventListener("click",()=>{
   if(!active)return;
   model.pose[part]={...defaultPose()[part]};
   model.regions[part]=[...byId[part].rect];sync();display();
  });
  $("ae-local-pose-close").addEventListener("click",close);
  $("ae-local-pose-cancel").addEventListener("click",close);
  $("ae-local-pose-apply").addEventListener("click",()=>{
   if(!active||!context)return;
   compose(stageCtx,source,model,doc);
   const output=stage.toDataURL("image/png");
   if(output===basePNG){status("NO PART CHANGES TO APPLY");return;}
   pending={key:itemKey(context),base:basePNG,result:output,model:normalizedModel(model)};
   onApply?.(stage,{...context});
   close();
  });
  function commit(value){
   if(!pending||!value||itemKey(value)!==pending.key)return false;
   try{
    const db=read();db[pending.key]={base:pending.base,result:pending.result,model:pending.model};
    root.localStorage.setItem(KEY,JSON.stringify(db));pending=null;return true;
   }catch{pending=null;return false;}
  }
  function clear(value){
   if(!value||!safeKey(itemKey(value)))return;
   const db=read();delete db[itemKey(value)];pending=null;
   try{root.localStorage.setItem(KEY,JSON.stringify(db));}catch{}
  }
  return {open,close,commit,clear,get active(){return active;}};
 }
 return Object.freeze({KEY,PARTS,ORDER,defaultPose,defaultRegions,
  region,transforms,normalizedModel,ownership,hitBox,editBox,split,compose,mount});
});