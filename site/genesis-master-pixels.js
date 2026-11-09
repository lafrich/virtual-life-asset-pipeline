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
 const M=()=>root.GenesisMasterRig,V=()=>root.V6PCompositor,Cat=()=>root.V6PPartCatalog,T=()=>root.GenesisAppearanceTransfer;
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
 function appearanceKey(part,dir){
  if(!Cat()?.isPart(part)||!DIRS.includes(dir))throw Error("Invalid Genesis appearance view");
  return part+"|"+dir;
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
 async function transferCell(originalImage,part,action,dir,frame,row){
  const native=cell(originalImage,action,dir,frame),png=row.appearanceMaster?.[appearanceKey(part,dir)];
  if(!png)return native;
  const before=cell(originalImage,"idle",dir,0);
  const edited=await loadImage(png);
  if(edited.naturalWidth!==64||edited.naturalHeight!==112)
   throw Error("Master Appearance must be exactly 64×112");
  const baseline=before.getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112);
  const desired=blank(64,112),g=desired.getContext("2d",{willReadFrequently:true});
  g.drawImage(edited,0,0);
  const master=g.getImageData(0,0,64,112);
  const target=native.getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112);
  const result=T().transfer(baseline.data,master.data,target.data);
  const out=blank(64,112);
  out.getContext("2d").putImageData(new ImageData(result.pixels,64,112),0,0);
  return out;
 }
 async function atlases(gender,part,action,frame,row,{master=false}={}){
  if(!parts(gender).includes(part))throw Error("Part is not in the active Genesis master");
  const src=base(gender),model=row||profile(gender);
  const originalImage=await V().img(part,src.sourceId);
  if(!originalImage)throw Error("Original Genesis part unavailable: "+part);
  const clean=blank(64,448),edited=blank(64,448);
  const g=clean.getContext("2d"),h=edited.getContext("2d");
  const nativeOriginal={};
  for(let i=0;i<DIRS.length;i++){
   const dir=DIRS[i],native=master?cell(originalImage,"idle",dir,0):
    await transferCell(originalImage,part,action,dir,frame,model);
   nativeOriginal[dir]=native;
   const shown=nativeToDisplay(native,gender,part);
   g.drawImage(shown,0,i*112);
   const data=master?model.appearanceMaster?.[appearanceKey(part,dir)]:
    model.pixelFrames?.[key(part,action,dir,frame)];
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
 function updatedAppearance(gender,part,atlas,sourceAtlas,row,nativeOriginal){
  if(!parts(gender).includes(part))throw Error("Part is not in approved Genesis source");
  const next={...((row||profile(gender)).appearanceMaster||{})};
  for(let i=0;i<DIRS.length;i++){
   const dir=DIRS[i],k=appearanceKey(part,dir),current=split(atlas,i),original=split(sourceAtlas,i);
   if(same(current,original)){delete next[k];continue}
   const native=displayToNative(current,nativeOriginal[dir],gender,part);
   const png=native.toDataURL("image/png");
   if(!pngRE.test(png)||png.length>120000)throw Error("Master Appearance PNG exceeds safe limit");
   next[k]=png;
  }
  if(Object.keys(next).length>80||JSON.stringify(next).length>2000000)
   throw Error("Genesis 4 View appearance exceeds master limit");
  return next;
 }
 async function patchLayer(img,part,model){
  const patches=model.pixelFrames||{},masters=model.appearanceMaster||{};
  const editKeys=Object.keys(patches).filter(k=>k.startsWith(part+"|"));
  const directions=DIRS.filter(d=>masters[appearanceKey(part,d)]);
  if(!editKeys.length&&!directions.length)return img;
  const output=blank(Cat().W,Cat().H),ctx=output.getContext("2d",{willReadFrequently:true});
  ctx.drawImage(img,0,0);
  // A view-specific appearance delta is retargeted against EACH original
  // native action frame. This preserves walk/sit/lie geometry and motion.
  for(const dir of directions){
   const original=cell(img,"idle",dir,0),png=masters[appearanceKey(part,dir)];
   const desired=await loadImage(png);
   if(desired.naturalWidth!==64||desired.naturalHeight!==112)
    throw Error("Genesis Master Appearance source must be 64×112");
   const before=original.getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112).data;
   const appearance=blank(64,112),g=appearance.getContext("2d",{willReadFrequently:true});
   g.drawImage(desired,0,0);
   const after=g.getImageData(0,0,64,112).data;
   if(!T())throw Error("Genesis Appearance retarget library not loaded");
   for(const action of Cat().ACTIONS){
    for(let f=0;f<Cat().FRAMES[action];f++){
     const o=Cat().cellOrigin(action,dir,f),raw=ctx.getImageData(o.x,o.y,64,112);
     const result=T().transfer(before,after,raw.data);
     if(!result.matched)continue;
     ctx.putImageData(new ImageData(result.pixels,64,112),o.x,o.y);
    }
   }
  }
  // Exact per-frame corrections ALWAYS win after inherited appearance.
  for(const k of editKeys){
   const fields=k.split("|");
   if(fields.length!==4)continue;
   const [,action,dir,f]=fields;
   let origin;try{origin=Cat().cellOrigin(action,dir,Number(f))}catch{continue}
   const patch=await loadImage(patches[k]);
   if(patch.naturalWidth!==64||patch.naturalHeight!==112)
    throw Error("Invalid Genesis frame correction dimensions");
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
  const model=profile(gender);
  if(!Object.keys(model.pixelFrames||{}).length&&!Object.keys(model.appearanceMaster||{}).length)return images;
  return Promise.all(names.map(async(part,i)=>{
   if(!parts(gender).includes(part))return images[i];
   // Explicitly customized parts belong to that Character, not the master.
   if(derived&&row.parts?.[part]&&row.parts[part]!==src.parts?.[part])return images[i];
   return patchLayer(images[i],part,model);
  }));
 }
 return Object.freeze({DIRS,parts,key,appearanceKey,profile,preview,clearPreview,atlases,split,updatedFrames,updatedAppearance,transferCell,decorateLayers});
});
