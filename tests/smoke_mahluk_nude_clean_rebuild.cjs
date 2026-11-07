'use strict';
/* Real PNG-backed Chromium test: female nude layers, old corrupted corrections,
 * source master versions and regenerated preview frame bytes. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT='http://127.0.0.1:4173/virtual-life-asset-pipeline';
async function run(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(ROOT+'/v6p-studio.html?embedded=1',{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('body.wizard-ready').waitFor({timeout:65000});
  const evidence=await page.evaluate(async()=>{
   const S=window.V6PCharacterStore,P=window.V6PPixelSource,R=window.V6PCharacterRetarget,C=window.V6PPartCatalog;
   const part='base/body_f',name='test female smoke';
   const row=S.create({name,gender:'female'});
   const stock=await P.loadSheet(part);
   const source=P.extract(stock,'walk','ne',1);
   const old=await P.loadSheet(part);
   const origin=C.cellOrigin('walk','ne',1);
   old.getContext('2d').fillStyle='rgb(255,0,255)';
   old.getContext('2d').fillRect(origin.x+31,origin.y+51,5,5);
   S.setGenerated(row.id,part,old.toDataURL('image/png'),{generated:1,masters:[]});
   S.markCorrection(row.id,part,'walk','ne',1);
   // Simulate a pre-fix session: boolean correction lock without causal version.
   const key='vl-v6p-character-workflow-v1';
   const library=JSON.parse(localStorage.getItem(key));
   const target=library.items.find(x=>x.id===row.id);
   delete target.correctionVersion;
   delete target.correctionUpdatedAt;
   localStorage.setItem(key,JSON.stringify(library));
   const cleaned=await R.generateCharacter(row.id);
   const repaired=await P.loadSheetFromUrl(S.getPart(row.id,part));
   const after=P.extract(repaired,'walk','ne',1);
   const originalBytes=[...source.data],cleanedBytes=[...after.data];
   const archived=!!S.get(row.id)?.correctionArchive?.[part]?.['walk|ne|1']?.png;
   const flagLeft=S.isCorrection(row.id,part,'walk','ne',1);
   // Nude remains an outfit choice, not a transformed base body.
   const nudePart='top/nude_back_f';
   const nudeStock=await P.loadSheet(nudePart);
   const brokenNude=await P.loadSheet(nudePart);
   const nudeOrigin=C.cellOrigin('walk','nw',1);
   brokenNude.getContext('2d').fillStyle='rgb(245,0,245)';
   brokenNude.getContext('2d').fillRect(nudeOrigin.x+10,nudeOrigin.y+25,6,6);
   S.setGenerated(row.id,nudePart,brokenNude.toDataURL('image/png'),{generated:1,masters:[]});
   await R.generateCharacter(row.id);
   const restoredNude=await P.loadSheetFromUrl(S.getPart(row.id,nudePart));
   const nudeExpected=P.extract(nudeStock,'walk','nw',1).data;
   const nudeActual=P.extract(restoredNude,'walk','nw',1).data;
   const nudeMatches=nudeActual.every((v,i)=>v===nudeExpected[i]);
   // A real source master makes it into idle frame 0 without destructive warping.
   const idle=P.extract(stock,'idle','ne',0);
   const master=document.createElement('canvas');master.width=64;master.height=112;
   master.getContext('2d').putImageData(idle,0,0);
   const g=master.getContext('2d');
   // Find an opaque skin pixel to alter.
   const idx=idle.data.findIndex((v,i)=>i%4===3&&v>128);
   const cell=Math.floor(idx/4),mx=cell%64,my=Math.floor(cell/64);
   g.fillStyle='rgb(60,220,90)';g.fillRect(mx,my,1,1);
   S.setMaster(row.id,part,'ne',master.toDataURL('image/png'));
   await R.generateCharacter(row.id);
   const painted=await P.loadSheetFromUrl(S.getPart(row.id,part));
   const idlePainted=P.extract(painted,'idle','ne',0);
   const masterTransferred=[...idlePainted.data.slice(cell*4,cell*4+3)].join(',')==='60,220,90';
   // A newer manually edited walk pose must survive another regenerate.
   const customWalk=await P.loadSheetFromUrl(S.getPart(row.id,part));
   customWalk.getContext('2d').fillStyle='rgb(250,21,11)';
   customWalk.getContext('2d').fillRect(origin.x+36,origin.y+48,2,2);
   S.setPart(row.id,part,customWalk.toDataURL('image/png'));
   S.markCorrection(row.id,part,'walk','ne',1);
   const liveFixBefore=S.shouldKeepCorrection(row.id,part,'walk','ne',1);
   await R.generateCharacter(row.id);
   const keepSheet=await P.loadSheetFromUrl(S.getPart(row.id,part));
   const keepFrame=P.extract(keepSheet,'walk','ne',1);
   const kp=(48*64+36)*4;
   const keepColor=[...keepFrame.data.slice(kp,kp+3)].join(',')==='250,21,11';
   // A changed base source invalidates the previously valid hand correction.
   g.fillStyle='rgb(90,180,120)';g.fillRect(mx,my,1,1);
   S.setMaster(row.id,part,'ne',master.toDataURL('image/png'));
   const liveFixAfter=S.shouldKeepCorrection(row.id,part,'walk','ne',1);
   const upgraded=await R.generateCharacter(row.id);
   const updated=await P.loadSheetFromUrl(S.getPart(row.id,part));
   const newFrame=P.extract(updated,'walk','ne',1);
   const staleGone=[...newFrame.data.slice(kp,kp+3)].join(',')!=='250,21,11';
   return {
    originalRestored:originalBytes.every((v,i)=>v===cleanedBytes[i]),
    archived,flagLeft,archivedCount:cleaned.archivedStaleCorrections,
    nudeMatches,masterTransferred,liveFixBefore,keepColor,liveFixAfter,
    staleGone,staleArchived:upgraded.archivedStaleCorrections,
    characterId:row.id
   };
  });
  assert.equal(evidence.originalRestored,true,'Old corrupted female-back walk pose survived regenerate');
  assert.equal(evidence.archived,true,'Previous edited pose was not archived');
  assert.equal(evidence.flagLeft,false,'Obsolete legacy correction remains locked');
  assert.ok(evidence.archivedCount>=1,'Source rebuild did not report archive');
  console.log('[ok] female back frame reset from native source, old fix archived');
  assert.equal(evidence.nudeMatches,true,'Unedited nude back garment must remain native stock');
  console.log('[ok] nude outfit back layer remains its native animation');
  assert.equal(evidence.masterTransferred,true,'NE master was not applied to idle pose');
  assert.equal(evidence.liveFixBefore,true,'Fresh frame correction not versioned');
  assert.equal(evidence.keepColor,true,'A valid manual correction did not survive regenerate');
  assert.equal(evidence.liveFixAfter,false,'Master edit did not invalidate older correction');
  assert.equal(evidence.staleGone,true,'Stale hand correction still appears after master changed');
  assert.ok(evidence.staleArchived>=1,'Stale pose was not archived');
  console.log('[ok] master source and newer hand fixes retain causal ordering');
  assert.deepEqual(errors,[]);
  console.log('PASS female nude clean source regeneration');
 }catch(e){
  console.error('Browser errors',errors.slice(-8));
  await page.screenshot({path:'/tmp/mahluk-nude-regeneration-failed.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await browser.close()}
}
run().catch(e=>{console.error(e);process.exitCode=1});
