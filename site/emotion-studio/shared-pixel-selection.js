/* Native 64x112 rectangular pixel selection operations for Mahluk 2.0.
 * Operations are pure, so no browser canvas resizing or rig changes.
 */
(function(root,factory){"use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MH2PixelSelection=api;
})(typeof window!=="undefined"?window:null,function(){"use strict";
 const clamp=(n,min,max)=>Math.min(max,Math.max(min,Math.round(Number(n)||0)));
 function rectFromPoints(a,b,width=64,height=112){
  const ax=clamp(a.x,0,width-1),bx=clamp(b.x,0,width-1),
   ay=clamp(a.y,0,height-1),by=clamp(b.y,0,height-1);
  return {x:Math.min(ax,bx),y:Math.min(ay,by),
   w:Math.abs(bx-ax)+1,h:Math.abs(by-ay)+1};
 }
 function normalizeRect(r,w,h){
  if(!r)return {x:0,y:0,w,h};
  const x=clamp(r.x,0,w-1),y=clamp(r.y,0,h-1);
  return {x,y,w:clamp(r.w,1,w-x),h:clamp(r.h,1,h-y)};
 }
 function contains(rect,x,y){
  return Boolean(rect&&x>=rect.x&&x<rect.x+rect.w&&y>=rect.y&&y<rect.y+rect.h);
 }
 function flip(data,width,height,rect,axis="horizontal"){
  const box=normalizeRect(rect,width,height);
  const output=new Uint8ClampedArray(data);
  for(let y=0;y<box.h;y++)for(let x=0;x<box.w;x++){
   const ix=box.x+x,iy=box.y+y;
   const fromX=axis==="horizontal"?box.x+box.w-1-x:ix;
   const fromY=axis==="vertical"?box.y+box.h-1-y:iy;
   const i=(iy*width+ix)*4,j=(fromY*width+fromX)*4;
   output.set(data.slice(j,j+4),i);
  }
  return output;
 }
 function translate(data,width,height,rect,dx,dy){
  const box=normalizeRect(rect,width,height),out=new Uint8ClampedArray(data),
   xstep=Math.round(dx),ystep=Math.round(dy);
  // Remove original selection then deposit visible pixels at destination.
  for(let y=0;y<box.h;y++)for(let x=0;x<box.w;x++){
   const i=((box.y+y)*width+box.x+x)*4;
   out.fill(0,i,i+4);
  }
  for(let y=0;y<box.h;y++)for(let x=0;x<box.w;x++){
   const destX=box.x+x+xstep,destY=box.y+y+ystep;
   if(destX<0||destY<0||destX>=width||destY>=height)continue;
   const from=((box.y+y)*width+box.x+x)*4,to=(destY*width+destX)*4;
   if(data[from+3]===0)continue;
   out.set(data.slice(from,from+4),to);
  }
  return out;
 }

 const CLIP_FORMAT="mh2-native-rgba-selection-v1";
 function copy(data,width,height,rect){
  const box=normalizeRect(rect,width,height),pixels=new Uint8ClampedArray(box.w*box.h*4);
  for(let row=0;row<box.h;row++){
   const offset=((box.y+row)*width+box.x)*4;
   pixels.set(data.subarray(offset,offset+box.w*4),row*box.w*4);
  }
  return {format:CLIP_FORMAT,...box,pixels};
 }
 function validStamp(stamp,width=64,height=112){
  return !!stamp&&stamp.format===CLIP_FORMAT&&
   Number.isInteger(stamp.w)&&stamp.w>0&&stamp.w<=width&&
   Number.isInteger(stamp.h)&&stamp.h>0&&stamp.h<=height&&
   Number.isInteger(stamp.x)&&Number.isInteger(stamp.y)&&
   stamp.x>=0&&stamp.y>=0&&stamp.x+stamp.w<=width&&stamp.y+stamp.h<=height&&
   (stamp.pixels instanceof Uint8ClampedArray||Array.isArray(stamp.pixels))&&
   stamp.pixels.length===stamp.w*stamp.h*4;
 }
 // A Genesis body part may sit on a mostly transparent 64x112 plane.
 // Copying the full plane makes Paste appear inert or impossible to move.
 // Bound implicit COPY to actual, non-transparent pixels instead.
 function opaqueBounds(data,width,height){
  if(!data||data.length!==width*height*4)return null;
  let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   if(!data[(y*width+x)*4+3])continue;
   left=Math.min(left,x);right=Math.max(right,x);
   top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  return right<0?null:{x:left,y:top,w:right-left+1,h:bottom-top+1};
 }
 function sameRect(a,b){
  return !!a&&!!b&&a.x===b.x&&a.y===b.y&&a.w===b.w&&a.h===b.h;
 }
 function pasteTarget(stamp,width=64,height=112,{selection=null,mirror=false,direction="",bone=""}={}){
  if(!validStamp(stamp,width,height))throw Error("Invalid native RGBA clipboard");
  // A SELECT remaining after COPY is the SOURCE box, not a destination.
  // An explicitly drawn different box acts as a destination anchor.
  const explicit=selection&&!sameRect(selection,stamp);
  let x=explicit?selection.x:(mirror?width-stamp.x-stamp.w:stamp.x);
  let y=explicit?selection.y:stamp.y;
  // Same-view normal paste must be visible instead of overwriting the exact
  // source pixels. Pasted content stays movable and Undo-able.
  if(!explicit&&!mirror&&stamp.direction===direction&&stamp.bone===bone){
   if(x+stamp.w+2<=width)x+=2;
   else if(x>=2)x-=2;
   else if(y+stamp.h+2<=height)y+=2;
   else if(y>=2)y-=2;
  }
  return {x:clamp(x,0,width-1),y:clamp(y,0,height-1),explicit:!!explicit};
 }
 function paste(data,width,height,stamp,{x=stamp.x,y=stamp.y,mirror=false,replace=false}={}){
  if(!validStamp(stamp,width,height))throw new Error("Invalid native RGBA clipboard");
  const output=new Uint8ClampedArray(data),left=Math.round(x),top=Math.round(y);
  for(let row=0;row<stamp.h;row++)for(let col=0;col<stamp.w;col++){
   const dx=left+col,dy=top+row;
   if(dx<0||dy<0||dx>=width||dy>=height)continue;
   const sx=mirror?stamp.w-1-col:col;
   const src=(row*stamp.w+sx)*4,dest=(dy*width+dx)*4;
   if(!replace&&stamp.pixels[src+3]===0)continue;
   for(let channel=0;channel<4;channel++)output[dest+channel]=stamp.pixels[src+channel];
  }
  return output;
 }
 return Object.freeze({rectFromPoints,normalizeRect,contains,flip,translate,copy,paste,validStamp,opaqueBounds,pasteTarget,CLIP_FORMAT});
});
