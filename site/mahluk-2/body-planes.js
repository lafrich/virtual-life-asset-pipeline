/* Mahluk Hidup 2.0 — body-only texture swap (existing native adult anatomy).
 * Keep head, hair, facial emotion, glasses, props, hierarchy, animation
 * tracks and rig transforms untouched. The published 64x112 cutouts
 * already contain real male/female nude anatomy; no texture synthesis.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MH2BodyPlanes=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const MODES=Object.freeze(["current","male","female"]);
 const BONE_IDS=Object.freeze(["torso","pelvis",
  "shoulder_l","elbow_l","wrist_l","shoulder_r","elbow_r","wrist_r",
  "hip_l","knee_l","ankle_l","hip_r","knee_r","ankle_r"]);
 const BODY=new Set(BONE_IDS);
 function normalize(mode){return MODES.includes(mode)?mode:"current"}
 function matchingBase(base,mode){
  // Male/female rig bases own the corresponding nude texture.
  // "current" stays available as an explicit dressed/original opt-out.
  if(base==="male"||base==="female"){
   if(mode==="current")return "current";
   return base;
  }
  return normalize(mode);
 }
 function defaultForBase(base){
  return base==="male"||base==="female"?base:"current";
 }
 function isBodyBone(bone){return BODY.has(bone)}
 function selected(slot,{base="original",outfit="outfit",bodyPlane="current"}={}){
  const swap=normalize(bodyPlane);
  if(swap!=="current"&&BODY.has(slot?.bone)){
   // Exactly one texture source owns each body bone: published nude
   // cutouts only. Neither the clothed texture nor garment overlay.
   return slot.gender===swap&&slot.layer_type==="body";
  }
  // Other parts follow the exact pre-existing source-selection rules.
  if(base==="original")return !slot.gender;
  if(slot.gender===base)
   return slot.layer_type==="body"||(outfit==="outfit"&&slot.layer_type==="garment");
  return !slot.gender&&slot.expression===true;
 }
 function drawIndex(slot,index,slots,mode,base){
  if(normalize(mode)==="current"||base!=="original"||
    !(slot.gender&&isBodyBone(slot.bone)))return index;
  // Put swapped nude body cuts at the original body's painter order,
  // so hair, head, face and accessories keep their original depth.
  const owner=slots.findIndex(s=>!s.gender&&s.bone===slot.bone&&!s.expression);
  return owner>=0?owner+index/100000:index;
 }
 return Object.freeze({MODES,BONE_IDS,normalize,matchingBase,defaultForBase,isBodyBone,selected,drawIndex});
});
