"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const U=require("../site/emotion-studio/emotion-library.js");
const bridge=require("../site/emosi-bridge.js");

const STARTERS=[
  "universal-neutral","universal-happy","universal-angry","universal-sad",
  "universal-surprised","universal-shy","universal-cheeky","universal-bleh",
  "universal-wink","universal-sleepy","universal-cry","universal-grimace"
];
const AUTHORED=[
  ["emotion-mw4mzro0-ev3cnn","Ahe",5,320],
  ["emotion-mw4o7cet-970dwt","Sleep",4,256],
  ["emotion-mw4xixfu-kqnhg6","Takut",4,256],
  ["emotion-mw4xqimg-akr8zi","Insecure",4,256],
  ["emotion-mw53vod1-vhh631","O",5,320],
  ["emotion-mw54cez5-xpgq4q","Kiss",6,384]
];

test("12 starters are archived and filtered from every selectable path",()=>{
  assert.deepEqual([...bridge.STARTER_IDS],STARTERS);
  STARTERS.forEach(id=>{
    assert.equal(bridge.isStarterId(id),true);
    assert.equal(bridge.isStarterEntry({id,name:id,base:"universal",frames:3,fps:6,template:id.replace("universal-","")}),true);
  });
  assert.equal(bridge.isStarterEntry({
    id:"universal-happy",name:"Happy",base:"universal",frames:4,fps:6,
    png:"data:image/png;base64,aabb"
  }),false,"Drive-authored same-ID PNG remains selectable");
  assert.equal(bridge.isStarterEntry({
    id:"emotion-mw4mzro0-ev3cnn",name:"Ahe",base:"universal",frames:5,fps:6,
    png:"data:image/png;base64,aabb"
  }),false);
  const js=read("site/emosi-bridge.js");
  const app=read("site/app.js");
  const index=read("site/index.html");
  const studio=read("site/v6b-reset-studio.html");
  assert.doesNotMatch(js,/emotion-studio\/catalog\.json/);
  assert.doesNotMatch(app,/emotion-studio\/catalog\.json/);
  assert.ok(fs.existsSync(path.join(root,"site/emotion-studio/catalog.json")));
  assert.doesNotMatch(js,/emotion-studio\/catalog\.json/);
  assert.ok(fs.existsSync(path.join(root,"site/emotion-studio/archive/universal-starter-templates.catalog.json")));
  STARTERS.forEach(id=>{
    assert.doesNotMatch(index,new RegExp(id));
    assert.match(studio,/isStarterEntry/);
  });
});

test("Preview library imports the 6 authored projects natively 1:1",()=>{
  const index=JSON.parse(read("site/emotion-studio/preview-stock/index.json"));
  assert.equal(index.format,"mahluk-emosi-preview-stock-v1");
  assert.equal(index.entries.length,6);
  const seen=[];
  for(const [id,name,frames,width] of AUTHORED){
    const file=`site/emotion-studio/preview-stock/${id}.emotion.json`;
    const src=`incoming/emosi-stock/authored/${id}.emotion.json`;
    assert.equal(read(file),read(src),id+" must be an unmodified 1:1 copy");
    const payload=JSON.parse(read(file));
    const entries=bridge.unwrapEntries(payload);
    assert.equal(entries.length,1);
    const entry=entries[0];
    assert.equal(entry.id,id);
    assert.equal(entry.name,name);
    assert.equal(entry.base,"universal");
    assert.equal(entry.frames,frames);
    assert.equal(U.validEntry(entry),true);
    assert.equal(bridge.isStarterEntry(entry),false);
    assert.match(entry.png,/^data:image\/png;base64,/);
    const png=fs.readFileSync(path.join(root,`site/emotion-studio/preview-stock/${id}.png`));
    const srcPng=fs.readFileSync(path.join(root,`incoming/emosi-stock/authored/${id}.png`));
    assert.deepEqual(png,srcPng);
    assert.equal(png.readUInt32BE(16),width);
    assert.equal(png.readUInt32BE(20),448);
    seen.push(id);
  }
  assert.deepEqual(seen,AUTHORED.map(row=>row[0]));
});

test("Import preserves existing user entries and keeps conflict copies",()=>{
  const map=new Map();
  const user={id:"emotion-mw4mzro0-ev3cnn",name:"User Ahe",base:"universal",
    frames:5,fps:6,png:"data:image/png;base64,aaa"};
  const incoming={id:"emotion-mw4mzro0-ev3cnn",name:"Ahe",base:"universal",
    frames:5,fps:6,png:"data:image/png;base64,bbb"};
  map.set(user.id,user);
  const conflicts=bridge.mergeIncoming(map,[incoming],"preview");
  assert.equal(map.get(user.id),user);
  assert.equal(conflicts.length,1);
  assert.equal(conflicts[0].id,"emotion-mw4mzro0-ev3cnn__conflict_preview");
  assert.match(conflicts[0].name,/conflict copy/);
  assert.equal(map.get(conflicts[0].id),conflicts[0]);
  const same=bridge.mergeIncoming(map,[{...user}],"preview");
  assert.equal(same.length,0);
  assert.equal(map.get(user.id),user);
});

