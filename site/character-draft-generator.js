/* Mahluk Hidup — local parametric 4-way pixel draft generator.
 * Uses prompt keywords and reference colour sampling; NOT a vision-language model
 * and NOT an authored V6B sprite/animation. No automatic game publication.
 */
(function(root){"use strict";
const W=64,H=112,DIRS=["se","sw","ne","nw"];
const word=(s,re)=>re.test(String(s||"").toLowerCase());
function parse(prompt,body){
 const s=String(prompt||"").toLowerCase();
 return {hair:word(s,/bob|short hair|rambut pendek|pixie|cepak/)?"short":word(s,/long hair|rambut panjang|panjang|ponytail|kuncir/)?"long":"medium",
 skirt:word(s,/skirt|rok|dress|gaun/),glasses:word(s,/glasses|kacamata/),hat:word(s,/hat|topi|cap|helm/),
 jacket:word(s,/jacket|jaket|cardigan|hoodie|coat/),shorts:word(s,/shorts|celana pendek/),
 body:body==="male"?"male":body==="female"?"female":"neutral",bangs:!word(s,/botak|bald/),bald:word(s,/botak|bald/)};
}
function validColor(c,fallback){return /^#[0-9a-f]{6}$/i.test(c||"")?c:fallback}
function shade(hex,n){
 let v=parseInt(hex.slice(1),16),a=[v>>16,(v>>8)&255,v&255].map(x=>Math.max(0,Math.min(255,x+n)));
 return "#"+a.map(x=>Math.round(x).toString(16).padStart(2,"0")).join("");
}
function render(spec,dir,colors){
 const cfg=parse(spec.prompt,spec.body),cv=document.createElement("canvas");cv.width=W;cv.height=H;
 const c=cv.getContext("2d");c.imageSmoothingEnabled=false;
 const skin=validColor(colors.skin,"#d6a88c"),hair=validColor(colors.hair,"#39312f");
 const top=validColor(colors.upper,"#9c6472"),bottom=validColor(colors.lower,"#52647f"),shoe=validColor(colors.feet,"#393b42");
 const back=dir==="ne"||dir==="nw",side=dir==="sw"||dir==="nw";
 const short=spec.proportion==="short",tall=spec.proportion==="tall",wide=spec.proportion==="wide";
 const sy=short?0.86:tall?1.09:1,sx=wide?1.13:1;
 const rect=(col,x,y,w,h)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
 c.save();c.translate(32,100);c.scale(sx,sy);c.translate(-32,-100);
 // Soft black ground footprint alpha 56, no blur.
 rect("#00000038",20,99,25,2);rect("#00000038",17,100,30,1);
 // Feet, trousers; near/far ordered by direction.
 rect(shade(shoe,-10),23,95,9,5);rect(shoe,33,95,10,5);
 if(cfg.skirt){rect(shade(bottom,-14),21,72,23,13);rect(bottom,23,78,19,9)}
 rect(shade(bottom,-13),23,83,9,13);rect(bottom,33,83,9,13);
 if(cfg.shorts){rect(skin,24,89,7,6);rect(shade(skin,-15),34,89,7,6)}
 // Far arm below shirt.
 rect(shade(top,-18),15,58,6,21);rect(shade(skin,-12),16,79,5,5);
 // Long hair behind torso/neck.
 if(cfg.hair==="long"&&!cfg.bald){rect(shade(hair,-15),16,37,31,35);rect(hair,18,38,27,35)}
 // Head neck and torso.
 rect(shade(skin,-12),28,50,8,9);
 const torsoW=cfg.body==="male"?25:cfg.body==="female"?21:23;
 rect(shade(top,-17),32-torsoW/2,57,torsoW,22);
 rect(top,32-torsoW/2,57,torsoW-4,20);
 if(cfg.jacket){rect(shade(top,-23),21,57,5,22);rect(shade(top,15),38,57,5,22)}
 if(cfg.skirt)rect(bottom,23,76,19,6);
 // Near arm and hands.
 rect(shade(top,-9),42,59,7,22);rect(skin,43,81,6,5);
 // Ears/head.
 rect(shade(skin,-19),17,34,31,25);rect(skin,20,33,25,26);
 rect(shade(skin,8),21,34,16,19);
 if(cfg.hair!=="short"&&!cfg.bald)rect(shade(hair,-8),18,29,30,14);
 if(!cfg.bald){rect(hair,18,27,29,10);rect(shade(hair,12),21,27,18,3)}
 if(!back){
   const eyeY=45;
   if(side){rect("#392d2d",25,eyeY,3,2);rect("#392d2d",39,eyeY+1,2,2)}
   else{rect("#392d2d",25,eyeY,2,2);rect("#392d2d",39,eyeY,3,2)}
   rect(shade(skin,-35),33,49,2,1);
   if(cfg.glasses){rect("#50525a",22,43,10,6);rect("#50525a",36,43,9,6);rect("#50525a",32,44,4,1)}
 }else{
   rect(shade(hair,-2),20,32,25,25);
   rect(shade(hair,10),22,30,17,5);
 }
 if(cfg.hat){rect("#444d5a",18,26,30,6);rect("#525c6d",22,23,22,5);if(!back)rect("#444d5a",15,31,34,3)}
 c.restore();
 return cv;
}
function makeSheet(spec,colors){
 const out=document.createElement("canvas");out.width=W*4;out.height=H;
 const c=out.getContext("2d");c.imageSmoothingEnabled=false;
 DIRS.forEach((d,i)=>c.drawImage(render(spec,d,colors),i*W,0));
 return out;
}
function sampleImage(dataUrl){
 return new Promise((resolve,reject)=>{
  const image=new Image();image.onload=()=>{
   const canvas=document.createElement("canvas");canvas.width=32;canvas.height=32;
   const ctx=canvas.getContext("2d",{willReadFrequently:true});ctx.drawImage(image,0,0,32,32);
   const data=ctx.getImageData(0,0,32,32).data,colors=[];
   for(let i=0;i<data.length;i+=4){if(data[i+3]<150)continue;
    let r=data[i],g=data[i+1],b=data[i+2];
    if(Math.max(r,g,b)>246||Math.min(r,g,b)<10)continue;
    colors.push([r,g,b]);
   }
   if(!colors.length){resolve(null);return}
   colors.sort((a,b)=>(a[0]+a[1]+a[2])-(b[0]+b[1]+b[2]));
   const picked=colors[Math.floor(colors.length*.45)];
   resolve("#"+picked.map(v=>v.toString(16).padStart(2,"0")).join(""));
  };image.onerror=reject;image.src=dataUrl;
 });
}
root.MahlukCharacterDraft=Object.freeze({render,makeSheet,sampleImage,parse,directions:DIRS});
})(window);
