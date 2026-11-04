/* Mahluk Hidup — universal non-explicit body appearances for WC and bathing.
 * Character identity/skin + body rig live here, not in Bangun Ruang fixtures.
 * Per-type WC/shower placement stays with the building's action anchors.
 *
 * Nude mannequin templates are adult, non-explicit, 64x112 native human
 * silhouettes, not uncensored/generated anatomical detail.
 */
(function(root,factory){"use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.VLUniversalBodyActions=api;
})(typeof window!=="undefined"?window:null,function(){"use strict";
 const DIR=Object.freeze(["se","sw","ne","nw"]);
 const RULES=Object.freeze({
  use_toilet:{kind:"toilet",coverage:"lower",baseMotion:"sit",frames:4},
  pee:{kind:"toilet",coverage:"lower",baseMotion:"sit",frames:4},
  poop:{kind:"toilet",coverage:"lower",baseMotion:"sit",frames:4},
  toilet:{kind:"toilet",coverage:"lower",baseMotion:"sit",frames:4},
  toilet_sit:{kind:"toilet",coverage:"lower",baseMotion:"sit",frames:4},
  bathe:{kind:"bath",coverage:"full",baseMotion:"bathe",frames:4},
  bath:{kind:"bath",coverage:"full",baseMotion:"bathe",frames:4},
  shower:{kind:"bath",coverage:"full",baseMotion:"bathe",frames:4},
  bathtub_bathe:{kind:"bathtub",coverage:"horizontal",baseMotion:"bathtub_bathe",frames:6}
 });
 const DEFAULT_TONE=Object.freeze([223,181,147]);
 const BODY_START_Y=53; // Native V6B scalp/neck ends, naked torso begins.
 function bodyType(actor){
  if(!actor||typeof actor!=="object")return null;
  // Resolve the original Mahluk Hidup male/female template, not outfit,
  // custom character name, or the appearance of an equipped sprite.
  const candidates=[actor.bodyType,actor.gender,actor.sex,
   actor.baseId,actor.base_id,actor.base,actor.id];
  for(const value of candidates){
   const candidate=String(value||"").toLowerCase();
   if(/(^|[_-])female($|[_-])|^f$/.test(candidate))return "female";
   if(/(^|[_-])male($|[_-])|^m$/.test(candidate))return "male";
  }
  // An unspecified two-legged game NPC uses a NON-EXPLICIT generic
  // human mannequin. This is a visual fallback, NOT a claim about the
  // character's sex. Explicit female/male metadata always overrides it.
  const label=String(actor.id||"")+" "+String(actor.category||"");
  if(/(?:alien|robot|grok_bot|animal|hamster|cat|dog|pet|mascot)/i.test(label))
   return null;
  return "neutral";
 }
 function rule(action){return RULES[action]||null}
 function resolve(actor,action){
  const r=rule(action),sex=bodyType(actor);
  // Do not assign human anatomy to unspecified non-human/neutral actors.
  // They retain their own pose/source under the shared motion fallback.
  if(!r||!sex)return null;
  // Only the authored Human base actors can use the full replacement sheet.
  // Other actors (even named/sexed humans) must keep their OWN actual head,
  // hair and lying body; those get a safe foam overlay, not a stranger's face.
  if(r.kind==="bathtub"&&!["human_male_base","human_female_base"].includes(actor?.id))
    return null;
  const origin=String(actor?.baseId||actor?.base_id||actor?.base||actor?.id||"");
  const humanTemplate=["human_male_base","human_female_base"].includes(origin);
  const contextualToilet=r.kind==="toilet"&&humanTemplate;
  return {...r,bodyType:sex,
   facePolicy:contextualToilet?"action-context":"preserve-actor",
   sheet:"media/human-"+(sex==="female"?"female":"male")+"-base-action-"+
    (contextualToilet?"toilet":r.baseMotion)+".png",
   actionId:action,directions:DIR,frameMs:r.kind==="bathtub"?[320,340,360,350,340,330]:
    r.kind==="bath"?[330,360,380,360]:[400,430,440,430],
   source:"universal-human-body",skin:"source-face"};
 }
 function declaredTone(actor){
  const raw=actor?.skinTone;
  if(Array.isArray(raw)&&raw.length===3&&raw.every(v=>Number.isFinite(+v)))
   return raw.map(v=>Math.max(0,Math.min(255,Math.round(+v))));
  if(typeof raw==="string"&&/^#[a-f0-9]{6}$/i.test(raw))
   return [1,3,5].map(i=>parseInt(raw.slice(i,i+2),16));
  const tones={light:[223,181,147],medium:[191,139,103],
   tan:[174,120,86],deep:[133,87,65],dark:[115,76,59]};
  return tones[String(raw||"").toLowerCase()]||[...DEFAULT_TONE];
 }
 function recolorTone(source,actor){
  const rgba=source?.data;
  if(!rgba)return declaredTone(actor);
  // The facial surface is read from the ACTUAL actor before body override.
  // Avoid hair, eyes, white highlights and clothing. Median provides a
  // robust skin sample for all palette variations without a skin-tone ID.
  const pixels=[];
  for(let y=34;y<51;y++)for(let x=20;x<44;x++){
   const i=(y*64+x)*4,r=rgba[i],g=rgba[i+1],b=rgba[i+2],a=rgba[i+3];
   if(a<200||r<60||g<35||b<20||r>249||g>235)continue;
   if(r<g*.96||g<b*.99||r<b*1.13)continue;
   if(r-g>118||g-b>105)continue;
   pixels.push([r,g,b]);
  }
  if(pixels.length<8)return declaredTone(actor);
  return [0,1,2].map(c=>{
   const sorted=pixels.map(p=>p[c]).sort((a,b)=>a-b);
   return sorted[Math.floor(sorted.length*.55)];
  });
 }
 // Optional skin variation for the canonical Human Male/Female base.
 // It never recolors the accessory layers; body pixels are repainted
 // after their original animation frame is drawn.
 function tintBase(ctx,actor){
  const base=String(actor?.baseId||actor?.base_id||actor?.base||actor?.id||"");
  if(!/(?:^|_)human_(?:male|female)_base(?:$|_)/.test(base))return false;
  const chosen=actor?.skinTone;
  if(!chosen||chosen==="base"||chosen==="light"||!ctx?.getImageData)return false;
  let img;try{img=ctx.getImageData(0,0,64,112)}catch{return false}
  const original=recolorTone(img),tone=declaredTone(actor),d=img.data;
  for(let i=0;i<d.length;i+=4){
   const r=d[i],g=d[i+1],b=d[i+2],a=d[i+3];
   if(a<150||r<72||g<44||b<30||r<=g*1.07||
      g<=b*1.02||r-g>117||g-b>104||r<b*1.13)continue;
   const lum=(r*.33+g*.5+b*.17)/
    Math.max(1,(original[0]*.33+original[1]*.5+original[2]*.17));
   const v=Math.max(.39,Math.min(1.33,lum));
   d[i]=Math.min(255,Math.round(tone[0]*v));
   d[i+1]=Math.min(255,Math.round(tone[1]*v));
   d[i+2]=Math.min(255,Math.round(tone[2]*v));
  }
  ctx.putImageData(img,0,0);return true;
 }
 function recolorBody(img,tone){
  if(!img?.data)return img;
  const data=img.data;
  // V6B base nude sprites use one warm skin ramp. Keep silhouette outlines,
  // face darks and alpha untouched; tint light/mid/dark skin pixels together.
  for(let i=0;i<data.length;i+=4){
   const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
   // Preserve cool blue bath water, off-white foam, hair and eyes.
   // Warm skin has a reliable red>green>blue ramp in the native V6B palette.
   if(a<80||r<90||g<60||b<36||r<=g*1.06||g<=b*1.02||
      r-g>115||g-b>105||r>249&&g>240)continue;
   const lum=(r*.33+g*.51+b*.16)/193;
   const v=Math.max(.40,Math.min(1.26,lum));
   data[i]=Math.max(0,Math.min(255,Math.round(tone[0]*v)));
   data[i+1]=Math.max(0,Math.min(255,Math.round(tone[1]*v)));
   data[i+2]=Math.max(0,Math.min(255,Math.round(tone[2]*v)));
  }
  return img;
 }
 function apply(ctx,{actor,action,direction="sw",frame=0,bodyImage}={}){
  const r=resolve(actor,action);
  if(!r||!bodyImage||!ctx?.getImageData||!ctx?.drawImage)return false;
  const d=DIR.indexOf(direction);if(d<0)return false;
  if((bodyImage.naturalWidth||bodyImage.width)<r.frames*64||
     (bodyImage.naturalHeight||bodyImage.height)<448)return false;
  let source;
  try{source=ctx.getImageData(0,0,64,112)}catch{return false}
  const doc=ctx.canvas?.ownerDocument||
   (typeof document!=="undefined"?document:null);
  if(!doc?.createElement)return false;
  const base=doc.createElement("canvas");base.width=64;base.height=112;
  const bg=base.getContext("2d",{willReadFrequently:true});
  if(!bg)return false;
  bg.imageSmoothingEnabled=false;
  const f=((Math.floor(frame)%r.frames)+r.frames)%r.frames;
  bg.drawImage(bodyImage,f*64,d*112,64,112,0,0,64,112);
  let pixels=bg.getImageData(0,0,64,112);
  const tone=recolorTone(source,actor);
  pixels=recolorBody(pixels,tone);
  bg.putImageData(pixels,0,0);
  const identity=doc.createElement("canvas");
  identity.width=64;identity.height=112;
  const idc=identity.getContext("2d");
  idc.putImageData(source,0,0);
  ctx.clearRect(0,0,64,112);
  ctx.drawImage(base,0,0);
  // Horizontal bathtub frames are fully authored with OPEN eyes and foam.
  // Do not paste a standing head/torso from the source onto a lying body.
  if(r.kind==="bathtub")return true;
  // WC: clothed torso and head remain original; pants/shorts/skirt/legs
  // are replaced with the sex-specific bare seated mannequin.
  // Bath: entirely un-clothed adult mannequin below the head. Hair and
  // distinctive face remain original, with no explicit anatomy drawn.
  const cut=r.coverage==="lower"?68:BODY_START_Y;
  if(r.facePolicy==="action-context"){
   // Human template (and its own clones): keep the contextual WC face
   // and original clothed torso. Render saved hair later in Mahluk Hidup.
   ctx.drawImage(identity,0,BODY_START_Y,64,cut-BODY_START_Y,
     0,BODY_START_Y,64,cut-BODY_START_Y);
  }else{
   // Other NPCs retain their original identity, face and hair.
   ctx.drawImage(identity,0,0,64,cut,0,0,64,cut);
  }
  if(r.kind==="bath"){
   // Original pixel-art bubbles + trickling water, four timed frames.
   const k=f,xx=[22,29,37,27][k],yy=[59,53,64,46][k];
   const bubbles=[[xx,yy],[xx+5,yy-8],[xx-7,yy+7]];
   ctx.fillStyle="#d7f8fa";
   for(const [x,y] of bubbles)ctx.fillRect(x,y,2,2);
   ctx.fillStyle="#8dd6e9";
   ctx.fillRect(46+(k%2),32+4*k,1,5);
   ctx.fillRect(17-(k%2),45+(k%3)*6,1,4);
  }
  return true;
 }
 function drawBathFoam(ctx,{frame=0,x=0,y=0,scale=1,direction="sw"}={}){
  // Procedural six-phase foam for any non-base character, applied to its
  // OWN reclining motion. This never replaces identity or requires a human rig.
  if(!ctx?.fillRect||!Number.isFinite(scale)||scale<=0)return false;
  const phase=((Math.floor(frame)%6)+6)%6;
  let left=14,right=53,baseY=88;
  if(ctx.getImageData&&scale===1&&x===0&&y===0){
   try{
    const pixels=ctx.getImageData(0,0,64,112).data;
    let lo=64,hi=0,bottom=0,seen=0;
    for(let py=55;py<101;py++)for(let px=4;px<60;px++){
     if(pixels[(py*64+px)*4+3]<128)continue;
     lo=Math.min(lo,px);hi=Math.max(hi,px);bottom=Math.max(bottom,py);seen++;
    }
    if(seen>40){left=lo;right=hi;baseY=Math.min(96,Math.max(77,bottom-10));}
   }catch{/* Static pixel-safe placement if source is not readable */}
  }
  const span=Math.max(10,right-left),width=Math.max(1,Math.round(scale));
  for(let i=0;i<10;i++){
   const p=(i+.5)/10,xx=left+span*(.25+.69*p);
   const yy=baseY+(i%3)*2+((i+phase)%3===0?-1:0);
   ctx.fillStyle=i%3===0?"#d6f6ff":"#f5fbff";
   ctx.fillRect(Math.round(x+xx*scale),Math.round(y+yy*scale),
     Math.max(width,Math.round((i%3+2)*scale)),Math.max(width,Math.round(2*scale)));
   if(i%2===0){
    ctx.fillStyle="#8ed4e8";
    ctx.fillRect(Math.round(x+(xx+1)*scale),Math.round(y+(yy+3)*scale),width,width);
   }
  }
  return true;
 }
 return Object.freeze({DIR,RULES,bodyType,rule,resolve,recolorTone,recolorBody,
  declaredTone,BODY_START_Y,tintBase,apply,drawBathFoam});
});