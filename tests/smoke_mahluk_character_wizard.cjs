'use strict';
/* E2E wizard smoke. Run via Playwright from a static localhost server.
 * npm install --no-save --no-package-lock playwright
 * npx playwright install chromium
 * python3 -m http.server 4173 --bind 127.0.0.1 -d site &
 * node tests/smoke_mahluk_character_wizard.cjs
 */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
async function run(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const serious=[];
 page.on('pageerror',e=>serious.push(String(e)));
 try{
  await page.goto('http://127.0.0.1:4173/virtual-life-asset-pipeline/v6p-studio.html?embedded=1',{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('body.wizard-ready').waitFor({timeout:65000});
  await page.locator('#wizard-home:not([hidden])').waitFor({timeout:65000});
  console.log('[ok] WIZARD HOME');
  await page.locator('#wizard-start-new').click();
  assert.equal(await page.locator('#wizard-base').isVisible(),true);
  await page.locator('#wizard-back').click();
  assert.equal(await page.locator('#wizard-home').isVisible(),true);
  console.log('[ok] BASE -> BACK -> HOME');
  await page.locator('#wizard-start-new').click();
  await page.locator('#workflow-source').selectOption('base:female');
  await page.locator('#wizard-next').click();
  await page.locator('#wizard-customize:not([hidden])').waitFor({timeout:65000});
  assert.equal(await page.locator('#body').inputValue(),'female');
  assert.equal(await page.locator('#hair').inputValue(),'none');
  assert.equal(await page.locator('#top').inputValue(),'custom');
  assert.equal(await page.locator('#pants').inputValue(),'custom');
  assert.equal(await page.locator('#shoes').inputValue(),'custom');
  const approved=await page.evaluate(()=>{
   const S=window.V6PCharacterStore,row=S.get(window.V6PCharacterHost.get().id);
   return {source:window.V6PGenesisBase?.get('female')?.name,
    parts:Object.keys(row?.parts||{}),face:row?.faceId};
  });
  assert.equal(approved.source,'Genesis Female Nude');
  assert.ok(approved.parts.includes('top/custom_f')&&approved.parts.includes('pants/custom_f'));
  assert.equal(approved.face,'');
  console.log('[ok] FEMALE GENESIS BASE WITH EMOSI BLANK FACE CREATED');
  await page.locator('#wizard-part-nav [data-part=hair]').click();
  assert.equal(await page.locator('#wizard-part-hair').isVisible(),true);
  await page.locator('#hair').selectOption('short');
  await page.locator('#wizard-next').click();
  await page.locator('#wizard-preview:not([hidden])').waitFor({timeout:65000});
  assert.equal(await page.locator('canvas[data-qa-dir]').count(),4);
  await page.locator('#qa-animation').selectOption('walk');
  await page.locator('#qa-next').click();
  assert.match(await page.locator('#qa-frame-label').innerText(),/FRAME 2 \/ 6/);
  console.log('[ok] GENERATE + PREVIEW FOUR DIRECTIONS AND WALK FRAMES');
  await page.locator('#wizard-back').click();
  assert.equal(await page.locator('#wizard-customize').isVisible(),true);
  await page.locator('#wizard-next').click();
  await page.locator('#wizard-preview:not([hidden])').waitFor({timeout:65000});
  await page.locator('#wizard-next').click();
  await page.locator('#wizard-save:not([hidden])').waitFor({timeout:15000});
  await page.locator('#char-name').fill('Wizard Smoke Female');
  await page.locator('#wizard-next').click();
  await page.locator('#wizard-save-success.visible').waitFor({timeout:65000});
  const stored=await page.evaluate(()=>{
   const list=JSON.parse(localStorage.getItem('mahluk-2-library-v1')||'[]');
   const char=list.find(x=>x.name==='Wizard Smoke Female');
   return char?{id:char.id,clips:Object.keys(char.clips||{}),gender:char.base}:null;
  });
  assert.ok(stored,'Character publish did not persist');
  assert.ok(stored.clips.includes('walk')&&stored.clips.includes('idle'),'Native animation frames missing');
  console.log('[ok] SAVED TO CHARACTER DATABASE WITH '+stored.clips.length+' ANIMATIONS');
  await page.locator('#wizard-next').click();
  assert.equal(await page.locator('#wizard-home').isVisible(),true);
  await page.locator('#wizard-start-modify').click();
  await page.locator('#workflow-list').selectOption(stored.id);
  await page.locator('#workflow-open').click();
  await page.locator('#wizard-customize:not([hidden])').waitFor({timeout:65000});
  await page.locator('#wizard-back').click();
  assert.equal(await page.locator('#wizard-home').isVisible(),true);
  console.log('[ok] MODIFY EXISTING -> CUSTOMIZE -> BACK HOME');
  const app=await browser.newPage({viewport:{width:1280,height:900}});
  try{
   await app.goto('http://127.0.0.1:4173/virtual-life-asset-pipeline/mahluk-hidup.html?tab=character',
    {waitUntil:'domcontentloaded',timeout:45000});
   const character=app.frameLocator('#character-frame');
   await character.locator('body.wizard-ready').waitFor({timeout:65000});
   await character.locator('#wizard-start-new').click();
   await character.locator('#workflow-source').selectOption('base:male');
   await character.locator('#wizard-next').click();
   await character.locator('#wizard-customize:not([hidden])').waitFor({timeout:65000});
   await character.locator('#wizard-part-nav [data-part=top]').click();
   await character.locator('#edit-top').click();
   await app.locator('#character-pixel-overlay:not([hidden])').waitFor({timeout:65000});
   assert.equal(await app.locator('#character-view.active').isVisible(),true,
    'Pixel Editor must remain inside Character tab');
   await app.locator('#character-pixel-back').click();
   await app.locator('#character-pixel-overlay').waitFor({state:'hidden',timeout:65000});
   assert.equal(await character.locator('#wizard-customize').isVisible(),true,
    'Back from Pixel Editor must restore the Customize step');
   console.log('[ok] PIXEL EDITOR OPENS INSIDE CHARACTER AND BACK RESTORES CUSTOMIZE');
  }finally{await app.close()}
  console.log('PASS Character wizard browser smoke');
 }catch(error){
  console.error('PAGE STATUS',await page.locator('#wizard-notice').textContent().catch(()=>'<missing>'));
  console.error('GENERATION STATUS',await page.locator('#generate-result').textContent().catch(()=>'<missing>'));
  console.error('COMPOSITOR STATUS',await page.locator('#status').textContent().catch(()=>'<missing>'));
  console.error('PAGE ERRORS',serious.slice(-10));
  await page.screenshot({path:'/tmp/character-wizard-failed.png',fullPage:true}).catch(()=>{});
  throw error;
 }finally{await browser.close()}
}
run().catch(error=>{console.error(error);process.exitCode=1});
