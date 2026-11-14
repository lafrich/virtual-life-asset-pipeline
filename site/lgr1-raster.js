/* LGR-1 raster — pure, deterministic 64×112 pixel puppet rasterizer.
 * The SAME algorithm is mirrored line-for-line in genesis_procedural_runtime.py
 * (tests/test_lgr1_parity.py asserts 0 differing pixels).
 *
 * - Layer groups: BACK (hair_back) → MAIN (body … body_front) → Emosi face →
 *   FRONT (hair_front, accessory). Back hair therefore stays behind the torso
 *   and top, and front hair/bangs stay over the face.
 * - Per-direction draw order of the 11 parts (pelvis root → torso → head/arms; pelvis → legs) (optional per-frame override).
 * - Joint caps + hidden fill: each parent keeps an underlay copied from the
 *   child pixels around the joint pivot (cap) and, for children drawn in
 *   front of it, the row continuation of the parent behind the child (fill).
 *   At the neutral pose these underlays are fully covered, so the source art
 *   is unchanged; in motion they close hip/crotch/shoulder/knee/elbow gaps.
 * - Rotation: right angles use exact nearest sampling; other angles sample a
 *   Scale2x×3 (8×) up-scaled piece, RotSprite-style, so limbs keep clean
 *   pixel clusters instead of dropping pixels.
 * - Custom Wear inherits the body mask; wear pixels outside the visible body
 *   outline go to the nearest body part (multi-source BFS from the visible,
 *   assigned body pixels), optional per-outfit tweak. Hair always → head.
 */
