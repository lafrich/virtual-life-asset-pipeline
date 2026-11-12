/* LGR Nova experimental wide canvas projection — 2026-11-12
 * No changed source sprites, masks, bone transforms or official base.
 *
 * LGR1Raster's image size is currently fixed to 64x112, while a rotated
 * 84px-high body can require >64px horizontal coverage. This adapter
 * renders several horizontally translated passes of the SAME 11-part pose
 * into a wider diagnostic canvas. It is not a runtime integration or a
 * recommendation to do 3x raster passes every production frame.
 */
(function(root,factory){"use strict";
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.LGRNovaWide=factory(root);
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(root){
 "use strict";
 const W=64,H=112;
 function assert(ok,message){if(!ok)throw Error("LGR Nova wide: "+message)}
 function tiles(width,offset){
  assert(Number.isInteger(width)&&width>=W&&width<=256,"width must be 64..256");
  assert(Number.isInteger(offset)&&Math.abs(offset)<=256,"offset must be integer");
  const out=[];
  for(let x=0;x<width;x+=W)out.push({at:x,span:Math.min(W,width-x),rootShift:offset-x});
  return out;
 }
 function translated(pose,dx){
  // LGR1Motion.framePose returns already converted near/far screen poses.
  // Its pelvis x contains the accumulated root + torso translation.
  // Change only the root x; children inherit this shift hierarchically.
  return {...pose,pelvis:{...pose?.pelvis,x:Number(pose?.pelvis?.x||0)+dx}};
 }
 function draw(prepared,pose,options={}){
  assert(root?.LafrichPuppetRenderer?.render,"LGR renderer unavailable");
  const width=options.width??160,offset=options.offset??48;
  const cvs=(options.document||root.document).createElement("canvas");
  cvs.width=width;cvs.height=H;
  const ctx=cvs.getContext("2d");ctx.imageSmoothingEnabled=false;
  const R=root.LafrichPuppetRenderer;
  for(const tile of tiles(width,offset)){
   const moved=translated(pose,tile.rootShift);
   const segment=R.render(prepared,moved,options.order?{order:options.order}:undefined);
   ctx.drawImage(segment,0,0,tile.span,H,tile.at,0,tile.span,H);
  }
  return {canvas:cvs,anchor:{x:32+offset,y:100},
   viewport:{x:offset,y:0,width:W,height:H}};
 }
 function outsideOriginal(canvas,offset=48){
  const w=canvas.width,h=canvas.height,rgba=canvas.getContext("2d",{willReadFrequently:true})
    .getImageData(0,0,w,h).data;
  let opaque=0,outside=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   if(!rgba[(y*w+x)*4+3])continue;
   opaque++;
   if(x<offset||x>=offset+W)outside++;
  }
  return {opaque,outside,fraction:opaque?outside/opaque:0};
 }
 return Object.freeze({tiles,translated,draw,outsideOriginal});
});
