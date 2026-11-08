/* GENESIS V6B / strict reusable motion contract.
   New motions are data-only. Existing idle/walk/native V6B atlases stay authoritative.
   No Character/Custom Wear/Emosi pixels or character IDs are allowed inside a motion. */
(function(root,factory){"use strict";const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.V6PUniversalMotionContract=api;})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){"use strict";
const FORMAT="genesis-v6b-universal-motion-v1";
const DIRS=Object.freeze(["se","sw","ne","nw"]);
const PARTS=Object.freeze(["leg_l","leg_r","torso","arm_l","arm_r","head"]);
const ANCHORS=Object.freeze({leg_l:[25,84],leg_r:[39,84],torso:[32,60],arm_l:[20,54],arm_r:[44,54],head:[32,35]});
const SOURCE_ACTIONS=Object.freeze(["idle","sit","lie","sleep"]);
const MAX_FRAMES=6, MIN_MS=40,MAX_MS=800;
function pose(){
 const parts={};for(const p of PARTS){const a=ANCHORS[p];parts[p]={x:0,y:0,angle:0,ax:a[0],ay:a[1]}}return parts;
}
function tracks(count=4){
 const out={};for(const dir of DIRS)out[dir]=Array.from({length:count},pose);return out;
}
function clone(value){return JSON.parse(JSON.stringify(value))}
function assert(condition,message){if(!condition)throw Error("GENESIS MOTION: "+message)}
function validate(motion,frames){
 assert(motion?.format===FORMAT,"unsupported motion contract");
 assert(SOURCE_ACTIONS.includes(motion.sourceAction),"unsupported native source pose");
 assert(Array.isArray(frames)&&frames.length>=1&&frames.length<=MAX_FRAMES,"requires 1–6 frames");
 for(const f of frames)assert(Number.isFinite(f.ms)&&f.ms>=MIN_MS&&f.ms<=MAX_MS,"frame duration must be 40–800 ms");
 assert(motion.tracks&&typeof motion.tracks==="object","missing motion tracks");
 assert(!Object.hasOwn(motion,"characterId")&&!Object.hasOwn(motion,"sourceId")&&!Object.hasOwn(motion,"appearance")&&!Object.hasOwn(motion,"wear")&&!Object.hasOwn(motion,"faceId"),"motion must not contain a character or appearance");
 for(const dir of DIRS){
  const sequence=motion.tracks[dir];
  assert(Array.isArray(sequence)&&sequence.length===frames.length,dir+" frame count mismatch");
  for(let i=0;i<sequence.length;i++){
   const frame=sequence[i];
   for(const part of PARTS){
    const p=frame?.[part];
    assert(p&&["x","y","angle","ax","ay"].every(k=>Number.isFinite(p[k])),dir+" F"+i+" invalid "+part);
    assert(Math.abs(p.x)<=128&&Math.abs(p.y)<=128&&Math.abs(p.angle)<=180&&p.ax>=0&&p.ax<=63&&p.ay>=0&&p.ay<=111,
     dir+" F"+i+" "+part+" transform out of bounds");
   }
  }
 }
 assert(motion.status==="draft"||motion.status==="stock","invalid publication status");
 return true;
}
function make({sourceAction="idle",frames=[{key:"f0",ms:140},{key:"f1",ms:140}],tracks:input,status="draft"}={}){
 const motion={format:FORMAT,sourceAction,tracks:clone(input||tracks(frames.length)),status};
 validate(motion,frames);return motion;
}
function isUniversal(manifest){return !!(manifest?.motion?.format===FORMAT)}
function isStock(manifest){return isUniversal(manifest)&&manifest.motion.status==="stock"}
function validateManifest(manifest){
 assert(isUniversal(manifest),"not a Genesis universal animation");
 assert(manifest.sheet?.cell?.join(",")==="64,112","invalid V6B frame dimensions");
 assert(manifest.sheet?.pivot?.join(",")==="32,100","invalid native anchor");
 assert(manifest.dirs?.join(",")===DIRS.join(","),"requires all four directions");
 assert(typeof manifest.id==="string"&&/^(?:clp|clip)_[a-z0-9_]{3,70}$/.test(manifest.id),"invalid animation ID");
 return validate(manifest.motion,manifest.frames);
}
return Object.freeze({FORMAT,DIRS,PARTS,ANCHORS,SOURCE_ACTIONS,MAX_FRAMES,MIN_MS,MAX_MS,pose,tracks,make,validate,isUniversal,isStock,validateManifest});
});