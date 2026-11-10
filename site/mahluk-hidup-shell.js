/* MAHLUK HIDUP.EXE — shell: ☺ Emosi.exe (iframe, untouched) · ✦ Bergerak
 * (animation database) · ⚔ Beraksi (action-scene database) · ◈ info.
 * On open it syncs the LGR database (lgr-db.js) from Google Drive first,
 * like the earlier cloud-first startup; "Lanjut offline" uses the local cache.
 */
(function(root){"use strict";
const $=id=>document.getElementById(id),DB=()=>root.LGRDB;
const PAGES=["emotion","bergerak","beraksi","lgr"],LABEL={emotion:"EMOSI.EXE",bergerak:"BERGERAK",beraksi:"BERAKSI",lgr:"INFO"};
const NAV={emotion:"nav-emotion",bergerak:"nav-bergerak",beraksi:"nav-beraksi",lgr:"nav-lgr"};
const PANEL={emotion:"emotionpanel",bergerak:"bergerakpanel",beraksi:"beraksipanel",lgr:"lgrpanel"};
let page="emotion";
function status(s,err){$("statusmsg").textContent=s;$("status").classList.toggle("error",!!err)}
async function show(p){
 if(!PAGES.includes(p))p="emotion";page=p;
 for(const k of PAGES){$(PANEL[k]).hidden=k!==p;$(NAV[k]).setAttribute("aria-selected",String(k===p))}
 $("stage-label").textContent=LABEL[p];
 try{history.replaceState(null,"",location.pathname+(p==="emotion"?"":"?tab="+p)+location.hash)}catch{}
 if(p==="emotion"&&$("emotion-frame").src==="about:blank")$("emotion-frame").src="/virtual-office/emotion-studio/";
 if(p==="lgr")void countFaces();
 try{
  if(p==="bergerak")await root.MahlukBergerak.init($("bergerakpanel"));
  if(p==="beraksi")await root.MahlukBeraksi.init($("beraksipanel"));
 }catch(e){console.error(e);status(LABEL[p]+": "+e.message,true)}
}
async function countFaces(){
 try{
  const b=root.VLMahlukEmosiBridge;if(!b)throw Error("Emosi bridge unavailable");
  await b.refresh();const n={};
  for(const g of ["male","female"]){const a={gender:g,template_category:"human",id:"genesis_"+g+"_nude",expressions:[]};b.apply(a);
   n[g]=a.expressions.filter(x=>x.source==="emosi"&&x.overlay).length}
  $("face-count").textContent="Emosi faces: "+n.male+" male · "+n.female+" female.";
 }catch(e){$("face-count").textContent="Emosi faces: "+e.message}
}
/* ---- database sync chip + startup gate ---- */
function chip(st){
 const el=$("statuscloud");if(!el)return;
 const pend=DB().pending(),t=st.lastSync?new Date(st.lastSync).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}):"";
 el.textContent=st.status==="synced"?"☁ DATABASE TERSINKRON "+t+(pend?" · "+pend+" pending":""):
  st.status==="syncing"?"☁ SYNC…":st.status==="error"?"⚠ OFFLINE (cache) · "+pend+" belum sync":
  st.status==="pending"?"● "+pend+" belum sync":"DATABASE: CACHE LOKAL";
 el.title=st.message||"";
 if(DB().connected())$("connect-drive").textContent="☁ CONNECTED";
}
async function syncNow(interactive){
 try{
  const r=await DB().sync({interactive});
  root.dispatchEvent(new CustomEvent("lgr-db-synced",{detail:r}));
  status("Database tersinkron: "+DB().all("bergerak").length+" animasi · "+DB().all("beraksi").length+" adegan"+
   (r.pulled||r.pushed?" (↓"+r.pulled+" ↑"+r.pushed+")":"")+(r.conflicts?" · "+r.conflicts+" konflik → yang terbaru dipakai, versi lain di Backup":"")+
   (r.errors.length?" · "+r.errors.length+" gagal: "+r.errors[0]:""),!!r.errors.length);
  return true;
 }catch(e){status("Sync: "+e.message+" · pakai cache lokal",true);return false}
}
function gate(){
 const c=DB().readCache(),nb=Object.keys(c.kinds.bergerak).length,ns=Object.keys(c.kinds.beraksi).length;
 const msg=document.createElement("p");msg.setAttribute("role","status");msg.style.margin="0";
 msg.textContent="Sebelum mulai, sync dulu biar animasi & adegan yang kebuka versi terbaru dari Google Drive."+
  (c.syncedAt?" Terakhir sync: "+new Date(c.syncedAt).toLocaleString("id-ID")+".":" Belum pernah sync di browser ini.");
 const go=document.createElement("button");go.type="button";go.id="gate-sync";go.className="primary";go.textContent="☁ CONNECT GOOGLE DRIVE & SYNC";
 const off=document.createElement("button");off.type="button";off.id="gate-offline";off.textContent="Lanjut offline (cache: "+nb+" animasi · "+ns+" adegan)";
 const box=document.createElement("section");box.className="sa-gate";box.id="sync-gate";box.setAttribute("role","dialog");box.setAttribute("aria-modal","true");
 box.innerHTML='<div class="panel"><strong>▣ MAHLUK HIDUP.EXE · SYNC DATABASE</strong><div></div></div>';
 const body=box.querySelector(".panel>div"),sub=document.createElement("p");sub.className="sa-hint";sub.style.margin="0";
 sub.textContent="Folder: Membangun / Mahluk Hidup / Database (Bergerak · Beraksi · Backup). File Drive lain nggak disentuh.";
 body.append(msg,go,off,sub);document.body.append(box);
 go.onclick=async()=>{go.disabled=true;msg.textContent="Menghubungkan Google Drive…";
  if(await syncNow(true)){box.remove();if(page!=="emotion")void show(page)}else{msg.textContent="Sync gagal: "+(DB().state.message||"")+" · coba lagi atau lanjut offline.";go.disabled=false}};
 off.onclick=()=>{box.remove();status("Offline: pakai cache lokal. Tekan ↻ SYNC kapan aja buat sync ke Drive.")};
}
$("nav-emotion").onclick=()=>show("emotion");
$("nav-bergerak").onclick=()=>show("bergerak");
$("nav-beraksi").onclick=()=>show("beraksi");
$("nav-lgr").onclick=()=>show("lgr");
$("connect-drive").onclick=async()=>{
 try{await DB().connect();$("connect-drive").textContent="☁ CONNECTED";await syncNow(true);
  try{await root.VLGenesisCloud?.connect?.()}catch{}}
 catch(e){status("Drive: "+e.message,true)}
};
$("db-sync").onclick=()=>void syncNow(true);
$("fullscreen").onclick=()=>{const d=document;if(d.fullscreenElement)d.exitFullscreen?.();else d.documentElement.requestFullscreen?.().catch(()=>{})};
DB().onStatus(chip);
root.addEventListener("online",()=>{if(DB().connected())void syncNow(false)});
const want=new URLSearchParams(location.search).get("tab");
void show(PAGES.includes(want)?want:"emotion");
status("Emosi.exe · ✦ BERGERAK bikin animasi · ⚔ BERAKSI bikin adegan · database di Google Drive.");
// startup: sync first (silent if this tab already has a Drive session), else ask
if(DB().restoreSession())void syncNow(false);else gate();
})(window);
