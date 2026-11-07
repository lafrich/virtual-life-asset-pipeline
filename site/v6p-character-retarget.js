/* MAHLUK V6P - four-direction masters on canonical native pose sheets.
   The compositor supplies the actual limbs and clothing poses for every action.
   Reapply only palette edits; never distort pixels by bounding-box guessing.
   Preserve original idle F0 drawings and hand-corrected frames. */
(function(root,factory){"use strict";const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.V6PCharacterRetarget=api;})(typeof window!=="undefined"?window:null,function(root){
"use strict";
const DIRS=["se","sw","ne","nw"],FW=64,FH=112;
const equals=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
function bounds(data,w=FW,h=FH){
 let minx=w,miny=h,maxx=-1,maxy=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>8){
  if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;
 }
 return maxx<minx?null:{x:minx,y:miny,w:maxx-minx+1,h:maxy-miny+1};
}
function color(data,i){return ((data[i]<<16)|(data[i+1]<<8)|data[i+2])>>>0}
function remapColors(original,painted){
 const counts=new Map(),total=new Map();
 for(let i=0;i<original.length;i+=4){
  if(original[i+3]<8)continue;
  const key=color(original,i);total.set(key,(total.get(key)||0)+1);
  if(painted[i+3]<8)continue;
  const v=color(painted,i);
  if(v===key)continue;
  if(!counts.has(key))counts.set(key,new Map());
  const votes=counts.get(key);votes.set(v,(votes.get(v)||0)+1);
 }
 const map=new Map();
 for(const [key,votes] of counts){
  const [value,hits]=[...votes.entries()].sort((a,b)=>b[1]-a[1])[0];
  if(hits/(total.get(key)||1)>=0.42)map.set(key,value);
 }
 return map;
}
/* No geometric retargeting: the original part sheets are already fully posed.
   This retains the exact native silhouette, transparency and pixel positions. */
function paintNativePose(posed,palette){
 if(posed.length!==FW*FH*4)throw Error("Expected a native RGBA 64x112 frame");
 const result=new Uint8ClampedArray(posed);
 for(let i=0;i<posed.length;i+=4){
  if(posed[i+3]<8)continue;
  const mapped=palette.get(color(posed,i));
  if(mapped===undefined)continue;
  result[i]=(mapped>>16)&255;result[i+1]=(mapped>>8)&255;result[i+2]=mapped&255;
 }
 return result;
}
function masterDiff(original,painted,palette=remapColors(original,painted)){
 if(original.length!==FW*FH*4||painted.length!==original.length)
  throw Error("Expected two RGBA 64x112 master frames");
 let geometry=0,unmapped=0,colorEdits=0;
 for(let i=0;i<original.length;i+=4){
  const was=original[i+3]>8,now=painted[i+3]>8;
  if(was!==now||(was&&now&&original[i+3]!==painted[i+3])){geometry++;continue}
  if(!was||!now||color(original,i)===color(painted,i))continue;
  colorEdits++;
  if(palette.get(color(original,i))!==color(painted,i))unmapped++;
 }
 return {geometry,unmapped,colorEdits};
}
/* Preserve the legacy API for callers, but do not transfer shapes/details
   to estimated coordinates. Original and target may be different actions. */
function transferFrame(original,painted,posed){
 if(original.length!==FW*FH*4||painted.length!==original.length||posed.length!==original.length)
  throw Error("Expected three native RGBA 64x112 frames");
 return paintNativePose(posed,remapColors(original,painted));
}
function image(url){
 return new Promise((resolve,reject)=>{
  const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error("Cannot load sprite image"));im.src=url;
 });
}
function sourceCanvas(){
 const cv=document.createElement("canvas");cv.width=FW;cv.height=FH;return cv;
}
async function frameFromUrl(url){
 const im=await image(url);if(im.naturalWidth!==FW||im.naturalHeight!==FH)throw Error("Master sprite must be 64x112");
 const cv=sourceCanvas(),ctx=cv.getContext("2d",{willReadFrequently:true});ctx.imageSmoothingEnabled=false;ctx.drawImage(im,0,0);
 return ctx.getImageData(0,0,FW,FH).data;
}
function frame(sheet,C,action,dir,n){
 const o=C.cellOrigin(action,dir,n);return sheet.getContext("2d",{willReadFrequently:true}).getImageData(o.x,o.y,FW,FH);
}
function put(sheet,C,action,dir,n,pixels){
 const o=C.cellOrigin(action,dir,n),ctx=sheet.getContext("2d",{willReadFrequently:true});
 ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels),FW,FH),o.x,o.y);
}
async function generatePart(id,part,opts){
 const S=root?.V6PCharacterStore,C=root?.V6PPartCatalog,P=root?.V6PPixelSource;
 if(!S||!C||!P)throw Error("Character sprite generator dependencies missing");
 const row=S.get(id);if(!row)throw Error("Open a real saved character draft first");
 C.normalizePart(part);
 const base=await P.loadSheet(part),existing=row.parts?.[part]?await P.loadSheetFromUrl(row.parts[part]):null;
  const output=document.createElement("canvas");output.width=C.W;output.height=C.H;
 const g=output.getContext("2d",{willReadFrequently:true});g.imageSmoothingEnabled=false;
 // Each generation starts from the canonical native motion sheet. Never reuse
 // previously warped animation frames as a source, especially for nude outfits.
 g.drawImage(base,0,0);
 const sources={},masters=[],warning=[],reviewDirections=[];
 for(const dir of DIRS){
  const original=frame(base,C,"idle",dir,0).data;
  let painted;
  const m=S.master(id,part,dir);
  if(m){painted=await frameFromUrl(m);masters.push(dir)}
  // A generated sheet is not an independent drawing source: using it again
  // would bake a misplaced rear-facing sprite into the new result.
  // Recover from the stock silhouette unless this direction has a real master.
  else if(existing&&!row.generated?.[part])painted=frame(existing,C,"idle",dir,0).data;
  else painted=original;
  const palette=remapColors(original,painted),diff=masterDiff(original,painted,palette);
  if(m&&(diff.geometry||diff.unmapped))reviewDirections.push(dir.toUpperCase());
  sources[dir]={original,painted,palette,diff};
 }
 let generated=0,protectedFrames=0,unchanged=0;
 const stale=[];
 for(const action of C.ACTIONS)for(const dir of DIRS)for(let n=0;n<C.FRAMES[action];n++){
  const key=action+"|"+dir+"|"+n;
  const corrected=!!row.corrections?.[part]?.[key];
  const correctedAt=row.correctionUpdatedAt?.[part]?.[key];
  const masterAt=row.masterUpdatedAt?.[part]?.[dir];
  const correctionVersion=row.correctionVersion?.[part]?.[key];
  const masterVersion=row.masterVersion?.[part]?.[dir];
  const fresh=corrected&&(Number.isInteger(correctionVersion)?
   (!Number.isInteger(masterVersion)||correctionVersion>=masterVersion):
   (!!correctedAt&&(!masterAt||Date.parse(correctedAt)>=Date.parse(masterAt))));
  if(fresh&&existing){
   // Hand-corrected frame written after its current source master: preserve it.
   put(output,C,action,dir,n,frame(existing,C,action,dir,n).data);
   protectedFrames++;continue;
  }
  if(corrected){
   // Legacy locks or locks predating a new master contain stale pose pixels.
   // Keep their old pixels in a per-frame archive BEFORE replacing any sheet.
   const old=existing?frame(existing,C,action,dir,n).data:null;
   let png=null;
   if(old){
    const archived=sourceCanvas();
    archived.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(old),FW,FH),0,0);
    png=archived.toDataURL("image/png");
   }
   stale.push({key,png});
  }
  const original=frame(base,C,action,dir,n).data;
  const source=sources[dir],painted=paintNativePose(original,source.palette);
  if(equals(original,painted))unchanged++;else generated++;
  put(output,C,action,dir,n,painted);
 }
 // Master input stays pixel-perfect and should not be overwritten by generated warp.
 for(const dir of DIRS)if(S.master(id,part,dir)&&!S.shouldKeepCorrection(id,part,"idle",dir,0))
  put(output,C,"idle",dir,0,sources[dir].painted);
 if(masters.length<4)warning.push((4-masters.length)+" direction(s) using existing/stock source sprites");
 if(reviewDirections.length)warning.push("Custom silhouettes/details in "+reviewDirections.join("/")+
   " remain exact on IDLE F0. Correct other poses in Pixel Editor; no geometric warping.");
 if(stale.length){
  // If archiving fails (e.g. browser storage full), abort without overwriting
  // the previous character data; never silently destroy manual corrections.
  S.archiveStaleCorrections(id,part,stale);
  warning.push(stale.length+" obsolete frame correction(s) archived and rebuilt from source");
 }
 S.setGenerated(id,part,output.toDataURL("image/png"),{
  generated,protectedFrames,unchanged,masters,reviewDirections,engine:"native-palette-v1",staleArchived:stale.length,warning
 });
 return {part,generated,protectedFrames,unchanged,staleArchived:stale.length,masters,reviewDirections,warning};
}
async function generateCharacter(id,opts={}){
 const S=root?.V6PCharacterStore,C=root?.V6PPartCatalog;
 if(!S?.get(id)||!C)throw Error("Select a character in Character Database first");
 const repair=S.repairTopBackMasters?.(id)||{moved:0,remainingCorrections:0};
 const row=S.get(id);
 const selected=C.PARTS.filter(part=>Object.hasOwn(row.masters||{},part)||Object.hasOwn(row.parts||{},part));
 const parts=(opts.parts||selected).filter(p=>C.isPart(p));
 if(!parts.length)return {parts:[],frames:0,corrected:0,message:"No custom sprites yet. Existing database parts already have stock animations."};
 const results=[];
 for(let i=0;i<parts.length;i++){
  if(typeof opts.progress==="function")opts.progress({index:i,total:parts.length,part:parts[i]});
  results.push(await generatePart(id,parts[i]));
 }
 root.V6PCompositor?.clearCache?.();
 return {parts:results,frames:results.reduce((n,p)=>n+p.generated,0),
 corrected:results.reduce((n,p)=>n+p.protectedFrames,0),
  reviewDirections:results.reduce((n,p)=>n+(p.reviewDirections?.length||0),0),
 archivedStaleCorrections:results.reduce((n,p)=>n+(p.staleArchived||0),0),
 repairedBackMasters:repair.moved,remainingLegacyCorrections:repair.remainingCorrections};
}
const ANCHOR_KEY="vl-mahluk-animation-anchor-poses-v1";
const PARTS=["leg_l","leg_r","torso","arm_l","arm_r","head"];
const DEFAULT_PIVOTS={head:[32,35],torso:[32,60],arm_l:[20,54],arm_r:[44,54],leg_l:[25,84],leg_r:[39,84]};
function anchorDatabase(){
 try{const obj=JSON.parse(root?.localStorage?.getItem(ANCHOR_KEY)||"{}");
  return obj&&typeof obj==="object"&&!Array.isArray(obj)?Object.values(obj).filter(x=>x&&x.id&&Array.isArray(x.frames)&&x.frames.length>0&&x.frames.length<=6):[];
 }catch{return []}
}
function nativePartAt(x,y){
 if(y<44)return "head";if(y<80)return x<23?"arm_l":x>40?"arm_r":"torso";return x<32?"leg_l":"leg_r";
}
function nativeSegments(source){
 const d=source.getContext("2d",{willReadFrequently:true}).getImageData(0,0,FW,FH);
 const layers={},images={};
 for(const p of PARTS){layers[p]=new Uint8ClampedArray(d.data.length);images[p]=document.createElement("canvas");images[p].width=FW;images[p].height=FH}
 for(let y=0;y<FH;y++)for(let x=0;x<FW;x++){
  const i=(y*FW+x)*4,part=nativePartAt(x,y);
  for(let k=0;k<4;k++)layers[part][i+k]=d.data[i+k];
 }
 for(const p of PARTS)images[p].getContext("2d").putImageData(new ImageData(layers[p],FW,FH),0,0);
 return images;
}
function anchorFrame(parts,transforms){
 const cv=sourceCanvas(),c=cv.getContext("2d");c.imageSmoothingEnabled=false;
 for(const p of PARTS){
  const [ax,ay]=DEFAULT_PIVOTS[p],t=transforms?.[p]||{};
  const anchorX=Number.isFinite(t.ax)?t.ax:ax,anchorY=Number.isFinite(t.ay)?t.ay:ay;
  const dx=Number.isFinite(t.x)?t.x:0,dy=Number.isFinite(t.y)?t.y:0;
  const a=Number.isFinite(t.angle)?t.angle:0;
  c.save();c.translate(anchorX+dx,anchorY+dy);c.rotate(a*Math.PI/180);
  c.drawImage(parts[p],-anchorX,-anchorY);c.restore();
 }
 return cv;
}
function generateAnchorClip(characterSheet,entry,opts={}){
 if(!entry||!Array.isArray(entry.frames)||entry.frames.length<1||entry.frames.length>6)throw Error("Invalid anchor clip");
 const n=entry.frames.length,sheet=document.createElement("canvas");sheet.width=n*FW;sheet.height=DIRS.length*FH;
 const c=sheet.getContext("2d");c.imageSmoothingEnabled=false;
 for(let di=0;di<DIRS.length;di++){
  const dir=DIRS[di],source=root.V6PCompositor.extractFrame(characterSheet,"idle",dir,0);
  const parts=nativeSegments(source);
  for(let fi=0;fi<n;fi++){
   const frame=anchorFrame(parts,entry.tracks?.[dir]?.[fi]||{});
   c.drawImage(frame,fi*FW,di*FH);
  }
 }
 return {id:entry.id,sheet:sheet.toDataURL("image/png"),frames:n,
  frame_ms:entry.frames.map(x=>Math.max(40,Math.min(800,Number(x.ms)||140))),
  loop:entry.loop!==false,source:"character-retarget:anchor-v1"};
}
function generateAnchorClips(characterSheet){
 const result=[],warnings=[];
 for(const rec of anchorDatabase()){
  try{result.push(generateAnchorClip(characterSheet,rec))}
  catch(e){warnings.push(rec.id+": "+e.message)}
 }
 return {clips:result,warnings};
}

return Object.freeze({DIRS,FW,FH,ANCHOR_KEY,bounds,remapColors,masterDiff,paintNativePose,transferFrame,generatePart,generateCharacter,anchorDatabase,generateAnchorClip,generateAnchorClips});
});