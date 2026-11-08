/* Genesis V6B native Python-source interchange contract.
 * A .py file is a declarative Python source module, not arbitrary executable code.
 * Browser imports NEVER eval/exec Python. The future V6B raster generator is
 * responsible for producing pixels from these anatomical coordinates.
 * No six-cutout sprite compositor, stock overwrite, or Emosi coupling.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.GenesisNativePythonContract=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const FORMAT="genesis-v6b-native-animation-v1", ASSIGNMENT="GENESIS_V6B_ANIMATION";
 const DIRS=Object.freeze(["se","sw","ne","nw"]);
 const TEMPLATES=Object.freeze(["walk","idle","talk","sit","sit_type","sleep","tired","swim","float","lie","perch"]);
 const ANCHORS=Object.freeze({
  head:[32,44],neck:[32,53],torso:[32,67],
  shoulder_near:[22,63],elbow_near:[21,70],hand_near:[20,76],
  shoulder_far:[42,63],elbow_far:[43,70],hand_far:[44,76],
  hip_near:[28,80],knee_near:[27,90],foot_near:[26,100],
  hip_far:[37,80],knee_far:[38,90],foot_far:[39,100]
 });
 const JOINTS=Object.freeze(Object.keys(ANCHORS));
 const ANGLES=Object.freeze(["head","torso","elbow_near","elbow_far","knee_near","knee_far"]);
 const MAX_FRAMES=24,MAX_BYTES=200000;
 function fail(message){throw Error("Genesis native Python: "+message)}
 function clone(data){return JSON.parse(JSON.stringify(data))}
 function safeId(id){return /^anim_[a-z0-9_]{3,64}$/.test(id||"")}
 function pose(){
  return {joints:Object.fromEntries(JOINTS.map(k=>[k,{x:ANCHORS[k][0],y:ANCHORS[k][1]}])),
   angles:Object.fromEntries(ANGLES.map(k=>[k,0]))};
 }
 function make({id,name,template="idle",frameCount=4,ms=140,loop=true}={}){
  const title=String(name||"").trim().slice(0,80);
  if(!title)fail("animation name required");
  const safeName=title.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,36)||"motion";
  const key=id||("anim_"+safeName+"_"+Date.now().toString(36));
  const n=Number(frameCount);
  if(!Number.isInteger(n)||n<1||n>MAX_FRAMES)fail("frame count 1–24 required");
  const data={
   format:FORMAT,id:key,name:title,template,loop:!!loop,
   grid:{frame:[64,112],pivot:[32,100],canvas:[40,72],canvasOffset:[15,31]},
   frames:Array.from({length:n},(_,i)=>({key:"f"+i,ms:Number(ms)})),
   poses:Object.fromEntries(DIRS.map(d=>[d,Array.from({length:n},pose)]))
  };
  return validate(data);
 }
 function validate(value){
  if(!value||typeof value!=="object"||Array.isArray(value))fail("invalid animation data");
  if(value.format!==FORMAT)fail("unsupported animation format");
  if(!safeId(value.id))fail("invalid animation id");
  if(typeof value.name!=="string"||!value.name.trim()||value.name.length>80)fail("invalid name");
  if(!TEMPLATES.includes(value.template))fail("template must be one of the 11 native actions");
  if(typeof value.loop!=="boolean")fail("loop must be boolean");
  const g=value.grid;
  for(const [key,expected] of Object.entries({frame:[64,112],pivot:[32,100],canvas:[40,72],canvasOffset:[15,31]}))
   if(!Array.isArray(g?.[key])||g[key].length!==expected.length||g[key].some((v,i)=>v!==expected[i]))
    fail("invalid native grid "+key);
  if(!Array.isArray(value.frames)||value.frames.length<1||value.frames.length>MAX_FRAMES)fail("invalid frames");
  if(value.frames.some((f,i)=>!f||f.key!=="f"+i||!Number.isInteger(f.ms)||f.ms<40||f.ms>1200))
   fail("invalid frame duration or key");
  if(!value.poses||Object.keys(value.poses).sort().join()!==DIRS.slice().sort().join())
   fail("four directions required");
  for(const dir of DIRS){
   if(!Array.isArray(value.poses[dir])||value.poses[dir].length!==value.frames.length)
    fail("missing direction/frame "+dir);
   for(const [index,p] of value.poses[dir].entries()){
    if(!p||!p.joints||!p.angles||
       Object.keys(p.joints).sort().join()!==JOINTS.slice().sort().join()||
       Object.keys(p.angles).sort().join()!==ANGLES.slice().sort().join())
     fail("anatomical joints missing at "+dir+" frame "+index);
    for(const k of JOINTS){
     const j=p.joints[k];
     if(!j||!Number.isInteger(j.x)||!Number.isInteger(j.y)||j.x<0||j.x>=64||j.y<0||j.y>=112)
      fail("joint outside the V6B frame: "+k);
    }
    for(const k of ANGLES)if(!Number.isInteger(p.angles[k])||Math.abs(p.angles[k])>180)
     fail("invalid joint angle: "+k);
   }
  }
  const text=JSON.stringify(value);
  if(text.length>MAX_BYTES||text.includes("'''"))fail("source is too large or contains a Python string delimiter");
  // Pure data is cloned so importers cannot silently retain unsafe references.
  return clone(value);
 }
 function toPython(data){
  const safe=validate(data);
  return "# Genesis V6B native animation v1. Declarative source, no executable imports.\n"+
   "# Joint positions are absolute in the 64x112 native frame; the generator rasterizes them.\n"+
   ASSIGNMENT+" = r'''"+JSON.stringify(safe)+"'''\n";
 }
 function fromPython(source){
  if(typeof source!=="string"||source.length>MAX_BYTES+1000)fail("Python source too large");
  const match=source.match(/^(?:[ \t]*#[^\r\n]*(?:\r?\n|$))*[ \t]*GENESIS_V6B_ANIMATION[ \t]*=[ \t]*r'''([^\u0000]*?)'''[ \t]*(?:\r?\n)?$/);
  if(!match)fail("only the Genesis V6B declarative Python contract is accepted; arbitrary Python is not executed");
  let data;try{data=JSON.parse(match[1])}catch{fail("invalid JSON in Python source")}
  return validate(data);
 }
 return Object.freeze({FORMAT,ASSIGNMENT,DIRS,TEMPLATES,JOINTS,ANGLES,ANCHORS,MAX_FRAMES,make,pose,validate,toPython,fromPython});
});
