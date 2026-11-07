/* v6p layered compositor — port of archived Character Creator (voc6 / office.html @ 16054af).
 * Layer order, sheet size, frames, palette keys, and cmap/files() match the original.
 * Additive preview hooks only: D points at site/media/v6p/, face option "blank",
 * clothing option "nude", Emosi overlay stamped last (after hair_front/glasses and fx;
 * not drawn on NE/NW back views), old brows omitted when the blank face is selected.
 */
(function(root,factory){
 "use strict";
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root){
  root.V6PCompositor=api;
  root.__v6=api;
 }
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(root){
"use strict";
const D="./media/v6p/";
const K={"H0":"#FF08FA","H1":"#FF0EF7","H2":"#FF14F4","H3":"#FF1AF1","H4":"#FF20EE","B":"#FF26EB","Ki":"#FF2CE8","Kh":"#FF32E5","Ke":"#FF38E2","Ka":"#FF3EDF","K7":"#FF44DC","K5":"#FF4AD9","C1":"#FF50D6","C2":"#FF56D3","C3":"#FF5CD0","C4":"#FF62CD","C5":"#FF68CA","O1":"#FF6EC7","O2":"#FF74C4","O3":"#FF7AC1","O4":"#FF80BE","O5":"#FF86BB","OD":"#FF8CB8","P1":"#FF92B5","P2":"#FF98B2","P3":"#FF9EAF","P4":"#FFA4AC","S0":"#FFAAA9","S1":"#FFB0A6","S2":"#FFB6A3","S3":"#FFBCA0","Mu":"#FFC29D","St":"#FFC89A","St2":"#FFCE97","GL":"#FFD494"};
const P={"hair":{"black":["#0F0E0E","#1C1A1A","#242121","#2E2A2A","#4C4644"],"navy":["#10141B","#1C2330","#232A38","#2A3242","#3E5A88"],"brown":["#25180F","#3D2718","#4D321F","#5C3B25","#8A6040"],"chestnut":["#361B11","#582C1C","#713823","#86432A","#B46A44"],"blonde":["#564724","#8F753B","#B5964C","#D8B25A","#F4DE9A"],"red":["#41170F","#6C2619","#893120","#A33A26","#D2663E"],"white":["#505254","#85878B","#A9ACB1","#C9CDD3","#F2F4F7"],"pink":["#573140","#8F516A","#B66786","#D97BA0","#F4B3CC"]},"skin":{"porcelain":{"i":"#F8E4D6","h":"#F2D8C7","e":"#E7BCA3","a":"#DFB195","7":"#AD795C","5":"#8E6147"},"light":{"i":"#F1D3B5","h":"#EBC8A8","e":"#E0AE8A","a":"#D9A47E","7":"#A8704E","5":"#8A5A3C"},"tan":{"i":"#E3B791","h":"#DDAD87","e":"#D3976F","a":"#CC8E65","7":"#9E613E","5":"#824E30"},"medium":{"i":"#C99364","h":"#C48B5D","e":"#BB794C","a":"#B57246","7":"#8C4E2B","5":"#733F21"},"brown":{"i":"#9A6644","h":"#96613F","e":"#8F5434","a":"#8B4F2F","7":"#6B361D","5":"#582C17"},"deep":{"i":"#66412B","h":"#633E28","e":"#5F3621","a":"#5C331E","7":"#472313","5":"#3A1C0E"}},"top":{"charcoal":{"C":["#3F4655","#2A3242","#262D3B","#1E2430","#1A1F29"],"O":["#2A3242","#262D3B","#222936","#1E2430","#1B202A"]},"white":{"C":["#EEF1F4","#ECEFF3","#D4D7DB","#AAACAF","#929497"],"O":["#ECEFF3","#D4D7DB","#C2C4C7","#AAACAF","#97999C"]},"navy":{"C":["#38496E","#22355E","#1F3055","#182644","#15213A"],"O":["#22355E","#1F3055","#1C2B4D","#182644","#16223C"]},"red":{"C":["#BF4943","#B8352E","#A63029","#842621","#72211D"],"O":["#B8352E","#A63029","#972B26","#842621","#76221D"]},"green":{"C":["#518760","#3E7A4E","#386E46","#2D5838","#264C30"],"O":["#3E7A4E","#386E46","#336440","#2D5838","#284E32"]},"mustard":{"C":["#DDAD4E","#D9A43A","#C39434","#9C762A","#876624"],"O":["#D9A43A","#C39434","#B28630","#9C762A","#8B6925"]},"sky":{"C":["#8CBAE1","#7FB2DE","#72A0C8","#5B80A0","#4F6E8A"],"O":["#7FB2DE","#72A0C8","#6892B6","#5B80A0","#51728E"]},"pink":{"C":["#E8A4BC","#E59AB5","#CE8BA3","#A56F82","#8E5F70"],"O":["#E59AB5","#CE8BA3","#BC7E94","#A56F82","#936374"]}},"pants":{"slate":["#4E5769","#3A4458","#333C4D","#29303E"],"night":["#333945","#1C2330","#191F2A","#141822"],"denim":["#5C79A4","#4A6A9A","#415D88","#344A6C"],"khaki":["#BCA479","#B49A6A","#9E885D","#7E6C4A"],"olive":["#6D744C","#5D6438","#525831","#414627"],"grey":["#878C94","#7A7F88","#6B7078","#55595F"]},"shoes":{"walnut":["#5A412F","#4C3728","#6E5848","#E8E6E0"],"black":["#24252B","#1F1F25","#3E3F44","#E8E6E0"],"white":["#E9E7E2","#C6C4C0","#ECEAE5","#B4B0A8"],"red":["#B8352E","#9C2D27","#C14D47","#E8E6E0"],"navy":["#22355E","#1D2D50","#3D4D71","#E8E6E0"],"tan":["#A87A4E","#8F6842","#B28A63","#E8E6E0"]},"swatch":{"hair":{"black":"#2E2A2A","navy":"#2A3242","brown":"#5C3B25","chestnut":"#86432A","blonde":"#D8B25A","red":"#A33A26","white":"#C9CDD3","pink":"#D97BA0"},"skin":{"porcelain":"#F8E4D6","light":"#F1D3B5","tan":"#E3B791","medium":"#C99364","brown":"#9A6644","deep":"#66412B"},"top":{"charcoal":"#2A3242","white":"#ECEFF3","navy":"#22355E","red":"#B8352E","green":"#3E7A4E","mustard":"#D9A43A","sky":"#7FB2DE","pink":"#E59AB5"},"pants":{"slate":"#3A4458","night":"#1C2330","denim":"#4A6A9A","khaki":"#B49A6A","olive":"#5D6438","grey":"#7A7F88"},"shoes":{"walnut":"#5A412F","black":"#24252B","white":"#E9E7E2","red":"#B8352E","navy":"#22355E","tan":"#A87A4E"}},"inner_dark":["#333945","#1C2330","#19202B","#141923","#11161E"],"inner_light":["#EEF1F4","#ECEFF3","#D4D7DB","#AAACAF","#929497"],"glasses":"#4C5468"};
const FR={"short":"bangs","swept":"swept","mid_curtain":"curtain","mid":"bangs","wavy":"bangs","wavy_curtain":"curtain","long":"bangs","long_curtain":"curtain"};
const OPT={
  hair:['short','swept','mid_curtain','mid','wavy','wavy_curtain','long','long_curtain'],
  hairColor:['black','navy','brown','chestnut','blonde','red','white','pink'],
  skin:['porcelain','light','tan','medium','brown','deep'],
  top:['tee','tee_long','tee_graphic','shirt','shirt_tie','cardigan','cardigan_dots','nude'],
  topColor:['charcoal','white','navy','red','green','mustard','sky','pink'],
  pants:['trousers','trousers_ripped','baggy','baggy_ripped','nude'],
  pantsColor:['slate','night','denim','khaki','olive','grey'],
  shoes:['shoes','sneakers','boots','hightops','nude'],
  shoesColor:['walnut','black','white','red','navy','tan'],
  glasses:['none','round','square'],
  facial:['none','mustache','stubble','both'],
  gender:['male','female','other'],
  face:['blank']
};
const DEF={v:6,gender:'male',body:'male',hair:'mid_curtain',hairColor:'navy',skin:'light',top:'tee',topColor:'charcoal',pants:'trousers',pantsColor:'slate',shoes:'shoes',shoesColor:'walnut',glasses:'none',facial:'none',face:'blank'};
const VAR=['blink','emb','sleepy','smile','happy','sad','angry','surpr'];
const W=384,H=4928,FW=64,FH=112,PIVOT=[32,100];
const DIRS=['se','sw','ne','nw'];
const ROWS={walk:0,idle:4,talk:8,sit:12,sit_type:16,sleep:20,tired:24,swim:28,float:32,lie:36,perch:40};
const FRAMES={walk:6,idle:4,talk:4,sit:4,sit_type:4,sleep:4,tired:4,swim:6,float:4,lie:4,perch:4};
function norm(ch){
  const o=Object.assign({},DEF);
  if(ch) for(const k in OPT) if(OPT[k].includes(ch[k])) o[k]=ch[k];
  o.body=ch&&(ch.body==='female'||ch.body==='male')?ch.body:(o.gender==='female'?'female':'male');
  return o;
}
const hx=c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
function cmap(ch){ const hm=P.hair[ch.hairColor], sk=P.skin[ch.skin], tc=ch.topColor, T=P.top[tc], m={};
  for(let i=0;i<5;i++) m['H'+i]=hm[i]; m.B=hm[0]; m.Mu=hm[1];
  for(const k in sk) m['K'+k]=sk[k];
  m.St=mix(hx(sk.i),hx(hm[1]),.16); m.St2=mix(hx(sk.i),hx(hm[1]),.28);
  const card=ch.top.indexOf('cardigan')===0, tsum=hx(P.swatch.top[tc]).reduce((a,b)=>a+b,0);
  const C=card?(tsum>360?P.inner_dark:P.inner_light):T.C, O=card?T.O:[C[1],C[2],C[3],C[3],C[4]];
  for(let i=0;i<5;i++){ m['C'+(i+1)]=C[i]; m['O'+(i+1)]=O[i]; } m.OD=tc==='white'?'#2A3242':'#ECF0F4';
  const p=P.pants[ch.pantsColor]; for(let i=0;i<4;i++) m['P'+(i+1)]=p[i];
  const s=P.shoes[ch.shoesColor]; m.S0=s[0]; m.S1=s[1]; m.S2=s[2]; m.S3=s[3]; m.GL=P.glasses;
  const M=new Map(); for(const code in K){ const k=hx(K[code]), v=m[code]; if(v==null) continue; const c=typeof v==='string'?hx(v):v; M.set((k[0]<<16)|(k[1]<<8)|k[2],(255<<24)|(c[2]<<16)|(c[1]<<8)|c[0]); } return M; }
function files(ch,fs){
  const sh=ch.shoes, fa=ch.facial, b=ch.body==='female'?'_f':'';
  const blank=ch.face==='blank';
  const faceKey=blank?'blank':(fs||'baked');
  return [
    'hair/'+ch.hair+'_back',
    'base/body'+b,
    'top/'+ch.top+'_back'+b,
    'shoes/'+sh+b,
    'pants/'+ch.pants+b,
    (sh==='boots'||sh==='hightops')?'shoes/'+sh+'_over'+b:null,
    'top/'+ch.top+b,
    'base/body_front'+b,
    'face/'+(ch.body==='female'?'f':'m')+'_'+faceKey,
    fa!=='none'?'facial/'+fa+(faceKey==='surpr'?'_surpr':''):null,
    'hair/'+ch.hair+'_front',
    ch.glasses!=='none'?'glasses/'+ch.glasses:null,
    blank?null:'brows/'+(FR[ch.hair]||'bangs')+'_'+faceKey
  ].filter(Boolean);
}
function isFrontLayer(name){
  return (name.indexOf('hair/')===0&&name.slice(-6)==='_front')||name.indexOf('glasses/')===0;
}
let LAST_MISSING=[];
let GEN=0;
const IM={};
const img=src=>{
  const override=(typeof root!=="undefined"&&root&&root.V6PPartOverrides&&root.V6PPartOverrides.urlFor(src))||null;
  const key=(override||src)+'#'+GEN;
  return IM[key]||(IM[key]=new Promise(res=>{
    const i=new Image();
    i.onload=()=>res(i);
    i.onerror=()=>{ delete IM[key]; res(null); };
    i.src=override||(D+src+'.png?v='+GEN);
  }));
};
function recolor(cv,ch){
  const c=cv.getContext('2d',{willReadFrequently:true});
  const id=c.getImageData(0,0,cv.width,cv.height), u=new Uint32Array(id.data.buffer), M=cmap(ch);
  for(let i=0;i<u.length;i++){
    const v=u[i];
    if((v>>>24)!==255||(v&255)!==255) continue;
    const k=((v&255)<<16)|(((v>>>8)&255)<<8)|((v>>>16)&255), r=M.get(k);
    if(r!==undefined) u[i]=r;
  }
  c.putImageData(id,0,0);
}
function opaqueAnchor(img,sx,sy){
  if(!img) return null;
  const cv=document.createElement('canvas'); cv.width=FW; cv.height=FH;
  const c=cv.getContext('2d',{willReadFrequently:true});
  c.drawImage(img,sx,sy,FW,FH,0,0,FW,FH);
  const d=c.getImageData(0,0,FW,FH).data;
  let top=FH,left=FW;
  for(let y=0;y<FH;y++) for(let x=0;x<FW;x++){
    if(d[(y*FW+x)*4+3]<16) continue;
    if(y<top) top=y;
    if(x<left) left=x;
  }
  if(top===FH) return null;
  return {top,left};
}
function stampEmosi(c,emosi,blankImg){
  if(!emosi||!emosi.complete||!emosi.naturalWidth) return;
  const eFrames=Math.max(1,Math.round(emosi.naturalWidth/FW));
  const idleAnchors=DIRS.map((_,di)=>opaqueAnchor(blankImg,0,(ROWS.idle+di)*FH));
  for(const [action,row0] of Object.entries(ROWS)){
    const nf=FRAMES[action]||4;
    for(let di=0;di<4;di++){
      if(DIRS[di]==='ne'||DIRS[di]==='nw') continue;
      const idleA=idleAnchors[di];
      for(let f=0;f<nf;f++){
        const ef=f%eFrames;
        let dx=0,dy=0;
        const cellA=opaqueAnchor(blankImg,f*FW,(row0+di)*FH);
        if(idleA&&cellA){ dx+=cellA.left-idleA.left; dy+=cellA.top-idleA.top; }
        else {
          const seCell=opaqueAnchor(blankImg,f*FW,row0*FH);
          if(idleAnchors[0]&&seCell) dy+=seCell.top-idleAnchors[0].top;
        }
        const dxs=f*FW+dx, dys=(row0+di)*FH+dy;
        c.drawImage(emosi,ef*FW,di*FH,FW,FH,dxs,dys,FW,FH);
      }
    }
  }
}
async function compose(ch,fs,emosi){
  ch=norm(ch);
  fs=fs||'baked';
  const names=files(ch,fs);
  const baseNames=names.filter(n=>!isFrontLayer(n));
  const frontNames=names.filter(isFrontLayer);
  const needed=baseNames.concat(frontNames).concat(['base/shadow','base/fx']);
  const L=await Promise.all(needed.map(img));
  if(L.some(x=>!x)){
    LAST_MISSING=needed.filter((_,i)=>!L[i]);
    return null;
  }
  LAST_MISSING=[];
  const fx=L.pop(), shd=L.pop();
  const fronts=L.splice(baseNames.length);
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  const c=cv.getContext('2d',{willReadFrequently:true});
  c.imageSmoothingEnabled=false;
  L.forEach(i=>c.drawImage(i,0,0));
  recolor(cv,ch);
  if(fronts.length){
    const tmp=document.createElement('canvas'); tmp.width=W; tmp.height=H;
    const t=tmp.getContext('2d',{willReadFrequently:true});
    t.imageSmoothingEnabled=false;
    fronts.forEach(i=>t.drawImage(i,0,0));
    recolor(tmp,ch);
    c.drawImage(tmp,0,0);
  }
  c.globalCompositeOperation='destination-over'; c.drawImage(shd,0,0);
  c.globalCompositeOperation='source-over'; c.drawImage(fx,0,0);
  if(emosi){
    const faceName=baseNames.find(n=>n.indexOf('face/')===0);
    const blankImg=faceName?L[baseNames.indexOf(faceName)]:null;
    stampEmosi(c,emosi,blankImg);
  }
  return cv;
}
const key=(ch,emosiId)=>{
  const n=norm(ch);
  return [n.body,n.hair,n.hairColor,n.skin,n.top,n.topColor,n.pants,n.pantsColor,n.shoes,n.shoesColor,n.glasses,n.facial,n.face,emosiId||''].join('.');
};
const SC={},SU={},FX={};
function sheet(ch,emosi,emosiId){
  const k=key(ch,emosiId);
  if(SC[k]) return SC[k];
  return SC[k]=compose(ch,'baked',emosi).then(cv=>{
    if(!cv){ delete SC[k]; return null; }
    cv._k=k; return cv;
  });
}
function variant(ch,fs,emosi,emosiId){
  const k=key(ch,emosiId)+'|'+fs;
  if(FX[k]) return FX[k];
  return FX[k]=compose(ch,fs,emosi).then(cv=>{
    if(!cv) delete FX[k]; else cv._k=k; return cv;
  });
}
function extractClip(sheetCv,action){
  const row0=ROWS[action];
  const nf=FRAMES[action]||4;
  if(row0==null) return null;
  const out=document.createElement('canvas');
  out.width=nf*FW; out.height=4*FH;
  const c=out.getContext('2d');
  c.imageSmoothingEnabled=false;
  c.drawImage(sheetCv,0,row0*FH,nf*FW,4*FH,0,0,nf*FW,4*FH);
  return {canvas:out,frames:nf,action};
}
function extractFrame(sheetCv,action,dir,frame){
  const row0=ROWS[action];
  const nf=FRAMES[action]||4;
  const di=Math.max(0,DIRS.indexOf(dir));
  const f=((frame%nf)+nf)%nf;
  const out=document.createElement('canvas');
  out.width=FW; out.height=FH;
  const c=out.getContext('2d');
  c.imageSmoothingEnabled=false;
  c.drawImage(sheetCv,f*FW,(row0+di)*FH,FW,FH,0,0,FW,FH);
  return out;
}
function clearCache(){
  GEN+=1;
  for(const k of Object.keys(IM)) delete IM[k];
  for(const k of Object.keys(SC)) delete SC[k];
  for(const k of Object.keys(FX)) delete FX[k];
  for(const k of Object.keys(SU)) delete SU[k];
}
return {OPT,DEF,VAR,P,K,FR,D,W,H,FW,FH,PIVOT,DIRS,ROWS,FRAMES,norm,cmap,files,compose,sheet,variant,key,extractClip,extractFrame,clearCache,img,get missing(){return LAST_MISSING.slice();}};
});
