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
  // Pixel-accurate zoom: canvas changes only CSS size, not its 64x112 native buffer.
  const initial=await genesis.locator("#stage").evaluate(c=>({
   width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height,
   intrinsicWidth:c.width,intrinsicHeight:c.height
  }));
  await genesis.locator("#zoom-in").click();
  const plus=await genesis.locator("#stage").evaluate(c=>c.getBoundingClientRect().width);
  assert.equal(plus-initial.width,64,"Zoom + must add exactly one CSS pixel per native pixel");
  await genesis.locator("#zoom").evaluate(input=>{
   input.value="12";input.dispatchEvent(new Event("input",{bubbles:true}));
  });
  const magnified=await genesis.locator("#stage").evaluate(c=>({
   width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height,
   intrinsicWidth:c.width,intrinsicHeight:c.height
  }));
  assert.deepEqual(magnified,{width:768,height:1344,intrinsicWidth:64,intrinsicHeight:112});
  const scrollable=await genesis.locator("#stage-viewport").evaluate(v=>({
   canScrollX:v.scrollWidth>v.clientWidth,canScrollY:v.scrollHeight>v.clientHeight
  }));
  assert.equal(scrollable.canScrollX&&scrollable.canScrollY,true,"Zoomed canvas must scroll both ways");
  await genesis.locator("#zoom-pan").click();
  assert.equal(await genesis.locator("#zoom-pan").getAttribute("aria-pressed"),"true");
  const box=await genesis.locator("#stage-viewport").boundingBox();
  assert.ok(box);
  const leftBefore=await genesis.locator("#stage-viewport").evaluate(v=>v.scrollLeft);
  await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.5-45,box.y+box.height*.5,{steps:5});
  await page.mouse.up();
  const leftAfter=await genesis.locator("#stage-viewport").evaluate(v=>v.scrollLeft);
  assert.ok(leftAfter>leftBefore,"Pan must scroll zoomed canvas without painting pixels");
  await genesis.locator("#zoom-pan").click();
  await genesis.locator("#slice-part").selectOption("arm_l");
  await genesis.locator("#stage-viewport").evaluate(v=>{v.scrollLeft=0;v.scrollTop=0});
  await genesis.locator("#stage").click({position:{x:10*12+6,y:10*12+6}});
  await genesis.locator("#zoom-fit").click();
  const fitted=await genesis.locator("#stage").evaluate(c=>({
   width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height
  }));
  assert.ok(fitted.width<=768&&fitted.height<=1344,"Fit should reduce magnification");
  assert.equal(await genesis.locator("#stage").evaluate(c=>c.width),64,
   "Zoom/Fit must not modify the native mask coordinate system");

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
  const zoomPaint=await genesis.locator("#stage").evaluate(()=>{
   const M=window.GenesisMasterRig;
   return M.decode(M.load("male").masks.se)[10*64+10];
  });
  assert.equal(zoomPaint,3,"Painting at 1200% zoom must hit exact native pixel 10,10");
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
  // Reuse Emosi's existing pixel editor on an actual Genesis Custom Wear
  // native source layer. Apply modifies in-memory master only; Save overwrites
  // the same cloud master ID and not a standalone Character record.
  await genesis.locator("#pixel-part").selectOption("top/custom");
  // Existing single-frame editing must remain opt-in after Master Appearance
  // becomes the primary Pixel Editor scope.
  await genesis.locator("#pixel-scope").selectOption("frame");
  await genesis.locator("#native-action").selectOption("idle");
  await genesis.locator("#native-frame").fill("1");
  await genesis.locator("#pixel-open").click();
  await genesis.locator("#pixelOverlay:not([hidden])").waitFor({timeout:30000});
  await genesis.locator("#pixelColor").fill("#ff00ff");
  await genesis.locator("#pixelGrid").uncheck();
  await genesis.locator("#pixelOnion").uncheck();
  const pc=await genesis.locator("#pixelCanvas").evaluate(c=>{
   const b=c.getBoundingClientRect();
   return {w:b.width,h:b.height};
  });
  await genesis.locator("#pixelCanvas").click({position:{
   x:Math.floor(pc.w*10.5/64),y:Math.floor(pc.h*20.5/112)
  }});
  await genesis.locator("#pixelApply").click();
  await genesis.locator("#pixelOverlay").waitFor({state:"hidden",timeout:30000});
  await genesis.locator("#save").click();
  await genesis.locator("#status").getByText(/CLOUD VERIFIED/).waitFor({timeout:45000});
  let sourceSaved=JSON.parse([...files.values()]
   .find(x=>x.name==="genesis__genesis_male_nude.json").content).record;
  const cellKey="top/custom|idle|se|0";
  assert.ok(sourceSaved.pixelFrames?.[cellKey]?.startsWith("data:image/png;base64,"),
   "Genesis Pixel Editor did not persist to the selected native source layer");
  const editedCell=await genesis.locator("#stage").evaluate(async(c,src)=>{
   const im=new Image();im.src=src;await im.decode();
   const off=document.createElement("canvas");off.width=64;off.height=112;
   off.getContext("2d").drawImage(im,0,0);
   return [...off.getContext("2d").getImageData(10,20,1,1).data];
  },sourceSaved.pixelFrames[cellKey]);
  assert.deepEqual(editedCell,[255,0,255,255],"Edited Genesis source cell must retain exact magenta RGBA");
  const sourcePreviewPixel=await genesis.locator("#source-preview").evaluate(async c=>{
   for(let retry=0;retry<80;retry++){
    const v=[...c.getContext("2d").getImageData(10,20,1,1).data];
    if(v[0]===255&&v[1]===0&&v[2]===255&&v[3]===255)return v;
    await new Promise(r=>setTimeout(r,100));
   }
   return [...c.getContext("2d").getImageData(10,20,1,1).data];
  });
  assert.deepEqual(sourcePreviewPixel,[255,0,255,255],
   "Painted Custom Wear must appear in the actual Genesis native source preview");
  await genesis.locator("#pixel-open").click();
  await genesis.locator("#pixelOverlay:not([hidden])").waitFor({timeout:30000});
  await genesis.locator("#pixelGrid").uncheck();
  await genesis.locator("#pixelOnion").uncheck();
  const reopened=await genesis.locator("#pixelCanvas").evaluate(c=>{
   const x=Math.floor((10.5)*c.width/64),y=Math.floor((20.5)*c.height/112);
   return [...c.getContext("2d").getImageData(x,y,1,1).data];
  });
  assert.deepEqual(reopened,[255,0,255,255],"Genesis pixel correction did not reopen");
  await genesis.locator("#pixelClose").click();

  // Master Appearance is separate from per-frame edits, and is saved on the
  // same male Genesis ID. Pick a native opaque pixel with a matching WALK
  // counterpart rather than assuming where the art silhouette is located.
  await genesis.locator("#pixel-scope").selectOption("master");
  await genesis.locator("#pixel-part").selectOption("top/custom");
  await genesis.locator("#dir").selectOption("se");
  const masterSpot=await genesis.locator("#stage").evaluate(async()=>{
    const V=window.V6PCompositor,T=window.GenesisAppearanceTransfer;
    const src=window.VLGenesisSource.bases.genesis_male_nude;
    const im=await V.img("top/custom",src.sourceId);
    const idle=V.extractFrame(im,"idle","se",0).getContext("2d").getImageData(0,0,64,112).data;
    const walk=V.extractFrame(im,"walk","se",0).getContext("2d").getImageData(0,0,64,112).data;
    const a=T.bbox(idle),b=T.bbox(walk);
    const dx=Math.round(b.cx-a.cx),dy=Math.round(b.cy-a.cy);
    for(let y=30;y<94;y++)for(let x=14;x<50;x++){
      const p=(y*64+x)*4;if(!idle[p+3])continue;
      for(let oy=-4;oy<=4;oy++)for(let ox=-4;ox<=4;ox++){
        const tx=x+dx+ox,ty=y+dy+oy;
        if(tx<0||tx>=64||ty<0||ty>=112)continue;
        const q=(ty*64+tx)*4;
        if(idle[p]===walk[q]&&idle[p+1]===walk[q+1]&&idle[p+2]===walk[q+2]&&idle[p+3]===walk[q+3])
          return {x,y};
      }
    }
    return null;
  });
  assert.ok(masterSpot,"Cannot find a corresponding torso pixel between Genesis Idle and Walk");
  await genesis.locator("#pixel-open").click();
  await genesis.locator("#pixelOverlay:not([hidden])").waitFor({timeout:30000});
  await genesis.locator("#pixelColor").fill("#22ccff");
  await genesis.locator("#pixelGrid").uncheck();
  await genesis.locator("#pixelOnion").uncheck();
  const zoomed=await genesis.locator("#pixelCanvas").evaluate(c=>({
    w:c.getBoundingClientRect().width,h:c.getBoundingClientRect().height
  }));
  await genesis.locator("#pixelCanvas").click({position:{
    x:Math.floor(zoomed.w*(masterSpot.x+.5)/64),
    y:Math.floor(zoomed.h*(masterSpot.y+.5)/112)
  }});
  await genesis.locator("#pixelApply").click();
  await genesis.locator("#pixelOverlay").waitFor({state:"hidden",timeout:30000});
  await genesis.locator("#save").click();
  await genesis.locator("#status").getByText(/CLOUD VERIFIED/).waitFor({timeout:45000});
  let fourView=JSON.parse([...files.values()]
   .find(x=>x.name==="genesis__genesis_male_nude.json").content).record;
  assert.ok(fourView.appearanceMaster?.["top/custom|se"]?.startsWith("data:image/png;base64,"),
    "Master Appearance did not save source 4-view PNG");
  assert.equal(fourView.appearanceMaster["top/custom|sw"],undefined,
    "Editing SE must NOT automatically overwrite the SW appearance");
  assert.ok(fourView.pixelFrames?.["top/custom|idle|se|0"],
    "Master Appearance must preserve the earlier single-frame correction");
  const inherit=await genesis.locator("#stage").evaluate(async()=>{
    const P=window.GenesisMasterPixel,V=window.V6PCompositor,M=window.GenesisMasterRig;
    const source=window.VLGenesisSource.bases.genesis_male_nude;
    const im=await V.img("top/custom",source.sourceId);
    const original=V.extractFrame(im,"walk","se",0).getContext("2d").getImageData(0,0,64,112).data;
    const inherited=await P.transferCell(im,"top/custom","walk","se",0,M.load("male"));
    const result=inherited.getContext("2d").getImageData(0,0,64,112).data;
    let changed=0,blue=0;
    for(let i=0;i<result.length;i+=4){
      if(original[i]!==result[i]||original[i+1]!==result[i+1]||
       original[i+2]!==result[i+2]||original[i+3]!==result[i+3])changed++;
      if(result[i]===34&&result[i+1]===204&&result[i+2]===255&&result[i+3]===255)blue++;
    }
    return {changed,blue};
  });
  assert.ok(inherit.changed>=1&&inherit.blue>=1,
    "Master Appearance did not inherit to a different native action (WALK)");
  // Copy/Paste Flip a complete view intentionally, without modifying any
  // other direction or the separate female master.
  await genesis.locator("#appearance-copy").click();
  await genesis.locator("#dir").selectOption("sw");
  await genesis.locator("#appearance-paste-flip").click();
  await genesis.locator("#save").click();
  await genesis.locator("#status").getByText(/CLOUD VERIFIED/).waitFor({timeout:45000});
  fourView=JSON.parse([...files.values()]
   .find(x=>x.name==="genesis__genesis_male_nude.json").content).record;
  assert.ok(fourView.appearanceMaster["top/custom|sw"],
    "Paste Flip must save a distinct SW appearance view");
  assert.equal(fourView.appearanceMaster["top/custom|ne"],undefined,
    "Paste Flip must not alter unrelated NE appearance");
  await genesis.locator("#dir").selectOption("se");
  await genesis.locator("#pixel-scope").selectOption("frame");
  console.log("PASS Master Appearance SE → native WALK, view Paste Flip, frame correction protected");
  // The other Genesis gender remains independent.
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
  // Simulate reopening from a fresh browser with NO Genesis local cache.
  // It must show DEFAULT unambiguously until Drive reconnects, then restore
  // the exact last saved 15-joint/mask/source-pixel revision from Drive.
  await page.evaluate(()=>localStorage.removeItem("vl-genesis-master-rig-v1"));
  await page.reload({waitUntil:"domcontentloaded"});
  await page.evaluate(()=>window.VLMahlukWorkspace.show("genesis"));
  const reopenedGenesis=page.frameLocator("#genesis-frame");
  await reopenedGenesis.locator("#status").getByText(/DEFAULT GENESIS/).waitFor({timeout:65000});
  await page.locator("#drive-connect").click();
  await page.locator("#drive-connect").getByText("CONNECTED").waitFor({timeout:25000});
  await reopenedGenesis.locator("#status").getByText(/LOADED FROM DRIVE/).waitFor({timeout:65000});
  await reopenedGenesis.locator("#gender").selectOption("male");
  assert.equal(await reopenedGenesis.locator("#joint-x").inputValue(),"36",
   "Genesis reopen failed to restore latest cloud joint revision");
  const restore=await reopenedGenesis.locator("#stage").evaluate(()=>{
   const M=window.GenesisMasterRig,row=M.load("male");
   return {selected:M.decode(row.masks.se)[30*64+32],
    px:!!row.pixelFrames?.["top/custom|idle|se|0"],updated:row.updated};
  });
  assert.equal(restore.selected,3,"Genesis reopen failed to restore last saved slicing");
  assert.equal(restore.px,true,"Genesis reopen lost Pixel Editor custom source edit");
  assert.equal(restore.updated,rig.updated,"Genesis reloaded an old saved revision");
  console.log("PASS fresh browser default clearly labeled → verified Drive restore of exact last master");
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
  // Mobile: the edit surface remains scrollable at high zoom, with controls
  // inside the narrow viewport; native buffer stays 64x112.
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try{
   await mobile.goto("http://127.0.0.1:4174/virtual-life-asset-pipeline/genesis-editor.html",
    {waitUntil:"domcontentloaded",timeout:45000});
   await mobile.locator("#zoom-fit").click();
   await mobile.locator("#zoom").evaluate(input=>{
    input.value="16";input.dispatchEvent(new Event("input",{bubbles:true}));
   });
   const mobileZoom=await mobile.locator("#stage-viewport").evaluate(v=>{
    const c=document.querySelector("#stage");
    return {width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height,
     nativeWidth:c.width,nativeHeight:c.height,
     scrollableX:v.scrollWidth>v.clientWidth,scrollableY:v.scrollHeight>v.clientHeight};
   });
   assert.deepEqual(mobileZoom,{width:1024,height:1792,nativeWidth:64,nativeHeight:112,
    scrollableX:true,scrollableY:true});
   await mobile.locator("#mode-slice").click();
   await mobile.locator("#zoom-fit").click();
   const fitted=await mobile.locator("#stage-viewport").evaluate(v=>{
    const c=document.querySelector("#stage");
    return c.getBoundingClientRect().width<=v.clientWidth&&
     c.getBoundingClientRect().height<=v.clientHeight;
   });
   assert.equal(fitted,true,"Mobile Fit must show entire character");
   console.log("PASS Mobile Genesis canvas 1600% zoom / scroll / Fit");
  }finally{await mobile.close()}
  console.log("PASS Mahluk trial route → native Python preview → cloud verified save → gallery reload");
 }catch(e){
  console.error("CLOUD NATIVE QA FAILED",e.message);
  console.error("PAGE ERRORS",errors);
  throw e;
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
