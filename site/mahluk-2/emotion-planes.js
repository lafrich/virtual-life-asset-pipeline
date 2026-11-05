/* Mahluk 2.0 / single-image Emotion Plane + independent Accessory Planes.
 * Source-native V6B features are flattened onto a single transparent plane.
 * PNG atlas imports are four directional rows (SE/SW/NE/NW), 64x112 per cell.
 * Facial pixel assets are not skeleton parts, weights or IK.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MH2EmotionPlanes=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const DIR=["se","sw","ne","nw"];
 const FACE_SOURCE=new Set(["face","brows"]);
 const GLASSES_SOURCE=new Set(["acc_head"]);
 const VALID=/^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
 const FORMAT="mahluk2-emotion-planes-v1";
 const KEY="mahluk-2-emotion-assets-v1";
 const NATIVE="native:";
 const faceSlot=s=>FACE_SOURCE.has(s?.source)&&s?.expression===true;
 const glassesSlot=s=>GLASSES_SOURCE.has(s?.source)||s?.bone==="glasses";
 const slotKind=s=>faceSlot(s)?"emotion":glassesSlot(s)?"glasses":null;
 function safeAssets(store){
  let raw;
  try{raw=JSON.parse(store?.getItem(KEY)||"[]")}catch{return []}
  return Array.isArray(raw)?raw.filter(a=>a?.format===FORMAT&&
   /^[a-z0-9_-]{1,72}$/.test(a.id)&&typeof a.name==="string"&&
   VALID.test(a.png)&&a.png.length<1500000&&
   Number.isInteger(a.frames)&&a.frames>=1&&a.frames<=48).slice(-12):[];
 }
 function saveAssets(store,rows){
  if(!store)return false;
  const list=(rows||[]).slice(-12);
  store.setItem(KEY,JSON.stringify(list));
  return true;
 }
 function classifyAtlas(width,height){
  if(height!==112*4||!Number.isInteger(width)||width<64||width%64!==0||width>64*48)
   throw new Error("Use transparent PNG atlas 64×N px wide and 448 px tall (SE/SW/NE/NW).");
  return {frames:width/64,directions:4,width,height};
 }
 function createCanvas(){const c=document.createElement("canvas");c.width=64;c.height=112;return c}
 function makeNativePlane(slots,imageMap,direction,emotion,manifest){
  const idx=DIR.indexOf(direction),ei=(manifest?.emotions||[]).indexOf(emotion);
  if(idx<0||ei<0)throw new Error("Unknown native facial asset "+emotion+"/"+direction);
  const canvas=createCanvas(),ctx=canvas.getContext("2d");
  ctx.imageSmoothingEnabled=false;
  // Exact source pigment from V6B face and brow layers only. It is *one*
  // plane even though the old data was distributed across tiny bones.
  for(const s of slots)if(faceSlot(s)){
   const img=imageMap.get(s.src);if(!img)continue;
   ctx.drawImage(img,ei*64,idx*112,64,112,0,0,64,112);
  }
  return canvas;
 }
 function sample(keys,frame,fallback){
  let active=fallback;
  for(const key of [...(keys||[])].filter(k=>k&&Number.isInteger(k.frame)&&
    typeof k.asset==="string"&&k.frame<=frame).sort((a,b)=>a.frame-b.frame))
   active=key.asset;
  return active;
 }
 function insert(keys,frame,asset){
  const n=Math.max(0,Math.min(47,Math.floor(Number(frame)||0)));
  return [...(keys||[]).filter(k=>k.frame!==n),{frame:n,asset}].sort((a,b)=>a.frame-b.frame);
 }
 function accessoryWorld(state,rig){
  const nodes=rig.world(state),head=nodes.head,anchor=rig.BMAP.head;
  const art=rig.BMAP.glasses,part=state.parts.glasses;
  if(!head||!art||!part)return nodes;
  const x=art.x-anchor.x+part.x,y=art.y-anchor.y+part.y;
  const theta=head.angle*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta);
  nodes.glasses={x:head.x+(x*c-y*s)*head.scale,
   y:head.y+(x*s+y*c)*head.scale,z:head.z+(part.z||0),
   angle:head.angle+part.angle,scale:head.scale*part.scale,
   visible:head.visible&&part.visible,parent:"head"};
  return nodes;
 }
 return Object.freeze({DIR,FORMAT,KEY,NATIVE,faceSlot,glassesSlot,slotKind,
  safeAssets,saveAssets,classifyAtlas,makeNativePlane,sample,insert,accessoryWorld});
});
