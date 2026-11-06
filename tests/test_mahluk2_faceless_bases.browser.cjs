'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const {PNG}=require('pngjs');
const URL='http://127.0.0.1:8099/virtual-life-asset-pipeline/site/mahluk-2/';
const DIR=['se','sw','ne','nw'];
const BODY=[
 ['head',24,27,18,29],['neck',30,53,6,8],['torso',23,58,20,19],
 ['pelvis',25,75,17,8],
 ['shoulder_l',13,57,10,5],['elbow_l',12,65,8,5],['wrist_l',11,73,7,4],
 ['shoulder_r',42,57,10,5],['elbow_r',44,65,8,5],['wrist_r',46,73,7,4],
 ['hip_l',25,81,8,10],['knee_l',25,91,7,7],['ankle_l',24,98,8,5],
 ['hip_r',35,81,8,10],['knee_r',36,91,7,7],['ankle_r',36,98,8,5]
];
function makeAtlas(part,gender){
 const png=new PNG({width:64,height:448,colorType:6});
 const spec=BODY.find(x=>x[0]===part);
 if(!spec)throw Error('Unknown '+part);
 const [,x,y,w,h]=spec,skin=gender==='male'?[217,155,114]:[240,177,142];
 for(let d=0;d<4;d++)for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++){
  const off=((d*112+row)*64+col)*4;
  png.data.set([...skin,255],off);
 }
 return PNG.sync.write(png);
}
function markerAtlas(){
 const png=new PNG({width:64,height:448,colorType:6});
 for(let d=0;d<4;d++)png.data.set([27,14,24,255],((d*112+46)*64+32)*4);
 return PNG.sync.write(png);
}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1510,height:1060},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.stack||e.message));
  const slots=[];
  for(const gender of ['male','female'])for(const bone of BODY){
   slots.push({bone:bone[0],gender,layer_type:'body',source:'body',
    src:'media/original-rig/'+gender+'-'+bone[0].replaceAll('_','-')+'.png'});
  }
  slots.push({bone:'eye_l',gender:'female',source:'face',expression:true,
   src:'media/original-rig/female-face.png'});
  slots.push({bone:'hair_back',gender:'female',source:'body',layer_type:'body',
   src:'media/original-rig/female-hair-back.png'});
  const manifest={format:'mahluk-original-source-rig-v1',directions:DIR,
   emotions:['neutral'],asset_revision:'test-bases-v1',slots};
  await page.route('**/media/original-rig/manifest.json*',r=>
   r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(manifest)}));
  await page.route(/.*\/media\/original-rig\/[a-z-]+\.png(?:\?.*)?$/,r=>{
   const name=r.request().url().split('/').at(-1).split('?')[0].replace('.png','');
   const gender=name.startsWith('female-')?'female':'male';
   const bone=name.replace(/^female-|^male-/,'').replaceAll('-','_');
   if(bone==='face')return r.fulfill({status:200,contentType:'image/png',body:markerAtlas()});
   if(bone==='hair_back')return r.fulfill({status:200,contentType:'image/png',body:markerAtlas()});
   return r.fulfill({status:200,contentType:'image/png',body:makeAtlas(bone,gender)});
  });
  await page.route('https://api.github.com/**',r=>
   r.fulfill({status:404,contentType:'application/json',body:'{"message":"no cloud in offline regression"}'}));
  await page.route('https://lafrich.github.io/virtual-life-asset-pipeline/emotion-studio/catalog.json*',
   r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    format:'mahluk-2-universal-emotions-v1',directions:DIR,cell:[64,112],entries:[]
   })}));
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:70000});
  await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('READY'),
   null,{timeout:45000});
  await page.locator('#installFacelessBoth').click();
  await page.waitForFunction(()=>{
   try{return JSON.parse(localStorage.getItem('mahluk-2-library-v1')||'[]')
    .filter(r=>r.facelessBase).length===2;}catch{return false}
  },null,{timeout:20000});
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('mahluk-2-library-v1')));
  const bases=saved.filter(x=>x.facelessBase);
  assert.equal(bases.length,2);
  const male=bases.find(r=>r.facelessBase==='male');
  const female=bases.find(r=>r.facelessBase==='female');
  for(const row of [male,female]){
   assert.ok(row&&/^mh2_[a-z0-9]+$/.test(row.id));
   assert.equal(row.format,'mahluk-2-character-v1');
   assert.equal(row.template_base,'human_'+row.facelessBase+'_base');
   assert.equal(row.bodyPlane,row.facelessBase);
   assert.equal(row.outfit,'base');
   assert.equal(row.emotionPlane.asset,'native:none');
   assert.equal(row.rigSystem,'v6b');
   const png=PNG.sync.read(Buffer.from(row.sprite.split(',')[1],'base64'));
   assert.equal(png.width,64);
   assert.equal(png.height,448);
   for(let d=0;d<4;d++){
    const idx=((d*112+62)*64+33)*4;
    assert.ok(png.data[idx+3]>0,'Torso missing '+DIR[d]+' '+row.facelessBase);
   }
  }
  await page.locator('#installFacelessBoth').click();
  const unchanged=await page.evaluate(()=>JSON.parse(localStorage.getItem('mahluk-2-library-v1')));
  assert.equal(unchanged.filter(x=>x.facelessBase).length,2,
   'Install Both should be idempotent and not overwrite any edited root');
  await page.locator('#library').selectOption(female.id);
  assert.match(await page.locator('#basePresetStatus').textContent(),/NO FACE/);
  assert.equal(await page.locator('#emotionAsset').inputValue(),'native:none');
  assert.equal(await page.locator('#bodyPlane').inputValue(),'female');
  assert.equal(await page.locator('#outfit').inputValue(),'base');
  const before=await page.locator('#previewSE').evaluate(c=>
   [...c.getContext('2d').getImageData(32,46,1,1).data]);
  assert.notDeepEqual(before,[27,14,24,255],'Faceless base rendered native face/hair art');

  // Each part is still editable using the original 64x448 4-view Pixel Editor.
  await page.locator('#tree [data-bone="torso"]').click();
  await page.locator('#openPlaneEditor').click();
  await page.locator('#pixelOverlay:not([hidden])').waitFor({timeout:12000});
  assert.equal(await page.locator('#pixelSync').isChecked(),false);
  await page.locator('#pixelGrid').uncheck();
  await page.locator('#pixelOnion').uncheck();
  await page.locator('#pixelDirection').selectOption('se');
  await page.locator('#pixelColor').fill('#fa1266');
  await page.locator('[data-pixel-tool="pencil"]').click();
  const canvas=page.locator('#pixelCanvas'),rect=await canvas.boundingBox();
  assert.ok(rect);
  const x=8,y=10;
  await page.mouse.click(rect.x+(x+.5)*rect.width/64,
   rect.y+(y+.5)*rect.height/112);
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#pixelExport').click()]);
  const atlas=PNG.sync.read(fs.readFileSync(await download.path()));
  assert.deepEqual([...atlas.data.subarray((y*64+x)*4,(y*64+x)*4+4)],[250,18,102,255]);
  await page.locator('#pixelApply').click();
  await page.waitForFunction(()=>document.getElementById('pixelOverlay').hidden);
  await page.locator('#saveChar').click();
  const edited=await page.evaluate(id=>JSON.parse(localStorage.getItem('mahluk-2-library-v1'))
   .find(x=>x.id===id),female.id);
  assert.ok(edited.pixelPlanes?.torso?.startsWith('data:image/png;base64,'));
  assert.equal(edited.facelessBase,'female');
  assert.equal(edited.emotionPlane.asset,'native:none');

  // EMOSI.EXE owns pixels; install only the emotion's reference.
  const face=markerAtlas().toString('base64');
  await page.evaluate(face=>{
   localStorage.setItem('emotion-studio-local-fallback-v1',JSON.stringify([{
    id:'emotion-face-blink',name:'FACE BLINK / V6B',base:'universal',
    frames:1,fps:6,png:'data:image/png;base64,'+face
   }]));
  },face);
  await page.locator('#inspectorEmotionTab').click();
  await page.locator('#emotionRefresh').click();
  await page.waitForFunction(()=>document.querySelector(
   '#emotionAsset option[value="db:emotion-face-blink"]'),null,{timeout:20000});
  await page.locator('#emotionAsset').selectOption('db:emotion-face-blink');
  await page.locator('#saveChar').click();
  const assigned=await page.evaluate(id=>JSON.parse(localStorage.getItem('mahluk-2-library-v1'))
   .find(x=>x.id===id),female.id);
  assert.equal(assigned.emotionPlane.asset,'db:emotion-face-blink');
  assert.equal(assigned.facelessBase,'female');
  assert.equal(assigned.template_base,'human_female_base');
  assert.ok(assigned.pixelPlanes.torso);
  if(errors.length)throw Error('Browser errors: '+errors.join('\n'));
  console.log(JSON.stringify({result:'PASS',installed:['male','female'],canonicalIds:[male.id,female.id],
   savedRootSchema:'mahluk-2-character-v1',fourDirections:true,editableTorso:true,
   noNativeFace:true,emosiAssigned:true,rootUnchanged:true}));
 }finally{await browser.close()}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
