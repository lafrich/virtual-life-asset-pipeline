/* Mahluk Hidup 2.0: non-destructive source-native 2.5D plane studio.
   Shared-origin bridge: localStorage["mahluk-2-library-v1"].
   All art comes from the published V6B split atlas, never a redrawn mannequin. */
(function(window){
"use strict";
const R=window.VLModularRigV2,E=window.MH2EmotionPlanes,G=window.MH2RigRules,B=window.MH2BodyPlanes,P=window.MH2PlanePixelEditor,V=window.MH2ViewProjection,S=window.MH2MasterGithub,U=window.MH2UniversalEmotions,D=window.MH2DriveSync,EP=window.MH2EmotionPreview;
const $=id=>document.getElementById(id);
const DIR=["se","sw","ne","nw"], FACE=new Set(["eye_l","eye_r","brow_l","brow_r","nose","mouth","blush_l","blush_r"]);
const STORAGE="mahluk-2-library-v1", DRAFT="mahluk-2-draft-v1";
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number(x)||0));
const clone=x=>JSON.parse(JSON.stringify(x));
const GROUPS=[
["ROOT / BODY",["root","pelvis","torso","neck"]],
["HEAD / FACE & ACCESSORY",["head","emotion","glasses","hair_back","hair_cap","fringe_l","fringe_mid","fringe_r"]],
["LEFT ARM",["shoulder_l","elbow_l","wrist_l"]],
["RIGHT ARM",["shoulder_r","elbow_r","wrist_r"]],
["LEFT LEG",["hip_l","knee_l","ankle_l"]],
["RIGHT LEG",["hip_r","knee_r","ankle_r"]],
["ACCESSORIES",["phone"]]
];
let manifest=null,images=new Map(),slots=[],sourceError="";
let emotionAssetId="native:neutral",emotionKeys=[],glassesAssetId="native",userAssets=[],publishedAssets=[],nativeFaces=new Map(),importedImages=new Map(),publishedImages=new Map();
let state=R?.referencePose?.()||null,base=R?.referencePose?.()||null,tracks=R?.makeTracks?.()||{};
let selected="head",direction="se",type="original",outfit="outfit",bodyPlane="current",clip="idle",frame=0,frames=12,fps=12,playing=false,playSince=0,zoom=3.25;
let camera={x:0,y:0},view="iso",axis="x",transformMode="move",drag=null,identifier=null;
let inspectPlaneDepth=false,planeGap=2,orbitTool=false,selectMode=false; // Viewer-only camera and direct-selection state.
let rigRules=R&&G?G.defaults(R):null;
let pixelPlanes={},planeImages=new Map(),planeImageRevision=0,planeEditor=null;
let undoStack=[],redoStack=[],restoring=false,pinch=null;
let githubMessage='Checking GitHub master...';
const emotionDatabase=new Map(),emotionFrames=new Map();
let emotionDatabaseLoading=false;
let emotionPlacement=EP?EP.placement():null;
let emotionPreviewFrame=0,emotionPreviewPlaying=true,emotionPreviewLoop=true,emotionPreviewElapsed=0,emotionPreviewDragging=null;
const emotionPreviewCanvas=$('emotionPreviewCanvas');
let emotionPreviewSource='starter';
function activeEmotionPlacement(dir=direction){return emotionPlacement?.[dir]||{x:0,y:0,scale:1};}
function setEmotionPreviewTab(tab){
 const inspector=document.querySelector('.inspector');
 inspector.dataset.inspectorTab=tab==='emotion'?'emotion':'rig';
 for(const button of inspector.querySelectorAll('[data-inspector-toggle]')){
  const active=button.dataset.inspectorToggle===inspector.dataset.inspectorTab;
  button.classList.toggle('active',active);
  button.setAttribute('aria-pressed',String(active));
 }
 if(inspector.dataset.inspectorTab==='emotion')paint();
}
function updateEmotionPlacementFields(){
 const place=activeEmotionPlacement();
 if(!$('emotionOffsetX'))return;
 $('emotionOffsetX').value=Number(place.x.toFixed(1));
 $('emotionOffsetY').value=Number(place.y.toFixed(1));
 $('emotionScale').value=Number(place.scale.toFixed(2));
 for(const item of document.querySelectorAll('[data-emo-dir]'))
  item.classList.toggle('active',item.dataset.emoDir===direction);
}
function updateEmotionPreviewUI(){
 const asset=getEmotionAsset(emotionAt()),count=Math.max(1,asset?.frames||1);
 const rate=Math.round(clamp(asset?.fps||6,1,30));
 emotionPreviewFrame=Math.min(emotionPreviewFrame,count-1);
 if($('emotionPreviewScrub')){
  $('emotionPreviewScrub').max=String(count-1);
  $('emotionPreviewScrub').value=String(emotionPreviewFrame);
  $('emotionPreviewReadout').textContent='FRAME '+(emotionPreviewFrame+1)+'/'+count+
   ' · '+rate+' FPS · '+direction.toUpperCase();
  $('emotionPreviewPlay').textContent=emotionPreviewPlaying?'Ⅱ PAUSE':'▶ PLAY';
 }
 updateEmotionPlacementFields();
}

let cloudRecords=new Map();
let workspaceSaveTimer=null,workspaceDirty=false;
const touchPoints=new Map(),MAX_UNDO=70;
const studio=$("editor"),game=$("game");
function snapshot(){
 return clone({state,base,tracks,rigRules,pixelPlanes,emotionAssetId,emotionKeys,emotionPlacement,glassesAssetId,
  selected,type,outfit,bodyPlane,clip,frames,fps,frame,identifier,characterName:$("characterName").value});
}

function workspaceDraftDocument(){
 return {format:"mahluk-2-workspace-draft-v1",workspace:snapshot(),
  savedAt:new Date().toISOString()};
}
function flushWorkspaceDraft(){
 if(!manifest)return null;
 if(workspaceSaveTimer){clearTimeout(workspaceSaveTimer);workspaceSaveTimer=null}
 const doc=workspaceDraftDocument();
 try{localStorage.setItem(DRAFT,JSON.stringify(doc))}
 catch(e){setStatus("WORKSPACE BACKUP FAILED: "+e.message,false);return null}
 return doc;
}
function scheduleWorkspaceDraftSave(){
 if(restoring||!manifest)return;
 workspaceDirty=true;
 if(workspaceSaveTimer)clearTimeout(workspaceSaveTimer);
 workspaceSaveTimer=setTimeout(()=>{
  workspaceSaveTimer=null;
  const doc=flushWorkspaceDraft();
  if(doc)window.dispatchEvent(new CustomEvent("mahluk2:workspace-draft-edited",{detail:{doc}}));
 },3400);
}

function historyButtons(){
 $("undo").disabled=!undoStack.length;$("redo").disabled=!redoStack.length;
}
function remember(){
 if(restoring||!manifest)return;
 const value=snapshot(),last=undoStack[undoStack.length-1];
 if(last&&JSON.stringify(last)===JSON.stringify(value))return;
 undoStack.push(value);if(undoStack.length>MAX_UNDO)undoStack.shift();
 redoStack=[];historyButtons();scheduleWorkspaceDraftSave();
}
function restore(snapshotValue){
 restoring=true;playing=false;$("play").textContent="▶ PLAY";
 try{
  state=R.normalize(snapshotValue.state);base=R.normalize(snapshotValue.base);
  tracks=clone(snapshotValue.tracks);rigRules=G.normalize(snapshotValue.rigRules,R);
  setPixelPlanes(snapshotValue.pixelPlanes||{});
  emotionAssetId=snapshotValue.emotionAssetId||'native:neutral';
  emotionKeys=clone(snapshotValue.emotionKeys||[]);
  emotionPlacement=EP.placement(snapshotValue.emotionPlacement);
  emotionPreviewFrame=0;emotionPreviewElapsed=0;
  glassesAssetId=snapshotValue.glassesAssetId;
  selected=snapshotValue.selected;type=snapshotValue.type;outfit=snapshotValue.outfit;
  bodyPlane=B.normalize(snapshotValue.bodyPlane);
  clip=snapshotValue.clip;frames=snapshotValue.frames;fps=snapshotValue.fps;
  frame=snapshotValue.frame;identifier=snapshotValue.identifier;
  $("characterName").value=snapshotValue.characterName;
  assetOptions();updateLibrary();applyState();
 }finally{restoring=false;historyButtons()}
}
function undo(){
 if(!undoStack.length)return;
 redoStack.push(snapshot());restore(undoStack.pop());setStatus("↶ UNDO · PREVIOUS RIG STATE");
}
function redo(){
 if(!redoStack.length)return;
 undoStack.push(snapshot());restore(redoStack.pop());setStatus("↷ REDO · NEXT RIG STATE");
}
function masterDocument(){return G.read(window.localStorage,R)}
function masterMessage(){
 const doc=masterDocument(),published=S?.last(localStorage);
 $("masterStatus").textContent=doc?
  "GENERAL BASE v"+doc.revision+" · "+(published?.savedAt===doc.savedAt?"GITHUB PUBLISHED":"LOCAL ONLY / NOT PUBLISHED")+
  " · "+new Date(doc.savedAt).toLocaleString()+" · New characters inherit this skeleton.":
  "NO GENERAL BASE SAVED · Save the edited PC T-pose as General Default Rig.";
 $("githubMasterStatus").textContent=githubMessage;
}
function githubInfo(text){githubMessage=text;if($("githubMasterStatus"))$("githubMasterStatus").textContent=text;}
async function loadGithubMaster(initial=false){
 try{
  const item=await S.remote();
  if(!item.doc){githubInfo("GitHub master not published yet. Your local edits are safe.");return false;}
  const current=masterDocument();
  if(initial&&!S.adopt(current,item.doc,S.last(localStorage))){
   githubInfo("Unsynced local master preserved. Publish it from PC or choose LOAD GITHUB.");return false;
  }
  if(!initial&&current?.savedAt!==item.doc.savedAt&&
    !window.confirm("Replace your open rig/pose with the GitHub master? Export first if needed."))return false;
  if(current?.savedAt!==item.doc.savedAt&&!localStorage.getItem("mahluk-2-master-local-backup-v1"))
   localStorage.setItem("mahluk-2-master-local-backup-v1",JSON.stringify(current));
  localStorage.setItem(G.KEY,JSON.stringify(item.doc));S.mark(localStorage,item);
  if(!initial){
   remember();rigRules=G.normalize(item.doc.rules,R);setPixelPlanes(item.doc.pixelPlanes||{});
   base=R.normalize({parts:item.doc.defaultParts});state=R.normalize(base);
   tracks=R.makeTracks();frame=0;frames=1;buildTree();applyState();
  }
  githubInfo("✓ GitHub universal master v"+item.doc.revision+" loaded · 4 views");
  masterMessage();return true;
 }catch(err){githubInfo("GitHub load failed; local edits safe · "+err.message);return false;}
}
async function publishGithubMaster(){
 const doc=masterDocument();
 if(!S.connected()){githubInfo("Connect GitHub with a write token before publishing.");return false;}
 if(!doc){githubInfo("Save your General Default Rig before publishing.");return false;}
 githubInfo("Publishing master to GitHub...");
 try{
  const result=await S.publish(doc,localStorage);
  localStorage.setItem(G.KEY,JSON.stringify(result.doc));S.mark(localStorage,result);
  githubInfo("✓ UNIVERSAL MASTER PUBLISHED v"+result.doc.revision+" · PC / HP will load it");
  masterMessage();setStatus("✓ GITHUB MASTER PUBLISHED",true);return true;
 }catch(err){githubInfo("NOT PUBLISHED · LOCAL EDITS SAFE · "+err.message);masterMessage();return false;}
}
async function connectGithubMaster(){
 const input=$("githubMasterToken");
 try{
  S.authorize(input.value);input.value="";
  await S.remote(true);
  githubInfo("GitHub connected for this tab. Click PUBLISH MASTER or save the General Default Rig.");
 }catch(err){S.unauthorize();input.value="";githubInfo("GitHub authorization failed · "+err.message);}
}
function zoomTo(next,atX,atY){
 const before=zoom,after=clamp(next,.7,12);
 if(before===after)return;
 const {w,h,dpr}=stageDimensions(),
  x=Number.isFinite(atX)?atX:w/2,y=Number.isFinite(atY)?atY:h/2;
 const bx=w/2+camera.x,by=h/2+camera.y;
 camera.x+=(x-bx)*(1-after/before);
 camera.y+=(y-by)*(1-after/before);
 zoom=after;$("zoomLabel").textContent=Math.round(zoom/3.25*100)+"%";paint();
}

