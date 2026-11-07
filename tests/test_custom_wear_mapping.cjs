'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const W=require('../site/v6p-custom-wear.js');
const WIDTH=64,HEIGHT=112;
function make(x0,y0,x1,y1,color=[190,190,190,255]){
 const d=new Uint8ClampedArray(WIDTH*HEIGHT*4);
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  const i=(y*WIDTH+x)*4;d.set(color,i);
 }
 return {data:d,width:WIDTH,height:HEIGHT};
}
function changePixel(d,x,y,color){d.set(color,(y*WIDTH+x)*4)}
function count(d,rgba){let n=0;for(let i=0;i<d.length;i+=4)
 if(d[i]===rgba[0]&&d[i+1]===rgba[1]&&d[i+2]===rgba[2]&&d[i+3]===rgba[3])n++;
 return n;
}
test('native garment changes palette and maps local motif without changing pose or alpha',()=>{
 const source=make(23,35,42,65),painted=make(23,35,42,65,[20,210,70,255]);
 for(let y=43;y<=45;y++)for(let x=29;x<=31;x++)changePixel(painted.data,x,y,[250,10,180,255]);
 const palette=W.paletteFromViews([{source,edited:painted}]);
 assert.ok(palette.size>0,'global repaint should be recognized as palette');
 const target=make(32,45,50,78);
 const before=new Uint8ClampedArray(target.data);
 const out=W.renderPose(target,painted,source,palette);
 assert.ok(out.changed>0&&out.details>=4);
 assert.ok(count(out.data,[20,210,70,255])>0);
 assert.ok(count(out.data,[250,10,180,255])>0,'motif must move with native pose');
 for(let i=3;i<before.length;i+=4)
  assert.equal(out.data[i],before[i],'original alpha and garment silhouette must remain native');
});
test('native lying/sideways pose also inherits artwork in 4-view design model',()=>{
 const source=make(23,35,42,65),painted=make(23,35,42,65);
 for(let y=41;y<=47;y++)for(let x=30;x<=34;x++)
  changePixel(painted.data,x,y,[255,0,151,255]);
 const target=make(8,49,55,58);
 const out=W.renderPose(target,painted,source,W.paletteFromViews([{source,edited:painted}]));
 assert.ok(out.details>=20);
 assert.ok(count(out.data,[255,0,151,255])>0);
 assert.ok(W.bounds(target).horizontal,'native garment material axes follow lying pose');
});
test('small logo is not treated as global shirt recolor',()=>{
 const source=make(22,35,42,70),painted=make(22,35,42,70);
 changePixel(painted.data,30,45,[0,255,0,255]);
 assert.equal(W.paletteFromViews([{source,edited:painted}]).size,0);
 const target=make(28,39,45,78);
 const out=W.renderPose(target,painted,source,new Map());
 assert.ok(count(out.data,[0,255,0,255])>0);
 assert.ok(count(out.data,[190,190,190,255])>0);
});
