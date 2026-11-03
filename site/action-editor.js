/* Mahluk Hidup · action-frame paint and real Bangun Ruang interior simulation.
 * 64×112 source artwork, real furniture geometry/anchors and local-only edits.
 * No city, building, avatar, or canonical sprite files are overwritten.
 */
(()=>{
"use strict";
const $=id=>document.getElementById(id),A=window.VLActionFrames,
 MODEL=window.VLBuildingInterior,ISO=window.VLInteriorIso;
const DIR=["se","sw","ne","nw"],BUILD_KEY="virtual-life-bangun-ruang-v1";
const BASE=new URL("/virtual-life-asset-pipeline/",location.origin);
const deepLink=new URLSearchParams(location.search);
let deepFloor=Math.max(1,Math.min(12,Number(deepLink.get("floor"))||1));
let deepFixture=deepLink.get("fixture")||"";
let pendingContext=null;
const px=$("pixel"),pc=px.getContext("2d",{willReadFrequently:true});
const sim=$("simulation"),sc=sim.getContext("2d");
pc.imageSmoothingEnabled=false;sc.imageSmoothingEnabled=false;
const scratch=document.createElement("canvas");scratch.width=64;scratch.height=112;
const sourceCtx=scratch.getContext("2d",{willReadFrequently:true});
const background=document.createElement("canvas");
const images=new Map();
const state={catalog:[],buildings:[],actor:"ichsan",action:"toilet",direction:"sw",frame:0,
 previewFrame:0,playing:true,lastTick:0,tool:"pencil",down:false,lastPoint:null,
 undo:[],source:null,sourceReady:false,sourceNote:"",offset:{x:0,y:0},
 scene:null,prop:null,bgKey:"",bgReady:false,loadingId:0,buildId:"demo",floor:0};
const status=s=>$("status").textContent=s;
const notice=s=>$("sim-status").textContent=s;
const escapeId=id=>/^[a-z0-9_-]{1,90}$/.test(id||"");
const safeJSON=(key,def)=>{try{return JSON.parse(localStorage.getItem(key))??def;}catch{return def;}};
const opt=(value,text)=>{const o=document.createElement("option");o.value=value;o.textContent=text;return o;};
const url=path=>new URL(path,BASE).href;
const isSheet=path=>typeof path==="string"&&/^media\/[a-z0-9_.-]+\.png$/i.test(path);
const needed={toilet:["wc"],bathe:["shower","bathtub"],sleep:["bed"]};
function pic(path){
 if(!path)return null;
 if(!images.has(path)){
  const im=new Image();
  const entry={im,ready:false,failed:false};
  im.onload=()=>{entry.ready=im.naturalWidth>0;render();};
  im.onerror=()=>{entry.failed=true;render();};
  images.set(path,entry);im.src=path;
 }
 return images.get(path);
}
function actor(){
 return state.catalog.find(x=>x.id===state.actor);
}
function actionSource(){
 const ch=actor(),motions=(ch?.motions||[]).filter(m=>m?.available===true);
 const preferred={
  toilet:["sit","sit_type","toilet"],
  bathe:["swim","bathe","idle"],
  sleep:["sleep","sleep_seat","lie","nap_stand"]
 }[state.action]||["idle"];
 let motion=preferred.map(id=>motions.find(m=>m.id===id)).find(Boolean);
 const authored=!!motion&&!(state.action==="bathe"&&motion.id==="idle");
 if(!motion)motion=motions.find(m=>m.id==="idle")||motions.find(m=>m.id==="walk")||null;
 if(!ch||!isSheet(ch.sheet))return null;
 const separate=isSheet(motion?.sheet);
 const sheet=separate?motion.sheet:ch.sheet;
 const frames=Math.max(1,Math.min(6,Number(motion?.frames)||4));
 return {sheet:url(sheet),row:separate?0:Number(motion?.row)||0,
  frames,sourceFrames:frames,authored,mode:motion?.id||"idle",
  note:authored?"MOTION: "+motion.id.toUpperCase()+" / NATIVE CHARACTER FRAMES":
   "NO DEDICATED "+state.action.toUpperCase()+" RIG · EDITABLE "+(motion?.id||"IDLE").toUpperCase()+" BASE"};
}
function setAction(next){
 if(!A.actions.includes(next))return;
 state.action=next;$("action").value=next;
 state.source=actionSource();state.frame=state.previewFrame=0;state.lastTick=0;
 $("frame").max=String((state.source?.frames||4)-1);
 $("frame").value="0";
 state.offset=A.offset(state.actor,state.action);syncOffset();
 const keep=state.buildId;readBuildings(keep);
 updateProp();
 loadFrame();
}
function updateActors(){
 const sel=$("actor"),previous=state.actor;sel.replaceChildren();
 for(const ch of state.catalog.filter(x=>escapeId(x.id)&&isSheet(x.sheet)))
  sel.append(opt(ch.id,ch.name||ch.id));
 if(state.catalog.some(x=>x.id===previous))sel.value=previous;
 else if(state.catalog.some(x=>x.id==="ichsan"))sel.value="ichsan";
 else if(sel.options.length)sel.selectedIndex=0;
 state.actor=sel.value||"ichsan";
}
function demoScene(){
 const scene=MODEL.create({w:8,d:7},"home");
 scene.theme="warm";
 MODEL.add(scene,"bed",1,1);
 MODEL.add(scene,"shower",5,1);
 MODEL.add(scene,"wc",5,4);
 return scene;
}
function readBuildings(prefer){
 const rows=safeJSON(BUILD_KEY,[]);
 state.buildings=Array.isArray(rows)?rows.filter(x=>escapeId(x?.id)&&x?.interior?.format==="virtual-life-interiors-v1"&&
  Array.isArray(x.interior.floors)&&x.interior.floors.length>0).slice(0,75):[];
 const chooser=$("building");chooser.replaceChildren();
 chooser.append(opt("demo","SIMULATION ROOM · 3 ACTIONS"));
 for(const b of state.buildings)chooser.append(opt(b.id,b.name||b.id));
 chooser.value=[...chooser.options].some(x=>x.value===prefer)?prefer:"demo";
 state.buildId=chooser.value;
 updateFloors();
}
function updateFloors(){
 const chosen=state.buildings.find(x=>x.id===state.buildId),floor=$("floor");
 const previous=deepFloor||Number(floor.value)||1;deepFloor=0;floor.replaceChildren();
 if(chosen){
  chosen.interior.floors.forEach((x,i)=>floor.append(opt(String(i+1),i===0?"GROUND FLOOR":"FLOOR "+(i+1))));
  floor.value=String(Math.min(chosen.interior.floors.length,previous));
 }else floor.append(opt("1","DEMO / GROUND FLOOR"));
 state.floor=Number(floor.value)-1;
 updateScene();
}
function updateScene(){
 const b=state.buildings.find(x=>x.id===state.buildId);
 if(b){
  const floor=b.interior.floors[state.floor];
  state.scene=MODEL.normalize(floor,b.config);
 }else state.scene=demoScene();
 state.bgReady=false;state.bgKey="";
 updateProp();
}
function updateProp(){
 const s=state.scene,sel=$("furniture"),before=deepFixture||sel.value;
 deepFixture="";
 sel.replaceChildren();
 const valid=(s?.items||[]).filter(p=>needed[state.action]?.includes(p.assetId));
 for(const p of valid)sel.append(opt(p.id,(MODEL.types[p.assetId]?.label||p.assetId)+" / "+p.c+","+p.r+" / "+p.rotation+"°"));
 if([...sel.options].some(x=>x.value===before))sel.value=before;
 else if(sel.options.length)sel.selectedIndex=0;
 else sel.append(opt("","NO MATCHING FURNITURE ON THIS FLOOR"));
 state.prop=(s?.items||[]).find(x=>x.id===sel.value)||null;
 state.bgReady=false;
 if(state.prop){
  const anchor=ISO.actionAnchor(state.prop);
  if(anchor&&DIR.includes(anchor.direction)){state.direction=anchor.direction;$("direction").value=state.direction;}
 }
 $("preview-tag").textContent=state.buildId==="demo"?"SOURCE: BANGUN RUANG / DEMO":
  "SOURCE: SAVED BANGUN RUANG";
 render();
}
function syncOffset(){
 $("offset-x").value=String(state.offset.x);$("offset-y").value=String(state.offset.y);
 $("offset-x-label").textContent=state.offset.x+" px";
 $("offset-y-label").textContent=state.offset.y+" px";
}
function sourceRect(index,dir){
 const spec=state.source;
 if(!spec)return null;
 const entry=pic(spec.sheet);
 if(!entry?.ready)return null;
 const im=entry.im,d=DIR.indexOf(dir);
 const f=index%spec.sourceFrames,row=spec.row+d;
 if(f*64+64>im.naturalWidth||(row+1)*112>im.naturalHeight)return null;
 return [im,f*64,row*112,64,112];
}
function originalInto(ctx,index,dir){
 ctx.clearRect(0,0,64,112);
 const src=sourceRect(index,dir);
 if(src){ctx.drawImage(...src,0,0,64,112);return true;}
 return false;
}
function editedFrame(index,dir){
 if(index===state.frame&&dir===state.direction&&state.sourceReady)return px;
 const saved=A.get(state.actor,state.action,dir,index);
 if(saved){
  const entry=pic(saved);
  if(entry?.ready)return entry.im;
 }
 return null;
}
function loadFrame(){
 const ticket=++state.loadingId;
 state.undo=[];state.sourceReady=false;
 const count=state.source?.frames||4;
 state.frame=Math.min(state.frame,count-1);
 $("frame").value=String(state.frame);
 $("frame-label").textContent=(state.frame+1)+" / "+count;
 $("edit-label").textContent=state.direction.toUpperCase()+" / F"+(state.frame+1);
 $("motion-source").textContent=state.source?.note||"CHARACTER SPRITES UNAVAILABLE";
 const override=A.get(state.actor,state.action,state.direction,state.frame);
 function finish(){
  if(ticket!==state.loadingId)return;
  state.sourceReady=true;status(override?"EDITING SAVED ACTION FRAME":"EDITING ORIGINAL MOTION COPY");
  render();
 }
 pc.clearRect(0,0,64,112);
 if(override){
  const img=pic(override);
  if(img?.ready){pc.drawImage(img.im,0,0,64,112);finish();}
  else if(img?.failed)status("Saved frame could not be decoded");
  else if(img?.im)img.im.addEventListener("load",()=>{
   if(ticket!==state.loadingId)return;
   pc.clearRect(0,0,64,112);pc.drawImage(img.im,0,0,64,112);finish();
  },{once:true});
  return;
 }
 if(originalInto(pc,state.frame,state.direction)){finish();return;}
 const src=state.source&&pic(state.source.sheet);
 if(src?.im)src.im.addEventListener("load",()=>{
  if(ticket!==state.loadingId)return;
  originalInto(pc,state.frame,state.direction);finish();
 },{once:true});
 else if(!src){finish();}
}
function refreshBackground(){
 if(!state.scene||!ISO)return null;
 const geometry=ISO.bounds(state.scene);
 const key=[state.buildId,state.floor,state.prop?.id||"",JSON.stringify(state.scene)].join("|");
 if(!state.bgReady||state.bgKey!==key){
  ISO.draw(background,state.scene,{grid:false,selectedId:state.prop?.id});
  state.bgKey=key;state.bgReady=true;
 }
 if(sim.width!==background.width)sim.width=background.width;
 if(sim.height!==background.height)sim.height=background.height;
 sc.imageSmoothingEnabled=false;
 sc.clearRect(0,0,sim.width,sim.height);
 sc.drawImage(background,0,0);
 return geometry;
}
function render(){
 if(!MODEL||!ISO||!A)return;
 const geo=refreshBackground();if(!geo)return;
 $("play-frame").textContent=String(state.previewFrame+1).padStart(2,"0")+" / "+
  String(state.source?.frames||4).padStart(2,"0");
 if(!state.prop){
  notice("No "+state.action.toUpperCase()+" furniture on this floor. Add it in Bangun Ruang and press SYNC.");
  return;
 }
 const p=state.prop,anchor=ISO.actionAnchor(p);
 const local=p.assetId==="bathtub"?[1,.5]:[.5,.55];
 const tile=anchor||ISO.fixturePoint(p,...local);
 const z=anchor?.z??(p.assetId==="bathtub"?20:5);
 const [footX,footY]=ISO.point(geo,tile.c,tile.r,z);
 const dir=state.direction,frame=state.previewFrame;
 const shift=state.offset;
 const x=Math.round(footX-32+shift.x),y=Math.round(footY-100+(anchor?.pixelOffsetY||0)+shift.y);
 let image=editedFrame(frame,dir);
 if(!image){
  const src=sourceRect(frame,dir);
  if(src)sc.drawImage(...src,x,y,64,112);
  else {
   sc.fillStyle="#577c9c";sc.fillRect(x+22,y+45,20,40);
   sc.fillStyle="#d8b49b";sc.fillRect(x+23,y+23,18,23);
  }
 }else sc.drawImage(image,x,y,64,112);
 if(anchor)ISO.drawSeatForeground(sc,geo,p);
 const source=state.source;
 notice((MODEL.types[p.assetId]?.label||p.assetId)+" · "+p.c+","+p.r+" · ROT "+p.rotation+"° · "+
  (source?.authored?"NATIVE ACTION / ":"EDITABLE DRAFT / ")+"FOOT PIVOT 32,100");
}
function remember(){
 state.undo.push(pc.getImageData(0,0,64,112));
 if(state.undo.length>24)state.undo.shift();
}
function tool(name){
 state.tool=name;
 for(const id of ["pencil","erase","pick"])$(id).classList.toggle("active",name===id);
}
function coord(e){
 const b=px.getBoundingClientRect();
 return [Math.floor((e.clientX-b.left)*64/b.width),Math.floor((e.clientY-b.top)*112/b.height)];
}
function paint(x,y){
 if(x<0||x>=64||y<0||y>=112)return;
 if(state.tool==="pick"){
  const v=pc.getImageData(x,y,1,1).data;
  if(v[3])$("color").value="#"+Array.from(v.slice(0,3)).map(v=>v.toString(16).padStart(2,"0")).join("");
  tool("pencil");return;
 }
 const b=Number($("brush").value)||1,h=Math.floor(b/2);
 if(state.tool==="erase")pc.clearRect(x-h,y-h,b,b);
 else {pc.fillStyle=$("color").value;pc.fillRect(x-h,y-h,b,b);}
}
function stroke(next){
 const prev=state.lastPoint||next,[x1,y1]=next;
 let [x0,y0]=prev,dx=Math.abs(x1-x0),sx=x0<x1?1:-1;
 let dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;
 for(let n=0;n<250;n++){
  paint(x0,y0);if(x0===x1&&y0===y1)break;
  const v=2*err;if(v>=dy){err+=dy;x0+=sx;}if(v<=dx){err+=dx;y0+=sy;}
 }
 state.lastPoint=next;render();
}
function save(){
 if(!state.sourceReady)return;
 try{A.set(state.actor,state.action,state.direction,state.frame,px.toDataURL("image/png"));
  status("FRAME SAVED · SYNCED WITH BANGUN RUANG");render();}
 catch(e){status("SAVE FAILED: "+e.message);}
}
function download(){
 const link=document.createElement("a");
 link.href=px.toDataURL("image/png");
 link.download=state.actor+"_"+state.action+"_"+state.direction+"_f"+state.frame+".png";
 document.body.append(link);link.click();link.remove();
}
async function loadCatalog(){
 try{
  const res=await fetch(new URL("catalog.json",BASE),{cache:"no-store"});
  if(!res.ok)throw Error("Mahluk Hidup catalog HTTP "+res.status);
  const cat=await res.json();
  state.catalog=(cat.characters||[]).filter(x=>escapeId(x?.id)&&isSheet(x.sheet));
  const saved=safeJSON("virtual-life-character-storage-v1",[]);
  if(Array.isArray(saved))for(const row of saved){
   const parent=state.catalog.find(x=>x.id===row?.base);
   if(escapeId(row?.id)&&parent&&!state.catalog.some(x=>x.id===row.id))
    state.catalog.push({...parent,id:row.id,name:row.name||row.id});
  }
  const params=new URLSearchParams(location.search);
  const requested=params.get("actor");
  if(escapeId(requested)&&state.catalog.some(x=>x.id===requested))state.actor=requested;
  const requestedAction=params.get("action");
  if(A.actions.includes(requestedAction))state.action=requestedAction;
  updateActors();
  state.source=actionSource();setAction(state.action);
  if(pendingContext){const request=pendingContext;pendingContext=null;applyParentContext(request);}
 }catch(e){status("COULD NOT LOAD PLAYER CATALOG: "+e.message);notice("Check Mahluk Hidup Pages build.");}
}
/* Parent XP workspace can re-target the iframe without reloading it.
 * Preserve any unsaved current-frame edits if actor/action/fixture is unchanged. */
function applyParentContext(context){
 if(!context||typeof context!=="object")return;
 if(!state.catalog.length){pendingContext=context;return;}
 const requestedActor=typeof context.actor==="string"&&
  state.catalog.some(ch=>ch.id===context.actor)?context.actor:null;
 const requestedAction=A.actions.includes(context.action)?context.action:null;
 const nextActor=requestedActor||state.actor;
 const nextAction=requestedAction||state.action;
 const changesActor=nextActor!==state.actor,changesAction=nextAction!==state.action;
 if(changesActor){state.actor=nextActor;$("actor").value=nextActor;}
 if(changesActor||changesAction){setAction(nextAction);}
 const building=typeof context.building==="string"&&context.building||"";
 const floor=Math.max(1,Math.min(12,Number(context.floor)||1));
 const fixture=typeof context.fixture==="string"?context.fixture:"";
 if(building&&building!==state.buildId){
   deepFloor=floor;deepFixture=fixture;
   readBuildings(building);
 }else if(context.floor&&Number($("floor").value)!==floor){
   $("floor").value=String(floor);
   state.floor=Math.max(0,Number($("floor").value)-1);
   deepFixture=fixture;updateScene();
 }else if(fixture&&fixture!==state.prop?.id){
   const select=$("furniture");
   if([...select.options].some(option=>option.value===fixture)){
     select.value=fixture;state.prop=state.scene?.items?.find(item=>item.id===fixture)||null;
     state.bgReady=false;render();
   }
 }
}
window.addEventListener("message",event=>{
 if(event.origin!==location.origin||event.source!==window.parent)return;
 if(event.data?.type==="mahluk-action-context")applyParentContext(event.data.context);
});
if(!A||!MODEL||!ISO){status("ACTION EDITOR MODULE MISSING");notice("Bangun Ruang drawing modules not loaded.");return;}
$("actor").onchange=()=>{state.actor=$("actor").value;setAction(state.action);};
$("action").onchange=()=>setAction($("action").value);
$("direction").onchange=()=>{state.direction=$("direction").value;loadFrame();render();};
$("building").onchange=()=>{state.buildId=$("building").value;updateFloors();};
$("floor").onchange=()=>{state.floor=Math.max(0,Number($("floor").value)-1);updateScene();};
$("furniture").onchange=()=>{state.prop=state.scene?.items?.find(x=>x.id===$("furniture").value)||null;state.bgReady=false;render();};
$("sync").onclick=()=>{readBuildings(state.buildId);status("RELOADED LATEST BANGUN RUANG SAVED DATA");};
$("frame").oninput=()=>{state.frame=Number($("frame").value);loadFrame();};
$("pencil").onclick=()=>tool("pencil");$("erase").onclick=()=>tool("erase");$("pick").onclick=()=>tool("pick");
$("save").onclick=save;
$("undo").onclick=()=>{const prior=state.undo.pop();if(prior){pc.putImageData(prior,0,0);render();}};
$("reset-frame").onclick=()=>{if(!state.sourceReady)return;remember();originalInto(pc,state.frame,state.direction);render();status("SOURCE FRAME RESTORED IN EDITOR · PRESS SAVE TO APPLY");};
$("clear").onclick=()=>{if(!state.sourceReady)return;
 A.remove(state.actor,state.action,state.direction,state.frame);loadFrame();status("OVERRIDE REMOVED / SOURCE RESTORED");};
$("download").onclick=download;
px.addEventListener("pointerdown",e=>{
 if(!state.sourceReady||e.button!==0)return;
 e.preventDefault();px.setPointerCapture(e.pointerId);
 if(state.tool!=="pick")remember();
 state.down=true;state.lastPoint=null;stroke(coord(e));
});
px.addEventListener("pointermove",e=>{if(state.down){e.preventDefault();stroke(coord(e));}});
for(const name of ["pointerup","pointercancel","lostpointercapture"])
 px.addEventListener(name,()=>{state.down=false;state.lastPoint=null;});
for(const key of ["x","y"]){
 $("offset-"+key).oninput=()=>{
  state.offset[key]=Number($("offset-"+key).value);
  syncOffset();render();
 };
 $("offset-"+key).onchange=()=>{
  A.setOffset(state.actor,state.action,state.offset.x,state.offset.y);
  status("ACTION ANCHOR OFFSET SAVED / SYNCED TO BANGUN RUANG");
 };
}
$("reset-offset").onclick=()=>{
 state.offset={x:0,y:0};syncOffset();A.setOffset(state.actor,state.action,0,0);render();
};
function play(v){state.playing=v;$("play").textContent=v?"Ⅱ PAUSE":"▶ PLAY";state.lastTick=0;}
$("play").onclick=()=>play(!state.playing);
$("prev").onclick=()=>{play(false);state.previewFrame=(state.previewFrame+(state.source?.frames||4)-1)%(state.source?.frames||4);render();};
$("next").onclick=()=>{play(false);state.previewFrame=(state.previewFrame+1)%(state.source?.frames||4);render();};
$("restart").onclick=()=>{state.previewFrame=0;play(true);render();};
function tick(t){
 if(state.playing&&state.source&&t-state.lastTick>=210){
  state.previewFrame=(state.previewFrame+1)%state.source.frames;state.lastTick=t;render();
 }
 requestAnimationFrame(tick);
}
window.addEventListener("storage",e=>{
 if(e.key===BUILD_KEY){readBuildings(state.buildId);status("BANGUN RUANG SCENE SYNCED");}
 if(e.key===A.key){A.invalidate();state.offset=A.offset(state.actor,state.action);syncOffset();loadFrame();}
});
window.addEventListener("focus",()=>{
 readBuildings(state.buildId);A.invalidate();state.offset=A.offset(state.actor,state.action);syncOffset();render();
});
requestAnimationFrame(tick);
readBuildings(deepLink.get("building")||"demo");
loadCatalog();
})();
