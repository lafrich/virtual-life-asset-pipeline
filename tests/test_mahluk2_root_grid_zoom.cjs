"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const B=require("../site/mahluk-2/body-planes.js");
const P=require("../site/mahluk-2/plane-pixel-editor.js");
const src=fs.readFileSync("site/mahluk-2/plane-pixel-editor.js","utf8");
const html=fs.readFileSync("site/mahluk-2/index.html","utf8");
const css=fs.readFileSync("site/mahluk-2/studio.css","utf8");
const app=fs.readFileSync("site/mahluk-2/studio.js","utf8");

test("Pixel Editor exposes explicit grid modes and non-destructive viewport zoom",()=>{
 for(const id of ["pixelGrid","pixelGridType","pixelZoomIn","pixelZoomOut","pixelZoomFit",
  "pixelZoom","pixelZoomLabel","pixelCanvasWrap"]){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 for(const value of ["1","8","16"])assert.ok(html.includes('<option value="'+value+'">'),value);
 assert.match(html,/id="pixelGrid" checked/);
 assert.match(src,/els\.gridType\.onchange=draw/);
 assert.match(src,/const step=Math\.max\(1,Math\.min\(16,Number\(els\.gridType\.value\)/);
 assert.match(src,/els\.wrap\.addEventListener\("wheel"/);
 assert.match(src,/setZoom\(pinch\.zoom\*ratio/);
 assert.match(src,/tool==="hand"/);
 assert.match(src,/canvas\.style\.width=\(W\*zoom\)/);
 assert.match(src,/canvas\.style\.height=\(H\*zoom\)/);
 assert.match(src,/zoomFit\(\);updateHistory\(\)/);
 assert.equal(P.W,64);assert.equal(P.H,112);
});

test("desktop character root uses nonoverlapping scrollable layout rather than dope-sheet actions",()=>{
 assert.match(html,/id="legacyTimeline" hidden aria-hidden="true"/);
 assert.match(html,/ROOT \/ RIG &amp; PLANES/);
 assert.match(html,/UNIVERSAL RIG · EMOSI.EXE PREVIEW/);
 assert.match(html,/SAVE \+ SYNC ROOT/);
 assert.match(css,/\.timeline\[hidden\]\{display:none!important\}/);
 assert.match(css,/\.viewcontrols\{flex:1 1 100%;display:flex;flex-wrap:wrap/);
 assert.match(css,/\.workspace\{overflow:hidden;grid-template-columns:/);
 assert.match(css,/\.menubar\{height:auto;min-height:38px;flex-wrap:wrap/);
 assert.match(css,/\.pixel-canvas-wrap\{display:block;overflow:auto/);
 assert.match(css,/#pixelCanvas\{display:block;box-sizing:content-box/);
 assert.match(css,/\.pixel-dialog\{height:min\(880px,calc\(100dvh - 28px\)\)/);
});
test("Female/Male body texture follows base, while dressed override stays available",()=>{
 assert.equal(B.defaultForBase("female"),"female");
 assert.equal(B.defaultForBase("male"),"male");
 assert.equal(B.matchingBase("female","male"),"female");
 assert.equal(B.matchingBase("male","female"),"male");
 assert.equal(B.matchingBase("male","current"),"current");
 assert.match(app,/bodyPlane=B.defaultForBase\(type\)/);
 assert.match(app,/bodyPlane=B.matchingBase\(type,r\.bodyPlane===undefined/);
 assert.match(app,/opt\.disabled=\(type==="male"\|\|type==="female"\)/);
});
test("2.0 only writes a one-frame character root and preserves existing 1.0 action clips",()=>{
 assert.match(app,/const clipId="idle",rootFrames=1/);
 assert.match(app,/const clips=\{\.\.\.\(old\?\.clips\|\|\{\}\),idle:/);
 assert.match(app,/role:"character-root",actionEditor:"mahluk-hidup-1\.0"/);
 assert.match(app,/sprite:rootSheet,clips/);
 assert.match(app,/bake\(1,"idle"\)\.toBlob/);
 assert.ok(!html.includes('id="legacyTimeline"></div>'));
});
