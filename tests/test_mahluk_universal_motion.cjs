'use strict';
/* Genesis Universal V6B: machine-level contract & no-baked-clothing regression. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const C=require('../site/v6p-universal-motion-contract.js');
function motion(n=3){const frames=Array.from({length:n},(_,i)=>({key:'f'+i,ms:140}));
 return {frames,value:C.make({sourceAction:'idle',frames,tracks:C.tracks(n)})};}
test('universal movement is a standalone four-direction pose, never character clothing',()=>{
 const {frames,value}=motion();
 assert.equal(C.validate(value,frames),true);
 assert.deepEqual(Object.keys(value.tracks).sort(),['ne','nw','se','sw']);
 for(const dir of C.DIRS)for(const p of value.tracks[dir])
  assert.deepEqual(Object.keys(p).sort(),[...C.PARTS].sort());
 const prohibited=['characterId','sourceId','appearance','wear','faceId'];
 for(const key of prohibited)assert.throws(()=>C.validate({...value,[key]:'x'},frames),/must not contain/);
});
test('strict validation rejects missing direction, missing body part and invalid timing',()=>{
 const {frames,value}=motion(2);
 assert.throws(()=>C.validate({...value,tracks:{se:[]}},frames),/frame count mismatch/);
 const incomplete=JSON.parse(JSON.stringify(value));delete incomplete.tracks.sw[1].arm_r;
 assert.throws(()=>C.validate(incomplete,frames),/invalid arm_r/);
 assert.throws(()=>C.validate(value,[{key:'f0',ms:10},{key:'f1',ms:140}]),/duration/);
 const out=JSON.parse(JSON.stringify(value));out.tracks.nw[0].head.x=500;
 assert.throws(()=>C.validate(out,frames),/out of bounds/);
});
test('manifest is V6B-compatible and only a reviewed record is stock',()=>{
 const {frames,value}=motion(4);
 const base={id:'clp_scratch_head',sheet:{cell:[64,112],pivot:[32,100]},
  dirs:[...C.DIRS],frames,motion:value};
 assert.equal(C.validateManifest(base),true);
 assert.equal(C.isStock(base),false);
 assert.equal(C.isStock({...base,motion:{...value,status:'stock'}}),true);
 assert.throws(()=>C.validateManifest({...base,sheet:{cell:[64,112],pivot:[0,0]}}),/anchor/);
 assert.throws(()=>C.validateManifest({...base,id:'walk'}),/animation ID/);
});
test('motion renderer reads physical layers and editor never bakes outfit pixels to base/body',()=>{
 const animation=read('site/mahluk-animation-studio.js'),rig=read('site/v6p-universal-motion.js'),
  action=read('site/mahluk-action-editor.js'),studio=read('site/v6p-studio.html');
 assert.match(rig,/V6\.files\(ch,"baked"\)/);
 assert.match(rig,/images\[name\]/);
 assert.match(rig,/const geometry=bounds\(body\.data\)/);
 assert.match(animation,/Motion\.prepare\(/);
 assert.match(animation,/Motion\.renderPrepared\(/);
 assert.match(animation,/Contract\.make\(/);
 assert.doesNotMatch(animation,/Store\.setLayer\(state\.id,"base\/body"/);
 assert.match(animation,/Store\.setLayer\(state\.id,"preview\/composite"/);
 assert.match(action,/layout:"universal"/);
 assert.match(action,/Motion\.render\(/);
 assert.match(studio,/UC\.isStock\(row\.manifest\)/);
});
test('UI preserves Pixel/Action UX, offers color edit and strict AI import without altering Emosi',()=>{
 const pixel=read('site/pixel-editor.html'),pixjs=read('site/pixel-editor.js'),
  animation=read('site/mahluk-animation-studio.html'),action=read('site/mahluk-action-editor.html');
 for(const id of ['wear-recolor-tools','wear-recolor-from','wear-recolor-to','wear-recolor','pixelCanvas'])
  assert.ok(pixel.includes('id="'+id+'"'),id);
 assert.match(pixjs,/function recolorCustomWear\(/);
 for(const id of ['import-motion','import-motion-file','submit-stock','stage','frame-strip'])
  assert.ok(animation.includes('id="'+id+'"'),id);
 assert.match(action,/id="action-canvas"/);
 assert.match(read('docs/GENESIS_V6B_ANIMATION_AI_CONTRACT.md'),/STRICT GENESIS V6B MOTION AUTHOR/);
});
