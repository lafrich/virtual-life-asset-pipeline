/* Character Reference Reset — non-destructive display policy.
 * Historical sprite files, local drafts, rigs, animations, and saved cities
 * remain untouched. This controls which actor references apps may display.
 * To adopt the next approved model/rig, list its IDs in APPROVED_IDS.
 */
(function(root){
 "use strict";
 const APPROVED_IDS=Object.freeze(["human_pixel_reference_v2"]);
 const allowed=new Set(APPROVED_IDS);
 const api=Object.freeze({
  mode:"new-modular-rig-v2",
  active:true,
  message:"ACUAN BARU / MODULAR PIXEL RIG V2",
  approvedIds:APPROVED_IDS,
  visible:(actor)=>!!actor&&allowed.has(typeof actor==="string"?actor:actor.id),
  filter:(characters)=>Array.isArray(characters)?characters.filter(actor=>
   allowed.has(actor?.id)):[],
  get hasApproved(){return allowed.size>0;}
 });
 root.VLCharacterReferenceReset=api;
 if(root.document?.documentElement){
  root.document.documentElement.classList.add("character-reference-reset");
 }
})(typeof window!=="undefined"?window:{});
