'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
(async()=>{
 const files=new Map();let next=0;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({acceptDownloads:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({status:200,contentType:'text/javascript',
  body:"window.google={accounts:{oauth2:{initTokenClient(o){return{requestAccessToken(){o.callback({access_token:'mock',expires_in:3600})}}}}}};"}));
 await page.route('https://www.googleapis.com/**',async route=>{
  const q=route.request(),u=new URL(q.url()),path=u.pathname,method=q.method();
  const response=(v,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(v)});
  if(method==='GET'&&path==='/drive/v3/files'){
   const filter=u.searchParams.get('q')||'';
   const parent=/'([^']+)' in parents/.exec(filter)?.[1];
   const name=/name = '([^']+)'/.exec(filter)?.[1];
   const contains=/name contains '([^']+)'/.exec(filter)?.[1];
   const mime=/mimeType = '([^']+)'/.exec(filter)?.[1];
   return response({files:[...files.values()].filter(f=>f.parent===parent&&(!name||f.name===name)&&
    (!contains||f.name.includes(contains))&&(!mime||f.mimeType===mime))
    .map(f=>({id:f.id,name:f.name,mimeType:f.mimeType,modifiedTime:f.modifiedTime}))});
  }
  if(method==='POST'&&path==='/drive/v3/files'){
   const a=JSON.parse(q.postData()||'{}');
   const id='drive-'+(++next),record={id,name:a.name,mimeType:a.mimeType,parent:a.parents?.[0]||'root',
    modifiedTime:new Date().toISOString(),body:''};files.set(id,record);return response({id});
  }
  if(method==='PATCH'&&path.startsWith('/upload/drive/v3/files/')){
   const record=files.get(path.split('/').pop());if(!record)return response({error:{message:'Missing file'}},404);
   record.body=q.postData()||'';record.modifiedTime=new Date().toISOString();
   return response({id:record.id});
  }
  if(method==='GET'&&path.startsWith('/drive/v3/files/')&&u.searchParams.get('alt')==='media'){
   const record=files.get(path.split('/').pop());if(!record)return response({error:{message:'Missing file'}},404);
   return route.fulfill({status:200,contentType:'application/json',body:record.body});
  }
  return response({error:{message:'Unexpected: '+method+' '+path}},400);
 });
 try{
  await page.goto('http://127.0.0.1:4173/virtual-life-asset-pipeline/mahluk-hidup.html',
   {waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>!!window.MahlukCloudEntry&&!!window.google?.accounts?.oauth2);
  assert.equal(await page.evaluate(()=>window.MahlukCloudEntry.gate.isReady()),false);
  await page.evaluate(()=>localStorage.setItem('cloud-test-untouched','safe'));
  await page.getByRole('button',{name:/SYNC FROM DRIVE/i}).click();
  await page.waitForFunction(()=>window.MahlukCloudEntry.gate.isReady());
  assert.equal(await page.evaluate(()=>localStorage.getItem('cloud-test-untouched')),'safe');
  assert.equal(await page.locator('[aria-label="Cloud startup"]').count(),0);
  console.log('PASS: Drive sync gates editor and preserves browser data');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.MahlukCloudEntry&&!!window.google?.accounts?.oauth2);
  const data={id:'mh2_test',name:'Mock Character',v6p:{base:'male'}};
  const rec={app:'mahluk',kind:'character',id:data.id,data,sha256:sha(data)};
  const body={format:'membangun-universal-v1',version:1,sourceApp:'mahluk',records:[rec]};
  const packet={...body,sha256:sha(body)};
  await page.locator('input[type=file]').setInputFiles({
   name:'test-universal.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(packet))
  });
  await page.getByRole('button',{name:/CONNECT & UPLOAD IMPORT/i}).click();
  await page.waitForFunction(()=>window.MahlukCloudEntry.gate.isReady());
  assert.equal(await page.evaluate(()=>localStorage.getItem('cloud-test-untouched')),'safe');
  const stored=[...files.values()].find(x=>x.name==='character__mh2_test.json');
  assert.ok(stored,'Mahluk native Drive record missing');
  assert.equal(JSON.parse(stored.body).record.name,'Mock Character');
  console.log('PASS: Universal import uploads and reads back native Drive data before unlock');
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:/UNIVERSAL/i}).last().click();
  const download=await downloadPromise;
  assert.ok(download.suggestedFilename().includes('membangun-mahluk-universal'));
  console.log('PASS: Manual Universal export downloaded');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
