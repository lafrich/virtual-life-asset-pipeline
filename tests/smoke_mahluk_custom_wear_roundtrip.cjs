'use strict';
/* Real UI contract: Character > Custom Top > Edit Sprite > paint > Back >
   resume same customized character + same pixel, including frame reload.
   This catches menu reset and lost custom mode, not just PNG generator tests. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',err=>errors.push(String(err)));
 const char=page.frameLocator('#character-frame');
 const pixel=page.frameLocator('#character-pixel-frame');
 try{
  await page.goto('http://127.0.0.1:4173/virtual-life-asset-pipeline/mahluk-hidup.html?tab=character',
    {waitUntil:'domcontentloaded',timeout:45000});
  await char.locator('body.wizard-ready').waitFor({timeout:65000});
  await char.locator('#wizard-home:not([hidden])').waitFor({timeout:65000});
  await char.locator('#wizard-start-new').click();
  await char.locator('#workflow-source').selectOption('base:female');
  await char.locator('#wizard-next').click();
  await char.locator('#wizard-customize:not([hidden])').waitFor({timeout:65000});
  await char.locator('#wizard-part-nav [data-part=top]').click();
  await char.locator('#top').selectOption('custom');
  await char.locator('#custom-top-panel:not([hidden])').waitFor({timeout:65000});
  await page.waitForFunction(()=>{
   const w=document.getElementById('character-frame').contentWindow,S=w.V6PCharacterStore;
   const id=w.V6PCharacterHost?.get().id;
   return !!(id&&S.get(id)?.appearance.top==='custom'&&S.getPart(id,'top/custom_f'));
  },{timeout:65000});
  const original=await page.evaluate(async()=>{
    const w=document.getElementById('character-frame').contentWindow;
    const id=w.V6PCharacterHost.get().id,S=w.V6PCharacterStore,P=w.V6PPixelSource;
    const img=await P.loadSheetFromUrl(S.getPart(id,'top/custom_f'));
    const d=P.extract(img,'idle','se',0).data;
    let pos=null;
    for(let y=39;y<81&&!pos;y++)for(let x=14;x<51;x++){
      const i=(y*64+x)*4;
      if(d[i+3]===255){pos={x,y,before:[...d.slice(i,i+4)]};break;}
    }
    if(!pos)throw Error('Native Tee target pixel not found');
    return {id,pos};
  });
  await char.locator('#edit-top').click();
  await page.locator('#character-pixel-overlay:not([hidden])').waitFor({timeout:65000});
  await pixel.locator('#pixelOverlay:not([hidden])').waitFor({timeout:65000});
  assert.equal(await pixel.locator('#source-state').textContent().then(s=>s.includes('top/custom_f')),true);
  await pixel.locator('#pixelDirection').selectOption('se');
  await pixel.locator('#pixelColor').fill('#ef27a9');
  const cv=pixel.locator('#pixelCanvas');
  const box=await cv.boundingBox();assert.ok(box);
  await cv.click({position:{
    x:Math.round((original.pos.x+.5)*box.width/64),
    y:Math.round((original.pos.y+.5)*box.height/112)
  }});
  // User switches angle then back, saving the actual drawing.
  await pixel.locator('#pixelDirection').selectOption('sw');
  await pixel.locator('#pixelDirection').selectOption('ne');
  assert.ok((await pixel.locator('#source-state').textContent()).includes('top/custom_f'),
    'NE incorrectly opened tiny occluded top_back source');
  await pixel.locator('#pixelDirection').selectOption('nw');
  assert.ok((await pixel.locator('#source-state').textContent()).includes('top/custom_f'),
    'NW incorrectly opened tiny occluded top_back source');
  await pixel.locator('#pixelDirection').selectOption('se');
  await page.locator('#character-pixel-back').click();
  await page.locator('#character-pixel-overlay').waitFor({state:'hidden',timeout:65000});
  await char.locator('#wizard-customize:not([hidden])').waitFor({timeout:65000});
  assert.equal(await char.locator('#top').inputValue(),'custom','Top changed back to base clothes after editor Back');
  assert.equal(await char.locator('#wizard-part-top').isVisible(),true,'Returned to a different tab');
  const after=await page.evaluate(async({id,pos})=>{
   const w=document.getElementById('character-frame').contentWindow;
   const S=w.V6PCharacterStore,P=w.V6PPixelSource;
   const sheet=await P.loadSheetFromUrl(S.getPart(id,'top/custom_f'));
   const d=P.extract(sheet,'idle','se',0).data,i=(pos.y*64+pos.x)*4;
   return {appearance:S.get(id)?.appearance?.top,px:[...d.slice(i,i+4)]};
  },original);
  assert.equal(after.appearance,'custom');
  assert.deepEqual(after.px,[239,39,169,255],'Drawn top pixel did not persist on Back');
  console.log('PASS Custom Wear edit + Back:',JSON.stringify(after));
  // Reload mimics mobile iframe/page going to background and back.
  await page.evaluate(()=>document.getElementById('character-frame').contentWindow.location.reload());
  await char.locator('body.wizard-ready').waitFor({timeout:65000});
  await char.locator('#wizard-customize:not([hidden])').waitFor({timeout:65000});
  assert.equal(await char.locator('#top').inputValue(),'custom');
  const resumed=await page.evaluate(({id})=>{
    const w=document.getElementById('character-frame').contentWindow;
    return {selected:w.V6PCharacterStore.selected(),appearance:w.V6PCharacterStore.get(id)?.appearance?.top,
      step:JSON.parse(w.sessionStorage.getItem('mahluk-character-wizard-v1')||'{}').step};
  },original);
  assert.equal(resumed.selected,original.id);
  assert.equal(resumed.appearance,'custom');
  assert.equal(resumed.step,'customize');
  assert.deepEqual(errors,[]);
  console.log('PASS Custom Wear edit/return/reload preserves selected Custom Top and painted pixels');
 }catch(e){
  console.error('ROUNDTRIP FAILED',e.message,'PAGE ERRORS',errors.slice(-8));
  await page.screenshot({path:'/tmp/mahluk-custom-wear-roundtrip-failed.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
