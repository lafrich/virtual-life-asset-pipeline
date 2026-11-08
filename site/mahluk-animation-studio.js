/* True sprite-frame Animation Studio. Six articulated cutout pixel layers with
   explicit anchor transforms, baked to four-direction PNG frames; no skeletal rig.
   Uses Genesis Male/Female or a selected Character's own body, clothes and
   Custom Wear as the source. Approved stock stays read-only. */
(function(root){"use strict";
const $=id=>document.getElementById(id),V=root.V6PCompositor,Store=root.V6PClipStore,A=root.V6PActivityContract,
 Characters=root.V6PCharacterStore,Genesis=root.V6PGenesisBase,
 Motion=root.V6PUniversalMotion,Contract=root.V6PUniversalMotionContract;
if(!V||!Store||!A||!Motion||!Contract)return;
const KEY="vl-mahluk-animation-anchor-poses-v1",PARTS=["leg_l","leg_r","torso","arm_l","arm_r","head"],DIRS=["se","sw","ne","nw"];
const ANCHORS={head:[32,35],torso:[32,60],arm_l:[20,54],arm_r:[44,54],leg_l:[25,84],leg_r:[39,84]};
const cv=$("stage"),screen=cv.getContext("2d"),state={id:"",name:"",gender:"male",template:"idle",frames:[{key:"f0",ms:140},{key:"f1",ms:140}],loop:true,
 dir:"se",frame:0,part:"head",tracks:{},sheet:null,rig:null,playing:false,timer:0,images:new Map(),drag:null,revision:0,previewFrame:0,screen:"home",
 sourceId:"base:male",sourceLook:null,stockReference:"",stockGuides:new Map()};
screen.imageSmoothingEnabled=false;
const STOCK_TITLES=Object.freeze({pushup:"PUSH-UP",yoga_sphinx_idle:"YOGA SPHINX · IDLE",
 yoga_puppy_idle:"YOGA PUPPY DOG · IDLE",hip_shake:"HIP SHAKE",
 yoga_happy_baby_idle:"YOGA HAPPY BABY · IDLE"});
const nativeStock={clip:null,frame:0,playing:false,timer:0,revision:0,cache:new Map()};
function nativeStop(){
 nativeStock.playing=false;clearTimeout(nativeStock.timer);
 if($("stock-play"))$("stock-play").textContent="▶ PLAY";
}
function characterOptions(){
 const rows=[
  {id:"base:male",name:"GENESIS MALE NUDE",gender:"male"},
  {id:"base:female",name:"GENESIS FEMALE NUDE",gender:"female"}];
 for(const ch of Characters?.list?.()||[]){
  if(!ch?.id||!["male","female"].includes(ch.gender))continue;
  rows.push({id:ch.id,name:"CHARACTER · "+ch.name,gender:ch.gender});
 }
 return rows;
}
function characterSource(id=state.sourceId){
 const row=characterOptions().find(x=>x.id===id)||characterOptions()[0];
 return {...row,record:row.id.startsWith("mh2_")?Characters?.get?.(row.id):null};
}
function selectSource(id){
 const row=characterSource(id);state.sourceId=row.id;state.gender=row.gender;
 for(const control of ["gallery-character","source-character"])
  if($(control))$(control).value=row.id;
 $("gender").value=row.gender;
 if($("stock-gender"))$("stock-gender").value=row.gender;
 if($("source-label"))$("source-label").textContent=row.name+" · CUSTOM WEAR SOURCE · "+state.dir.toUpperCase();
 updatePixelTargets();
 return row;
}
function fillSources(){
 const all=characterOptions();
 for(const id of ["gallery-character","source-character"]){
  const target=$(id);if(!target)continue;
  target.replaceChildren();
  for(const ch of all){const o=document.createElement("option");o.value=ch.id;o.textContent=ch.name;target.append(o);}
 }
 if(!all.some(x=>x.id===state.sourceId))state.sourceId="base:male";
 selectSource(state.sourceId);
}
function nativeAppearance(gender){
 // Approved activity-preview source; never a substitute for a saved Character.
 return V.norm({...V.previewAppearance(gender),body:gender,gender,
   hair:"none",top:"nude",pants:"nude",shoes:"nude",
   face:"blank",glasses:"none",facial:"none"});
}
function nativeFrame(clip,gender,dir,frame){
 const key=[clip.id,gender,dir,frame].join("|");
 if(!nativeStock.cache.has(key)){
  nativeStock.cache.set(key,V.composeActivity(nativeAppearance(gender),clip.manifest,frame,dir).then(img=>{
   if(!img||img._disabled)throw Error(img?._avail?.note||"Native sprite missing");
   return img;
  }).catch(error=>{nativeStock.cache.delete(key);throw error}));
 }
 return nativeStock.cache.get(key);
}
function nativeTimeline(){
 const el=$("stock-timeline");el.replaceChildren();
 if(!nativeStock.clip)return;
 for(let i=0;i<nativeStock.clip.manifest.frames.length;i++){
  const button=document.createElement("button");button.textContent="F"+(i+1);
  button.setAttribute("aria-pressed",String(i===nativeStock.frame));
  button.onclick=()=>{nativeStop();nativeStock.frame=i;void nativeDraw()};
  el.append(button);
 }
}
async function nativeDraw(){
 const clip=nativeStock.clip;
 if(!clip||state.screen!=="stock")return;
 const token=++nativeStock.revision;
 const gender=$("stock-gender").value,dir=$("stock-dir").value,f=nativeStock.frame;
 nativeTimeline();
 $("stock-status").textContent="LOADING · "+gender.toUpperCase()+" · "+dir.toUpperCase()+" · F"+(f+1);
 try{
  const image=await nativeFrame(clip,gender,dir,f);
  if(token!==nativeStock.revision||state.screen!=="stock")return;
  const cv=$("stock-canvas"),ctx=cv.getContext("2d",{willReadFrequently:true});
  ctx.clearRect(0,0,64,112);ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0);
  const pixels=ctx.getImageData(0,0,64,112).data;
  if(!pixels.some((v,i)=>i%4===3&&v>0))throw Error("Empty native stock frame");
  $("stock-status").textContent="READY · "+gender.toUpperCase()+" · "+dir.toUpperCase()+
    " · FRAME "+(f+1)+"/"+clip.manifest.frames.length+" · APPROVED NATIVE STOCK";
 }catch(error){
  if(token!==nativeStock.revision||state.screen!=="stock")return;
  nativeStop();$("stock-status").textContent="UNAVAILABLE · "+error.message;
 }
}
function nativeTick(){
 if(!nativeStock.playing||!nativeStock.clip)return;
 const ms=nativeStock.clip.manifest.frames[nativeStock.frame]?.ms||140;
 nativeStock.timer=setTimeout(()=>{
  if(!nativeStock.playing||state.screen!=="stock")return;
  nativeStock.frame=(nativeStock.frame+1)%nativeStock.clip.manifest.frames.length;
  void nativeDraw();nativeTick();
 },Math.max(40,Math.min(800,ms)));
}
function nativeToggle(){
 if(nativeStock.playing){nativeStop();return}
 if(!nativeStock.clip)return;
 nativeStock.playing=true;$("stock-play").textContent="❚❚ PAUSE";
 void nativeDraw();nativeTick();
}
function nativeOpen(clip){
 nativeStop();nativeStock.clip=clip;nativeStock.frame=0;
 state.id=clip.id;state.name=clip.name;
 $("stock-title").textContent=STOCK_TITLES[clip.manifest.band]||clip.name.toUpperCase();
 $("stock-gender").value=characterSource().gender;
 show("stock");nativeToggle();
}

function say(msg,err=false){$("status").textContent=msg;$("status").style.background=err?"#f8d7d5":"#dce9f8"}
function deep(v){return JSON.parse(JSON.stringify(v))}
const scratch=()=>root.parent?.VLMahlukWorkspace?.draftStorage||localStorage;
function db(){try{const o=JSON.parse(scratch().getItem(KEY)||"{}");return o&&typeof o==="object"&&!Array.isArray(o)?o:{}}catch{return {}}}
function putDb(value){scratch().setItem(KEY,JSON.stringify(value))}
async function refreshCloud(){
 const bridge=root.parent!==root&&root.parent?.VLMahlukWorkspace;
 if(!bridge?.isOnline?.())return;
 try{
  const items=await bridge.listOnline("animation"),meta=db();
  for(const row of items){
   if(!row?.id||!row?.clip||!row?.meta)continue;
   Store.importCloudRecord(row);meta[row.id]=row.meta;
  }
  putDb(meta);listClips();
  $("animation-home-note").textContent="ONLINE DATABASE · "+items.length+" animations loaded";
 }catch(error){$("animation-home-note").textContent="Cloud load failed: "+error.message}
}
function records(){return Object.keys(db()).length}
function freshPose(){const p={};for(const name of PARTS){const [x,y]=ANCHORS[name];p[name]={x:0,y:0,angle:0,ax:x,ay:y}}return p}
function pose(dir=state.dir,index=state.frame){
 if(!state.tracks[dir])state.tracks[dir]=[];
 if(!state.tracks[dir][index])state.tracks[dir][index]=index?deep(state.tracks[dir][index-1]||freshPose()):freshPose();
 return state.tracks[dir][index];
}
function selected(){return pose()[state.part]}
function updateProperty(){
 const p=selected();$("rotation").value=p.angle;$("rotation-label").textContent=p.angle+"°";
 $("px").value=p.x;$("py").value=p.y;$("ax").value=p.ax;$("ay").value=p.ay;
 document.querySelectorAll("[data-part]").forEach(b=>b.classList.toggle("active",b.dataset.part===state.part));
}
function canvas(w,h){const out=document.createElement("canvas");out.width=w;out.height=h;return out}
async function setSource(){
 const chosen=characterSource(),gender=chosen.gender;
 if(chosen.record){
  const record=chosen.record;
  state.sourceLook=V.norm({...record.appearance,body:gender,gender,characterId:record.id,face:"blank"});
  return Motion.prepare(state.sourceLook,action(),{sourceKey:record.id});
 }
 const base=Genesis.get(gender);
 state.sourceLook=V.norm({...base.appearance,body:gender,gender,face:"blank",hair:"none",
  glasses:"none",facial:"none",characterId:""});
 return Motion.prepare(state.sourceLook,action(),{sourceKey:"approved:"+gender,partOverrides:base.parts});
}
async function loadSource(){
 const rev=++state.revision;state.rig=null;Motion.clearCache();
 const rig=await setSource();
 if(rev!==state.revision)return;
 state.rig=rig;state.sheet=null;state.images.clear();
 state.stockGuides.clear();render();
 const clip=state.stockReference&&Store.get(state.stockReference);
 if(clip?.origin==="pilot"&&A.isPlayable(clip.manifest.band)){
  const entries=[];
  for(const dir of DIRS)for(let frame=0;frame<state.frames.length;frame++)
   entries.push({dir,frame,p:nativeFrame(clip,state.gender,dir,frame%clip.manifest.frames.length).catch(()=>null)});
  const images=await Promise.all(entries.map(x=>x.p));
  if(rev!==state.revision)return;
  for(let i=0;i<entries.length;i++)if(images[i])
   state.stockGuides.set(entries[i].dir+"/"+entries[i].frame,images[i]);
 }
 render();
}
function updatePixelTargets(){
 const target=$("pixel-target");if(!target)return;
 const source=characterSource();
 // Re-read the draft after every Character edit to avoid stale appearance.
 const look=source.record?.appearance||Genesis?.get?.(source.gender)?.appearance||{};
 const f=source.gender==="female"?"_f":"";
 const options=[];
 for(const kind of ["top","pants","shoes"])if(look[kind]==="custom")
  options.push([kind+"/custom"+f,kind.toUpperCase()+" / CUSTOM WEAR"]);
 // Body and native sprite sources are read-only in this editor.
 target.replaceChildren();
 for(const [part,name] of options){
  if(!root.V6PPartCatalog?.isPart(part))continue;
  const o=document.createElement("option");o.value=part;o.textContent=name+" · "+part;target.append(o);
 }
 selectPixelTargetByBody();
}
function selectPixelTargetByBody(foot=false){
 const el=$("pixel-target");if(!el||!el.options.length)return;
 const preferred=foot?"shoes/":state.part==="head"?"":
  state.part.startsWith("arm")||state.part==="torso"?"top/":"pants/";
 const match=[...el.options].find(o=>o.value.startsWith(preferred));
 if(match)el.value=match.value;
 updatePartShortcut();
}
function updatePartShortcut(){
 const control=$("part-edit-shortcut");if(!control)return;
 const target=$("pixel-target");
 control.hidden=state.screen!=="editor"||state.part==="head"||!target?.value;
 if($("part-edit-label"))$("part-edit-label").textContent=state.part.toUpperCase().replaceAll("_"," ")+" · "+
  (target?.selectedOptions?.[0]?.textContent||target?.value||"");
}
function action(){return V.ROWS[state.template]!=null?state.template:"idle"}
// One physical-layer renderer handles Genesis, clothing and future motion.
function hitTestPart(x,y){return state.rig?Motion.hitTest(state.rig,state.dir,pose(),x,y):null}
function bake(dir=state.dir,index=state.frame){
 return state.rig?Motion.renderPrepared(state.rig,dir,pose(dir,index),{frameIndex:index}):canvas(64,112);
}
function render(){
 const miniature=bake(),w=384,h=672;screen.clearRect(0,0,w,h);screen.imageSmoothingEnabled=false;
 const guide=state.stockGuides.get(state.dir+"/"+state.frame);
 if(guide){screen.save();screen.globalAlpha=.26;screen.drawImage(guide,0,0,64,112,0,0,w,h);screen.restore();}
 screen.drawImage(miniature,0,0,64,112,0,0,w,h);
 const p=selected();screen.strokeStyle="#fff";screen.fillStyle="#2568dc";screen.lineWidth=1;
 const x=(p.ax+p.x)*6,y=(p.ay+p.y)*6;
 screen.beginPath();screen.arc(x,y,5,0,Math.PI*2);screen.fill();screen.stroke();
 screen.beginPath();screen.moveTo(x-12,y);screen.lineTo(x+12,y);screen.moveTo(x,y-12);screen.lineTo(x,y+12);screen.stroke();
 $("animation-title").textContent=(state.name||"NEW ANIMATION")+" · "+state.dir.toUpperCase()+" F"+(state.frame+1);
 const source=characterSource();
 if($("source-label"))$("source-label").textContent=source.name+" · "+
  (state.stockReference?"GHOST STOCK GUIDE (NOT EXPORTED): "+state.stockReference+" · ":"")+
  "GENESIS POSE / CUSTOM WEAR · "+state.dir.toUpperCase();
 if(document.activeElement!==$("animation-name-edit"))$("animation-name-edit").value=state.name;
 $("ms").value=state.frames[state.frame]?.ms||140;$("loop").checked=state.loop;
 updateProperty();paintStrip();if(!state.playing)drawGif();
}
function drawGif(){
 const dest=$("gif-preview");if(!dest)return;
 const c=dest.getContext("2d");c.imageSmoothingEnabled=false;c.clearRect(0,0,64,112);
 if(!state.rig)return;
 c.drawImage(bake(state.dir,state.previewFrame%Math.max(1,state.frames.length)),0,0);
 $("gif-preview-note").textContent="PREVIEW · "+state.dir.toUpperCase()+" · "+(state.previewFrame%state.frames.length+1)+"/"+state.frames.length+
  " · "+(state.loop?"LOOP":"ONCE");
}
function show(screen){
 stop();nativeStop();state.screen=screen;
 if($("part-edit-shortcut"))$("part-edit-shortcut").hidden=true;
 $("animation-home").hidden=screen!=="home";$("animation-setup").hidden=screen!=="setup";
 $("animation-workspace").hidden=screen!=="editor";
 $("animation-stock-preview").hidden=screen!=="stock";
 if(screen==="home")listClips();else if(screen==="editor")render();
}
function home(message){
 if(message)$("animation-home-note").textContent=message;
 show("home");
}
function paintStrip(){
 const host=$("frame-strip");host.replaceChildren();
 for(let i=0;i<state.frames.length;i++){
  const b=document.createElement("button");b.textContent="◆ "+(i+1)+" / "+state.frames[i].ms+"ms";
  b.setAttribute("aria-pressed",String(state.frame===i));b.onclick=()=>{stop();state.frame=i;render()};host.append(b);
 }
}
function clipCategory(clip){
 const category=String(clip.manifest?.category||"motions").toLowerCase();
 return /^[a-z][a-z0-9_]{0,31}$/.test(category)?category:"motions";
}
function listClips(){
 const holder=$("animations");holder.replaceChildren();
 const rows=Store.list().sort((a,b)=>clipCategory(a).localeCompare(clipCategory(b)));
 const drafts=db();
 let previousCategory="";
 for(const clip of rows){
  const category=clipCategory(clip);
  if(category!==previousCategory){
   const heading=document.createElement("h3");heading.className="animation-category";
   heading.textContent=category.replaceAll("_"," ").toUpperCase();
   holder.append(heading);previousCategory=category;
  }
  const card=document.createElement("div");card.className="clip-card";
  const button=document.createElement("button");
  button.classList.toggle("active",state.id===clip.id);button.dataset.clip=clip.id;
  const title=document.createElement("strong"),info=document.createElement("small");
  title.textContent=clip.name;
  info.textContent=clip.manifest.frames.length+" FRAMES · "+
   (Contract.isStock(clip.manifest)?"APPROVED · GENESIS V6B":
    clip.origin==="bundled"?"REVIEW · GENESIS V6B":
    drafts[clip.id]?"EDITABLE ANIMATION":"USER CLIP");
  button.append(title,info);button.onclick=()=>void open(clip.id);
  const modify=document.createElement("button");modify.className="modify-motion";
  modify.textContent="✎ MODIFY · SPRITE + ANCHOR";modify.dataset.modify=clip.id;
  modify.onclick=()=>void modifyClip(clip).catch(e=>{
   $("animation-home-note").textContent="Could not modify: "+e.message;});
  card.append(button,modify);holder.append(card);
 }
 if(!rows.length)holder.textContent="No animations yet";
}
function setMeta(rec){
 state.id=rec.id;state.name=rec.name;state.gender=rec.gender;state.template=rec.template;
 state.sourceId=rec.sourceId||("base:"+rec.gender);
 if(!characterOptions().some(x=>x.id===state.sourceId))state.sourceId="base:"+rec.gender;
 state.stockReference=rec.stockReference||"";
 state.frames=deep(rec.frames);state.loop=rec.loop!==false;state.tracks=deep(rec.tracks||{});
 state.frame=0;state.dir="se";state.part="head";
 selectSource(state.sourceId);$("template").value=state.template;
 $("animation-name-edit").value=state.name;
}
async function open(id){
 stop();const clip=Store.get(id);
 if(!clip)return say("Missing animation "+id,true);
 const bundled=clip.origin==="bundled";
 const meta=db()[id]||(bundled?{
  id:clip.id,name:clip.name,gender:characterSource().gender,
  sourceId:state.sourceId,stockReference:"",
  template:clip.manifest.motion.sourceAction,frames:deep(clip.manifest.frames),
  loop:clip.manifest.loop!==false,tracks:deep(clip.manifest.motion.tracks)
 }:null);
 if(!meta){await modifyClip(clip);return;}
 setMeta(meta);show("editor");await loadSource();
 say("LOADED "+meta.name+" · "+(bundled?"REVIEW ONLY · MODIFY TO SAVE":"EDITABLE")+
  " · "+state.frames.length+" frames × four directions");
}
async function create(from,sourceClip=null){
 stop();
 const name=String(sourceClip?(sourceClip.name+" · Modified"):from?(state.name+" Copy"):$("setup-name").value).trim().slice(0,80);
 if(!name)throw Error("Enter an activity name before editing");
 const sourceId=from?state.sourceId:$("source-character").value||$("gallery-character").value||"base:male";
 const chosen=characterSource(sourceId),gender=chosen.gender;
 const template=sourceClip?.manifest?.motion?.sourceAction||(from?state.template:$("template").value);
 if(!["male","female"].includes(gender)||!["idle","sit","lie","sleep"].includes(template))
  throw Error("Choose Genesis / Character and a supported starting pose");
 const initial=sourceClip?deep(sourceClip.manifest.frames):
  from?deep(state.frames):Array.from({length:Math.min(6,V.FRAMES[template]||4)},(_,i)=>({key:"f"+i,ms:140}));
 const clip=Store.create({name,frames:initial,requiredParts:["base/body"]});
 const row={id:clip.id,name,gender,sourceId,template,frames:deep(initial),
  stockReference:sourceClip?.origin==="pilot"?sourceClip.id:from?state.stockReference:"",
  loop:sourceClip?sourceClip.manifest.loop!==false:from?state.loop:true,
  tracks:sourceClip?.manifest?.motion?.tracks?deep(sourceClip.manifest.motion.tracks):from?deep(state.tracks):{}};
 const data=db();data[row.id]=row;putDb(data);
 await open(row.id);
 say("EDITABLE COPY · "+name+" · "+chosen.name+" · original clip protected. Pose changes move this character's composited pixels.");
}
async function modifyClip(clip){
 if(!clip)return;
 if(clip.origin!=="bundled"&&db()[clip.id]&&!Contract.isStock(clip.manifest)){await open(clip.id);return;}
 if($("gallery-character")?.value)selectSource($("gallery-character").value);
 $("source-character").value=state.sourceId;
 $("template").value="idle";
 await create(false,clip);
}
function stop(){state.playing=false;clearTimeout(state.timer);$("play").textContent="▶ PLAY"}
function tick(){if(!state.playing)return;const ms=state.frames[state.previewFrame]?.ms||140;
 state.timer=setTimeout(()=>{if(!state.playing)return;
  if(state.previewFrame===state.frames.length-1&&!state.loop){stop();render();return}
  state.previewFrame=(state.previewFrame+1)%state.frames.length;
  // Playing frame is the large editable sprite, not just the tiny GIF.
  // Click-to-select must use exactly the frame currently visible.
  state.frame=state.previewFrame;render();drawGif();tick();
 },ms);
}
function toggle(){if(state.playing){stop();render();return}
 if(!db()[state.id]&&Store.get(state.id)?.origin!=="bundled")return say("Open a motion first",true);
 state.previewFrame=state.frame;state.playing=true;$("play").textContent="❚❚ PAUSE";
 render();drawGif();tick()}
function changeFrame(n){stop();state.frame=Math.max(0,Math.min(state.frames.length-1,n));render()}
function addFrame(duplicate){
 if(!db()[state.id]&&Store.get(state.id)?.origin!=="bundled")return say("New animation first",true);
 if(state.frames.length>=6)return say("Current activity atlas supports max 6 frames. Use additional clips for longer actions.",true);
 const idx=state.frame+1,source=state.frames[state.frame];
 state.frames.splice(idx,0,{key:"f"+Date.now().toString(36).slice(-5),ms:source.ms});
 for(const d of DIRS){if(!state.tracks[d])state.tracks[d]=[];const copy=duplicate?deep(pose(d,state.frame)):freshPose();state.tracks[d].splice(idx,0,copy)}
 state.frame=idx;render();
}
function ensureTracks(){for(const dir of DIRS)for(let i=0;i<state.frames.length;i++)pose(dir,i)}
function hasPixels(frame){
 const data=frame.getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112).data;
 for(let i=3;i<data.length;i+=4)if(data[i]>12)return true;
 return false;
}
async function validateStock(motion){
 for(const gender of ["male","female"]){
  const base=Genesis.get(gender);
  const ch=V.norm({...base.appearance,gender,body:gender,hair:"none",face:"blank",characterId:""});
  const rig=await Motion.prepare(ch,motion.sourceAction,{
   sourceKey:"validation:"+gender,partOverrides:base.parts});
  for(const dir of DIRS)for(let i=0;i<state.frames.length;i++){
   if(!hasPixels(Motion.renderPrepared(rig,dir,motion.tracks[dir][i])))
    throw Error("Empty Genesis pose: "+gender+" "+dir+" F"+(i+1));
  }
 }
 for(const dir of DIRS)for(let i=0;i<state.frames.length;i++)
  if(!hasPixels(bake(dir,i)))throw Error("Empty selected appearance pose "+dir+" F"+(i+1));
}
async function save(publishStock=false){
 if(Store.get(state.id)?.origin==="bundled")
  throw Error("Bundled motion is read-only. Click MODIFY for an editable copy.");
 if(!db()[state.id])return say("Create or modify a motion first",true);
 state.name=$("animation-name-edit").value.trim().slice(0,80);
 if(!state.name)throw Error("Enter an animation name");
 const bridge=root.parent!==root&&root.parent?.VLMahlukWorkspace;
 if(!bridge?.isOnline?.())throw Error("Connect Google Drive before saving or submitting");
 if(!state.rig)await loadSource();
 if(!state.rig)throw Error("Genesis rig missing");
 ensureTracks();
 const motion=Contract.make({sourceAction:action(),frames:state.frames,tracks:state.tracks,
  status:publishStock?"stock":"draft"});
 const atlas=canvas(384,2688),g=atlas.getContext("2d");g.imageSmoothingEnabled=false;
 for(let d=0;d<4;d++)for(let f=0;f<state.frames.length;f++)
  g.drawImage(bake(DIRS[d],f),f*64,d*112);
 if(publishStock){
  say("VALIDATING · MALE/FEMALE · FOUR DIRECTIONS · EVERY FRAME");
  await validateStock(motion);
 }
 const rec0=Store.updateManifest(state.id,{name:state.name,frames:deep(state.frames),
  loop:state.loop,requiredParts:[],motion,source:Contract.FORMAT});
 Contract.validateManifest(rec0.manifest);
 // Only an appearance-bound preview; universal motion data remains the source of truth.
 Store.setLayer(state.id,"preview/composite",atlas.toDataURL("image/png"),{
  thumbDataUrl:bake("se",0).toDataURL("image/png")});
 const all=db();all[state.id]={id:state.id,name:state.name,gender:state.gender,sourceId:state.sourceId,
  stockReference:state.stockReference,template:state.template,frames:deep(state.frames),
  loop:state.loop,tracks:deep(state.tracks),approval:publishStock?"stock":"draft",
  updated:new Date().toISOString()};
 putDb(all);
 const rec=Store.get(state.id),receipt=await bridge.saveOnline("animation",state.id,{
  id:state.id,meta:all[state.id],clip:{manifest:rec.manifest,layers:rec.layers}});
 if(!receipt.verified)throw Error("Cloud motion verification failed");
 try{root.VLHub?.publish("animations",{id:state.id,status:publishStock?"stock":"draft",
  source:Contract.FORMAT})}catch{}
 home((publishStock?"STOCK SUBMITTED":"DRAFT SAVED")+" · "+state.name+
  " · "+state.frames.length+" FRAMES × 4 DIRECTIONS · DRIVE VERIFIED");
}
function editPixels(){
 if(Store.get(state.id)?.origin==="bundled")return say("Click MODIFY first to edit this review motion safely.",true);
 if(!db()[state.id])return say("Open a motion first",true);
 if(state.part==="head")return say("Edit the expression in EMOSI.EXE. Genesis body is locked.",true);
 let character=characterSource();
 const requestedPart=$("pixel-target")?.value;
 if(!character.record){
  if(!Characters||!Genesis)return say("Character Editor source unavailable",true);
  const row=Characters.create({name:"Genesis "+state.gender.toUpperCase()+" · Animation Custom Wear",gender:state.gender});
  Genesis.install(Characters,row.id,state.gender);
  state.sourceId=row.id;fillSources();selectSource(row.id);
  const meta=db();meta[state.id]={...meta[state.id],sourceId:row.id};putDb(meta);
  character=characterSource();
  if(requestedPart&&[...$("pixel-target").options].some(o=>o.value===requestedPart))
   $("pixel-target").value=requestedPart;
  void loadSource().catch(error=>say(error.message,true));
 }
 const part=$("pixel-target")?.value;
 if(!part||!root.V6PCustomWear?.isCustomPart(part)||!root.V6PPartCatalog?.isPart(part))return say("Select a real Character part or Custom Wear first",true);
 const url=new URL("./pixel-editor.html",location.href);
 url.searchParams.set("source","v6p");url.searchParams.set("character",character.record.id);
 url.searchParams.set("master","1"); // Design Custom Wear in all four idle source views.
 url.searchParams.set("part",part);url.searchParams.set("dir",state.dir);
 url.searchParams.set("action",action());url.searchParams.set("frame",String(state.frame%V.FRAMES[action()]));
 url.searchParams.set("from","animation");url.searchParams.set("motion",state.id);
 if(root.parent!==root&&root.parent.VLMahlukWorkspace?.openEditor)
  root.parent.VLMahlukWorkspace.openEditor(url.href);
 else location.href=url.href;
}
async function importUniversalJson(file){
 if(!file)return;
 if(file.size>200000)throw Error("Motion JSON exceeds 200 KB (no embedded sprite pixels allowed)");
 const data=JSON.parse(await file.text());
 if(data?.format!==Contract.FORMAT)throw Error("Not a Genesis V6B universal motion JSON");
 const id=String(data.id||"");
 const name=String(data.name||"").trim().slice(0,80);
 if(!name)throw Error("Motion name required");
 if(!/^(?:clp|clip)_[a-z0-9_]{3,70}$/.test(id))throw Error("Invalid motion ID");
 if(Store.get(id))throw Error("Motion ID already exists; open it with MODIFY to protect existing stock");
 const frames=data.frames;
 if(!Array.isArray(frames)||frames.length<1||frames.length>Contract.MAX_FRAMES)
  throw Error("Motion requires 1–6 frames");
 if(frames.some(f=>typeof f.key!=="string"||!/^[a-z0-9_]{1,32}$/.test(f.key)))
  throw Error("Every frame requires a safe lowercase key");
 const motion=Contract.make({sourceAction:data.sourceAction||"idle",frames,
  tracks:data.tracks,status:"draft"});
 const fresh=Store.create({id,name,frames,loop:data.loop!==false,requiredParts:[]});
 const rec=Store.updateManifest(fresh.id,{frames,loop:data.loop!==false,requiredParts:[],
  motion,source:Contract.FORMAT});
 Contract.validateManifest(rec.manifest);
 const all=db();all[id]={id,name,gender:"male",sourceId:"base:male",
  stockReference:"",template:motion.sourceAction,frames:deep(frames),loop:data.loop!==false,
  tracks:deep(motion.tracks),approval:"draft",updated:new Date().toISOString()};
 putDb(all);
 await open(id);
 say("IMPORTED "+name+" · UNIVERSAL MOTION · review every direction and submit stock");
}
function exportJSON(){const data=db()[state.id];if(!data)return say("No saved pose metadata",true);
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");
 link.href=url;link.download=state.id+".animation.json";document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
for(const name of PARTS){const b=document.createElement("button");b.dataset.part=name;b.textContent=name.replaceAll("_"," ").toUpperCase();
 b.style.cssText="width:100%;display:block;margin:4px 0";b.onclick=()=>{state.part=name;selectPixelTargetByBody();render()};$("parts").append(b)}
for(const id of ["rotation","px","py","ax","ay"]){
 const input=$(id);input.addEventListener("input",()=>{
  if(!db()[state.id]&&Store.get(state.id)?.origin!=="bundled")return;
  const p=selected(),k={rotation:"angle",px:"x",py:"y",ax:"ax",ay:"ay"}[id],n=Number(input.value);
  if(!Number.isFinite(n))return;p[k]=Math.round(n);render()
 });
}
$("reset-transform").onclick=()=>{pose()[state.part]=freshPose()[state.part];render()};
$("gender").onchange=()=>{
 // Preserve old setup automation and imported flows while this legacy
 // control is hidden behind the new Based Character picker.
 const source="base:"+$("gender").value;
 selectSource(source);
 if(state.screen==="editor"&&db()[state.id])
  void loadSource().catch(e=>say(e.message,true));
};
$("template").onchange=()=>{if(!db()[state.id])return;state.template=$("template").value;state.images.clear();void loadSource().catch(e=>say(e.message,true))};
$("view").onchange=()=>{stop();state.dir=$("view").value;render()};
$("ms").onchange=()=>{state.frames[state.frame].ms=Math.max(40,Math.min(800,Number($("ms").value)||140));render()};
$("loop").onchange=()=>{state.loop=$("loop").checked};
$("stock-back").onclick=()=>home();
$("stock-gender").onchange=()=>{selectSource("base:"+$("stock-gender").value);nativeStop();void nativeDraw()};
$("stock-dir").onchange=()=>{nativeStop();void nativeDraw()};
$("stock-play").onclick=nativeToggle;
$("stock-prev").onclick=()=>{if(!nativeStock.clip)return;nativeStop();
 nativeStock.frame=(nativeStock.frame-1+nativeStock.clip.manifest.frames.length)%nativeStock.clip.manifest.frames.length;void nativeDraw()};
$("stock-next").onclick=()=>{if(!nativeStock.clip)return;nativeStop();
 nativeStock.frame=(nativeStock.frame+1)%nativeStock.clip.manifest.frames.length;void nativeDraw()};
$("stock-edit-pixels").onclick=()=>{if(nativeStock.clip)void modifyClip(nativeStock.clip).catch(e=>say(e.message,true))};
$("animation-start-new").onclick=()=>{$("setup-name").value="";$("template").value="idle";
 $("source-character").value=$("gallery-character").value||"base:male";show("setup")};
$("gallery-character").onchange=e=>selectSource(e.target.value);
$("source-character").onchange=e=>selectSource(e.target.value);
$("animation-start-gallery").onclick=()=>home();
$("setup-back").onclick=()=>home();
$("setup-create").onclick=()=>create(false).catch(e=>{$("animation-home-note").textContent=e.message;
 root.alert(e.message)});
$("animation-editor-back").onclick=()=>home("Unsaved pose changes remain local until SAVE.");
$("new").onclick=()=>{$("setup-name").value="";show("setup")};
$("copy").onclick=()=>create(true).catch(e=>say(e.message,true));
$("animation-name-edit").oninput=()=>{state.name=$("animation-name-edit").value;$("animation-title").textContent=state.name||"NEW ANIMATION"};
$("save").onclick=()=>save(false).catch(e=>say(e.message,true));
 $("submit-stock").onclick=()=>save(true).catch(e=>say("STOCK SUBMIT FAILED · "+e.message,true));
$("animation-save-sync").onclick=()=>save(true).catch(e=>say(e.message,true));
$("play").onclick=toggle;$("prev").onclick=()=>changeFrame(state.frame-1);$("next").onclick=()=>changeFrame(state.frame+1);
$("add-frame").onclick=()=>addFrame(false);$("duplicate").onclick=()=>addFrame(true);
$("remove-frame").onclick=()=>{if(state.frames.length<2)return say("At least one frame is required",true);
 for(const d of DIRS)state.tracks[d]?.splice(state.frame,1);state.frames.splice(state.frame,1);state.frame=Math.max(0,state.frame-1);render()};
$("open-pixel").onclick=editPixels;
$("part-edit-now").onclick=editPixels;
$("pixel-target").onchange=updatePartShortcut;
$("export").onclick=exportJSON;
 $("import-motion").onclick=()=>$("import-motion-file").click();
 $("import-motion-file").onchange=e=>{
  const file=e.target.files?.[0];e.target.value="";
  void importUniversalJson(file).catch(error=>say("IMPORT FAILED · "+error.message,true));
 };
cv.addEventListener("pointerdown",e=>{
 if(!db()[state.id])return;
 // Pause on the displayed playback frame before choosing a real body cutout.
 if(state.playing){const playingFrame=state.previewFrame;stop();state.frame=playingFrame;}
 const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)*64/r.width,y=(e.clientY-r.top)*112/r.height;
 if(!$("move-anchor").checked){
  const hit=hitTestPart(x,y);
  if(!hit)return;
  state.part=hit;selectPixelTargetByBody(y>=95&&hit.startsWith("leg"));
 }
 state.drag={x,y,point:deep(selected()),anchor:$("move-anchor").checked};cv.setPointerCapture(e.pointerId);render();
});
cv.addEventListener("dblclick",()=>{if(db()[state.id])editPixels()});
cv.addEventListener("pointermove",e=>{
 if(!state.drag)return;
 const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)*64/r.width,y=(e.clientY-r.top)*112/r.height;
 const p=selected(),d=state.drag;
 if(d.anchor){p.ax=Math.round(Math.max(0,Math.min(63,d.point.ax+x-d.x)));p.ay=Math.round(Math.max(0,Math.min(111,d.point.ay+y-d.y)))}
 else{p.x=Math.round(d.point.x+x-d.x);p.y=Math.round(d.point.y+y-d.y)}
 render();
});
cv.addEventListener("pointerup",()=>{state.drag=null});cv.addEventListener("pointercancel",()=>{state.drag=null});
window.addEventListener("pagehide",()=>{stop();nativeStop()});
root.addEventListener("message",e=>{
 if(e.origin!==location.origin)return;
 if(e.data?.type==="mahluk:cloud-connected")void refreshCloud();
 if(e.data?.type==="mahluk:refresh-animation"){
  fillSources();V.clearCache?.();Motion.clearCache();
  void loadSource().catch(error=>say(error.message,true));
 }
});
fillSources();show("home");updateProperty();
 // JSON is loaded independently of online/Drive state, using the shared registry.
 void Store.loadBundled().then(()=>listClips()).catch(error=>{
  $("animation-home-note").textContent="Motion registry: "+error.message;
 });
 void refreshCloud();
const returnMotion=new URLSearchParams(location.search).get("motion");
if(returnMotion){
 void Store.loadBundled().then(()=>open(returnMotion))
  .catch(e=>say("Animation return failed: "+e.message,true));
}else loadSource().catch(e=>say(e.message,true));
})(window);