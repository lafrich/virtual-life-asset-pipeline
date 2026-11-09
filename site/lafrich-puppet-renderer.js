/* Lafrich Puppet runtime — native 64×112 x four views and a hierarchical
 * 10-piece body. All physical source layers, including wear, are cut by the
 * same per-view authored mask and follow shoulder/elbow + hip/knee chains.
 * Emosi is composited LAST, transformed with the head and never baked into art.
 */
(function(root,factory){"use strict";const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.LafrichPuppetRenderer=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(root){
 "use strict";
 const C=()=>root?.LafrichPuppetCore;
 const rgba=(w=64,h=112)=>{const cv=document.createElement("canvas");cv.width=w;cv.height=h;return cv};
 const cache=new Map();
 function loadPng(data){
  if(!data)return Promise.resolve(null);
  if(cache.has(data))return cache.get(data);
  const promise=new Promise((resolve,reject)=>{
   const img=new Image();
   img.onload=()=>{
    if(img.naturalWidth!==64||img.naturalHeight!==112){reject(Error("Lafrich Puppet PNG must be 64×112"));return}
    resolve(img);
   };img.onerror=()=>reject(Error("Invalid Lafrich Puppet layer PNG"));img.src=data;
  });
  cache.set(data,promise);return promise;
 }
 function clearCache(){cache.clear()}
 function resolveLayers(master,ch,dir){
  const Cc=C(),layers={};
  for(const part of Cc.LAYERS){
   // Only anatomical source belongs to Lafrich Master. Legacy saved master
   // wear bytes are preserved in the record for recovery, but never rendered.
   // Every garment, hairstyle and accessory is now Character-owned.
   layers[part]=Cc.WEAR.includes(part)?
    (ch?.wear?.[part]?.[dir]||""):(master.layers?.[part]?.[dir]||"");
  }
  return layers;
 }
 async function prepare(master,ch,dir,emosi=null){
  const Cc=C(),m=Cc.validateMaster(master);
  const selected=ch?Cc.validateCharacter(ch):null;
  if(selected&&selected.gender!==m.gender)throw Error("Custom Wear body differs from Lafrich master");
  if(!Cc.DIRS.includes(dir))throw Error("Unknown 4-view direction");
  const source=resolveLayers(m,selected,dir),mask=Cc.decode(m.masks[dir]);
  const pieces={},unselected={};
  for(const part of Cc.PARTS)pieces[part]=[];
  for(const layer of Cc.LAYERS){
   const img=await loadPng(source[layer]);
   if(!img)continue;
   const raw=rgba(),ctx=raw.getContext("2d",{willReadFrequently:true});
   ctx.drawImage(img,0,0);
   const pixels=ctx.getImageData(0,0,64,112).data;
   const bins=Cc.PARTS.map(()=>new Uint8ClampedArray(pixels.length));
   const idle=new Uint8ClampedArray(pixels.length);
   for(let i=0;i<mask.length;i++){
    const off=i*4;if(!pixels[off+3])continue;
    const owner=mask[i];
    (owner===255?idle:bins[owner]).set(pixels.subarray(off,off+4),off);
   }
   for(let j=0;j<Cc.PARTS.length;j++){
    const cv=rgba();cv.getContext("2d").putImageData(new ImageData(bins[j],64,112),0,0);
    pieces[Cc.PARTS[j]].push(cv);
   }
   const still=rgba();still.getContext("2d").putImageData(new ImageData(idle,64,112),0,0);
   unselected[layer]=still;
  }
  return {master:m,character:selected,dir,pieces,unselected,emosi};
 }
 function partPath(part,Cc){
  const nodes=[];let p=part;let guard=0;
  while(p&&guard++<Cc.PARTS.length){nodes.unshift(p);p=Cc.PARENTS[p]}
  if(guard>Cc.PARTS.length+1)throw Error("Invalid parent graph");
  return nodes;
 }
 function transform(ctx,prepared,pose,part){
  const Cc=C(),node=pose||Cc.blankPose(),lineage=partPath(part,Cc);
  for(const p of lineage){
   const pivot=prepared.master.pivots[prepared.dir][p];
   const v=node[p]||{x:0,y:0,a:0};
   ctx.translate(v.x,v.y);
   ctx.translate(pivot.x,pivot.y);ctx.rotate(v.a*Math.PI/180);
   ctx.translate(-pivot.x,-pivot.y);
  }
 }
 function render(prepared,pose,frame=0){
  const Cc=C(),canvas=rgba(),ctx=canvas.getContext("2d");
  ctx.imageSmoothingEnabled=false;
  // Stationary/unselected mask pixels are drawn as the original art.
  for(const layer of Cc.LAYERS)if(prepared.unselected[layer])ctx.drawImage(prepared.unselected[layer],0,0);
  for(const p of Cc.DRAW_ORDER){
   ctx.save();transform(ctx,prepared,pose,p);
   for(const part of prepared.pieces[p]||[])ctx.drawImage(part,0,0);
   ctx.restore();
  }
  const emosi=prepared.emosi;
  if(emosi?.complete&&emosi.naturalWidth&&["se","sw"].includes(prepared.dir)){
   const di=Cc.DIRS.indexOf(prepared.dir),n=Math.max(1,Math.round(emosi.naturalWidth/64)),f=frame%n;
   ctx.save();transform(ctx,prepared,pose,"head");
   ctx.drawImage(emosi,f*64,di*112,64,112,0,0,64,112);
   ctx.restore();
  }
  return canvas;
 }
 function seededPreviewSource(gender){
  const Cc=C();
  const b=root?.VLGenesisSource?.bases?.["genesis_"+gender+"_nude"];
  if(!b)throw Error("The approved V6B "+gender+" seed is unavailable");
  return b;
 }
 async function seedFromV6B(gender){
  const V=root?.V6PCompositor,Cc=C(),b=seededPreviewSource(gender);
  if(!V)throw Error("V6B nude pixel source unavailable");
  const approved={...b.appearance,characterId:b.sourceId,face:"blank"};
  const suffix=gender==="female"?"_f":"";
  // V6B's base/body is NOT the entire body. Original naked anatomy is
  // distributed over nude top, nude pants, and nude feet atlases. These are
  // anatomical pixels, not outfit/Custom Wear. Preserve original draw order.
  const sources=[
   ["base/body"+suffix,"body"],
   ["top/nude_back"+suffix,"body"],
   ["shoes/nude"+suffix,"body"],
   ["pants/nude"+suffix,"body"],
   ["top/nude"+suffix,"body"],
   ["base/body_front"+suffix,"body_front"]
  ];
  const images=[];
  for(const [part,layer] of sources){
   const sheet=await V.img(part,part.startsWith("base/")?b.sourceId:null);
   if(!sheet)throw Error("Required native nude anatomy atlas missing: "+part);
   images.push({part,layer,sheet});
  }
  const m=Cc.master(gender);
  for(const d of Cc.DIRS){
   const canvases={body:rgba(),body_front:rgba()};
   for(const {sheet,layer} of images){
    const frame=V.extractFrame(sheet,"idle",d,0);
    const raw=frame.getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112);
    const display=rgba();
    display.getContext("2d").putImageData(V.keysToDisplay(raw,approved),0,0);
    canvases[layer].getContext("2d").drawImage(display,0,0);
   }
   for(const [layer,cv] of Object.entries(canvases))
    m.layers[layer][d]=cv.toDataURL("image/png");
  }
  return Cc.validateMaster(m);
 }
 function coverage(pixels,upper,lower){
  let count=0;
  for(let y=upper;y<lower;y++)for(let x=12;x<52;x++)
   if(pixels[(y*64+x)*4+3]>0)count++;
  return count;
 }
 async function repairIncompleteBody(master){
  const Cc=C(),validated=Cc.validateMaster(master);
  // Repair only the legacy head-only/missing-torso seed. Do NOT replace a
  // substantially populated hand-edited body, its rig, wear, masks or pivots.
  const reference=await seedFromV6B(validated.gender);
  const next=Cc.clone(validated),repaired=[];
  for(const d of Cc.DIRS){
   const getPixels=async(data)=>{
    const cv=rgba(),ctx=cv.getContext("2d",{willReadFrequently:true});
    const im=await loadPng(data);if(im)ctx.drawImage(im,0,0);
    return {cv,ctx,data:ctx.getImageData(0,0,64,112).data};
   };
   const original=await getPixels(validated.layers.body[d]);
   const front=await getPixels(validated.layers.body_front[d]);
   const nude=await getPixels(reference.layers.body[d]);
   const nudeFront=await getPixels(reference.layers.body_front[d]);
   const merged=rgba(),g=merged.getContext("2d",{willReadFrequently:true});
   g.drawImage(original.cv,0,0);g.drawImage(front.cv,0,0);
   const visible=g.getImageData(0,0,64,112).data;
   const ref=rgba(),f=ref.getContext("2d",{willReadFrequently:true});
   f.drawImage(nude.cv,0,0);f.drawImage(nudeFront.cv,0,0);
   const refPixels=f.getImageData(0,0,64,112).data;
   const missingTorso=coverage(refPixels,52,81)>40&&
    coverage(visible,52,81)<coverage(refPixels,52,81)*0.45;
   const missingLegs=coverage(refPixels,81,111)>40&&
    coverage(visible,81,111)<coverage(refPixels,81,111)*0.45;
   if(!missingTorso&&!missingLegs)continue;
   // Fill transparent anatomy ONLY, preserving all visible user pixels and
   // all stored non-body layers. Do not auto-save this reversible repair.
   const fill=rgba(),fillCtx=fill.getContext("2d");
   fillCtx.drawImage(nude.cv,0,0);
   fillCtx.globalCompositeOperation="source-over";
   fillCtx.drawImage(original.cv,0,0);
   next.layers.body[d]=fill.toDataURL("image/png");
   if(!validated.layers.body_front[d])
    next.layers.body_front[d]=reference.layers.body_front[d];
   repaired.push(d);
  }
  return {master:Cc.validateMaster(next),repaired};
 }
 return Object.freeze({rgba,clearCache,resolveLayers,loadPng,prepare,partPath,transform,render,seedFromV6B,repairIncompleteBody});
});
