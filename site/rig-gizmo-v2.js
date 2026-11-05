/* Pure 2D gizmo geometry for 64×112 modular pixel puppets.
 * Tiny nonselected pins; selected centre moves, outer ring rotates.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.VLRigGizmoV2=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const W=64,RING=8,ROTATE_HANDLE=10;
 const mirror=direction=>direction==="sw"||direction==="nw";
 const projected=(point,direction)=>({x:mirror(direction)?W-point.x:point.x,y:point.y});
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const angle=(center,point)=>Math.atan2(point.y-center.y,point.x-center.x);
 const deltaAngle=(previous,current)=>{
  let value=(current-previous)*180/Math.PI;
  while(value>180)value-=360;
  while(value< -180)value+=360;
  return value;
 };
 function hitTest(world,selected,pointer,direction){
  // Prioritize visible 1px joint pins before the ring so overlapping wrist
  // and face points remain selectable in the dense 64x112 puppet.
  const point=world[selected]&&projected(world[selected],direction);
  let closest=null;
  for(const [id,value] of Object.entries(world)){
   if(!value.visible)continue;
   const screen=projected(value,direction);
   const d=distance(pointer,screen);
   if(d<=2.5&&(!closest||d<closest.distance))
    closest={mode:"move",bone:id,distance:d};
  }
  if(closest)return closest;
  if(point){
   const d=distance(pointer,point);
   if(d>=RING-2.2&&d<=ROTATE_HANDLE+2.5)
    return {mode:"rotate",bone:selected};
  }
  return null;
 }
 return Object.freeze({W,RING,ROTATE_HANDLE,mirror,projected,distance,angle,deltaAngle,hitTest});
});
