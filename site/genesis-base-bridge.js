/* Approved two-base Genesis bridge for MAHLUK Character Creator.
 * Existing authored characters remain available under Modify Existing Character.
 * Base templates are immutable source records, cloned into a fresh editable draft.
 * Faces are blank and installed ONLY by Emosi.exe database selection.
 * Never writes approved source layers or unrelated characters.
 */
(function(root,factory){"use strict";const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.V6PGenesisBase=api;})(typeof window!=="undefined"?window:null,function(root){
"use strict";
const IDS=Object.freeze({male:"genesis_male_nude",female:"genesis_female_nude"});
function get(gender){
 const id=IDS[gender];
 const b=root?.VLGenesisSource?.bases?.[id];
 if(!b||b.gender!==gender||!b.parts||!Object.keys(b.parts).length)
  throw Error("Approved Genesis "+gender+" not synced. Reload the Mahluk source and retry; do not create a stock base.");
 return b;
}
function options(){return Object.freeze([
 {value:"base:male",label:"Genesis Male Nude",id:IDS.male},
 {value:"base:female",label:"Genesis Female Nude",id:IDS.female}
]);}
function install(store,id,gender){
 if(!id||!store?.get?.(id))throw Error("Target draft missing");
 const source=get(gender);
 // Fail before any write if a source layer is corrupt/missing.
 const parts=Object.entries(source.parts);
 if(parts.length<(gender==="female"?4:4)||parts.some(([key,val])=>
  !/^(?:top\/custom(?:_back)?(?:_f)?|pants\/custom(?:_f)?|shoes\/(?:custom(?:_f)?|shoes_f))$/.test(key)||
  !/^data:image\/png;base64,/.test(val)))throw Error("Invalid Genesis source sheets");
 const original=store.get(id);
 if(!original)throw Error("Cannot mutate unknown draft");
 // Approved Genesis custom shoe pixels are barefoot skin colours, not authored footwear.
 // Dress new clones with the existing native Mahluk shoe atlas; preserve all
 // original shoes/custom[_f] sheets in the draft for explicit future editing.
 const look={...(source.appearance||{}),body:gender,gender,shoes:"shoes",face:"blank",characterId:id};
 store.update(id,{appearance:look,faceId:""});
 for(const [key,png] of parts)store.setPart(id,key,png);
 return store.get(id);
}
return Object.freeze({IDS,get,options,install});
});
