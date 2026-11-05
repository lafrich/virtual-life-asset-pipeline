/* Mahluk Hidup 2.0: non-destructive source-native 2.5D plane studio.
   Shared-origin bridge: localStorage["mahluk-2-library-v1"].
   All art comes from the published V6B split atlas, never a redrawn mannequin. */
(function(window){
"use strict";
const R=window.VLModularRigV2,E=window.MH2EmotionPlanes;
const $=id=>document.getElementById(id);
const DIR=["se","sw","ne","nw"], FACE=new Set(["eye_l","eye_r","brow_l","brow_r","nose","mouth","blush_l","blush_r"]);
const STORAGE="mahluk-2-library-v1", DRAFT="mahluk-2-draft-v1", EMOTIONS=["neutral","happy","mischievous","angry","surprised","blush","grin"];
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
let emotionAssetId="native:neutral",emotionKeys=[],glassesAssetId="native",userAssets=[],nativeFaces=new Map(),importedImages=new Map();
let state=R?.referencePose?.()||null,base=R?.referencePose?.()||null,tracks=R?.makeTracks?.()||{};
let selected="head",direction="se",type="original",outfit="outfit",clip="idle",frame=0,frames=12,fps=12,playing=false,playSince=0,zoom=3.25;
let camera={x:0,y:0},view="iso",axis="x",transformMode="move",drag=null,identifier=null;
const studio=$("editor"),game=$("game");
function setStatus(t,ok){$("status").textContent=t;if(ok!==undefined){$("syncLed").classList.toggle("ok",!!ok);$("syncLabel").textContent=ok?"GAME STORAGE READY":"SOURCE UNAVAILABLE";}}
function safeGet(k,def){try{return JSON.parse(localStorage.getItem(k)||"null")??def}catch{return def}}
function safePut(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){setStatus("STORAGE FULL / DISABLED: "+e.message,false);return false}}
function getLibrary(){const a=safeGet(STORAGE,[]);return Array.isArray(a)?a.filter(r=>r&&r.format==="mahluk-2-character-v1").slice(0,40):[]}
function slotAllowed(s){
 if(type==="original")return !s.gender;
 if(s.gender===type)return s.layer_type==="body"||(outfit==="outfit"&&s.layer_type==="garment");
 // Facial overlays authored from the same V6B system are independent of the base anatomy.
 return !s.gender&&s.expression;
}
function activeSlots(){return slots.filter(slotAllowed)}
function faceEmotion(s){return state.faceLayers?.[s.bone]||state.emotion||"neutral"}
function partWorld(){return E.accessoryWorld(state,R)}
function getEmotionAsset(id){
 if(typeof id!=="string")return null;
 if(id.startsWith("native:")){
  const name=id.slice(7);
  return (manifest?.emotions||[]).includes(name)?{id,frames:1,native:name}:null;
 }
 return userAssets.find(a=>a.id===id&&a.kind==="emotion")||null;
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
 const img=importedImages.get(asset.id);
 return img?{image:img,sx:(f%asset.frames)*64,sy:DIR.indexOf(dir)*112}:null;
}
function renderLayers(ctx,dir,ox,oy,mag,editorMode){
 const world=partWorld(),mirror=dir==="sw"||dir==="nw",di=DIR.indexOf(dir);
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
  if(slotAllowed(s))ordered.push({kind:"body",bone:s.bone,i,s});
 }
 if(!faceAdded)ordered.push({kind:"emotion",bone:"emotion",i:slots.length+1});
 if(!glassesAdded)ordered.push({kind:"glasses",bone:"glasses",i:slots.length+2});
 ordered.sort((a,b)=>{
  const za=(world[a.bone]?.z||0)+(type!=="original"&&a.kind!=="body"?20:0);
  const zb=(world[b.bone]?.z||0)+(type!=="original"&&b.kind!=="body"?20:0);
  return za-zb||a.i-b.i;
 });
 for(const item of ordered){
  const bone=R.BMAP[item.bone],p=world[item.bone];
  if(!p?.visible||!bone)continue;
  let src;
  if(item.kind==="emotion")src=sourceImage(getEmotionAsset(emotionAt()),dir,frame);
  else if(item.kind==="glasses")src=sourceImage(getGlassesAsset(glassesAssetId),dir,frame);
  else {
   const image=images.get(item.s.src);
   src=image?{image,sx:0,sy:di*112}:null;
  }
  if(!src)continue;
  // Each source RGBA occupies exactly one plane with independent transform.
  // Emotion and glasses are sibling children of head (not face micro-bones).
  const mx=mirror?64-p.x:p.x,ax=mirror?64-bone.x:bone.x;
  const dzx=view==="iso"||!editorMode?-.60*p.z:0;
  const dzy=view==="iso"||!editorMode?-.28*p.z:0;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.translate(ox+(mx+dzx)*mag,oy+(p.y+dzy)*mag);
  ctx.rotate((mirror?-1:1)*p.angle*Math.PI/180);
  ctx.scale(p.scale*mag,p.scale*mag);
  ctx.drawImage(src.image,src.sx,src.sy,64,112,-ax,-bone.y,64,112);
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
function projectBone(w,h,scale,bone){
 const p=partWorld()[bone],b=R.BMAP[bone];if(!p||!b)return null;
 const c=center(w,h,scale),mirror=direction==="sw"||direction==="nw";
 return {x:c.x+((mirror?64-p.x:p.x)-(view==="iso"?.60*p.z:0))*scale,
 y:c.y+(p.y-(view==="iso"?.28*p.z:0))*scale};
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
 const handles=[
  {id:"x",end:{x:pos.x+u,y:pos.y},color:"#ff8b7d"},
  {id:"y",end:{x:pos.x,y:pos.y-u},color:"#7fda9a"},
  {id:"z",end:{x:pos.x-u*.78,y:pos.y-u*.4},color:"#76adfc"}
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
let lastHandles=[];
function drawEditor(){
 if(!state||!manifest)return;
 const {w,h,dpr}=stageDimensions(),ctx=studio.getContext("2d");
 ctx.clearRect(0,0,w,h);
 const mag=zoom*dpr,c=center(w,h,mag);
 drawGrid(ctx,w,h,mag);renderLayers(ctx,direction,c.x,c.y,mag,true);
 const target=projectBone(w,h,mag,selected);
 if(target){ctx.save();ctx.strokeStyle="#f8c576";ctx.lineWidth=1;ctx.setLineDash([4,3]);ctx.strokeRect(target.x-9,target.y-9,18,18);ctx.setLineDash([]);ctx.restore();lastHandles=arrows(ctx,target,mag)}
 else lastHandles=[];
 const p=state.parts[selected]||{};
 $("coords").textContent="X "+(p.x||0).toFixed(1)+" · Y "+(p.y||0).toFixed(1)+" · Z "+(p.z||0).toFixed(1);
}
function drawGame(){
 if(!manifest||!state)return;
 const ctx=game.getContext("2d");ctx.clearRect(0,0,64,112);renderLayers(ctx,direction,0,0,1,false);
}
function paint(){drawEditor();drawGame();}
function axisButtons(){
 for(const tool of ["Move","Rotate","Scale"])$("tool"+tool).classList.toggle("active",transformMode===tool.toLowerCase());
 for(const id of ["x","y","z"])$("axis"+id.toUpperCase()).classList.toggle("active",axis===id);
 $("viewIso").classList.toggle("active",view==="iso");$("viewFront").classList.toggle("active",view==="front");
 $("viewHint").textContent=view==="iso"?"ISOMETRIC · X / Y / Z":"FRONT · FLAT PIXELS";
}
function pick(id){
 if(!R.BMAP[id])return;
 selected=id;document.querySelectorAll("[data-bone]").forEach(x=>x.classList.toggle("selected",x.dataset.bone===id));
 $("selectedName").textContent=R.BMAP[id].label;
 $("selectedParent").textContent="PARENT: "+(id==="glasses"?"head":R.BMAP[id].parent||"none");
 const p=state.parts[id];for(const [k,el] of [["x","posX"],["y","posY"],["z","posZ"],["angle","angle"],["scale","scale"]])$(el).value=p[k]??0;
 $("visible").checked=p.visible;
 if($("emotionAsset"))$("emotionAsset").value=emotionAt();
 if($("glassesAsset"))$("glassesAsset").value=glassesAssetId;
 paint();
}
function buildTree(){
 const holder=$("tree");holder.replaceChildren();const set=new Set(activeSlots().filter(s=>!E.slotKind(s)).map(s=>s.bone));
 set.add("emotion");set.add("glasses");
 for(const [group,bones] of GROUPS){
  const head=document.createElement("div");head.className="tree-group";head.textContent=group;holder.append(head);
  for(const id of bones){
   const b=R.BMAP[id];if(!b)continue;
   const btn=document.createElement("button");btn.dataset.bone=id;btn.type="button";btn.title="Click to edit plane "+id;
   const dot=document.createElement("span");dot.className="dot";dot.textContent=set.has(id)?"▣":"◇";
   const name=document.createElement("span");name.textContent=id.toUpperCase().replaceAll("_"," ");
   const eye=document.createElement("span");eye.className="eye";eye.textContent=state.parts[id].visible?"◉":"○";eye.classList.toggle("off",!state.parts[id].visible);
   btn.append(dot,name,eye);btn.addEventListener("click",()=>pick(id));holder.append(btn);
  }
 }
 $("planeCount").textContent=String(set.size).padStart(2,"0");
 pick(selected);
}
function applyState(){
 setProjectFields();buildTree();makeTimeline();updateEmotionStatus();paint();
}
function setProjectFields(){
 $("modelType").value=type;$("outfit").value=outfit;$("outfit").disabled=type==="original";
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
    }else if(keyed)tracks[id]=tracks[id].filter(k=>k.frame!==i);
    else R.key(tracks,id,i,state.parts[id],state.emotion,state.faceLayers?.[id]);
    makeTimeline();setStatus((keyed?"REMOVED":"KEYED")+" "+id+" AT FRAME "+(i+1));
   };
   cells.append(cell);
  }
  row.append(cells);content.append(row);
 }
}
function setKey(){
 if(selected==="emotion"){setEmotionKey();return;}
 R.key(tracks,selected,frame,state.parts[selected],state.emotion,state.faceLayers?.[selected]);
 setStatus("◆ KEYFRAME / "+selected+" / "+(frame+1));makeTimeline();
}
function removeKey(){
 if(selected==="emotion"){removeEmotionKey();return;}
 tracks[selected]=(tracks[selected]||[]).filter(k=>k.frame!==frame);
 setStatus("◇ KEY REMOVED / "+selected+" / "+(frame+1));makeTimeline();
}
function assetOptions(){
 const emotion=$("emotionAsset"),glass=$("glassesAsset");
 emotion.replaceChildren();glass.replaceChildren();
 const opt=(list,value,label)=>{
  const o=document.createElement("option");o.value=value;o.textContent=label;list.append(o);
 };
 for(const id of manifest?.emotions||EMOTIONS)opt(emotion,"native:"+id,"V6B ORIGINAL / "+id.toUpperCase());
 opt(glass,"native","ORIGINAL GLASSES / V6B");
 opt(glass,"none","NONE / HIDE");
 for(const asset of userAssets){
  if(asset.kind==="emotion")opt(emotion,asset.id,"IMPORTED / "+asset.name.toUpperCase()+" / "+asset.frames+"F");
  if(asset.kind==="glasses")opt(glass,asset.id,"IMPORTED / "+asset.name.toUpperCase()+" / "+asset.frames+"F");
 }
 if(!getEmotionAsset(emotionAssetId))emotionAssetId="native:neutral";
 if(!getGlassesAsset(glassesAssetId))glassesAssetId="native";
 emotion.value=emotionAt();glass.value=glassesAssetId;
 updateEmotionStatus();
}
function updateEmotionStatus(){
 const asset=getEmotionAsset(emotionAt());
 if($("emotionAsset"))$("emotionAsset").value=emotionAt();
 if($("emotionStatus"))$("emotionStatus").textContent=(asset?.native?"ORIGINAL SOURCE / ":"IMPORTED ANIMATED PLANE / ")+
  (asset?.frames||1)+" FRAME(S) · "+emotionKeys.length+" IMAGE SWAP KEY(S)";
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
  const loaded=new Image();loaded.onload=()=>{
   importedImages.set(asset.id,loaded);
   if(kind==="emotion"){
    emotionAssetId=asset.id;
    if(frame>0||emotionKeys.length)emotionKeys=E.insert(emotionKeys,frame,asset.id);
    if(frames<asset.frames){frames=asset.frames;$("frameCount").value=frames;makeTimeline()}
   }else glassesAssetId=asset.id;
   assetOptions();paint();
   setStatus("✓ IMPORTED "+kind.toUpperCase()+" PLANE: "+asset.name+" / "+asset.frames+" FRAME(S)",true);
  };
  loaded.src=asset.png;
 }catch(error){setStatus("ASSET IMPORT FAILED: "+error.message,false)}
}
function setEmotionKey(){
 emotionKeys=E.insert(emotionKeys,frame,emotionAssetId);
 updateEmotionStatus();makeTimeline();paint();
 setStatus("◆ EMOTION ASSET KEY / F"+(frame+1)+" / "+emotionAssetId,true);
}
function removeEmotionKey(){
 emotionKeys=emotionKeys.filter(key=>key.frame!==frame);
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
 const originalDirection=direction,originalState=state,originalFrame=frame;
 for(let d=0;d<4;d++){
  direction=DIR[d];
  for(let f=0;f<n;f++){
   frame=f;state=n===1?originalState:R.sampleTrack(tracks,f,n,base);
   const tile=document.createElement("canvas");tile.width=64;tile.height=112;const tc=tile.getContext("2d");
   renderLayers(tc,direction,0,0,1,false);
   ctx.drawImage(tile,64*f,112*d);
  }
 }
 direction=originalDirection;state=originalState;frame=originalFrame;
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
 const library=getLibrary(),name=$("characterName").value.trim()||"My Character 2.0";
 const id=identifier||"mh2_"+Date.now().toString(36);
 const old=library.find(r=>r.id===id);
 const clipId=$("clip").value;
 const canvas=bake(frames,clipId);
 const idle=bake(1,"idle").toDataURL("image/png");
 const clips={...(old?.clips||{}),[clipId]:{sheet:canvas.toDataURL("image/png"),frames,frame_ms:Array(frames).fill(Math.round(1000/fps)),loop:true}};
 const record={format:"mahluk-2-character-v1",version:1,id,name,base:type,template_base:type==="female"?"human_female_base":"human_male_base",
  outfit,model:R.normalize(state),rest:R.normalize(base),tracks:clone(tracks),frames,fps,clip:clipId,
  emotionPlane:{asset:emotionAssetId,keys:clone(emotionKeys)},accessoryPlanes:{glasses:glassesAssetId},
  sprite:clipId==="idle"?canvas.toDataURL("image/png"):old?.sprite||idle,clips,updated:Date.now()};
 const next=[...library.filter(r=>r.id!==id),record].slice(-30);
 if(!safePut(STORAGE,next))return;
 identifier=id;updateLibrary();
 document.dispatchEvent(new CustomEvent("mahluk2:published",{detail:{id}}));
 try{window.dispatchEvent(new StorageEvent("storage",{key:STORAGE,newValue:JSON.stringify(next)}))}catch{}
 setStatus("✓ PUBLISHED "+name+" / "+clipId.toUpperCase()+" / "+frames+" FRAMES · SEMESTA & BANGUN RUANG",true);
}
function updateLibrary(){
 const list=$("library"),records=getLibrary();list.replaceChildren();const starter=document.createElement("option");
 starter.value="";starter.textContent="NEW CHARACTER";list.append(starter);
 for(const r of records){const el=document.createElement("option");el.value=r.id;el.textContent=r.name+" / "+r.id;list.append(el)}
 list.value=identifier||"";
}
function loadRecord(id){
 const r=getLibrary().find(r=>r.id===id);if(!r)return;
 identifier=r.id;type=["original","male","female"].includes(r.base)?r.base:"original";
 outfit=r.outfit==="base"?"base":"outfit";clip=r.clip||"idle";
 emotionAssetId=getEmotionAsset(r.emotionPlane?.asset)?r.emotionPlane.asset:"native:"+(r.model?.emotion||"neutral");
 emotionKeys=Array.isArray(r.emotionPlane?.keys)?r.emotionPlane.keys.filter(k=>getEmotionAsset(k.asset)&&Number.isInteger(k.frame)).slice(0,48):[];
 glassesAssetId=getGlassesAsset(r.accessoryPlanes?.glasses)?r.accessoryPlanes.glasses:"native";
 base=R.normalize(r.rest||r.model);state=R.normalize(r.model);
 tracks=R.makeTracks();
 for(const node of R.BONES){for(const key of r.tracks?.[node.id]||[]){
  if(key&&Number.isInteger(key.frame)&&key.value)R.key(tracks,node.id,key.frame,key.value,key.emotion,key.faceEmotion);
 }}
 frames=Math.round(clamp(r.frames||12,1,48));fps=Math.round(clamp(r.fps||12,1,30));frame=0;
 $("characterName").value=r.name;assetOptions();applyState();setStatus("OPENED "+r.name+" / EDIT MODULAR PLANES",true);
}
function newCharacter(){
 identifier=null;type="original";outfit="outfit";clip="idle";frames=12;fps=12;frame=0;
 emotionAssetId="native:neutral";emotionKeys=[];glassesAssetId="native";
 state=R.referencePose();base=R.referencePose();tracks=R.makeTracks();$("characterName").value="My Character 2.0";
 updateLibrary();assetOptions();applyState();setStatus("NEW SOURCE-NATIVE CHARACTER · GAME CONTENT UNCHANGED",true);
}
function projectExport(){
 commitUnkeyedPose();
 const needed=new Set([emotionAssetId,glassesAssetId,...emotionKeys.map(k=>k.asset)]);
 const payload={format:"mahluk-2-project-v1",name:$("characterName").value,id:identifier,base:type,outfit,clip,model:state,rest:base,tracks,frames,fps,
  emotionPlane:{asset:emotionAssetId,keys:clone(emotionKeys)},accessoryPlanes:{glasses:glassesAssetId},
  embeddedAssets:userAssets.filter(a=>needed.has(a.id))};
 download("mahluk_2_project.json",new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
}
function importProject(file){
 if(!file)return;file.text().then(raw=>{
  const v=JSON.parse(raw);
  if(v.format!=="mahluk-2-project-v1")throw Error("Unknown Mahluk 2.0 project");
  identifier=typeof v.id==="string"&&/^mh2_[a-z0-9]+$/.test(v.id)?v.id:null;
  type=["original","male","female"].includes(v.base)?v.base:"original";outfit=v.outfit==="base"?"base":"outfit";clip=["idle","walk","talk","sit","lie","custom"].includes(v.clip)?v.clip:"idle";
  state=R.normalize(v.model);base=R.normalize(v.rest||v.model);tracks=R.makeTracks();
  for(const node of R.BONES){for(const k of v.tracks?.[node.id]||[]){if(k&&k.value&&Number.isInteger(k.frame))R.key(tracks,node.id,k.frame,k.value,k.emotion,k.faceEmotion)}}
  frames=Math.round(clamp(v.frames||12,1,48));fps=Math.round(clamp(v.fps||12,1,30));
  if(Array.isArray(v.embeddedAssets)&&v.embeddedAssets.length){
   const existing=E.safeAssets(window.localStorage);
   const imported=v.embeddedAssets.filter(a=>a?.format===E.FORMAT&&
    typeof a.png==="string"&&a.png.startsWith("data:image/png;base64,")&&
    a.png.length<1500000&&Number.isInteger(a.frames)&&a.frames>=1&&a.frames<=48);
   E.saveAssets(window.localStorage,[...existing.filter(a=>!imported.some(b=>b.id===a.id)),...imported].slice(-12));
  }
  loadImportedAssets();
  emotionAssetId=getEmotionAsset(v.emotionPlane?.asset)?v.emotionPlane.asset:"native:"+(v.model?.emotion||"neutral");
  emotionKeys=Array.isArray(v.emotionPlane?.keys)?v.emotionPlane.keys.filter(k=>getEmotionAsset(k.asset)&&Number.isInteger(k.frame)).slice(0,48):[];
  glassesAssetId=getGlassesAsset(v.accessoryPlanes?.glasses)?v.accessoryPlanes.glasses:"native";
  $("characterName").value=String(v.name||"Imported 2.0").slice(0,40);frame=0;assetOptions();applyState();setStatus("IMPORTED PROJECT / NOT YET PUBLISHED",true);
 }).catch(e=>setStatus("IMPORT FAILED: "+e.message,false));
}
function setupEvents(){
 $("modelType").onchange=e=>{type=e.target.value;buildTree();paint();setStatus("SWITCHED SOURCE / "+type.toUpperCase(),true)};
 $("outfit").onchange=e=>{outfit=e.target.value;buildTree();paint()};
 $("library").onchange=e=>{if(e.target.value)loadRecord(e.target.value);else newCharacter()};
 $("newChar").onclick=newCharacter;
 $("saveChar").onclick=$("publish").onclick=saveGame;
 $("exportJson").onclick=projectExport;
 $("exportPng").onclick=()=>{commitUnkeyedPose();return bake(frames,clip).toBlob(b=>b&&download("mahluk_2_"+clip+"_4dir.png",b),"image/png")};
 $("importJson").onchange=e=>{importProject(e.target.files?.[0]);e.target.value=""};
 $("hideSelected").onclick=()=>{state.parts[selected].visible=!state.parts[selected].visible;buildTree()};
 $("resetSelected").onclick=()=>{state.parts[selected]={...R.neutral().parts[selected]};pick(selected);setStatus("RESET "+selected)};
 for(const [key,id] of [["x","posX"],["y","posY"],["z","posZ"],["angle","angle"],["scale","scale"]]){
  $(id).oninput=e=>{let value=Number(e.target.value);if(Number.isFinite(value)){
   state.parts[selected][key]=key==="scale"?clamp(value,.3,3):key==="angle"?clamp(value,-180,180):key==="z"?clamp(value,-10,10):clamp(value,-40,40);paint();
  }};
 }
 $("visible").onchange=e=>{state.parts[selected].visible=e.target.checked;buildTree()};
 $("emotionAsset").onchange=e=>{
  if(!getEmotionAsset(e.target.value))return;
  emotionAssetId=e.target.value;
  if(frame>0||emotionKeys.length)emotionKeys=E.insert(emotionKeys,frame,emotionAssetId);
  const asset=getEmotionAsset(emotionAssetId);
  if(asset?.frames>frames){frames=asset.frames;$("frameCount").value=frames}
  updateEmotionStatus();makeTimeline();paint();
  setStatus("EMOTION PLANE ASSET / "+(asset?.native||asset?.name||"UNKNOWN"),true);
 };
 $("glassesAsset").onchange=e=>{glassesAssetId=e.target.value;paint();setStatus("GLASSES PLANE / "+glassesAssetId,true)};
 $("emotionImport").onchange=e=>{importPlanePng(e.target.files?.[0],"emotion");e.target.value=""};
 $("glassesImport").onchange=e=>{importPlanePng(e.target.files?.[0],"glasses");e.target.value=""};
 $("emotionKey").onclick=setEmotionKey;
 $("emotionUnkey").onclick=removeEmotionKey;
 $("frameCount").onchange=e=>{frames=Math.round(clamp(e.target.value,1,48));frame=0;makeTimeline();paint()};
 $("fps").onchange=e=>{fps=Math.round(clamp(e.target.value,1,30));e.target.value=fps};
 $("clip").onchange=e=>{clip=e.target.value;setStatus("AUTHORING CLIP "+clip.toUpperCase()+" / SAVE TO PUBLISH")};
 $("setKey").onclick=setKey;$("deleteKey").onclick=removeKey;
 $("play").onclick=()=>{playing=!playing;playSince=performance.now();$("play").textContent=playing?"Ⅱ PAUSE":"▶ PLAY"};
 $("gridPreview").onchange=e=>$("game").parentElement.classList.toggle("flat",e.target.checked);
 for(const mode of ["move","rotate","scale"])$("tool"+mode[0].toUpperCase()+mode.slice(1)).onclick=()=>{transformMode=mode;axisButtons();paint()};
 $("viewIso").onclick=()=>{view="iso";axisButtons();paint()};
 $("viewFront").onclick=()=>{view="front";axisButtons();paint()};
 $("viewHome").onclick=()=>{camera={x:0,y:0};zoom=3.25;paint()};
 for(const x of ["x","y","z"])$("axis"+x.toUpperCase()).onclick=()=>{axis=x;axisButtons();paint()};
 for(const el of document.querySelectorAll("[data-dir]"))el.onclick=()=>{
  direction=el.dataset.dir;document.querySelectorAll("[data-dir]").forEach(b=>b.classList.toggle("active",b===el));paint();
 };
 function mouse(e){
  const r=studio.getBoundingClientRect(),px=studio.width/r.width,py=studio.height/r.height;
  return {x:(e.clientX-r.left)*px,y:(e.clientY-r.top)*py};
 }
 studio.addEventListener("pointerdown",e=>{
  if(!state||!manifest)return;
  const p=mouse(e),pan=e.button===1||e.altKey;
  const origin=projectBone(studio.width,studio.height,zoom*Math.min(2,devicePixelRatio||1),selected);
  const handle=!pan&&lastHandles.find(h=>transformMode==="rotate"?
    Math.abs(Math.hypot(p.x-origin.x,p.y-origin.y)-h.radius)<16:
    Math.hypot(h.end.x-p.x,h.end.y-p.y)<21);
  if(handle&&transformMode==="move")axis=handle.id;
  axisButtons();
  drag={pointer:e.pointerId,start:p,pos:clone(state.parts[selected]),cam:{...camera},
   mode:pan?"pan":handle?transformMode:"none",axis,origin,
   startAngle:origin?Math.atan2(p.y-origin.y,p.x-origin.x):0};
  if(drag.mode!=="none"){studio.setPointerCapture(e.pointerId);e.preventDefault()}
 });
 studio.addEventListener("pointermove",e=>{
  if(!drag||drag.pointer!==e.pointerId)return;
  if(drag.mode==="none")return;
  const p=mouse(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y,scale=zoom*Math.min(2,devicePixelRatio||1);
  if(drag.mode==="pan"){camera.x=drag.cam.x+dx;camera.y=drag.cam.y+dy}
  else if(drag.mode==="rotate"){
   const theta=Math.atan2(p.y-drag.origin.y,p.x-drag.origin.x);
   let delta=(theta-drag.startAngle)*180/Math.PI;
   if(delta>180)delta-=360;if(delta< -180)delta+=360;
   let deg=clamp(drag.pos.angle+delta,-180,180);
   if(e.shiftKey)deg=Math.round(deg/15)*15;
   state.parts[selected].angle=deg;
  }
  else if(drag.mode==="scale")state.parts[selected].scale=clamp(drag.pos.scale+dx/(scale*24),.3,3);
  else if(drag.axis==="x")state.parts[selected].x=clamp(drag.pos.x+dx/scale,-40,40);
  else if(drag.axis==="y")state.parts[selected].y=clamp(drag.pos.y+dy/scale,-40,40);
  else if(drag.axis==="z")state.parts[selected].z=clamp(drag.pos.z-dx/(scale*.6),-10,10);
  for(const [k,id] of [["x","posX"],["y","posY"],["z","posZ"],["angle","angle"],["scale","scale"]])$(id).value=Number(state.parts[selected][k].toFixed(1));
  paint();
 });
 for(const evt of ["pointerup","pointercancel"])studio.addEventListener(evt,e=>{if(drag?.pointer===e.pointerId){drag=null;try{studio.releasePointerCapture(e.pointerId)}catch{}}});
 studio.addEventListener("wheel",e=>{e.preventDefault();zoom=clamp(zoom+(e.deltaY<0?.3:-.3),1.5,6);paint()},{passive:false});
 studio.addEventListener("contextmenu",e=>e.preventDefault());
 window.addEventListener("resize",paint);
 window.addEventListener("keydown",e=>{
  if(["INPUT","SELECT","TEXTAREA"].includes(document.activeElement?.tagName))return;
  if(e.key==="1"||e.key==="2"||e.key==="3"){axis=["x","y","z"][Number(e.key)-1];axisButtons();paint()}
  if(["w","e","r"].includes(e.key.toLowerCase())){transformMode={w:"move",e:"rotate",r:"scale"}[e.key.toLowerCase()];axisButtons();paint()}
  if(e.key==="k"||e.key==="K")setKey();
  if(e.key==="Delete")removeKey();
 });
 let last=performance.now(),elapsed=0;
 function tick(now){
  if(playing&&frames>1){
   elapsed+=Math.max(0,Math.min(80,now-last));
   const period=1000/fps;
   if(elapsed>=period){elapsed%=period;showTimeline((frame+1)%frames)}
  }
  last=now;requestAnimationFrame(tick);
 }
 requestAnimationFrame(tick);
}
async function mount(){
 if(!R){setStatus("RIG ENGINE NOT FOUND",false);return}
 setupEvents();
 try{
  const resp=await fetch("../media/original-rig/manifest.json",{cache:"no-store"});
  if(!resp.ok)throw Error("Published V6B manifest HTTP "+resp.status);
  const m=await resp.json();
  if(m.format!=="mahluk-original-source-rig-v1")throw Error("Invalid authored V6B manifest");
  await loadImagesFromManifest(m);
  loadImportedAssets();
  const draft=safeGet(DRAFT,null);
  if(draft?.format==="mahluk-2-project-v1"){
   // Drafts are intentionally NOT auto-loaded as game-ready characters.
   setStatus("SOURCE READY · SELECT CHARACTER OR CREATE NEW",true);
  }
  updateLibrary();applyState();setStatus("V6B TRANSPARENT PLANES READY · SAVE TO SYNC",true);
 }catch(error){sourceError=String(error.message||error);setStatus("LOAD FAILED · "+sourceError,false)}
}
document.addEventListener("DOMContentLoaded",mount);
})(window);
