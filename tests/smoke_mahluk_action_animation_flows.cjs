'use strict';
/* Browser acceptance, simulated Google Drive account. Nothing is written to
   the user's real Google account. Requires Save Online, cloud reload,
   Pixel Editor-free Animation UX, and crisp Action camera controls. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root='http://127.0.0.1:4173/virtual-life-asset-pipeline';
(async()=>{
 const files=new Map();let counter=0;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({
  status:200,contentType:'text/javascript',
  body:"window.google={accounts:{oauth2:{initTokenClient(o){return{requestAccessToken(){o.callback({access_token:'test-token',expires_in:3600})}}}}}};"
 }));
 await page.route('https://www.googleapis.com/**',async route=>{
  const req=route.request(),u=new URL(req.url()),p=u.pathname,method=req.method();
  const reply=(obj,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(obj)});
  if(method==='GET'&&p==='/drive/v3/files'){
   const q=u.searchParams.get('q')||'';
   const name=/name = '([^']+)'/.exec(q)?.[1],prefix=/name contains '([^']+)'/.exec(q)?.[1];
   const parent=/'([^']+)' in parents/.exec(q)?.[1];
   const list=[...files.values()].filter(x=>x.parent===parent&&
    (!name||x.name===name)&&(!prefix||x.name.includes(prefix))&&
    (!q.includes('mimeType = ')||q.includes("mimeType = '"+x.mimeType+"'")));
   return reply({files:list.map(({id,name,mimeType})=>({id,name,mimeType}))});
  }
  if(method==='POST'&&p==='/drive/v3/files'){
   const v=JSON.parse(req.postData()||'{}'),x={id:'fake'+(++counter),name:v.name,
    parent:v.parents?.[0]||'root',mimeType:v.mimeType,content:''};
   files.set(x.id,x);return reply({id:x.id});
  }
  if(method==='PATCH'&&p.startsWith('/upload/drive/v3/files/')){
   const x=files.get(p.split('/').pop());
   if(!x)return reply({error:'missing'},404);
   x.content=req.postData()||'';return reply({id:x.id});
  }
  if(method==='GET'&&p.startsWith('/drive/v3/files/')&&u.searchParams.get('alt')==='media'){
   const x=files.get(p.split('/').pop());if(!x)return reply({error:'missing'},404);
   return route.fulfill({status:200,contentType:'application/json',body:x.content});
  }
  return reply({error:'unrecognized Google Drive endpoint',path:p,method},400);
 });
 function record(kind){
  const f=[...files.values()].find(x=>x.name.startsWith(kind+'__')&&x.name.endsWith('.json'));
  return f?JSON.parse(f.content)?.record:null;
 }
 try{
  await page.goto(root+'/mahluk-hidup.html?tab=action&legacyCloud=1',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>!!window.VLMahlukHubDrive&&!!window.google?.accounts?.oauth2);
  await page.locator('#drive-connect').click();
  await page.locator('#drive-connect').getByText('CONNECTED').waitFor({timeout:15000});
  // The Action Editor intentionally has no stock male/female mannequins.
  // Create two *draft clones* of the approved Genesis templates in the
  // Character workspace first. This is all mock Drive + isolated test RAM;
  // neither the immutable base artwork nor any real account is modified.
  await page.evaluate(()=>window.VLMahlukWorkspace.show('character'));
  const initialCharacter=page.frameLocator('#character-frame');
  await initialCharacter.locator('body.wizard-ready').waitFor({timeout:65000});
  const genesisIds=await page.evaluate(()=>{
   const w=document.getElementById('character-frame').contentWindow;
   const store=w.V6PCharacterStore,base=w.V6PGenesisBase;
   assertGenesisReady();
   function assertGenesisReady(){
    if(!store||!base||!base.get('male')||!base.get('female'))
     throw Error('Approved Genesis templates unavailable');
   }
   return ['male','female'].map(gender=>{
    const draft=store.create({name:'Action Test Genesis '+gender,gender});
    const cloned=base.install(store,draft.id,gender);
    if(cloned.faceId!==''||!Object.keys(cloned.parts||{}).some(p=>p.startsWith('top/custom')))
     throw Error('Genesis draft missing custom layers or blank Emosi face');
    return cloned.id;
   });
  });
  assert.equal(genesisIds.length,2);
  assert.notEqual(genesisIds[0],genesisIds[1]);

  await page.evaluate(()=>window.VLMahlukWorkspace.show('action'));
  const a=page.frameLocator('#action-frame');
  await a.locator('#action-home:not([hidden])').waitFor({timeout:65000});
  // Action may already be open from the initial route, before Character
  // created these drafts. The Choose screen must refresh against shared RAM.
  await a.locator('#action-start-new').click();
  await a.locator('#action-choose:not([hidden])').waitFor();
  const actorOptions=await a.locator('#choose-actor option').evaluateAll(options=>
   options.map(o=>({value:o.value,label:o.textContent})));
  assert.ok(genesisIds.every(id=>actorOptions.some(o=>o.value===id)),
   'Both created Genesis actors must appear in Action: '+JSON.stringify(actorOptions));
  assert.equal(actorOptions.some(o=>o.value.startsWith('base:')),false,
   'Stock base mannequins must never be shown in Action');
  await a.locator('#choose-actor').selectOption(genesisIds[0]);
  await a.locator('#choose-add').click();
  await a.locator('#choose-actor').selectOption(genesisIds[1]);
  await a.locator('#choose-add').click();
  assert.equal(await a.locator('#choose-cast-list button').count(),2);
  await a.locator('#choose-next').click();
  await a.locator('#action-workspace:not([hidden])').waitFor();
  assert.equal(await a.locator('#cast-list button').count(),2);
  await a.locator('#action-name').fill('Two Character Dialogue');
  await a.locator('#phase-loop').selectOption('native:talk');
  const cv=a.locator('#action-canvas'),box=await cv.boundingBox();
  assert.ok(box,'Action canvas visible');
  const sx=box.x+(40+109+48)*box.width/576,sy=box.y+(164+19+80)*box.height/400;
  await page.mouse.move(sx,sy);await page.mouse.down();
  await page.mouse.move(sx+28,sy+11,{steps:6});await page.mouse.up();
  const offset=Number(await a.locator('#offset-x').inputValue());
  assert.ok(offset>149,'Dragged actor position wrong: '+offset);
  // Camera controls must change preview only, never actor/world placement.
  await a.locator('#scene-grid').check();
  await a.locator('#scene-zoom-in').click();
  assert.equal(await a.locator('#scene-zoom-value').textContent(),'125%');
  assert.equal(await a.locator('#scene-grid').isChecked(),true);
  await a.locator('#scene-fit').click();
  assert.equal(await a.locator('#scene-zoom-value').textContent(),'100%');
  assert.equal(Number(await a.locator('#offset-x').inputValue()),offset);
  console.log('PASS Action zoom, Fit, grid, native pixel preview and drag remain independent');
  // Native frame is copied to the same pixel editing engine as Emosi.
  // Only actor 2, LOOP/native:talk/SE/F0 receives the correction.
  await a.locator('#edit-motion').click();
  await a.locator('#pixelOverlay:not([hidden])').waitFor({timeout:55000});
  await a.locator('#pixelTitle').getByText(/ACTION TEST GENESIS FEMALE.*F1/i).waitFor({timeout:15000});
  await a.locator('#pixelColor').fill('#ff00f0');
  const pixelBox=await a.locator('#pixelCanvas').boundingBox();
  assert.ok(pixelBox,'Action scene pixel editor canvas missing');
  await page.mouse.click(pixelBox.x+pixelBox.width*20/64,pixelBox.y+pixelBox.height*50/112);
  await a.locator('#pixelApply').click();
  await a.locator('#pixelOverlay').waitFor({state:'hidden',timeout:15000});
  assert.match(await a.locator('#status').textContent(),/FRAME EDIT APPLIED/);
  await a.locator('#save').click();
  await a.locator('#action-home:not([hidden])').waitFor({timeout:30000});
  assert.match(await a.locator('#action-home-note').textContent(),/CLOUD VERIFIED/);
  const action=record('action');
  assert.ok(action&&action.actors.length===2,'Action not uploaded to Drive');
  assert.deepEqual(action.actors.map(actor=>actor.characterId),genesisIds,
   'Online action must reference the two real Genesis-derived character IDs');
  assert.equal(action.actors[1].loop,'native:talk');
  assert.equal(Object.keys(action.actors[0].frameEdits||{}).length,0,'Other actor frame was modified');
  const editedFrame=action.actors[1].frameEdits?.['loop|native:talk|se|f0'];
  assert.match(editedFrame||'',/^data:image\/png;base64,/,'Edited Action frame not saved in scene');
  const corrected=await page.evaluate(async png=>{
   const img=new Image();img.src=png;await img.decode();
   const cv=document.createElement('canvas');cv.width=64;cv.height=112;
   const g=cv.getContext('2d');g.drawImage(img,0,0);
   return Array.from(g.getImageData(20,50,1,1).data);
  },editedFrame);
  assert.deepEqual(corrected,[255,0,240,255],'Painted magenta pixel not preserved in Action');

  assert.ok(action.actors[1].x>149);
  assert.equal(await page.evaluate(()=>localStorage.getItem('mahluk-action-situations-v1')),null,
   'Action full payload was persisted to localStorage despite Cloud Save');
  await a.locator('#action-gallery button').filter({hasText:'Two Character Dialogue'}).click();
  await a.locator('#action-workspace:not([hidden])').waitFor();
  // Pixel corrections must still be editable when the action is reopened.
  await a.locator('#cast-list button').nth(1).click();
  await a.locator('#edit-motion').click();
  await a.locator('#pixelOverlay:not([hidden])').waitFor({timeout:55000});
  const reopened=await a.locator('#pixelCanvas').evaluate(canvas=>{
   // Drawing surface is scaled, but its source atlas remains true 64x112.
   const data=canvas.getContext('2d').getImageData(20*6,50*6,1,1).data;
   return Array.from(data);
  });
  assert.ok(reopened[0]>=200&&reopened[2]>=150,
   'Previously saved magenta frame not restored in editor: '+reopened);
  await a.locator('#pixelClose').click();
  await a.locator('#save').click();
  await a.locator('#action-home:not([hidden])').waitFor();
  console.log('PASS Action Create / Multi-cast / Drag / Save Online / Gallery / Modify');

  await page.evaluate(()=>window.VLMahlukWorkspace.show('animation'));
  const m=page.frameLocator('#motion-frame');
  await m.locator('#home:not([hidden])').waitFor({timeout:65000});
  assert.equal(await page.locator('#animation-pixel-overlay').count(),0,'Old cutout Pixel Editor must be removed');
  await m.locator('#start-create').click();
  await m.locator('#setup:not([hidden])').waitFor();
  await m.locator('#template').selectOption('sit');
  await m.locator('#setup-name').fill('Test Sitting Activity');
  await m.locator('#setup-continue').click();
  await m.locator('#editor:not([hidden])').waitFor({timeout:65000});
  assert.ok(await m.locator('#timeline button').count()>=2);
  assert.equal(await m.locator('#stage').getAttribute('width'),'64');
  await m.locator('#direction-buttons button').filter({hasText:'NE'}).click();
  await m.locator('#timeline button').nth(1).click();
  await m.locator('#joint-list button[data-joint=hand_near]').click();
  await m.locator('#joint-x').fill('29');
  await m.locator('#joint-x').press('Tab');
  await m.locator('#status').getByText(/NATIVE PYTHON PREVIEW/).waitFor({timeout:150000});
  await m.locator('#save-cloud').click();
  await m.locator('#status').getByText(/CLOUD VERIFIED/).waitFor({timeout:45000});
  const anim=record('animation');
  assert.equal(anim.format,'genesis-v6b-native-animation-v1');
  assert.match(anim.python,/GENESIS_V6B_ANIMATION = r'''/);
  assert.equal(anim.poses.ne[1].joints.hand_near.x,29);
  assert.equal(anim.status,'source_saved_not_installed');
  assert.equal(await page.evaluate(()=>localStorage.getItem('vl-v6p-act-clips-v1')),null,
   'Native Python source should not write legacy browser motion clips');
  await m.locator('#back-home').click();
  await m.locator('#gallery button').filter({hasText:'Test Sitting Activity'}).waitFor({timeout:30000});
  console.log('PASS Animation native Python create → 4-view anatomy → real preview → Save Cloud');

  // Character uses the same cloud-first Save, including custom character sheets.
  await page.evaluate(()=>window.VLMahlukWorkspace.show('character'));
  const ch=page.frameLocator('#character-frame');
  await ch.locator('body.wizard-ready').waitFor({timeout:65000});
  await ch.locator('#wizard-home:not([hidden])').waitFor({timeout:65000});
  await ch.locator('#wizard-start-new').click();
  await ch.locator('#workflow-source').selectOption('base:male');
  await ch.locator('#wizard-next').click();
  await ch.locator('#wizard-customize:not([hidden])').waitFor({timeout:65000});
  await ch.locator('#wizard-next').click();
  await ch.locator('#wizard-preview:not([hidden])').waitFor({timeout:65000});
  await ch.locator('#wizard-next').click();
  await ch.locator('#wizard-save:not([hidden])').waitFor({timeout:65000});
  await ch.locator('#char-name').fill('Cloud Saved Male');
  await ch.locator('#wizard-next').click();
  await ch.locator('#wizard-save-success.visible').waitFor({timeout:65000});
  const published=record('character');
  assert.equal(published?.name,'Cloud Saved Male');
  assert.ok(published.clips?.walk?.sheet?.startsWith('data:image/png;base64,'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('mahluk-2-library-v1')),null,
    'Character was saved in browser localStorage instead of Drive');
  console.log('PASS Character Save Online with complete native animation sheets in Drive');

  // New browser load must fetch the online database, not reuse the in-page RAM.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#drive-connect').click();
  await page.locator('#drive-connect').getByText('CONNECTED').waitFor({timeout:15000});
  // The app preserves the last selected tab in the URL (Animation).
  // Explicitly select Action before asserting that its lazy iframe loaded.
  await page.evaluate(()=>window.VLMahlukWorkspace.show('action'));
  const again=page.frameLocator('#action-frame');
  await again.locator('#action-home:not([hidden])').waitFor({timeout:45000});
  await again.locator('#action-gallery button').filter({hasText:'Two Character Dialogue'}).waitFor({timeout:30000});
  await page.evaluate(()=>window.VLMahlukWorkspace.show('animation'));
  const againAnim=page.frameLocator('#motion-frame');
  await againAnim.locator('#gallery button').filter({hasText:'Test Sitting Activity'}).waitFor({timeout:30000});
  await page.evaluate(()=>window.VLMahlukWorkspace.show('character'));
  const freshCh=page.frameLocator('#character-frame');
  await freshCh.locator('body.wizard-ready').waitFor({timeout:65000});
  await freshCh.locator('#wizard-tab-gallery').click();
  await freshCh.locator('#wizard-gallery-grid').getByText('Cloud Saved Male').waitFor({timeout:30000});
  assert.deepEqual(errors,[]);
  console.log('PASS Reload from Google Drive cloud database; no local browser copy required');
 }catch(error){
  console.error('ACTION/ANIMATION FLOW ERROR',error.message);
  console.error('PAGE ERRORS',errors);
  await page.screenshot({path:'/tmp/mahluk-action-animation-flows-failed.png',fullPage:true}).catch(()=>{});
  throw error;
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
