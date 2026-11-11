/* LGR-1 ACTOR — draws one character (official Male/Female base + skin tone +
 * outfit + hair + Emosi face) in any LGR-1 motion frame. Shared by Mahluk
 * Hidup Bergerak / Beraksi and usable by the game apps.
 *  - base:  media/lgr1/base/index.json → genesis-base-<g>.json (checksum
 *           verified, skin stored as KEY colours → swapped to the tone here)
 *  - wear:  lgr-wear.js strips (media/lgr1/mh-wear), bound through the LGR-1
 *           mask rules in LGR1Raster (outfit → nearest part, hair → head)
 *  - face:  Emosi.exe atlas column (animated by frame), drawn by the
 *           renderer under front hair; SE/SW only (hidden in back views)
 * Needs: lafrich-puppet-core.js, lgr1-raster.js, lafrich-puppet-renderer.js,
 * lgr1-motion.js, lgr-skin.js, lgr-wear.js (wear). No V6P runtime.
 */
(function(root){"use strict";
const C=()=>root.LafrichPuppetCore,R=()=>root.LafrichPuppetRenderer,M=()=>root.LGR1Motion,SK=()=>root.LGRSkin,X=()=>root.LGR1Raster;
const FOOT=Object.freeze({x:32,y:101});
const OUTFITS=Object.freeze({
 none:{label:"Tanpa baju (base)"},
 tee_trousers:{label:"Kaos + celana + sneakers",top:"tee",pants:"trousers",shoes:"sneakers",topColor:"red",pantsColor:"denim",shoesColor:"white"},
 shirt_tie_baggy:{label:"Kemeja dasi + baggy + sepatu",top:"shirt_tie",pants:"baggy",shoes:"shoes",topColor:"white",pantsColor:"khaki",shoesColor:"black"},
 cardigan_ripped:{label:"Cardigan + celana sobek + sneakers",top:"cardigan",pants:"trousers_ripped",shoes:"sneakers",topColor:"mustard",pantsColor:"night",shoesColor:"red"},
 custom:{label:"Atur sendiri…"}
});
const HAIRS=Object.freeze(["none","short","swept","mid_curtain","mid","wavy","wavy_curtain","long","long_curtain"]);
let basesP=null,motionsP=null;
const masters={},prepCache=new Map(),frameCache=new Map(),wearCache=new Map(),faceCache=new Map();
const rel=p=>(root.LGRDB_BASE||"")+p;
async function sha256(s){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return Array.from(new Uint8Array(d),b=>b.toString(16).padStart(2,"0")).join("")}
function loadBases(){
 if(basesP)return basesP;
 basesP=(async()=>{
  const index=await(await fetch(rel("media/lgr1/base/index.json"),{cache:"no-cache"})).json(),out={};
  for(const g of ["male","female"]){
   const info=index.bases[g],pkg=await(await fetch(rel("media/lgr1/base/"+info.package),{cache:"no-cache"})).json();
   if(pkg.format!=="lafrich-genesis-base-v1"||pkg.gender!==g)throw Error("Official base "+g+" invalid");
   if(await sha256(JSON.stringify(pkg.rig))!==pkg.rigSha256)throw Error("Official base "+g+" checksum mismatch");
   out[g]={pkg,version:index.version};
  }
  return out;
 })();
 basesP.catch(()=>{basesP=null});
 return basesP;
}
async function swapLayers(rig,ramp){
 const out={...rig,layers:{}};
 for(const [L,v] of Object.entries(rig.layers||{})){
  out.layers[L]={};
  for(const [d,url] of Object.entries(v||{})){
   if(!url){out.layers[L][d]=url;continue}
   const im=new Image();im.src=url;await im.decode();
   const c=document.createElement("canvas");c.width=64;c.height=112;const g=c.getContext("2d",{willReadFrequently:true});
   g.drawImage(im,0,0);const data=g.getImageData(0,0,64,112);
   if(SK().fromKey(data.data,ramp)){g.putImageData(data,0,0);out.layers[L][d]=c.toDataURL("image/png")}else out.layers[L][d]=url;
  }
 }
 return out;
}
async function master(gender,tone){
 const key=gender+"|"+tone;if(masters[key])return masters[key];
 masters[key]=(async()=>{
  const b=(await loadBases())[gender];
  const rig=await swapLayers(b.pkg.rig,SK().rampFor(SK().TONES[tone]?tone:"light"));
  return C().validateMaster(rig); // keeps drawOrders / sides / capRadius
 })();
 masters[key].catch(()=>{delete masters[key]});
 return masters[key];
}
function wearSpec(actor){
 const o=OUTFITS[actor.outfit]||OUTFITS.none,w=actor.wear||{};
 const s=actor.outfit==="custom"?{...w}:{top:o.top,pants:o.pants,shoes:o.shoes,topColor:o.topColor,pantsColor:o.pantsColor,shoesColor:o.shoesColor};
 if(w.hair&&w.hair!=="none"){s.hair=w.hair;s.hairColor=w.hairColor||"black"}
 for(const k of Object.keys(s))if(!s[k]||s[k]==="nude"||s[k]==="none")delete s[k];
 return Object.keys(s).some(k=>["top","pants","shoes","hair"].includes(k))?s:null;
}
async function wear(gender,tone,spec){
 if(!spec)return null;
 const key=gender+"|"+tone+"|"+JSON.stringify(spec);if(wearCache.has(key))return wearCache.get(key);
 const p=(async()=>{
  const W=root.LGRWear;if(!W)throw Error("Baju butuh lgr-wear.js");
  const out=await W.layers(spec,gender,SK().TONES[tone]?tone:"light");
  return C().validateCharacter({format:C().CHARACTER,id:"lgr_actor",name:"actor",gender,wear:out,faceId:""});
 })();
 wearCache.set(key,p);p.catch(()=>wearCache.delete(key));return p;
}
/* Emosi faces: entries from VLMahlukEmosiBridge ({id, overlay atlas, frames, frame_ms}) */
let faces=[],facesP=null,faceRevision=0;
function refreshFaces(){
 facesP=(async()=>{
  const b=root.VLMahlukEmosiBridge;if(!b)return [];
  try{await b.refresh()}catch{}
  const list=[];
  for(const g of ["male","female"]){const a={gender:g,template_category:"human",id:"genesis_"+g+"_nude",expressions:[]};b.apply(a);
   for(const e of a.expressions)if(e.source==="emosi"&&e.overlay&&!list.some(x=>x.id===e.id))list.push({...e,genders:[g]});
   else if(e.source==="emosi"){const x=list.find(y=>y.id===e.id);if(x&&!x.genders.includes(g))x.genders.push(g)}}
  if(JSON.stringify(list)!==JSON.stringify(faces)){
   faceRevision++;faceCache.clear();prepCache.clear();
  }
  faces=list;return list;
 })();
 return facesP;
}
function facesFor(gender){return faces.filter(f=>!f.genders||f.genders.includes(gender))}
async function faceImage(faceId,localMs){
 const f=faces.find(x=>x.id===faceId);if(!f)return null;
 const frames=Math.max(1,Number(f.frames)||1),ms=Number(f.frame_ms?.[0])||160;
 const i=Math.floor(Math.max(0,localMs||0)/ms)%frames,key=faceId+"#"+faceRevision+"#"+i;
 if(faceCache.has(key))return faceCache.get(key);
 const p=(async()=>{
  const atlas=new Image();atlas.src=f.overlay;await atlas.decode();
  const c=document.createElement("canvas");c.width=64;c.height=448;c.getContext("2d").drawImage(atlas,i*64,0,64,448,0,0,64,448);
  const im=new Image();im.src=c.toDataURL("image/png");await im.decode();return {img:im,key};
 })();
 faceCache.set(key,p);p.catch(()=>faceCache.delete(key));return p;
}
/* motion library */
function motions(){
 if(!motionsP){motionsP=(async()=>M().validateLibrary(await(await fetch(rel("media/lgr1/motions.json"),{cache:"no-cache"})).json()))();motionsP.catch(()=>{motionsP=null})}
 return motionsP;
}
function baseOrder(m,d){const o=m.drawOrders?.[d];return Array.isArray(o)&&o.length===C().PARTS.length?o.slice():C().DRAW_ORDER.slice()}
// → screen pose + order for one frame of a motion (motion may be null = rest pose)
function poseOf(m,lib,motion,frame,d){
 const sides=M().sidesOf(m);
 if(!motion)return {pose:C().blankPose(),order:baseOrder(m,d)};
 const pose=Object.assign(C().blankPose(),M().framePose(lib.poses,motion,frame,d,sides));
 return {pose,order:M().frameOrder(baseOrder(m,d),motion,frame,d,sides)};
}
async function prepared(actor,d,face){
 const tone=actor.skin?.tone||"light",spec=wearSpec(actor);
 const key=actor.gender+"|"+tone+"|"+JSON.stringify(spec)+"|"+d+"|"+(face?.key||"");
 if(prepCache.has(key))return prepCache.get(key);
 const p=(async()=>{const m=await master(actor.gender,tone),ch=await wear(actor.gender,tone,spec);return R().prepare(m,ch,d,face?.img||null)})();
 if(prepCache.size>300)prepCache.clear();
 prepCache.set(key,p);p.catch(()=>prepCache.delete(key));return p;
}
/* Draw one 64×112 frame. opts: {motion (validated lgr1 motion or null), frame,
 * dir, faceId, faceMs, pose (screen pose override), order} → canvas */
async function frameCanvas(actor,opts){
 const d=opts.dir||actor.dir||"se",lib=await motions();
 const face=opts.faceId?await faceImage(opts.faceId,opts.faceMs).catch(()=>null):null;
 const prep=await prepared(actor,d,face);
 let pose=opts.pose,order=opts.order;
 if(!pose){const p=poseOf(prep.master,lib,opts.motion||null,opts.frame|0,d);pose=p.pose;order=order||p.order}
 return R().render(prep,pose,order?{order}:undefined);
}
function clearCaches(){prepCache.clear();frameCache.clear();faceCache.clear()}
async function rigOf(gender){return master(gender,"light")}
return root.LGRActor=Object.freeze({FOOT,OUTFITS,HAIRS,loadBases,master,rigOf,wear,wearSpec,refreshFaces,facesFor,
 get faces(){return faces},faceImage,motions,poseOf,baseOrder,prepared,frameCanvas,clearCaches});
})(window);
