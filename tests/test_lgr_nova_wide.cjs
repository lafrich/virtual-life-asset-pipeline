'use strict';
/* LGR Nova wide adapter pure sanity checks. Does not modify production code. */
const assert=require('node:assert/strict');
const adapter=require('../site/lgr-nova-wide-render.js');
const t=adapter.tiles(160,48);
assert.deepEqual(t,[{at:0,span:64,rootShift:48},{at:64,span:64,rootShift:-16},{at:128,span:32,rootShift:-80}]);
assert.deepEqual(adapter.tiles(64,0),[{at:0,span:64,rootShift:0}]);
const pose=Object.freeze({pelvis:Object.freeze({x:3,y:20,a:90}),head:Object.freeze({a:-10})});
const moved=adapter.translated(pose,-16);
assert.equal(pose.pelvis.x,3);
assert.equal(moved.pelvis.x,-13);
assert.equal(moved.pelvis.y,20);
assert.equal(moved.pelvis.a,90);
assert.equal(moved.head,pose.head);
assert.notEqual(moved.pelvis,pose.pelvis);
console.log('LGR Nova wide adapter: tiles and root shifting pass; browser raster parity not tested.');
