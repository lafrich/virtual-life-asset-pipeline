/* Helpers for opening a full 384x4928 v6p part sheet inside the existing 64x112 editor. */
(function(root,factory){"use strict";const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.V6PPixelSource=api;})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(root){"use strict";
const C=(root&&root.V6PPartCatalog)||(typeof require==="function"?require("./v6p-part-catalog.js"):null);
function sheetCanvas(){
 const cv=document.createElement("canvas");cv.width=C.W;cv.height=C.H;
 const c=cv.getContext("2d",{willReadFrequently:true});c.imageSmoothingEnabled=false;return {cv,c};
}
function loadImage(src){
 return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(Error("Cannot load "+src));i.src=src;});
}
function blankSheet(size){
 const w=(size&&size.w)||C.W,h=(size&&size.h)||C.H;
 const cv=document.createElement("canvas");cv.width=w;cv.height=h;
 const c=cv.getContext("2d",{willReadFrequently:true});c.imageSmoothingEnabled=false;
 return cv;
}
function sizedCanvas(w,h){
 const cv=document.createElement("canvas");cv.width=w;cv.height=h;
 const c=cv.getContext("2d",{willReadFrequently:true});c.imageSmoothingEnabled=false;
 return {cv,c};
}
async function loadSheetFromUrl(url,size){
 const w=(size&&size.w)||C.W,h=(size&&size.h)||C.H;
 const {cv,c}=sizedCanvas(w,h);
 const img=await loadImage(url);
 if(img.naturalWidth!==w||img.naturalHeight!==h)throw Error("sheet must be "+w+"×"+h+" (got "+img.naturalWidth+"×"+img.naturalHeight+")");
 c.clearRect(0,0,w,h);c.drawImage(img,0,0);
 return cv;
}
async function loadSheet(part,preferredUrl){
 C.normalizePart(part);
 return loadSheetFromUrl(preferredUrl||C.mediaUrl(part));
}
function extractAt(sheet,x,y,w,h){return sheet.getContext("2d",{willReadFrequently:true}).getImageData(x,y,w,h);}
function stampAt(sheet,x,y,image){sheet.getContext("2d").putImageData(image,x,y);}
function extract(sheet,action,dir,frame){
 const o=C.cellOrigin(action,dir,frame);
 const c=sheet.getContext("2d",{willReadFrequently:true});
 return c.getImageData(o.x,o.y,o.w,o.h);
}
function stamp(sheet,action,dir,frame,image){
 const o=C.cellOrigin(action,dir,frame);
 sheet.getContext("2d").putImageData(image,o.x,o.y);
}
function applyEdits(base,edits){
 const {cv,c}=sheetCanvas();
 c.drawImage(base,0,0);
 if(edits){
  for(const [key,data] of edits.entries()){
   const [action,dir,frame]=key.split("|");
   stamp(cv,action,dir,Number(frame),data);
  }
 }
 return cv;
}
function toDataURL(sheet){return sheet.toDataURL("image/png");}
function patchObject(part,edits,toPNG){
 const frames=[];
 if(edits){
  for(const [key,data] of [...edits.entries()].sort(([a],[b])=>a.localeCompare(b))){
   const [action,direction,frame]=key.split("|");
   frames.push({action,direction,frame:Number(frame),png:toPNG(data)});
  }
 }
 return {format:"virtual-life-v6p-part-patch-v1",version:1,part,filename:C.filename(part),
  sheet_size:[C.W,C.H],frame_size:[C.FW,C.FH],frames};
}
function hasAlpha(sheet){
 const d=sheet.getContext("2d",{willReadFrequently:true}).getImageData(0,0,sheet.width,sheet.height).data;
 for(let i=3;i<d.length;i+=4)if(d[i]>0)return true;
 return false;
}
return Object.freeze({loadSheet,loadSheetFromUrl,blankSheet,extract,extractAt,stamp,stampAt,applyEdits,toDataURL,patchObject,hasAlpha,sheetCanvas});
});
