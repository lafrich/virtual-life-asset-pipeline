/* Active Genesis Outfit Adjust: exactly six artist-authored base garments. */
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const root="site/",src=fs.readFileSync(root+"lgr-wardrobe-adjust.js","utf8"),
 page=fs.readFileSync(root+"lgr-wardrobe-adjust.html","utf8"),
 bridge=fs.readFileSync(root+"mahluk-pakaian.js","utf8"),
 seed=JSON.parse(fs.readFileSync(root+"media/lgr1/wardrobe-adjust/base-seeds.json","utf8")),
 archive=JSON.parse(fs.readFileSync(root+"media/lgr1/wardrobe-adjust/variant-seeds.json","utf8"));
const dirs=["se","sw","ne","nw"];
test("Active app is only six artist-approved originals: Male/Female baju celana sepatu",()=>{
 assert.equal(seed.format,"lgr-wardrobe-adjust-base-index-v1");
 assert.equal(seed.draftOnly,true);assert.deepEqual(seed.dirs,dirs);
 assert.equal(seed.entries.length,6);
 const expected=["male_top_tee","male_pants_trousers","male_shoes_shoes",
  "female_top_tee","female_pants_trousers","female_shoes_shoes"];
 assert.deepEqual(seed.entries.map(e=>e.id),expected);
 assert.equal(new Set(seed.entries.map(e=>e.id)).size,6);
 for(const item of seed.entries)assert.equal(item.path,"media/lgr1/wardrobe-approved/"+item.id+".json");
 assert.equal(archive.variants.length,24,"Old derivative sources retained for later revision");
 assert.match(src,/base-seeds\.json/);
 assert.match(src,/lgr-wardrobe-adjust-base-index-v1/);
 assert.match(src,/index\.entries\?\.length!==6/);
 assert.match(src,/await Promise\.all\(index\.entries\.map\(loadArtistBase\)/);
 assert.match(src,/master\.format!=="lgr1-pakaian-v2"/);
 assert.match(src,/await queueSelect\("male","top","tee","se","front"\)/);
 assert.doesNotMatch(src,/variant-seeds\.json/);
});
test("UI shows only Male/Female and baju celana sepatu, no variant dropdown",()=>{
 assert.match(page,/id="wa-gender"/);
 assert.match(page,/id="wa-group"/);
 assert.match(page,/<option value="top">Atasan<\/option>/);
 assert.match(page,/<option value="pants">Celana<\/option>/);
 assert.match(page,/<option value="shoes">Sepatu<\/option>/);
 assert.match(page,/<select id="wa-variant"[^>]*hidden>/);
 assert.doesNotMatch(page,/<label>VARIAN/);
 assert.doesNotMatch(page,/<details class="wa-advanced"/);
 assert.match(page,/6 BASE/);
 assert.match(page,/#pakaianpanel\{display:none!important\}/);
 assert.match(page,/id="wa-cover-1"/);
 assert.match(page,/id="wa-cover-2"/);
 assert.match(page,/id="wa-mode"/);
 assert.match(page,/id="wa-ink"/);
 assert.match(page,/id="wa-brush"/);
});
test("Free paint and skin cover alter garment sprites without changing Genesis and remain draft",()=>{
 assert.match(src,/await A\(\)\.paintFitStroke\(/);
 assert.match(src,/await A\(\)\.coverFitSkin\(radius\)/);
 assert.match(src,/function attachDrag\(\)/);
 assert.match(src,/function ensureSeeds\(\)/);
 assert.match(src,/const sameSource=old\.baseSourceUpdated/);
 assert.match(src,/Date\.parse\(old\.updated/);
 assert.match(src,/lgr-wardrobe-backup-before-base-refresh/);
 assert.match(src,/protectedDrafts\+\+/);
 assert.match(src,/root\.PakaianPixelEditor\.open\(\)/);
 assert.match(src,/LGR_6_Genesis_Base_Fitting_DRAFTS\.json/);
 assert.doesNotMatch(src,/LGRDB\.save\(/);
 assert.match(bridge,/async function paintFitStroke\(/);
 assert.match(bridge,/async function coverFitSkin\(radius=1\)/);
 assert.match(bridge,/pushUndo\(\{data:old\}\)/);
 assert.match(bridge,/const nearBody=hasBody/);
 assert.match(bridge,/im\.data\.set\(best,k\)/);
 assert.match(bridge,/function saveOutfitDraft\(\)/);
 assert.match(bridge,/root\.dispatchEvent\(new CustomEvent\("lgr-wardrobe-fit-edited"/);
 assert.match(page,/shared-pixel-editor\.js/);
});
