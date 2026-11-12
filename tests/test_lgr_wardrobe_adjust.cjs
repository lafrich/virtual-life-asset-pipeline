/* Genesis Outfit Adjust: native 24-variant draft packaging and UI wiring. */
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs");
const root="site/";
const src=fs.readFileSync(root+"lgr-wardrobe-adjust.js","utf8");
const page=fs.readFileSync(root+"lgr-wardrobe-adjust.html","utf8");
const bridge=fs.readFileSync(root+"mahluk-pakaian.js","utf8");
const seed=JSON.parse(fs.readFileSync(root+"media/lgr1/wardrobe-adjust/variant-seeds.json","utf8"));
const dirs=["se","sw","ne","nw"];
test("24 exact source drafts: all 12 variants x two genders; 4-view PNG strips",()=>{
 assert.equal(seed.format,"lgr-wardrobe-adjust-seeds-v1");
 assert.equal(seed.draftOnly,true);
 assert.deepEqual(seed.dirs,dirs);
 assert.equal(seed.variants.length,24);
 const expected={top:["tee_long","tee_graphic","shirt","shirt_tie","cardigan","cardigan_dots"],
  pants:["trousers_ripped","baggy","baggy_ripped"],
  shoes:["sneakers","boots","hightops"]};
 const ids=new Set();
 for(const gender of ["male","female"]){
  for(const [group,names] of Object.entries(expected)){
   const actual=seed.variants.filter(v=>v.gender===gender&&v.group===group).map(v=>v.variant);
   assert.deepEqual(new Set(actual),new Set(names),gender+"/"+group);
  }
 }
 for(const v of seed.variants){
  assert.ok(!ids.has(v.id),v.id);ids.add(v.id);
  assert.equal(v.id,[v.gender,v.group,v.variant].join("_"));
  assert.equal(v.baseVersion,"official-9");
  assert.match(v.baseRigSha256,/^[0-9a-f]{64}$/);
  const names=Object.keys(v.files);
  assert.equal(names.length,v.group==="top"?2:1);
  for(const [path,uri] of Object.entries(v.files)){
   assert.ok(path.startsWith(v.group+"/"),path);
   assert.match(uri,/^data:image\/png;base64,/);
   const bytes=Buffer.from(uri.split(",")[1],"base64");
   assert.equal(bytes.subarray(0,8).toString("hex"),"89504e470d0a1a0a",v.id);
   assert.equal(bytes.readUInt32BE(16),256,v.id);
   assert.equal(bytes.readUInt32BE(20),112,v.id);
  }
 }
});
test("outfit adjust app reuses four-view Genesis editor and preserves draft-only state",()=>{
 assert.match(page,/lgr-wardrobe-adjust\.js/);
 assert.match(page,/shared-pixel-editor\.js/);
 assert.match(page,/mahluk-pakaian-pixel\.js/);
 assert.match(page,/#pakaianpanel #pk-approve.*display:none!important/);
 assert.match(src,/root\.PakaianPixelEditor\.open\(\)/);
 assert.match(src,/function ensureSeeds\(/);
 assert.match(src,/if\(records\[id\]\)continue;/); // don't clobber saved art
 assert.match(src,/root\.LGRActor\.master\(gender,tone\)/);
 assert.match(src,/await A\(\)\.translateView\(dx,dy\)/);
 assert.match(src,/function exportAll\(/);
 assert.match(src,/lgr-wardrobe-adjust-bundle-v1/);
 assert.doesNotMatch(src,/LGRDB\.save\(/);
});
test("core per-direction translate uses source pixels, individual undo, and bounded alpha",()=>{
 assert.match(bridge,/async function translateView\(dx,dy\)/);
 assert.match(bridge,/const original=getCell\(canvas\),after=new Uint8ClampedArray\(original\.data\.length\)/);
 assert.match(bridge,/if\(nx<0\|\|nx>=64\|\|ny<0\|\|ny>=112\)continue/);
 assert.match(bridge,/pushUndo\(original\)/);
 assert.match(bridge,/original\.data\.set\(after\);putCell\(canvas,original\)/);
 assert.match(bridge,/function saveOutfitDraft\(\)/);
 assert.match(bridge,/function currentOutfit\(\)/);
 assert.match(bridge,/lgr-pakaian-preview-ready/);
});