function setStatus(t,ok){$("status").textContent=t;if(ok!==undefined){$("syncLed").classList.toggle("ok",!!ok);$("syncLabel").textContent=ok?"GAME STORAGE READY":"SOURCE UNAVAILABLE";}}
function safeGet(k,def){try{return JSON.parse(localStorage.getItem(k)||"null")??def}catch{return def}}
function safePut(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){setStatus("STORAGE FULL / DISABLED: "+e.message,false);return false}}
function getLocalLibrary(){
 const a=safeGet(STORAGE,[]);
 return Array.isArray(a)?a.filter(r=>r&&r.format==="mahluk-2-character-v1").slice(0,40):[];
}
function getLibrary(){
 const local=getLocalLibrary();
 const merged=new Map(local.map(r=>[r.id,r]));
 for(const [id,r] of cloudRecords)merged.set(id,r);
 return [...merged.values()];
}
function pixelPlaneStatus(){
 if(!$("pixelPlaneStatus"))return;
 const count=Object.keys(pixelPlanes).length,has=Object.hasOwn(pixelPlanes,selected);
 $("pixelPlaneStatus").textContent=has?
  "EDITED PIXELS · "+selected.toUpperCase()+" · "+count+" CUSTOM PLANE(S)":
  "SOURCE PIXELS · "+count+" OTHER CUSTOM PLANE(S)";
}
function setPixelPlanes(values){
 pixelPlanes=G.sanitizePixelPlanes(values,R);
 const revision=++planeImageRevision;planeImages.clear();
 for(const [id,png] of Object.entries(pixelPlanes)){
  const img=new Image();
  img.onload=()=>{
   if(revision!==planeImageRevision)return;
   if(img.naturalWidth===64&&img.naturalHeight===448)planeImages.set(id,img);
   pixelPlaneStatus();paint();
  };
  img.onerror=()=>setStatus("INVALID PIXEL PLANE "+id,false);
  img.src=png;
 }
 pixelPlaneStatus();
}
function setPlanePixel(id,png){
 const valid=G.sanitizePixelPlanes({[id]:png},R);
 if(!valid[id]){setStatus("PIXEL PLANE TOO LARGE OR INVALID",false);return false}
 remember();pixelPlanes[id]=png;
 const img=new Image(),revision=planeImageRevision;
 img.onload=()=>{
  if(revision!==planeImageRevision||pixelPlanes[id]!==png)return;
  if(img.naturalWidth!==64||img.naturalHeight!==448){
   setStatus("PIXEL PLANE MUST BE 64×448 PNG",false);return;
  }
  planeImages.set(id,img);pixelPlaneStatus();paint();
 };
 img.src=png;
 pixelPlaneStatus();
 setStatus("✓ PIXEL EDIT APPLIED TO "+id.toUpperCase()+" · SAVE AS GENERAL DEFAULT TO REUSE",true);
 return true;
}
function nativePlaneAtlas(id){
 const c=document.createElement("canvas");c.width=64;c.height=448;
 const ctx=c.getContext("2d");ctx.imageSmoothingEnabled=false;
 for(let d=0;d<4;d++){
  const direction=DIR[d],offset=d*112;
  if(id==="emotion"||id==="glasses"){
   const asset=id==="emotion"?getEmotionAsset(emotionAt()):getGlassesAsset(glassesAssetId);
   const src=sourceImage(asset,direction,frame);
   if(src)ctx.drawImage(src.image,src.sx,src.sy,64,112,0,offset,64,112);
   continue;
  }
  for(const slot of slots){
   if(slot.bone!==id||E.slotKind(slot)||!slotAllowed(slot))continue;
   const image=images.get(slot.src);
   if(image)ctx.drawImage(image,0,offset,64,112,0,offset,64,112);
  }
 }
 return c;
}
function fullCharacterReference(dir=direction){
 const ref=document.createElement("canvas");ref.width=64;ref.height=112;
 renderLayers(ref.getContext("2d"),dir,0,0,1,false);
 return ref;
}
function openPlaneEditor(){
 if(selected==="emotion"){
  setStatus("EMOTION IS READ-ONLY HERE · OPEN EMOTION STUDIO TO EDIT FACE PIXELS",true);return;
 }
 if(!manifest||!planeEditor||!R.BMAP[selected]||G.HIDDEN.has(selected))return;
 if(!renderableIds().includes(selected)){
  setStatus("SELECT A DRAWABLE PLANE, LIKE WRIST L / WRIST R / HEAD, NOT A RIG CONTROL",false);return;
 }
 const source=nativePlaneAtlas(selected),src=planeImages.get(selected);
 const refs=Object.fromEntries(DIR.map(dir=>[dir,fullCharacterReference(dir)]));
 planeEditor.open({id:selected,originalAtlas:source,initialAtlas:src||source,
  referenceImages:refs,referenceImage:refs[direction],direction});
}
function clearPlanePixel(){
 if(selected==="emotion"){setStatus("EMOTION PIXELS ARE OWNED BY EMOTION STUDIO",true);return}
 if(!pixelPlanes[selected])return;
 remember();delete pixelPlanes[selected];planeImages.delete(selected);
 buildTree();pixelPlaneStatus();paint();
 setStatus("SOURCE PIXELS RESTORED FOR "+selected.toUpperCase()+" · SAVE GENERAL DEFAULT TO UPDATE MASTER",true);
}

