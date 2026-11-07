/* Copy an authored review sheet into the current V6P activity editor.
 * The original pack stays immutable and cannot become a playable action from this step.
 * Native activity editor currently has six columns: never truncate longer sources.
 */
(function(root){
"use strict";
function image(url){
 return new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Native sheet could not be loaded"));img.src=url;
 });
}
async function makeCopy(action,actor){
 const A=root.V6PActivityContract,Store=root.V6PClipStore;
 if(!A||!Store)throw Error("V6P editor not loaded");
 if(!action||!action.sheets?.[actor])throw Error("No selected actor sheet");
 if(action.frames>A.COLS)
  throw Error("Animasi ini "+action.frames+" frame, tetapi editor V6P sekarang maksimum "+A.COLS+
    ". Aku tidak akan memotong frame aslinya. Gunakan preview dahulu.");
 const source=await image(action.sheets[actor].url);
 if(source.naturalWidth!==action.frames*A.FW||source.naturalHeight!==4*A.FH)
  throw Error("Native sheet size mismatch");
 const cv=document.createElement("canvas");cv.width=A.W;cv.height=A.H;
 const ctx=cv.getContext("2d");ctx.imageSmoothingEnabled=false;
 for(let d=0;d<4;d++)for(let f=0;f<action.frames;f++)
  ctx.drawImage(source,f*A.FW,d*A.FH,A.FW,A.FH,f*A.FW,d*A.FH,A.FW,A.FH);
 const id="clp_grok_"+action.id.slice(0,22)+"_"+Date.now().toString(36);
 const layer=cv.toDataURL("image/png");
 if(layer.length>9000000)throw Error("Motion layer exceeds safe local editor size");
 // A new user clip only. Do not change the official action registry, original
 // character parts, animation bindings, or any Semesta/Jiwa gameplay code.
 const frames=action.frame_ms.map((ms,i)=>({key:"f"+i,ms}));
 const created=Store.create({id,name:"Grok review · "+action.label,frames,loop:action.loop!==false,band:"custom",
  requiredParts:["base/fx"]});
 try{
  Store.setLayer(id,"base/fx",layer,{thumbDataUrl:layer});
  Store.updateManifest(id,{reviewStatus:"pending_owner_review",source:"grok-stock-animation-v1",
   sourceActor:actor,sourceActionId:action.id,gameplayApproved:false});
 }catch(error){Store.remove(id);throw error}
 return id;
}
root.V6PGrokMotionCopy=Object.freeze({makeCopy});
})(window);
