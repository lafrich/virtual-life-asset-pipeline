/* Approved Pakaian v2 contract + legacy wardrobe retirement. */
const assert=require("node:assert/strict"),fs=require("node:fs"),{test}=require("node:test");
const DB=require("../site/lgr-db.js"),W=require("../site/lgr-wear.js");
const png="data:image/png;base64,"+fs.readFileSync("site/media/lgr1/mh-wear/top/tee.png").toString("base64");
const base={format:"lgr1-pakaian-v2",schema:2,id:"male_top_tee",gender:"male",group:"top",variant:"tee",name:"T-Shirt",
 baseVersion:"official-6",baseRigSha256:"a".repeat(64),files:{"top/tee":png},note:"NOVA fit",approved:true,
 created:"2026-11-12T10:00:00.000Z",updated:"2026-11-12T10:00:00.000Z",rev:1};
test("Pakaian v2 validates full 256×112 RGBA four-view strip for active rig",()=>{
 const e=DB.validate("pakaian",base);
 assert.equal(e.format,"lgr1-pakaian-v2");
 assert.equal(e.files["top/tee"],png);
 assert.equal(e.baseRigSha256,"a".repeat(64));
});
test("retired format and mismatched gender/path/rig cannot be published",()=>{
 for(const obj of [
 {...base,format:"lgr1-wardrobe-master-v1"},
 {...base,baseRigSha256:""},
 {...base,id:"male_top_shirt"},
 {...base,files:{"top/tee_f":png}},
 {...base,files:{"top/tee":png.replace(/.$/,"X")}},
 ])assert.throws(()=>DB.validate("pakaian",obj));
});
test("wardrobe kind exists as an independent game database",()=>{
 assert.equal(DB.KINDS.pakaian.folder,"Pakaian");
 assert.equal(DB.KINDS.pakaian.format,"lgr1-pakaian-v2");
 assert.equal(DB.readCache().kinds.pakaian instanceof Object,true);
});
test("old clothing and face accessories cannot silently reappear as fallback",async()=>{
 for(const path of ["top/tee","pants/baggy","shoes/boots","facial/mustache","glasses/round"]){
  const s=await W.activeStrip(path,"male");assert.equal(s,null,path);
 }
});
test("editor uses v2 cloud saving; stock is only editable reference",()=>{
 const ui=fs.readFileSync("site/mahluk-pakaian.js","utf8");
 assert.match(ui,/LGRDB\.save\("pakaian",record,\{overwrite:true\}\)/);
 assert.match(ui,/buildMaster\(\)/);
 assert.match(ui,/baseRigSha256:approved\.pkg\.rigSha256/);
 assert.match(ui,/LGRActor\?\.clearCaches/);
 const runtime=fs.readFileSync("site/lgr-game.js","utf8");
 assert.match(runtime,/W\.activeStrip\(p,genderOf\(profile\)\)/);
 assert.doesNotMatch(runtime,/image\(rel\("media\/lgr1\/mh-wear\/"\+p\+"\.png"\)\)/);
});
