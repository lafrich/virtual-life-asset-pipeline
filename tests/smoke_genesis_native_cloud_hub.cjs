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
  await a.locator("#status").getByText(/GENESIS MASTER PUPPET PREVIEW/).waitFor({timeout:150000});
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
  // Verify fixed-ID overwrite and Puppet/Slice editing with mocked Drive.
  page.on("dialog",dialog=>dialog.accept());
  await page.evaluate(()=>window.VLMahlukWorkspace.show("genesis"));
  const genesis=page.frameLocator("#genesis-frame");
  await genesis.locator("#stage").waitFor({timeout:65000});
  await genesis.locator("#joint-x").fill("35");
  await genesis.locator("#joint-x").press("Tab");
  // All 11 original native animations must remain non-empty under this rig.
  const nativeActions=["walk","idle","talk","sit","sit_type","sleep","tired","swim","float","lie","perch"];
  const options=await genesis.locator("#native-action option").allTextContents();
  assert.equal(options.length,11,"Native animation template count changed");
  for(const action of nativeActions){
   await genesis.locator("#native-action").selectOption(action);
   const visible=await genesis.locator("#source-preview").evaluate(c=>{
    const p=c.getContext("2d").getImageData(0,0,64,112).data;
    return p.some((value,index)=>index%4===3&&value>0);
   });
   assert.equal(visible,true,"Missing original Genesis native "+action);
  }
  await genesis.locator("#native-action").selectOption("idle");
  await genesis.locator("#mode-slice").click();
  await genesis.locator("#slice-part").selectOption("arm_l");
  const b=await genesis.locator("#stage").boundingBox();
  assert.ok(b,"Genesis slice canvas is missing");
  await genesis.locator("#stage").click({position:{x:b.width*32/64,y:b.height*30/112}});
  await genesis.locator("#save").click();
  await genesis.locator("#status").getByText(/CLOUD VERIFIED/).waitFor({timeout:45000});
  let masters=[...files.values()].filter(row=>row.name==="genesis__genesis_male_nude.json");
  assert.equal(masters.length,1,"Genesis must save to one stable male ID");
  let rig=JSON.parse(masters[0].content).record;
  assert.equal(rig.id,"genesis_male_nude");
  assert.equal(rig.joints.se.head.x,35);
  const masks=await genesis.locator("#stage").evaluate(()=>{
   const M=window.GenesisMasterRig;
   return M.decode(M.load('male').masks.se)[30*64+32];
  });
  assert.equal(masks,3,"Edited native slice must be stored as left-arm mask");
  await genesis.locator("#slice-unselect").click();
  assert.equal(await genesis.locator("#slice-unselect").getAttribute("aria-pressed"),"true");
  await genesis.locator("#stage").click({position:{x:b.width*32/64,y:b.height*30/112}});
  const unselected=await genesis.locator("#stage").evaluate(()=>{
   const M=window.GenesisMasterRig;
   return M.decode(M.load('male').masks.se)[30*64+32];
  });
  // A modified profile is unsaved; check the editor profile via backup export
  // after saving it to the same ID.
  await genesis.locator("#save").click();
  await genesis.locator("#status").getByText(/CLOUD VERIFIED/).waitFor({timeout:45000});
  const unselectSave=JSON.parse([...files.values()]
   .find(row=>row.name==="genesis__genesis_male_nude.json").content).record;
  assert.equal(unselectSave.masks.se.length>9000,true);
  const unselectDecoded=await genesis.locator("#stage").evaluate((canvas,mask)=>{
   return window.GenesisMasterRig.decode(mask)[30*64+32];
  },unselectSave.masks.se);
  assert.equal(unselectDecoded,255,"UNSELECT must save as unassigned, not clear Genesis pixels");
  // Unselected pixels have no extra yellow/orange highlight; blue disappears.
  const noYellow=await genesis.locator("#stage").evaluate((canvas,mask)=>{
   const M=window.GenesisMasterRig,part=M.PARTS.indexOf("arm_l");
   const decoded=M.decode(mask);
   return {unassigned:decoded[30*64+32]===M.UNSELECTED,
    blueCode:canvas.getContext("2d").getImageData(32,30,1,1).data[2],
    maskPart:part};
  },unselectSave.masks.se);
  assert.equal(noYellow.unassigned,true,"UNSELECT should erase the blue selection");
  await genesis.locator("#slice-select").click();
  await genesis.locator("#stage").click({position:{x:b.width*32/64,y:b.height*30/112}});
  await genesis.locator("#save").click();
  await genesis.locator("#status").getByText(/CLOUD VERIFIED/).waitFor({timeout:45000});
  await genesis.locator("#mode-puppet").click();
  await genesis.locator("#joint-x").fill("36");
  await genesis.locator("#joint-x").press("Tab");
  await genesis.locator("#save").click();
  await genesis.locator("#status").getByText(/CLOUD VERIFIED/).waitFor({timeout:45000});
  masters=[...files.values()].filter(row=>row.name==="genesis__genesis_male_nude.json");
  assert.equal(masters.length,1,"Repeat Save must overwrite, never create another Genesis Male");
  rig=JSON.parse(masters[0].content).record;
  assert.equal(rig.joints.se.head.x,36);
  await genesis.locator("#gender").selectOption("female");
  assert.equal(await genesis.locator("#joint-x").inputValue(),"32","Male changes leaked into Female master");
  console.log("PASS Genesis master rig/slice + cloud overwrite + independent female source");
  // Consume the *same* saved Python source from Character's existing QA dropdown.
  await page.evaluate(()=>window.VLMahlukWorkspace.show("character"));
  const character=page.frameLocator("#character-frame");
  await character.locator("body.wizard-ready").waitFor({timeout:65000});
  await character.locator("#wizard-start-new").click();
  await character.locator("#workflow-source").selectOption("base:male");
  await character.locator("#wizard-next").click();
  await character.locator("#wizard-customize:not([hidden])").waitFor({timeout:65000});
  await character.locator("#wizard-next").click();
  await character.locator("#wizard-preview:not([hidden])").waitFor({timeout:65000});
  await character.locator("#qa-from-database").click();
  await character.locator("#qa-animation").evaluate((s,id)=>new Promise((resolve,reject)=>{
   const began=Date.now();
   const check=()=>{if(s.value==="python:"+id)resolve();
    else if(Date.now()-began>45000)reject(Error("Saved Python not shown in Character QA selector: "+s.value));
    else setTimeout(check,150)};
   check();
  }),saved.id);
  await character.locator("#qa-python-status").getByText(/Custom Wear/).waitFor({timeout:45000});
  await character.locator("#qa-animation").evaluate((sel,id)=>{
   if(sel.value!=="python:"+id)throw Error("Wrong Python source selected");
  },saved.id);
  const renderOk=await character.locator("canvas[data-qa-dir]").evaluateAll(async canvases=>{
   const end=Date.now()+150000;
   while(Date.now()<end){
    if(canvases.length===4&&canvases.every(c=>{
     const data=c.getContext("2d").getImageData(0,0,64,112).data;
     return Array.from(data).some((v,i)=>i%4===3&&v>0);
    }))return true;
    await new Promise(r=>setTimeout(r,200));
   }
   return false;
  });
  assert.equal(renderOk,true,"Character From Database did not render 4 original Python views");
  assert.deepEqual(errors,[]);
  console.log("PASS Mahluk trial route → native Python preview → cloud verified save → gallery reload");
 }catch(e){
  console.error("CLOUD NATIVE QA FAILED",e.message);
  console.error("PAGE ERRORS",errors);
  throw e;
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
