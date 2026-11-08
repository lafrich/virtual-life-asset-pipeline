'use strict';
/* Character Wizard Python QA smoke. Uses real Chromium + original V6B Python
 * rasterized on the actual Genesis source + Custom Wear, not mocked pixels. No game install or Drive writes.
 */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1240,height:880}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:4173/v6p-studio.html',{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('body.wizard-ready').waitFor({timeout:65000});
  await page.locator('#wizard-start-new').click();
  await page.locator('#workflow-source').selectOption('base:female');
  await page.locator('#wizard-next').click();
  await page.locator('#wizard-customize:not([hidden])').waitFor({timeout:65000});
  await page.locator('#wizard-part-nav [data-part=hair]').click();
  await page.locator('#hair').selectOption('short');
  await page.locator('#hairColor').selectOption('pink');
  await page.locator('#wizard-next').click();
  await page.locator('#wizard-preview:not([hidden])').waitFor({timeout:65000});
  const source=await page.evaluate(()=>{
   const C=window.GenesisNativePythonContract;
   const data=C.make({name:'Character Python QA Probe',template:'idle',frameCount:2,ms:150});
   data.poses.se[0].joints.hand_near={x:31,y:62};
   data.poses.sw[0].joints.elbow_far={x:35,y:72};
   return C.toPython(data);
  });
  assert.ok(await page.locator('#qa-import-python').isVisible(),'Import Python button is not in Character Preview');
  assert.ok(await page.locator('#qa-from-database').isVisible(),'From Database button is missing');
  await page.locator('#qa-python-file').setInputFiles({
   name:'character_qa.py',mimeType:'text/x-python',buffer:Buffer.from(source,'utf8')
  });
  await page.waitForFunction(()=>document.querySelector('#qa-animation')?.value.startsWith('python:')&&
   document.querySelector('#qa-python-status')?.textContent?.includes('GENESIS CHARACTER PYTHON PREVIEW'),null,{timeout:30000});
  await page.waitForFunction(()=>{
   const cs=[...document.querySelectorAll('canvas[data-qa-dir]')];
   return cs.length===4&&cs.every(c=>{
    const pixels=c.getContext('2d').getImageData(0,0,64,112).data;
    return Array.from(pixels).some((x,i)=>i%4===3&&x>0);
   });
  },null,{timeout:150000});
  const imgs=await page.evaluate(()=>[...document.querySelectorAll('canvas[data-qa-dir]')].map(c=>c.toDataURL()));
  assert.equal(imgs.length,4);
  assert.notEqual(imgs[0],imgs[2],'Native Python front/back should not be identical');
  assert.match(await page.locator('#qa-python-status').textContent(),/Custom Wear/);
  const appearance=await page.evaluate(()=>window.V6PCharacterHost.get().ch);
  assert.equal(appearance.hair,'short');
  assert.equal(appearance.hairColor,'pink');
  await page.locator('#qa-next').click();
  assert.match(await page.locator('#qa-frame-label').textContent(),/FRAME 2 \/ 2/);
  await page.locator('canvas[data-qa-dir=se]').click();
  assert.match(await page.locator('#qa-python-status').textContent(),/protected/);
  assert.deepEqual(errors,[]);
  console.log('PASS Character QA: import .py → native 4-direction Python pixels → frame controls → protected Character');
 }catch(e){
  console.error('CHARACTER PYTHON QA FAILED',e.message);
  console.error('PAGE ERRORS',errors);
  console.error('PYTHON STATUS',await page.locator('#qa-python-status').textContent().catch(()=>'?'));
  console.error('GENERATION STATUS',await page.locator('#generate-result').textContent().catch(()=>'?'));
  throw e;
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