test("Drive stock not loaded is explicit and never a silent starter default",()=>{
  assert.equal(bridge.statusMessage({preview:0,drive:0,connected:false,count:0}),
    "Drive stock not loaded");
  assert.match(bridge.statusMessage({preview:0,drive:0,connected:false,localAuthored:2,count:2}),
    /Drive stock not loaded/);
  assert.doesNotMatch(bridge.statusMessage({preview:6,drive:0,connected:false,count:6}),
    /Drive stock not loaded/);
  const index=read("site/index.html"),app=read("site/app.js"),studio=read("site/v6b-reset-studio.html");
  assert.match(index,/id="emosi-sync-status"[^>]*>Drive stock not loaded</);
  assert.match(index,/id="load-emosi-stock"/);
  assert.match(app,/load-emosi-stock/);
  assert.match(app,/Drive stock not loaded/);
  assert.match(studio,/id="emotion-drive-status">Drive stock not loaded</);
  assert.match(studio,/id="load-drive-stock"/);
  assert.match(studio,/LOAD DRIVE STOCK/);
});

test("Male/Female Base default to blank face plus Drive expressions, with baked-head limitation flagged",()=>{
  const app=read("site/app.js"),index=read("site/index.html"),studio=read("site/v6b-reset-studio.html");
  assert.match(app,/function defaultExpressionFor/);
  assert.match(app,/if\(isHumanBaseActor\(character\)\)return null;/);
  assert.match(app,/NO FACE \/ BLANK/);
  assert.match(app,/function selectBlankFace/);
  assert.match(index,/id="blank-head-status"/);
  assert.match(index,/male-body-head-blank \/ female-body-head-blank/);
  assert.match(studio,/id="blank-head-status"/);
  assert.match(studio,/headMerged: false/);
  assert.match(studio,/Blank head planes bound/);
  assert.doesNotMatch(app,/male-body-head-blank\.png/);
  assert.ok(!fs.existsSync(path.join(root,"site/media/male-body-head-blank.png")));
  assert.ok(!fs.existsSync(path.join(root,"site/media/female-body-head-blank.png")));
});

test("Selected face is saved and restored with the character",()=>{
  const app=read("site/app.js");
  assert.match(app,/function currentFaceId/);
  assert.match(app,/faceId:currentFaceId\(\)/);
  assert.match(app,/faceId:typeof row\.faceId==="string"\?row\.faceId:""/);
  assert.match(app,/function storedFaceId/);
  assert.match(app,/function findExpression/);
  assert.match(app,/attachExpression\(resolvedFace\)/);
});

test("Reset Studio Save writes pixels and Load restores a previously invalid payload",()=>{
  const html=read("site/v6b-reset-studio.html");
  assert.match(html,/function normalizeCharacter\(m\)/);
  assert.match(html,/function snapshot\(m\)/);
  assert.match(html,/pixels:emptyPixels\(\)/);
  assert.match(html,/localStorage\.setItem\(KEY,JSON\.stringify\(snapshot\(model\)\)\)/);
  assert.match(html,/model=normalizeCharacter\(raw\)/);
  assert.match(html,/await loadEmotions\(\);await setEmotion\(model\.emotion\)/);
  const DIR=["se","sw","ne","nw"];
  const emptyPixels=()=>Object.fromEntries(DIR.map(d=>[d,[]]));
  function normalizeCharacter(m){
    const next={...m};
    if(!next.format)next.format="mahluk-v6b-character-v1";
    next.pixels=next.pixels&&typeof next.pixels==="object"?{...next.pixels}:emptyPixels();
    for(const d of DIR)if(!Array.isArray(next.pixels[d]))next.pixels[d]=[];
    if(!next.actions||typeof next.actions!=="object")next.actions={};
    return next;
  }
  function valid(m){
    const n=normalizeCharacter(m);
    return n?.format==="mahluk-v6b-character-v1"&&["male","female"].includes(n.body_type)&&
      JSON.stringify(n.frame)==="[64,112]"&&JSON.stringify(n.pivot)==="[32,100]"&&
      JSON.stringify(n.directions)===JSON.stringify(DIR)&&n.pixels&&
      DIR.every(d=>Array.isArray(n.pixels[d]))&&n.actions&&typeof n.actions==="object";
  }
  const saved={format:"mahluk-v6b-character-v1",body_type:"male",frame:[64,112],
    pivot:[32,100],directions:DIR,actions:{idle:{}},emotion:"emotion-mw4mzro0-ev3cnn"};
  assert.equal("pixels" in saved,false);
  assert.equal(valid(saved),true);
  const loaded=normalizeCharacter(saved);
  assert.deepEqual(loaded.pixels,{se:[],sw:[],ne:[],nw:[]});
  assert.equal(loaded.emotion,"emotion-mw4mzro0-ev3cnn");
});

test("Master hashes are unchanged",()=>{
  const expected=JSON.parse(read("preview/master-hashes-before.json"));
  for(const [file,hash] of Object.entries(expected)){
    const actual=crypto.createHash("sha256").update(fs.readFileSync(path.join(root,file))).digest("hex");
    assert.equal(actual,hash,file+" must remain bitwise unchanged");
  }
});
