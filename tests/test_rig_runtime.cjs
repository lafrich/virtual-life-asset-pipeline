"use strict";
const assert=require("node:assert/strict");
const lib=require("../site/rig-runtime.js");
const pack={format:"virtual-life-sprite-motion-v1",actor:"aladdin_sane",
  model_type:"HUMANOID",adapter:"native_v6b",clips:[{
    id:"walk",status:"ready",frames:4,frame_ms:[100,130,170,200],
    row_start:4,atlas:"media/bowie.png",atlas_url:"https://example.com/bowie.png",loop:true
  }]};
const clip=lib.clipFor(pack,"walk");
assert.ok(clip);
assert.equal(lib.clipFor(pack,"sit"),null);
assert.equal(lib.frameAt(clip,"se",0).frame,0);
assert.equal(lib.frameAt(clip,"sw",100).frame,1);
assert.equal(lib.frameAt(clip,"ne",230).frame,2);
assert.equal(lib.frameAt(clip,"nw",400).frame,3);
assert.equal(lib.frameAt(clip,"sw",601).frame,0);
assert.equal(lib.frameAt(clip,"nw",100).sy,(4+3)*112);
assert.equal(lib.frameAt(clip,"bad",0),null);
let calls=[];
const ctx={drawImage(...args){calls.push(args);},imageSmoothingEnabled:true};
assert.equal(lib.draw(ctx,{width:384},clip,"se",225,200,240,3),true);
assert.equal(calls.length,1);
assert.equal(calls[0][1],64);
assert.equal(calls[0][5],104);
assert.equal(calls[0][6],-60);
assert.equal(ctx.imageSmoothingEnabled,false);
const imported=lib.exportedClip(pack,clip,"https://lafrich.github.io/virtual-life-asset-pipeline/");
assert.equal(imported.actor,"aladdin_sane");
assert.ok(imported.clip.atlas_url.endsWith("/media/bowie.png"));
assert.equal(imported.included_in_game,false);
assert.throws(()=>lib.exportedClip(pack,{...clip},null));
const oneshot={...clip,loop:false};
assert.equal(lib.frameAt(oneshot,"se",700).frame,3);
assert.equal(lib.frameAt(oneshot,"se",700).ended,true);
console.log("PASS: rig runtime resolves original actor clips, frame timing, directions, image draw and portable include exports");
