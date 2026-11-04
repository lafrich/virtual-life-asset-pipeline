/* Universal BED sleep for original V6B actors.
 * Reuses the actor's own genuine LIE pose atlas (not a rotated idle sprite).
 * New costumes inherit native sleep frames from their source base.
 * Missing pose artwork stays unavailable; never borrow another character.
 */
(function(root,factory){"use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.VLUniversalSleep=api;
})(typeof window!=="undefined"?window:null,function(){"use strict";
 const IDs=Object.freeze(["sleep_bed_right","sleep_bed_left"]);
 const DIR=Object.freeze(["se","sw","ne","nw"]);
 const DELAYS=Object.freeze([380,430,470,430]);
 const ROW=36,FRAMES=4;
 const safePath=s=>typeof s==="string"&&/^media\/[a-z0-9_.-]+\.png$/i.test(s);
 const isSleep=id=>IDs.includes(id);
 // Direction is front/back plus the chosen head-to-foot alignment.
 function directionFor(action,dir){
  // Preserve all FOUR distinct camera-facing originals; collapsing SW into
  // SE (or NW into NE) incorrectly duplicates artwork and breaks the actor's
  // rotation while lying down. Left/right sleep are mirrored bed orientations.
  const facing=DIR.includes(dir)?dir:"se";
  if(action==="sleep_bed_right")return facing;
  if(action==="sleep_bed_left")
   return ({se:"sw",sw:"se",ne:"nw",nw:"ne"})[facing];
  return facing;
 }
 function getSource(ch){
  if(!ch||!safePath(ch.sheet))return null;
  // These are actual actor-specific pose frames, never portrait/stand-in art.
  const motion=(Array.isArray(ch.motions)?ch.motions:[])
   .find(m=>m.id==="lie"&&m.available===true);
  if(motion){
   const separate=safePath(motion.sheet);
   if(motion.sheet&&!separate)return null;
   const row=separate?0:Number(motion.row);
   if(!Number.isInteger(row)||row<0||row>40||Number(motion.frames)<FRAMES)return null;
   return {sheet:separate?motion.sheet:ch.sheet,row,frames:FRAMES,
    source:"native-lie",separate};
  }
  // An original, populated 44-row V6B sheet advertises this canonical row
  // in its own catalog entry. Legacy 44-row padding never advertises it.
  const row=ch.row_starts?.lie;
  if(Number.isInteger(row)&&row===ROW)
   return {sheet:ch.sheet,row,frames:FRAMES,source:"native-lie",separate:false};
  return null;
 }
 function resolve(ch,action){
  if(!isSleep(action))return null;
  const source=getSource(ch);
  return source?{...source,id:action,name:action==="sleep_bed_right"?
   "SLEEP / BED RIGHT":"SLEEP / BED LEFT",
   category:"posture",universal:true,loop:true,frameMs:420,
   frame_ms:[...DELAYS],objectLayer:"behind",rotation:0}:null;
 }
 function actionsFor(ch){
  return IDs.map(id=>resolve(ch,id)).filter(Boolean).map(item=>({
   id:item.id,name:item.name,category:item.category,source:item.separate?"custom":"native",
   sheet:item.separate?item.sheet:undefined,row:item.row,available:true,
   frames:FRAMES,loop:true,frame_ms:[...DELAYS],universal:true,
   objectLayer:"behind"
  }));
 }
 function breathing(frame){return [0,-1,0,1][((Math.floor(frame)||0)%4+4)%4]}
 const definitions=Object.freeze([
  {id:"sleep_bed_right",label:"SLEEP / BED RIGHT",category:"posture",
   status:"native",priority:"P0",requirements:["bed"],loop:true},
  {id:"sleep_bed_left",label:"SLEEP / BED LEFT",category:"posture",
   status:"native",priority:"P0",requirements:["bed"],loop:true}
 ]);
 return Object.freeze({IDs,DIR,ROW,FRAMES,DELAYS,definitions,isSleep,
  getSource,resolve,actionsFor,directionFor,breathing});
});