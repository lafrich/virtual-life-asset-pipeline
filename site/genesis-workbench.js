/* MAHLUK HIDUP.EXE — clean Genesis-only character workshop.
 * The only source of anatomy is the approved frozen V6B Genesis Male/Female.
 * Art -> pivot/slice -> immutable binding -> pose test -> approved master.
 * Old character, action, animation and Genesis local databases are never read.
 * Facial art is always an optional Emosi.exe overlay, not baked into body art.
 */
(function(root){"use strict";
const C=root.LafrichPuppetCore,R=root.LafrichPuppetRenderer,P=root.MH2PlanePixelEditor;
const $=id=>document.getElementById(id),DIR=C.DIRS,PARTS=C.PARTS,STEPS=["pixel","rig","bind","test","save"];
const SOURCE=Object.freeze({male:"genesis_male_nude",female:"genesis_female_nude"});
const MASTER_IDS=Object.freeze({male:"lafrich_genesis_male",female:"lafrich_genesis_female"});
const DRAFT_KEY="vl-lafrich-genesis-workbench-drafts-v1";
const MASTER_KEY="vl-lafrich-genesis-approved-masters-v1";
const MASTER_FORMAT="lafrich-genesis-master-v1",BIND_FORMAT="lafrich-genesis-binding-v1";
const cv=() => R.rgba(64,112),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const clone=C.clone;
let gender="male",dir="se",selected="head",step="pixel",tool="pivot",zoom=5;
let drafts={},source={},preparedCache=new Map(),rev=0,paintDrag=null,renderRequest=0;
let pixelEditor=null,pixelSession=null,maskCopied=null,maskUndo=[],maskRedo=[];
let faceEntries=[],faceImage=null,faceId="",page="workshop",testPose=null;
const canvas=$("stage"),ctx=canvas.getContext("2d",{willReadFrequently:true});
const labels={head:"KEPALA / HEAD",torso:"TORSO",arm_near_upper:"LENGAN DEPAN · ATAS",
 arm_near_lower:"LENGAN DEPAN · BAWAH",arm_far_upper:"LENGAN BELAKANG · ATAS",
 arm_far_lower:"LENGAN BELAKANG · BAWAH",leg_near_upper:"PAHA DEPAN",
 leg_near_lower:"BETIS DEPAN",leg_far_upper:"PAHA BELAKANG",
 leg_far_lower:"BETIS BELAKANG"};
function status(s,error=false){
 $("statusmsg").textContent=String(s);$("status").classList.toggle("error",error);
}
function record(){return drafts[gender]}
function master(){return record()?.rig}
function flushCache(){preparedCache.clear();R.clearCache();rev++;void renderAll()}
function makeDirty(){
 const r=record();if(!r)return;
 r.bound=null;r.approved=false;r.saved=false;r.edited=new Date().toISOString();
 flushCache();persistDraft();
}
function download(name,data,mime){
 const blob=new Blob([data],{type:mime||"application/json"}),u=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=u;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(u),30000);
}
function persistDraft(){
 try{
  const payload={format:"lafrich-genesis-draft-store-v1",drafts};
  localStorage.setItem(DRAFT_KEY,JSON.stringify(payload));
 }catch(error){status("Draft not saved locally: "+error.message+". Export a JSON backup.",true)}
}
function loadStored(){
 let s=null;
 try{s=JSON.parse(localStorage.getItem(DRAFT_KEY)||"null")}catch{}
 if(s?.format==="lafrich-genesis-draft-store-v1"){
  for(const g of ["male","female"]){
   const x=s.drafts?.[g];
   if(!x?.rig)continue;
   try{
    const rig=C.validateMaster(x.rig);
    drafts[g]={rig,bound:x.bound?.format===BIND_FORMAT?x.bound:null,
     approved:!!x.approved&&!!x.bound,saved:!!x.saved,edited:String(x.edited||"")};
   }catch(e){status("Existing "+g+" draft invalid; preserved in storage: "+e.message,true)}
  }
 }
}
async function canvasFromData(data){
 const c=cv();
 if(data){
  const im=await R.loadPng(data);
  if(!im)throw Error("Cannot load original Genesis pixel PNG");
  c.getContext("2d").drawImage(im,0,0);
 }
 return c;
}
async function sourceCanvases(g){
 source[g]={};
 for(const d of DIR)source[g][d]=await canvasFromData(drafts[g].rig.layers.body[d]);
}
async function seed(g){
 // Only original approved source; never create an invented male/female placeholder.
 const original=root.VLGenesisSource?.bases?.[SOURCE[g]];
 if(!original||original.gender!==g||original.faceSource!=="emosi.exe")
  throw Error("Frozen V6B "+SOURCE[g]+" source not found");
 const native=await R.seedFromV6B(g),m=C.master(g);
 const canvases={};
 for(const d of DIR){
  const c=cv(),g2=c.getContext("2d",{willReadFrequently:true});
  g2.imageSmoothingEnabled=false;
  const files=R.resolveLayers(native,null,d);
  let drawn=0;
  for(const layer of C.LAYERS){
   const img=await R.loadPng(files[layer]);if(!img)continue;
   g2.drawImage(img,0,0);drawn++;
  }
  if(!drawn)throw Error("V6B source for "+g+" "+d+" has no layers");
  m.layers.body[d]=c.toDataURL("image/png");
  canvases[d]=c;
 }
 drafts[g]={rig:C.validateMaster(m),bound:null,approved:false,saved:false,edited:new Date().toISOString()};
 source[g]=canvases;
 flushCache();persistDraft();
}
async function ensure(g){
 if(drafts[g]&&source[g])return;
 if(drafts[g]){await sourceCanvases(g);return}
 await seed(g);
}
function pose(){
 const p=C.blankPose();
 if(step!=="test"&&step!=="save")return p;
 const preset=$("test-preset").value;
 if(preset==="arms"){
  p.arm_near_upper.a=-65;p.arm_far_upper.a=65;
  p.arm_near_lower.a=-23;p.arm_far_lower.a=23;
 }else if(preset==="walk"){
  p.leg_near_upper.a=22;p.leg_far_upper.a=-22;
  p.leg_near_lower.a=-18;p.leg_far_lower.a=25;
  p.arm_near_upper.a=-20;p.arm_far_upper.a=20;
 }else if(preset==="crouch"){
  p.torso.y=7;p.torso.a=8;
  p.leg_near_upper.a=-37;p.leg_far_upper.a=37;
  p.leg_near_lower.a=55;p.leg_far_lower.a=-55;
 }
 p[selected].a+=Number($("test-angle").value)||0;
 p[selected].x+=Number($("test-x").value)||0;
 p[selected].y+=Number($("test-y").value)||0;
 return p;
}
function activeRig(){
 return (step==="test"||step==="save")&&record().bound?
 record().bound.rig:master();
}
async function faceForPreview(){
 if(!faceId)return null;
 if(faceImage?.id===faceId)return faceImage.image;
 const f=faceEntries.find(x=>x.id===faceId);
 if(!f)return null;
 const img=await new Promise((resolve,reject)=>{
  const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error("Emosi PNG cannot load"));im.src=f.overlay;
 });
 faceImage={id:faceId,image:img};return img;
}
function maskHighlight(destination,d,rig){
 const mask=C.decode(rig.masks[d]),idx=PARTS.indexOf(selected);
 const raw=source[gender]?.[d]?.getContext("2d",{willReadFrequently:true})
  .getImageData(0,0,64,112).data;
 if(!raw)return;
 const image=destination.createImageData(64,112);
 for(let k=0;k<mask.length;k++){
  if(raw[k*4+3]===0)continue;
  const p=k*4;
  if(mask[k]===idx){image.data[p]=39;image.data[p+1]=126;image.data[p+2]=239;image.data[p+3]=83;}
  else if(step==="pixel"){image.data[p]=51;image.data[p+1]=61;image.data[p+2]=80;image.data[p+3]=30;}
 }
 const overlay=cv();overlay.getContext("2d").putImageData(image,0,0);
 destination.drawImage(overlay,0,0);
}
function showPivot(destination,d,rig){
 const p=rig.pivots[d][selected];
 destination.save();destination.strokeStyle="#ffffff";destination.lineWidth=1;
 destination.strokeRect(p.x-2.5,p.y-2.5,5,5);
 destination.strokeStyle="#e63351";destination.beginPath();
 destination.moveTo(p.x-6,p.y+.5);destination.lineTo(p.x+7,p.y+.5);
 destination.moveTo(p.x+.5,p.y-6);destination.lineTo(p.x+.5,p.y+7);
 destination.stroke();destination.restore();
}
async function renderAll(){
 if(!master()||page!=="workshop")return;
 const token=++renderRequest,currentGender=gender,currentStep=step,m=activeRig(),po=pose();
 let face=null;
 try{face=await faceForPreview()}catch(e){status(e.message,true)}
 for(const d of DIR){
  if(token!==renderRequest)return;
  try{
   const key=rev+"|"+currentGender+"|"+currentStep+"|"+d+"|"+faceId;
   let prepared=preparedCache.get(key);
   if(!prepared){
    prepared=await R.prepare(m,null,d,face);
    if(token!==renderRequest)return;
    preparedCache.set(key,prepared);
   }
   const output=R.render(prepared,po);
   if(token!==renderRequest)return;
   const out=cv(),o=out.getContext("2d");
   o.imageSmoothingEnabled=false;o.drawImage(output,0,0);
   if(currentStep==="pixel"||currentStep==="rig"){
    maskHighlight(o,d,m);
    if(currentStep==="rig")showPivot(o,d,m);
   }
   const view=$("thumb-"+d);
   if(view){const vc=view.getContext("2d");vc.imageSmoothingEnabled=false;vc.clearRect(0,0,64,112);vc.drawImage(out,0,0)}
   if(d===dir){
    ctx.clearRect(0,0,64,112);ctx.imageSmoothingEnabled=false;ctx.drawImage(out,0,0);
   }
  }catch(e){status("Preview "+d+": "+e.message,true);break}
 }
}
function buildAngleButtons(){
 const el=$("views");el.replaceChildren();
 for(const d of DIR){
  const btn=document.createElement("button");btn.type="button";btn.dataset.dir=d;
  const title=document.createElement("b");title.textContent=d.toUpperCase();
  const preview=document.createElement("canvas");preview.width=64;preview.height=112;preview.id="thumb-"+d;
  btn.append(title,preview);btn.onclick=()=>switchAngle(d);el.append(btn);
 }
}
function buildPartButtons(){
 const el=$("bodyparts");el.replaceChildren();
 for(const part of PARTS){
  const b=document.createElement("button");
  b.type="button";b.dataset.part=part;b.innerHTML=(C.PARENTS[part]?"↳ ":"◆ ")+
   "<strong>"+labels[part]+"</strong> <span class='parent'>"+(C.PARENTS[part]||"ROOT")+"</span>";
  b.onclick=()=>{selected=part;syncControls();void renderAll()};el.append(b);
 }
 const anatomy=$("anatomy");anatomy.replaceChildren();
 for(const part of PARTS){
  const line=document.createElement("div");
  line.textContent=(C.PARENTS[part]?" ↳ ":" ◆ ")+labels[part]+" ← "+(C.PARENTS[part]||"ROOT");
  anatomy.append(line);
 }
}
function syncControls(){
 $("gender").value=gender;
 $("pivot-x").value=master()?.pivots?.[dir]?.[selected]?.x??32;
 $("pivot-y").value=master()?.pivots?.[dir]?.[selected]?.y??50;
 $("selection-details").textContent=labels[selected]+" · "+dir.toUpperCase();
 $("side-title").textContent="SELECTED PART";
 $("viewdetail").textContent=gender.toUpperCase()+" · "+dir.toUpperCase()+
  " · "+labels[selected]+" · 64×112 px · "+(record()?.bound?"BOUND":"NOT BOUND");
 for(const b of document.querySelectorAll("#views button"))b.setAttribute("aria-pressed",String(b.dataset.dir===dir));
 for(const b of document.querySelectorAll("#bodyparts button"))b.setAttribute("aria-pressed",String(b.dataset.part===selected));
 for(const b of document.querySelectorAll("#progress button"))b.setAttribute("aria-selected",String(b.dataset.step===step));
 for(const section of document.querySelectorAll("[data-panel]"))section.classList.toggle("active",section.dataset.panel===step);
 $("rig-pivot").setAttribute("aria-pressed",String(tool==="pivot"));
 $("rig-paint").setAttribute("aria-pressed",String(tool==="paint"));
 $("rig-erase").setAttribute("aria-pressed",String(tool==="erase"));
 $("export-python").disabled=!record()?.bound;
 $("export-json").disabled=!record()?.bound;
 $("bind-next").disabled=!record()?.bound;
 $("cloud-master").disabled=!record()?.approved;
 $("download-master").disabled=!record()?.approved;
 $("download-binding").disabled=!record()?.bound;
 const title={pixel:"01 · PIXEL EDITOR · "+labels[selected],rig:"02 · PIVOT + SLICING · "+labels[selected],
  bind:"03 · PYTHON / RIG DATA BINDING",test:"04 · ANIMATION-FREE BINDING CHECK",save:"05 · MASTER LAFRICH GENESIS"};
 $("preview-title").textContent=title[step];
 const b=record()?.bound;
 $("binding-result").textContent=b?
  ("BOUND · "+b.id+" · 10 parts · 4 views · "+
   (record().approved?"APPROVED":"TEST REQUIRED")):"NOT BOUND · Edit pixels, pivots, masks, then bind.";
 $("master-details").textContent=record()?.saved?
  ("MASTER SAVED: "+MASTER_IDS[gender]+" · Ready for future Character Editor and Python animation database"):
  ("MASTER NOT YET SAVED · "+(record()?.approved?"binding approved":"binding test pending"));
}
function switchAngle(d){
 if(!DIR.includes(d))return;
 dir=d;syncControls();void renderAll();
}
function switchStep(next){
 if(!STEPS.includes(next))return;
 if((next==="test"||next==="save")&&!record()?.bound){status("Bind all 4 views before checking",true);next="bind"}
 if(next==="save"&&!record()?.approved){status("Approve the binding in CHECK BINDING before saving master",true);next="test"}
 step=next;syncControls();void renderAll();
}
function setZoom(z){
 zoom=clamp(Number(z)||5,2,14);$("zoom").value=zoom;$("zoom-label").textContent=zoom*100+"%";
 canvas.style.width=(64*zoom)+"px";canvas.style.height=(112*zoom)+"px";
}
function coords(e){
 const r=canvas.getBoundingClientRect();
 return {x:clamp(Math.floor((e.clientX-r.left)/r.width*64),0,63),
  y:clamp(Math.floor((e.clientY-r.top)/r.height*112),0,111)};
}
function snapshot(){
 maskUndo.push({dir,pivots:clone(master().pivots[dir]),mask:master().masks[dir]});
 if(maskUndo.length>32)maskUndo.shift();maskRedo=[];
}
function applySnapshot(which,opposite){
 if(!which.length)return;
 opposite.push({dir,pivots:clone(master().pivots[dir]),mask:master().masks[dir]});
 const s=which.pop();master().pivots[s.dir]=s.pivots;master().masks[s.dir]=s.mask;
 dir=s.dir;makeDirty();syncControls();
}
function maskPaint(p,erase){
 const m=master(),mask=C.decode(m.masks[dir]),idx=PARTS.indexOf(selected),size=Number($("mask-brush").value)||3;
 const half=Math.floor(size/2);
 for(let y=Math.max(0,p.y-half);y<=Math.min(111,p.y+half);y++)
  for(let x=Math.max(0,p.x-half);x<=Math.min(63,p.x+half);x++)
   mask[y*64+x]=erase?255:idx;
 m.masks[dir]=C.encode(mask);
 flushCache();
}
function setPivot(x,y){
 const p=master().pivots[dir][selected];
 p.x=clamp(Math.round(x),0,63);p.y=clamp(Math.round(y),0,111);
 makeDirty();syncControls();
}
function bindMaskCopy(flipped){
 if(!maskCopied){status("Copy a mask first",true);return}
 snapshot();
 const src=C.decode(maskCopied),dst=new Uint8Array(C.N);
 for(let y=0;y<112;y++)for(let x=0;x<64;x++){
  let v=src[y*64+(flipped?63-x:x)];
  if(flipped&&v!==255){
   let p=PARTS[v];
   if(p.includes("_near_"))p=p.replace("_near_","_far_");
   else if(p.includes("_far_"))p=p.replace("_far_","_near_");
   v=PARTS.indexOf(p);
  }
  dst[y*64+x]=v;
 }
 master().masks[dir]=C.encode(dst);makeDirty();syncControls();
}
function channel(v){return cv().getContext("2d",{willReadFrequently:true})}
async function openPixels(){
 if(step!=="pixel")return switchStep("pixel");
 if(!P)throw Error("Original pixel editor engine missing");
 const atlas=document.createElement("canvas");atlas.width=64;atlas.height=448;
 const a=atlas.getContext("2d",{willReadFrequently:true}),refs={};
 const idx=PARTS.indexOf(selected);
 for(let i=0;i<4;i++){
  const d=DIR[i],src=source[gender][d],raw=src.getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112);
  const mask=C.decode(master().masks[d]);
  for(let k=0;k<C.N;k++)if(mask[k]!==idx)raw.data.fill(0,k*4,k*4+4);
  a.putImageData(raw,0,i*112);refs[d]=src;
 }
 if(!pixelEditor){
  pixelEditor=P.create({overlay:$("pixelOverlay"),canvas:$("pixelCanvas"),
   onApply:applyPixels,onSaveDefault:applyPixels,onRestore:()=>{}});
 }
 pixelSession={gender,selected};
 pixelEditor.open({id:"LAFRICH GENESIS "+gender.toUpperCase()+" / "+selected,
  initialAtlas:atlas,originalAtlas:atlas,referenceImages:refs,direction:dir});
 status("Pixel editing "+labels[selected]+" · independent SE/SW/NE/NW. APPLY commits all four angles.");
}
function applyPixels(){
 if(!pixelSession||pixelSession.gender!==gender||pixelSession.selected!==selected){
  status("Pixel editing context changed; source not modified",true);return false;
 }
 try{
  const atl=pixelEditor.getAtlas(),g=atl.getContext("2d",{willReadFrequently:true});
  const next={};
  const idx=PARTS.indexOf(selected);
  for(let di=0;di<4;di++){
   const d=DIR[di],src=source[gender][d],s=src.getContext("2d",{willReadFrequently:true});
   const old=s.getImageData(0,0,64,112),edited=g.getImageData(0,di*112,64,112);
   const mask=C.decode(master().masks[d]);
   const image=old.data,part=edited.data;
   for(let k=0;k<C.N;k++){
    const p=k*4;
    if(mask[k]===idx){image.fill(0,p,p+4);mask[k]=255}
    if(part[p+3]){
     image.set(part.subarray(p,p+4),p);mask[k]=idx;
    }
   }
   const c=cv();c.getContext("2d").putImageData(old,0,0);
   next[d]={canvas:c,mask:C.encode(mask),png:c.toDataURL("image/png")};
  }
  for(const d of DIR){
   source[gender][d]=next[d].canvas;
   master().layers.body[d]=next[d].png;
   master().masks[d]=next[d].mask;
  }
  pixelSession=null;makeDirty();syncControls();
  status("APPLIED "+labels[selected]+" · 4 direction pixels saved as a draft; binding invalidated.");
  return true;
 }catch(e){status("Pixel editor Apply failed: "+e.message,true);return false}
}
async function audit(){
 const m=C.validateMaster(master()),errors=[],counts={};
 for(const d of DIR){
  const mask=C.decode(m.masks[d]),raw=source[gender][d].getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112);
  let unassigned=0,visible=0;const per=Array(PARTS.length).fill(0);
  for(let k=0;k<C.N;k++){
   if(!raw.data[k*4+3])continue;
   visible++;
   if(mask[k]===255)unassigned++;else per[mask[k]]++;
  }
  counts[d]={visible,unassigned,per};
  if(unassigned)errors.push(d.toUpperCase()+": "+unassigned+" visible pixels unassigned");
  for(let i=0;i<PARTS.length;i++)if(!per[i])errors.push(d.toUpperCase()+": "+PARTS[i]+" has no pixels");
 }
 return {m,errors,counts};
}
async function makeBinding(){
 try{
  const report=await audit();
  if(report.errors.length){
   status("Cannot bind: "+report.errors.slice(0,3).join("; ")+(report.errors.length>3?"…":""),true);
   $("binding-result").textContent=report.errors.join(" · ");
   return;
  }
  const m=report.m;
  const out={
   format:BIND_FORMAT,id:MASTER_IDS[gender],gender,sourceId:SOURCE[gender],
   originalNative:"V6B",faceSource:"emosi.exe",
   frame:{width:64,height:112,pivot:[32,100],directions:[...DIR]},
   hierarchy:{parts:[...PARTS],parents:clone(C.PARENTS),drawOrder:[...C.DRAW_ORDER]},
   views:Object.fromEntries(DIR.map(d=>[d,{
    pivots:clone(m.pivots[d]),maskBase64:m.masks[d],
    spritePng:m.layers.body[d],coverage:report.counts[d].visible
   }])),
   rig:clone(m),pythonEngine:"genesis_procedural_runtime.py",
   createdAt:new Date().toISOString()
  };
  record().bound=out;record().approved=false;record().saved=false;
  persistDraft();syncControls();status("Pivots + slice maps bound for ALL FOUR views. Open CHECK BINDING.");
 }catch(e){status("Binding failed: "+e.message,true)}
}
function validatedBinding(){
 const b=record()?.bound;
 if(!b||b.format!==BIND_FORMAT||b.gender!==gender||b.id!==MASTER_IDS[gender])
  throw Error("Genesis binding missing / invalid");
 C.validateMaster(b.rig);
 for(const d of DIR)if(!b.views?.[d]||!b.views[d].spritePng)throw Error("Missing "+d+" binding");
 return b;
}
function toMaster(){
 const b=validatedBinding();
 return {format:MASTER_FORMAT,id:b.id,gender,sourceId:SOURCE[gender],
  faceSource:"emosi.exe",approvedAt:new Date().toISOString(),
  animationContract:"lafrich-genesis-binding-v1",binding:clone(b)};
}
function toPython(b){
 // Python accepts declarative JSON string: geometry and RGBA PNG data. Never
 // execute imported browser code. Procedural animation is applied to pivots.
 const value=JSON.stringify(b).replace(/'''/g,"");
 return "# LAFRICH GENESIS MASTER · four-angle / 10-piece / no baked face\n"+
  "# Machine-readable Python source. Motion is computed from time + transforms,\n"+
  "# NOT stored as rendered frame-by-frame sprites. Use genesis_procedural_runtime.py.\n"+
  "import json\nLAFRICH_GENESIS = json.loads(r'''"+value+"''')\n";
}
function exportPython(){try{
 const b=validatedBinding();download(b.id+"_binding.py",toPython(b),"text/x-python");
 status("Exported declarative Python rig + 4-angle pixel binding.");
 }catch(e){status(e.message,true)}
}
function exportJson(){try{
 const b=validatedBinding();download(b.id+"_binding.json",JSON.stringify(b,null,2));
 }catch(e){status(e.message,true)}
}
function saveApproved(){
 if(!record().approved)return status("CHECK BINDING must be approved first",true);
 try{
  const v=toMaster();
  const all=JSON.parse(localStorage.getItem(MASTER_KEY)||"{}");
  all[gender]=v;
  localStorage.setItem(MASTER_KEY,JSON.stringify(all));
  record().saved=true;persistDraft();syncControls();
  root.dispatchEvent(new CustomEvent("lafrich:genesis-master-saved",{detail:{gender,id:v.id}}));
  status("APPROVED MASTER SAVED · "+v.id+" · local database ready for Character Editor.");
 }catch(e){status("Master save failed: "+e.message,true)}
}
async function cloudSave(){
 try{
  if(!record().approved)throw Error("Approve binding before cloud save");
  const d=root.VLGenesisCloud;if(!d?.connected())throw Error("CONNECT DRIVE first");
  const v=toMaster();
  await d.save(v.id,v);
  saveApproved();
  $("statuscloud").textContent="DRIVE VERIFIED";
  status("Drive read-back verified · "+v.id+" · canonical Genesis Master");
 }catch(e){status("Cloud save: "+e.message,true)}
}
async function cloudLoad(){
 try{
  const d=root.VLGenesisCloud;if(!d?.connected())throw Error("CONNECT DRIVE first");
  const data=await d.load(MASTER_IDS[gender]);
  if(!data)throw Error("No approved Genesis Master for "+gender+" on Drive");
  if(data.format!==MASTER_FORMAT||data.gender!==gender||data.id!==MASTER_IDS[gender]||
    data.binding?.format!==BIND_FORMAT)throw Error("Invalid Genesis cloud master");
  if(!confirm("Replace current "+gender+" draft with this verified Drive master? Unsaved edits will be lost."))return;
  drafts[gender]={rig:C.validateMaster(data.binding.rig),bound:data.binding,
   approved:true,saved:true,edited:data.approvedAt||""};
  await sourceCanvases(gender);persistDraft();flushCache();syncControls();renderAll();
  status("Verified Genesis Master loaded from Drive: "+data.id);
 }catch(e){status("Cloud load: "+e.message,true)}
}
async function refreshFace(){
 try{
  const b=root.VLMahlukEmosiBridge;if(!b)throw Error("Emosi bridge unavailable");
  const state=await b.refresh();
  const actor={gender,template_category:"human",id:SOURCE[gender],expressions:[]};
  b.apply(actor);faceEntries=actor.expressions.filter(x=>x.source==="emosi"&&x.overlay);
  const sel=$("face");sel.replaceChildren(new Option("BLANK / NONE",""));
  for(const f of faceEntries)sel.add(new Option(f.label||f.id,f.id));
  if(faceEntries.some(f=>f.id===faceId))sel.value=faceId;else{faceId="";faceImage=null}
  status("Emosi.exe: "+faceEntries.length+" compatible authored faces available; body art unchanged.");
  void renderAll();
 }catch(e){status("Emosi refresh: "+e.message,true)}
}
function setup(){
 buildAngleButtons();buildPartButtons();
 for(const b of document.querySelectorAll("#progress button"))b.onclick=()=>switchStep(b.dataset.step);
 $("gender").onchange=async e=>{
  const g=e.target.value;
  if(!SOURCE[g])return;
  try{
   gender=g;dir="se";selected="head";maskUndo=[];maskRedo=[];faceId="";faceImage=null;
   await ensure(g);syncControls();flushCache();void refreshFace();
  }catch(err){status("V6B source error: "+err.message,true)}
 };
 $("seed").onclick=async()=>{
  if(!confirm("Reset "+gender+" draft from the ORIGINAL frozen V6B source? This replaces all unsaved pixels, masks and binding."))return;
  try{await seed(gender);step="pixel";syncControls();status("Restored ORIGINAL V6B "+gender+"; previous approved master left untouched.")}catch(e){status(e.message,true)}
 };
 $("save-draft").onclick=()=>{persistDraft();download("genesis_"+gender+"_draft.json",JSON.stringify(record(),null,2));status("Editable draft exported and saved locally (NOT approved).")};
 $("pixel-next").onclick=()=>switchStep("rig");
 $("rig-next").onclick=()=>switchStep("bind");
 $("edit-pixels").onclick=()=>void openPixels().catch(e=>status(e.message,true));
 $("rig-pivot").onclick=()=>{tool="pivot";syncControls()};
 $("rig-paint").onclick=()=>{tool="paint";syncControls()};
 $("rig-erase").onclick=()=>{tool="erase";syncControls()};
 for(const field of ["x","y"])$("pivot-"+field).onchange=()=>{
  snapshot();setPivot(Number($("pivot-x").value),Number($("pivot-y").value));
 };
 $("copy-slice").onclick=()=>{maskCopied=master().masks[dir];status("Copied complete "+dir.toUpperCase()+" slice map")};
 $("paste-slice").onclick=()=>bindMaskCopy(false);
 $("flip-slice").onclick=()=>bindMaskCopy(true);
 $("rig-undo").onclick=()=>applySnapshot(maskUndo,maskRedo);
 $("rig-redo").onclick=()=>applySnapshot(maskRedo,maskUndo);
 $("make-binding").onclick=()=>void makeBinding();
 $("export-python").onclick=exportPython;
 $("export-json").onclick=exportJson;
 $("bind-next").onclick=()=>switchStep("test");
 $("test-preset").onchange=()=>void renderAll();
 for(const id of ["test-angle","test-x","test-y"])$(id).oninput=()=>void renderAll();
 $("edit-binding").onclick=()=>{record().bound=null;record().approved=false;record().saved=false;
  persistDraft();switchStep("rig");status("Binding reopened. Edit pivots/slices and BIND again.")};
 $("approve-binding").onclick=()=>{try{validatedBinding();record().approved=true;persistDraft();
   switchStep("save");status("BINDING APPROVED · save as canonical Lafrich Genesis Master");
  }catch(e){status(e.message,true)}};
 $("save-master").onclick=saveApproved;
 $("download-master").onclick=()=>{try{download(MASTER_IDS[gender]+".json",JSON.stringify(toMaster(),null,2));status("Master JSON downloaded")}catch(e){status(e.message,true)}};
 $("download-binding").onclick=exportPython;
 $("cloud-master").onclick=()=>void cloudSave();
 $("load-cloud").onclick=()=>void cloudLoad();
 $("connect-drive").onclick=async()=>{
  try{await root.VLGenesisCloud.connect();$("connect-drive").textContent="☁ CONNECTED";$("statuscloud").textContent="DRIVE CONNECTED";
   status("Genesis cloud connected; no legacy animation or character records touched.");
  }catch(e){status("Drive: "+e.message,true)}
 };
 $("face").onchange=()=>{faceId=$("face").value;faceImage=null;flushCache()};
 $("refresh-face").onclick=()=>void refreshFace();
 $("open-face").onclick=()=>showPage("emotion");
 $("open-separate")?.addEventListener("click",()=>{});
 $("nav-workshop").onclick=()=>showPage("workshop");
 $("nav-emotion").onclick=()=>showPage("emotion");
 $("fullscreen").onclick=()=>root.open(location.href,"_blank","noopener,noreferrer");
 $("zoom-out").onclick=()=>setZoom(zoom-1);$("zoom-in").onclick=()=>setZoom(zoom+1);
 $("zoom-fit").onclick=()=>{const v=$("stagewrap");setZoom(Math.max(2,Math.min(14,Math.floor(Math.min((v.clientWidth-20)/64,(v.clientHeight-20)/112))))};
 $("zoom").oninput=()=>setZoom($("zoom").value);
 $("stagewrap").addEventListener("wheel",e=>{if(page!=="workshop")return;e.preventDefault();setZoom(zoom+(e.deltaY<0?1:-1))},{passive:false});
 canvas.addEventListener("pointerdown",e=>{
  if(step!=="rig"||e.button!==0)return;
  const p=coords(e);snapshot();canvas.setPointerCapture?.(e.pointerId);
  paintDrag={id:e.pointerId,last:""};
  if(tool==="pivot"){setPivot(p.x,p.y)}
  else maskPaint(p,tool==="erase");
 });
 canvas.addEventListener("pointermove",e=>{
  if(!paintDrag||paintDrag.id!==e.pointerId||step!=="rig")return;
  const p=coords(e),key=p.x+"|"+p.y;
  if(paintDrag.last===key)return;paintDrag.last=key;
  if(tool==="pivot")setPivot(p.x,p.y);
  else maskPaint(p,tool==="erase");
 });
 const end=e=>{
  if(paintDrag?.id!==e.pointerId)return;
  paintDrag=null;makeDirty();syncControls();
 };
 for(const k of ["pointerup","pointercancel","lostpointercapture"])canvas.addEventListener(k,end);
 setZoom(5);
}
function showPage(next){
 page=next;
 const isEmotion=next==="emotion";
 $("workspace").hidden=isEmotion;$("progress").hidden=isEmotion;
 $("emotionpanel").style.display=isEmotion?"block":"none";
 $("nav-emotion").setAttribute("aria-selected",String(isEmotion));
 $("nav-workshop").setAttribute("aria-selected",String(!isEmotion));
 if(isEmotion&&$("emotion-frame").src==="about:blank")
  $("emotion-frame").src="/virtual-office/emotion-studio/";
 if(!isEmotion)void renderAll();
}
async function boot(){
 try{
  if(!C||!R||!P)throw Error("Required anatomy, compositor or pixel editor engine absent");
  loadStored();setup();
  await ensure(gender);
  syncControls();await renderAll();
  status("Frozen Genesis MALE loaded · ready to edit 10 body parts across four directions.");
  void refreshFace();
 }catch(e){status("Genesis boot failed: "+e.message,true)}
}
void boot();
})(window);
