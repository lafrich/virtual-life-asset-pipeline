/* True sprite-frame Animation Studio. Six articulated cutout pixel layers with
   explicit anchor transforms, baked to four-direction PNG frames; no skeletal rig.
   Uses Genesis Male/Female or a selected Character's own body, clothes and
   Custom Wear as the source. Approved stock stays read-only. */
(function(root){"use strict";
const $=id=>document.getElementById(id),V=root.V6PCompositor,Store=root.V6PClipStore,A=root.V6PActivityContract,
 Characters=root.V6PCharacterStore,Genesis=root.V6PGenesisBase;
if(!V||!Store||!A)return;
const KEY="vl-mahluk-animation-anchor-poses-v1",PARTS=["leg_l","leg_r","torso","arm_l","arm_r","head"],DIRS=["se","sw","ne","nw"];
const ANCHORS={head:[32,35],torso:[32,60],arm_l:[20,54],arm_r:[44,54],leg_l:[25,84],leg_r:[39,84]};
const cv=$("stage"),screen=cv.getContext("2d"),state={id:"",name:"",gender:"male",template:"idle",frames:[{key:"f0",ms:140},{key:"f1",ms:140}],loop:true,
 dir:"se",frame:0,part:"head",tracks:{},sheet:null,playing:false,timer:0,images:new Map(),drag:null,revision:0,previewFrame:0,screen:"home",
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
function imageFor(url){
 return new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>resolve(img);
  img.onerror=()=>reject(Error("Selected Genesis sprite source could not load"));img.src=url;
 });
}
async function setSource(){
 const selected=characterSource();
 const gender=selected.gender;
 if(selected.record){
  const record=selected.record;
  const look=V.norm({...record.appearance,body:gender,gender,characterId:record.id,face:"blank"});
  const result=await V.sheet(look,null,"");
  if(!result)throw Error("Selected Character parts missing; repair in Character tab");
  state.sourceLook=look;
  return result;
 }
 if(!Genesis)throw Error("Genesis Male/Female sources not loaded");
 const base=Genesis.get(gender),suffix=gender==="female"?"_f":"";
 const look=V.norm({...base.appearance,gender,body:gender,hair:"none",top:"nude",pants:"nude",shoes:"nude",face:"blank",glasses:"none",facial:"none"});
 const native=await V.sheet(look,null,"");
 if(!native)throw Error("Original Genesis body sheet missing");
 const out=canvas(384,4928),g=out.getContext("2d");
 g.imageSmoothingEnabled=false;g.drawImage(native,0,0);
 // Original exact Genesis Custom Wear. Never rasterize it into an unrelated
 // starter outfit; stage transforms use this *character's* composed pixels.
 for(const part of ["top/custom_back"+suffix,"shoes/custom"+suffix,"pants/custom"+suffix,"top/custom"+suffix]){
  const url=base.parts?.[part];
  if(!url)throw Error("Missing Genesis source layer "+part);
  g.drawImage(await imageFor(url),0,0);
 }
 state.sourceLook=V.norm({...base.appearance,body:gender,gender,top:"custom",pants:"custom",shoes:"custom",face:"blank"});
 return out;
}
async function loadSource(){
 const rev=++state.revision;
 const sheet=await setSource();
 if(rev!==state.revision)return;
 state.sheet=sheet;state.images.clear();render();
}
function updatePixelTargets(){
 const target=$("pixel-target");if(!target)return;
 const source=characterSource();
 // Re-read the draft after every Character edit to avoid stale appearance.
 const look=source.record?.appearance||Genesis?.get?.(source.gender)?.appearance||{};
 const f=source.gender==="female"?"_f":"";
 const options=[
  ["base/body"+f,"BODY / SKIN"],
  ["top/"+(look.top||"custom")+f,"TOP / CUSTOM WEAR"],
  ["pants/"+(look.pants||"custom")+f,"PANTS / CUSTOM WEAR"],
  ["shoes/"+(look.shoes||"custom")+f,"SHOES / CUSTOM WEAR"]
 ];
 if(look.hair&&look.hair!=="none")options.push(["hair/"+look.hair+"_front","HAIR"]);
 target.replaceChildren();
 for(const [part,name] of options){
  if(!root.V6PPartCatalog?.isPart(part))continue;
  const o=document.createElement("option");o.value=part;o.textContent=name+" · "+part;target.append(o);
 }
 selectPixelTargetByBody();
}
function selectPixelTargetByBody(){
 const el=$("pixel-target");if(!el||!el.options.length)return;
 const preferred=state.part==="head"?"base/body":state.part.startsWith("arm")||state.part==="torso"?"top/":
  "pants/";
 const match=[...el.options].find(o=>o.value.startsWith(preferred));
 if(match)el.value=match.value;
}
function action(){return V.ROWS[state.template]!=null?state.template:"idle"}
function sourceCell(dir=state.dir,frame=state.frame){
 const key=dir+"/"+frame+"/"+state.template+"/"+state.sourceId;
 if(state.images.has(key))return state.images.get(key);
 const sheet=state.sheet;if(!sheet)return null;
 const out=V.extractFrame(sheet,action(),dir,frame%V.FRAMES[action()]);
 state.images.set(key,out);return out;
}
function partForPixel(x,y){
 if(y<44)return "head";
 if(y<80){if(x<23)return "arm_l";if(x>40)return "arm_r";return "torso"}
 return x<32?"leg_l":"leg_r";
}
function segments(frame){
 const src=frame.getContext("2d").getImageData(0,0,64,112),ret={};
 for(const part of PARTS)ret[part]=canvas(64,112);
 const ctx={};for(const part of PARTS)ctx[part]=ret[part].getContext("2d").createImageData(64,112);
 for(let y=0;y<112;y++)for(let x=0;x<64;x++){
  const pos=(y*64+x)*4,part=partForPixel(x,y);
  for(let k=0;k<4;k++)ctx[part].data[pos+k]=src.data[pos+k];
 }
 for(const part of PARTS)ret[part].getContext("2d").putImageData(ctx[part],0,0);
 return ret;
}
function bake(dir=state.dir,index=state.frame){
 const img=sourceCell(dir,index),out=canvas(64,112);if(!img)return out;
 const c=out.getContext("2d");c.imageSmoothingEnabled=false;
 const pieces=segments(img),trans=pose(dir,index);
 for(const part of PARTS){
  const p=trans[part],r=p.angle*Math.PI/180;
  c.save();c.translate(p.ax+p.x,p.ay+p.y);c.rotate(r);
  c.drawImage(pieces[part],-p.ax,-p.ay);c.restore();
 }
 return out;
}
function render(){
 const miniature=bake(),w=384,h=672;screen.clearRect(0,0,w,h);screen.imageSmoothingEnabled=false;
 screen.drawImage(miniature,0,0,64,112,0,0,w,h);
 const p=selected();screen.strokeStyle="#fff";screen.fillStyle="#2568dc";screen.lineWidth=1;
 const x=(p.ax+p.x)*6,y=(p.ay+p.y)*6;
 screen.beginPath();screen.arc(x,y,5,0,Math.PI*2);screen.fill();screen.stroke();
 screen.beginPath();screen.moveTo(x-12,y);screen.lineTo(x+12,y);screen.moveTo(x,y-12);screen.lineTo(x,y+12);screen.stroke();
 $("animation-title").textContent=(state.name||"NEW ANIMATION")+" · "+state.dir.toUpperCase()+" F"+(state.frame+1);
 if(document.activeElement!==$("animation-name-edit"))$("animation-name-edit").value=state.name;
 $("ms").value=state.frames[state.frame]?.ms||140;$("loop").checked=state.loop;
 updateProperty();paintStrip();if(!state.playing)drawGif();
}
function drawGif(){
 const dest=$("gif-preview");if(!dest)return;
 const c=dest.getContext("2d");c.imageSmoothingEnabled=false;c.clearRect(0,0,64,112);
 if(!state.sheet)return;
 c.drawImage(bake(state.dir,state.previewFrame%Math.max(1,state.frames.length)),0,0);
 $("gif-preview-note").textContent="PREVIEW · "+state.dir.toUpperCase()+" · "+(state.previewFrame%state.frames.length+1)+"/"+state.frames.length+
  " · "+(state.loop?"LOOP":"ONCE");
}
function show(screen){
 stop();nativeStop();state.screen=screen;
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
function listClips(){
 const holder=$("animations");holder.replaceChildren();
 const rows=Store.list().sort((a,b)=>{
   const sa=a.origin==="pilot"&&A.isPlayable(a.manifest.band)?0:1;
   const sb=b.origin==="pilot"&&A.isPlayable(b.manifest.band)?0:1;
   return sa-sb;
 });
 const drafts=db();
 for(const clip of rows){
  const official=clip.origin==="pilot"&&A.isPlayable(clip.manifest.band);
  const b=document.createElement("button");b.classList.toggle("active",state.id===clip.id);
  b.dataset.clip=clip.id;
  const title=document.createElement("strong"),info=document.createElement("small");
  title.textContent=official?(STOCK_TITLES[clip.manifest.band]||clip.name.toUpperCase()):clip.name;
  info.textContent=clip.manifest.frames.length+" FRAMES · "+
   (official?"APPROVED NATIVE STOCK · PLAY":drafts[clip.id]?"EDITABLE USER ANIMATION":"USER PIXEL CLIP");
  b.append(title,info);b.onclick=()=>void open(clip.id);holder.append(b);
 }
 if(!rows.length)holder.textContent="No animations yet";
}
function setMeta(rec){
 state.id=rec.id;state.name=rec.name;state.gender=rec.gender;state.template=rec.template;
 state.frames=deep(rec.frames);state.loop=rec.loop!==false;state.tracks=deep(rec.tracks||{});
 state.frame=0;state.dir="se";state.part="head";
 $("gender").value=state.gender;$("template").value=state.template;
 $("animation-name-edit").value=state.name;
}
async function open(id){
 stop();const clip=Store.get(id),meta=db()[id];
 if(!clip)return say("Missing animation "+id,true);
 if(clip.origin==="pilot"&&A.isPlayable(clip.manifest.band)){
  nativeOpen(clip);return;
 }
 if(!meta){
  state.id=id;state.name=clip.name;
  editPixels();return;
 }
 setMeta(meta);show("editor");await loadSource();
 say("LOADED "+meta.name+" · editable all 4 directions / "+state.frames.length+" frames");
}
async function create(from){
 stop();
 const name=String(from?(state.name+" Copy"):$("setup-name").value).trim().slice(0,80);
 if(!name)throw Error("Enter an activity name before editing");
 const gender=from?state.gender:$("gender").value,template=from?state.template:$("template").value;
 if(!["male","female"].includes(gender)||!(from?V.ROWS[template]!=null:["idle","sit","lie","sleep"].includes(template)))
  throw Error("Select a supported Male/Female base and starting pose");
 const initial=from?deep(state.frames):Array.from({length:Math.min(6,V.FRAMES[template]||4)},(_,i)=>({key:"f"+i,ms:140}));
 const clip=Store.create({name,frames:initial,requiredParts:["base/body"]});
 const row={id:clip.id,name,gender,template,frames:deep(initial),loop:from?state.loop:true,tracks:from?deep(state.tracks):{}};
 const data=db();data[row.id]=row;putDb(data);
 await open(row.id);say("NEW "+name+" · "+template.toUpperCase()+" · edit frames and preview before saving.");
}
function stop(){state.playing=false;clearTimeout(state.timer);$("play").textContent="▶ PLAY"}
function tick(){if(!state.playing)return;const ms=state.frames[state.previewFrame]?.ms||140;
 state.timer=setTimeout(()=>{if(!state.playing)return;
  if(state.previewFrame===state.frames.length-1&&!state.loop){stop();drawGif();return}
  state.previewFrame=(state.previewFrame+1)%state.frames.length;drawGif();tick()
 },ms);
}
function toggle(){if(state.playing){stop();return}
 if(!db()[state.id])return say("Open an editable animation first",true);
 state.previewFrame=0;state.playing=true;$("play").textContent="❚❚ PAUSE";drawGif();tick()}
function changeFrame(n){stop();state.frame=Math.max(0,Math.min(state.frames.length-1,n));render()}
function addFrame(duplicate){
 if(!db()[state.id])return say("New animation first",true);
 if(state.frames.length>=6)return say("Current activity atlas supports max 6 frames. Use additional clips for longer actions.",true);
 const idx=state.frame+1,source=state.frames[state.frame];
 state.frames.splice(idx,0,{key:"f"+Date.now().toString(36).slice(-5),ms:source.ms});
 for(const d of DIRS){if(!state.tracks[d])state.tracks[d]=[];const copy=duplicate?deep(pose(d,state.frame)):freshPose();state.tracks[d].splice(idx,0,copy)}
 state.frame=idx;render();
}
async function save(withDrive=false){
 if(!db()[state.id])return say("New animation first",true);
 state.name=$("animation-name-edit").value.trim().slice(0,80);
 if(!state.name)throw Error("Enter an activity name");
 if(!state.sheet)await loadSource();if(!state.sheet)throw Error("Base pixels missing");
 const atlas=canvas(384,2688),a=atlas.getContext("2d");a.imageSmoothingEnabled=false;
 for(let d=0;d<4;d++)for(let f=0;f<state.frames.length;f++)
  a.drawImage(bake(DIRS[d],f),f*64,d*112);
 Store.updateManifest(state.id,{name:state.name,frames:deep(state.frames),loop:state.loop,requiredParts:["base/body"]});
 Store.setLayer(state.id,"base/body",atlas.toDataURL("image/png"),{thumbDataUrl:bake("se",0).toDataURL("image/png")});
 const all=db();all[state.id]={id:state.id,name:state.name,gender:state.gender,template:state.template,
  frames:deep(state.frames),loop:state.loop,tracks:deep(state.tracks),updated:new Date().toISOString()};
 putDb(all);
 try{root.VLHub?.publish("animations",{source:"mahluk-animation-studio",id:state.id,status:"draft"})}catch{}
 const bridge=root.parent!==root&&root.parent?.VLMahlukWorkspace;
 if(!bridge?.isOnline?.())throw Error("Connect Google Drive in MAHLUK toolbar before Save Online");
 const rec=Store.get(state.id),meta=all[state.id];
 const receipt=await bridge.saveOnline("animation",state.id,{
  id:state.id,meta,clip:{manifest:rec.manifest,
   layers:{"base/body":atlas.toDataURL("image/png")}}
 });
 if(!receipt.verified)throw Error("Cloud animation verification failed");
 home("CLOUD VERIFIED · "+state.name+" · "+state.frames.length+" frames × 4 directions");
}
function editPixels(){
 if(!state.id)return say("Create animation first",true);
 const url="./pixel-editor.html?source=v6p&project="+encodeURIComponent(state.id);
 if(root.parent!==root&&root.parent.VLMahlukWorkspace?.openEditor)root.parent.VLMahlukWorkspace.openEditor(url);else location.href=url;
}
function exportJSON(){const data=db()[state.id];if(!data)return say("No saved pose metadata",true);
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");
 link.href=url;link.download=state.id+".animation.json";document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
for(const name of PARTS){const b=document.createElement("button");b.dataset.part=name;b.textContent=name.replaceAll("_"," ").toUpperCase();
 b.style.cssText="width:100%;display:block;margin:4px 0";b.onclick=()=>{state.part=name;render()};$("parts").append(b)}
for(const id of ["rotation","px","py","ax","ay"]){
 const input=$(id);input.addEventListener("input",()=>{
  if(!db()[state.id])return;
  const p=selected(),k={rotation:"angle",px:"x",py:"y",ax:"ax",ay:"ay"}[id],n=Number(input.value);
  if(!Number.isFinite(n))return;p[k]=Math.round(n);render()
 });
}
$("reset-transform").onclick=()=>{pose()[state.part]=freshPose()[state.part];render()};
$("gender").onchange=()=>{if(!db()[state.id])return;state.gender=$("gender").value;loadSource()};
$("template").onchange=()=>{if(!db()[state.id])return;state.template=$("template").value;state.images.clear();render()};
$("view").onchange=()=>{stop();state.dir=$("view").value;render()};
$("ms").onchange=()=>{state.frames[state.frame].ms=Math.max(40,Math.min(800,Number($("ms").value)||140));render()};
$("loop").onchange=()=>{state.loop=$("loop").checked};
$("stock-back").onclick=()=>home();
$("stock-gender").onchange=()=>{nativeStop();void nativeDraw()};
$("stock-dir").onchange=()=>{nativeStop();void nativeDraw()};
$("stock-play").onclick=nativeToggle;
$("stock-prev").onclick=()=>{if(!nativeStock.clip)return;nativeStop();
 nativeStock.frame=(nativeStock.frame-1+nativeStock.clip.manifest.frames.length)%nativeStock.clip.manifest.frames.length;void nativeDraw()};
$("stock-next").onclick=()=>{if(!nativeStock.clip)return;nativeStop();
 nativeStock.frame=(nativeStock.frame+1)%nativeStock.clip.manifest.frames.length;void nativeDraw()};
$("stock-edit-pixels").onclick=()=>{if(nativeStock.clip){state.id=nativeStock.clip.id;editPixels()}};
$("animation-start-new").onclick=()=>{$("setup-name").value="";$("template").value="idle";show("setup")};
$("animation-start-pose").onclick=()=>{$("setup-name").value="";show("setup")};
$("animation-start-gallery").onclick=()=>home();
$("setup-back").onclick=()=>home();
$("setup-create").onclick=()=>create(false).catch(e=>{$("animation-home-note").textContent=e.message;
 root.alert(e.message)});
$("animation-editor-back").onclick=()=>home("Unsaved pose changes remain local until SAVE.");
$("new").onclick=()=>{$("setup-name").value="";show("setup")};
$("copy").onclick=()=>create(true).catch(e=>say(e.message,true));
$("animation-name-edit").oninput=()=>{state.name=$("animation-name-edit").value;$("animation-title").textContent=state.name||"NEW ANIMATION"};
$("save").onclick=()=>save(false).catch(e=>say(e.message,true));
$("animation-save-sync").onclick=()=>save(true).catch(e=>say(e.message,true));
$("play").onclick=toggle;$("prev").onclick=()=>changeFrame(state.frame-1);$("next").onclick=()=>changeFrame(state.frame+1);
$("add-frame").onclick=()=>addFrame(false);$("duplicate").onclick=()=>addFrame(true);
$("remove-frame").onclick=()=>{if(state.frames.length<2)return say("At least one frame is required",true);
 for(const d of DIRS)state.tracks[d]?.splice(state.frame,1);state.frames.splice(state.frame,1);state.frame=Math.max(0,state.frame-1);render()};
$("open-pixel").onclick=editPixels;$("export").onclick=exportJSON;
cv.addEventListener("pointerdown",e=>{
 if(!db()[state.id])return;
 const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)*64/r.width,y=(e.clientY-r.top)*112/r.height;
 if(!$("move-anchor").checked)state.part=partForPixel(x,y);
 state.drag={x,y,point:deep(selected()),anchor:$("move-anchor").checked};cv.setPointerCapture(e.pointerId);render();
});
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
 if(e.origin===location.origin&&e.data?.type==="mahluk:cloud-connected")void refreshCloud();
});
show("home");void refreshCloud();updateProperty();loadSource().catch(e=>say(e.message,true));
})(window);