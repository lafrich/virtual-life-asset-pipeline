'use strict';
const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const URL='http://127.0.0.1:8099/virtual-life-asset-pipeline/site/mahluk-2/';
const DIR=['se','sw','ne','nw'];
const COLORS=['#f11a22','#0cce66','#346afb','#d4a31c'];
const PARTS=['hair_back','torso','head','hair_cap','fringe_l','fringe_mid','fringe_r','phone'];
const sourceRects={
 torso:[22,45,20,51],hair_back:[18,23,30,17],head:[22,28,23,29],
 hair_cap:[19,17,29,10],fringe_l:[20,25,7,5],
 fringe_mid:[29,24,7,8],fringe_r:[39,24,7,6],phone:[2,45,14,6]
};
function pngRect(part){
 const png=new PNG({width:64,height:448,colorType:6});
 const [x0,y0,w,h]=sourceRects[part];
 const rgb={
 torso:[72,112,130],hair_back:[55,48,66],head:[242,178,140],
 hair_cap:[81,49,63],fringe_l:[75,50,82],
 fringe_mid:[99,40,62],fringe_r:[101,58,70],phone:[255,7,7]
 }[part];
 for(let d=0;d<4;d++)for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){
  const at=((d*112+y)*64+x)*4;
  png.data[at]=rgb[0];png.data[at+1]=rgb[1];
  png.data[at+2]=rgb[2];png.data[at+3]=255;
 }
 return PNG.sync.write(png);
}
function pix(png,dir,x,y){
 const at=((dir*112+y)*png.width+x)*4;
 return [...png.data.subarray(at,at+4)];
}
function hex(h){return [...h.slice(1).match(/../g).map(n=>parseInt(n,16)),255];}
async function main(){
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1480,height:1000},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.stack||e.message));
  const manifest={format:'mahluk-original-source-rig-v1',emotions:['neutral'],
   slots:PARTS.map(bone=>({bone,src:'media/original-rig/'+bone.replaceAll('_','-')+'.png',source:'body'}))};
  await page.route('**/media/original-rig/manifest.json*',route=>
   route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(manifest)}));
  await page.route(/.*\/media\/original-rig\/([a-z-]+)\.png$/,route=>{
   const part=route.request().url().match(/\/([a-z-]+)\.png$/)?.[1]?.replaceAll('-','_');
   if(!PARTS.includes(part))return route.fulfill({status:404,body:'missing'});
   return route.fulfill({status:200,contentType:'image/png',body:pngRect(part)});
  });
  await page.route('https://api.github.com/**',route=>
   route.fulfill({status:404,contentType:'application/json',body:'{"message":"offline smoke"}'}));
  const cat={format:'mahluk-2-universal-emotions-v1',cell:[64,112],directions:DIR,entries:[]};
  await page.route('https://lafrich.github.io/virtual-life-asset-pipeline/emotion-studio/catalog.json*',
   route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(cat)}));
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#tree [data-bone="head"]')&&
   document.getElementById('status')?.textContent.includes('READY'),null,{timeout:35000});
  for(const omitted of ['hair_back','hair_cap','fringe_l','fringe_mid','fringe_r','phone']){
   assert.equal(await page.locator('#tree [data-bone="'+omitted+'"]').count(),0,
    'Legacy slice must be absent from Object Manager: '+omitted);
   assert.equal(await page.locator('#layerOrder [data-bone="'+omitted+'"]').count(),0,
    'Legacy slice must be absent from draw order: '+omitted);
  }
  const headCount=await page.locator('#tree [data-bone="head"]').count();
  assert.equal(headCount,1,'Full HEAD must be a single editable hierarchy item');
  // hair_back appears before torso in the source painter order. The merged
  // HEAD must still render at HEAD depth, not disappear behind the torso.
  const frontFace=await page.locator('#game').evaluate(c=>
   [...c.getContext('2d').getImageData(30,45,1,1).data]);
  assert.deepEqual(frontFace,[242,178,140,255],
   'Full HEAD is incorrectly painted behind the torso');
  await page.locator('#tree [data-bone="head"]').click();
  await page.locator('#openPlaneEditor').click();
  await page.locator('#pixelOverlay:not([hidden])').waitFor();
  assert.equal(await page.locator('#pixelSync').isChecked(),false,'Sync Brush must start OFF');
  assert.equal(await page.locator('#pixelReferenceView').inputValue(),'off');
  await page.locator('#pixelGrid').uncheck();
  await page.locator('#pixelOnion').uncheck();
  async function exportAtlas(){
   const [file]=await Promise.all([
    page.waitForEvent('download',{timeout:12000}),
    page.locator('#pixelExport').click()
   ]);
   return PNG.sync.read(fs.readFileSync(await file.path()));
  }
  const initial=await exportAtlas();
  assert.equal(initial.width,64);assert.equal(initial.height,448);
  for(let dir=0;dir<4;dir++){
   assert.equal(pix(initial,dir,26,18)[3],255,'Unified HEAD lost hair-cap pixels');
   assert.equal(pix(initial,dir,24,28)[3],255,'Unified HEAD lost face or fringe pixels');
  }
  assert.equal(pix(initial,0,5,47)[3],0,'Held prop leaked into full-head plane');
  const canvas=page.locator('#pixelCanvas');
  await canvas.scrollIntoViewIfNeeded();
  await page.locator('[data-pixel-tool="pencil"]').click();
  async function drawAt(x,y,color){
   await page.locator('#pixelColor').fill(color);
   await canvas.scrollIntoViewIfNeeded();
   const box=await canvas.boundingBox();
   assert.ok(box,'Pixel editor canvas is missing');
   await page.mouse.click(box.x+(x+.5)*box.width/64,
    box.y+(y+.5)*box.height/112);
  }
  const coords=[[7,9],[10,12],[13,15],[16,18]];
  for(let d=0;d<DIR.length;d++){
   await page.locator('#pixelDirection').selectOption(DIR[d]);
   assert.equal(await page.locator('#pixelSync').isChecked(),false,'View switch auto-enabled sync');
   await drawAt(coords[d][0],coords[d][1],COLORS[d]);
   const png=await exportAtlas();
   for(let earlier=0;earlier<=d;earlier++){
    assert.deepEqual(pix(png,earlier,...coords[earlier]),hex(COLORS[earlier]),
     'Drawing '+DIR[d]+' erased earlier view '+DIR[earlier]);
   }
   for(let later=d+1;later<4;later++)
    assert.equal(pix(png,later,...coords[later])[3],0,
     'Drawing '+DIR[d]+' changed future view '+DIR[later]);
  }

  // Real clipboard regression: Select pixels in SE, Copy, switch SW, Paste.
  await page.locator('#pixelDirection').selectOption('se');
  await page.locator('[data-pixel-tool="pencil"]').click();
  await drawAt(4,9,'#e91be3');
  await page.locator('[data-pixel-tool="select"]').click();
  async function pixelDrag(x1,y1,x2,y2){
   await canvas.scrollIntoViewIfNeeded();
   const b=await canvas.boundingBox();
   const xx=x=>b.x+(x+.5)*b.width/64;
   const yy=y=>b.y+(y+.5)*b.height/112;
   await page.mouse.move(xx(x1),yy(y1));await page.mouse.down();
   await page.mouse.move(xx(x2),yy(y2),{steps:4});await page.mouse.up();
  }
  await pixelDrag(4,9,6,11);
  await page.locator('#pixelCopySelection').click();
  assert.equal(await page.locator('#pixelPasteSelection').isDisabled(),false,
   'Copy did not activate the Paste button');
  assert.match(await page.locator('#pixelClipboardInfo').textContent(),/READY/);
  await page.locator('#pixelDirection').selectOption('sw');
  assert.equal(await page.locator('#pixelPasteSelection').isDisabled(),false,
   'Paste disabled after changing source direction');
  // A destination pixel already exists underneath the incoming paste.
  await page.locator('[data-pixel-tool="pencil"]').click();
  await drawAt(4,9,'#126cf0');
  await page.locator('#pixelPasteSelection').click();
  let copiedAtlas=await exportAtlas();
  assert.deepEqual(pix(copiedAtlas,1,4,9),hex('#e91be3'),
   'Real Paste click did not copy colored pixel into SW');
  // Drag the pasted color elsewhere. The underlying blue pixel MUST return.
  await pixelDrag(4,9,14,14);
  copiedAtlas=await exportAtlas();
  assert.deepEqual(pix(copiedAtlas,1,4,9),hex('#126cf0'),
   'Moving pasted pixels erased existing art underneath them');
  assert.deepEqual(pix(copiedAtlas,1,14,14),hex('#e91be3'),
   'Dragged paste does not appear at its new location');
  assert.deepEqual(pix(copiedAtlas,0,4,9),hex('#e91be3'),
   'Real Paste changed original SE unexpectedly');
  assert.equal(pix(copiedAtlas,2,4,9)[3],0,
   'Real Paste leaked into NE');
  await page.locator('#pixelDirection').selectOption('nw');
  await page.locator('#pixelPasteMirrored').click();
  copiedAtlas=await exportAtlas();
  assert.deepEqual(pix(copiedAtlas,3,59,9),hex('#e91be3'),
   'Paste Flip failed to mirror source pixel on NW');
  // Clipboard should remain available after closing and reopening the editor.
  await page.locator('#pixelApply').click();
  await page.waitForFunction(()=>document.getElementById('pixelOverlay').hidden);
  await page.locator('#openPlaneEditor').click();
  await page.locator('#pixelOverlay:not([hidden])').waitFor();
  assert.equal(await page.locator('#pixelPasteSelection').isDisabled(),false,
   'Paste clipboard became unavailable after reopening HEAD');
  await page.locator('#pixelDirection').selectOption('ne');
  await page.locator('#pixelPasteSelection').click();
  copiedAtlas=await exportAtlas();
  assert.deepEqual(pix(copiedAtlas,2,4,9),hex('#e91be3'),
   'Cross-session Paste failed for NE');
  await page.locator('#pixelApply').click();
  await page.waitForFunction(()=>document.getElementById('pixelOverlay').hidden,null,{timeout:15000});
  // Immediate Save Root must use the live canvas, not stale async PNG decode.
  await page.locator('#saveChar').click();
  const immediatelySaved=await page.evaluate(()=>
   JSON.parse(localStorage.getItem('mahluk-2-library-v1'))?.at(-1));
  assert.ok(immediatelySaved?.sprite?.startsWith('data:image/png;base64,'),
   'Save Root failed immediately after four-view Apply');
  const baked=PNG.sync.read(Buffer.from(immediatelySaved.sprite.split(',')[1],'base64'));
  for(let d=0;d<4;d++)
   assert.deepEqual(pix(baked,d,...coords[d]),hex(COLORS[d]),
    'Immediate Save Root baked an outdated pixel plane in '+DIR[d]);
  // Immediately reopen before asynchronous Image.onload cache completion.
  await page.locator('#openPlaneEditor').click();
  await page.locator('#pixelOverlay:not([hidden])').waitFor({timeout:15000});
  const reopened=await exportAtlas();
  for(let d=0;d<4;d++)
   assert.deepEqual(pix(reopened,d,...coords[d]),hex(COLORS[d]),
    'Reopen used stale native sprite and lost painted view '+DIR[d]);
  await page.locator('#pixelApply').click();
  await page.waitForFunction(()=>document.getElementById('pixelOverlay').hidden);
  await page.locator('#saveChar').click();
  await page.waitForFunction(()=>{
   try{return (JSON.parse(localStorage.getItem('mahluk-2-library-v1'))||[]).length>0}
   catch{return false}
  },null,{timeout:20000});
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('mahluk-2-library-v1')).at(-1));
  assert.equal(saved.headMerged,true,'Published root must flag full-head sprite');
  const publishedHead=PNG.sync.read(Buffer.from(saved.pixelPlanes.head.split(',')[1],'base64'));
  for(let d=0;d<4;d++)
   assert.deepEqual(pix(publishedHead,d,...coords[d]),hex(COLORS[d]));
  // Test the critical bug: master default must NEVER replace this character.
  const defaultPNG=new PNG({width:64,height:448,colorType:6});
  for(let d=0;d<4;d++){
   const at=((d*112+coords[d][1])*64+coords[d][0])*4;
   defaultPNG.data.set([255,255,0,255],at);
  }
  await page.evaluate(data=>{
   const R=window.VLModularRigV2,G=window.MH2RigRules;
   G.save(localStorage,R,G.defaults(R),R.referencePose().parts,
    {head:'data:image/png;base64,'+data},true);
  },PNG.sync.write(defaultPNG).toString('base64'));
  await page.locator('#newChar').click();
  await page.locator('#library').selectOption(saved.id);
  await page.locator('#tree [data-bone="head"]').click();
  await page.locator('#openPlaneEditor').click();
  await page.locator('#pixelOverlay:not([hidden])').waitFor();
  const restored=await exportAtlas();
  for(let d=0;d<4;d++)
   assert.deepEqual(pix(restored,d,...coords[d]),hex(COLORS[d]),
    'MASTER OVERRIDED saved character '+DIR[d]+' pixels');
  assert.equal(await page.locator('#pixelReferenceView').inputValue(),'off');
  assert.equal(await page.locator('#pixelSync').isChecked(),false);
  if(errors.length)throw Error('Browser runtime errors: '+errors.join('\n'));
  console.log(JSON.stringify({result:'PASS',allDirectionsPreserved:true,
   reopenedUnchanged:true,characterSaved:true,masterCannotOverwrite:true,
   unifiedHead:true,fringeHidden:true,heldPropRemoved:true}));
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1});
