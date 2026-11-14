/* LGR-1 WEAR — outfits + hair for LGR-1 characters, self-contained (no V6P
 * runtime). Six official artist base outfits: media/lgr1/wardrobe-approved/*.json.
 * Other retired V6P wardrobe art is not used for active clothing. Palettes and
 * key codes below are the customizer's (kept as data so skin/hair/cloth tones
 * stay identical in game). Binding to the body follows LGR1Raster rules.
 */
(function(root,factory){"use strict";const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root&&root.document)root.LGRWear=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(root){
"use strict";
const K={"H0":"#FF08FA","H1":"#FF0EF7","H2":"#FF14F4","H3":"#FF1AF1","H4":"#FF20EE","B":"#FF26EB","Ki":"#FF2CE8","Kh":"#FF32E5","Ke":"#FF38E2","Ka":"#FF3EDF","K7":"#FF44DC","K5":"#FF4AD9","C1":"#FF50D6","C2":"#FF56D3","C3":"#FF5CD0","C4":"#FF62CD","C5":"#FF68CA","O1":"#FF6EC7","O2":"#FF74C4","O3":"#FF7AC1","O4":"#FF80BE","O5":"#FF86BB","OD":"#FF8CB8","P1":"#FF92B5","P2":"#FF98B2","P3":"#FF9EAF","P4":"#FFA4AC","S0":"#FFAAA9","S1":"#FFB0A6","S2":"#FFB6A3","S3":"#FFBCA0","Mu":"#FFC29D","St":"#FFC89A","St2":"#FFCE97","GL":"#FFD494"};
const P={"hair":{"black":["#0F0E0E","#1C1A1A","#242121","#2E2A2A","#4C4644"],"navy":["#10141B","#1C2330","#232A38","#2A3242","#3E5A88"],"brown":["#25180F","#3D2718","#4D321F","#5C3B25","#8A6040"],"chestnut":["#361B11","#582C1C","#713823","#86432A","#B46A44"],"blonde":["#564724","#8F753B","#B5964C","#D8B25A","#F4DE9A"],"red":["#41170F","#6C2619","#893120","#A33A26","#D2663E"],"white":["#505254","#85878B","#A9ACB1","#C9CDD3","#F2F4F7"],"pink":["#573140","#8F516A","#B66786","#D97BA0","#F4B3CC"]},"skin":{"porcelain":{"i":"#F8E4D6","h":"#F2D8C7","e":"#E7BCA3","a":"#DFB195","7":"#AD795C","5":"#8E6147"},"light":{"i":"#F1D3B5","h":"#EBC8A8","e":"#E0AE8A","a":"#D9A47E","7":"#A8704E","5":"#8A5A3C"},"tan":{"i":"#E3B791","h":"#DDAD87","e":"#D3976F","a":"#CC8E65","7":"#9E613E","5":"#824E30"},"medium":{"i":"#C99364","h":"#C48B5D","e":"#BB794C","a":"#B57246","7":"#8C4E2B","5":"#733F21"},"brown":{"i":"#9A6644","h":"#96613F","e":"#8F5434","a":"#8B4F2F","7":"#6B361D","5":"#582C17"},"deep":{"i":"#66412B","h":"#633E28","e":"#5F3621","a":"#5C331E","7":"#472313","5":"#3A1C0E"}},"top":{"charcoal":{"C":["#3F4655","#2A3242","#262D3B","#1E2430","#1A1F29"],"O":["#2A3242","#262D3B","#222936","#1E2430","#1B202A"]},"white":{"C":["#EEF1F4","#ECEFF3","#D4D7DB","#AAACAF","#929497"],"O":["#ECEFF3","#D4D7DB","#C2C4C7","#AAACAF","#97999C"]},"navy":{"C":["#38496E","#22355E","#1F3055","#182644","#15213A"],"O":["#22355E","#1F3055","#1C2B4D","#182644","#16223C"]},"red":{"C":["#BF4943","#B8352E","#A63029","#842621","#72211D"],"O":["#B8352E","#A63029","#972B26","#842621","#76221D"]},"green":{"C":["#518760","#3E7A4E","#386E46","#2D5838","#264C30"],"O":["#3E7A4E","#386E46","#336440","#2D5838","#284E32"]},"mustard":{"C":["#DDAD4E","#D9A43A","#C39434","#9C762A","#876624"],"O":["#D9A43A","#C39434","#B28630","#9C762A","#8B6925"]},"sky":{"C":["#8CBAE1","#7FB2DE","#72A0C8","#5B80A0","#4F6E8A"],"O":["#7FB2DE","#72A0C8","#6892B6","#5B80A0","#51728E"]},"pink":{"C":["#E8A4BC","#E59AB5","#CE8BA3","#A56F82","#8E5F70"],"O":["#E59AB5","#CE8BA3","#BC7E94","#A56F82","#936374"]}},"pants":{"slate":["#4E5769","#3A4458","#333C4D","#29303E"],"night":["#333945","#1C2330","#191F2A","#141822"],"denim":["#5C79A4","#4A6A9A","#415D88","#344A6C"],"khaki":["#BCA479","#B49A6A","#9E885D","#7E6C4A"],"olive":["#6D744C","#5D6438","#525831","#414627"],"grey":["#878C94","#7A7F88","#6B7078","#55595F"]},"shoes":{"walnut":["#5A412F","#4C3728","#6E5848","#E8E6E0"],"black":["#24252B","#1F1F25","#3E3F44","#E8E6E0"],"white":["#E9E7E2","#C6C4C0","#ECEAE5","#B4B0A8"],"red":["#B8352E","#9C2D27","#C14D47","#E8E6E0"],"navy":["#22355E","#1D2D50","#3D4D71","#E8E6E0"],"tan":["#A87A4E","#8F6842","#B28A63","#E8E6E0"]},"swatch":{"hair":{"black":"#2E2A2A","navy":"#2A3242","brown":"#5C3B25","chestnut":"#86432A","blonde":"#D8B25A","red":"#A33A26","white":"#C9CDD3","pink":"#D97BA0"},"skin":{"porcelain":"#F8E4D6","light":"#F1D3B5","tan":"#E3B791","medium":"#C99364","brown":"#9A6644","deep":"#66412B"},"top":{"charcoal":"#2A3242","white":"#ECEFF3","navy":"#22355E","red":"#B8352E","green":"#3E7A4E","mustard":"#D9A43A","sky":"#7FB2DE","pink":"#E59AB5"},"pants":{"slate":"#3A4458","night":"#1C2330","denim":"#4A6A9A","khaki":"#B49A6A","olive":"#5D6438","grey":"#7A7F88"},"shoes":{"walnut":"#5A412F","black":"#24252B","white":"#E9E7E2","red":"#B8352E","navy":"#22355E","tan":"#A87A4E"}},"inner_dark":["#333945","#1C2330","#19202B","#141923","#11161E"],"inner_light":["#EEF1F4","#ECEFF3","#D4D7DB","#AAACAF","#929497"],"glasses":"#4C5468"};
const OPT=Object.freeze({
 hair:["none","short","swept","mid_curtain","mid","wavy","wavy_curtain","long","long_curtain"],
 hairColor:["black","navy","brown","chestnut","blonde","red","white","pink"],
 skin:["porcelain","light","tan","medium","brown","deep"],
 top:["nude","tee","tee_long","tee_graphic","shirt","shirt_tie","cardigan","cardigan_dots"],
 topColor:["charcoal","white","navy","red","green","mustard","sky","pink"],
 pants:["nude","trousers","trousers_ripped","baggy","baggy_ripped"],
 pantsColor:["slate","night","denim","khaki","olive","grey"],
 shoes:["nude","shoes","sneakers","boots","hightops"],
 shoesColor:["walnut","black","white","red","navy","tan"]});
const DEF={hairColor:"brown",skin:"light",topColor:"charcoal",pantsColor:"slate",shoesColor:"walnut"};
const DIRS=["se","sw","ne","nw"];
const hx=c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
function norm(s){const o={...DEF};for(const k of Object.keys(OPT))if(s&&OPT[k].includes(s[k]))o[k]=s[k];for(const k of ["top","pants","shoes","hair"])if(!o[k])o[k]=k==="hair"?"none":"nude";return o}
// key colour → display colour for one appearance (same mapping as the customizer)
function lookup(spec){
 const ch=norm(spec),hm=P.hair[ch.hairColor],sk=P.skin[ch.skin],tc=ch.topColor,T=P.top[tc],m={};
 for(let i=0;i<5;i++)m["H"+i]=hm[i];m.B=hm[0];m.Mu=hm[1];
 for(const k in sk)m["K"+k]=sk[k];
 m.St=mix(hx(sk.i),hx(hm[1]),.16);m.St2=mix(hx(sk.i),hx(hm[1]),.28);
 const card=ch.top.indexOf("cardigan")===0,tsum=hx(P.swatch.top[tc]).reduce((a,b)=>a+b,0);
 const C=card?(tsum>360?P.inner_dark:P.inner_light):T.C,O=card?T.O:[C[1],C[2],C[3],C[3],C[4]];
 for(let i=0;i<5;i++){m["C"+(i+1)]=C[i];m["O"+(i+1)]=O[i]}m.OD=tc==="white"?"#2A3242":"#ECF0F4";
 const pp=P.pants[ch.pantsColor];for(let i=0;i<4;i++)m["P"+(i+1)]=pp[i];
 const s=P.shoes[ch.shoesColor];m.S0=s[0];m.S1=s[1];m.S2=s[2];m.S3=s[3];m.GL=P.glasses;
 const M=new Map();
 for(const code in K){const k=hx(K[code]),v=m[code];if(v==null)continue;M.set((k[0]<<16)|(k[1]<<8)|k[2],typeof v==="string"?hx(v):v)}
 return M;
}
function recolor(data,M){for(let i=0;i<data.length;i+=4){if(data[i+3]!==255)continue;const t=M.get((data[i]<<16)|(data[i+1]<<8)|data[i+2]);if(t){data[i]=t[0];data[i+1]=t[1];data[i+2]=t[2]}}return data}
const strips=new Map();
function strip(path){
 if(strips.has(path))return strips.get(path);
 const p=new Promise((res)=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=(root.LGRDB_BASE||"")+"media/lgr1/mh-wear/"+path+".png"});
 strips.set(path,p);return p;
}
/* New canonical wardrobe: ONLY approved Pakaian v2 tied to current Genesis rig.
 * Hair retains the old art fallback because its head geometry was preserved.
 * Tops, pants, shoes, glasses and facial do NOT fall back to retired V6P art.
 */
const OFFICIAL_REF_IDS=new Set([
 "male_top_tee","female_top_tee",
 "male_pants_trousers","female_pants_trousers",
 "male_shoes_shoes","female_shoes_shoes"
]);
const approvedRefs=new Map();
async function referenceMaster(id){
 if(!OFFICIAL_REF_IDS.has(id))return null;
 if(!approvedRefs.has(id)){
  const url=(root.LGRDB_BASE||"")+"media/lgr1/wardrobe-approved/"+id+".json";
  const promise=(async()=>{try{
   const result=await root.fetch(url,{cache:"no-cache"});
   if(!result.ok)return null;
   const entry=await result.json();
   if(entry?.format!=="lgr1-pakaian-v2"||entry.id!==id||entry.approved!==true)return null;
   return entry;
  }catch{return null}})();
  approvedRefs.set(id,promise);
 }
 return approvedRefs.get(id);
}
function imageForMaster(entry,path,prefix){
 const key=prefix+"|"+entry.id+"|"+entry.rev+"|"+entry.updated+"|"+path;
 if(!strips.has(key)){
  const im=new Image(),p=new Promise(res=>{im.onload=()=>res(im);im.onerror=()=>res(null)});
  im.src=entry.files[path];strips.set(key,p);
 }
 return strips.get(key);
}
async function activeStrip(path,gender){
 const category=path.split("/")[0],base=path.split("/")[1];
 const variant=category==="hair"?base.replace(/_(front|back)$/,""):
   category==="top"?base.replace(/_back(_f)?$/,"").replace(/_f$/,""):
   ["pants","shoes"].includes(category)?base.replace(/_f$/,""):base;
 const id=gender+"_"+category+"_"+variant;
 let live=null;
 try{live=(await root?.LGRActor?.loadBases?.())?.[gender]}catch{}
 const compatible=entry=>Boolean(entry&&entry.format==="lgr1-pakaian-v2"&&
  entry.id===id&&entry.gender===gender&&entry.group===category&&
  entry.variant===variant&&entry.approved===true&&entry.files?.[path]&&
  live?.pkg?.rigSha256===entry.baseRigSha256&&live?.version===entry.baseVersion);
 // For the six artist-approved BASE garments, a superseded local/cloud
 // Pakaian master must NOT silently hide the latest 2026-11-13 baseline.
 // Newer explicit master approvals still take priority. All other variants
 // retain their original approved-master-only behaviour.
 const saved=root?.LGRDB?.get?.("pakaian",id);
 if(OFFICIAL_REF_IDS.has(id)){
  const fallback=await referenceMaster(id);
  if(compatible(fallback)){
   const savedIsNewer=compatible(saved)&&Date.parse(saved.updated||"")>Date.parse(fallback.updated||"");
   return savedIsNewer?imageForMaster(saved,path,"approved"):imageForMaster(fallback,path,"canonical");
  }
 }
 if(compatible(saved))return imageForMaster(saved,path,"approved");
 return category==="hair"?strip(path):null;
}
function clearCache(){strips.clear();approvedRefs.clear()}
// spec {top,topColor,pants,pantsColor,shoes,shoesColor,hair,hairColor}; gender; skin tone
// → {pants:{se:dataURL,…}, top:…, top_back:…, shoes:…, hair_back:…, hair_front:…}
function previewWearOn(){return !!(root.LGR_PREVIEW_WEAR||root.LGR1Raster&&root.LGR1Raster.LOWER_SPRITES)}
function previewWearName(outfit,seated){
 if(outfit==="pants"||outfit==="trousers")return "trousers_a";
 if(outfit==="skirt")return seated?"skirt_a_seat":"skirt_a";
 return null;
}
function previewWearUrl(name,gender){
 const f=gender==="female"?"_f":"";
 const base=root.LGR_LOWER_WEAR||((root.LGRDB_BASE||"")+"media/lgr1/mh-wear/preview/");
 return base+name+f+".png";
}
function loadPreviewWearImage(name,gender){
 const url=previewWearUrl(name,gender);
 if(strips.has(url))return strips.get(url);
 const p=new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=url});
 strips.set(url,p);return p;
}
async function layers(spec,gender,tone,opts){
 const ch=norm({...spec,skin:tone}),f=gender==="female"?"_f":"",M=lookup(ch),files={};
 if(ch.top!=="nude"){files.top_back="top/"+ch.top+"_back"+f;files.top="top/"+ch.top+f}
 if(ch.pants!=="nude")files.pants="pants/"+ch.pants+f;
 if(ch.shoes!=="nude")files.shoes="shoes/"+ch.shoes+f;
 if(ch.hair!=="none"){files.hair_back="hair/"+ch.hair+"_back";files.hair_front="hair/"+ch.hair+"_front"}
 const seated=!!(opts&&opts.seated),preview=previewWearOn(),wantSkirt=(opts&&opts.outfit)==="skirt"||ch.pants==="skirt";
 const previewName=preview?previewWearName(wantSkirt?"skirt":(ch.pants==="trousers"||ch.pants==="pants"?"pants":null),seated):null;
 const out={};layers.lastWearId=previewName||"official";
 for(const [layer,path] of Object.entries(files)){
  let im=null;
  if(layer==="pants"&&previewName)im=await loadPreviewWearImage(previewName,gender);
  if(!im)im=await activeStrip(path,gender);if(!im)continue;out[layer]={};
  for(let di=0;di<4;di++){
   const c=document.createElement("canvas");c.width=64;c.height=112;const g=c.getContext("2d",{willReadFrequently:true});
   g.drawImage(im,di*64,0,64,112,0,0,64,112);const d=g.getImageData(0,0,64,112);recolor(d.data,M);
   let any=false;for(let i=3;i<d.data.length;i+=4)if(d.data[i]){any=true;break}
   if(!any)continue;g.putImageData(d,0,0);out[layer][DIRS[di]]=c.toDataURL("image/png");
  }
 }
 return out;
}
return Object.freeze({OPT,P,K,norm,lookup,recolor,layers,activeStrip,clearCache,previewWearOn,previewWearName,previewWearUrl,loadPreviewWearImage});
});
