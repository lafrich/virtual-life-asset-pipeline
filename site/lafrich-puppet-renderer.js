/* LGR-1 browser renderer — decodes 64×112 PNG layers and delegates every pixel
 * to the shared deterministic rasterizer (lgr1-raster.js), which is mirrored
 * line-for-line by genesis_procedural_runtime.py (0-pixel parity tests).
 * All physical layers are cut by the same per-view mask; Custom Wear inherits
 * that mask (pixels outside the body outline follow the nearest part).
 * Emosi is drawn with the head transform BEFORE front hair, never baked.
 */
(function(root,factory){"use strict";const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.LafrichPuppetRenderer=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(root){
 "use strict";
 const C=()=>root?.LafrichPuppetCore,X=()=>root?.LGR1Raster;
 const rgba=(w=64,h=112)=>{const cv=document.createElement("canvas");cv.width=w;cv.height=h;return cv};
 const cache=new Map(),pixelCache=new Map();
 function loadPng(data){
  if(!data)return Promise.resolve(null);
  if(cache.has(data))return cache.get(data);
  const promise=new Promise((resolve,reject)=>{
   const img=new Image();
   img.onload=()=>{
    if(img.naturalWidth!==64||img.naturalHeight!==112){reject(Error("LGR-1 layer PNG must be 64×112"));return}
    resolve(img);
   };img.onerror=()=>reject(Error("Invalid LGR-1 layer PNG"));img.src=data;
  });
  cache.set(data,promise);return promise;
 }
 function clearCache(){cache.clear();pixelCache.clear()}
 async function pixels(data){
  if(!data)return null;
  if(pixelCache.has(data))return pixelCache.get(data);
  const img=await loadPng(data);if(!img)return null;
  const c=rgba(),ctx=c.getContext("2d",{willReadFrequently:true});
  ctx.drawImage(img,0,0);
  const out=new Uint8ClampedArray(ctx.getImageData(0,0,64,112).data);
  pixelCache.set(data,out);return out;
 }
 function resolveLayers(master,ch,dir){
  const Cc=C(),layers={};
  for(const part of Cc.LAYERS){
   const base=master.layers?.[part]?.[dir];
   const custom=ch&&Cc.WEAR.includes(part)?ch.wear?.[part]?.[dir]:null;
   layers[part]=custom||base||"";
  }
  return layers;
 }
 function emosiCell(emosi,dir){
  // Emosi atlases are four 112-px rows (SE, SW, NE, NW); faces exist for SE/SW.
  if(!emosi?.complete||!emosi.naturalWidth||!["se","sw"].includes(dir))return null;
  const di=C().DIRS.indexOf(dir),c=rgba(),ctx=c.getContext("2d",{willReadFrequently:true});
  ctx.drawImage(emosi,0,di*112,64,112,0,0,64,112);
  return new Uint8ClampedArray(ctx.getImageData(0,0,64,112).data);
 }
 async function prepare(master,ch,dir,emosi=null){
  const Cc=C(),m=Cc.validateMaster(master);
  const selected=ch?Cc.validateCharacter(ch):null;
  if(selected&&selected.gender!==m.gender)throw Error("Custom Wear body differs from LGR-1 master");
  if(!Cc.DIRS.includes(dir))throw Error("Unknown 4-view direction");
  const layers={},wear={};
  for(const layer of Cc.LAYERS){
   const own=await pixels(m.layers?.[layer]?.[dir]);if(own)layers[layer]=own;
   const custom=selected&&Cc.WEAR.includes(layer)?selected.wear?.[layer]?.[dir]:null;
   if(custom)wear[layer]=await pixels(custom);
  }
  const t=selected?.maskTweaks?.[dir];
  const tweak=t?Uint8Array.from(atob(t),c=>c.charCodeAt(0)):null;
  const raster=X().prepare({layers,wear,tweak,mask:Cc.decode(m.masks[dir]),
   pivots:m.pivots[dir],placements:m.placements?.[dir]||{},
   order:m.drawOrders?.[dir],caps:m.capRadius,face:emosiCell(emosi,dir)});
  return {master:m,character:selected,dir,raster,order:raster.order};
 }
 function render(prepared,pose,opts){
  const data=X().render(prepared.raster,pose||C().blankPose(),opts&&typeof opts==="object"?opts:undefined);
  const canvas=rgba();canvas.getContext("2d").putImageData(new ImageData(data,64,112),0,0);
  return canvas;
 }
 function seededPreviewSource(gender){
  const b=root?.VLGenesisSource?.bases?.["genesis_"+gender+"_nude"];
  if(!b)throw Error("The approved V6B "+gender+" seed is unavailable");
  return b;
 }
 function headRows(data){let n=0;for(let y=0;y<46;y++)for(let x=0;x<64;x++)if(data[(y*64+x)*4+3])n++;return n}
 function repairBackHead(front,back){
  // V6B paints the rear skull with the HAIR layer; the frozen bald Genesis has
  // none, so NE/NW were headless. Rebuild the bald skull from the matching
  // front view (SE→NE, SW→NW): only transparent pixels above the neck are
  // filled; nothing already painted is changed.
  const out=new Uint8ClampedArray(back);let added=0;
  for(let y=0;y<50;y++)for(let x=0;x<64;x++){
   const o=(y*64+x)*4;
   if(out[o+3]||!front[o+3])continue;
   out[o]=front[o];out[o+1]=front[o+1];out[o+2]=front[o+2];out[o+3]=front[o+3];added++;
  }
  return {data:out,added};
 }
 function removeFloaters(layerData,maxSize=3){
  // Drop tiny 8-connected islands that touch nothing else in the composite.
  const N=64*112,alpha=new Uint8Array(N);
  for(const d of layerData)if(d)for(let k=0;k<N;k++)if(d[k*4+3])alpha[k]=1;
  const seen=new Uint8Array(N),drop=[];
  for(let s=0;s<N;s++){
   if(!alpha[s]||seen[s])continue;
   const q=[s];seen[s]=1;
   for(let i=0;i<q.length;i++){const k=q[i],x=k%64,y=(k-x)/64;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;
     if((dx||dy)&&nx>=0&&nx<64&&ny>=0&&ny<112){const n=ny*64+nx;if(alpha[n]&&!seen[n]){seen[n]=1;q.push(n)}}}}
   if(q.length<=maxSize)drop.push(...q);
  }
  for(const d of layerData)if(d)for(const k of drop)d.fill(0,k*4,k*4+4);
  return drop.length;
 }
 async function seedFromV6B(gender){
  const V=root?.V6PCompositor,Cc=C(),b=seededPreviewSource(gender);
  if(!V)throw Error("V6B preview unavailable (used once only for visual seed)");
  const approved={...b.appearance,characterId:b.sourceId,face:"blank"};
  const f=gender==="female"?"_f":"";
  const sources={
   body:"base/body"+f,body_front:"base/body_front"+f,
   top:"top/custom"+f,top_back:"top/custom_back"+f,
   pants:"pants/custom"+f,shoes:"shoes/custom"+f
  };
  const m=Cc.master(gender),raw={};
  let count=0;
  for(const [layer,source] of Object.entries(sources)){
   const atlas=await V.img(source,b.sourceId);
   if(!atlas)continue;
   raw[layer]={};
   for(const d of Cc.DIRS){
    const frame=V.extractFrame(atlas,"idle",d,0);
    const im=frame.getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112);
    raw[layer][d]=new Uint8ClampedArray((source.startsWith("base/")?V.keysToDisplay(im,approved):im).data);
   }
   count++;
  }
  if(count<3){
   const atlas=await V.sheet(approved,null,"");
   if(!atlas)throw Error("V6B source art missing: "+(V.missing||[]).join(", "));
   raw.body={};
   for(const d of Cc.DIRS){
    const out=V.extractFrame(atlas,"idle",d,0);
    raw.body[d]=new Uint8ClampedArray(out.getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112).data);
   }
  }
  if(raw.body){
   for(const [front,back] of [["se","ne"],["sw","nw"]]){
    if(raw.body[front]&&raw.body[back]&&headRows(raw.body[back])<40)
     raw.body[back]=repairBackHead(raw.body[front],raw.body[back]).data;
   }
  }
  for(const d of Cc.DIRS)removeFloaters(Object.keys(raw).map(l=>raw[l][d]));
  for(const layer of Object.keys(raw))for(const d of Cc.DIRS){
   const c=rgba();c.getContext("2d").putImageData(new ImageData(raw[layer][d],64,112),0,0);
   m.layers[layer][d]=c.toDataURL("image/png");
  }
  return Cc.validateMaster(m);
 }
 function partPath(part,Cc=C()){
  const out=[];let node=part;
  while(node){out.unshift(node);node=Cc.PARENTS[node]}
  return out;
 }
 return Object.freeze({rgba,clearCache,resolveLayers,loadPng,pixels,prepare,render,seedFromV6B,
  repairBackHead,removeFloaters,headRows,partPath});
});
