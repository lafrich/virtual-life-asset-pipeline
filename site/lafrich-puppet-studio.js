/* Lafrich Puppet Studio. Replaces live Genesis/stock workflows without deleting
 * historical Drive/Character records. Two fixed gender masters. New motion DB
 * starts empty. Native pixel art, 10-piece rig, Python literal authoring,
 * fitted four-view wear, and transformed/frontmost Emosi.
 */
(function(root){"use strict";
const C=root.LafrichPuppetCore,R=root.LafrichPuppetRenderer,$=id=>document.getElementById(id);
if(!C||!R){document.body.textContent="Lafrich Puppet engine unavailable";return}
const directions=C.DIRS,parts=C.PARTS,storage=key=>{
 try{const data=JSON.parse(localStorage.getItem(key)||"{}");return data&&typeof data==="object"?data:{}}catch{return {}}
};
const clone=C.clone;let mode="master",dir="se",gender="male",masterModels={male:C.master("male"),female:C.master("female")},
 characters={},motions={},character=C.character("male"),motion=C.motion(),frame=0,
 selectedPart="head",wearLayer="top",maskMode="select",tool="rig",
 dirtyMaster={male:false,female:false},dirtyCharacter=false,dirtyMotion=false,
 cloudVerified={male:false,female:false},cloudStatus={},copyMask=null,copyPose=null,
 zoom=4,fit=true,pan=false,pointer=null,editor=null,editorSession=null,
 editorBusy=false,playing=false,timer=null,renderEpoch=0,sceneVersion=0,
 preparedCache=new Map(),faces=[],loadedFaceImages=new Map();
const canvas=$("canvas"),ctx=canvas.getContext("2d"),viewport=$("viewport");
const anatomyChecks=new WeakMap();
const bridge=()=>{try{return root.parent!==root?root.parent.VLMahlukWorkspace:null}catch{return null}};
function status(msg,error=false){$("status").textContent=String(msg);$("status").classList.toggle("error",error)}
function validGender(g){if(!C.IDS[g])throw Error("Invalid base");return g}
function currentMaster(){return masterModels[gender]}
function fileDownload(name,text,type="application/json"){
 const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),15000);
}
function applyStored(){
 const prev=storage(C.MASTER_KEY);
 for(const g of ["male","female"])if(prev[g])try{masterModels[g]=C.validateMaster(prev[g])}catch(error){
  status("Stored "+g+" master unreadable. Cloud was not overwritten: "+error.message,true)
 }
 const cs=storage(C.CHARACTER_KEY);for(const [id,row] of Object.entries(cs))try{characters[id]=C.validateCharacter(row)}catch{}
 const ms=storage(C.MOTION_KEY);for(const [id,row] of Object.entries(ms))try{motions[id]=C.validateMotion(row)}catch{}
}
function localSave(key,data){
 localStorage.setItem(key,JSON.stringify(data));
}
function masterChanged(){
 dirtyMaster[gender]=true;sceneVersion++;preparedCache.clear();R.clearCache();void refreshScene();
}
async function ensureAnatomy(g){
 const existing=masterModels[g];
 if(!existing?.layers?.body?.se||dirtyMaster[g])return;
 if(anatomyChecks.has(existing))return anatomyChecks.get(existing);
 const check=(async()=>{
  try{
   const result=await R.repairIncompleteBody(existing);
   if(masterModels[g]!==existing||dirtyMaster[g]||!result.repaired.length)return;
   // Recover preview in memory only; original local/cloud profiles stay
   // unchanged until the user explicitly saves this restored anatomical body.
   masterModels[g]=result.master;dirtyMaster[g]=true;
   sceneVersion++;preparedCache.clear();R.clearCache();void refreshScene();
   if(g===gender)status("FULL BODY RECOVERED · torso, arms and legs · "+
    result.repaired.join("/").toUpperCase()+" · UNSAVED, verify and SAVE MASTER");
  }catch(e){if(g===gender)status("Body source verification failed: "+e.message,true)}
 })();
 anatomyChecks.set(existing,check);return check;
}
function characterChanged(){
 dirtyCharacter=true;sceneVersion++;preparedCache.clear();void refreshScene();
}
function motionChanged(){dirtyMotion=true;void refreshScene()}
function setMode(next){
 if(!["master","character","animation"].includes(next))return;
 mode=next;stop();
 for(const btn of document.querySelectorAll("[data-mode]"))btn.setAttribute("aria-selected",String(btn.dataset.mode===next));
 for(const p of document.querySelectorAll("[data-page]"))p.hidden=p.dataset.page!==next;
 for(const p of document.querySelectorAll("[data-card]"))p.hidden=p.dataset.card!==next;
 $("preview-title").textContent={
  master:"LAFRICH "+gender.toUpperCase()+" · 4-VIEW MASTER / RIG",
  character:"CUSTOM WEAR + EMOSI · LIVE PUPPET",
  animation:"PYTHON MOTION · ALL 10 BODY PIECES"}[next];
 const u=new URL(location.href);u.searchParams.set("mode",next);history.replaceState(null,"",u);
 status(next==="animation"?"EMPTY BY DEFAULT · Create or import a Python motion. No old 11 actions are active.":
  next==="master"?"LAFRICH "+gender.toUpperCase()+" · "+(dirtyMaster[gender]?"UNSAVED CHANGES":"ready")+
   " · seed from V6B art if needed.":"Character clothes and frontmost Emosi follow the hierarchical puppet.");
 syncControls();void refreshScene();
}
function setGender(next){
 if(!C.IDS[next])return;
 gender=next;
 $("master-gender").value=next;
 character.gender=next;
 selectedPart="head";sceneVersion++;preparedCache.clear();
 syncControls();void refreshScene();void ensureAnatomy(next);
}
function faceOptions(){
 const active=$("face-select"),keep=character.faceId;
 active.replaceChildren(new Option("BLANK / NONE",""));
 const actor={id:"lafrich_"+character.gender,gender:character.gender,template_category:"human",expressions:[]};
 root.VLMahlukEmosiBridge?.apply?.(actor);
 faces=actor.expressions.filter(f=>f.source==="emosi"&&f.overlay);
 for(const face of faces)active.add(new Option(face.label||face.id,face.id));
 active.value=faces.some(f=>f.id===keep)?keep:"";
}
async function refreshFaces(){
 try{
  const result=await root.VLMahlukEmosiBridge?.refresh?.();
  faceOptions();
  status("EMOSI.EXE "+(result?.count||0)+" expressions available · always frontmost on SE/SW");
 }catch(e){status("Emosi refresh warning: "+e.message,true)}
}
function faceForPreview(){
 if(mode==="master"||!character.faceId)return null;
 return faces.find(f=>f.id===character.faceId)||null;
}
async function currentEmosi(){
 const face=faceForPreview();if(!face)return null;
 if(loadedFaceImages.has(face.id))return loadedFaceImages.get(face.id);
 const promise=new Promise((resolve,reject)=>{
  const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error("Emosi overlay unavailable"));
  im.src=face.overlay;
 });
 loadedFaceImages.set(face.id,promise);return promise;
}
function currentPose(d=dir){
 if(mode==="master")return C.blankPose();
 if(mode==="character"){
  const id=$("character-motion").value,selected=motions[id];
  if(selected)return selected.frames[frame%selected.frames.length].poses[d];
  return C.blankPose();
 }
 if(!motion?.frames?.length)return C.blankPose();
 return motion.frames[Math.min(frame,motion.frames.length-1)].poses[d];
}
function renderCharacter(d){
 return mode==="master"?null:character.gender===gender?character:null;
}
async function getPrepared(d,face){
 const ch=renderCharacter(d),m=masterModels[gender];
 const key=[sceneVersion,gender,d,ch?.id||"working",mode==="master"?"master":"wear",face?.src||""].join("|");
 if(preparedCache.has(key))return preparedCache.get(key);
 const p=R.prepare(m,ch,d,face);preparedCache.set(key,p);return p;
}
async function refreshScene(){
 const rev=++renderEpoch;
 try{
  const face=await currentEmosi();
  if(rev!==renderEpoch)return;
  const shown={};
  for(const d of directions){
   const prepared=await getPrepared(d,face);
   if(rev!==renderEpoch)return;
   shown[d]=R.render(prepared,currentPose(d),frame);
  }
  ctx.clearRect(0,0,64,112);
  ctx.drawImage(shown[dir],0,0);
  if(mode==="master")drawRigGuides();
  for(const d of directions){
   const button=$("view-"+d),cv=button?.querySelector("canvas");
   if(cv){cv.getContext("2d").clearRect(0,0,64,112);cv.getContext("2d").drawImage(shown[d],0,0)}
   button?.setAttribute("aria-pressed",String(dir===d));
  }
  $("frames-info").textContent=(mode==="master"?"BASE":(frame+1)+"/"+(mode==="character"?(motions[$("character-motion").value]?.frames.length||1):(motion.frames.length||1)))+
   " · "+dir.toUpperCase()+" · "+gender.toUpperCase();
 }catch(error){
  if(rev===renderEpoch)status("PUPPET PREVIEW ERROR: "+error.message,true);
 }
}
function drawRigGuides(){
 const m=currentMaster(),pivot=m.pivots[dir],mask=C.decode(m.masks[dir]);
 if(tool==="mask"){
  ctx.fillStyle="rgba(45,168,255,.42)";
  const ix=parts.indexOf(selectedPart);
  for(let i=0;i<mask.length;i++)if(mask[i]===ix)ctx.fillRect(i%64,(i/64)|0,1,1);
 }else{
  for(const part of parts){
   const p=pivot[part];
   ctx.beginPath();ctx.arc(p.x+.5,p.y+.5,part===selectedPart?3:1.6,0,Math.PI*2);
   ctx.fillStyle=part===selectedPart?"#ff2e55":"#f9fafc";ctx.fill();
   ctx.strokeStyle="#154579";ctx.lineWidth=.7;ctx.stroke();
  }
  for(const part of parts){
   const parent=C.PARENTS[part];if(!parent)continue;
   const a=pivot[parent],b=pivot[part];
   ctx.beginPath();ctx.moveTo(a.x+.5,a.y+.5);ctx.lineTo(b.x+.5,b.y+.5);
   ctx.strokeStyle="#26bbe5";ctx.lineWidth=.8;ctx.stroke();
  }
 }
}
function fitZoom(){return Math.max(1,Math.min(16,Math.floor(Math.min((viewport.clientWidth-12)/64,(viewport.clientHeight-12)/112))))}
function setZoom(n,asFit=false){
 if(pointer)return;
 const w=canvas.getBoundingClientRect().width||64*zoom,h=canvas.getBoundingClientRect().height||112*zoom,
  u=w<=viewport.clientWidth?.5:(viewport.scrollLeft+viewport.clientWidth/2)/w,
  v=h<=viewport.clientHeight?.5:(viewport.scrollTop+viewport.clientHeight/2)/h;
 zoom=Math.max(1,Math.min(16,Math.round(n)));fit=asFit;
 canvas.style.width=(64*zoom)+"px";canvas.style.height=(112*zoom)+"px";
 $("zoom").value=zoom;viewport.scrollLeft=Math.max(0,u*64*zoom-viewport.clientWidth/2);
 viewport.scrollTop=Math.max(0,v*112*zoom-viewport.clientHeight/2);
}
function setPan(x){pan=!!x;$("pan").setAttribute("aria-pressed",String(pan));canvas.style.cursor=pan?"grab":"crosshair"}
function localPoint(e){
 const r=canvas.getBoundingClientRect();
 return {x:Math.max(0,Math.min(63,Math.floor((e.clientX-r.left)*64/r.width))),
  y:Math.max(0,Math.min(111,Math.floor((e.clientY-r.top)*112/r.height)))};
}
function paintMask(p){
 const mask=C.decode(currentMaster().masks[dir]),radius=Math.floor(Number($("brush").value)/2),
  index=parts.indexOf(selectedPart);let changed=false;
 for(let y=Math.max(0,p.y-radius);y<=Math.min(111,p.y+radius);y++)
 for(let x=Math.max(0,p.x-radius);x<=Math.min(63,p.x+radius);x++){
  if(Math.hypot(x-p.x,y-p.y)>radius+.4)continue;
  const i=y*64+x;
  if(maskMode==="erase"&&mask[i]!==index)continue;
  const next=maskMode==="erase"?255:index;
  if(mask[i]!==next){mask[i]=next;changed=true}
 }
 if(changed){currentMaster().masks[dir]=C.encode(mask);masterChanged()}
}
function syncPivot(){
 const p=currentMaster().pivots[dir][selectedPart];
 $("pivot-x").value=p.x;$("pivot-y").value=p.y;
 $("part-select").value=selectedPart;$("pose-part").value=selectedPart;
}
function movePivot(p){
 const point=currentMaster().pivots[dir][selectedPart];
 if(point.x===p.x&&point.y===p.y)return;
 point.x=p.x;point.y=p.y;syncPivot();masterChanged();
}
function poseValues(){
 const p=currentPose()[selectedPart];
 $("pose-x").value=p.x;$("pose-y").value=p.y;$("pose-angle").value=p.a;
}
function changeDirection(d){
 if(!directions.includes(d))return;
 dir=d;syncPivot();poseValues();void refreshScene();
}
function markDrawMode(t){
 tool=t;$("tool-rig").setAttribute("aria-pressed",String(t==="rig"));
 $("tool-mask").setAttribute("aria-pressed",String(t==="mask"));
 $("pivot-controls").hidden=t!=="rig";$("mask-controls").hidden=t!=="mask";
 void refreshScene();
}
function maskTool(t){
 maskMode=t;
 $("paint-mask").setAttribute("aria-pressed",String(t==="select"));
 $("erase-mask").setAttribute("aria-pressed",String(t==="erase"));
}
function flipMask(bytes){
 const flipped=new Uint8Array(C.N);
 for(let y=0;y<112;y++)for(let x=0;x<64;x++){
  const v=bytes[y*64+63-x];
  if(v===255){flipped[y*64+x]=255;continue}
  const part=parts[v],swapped=part.includes("near")?part.replace("near","far"):
   part.includes("far")?part.replace("far","near"):part;
  flipped[y*64+x]=parts.indexOf(swapped);
 }
 return flipped;
}
function prepareLook(){
 if(mode==="master"){character.gender=gender;return}
 gender=character.gender; $("master-gender").value=gender;
 faceOptions();
 sceneVersion++;preparedCache.clear();
}
function controlOptions(id,items,keep){
 const el=$(id);el.replaceChildren();
 for(const [value,label] of items)el.add(new Option(label,value));
 if(items.some(i=>i[0]===keep))el.value=keep;
}
function syncControls(){
 controlOptions("wear-layer",C.WEAR.map(x=>[x,x.toUpperCase().replaceAll("_"," ")]),wearLayer);
 controlOptions("part-select",parts.map(x=>[x,x.toUpperCase().replaceAll("_"," ")]),selectedPart);
 controlOptions("pose-part",parts.map(x=>[x,x.toUpperCase().replaceAll("_"," ")]),selectedPart);
 const hierarchy=$("hierarchy");hierarchy.replaceChildren();
 for(const part of parts){
  const div=document.createElement("div"),parent=C.PARENTS[part];
  div.className="small";div.textContent=(parent?"↳ ":"◆ ")+part.replaceAll("_"," ")+" ← "+(parent||"ROOT");
  hierarchy.append(div);
 }
 controlOptions("character-list",[["","SELECT CHARACTER"],...Object.values(characters).map(x=>[x.id,x.name+" / "+x.gender])],character.id);
 controlOptions("motion-list",[["","SELECT MOTION"],...Object.values(motions).map(x=>[x.id,x.name+" / "+x.frames.length+" frames"])],motion.id);
 const existingMotion=$("character-motion").value;
 const existingPreview=$("preview-character").value;
 controlOptions("character-motion",[["","BASE POSE"],...Object.values(motions).map(x=>[x.id,x.name])],existingMotion);
 controlOptions("preview-character",[["","BASE MASTER (NO WEAR)"],...Object.values(characters).filter(x=>x.gender===gender).map(x=>[x.id,x.name])],
  existingPreview||character.id);
 $("master-gender").value=gender;$("character-gender").value=character.gender;
 $("character-name").value=character.name;$("motion-name").value=motion.name;
 $("frame-index").value=Math.min(frame+1,motion.frames.length);
 $("frame-index").max=motion.frames.length;
 $("frame-duration").value=motion.frames[Math.min(frame,motion.frames.length-1)]?.ms||160;
 syncPivot();poseValues();
}
async function openPixelEditor(target,{piece=null}={}){
 if(editorBusy)return;
 const g=mode==="master"?gender:character.gender,layer=target;
 if(mode==="master"&&(!piece||layer!=="body"||!parts.includes(piece)))
  return status("MASTER editing is limited to Body Piece, slicing, and pivots",true);
 if(mode==="character"&&(piece||!C.WEAR.includes(layer)))
  return status("Clothing, hair, and accessories must be edited in CHARACTER / WEAR",true);
 editorBusy=true;
 try{
  const owner=mode==="master"?currentMaster().layers:character.wear;
  const atlas=R.rgba(64,448),g2=atlas.getContext("2d");
  const originalPixels={},originalMasks={};
  for(let i=0;i<4;i++){
   const d=directions[i],img=await R.loadPng(owner[layer]?.[d]);
   const cv=R.rgba(),v=cv.getContext("2d",{willReadFrequently:true});
   if(img)v.drawImage(img,0,0);
   if(piece){
    const pixels=v.getImageData(0,0,64,112).data;
    const maskText=currentMaster().masks[d];
    originalPixels[d]=new Uint8ClampedArray(pixels);
    originalMasks[d]=maskText;
    g2.putImageData(new ImageData(C.piecePixels(pixels,C.decode(maskText),piece),64,112),0,i*112);
   }else g2.drawImage(cv,0,i*112);
  }
  if(!editor){
   editor=root.MH2PlanePixelEditor.create({
    overlay:$("pixelOverlay"),canvas:$("pixelCanvas"),
    allowCrossViewPaste:true,
    onApply:()=>applyPixel(),onSaveDefault:()=>applyPixel(),onRestore:()=>{}
   });
  }
  const references={};
  for(const d of directions){
   const prepared=await R.prepare(masterModels[g],mode==="master"?null:character,d,null);
   references[d]=R.render(prepared,C.blankPose());
  }
  editorSession={mode,layer,piece,gender:g,characterId:character.id||"",
   originalPixels,originalMasks};
  editor.open({id:piece?"LAFRICH "+g.toUpperCase()+" · BODY PIECE "+piece.toUpperCase():
    (mode==="master"?"LAFRICH MASTER ":"LAFRICH WEAR ")+g+" / "+layer,
   initialAtlas:atlas,originalAtlas:atlas,referenceImages:references,direction:dir});
  status(piece?"BODY PIECE "+piece.toUpperCase()+" · Edit 4 views; newly painted pixels follow this piece's slice · APPLY then SAVE MASTER":
   "PIXEL EDITOR OPEN · "+layer+" · Edit SE/SW/NE/NW · APPLY then SAVE "+mode.toUpperCase());
 }catch(error){editorSession=null;status("Pixel Editor failed: "+error.message,true)}
 finally{editorBusy=false}
}
function applyPixel(){
 if(!editorSession||!editor)return false;
 try{
  const scope=editorSession;
  if(scope.mode!==mode||scope.gender!==(mode==="master"?gender:character.gender))
   throw Error("Source changed during editing; edits were not applied");
  const atlas=editor.getAtlas(),owner=mode==="master"?currentMaster().layers:character.wear;
  const next={...owner[scope.layer]};
  if(scope.piece){
   const current=currentMaster(),nextMasks={};
   // Validate every direction before changing the live master. Existing
   // pixels belonging to other pieces and all non-body layers are preserved.
   for(let i=0;i<4;i++){
    const d=directions[i];
    if(current.masks[d]!==scope.originalMasks[d])
     throw Error("Slice changed while editing "+d.toUpperCase()+"; reopen Body Piece editor");
    const selected=atlas.getContext("2d",{willReadFrequently:true})
     .getImageData(0,i*112,64,112).data;
    const result=C.applyPiecePixels(scope.originalPixels[d],selected,
     C.decode(scope.originalMasks[d]),scope.piece);
    const cv=R.rgba();
    cv.getContext("2d").putImageData(new ImageData(result.pixels,64,112),0,0);
    next[d]=cv.toDataURL("image/png");
    nextMasks[d]=C.encode(result.mask);
   }
   const validated=C.validateMaster({...current,
    layers:{...current.layers,[scope.layer]:next},
    masks:{...current.masks,...nextMasks}});
   masterModels[gender]=validated;
   masterChanged();
  }else{
   for(let i=0;i<4;i++){
    const cv=R.rgba(),g=cv.getContext("2d");
    g.drawImage(atlas,0,i*112,64,112,0,0,64,112);
    next[directions[i]]=cv.toDataURL("image/png");
   }
   owner[scope.layer]=next;
   mode==="master"?masterChanged():characterChanged();
  }
  editorSession=null;
  status("APPLIED · "+(scope.piece?"BODY PIECE "+scope.piece.toUpperCase():scope.layer.toUpperCase())+
   " · FOUR VIEWS · "+(mode==="master"?"SAVE MASTER":"SAVE CHARACTER")+" to persist");
  return true;
 }catch(error){status("Pixel Apply failed: "+error.message,true);return false}
}
async function importWearPng(file){
 if(mode!=="character")throw Error("Wear can only be imported in CHARACTER / WEAR");
 const selectedLayer=wearLayer,selectedDirection=dir,selectedCharacter=character;
 if(!C.WEAR.includes(selectedLayer))throw Error("Invalid Character wear layer");
 if(!file||file.type!=="image/png")throw Error("Choose PNG file");
 if(file.size>400000)throw Error("PNG is too large (400 KB maximum)");
 const data=await new Promise((resolve,reject)=>{
  const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error("PNG read failed"));
  reader.readAsDataURL(file);
 });
 const image=await R.loadPng(data);
 if(!image)throw Error("PNG did not decode");
 if(mode!=="character"||character!==selectedCharacter)
  throw Error("Character changed while importing; no wear was replaced");
 character.wear[selectedLayer][selectedDirection]=data;
 characterChanged();
 status("IMPORTED CHARACTER WEAR · "+selectedLayer.toUpperCase()+" / "+
  selectedDirection.toUpperCase()+" · SAVE CHARACTER to persist");
}
function setMotionFrame(i){
 frame=Math.max(0,Math.min(motion.frames.length-1,i));
 syncControls();void refreshScene();
}
function stop(){
 playing=false;clearTimeout(timer);timer=null;
 $("play").textContent="▶ PLAY";
}
function play(){
 if(playing){stop();return}
 if(mode==="master"){status("Switch to Character or Python Animation for motion playback");return}
 const frames=mode==="animation"?motion.frames:motions[$("character-motion").value]?.frames;
 if(!frames?.length){status("Create or select a motion to play",true);return}
 playing=true;$("play").textContent="❚❚ PAUSE";
 const advance=()=>{
  if(!playing)return;
  frame=(frame+1)%frames.length;
  $("frame-index").value=frame+1;
  void refreshScene();
  timer=setTimeout(advance,frames[frame].ms);
 };
 timer=setTimeout(advance,frames[frame%frames.length].ms);
}
function flipPose(framePose){
 const out={};
 for(const p of parts){
  const other=p.includes("near")?p.replace("near","far"):
   p.includes("far")?p.replace("far","near"):p;
  const v=framePose[other];out[p]={x:-v.x,y:v.y,a:-v.a};
 }
 return out;
}
function pastePose(modeAll=false,mirrored=false){
 if(!copyPose||!motion?.frames)return status("Copy pose first",true);
 if(modeAll&&!copyPose.all)return status("Use COPY ALL FRAMES first",true);
 if(modeAll&&copyPose.frames.length!==motion.frames.length)
  return status("Copy All requires same frame count; add/remove frames first",true);
 if(modeAll){
  for(let i=0;i<motion.frames.length;i++){
   motion.frames[i].poses[dir]=mirrored?flipPose(copyPose.frames[i]):clone(copyPose.frames[i]);
  }
 }else{
  const source=copyPose.all?copyPose.frames[Math.min(frame,copyPose.frames.length-1)]:copyPose.frames[0];
  motion.frames[frame].poses[dir]=mirrored?flipPose(source):clone(source);
 }
 poseValues();motionChanged();status((modeAll?"ALL FRAMES":"FRAME "+(frame+1))+
  (mirrored?" PASTE FLIP":" PASTE")+" · "+copyPose.dir+" → "+dir);
}
function newCharacter(){
 character=C.character($("character-gender").value,"New Lafrich Character");
 character.faceId="";dirtyCharacter=false;prepareLook();syncControls();void refreshScene();
 status("NEW LAFRICH CHARACTER · "+character.gender+" · wear blank. Choose part and paint.");
}
function newMotion(){
 stop();motion=C.motion("New Motion");frame=0;dirtyMotion=false;
 syncControls();void refreshScene();status("NEW MOTION · 10 body pieces / 4 views / 1 frame · no native stock frames.");
}
function saveLocalMaster(){
 const m=currentMaster();m.updated=new Date().toISOString();
 const validated=C.validateMaster(m),data={...storage(C.MASTER_KEY),[gender]:validated};
 localSave(C.MASTER_KEY,data);masterModels[gender]=validated;dirtyMaster[gender]=false;
 status("LAFRICH "+gender.toUpperCase()+" MASTER SAVED LOCAL · fixed ID "+validated.id+
  " · Drive not changed");
}
function saveLocalCharacter(){
 character.name=$("character-name").value.trim()||"Custom Character";
 if(!character.id)character.id="lafrich_char_"+Date.now().toString(36);
 const record=C.validateCharacter(character),data={...storage(C.CHARACTER_KEY),[record.id]:record};
 localSave(C.CHARACTER_KEY,data);characters[record.id]=record;character=record;dirtyCharacter=false;
 syncControls();status("LAFRICH CHARACTER SAVED LOCAL · "+record.id+" · Drive not changed");
}
function saveLocalMotion(){
 motion.name=$("motion-name").value.trim()||"Untitled Motion";
 if(!motion.id)motion.id="lafrich_motion_"+Date.now().toString(36);
 const record=C.validateMotion(motion),data={...storage(C.MOTION_KEY),[record.id]:record};
 localSave(C.MOTION_KEY,data);motions[record.id]=record;motion=record;dirtyMotion=false;
 syncControls();status("PYTHON MOTION SAVED LOCAL · "+record.id+" · "+record.frames.length+" frames · Drive not changed");
}
async function saveCloud(kind){
 const b=bridge();if(!b?.isOnline?.())return status("CONNECT GOOGLE DRIVE in Mahluk toolbar first; local edits are safe.",true);
 let record,key;
 if(kind==="lafrich_master"){record=C.validateMaster(currentMaster());key=record.id;}
 else if(kind==="lafrich_character"){
  saveLocalCharacter();record=C.validateCharacter(character);key=record.id;
 }else{
  saveLocalMotion();record=C.validateMotion(motion);key=record.id;
 }
 try{
  const remote=await b.loadOnline(kind,key);
  if(kind==="lafrich_master"&&remote?.updated&&remote.updated!==record.updated)
   return status("MASTER SAVE BLOCKED: Drive has different revision "+remote.updated+
    ". Download backup first; do not overwrite last edits.",true);
  if(!confirm("SAVE "+key+" to Lafrich Puppet Drive database? "+
   (kind==="lafrich_master"?"This overwrites the same fixed master ID.":"Old Genesis records remain archived.")))return;
  const data={...record,updated:new Date().toISOString()};
  const receipt=await b.saveOnline(kind,key,data);
  if(!receipt?.verified)throw Error("Cloud save read-back failed");
  if(kind==="lafrich_master"){
   masterModels[gender]=C.validateMaster(data);dirtyMaster[gender]=false;
   localSave(C.MASTER_KEY,{...storage(C.MASTER_KEY),[gender]:data});
  }else if(kind==="lafrich_character"){
   characters[key]=record;localSave(C.CHARACTER_KEY,{...storage(C.CHARACTER_KEY),[key]:record});
  }else{motions[key]=record;localSave(C.MOTION_KEY,{...storage(C.MOTION_KEY),[key]:record})}
  status("CLOUD VERIFIED · "+kind+" / "+key+" · "+data.updated);
  if(kind==="lafrich_master")try{
   root.parent?.postMessage({type:"lafrich:master-saved",gender},location.origin);
  }catch{}
 }catch(error){status("CLOUD SAVE FAILED · "+error.message+" · local edits unchanged",true)}
}
async function cloudLoad(all=false){
 const b=bridge();if(!b?.isOnline?.())return status("Connect Drive to load Lafrich database",true);
 try{
  if(all){
   const [cs,ms]=await Promise.all([b.listOnline("lafrich_character"),b.listOnline("lafrich_motion")]);
   for(const x of cs)try{characters[x.id]=C.validateCharacter(x)}catch{}
   for(const x of ms)try{motions[x.id]=C.validateMotion(x)}catch{}
   syncControls();
   status("LAFRICH CLOUD LIBRARY · "+Object.keys(characters).length+" characters, "+
    Object.keys(motions).length+" motions. The legacy 11 actions are not imported.");
   return;
  }
  if(dirtyMaster[gender])return status("UNSAVED MASTER · Export backup or Save Local before loading Drive.",true);
  const remote=await b.loadOnline("lafrich_master",C.IDS[gender]);
  if(!remote)return status("NO LAFRICH "+gender.toUpperCase()+" MASTER ON DRIVE · local / V6B seed is untouched.",true);
  const next=C.validateMaster(remote),local=masterModels[gender],isNewer=
   Date.parse(local.updated||"")>Date.parse(next.updated||"");
  if(isNewer)return status("LOCAL MASTER NEWER than Drive; no data replaced. Export backup before overwrite.",true);
  masterModels[gender]=next;sceneVersion++;preparedCache.clear();
  localSave(C.MASTER_KEY,{...storage(C.MASTER_KEY),[gender]:next});cloudVerified[gender]=true;
  void refreshScene();syncControls();
  status("LAFRICH "+gender.toUpperCase()+" LOADED FROM DRIVE · last saved "+(next.updated||"unknown"));
  await ensureAnatomy(gender);
 }catch(error){status("Lafrich Cloud load failed: "+error.message,true)}
}
async function seedBase(){
 if(dirtyMaster[gender]&&!confirm("Discard current UNSAVED Lafrich "+gender+" art and seed V6B-style again?"))return;
 if(currentMaster().layers.body?.se&&!confirm("Replace current "+gender+" base art with V6B reference seed? Save a backup first."))return;
 try{
  status("Seeding Lafrich "+gender+" from approved V6B pixel art. No old motion is imported.");
  const result=await R.seedFromV6B(gender),previous=currentMaster();
  masterModels[gender]=C.validateMaster({...previous,layers:{...previous.layers,
   body:result.layers.body,body_front:result.layers.body_front}});
  masterChanged();
  status("FULL NUDE BODY RESTORED · head, torso, arms, legs · 4 views · slicing and pivots preserved · UNSAVED");
 }catch(error){status("Seed failed: "+error.message,true)}
}
function attach(){
 for(const btn of document.querySelectorAll("[data-mode]"))btn.onclick=()=>setMode(btn.dataset.mode);
 for(const d of directions){
  const b=document.createElement("button");b.id="view-"+d;
  const cv=R.rgba();b.append(cv);
  const cap=document.createElement("span");cap.textContent=d.toUpperCase();b.append(cap);
  b.onclick=()=>changeDirection(d);$("views").append(b);
 }
 $("master-gender").onchange=e=>setGender(e.target.value);
 $("character-gender").onchange=()=>newCharacter();
 $("wear-layer").onchange=e=>{wearLayer=e.target.value};
 $("part-select").onchange=e=>{selectedPart=e.target.value;syncPivot();void refreshScene()};
 $("pose-part").onchange=e=>{selectedPart=e.target.value;syncPivot();poseValues();void refreshScene()};
 $("tool-rig").onclick=()=>markDrawMode("rig");$("tool-mask").onclick=()=>markDrawMode("mask");
 $("paint-mask").onclick=()=>maskTool("select");$("erase-mask").onclick=()=>maskTool("erase");
 $("pivot-x").onchange=e=>{const p=currentMaster().pivots[dir][selectedPart];p.x=Math.max(0,Math.min(63,Math.round(Number(e.target.value)||0)));masterChanged()};
 $("pivot-y").onchange=e=>{const p=currentMaster().pivots[dir][selectedPart];p.y=Math.max(0,Math.min(111,Math.round(Number(e.target.value)||0)));masterChanged()};
 // Copy only the selected piece. Never replace the complete 10-piece mask
 // when pasting one arm/leg/head into another direction.
 $("copy-mask").onclick=()=>{
  copyMask={bytes:C.decode(currentMaster().masks[dir]),part:selectedPart,dir,gender};
  status("SLICE COPIED · "+selectedPart.toUpperCase()+" / "+dir.toUpperCase()+
   " · choose destination piece/view then PASTE or PASTE FLIP");
 };
 function pasteCopiedMask(mirror){
  if(!copyMask)return status("Select a piece and COPY MASK first",true);
  if(copyMask.gender!==gender)return status("Copied slice belongs to the other Lafrich master; COPY again",true);
  const sourceIndex=parts.indexOf(copyMask.part),targetIndex=parts.indexOf(selectedPart);
  if(sourceIndex<0||targetIndex<0)return status("Invalid source/target slice",true);
  const result=C.decode(currentMaster().masks[dir]);
  // Unassign the destination piece, leaving every other piece intact.
  for(let i=0;i<result.length;i++)if(result[i]===targetIndex)result[i]=255;
  let count=0;
  for(let y=0;y<112;y++)for(let x=0;x<64;x++){
   const from=y*64+x;
   if(copyMask.bytes[from]!==sourceIndex)continue;
   const to=y*64+(mirror?63-x:x);
   result[to]=targetIndex;count++;
  }
  if(!count)return status("Copied slice contains no pixels",true);
  currentMaster().masks[dir]=C.encode(result);masterChanged();
  status((mirror?"PASTE FLIP":"PASTE")+" · "+copyMask.part.toUpperCase()+" / "+
   copyMask.dir.toUpperCase()+" → "+selectedPart.toUpperCase()+" / "+
   dir.toUpperCase()+" · "+count+" PIXELS · UNSAVED");
 }
 $("paste-mask").onclick=()=>pasteCopiedMask(false);
 $("flip-mask").onclick=()=>pasteCopiedMask(true);
 $("edit-piece").onclick=()=>void openPixelEditor("body",{piece:selectedPart});
 $("edit-wear").onclick=()=>void openPixelEditor(wearLayer);
 $("seed-v6b").onclick=()=>void seedBase();
 $("import-wear").onchange=e=>{const file=e.target.files?.[0];if(file)void importWearPng(file).catch(err=>status(err.message,true));e.target.value=""};
 $("save-master-local").onclick=()=>{try{saveLocalMaster()}catch(e){status(e.message,true)}};
 $("save-master-cloud").onclick=()=>void saveCloud("lafrich_master");
 $("load-master-cloud").onclick=()=>void cloudLoad();
 $("master-backup").onclick=()=>fileDownload(C.IDS[gender]+"-lafrich-backup.json",JSON.stringify(C.validateMaster(currentMaster()),null,2));
 $("character-new").onclick=newCharacter;
 $("character-load").onclick=()=>{const row=characters[$("character-list").value];
  if(!row)return status("Select a Lafrich character",true);
  if(dirtyCharacter&&!confirm("Discard unsaved character edits?"))return;
  character=C.validateCharacter(row);prepareLook();syncControls();void refreshScene();status("OPEN CHARACTER · "+character.name)};
 $("save-character-local").onclick=()=>{try{saveLocalCharacter()}catch(e){status(e.message,true)}};
 $("save-character-cloud").onclick=()=>void saveCloud("lafrich_character");
 $("character-name").onchange=e=>{character.name=e.target.value;characterChanged()};
 $("face-select").onchange=e=>{character.faceId=e.target.value;characterChanged()};
 $("refresh-faces").onclick=()=>void refreshFaces();
 $("open-emosi").onclick=()=>{const b=bridge();
  if(b)b.show("emotion");else root.open("/virtual-office/emotion-studio/","_blank","noopener")};
 $("character-motion").onchange=()=>{frame=0;void refreshScene()};
 $("motion-new").onclick=newMotion;
 $("motion-open").onclick=()=>{const row=motions[$("motion-list").value];if(!row)return status("Select a Lafrich motion",true);
  if(dirtyMotion&&!confirm("Discard unsaved motion edits?"))return;
  motion=C.validateMotion(row);frame=0;dirtyMotion=false;syncControls();void refreshScene();status("OPEN PYTHON MOTION · "+motion.name)};
 $("motion-name").onchange=e=>{motion.name=e.target.value;motionChanged()};
 $("frame-index").onchange=e=>setMotionFrame(Math.round(Number(e.target.value)||1)-1);
 $("frame-duration").onchange=e=>{const value=Math.max(40,Math.min(5000,Math.round(Number(e.target.value)||160)));
  motion.frames[frame].ms=value;motionChanged()};
 $("frame-add").onclick=()=>{if(motion.frames.length>=96)return status("Max 96 frames per motion",true);
  motion.frames.splice(frame+1,0,clone(motion.frames[frame]));setMotionFrame(frame+1);motionChanged()};
 $("frame-remove").onclick=()=>{if(motion.frames.length===1)return status("At least one frame required",true);
  motion.frames.splice(frame,1);setMotionFrame(frame);motionChanged()};
 for(const [id,key] of [["pose-x","x"],["pose-y","y"],["pose-angle","a"]]){
  $(id).onchange=e=>{const p=motion.frames[frame].poses[dir][selectedPart],lim=key==="x"?64:key==="y"?112:360;
   p[key]=Math.max(-lim,Math.min(lim,Number(e.target.value)||0));motionChanged()};
 }
 $("pose-copy").onclick=()=>{copyPose={dir,all:false,frames:[clone(motion.frames[frame].poses[dir])]};
  status("COPIED FRAME "+(frame+1)+" "+dir.toUpperCase())};
 $("pose-paste").onclick=()=>pastePose(false,false);
 $("pose-flip").onclick=()=>pastePose(false,true);
 $("direction-copy").onclick=()=>{copyPose={dir,all:true,frames:motion.frames.map(f=>clone(f.poses[dir]))};status("COPIED ALL "+dir.toUpperCase()+" FRAMES")};
 $("direction-paste").onclick=()=>pastePose(true,false);
 $("direction-flip").onclick=()=>pastePose(true,true);
 $("preview-character").onchange=e=>{
  const row=characters[e.target.value];
  if(row){character=clone(row);gender=row.gender}else{character=C.character(gender)}
  prepareLook();void refreshScene();
 };
 $("export-python").onclick=()=>{try{
  motion.name=$("motion-name").value;fileDownload((motion.id||"lafrich-motion")+".py",C.toPython(motion),"text/x-python");
 }catch(e){status(e.message,true)}};
 $("python-file").onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{const data=await file.text(),row=C.fromPython(data);
   if(dirtyMotion&&!confirm("Replace current unsaved motion with imported Python file?"))return;
   motion=row;motion.id="";frame=0;dirtyMotion=true;syncControls();void refreshScene();
   status("IMPORTED VALID LAFRICH PYTHON MOTION · "+row.name+" · "+row.frames.length+" frames");
  }catch(error){status("PYTHON IMPORT REJECTED: "+error.message,true)}
  finally{e.target.value=""}
 };
 $("save-motion-local").onclick=()=>{try{saveLocalMotion()}catch(e){status(e.message,true)}};
 $("save-motion-cloud").onclick=()=>void saveCloud("lafrich_motion");
 $("previous-frame").onclick=()=>setMotionFrame(frame-1);
 $("next-frame").onclick=()=>setMotionFrame(frame+1);
 $("play").onclick=play;
 $("zoom").oninput=e=>setZoom(Number(e.target.value));
 $("zoom-out").onclick=()=>setZoom(zoom-1);$("zoom-in").onclick=()=>setZoom(zoom+1);
 $("zoom-fit").onclick=()=>setZoom(fitZoom(),true);
 $("pan").onclick=()=>setPan(!pan);
 viewport.addEventListener("wheel",e=>{if(!e.ctrlKey&&!e.metaKey)return;
  e.preventDefault();setZoom(zoom+(e.deltaY<0?1:-1))},{passive:false});
 canvas.addEventListener("pointerdown",e=>{
  if(pan){pointer={id:e.pointerId,kind:"pan",x:e.clientX,y:e.clientY,
   left:viewport.scrollLeft,top:viewport.scrollTop};}
  else if(mode==="master"){
   const p=localPoint(e);
   pointer={id:e.pointerId,kind:tool};tool==="mask"?paintMask(p):movePivot(p);
  }else if(mode==="animation"){
   const p=localPoint(e),pivot=masterModels[gender].pivots[dir][selectedPart],
    v=motion.frames[frame].poses[dir][selectedPart];
   pointer={id:e.pointerId,kind:"pose",x:e.clientX,y:e.clientY,start:{...v},
    scaleX:64/canvas.getBoundingClientRect().width,scaleY:112/canvas.getBoundingClientRect().height};
   status("DRAGGING "+selectedPart+" · x/y pose offsets. Set ANGLE separately.");
  }else return;
  canvas.setPointerCapture(e.pointerId);
 });
 canvas.addEventListener("pointermove",e=>{
  if(!pointer||pointer.id!==e.pointerId)return;
  if(pointer.kind==="pan"){
   viewport.scrollLeft=pointer.left+pointer.x-e.clientX;
   viewport.scrollTop=pointer.top+pointer.y-e.clientY;return;
  }
  if(pointer.kind==="pose"){
   const v=motion.frames[frame].poses[dir][selectedPart];
   v.x=Math.max(-64,Math.min(64,Math.round(pointer.start.x+(e.clientX-pointer.x)*pointer.scaleX)));
   v.y=Math.max(-112,Math.min(112,Math.round(pointer.start.y+(e.clientY-pointer.y)*pointer.scaleY)));
   poseValues();motionChanged();return;
  }
  if(mode!=="master")return;
  const p=localPoint(e);if(pointer.kind==="mask")paintMask(p);else movePivot(p);
 });
 for(const type of ["pointerup","pointercancel"])canvas.addEventListener(type,()=>{pointer=null});
 root.addEventListener("message",e=>{
  if(e.origin!==location.origin)return;
  if(e.data?.type==="mahluk:cloud-connected"){
   if(!dirtyMaster[gender])void cloudLoad(false);
   void cloudLoad(true);void refreshFaces();
  }
  if(e.data?.type==="lafrich:master-updated"&&!dirtyMaster[gender]){
   const saved=storage(C.MASTER_KEY);
   for(const g of ["male","female"])if(saved[g]&&!dirtyMaster[g])
    try{masterModels[g]=C.validateMaster(saved[g])}catch{}
   sceneVersion++;preparedCache.clear();R.clearCache();void refreshScene();
   status("LAFRICH MASTER UPDATED · four views, clothing and motion preview refreshed");
  }
 });
 // Every Mahluk tab uses a separate iframe. Sync only saved Lafrich data
 // across tabs, never replace work-in-progress or revive legacy animations.
 root.addEventListener("storage",e=>{
  if(![C.MASTER_KEY,C.CHARACTER_KEY,C.MOTION_KEY].includes(e.key))return;
  if(e.key===C.MASTER_KEY){
   const source=storage(C.MASTER_KEY);let updated=false;
   for(const g of ["male","female"])if(source[g]&&!dirtyMaster[g]){
    try{masterModels[g]=C.validateMaster(source[g]);updated=true}catch{}
   }
   if(updated){sceneVersion++;preparedCache.clear();R.clearCache()}
  }else if(e.key===C.CHARACTER_KEY){
   for(const [id,row] of Object.entries(storage(C.CHARACTER_KEY)))
    try{characters[id]=C.validateCharacter(row)}catch{}
  }else{
   for(const [id,row] of Object.entries(storage(C.MOTION_KEY)))
    try{motions[id]=C.validateMotion(row)}catch{}
  }
  syncControls();void refreshScene();
 });
 root.addEventListener("pagehide",stop);
 if(root.ResizeObserver)new ResizeObserver(()=>{if(fit&&!pointer)setZoom(fitZoom(),true)}).observe(viewport);
}
async function initialize(){
 applyStored();attach();syncControls();faceOptions();
 setZoom(fitZoom(),true);
 const route=new URLSearchParams(location.search).get("mode");
 setMode(["master","character","animation"].includes(route)?route:"master");
 // Visual seed is authored in separate NEW masters; never write to old V6B.
 for(const g of ["male","female"]){
  if(masterModels[g].layers.body?.se)continue;
  try{const seed=await R.seedFromV6B(g);
   if(!masterModels[g].layers.body?.se&&!dirtyMaster[g]){
    const prior=masterModels[g];
    masterModels[g]=C.validateMaster({...prior,layers:{...prior.layers,
     body:seed.layers.body,body_front:seed.layers.body_front}});
    sceneVersion++;preparedCache.clear();
   }
  }catch(error){status("V6B seed optional: "+error.message+" · paint or import 64×112 art",true)}
 }
 syncControls();void refreshScene();
 if(bridge()?.isOnline?.()){
  await cloudLoad(false);void cloudLoad(true);void refreshFaces();
 }
 await Promise.all(["male","female"].map(g=>ensureAnatomy(g)));
}
void initialize().catch(e=>status("Lafrich Puppet startup failed: "+e.message,true));
})(window);