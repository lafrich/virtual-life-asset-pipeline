/* Mahluk Hidup 2 — one editable HEAD plane, without destructive
 * migrations of legacy hair/fringe pixel atlases or bone transforms.
 * V6B raw sources remain accessible in their original pipeline.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MH2WholeHead=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const PARTS=Object.freeze(['hair_back','head','hair_cap','fringe_l','fringe_mid','fringe_r']);
 const OMIT=Object.freeze(['hair_back','hair_cap','fringe_l','fringe_mid','fringe_r','phone']);
 const EXCLUDED=new Set(OMIT),FUSED=new Set(PARTS);
 const DIR=['se','sw','ne','nw'],W=64,H=112;
 const inkCache=new WeakMap();
 function viewHasPixels(image,view,createCanvas){
  if(!image||!Number.isInteger(view)||view<0||view>3)return false;
  // Browser inputs are HTMLImageElement/Canvas; old Node tests use string
  // sentinel sources. Never put primitive values into a WeakMap.
  if(typeof image!=='object'&&typeof image!=='function')return true;
  let flags=inkCache.get(image);
  if(!flags){
   flags=[true,true,true,true]; // Fail open to preserve user's art.
   try{
    const cv=createCanvas();cv.width=W;cv.height=H*4;
    const ctx=cv.getContext('2d',{willReadFrequently:true});
    ctx.clearRect(0,0,W,H*4);
    ctx.drawImage(image,0,0,W,H*4);
    const rgba=ctx.getImageData(0,0,W,H*4).data;
    flags=[false,false,false,false];
    for(let i=0;i<rgba.length;i+=4){
     if(rgba[i+3]>=1)flags[Math.floor(i/4/(W*H))]=true;
    }
   }catch{
    // If a browser cannot read pixel data, never discard an override.
   }
   inkCache.set(image,flags);
  }
  return flags[view];
 }
 function drawAtlasView(ctx,image,view){
  ctx.drawImage(image,0,view*H,W,H,0,view*H,W,H);
 }
 function composite({slots,allowed,getNative,getOverride,flattened=false,createCanvas}){
  const atlas=createCanvas();atlas.width=W;atlas.height=H*4;
  const ctx=atlas.getContext('2d');ctx.imageSmoothingEnabled=false;
  const headOverride=getOverride('head');
  // Composite the historical head + hair pieces for each view separately.
  // Legacy editors may have stored a 64x448 override with only SE/SW
  // filled, leaving NE/NW completely blank. Empty *unpainted* directions
  // must fall back to their true source PNG, not erase their native head.
  for(const id of PARTS){
   const override=getOverride(id);
   for(let dir=0;dir<4;dir++){
    if(!flattened&&override&&viewHasPixels(override,dir,createCanvas)){
     drawAtlasView(ctx,override,dir);
    }else{
     for(const slot of slots||[]){
      if(slot.bone!==id||!allowed(slot))continue;
      const source=getNative(slot);
      if(source)drawAtlasView(ctx,source,dir);
     }
    }
   }
  }
  if(flattened&&headOverride){
   // A newly saved merged HEAD is authoritative only for view slices that
   // contain art. Do not overlay old fringe across the user's saved face.
   for(let dir=0;dir<4;dir++){
    if(!viewHasPixels(headOverride,dir,createCanvas))continue;
    ctx.clearRect(0,dir*H,W,H);
    drawAtlasView(ctx,headOverride,dir);
   }
  }
  return atlas;
 }
 return Object.freeze({PARTS,OMIT,EXCLUDED,FUSED,DIR,viewHasPixels,composite});
});
