/* MAHLUK V6P - 4-view appearance -> existing frame-by-frame motion atlas.
   Paint each view once (idle F0); generate each of 11 stock V6P action frames
   by transferring painted style onto the native posed silhouette. No rig and
   no fabricated views. Corrected frames remain immutable when regenerating.
   Shape transfer is approximate, preview and manual correction still required. */
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
function segment(x,y,box){
 // For upright poses, independent limb/torso bands retain approximate placement.
 const nx=(x-box.x)/Math.max(1,box.w),ny=(y-box.y)/Math.max(1,box.h);
 if(ny<.26)return "head";
 if(ny>.68)return nx<.5?"leg_l":"leg_r";
 if(nx<.26)return "arm_l";
 if(nx>.74)return "arm_r";
 return "torso";
}
function regionBounds(data,box,w=FW,h=FH){
 if(!box)return {};
 const out={};
 for(let y=box.y;y<box.y+box.h;y++)for(let x=box.x;x<box.x+box.w;x++){
  if(data[(y*w+x)*4+3]<8)continue;
  const name=segment(x,y,box);
  if(!out[name])out[name]={x,y,maxx:x,maxy:y};
  else {const r=out[name];r.x=Math.min(r.x,x);r.y=Math.min(r.y,y);r.maxx=Math.max(r.maxx,x);r.maxy=Math.max(r.maxy,y)}
 }
 for(const r of Object.values(out)){r.w=r.maxx-r.x+1;r.h=r.maxy-r.y+1;delete r.maxx;delete r.maxy}
 return out;
}
function mapCoord(x,y,from,to){
 const u=(x-to.x+.5)/Math.max(1,to.w),v=(y-to.y+.5)/Math.max(1,to.h);
 return {x:Math.max(0,Math.min(FW-1,Math.floor(from.x+u*from.w))),
         y:Math.max(0,Math.min(FH-1,Math.floor(from.y+v*from.h)))};
}
function transferFrame(original,painted,posed){
 if(original.length!==FW*FH*4||painted.length!==original.length||posed.length!==original.length)
  throw Error("Expected three native RGBA 64x112 frames");
 if(equals(original,painted))return new Uint8ClampedArray(posed);
 const result=new Uint8ClampedArray(posed);
 const sourceBounds=bounds(original)||bounds(painted),targetBounds=bounds(posed);
 if(!sourceBounds||!targetBounds)return result;
 const srcRegions=regionBounds(original,sourceBounds),dstRegions=regionBounds(posed,targetBounds);
 const upright=(targetBounds.h>targetBounds.w*.9&&sourceBounds.h>sourceBounds.w*.9);
 const palette=remapColors(original,painted);
 // First pass preserves target native pose silhouette and transfers dominant colors.
 for(let i=0;i<posed.length;i+=4)if(posed[i+3]>8&&palette.has(color(posed,i))){
  const c=palette.get(color(posed,i));result[i]=(c>>16)&255;result[i+1]=(c>>8)&255;result[i+2]=c&255;
 }
 // Transfer source texture details by correspondence. Only edits replace stock pixels.
 // A few isolated edits do not recolor an unrelated limb or alter empty pixels.
 for(let y=targetBounds.y;y<targetBounds.y+targetBounds.h;y++)
 for(let x=targetBounds.x;x<targetBounds.x+targetBounds.w;x++){
  const i=(y*FW+x)*4;if(posed[i+3]<8)continue;
  let from=sourceBounds,to=targetBounds;
  if(upright){const name=segment(x,y,targetBounds);if(srcRegions[name]&&dstRegions[name]){from=srcRegions[name];to=dstRegions[name]}}
  const at=mapCoord(x,y,from,to),j=(at.y*FW+at.x)*4;
  if(original[j+3]<8||painted[j+3]<8)continue;
  if(painted[j]===original[j]&&painted[j+1]===original[j+1]&&painted[j+2]===original[j+2])continue;
  result[i]=painted[j];result[i+1]=painted[j+1];result[i+2]=painted[j+2];result[i+3]=painted[j+3];
 }
 // Carry added silhouette pixels, e.g. sleeves/hair outside the original mask.
 // Map each added pixel forward using native silhouette bounds.
 const mapPoint=(x,y,from,to)=>{
  const u=(x-from.x+.5)/Math.max(1,from.w),v=(y-from.y+.5)/Math.max(1,from.h);
  return {x:Math.round(to.x+u*to.w-.5),y:Math.round(to.y+v*to.h-.5)};
 };
 for(let y=0;y<FH;y++)for(let x=0;x<FW;x++){
  const i=(y*FW+x)*4;
  if(painted[i+3]<8||original[i+3]>8)continue;
  // Keep extras around source silhouette; unrelated new disconnected art is not invented.
  if(x<sourceBounds.x-16||x>sourceBounds.x+sourceBounds.w+16||
     y<sourceBounds.y-16||y>sourceBounds.y+sourceBounds.h+16)continue;
  const at=mapPoint(x,y,sourceBounds,targetBounds);
  if(at.x<0||at.x>=FW||at.y<0||at.y>=FH)continue;
  const j=(at.y*FW+at.x)*4;
  result[j]=painted[i];result[j+1]=painted[i+1];result[j+2]=painted[i+2];result[j+3]=painted[i+3];
 }
 return result;
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
 const g=output.getContext("2d",{willReadFrequently:true});g.imageSmoothingEnabled=false;g.drawImage(existing||base,0,0);
 const sources={},masters=[],warning=[];
 for(const dir of DIRS){
  const original=frame(base,C,"idle",dir,0).data;
  let painted;
  const m=S.master(id,part,dir);
  if(m){painted=await frameFromUrl(m);masters.push(dir)}
  else if(existing)painted=frame(existing,C,"idle",dir,0).data;
  else painted=original;
  sources[dir]={original,painted};
 }
 let generated=0,protectedFrames=0,unchanged=0;
 for(const action of C.ACTIONS)for(const dir of DIRS)for(let n=0;n<C.FRAMES[action];n++){
  if(S.isCorrection(id,part,action,dir,n)){protectedFrames++;continue}
  const original=frame(base,C,action,dir,n).data;
  const source=sources[dir],painted=transferFrame(source.original,source.painted,original);
  if(equals(original,painted))unchanged++;else generated++;
  put(output,C,action,dir,n,painted);
 }
 // Master input stays pixel-perfect and should not be overwritten by generated warp.
 for(const dir of DIRS)if(S.master(id,part,dir)&&!S.isCorrection(id,part,"idle",dir,0))
  put(output,C,"idle",dir,0,sources[dir].painted);
 if(masters.length<4)warning.push((4-masters.length)+" direction(s) using existing/stock source sprites");
 warning.push("Pose shape transfer approximate: inspect especially sit, sleep, lie, float and swim");
 S.setGenerated(id,part,output.toDataURL("image/png"),{generated,protectedFrames,unchanged,masters,warning});
 return {part,generated,protectedFrames,unchanged,masters,warning};
}
async function generateCharacter(id,opts={}){
 const S=root?.V6PCharacterStore,C=root?.V6PPartCatalog;
 const row=S?.get(id);if(!row||!C)throw Error("Select a character in Character Database first");
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
 corrected:results.reduce((n,p)=>n+p.protectedFrames,0)};
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

return Object.freeze({DIRS,FW,FH,ANCHOR_KEY,bounds,remapColors,transferFrame,generatePart,generateCharacter,anchorDatabase,generateAnchorClip,generateAnchorClips});
});