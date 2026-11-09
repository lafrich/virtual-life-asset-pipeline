/* Lafrich Puppet v1 — independent, four-view 64×112 pixel puppet contract.
 * Old V6B is an optional visual seed ONLY. No Genesis 11-action or Python
 * worker is reachable through this engine. Model data is declarative.
 */
(function(root,factory){"use strict";const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.LafrichPuppetCore=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const W=64,H=112,N=W*H,DIRS=Object.freeze(["se","sw","ne","nw"]);
 const IDS=Object.freeze({male:"lafrich_male",female:"lafrich_female"});
 // Hierarchical anatomy: forearms rotate around elbows and calves around knees.
 // These are actual independent masks; they are not stretched single limbs.
 const PARTS=Object.freeze(["leg_far_upper","leg_far_lower","arm_far_upper","arm_far_lower",
  "torso","leg_near_upper","leg_near_lower","arm_near_upper","arm_near_lower","head"]);
 const PARENTS=Object.freeze({
  torso:null,head:"torso",
  arm_near_upper:"torso",arm_near_lower:"arm_near_upper",
  arm_far_upper:"torso",arm_far_lower:"arm_far_upper",
  leg_near_upper:"torso",leg_near_lower:"leg_near_upper",
  leg_far_upper:"torso",leg_far_lower:"leg_far_upper"
 });
 const DRAW_ORDER=Object.freeze(["leg_far_lower","leg_far_upper","arm_far_lower","arm_far_upper",
  "torso","leg_near_lower","leg_near_upper","arm_near_upper","arm_near_lower","head"]);
 const LAYERS=Object.freeze(["hair_back","body","pants","shoes","top_back","top","body_front","hair_front","accessory"]);
 const WEAR=Object.freeze(["pants","shoes","top_back","top","hair_back","hair_front","accessory"]);
 const FORMAT="lafrich-puppet-master-v1",MOTION="lafrich-puppet-motion-v1",CHARACTER="lafrich-puppet-character-v1";
 const MASTER_KEY="vl-lafrich-puppet-masters-v1",CHARACTER_KEY="vl-lafrich-puppet-characters-v1",
  MOTION_KEY="vl-lafrich-puppet-motions-v1";
 const maxPng=160000;
 const clone=a=>JSON.parse(JSON.stringify(a));
 function assert(ok,msg){if(!ok)throw Error("Lafrich Puppet: "+msg)}
 const isPoint=p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.x<W&&p.y>=0&&p.y<H;
 // Pivots are in original 64×112 V6B coordinates and can be edited in four views.
 const coords=Object.freeze({torso:[32,66],head:[32,48],
  arm_near_upper:[22,62],arm_near_lower:[21,73],
  arm_far_upper:[42,62],arm_far_lower:[43,73],
  leg_near_upper:[27,81],leg_near_lower:[26,93],
  leg_far_upper:[37,81],leg_far_lower:[38,93]});
 function maskDefault(){
  const bytes=new Uint8Array(N);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   let part;
   if(y<50)part="head";
   else if(y<81){
    if(x<24)part=y<73?"arm_near_upper":"arm_near_lower";
    else if(x>40)part=y<73?"arm_far_upper":"arm_far_lower";
    else part="torso";
   }else if(x<32)part=y<94?"leg_near_upper":"leg_near_lower";
   else part=y<94?"leg_far_upper":"leg_far_lower";
   bytes[y*W+x]=PARTS.indexOf(part);
  }
  return encode(bytes);
 }
 function encode(bytes){
  assert(bytes instanceof Uint8Array&&bytes.length===N,"Mask must be 64×112");
  assert([...bytes].every(n=>n===255||n<PARTS.length),"Unknown puppet slice");
  let chars="";for(const b of bytes)chars+=String.fromCharCode(b);
  if(typeof btoa==="function")return btoa(chars);
  return Buffer.from(bytes).toString("base64");
 }
 function decode(raw){
  assert(typeof raw==="string"&&raw.length<=9700&&/^[a-z0-9+/]*={0,2}$/i.test(raw),"Invalid mask encoding");
  const chars=typeof atob==="function"?atob(raw):Buffer.from(raw,"base64").toString("binary");
  assert(chars.length===N,"Mask must be 64×112");
  const bytes=Uint8Array.from(chars,c=>c.charCodeAt(0));
  assert([...bytes].every(b=>b===255||b<PARTS.length),"Unknown mask assignment");
  return bytes;
 }
 const nativePng=x=>typeof x==="string"&&x.length<maxPng&&/^data:image\/png;base64,[a-z0-9+/]+=*$/i.test(x);
 function master(gender){
  assert(!!IDS[gender],"Gender must be male or female");
  return {format:FORMAT,id:IDS[gender],gender,name:gender==="male"?"Lafrich Male":"Lafrich Female",
   version:1,updated:"",layers:Object.fromEntries(LAYERS.map(n=>[n,{}])),
   masks:Object.fromEntries(DIRS.map(d=>[d,maskDefault()])),
   pivots:Object.fromEntries(DIRS.map(d=>[d,Object.fromEntries(PARTS.map(p=>[p,{x:coords[p][0],y:coords[p][1]}]))]))};
 }
 function validateMaster(input){
  assert(input?.format===FORMAT&&IDS[input.gender]===input.id,"Only two stable Lafrich masters allowed");
  const out=master(input.gender);out.updated=String(input.updated||"");let total=0;
  for(const layer of LAYERS)for(const d of DIRS){
   const png=input.layers?.[layer]?.[d];
   if(png!==undefined){
    assert(nativePng(png),"Invalid "+layer+" / "+d+" PNG");
    out.layers[layer][d]=png;total+=png.length;
   }
  }
  for(const d of DIRS){
   out.masks[d]=encode(decode(input.masks?.[d]));
   for(const part of PARTS){
    const point=input.pivots?.[d]?.[part];
    assert(isPoint(point),"Invalid pivot "+d+" / "+part);
    out.pivots[d][part]={x:point.x,y:point.y};
   }
  }
  assert(total<6000000,"Master exceeds 6 MB; split assets across parts");
  return out;
 }
 // Piece-scoped edits share the original source layer and native slice mask.
 // IDs and master format remain unchanged.
 function piecePixels(pixels,mask,part){
  const index=PARTS.indexOf(part);
  assert(index>=0,"Unknown body piece");
  assert(pixels?.length===N*4&&mask?.length===N,"Invalid piece pixels or mask");
  const out=new Uint8ClampedArray(N*4);
  for(let i=0;i<N;i++)if(mask[i]===index){
   const offset=i*4;out.set(pixels.subarray(offset,offset+4),offset);
  }
  return out;
 }
 function applyPiecePixels(original,edited,mask,part){
  const index=PARTS.indexOf(part);
  assert(index>=0,"Unknown body piece");
  assert(original?.length===N*4&&edited?.length===N*4&&mask?.length===N,
   "Invalid body piece edit or mask");
  // Preserve every other piece's unedited source. Newly painted silhouette
  // pixels become part of the moving piece (reassign the native slice).
  const pixels=new Uint8ClampedArray(original),nextMask=new Uint8Array(mask);
  let changed=0,reassigned=0;
  for(let i=0;i<N;i++){
   const off=i*4,selected=mask[i]===index,painted=edited[off+3]>0;
   if(!selected&&!painted)continue;
   if(painted&&!selected){nextMask[i]=index;reassigned++;}
   if(pixels[off]!==edited[off]||pixels[off+1]!==edited[off+1]||
    pixels[off+2]!==edited[off+2]||pixels[off+3]!==edited[off+3]){
    pixels.set(edited.subarray(off,off+4),off);changed++;
   }
  }
  return {pixels,mask:nextMask,changed,reassigned};
 }
 function blankPose(){return Object.fromEntries(PARTS.map(p=>[p,{x:0,y:0,a:0}]))}
 function blankFrame(ms=160){return {ms,poses:Object.fromEntries(DIRS.map(d=>[d,blankPose()]))}}
 function motion(name="Untitled Motion"){
  return {format:MOTION,id:"",name,frames:[blankFrame()]};
 }
 function validateMotion(input){
  assert(input?.format===MOTION&&typeof input.name==="string"&&input.name.length<=100&&
   /^[a-z0-9_-]{0,80}$/i.test(input.id||""),"Invalid Python motion");
  assert(Array.isArray(input.frames)&&input.frames.length>=1&&input.frames.length<=96,"Motion needs 1–96 frames");
  const frames=input.frames.map((frame,i)=>{
   assert(Number.isInteger(frame.ms)&&frame.ms>=40&&frame.ms<=5000,"Invalid duration frame "+i);
   const poses={};
   for(const d of DIRS){
    poses[d]={};
    for(const p of PARTS){
     const v=frame.poses?.[d]?.[p];
     assert(v&&[v.x,v.y,v.a].every(Number.isFinite)&&
      Math.abs(v.x)<=64&&Math.abs(v.y)<=112&&Math.abs(v.a)<=360,"Invalid "+d+"/"+p+" transform");
     poses[d][p]={x:v.x,y:v.y,a:v.a};
    }
   }
   return {ms:frame.ms,poses};
  });
  return {format:MOTION,id:input.id||"",name:input.name,frames};
 }
 function character(gender,name="Custom Character"){
  assert(!!IDS[gender],"Unknown Lafrich body");
  return {format:CHARACTER,id:"",name,gender,wear:Object.fromEntries(WEAR.map(k=>[k,{}])),faceId:""};
 }
 function validateCharacter(c){
  assert(c?.format===CHARACTER&&!!IDS[c.gender]&&/^[a-z0-9_-]{0,80}$/i.test(c.id||"")&&
   typeof c.name==="string"&&c.name.length<=100,"Invalid Lafrich character");
  const out=character(c.gender,c.name);out.id=c.id||"";out.faceId=String(c.faceId||"").slice(0,100);
  let size=0;
  for(const k of WEAR)for(const d of DIRS){
   const p=c.wear?.[k]?.[d];
   if(p!==undefined){assert(nativePng(p),"Invalid wear "+k+"/"+d);out.wear[k][d]=p;size+=p.length;}
  }
  assert(size<6000000,"Custom Wear too large");
  return out;
 }
 function toPython(m){
  const valid=validateMotion(m);
  return "# LAFRICH PUPPET MOTION v1 — declarative Python, no old stock actions\n"+
   "# Edit pose x/y/a and frame ms. Import this .py in Lafrich Animation.\n"+
   "MOTION = "+JSON.stringify(valid,null,2)+"\n";
 }
 function fromPython(s){
  assert(typeof s==="string"&&s.length<2000000,"Python motion too large");
  const match=s.match(/(?:^|\n)\s*MOTION\s*=\s*(\{[\s\S]*\})\s*$/);
  assert(!!match,"Expected a Python MOTION = {...} literal");
  // Deliberately DO NOT execute Python supplied by a file. Strict literal
  // preserves native .py authoring without arbitrary browser code execution.
  let value;try{value=JSON.parse(match[1])}catch{throw Error("Motion must be a JSON-compatible Python dict literal")}
  return validateMotion(value);
 }
 return Object.freeze({W,H,N,DIRS,IDS,PARTS,PARENTS,DRAW_ORDER,LAYERS,WEAR,FORMAT,MOTION,CHARACTER,
  MASTER_KEY,CHARACTER_KEY,MOTION_KEY,piecePixels,applyPiecePixels,blankPose,blankFrame,master,validateMaster,
  motion,validateMotion,character,validateCharacter,encode,decode,clone,toPython,fromPython});
});
