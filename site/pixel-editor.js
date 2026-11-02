/* Otis native pixel editor. Local browser draft + explicit portable JSON patch.
   Original 64x112 RGBA sprite frames, no CSS-only illusion or remote writes. */
(()=>{
"use strict";
const core=window.VirtualLifePixelEdit;
if(!core)return;
const $=id=>document.getElementById(id);
const DIRECTIONS=core.DIRECTIONS,WIDTH=64,HEIGHT=112;
const PALETTE=["#61b3c4","#95d7de","#418da5","#2b6479","#183f59",
 "#fbf9ea","#dde5e5","#9eb3bf","#687f90","#354555",
 "#d63e35","#f87d56","#101a2a","#fef4d4","#ffffff","#000000",
 "#b15a36","#d28e5e","#f8d5b1","#c5bcae","#455f74","#6d4f50",
 "#eab9b9","#c9d4e0"];
const LOCAL="virtual-life-otis-pixel-draft-v1";
const display=$("pixel-canvas"),dc=display.getContext("2d",{alpha:false});
const mini=$("small-preview"),mc=mini.getContext("2d");
const renderCanvas=document.createElement("canvas");renderCanvas.width=WIDTH;renderCanvas.height=HEIGHT;
const rc=renderCanvas.getContext("2d",{willReadFrequently:true});
dc.imageSmoothingEnabled=false;mc.imageSmoothingEnabled=false;
const state={pack:null,clips:[],action:"walk",dir:"se",frame:0,
 tool:"pencil",color:"#61b3c4",brush:1,zoom:8,grid:false,
 originals:new Map(),edits:new Map(),imageRequests:new Map(),history:[],redo:[],
 current:null,loading:true,drawing:false,previous:null,before:null,seq:0};
function status(s,error=false){$("editor-status").textContent=s;$("editor-status").classList.toggle("error",error);}
function activeClip(){return state.clips.find(c=>c.id===state.action);}
function currentKey(){return core.key(state.action,state.dir,state.frame);}
function frameCount(){return activeClip()?.frames||1;}
function copy(data){return new ImageData(new Uint8ClampedArray(data.data),WIDTH,HEIGHT);}
function identical(a,b){if(!a||!b)return false;const x=a.data,y=b.data;if(x.length!==y.length)return false;for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true;}
function snapshot(){return state.current?copy(state.current):null;}
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
 state.loading=true;state.current=null;
 $("frame").max=String(clip.frames-1);$("frame").value=String(state.frame);
 $("frame-label").textContent="FRAME "+(state.frame+1)+" / "+clip.frames;
 $("canvas-title").textContent="OTIS / "+clip.id.toUpperCase()+" / "+state.dir.toUpperCase()+" / F"+state.frame;
 status("READING "+clip.id.toUpperCase()+" / "+state.dir.toUpperCase()+" / "+state.frame+"...");
 try{
  const key=currentKey(),original=await originalFor(key,clip,state.dir,state.frame);
  if(seq!==state.seq)return;
  state.current=copy(state.edits.get(key)||original);
  state.loading=false;render();status("EDITING ORIGINAL PIXELS / "+key+" / DRAFT NOT PUBLISHED");
 }catch(e){if(seq!==state.seq)return;status("LOAD FAILED: "+e.message,true);state.loading=true;render();}
}
async function setFrame(action,dir,index){
 if(!state.loading)saveCurrent();
 state.action=action;state.dir=dir;state.frame=Math.max(0,Math.min(index,activeClip()?.frames-1||0));
 $("action").value=action;$("direction").value=dir;await navigate();
}
function rgba(){const h=state.color.replace("#","");return [...[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)),255];}
function paintPixel(x,y,erase=false){
 if(!state.current)return;
 const p=state.current.data,half=Math.floor(state.brush/2),v=rgba();
 for(let yy=y-half;yy<y-half+state.brush;yy++)for(let xx=x-half;xx<x-half+state.brush;xx++){
  if(!core.isEditable(xx,yy))continue;const i=(yy*WIDTH+xx)*4;
  for(let k=0;k<4;k++)p[i+k]=erase?0:v[k];
 }
}
function drawStroke(x,y){if(state.previous){for(const [px,py]of core.bresenham(state.previous[0],state.previous[1],x,y))paintPixel(px,py,state.tool==="erase");}
 else paintPixel(x,y,state.tool==="erase");
 state.previous=[x,y];render();}
