/* LGR WARDROBE ADJUST — 24 artist-guided draft variants. Draft-only.
 * Uses native Genesis/Pixel Editor runtime. No Genesis masks, skin keys,
 * pivots, original 6 baselines, or cloud game masters are modified.
 */
(function(root){"use strict";
const DIRS=["se","sw","ne","nw"],GROUPS=["top","pants","shoes"];
const LOCAL="lgr1-pakaian-drafts-v1",SEEDS="./media/lgr1/wardrobe-adjust/variant-seeds.json";
const $=id=>document.getElementById(id),A=()=>root.MahlukPakaian;
let catalog=null,current=null,refCache=new Map(),drawTicket=0,working=false,drag=null,offsets={};
const OFFSET_KEY="lgr-wardrobe-adjust-offsets-v1";
const labels={top:"Atasan",pants:"Celana",shoes:"Sepatu"};
const nice=x=>x.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
const k=o=>o.gender+"|"+o.group+"|"+o.variant;
const localRead=()=>{try{return JSON.parse(localStorage.getItem(LOCAL)||"{}")||{}}catch{return {}}};
const setStatus=(msg,bad=false)=>{const e=$("wa-status");if(e){e.textContent=msg;e.classList.toggle("error",bad)}};
const canvas=(w=64,h=112)=>{const c=document.createElement("canvas");c.width=w;c.height=h;return c};
function selectOptions(id,options,selected){const target=$(id);target.replaceChildren(...options.map(o=>new Option(o.label,o.value)));target.value=selected;}
function warnRig(bases){
 const mismatches=catalog.variants.filter(v=>v.baseRigSha256!==bases?.[v.gender]?.pkg?.rigSha256||
  v.baseVersion!==bases?.[v.gender]?.version);
 if(mismatches.length){setStatus("PERINGATAN: Genesis aktif berubah; "+mismatches.length+" draft perlu review ulang.",true);return false}
 return true;
}
function ensureSeeds(){
 const records=localRead(),created=[];
 for(const v of catalog.variants){
  const id=k(v);
  if(records[id])continue; // NEVER destroy an artist's edits.
  records[id]={format:"lgr1-wardrobe-master-v1",gender:v.gender,group:v.group,variant:v.variant,
   baseVersion:v.baseVersion,baseRigSha256:v.baseRigSha256,dirs:DIRS,cell:[64,112],strip:[256,112],
   keyColours:true,files:{...v.files},approved:false,referenceOnly:true,
   sourceBaseline:v.sourceBaseline,updated:new Date().toISOString(),
   note:"24-varian draft from Lafrich baseline. Preview ONLY; not game master."};
  created.push(id);
 }
 try{localStorage.setItem(LOCAL,JSON.stringify(records))}
 catch(e){setStatus("Storage browser penuh. Export JSON lebih dulu. "+e.message,true);throw e}
 return created.length;
}
function seedFor(o){return catalog.variants.find(v=>v.gender===o.gender&&v.group===o.group&&v.variant===o.variant)}
async function select(gender,group,variant,dir="se",side="front"){
 if(!catalog.variants.some(v=>v.gender===gender&&v.group===group&&v.variant===variant))throw Error("Draft variant not found");
 const opts=catalog.variants.filter(v=>v.gender===gender&&v.group===group).map(v=>({value:v.variant,label:nice(v.variant)}));
 selectOptions("wa-variant",opts,variant);
 $("wa-gender").value=gender;$("wa-group").value=group;
 $("wa-dir").value=dir;$("wa-side").value=side;
 $("wa-side").disabled=group!=="top";
 const prev=working;working=true;
 try{
  current=await A().selectOutfit({gender,group,variant,dir,side});
  $("wa-side").value=current.side;
  $("wa-active").textContent=gender.toUpperCase()+" / "+labels[group].toUpperCase()+" / "+nice(variant);
  $("wa-rig").textContent="Genesis "+(gender==="male"?"Male Official-8":"Female Official-9")+
    " · "+(seedFor(current)?.baseRigSha256||"").slice(0,12)+"…";
  $("wa-dir").value=current.dir;
  setStatus("DRAFT aktif. Geser dengan panah atau drag di karakter; save ke browser, export JSON untuk dibagikan.");
  await renderStage();drawReviewThumbnails();
 }finally{working=prev}
}
async function setDirection(dir){if(!DIRS.includes(dir)||!current)return;
 await select(current.gender,current.group,current.variant,dir,current.side);
}
async function setSide(side){if(!current)return;
 await select(current.gender,current.group,current.variant,current.dir,side);
}
function selectedChange(){if(working||!catalog)return;
 const gender=$("wa-gender").value,group=$("wa-group").value;
 const options=catalog.variants.filter(x=>x.gender===gender&&x.group===group);
 const v=options.find(x=>x.variant===$("wa-variant").value)||options[0];
 if(v)void select(gender,group,v.variant,current?.dir||"se","front").catch(showError);
}
function colorSpec(){
 const shade=$("pk-color")?.value||"navy";
 return {skin:$("pk-tone")?.value||"light",top:current?.group==="top"?current.variant:"tee",
  topColor:current?.group==="top"?shade:"navy",pants:"trousers",
  pantsColor:current?.group==="pants"?shade:"denim",shoes:"shoes",
  shoesColor:current?.group==="shoes"?shade:"white",hair:"none"};
}
async function bodyReference(gender,tone,dir){
 const key=gender+"|"+tone+"|"+dir;
 if(!refCache.has(key)){
  const p=(async()=>{
   const master=await root.LGRActor.master(gender,tone);
   const prep=await root.LafrichPuppetRenderer.prepare(master,null,dir);
   return root.LafrichPuppetRenderer.render(prep,root.LafrichPuppetCore.blankPose());
  })();refCache.set(key,p);
 }
 return refCache.get(key);
}
async function renderStage(deltaX=0,deltaY=0){
 if(!current)return;
 const ticket=++drawTicket;
 try{
  const ctx=await A().pixelContext(),cellIndex=DIRS.indexOf(current.dir);
  const bare=await bodyReference(current.gender,ctx.tone,current.dir);
  if(ticket!==drawTicket)return;
  const main=$("wa-stage"),g=main.getContext("2d");g.imageSmoothingEnabled=false;
  g.fillStyle="#f0f3f8";g.fillRect(0,0,64,112);
  for(let y=0;y<112;y+=8)for(let x=0;x<64;x+=8){if((x/8+y/8)%2===0){g.fillStyle="#dfe7f1";g.fillRect(x,y,8,8)}}
  if($("wa-show-body").checked)g.drawImage(bare,0,0,64,112);
  const rgba=ctx.canvas.getContext("2d",{willReadFrequently:true}).getImageData(cellIndex*64,0,64,112);
  root.LGRWear.recolor(rgba.data,root.LGRWear.lookup(colorSpec()));
  const garment=canvas();garment.getContext("2d").putImageData(rgba,0,0);
  const opacity=Math.max(.2,Math.min(1,Number($("wa-opacity").value||100)/100));
  g.save();g.globalAlpha=opacity;g.drawImage(garment,deltaX,deltaY);g.restore();
  if($("wa-show-grid").checked){
   g.save();g.strokeStyle="rgba(15,40,80,.22)";g.lineWidth=.25;g.beginPath();
   for(let x=0;x<=64;x++){g.moveTo(x,0);g.lineTo(x,112)}
   for(let y=0;y<=112;y++){g.moveTo(0,y);g.lineTo(64,y)}
   g.stroke();g.restore();
  }
  $("wa-offset").textContent="View "+current.dir.toUpperCase()+" · "+current.side.toUpperCase()+
    (drag?" · ΔX "+deltaX+" · ΔY "+deltaY:"");
 }catch(e){if(ticket===drawTicket)showError(e)}
}
function drawReviewThumbnails(){
 if(!current)return;
 for(let i=0;i<4;i++){
  const dest=$("wa-v"+i),source=$("pk-r"+i);if(!dest||!source)continue;
  const g=dest.getContext("2d");g.imageSmoothingEnabled=false;g.clearRect(0,0,64,112);
  g.fillStyle="#ecf1f7";g.fillRect(0,0,64,112);g.drawImage(source,0,0,64,112);
  dest.parentElement.setAttribute("aria-pressed",String(current.dir===DIRS[i]));
 }
}
async function nudge(dx,dy){
 if(!current)return;
 const step=Math.max(1,Math.min(8,Number($("wa-step").value)||1));
 await A().translateView(dx*step,dy*step);
 await renderStage();
 setStatus("Geser "+(dx*step)+", "+(dy*step)+" px di "+current.dir.toUpperCase()+" · "+current.side+". SAVE DRAFT untuk menyimpan.");
}
function showError(e){console.error(e);setStatus(e?.message||String(e),true)}
function download(name,obj){
 const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),20000);
}
async function exportCurrent(){
 A().saveOutfitDraft();
 await A().exportDraft();
 setStatus("JSON empat arah berhasil diexport sebagai DRAFT. Belum masuk game.");
}
function exportAll(){
 A().saveOutfitDraft();
 const store=localRead(),entries=catalog.variants.map(v=>store[k(v)]).filter(Boolean);
 const data={format:"lgr-wardrobe-adjust-bundle-v1",source:"24 LGR wardrobe draft variants",
  approved:false,baseVersion:catalog.variants[0].baseVersion,
  exported:new Date().toISOString(),entries};
 download("LGR_24_Adjusted_Wardrobe_DRAFTS.json",data);
 setStatus("Export bundle "+entries.length+" draft. Tidak mengaktifkan master game.");
}
async function resetCurrent(){
 if(!current||!root.confirm("RESET "+k(current)+" ke draft awal 24 varian? Editan varian ini di browser akan ditimpa. Genesis/game tidak berubah."))return;
 const seed=seedFor(current),store=localRead();
 store[k(current)]={format:"lgr1-wardrobe-master-v1",gender:seed.gender,group:seed.group,variant:seed.variant,
  baseVersion:seed.baseVersion,baseRigSha256:seed.baseRigSha256,dirs:DIRS,cell:[64,112],strip:[256,112],
  keyColours:true,approved:false,referenceOnly:true,files:{...seed.files},
  updated:new Date().toISOString(),note:"Reset to Lafrich draft variant source"};
 localStorage.setItem(LOCAL,JSON.stringify(store));
 await A().refreshOutfit();await renderStage();drawReviewThumbnails();
 setStatus("Reset ke sumber draft varian (belum game).",false);
}
function attachDrag(){
 const stage=$("wa-stage");
 stage.addEventListener("pointerdown",e=>{
  if(e.button!==0||!current)return;
  e.preventDefault();stage.setPointerCapture(e.pointerId);
  const r=stage.getBoundingClientRect();
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,px:0,py:0,w:r.width,h:r.height};
 });
 stage.addEventListener("pointermove",e=>{
  if(!drag||e.pointerId!==drag.id)return;
  drag.px=Math.round((e.clientX-drag.x)/drag.w*64);
  drag.py=Math.round((e.clientY-drag.y)/drag.h*112);
  void renderStage(drag.px,drag.py);
 });
 async function endDrag(e,commit){
  if(!drag||e.pointerId!==drag.id)return;
  const dx=drag.px,dy=drag.py;drag=null;
  if(commit&&(dx||dy)){try{await A().translateView(dx,dy)}catch(e){showError(e)}}
  await renderStage();
 }
 stage.addEventListener("pointerup",e=>void endDrag(e,true));
 stage.addEventListener("pointercancel",e=>void endDrag(e,false));
}
function wire(){
 for(const id of ["wa-gender","wa-group","wa-variant"])$(id).addEventListener("change",selectedChange);
 $("wa-dir").addEventListener("change",e=>void setDirection(e.target.value).catch(showError));
 $("wa-side").addEventListener("change",e=>void setSide(e.target.value).catch(showError));
 for(const id of ["wa-show-grid","wa-show-body","wa-opacity"]){$(id).addEventListener("input",()=>void renderStage())}
 $("wa-open-pixel").onclick=()=>root.PakaianPixelEditor.open();
 $("wa-save").onclick=()=>{try{A().saveOutfitDraft();setStatus("Draft disimpan di browser perangkat ini. Export JSON untuk backup/pindah perangkat.")}catch(e){showError(e)}};
 $("wa-export").onclick=()=>void exportCurrent().catch(showError);
 $("wa-export-all").onclick=()=>{try{exportAll()}catch(e){showError(e)}};
 $("wa-reset").onclick=()=>void resetCurrent().catch(showError);
 $("wa-undo").onclick=()=>{$("pk-undo").click();void renderStage()};
 $("wa-redo").onclick=()=>{$("pk-redo").click();void renderStage()};
 for(const b of document.querySelectorAll("[data-nudge]")){
  const [dx,dy]=b.dataset.nudge.split(",").map(Number);
  b.onclick=()=>void nudge(dx,dy).catch(showError);
 }
 for(let i=0;i<4;i++)$("wa-view"+i).onclick=()=>void setDirection(DIRS[i]).catch(showError);
 $("wa-motion").onchange=e=>{$("pk-motion").value=e.target.value;$("pk-motion").dispatchEvent(new Event("change",{bubbles:true}))};
 $("wa-play").onclick=()=>{const b=$("pk-play");b.click();$("wa-play").textContent=b.textContent};
 $("pk-tone").addEventListener("change",()=>{refCache.clear();void renderStage()});
 $("pk-color").addEventListener("change",()=>void renderStage());
 root.addEventListener("lgr-wardrobe-nudged",()=>void renderStage());
 root.addEventListener("lgr-pakaian-preview-ready",()=>{drawReviewThumbnails()});
 root.addEventListener("pakaian-pixels-applied",()=>{void renderStage();drawReviewThumbnails()});
 root.addEventListener("pagehide",()=>{try{A()?.saveOutfitDraft()}catch(e){console.warn(e)}});
 attachDrag();
}
async function init(){
 try{
  setStatus("Memuat 24 varian dan Genesis aktif…");
  const res=await fetch(SEEDS,{cache:"no-cache"});
  if(!res.ok)throw Error("24 source variants missing (HTTP "+res.status+")");
  catalog=await res.json();
  if(catalog.format!=="lgr-wardrobe-adjust-seeds-v1"||catalog.variants?.length!==24||
   catalog.dirs.join()!==DIRS.join())throw Error("Variant data invalid: expected 24 four-view drafts");
  const bases=await root.LGRActor.loadBases();
  const good=warnRig(bases);
  const added=ensureSeeds();
  await A().init($("pakaianpanel"));
  if(!A().currentOutfit)throw Error("Outfit adjust bridge not found; reload the page");
  selectOptions("wa-gender",[{value:"male",label:"Male"},{value:"female",label:"Female"}],"male");
  selectOptions("wa-group",GROUPS.map(g=>({value:g,label:labels[g]})),"top");
  selectOptions("wa-dir",DIRS.map(d=>({value:d,label:d.toUpperCase()})),"se");
  selectOptions("wa-side",[{value:"front",label:"Front"},{value:"back",label:"Back"}],"front");
  wire();await select("male","top","tee_long","se","front");
  $("wa-count").textContent="24 VARIAN · "+added+" BARU · "+(24-added)+" DRAFT LOKAL DILINDUNGI";
  if(!good)setStatus("Genesis tidak sesuai checksum preview. Edit tetap bisa dilakukan, jangan publish sebagai master sebelum direview.",true);
 }catch(e){showError(e)}
}
root.addEventListener("DOMContentLoaded",()=>void init());
})(window);