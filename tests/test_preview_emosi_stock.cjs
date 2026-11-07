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
  assert.doesNotMatch(js,/emotion-studio\/catalog\.json/);
  assert.ok(fs.existsSync(path.join(root,"site/emotion-studio/catalog.json")));
  assert.ok(fs.existsSync(path.join(root,"site/emotion-studio/archive/universal-starter-templates.catalog.json")));
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





