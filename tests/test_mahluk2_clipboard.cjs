"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const S=require("../site/mahluk-2/pixel-selection.js");
const rgba=(pixels,w,x,y)=>Array.from(pixels.slice((y*w+x)*4,(y*w+x)*4+4));
const paint=(pixels,w,x,y,color)=>pixels.set(color,(y*w+x)*4);
test("copy rectangle preserves source RGBA without changing surrounding pixels",()=>{
 const frame=new Uint8ClampedArray(5*4*4);
 paint(frame,5,1,1,[255,0,0,255]);paint(frame,5,2,1,[0,255,0,255]);
 paint(frame,5,1,2,[0,0,255,255]);paint(frame,5,2,2,[90,40,20,64]);
 const before=frame.slice(),stamp=S.copy(frame,5,4,{x:1,y:1,w:2,h:2});
 assert.equal(stamp.format,S.CLIP_FORMAT);
 assert.deepEqual([stamp.x,stamp.y,stamp.w,stamp.h],[1,1,2,2]);
 assert.deepEqual(rgba(stamp.pixels,2,0,0),[255,0,0,255]);
 assert.deepEqual(rgba(stamp.pixels,2,1,1),[90,40,20,64]);
 assert.deepEqual(frame,before);
});
test("paste works on other view without touching existing source view",()=>{
 const native=new Uint8ClampedArray(4*3*4),source=new Uint8ClampedArray(native.length);
 paint(source,4,0,0,[200,30,40,255]);paint(source,4,1,0,[40,220,80,255]);
 const stamp=S.copy(source,4,3,{x:0,y:0,w:2,h:1});
 const result=S.paste(native,4,3,stamp,{x:2,y:2});
 assert.deepEqual(rgba(result,4,2,2),[200,30,40,255]);
 assert.deepEqual(rgba(result,4,3,2),[40,220,80,255]);
 assert.deepEqual(native,new Uint8ClampedArray(4*3*4));
});
test("mirrored paste puts right-side pixel on left; full rectangle mirrors accurately",()=>{
 const source=new Uint8ClampedArray(4*3*4);
 paint(source,4,1,1,[240,0,0,255]);paint(source,4,2,1,[0,0,240,255]);
 const stamp=S.copy(source,4,3,{x:1,y:1,w:2,h:1});
 const result=S.paste(new Uint8ClampedArray(source.length),4,3,stamp,{mirror:true});
 assert.deepEqual(rgba(result,4,1,1),[0,0,240,255]);
 assert.deepEqual(rgba(result,4,2,1),[240,0,0,255]);
});
test("overlay paste skips transparent pixels; replace mode writes exact transparent RGBA",()=>{
 const source=new Uint8ClampedArray(4*3*4),target=new Uint8ClampedArray(source.length);
 paint(source,4,1,1,[180,0,0,255]);
 paint(target,4,1,1,[4,5,6,255]);paint(target,4,2,1,[7,8,9,255]);
 const stamp=S.copy(source,4,3,{x:1,y:1,w:2,h:1});
 const overlay=S.paste(target,4,3,stamp);
 assert.deepEqual(rgba(overlay,4,2,1),[7,8,9,255]);
 const replaced=S.paste(target,4,3,stamp,{replace:true});
 assert.deepEqual(rgba(replaced,4,2,1),[0,0,0,0]);
 assert.deepEqual(rgba(target,4,2,1),[7,8,9,255]);
});
test("malformed clipboard cannot write pixels",()=>{
 const target=new Uint8ClampedArray(4*3*4);
 assert.equal(S.validStamp({format:S.CLIP_FORMAT,w:4,h:3,x:0,y:0,pixels:[1]} ,4,3),false);
 assert.throws(()=>S.paste(target,4,3,{format:S.CLIP_FORMAT,w:4,h:3,x:0,y:0,pixels:[]}),/Invalid native/);
});
test("both character and emotion editors share copy/paste/flip buttons and shortcuts",()=>{
 const editor=fs.readFileSync("site/mahluk-2/plane-pixel-editor.js","utf8");
 for(const page of ["site/mahluk-2/index.html","site/emotion-studio/index.html"]){
  const html=fs.readFileSync(page,"utf8");
  for(const id of ["pixelCopySelection","pixelPasteSelection","pixelPasteMirrored","pixelPasteReplace","pixelClipboardInfo"])
   assert.ok(html.includes('id="'+id+'"'),page+" missing "+id);
  assert.match(html,/id="pixelCanvas" tabindex="0"/);
 }
 assert.match(editor,/els\.copy\.onclick=copySelection/);
 assert.match(editor,/els\.pasteMirror\.onclick=\(\)=>pasteSelection\(true\)/);
 assert.match(editor,/currentClipboard\(\)/);
 assert.match(editor,/S\.copy\(frameImage\(\)\.data,W,H,selection\)/);
 assert.match(editor,/S\.paste\(frameImage\(\)\.data,W,H,stamp/);
 assert.match(editor,/window\.localStorage\.setItem\(CLIP_KEY/);
 assert.match(editor,/canvas\.focus\(\{preventScroll:true\}\)/);
});
