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
 const cache=new Map(),pixelCache=new Map(),lowerCache=new Map();
 const LOWER_POSES=["stand","sit_chair","sit_floor","sit_long","crouch","kneel","lie_straight","lie_curl"];
 let manifestP=null;
 function lowerBase(){return root.LGR_LOWER_BASE||((root.LGRDB_BASE||"")+"media/lgr1/lower/")}
 function manifestUrl(){return root.LGR_LOWER_MANIFEST||((root.LGRDB_BASE||"")+"media/lgr1/lower-manifest.json")}
 function bodyId(gender,manifest){const b=(manifest&&manifest.bodies)||root.LGR_LOWER_BODIES;if(b){const g=gender==="female"?"female":"male";for(const k of Object.keys(b))if(k.startsWith(g))return k}
  return gender==="female"?"female9":"male8"}
 function outfitOf(ch){if(!ch?.wear?.pants)return "base";const p=String(ch.wear.pants.se||ch.wear.pants.sw||"");return /skirt_a/.test(p)?"skirt":"pants"}
 async function loadManifest(){
  if(manifestP)return manifestP;
  manifestP=(async()=>{try{const r=await fetch(manifestUrl(),{cache:"no-cache"});if(!r.ok)return null;return await r.json()}catch{return null}})();
  return manifestP;
 }
 async function loadLowerBank(dir,gender,outfit,recolor){
  const X=()=>root?.LGR1Raster,key=[dir,gender,outfit].join("|");
  if(lowerCache.has(key))return lowerCache.get(key);
  const p=(async()=>{
   const man=await loadManifest(),bank={},avail=new Set(),body=bodyId(gender,man);
   const poses=man&&man.poses?Object.keys(man.poses):LOWER_POSES;
   for(const pose of poses){
    const name=(X().lowerFileName||((a,b,c,d)=>"lgr1_lower_"+a+"_"+b+"_"+c+"_"+d+".png"))(pose,dir,body,outfit);
    try{
     const img=await loadPng(lowerBase()+name);
     const c=rgba(),ctx=c.getContext("2d",{willReadFrequently:true});ctx.drawImage(img,0,0);
     const data=new Uint8ClampedArray(ctx.getImageData(0,0,64,112).data);
     if(recolor)recolor(data);
     bank[pose]={img:data,bbox:X().bboxOf(data),scaled:null,pose};
     avail.add(pose);
    }catch{}
   }
   return {bank,avail,outfit,body};
  })();
  lowerCache.set(key,p);return p;
 }
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
 function clearCache(){cache.clear();pixelCache.clear();lowerCache.clear()}
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
 // W4 preview (LGR1Raster.setW4(true) + jointMode v4): tee_v4/trousers_v4 hidden under-strips (_under + _under_own)
 async function w4Opts(selected,gender,dir,opts){
  const W=root?.LGRWear,jm=opts?.jointMode??X().jointMode;
  if(!(X().W4&&jm==="v4"&&W&&W.w4On&&W.w4On())||opts?.w4===false)return {};
  const di=C().DIRS.indexOf(dir),under=[];
  const strip=url=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>rej(Error("W4 strip "+url));im.src=url});
  const cell=async name=>{const img=await strip(W.previewWearUrl(name,gender));const c=rgba(),g=c.getContext("2d",{willReadFrequently:true});
   g.drawImage(img,di*64,0,64,112,0,0,64,112);return new Uint8ClampedArray(g.getImageData(0,0,64,112).data)};
  const want=[];if(selected?.wear?.top)want.push(W.W4_WEAR.top);if(selected?.wear?.pants&&opts?.outfit!=="skirt")want.push(W.W4_WEAR.pants);
  for(const n of want){try{under.push({img:await cell(n+"_under"),own:await cell(n+"_under_own")})}catch{}}
  return {w4:true,under};
 }
 async function prepare(master,ch,dir,emosi=null,opts){
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
   order:m.drawOrders?.[dir],caps:m.capRadius,face:emosiCell(emosi,dir),
   jointMode:opts?.jointMode??X().jointMode,...(await w4Opts(selected,m.gender,dir,opts))});
  const outfit=opts?.outfit||outfitOf(selected),use=opts?.lowerSprites??X().LOWER_SPRITES;
  let lower=null;
  if(use) lower=await loadLowerBank(dir,m.gender,outfit,opts?.recolor);
  return {master:m,character:selected,dir,raster,order:raster.order,outfit,lower,postRecolor:raster.w4?opts?.recolor||null:null};
 }
 function render(prepared,pose,opts){
  const o=opts&&typeof opts==="object"?{...opts}:{};
  const use=o.lowerSprites??X().LOWER_SPRITES,canvasMode=o.canvas??X().CANVAS;
  let lower=o.lower||null,picked="rig";
  if(use&&!lower&&prepared.lower){
   picked=X().selectLower(pose||C().blankPose(),prepared.outfit,prepared.lower.avail);
   if(picked!=="rig")lower=prepared.lower.bank[picked]||null;
  }
  o.canvas=canvasMode;if(lower)o.lower=lower;
  const data=X().render(prepared.raster,pose||C().blankPose(),o);
  if(prepared.postRecolor)prepared.postRecolor(data); // W4 preview: wear stayed in key colours through the passes
  const g=X().canvasGeom(canvasMode),canvas=rgba(g.cw,g.ch);
  canvas.getContext("2d").putImageData(new ImageData(data,g.cw,g.ch),0,0);
  canvas.dataset.lower=lower?picked||lower.pose||"sprite":"rig";
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
 function neckRowOf(data){
  // narrowest visible row between the skull and the shoulders (y 46..57)
  let best=99,at=50;
  for(let y=46;y<=57;y++){let w=0;for(let x=0;x<64;x++)if(data[(y*64+x)*4+3])w++;if(w>0&&w<best){best=w;at=y}}
  return at;
 }
 function wholeBackHead(front,back){
  // The V6B rear skull is drawn by the HAIR layer, so the bald NE/NW body only
  // had the back neck plus whatever repairBackHead filled in: a half head with
  // the neck lines running up into the skull. Use the WHOLE matching front head
  // instead (SE→NE, SW→NW, same screen orientation): every row above the back
  // view's narrowest neck row is replaced by the front view's row (pixels and
  // transparency); the back neck and everything below stay as they are.
  const out=new Uint8ClampedArray(back),ny=neckRowOf(back);let changed=0;
  for(let k=0;k<ny*64;k++){const o=k*4;
   if(out[o]!==front[o]||out[o+1]!==front[o+1]||out[o+2]!==front[o+2]||out[o+3]!==front[o+3]){
    out[o]=front[o];out[o+1]=front[o+1];out[o+2]=front[o+2];out[o+3]=front[o+3];changed++}}
  return {data:out,changed,neckRow:ny};
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
    if(raw.body[front]&&raw.body[back]){
     // fill the bald skull first so the back NECK row (not the skull gap) is found,
     // then take the whole front head above it (same result as the 01 button)
     let b=raw.body[back];if(headRows(b)<40)b=repairBackHead(raw.body[front],b).data;
     raw.body[back]=wholeBackHead(raw.body[front],b).data;
    }
   }
  }
  for(const d of Cc.DIRS)removeFloaters(Object.keys(raw).map(l=>raw[l][d]));
  // Shape-based slices: head = skull+chin+neck down to the shoulder line,
  // empty canvas belongs to no part.
  for(const d of Cc.DIRS){
   const comp=new Uint8ClampedArray(Cc.N*4);
   for(const l of Cc.LAYERS){const px=raw[l]?.[d];if(px)for(let k=0;k<Cc.N;k++)if(px[k*4+3])comp.set(px.subarray(k*4,k*4+4),k*4)}
   const sl=Cc.shapeSlice(comp,d);
   m.masks[d]=Cc.encode(sl.mask);m.pivots[d].head=sl.headPivot;
   m.pivots[d].torso=sl.torsoPivot;m.pivots[d].pelvis=sl.pelvisPivot;
  }
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
  repairBackHead,wholeBackHead,neckRowOf,removeFloaters,headRows,partPath});
});
