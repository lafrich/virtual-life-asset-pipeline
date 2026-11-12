/* Browser QA for SIX base LGR garments: unrestricted paint, save/export and editor. */
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1240,height:900},acceptDownloads:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>d.accept());
 try{
  await page.goto('http://127.0.0.1:8766/site/lgr-wardrobe-adjust.html');
  await page.waitForFunction(()=>document.querySelector('#wa-count')?.textContent?.startsWith('6 BASE'),null,{timeout:75000});
  assert.match(await page.locator('#wa-active').textContent(),/MALE \/ ATASAN \/ Tee/i);
  assert.deepEqual(await page.locator('#wa-group option').evaluateAll(a=>a.map(x=>x.value)),['top','pants','shoes']);
  assert.equal(await page.locator('#wa-variant').isHidden(),true,'No derivative garment picker');
  const stored=await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('lgr1-pakaian-drafts-v1')||'{}')).filter(k=>k.includes('|')));
  assert.equal(stored.length,6,'Exactly six baseline drafts seeded in clean browser');
  const read=(x,y)=>page.evaluate(async({x,y})=>{
   const {canvas}=await MahlukPakaian.pixelContext();
   const d=canvas.getContext('2d',{willReadFrequently:true}).getImageData(x,y,1,1).data;
   return [...d];
  },{x,y});
  const spot={x:4,y:12};
  const before=await read(spot.x,spot.y);
  assert.equal(before[3],0,'Outside old garment mask must begin transparent');
  await page.locator('#wa-mode').selectOption('paint');
  const b=await page.locator('#wa-stage').boundingBox();
  await page.mouse.click(b.x+(spot.x+.5)*b.width/64,b.y+(spot.y+.5)*b.height/112);
  await page.waitForFunction(async({x,y})=>{
   const {canvas}=await MahlukPakaian.pixelContext();
   return canvas.getContext('2d').getImageData(x,y,1,1).data[3]===255;
  },spot,{timeout:15000});
  await page.locator('#wa-undo').click();
  await page.waitForFunction(async({x,y})=>{
   const {canvas}=await MahlukPakaian.pixelContext();
   return canvas.getContext('2d').getImageData(x,y,1,1).data[3]===0;
  },spot,{timeout:15000});
  await page.locator('#wa-cover-1').click();
  assert(!/gagal|error|failed/i.test(await page.locator('#wa-status').textContent()));
  await page.locator('#wa-save').click();
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#wa-export').click()]);
  const filename='/tmp/lgr-adjust-base-tee.json';await download.saveAs(filename);
  const record=JSON.parse(fs.readFileSync(filename,'utf8'));
  assert.equal(record.gender,'male');assert.equal(record.group,'top');assert.equal(record.variant,'tee');
  assert.equal(record.approved,false);assert.ok(record.files['top/tee']);assert.ok(record.files['top/tee_back']);
  const [bundle]=await Promise.all([page.waitForEvent('download'),page.locator('#wa-export-all').click()]);
  const bundleFile='/tmp/lgr-adjust-all-six.json';await bundle.saveAs(bundleFile);
  const obj=JSON.parse(fs.readFileSync(bundleFile,'utf8'));assert.equal(obj.entries.length,6);
  await page.locator('#wa-gender').selectOption('female');
  await page.locator('#wa-group').selectOption('pants');
  await page.waitForFunction(()=>MahlukPakaian.currentOutfit().gender==='female'&&
   MahlukPakaian.currentOutfit().group==='pants'&&MahlukPakaian.currentOutfit().variant==='trousers',
   null,{timeout:30000});
  assert.equal(await page.locator('#wa-side').isDisabled(),true);
  await page.locator('#wa-open-pixel').click();
  await page.locator('#pixelOverlay').waitFor({state:'visible',timeout:45000});
  assert.equal(await page.locator('#pk-reference-views button').count(),8);
  await page.locator('#pixelClose').click();
  await page.setViewportSize({width:390,height:780});
  assert(await page.locator('#wa-stage').isVisible());
  assert(await page.locator('#wa-cover-1').isVisible());
  assert.deepEqual(errors,[],'No browser runtime errors');
  console.log('Genesis Outfit Adjust SIX BASE browser PASS: free paint outside mask, Undo, skin cover, draft save/export, Female Pants, Pixel Editor and mobile.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
