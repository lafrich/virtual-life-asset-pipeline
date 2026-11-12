/* Artist reference export and Male/Female four-direction ghost overlay contract. */
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const editor=fs.readFileSync("site/mahluk-pakaian-pixel.js","utf8");
const wardrobe=fs.readFileSync("site/mahluk-pakaian.js","utf8");
const shared=fs.readFileSync("site/emotion-studio/shared-pixel-editor.js","utf8");
const page=fs.readFileSync("site/lgr-wardrobe-fit-editor.html","utf8");

test("draft exporter writes 4-view KEY PNG artwork and active rig metadata, not an approved game master",()=>{
 assert.match(wardrobe,/async function exportDraft\(\)/);
 assert.match(wardrobe,/format:"lgr1-wardrobe-master-v1"/);
 assert.match(wardrobe,/referenceOnly:true/);
 assert.match(wardrobe,/approved:false/);
 assert.match(wardrobe,/baseRigSha256:pkg\.rigSha256/);
 assert.match(wardrobe,/strip:\[256,112\]/);
 assert.match(wardrobe,/const paths=canSide\(\)\?\[pathOf\("front"\),pathOf\("back"\)\]/);
 assert.match(wardrobe,/JSON\.stringify\(record,null,2\)/);
 assert.match(wardrobe,/root\.MahlukPakaian=Object\.freeze\(\{init,pixelContext,pixelCommit,pixelSelectDirection,exportDraft\}\)/);
});
test("export from inside Pixel Editor commits live atlas and generates shareable JSON",()=>{
 assert.match(editor,/id=\\"pkExportPixel\\"/);
 assert.match(editor,/onSave\(openPath,engine\.getAtlas\(\)\.toDataURL\("image\/png"\)\)/);
 assert.match(editor,/await BASE\(\)\.exportDraft\(\)/);
 assert.match(editor,/root\.dispatchEvent\(new CustomEvent\("pakaian-pixels-applied"/);
});
test("all 8 male/female direction overlays and both reference comparison are available",()=>{
 assert.match(editor,/for\(const gender of \["male","female"\]\)/);
 assert.match(editor,/for\(const d of DIRS\)/);
 assert.match(editor,/referenceSets=\{male:await baseReferences\("male",data\.tone\),/);
 assert.match(editor,/female:await baseReferences\("female",data\.tone\)\}/);
 assert.match(editor,/compositeReferences\(referenceSets\.male,referenceSets\.female\)/);
 assert.match(editor,/buildOutlines\(\)/);
 assert.match(editor,/guide:\(ctx,dir,u,v,phase\)=>/);
 assert.match(editor,/root\.LGRActor\.master\(gender,tone\)/);
 assert.match(shared,/function setReferenceImages\(images\)/);
 assert.match(shared,/getAtlas:\(\)=>atlas/);
});
test("standalone fit workspace keeps master publication disabled while draft export stays visible",()=>{
 assert.match(page,/site|MahlukPakaian\.init/);
 assert.match(page,/#pakaianpanel #pk-approve,#pakaianpanel #pk-export\{display:none!important\}/);
 assert.match(page,/pk-export-draft/);
 assert.match(page,/shared-pixel-editor\.js\?v=wardrobe-reference-export-3/);
});
