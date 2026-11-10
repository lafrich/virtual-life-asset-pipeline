/* LGR-1 motion — shared keyframe motion contract (JS twin of the Python
 * functions in genesis_procedural_runtime.py; both read the SAME data file
 * site/media/lgr1/motions.json).
 *
 * Motions are authored ANATOMICALLY (right/left arm and leg) and AS SEEN IN
 * THE SE VIEW (angles/x in SE screen convention). Each direction maps:
 *   - anatomical side → near/far rig piece using rig.sides[dir]
 *     (default SE near=right, SW near=left, NE near=right, NW near=left)
 *   - facing mirror: SW/NW negate x and angle (SE↔SW / NE↔NW mirror)
 * so the SAME hand moves in every view. Frames are stepped pixel-art frames
 * (1–6 keyframes, 40–2000 ms each), angles snapped to motion.angleSnap.
 */
(function(root,factory){"use strict";const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.LGR1Motion=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
"use strict";
const DIRS=Object.freeze(["se","sw","ne","nw"]);
const ANAT=Object.freeze(["head","torso","arm_r_upper","arm_r_lower","arm_l_upper","arm_l_lower",
 "leg_r_upper","leg_r_lower","leg_l_upper","leg_l_lower"]);
const DEFAULT_SIDES=Object.freeze({se:"right",sw:"left",ne:"right",nw:"left"});
const FACING=Object.freeze({se:1,sw:-1,ne:1,nw:-1});
const LIBRARY_FORMAT="lgr1-motion-library-v1",MOTION_FORMAT="lgr1-motion-v1";
const SNAPS=Object.freeze([1,5,10,15,30,45,90]);
const LABELS=Object.freeze({head:"KEPALA / HEAD",torso:"TORSO",
 arm_r_upper:"LENGAN KANAN · ATAS",arm_r_lower:"LENGAN KANAN · BAWAH",
 arm_l_upper:"LENGAN KIRI · ATAS",arm_l_lower:"LENGAN KIRI · BAWAH",
 leg_r_upper:"PAHA KANAN",leg_r_lower:"BETIS KANAN",leg_l_upper:"PAHA KIRI",leg_l_lower:"BETIS KIRI"});
function sidesOf(rig){
 const s={};
 for(const d of DIRS){const v=rig?.sides?.[d];s[d]=v==="left"||v==="right"?v:DEFAULT_SIDES[d]}
 return s;
}
function rigPart(anat,dir,sides){
 if(anat==="head"||anat==="torso")return anat;
 const [limb,side,seg]=anat.split("_");
 const nearSide=(sides||DEFAULT_SIDES)[dir]||DEFAULT_SIDES[dir];
 const near=(side==="r")===(nearSide==="right");
 return limb+"_"+(near?"near":"far")+"_"+seg;
}
function snap(a,step){
 const s=Number(step)||1;
 return s<=1?a:Math.floor(a/s+0.5)*s;
}
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
function checkXYA(v,label){
 if(v===undefined)return null;
 if(!v||typeof v!=="object")throw Error("LGR-1 motion: invalid "+label);
 const out={x:num(v.x),y:num(v.y),a:num(v.a)};
 if(Math.abs(out.x)>32||Math.abs(out.y)>32||Math.abs(out.a)>360)throw Error("LGR-1 motion: "+label+" out of range");
 return out;
}
function validatePose(p,label){
 const out={};
 for(const k of Object.keys(p||{})){
  if(!ANAT.includes(k))throw Error("LGR-1 motion: unknown part "+k+" in "+label);
  out[k]=checkXYA(p[k],label+"/"+k);
 }
 return out;
}
function validateMotion(m,poses){
 if(!m||typeof m!=="object")throw Error("LGR-1 motion missing");
 if(!/^[a-z0-9_]{1,40}$/.test(String(m.id||"")))throw Error("LGR-1 motion id must be a-z0-9_ (1–40)");
 const name=String(m.name||m.id).slice(0,60);
 const source=String(m.source||"neutral");
 if(poses&&!poses[source])throw Error("LGR-1 motion "+m.id+": unknown source pose "+source);
 const snapStep=SNAPS.includes(Number(m.angleSnap))?Number(m.angleSnap):5;
 if(!Array.isArray(m.frames)||m.frames.length<1||m.frames.length>6)throw Error("LGR-1 motion "+m.id+" needs 1–6 keyframes");
 const frames=m.frames.map((f,i)=>{
  const ms=Number(f?.ms);
  if(!Number.isInteger(ms)||ms<40||ms>2000)throw Error("LGR-1 motion "+m.id+" frame "+(i+1)+": ms must be 40–2000");
  const out={ms,parts:validatePose(f.parts,m.id+"#"+(i+1))};
  if(Array.isArray(f.behindTorso)&&f.behindTorso.length){
   out.behindTorso=f.behindTorso.filter(p=>ANAT.includes(p)&&p!=="torso"&&p!=="head");
  }
  if(f.dirs&&typeof f.dirs==="object"){
   const dirs={};
   for(const d of Object.keys(f.dirs)){
    if(!DIRS.includes(d))throw Error("LGR-1 motion: unknown direction "+d);
    const p=validatePose(f.dirs[d],m.id+"#"+(i+1)+"/"+d);
    if(Object.keys(p).length)dirs[d]=p;
   }
   if(Object.keys(dirs).length)out.dirs=dirs;
  }
  return out;
 });
 return {format:MOTION_FORMAT,id:m.id,name,source,angleSnap:snapStep,loop:m.loop!==false,frames};
}
function validateLibrary(lib){
 if(lib?.format!==LIBRARY_FORMAT)throw Error("Not an LGR-1 motion library");
 const poses={};
 for(const k of Object.keys(lib.poses||{})){
  if(!/^[a-z0-9_]{1,40}$/.test(k))throw Error("Invalid pose id "+k);
  poses[k]=validatePose(lib.poses[k],"pose "+k);
 }
 if(!poses.neutral)poses.neutral={};
 const motions=(lib.motions||[]).map(m=>validateMotion(m,poses));
 return {format:LIBRARY_FORMAT,poses,motions};
}
function duration(m){return m.frames.reduce((n,f)=>n+f.ms,0)}
function frameIndexAt(m,ms){
 const total=duration(m);
 let t=Math.max(0,Number(ms)||0);
 t=m.loop?t%total:Math.min(t,total-1);
 for(let i=0;i<m.frames.length;i++){if(t<m.frames[i].ms)return i;t-=m.frames[i].ms}
 return m.frames.length-1;
}
function framePose(poses,m,index,dir,sides){
 const f=m.frames[Math.max(0,Math.min(m.frames.length-1,index|0))];
 const base=poses?.[m.source]||{},facing=FACING[dir],out={};
 for(const anat of ANAT){
  const b=base[anat]||{},d=f.parts[anat]||{},o=f.dirs?.[dir]?.[anat];
  let v;
  if(o)v={x:num(o.x),y:num(o.y),a:num(o.a)};
  else v={x:(num(b.x)+num(d.x))*facing,y:num(b.y)+num(d.y),a:(num(b.a)+num(d.a))*facing};
  v.a=snap(v.a,m.angleSnap);
  out[rigPart(anat,dir,sides)]=v;
 }
 return out;
}
function frameOrder(baseOrder,m,index,dir,sides){
 const f=m.frames[Math.max(0,Math.min(m.frames.length-1,index|0))];
 if(!f.behindTorso?.length)return baseOrder.slice();
 const behind=new Set(f.behindTorso.map(a=>rigPart(a,dir,sides)));
 const rest=baseOrder.filter(p=>!behind.has(p)),moved=baseOrder.filter(p=>behind.has(p));
 const t=rest.indexOf("torso");
 return [...rest.slice(0,t),...moved,...rest.slice(t)];
}
return Object.freeze({DIRS,ANAT,DEFAULT_SIDES,FACING,LIBRARY_FORMAT,MOTION_FORMAT,SNAPS,LABELS,
 sidesOf,rigPart,snap,validateMotion,validateLibrary,duration,frameIndexAt,framePose,frameOrder});
});