function slotAllowed(s){
 return B.selected(s,{base:type,outfit,bodyPlane});
}
function activeSlots(){return slots.filter(slotAllowed)}
function faceEmotion(s){return state.faceLayers?.[s.bone]||state.emotion||"neutral"}
function partWorld(){return G.world(state,rigRules,R)}
function renderableIds(){
 const scene=manifest?G.world(state,rigRules,R):{},rows=[];let last=0;
 for(let i=0;i<slots.length;i++){
  const s=slots[i],kind=E.slotKind(s);
  const id=kind==="emotion"?"emotion":kind==="glasses"?"glasses":s.bone;
  if(!id||G.HIDDEN.has(id)||(!kind&&!slotAllowed(s)))continue;
  rows.push({id,i:B.drawIndex(s,i,slots,bodyPlane,type),z:(scene[id]?.z||0)+(type!=="original"&&kind?20:0)});
  last=i;
 }
 for(const id of ["emotion","glasses",...Object.keys(pixelPlanes)]){
  if(!rows.some(r=>r.id===id))rows.push({id,i:++last,z:(scene[id]?.z||0)+(type!=="original"?20:0)});
 }
 rows.sort((a,b)=>a.z-b.z||a.i-b.i);
 return [...new Set(rows.map(r=>r.id))];
}
function visualPlaneOrder(dir){
 const ids=G.effectiveOrder(rigRules,renderableIds()),world=partWorld();
 return ids.slice().sort((a,b)=>{
  const diff=V.depth(world[a],dir)-V.depth(world[b],dir);
  return Math.abs(diff)>0.001?diff:ids.indexOf(a)-ids.indexOf(b);
 });
}
function getEmotionAsset(id){
 if(typeof id!=="string")return null;
 if(id.startsWith("native:")){
  // Only neutral remains a local fallback. Authored emotions live in Emotion Studio.
  const name=id.slice(7);
  return name==="neutral"&&(manifest?.emotions||[]).includes(name)?{id,frames:1,native:name}:null;
 }
 return emotionDatabase.get(id)||publishedAssets.find(a=>a.id===id&&a.base===type)||
  userAssets.find(a=>a.id===id&&a.kind==="emotion")||null;
}
function getGlassesAsset(id){
 if(id==="none"||id==="native")return {id,frames:1};
 return userAssets.find(a=>a.id===id&&a.kind==="glasses")||null;
}
function emotionAt(f=frame){
 const proposed=E.sample(emotionKeys,f,emotionAssetId);
 return getEmotionAsset(proposed)?proposed:emotionAssetId;
}
function faceSource(direction,emotion){
 const key=direction+":"+emotion;
 if(!nativeFaces.has(key))nativeFaces.set(key,E.makeNativePlane(slots,images,direction,emotion,manifest));
 return nativeFaces.get(key);
}
function sourceImage(asset,dir,f){
 if(!asset)return null;
 if(asset.native)return {image:faceSource(dir,asset.native),sx:0,sy:0};
 if(asset.id==="native"){
  const slot=slots.find(E.glassesSlot),img=slot&&images.get(slot.src);
  return img?{image:img,sx:0,sy:DIR.indexOf(dir)*112}:null;
 }
 if(asset.id==="none")return null;
 const img=asset.database?emotionFrames.get(asset.id):(asset.src?publishedImages:importedImages).get(asset.id);
 return img?{image:img,sx:(f%asset.frames)*64,sy:DIR.indexOf(dir)*112}:null;
}
function renderLayers(ctx,dir,ox,oy,mag,editorMode,hitOut=null){
 const world=partWorld(),mirror=V.config(dir).mirror,di=DIR.indexOf(dir);
 // Explode the individual source planes only in this editor viewport.
 // Export/preview always draws the real world coordinates with gap=0.
 const exploding=Boolean(editorMode&&view==="iso"&&inspectPlaneDepth&&planeGap>0);
 const rankIds=exploding?visualPlaneOrder(dir):null;
 const ordered=[];let faceAdded=false,glassesAdded=false;
 for(let i=0;i<slots.length;i++){
  const s=slots[i],kind=E.slotKind(s);
  if(kind==="emotion"){
   if(!faceAdded){ordered.push({kind:"emotion",bone:"emotion",i});faceAdded=true}
   continue;
  }
  if(kind==="glasses"){
   if(!glassesAdded){ordered.push({kind:"glasses",bone:"glasses",i});glassesAdded=true}
   continue;
  }
  // Native Human anatomy contains neutral eye/mouth cutouts. Suppress
  // them: one explicit Emotion Plane owns the whole face, never the rig.
  if(type!=="original"&&FACE.has(s.bone))continue;
  if(slotAllowed(s))ordered.push({kind:"body",bone:s.bone,
   i:B.drawIndex(s,i,slots,bodyPlane,type),s});
 }
 if(!faceAdded)ordered.push({kind:"emotion",bone:"emotion",i:slots.length+1});
 if(!glassesAdded)ordered.push({kind:"glasses",bone:"glasses",i:slots.length+2});
 // A pixel-painted plane replaces ALL native cutouts belonging to the
 // selected bone, including erased transparency. Never double-paint both.
 for(const [id,image] of planeImages){
  if(!R.BMAP[id]||G.HIDDEN.has(id)||!image)continue;
  const matching=ordered.filter(item=>item.bone===id);
  const idx=matching.length?matching[matching.length-1].i:slots.length+3+R.BONES.findIndex(b=>b.id===id);
  for(let k=ordered.length-1;k>=0;k--)if(ordered[k].bone===id)ordered.splice(k,1);
  ordered.push({kind:"pixel",bone:id,i:idx});
 }
 const ids=renderableIds();
 ordered.sort((a,b)=>{
  // Depth is a single shared world coordinate, but the camera sees the
  // opposite stacking order from behind. Do not keep front painter
  // order when an actual Z difference is present.
  const za=V.depth(world[a.bone],dir),zb=V.depth(world[b.bone],dir);
  if(Math.abs(za-zb)>0.001)return za-zb;
  if(rigRules.order.length){
   const ra=G.layerRank(rigRules,a.bone,ids),rb=G.layerRank(rigRules,b.bone,ids);
   return ra-rb||a.i-b.i;
  }
  const fa=type!=="original"&&(a.kind==="emotion"||a.kind==="glasses")?20:0;
  const fb=type!=="original"&&(b.kind==="emotion"||b.kind==="glasses")?20:0;
  return fa-fb||a.i-b.i;
 });
 for(const item of ordered){
  const bone=R.BMAP[item.bone],p=world[item.bone];
  if(!p?.visible||!bone)continue;
  let src;
  if(item.kind==="pixel"){
   const image=planeImages.get(item.bone);
   src=image?{image,sx:0,sy:di*112}:null;
  }
  else if(item.kind==="emotion")src=sourceImage(getEmotionAsset(emotionAt()),dir,emotionPreviewFrame);
  else if(item.kind==="glasses")src=sourceImage(getGlassesAsset(glassesAssetId),dir,frame);
  else {
   const image=images.get(item.s.src);
   src=image?{image,sx:0,sy:di*112}:null;
  }
  if(!src)continue;
  // Each source RGBA occupies exactly one plane with independent transform.
  // Emotion and glasses are sibling children of head (not face micro-bones).
  const pivot=rigRules.anchors[item.bone]||{x:bone.x,y:bone.y};
  const ax=mirror?64-pivot.x:pivot.x;
  const screen=V.planePosition(p,dir,view==="front"&&editorMode);
  const facePlace=item.kind==='emotion'?activeEmotionPlacement(dir):{x:0,y:0,scale:1};
  const rank=rankIds?rankIds.indexOf(item.bone):-1;
  const exploded=rank>=0?V.explosion(rank,rankIds.length,planeGap,dir):{x:0,y:0};
  const tx=ox+(screen.x+exploded.x+facePlace.x)*mag;
  const ty=oy+(screen.y+exploded.y+facePlace.y)*mag;
  const rad=(mirror?-1:1)*p.angle*Math.PI/180,planeScale=p.scale*facePlace.scale*mag;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.translate(tx,ty);
  ctx.rotate(rad);
  ctx.scale(planeScale,planeScale);
  ctx.drawImage(src.image,src.sx,src.sy,64,112,-ax,-pivot.y,64,112);
  if(hitOut)hitOut.push({bone:item.bone,src,tx,ty,rad,planeScale,ax,ay:pivot.y});
  if(exploding&&rank>=0){
   // Thin outlines reveal each distinct RGBA plane without altering it.
   ctx.strokeStyle=item.bone===selected?"rgba(255,211,117,.92)":"rgba(133,191,242,.24)";
   ctx.lineWidth=(item.bone===selected?1:0.45)/Math.max(0.001,p.scale*mag);
   ctx.strokeRect(-ax,-pivot.y,64,112);
  }
  ctx.restore();
 }
}
function stageDimensions(){
 const dpr=Math.min(2,window.devicePixelRatio||1),rect=studio.getBoundingClientRect();
 const w=Math.max(280,Math.round(rect.width*dpr)),h=Math.max(210,Math.round(rect.height*dpr));
 if(studio.width!==w||studio.height!==h){studio.width=w;studio.height=h}
 return {w,h,dpr};
}
function center(w,h,scale){
 return {x:w/2-32*scale+camera.x,y:h/2-56*scale+camera.y};
}
function projectBone(w,h,scale,bone,explode=true){
 const p=partWorld()[bone],b=R.BMAP[bone];if(!p||!b)return null;
 const c=center(w,h,scale),screen=V.planePosition(p,direction,view==="front");
 const ids=explode&&view==="iso"&&inspectPlaneDepth?visualPlaneOrder(direction):[];
 const rank=ids.indexOf(bone),gap=rank>=0?
  V.explosion(rank,ids.length,planeGap,direction):{x:0,y:0};
 return {x:c.x+(screen.x+gap.x)*scale,
 y:c.y+(screen.y+gap.y)*scale};
}
function line(ctx,x,y,x2,y2,color,width=1){
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();
}
function drawGrid(ctx,w,h,scale){
 const p=center(w,h,scale),floorY=p.y+100*scale;
 ctx.save();ctx.globalAlpha=.4;
 if(view==="iso"){
  for(let i=-13;i<=13;i++){
   line(ctx,p.x+32*scale-400+i*31,floorY-135,p.x+32*scale+440+i*31,floorY+170,"#536d80",.7);
   line(ctx,p.x+32*scale-400+i*31,floorY+135,p.x+32*scale+440+i*31,floorY-170,"#536d80",.7);
  }
 }else{
  for(let y=0;y<h;y+=scale*10)line(ctx,0,y,w,y,"#506174",.6);
  for(let x=0;x<w;x+=scale*10)line(ctx,x,0,x,h,"#506174",.6);
 }
 line(ctx,p.x+32*scale-50,floorY,p.x+32*scale+50,floorY,"#99aabc",1.5);
 ctx.restore();
}
function arrows(ctx,pos,scale){
 const u=34*scale/3.25;
 if(transformMode==="anchor"){
  ctx.save();
  ctx.strokeStyle="#7cfff0";ctx.lineWidth=2.4;
  line(ctx,pos.x-13,pos.y,pos.x+13,pos.y,"#7cfff0",2.4);
  line(ctx,pos.x,pos.y-13,pos.x,pos.y+13,"#7cfff0",2.4);
  ctx.beginPath();ctx.arc(pos.x,pos.y,8,0,2*Math.PI);ctx.stroke();
  ctx.font="12px Consolas";ctx.fillStyle="#b3fff5";
  ctx.fillText("ANCHOR",pos.x+16,pos.y-9);ctx.restore();
  return [{id:"anchor",end:pos,color:"#7cfff0"}];
 }
 if(transformMode==="rotate"){
  ctx.save();ctx.strokeStyle="#eaba71";ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(pos.x,pos.y,u,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle="#eaba71";ctx.beginPath();ctx.arc(pos.x+u,pos.y,6,0,Math.PI*2);ctx.fill();
  ctx.font="12px Consolas";ctx.fillText("ROTATE",pos.x+u+8,pos.y-5);ctx.restore();
  return [{id:"rotate",end:{x:pos.x+u,y:pos.y},color:"#eaba71",center:pos,radius:u}];
 }
 if(transformMode==="scale"){
  ctx.save();ctx.strokeStyle="#d7b8ef";ctx.lineWidth=2;ctx.strokeRect(pos.x-14,pos.y-14,28,28);
  ctx.fillStyle="#d7b8ef";ctx.fillRect(pos.x+u-6,pos.y-u-6,12,12);
  ctx.font="12px Consolas";ctx.fillText("SCALE",pos.x+u+8,pos.y-u-5);ctx.restore();
  return [{id:"scale",end:{x:pos.x+u,y:pos.y-u},color:"#d7b8ef"}];
 }
 const dir=V.config(direction);
 const handles=[
  {id:"x",end:{x:pos.x+(dir.mirror?-u:u),y:pos.y},color:"#ff8b7d"},
  {id:"y",end:{x:pos.x,y:pos.y-u},color:"#7fda9a"},
  {id:"z",end:{x:pos.x+dir.zx*u*1.2,y:pos.y+dir.zy*u*1.2},color:"#76adfc"}
 ];
 ctx.save();ctx.font=Math.max(11,scale*3.1)+"px Consolas,monospace";
 for(const h of handles){
  line(ctx,pos.x,pos.y,h.end.x,h.end.y,h.color,axis===h.id?3.5:1.8);
  ctx.fillStyle=h.color;ctx.beginPath();ctx.arc(h.end.x,h.end.y,axis===h.id?6:4,0,Math.PI*2);ctx.fill();
  ctx.fillText(h.id.toUpperCase(),h.end.x+7,h.end.y-5);
 }
 ctx.fillStyle="#fff";ctx.strokeStyle="#182536";ctx.lineWidth=2;ctx.beginPath();ctx.arc(pos.x,pos.y,5,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.restore();
 return handles;
}
function drawPlaneDepthGuides(ctx,w,h,scale){
 if(!inspectPlaneDepth||view!=="iso"||planeGap<=0)return;
 const ids=visualPlaneOrder(direction),world=partWorld(),c=center(w,h,scale);
 ctx.save();ctx.setLineDash([4,4]);
 for(let n=0;n<ids.length;n++){
  const id=ids[n],p=world[id];
  if(!p?.visible)continue;
  const src=V.planePosition(p,direction,false);
  const sep=V.explosion(n,ids.length,planeGap,direction);
  const x1=c.x+src.x*scale,y1=c.y+src.y*scale;
  const x2=c.x+(src.x+sep.x)*scale,y2=c.y+(src.y+sep.y)*scale;
  if(id!==selected&&n%3!==0)continue;
  line(ctx,x1,y1,x2,y2,id===selected?"#edca7b":"#648da8",id===selected?1.6:.7);
  ctx.beginPath();ctx.arc(x1,y1,id===selected?3:1.8,0,2*Math.PI);
  ctx.fillStyle=id===selected?"#f5c778":"#7c99af";ctx.fill();
 }
 ctx.restore();
}
// Hit-test against the REAL alpha content of each transformed cutout.
const planeBoundsCache=new WeakMap();
const planeSampler=document.createElement("canvas");planeSampler.width=1;planeSampler.height=1;
const planeSamplerCtx=planeSampler.getContext("2d",{willReadFrequently:true});
function planeAlphaBounds(src){
 let slices=planeBoundsCache.get(src.image);
 if(!slices){slices=new Map();planeBoundsCache.set(src.image,slices)}
 const key=src.sx+":"+src.sy;
 if(slices.has(key))return slices.get(key);
 const tile=document.createElement("canvas");tile.width=64;tile.height=112;
 const c=tile.getContext("2d",{willReadFrequently:true});
 c.imageSmoothingEnabled=false;
 c.drawImage(src.image,src.sx,src.sy,64,112,0,0,64,112);
 const data=c.getImageData(0,0,64,112).data;
 let minX=64,minY=112,maxX=-1,maxY=-1;
 for(let y=0;y<112;y++)for(let x=0;x<64;x++){
  if(data[(y*64+x)*4+3]<16)continue;
  minX=Math.min(minX,x);minY=Math.min(minY,y);
  maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
 }
 const rect=maxX<0?null:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1};
 slices.set(key,rect);return rect;
}
function planeLocalAt(hit,x,y){
 const scale=hit.planeScale||1,dx=(x-hit.tx)/scale,dy=(y-hit.ty)/scale;
 const cos=Math.cos(hit.rad),sin=Math.sin(hit.rad);
 return {x:cos*dx+sin*dy+hit.ax,y:-sin*dx+cos*dy+hit.ay};
}
function planePixelAt(hit,x,y){
 const local=planeLocalAt(hit,x,y),ix=Math.floor(local.x),iy=Math.floor(local.y);
 if(ix<0||ix>=64||iy<0||iy>=112)return false;
 try{
  planeSamplerCtx.clearRect(0,0,1,1);
  planeSamplerCtx.imageSmoothingEnabled=false;
  planeSamplerCtx.drawImage(hit.src.image,hit.src.sx+ix,hit.src.sy+iy,1,1,0,0,1,1);
  return planeSamplerCtx.getImageData(0,0,1,1).data[3]>=16;
 }catch{return false}
}
function hitPlanesAt(point){
 const matches=[],seen=new Set();
 for(let i=lastPlaneHits.length-1;i>=0;i--){
  const hit=lastPlaneHits[i];
  if(seen.has(hit.bone))continue;
  if(!planePixelAt(hit,point.x,point.y))continue;
  matches.push(hit.bone);seen.add(hit.bone);
 }
 return matches;
}
function drawSelectedPlaneOutline(ctx,hits,id){
 const pieces=hits.filter(hit=>hit.bone===id);
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 for(const hit of pieces){
  const bounds=planeAlphaBounds(hit.src);
  if(!bounds)continue;
  const xs=[bounds.x-hit.ax,bounds.x+bounds.w-hit.ax];
  const ys=[bounds.y-hit.ay,bounds.y+bounds.h-hit.ay];
  for(const x of xs)for(const y of ys){
   const dx=x*hit.planeScale,dy=y*hit.planeScale;
   const px=hit.tx+Math.cos(hit.rad)*dx-Math.sin(hit.rad)*dy;
   const py=hit.ty+Math.sin(hit.rad)*dx+Math.cos(hit.rad)*dy;
   x0=Math.min(x0,px);y0=Math.min(y0,py);
   x1=Math.max(x1,px);y1=Math.max(y1,py);
  }
 }
 if(!Number.isFinite(x0))return;
 const pad=2;
 ctx.save();ctx.lineWidth=1.25;
 ctx.strokeStyle="#f7d57b";ctx.setLineDash([5,3]);
 ctx.strokeRect(Math.round(x0-pad)+.5,Math.round(y0-pad)+.5,
  Math.max(1,Math.round(x1-x0+pad*2)),Math.max(1,Math.round(y1-y0+pad*2)));
 ctx.setLineDash([]);
 const label=(R.BMAP[id]?.label||id).toUpperCase();
 ctx.font="bold 11px Tahoma,Arial,sans-serif";
 const labelWidth=ctx.measureText(label).width+12;
 const labelX=Math.max(4,Math.min(ctx.canvas.width-labelWidth-4,x0));
 const labelY=Math.max(4,y0-20);
 ctx.fillStyle="#f6d37e";ctx.fillRect(labelX,labelY,labelWidth,17);
 ctx.fillStyle="#12203c";ctx.fillText(label,labelX+6,labelY+12);
 ctx.restore();
}
let lastHandles=[],lastPlaneHits=[];
function drawEditor(){
 if(!state||!manifest)return;
 const {w,h,dpr}=stageDimensions(),ctx=studio.getContext("2d");
 ctx.clearRect(0,0,w,h);
 const mag=zoom*dpr,c=center(w,h,mag);
 drawGrid(ctx,w,h,mag);drawPlaneDepthGuides(ctx,w,h,mag);
 lastPlaneHits=[];renderLayers(ctx,direction,c.x,c.y,mag,true,lastPlaneHits);
 drawSelectedPlaneOutline(ctx,lastPlaneHits,selected);
 const target=projectBone(w,h,mag,selected);
 if(target){ctx.save();ctx.strokeStyle="#f8c576";ctx.lineWidth=1;ctx.setLineDash([4,3]);ctx.strokeRect(target.x-9,target.y-9,18,18);ctx.setLineDash([]);ctx.restore();lastHandles=arrows(ctx,target,mag)}
 else lastHandles=[];
 const p=state.parts[selected]||{},wp=partWorld()[selected];
 $("coords").textContent="X "+(p.x||0).toFixed(1)+" · Y "+(p.y||0).toFixed(1)+" · Z "+(p.z||0).toFixed(1);
 $("depthReadout").textContent="MASTER RIG · "+selected.toUpperCase()+
  " · LOCAL Z "+(p.z||0).toFixed(1)+
  " · WORLD Z "+(wp?.z||0).toFixed(1)+
  (inspectPlaneDepth&&view==="iso"?" · EXPLODED VIEW (PREVIEW ONLY)":" · SAME RIG IN ALL 4 VIEWS");
}
function drawGame(){
 if(!manifest||!state)return;
 const ctx=game.getContext("2d");ctx.clearRect(0,0,64,112);
 renderLayers(ctx,direction,0,0,1,false);
 // Each live angle receives the same shared rig state. Only the four
 // hand-authored source art atlas slices and camera projection differ.
 for(const [dir,id] of [["se","previewSE"],["sw","previewSW"],["ne","previewNE"],["nw","previewNW"]]){
  const canvas=$(id),preview=canvas.getContext("2d");
  preview.clearRect(0,0,64,112);
  renderLayers(preview,dir,0,0,1,false);
 }
}
function drawEmotionLivePreview(){
 if(!emotionPreviewCanvas||!manifest||!state)return;
 const tile=document.createElement('canvas');tile.width=64;tile.height=112;
 const ctx=tile.getContext('2d',{alpha:true});ctx.imageSmoothingEnabled=false;
 renderLayers(ctx,direction,0,0,1,false);
 const out=emotionPreviewCanvas.getContext('2d');
 out.imageSmoothingEnabled=false;
 out.clearRect(0,0,emotionPreviewCanvas.width,emotionPreviewCanvas.height);
 out.drawImage(tile,0,0,64,112,0,0,emotionPreviewCanvas.width,emotionPreviewCanvas.height);
 updateEmotionPreviewUI();
}
function paint(){drawEditor();drawGame();drawEmotionLivePreview();}
function axisButtons(){
 $("toolSelect").classList.toggle("active",selectMode);
 for(const tool of ["Move","Rotate","Scale","Anchor"])$("tool"+tool).classList.toggle("active",!selectMode&&transformMode===tool.toLowerCase());
 for(const id of ["x","y","z"])$("axis"+id.toUpperCase()).classList.toggle("active",axis===id);
 $("viewIso").classList.toggle("active",view==="iso");$("viewFront").classList.toggle("active",view==="front");
 $("togglePlaneDepth").classList.toggle("active",inspectPlaneDepth&&view==="iso");
 $("toolOrbit").classList.toggle("active",orbitTool);
 $("toolOrbit").setAttribute("aria-pressed",String(orbitTool));
 $("togglePlaneDepth").setAttribute("aria-pressed",String(inspectPlaneDepth&&view==="iso"));
 $("planeGap").disabled=view!=="iso"||!inspectPlaneDepth;
 $("planeGapLabel").textContent=Number(planeGap).toFixed(1);
 $("orbitDirectionLabel").textContent=direction.toUpperCase();
 for(const el of document.querySelectorAll("[data-dir],[data-orbit-dir],[data-preview-dir]")){
  const id=el.dataset.dir||el.dataset.orbitDir||el.dataset.previewDir;
  el.classList.toggle("active",id===direction);
 }
 $("viewHint").textContent=view==="iso"?
  "ISOMETRIC · SHARED RIG · "+direction.toUpperCase()+(inspectPlaneDepth?" · SEPARATED PLANES":""):
  "FRONT · SHARED ROOT · "+direction.toUpperCase();
}
function setDirection(dir){
 if(!DIR.includes(dir))return;
 direction=dir;axisButtons();paint();
}
function pick(id){
 if(!R.BMAP[id]||G.HIDDEN.has(id))return;
 selected=id;
 for(const element of document.querySelectorAll("[data-bone]"))
  element.classList.toggle("selected",element.dataset.bone===id);
 $("selectedName").textContent=R.BMAP[id].label;
 $("selectedPartChip").textContent="▣ SELECTED: "+R.BMAP[id].label.toUpperCase();
 const parent=rigRules.parents[id];
 $("selectedParent").textContent="PARENT: "+(parent||"SCENE ROOT");
 const select=$("parentBone");select.replaceChildren();
 if(id==="root"){
  const opt=document.createElement("option");opt.textContent="SCENE ROOT (fixed)";opt.value="";select.append(opt);
  select.disabled=true;
 }else{
  select.disabled=false;
  for(const b of R.BONES){
   if(G.HIDDEN.has(b.id)||!G.canParent(rigRules,id,b.id,R))continue;
   const opt=document.createElement("option");opt.value=b.id;opt.textContent=b.label;select.append(opt);
  }
  select.value=parent||"root";
 }
 const part=state.parts[id],anchor=rigRules.anchors[id];
 for(const [prop,el] of [["x","posX"],["y","posY"],["z","posZ"],["angle","angle"],["scale","scale"]])
  $(el).value=part[prop]??0;
 $("anchorX").value=anchor.x;
 $("anchorY").value=anchor.y;
 $("visible").checked=part.visible;
 const order=G.effectiveOrder(rigRules,renderableIds()),at=order.indexOf(id);
 $("layerBack").disabled=at<=0;$("layerFront").disabled=at<0||at===order.length-1;
 if($("emotionAsset"))$("emotionAsset").value=emotionAt();
 if($("glassesAsset"))$("glassesAsset").value=glassesAssetId;
 $("openPlaneEditor").disabled=id==="emotion"||!renderableIds().includes(id);
 $("editPixelPlane").disabled=id==="emotion"||!renderableIds().includes(id);
 pixelPlaneStatus();paint();
}
function moveLayer(id,delta){
 const current=G.effectiveOrder(rigRules,renderableIds()),at=current.indexOf(id);
 if(at<0||at+delta<0||at+delta>=current.length)return;
 remember();
 G.moveLayer(rigRules,id,delta,current);
 buildTree();setStatus("DRAW ORDER: "+id.toUpperCase()+" → "+(delta>0?"FRONT":"BACK"));
}
function buildDrawOrder(){
 const holder=$("layerOrder");holder.replaceChildren();
 const ids=G.effectiveOrder(rigRules,renderableIds());
 ids.slice().reverse().forEach((id,frontIndex)=>{
  const index=ids.indexOf(id),row=document.createElement("div");
  row.className="draw-row";row.draggable=true;row.dataset.plane=id;
  const button=document.createElement("button");button.type="button";
  button.className="draw-select"+(selected===id?" selected":"");
  button.dataset.bone=id;
  button.textContent=(frontIndex===0?"FRONT  ":String(frontIndex+1).padStart(2,"0")+"  ")+
   (R.BMAP[id]?.label||id).toUpperCase();
  button.onclick=()=>pick(id);
  const up=document.createElement("button");up.className="draw-step";
  up.textContent="↑";up.title="Bring "+id+" forward";up.disabled=index===ids.length-1;
  up.onclick=()=>moveLayer(id,1);
  const down=document.createElement("button");down.className="draw-step";
  down.textContent="↓";down.title="Send "+id+" backward";down.disabled=index===0;
  down.onclick=()=>moveLayer(id,-1);
  row.append(button,up,down);holder.append(row);
  row.addEventListener("dragstart",event=>event.dataTransfer.setData("text/plain","order:"+id));
  row.addEventListener("dragover",event=>{event.preventDefault();row.classList.add("drag-over")});
  row.addEventListener("dragleave",()=>row.classList.remove("drag-over"));
  row.addEventListener("drop",event=>{
   event.preventDefault();row.classList.remove("drag-over");
   const data=event.dataTransfer.getData("text/plain");
   if(!data.startsWith("order:"))return;
   const dragged=data.slice(6),order=G.effectiveOrder(rigRules,renderableIds());
   const source=order.indexOf(dragged),target=order.indexOf(id);
   if(source<0||target<0||source===target)return;
   remember();order.splice(source,1);
   order.splice(order.indexOf(id)+(source<target?1:0),0,dragged);
   rigRules.order=order;buildTree();
   setStatus("DRAW ORDER: MOVED "+dragged.toUpperCase());
  });
 });
}
function buildTree(){
 const holder=$("tree");holder.replaceChildren();
 const drawable=new Set(renderableIds());
 const valid=R.BONES.filter(b=>!G.HIDDEN.has(b.id));
 const ids=new Set(valid.map(b=>b.id)),children=new Map();
 for(const b of valid){
  const parent=ids.has(rigRules.parents[b.id])?rigRules.parents[b.id]:null;
  if(!children.has(parent))children.set(parent,[]);
  children.get(parent).push(b.id);
 }
 const visited=new Set();
 function node(id,depth){
  if(visited.has(id))return;
  visited.add(id);
  const b=R.BMAP[id],button=document.createElement("button");
  button.dataset.bone=id;button.type="button";button.draggable=id!=="root";
  button.style.paddingLeft=(12+Math.min(depth,9)*11)+"px";
  button.title=b.label+" · parent "+(rigRules.parents[id]||"scene")+" · drag onto another bone to reparent";
  const marker=document.createElement("span");
  marker.className="dot";marker.textContent=drawable.has(id)?"▣":"◇";
  const label=document.createElement("span");label.textContent=b.label.toUpperCase();
  const icon=document.createElement("span");icon.className="eye";
  icon.textContent=state.parts[id].visible?"◉":"○";
  button.append(marker,label,icon);holder.append(button);
  button.onclick=()=>pick(id);
  button.addEventListener("dragstart",e=>e.dataTransfer.setData("text/plain","node:"+id));
  button.addEventListener("dragover",e=>e.preventDefault());
  button.addEventListener("drop",e=>{
   e.preventDefault();
   const value=e.dataTransfer.getData("text/plain");
   if(!value.startsWith("node:"))return;
   const dragged=value.slice(5);
   if(!G.canParent(rigRules,dragged,id,R))return;
   remember();G.setParent(rigRules,dragged,id,R);buildTree();
   setStatus("RE-PARENTED "+dragged+" → "+id);
  });
  for(const child of children.get(id)||[])node(child,depth+1);
 }
 for(const root of children.get(null)||[])node(root,0);
 for(const b of valid)if(!visited.has(b.id))node(b.id,0);
 $("planeCount").textContent=String(drawable.size).padStart(2,"0");
 buildDrawOrder();
 if(!R.BMAP[selected]||G.HIDDEN.has(selected))selected="head";
 pick(selected);
}
function applyState(){
 setProjectFields();buildTree();makeTimeline();updateEmotionStatus();paint();
}
function setProjectFields(){
 $("modelType").value=type;$("outfit").value=outfit;
 $("outfit").disabled=type==="original"||bodyPlane!=="current";
 // Never offer the opposite sex anatomy for a Male/Female base.
 for(const opt of $("bodyPlane").options){
  opt.disabled=(type==="male"||type==="female")&&
    opt.value!=="current"&&opt.value!==type;
 }
 $("bodyPlane").value=bodyPlane;
 $("bodyPlaneHint").textContent=(type==="male"||type==="female")?
  "AUTO "+type.toUpperCase()+" / matching nude anatomy. Select CURRENT to keep clothing. Rig and head remain unchanged.":
  "Original base / choose a nude anatomy source, or keep the original body.";
 $("clip").value=clip;$("frameCount").value=frames;$("fps").value=fps;
}
function showTimeline(f){
 frame=Math.round(clamp(f,0,frames-1));
 state=R.sampleTrack(tracks,frame,frames,base);
 pick(selected);updateEmotionStatus();makeTimeline();paint();
}
function makeTimeline(){
 const ruler=$("ruler");ruler.replaceChildren();
 const title=document.createElement("div");title.className="ruler-label";title.textContent="FRAME / PART";ruler.append(title);
 const bar=document.createElement("div");bar.className="ruler-track";
 for(let i=0;i<frames;i++){const b=document.createElement("button");b.textContent=String(i+1);b.className=i===frame?"current":"";b.onclick=()=>{playing=false;$("play").textContent="▶ PLAY";showTimeline(i)};bar.append(b)}ruler.append(bar);
 const content=$("keyrows");content.replaceChildren();
 for(const id of ["root","pelvis","torso","head","emotion","glasses","shoulder_l","shoulder_r","elbow_l","elbow_r","wrist_l","wrist_r","hip_l","hip_r","knee_l","knee_r","ankle_l","ankle_r","phone"]){
  const row=document.createElement("div");row.className="keyrow";
  const label=document.createElement("button");label.className="keylabel"+(selected===id?" selected":"");label.textContent=id.replaceAll("_"," ").toUpperCase();label.onclick=()=>pick(id);row.append(label);
  const cells=document.createElement("div");cells.className="keycells";
  for(let i=0;i<frames;i++){
   const keyed=(id==="emotion"?emotionKeys:(tracks[id]||[])).some(x=>x.frame===i);
   const cell=document.createElement("button");cell.className=(i===frame?"current ":"")+(keyed?"keyed":"");
   cell.textContent=keyed?"◆":"·";cell.title=id+" / frame "+(i+1)+" / click to add or remove key";
   cell.onclick=()=>{
    if(i!==frame)showTimeline(i);
    pick(id);
    if(id==="emotion"){
     if(keyed)removeEmotionKey();else setEmotionKey();
    }else if(keyed){remember();tracks[id]=tracks[id].filter(k=>k.frame!==i)}
    else{remember();R.key(tracks,id,i,state.parts[id],state.emotion,state.faceLayers?.[id])}
    makeTimeline();setStatus((keyed?"REMOVED":"KEYED")+" "+id+" AT FRAME "+(i+1));
   };
   cells.append(cell);
  }
  row.append(cells);content.append(row);
 }
}
function setKey(){
 if(selected==="emotion"){setEmotionKey();return;}
 remember();R.key(tracks,selected,frame,state.parts[selected],state.emotion,state.faceLayers?.[selected]);
 setStatus("◆ KEYFRAME / "+selected+" / "+(frame+1));makeTimeline();
}
function removeKey(){
 if(selected==="emotion"){removeEmotionKey();return;}
 remember();tracks[selected]=(tracks[selected]||[]).filter(k=>k.frame!==frame);
 setStatus("◇ KEY REMOVED / "+selected+" / "+(frame+1));makeTimeline();
}
function assetOptions(){
 const emotion=$("emotionAsset"),glass=$("glassesAsset");
 emotion.replaceChildren();glass.replaceChildren();
 const opt=(list,value,label)=>{
  const o=document.createElement("option");o.value=value;o.textContent=label;list.append(o);
 };
 opt(emotion,"native:neutral","SOURCE / NEUTRAL FALLBACK");
 opt(glass,"native","ORIGINAL GLASSES / V6B");
 opt(glass,"none","NONE / HIDE");
 for(const asset of emotionDatabase.values()){
  if(asset.base!=="universal"&&asset.base!==type)continue;
  opt(emotion,asset.id,(asset.origin==="drive"?"☁ DRIVE / ":"DATABASE / ")+asset.name.toUpperCase()+" / "+asset.frames+"F");
 }
 for(const asset of publishedAssets.filter(a=>a.base===type)){
  opt(emotion,asset.id,"EXISTING / "+asset.label+" / "+asset.frames+"F");
 }
 for(const asset of userAssets){
  if(asset.kind==="emotion")opt(emotion,asset.id,"IMPORTED / "+asset.name.toUpperCase()+" / "+asset.frames+"F");
  if(asset.kind==="glasses")opt(glass,asset.id,"IMPORTED / "+asset.name.toUpperCase()+" / "+asset.frames+"F");
 }
 if(!getEmotionAsset(emotionAssetId))emotionAssetId="native:neutral";
 if(!getGlassesAsset(glassesAssetId))glassesAssetId="native";
 emotion.value=emotionAt();glass.value=glassesAssetId;
 updateEmotionStatus();
}
function matchAssetAnimation(asset){
 if(!asset||asset.frames<=1)return;
 const authoredBodyKeys=Object.values(tracks).some(keys=>Array.isArray(keys)&&keys.length);
 if(!authoredBodyKeys){frames=asset.frames;frame=0;$("frameCount").value=frames}
 else if(asset.frames>frames){frames=asset.frames;$("frameCount").value=frames}
 if(!authoredBodyKeys&&Number.isFinite(Number(asset.fps))&&Number(asset.fps)>0){
  fps=Math.round(clamp(asset.fps,1,30));$("fps").value=fps;
 }
 if(Array.isArray(asset.frame_ms)&&asset.frame_ms.length===asset.frames&&!authoredBodyKeys){
  const mean=asset.frame_ms.reduce((sum,n)=>sum+Number(n||0),0)/asset.frame_ms.length;
  if(mean>0){fps=Math.round(clamp(1000/mean,1,30));$("fps").value=fps}
 }
}
function updateEmotionStatus(){
 const asset=getEmotionAsset(emotionAt());
 if($("emotionAsset"))$("emotionAsset").value=emotionAt();
 if($("emotionStatus"))$("emotionStatus").textContent=(asset?.native?"ORIGINAL SOURCE / ":asset?.database?"EMOTION STUDIO DATABASE / ":"IMPORTED PLANE / ")+
  (asset?.frames||1)+" FRAME(S) · "+(asset?.fps||6)+" FPS · HEAD PLANE / READ ONLY";
 updateEmotionPreviewUI();
}
async function installEmotionEntries(entries,origin="starter"){
 if(!U)throw Error("Emotion renderer is missing");
 let added=0,failed=0;
 for(const entry of entries||[]){
  if(!U.validEntry(entry)){failed++;continue}
  try{
   const atlas=await U.renderAtlas(entry);
   if(atlas.width!==entry.frames*64||atlas.height!==448)throw Error("Invalid atlas size");
   const id="db:"+entry.id,asset={
    id,name:entry.name,label:entry.name,base:entry.base||"universal",
    kind:"emotion",frames:entry.frames,fps:entry.fps||6,database:true,origin
   };
   emotionDatabase.set(id,asset);emotionFrames.set(id,atlas);
   added++;
  }catch(error){console.warn("Emotion preview skipped",entry?.id,error);failed++}
 }
 assetOptions();paint();
 return {added,failed};
}
async function loadPublishedAssets(){
 if(!U){setStatus("EMOTION DATABASE RENDERER UNAVAILABLE · NEUTRAL FALLBACK",false);return}
 try{
  const result=await U.loadCatalog();
  const n=await installEmotionEntries(result.catalog.entries,"starter");
  if($("emotionDatabaseStatus"))$("emotionDatabaseStatus").textContent=
   "DATABASE READY · "+n.added+" STARTER EMOTIONS · Connect Google Drive for edited versions";
 }catch(error){
  if($("emotionDatabaseStatus"))$("emotionDatabaseStatus").textContent=
   "STARTER CATALOG UNAVAILABLE · CONNECT DRIVE OR RELOAD · "+error.message;
  console.warn("Emotion starter load",error);
 }
}
async function loadDriveEmotions(){
 if(emotionDatabaseLoading)return;
 if(!D?.connected()){
  if($("emotionDatabaseStatus"))$("emotionDatabaseStatus").textContent=
   "CONNECT GOOGLE DRIVE IN THE DRIVE PANEL TO OPEN YOUR EMOTION STUDIO PROJECTS";
  setStatus("CONNECT GOOGLE DRIVE FIRST · EMOTION DATABASE STARTER REMAINS AVAILABLE",false);
  return;
 }
 emotionDatabaseLoading=true;
 $("emotionRefresh").disabled=true;
 try{
  if($("emotionDatabaseStatus"))$("emotionDatabaseStatus").textContent="LOADING EMOTION STUDIO PROJECTS FROM GOOGLE DRIVE...";
  const loaded=await D.loadEmotionDatabase();
  const n=await installEmotionEntries(loaded.entries,"drive");
  $("emotionDatabaseStatus").textContent="✓ "+n.added+" DRIVE EMOTIONS LOADED · "+(loaded.errors?.length||0)+" ERRORS · SELECT FROM EMOTION ASSET LIBRARY";
  if(!n.added&&loaded.reason)$("emotionDatabaseStatus").textContent=loaded.reason+" · Save one emotion to Drive from Emotion Studio first";
  setStatus("✓ EMOTION DATABASE UPDATED · "+n.added+" DRIVE ASSETS · PREVIEW ONLY",true);
 }catch(error){
  $("emotionDatabaseStatus").textContent="DRIVE EMOTIONS UNAVAILABLE · "+error.message;
  setStatus("EMOTION DRIVE LOAD FAILED · "+error.message,false);
 }finally{emotionDatabaseLoading=false;$("emotionRefresh").disabled=false}
}
function loadImportedAssets(){
 userAssets=E.safeAssets(window.localStorage);
 importedImages.clear();
 for(const asset of userAssets){
  const image=new Image();
  image.onload=()=>{importedImages.set(asset.id,image);paint()};
  image.onerror=()=>setStatus("FAILED TO LOAD IMPORTED PLANE "+asset.name,false);
  image.src=asset.png;
 }
 assetOptions();
}
async function importPlanePng(file,kind){
 if(!file)return;
 try{
  if(file.type!=="image/png"||file.size>850000||file.size===0)
   throw Error("Choose a transparent PNG smaller than 850KB");
  const url=URL.createObjectURL(file);
  let image;
  try{image=await new Promise((resolve,reject)=>{
   const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Invalid PNG image"));img.src=url;
  })}finally{URL.revokeObjectURL(url)}
  const info=E.classifyAtlas(image.naturalWidth,image.naturalHeight);
  const cv=document.createElement("canvas");cv.width=info.width;cv.height=info.height;
  const cx=cv.getContext("2d");cx.drawImage(image,0,0);
  const png=cv.toDataURL("image/png");
  if(png.length>=1450000)throw Error("Compressed PNG is too large for local asset storage");
  const asset={format:E.FORMAT,id:(kind==="emotion"?"emo_":"acc_")+Date.now().toString(36),
   name:String(file.name.replace(/\.png$/i,"").replace(/[^a-z0-9 _-]/gi," ")).slice(0,48),
   kind,frames:info.frames,png};
  const next=[...userAssets,asset].slice(-12);
  E.saveAssets(window.localStorage,next);
  userAssets=next;
  window.dispatchEvent(new CustomEvent("mahluk2:asset-library-edited",{detail:{kind:"imported-png"}}));
  const loaded=new Image();loaded.onload=()=>{
   remember();importedImages.set(asset.id,loaded);
   if(kind==="emotion"){
    if(frame>0&&!emotionKeys.length)emotionKeys=E.insert(emotionKeys,0,emotionAssetId);
    emotionAssetId=asset.id;
    if(frame>0||emotionKeys.length)emotionKeys=E.insert(emotionKeys,frame,asset.id);
    matchAssetAnimation(asset);makeTimeline()
   }else glassesAssetId=asset.id;
   assetOptions();paint();
   setStatus("✓ IMPORTED "+kind.toUpperCase()+" PLANE: "+asset.name+" / "+asset.frames+" FRAME(S)",true);
  };
  loaded.src=asset.png;
 }catch(error){setStatus("ASSET IMPORT FAILED: "+error.message,false)}
}
function setEmotionKey(){
 remember();emotionKeys=E.insert(emotionKeys,frame,emotionAssetId);
 updateEmotionStatus();makeTimeline();paint();
 setStatus("◆ EMOTION ASSET KEY / F"+(frame+1)+" / "+emotionAssetId,true);
}
function removeEmotionKey(){
 remember();emotionKeys=emotionKeys.filter(key=>key.frame!==frame);
 updateEmotionStatus();makeTimeline();paint();setStatus("◇ REMOVED EMOTION ASSET KEY / F"+(frame+1));
}
function loadImagesFromManifest(j){
 manifest=j;slots=j.slots.filter(s=>s&&R.BMAP[s.bone]&&/^media\/original-rig\/[a-z0-9-]+\.png$/.test(s.src));
 const uniq=[...new Set(slots.map(s=>s.src))];
 return Promise.all(uniq.map(src=>new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>{images.set(src,img);resolve()};
  img.onerror=()=>reject(Error("Missing published source "+src));
  img.src="../"+src;
 })));
}
function download(filename,blob){
 const href=URL.createObjectURL(blob),a=document.createElement("a");a.href=href;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),2000);
}
function bake(framesToExport,clipName){
 const n=Math.round(clamp(framesToExport,1,48));
 const canvas=document.createElement("canvas");canvas.width=64*n;canvas.height=448;
 const ctx=canvas.getContext("2d");
 const originalDirection=direction,originalState=state,originalFrame=frame,originalEmotionPreviewFrame=emotionPreviewFrame;
 for(let d=0;d<4;d++){
  direction=DIR[d];
  for(let f=0;f<n;f++){
   frame=f;emotionPreviewFrame=f;state=n===1?originalState:R.sampleTrack(tracks,f,n,base);
   const tile=document.createElement("canvas");tile.width=64;tile.height=112;const tc=tile.getContext("2d");
   renderLayers(tc,direction,0,0,1,false);
   ctx.drawImage(tile,64*f,112*d);
  }
 }
 direction=originalDirection;state=originalState;frame=originalFrame;emotionPreviewFrame=originalEmotionPreviewFrame;
 return canvas;
}
function commitUnkeyedPose(){
 // C4D-like edits are visible immediately. If the user does not place a
 // diamond key, the transform still becomes the static rest of the character.
 for(const bone of R.BONES){
  if(!(tracks[bone.id]||[]).length)base.parts[bone.id]=clone(state.parts[bone.id]);
 }
 base.emotion=state.emotion;
 base.faceLayers={...state.faceLayers};
}
function saveGame(){
 if(!manifest){setStatus("SOURCE NOT LOADED / CANNOT PUBLISH",false);return;}
 commitUnkeyedPose();
 const library=getLocalLibrary(),name=$("characterName").value.trim()||"My Character 2.0";
 const id=identifier||"mh2_"+Date.now().toString(36);
 const old=getLibrary().find(r=>r.id===id);
 // 2.0 publishes the character ROOT only; action clips belong to 1.0.
 const clipId="idle",rootFrames=1;
 clip="idle";frames=1;frame=0;
 const canvas=bake(rootFrames,clipId),rootSheet=canvas.toDataURL("image/png");
 const clips={...(old?.clips||{}),idle:{
  sheet:rootSheet,frames:1,frame_ms:[Math.round(1000/fps)],loop:true
 }};
 const record={format:"mahluk-2-character-v1",version:1,id,name,
  role:"character-root",actionEditor:"mahluk-hidup-1.0",base:type,template_base:type==="female"?"human_female_base":"human_male_base",
  outfit,bodyPlane,model:R.normalize(state),rest:R.normalize(base),tracks:clone(tracks),frames,fps,clip:clipId,
  emotionPlane:{asset:emotionAssetId,keys:clone(emotionKeys),placement:clone(emotionPlacement)},accessoryPlanes:{glasses:glassesAssetId},
  rigRules:G.normalize(rigRules,R),generalRigRevision:masterDocument()?.revision||0,
  pixelPlanes:G.sanitizePixelPlanes(pixelPlanes,R),
  sprite:rootSheet,clips,updated:Date.now()};
 const next=[...library.filter(r=>r.id!==id),record];
 if(next.length>40){setStatus("CHARACTER LIBRARY FULL (40) · EXPORT/ARCHIVE OLDER ROOTS BEFORE SAVING",false);return}
 if(!safePut(STORAGE,next))return;
 identifier=id;updateLibrary();
 document.dispatchEvent(new CustomEvent("mahluk2:published",{detail:{id}}));
 try{window.dispatchEvent(new StorageEvent("storage",{key:STORAGE,newValue:JSON.stringify(next)}))}catch{}
 // Cloud bridge hears this after the local save succeeded; game storage unchanged.
 window.dispatchEvent(new CustomEvent("mahluk2:root-saved-for-cloud",{detail:{record}}));
 setStatus("✓ ROOT PUBLISHED "+name+" · 4 DIRECTIONS · ACTIONS STAY IN 1.0 · SEMESTA & BANGUN RUANG",true);
}
function updateLibrary(){
 const list=$("library"),records=getLibrary();list.replaceChildren();const starter=document.createElement("option");
 starter.value="";starter.textContent="NEW CHARACTER";list.append(starter);
 for(const r of records){const el=document.createElement("option");el.value=r.id;el.textContent=(cloudRecords.has(r.id)?"☁ ":"")+r.name+" / "+r.id;list.append(el)}
 list.value=identifier||"";
}
function loadRecord(id){
 const r=getLibrary().find(r=>r.id===id);if(!r)return;
 remember();
 identifier=r.id;type=["original","male","female"].includes(r.base)?r.base:"original";
 outfit=r.outfit==="base"?"base":"outfit";bodyPlane=B.matchingBase(type,r.bodyPlane===undefined?B.defaultForBase(type):r.bodyPlane);clip="idle";
 // Shared master always takes precedence for new/opened 2.0 characters.
 rigRules=G.normalize(r.driveFileId?r.rigRules:(masterDocument()?.rules||r.rigRules),R);
 setPixelPlanes(r.driveFileId?r.pixelPlanes:(masterDocument()?.pixelPlanes||r.pixelPlanes||{}));
 emotionAssetId=typeof r.emotionPlane?.asset==='string'?r.emotionPlane.asset:'native:neutral';
 emotionKeys=Array.isArray(r.emotionPlane?.keys)?r.emotionPlane.keys.filter(k=>typeof k?.asset==='string'&&Number.isInteger(k.frame)).slice(0,48):[];
 emotionPlacement=EP.placement(r.emotionPlane?.placement);
 emotionPreviewFrame=0;emotionPreviewElapsed=0;
 glassesAssetId=getGlassesAsset(r.accessoryPlanes?.glasses)?r.accessoryPlanes.glasses:"native";
 base=R.normalize(r.rest||r.model);state=R.normalize(r.model);
 tracks=R.makeTracks();
 for(const node of R.BONES){for(const key of r.tracks?.[node.id]||[]){
  if(key&&Number.isInteger(key.frame)&&key.value)R.key(tracks,node.id,key.frame,key.value,key.emotion,key.faceEmotion);
 }}
 frames=1;fps=Math.round(clamp(r.fps||12,1,30));frame=0;
 $("characterName").value=r.name;assetOptions();applyState();setStatus("OPENED "+r.name+" / EDIT MODULAR PLANES",true);
}
function newCharacter(){
 remember();identifier=null;type="original";outfit="outfit";bodyPlane="current";clip="idle";frames=1;fps=12;frame=0;
 const general=masterDocument();rigRules=G.normalize(general?.rules,R);
 setPixelPlanes(general?.pixelPlanes||{});
 emotionAssetId="native:neutral";emotionKeys=[];emotionPlacement=EP.placement();emotionPreviewFrame=0;emotionPreviewElapsed=0;glassesAssetId="native";
 state=general?.defaultParts?R.normalize({parts:general.defaultParts}):R.referencePose();
 base=R.normalize(state);tracks=R.makeTracks();$("characterName").value="My Character 2.0";
 updateLibrary();assetOptions();applyState();setStatus("NEW SOURCE-NATIVE CHARACTER · GAME CONTENT UNCHANGED",true);
}
function projectExport(){
 commitUnkeyedPose();
 const needed=new Set([emotionAssetId,glassesAssetId,...emotionKeys.map(k=>k.asset)]);
 const payload={format:"mahluk-2-project-v1",name:$("characterName").value,id:identifier,base:type,outfit,bodyPlane,clip,model:state,rest:base,tracks,frames,fps,
  emotionPlane:{asset:emotionAssetId,keys:clone(emotionKeys),placement:clone(emotionPlacement)},accessoryPlanes:{glasses:glassesAssetId},
  rigRules:G.normalize(rigRules,R),generalRigRevision:masterDocument()?.revision||0,
  pixelPlanes:G.sanitizePixelPlanes(pixelPlanes,R),
  embeddedAssets:userAssets.filter(a=>needed.has(a.id))};
 download("mahluk_2_project.json",new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
}
function importProject(file){
 if(!file)return;file.text().then(raw=>{
  const v=JSON.parse(raw);
  if(v.format!=="mahluk-2-project-v1")throw Error("Unknown Mahluk 2.0 project");
  remember();
  identifier=typeof v.id==="string"&&/^mh2_[a-z0-9]+$/.test(v.id)?v.id:null;
  type=["original","male","female"].includes(v.base)?v.base:"original";outfit=v.outfit==="base"?"base":"outfit";bodyPlane=B.matchingBase(type,v.bodyPlane===undefined?B.defaultForBase(type):v.bodyPlane);clip="idle";
  state=R.normalize(v.model);base=R.normalize(v.rest||v.model);tracks=R.makeTracks();
  rigRules=G.normalize(v.rigRules||masterDocument()?.rules,R);
  setPixelPlanes(v.pixelPlanes||masterDocument()?.pixelPlanes||{});
  for(const node of R.BONES){for(const k of v.tracks?.[node.id]||[]){if(k&&k.value&&Number.isInteger(k.frame))R.key(tracks,node.id,k.frame,k.value,k.emotion,k.faceEmotion)}}
  frames=1;fps=Math.round(clamp(v.fps||12,1,30));
  if(Array.isArray(v.embeddedAssets)&&v.embeddedAssets.length){
   const existing=E.safeAssets(window.localStorage);
   const imported=v.embeddedAssets.filter(a=>a?.format===E.FORMAT&&
    typeof a.png==="string"&&a.png.startsWith("data:image/png;base64,")&&
    a.png.length<1500000&&Number.isInteger(a.frames)&&a.frames>=1&&a.frames<=48);
   E.saveAssets(window.localStorage,[...existing.filter(a=>!imported.some(b=>b.id===a.id)),...imported].slice(-12));
  }
  loadImportedAssets();
  emotionAssetId=typeof v.emotionPlane?.asset==='string'?v.emotionPlane.asset:'native:neutral';
  emotionKeys=Array.isArray(v.emotionPlane?.keys)?v.emotionPlane.keys.filter(k=>typeof k?.asset==='string'&&Number.isInteger(k.frame)).slice(0,48):[];
  emotionPlacement=EP.placement(v.emotionPlane?.placement);
  emotionPreviewFrame=0;emotionPreviewElapsed=0;
  glassesAssetId=getGlassesAsset(v.accessoryPlanes?.glasses)?v.accessoryPlanes.glasses:"native";
  $("characterName").value=String(v.name||"Imported 2.0").slice(0,40);frame=0;assetOptions();applyState();setStatus("IMPORTED PROJECT / NOT YET PUBLISHED",true);
 }).catch(e=>setStatus("IMPORT FAILED: "+e.message,false));
}
function saveGeneralRig(){
 if(!manifest)return;
 commitUnkeyedPose();
 try{
  const doc=G.save(window.localStorage,R,rigRules,base.parts,pixelPlanes);
  githubInfo("Saved locally. "+(S.connected()?"Publishing to GitHub...":"Connect GitHub and click PUBLISH MASTER to sync devices."));
  masterMessage();setStatus("✓ GENERAL DEFAULT RIG SAVED LOCALLY v"+doc.revision,true);
  if(S.connected())void publishGithubMaster();
  window.dispatchEvent(new CustomEvent("mahluk2:master-saved-for-cloud",{detail:{doc}}));
  return true;
 }catch(error){setStatus("GENERAL RIG SAVE FAILED: "+error.message,false);return false}
}
function saveGeneralPlanePixel(bone,png){
 if(!setPlanePixel(bone,png))return false;
 const prior=masterDocument();
 // Publishing an edited hand should not silently replace the master head,
 // anchors, rest pose, hierarchy or other plane artwork.
 const rules=prior?.rules||rigRules;
 const parts=prior?.defaultParts||base.parts;
 const merged={...(prior?.pixelPlanes||{}),[bone]:png};
 try{
  const saved=G.save(window.localStorage,R,rules,parts,merged);
  githubInfo("Default pixels saved locally. "+(S.connected()?"Publishing...":"Publish the master to GitHub."));
  masterMessage();
  setStatus("✓ GENERAL PIXEL DEFAULT "+bone.toUpperCase()+" · MASTER v"+saved.revision,true);
  if(S.connected())void publishGithubMaster();
  window.dispatchEvent(new CustomEvent("mahluk2:master-saved-for-cloud",{detail:{doc:saved}}));
  return true;
 }catch(error){
  setStatus("GENERAL PIXEL SAVE FAILED: "+error.message,false);return false;
 }
}
function loadGeneralRig(){
 const saved=masterDocument();
 if(!saved){setStatus("NO GENERAL DEFAULT RIG SAVED");return}
 remember();
 rigRules=G.normalize(saved.rules,R);
 setPixelPlanes(saved.pixelPlanes||{});
 // Loading hierarchy does not discard the character's keyed animation.
 buildTree();masterMessage();
 setStatus("LOADED GENERAL RIG v"+saved.revision+" / HIERARCHY + ANCHORS + LAYER ORDER",true);
}
function resetFactoryRig(){
 remember();rigRules=G.defaults(R);buildTree();
 setStatus("FACTORY RIG RULES LOADED IN EDITOR · SAVED MASTER REMAINS UNCHANGED");
}
function setupEvents(){
 planeEditor=P.create({
  overlay:$("pixelOverlay"),canvas:$("pixelCanvas"),
  onApply:(bone,png)=>setPlanePixel(bone,png),
  onSaveDefault:saveGeneralPlanePixel
 });
 $("editPixelPlane").onclick=openPlaneEditor;
 $("openPlaneEditor").onclick=openPlaneEditor;
 $("clearPixelPlane").onclick=clearPlanePixel;
 $("undo").onclick=undo;$("redo").onclick=redo;
 $("saveGeneralRig").onclick=saveGeneralRig;
 $("githubMasterConnect").onclick=connectGithubMaster;
 $("githubMasterPublish").onclick=publishGithubMaster;
 $("githubMasterLoad").onclick=()=>loadGithubMaster(false);
 $("loadGeneralRig").onclick=loadGeneralRig;
 $("factoryRig").onclick=resetFactoryRig;
 $("layerFront").onclick=()=>moveLayer(selected,1);
 $("layerBack").onclick=()=>moveLayer(selected,-1);
 $("parentBone").onchange=e=>{
  const chosen=e.target.value;
  if(!G.canParent(rigRules,selected,chosen,R))return;
  remember();G.setParent(rigRules,selected,chosen,R);buildTree();
  setStatus("RE-PARENTED "+selected.toUpperCase()+" → "+chosen.toUpperCase());
 };
 for(const [axis,id] of [["x","anchorX"],["y","anchorY"]]){
  $(id).addEventListener("focus",remember);
  $(id).oninput=e=>{
   const n=Number(e.target.value);if(!Number.isFinite(n))return;
   const old=rigRules.anchors[selected];
   G.setAnchor(rigRules,selected,axis==="x"?n:old.x,axis==="y"?n:old.y,R);
   paint();
  };
 }
 $("modelType").onchange=e=>{remember();type=e.target.value;
  bodyPlane=B.defaultForBase(type);
  if(!getEmotionAsset(emotionAssetId)){emotionAssetId="native:neutral";emotionKeys=[]}
  assetOptions();setProjectFields();buildTree();paint();setStatus("SWITCHED SOURCE / "+type.toUpperCase(),true)};
 $("outfit").onchange=e=>{remember();outfit=e.target.value;buildTree();paint()};
 $("bodyPlane").onchange=e=>{
  const next=B.matchingBase(type,e.target.value);if(next===bodyPlane){e.target.value=bodyPlane;return}
  const chosen=slots.filter(s=>s.gender===next&&s.layer_type==="body"&&B.isBodyBone(s.bone));
  if(next!=="current"&&!chosen.length){
   e.target.value=bodyPlane;setStatus("NUDE BODY SOURCE NOT AVAILABLE YET",false);return;
  }
  remember();bodyPlane=next;setProjectFields();buildTree();paint();
  setStatus(next==="current"?
   "✓ ORIGINAL BODY RESTORED · EVERYTHING ELSE UNCHANGED":
   "✓ "+next.toUpperCase()+" NUDE BODY PLANES ACTIVE · HEAD / FACE / ACCESSORIES / RIG UNCHANGED",true);
 };
 $("library").onchange=e=>{if(e.target.value)loadRecord(e.target.value);else newCharacter()};
 $("newChar").onclick=newCharacter;
 $("saveChar").onclick=$("publish").onclick=saveGame;
 $("exportJson").onclick=projectExport;
 $("exportPng").onclick=()=>{commitUnkeyedPose();return bake(1,"idle").toBlob(b=>b&&download("mahluk_2_root_4dir.png",b),"image/png")};
 $("importJson").onchange=e=>{importProject(e.target.files?.[0]);e.target.value=""};
 $("hideSelected").onclick=()=>{remember();state.parts[selected].visible=!state.parts[selected].visible;buildTree()};
 $("resetSelected").onclick=()=>{remember();state.parts[selected]={...R.neutral().parts[selected]};pick(selected);setStatus("RESET "+selected)};
 for(const [key,id] of [["x","posX"],["y","posY"],["z","posZ"],["angle","angle"],["scale","scale"]]){
  $(id).addEventListener("focus",remember);
  $(id).oninput=e=>{let value=Number(e.target.value);if(Number.isFinite(value)){
   state.parts[selected][key]=key==="scale"?clamp(value,.3,3):key==="angle"?clamp(value,-180,180):key==="z"?clamp(value,-10,10):clamp(value,-40,40);paint();
  }};
 }
 $("visible").onchange=e=>{remember();state.parts[selected].visible=e.target.checked;buildTree()};
 $("emotionAsset").onchange=e=>{
  if(!getEmotionAsset(e.target.value))return;
  remember();
  if(frame>0&&!emotionKeys.length)emotionKeys=E.insert(emotionKeys,0,emotionAssetId);
  emotionAssetId=e.target.value;
  if(frame>0||emotionKeys.length)emotionKeys=E.insert(emotionKeys,frame,emotionAssetId);
  const asset=getEmotionAsset(emotionAssetId);
  matchAssetAnimation(asset)
  updateEmotionStatus();makeTimeline();paint();
  setStatus("EMOTION PLANE ASSET / "+(asset?.native||asset?.name||"UNKNOWN"),true);
 };
 $("glassesAsset").onchange=e=>{remember();glassesAssetId=e.target.value;paint();setStatus("GLASSES PLANE / "+glassesAssetId,true)};
 $("emotionRefresh").onclick=loadDriveEmotions;
 window.addEventListener("mahluk2:drive-connected",()=>void loadDriveEmotions());
 $("glassesImport").onchange=e=>{importPlanePng(e.target.files?.[0],"glasses");e.target.value=""};
 for(const field of ["characterName","frameCount","fps","clip"]){
  $(field)?.addEventListener("change",scheduleWorkspaceDraftSave);
 }
 studio?.addEventListener("pointerup",scheduleWorkspaceDraftSave);
 $("emotionKey").onclick=setEmotionKey;
 $("emotionUnkey").onclick=removeEmotionKey;
 $("frameCount").onchange=e=>{remember();frames=Math.round(clamp(e.target.value,1,48));frame=0;makeTimeline();paint()};
 $("fps").onchange=e=>{remember();fps=Math.round(clamp(e.target.value,1,30));e.target.value=fps};
 $("clip").onchange=e=>{remember();clip=e.target.value;setStatus("AUTHORING CLIP "+clip.toUpperCase()+" / SAVE TO PUBLISH")};
 $("setKey").onclick=setKey;$("deleteKey").onclick=removeKey;
 $("play").onclick=()=>{playing=!playing;playSince=performance.now();$("play").textContent=playing?"Ⅱ PAUSE":"▶ PLAY"};
 $("gridPreview").onchange=e=>$("game").parentElement.classList.toggle("flat",e.target.checked);
 $("toolSelect").onclick=()=>{
  selectMode=true;orbitTool=false;axisButtons();paint();
  setStatus("SELECT PART · CLICK VISIBLE PIXELS · SHIFT+CLICK CYCLES OVERLAPPING PLANES",true);
 };
 for(const mode of ["move","rotate","scale","anchor"])$("tool"+mode[0].toUpperCase()+mode.slice(1)).onclick=()=>{
  selectMode=false;orbitTool=false;transformMode=mode;axisButtons();paint()
 };
 $("toolOrbit").onclick=()=>{
  selectMode=false;orbitTool=!orbitTool;view="iso";axisButtons();paint();
  setStatus(orbitTool?"ORBIT CAMERA · DRAG IN VIEWPORT TO CHANGE ANGLE · RIG STAYS FIXED":
   "ORBIT CAMERA OFF · RIG TRANSFORM TOOLS ACTIVE",true);
 };
 $("viewIso").onclick=()=>{view="iso";axisButtons();paint()};
 $("viewFront").onclick=()=>{orbitTool=false;view="front";axisButtons();paint()};
 $("togglePlaneDepth").onclick=()=>{
  if(view!=="iso")view="iso";
  inspectPlaneDepth=!inspectPlaneDepth;
  axisButtons();paint();
  setStatus(inspectPlaneDepth?
   "PLANE DEPTH VIEW ON · VISUAL SEPARATION ONLY · NO RIG OR GAME TRANSFORMS CHANGED":
   "PLANE DEPTH VIEW OFF · ORIGINAL MASTER POSITIONS",true);
 };
 $("planeGap").oninput=e=>{planeGap=clamp(Number(e.target.value),0,8);axisButtons();paint()};
 $("orbitPrev").onclick=()=>setDirection(V.orbit(direction,-1));
 $("orbitNext").onclick=()=>setDirection(V.orbit(direction,1));
 for(const el of document.querySelectorAll("[data-orbit-dir],[data-preview-dir]")){
  el.onclick=()=>setDirection(el.dataset.orbitDir||el.dataset.previewDir);
 }
 $("zoomIn").onclick=()=>zoomTo(zoom*1.25);
 $("zoomOut").onclick=()=>zoomTo(zoom/1.25);
 $("viewHome").onclick=()=>{camera={x:0,y:0};zoom=3.25;$("zoomLabel").textContent="100%";paint()};
 for(const x of ["x","y","z"])$("axis"+x.toUpperCase()).onclick=()=>{axis=x;axisButtons();paint()};
 for(const el of document.querySelectorAll("[data-dir]"))el.onclick=()=>setDirection(el.dataset.dir);
 function mouse(e){
  const r=studio.getBoundingClientRect(),px=studio.width/r.width,py=studio.height/r.height;
  return {x:(e.clientX-r.left)*px,y:(e.clientY-r.top)*py};
 }
 function pinchData(){
  const p=[...touchPoints.values()];
  if(p.length<2)return null;
  return {distance:Math.max(1,Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)),
   middle:{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2}};
 }
 studio.addEventListener("pointerdown",e=>{
  if(!state||!manifest)return;
  const p=mouse(e);
  if(e.pointerType==="touch"){
   touchPoints.set(e.pointerId,p);
   try{studio.setPointerCapture(e.pointerId)}catch{}
   if(touchPoints.size===2){
    const d=pinchData();
    pinch={distance:d.distance,center:d.middle,zoom,camera:{...camera}};
    drag=null;e.preventDefault();return;
   }
   if(touchPoints.size>2){drag=null;e.preventDefault();return}
  }
  const touching=e.pointerType==="touch",hitPadding=touching?40:21;
  if((orbitTool||e.altKey)&&e.button===0){
   drag={pointer:e.pointerId,start:p,mode:"orbit",baseDir:direction};
   try{studio.setPointerCapture(e.pointerId)}catch{}
   e.preventDefault();return;
  }
  const origin=projectBone(studio.width,studio.height,zoom*Math.min(2,devicePixelRatio||1),selected);
  const handle=selectMode||!origin?null:lastHandles.find(h=>transformMode==="rotate"?
    Math.abs(Math.hypot(p.x-origin.x,p.y-origin.y)-h.radius)<hitPadding:
    Math.hypot(h.end.x-p.x,h.end.y-p.y)<hitPadding);
  // Inspect actual sprite transparency in reverse draw order, not the
  // large overlapping 64×112 plane canvases.
  const hits=hitPlanesAt(p);
  if(e.button===0&&hits.length&&(selectMode||!handle||e.shiftKey)){
   const index=hits.indexOf(selected);
   const candidate=e.shiftKey?hits[(index+1)%hits.length]:hits[0];
   if(candidate&&candidate!==selected){pick(candidate);e.preventDefault();return}
   if(selectMode){e.preventDefault();return}
  }
  const pan=e.button===1||e.altKey||(touching&&!handle&&!hits.length);
  if(handle&&transformMode==="move")axis=handle.id;
  axisButtons();
  const mode=pan?"pan":handle?transformMode:"none";
  if(mode!=="pan"&&mode!=="none")remember(); // One undo step per complete gesture
  drag={pointer:e.pointerId,start:p,pos:clone(state.parts[selected]),
   pivot:clone(rigRules.anchors[selected]),cam:{...camera},mode,axis,origin,
   startAngle:origin?Math.atan2(p.y-origin.y,p.x-origin.x):0};
  if(mode!=="none"){try{studio.setPointerCapture(e.pointerId)}catch{}e.preventDefault()}
 });
 studio.addEventListener("pointermove",e=>{
  const p=mouse(e);
  if(e.pointerType==="touch"&&touchPoints.has(e.pointerId)){
   touchPoints.set(e.pointerId,p);
   if(pinch&&touchPoints.size>=2){
    const current=pinchData();
    zoom=clamp(pinch.zoom*current.distance/pinch.distance,.7,12);
    const {w,h}=stageDimensions(),ratio=zoom/pinch.zoom;
    const centerX=w/2+pinch.camera.x,centerY=h/2+pinch.camera.y;
    camera.x=pinch.camera.x+(pinch.center.x-centerX)*(1-ratio)+
      current.middle.x-pinch.center.x;
    camera.y=pinch.camera.y+(pinch.center.y-centerY)*(1-ratio)+
      current.middle.y-pinch.center.y;
    $("zoomLabel").textContent=Math.round(zoom/3.25*100)+"%";
    paint();e.preventDefault();return;
   }
  }
  if(!drag||drag.pointer!==e.pointerId||drag.mode==="none")return;
  const dx=p.x-drag.start.x,dy=p.y-drag.start.y,scale=zoom*Math.min(2,devicePixelRatio||1);
  if(drag.mode==="orbit"){
   const step=Math.round(dx/Math.max(45,55*Math.min(2,devicePixelRatio||1)));
   const next=V.orbit(drag.baseDir,step);
   if(next!==direction)setDirection(next);
   e.preventDefault();return;
  }
  if(drag.mode==="pan"){camera.x=drag.cam.x+dx;camera.y=drag.cam.y+dy}
  else if(drag.mode==="anchor"){
   G.setAnchor(rigRules,selected,
    drag.pivot.x+V.dragDelta(dx,dy,scale,direction,"x"),
    drag.pivot.y+V.dragDelta(dx,dy,scale,direction,"y"),R);
   $("anchorX").value=Number(rigRules.anchors[selected].x.toFixed(1));
   $("anchorY").value=Number(rigRules.anchors[selected].y.toFixed(1));
  }
  else if(drag.mode==="rotate"){
   const theta=Math.atan2(p.y-drag.origin.y,p.x-drag.origin.x);
   let delta=(theta-drag.startAngle)*180/Math.PI;
   if(delta>180)delta-=360;if(delta< -180)delta+=360;
   let deg=clamp(drag.pos.angle+V.rotationDelta(delta,direction),-180,180);
   if(e.shiftKey)deg=Math.round(deg/15)*15;
   state.parts[selected].angle=deg;
  }
  else if(drag.mode==="scale")state.parts[selected].scale=clamp(drag.pos.scale+dx/(scale*24),.3,3);
  else if(drag.axis==="x")state.parts[selected].x=clamp(drag.pos.x+V.dragDelta(dx,dy,scale,direction,"x"),-40,40);
  else if(drag.axis==="y")state.parts[selected].y=clamp(drag.pos.y+V.dragDelta(dx,dy,scale,direction,"y"),-40,40);
  else if(drag.axis==="z")state.parts[selected].z=clamp(drag.pos.z+V.dragDelta(dx,dy,scale,direction,"z"),-10,10);
  for(const [k,id] of [["x","posX"],["y","posY"],["z","posZ"],["angle","angle"],["scale","scale"]])
   $(id).value=Number(state.parts[selected][k].toFixed(1));
  paint();e.preventDefault();
 });
 for(const eventName of ["pointerup","pointercancel","lostpointercapture"]){
  studio.addEventListener(eventName,e=>{
   if(e.pointerType==="touch")touchPoints.delete(e.pointerId);
   if(touchPoints.size<2)pinch=null;
   if(drag?.pointer===e.pointerId)drag=null;
   if(eventName!=="lostpointercapture")
    try{studio.releasePointerCapture(e.pointerId)}catch{}
  });
 }
 studio.addEventListener("wheel",e=>{
  e.preventDefault();
  const p=mouse(e);
  zoomTo(zoom*(e.deltaY<0?1.14:1/1.14),p.x,p.y);
 },{passive:false});
 studio.addEventListener("contextmenu",e=>e.preventDefault());
 window.addEventListener("resize",paint);
 window.addEventListener("keydown",e=>{
  if(planeEditor?.isOpen())return; // Pixel editor owns its shortcuts and Delete key.
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){
   e.preventDefault();if(e.shiftKey)redo();else undo();return;
  }
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){
   e.preventDefault();redo();return;
  }
  if(["INPUT","SELECT","TEXTAREA"].includes(document.activeElement?.tagName))return;
  if(e.key==="1"||e.key==="2"||e.key==="3"){axis=["x","y","z"][Number(e.key)-1];axisButtons();paint()}
  if(["w","e","r","a"].includes(e.key.toLowerCase())){
   transformMode={w:"move",e:"rotate",r:"scale",a:"anchor"}[e.key.toLowerCase()];
   axisButtons();paint();
  }
  if(e.key==="+"||e.key==="=")zoomTo(zoom*1.2);
  if(e.key==="-")zoomTo(zoom/1.2);
  if(e.key==="["||e.key==="ArrowLeft")setDirection(V.orbit(direction,-1));
  if(e.key==="]"||e.key==="ArrowRight")setDirection(V.orbit(direction,1));
  if(e.key==="q"||e.key==="Q")$("toolSelect").click();
  if(e.key==="p"||e.key==="P")$("togglePlaneDepth").click();
  if(e.key==="o"||e.key==="O")$("toolOrbit").click();
  if(e.key==="k"||e.key==="K")setKey();
  if(e.key==="Delete")removeKey();
 });
 let last=performance.now(),elapsed=0;
 function tick(now){
  if(playing&&frames>1){
   elapsed+=Math.max(0,Math.min(80,now-last));
   const asset=getEmotionAsset(emotionAt());
   const nativeMs=!emotionKeys.length&&asset?.frames===frames&&
    Array.isArray(asset.frame_ms)?Number(asset.frame_ms[frame]):NaN;
   const period=Number.isFinite(nativeMs)&&nativeMs>0?nativeMs:1000/fps;
   if(elapsed>=period){elapsed%=period;showTimeline((frame+1)%frames)}
  }
  last=now;requestAnimationFrame(tick);
 }
 requestAnimationFrame(tick);
}
async function mount(){
 if(!R||!E||!G||!B||!P||!V||!S||!U){setStatus("RIG / FOUR-VIEW / GITHUB SYNC ENGINE NOT FOUND",false);return}
 setupEvents();
 try{
  const resp=await fetch("../media/original-rig/manifest.json",{cache:"no-store"});
  if(!resp.ok)throw Error("Published V6B manifest HTTP "+resp.status);
  const m=await resp.json();
  if(m.format!=="mahluk-original-source-rig-v1")throw Error("Invalid authored V6B manifest");
  await loadImagesFromManifest(m);
  loadImportedAssets();
  try{await loadPublishedAssets()}catch(error){setStatus("UNIVERSAL EMOTION STUDIO UNAVAILABLE · NEUTRAL FALLBACK ACTIVE: "+error.message,false)}
  const draft=safeGet(DRAFT,null);
  if(draft?.format==="mahluk-2-project-v1"){
   // Drafts are intentionally NOT auto-loaded as game-ready characters.
   setStatus("SOURCE READY · SELECT CHARACTER OR CREATE NEW",true);
  }
  await loadGithubMaster(true);
  const general=masterDocument();rigRules=G.normalize(general?.rules,R);
  if(general?.defaultParts){state=R.normalize({parts:general.defaultParts});base=R.normalize(state)}
  setPixelPlanes(general?.pixelPlanes||{});
  updateLibrary();applyState();masterMessage();historyButtons();
  const recovered=safeGet(DRAFT,null);
  if(recovered?.format==="mahluk-2-workspace-draft-v1"&&D?.validWorkspaceDraft(recovered)){
   try{restore(recovered.workspace);workspaceDirty=false;
    setStatus("✓ LOCAL WORKSPACE AUTO-RESTORED · CONNECT GOOGLE FOR CLOUD SYNC",true)}
   catch(error){setStatus("WORKSPACE RESTORE SKIPPED: "+error.message,false)}
  }else setStatus("V6B PLANES + MASTER RIG RULES READY · SAVE TO SYNC",true);
 }catch(error){sourceError=String(error.message||error);setStatus("LOAD FAILED · "+sourceError,false)}
}

