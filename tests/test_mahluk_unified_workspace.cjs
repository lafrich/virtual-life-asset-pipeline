'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path'),root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('one MAHLUK HIDUP.EXE landing page contains the four requested editors',()=>{
 const html=read('site/mahluk-hidup.html'),js=read('site/mahluk-hub.js');
 for(const tab of ['emotion','character','action','animation']){
  assert.ok(html.includes('data-tab="'+tab+'"'),tab);
  assert.ok(html.includes('id="'+tab+'-view"'),tab);
 }
 for(const frame of ['emotion-frame','character-frame','action-frame','motion-frame','pixel-frame'])
  assert.ok(html.includes('id="'+frame+'"'),frame);
 assert.match(js,/\/virtual-office\/emotion-studio\//);
 assert.match(js,/v6p-studio\.html\?embedded=1/);
 assert.match(js,/mahluk-action-editor\.html\?embedded=1/);
 assert.match(js,/mahluk-motion-library\.html\?embedded=1/);
 assert.match(js,/pixel-editor\.html\?source=v6p/);
 assert.match(read('site/index.html'),/mahluk-hidup\.html/);
 assert.doesNotMatch(js,/localStorage\.clear\(/);
});
test('original editor mechanics are left in place and route into the shell',()=>{
 const studio=read('site/v6p-studio.html'),pixel=read('site/pixel-editor.html'),
       pixjs=read('site/pixel-editor.js'),gallery=read('site/v6p-asset-gallery.js');
 assert.match(studio,/VLMahlukWorkspace\?\.openEditor/);
 assert.match(gallery,/VLMahlukWorkspace\?\.openEditor/);
 for(const id of ['pixelToolbarCopy','pixelToolbarPaste','pixelToolbarPasteFlip',
  'pixelSyncExisting','clip-strip','clip-ms','clip-onion','save-drive'])
  assert.ok(pixel.includes('id="'+id+'"'),id+' must survive refactor');
 for(const fn of ['persistV6pOverride','persistClipLayer','saveV6pToDrive','loadActClip'])
  assert.ok(pixjs.includes(fn),fn+' must survive refactor');
 assert.ok(read('site/emosi-bridge.js').includes('VLMahlukEmosiBridge'));
});
test('Grok motions are review-only and never silently overwrite stock gameplay',()=>{
 const shell=read('site/mahluk-motion-library.html'),copy=read('site/v6p-grok-copy.js'),
       review=read('site/v6p-motion-review.js');
 assert.match(shell,/motion-canvas/);
 assert.match(shell,/motion-frame/);
 assert.match(review,/pending_owner_review/);
 assert.match(copy,/pending_owner_review/);
 assert.match(copy,/gameplayApproved:false/);
 assert.match(copy,/action\.frames>A\.COLS/);
 assert.match(copy,/Store\.create/);
 assert.doesNotMatch(copy,/localStorage\.clear\(/);
 assert.doesNotMatch(copy,/approved_native_actions/);
});
test('action drafts bind existing animation IDs but do not publish to Jiwa',()=>{
 const html=read('site/mahluk-action-editor.html'),js=read('site/mahluk-action-editor.js');
 for(const id of ['phase-enter','phase-loop','phase-exit','action-canvas','trigger','object','save'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(js,/mahluk-action-situations-v1/);
 assert.match(js,/draft_unapproved/);
 assert.match(js,/GROK.*REVIEW/);
 assert.doesNotMatch(js,/VLMahlukHubBridge\.publish\(/);
});
test('Google Drive backup keeps a recovery copy and never stores token',()=>{
 const js=read('site/mahluk-hub-drive.js');
 for(const item of ['vl-v6p-part-overrides-v1','vl-v6p-project-catalog-v1','vl-v6p-act-clips-v1',
  'mahluk-action-situations-v1','emotion-studio-local-v1','emosi-convo-projects-v1'])
  assert.ok(js.includes(item),item);
 assert.match(js,/downloadRecovery\(current\.payload\)/);
 assert.match(js,/crypto\.subtle\.digest/);
 assert.doesNotMatch(js,/localStorage\.setItem\([^)]*token/);
 assert.match(js,/drive\.file/);
});
test('all new browser scripts parse',()=>{
 for(const file of ['site/mahluk-hub.js','site/mahluk-hub-drive.js','site/v6p-motion-review.js',
  'site/v6p-grok-copy.js','site/mahluk-action-editor.js','site/v6p-asset-gallery.js'])
  assert.doesNotThrow(()=>new Function(read(file)),file);
 const html=read('site/v6p-studio.html');
 const script=html.match(/<script>\s*\(function\(\)\{([\s\S]*?)<\/script>/);
 assert.ok(script);
 assert.doesNotThrow(()=>new Function('(function(){'+script[1]),'studio inline browser script');
});
