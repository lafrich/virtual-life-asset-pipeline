'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {PNG}=require('pngjs');

const URL='http://127.0.0.1:8099/virtual-life-asset-pipeline/site/mahluk-2/';
const MODES=['se','sw','ne','nw'];
function atlasPNG(frames=3){
 const png=new PNG({width:64*frames,height:448,colorType:6});
 for(let d=0;d<4;d++)for(let frame=0;frame<frames;frame++)
  for(let y=32;y<63;y++)for(let x=19;x<47;x++){
   const at=(((d*112+y)*png.width+frame*64+x)*4);
   png.data[at]=frame===0?239:frame===1?50:6;
   png.data[at+1]=frame===0?46:frame===1?235:54;
   png.data[at+2]=frame===0?74:frame===1?80:242;
   png.data[at+3]=255;
  }
 return PNG.sync.write(png);
}
function bodyPNG(){
 const png=new PNG({width:64,height:448,colorType:6});
 for(let d=0;d<4;d++)for(let y=26;y<86;y++)for(let x=20;x<44;x++){
  const i=((d*112+y)*64+x)*4;
  png.data[i]=60;png.data[i+1]=90;png.data[i+2]=120;png.data[i+3]=255;
 }
 return PNG.sync.write(png);
}
const PNG_DATA=atlasPNG();
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1000}});
  const errors=[];
  page.on('pageerror',err=>errors.push(err.stack||err.message));
  const manifest={
   format:'mahluk-original-source-rig-v1',emotions:['neutral'],
   slots:[
    {bone:'torso',src:'media/original-rig/torso.png',source:'body'},
    {bone:'head',src:'media/original-rig/head.png',source:'head'}
   ]
  };
  const catalog={
   format:'mahluk-2-universal-emotions-v1',directions:MODES,
   cell:[64,112],entries:[
    {id:'native-neutral',name:'Neutral',base:'universal',template:'neutral',frames:1,fps:6}
   ]
  };
  await page.route('**/media/original-rig/manifest.json*',route=>
   route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(manifest)}));
  await page.route(/.*\/media\/original-rig\/(torso|head)\.png$/,route=>
   route.fulfill({status:200,contentType:'image/png',body:bodyPNG()}));
  await page.route('https://api.github.com/**',route=>
   route.fulfill({status:404,contentType:'application/json',body:'{"message":"test offline"}'}));
  await page.route('https://lafrich.github.io/virtual-life-asset-pipeline/emotion-studio/catalog.json*',
   route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(catalog)}));
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>{
   const text=document.getElementById('status')?.textContent||'';
   return text.includes('SOURCE')||text.includes('READY')||text.includes('RESTORE')||text.includes('V6B');
  },null,{timeout:40000});
  // Create a real EMOSI.EXE local IndexedDB entry on this SAME ORIGIN.
  const encoded=PNG_DATA.toString('base64');
  await page.evaluate(async b64=>{
   const png='data:image/png;base64,'+b64;
   await new Promise((resolve,reject)=>{
    const r=indexedDB.open('emotion-studio-local-v1',1);
    r.onupgradeneeded=()=>{
     if(!r.result.objectStoreNames.contains('emotion-assets'))
      r.result.createObjectStore('emotion-assets',{keyPath:'id'});
    };
    r.onsuccess=()=>{
     const db=r.result,tx=db.transaction('emotion-assets','readwrite');
     tx.objectStore('emotion-assets').put({id:'emotion-sample-live',name:'MANY EMOSI / HAPPY BLINK',
      base:'universal',fps:6,frames:3,png});
     tx.oncomplete=()=>{db.close();resolve()};
     tx.onerror=()=>reject(tx.error);
    };
    r.onerror=()=>reject(r.error);
   });
  },encoded);
  // Switch to Emosi preview without entering any pixel editor.
  await page.locator('#inspectorEmotionTab').click();
  await page.locator('#emotionRefresh').click();
  await page.waitForFunction(()=>!!document.querySelector(
   '#emotionAsset option[value="db:emotion-sample-live"]'),null,{timeout:30000});
  await page.locator('#emotionSearch').fill('HAPPY BLINK');
  await page.locator('#emotionAsset').selectOption('db:emotion-sample-live');
  await page.waitForFunction(()=>document.getElementById('emotionPreviewReadout')
    .textContent.includes('/3'),null,{timeout:15000});
  const asset=await page.locator('#emotionAsset').inputValue();
  assert.equal(asset,'db:emotion-sample-live');
  // Distinct emulator animation clock, FPS readout and isolated body count.
  await page.locator('#emotionPreviewPlay').click();
  assert.match(await page.locator('#emotionPreviewPlay').textContent(),/PLAY/);
  await page.locator('#emotionPreviewScrub').evaluate(el=>{
   el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  const before=await page.locator('#emotionPreviewCanvas').evaluate(c=>{
   const img=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   return [...img].reduce((acc,n,i)=>acc+(i%4?0:n),0);
  });
  await page.locator('#emotionPreviewScrub').evaluate(el=>{
   el.value='1';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  const after=await page.locator('#emotionPreviewCanvas').evaluate(c=>{
   const img=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   return [...img].reduce((acc,n,i)=>acc+(i%4?0:n),0);
  });
  assert.notEqual(before,after,'Face frames should actually change rendered character preview');
  await page.locator('[data-emo-dir="sw"]').click();
  assert.match(await page.locator('#emotionPreviewReadout').textContent(),/SW/);
  await page.locator('#emotionPlacementAll').uncheck();
  await page.locator('#emotionOffsetX').fill('3');
  await page.locator('#emotionOffsetY').fill('-2');
  await page.locator('#emotionScale').fill('1.15');
  await page.locator('[data-emo-dir="se"]').click();
  assert.equal(Number(await page.locator('#emotionOffsetX').inputValue()),0,
   'Editing SW placement must not change SE placement');
  await page.locator('[data-emo-dir="sw"]').click();
  assert.equal(Number(await page.locator('#emotionOffsetX').inputValue()),3);
  await page.locator('#emotionPlacementSave').click();
  const draft=await page.evaluate(()=>JSON.parse(localStorage.getItem('mahluk-2-draft-v1')));
  assert.equal(draft?.workspace?.emotionAssetId,'db:emotion-sample-live');
  assert.equal(draft.workspace.emotionPlacement.sw.x,3);
  assert.equal(draft.workspace.emotionPlacement.se.x,0);
  assert.equal(draft.workspace.frames,1,'Body animation frames must stay independent');
  await page.locator('#saveChar').click();
  const records=await page.evaluate(()=>JSON.parse(localStorage.getItem('mahluk-2-library-v1')));
  assert.equal(records.at(-1)?.emotionPlane?.asset,'db:emotion-sample-live');
  assert.equal(records.at(-1)?.emotionPlane?.placement?.sw?.x,3);
  assert.equal(records.at(-1)?.emotionPlane?.placement?.se?.x,0);
  if(errors.length)throw Error('JS errors: '+errors.join('\n'));
  console.log(JSON.stringify({result:'PASS',emotion:asset,frames:3,fps:6,
   renderedFrameChanged:true,perDirectionPlacement:true,
   bodyFramesUnchanged:true,savedRoot:true,localDatabase:'indexedDB',
   faceEditTools:'none'}));
 }finally{await browser.close()}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
