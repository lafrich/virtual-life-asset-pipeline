/* Cover-from-body uses official LGR-1 mask; never guesses legacy garment geometry. */
const {test}=require("node:test"), assert=require("node:assert/strict");
const C=require("../site/lgr-wardrobe-cover.js");
const W=64,H=112,N=W*H,at=(x,y)=>y*W+x;
function source(){
 const body=new Uint8ClampedArray(N*4),owners=new Uint8Array(N).fill(255);
 function dot(x,y,part){const i=at(x,y);body[i*4+3]=255;owners[i]=C.PARTS.indexOf(part)}
 dot(32,60,"torso");dot(25,60,"arm_near_upper");
 dot(32,79,"pelvis");dot(31,90,"leg_near_upper");
 dot(30,98,"leg_near_lower");dot(32,40,"head");
 return {body,owners};
}
test("full-body seed follows official body alpha and excludes head",()=>{
 const {body,owners}=source(),before=Uint8ClampedArray.from(body);
 const {pixels,count}=C.build(body,owners,"top","full");
 assert.equal(count,5);
 assert.equal(pixels[at(32,40)*4+3],0);
 assert.equal(pixels[at(32,60)*4+3],255);
 assert.deepEqual(body,before,"never modify Genesis source");
});
test("short-sleeve mode covers actual upper arm, not bare hand or whole leg",()=>{
 const {body,owners}=source();
 const {pixels,count}=C.build(body,owners,"top","top");
 assert.equal(count,3);
 assert.equal(pixels[at(32,79)*4+3],255);
 assert.equal(pixels[at(31,90)*4+3],0);
});
test("pants and shoes emit palette KEY codes, not baked clothing RGB",()=>{
 const {body,owners}=source(),p=C.build(body,owners,"pants","pants");
 const shoe=C.build(body,owners,"shoes","shoes");
 assert.equal(p.pixels[at(31,90)*4+3],255);
 assert.equal(p.pixels[at(30,98)*4+3],0);
 assert.equal(shoe.pixels[at(30,98)*4+3],255);
 const colors=new Set([...C.PALETTES.pants,...C.PALETTES.shoes].map(x=>x.toUpperCase()));
 for(const result of [p,shoe]){
  for(let i=0;i<N;i++)if(result.pixels[i*4+3]){
   const rgb="#"+Array.from(result.pixels.slice(i*4,i*4+3)).map(n=>n.toString(16).padStart(2,"0")).join("").toUpperCase();
   assert.ok(colors.has(rgb),rgb);
  }
 }
});
test("invalid body sizes or modes rejected",()=>{
 const {body,owners}=source();
 assert.throws(()=>C.build(body.slice(0,100),owners,"top","full"));
 assert.throws(()=>C.build(body,owners,"hair","full"));
 assert.throws(()=>C.build(body,owners,"top","bogus"));
});
test("Editor route wires the shared Pixel Editor and cover action without changing Genesis Base",()=>{
 const fs=require("node:fs");
 const ui=fs.readFileSync("site/lgr-wardrobe-fit-editor.html","utf8");
 const app=fs.readFileSync("site/mahluk-pakaian.js","utf8");
 assert.match(ui,/shared-pixel-editor\.js/);
 assert.match(ui,/lgr-wardrobe-cover\.js/);
 assert.match(ui,/MahlukPakaian\.init/);
 assert.match(app,/COVER BODY → PIXEL EDITOR/);
 assert.match(app,/pkg\.rig\.masks\[d\]/);
 assert.match(app,/LGRWardrobeCover\.build/);
 assert.match(app,/root\.PakaianPixelEditor\.open\(\)/);
});
