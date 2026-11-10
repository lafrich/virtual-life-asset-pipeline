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
function prepare(o){
 const mask=o.mask,layers=o.layers||{},wear=o.wear||{},tweak=o.tweak||null;
 const order=validOrder(o.order)?o.order.slice():DRAW_ORDER.slice();
 const caps=Object.assign({},CAP_RADIUS,o.caps||{});
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
   const pv=o.pivots[child],above=order.indexOf(child)>order.indexOf(parent);
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
 return {order,pivots:o.pivots,placements:o.placements||{},groups,face};
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
function drawEntry(out,entry,tr){
 if(!entry||!entry.bbox)return;
 const [x0,y0,x1,y1]=entry.bbox,m=tr.mat,inv=inverse(m);
 const right=Math.abs(tr.angle-90*Math.round(tr.angle/90))<1e-9;
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const [cx,cy] of [[x0,y0],[x1+1,y0],[x0,y1+1],[x1+1,y1+1]]){
  const [px,py]=mapPoint(m,cx,cy);
  minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
 }
 const ox0=Math.max(0,Math.floor(minX)-1),ox1=Math.min(W-1,Math.ceil(maxX)+1);
 const oy0=Math.max(0,Math.floor(minY)-1),oy1=Math.min(H-1,Math.ceil(maxY)+1);
 const img=entry.img,sc=right?null:scaledOf(entry);
 for(let y=oy0;y<=oy1;y++)for(let x=ox0;x<=ox1;x++){
  const [sx,sy]=mapPoint(inv,x+.5,y+.5);
  if(right){
   const ix=Math.floor(sx),iy=Math.floor(sy);
   if(ix<x0||ix>x1||iy<y0||iy>y1)continue;
   const o=(iy*W+ix)*4;
   if(img[o+3])over(out,y*W+x,img[o],img[o+1],img[o+2],img[o+3]);
  }else{
   const u=Math.floor((sx-sc.ox)*8),v=Math.floor((sy-sc.oy)*8);
   if(u<0||v<0||u>=sc.w||v>=sc.h)continue;
   const p=sc.data[v*sc.w+u];
   if(p)over(out,y*W+x,p>>>24,(p>>>16)&255,(p>>>8)&255,p&255);
  }
 }
}
function render(prep,pose,opts){
 const out=new Uint8ClampedArray(N*4),tr=matrices(prep.pivots,prep.placements,pose);
 const order=validOrder(opts?.order)?opts.order:prep.order;
 for(const [name] of GROUPS){
  const g=prep.groups[name],s=g.still;
  for(let k=0;k<N;k++){const c=k*4;if(s[c+3])over(out,k,s[c],s[c+1],s[c+2],s[c+3])}
  for(const part of order)drawEntry(out,g.parts[part],tr[part]);
  if(name==="main"&&prep.face)drawEntry(out,prep.face,tr.head);
 }
 return out;
}
return Object.freeze({W,H,N,PARTS,PARENTS,DRAW_ORDER,GROUPS,LAYERS,CAP_RADIUS,INHERIT,UNASSIGNED,bodyMask,
 over,expandMask,prepare,render,matrices,scale2x,validOrder,bboxOf});
});
