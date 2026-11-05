/* Mahluk Hidup · action-frame paint and real Bangun Ruang interior simulation.
 * 64×112 source artwork, real furniture geometry/anchors and local-only edits.
 * No city, building, avatar, or canonical sprite files are overwritten.
 */
(()=>{
"use strict";
const $=id=>document.getElementById(id),A=window.VLActionFrames,
 MODEL=window.VLBuildingInterior,ISO=window.VLInteriorIso;
 // Editing should not lose all its click handlers if Semesta's optional
 // metadata module is unavailable; only publishing is unavailable.
const P=window.VLActionAppearance||{
 rotation:n=>((Math.round((Number(n)||0)/90)*90)%360+360)%360,
 drawExpression:()=>false,
 drawRotated:(ctx,image,x,y)=>ctx.drawImage(image,x-32,y-100)
};
const T=window.VLActionTemplates||{
 key:"virtual-life-action-templates-v1",get:()=>null,
 coverage:()=>({complete:false,authored:0,directions:Object.fromEntries(
   ["se","sw","ne","nw"].map(d=>[d,[]]))}),
 save:()=>{throw Error("Semesta template module unavailable — reload the page");},
 invalidate:()=>{}
};
const DIR=["se","sw","ne","nw"],BUILD_KEY="virtual-life-bangun-ruang-v1";
const SLEEP=window.VLUniversalSleep,BODY=window.VLUniversalBodyActions;
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
 undo:[],source:null,sourceReady:false,sourceNote:"",offset:{x:0,y:0},dirty:false,
 scene:null,prop:null,bgKey:"",bgReady:false,loadingId:0,buildId:"demo",floor:0};
const status=s=>$("status").textContent=s;
const notice=s=>$("sim-status").textContent=s;
const escapeId=id=>/^[a-z0-9_-]{1,90}$/.test(id||"");
const safeJSON=(key,def)=>{try{return JSON.parse(localStorage.getItem(key))??def;}catch{return def;}};
const opt=(value,text)=>{const o=document.createElement("option");o.value=value;o.textContent=text;return o;};
const url=path=>new URL(path,BASE).href;
const isSheet=path=>typeof path==="string"&&/^media\/[a-z0-9_.-]+\.png$/i.test(path);
const needed={
 toilet:["wc"],bathe:["shower"],bathtub_bathe:["bathtub"],sleep:["bed"],
 toilet_sit:["wc"],pee_stand:["wc"],toilet_paper:["wc"],flush_toilet:["wc"],pee_finish:["wc"],
 shower:["shower","bathtub"],bath:["bathtub","shower"],
 lie_down:["bed"],bed_enter:["bed"],bed_exit:["bed"],get_up:["bed"],
 sleep:["bed"],wake_up:["bed"],nap:["bed"],lie_idle:["bed"],
 wash_hands:["sink"],wash_face:["sink"],brush_teeth:["sink"],dry_hands:["sink"],
 cook_stir:["stove"],cook_fry:["stove"],chop_food:["stove","table"],
 prepare_food:["stove","table"],open_fridge:["fridge"],wash_dishes:["sink"],
 office_type:["desk","office_chair","computer"],office_idle:["desk","office_chair"],
 meeting_listen:["office_chair","chair","desk"],meeting_talk:["office_chair","chair","desk"],
 eat_seated:["chair","sofa","table"],sit_down:["chair","sofa","office_chair"],
 sit_idle:["chair","sofa","office_chair"],stand_up:["chair","sofa","office_chair"]
};
const compatActions=[
 {id:"toilet",label:"TOILET / WC",category:"hygiene",status:"compatibility",priority:"P0",requirements:["wc"],loop:true},
 {id:"bathe",label:"BATHE / SHOWER",category:"hygiene",status:"compatibility",priority:"P0",requirements:["shower"],loop:true}
];
const categories=["basic","movement","posture","objects","food","hygiene","social","office","trading","phone","city","funny","npc","facial","action"];
state.actions=compatActions;state.actionFilter="all";state.actionSearch="";
const actionRecord=()=>state.actions.find(row=>row.id===state.action)||null;
function fixtureRequirements(id){
 if(needed[id])return needed[id];
 const linked=state.actions.find(x=>x.id===id)?.fixture_ids||[];
 if(linked.length)return linked;
 if(/^(cook|prepare_food|wash_vegetables)/.test(id))return ["stove","sink","table"];
 if(/^(clock_|office_|read_document|print_document|file_document|presentation)/.test(id))
  return ["desk","office_chair","computer"];
 if(/^(take_order|accept_payment|give_change|serve_plate|display_goods|cash_register|count_money|open_stall|close_stall|restock)/.test(id))
  return ["table"];
 return [];
}
function renderActionList(){
 const q=state.actionSearch.trim().toLowerCase(),cat=state.actionFilter;
 // Only native motions, saved drafts and ready templates are listed.
 const visible=state.actions.filter(row=>
  row.id==="bathtub_bathe" ||
  Boolean(SLEEP?.resolve(actor(),row.id)) ||
  A.entries(state.actor,row.id).length>0 ||
  Boolean(T.get(state.actor,row.id)?.ready) ||
  Boolean((actor()?.motions||[]).some(m=>m.id===row.id&&m.available===true)));
 const rows=visible.filter(row=>
  (cat==="all"||cat===row.category||(cat==="p0"&&row.priority==="P0")||
    (cat==="edited"&&A.entries(state.actor,row.id).length>0))&&
  [row.label,row.id,row.category,...(row.requirements||[]),...(row.game_ids||[])].join(" ").toLowerCase().includes(q));
 $("player-action-count").textContent=rows.length+" / "+visible.length;
 const list=document.querySelector(".ae-action-list"),fragment=document.createDocumentFragment();
 for(const row of rows){
  const button=document.createElement("button");
  button.type="button";button.className="file-item ae-action-item";
  button.dataset.aeAction=row.id;button.setAttribute("aria-pressed",String(row.id===state.action));
  button.classList.toggle("chosen",row.id===state.action);
  const square=document.createElement("span");square.className="file-preview";
  const token=document.createElement("span");token.className="ae-pixel-icon";
  token.textContent=row.category==="facial"?"FACE":row.category.slice(0,3).toUpperCase();
  square.append(token);
  const label=document.createElement("span");label.className="file-label";
  label.textContent=row.label||row.id.toUpperCase();
  const sub=document.createElement("small");
  const authored=(actor()?.motions||[]).some(m=>m.id===row.id&&m.available);
  const published=T?.get(state.actor,row.id),edited=A.entries(state.actor,row.id).length;
  const universal=Boolean(SLEEP?.resolve(actor(),row.id));
  sub.textContent=universal?"✓ UNIVERSAL BED / V6B":published?.ready?"✓ SEMESTA TEMPLATE":published?"DRAFT TEMPLATE / "+edited:
   edited?edited+" LOCAL FRAMES":authored?"NATIVE RIG":
   row.status==="planned"?"UNAUTHORED / "+(row.priority||"P1"):"SOURCE / REVIEW";
  label.append(sub);button.append(square,label);
  button.addEventListener("click",()=>setAction(row.id));
  fragment.append(button);
 }
 if(!rows.length){const message=document.createElement("p");message.className="ae-list-empty";
  message.textContent=q?"NO MATCHING ACTIONS":"NO SAVED ACTIONS. CREATE ONE BELOW.";fragment.append(message);}
 list.replaceChildren(fragment);
}
function updateActionCoverage(){
 const row=actionRecord(),source=state.source,edited=A.entries(state.actor,state.action).length;
 const max=(source?.frames||4)*DIR.length;
 const template=T?.get(state.actor,state.action);
 $("action-readiness").textContent=SLEEP?.resolve(actor(),state.action)?
  "UNIVERSAL BED SLEEP / NATIVE V6B · PLAYABLE":
  template?.ready?"SEMESTA TEMPLATE · PLAYABLE":
  source?.referencePose?"AUTO PREVIEW / OWN LIE + FOAM":
  source?.authored?"NATIVE / REUSABLE POSE":
  edited?"LOCAL DRAFT · NOT PUBLISHED":"PLANNED / UNRENDERED";
 $("action-coverage").textContent=edited+" / "+max+" FRAMES SAVED LOCALLY";
 const req=(row?.requirements||[]).join(", ")||fixtureRequirements(state.action).join(", ")||"none";
 $("action-requirements").textContent="REQUIRES: "+req.toUpperCase()+
  (row?.priority?" · "+row.priority:"");
}
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
 // Use this actor's original horizontal LIE rig, not rotated idle artwork.
 if(SLEEP?.isSleep(state.action)){
  const pose=SLEEP.resolve(ch,state.action);
  return pose?{sheet:url(pose.sheet),row:pose.row,frames:pose.frames,
   sourceFrames:pose.frames,authored:true,universal:true,mode:"lie",
   note:"UNIVERSAL V6B / TRUE BED LIE / "+state.action.toUpperCase()}:null;
 }
 const preferred={
  toilet:["sit","sit_type","toilet"],toilet_sit:["sit","sit_type"],
  bathtub_bathe:["bathtub_bathe","lie"],
  bathe:["bathe","swim"],shower:["bathe","swim"],bath:["bathe","swim"],
  sleep:["sleep","sleep_seat","lie","nap_stand"],
  nap:["sleep","sleep_seat"],lie_down:["sleep","lie"],wake_up:["sleep","lie"],
  lie_idle:["lie_idle","sleep","lie"],bed_enter:["sleep","lie"],bed_exit:["sleep","lie"],
  office_type:["sit_type"],study_online:["sit_type","sit"],
  eat_seated:["sit"],sit_idle:["sit"],sit_down:["sit"],stand_up:["sit"],
  phone_scroll:["sit_type","idle"],phone_type:["sit_type","idle"],
  talk:["talk"],run:["walk"],slow_walk:["walk"],backstep:["walk"],
  cross_road:["walk"],ride_motor:["sit"],ride_bicycle:["sit"]
 }[state.action]||[state.action];
 let motion=preferred.map(id=>motions.find(m=>m.id===id)).find(Boolean);
 // Reuse genuinely animated native poses, never an idle frame as gameplay.
 const mapped=!!motion&&new Set([
  "toilet","toilet_sit","bathe","bathtub_bathe","shower","bath","sleep","nap","lie_down",
  "wake_up","lie_idle","bed_enter","bed_exit","office_type",
  "eat_seated","sit_idle","sit_down","stand_up","talk"
 ]).has(state.action);
 const authored=!!motion&&(motion.id===state.action||mapped);
 if(!motion)motion=motions.find(m=>m.id==="idle")||motions.find(m=>m.id==="walk")||null;
 if(!ch||!isSheet(ch.sheet))return null;
 const separate=isSheet(motion?.sheet);
 const sheet=separate?motion.sheet:ch.sheet;
 const frames=Math.max(1,Math.min(12,Number(motion?.frames)||4));
 return {sheet:url(sheet),row:separate?0:Number(motion?.row)||0,
  frames:state.action==="bathtub_bathe"?6:frames,sourceFrames:frames,
  depthFront:isSheet(motion?.depth_front)?motion.depth_front:null,
  authored:state.action==="bathtub_bathe"?motion?.id==="bathtub_bathe":authored,
  referencePose:state.action==="bathtub_bathe"&&motion?.id!=="bathtub_bathe",
  mode:motion?.id||"idle",
  note:authored?"MOTION: "+motion.id.toUpperCase()+
   (motion.id===state.action?" / NATIVE CHARACTER FRAMES":" / SHARED NATIVE POSE (NOT UNIQUE ACTION)"):
   "UNRENDERED ACTION: "+state.action.toUpperCase()+" · "+(motion?.id||"IDLE").toUpperCase()+
   " IS AN EDITING REFERENCE, NOT A COMPLETED GAME ANIMATION"};
}
function setAction(next){
 if(!A.actions.includes(next))return;
 state.action=next;$("action").value=next;
 for(const btn of document.querySelectorAll("[data-ae-action]")){
  const chosen=btn.dataset.aeAction===next;
  btn.classList.toggle("chosen",chosen);
  btn.setAttribute("aria-pressed",String(chosen));
 }
 $("ae-canvas-title").textContent=state.actor.toUpperCase()+"_"+next.toUpperCase()+".PNG";
 state.source=actionSource();state.frame=state.previewFrame=0;state.lastTick=0;
 $("frame").max=String((state.source?.frames||4)-1);
 $("frame").value="0";
 state.offset=A.offset(state.actor,state.action);syncOffset();
 const previousTemplate=T?.get(state.actor,state.action);
 $("template-name").value=previousTemplate?.name||state.action.replace(/_/g," ").toUpperCase();
 $("template-speed").value=String(previousTemplate?.frameMs||210);
 $("template-rotation").value=String(P.rotation(previousTemplate?.rotation));
 $("template-loop").checked=previousTemplate?.loop!==false;
 $("object-layer").value=previousTemplate?.objectLayer||"front";
 updateExpressionOptions(previousTemplate?.expression||"neutral");
 updateActionCoverage();updateTemplateStatus();
 const keep=state.buildId;readBuildings(keep);
 updateProp();
 loadFrame();
}
function updateExpressionOptions(selected="neutral"){
 const sel=$("template-expression");
 sel.replaceChildren(opt("neutral","NEUTRAL / ORIGINAL"));
 const rows=actor()?.expressions||[];
 const usable=rows.filter(f=>f&&f.id!=="neutral"&&escapeId(f.id)&&
  (isSheet(f.overlay)||isSheet(f.sheet)));
 for(const face of usable)sel.append(opt(face.id,
  (face.label||face.id).toUpperCase()));
 sel.value=usable.some(f=>f.id===selected)?selected:"neutral";
 $("expression-help").textContent=usable.length?
  usable.length+" CHARACTER-AUTHORED FACES / FRONT VIEWS ONLY":
  "THIS CHARACTER HAS NO EXTRA NATIVE FACE ASSETS";
}
function selectedExpression(){
 const id=$("template-expression").value;
 if(id==="neutral")return null;
 return (actor()?.expressions||[]).find(x=>x.id===id&&(isSheet(x.overlay)||isSheet(x.sheet)))||null;
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
 if(!MODEL||!ISO){
  state.buildings=[];state.scene=null;state.prop=null;state.buildId="demo";
  $("building").replaceChildren(opt("demo","ROOM PREVIEW UNAVAILABLE"));
  $("floor").replaceChildren(opt("1","FLOOR 1"));
  $("furniture").replaceChildren(opt("","NO ROOM LOADED"));
  notice("ROOM PREVIEW UNAVAILABLE · PIXEL EDITOR STILL ACTIVE");
  return;
 }
 const rows=safeJSON(BUILD_KEY,[]);
 state.buildings=Array.isArray(rows)?rows.filter(x=>escapeId(x?.id)&&x?.interior?.format==="virtual-life-interiors-v1"&&
  Array.isArray(x.interior.floors)&&x.interior.floors.length>0).slice(0,75):[];
 const chooser=$("building");chooser.replaceChildren();
 chooser.append(opt("demo","DEMO / PLAYER ACTIVITIES"));
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
 const valid=(s?.items||[]).filter(p=>fixtureRequirements(state.action).includes(p.assetId));
 for(const p of valid)sel.append(opt(p.id,(MODEL.types[p.assetId]?.label||p.assetId)+" / "+p.c+","+p.r+" / "+p.rotation+"°"));
 if([...sel.options].some(x=>x.value===before))sel.value=before;
 else if(sel.options.length)sel.selectedIndex=0;
 else sel.append(opt("",fixtureRequirements(state.action).length?
  "OBJECT UNAVAILABLE / FREE PREVIEW":"FREE ACTION / NO OBJECT"));
 state.prop=(s?.items||[]).find(x=>x.id===sel.value)||null;
 state.bgReady=false;
 if(state.prop){
  const anchor=ISO?.actionAnchor(state.prop);
  if(anchor&&DIR.includes(anchor.direction)){state.direction=anchor.direction;$("direction").value=state.direction;}
 }
 $("preview-tag").textContent=state.buildId==="demo"?"DEMO ROOM":"SAVED ROOM";
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
 const oriented=spec.universal?SLEEP.directionFor(state.action,dir):dir;
 const f=index%spec.sourceFrames,row=spec.row+DIR.indexOf(oriented);
 if(f*64+64>im.naturalWidth||(row+1)*112>im.naturalHeight)return null;
 return [im,f*64,row*112,64,112];
}
function originalInto(ctx,index,dir){
 ctx.clearRect(0,0,64,112);
 const src=sourceRect(index,dir);
 if(src){
  ctx.drawImage(...src,0,0,64,112);
  const depth=state.source?.depthFront?pic(url(state.source.depthFront)):null;
  if(depth?.ready)ctx.drawImage(depth.im,src[1],src[2],64,112,0,0,64,112);
  return true;
 }
 return false;
}
function editedFrame(index,dir){
 if(index===state.frame&&dir===state.direction&&state.sourceReady&&
    (state.dirty||state.source?.authored||
     !!A.get(state.actor,state.action,dir,index)))return px;
 const saved=A.get(state.actor,state.action,dir,index);
 if(saved){
  const entry=pic(saved);
  if(entry?.ready)return entry.im;
 }
 return null;
}
function loadFrame(){
 const ticket=++state.loadingId;
 state.undo=[];state.sourceReady=false;state.dirty=false;
 const count=state.source?.frames||4;
 state.frame=Math.min(state.frame,count-1);
 $("frame").value=String(state.frame);
 $("frame-label").textContent=(state.frame+1)+" / "+count;
 $("edit-label").textContent=state.direction.toUpperCase()+" / F"+(state.frame+1);
 $("motion-source").textContent=state.source?.note||"CHARACTER SPRITES UNAVAILABLE";
 const override=A.get(state.actor,state.action,state.direction,state.frame);
 function finish(){
  if(ticket!==state.loadingId)return;
  state.sourceReady=true;status(override?"EDITING SAVED ACTION FRAME":
   state.source?.authored?"EDITING NATIVE MOTION COPY":"EDITING UNRENDERED ACTION DRAFT");
  updateActionCoverage();render();
 }
 pc.clearRect(0,0,64,112);
 if(override){
  const img=pic(override);
  if(img?.ready){pc.drawImage(img.im,0,0,64,112);finish();}
  else if(img?.failed){
   status("SAVED FRAME UNREADABLE · YOU CAN STILL EDIT AND RE-SAVE");
   finish();
  }
  else if(img?.im)img.im.addEventListener("load",()=>{
   if(ticket!==state.loadingId)return;
   pc.clearRect(0,0,64,112);pc.drawImage(img.im,0,0,64,112);finish();
  },{once:true});
  if(img?.im&&!img.ready&&!img.failed)
   img.im.addEventListener("error",()=>{
    if(ticket!==state.loadingId)return;
    status("SAVED FRAME UNREADABLE · BLANK EDITOR UNLOCKED");finish();
   },{once:true});
  return;
 }
 if(originalInto(pc,state.frame,state.direction)){finish();return;}
 const src=state.source&&pic(state.source.sheet);
 if(src?.ready||src?.failed||!src){
  // A blank/new action is editable. Never lock the controls on a missing
  // legacy sheet or a reference image which has already finished loading.
  finish();return;
 }
 src.im.addEventListener("load",()=>{
  if(ticket!==state.loadingId)return;
  originalInto(pc,state.frame,state.direction);finish();
 },{once:true});
 src.im.addEventListener("error",()=>{
  if(ticket!==state.loadingId)return;
  status("MOTION REFERENCE UNAVAILABLE · BLANK EDITOR UNLOCKED");finish();
 },{once:true});
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
 const p=state.prop,anchor=p?ISO.actionAnchor(p):null;
 const local=p?.assetId==="bathtub"?[1,.5]:[.5,.55];
 const tile=p?(anchor||ISO.fixturePoint(p,...local)):
   {c:state.scene.width/2,r:state.scene.depth/2};
 const z=anchor?.z??(p?.assetId==="bathtub"?20:5);
 const [footX,footY]=ISO.point(geo,tile.c,tile.r,z);
 const dir=state.direction,frame=state.previewFrame,shift=state.offset;
 // Compose body and real same-actor face into a separate transparent image.
 // Rotate that image at the foot pivot, without modifying saved 64x112 PNGs.
 sourceCtx.clearRect(0,0,64,112);
 const image=editedFrame(frame,dir);
 if(image)sourceCtx.drawImage(image,0,0,64,112);
 else {
  const src=(state.source?.authored||state.source?.referencePose)?sourceRect(frame,dir):null;
  if(src){
   sourceCtx.drawImage(...src,0,0,64,112);
   const depth=state.source?.depthFront?pic(url(state.source.depthFront)):null;
   if(depth?.ready)sourceCtx.drawImage(depth.im,src[1],src[2],64,112,0,0,64,112);
  }else {
   sourceCtx.fillStyle="#577c9c";sourceCtx.fillRect(22,45,20,40);
   sourceCtx.fillStyle="#d8b49b";sourceCtx.fillRect(23,23,18,23);
  }
 }
 const face=selectedExpression();
 if(face)P.drawExpression(sourceCtx,face,dir,frame,path=>pic(url(path)));
 // Simulation-only universal bath appearance. The editable source frame
 // remains untouched; dressing and undressing belong to the action state.
 const hygiene=BODY?.resolve(actor(),state.action);
 if(hygiene?.kind==="bath"||hygiene?.kind==="bathtub"){
  const bath=pic(url(hygiene.sheet));
  if(bath?.ready)BODY.apply(sourceCtx,{actor:actor(),action:state.action,
   direction:dir,frame,bodyImage:bath.im});
  else if(hygiene.kind==="bathtub")sourceCtx.clearRect(0,0,64,112);
  else sourceCtx.clearRect(0,BODY.BODY_START_Y||53,64,59);
 }else if(state.action==="bathtub_bathe"){
  // Native LIE pixels and face belong to the selected character; no
  // arbitrary human body is substituted for legacy and non-human actors.
  BODY?.drawBathFoam?.(sourceCtx,{frame,direction:dir});
 }
 const universal=Boolean(SLEEP?.resolve(actor(),state.action));
 const angle=universal?0:P.rotation($("template-rotation").value);
 const breath=universal?SLEEP.breathing(frame):0;
 P.drawRotated(sc,scratch,
  Math.round(footX+shift.x),
  Math.round(footY+(anchor?.pixelOffsetY||0)+shift.y+breath),angle);
 // The object depth switch applies after rotation: a lying person can go
 // behind the bed/duvet or in front of it without baking furniture into PNGs.
 if(p&&$("object-layer").value==="behind")ISO.drawFurniture(sc,geo,p);
 if(anchor&&$("object-layer").value==="behind")ISO.drawSeatForeground(sc,geo,p);
 const source=state.source,object=p?(MODEL.types[p.assetId]?.label||p.assetId):"FREE STANDING / NO PROP";
 notice(object+" · "+(p?"OBJECT ROT "+p.rotation+"° / ":"")+
  (source?.authored?"NATIVE RIG / ":T?.get(state.actor,state.action)?.ready?
   "SEMESTA TEMPLATE / ":"PLANNED · PAINT FRAMES / ")+
  "CHARACTER "+angle+"° · FACE "+($("template-expression").value||"neutral").toUpperCase()+
  ($("object-layer").value==="behind"?" · PLAYER BEHIND":" · PLAYER IN FRONT"));
}
function remember(){
 state.undo.push(pc.getImageData(0,0,64,112));
 if(state.undo.length>24)state.undo.shift();
}
function tool(name){
 state.tool=name;
 for(const id of ["pencil","erase","pick"]){
  const active=name===id;
  $(id).classList.toggle("active",active);
  $(id).setAttribute("aria-pressed",String(active));
 }
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
 state.lastPoint=next;state.dirty=true;render();
}
function updateTemplateStatus(){
 if(!T)return;
 if(SLEEP?.resolve(actor(),state.action)){
  $("template-status").textContent=
   "✓ UNIVERSAL V6B / READY IN SEMESTA · NO PER-CHARACTER SAVE";
  $("save-template").disabled=true;
  return;
 }
 const record=T.get(state.actor,state.action),progress=T.coverage(state.actor,state.action);
 const complete=progress.complete;
 const byDir=DIR.map(d=>d.toUpperCase()+":"+progress.directions[d].length).join(" ");
 $("template-status").textContent=(record?
  complete?"READY IN SEMESTA":"DRAFT SAVED · NOT YET PLAYABLE":
  complete?"4 DIRECTIONS READY · SAVE TO SEMESTA":"INCOMPLETE · SAVE A FRAME FOR EACH DIRECTION")+
  " · "+byDir;
 $("save-template").disabled=!state.sourceReady&&progress.authored===0;
}
function save(){
 if(!state.sourceReady){
  status("FRAME LOADING · TRY AGAIN WHEN PIXEL EDITOR IS READY");
  return false;
 }
 try{
  // A draft starts from a reference; idle is not an authored action.
  if(state.dirty){
   A.set(state.actor,state.action,state.direction,state.frame,px.toDataURL("image/png"));
   state.dirty=false;
  }else if(!A.get(state.actor,state.action,state.direction,state.frame)){
   status("DRAW ON THE FRAME BEFORE SAVING · IDLE REFERENCE IS NOT AN ACTION");
   return false;
  }
  status("AUTHOR FRAME SAVED · USE SAVE TO SEMESTA FOR GAMEPLAY");
  updateActionCoverage();updateTemplateStatus();renderActionList();render();
  return true;
 }catch(e){status("SAVE FAILED: "+e.message);return false;}
}
function saveTemplate(){
 if(SLEEP?.resolve(actor(),state.action)){
  status("UNIVERSAL SLEEP IS READY IN SEMESTA · NO SAVE REQUIRED");
  return;
 }
 if(state.dirty&&!save())return;
 try{
  const result=T.save(state.actor,state.action,{
   name:$("template-name").value,
   objectLayer:$("object-layer").value,
   frames:state.source?.frames||4,frameMs:Number($("template-speed").value),
   rotation:Number($("template-rotation").value),
   expression:$("template-expression").value,
   loop:$("template-loop").checked
  });
  status(result.ready?"TEMPLATE READY · SELECT IT IN SEMESTA CHARACTER POSE":
   "DRAFT TEMPLATE SAVED · FINISH ALL 4 DIRECTIONS TO ACTIVATE IN SEMESTA");
  updateTemplateStatus();updateActionCoverage();renderActionList();
 }catch(e){status("TEMPLATE SAVE FAILED: "+e.message);}
}
function download(){
 const link=document.createElement("a");
 link.href=px.toDataURL("image/png");
 link.download=state.actor+"_"+state.action+"_"+state.direction+"_f"+state.frame+".png";
 document.body.append(link);link.click();link.remove();
}
async function loadCatalog(){
 try{
  const [res,actionRes,bindingsRes]=await Promise.all([
   fetch(new URL("catalog.json",BASE),{cache:"no-store"}),
   fetch(new URL("player-actions.json",BASE),{cache:"no-store"}),
   fetch(new URL("gameplay-bindings.json",BASE),{cache:"no-store"})
  ]);
  if(!res.ok)throw Error("Mahluk Hidup catalog HTTP "+res.status);
  if(!actionRes.ok)throw Error("Player action database HTTP "+actionRes.status);
  if(!bindingsRes.ok)throw Error("Bangun Ruang action bindings HTTP "+bindingsRes.status);
  const [cat,definitions,bindings]=await Promise.all([res.json(),actionRes.json(),bindingsRes.json()]);
  const known=new Map((definitions.actions||[]).map(row=>[row.id,row]));
  const registered=[...(bindings.bindings||[]),...(bindings.variants||[])];
  for(const binding of registered){
   const row=known.get(binding.animation_action);
   if(!row)throw Error("Unmapped game action "+binding.game_action);
   if(!row.game_ids)row.game_ids=[];
   if(!row.game_ids.includes(binding.game_action))row.game_ids.push(binding.game_action);
   row.fixture_ids=[...new Set([...(row.fixture_ids||[]),
     ...(binding.fixtures||[]),...(binding.fixture?[binding.fixture]:[])])];
  }
  if(!Array.isArray(definitions.actions)||definitions.actions.length<200)
   throw Error("Player action registry incomplete");
  // Human posture database: register the 3 actor-specific motions while
  // retaining the original 204 canonical gameplay action definitions.
  const postures=Array.isArray(bindings.posture_presets)?bindings.posture_presets:[];
  for(const preset of postures){
   if(!escapeId(preset.id)||!Array.isArray(preset.actors))continue;
   const existing=known.get(preset.id);
   if(existing){existing.category="posture";existing.posture=true;}
   else {
    const row={id:preset.id,label:preset.label||preset.id.toUpperCase(),
     category:"posture",status:"actor_specific",type:"custom_sheet",
     frames:preset.frames||4,loop:true,posture:true,
     requirements:preset.fixtures||[]};
    definitions.actions.push(row);known.set(row.id,row);
   }
  }
  const universal=SLEEP?.definitions||[];
  A.registerActions([...definitions.actions.map(row=>row.id),
   ...universal.map(row=>row.id)]);
  state.actions=[...universal,...compatActions,...definitions.actions];
  const filter=$("action-category");
  filter.replaceChildren(opt("all","ALL ACTIVITIES"),opt("p0","P0 / ESSENTIAL"),opt("edited","EDITED / LOCAL"));
  for(const group of categories)if(state.actions.some(row=>row.category===group))
   filter.append(opt(group,group.toUpperCase()));
  $("action").replaceChildren();
  for(const row of state.actions)$("action").append(opt(row.id,row.label));
  $("new-action").replaceChildren(opt("","SELECT AN ACTION..."));
  for(const row of state.actions)$("new-action").append(opt(row.id,row.label||row.id));
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
  renderActionList();
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
if(!A){status("ACTION FRAME STORAGE MODULE FAILED TO LOAD");notice("Please reload Mahluk Hidup · no sprite data has been overwritten.");return;}
if(!MODEL||!ISO)status("BANGUN RUANG PREVIEW UNAVAILABLE · PIXEL EDITING STILL ENABLED");
if(!window.VLActionTemplates)status("SEMESTA TEMPLATE MODULE UNAVAILABLE · PIXEL EDITING STILL ENABLED");
$("actor").onchange=()=>{state.actor=$("actor").value;renderActionList();setAction(state.action);};
$("action-search").oninput=()=>{state.actionSearch=$("action-search").value;renderActionList();};
$("action-category").onchange=()=>{state.actionFilter=$("action-category").value;renderActionList();};
$("action").onchange=()=>setAction($("action").value);
$("create-action").onclick=()=>{
 const id=$("new-action").value;
 if(!id||!A.actions.includes(id)){status("CHOOSE AN ACTION FIRST");return;}
 setAction(id);
 $("action-search").value="";state.actionSearch="";
 $("action-category").value="all";state.actionFilter="all";
 renderActionList();
 status("NEW ACTION DRAFT: "+id.toUpperCase()+" · PAINT AND SAVE YOUR FRAMES");
};
for(const btn of document.querySelectorAll("[data-ae-action]"))
 btn.addEventListener("click",()=>setAction(btn.dataset.aeAction));
$("direction").onchange=()=>{state.direction=$("direction").value;loadFrame();render();};
$("building").onchange=()=>{state.buildId=$("building").value;updateFloors();};
$("floor").onchange=()=>{state.floor=Math.max(0,Number($("floor").value)-1);updateScene();};
$("furniture").onchange=()=>{state.prop=state.scene?.items?.find(x=>x.id===$("furniture").value)||null;state.bgReady=false;render();};
$("sync").onclick=()=>{readBuildings(state.buildId);status("RELOADED LATEST BANGUN RUANG SAVED DATA");};
$("frame").oninput=()=>{state.frame=Number($("frame").value);loadFrame();};
$("pencil").onclick=()=>tool("pencil");$("erase").onclick=()=>tool("erase");$("pick").onclick=()=>tool("pick");
$("save").onclick=save;
$("save-template").onclick=saveTemplate;
$("object-layer").onchange=()=>{render();status("OBJECT DEPTH CHANGED · SAVE TO SEMESTA TO KEEP THIS SETTING");};
$("template-speed").onchange=()=>status("TEMPLATE TIMING CHANGED · SAVE TO SEMESTA TO APPLY");
$("template-rotation").onchange=()=>{render();status("POSE ROTATED · SAVE TO SEMESTA TO APPLY");};
$("template-expression").onchange=()=>{render();status("NATIVE FACE SELECTED · SAVE TO SEMESTA TO APPLY");};
$("template-loop").onchange=()=>status("LOOP MODE CHANGED · SAVE TO SEMESTA TO APPLY");
$("undo").onclick=()=>{const prior=state.undo.pop();if(prior){pc.putImageData(prior,0,0);render();}};
$("reset-frame").onclick=()=>{if(!state.sourceReady)return;remember();originalInto(pc,state.frame,state.direction);
 state.dirty=true;render();status("SOURCE REFERENCE RESTORED IN EDITOR · SAVE FRAME ONLY IF INTENDED");};
$("clear").onclick=()=>{if(!state.sourceReady)return;
 A.remove(state.actor,state.action,state.direction,state.frame);
 loadFrame();renderActionList();updateActionCoverage();updateTemplateStatus();
 status("LOCAL FRAME REMOVED / SOURCE RESTORED");};
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
 if(state.playing&&state.source&&t-state.lastTick>=Math.max(60,Number($("template-speed").value)||210)){
  const count=state.source.frames||4;
  if(!$("template-loop").checked&&state.previewFrame>=count-1){play(false);}
  else state.previewFrame=(state.previewFrame+1)%count;
  state.lastTick=t;render();
 }
 requestAnimationFrame(tick);
}
window.addEventListener("storage",e=>{
 if(e.key===BUILD_KEY){readBuildings(state.buildId);status("BANGUN RUANG SCENE SYNCED");}
 if(e.key===A.key){A.invalidate();T.invalidate();state.offset=A.offset(state.actor,state.action);syncOffset();loadFrame();updateTemplateStatus();}
 if(e.key===T.key){T.invalidate();updateTemplateStatus();}
});
window.addEventListener("focus",()=>{
 readBuildings(state.buildId);A.invalidate();T.invalidate();state.offset=A.offset(state.actor,state.action);syncOffset();updateTemplateStatus();render();
});
requestAnimationFrame(tick);
readBuildings(deepLink.get("building")||"demo");
loadCatalog();
})();
