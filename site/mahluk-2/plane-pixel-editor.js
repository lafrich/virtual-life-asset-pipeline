/* Mahluk Hidup 2.0 — native-resolution pixel editor per transparent plane.
 * Edits 64x112 RGBA pixels across SE/SW/NE/NW in a 64x448 source atlas.
 * No canvas scaling is saved. The rig, pivots, bones and animations stay data-only.
 */
(function(root,factory){"use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MH2PlanePixelEditor=api;
})(typeof window!=="undefined"?window:null,function(){"use strict";
 const W=64,H=112,DIR=["se","sw","ne","nw"],MAX_HISTORY=24;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function rasterLine(x0,y0,x1,y1,plot){
  x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
  let dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx+dy;
  for(;;){plot(x0,y0);if(x0===x1&&y0===y1)break;
   const e=2*err;if(e>=dy){err+=dy;x0+=sx}if(e<=dx){err+=dx;y0+=sy}}
 }
 function flood(data,w,h,x,y,rgba){
  if(x<0||y<0||x>=w||y>=h)return false;
  const at=(x,y)=>(y*w+x)*4,src=at(x,y);
  const old=[...data.slice(src,src+4)];
  if(old.every((v,i)=>v===rgba[i]))return false;
  const visited=new Uint8Array(w*h),stack=[y*w+x];
  while(stack.length){
   const p=stack.pop();if(visited[p])continue;visited[p]=1;
   const px=p%w,py=Math.floor(p/w),i=p*4;
   if(data[i]!==old[0]||data[i+1]!==old[1]||data[i+2]!==old[2]||data[i+3]!==old[3])continue;
   data.set(rgba,i);
   if(px>0)stack.push(p-1);
   if(px<w-1)stack.push(p+1);
   if(py>0)stack.push(p-w);
   if(py<h-1)stack.push(p+w);
  }
  return true;
 }
 function rgba(hex){
  const code=/^#[\da-f]{6}$/i.test(hex)?hex:"#18151b";
  return [parseInt(code.slice(1,3),16),parseInt(code.slice(3,5),16),parseInt(code.slice(5,7),16),255];
 }
 function create({overlay,canvas,reference,onApply,onSaveDefault,onRestore}){
  const els={
   heading:overlay.querySelector("#pixelTitle"),dir:overlay.querySelector("#pixelDirection"),
   color:overlay.querySelector("#pixelColor"),size:overlay.querySelector("#pixelSize"),
   onion:overlay.querySelector("#pixelOnion"),grid:overlay.querySelector("#pixelGrid"),
   gridType:overlay.querySelector("#pixelGridType"),wrap:overlay.querySelector("#pixelCanvasWrap"),
   zoom:overlay.querySelector("#pixelZoom"),zoomOut:overlay.querySelector("#pixelZoomOut"),
   zoomIn:overlay.querySelector("#pixelZoomIn"),zoomFit:overlay.querySelector("#pixelZoomFit"),
   zoomLabel:overlay.querySelector("#pixelZoomLabel"),
   status:overlay.querySelector("#pixelStatus"),undo:overlay.querySelector("#pixelUndo"),
   redo:overlay.querySelector("#pixelRedo"),apply:overlay.querySelector("#pixelApply"),
   save:overlay.querySelector("#pixelSaveDefault"),restore:overlay.querySelector("#pixelRestore"),
   export:overlay.querySelector("#pixelExport"),close:overlay.querySelector("#pixelClose")
  };
  const atlas=document.createElement("canvas");atlas.width=W;atlas.height=H*4;
  const ctx=atlas.getContext("2d",{willReadFrequently:true});
  const out=canvas.getContext("2d");
  let bone="",tool="pencil",dir=0,active=null,history=[],redo=[],dirty=false,source=null,ref=null;
  let zoom=5,pan=null,pinch=null;
  const touches=new Map();
  const controls=[...overlay.querySelectorAll("[data-pixel-tool]")];
  const updateHistory=()=>{
   els.undo.disabled=!history.length;els.redo.disabled=!redo.length;
   els.status.textContent=(dirty?"● UNSAVED PIXELS":"ORIGINAL PLANE")+
    " · "+bone.toUpperCase()+" · "+DIR[dir].toUpperCase()+
    " · "+history.length+" undo steps";
  };
  function saveHistory(){
   history.push(ctx.getImageData(0,0,W,H*4));
   if(history.length>MAX_HISTORY)history.shift();
   redo=[];dirty=true;updateHistory();
  }
  function historyStep(from,to){
   if(!from.length)return;
   to.push(ctx.getImageData(0,0,W,H*4));
   ctx.putImageData(from.pop(),0,0);dirty=true;draw();updateHistory();
  }
  function draw(){
   const sx=0,sy=dir*H;
   out.clearRect(0,0,canvas.width,canvas.height);
   out.imageSmoothingEnabled=false;
   out.fillStyle="#fff";out.fillRect(0,0,canvas.width,canvas.height);
   const u=canvas.width/W,v=canvas.height/H;
   const checker=Math.max(4,Math.round(u*4));
   for(let y=0;y<canvas.height;y+=checker)for(let x=0;x<canvas.width;x+=checker){
    if(((x/checker+y/checker)&1)===0){out.fillStyle="#d7dce5";out.fillRect(x,y,checker,checker)}
   }
   if(els.onion.checked&&ref){
    out.save();out.globalAlpha=.20;
    out.drawImage(ref,0,0,ref.width,ref.height,0,0,canvas.width,canvas.height);
    out.restore();
   }
   out.drawImage(atlas,sx,sy,W,H,0,0,canvas.width,canvas.height);
   if(els.grid.checked){
    const step=Math.max(1,Math.min(16,Number(els.gridType.value)||1));
    out.save();out.strokeStyle=step===1?"rgba(65,94,128,.29)":"rgba(56,111,161,.65)";
    out.lineWidth=step===1?1:1.5;out.beginPath();
    for(let x=0;x<=W;x+=step){const px=Math.round(x*u)+.5;out.moveTo(px,0);out.lineTo(px,canvas.height)}
    for(let y=0;y<=H;y+=step){const py=Math.round(y*v)+.5;out.moveTo(0,py);out.lineTo(canvas.width,py)}
    out.stroke();out.restore();
   }
  }
  function setZoom(next,cx,cy){
   const target=clamp(Math.round(Number(next)||5),2,16);
   const wrap=els.wrap,box=wrap.getBoundingClientRect();
   const x=Number.isFinite(cx)?cx:box.left+box.width/2;
   const y=Number.isFinite(cy)?cy:box.top+box.height/2;
   const before=canvas.getBoundingClientRect();
   const fx=before.width?(x-before.left)/before.width:.5;
   const fy=before.height?(y-before.top)/before.height:.5;
   zoom=target;
   canvas.style.width=(W*zoom)+"px";
   canvas.style.height=(H*zoom)+"px";
   els.zoom.value=String(zoom);els.zoomLabel.textContent=zoom*100+"%";
   const after=canvas.getBoundingClientRect();
   wrap.scrollLeft+=after.left+fx*after.width-x;
   wrap.scrollTop+=after.top+fy*after.height-y;
  }
  function zoomFit(){
   const box=els.wrap.getBoundingClientRect();
   const best=Math.min((box.width-22)/W,(box.height-22)/H);
   setZoom(Math.floor(clamp(best,2,16)));
  }
  function touchPair(){
   const p=[...touches.values()];
   if(p.length<2)return null;
   return {distance:Math.max(1,Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)),
    center:{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2}};
  }
  els.zoomOut.onclick=()=>setZoom(zoom-1);
  els.zoomIn.onclick=()=>setZoom(zoom+1);
  els.zoomFit.onclick=zoomFit;
  els.zoom.oninput=()=>setZoom(els.zoom.value);
  els.wrap.addEventListener("wheel",e=>{
   if(overlay.hidden)return;
   e.preventDefault();setZoom(zoom+(e.deltaY<0?1:-1),e.clientX,e.clientY);
  },{passive:false});
  function coords(e){
   const rect=canvas.getBoundingClientRect();
   return {
    x:clamp(Math.floor((e.clientX-rect.left)/rect.width*W),0,W-1),
    y:clamp(Math.floor((e.clientY-rect.top)/rect.height*H),0,H-1)
   };
  }
  function plot(x,y){
   const size=Math.round(Number(els.size.value)||1);
   const start=Math.floor((size-1)/2);
   const left=clamp(x-start,0,W),top=clamp(y-start+dir*H,dir*H,(dir+1)*H);
   const width=Math.min(size,W-left),height=Math.min(size,(dir+1)*H-top);
   if(tool==="eraser")ctx.clearRect(left,top,width,height);
   else{ctx.fillStyle=els.color.value;ctx.fillRect(left,top,width,height)}
  }
  function paintPoint(from,to){
   if(tool==="fill"){
    const image=ctx.getImageData(0,dir*H,W,H),color=rgba(els.color.value);
    if(flood(image.data,W,H,to.x,to.y,tool==="eraser"?[0,0,0,0]:color))
     ctx.putImageData(image,0,dir*H);
   }else rasterLine(from.x,from.y,to.x,to.y,plot);
   draw();
  }
  function pipette(p){
   const data=ctx.getImageData(p.x,p.y+dir*H,1,1).data;
   if(data[3]===0)return;
   els.color.value="#"+Array.from(data.slice(0,3)).map(c=>c.toString(16).padStart(2,"0")).join("");
   selectTool("pencil");
  }
  function selectTool(name){
   tool=name;controls.forEach(b=>b.classList.toggle("active",b.dataset.pixelTool===name));
  }
  controls.forEach(b=>b.addEventListener("click",()=>selectTool(b.dataset.pixelTool)));
  overlay.querySelectorAll("[data-pixel-swatch]").forEach(el=>el.addEventListener("click",()=>{
   els.color.value=el.dataset.pixelSwatch;selectTool("pencil");
  }));
  els.dir.onchange=()=>{dir=DIR.indexOf(els.dir.value);draw();updateHistory()};
  els.onion.onchange=draw;els.grid.onchange=draw;els.gridType.onchange=draw;
  els.undo.onclick=()=>historyStep(history,redo);
  els.redo.onclick=()=>historyStep(redo,history);
  els.close.onclick=()=>{overlay.hidden=true};
  els.apply.onclick=()=>{
   if(onApply(bone,atlas.toDataURL("image/png"))!==false){
    dirty=false;updateHistory();overlay.hidden=true;
   }
  };
  els.save.onclick=()=>{
   const png=atlas.toDataURL("image/png");
   if(onSaveDefault(bone,png)!==false){
    dirty=false;updateHistory();overlay.hidden=true;
   }
  };
  els.restore.onclick=()=>{
   if(!source)return;
   saveHistory();ctx.clearRect(0,0,W,H*4);ctx.drawImage(source,0,0);
   draw();els.status.textContent="RESTORED ORIGINAL SOURCE · APPLY TO COMMIT";
  };
  els.export.onclick=()=>{
   atlas.toBlob(blob=>{
    if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="mahluk-plane-"+bone+"-4dir.png";a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
   },"image/png");
  };
  canvas.addEventListener("pointerdown",e=>{
   if(!bone||e.button!==0)return;
   e.preventDefault();
   const p=coords(e);
   if(tool==="picker"){pipette(p);return}
   saveHistory();active={id:e.pointerId,at:p};
   try{canvas.setPointerCapture(e.pointerId)}catch{}
   paintPoint(p,p);
  });
  canvas.addEventListener("pointermove",e=>{
   if(active?.id!==e.pointerId)return;
   e.preventDefault();
   const next=coords(e);paintPoint(active.at,next);active.at=next;
  });
  for(const evt of ["pointerup","pointercancel","lostpointercapture"])
   canvas.addEventListener(evt,e=>{
    if(active?.id===e.pointerId)active=null;
    if(evt!=="lostpointercapture")try{canvas.releasePointerCapture(e.pointerId)}catch{}
   });
  overlay.addEventListener("keydown",e=>{
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){
    e.preventDefault();e.stopPropagation();
    if(e.shiftKey)historyStep(redo,history);else historyStep(history,redo);
   }else if(e.key==="Escape"){e.stopPropagation();overlay.hidden=true}
  });
  function open({id,initialAtlas,originalAtlas,referenceImage,direction="se"}){
   if(!id)throw Error("Select an editable plane");
   bone=id;dir=Math.max(0,DIR.indexOf(direction));source=originalAtlas||null;
   ref=referenceImage||null;history=[];redo=[];dirty=false;active=null;
   ctx.clearRect(0,0,W,H*4);
   if(initialAtlas)ctx.drawImage(initialAtlas,0,0,W,H*4);
   else if(source)ctx.drawImage(source,0,0,W,H*4);
   els.heading.textContent="PIXEL EDITOR / "+id.replaceAll("_"," ").toUpperCase();
   els.dir.value=DIR[dir];selectTool("pencil");overlay.hidden=false;
   draw();updateHistory();
  }
  return {open,isOpen:()=>!overlay.hidden,close:()=>{overlay.hidden=true}};
 }
 return Object.freeze({W,H,DIR,rasterLine,flood,rgba,create});
});
