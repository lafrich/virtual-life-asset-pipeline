/* v6p-act ACTIVITY SHEET CONTRACT v2 — additive 384×2688 sheets.
   Does not modify the original 384×4928 / 44-row part sheets. */
(function(root,factory){"use strict";const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.V6PActivityContract=api;})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){"use strict";
const FORMAT="v6p-act-clip-manifest-v1";
const CONTRACT="v6p-act ACTIVITY SHEET CONTRACT v2";
const W=384,H=2688,COLS=6,ROWS=24,FW=64,FH=112;
const PIVOT=Object.freeze([32,100]);
const DIRS=Object.freeze(["se","sw","ne","nw"]);
const MAX_FRAMES=6;
const OPTIONAL=Object.freeze(["base/fx","base/body_front","base/body_front_f"]);
const BANDS=Object.freeze({
 squat:{start:0,frames:6,ms:140,type:"loop",status:"draft_inactive",emosi:true,
  keys:Object.freeze(["standing","descending1","descending2","bottom_hold","ascending1","ascending2"])},
 pushup:{start:4,frames:6,ms:160,type:"loop",status:"retired_incompatible",emosi:false,
  keys:Object.freeze(["plank_high","lowering_1","lowering_2","bottom","rising_1","rising_2"])},
 yoga_sphinx_idle:{start:8,frames:4,ms:500,type:"loop",status:"retired_incompatible",emosi:false},
 yoga_puppy_idle:{start:12,frames:4,ms:500,type:"loop",status:"retired_incompatible",emosi:false},
 hip_shake:{start:16,frames:6,ms:125,type:"loop",status:"retired_incompatible",emosi:true},
 yoga_happy_baby_idle:{start:20,frames:4,ms:500,type:"loop",status:"retired_incompatible",emosi:false}
});
const INACTIVE=Object.freeze(["squat","jumping_jack","guard_jab","yoga_warrior","lie_supine"]);
const PILOT_PARTS=Object.freeze([
 "base/body","base/body_f","base/shadow",
 "face/m_blank","face/f_blank",
 "top/nude","top/nude_f","top/nude_back","top/nude_back_f",
 "hair/mid_curtain_back","hair/mid_curtain_front","hair/long_back","hair/long_front",
 "shoes/nude","shoes/nude_f",
 "pants/nude","pants/nude_f"
]);
const SEMESTA_ACT_CLIPS=Object.freeze([]); // five former stock activities retired from the new Genesis motion path
const BACKLOG=Object.freeze([
 "crawl — planned floor locomotion clip; not authored",
 "crawl_idle — planned floor idle; not authored",
 "horse-riding — moving animation synced to a mount reference when one exists; not authored"
]);
function bandOf(id){return BANDS[id]||null;}
function isPlayable(id){const b=BANDS[id];return !!(b&&b.status==="authored");} // All legacy activity bands retired
function cellOrigin(bandStart,dir,frame){
 const di=DIRS.indexOf(dir);
 if(di<0)throw Error("Unknown direction "+dir);
 if(!Number.isInteger(bandStart)||bandStart<0||bandStart>20)throw Error("Invalid band start");
 if(!Number.isInteger(frame)||frame<0||frame>=COLS)throw Error("Invalid activity frame "+frame);
 return {x:frame*FW,y:(bandStart+di)*FH,w:FW,h:FH};
}
function mediaUrl(part){return "./media/v6p-act/"+String(part).replace(/\.png$/i,"")+".png";}
function isOptional(part){return OPTIONAL.indexOf(part)>=0;}
function defaultFrames(bandId){
 const b=BANDS[bandId];
 if(b&&b.keys)return b.keys.map(key=>({key,ms:b.ms||140}));
 const n=(b&&b.frames)||2;
 const ms=(b&&b.ms)||140;
 return Array.from({length:n},(_,i)=>({key:"f"+i,ms}));
}
function emptyManifest(opts){
 const name=String((opts&&opts.name)||"Clip baru").trim().slice(0,48)||"Clip baru";
 const id=(opts&&opts.id)||("clp_"+name.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,20)+"_"+Date.now().toString(36));
 const bandId=(opts&&opts.band)||"custom";
 const band=BANDS[bandId];
 const frames=(opts&&Array.isArray(opts.frames)&&opts.frames.length)?opts.frames.map(f=>({
  key:String(f.key||"f0").slice(0,32),
  ms:Math.max(40,Math.min(800,Number(f.ms)||140))
 })):defaultFrames(bandId==="custom"?null:bandId);
 return {
  format:FORMAT,contract:CONTRACT,id,name,
  band:bandId,bandStart:band?band.start:0,
  loop:opts&&opts.loop===false?false:true,
  emosi:band?!!band.emosi:false,
  dirs:DIRS.slice(),
  frames:frames.slice(0,MAX_FRAMES),
  requiredParts:(opts&&opts.requiredParts)||(bandId==="pushup"?PILOT_PARTS.slice():[]),
  sheet:{w:W,h:H,cols:COLS,rows:ROWS,cell:[FW,FH],pivot:PIVOT.slice()}
 };
}
function pushupManifest(){
 return emptyManifest({id:"clip_pushup",name:"pushup",band:"pushup",requiredParts:PILOT_PARTS.slice()});
}
function wornParts(ch,filesFn){
 if(typeof filesFn==="function")return filesFn(ch).filter(Boolean);
 return [];
}
function availability(ch,manifest,hasLayer,filesFn){
 const needed=wornParts(ch,filesFn);
 const unsupported=[];
 for(const part of needed){
  if(isOptional(part))continue;
  if(part.indexOf("brows/")===0)continue;
  if(typeof hasLayer==="function"?!hasLayer(part):false) unsupported.push(part);
 }
 return {
  ok:unsupported.length===0,
  unsupported,
  note:unsupported.length?
   "Clip disabled · unsupported parts (no auto-strip): "+unsupported.join(", "):
   "Clip ready for this appearance"
 };
}
function copyCell(src,sw,from,dest,dw,to){
 for(let y=0;y<from.h;y++){
  const si=((from.y+y)*sw+from.x)*4, di=((to.y+y)*dw+to.x)*4;
  dest.set(src.subarray(si,si+from.w*4),di);
 }
}
function remapColumns(image,bandStart,nDirs,fromCols,toIndexOfFrom){
 const w=image.width,h=image.height,src=image.data;
 const out=new Uint8ClampedArray(src.length);
 const n=fromCols.length;
 for(let di=0;di<nDirs;di++){
  for(let col=0;col<n;col++){
   const origin=fromCols[col];
   const destCol=toIndexOfFrom[origin];
   if(destCol==null)continue;
   const from={x:origin*FW,y:(bandStart+di)*FH,w:FW,h:FH};
   const to={x:destCol*FW,y:(bandStart+di)*FH,w:FW,h:FH};
   copyCell(src,w,from,out,w,to);
  }
 }
 return {data:out,width:w,height:h};
}
return Object.freeze({
 FORMAT,CONTRACT,W,H,COLS,ROWS,FW,FH,PIVOT,DIRS,MAX_FRAMES,OPTIONAL,BANDS,INACTIVE,PILOT_PARTS,SEMESTA_ACT_CLIPS,BACKLOG,
 bandOf,isPlayable,cellOrigin,mediaUrl,isOptional,defaultFrames,emptyManifest,pushupManifest,availability,remapColumns,copyCell
});
});
