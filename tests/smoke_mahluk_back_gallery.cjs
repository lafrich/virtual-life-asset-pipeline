'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL='http://127.0.0.1:4173/virtual-life-asset-pipeline';
async function test(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1360,height:920}});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.goto(URL+'/mahluk-hidup.html?tab=character',{waitUntil:'domcontentloaded',timeout:45000});
  const ch=page.frameLocator('#character-frame');
  await ch.locator('body.wizard-ready').waitFor({timeout:65000});
  await ch.locator('#wizard-start-new').click();
  await ch.locator('#workflow-source').selectOption('base:female');
  await ch.locator('#wizard-next').click();
  await ch.locator('#wizard-customize:not([hidden])').waitFor({timeout:65000});
  await ch.locator('#wizard-part-nav [data-part=top]').click();
  await ch.locator('#top').selectOption('shirt');
  const activeChar=await ch.locator('#char-name').inputValue();assert.ok(activeChar);
  await ch.locator('#edit-top').click();
  const editor=page.frameLocator('#character-pixel-frame');
  await page.locator('#character-pixel-overlay:not([hidden])').waitFor({timeout:65000});
  await editor.locator('#pixelOverlay:not([hidden])').waitFor({timeout:65000});
  await editor.locator('#v6p-part').waitFor({timeout:65000});
  const front=await editor.locator('#v6p-part').inputValue();
  assert.equal(front,'top/shirt_f','Front view must edit female shirt front layer');
  await editor.locator('#pixelDirection').selectOption('ne');
  await editor.locator('#v6p-part').evaluate(async (el)=>{for(let i=0;i<200;i++){
   if(el.value==='top/shirt_back_f')return;
   await new Promise(r=>setTimeout(r,50));
  }throw Error('Back layer not loaded: '+el.value)});
  assert.equal(await editor.locator('#pixelDirection').inputValue(),'ne');
  console.log('[ok] NE selected REAL female top/shirt_back_f sprite layer');
  const canvas=editor.locator('#pixelCanvas');
  await editor.locator('#pixelColor').fill('#f000e0');
  const rect=await canvas.boundingBox();assert.ok(rect);
  await canvas.click({position:{x:Math.round(rect.width*12.5/64),y:Math.round(rect.height*29.5/112)}});
  await editor.locator('#pixelDirection').selectOption('nw');
  assert.equal(await editor.locator('#v6p-part').inputValue(),'top/shirt_back_f');
  await editor.locator('#pixelDirection').selectOption('se');
  await editor.locator('#v6p-part').evaluate(async el=>{for(let i=0;i<200;i++){
   if(el.value==='top/shirt_f')return;await new Promise(r=>setTimeout(r,50))
  }throw Error('Front layer not restored: '+el.value)});
  await editor.locator('#pixelDirection').selectOption('ne');
  await editor.locator('#v6p-part').evaluate(async el=>{for(let i=0;i<200;i++){
   if(el.value==='top/shirt_back_f')return;await new Promise(r=>setTimeout(r,50))
  }throw Error('Rear layer not restored: '+el.value)});
  await page.locator('#character-pixel-back').click();
  await page.locator('#character-pixel-overlay').waitFor({state:'hidden',timeout:65000});
  const saved=await page.evaluate(()=>{
   const selected=localStorage.getItem('vl-v6p-selected-character-v1');
   const stored=JSON.parse(localStorage.getItem('vl-v6p-character-workflow-v1')||'{}');
   const row=stored.items?.find(x=>x.id===selected);
   return {row:!!row,front:row?.masters?.['top/shirt_f']||{},back:row?.masters?.['top/shirt_back_f']||{}};
  });
  assert.ok(saved.row,'Missing draft after Pixel Editor Back');
  assert.ok(saved.back.ne,'NE pixel edit did not persist to physical back layer');
  assert.equal(saved.front.ne,undefined,'NE edit leaked into front layer');
  console.log('[ok] NE edit saved ONLY to top/shirt_back_f, not top/shirt_f');
  assert.equal(errors.length,0,'Page JS errors: '+errors.join(' | '));
  await page.close();
  const gallery=await browser.newPage({viewport:{width:1280,height:900}});
  await gallery.goto(URL+'/v6p-studio.html?embedded=1',{waitUntil:'domcontentloaded',timeout:45000});
  await gallery.locator('body.wizard-ready').waitFor({timeout:65000});
  await gallery.evaluate(()=>{
   const cv=document.createElement('canvas');cv.width=64;cv.height=448;
   const g=cv.getContext('2d');
   for(let i=0;i<4;i++){g.fillStyle=['#e32c5a','#218fcb','#51a84e','#aa74d6'][i];g.fillRect(0,i*112,64,112)}
   const record={id:'mh2_testfemale',name:'test female',base:'female',updated:new Date().toISOString(),
     v6p:{body:'female',top:'shirt'},clips:{idle:{frames:4,sheet:cv.toDataURL('image/png')}}};
   localStorage.setItem('mahluk-2-library-v1',JSON.stringify([record]));
  });
  await gallery.locator('#wizard-tab-gallery').click();
  await gallery.locator('.wizard-gallery-card').waitFor({timeout:12000});
  assert.equal(await gallery.locator('.wizard-gallery-card').count(),1);
  assert.match(await gallery.locator('.wizard-gallery-card h3').innerText(),/test female/);
  assert.equal(await gallery.locator('.wizard-gallery-card canvas').count(),4);
  await gallery.waitForFunction(()=>[...document.querySelectorAll('.wizard-gallery-card canvas')]
   .every(c=>c.getContext('2d').getImageData(5,5,1,1).data[3]===255),{timeout:12000});
  const colors=await gallery.locator('.wizard-gallery-card canvas').evaluateAll(els=>
   els.map(e=>[...e.getContext('2d').getImageData(5,5,1,1).data].slice(0,3).join(',')));
  assert.equal(new Set(colors).size,4,'All rear/front gallery views must be distinct');
  assert.equal(await gallery.locator('.wizard-gallery-card button').count(),0,'Gallery must be view-only');
  await gallery.locator('#wizard-tab-start').click();
  assert.equal(await gallery.locator('#wizard-start-new').isVisible(),true);
  console.log('[ok] Gallery shows four distinct saved angles and has no edit controls');
  console.log('PASS Character back-layer/gallery browser regression');
 }catch(e){
  console.error('BROWSER ERRORS:',errors.slice(-8));
  console.error('MAIN STATUS',await page.frameLocator('#character-frame').locator('#wizard-notice').textContent().catch(()=>'<missing>'));
  console.error('EDITOR STATUS',await page.frameLocator('#character-pixel-frame').locator('#editor-status').textContent().catch(()=>'<missing>'));
  await page.screenshot({path:'/tmp/back-layer-gallery-failed.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await browser.close()}
}
test().catch(e=>{console.error(e);process.exitCode=1});