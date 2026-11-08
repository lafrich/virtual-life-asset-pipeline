'use strict';
/* Real browser acceptance for native Python pose editing. Requires a local
 * http-server rooted at site/ and Pyodide CDN access. No cloud account touched.
 */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const url="http://127.0.0.1:4173/mahluk-animation-native.html";
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1280,height:880}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.nativeOutputs=[];
  const OriginalWorker=window.Worker;
  window.Worker=class extends OriginalWorker{
   constructor(...args){
    super(...args);
    this.addEventListener("message",e=>{
     if(e.data?.type==="render"&&typeof e.data.src==="string")window.nativeOutputs.push(e.data.src);
    });
   }
  };
 });
 try{
  await page.goto(url,{waitUntil:"domcontentloaded",timeout:45000});
  await page.locator("#start-create").click();
  await page.locator("#setup-name").fill("Native QA Waving");
  await page.locator("#template").selectOption("idle");
  await page.locator("#setup-count").fill("4");
  await page.locator("#setup-continue").click();
  await page.locator("#editor:not([hidden])").waitFor();
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent?.includes("NATIVE PYTHON PREVIEW"),null,{timeout:120000});
  const first=await page.evaluate(()=>window.nativeOutputs.at(-1));
  assert.ok(first?.startsWith("data:image/png;base64,"),"Pyodide did not provide native PNG");
  await page.locator("#joint-list button[data-joint=hand_near]").click();
  await page.locator("#joint-x").fill("32");
  await page.locator("#joint-y").fill("60");
  await page.locator("#joint-y").press("Tab");
  await page.waitForFunction(()=>window.nativeOutputs.length>=2&&
   document.querySelector("#status")?.textContent?.includes("NATIVE PYTHON PREVIEW"),null,{timeout:120000});
  const second=await page.evaluate(()=>window.nativeOutputs.at(-1));
  assert.notEqual(second,first,"Moving an anatomical joint did not change rendered original Python pixels");
  const downloadPromise=page.waitForEvent("download");
  await page.locator("#export-python").click();
  const dl=await downloadPromise;assert.match(dl.suggestedFilename(),/\.py$/);
  const filename="/tmp/"+dl.suggestedFilename();await dl.saveAs(filename);
  await page.locator("#back-home").click();
  await page.locator("#python-file").setInputFiles(filename);
  await page.locator("#editor:not([hidden])").waitFor();
  assert.equal(await page.locator("#animation-name").inputValue(),"Native QA Waving");
  assert.equal(await page.locator("#install").isDisabled(),true,"Unsafe gameplay install must stay locked");
  assert.deepEqual(errors,[]);
  console.log("PASS browser native V6B create → Python raster → drag values → .py export/reimport");
 }catch(e){
  console.error("NATIVE BROWSER QA FAILED",e.message);
  console.error("PAGE ERRORS",errors);
  console.error("EDITOR STATUS",await page.locator("#status").textContent().catch(()=>"-"));
  throw e;
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
