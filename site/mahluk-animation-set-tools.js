/* Additive Animation Studio lanes. Character and Emosi.exe databases are read-only here.
   Motion cues, emotion snapshots and front/back source clips belong only to the animation. */
(function(root){"use strict";
const DIRS=["se","sw","ne","nw"],$=id=>document.getElementById(id);
function loadImage(src){
 return new Promise((resolve,reject)=>{
  if(typeof src!=="string"||!src.startsWith("data:image/png;base64,"))
   return reject(Error("Source must be a saved PNG from Mahluk or Emosi.exe"));
  const img=new Image();img.onload=()=>resolve(img);
  img.onerror=()=>reject(Error("Cannot decode source PNG"));img.src=src;
 });
}
function init(api){
 const {state,V,Store,db,render,stop,say,loadSource}=api;
 const Character=root.V6PCharacterStore;
 let cues=[],assets={},images=new Map(),viewSources={},viewImages={};
 let catalog=new Map(),cloudCharacters=[],characters=new Map();
 let revision=0;
 const clone=v=>JSON.parse(JSON.stringify(v));
 function ownsCue(id){return cues.some(c=>c.id===id)}
 function validEmotion(e){
  return !!e&&typeof e.id==="string"&&e.id.length<100&&
   typeof e.png==="string"&&e.png.startsWith("data:image/png;base64,")&&
   Number.isInteger(Number(e.frames))&&Number(e.frames)>0&&Number(e.frames)<=48;
 }
 function normalizeEmotion(e){
  return {id:String(e.id).replace(/^emosi_/,""),name:String(e.name||e.label||e.id).slice(0,90),
   base:e.base||"universal",frames:Number(e.frames),png:e.png||e.overlay};
 }
 function compatible(e){return e.base==="universal"||e.base===state.gender}
 function options(select,rows,placeholder){
  const previous=select.value;select.replaceChildren();
  const blank=document.createElement("option");blank.value="";blank.textContent=placeholder;select.append(blank);
  rows.forEach(row=>{const option=document.createElement("option");option.value=row.id;option.textContent=row.name;select.append(option)});
  if([...select.options].some(o=>o.value===previous))select.value=previous;
 }
 function motionOptions(){
  options($("set-animation-source"),Store.list()
   .filter(row=>db()[row.id]&&row.id!==state.id)
   .map(row=>({id:row.id,name:row.name+" · "+row.manifest.frames.length+" frames"})),
   "Choose a saved editable animation");
 }
 function emotionOptions(){
  const rows=[...catalog.values(),...Object.values(assets)].filter(validEmotion)
   .filter(compatible).filter((item,index,list)=>list.findIndex(other=>other.id===item.id)===index)
   .sort((a,b)=>a.name.localeCompare(b.name));
  options($("set-emotion-source"),rows.map(e=>({id:e.id,name:e.name+" · "+e.frames+" frames"})),
   "Choose an EMOSI.EXE expression");
  $("set-emotion-note").textContent=rows.length?
   rows.length+" authored Emosi.exe expressions · front views only":
   "No authored Emosi.exe expression loaded. Refresh after cloud sync.";
 }
 function characterOptions(){
  characters=new Map();
  for(const row of Character?.list?.()||[])characters.set(row.id,{kind:"local",row});
  for(const raw of cloudCharacters){
   const row=raw?.record||raw;
   if(row?.id&&row?.clips)characters.set(row.id,{kind:"cloud",row});
  }
  options($("set-character-source"),[...characters].map(([id,{row}])=>({
   id,name:(row.name||id)+" · "+(row.gender||row.base||row.v6p?.body||"character")
  })),"Choose a saved character");
 }
 async function refreshCharacters(){
  characterOptions();
  const bridge=root.parent!==root&&root.parent?.VLMahlukWorkspace;
  if(!bridge?.isOnline?.())return;
  try{cloudCharacters=await bridge.listOnline("character");characterOptions()}
  catch(e){$("set-view-note").textContent="Character cloud list: "+e.message}
 }
 function storeEmotion(e){
  const item=normalizeEmotion(e);
  if(!validEmotion(item))return;
  catalog.set(item.id,item);
 }
 async function ensureEmotion(id){
  const item=assets[id]||catalog.get(id);
  if(!item)throw Error("Emosi "+id+" missing. Refresh the Emosi.exe database.");
  if(!images.has(id)){
   const image=await loadImage(item.png);
   if(image.naturalWidth!==item.frames*64||image.naturalHeight!==448)
    throw Error("Emosi atlas "+item.name+" is not "+(item.frames*64)+" × 448.");
   images.set(id,image);
  }
  return images.get(id);
 }
 async function refreshEmotions(){
  const published=root.VLEmosiSource?.emotions||[];
  for(const e of published)storeEmotion(e);
  emotionOptions();
  const bridge=root.VLMahlukEmosiBridge;
  if(!bridge)return;
  try{
   await bridge.refresh();
   const actor={id:state.gender==="female"?"human_female_base":"human_male_base",
    gender:state.gender,template_category:"human",expressions:[]};
   bridge.apply(actor);
   for(const face of actor.expressions||[]){
    if(face.source==="emosi"&&face.overlay)storeEmotion({
     id:face.id,name:face.label,base:face.base,frames:face.frames,png:face.overlay
    });
   }
   emotionOptions();
  }catch(e){$("set-emotion-note").textContent+=" · "+e.message}
 }
 function cueAt(index){
  return [...cues].reverse().find(c=>index>=c.start&&index<c.start+c.length);
 }
 function drawEmotion(ctx,dir,index,head){
  if(dir==="ne"||dir==="nw")return;
  const cue=cueAt(index),image=cue&&images.get(cue.id);
  const info=cue&&(assets[cue.id]||catalog.get(cue.id));
  if(!image||!info||!head)return;
  const f=(index-cue.start)%info.frames,di=DIRS.indexOf(dir);
  ctx.save();ctx.translate(head.ax+head.x,head.ay+head.y);
  ctx.rotate(head.angle*Math.PI/180);
  ctx.drawImage(image,f*64,di*112,64,112,-head.ax,-head.ay,64,112);
  ctx.restore();
 }
 function sourceCell(dir,index){
  const side=DIRS.indexOf(dir)<2?"front":"back";
  const image=viewImages[side],source=viewSources[side];
  if(!image||!source)return null;
  const out=document.createElement("canvas");out.width=64;out.height=112;
  const ctx=out.getContext("2d");ctx.imageSmoothingEnabled=false;
  const f=index%source.frames,di=DIRS.indexOf(dir);
  ctx.drawImage(image,f*64,di*112,64,112,0,0,64,112);
  return out;
 }
 async function loadSide(side){
  const item=viewSources[side];
  delete viewImages[side];if(!item)return;
  const image=await loadImage(item.png);
  if(image.naturalHeight!==448||image.naturalWidth!==item.frames*64)
   throw Error("Source "+side+" clip has invalid dimensions");
  viewImages[side]=image;
  state.images.clear();render();
 }
 function viewNote(){
  $("set-view-note").textContent="FRONT: "+(viewSources.front?.name||"BASE")+
   " · BACK: "+(viewSources.back?.name||"BASE")+
   ". Source pixels are copied into this animation; characters remain unchanged.";
 }
 async function setSide(side){
  const selected=characters.get($("set-character-source").value);
  if(!selected)throw Error("Choose another saved character first");
  const {row,kind}=selected;
  let png="",frames=0;
  if(kind==="local"){
   const actual=Character.get(row.id);
   if(!actual)throw Error("Character draft unavailable");
   const appearance=V.norm({...actual.appearance,body:actual.gender,gender:actual.gender,
    characterId:actual.id,face:"blank"});
   const sheet=await V.sheet(appearance,null,"");
   if(!sheet)throw Error("Cannot render selected character");
   const clip=V.extractClip(sheet,state.template);
   if(!clip)throw Error("Base pose unavailable for selected character");
   png=clip.canvas.toDataURL("image/png");frames=clip.frames;
  }else{
   const clip=row.clips?.[state.template]||row.clips?.idle;
   if(!clip?.sheet)throw Error("Saved character has no valid animation clip");
   png=clip.sheet;frames=Number(clip.frames)||4;
  }
  const next={id:row.id,name:row.name||row.id,frames,template:state.template,png};
  const image=await loadImage(png);
  if(image.naturalWidth!==frames*64||image.naturalHeight!==448)
   throw Error("Selected character clip is not a 4-direction 64×112 atlas");
  viewSources[side]=next;viewImages[side]=image;state.images.clear();
  viewNote();render();say("SET "+side.toUpperCase()+" · "+next.name+" · source character untouched");
 }
 function clearSide(side){
  delete viewSources[side];delete viewImages[side];state.images.clear();
  viewNote();render();
 }
 function placeEmotion(){
  const id=$("set-emotion-source").value;
  const entry=catalog.get(id)||assets[id];
  if(!entry||!compatible(entry))return say("Choose a compatible Emosi.exe entry",true);
  const start=Math.max(0,Math.min(state.frames.length-1,(Number($("set-emotion-start").value)||1)-1));
  const length=Math.max(1,Math.min(state.frames.length-start,Number($("set-emotion-length").value)||1));
  assets[id]=clone(entry);
  cues.push({id,start,length});
  ensureEmotion(id).then(()=>{paintCues();render()}).catch(e=>say(e.message,true));
  paintCues();say("EMOSI "+entry.name+" placed on F"+(start+1)+"–F"+(start+length));
 }
 function paintCues(){
  const host=$("set-emotion-cues");host.replaceChildren();
  if(!cues.length){host.textContent="No Emosi track placements";return}
  cues.forEach((cue,i)=>{
   const e=assets[cue.id]||catalog.get(cue.id),line=document.createElement("div");
   line.className="lane-item";line.style.background=cueAt(state.frame)===cue?"#d8e8ff":"";
   const text=document.createElement("span");
   text.textContent="F"+(cue.start+1)+"–F"+(cue.start+cue.length)+" · "+(e?.name||cue.id);
   const remove=document.createElement("button");remove.textContent="✕";remove.title="Remove placement";
   remove.onclick=()=>{cues.splice(i,1);paintCues();render()};
   line.append(text,remove);host.append(line);
  });
 }
 function placeAtFrame(){return cues.filter(c=>state.frame>=c.start&&state.frame<c.start+c.length).length}
 function renderUi(){
  $("set-animation-state").textContent="Motion "+state.template.toUpperCase()+" · "+state.frames.length+" frames";
  $("set-emotion-start").max=state.frames.length;
  $("set-emotion-length").max=state.frames.length;
  if(document.activeElement!==$("set-emotion-start"))
   $("set-emotion-start").value=state.frame+1;
  $("set-emotion-count").textContent=cues.length+" placements · "+placeAtFrame()+" on current frame";
  paintCues();viewNote();
 }
 function onInsert(idx,duplicate){
  for(const cue of cues){
   if(cue.start>=idx)cue.start++;
   else if(duplicate&&idx<cue.start+cue.length)cue.length++;
  }
  cues=cues.filter(c=>c.start<state.frames.length);
 }
 function onRemove(idx){
  for(const cue of cues){
   if(idx<cue.start)cue.start--;
   else if(idx<cue.start+cue.length)cue.length--;
  }
  cues=cues.filter(c=>c.length>0&&c.start<state.frames.length);
 }
 function loadMeta(rec){
  const nonce=++revision;
  cues=Array.isArray(rec.emotionCues)?clone(rec.emotionCues).filter(c=>
   c&&typeof c.id==="string"&&Number.isInteger(c.start)&&Number.isInteger(c.length)&&
   c.start>=0&&c.length>0&&c.start<state.frames.length).map(c=>({...c,length:Math.min(c.length,state.frames.length-c.start)})):[];
  assets=rec.emotionAssets&&typeof rec.emotionAssets==="object"?clone(rec.emotionAssets):{};
  images=new Map();viewSources=rec.viewSources&&typeof rec.viewSources==="object"?clone(rec.viewSources):{};
  viewImages={};emotionOptions();viewNote();paintCues();motionOptions();
  Promise.allSettled([
   ...Object.keys(viewSources).filter(side=>side==="front"||side==="back").map(side=>loadSide(side)),
   ...[...new Set(cues.map(c=>c.id))].map(id=>ensureEmotion(id))
  ]).then(results=>{
   if(nonce!==revision)return;
   const missing=results.filter(x=>x.status==="rejected");
   if(missing.length)say("Some saved animation sources could not load: "+missing[0].reason.message,true);
   render();
  });
 }
 function saveMeta(){
  const keep={};for(const cue of cues)if(assets[cue.id]||catalog.has(cue.id))
   keep[cue.id]=clone(assets[cue.id]||catalog.get(cue.id));
  return {emotionCues:clone(cues),emotionAssets:keep,viewSources:clone(viewSources)};
 }
 async function ensureReady(){
  for(const side of ["front","back"])if(viewSources[side]&&!viewImages[side])await loadSide(side);
  for(const id of new Set(cues.map(c=>c.id)))await ensureEmotion(id);
 }
 async function applyMotion(){
  const target=db()[$("set-animation-source").value];
  if(!target||!Array.isArray(target.frames)||!target.tracks)
   throw Error("Choose an editable animation from the database");
  if(target.id===state.id)throw Error("Source and destination are the same animation");
  if(!root.confirm("Use "+target.name+" motion as the base? Current unsaved body poses will be replaced."))return;
  stop();
  state.gender=target.gender;state.template=target.template;
  state.frames=clone(target.frames);state.tracks=clone(target.tracks);
  state.frame=0;state.previewFrame=0;state.dir="se";state.images.clear();
  $("gender").value=state.gender;$("template").value=state.template;$("view").value="se";
  for(const side of ["front","back"])if(viewSources[side]?.template!==state.template){
   delete viewSources[side];delete viewImages[side];
  }
  cues=cues.filter(c=>c.start<state.frames.length).map(c=>({...c,length:Math.min(c.length,state.frames.length-c.start)}));
  await loadSource();render();say("MOTION SET · "+target.name+" · original animation unchanged");
 }
 async function onOpen(){
  motionOptions();characterOptions();
  if(!catalog.size)void refreshEmotions();
  void refreshCharacters();
 }
 $("set-animation-apply").onclick=()=>applyMotion().catch(e=>say(e.message,true));
 $("set-emotion-place").onclick=placeEmotion;
 $("set-emotion-refresh").onclick=()=>refreshEmotions().catch(e=>say(e.message,true));
 $("set-front").onclick=()=>setSide("front").catch(e=>say(e.message,true));
 $("set-back").onclick=()=>setSide("back").catch(e=>say(e.message,true));
 $("clear-front").onclick=()=>clearSide("front");
 $("clear-back").onclick=()=>clearSide("back");
 root.addEventListener("message",event=>{
  if(event.origin===location.origin&&event.data?.type==="mahluk:cloud-connected")
   void Promise.all([refreshEmotions(),refreshCharacters()]);
 });
 void refreshEmotions();characterOptions();
 return {sourceCell,drawEmotion,renderUi,loadMeta,saveMeta,ensureReady,onInsert,onRemove,onOpen,motionOptions,refreshCharacters};
}
root.VLAnimationSetTools=Object.freeze({init});
})(window);
