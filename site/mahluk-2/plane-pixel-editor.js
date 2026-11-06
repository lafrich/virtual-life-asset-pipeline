/* Mahluk Hidup 2.0 — native-resolution pixel editor per transparent plane.
 * Edits 64x112 RGBA pixels across SE/SW/NE/NW in a 64x448 source atlas.
 * No canvas scaling is saved. The rig, pivots, bones and animations stay data-only.
 */
(function(root,factory){"use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MH2PlanePixelEditor=api;
})(typeof window!=="undefined"?window:null,function(){"use strict";
 const W=64,H=112,DIR=["se","sw","ne","nw"],MAX_HISTORY=24,S=typeof window!=="undefined"?window.MH2PixelSelection:require("./pixel-selection.js");
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function mirroredX(x,from,to){
  const flip=i=>i===1||i===3; // SW/NW are mirrored camera silhouettes.
  return flip(from)===flip(to)?x:W-1-x;
 }
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
   sync:overlay.querySelector("#pixelSync"),syncExisting:overlay.querySelector("#pixelSyncExisting"),
   refView:overlay.querySelector("#pixelReferenceView"),
   refFlip:overlay.querySelector("#pixelReferenceFlip"),
   refOpacity:overlay.querySelector("#pixelReferenceOpacity"),
   refOpacityLabel:overlay.querySelector("#pixelReferenceOpacityLabel"),
   refX:overlay.querySelector("#pixelReferenceX"),refY:overlay.querySelector("#pixelReferenceY"),
   copy:overlay.querySelector("#pixelCopySelection"),
   paste:overlay.querySelector("#pixelPasteSelection"),
   pasteMirror:overlay.querySelector("#pixelPasteMirrored"),
   pasteReplace:overlay.querySelector("#pixelPasteReplace"),
   clipboardInfo:overlay.querySelector("#pixelClipboardInfo"),
   selectAll:overlay.querySelector("#pixelSelectAll"),
   deselect:overlay.querySelector("#pixelDeselect"),
   flipH:overlay.querySelector("#pixelFlipH"),flipV:overlay.querySelector("#pixelFlipV"),
   delSelection:overlay.querySelector("#pixelDeleteSelection"),
   selectionInfo:overlay.querySelector("#pixelSelectionInfo"),
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
  let bone="",tool="pencil",dir=0,active=null,history=[],redo=[],dirty=false,source=null,ref=null,refs=null;
  let zoom=5,pan=null,pinch=null,selection=null,moveStart=null;
  const touches=new Map();
  // Shared by the Mahluk 2 and Emotion Studio editors on the same GitHub Pages
  // origin. Clipboard is not part of character/master-rig saves or GitHub.
  const CLIP_KEY="mh2-rgba-clipboard-v1";
  let clipboard=null;
  function currentClipboard(){
   try{
    const saved=JSON.parse(window.localStorage.getItem(CLIP_KEY));
    if(S.validStamp(saved,W,H))
     return {...saved,pixels:new Uint8ClampedArray(saved.pixels)};
   }catch{}
   return clipboard&&S.validStamp(clipboard,W,H)?clipboard:null;
  }
  function updateClipboardInfo(){
   const saved=currentClipboard();
   const available=!!saved;
   els.paste.disabled=!available;els.pasteMirror.disabled=!available;
   els.clipboardInfo.textContent=available?
    "READY · "+(saved.bone||"PLANE").toUpperCase()+" / "+(saved.direction||"SE").toUpperCase()+
    " · "+saved.w+"×"+saved.h+" PX · COPY BETWEEN VIEWS / PARTS":
    "CLIPBOARD EMPTY · SELECT + COPY (CTRL+C)";
  }
  const controls=[...overlay.querySelectorAll("[data-pixel-tool]")];
  const updateSelection=()=>{
   updateClipboardInfo();
   els.selectionInfo.textContent=selection?
    "SELECTED "+selection.w+"×"+selection.h+" · X"+selection.x+" Y"+selection.y+
      " · MOVE/FLIP AFFECT THIS VIEW ONLY":
    "NO SELECTION · FLIP AFFECTS FULL ACTIVE VIEW";
  };
  const updateHistory=()=>{
   updateSelection();
   els.undo.disabled=!history.length;els.redo.disabled=!redo.length;
   els.status.textContent=(dirty?"● UNSAVED PIXELS":"ORIGINAL PLANE")+
    " · "+bone.toUpperCase()+" · "+DIR[dir].toUpperCase()+
    (els.sync.checked?" · SYNC 4 VIEW":" · VIEW ONLY")+
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
   // Ghost another angle on top of the active cutout to guide redraw.
   // This is only a display composite: the 64×448 source atlas is intact.
   const ghost=DIR.indexOf(els.refView.value);
   if(ghost>=0&&ghost!==dir){
    const ox=clamp(Number(els.refX.value)||0,-32,32)*u,
     oy=clamp(Number(els.refY.value)||0,-56,56)*v;
    const autoFlip=els.refFlip.checked&&
      ((ghost===1||ghost===3)!==(dir===1||dir===3));
    out.save();out.imageSmoothingEnabled=false;
    out.globalAlpha=clamp(Number(els.refOpacity.value)||40,5,85)/100;
    out.filter="sepia(1) saturate(3) hue-rotate(160deg)";
    if(autoFlip){out.translate(canvas.width,0);out.scale(-1,1)}
    out.drawImage(atlas,0,ghost*H,W,H,ox,oy,canvas.width,canvas.height);
    out.restore();
   }
   if(els.grid.checked){
    const step=Math.max(1,Math.min(16,Number(els.gridType.value)||1));
    out.save();out.strokeStyle=step===1?"rgba(65,94,128,.29)":"rgba(56,111,161,.65)";
    out.lineWidth=step===1?1:1.5;out.beginPath();
    for(let x=0;x<=W;x+=step){const px=Math.round(x*u)+.5;out.moveTo(px,0);out.lineTo(px,canvas.height)}
    for(let y=0;y<=H;y+=step){const py=Math.round(y*v)+.5;out.moveTo(0,py);out.lineTo(canvas.width,py)}
    out.stroke();out.restore();
   }
   if(selection){
    const x=selection.x*u,y=selection.y*v,w=selection.w*u,h=selection.h*v;
    out.save();out.fillStyle="rgba(65,150,225,.11)";out.fillRect(x,y,w,h);
    out.strokeStyle="#16335a";out.lineWidth=2;out.setLineDash([5,3]);
    out.strokeRect(x+.5,y+.5,w-1,h-1);out.lineDashOffset=4;
    out.strokeStyle="#f9feff";out.strokeRect(x+.5,y+.5,w-1,h-1);
    out.restore();
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
  function targetDirections(){return els.sync.checked?[0,1,2,3]:[dir]}
  function plot(x,y){
   const size=Math.round(Number(els.size.value)||1);
   const start=Math.floor((size-1)/2),ink=rgba(els.color.value);
   for(const target of targetDirections()){
    const mapped=mirroredX(x,dir,target);
    const left=clamp(mapped-start,0,W),top=clamp(y-start+target*H,target*H,(target+1)*H);
    const width=Math.max(0,Math.min(size,W-left));
    const height=Math.max(0,Math.min(size,(target+1)*H-top));
    if(!width||!height)continue;
    if(target===dir){
     if(tool==="eraser")ctx.clearRect(left,top,width,height);
     else{ctx.fillStyle=els.color.value;ctx.fillRect(left,top,width,height)}
     continue;
    }
    // Other directions preserve their independently authored silhouette.
    // Recolor/erase only pixels which already belong to that view's plane.
    const region=ctx.getImageData(left,top,width,height);
    for(let i=0;i<region.data.length;i+=4){
     if(region.data[i+3]===0)continue;
     if(tool==="eraser")region.data[i+3]=0;
     else{region.data[i]=ink[0];region.data[i+1]=ink[1];region.data[i+2]=ink[2]}
    }
    ctx.putImageData(region,left,top);
   }
  }
  function paintPoint(from,to){
   if(tool==="fill"){
    const color=rgba(els.color.value);
    for(const target of targetDirections()){
     const x=mirroredX(to.x,dir,target),image=ctx.getImageData(0,target*H,W,H);
     // Never fill an unoccupied background on another native angle.
     const oldAlpha=image.data[(to.y*W+x)*4+3];
     if(target!==dir&&oldAlpha===0)continue;
     if(flood(image.data,W,H,x,to.y,color))ctx.putImageData(image,0,target*H);
    }
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
  function frameImage(){return ctx.getImageData(0,dir*H,W,H)}
  function replaceFrame(pixels){
   const frame=frameImage();frame.data.set(pixels);
   ctx.putImageData(frame,0,dir*H);
  }
  function copySelection(){
   if(!bone)return;
   clipboard={...S.copy(frameImage().data,W,H,selection),
    bone,direction:DIR[dir]};
   try{window.localStorage.setItem(CLIP_KEY,JSON.stringify({
    ...clipboard,pixels:Array.from(clipboard.pixels)
   }))}catch{/* Copy still works in this editor when browser storage is unavailable. */}
   updateClipboardInfo();
   els.status.textContent="COPIED "+clipboard.w+"×"+clipboard.h+" PIXELS · "+
    bone.toUpperCase()+" / "+DIR[dir].toUpperCase()+" · SWITCH VIEW THEN PASTE";
  }
  function pasteSelection(mirror=false){
   const stamp=currentClipboard();
   if(!stamp){els.status.textContent="NO COPIED PIXELS · SELECT + COPY FIRST";return;}
   const destX=selection?selection.x:(mirror?W-stamp.x-stamp.w:stamp.x);
   const destY=selection?selection.y:stamp.y;
   const dx=clamp(destX,0,W-1),dy=clamp(destY,0,H-1);
   saveHistory();
   replaceFrame(S.paste(frameImage().data,W,H,stamp,{
    x:dx,y:dy,mirror,replace:els.pasteReplace.checked
   }));
   selection={x:dx,y:dy,w:Math.min(stamp.w,W-dx),h:Math.min(stamp.h,H-dy)};
   selectTool("move-pixels");
   draw();updateHistory();
   els.status.textContent="PASTED "+stamp.w+"×"+stamp.h+" RGBA · "+
    (mirror?"HORIZONTAL MIRROR · ":"")+DIR[dir].toUpperCase()+
    " · DRAG TO ALIGN · UNDO AVAILABLE";
  }
  els.copy.onclick=copySelection;
  els.paste.onclick=()=>pasteSelection(false);
  els.pasteMirror.onclick=()=>pasteSelection(true);
  function flipSelection(axis){
   saveHistory();const image=frameImage();
   replaceFrame(S.flip(image.data,W,H,selection,axis));
   draw();updateHistory();
  }
  function moveSelectionFrom(sourcePixels,rect,dx,dy){
   const x=clamp(dx,-W,W),y=clamp(dy,-H,H);
   replaceFrame(S.translate(sourcePixels,W,H,rect,x,y));
   selection={x:clamp(rect.x+x,0,W-1),y:clamp(rect.y+y,0,H-1),
    w:Math.min(rect.w,W-clamp(rect.x+x,0,W-1)),
    h:Math.min(rect.h,H-clamp(rect.y+y,0,H-1))};
   draw();updateSelection();
  }
  els.selectAll.onclick=()=>{selection={x:0,y:0,w:W,h:H};selectTool("select");draw();updateSelection()};
  els.deselect.onclick=()=>{selection=null;draw();updateSelection()};
  els.flipH.onclick=()=>flipSelection("horizontal");
  els.flipV.onclick=()=>flipSelection("vertical");
  els.delSelection.onclick=()=>{
   saveHistory();const box=S.normalizeRect(selection,W,H);
   ctx.clearRect(box.x,dir*H+box.y,box.w,box.h);draw();updateHistory();
  };
  els.dir.onchange=()=>{
   // Drawn RGBA always lives in one 64x448 atlas. Switching an angle must
   // never propagate strokes or erase any previously painted direction.
   dir=DIR.indexOf(els.dir.value);ref=refs?.[DIR[dir]]||ref;
   els.sync.checked=false;selection=null;moveStart=null;
   draw();updateHistory();
  };
  const updateRef=()=>{
   els.refOpacityLabel.textContent=els.refOpacity.value+"%";draw();
  };
  for(const el of [els.refView,els.refFlip,els.refOpacity,els.refX,els.refY])
   el.addEventListener(el===els.refOpacity?"input":"change",updateRef);
  els.onion.onchange=draw;els.grid.onchange=draw;els.gridType.onchange=draw;
  els.sync.onchange=()=>{
   updateHistory();
   if(els.sync.checked)
    els.status.textContent='⚠ SYNC ON · BRUSH/ERASER WILL ALSO CHANGE OTHER VIEWS';
  };
  els.syncExisting.onclick=()=>{
   if(!source)return;
   const native=document.createElement("canvas");native.width=W;native.height=H*4;
   const nativeContext=native.getContext("2d",{willReadFrequently:true});
   nativeContext.drawImage(source,0,0,W,H*4);
   const before=nativeContext.getImageData(0,dir*H,W,H).data;
   const after=ctx.getImageData(0,dir*H,W,H).data;
   const changed=[];
   for(let i=0;i<W*H;i++){
    const p=i*4;
    if(before[p+3]===0)continue; // Preserve every original opposite silhouette.
    if(before[p]!==after[p]||before[p+1]!==after[p+1]||
       before[p+2]!==after[p+2]||before[p+3]!==after[p+3])changed.push(i);
   }
   if(!changed.length){
    els.status.textContent="NO EXISTING SOURCE-PIXEL DIFFERENCES IN "+DIR[dir].toUpperCase();
    return;
   }
   saveHistory();
   let count=0;
   for(let target=0;target<DIR.length;target++){
    if(target===dir)continue;
    const output=ctx.getImageData(0,target*H,W,H),data=output.data;
    for(const index of changed){
     const x=mirroredX(index%W,dir,target),y=Math.floor(index/W),
      from=index*4,to=(y*W+x)*4;
     if(data[to+3]===0)continue;
     if(after[from+3]===0)data[to+3]=0;
     else{
      data[to]=after[from];data[to+1]=after[from+1];data[to+2]=after[from+2];
     }
     count++;
    }
    ctx.putImageData(output,0,target*H);
   }
   draw();updateHistory();
   els.status.textContent="SYNCED "+count+" EXISTING PIXELS · 4 DIRECTIONS · NATIVE SILHOUETTES KEPT";
  };
  els.undo.onclick=()=>historyStep(history,redo);
  els.redo.onclick=()=>historyStep(redo,history);
  function close(){
   if(dirty&&!window.confirm('Unsaved pixel art exists on this and other views. Close without APPLY?'))return false;
   overlay.hidden=true;return true;
  }
  els.close.onclick=close;
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
  function capture(e){try{canvas.setPointerCapture(e.pointerId)}catch{}}
  function release(e){try{canvas.releasePointerCapture(e.pointerId)}catch{}}
  canvas.addEventListener("pointerdown",e=>{
   if(!bone||e.button>1)return;
   e.preventDefault();
   if(e.pointerType==="touch"){
    touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    capture(e);
    if(touches.size===2){
     const pair=touchPair();
     pinch={distance:pair.distance,zoom,lastCenter:pair.center};
     active=null;pan=null;return;
    }
    if(touches.size>2){active=null;return}
   }
   if(tool==="hand"||e.button===1||e.altKey){
    pan={id:e.pointerId,startX:e.clientX,startY:e.clientY,
     scrollX:els.wrap.scrollLeft,scrollY:els.wrap.scrollTop};
    active=null;capture(e);return;
   }
   const point=coords(e);
   if(tool==="picker"){pipette(point);return}
   if(tool==="select"){
    selection=S.rectFromPoints(point,point,W,H);
    active={id:e.pointerId,at:point,origin:point,mode:"select",painted:true};
    capture(e);draw();updateSelection();return;
   }
   if(tool==="move-pixels"){
    if(!selection){els.status.textContent="SELECT A RECTANGLE FIRST (▣ SELECT)";return}
    if(!S.contains(selection,point.x,point.y)){
     els.status.textContent="DRAG FROM INSIDE SELECTED PIXELS";return;
    }
    saveHistory();
    moveStart={rect:{...selection},pixels:frameImage().data.slice(),from:point};
    active={id:e.pointerId,at:point,mode:"move-pixels",painted:true};
    capture(e);return;
   }
   // A touch that becomes a pinch must not paint a stray first dot.
   active={id:e.pointerId,at:point,painted:false};
   capture(e);
   if(e.pointerType!=="touch"){saveHistory();paintPoint(point,point);active.painted=true}
  });
  canvas.addEventListener("pointermove",e=>{
   if(e.pointerType==="touch"&&touches.has(e.pointerId)){
    touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch&&touches.size>=2){
     const pair=touchPair(),ratio=pair.distance/pinch.distance;
     const dx=pair.center.x-pinch.lastCenter.x,dy=pair.center.y-pinch.lastCenter.y;
     setZoom(pinch.zoom*ratio,pair.center.x,pair.center.y);
     els.wrap.scrollLeft-=dx;els.wrap.scrollTop-=dy;
     pinch.lastCenter=pair.center;
     e.preventDefault();return;
    }
   }
   if(pan?.id===e.pointerId){
    els.wrap.scrollLeft=pan.scrollX+pan.startX-e.clientX;
    els.wrap.scrollTop=pan.scrollY+pan.startY-e.clientY;
    e.preventDefault();return;
   }
   if(active?.id!==e.pointerId)return;
   e.preventDefault();
   const next=coords(e);
   if(active.mode==="select"){
    selection=S.rectFromPoints(active.origin,next,W,H);
    draw();updateSelection();return;
   }
   if(active.mode==="move-pixels"&&moveStart){
    moveSelectionFrom(moveStart.pixels,moveStart.rect,
     next.x-moveStart.from.x,next.y-moveStart.from.y);
    return;
   }
   if(!active.painted){saveHistory();active.painted=true;paintPoint(active.at,active.at)}
   paintPoint(active.at,next);active.at=next;
  });
  for(const evt of ["pointerup","pointercancel","lostpointercapture"])
   canvas.addEventListener(evt,e=>{
    if(active?.id===e.pointerId){
     if(evt==="pointerup"&&!active.painted){saveHistory();paintPoint(active.at,active.at)}
     active=null;moveStart=null;
     updateSelection();
    }
    if(pan?.id===e.pointerId)pan=null;
    if(e.pointerType==="touch")touches.delete(e.pointerId);
    if(touches.size<2)pinch=null;
    if(evt!=="lostpointercapture")release(e);
   });
  overlay.addEventListener("keydown",e=>{
   if(overlay.hidden)return;
   const typing=["INPUT","SELECT","TEXTAREA"].includes(document.activeElement?.tagName);
   if((e.ctrlKey||e.metaKey)&&!typing){
    const k=e.key.toLowerCase();
    if(k==="c"){e.preventDefault();e.stopPropagation();copySelection();return;}
    if(k==="v"){e.preventDefault();e.stopPropagation();pasteSelection(e.shiftKey);return;}
   }
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="a"&&!typing){
    e.preventDefault();e.stopPropagation();els.selectAll.click();return;
   }
   if(!typing&&e.key==="Delete"){
    e.preventDefault();e.stopPropagation();els.delSelection.click();return;
   }
   if(!typing&&e.key.toLowerCase()==="s"&&!e.ctrlKey&&!e.metaKey){
    e.preventDefault();e.stopPropagation();selectTool("select");return;
   }
   if(!typing&&e.key.toLowerCase()==="m"&&!e.ctrlKey&&!e.metaKey){
    e.preventDefault();e.stopPropagation();selectTool("move-pixels");return;
   }
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){
    e.preventDefault();e.stopPropagation();
    if(e.shiftKey)historyStep(redo,history);else historyStep(history,redo);
   }else if(!["INPUT","SELECT"].includes(document.activeElement?.tagName)&&["=","+","-","0"].includes(e.key)){
    e.preventDefault();e.stopPropagation();
    if(e.key==="0")zoomFit();else setZoom(zoom+(e.key==="-"?-1:1));
   }else if(e.key==="Escape"){
    e.stopPropagation();
    if(selection){selection=null;draw();updateSelection()}else overlay.hidden=true;
   }
  });
  function open({id,initialAtlas,originalAtlas,referenceImage,referenceImages,direction="se"}){
   if(!id)throw Error("Select an editable plane");
   bone=id;dir=Math.max(0,DIR.indexOf(direction));source=originalAtlas||null;
   // A different camera angle is a different layer of the same atlas.
   // Sync and reference ghosts are opt-in, never inherited from prior edits.
   els.sync.checked=false;
   refs=referenceImages||null;ref=refs?.[DIR[dir]]||referenceImage||null;
   history=[];redo=[];dirty=false;active=null;selection=null;moveStart=null;
   els.refView.value="off";
   els.refOpacity.value="40";els.refOpacityLabel.textContent="40%";
   els.refFlip.checked=true;els.refX.value="0";els.refY.value="0";
   ctx.clearRect(0,0,W,H*4);
   // Use the complete persisted atlas, never a single 64x112 directional
   // view enlarged into 64x448 (that would erase three other views).
   if(initialAtlas){
    if(initialAtlas.naturalWidth!==undefined&&
      (initialAtlas.naturalWidth!==W||initialAtlas.naturalHeight!==H*4))
     throw Error('Saved pixel atlas must be 64x448');
    ctx.drawImage(initialAtlas,0,0,W,H*4);
   }else if(source)ctx.drawImage(source,0,0,W,H*4);
   els.heading.textContent="PIXEL EDITOR / "+id.replaceAll("_"," ").toUpperCase();
   els.dir.value=DIR[dir];selectTool("pencil");overlay.hidden=false;
   draw();zoomFit();updateHistory();
   canvas.focus({preventScroll:true});
  }
  return {open,isOpen:()=>!overlay.hidden,close};
 }
 return Object.freeze({W,H,DIR,rasterLine,flood,rgba,mirroredX,create});
});
