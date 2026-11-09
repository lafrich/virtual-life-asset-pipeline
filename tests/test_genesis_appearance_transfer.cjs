'use strict';
const test=require("node:test"),assert=require("node:assert/strict");
const T=require("../site/genesis-appearance-transfer.js");
const N=64*112*4;
function blank(){return new Uint8ClampedArray(N)}
function pixel(buf,x,y,rgba){buf.set(rgba,(y*64+x)*4)}
function at(buf,x,y){return [...buf.slice((y*64+x)*4,(y*64+x)*4+4)]}
test("4-view appearance delta preserves unchanged 64x112 native pixels",()=>{
 const before=blank(),after=blank(),target=blank();
 for(let y=27;y<=38;y++)for(let x=19;x<=28;x++){
  pixel(before,x,y,[80,90,100,255]);pixel(after,x,y,[80,90,100,255]);
  pixel(target,x+3,y+5,[80,90,100,255]);
 }
 pixel(after,23,31,[240,60,30,255]);
 const t=T.transfer(before,after,target);
 assert.ok(t.matched>=1,"edited colored source pixel must reach translated native frame");
 assert.deepEqual(at(t.pixels,26,36),[240,60,30,255]);
 assert.deepEqual(at(t.pixels,24,35),[80,90,100,255],"unselected native pixels must remain original");
 assert.deepEqual(at(target,26,36),[80,90,100,255],"original source buffer cannot be mutated");
});
test("the source Idle frame returns exact user artwork including transparent geometry",()=>{
 const before=blank(),after=blank();
 pixel(before,32,40,[40,50,60,255]);
 pixel(after,32,40,[0,0,0,0]);
 pixel(after,33,40,[255,0,255,255]);
 const t=T.transfer(before,after,before);
 assert.equal(t.exact,true);
 assert.deepEqual([...t.pixels],[...after]);
});
test("extreme pose with no matching pixels remains unchanged, no idle sprite stamp",()=>{
 const before=blank(),after=blank(),target=blank();
 pixel(before,20,20,[90,80,70,255]);pixel(after,20,20,[255,0,0,255]);
 pixel(target,50,90,[30,20,10,255]);
 const t=T.transfer(before,after,target);
 assert.equal(t.matched,0);
 assert.deepEqual([...t.pixels],[...target]);
});
test("source point color changes only one corresponding pixel, not all palette peers",()=>{
 const before=blank(),after=blank(),target=blank();
 for(let y=30;y<38;y++)for(let x=25;x<40;x++){
  pixel(before,x,y,[90,80,70,255]);pixel(after,x,y,[90,80,70,255]);
  pixel(target,x,y,[90,80,70,255]);
 }
 pixel(after,29,33,[250,110,20,255]);
 const result=T.transfer(before,after,target);
 assert.equal(result.matched,1);
 assert.deepEqual(at(result.pixels,29,33),[250,110,20,255]);
 assert.deepEqual(at(result.pixels,30,33),[90,80,70,255]);
});
