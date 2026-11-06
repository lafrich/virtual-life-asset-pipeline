/* Mahluk Hidup 2 — clean, editable V6B human starter bases.
 * Source artwork: existing published human male/female nude rig planes.
 * No face, hair, clothes or legacy phone props are baked into the root.
 * Existing save schema intentionally remains mahluk-2-character-v1.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MH2FacelessBases=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const FORMAT='mahluk-2-character-v1',PRESET_REV='faceless-nude-v6b-v1';
 const DIRECTIONS=Object.freeze(['se','sw','ne','nw']);
 const BONE_IDS=Object.freeze([
  'head','neck','torso','pelvis',
  'shoulder_l','elbow_l','wrist_l',
  'shoulder_r','elbow_r','wrist_r',
  'hip_l','knee_l','ankle_l','hip_r','knee_r','ankle_r'
 ]);
 const BODY_BONES=new Set(BONE_IDS);
 const FACE_BONES=new Set([
  'emotion','eye_l','eye_r','brow_l','brow_r','nose','mouth','blush_l','blush_r'
 ]);
 const UNWANTED=new Set([
  'hair_back','hair_cap','fringe_l','fringe_mid','fringe_r','phone'
 ]);
 const GENDERS=Object.freeze(['male','female']);
 function normalize(gender){return GENDERS.includes(gender)?gender:null}
 function preset(gender){
  const sex=normalize(gender);
  if(!sex)throw Error('Select male or female human base');
  return Object.freeze({
   id:'human_'+sex+'_noface_nude_v6b',name:'HUMAN '+sex.toUpperCase()+' / NO FACE NUDE',
   base:sex,template_base:'human_'+sex+'_base',
   bodyPlane:sex,outfit:'base',
   facelessBase:sex,rigSystem:'v6b',presetRevision:PRESET_REV,
   atlas:{width:64,height:448,cellWidth:64,cellHeight:112,
    directions:[...DIRECTIONS]},
   animationStorageFormat:FORMAT,
   emotionPlane:{asset:'native:none',keys:[]}
  });
 }
 function editable(id){return BODY_BONES.has(id)}
 function headSlotAllowed(slot,faceless){
  return !faceless||slot?.bone==='head';
 }
 function shouldRenderFace(bone,faceless){
  return !faceless||!FACE_BONES.has(bone);
 }
 function safeEmotion(value){
  return typeof value==='string'&&value.length<=100&&
   (/^native:(?:none|neutral)$/.test(value)||/^(?:db:)?[a-z0-9_-]{1,90}$/.test(value));
 }
 function baseRecordFields(gender){
  const p=preset(gender);
  return {
   base:p.base,template_base:p.template_base,
   facelessBase:p.facelessBase,rigSystem:p.rigSystem,
   presetRevision:p.presetRevision,bodyPlane:p.bodyPlane,outfit:p.outfit,
   emotionPlane:{asset:'native:none',keys:[]}
  };
 }
 return Object.freeze({FORMAT,PRESET_REV,DIRECTIONS,BONE_IDS,
  BODY_BONES,FACE_BONES,UNWANTED,GENDERS,normalize,preset,editable,
  headSlotAllowed,shouldRenderFace,safeEmotion,baseRecordFields});
});
