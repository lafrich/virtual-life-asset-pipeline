"use strict";
/* Guard Action Editor's actual 64x112 compositor, not the image generator.
 * Saved local PNGs MUST NOT hide a newly published native foreground.
 * Depth correction is legal for only two actions and the specified views.
 */
const fs=require("node:fs"),assert=require("node:assert/strict");
const source=fs.readFileSync("site/action-editor.js","utf8");
const html=fs.readFileSync("site/action-editor.html","utf8");
new Function(source);
assert.match(html,/<script\s+defer\s+src="\.\/action-editor\.js\?v=[^"]+"\s*><\/script>/);
assert.match(source,/function paintNativeDepth\(ctx,index,dir\)/);
const start=source.indexOf("function paintNativeDepth(ctx,index,dir){");
const end=source.indexOf("\nfunction originalInto(",start);
assert.ok(start>=0&&end>start,"Native compositor must be called from Action Editor");
const helper=source.slice(start,end);
const calls=[];
const pic=()=>({ready:true,im:{naturalWidth:256,naturalHeight:448}});
const nativeAssetURL=p=>"asset:"+p;
const state={source:{mode:"lie_idle",depthFront:"media/test-depth.png"}};
const sourceRect=(index,dir)=>[{},index*64,["se","sw","ne","nw"].indexOf(dir)*112,64,112];
const depthFn=Function("state","sourceRect","pic","nativeAssetURL",helper+
 "\nreturn paintNativeDepth;")(state,sourceRect,pic,nativeAssetURL);
const canvas={imageSmoothingEnabled:true,drawImage(...args){calls.push(args)}};
assert.equal(depthFn(canvas,1,"se"),true);
assert.deepEqual(calls[0].slice(1,5),[64,0,64,112]);
assert.equal(depthFn(canvas,2,"sw"),true);
assert.deepEqual(calls[1].slice(1,5),[128,112,64,112]);
assert.equal(depthFn(canvas,0,"ne"),false);
assert.equal(depthFn(canvas,0,"nw"),false);
state.source.mode="knee_chest_idle";
assert.equal(depthFn(canvas,3,"ne"),true);
assert.equal(depthFn(canvas,0,"nw"),true);
assert.equal(depthFn(canvas,0,"se"),false);
assert.equal(depthFn(canvas,0,"sw"),false);
state.source.mode="idle";
for(const dir of ["se","sw","ne","nw"])assert.equal(depthFn(canvas,0,dir),false);
assert.equal(calls.length,4,"Only exact action/direction pairs may paint foreground");
const preview=source.slice(source.indexOf("function render(){"),source.indexOf("\nfunction remember(){"));
assert.ok(preview.indexOf("const image=editedFrame(frame,dir);")<
 preview.indexOf("paintNativeDepth(sourceCtx,frame,dir);"));
assert.ok(preview.indexOf("paintNativeDepth(sourceCtx,frame,dir);")<
 preview.indexOf("const face=selectedExpression();"));
assert.match(source,/if\(override\)paintNativeDepth\(pc,state.frame,state.direction\)/);
assert.match(source,/depth\.im\.addEventListener\("load"/);
assert.match(source,/nativeCatalogVersion=\/\^\[a-f0-9\]/);
assert.match(source,/next\.searchParams\.set\("catalog",nativeCatalogVersion\)/);
console.log("PASS Action Editor overlays new native foreground above old local drafts; isolated SE SW lie / NE NW knee");
