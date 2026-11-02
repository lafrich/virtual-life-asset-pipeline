/* Otis native pixel editor. Local browser draft + explicit portable JSON patch.
   Original 64x112 RGBA sprite frames, no CSS-only illusion or remote writes. */
(()=>{
"use strict";
if(new URLSearchParams(location.search).get("embedded")==="1")document.body.classList.add("embedded");
const core=window.VirtualLifePixelEdit;
const parts=window.VirtualLifeMasterParts;
if(!core)return;
const $=id=>document.getElementById(id);
const DIRECTIONS=core.DIRECTIONS,WIDTH=64,HEIGHT=112;
const PALETTE=["#61b3c4","#95d7de","#418da5","#2b6479","#183f59",
 "#fbf9ea","#dde5e5","#9eb3bf","#687f90","#354555",
 "#d63e35","#f87d56","#101a2a","#fef4d4","#ffffff","#000000",
 "#b15a36","#d28e5e","#f8d5b1","#c5bcae","#455f74","#6d4f50",
 "#eab9b9","#c9d4e0"];
const LOCAL="virtual-life-otis-master-parts-draft-v2";
const MOBILE_TOUCH=window.matchMedia("(max-width:680px) and (pointer:coarse)").matches;
const panGesture={id:null,lastX:0,lastY:0};
const OLD_LOCAL="virtual-life-otis-pixel-draft-v1";
const display=$("pixel-canvas"),dc=display.getContext("2d",{alpha:false});
const mini=$("small-preview"),mc=mini.getContext("2d");
const renderCanvas=document.createElement("canvas");renderCanvas.width=WIDTH;renderCanvas.height=HEIGHT;
const rc=renderCanvas.getContext("2d",{willReadFrequently:true});
dc.imageSmoothingEnabled=false;mc.imageSmoothingEnabled=false;
const state={pack:null,clips:[],action:"idle",dir:"se",frame:0,mode:"master",part:"head",masterDiff:new Map(),syncPromise:Promise.resolve(),syncing:false,
 tool:"pencil",panMode:false,color:"#61b3c4",brush:1,zoom:MOBILE_TOUCH?4:8,grid:false,
 originals:new Map(),edits:new Map(),imageRequests:new Map(),history:[],redo:[],
 current:null,loading:true,drawing:false,previous:null,before:null,seq:0,
 selection:null,selectionGesture:null,moveGesture:null,cursorMode:MOBILE_TOUCH,cursor:[32,42],
 trackpad:null,touchSelectAnchor:null,touchMoveAnchor:null};
function status(s,error=false){$("editor-status").textContent=s;$("editor-status").classList.toggle("error",error);}
function activeClip(){return state.clips.find(c=>c.id===state.action);}
function currentKey(){return core.key(state.action,state.dir,state.frame);}
function frameCount(){return activeClip()?.frames||1;}
function copy(data){return new ImageData(new Uint8ClampedArray(data.data),WIDTH,HEIGHT);}
function identical(a,b){if(!a||!b)return false;const x=a.data,y=b.data;if(x.length!==y.length)return false;for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true;}
function snapshot(){return state.current?copy(state.current):null;}
function editable(x,y){return parts.contains(state.part,x,y);}
function selectedRegion(){return parts.PARTS[state.part].box;}
function masterKey(dir,part){return dir+"|"+part;}
function imageFor(atlas){if(state.imageRequests.has(atlas))return state.imageRequests.get(atlas);
 if(typeof atlas!=="string"||!/^media\/[a-zA-Z0-9_.-]+\.png$/.test(atlas))throw Error("Unsafe atlas path");
 const promise=new Promise((resolve,reject)=>{
  const img=new Image();img.decoding="async";
  img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Cannot load "+atlas));img.src="./"+atlas;
 });
 state.imageRequests.set(atlas,promise);return promise;
}
function isReadyClip(c){return c&&c.status==="ready"&&core.ACTIONS.includes(c.id)&&
  c.frame_size?.join(",")==="64,112"&&c.frames>0&&c.frames<=6&&c.row_start>=0&&
  c.columns>=c.frames&&c.directions?.join(",")===DIRECTIONS.join(",");}
async function originalFor(key,clip,dir,index){
 if(state.originals.has(key))return state.originals.get(key);
 const img=await imageFor(clip.atlas);
 if(img.naturalWidth!==clip.columns*WIDTH||img.naturalHeight!==clip.rows*HEIGHT)
   throw Error("Atlas dimensions do not match the original 64×112 source");
 rc.clearRect(0,0,WIDTH,HEIGHT);
 rc.drawImage(img,index*WIDTH,(clip.row_start+DIRECTIONS.indexOf(dir))*HEIGHT,WIDTH,HEIGHT,0,0,WIDTH,HEIGHT);
 const data=rc.getImageData(0,0,WIDTH,HEIGHT);
 state.originals.set(key,copy(data));
 return state.originals.get(key);
}
function saveCurrent(){
 if(!state.current)return;
 const key=currentKey(),original=state.originals.get(key);
 if(original&&identical(state.current,original))state.edits.delete(key);
 else state.edits.set(key,copy(state.current));
 updateCounts();scheduleSave();
}
async function navigate(){
 const seq=++state.seq,clip=activeClip();if(!clip)return;
 state.loading=true;state.current=null;state.selection=null;state.touchSelectAnchor=null;state.touchMoveAnchor=null;
 updateSelectionUI();
 $("frame").max=String(clip.frames-1);$("frame").value=String(state.frame);
 $("frame-label").textContent="FRAME "+(state.frame+1)+" / "+clip.frames;
 $("canvas-title").textContent="OTIS / "+clip.id.toUpperCase()+" / "+state.dir.toUpperCase()+" / F"+state.frame;
 status("READING "+clip.id.toUpperCase()+" / "+state.dir.toUpperCase()+" / "+state.frame+"...");
 try{
  const key=currentKey(),original=await originalFor(key,clip,state.dir,state.frame);
  if(seq!==state.seq)return;
  state.current=copy(state.edits.get(key)||original);
  state.loading=false;updateSelectionUI();render();status("EDITING ORIGINAL PIXELS / "+key+" / DRAFT NOT PUBLISHED");
 }catch(e){if(seq!==state.seq)return;status("LOAD FAILED: "+e.message,true);state.loading=true;render();}
}
async function setFrame(action,dir,index){
 cancelTemporaryMove();
 if(!state.loading)saveCurrent();
 state.action=action;state.dir=dir;state.frame=Math.max(0,Math.min(index,activeClip()?.frames-1||0));
 $("action").value=action;$("direction").value=dir;await navigate();
}
/* Master edits are explicit changed pixels in a part region per facing.
 * Frame motion is only translated by silhouette center. Rotations/occlusion
 * still require manual frame corrections; never advertise auto bone skinning. */
function queueMasterSync(){
 if(state.mode!=="master"||!state.current)return;
 const dir=state.dir,part=state.part,master=snapshot();
 state.syncPromise=state.syncPromise.then(async()=>{
  state.syncing=true;
  const sourceClip=state.clips.find(clip=>clip.id==="idle");
  if(!sourceClip)throw Error("Master needs original idle frames");
  const sourceKey=core.key("idle",dir,0);
  const source=await originalFor(sourceKey,sourceClip,dir,0);
  const delta=parts.changed(source,master,part),mk=masterKey(dir,part);
  const previous=state.masterDiff.get(mk)||[];
  for(const clip of state.clips){
   for(let i=0;i<clip.frames;i++){
    const key=core.key(clip.id,dir,i),original=await originalFor(key,clip,dir,i);
    const target=copy(state.edits.get(key)||original);
    const shift=parts.offset(source,original,part);
    parts.apply(target,original,previous,delta,shift,shift,part);
    if(identical(target,original))state.edits.delete(key);
    else state.edits.set(key,target);
   }
  }
  state.masterDiff.set(mk,delta);
  if(state.mode==="master"&&state.dir===dir&&state.part===part&&
     state.action==="idle"&&state.frame===0){
   state.current=copy(state.edits.get(sourceKey)||source);render();
  }
  updateCounts();scheduleSave();
  $("master-status").textContent="AUTOSAVED / "+part.toUpperCase()+" / "+dir.toUpperCase()+
   " → "+state.clips.reduce((sum,clip)=>sum+clip.frames,0)+
   " FRAMES. CHECK ROTATIONS AND OVERLAPS IN FRAME MODE.";
 }).catch(err=>status("MASTER SYNC FAILED: "+err.message,true))
 .finally(()=>{state.syncing=false;});
}
function modeUI(){
 const isMaster=state.mode==="master";
 $("action").disabled=isMaster;$("frame").disabled=isMaster;
 $("prev-frame").disabled=isMaster;$("next-frame").disabled=isMaster;
 $("part-bounds").textContent=state.part.toUpperCase()+" / "+parts.PARTS[state.part].box.join(",")+" / EDIT REGION";
 $("master-status").textContent=isMaster?
   "MASTER: DRAW ON IDLE F0; ALL ORIGINAL ACTION FRAMES IN THIS DIRECTION INHERIT PIXEL DELTAS.":
   "FRAME: FIX SPECIFIC POSES / AUTOSAVE TO THIS BROWSER.";
 render();
}
function rgba(){const h=state.color.replace("#","");return [...[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)),255];}
function paintPixel(x,y,erase=false){
 if(!state.current)return;
 const p=state.current.data,half=Math.floor(state.brush/2),v=rgba();
 for(let yy=y-half;yy<y-half+state.brush;yy++)for(let xx=x-half;xx<x-half+state.brush;xx++){
  if(!editable(xx,yy))continue;const i=(yy*WIDTH+xx)*4;
  for(let k=0;k<4;k++)p[i+k]=erase?0:v[k];
 }
}
function drawStroke(x,y){if(state.previous){for(const [px,py]of core.bresenham(state.previous[0],state.previous[1],x,y))paintPixel(px,py,state.tool==="erase");}
 else paintPixel(x,y,state.tool==="erase");
 state.previous=[x,y];render();}
function pickPixel(x,y){if(!state.current||!editable(x,y))return;
 const d=state.current.data,i=(y*WIDTH+x)*4;
 if(!d[i+3]){status("TRANSPARENT PIXEL / PICK AN OPAQUE COLOR");return;}
 const color="#"+[d[i],d[i+1],d[i+2]].map(v=>v.toString(16).padStart(2,"0")).join("");
 state.color=color;$("color").value=color;markSwatches();
 status("PICKED "+color.toUpperCase());}
function eventPos(event){const r=display.getBoundingClientRect();
 return [Math.floor((event.clientX-r.left)*WIDTH/r.width),Math.floor((event.clientY-r.top)*HEIGHT/r.height)];}
function commit(before,selectionBefore=undefined){
 if(!before||!state.current||identical(before,state.current))return;
 state.history.push({key:currentKey(),before,after:snapshot(),selectionBefore,
  selectionAfter:selectionBefore===undefined?undefined:(state.selection?state.selection.slice():null)});
 if(state.history.length>40)state.history.shift();
 state.redo=[];saveCurrent();render();historyButtons();if(state.mode==="master")queueMasterSync();
}

function inBox(point,box){return Boolean(box&&point[0]>=box[0]&&point[0]<box[2]&&point[1]>=box[1]&&point[1]<box[3]);}
function updateSelectionUI(){
 const b=state.selection,active=Boolean(b)&&!state.loading&&!state.syncing;
 $("selection-info").textContent=b?"SELECT "+(b[2]-b[0])+"×"+(b[3]-b[1])+"PX · X"+b[0]+" Y"+b[1]:"NO SELECTION · USE SELECT";
 for(const id of ["flip-horizontal","flip-vertical","deselect","nudge-left","nudge-up","nudge-down","nudge-right"])
  $(id).disabled=!active;
}
function setSelection(box){state.selection=box?box.slice():null;updateSelectionUI();render();}
function cancelTemporaryMove(){
 if(state.touchMoveAnchor){
  state.current=copy(state.touchMoveAnchor.before);
  state.selection=state.touchMoveAnchor.box.slice();state.touchMoveAnchor=null;
 }
 if(state.moveGesture){
  state.current=copy(state.moveGesture.before);
  state.selection=state.moveGesture.box.slice();state.moveGesture=null;
 }
 state.selectionGesture=null;state.touchSelectAnchor=null;state.trackpad=null;
 updateSelectionUI();if(state.current)render();
}
function previewMove(before,box,dx,dy){
 const moved=core.movePixels(before,box,dx,dy,selectedRegion());
 state.current=new ImageData(moved.data,WIDTH,HEIGHT);
 state.selection=moved.box;updateSelectionUI();render();
}
function nudgeSelection(dx,dy){
 if(!state.selection||!state.current||state.loading||state.syncing)return;
 cancelTemporaryMove();
 const before=snapshot(),box=state.selection.slice();
 previewMove(before,box,dx,dy);commit(before,box);
}
function flipSelection(axis){
 if(!state.selection||!state.current||state.loading||state.syncing)return;
 cancelTemporaryMove();
 const before=snapshot(),box=state.selection.slice();
 const result=core.flipPixels(before,box,axis,selectedRegion());
 state.current=new ImageData(result.data,WIDTH,HEIGHT);commit(before,box);render();
}
function moveCursor(x,y){
 state.cursor=[Math.max(0,Math.min(WIDTH-1,x)),Math.max(0,Math.min(HEIGHT-1,y))];
 $("cursor-coord").textContent="CURSOR X "+state.cursor[0]+" / Y "+state.cursor[1];
 if(state.touchMoveAnchor){
  const d=state.touchMoveAnchor;previewMove(d.before,d.box,state.cursor[0]-d.start[0],state.cursor[1]-d.start[1]);
 }else render();
}
function cursorTap(){
 if(!state.cursorMode||state.panMode||state.loading||state.syncing||!state.current)return;
 const [x,y]=state.cursor;
 if(state.tool==="move"&&state.touchMoveAnchor){
  const d=state.touchMoveAnchor;state.touchMoveAnchor=null;
  commit(d.before,d.box);status("MOVE APPLIED · UNDO AVAILABLE");return;
 }
 if(!editable(x,y)){status("CURSOR OUTSIDE "+state.part.toUpperCase()+" AREA");return;}
 if(state.tool==="select"){
  if(!state.touchSelectAnchor){
   state.touchSelectAnchor=[x,y];setSelection(core.selectionRect(x,y,x,y,selectedRegion()));
   status("SELECT: MOVE CURSOR TO SECOND CORNER, THEN TAP");
  }else{
   setSelection(core.selectionRect(...state.touchSelectAnchor,x,y,selectedRegion()));
   state.touchSelectAnchor=null;status("SELECTION READY · MOVE OR FLIP");
  }
  return;
 }
 if(state.tool==="move"){
  if(!state.touchMoveAnchor){
   if(!inBox([x,y],state.selection)){status("MOVE: TAP INSIDE SELECTION FIRST");return;}
   state.touchMoveAnchor={start:[x,y],before:snapshot(),box:state.selection.slice()};
   status("MOVE: DRAG CURSOR THEN TAP TO DROP");
  }return;
 }
 if(state.tool==="pick"){pickPixel(x,y);return;}
 const before=snapshot();
 if(state.tool==="fill")core.flood(state.current,x,y,rgba(),false,selectedRegion());
 else if(state.tool==="pencil"||state.tool==="erase")paintPixel(x,y,state.tool==="erase");
 commit(before);render();
}
function editStart(e){
 if(e.button!==0||e.isPrimary===false)return;
 if(state.panMode){
  panGesture.id=e.pointerId;panGesture.lastX=e.clientX;panGesture.lastY=e.clientY;
  e.preventDefault();display.setPointerCapture(e.pointerId);return;
 }
 if(state.cursorMode){
  state.trackpad={id:e.pointerId,lastX:e.clientX,lastY:e.clientY,carryX:0,carryY:0,travel:0};
  e.preventDefault();display.setPointerCapture(e.pointerId);return;
 }
 if(state.loading||!state.current||state.syncing)return;
 const [x,y]=eventPos(e);if(!editable(x,y))return;
 e.preventDefault();display.setPointerCapture(e.pointerId);
 if(state.tool==="select"){
  state.selectionGesture={id:e.pointerId,start:[x,y]};
  setSelection(core.selectionRect(x,y,x,y,selectedRegion()));return;
 }
 if(state.tool==="move"){
  if(!inBox([x,y],state.selection)){status("SELECT PIXELS, THEN DRAG INSIDE BOX WITH MOVE");return;}
  state.moveGesture={id:e.pointerId,start:[x,y],before:snapshot(),box:state.selection.slice()};return;
 }
 if(state.tool==="pick"){pickPixel(x,y);return;}
 state.drawing=state.tool!=="fill";state.previous=null;
 state.before=snapshot();
 if(state.tool==="fill"){core.flood(state.current,x,y,rgba(),false,selectedRegion());render();commit(state.before);state.before=null;}
 else drawStroke(x,y);
}
function editMove(e){
 if(panGesture.id!==null){
  if(e.pointerId!==panGesture.id)return;
  const scroller=$("canvas-scroll"),dx=panGesture.lastX-e.clientX,dy=panGesture.lastY-e.clientY;
  const oldTop=scroller.scrollTop;
  scroller.scrollLeft+=dx;scroller.scrollTop+=dy;
  const leftoverY=dy-(scroller.scrollTop-oldTop);
  if(Math.abs(leftoverY)>0.5)window.scrollBy(0,leftoverY);
  panGesture.lastX=e.clientX;panGesture.lastY=e.clientY;e.preventDefault();return;
 }
 if(state.trackpad){
  if(e.pointerId!==state.trackpad.id)return;
  const d=state.trackpad;
  d.travel+=Math.hypot(e.clientX-d.lastX,e.clientY-d.lastY);
  d.carryX+=(e.clientX-d.lastX)/state.zoom;
  d.carryY+=(e.clientY-d.lastY)/state.zoom;
  d.lastX=e.clientX;d.lastY=e.clientY;
  const dx=Math.trunc(d.carryX),dy=Math.trunc(d.carryY);
  d.carryX-=dx;d.carryY-=dy;
  if(dx||dy)moveCursor(state.cursor[0]+dx,state.cursor[1]+dy);
  e.preventDefault();return;
 }
 const [x,y]=eventPos(e);$("cursor-coord").textContent="X "+x+" / Y "+y;
 if(state.selectionGesture){
  if(e.pointerId!==state.selectionGesture.id)return;
  const [sx,sy]=state.selectionGesture.start;
  setSelection(core.selectionRect(sx,sy,x,y,selectedRegion()));e.preventDefault();return;
 }
 if(state.moveGesture){
  if(e.pointerId!==state.moveGesture.id)return;
  const d=state.moveGesture;previewMove(d.before,d.box,x-d.start[0],y-d.start[1]);
  e.preventDefault();return;
 }
 if(!state.drawing||!state.current)return;
 if(!editable(x,y)){state.previous=null;return;}
 e.preventDefault();drawStroke(x,y);
}
function editEnd(e){
 if(panGesture.id!==null){
  if(e&&e.pointerId!==panGesture.id)return;
  panGesture.id=null;return;
 }
 if(state.trackpad){
  if(e&&e.pointerId!==state.trackpad.id)return;
  const tapped=state.trackpad.travel<6&&(!e||e.type!=="pointercancel");
  state.trackpad=null;
  if(tapped)cursorTap();
  return;
 }
 if(state.selectionGesture){
  if(e&&e.pointerId!==state.selectionGesture.id)return;
  state.selectionGesture=null;status("SELECTION READY · MOVE OR FLIP");return;
 }
 if(state.moveGesture){
  if(e&&e.pointerId!==state.moveGesture.id)return;
  const d=state.moveGesture;state.moveGesture=null;
  if(e&&e.type==="pointercancel"){
   state.current=copy(d.before);state.selection=d.box.slice();updateSelectionUI();render();
  }else commit(d.before,d.box);
  return;
 }
 if(!state.drawing)return;
 state.drawing=false;state.previous=null;
 if(e&&e.type==="pointercancel"){
  state.current=copy(state.before);state.before=null;render();return;
 }
 commit(state.before);state.before=null;
}
function render(){
 const z=state.zoom;display.width=WIDTH*z;display.height=HEIGHT*z;
 const g=display.getContext("2d");g.imageSmoothingEnabled=false;
 // checkerboard transparency, plus a neutral silhouette if not loaded
 for(let y=0;y<HEIGHT;y+=8)for(let x=0;x<WIDTH;x+=8){
  g.fillStyle=(x/8+y/8)%2?"#d9e1e8":"#f3f5f4";g.fillRect(x*z,y*z,8*z,8*z);
 }
 mc.clearRect(0,0,128,224);mc.fillStyle="#d4dde6";mc.fillRect(0,0,128,224);
 if(state.current){rc.putImageData(state.current,0,0);g.drawImage(renderCanvas,0,0,WIDTH*z,HEIGHT*z);
  mc.imageSmoothingEnabled=false;mc.drawImage(renderCanvas,0,0,128,224);}
 // Thin boundary around the currently active semantic region.
 const b=selectedRegion();
 g.strokeStyle="#2e6ca8";g.lineWidth=1;
 g.strokeRect(b[0]*z+.5,b[1]*z+.5,(b[2]-b[0])*z,(b[3]-b[1])*z);
 if(state.grid){g.strokeStyle="rgba(36,65,105,.23)";g.lineWidth=1;
  for(let x=b[0]+1;x<b[2];x++){g.beginPath();g.moveTo(x*z+.5,b[1]*z);g.lineTo(x*z+.5,b[3]*z);g.stroke();}
  for(let y=b[1]+1;y<b[3];y++){g.beginPath();g.moveTo(b[0]*z,y*z+.5);g.lineTo(b[2]*z,y*z+.5);g.stroke();}}
 if(state.selection||state.touchSelectAnchor){
  const b=state.touchSelectAnchor?
   core.selectionRect(...state.touchSelectAnchor,...state.cursor,selectedRegion()):state.selection;
  if(b){
   g.save();g.lineWidth=1.5;g.setLineDash([4,4]);g.strokeStyle="#ffffff";
   g.strokeRect(b[0]*z+.5,b[1]*z+.5,(b[2]-b[0])*z,(b[3]-b[1])*z);
   g.lineDashOffset=4;g.strokeStyle="#174a8a";
   g.strokeRect(b[0]*z+.5,b[1]*z+.5,(b[2]-b[0])*z,(b[3]-b[1])*z);
   g.restore();
  }
 }
 if(state.cursorMode&&!state.panMode){
  const [cx,cy]=state.cursor,xx=(cx+.5)*z,yy=(cy+.5)*z;
  g.save();g.lineWidth=Math.max(1,z/4);g.strokeStyle="#ffffff";
  g.beginPath();g.arc(xx,yy,Math.max(z,6),0,2*Math.PI);
  g.moveTo(xx-2*z,yy);g.lineTo(xx+2*z,yy);
  g.moveTo(xx,yy-2*z);g.lineTo(xx,yy+2*z);g.stroke();
  g.lineWidth=1;g.strokeStyle="#092c64";g.strokeRect(cx*z+.5,cy*z+.5,z,z);
  g.restore();
 }
 $("frame-dirty").textContent=state.edits.has(currentKey())?"MODIFIED / LOCAL":"SOURCE PIXELS";
}
function updateCounts(){$("modified-count").textContent=state.edits.size+" MODIFIED FRAME"+(state.edits.size===1?"":"S");}
function historyButtons(){$("undo").disabled=!state.history.length;$("redo").disabled=!state.redo.length;}
async function historyApply(isUndo){
 const from=isUndo?state.history:state.redo,to=isUndo?state.redo:state.history;
 const entry=from.pop();if(!entry)return;to.push(entry);
 const [action,dir,n]=entry.key.split("|");
 if(currentKey()!==entry.key)await setFrame(action,dir,Number(n));
 state.current=copy(isUndo?entry.before:entry.after);
 if(entry.selectionBefore!==undefined)state.selection=isUndo?
  (entry.selectionBefore?entry.selectionBefore.slice():null):
  (entry.selectionAfter?entry.selectionAfter.slice():null);
 updateSelectionUI();saveCurrent();render();historyButtons();
 if(state.mode==="master")queueMasterSync();
 status((isUndo?"UNDO":"REDO")+" / "+entry.key);
}
function toPNG(data){const c=document.createElement("canvas");c.width=WIDTH;c.height=HEIGHT;c.getContext("2d").putImageData(data,0,0);return c.toDataURL("image/png");}
async function fromPNG(url){return new Promise((resolve,reject)=>{
 const img=new Image();img.onload=()=>{if(img.naturalWidth!==64||img.naturalHeight!==112){reject(Error("PNG must be 64×112 pixels"));return;}
  const c=document.createElement("canvas");c.width=64;c.height=112;const g=c.getContext("2d");
  g.drawImage(img,0,0);resolve(g.getImageData(0,0,64,112));};
 img.onerror=()=>reject(Error("Invalid PNG frame"));img.src=url;
 });}
function patchObject(){return {format:"virtual-life-pixel-patch-v2",version:2,actor:core.ACTOR,
 frame_size:[64,112],region:[0,0,64,112],
 note:"Author-approved per-frame images; master part metadata supports re-editing. Upload JSON to publish.",
 masters:[...state.masterDiff.entries()].map(([key,diff])=>({direction:key.split("|")[0],part:key.split("|")[1],diff})),
 frames:[...state.edits.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,data])=>{
  const [action,direction,frame]=k.split("|");return {action,direction,frame:Number(frame),png:toPNG(data)};})};}
