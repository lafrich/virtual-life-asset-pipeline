'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('site/v6p-studio.html'),wizard=read('site/v6p-character-wizard.js');
test('five-step Character wizard is the default visible interface, not technical V6P controls',()=>{
 for(const screen of ['home','base','customize','preview','save'])
  assert.match(html,new RegExp('id="wizard-'+screen+'"'));
 for(const id of ['wizard-start-new','wizard-start-modify','wizard-back','wizard-next',
  'wizard-part-nav','wizard-part-host','wizard-preview-slot','wizard-save-pane','wizard-live-canvas'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/v6p-character-wizard\.js/);
 assert.doesNotMatch(html,/<script src="\.\/v6p-character-workflow\.js/);
 assert.match(html,/body\.wizard-ready #character-flow/);
});
test('Back follows previous step and edit-existing skips Choose Base',()=>{
 assert.match(wizard,/const STORE="mahluk-character-wizard-v1"/);
 assert.match(wizard,/ORDER=\["home","base","customize","preview","save"\]/);
 assert.match(wizard,/const prior=\{base:"home",customize:state\.mode==="modify"\?"home":"base",preview:"customize",save:"preview"\}/);
 assert.match(wizard,/\$\("wizard-back"\)\.onclick=back/);
 assert.match(wizard,/sessionStorage\.setItem\(STORE/);
 assert.match(wizard,/restoreStep\(\)/);
 assert.match(wizard,/H\.open\(row\)/);
});
test('existing native controls are moved, not replaced by fake dropdowns',()=>{
 for(const id of ['body','skin','hair','top','pants','shoes','facial','studio-accessory',
  'char-name','save','qa-animation','qa-frame','qa-play','workflow-list','workflow-source'])
  assert.ok(html.includes('id="'+id+'"'),id);
 for(const expression of ['move("workflow-list","wizard-existing-slot")',
  'move("workflow-source","wizard-base-slot")',
  'field(body,"body")','field(hair,"hair")','field(top,"top")',
  'field(pants,"pants")','field(shoes,"shoes")','move("char-name","wizard-name-slot")'])
  assert.ok(wizard.includes(expression),expression);
 assert.match(wizard,/const wrap=node\.closest\("\.row"\)\|\|node/);
 assert.match(wizard,/document\.body\.classList\.add\("wizard-ready"\)/);
});
test('Preview actually generates frame data, reviews four directions, and corrects chosen frame',()=>{
 assert.match(wizard,/R\.generateCharacter\(info\.id/);
 assert.match(wizard,/await H\.open\(S\.get\(info\.id\)\)/);
 assert.match(wizard,/H\.qa\(action,state\.frame\)/);
 assert.match(wizard,/H\.edit\(select\.value,cv\.dataset\.qaDir,\$\("qa-animation"\)\.value,state\.frame\)/);
 assert.match(wizard,/await H\.publish\(\)/);
 assert.match(wizard,/if\(!saved\|\|!saved\.id\)throw Error/);
 assert.match(html,/async publish\(\)\{return await save\(\)\}/);
 assert.ok(html.includes('return {...result.record,storageMode:result.stored'), 'Save must communicate published archive storage mode to wizard');
});
test('Character Pixel Editor stays in Character tab and can return without losing wizard state',()=>{
 const hub=read('site/mahluk-hub.js'),shell=read('site/mahluk-hidup.html'),pixel=read('site/pixel-editor.js');
 assert.match(shell,/id="character-pixel-overlay"/);
 assert.match(shell,/id="character-pixel-back"/);
 // A motion coming from Animation must stay in Animation; character edits stay here.
  assert.match(hub,/\$\("character-pixel-overlay"\)\.hidden=false/);
 assert.doesNotMatch(hub,/animation-pixel-overlay|mahluk-animation-studio/);
 assert.match(hub,/async function closeCharacterPixel\(\)/);
 assert.match(hub,/VirtualLifePixelEditor\?\.flush\?\.\(\)/);
 assert.match(hub,/\$\("character-pixel-back"\)\.onclick/);
 assert.match(pixel,/hub\.closeAnimationPixel:hub\.closeCharacterPixel/);
 assert.match(wizard,/storeStep\(\);H\.edit/);
});
test('Emosi remains available while active Character/Animation/Action are routed to Lafrich Puppet',()=>{
 assert.match(html,/window\.parent\.VLMahlukWorkspace\.show\("emotion"\)/);
 const hub=read('site/mahluk-hub.js');
 assert.match(hub,/action:"\.\/lafrich-puppet-studio\.html\?embedded=1&mode=animation/);
 assert.match(hub,/animation:"\.\/lafrich-puppet-studio\.html\?embedded=1&mode=animation/);
 assert.match(hub,/character:"\.\/lafrich-puppet-studio\.html\?embedded=1&mode=character/);
});
test('all modified browser JavaScript and inline studio scripts parse',()=>{
 for(const file of ['site/v6p-character-wizard.js','site/mahluk-hub.js','site/pixel-editor.js'])
  assert.doesNotThrow(()=>new Function(read(file)),file);
 for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)){
  if(match[1].trim())assert.doesNotThrow(()=>new Function(match[1]),'inline Character script');
 }
});
