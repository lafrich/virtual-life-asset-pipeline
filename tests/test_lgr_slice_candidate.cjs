'use strict';
/* Historical official-4 contract: older approved sources must remain untouched after Nova official-5. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('../site/lafrich-puppet-core.js');
const root=path.resolve(__dirname,'../site/media/lgr1/base');
const parse=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const index=parse('archive/index-official-4.json');
const active=parse('index.json');
const nova5=parse('archive/index-official-5.json');
const official6=parse('archive/index-official-6.json');
const previous=parse('genesis-base-male.json');
const archive=parse('archive/genesis-base-male-official-2.json');
const v2Index=parse('archive/index-official-2.json');
const official=parse(index.bases.male.package);
const female=parse(index.bases.female.package);
const originalFemale=parse('genesis-base-female.json');
const femaleTrial=parse('candidates/genesis_female_draft-20261111.json');
const trial=parse('candidates/lgr-male-slice-test-20261111.json');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const dirs=['se','sw','ne','nw'];
test('official-2 original packages remain unchanged, Male official-3 retained',()=>{
 assert.equal(index.version,'official-4');
 assert.equal(v2Index.version,'official-2');
 assert.equal(index.bases.male.package,'genesis-base-male-official-3.json');
 assert.equal(v2Index.bases.male.package,'genesis-base-male.json');
 assert.deepEqual(archive,previous,'Original Male official-2 package must remain byte-identical');
 assert.equal(hash(previous.rig),previous.rigSha256);
 assert.equal(previous.rigSha256,v2Index.bases.male.rigSha256);
 assert.equal(originalFemale.rigSha256,v2Index.bases.female.rigSha256);
 assert.equal(index.bases.female.package,'genesis-base-female-official-4.json');
 assert.equal(v2Index.bases.female.package,'genesis-base-female.json');
 assert.equal(hash(originalFemale.rig),originalFemale.rigSha256);
 assert.equal(hash(female.rig),female.rigSha256);
});
test('user Male candidate is kept raw while official-3 passes master and checksum validation',()=>{
 assert.equal(trial.format,'lgr-1-draft-v1');
 assert.equal(trial.gender,'male');
 assert.equal(trial.record.approved,false,'Source file remains a preserved original draft');
 assert.equal(trial.record.rig.id,'lafrich_male');
 assert.equal(C.validateMaster(trial.record.rig).gender,'male');
 assert.equal(C.validateMaster(official.rig).gender,'male');
 assert.equal(hash(official.rig),official.rigSha256);
 assert.equal(index.bases.male.rigSha256,official.rigSha256);
 assert.equal(index.bases.male.source,'candidates/lgr-male-slice-test-20261111.json');
});
test('official-3 uses the candidate masks, pivots and placements in all four views',()=>{
 const prev=C.validateMaster(previous.rig),cur=C.validateMaster(official.rig),given=C.validateMaster(trial.record.rig);
 assert.deepEqual(cur.layers,prev.layers,'Source pixels must never change');
 assert.deepEqual(cur.drawOrders,prev.drawOrders,'Body draw order preserved');
 assert.deepEqual(cur.sides,prev.sides,'Anatomical side assignment preserved');
 assert.deepEqual(cur.capRadius,prev.capRadius,'Joint cap radii preserved');
 assert.equal(cur.id,prev.id,'Male ID preserved');
 for(const d of dirs){
  const oldMask=C.decode(prev.masks[d]),newMask=C.decode(cur.masks[d]);
  assert.equal(newMask.length,64*112);
  assert.equal(cur.masks[d],given.masks[d]);
  assert.deepEqual(cur.pivots[d],given.pivots[d]);
  assert.deepEqual(cur.placements[d],given.placements[d]);
  assert.ok(newMask.some((v,i)=>v!==oldMask[i]),'Expected new slicing at '+d);
  assert.ok(C.PARTS.some(p=>JSON.stringify(prev.pivots[d][p])!==JSON.stringify(cur.pivots[d][p])),'Expected moved pivot in '+d);
  for(const part of C.PARTS){const q=cur.pivots[d][part];
   assert.ok(q.x>=0&&q.x<64&&q.y>=0&&q.y<112,'Bad pivot '+d+'/'+part)}
 }
});


test('official-4 promotes the Lafrich Female slicing without changing original artwork',()=>{
 const old=C.validateMaster(originalFemale.rig),cur=C.validateMaster(female.rig),given=C.validateMaster(femaleTrial.record.rig);
 assert.equal(femaleTrial.format,'lgr-1-draft-v1');
 assert.equal(femaleTrial.gender,'female');
 assert.equal(femaleTrial.record.approved,false,'Original source metadata is preserved');
 assert.equal(index.bases.female.source,'candidates/genesis_female_draft-20261111.json');
 const source=fs.readFileSync(path.join(root,index.bases.female.source));
 assert.equal(source.length,index.bases.female.sourceBytes);
 assert.equal(crypto.createHash('sha256').update(source).digest('hex'),index.bases.female.sourceSha256);
 assert.equal(hash(female.rig),index.bases.female.rigSha256);
 assert.deepEqual(cur.layers,old.layers,'Official-2 source pixels remain intact');
 assert.deepEqual(cur.drawOrders,old.drawOrders,'Draw order remains intact');
 assert.deepEqual(cur.sides,old.sides,'Near/far side assignment remains intact');
 assert.deepEqual(cur.capRadius,old.capRadius,'Joint caps remain intact');
 assert.equal(cur.id,old.id);
 for(const d of dirs){
   assert.equal(C.decode(cur.masks[d]).length,64*112);
   assert.equal(cur.masks[d],given.masks[d]);
   assert.deepEqual(cur.pivots[d],given.pivots[d]);
   assert.deepEqual(cur.placements[d],given.placements[d]);
   assert.equal(female.manualSlice[d],femaleTrial.record.manual[d]);
   assert.notEqual(cur.masks[d],old.masks[d],'New slicing must differ for '+d);
   assert.ok(C.PARTS.some(p=>JSON.stringify(cur.pivots[d][p])!==JSON.stringify(old.pivots[d][p])),'New pivot expected for '+d);
 }
});


test('historical Nova official-5 and final official-6 stay archived while official-7 is active',()=>{
 assert.equal(active.version,'official-7');
 assert.equal(official6.version,'official-6');
 assert.equal(nova5.version,'official-5');
 assert.equal(index.version,'official-4');
 assert.equal(nova5.bases.male.package,'genesis-base-male-official-5.json');
 assert.equal(nova5.bases.female.package,'genesis-base-female-official-5.json');
 assert.equal(official6.bases.male.package,'genesis-base-male-official-6.json');
 assert.equal(official6.bases.female.package,'genesis-base-female-official-6.json');
 assert.equal(active.bases.male.package,'genesis-base-male-official-7.json');
 assert.equal(active.bases.female.package,'genesis-base-female-official-7.json');
});
