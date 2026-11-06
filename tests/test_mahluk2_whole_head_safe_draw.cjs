'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const WH=require('../site/mahluk-2/whole-head.js');
const R=require('../site/modular-rig-v2.js');
const G=require('../site/mahluk-2/rig-rules.js');

const studio=fs.readFileSync('site/mahluk-2/studio.js','utf8');
const pix=fs.readFileSync('site/mahluk-2/plane-pixel-editor.js','utf8');
const html=fs.readFileSync('site/mahluk-2/index.html','utf8');

test('Fringe, separate hair and held prop disappear from Mahluk 2 editable scene',()=>{
 for(const id of ['hair_back','hair_cap','fringe_l','fringe_mid','fringe_r','phone'])
  assert.equal(WH.EXCLUDED.has(id),true,id);
 assert.equal(WH.EXCLUDED.has('head'),false);
 assert.equal(WH.FUSED.has('head'),true);
 assert.equal(WH.FUSED.has('phone'),false);
 assert.match(studio,/WH\.EXCLUDED\.has\(b\.id\)/);
 assert.match(studio,/WH\.EXCLUDED\.has\(s\.bone\)/);
 assert.match(studio,/kind:'whole-head',bone:'head'/);
 assert.match(studio,/src=\{image:wholeHeadAtlas\(\),sx:0,sy:di\*112\}/);
 assert.doesNotMatch(studio,/\["ACCESSORIES",\["phone"\]\]/);
 assert.doesNotMatch(studio,/\["HEAD \/ FACE & ACCESSORY",\["head","emotion","glasses","hair_back"/);
 assert.match(html,/one unified 4-view pixel plane/);
});
test('Full head composites native hair and fringe in source layer order with exact 64×448 RGBA',()=>{
 const calls=[];
 const ctx={imageSmoothingEnabled:true,drawImage:(source,x,y,w,h)=>calls.push({source,x,y,w,h})};
 const canvas={width:0,height:0,getContext:()=>ctx};
 const sourceSlots=WH.PARTS.map(bone=>({bone,src:bone+'.png'}));
 const merged=WH.composite({
  slots:sourceSlots,
  allowed:()=>true,
  getNative:s=>s.src,
  getOverride:()=>null,
  createCanvas:()=>canvas
 });
 assert.equal(merged.width,64);assert.equal(merged.height,448);
 assert.equal(ctx.imageSmoothingEnabled,false);
 assert.deepEqual(calls.map(x=>x.source),WH.PARTS.map(x=>x+'.png'));
 for(const c of calls)assert.deepEqual([c.x,c.y,c.w,c.h],[0,0,64,448]);
});
test('Flattened saved head is never covered by stale fringe artwork',()=>{
 const calls=[];
 const result=WH.composite({
  slots:WH.PARTS.map(bone=>({bone})),
  allowed:()=>true,getNative:s=>s.bone,
  getOverride:id=>id==='head'?'saved-merged-head':null,
  flattened:true,
  createCanvas:()=>({getContext:()=>({drawImage:(...args)=>calls.push(args)})})
 });
 assert.equal(calls.length,1);
 assert.equal(calls[0][0],'saved-merged-head');
});
test('Legacy split head artwork is composed without deleting its saved hair pixels',()=>{
 const calls=[];
 WH.composite({
  slots:WH.PARTS.map(bone=>({bone})),allowed:()=>true,
  getNative:s=>s.bone+'.png',
  getOverride:id=>id==='head'?'legacy-head-override':id==='fringe_l'?'legacy-painted-fringe':null,
  flattened:false,
  createCanvas:()=>({getContext:()=>({drawImage:(img)=>calls.push(img)})})
 });
 assert.equal(calls[1],'legacy-head-override');
 assert.equal(calls[3],'legacy-painted-fringe');
 assert.equal(calls.length,WH.PARTS.length);
});
test('Head merge metadata round-trips through existing rig master format and old records remain valid',()=>{
 const storage=new Map();
 const store={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 const rules=G.defaults(R),parts=R.referencePose().parts;
 const saved=G.save(store,R,rules,parts,{head:'data:image/png;base64,AAAA'},true);
 assert.equal(saved.headMerged,true);
 assert.equal(G.read(store,R).headMerged,true);
 assert.equal(G.save(store,R,rules,parts).headMerged,true);
 assert.equal(G.save(store,R,rules,parts,undefined,false).headMerged,false);
 storage.delete(G.KEY);
 assert.equal(G.read(store,R),null);
});
test('Pixel editing never silently syncs other views or inherits previous ghost guide',()=>{
 assert.match(html,/id="pixelSync"> SYNC BRUSH/);
 assert.doesNotMatch(html,/id="pixelSync" checked/);
 assert.match(pix,/els\.sync\.checked=false;selection=null;moveStart=null/);
 assert.match(pix,/els\.sync\.checked=false;/);
 assert.match(pix,/els\.refView\.value="off"/);
 assert.match(pix,/onApply\(bone,atlas\.toDataURL\("image\/png"\),atlas\)/);
 assert.match(pix,/if\(dirty&&!window\.confirm/);
});
test('Always reopen exact saved 4-view PNG, not stale async decoded image or master default',()=>{
 assert.match(studio,/async function ensurePixelImages\(ids\)/);
 assert.match(studio,/await ensurePixelImages\(parts\)/);
 assert.match(studio,/const png=pixelPlanes\[id\]/);
 assert.match(studio,/if\(revision!==planeImageRevision\|\|pixelPlanes\[id\]!==png\)/);
 assert.match(studio,/general=masterDocument\(\),own=G\.sanitizePixelPlanes\(r\.pixelPlanes\|\|\{\},R\)/);
 assert.match(studio,/setPixelPlanes\(r\.driveFileId\?own:\{\.\.\.\(general\?\.pixelPlanes\|\|\{\}\),\.\.\.own\}\)/);
 assert.match(studio,/headMerged,\n  sprite:rootSheet/);
 assert.match(studio,/onApply:\(bone,png,liveAtlas\)=>setPlanePixel\(bone,png,liveAtlas\)/);
 assert.match(studio,/copy\.getContext\('2d'\)\.drawImage\(liveAtlas,0,0\)/);
 assert.match(studio,/pixelPlanes,headMerged,emotionAssetId/);
 assert.doesNotThrow(()=>new Function(studio));
});
