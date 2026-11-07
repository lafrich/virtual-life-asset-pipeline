/* True sprite-frame Animation Studio. Six articulated cutout pixel layers with
   explicit anchor transforms, baked to four-direction PNG frames; no skeletal rig.
   Uses native V6P blank-face, hairless standard-outfit Male/Female source templates. */
(function(root){"use strict";
const $=id=>document.getElementById(id),V=root.V6PCompositor,Store=root.V6PClipStore,A=root.V6PActivityContract;
if(!V||!Store||!A)return;
const KEY="vl-mahluk-animation-anchor-poses-v1",PARTS=["leg_l","leg_r","torso","arm_l","arm_r","head"],DIRS=["se","sw","ne","nw"];
const ANCHORS={head:[32,35],torso:[32,60],arm_l:[20,54],arm_r:[44,54],leg_l:[25,84],leg_r:[39,84]};
const cv=$("stage"),screen=cv.getContext("2d"),state={id:"",name:"",gender:"male",template:"idle",frames:[{key:"f0",ms:140},{key:"f1",ms:140}],loop:true,
 dir:"se",frame:0,part:"head",tracks:{},sheet:null,playing:false,timer:0,images:new Map(),drag:null,revision:0,previewFrame:0,screen:"home"};
screen.imageSmoothingEnabled=false;
function say(msg,err=false){$("status").textContent=msg;$("status").style.background=err?"#f8d7d5":"#dce9f8"}
function deep(v){return JSON.parse(JSON.stringify(v))}
function db(){try{const o=JSON.parse(localStorage.getItem(KEY)||"{}");return o&&typeof o==="object"&&!Array.isArray(o)?o:{}}catch{return {}}}
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
function setSource(){const ch=V.norm({...V.DEF,body:state.gender,gender:state.gender,hair:"none",hairColor:"black",top:"tee",pants:"trousers",shoes:"shoes",face:"blank",glasses:"none",facial:"none"});return V.sheet(ch,null,"")}
async function loadSource(){const rev=++state.revision;state.sheet=await setSource();if(rev===state.revision){state.images.clear();render()}}
function action(){return V.ROWS[state.template]!=null?state.template:"idle"}
function sourceCell(dir=state.dir,frame=state.frame){
 const key=dir+"/"+frame+"/"+state.template+"/"+state.gender;
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
 stop();state.screen=screen;
 $("animation-home").hidden=screen!=="home";$("animation-setup").hidden=screen!=="setup";
 $("animation-workspace").hidden=screen!=="editor";
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
 const rows=Store.list();const drafts=db();
 for(const clip of rows){
  const b=document.createElement("button");b.classList.toggle("active",state.id===clip.id);
  const title=document.createElement("strong"),info=document.createElement("small");
  title.textContent=clip.name;info.textContent=clip.manifest.frames.length+" FRAMES · "+(drafts[clip.id]?"EDITABLE ANCHOR":"PIXEL CLIP")+
   (clip.id==="clip_pushup"?" · STOCK":"");
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
 if(!meta){
  state.id=id;state.name=clip.name;
  say(clip.name+" uses a pixel clip sheet. Select PIXEL EDITOR; existing stock frames are never overwritten here.");
  show("editor");return;
 }
 setMeta(meta);show("editor");await loadSource();
 say("LOADED "+meta.name+" · editable all 4 directions / "+state.frames.length+" frames");
}
async function create(from){
 stop();
 const name=String(from?(state.name+" Copy"):$("setup-name").value).trim().slice(0,80);
 if(!name)throw Error("Enter an activity name before editing");
 const gender=from?state.gender:$("gender").value,template=from?state.template:$("template").value;
 if(!["male","female"].includes(gender)||!["idle","sit","lie","sleep"].includes(template))
  throw Error("Select a supported Male/Female base and starting pose");
 const initial=from?deep(state.frames):Array.from({length:Math.min(6,V.FRAMES[template]||4)},(_,i)=>({key:"f"+i,ms:140}));
 const clip=Store.create({name,frames:initial,requiredParts:["base/body"]});
 const row={id:clip.id,name,gender,template,frames:deep(initial),loop:from?state.loop:true,tracks:from?deep(state.tracks):{}};
 const data=db();data[row.id]=row;localStorage.setItem(KEY,JSON.stringify(data));
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
 localStorage.setItem(KEY,JSON.stringify(all));
 try{root.VLHub?.publish("animations",{source:"mahluk-animation-studio",id:state.id,status:"draft"})}catch{}
 let message="SAVED LOCAL · "+state.name+" · "+state.frames.length+" frames × 4 directions";
 if(withDrive){
  try{
   if(root.parent===root||!root.parent?.VLMahlukWorkspace?.syncDrive)throw Error("Open from MAHLUK.EXE and connect Drive");
   const result=await root.parent.VLMahlukWorkspace.syncDrive();
   message+=" · DRIVE VERIFIED · "+(result.name||"Mahluk backup");
  }catch(e){message+=" · DRIVE NOT SYNCED: "+e.message}
 }else message+=" · Use SAVE & SYNC to back up to Drive";
 home(message);
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
$("reference").onclick=()=>root.open("./mahluk-motion-library.html","_blank","noopener");
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
window.addEventListener("pagehide",stop);
show("home");updateProperty();loadSource().catch(e=>say(e.message,true));
})(window);