(function(root,factory){"use strict";const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.LGR1Raster=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
"use strict";
const W=64,H=112,N=W*H;
// Overflow canvas (option A, preview). Logical 64x112 + pivot (32,100) stay the contract.
// Flags default off so live/tests stay pixel-identical. Twin of genesis_procedural_runtime.py.
const BW=128,BH=128,OX=32,OY=16,LEGACY_GEOM={cw:W,ch:H,ox:0,oy:0,cn:N},OVERFLOW_GEOM={cw:BW,ch:BH,ox:OX,oy:OY,cn:BW*BH};
let LOWER_SPRITES=false,CANVAS="legacy64",W4=false; // W4: preview-only joint-safe wear (tee_v4/trousers_v4), needs jointMode v4
const LEG_PARTS=Object.freeze(["leg_far_upper","leg_far_lower","leg_near_upper","leg_near_lower"]);
const PARTS=Object.freeze(["leg_far_upper","leg_far_lower","arm_far_upper","arm_far_lower",
 "torso","leg_near_upper","leg_near_lower","arm_near_upper","arm_near_lower","head","pelvis"]);
const PARENTS=Object.freeze({pelvis:null,torso:"pelvis",head:"torso",
 arm_near_upper:"torso",arm_near_lower:"arm_near_upper",
 arm_far_upper:"torso",arm_far_lower:"arm_far_upper",
 leg_near_upper:"pelvis",leg_near_lower:"leg_near_upper",
 leg_far_upper:"pelvis",leg_far_lower:"leg_far_upper"});
const DRAW_ORDER=Object.freeze(["leg_far_lower","leg_far_upper","arm_far_lower","arm_far_upper",
 "pelvis","torso","leg_near_lower","leg_near_upper","arm_near_upper","arm_near_lower","head"]);
const GROUPS=Object.freeze([
 ["back",Object.freeze(["hair_back"])],
 ["main",Object.freeze(["body","pants","shoes","top_back","top","body_front"])],
 ["front",Object.freeze(["hair_front","accessory"])]]);
const LAYERS=Object.freeze(["hair_back","body","pants","shoes","top_back","top","body_front","hair_front","accessory"]);
const CAP_RADIUS=Object.freeze({pelvis:0,torso:3,head:2,arm_near_upper:3,arm_near_lower:3,arm_far_upper:3,arm_far_lower:3,
 leg_near_upper:3,leg_near_lower:3,leg_far_upper:3,leg_far_lower:3});
const INHERIT=254,UNASSIGNED=255;
const DEG=Math.PI/180;
const div255=x=>Math.floor((x+127)/255);
function over(dst,i,r,g,b,a){
 if(a===0)return;
 const o=i*4;
 if(a===255||dst[o+3]===0){dst[o]=r;dst[o+1]=g;dst[o+2]=b;dst[o+3]=a;return}
 const da=dst[o+3],inv=255-a,oa=a+div255(da*inv),den=oa*255;
 const mix=(s,d)=>{const num=s*a*255+d*da*inv;return Math.floor((2*num+den)/(2*den))};
 dst[o]=mix(r,dst[o]);dst[o+1]=mix(g,dst[o+1]);dst[o+2]=mix(b,dst[o+2]);dst[o+3]=oa;
}
function expandMask(mask){
 // Multi-source BFS: every unassigned cell takes the part of the nearest
 // assigned cell (4-neighbour distance, FIFO + fixed neighbour order).
 const out=Uint8Array.from(mask),queue=new Int32Array(N);let head=0,tail=0;
 for(let k=0;k<N;k++)if(out[k]!==UNASSIGNED)queue[tail++]=k;
 while(head<tail){
  const k=queue[head++],x=k%W,owner=out[k];
  const nb=[k>=W?k-W:-1,x>0?k-1:-1,x<W-1?k+1:-1,k+W<N?k+W:-1];
  for(const n of nb)if(n>=0&&out[n]===UNASSIGNED){out[n]=owner;queue[tail++]=n}
 }
 return out;
}
function bodyMask(mask,layers){
 // Mask restricted to pixels where the master body art is visible.
 const out=new Uint8Array(N).fill(UNASSIGNED);
 for(const l of LAYERS){const src=layers[l];if(!src)continue;
  for(let k=0;k<N;k++)if(src[k*4+3])out[k]=mask[k]}
 return out;
}
function validOrder(order){
 return Array.isArray(order)&&order.length===PARTS.length&&PARTS.every(p=>order.includes(p));
}
function bboxOf(img){
 let x0=W,y0=H,x1=-1,y1=-1;
 for(let k=0;k<N;k++)if(img[k*4+3]){const x=k%W,y=(k-x)/W;
  if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
 return x1<0?null:[x0,y0,x1,y1];
}
// Joint mode (twin of genesis_procedural_runtime.JOINT_MODE). "v2" = joint-fix preview:
// leg slice clean-up + hip/knee pivots (fixSlice), no radius caps except the head, no JOINT_FILL,
// rounded joint capsules in the child's own colours (buildBalls, hidden at rest) and a pinhole-only
// fill. "legacy" = caps + JOINT_FILL as before.
const JOINT_MODE="v2",SH_DY=0,RAISE_FRONT=120,HIP_CENTRE=false,V4_CRACK=false,KNEE_Y=90,HIP_Y=0,PINHOLE=2,BALL_MAX_R=4; // HIP_Y 0 = keep the artist hip pivots
const hx=h=>parseInt(h.replace("#",""),16);
const V4_FAM=new Map();
for(const f of ["#FF2CE8","#FF32E5","#FF38E2","#FF3EDF"])V4_FAM.set(hx(f),hx("#FF44DC"));
for(const f of ["#FF92B5","#FF98B2","#FF9EAF"])V4_FAM.set(hx(f),hx("#FFA4AC"));
for(const f of ["#FF50D6","#FF56D3","#FF5CD0"])V4_FAM.set(hx(f),hx("#FF62CD"));
const V4_OUTL=new Set([hx("#FF44DC"),hx("#FFA4AC"),hx("#FF62CD"),hx("#FF68CA"),hx("#FF4AD9")]);
const N4D=[[0,1],[0,-1],[1,0],[-1,0]];
const N8D=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dy||dx)N8D.push([dy,dx]);
let JOINT_MODE_CUR=JOINT_MODE;
function runsOf(xs){const out=[];let cur=[];
 for(const x of xs){if(cur.length&&x===cur[cur.length-1]+1)cur.push(x);else{if(cur.length)out.push(cur);cur=[x]}}
 if(cur.length)out.push(cur);return out}
function fixSlice(mask,pivots){
 const out=Uint8Array.from(mask),pv={};for(const k of Object.keys(pivots))pv[k]={x:pivots[k].x,y:pivots[k].y};
 const PEL=PARTS.indexOf("pelvis"),LEG={near:[PARTS.indexOf("leg_near_upper"),PARTS.indexOf("leg_near_lower")],
  far:[PARTS.indexOf("leg_far_upper"),PARTS.indexOf("leg_far_lower")]};
 const legset=new Set([LEG.near[0],LEG.near[1],LEG.far[0],LEG.far[1],PEL]);
 let top=-1;for(let k=0;k<N;k++)if(out[k]===LEG.far[0]){top=(k-k%W)/W;break}
 if(top<0)return {mask:out,pivots:pv};
 const row=y=>{const xs=[];for(let x=0;x<W;x++)if(legset.has(out[y*W+x]))xs.push(x);return xs};
 let c=top;while(c<KNEE_Y&&runsOf(row(c)).length<2)c++;
 if(c>=KNEE_Y){const pv0={};for(const k of Object.keys(pivots))pv0[k]={x:pivots[k].x,y:pivots[k].y};return {mask:Uint8Array.from(mask),pivots:pv0}}
 const hipx={near:pv.leg_near_upper.x,far:pv.leg_far_upper.x},cent=new Map();
 for(let y=c;y<H;y++)for(const run of runsOf(row(y))){
  const m=(run[0]+run[run.length-1]+1)/2,side=Math.abs(hipx.near-m)<=Math.abs(hipx.far-m)?"near":"far";
  for(const x of run){const o=mask[y*W+x],s=LEG.near.includes(o)?"near":LEG.far.includes(o)?"far":side;out[y*W+x]=LEG[s][y<KNEE_Y?0:1]}
  const key=side+"|"+y;if((y===c||y===KNEE_Y)&&!cent.has(key))cent.set(key,Math.floor(m+0.5));
 }
 const ul=new Set([LEG.near[0],LEG.near[1],LEG.far[0],LEG.far[1]]);
 for(let k=0;k<c*W;k++)if(ul.has(out[k]))out[k]=PEL;
 for(const s of ["near","far"]){
  if(HIP_Y&&cent.has(s+"|"+c))pv["leg_"+s+"_upper"]={x:cent.get(s+"|"+c),y:HIP_Y};
  if(cent.has(s+"|"+KNEE_Y))pv["leg_"+s+"_lower"]={x:cent.get(s+"|"+KNEE_Y),y:KNEE_Y};
 }
 return {mask:out,pivots:pv};
}
function seamRun(img,pv){
 const px=pv.x,py=pv.y;
 for(const dy of [0,1,2,-1,3,4,5,6,7,8]){
  const y=py+dy;if(y<0||y>=H)continue;
  const xs=[];for(let x=Math.max(0,px-5);x<Math.min(W,px+5);x++)if(img[(y*W+x)*4+3]===255)xs.push(x);
  if(xs.length){let best=null;const ctr=r=>Math.abs((r[0]+r[r.length-1]+1)/2-px);
   for(const run of runsOf(xs))if(best===null||ctr(run)<ctr(best))best=run;return {y,run:best}}
 }
 return null;
}
function buildBalls(parts,pivots,order){
 const balls={};
 for(const child of Object.keys(PARENTS)){
  const parent=PARENTS[child];if(!parent||child==="head")continue;
  const cimg=parts[child].img,pv=pivots[child],sr=seamRun(cimg,pv);
  if(!sr||sr.run.length<2)continue;
  const ys=sr.y,run=sr.run,col=x=>{const o=(ys*W+x)*4;return [cimg[o],cimg[o+1],cimg[o+2],cimg[o+3]]};
  const rim=col(run[0]),inner=run.length>2?run.slice(1,-1).map(col):[rim];
  const counts=new Map(),key=c=>c.join(",");let fill=null,best=-1;
  for(const c of inner){const k=key(c);counts.set(k,(counts.get(k)||[c,0]));counts.get(k)[1]++}
  for(const [,[c,n]] of counts)if(n>best){fill=c;best=n}
  const r=Math.min(BALL_MAX_R,run.length/2),cx=pv.x,cy=pv.y;
  const slot=Math.min(order.indexOf(child),order.indexOf(parent)),cover=new Uint8Array(N);
  for(const part of order.slice(slot)){const im=parts[part].img;for(let k=0;k<N;k++)if(im[k*4+3]===255)cover[k]=1}
  const lo=Math.min(cy,ys),hi=Math.max(cy,ys),x0r=run[0],x1r=run[run.length-1];
  const inside=(x,y)=>(x+.5-cx)**2+(y+.5-cy)**2<=r*r||(y>=cy&&lo<=y&&y<hi+1&&x0r<=x&&x<=x1r);
  const img=new Uint8ClampedArray(N*4);
  for(let y=Math.floor(lo-r)-1;y<Math.floor(hi+r)+2;y++)for(let x=Math.floor(cx-r)-2;x<Math.floor(cx+r)+3;x++){
   if(!(x>=0&&x<W&&y>=0&&y<H)||!inside(x,y)||!cover[y*W+x])continue;
   const edge=!(inside(x+1,y)&&inside(x-1,y)&&inside(x,y+1)&&inside(x,y-1));
   img.set(edge?rim:fill,(y*W+x)*4);
  }
  const bb=bboxOf(img);if(bb)balls[child]={img,bbox:bb,scaled:null};
 }
 return balls;
}
function canvasGeom(mode){
 mode=mode===undefined||mode===null?CANVAS:mode;
 return mode==="overflow128"?{cw:OVERFLOW_GEOM.cw,ch:OVERFLOW_GEOM.ch,ox:OVERFLOW_GEOM.ox,oy:OVERFLOW_GEOM.oy,cn:OVERFLOW_GEOM.cn}:{cw:W,ch:H,ox:0,oy:0,cn:N};
}
function cropLogical(out,mode){
 const g=canvasGeom(mode);
 if(g.ox===0&&g.oy===0&&g.cw===W&&g.ch===H)return out;
 const cropped=new Uint8ClampedArray(N*4);
 for(let y=0;y<H;y++)cropped.set(out.subarray(((y+g.oy)*g.cw+g.ox)*4,((y+g.oy)*g.cw+g.ox+W)*4),y*W*4);
 return cropped;
}
function angOf(pose,part){return Number((pose&&pose[part]||{}).a||0)}
function lowerAngles(pose){
 return {thigh:Math.max(Math.abs(angOf(pose,"leg_near_upper")),Math.abs(angOf(pose,"leg_far_upper"))),
  knee:Math.max(Math.abs(angOf(pose,"leg_near_lower")),Math.abs(angOf(pose,"leg_far_lower"))),
  pa:angOf(pose,"pelvis"),dy:Number((pose&&pose.pelvis||{}).y||0)};
}
function selectLower(pose,outfit,available){
 const a=lowerAngles(pose);let pid;
 if(Math.abs(a.pa)>=60)pid=(a.knee>=60||a.thigh>=40)?"lie_curl":"lie_straight";
 else if(a.dy>=12&&a.knee>=180)pid="sit_floor";
 else if(a.dy>=12&&a.knee>=120&&a.thigh>=55)pid="crouch";
 else if(a.dy>=6&&a.thigh>=50&&a.knee>=50)pid="sit_chair";
 else if(a.dy>=6&&a.thigh>=60&&a.knee<50)pid="sit_long";
 else if(a.thigh<=30&&a.knee>=80)pid="kneel";
 else pid="rig";
 if(pid==="rig"&&outfit==="skirt"&&!LEG_PARTS.some(p=>angOf(pose,p)))pid="stand";
 const has=p=>!available||available.has?available.has(p):available.includes(p);
 // Missing art falls back to the rig (no sit_floor → sit_chair). Always the exact view file; never mirror.
 if(pid!=="rig"&&available&&!has(pid))pid="rig";
 return pid;
}
const SEATED_POSES=["sit_chair","sit_floor","sit_long","crouch"];
function lowerFileName(pose,view,body,outfit){return "lgr1_lower_"+pose+"_"+view+"_"+body+"_"+outfit+".png"}
function previewWearId(outfit,seated){return outfit==="pants"?"trousers_a":outfit==="skirt"?(seated?"skirt_a_seat":"skirt_a"):"none"}
function pinholeFill(out,maxsize,geom){
 maxsize=maxsize===undefined?PINHOLE:maxsize;
 const g=geom||canvasGeom(),cw=g.cw,ch=g.ch,cn=g.cn,seen=new Uint8Array(cn),st=[];
 for(let k=0;k<cn;k++){const x=k%cw,y=(k-x)/cw;if((x===0||x===cw-1||y===0||y===ch-1)&&!out[k*4+3]){seen[k]=1;st.push(k)}}
 while(st.length){const k=st.pop(),x=k%cw,y=(k-x)/cw;
  for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(nx>=0&&nx<cw&&ny>=0&&ny<ch){const n=ny*cw+nx;if(!seen[n]&&!out[n*4+3]){seen[n]=1;st.push(n)}}}
 for(let k=0;k<cn;k++){
  if(out[k*4+3]||seen[k])continue;
  const comp=[k];seen[k]=1;
  for(let i=0;i<comp.length;i++){const j=comp[i];for(const n of [j-1,j+1,j-cw,j+cw])if(!seen[n]&&!out[n*4+3]){seen[n]=1;comp.push(n)}}
  if(comp.length>maxsize)continue;
  for(const j of comp){
   const cnt=new Map();
   for(const n of [j-1,j+1,j-cw,j+cw])if(out[n*4+3]===255){const k2=out[n*4]+","+out[n*4+1]+","+out[n*4+2]+","+out[n*4+3];
    if(!cnt.has(k2))cnt.set(k2,[n,0]);cnt.get(k2)[1]++}
   let best=null,bn=0,bs=0;
   for(const [,[n,c]] of cnt){const s3=out[n*4]+out[n*4+1]+out[n*4+2];if(best===null||c>bn||(c===bn&&s3<bs)){best=n;bn=c;bs=s3}}
   if(best!==null){const v=[out[best*4],out[best*4+1],out[best*4+2],out[best*4+3]];out.set(v,j*4)}
  }
 }
}
function prepare(o){
 const mode=o.jointMode||JOINT_MODE_CUR;
 let mask=o.mask,pivots=o.pivots;
 if(mode==="v2"||mode==="v4"){const f=fixSlice(mask,pivots);mask=f.mask;pivots=f.pivots;if(mode==="v4"){const s=shoulderToTorso(mask,pivots);mask=s.mask;pivots=s.pivots}}
 const layers=o.layers||{},wear=o.wear||{},tweak=o.tweak||null;
 const order=validOrder(o.order)?o.order.slice():DRAW_ORDER.slice();
 const caps=Object.assign({},CAP_RADIUS,o.caps||{});
 if(mode==="v2"||mode==="v4")for(const k of Object.keys(caps))if(k!=="head")caps[k]=0;
 const anyWear=LAYERS.some(l=>wear[l]);
 const expanded=anyWear?expandMask(bodyMask(mask,layers)):null;
 const groups={};
 for(const [name,glayers] of GROUPS){
  const parts=PARTS.map(()=>new Uint8ClampedArray(N*4)),still=new Uint8ClampedArray(N*4);
  for(const layer of glayers){
   const fromWear=!!wear[layer],src=wear[layer]||layers[layer];
   if(!src)continue;
   // Hair always belongs to the head (long hair must not ride on an arm).
   const hair=layer==="hair_back"||layer==="hair_front",HEAD=PARTS.indexOf("head");
   for(let k=0;k<N;k++){
    const a=src[k*4+3];if(!a)continue;
    let owner=hair?HEAD:mask[k];
    if(fromWear){
     if(tweak&&tweak[k]!==INHERIT)owner=tweak[k];
     else if(!hair)owner=expanded[k];
    }
    over(owner===UNASSIGNED||owner>=PARTS.length?still:parts[owner],k,src[k*4],src[k*4+1],src[k*4+2],a);
   }
  }
  // Joint caps and hidden fill (underlays live in the PARENT's piece).
  const under=PARTS.map(()=>null);
  for(let ci=0;ci<PARTS.length;ci++){
   const child=PARTS[ci],parent=PARENTS[child];if(!parent)continue;
   const pi=PARTS.indexOf(parent),cImg=parts[ci],pImg=parts[pi];
   const r=Math.max(0,Math.min(6,Math.floor(Number(caps[child])||0)));
   const pv=pivots[child],above=order.indexOf(child)>order.indexOf(parent);
   for(let k=0;k<N;k++){
    const c=k*4;if(cImg[c+3]!==255)continue;
    const x=k%W,y=(k-x)/W,dx=x-pv.x,dy=y-pv.y;
    let src=-1;
    if(r>0&&dx*dx+dy*dy<=r*r)src=c;
    else if(above){
     let xl=-1,xr=-1;
     for(let s=x-1;s>=0;s--)if(pImg[(y*W+s)*4+3]===255){xl=s;break}
     for(let s=x+1;s<W;s++)if(pImg[(y*W+s)*4+3]===255){xr=s;break}
     if(xl>=0&&xr>=0)src=(y*W+(x-xl<=xr-x?xl:xr))*4;
    }
    if(src<0)continue;
    const img=src===c?cImg:pImg;
    if(!under[pi])under[pi]=new Uint8ClampedArray(N*4);
    const u=under[pi];u[c]=img[src];u[c+1]=img[src+1];u[c+2]=img[src+2];u[c+3]=img[src+3];
   }
  }
  const entries={};
  for(let i=0;i<PARTS.length;i++){
   let img=parts[i];
   if(under[i]){
    const merged=under[i];
    for(let k=0;k<N;k++){const c=k*4;if(img[c+3])over(merged,k,img[c],img[c+1],img[c+2],img[c+3])}
    img=merged;
   }
   entries[PARTS[i]]={img,bbox:bboxOf(img),scaled:null};
  }
  groups[name]={still,parts:entries};
 }
 let face=null;
 if(o.face)face={img:o.face,bbox:bboxOf(o.face),scaled:null};
 const balls=(mode==="v2"||mode==="v4")?buildBalls(groups.main.parts,pivots,order):{};
 const prep={order,pivots,placements:o.placements||{},groups,face,mode,balls};
 if(o.w4&&mode==="v4")w4Prep(prep,wear,o.under||[]);
 return prep;
}
function pack(d,o){return d[o+3]?((d[o]<<24)|(d[o+1]<<16)|(d[o+2]<<8)|d[o+3])>>>0:0}
function scale2x(src,w,h){
 const out=new Uint32Array(w*h*4),W2=w*2;
 const at=(x,y)=>x<0||y<0||x>=w||y>=h?0:src[y*w+x];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const E=src[y*w+x],B=at(x,y-1),D=at(x-1,y),F=at(x+1,y),Hh=at(x,y+1);
  let e0=E,e1=E,e2=E,e3=E;
  if(B!==Hh&&D!==F){
   if(D===B)e0=D;if(B===F)e1=F;if(D===Hh)e2=D;if(Hh===F)e3=F;
  }
  const o=(2*y)*W2+2*x;out[o]=e0;out[o+1]=e1;out[o+W2]=e2;out[o+W2+1]=e3;
 }
 return out;
}
function scaledOf(entry){
 if(entry.scaled)return entry.scaled;
 const [x0,y0,x1,y1]=entry.bbox,ox=x0-1,oy=y0-1,w=x1-x0+3,h=y1-y0+3;
 let cur=new Uint32Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const sx=ox+x,sy=oy+y;
  cur[y*w+x]=sx<0||sy<0||sx>=W||sy>=H?0:pack(entry.img,(sy*W+sx)*4);
 }
 let cw=w,ch=h;
 for(let i=0;i<3;i++){cur=scale2x(cur,cw,ch);cw*=2;ch*=2}
 entry.scaled={data:cur,w:cw,h:ch,ox,oy};
 return entry.scaled;
}
const q9=v=>Math.floor(v*1e9+0.5)/1e9;
function compose(a,b){
 const [aa,ab,ac,ad,ax,ay]=a,[ba,bb,bc,bd,bx,by]=b;
 return [aa*ba+ac*bb,ab*ba+ad*bb,aa*bc+ac*bd,ab*bc+ad*bd,aa*bx+ac*by+ax,ab*bx+ad*by+ay];
}
const translate=(x,y)=>[1,0,0,1,x,y];
function rotate(deg){const r=deg*DEG,c=q9(Math.cos(r)),s=q9(Math.sin(r));return [c,s,-s,c,0,0]}
function inverse(m){
 const [a,b,c,d,x,y]=m,det=a*d-b*c;
 if(Math.abs(det)<1e-12)throw Error("Singular LGR-1 transform");
 return [d/det,-b/det,-c/det,a/det,(c*y-d*x)/det,(b*x-a*y)/det];
}
const mapPoint=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
function matrices(pivots,placements,pose){
 const out={};
 for(const part of PARTS){
  const chain=[];let node=part;
  while(node){chain.unshift(node);node=PARENTS[node]}
  let mat=[1,0,0,1,0,0],angle=0;
  for(const bone of chain){
   const t=pose?.[bone]||{},f=placements?.[bone]||{x:0,y:0};
   const dx=Number(t.x||0)+Number(f.x||0),dy=Number(t.y||0)+Number(f.y||0),a=Number(t.a||0);
   if(![dx,dy,a].every(Number.isFinite))throw Error("Non-finite LGR-1 pose");
   const p=pivots[bone];
   mat=compose(mat,compose(translate(dx,dy),compose(translate(p.x,p.y),compose(rotate(a),translate(-p.x,-p.y)))));
   angle+=a;
  }
  out[part]={mat,angle};
 }
 return out;
}
function drawEntry(out,entry,tr,geom){
 if(!entry||!entry.bbox)return;
 const [x0,y0,x1,y1]=entry.bbox,m=tr.mat,inv=inverse(m);
 const right=Math.abs(tr.angle-90*Math.round(tr.angle/90))<1e-9;
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const [cx,cy] of [[x0,y0],[x1+1,y0],[x0,y1+1],[x1+1,y1+1]]){
  const [px,py]=mapPoint(m,cx,cy);
  minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
 }
 const g=geom||canvasGeom(),cw=g.cw,ch=g.ch,ox=g.ox,oy=g.oy;
 const ox0=Math.max(0,Math.floor(minX)-1+ox),ox1=Math.min(cw-1,Math.ceil(maxX)+1+ox);
 const oy0=Math.max(0,Math.floor(minY)-1+oy),oy1=Math.min(ch-1,Math.ceil(maxY)+1+oy);
 const img=entry.img,sc=right?null:scaledOf(entry);
 for(let y=oy0;y<=oy1;y++)for(let x=ox0;x<=ox1;x++){
  const [sx,sy]=mapPoint(inv,x-ox+.5,y-oy+.5);
  if(right){
   const ix=Math.floor(sx),iy=Math.floor(sy);
   if(ix<x0||ix>x1||iy<y0||iy>y1)continue;
   const o=(iy*W+ix)*4;
   if(img[o+3])over(out,y*cw+x,img[o],img[o+1],img[o+2],img[o+3]);
  }else{
   const u=Math.floor((sx-sc.ox)*8),v=Math.floor((sy-sc.oy)*8);
   if(u<0||v<0||u>=sc.w||v>=sc.h)continue;
   const p=sc.data[v*sc.w+u];
   if(p)over(out,y*cw+x,p>>>24,(p>>>16)&255,(p>>>8)&255,p&255);
  }
 }
}
// Render-time joint fill (twin of genesis_procedural_runtime.joint_fill): near
// each joint an EMPTY pixel that is a <=2px crack or an enclosed hole gets the
// joint pair's own rest colour (child, then parent), else the commonest
// neighbour colour. Never draws over art; gaps that exist at rest stay open.
const JOINT_FILL=4,REST=new WeakMap();
function crackAt(al,x,y){
 const h=(al(x-1,y)||al(x-2,y))&&(al(x+1,y)||al(x+2,y))&&(al(x-1,y)||al(x+1,y));
 const v=(al(x,y-1)||al(x,y-2))&&(al(x,y+1)||al(x,y+2))&&(al(x,y-1)||al(x,y+1));
 return !!(h||v);
}
function outsideOf(out){
 const seen=new Uint8Array(N),st=[];
 for(let k=0;k<N;k++){const x=k%W,y=(k/W)|0;if((x===0||x===W-1||y===0||y===H-1)&&!out[k*4+3]){seen[k]=1;st.push(k)}}
 while(st.length){
  const k=st.pop(),x=k%W,y=(k/W)|0;
  for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
   if(nx>=0&&nx<W&&ny>=0&&ny<H){const n=ny*W+nx;if(!seen[n]&&!out[n*4+3]){seen[n]=1;st.push(n)}}
  }
 }
 return seen;
}
function restInfo(prep){
 let r=REST.get(prep);if(r)return r;
 const r0=renderParts(prep,{}),o0=outsideOf(r0),gap=new Uint8Array(N);
 const al=(x,y)=>x>=0&&x<W&&y>=0&&y<H&&r0[(y*W+x)*4+3];
 for(let k=0;k<N;k++)if(!r0[k*4+3])gap[k]=crackAt(al,k%W,(k/W)|0)||!o0[k]?1:0;
 r={gap,tr:matrices(prep.pivots,prep.placements,{})};REST.set(prep,r);return r;
}
function jointFill(out,prep,tr,R0){
 const parts=prep.groups.main.parts,{gap,tr:rtr}=restInfo(prep);
 const a=(x,y)=>x>=0&&x<W&&y>=0&&y<H&&out[(y*W+x)*4+3];
 for(const child of PARTS){
  const parent=PARENTS[child];if(!parent)continue;
  const imgs=[child,parent].filter(p=>parts[p]&&parts[p].bbox).map(p=>parts[p].img);if(!imgs.length)continue;
  const pv=prep.pivots[child],[jx,jy]=mapPoint(tr[parent].mat,pv.x,pv.y),R=R0;
  const invs=[inverse(tr[parent].mat),inverse(tr[child].mat)],outside=outsideOf(out);
  for(let y=Math.max(2,Math.floor(jy-R));y<Math.min(H-2,Math.ceil(jy+R)+1);y++)
  for(let x=Math.max(2,Math.floor(jx-R));x<Math.min(W-2,Math.ceil(jx+R)+1);x++){
   const k=y*W+x;
   if(out[k*4+3]||(x+.5-jx)**2+(y+.5-jy)**2>R*R)continue;
   if(!(crackAt(a,x,y)||!outside[k]))continue;
   const [sx0,sy0]=mapPoint(invs[0],x+.5,y+.5),[rx0,ry0]=mapPoint(rtr[parent].mat,sx0,sy0),rx=Math.floor(rx0),ry=Math.floor(ry0);
   if(!(rx>=0&&rx<W&&ry>=0&&ry<H)||gap[ry*W+rx])continue;
   let done=false;
   for(const inv of invs){
    const [sx,sy]=mapPoint(inv,x+.5,y+.5),ix=Math.floor(sx),iy=Math.floor(sy);
    if(!(ix>=0&&ix<W&&iy>=0&&iy<H))continue;
    const o=(iy*W+ix)*4;
    for(const img of imgs)if(img[o+3]===255){out.set(img.subarray?img.subarray(o,o+4):img.slice(o,o+4),k*4);done=true;break}
    if(done)break;
   }
   if(!done){
    const cnt=new Map();
    for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
     const o=(ny*W+nx)*4;
     if(out[o+3]===255){const c=((out[o]<<24)|(out[o+1]<<16)|(out[o+2]<<8)|out[o+3])>>>0;cnt.set(c,(cnt.get(c)||0)+1)}
    }
    let best=null,bn=0,bs=0;
    for(const [c,n] of cnt){const s3=(c>>>24)+((c>>>16)&255)+((c>>>8)&255);if(best===null||n>bn||(n===bn&&s3<bs)){best=c;bn=n;bs=s3}}
    if(best!==null){out[k*4]=best>>>24;out[k*4+1]=(best>>>16)&255;out[k*4+2]=(best>>>8)&255;out[k*4+3]=best&255}
   }
  }
 }
}

