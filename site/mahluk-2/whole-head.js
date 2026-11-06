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
 function composite({slots,allowed,getNative,getOverride,flattened=false,createCanvas}){
  const atlas=createCanvas();atlas.width=64;atlas.height=448;
  const ctx=atlas.getContext('2d');ctx.imageSmoothingEnabled=false;
  // A newly saved merged HEAD override is already the exact combined
  // artwork. Never re-apply old fringe cutouts over the artist's erasures.
  const headOverride=getOverride('head');
  if(flattened&&headOverride){
   ctx.drawImage(headOverride,0,0,64,448);
   return atlas;
  }
  // Legacy HEAD paint (before unified mode) is one layer, not a
  // complete merged silhouette. Composite legacy hair and fringe above it.
  for(const id of PARTS){
   const override=getOverride(id);
   if(override){ctx.drawImage(override,0,0,64,448);continue}
   for(const slot of slots||[]){
    if(slot.bone!==id||!allowed(slot))continue;
    const image=getNative(slot);
    if(image)ctx.drawImage(image,0,0,64,448);
   }
  }
  return atlas;
 }
 return Object.freeze({PARTS,OMIT,EXCLUDED,FUSED,composite});
});
