/* Mahluk Hidup / Semesta — shared 64x112 action appearance.
 * Rotation is presentation-only and never edits native character PNGs.
 * Native expression overlays are cropped to the original face area. Custom
 * legacy facial atlases are full-body sheets, so only the face is copied.
 * Non-front directions have no visible face: never invent rear-view eyes.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.VLActionAppearance=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const DIRECTIONS=["se","sw","ne","nw"];
 const rotation=n=>((Math.round((Number(n)||0)/90)*90)%360+360)%360;
 function sourceRect(image,view,frame,mode){
  const w=image?.naturalWidth||image?.width||0,h=image?.naturalHeight||image?.height||0;
  if(w<64||h<112||view>1)return null;
  const columns=Math.floor(w/64),rows=Math.floor(h/112);
  const row=mode==="overlay"?(rows>=8?4+view:view):view;
  if(row>=rows)return null;
  const n=((Math.floor(frame)||0)%columns+columns)%columns;
  return {x:n*64,y:row*112};
 }
 // Scan the actual upright head in a native 64x112 pose. Use the first
 // opaque head rows (not its feet/pivot), so squat/bend/idle head motion
 // translates the face overlay by the SAME amount.
 function headAnchor(rgba){
  if(!rgba||rgba.width!==64||rgba.height!==112||!rgba.data)return null;
  const a=rgba.data;let top=-1;
  for(let y=18;y<86&&top<0;y++){
   for(let x=8;x<56;x++){
    if(a[(y*64+x)*4+3]>=160){top=y;break;}
   }
  }
  if(top<0)return null;
  const xs=[];
  for(let y=top;y<=Math.min(top+11,85);y++){
   for(let x=8;x<56;x++){
    if(a[(y*64+x)*4+3]>=160)xs.push(x);
   }
  }
  if(xs.length<8)return null;
  xs.sort((a,b)=>a-b);
  return {x:xs[Math.floor(xs.length/2)],y:top};
 }
 const blehSources=new WeakMap();
 function blehHeadShift(ctx,image,src){
  // Human Bleh uses a full native sprite sheet. Sample its same-actor
  // head, compare to the action frame already painted into the editor.
  // Never calculate this from character-independent face coordinates.
  if(typeof document==="undefined"||typeof ctx.getImageData!=="function")return {x:0,y:0};
  try{
   let frames=blehSources.get(image);
   if(!frames){frames=new Map();blehSources.set(image,frames);}
   const key=src.x+","+src.y;
   if(!frames.has(key)){
    const sample=document.createElement("canvas");sample.width=64;sample.height=112;
    const sctx=sample.getContext("2d",{willReadFrequently:true});
    if(!sctx)return {x:0,y:0};
    sctx.drawImage(image,src.x,src.y,64,112,0,0,64,112);
    frames.set(key,headAnchor(sctx.getImageData(0,0,64,112)));
   }
   const from=frames.get(key),to=headAnchor(ctx.getImageData(0,0,64,112));
   if(!from||!to)return {x:0,y:0};
   const dx=to.x-from.x,dy=to.y-from.y;
   // Lying rigs tilt the complete head: do not force an upright face
   // into a completely different projection.
   if(Math.abs(dx)>16||Math.abs(dy)>27)return {x:0,y:0};
   return {x:dx,y:dy};
  }catch(_){return {x:0,y:0};}
 }
 // Mahluk native Male/Female expressive sheets are full sprites. Compare
 // them with their actor's NEUTRAL sheet and copy only changed face pixels;
 // never replace an opaque rectangle of jaw, neck, scalp or clothing.
 const deltaCache=new WeakMap();
 function drawNativeHumanFace(ctx,image,neutral,src,shift){
  if(typeof document==="undefined"||!ctx?.getImageData)return false;
  let frames=deltaCache.get(image);
  if(!frames){frames=new Map();deltaCache.set(image,frames);}
  const key=(neutral.src||"neutral")+"|"+src.x+"|"+src.y;
  let pixels=frames.get(key);
  if(!pixels){
   const scratch=document.createElement("canvas");
   scratch.width=64;scratch.height=112;
   const paint=scratch.getContext("2d",{willReadFrequently:true});
   if(!paint)return false;
   try{
    paint.drawImage(image,src.x,src.y,64,112,0,0,64,112);
    const desired=paint.getImageData(0,0,64,112).data;
    paint.clearRect(0,0,64,112);
    paint.drawImage(neutral,src.x,src.y,64,112,0,0,64,112);
    const base=paint.getImageData(0,0,64,112).data;
    pixels=[];
    // Eyes, brows, blush and tongue must fit inside the actor's facial area.
    // Differences beyond the face, including neck and torso, are ignored.
    for(let y=32;y<61;y++)for(let x=22;x<48;x++){
     const i=(y*64+x)*4;
     if(desired[i+3]<100||base[i+3]<100)continue;
     if(Math.abs(desired[i]-base[i])<3&&
        Math.abs(desired[i+1]-base[i+1])<3&&
        Math.abs(desired[i+2]-base[i+2])<3)continue;
     pixels.push([x,y,desired[i],desired[i+1],desired[i+2]]);
    }
    if(frames.size>110)frames.clear();
    frames.set(key,pixels);
   }catch{return false;}
  }
  try{
   const target=ctx.getImageData(0,0,64,112);
   const d=target.data,dx=Math.round(shift.x),dy=Math.round(shift.y);
   for(const [x,y,r,g,b] of pixels){
    const px=x+dx,py=y+dy;
    if(px<0||px>=64||py<0||py>=112)continue;
    const i=(py*64+px)*4;
    if(d[i+3]<100)continue;
    d[i]=r;d[i+1]=g;d[i+2]=b;
   }
   ctx.putImageData(target,0,0);
   return true;
  }catch{return false;}
 }
 function drawExpression(ctx,face,direction,frame,load){
  if(!ctx||!face||face.id==="neutral")return false;
  const view=DIRECTIONS.indexOf(direction);
  if(view<0||view>1)return false;
  const mode=face.overlay?"overlay":face.sheet?"sheet":null;
  if(!mode)return false;
  const path=mode==="overlay"?face.overlay:face.sheet;
  const entry=load?.(path),image=entry?.im||entry?.pic||entry;
  if(!image||entry?.ready===false)return false;
  const src=sourceRect(image,view,frame,mode);
  if(!src)return false;
  const native=/^(media\/human-(?:male|female)-base-expression-)(?:bleh|cheeky|grimace_blush)(\.png)$/.exec(path);
  if(mode==="sheet"&&native){
   const neutralPath=native[1]+"neutral"+native[2];
   const neutralEntry=load?.(neutralPath);
   const neutral=neutralEntry?.im||neutralEntry?.pic||neutralEntry;
   // Do not paint unsafe rectangles while the neutral image is loading.
   if(!neutral||neutralEntry?.ready===false)return false;
   const shift=blehHeadShift(ctx,image,src);
   return drawNativeHumanFace(ctx,image,neutral,src,shift);
  }
  // Full-body expression sheets are NOT overlays. Crop only original
  // face/hair rectangle, never replace arms, torso, bag or action pose.
  const crop=mode==="overlay"?{x:16,y:28,w:33,h:36}:{x:17,y:30,w:31,h:32};
  const shift=(face.id==="bleh"||face.id==="cheeky"||face.id==="grimace_blush")&&mode==="sheet"?
   blehHeadShift(ctx,image,src):{x:0,y:0};
  ctx.save();ctx.beginPath();
  ctx.rect(crop.x+shift.x,crop.y+shift.y,crop.w,crop.h);ctx.clip();
  ctx.drawImage(image,src.x+crop.x,src.y+crop.y,crop.w,crop.h,
   crop.x+shift.x,crop.y+shift.y,crop.w,crop.h);
  ctx.restore();
  return true;
 }
 function drawRotated(ctx,sprite,footX,footY,angle){
  const deg=rotation(angle);
  ctx.save();
  // Keep the lowest visible sprite pixel at the same baseline as the
  // upright source (12 pixels below the action's foot anchor).
  const lift=deg===180?88:(deg===90||deg===270?20:0);
  ctx.translate(footX,footY-lift);
  if(deg)ctx.rotate(deg*Math.PI/180);
  ctx.drawImage(sprite,-32,-100,64,112);
  ctx.restore();
 }
 return Object.freeze({DIRECTIONS,rotation,sourceRect,headAnchor,drawExpression,drawRotated});
});
