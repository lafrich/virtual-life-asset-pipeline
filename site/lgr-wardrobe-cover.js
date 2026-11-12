/* LGR wardrobe silhouette seeding.
 * One-byte ownership mask and the actual official Genesis BODY image are
 * the ONLY geometric inputs. Never rescale, trace an old garment, or alter
 * Genesis. The output is an editable clothing KEY draft (64x112).
 */
(function(root,factory){"use strict";const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.LGRWardrobeCover=api;
})(typeof window!=="undefined"?window:null,function(){"use strict";
const W=64,H=112;
const PARTS=["leg_far_upper","leg_far_lower","arm_far_upper","arm_far_lower","torso",
 "leg_near_upper","leg_near_lower","arm_near_upper","arm_near_lower","head","pelvis"];
const PALETTES={
 top:["#FF50D6","#FF56D3","#FF5CD0","#FF62CD","#FF68CA"],
 pants:["#FF92B5","#FF98B2","#FF9EAF","#FFA4AC"],
 shoes:["#FFAAA9","#FFB0A6","#FFB6A3","#FFBCA0"]
};
const arm=p=>p.startsWith("arm_"),leg=p=>p.startsWith("leg_");
function included(part,y,mode){
 if(!part||part==="head")return false;
 if(mode==="full")return true; // entire body EXCEPT head; erase in Pixel Editor
 if(mode==="top"){
  if(part==="torso")return y>=50&&y<=79;
  if(part==="pelvis")return y<=81;
  return arm(part)&&y<=67; // short sleeves; elbows/hands stay skin
 }
 if(mode==="long_top")return part==="torso"||part==="pelvis"&&y<=81||arm(part)&&y<=89;
 if(mode==="pants")return part==="pelvis"||leg(part)&&y<=96;
 if(mode==="shoes")return leg(part)&&y>=91;
 return false;
}
/** RGBA Uint8Array + 7168 owner bytes. Returns raw RGBA with exact KEY colors.
 * Does not add pixels outside the artist's body silhouette.
 */
function build(body,owners,group,mode){
 if(!PALETTES[group])throw Error("Only top/pants/shoes can be seeded");
 if(!["full","top","long_top","pants","shoes"].includes(mode))throw Error("Unknown cover mode");
 if(!body||body.length!==W*H*4||!owners||owners.length!==W*H)
  throw Error("Official Genesis source/mask must be 64x112");
 const out=new Uint8ClampedArray(W*H*4),palette=PALETTES[group].map(s=>
  [parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)]);
 let count=0;
 for(let k=0;k<W*H;k++){
  if(!body[k*4+3])continue;
  const part=PARTS[owners[k]],x=k%W,y=(k/W)|0;
  if(!included(part,y,mode))continue;
  // Outermost 1px uses a darker KEY. Keep clusters clean at native 1x.
  const touchesEdge=x===0||x===W-1||
   !body[(k-1)*4+3]||!body[(k+1)*4+3]||
   (k>=W&&!body[(k-W)*4+3])||
   (k+W<W*H&&!body[(k+W)*4+3]);
  const shade=touchesEdge?Math.min(3,palette.length-1):x<29?0:1;
  const rgb=palette[shade];out.set([rgb[0],rgb[1],rgb[2],255],k*4);count++;
 }
 return {pixels:out,count};
}
return Object.freeze({build,PARTS,PALETTES,included});
});