function shoulderToTorso(mask,pivots,shDy){
 const out=Uint8Array.from(mask),pv={};for(const k of Object.keys(pivots))pv[k]={x:pivots[k].x,y:pivots[k].y};
 const T=PARTS.indexOf("torso"),dy=shDy==null?SH_DY:shDy;
 for(const side of ["near","far"]){
  const name="arm_"+side+"_upper",arm=PARTS.indexOf(name),py=pv[name].y;
  for(let k=0;k<N;k++)if(out[k]===arm&&((k-k%W)/W)<=py+dy)out[k]=T;
 }
 return {mask:out,pivots:pv};
}
function v4Moved(pose){
 const moved=new Set();
 for(const p of PARTS)if(PARENTS[p]&&((Number((pose&&pose[p]||{}).a)||0)%360))moved.add(p);
 let changed=true;
 while(changed){changed=false;for(const p of PARTS)if(moved.has(PARENTS[p])&&!moved.has(p)){moved.add(p);changed=true}}
 return moved;
}
function v4Outside(out,cw,ch,cn){
 const seen=new Uint8Array(cn),st=[];
 for(let k=0;k<cn;k++){const x=k%cw,y=(k/cw)|0;if((x===0||x===cw-1||y===0||y===ch-1)&&!out[k*4+3]){seen[k]=1;st.push(k)}}
 while(st.length){
  const k=st.pop(),x=k%cw,y=(k/cw)|0;
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
   const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=cw||ny>=ch)continue;
   const n=ny*cw+nx;if(!seen[n]&&!out[n*4+3]){seen[n]=1;st.push(n)}
  }
 }
 return seen;
}
function v4Code(out,i){const o=i*4;return out[o+3]?((out[o]<<16)|(out[o+1]<<8)|out[o+2]):-1}
function v4Ncount(op,cw,ch,i,dirs){
 const x=i%cw,y=(i/cw)|0;let n=0;
 for(const [dy,dx] of dirs){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<cw&&ny<ch&&op[ny*cw+nx])n++}
 return n;
}
function v4Dilate(flags,cw,ch,cn,dirs){
 const out=Uint8Array.from(flags);
 for(let i=0;i<cn;i++){
  if(!flags[i])continue;
  const x=i%cw,y=(i/cw)|0;
  for(const [dy,dx] of dirs){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<cw&&ny<ch)out[ny*cw+nx]=1}
 }
 return out;
}
function v4Post(px,geom,active,block,dejag,repair,fam){
 const FAMM=fam||V4_FAM;
 const cw=geom.cw,ch=geom.ch,cn=geom.cn,a=Uint8ClampedArray.from(px);
 const op=new Uint8Array(cn);for(let i=0;i<cn;i++)if(a[i*4+3])op[i]=1;
 const act=active==null?new Uint8Array(cn).fill(1):Uint8Array.from(active);
 const blk=block==null?new Uint8Array(cn):Uint8Array.from(block);
 for(let i=0;i<cn;i++)if(blk[i])act[i]=0;
 const nearblk=v4Dilate(blk,cw,ch,cn,N4D);
 if(dejag!==false){
  const outside=v4Outside(a,cw,ch,cn);
  let isol=new Uint8Array(cn);for(let i=0;i<cn;i++)if(op[i]&&V4_OUTL.has(v4Code(a,i)))isol[i]=1;
  const actn=v4Dilate(act,cw,ch,cn,N4D);
  for(let i=0;i<cn;i++){
   if(!(outside[i]&&actn[i]&&!nearblk[i]&&!op[i]))continue;
   if(v4Ncount(op,cw,ch,i,N4D)<3)continue;
   const x=i%cw,y=(i/cw)|0;const fills=[],nbs=[];
   for(const [dy,dx] of N4D){
    const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=cw||ny>=ch)continue;
    const n=ny*cw+nx;if(op[n]){nbs.push(n);if(!isol[n])fills.push(n)}
   }
   const src=fills.length?fills[0]:(nbs.length?nbs[0]:-1);if(src<0)continue;
   a[i*4]=a[src*4];a[i*4+1]=a[src*4+1];a[i*4+2]=a[src*4+2];a[i*4+3]=a[src*4+3];op[i]=1;
  }
  isol=new Uint8Array(cn);for(let i=0;i<cn;i++)if(op[i]&&V4_OUTL.has(v4Code(a,i)))isol[i]=1;
  for(let i=0;i<cn;i++)if(isol[i]&&act[i]&&v4Ncount(op,cw,ch,i,N4D)<=1&&v4Ncount(op,cw,ch,i,N8D)<=2){a[i*4]=a[i*4+1]=a[i*4+2]=a[i*4+3]=0;op[i]=0}
 }
 if(repair!==false){
  const outside=v4Outside(a,cw,ch,cn),dil=v4Dilate(outside,cw,ch,cn,N4D);
  const isol=new Uint8Array(cn);for(let i=0;i<cn;i++)if(op[i]&&V4_OUTL.has(v4Code(a,i)))isol[i]=1;
  for(let i=0;i<cn;i++){
   if(!(op[i]&&dil[i]&&act[i]))continue;
   const c=v4Code(a,i);if(!FAMM.has(c))continue;
   const x=i%cw,y=(i/cw)|0;let blockish=false;
   for(const dy of [-1,1])for(const dx of [-1,1]){
    const iy=y+dy,ix=x+dx;if(ix<0||iy<0||ix>=cw||iy>=ch)continue;
    if(isol[y*cw+ix]&&isol[iy*cw+x]&&isol[iy*cw+ix])blockish=true;
   }
   let fillNb=false;
   for(const [dy,dx] of N8D){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=cw||ny>=ch)continue;const n=ny*cw+nx;if(op[n]&&!isol[n]){fillNb=true;break}}
   if(blockish||!fillNb)continue;
   const ol=FAMM.get(c);a[i*4]=(ol>>>16)&255;a[i*4+1]=(ol>>>8)&255;a[i*4+2]=ol&255;
  }
 }
 return a;
}
function v4IdEntry(ent,idx,ex){
 if(!ent||!ent.bbox)return ent;
 const img=new Uint8ClampedArray(N*4);
 for(let k=0;k<N;k++)if(ent.img[k*4+3]){img[k*4]=idx;img[k*4+1]=(ex&&ex[k])?1:0;img[k*4+2]=0;img[k*4+3]=255}
 return {img,bbox:ent.bbox,scaled:null};
}
function v4IdPrep(prep,geom){
 const key="_v4Id"+geom.cw;
 if(prep[key])return prep[key];
 const rest=renderParts(prep,zeroPose(),{noUnders:true},geom),after=v4Post(rest,geom);
 const cn=geom.cn,cw=geom.cw,ch=geom.ch,ox=geom.ox,oy=geom.oy;
 const changed=new Uint8Array(cn);
 for(let i=0;i<cn;i++)if(rest[i*4]!==after[i*4]||rest[i*4+1]!==after[i*4+1]||rest[i*4+2]!==after[i*4+2]||rest[i*4+3]!==after[i*4+3])changed[i]=1;
 const dil=v4Dilate(changed,cw,ch,cn,N8D),ex=new Uint8Array(N);
 for(let i=0;i<cn;i++)if(dil[i]&&rest[i*4+3]){const x=i%cw-ox,y=((i/cw)|0)-oy;if(x>=0&&y>=0&&x<W&&y<H)ex[y*W+x]=1}
 const hid=PARTS.indexOf("head")+1;
 const q={order:prep.order,pivots:prep.pivots,placements:prep.placements,mode:prep.mode,face:null,groups:{},balls:{}};
 for(const name of Object.keys(prep.groups)){
  const gr=prep.groups[name],st=new Uint8ClampedArray(N*4);
  for(let k=0;k<N;k++)if(gr.still[k*4+3]){st[k*4]=hid;st[k*4+1]=1;st[k*4+3]=255}
  const parts={};
  for(const part of Object.keys(gr.parts)){
   const idx=(name!=="main"||part==="head")?hid:PARTS.indexOf(part)+1;
   parts[part]=v4IdEntry(gr.parts[part],idx,ex);
  }
  q.groups[name]={still:st,parts};
 }
 q.balls={};for(const ch of Object.keys(prep.balls||{}))q.balls[ch]=v4IdEntry(prep.balls[ch],PARTS.indexOf(ch)+1);
 if(prep.face)q.face=v4IdEntry(prep.face,hid);
 if(prep.w4){q.w4={unders:{}};for(const ch of Object.keys(prep.w4.unders)){const u=prep.w4.unders[ch];q.w4.unders[ch]={ent:v4IdEntry(u.ent,PARTS.indexOf(u.par)+1),par:u.par}}}
 prep[key]=q;return q;
}
function zeroPose(){const z={};for(const p of PARTS)z[p]={x:0,y:0,a:0};return z}
function v4RaiseFront(prep,pose,opts,out,geom){
 let a=Number((pose&&pose.arm_near_upper||{}).a)||0;a=((a+180)%360+360)%360-180;
 const left=prep.pivots.arm_near_upper.x<32,outward=left?a:-a;
 if(outward<RAISE_FRONT)return out;
 const arm=renderParts(prep,pose,Object.assign({},opts||{},{only:new Set(["arm_near_upper","arm_near_lower"]),lower:null}),geom);
 const hd=renderParts(prep,pose,Object.assign({},opts||{},{only:new Set(["head"]),lower:null}),geom);
 out=Uint8ClampedArray.from(out);
 for(let i=0;i<geom.cn;i++)if(arm[i*4+3]&&hd[i*4+3]){out[i*4]=arm[i*4];out[i*4+1]=arm[i*4+1];out[i*4+2]=arm[i*4+2];out[i*4+3]=arm[i*4+3]}
 return out;
}
function v4Passes(prep,pose,opts,out,geom){
 out=v4RaiseFront(prep,pose,opts,out,geom);
 const moved=v4Moved(pose);if(!moved.size)return out;
 const ids=renderParts(v4IdPrep(prep,geom),pose,opts,geom);
 const cw=geom.cw,ch=geom.ch,cn=geom.cn,ox=geom.ox,oy=geom.oy,hid=PARTS.indexOf("head");
 const act=new Uint8Array(cn),blk=new Uint8Array(cn),own=new Int16Array(cn);
 for(let i=0;i<cn;i++)own[i]=ids[i*4]-1;
 for(let i=0;i<cn;i++){
  if(!ids[i*4+3])continue;
  if(ids[i*4+1]||own[i]===hid)blk[i]=1;
  if(own[i]>=0&&own[i]<PARTS.length&&moved.has(PARTS[own[i]])&&PARTS[own[i]]!=="head")act[i]=1;
 }
 const tr=matrices(prep.pivots,prep.placements,pose);
 for(const ch of moved){
  const par=PARENTS[ch];if(moved.has(par)||par==="head"||!par)continue;
  const [jx,jy]=mapPoint(tr[par].mat,prep.pivots[ch].x,prep.pivots[ch].y),pi=PARTS.indexOf(par),r2=7.5*7.5;
  for(let i=0;i<cn;i++){
   if(own[i]!==pi)continue;
   const x=i%cw-ox+.5,y=((i/cw)|0)-oy+.5;
   if((x-jx)*(x-jx)+(y-jy)*(y-jy)<=r2)act[i]=1;
  }
 }
 if(opts&&opts.lower)for(let i=0;i<cn;i++)if(!ids[i*4+3]&&out[i*4+3])act[i]=1;
 return v4Post(out,geom,act,blk);
}

