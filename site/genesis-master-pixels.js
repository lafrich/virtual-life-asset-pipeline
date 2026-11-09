/* Pixel source overrides for the two fixed Genesis V6B masters.
 * Every edit targets a whitelisted native 64x112 cell of a real source part;
 * no source PNG, gameplay clip, animation ID or Emosi layer is overwritten.
 * Edited cells are stored as PNG in GenesisMasterRig.pixelFrames and composed
 * into the 384x4928 source layer at the original native row and column.
 */
(function(root,factory){"use strict";const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.GenesisMasterPixel=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(root){
 "use strict";
 const M=()=>root.GenesisMasterRig,V=()=>root.V6PCompositor,Cat=()=>root.V6PPartCatalog;
 const draft=new Map(),DIRS=["se","sw","ne","nw"];
 const pngRE=/^data:image\/png;base64,[a-z0-9+/]+=*$/i;
 const A=()=>root.VLGenesisSource?.bases||{};
 function base(gender){const id=M()?.IDS?.[gender],b=A()[id];if(!b)throw Error("Approved Genesis source absent: "+gender);return b}
 function parts(gender){
  const src=base(gender),f=gender==="female"?"_f":"";
  const a=["base/body"+f,"base/body_front"+f,...Object.keys(src.parts)];
  const look=src.appearance;
  if(look.hair&&look.hair!=="none")a.push("hair/"+look.hair+"_back","hair/"+look.hair+"_front");
  return [...new Set(a)].filter(n=>Cat()?.isPart(n)&&!/^(?:face|brows|facial|glasses)\//.test(n));
 }
 function key(part,action,dir,frame){
  if(!Cat()?.isPart(part)||!Cat()?.ACTIONS.includes(action)||!DIRS.includes(dir)||
    !Number.isInteger(frame)||frame<0||frame>=Cat().FRAMES[action])
   throw Error("Invalid Genesis source part or native frame");
  return part+"|"+action+"|"+dir+"|"+frame;
 }
 function profile(gender){return draft.get(gender)||M().load(gender)}
 function preview(gender,row){
  if(!parts(gender).length)throw Error("Genesis source parts unavailable");
  if(row.gender!==gender)throw Error("Wrong Genesis master");
  draft.set(gender,M().validate(row));
 }
 function clearPreview(gender){draft.delete(gender)}
 function loadImage(src){
  return new Promise((resolve,reject)=>{
   const img=new Image();
   img.onload=()=>resolve(img);
   img.onerror=()=>reject(Error("Cannot decode Genesis PNG"));
   img.src=src;
  });
 }
 function blank(w,h){const c=document.createElement("canvas");c.width=w;c.height=h;return c}
 function cell(source,action,dir,frame){
  const p=Cat().cellOrigin(action,dir,frame),out=blank(64,112);
  const g=out.getContext("2d");g.imageSmoothingEnabled=false;
  g.drawImage(source,p.x,p.y,64,112,0,0,64,112);return out;
 }
 function nativeToDisplay(cv,gender,part){
  if(Cat().isCustomWear(part))return cv;
  const c=blank(64,112),ctx=c.getContext("2d");
  const data=cv.getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112);
  ctx.putImageData(V().keysToDisplay(data,base(gender).appearance),0,0);
  return c;
 }
 function displayToNative(cv,origin,gender,part){
  if(Cat().isCustomWear(part))return cv;
  const c=blank(64,112),ctx=c.getContext("2d");
  const changed=cv.getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112);
  const initial=origin.getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112);
  ctx.putImageData(V().displayToKeys(changed,base(gender).appearance,initial),0,0);
  return c;
 }
 function same(a,b){
  const x=a.getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112).data;
  const y=b.getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112).data;
  return x.every((v,i)=>v===y[i]);
 }
 async function atlases(gender,part,action,frame,row){
  if(!parts(gender).includes(part))throw Error("Part is not in the active Genesis master");
  const src=base(gender);
  const originalImage=await V().img(part,src.sourceId);
  if(!originalImage)throw Error("Original Genesis part unavailable: "+part);
  const clean=blank(64,448),edited=blank(64,448);
  const g=clean.getContext("2d"),h=edited.getContext("2d");
  const edits=(row||profile(gender)).pixelFrames||{};
  const nativeOriginal={};
  for(let i=0;i<DIRS.length;i++){
   const dir=DIRS[i],native=cell(originalImage,action,dir,frame);
   nativeOriginal[dir]=native;
   const shown=nativeToDisplay(native,gender,part);
   g.drawImage(shown,0,i*112);
   const data=edits[key(part,action,dir,frame)];
   let display=shown;
   if(data){
    const override=await loadImage(data);
    if(override.naturalWidth!==64||override.naturalHeight!==112)
     throw Error("Edited Genesis part frame must be 64×112");
    const tmp=blank(64,112);tmp.getContext("2d").drawImage(override,0,0);
    display=nativeToDisplay(tmp,gender,part);
   }
   h.drawImage(display,0,i*112);
  }
  return {clean,edited,nativeOriginal};
 }
 function split(atlas,i){
  const out=blank(64,112);
  out.getContext("2d").drawImage(atlas,0,i*112,64,112,0,0,64,112);
  return out;
 }
 function updatedFrames(gender,part,action,frame,atlas,sourceAtlas,row,nativeOriginal){
  const next={...((row||profile(gender)).pixelFrames||{})};
  for(let i=0;i<DIRS.length;i++){
   const dir=DIRS[i],k=key(part,action,dir,frame),current=split(atlas,i),original=split(sourceAtlas,i);
   if(same(current,original)){delete next[k];continue}
   const native=displayToNative(current,nativeOriginal[dir],gender,part),png=native.toDataURL("image/png");
   if(!pngRE.test(png)||png.length>120000)throw Error("Genesis source frame exceeds safe PNG limit");
   next[k]=png;
  }
  if(Object.keys(next).length>160)throw Error("Genesis master supports at most 160 edited native cells");
  if(JSON.stringify(next).length>3000000)throw Error("Genesis master pixel record limit is 3 MB");
  return next;
 }
 async function patchLayer(img,part,patches){
  const keys=Object.keys(patches).filter(k=>k.startsWith(part+"|"));
  if(!keys.length)return img;
  const output=blank(Cat().W,Cat().H),ctx=output.getContext("2d");
  ctx.drawImage(img,0,0);
  for(const k of keys){
   const fields=k.split("|");
   if(fields.length!==4)continue;
   const [,action,dir,f]=fields;
   let origin;try{origin=Cat().cellOrigin(action,dir,Number(f))}catch{continue}
   const patch=await loadImage(patches[k]);
   if(patch.naturalWidth!==64||patch.naturalHeight!==112)throw Error("Invalid Genesis pixel layer dimensions");
   ctx.clearRect(origin.x,origin.y,64,112);
   ctx.drawImage(patch,origin.x,origin.y);
  }
  return output;
 }
 async function decorateLayers(names,images,ch){
  const gender=ch.body==="female"?"female":"male",src=base(gender);
  const row=root.V6PCharacterStore?.get?.(ch.characterId);
  const isMaster=ch.characterId===src.sourceId;
  const derived=!!row&&row.origin==="base"&&row.gender===gender;
  if(!isMaster&&!derived)return images;
  const patches=profile(gender).pixelFrames||{};
  if(!Object.keys(patches).length)return images;
  return Promise.all(names.map(async(part,i)=>{
   if(!parts(gender).includes(part))return images[i];
   // Explicitly customized parts belong to that Character, not the master.
   if(derived&&row.parts?.[part]&&row.parts[part]!==src.parts?.[part])return images[i];
   return patchLayer(images[i],part,patches);
  }));
 }
 return Object.freeze({DIRS,parts,key,profile,preview,clearPreview,atlases,split,updatedFrames,decorateLayers});
});
