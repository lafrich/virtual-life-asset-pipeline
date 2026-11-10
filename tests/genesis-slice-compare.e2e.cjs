'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.LGR_SLICE_TEST_URL||'http://127.0.0.1:8091/virtual-life-asset-pipeline/genesis-slice-compare.html';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:960}});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e.stack||e)));
 try{
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Loaded.')||
    document.getElementById('status').textContent.startsWith('Tidak bisa'),null,{timeout:90000});
  const status=await page.locator('#status').textContent();
  assert.match(status,/Loaded\./,'Candidate must actually load into the native LGR renderer');
  const options=await page.locator('#motion option').evaluateAll(opts=>opts.map(o=>o.value));
  assert.ok(options.includes('walk'),'Official LGR motion library must remain loaded');
  const proof=[];
  for(const dir of ['se','sw','ne','nw']){
   await page.locator('[data-dir="'+dir+'"]').click();
   await page.waitForFunction(d=>{
    const b=document.querySelector('[data-dir="'+d+'"]');
    const m=document.getElementById('maskdiff').textContent,
          p=document.getElementById('pivotdiff').textContent,
          diff=document.getElementById('pixeldiff').textContent;
    return b.getAttribute('aria-pressed')==='true'&&m!=='—'&&p!=='—'&&diff!=='—';
   },dir,{timeout:25000});
   const state=await page.evaluate(()=>{
    const a=document.getElementById('before'),b=document.getElementById('after');
    const visible=cv=>{const p=cv.getContext('2d').getImageData(0,0,64,112).data;let n=0;
     for(let i=3;i<p.length;i+=4)if(p[i])n++;return n};
    return {official:visible(a),trial:visible(b),
     maskDiff:Number(document.getElementById('maskdiff').textContent.replace(/[.,]/g,'')),
     pivotDiff:Number(document.getElementById('pivotdiff').textContent),
     frameDiff:Number(document.getElementById('pixeldiff').textContent.replace(/[.,]/g,''))};
   });
   assert.ok(state.official>100&&state.trial>100,'Real LGR frame missing '+dir+': '+JSON.stringify(state));
   assert.ok(state.maskDiff>0&&state.pivotDiff>0,'New slices not active '+dir);
   proof.push({dir,...state});
  }
  await page.locator('#mask').click();
  assert.equal(await page.locator('#mask').getAttribute('aria-pressed'),'true');
  await page.locator('#play').click();
  fs.mkdirSync('screenshots',{recursive:true});
  await page.screenshot({path:'screenshots/genesis-slice-before-after.png',fullPage:true});
  assert.equal(errors.length,0,'Page errors: '+errors.join(' | ').slice(0,700));
  console.log('GENESIS_LGR_SLICE_COMPARE_PASS',JSON.stringify(proof));
 }finally{await browser.close()}
})().catch(e=>{console.error('GENESIS_LGR_SLICE_COMPARE_FAIL',e.stack||e);process.exit(1)});
