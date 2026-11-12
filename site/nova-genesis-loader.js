/* NOVA 11-FIX EDIT ENTRY
 * Isolated opt-in editor entry on top of Genesis Base. No official catalog
 * mutation and no Drive write without an explicit user action.
 * The candidate packages contain the standard 11-part LGR-1 data.
 */
(function(){"use strict";
const $=id=>document.getElementById(id),frame=$("editor");
const FILES=Object.freeze({
 male:"./media/lgr1/nova-11fix/male-package.gz.b64",
 female:"./media/lgr1/nova-11fix/female-package.gz.b64"
});
let busy=false;
function status(msg,error=false){$("state").textContent=msg;$("state").classList.toggle("error",!!error)}
function setBusy(b){busy=b;for(const id of ["load-male","load-female","export"])$(id).disabled=b}
function editorReady(){
 try{
  const w=frame.contentWindow;
  return w&&w.GenesisWorkbench&&w.GenesisBase&&w.LafrichPuppetCore?w:null;
 }catch{return null}
}
async function ready(){
 for(let n=0;n<80;n++){
  const w=editorReady();if(w)return w;
  await new Promise(r=>setTimeout(r,150));
 }
 throw Error("Genesis Base belum siap. Reload halaman dan coba lagi.");
}
async function readCandidate(gender){
 const response=await fetch(FILES[gender],{cache:"no-store"});
 if(!response.ok)throw Error("NOVA "+gender+" belum tersedia pada server ("+response.status+")");
 const b64=(await response.text()).trim();
 if(!/^[a-zA-Z0-9+/=]+$/.test(b64)||b64.length>100000)throw Error("NOVA package encoding invalid");
 const binary=atob(b64),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 if(typeof DecompressionStream!=="function")throw Error("Browser tidak mendukung gzip stream. Gunakan IMPORT BASE dengan JSON dari paket ZIP Nova.");
 const json=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).json();
 if(json?.format!=="lafrich-genesis-base-v1"||json.gender!==gender)
  throw Error("NOVA package gender/format tidak sesuai");
 return json;
}
async function load(gender){
 if(busy)return;
 if(!confirm("Buka NOVA 11-FIX "+gender.toUpperCase()+" untuk diedit?\n\nDraft Genesis Base "+gender.toUpperCase()+" yang sekarang di browser ini akan diganti. Kalau draft lama penting, export dulu.\n\nOfficial Genesis, data gender lain dan Google Drive tidak diubah."))return;
 setBusy(true);
 try{
  status("Memuat dan memverifikasi Nova "+gender.toUpperCase()+"…");
  const w=await ready(),pkg=await readCandidate(gender);
  // Existing native verified package importer handles SHA256 validation,
  // key-ramp to light skin conversion, masks, pivots, placements, extra fields.
  const candidate=await w.GenesisBase.readPackage(pkg);
  if(candidate.g!==gender)throw Error("NOVA gender mismatch");
  await w.GenesisWorkbench.adopt(gender,candidate.rig,candidate.manual,
    "NOVA 11-FIX "+gender.toUpperCase()+" loaded · editable · export when finished",candidate.skin);
  const note=w.document.getElementById("gb-notes");
  if(note)note.value="NOVA 11-FIX "+gender+" · edited from candidate · "+(pkg.notes||"");
  status("NOVA "+gender.toUpperCase()+" aktif sebagai draft edit. Edit Pixel Editor / Pivot & Slicing di bawah, lalu klik EXPORT EDITED JSON. Official master dan Drive tidak berubah.");
 }catch(e){status("Load gagal: "+e.message,true)}
 finally{setBusy(false)}
}
async function exportJson(){
 if(busy)return;
 setBusy(true);
 try{
  const w=await ready(),button=w.document.getElementById("gb-export");
  if(!button)throw Error("Tombol export Genesis Base tidak ditemukan");
  button.click();
  status("Export diminta lewat Genesis Base. Kirim JSON yang terunduh untuk penggantian Nova berikutnya.");
 }catch(e){status("Export gagal: "+e.message,true)}
 finally{setBusy(false)}
}
$("load-male").addEventListener("click",()=>void load("male"));
$("load-female").addEventListener("click",()=>void load("female"));
$("export").addEventListener("click",()=>void exportJson());
frame.addEventListener("load",()=>status("Genesis Base siap. Klik LOAD NOVA MALE atau FEMALE. Setelah load, kamu bisa menggambar pixel dan mengubah pivot/slicing di editor bawaan."));
})();