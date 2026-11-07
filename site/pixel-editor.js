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
const CLIP_KEY="mh2-rgba-clipboard-v1";
const LAST_CH_KEY="v6p-studio-last-ch";
const clamp=(n,a,b)=>Math.min(b,Math.max(a,Math.round(Number(n)||0)));
const MOBILE_TOUCH=window.matchMedia("(max-width:680px) and (pointer:coarse)").matches;
const panGesture={id:null,lastX:0,lastY:0};
const OLD_LOCAL="virtual-life-otis-pixel-draft-v1";
const display=$("pixel-canvas"),dc=display.getContext("2d",{alpha:false});
const mini=$("small-preview"),mc=mini.getContext("2d");
const renderCanvas=document.createElement("canvas");renderCanvas.width=WIDTH;renderCanvas.height=HEIGHT;
const rc=renderCanvas.getContext("2d",{willReadFrequently:true});
dc.imageSmoothingEnabled=false;mc.imageSmoothingEnabled=false;
const state={pack:null,clips:[],action:"idle",dir:"se",frame:0,mode:"master",part:"head",source:"otis",v6pPart:null,v6pSheet:null,masterDiff:new Map(),syncPromise:Promise.resolve(),syncing:false,
 tool:"pencil",panMode:false,color:"#61b3c4",brush:1,zoom:MOBILE_TOUCH?4:8,grid:false,
 originals:new Map(),edits:new Map(),imageRequests:new Map(),history:[],redo:[],
 current:null,loading:true,drawing:false,previous:null,before:null,seq:0,
 selection:null,selectionMask:null,selectionMode:"replace",wandContiguous:true,wandTolerance:0,selectionGesture:null,moveGesture:null,cursorMode:MOBILE_TOUCH,cursor:[32,42],
 trackpad:null,touchSelectAnchor:null,touchMoveAnchor:null,characterId:"",masterMode:false,
 clipboard:null,floatingPaste:null,project:null,actClip:null,clipLayer:null,onion:true,onionImage:null,playing:false,playTimer:0,clipUndo:[],clipRedo:[],overlayOn:true,overlayAlpha:0.42,overlayCanvas:null,showPivot:true};
