"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const P=require("../site/v6b-part-transfer.js");
const make=()=>({width:64,height:112,data:new Uint8ClampedArray(64*112*4)});
const set=(atlas,x,y,rgba)=>atlas.data.set(rgba,(y*64+x)*4);
const get=(atlas,x,y)=>[...atlas.data.slice((y*64+x)*4,(y*64+x)*4+4)];
test("V6B source part edits follow the same bone into authored animation coordinates",()=>{
 const idle=make(),edited=make(),walk=make();
 set(idle,19,40,[100,110,120,255]);set(edited,19,40,[130,120,110,255]);
 set(walk,29,53,[115,120,125,255]);
 const r=P.transfer(idle,edited,walk);
 assert.equal(r.changed,1);
 assert.deepEqual(get(r,29,53),[145,130,115,255]);
 assert.deepEqual(get(walk,29,53),[115,120,125,255],"Original native motion must remain untouched");
});
test("Erasing an authored part pixel is local to its own native matte",()=>{
 const a=make(),b=make(),c=make();
 set(a,22,35,[130,70,40,255]);set(c,37,48,[140,85,50,255]);
 const result=P.transfer(a,b,c);
 assert.deepEqual(get(result,37,48),[0,0,0,0]);
});
test("Missing source part pixels and geometry mismatch are detected safely",()=>{
 const a=make(),b=make(),c=make();
 assert.equal(P.transfer(a,b,c).changed,0);
 assert.throws(()=>P.transfer({width:2,height:2,data:[]},b,c),/64x112/);
});
test("Studio prefers original Male/Female anatomy and keeps editor and Emosi.exe",()=>{
 const html=fs.readFileSync(path.resolve(__dirname,"../site/v6b-reset-studio.html"),"utf8");
 const script=html.slice(html.lastIndexOf("<script>")+8,html.lastIndexOf("</script>"));
 assert.doesNotThrow(()=>new Function(script));
 for(const tag of ['value="male"','value="female"','id="part-select"','id="open-part"','id="open-pixel"','id="pixelUndo"','id="pixelCopySelection"','id="pixelGrid"','id="import-atlas"','id="connect-emotion-drive"'])
  assert.ok(html.includes(tag),tag);
 assert.doesNotMatch(html,/<option value="ichsan">/);
 assert.match(html,/human-male-base-motion-parts\.json/);
 assert.match(html,/human-female-base-motion-parts\.json/);
 assert.match(html,/V6BPartTransfer\.transfer/);
 assert.match(html,/mahluk-v6b-character-v1/);
});
test("Existing authored V6B generator publishes animated anatomy atlases for all motions",()=>{
 const s=fs.readFileSync(path.resolve(__dirname,"../tools/build_human_templates.py"),"utf8");
 assert.match(s,/mahluk-v6b-motion-parts-v1/);
 assert.match(s,/save_motion_parts=True/);
 assert.match(s,/split_body_pixels/);
 const app=fs.readFileSync(path.resolve(__dirname,"../site/app.js"),"utf8");
 assert.match(app,/character\.id!=="ichsan"/);
});