function pickPixel(x,y){if(!state.current||!core.isEditable(x,y))return;
 const d=state.current.data,i=(y*WIDTH+x)*4;
 if(!d[i+3]){status("TRANSPARENT PIXEL / PICK AN OPAQUE COLOR");return;}
 const color="#"+[d[i],d[i+1],d[i+2]].map(v=>v.toString(16).padStart(2,"0")).join("");
 state.color=color;$("color").value=color;markSwatches();
 status("PICKED "+color.toUpperCase());}
function eventPos(event){const r=display.getBoundingClientRect();
 return [Math.floor((event.clientX-r.left)*WIDTH/r.width),Math.floor((event.clientY-r.top)*HEIGHT/r.height)];}
function commit(before){
 if(!before||!state.current||identical(before,state.current))return;
 state.history.push({key:currentKey(),before,after:snapshot()});if(state.history.length>40)state.history.shift();
 state.redo=[];saveCurrent();render();historyButtons();
}
function editStart(e){
 if(state.loading||!state.current||e.button!==0)return;
 const [x,y]=eventPos(e);if(!core.isEditable(x,y))return;
 e.preventDefault();display.setPointerCapture(e.pointerId);
 if(state.tool==="pick"){pickPixel(x,y);return;}
 state.drawing=state.tool!=="fill";state.previous=null;
 state.before=snapshot();
 if(state.tool==="fill"){core.flood(state.current,x,y,rgba());render();commit(state.before);state.before=null;}
 else drawStroke(x,y);
}
function editMove(e){
 const [x,y]=eventPos(e);$("cursor-coord").textContent="X "+x+" / Y "+y;
 if(!state.drawing||!state.current)return;
 if(!core.isEditable(x,y)){state.previous=null;return;}
 e.preventDefault();drawStroke(x,y);
}
function editEnd(){
 if(!state.drawing)return;state.drawing=false;state.previous=null;
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
 // Thin locked-region perimeter; body outside it cannot be painted.
 g.strokeStyle="#2e6ca8";g.lineWidth=1;
 g.strokeRect(core.REGION[0]*z+.5,core.REGION[1]*z+.5,
  (core.REGION[2]-core.REGION[0])*z,(core.REGION[3]-core.REGION[1])*z);
 if(state.grid){g.strokeStyle="rgba(36,65,105,.23)";g.lineWidth=1;
  for(let x=core.REGION[0]+1;x<core.REGION[2];x++) {g.beginPath();g.moveTo(x*z+.5,core.REGION[1]*z);g.lineTo(x*z+.5,core.REGION[3]*z);g.stroke();}
  for(let y=core.REGION[1]+1;y<core.REGION[3];y++){g.beginPath();g.moveTo(core.REGION[0]*z,y*z+.5);g.lineTo(core.REGION[2]*z,y*z+.5);g.stroke();}}
 $("frame-dirty").textContent=state.edits.has(currentKey())?"MODIFIED / LOCAL":"SOURCE PIXELS";
}
function updateCounts(){$("modified-count").textContent=state.edits.size+" MODIFIED FRAME"+(state.edits.size===1?"":"S");}
function historyButtons(){$("undo").disabled=!state.history.length;$("redo").disabled=!state.redo.length;}
async function historyApply(isUndo){
 const from=isUndo?state.history:state.redo,to=isUndo?state.redo:state.history;
 const entry=from.pop();if(!entry)return;to.push(entry);
 const [action,dir,n]=entry.key.split("|");
 if(currentKey()!==entry.key)await setFrame(action,dir,Number(n));
 state.current=copy(isUndo?entry.before:entry.after);saveCurrent();render();historyButtons();
 status((isUndo?"UNDO":"REDO")+" / "+entry.key);
}
function toPNG(data){const c=document.createElement("canvas");c.width=WIDTH;c.height=HEIGHT;c.getContext("2d").putImageData(data,0,0);return c.toDataURL("image/png");}
async function fromPNG(url){return new Promise((resolve,reject)=>{
 const img=new Image();img.onload=()=>{if(img.naturalWidth!==64||img.naturalHeight!==112){reject(Error("PNG must be 64×112 pixels"));return;}
  const c=document.createElement("canvas");c.width=64;c.height=112;const g=c.getContext("2d");
  g.drawImage(img,0,0);resolve(g.getImageData(0,0,64,112));};
 img.onerror=()=>reject(Error("Invalid PNG frame"));img.src=url;
 });}
