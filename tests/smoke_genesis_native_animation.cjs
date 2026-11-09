'use strict';
/* Real browser acceptance for native Python pose editing. Requires a local
 * http-server rooted at site/. Uses the approved Genesis V6P source atlas.
 * Python code remains declarative and is never evaluated. No cloud touched.
 */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const url="http://127.0.0.1:4173/mahluk-animation-native.html";
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1280,height:880}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto(url,{waitUntil:"domcontentloaded",timeout:45000});
  await page.locator("#start-create").click();
  await page.locator("#setup-name").fill("Native QA Waving");
  await page.locator("#template").selectOption("idle");
  await page.locator("#setup-count").fill("4");
  await page.locator("#setup-continue").click();
  await page.locator("#editor:not([hidden])").waitFor();
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent?.includes("GENESIS MASTER PUPPET PREVIEW"),null,{timeout:120000});
  const first=await page.locator("#stage").evaluate(c=>c.toDataURL());
  assert.ok(first?.startsWith("data:image/png;base64,"),"Genesis master did not provide PNG preview");
  await page.locator("#joint-list button[data-joint=hand_near]").click();
  await page.locator("#joint-x").fill("32");
  await page.locator("#joint-y").fill("60");
  await page.locator("#joint-y").press("Tab");
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent?.includes("GENESIS MASTER PUPPET PREVIEW")&&
   document.querySelector("#joint-x")?.value==="32"&&document.querySelector("#joint-y")?.value==="60",null,{timeout:120000});
  const second=await page.locator("#stage").evaluate(c=>c.toDataURL());
  assert.notEqual(second,first,"Moving anatomical coordinates did not update Genesis preview");
  await page.locator('#pose-copy').click();
  await page.locator('#direction-buttons button').filter({hasText:'SW'}).click();
  await page.locator('#pose-paste-flip').click();
  // Paste mutates pose synchronously. The renderer immediately overwrites
  // the transient "PASTED" status, so verify actual exported coordinates below.
  await page.locator('#pose-copy-all').click();
  await page.locator('#direction-buttons button').filter({hasText:'NE'}).click();
  await page.locator('#pose-paste-all').click();
  const downloadPromise=page.waitForEvent("download");
  await page.locator("#export-python").click();
  const dl=await downloadPromise;assert.match(dl.suggestedFilename(),/\.py$/);
  const filename="/tmp/"+dl.suggestedFilename();await dl.saveAs(filename);
  const Contract=require('../site/genesis-native-python-contract.js');
  const parsed=Contract.fromPython(require('node:fs').readFileSync(filename,'utf8'));
  assert.equal(parsed.poses.se[0].joints.hand_near.x,32);
  assert.equal(parsed.poses.sw[0].joints.hand_far.x,63-32,'Paste Flip must mirror X and switch near/far');
  assert.deepEqual(parsed.poses.ne,parsed.poses.sw,'Copy All must transfer all frames unchanged');
  await page.locator("#back-home").click();
  await page.locator("#python-file").setInputFiles(filename);
  await page.locator("#editor:not([hidden])").waitFor();
  assert.equal(await page.locator("#animation-name").inputValue(),"Native QA Waving");
  assert.equal(await page.locator("#install").isDisabled(),true,"Unsafe gameplay install must stay locked");
  assert.deepEqual(errors,[]);
  console.log("PASS browser Genesis master render → Python joint edits → paste flip/direction → .py export/reimport");
 }catch(e){
  console.error("NATIVE BROWSER QA FAILED",e.message);
  console.error("PAGE ERRORS",errors);
  console.error("EDITOR STATUS",await page.locator("#status").textContent().catch(()=>"-"));
  throw e;
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
