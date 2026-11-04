/* Regression: pipeline's Warteg building geometry + editable Bangun Ruang semantics. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const templateSource=fs.readFileSync(path.join(root,'site/warteg-kharisma-template.js'),'utf8');
const painterSource=fs.readFileSync(path.join(root,'site/warteg-interior-paint.js'),'utf8');
const canvases=[];
class Canvas {
 constructor(){this.width=1;this.height=1;this.pixels=null;this.ctx=null;}
 getContext(){if(!this.ctx){
  this.ctx={imageSmoothingEnabled:false,fillStyle:'#000000',fillRect:(x,y,w,h)=>{
   if(!this.pixels||this.pixels.length!==this.width*this.height*4)this.pixels=new Uint8ClampedArray(this.width*this.height*4);
   const c=/^#[0-9a-f]{6}$/i.test(this.ctx.fillStyle)?this.ctx.fillStyle:'#FFFFFF';
   const rgb=[1,3,5].map(k=>parseInt(c.slice(k,k+2),16));
   for(let j=Math.max(0,Math.ceil(y));j<Math.min(this.height,Math.ceil(y+h));j++)
    for(let i=Math.max(0,Math.ceil(x));i<Math.min(this.width,Math.ceil(x+w));i++){
     const n=(j*this.width+i)*4;this.pixels[n]=rgb[0];this.pixels[n+1]=rgb[1];
     this.pixels[n+2]=rgb[2];this.pixels[n+3]=255;
    }
  },getImageData:()=>({data:this.pixels||new Uint8ClampedArray(this.width*this.height*4)}),
  drawImage:()=>{}};
 }return this.ctx;}
 toDataURL(){return 'data:image/png;base64,'+Buffer.from('native-sprite').toString('base64');}
}
const sandbox={window:{},document:{createElement:()=>{const c=new Canvas();canvases.push(c);return c;}},console,Math,Date,Buffer};
vm.runInNewContext(templateSource,sandbox,{filename:'site/warteg-kharisma-template.js'});
vm.runInNewContext(painterSource,sandbox,{filename:'site/warteg-interior-paint.js'});
const api=sandbox.window.VLWartegKharismaTemplate;
assert.equal(api.sourceVersion,'pipeline-v2');
assert.deepEqual(Array.from(api.footprint),[8,6]);
assert.equal(sandbox.window.VLWartegInteriorArt.version,2);
assert.match(templateSource,/roofR=W\+\.52/);
assert.match(templateSource,/roofR,rf,e-7/);
assert.match(painterSource,/WKB/);
for(const dir of ['sw','se','ne','nw']){
 const before=canvases.length,view=api.render(dir);
 assert(view.size[0]>100&&view.size[0]<2048,'sprite width '+dir);
 assert(view.size[1]>100&&view.size[1]<2048,'sprite height '+dir);
 assert(view.pivot.every(x=>x>0&&x<2048),'valid ground pivot '+dir);
 const full=canvases[before];
 assert(full.pixels instanceof Uint8ClampedArray,'actual 1x pixels rasterized '+dir);
 const isSE=dir==='se'||dir==='nw',a=8.34,b=3,z=142;
 const c=isSE?6-b:a,r=isSE?8-a:6-b;
 const x=Math.round(290+(c-r)*32),y=Math.round(214+(c+r)*16-z);
 let found=false;
 for(let yy=y-9;yy<=y+9;yy++)for(let xx=x-9;xx<=x+9;xx++)
  if(xx>=0&&yy>=0&&xx<full.width&&yy<full.height&&full.pixels[(yy*full.width+xx)*4+3]===255)found=true;
 assert(found,'full right roof overhang must be rasterized '+dir);
}
const sizes={shelf:[2,1],counter:[2,1],cashier:[2,1],stove:[1,1],kitchen_sink:[1,1],fridge:[1,1],table:[2,1],chair:[1,1]};
const model={
 create(cfg){return {width:cfg.w,depth:cfg.d,format:'virtual-life-interior-v1',version:2,items:[]};},
 add(scene,assetId,c,r){
  const size=sizes[assetId];assert(size,'unknown fixture '+assetId);
  for(let x=c;x<c+size[0];x++)for(let y=r;y<r+size[1];y++){
   assert(x<8&&y<6,'inside room');assert(!(x===3&&y===5),'entrance clear');
   for(const i of scene.items){const s=sizes[i.assetId];assert(!(x>=i.c&&x<i.c+s[0]&&y>=i.r&&y<i.r+s[1]),'no furniture overlap');}
  }
  const o={assetId,c,r,actionId:'browse'};scene.items.push(o);return o;
 },
 action(scene,id,action){scene.items.find(i=>i.id===id).actionId=action;},
 slots(scene){return scene.items.map(i=>({id:i.id,assetId:i.assetId,interaction:i.actionId}));}
};
const pack=api.create(model);
assert.equal(pack.interior.floors[0].theme,'warteg');
assert.equal(pack.interior.floors[0].items.length,14);
assert.equal(pack.actionSlots.length,14);
assert.equal(pack.entrance.entry.c,3);
assert.equal(pack.entrance.entry.r,5);
assert.equal(pack.assetPipeline.family,'warteg_kharisma');
const hooks=pack.actionSlots.filter(s=>['cook','wash'].includes(s.interaction));
assert.equal(hooks.length,2,'cook/wash action hooks kept separate from rigged animations');
console.log('Warteg v2: 4 complete roof views, 14 no-overlap interior action fixtures, pipeline painter OK.');
