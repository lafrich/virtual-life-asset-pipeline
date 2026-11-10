'use strict';
/* Read-only official-vs-candidate safety gates. No promotion or overwrite. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('../site/lafrich-puppet-core.js');
const root=path.resolve(__dirname,'../site/media/lgr1/base');
const official=JSON.parse(fs.readFileSync(path.join(root,'genesis-base-male.json'),'utf8'));
const index=JSON.parse(fs.readFileSync(path.join(root,'index.json'),'utf8'));
const trial=JSON.parse(fs.readFileSync(path.join(root,'candidates/lgr-male-slice-test-20261111.json'),'utf8'));
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const dirs=['se','sw','ne','nw'];
test('official-2 Male remains the exact published approved rig',()=>{
 assert.equal(index.version,'official-2');
 assert.equal(hash(official.rig),official.rigSha256);
 assert.equal(index.bases.male.rigSha256,official.rigSha256);
 assert.equal(index.bases.male.package,'genesis-base-male.json');
 assert.equal(index.bases.female.package,'genesis-base-female.json');
});
test('candidate is a separate unapproved Lafrich LGR-1 Male draft',()=>{
 assert.equal(trial.format,'lgr-1-draft-v1');
 assert.equal(trial.gender,'male');
 assert.equal(trial.record.approved,false);
 assert.equal(trial.record.rig.id,'lafrich_male');
 assert.equal(C.validateMaster(trial.record.rig).gender,'male');
});
test('trial preview changes ONLY slicing, pivots and placements, retaining original art',()=>{
 const actual=C.validateMaster({...official.rig,
  masks:trial.record.rig.masks,pivots:trial.record.rig.pivots,placements:trial.record.rig.placements});
 assert.deepEqual(actual.layers,C.validateMaster(official.rig).layers);
 assert.deepEqual(actual.drawOrders,C.validateMaster(official.rig).drawOrders);
 assert.deepEqual(actual.sides,C.validateMaster(official.rig).sides);
 assert.deepEqual(actual.capRadius,C.validateMaster(official.rig).capRadius);
 for(const dir of dirs){
  const a=C.decode(official.rig.masks[dir]),b=C.decode(actual.masks[dir]);
  assert.equal(a.length,64*112);
  assert.equal(b.length,64*112);
  assert.ok(a.some((v,i)=>v!==b[i]),'Expected changed cut in '+dir);
  assert.ok(C.PARTS.some(p=>JSON.stringify(official.rig.pivots[dir][p])!==JSON.stringify(actual.pivots[dir][p])),
   'Expected moved pivot in '+dir);
  for(const p of C.PARTS){
   const q=actual.pivots[dir][p];
   assert.ok(q.x>=0&&q.x<64&&q.y>=0&&q.y<112,'Bad pivot '+dir+'/'+p);
  }
 }
});
