/* Mahluk Hidup + Mainkan must resolve exactly six canonical artist BASE outfits. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const G=require("../site/lgr-game.js");
const actorWindow={};
new Function("window",fs.readFileSync("site/lgr-actor.js","utf8"))(actorWindow);
const A=actorWindow.LGRActor;
const editor=fs.readFileSync("site/mahluk-pakaian.js","utf8");
const wear=fs.readFileSync("site/lgr-wear.js","utf8");

test("Mainkan defaults to canonical Baju Celana Sepatu when appearance is unset",()=>{
 assert.deepEqual(G.spec({appearance:{}}),{top:"tee",pants:"trousers",shoes:"shoes"});
 assert.match(G.VERSION,/artist-base-20261113/);
});
test("Mainkan legacy unapproved looks show base fit, not invisible V6P clothes",()=>{
 const out=G.spec({appearance:{
  topStyle:"cardigan",pantsStyle:"baggy",shoesStyle:"boots",
  topColor:"red",pantsColor:"denim",shoesColor:"white"}});
 assert.equal(out.top,"tee");assert.equal(out.pants,"trousers");assert.equal(out.shoes,"shoes");
 assert.equal(out.topColor,"red");
});
test("Mainkan explicit nude selection still allows bare character",()=>{
 const out=G.spec({appearance:{topStyle:"nude",pantsStyle:"none",shoesStyle:"nude"}});
 assert.equal(out.top,undefined);assert.equal(out.pants,undefined);assert.equal(out.shoes,undefined);
});
test("Mahluk Hidup actor base outfit uses approved shoes (not unapproved sneakers)",()=>{
 const o=A.OUTFITS.tee_trousers;
 assert.equal(o.top,"tee");assert.equal(o.pants,"trousers");assert.equal(o.shoes,"shoes");
 const look=A.wearSpec({outfit:"tee_trousers",wear:{}});
 assert.equal(look.top,"tee");assert.equal(look.pants,"trousers");assert.equal(look.shoes,"shoes");
 const legacy=A.wearSpec({outfit:"cardigan_ripped",wear:{}});
 assert.equal(legacy.top,"tee");assert.equal(legacy.pants,"trousers");assert.equal(legacy.shoes,"shoes");
});
test("Mahluk Hidup Pakaian editor binds same rig-checked six canonical files",()=>{
 assert.match(editor,/ARTIST_BASE_IDS=new Set/);
 assert.match(editor,/async function officialGarment\(id\)/);
 assert.match(editor,/wardrobe-approved/);
 assert.match(editor,/wardrobe-artist-reference/);
 assert.match(editor,/data\.baseRigSha256!==approved\?\.pkg\?\.rigSha256/);
 assert.match(editor,/S\.draft=official\?/);
 assert.match(wear,/const OFFICIAL_REF_IDS=new Set/);
 assert.match(wear,/Date\.parse\(saved\.updated/);
 assert.match(wear,/Date\.parse\(fallback\.updated/);
});
