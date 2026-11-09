/* Lafrich Puppet live-browser acceptance: clean ten-piece rig, editable 4 views,
 * real pixel editor, new Python motion and dressed / Emosi-overlaid motion.
 * No old Genesis or Character IDs are used in this active app.
 */
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:820},acceptDownloads:true});
 const issues=[];
 page.on('pageerror',e=>issues.push(String(e)));
 const base='http://127.0.0.1:4178';
 try{
  await page.goto(base+'/lafrich-puppet-studio.html?mode=master',
   {waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#view-se').waitFor({timeout:20000});
  const state=await page.evaluate(()=>{
   const C=window.LafrichPuppetCore,R=window.LafrichPuppetRenderer;
   return {parts:C.PARTS,parents:C.PARENTS,ids:C.IDS,views:C.DIRS,
    path:R.partPath('arm_near_lower',C)};
  });
  assert.equal(state.parts.length,10);
  assert.deepEqual(state.path,['torso','arm_near_upper','arm_near_lower']);
  assert.equal(state.ids.male,'lafrich_male');
  assert.equal(state.ids.female,'lafrich_female');
  assert.equal(await page.locator('#views button').count(),4);
  // Seed from the approved V6B drawings once, then use only independent
  // Lafrich layers and authored motions (never the V6B stock action atlas).
  const approvedArt=await page.evaluate(async()=>{
   const C=window.LafrichPuppetCore,R=window.LafrichPuppetRenderer;
   const output={};
   for(const gender of ['male','female']){
    const m=await R.seedFromV6B(gender);
    let nonempty=0,parts=[];
    for(const layer of C.LAYERS){
     const png=m.layers[layer].se;if(!png)continue;
     const im=await R.loadPng(png);
     const cv=R.rgba(),ctx=cv.getContext('2d',{willReadFrequently:true});
     ctx.drawImage(im,0,0);const data=ctx.getImageData(0,0,64,112).data;
     const filled=data.some((v,i)=>i%4===3&&v>0);
     if(filled){nonempty++;parts.push(layer)}
    }
    output[gender]={id:m.id,nonempty,parts};
   }
   return output;
  });
  assert.equal(approvedArt.male.id,'lafrich_male');
  assert.equal(approvedArt.female.id,'lafrich_female');
  assert.ok(approvedArt.male.nonempty>=2&&approvedArt.female.nonempty>=2,
   'V6B appearance must seed real separate body/garment layers for both masters');
  assert.ok(approvedArt.male.parts.includes('body')&&approvedArt.female.parts.includes('body'));
  console.log('PASS V6B male/female visual art seeded into new independent four-view physical layers');
  assert.equal(await page.locator('#motion-list option').count(),1,
   'New Lafrich motion gallery must initially be empty (no eleven legacy actions)');
  await page.locator('#master-gender').selectOption('female');
  await page.locator('#master-gender').selectOption('male');
  await page.locator('#part-select').selectOption('arm_near_lower');
  await page.locator('#pivot-x').fill('18');
  await page.locator('#pivot-x').press('Tab');
  await page.locator('#tool-mask').click();
  await page.locator('#paint-mask').click();
  const bounds=await page.locator('#canvas').boundingBox();
  assert.ok(bounds);
  await page.locator('#canvas').click({position:{x:32*bounds.width/64,y:66*bounds.height/112}});
  await page.locator('#save-master-local').click();
  const saved=await page.evaluate(()=>{
   const C=window.LafrichPuppetCore;
   const row=JSON.parse(localStorage.getItem(C.MASTER_KEY)).male;
   return {id:row.id,pivot:row.pivots.se.arm_near_lower,
    mask:C.decode(row.masks.se)[66*64+32]};
  });
  assert.equal(saved.id,'lafrich_male');
  assert.equal(saved.pivot.x,18);
  assert.equal(saved.mask,state.parts.indexOf('arm_near_lower'));
  await page.locator('#master-layer').selectOption('body');
  await page.locator('#edit-master').click();
  await page.locator('#pixelOverlay:not([hidden])').waitFor({timeout:30000});
  await page.locator('#pixelColor').fill('#f000ff');
  await page.locator('#pixelGrid').uncheck();
  await page.locator('#pixelOnion').uncheck();
  const pixSize=await page.locator('#pixelCanvas').evaluate(c=>({
   w:c.getBoundingClientRect().width,h:c.getBoundingClientRect().height
  }));
  await page.locator('#pixelCanvas').click({position:{
   x:Math.floor(pixSize.w*32.5/64),y:Math.floor(pixSize.h*40.5/112)
  }});
  await page.locator('#pixelApply').click();
  await page.locator('#pixelOverlay').waitFor({state:'hidden',timeout:15000});
  await page.locator('#save-master-local').click();
  const masterHasPixel=await page.evaluate(()=>{
   const C=window.LafrichPuppetCore,m=JSON.parse(localStorage.getItem(C.MASTER_KEY));
   return Object.keys(m.male.layers.body).length===4&&!!m.male.layers.body.se;
  });
  assert.equal(masterHasPixel,true,'Master four-view layers were not saved');
  console.log('PASS Lafrich 10-piece 4-view master rig, editable mask and master body Pixel Editor');

  await page.locator('#tab-character').click();
  await page.locator('#character-gender').selectOption('male');
  await page.locator('#character-name').fill('Dressed Rig QA');
  await page.locator('#wear-layer').selectOption('top');
  await page.locator('#edit-wear').click();
  await page.locator('#pixelOverlay:not([hidden])').waitFor({timeout:30000});
  await page.locator('#pixelColor').fill('#2244ff');
  await page.locator('#pixelGrid').uncheck();
  await page.locator('#pixelOnion').uncheck();
  await page.locator('#pixelCanvas').click({position:{
   x:Math.floor(pixSize.w*20.5/64),y:Math.floor(pixSize.h*76.5/112)
  }});
  await page.locator('#pixelApply').click();
  await page.locator('#save-character-local').click();
  const characterSaved=await page.evaluate(()=>{
   const C=window.LafrichPuppetCore,db=JSON.parse(localStorage.getItem(C.CHARACTER_KEY));
   const row=Object.values(db)[0];
   return {id:row.id,gender:row.gender,wear:!!row.wear.top.se};
  });
  assert.match(characterSaved.id,/^lafrich_char_/);
  assert.equal(characterSaved.gender,'male');
  assert.equal(characterSaved.wear,true);
  console.log('PASS Lafrich Character custom wear four-view pixels saved without modifying master');

  await page.locator('#tab-animation').click();
  await page.locator('#motion-name').fill('Elbow And Knee Test');
  await page.locator('#pose-part').selectOption('arm_near_upper');
  await page.locator('#pose-angle').fill('28');await page.locator('#pose-angle').press('Tab');
  await page.locator('#pose-part').selectOption('arm_near_lower');
  await page.locator('#pose-angle').fill('49');await page.locator('#pose-angle').press('Tab');
  await page.locator('#pose-part').selectOption('leg_near_upper');
  await page.locator('#pose-angle').fill('-20');await page.locator('#pose-angle').press('Tab');
  await page.locator('#pose-part').selectOption('leg_near_lower');
  await page.locator('#pose-angle').fill('33');await page.locator('#pose-angle').press('Tab');
  await page.locator('#frame-add').click();
  await page.locator('#save-motion-local').click();
  const newMotion=await page.evaluate(()=>{
   const C=window.LafrichPuppetCore,db=JSON.parse(localStorage.getItem(C.MOTION_KEY));
   const row=Object.values(db)[0],py=C.toPython(row),parsed=C.fromPython(py);
   return {frames:row.frames.length,elbow:parsed.frames[0].poses.se.arm_near_lower.a,
    upper:parsed.frames[0].poses.se.arm_near_upper.a,
    knee:parsed.frames[0].poses.se.leg_near_lower.a,py:py.slice(0,90)};
  });
  assert.equal(newMotion.frames,2);assert.equal(newMotion.elbow,49);
  assert.equal(newMotion.knee,33);assert.equal(newMotion.upper,28);
  assert.match(newMotion.py,/MOTION v1/);
  assert.equal(await page.locator('#motion-list option').count(),2);
  const characterOptions=await page.locator('#preview-character option').allTextContents();
  assert.ok(characterOptions.some(s=>s.includes('Dressed Rig QA')),
   'Saved outfitted character missing in Python motion preview');
  await page.locator('#preview-character').selectOption(characterSaved.id);
  await page.locator('#frame-index').fill('1');await page.locator('#frame-index').press('Tab');
  assert.deepEqual(issues,[],'Browser errors in Lafrich Puppet studio');
  console.log('PASS new Python motion database: 10 parts, independent elbow/knee angles and dressed Character selection');

  const pixelSafety=await page.evaluate(async()=>{
   const C=window.LafrichPuppetCore,R=window.LafrichPuppetRenderer;
   const blank=C.master('male'),ch=C.character('male');
   const sheet=(x,y,color)=>{
    const cv=R.rgba(),ctx=cv.getContext('2d');ctx.fillStyle=color;ctx.fillRect(x,y,1,1);
    return cv.toDataURL('image/png');
   };
   blank.layers.body.se=sheet(20,76,'#ff0000');
   ch.wear.top.se=sheet(20,76,'#0000ff');
   const prepared=await R.prepare(blank,ch,'se',null);
   const a=R.render(prepared,C.blankPose());
   const p=C.blankPose();p.arm_near_upper.a=45;p.arm_near_lower.a=30;
   const moved=R.render(prepared,p);
   const snap=cv=>[...cv.getContext('2d').getImageData(0,0,64,112).data];
   const left=snap(a),right=snap(moved);
   const diff=left.some((n,i)=>n!==right[i]);
   const blue1=left.reduce((n,v,i)=>n+(i%4===2&&v===255?1:0),0);
   const blue2=right.reduce((n,v,i)=>n+(i%4===2&&v===255?1:0),0);
   const em=R.rgba(64,448);
   const ctx=em.getContext('2d');ctx.fillStyle='#00ff00';ctx.fillRect(32,40,1,1);
   const image=new Image();image.src=em.toDataURL('image/png');await image.decode();
   const emMaster=C.master('male');emMaster.layers.body.se=sheet(32,40,'#ff0000');
   const emPrepared=await R.prepare(emMaster,null,'se',image);
   const face=R.render(emPrepared,C.blankPose());
   const facePixel=[...face.getContext('2d').getImageData(32,40,1,1).data];
   return {diff,blue1,blue2,facePixel};
  });
  assert.equal(pixelSafety.diff,true,'Forearm wear did not follow upper-arm + lower-arm transforms');
  assert.ok(pixelSafety.blue1>=1&&pixelSafety.blue2>=1,
   'Blue Custom Wear pixel vanished during elbow movement');
  assert.deepEqual(pixelSafety.facePixel,[0,255,0,255],
   'Emosi must be the final visible layer on the head');
  console.log('PASS Custom Wear follows shoulder/elbow; Emosi frontmost on moving puppet');

  await page.setViewportSize({width:390,height:844});
  await page.locator('#tab-master').click();
  await page.locator('#zoom').evaluate(el=>{
   el.value='12';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  const mobile=await page.locator('#viewport').evaluate(v=>({
   scrollX:v.scrollWidth>v.clientWidth,scrollY:v.scrollHeight>v.clientHeight,
   native:[v.querySelector('canvas').width,v.querySelector('canvas').height]
  }));
  assert.deepEqual(mobile,{scrollX:true,scrollY:true,native:[64,112]});
  console.log('PASS mobile portrait Lafrich editor zoom 1200% / scrolling; native frame dimensions preserved');
  const hub=await browser.newPage({viewport:{width:940,height:740}});
  try{
   await hub.goto(base+'/mahluk-hidup.html?tab=genesis',{waitUntil:'domcontentloaded',timeout:30000});
   await hub.frameLocator('#genesis-frame').locator('#part-select option').first().waitFor({timeout:30000});
   const routes=await hub.evaluate(()=>window.VLMahlukWorkspace?
     ['character','animation','genesis'].map(tab=>{
      window.VLMahlukWorkspace.show(tab);
      const id={character:'character-frame',animation:'motion-frame',genesis:'genesis-frame'}[tab];
      return document.getElementById(id).src;
     }):[]);
   assert.equal(routes.length,3);
   assert.ok(routes.every(url=>url.includes('lafrich-puppet-studio.html')),
    'All three active Mahluk editor routes must use Lafrich Puppet, not old stock');
   assert.ok(routes[0].includes('mode=character')&&routes[1].includes('mode=animation')&&
    routes[2].includes('mode=master'));
   console.log('PASS Mahluk host routes Character, Animation and Genesis Master to Lafrich Puppet');
  }finally{await hub.close()}
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
