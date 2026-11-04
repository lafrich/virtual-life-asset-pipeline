/* Original Virtual Life XP Paint accessory authoring: local 4-view pixel layers.
   The guide image is display-only and never exported into accessory PNGs. */
(()=>{
"use strict";
const $=id=>document.getElementById(id),core=window.VirtualLifePixelEdit;
if(!core)return;
const W=64,H=112,DIRS=["se","sw","ne","nw"],KINDS=["helmet","bag","hair","shirt","pants","shoes"];
const REGIONS={helmet:[13,22,52,56],bag:[8,43,56,91],hair:[12,16,53,57],shirt:[12,49,53,84],pants:[11,72,54,101],shoes:[10,91,55,108]};
const LABELS={helmet:"HELM",bag:"TAS",hair:"RAMBUT",shirt:"BAJU",pants:"CELANA",shoes:"SEPATU"};
const STORE="virtual-life-accessories-v1",EQUIP="virtual-life-accessory-equipment-v1",DRAFT="virtual-life-accessory-drafts-v1";
const COLORS=["#ffffff","#e9edf2","#bbc7d0","#82929f","#4d5d6f","#17283a","#111111",
 "#61b3c4","#95d7de","#418da5","#2b6479","#183f59","#d63e35","#f87d56",
 "#b15a36","#d28e5e","#f8d5b1","#c5bcae","#455f74","#6d4f50","#eab9b9","#c9d4e0"];
const params=new URLSearchParams(location.search);
const actor=/^[a-z0-9_-]{1,60}$/.test(params.get("actor")||"")?params.get("actor"):"astrofrich_base";
const requestedBase=params.get("base")||"astrofrich_base";
const base=["astrofrich_base","human_male_base","human_female_base"].includes(requestedBase)?requestedBase:"astrofrich_base";
const human=base.startsWith("human_");
const allowedKinds=human?["hair","shirt","pants","shoes"]:["helmet","bag"];
const DRAFT_KEY=DRAFT+"-"+base;
const area=$("acc-scroller"),canvas=$("acc-canvas"),ctx=canvas.getContext("2d",{alpha:false});
const preview=$("acc-preview"),pc=preview.getContext("2d",{alpha:false});
const guide=new Image(),guideState={loaded:false};
const makeLayer=()=>{const c=document.createElement("canvas");c.width=W;c.height=H;return c;};
const makeLayers=()=>Object.fromEntries(DIRS.map(d=>[d,makeLayer()]));
const MOBILE=window.matchMedia("(max-width:900px) and (pointer:coarse)").matches;
const state={category:human?"hair":"helmet",dir:"se",tool:"pencil",mode:"replace",color:"#418da5",brush:1,
 zoom:MOBILE?4:6,cursorMode:MOBILE,pan:false,grid:false,alpha:.58,tolerance:0,connected:true,
 cursor:[32,38],selection:null,selectionAnchor:null,pointer:null,cursorMove:null,layers:makeLayers(),
 drafts:{},history:[],redo:[],savedId:null,manualZoom:false,loaded:false};
for(const kind of KINDS)state.drafts[kind]=kind==="helmet"?state.layers:makeLayers();
// A Human editor opens on Hair; its active canvas must reference the hair draft,
// not the initial hidden helmet buffer.
if(human)state.layers=state.drafts.hair;
if(allowedKinds.includes(params.get("category"))){
 state.category=params.get("category");state.layers=state.drafts[state.category];
 const b=REGIONS[state.category];state.cursor=[Math.floor((b[0]+b[2])/2),Math.floor((b[1]+b[3])/2)];
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const region=()=>REGIONS[state.category];
const layer=()=>state.layers[state.dir],brushCtx=()=>layer().getContext("2d",{willReadFrequently:true});
const image=()=>brushCtx().getImageData(0,0,W,H);
const put=(data)=>brushCtx().putImageData(data,0,0);
const inside=(x,y)=>{const r=region();return x>=r[0]&&x<r[2]&&y>=r[1]&&y<r[3]};
const pidx=(x,y)=>(y*W+x)*4;
const same=(a,b)=>a.every((v,i)=>v===b[i]);
function status(s){$("acc-status").textContent=s;}
function keysafeRead(key,initial){
 try{const value=JSON.parse(localStorage.getItem(key));return value??initial}catch(e){return initial;}
}
function currentCategory(){return LABELS[state.category];}
function resetMask(){state.selection=null;state.selectionAnchor=null;updateControls();}
function setMask(mask){
 state.selection=mask&&core.maskCount(mask)?mask:null;
 updateControls();draw();
}
function selectRect(rect,base=state.selection,mode=state.mode){
 setMask(core.combineMasks(base,core.maskRect(rect,region()),mode));
}
function selectWand(x,y){
 if(!inside(x,y))return;
 const mask=core.wandMask(image(),x,y,region(),state.tolerance,state.connected);
 setMask(core.combineMasks(state.selection,mask,state.mode));
 status("COLOR SELECT · "+core.maskCount(mask)+" PX · "+state.mode.toUpperCase());
}
function completedDirections(){
 return DIRS.filter(d=>{
  const ctx=state.layers[d].getContext("2d",{willReadFrequently:true});
  const data=ctx.getImageData(0,0,W,H).data;
  for(let i=3;i<data.length;i+=4)if(data[i])return true;
  return false;
 });
}
function updateDirectionProgress(){
 const done=completedDirections();
 $("acc-direction-progress").textContent="4 VIEWS · "+
  DIRS.map(d=>d.toUpperCase()+(done.includes(d)?" ✓":" ○")).join(" / ")+
  (done.length===4?" · READY TO SAVE":" · COMPLETE ALL SIDES");
 $("acc-save").disabled=done.length<4;
 $("acc-equip").disabled=done.length<4;
}
function updateControls(){
 updateDirectionProgress();
 const selected=state.selection&&core.maskCount(state.selection)>0;
 for(const id of ["acc-nudge-left","acc-nudge-right","acc-flip-h","acc-flip-v","acc-clear-selection"])$(id).disabled=!selected;
 for(const b of document.querySelectorAll("[data-acc-tool]"))b.classList.toggle("active",b.dataset.accTool===state.tool&&!state.pan);
 for(const b of document.querySelectorAll("[data-acc-mode]"))b.classList.toggle("active",b.dataset.accMode===state.mode);
 for(const b of document.querySelectorAll("[data-acc-dir]"))b.classList.toggle("active",b.dataset.accDir===state.dir);
 $("acc-pan").classList.toggle("active",state.pan);
 $("acc-cursor").classList.toggle("active",state.cursorMode&&!state.pan);
 $("acc-cursor").textContent=state.cursorMode?"⌖ CURSOR ON":"⌖ CURSOR OFF";
 $("acc-apply").disabled=!state.cursorMode||state.pan;
 $("acc-title").textContent=currentCategory()+" / "+state.dir.toUpperCase();
 $("acc-undo").disabled=!state.history.length;
 $("acc-redo").disabled=!state.redo.length;
 for(const k of KINDS){const b=$("acc-"+k);b.hidden=!allowedKinds.includes(k);b.classList.toggle("active",state.category===k);}
 $("acc-position").textContent="X "+state.cursor[0]+" / Y "+state.cursor[1];
}
function draw(){
 const z=state.zoom;
 canvas.width=W*z;canvas.height=H*z;
 ctx.imageSmoothingEnabled=false;
 for(let y=0;y<H;y+=8)for(let x=0;x<W;x+=8){
  ctx.fillStyle=((x+y)/8)%2?"#dfe6e9":"#fafafa";
  ctx.fillRect(x*z,y*z,8*z,8*z);
 }
 const di=DIRS.indexOf(state.dir);
 if(guideState.loaded&&state.alpha>0){
  ctx.globalAlpha=state.alpha;
  ctx.drawImage(guide,di*W,0,W,H,0,0,W*z,H*z);
  ctx.globalAlpha=1;
 }
 ctx.drawImage(layer(),0,0,W*z,H*z);
 const r=region();
 ctx.strokeStyle="#2664a1";ctx.lineWidth=1;
 ctx.strokeRect(r[0]*z+.5,r[1]*z+.5,(r[2]-r[0])*z,(r[3]-r[1])*z);
 if(state.grid){
  ctx.save();ctx.strokeStyle="rgba(40,70,110,.20)";ctx.lineWidth=1;
  for(let x=r[0]+1;x<r[2];x++){ctx.beginPath();ctx.moveTo(x*z+.5,r[1]*z);ctx.lineTo(x*z+.5,r[3]*z);ctx.stroke();}
  for(let y=r[1]+1;y<r[3];y++){ctx.beginPath();ctx.moveTo(r[0]*z,y*z+.5);ctx.lineTo(r[2]*z,y*z+.5);ctx.stroke();}
  ctx.restore();
 }
 if(state.selection){
  const m=state.selection,b=core.maskBounds(m);
  if(b){ctx.save();ctx.beginPath();
   for(let y=b[1];y<b[3];y++)for(let x=b[0];x<b[2];x++)if(m[y*W+x]){
    const i=y*W+x,xx=x*z,yy=y*z;
    if(x===0||!m[i-1]){ctx.moveTo(xx,yy);ctx.lineTo(xx,yy+z);}
    if(x===W-1||!m[i+1]){ctx.moveTo(xx+z,yy);ctx.lineTo(xx+z,yy+z);}
    if(y===0||!m[i-W]){ctx.moveTo(xx,yy);ctx.lineTo(xx+z,yy);}
    if(y===H-1||!m[i+W]){ctx.moveTo(xx,yy+z);ctx.lineTo(xx+z,yy+z);}
   }
   ctx.strokeStyle="#fff";ctx.lineWidth=Math.max(1,z/3);ctx.stroke();
   ctx.strokeStyle="#174a8a";ctx.lineWidth=1;ctx.setLineDash([z,z]);ctx.stroke();ctx.restore();
  }
 }
 if(state.selectionAnchor){
  const b=core.selectionRect(...state.selectionAnchor.start,...state.cursor,region());
  ctx.save();ctx.setLineDash([4,4]);ctx.strokeStyle="#fff";ctx.lineWidth=2;
  ctx.strokeRect(b[0]*z,b[1]*z,(b[2]-b[0])*z,(b[3]-b[1])*z);ctx.restore();
 }
 if(state.cursorMode&&!state.pan){
  const [x,y]=state.cursor;
  ctx.save();ctx.lineWidth=2;ctx.strokeStyle="#fff";ctx.strokeRect(x*z+.5,y*z+.5,z,z);
  ctx.strokeStyle="#133d90";ctx.lineWidth=1;ctx.strokeRect(x*z+.5,y*z+.5,z,z);
  ctx.beginPath();ctx.moveTo((x-1)*z,(y+.5)*z);ctx.lineTo((x+2)*z,(y+.5)*z);
  ctx.moveTo((x+.5)*z,(y-1)*z);ctx.lineTo((x+.5)*z,(y+2)*z);ctx.stroke();ctx.restore();
 }
 pc.imageSmoothingEnabled=false;
 pc.fillStyle="#ecedef";pc.fillRect(0,0,256,448);
 // Backpack remains behind the full actor silhouette in EVERY direction.
 // In the pixel editor show the layer first, then draw the body guide over it.
 if(state.category==="bag"){
  pc.drawImage(layer(),0,0,256,448);
  if(guideState.loaded)pc.drawImage(guide,di*W,0,W,H,0,0,256,448);
 }else{
  if(guideState.loaded)pc.drawImage(guide,di*W,0,W,H,0,0,256,448);
  pc.drawImage(layer(),0,0,256,448);
 }
}
function remember(before,beforeMask){
 const after=image();
 if(same(before.data,after.data))return;
 state.history.push({category:state.category,dir:state.dir,before:new Uint8ClampedArray(before.data),
 after:new Uint8ClampedArray(after.data),maskBefore:beforeMask?beforeMask.slice():null,
 maskAfter:state.selection?state.selection.slice():null});
 if(state.history.length>50)state.history.shift();
 state.redo=[];updateControls();draftSoon();
}
function applyHistory(undo){
 const src=undo?state.history:state.redo,dest=undo?state.redo:state.history,entry=src.pop();
 if(!entry)return;
 dest.push(entry);
 setCategory(entry.category,true);state.dir=entry.dir;
 put(new ImageData(new Uint8ClampedArray(undo?entry.before:entry.after),W,H));
 state.selection=(undo?entry.maskBefore:entry.maskAfter)?.slice()||null;
 updateControls();draw();draftSoon();
}
function strokePixel(x,y,erase){
 const a=image(),color=state.color.match(/[0-9a-f]{2}/gi).map(v=>parseInt(v,16));
 const half=Math.floor(state.brush/2);
 for(let yy=y-half;yy<y-half+state.brush;yy++)for(let xx=x-half;xx<x-half+state.brush;xx++){
  if(!inside(xx,yy))continue;
  const i=pidx(xx,yy);
  if(erase)a.data.fill(0,i,i+4);
  else a.data.set([...color,255],i);
 }
 put(a);
}
function strokeLine(x,y,px,py){for(const [cx,cy] of core.bresenham(px,py,x,y))strokePixel(cx,cy,state.tool==="erase");draw();}
function previewMove(pointer,x,y){
 const diffX=x-pointer.start[0],diffY=y-pointer.start[1];
 const moved=core.moveMasked(pointer.before,pointer.mask,diffX,diffY,region());
 put(new ImageData(moved.data,W,H));state.selection=moved.mask;draw();
}
function flip(axis){
 if(!state.selection)return;
 const before=image(),mask=state.selection.slice();
 const next=core.flipMasked(before,mask,axis,region());
 put(new ImageData(next.data,W,H));state.selection=next.mask;remember(before,mask);draw();
}
function nudge(dx,dy){
 if(!state.selection)return;
 const before=image(),mask=state.selection.slice();
 const next=core.moveMasked(before,mask,dx,dy,region());
 put(new ImageData(next.data,W,H));state.selection=next.mask;remember(before,mask);draw();
}
function cursorTap(){
 const [x,y]=state.cursor;
 if(state.tool==="move"&&state.cursorMove){
  const p=state.cursorMove;state.cursorMove=null;remember(p.before,p.mask);status("MOVE APPLIED");return;
 }
 if(!inside(x,y)){status("MOVE CURSOR INSIDE BLUE GUIDE BOX");return;}
 if(state.tool==="wand"){selectWand(x,y);return;}
 if(state.tool==="rect"){
  if(!state.selectionAnchor){
   state.selectionAnchor={start:[x,y],base:state.selection?.slice()||null,mode:state.mode};
   status("RECT: MOVE CURSOR TO END AND TAP AGAIN");draw();
  }else{
   const p=state.selectionAnchor;state.selectionAnchor=null;
   selectRect(core.selectionRect(...p.start,x,y,region()),p.base,p.mode);
  }return;
 }
 if(state.tool==="move"){
  if(!state.selection?.[y*W+x]){status("SELECT HELM/TAS PIXELS FIRST");return;}
  state.cursorMove={start:[x,y],before:image(),mask:state.selection.slice()};
  status("MOVE CURSOR TO POSITION, TAP AGAIN TO DROP");return;
 }
 if(state.tool==="pick"){const d=image().data,i=pidx(x,y);if(!d[i+3])return;
  state.color="#"+[d[i],d[i+1],d[i+2]].map(v=>v.toString(16).padStart(2,"0")).join("");
  $("acc-color").value=state.color;selectSwatch();return;}
 const before=image();
 if(state.tool==="fill"){
  const filled=image();
  core.flood(filled,x,y,[...state.color.match(/[0-9a-f]{2}/gi).map(v=>parseInt(v,16)),255],false,region());
  put(filled);
 }else if(state.tool==="pencil"||state.tool==="erase")strokePixel(x,y,state.tool==="erase");
 remember(before,null);draw();
}
function moveCursor(x,y){
 state.cursor=[clamp(x,0,W-1),clamp(y,0,H-1)];
 if(state.cursorMove)previewMove(state.cursorMove,...state.cursor);
 else draw();
 updateControls();
}
function point(e){const box=canvas.getBoundingClientRect();
 return [Math.floor((e.clientX-box.left)*W/box.width),Math.floor((e.clientY-box.top)*H/box.height)];}
function down(e){
 if(e.button!==0||e.isPrimary===false)return;
 canvas.setPointerCapture(e.pointerId);
 const coords=point(e);
 if(state.pan){state.pointer={id:e.pointerId,kind:"pan",x:e.clientX,y:e.clientY};e.preventDefault();return;}
 if(state.cursorMode){
  state.pointer={id:e.pointerId,kind:"trackpad",x:e.clientX,y:e.clientY,
   rx:0,ry:0,distance:0};e.preventDefault();return;
 }
 if(!inside(...coords))return;
 const [x,y]=coords;
 if(state.tool==="wand"){selectWand(x,y);return;}
 if(state.tool==="pick"){state.cursor=[x,y];cursorTap();return;}
 if(state.tool==="rect"){
  const p={id:e.pointerId,kind:"rect",start:[x,y],base:state.selection?.slice()||null,mode:state.mode};
  state.pointer=p;selectRect(core.selectionRect(x,y,x,y,region()),p.base,p.mode);return;
 }
 if(state.tool==="move"){
  if(!state.selection?.[y*W+x])return;
  state.pointer={id:e.pointerId,kind:"move",start:[x,y],before:image(),mask:state.selection.slice()};return;
 }
 const before=image();
 state.pointer={id:e.pointerId,kind:"paint",start:[x,y],last:[x,y],before};
 if(state.tool==="fill"){
  const filled=image();
  core.flood(filled,x,y,[...state.color.match(/[0-9a-f]{2}/gi).map(v=>parseInt(v,16)),255],false,region());
  put(filled);draw();state.pointer=null;remember(before,null);return;
 }
 strokePixel(x,y,state.tool==="erase");draw();
 e.preventDefault();
}
function move(e){
 const p=state.pointer;if(!p||p.id!==e.pointerId)return;
 if(p.kind==="pan"){
  area.scrollLeft+=p.x-e.clientX;area.scrollTop+=p.y-e.clientY;
  p.x=e.clientX;p.y=e.clientY;e.preventDefault();return;
 }
 if(p.kind==="trackpad"){
  const dx=e.clientX-p.x,dy=e.clientY-p.y;
  p.distance+=Math.hypot(dx,dy);p.rx+=dx/state.zoom;p.ry+=dy/state.zoom;
  const sx=Math.trunc(p.rx),sy=Math.trunc(p.ry);p.rx-=sx;p.ry-=sy;
  p.x=e.clientX;p.y=e.clientY;if(sx||sy)moveCursor(state.cursor[0]+sx,state.cursor[1]+sy);
  e.preventDefault();return;
 }
 const [x,y]=point(e);
 if(p.kind==="rect"){
  selectRect(core.selectionRect(...p.start,x,y,region()),p.base,p.mode);
 }else if(p.kind==="move"){previewMove(p,x,y);}
 else if(p.kind==="paint"&&inside(x,y)){
  strokeLine(x,y,...p.last);p.last=[x,y];
 }
 e.preventDefault();
}
function up(e){
 const p=state.pointer;
 if(!p||p.id!==e.pointerId)return;
 state.pointer=null;
 if(p.kind==="trackpad"){if(p.distance<6&&e.type!=="pointercancel")cursorTap();return;}
 if(p.kind==="paint"){
  if(e.type==="pointercancel")put(p.before);
  else remember(p.before,null);
 }else if(p.kind==="move"){
  if(e.type==="pointercancel"){put(p.before);state.selection=p.mask;}
  else remember(p.before,p.mask);
 }else if(p.kind==="rect"&&e.type==="pointercancel"){state.selection=p.base;}
 updateControls();draw();
}
function setCategory(category,skipHistory=false){
 if(!allowedKinds.includes(category))return;
 state.drafts[state.category]=state.layers;
 state.category=category;state.cursorMove=null;state.pointer=null;state.layers=state.drafts[category]||makeLayers();
 state.drafts[category]=state.layers;state.selection=null;state.selectionAnchor=null;
 if(!skipHistory){state.history=[];state.redo=[];state.savedId=null;}
 const r=region();state.cursor=[Math.floor((r[0]+r[2])/2),Math.floor((r[1]+r[3])/2)];
 updateControls();draw();draftSoon();
}
function setDirection(dir){
 if(!DIRS.includes(dir))return;
 state.dir=dir;resetMask();updateControls();draw();draftSoon();
}
let draftTimer=0;
function draftSoon(){
 clearTimeout(draftTimer);
 draftTimer=setTimeout(()=>{
  try{localStorage.setItem(DRAFT_KEY,JSON.stringify(Object.fromEntries(KINDS.map(k=>
   [k,Object.fromEntries(DIRS.map(d=>[d,state.drafts[k][d].toDataURL("image/png")]))]))));}
  catch(e){status("STORAGE FULL · EXPORT PNG SHEET");}
 },500);
}
async function restoreLayers(frames,category){
 if(!frames||typeof frames!=="object")return;
 const layers=makeLayers();
 for(const d of DIRS){
  const src=frames[d];
  if(typeof src!=="string"||!src.startsWith("data:image/png;base64,")||src.length>100000)continue;
  const img=new Image();
  try{
   await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=src;});
   if(img.naturalWidth===W&&img.naturalHeight===H)layers[d].getContext("2d").drawImage(img,0,0);
  }catch(e){/* Ignore malformed user-saved local draft */ }
 }
 state.drafts[category]=layers;
 if(category===state.category)state.layers=layers;
 updateControls();draw();
}
function allStorageItems(){
 const v=keysafeRead(STORE,[]);return Array.isArray(v)?v.filter(x=>x&&KINDS.includes(x.category)&&typeof x.id==="string"&&x.frames):[];
}
function storageItems(){return allStorageItems().filter(x=>(x.template_base||"astrofrich_base")===base&&allowedKinds.includes(x.category));}
function renderStorage(){
 const list=$("acc-list"),items=storageItems();list.replaceChildren();
 const empty=document.createElement("option");empty.value="";empty.textContent="— NEW ACCESSORY —";list.append(empty);
 for(const item of items){
  const opt=document.createElement("option");opt.value=item.id;opt.textContent=LABELS[item.category]+" / "+item.name;list.append(opt);
 }
 if(state.savedId&&items.some(x=>x.id===state.savedId))list.value=state.savedId;
 const attachments=keysafeRead(EQUIP,{})[actor]||{};
 $("acc-equipped").textContent="EQUIPPED ON "+actor.toUpperCase()+": "+
  KINDS.map(k=>LABELS[k]+" "+(items.find(x=>x.id===attachments[k])?.name||"—")).join(" · ");
}
function saveToStorage(){
 const missing=DIRS.filter(d=>!completedDirections().includes(d));
 if(missing.length){status("DRAW THE OTHER SIDES BEFORE SAVING: "+missing.map(x=>x.toUpperCase()).join(", "));return false;}
 const items=allStorageItems(),name=$("acc-name").value.trim().slice(0,44)||"CUSTOM "+currentCategory();
 if(!state.savedId)state.savedId="acc-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6);
 const asset={id:state.savedId,category:state.category,name,template_base:base,
  frames:Object.fromEntries(DIRS.map(d=>[d,state.layers[d].toDataURL("image/png")])),
  updated:Date.now(),size:[W,H],guide:base};
 const existing=items.findIndex(x=>x.id===asset.id);
 if(existing>=0)items[existing]=asset;else items.unshift(asset);
 if(items.length>100){status("STORAGE LIMIT: 100 ITEMS. DELETE OLD ASSETS.");return false;}
 try{localStorage.setItem(STORE,JSON.stringify(items));}
 catch(e){status("STORAGE FULL · EXPORT PNG SHEET");return false;}
 renderStorage();draftSoon();status("SAVED "+name+" · 4 DIRECTIONS / ACCESSORY ONLY");return true;
}
function equip(){
 if(!saveToStorage())return;
 const equipped=keysafeRead(EQUIP,{});
 equipped[actor]={...(equipped[actor]||{}),[state.category]:state.savedId};
 try{localStorage.setItem(EQUIP,JSON.stringify(equipped));}
 catch(e){status("CANNOT SAVE EQUIPMENT");return;}
 try{window.parent?.VirtualLifeAccessoryRefresh?.();}catch(e){/* standalone preview still works */ }
 renderStorage();status(currentCategory()+" ATTACHED TO "+actor.toUpperCase()+" · LOCAL PREVIEW");
}
function exportSheet(){
 const sheet=document.createElement("canvas");sheet.width=W*4;sheet.height=H;
 const c=sheet.getContext("2d");for(let i=0;i<4;i++)c.drawImage(state.layers[DIRS[i]],i*W,0);
 const a=document.createElement("a");a.download=(($("acc-name").value.trim()||state.category).replace(/[^a-z0-9_-]+/gi,"_"))+"_4view.png";
 a.href=sheet.toDataURL("image/png");document.body.append(a);a.click();a.remove();
 status("EXPORTED TRANSPARENT PNG SHEET · NO GUIDE");
}
function fitZoom(){
 if(state.manualZoom||!window.matchMedia("(max-width:900px)").matches)return;
 const value=clamp(Math.floor((area.clientWidth-36)/W),2,5);
 state.zoom=value;$("acc-zoom").value=String(value);draw();
}
function selectSwatch(){
 for(const b of $("acc-palette").children)b.classList.toggle("active",b.dataset.color===state.color);
}
function init(){
 for(const hex of COLORS){
  const b=document.createElement("button");b.type="button";b.dataset.color=hex;
  b.style.background=hex;b.title=hex;b.setAttribute("aria-label",hex);
  b.onclick=()=>{state.color=hex;$("acc-color").value=hex;selectSwatch();};
  $("acc-palette").append(b);
 }
 selectSwatch();
 for(const b of document.querySelectorAll("[data-acc-tool]"))b.onclick=()=>{
  if(state.cursorMove){put(state.cursorMove.before);state.selection=state.cursorMove.mask;state.cursorMove=null;}
  state.pointer=null;state.tool=b.dataset.accTool;state.pan=false;state.selectionAnchor=null;updateControls();draw();
 };
 for(const b of document.querySelectorAll("[data-acc-mode]"))b.onclick=()=>{state.mode=b.dataset.accMode;updateControls();};
 for(const b of document.querySelectorAll("[data-acc-dir]"))b.onclick=()=>setDirection(b.dataset.accDir);
 $("acc-helmet").onclick=()=>setCategory("helmet");
 $("acc-bag").onclick=()=>setCategory("bag");
 for(const kind of ["shirt","pants","shoes"])$("acc-"+kind).onclick=()=>setCategory(kind);
 for(const kind of KINDS)$("acc-"+kind).hidden=!allowedKinds.includes(kind);
 if(!allowedKinds.includes(state.category)){state.category=allowedKinds[0];state.layers=state.drafts[state.category];}
 $("acc-base-label").textContent=(human?"HUMAN / "+(base.includes("female")?"FEMALE":"MALE"):"ASTROFRICH")+" · 64×112";
 $("acc-guide-description").textContent=human?
  "HUMAN "+(base.includes("female")?"FEMALE":"MALE")+" / BALD BODY GUIDE. Draw BAJU, CELANA and SEPATU separately in 4 directions. Guide is not saved.":
  "ASTROFRICH / BALD + GLASSES. HELM and TAS use four independent guides; original body is not saved.";
 $("acc-pan").onclick=()=>{state.pointer=null;state.pan=!state.pan;updateControls();draw();};
 $("acc-cursor").onclick=()=>{state.pointer=null;state.cursorMode=!state.cursorMode;state.pan=false;updateControls();draw();};
 $("acc-apply").onclick=cursorTap;
 for(const [id,dx,dy] of [["acc-left",-1,0],["acc-right",1,0],["acc-up",0,-1],["acc-down",0,1]])
  $(id).onclick=()=>moveCursor(state.cursor[0]+dx,state.cursor[1]+dy);
 $("acc-flip-h").onclick=()=>flip("horizontal");$("acc-flip-v").onclick=()=>flip("vertical");
 $("acc-nudge-left").onclick=()=>nudge(-1,0);$("acc-nudge-right").onclick=()=>nudge(1,0);
 $("acc-clear-selection").onclick=()=>{state.selection=null;state.selectionAnchor=null;updateControls();draw();};
 $("acc-undo").onclick=()=>applyHistory(true);$("acc-redo").onclick=()=>applyHistory(false);
 $("acc-color").oninput=e=>{state.color=e.target.value;selectSwatch();};
 $("acc-brush").oninput=e=>{state.brush=Number(e.target.value);$("acc-brush-value").textContent=e.target.value;};
 $("acc-tolerance").oninput=e=>{state.tolerance=Number(e.target.value);$("acc-tolerance-value").textContent=e.target.value;};
 $("acc-connected").onchange=e=>{state.connected=e.target.checked;};
 $("acc-guide-alpha").oninput=e=>{state.alpha=Number(e.target.value)/100;$("acc-guide-value").textContent=e.target.value+"%";draw();};
 $("acc-grid").onchange=e=>{state.grid=e.target.checked;draw();};
 $("acc-zoom").onchange=e=>{state.manualZoom=true;state.zoom=Number(e.target.value);draw();};
 $("acc-save").onclick=saveToStorage;$("acc-equip").onclick=equip;
 $("acc-export").onclick=exportSheet;
 $("acc-new").onclick=()=>{
  if(!confirm("START A NEW BLANK "+currentCategory()+"? Your current draft will be reset. Saved accessories remain in storage."))return;
  state.layers=makeLayers();state.drafts[state.category]=state.layers;
  state.savedId=null;state.history=[];state.redo=[];state.selection=null;
  $("acc-name").value="";renderStorage();updateControls();draw();draftSoon();
 };
 $("acc-open").onclick=async()=>{
  const entry=storageItems().find(x=>x.id===$("acc-list").value);
  if(!entry)return;
  setCategory(entry.category);
  await restoreLayers(entry.frames,entry.category);
  state.savedId=entry.id;$("acc-name").value=entry.name;renderStorage();
  status("OPENED "+entry.name+" · 4 DIRECTIONS");
 };
 $("acc-remove").onclick=()=>{
  const id=$("acc-list").value;if(!id||!confirm("Delete this saved accessory?"))return;
  localStorage.setItem(STORE,JSON.stringify(allStorageItems().filter(x=>x.id!==id)));
  if(state.savedId===id)state.savedId=null;
  const equipment=keysafeRead(EQUIP,{});
  for(const slots of Object.values(equipment))for(const category of KINDS)if(slots?.[category]===id)delete slots[category];
  localStorage.setItem(EQUIP,JSON.stringify(equipment));
  try{window.parent?.VirtualLifeAccessoryRefresh?.();}catch(e){}
  renderStorage();status("DELETED ACCESSORY FROM LOCAL STORAGE");
 };
 canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointermove",move);
 canvas.addEventListener("pointerup",up);canvas.addEventListener("pointercancel",up);
 window.addEventListener("resize",fitZoom);
 window.addEventListener("pagehide",()=>{clearTimeout(draftTimer);try{
  localStorage.setItem(DRAFT_KEY,JSON.stringify(Object.fromEntries(KINDS.map(k=>[k,
   Object.fromEntries(DIRS.map(d=>[d,state.drafts[k][d].toDataURL("image/png")]))]))));
 }catch(e){}});
 guide.onload=()=>{if(guide.naturalWidth!==256||guide.naturalHeight!==112){status("GUIDE DIMENSIONS MISMATCH");return;}
  guideState.loaded=true;state.loaded=true;status("BASE GUIDE READY · "+base.toUpperCase()+" / SE SW NE NW");draw();};
 guide.onerror=()=>status("COULD NOT LOAD THEODORE GUIDE / CHECK SITE BUILD");
 const guideUrl=human?"./media/human-"+(base.includes("female")?"female":"male")+"-base-guide.png":
  "./media/theodore-accessory-fitting-guide.png";
 const fresh=params.get("build")||"";
 guide.src=guideUrl+(fresh?"?build="+encodeURIComponent(fresh):"");
 for(const [kind,frames] of Object.entries(keysafeRead(DRAFT_KEY,base==="astrofrich_base"?keysafeRead(DRAFT,{}):{})))
  if(allowedKinds.includes(kind))restoreLayers(frames,kind);
 renderStorage();updateControls();fitZoom();draw();
}
window.VirtualLifeAccessoryEditor={flush(){
 clearTimeout(draftTimer);
 localStorage.setItem(DRAFT_KEY,JSON.stringify(Object.fromEntries(KINDS.map(k=>[k,
  Object.fromEntries(DIRS.map(d=>[d,state.drafts[k][d].toDataURL("image/png")]))]))));
}};
init();
})();
