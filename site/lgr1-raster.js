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
let LOWER_SPRITES=false,CANVAS="legacy64";
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
const JOINT_MODE="v2",KNEE_Y=90,HIP_Y=0,PINHOLE=2,BALL_MAX_R=4; // HIP_Y 0 = keep the artist hip pivots
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
 else if(a.dy>=6&&a.knee>=80)pid="kneel";
 else pid="rig";
 if(pid==="rig"&&outfit==="skirt"&&!LEG_PARTS.some(p=>angOf(pose,p)))pid="stand";
 const has=p=>!available||available.has?available.has(p):available.includes(p);
 if(pid!=="rig"&&available&&!has(pid))pid=(pid==="sit_floor"&&has("sit_chair"))?"sit_chair":"rig";
 return pid;
}
function lowerFileName(pose,view,body,outfit){return "lgr1_lower_"+pose+"_"+view+"_"+body+"_"+outfit+".png"}
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
 const mode=o.jointMode||JOINT_MODE;
 let mask=o.mask,pivots=o.pivots;
 if(mode==="v2"){const f=fixSlice(mask,pivots);mask=f.mask;pivots=f.pivots}
 const layers=o.layers||{},wear=o.wear||{},tweak=o.tweak||null;
 const order=validOrder(o.order)?o.order.slice():DRAW_ORDER.slice();
 const caps=Object.assign({},CAP_RADIUS,o.caps||{});
 if(mode==="v2")for(const k of Object.keys(caps))if(k!=="head")caps[k]=0;
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
 const balls=mode==="v2"?buildBalls(groups.main.parts,pivots,order):{};
 return {order,pivots,placements:o.placements||{},groups,face,mode,balls};
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
function render(prep,pose,opts){
 const geom=canvasGeom(opts?.canvas),out=renderParts(prep,pose,opts,geom);
 if(prep.mode==="v2"){if(PINHOLE>0)pinholeFill(out,undefined,geom);return out}
 if(geom.cw!==W||geom.ch!==H)return out;
 if(JOINT_FILL>0){const tr=matrices(prep.pivots,prep.placements,pose);jointFill(out,prep,tr,JOINT_FILL);jointFill(out,prep,tr,JOINT_FILL)}
 return out;
}
function renderParts(prep,pose,opts,geom){
 const g=geom||canvasGeom(opts?.canvas),cw=g.cw,ox=g.ox,oy=g.oy,cn=g.cn;
 const out=new Uint8ClampedArray(cn*4),tr=matrices(prep.pivots,prep.placements,pose);
 const order=validOrder(opts?.order)?opts.order:prep.order,lower=opts?.lower||null,hideLegs=!!lower;
 for(const [name] of GROUPS){
  const grp=prep.groups[name],s=grp.still;
  for(let k=0;k<N;k++){const c=k*4;if(s[c+3]){const x=k%W,y=(k-x)/W;over(out,(y+oy)*cw+(x+ox),s[c],s[c+1],s[c+2],s[c+3])}}
  if(name==="main"&&lower)drawEntry(out,lower,tr.pelvis,g);
  let balls=name==="main"?(prep.balls||{}):{};
  if(hideLegs)balls=Object.fromEntries(Object.entries(balls).filter(([k])=>!String(k).startsWith("leg_")));
  order.forEach((part,idx)=>{
   for(const child of Object.keys(balls))if(Math.min(order.indexOf(child),order.indexOf(PARENTS[child]))===idx)drawEntry(out,balls[child],tr[child],g);
   if(hideLegs&&LEG_PARTS.includes(part))return;
   drawEntry(out,grp.parts[part],tr[part],g);
  });
  if(name==="main"&&prep.face)drawEntry(out,prep.face,tr.head,g);
 }
 return out;
}
function setLowerSprites(v){LOWER_SPRITES=!!v}
function setCanvas(mode){CANVAS=mode==="overflow128"?"overflow128":"legacy64"}
return Object.freeze({W,H,N,BW,BH,OX,OY,PARTS,PARENTS,DRAW_ORDER,GROUPS,LAYERS,CAP_RADIUS,INHERIT,UNASSIGNED,bodyMask,
 over,expandMask,prepare,render,renderParts,JOINT_FILL,JOINT_MODE,KNEE_Y,HIP_Y,PINHOLE,fixSlice,buildBalls,pinholeFill,
 matrices,scale2x,validOrder,bboxOf,canvasGeom,cropLogical,selectLower,lowerAngles,lowerFileName,LEG_PARTS,
 get LOWER_SPRITES(){return LOWER_SPRITES},get CANVAS(){return CANVAS},setLowerSprites,setCanvas});
});
