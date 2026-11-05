/* Mahluk Hidup 2.0 — four-view canonical rig / 2.5D camera math.
 * Every view reads the SAME bone transforms and hierarchy. Only the camera
 * projection changes; source art in each four-direction atlas stays distinct.
 */
(function(root,factory){"use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MH2ViewProjection=api;
})(typeof window!=="undefined"?window:null,function(){"use strict";
 const DIR=["se","sw","nw","ne"];
 const MAP={
  se:{mirror:false,back:false,zx:-0.60,zy:-0.28},
  sw:{mirror:true,back:false,zx:0.60,zy:-0.28},
  nw:{mirror:true,back:true,zx:0.60,zy:0.28},
  ne:{mirror:false,back:true,zx:-0.60,zy:0.28}
 };
 const config=dir=>MAP[dir]||MAP.se;
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
 function planePosition(p,dir,flat=false){
  const c=config(dir),z=flat?0:(Number(p.z)||0);
  return {x:(c.mirror?64-p.x:p.x)+c.zx*z,y:p.y+c.zy*z};
 }
 function dragDelta(dx,dy,scale,dir,axis){
  const c=config(dir),d=Math.max(.00001,Math.abs(scale));
  if(axis==="x")return (c.mirror?-dx:dx)/d;
  if(axis==="y")return dy/d;
  if(axis==="z"){
   // Orthogonal projection of pointer motion onto the on-screen Z handle.
   const denom=c.zx*c.zx+c.zy*c.zy;
   return (dx*c.zx+dy*c.zy)/(d*denom);
  }
  return 0;
 }
 function rotationDelta(deltaDeg,dir){return config(dir).mirror?-deltaDeg:deltaDeg}
 function depth(p,dir){return (config(dir).back?-1:1)*(Number(p?.z)||0)}
 function orbit(dir,steps=1){return DIR[(DIR.indexOf(dir)+DIR.length+steps%DIR.length)%DIR.length]||"se"}
 function explosion(rank,total,spacing,dir){
  const gap=clamp(spacing,0,8);
  if(total<=1||gap===0)return {x:0,y:0};
  const centered=rank-(total-1)/2,side=config(dir).mirror?-1:1;
  return {x:centered*gap*.8*side,y:-centered*gap*.42};
 }
 return Object.freeze({DIR,MAP,config,planePosition,dragDelta,rotationDelta,depth,orbit,explosion});
});
