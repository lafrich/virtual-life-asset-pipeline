/* Mahluk Hidup AI Character: functional local asset / universal rig workflow.
 * Local prompt parsing & sampled photo colours; no external AI or automatic git publish.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id),engine=window.MahlukCharacterDraft,store=window.VLUniversalRig;
const canvas=$("preview"),ctx=canvas.getContext("2d"),fields=["name","species","body","proportion","prompt"];
const parts={},DRAFT="mahluk-hidup-ai-character-draft-v2";
let current=null,palette=null,sheet=null,result=null;
function status(s){$("status").textContent=s}
function stage(s){$("stage").textContent="STAGE: "+s}
function spec(){return Object.fromEntries(fields.map(f=>[f,$(f).value]))}
function saveForm(){try{localStorage.setItem(DRAFT,JSON.stringify(spec()))}catch{}}
function loadForm(){try{const d=JSON.parse(localStorage.getItem(DRAFT)||"{}");for(const k of fields)if(typeof d[k]==="string")$(k).value=d[k]}catch{}}
function drawPlaceholder(){
 ctx.clearRect(0,0,256,304);
 ctx.fillStyle="#eff3f8";ctx.fillRect(20,14,216,278);
 ctx.fillStyle="#52729d";ctx.font="bold 12px monospace";
 ctx.fillText("CHARACTER PREVIEW",52,105);
 ctx.fillText("SE / SW / NE / NW",61,139);
 ctx.font="11px monospace";ctx.fillText("GENERATE BASE FIRST",52,173);
}
function drawFour(){
 if(!sheet){drawPlaceholder();return}
 ctx.clearRect(0,0,256,304);ctx.imageSmoothingEnabled=false;
 const coords=[[33,4],[145,4],[33,157],[145,157]];
 coords.forEach(([x,y],i)=>{
  ctx.drawImage(sheet,i*64,0,64,112,x,y,77,134);
  ctx.fillStyle="#274c80";ctx.font="bold 11px monospace";
  ctx.fillText(["SE","SW","NE","NW"][i],x+27,y+143);
 });
}
function drawMotion(){
 if(!current||!engine)return;
 const c=engine.render(current.spec,$("direction").value,current.colors,$("motion").value,2);
 ctx.clearRect(0,0,256,304);ctx.imageSmoothingEnabled=false;
 ctx.drawImage(c,68,15,120,210);ctx.fillStyle="#244976";ctx.font="bold 11px monospace";
 ctx.fillText($("direction").value.toUpperCase()+" / "+$("motion").value.toUpperCase()+" / F2",76,248);
 ctx.fillText("64×112 / PART RIG",58,267);
}
function choices(){
 const select=$("category");select.replaceChildren();
 for(const [id,label]of Object.entries(store.categoryNames)){
  const o=document.createElement("option");o.value=id;o.textContent=label;select.append(o);
 }
}
function profiles(){return ["core",...["interior","social","job"].filter(p=>$("profile-"+p).checked)]}
function resetRigResult(){
 result=null;$("save-rig").disabled=true;
 $("test-status").textContent="NOT TESTED. Test four directions after any rig change.";
}
function updateUI(){
 $("approve").disabled=!current||current.status!=="draft_base";
 $("continue").disabled=!current||current.status==="draft_base";
 $("rig-panel").hidden=!current||current.status==="draft_base"||!current.rig&&current.status!=="base_approved";
 if(current)stage(current.status.toUpperCase().replaceAll("_"," "));
 else stage("NEW CHARACTER");
}
function renderLibrary(){
 const list=$("asset-list");list.replaceChildren();
 const items=store.list();
 if(!items.length){const p=document.createElement("p");p.className="help";p.textContent="NO SAVED CHARACTERS YET.";list.append(p);return}
 for(const a of items){
  const line=document.createElement("div");line.className="saved";
  const label=document.createElement("span");label.textContent=a.name+" / "+a.status.toUpperCase().replaceAll("_"," ");
  const open=document.createElement("button");open.type="button";open.textContent="OPEN";open.onclick=()=>openAsset(a.id);
  const del=document.createElement("button");del.type="button";del.textContent="×";del.title="Delete character";
  del.onclick=()=>{if(!confirm("Delete "+a.name+" from this browser's character library?"))return;
    try{store.remove(a.id);if(current?.id===a.id)clearCurrent();renderLibrary();status("Local character deleted.")}catch(e){status("Delete failed: "+e.message)}};
  line.append(label,open,del);list.append(line);
 }
}
function openAsset(id){
 const a=store.get(id);if(!a)return;
 current=a;palette=a.colors;for(const k of fields)$(k).value=a.spec[k]||"";
 sheet=engine.makeSheet(a.spec,a.colors);drawFour();saveForm();resetRigResult();
 $("category").value=a.rig?.category||store.suggestCategory(a.spec);
 for(const p of ["interior","social","job"])$("profile-"+p).checked=Boolean(a.rig?.profiles?.includes(p));
 updateUI();
 $("test-status").textContent=a.rig?.ready?"Saved rig has local Idle and Walk. Retest if changing configuration.":"NOT TESTED";
 status("Opened "+a.name+". Photo uploads are not stored; source colours and prompt are preserved.");
}
function clearCurrent(){
 current=null;palette=null;sheet=null;result=null;drawPlaceholder();
 $("rig-panel").hidden=true;resetRigResult();updateUI();
}
async function generate(){
 if(!engine||!store)return status("Pixel generator or rig engine failed to load. Reload page.");
 const input=spec();
 if(!input.name.trim()){$("name").focus();return status("Enter a character name first.")}
 const colors={skin:"#d6a88c",hair:"#39312f",upper:"#9c6472",lower:"#52647f",feet:"#393b42"};
 $("generate").disabled=true;status("Generating character base from prompt and reference colours...");
 try{
  for(const [part,key]of Object.entries({head:"hair",upper:"upper",lower:"lower",feet:"feet"})){
   if(parts[part]){const color=await engine.sampleImage(parts[part].data);if(color)colors[key]=color}
  }
  if(parts.overall&&!parts.upper&&!parts.lower){
   const color=await engine.sampleImage(parts.overall.data);if(color)colors.upper=color;
  }
  const asset=store.createBase(input,colors);
  if(current?.id){asset.id=current.id} // Regenerate the same asset; clear rig approval.
  current=store.save(asset);palette=colors;sheet=engine.makeSheet(asset.spec,colors);
  drawFour();updateUI();renderLibrary();resetRigResult();
  $("rig-panel").hidden=true;
  status("Base saved in the Mahluk Hidup local library. Review and approve to configure its rig.");
 }catch(e){status("Could not generate: "+e.message)}
 finally{$("generate").disabled=false}
}
function startRig(){
 if(!current||current.status==="draft_base")return status("Approve base first.");
 $("rig-panel").hidden=false;
 $("category").value=current.rig?.category||store.suggestCategory(current.spec);
 resetRigResult();stage("RIG SETUP");
 status("Choose rig category and animation profiles. Only tested poses will be playable.");
}
function test(){
 if(!current||current.status==="draft_base")return status("Approve base first.");
 try{
  const rig=store.buildRig(current,$("category").value,profiles());
  const candidate={...current,status:"rigging",rig};
  const test=store.testCore(candidate,engine);
  result=test;current=candidate;drawMotion();
  $("test-status").textContent=test.pass?
   "PASS: IDLE + WALK, SE/SW/NE/NW, 64×112. Other actions remain un-authored.":
   "NOT READY: "+test.errors.join("; ");
  $("save-rig").disabled=!test.pass;stage(test.pass?"RIG TEST PASSED":"RIG INCOMPLETE");
 }catch(e){result=null;$("save-rig").disabled=true;status("Rig test error: "+e.message)}
}
function saveRig(){
 if(!current||!result?.pass)return status("Test core rig before saving.");
 try{
  current=store.save(store.finishRig(current,result));
  $("save-rig").disabled=true;
  stage("RIG READY / IDLE + WALK");renderLibrary();
  status("Character rig saved. It appears in Characters with genuine local idle/walk frames; additional animations need authoring.");
 }catch(e){status("Rig save failed: "+e.message)}
}
function setupPhotos(){
 document.querySelectorAll(".ref").forEach(el=>{
  const kind=el.dataset.part,input=el.querySelector("input"),img=el.querySelector("img");
  input.addEventListener("change",()=>{
   const file=input.files?.[0];if(!file)return;
   if(file.size>4*1024*1024||!/^image\/(png|jpeg|webp)$/.test(file.type)){status("Use a PNG, JPG or WebP under 4 MB.");input.value="";return}
   const reader=new FileReader();
   reader.onload=()=>{parts[kind]={data:String(reader.result),name:file.name};
     img.src=String(reader.result);img.classList.add("ready");status("Loaded "+kind+" reference for colour guidance.")};
   reader.onerror=()=>status("Could not read uploaded image");
   reader.readAsDataURL(file);
  });
  el.querySelector(".clear").onclick=()=>{
   delete parts[kind];input.value="";img.removeAttribute("src");img.classList.remove("ready");
  };
 });
}
function init(){
 if(!engine||!store){status("Required generator scripts missing. Reload page.");return}
 loadForm();choices();setupPhotos();drawPlaceholder();renderLibrary();
 for(const k of fields)$(k).addEventListener(k==="name"||k==="prompt"?"input":"change",saveForm);
 $("generate").onclick=generate;
 $("approve").onclick=()=>{
  if(!current||current.status!=="draft_base")return;
  try{current=store.save({...current,status:"base_approved"});updateUI();renderLibrary();status("Base approved. Continue to Rig.")}catch(e){status("Could not approve: "+e.message)}
 };
 $("continue").onclick=startRig;
 $("test").onclick=test;
 $("save-rig").onclick=saveRig;
 $("category").onchange=()=>{resetRigResult();
  $("rig-hint").textContent=$("category").value==="nonhuman_custom"?
  "Nonhuman custom needs a bespoke skeleton and manually authored poses; cannot auto-certify.":
  "Uses the shared humanoid skeleton. Style variants affect layer and occlusion rules, not animation names.";
 };
 for(const p of ["interior","social","job"])$("profile-"+p).onchange=resetRigResult;
 $("direction").onchange=drawMotion;$("motion").onchange=drawMotion;
 $("new").onclick=()=>{
  if(!confirm("Start a new character? Saved assets remain in this browser."))return;
  clearCurrent();for(const k of fields){const el=$(k);if(el.tagName==="SELECT")el.selectedIndex=0;else el.value=""}
  document.querySelectorAll(".ref .clear").forEach(b=>b.click());saveForm();status("Ready to create a new character.");
 };
 const requested=new URLSearchParams(location.search).get("asset");
 if(requested&&store.get(requested))openAsset(requested);
}
init();
})();