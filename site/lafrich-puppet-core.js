/* LGR-1 core (wire format "lafrich-puppet-master-v1") — four-view 64×112 pixel rig contract.
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
 const isPlacement=p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&
  Math.abs(p.x)<=W&&Math.abs(p.y)<=H;
 // Pivots are in original 64×112 V6B coordinates and can be edited in four views.
 // Defaults follow the V6B Genesis silhouette (arms x≤24 / x≥40, elbow y69,
 // hip y81, knee y94). SE/NW keep the near limbs on screen-left; SW/NE are the
 // mirror (x' = 64 − x) so "near" is always the limb closest to the camera:
 // SE near=right, SW near=left, NE near=right, NW near=left (see lgr1-motion.js).
 const coords=Object.freeze({torso:[32,66],head:[32,50],
  arm_near_upper:[24,61],arm_near_lower:[23,69],
  arm_far_upper:[40,61],arm_far_lower:[41,69],
  leg_near_upper:[28,81],leg_near_lower:[28,93],
  leg_far_upper:[36,81],leg_far_lower:[36,93]});
 const MIRRORED=Object.freeze({se:false,sw:true,ne:true,nw:false});
 const mirrorX=x=>Math.min(W-1,Math.max(0,64-x));
 function defaultPart(x,y){
  if(y<50)return "head";
  if(y<81){
   if(y>=61&&x<=24)return y<69?"arm_near_upper":"arm_near_lower";
   if(y>=61&&x>=40)return y<69?"arm_far_upper":"arm_far_lower";
   return "torso";
  }
  if(x<32)return y<94?"leg_near_upper":"leg_near_lower";
  return y<94?"leg_far_upper":"leg_far_lower";
 }
 function maskDefault(dir="se"){
  const bytes=new Uint8Array(N),flip=!!MIRRORED[dir];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)
   bytes[y*W+x]=PARTS.indexOf(defaultPart(flip?mirrorX(x):x,y));
  return encode(bytes);
 }
 function defaultPivots(dir="se"){
  const flip=!!MIRRORED[dir];
  return Object.fromEntries(PARTS.map(p=>[p,{x:flip?mirrorX(coords[p][0]):coords[p][0],y:coords[p][1]}]));
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
   masks:Object.fromEntries(DIRS.map(d=>[d,maskDefault(d)])),
   pivots:Object.fromEntries(DIRS.map(d=>[d,defaultPivots(d)])),
   // Additive/backward-compatible placement: pixel assets stay at native source
   // coordinates, and the renderer moves each cut puppet piece with its joints.
   placements:Object.fromEntries(DIRS.map(d=>[d,Object.fromEntries(PARTS.map(p=>[p,{x:0,y:0}]))]))};
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
    const placement=input.placements?.[d]?.[part];
    if(placement!==undefined){
     assert(isPlacement(placement),"Invalid body piece placement "+d+" / "+part);
     out.placements[d][part]={x:placement.x,y:placement.y};
    }
   }
  }
  assert(total<6000000,"Master exceeds 6 MB; split assets across parts");
  // Optional LGR-1 render settings; copied only when present so masters saved
  // before these fields existed round-trip byte-identically.
  if(input.drawOrders!==undefined){
   assert(input.drawOrders&&typeof input.drawOrders==="object","Invalid draw orders");
   out.drawOrders={};
   for(const d of DIRS){
    const o=input.drawOrders[d];if(o===undefined)continue;
    assert(Array.isArray(o)&&o.length===PARTS.length&&PARTS.every(p=>o.includes(p)),"Invalid draw order "+d);
    out.drawOrders[d]=o.slice();
   }
  }
  if(input.sides!==undefined){
   out.sides={};
   for(const d of DIRS){const v=input.sides?.[d];if(v===undefined)continue;
    assert(v==="left"||v==="right","Invalid near side "+d);out.sides[d]=v}
  }
  if(input.capRadius!==undefined){
   out.capRadius={};
   for(const p of PARTS){const v=input.capRadius?.[p];if(v===undefined)continue;
    assert(Number.isInteger(v)&&v>=0&&v<=6,"Invalid joint cap "+p);out.capRadius[p]=v}
  }
  return out;
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
  if(c.maskTweaks&&typeof c.maskTweaks==="object"){
   out.maskTweaks={};
   for(const d of DIRS){const t=c.maskTweaks[d];if(t===undefined)continue;
    assert(typeof t==="string"&&t.length<=9700&&/^[a-z0-9+/]*={0,2}$/i.test(t),"Invalid outfit tweak "+d);
    const chars=typeof atob==="function"?atob(t):Buffer.from(t,"base64").toString("binary");
    assert(chars.length===N&&[...chars].every(ch=>{const b=ch.charCodeAt(0);return b<PARTS.length||b===254||b===255}),"Invalid outfit tweak "+d);
    out.maskTweaks[d]=t}
  }
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
  MASTER_KEY,CHARACTER_KEY,MOTION_KEY,MIRRORED,blankPose,blankFrame,master,validateMaster,maskDefault,defaultPivots,
  motion,validateMotion,character,validateCharacter,encode,decode,clone,toPython,fromPython});
});
