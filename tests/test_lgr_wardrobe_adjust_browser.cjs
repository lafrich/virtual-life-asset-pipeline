/* Browser smoke for Genesis Outfit Adjust 24-variant draft application. */
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
  await page.waitForFunction(()=>document.querySelector('#wa-count')?.textContent?.startsWith('24 VARIAN'),null,{timeout:75000});
  assert.match(await page.locator('#wa-active').textContent(),/MALE \/ ATASAN \/ Tee Long/i);
  const status=await page.locator('#wa-status').textContent();
  assert(!/error|gagal|missing|invalid|failed/i.test(status),status);
  const count=await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('lgr1-pakaian-drafts-v1')||'{}')).filter(k=>k.includes('|')).length);
  assert(count>=24,'All 24 drafts must be available without changing game masters');
  const bbox=()=>page.evaluate(async()=>{
   const c=(await MahlukPakaian.pixelContext()).canvas;
   const d=c.getContext('2d').getImageData(0,0,64,112).data;
   let lo=64,hi=-1,pixels=0;
   for(let i=0;i<64*112;i++)if(d[i*4+3]){const x=i%64;lo=Math.min(lo,x);hi=Math.max(hi,x);pixels++}
   return {lo,hi,pixels};
  });
  const old=await bbox();assert(old.pixels>50,'Loaded tee long source must have pixels');
  await page.locator('[data-nudge="1,0"]').click();
  await page.waitForFunction(async()=>{
   const c=(await MahlukPakaian.pixelContext()).canvas;
   const d=c.getContext('2d').getImageData(0,0,64,112).data;
   let lo=64;for(let i=0;i<64*112;i++)if(d[i*4+3])lo=Math.min(lo,i%64);
   return lo>=0&&Number(document.querySelector('#pk-version')?.textContent?.includes('UNSAVED'))===1;
  },null,{timeout:15000});
  const after=await bbox();assert.equal(after.pixels,old.pixels);assert.equal(after.lo,old.lo+1);
  await page.locator('#wa-save').click();
  assert.match(await page.locator('#wa-status').textContent(),/Draft disimpan/);
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#wa-export').click()]);
  await download.saveAs('/tmp/lgr-adjust-one-variant.json');
  const record=JSON.parse(fs.readFileSync('/tmp/lgr-adjust-one-variant.json','utf8'));
  assert.equal(record.group,'top');assert.equal(record.variant,'tee_long');assert.equal(record.approved,false);
  assert.ok(record.files['top/tee_long']);assert.ok(record.files['top/tee_long_back']);
  await page.locator('#wa-gender').selectOption('female');
  await page.locator('#wa-group').selectOption('pants');
  await page.locator('#wa-variant').selectOption('baggy');
  await page.waitForFunction(()=>MahlukPakaian.currentOutfit().gender==='female'&&MahlukPakaian.currentOutfit().group==='pants'&&MahlukPakaian.currentOutfit().variant==='baggy');
  assert.equal(await page.locator('#wa-side').isDisabled(),true);
  await page.locator('#wa-open-pixel').click();
  await page.locator('#pixelOverlay').waitFor({state:'visible',timeout:45000});
  assert.equal(await page.locator('#pk-reference-views button').count(),8);
  await page.locator('#pixelClose').click();
  await page.setViewportSize({width:390,height:780});
  assert(await page.locator('#wa-stage').isVisible());
  assert(await page.locator('#wa-open-pixel').isVisible());
  assert.deepEqual(errors,[],'No runtime page errors should occur');
  console.log('Outfit Adjust browser smoke PASS: 24 seeds, per-view nudge, draft save/export, Female Pants, Pixel Editor, mobile layout');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});