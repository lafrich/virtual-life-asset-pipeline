'use strict';
const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const fs=require('node:fs');
const assert=require('node:assert/strict');

const URL='http://127.0.0.1:8099/virtual-life-asset-pipeline/site/mahluk-2/';
const DIR=['se','sw','ne','nw'];
const BOUNDS={
 head:[[25,19,38,39],[25,19,38,39],[25,19,38,39],[25,19,38,39]],
 torso:[[27,48,38,78],[27,48,38,78],[27,48,38,78],[27,48,38,78]],
 shoulder_l:[[13,56,25,61],[39,56,51,61],[13,56,25,61],[39,56,51,61]],
 shoulder_r:[[39,56,51,61],[13,56,25,61],[39,56,51,61],[13,56,25,61]],
};
const SOURCE={
 head:[236,182,134,255],
 torso:[86,115,141,255],
 shoulder_l:[213,146,102,255],
 shoulder_r:[219,151,108,255],
};
const PAINTED={
 head:[225,80,167,255],
 torso:[78,209,69,255],
 shoulder_l:[157,31,224,255],
 shoulder_r:[17,88,235,255],
};
const DRAWN={head:[0],torso:[1],shoulder_l:[0],shoulder_r:[1]};
function generate(bone,painted=false){
 const png=new PNG({width:64,height:448,colorType:6});
 for(let d=0;d<4;d++){
  if(painted&&!DRAWN[bone].includes(d))continue;
  const [x1,y1,x2,y2]=BOUNDS[bone][d];
  const rgba=painted?PAINTED[bone]:SOURCE[bone];
  for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++){
   const i=((d*112+y)*64+x)*4;
   png.data.set(rgba,i);
  }
 }
 return PNG.sync.write(png);
}
const native=Object.fromEntries(Object.keys(BOUNDS).map(k=>[k,generate(k)]));
const overrides=Object.fromEntries(Object.keys(BOUNDS).map(k=>[k,'data:image/png;base64,'+generate(k,true).toString('base64')]));
function pixelFrom(browserPixels,x,y){
 const data=browserPixels;
 const idx=(y*64+x)*4;
 return [...data.slice(idx,idx+4)];
}
async function capture(page,direction){
 return page.locator('#preview'+direction.toUpperCase()).evaluate(c=>
  [...c.getContext('2d').getImageData(0,0,64,112).data]);
}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1490,height:950},acceptDownloads:true});
  const errors=[];page.on('pageerror',err=>errors.push(err.stack||err.message));
  const manifest={format:'mahluk-original-source-rig-v1',art_style:'original_v6b',
   emotions:['neutral'],directions:DIR,slots:Object.keys(BOUNDS).map(bone=>({
    bone,src:'media/original-rig/'+bone.replaceAll('_','-')+'.png',
    source:'body',gender:'female',layer_type:'body'
   }))};
  await page.route('**/media/original-rig/manifest.json*',r=>
   r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(manifest)}));
  await page.route(/.*\/media\/original-rig\/(head|torso|shoulder-l|shoulder-r)\.png.*$/,r=>{
   const id=r.request().url().match(/\/(head|torso|shoulder-l|shoulder-r)\.png/)?.[1].replaceAll('-','_');
   return r.fulfill({status:200,contentType:'image/png',body:native[id]});
  });
  await page.route('https://api.github.com/**',r=>
   r.fulfill({status:404,contentType:'application/json',body:'{"message":"offline smoke"}'}));
  const catalog={format:'mahluk-2-universal-emotions-v1',directions:DIR,cell:[64,112],entries:[]};
  await page.route('https://lafrich.github.io/virtual-life-asset-pipeline/emotion-studio/catalog.json*',r=>
   r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog)}));
  await page.addInitScript(planeOverrides=>{
   localStorage.setItem('mahluk-2-general-rig-rules-v1',JSON.stringify({
    format:'mahluk-2-general-rig-v1',version:1,rules:{},defaultParts:null,
    pixelPlanes:planeOverrides,headMerged:true,revision:1,
    savedAt:'2026-11-06T00:00:00.000Z'
   }));
  },overrides);
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>
   document.getElementById('status')?.textContent.includes('READY')&&
   document.querySelector('#previewSE canvas')===null,null,{timeout:40000});
  // User screenshot is HUMAN FEMALE BASE with the nude BODY PLANE.
  await page.locator('#modelType').selectOption('female');
  assert.equal(await page.locator('#bodyPlane').inputValue(),'female');
  await page.waitForFunction(()=>{
   const c=document.getElementById('previewSW');
   return c?.getContext('2d').getImageData(31,65,1,1).data[1]===209;
  },null,{timeout:20000});
  // Front custom pixels must remain EXACTLY as authored, not replaced with natives.
  let front=await capture(page,'se'),frontSw=await capture(page,'sw');
  assert.deepEqual(pixelFrom(front,20,58),PAINTED.shoulder_l,'SE custom left shoulder changed');
  assert.deepEqual(pixelFrom(front,45,58),SOURCE.shoulder_r,'SE untouched right shoulder lost native art');
  assert.deepEqual(pixelFrom(front,31,65),SOURCE.torso,'SE blank custom torso must not erase native');
  assert.deepEqual(pixelFrom(front,31,27),PAINTED.head,'SE custom HEAD changed');
  assert.deepEqual(pixelFrom(frontSw,20,58),PAINTED.shoulder_r,'SW custom right shoulder changed');
  assert.deepEqual(pixelFrom(frontSw,45,58),SOURCE.shoulder_l,'SW untouched left shoulder lost native');
  assert.deepEqual(pixelFrom(frontSw,31,65),PAINTED.torso,'SW custom torso changed');
  assert.deepEqual(pixelFrom(frontSw,31,27),SOURCE.head,'SW blank custom HEAD erased native head');
  // BUG from real screenshot: REAR NE lost the whole torso, leaving head,
  // floating palms and legs; NW had one arm missing or displaced. Never
  // let an empty user PNG slice replace a source bone.
  for(const direction of ['ne','nw']){
   const image=await capture(page,direction);
   assert.deepEqual(pixelFrom(image,31,65),SOURCE.torso,
    'REAR '+direction.toUpperCase()+' missing torso');
   assert.deepEqual(pixelFrom(image,31,27),SOURCE.head,
    'REAR '+direction.toUpperCase()+' head not assembled');
   const l=direction==='ne'?20:45,r=direction==='ne'?45:20;
   assert.deepEqual(pixelFrom(image,l,58),SOURCE.shoulder_l,
    'REAR '+direction.toUpperCase()+' missing anatomical LEFT shoulder');
   assert.deepEqual(pixelFrom(image,r,58),SOURCE.shoulder_r,
    'REAR '+direction.toUpperCase()+' missing anatomical RIGHT shoulder');
  }
  // Reopen the REAL torso Pixel Editor. Its rear atlas must match the
  // recovered live preview, not show the old blank saved NE/NW slices.
  await page.locator('#tree [data-bone="torso"]').click();
  await page.locator('#openPlaneEditor').click();
  await page.locator('#pixelOverlay:not([hidden])').waitFor({timeout:15000});
  const [torsoFile]=await Promise.all([
   page.waitForEvent('download',{timeout:12000}),
   page.locator('#pixelExport').click()
  ]);
  const editorAtlas=PNG.sync.read(fs.readFileSync(await torsoFile.path()));
  assert.equal(editorAtlas.width,64);
  assert.equal(editorAtlas.height,448);
  const at=(dir,x,y)=>[...editorAtlas.data.subarray(((dir*112+y)*64+x)*4,((dir*112+y)*64+x)*4+4)];
  assert.deepEqual(at(1,31,65),PAINTED.torso,
   'Pixel Editor must preserve SW authored torso');
  for(const dir of [0,2,3])
   assert.deepEqual(at(dir,31,65),SOURCE.torso,
    'Pixel Editor must restore unpainted '+DIR[dir].toUpperCase()+' torso source');
  await page.locator('#pixelClose').click();
  // Save Root / reload still must keep all original partial custom data.
  await page.locator('#saveChar').click();
  const record=await page.evaluate(()=>
   JSON.parse(localStorage.getItem('mahluk-2-library-v1'))?.at(-1));
  assert.ok(record?.id,'Save Root failed');
  assert.equal(record.pixelPlanes.torso,overrides.torso,'Saved torso art was modified');
  assert.equal(record.pixelPlanes.shoulder_l,overrides.shoulder_l,'Saved left arm art was modified');
  assert.equal(record.pixelPlanes.shoulder_r,overrides.shoulder_r,'Saved right arm art was modified');
  assert.equal(record.pixelPlanes.head,overrides.head,'Saved head art was modified');
  await page.locator('#newChar').click();
  await page.locator('#library').selectOption(record.id);
  await page.waitForFunction(id=>document.getElementById('library').value===id,record.id);
  await page.waitForFunction(()=>{
   const c=document.getElementById('previewNE');
   return c?.getContext('2d').getImageData(31,65,1,1).data[3]===255;
  });
  for(const d of ['ne','nw']){
   const image=await capture(page,d);
   assert.deepEqual(pixelFrom(image,31,65),SOURCE.torso,
    'Saved root reload lost '+d.toUpperCase()+' torso');
  }
  if(errors.length)throw Error(errors.join('\n'));
  console.log(JSON.stringify({result:'PASS',
   originalCustomRGBA:'unchanged',base:'female',frontViews:['SE','SW'],
   recoveredNativeViews:['NE','NW'],heads:'complete',arms:'both sides',
   saveRoot:'preserved',reload:'preserved',sourceSurgery:'none'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