function downloadText(content,filename,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function downloadCanvas(filename){renderCanvas.width=64;renderCanvas.height=112;rc.putImageData(state.current,0,0);
 renderCanvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);},"image/png");}
let localTimer=0;
function scheduleSave(){clearTimeout(localTimer);localTimer=setTimeout(()=>{
 try{localStorage.setItem(LOCAL,JSON.stringify(patchObject()));}catch(e){status("LOCAL DRAFT FULL / EXPORT PIXEL EDITS.JSON NOW",true);}
 },450);}
async function importObject(p,fromDraft=false){
 core.validatePatch(p);
 const imported=new Map();
 for(const item of p.frames){
  const clip=state.clips.find(c=>c.id===item.action);
  if(!clip||item.frame>=clip.frames)throw Error("Patch contains unavailable source action/frame: "+item.action);
  const frame=await fromPNG(item.png);
  // A malicious or accidental outside-head edit can never be applied to
  // Theodore body: restore locked source pixels when the frame is opened.
  const k=core.key(item.action,item.direction,item.frame);
  const original=await originalFor(k,clip,item.direction,item.frame);
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
   if(p.version===2||core.isEditable(x,y))continue;
   const i=(y*WIDTH+x)*4;for(let q=0;q<4;q++)frame.data[i+q]=original.data[i+q];
  }
  if(!identical(frame,original))imported.set(k,frame);
 }
 const masters=new Map();
 if(p.version===2&&p.masters!==undefined){
  if(!Array.isArray(p.masters)||p.masters.length>24)throw Error("Invalid master data");
  for(const m of p.masters){
   if(!DIRECTIONS.includes(m.direction)||!parts.PARTS[m.part]||!Array.isArray(m.diff)||
      m.diff.length>64*112)throw Error("Invalid master");
   const k=masterKey(m.direction,m.part);
   if(masters.has(k))throw Error("Duplicate master");
   for(const item of m.diff)if(!Array.isArray(item)||item.length!==6||
     !parts.contains(m.part,item[0],item[1])||!item.every(Number.isInteger)||
     item.slice(2).some(v=>v<0||v>255))throw Error("Invalid master pixel");
   masters.set(k,m.diff);
  }
 }
 state.edits=imported;state.masterDiff=masters;state.history=[];state.redo=[];historyButtons();updateCounts();
 await navigate();
 if(!fromDraft)scheduleSave();
 status((fromDraft?"RESTORED LOCAL DRAFT":"IMPORTED PIXEL PATCH")+" / "+imported.size+" FRAMES");
}
function markSwatches(){for(const b of $("swatches").children)b.classList.toggle("selected",b.dataset.color===state.color);}
function refreshToolState(){
 document.querySelectorAll("[data-tool]").forEach(b=>{
  const active=!state.panMode&&b.dataset.tool===state.tool;
  b.classList.toggle("active",active);b.setAttribute("aria-pressed",String(active));
 });
 const pan=$("pan-toggle");pan.classList.toggle("active",state.panMode);pan.setAttribute("aria-pressed",String(state.panMode));
 const cursor=$("cursor-toggle");cursor.classList.toggle("active",state.cursorMode&&!state.panMode);
 cursor.setAttribute("aria-pressed",String(state.cursorMode));
 cursor.textContent=state.cursorMode?"⌖ CURSOR ON":"⌖ CURSOR OFF";
 $("cursor-tap").disabled=!state.cursorMode||state.panMode||state.loading||state.syncing;
 for(const id of ["cursor-left","cursor-up","cursor-down","cursor-right"])
  $(id).disabled=!state.cursorMode||state.panMode;
 $("gesture-hint").textContent=state.panMode?"PAN · drag to scroll without painting":
  state.cursorMode?"CURSOR · drag canvas to move crosshair, TAP to edit":
  "DIRECT · drag to paint/select; empty margin scrolls";
 display.style.cursor=state.panMode?"grab":state.cursorMode?"none":"crosshair";
}
function initControls(){
 $("zoom").value=String(state.zoom);
 refreshToolState();
 $("pan-toggle").onclick=()=>{cancelTemporaryMove();state.panMode=!state.panMode;refreshToolState();render();};
 $("cursor-toggle").onclick=()=>{cancelTemporaryMove();state.cursorMode=!state.cursorMode;state.panMode=false;refreshToolState();render();};
 $("cursor-tap").onclick=cursorTap;
 for(const [id,dx,dy] of [["cursor-left",-1,0],["cursor-right",1,0],["cursor-up",0,-1],["cursor-down",0,1]])
  $(id).onclick=()=>{if(state.cursorMode&&!state.panMode)moveCursor(state.cursor[0]+dx,state.cursor[1]+dy);};
 for(const [id,dx,dy] of [["nudge-left",-1,0],["nudge-right",1,0],["nudge-up",0,-1],["nudge-down",0,1]])
  $(id).onclick=()=>nudgeSelection(dx,dy);
 $("flip-horizontal").onclick=()=>flipSelection("horizontal");
 $("flip-vertical").onclick=()=>flipSelection("vertical");
 $("deselect").onclick=()=>{cancelTemporaryMove();setSelection(null);};
 for(const color of PALETTE){const b=document.createElement("button");b.className="swatch";b.type="button";b.dataset.color=color;
  b.style.background=color;b.title=color;b.setAttribute("aria-label","Paint "+color);b.onclick=()=>{state.color=color;$("color").value=color;markSwatches();};$("swatches").append(b);}
 markSwatches();
 document.querySelectorAll("[data-tool]").forEach(b=>b.onclick=()=>{
  cancelTemporaryMove();state.tool=b.dataset.tool;state.panMode=false;refreshToolState();render();
 });
 $("color").oninput=e=>{state.color=e.target.value;markSwatches();};
 $("brush-size").oninput=e=>{state.brush=Number(e.target.value);$("brush-label").textContent=state.brush+" PX";};
 $("edit-mode").onchange=async e=>{
  cancelTemporaryMove();setSelection(null);
  await state.syncPromise;
  if(!state.loading)saveCurrent();
  state.mode=e.target.value;
  if(state.mode==="master"){
   if(!state.clips.some(clip=>clip.id==="idle")){
    state.mode="frame";$("edit-mode").value="frame";status("NO ORIGINAL IDLE MASTER",true);
   }else await setFrame("idle",state.dir,0);
  }
  modeUI();
 };
 $("part").onchange=e=>{cancelTemporaryMove();if(!state.loading)saveCurrent();state.part=e.target.value;setSelection(null);
  const b=selectedRegion();state.cursor=[Math.floor((b[0]+b[2]-1)/2),Math.floor((b[1]+b[3]-1)/2)];
  $("cursor-coord").textContent="CURSOR X "+state.cursor[0]+" / Y "+state.cursor[1];modeUI();};
 $("action").onchange=e=>setFrame(e.target.value,state.dir,0);
 $("direction").onchange=async e=>{
  await state.syncPromise;
  await setFrame(state.mode==="master"?"idle":state.action,e.target.value,state.mode==="master"?0:state.frame);
 };
 $("frame").oninput=e=>setFrame(state.action,state.dir,Number(e.target.value));
 $("prev-frame").onclick=()=>setFrame(state.action,state.dir,(state.frame+frameCount()-1)%frameCount());
 $("next-frame").onclick=()=>setFrame(state.action,state.dir,(state.frame+1)%frameCount());
 $("zoom").onchange=e=>{state.zoom=Number(e.target.value);render();};
 $("grid").onchange=e=>{state.grid=e.target.checked;render();};
 $("undo").onclick=()=>historyApply(true);$("redo").onclick=()=>historyApply(false);
 $("reset-frame").onclick=()=>{if(!state.current)return;
  const before=snapshot(),base=state.originals.get(currentKey());
  if(state.mode==="master"){
   const b=selectedRegion();
   for(let y=b[1];y<b[3];y++)for(let x=b[0];x<b[2];x++){
    const i=(y*WIDTH+x)*4;for(let j=0;j<4;j++)state.current.data[i+j]=base.data[i+j];
   }
  }else state.current=copy(base);
  commit(before);status("RESET "+(state.mode==="master"?state.part.toUpperCase():"CURRENT FRAME"));};
 $("download-frame").onclick=()=>{if(state.current)downloadCanvas("otis_"+state.action+"_"+state.dir+"_f"+state.frame+".png");};
 $("export-patch").onclick=async()=>{await state.syncPromise;if(!state.loading)saveCurrent();
  const patch=patchObject();core.validatePatch(patch);
  downloadText(JSON.stringify(patch,null,2)+"\n","otis_pixel_edits.json","application/json");status("EXPORTED "+patch.frames.length+" PIXEL FRAMES / SHARE FILE IN CHAT TO PUBLISH");};
 $("import-patch").onclick=()=>$("patch-file").click();
 $("patch-file").onchange=async e=>{const file=e.target.files?.[0];if(!file)return;
  try{if(file.size>15000000)throw Error("Patch larger than 15 MB");const data=JSON.parse(await file.text());await importObject(data);}
  catch(error){status("IMPORT FAILED: "+error.message,true);}finally{e.target.value="";}};
 $("clear-draft").onclick=()=>{if(!window.confirm("Discard all LOCAL Otis pixel edits? Existing files already downloaded will remain."))return;
  clearTimeout(localTimer);state.edits.clear();state.masterDiff.clear();state.history=[];state.redo=[];historyButtons();localStorage.removeItem(LOCAL);navigate();updateCounts();status("LOCAL DRAFT DELETED");};
 display.addEventListener("pointerdown",editStart);display.addEventListener("pointermove",editMove);
 display.addEventListener("pointerup",editEnd);display.addEventListener("pointercancel",editEnd);
 document.addEventListener("keydown",e=>{if(e.target.matches("input,textarea,select")||e.altKey||e.metaKey&&e.key.toLowerCase()!=="z")return;
  const k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==="z"){e.preventDefault();historyApply(e.shiftKey?false:true);return;}
  if(e.ctrlKey)return;
  if(k==="enter"&&state.cursorMode){e.preventDefault();cursorTap();return;}
  const b={b:"pencil",e:"erase",i:"pick",g:"fill",s:"select",m:"move"}[k];
  if(b){document.querySelector('[data-tool="'+b+'"]').click();}
 });
}
async function init(){
 initControls();render();
 try{
  const response=await fetch("./motion-packs/legacy_otis.json",{cache:"no-store"});
  if(!response.ok)throw Error("Motion pack unavailable: "+response.status);
  const pack=await response.json();
  if(pack.actor!==core.ACTOR||pack.format!=="virtual-life-sprite-motion-v1"||
     pack.frame_size?.join(",")!=="64,112")throw Error("Wrong character rig file");
  state.pack=pack;state.clips=(pack.clips||[]).filter(isReadyClip);
  if(!state.clips.length)throw Error("No editable original Otis frames");
  for(const clip of state.clips){const o=document.createElement("option");o.value=clip.id;
   o.textContent=clip.name+" ("+clip.frames+" FRAMES)";$("action").append(o);}
  state.action=state.clips.some(c=>c.id==="idle")?"idle":state.clips[0].id;
  await navigate();modeUI();refreshToolState();$("source-state").textContent=state.clips.length+" ORIGINAL OTIS ACTIONS";
  try{const draft=localStorage.getItem(LOCAL)||localStorage.getItem(OLD_LOCAL);if(draft)await importObject(JSON.parse(draft),true);}
  catch(e){status("DRAFT INVALID (SOURCE SAFE) / "+e.message,true);}
 }catch(e){status("EDITOR NOT READY: "+e.message,true);}
}
window.VirtualLifePixelEditor={
 async flush(){
  cancelTemporaryMove();await state.syncPromise;
  if(!state.loading)saveCurrent();
  clearTimeout(localTimer);
  try{localStorage.setItem(LOCAL,JSON.stringify(patchObject()));}
  catch(error){status("LOCAL SAVE FAILED: EXPORT YOUR PATCH JSON",true);throw error;}
 }
};
window.addEventListener("pagehide",()=>{if(state.loading)return;
 cancelTemporaryMove();
 try{localStorage.setItem(LOCAL,JSON.stringify(patchObject()));}
 catch(error){/* user can still explicitly export a patch */}});
init();
})();