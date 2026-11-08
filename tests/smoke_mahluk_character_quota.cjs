'use strict';
/* Browser regression: publishing full native clips under a forced 5MB-style
   localStorage quota must retain every original sheet and show in gallery. */
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
  const data=await page.evaluate(async()=>{
   const id='mh2_quotatest'+Date.now().toString(36),url='data:image/png;base64,'+'A'.repeat(50000);
   // Seed an existing published legacy character. The fallback must NEVER
   // erase or compact another existing saved character.
   const old={format:'mahluk-2-character-v1',version:1,id:'mh2_existing',
    name:'Existing Character',base:'male',v6p:{body:'male'},clips:{idle:{sheet:'data:image/png;base64,AAAA',frames:1}}};
   localStorage.setItem('mahluk-2-library-v1',JSON.stringify([old]));
   const set=Storage.prototype.setItem;
   Storage.prototype.setItem=function(k,v){
    if(k==='mahluk-2-library-v1'&&String(v).length>6000)
     throw new DOMException('Setting the value exceeded the quota','QuotaExceededError');
    return set.call(this,k,v);
   };
   const clips={};
   for(const name of ['idle','walk','talk','sit','sleep','lie'])clips[name]={
    sheet:url+name,frames:4,frame_ms:[140,140,140,140],loop:true};
   const input={id,name:'Large Saved Character',gender:'female',
    sprite:'data:image/png;base64,AAAA',v6p:{body:'female',top:'custom'},clips};
   const result=await VLHubCharactersPublish.publishAsync(input);
   const all=JSON.parse(localStorage.getItem('mahluk-2-library-v1')||'[]');
   const stored=await V6PPublishedArchive.get(id);
   return {id,result:{ok:result.ok,stored:result.stored,indexed:result.indexed,warning:result.warning},
    oldIntact:all.find(x=>x.id==='mh2_existing')?.clips.idle.sheet==='data:image/png;base64,AAAA',
    index:all.find(x=>x.id===id)||null,
    archiveValid:stored?.clips.walk?.sheet===url+'walk',
    length:stored?.clips.walk?.sheet?.length||0};
  });
  assert.equal(data.result.ok,true);
  assert.equal(data.result.stored,'indexeddb');
  assert.equal(data.oldIntact,true,'Existing character was overwritten or compacted');
  assert.equal(data.index?.archived,'indexeddb-v1');
  assert.equal(data.index.clips.walk.sheet,undefined,'Full sprite was mistakenly kept in quota-limited localStorage');
  assert.equal(data.archiveValid,true,'IndexedDB did not retain exact original PNG payload');
  assert.ok(data.length>50000);
  await page.locator('#wizard-tab-gallery').click();
  await page.locator('#wizard-gallery-grid').getByText('Large Saved Character').waitFor({timeout:10000});
  console.log('PASS quota: complete 6-motion character saved in IndexedDB; original library unchanged; gallery visible');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('body.wizard-ready').waitFor({timeout:65000});
  await page.locator('#wizard-tab-gallery').click();
  await page.locator('#wizard-gallery-grid').getByText('Large Saved Character').waitFor({timeout:15000});
  const loaded=await page.evaluate(id=>V6PPublishedArchive.get(id).then(v=>v?.clips.walk.sheet?.length||0),data.id);
  assert.equal(loaded,data.length,'Archived character did not survive page reload');
  assert.deepEqual(errors,[]);
  console.log('PASS quota: after reload the full PNG sheet and character gallery survived');
 }catch(e){
  console.error('QUOTA TEST FAILED',e.message,errors);
  await page.screenshot({path:'/tmp/mahluk-character-quota-failed.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
