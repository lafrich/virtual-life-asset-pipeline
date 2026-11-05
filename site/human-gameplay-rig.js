/* Mahluk Hidup: canonical gameplay pose references, owned by HUMAN Male/Female.
 * One action vocabulary for gameplay; never borrow a base body's pixels to
 * render existing NPCs, mascots, robots or other authored characters.
 * A pose-compatible animation is NOT a finished action or a gameplay event.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.VLHumanGameplayRig=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const BASE_IDS=Object.freeze(["human_male_base","human_female_base"]);
 const DIR=Object.freeze(["se","sw","ne","nw"]);
 const FRAME=Object.freeze({width:64,height:112,pivotX:32,pivotY:100});
 const GAME_ACTIONS=Object.freeze({
  use_toilet:"toilet_sit",pee:"toilet_sit",poop:"toilet_sit",
  toilet:"toilet_sit",relax:"sit_idle",rest:"lie_idle",
  work:"office_type",study:"read_document",bathe:"bathe",
  shower:"bathe",bath:"bathtub_bathe",wash:"wash_hands",
  cook:"cook_stir",buy:"browse_item",sell:"accept_payment",
  browse:"browse_item",open:"open_drawer"
 });
 // Pose-compatible visual references must use the SAME ACTOR'S source art.
 // These are not substitutes for an authored animation or gameplay logic.
 const POSE_COMPAT=Object.freeze({
  toilet_sit:Object.freeze(["sit"]),
  sit_idle:Object.freeze(["sit"]),
  office_type:Object.freeze(["sit_type"]),
  read_document:Object.freeze(["sit_type"]),
  sleep:Object.freeze(["lie"]),
  shower:Object.freeze(["bathe"])
 });
 const ID=/^[a-z][a-z0-9_]{0,89}$/;
 const MEDIA=/^media\/[a-z0-9_.-]+\.png$/i;
 function authored(actor,action){
  if(!actor||!Array.isArray(actor.motions))return null;
  const clip=actor.motions.find(m=>m&&m.id===action&&m.available===true&&
   ["native","custom","universal-native"].includes(m.source)&&
   Number.isInteger(m.frames)&&m.frames>=1&&m.frames<=40&&
   Number.isInteger(m.row)&&m.row>=0&&
   MEDIA.test(m.sheet||actor.sheet||""));
  return clip||null;
 }
 function actionId(requested,fixture){
  if(!ID.test(requested||""))return null;
  if(requested==="open"&&fixture==="fridge")return "open_fridge";
  if(requested==="pee"&&fixture==="outdoor_wall")return "pee_wall";
  if(requested==="study"&&fixture==="phone")return "study_online";
  if(requested==="cook"&&fixture==="street_stall")return "cook_stall";
  return GAME_ACTIONS[requested]||requested;
 }
 function compile(input){
  const rows=Array.isArray(input)?input:Array.isArray(input?.characters)?input.characters:[];
  const actors=new Map(rows.filter(x=>x&&typeof x.id==="string").map(x=>[x.id,x]));
  const bases={};
  for(const id of BASE_IDS){
   const actor=actors.get(id);
   const gender=id==="human_male_base"?"male":"female";
   // Missing base is reported, not patched with an arbitrary actor's sprites.
   bases[gender]=(actor&&actor.template===true&&
    actor.template_category==="human"&&actor.gender===gender&&
    authored(actor,"idle")&&authored(actor,"walk"))?
     Object.freeze({id,gender,frame:FRAME,directions:DIR,
      authored:Object.freeze(actor.motions.filter(m=>authored(actor,m.id))
       .map(m=>m.id))}):null;
  }
  function forActor(value,requested,fixture){
   const actor=typeof value==="string"?actors.get(value):value;
   const id=actionId(requested,fixture);
   if(!id)return null;
   const baseId=String(actor?.baseId||actor?.base_id||actor?.id||"");
   const humanBase=BASE_IDS.includes(baseId)&&!!bases[
    baseId==="human_female_base"?"female":"male"];
   // Preserve a character's independently authored clip under its own ID.
   const exact=authored(actor,requested)||authored(actor,id);
   const reference=!exact?(POSE_COMPAT[id]||[])
    .map(key=>authored(actor,key)).find(Boolean):null;
   const motion=exact||reference||null;
   return Object.freeze({
    requested,actionId:id,actorId:actor?.id||null,
    baseline:humanBase?baseId:null,
    visualStatus:exact?"authored":reference?"pose-compatible":"missing",
    animationReady:!!exact,previewReady:!!motion,
    gameplayImplemented:false, // Game mechanics live in Jiwa, not artwork.
    motionId:motion?.id||null,sourceActor:motion?actor.id:null,
    motion:motion||null,frame:FRAME,directions:DIR
   });
  }
  return Object.freeze({
   version:1,ready:!!bases.male&&!!bases.female,
   bases:Object.freeze(bases),forActor,
   canonicalAction:actionId
  });
 }
 return Object.freeze({version:1,BASE_IDS,DIR,FRAME,GAME_ACTIONS,
  POSE_COMPAT,actionId,authored,compile});
});
