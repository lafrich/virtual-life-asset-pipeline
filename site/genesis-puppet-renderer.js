/* Genesis V6B puppet preview on actual approved Genesis physical pixels.
 * Uses the original V6P native 11-action sprite atlases as source frames.
 * Joint/keyframe data remains the existing Genesis native Python v1 contract.
 * Each edited mask selects pixels in the 64x112 frame; no source pixels or
 * Character/Custom Wear/Emosi data are written by this renderer.
 */
(function(root,factory){"use strict";const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.GenesisPuppetRenderer=api;})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(root){
 "use strict";
 const Master=()=>root?.GenesisMasterRig,Python=()=>root?.GenesisNativePythonContract,V=()=>root?.V6PCompositor;
 const LINKS=Object.freeze({
  head:["head","neck"],torso:["torso","neck","hip_near","hip_far"],
  arm_l:["shoulder_near","elbow_near","hand_near"],arm_r:["shoulder_far","elbow_far","hand_far"],
  leg_l:["hip_near","knee_near","foot_near"],leg_r:["hip_far","knee_far","foot_far"]
 });
 function canvas(){const el=document.createElement("canvas");el.width=64;el.height=112;return el}
 function nativeFrame(sheet,template,dir,frame){
  if(!sheet||sheet.width<64||sheet.height<112)throw Error("Genesis source sheet not ready");
  const v=V(),n=v?.FRAMES?.[template];
  if(!n)throw Error("Unknown native template "+template);
  return v.extractFrame(sheet,template,dir,((frame%n)+n)%n);
 }
 function partParams(pose,profile,dir,part){
  const an=Python()?.ANCHORS||Master()?.JOINTS;
  const keys=LINKS[part];
  let dx=0,dy=0;
  for(const k of keys){
   const source=pose?.joints?.[k]||{x:an[k][0],y:an[k][1]};
   const adjustment=profile?.joints?.[dir]?.[k]||{x:an[k][0],y:an[k][1]};
   dx+=source.x-an[k][0]+adjustment.x-an[k][0];
   dy+=source.y-an[k][1]+adjustment.y-an[k][1];
  }
  dx=Math.round(dx/keys.length);dy=Math.round(dy/keys.length);
  const angle=part==="head"?pose?.angles?.head:
   part==="torso"?pose?.angles?.torso:
   part==="arm_l"?pose?.angles?.elbow_near:
   part==="arm_r"?pose?.angles?.elbow_far:
   part==="leg_l"?pose?.angles?.knee_near:pose?.angles?.knee_far;
  const p=profile.pivots[dir][part];
  return {x:dx,y:dy,angle:Number(angle)||0,ax:p.x,ay:p.y};
 }
 function render({sheet,template="idle",direction="se",frame=0,pose=null,profile=null,showMask=false,maskPart="head"}={}){
  const model=Master();if(!model)throw Error("Genesis master profile is unavailable");
  const g=profile?model.validate(profile):model.load("male");
  if(!model.DIRS.includes(direction))throw Error("Bad Genesis direction");
  const native=nativeFrame(sheet,template,direction,frame);
  const mask=model.decode(g.masks[direction]);
  const raw=native.getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112);
  const output=canvas(),ctx=output.getContext("2d");ctx.imageSmoothingEnabled=false;
  const chunks=model.PARTS.map(()=>new Uint8ClampedArray(raw.data.length));
  for(let i=0;i<mask.length;i++){
   const off=i*4;
   if(raw.data[off+3]===0)continue;
   chunks[mask[i]].set(raw.data.subarray(off,off+4),off);
  }
  // Rear limbs first. Head/Emosi composite is deliberately drawn last.
  for(const part of ["leg_r","arm_r","leg_l","torso","arm_l","head"]){
   const idx=model.PARTS.indexOf(part),pix=chunks[idx];
   const segment=canvas(),g2=segment.getContext("2d");
   g2.putImageData(new ImageData(pix,64,112),0,0);
   const t=partParams(pose,g,direction,part);
   ctx.save();ctx.translate(t.ax+t.x,t.ay+t.y);ctx.rotate(t.angle*Math.PI/180);
   ctx.drawImage(segment,-t.ax,-t.ay);ctx.restore();
  }
  if(showMask){
   const idx=model.PARTS.indexOf(maskPart);
   if(idx>=0){
    const o=ctx.createImageData(64,112);
    for(let i=0;i<mask.length;i++)if(mask[i]===idx){const at=i*4;o.data[at]=35;o.data[at+1]=181;o.data[at+2]=235;o.data[at+3]=87}
    ctx.putImageData(o,0,0);
   }
  }
  return output;
 }
 function genesisAppearance(gender){
  const id=Master().IDS[gender],src=root?.V6PGenesisBase?.get(gender)||root?.VLGenesisSource?.bases?.[id];
  if(!src?.appearance||!src?.parts)throw Error("Approved Genesis "+gender+" is not available");
  const ch={...src.appearance,body:gender,gender,face:"blank",hair:src.appearance.hair||"none",
   characterId:src.sourceId};
  return ch;
 }
 async function genesisSheet(gender){
  const v=V();if(!v)throw Error("Genesis compositor not loaded");
  const look=genesisAppearance(gender);
  const sheet=await v.sheet(look,null,"");
  if(!sheet)throw Error("Genesis physical layers unavailable: "+(v.missing||[]).join(", "));
  return sheet;
 }
 return Object.freeze({LINKS,nativeFrame,partParams,render,genesisAppearance,genesisSheet});
});
