'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../site/genesis-native-python-contract.js');
const M=require('../site/genesis-master-rig.js');
global.GenesisNativePythonContract=C;
global.GenesisMasterRig=M;
const Clipboard=require('../site/genesis-pose-clipboard.js');
const Puppet=require('../site/genesis-puppet-renderer.js');
test('only two stable original Genesis master IDs; 15 joints 6 pivots 4 exact slice masks',()=>{
 const male=M.validate(M.initial('male')),female=M.validate(M.initial('female'));
 assert.equal(male.id,'genesis_male_nude');
 assert.equal(female.id,'genesis_female_nude');
 for(const row of [male,female])for(const dir of M.DIRS){
  assert.equal(Object.keys(row.joints[dir]).length,15);
  assert.equal(Object.keys(row.pivots[dir]).length,6);
  assert.equal(M.decode(row.masks[dir]).length,64*112);
 }
 assert.notEqual(male.id,female.id);
 assert.throws(()=>M.validate({...male,id:'mh2_old_draft'}),/Genesis Master/);
 assert.throws(()=>M.initial('noor'),/Genesis Master/);
});
test('per-direction masks encode exact pixels without touching source',()=>{
 const profile=M.initial('male'),se=M.decode(profile.masks.se);
 se[30*64+32]=M.PARTS.indexOf('torso');
 profile.masks.se=M.encode(se);
 const valid=M.validate(profile);
 assert.equal(M.decode(valid.masks.se)[30*64+32],M.PARTS.indexOf('torso'));
 assert.notEqual(valid.masks.se,valid.masks.sw,'Only edited direction changes');
 const unselect=M.decode(valid.masks.se);
 unselect[30*64+32]=M.UNSELECTED;
 valid.masks.se=M.encode(unselect);
 const changed=M.validate(valid);
 assert.equal(M.decode(changed.masks.se)[30*64+32],255,'Unselect must survive validation and encoding');
 assert.equal(M.decode(changed.masks.sw)[30*64+32],M.decode(valid.masks.sw)[30*64+32],
  'Unselect must not affect other directions');
 const bad=M.initial('female');bad.masks.sw='AA==';
 assert.throws(()=>M.validate(bad),/Genesis Master/);
});
test('Copy Paste Flip swaps near/far, mirrors X, negates all 6 angles',()=>{
 const p=C.pose();
 p.joints.hand_near={x:12,y:76};p.joints.hand_far={x:46,y:80};
 p.joints.elbow_near={x:21,y:61};
 p.angles.elbow_near=34;p.angles.elbow_far=-9;p.angles.head=18;
 const flipped=Clipboard.flip(p);
 assert.deepEqual(flipped.joints.hand_far,{x:51,y:76});
 assert.deepEqual(flipped.joints.hand_near,{x:17,y:80});
 assert.equal(flipped.angles.elbow_far,-34);
 assert.equal(flipped.angles.elbow_near,9);
 assert.equal(flipped.angles.head,-18);
 const unflipped=Clipboard.flip(flipped);
 assert.deepEqual(unflipped,p,'Paste Flip twice must return the exact original pose');
 const d=C.make({name:'Copy Pose QA',frameCount:2});
 d.poses.se[0]=p;
 d.poses.sw[0]=Clipboard.paste(p,true);
 C.validate(d);
});
test('Copy/Paste all preserves all Python frames and does not alias source',()=>{
 const d=C.make({name:'Copy Direction QA',frameCount:4});
 d.poses.se[1].joints.head={x:34,y:40};
 const copied=Clipboard.pasteDirection(d.poses.se,d.poses.ne);
 assert.deepEqual(copied,d.poses.se);
 copied[1].joints.head.x=52;
 assert.equal(d.poses.se[1].joints.head.x,34);
 assert.throws(()=>Clipboard.pasteDirection(d.poses.se,d.poses.ne.slice(2)),/Copy\/Paste all/);
});
test('native Genesis puppet transform derives offsets from Python joints and master pivots',()=>{
 const data=C.pose(),rig=M.initial('male');
 data.joints.hand_near.x+=12;data.angles.elbow_near=25;
 const t=Puppet.partParams(data,rig,'se','arm_l');
 assert.ok(t.x>0);assert.equal(t.angle,25);assert.equal(t.ax,25);assert.equal(t.ay,61);
 rig.pivots.se.arm_l.x=28;
 assert.equal(Puppet.partParams(data,rig,'se','arm_l').ax,28);
});
