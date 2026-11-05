/* Mahluk Hidup / Modular Pixel Rig v2
 * New, independent cutout-puppet reference. Does not mutate V6B character data.
 * Source art: original 64x112 programmatic pixel drawing based on user-provided
 * style direction (heavy fringe, dark tee, relaxed trousers, white sneakers).
 */
(function(root,factory){
 "use strict";
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.VLModularRigV2=api;
})(typeof window!=="undefined"?window:null,function(root){
 "use strict";
 const ID="human_pixel_reference_v2", W=64,H=112,FRAMES=24, FPS=12,
  ART_REVISION="streetwear-reference-detailed-v2b";
 const DIR=Object.freeze(["se","sw","ne","nw"]);
 const def=(id,parent,x,y,label,kind="body")=>Object.freeze({id,parent,x,y,label,kind});
 const BONES=Object.freeze([
  def("root",null,32,68,"ROOT"),
  def("pelvis","root",32,69,"PELVIS"),
  def("torso","pelvis",32,52,"OVERSIZED T-SHIRT"),
  def("neck","torso",33,41,"NECK"),
  def("head","neck",33,28,"HEAD BASE"),
  def("emotion","head",33,30,"EMOTION / HEAD CHILD","emotion"),
  def("brow_l","emotion",28,28,"EYEBROW L","emotion"),
  def("brow_r","emotion",39,28,"EYEBROW R","emotion"),
  def("eye_l","emotion",28,32,"EYE L","emotion"),
  def("eye_r","emotion",39,32,"EYE R","emotion"),
  def("nose","emotion",34,36,"NOSE","emotion"),
  def("mouth","emotion",35,40,"MOUTH","emotion"),
  def("blush_l","emotion",25,37,"BLUSH L","emotion"),
  def("blush_r","emotion",43,37,"BLUSH R","emotion"),
  def("glasses","emotion",34,31,"GLASSES","accessory"),
  def("hair_back","head",33,27,"HAIR / BACK","hair"),
  def("hair_cap","head",33,13,"HAIR / CROWN","hair"),
  def("fringe_l","head",24,22,"FRINGE / LEFT","hair"),
  def("fringe_mid","head",33,22,"FRINGE / CENTER","hair"),
  def("fringe_r","head",42,22,"FRINGE / RIGHT","hair"),
  def("shoulder_l","torso",21,47,"UPPER ARM L"),
  def("elbow_l","shoulder_l",14,58,"ELBOW L"),
  def("wrist_l","elbow_l",19,43,"FOREARM / HAND L"),
  def("shoulder_r","torso",45,47,"UPPER ARM R"),
  def("elbow_r","shoulder_r",49,58,"ELBOW R"),
  def("wrist_r","elbow_r",48,72,"FOREARM / HAND R"),
  def("hip_l","pelvis",26,71,"THIGH L"),
  def("knee_l","hip_l",25,88,"KNEE L"),
  def("ankle_l","knee_l",24,102,"SHIN / SHOE L"),
  def("hip_r","pelvis",38,71,"THIGH R"),
  def("knee_r","hip_r",39,88,"KNEE R"),
  def("ankle_r","knee_r",40,102,"SHIN / SHOE R"),
  def("phone","wrist_l",17,32,"PHONE / PROP","prop")
 ]);
 const BMAP=Object.freeze(Object.fromEntries(BONES.map(b=>[b.id,b])));
 const HIERARCHY=Object.freeze(Object.fromEntries(BONES.map(b=>[b.id,b.parent])));
 const EMOTIONS=Object.freeze(["neutral","happy","mischievous","angry","surprised","blush","grin"]);
 const PALETTE=Object.freeze({
  outline:"#201a1a",outlineDark:"#151112",hair:"#352a27",
  hairShadow:"#211b1c",hairMid:"#44342e",hairLight:"#5b463d",hairGlint:"#70564a",
  skin:"#eda176",skinLight:"#ffc497",skinShade:"#c77f57",skinDeep:"#9f5a42",
  eye:"#241b1a",eyeWhite:"#f9e9da",lens:"#f7e5d5",glasses:"#241d1d",glassesLight:"#564743",
  shirt:"#211e1f",shirtMid:"#312b2c",shirtLight:"#443a38",shirtShadow:"#121114",
  pants:"#393131",pantsLight:"#554945",pantsShade:"#292324",pantsFold:"#463b39",
  emblem:"#f7b93f",emblemLight:"#ffec96",emblemBlue:"#4869ab",
  shoe:"#f4eee6",shoeLight:"#fffdf7",shoeShade:"#c1b1a6",shoeShadow:"#514745",
  phone:"#211d22",screen:"#35323a",blush:"#e48e82"
 });
 const PROPORTIONS=Object.freeze({head:[18,4,33,39],shirt:[18,42,30,28],
   pants:[16,69,34,35],shoes:[12,99,42,12],
   style:"chunky-fringe / narrow glasses / oversized tee / loose trousers / thick sneakers"});
 const clone=x=>JSON.parse(JSON.stringify(x));
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,Number(v)||0));
 function neutral(){
  return {format:"mahluk-modular-rig-v2",version:2,character_id:ID,
   frame:[W,H],pivot:[32,100],fps:FPS,frames:FRAMES,direction:"se",
   emotion:"neutral",name:"PIXEL REFERENCE / 01",phone:true,
   parts:Object.fromEntries(BONES.map(b=>[b.id,{x:0,y:0,angle:0,scale:1,visible:true}]))};
 }
 function referencePose(){
  const m=neutral();
  // Phone-and-fringe stance from the user's new pixel-character reference.
  m.parts.elbow_l.x=0;m.parts.elbow_l.y=0;
  m.parts.wrist_l.x=0;m.parts.wrist_l.y=0;
  m.parts.phone.x=0;m.parts.phone.y=0;
  m.parts.head.angle=-1;
  return m;
 }
 function normalize(source){
  const state=neutral();
  if(source&&typeof source==="object"){
   if(EMOTIONS.includes(source.emotion))state.emotion=source.emotion;
   if(typeof source.name==="string")state.name=source.name.slice(0,72);
   if(typeof source.phone==="boolean")state.phone=source.phone;
   if(DIR.includes(source.direction))state.direction=source.direction;
   state.fps=clamp(source.fps||FPS,4,30);
   state.frames=Math.round(clamp(source.frames||FRAMES,4,96));
   for(const id of Object.keys(state.parts)){
    const p=source.parts?.[id];if(!p)continue;
    state.parts[id]={x:clamp(p.x,-40,40),y:clamp(p.y,-48,48),
      angle:clamp(p.angle,-180,180),scale:clamp(p.scale??1,.4,2),
      visible:p.visible!==false};
   }
  }
  return state;
 }
 function world(state){
  const m=normalize(state),out={};
  for(const bone of BONES){
   const p=m.parts[bone.id],parent=bone.parent?out[bone.parent]:null;
   const baseParent=bone.parent?BMAP[bone.parent]:null;
   const lx=(baseParent?bone.x-baseParent.x:bone.x-32)+p.x;
   const ly=(baseParent?bone.y-baseParent.y:bone.y-61)+p.y;
   const rad=parent?parent.angle*Math.PI/180:0;
   const cs=Math.cos(rad),sn=Math.sin(rad),ps=parent?.scale||1;
   out[bone.id]={
    x:(parent?.x??32)+(lx*cs-ly*sn)*ps,
    y:(parent?.y??61)+(lx*sn+ly*cs)*ps,
    angle:(parent?.angle||0)+p.angle,
    scale:ps*p.scale,visible:(parent?.visible??true)&&p.visible,
    parent:bone.parent
   };
  }
  return out;
 }
 const R=(ctx,x,y,w,h,fill)=>{if(w>0&&h>0){ctx.fillStyle=fill;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}};
 function bound(ctx,id,coords,draw){
  const n=coords[id],b=BMAP[id];if(!n?.visible)return;
  ctx.save();ctx.translate(Math.round(n.x),Math.round(n.y));ctx.rotate(n.angle*Math.PI/180);
  ctx.scale(n.scale,n.scale);ctx.translate(-b.x,-b.y);draw();ctx.restore();
 }

 // Every painted edge is an integer-pixel cluster, never a softened vector
 // limb or a rectangular crop of another character's sprite.
 function pixels(ctx,color,rects){
  for(const r of rects)R(ctx,r[0],r[1],r[2],r[3],color);
 }
 function segment(ctx,start,end,width,fill,edge,shade,coords){
  const a=coords[start],b=coords[end];if(!a?.visible||!b?.visible)return;
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.max(1,Math.ceil(Math.hypot(dx,dy)));
  const w=Math.max(4,Math.round(width*(a.scale+b.scale)/2));
  for(let i=0;i<=len;i++){
   const x=Math.round(a.x+dx*i/len),y=Math.round(a.y+dy*i/len);
   R(ctx,x-Math.floor(w/2)-1,y-Math.floor(w/2)-1,w+2,w+2,edge);
  }
  for(let i=0;i<=len;i++){
   const x=Math.round(a.x+dx*i/len),y=Math.round(a.y+dy*i/len);
   R(ctx,x-Math.floor(w/2),y-Math.floor(w/2),w,w,fill);
  }
  for(let i=1;i<len-1;i+=2){
   const x=Math.round(a.x+dx*i/len),y=Math.round(a.y+dy*i/len);
   R(ctx,x-Math.floor(w/2)+1,y-Math.floor(w/2)+1,Math.max(2,Math.floor(w/3)),2,shade);
  }
 }
 function face(ctx,coords,state,back){
  if(back||!coords.emotion.visible)return;
  const p=PALETTE,e=state.emotion;
  bound(ctx,"brow_l",coords,()=>{
   pixels(ctx,p.eye,e==="angry"?[[24,27,6,2],[29,26,2,1]]:
    e==="surprised"?[[25,26,6,1]]:[[24,28,7,2],[25,27,4,1]]);
  });
  bound(ctx,"brow_r",coords,()=>{
   pixels(ctx,p.eye,e==="angry"?[[37,26,6,2],[36,26,2,1]]:
    e==="surprised"?[[37,26,6,1]]:[[36,28,7,2],[38,27,4,1]]);
  });
  bound(ctx,"eye_l",coords,()=>{
   if(e==="happy"||e==="grin"){
    pixels(ctx,p.eye,[[25,31,7,2],[26,30,2,1]]);
   }else{
    pixels(ctx,p.eyeWhite,[[25,30,7,4]]);
    pixels(ctx,p.eye,[[29,e==="surprised"?30:31,2,3]]);
    R(ctx,30,31,1,1,p.outlineDark);
   }
  });
  bound(ctx,"eye_r",coords,()=>{
   if(e==="happy"||e==="grin")pixels(ctx,p.eye,[[37,31,6,2]]);
   else{
    pixels(ctx,p.eyeWhite,[[36,30,7,4]]);
    pixels(ctx,p.eye,[[39,31,2,e==="surprised"?3:2]]);
    R(ctx,40,31,1,1,p.outlineDark);
   }
  });
  bound(ctx,"nose",coords,()=>{
   R(ctx,34,34,2,3,p.skinShade);R(ctx,35,36,2,1,p.skinDeep);
   R(ctx,37,35,1,1,p.skinLight);
  });
  bound(ctx,"mouth",coords,()=>{
   if(e==="happy"||e==="grin"){
    pixels(ctx,p.outline,[[32,39,8,2],[33,41,6,1]]);
    pixels(ctx,p.eyeWhite,[[34,40,4,1]]);
   }else if(e==="surprised"){
    R(ctx,34,38,5,5,p.outlineDark);R(ctx,35,40,3,2,"#b86467");
   }else if(e==="angry"){
    R(ctx,32,40,8,2,p.outline);R(ctx,31,39,2,1,p.outline);
   }else if(e==="mischievous"){
    R(ctx,33,40,7,1,p.outline);R(ctx,39,39,2,1,p.outline);
   }else{
    R(ctx,32,40,7,1,p.skinDeep);R(ctx,34,41,4,1,p.outline);
   }
  });
  bound(ctx,"blush_l",coords,()=>{
   if(["blush","happy","mischievous"].includes(e)){
    pixels(ctx,p.blush,[[23,36,4,1],[24,38,3,1]]);
    R(ctx,23,37,2,1,p.skinLight);
   }
  });
  bound(ctx,"blush_r",coords,()=>{
   if(["blush","happy","mischievous"].includes(e)){
    pixels(ctx,p.blush,[[42,36,3,1],[41,38,3,1]]);
   }
  });
  // Transparent lens wash goes on after eyes; dark frame and bridge remain
  // distinct from the head sprite so glasses can be hidden or repositioned.
  bound(ctx,"glasses",coords,()=>{
   R(ctx,22,28,12,8,p.glasses);
   R(ctx,35,28,11,8,p.glasses);
   R(ctx,24,29,9,5,"#fff5e529");
   R(ctx,36,29,9,5,"#fff5e529");
   R(ctx,25,29,3,1,p.shoeLight);
   R(ctx,37,29,3,1,p.shoeLight);
   R(ctx,25,30,8,3,"#f4e0cd21");
   R(ctx,37,30,7,3,"#f4e0cd21");
   R(ctx,33,30,3,2,p.glasses);
   R(ctx,20,29,3,2,p.glasses);
   R(ctx,45,29,2,2,p.glassesLight);
   R(ctx,23,35,11,1,p.glassesLight);R(ctx,35,35,11,1,p.glassesLight);
  });
 }
 function hairBack(ctx,coords,back){
  const p=PALETTE;
  bound(ctx,"hair_back",coords,()=>{
   pixels(ctx,p.outline,[[18,12,30,24],[17,18,32,15],[20,33,27,10],[23,41,21,2],
     [19,9,27,8],[22,7,21,4]]);
   pixels(ctx,p.hairShadow,[[20,10,27,26],[19,20,28,16],[23,33,22,8]]);
   pixels(ctx,p.hair,[[21,10,25,18],[22,23,23,14],[24,35,19,6]]);
   pixels(ctx,p.hairMid,[[24,12,9,12],[35,11,9,13],[22,26,5,9],[35,25,7,10]]);
   pixels(ctx,p.hairLight,[[24,14,5,8],[37,13,5,6],[25,29,4,8]]);
   if(back){
    pixels(ctx,p.hair,[[19,17,31,20],[22,29,25,12],[26,38,18,5]]);
    pixels(ctx,p.hairShadow,[[20,26,4,12],[43,24,5,12],[27,37,17,4]]);
    pixels(ctx,p.hairLight,[[24,16,5,12],[31,11,5,19],[38,19,5,11]]);
    pixels(ctx,p.hairGlint,[[23,18,2,7],[34,13,2,12],[39,23,2,6]]);
   }
  });
 }
 function hairCap(ctx,coords,back){
  const p=PALETTE;
  bound(ctx,"hair_cap",coords,()=>{
   pixels(ctx,p.outline,[[18,12,30,12],[20,7,27,18],[23,4,20,16],
     [25,3,13,5],[15,18,36,7],[17,14,33,6],[21,6,23,7],
     [14,21,8,6],[43,20,8,7]]);
   pixels(ctx,p.hairShadow,[[18,13,30,12],[20,8,27,13],[24,5,18,14],
     [16,20,34,5],[21,6,22,6]]);
   pixels(ctx,p.hair,[[21,10,25,13],[24,7,19,14],[18,16,29,8],[19,21,27,5]]);
   pixels(ctx,p.hairMid,[[22,11,10,8],[31,7,9,9],[40,13,6,9],[19,20,7,4]]);
   pixels(ctx,p.hairLight,[[24,9,8,3],[35,8,6,3],[20,15,5,4],[42,17,3,3],
     [27,13,4,3]]);
   pixels(ctx,p.hairGlint,[[27,9,3,2],[36,8,3,2],[23,15,2,2],
    [31,6,2,1],[39,11,2,1],[21,18,1,2],[44,16,2,1]]);
   pixels(ctx,p.hairShadow,[[29,14,2,5],[36,13,2,3],[23,21,2,3]]);
   R(ctx,32,10,1,3,p.hairMid);
   pixels(ctx,p.hairShadow,[[20,19,6,5],[33,17,7,5],[41,22,6,3]]);
   if(back){
    pixels(ctx,p.hairMid,[[20,16,6,9],[33,14,9,9]]);
    pixels(ctx,p.hairLight,[[24,17,5,5],[35,13,6,7]]);
   }
  });
 }
 function fringe(ctx,coords,back){
  if(back)return;
  const p=PALETTE;
  bound(ctx,"fringe_l",coords,()=>{
   pixels(ctx,p.outline,[[17,21,10,10],[19,26,7,6],[16,22,5,6]]);
   pixels(ctx,p.hairShadow,[[18,21,9,9],[20,27,5,4]]);
   pixels(ctx,p.hair,[[19,19,8,8],[17,23,7,5]]);
   pixels(ctx,p.hairMid,[[20,20,5,3],[19,24,3,3]]);
   R(ctx,20,21,2,2,p.hairLight);
  });
  bound(ctx,"fringe_mid",coords,()=>{
   pixels(ctx,p.outline,[[25,19,12,10],[28,24,7,5],[30,27,5,4]]);
   pixels(ctx,p.hairShadow,[[26,20,10,8],[30,24,5,5]]);
   pixels(ctx,p.hair,[[27,19,9,7],[29,24,5,3]]);
   pixels(ctx,p.hairMid,[[28,20,5,3],[33,22,2,3]]);
   R(ctx,29,19,4,2,p.hairLight);
  });
  bound(ctx,"fringe_r",coords,()=>{
   pixels(ctx,p.outline,[[35,19,12,9],[38,24,8,7],[44,20,5,8]]);
   pixels(ctx,p.hairShadow,[[36,19,11,9],[39,25,6,4]]);
   pixels(ctx,p.hair,[[36,19,10,6],[40,24,5,4]]);
   pixels(ctx,p.hairMid,[[38,20,6,3],[43,23,3,3]]);
   R(ctx,39,20,4,2,p.hairLight);
  });
 }
 function shoe(ctx,id,left,coords){
  const p=PALETTE;
  bound(ctx,id,coords,()=>{
   const x=left?13:32;
   pixels(ctx,p.outline,[[x+4,100,15,8],[x+1,104,20,5],[x,106,22,3],
     [x+5,99,11,3],[x+1,108,20,2]]);
   pixels(ctx,p.shoeShade,[[x+4,101,15,5],[x+2,104,18,3]]);
   pixels(ctx,p.shoe,[[x+5,101,13,5],[x+2,105,18,3],[x+3,103,10,3]]);
   pixels(ctx,p.shoeLight,[[x+6,102,7,2],[x+2,105,9,2],[x+4,107,16,1]]);
   pixels(ctx,p.shoeShadow,[[x+7,99,6,3],[x+12,102,6,3],[x+15,105,5,1]]);
   pixels(ctx,p.shoeLight,[[x+7,100,5,2],[x+10,103,3,1],[x+11,105,3,1],
    [x+4,105,4,1],[x+3,107,5,1]]);
   pixels(ctx,p.shoeShadow,[[x+10,101,2,1],[x+10,103,2,1],[x+10,105,2,1]]);
   pixels(ctx,p.shoeShade,[[x+14,102,4,2],[x+15,105,3,1]]);
   pixels(ctx,p.outline,[[x+1,108,20,1]]);
   R(ctx,x+5,107,6,1,p.shoe);
  });
 }
 function art(ctx,coords,state,view){
  const back=view==="ne"||view==="nw",p=PALETTE;
  if(!back)hairBack(ctx,coords,false);
  // Pants are loose segmented garments, not straight bone-shaped sticks.
  bound(ctx,"pelvis",coords,()=>{
   pixels(ctx,p.outline,[[19,66,28,12],[20,73,28,5],[22,64,24,5]]);
   pixels(ctx,p.pants,[[20,67,26,10],[23,76,23,3]]);
   pixels(ctx,p.pantsLight,[[22,68,8,3],[38,70,6,4]]);
   pixels(ctx,p.pantsShade,[[31,72,5,7],[23,75,4,2]]);
  });
  segment(ctx,"hip_r","knee_r",17,p.pants,p.outline,p.pantsLight,coords);
  segment(ctx,"knee_r","ankle_r",18,p.pants,p.outline,p.pantsShade,coords);
  segment(ctx,"hip_l","knee_l",18,p.pants,p.outline,p.pantsLight,coords);
  segment(ctx,"knee_l","ankle_l",18,p.pants,p.outline,p.pantsShade,coords);
  bound(ctx,"hip_l",coords,()=>{
   pixels(ctx,p.pantsLight,[[19,73,4,12],[21,80,3,7]]);
   pixels(ctx,p.pantsShade,[[29,78,2,10],[22,86,3,2]]);
  });
  bound(ctx,"hip_r",coords,()=>{
   pixels(ctx,p.pantsShade,[[34,74,4,15],[44,78,3,8]]);
   pixels(ctx,p.pantsLight,[[40,76,4,8],[38,88,3,2]]);
   // Subtle pixel emblem, attached to the independent right-thigh cutout.
   pixels(ctx,p.outline,[[40,80,7,9]]);
   pixels(ctx,p.emblem,[[43,79,2,3],[41,82,5,4],[42,86,4,2]]);
   pixels(ctx,p.emblemLight,[[44,80,1,3],[42,83,2,2]]);
   pixels(ctx,p.emblemBlue,[[42,85,2,2],[45,85,1,2]]);
   R(ctx,43,88,3,1,p.shoe);
  });
  bound(ctx,"knee_l",coords,()=>{
   pixels(ctx,p.pantsShade,[[17,90,4,9],[20,96,3,5],[29,91,3,6]]);
   pixels(ctx,p.pantsFold,[[22,93,5,3],[19,100,7,2]]);
  });
  bound(ctx,"knee_r",coords,()=>{
   pixels(ctx,p.pantsShade,[[35,93,4,7],[43,93,4,9]]);
   pixels(ctx,p.pantsFold,[[38,95,4,3],[35,100,9,2]]);
  });
  shoe(ctx,"ankle_r",false,coords);
  shoe(ctx,"ankle_l",true,coords);
  // Far arm behind tee; wrist is independent of elbow and sleeve.
  segment(ctx,"shoulder_r","elbow_r",12,p.shirt,p.outline,p.shirtLight,coords);
  segment(ctx,"elbow_r","wrist_r",9,p.skin,p.outline,p.skinLight,coords);
  bound(ctx,"torso",coords,()=>{
   pixels(ctx,p.outline,[[20,42,26,27],[18,46,30,20],[20,66,27,5],
     [24,40,19,7],[22,68,25,3]]);
   pixels(ctx,p.shirt,[[21,43,25,25],[19,47,28,20],[22,67,24,3]]);
   pixels(ctx,p.shirtMid,[[24,44,19,5],[21,50,5,13],[35,54,10,12],[24,65,14,3]]);
   pixels(ctx,p.shirtLight,[[23,45,9,3],[25,48,6,2],[20,54,3,9],[35,62,4,4]]);
   pixels(ctx,p.shirtShadow,[[34,47,11,9],[39,53,7,12],[21,66,25,3],
     [35,68,11,2]]);
   // Collar with sewn-in neckline follows torso, not the hair or head.
   pixels(ctx,p.outline,[[27,41,13,5],[29,44,9,2]]);
   pixels(ctx,p.shirtLight,[[28,42,11,2]]);
   pixels(ctx,p.skinShade,[[30,42,7,2]]);
   R(ctx,33,44,5,1,p.shirtShadow);
   if(back){
    pixels(ctx,p.shirtMid,[[23,50,15,3],[35,59,8,4]]);
    R(ctx,20,66,26,2,p.shirtShadow);
   }else{
    pixels(ctx,p.shirtShadow,[[29,53,5,12],[25,61,5,5]]);
    R(ctx,24,52,6,1,p.shirtLight);
   }
  });
  segment(ctx,"shoulder_l","elbow_l",12,p.shirt,p.outline,p.shirtLight,coords);
  segment(ctx,"elbow_l","wrist_l",8,p.skin,p.outline,p.skinLight,coords);
  bound(ctx,"neck",coords,()=>{
   pixels(ctx,p.outline,[[29,38,9,8],[31,36,7,4]]);
   pixels(ctx,p.skinShade,[[30,39,7,5]]);
   pixels(ctx,p.skin,[[31,39,6,4]]);
   R(ctx,33,40,3,2,p.skinLight);
  });
  // Head base is bald and separate from both back hair and all face details.
  bound(ctx,"head",coords,()=>{
   pixels(ctx,p.outline,[[23,17,22,23],[20,21,28,17],[25,38,19,5],
    [26,15,17,6],[43,26,6,10],[18,26,6,10]]);
   pixels(ctx,p.skinShade,[[22,21,25,17],[25,37,19,4],
    [44,27,4,8],[19,27,4,7]]);
   pixels(ctx,p.skin,[[24,18,22,21],[26,38,15,3],[43,29,4,5]]);
   pixels(ctx,p.skinLight,[[28,21,17,13],[30,35,12,4]]);
   pixels(ctx,p.skinShade,[[23,31,5,6],[35,38,8,3]]);
   pixels(ctx,p.skinLight,[[44,29,2,3],[19,29,3,3]]);
   if(!back){
    R(ctx,42,39,5,2,p.outline);
    R(ctx,40,40,3,1,p.skinShade);
   }else{
    pixels(ctx,p.skinShade,[[24,25,22,12]]);
   }
  });
  if(back){
   hairBack(ctx,coords,true);
   hairCap(ctx,coords,true);
  }else{
   face(ctx,coords,state,false);
   hairCap(ctx,coords,false);
   fringe(ctx,coords,false);
  }
  // Phone and hands render in front of the face, and are bound to their own
  // wrist / phone nodes instead of being baked into the shared head sprite.
  bound(ctx,"wrist_r",coords,()=>{
   pixels(ctx,p.outline,[[45,69,8,9],[47,76,5,2]]);
   pixels(ctx,p.skin,[[46,69,6,8]]);
   pixels(ctx,p.skinLight,[[47,70,3,5]]);
   R(ctx,46,73,2,3,p.skinShade);
  });
  if(state.phone){
   bound(ctx,"phone",coords,()=>{
    pixels(ctx,p.outline,[[13,23,10,19],[14,22,8,2],[14,40,8,2]]);
    pixels(ctx,p.phone,[[14,24,8,16]]);
    if(back){
     // Rear view exposes the phone camera, not the front display.
     R(ctx,15,25,5,5,p.glassesLight);
     R(ctx,16,26,2,2,p.outlineDark);
     R(ctx,19,26,1,1,p.outlineDark);
     R(ctx,18,29,1,1,p.glassesLight);
     R(ctx,20,33,1,6,p.screen);
    }else{
     pixels(ctx,p.screen,[[15,27,6,12]]);
     pixels(ctx,p.shoeShadow,[[15,25,4,1],[20,28,1,9]]);
     R(ctx,16,24,2,2,p.glassesLight);
     R(ctx,17,38,3,1,"#655b65");
    }
   });
  }
  bound(ctx,"wrist_l",coords,()=>{
   pixels(ctx,p.outline,[[16,38,9,10],[17,46,7,3]]);
   pixels(ctx,p.skin,[[17,39,7,9]]);
   pixels(ctx,p.skinLight,[[18,39,4,4],[21,44,2,3]]);
   R(ctx,17,46,3,2,p.skinShade);
   if(!back&&state.phone){
    pixels(ctx,p.skin,[[22,38,4,3],[23,42,4,3],[22,45,3,2]]);
    R(ctx,25,42,2,1,p.skinLight);
   }
  });
 }
 function draw(ctx,source,direction="se",options={}){
  const state=normalize(source),view=DIR.includes(direction)?direction:state.direction;
  const coords=world(state);
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(options.clear!==false)ctx.clearRect(0,0,W,H);
  if(view==="sw"||view==="nw"){ctx.translate(W,0);ctx.scale(-1,1);}
  art(ctx,coords,state,view);ctx.restore();
  return coords;
 }
 function spriteSheet(state,frames=4){
  if(!root?.document)throw Error("Canvas not available");
  const n=Math.round(clamp(frames,1,96));
  const cv=root.document.createElement("canvas");cv.width=W*n;cv.height=H*4;
  const cx=cv.getContext("2d");cx.imageSmoothingEnabled=false;
  const tile=root.document.createElement("canvas");tile.width=W;tile.height=H;
  for(let direction=0;direction<4;direction++){
   for(let frame=0;frame<n;frame++){
    const tc=tile.getContext("2d");tc.clearRect(0,0,W,H);
    const model=state||referencePose();draw(tc,model,DIR[direction]);
    cx.drawImage(tile,frame*W,direction*H);
   }
  }
  return cv;
 }
 function sampleTrack(tracks,frame,frames,base){
  const out=normalize(base),count=Math.round(clamp(frames,4,96));
  for(const bone of BONES){
   const keys=(tracks?.[bone.id]||[]).slice().sort((a,b)=>a.frame-b.frame);
   if(!keys.length)continue;
   const at=((frame%count)+count)%count;
   const exact=keys.find(k=>k.frame===at);
   if(exact){out.parts[bone.id]={...out.parts[bone.id],...exact.value};continue;}
   let left=keys[keys.length-1],right=keys[0];
   for(let i=0;i<keys.length-1;i++)if(at>keys[i].frame&&at<keys[i+1].frame){left=keys[i];right=keys[i+1];break;}
   const span=(right.frame-left.frame+count)%count||count;
   const dist=(at-left.frame+count)%count,u=Math.min(1,dist/span),t=u*u*(3-2*u);
   const v={...out.parts[bone.id]};
   for(const k of ["x","y","angle","scale"])v[k]=Number(left.value[k]??v[k])+(Number(right.value[k]??v[k])-Number(left.value[k]??v[k]))*t;
   v.visible=(t<.5?left.value.visible:right.value.visible)!==false;
   out.parts[bone.id]=v;
  }
  const expressions=(tracks?.emotion||[]).filter(k=>EMOTIONS.includes(k.emotion))
   .sort((a,b)=>a.frame-b.frame);
  if(expressions.length){
   let current=expressions[expressions.length-1];
   for(const k of expressions)if(k.frame<=frame)current=k;
   out.emotion=current.emotion;
  }
  return out;
 }
 function key(tracks,id,frame,value,emotion){
  if(!BMAP[id])throw Error("Unknown rig bone "+id);
  const row=tracks[id]||(tracks[id]=[]);
  const record={frame:Math.floor(clamp(frame,0,95)),value:{...value}};
  if(id==="emotion"&&EMOTIONS.includes(emotion))record.emotion=emotion;
  const old=row.findIndex(k=>k.frame===record.frame);
  if(old>=0)row[old]=record;else row.push(record);
  row.sort((a,b)=>a.frame-b.frame);
  return record;
 }
 const makeTracks=()=>Object.fromEntries(BONES.map(b=>[b.id,[]]));
 function exportModel(state,tracks){
  const s=normalize(state);
  return {format:"mahluk-modular-rig-v2",version:2,character_id:ID,
   direction_order:[...DIR],frame_size:[W,H],pivot:[32,100],nodes:BONES.map(b=>({
    id:b.id,parent:b.parent,pivot:[b.x,b.y],kind:b.kind
   })),palette:{...PALETTE},model:s,tracks:clone(tracks||makeTracks()),emotion_parent:"head",
   facial_children:["brow_l","brow_r","eye_l","eye_r","nose","mouth",
    "blush_l","blush_r","glasses"],
   hair_children:["hair_back","hair_cap","fringe_l","fringe_mid","fringe_r"],
   art_revision:ART_REVISION,
   style_profile:PROPORTIONS.style,
   proportions:{head:PROPORTIONS.head,shirt:PROPORTIONS.shirt,
    pants:PROPORTIONS.pants,shoes:PROPORTIONS.shoes}};
 }
 return Object.freeze({ID,W,H,DIR,ART_REVISION,BONES,BMAP,HIERARCHY,EMOTIONS,PALETTE,
  PROPORTIONS,neutral,referencePose,normalize,world,draw,spriteSheet,sampleTrack,key,makeTracks,exportModel});
});
