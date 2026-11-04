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
