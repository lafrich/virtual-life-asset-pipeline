/* Genesis V6B Python pose copy/paste across directions.
 * Only transforms the existing 15 joints and six angle values; never modifies
 * template, clip ID, frame count, duration or master rig.
 */
(function(root,factory){"use strict";const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.GenesisPoseClipboard=api;})(typeof window!=="undefined"?window:null,function(root){
 "use strict";
 const C=root?.GenesisNativePythonContract||(typeof require==="function"?require("./genesis-native-python-contract.js"):null);
 function flipName(name){
  return name.endsWith("_near")?name.slice(0,-5)+"_far":name.endsWith("_far")?name.slice(0,-4)+"_near":name;
 }
 function flip(p){
  if(!p||!p.joints||!p.angles)throw Error("Missing Python anatomical pose");
  const joints={},angles={};
  for(const name of C.JOINTS){
   const src=p.joints[flipName(name)];
   if(!src)throw Error("Missing "+name+" source joint");
   joints[name]={x:63-src.x,y:src.y};
  }
  for(const name of C.ANGLES){
   const src=p.angles[flipName(name)];
   if(!Number.isInteger(src))throw Error("Missing "+name+" source angle");
   angles[name]=-src;
  }
  return {joints,angles};
 }
 function clone(p){return JSON.parse(JSON.stringify(p))}
 function paste(source,mirrored=false){return mirrored?flip(source):clone(source)}
 function pasteDirection(source,target,{mirrored=false}={}){
  if(!Array.isArray(source)||!Array.isArray(target)||source.length!==target.length)
   throw Error("Copy/Paste all requires identical frame counts");
  return source.map(p=>paste(p,mirrored));
 }
 return Object.freeze({flip,flipName,paste,pasteDirection});
});
