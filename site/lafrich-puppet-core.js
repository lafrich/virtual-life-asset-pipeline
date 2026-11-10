/* LGR-1 core (wire format "lafrich-puppet-master-v1") — four-view 64×112 pixel rig contract.
 * Old V6B is an optional visual seed ONLY. No Genesis 11-action or Python
 * worker is reachable through this engine. Model data is declarative.
 */
(function(root,factory){"use strict";const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.LafrichPuppetCore=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const W=64,H=112,N=W*H,DIRS=Object.freeze(["se","sw","ne","nw"]);
 const IDS=Object.freeze({male:"lafrich_male",female:"lafrich_female"});
 // Hierarchical anatomy: forearms rotate around elbows and calves around knees.
 // These are actual independent masks; they are not stretched single limbs.
 // 11 parts (Nov 2026): PELVIS is the root (hips/crotch, parent of both
 // thighs); TORSO (upper body) is its child and bends at the waist. Pelvis is
 // appended as index 10 so 10-part masks keep their meaning (see LEGACY).
 const PARTS=Object.freeze(["leg_far_upper","leg_far_lower","arm_far_upper","arm_far_lower",
  "torso","leg_near_upper","leg_near_lower","arm_near_upper","arm_near_lower","head","pelvis"]);
 const PARENTS=Object.freeze({
  pelvis:null,torso:"pelvis",head:"torso",
  arm_near_upper:"torso",arm_near_lower:"arm_near_upper",
  arm_far_upper:"torso",arm_far_lower:"arm_far_upper",
  leg_near_upper:"pelvis",leg_near_lower:"leg_near_upper",
  leg_far_upper:"pelvis",leg_far_lower:"leg_far_upper"
 });
 const DRAW_ORDER=Object.freeze(["leg_far_lower","leg_far_upper","arm_far_lower","arm_far_upper",
  "pelvis","torso","leg_near_lower","leg_near_upper","arm_near_upper","arm_near_lower","head"]);
 // Pre-pelvis 10-part contract: still opens; migrated IN MEMORY only.
 const LEGACY=Object.freeze({PARTS:Object.freeze(PARTS.slice(0,10)),
  PARENTS:Object.freeze({torso:null,head:"torso",arm_near_upper:"torso",arm_near_lower:"arm_near_upper",
   arm_far_upper:"torso",arm_far_lower:"arm_far_upper",leg_near_upper:"torso",leg_near_lower:"leg_near_upper",
   leg_far_upper:"torso",leg_far_lower:"leg_far_upper"}),
  DRAW_ORDER:Object.freeze(["leg_far_lower","leg_far_upper","arm_far_lower","arm_far_upper",
   "torso","leg_near_lower","leg_near_upper","arm_near_upper","arm_near_lower","head"]),
  WAIST:75,HIP:79,TORSO_PIVOT_Y:66});
 const LAYERS=Object.freeze(["hair_back","body","pants","shoes","top_back","top","body_front","hair_front","accessory"]);
 const WEAR=Object.freeze(["pants","shoes","top_back","top","hair_back","hair_front","accessory"]);
 const FORMAT="lafrich-puppet-master-v1",MOTION="lafrich-puppet-motion-v1",CHARACTER="lafrich-puppet-character-v1";
 const MASTER_KEY="vl-lafrich-puppet-masters-v1",CHARACTER_KEY="vl-lafrich-puppet-characters-v1",
  MOTION_KEY="vl-lafrich-puppet-motions-v1";
 const maxPng=160000;
 const clone=a=>JSON.parse(JSON.stringify(a));
 function assert(ok,msg){if(!ok)throw Error("Lafrich Puppet: "+msg)}
 const isPoint=p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.x<W&&p.y>=0&&p.y<H;
 const isPlacement=p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&
  Math.abs(p.x)<=W&&Math.abs(p.y)<=H;
 // Pivots are in original 64×112 V6B coordinates and can be edited in four views.
 // Defaults follow the V6B Genesis silhouette (arms x≤24 / x≥40, elbow y69,
 // hip y81, knee y94). SE/NW keep the near limbs on screen-left; SW/NE are the
 // mirror (x' = 64 − x) so "near" is always the limb closest to the camera:
 // SE near=right, SW near=left, NE near=right, NW near=left (see lgr1-motion.js).
 const coords=Object.freeze({pelvis:[32,79],torso:[32,75],head:[32,50],
  arm_near_upper:[24,61],arm_near_lower:[23,69],
  arm_far_upper:[40,61],arm_far_lower:[41,69],
  leg_near_upper:[28,81],leg_near_lower:[28,93],
  leg_far_upper:[36,81],leg_far_lower:[36,93]});
 const MIRRORED=Object.freeze({se:false,sw:true,ne:true,nw:false});
 const mirrorX=x=>Math.min(W-1,Math.max(0,64-x));
 function defaultPart(x,y){
  if(y<50)return "head";
  if(y<81){
   if(y>=61&&x<=24)return y<69?"arm_near_upper":"arm_near_lower";
   if(y>=61&&x>=40)return y<69?"arm_far_upper":"arm_far_lower";
   return y>=75?"pelvis":"torso";
  }
  if(x<32)return y<94?"leg_near_upper":"leg_near_lower";
  return y<94?"leg_far_upper":"leg_far_lower";
 }
 function maskDefault(dir="se"){
  const bytes=new Uint8Array(N),flip=!!MIRRORED[dir];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)
   bytes[y*W+x]=PARTS.indexOf(defaultPart(flip?mirrorX(x):x,y));
  return encode(bytes);
 }
 function defaultPivots(dir="se"){
  const flip=!!MIRRORED[dir];
  return Object.fromEntries(PARTS.map(p=>[p,{x:flip?mirrorX(coords[p][0]):coords[p][0],y:coords[p][1]}]));
 }
 // Shape-based slicing from the visible silhouette (vis: Uint8Array N, 1 =
 // visible pixel in any body layer). Head = everything above the shoulder
 // line (skull + chin + neck), limbs/torso by region; EMPTY canvas → 255 (no part).
 function rowWidth(vis,y){let n=0;for(let x=0;x<W;x++)if(vis[y*W+x])n++;return n}
 function shoulderRow(vis){
  let min=Infinity,at=-1;
  for(let y=46;y<=57;y++){const w=rowWidth(vis,y);if(w>0&&w<min){min=w;at=y}}
  if(at<0)return 50;
  for(let y=at+1;y<=60;y++)if(rowWidth(vis,y)>=min+4)return y;
  return 50;
 }
 // pixels: composite RGBA (N*4, outline colours used to find the arm line) or
 // a plain 0/1 silhouette (N). Returns {mask, shoulder, legTop, headPivot,...}.
 function silhouette(pixels){
  assert(pixels&&(pixels.length===N||pixels.length===N*4),"Silhouette must be 64×112");
  const vis=new Uint8Array(N),dark=new Uint8Array(N),rgba=pixels.length===N*4;
  for(let k=0;k<N;k++){
   if(rgba?pixels[k*4+3]:pixels[k])vis[k]=1;
   if(rgba&&vis[k]&&(pixels[k*4]*299+pixels[k*4+1]*587+pixels[k*4+2]*114)<150000)dark[k]=1;
  }
  return {vis,dark,rgba};
 }
 // Arm boundary on one side (-1 = screen left, +1 = screen right). The inner
 // edge column xi comes from rows where the arm hangs free (empty gap between
 // arm and torso) or, when the arm touches the torso, from the dark inner
 // outline 2–5 px inside the outer edge. Rows above the armpit stay torso.
 function armLine(sil,side,top,bottom){
  const {vis,dark}=sil,at=(x,y)=>x>=0&&x<W&&vis[y*W+x],dk=(x,y)=>x>=0&&x<W&&dark[y*W+x];
  const edge=y=>{if(side<0){for(let x=0;x<W;x++)if(vis[y*W+x])return x}else for(let x=W-1;x>=0;x--)if(vis[y*W+x])return x;return -1};
  const gapVotes=new Map(),lineVotes=new Map(),outer=new Map();
  for(let y=top;y<bottom;y++){
   const xo=edge(y);if(xo<0)continue;
   let L=0;while(L<7&&at(xo-side*L,y))L++;
   if(L>=2&&L<=5){let g=L;while(g<L+4&&!at(xo-side*g,y))g++;
    if(g>L&&g<L+4){const xi=xo-side*(L-1);gapVotes.set(xi,(gapVotes.get(xi)||0)+1);outer.set(xo,(outer.get(xo)||0)+1);continue}}
   for(let dd=2;dd<=5;dd++){const x=xo-side*dd;if(!at(x,y))break;if(dk(x,y)){lineVotes.set(x,(lineVotes.get(x)||0)+1);break}}
  }
  const top1=m=>[...m.entries()].sort((p,q)=>q[1]-p[1]||p[0]-q[0])[0]||null;
  const g=top1(gapVotes),l=top1(lineVotes);
  const pick=g&&g[1]>=3?g:l&&l[1]>=5?l:null;
  if(!pick)return null;
  const xi=pick[0],out=xi+side,inn=xi-side;
  const evidence=y=>at(xi,y)&&(!at(inn,y)||(dk(xi,y)&&at(out,y))||(at(out,y)&&dk(inn,y)));
  let a=-1,len=0;
  for(let y=top;y<bottom;){if(!evidence(y)){y++;continue}let e=y;while(e<bottom&&evidence(e))e++;if(e-y>len){len=e-y;a=y}y=e}
  if(len<4)return null;
  let xo=edge(a+Math.floor(len/2)),end=a+len-1;
  while(end+1<bottom&&at(xo,end+1)&&at(xi,end+1))end++;          // arm overlapping the hip
  const outside=(y)=>{for(let x=0;x<W;x++)if(vis[y*W+x]&&(side<0?x<xi:x>xi))return true;return false};
  if(end+1<bottom&&outside(end+1)&&!(end+2<H&&outside(end+2)))end++; // fingertips
  return {x:xi,top:a,bottom:end};
 }
 function legGap(vis,y,prev){
  // empty columns between two runs nearest the centre (x 24..40)
  let best=null;
  for(let x=24;x<=40;x++){
   if(vis[y*W+x])continue;
   let l=x;while(l>=0&&!vis[y*W+l])l--;let r=x;while(r<W&&!vis[y*W+r])r++;
   if(l<0||r>=W)continue;
   const mid=(l+r)/2;if(!best||Math.abs(mid-32)<Math.abs(best-32))best=mid;
  }
  return best===null?prev:best;
 }
 function shapeSlice(pixels,dir="se"){
  const sil=silhouette(pixels),vis=sil.vis;
  const flip=!!MIRRORED[dir],cut=shoulderRow(vis),out=new Uint8Array(N).fill(255);
  const part=(sx,y)=>PARTS.indexOf(defaultPart(flip?mirrorX(sx):sx,y));
  // legs start at the crotch: first row (74..90) with a real gap between legs
  let legTop=81;
  for(let y=74;y<=90;y++)if(legGap(vis,y,null)!==null&&legGap(vis,y+1,null)!==null){legTop=y;break}
  const arms=sil.rgba?{"-1":armLine(sil,-1,cut,legTop),"1":armLine(sil,1,cut,legTop)}:{};
  const waist=legTop-6; // pelvis = hips/crotch band above the leg split
  let split=32;
  for(let y=0;y<H;y++){
   if(y>=legTop)split=legGap(vis,y,split);
   for(let x=0;x<W;x++){
    const k=y*W+x;if(!vis[k])continue;
    let p;
    if(y<cut)p=PARTS.indexOf("head");
    else if(y>=legTop)p=part(x<split?26:38,Math.max(y,81));
    else{
     p=PARTS.indexOf(y>=waist?"pelvis":"torso");
     for(const side of [-1,1]){
      const arm=arms[side];
      if(arm){
       const outside=side<0?x<arm.x:x>arm.x;
       if(y>=arm.top&&y<=arm.bottom&&(outside||x===arm.x))p=part(side<0?20:44,Math.max(y,61));
      }else{
       const d=defaultPart(flip?mirrorX(x):x,Math.max(y,50));
       if(d.startsWith("arm")&&((side<0)===(x<32)))p=PARTS.indexOf(d);
      }
     }
    }
    out[k]=p;
   }
  }
  // neck base: the head turns around the middle of the neck at the shoulder line
  const xs=[];for(let x=0;x<W;x++)if(vis[(cut-1)*W+x])xs.push(x);
  const headPivot={x:xs.length?Math.round((xs[0]+xs[xs.length-1]+1)/2):(flip?mirrorX(32):32),y:cut};
  // waist joint (torso bends here) and hip centre (pelvis root) from the torso/pelvis pixels
  const mid=y=>{let a=-1,b=-1;for(let x=0;x<W;x++){const v=out[y*W+x];if(v===PARTS.indexOf("torso")||v===PARTS.indexOf("pelvis")){if(a<0)a=x;b=x}}
   return a<0?(flip?mirrorX(32):32):Math.round((a+b+1)/2)};
  const torsoPivot={x:mid(waist),y:waist},pelvisPivot={x:mid(legTop-2),y:legTop-2};
  return {mask:out,shoulder:cut,waist,legTop,arms:{left:arms[-1]||null,right:arms[1]||null},headPivot,torsoPivot,pelvisPivot};
 }
 // For EXISTING drafts: re-slice every visible pixel from the shape and drop
 // empty canvas. Returns which parts changed so only those reviews reset.
 function resliceFromShape(mask,pixels,dir="se"){
  const s=shapeSlice(pixels,dir),out=s.mask,parts=new Set();let changed=0,moved=0;
  // Only VISIBLE pixels that move to another part reset reviews; dropping
  // empty canvas from a part (→ 255) changes nothing anyone can see.
  for(let k=0;k<N;k++)if(out[k]!==mask[k]){changed++;if(out[k]!==255)moved++;if(out[k]!==255)for(const v of [out[k],mask[k]])if(v<PARTS.length)parts.add(PARTS[v])}
  return {mask:out,changed,moved,parts:[...parts],shoulder:s.shoulder,waist:s.waist,legTop:s.legTop,
   headPivot:s.headPivot,torsoPivot:s.torsoPivot,pelvisPivot:s.pelvisPivot};
 }
 // 10-part → 11-part, pure and deterministic (Python twin: migrate_legacy_view).
 // Torso pixels at/below the waist row become PELVIS; pelvis pivot = hip centre;
 // a torso pivot still at the old default (y66) moves to the waist.
 function migrateOrder(o){
  if(!Array.isArray(o)||o.includes("pelvis"))return o;
  const t=o.indexOf("torso");return t<0?o:[...o.slice(0,t),"pelvis",...o.slice(t)];
 }
 function migrateLegacyView(mask,pivots){
  if(pivots?.pelvis)return {mask,pivots,migrated:false};
  const out=Uint8Array.from(mask),T=PARTS.indexOf("torso"),P=PARTS.indexOf("pelvis");
  for(let k=LEGACY.WAIST*W;k<N;k++)if(out[k]===T)out[k]=P;
  const tp=pivots?.torso||{x:32,y:LEGACY.TORSO_PIVOT_Y},pv={...pivots};
  pv.pelvis={x:tp.x,y:LEGACY.HIP};
  if(tp.y===LEGACY.TORSO_PIVOT_Y)pv.torso={x:tp.x,y:LEGACY.WAIST};
  return {mask:out,pivots:pv,migrated:true};
 }
 function isLegacyMaster(m){return !!m&&DIRS.some(d=>m.pivots?.[d]&&!m.pivots[d].pelvis)}
 function encode(bytes){
  assert(bytes instanceof Uint8Array&&bytes.length===N,"Mask must be 64×112");
  assert([...bytes].every(n=>n===255||n<PARTS.length),"Unknown puppet slice");
  let chars="";for(const b of bytes)chars+=String.fromCharCode(b);
  if(typeof btoa==="function")return btoa(chars);
  return Buffer.from(bytes).toString("base64");
 }
 function decode(raw){
  assert(typeof raw==="string"&&raw.length<=9700&&/^[a-z0-9+/]*={0,2}$/i.test(raw),"Invalid mask encoding");
  const chars=typeof atob==="function"?atob(raw):Buffer.from(raw,"base64").toString("binary");
  assert(chars.length===N,"Mask must be 64×112");
  const bytes=Uint8Array.from(chars,c=>c.charCodeAt(0));
  assert([...bytes].every(b=>b===255||b<PARTS.length),"Unknown mask assignment");
  return bytes;
 }
 const nativePng=x=>typeof x==="string"&&x.length<maxPng&&/^data:image\/png;base64,[a-z0-9+/]+=*$/i.test(x);
 function master(gender){
  assert(!!IDS[gender],"Gender must be male or female");
  return {format:FORMAT,id:IDS[gender],gender,name:gender==="male"?"Lafrich Male":"Lafrich Female",
   version:1,updated:"",layers:Object.fromEntries(LAYERS.map(n=>[n,{}])),
   masks:Object.fromEntries(DIRS.map(d=>[d,maskDefault(d)])),
   pivots:Object.fromEntries(DIRS.map(d=>[d,defaultPivots(d)])),
   // Additive/backward-compatible placement: pixel assets stay at native source
   // coordinates, and the renderer moves each cut puppet piece with its joints.
   placements:Object.fromEntries(DIRS.map(d=>[d,Object.fromEntries(PARTS.map(p=>[p,{x:0,y:0}]))]))};
 }
 function validateMaster(input){
  assert(input?.format===FORMAT&&IDS[input.gender]===input.id,"Only two stable Lafrich masters allowed");
  const out=master(input.gender);out.updated=String(input.updated||"");let total=0;
  for(const layer of LAYERS)for(const d of DIRS){
   const png=input.layers?.[layer]?.[d];
   if(png!==undefined){
    assert(nativePng(png),"Invalid "+layer+" / "+d+" PNG");
    out.layers[layer][d]=png;total+=png.length;
   }
  }
  for(const d of DIRS){
   let mask=decode(input.masks?.[d]),pivots=input.pivots?.[d];
   if(pivots&&!pivots.pelvis){const mig=migrateLegacyView(mask,pivots);mask=mig.mask;pivots=mig.pivots}
   out.masks[d]=encode(mask);
   for(const part of PARTS){
    const point=pivots?.[part];
    assert(isPoint(point),"Invalid pivot "+d+" / "+part);
    out.pivots[d][part]={x:point.x,y:point.y};
    const placement=input.placements?.[d]?.[part];
    if(placement!==undefined){
     assert(isPlacement(placement),"Invalid body piece placement "+d+" / "+part);
     out.placements[d][part]={x:placement.x,y:placement.y};
    }
   }
  }
  assert(total<6000000,"Master exceeds 6 MB; split assets across parts");
  // Optional LGR-1 render settings; copied only when present so masters saved
  // before these fields existed round-trip byte-identically.
  if(input.drawOrders!==undefined){
   assert(input.drawOrders&&typeof input.drawOrders==="object","Invalid draw orders");
   out.drawOrders={};
   for(const d of DIRS){
    const o=migrateOrder(input.drawOrders[d]);if(o===undefined)continue;
    assert(Array.isArray(o)&&o.length===PARTS.length&&PARTS.every(p=>o.includes(p)),"Invalid draw order "+d);
    out.drawOrders[d]=o.slice();
   }
  }
  if(input.sides!==undefined){
   out.sides={};
   for(const d of DIRS){const v=input.sides?.[d];if(v===undefined)continue;
    assert(v==="left"||v==="right","Invalid near side "+d);out.sides[d]=v}
  }
  if(input.capRadius!==undefined){
   out.capRadius={};
   for(const p of PARTS){const v=input.capRadius?.[p];if(v===undefined)continue;
    assert(Number.isInteger(v)&&v>=0&&v<=6,"Invalid joint cap "+p);out.capRadius[p]=v}
  }
  return out;
 }
 function blankPose(){return Object.fromEntries(PARTS.map(p=>[p,{x:0,y:0,a:0}]))}
 function blankFrame(ms=160){return {ms,poses:Object.fromEntries(DIRS.map(d=>[d,blankPose()]))}}
 function motion(name="Untitled Motion"){
  return {format:MOTION,id:"",name,frames:[blankFrame()]};
 }
 function validateMotion(input){
  assert(input?.format===MOTION&&typeof input.name==="string"&&input.name.length<=100&&
   /^[a-z0-9_-]{0,80}$/i.test(input.id||""),"Invalid Python motion");
  assert(Array.isArray(input.frames)&&input.frames.length>=1&&input.frames.length<=96,"Motion needs 1–96 frames");
  const frames=input.frames.map((frame,i)=>{
   assert(Number.isInteger(frame.ms)&&frame.ms>=40&&frame.ms<=5000,"Invalid duration frame "+i);
   const poses={};
   for(const d of DIRS){
    poses[d]={};
    for(const p of PARTS){
     // pre-pelvis puppet motions have no pelvis transform: it stays at rest
     const v=p==="pelvis"&&!frame.poses?.[d]?.pelvis?{x:0,y:0,a:0}:frame.poses?.[d]?.[p];
     assert(v&&[v.x,v.y,v.a].every(Number.isFinite)&&
      Math.abs(v.x)<=64&&Math.abs(v.y)<=112&&Math.abs(v.a)<=360,"Invalid "+d+"/"+p+" transform");
     poses[d][p]={x:v.x,y:v.y,a:v.a};
    }
   }
   return {ms:frame.ms,poses};
  });
  return {format:MOTION,id:input.id||"",name:input.name,frames};
 }
 function character(gender,name="Custom Character"){
  assert(!!IDS[gender],"Unknown Lafrich body");
  return {format:CHARACTER,id:"",name,gender,wear:Object.fromEntries(WEAR.map(k=>[k,{}])),faceId:""};
 }
 function validateCharacter(c){
  assert(c?.format===CHARACTER&&!!IDS[c.gender]&&/^[a-z0-9_-]{0,80}$/i.test(c.id||"")&&
   typeof c.name==="string"&&c.name.length<=100,"Invalid Lafrich character");
  const out=character(c.gender,c.name);out.id=c.id||"";out.faceId=String(c.faceId||"").slice(0,100);
  let size=0;
  for(const k of WEAR)for(const d of DIRS){
   const p=c.wear?.[k]?.[d];
   if(p!==undefined){assert(nativePng(p),"Invalid wear "+k+"/"+d);out.wear[k][d]=p;size+=p.length;}
  }
  assert(size<6000000,"Custom Wear too large");
  if(c.maskTweaks&&typeof c.maskTweaks==="object"){
   out.maskTweaks={};
   for(const d of DIRS){const t=c.maskTweaks[d];if(t===undefined)continue;
    assert(typeof t==="string"&&t.length<=9700&&/^[a-z0-9+/]*={0,2}$/i.test(t),"Invalid outfit tweak "+d);
    const chars=typeof atob==="function"?atob(t):Buffer.from(t,"base64").toString("binary");
    assert(chars.length===N&&[...chars].every(ch=>{const b=ch.charCodeAt(0);return b<PARTS.length||b===254||b===255}),"Invalid outfit tweak "+d);
    out.maskTweaks[d]=t}
  }
  return out;
 }
 function toPython(m){
  const valid=validateMotion(m);
  return "# LAFRICH PUPPET MOTION v1 — declarative Python, no old stock actions\n"+
   "# Edit pose x/y/a and frame ms. Import this .py in Lafrich Animation.\n"+
   "MOTION = "+JSON.stringify(valid,null,2)+"\n";
 }
 function fromPython(s){
  assert(typeof s==="string"&&s.length<2000000,"Python motion too large");
  const match=s.match(/(?:^|\n)\s*MOTION\s*=\s*(\{[\s\S]*\})\s*$/);
  assert(!!match,"Expected a Python MOTION = {...} literal");
  // Deliberately DO NOT execute Python supplied by a file. Strict literal
  // preserves native .py authoring without arbitrary browser code execution.
  let value;try{value=JSON.parse(match[1])}catch{throw Error("Motion must be a JSON-compatible Python dict literal")}
  return validateMotion(value);
 }
 return Object.freeze({W,H,N,DIRS,IDS,PARTS,PARENTS,DRAW_ORDER,LAYERS,WEAR,FORMAT,MOTION,CHARACTER,
  MASTER_KEY,CHARACTER_KEY,MOTION_KEY,MIRRORED,blankPose,blankFrame,master,validateMaster,maskDefault,defaultPivots,shapeSlice,resliceFromShape,shoulderRow,LEGACY,migrateLegacyView,migrateOrder,isLegacyMaster,
  motion,validateMotion,character,validateCharacter,encode,decode,clone,toPython,fromPython});
});
