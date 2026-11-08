'use strict';
// Isolated browser emulation of Google Drive REST. Never touches real files.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {chromium}=require('playwright');
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
(async()=>{
 const items=new Map();let n=0,tamper=false;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({acceptDownloads:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({status:200,
  contentType:'text/javascript',body:"window.google={accounts:{oauth2:{initTokenClient(opts){return{requestAccessToken(){opts.callback({access_token:'mock-test-token',expires_in:3600})}}}}}};"}));
 await page.route('https://www.googleapis.com/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method();
  const json=(v,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(v)});
  if(method==='GET'&&path==='/drive/v3/files'){
   const q=url.searchParams.get('q')||'',name=/name = '([^']+)'/.exec(q)?.[1],parent=/^'([^']+)' in parents/.exec(q)?.[1];
   return json({files:[...items.values()].filter(x=>x.name===name&&x.parent===parent&&
    (!q.includes('mimeType = ')||q.includes("mimeType = '"+x.mimeType+"'"))).map(x=>({id:x.id,name:x.name,mimeType:x.mimeType}))});
  }
  if(method==='POST'&&path==='/drive/v3/files'){
   const o=JSON.parse(req.postData()||'{}'),x={id:'mock'+(++n),name:o.name,mimeType:o.mimeType,parent:o.parents?.[0]||'root',content:''};
   items.set(x.id,x);return json({id:x.id});
  }
  if(method==='PATCH'&&path.startsWith('/upload/drive/v3/files/')){
   const x=items.get(path.split('/').pop());if(!x)return json({error:{message:'Missing mock file'}},404);
   x.content=req.postData()||'';return json({id:x.id});
  }
  if(method==='GET'&&path.startsWith('/drive/v3/files/')&&url.searchParams.get('alt')==='media'){
   const x=items.get(path.split('/').pop());if(!x)return json({error:{message:'Missing mock file'}},404);
   let body=x.content;
   if(tamper){const v=JSON.parse(body);v.payload.savedAt='unexpected-different-upload';v.sha256=digest(JSON.stringify(v.payload));body=JSON.stringify(v)}
   return route.fulfill({status:200,contentType:'application/json',body});
  }
  return json({error:{message:'Unexpected mocked endpoint'}},400);
 });
 try{
  await page.goto('http://127.0.0.1:4173/virtual-life-asset-pipeline/mahluk-hidup.html?tab=action&legacyCloud=1',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>!!window.google?.accounts?.oauth2&&!!window.VLMahlukHubDrive);
  const dummy={
   'vl-v6p-part-overrides-v1':{customWear:'four-directions'},
   'vl-v6p-character-workflow-v1':{id:'character-dummy'},
   'vl-v6p-act-clips-v1':{clip:'animation-dummy'},
   'vl-mahluk-animation-anchor-poses-v1':{frames:[1,2,3]},
   'mahluk-action-situations-v1':{format:'mahluk-situation-database-v1',items:[{id:'action_test',name:'Dummy'}]},
   'emotion-studio-local-fallback-v1':{face:'test'}
  };
  await page.evaluate(obj=>{for(const [k,v] of Object.entries(obj))localStorage.setItem(k,JSON.stringify(v))},dummy);
  // Seed real IndexedDB in this isolated browser origin, just like Emosi.EXE.
  await page.evaluate(async()=>{
   const db=await new Promise((resolve,reject)=>{
    const r=indexedDB.open('emotion-studio-local-v1',1);
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('emotion-assets'))
     r.result.createObjectStore('emotion-assets',{keyPath:'id'})};
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
   });
   await new Promise((resolve,reject)=>{
    const tx=db.transaction('emotion-assets','readwrite');
    tx.objectStore('emotion-assets').put({id:'test_emotion',png:'data:image/png;base64,AAAA'});
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
   });db.close();
  });
  await page.locator('#drive-connect').click();
  await page.waitForFunction(()=>document.getElementById('drive-connect').textContent.includes('CONNECTED'));
  await page.locator('#drive-save').click();
  await page.waitForFunction(()=>document.getElementById('status-msg').textContent.includes('Backup verified in Google Drive'));
  const remote=[...items.values()].find(x=>x.name==='mahluk-hidup-workspace-v1.json');
  assert.ok(remote);
  const original=JSON.parse(remote.content);
  assert.equal(original.sha256,digest(JSON.stringify(original.payload)));
  for(const [k,v] of Object.entries(dummy))assert.deepEqual(JSON.parse(original.payload.local[k]),v);
  assert.deepEqual(original.payload.emotions.map(x=>x.id),['test_emotion']);
  console.log('PASS Drive mock: connect, upload, checksum, all workspace keys and Emosi IndexedDB');
  tamper=true;
  const mismatch=await page.evaluate(async()=>{try{await VLMahlukHubDrive.backup();return 'ACCEPTED'}catch(e){return e.message}});
  assert.match(mismatch,/read-back hash mismatch/i);
  tamper=false;remote.content=JSON.stringify(original);
  await page.evaluate(async()=>{
   localStorage.setItem('vl-v6p-character-workflow-v1','{"id":"wrong-device"}');
   localStorage.setItem('vl-v6p-project-catalog-v1','{"stale":true}');
   const db=await new Promise((resolve,reject)=>{
    const r=indexedDB.open('emotion-studio-local-v1',1);
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
   });
   await new Promise((resolve,reject)=>{
    const tx=db.transaction('emotion-assets','readwrite');
    tx.objectStore('emotion-assets').put({id:'stale_emotion',png:'data:image/png;base64,AAAA'});
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
   });db.close();
  });
  const download=page.waitForEvent('download',{timeout:30000});
  const info=await page.evaluate(()=>VLMahlukHubDrive.restore());
  const recovery=await download;assert.match(recovery.suggestedFilename(),/^mahluk-before-restore-/);
  assert.ok(info.keys>=Object.keys(dummy).length);
  const after=await page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),
   [...Object.keys(dummy),'vl-v6p-project-catalog-v1']);
  for(const [k,v] of Object.entries(dummy))assert.deepEqual(JSON.parse(after[k]),v);
  assert.equal(after['vl-v6p-project-catalog-v1'],null);
  const emotions=await page.evaluate(async()=>{
   const db=await new Promise((resolve,reject)=>{
    const r=indexedDB.open('emotion-studio-local-v1',1);
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
   });
   const rows=await new Promise((resolve,reject)=>{
    const tx=db.transaction('emotion-assets','readonly');
    const r=tx.objectStore('emotion-assets').getAll();
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
   });db.close();return rows.map(x=>x.id).sort();
  });
  assert.deepEqual(emotions,['test_emotion'],'Emosi IndexedDB restore left stale entries');
  console.log('PASS Drive mock: restore replaces workspace and Emosi IndexedDB, clears stale data, downloads recovery JSON');
  const before=await page.evaluate(()=>localStorage.getItem('vl-v6p-character-workflow-v1'));
  remote.content=JSON.stringify({...original,sha256:'tampered'});
  const corrupted=await page.evaluate(async()=>{try{await VLMahlukHubDrive.restore();return 'ACCEPTED'}catch(e){return e.message}});
  assert.match(corrupted,/Backup checksum mismatch/i);
  assert.equal(await page.evaluate(()=>localStorage.getItem('vl-v6p-character-workflow-v1')),before);
  console.log('PASS Drive mock: corrupted remote file rejected without losing local data');
  assert.deepEqual(errors,[]);
 }catch(e){
  console.error('DRIVE SMOKE FAILED',e.message,errors);
  await page.screenshot({path:'/tmp/mahluk-drive-smoke-failed.png',fullPage:true}).catch(()=>{});
  throw e;
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
