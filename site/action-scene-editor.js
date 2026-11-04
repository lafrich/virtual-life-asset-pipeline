/* Mahluk Hidup — Multi-Actor ACT Editor, Windows XP.
 * Original source sprites never change. Published poses + 4-dir modular
 * outfit overlays + actor-specific face previews are composited in a stage.
 */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const A=window.VLActionScenes,FACE=window.VLExpressionContext;
const DIR=["se","sw","ne","nw"],SLOTS=["shirt","pants","hair","shoes","bag","helmet"];
const AREA={w:900,h:530,cx:450,cy:405},SPRITE={w:64,h:112,pivotX:32,pivotY:100,scale:2};
const CUSTOM_KEY="virtual-life-character-storage-v1";
const ITEM_KEY="virtual-life-accessories-v1",EQUIP_KEY="virtual-life-accessory-equipment-v1";
const FACE_LIBRARY_KEY="virtual-life-face-assets-v1";
const SAFE_MEDIA=/^media\/[a-z0-9_.-]+\.png$/i;
const $stage=$("act-stage"),ctx=$stage.getContext("2d");
ctx.imageSmoothingEnabled=false;
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const entries=new Map(),pictures=new Map(),tintCache=new Map(),buffers=new Map();
let build="",facesDB=null,equipment={},items=[],scene=null,slot=1,play=true,timeMs=0,lastTime=0,drag=null,dirty=false,ready=false;
let pendingOutfit=null,faceAssets=[];
const status=message=>{$("act-status").textContent=message;};
const filename=name=>(name||"act").replace(/[^a-z0-9_-]+/gi,"_").slice(0,48);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,Number(x)||0));
const idOK=x=>typeof x==="string"&&/^[a-z][a-z0-9_-]{0,89}$/.test(x);
function link(path){
 if(typeof path!=="string")return null;
 if(path.startsWith("data:image/png;base64,")&&path.length<100000)return path;
 if(!SAFE_MEDIA.test(path))return null;
 return "./"+path+(build?"?build="+encodeURIComponent(build):"");
}
function picture(path){
 const uri=link(path);if(!uri)return null;
 if(!pictures.has(uri)){
  const image=new Image();const record={image,ready:false,failed:false};
  pictures.set(uri,record);
  image.onload=()=>{record.ready=true;paint();};
  image.onerror=()=>{record.failed=true;paint();};
  image.src=uri;
 }
 const entry=pictures.get(uri);return entry.ready?entry.image:null;
}
const actorFor=p=>entries.get(p?.actorId)||null;
const selected=()=>scene?.participants.find(x=>x.slot===slot)||null;
const firstMotion=actor=>(actor?.motions||[]).find(m=>m.available&&["native","custom"].includes(m.source))||null;
function motionsFor(actor){
 return (actor?.motions||[]).filter(m=>m.available&&
  ["native","custom"].includes(m.source)&&Number(m.frames)>0&&
  (SAFE_MEDIA.test(m.sheet||"")||SAFE_MEDIA.test(actor.sheet||"")));
}
function motionFor(actor,p){return motionsFor(actor).find(m=>m.id===p.motionId)||null;}
function actorBase(actor){return actor?.baseId||actor?.base_id||actor?.id||"";}
function equipmentItemsFor(actor,category){
 return items.filter(item=>item.category===category&&
  (item.template_base||"astrofrich_base")===actorBase(actor));
}
function refreshFaceLibrary(){
 const stored=read(FACE_LIBRARY_KEY,[]);
 faceAssets=Array.isArray(stored)?stored.filter(x=>x&&idOK(x.id)&&idOK(x.actorBase)&&
  typeof x.name==="string"&&typeof x.data==="string"&&x.data.length<100000&&
  /^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(x.data)).slice(0,80):[];
}
function saveFaceAsset(entry){
 refreshFaceLibrary();
 const next=[entry,...faceAssets.filter(x=>x.id!==entry.id)].slice(0,80);
 localStorage.setItem(FACE_LIBRARY_KEY,JSON.stringify(next));faceAssets=next;
}
function refreshLocal(){
 items=read(ITEM_KEY,[]);
 if(!Array.isArray(items))items=[];
 items=items.filter(item=>item&&idOK(item.id)&&SLOTS.includes(item.category)&&
  DIR.every(d=>typeof item.frames?.[d]==="string"&&
   item.frames[d].startsWith("data:image/png;base64,"))&&
  Object.values(item.frames).every(v=>v.length<100000));
 equipment=read(EQUIP_KEY,{});
 if(!equipment||typeof equipment!=="object")equipment={};
 refreshFaceLibrary();
}
function hydrateCustom(){
 const rows=read(CUSTOM_KEY,[]);
 if(!Array.isArray(rows))return;
 for(const row of rows.slice(0,60)){
  if(!idOK(row?.id)||!idOK(row?.base)||!entries.has(row.base))continue;
  const base=entries.get(row.base);
  entries.set(row.id,{...base,id:row.id,name:String(row.name||row.id).slice(0,60),
   baseId:row.base,base_id:row.base,custom_character:true,
   skinTone:row.skinTone||base.skinTone,template:false});
 }
}
function option(value,label){const el=document.createElement("option");el.value=value;el.textContent=label;return el;}
function populateActors(){
 for(const id of ["act-add-character","act-actor"]){
  const sel=$(id);sel.replaceChildren();
  for(const actor of [...entries.values()].filter(x=>x.sheet).sort((a,b)=>a.name.localeCompare(b.name)))
   sel.append(option(actor.id,actor.name||actor.id));
 }
}
function defaultParticipant(actorId,ordinal){
 const actor=entries.get(actorId);
 const human=["human_male_base","human_female_base"].includes(actorBase(actor));
 return {slot:ordinal+1,actorId,motionId:firstMotion(actor)?.id||"idle",
  direction:ordinal%2?"sw":"se",expressionId:"neutral",autoFace:true,
  x:ordinal===0?-90:ordinal===1?90:Math.min(300,(ordinal-1)*42),
  y:ordinal%2?8:0,layer:ordinal,objectLayer:"front",
  faceOffsetX:0,faceOffsetY:0,colors:{shirt:"#5072b4",pants:"#424956"},
  equipment:Object.fromEntries(A.SLOTS.map(k=>[k,human&&k==="shirt"?"builtin_shirt":
   human&&k==="pants"?"builtin_pants":"inherit"]))};
}
function emptyScene(){
 const male=entries.get("human_male_base")?.id||[...entries.keys()][0];
 const female=entries.get("human_female_base")?.id||[...entries.keys()][1]||male;
 if(!male)return null;
 const p=[defaultParticipant(male,0)];
 if(female&&entries.size>=2)p.push(defaultParticipant(female,1));
 return {id:"",version:1,name:"Two-Character Interaction",
  trigger:"interact",fixture:"any",durationMs:2400,loop:true,participants:p};
}
function setScene(next,mark=false){
 const data=A.clean(next);if(!data)return;
 scene=data;slot=scene.participants[0].slot;timeMs=0;lastTime=0;drag=null;play=true;
 pendingOutfit=null;
 dirty=mark;renderSceneForm();renderPresets();renderParticipants();renderInspector();paint();syncPlay();
}
function markDirty(){
 dirty=true;$("act-save-state").textContent="UNSAVED CHANGES";
 $("act-stage-name").textContent=scene.name.toUpperCase()+".ACT*";
}
function renderPresets(){
 const rows=A.list(),list=$("act-saved-list");list.replaceChildren();
 $("act-preset-count").textContent=String(rows.length).padStart(2,"0");
 if(!rows.length){const p=document.createElement("p");p.className="scene-mini";p.textContent="NO ACTS SAVED YET.";list.append(p);}
 for(const item of rows){
  const b=document.createElement("button");b.type="button";b.className="scene-item";
  b.classList.toggle("active",item.id===scene?.id);
  const strong=document.createElement("strong");strong.textContent=item.name;
  const small=document.createElement("small");small.textContent=item.participants.length+
   " CHAR · "+item.trigger.toUpperCase()+" · "+item.fixture.toUpperCase();
  b.append(strong,small);b.onclick=()=>setScene(item,false);list.append(b);
 }
}
function renderParticipants(){
 const list=$("act-character-list");list.replaceChildren();
 $("act-actor-count").textContent=String(scene.participants.length).padStart(2,"0");
 for(const p of scene.participants){
  const actor=actorFor(p),b=document.createElement("button");b.type="button";
  b.className="scene-item";b.classList.toggle("active",p.slot===slot);
  const strong=document.createElement("strong");strong.textContent=
   String(p.slot).padStart(2,"0")+" · "+(actor?.name||"MISSING ACTOR");
  const small=document.createElement("small");small.textContent=
   p.motionId.replaceAll("_"," ").toUpperCase()+" · "+p.direction.toUpperCase()+" · LAYER "+p.layer;
  b.append(strong,small);
  b.onclick=()=>{slot=p.slot;renderParticipants();renderInspector();paint();};
  list.append(b);
 }
}
function renderSceneForm(){
 $("act-name").value=scene.name;$("act-trigger").value=scene.trigger;
 if($("act-trigger").value!==scene.trigger)$("act-trigger").value="custom";
 $("act-fixture").value=scene.fixture;
 if($("act-fixture").value!==scene.fixture)$("act-fixture").value="custom";
 $("act-duration").value=scene.durationMs;
 $("act-loop").checked=scene.loop;
 $("act-scrub").max=String(scene.durationMs);
 $("act-scrub").value=String(timeMs);
 $("act-stage-name").textContent=scene.name.toUpperCase()+".ACT"+(dirty?"*":"");
 $("act-save-state").textContent=dirty?"UNSAVED CHANGES":scene.id?"SAVED PRESET":"NEW ACT";
}
function outfitDraft(p){
 if(!pendingOutfit||pendingOutfit.slot!==p.slot||pendingOutfit.actorId!==p.actorId)
  pendingOutfit={slot:p.slot,actorId:p.actorId,
   equipment:{...p.equipment},colors:{...p.colors},changed:false};
 return pendingOutfit;
}
function outfitNote(message,cls=""){
 const label=$("act-outfit-pending");
 label.textContent=message;label.classList.toggle("is-pending",cls==="pending");
 label.classList.toggle("is-applied",cls==="applied");
}
function applyOutfit(){
 const p=selected();if(!p)return;
 const draft=outfitDraft(p);
 p.equipment={...draft.equipment};p.colors={...draft.colors};
 pendingOutfit=null;tintCache.clear();
 markDirty();paint();renderGear(p,actorFor(p));
 outfitNote("✓ APPLIED TO PREVIEW · BAJU/CELANA UPDATED FOR CHARACTER "+p.slot,"applied");
 status("✓ OUTFIT APPLIED · "+(actorFor(p)?.name||p.actorId).toUpperCase());
}
function renderGear(p,actor){
 const draft=outfitDraft(p);
 for(const category of SLOTS){
  const sel=$("act-gear-"+category);sel.replaceChildren();
  const base=actorBase(actor),human=base==="human_male_base"||base==="human_female_base";
  sel.append(option("inherit","INHERIT CHARACTER OUTFIT"),option("none","NONE / REMOVE"));
  if(human&&category==="shirt")sel.append(option("builtin_shirt","BASIC T-SHIRT / COLOR"));
  if(human&&category==="pants")sel.append(option("builtin_pants","BASIC PANTS / COLOR"));
  for(const item of equipmentItemsFor(actor,category))
   sel.append(option(item.id,item.name||item.id));
  if(!Array.from(sel.options).some(o=>o.value===draft.equipment[category]))
   draft.equipment[category]="inherit";
  sel.value=draft.equipment[category];
 }
 $("act-color-shirt").value=draft.colors?.shirt||"#5072b4";
 $("act-color-pants").value=draft.colors?.pants||"#424956";
 if(draft.changed)outfitNote("PENDING CHANGES — CLICK APPLY TO UPDATE PREVIEW","pending");
 else outfitNote("CURRENT OUTFIT APPLIED · SELECT REMOVE / WEAR AND CLICK APPLY");
}
function faceAssetFor(p,actor,id){
 const native=(actor?.expressions||[]).find(f=>f.id===id);
 if(native)return {id,data:null,portrait:native.portrait||native.sheet,label:native.label||id};
 const local=faceAssets.find(f=>f.id===id&&f.actorBase===actorBase(actor));
 if(local)return {id,data:local.data,portrait:local.data,label:local.name};
 if(p?.faceAssetId===id&&p.faceAssetData)
  return {id,data:p.faceAssetData,portrait:p.faceAssetData,label:"IMPORTED EMOTION"};
 return null;
}
function updateFaceAssetPreview(){
 const p=selected(),actor=actorFor(p),id=$("act-face-asset").value;
 const asset=faceAssetFor(p,actor,id),img=$("act-face-preview");
 const uri=asset?.portrait?link(asset.portrait):null;
 if(uri)img.src=uri;else img.removeAttribute("src");
 $("act-face-status").textContent=(asset?"EMOTION ASSET: "+asset.label.toUpperCase():
  "SELECT A FACE ASSET")+(p?.autoFace?" · AUTO FACE ACTIVE":" · CLICK APPLY TO ATTACH");
 $("act-face-status").classList.remove("is-applied");
}
function renderFaceAssets(p,actor){
 const picker=$("act-face-asset");picker.replaceChildren();
 for(const f of actor?.expressions||[])
  if(idOK(f.id)&&f.sheet)picker.append(option(f.id,
   "CHARACTER FACE / "+(f.label||f.id).toUpperCase()));
 for(const item of faceAssets.filter(x=>x.actorBase===actorBase(actor)))
  picker.append(option(item.id,"CUSTOM EMOTION / "+item.name.toUpperCase()));
 if(p.faceAssetId&&p.faceAssetData&&!Array.from(picker.options).some(o=>o.value===p.faceAssetId))
  picker.append(option(p.faceAssetId,"IMPORTED EMOTION / SAVED WITH ACT"));
 const active=p.faceAssetId||p.expressionId||"neutral";
 picker.value=Array.from(picker.options).some(o=>o.value===active)?active:
  (picker.options[0]?.value||"");
 $("act-face-offset-x").value=p.faceOffsetX||0;
 $("act-face-offset-y").value=p.faceOffsetY||0;
 updateFaceAssetPreview();
}
function applyFaceAsset(){
 const p=selected(),actor=actorFor(p);if(!actor)return;
 const id=$("act-face-asset").value,asset=faceAssetFor(p,actor,id);
 if(!asset){status("CHOOSE A VALID EMOTION ASSET");return;}
 p.faceAssetId=id;p.faceAssetData=asset.data||null;
 if((actor.expressions||[]).some(f=>f.id===id))p.expressionId=id;
 p.autoFace=false;
 p.faceOffsetX=Math.round(clamp($("act-face-offset-x").value,-32,32));
 p.faceOffsetY=Math.round(clamp($("act-face-offset-y").value,-32,32));
 markDirty();renderInspector();paint();
 $("act-face-status").textContent="✓ APPLIED "+asset.label.toUpperCase()+
  " TO "+(actor.name||actor.id).toUpperCase()+" · PREVIEW UPDATED";
 $("act-face-status").classList.add("is-applied");
 status("✓ FACE ASSET APPLIED · "+asset.label.toUpperCase());
}
async function importFaceAsset(file){
 if(!file)return;
 const p=selected(),actor=actorFor(p);
 if(!actor||file.type!=="image/png"||file.size>1500000){
  status("FACE FILE MUST BE PNG UNDER 1.5 MB");return;
 }
 const uri=URL.createObjectURL(file);
 try{
  const img=await new Promise((resolve,reject)=>{
   const raw=new Image();raw.onload=()=>resolve(raw);
   raw.onerror=()=>reject(Error("Could not read PNG emotion asset"));raw.src=uri;
  });
  const valid=(img.width===32&&img.height===29)||
   (img.width===160&&img.height===145)||
   (img.width===64&&[112,448].includes(img.height));
  if(!valid)throw Error("Use 32×29 face PNG, 160×145 portrait or 64×112/448 face sheet");
  const cv=document.createElement("canvas");cv.width=32;cv.height=29;
  const brush=cv.getContext("2d");brush.imageSmoothingEnabled=false;
  if(img.width===64)brush.drawImage(img,17,30,32,29,0,0,32,29);
  else brush.drawImage(img,0,0,img.width,img.height,0,0,32,29);
  const data=cv.toDataURL("image/png");
  if(data.length>=100000)throw Error("Face asset exceeds local storage limit");
  const id="emotion_"+Date.now().toString(36)+"_"+
   Math.random().toString(36).slice(2,6);
  saveFaceAsset({id,actorBase:actorBase(actor),
   name:file.name.replace(/\.png$/i,"").slice(0,40)||"CUSTOM FACE",data});
  renderFaceAssets(p,actor);
  $("act-face-asset").value=id;updateFaceAssetPreview();
  applyFaceAsset();
 }catch(error){status("FACE IMPORT: "+error.message);}
 finally{URL.revokeObjectURL(uri);}
}
function renderInspector(){
 const p=selected();if(!p)return;
 const actor=actorFor(p),actual=motionFor(actor,p);
 $("act-slot").textContent=String(p.slot).padStart(2,"0");
 $("act-actor").value=p.actorId;
 const msel=$("act-motion");msel.replaceChildren();
 for(const motion of motionsFor(actor))
  msel.append(option(motion.id,
   motion.name||motion.id.toUpperCase()));
 if(!actual&&msel.options.length)p.motionId=msel.options[0].value;
 msel.value=p.motionId;
 if(!msel.options.length)msel.append(option("idle","NO ACTOR-SPECIFIC MOTIONS"));
 const fsel=$("act-expression");fsel.replaceChildren();
 fsel.append(option("neutral","NEUTRAL"));
 for(const f of actor?.expressions||[])if(f.id!=="neutral")
  fsel.append(option(f.id,f.label||f.id.toUpperCase()));
 if(!Array.from(fsel.options).some(o=>o.value===p.expressionId))p.expressionId="neutral";
 fsel.value=p.expressionId;
 $("act-auto-face").checked=p.autoFace;
 renderFaceAssets(p,actor);
 $("act-direction").value=p.direction;
 $("act-x").value=p.x;$("act-y").value=p.y;
 $("act-layer").value=p.layer;$("act-object-layer").value=p.objectLayer;
 renderGear(p,actor);
 const custom=actor?.custom_character?" · CUSTOM CHAR":"";
 $("act-outfit-note").textContent=(actor?.name||"UNLOADED")+custom+
  " · SHIRT/PANTS BUILT-IN FOLLOW THE SAME MOTION ATLAS. "+
  "SAVED ACCESSORY ART IS 4-VIEW AND MAY NEED POSE-SPECIFIC PIXEL ADJUSTMENT.";
}
function choose(slotId){
 if(!scene.participants.some(p=>p.slot===slotId))return;
 slot=slotId;pendingOutfit=null;renderParticipants();renderInspector();paint();
}
function addActor(){
 if(scene.participants.length>=8){status("MAX 8 PARTICIPANTS PER ACT");return;}
 const id=$("act-add-character").value,actor=entries.get(id);
 if(!actor)return;
 const taken=new Set(scene.participants.map(p=>p.slot));
 const ordinal=Array.from({length:8},(_,i)=>i+1).find(x=>!taken.has(x));
 const p=defaultParticipant(id,ordinal-1);p.slot=ordinal;
 scene.participants.push(p);
 markDirty();choose(ordinal);status("ADDED "+actor.name);
}
function mutateParticipant(fn){
 const p=selected();if(!p)return;
 fn(p);markDirty();renderParticipants();renderInspector();paint();
}
function updateSceneForm(){
 scene.name=$("act-name").value.trim().slice(0,64)||"UNTITLED ACT";
 scene.trigger=$("act-trigger").value;scene.fixture=$("act-fixture").value;
 scene.durationMs=clamp($("act-duration").value,600,12000);
 scene.loop=$("act-loop").checked;
 timeMs=clamp(timeMs,0,scene.durationMs);
 $("act-scrub").max=String(scene.durationMs);markDirty();paint();
}
function addImage(ctx,src,sx,sy,dx,dy){
 const img=picture(src);if(!img||sx+64>img.naturalWidth||sy+112>img.naturalHeight)return false;
 ctx.drawImage(img,sx,sy,64,112,dx,dy,64,112);return true;
}
function frameAt(m,position){
 const timings=Array.isArray(m?.frame_ms)&&m.frame_ms.length===m.frames?
   m.frame_ms.map(v=>clamp(v,50,1500)):[210];
 const length=timings.reduce((s,v)=>s+v,0);
 const bounded=m?.loop===false?Math.min(position,Math.max(0,length-1)):
  (length?position%length:0);
 let n=bounded;for(let i=0;i<timings.length;i++){
  if(n<timings[i])return i%(m.frames||1);n-=timings[i];
 }
 return 0;
}
function frameSource(actor,m,frame,dir){
 if(!m)return null;
 const sheet=m.sheet||actor.sheet;
 return {src:sheet,sx:frame*64,sy:((m.sheet?m.row||0:m.row??4)+DIR.indexOf(dir))*112};
}
function bufferFor(slotId){
 if(!buffers.has(slotId)){
  const c=document.createElement("canvas");c.width=64;c.height=112;
  buffers.set(slotId,c);
 }
 return buffers.get(slotId);
}
function tinted(maskSrc,frame,dir,color){
 const uri=link(maskSrc),key=uri+"|"+frame+"|"+dir+"|"+color;
 if(tintCache.has(key))return tintCache.get(key);
 const img=picture(maskSrc);if(!img)return null;
 const sy=DIR.indexOf(dir)*112,sx=frame*64;
 if(sy+112>img.height||sx+64>img.width)return null;
 const cv=document.createElement("canvas");cv.width=64;cv.height=112;
 const brush=cv.getContext("2d",{willReadFrequently:true});
 brush.drawImage(img,sx,sy,64,112,0,0,64,112);
 const data=brush.getImageData(0,0,64,112),buf=data.data;
 const rgb=[1,3,5].map(k=>parseInt(color.slice(k,k+2),16)||0);
 for(let i=0;i<buf.length;i+=4){
  if(buf[i+3]<10)continue;
  const value=(buf[i]*.25+buf[i+1]*.54+buf[i+2]*.21);
  const modulation=.68+value/550;
  for(let ch=0;ch<3;ch++)buf[i+ch]=Math.min(255,Math.round(rgb[ch]*modulation));
 }
 brush.putImageData(data,0,0);
 if(tintCache.size>500)tintCache.clear();
 tintCache.set(key,cv);
 return cv;
}
function accessoryFor(p,actor,category){
 const selected=p.equipment[category],id=selected==="inherit"?
  equipment[p.actorId]?.[category]:selected;
 return items.find(item=>item.id===id&&item.category===category&&
  (item.template_base||"astrofrich_base")===actorBase(actor))||null;
}
function drawAccessory(target,p,actor,category,dir){
 const acc=accessoryFor(p,actor,category),path=acc?.frames?.[dir];
 const img=picture(path);
 if(img&&img.width===64&&img.height===112)target.drawImage(img,0,0);
}
function drawFacePatch(target,actor,p,m,frame){
 // AUTO uses the authentic facial track already authored in every action
 // atlas. MANUAL overlays a swappable same-actor modular face asset.
 if(p.autoFace||["ne","nw"].includes(p.direction))return;
 const faceId=p.faceAssetId||p.expressionId||"neutral";
 const face=(actor.expressions||[]).find(f=>f.id===faceId);
 const imported=faceAssetFor(p,actor,faceId);
 const data=imported?.data;
 if(!face&&!data)return;
 const dirIndex=DIR.indexOf(p.direction);
 const sheet=face?.motion_sheets?.[m.id]||face?.sheet;
 const source=picture(data||sheet);
 if(!source)return;
 let cropX=0,cropY=0,cropW=32,cropH=29;
 if(!data){
  // Native expressions are full-body atlases, NOT facial overlays.
  // Crop just that actor's original face. Walk and Idle prefer matching
  // frame-by-frame expression atlases, never swap someone else's body.
  cropX=(frame%Math.max(1,face.frames||4))*64+17;
  cropY=dirIndex*112+30;
  if(cropX+cropW>source.width||cropY+cropH>source.height)return;
 }else if(source.width!==32||source.height!==29){
  return; // Imported custom emotion PNGs are canonical 32x29 face parts.
 }
 let dx=17+(p.faceOffsetX||0),dy=30+(p.faceOffsetY||0);
 if(p.motionId==="squat_idle"){dy+=17;}
 else if(p.motionId==="bent_over_idle"){
  dy+=25;dx+=(p.direction==="se"?10:-10);
 }else if(p.motionId==="sit"||p.motionId==="sit_type"){dy+=4;}
 else if(p.motionId==="sleep_seat"){dy+=3;}
 else if(p.motionId==="nap_stand"){dy+=2;}
 const reclined=["lie","lie_idle","bathtub_bathe"].includes(p.motionId);
 target.save();
 target.imageSmoothingEnabled=false;
 if(reclined){
  // Portrait follows the sideways head on native horizontal actions.
  const cx=20+(p.faceOffsetX||0),cy=66+(p.faceOffsetY||0);
  target.translate(cx,cy);
  target.rotate((p.direction==="se"?-1:1)*Math.PI/2);
  target.drawImage(source,cropX,cropY,cropW,cropH,
   -cropW/2,-cropH/2,cropW,cropH);
 }else{
  target.drawImage(source,cropX,cropY,cropW,cropH,dx,dy,cropW,cropH);
 }
 target.restore();
}
function actorImage(actor,p,m,frame){
 if(!m)return null;
 const canvas=bufferFor(p.slot),brush=canvas.getContext("2d");
 brush.imageSmoothingEnabled=false;brush.clearRect(0,0,64,112);
 const base=m.sheet||actor.sheet;
 const from=frameSource(actor,m,frame,p.direction);
 // Back pack is behind the entire actor, including the head.
 drawAccessory(brush,p,actor,"bag",p.direction);
 if(!addImage(brush,base,from.sx,from.sy,0,0))return null;
 const human=["human_male_base","human_female_base"].includes(actorBase(actor));
 if(human){
  for(const kind of ["shirt","pants"]){
   if(p.equipment[kind]==="builtin_"+kind){
    const maskSrc=m.outfit_masks?.[kind];
    const mask=maskSrc?tinted(maskSrc,frame,p.direction,p.colors[kind]):null;
    if(mask)brush.drawImage(mask,0,0);
   }
  }
 }
 for(const category of ["pants","shirt","shoes"])
  if(p.equipment[category]!=="none"&&
     !["builtin_shirt","builtin_pants"].includes(p.equipment[category]))
   drawAccessory(brush,p,actor,category,p.direction);
 drawFacePatch(brush,actor,p,m,frame);
 for(const category of ["hair","helmet"])
  if(p.equipment[category]!=="none")
   drawAccessory(brush,p,actor,category,p.direction);
 return canvas;
}
function drawGround(){
 ctx.fillStyle="#f8f6f0";ctx.fillRect(0,0,AREA.w,AREA.h);
 ctx.save();ctx.lineWidth=1;ctx.strokeStyle="#aac0d380";
 const ox=AREA.cx,oy=AREA.cy;
 for(let n=-14;n<=14;n++){
  ctx.beginPath();ctx.moveTo(ox-600+n*38,oy-300);
  ctx.lineTo(ox+600+n*38,oy+300);ctx.stroke();
  ctx.beginPath();ctx.moveTo(ox-600+n*38,oy+300);
  ctx.lineTo(ox+600+n*38,oy-300);ctx.stroke();
 }
 ctx.restore();
 ctx.strokeStyle="#789cbe";ctx.lineWidth=1;ctx.beginPath();
 ctx.moveTo(AREA.cx-12,AREA.cy);ctx.lineTo(AREA.cx+12,AREA.cy);
 ctx.moveTo(AREA.cx,AREA.cy-12);ctx.lineTo(AREA.cx,AREA.cy+12);
 ctx.stroke();
}
function drawActor(p){
 const actor=actorFor(p),m=motionFor(actor,p);
 const frame=frameAt(m,timeMs);
 const x=AREA.cx+p.x,y=AREA.cy+p.y,s=SPRITE.scale;
 ctx.save();ctx.fillStyle="#18385c34";ctx.beginPath();
 ctx.ellipse(x,y+5,26*s,6*s,0,0,Math.PI*2);ctx.fill();
 const image=actor&&actorImage(actor,p,m,frame);
 if(image)ctx.drawImage(image,x-SPRITE.pivotX*s,y-SPRITE.pivotY*s,64*s,112*s);
 else{ctx.fillStyle="#a2b3c2";ctx.fillRect(x-25,y-75,50,75);
  ctx.fillStyle="#153c70";ctx.font="bold 11px monospace";ctx.fillText("NO RIG",x-23,y-30);}
 if(p.slot===slot){
  ctx.strokeStyle="#0b469f";ctx.lineWidth=2;ctx.setLineDash([5,4]);
  ctx.strokeRect(x-36*s,y-101*s,72*s,114*s);ctx.setLineDash([]);
  ctx.beginPath();ctx.arc(x,y,5,0,2*Math.PI);ctx.stroke();
 }
 const name=(actor?.name||p.actorId).slice(0,22);
 ctx.textAlign="center";ctx.font="bold 12px 'Courier New',monospace";
 const size=Math.max(70,ctx.measureText(name).width+18);
 ctx.fillStyle=p.slot===slot?"#0c45a0":"#32465e";
 ctx.fillRect(x-size/2,y+12,size,21);
 ctx.fillStyle="#fff";ctx.fillText(name,x,y+26);
 ctx.restore();
}
function paint(){
 if(!scene)return;
 ctx.clearRect(0,0,AREA.w,AREA.h);drawGround();
 const order=[...scene.participants].sort((a,b)=>
  a.layer-b.layer||a.y-b.y||a.slot-b.slot);
 for(const p of order)drawActor(p);
 $("act-time").textContent=(timeMs/1000).toFixed(1)+" / "+(scene.durationMs/1000).toFixed(1)+"s";
 $("act-scrub").value=String(Math.min(scene.durationMs,Math.round(timeMs)));
 const selectedActor=selected(),actor=actorFor(selectedActor),m=motionFor(actor,selectedActor);
 const auto=selectedActor?.autoFace,sequence=FACE?.track(facesDB,m);
 const actual=auto&&sequence?FACE.at(facesDB,m,frameAt(m,timeMs)):
  selectedActor?.faceAssetId||selectedActor?.expressionId;
 $("act-render-note").textContent="CHAR "+scene.participants.length+" · "+
  (m?m.id.toUpperCase():"UNRIGGED")+
  " · FACE "+String(actual||"NEUTRAL").toUpperCase()+
  " · DRAG / LAYER "+(selectedActor?.layer??0);
}
function syncPlay(){
 $("act-play").textContent=play?"Ⅱ PAUSE":"▶ PLAY";
 $("act-play").setAttribute("aria-pressed",String(play));
}
function tick(now){
 if(!lastTime)lastTime=now;
 if(play&&scene){
  const elapsed=Math.min(100,now-lastTime);
  timeMs+=elapsed;
  if(timeMs>scene.durationMs){
   if(scene.loop)timeMs%=scene.durationMs;
   else{timeMs=scene.durationMs;play=false;syncPlay();}
  }
  paint();
 }
 lastTime=now;requestAnimationFrame(tick);
}
function coords(event){
 const rect=$stage.getBoundingClientRect();
 const scale=Math.min(rect.width/AREA.w,rect.height/AREA.h)||1;
 const left=(rect.width-AREA.w*scale)/2,top=(rect.height-AREA.h*scale)/2;
 return {x:(event.clientX-rect.left-left)/scale,
  y:(event.clientY-rect.top-top)/scale};
}
function pickActor(x,y){
 const order=[...scene.participants].sort((a,b)=>
  b.layer-a.layer||b.y-a.y||b.slot-a.slot);
 return order.find(p=>{
  const px=AREA.cx+p.x,py=AREA.cy+p.y;
  return x>=px-64&&x<=px+64&&y>=py-205&&y<=py+30;
 })||null;
}
function setupPointer(){
 $stage.addEventListener("pointerdown",event=>{
  if(!scene)return;
  const loc=coords(event),picked=pickActor(loc.x,loc.y);
  if(!picked)return;
  choose(picked.slot);
  drag={id:event.pointerId,slot:picked.slot,
   x:loc.x-picked.x,y:loc.y-picked.y};
  $stage.setPointerCapture(event.pointerId);
  event.preventDefault();
 });
 $stage.addEventListener("pointermove",event=>{
  if(!drag||drag.id!==event.pointerId)return;
  const loc=coords(event),p=selected();if(!p)return;
  p.x=Math.round(clamp(loc.x-drag.x,-390,390));
  p.y=Math.round(clamp(loc.y-drag.y,-230,190));
  $("act-x").value=p.x;$("act-y").value=p.y;
  markDirty();paint();
 });
 const stop=event=>{if(drag?.id===event.pointerId)drag=null;};
 $stage.addEventListener("pointerup",stop);
 $stage.addEventListener("pointercancel",stop);
 $stage.addEventListener("keydown",event=>{
  if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))return;
  event.preventDefault();const p=selected();if(!p)return;
  const step=event.shiftKey?10:1;
  if(event.key==="ArrowLeft")p.x=Math.max(-390,p.x-step);
  if(event.key==="ArrowRight")p.x=Math.min(390,p.x+step);
  if(event.key==="ArrowUp")p.y=Math.max(-230,p.y-step);
  if(event.key==="ArrowDown")p.y=Math.min(190,p.y+step);
  $("act-x").value=p.x;$("act-y").value=p.y;markDirty();paint();
 });
}
function save(){
 if(!scene)return;
 updateSceneForm();
 try{
  scene=A.save(scene);dirty=false;renderSceneForm();renderPresets();
  status("✓ ACT SAVED · "+scene.participants.length+" CHAR · READY FOR PLACEMENT BINDING");
 }catch(error){status("SAVE FAILED: "+error.message);}
}
function removePreset(){
 if(!scene?.id){setScene(emptyScene());return;}
 if(!confirm("Delete ACT preset "+scene.name+"?"))return;
 A.remove(scene.id);setScene(emptyScene());renderPresets();status("ACT PRESET DELETED");
}
function duplicate(){
 if(!scene)return;
 const cloned=JSON.parse(JSON.stringify(scene));cloned.id="";cloned.name=
  (scene.name+" COPY").slice(0,64);
 setScene(cloned,true);status("DUPLICATED INTO UNSAVED ACT");
}
function exportScene(){
 if(!scene)return;
 const output=JSON.stringify({type:"virtual-life-multi-actor-act",version:1,
  scene:A.clean(scene),notice:"Character and outfit PNGs remain sourced from the linked Mahluk Hidup catalog / browser local equipment. Same-origin storage is not cross-device cloud sync."},null,2);
 const blob=new Blob([output],{type:"application/json"}),uri=URL.createObjectURL(blob);
 const link=document.createElement("a");link.href=uri;
 link.download=filename(scene.name)+".act.json";document.body.append(link);link.click();
 link.remove();setTimeout(()=>URL.revokeObjectURL(uri),3000);
 status("ACT EXPORTED AS JSON");
}
async function importFile(file){
 if(!file)return;
 try{
  if(file.size>200000)throw Error("ACT JSON is too large");
  const parsed=A.decode(await file.text());parsed.id="";
  const missing=parsed.participants.filter(p=>!entries.has(p.actorId));
  if(missing.length)throw Error("Unknown actors: "+missing.map(p=>p.actorId).join(", "));
  setScene(parsed,true);save();
  status("✓ IMPORTED ACT WITH "+parsed.participants.length+" CHARACTERS");
 }catch(error){status("IMPORT FAILED: "+error.message);}
}
function setupEvents(){
 $("act-new").onclick=()=>{setScene(emptyScene());status("NEW UNSAVED ACT");};
 $("act-save").onclick=save;
 $("act-duplicate").onclick=duplicate;
 $("act-delete").onclick=removePreset;
 $("act-export").onclick=exportScene;
 $("act-import-button").onclick=()=>$("act-import").click();
 $("act-import").onchange=event=>{importFile(event.target.files?.[0]);event.target.value="";};
 $("act-add-button").onclick=addActor;
 for(const id of ["act-name","act-trigger","act-fixture","act-duration","act-loop"])
  $(id).addEventListener("change",updateSceneForm);
 $("act-actor").onchange=event=>mutateParticipant(p=>{
  pendingOutfit=null;
  p.actorId=event.target.value;p.motionId=firstMotion(actorFor(p))?.id||"idle";
  p.expressionId="neutral";p.faceAssetId="neutral";p.faceAssetData=null;
  const human=["human_male_base","human_female_base"].includes(actorBase(actorFor(p)));
  p.equipment=Object.fromEntries(SLOTS.map(k=>[k,human&&k==="shirt"?"builtin_shirt":
   human&&k==="pants"?"builtin_pants":"inherit"]));
 });
 $("act-motion").onchange=event=>mutateParticipant(p=>{p.motionId=event.target.value;});
 $("act-expression").onchange=event=>mutateParticipant(p=>{
  p.expressionId=event.target.value;
  p.faceAssetId=event.target.value;p.faceAssetData=null;p.autoFace=false;
 });
 $("act-face-asset").onchange=updateFaceAssetPreview;
 $("act-apply-face").onclick=applyFaceAsset;
 $("act-face-upload-button").onclick=()=>$("act-face-upload").click();
 $("act-face-upload").onchange=event=>{
  importFaceAsset(event.target.files?.[0]);event.target.value="";
 };
 for(const key of ["x","y"])$("act-face-offset-"+key).onchange=event=>
  mutateParticipant(p=>{p["faceOffset"+key.toUpperCase()]=
   Math.round(clamp(event.target.value,-32,32));});
 $("act-auto-face").onchange=event=>mutateParticipant(p=>{p.autoFace=event.target.checked;});
 $("act-direction").onchange=event=>mutateParticipant(p=>{p.direction=event.target.value;});
 for(const [id,key,min,max] of [
  ["act-x","x",-390,390],["act-y","y",-230,190],["act-layer","layer",-20,20]
 ])$(id).onchange=event=>mutateParticipant(p=>{
  p[key]=Math.round(clamp(event.target.value,min,max));
 });
 $("act-object-layer").onchange=event=>mutateParticipant(p=>{p.objectLayer=event.target.value;});
 $("act-send-back").onclick=()=>mutateParticipant(p=>{
  const minimum=Math.min(...scene.participants.filter(a=>a!==p).map(a=>a.layer),p.layer);
  p.layer=Math.max(-20,minimum-1);
 });
 $("act-bring-front").onclick=()=>mutateParticipant(p=>{
  const maximum=Math.max(...scene.participants.filter(a=>a!==p).map(a=>a.layer),p.layer);
  p.layer=Math.min(20,maximum+1);
 });
 $("act-remove-actor").onclick=()=>{
  if(scene.participants.length<=1){status("ACT MUST KEEP AT LEAST ONE CHARACTER");return;}
  scene.participants=scene.participants.filter(p=>p.slot!==slot);
  slot=scene.participants[0].slot;markDirty();renderParticipants();renderInspector();paint();
 };
 for(const slotName of SLOTS)$("act-gear-"+slotName).onchange=event=>{
  const p=selected();if(!p)return;
  const draft=outfitDraft(p);draft.equipment[slotName]=event.target.value;
  draft.changed=true;
  outfitNote("PENDING "+slotName.toUpperCase()+" · CLICK APPLY TO UPDATE PREVIEW","pending");
 };
 for(const cat of ["shirt","pants"])$("act-color-"+cat).oninput=event=>{
  const p=selected();if(!p)return;
  const draft=outfitDraft(p);draft.colors[cat]=event.target.value;
  draft.changed=true;
  outfitNote("PENDING "+cat.toUpperCase()+" COLOR · CLICK APPLY TO UPDATE PREVIEW","pending");
 };
 $("act-apply-outfit").onclick=applyOutfit;
 $("act-edit-outfit").onclick=()=>{
  const p=selected(),actor=actorFor(p),base=actorBase(actor);
  if(!actor||!["human_male_base","human_female_base","astrofrich_base"].includes(base)){
   status("SELECT A MODULAR CHARACTER BASE TO EDIT OUTFIT");return;
  }
  const kind=p.equipment.shirt==="none"?"pants":"shirt";
  const url=new URL("./accessory-editor.html",location.href);
  url.searchParams.set("actor",actor.id);url.searchParams.set("base",base);
  url.searchParams.set("category",kind);
  window.open(url.href,"_blank","noopener");
  status("PIXEL OUTFIT EDITOR OPEN · RETURN HERE AFTER SAVING");
 };
 $("act-play").onclick=()=>{play=!play;lastTime=0;syncPlay();};
 $("act-rewind").onclick=()=>{timeMs=0;lastTime=0;paint();};
 $("act-scrub").oninput=event=>{
  timeMs=clamp(event.target.value,0,scene.durationMs);
  play=false;syncPlay();paint();
 };
 window.addEventListener("storage",event=>{
  if([ITEM_KEY,EQUIP_KEY,CUSTOM_KEY,FACE_LIBRARY_KEY].includes(event.key)){
   refreshLocal();if(event.key===CUSTOM_KEY)hydrateCustom();
   populateActors();renderInspector();paint();
  }
  if([A.KEY,A.BIND_KEY].includes(event.key))renderPresets();
 });
 window.addEventListener("message",event=>{
  if(event.origin!==location.origin||event.data?.type!=="mahluk-action-context")return;
  const context=event.data.context||{};
  // A scene deep link owns its saved cast, including actor #1. This optional
  // parent context is for opening a NEW ACT from a selected character only.
  if(context.scene&&scene?.id===context.scene)return;
  const actor=entries.get(context.actor);
  if(actor&&scene?.participants.length){
   scene.participants[0].actorId=actor.id;
   scene.participants[0].motionId=motionsFor(actor).find(m=>m.id===context.action)?.id||
    firstMotion(actor)?.id||"idle";
   markDirty();renderParticipants();renderInspector();paint();
  }
 });
 setupPointer();
}
async function init(){
 try{
  if(!A)throw Error("ACT BRIDGE NOT LOADED");
  const [cat,expr]=await Promise.all([
   fetch("./catalog.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("CATALOG "+r.status);return r.json();}),
   fetch("./expression-contexts.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("FACE DB "+r.status);return r.json();})
  ]);
  if(!Array.isArray(cat.characters))throw Error("INVALID CHARACTER CATALOG");
  build=String(cat.build_version||"").slice(0,24);
  for(const c of cat.characters)if(idOK(c.id)&&SAFE_MEDIA.test(c.sheet||""))entries.set(c.id,c);
  hydrateCustom();refreshLocal();facesDB=FACE?.validate(expr)?expr:null;
  populateActors();
  ready=true;setupEvents();
  const params=new URLSearchParams(location.search);
  const preset=params.get("scene");
  const saved=preset?A.get(preset):null;
  const draft=saved||emptyScene();
  if(!draft)throw Error("NO PUBLISHED CHARACTERS");
  const actor=params.get("actor"),motion=params.get("action");
  if(!saved&&entries.has(actor)){
   draft.participants[0].actorId=actor;
   if(motionsFor(entries.get(actor)).some(m=>m.id===motion))draft.participants[0].motionId=motion;
  }
  setScene(draft,false);status("READY · ADD CHARACTERS, EDIT OUTFITS AND SAVE ACT");
  requestAnimationFrame(tick);
 }catch(error){status("ACTION EDITOR LOAD FAILED: "+error.message);}
}
init();
})();