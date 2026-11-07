/* Character-scoped exact-pixel clothing library. Does not retarget four idle drawings.
   Each Custom Wear layer clones a full native V6P sheet, including all directions,
   poses, and frames, then belongs exclusively to the selected character. */
(function(root,factory){"use strict";const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.V6PCustomWear=api;})(typeof window!=="undefined"?window:null,function(root){
"use strict";
const TEMPLATES=Object.freeze({
 top:Object.freeze(["tee","tee_long","tee_graphic","shirt","shirt_tie","cardigan","cardigan_dots"]),
 pants:Object.freeze(["trousers","trousers_ripped","baggy","baggy_ripped"]),
 shoes:Object.freeze(["shoes","sneakers","boots","hightops"])
});
const DEFAULT=Object.freeze({top:"tee",pants:"trousers",shoes:"shoes"});
function selectedTemplate(row,kind){
 const candidate=row?.customWear?.[kind];
 return TEMPLATES[kind]?.includes(candidate)?candidate:DEFAULT[kind];
}
function layers(kind,body){
 if(!TEMPLATES[kind])throw Error("Invalid Custom Wear category");
 const f=body==="female"?"_f":"";
 if(kind==="top")return ["top/custom"+f,"top/custom_back"+f];
 return [kind+"/custom"+f];
}
function sourceFor(part,kind,template){
 return part.replace("/custom", "/"+template);
}
function isCustomPart(part){return /^(?:top\/custom(?:_back)?(?:_f)?|pants\/custom(?:_f)?|shoes\/custom(?:_f)?)$/.test(part||"");}
async function ensure(id,appearance,opts={}){
 const S=root?.V6PCharacterStore,P=root?.V6PPixelSource,C=root?.V6PPartCatalog,V=root?.V6PCompositor;
 if(!S||!P||!C||!V)throw Error("Custom Wear dependencies are missing");
 if(!S.get(id))throw Error("Create a character before editing custom clothing");
 const ch=V.norm({...appearance,characterId:id});
 const rows=[];
 for(const kind of Object.keys(TEMPLATES)){
  if(ch[kind]!=="custom" || opts.kind&&opts.kind!==kind)continue;
  const current=S.get(id),template=selectedTemplate(current,kind);
  const names=layers(kind,ch.body);
  for(const part of names){
   if(!C.isPart(part))throw Error("Missing Custom Wear part in catalog: "+part);
   if(S.getPart(id,part)){rows.push({part,template,created:false});continue;}
   const source=sourceFor(part,kind,template);
   const native=await P.loadSheet(source);
   // Convert stock palette codes to the visual appearance at clone time.
   // Custom sheet pixels are then absolute RGB, never recolored by compositor.
   const g=native.getContext("2d",{willReadFrequently:true});
   const data=g.getImageData(0,0,C.W,C.H);
   const painted=V.keysToDisplay(data,ch);
   g.putImageData(painted,0,0);
   S.setPart(id,part,native.toDataURL("image/png"));
   rows.push({part,template,created:true});
  }
 }
 V.clearCache?.();
 return rows;
}
function changeTemplate(id,kind,template,opts={}){
 const S=root?.V6PCharacterStore,V=root?.V6PCompositor;
 if(!TEMPLATES[kind]?.includes(template))throw Error("Unknown wear template");
 const row=S?.get(id);if(!row)throw Error("Character not found");
 if(opts.reset){
  for(const part of layers(kind,"male").concat(layers(kind,"female")))if(S.getPart(id,part))S.resetPart(id,part);
 }
 S.update(id,{customWear:{[kind]:template}});
 V?.clearCache?.();
 return template;
}
return Object.freeze({TEMPLATES,DEFAULT,layers,selectedTemplate,sourceFor,isCustomPart,ensure,changeTemplate});
});
