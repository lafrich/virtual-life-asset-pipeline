/* GENESIS BASE by Lafrich — package / import / Drive for genesis-base.html.
 * The editing itself is the Mahluk Hidup LGR-1 workshop (01 pixel editor,
 * 02 cut + pivots + slice paint + motion preview) running in BASE MODE with
 * its own local draft store. Format: docs/GENESIS_BASE_FORMAT.md.
 */
(function(root){"use strict";
const FORMAT="lafrich-genesis-base-v1",APP_VERSION="genesis-base-1";
const $=id=>document.getElementById(id),W=()=>root.GenesisWorkbench,C=root.LafrichPuppetCore;
async function sha256(str){
 const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(str));
 return Array.from(new Uint8Array(d),b=>b.toString(16).padStart(2,"0")).join("");
}
const pad=n=>String(n).padStart(2,"0");
const stamp=()=>{const d=new Date();return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+"-"+pad(d.getHours())+pad(d.getMinutes())};
// draw order, near side per view and joint caps (validated by validateMaster
// when present) always travel with the rig.
const EXTRAS=["drawOrders","sides","capRadius"];
function withExtras(valid,src){const out={...valid};for(const k of EXTRAS)if(src&&src[k]&&typeof src[k]==="object")out[k]=JSON.parse(JSON.stringify(src[k]));return out}
function say(s,err){W()?.status(s,err)}
async function buildPackage(){
 const w=W(),g=w.gender(),r=w.record();if(!r?.rig)throw Error("No draft to export");
 const rig=withExtras(C.validateMaster(r.rig),r.rig),raw=JSON.stringify(rig);
 return {format:FORMAT,formatVersion:1,app:APP_VERSION,watermark:"Genesis Base by Lafrich",
  gender:g,id:rig.id,created:new Date().toISOString(),edited:r.edited||"",
  canvas:{width:C.W,height:C.H},dirs:C.DIRS.slice(),parts:C.PARTS.slice(),parents:{...C.PARENTS},
  notes:String($("gb-notes").value||"").slice(0,4000),
  manualSlice:r.manual&&typeof r.manual==="object"?r.manual:{},
  rigSha256:await sha256(raw),rig};
}
function download(name,blob){
 const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(u),30000);
}
async function readPackage(v){
 // a Genesis Base package, or a plain LGR-1 master JSON (lafrich-genesis-master-v1)
 if(v?.format===FORMAT){
  if(!["male","female"].includes(v.gender))throw Error("Package gender missing");
  const rig=withExtras(C.validateMaster(v.rig),v.rig);
  if(v.rigSha256&&await sha256(JSON.stringify(v.rig))!==v.rigSha256)
   throw Error("Package checksum mismatch (file changed or damaged)");
  if(rig.gender!==v.gender)throw Error("Package gender does not match its rig");
  return {g:v.gender,rig,manual:v.manualSlice,notes:v.notes||""};
 }
 const src=v?.master||v,rig=withExtras(C.validateMaster(src),src);
 return {g:rig.gender,rig,manual:{},notes:""};
}
async function exportJson(){
 const p=await buildPackage(),name="genesis-base-"+p.gender+"-"+stamp()+".json";
 download(name,new Blob([JSON.stringify(p)],{type:"application/json"}));
 say("EXPORTED "+name+" · send this file to us as the "+p.gender.toUpperCase()+" base.");
}
async function exportSheets(){
 const w=W(),g=w.gender();
 for(const kind of ["art","mask"]){
  const c=await w.renderSheet(g,kind),big=document.createElement("canvas");big.width=c.width*4;big.height=c.height*4+14;
  const o=big.getContext("2d");o.imageSmoothingEnabled=false;o.fillStyle="#fff";o.fillRect(0,0,big.width,big.height);
  o.drawImage(c,0,0,big.width,c.height*4);o.fillStyle="#557";o.font="10px sans-serif";
  o.fillText("Genesis Base by Lafrich · "+g.toUpperCase()+" · SE SW NE NW · "+(kind==="mask"?"part slices":"pixels")+" · "+stamp(),4,big.height-3);
  const blob=await new Promise(r=>big.toBlob(r,"image/png"));
  download("genesis-base-"+g+"-"+stamp()+"-"+kind+".png",blob);
 }
 say("PNG sheets downloaded (pixels + part slices, 4 views, x4).");
}
async function importFile(file){
 const text=await file.text();if(text.length>15000000)throw Error("File too large");
 const p=await readPackage(JSON.parse(text));
 if(!confirm("Open "+file.name+" as the "+p.g.toUpperCase()+" Genesis Base draft? Your current "+p.g+" draft here is replaced (export it first if needed)."))return;
 await W().adopt(p.g,p.rig,p.manual,"IMPORTED "+file.name+" · "+p.g.toUpperCase());
 if(p.notes)$("gb-notes").value=p.notes;
}
async function fromWorkbench(){
 const g=W().gender();let s=null;
 try{s=JSON.parse(localStorage.getItem(W().WORKBENCH_DRAFT_KEY)||"null")}catch{}
 const rig=s?.drafts?.[g]?.rig;
 if(!rig){say("No Mahluk Hidup "+g+" draft in this browser.",true);return}
 if(!confirm("Copy your Mahluk Hidup "+g.toUpperCase()+" draft (pixels, slices, pivots) into Genesis Base? The Genesis Base "+g+" draft here is replaced; Mahluk Hidup is not changed."))return;
 await W().adopt(g,withExtras(C.validateMaster(rig),rig),s.drafts[g].manual,"Copied the Mahluk Hidup "+g.toUpperCase()+" draft into Genesis Base.");
}
const cloud=()=>root.VLGenesisCloud;
async function ensureDrive(){if(!cloud()?.connected())await cloud().connect();$("statuscloud").textContent="DRIVE CONNECTED"}
async function refreshDrive(){
 await ensureDrive();const list=await cloud().listBases(W().gender()),sel=$("gb-drive-list");sel.replaceChildren();
 if(!list.length)sel.add(new Option("No "+W().gender()+" base saved yet",""));
 for(const f of list)sel.add(new Option(f.name.replace(/\.[0-9a-f]{10}\.json$/,"")+" · "+String(f.createdTime||"").slice(0,16).replace("T"," "),f.id));
}
async function saveDrive(){
 await ensureDrive();const p=await buildPackage(),r=await cloud().saveBase(p);
 say("SAVED TO DRIVE · Membangun/Mahluk Hidup/Genesis Base/"+r.name+" (new version, verified; nothing overwritten).");
 await refreshDrive();
}
async function loadDrive(){
 const id=$("gb-drive-list").value;if(!id){say("Choose a saved version first",true);return}
 await ensureDrive();const {pkg,name}=await cloud().loadBase(id),p=await readPackage(pkg);
 if(!confirm("Open "+name+"? Your current "+p.g+" Genesis Base draft here is replaced."))return;
 await W().adopt(p.g,p.rig,p.manual,"OPENED from Drive · "+name);if(p.notes)$("gb-notes").value=p.notes;
}
function guard(fn){return async()=>{try{await fn()}catch(e){say(e.message,true)}}}
function setup(){
 if(!W()){setTimeout(setup,200);return}
 $("gb-export").onclick=guard(exportJson);
 $("gb-sheets").onclick=guard(exportSheets);
 $("gb-import").onclick=()=>$("gb-file").click();
 $("gb-file").onchange=guard(async()=>{const f=$("gb-file").files[0];$("gb-file").value="";if(f)await importFile(f)});
 $("gb-from-workbench").onclick=guard(fromWorkbench);
 $("gb-save-drive").onclick=guard(saveDrive);
 $("gb-refresh-drive").onclick=guard(refreshDrive);
 $("gb-load-drive").onclick=guard(loadDrive);
 root.addEventListener("genesis-base-drive",()=>void refreshDrive().catch(e=>say(e.message,true)));
}
root.GenesisBase=Object.freeze({FORMAT,buildPackage,readPackage});
setup();
})(window);
