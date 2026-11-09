'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Core=require('../site/lafrich-puppet-core.js');
const Runtime=require('../site/lafrich-puppet-renderer.js');
const male=Core.master('male'),female=Core.master('female');
test('Lafrich base has exactly two independent immutable IDs',()=>{
 assert.equal(Core.IDS.male,'lafrich_male');assert.equal(Core.IDS.female,'lafrich_female');
 assert.equal(Core.validateMaster(male).id,'lafrich_male');
 assert.equal(Core.validateMaster(female).id,'lafrich_female');
 assert.throws(()=>Core.validateMaster({...male,id:'genesis_male_nude'}),/Lafrich Puppet/);
 assert.equal(Object.keys(male.pivots).length,4);
});
test('real 10-piece skeletal rig separates both arms into upper and lower, both legs into thigh and calf',()=>{
 assert.equal(Core.PARTS.length,10);
 for(const side of ['near','far']){
  assert.ok(Core.PARTS.includes('arm_'+side+'_upper'));
  assert.ok(Core.PARTS.includes('arm_'+side+'_lower'));
  assert.ok(Core.PARTS.includes('leg_'+side+'_upper'));
  assert.ok(Core.PARTS.includes('leg_'+side+'_lower'));
  assert.equal(Core.PARENTS['arm_'+side+'_lower'],'arm_'+side+'_upper');
  assert.equal(Core.PARENTS['leg_'+side+'_lower'],'leg_'+side+'_upper');
  assert.equal(Core.PARENTS['arm_'+side+'_upper'],'torso');
  assert.equal(Core.PARENTS['leg_'+side+'_upper'],'torso');
  assert.deepEqual(Runtime.partPath('arm_'+side+'_lower',Core),['torso','arm_'+side+'_upper','arm_'+side+'_lower']);
  assert.deepEqual(Runtime.partPath('leg_'+side+'_lower',Core),['torso','leg_'+side+'_upper','leg_'+side+'_lower']);
 }
 assert.equal(Core.PARENTS.head,'torso');
});
test('four independent pixel masks use new upper/lower parts; unselect removes only assignment',()=>{
 const c=Core.master('male');
 for(const d of Core.DIRS){
  const mask=Core.decode(c.masks[d]);assert.equal(mask.length,64*112);
  assert.equal(mask[67*64+20],Core.PARTS.indexOf('arm_near_upper'));
  assert.equal(mask[77*64+20],Core.PARTS.indexOf('arm_near_lower'));
  assert.equal(mask[89*64+26],Core.PARTS.indexOf('leg_near_upper'));
  assert.equal(mask[100*64+26],Core.PARTS.indexOf('leg_near_lower'));
 }
 const se=Core.decode(c.masks.se);se[20*64+31]=255;c.masks.se=Core.encode(se);
 assert.equal(Core.decode(Core.validateMaster(c).masks.se)[20*64+31],255);
 assert.notEqual(c.masks.se,c.masks.sw);
});
test('Master Body Piece placement retains original images, slices, pivots and stable IDs',()=>{
 const m=Core.master('male'),beforeMasks={...m.masks},beforePivots=JSON.stringify(m.pivots);
 assert.equal(m.placements.se.arm_near_lower.x,0);
 const legacy={...m};delete legacy.placements;
 assert.equal(Core.validateMaster(legacy).placements.se.arm_near_lower.x,0,
  'Old Lafrich masters must still open with neutral placement');
 m.placements.se.arm_near_upper={x:4,y:-2};
 m.placements.se.arm_near_lower={x:1,y:3};
 const saved=Core.validateMaster(m);
 assert.equal(saved.id,'lafrich_male');
 assert.deepEqual(saved.placements.se.arm_near_upper,{x:4,y:-2});
 assert.deepEqual(saved.placements.se.arm_near_lower,{x:1,y:3});
 assert.equal(saved.placements.sw.arm_near_lower.x,0,
  'Other camera directions must remain independent');
 assert.deepEqual(saved.masks,beforeMasks,'Do not reslice art during a move');
 assert.equal(JSON.stringify(saved.pivots),beforePivots,'Do not shift native pivot coordinates');
 assert.deepEqual(saved.layers,m.layers,'Do not rewrite any PNG/Art Layer');
 m.placements.se.arm_near_upper.x=65;
 assert.throws(()=>Core.validateMaster(m),/Invalid body piece placement/);
});
test('Hierarchical rest placement moves body and wear through the SAME puppet transform',()=>{
 const old=globalThis.LafrichPuppetCore;
 globalThis.LafrichPuppetCore=Core;
 try{
  const master=Core.master('male');
  master.placements.se.torso={x:3,y:-2};
  master.placements.se.arm_near_upper={x:4,y:5};
  master.placements.se.arm_near_lower={x:-1,y:6};
  const prepared={master:Core.validateMaster(master),dir:'se'};
  const trace=()=>{
   const pos={x:0,y:0};
   const ctx={translate(x,y){pos.x+=x;pos.y+=y},rotate(){}};
   return {ctx,pos};
  };
  const t=trace();
  Runtime.transform(t.ctx,prepared,Core.blankPose(),'arm_near_lower');
  assert.deepEqual(t.pos,{x:6,y:9},'Upper-arm move must carry its forearm pixels');
  const u=trace();
  Runtime.transform(u.ctx,prepared,Core.blankPose(),'arm_far_lower');
  assert.deepEqual(u.pos,{x:3,y:-2},'Far arm only follows common torso');
  const animated=Core.blankPose();animated.arm_near_lower.x=2;animated.arm_near_lower.y=3;
  const a=trace();
  Runtime.transform(a.ctx,prepared,animated,'arm_near_lower');
  assert.deepEqual(a.pos,{x:8,y:12},'Python animation adds to Master rest position');
  const face=trace();
  Runtime.transform(face.ctx,prepared,Core.blankPose(),'head');
  assert.deepEqual(face.pos,{x:3,y:-2},'Emosi head follows moved torso');
 }finally{globalThis.LafrichPuppetCore=old}
});
test('new Python motion has only one blank, unsaved authoring frame; no eleven installed animations',()=>{
 const source=Core.motion('Hand Wave');
 assert.equal(source.frames.length,1);assert.equal(source.id,'');
 for(const d of Core.DIRS)assert.equal(Object.keys(source.frames[0].poses[d]).length,10);
 source.frames[0].poses.se.arm_near_lower.a=78;
 source.frames[0].poses.se.arm_near_upper.a=23;
 const text=Core.toPython(source),loaded=Core.fromPython(text);
 assert.deepEqual(loaded,source);
 assert.equal(loaded.frames[0].poses.se.arm_near_lower.a,78);
 assert.throws(()=>Core.fromPython('import os\\nos.system("rm -rf /")'),/Lafrich Puppet/);
 assert.throws(()=>Core.fromPython('MOTION = __import__("os")'),/Lafrich Puppet/);
});
test('Custom Wear selects character four-view images without mutating master',()=>{
 const c=Core.character('female');
 assert.ok(Core.WEAR.includes('top'));
 assert.ok(Core.WEAR.includes('pants'));
 const fake='data:image/png;base64,iVBORw0KGgo=';
 c.wear.top.se=fake;
 const after=Core.validateCharacter(c);
 const selected=Runtime.resolveLayers(female,after,'se');
 assert.equal(selected.top,fake);
 assert.equal(female.layers.top.se,undefined);
 assert.equal(Runtime.resolveLayers(female,after,'sw').top,'');
});
