'use strict';
/* Real Chromium smoke: open all five V6P stock animations from the Mahluk
   Animation Gallery and actually render approved male/female sprites. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root='http://127.0.0.1:4173/virtual-life-asset-pipeline';
const ids=['pushup','yoga_sphinx_idle','yoga_puppy_idle','hip_shake','yoga_happy_baby_idle'];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(root+'/mahluk-animation-studio.html?embedded=1',{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#animation-home:not([hidden])').waitFor({timeout:65000});
  await page.waitForFunction(()=>window.V6PClipStore?.list().length>=5);
  assert.equal(await page.locator('#animations button[data-clip^="clip_"]').count(),5);
  for(const id of ids){
   await page.locator('#animations button[data-clip="clip_'+id+'"]').click();
   await page.locator('#animation-stock-preview:not([hidden])').waitFor({timeout:15000});
   // Freeze loop for controlled frame and direction comparisons.
   if(await page.locator('#stock-play').textContent()==='❚❚ PAUSE')await page.locator('#stock-play').click();
   for(const gender of ['male','female']){
    await page.locator('#stock-gender').selectOption(gender);
    for(const dir of ['se','sw','ne','nw']){
     await page.locator('#stock-dir').selectOption(dir);
     await page.locator('#stock-status').filter({hasText:/READY/}).waitFor({timeout:30000});
     const pixels=await page.locator('#stock-canvas').evaluate(canvas=>{
      const data=canvas.getContext('2d').getImageData(0,0,64,112).data;
      return [...data].filter((x,i)=>i%4===3&&x>0).length;
     });
     assert.ok(pixels>20,id+' '+gender+' '+dir+' was empty');
    }
   }
   const count=await page.locator('#stock-timeline button').count();
   assert.ok(count===4||count===6,id+' bad frame count');
   if(id==='pushup'||id==='hip_shake'){
    await page.locator('#stock-gender').selectOption('male');
    await page.locator('#stock-dir').selectOption('se');
    await page.locator('#stock-status').filter({hasText:/READY/}).waitFor();
    const a=await page.locator('#stock-canvas').evaluate(cv=>cv.toDataURL());
    await page.locator('#stock-next').click();
    await page.locator('#stock-status').filter({hasText:/READY/}).waitFor();
    const b=await page.locator('#stock-canvas').evaluate(cv=>cv.toDataURL());
    assert.notEqual(a,b,id+' frames did not move');
   }
   await page.locator('#stock-back').click();
   await page.locator('#animation-home:not([hidden])').waitFor();
  }
  const grok=await page.evaluate(()=>window.V6PClipStore.list().filter(c=>/grok/i.test(c.id)||c.manifest?.source==='grok-stock-animation-v1').length);
  assert.equal(grok,0,'Rejected Grok animations leaked into active stock');

  // Gallery MODIFY must enter Sprite + Anchor, never an unscoped blank Pixel
  // Editor, using the chosen Genesis Female's actual original Custom Wear.
  await page.locator('#gallery-character').selectOption('base:female');
  await page.locator('#animations button[data-modify="clip_pushup"]').click();
  await page.locator('#animation-workspace:not([hidden])').waitFor({timeout:45000});
  await page.waitForFunction(()=>{
   const select=document.getElementById('pixel-target');
   const source=document.getElementById('source-label');
   return select?.options.length>0&&source?.textContent.includes('GENESIS FEMALE');
  },null,{timeout:45000});
  const targets=await page.locator('#pixel-target option').evaluateAll(
   all=>all.map(option=>option.value));
  for(const part of ['top/custom_f','pants/custom_f','shoes/custom_f'])
   assert.ok(targets.includes(part),'Missing real Genesis Female sprite part '+part);
  assert.ok(!targets.includes('base/body_f'),'Body Genesis must be read-only in animation-specific Pixel Editor');
   await page.locator('#parts [data-part="torso"]').click();
  assert.equal(await page.locator('#pixel-target').inputValue(),'top/custom_f');
  assert.equal(await page.locator('#part-edit-now').isVisible(),true);
  await page.locator('#animation-editor-back').click();
  await page.locator('#animation-home:not([hidden])').waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS 5 approved native stock x 2 bases x 4 dirs, native playback, no Grok review');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
