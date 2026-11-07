'use strict';
/* Contract test: draw four garment directions once. The native Tee animation
   must inherit that color AND a non-uniform motif in every occupied pose.
   No animation-frame redraw is permitted in the test. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.goto('http://127.0.0.1:4173/virtual-life-asset-pipeline/v6p-studio.html?embedded=1',
   {waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('body.wizard-ready').waitFor({timeout:65000});
  await page.locator('#wizard-start-new').click();
  await page.locator('#workflow-source').selectOption('base:female');
  await page.locator('#wizard-next').click();
  await page.locator('#wizard-customize:not([hidden])').waitFor({timeout:65000});
  for(const kind of ['top','pants','shoes'])assert.equal(await page.locator('#'+kind+' option[value=nude]').count(),0);
  await page.locator('#wizard-part-nav [data-part=top]').click();
  await page.locator('#top').selectOption('custom');
  await page.locator('#custom-top-panel:not([hidden])').waitFor({timeout:65000});
  await page.waitForFunction(()=>{
   const id=window.V6PCharacterHost.get().id,S=window.V6PCharacterStore;
   return !!(id&&S.getPart(id,'top/custom_f')&&S.getPart(id,'top/custom_back_f'));
  },{timeout:65000});

  const result=await page.evaluate(async()=>{
   const S=window.V6PCharacterStore,P=window.V6PPixelSource,C=window.V6PPartCatalog,
    W=window.V6PCustomWear,R=window.V6PCharacterRetarget,V=window.V6PCompositor;
   const id=window.V6PCharacterHost.get().id,appearance=S.get(id).appearance;
   const rgb=(d,i)=>[d[i],d[i+1],d[i+2]].join(',');
   const green='19,207,65',pink='230,44,187';
   const sourceStats=[];
   // Only IDLE F0 is painted. All other native frames remain untouched.
   for(const dir of C.DIRS){
    const part='top/custom_f';
    const sheet=await P.loadSheetFromUrl(S.getPart(id,part));
    const idle=P.extract(sheet,'idle',dir,0),d=idle.data;
    const counts=new Map();
    let opaque=0,sx=0,sy=0;
    for(let y=0;y<112;y++)for(let x=0;x<64;x++){
     const i=(y*64+x)*4;if(d[i+3]<128)continue;
     opaque++;sx+=x;sy+=y;
     const color=rgb(d,i);counts.set(color,(counts.get(color)||0)+1);
    }
    const top=[...counts].sort((a,b)=>b[1]-a[1])[0];
    if(!top||top[1]<5)throw Error('Native '+dir+' top is too small to recolor: '+opaque);
    const nativeColor=top[0];
    for(let i=0;i<d.length;i+=4)if(d[i+3]>=128&&rgb(d,i)===nativeColor){
     d[i]=19;d[i+1]=207;d[i+2]=65;
    }
    const avgX=sx/opaque,avgY=sy/opaque;
    // A visible 3-6 pixel logo anchored to the source garment mask, not background.
    const candidates=[];
    for(let y=0;y<112;y++)for(let x=0;x<64;x++){
     const i=(y*64+x)*4;if(d[i+3]<128)continue;
     candidates.push({x,y,dist:(x-avgX)**2+(y-avgY)**2});
    }
    candidates.sort((a,b)=>a.dist-b.dist);
    const marks=candidates.slice(0,Math.min(5,candidates.length));
    for(const p of marks){
     const i=(p.y*64+p.x)*4;d[i]=230;d[i+1]=44;d[i+2]=187;
    }
    P.stamp(sheet,'idle',dir,0,idle);
    S.setPart(id,part,sheet.toDataURL('image/png'));
    sourceStats.push({dir,part,opaque,changedPalette:top[1],motifPixels:marks.length});
   }
   // Four directions must now belong to the VISIBLE garment, not the
   // 35-pixel underlayer that is occluded by the main top sheet.
   const nativeMain=await P.loadSheet('top/tee_f');
   const nativeUnder=await P.loadSheet('top/tee_back_f');
   const rearMask=['ne','nw'].map(dir=>{
    const main=P.extract(nativeMain,'idle',dir,0).data;
    const under=P.extract(nativeUnder,'idle',dir,0).data;
    return {dir,visible:[...main].filter((v,i)=>i%4===3&&v>=128).length,
      under:[...under].filter((v,i)=>i%4===3&&v>=128).length};
   });
   const generated=await R.generateCharacter(id);
   V.clearCache();
   const checks=[],countsByAction={},failures=[];
   for(const dir of C.DIRS){
    const part='top/custom_f';
    const originalPart=part.replace('/custom','/tee');
    const sheet=await P.loadSheetFromUrl(S.getPart(id,part));
    const stock=await P.loadSheet(originalPart);
    for(const action of ['idle','walk','talk','sit','sit_type','sleep','tired','swim','float','lie','perch']){
     for(let n=0;n<C.FRAMES[action];n++){
      const made=P.extract(sheet,action,dir,n).data;
      const native=P.extract(stock,action,dir,n).data;
      let sourceOpaque=0,painted=0,logo=0,alphaDiff=0;
      for(let i=0;i<made.length;i+=4){
       if(native[i+3]>=128)sourceOpaque++;
       if(native[i+3]!==made[i+3])alphaDiff++;
       if(rgb(made,i)===green&&made[i+3]>=128)painted++;
       if(rgb(made,i)===pink&&made[i+3]>=128)logo++;
      }
      if(!sourceOpaque)continue;
      const note={action,dir,frame:n,opaque:sourceOpaque,painted,logo,alphaDiff};
      checks.push(note);
      if(!countsByAction[action])countsByAction[action]={frames:0,withLogo:0};
      countsByAction[action].frames++;
      if(logo)countsByAction[action].withLogo++;
      if(!logo||alphaDiff)failures.push(note);
     }
    }
   }
   // Verify output actually composes to the character sprite used by Save.
   const full=await V.sheet({...S.get(id).appearance,characterId:id});
   let compositeLogoFrames=0;
   if(full)for(const dir of C.DIRS)for(let n=0;n<6;n++){
    const frame=V.extractFrame(full,'walk',dir,n);
    const d=frame.getContext('2d').getImageData(0,0,64,112).data;
    if(d.some((x,i)=>i%4===0&&x===230&&d[i+1]===44&&d[i+2]===187&&d[i+3]===255))
     compositeLogoFrames++;
   }
   return {sourceStats,rearMask,generated:generated.customWear,checks:checks.length,
    countsByAction,failures:failures.slice(0,15),failureCount:failures.length,compositeLogoFrames,
    fourSources:C.DIRS.every(dir=>sourceStats.some(x=>x.dir===dir&&x.motifPixels>=1))};
  });
  console.log('CUSTOM WEAR EVIDENCE',JSON.stringify(result));
  assert.equal(result.fourSources,true,'Four direction sources not painted');
  assert.ok(result.sourceStats.filter(x=>['ne','nw'].includes(x.dir)).every(x=>x.part==='top/custom_f'),
    'Rear source still points to the occluded back layer');
  assert.ok(result.rearMask.some(x=>x.visible>x.under),
    'Native rear-visible Tee should be drawn on the main sheet, not only the underlayer');
  assert.ok(result.generated?.frames>20,'No native animation frames inherited garment artwork');
  assert.equal(result.failureCount,0,'Motif must inherit all native occupied frames without changing alpha');
  assert.ok(result.compositeLogoFrames>=4,'The playable composed Walk must display the garment logo');
  await page.locator('#wizard-next').click();
  await page.locator('#wizard-preview:not([hidden])').waitFor({timeout:65000});
  await page.locator('#qa-animation').selectOption('walk');
  await page.locator('#wizard-next').click();
  await page.locator('#wizard-save:not([hidden])').waitFor({timeout:65000});
  await page.locator('#char-name').fill('Four-Direction Native Wear Test');
  await page.locator('#wizard-next').click();
  await page.locator('#wizard-save-success.visible').waitFor({timeout:65000});
  assert.deepEqual(errors,[]);
  console.log('PASS Custom Wear: four directions propagate color + motif to native V6B animations and Save');
 }catch(err){
  console.error('Custom Wear browser errors',errors.slice(-12));
  console.error('Status',await page.locator('#status').textContent().catch(()=>'<missing>'));
  console.error('Generation',await page.locator('#generate-result').textContent().catch(()=>'<missing>'));
  await page.screenshot({path:'/tmp/custom-wear-native-failed.png',fullPage:true}).catch(()=>{});
  throw err;
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
