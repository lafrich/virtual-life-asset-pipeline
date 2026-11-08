'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const root='http://127.0.0.1:4173/virtual-life-asset-pipeline';
const alpha=canvas=>{const d=canvas.getContext('2d').getImageData(0,0,64,112).data;let n=0;
 for(let i=3;i<d.length;i+=4)if(d[i]>8)n++;return n};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(root+'/mahluk-animation-studio.html?embedded=1',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>window.V6PClipStore,null,{timeout:45000});
  const clips=await page.evaluate(async()=>{await window.V6PClipStore.loadBundled();return window.V6PClipStore.list().map(c=>c.id)});
  assert.deepEqual(clips,[],'Non-native animations must be deleted, not hidden');
  await page.goto(root+'/v6p-studio.html',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>window.V6PCharacterHost&&window.__v6pStudio?.ready,null,{timeout:45000});
  for(const gender of ['male','female']){
   await page.evaluate(async g=>{await window.V6PCharacterHost.useBase(g)},gender);
   for(const action of ['idle','walk']){
    await page.evaluate(async a=>{await window.V6PCharacterHost.qa(a,0)},action);
    for(const dir of ['se','sw','ne','nw']){
     assert.ok(await page.locator('[data-qa-dir="'+dir+'"]').evaluate(alpha)>20,
      'Native '+gender+' '+action+' '+dir+' is invisible');
    }
   }
  }
  assert.deepEqual(errors,[]);
  console.log('[ok] Native Idle/Walk preserved; zero non-native bundled animations');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
