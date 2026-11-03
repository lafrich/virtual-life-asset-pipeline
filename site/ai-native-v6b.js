/* Mahluk Hidup AI Character — use the EXISTING V6B sprite bases and remote
 * reviewed GitHub draft flow. No fake JS body geometry or fake rig playback.
 * Passcode and uploaded reference images are never saved in localStorage.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const BASES={
 human_male_base:"media/human-male-base-sheet.png",
 human_female_base:"media/human-female-base-sheet.png",
 astrofrich_base:"media/astrofrich-base-sheet.png"
};
const dirs=["SE","SW","NE","NW"];
const STORAGE="mahluk-native-ai-character-form-v1";
const QUEUE="mahluk-native-ai-requests-v1";
const refs=new Map(),canvas=$("preview"),ctx=canvas.getContext("2d");
let catalog={},image=null,latest=null,sourceMode="base",pollTimer=null,revision=0;
ctx.imageSmoothingEnabled=false;
function stage(s){$("stage").textContent=s}
function status(s){$("status").textContent=s}
function loadJSON(key,otherwise){try{return JSON.parse(localStorage.getItem(key)||"null")??otherwise}catch{return otherwise}}
function saveForm(){
 try{localStorage.setItem(STORAGE,JSON.stringify({
  name:$("name").value,base:$("base").value,prompt:$("prompt").value,
  url:$("backend-url").value
 }))}catch{}
}
function drawNotice(label){
 ctx.clearRect(0,0,256,304);ctx.fillStyle="#eff3f9";ctx.fillRect(17,9,222,290);
 ctx.fillStyle="#294a78";ctx.font="bold 11px monospace";ctx.fillText(label,28,130);
}
function drawFour(){
 if(!image||!image.naturalWidth){drawNotice("LOADING NATIVE V6B…");return}
 ctx.clearRect(0,0,256,304);ctx.imageSmoothingEnabled=false;
 const pos=[[24,5],[145,5],[24,157],[145,157]];
 for(let d=0;d<4;d++){
  const [x,y]=pos[d],row=4+d; // actual V6B idle row.
  ctx.drawImage(image,0,row*112,64,112,x,y,82,138);
  ctx.fillStyle="#294a78";ctx.font="bold 11px monospace";
  ctx.fillText(dirs[d]+" / V6B",x+8,y+148);
 }
}
function loadSheet(url,mode){
 const token=++revision;const img=new Image();
 img.onload=()=>{if(token!==revision)return;
  if(img.naturalWidth!==384||img.naturalHeight!==4928){
   status("Invalid sprite sheet — requires original V6B 384×4928");return}
  image=img;sourceMode=mode;drawFour();
  if(mode==="base")stage("BASE / ORIGINAL V6B · "+$("base").value.toUpperCase());
  else stage("DRAFT / ORIGINAL V6B REVIEW");
 };
 img.onerror=()=>{if(token===revision){drawNotice("SOURCE SHEET UNAVAILABLE");
  status("Native source sheet failed to load. Check GitHub Pages build.");}};
 img.crossOrigin="anonymous";img.src=url;
}
function selectBase(){
 const id=$("base").value;const native=catalog[id]?.sheet||BASES[id];
 image=null;sourceMode="base";drawNotice("LOADING NATIVE V6B…");
 loadSheet(new URL(native,location.href).href,"base");
 $("generate").disabled=id==="astrofrich_base";
 if(id==="astrofrich_base")status("Astrofrich preview menggunakan spritesheet asli. Generate otomatis belum mendukung kostum ini; perlu adapter Python khusus.");
 else status("Base ini berasal dari spritesheet Mahluk Hidup asli. Isi prompt, foto dan Worker URL untuk membuat draft V6B.");
 saveForm();
}
async function loadCatalog(){
 try{
  const r=await fetch("./catalog.json",{cache:"no-store"});
  if(!r.ok)throw Error("HTTP "+r.status);
  const db=await r.json();catalog=Object.fromEntries((db.characters||[])
   .filter(x=>BASES[x.id]&&typeof x.sheet==="string")
   .map(x=>[x.id,x]));
 }catch(e){status("Catalog unavailable; trying canonical base sheets. "+e.message)}
 selectBase();
}
function normalizeWorker(){
 const raw=$("backend-url").value.trim().replace(/\/+$/,"");
 try{
  const url=new URL(raw);
  if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash)
   throw Error("Endpoint must be HTTPS");
  return url.origin+url.pathname.replace(/\/+$/,"");
 }catch{throw Error("Isi URL Cloudflare Worker HTTPS terlebih dahulu (lihat Backend Setup Guide).")}
}
function referencePhoto(file){
 return new Promise((resolve,reject)=>{
  if(!file||file.size>4*1024*1024||!/^image\/(png|jpeg|webp)$/.test(file.type))
   return reject(Error("Gunakan foto PNG/JPEG/WebP maksimal 4MB."));
  const fr=new FileReader();
  fr.onerror=()=>reject(Error("Could not read image"));
  fr.onload=()=>{
   const pic=new Image();
   pic.onerror=()=>reject(Error("Unsupported image"));
   pic.onload=()=>{
    const factor=Math.min(1,512/Math.max(pic.naturalWidth,pic.naturalHeight));
    const cv=document.createElement("canvas");
    cv.width=Math.max(1,Math.round(pic.naturalWidth*factor));
    cv.height=Math.max(1,Math.round(pic.naturalHeight*factor));
    const c=cv.getContext("2d");
    c.fillStyle="#fff";c.fillRect(0,0,cv.width,cv.height);
    c.drawImage(pic,0,0,cv.width,cv.height);
    const value=cv.toDataURL("image/jpeg",.78);
    if(value.length>950000)return reject(Error("Photo too large after resizing"));
    resolve(value);
   };
   pic.src=String(fr.result);
  };
  fr.readAsDataURL(file);
 });
}
function setupPhotos(){
 document.querySelectorAll(".ref").forEach(el=>{
  const part=el.dataset.part,file=el.querySelector("input"),img=el.querySelector("img");
  file.onchange=async()=>{
   try{
    const value=await referencePhoto(file.files?.[0]);
    refs.set(part,value);img.src=value;img.classList.add("ready");
    status("Reference "+part+" loaded, ready for AI analysis. File is not uploaded until Generate.");
   }catch(e){status(e.message);file.value=""}
  };
  el.querySelector(".clear").onclick=()=>{
   refs.delete(part);file.value="";img.removeAttribute("src");img.classList.remove("ready");
  };
 });
}
function getQueue(){const x=loadJSON(QUEUE,[]);return Array.isArray(x)?x.slice(0,16):[]}
function writeQueue(rows){try{localStorage.setItem(QUEUE,JSON.stringify(rows.slice(0,16)))}catch{}}
function renderQueue(){
 const list=$("asset-list");list.replaceChildren();
 const rows=getQueue();if(!rows.length){
  const p=document.createElement("p");p.className="help";
  p.textContent="NO GENERATION REQUESTS YET.";list.append(p);return;
 }
 for(const row of rows){
  const item=document.createElement("div");item.className="saved";
  const name=document.createElement("span");
  name.textContent=row.name+" / "+(row.state||"QUEUED");
  const chk=document.createElement("button");chk.textContent="CHECK";chk.type="button";
  chk.onclick=()=>checkRequest(row,true);
  const open=document.createElement("a");open.className="btn";open.textContent="GITHUB";
  open.href=row.reviewUrl||row.runUrl;open.target="_blank";open.rel="noopener noreferrer";
  item.append(name,chk,open);list.append(item);
 }
}
function rawSheet(row){
 const dir="ai-character/"+row.requestId;
 const id=row.characterId;
 return "https://raw.githubusercontent.com/lafrich/virtual-life-asset-pipeline/"+
  dir+"/assets/npc_"+id+"/sprites/"+id+"_v6b_sheet.png";
}
async function checkRequest(row,manual=false){
 if(!row?.requestId||!row.workerUrl)return;
 try{
  const url=row.workerUrl+"/status?request_id="+encodeURIComponent(row.requestId)+
    (row.runId?"&run_id="+encodeURIComponent(row.runId):"");
  const response=await fetch(url,{cache:"no-store"});
  if(!response.ok)throw Error("HTTP "+response.status);
  const data=await response.json();
  if(!data.ok)throw Error(data.error||"Unknown error");
  const rows=getQueue(),item=rows.find(x=>x.requestId===row.requestId);
  if(!item)return;
  item.state=data.pr?(data.pr.merged?"MERGED":data.pr.state.toUpperCase()):
    (data.run?.conclusion||data.run?.status||"QUEUED").toUpperCase();
  if(data.pr?.url){
   item.reviewUrl=data.pr.url;
   if(latest?.requestId===row.requestId){
    $("review").hidden=false;$("review").href=data.pr.url;
    loadSheet(rawSheet(item),"draft");
    status(data.pr.merged?"Character PR merged. Wait for Character Stock Pages deploy before using in Semesta.":"Native V6B draft created. Inspect all views and motions in GitHub PR before merging.");
   }
  }else if(manual&&latest?.requestId===row.requestId){
   status("Workflow: "+item.state+". The reviewed PR appears here after GitHub finishes building.");
  }
  writeQueue(rows);renderQueue();
 }catch(e){if(manual)status("Status check failed: "+e.message)}
}
async function generate(){
 if($("base").value==="astrofrich_base")return status("Astrofrich needs its own native generator adapter.");
 let worker;try{worker=normalizeWorker()}catch(e){status(e.message);return}
 const name=$("name").value.trim(),prompt=$("prompt").value.trim();
 if(name.length<2||name.length>45||prompt.length<4||prompt.length>1500){
  status("Isi nama (2–45 karakter) dan prompt (4–1500 karakter).");return;
 }
 const passcode=$("passcode").value;
 if(!passcode){status("Masukkan studio passcode dari Cloudflare Worker. Tidak disimpan di browser.");return}
 $("generate").disabled=true;
 stage("REQUEST / ANALYZING REFERENCES");status("Submitting reference prompt to private AI backend...");
 try{
  const ordered=["head","upper","lower","feet","overall"];
  const selected=ordered.filter(k=>refs.has(k));
  const response=await fetch(worker+"/generate",{
   method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+passcode},
   body:JSON.stringify({name,base:$("base").value,prompt,
    references:selected.map(k=>refs.get(k)),referenceParts:selected})
  });
  const data=await response.json().catch(()=>({error:"Invalid backend response"}));
  if(!response.ok||!data.ok)throw Error(data.error||"Backend HTTP "+response.status);
  const entry={name,requestId:data.request_id,characterId:data.character_id,
   runId:data.github_run_id,runUrl:data.run_url,workerUrl:worker,state:"QUEUED"};
  latest=entry;const rows=getQueue();writeQueue([entry,...rows.filter(x=>x.requestId!==entry.requestId)]);
  renderQueue();$("review").hidden=false;$("review").href=entry.runUrl;
  stage("NATIVE V6B / GITHUB BUILD REQUESTED");
  status("Native V6B build queued. This is NOT a generated sprite yet. Review link appears when GitHub creates the draft PR.");
  poll(entry);
 }catch(e){status("Generate gagal: "+e.message);stage("ORIGINAL BASE / NO NEW CHARACTER")}
 finally{$("generate").disabled=$("base").value==="astrofrich_base"}
}
function poll(entry){
 if(pollTimer)clearTimeout(pollTimer);
 let attempts=0;
 const tick=async()=>{
  await checkRequest(entry,false);
  attempts++;
  const state=getQueue().find(x=>x.requestId===entry.requestId)?.state;
  if(!["OPEN","CLOSED","MERGED","FAILURE","CANCELLED"].includes(state)&&attempts<36)
   pollTimer=setTimeout(tick,15000);
 };
 pollTimer=setTimeout(tick,15000);
}
function init(){
 const draft=loadJSON(STORAGE,{});
 for(const id of ["name","base","prompt"]){
  if(typeof draft[id]==="string"&&$(id)&&id!=="base" )$(id).value=draft[id];
 }
 if(BASES[draft.base])$("base").value=draft.base;
 if(typeof draft.url==="string")$("backend-url").value=draft.url;
 for(const id of ["name","prompt","backend-url"])$(id).addEventListener("input",saveForm);
 $("base").onchange=selectBase;
 $("generate").onclick=generate;
 setupPhotos();renderQueue();loadCatalog();
}
init();
})();
