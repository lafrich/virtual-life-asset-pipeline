/* Genesis Appearance Master — source-coordinate correspondence transfer.
 * A four-view idle-F0 authored layer is the anatomical/visual reference.
 * Delta pixels (not the full idle sprite) are aligned to each existing native
 * 11-action frame, preserving its body motion and background transparency.
 * No blanket idle PNG replacement or face/Emosi writes.
 */
(function(root,factory){"use strict";const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.GenesisAppearanceTransfer=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const W=64,H=112,N=W*H;
 const same=(a,b,p,q)=>a[p]===b[q]&&a[p+1]===b[q+1]&&a[p+2]===b[q+2]&&a[p+3]===b[q+3];
 function bbox(data){
  let count=0,left=W,top=H,right=-1,bottom=-1,sumX=0,sumY=0;
  for(let i=0;i<N;i++){
   if(data[i*4+3]<8)continue;
   const x=i%W,y=(i/W)|0;
   left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
   sumX+=x;sumY+=y;count++;
  }
  return {count,left,top,right,bottom,cx:count?sumX/count:W/2,cy:count?sumY/count:H/2};
 }
 function changedPixels(before,after){
  const edits=[];
  for(let i=0;i<N;i++){
   const a=i*4;
   if(!same(before,after,a,a))edits.push(i);
  }
  return edits;
 }
 function candidateScore(before,target,src,dst,dx,dy){
  const x=src%W,y=(src/W)|0,tx=dst%W,ty=(dst/W)|0;
  let score=(tx-x-dx)**2+(ty-y-dy)**2;
  // Compare a compact local source/target neighborhood to disambiguate
  // repeated skin/clothing colors without overwriting unrelated limbs.
  for(const [ox,oy] of [[-1,0],[1,0],[0,-1],[0,1]]){
   const sx=x+ox,sy=y+oy,px=tx+ox,py=ty+oy;
   if(sx<0||sy<0||sx>=W||sy>=H||px<0||py<0||px>=W||py>=H)continue;
   const si=(sy*W+sx)*4,di=(py*W+px)*4;
   if((before[si+3]>0)!==(target[di+3]>0))score+=2;
   else if(before[si+3]&&target[di+3]&&!same(before,target,si,di))score+=.4;
  }
  return score;
 }
 function transfer(before,after,target){
  if(!before||!after||!target||before.length!==N*4||after.length!==N*4||target.length!==N*4)
   throw Error("Genesis Appearance transfer needs three 64×112 RGBA buffers");
  const out=new Uint8ClampedArray(target),edits=changedPixels(before,after);
  if(!edits.length)return {pixels:out,changed:0,matched:0,skipped:0,exact:false};
  let identical=true;
  for(let i=0;i<before.length;i++)if(before[i]!==target[i]){identical=false;break}
  if(identical)return {pixels:new Uint8ClampedArray(after),changed:edits.length,matched:edits.length,skipped:0,exact:true};
  const a=bbox(before),b=bbox(target);
  if(!a.count||!b.count)return {pixels:out,changed:edits.length,matched:0,skipped:edits.length,exact:false};
  const dx=Math.round(b.cx-a.cx),dy=Math.round(b.cy-a.cy);
  const claimed=new Set();
  let matched=0;
  for(const src of edits){
   const old=src*4,x=src%W,y=(src/W)|0;
   // Geometry additions may only attach near the existing silhouette; do
   // not stamp patches into empty backgrounds of unrelated extreme poses.
   const extra=before[old+3]===0&&after[old+3]>0;
   if(extra){
    let touches=false;
    for(const [ox,oy] of [[-1,0],[1,0],[0,-1],[0,1]]){
     const sx=x+ox,sy=y+oy;
     if(sx>=0&&sx<W&&sy>=0&&sy<H&&before[(sy*W+sx)*4+3]>0){touches=true;break}
    }
    if(!touches)continue;
   }
   let chosen=-1,best=Infinity;
   const cx=x+dx,cy=y+dy;
   const radius=7;
   for(let oy=-radius;oy<=radius;oy++)for(let ox=-radius;ox<=radius;ox++){
    if(ox*ox+oy*oy>radius*radius)continue;
    const px=cx+ox,py=cy+oy;
    if(px<0||py<0||px>=W||py>=H)continue;
    const dest=py*W+px,at=dest*4;
    if(claimed.has(dest))continue;
    if(extra){
     if(target[at+3]!==0)continue;
     let neighbors=0;
     for(const [nx,ny] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const ax=px+nx,ay=py+ny;
      if(ax>=0&&ax<W&&ay>=0&&ay<H&&target[(ay*W+ax)*4+3]>0)neighbors++;
     }
     if(!neighbors)continue;
    }else if(!same(before,target,old,at))continue;
    const score=candidateScore(before,target,src,dest,dx,dy);
    if(score<best){best=score;chosen=dest}
   }
   if(chosen<0)continue;
   out.set(after.subarray(old,old+4),chosen*4);
   claimed.add(chosen);matched++;
  }
  return {pixels:out,changed:edits.length,matched,skipped:edits.length-matched,exact:false};
 }
 return Object.freeze({W,H,bbox,changedPixels,transfer});
});
