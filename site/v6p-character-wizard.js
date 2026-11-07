/* CHARACTER.EXE wizard — only a simpler front end to the existing editor.
 * Home -> Base -> Customize -> Preview -> Save; modifying a character starts at
 * Customize, with Back returning to Home. Edits/frames use the original V6P
 * compositor, character store, retargeter, Pixel Editor, and publisher. */
(function(root){"use strict";
const $=id=>document.getElementById(id);
const S=root.V6PCharacterStore,H=root.V6PCharacterHost,V=root.V6PCompositor,R=root.V6PCharacterRetarget,C=root.V6PPartCatalog;
if(!S||!H||!V||!R||!C||!$("character-wizard"))return;
const STORE="mahluk-character-wizard-v1",ORDER=["home","base","customize","preview","save"];
const state={step:"home",mode:"new",category:"body",frame:0,playing:false,timer:0,busy:false,pendingPreview:true,initialized:false,saved:false};
let previewRevision=0;
function notice(str,err){const el=$("wizard-notice");el.textContent=String(str||"");el.style.color=err?"#a52d26":"#506780";}
function result(str,err){const el=$("generate-result");el.textContent=str;el.style.color=err?"#aa312a":"#506780";}
function published(){
 try{const data=JSON.parse(localStorage.getItem("mahluk-2-library-v1")||"[]");
 return Array.isArray(data)?data.filter(x=>x&&x.id&&x.v6p):[]}catch{return []}
}
function showHomeTab(tab){
 const gallery=tab==="gallery";
 $("wizard-home-start").hidden=gallery;
 $("wizard-gallery").hidden=!gallery;
 $("wizard-tab-gallery").setAttribute("aria-pressed",String(gallery));
 $("wizard-tab-start").setAttribute("aria-pressed",String(!gallery));
 if(gallery)renderGallery();
}
function renderGallery(){
 const grid=$("wizard-gallery-grid"),count=$("wizard-gallery-count");
 if(!grid)return;
 const list=published().slice().sort((a,b)=>String(b.updated||"").localeCompare(String(a.updated||"")));
 if(count)count.textContent="("+list.length+")";
 grid.replaceChildren();
 if(!list.length){
  const empty=document.createElement("p");empty.className="wizard-gallery-empty";
  empty.textContent="Belum ada karakter yang disimpan. Buat karakter di Create / Modify, lalu Save Character untuk menampilkannya di sini.";
  grid.append(empty);return;
 }
 for(const row of list){
  const card=document.createElement("article");card.className="wizard-gallery-card";card.setAttribute("role","listitem");
  const title=document.createElement("h3");title.textContent=row.name||"Untitled";card.append(title);
  const meta=document.createElement("p");
  meta.textContent=(row.base==="female"?"Female":"Male")+" · "+Object.keys(row.clips||{}).length+" animations · saved";
  card.append(meta);
  const angles=document.createElement("div");angles.className="wizard-gallery-angles";
  const canvases=[];
  for(const dir of ["se","sw","ne","nw"]){
   const fig=document.createElement("figure"),canvas=document.createElement("canvas"),label=document.createElement("figcaption");
   canvas.width=64;canvas.height=112;
   label.textContent=dir.toUpperCase();
   fig.append(canvas,label);angles.append(fig);canvases.push(canvas);
  }
  card.append(angles);
  const foot=document.createElement("p");foot.textContent="Preview only · tidak mengubah karakter";
  card.append(foot);grid.append(card);
  const clip=row.clips?.idle;
  const url=clip?.sheet||row.sprite;
  if(!url)continue;
  const image=new Image();
  image.onload=()=>{
   if(!canvases[0].isConnected)return;
   const isAtlas=!!clip?.sheet&&image.naturalHeight>=4*112&&image.naturalWidth>=64;
   const rowWidth=64;
   canvases.forEach((canvas,di)=>{
    const ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=false;
    ctx.clearRect(0,0,64,112);
    if(isAtlas)ctx.drawImage(image,0,di*112,rowWidth,112,0,0,64,112);
    else if(di===0)ctx.drawImage(image,0,0,image.naturalWidth,image.naturalHeight,0,0,64,112);
   });
  };
  image.onerror=()=>{
   foot.textContent="Preview tidak tersedia · data karakter tetap tersimpan";
  };
  image.src=url;
 }
}
function opt(sel,value,label){const el=document.createElement("option");el.value=value;el.textContent=label;sel.append(el)}
function fillLists(){
 const src=$("workflow-source"),list=$("workflow-list"),oldSource=src.value,oldList=list.value;
 src.replaceChildren();list.replaceChildren();
 opt(src,"base:male","Start from Scratch · Male Base (nude)");
 opt(src,"base:female","Start from Scratch · Female Base (nude)");
 opt(list,"","Choose a character…");
 const seen=new Set();
 for(const row of S.list()){
  opt(src,"draft:"+row.id,"Use Existing · "+row.name);
  opt(list,row.id,row.name+(row.status==="saved"?" · saved":" · draft"));seen.add(row.id);
 }
 for(const row of published())if(!seen.has(row.id)){
  opt(src,"published:"+row.id,"Use Existing · "+row.name);
  opt(list,row.id,row.name+" · database");seen.add(row.id);
 }
 if([...src.options].some(x=>x.value===oldSource))src.value=oldSource;
 if([...list.options].some(x=>x.value===oldList))list.value=oldList;
 if(!$("wizard-gallery").hidden)renderGallery();
 else $("wizard-gallery-count").textContent="("+published().length+")";
}
function sourceRecord(value){
 if(value==="base:female")return {type:"base",gender:"female"};
 if(value==="base:male"||!value)return {type:"base",gender:"male"};
 const id=value.split(":")[1];
 const draft=S.get(id);if(draft)return {type:"clone",id,name:draft.name};
 const saved=published().find(x=>x.id===id);
 if(saved)return {type:"published",name:saved.name,gender:saved.base==="female"?"female":"male",appearance:saved.v6p,faceId:saved.faceId||""};
 return null;
}
function storeStep(){
 try{sessionStorage.setItem(STORE,JSON.stringify({
  step:state.step,mode:state.mode,category:state.category,characterId:H.get().id,
  saved:state.saved
 }))}catch{}
}
function restoreStep(){
 try{const v=JSON.parse(sessionStorage.getItem(STORE)||"null");return v&&typeof v==="object"?v:null}catch{return null}
}
function setStep(step,why){
 if(!ORDER.includes(step))step="home";
 if(step!=="preview")stopPreview();
 state.step=step;
 for(const name of ORDER)$("wizard-"+name).hidden=name!==step;
 const index=ORDER.indexOf(step);
 for(const el of document.querySelectorAll("[data-wizard-progress]")){
  const pos=ORDER.indexOf(el.dataset.wizardProgress);
  el.classList.toggle("current",pos===index);el.classList.toggle("done",pos<index);
 }
 const back=$("wizard-back"),next=$("wizard-next");
 back.hidden=step==="home";
 next.hidden=step==="home";
 next.textContent={base:"CONTINUE →",customize:"PREVIEW CHARACTER →",preview:"CONTINUE TO SAVE →",
  save:state.saved?"← BACK TO CHARACTERS":"▣ SAVE CHARACTER"}[step]||"NEXT →";
 if(step==="save"){$("wizard-save-success").classList.toggle("visible",state.saved)}
 notice(why||{home:"Choose how to begin.",base:"Choose a base, then Continue.",
  customize:"Choose a part, use the library or Edit Sprite.",preview:"Check animation frames and tap a direction to fix.",
  save:"Name your character and save it to your database."}[step]);
 if(step==="customize")renderLive();
 if(step==="preview")void preview();
 storeStep();
}
function move(id,slot){
 const n=$(id),p=$(slot);if(n&&p)p.append(n);return n;
}
function makePart(id,title,description){
 const panel=document.createElement("section");panel.id="wizard-part-"+id;panel.className="wizard-part";panel.hidden=true;
 const heading=document.createElement("h3");heading.textContent=title;panel.append(heading);
 const helper=document.createElement("p");helper.className="note";helper.textContent=description;panel.append(helper);
 $("wizard-part-host").append(panel);
 const btn=document.createElement("button");btn.type="button";btn.textContent=title;
 btn.setAttribute("aria-pressed",String(state.category===id));btn.dataset.part=id;
 btn.onclick=()=>selectPart(id);$("wizard-part-nav").append(btn);
 return panel;
}
function field(panel,id){
 const node=$(id);if(!node)return;
 const wrap=node.closest(".row")||node;
 const prev=wrap.previousElementSibling;
 if(prev&&prev.tagName==="LABEL")panel.append(prev);
 panel.append(wrap);
}
function selectPart(id){
 if(!$("wizard-part-"+id))id="body";state.category=id;
 for(const el of document.querySelectorAll(".wizard-part"))el.hidden=el.id!=="wizard-part-"+id;
 for(const el of document.querySelectorAll("#wizard-part-nav button"))el.setAttribute("aria-pressed",String(el.dataset.part===id));
 storeStep();
}
function arrangeLegacyControls(){
 const wizard=$("character-wizard");
 // Keep original select elements (and all bound event listeners) instead of replacing them.
 move("workflow-list","wizard-existing-slot");move("workflow-open","wizard-existing-slot");
 move("workflow-source","wizard-base-slot");
 move("workflow-clone","wizard-duplicate-slot");
 if($("workflow-clone"))$("workflow-clone").textContent="⧉ Duplicate This Character";
 const body=makePart("body","Body","Start from the nude Male or Female base, then choose skin color. You can edit the body sprite itself.");
 field(body,"body");field(body,"skin");
 const hair=makePart("hair","Hair","Choose a hairstyle first, then edit front and back sprite layers. Four directions can be drawn from the same Pixel Editor.");
 field(hair,"hair");field(hair,"hairColor");
 const top=makePart("top","Top","Choose a shirt from the library, or draw your own four-angle top sprite.");
 field(top,"top");field(top,"topColor");
 const pants=makePart("pants","Pants","Choose trousers or a nude base, then customize its sprite.");
 field(pants,"pants");field(pants,"pantsColor");
 const shoes=makePart("shoes","Shoes","Choose shoes from the database or edit the four-direction pixel art.");
 field(shoes,"shoes");field(shoes,"shoesColor");
 const extra=makePart("extras","Accessories","Optional glasses, facial hair and accessories. Emotions are kept in EMOSI.EXE.");
 field(extra,"glasses");field(extra,"facial");field(extra,"studio-accessory");
 const face=makePart("face","Face / Emosi","Expressions are edited in EMOSI.EXE, not drawn onto the nude body.");
 const faceCard=document.querySelector('.wrap .card[aria-label="Face database"]');
 if(faceCard){face.append(faceCard.querySelector(".row")||document.createElement("div"));const faces=$("faces");if(faces)face.append(faces)}
 const preset=$("outfit-normal")?.closest(".row");
 if(preset){const label=preset.previousElementSibling;if(label&&label.tagName==="LABEL")body.append(label);body.append(preset)}
 const pane=document.querySelector('.wrap .card[aria-label="Preview"]');
 if(pane)moveNode(pane,$("wizard-preview-slot"));
 move("char-name","wizard-name-slot");
 move("save-drive","wizard-backup-slot");
 // All other source nodes remain in the legacy hidden wrapper for safe compatibility.
 for(const id of ["edit-body","edit-hair","edit-hair-back","edit-top","edit-pants","edit-shoes","edit-glasses","edit-accessory"]){
  const el=$(id);if(el)el.textContent=id==="edit-hair"?"✎ Front Sprite":id==="edit-hair-back"?"✎ Back Sprite":"✎ Edit Sprite";
 }
 selectPart(state.category);
 wizard.hidden=false;document.body.classList.add("wizard-ready");
}
function moveNode(el,slot){if(el&&slot)slot.append(el)}
function live(){
 const ctx=$("wizard-live-canvas").getContext("2d");ctx.imageSmoothingEnabled=false;
 ctx.clearRect(0,0,64,112);
 const source=H.frame?.("idle","se",0);if(source)ctx.drawImage(source,0,0,64,112);
}
function renderLive(){try{live()}catch{}}
async function openRow(id){
 if(!id)throw Error("Choose a character from the list first.");
 let row=S.get(id);
 if(!row){
  const p=published().find(x=>x.id===id);if(!p)throw Error("Character not found in this browser database.");
  // Published-only records get a safe, editable copy.
  row=S.create({name:p.name+" Copy",gender:p.base==="female"?"female":"male"});
  row=S.update(row.id,{appearance:p.v6p,faceId:p.faceId||""});
 }
 S.select(row.id);await H.open(row);fillLists();state.pendingPreview=true;state.saved=false;
 renderLive();setStep("customize","Editing "+row.name+". Your original source sprites remain intact.");
}
async function createFromBase(){
 const data=sourceRecord($("workflow-source").value);
 if(!data)throw Error("Choose a base.");
 const gender=data.gender||(S.get(data.id)?.gender||"male");
 let record;
 if(data.type==="clone"){const original=S.get(data.id);record=S.create({name:original.name+" Copy",from:original.id})}
 else if(data.type==="published"){
  record=S.create({name:data.name+" Copy",gender});
  record=S.update(record.id,{appearance:data.appearance,faceId:data.faceId});
 }else record=S.create({name:gender==="female"?"New Female Character":"New Male Character",gender});
 await H.open(record);state.pendingPreview=true;state.saved=false;
 fillLists();renderLive();setStep("customize","Customize your new character. No original database character was overwritten.");
}
function readInfo(){const info=H.get();if(!info.id||!S.get(info.id))throw Error("Create or open a character first.");return info}
function stopPreview(){state.playing=false;clearTimeout(state.timer);state.timer=0;if($("qa-play"))$("qa-play").textContent="▶ PLAY"}
function motionChoices(){
 const select=$("qa-animation"),keep=select.value;select.replaceChildren();
 for(const action of C.ACTIONS)opt(select,action,action.replace(/_/g," ").toUpperCase());
 for(const item of R.anchorDatabase())opt(select,"anchor:"+item.id,(item.name||item.id)+" · CUSTOM");
 if([...select.options].some(x=>x.value===keep))select.value=keep;else select.value="idle";
}
function numFrames(){
 const action=$("qa-animation").value;
 return C.FRAMES[action]||R.anchorDatabase().find(x=>"anchor:"+x.id===action)?.frames.length||1;
}
async function preview(){
 const stamp=++previewRevision;
 const action=$("qa-animation").value,n=numFrames();
 state.frame=Math.min(n-1,Math.max(0,state.frame));
 $("qa-frame").max=String(n-1);$("qa-frame").value=String(state.frame);
 $("qa-frame-label").textContent="FRAME "+(state.frame+1)+" / "+n;
 try{await H.qa(action,state.frame)}catch(error){if(stamp===previewRevision)result("Preview unavailable: "+error.message,true)}
}
async function regenerate(){
 const info=readInfo();if(state.busy)return false;
 state.busy=true;updateNext();
 try{
  const name=$("char-name").value||info.name||"New Character";
  S.update(info.id,{name,appearance:info.ch,faceId:info.faceId});
  result("Applying appearance to existing animation poses…");
  const done=await R.generateCharacter(info.id,{progress:p=>result("Applying "+(p.index+1)+" / "+p.total+" · "+p.part)});
  await H.open(S.get(info.id));motionChoices();state.frame=0;await preview();renderLive();
  const corrected=done.corrected||0,repair=done.repairedBackMasters||0;
  const recoverNote=repair?("Repaired "+repair+" legacy rear-view sprite masters into their correct back layers. "):"";
  result(done.parts.length?
   recoverNote+"Animation frames generated from your selected parts. "+corrected+" corrected frames kept. Check walking, sitting and sleeping poses.":
   recoverNote+"Library clothes already have native animation sprites. Check each motion and direction.");
  state.pendingPreview=false;
  return true;
 }catch(error){result("Generation failed: "+error.message,true);notice(error.message,true);return false}
 finally{state.busy=false;updateNext()}
}
function updateNext(){
 const next=$("wizard-next");next.disabled=state.busy;
 next.textContent=state.busy?"WORKING…":{base:"CONTINUE →",customize:"PREVIEW CHARACTER →",preview:"CONTINUE TO SAVE →",
  save:state.saved?"← BACK TO CHARACTERS":"▣ SAVE CHARACTER"}[state.step]||"NEXT →";
}
async function forward(){
 if(state.busy)return;
 try{
  if(state.step==="base"){state.busy=true;updateNext();await createFromBase();state.busy=false;updateNext()}
  else if(state.step==="customize"){
   // Generate automatically here: user need not understand internal retarget buttons.
   if(!await regenerate())return;
   setStep("preview");
  }else if(state.step==="preview"){stopPreview();setStep("save")}
  else if(state.step==="save"){
   if(state.saved){state.saved=false;S.select("");setStep("home");$("wizard-existing").hidden=true;return}
   const info=readInfo();
   const name=$("char-name").value.trim();
   if(!name){notice("Please enter a character name.",true);$("char-name").focus();return}
   state.busy=true;updateNext();notice("Saving character and animation frames…");
   try{
    S.update(info.id,{name,appearance:info.ch,faceId:info.faceId});
    const saved=await H.publish();
    if(!saved||!saved.id)throw Error("Save did not return a valid character record.");
    state.saved=true;fillLists();$("wizard-save-success").textContent="✓ "+name+" saved to Character Database.";
    $("wizard-save-success").classList.add("visible");
    $("wizard-save-confirm").textContent="Saved character ID: "+saved.id+". Use MAHLUK BACKUP for cross-device access.";
    notice("Character saved successfully.");
   }catch(e){notice("Save failed: "+e.message,true)}
   finally{state.busy=false;updateNext();storeStep()}
  }
 }catch(error){state.busy=false;updateNext();notice(error.message,true)}
}
function back(){
 if(state.busy)return;
 const prior={base:"home",customize:state.mode==="modify"?"home":"base",preview:"customize",save:"preview"}[state.step];
 if(prior){state.saved=false;setStep(prior)}
}
function tick(){
 if(!state.playing)return;
 const clip=R.anchorDatabase().find(x=>"anchor:"+x.id===$("qa-animation").value);
 const ms=clip?.frames[state.frame]?.ms||($("qa-animation").value==="walk"?140:240);
 state.timer=setTimeout(()=>{if(!state.playing)return;state.frame=(state.frame+1)%numFrames();void preview();tick()},Math.min(800,Math.max(40,ms)));
}
function selectFixPart(){
 const host=$("all-views");
 if(!host)return;
 const wrap=document.createElement("label");wrap.textContent="PART TO CORRECT";wrap.style.cssText="display:block;width:100%;max-width:360px";
 const select=document.createElement("select");select.id="qa-part";select.style.width="100%";
 for(const part of ["body","hair","hair-back","top","pants","shoes"])opt(select,part,part.replace("-"," ").toUpperCase());
 select.value="top";wrap.append(select);host.after(wrap);
 for(const cv of document.querySelectorAll("[data-qa-dir]")){
  cv.style.cursor="pointer";cv.title="Edit this direction/frame";
  cv.onclick=()=>{
   storeStep();H.edit(select.value,cv.dataset.qaDir,$("qa-animation").value,state.frame);
  };
 }
}
function bind(){
 $("wizard-tab-gallery").onclick=()=>showHomeTab("gallery");
 $("wizard-tab-start").onclick=()=>showHomeTab("start");
 $("wizard-start-new").onclick=()=>{state.mode="new";$("wizard-existing").hidden=true;fillLists();setStep("base")};
 $("wizard-start-modify").onclick=()=>{state.mode="modify";fillLists();$("wizard-existing").hidden=false;notice("Select a character and click Open Character.")};
 $("workflow-open").textContent="OPEN CHARACTER →";
 $("workflow-open").onclick=()=>openRow($("workflow-list").value).catch(e=>notice(e.message,true));
 $("workflow-list").ondblclick=()=>openRow($("workflow-list").value).catch(e=>notice(e.message,true));
 $("wizard-next").onclick=forward;$("wizard-back").onclick=back;
 $("workflow-clone").onclick=async()=>{
  try{
   const info=readInfo();const current=S.get(info.id);
   const copy=S.create({name:current.name+" Copy",from:info.id});
   await H.open(copy);fillLists();renderLive();state.mode="new";state.saved=false;notice("Created an editable copy: "+copy.name);
  }catch(e){notice(e.message,true)}
 };
 for(const b of document.querySelectorAll("#wizard-part-host button[id^=edit-],#wizard-part-host button[id^=new-]"))
  b.addEventListener("click",()=>storeStep());
 $("qa-animation").onchange=()=>{stopPreview();state.frame=0;void preview()};
 $("qa-frame").oninput=()=>{stopPreview();state.frame=Number($("qa-frame").value)||0;void preview()};
 $("qa-prev").onclick=()=>{stopPreview();state.frame=(state.frame+numFrames()-1)%numFrames();void preview()};
 $("qa-next").onclick=()=>{stopPreview();state.frame=(state.frame+1)%numFrames();void preview()};
 $("qa-play").onclick=()=>{if(state.playing){stopPreview();return}state.playing=true;$("qa-play").textContent="❚❚ PAUSE";tick()};
 $("qa-refresh").onclick=()=>regenerate();
 $("generate-character").textContent="↻ REGENERATE ANIMATIONS";
 $("generate-character").onclick=()=>regenerate();
 const status=$("status");if(status&&typeof MutationObserver!=="undefined")
  new MutationObserver(()=>{if(state.step==="customize")renderLive()}).observe(status,{childList:true,characterData:true,subtree:true});
 for(const el of document.querySelectorAll("#wizard-part-host select,#wizard-part-host button[id^=outfit-]"))
  el.addEventListener("change",()=>{state.pendingPreview=true;state.saved=false});
 $("char-name").addEventListener("input",()=>{state.saved=false;updateNext()});
 root.addEventListener("message",e=>{
  if(e.origin!==location.origin||e.data?.type!=="mahluk:refresh-character")return;
  fillLists();const id=H.get().id,row=S.get(id);
  if(row&&state.step!=="home"&&state.step!=="base"){
   H.open(row).then(()=>{renderLive();if(state.step==="preview")void preview()}).catch(e=>notice("Refresh: "+e.message,true))
  }
 });
 root.addEventListener("storage",e=>{if([S.KEY,"mahluk-2-library-v1"].includes(e.key))fillLists()});
 document.addEventListener("visibilitychange",()=>{if(document.hidden)stopPreview()});
}
async function restore(){
 if(state.initialized)return;state.initialized=true;
 fillLists();motionChoices();
 const previous=restoreStep();const row=S.get(previous?.characterId||S.selected());
 if(previous&&ORDER.includes(previous.step)&&row){
  state.mode=previous.mode==="modify"?"modify":"new";
  state.category=previous.category||"body";state.saved=!!previous.saved;
  selectPart(state.category);await H.open(row);setStep(previous.step);
  if(previous.step==="save")$("wizard-save-confirm").textContent="Character is ready to save.";
 }else setStep("home");
 renderLive();
}
arrangeLegacyControls();selectFixPart();bind();
showHomeTab("start");
root.addEventListener("mahluk:character-ready",()=>void restore().catch(e=>notice("Wizard load: "+e.message,true)));
if(root.__v6pStudio?.ready)void restore().catch(e=>notice("Wizard load: "+e.message,true));
})(window);