let emosiEditor=null;
function status(s,error=false){$("editor-status").textContent=s;$("editor-status").classList.toggle("error",error);}
function activeClip(){if(state.actClip)return {id:state.actClip.id,name:state.actClip.name,frames:state.actClip.frames.length};return state.clips.find(c=>c.id===state.action);}
function currentKey(){return state.source==="v6p"?state.action+"|"+state.dir+"|"+state.frame:core.key(state.action,state.dir,state.frame);}
function frameCount(){return activeClip()?.frames||1;}
function copy(data){return new ImageData(new Uint8ClampedArray(data.data),WIDTH,HEIGHT);}
function identical(a,b){if(!a||!b)return false;const x=a.data,y=b.data;if(x.length!==y.length)return false;for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true;}
function snapshot(){return state.current?copy(state.current):null;}
function editable(x,y){return state.source==="v6p"?Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<WIDTH&&y>=0&&y<HEIGHT:parts.contains(state.part,x,y);}
function selectedRegion(){return state.source==="v6p"?[0,0,WIDTH,HEIGHT]:parts.PARTS[state.part].box;}
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
 if(state.source==="v6p"){
  if(!state.v6pSheet)throw Error("v6p sheet not loaded");
  let data;
  if(state.actClip){
   const o=window.V6PActivityContract.cellOrigin(state.actClip.bandStart||0,dir,index);
   data=window.V6PPixelSource.extractAt(state.v6pSheet,o.x,o.y,o.w,o.h);
  }else data=window.V6PPixelSource.extract(state.v6pSheet,clip.id,dir,index);
  state.originals.set(key,copy(data));return state.originals.get(key);
 }
 const img=await imageFor(clip.atlas);
 if(img.naturalWidth!==clip.columns*WIDTH||img.naturalHeight!==clip.rows*HEIGHT)
   throw Error("Atlas dimensions do not match the original 64×112 source");
 rc.clearRect(0,0,WIDTH,HEIGHT);
 rc.drawImage(img,index*WIDTH,(clip.row_start+DIRECTIONS.indexOf(dir))*HEIGHT,WIDTH,HEIGHT,0,0,WIDTH,HEIGHT);
 const data=rc.getImageData(0,0,WIDTH,HEIGHT);
 state.originals.set(key,copy(data));
 return state.originals.get(key);
}
function previewCh(){
 return lastStudioCharacter()||(window.V6PCompositor?window.V6PCompositor.norm(window.V6PCompositor.DEF):null);
}
function fileToDisplay(img){
 if(state.source!=="v6p"||!img||!window.V6PCompositor||!window.V6PCompositor.keysToDisplay) return img;
 const ch=previewCh(); return ch?window.V6PCompositor.keysToDisplay(img,ch):img;
}
function displayToFile(img){
 if(state.source!=="v6p"||!img||!window.V6PCompositor||!window.V6PCompositor.displayToKeys) return img;
 const ch=previewCh(); return ch?window.V6PCompositor.displayToKeys(img,ch,state.originals.get(currentKey())):img;
}
function saveCurrent(){
 pullEmosiIntoState();
 if(!state.current)return;
 const key=currentKey(),original=state.originals.get(key);
 const stored=displayToFile(state.current);
 const changed=!original||!identical(stored,original);
 if(original&&identical(stored,original))state.edits.delete(key);
 else state.edits.set(key,copy(stored));
 if(state.source==="v6p"&&state.v6pSheet&&window.V6PPixelSource){
  if(state.actClip){
   const o=window.V6PActivityContract.cellOrigin(state.actClip.bandStart||0,state.dir,state.frame);
   window.V6PPixelSource.stampAt(state.v6pSheet,o.x,o.y,stored);
   persistClipLayer();
  }else{
   window.V6PPixelSource.stamp(state.v6pSheet,state.action,state.dir,state.frame,stored);
   if(changed&&state.characterId&&state.v6pPart&&window.V6PCharacterStore){
    try{
     if(state.masterMode){
      const cv=document.createElement("canvas");cv.width=WIDTH;cv.height=HEIGHT;
      cv.getContext("2d").putImageData(stored,0,0);
      window.V6PCharacterStore.setMaster(state.characterId,state.v6pPart,state.dir,cv.toDataURL("image/png"));
     }else window.V6PCharacterStore.markCorrection(state.characterId,state.v6pPart,state.action,state.dir,state.frame);
    }catch(error){status("CHARACTER FRAME SAVE ERROR: "+error.message,true)}
   }
   persistV6pOverride();
  }
 }
 updateCounts();scheduleSave();
}
async function navigate(){
 const seq=++state.seq,clip=activeClip();if(!clip)return;
 state.loading=true;state.current=null;state.selection=null;state.selectionMask=null;state.touchSelectAnchor=null;state.touchMoveAnchor=null;
 updateSelectionUI();
 $("frame").max=String(clip.frames-1);$("frame").value=String(state.frame);
 $("frame-label").textContent="FRAME "+(state.frame+1)+" / "+clip.frames;
 $("canvas-title").textContent=(state.source==="v6p"?(state.actClip?("CLIP / "+state.actClip.name+" / "+state.clipLayer):("V6P / "+state.v6pPart)):"OTIS")+" / "+(state.actClip?state.dir.toUpperCase():clip.id.toUpperCase()+" / "+state.dir.toUpperCase())+" / F"+state.frame;
 status("READING "+clip.id.toUpperCase()+" / "+state.dir.toUpperCase()+" / "+state.frame+"...");
 try{
  const key=currentKey(),original=await originalFor(key,clip,state.dir,state.frame);
  if(seq!==state.seq)return;
  state.current=fileToDisplay(copy(state.edits.get(key)||original));
  state.onionImage=null;
  if(state.actClip&&state.onion&&state.frame>0){
   const prev=window.V6PActivityContract.cellOrigin(state.actClip.bandStart||0,state.dir,state.frame-1);
   state.onionImage=fileToDisplay(window.V6PPixelSource.extractAt(state.v6pSheet,prev.x,prev.y,prev.w,prev.h));
  }
  state.loading=false;updateSelectionUI();await refreshOverlay();render();
  if(state.actClip){fillClipStrip();refreshMFPreview();}
  await syncEmosiOpen();
  status("EDITING ORIGINAL PIXELS / "+key+" / DRAFT NOT PUBLISHED");
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
 if(state.source==="v6p")return;
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
 if($("autofit-outfit")) $("autofit-outfit").hidden=true; // Generation is in Character Editor
 const isMaster=(state.mode==="master"&&state.source!=="v6p")||state.masterMode;
 $("action").disabled=isMaster;$("frame").disabled=isMaster;
 $("prev-frame").disabled=isMaster;$("next-frame").disabled=isMaster;
 if($("part"))$("part").disabled=state.source==="v6p";
 if($("edit-mode"))$("edit-mode").disabled=state.source==="v6p";
 if($("v6p-part-wrap"))$("v6p-part-wrap").hidden=state.source!=="v6p"||!!state.project||!!state.actClip;
 if($("v6p-project-wrap"))$("v6p-project-wrap").hidden=state.source!=="v6p"||!(state.project||state.actClip);
 if($("accessory-place-wrap"))$("accessory-place-wrap").hidden=!(state.project&&state.project.type==="accessory");
 if($("clip-actions"))$("clip-actions").hidden=!state.actClip;
 if($("action"))$("action").disabled=isMaster||!!state.actClip;
 $("part-bounds").textContent=state.source==="v6p"?
   ((state.actClip?("CLIP "+state.actClip.name+" / "+state.clipLayer):state.project?state.project.name:state.v6pPart)+" / 64x112 CELL / FULL FRAME EDITABLE"):
   (state.part.toUpperCase()+" / "+parts.PARTS[state.part].box.join(",")+" / EDIT REGION");
 $("master-status").textContent=state.source==="v6p"?
   (state.actClip?
    "CLIP: timeline frame-by-frame di sheet activity 384×2688. Tambah/duplikat/hapus/urutkan frame, atur ms, play di prediksi Male/Female. Copy/paste antar frame. Stock 44-row tidak diubah.":
    state.project?(state.project.type==="accessory"?
    "AKSESORIS: layer transparan 384×4928. Overlay karakter terkunci dan tidak pernah digabung ke export. Copy/paste antar frame dan arah. Hanya frame yang dilukis yang ikut animasi.":
    "CUSTOM CLIP: sheet 384×4928 yang kamu lukis sendiri. Bukan auto-animasi. Copy/paste frame. Kompatibilitas Semesta tercatat eksplisit di gallery."):
    (state.masterMode?"CHARACTER MASTER: Draw four directions on IDLE FRAME 1. Return to Character and GENERATE ALL ANIMATIONS.":"CHARACTER FIX: Edit pose frame; correction kept per-character.")):
   (isMaster?"MASTER: DRAW ON IDLE F0; ALL ORIGINAL ACTION FRAMES IN THIS DIRECTION INHERIT PIXEL DELTAS.":
   "FRAME: FIX SPECIFIC POSES / AUTOSAVE TO THIS BROWSER.");
 render();
}
function persistV6pOverride(){
 if(state.source!=="v6p"||!state.v6pSheet||!window.V6PPixelSource)return;
 try{
  if(state.actClip){persistClipLayer();persistClipManifest();return;}
  if(state.project&&window.V6PProjectCatalog){
   persistProjectSheet();
   return;
  }
  if(!state.v6pPart)return;
  const dataUrl=window.V6PPixelSource.toDataURL(state.v6pSheet);
  if(state.characterId&&window.V6PCharacterStore){
   window.V6PCharacterStore.setPart(state.characterId,state.v6pPart,dataUrl);
   if($("drive-status"))$("drive-status").textContent="Saved for CHARACTER "+state.characterId+" only · backup via MAHLUK.EXE";
   return;
  }
  if(!window.V6PPartOverrides)return;
  window.V6PPartOverrides.set(state.v6pPart,dataUrl,{width:384,height:4928});
  if($("drive-status"))$("drive-status").textContent="Override lokal tersimpan untuk "+state.v6pPart+" · klik Muat ulang aset di studio, atau Save ke Drive.";
 }catch(e){status("OVERRIDE SAVE FAILED: "+e.message,true);}
}
/* Approximate palette transfer across native pose silhouettes; this is not a rig. */
async function autoFitCurrentDirection(){
 if(!state.characterId||!state.v6pPart||state.actClip||state.project)return status("Auto-fit needs character-local part",true);
 if(state.loading||!state.current)return;
 if(!confirm("Auto-fit current part to every animation in "+state.dir.toUpperCase()+"? Local edits in other frames of this direction may change."))return;
 saveCurrent();
 const C=window.V6PPartCatalog,S=window.V6PPixelSource;
 const stock=await S.loadSheet(state.v6pPart);
 const orig=S.extract(stock,state.action,state.dir,state.frame).data;
 const edited=S.extract(state.v6pSheet,state.action,state.dir,state.frame).data;
 const palette=new Map();
 for(let p=0;p<orig.length;p+=4){
  if(!orig[p+3]||!edited[p+3])continue;
  const from=(orig[p]<<16)|(orig[p+1]<<8)|orig[p+2],to=(edited[p]<<16)|(edited[p+1]<<8)|edited[p+2];
  if(from===to)continue;
  let votes=palette.get(from);if(!votes){votes=new Map();palette.set(from,votes)}
  votes.set(to,(votes.get(to)||0)+1);
 }
 const changes=new Map();
 for(const [from,votes] of palette){changes.set(from,[...votes.entries()].sort((a,b)=>b[1]-a[1])[0][0]);}
 if(!changes.size){status("No palette correspondence found. Silhouette changes require manual pixel edits.",true);return;}
 let count=0;
 for(const action of C.ACTIONS)for(let frame=0;frame<C.FRAMES[action];frame++){
  if(action===state.action&&frame===state.frame)continue;
  const cell=S.extract(state.v6pSheet,action,state.dir,frame),pixels=cell.data;
  for(let p=0;p<pixels.length;p+=4){
   if(!pixels[p+3])continue;
   const from=(pixels[p]<<16)|(pixels[p+1]<<8)|pixels[p+2],color=changes.get(from);
   if(color==null)continue;
   pixels[p]=(color>>16)&255;pixels[p+1]=(color>>8)&255;pixels[p+2]=color&255;
  }
  S.stamp(state.v6pSheet,action,state.dir,frame,cell);count++;
 }
 persistV6pOverride();state.originals.clear();state.edits.clear();
 await setFrame(state.action,state.dir,state.frame);
 status("AUTO-FIT "+count+" frames / "+state.dir.toUpperCase()+" · colors transferred, native shape retained. Check poses and correct geometry manually.");
}
function paintedActionsOf(sheet){
 const C=window.V6PPartCatalog; if(!C||!sheet)return [];
 const d=sheet.getContext("2d",{willReadFrequently:true}).getImageData(0,0,C.W,C.H).data;
 const hit={};
 for(const action of C.ACTIONS){
  const nf=C.FRAMES[action],y0=C.ROWS[action]*C.FH,y1=y0+4*C.FH,x1=nf*C.FW;
  scan:for(let y=y0;y<y1;y++)for(let x=0;x<x1;x++)if(d[(y*C.W+x)*4+3]>0){hit[action]=true;break scan;}
 }
 return C.ACTIONS.filter(a=>hit[a]);
}
function projectThumb(sheet){
 const C=window.V6PPartCatalog; if(!C||!sheet)return "";
 const cv=document.createElement("canvas");cv.width=C.FW;cv.height=C.FH;
 const ctx=cv.getContext("2d");ctx.imageSmoothingEnabled=false;
 try{
  const o=C.cellOrigin("idle","se",0);
  ctx.drawImage(sheet,o.x,o.y,o.w,o.h,0,0,C.FW,C.FH);
 }catch{ctx.drawImage(sheet,0,0,C.FW,C.FH,0,0,C.FW,C.FH);}
 return cv.toDataURL("image/png");
}
function persistProjectSheet(){
 if(!state.project||!state.v6pSheet||!window.V6PProjectCatalog)return;
 const dataUrl=window.V6PPixelSource.toDataURL(state.v6pSheet);
 const painted=paintedActionsOf(state.v6pSheet);
 const item=window.V6PProjectCatalog.saveSheet(state.project.id,dataUrl,{
  thumbDataUrl:projectThumb(state.v6pSheet),paintedActions:painted,saveStatus:state.project.saveStatus==="drive"?"drive":"local"
 });
 state.project=item;
 if($("drive-status"))$("drive-status").textContent="Proyek lokal tersimpan: "+item.name+" · muncul di Asset Gallery · stock tidak ditimpa.";
}
function fillProjectSelect(){
 const sel=$("v6p-project"); if(!sel)return;
 if(state.actClip&&window.V6PClipStore){
  sel.innerHTML="";
  for(const item of window.V6PClipStore.list()){
   const o=document.createElement("option");o.value=item.id;o.textContent=item.name+(item.origin==="pilot"?" [pilot]":"");
   sel.append(o);
  }
  sel.value=state.actClip.id;return;
 }
 if(!window.V6PProjectCatalog)return;
 const type=state.project?state.project.type:($("source-kind")&&$("source-kind").value);
 const want=type==="clip"?"clip":"accessory";
 sel.innerHTML="";
 for(const item of window.V6PProjectCatalog.list().filter(it=>it.type===want)){
  const o=document.createElement("option");o.value=item.id;o.textContent=item.name+(item.placement?" ["+item.placement+"]":"");
  sel.append(o);
 }
 if(state.project)sel.value=state.project.id;
}
async function loadProject(id,params){
 const Cat=window.V6PProjectCatalog,S=window.V6PPixelSource,C=window.V6PPartCatalog;
 if(!Cat||!S||!C)throw Error("project helpers not loaded");
 const item=Cat.get(id); if(!item)throw Error("Unknown project "+id);
 state.loading=true;state.current=null;
 state.source="v6p";state.project=item;state.v6pPart=null;state.actClip=null;state.clipLayer=null;state.mode="frame";
 if($("edit-mode"))$("edit-mode").value="frame";
 if($("source-kind"))$("source-kind").value=item.type;
 if($("accessory-place"))$("accessory-place").value=item.placement||"front";
 fillProjectSelect();
 if(item.sheetDataUrl) state.v6pSheet=await S.loadSheetFromUrl(item.sheetDataUrl);
 else state.v6pSheet=S.blankSheet();
 state.clips=C.clips();
 state.originals=new Map();state.edits=new Map();state.history=[];state.redo=[];
 fillV6pActions();
 const action=state.masterMode?"idle":(params&&params.get("action"))||"idle";
 state.action=C.ACTIONS.includes(action)?action:"idle";
 const dir=(params&&params.get("dir"))||"se";
 state.dir=C.DIRS.includes(dir)?dir:"se";
 const frame=state.masterMode?0:Number(params&&params.get("frame")||0);
 state.frame=Number.isInteger(frame)?frame:0;
 $("action").value=state.action;$("direction").value=state.dir;
 modeUI();historyButtons();updateCounts();
 await setFrame(state.action,state.dir,state.frame);
 $("source-state").textContent="PROJECT / "+item.type.toUpperCase()+" / "+item.name;
 status("EDITING "+item.type.toUpperCase()+" / "+item.name+" / overlay locked · not exported");
}
function createUserProject(type){
 const fallback=type==="accessory"?"Aksesoris baru":"Clip baru";
 const name=window.prompt(type==="accessory"?"Nama aksesoris baru:":"Nama custom clip:",fallback);
 if(!name)return null;
 let placement="front";
 if(type==="accessory"){
  const raw=window.prompt("Posisi Z: front (di atas rambut, seperti kacamata) atau back (di belakang tubuh, seperti hair_back)","front");
  placement=String(raw||"front").toLowerCase()==="back"?"back":"front";
 }
 return window.V6PProjectCatalog.create({type,name,placement:type==="accessory"?placement:null});
}
function lastStudioCharacter(){
 try{
  const raw=JSON.parse(localStorage.getItem(LAST_CH_KEY)||"null");
  if(raw&&window.V6PCompositor) return window.V6PCompositor.norm(raw);
 }catch{}
 return window.V6PCompositor?window.V6PCompositor.norm(window.V6PCompositor.DEF):null;
}
async function refreshOverlay(){
 const box=$("overlay-actions");
 const show=state.source==="v6p"&&(!!state.project||!!state.actClip)&&!!window.V6PCompositor;
 if(box)box.hidden=!show;
 if(!show){state.overlayCanvas=null;return;}
 try{
  let ch=lastStudioCharacter();
  if(!ch)return;
  if(state.actClip){
   const avail=window.V6PCompositor.activityAvailability(ch,state.actClip);
   if(!avail.ok) ch=window.V6PCompositor.previewAppearance(ch.body==="female"?"female":"male");
   const cv=await window.V6PCompositor.composeActivity(ch,state.actClip,state.frame,state.dir,{exclude:state.clipLayer});
   state.overlayCanvas=(cv&&!cv._disabled)?cv:null;
   if($("overlay-info"))$("overlay-info").textContent="Acuan CLIP "+state.actClip.name+" / "+state.dir.toUpperCase()+" / F"+state.frame+" · opacity "+Math.round(state.overlayAlpha*100)+"% · tidak ikut PNG";
   return;
  }
  if(state.project&&state.project.type==="accessory")
   ch={...ch,accessories:(ch.accessories||[]).filter(id=>id!==state.project.id)};
  const sheet=await window.V6PCompositor.sheet(ch);
  if(!sheet){state.overlayCanvas=null;if($("overlay-info"))$("overlay-info").textContent="Overlay gagal dimuat (aset karakter kurang)";return;}
  state.overlayCanvas=window.V6PCompositor.extractFrame(sheet,state.action,state.dir,state.frame);
  if($("overlay-info"))$("overlay-info").textContent="Acuan "+state.action.toUpperCase()+" / "+state.dir.toUpperCase()+" / F"+state.frame+" · opacity "+Math.round(state.overlayAlpha*100)+"% · tidak ikut PNG";
 }catch(e){state.overlayCanvas=null;}
}
function fillV6pActions(){
 const sel=$("action");sel.innerHTML="";
 for(const clip of state.clips){const o=document.createElement("option");o.value=clip.id;o.textContent=clip.name+" ("+clip.frames+" FRAMES)";sel.append(o);}
}
function fillV6pPartSelect(){
 const sel=$("v6p-part");if(!sel||!window.V6PPartCatalog)return;
 sel.innerHTML="";
 for(const part of window.V6PPartCatalog.PARTS){const o=document.createElement("option");o.value=part;o.textContent=part;sel.append(o);}
 if(state.v6pPart)sel.value=state.v6pPart;
}
async function sha256Hex(buf){
 const hash=await crypto.subtle.digest("SHA-256",buf);
 return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function loadV6pPart(part,params){
 const C=window.V6PPartCatalog,S=window.V6PPixelSource,O=window.V6PPartOverrides;
 if(!C||!S)throw Error("v6p source helpers not loaded");
 part=C.normalizePart(part);
 state.loading=true;state.current=null;
 state.source="v6p";state.project=null;state.actClip=null;state.clipLayer=null;state.v6pPart=part;state.mode="frame";
 if($("edit-mode"))$("edit-mode").value="frame";
 if($("source-kind"))$("source-kind").value="v6p";
 fillV6pPartSelect();
 const scoped=state.characterId&&window.V6PCharacterStore?.getPart(state.characterId,part);
 const row=scoped?{dataUrl:scoped}:O&&O.get(part);
 state.v6pSheet=await S.loadSheet(part,row&&row.dataUrl);
 state.clips=C.clips();
 state.originals=new Map();state.edits=new Map();state.history=[];state.redo=[];
 fillV6pActions();
 const action=(params&&params.get("action"))||"idle";
 state.action=C.ACTIONS.includes(action)?action:"idle";
 const dir=(params&&params.get("dir"))||"se";
 state.dir=C.DIRS.includes(dir)?dir:"se";
 const frame=Number(params&&params.get("frame")||0);
 state.frame=Number.isInteger(frame)?frame:0;
 $("action").value=state.action;$("direction").value=state.dir;
 if($("v6p-part"))$("v6p-part").value=part;
 modeUI();historyButtons();updateCounts();
 await setFrame(state.action,state.dir,state.frame);
 $("source-state").textContent="V6P / "+part+(state.characterId?" / CHAR "+state.characterId:row?" / LOCAL OVERRIDE":" / MEDIA SHEET");
 status("EDITING V6P PART / "+part+" / override "+(row?"ON":"off"));
}
async function downloadV6pSheet(){
 if(state.source!=="v6p"||!state.v6pSheet){status("Buka sumber V6P PART dulu",true);return;}
 if(!state.loading)saveCurrent();
 const name=state.actClip?("v6p-act--"+state.actClip.id+"__"+String(state.clipLayer||"layer").replaceAll("/","_")+".png"):state.project?("v6p-user--"+state.project.type+"__"+state.project.id+".png"):window.V6PPartCatalog.filename(state.v6pPart);
 state.v6pSheet.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  status("DOWNLOADED "+name);},"image/png");
}
async function saveV6pToDrive(){
 if(state.characterId){status("Character-local sheet. Save in Character Studio and BACKUP from MAHLUK.EXE; cannot overwrite shared stock on Drive.",true);return;}
 const el=$("drive-status");
 try{
  if(el)el.textContent="Menyambungkan Google Drive…";
  if(state.source!=="v6p"||!state.v6pSheet)throw Error("Buka part v6p dulu");
  if(!state.loading)saveCurrent();
  persistV6pOverride();
  if(state.actClip){
   if(el)el.textContent="Clip tersimpan lokal (manifest + layer 384×2688). Drive ingest belum untuk activity sheet.";
   status("CLIP SAVED LOCALLY / "+state.actClip.name);
   return;
  }
  if(state.project){
   const C=window.V6PPartCatalog,S=window.V6PPixelSource,D=window.MembangunCloudDrive;
   if(!D||!D.saveV6pUserProject)throw Error("Drive helper belum termuat");
   if(!S.hasAlpha(state.v6pSheet))throw Error("Sheet alpha kosong / lukis dulu");
   if(state.v6pSheet.width!==C.W||state.v6pSheet.height!==C.H)throw Error("Sheet harus 384×4928");
   const blob=await new Promise((res,rej)=>state.v6pSheet.toBlob(b=>b?res(b):rej(Error("PNG encode failed")),"image/png"));
   const sha=await sha256Hex(await blob.arrayBuffer());
   const jsonText=JSON.stringify({format:"virtual-life-v6p-project-patch-v1",type:state.project.type,id:state.project.id,name:state.project.name,placement:state.project.placement,frames:S.patchObject?undefined:[]},null,2)+"\n";
   if(el)el.textContent="Mengunggah proyek pengguna ke Drive…";
   const result=await D.saveV6pUserProject({type:state.project.type,id:state.project.id,png:blob,sha256:sha,width:C.W,height:C.H,jsonText});
   window.V6PProjectCatalog.markDrive(state.project.id,{filename:result.filename,sha256:sha});
   state.project=window.V6PProjectCatalog.get(state.project.id);
   if(el)el.textContent=result.status+" · "+result.filename;
   status(result.status);
   return;
  }
  if(el)el.textContent="Menyambungkan Google Drive…";
  const C=window.V6PPartCatalog,S=window.V6PPixelSource,D=window.MembangunCloudDrive;
  if(!D)throw Error("Drive helper belum termuat");
  if(!S.hasAlpha(state.v6pSheet))throw Error("Sheet alpha kosong / tidak valid");
  if(state.v6pSheet.width!==C.W||state.v6pSheet.height!==C.H)throw Error("Sheet harus 384×4928");
  const blob=await new Promise((res,rej)=>state.v6pSheet.toBlob(b=>b?res(b):rej(Error("PNG encode failed")),"image/png"));
  const sha=await sha256Hex(await blob.arrayBuffer());
  const jsonText=JSON.stringify(S.patchObject(state.v6pPart,state.edits,toPNG),null,2)+"\n";
  if(el)el.textContent="Mengunggah ke Drive…";
  const result=await D.saveV6pPart({part:state.v6pPart,png:blob,sha256:sha,width:C.W,height:C.H,jsonText});
  if(el)el.textContent=result.status+" · "+result.filename;
  status(result.status);
 }catch(e){
  const msg=e&&e.message||String(e);
  if(el)el.textContent="Drive gagal: "+msg;
  status("DRIVE SAVE FAILED: "+msg,true);
 }
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
function commit(before,selectionBefore=undefined,maskBefore=undefined){
 if(!before||!state.current||identical(before,state.current))return;
 state.history.push({key:currentKey(),before,after:snapshot(),selectionBefore,
  selectionAfter:selectionBefore===undefined?undefined:(state.selection?state.selection.slice():null),
  maskBefore:maskBefore===undefined?undefined:(maskBefore?maskBefore.slice():null),
  maskAfter:maskBefore===undefined?undefined:(state.selectionMask?state.selectionMask.slice():null)});
 if(state.history.length>40)state.history.shift();
 state.redo=[];saveCurrent();render();historyButtons();if(state.mode==="master")queueMasterSync();
}


function selectedPixel(x,y){
 return Boolean(state.selectionMask&&x>=0&&x<WIDTH&&y>=0&&y<HEIGHT&&state.selectionMask[y*WIDTH+x]);
}
function activeSelectionMode(e){return e?.altKey?"subtract":e?.shiftKey?"add":state.selectionMode;}
function setSelectionMask(mask){
 state.selectionMask=mask&&core.maskCount(mask)?mask.slice():null;
 state.selection=state.selectionMask?core.maskBounds(state.selectionMask):null;
 updateSelectionUI();render();
}
function applySelection(incoming,mode=state.selectionMode,base=state.selectionMask){
 setSelectionMask(core.combineMasks(base,incoming,mode));
}
function setSelection(box,base=state.selectionMask,mode=state.selectionMode){
 if(!box){setSelectionMask(null);return;}
 applySelection(core.maskRect(box,selectedRegion()),mode,base);
}
function colorSelection(x,y,mode=state.selectionMode){
 if(!state.current||state.loading||state.syncing||!editable(x,y))return;
 const mask=core.wandMask(state.current,x,y,selectedRegion(),state.wandTolerance,state.wandContiguous);
 applySelection(mask,mode);
 status("WAND · "+core.maskCount(mask)+" COLOR PIXELS · "+mode.toUpperCase()+" · "+(state.wandContiguous?"CONNECTED":"ALL MATCHES"));
}
function updateSelectionUI(){
 const b=state.selection,active=Boolean(b)&&!state.loading&&!state.syncing;
 $("selection-info").textContent=b?
  "SELECT "+core.maskCount(state.selectionMask)+" PX · "+(b[2]-b[0])+"×"+(b[3]-b[1])+" BOUNDS":
  "NO SELECTION · RECT OR WAND";
 for(const id of ["flip-horizontal","flip-vertical","deselect","nudge-left","nudge-up","nudge-down","nudge-right"])
  if($(id)) $(id).disabled=!active;
 if($("cut-selection")) $("cut-selection").disabled=!active;
 if($("copy-selection")) $("copy-selection").disabled=state.loading||!state.current;
 if($("select-all")) $("select-all").disabled=state.loading||!state.current;
 updateClipboardUI();
 for(const button of document.querySelectorAll("[data-select-mode]")){
  const on=button.dataset.selectMode===state.selectionMode;
  button.classList.toggle("active",on);button.setAttribute("aria-pressed",String(on));
 }
}
function currentClipboard(){
 const S=window.MH2PixelSelection; if(!S)return null;
 let saved=null;
 try{
  const raw=JSON.parse(localStorage.getItem(CLIP_KEY));
  if(S.validStamp(raw,WIDTH,HEIGHT)) saved={...raw,pixels:new Uint8ClampedArray(raw.pixels)};
 }catch{}
 const memory=state.clipboard&&S.validStamp(state.clipboard,WIDTH,HEIGHT)?state.clipboard:null;
 if(memory&&(!saved||(Number(memory.copiedAt)||0)>=(Number(saved.copiedAt)||0))) return memory;
 return saved;
}
function updateClipboardUI(){
 const stamp=currentClipboard();
 const has=!!stamp;
 if($("paste-selection")) $("paste-selection").disabled=!has||state.loading||!state.current;
 if($("paste-flip")) $("paste-flip").disabled=!has||state.loading||!state.current;
 if(!$("clipboard-info"))return;
 if(!has){$("clipboard-info").textContent="CLIPBOARD EMPTY · SELECT + COPY (CTRL+C)";return;}
 const vis=stamp.pixels.some((v,i)=>i%4===3&&v>0);
 $("clipboard-info").textContent=vis?
  "CLIPBOARD "+stamp.w+"×"+stamp.h+" PX · PASTE ON ANY FRAME / DIRECTION":
  "COPIED EMPTY REGION · SELECT DRAWING THEN COPY";
}
function selectionRectForCopy(){
 if(state.selection) return {x:state.selection[0],y:state.selection[1],w:state.selection[2]-state.selection[0],h:state.selection[3]-state.selection[1]};
 const b=selectedRegion(); return {x:b[0],y:b[1],w:b[2]-b[0],h:b[3]-b[1]};
}
function setSelectionRawRect(x,y,w,h){
 setSelectionMask(core.maskRect([x,y,x+w,y+h],selectedRegion()));
}
function applyStampPixels(base,stamp,x,y,mirror,replace){
 const S=window.MH2PixelSelection;
 const out=S.paste(base,WIDTH,HEIGHT,stamp,{x,y,mirror,replace});
 if(state.source!=="v6p"){
  for(let py=0;py<HEIGHT;py++)for(let px=0;px<WIDTH;px++){
   if(editable(px,py))continue;
   const i=(py*WIDTH+px)*4;
   out[i]=base[i];out[i+1]=base[i+1];out[i+2]=base[i+2];out[i+3]=base[i+3];
  }
 }
 return out;
}
function applyFloating(f,x,y){
 state.current=new ImageData(applyStampPixels(f.base,f.stamp,x,y,f.mirror,f.replace),WIDTH,HEIGHT);
 f.x=x;f.y=y;
}
function copySelection(){
 const S=window.MH2PixelSelection;
 if(!S||!state.current||state.loading)return;
 const rect=selectionRectForCopy();
 let stamp=S.copy(state.current.data,WIDTH,HEIGHT,rect);
 if(state.selectionMask){
  const px=new Uint8ClampedArray(stamp.pixels);
  for(let row=0;row<stamp.h;row++)for(let col=0;col<stamp.w;col++){
   const x=stamp.x+col,y=stamp.y+row;
   if(!state.selectionMask[y*WIDTH+x]){const i=(row*stamp.w+col)*4;px[i]=px[i+1]=px[i+2]=px[i+3]=0;}
  }
  stamp={...stamp,pixels:px};
 }
 stamp.copiedAt=Date.now();
 stamp.direction=state.dir;stamp.action=state.action;stamp.frame=state.frame;
 stamp.bone=state.project?state.project.id:(state.v6pPart||state.part);
 state.clipboard=stamp;
 try{localStorage.setItem(CLIP_KEY,JSON.stringify({...stamp,pixels:Array.from(stamp.pixels)}));}catch{}
 updateClipboardUI();
 const vis=stamp.pixels.some((v,i)=>i%4===3&&v>0);
 status(vis?"COPIED "+stamp.w+"×"+stamp.h+" PIXELS · SWITCH FRAME OR DIRECTION THEN PASTE":
  "COPIED AN EMPTY REGION · SELECT YOUR DRAWING THEN COPY");
}
function pasteSelection(mirror=false){
 const S=window.MH2PixelSelection;
 const stamp=currentClipboard();
 if(!S||!stamp){status("NO COPIED PIXELS · SELECT + COPY FIRST");return;}
 if(state.loading||!state.current)return;
 const replace=!!($("paste-replace")&&$("paste-replace").checked);
 if(!replace&&!stamp.pixels.some((v,i)=>i%4===3&&v>0)){
  status("PASTE HAS NO VISIBLE PIXELS · CHECK SOURCE SELECTION");return;
 }
 const destX=state.selection?state.selection[0]:(mirror?WIDTH-stamp.x-stamp.w:stamp.x);
 const destY=state.selection?state.selection[1]:stamp.y;
 const dx=clamp(destX,0,WIDTH-1),dy=clamp(destY,0,HEIGHT-1);
 cancelTemporaryMove();
 const historyBefore=snapshot();
 const selectionBefore=state.selection?state.selection.slice():null;
 const maskBefore=state.selectionMask?state.selectionMask.slice():null;
 const floating={
  base:new Uint8ClampedArray(state.current.data),
  stamp:{...stamp,pixels:new Uint8ClampedArray(stamp.pixels)},
  x:dx,y:dy,mirror,replace,historyBefore,selectionBefore,maskBefore,committed:false
 };
 applyFloating(floating,dx,dy);
 state.floatingPaste=floating;
 setSelectionRawRect(dx,dy,Math.min(stamp.w,WIDTH-dx),Math.min(stamp.h,HEIGHT-dy));
 state.tool="move";state.panMode=false;refreshToolState();
 updateSelectionUI();render();
 status("PASTED "+stamp.w+"×"+stamp.h+" RGBA · "+(mirror?"HORIZONTAL MIRROR · ":"")+
  state.dir.toUpperCase()+" · DRAG TO ALIGN · UNDO AVAILABLE");
}
function selectAll(){
 const b=selectedRegion();
 setSelection([b[0],b[1],b[2],b[3]],null,"replace");
 status("SELECTED ALL · "+(b[2]-b[0])+"×"+(b[3]-b[1]));
}
function clearSelectionPixels(){
 if(!state.selection||!state.current||state.loading)return;
 cancelTemporaryMove();
 const before=snapshot(),mask=state.selectionMask;
 for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
  if(!mask[y*WIDTH+x]||!editable(x,y))continue;
  const i=(y*WIDTH+x)*4;state.current.data[i]=state.current.data[i+1]=state.current.data[i+2]=state.current.data[i+3]=0;
 }
 commit(before,state.selection.slice(),mask.slice());
}
function cutSelection(){
 if(!state.selection||!state.current)return;
 copySelection();
 clearSelectionPixels();
 status("CUT "+(state.selection[2]-state.selection[0])+"×"+(state.selection[3]-state.selection[1])+" · PASTE ON ANY FRAME");
}
function finalizeFloatingPaste(){
 const f=state.floatingPaste;
 if(!f||f.committed){state.floatingPaste=null;return;}
 f.committed=true;
 const before=f.historyBefore,selB=f.selectionBefore,maskB=f.maskBefore;
 state.floatingPaste=null;
 commit(before,selB,maskB);
}
function cancelTemporaryMove(){
 if(state.floatingPaste&&((state.moveGesture&&state.moveGesture.floating)||(state.touchMoveAnchor&&state.touchMoveAnchor.floating))){
  state.moveGesture=null;state.touchMoveAnchor=null;
 }else{
  if(state.touchMoveAnchor){
   state.current=copy(state.touchMoveAnchor.before);
   state.selectionMask=state.touchMoveAnchor.mask.slice();
   state.selection=state.touchMoveAnchor.box.slice();state.touchMoveAnchor=null;
  }
  if(state.moveGesture){
   state.current=copy(state.moveGesture.before);
   state.selectionMask=state.moveGesture.mask.slice();
   state.selection=state.moveGesture.box.slice();state.moveGesture=null;
  }
 }
 state.selectionGesture=null;state.touchSelectAnchor=null;state.trackpad=null;
 finalizeFloatingPaste();
 updateSelectionUI();if(state.current)render();
}
function previewMove(before,box,dx,dy,mask=state.selectionMask){
 const gesture=state.moveGesture||state.touchMoveAnchor;
 if(state.floatingPaste&&gesture&&gesture.floating){
  const f=state.floatingPaste;
  const nextX=clamp((gesture.originX??f.x)+dx,0,WIDTH-1);
  const nextY=clamp((gesture.originY??f.y)+dy,0,HEIGHT-1);
  applyFloating(f,nextX,nextY);
  setSelectionRawRect(nextX,nextY,Math.min(f.stamp.w,WIDTH-nextX),Math.min(f.stamp.h,HEIGHT-nextY));
  updateSelectionUI();render();return;
 }
 const moved=core.moveMasked(before,mask,dx,dy,selectedRegion());
 state.current=new ImageData(moved.data,WIDTH,HEIGHT);
 state.selectionMask=moved.mask;state.selection=moved.box;updateSelectionUI();render();
}
function nudgeSelection(dx,dy){
 if(!state.selection||!state.current||state.loading||state.syncing)return;
 if(state.floatingPaste){
  const f=state.floatingPaste;
  applyFloating(f,clamp(f.x+dx,0,WIDTH-1),clamp(f.y+dy,0,HEIGHT-1));
  setSelectionRawRect(f.x,f.y,Math.min(f.stamp.w,WIDTH-f.x),Math.min(f.stamp.h,HEIGHT-f.y));
  updateSelectionUI();render();return;
 }
 cancelTemporaryMove();
 const before=snapshot(),box=state.selection.slice(),mask=state.selectionMask.slice();
 previewMove(before,box,dx,dy,mask);commit(before,box,mask);
}
function flipSelection(axis){
 if(!state.selection||!state.current||state.loading||state.syncing)return;
 cancelTemporaryMove();
 const before=snapshot(),box=state.selection.slice(),mask=state.selectionMask.slice();
 const result=core.flipMasked(before,mask,axis,selectedRegion());
 state.current=new ImageData(result.data,WIDTH,HEIGHT);
 state.selectionMask=result.mask;state.selection=result.box;
 commit(before,box,mask);updateSelectionUI();render();
}
function moveCursor(x,y){
 state.cursor=[Math.max(0,Math.min(WIDTH-1,x)),Math.max(0,Math.min(HEIGHT-1,y))];
 $("cursor-coord").textContent="CURSOR X "+state.cursor[0]+" / Y "+state.cursor[1];
 if(state.touchMoveAnchor){
  const d=state.touchMoveAnchor;previewMove(d.before,d.box,state.cursor[0]-d.start[0],state.cursor[1]-d.start[1],d.mask);
 }else render();
}
function cursorTap(){
 if(!state.cursorMode||state.panMode||state.loading||state.syncing||!state.current)return;
 const [x,y]=state.cursor;
 if(state.tool==="move"&&state.touchMoveAnchor){
  const d=state.touchMoveAnchor;state.touchMoveAnchor=null;
  if(!d.floating) commit(d.before,d.box,d.mask);
  status("MOVE APPLIED · UNDO AVAILABLE");return;
 }
 if(!editable(x,y)){status("CURSOR OUTSIDE "+state.part.toUpperCase()+" AREA");return;}
 if(state.tool==="wand"){colorSelection(x,y);return;}
 if(state.tool==="select"){
  if(!state.touchSelectAnchor){
   state.touchSelectAnchor={start:[x,y],base:state.selectionMask?state.selectionMask.slice():null,mode:state.selectionMode};
   render();status("RECT: MOVE CURSOR TO OPPOSITE CORNER, TAP TO CONFIRM");
  }else{
   const d=state.touchSelectAnchor;state.touchSelectAnchor=null;
   setSelection(core.selectionRect(...d.start,x,y,selectedRegion()),d.base,d.mode);
   status("RECT SELECTION · "+d.mode.toUpperCase());
  }
  return;
 }
 if(state.tool==="move"){
  if(!state.touchMoveAnchor){
   if(!selectedPixel(x,y)){status("MOVE: TAP INSIDE SELECTED PIXELS");return;}
   state.touchMoveAnchor={start:[x,y],before:snapshot(),box:state.selection.slice(),mask:state.selectionMask.slice(),
    floating:!!state.floatingPaste,originX:state.floatingPaste?state.floatingPaste.x:0,originY:state.floatingPaste?state.floatingPaste.y:0};
   status("MOVE: DRAG CURSOR AND TAP AGAIN TO DROP");
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
 if(state.tool==="wand"){colorSelection(x,y,activeSelectionMode(e));return;}
 if(state.tool==="select"){
  state.selectionGesture={id:e.pointerId,start:[x,y],base:state.selectionMask?state.selectionMask.slice():null,mode:activeSelectionMode(e)};
  setSelection(core.selectionRect(x,y,x,y,selectedRegion()),state.selectionGesture.base,state.selectionGesture.mode);return;
 }
 if(state.tool==="move"){
  if(!selectedPixel(x,y)){status("SELECT PIXELS, THEN DRAG INSIDE SHAPE WITH MOVE");return;}
  state.moveGesture={id:e.pointerId,start:[x,y],before:snapshot(),box:state.selection.slice(),mask:state.selectionMask.slice(),
   floating:!!state.floatingPaste,originX:state.floatingPaste?state.floatingPaste.x:0,originY:state.floatingPaste?state.floatingPaste.y:0};return;
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
  const d=state.selectionGesture,[sx,sy]=d.start;
  setSelection(core.selectionRect(sx,sy,x,y,selectedRegion()),d.base,d.mode);e.preventDefault();return;
 }
 if(state.moveGesture){
  if(e.pointerId!==state.moveGesture.id)return;
  const d=state.moveGesture;previewMove(d.before,d.box,x-d.start[0],y-d.start[1],d.mask);
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
   if(d.floating&&state.floatingPaste){
    applyFloating(state.floatingPaste,d.originX,d.originY);
    setSelectionRawRect(d.originX,d.originY,Math.min(state.floatingPaste.stamp.w,WIDTH-d.originX),Math.min(state.floatingPaste.stamp.h,HEIGHT-d.originY));
   }else{
    state.current=copy(d.before);state.selection=d.box.slice();state.selectionMask=d.mask.slice();
   }
   updateSelectionUI();render();
  }else if(!d.floating) commit(d.before,d.box,d.mask);
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
 const overlayUnder=!state.project||state.project.placement!=="back";
 if(state.overlayOn&&state.overlayCanvas&&overlayUnder){
  g.save();g.globalAlpha=state.overlayAlpha;g.imageSmoothingEnabled=false;
  g.drawImage(state.overlayCanvas,0,0,WIDTH*z,HEIGHT*z);g.restore();
 }
 if(state.onion&&state.onionImage&&state.actClip){
  rc.putImageData(state.onionImage,0,0);
  g.save();g.globalAlpha=0.35;g.imageSmoothingEnabled=false;
  g.drawImage(renderCanvas,0,0,WIDTH*z,HEIGHT*z);g.restore();
 }
 if(state.current){rc.putImageData(state.current,0,0);g.drawImage(renderCanvas,0,0,WIDTH*z,HEIGHT*z);
  mc.imageSmoothingEnabled=false;mc.drawImage(renderCanvas,0,0,128,224);}
 if(state.overlayOn&&state.overlayCanvas&&!overlayUnder){
  g.save();g.globalAlpha=state.overlayAlpha;g.imageSmoothingEnabled=false;
  g.drawImage(state.overlayCanvas,0,0,WIDTH*z,HEIGHT*z);g.restore();
 }
 if(state.showPivot&&state.source==="v6p"&&(state.project||state.actClip)){
  const px=32,py=100;
  g.save();g.strokeStyle="rgba(200,36,36,.8)";g.lineWidth=1;
  g.beginPath();g.moveTo(px*z+.5,0);g.lineTo(px*z+.5,HEIGHT*z);
  g.moveTo(0,py*z+.5);g.lineTo(WIDTH*z,py*z+.5);g.stroke();
  g.fillStyle="#c42424";g.fillRect(px*z-2,py*z-2,5,5);g.restore();
 }
 // Thin boundary around the currently active semantic region.
 const b=selectedRegion();
 g.strokeStyle="#2e6ca8";g.lineWidth=1;
 g.strokeRect(b[0]*z+.5,b[1]*z+.5,(b[2]-b[0])*z,(b[3]-b[1])*z);
 if(state.grid){g.strokeStyle="rgba(36,65,105,.23)";g.lineWidth=1;
  for(let x=b[0]+1;x<b[2];x++){g.beginPath();g.moveTo(x*z+.5,b[1]*z);g.lineTo(x*z+.5,b[3]*z);g.stroke();}
  for(let y=b[1]+1;y<b[3];y++){g.beginPath();g.moveTo(b[0]*z,y*z+.5);g.lineTo(b[2]*z,y*z+.5);g.stroke();}}

 // Draw each selected pixel boundary instead of drawing only a rectangle.
 if(state.selectionMask&&state.selection){
  const mask=state.selectionMask,bb=state.selection;
  g.save();g.beginPath();g.lineWidth=Math.max(1,z/3);
  for(let y=bb[1];y<bb[3];y++)for(let x=bb[0];x<bb[2];x++)if(mask[y*WIDTH+x]){
   const i=y*WIDTH+x,l=x*z,t=y*z;
   if(x===0||!mask[i-1]){g.moveTo(l,t);g.lineTo(l,t+z);}
   if(x===WIDTH-1||!mask[i+1]){g.moveTo(l+z,t);g.lineTo(l+z,t+z);}
   if(y===0||!mask[i-WIDTH]){g.moveTo(l,t);g.lineTo(l+z,t);}
   if(y===HEIGHT-1||!mask[i+WIDTH]){g.moveTo(l,t+z);g.lineTo(l+z,t+z);}
  }
  g.strokeStyle="#ffffff";g.stroke();g.strokeStyle="#16418b";g.lineWidth=1;
  g.setLineDash([Math.max(2,z),Math.max(2,z)]);g.stroke();g.restore();
 }
 if(state.touchSelectAnchor){
  const b=core.selectionRect(...state.touchSelectAnchor.start,...state.cursor,selectedRegion());
  g.save();g.lineWidth=1;g.setLineDash([4,4]);g.strokeStyle="#fff";
  g.strokeRect(b[0]*z+.5,b[1]*z+.5,(b[2]-b[0])*z,(b[3]-b[1])*z);
  g.restore();
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
function historyButtons(){$("undo").disabled=!(state.history.length||(state.actClip&&state.clipUndo.length));$("redo").disabled=!(state.redo.length||(state.actClip&&state.clipRedo.length));}
async function historyApply(isUndo){
 state.floatingPaste=null;state.moveGesture=null;state.touchMoveAnchor=null;
 const from=isUndo?state.history:state.redo,to=isUndo?state.redo:state.history;
 const entry=from.pop();
 if(!entry){if(state.actClip)await applyClipHistory(isUndo);historyButtons();return;}
 to.push(entry);
 const [action,dir,n]=entry.key.split("|");
 if(currentKey()!==entry.key)await setFrame(action,dir,Number(n));
 state.current=copy(isUndo?entry.before:entry.after);
 if(entry.selectionBefore!==undefined)state.selection=isUndo?
  (entry.selectionBefore?entry.selectionBefore.slice():null):
  (entry.selectionAfter?entry.selectionAfter.slice():null);
 if(entry.maskBefore!==undefined)state.selectionMask=isUndo?
  (entry.maskBefore?entry.maskBefore.slice():null):
  (entry.maskAfter?entry.maskAfter.slice():null);
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
function downloadCanvas(filename){renderCanvas.width=64;renderCanvas.height=112;rc.putImageData(displayToFile(state.current),0,0);
 renderCanvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);},"image/png");}
let localTimer=0;
function scheduleSave(){clearTimeout(localTimer);localTimer=setTimeout(()=>{
 if(state.source==="v6p"){persistV6pOverride();return;}
 try{localStorage.setItem(LOCAL,JSON.stringify(patchObject()));}catch(e){status("LOCAL DRAFT FULL / EXPORT PIXEL EDITS.JSON NOW",true);}
 },450);}
async function importV6pPatch(p){
 if(!p||p.format!=="virtual-life-v6p-part-patch-v1")throw Error("Not a v6p part patch");
 await loadV6pPart(p.part);
 const imported=new Map();
 for(const item of p.frames||[]){
  const frame=await fromPNG(item.png);
  const key=item.action+"|"+item.direction+"|"+item.frame;
  imported.set(key,frame);
  if(state.v6pSheet)window.V6PPixelSource.stamp(state.v6pSheet,item.action,item.direction,item.frame,frame);
 }
 state.edits=imported;state.history=[];state.redo=[];historyButtons();updateCounts();
 persistV6pOverride();
 await navigate();
 status("IMPORTED V6P PATCH / "+imported.size+" FRAMES / "+state.v6pPart);
}
async function importObject(p,fromDraft=false){
 if(p&&p.format==="virtual-life-v6p-part-patch-v1"){await importV6pPatch(p);return;}
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
  state.cursorMode?"CURSOR · drag to aim, TAP to WAND/RECT/edit":
  "DIRECT · tap WAND for color, drag RECT, empty margin scrolls";
 display.style.cursor=state.panMode?"grab":state.cursorMode?"none":"crosshair";
}

/* Keep the native pixel grid integer-scaled, but fit the first view to a narrow
   phone screen. Larger zooms remain scrollable inside canvas-scroll only. */
let userSetZoom=false;
function fitMobileZoom(){
 if(!window.matchMedia("(max-width:700px)").matches||userSetZoom)return;
 const area=$("canvas-scroll");
 if(!area)return;
 const available=Math.max(160,area.clientWidth-36);
 const fit=Math.max(2,Math.min(4,Math.floor(available/WIDTH)));
 if(fit===state.zoom)return;
 state.zoom=fit;
 $("zoom").value=String(fit);
 render();
}
function checkEditorWidth(){
 const root=document.querySelector(".paint");
 if(!root)return;
 const viewport=document.documentElement.clientWidth;
 const excess=root.getBoundingClientRect().width-viewport;
 if(excess>2)status("EDITOR WIDTH OVERFLOW: "+Math.round(excess)+"PX",true);
}


function persistClipManifest(){
 if(!state.actClip||!window.V6PClipStore)return;
 window.V6PClipStore.updateManifest(state.actClip.id,{frames:state.actClip.frames,name:state.actClip.name,loop:state.actClip.loop!==false});
}
function clipThumb(){
 if(!state.actClip||!state.v6pSheet)return "";
 const cv=document.createElement("canvas");cv.width=64;cv.height=112;
 const ctx=cv.getContext("2d");ctx.imageSmoothingEnabled=false;
 try{
  const o=window.V6PActivityContract.cellOrigin(state.actClip.bandStart||0,"se",0);
  ctx.drawImage(state.v6pSheet,o.x,o.y,o.w,o.h,0,0,64,112);
 }catch{}
 return cv.toDataURL("image/png");
}
function persistClipLayer(){
 if(!state.actClip||!state.v6pSheet||!window.V6PClipStore)return;
 try{
  const url=window.V6PPixelSource.toDataURL(state.v6pSheet);
  window.V6PClipStore.setLayer(state.actClip.id,state.clipLayer,url,{thumbDataUrl:clipThumb()});
  if($("drive-status"))$("drive-status").textContent="Clip tersimpan lokal: "+state.actClip.name+" · layer "+state.clipLayer+" · stock 44-row tidak diubah.";
 }catch(e){status("CLIP SAVE FAILED: "+e.message,true);}
}
function fillClipLayerSelect(parts,selected){
 const sel=$("clip-layer"); if(!sel)return;
 sel.innerHTML="";
 for(const part of parts){
  const o=document.createElement("option");o.value=part;o.textContent=part;sel.append(o);
 }
 if(selected)sel.value=selected;
}
function fillClipStrip(){
 const el=$("clip-strip"); if(!el||!state.actClip)return;
 el.innerHTML="";
 state.actClip.frames.forEach((f,i)=>{
  const b=document.createElement("button");
  b.type="button";b.className="clip-cell"+(i===state.frame?" on":"");
  b.textContent=(i+1)+". "+f.key+"\n"+f.ms+"ms";
  b.onclick=()=>{stopClipPlay();setFrame(state.action,state.dir,i);};
  el.append(b);
 });
 if($("clip-ms"))$("clip-ms").value=state.actClip.frames[state.frame]?state.actClip.frames[state.frame].ms:140;
 if($("clip-loop"))$("clip-loop").checked=state.actClip.loop!==false;
}
async function refreshMFPreview(){
 if(!state.actClip||!window.V6PCompositor)return;
 const C=window.V6PCompositor, note=$("clip-prev-note");
 for(const [g,id] of [["male","clip-prev-m"],["female","clip-prev-f"]]){
  const ch=C.previewAppearance(g);
  const cv=await C.composeActivity(ch,state.actClip,state.frame,state.dir);
  const dest=$(id); if(!dest)continue;
  const d=dest.getContext("2d");d.imageSmoothingEnabled=false;d.clearRect(0,0,dest.width,dest.height);
  if(!cv||cv._disabled){
   d.fillStyle="#5a2020";d.fillRect(0,0,dest.width,dest.height);
   if(note)note.textContent=(cv&&cv._avail&&cv._avail.note)||"Clip disabled";
  }else{
   d.drawImage(cv,0,0);
   if(note)note.textContent=(cv._avail&&cv._avail.note)||"Ready";
  }
 }
}
function stopClipPlay(){
 state.playing=false;
 if(state.playTimer){clearTimeout(state.playTimer);state.playTimer=0;}
}
function schedulePlay(){
 if(!state.playing||!state.actClip)return;
 const ms=state.actClip.frames[state.frame]?state.actClip.frames[state.frame].ms:140;
 state.playTimer=setTimeout(async()=>{
  if(!state.playing)return;
  let next=state.frame+1;
  if(next>=state.actClip.frames.length){
   if(state.actClip.loop===false){stopClipPlay();await refreshMFPreview();return;}
   next=0;
  }
  await setFrame(state.action,state.dir,next);
  schedulePlay();
 },ms);
}
function eachDirOrigin(col){
 return window.V6PActivityContract.DIRS.map(d=>window.V6PActivityContract.cellOrigin(state.actClip.bandStart||0,d,col));
}
function readColumn(sheet,col){
 const ctx=sheet.getContext("2d",{willReadFrequently:true});
 return eachDirOrigin(col).map(o=>ctx.getImageData(o.x,o.y,o.w,o.h));
}
function writeColumn(sheet,col,cells){
 const ctx=sheet.getContext("2d");
 eachDirOrigin(col).forEach((o,i)=>ctx.putImageData(cells[i],o.x,o.y));
}
function clearColumn(sheet,col){
 const ctx=sheet.getContext("2d");
 eachDirOrigin(col).forEach(o=>ctx.clearRect(o.x,o.y,o.w,o.h));
}
function snapshotClip(){
 if(!state.loading)saveCurrent();
 const rec=window.V6PClipStore.get(state.actClip.id);
 return {
  manifest:JSON.parse(JSON.stringify(state.actClip)),
  frame:state.frame,layer:state.clipLayer,
  layers:JSON.parse(JSON.stringify((rec&&rec.layers)||{})),
  currentSheet:window.V6PPixelSource.toDataURL(state.v6pSheet)
 };
}
async function restoreClipSnap(snap){
 window.V6PClipStore.updateManifest(snap.manifest.id,snap.manifest);
 window.V6PClipStore.replaceLayers(snap.manifest.id,snap.layers||{});
 if(snap.currentSheet) window.V6PClipStore.setLayer(snap.manifest.id,snap.layer,snap.currentSheet);
 await loadActClip(snap.manifest.id,snap.layer);
 await setFrame(state.action,state.dir,Math.min(snap.frame,state.actClip.frames.length-1));
}
async function applyClipHistory(isUndo){
 const from=isUndo?state.clipUndo:state.clipRedo;
 const to=isUndo?state.clipRedo:state.clipUndo;
 if(!from.length)return;
 to.push(snapshotClip());
 const snap=from.pop();
 await restoreClipSnap(snap);
}
function pushClipUndo(){
 state.clipUndo.push(snapshotClip());
 if(state.clipUndo.length>20)state.clipUndo.shift();
 state.clipRedo=[];
 historyButtons();
}
async function mapClipSheets(fn){
 if(!state.loading)saveCurrent();
 fn(state.v6pSheet);
 persistClipLayer();
 const rec=window.V6PClipStore.get(state.actClip.id);
 const parts=new Set([...(rec.manifest.requiredParts||[]),...Object.keys(rec.layers||{})]);
 parts.delete(state.clipLayer);
 const A=window.V6PActivityContract,S=window.V6PPixelSource,size={w:A.W,h:A.H};
 for(const part of parts){
  const url=window.V6PClipStore.layerUrl(state.actClip.id,part);
  if(!url)continue;
  try{
   const sheet=await S.loadSheetFromUrl(url,size);
   fn(sheet);
   window.V6PClipStore.setLayer(state.actClip.id,part,S.toDataURL(sheet));
  }catch(e){/* skip missing optional */}
 }
}
async function clipAddFrame(){
 if(!state.actClip)return;
 if(state.actClip.frames.length>=window.V6PActivityContract.MAX_FRAMES){status("Max 6 frames (activity contract)");return;}
 pushClipUndo();
 const at=state.frame+1,n=state.actClip.frames.length;
 await mapClipSheets(sheet=>{
  for(let col=n-1;col>=at;col--) writeColumn(sheet,col+1,readColumn(sheet,col));
  clearColumn(sheet,at);
 });
 const ms=state.actClip.frames[state.frame].ms;
 state.actClip.frames.splice(at,0,{key:"f"+Date.now().toString(36).slice(-4),ms});
 persistClipManifest();
 state.originals=new Map();state.edits=new Map();
 await setFrame(state.action,state.dir,at);
}
async function clipDupFrame(){
 if(!state.actClip)return;
 if(state.actClip.frames.length>=window.V6PActivityContract.MAX_FRAMES){status("Max 6 frames (activity contract)");return;}
 pushClipUndo();
 const src=state.frame,at=state.frame+1,n=state.actClip.frames.length;
 await mapClipSheets(sheet=>{
  for(let col=n-1;col>=at;col--) writeColumn(sheet,col+1,readColumn(sheet,col));
  writeColumn(sheet,at,readColumn(sheet,src));
 });
 const f=state.actClip.frames[src];
 state.actClip.frames.splice(at,0,{key:String(f.key||"f").slice(0,28)+"_c",ms:f.ms});
 persistClipManifest();
 state.originals=new Map();state.edits=new Map();
 await setFrame(state.action,state.dir,at);
}
async function clipDelFrame(){
 if(!state.actClip)return;
 if(state.actClip.frames.length<=1){status("Need at least 1 frame");return;}
 pushClipUndo();
 const at=state.frame,n=state.actClip.frames.length;
 await mapClipSheets(sheet=>{
  for(let col=at;col<n-1;col++) writeColumn(sheet,col,readColumn(sheet,col+1));
  clearColumn(sheet,n-1);
 });
 state.actClip.frames.splice(at,1);
 persistClipManifest();
 state.originals=new Map();state.edits=new Map();
 await setFrame(state.action,state.dir,Math.min(at,state.actClip.frames.length-1));
}
async function clipMove(dir){
 if(!state.actClip)return;
 const j=state.frame+dir;
 if(j<0||j>=state.actClip.frames.length)return;
 pushClipUndo();
 const i=state.frame;
 await mapClipSheets(sheet=>{
  const a=readColumn(sheet,i),b=readColumn(sheet,j);
  writeColumn(sheet,i,b);writeColumn(sheet,j,a);
 });
 const tmp=state.actClip.frames[i];
 state.actClip.frames[i]=state.actClip.frames[j];
 state.actClip.frames[j]=tmp;
 persistClipManifest();
 state.originals=new Map();state.edits=new Map();
 await setFrame(state.action,state.dir,j);
}
function createActClip(name){
 return window.V6PClipStore.create({name:name||"Clip baru",frames:[{key:"f0",ms:140},{key:"f1",ms:140}]});
}
async function loadActClip(id,preferredLayer){
 const Store=window.V6PClipStore,A=window.V6PActivityContract,S=window.V6PPixelSource;
 if(!Store||!A||!S)throw Error("clip helpers not loaded");
 const rec=Store.get(id); if(!rec)throw Error("Unknown clip "+id);
 stopClipPlay();
 state.loading=true;state.current=null;
 state.source="v6p";state.project=null;state.v6pPart=null;
 state.actClip=JSON.parse(JSON.stringify(rec.manifest));
 state.mode="frame";
 if($("edit-mode"))$("edit-mode").value="frame";
 if($("source-kind"))$("source-kind").value="clip";
 const parts=[...new Set([...(rec.manifest.requiredParts||[]),...Object.keys(rec.layers||{})])];
 if(!parts.length) parts.push("base/body");
 let layer=preferredLayer&&(Store.hasLayer(rec.id,preferredLayer)||parts.includes(preferredLayer))
  ?preferredLayer
  :(parts.find(p=>Store.hasLayer(rec.id,p))||parts[0]);
 state.clipLayer=layer;
 const url=Store.layerUrl(rec.id,layer);
 const size={w:A.W,h:A.H};
 state.v6pSheet=url?await S.loadSheetFromUrl(url,size):S.blankSheet(size);
 state.clips=[{id:rec.id,name:rec.name,frames:rec.manifest.frames.length}];
 state.action=rec.id;
 state.originals=new Map();state.edits=new Map();state.history=[];state.redo=[];
 fillV6pActions();
 fillClipLayerSelect(parts,layer);
 fillProjectSelect();
 state.dir=A.DIRS.includes(state.dir)?state.dir:"se";
 state.frame=Math.max(0,Math.min(state.frame||0,rec.manifest.frames.length-1));
 if($("direction"))$("direction").value=state.dir;
 modeUI();historyButtons();updateCounts();
 await setFrame(state.action,state.dir,state.frame);
 $("source-state").textContent="CLIP / "+rec.name+" / "+layer;
 status("EDITING CLIP / "+rec.name+" / layer "+layer);
}


function displayToFileFor(img,key){
 if(state.source!=="v6p"||!img||!window.V6PCompositor||!window.V6PCompositor.displayToKeys) return img;
 const ch=previewCh(); return ch?window.V6PCompositor.displayToKeys(img,ch,state.originals.get(key)):img;
}
function pullEmosiIntoState(){
 if(!emosiEditor||typeof emosiEditor.getAtlas!=="function") return;
 const atlas=emosiEditor.getAtlas(); if(!atlas) return;
 const g=atlas.getContext("2d",{willReadFrequently:true});
 const dirNow=emosiEditor.getDir&&emosiEditor.getDir();
 if(dirNow&&DIRECTIONS.includes(dirNow)){
  state.dir=dirNow;
  if($("direction")) $("direction").value=dirNow;
 }
 const clip=activeClip(); if(!clip) return;
 for(let i=0;i<4;i++){
  const dir=DIRECTIONS[i];
  const displayed=g.getImageData(0,i*HEIGHT,WIDTH,HEIGHT);
  const key=state.source==="v6p"?state.action+"|"+dir+"|"+state.frame:core.key(state.action,dir,state.frame);
  const stored=displayToFileFor(displayed,key);
  const original=state.originals.get(key);
  if(original&&identical(stored,original))state.edits.delete(key);
  else state.edits.set(key,copy(stored));
  if(state.source==="v6p"&&state.v6pSheet&&window.V6PPixelSource){
   if(state.actClip){
    const o=window.V6PActivityContract.cellOrigin(state.actClip.bandStart||0,dir,state.frame);
    window.V6PPixelSource.stampAt(state.v6pSheet,o.x,o.y,stored);
   }else{
    window.V6PPixelSource.stamp(state.v6pSheet,state.action,dir,state.frame,stored);
    if(state.characterId&&state.v6pPart&&window.V6PCharacterStore&&original&&!identical(stored,original)){
     try{
      if(state.masterMode){
       const master=document.createElement("canvas");master.width=WIDTH;master.height=HEIGHT;
       master.getContext("2d").putImageData(stored,0,0);
       window.V6PCharacterStore.setMaster(state.characterId,state.v6pPart,dir,master.toDataURL("image/png"));
      }else window.V6PCharacterStore.markCorrection(state.characterId,state.v6pPart,state.action,dir,state.frame);
     }catch(error){status("FRAME SAVE ERROR "+dir+": "+error.message,true)}
    }
   }
  }
  if(dir===state.dir) state.current=displayed;
 }
}
async function syncEmosiOpen(){
 if(!emosiEditor) return;
 const clip=activeClip(); if(!clip) return;
 const atlas=document.createElement("canvas"); atlas.width=WIDTH; atlas.height=HEIGHT*4;
 const g=atlas.getContext("2d");
 const orig=document.createElement("canvas"); orig.width=WIDTH; orig.height=HEIGHT*4;
 const og=orig.getContext("2d");
 for(let i=0;i<4;i++){
  const dir=DIRECTIONS[i];
  const key=state.source==="v6p"?state.action+"|"+dir+"|"+state.frame:core.key(state.action,dir,state.frame);
  const original=await originalFor(key,clip,dir,state.frame);
  const displayed=fileToDisplay(copy(state.edits.get(key)||original));
  g.putImageData(displayed,0,i*HEIGHT);
  og.putImageData(fileToDisplay(copy(original)),0,i*HEIGHT);
 }
 const id=state.actClip?("clip / "+state.actClip.name+" / "+(state.clipLayer||"layer")):
  state.project?state.project.name:(state.v6pPart||state.part||"plane");
 const ref=(state.overlayOn&&state.overlayCanvas)?state.overlayCanvas:(state.onionImage||null);
 emosiEditor.open({id:String(id),initialAtlas:atlas,originalAtlas:orig,referenceImage:ref,direction:state.dir});
 const ov=$("pixelOverlay"); if(ov) ov.hidden=false;
 if($("pixelDirection")) $("pixelDirection").value=state.dir;
}
function bootEmosiEditor(){
 if(emosiEditor||!window.MH2PlanePixelEditor) return;
 const overlay=$("pixelOverlay"),canvas=$("pixelCanvas");
 if(!overlay||!canvas) return;
 emosiEditor=window.MH2PlanePixelEditor.create({
  overlay,canvas,reference:null,
  onApply:(id)=>{pullEmosiIntoState();saveCurrent();persistV6pOverride();status("APPLIED "+id);return false;},
  onSaveDefault:(id)=>{pullEmosiIntoState();saveCurrent();persistV6pOverride();status("SAVED FRAME "+id);return false;},
  onRestore:()=>{}
 });
 const closeBtn=$("pixelClose");
 if(closeBtn) closeBtn.onclick=()=>{
  try{pullEmosiIntoState();saveCurrent();}catch{}
  if(window.parent!==window&&window.parent.VLMahlukWorkspace) window.parent.VLMahlukWorkspace.show("character");
  else location.href="./v6p-studio.html";
 };
 const pd=$("pixelDirection");
 if(pd) pd.addEventListener("change",()=>{
  if(DIRECTIONS.includes(pd.value)){
   state.dir=pd.value;
   if($("direction")) $("direction").value=state.dir;
  }
 });
}

function initControls(){


 $("zoom").value=String(state.zoom);
 refreshToolState();
 $("pan-toggle").onclick=()=>{cancelTemporaryMove();state.panMode=!state.panMode;refreshToolState();render();};
 $("cursor-toggle").onclick=()=>{cancelTemporaryMove();state.cursorMode=!state.cursorMode;state.panMode=false;refreshToolState();render();};
 $("cursor-tap").onclick=cursorTap;
 for(const button of document.querySelectorAll("[data-select-mode]"))button.onclick=()=>{
  state.selectionMode=button.dataset.selectMode;updateSelectionUI();
  status("SELECTION MODE · "+state.selectionMode.toUpperCase());
 };
 $("wand-contiguous").onchange=e=>{state.wandContiguous=e.target.checked;};
 $("wand-tolerance").oninput=e=>{
  state.wandTolerance=Number(e.target.value);
  $("wand-tolerance-value").textContent=String(state.wandTolerance);
 };
 for(const [id,dx,dy] of [["cursor-left",-1,0],["cursor-right",1,0],["cursor-up",0,-1],["cursor-down",0,1]])
  $(id).onclick=()=>{if(state.cursorMode&&!state.panMode)moveCursor(state.cursor[0]+dx,state.cursor[1]+dy);};
 for(const [id,dx,dy] of [["nudge-left",-1,0],["nudge-right",1,0],["nudge-up",0,-1],["nudge-down",0,1]])
  $(id).onclick=()=>nudgeSelection(dx,dy);
 $("flip-horizontal").onclick=()=>flipSelection("horizontal");
 $("flip-vertical").onclick=()=>flipSelection("vertical");
 $("deselect").onclick=()=>{cancelTemporaryMove();setSelection(null);};
 if($("copy-selection"))$("copy-selection").onclick=copySelection;
 if($("cut-selection"))$("cut-selection").onclick=cutSelection;
 if($("paste-selection"))$("paste-selection").onclick=()=>pasteSelection(false);
 if($("paste-flip"))$("paste-flip").onclick=()=>pasteSelection(true);
 if($("select-all"))$("select-all").onclick=selectAll;
 if($("overlay-on"))$("overlay-on").onchange=e=>{state.overlayOn=e.target.checked;render();};
 if($("overlay-alpha"))$("overlay-alpha").oninput=e=>{
  state.overlayAlpha=Number(e.target.value)/100;$("overlay-alpha-value").textContent=e.target.value+"%";
  if($("overlay-info")&&state.project)$("overlay-info").textContent="Acuan "+state.action.toUpperCase()+" / "+state.dir.toUpperCase()+" / F"+state.frame+" · opacity "+e.target.value+"% · tidak ikut PNG";
  render();
 };
 if($("overlay-pivot"))$("overlay-pivot").onchange=e=>{state.showPivot=e.target.checked;render();};
 if($("new-accessory"))$("new-accessory").onclick=async()=>{const item=createUserProject("accessory");if(item)await loadProject(item.id);};
 if($("new-clip"))$("new-clip").onclick=async()=>{
  const rec=createActClip();
  if(rec)await loadActClip(rec.id);
 };
 if($("v6p-project"))$("v6p-project").onchange=e=>{
  const id=e.target.value;
  if(window.V6PClipStore&&window.V6PClipStore.get(id)) loadActClip(id).catch(err=>status(String(err),true));
  else loadProject(id).catch(err=>status(String(err),true));
 };
 if($("clip-play"))$("clip-play").onclick=()=>{if(!state.actClip)return;state.playing=true;schedulePlay();};
 if($("clip-pause"))$("clip-pause").onclick=()=>stopClipPlay();
 if($("clip-loop"))$("clip-loop").onchange=e=>{if(!state.actClip)return;state.actClip.loop=e.target.checked;persistClipManifest();};
 if($("clip-ms"))$("clip-ms").onchange=e=>{
  if(!state.actClip||!state.actClip.frames[state.frame])return;
  state.actClip.frames[state.frame].ms=Math.max(40,Math.min(800,Number(e.target.value)||140));
  persistClipManifest();fillClipStrip();
 };
 if($("clip-onion"))$("clip-onion").onchange=e=>{state.onion=e.target.checked;navigate();};
 if($("clip-layer"))$("clip-layer").onchange=e=>{if(state.actClip)loadActClip(state.actClip.id,e.target.value).catch(err=>status(String(err),true));};
 if($("clip-add"))$("clip-add").onclick=()=>clipAddFrame();
 if($("clip-dup"))$("clip-dup").onclick=()=>clipDupFrame();
 if($("clip-del"))$("clip-del").onclick=()=>clipDelFrame();
 if($("clip-left"))$("clip-left").onclick=()=>clipMove(-1);
 if($("clip-right"))$("clip-right").onclick=()=>clipMove(1);
 if($("accessory-place"))$("accessory-place").onchange=e=>{
  if(state.project&&state.project.type==="accessory"){
   state.project=window.V6PProjectCatalog.update(state.project.id,{placement:e.target.value});
   persistProjectSheet();refreshOverlay().then(render);
  }
 };
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
 $("zoom").onchange=e=>{userSetZoom=true;state.zoom=Number(e.target.value);render();};
 $("grid").onchange=e=>{state.grid=e.target.checked;render();};
 $("undo").onclick=()=>historyApply(true);$("redo").onclick=()=>historyApply(false);
 $("reset-frame").onclick=()=>{if(!state.current)return;
  const before=snapshot(),base=state.originals.get(currentKey());
  if(state.mode==="master"){
   const b=selectedRegion();
   for(let y=b[1];y<b[3];y++)for(let x=b[0];x<b[2];x++){
    const i=(y*WIDTH+x)*4;for(let j=0;j<4;j++)state.current.data[i+j]=base.data[i+j];
   }
  }else state.current=fileToDisplay(copy(base));
  commit(before);status("RESET "+(state.mode==="master"?state.part.toUpperCase():"CURRENT FRAME"));};
 $("download-frame").onclick=()=>{if(state.current)downloadCanvas((state.source==="v6p"?(state.project?state.project.id:(state.v6pPart||"part")).replaceAll("/","_")+"_":"otis_")+state.action+"_"+state.dir+"_f"+state.frame+".png");};
 if($("download-sheet"))$("download-sheet").onclick=()=>downloadV6pSheet();
 if($("save-drive"))$("save-drive").onclick=()=>saveV6pToDrive();
 if($("source-kind"))$("source-kind").onchange=async e=>{
  const v=e.target.value;
  if(v==="v6p"){state.project=null;fillV6pPartSelect();await loadV6pPart(($("v6p-part")&&$("v6p-part").value)||"top/nude");return;}
  if(v==="clip"){
   if(window.V6PClipStore){
    const existing=window.V6PClipStore.list()[0];
    if(existing)await loadActClip(existing.id);
    else {const rec=createActClip();if(rec)await loadActClip(rec.id);}
    return;
   }
  }
  if(v==="accessory"||v==="clip"){
   fillProjectSelect();
   const existing=window.V6PProjectCatalog&&window.V6PProjectCatalog.list().find(it=>it.type===v);
   if(existing)await loadProject(existing.id);
   else {const item=createUserProject(v);if(item)await loadProject(item.id);}
   return;
  }
  location.href="./pixel-editor.html";
 };
 if($("v6p-part"))$("v6p-part").onchange=e=>loadV6pPart(e.target.value).catch(err=>status(String(err),true));
 $("export-patch").onclick=async()=>{await state.syncPromise;if(!state.loading)saveCurrent();
  if(state.source==="v6p"){
   persistV6pOverride();
   if(state.actClip){
    const patch={format:"virtual-life-v6p-act-clip-patch-v1",version:1,manifest:state.actClip,layer:state.clipLayer};
    downloadText(JSON.stringify(patch,null,2)+"\n",state.actClip.id+".clip.json","application/json");
    await downloadV6pSheet();
    status("EXPORTED CLIP "+state.actClip.name+" · activity sheet 384×2688");
    return;
   }
   if(state.project){
    const patch={format:"virtual-life-v6p-project-patch-v1",version:1,type:state.project.type,id:state.project.id,name:state.project.name,placement:state.project.placement,sheet_size:[384,4928],frame_size:[64,112],frames:[...state.edits.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,data])=>{const [action,direction,frame]=k.split("|");return {action,direction,frame:Number(frame),png:toPNG(data)};})};
    downloadText(JSON.stringify(patch,null,2)+"\n",state.project.id+".project.json","application/json");
    await downloadV6pSheet();
    status("EXPORTED PROJECT "+state.project.name+" · overlay not included");
    return;
   }
   const patch=window.V6PPixelSource.patchObject(state.v6pPart,state.edits,toPNG);
   downloadText(JSON.stringify(patch,null,2)+"\n","PIXEL EDITS.JSON","application/json");
   await downloadV6pSheet();
   status("EXPORTED "+patch.frames.length+" FRAME EDITS + "+window.V6PPartCatalog.filename(state.v6pPart));
   return;
  }
  const patch=patchObject();core.validatePatch(patch);
  downloadText(JSON.stringify(patch,null,2)+"\n","otis_pixel_edits.json","application/json");status("EXPORTED "+patch.frames.length+" PIXEL FRAMES / SHARE FILE IN CHAT TO PUBLISH");};
 $("import-patch").onclick=()=>$("patch-file").click();
 $("patch-file").onchange=async e=>{const file=e.target.files?.[0];if(!file)return;
  try{if(file.size>15000000)throw Error("Patch larger than 15 MB");const data=JSON.parse(await file.text());await importObject(data);}
  catch(error){status("IMPORT FAILED: "+error.message,true);}finally{e.target.value="";}};
 $("clear-draft").onclick=()=>{
  if(state.source==="v6p"){
   if(state.actClip){
    if(state.actClip.id==="clip_pushup"){status("Cannot delete the pushup pilot clip",true);return;}
    if(!window.confirm("Hapus clip lokal "+state.actClip.name+"?"))return;
    clearTimeout(localTimer);stopClipPlay();
    window.V6PClipStore.remove(state.actClip.id);
    state.actClip=null;location.href="./pixel-editor.html?source=v6p&new=clip";
    return;
   }
   if(state.project){
    if(!window.confirm("Hapus proyek lokal "+state.project.name+"? File stock tidak diubah."))return;
    clearTimeout(localTimer);
    window.V6PProjectCatalog.remove(state.project.id);
    state.project=null;location.href="./pixel-editor.html?source=v6p";
    return;
   }
   if(!window.confirm("Hapus override lokal untuk "+state.v6pPart+"? File media asli tidak diubah."))return;
   clearTimeout(localTimer);
   if(state.characterId&&window.V6PCharacterStore) window.V6PCharacterStore.resetPart(state.characterId,state.v6pPart);
    else if(window.V6PPartOverrides)window.V6PPartOverrides.clear(state.v6pPart);
   loadV6pPart(state.v6pPart).then(()=>status("LOCAL V6P OVERRIDE DELETED / "+state.v6pPart));
   return;
  }
  if(!window.confirm("Discard all LOCAL Otis pixel edits? Existing files already downloaded will remain."))return;
  clearTimeout(localTimer);state.edits.clear();state.masterDiff.clear();state.history=[];state.redo=[];historyButtons();localStorage.removeItem(LOCAL);navigate();updateCounts();status("LOCAL DRAFT DELETED");};
 display.addEventListener("pointerdown",editStart);display.addEventListener("pointermove",editMove);
 display.addEventListener("pointerup",editEnd);display.addEventListener("pointercancel",editEnd);
 document.addEventListener("keydown",e=>{
  if(e.target.matches("input,textarea,select"))return;
  const k=e.key.toLowerCase(),mod=e.ctrlKey||e.metaKey;
  if(mod&&k==="z"){e.preventDefault();historyApply(e.shiftKey?false:true);return;}
  if(mod&&k==="c"){e.preventDefault();copySelection();return;}
  if(mod&&k==="x"){e.preventDefault();cutSelection();return;}
  if(mod&&k==="v"){e.preventDefault();pasteSelection(e.shiftKey);return;}
  if(mod&&k==="a"){e.preventDefault();selectAll();return;}
  if(e.altKey||mod)return;
  if(e.key==="Delete"){e.preventDefault();clearSelectionPixels();return;}
  if(k==="enter"&&state.cursorMode){e.preventDefault();cursorTap();return;}
  const b={b:"pencil",e:"erase",i:"pick",g:"fill",s:"select",w:"wand",m:"move"}[k];
  if(b){document.querySelector('[data-tool="'+b+'"]').click();}
 });
}
async function init(){
 bootEmosiEditor();
 initControls();fitMobileZoom();render();fillV6pPartSelect();
 window.addEventListener("resize",()=>{fitMobileZoom();});
 if(window.VLCharacterReferenceReset?.active){
  $("source-state").textContent=window.VLCharacterReferenceReset.message;
  status(window.VLCharacterReferenceReset.message);return;
 }
 const params=new URLSearchParams(location.search);
 const qPart=params.get("part"),qSource=params.get("source");
 state.masterMode=params.get("master")==="1"&&params.get("character")!=null;
 if(state.masterMode&&qSource==="v6p"){params.set("action","idle");params.set("frame","0")}
 state.characterId=/^mh2_[a-z0-9]+$/.test(params.get("character")||"")&&window.V6PCharacterStore?.get(params.get("character"))?params.get("character"):"";
 if(qSource==="v6p"||(qPart&&window.V6PPartCatalog&&window.V6PPartCatalog.isPart(qPart))||params.get("project")||params.get("new")){
  try{
   if(params.get("project")){
    const pid=params.get("project");
    if(window.V6PClipStore&&window.V6PClipStore.get(pid)) await loadActClip(pid);
    else await loadProject(pid,params);
   }else if(params.get("new")==="clip"){
    const rec=createActClip(params.get("name")||"Clip baru");
    await loadActClip(rec.id);
   }else if(params.get("new")==="accessory"){
    const created=window.V6PProjectCatalog.create({
     type:"accessory",
     name:params.get("name")||"Aksesoris baru",
     placement:params.get("placement")==="back"?"back":"front"
    });
    await loadProject(created.id,params);
   }else await loadV6pPart(qPart||"top/nude",params);
   refreshToolState();fitMobileZoom();
  }catch(e){status("V6P SOURCE FAILED: "+e.message,true);}
  return;
 }
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
  await navigate();modeUI();refreshToolState();fitMobileZoom();$("source-state").textContent=state.clips.length+" ORIGINAL OTIS ACTIONS";
  try{const draft=localStorage.getItem(LOCAL)||localStorage.getItem(OLD_LOCAL);if(draft)await importObject(JSON.parse(draft),true);}
  catch(e){status("DRAFT INVALID (SOURCE SAFE) / "+e.message,true);}
 }catch(e){status("EDITOR NOT READY: "+e.message,true);}
}
window.VirtualLifePixelEditor={
 async flush(){
  cancelTemporaryMove();await state.syncPromise;
  if(!state.loading)saveCurrent();
  clearTimeout(localTimer);
  if(state.source==="v6p"){persistV6pOverride();return;}
  try{localStorage.setItem(LOCAL,JSON.stringify(patchObject()));}
  catch(error){status("LOCAL SAVE FAILED: EXPORT YOUR PATCH JSON",true);throw error;}
 }
};
window.addEventListener("pagehide",()=>{if(state.loading)return;
 cancelTemporaryMove();
 try{
  if(state.source==="v6p")persistV6pOverride();
  else localStorage.setItem(LOCAL,JSON.stringify(patchObject()));
 }catch(error){/* user can still explicitly export a patch */}});
init();
})();