"use strict";
/* Category-neutral 2D bone pose sampler. All seven authored shared actions
 * bind to all four skeleton families. This does not skin/render sprite pixels.
 * Original source sprite atlases remain the only approved playable art.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.VirtualLifeBones=api;
})(typeof window!=="undefined"?window:null,function(){
  const CHANNELS=["root","body","head","arm_l","arm_r","leg_l","leg_r"];
  const DIRECTIONS=["se","sw","ne","nw"];
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  function verifySkeleton(skeleton){
    if(!skeleton||!Array.isArray(skeleton.bones)||!skeleton.channels)throw Error("Missing skeleton");
    const found=new Set();
    for(const bone of skeleton.bones){
      if(typeof bone.id!=="string"||found.has(bone.id)||
         bone.parent!==null&&!found.has(bone.parent)||
         !Array.isArray(bone.xy)||bone.xy.length!==2||
         !bone.xy.every(Number.isFinite))throw Error("Invalid skeleton hierarchy");
      found.add(bone.id);
    }
    if(CHANNELS.some(k=>!found.has(skeleton.channels[k])))throw Error("Skeleton missing universal channel");
    return true;
  }
  function verifyMotion(clip){
    if(!clip||typeof clip.id!=="string"||!Number.isFinite(clip.duration_ms)||
       clip.duration_ms<=0||!clip.tracks)throw Error("Invalid motion");
    for(const [channel,track] of Object.entries(clip.tracks)){
      if(!CHANNELS.includes(channel)||!Array.isArray(track)||track.length<1)
        throw Error("Invalid motion channel "+channel);
      let previous=-1;
      for(const key of track){
        if(!Array.isArray(key)||key.length!==4||!key.every(Number.isFinite)||
           key[0]<0||key[0]>clip.duration_ms||key[0]<=previous)
          throw Error("Invalid bone keyframe");
        previous=key[0];
      }
    }
    return true;
  }
  function frame(track,time){
    if(!track||!track.length)return [0,0,0];
    if(time<=track[0][0])return track[0].slice(1);
    for(let i=1;i<track.length;i++){
      const a=track[i-1],b=track[i];
      if(time<=b[0]){
        const p=(time-a[0])/(b[0]-a[0]);
        return [1,2,3].map(j=>a[j]+(b[j]-a[j])*p);
      }
    }
    return track[track.length-1].slice(1);
  }
  function sample(skeleton,clip,elapsedMs,direction="se"){
    verifySkeleton(skeleton);verifyMotion(clip);
    if(!Number.isFinite(elapsedMs)||!DIRECTIONS.includes(direction))throw Error("Invalid playback time/direction");
    const time=clip.loop ? ((elapsedMs%clip.duration_ms)+clip.duration_ms)%clip.duration_ms:
      clamp(elapsedMs,0,clip.duration_ms);
    const mirror=direction==="sw"||direction==="nw"?-1:1;
    const transforms={};
    for(const [semantic,bone] of Object.entries(skeleton.channels)){
      const [x,y,rotation]=frame(clip.tracks[semantic],time);
      // Mirror horizontal movement and angle only; preserve own category proportions.
      transforms[bone]={dx:x*mirror,dy:y,angle:rotation*mirror,semantic};
    }
    const joints={};
    for(const bone of skeleton.bones){
      const local=transforms[bone.id]||{dx:0,dy:0,angle:0};
      const parent=bone.parent?joints[bone.parent]:null;
      const pa=parent?.world_angle||0;
      const radians=pa*Math.PI/180;
      const x=(bone.xy[0]+local.dx)*mirror,y=bone.xy[1]+local.dy;
      const px=parent?.world_x||0,py=parent?.world_y||0;
      joints[bone.id]={
        parent:bone.parent,
        local_x:bone.xy[0]+local.dx,local_y:bone.xy[1]+local.dy,
        local_angle:local.angle,
        world_x:px+x*Math.cos(radians)-y*Math.sin(radians),
        world_y:py+x*Math.sin(radians)+y*Math.cos(radians),
        world_angle:pa+local.angle
      };
    }
    return {action:clip.id,direction,time_ms:time,ended:!clip.loop&&elapsedMs>=clip.duration_ms,
      joints,needs_skin:true};
  }
  function resolve(definitions,motions,modelType,actionId,elapsedMs,direction){
    const skeleton=definitions?.types?.[modelType];
    const clip=motions?.clips?.find(c=>c.id===actionId);
    if(!skeleton)throw Error("Unknown model type "+modelType);
    if(!clip)return null; // A planned action is NOT a completed shared motion.
    return sample(skeleton,clip,elapsedMs,direction);
  }
  return Object.freeze({CHANNELS,DIRECTIONS,verifySkeleton,verifyMotion,sample,resolve});
});