// Explicitly scoped bridge for Google Drive. Never writes to Semesta or Emotion Studio.
window.MH2DriveAdapter=Object.freeze({
 ready:()=>!!manifest,
 activeIdentifier:()=>identifier,
 workspaceHasUnsavedEdits:()=>workspaceDirty,
 workspaceDraft:()=>workspaceDraftDocument(),
 localWorkspaceDraft:()=>safeGet(DRAFT,null),
 flushWorkspaceDraft:()=>flushWorkspaceDraft(),
 markWorkspaceSynced(doc){
  if(doc?.workspace&&JSON.stringify(snapshot())===JSON.stringify(doc.workspace))
   workspaceDirty=false;
 },
 restoreWorkspaceDraft(doc){
  if(!D?.validWorkspaceDraft(doc))throw Error("Incompatible Google Drive workspace draft");
  if(workspaceDirty)throw Error("Current editor has unsaved edits. Save your workspace before restoring cloud.");
  const previous=safeGet(DRAFT,null);
  if(previous){
   try{localStorage.setItem("mahluk2-workspace-before-cloud-v1",JSON.stringify(previous))}
   catch(e){throw Error("Cannot safely back up local workspace: "+e.message)}
  }
  localStorage.setItem(DRAFT,JSON.stringify(doc));
  restore(doc.workspace);workspaceDirty=false;
  setStatus("✓ DRIVE EDITOR WORKSPACE LOADED · ALL POSES/KEYFRAMES/PIXELS PRESERVED",true);
 },
 localRecords:()=>getLibrary(),
 localSavedRoots:()=>getLocalLibrary(),
 importCloudRoot(record,{overwrite=false}={}){
  if(!D?.validCharacter(record))throw Error("Invalid Google Drive character root");
  const local=getLocalLibrary(),old=local.find(x=>x.id===record.id);
  if(old&&!overwrite)return false;
  if(old){
   // Keep the previous record before a verified one-sided cloud update.
   localStorage.setItem("mh2-backup-before-cloud:"+old.id,JSON.stringify(old));
  }
  const next=[{...record},...local.filter(x=>x.id!==record.id)];
  if(next.length>40)throw Error("Local character library is full (40 records)");
  if(!safePut(STORAGE,next))throw Error("Character library browser storage is full");
  updateLibrary();
  return true;
 },
 importCloudMasterQuiet(doc){
  if(!D?.validMaster(doc))throw Error("Invalid Google Drive master rig");
  const old=masterDocument();
  if(old&&JSON.stringify(old)!==JSON.stringify(doc))
   localStorage.setItem("mh2-backup-master-before-cloud-v1",JSON.stringify(old));
  // Update the default for future characters, without replacing the rig being edited.
  localStorage.setItem(G.KEY,JSON.stringify(doc));
  masterMessage();
  return true;
 },
 librarySnapshot(){
  if(!manifest)throw Error("Character source manifest not loaded yet");
  const custom=E.safeAssets(window.localStorage);
  const saved=getLocalLibrary();
  return {
   format:"mahluk-2-asset-library-v1",id:"mahluk-2-all-v1",
   name:"Mahluk Hidup 2 / Character Asset Library",
   // Source manifest lists all actual published native cutout and actor sprites.
   // Never copy protected game files; its source URLs can be loaded on any device.
   manifest:clone(manifest),
   sourceBase:"/virtual-life-asset-pipeline/media/original-rig/",
   published:clone(publishedAssets),
   customAssets:clone(custom),
   characters:saved.map(x=>({id:x.id,name:x.name,base:x.base,format:x.format,
    fourViews:true,cloudFile:x.id+".character.json"})),
   nativeReferences:{rigSource:"original-rig/manifest.json",
    labels:manifest.characters||manifest.character_types||manifest.types||[],
    emotionCatalog:"/virtual-life-asset-pipeline/emotion-studio/catalog.json"},
   savedAt:new Date().toISOString()
  };
 },
 restoreLibraryAssets(snapshot){
  if(snapshot?.format!=="mahluk-2-asset-library-v1"||
      !Array.isArray(snapshot.customAssets))throw Error("Invalid remote Mahluk 2 library snapshot");
  const current=E.safeAssets(window.localStorage),byId=new Map(current.map(x=>[x.id,x]));
  let added=0,skipped=0;
  for(const a of snapshot.customAssets){
   if(!a||a.format!==E.FORMAT||typeof a.png!=="string"||
      !/^data:image\/png;base64,/.test(a.png)||a.png.length>=1500000){skipped++;continue}
   if(byId.has(a.id)){skipped++;continue}
   byId.set(a.id,a);added++;
  }
  if(byId.size>12)throw Error("There are more than 12 local imported face/accessory assets. Export or remove older items before restoring.");
  E.saveAssets(window.localStorage,[...byId.values()]);
  loadImportedAssets();assetOptions();paint();
  return {added,skipped,published:manifest?Object.keys(manifest).length:0};
 },
 localMaster:()=>masterDocument(),
 saveRoot:()=>saveGame(),
 saveGeneralRig:()=>saveGeneralRig(),
 updateCloudRecords(records){
  cloudRecords=new Map((Array.isArray(records)?records:[]).filter(r=>r?.format==="mahluk-2-character-v1"&&r.id).map(r=>[r.id,r]));
  updateLibrary();
 },
 applyMasterFromDrive(doc){
  if(!doc||doc.format!=="mahluk-2-general-rig-v1"||!doc.rules||!doc.defaultParts)throw Error("Invalid Drive Master Rig");
  const current=masterDocument();
  if(current){try{localStorage.setItem("mahluk2-before-drive-master-v1",JSON.stringify(current))}catch{}}
  remember();
  localStorage.setItem(G.KEY,JSON.stringify(doc));
  rigRules=G.normalize(doc.rules,R);setPixelPlanes(doc.pixelPlanes||{});
  base=R.normalize({parts:doc.defaultParts});state=R.normalize(base);
  tracks=R.makeTracks();frames=1;frame=0;identifier=null;
  buildTree();updateLibrary();applyState();masterMessage();
  setStatus("✓ GOOGLE DRIVE MASTER LOADED / "+(doc.savedAt||"NO DATE"),true);
 },
 setStatus:(message,ok)=>setStatus(message,ok)
});

document.addEventListener("DOMContentLoaded",mount);
})(window);
