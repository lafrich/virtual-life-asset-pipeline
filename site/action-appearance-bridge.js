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
  // Full-body expression sheets are NOT overlays. Crop only original
  // face/hair rectangle, never replace arms, torso, bag or action pose.
  const crop=mode==="overlay"?{x:16,y:28,w:33,h:36}:{x:17,y:30,w:31,h:32};
  ctx.save();ctx.beginPath();ctx.rect(crop.x,crop.y,crop.w,crop.h);ctx.clip();
  ctx.drawImage(image,src.x+crop.x,src.y+crop.y,crop.w,crop.h,
   crop.x,crop.y,crop.w,crop.h);
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
 return Object.freeze({DIRECTIONS,rotation,sourceRect,drawExpression,drawRotated});
});
