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
 return Object.freeze({rectFromPoints,normalizeRect,contains,flip,translate});
});
