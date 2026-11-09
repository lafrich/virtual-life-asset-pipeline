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
test('Body Piece editor isolates each native slice, preserving unrelated parts and four-view master IDs',()=>{
 const master=Core.master('male');
 const nativeMask=Core.decode(master.masks.se),piece='arm_near_lower';
 const chosen=Core.PARTS.indexOf(piece),head=Core.PARTS.indexOf('head');
 const at=(x,y)=>y*64+x,original=new Uint8ClampedArray(Core.N*4);
 const elbow=at(20,76),headPixel=at(32,35),newPixel=at(25,76);
 assert.equal(nativeMask[elbow],chosen);assert.equal(nativeMask[headPixel],head);
 original.set([160,60,30,255],elbow*4);
 original.set([8,90,120,255],headPixel*4);
 const onlyPiece=Core.piecePixels(original,nativeMask,piece);
 assert.deepEqual(Array.from(onlyPiece.slice(elbow*4,elbow*4+4)),[160,60,30,255]);
 assert.deepEqual(Array.from(onlyPiece.slice(headPixel*4,headPixel*4+4)),[0,0,0,0]);
 // Erase a forearm pixel and paint a new pixel where another piece was
 // previously sliced. Only the deliberate new pixel is reassigned.
 const edit=new Uint8ClampedArray(onlyPiece);
 edit.fill(0,elbow*4,elbow*4+4);
 edit.set([240,10,40,255],newPixel*4);
 const result=Core.applyPiecePixels(original,edit,nativeMask,piece);
 assert.deepEqual(Array.from(result.pixels.slice(elbow*4,elbow*4+4)),[0,0,0,0]);
 assert.deepEqual(Array.from(result.pixels.slice(headPixel*4,headPixel*4+4)),[8,90,120,255]);
 assert.equal(result.mask[newPixel],chosen);
 assert.equal(result.mask[headPixel],head);
 assert.equal(original[elbow*4],160,'original layer stays immutable');
 assert.equal(nativeMask[newPixel],Core.PARTS.indexOf('torso'),'original slice stays immutable');
 assert.equal(Core.validateMaster(master).id,'lafrich_male');
 for(const dir of Core.DIRS)assert.equal(Core.decode(master.masks[dir]).length,Core.N);
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
test('Only body artwork is rendered from Master; all wear layers belong to Character',()=>{
 const m=Core.master('male'),c=Core.character('male');
 const old='data:image/png;base64,aGVsbG8=';
 const newWear='data:image/png;base64,d29ybGQ=';
 // Legacy master clothing may still exist in backed-up records, but is not
 // rendered and is not silently deleted by this migration.
 m.layers.body.se=old;m.layers.top.se=old;m.layers.hair_front.se=old;
 assert.equal(Runtime.resolveLayers(m,null,'se').body,old);
 assert.equal(Runtime.resolveLayers(m,null,'se').top,'');
 assert.equal(Runtime.resolveLayers(m,null,'se').hair_front,'');
 assert.equal(Runtime.resolveLayers(m,c,'se').top,'');
 c.wear.top.se=newWear;c.wear.hair_front.se=newWear;
 assert.equal(Runtime.resolveLayers(m,c,'se').top,newWear);
 assert.equal(Runtime.resolveLayers(m,c,'se').hair_front,newWear);
 assert.equal(m.layers.top.se,old,'legacy saved clothing was preserved in original master data');
 const checked=Core.validateMaster(m);
 assert.equal(checked.layers.top.se,old,'legacy master bytes remain recoverable');
});
test('Master UI never exposes Art Layer clothing editor; Character owns wear import',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const base=path.join(__dirname,'../site');
 const html=fs.readFileSync(path.join(base,'lafrich-puppet-studio.html'),'utf8');
 const js=fs.readFileSync(path.join(base,'lafrich-puppet-studio.js'),'utf8');
 assert.match(html,/id="edit-piece"/);
 assert.doesNotMatch(html,/id="master-layer"|id="edit-master"|id="import-layer"/);
 assert.match(html,/data-page="character"[\\s\\S]*id="wear-layer"/);
 assert.match(html,/id="import-wear"/);
 assert.match(js,/C\\.WEAR\\.includes\\(selectedLayer\\)/);
 assert.doesNotMatch(js,/artLayer|\$\("master-layer"\)|\$\("edit-master"\)/);
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
