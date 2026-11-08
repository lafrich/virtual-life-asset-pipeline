/* Universal Genesis V6B motion renderer.
   Reads exactly the same physical V6P sprite layers used by native idle/walk.
   A motion never captures appearance: body/wear/face are read at render time.
   The canonical six-part mask is a transitional 2D pixel rig; source art remains untouched. */
(function(root,factory){"use strict";const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.V6PUniversalMotion=api;})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(root){"use strict";
const C=()=>root?.V6PUniversalMotionContract,V=()=>root?.V6PCompositor;
const FW=64,FH=112,cache=new Map();
function canvas(w=FW,h=FH){const c=document.createElement("canvas");c.width=w;c.height=h;return c}
function context(cv){const c=cv.getContext("2d",{willReadFrequently:true});c.imageSmoothingEnabled=false;return c}
function range(v,a,b){return Math.max(a,Math.min(b,v))}
function bounds(bytes){
 let l=FW,r=-1,t=FH,b=-1;
 for(let y=0;y<FH;y++)for(let x=0;x<FW;x++)if(bytes[(y*FW+x)*4+3]>95){
  l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
 }
 if(r<l)return {center:32,headEnd:43,hipStart:79,armLeft:23,armRight:41};
 const height=b-t,width=r-l+1,center=(l+r)/2;
 return {center,headEnd:t+height*.35,hipStart:t+height*.73,
  armLeft:center-Math.max(6,width*.25),armRight:center+Math.max(6,width*.25)};
}
function partAt(x,y,b){
 if(y<b.headEnd)return "head";
 if(y>=b.hipStart)return x<b.center?"leg_l":"leg_r";
 if(x<b.armLeft)return "arm_l";
 if(x>b.armRight)return "arm_r";
 return "torso";
}
function image(url){return new Promise(resolve=>{
 const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=url;
})}
function imageFrame(im,action,dir){
 const V6=V(),out=canvas(),g=context(out);
 g.drawImage(im,0,(V6.ROWS[action]+V6.DIRS.indexOf(dir))*FH,FW,FH,0,0,FW,FH);
 return g.getImageData(0,0,FW,FH);
}
function segment(img,geometry){
 const chunks=Object.fromEntries(C().PARTS.map(p=>[p,new Uint8ClampedArray(img.data.length)]));
 const present=new Set();
 for(let y=0;y<FH;y++)for(let x=0;x<FW;x++){
  const i=(y*FW+x)*4;if(!img.data[i+3])continue;
  const p=partAt(x,y,geometry),dest=chunks[p];
  dest[i]=img.data[i];dest[i+1]=img.data[i+1];dest[i+2]=img.data[i+2];dest[i+3]=img.data[i+3];
  present.add(p);
 }
 const parts={};
 for(const p of present){
  const cv=canvas();context(cv).putImageData(new ImageData(chunks[p],FW,FH),0,0);parts[p]=cv;
 }
 return parts;
}
function canonicalLook(raw){
 const v=V();if(!v||!C())throw Error("Genesis V6B renderer dependencies are missing");
 return v.norm(raw);
}
async function prepare(rawAppearance,sourceAction="idle",opts={}){
 const C6=C(),V6=V(),ch=canonicalLook(rawAppearance);
 if(!C6.SOURCE_ACTIONS.includes(sourceAction))throw Error("Unsupported Genesis source pose: "+sourceAction);
 const overridden=!!Object.keys(opts.partOverrides||{}).length;
 const key=JSON.stringify([ch,sourceAction,opts.sourceKey||"",overridden]);
 if(cache.has(key))return cache.get(key);
 const ready=(async()=>{
  const layers=V6.files(ch,"baked");
  const images={};
  for(const name of [...new Set([...layers,"base/shadow","base/fx"])]){
   const override=opts.partOverrides?.[name];
   images[name]=override?await image(override):await V6.img(name,ch.characterId);
   if(!images[name]&&name!=="base/shadow"&&name!=="base/fx")
    throw Error("Missing Genesis physical layer "+name+"; do not replace with baked composite");
  }
  const bodyName="base/body"+(ch.body==="female"?"_f":"");
  const directions={};
  for(const dir of C6.DIRS){
   const body=images[bodyName]?imageFrame(images[bodyName],sourceAction,dir):null;
   if(!body)throw Error("Missing canonical Genesis body "+bodyName);
   const geometry=bounds(body.data);
   const entries=[];
   for(const name of layers){
    const im=images[name];if(!im)continue;
    let raw=imageFrame(im,sourceAction,dir);
    // Native sheets contain palette keys. Custom Wear is authored in exact RGB.
    if(!/^(?:top|pants|shoes)\/custom(?:_back)?(?:_f)?$/.test(name))raw=V6.keysToDisplay(raw,ch);
    entries.push({name,parts:segment(raw,geometry)});
   }
   directions[dir]={entries,geometry,
    shadow:images["base/shadow"]?imageFrame(images["base/shadow"],sourceAction,dir):null,
    fx:images["base/fx"]?imageFrame(images["base/fx"],sourceAction,dir):null};
  }
  return {appearance:ch,sourceAction,directions,sourceKey:opts.sourceKey||ch.characterId||ch.body};
 })();
 cache.set(key,ready);
 try{return await ready}catch(error){cache.delete(key);throw error}
}
function drawPiece(g,piece,pose,p){
 if(!piece)return;
 const a=pose?.[p]||{},anchor=C().ANCHORS[p];
 const ax=Number.isFinite(a.ax)?a.ax:anchor[0],ay=Number.isFinite(a.ay)?a.ay:anchor[1];
 const x=Number.isFinite(a.x)?a.x:0,y=Number.isFinite(a.y)?a.y:0,angle=Number.isFinite(a.angle)?a.angle:0;
 g.save();g.translate(ax+x,ay+y);g.rotate(angle*Math.PI/180);
 g.drawImage(piece,-ax,-ay);g.restore();
}
function faceOverlay(g,img,dir,pose,index){
 if(!img?.complete||!img.naturalWidth||dir==="ne"||dir==="nw")return;
 const n=Math.max(1,Math.floor(img.naturalWidth/FW)),di=C().DIRS.indexOf(dir);
 const cv=canvas(),ctx=context(cv);
 ctx.drawImage(img,(index%n)*FW,di*FH,FW,FH,0,0,FW,FH);
 drawPiece(g,cv,pose,"head");
}
function renderPrepared(prepared,dir,pose,opts={}){
 const source=prepared?.directions?.[dir];
 if(!source)throw Error("Genesis prepared direction missing: "+dir);
 const output=canvas(),g=context(output);
 for(const item of source.entries)for(const p of C().PARTS)drawPiece(g,item.parts[p],pose,p);
 faceOverlay(g,opts.emosi,dir,pose,opts.frameIndex||0);
 if(source.shadow){
  const background=canvas();context(background).putImageData(source.shadow,0,0);
  g.save();g.globalCompositeOperation="destination-over";g.drawImage(background,0,0);g.restore();
 }
 if(source.fx){const fx=canvas();context(fx).putImageData(source.fx,0,0);g.drawImage(fx,0,0)}
 return output;
}
function hitTest(prepared,dir,pose,x,y){
 const source=prepared?.directions?.[dir];if(!source)return null;
 const xx=range(Math.floor(x),0,63),yy=range(Math.floor(y),0,111);
 for(const p of ["head","arm_r","arm_l","torso","leg_r","leg_l"]){
  const cv=canvas(),ctx=context(cv);
  for(const item of source.entries)drawPiece(ctx,item.parts[p],pose,p);
  if(ctx.getImageData(xx,yy,1,1).data[3]>24)return p;
 }
 return null;
}
function neutral(prepared,dir){return renderPrepared(prepared,dir,C().pose())}
async function render(appearance,manifest,index,dir,opts={}){
 const contract=C();contract.validateManifest(manifest);
 const prepared=await prepare(appearance,manifest.motion.sourceAction,opts);
 return renderPrepared(prepared,dir,manifest.motion.tracks[dir][index%manifest.frames.length],
  {...opts,frameIndex:index});
}
function clearCache(){cache.clear()}
return Object.freeze({prepare,render,renderPrepared,hitTest,neutral,clearCache,bounds,partAt,FW,FH});
});