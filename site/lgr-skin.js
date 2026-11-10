/* LGR skin key ramp — same keys and tone list as the old V6P character
 * customizer (v6p-compositor.js K.Ki..K5 and P.skin). Genesis Base packages
 * store skin pixels as these KEY colors; the game / renderer swaps each key
 * for the chosen tone at draw time. The frozen V6B base is painted in the
 * "light" tone, so light ⇄ key is an exact 1:1 map.
 * Contract: docs/GENESIS_BASE_FORMAT.md § Skin.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.LGRSkin=api;
})(typeof window==="undefined"?null:window,function(){
"use strict";
const ENCODING="v6p-key-ramp-v1";
const ORDER=Object.freeze(["i","h","e","a","7","5"]); // highlight → outline
const KEYS=Object.freeze({i:"#FF2CE8",h:"#FF32E5",e:"#FF38E2",a:"#FF3EDF","7":"#FF44DC","5":"#FF4AD9"});
const TONES=Object.freeze({
 porcelain:Object.freeze({i:"#F8E4D6",h:"#F2D8C7",e:"#E7BCA3",a:"#DFB195","7":"#AD795C","5":"#8E6147"}),
 light:Object.freeze({i:"#F1D3B5",h:"#EBC8A8",e:"#E0AE8A",a:"#D9A47E","7":"#A8704E","5":"#8A5A3C"}),
 tan:Object.freeze({i:"#E3B791",h:"#DDAD87",e:"#D3976F",a:"#CC8E65","7":"#9E613E","5":"#824E30"}),
 medium:Object.freeze({i:"#C99364",h:"#C48B5D",e:"#BB794C",a:"#B57246","7":"#8C4E2B","5":"#733F21"}),
 brown:Object.freeze({i:"#9A6644",h:"#96613F",e:"#8F5434",a:"#8B4F2F","7":"#6B361D","5":"#582C17"}),
 deep:Object.freeze({i:"#66412B","h":"#633E28",e:"#5F3621",a:"#5C331E","7":"#472313","5":"#3A1C0E"})
});
const TONE_ORDER=Object.freeze(["porcelain","light","tan","medium","brown","deep"]);
const BASE_TONE="light";
const hx=c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];
const toHex=a=>"#"+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("").toUpperCase();
const int=a=>(a[0]<<16)|(a[1]<<8)|a[2];
const validHex=c=>/^#[0-9a-fA-F]{6}$/.test(String(c||""));
// custom: picked colour is the highlight "i"; the rest follow light's shading
function customRamp(hex){
 const c=hx(hex),base=hx(TONES.light.i),out={};
 for(const k of ORDER){const t=hx(TONES.light[k]);out[k]=toHex(c.map((v,j)=>v*t[j]/base[j]))}
 return Object.freeze(out);
}
function rampFor(tone,custom){
 if(tone==="custom"&&validHex(custom))return customRamp(custom);
 return TONES[tone]||TONES[BASE_TONE];
}
function normalize(s){
 const tone=s&&(TONES[s.tone]||(s.tone==="custom"&&validHex(s.custom)))?s.tone:BASE_TONE;
 return tone==="custom"?{tone,custom:String(s.custom).toUpperCase()}:{tone};
}
function lookup(fromRamp,toRamp){
 const m=new Map();
 for(const k of ORDER){const a=int(hx(fromRamp[k]));if(!m.has(a))m.set(a,hx(toRamp[k]))}
 return m;
}
// in-place swap of exact ramp colours in RGBA data; returns pixels changed
function swap(data,fromRamp,toRamp){
 const m=lookup(fromRamp,toRamp);let n=0;
 for(let i=0;i<data.length;i+=4){
  if(!data[i+3])continue;
  const t=m.get((data[i]<<16)|(data[i+1]<<8)|data[i+2]);
  if(t){data[i]=t[0];data[i+1]=t[1];data[i+2]=t[2];n++}
 }
 return n;
}
const toKey=(data,fromRamp=TONES.light)=>swap(data,fromRamp,KEYS);
const fromKey=(data,toRamp=TONES.light)=>swap(data,KEYS,toRamp);
// skin-looking colour (warm, moderately saturated) that is NOT on the ramp
function skinLike(r,g,b){
 const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;if(mx<50||!d)return false;
 let h;if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360;
 const s=d/mx;return mx===r&&h>=0&&h<=45&&s>=.12&&s<=.75;
}
function offRamp(data,ramp=TONES.light){
 const on=new Set(ORDER.map(k=>int(hx(ramp[k])))),colors={};let count=0;
 for(let i=0;i<data.length;i+=4){
  if(!data[i+3])continue;const v=(data[i]<<16)|(data[i+1]<<8)|data[i+2];
  if(on.has(v)||!skinLike(data[i],data[i+1],data[i+2]))continue;
  count++;const h=toHex([data[i],data[i+1],data[i+2]]);colors[h]=(colors[h]||0)+1;
 }
 return {count,colors};
}
return Object.freeze({ENCODING,ORDER,KEYS,TONES,TONE_ORDER,BASE_TONE,rampFor,customRamp,normalize,swap,toKey,fromKey,offRamp,skinLike,validHex});
});
