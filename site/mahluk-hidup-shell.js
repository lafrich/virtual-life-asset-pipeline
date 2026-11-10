/* MAHLUK HIDUP.EXE — Emosi-only shell while the app is rebuilt on LGR.
 * Keeps Emosi.exe (iframe) + the Google Drive login; base characters come
 * from Genesis Base (genesis-base.html). Writes nothing.
 */
(function(root){"use strict";
const $=id=>document.getElementById(id);
function status(s,err){$("statusmsg").textContent=s;$("status").classList.toggle("error",!!err)}
function show(page){
 const emo=page==="emotion";
 $("emotionpanel").hidden=!emo;$("lgrpanel").hidden=emo;
 $("nav-emotion").setAttribute("aria-selected",String(emo));$("nav-lgr").setAttribute("aria-selected",String(!emo));
 $("stage-label").textContent=emo?"EMOSI.EXE":"LGR REBUILD";
 if(emo&&$("emotion-frame").src==="about:blank")$("emotion-frame").src="/virtual-office/emotion-studio/";
 if(!emo)void countFaces();
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
$("nav-emotion").onclick=()=>show("emotion");
$("nav-lgr").onclick=()=>show("lgr");
$("connect-drive").onclick=async()=>{
 try{await root.VLGenesisCloud.connect();$("connect-drive").textContent="☁ CONNECTED";$("statuscloud").textContent="DRIVE CONNECTED";status("Drive connected.")}
 catch(e){status("Drive: "+e.message,true)}
};
$("fullscreen").onclick=()=>{const d=document;if(d.fullscreenElement)d.exitFullscreen?.();else d.documentElement.requestFullscreen?.().catch(()=>{})};
show(new URLSearchParams(location.search).get("tab")==="lgr"?"lgr":"emotion");
status("Emosi.exe · players & animations are coming next on LGR · base character: ↗ GENESIS BASE APP.");
})(window);
