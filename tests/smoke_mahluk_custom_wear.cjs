'use strict';
/* Browser-backed Custom Wear regression: sheet cloning, exact frame edits,
   four-direction source separation, native pose regeneration and Wizard UX. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:4173/virtual-life-asset-pipeline/v6p-studio.html?embedded=1',
   {waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('body.wizard-ready').waitFor({timeout:65000});
  await page.locator('#wizard-start-new').click();
  await page.locator('#workflow-source').selectOption('base:female');
  await page.locator('#wizard-next').click();
  await page.locator('#wizard-customize:not([hidden])').waitFor({timeout:65000});
  assert.equal(await page.locator('#top').inputValue(),'tee');
  assert.equal(await page.locator('#top option[value=nude]').count(),0);
  assert.equal(await page.locator('#pants option[value=nude]').count(),0);
  assert.equal(await page.locator('#shoes option[value=nude]').count(),0);
  await page.locator('#wizard-part-nav [data-part=top]').click();
  await page.locator('#top').selectOption('custom');
  await page.locator('#custom-top-panel:not([hidden])').waitFor({timeout:65000});
  await page.waitForFunction(()=>{
   const id=window.V6PCharacterHost.get().id,S=window.V6PCharacterStore;
   return !!(id&&S.getPart(id,'top/custom_f')&&S.getPart(id,'top/custom_back_f'));
  },{timeout:65000});
  const evidence=await page.evaluate(async()=>{
   const S=window.V6PCharacterStore,P=window.V6PPixelSource,C=window.V6PPartCatalog,
    W=window.V6PCustomWear,R=window.V6PCharacterRetarget,V=window.V6PCompositor;
   const id=window.V6PCharacterHost.get().id;
   const before=S.getPart(id,'top/custom_back_f');
   const edited=await P.loadSheetFromUrl(before);
   const o=C.cellOrigin('walk','nw',2);
   const x=o.x+15,y=o.y+37;
   edited.getContext('2d').fillStyle='#e02ec4';edited.getContext('2d').fillRect(x,y,2,2);
   const png=edited.toDataURL('image/png');
   S.setPart(id,'top/custom_back_f',png);
   const result=await R.generateCharacter(id);
   const after=S.getPart(id,'top/custom_back_f');
   const actual=await P.loadSheetFromUrl(after);
   const px=[...actual.getContext('2d').getImageData(x,y,1,1).data];
   const composed=await V.sheet({...S.get(id).appearance,characterId:id});
   return {id,top:C.isPart('top/custom_f'),back:C.isPart('top/custom_back_f'),
    legacy:C.isPart('top/nude_f'),wholeSheet:actual.width===C.W&&actual.height===C.H,
    separate:S.getPart(id,'top/custom_f')!==after,
    exact:after===png,color:px.join(','),generated:result.frames,
    composed:!!composed,templates:W.TEMPLATES.top.length,template:W.selectedTemplate(S.get(id),'top')};
  });
  assert.equal(evidence.top,true);assert.equal(evidence.back,true);
  assert.equal(evidence.legacy,false);assert.equal(evidence.wholeSheet,true);
  assert.equal(evidence.separate,true);assert.equal(evidence.exact,true);
  assert.equal(evidence.color,'224,46,196,255');
  assert.equal(evidence.composed,true);assert.equal(evidence.generated,0);
  assert.ok(evidence.templates>=4);
  await page.locator('#wizard-next').click();
  await page.locator('#wizard-preview:not([hidden])').waitFor({timeout:65000});
  await page.locator('#qa-animation').selectOption('walk');
  await page.locator('#wizard-next').click();
  await page.locator('#wizard-save:not([hidden])').waitFor({timeout:65000});
  await page.locator('#char-name').fill('Custom Wear Smoke');
  await page.locator('#wizard-next').click();
  await page.locator('#wizard-save-success.visible').waitFor({timeout:65000});
  assert.deepEqual(errors,[]);
  console.log('PASS Custom Wear exact sheet, native animations, back layer and Wizard save');
 }catch(err){
  console.error('Custom Wear browser errors',errors);
  console.error('Status',await page.locator('#status').textContent().catch(()=>'<none>'));
  console.error('Generate',await page.locator('#generate-result').textContent().catch(()=>'<none>'));
  await page.screenshot({path:'/tmp/mahluk-custom-wear-failed.png',fullPage:true}).catch(()=>{});
  throw err;
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
