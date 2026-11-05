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
 const ID="human_pixel_reference_v2", W=64,H=112,FRAMES=24, FPS=12;
 const DIR=Object.freeze(["se","sw","ne","nw"]);
 const def=(id,parent,x,y,label,kind="body")=>Object.freeze({id,parent,x,y,label,kind});
 const BONES=Object.freeze([
  def("root",null,32,61,"ROOT"),
  def("pelvis","root",32,61,"PELVIS"),def("torso","pelvis",32,39,"TORSO"),
  def("neck","torso",32,31,"NECK"),def("head","neck",32,25,"HEAD"),
  def("emotion","head",32,25,"EMOTION / HEAD CHILD","emotion"),
  def("brow_l","emotion",27,25,"BROW L","emotion"),
  def("brow_r","emotion",37,25,"BROW R","emotion"),
  def("eye_l","emotion",28,29,"EYE L","emotion"),
  def("eye_r","emotion",38,29,"EYE R","emotion"),
  def("mouth","emotion",34,36,"MOUTH","emotion"),
  def("shoulder_l","torso",21,42,"SHOULDER L"),
  def("elbow_l","shoulder_l",17,53,"ELBOW L"),
  def("wrist_l","elbow_l",18,66,"WRIST / HAND L"),
  def("shoulder_r","torso",43,42,"SHOULDER R"),
  def("elbow_r","shoulder_r",49,55,"ELBOW R"),
  def("wrist_r","elbow_r",49,66,"WRIST / HAND R"),
  def("hip_l","pelvis",26,65,"THIGH L"),
  def("knee_l","hip_l",26,84,"KNEE L"),
  def("ankle_l","knee_l",24,99,"ANKLE / SHOE L"),
  def("hip_r","pelvis",38,65,"THIGH R"),
  def("knee_r","hip_r",39,84,"KNEE R"),
  def("ankle_r","knee_r",40,99,"ANKLE / SHOE R"),
  def("phone","wrist_l",21,65,"PHONE / PROP","prop")
 ]);
 const BMAP=Object.freeze(Object.fromEntries(BONES.map(b=>[b.id,b])));
 const HIERARCHY=Object.freeze(Object.fromEntries(BONES.map(b=>[b.id,b.parent])));
 const EMOTIONS=Object.freeze(["neutral","happy","mischievous","angry","surprised","blush","grin"]);
 const PALETTE=Object.freeze({
  outline:"#211c1c",hair:"#312725",hairShadow:"#241d1e",hairLight:"#4c3b34",
  skin:"#ed9b6f",skinLight:"#ffc394",skinShade:"#c6744e",
  shirt:"#1e1b1b",shirtLight:"#302c2d",shirtShadow:"#131214",
  pants:"#38312f",pantsLight:"#514642",pantsShade:"#292325",
  shoe:"#eee9e4",shoeShade:"#b7aaa0",shoeShadow:"#2e292b",
  phone:"#211e25",screen:"#3b3439",blush:"#e88f84"
 });
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
  m.parts.elbow_l.x=-1;m.parts.elbow_l.y=-8;
  m.parts.wrist_l.x=10;m.parts.wrist_l.y=-29;
  m.parts.phone.x=0;m.parts.phone.y=0;
  m.parts.head.angle=-2;
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
 function segment(ctx,start,end,width,fill,edge,shade,coords){
  const a=coords[start],b=coords[end];if(!a?.visible||!b?.visible)return;
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.max(2,Math.hypot(dx,dy));
  const ang=Math.atan2(dy,dx);ctx.save();ctx.translate(Math.round(a.x),Math.round(a.y));
  ctx.rotate(ang);const w=Math.max(3,width*(a.scale+b.scale)/2);
  R(ctx,-2,-w/2-1,len+4,w+2,edge);R(ctx,0,-w/2,len,w,fill);
  R(ctx,1,-w/2+1,Math.max(1,len-2),Math.max(1,w*.22),shade);
  ctx.restore();
 }
 function drawFace(ctx,coords,state,back){
  if(back||!coords.emotion.visible)return;
  const e=state.emotion;
  const dark=PALETTE.outline;
  bound(ctx,"brow_l",coords,()=>{
    R(ctx,25,e==="angry"?26:24,5,2,dark);
    if(e==="angry")R(ctx,29,25,1,2,dark);
  });
  bound(ctx,"brow_r",coords,()=>R(ctx,36,e==="surprised"?22:24,5,2,dark));
  bound(ctx,"eye_l",coords,()=>{
    if(e==="happy"||e==="grin") {R(ctx,26,29,5,1,dark);R(ctx,26,28,1,1,dark);}
    else{R(ctx,26,28,5,4,"#fff3df");R(ctx,29,28,2,e==="surprised"?3:4,dark);}
  });
  bound(ctx,"eye_r",coords,()=>{
    if(e==="happy"||e==="grin")R(ctx,36,29,4,1,dark);
    else{R(ctx,36,28,5,4,"#fff3df");R(ctx,38,28,2,4,dark);}
  });
  bound(ctx,"mouth",coords,()=>{
   if(e==="happy"||e==="grin"){
     R(ctx,30,36,9,3,dark);R(ctx,32,38,6,1,"#f7f2e9");
   }else if(e==="surprised"){
     R(ctx,33,34,4,6,dark);R(ctx,34,36,2,2,"#a14e4d");
   }else if(e==="angry"){
     R(ctx,32,37,7,2,dark);R(ctx,31,36,2,2,dark);
   }else if(e==="mischievous"){
     R(ctx,32,36,7,2,dark);R(ctx,37,35,2,1,dark);
   }else R(ctx,32,36,6,2,dark);
  });
  if(e==="blush"){
   bound(ctx,"emotion",coords,()=>{
    R(ctx,23,33,6,2,PALETTE.blush);R(ctx,40,33,4,2,PALETTE.blush);
   });
  }
 }
 function art(ctx,coords,state,view){
  const back=view==="ne"||view==="nw",p=PALETTE;
  // Separate cutouts: the illustration never originates from overlapping
  // rectangular crops. Every piece is independently authored and drawn.
  bound(ctx,"pelvis",coords,()=>{
   R(ctx,21,59,24,13,p.outline);R(ctx,22,61,22,9,p.pants);
   R(ctx,32,65,3,7,p.pantsShade);
  });
  // Far leg, then near leg. Loose trousers bend without dividing source pixels.
  segment(ctx,"hip_r","knee_r",15,p.pants,p.outline,p.pantsLight,coords);
  segment(ctx,"knee_r","ankle_r",14,p.pants,p.outline,p.pantsShade,coords);
  segment(ctx,"hip_l","knee_l",14,p.pants,p.outline,p.pantsLight,coords);
  segment(ctx,"knee_l","ankle_l",14,p.pants,p.outline,p.pantsShade,coords);
  const shoe=(id,left)=>bound(ctx,id,coords,()=>{
   const x=left?16:32;
   R(ctx,x,96,18,10,p.outline);R(ctx,x+1,96,16,8,p.shoe);
   R(ctx,x+2,98,7,2,"#fffdf8");R(ctx,x+10,96,3,4,p.shoeShade);
   R(ctx,x,104,18,2,p.shoeShadow);R(ctx,x+1,102,16,2,"#fffdf8");
  });
  shoe("ankle_r",false);shoe("ankle_l",true);
  // Far upper arm behind torso, then near lower arm and phone.
  segment(ctx,"shoulder_r","elbow_r",11,p.shirt,p.outline,p.shirtLight,coords);
  segment(ctx,"elbow_r","wrist_r",9,p.skin,p.outline,p.skinLight,coords);
  bound(ctx,"wrist_r",coords,()=>{
   R(ctx,44,61,10,8,p.outline);R(ctx,45,62,8,7,p.skin);
   R(ctx,46,62,5,2,p.skinLight);
  });
  bound(ctx,"torso",coords,()=>{
   R(ctx,20,37,26,28,p.outline);
   R(ctx,21,38,24,26,p.shirt);R(ctx,24,39,18,3,p.shirtLight);
   R(ctx,22,44,2,16,p.shirtLight);R(ctx,37,48,7,14,p.shirtShadow);
   R(ctx,20,61,25,5,p.shirtShadow);
  });
  bound(ctx,"neck",coords,()=>{
   R(ctx,27,30,11,10,p.outline);R(ctx,28,31,9,8,p.skinShade);
   R(ctx,29,32,7,6,p.skin);
  });
  segment(ctx,"shoulder_l","elbow_l",11,p.shirt,p.outline,p.shirtLight,coords);
  segment(ctx,"elbow_l","wrist_l",9,p.skin,p.outline,p.skinLight,coords);
  bound(ctx,"wrist_l",coords,()=>{
   R(ctx,14,62,9,8,p.outline);R(ctx,15,62,7,7,p.skin);
   R(ctx,16,63,5,2,p.skinLight);
  });
  if(state.phone&&!back)bound(ctx,"phone",coords,()=>{
    R(ctx,17,54,11,20,p.outline);R(ctx,18,55,9,17,p.phone);
    R(ctx,19,57,7,12,p.screen);R(ctx,20,58,5,2,"#555057");
    R(ctx,21,71,3,1,"#aea3a7");
  });
  // Full head skin and hair are their own independent node.
  bound(ctx,"head",coords,()=>{
   R(ctx,20,15,25,27,p.outline);
   R(ctx,22,17,22,23,p.skin);
   R(ctx,22,17,4,17,p.skinShade);
   R(ctx,28,31,14,7,p.skinLight);
   if(!back){
     R(ctx,42,29,5,9,p.outline);R(ctx,43,30,3,7,p.skinShade);
     R(ctx,41,32,2,4,p.skinLight);
     R(ctx,38,39,6,2,p.outline);
   }
   // Big layered fringe with irregular pixel silhouettes.
   R(ctx,17,13,30,13,p.hairShadow);
   R(ctx,20,9,27,11,p.hair);
   R(ctx,24,6,20,7,p.hair);
   R(ctx,28,4,13,5,p.hair);
   R(ctx,15,17,8,10,p.hairShadow);
   R(ctx,18,13,9,14,p.hair);
   R(ctx,22,17,8,6,p.hairShadow);
   R(ctx,26,18,10,5,p.hair);
   R(ctx,36,16,11,9,p.hairShadow);
   R(ctx,22,10,12,3,p.hairLight);
   R(ctx,34,9,9,4,p.hairLight);
   R(ctx,19,18,5,5,p.hairLight);
   R(ctx,37,15,6,4,p.hairLight);
   if(back){
    R(ctx,20,25,27,14,p.hair);
    R(ctx,25,30,19,8,p.hairShadow);
    R(ctx,20,25,4,11,p.hairLight);
   }
  });
  drawFace(ctx,coords,state,back);
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
   facial_children:["brow_l","brow_r","eye_l","eye_r","mouth"]};
 }
 return Object.freeze({ID,W,H,DIR,BONES,BMAP,HIERARCHY,EMOTIONS,PALETTE,
  neutral,referencePose,normalize,world,draw,spriteSheet,sampleTrack,key,makeTracks,exportModel});
});
