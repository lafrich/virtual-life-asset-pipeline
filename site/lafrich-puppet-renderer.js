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
   const base=master.layers?.[part]?.[dir];
   const custom=ch&&Cc.WEAR.includes(part)?ch.wear?.[part]?.[dir]:null;
   layers[part]=custom||base||"";
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
  if(!V)throw Error("V6B preview is unavailable (used only once to seed a new puppet)");
  const approved={...b.appearance,characterId:b.sourceId,face:"blank"};
  const atlas=await V.sheet(approved,null,"");
  if(!atlas)throw Error("V6B preview not ready: "+V.missing?.join(", "));
  const m=Cc.master(gender);
  for(const d of Cc.DIRS){
   const source=V.extractFrame(atlas,"idle",d,0);
   const dest=rgba(),ctx=dest.getContext("2d");ctx.drawImage(source,0,0);
   m.layers.body[d]=dest.toDataURL("image/png");
  }
  return Cc.validateMaster(m);
 }
 return Object.freeze({rgba,clearCache,resolveLayers,loadPng,prepare,partPath,transform,render,seedFromV6B});
});
