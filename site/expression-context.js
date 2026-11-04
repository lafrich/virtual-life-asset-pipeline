/* Mahluk Hidup: shared action-to-expression registry; no cross-actor sprite swaps. */
(function(root,factory){"use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.VLExpressionContext=api;
})(typeof window!=="undefined"?window:null,function(){"use strict";
 const KNOWN=new Set(["neutral","smile","happy","sad","angry","surprised",
   "sleepy","blink","embarrassed","talk_open","talk_closed"]);
 function track(db,motion){
   if(!motion)return ["neutral"];
   const id=typeof motion==="string"?motion:motion.id;
   const own=typeof motion==="object"?motion.expression_sequence:null;
   let seq=Array.isArray(own)&&own.length?own:
     db?.motions?.[id]||db?.gameplay?.[id];
   if(!seq){
     const hit=Object.entries(db?.fallbacks||{}).find(([key])=>String(id||"").includes(key));
     seq=hit?[hit[1]]:["neutral"];
   }
   return Array.isArray(seq)&&seq.length&&seq.every(x=>KNOWN.has(x))?seq:["neutral"];
 }
 function at(db,motion,frame=0){
   const seq=track(db,motion),i=((Math.floor(Number(frame)||0)%seq.length)+seq.length)%seq.length;
   return seq[i];
 }
 function canManual(face,motion){return Boolean(face?.motion_sheets?.[motion?.id]);}
 function playbackFace(db,motion,frame,face,auto=true){
   if(!auto&&canManual(face,motion))
     return {id:face.id,source:"manual",sheet:face.motion_sheets[motion.id]};
   return {id:at(db,motion,frame),source:"action",sheet:null};
 }
 function validate(db){
   if(!db||!Array.isArray(db.gallery)||!db.motions)return false;
   const ids=db.gallery.map(x=>x.id);
   return new Set(ids).size===ids.length&&ids.every(x=>KNOWN.has(x))&&
     Object.values(db.motions).every(v=>Array.isArray(v)&&v.length&&v.every(x=>KNOWN.has(x)));
 }
 return Object.freeze({track,at,canManual,playbackFace,validate});
});
