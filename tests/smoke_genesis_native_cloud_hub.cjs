'use strict';
/* Actual Mahluk Hub → native Animation iframe → real Python preview → mock
 * Google Drive read-back. No real Google account is accessed.
 */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const TARGET_URL="http://127.0.0.1:4174/virtual-life-asset-pipeline/mahluk-hidup.html?tab=animation&animationEditor=native&legacyCloud=1";
(async()=>{
 const files=new Map();let counter=0;
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1250,height:900}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.route("https://accounts.google.com/gsi/client",route=>route.fulfill({
  status:200,contentType:"text/javascript",
  body:"window.google={accounts:{oauth2:{initTokenClient(o){return{requestAccessToken(){o.callback({access_token:'testing-token',expires_in:3600})}}}}}};"
 }));
 await page.route("https://www.googleapis.com/**",async route=>{
  const req=route.request(),u=new URL(req.url()),p=u.pathname,method=req.method();
  const reply=(obj,status=200)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify(obj)});
  if(method==="GET"&&p==="/drive/v3/files"){
   const q=u.searchParams.get("q")||"";
   const name=/name = '([^']+)'/.exec(q)?.[1],prefix=/name contains '([^']+)'/.exec(q)?.[1];
   const parent=/'([^']+)' in parents/.exec(q)?.[1];
   const rows=[...files.values()].filter(x=>x.parent===parent&&(!name||x.name===name)&&
    (!prefix||x.name.includes(prefix))&&(!q.includes("mimeType = ")||q.includes("mimeType = '"+x.mimeType+"'")));
   return reply({files:rows.map(({id,name,mimeType})=>({id,name,mimeType}))});
  }
  if(method==="POST"&&p==="/drive/v3/files"){
   const v=JSON.parse(req.postData()||"{}"),row={id:"fake"+(++counter),
    name:v.name,parent:v.parents?.[0]||"root",mimeType:v.mimeType,content:""};
   files.set(row.id,row);return reply({id:row.id});
  }
  if(method==="PATCH"&&p.startsWith("/upload/drive/v3/files/")){
   const row=files.get(p.split("/").pop());if(!row)return reply({error:"not found"},404);
   row.content=req.postData()||"";return reply({id:row.id});
  }
  if(method==="GET"&&p.startsWith("/drive/v3/files/")&&u.searchParams.get("alt")==="media"){
   const row=files.get(p.split("/").pop());if(!row)return reply({error:"not found"},404);
   return route.fulfill({status:200,contentType:"application/json",body:row.content});
  }
  return reply({error:"unexpected Drive API",p,method},400);
 });
 try{
  await page.goto(TARGET_URL,{waitUntil:"domcontentloaded",timeout:45000});
  await page.waitForFunction(()=>!!window.VLMahlukHubDrive&&!!window.google?.accounts?.oauth2);
  await page.locator("#drive-connect").click();
  await page.locator("#drive-connect").getByText("CONNECTED").waitFor({timeout:25000});
  const a=page.frameLocator("#motion-frame");
  await a.locator("#home:not([hidden])").waitFor({timeout:45000});
  await a.locator("#start-create").click();
  await a.locator("#setup-name").fill("Cloud Native Test");
  await a.locator("#setup-continue").click();
  await a.locator("#editor:not([hidden])").waitFor();
  await a.locator("#status").getByText(/NATIVE PYTHON PREVIEW/).waitFor({timeout:150000});
  await a.locator("#save-cloud").click();
  await a.locator("#status").getByText(/CLOUD VERIFIED/).waitFor({timeout:30000});
  const actual=[...files.values()].find(x=>x.name.startsWith("animation__anim_"));
  assert.ok(actual,"Cloud source record missing");
  const saved=JSON.parse(actual.content).record;
  assert.equal(saved.format,"genesis-v6b-native-animation-v1");
  assert.match(saved.python,/GENESIS_V6B_ANIMATION = r'''/);
  assert.equal(saved.status,"source_saved_not_installed");
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>!!window.google?.accounts?.oauth2&&!!window.VLMahlukHubDrive);
  await page.locator("#drive-connect").click();
  await page.locator("#drive-connect").getByText("CONNECTED").waitFor({timeout:25000});
  const again=page.frameLocator("#motion-frame");
  await again.locator("#gallery button").filter({hasText:"Cloud Native Test"}).waitFor({timeout:35000});
  const file=[...files.values()].find(x=>x.name==="mahluk-animation-legacy-purge-done-v1.json");
  assert.ok(file,"Cloud-side legacy migration marker missing");
  assert.deepEqual(errors,[]);
  console.log("PASS Mahluk trial route → native Python preview → cloud verified save → gallery reload");
 }catch(e){
  console.error("CLOUD NATIVE QA FAILED",e.message);
  console.error("PAGE ERRORS",errors);
  throw e;
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
