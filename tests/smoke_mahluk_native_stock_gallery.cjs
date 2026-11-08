'use strict';
/* Chromium smoke: Punch must actually be visible/playable in both unchanged
   Animation and Character QA screens. Legacy five-band clips must be absent. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root='http://127.0.0.1:4173/virtual-life-asset-pipeline';
const retired=['pushup','yoga_sphinx_idle','yoga_puppy_idle','hip_shake','yoga_happy_baby_idle'];
const alpha=canvas=>{const d=canvas.getContext('2d').getImageData(0,0,64,112).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>8)n++;return n};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(root+'/mahluk-animation-studio.html?embedded=1',{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#animations button[data-clip="clp_standing_punch"]').waitFor({timeout:45000});
  const available=await page.evaluate(()=>window.V6PClipStore.list().map(c=>c.id));
  for(const id of retired)assert.ok(!available.includes('clip_'+id),'Retired stock returned: '+id);
  assert.ok(available.includes('clp_standing_punch'));
  assert.equal(await page.locator('#animations h3.animation-category').filter({hasText:'PUNCH'}).count(),1);
  await page.locator('#animations button[data-clip="clp_standing_punch"]').click();
  await page.locator('#animation-workspace:not([hidden])').waitFor({timeout:45000});
  await page.waitForFunction(()=>document.getElementById('status')?.textContent.startsWith('LOADED'),null,{timeout:45000});
  assert.equal(await page.locator('#frame-strip button').count(),5);
  for(const dir of ['se','sw','ne','nw']){
   await page.locator('#view').selectOption(dir);
   for(let frame=0;frame<5;frame++){
    await page.locator('#frame-strip button').nth(frame).click();
    const count=await page.locator('#gif-preview').evaluate(alpha);
    assert.ok(count>20,'Punch invisible: '+dir+' frame '+frame);
   }
  }
  console.log('[ok] Punch appears in Animation gallery with 5×4 nonempty actual frames');

  // No extra preview UI: the Character Wizard already owns qa-animation/all-views.
  await page.goto(root+'/v6p-studio.html',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>window.V6PCharacterHost&&window.__v6pStudio?.ready,null,{timeout:45000});
  await page.locator('#qa-animation option[value="motion:clp_standing_punch"]').waitFor({timeout:30000});
  await page.evaluate(async()=>{await window.V6PCharacterHost.useBase('male');
   await window.V6PCharacterHost.qa('motion:clp_standing_punch',2)});
  for(const dir of ['se','sw','ne','nw']){
   const count=await page.locator('[data-qa-dir="'+dir+'"]').evaluate(alpha);
   assert.ok(count>20,'Character QA Punch invisible: '+dir);
  }
  console.log('[ok] Existing Character Preview QA renders Punch in all four directions');
  await page.goto(root+'/mahluk-action-editor.html',{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#phase-loop option[value="clip:clp_standing_punch"]').waitFor({timeout:45000});
  console.log('[ok] Existing Action Editor also auto-detects bundled JSON Punch');
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
