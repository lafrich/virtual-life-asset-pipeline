'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('site/lgr-actor.js','utf8');
test('same face ID with new authored pixels invalidates face and prepared caches',async()=>{
 let overlay='pixels-a',prepared=0;
 const root={VLMahlukEmosiBridge:{refresh:async()=>{},apply:a=>{a.expressions=[{id:'face',source:'emosi',overlay,frames:1,frame_ms:[100]}]}},
  LGRSkin:{TONES:{light:true},rampFor:()=>[],fromKey:()=>false},LafrichPuppetCore:{validateMaster:m=>m},
  LafrichPuppetRenderer:{prepare:async(m,ch,d,img)=>({master:m,img,n:++prepared})}};
 const images=[];class Image{constructor(){images.push(this)}async decode(){}}
 let drawn;
 const document={createElement:()=>({getContext:()=>({drawImage:im=>{drawn=im.src}}),toDataURL:()=>drawn})};
 const pkg={format:'lafrich-genesis-base-v1',rig:{layers:{}},rigSha256:'hash'};
 const context={window:root,Image,document,TextEncoder,Uint8Array,crypto:{subtle:{digest:async()=>new Uint8Array()}},fetch:async url=>({json:async()=>url.endsWith('index.json')?{version:'test',bases:{male:{package:'male'},female:{package:'female'}}}:{...pkg,gender:url.endsWith('male')&&!url.endsWith('female')?'male':'female',rigSha256:''}})};
 vm.runInNewContext(source,context);const A=root.LGRActor;
 await A.refreshFaces();const old=await A.faceImage('face',0);
 assert.equal(old.img.src,'pixels-a');
 const oldPrepared=await A.prepared({gender:'male'},'se',old);
 overlay='pixels-b';await A.refreshFaces();
 const fresh=await A.faceImage('face',0),freshPrepared=await A.prepared({gender:'male'},'se',fresh);
 assert.equal(fresh.img.src,'pixels-b');assert.notEqual(fresh.key,old.key);
 assert.notEqual(freshPrepared.n,oldPrepared.n);
 const count=images.length;await A.faceImage('face',0);assert.equal(images.length,count,'unchanged face stays cached');
 A.clearCaches();await A.faceImage('face',0);assert.ok(images.length>count);
});
test('Emosi Drive adapter can be reused only from the same-origin editor frame',()=>{
 const code=fs.readFileSync('site/emosi-bridge.js','utf8');
 const drive={connected:()=>true};let frame={location:{origin:'https://example.test'},EmotionDrive:drive};
 const root={location:{origin:'https://example.test'}};
 vm.runInNewContext(code,{window:root,document:{getElementById:()=>({contentWindow:frame})}});
 assert.equal(root.VLMahlukEmosiBridge.emotionDrive(),drive);
 frame={location:{origin:'https://other.test'},EmotionDrive:drive};assert.equal(root.VLMahlukEmosiBridge.emotionDrive(),null);
 frame={get location(){throw Error('cross origin')}};assert.equal(root.VLMahlukEmosiBridge.emotionDrive(),null);
});
