/* MAHLUK Character is the single source of truth:
   1 create / clone; 2 draw four master views; 3 generate native + anchor motion;
   4 inspect every angle/frame; 5 correct via Pixel Editor; 6 publish character.
   Grok review-only motions are NOT silently installed as playable. */
(function(root){"use strict";
const $=id=>document.getElementById(id),S=root.V6PCharacterStore,H=root.V6PCharacterHost,
 V=root.V6PCompositor,R=root.V6PCharacterRetarget,C=root.V6PPartCatalog;
if(!S||!H||!V||!R||!C)return;
const source=$("workflow-source"),list=$("workflow-list"),qa=$("qa-animation");
const slider=$("qa-frame"),label=$("qa-frame-label"),playBtn=$("qa-play"),part=$("qa-part")||document.createElement("select");
const state={frame:0,timer:0,playing:false,busy:false,qaToken:0};
function status(message){$("workflow-status").textContent=String(message)}
function genStatus(message){$("generate-result").textContent=String(message)}
function published(){try{const v=JSON.parse(localStorage.getItem("mahluk-2-library-v1")||"[]");return Array.isArray(v)?v.filter(x=>x&&x.v6p&&/^mh2_[a-z0-9]+$/.test(x.id)):[]}catch{return []}}
function add(sel,value,name,disabled=false){const o=document.createElement("option");o.value=value;o.textContent=name;o.disabled=disabled;sel.append(o)}
function refresh(){
 const choice=source.value,current=list.value;source.replaceChildren();list.replaceChildren();
 add(source,"base:male","MALE BASE · nude / no hair");
 add(source,"base:female","FEMALE BASE · nude / no hair");
 add(list,"","Choose an existing character…");
 add(list,"base:male","[TEMPLATE] Male Base — Nude");
 add(list,"base:female","[TEMPLATE] Female Base — Nude");
 const seen=new Set();
 for(const row of S.list()){
  add(source,"draft:"+row.id,row.name+" · "+row.status);
  add(list,row.id,row.name+" · "+row.status);
  seen.add(row.id);
 }
 for(const row of published())if(!seen.has(row.id)){
  add(source,"saved:"+row.id,row.name+" · database");
  add(list,row.id,row.name+" · database");seen.add(row.id);
 }
 if([...source.options].some(o=>o.value===choice))source.value=choice;
 if([...list.options].some(o=>o.value===current))list.value=current;
}
function sourceData(value){
 if(value.startsWith("base:"))return {gender:value.slice(5)};
 const id=value.split(":")[1],draft=S.get(id),saved=published().find(x=>x.id===id);
 if(draft)return {from:id,gender:draft.gender,name:draft.name};
 if(saved)return {gender:saved.base==="female"?"female":"male",appearance:saved.v6p,
  faceId:saved.faceId||"",name:saved.name};
 return {gender:"male"};
}
function stop(){
 state.playing=false;clearTimeout(state.timer);state.timer=0;playBtn.textContent="▶ PLAY";
}
function allMotions(){
 const previous=qa.value;qa.replaceChildren();
 for(const action of C.ACTIONS)add(qa,action,action.toUpperCase().replaceAll("_"," ")+" · NATIVE");
 const supported=new Set();
 for(const motion of R.anchorDatabase()){
  add(qa,"anchor:"+motion.id,(motion.name||motion.id).toUpperCase()+" · ANCHOR");
  supported.add(motion.id);
 }
 for(const motion of root.V6PClipStore?.list()||[])if(!supported.has(motion.id)){
  add(qa,"unmapped:"+motion.id,(motion.name||motion.id)+" · NO UNIVERSAL ANCHOR",true);
 }
 qa.value=[...qa.options].some(o=>o.value===previous)?previous:"idle";
}
function frames(){
 const id=qa.value;
 if(C.FRAMES[id])return C.FRAMES[id];
 if(id.startsWith("anchor:"))return R.anchorDatabase().find(x=>x.id===id.slice(7))?.frames.length||1;
 return 1;
}
async function preview(){
 const token=++state.qaToken;
 const n=frames();state.frame=Math.min(Math.max(0,state.frame),n-1);
 slider.max=String(n-1);slider.value=String(state.frame);
 label.textContent="FRAME "+(state.frame+1)+" / "+n;
 try{await H.qa(qa.value,state.frame);if(token!==state.qaToken)return;}
 catch(e){if(token===state.qaToken)genStatus("Preview failed: "+e.message)}
}
function updateMasterCount(){
 const id=H.get().id,row=S.get(id);
 if(!row)return;
 const ch=H.get().ch,sel=part.value;
 const gender=ch.body==="female"?"_f":"";
 const partKey=sel==="hair"?(ch.hair==="none"?"":"hair/"+ch.hair+"_front"):
  sel==="body"?"base/body"+gender:
  sel==="face"?"face/"+(gender?"f":"m")+"_blank":
  sel==="top"?"top/"+ch.top+gender:
  sel==="pants"?"pants/"+ch.pants+gender:
  sel==="shoes"?"shoes/"+ch.shoes+gender:"";
 const num=Object.keys(row.masters?.[partKey]||{}).length;
 const corrected=Object.values(row.corrections||{}).reduce((a,v)=>a+Object.keys(v||{}).length,0);
 status("CHARACTER "+row.name+" · "+sel.toUpperCase()+": "+num+"/4 painted views · "+corrected+
  " protected corrections · draw four angles → generate → preview all frames");
}
async function open(id){
 if(!id){status("Choose a character");return}
 stop();
 if(id.startsWith("base:")){await H.useBase(id.slice(5));S.select("");
  status("Preview "+id.slice(5)+" base. Click ADD NEW CHARACTER to create an editable copy.");await preview();return}
 let row=S.get(id);
 if(!row){
  const saved=published().find(x=>x.id===id);
  if(!saved){status("Saved character record not found");return}
  row=S.create({name:saved.name,gender:saved.base==="female"?"female":"male"});
  row=S.update(row.id,{appearance:saved.v6p,faceId:saved.faceId||""});
 }
 S.select(row.id);await H.open(row);refresh();list.value=row.id;state.frame=0;
 await preview();updateMasterCount();
}
async function newCharacter(){
 const template=sourceData(source.value);
 const name=root.prompt("Character name",template.name?template.name+" Copy":
  template.gender==="female"?"New Female Character":"New Male Character");
 if(!name)return;
 let row=S.create({name,gender:template.gender,from:template.from});
 if(template.appearance)row=S.update(row.id,{appearance:template.appearance,faceId:template.faceId});
 await open(row.id);
}
async function generate(){
 if(state.busy)return;const info=H.get(),id=info.id;
 if(!id||!S.get(id))return genStatus("ADD NEW CHARACTER first (Male/Female Base or database copy).");
 state.busy=true;$("generate-character").disabled=true;stop();
 try{
  S.update(id,{appearance:info.ch,faceId:info.faceId,name:info.name});
  genStatus("Preparing 4-view appearance and generating native animation frames…");
  const done=await R.generateCharacter(id,{progress:p=>genStatus("Generating "+(p.index+1)+"/"+p.total+" · "+p.part)});
  const cloned=S.get(id);
  await H.open(cloned);
  await preview();refresh();list.value=id;updateMasterCount();
  const missing=done.parts.flatMap(p=>p.warning.filter(w=>w.includes("direction")));
  const custom=R.anchorDatabase().length;
  genStatus(done.parts.length?
   "GENERATED "+done.frames+" painted frames across "+done.parts.length+" edited parts; "+
   done.corrected+" manual corrections preserved. "+custom+" anchor clips ready for character preview. "+
   (missing.length?missing.join(" · ")+". ":"")+
   "Review poses (especially sit/sleep) and fix any silhouette errors before SAVE.":
   "Stock outfit already contains native animation frames. "+custom+" anchor-motion clips available.");
 }catch(e){genStatus("GENERATION FAILED: "+e.message)}
 finally{state.busy=false;$("generate-character").disabled=false}
}
function step(delta){stop();state.frame=(state.frame+delta+frames())%frames();preview()}
function tick(){
 if(!state.playing)return;
 const clips=R.anchorDatabase(),entry=qa.value.startsWith("anchor:")?clips.find(x=>x.id===qa.value.slice(7)):null;
 const ms=entry?.frames?.[state.frame]?.ms||(qa.value==="walk"?140:240);
 state.timer=setTimeout(()=>{
  if(!state.playing)return;
  state.frame=(state.frame+1)%frames();preview();tick();
 },Math.max(40,Math.min(800,ms)));
}
function togglePlay(){
 if(state.playing){stop();return}
 state.playing=true;playBtn.textContent="❚❚ PAUSE";tick();
}
if(!part.id){
 const wrap=document.createElement("label");wrap.textContent="CORRECT PART";wrap.style.cssText="font-size:10px;width:100%";
 part.id="qa-part";wrap.append(part);$("all-views").after(wrap);
 for(const p of ["body","hair","top","pants","shoes","face"])add(part,p,p.toUpperCase());
 part.value="top";
}
allMotions();
for(const cv of document.querySelectorAll("[data-qa-dir]")){
 cv.title="Fix this exact direction / frame with Pixel Editor";cv.style.cursor="pointer";
 cv.onclick=()=>H.edit(part.value,cv.dataset.qaDir,qa.value,state.frame);
}
qa.onchange=()=>{stop();state.frame=0;preview()};
slider.oninput=()=>{stop();state.frame=Number(slider.value)||0;preview()};
$("qa-prev").onclick=()=>step(-1);$("qa-next").onclick=()=>step(1);playBtn.onclick=togglePlay;
$("qa-refresh").onclick=async()=>{await H.open(S.get(H.get().id)||{appearance:H.get().ch,name:H.get().name,id:H.get().id});
 allMotions();preview();updateMasterCount()};
$("generate-character").onclick=generate;
$("workflow-new").onclick=()=>newCharacter().catch(e=>status(e.message));
$("workflow-clone").onclick=()=>{
 const id=H.get().id;if(!id)return status("Open a character before duplicating");
 source.value="draft:"+id;newCharacter().catch(e=>status(e.message));
};
$("workflow-open").onclick=()=>open(list.value).catch(e=>status(e.message));
list.ondblclick=()=>open(list.value).catch(e=>status(e.message));
part.onchange=updateMasterCount;
$("refresh-assets").addEventListener("click",()=>{allMotions();preview();updateMasterCount()});
$("save").addEventListener("click",()=>{refresh();updateMasterCount()});
root.addEventListener("storage",e=>{if([S.KEY,"mahluk-2-library-v1",R.ANCHOR_KEY].includes(e.key))refresh()});
root.addEventListener("message",e=>{
 if(e.origin!==location.origin||e.data?.type!=="mahluk:refresh-character")return;
 $("refresh-assets").click();refresh();updateMasterCount();
});
root.addEventListener("mahluk:character-ready",async()=>{
 refresh();allMotions();
 const last=S.selected(),row=S.get(last);
 try{if(row)await open(row.id);else{await H.useBase("male");await preview()}}
 catch(e){status("LOAD FAILED: "+e.message)}
});
document.addEventListener("visibilitychange",()=>{if(document.hidden)stop()});
})(window);