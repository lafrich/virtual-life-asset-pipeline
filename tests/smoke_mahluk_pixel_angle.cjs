'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
async function main(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const root='http://127.0.0.1:4173/virtual-life-asset-pipeline';
 try{
  await page.goto(root+'/pixel-editor.html?source=v6p&part=base/body&action=idle&dir=sw',
   {waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#pixelOverlay:not([hidden])').waitFor({timeout:65000});
  await page.locator('#pixelDirection').selectOption('sw');
  assert.equal(await page.locator('#direction').inputValue(),'sw','main editor did not select SW');
  const canvas=page.locator('#pixelCanvas');
  async function sample(x=5,y=5){
   return page.evaluate(({x,y})=>{
    const c=document.querySelector('#pixelCanvas'),ctx=c.getContext('2d');
    const px=Math.floor((x+.5)*c.width/64),py=Math.floor((y+.5)*c.height/112);
    return [...ctx.getImageData(px,py,1,1).data];
   },{x,y});
  }
  const initialSW=await sample();
  await page.locator('#pixelDirection').selectOption('se');
  assert.equal(await page.locator('#direction').inputValue(),'se','main editor did not load SE');
  const initialSE=await sample();
  const seScreen=await canvas.evaluate(c=>c.toDataURL('image/png'));
  await page.locator('#pixelDirection').selectOption('sw');
  assert.equal(await page.locator('#direction').inputValue(),'sw');
  assert.deepEqual(await sample(),initialSW,'Returning to SW did not restore the original SW view');
  const color=page.locator('#pixelColor');
  await color.fill('#f000e0');
  const rect=await canvas.boundingBox();assert.ok(rect);
  await canvas.click({position:{x:Math.round((5.5)*rect.width/64),y:Math.round((5.5)*rect.height/112)}});
  const paintedSW=await sample();
  assert.notDeepEqual(paintedSW,initialSW,'Painting the left/front sprite did not update its visible pixel');
  await page.locator('#pixelDirection').selectOption('se');
  assert.equal(await page.locator('#direction').inputValue(),'se','SE selection and underlying editor out of sync');
  const newSE=await sample();
  assert.deepEqual(newSE,initialSE,'SW paint leaked into SE sprite view');
  const newScreen=await canvas.evaluate(c=>c.toDataURL('image/png'));
  assert.equal(newScreen,seScreen,'SE visual sprite did not reload exactly when switching back from edited SW');
  await page.locator('#pixelDirection').selectOption('sw');
  assert.deepEqual(await sample(),paintedSW,'SW pixel edit did not survive switching back from SE');
  await page.evaluate(()=>window.VirtualLifePixelEditor.flush());
  assert.match(await page.locator('#editor-status').textContent(),/ANGLE|SPRITE|EDITING|DRAFT/i);
  assert.equal(errors.length,0,'Page runtime errors: '+errors.join(' | '));
  console.log('[ok] SW -> SE -> SW native sprite views independent');
  console.log('[ok] SW edit survives; SE native pixels untouched');
  console.log('[ok] Overlay selector and source editor direction synced');
  console.log('PASS pixel-art four-angle sprite switch');
 }catch(error){
  console.error('ERRORS',errors);
  console.error('STATUS',await page.locator('#editor-status').textContent().catch(()=>'<missing>'));
  console.error('SELECT',await page.locator('#pixelDirection').inputValue().catch(()=>'<missing>'));
  console.error('SOURCE',await page.locator('#source-state').textContent().catch(()=>'<missing>'));
  await page.screenshot({path:'/tmp/pixel-angle-failed.png',fullPage:true}).catch(()=>{});
  throw error;
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
