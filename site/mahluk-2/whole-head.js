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
 function viewCoverage(image,view,createCanvas){
  if(!image||!Number.isInteger(view)||view<0||view>3)return 0;
  // Browser inputs are HTMLImageElement/Canvas; old Node fixtures use
  // primitive sentinel sources. Unknown alpha must NOT trigger repair.
  if(typeof image!=='object'&&typeof image!=='function')
   return Number.MAX_SAFE_INTEGER;
  let counts=inkCache.get(image);
  if(!counts){
   counts=[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER];
   try{
    const cv=createCanvas();cv.width=W;cv.height=H*4;
    const ctx=cv.getContext('2d',{willReadFrequently:true});
    ctx.clearRect(0,0,W,H*4);
    ctx.drawImage(image,0,0,W,H*4);
    const rgba=ctx.getImageData(0,0,W,H*4).data;
    counts=[0,0,0,0];
    for(let i=0;i<rgba.length;i+=4){
     if(rgba[i+3]>=1)counts[Math.floor(i/4/(W*H))]++;
    }
   }catch{
    // If readback is blocked, leave the saved asset unmodified.
   }
   inkCache.set(image,counts);
  }
  return counts[view];
 }
 function viewHasPixels(image,view,createCanvas){
  return viewCoverage(image,view,createCanvas)>0;
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
 return Object.freeze({PARTS,OMIT,EXCLUDED,FUSED,DIR,viewCoverage,viewHasPixels,composite});
});