function patchObject(){return {format:"virtual-life-pixel-patch-v1",version:1,actor:core.ACTOR,
 frame_size:[64,112],region:[...core.REGION],
 note:"Character head pixels only. Upload JSON to the assistant to commit into assets/npc_otis/pixel_overrides.json.",
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
   if(core.isEditable(x,y))continue;
   const i=(y*WIDTH+x)*4;for(let q=0;q<4;q++)frame.data[i+q]=original.data[i+q];
  }
  if(!identical(frame,original))imported.set(k,frame);
 }
 state.edits=imported;state.history=[];state.redo=[];historyButtons();updateCounts();
 await navigate();
 if(!fromDraft)scheduleSave();
 status((fromDraft?"RESTORED LOCAL DRAFT":"IMPORTED PIXEL PATCH")+" / "+imported.size+" FRAMES");
}
function markSwatches(){for(const b of $("swatches").children)b.classList.toggle("selected",b.dataset.color===state.color);}
function initControls(){
 for(const color of PALETTE){const b=document.createElement("button");b.className="swatch";b.type="button";b.dataset.color=color;
  b.style.background=color;b.title=color;b.setAttribute("aria-label","Paint "+color);b.onclick=()=>{state.color=color;$("color").value=color;markSwatches();};$("swatches").append(b);}
 markSwatches();
 document.querySelectorAll("[data-tool]").forEach(b=>b.onclick=()=>{state.tool=b.dataset.tool;
  document.querySelectorAll("[data-tool]").forEach(x=>x.classList.toggle("active",x===b));});
 $("color").oninput=e=>{state.color=e.target.value;markSwatches();};
 $("brush-size").oninput=e=>{state.brush=Number(e.target.value);$("brush-label").textContent=state.brush+" PX";};
 $("action").onchange=e=>setFrame(e.target.value,state.dir,0);
 $("direction").onchange=e=>setFrame(state.action,e.target.value,state.frame);
 $("frame").oninput=e=>setFrame(state.action,state.dir,Number(e.target.value));
 $("prev-frame").onclick=()=>setFrame(state.action,state.dir,(state.frame+frameCount()-1)%frameCount());
 $("next-frame").onclick=()=>setFrame(state.action,state.dir,(state.frame+1)%frameCount());
 $("zoom").onchange=e=>{state.zoom=Number(e.target.value);render();};
 $("grid").onchange=e=>{state.grid=e.target.checked;render();};
 $("undo").onclick=()=>historyApply(true);$("redo").onclick=()=>historyApply(false);
 $("reset-frame").onclick=()=>{if(!state.current)return;
  const before=snapshot();state.current=copy(state.originals.get(currentKey()));commit(before);status("RESET CURRENT FRAME");};
 $("download-frame").onclick=()=>{if(state.current)downloadCanvas("otis_"+state.action+"_"+state.dir+"_f"+state.frame+".png");};
 $("export-patch").onclick=()=>{if(!state.loading)saveCurrent();
  const patch=patchObject();core.validatePatch(patch);
  downloadText(JSON.stringify(patch,null,2)+"\n","otis_pixel_edits.json","application/json");status("EXPORTED "+patch.frames.length+" PIXEL FRAMES / SHARE FILE IN CHAT TO PUBLISH");};
 $("import-patch").onclick=()=>$("patch-file").click();
 $("patch-file").onchange=async e=>{const file=e.target.files?.[0];if(!file)return;
  try{if(file.size>15000000)throw Error("Patch larger than 15 MB");const data=JSON.parse(await file.text());await importObject(data);}
  catch(error){status("IMPORT FAILED: "+error.message,true);}finally{e.target.value="";}};
 $("clear-draft").onclick=()=>{if(!window.confirm("Discard all LOCAL Otis pixel edits? Existing files already downloaded will remain."))return;
  state.edits.clear();state.history=[];state.redo=[];historyButtons();localStorage.removeItem(LOCAL);navigate();updateCounts();status("LOCAL DRAFT DELETED");};
 display.addEventListener("pointerdown",editStart);display.addEventListener("pointermove",editMove);
 display.addEventListener("pointerup",editEnd);display.addEventListener("pointercancel",editEnd);
 document.addEventListener("keydown",e=>{if(e.target.matches("input,textarea,select")||e.altKey||e.metaKey&&e.key.toLowerCase()!=="z")return;
  const k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==="z"){e.preventDefault();historyApply(e.shiftKey?false:true);return;}
  if(e.ctrlKey)return;
  const b={b:"pencil",e:"erase",i:"pick",g:"fill"}[k];
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
  state.action=state.clips.some(c=>c.id==="walk")?"walk":state.clips[0].id;
  await navigate();$("source-state").textContent=state.clips.length+" ORIGINAL OTIS ACTIONS";
  try{const draft=localStorage.getItem(LOCAL);if(draft)await importObject(JSON.parse(draft),true);}
  catch(e){status("DRAFT INVALID (SOURCE SAFE) / "+e.message,true);}
 }catch(e){status("EDITOR NOT READY: "+e.message,true);}
}
init();
})();