// ---- W4 joint-safe wear (PREVIEW, port of lgr-outfit-v4/tools/w4.py; only when prepare({w4:true}) on a v4 prep) ----
const W4_RAISE_OVER=60,W4_SEAL_R=3,W4_LEG_UNDER_ROWS=2;
const W4_SKIN_FAM=new Map(["#FF2CE8","#FF32E5","#FF38E2","#FF3EDF"].map(h=>[hx(h),hx("#FF44DC")]));
const W4_SKIN=new Set([...W4_SKIN_FAM.keys(),hx("#FF44DC"),hx("#FF4AD9")]);
const W4_PANTS=new Set(["#FF92B5","#FF98B2","#FF9EAF","#FFA4AC"].map(hx));
const W4_GARMENT=new Set(["#FF50D6","#FF56D3","#FF5CD0","#FF62CD","#FF68CA","#FF6EC7","#FF74C4","#FF7AC1","#FF80BE","#FF86BB","#FF8CB8",
 "#FF92B5","#FF98B2","#FF9EAF","#FFA4AC","#FFAAA9","#FFB0A6","#FFB6A3","#FFBCA0","#FFC89A","#FFCE97"].map(hx));
const W4_ARMS=["arm_far_upper","arm_far_lower","arm_near_upper","arm_near_lower"];
const rgbAt=(b,k)=>(b[k*4]<<16)|(b[k*4+1]<<8)|b[k*4+2];
function roundHalfEven(v){const f=Math.floor(v),d=v-f;if(d===.5)return f%2===0?f:f+1;return d<.5?f:f+1}
function w4Top(counts){let best=null,bn=-1;for(const [c,n] of [...counts.entries()].sort((a,b)=>a[0]-b[0]))if(n>bn){best=c;bn=n}return [best,bn]}
function w4GarmentFam(wear){
 const fam=new Map();
 for(const layer of Object.keys(wear||{})){
  const b=wear[layer];if(!b)continue;
  const op=new Uint8Array(N);let any=false;for(let k=0;k<N;k++)if(b[k*4+3]){op[k]=1;any=true}
  if(!any)continue;
  const ec=new Map(),ic=new Map();let etot=0;
  for(let k=0;k<N;k++){
   if(!op[k])continue;const x=k%W,y=(k-x)/W;
   const er=x>0&&x<W-1&&y>0&&y<H-1&&op[k-1]&&op[k+1]&&op[k-W]&&op[k+W];
   const c=rgbAt(b,k),m=er?ic:ec;m.set(c,(m.get(c)||0)+1);if(!er)etot++;
  }
  if(!ic.size)continue;
  const [eTop,en]=w4Top(ec),[fill]=w4Top(ic);
  if(eTop!==fill&&en>=0.5*etot)for(const v of [...ic.keys()].sort((a,b)=>a-b))if(v!==eTop&&(v>>>16)===(eTop>>>16))fam.set(v,eTop);
 }
 return fam;
}
function w4Entry(img){const bb=bboxOf(img);return bb?{img,bbox:bb,scaled:null}:null}
function w4ArmpitUnders(gm,pivots){
 const T=gm.torso.img,out={};
 for(const s of ["near","far"]){
  const ch="arm_"+s+"_upper",C=gm[ch].img;
  let sx=0,n=0;for(let k=0;k<N;k++)if(C[k*4+3]){sx+=k%W;n++}
  if(!n)continue;
  const left=sx/n<32,to=(x,y)=>T[(y*W+x)*4+3]>0,co=(x,y)=>C[(y*W+x)*4+3]>0;
  const te=y=>{if(y<0||y>=H)return null;let r=null;for(let x=0;x<W;x++)if(to(x,y)){if(left){r=x;break}r=x}return r};
  const py=pivots[ch].y;let top=null;
  for(let y=py+1;y>py-6;y--){const e=te(y);if(e===null)continue;let hit=false;
   if(left){for(let x=0;x<e;x++)if(co(x,y)){hit=true;break}}else{for(let x=e+1;x<W;x++)if(co(x,y)){hit=true;break}}
   if(!hit){top=y;break}}
  if(top===null)continue;
  let bot=null;for(let y=top+1;y<H;y++){const e=te(y);if(e===null)break;const nb=left?e-1:e+1;if(!(nb>=0&&nb<W&&co(nb,y))){bot=y;break}}
  if(bot===null||bot-top<2)continue;
  const et=te(top),eb=te(bot),img=new Uint8ClampedArray(N*4),eo=(top*W+et)*4,edge=[T[eo],T[eo+1],T[eo+2],T[eo+3]];
  for(let y=top+1;y<bot;y++){
   const e=roundHalfEven(et+(eb-et)*(y-top)/(bot-top)),cur=te(y);
   const band=[];for(let x=left?cur:cur-3;x<(left?cur+4:cur+1);x++)if(x>=0&&x<W&&T[(y*W+x)*4+3]){const o=(y*W+x)*4;band.push([T[o],T[o+1],T[o+2],T[o+3]])}
   let band2=band.filter(b=>!V4_OUTL.has((b[0]<<16)|(b[1]<<8)|b[2]));if(!band2.length)band2=band;
   let inner=edge;if(band2.length){const cnt=new Map();let bn=-1;for(const b of band2){const kk=b.join(",");cnt.set(kk,(cnt.get(kk)||0)+1)}for(const b of band2){const n2=cnt.get(b.join(","));if(n2>bn){bn=n2;inner=b}}}
   const x0=left?e:cur+1,x1=left?cur:e+1;
   for(let x=x0;x<x1;x++){if(!co(x,y))continue;const c=x===e?edge:inner,o=(y*W+x)*4;img[o]=c[0];img[o+1]=c[1];img[o+2]=c[2];img[o+3]=c[3]}
  }
  const ent=w4Entry(img);if(ent)out[ch]={ent,par:"torso"};
 }
 return out;
}
function w4LegUnders(gm){
 const out={};
 for(const s of ["near","far"])for(const [ch,par] of [["leg_"+s+"_upper","pelvis"],["leg_"+s+"_lower","leg_"+s+"_upper"]]){
  const C=gm[ch].img,P=gm[par].img,co=k=>C[k*4+3]>0,po=k=>P[k*4+3]>0;
  let top=-1,anyP=false;for(let k=0;k<N;k++){if(top<0&&co(k))top=(k/W)|0;if(po(k))anyP=true}
  if(top<0||!anyP)continue;
  const img=new Uint8ClampedArray(N*4),lim=ch.endsWith("upper")?Math.min(top,H-1):H-1;
  for(let x=0;x<W;x++){
   let yb=-1;for(let y=0;y<=lim;y++)if(po(y*W+x))yb=y;
   if(yb<0)continue;
   const fk=(yb-1>=0&&po((yb-1)*W+x))?(yb-1)*W+x:yb*W+x,bk=yb*W+x;
   for(let y=yb+1;y<yb+1+W4_LEG_UNDER_ROWS;y++)if(y<H&&co(y*W+x)){const sk=y===yb+W4_LEG_UNDER_ROWS?bk:fk,o=(y*W+x)*4;for(let j=0;j<4;j++)img[o+j]=P[sk*4+j]}
  }
  const ent=w4Entry(img);if(ent)out[ch]={ent,par};
 }
 return out;
}
function w4Prep(prep,wear,under){
 const gm=prep.groups.main.parts,inj=[],G=OVERFLOW_GEOM,z=zeroPose();
 const rest0=(under&&under.length)?renderParts(prep,z,{noUnders:true},G):null;
 for(const u of under||[]){
  const U=u.img||u[0],O=u.own||u[1];if(!U||!O)continue;
  for(let k=0;k<N;k++){
   if(!U[k*4+3]||!O[k*4+3]||!O[k*4])continue;
   const part=PARTS[O[k*4]-1];if(!part||!gm[part])continue;const img=gm[part].img;
   if(img[k*4+3])continue;for(let j=0;j<4;j++)img[k*4+j]=U[k*4+j];inj.push([part,k]);
  }
 }
 const rebox=()=>{for(const part of Object.keys(gm)){gm[part].bbox=bboxOf(gm[part].img);gm[part].scaled=null}};
 rebox();
 // rest mask: injected under pixels that would show in the rest pose are dropped (they only appear once a limb turns)
 if(inj.length){
  const tr=matrices(prep.pivots,prep.placements,z);
  for(let n=0;n<4;n++){
   const rest1=renderParts(prep,z,{noUnders:true},G),drop=new Set();
   inj.forEach(([part,k],ix)=>{const [x,y]=mapPoint(tr[part].mat,k%W+.5,((k/W)|0)+.5),X=Math.floor(x)+G.ox,Y=Math.floor(y)+G.oy;
    if(X<0||Y<0||X>=G.cw||Y>=G.ch)return;const o=(Y*G.cw+X)*4;
    if(rest0[o]!==rest1[o]||rest0[o+1]!==rest1[o+1]||rest0[o+2]!==rest1[o+2]||rest0[o+3]!==rest1[o+3])drop.add(ix)});
   if(!drop.size)break;
   for(const ix of drop){const [part,k]=inj[ix];gm[part].img.fill(0,k*4,k*4+4)}
   const keep=inj.filter((_,ix)=>!drop.has(ix));inj.length=0;inj.push(...keep);rebox();
  }
 }
 const fam=new Map(W4_SKIN_FAM);for(const [k,v] of w4GarmentFam(wear))fam.set(k,v);
 prep.w4={fam,unders:Object.assign(w4ArmpitUnders(gm,prep.pivots),w4LegUnders(gm))};
 return prep;
}
function w4RaiseOrder(prep,pose,od){
 const order=validOrder(od)?od.slice():prep.order.slice();
 for(const s of ["near","far"]){
  const up="arm_"+s+"_upper",lo="arm_"+s+"_lower",left=prep.pivots[up].x<32;
  let a=Number((pose&&pose[up]||{}).a)||0;a=((a+180)%360+360)%360-180;const oa=left?a:-a;
  if(oa>=W4_RAISE_OVER||(s==="near"&&oa<=-W4_RAISE_OVER)){
   for(const p of [up,lo])if(order.indexOf(p)<order.indexOf("torso")){order.splice(order.indexOf(p),1);order.splice(order.indexOf("torso")+1,0,p)}
   if(order.indexOf(lo)<order.indexOf(up)){order.splice(order.indexOf(lo),1);order.splice(order.indexOf(up)+1,0,lo)}
  }
 }
 return order;
}
function w4Seal1(a,own,movedIdx,act,block,geom){
 const cw=geom.cw,ch=geom.ch,cn=geom.cn,op=new Uint8Array(cn);for(let i=0;i<cn;i++)if(a[i*4+3])op[i]=1;
 const at=(y,x)=>op[(((y%ch)+ch)%ch)*cw+(((x%cw)+cw)%cw)];
 const dil=v4Dilate(op,cw,ch,cn,N8D);
 const slit=[];
 for(let i=0;i<cn;i++){
  if(op[i]||!act[i])continue;const x=i%cw,y=(i/cw)|0;
  let s=(at(y,x-1)&&at(y,x+1))||(at(y-1,x)&&at(y+1,x))||(at(y-1,x-1)&&at(y+1,x+1))||(at(y-1,x+1)&&at(y+1,x-1))||
   (at(y,x-1)&&at(y,x+2))||(at(y,x+1)&&at(y,x-2))||(at(y-1,x)&&at(y+2,x))||(at(y+1,x)&&at(y-2,x));
  if(!s&&x>0&&y>0&&x<cw-1&&y<ch-1&&v4Ncount(op,cw,ch,i,N8D)>=5){let all=true;for(let dy=-1;dy<=1&&all;dy++)for(let dx=-1;dx<=1;dx++)if(!dil[(y+dy)*cw+x+dx]){all=false;break}s=all}
  if(s)slit.push(i);
 }
 if(!slit.length)return null;
 const hid=PARTS.indexOf("head"),tid=PARTS.indexOf("torso"),armi=new Set(W4_ARMS.map(p=>PARTS.indexOf(p)));
 const code=i=>rgbAt(a,i),cloth=i=>op[i]&&!W4_SKIN.has(code(i)),headm=i=>op[i]&&(own[i]===hid||block[i]),mv=i=>op[i]&&movedIdx.has(own[i]);
 const out=Uint8ClampedArray.from(a);
 for(const i of slit){
  const x=i%cw,y=(i/cw)|0;let nb=[];
  for(const [dy,dx] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]){const ny=y+dy,nx=x+dx;if(ny>=0&&ny<ch&&nx>=0&&nx<cw&&op[ny*cw+nx])nb.push(ny*cw+nx)}
  if(!nb.length)continue;
  if(nb.some(headm)){if(nb.some(q=>armi.has(own[q]))||!nb.some(q=>cloth(q)&&own[q]===tid))continue;nb=nb.filter(q=>!headm(q))}
  if(nb.some(q=>armi.has(own[q])&&!cloth(q))&&nb.some(q=>!armi.has(own[q])))continue;
  const key=q=>[cloth(q)?0:1,mv(q)?0:1,V4_OUTL.has(code(q))?1:0];
  nb=nb.map((q,j)=>[key(q),j,q]).sort((p,r)=>p[0][0]-r[0][0]||p[0][1]-r[0][1]||p[0][2]-r[0][2]||p[1]-r[1]).map(e=>e[2]);
  if(!nb.length)continue;const q=nb[0];for(let j=0;j<4;j++)out[i*4+j]=a[q*4+j];
 }
 return out;
}
function w4Seal(px,own,movedIdx,act,block,geom,iters){for(let n=0;n<(iters||12);n++){const q=w4Seal1(px,own,movedIdx,act,block,geom);if(!q)break;px=q}return px}
function w4Despeckle(px,zone,geom,iters){
 const cw=geom.cw,ch=geom.ch,cn=geom.cn,a=Uint8ClampedArray.from(px);
 for(let n=0;n<(iters||3);n++){
  const op=new Uint8Array(cn),G=new Uint8Array(cn);
  for(let i=0;i<cn;i++)if(a[i*4+3]){op[i]=1;if(W4_GARMENT.has(rgbAt(a,i)))G[i]=1}
  const kill=[];
  for(let i=0;i<cn;i++){
   if(!G[i]||!zone[i])continue;
   const n8=v4Ncount(op,cw,ch,i,N8D),g8=v4Ncount(G,cw,ch,i,N8D),n4=v4Ncount(op,cw,ch,i,N4D)-1;
   if(n8<=2||g8<=1||(W4_PANTS.has(rgbAt(a,i))&&n4<=1))kill.push(i);
  }
  if(!kill.length)break;for(const i of kill)a[i*4]=a[i*4+1]=a[i*4+2]=a[i*4+3]=0;
 }
 return a;
}
function w4Erode(flags,cw,ch,cn){const o=new Uint8Array(cn);for(let i=0;i<cn;i++){if(!flags[i])continue;const x=i%cw,y=(i/cw)|0;if(x>0&&y>0&&x<cw-1&&y<ch-1&&flags[i-1]&&flags[i+1]&&flags[i-cw]&&flags[i+cw])o[i]=1}return o}
// (R6, preview) trouser calm, twin of w4.py calm(): an INTERIOR trouser pixel (all 8 neighbours opaque) in the moving
// zone with no same-colour 8-neighbour, or forming an isolated 2 px dash, takes the most common other trouser colour
// around it (ties P1,P2,P3,P4); a 1 px P1 sliver between two P4 outline pixels becomes the shadow tone P2. Silhouette edges and 3+ px lines stay, so legs keep their separation and no holes open.
const W4_CALM_PREF=["#FF92B5","#FF98B2","#FF9EAF","#FFA4AC"].map(hx),W4_NB8=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
function w4Calm(px,zone,geom){
 const cw=geom.cw,ch=geom.ch,cn=geom.cn,src=px,out=Uint8ClampedArray.from(px),op=new Uint8Array(cn),c=new Int32Array(cn);
 for(let i=0;i<cn;i++)if(src[i*4+3]){op[i]=1;c[i]=rgbAt(src,i)}
 const same=(y,x)=>{const r=[];for(const [dy,dx] of W4_NB8){const j=(y+dy)*cw+x+dx;if(op[j]&&c[j]===c[y*cw+x])r.push([y+dy,x+dx])}return r};
 for(let y=1;y<ch-1;y++)for(let x=1;x<cw-1;x++){
  const i=y*cw+x;if(!zone[i]||!op[i]||W4_CALM_PREF.indexOf(c[i])<0)continue;
  let full=true;for(const [dy,dx] of W4_NB8)if(!op[(y+dy)*cw+x+dx]){full=false;break}
  if(!full)continue;
  if(c[i]===W4_CALM_PREF[0]&&((c[i-1]===W4_CALM_PREF[3]&&c[i+1]===W4_CALM_PREF[3])||(c[i-cw]===W4_CALM_PREF[3]&&c[i+cw]===W4_CALM_PREF[3]))){
   const v=W4_CALM_PREF[1];out[i*4]=(v>>16)&255;out[i*4+1]=(v>>8)&255;out[i*4+2]=v&255;continue}   // 1 px sliver between outlines -> shadow tone
  const s=same(y,x);if(s.length>1)continue;
  if(s.length===1){const [qy,qx]=s[0];if(!(qy>=1&&qy<ch-1&&qx>=1&&qx<cw-1)||same(qy,qx).length!==1)continue}
  const cnt=new Map();
  for(const [dy,dx] of W4_NB8){const v=c[(y+dy)*cw+x+dx];if(v!==c[i]&&W4_CALM_PREF.indexOf(v)>=0)cnt.set(v,(cnt.get(v)||0)+1)}
  if(!cnt.size)continue;
  let best=null,bn=-1;for(const v of W4_CALM_PREF){const n=cnt.get(v)||0;if(n>bn){best=v;bn=n}}
  for(const [dy,dx] of W4_NB8){const j=(y+dy)*cw+x+dx;if(c[j]===best){for(let k=0;k<4;k++)out[i*4+k]=src[j*4+k];break}}
 }
 return out;
}
function w4Render(prep,pose,opts){
 const geom=canvasGeom(opts?.canvas),order=w4RaiseOrder(prep,pose,opts?.order),o2=Object.assign({},opts||{},{order,lower:null});
 let out=renderParts(prep,pose,o2,geom);
 out=v4RaiseFront(prep,pose,o2,out,geom);
 const moved=v4Moved(pose);
 if(moved.size){
  const ids=renderParts(v4IdPrep(prep,geom),pose,o2,geom);
  const cw=geom.cw,ch=geom.ch,cn=geom.cn,ox=geom.ox,oy=geom.oy,hid=PARTS.indexOf("head");
  const act=new Uint8Array(cn),head=new Uint8Array(cn),blk=new Uint8Array(cn),own=new Int16Array(cn);
  for(let i=0;i<cn;i++){own[i]=ids[i*4]-1;if(!ids[i*4+3])continue;
   if(own[i]===hid)head[i]=1;if(head[i]||ids[i*4+1])blk[i]=1;
   if(own[i]>=0&&own[i]<PARTS.length&&moved.has(PARTS[own[i]])&&PARTS[own[i]]!=="head")act[i]=1}
  const tr=matrices(prep.pivots,prep.placements,pose);
  for(const c of moved){
   const par=PARENTS[c];if(!par||moved.has(par)||par==="head")continue;
   const [jx,jy]=mapPoint(tr[par].mat,prep.pivots[c].x,prep.pivots[c].y),pi=PARTS.indexOf(par);
   for(let i=0;i<cn;i++){if(own[i]!==pi)continue;const x=i%cw-ox+.5,y=((i/cw)|0)-oy+.5;if((x-jx)*(x-jx)+(y-jy)*(y-jy)<=56.25)act[i]=1}
  }
  out=v4Post(out,geom,act,blk,true,true,prep.w4.fam);
  let zone=act;for(let n=0;n<W4_SEAL_R;n++)zone=v4Dilate(zone,cw,ch,cn,N4D);
  if([...moved].some(p=>p.startsWith("arm_"))){
   const ti=new Set(["torso","pelvis","leg_near_upper","leg_far_upper"].map(p=>PARTS.indexOf(p))),tp=new Uint8Array(cn);
   for(let i=0;i<cn;i++)if(ids[i*4+3]&&ti.has(own[i]))tp[i]=1;
   const er=w4Erode(tp,cw,ch,cn);let b=new Uint8Array(cn);for(let i=0;i<cn;i++)b[i]=tp[i]&&!er[i]?1:0;
   b=v4Dilate(v4Dilate(b,cw,ch,cn,N4D),cw,ch,cn,N4D);zone=Uint8Array.from(zone);for(let i=0;i<cn;i++)if(b[i])zone[i]=1;
  }
  const mi=new Set([...moved].map(p=>PARTS.indexOf(p)));
  out=w4Seal(out,own,mi,zone,head,geom,12);
  const hd=v4Dilate(head,cw,ch,cn,N4D),dz=new Uint8Array(cn);for(let i=0;i<cn;i++)dz[i]=zone[i]&&!hd[i]?1:0;
  out=w4Despeckle(out,dz,geom,3);
  out=w4Seal(out,own,mi,zone,head,geom,3);
  if(opts?.w4Calm!==false&&globalThis.LGR_W4_CALM!==false&&[...moved].some(p=>p.startsWith("leg_")))out=w4Calm(out,dz,geom);
 }
 if(PINHOLE>0)pinholeFill(out,undefined,geom);
 return out;
}
function render(prep,pose,opts){
 if(prep.w4&&prep.mode==="v4")return w4Render(prep,pose,opts);
 const geom=canvasGeom(opts?.canvas);let out=renderParts(prep,pose,opts,geom);
 if(prep.mode==="v2"||prep.mode==="v4"){if(prep.mode==="v4")out=v4Passes(prep,pose,opts,out,geom);if(PINHOLE>0)pinholeFill(out,undefined,geom);return out}
 if(geom.cw!==W||geom.ch!==H)return out;
 if(JOINT_FILL>0){const tr=matrices(prep.pivots,prep.placements,pose);jointFill(out,prep,tr,JOINT_FILL);jointFill(out,prep,tr,JOINT_FILL)}
 return out;
}
function renderParts(prep,pose,opts,geom){
 const g=geom||canvasGeom(opts?.canvas),cw=g.cw,ox=g.ox,oy=g.oy,cn=g.cn;
 const out=new Uint8ClampedArray(cn*4),tr=matrices(prep.pivots,prep.placements,pose);
 const order=validOrder(opts?.order)?opts.order:prep.order,lower=opts?.lower||null,hideLegs=!!lower,only=opts?.only||null;
 for(const [name] of GROUPS){
  const grp=prep.groups[name],s=grp.still;
  if(!only)for(let k=0;k<N;k++){const c=k*4;if(s[c+3]){const x=k%W,y=(k-x)/W;over(out,(y+oy)*cw+(x+ox),s[c],s[c+1],s[c+2],s[c+3])}}
  if(name==="main"&&lower&&!only)drawEntry(out,lower,tr.pelvis,g);
  let balls=name==="main"?(prep.balls||{}):{};
  const unders=(name==="main"&&prep.w4&&!opts?.noUnders)?prep.w4.unders:null;
  if(hideLegs)balls=Object.fromEntries(Object.entries(balls).filter(([k])=>!String(k).startsWith("leg_")));
  order.forEach((part,idx)=>{
   if(only&&!only.has(part))return;
   if(!only)for(const child of Object.keys(balls))if(Math.min(order.indexOf(child),order.indexOf(PARENTS[child]))===idx)drawEntry(out,balls[child],tr[child],g);
   if(hideLegs&&LEG_PARTS.includes(part))return;
   if(unders&&unders[part]&&!only)drawEntry(out,unders[part].ent,tr[unders[part].par],g);
   drawEntry(out,grp.parts[part],tr[part],g);
  });
  if(name==="main"&&prep.face&&(!only||only.has("head")))drawEntry(out,prep.face,tr.head,g);
 }
 return out;
}
function setJointMode(m){JOINT_MODE_CUR=(m==="v4"||m==="legacy"||m==="v2")?m:"v2"}
function setLowerSprites(v){LOWER_SPRITES=!!v}
function setW4(v){W4=!!v}
function setCanvas(mode){CANVAS=mode==="overflow128"?"overflow128":"legacy64"}
return Object.freeze({W,H,N,BW,BH,OX,OY,PARTS,PARENTS,DRAW_ORDER,GROUPS,LAYERS,CAP_RADIUS,INHERIT,UNASSIGNED,bodyMask,
 over,expandMask,prepare,render,renderParts,JOINT_FILL,JOINT_MODE,SH_DY,RAISE_FRONT,HIP_CENTRE,V4_CRACK,KNEE_Y,HIP_Y,PINHOLE,fixSlice,buildBalls,pinholeFill,
 shoulderToTorso,v4Post,v4Passes,w4Render,w4GarmentFam,w4RaiseOrder,W4_RAISE_OVER,matrices,scale2x,validOrder,bboxOf,canvasGeom,cropLogical,selectLower,lowerAngles,lowerFileName,previewWearId,SEATED_POSES,LEG_PARTS,
 get LOWER_SPRITES(){return LOWER_SPRITES},get W4(){return W4},setW4,get CANVAS(){return CANVAS},get jointMode(){return JOINT_MODE_CUR},setLowerSprites,setCanvas,setJointMode});
});
