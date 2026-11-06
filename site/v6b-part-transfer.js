/* V6B native human anatomy edit propagation.
 * Original skin/bone sprites and each native action's separated bones are
 * unchanged. Edited source part pixels are mapped into the SAME bone of each
 * posed v6b frame. This is a native 64x112 RGBA patch, not an idle-body paste.
 * For radical joint reshapes, author frame overrides for exact silhouettes.
 */
(function(root,factory){"use strict";const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.V6BPartTransfer=api;
})(typeof window!=="undefined"?window:null,function(){"use strict";
 const W=64,H=112;
 function bounds(bytes){
  let minX=W,minY=H,maxX=-1,maxY=-1;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   if(bytes[(y*W+x)*4+3]===0)continue;
   minX=Math.min(minX,x);minY=Math.min(minY,y);
   maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
  }
  return maxX<0?null:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1};
 }
 const cap=v=>Math.max(0,Math.min(255,Math.round(v)));
 function transfer(source,edited,motion){
  if(![source,edited,motion].every(a=>a&&a.width===W&&a.height===H&&a.data?.length===W*H*4))
   throw Error("Part transfer requires 64x112 RGBA ImageData for all three inputs");
  const a=source.data,b=edited.data,m=motion.data,out=new Uint8ClampedArray(m);
  const src=bounds(a),dest=bounds(m);
  if(!src||!dest)return {data:out,width:W,height:H,changed:0};
  const coord=(v,fromOrigin,fromLength,toOrigin,toLength)=>
   toOrigin+Math.round((v-fromOrigin)*Math.max(0,toLength-1)/Math.max(1,fromLength-1));
  let changes=0;
  // Apply color/shading adjustments and deletions by the native bone's
  // normalized bounds rather than assuming its screen-space position is fixed.
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const i=(y*W+x)*4;
   if(a[i]===b[i]&&a[i+1]===b[i+1]&&a[i+2]===b[i+2]&&a[i+3]===b[i+3])continue;
   const dx=coord(x,src.x,src.w,dest.x,dest.w);
   const dy=coord(y,src.y,src.h,dest.y,dest.h);
   if(dx<0||dy<0||dx>=W||dy>=H)continue;
   const j=(dy*W+dx)*4;
   if(b[i+3]===0){out[j]=0;out[j+1]=0;out[j+2]=0;out[j+3]=0;changes++;continue}
   if(a[i+3]===0){for(let k=0;k<4;k++)out[j+k]=b[i+k];changes++;continue}
   if(m[j+3]===0)continue;
   for(let k=0;k<3;k++)out[j+k]=cap(m[j+k]+b[i+k]-a[i+k]);
   out[j+3]=b[i+3];changes++;
  }
  return {data:out,width:W,height:H,changed:changes};
 }
 return Object.freeze({W,H,bounds,transfer});
});
