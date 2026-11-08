'use strict';
// Mobile viewport acceptance: nested Animation iframe fills the app and the
// Gallery/Setup/Frame Editor scroll inside the iframe instead of being clipped.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT='http://127.0.0.1:4173/virtual-life-asset-pipeline';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const viewport of [{width:1280,height:900},{width:360,height:640},{width:412,height:850}]){
   const isMobile=viewport.width<600;
   const context=await browser.newContext({viewport,deviceScaleFactor:isMobile?2:1,isMobile,hasTouch:isMobile});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({status:200,
    contentType:'text/javascript',body:'window.google={accounts:{oauth2:{initTokenClient(){return {requestAccessToken(){}}}}}};'}));
   try{
    await page.goto(ROOT+'/mahluk-hidup.html?tab=animation&legacyCloud=1',{waitUntil:'domcontentloaded',timeout:45000});
    const inner=page.frameLocator('#motion-frame');
    await inner.locator('#animation-home:not([hidden])').waitFor({timeout:65000});
    const metrics=await page.evaluate(()=>{
     const bounds=id=>{const r=document.getElementById(id).getBoundingClientRect();
      return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};
     return {workspace:bounds('workspace'),view:bounds('animation-view'),
      pane:bounds('motion-pane'),frame:bounds('motion-frame'),footer:bounds('status')};
    });
    const btn=await inner.locator('#animation-start-new').boundingBox();
    const clickTarget=btn&&await page.evaluate(({x,y})=>{
      const node=document.elementFromPoint(x,y);
      return {id:node?.id||'',tag:node?.tagName||'',className:typeof node?.className==='string'?node.className:''};
    },{x:btn.x+btn.width/2,y:btn.y+btn.height/2});
    console.log('ANIMATION FRAME DIAGNOSTIC '+JSON.stringify({viewport,metrics,button:btn,hit:clickTarget}));
    assert.ok(metrics.view.height>250,'Animation view collapsed on mobile: '+JSON.stringify(metrics));
    assert.ok(metrics.pane.height>=metrics.view.height-2,'Animation pane does not fill view: '+JSON.stringify(metrics));
    assert.ok(metrics.frame.height>=metrics.view.height-3,'Animation iframe clips content: '+JSON.stringify(metrics));
    assert.ok(metrics.frame.bottom<=metrics.footer.y+2,'Animation iframe overlaps footer');
    const scroll=await inner.locator('body').evaluate(()=>{
     const el=document.scrollingElement;
     return {height:el.scrollHeight,client:el.clientHeight,
      overflowY:getComputedStyle(document.body).overflowY};
    });
    let scrolled=0;
    if(isMobile){
     if(scroll.height>scroll.client+40){
      await inner.locator('#animation-start-new').hover();
      await page.mouse.wheel(0,500);
      await page.waitForTimeout(180);
      scrolled=await inner.locator('body').evaluate(()=>document.scrollingElement.scrollTop);
      assert.ok(scrolled>15,'Swipe/wheel could not scroll overflowing Animation Gallery: '+scrolled);
     }else{
      // A tall phone may fit the whole Home gallery; it must not be
      // artificially scrollable just to satisfy the shorter-phone test.
      assert.equal(scroll.overflowY,'auto');
      assert.ok((await inner.locator('#animation-start-new').boundingBox()).height>30);
     }
    }
    await inner.locator('#animation-start-new').click();
    await inner.locator('#animation-setup:not([hidden])').waitFor();
    await inner.locator('#setup-name').fill('Mobile Screen Test');
    // The old #gender control is deliberately hidden; choose the real Genesis source.
    await inner.locator('#source-character').selectOption('base:female');
    await inner.locator('#template').selectOption('sit');
    await inner.locator('#setup-create').click();
    await inner.locator('#animation-workspace:not([hidden])').waitFor({timeout:65000});
    await inner.locator('#stage').waitFor({state:'visible',timeout:65000});
    const editorHeight=await inner.locator('body').evaluate(()=>document.scrollingElement.scrollHeight);
    assert.ok(editorHeight>metrics.frame.height+60,'Editor content should scroll on mobile');
    await inner.locator('#save').scrollIntoViewIfNeeded();
    assert.equal(await inner.locator('#save').isVisible(),true,'Save Online inaccessible beneath mobile editor');
    await inner.locator('#animation-editor-back').click();
    await inner.locator('#animation-home:not([hidden])').waitFor();
    assert.deepEqual(errors,[],'Browser errors');
    console.log('PASS viewport Animation '+viewport.width+'×'+viewport.height+
     ' iframe='+Math.round(metrics.frame.height)+'px scroll='+Math.round(scrolled)+
     ' Gallery→Setup→Frame Editor→Back');
   }catch(err){
    console.error('MOBILE LAYOUT ERROR '+viewport.width+'×'+viewport.height,err);
    await page.screenshot({path:'/tmp/mahluk-mobile-animation-'+viewport.width+'.png',fullPage:true}).catch(()=>{});
    throw err;
   }finally{await context.close()}
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
