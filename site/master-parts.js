/* Master parts: non-destructive pixel corrections mapped by category body region.
 * These are editable REGION OVERLAYS on source frames, not magically extracted
 * individual limbs. Offsets are inferred from per-frame silhouette and MUST
 * be reviewed when poses bend, rotate or overlap.
 */
(function(root,factory){"use strict";const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.VirtualLifeMasterParts=api;})(typeof window!=="undefined"?window:null,function(){"use strict";
const PARTS=Object.freeze({
 head:Object.freeze({name:"HEAD / HELMET",box:[8,18,56,72],anchor:[32,42],maxShift:6}),
 body:Object.freeze({name:"TORSO",box:[20,64,44,93],anchor:[32,75],maxShift:5}),
 arm_l:Object.freeze({name:"LEFT ARM",box:[0,54,25,91],anchor:[16,67],maxShift:12}),
 arm_r:Object.freeze({name:"RIGHT ARM",box:[41,54,64,91],anchor:[51,67],maxShift:12}),
 leg_l:Object.freeze({name:"LEFT LEG",box:[10,87,32,112],anchor:[23,99],maxShift:9}),
 leg_r:Object.freeze({name:"RIGHT LEG",box:[32,87,54,112],anchor:[41,99],maxShift:9})
});
function contains(part,x,y){const b=PARTS[part]?.box;return Boolean(b&&Number.isInteger(x)&&Number.isInteger(y)&&x>=b[0]&&x<b[2]&&y>=b[1]&&y<b[3]);}
function changed(base,edited,part){
 if(!PARTS[part]||!base?.data||!edited?.data||base.data.length!==64*112*4||edited.data.length!==base.data.length)throw Error("Invalid master frame");
 const out=[],b=PARTS[part].box;
 for(let y=b[1];y<b[3];y++)for(let x=b[0];x<b[2];x++){
  const i=(y*64+x)*4,old=base.data,cur=edited.data;
  if(old[i]!==cur[i]||old[i+1]!==cur[i+1]||old[i+2]!==cur[i+2]||old[i+3]!==cur[i+3])
   out.push([x,y,cur[i],cur[i+1],cur[i+2],cur[i+3]]);
 }
 return out;
}
function silhouetteCenter(img,part){
 const spec=PARTS[part];if(!spec||!img?.data)throw Error("Invalid part frame");
 const b=spec.box,p=img.data;let sumX=0,sumY=0,n=0;
 for(let y=b[1];y<b[3];y++)for(let x=b[0];x<b[2];x++){
   if(p[(y*64+x)*4+3]>=128){sumX+=x;sumY+=y;n++;}
 }
 return n?[Math.round(sumX/n),Math.round(sumY/n)]:spec.anchor;
}
function offset(reference,target,part){
 const a=silhouetteCenter(reference,part),b=silhouetteCenter(target,part),max=PARTS[part].maxShift;
 return [Math.max(-max,Math.min(max,b[0]-a[0])),
         Math.max(-max,Math.min(max,b[1]-a[1]))];
}
function apply(image,original,oldDiff,newDiff,oldShift,newShift,part){
 if(!PARTS[part])throw Error("Unknown part");
 const d=image.data,src=original.data;
 function loc(x,y,shift){const xx=x+shift[0],yy=y+shift[1];if(xx<0||xx>=64||yy<0||yy>=112)return -1;return (yy*64+xx)*4;}
 for(const [x,y] of oldDiff){
  const i=loc(x,y,oldShift);if(i<0)continue;
  for(let k=0;k<4;k++)d[i+k]=src[i+k]; // roll back prior master projection
 }
 for(const [x,y,r,g,b,a]of newDiff){
  const i=loc(x,y,newShift);if(i<0)continue;
  d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=a;
 }
 return image;
}
return Object.freeze({PARTS,contains,changed,silhouetteCenter,offset,apply});
});
