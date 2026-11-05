"use strict";
const assert=require("node:assert/strict");
const A=require("../site/action-scene-bridge.js");
const fake=()=>({values:{},getItem(k){return this.values[k]??null},
 setItem(k,v){this.values[k]=v;},removeItem(k){delete this.values[k]}});
const store=fake();
const scene={
 name:"Two Character Chat",trigger:"talk",fixture:"chair",durationMs:3200,
 participants:[
  {slot:1,actorId:"human_male_base",motionId:"talk",direction:"sw",x:-75,y:0,
   layer:1,expressionId:"happy",autoFace:false,equipment:{shirt:"none",pants:"inherit"}},
  {slot:2,actorId:"human_female_base",motionId:"sit",direction:"se",x:65,y:4,
   layer:3,objectLayer:"behind",equipment:{shirt:"inherit",pants:"none"}}
 ]};
const out=A.save(scene,store);
assert.ok(out.id.startsWith("act_"));
assert.equal(A.list(store).length,1);
assert.equal(A.get(out.id,store).participants.length,2);
assert.equal(A.get(out.id,store).participants[0].equipment.shirt,"none");
assert.equal(A.get(out.id,store).participants[1].objectLayer,"behind");
assert.equal(A.forPlacement("chair","talk",store).id,out.id);
assert.equal(A.bind("wc","use_toilet",out.id,store),true);
assert.equal(A.forPlacement("wc","use_toilet",store).id,out.id);
assert.equal(A.unbind("wc","use_toilet",store),true);
assert.equal(A.forPlacement("wc","use_toilet",store),null);
const d=A.decode(JSON.stringify({scene:out}));
assert.equal(d.participants.length,2);
const bad=A.clean({participants:[{actorId:"javascript:alert(1)",motionId:"idle"}]});
assert.equal(bad,null);
assert.equal(A.clean({...scene,participants:[
 ...scene.participants,
 {...scene.participants[0],slot:1}]}).participants[2].slot,3);
const max=A.clean({...scene,participants:[...scene.participants,
 ...Array.from({length:12},(_,i)=>({actorId:"human_male_base",motionId:"idle",slot:i+3}))]});
assert.equal(max.participants.length,8);
assert.equal(A.remove(out.id,store),true);
assert.equal(A.list(store).length,0);
console.log("PASS multi-actor act save, validation, layers, clothes, placement binding, JSON round-trip");

const face=A.clean({...scene,participants:[{...scene.participants[0],
 faceAssetId:"expression_smile",
 faceAssetData:"data:image/png;base64,AAAA",
 faceOffsetX:8,faceOffsetY:-4}]});
assert.equal(face.participants[0].faceAssetId,"expression_smile");
assert.equal(face.participants[0].faceAssetData,"data:image/png;base64,AAAA");
assert.equal(face.participants[0].faceOffsetX,8);
assert.equal(face.participants[0].faceOffsetY,-4);
assert.equal(A.clean({...scene,participants:[{...scene.participants[0],
 faceAssetData:"data:text/html;base64,AAAA"}]}).participants[0].faceAssetData,null);


// Posture face regression: the old editor pasted a 32x29 full idle head
// into every squat/bend pose. A 15x14 inner crop must follow the measured
// head anchor with no second skull silhouette or displaced facial features.
function frameHead(cx,top){
 const data=new Uint8ClampedArray(64*112*4);
 for(let y=top;y<top+21;y++)for(let x=cx-10;x<=cx+10;x++){
  const i=(y*64+x)*4;data[i+3]=255;
 }
 for(let y=top+21;y<100;y++)for(let x=cx-6;x<cx+6;x++){
  const i=(y*64+x)*4;data[i+3]=255;
 }
 return {data,width:64,height:112};
}
for(const [motion,cx,top] of [
 ["idle",33,32],["squat_idle",33,49],["squat_down",33,35],
 ["knee_chest_idle",33,48],["bent_over_idle",45,56]
]){
 const measured=A.headAnchor(frameHead(cx,top));
 assert.deepEqual(measured,{x:cx,y:top},motion);
 const patch=A.nativeFacePatch({x:33,y:32},measured);
 assert.equal(patch.w,27,motion);
 assert.equal(patch.h,25,motion);
 assert.equal(patch.sx,20,motion);
 assert.equal(patch.sy,39,motion);
 assert.equal(patch.dx,cx-13,motion);
 assert.equal(patch.dy,top+7,motion);
}
assert.deepEqual(A.nativeFacePatch({x:33,y:32},{x:45,y:56},2,-2),
 {sx:20,sy:39,dx:34,dy:61,w:27,h:25});
assert.equal(A.nativeFacePatch({x:33,y:32},{x:60,y:90}),null);
console.log("PASS measured single-head face patch for idle, squat, knee-chest and bending");
