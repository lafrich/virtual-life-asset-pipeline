'use strict';
/* Chromium smoke: Punch must actually be visible/playable in both unchanged
   Animation and Character QA screens. Legacy five-band clips must be absent. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root='http://127.0.0.1:4173/virtual-life-asset-pipeline';
const retired=['pushup','yoga_sphinx_idle','yoga_puppy_idle','hip_shake','yoga_happy_baby_idle'];
const alpha=canvas=>{const d=canvas.getContext('2d').getImageData(0,0,64,112).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>8)n++;return n};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(root+'/mahluk-animation-studio.html?embedded=1',{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#animations button[data-clip="clp_standing_punch"]').waitFor({timeout:45000});
  const available=await page.evaluate(()=>window.V6PClipStore.list().map(c=>c.id));
  for(const id of retired)assert.ok(!available.includes('clip_'+id),'Retired stock returned: '+id);
  assert.ok(available.includes('clp_standing_punch'));
  assert.equal(await page.locator('#animations h3.animation-category').filter({hasText:'PUNCH'}).count(),1);
  await page.locator('#animations button[data-clip="clp_standing_punch"]').click();
  await page.locator('#animation-workspace:not([hidden])').waitFor({timeout:45000});
  await page.waitForFunction(()=>document.getElementById('status')?.textContent.startsWith('LOADED'),null,{timeout:45000});
  assert.equal(await page.locator('#frame-strip button').count(),5);
  for(const dir of ['se','sw','ne','nw']){
   await page.locator('#view').selectOption(dir);
   for(let frame=0;frame<5;frame++){
    await page.locator('#frame-strip button').nth(frame).click();
    const count=await page.locator('#gif-preview').evaluate(alpha);
    assert.ok(count>20,'Punch invisible: '+dir+' frame '+frame);
   }
  }
  console.log('[ok] Punch appears in Animation gallery with 5×4 nonempty actual frames');

  // No extra preview UI: the Character Wizard already owns qa-animation/all-views.
  await page.goto(root+'/v6p-studio.html',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>window.V6PCharacterHost&&window.__v6pStudio?.ready,null,{timeout:45000});
  await page.locator('#qa-animation option[value="motion:clp_standing_punch"]').waitFor({state:'attached',timeout:30000});
  await page.evaluate(async()=>{await window.V6PCharacterHost.useBase('male');
   await window.V6PCharacterHost.qa('motion:clp_standing_punch',2)});
  for(const dir of ['se','sw','ne','nw']){
   const count=await page.locator('[data-qa-dir="'+dir+'"]').evaluate(alpha);
   assert.ok(count>20,'Character QA Punch invisible: '+dir);
  }
  console.log('[ok] Existing Character Preview QA renders Punch in all four directions');

  // Pixel-level QA on the actual Genesis Idle F0 physical-layer cutouts.
  // Isolate the attacking arm for each direction to detect an invisible,
  // motionless or severely clipped punch, not merely a nonblank body.
  const problems=[];
  for(const gender of ['male','female']){
   const armMetrics=await page.evaluate(async gender=>{
    const Host=window.V6PCharacterHost,M=window.V6PUniversalMotion,
     Store=window.V6PClipStore,Gen=window.V6PGenesisBase;
    await Host.useBase(gender);
    const ch=Host.get().ch,pack=Store.get('clp_standing_punch');
    const rig=await M.prepare(ch,'idle',{
     partOverrides:Gen.get(gender).parts,sourceKey:'pixel-qa-'+gender
    });
    const measured={};
    for(const dir of ['se','sw','ne','nw']){
     const arm=dir==='se'||dir==='ne'?'arm_r':'arm_l';
     const source=rig.directions[dir];
     const isolated={...rig,directions:{
      ...rig.directions,
      [dir]:{...source,shadow:null,fx:null,
       entries:source.entries.map(entry=>({
        ...entry,parts:{[arm]:entry.parts[arm]}
       }))
      }
     }};
     function stats(canvas){
      const bytes=canvas.getContext('2d').getImageData(0,0,64,112).data;
      let count=0,x=0,y=0,minX=64,maxX=-1,minY=112,maxY=-1;
      for(let row=0;row<112;row++)for(let col=0;col<64;col++){
       const a=bytes[(row*64+col)*4+3]/255;
       if(a>.2){count+=a;x+=col*a;y+=row*a;
        minX=Math.min(minX,col);maxX=Math.max(maxX,col);
        minY=Math.min(minY,row);maxY=Math.max(maxY,row);
       }
      }
      return {count:+count.toFixed(1),centerX:count?+(x/count).toFixed(2):null,
       centerY:count?+(y/count).toFixed(2):null,
       bbox:[minX,minY,maxX,maxY]};
     }
     function isolatedStat(index){
      return stats(M.renderPrepared(isolated,dir,pack.manifest.motion.tracks[dir][index]));
     }
     const body=source.entries.find(e=>e.name==='base/body'+(gender==='female'?'_f':''));
     const basePartStats=Object.fromEntries(['head','arm_l','arm_r','torso','leg_l','leg_r'].map(part=>
      [part,body?.parts?.[part]?stats(body.parts[part]):null]));
     const fullBody=document.createElement('canvas');fullBody.width=64;fullBody.height=112;
     const g=fullBody.getContext('2d');
     for(const item of Object.values(body?.parts||{}))g.drawImage(item,0,0);
     const bytes=g.getImageData(0,0,64,112).data;
     const bodyRows={};
     for(const y of [30,35,40,45,50,55,60,65,70,75,80,85,90]){
      const xs=[];for(let x=0;x<64;x++)if(bytes[(y*64+x)*4+3]>30)xs.push(x);
      bodyRows[y]=xs.length?[xs[0],xs[xs.length-1],xs.length]:[];
     }
     measured[dir]={arm,guard:isolatedStat(0),impact:isolatedStat(3),
      geometry:source.geometry,basePartStats,bodyRows};
    }
    return measured;
   },gender);
   console.log('ACTUAL IDLE SEGMENTATION '+gender+' '+JSON.stringify(armMetrics));
   for(const [dir,m] of Object.entries(armMetrics)){
    if(m.guard.count<=8||m.impact.count<=8)
     problems.push(gender+' '+dir+' actual arm missing: '+JSON.stringify(m));
    const forward=(m.impact.centerX-m.guard.centerX)*
     (dir==='se'||dir==='ne'?1:-1);
    if(!(forward>7))
     problems.push(gender+' '+dir+' punch arm does not move forward: '+forward);
    if(m.impact.count<m.guard.count*.55)
     problems.push(gender+' '+dir+' punch clipped: '+JSON.stringify(m));
   }
  }
  assert.equal(problems.length,0,problems.join('\n'));
  await page.goto(root+'/mahluk-action-editor.html',{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#phase-loop option[value="clip:clp_standing_punch"]').waitFor({state:'attached',timeout:45000});
  console.log('[ok] Existing Action Editor also auto-detects bundled JSON Punch');
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
