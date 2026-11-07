'use strict';
/* Browser acceptance: Action multi-cast scene > save/gallery, Animation base
   pose > frame edit > animated preview > save/gallery. No Custom Wear changes. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root='http://127.0.0.1:4173/virtual-life-asset-pipeline';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(root+'/mahluk-hidup.html?tab=action',{waitUntil:'domcontentloaded',timeout:45000});
  const a=page.frameLocator('#action-frame');
  await a.locator('#action-home:not([hidden])').waitFor({timeout:65000});
  await a.locator('#action-start-new').click();
  await a.locator('#action-choose:not([hidden])').waitFor();
  await a.locator('#choose-actor').selectOption('base:male');
  await a.locator('#choose-add').click();
  await a.locator('#choose-actor').selectOption('base:female');
  await a.locator('#choose-add').click();
  assert.equal(await a.locator('#choose-cast-list button').count(),2);
  await a.locator('#choose-next').click();
  await a.locator('#action-workspace:not([hidden])').waitFor();
  assert.equal(await a.locator('#cast-list button').count(),2);
  await a.locator('#action-name').fill('Two Character Dialogue');
  await a.locator('#phase-loop').selectOption('native:talk');
  // Drag the selected second character on the scene canvas.
  const cv=a.locator('#action-canvas'),box=await cv.boundingBox();
  assert.ok(box,'Scene canvas is visible');
  const sx=box.x+(40+109+48)*box.width/576,sy=box.y+(164+19+80)*box.height/400;
  await page.mouse.move(sx,sy);await page.mouse.down();
  await page.mouse.move(sx+28,sy+11,{steps:5});await page.mouse.up();
  const offset=Number(await a.locator('#offset-x').inputValue());
  assert.ok(offset>149,'Dragging selected character did not update its position '+offset);
  await a.locator('#save').click();
  await a.locator('#action-home:not([hidden])').waitFor({timeout:20000});
  const actionData=await page.evaluate(()=>{
    const v=JSON.parse(localStorage.getItem('mahluk-action-situations-v1')||'{}');
    return v.items?.find(x=>x.name==='Two Character Dialogue')||null;
  });
  assert.ok(actionData&&actionData.actors.length===2,'Action scene did not preserve two actors');
  assert.equal(actionData.actors[1].loop,'native:talk');
  assert.ok(actionData.actors[1].x>149);
  await a.locator('#action-gallery button').filter({hasText:'Two Character Dialogue'}).click();
  await a.locator('#action-workspace:not([hidden])').waitFor();
  assert.equal(await a.locator('#cast-list button').count(),2,'Modify did not reopen both actors');
  await a.locator('#action-save-sync').click();
  await a.locator('#action-home:not([hidden])').waitFor();
  assert.match(await a.locator('#action-home-note').textContent(),/DRIVE NOT SYNCED|DRIVE VERIFIED/);
  console.log('PASS Action Create / Choose two characters / Drag / Per-character animation / Save / Gallery / Modify / Sync state');

  await page.evaluate(()=>window.VLMahlukWorkspace.show('animation'));
  const m=page.frameLocator('#motion-frame');
  await m.locator('#animation-home:not([hidden])').waitFor({timeout:65000});
  await m.locator('#animation-start-new').click();
  await m.locator('#animation-setup:not([hidden])').waitFor();
  const gender=await m.locator('#gender option').allTextContents();
  assert.equal(gender.length,2,'Animation should only choose Male/Female body base, no clothing options');
  assert.equal(await m.locator('#gender option[value=nude]').count(),0);
  await m.locator('#gender').selectOption('female');
  await m.locator('#template').selectOption('sit');
  await m.locator('#setup-name').fill('Test Sitting Activity');
  await m.locator('#setup-create').click();
  await m.locator('#animation-workspace:not([hidden])').waitFor({timeout:65000});
  assert.ok(await m.locator('#frame-strip button').count()>=2);
  assert.equal(await m.locator('#gif-preview').getAttribute('width'),'64');
  await m.locator('#view').selectOption('ne');
  await m.locator('#frame-strip button').nth(1).click();
  await m.locator('#px').fill('3');
  assert.equal(await m.locator('#px').inputValue(),'3');
  await m.locator('#play').click();
  await m.locator('#gif-preview-note').waitFor({timeout:10000});
  await m.locator('#play').click();
  await m.locator('#save').click();
  await m.locator('#animation-home:not([hidden])').waitFor({timeout:65000});
  const animation=await page.evaluate(()=>{
   const db=JSON.parse(localStorage.getItem('vl-mahluk-animation-anchor-poses-v1')||'{}');
   return Object.values(db).find(x=>x.name==='Test Sitting Activity')||null;
  });
  assert.ok(animation,'New animation not in existing database');
  assert.equal(animation.gender,'female');
  assert.equal(animation.template,'sit');
  assert.equal(animation.tracks.ne[1].head.x,3,'Edited frame NE transform was not saved');
  await m.locator('#animations button').filter({hasText:'Test Sitting Activity'}).click();
  await m.locator('#animation-workspace:not([hidden])').waitFor();
  await m.locator('#animation-save-sync').click();
  await m.locator('#animation-home:not([hidden])').waitFor({timeout:65000});
  assert.match(await m.locator('#animation-home-note').textContent(),/DRIVE NOT SYNCED|DRIVE VERIFIED/);
  assert.deepEqual(errors,[]);
  console.log('PASS Animation Create / Male-Female Base / Sitting Pose / Editable Frame NE / GIF Preview / Save / Gallery / Modify / Sync state');
 }catch(error){
  console.error('ACTION/ANIMATION FLOW ERROR',error);
  console.error('PAGE ERRORS',errors);
  await page.screenshot({path:'/tmp/mahluk-action-animation-flows-failed.png',fullPage:true}).catch(()=>{});
  throw error;
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
