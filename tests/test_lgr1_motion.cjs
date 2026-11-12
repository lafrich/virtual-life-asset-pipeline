'use strict';
// LGR-1 shared motion contract + core optional-field back-compat.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const M=require('../site/lgr1-motion.js'),Core=require('../site/lafrich-puppet-core.js');
const lib=M.validateLibrary(JSON.parse(fs.readFileSync(path.join(__dirname,'../site/media/lgr1/motions.json'),'utf8')));

test('one shared library: walk/crouch/wave/arms_up/idle, 1-6 keyframes each',()=>{
 const ids=lib.motions.map(m=>m.id);
 for(const id of ['idle','walk','wave','crouch','arms_up'])assert.ok(ids.includes(id),id);
 for(const m of lib.motions){assert.ok(m.frames.length>=1&&m.frames.length<=6);assert.ok(M.duration(m)>0)}
});
test('anatomical sides: the right hand stays the right hand when mirroring SE<->SW and NE<->NW',()=>{
 assert.equal(M.rigPart('arm_r_upper','se',M.DEFAULT_SIDES),'arm_near_upper');
 assert.equal(M.rigPart('arm_r_upper','sw',M.DEFAULT_SIDES),'arm_far_upper');
 assert.equal(M.rigPart('arm_r_upper','ne',M.DEFAULT_SIDES),'arm_near_upper');
 assert.equal(M.rigPart('arm_r_upper','nw',M.DEFAULT_SIDES),'arm_far_upper');
 assert.equal(M.rigPart('leg_l_lower','se',M.DEFAULT_SIDES),'leg_far_lower');
 assert.equal(M.rigPart('head','nw',M.DEFAULT_SIDES),'head');
 // a rig may override which side is near per direction
 assert.equal(M.rigPart('arm_r_upper','sw',{...M.DEFAULT_SIDES,sw:'right'}),'arm_near_upper');
 const walk=lib.motions.find(m=>m.id==='walk');
 const se=M.framePose(lib.poses,walk,1,'se',M.DEFAULT_SIDES),sw=M.framePose(lib.poses,walk,1,'sw',M.DEFAULT_SIDES);
 // same anatomical limb, mirrored angle
 assert.equal(sw.arm_far_upper.a,-se.arm_near_upper.a);
 assert.equal(sw.leg_far_upper.a,-se.leg_near_upper.a);
});
test('per-direction overrides are absolute screen values (sideways raise must not mirror)',()=>{
 const wave=lib.motions.find(m=>m.id==='wave');
 const se=M.framePose(lib.poses,wave,0,'se',M.DEFAULT_SIDES),sw=M.framePose(lib.poses,wave,0,'sw',M.DEFAULT_SIDES);
 const ne=M.framePose(lib.poses,wave,0,'ne',M.DEFAULT_SIDES);
 assert.ok(se.arm_near_upper.a>90);
 // Side-specific exports may intentionally differ from SE; each override is an absolute screen angle.
 assert.equal(sw.arm_far_upper.a,wave.frames[0].dirs.sw.arm_r_upper.a);
 assert.equal(ne.arm_near_upper.a,wave.frames[0].dirs.ne.arm_r_upper.a);
 assert.notEqual(sw.arm_far_upper.a,-se.arm_near_upper.a);
});
test('angle snap rounds half-up to the step; validation rejects bad motions',()=>{
 assert.equal(M.snap(12.5,5),15);assert.equal(M.snap(-12.5,5),-10);assert.equal(M.snap(44,45),45);assert.equal(M.snap(7,1),7);
 assert.deepEqual(M.SNAPS,[1,5,10,15,30,45,90]);
 assert.throws(()=>M.validateMotion({id:'Bad Id',frames:[{ms:100,parts:{}}]}));
 assert.throws(()=>M.validateMotion({id:'x',frames:[]}));
 assert.throws(()=>M.validateMotion({id:'x',frames:Array(7).fill({ms:100,parts:{}})}));
 assert.throws(()=>M.validateMotion({id:'x',source:'nope',frames:[{ms:100,parts:{}}]},lib.poses));
 assert.throws(()=>M.validateMotion({id:'x',frames:[{ms:5,parts:{}}]}),/40–2000/);
 assert.equal(M.validateMotion({id:'x',frames:[{ms:120,parts:{arm_r_upper:{a:33}}}]}).frames[0].parts.arm_r_upper.a,33);
});
test('frame timing is stepped and behindTorso reorders only that frame',()=>{
 const m=M.validateMotion({id:'t',frames:[{ms:100,parts:{}},{ms:200,parts:{},behindTorso:['arm_r_upper']}]});
 assert.equal(M.frameIndexAt(m,0),0);assert.equal(M.frameIndexAt(m,99),0);
 assert.equal(M.frameIndexAt(m,100),1);assert.equal(M.frameIndexAt(m,299),1);assert.equal(M.frameIndexAt(m,300),0);
 const base=Core.DRAW_ORDER.slice();
 assert.deepEqual(M.frameOrder(base,m,0,'se',M.DEFAULT_SIDES),base);
 const o=M.frameOrder(base,m,1,'se',M.DEFAULT_SIDES);
 assert.ok(o.indexOf('arm_near_upper')<o.indexOf('torso'));
 assert.equal(o.length,base.length);
});
test('core keeps optional LGR-1 fields and still opens old masters/characters',()=>{
 const m=Core.master('male');
 const old=Core.validateMaster(JSON.parse(JSON.stringify(m)));
 assert.equal(old.drawOrders,undefined);assert.equal(old.sides,undefined);
 m.drawOrders={se:Core.DRAW_ORDER.slice().reverse()};m.sides={sw:'right'};m.capRadius={head:4};
 const v=Core.validateMaster(m);
 assert.deepEqual(v.drawOrders.se,Core.DRAW_ORDER.slice().reverse());
 assert.equal(v.sides.sw,'right');assert.equal(v.capRadius.head,4);
 assert.equal(v.id,'lafrich_male');assert.deepEqual(Core.DRAW_ORDER,[...Core.DRAW_ORDER]);
 const c=Core.character('female');
 const t=Buffer.alloc(64*112,254);t[10]=3;c.maskTweaks={se:t.toString('base64')};
 assert.equal(Core.validateCharacter(c).maskTweaks.se,t.toString('base64'));
 const bad=Buffer.alloc(64*112,200);c.maskTweaks={se:bad.toString('base64')};
 assert.throws(()=>Core.validateCharacter(c));
});
