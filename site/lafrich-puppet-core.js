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
 const PARTS=Object.freeze(["leg_far","arm_far","torso","leg_near","arm_near","head"]);
 const LAYERS=Object.freeze(["hair_back","body","pants","shoes","top_back","top","body_front","hair_front","accessory"]);
 const WEAR=Object.freeze(["pants","shoes","top_back","top","hair_back","hair_front","accessory"]);
 const FORMAT="lafrich-puppet-master-v1",MOTION="lafrich-puppet-motion-v1",CHARACTER="lafrich-puppet-character-v1";
 const MASTER_KEY="vl-lafrich-puppet-masters-v1",CHARACTER_KEY="vl-lafrich-puppet-characters-v1",
  MOTION_KEY="vl-lafrich-puppet-motions-v1";
 const maxPng=160000;
 const clone=a=>JSON.parse(JSON.stringify(a));
 function assert(ok,msg){if(!ok)throw Error("Lafrich Puppet: "+msg)}
 const isPoint=p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.x<W&&p.y>=0&&p.y<H;
 const coords=Object.freeze({head:[32,40],torso:[32,65],arm_near:[21,65],arm_far:[43,65],
  leg_near:[26,85],leg_far:[38,85]});
 function maskDefault(){
  const bytes=new Uint8Array(N);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const part=y<49?"head":y<80?(x<24?"arm_near":x>40?"arm_far":"torso"):
    x<32?"leg_near":"leg_far";
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
 return Object.freeze({W,H,N,DIRS,IDS,PARTS,LAYERS,WEAR,FORMAT,MOTION,CHARACTER,
  MASTER_KEY,CHARACTER_KEY,MOTION_KEY,blankPose,blankFrame,master,validateMaster,
  motion,validateMotion,character,validateCharacter,encode,decode,clone,toPython,fromPython});
});
