"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const {spawnSync}=require("node:child_process");
const root=path.join(__dirname,"..");
const catalog=require("../site/v6p-part-catalog.js");

assert.equal(catalog.filename("top/nude"),"v6p--top__nude.png");
assert.equal(catalog.filename("face/f_blank"),"v6p--face__f_blank.png");
assert.equal(catalog.parseFilename("v6p--top__nude.png"),"top/nude");
assert.equal(catalog.parseFilename("v6p--face__f_blank.png"),"face/f_blank");
assert.equal(catalog.parseFilename("evil.png"),null);
assert.throws(()=>catalog.normalizePart("../top/nude"));
assert.throws(()=>catalog.normalizePart("top/nope"));
assert.ok(catalog.isPart("top/nude")&&catalog.isPart("top/nude_back")&&catalog.isPart("pants/nude"));
assert.ok(catalog.isPart("shoes/nude")&&catalog.isPart("top/nude_f")&&catalog.isPart("face/m_blank"));
const props=catalog.appProperties("top/nude","a".repeat(64));
assert.deepEqual({app:props.app,kind:props.kind,part:props.part,width:props.width,height:props.height},
  {app:"mahluk",kind:"v6pPart",part:"top/nude",width:"384",height:"4928"});

const page=fs.readFileSync(path.join(root,"site/pixel-editor.html"),"utf8");
const editor=fs.readFileSync(path.join(root,"site/pixel-editor.js"),"utf8");
const studio=fs.readFileSync(path.join(root,"site/v6p-studio.html"),"utf8");
const indexHtml=fs.readFileSync(path.join(root,"site/index.html"),"utf8");
assert.match(indexHtml,/location\.replace\(\s*["']\.\/v6p-studio\.html/);
assert.match(indexHtml,/http-equiv="refresh"/);
assert.match(indexHtml,/url=\.\/v6p-studio\.html/);
assert.match(indexHtml,/<title>Mahluk Hidup — Character Studio<\/title>/);
assert.doesNotMatch(studio,/href="\.\/index\.html"/);
assert.doesNotMatch(studio,/v6b-reset-studio\.html/);
const compositor=fs.readFileSync(path.join(root,"site/v6p-compositor.js"),"utf8");
const drive=fs.readFileSync(path.join(root,"site/drive-sync.js"),"utf8");
for(const id of ["source-kind","v6p-part","download-sheet","save-drive","drive-status","export-patch","import-patch","pixel-canvas"])
  assert.ok(page.includes('id="'+id+'"'),"missing "+id);
assert.ok(page.includes('data-tool="wand"'));
assert.ok(editor.includes("persistV6pOverride")&&editor.includes("loadV6pPart")&&editor.includes("saveV6pToDrive"));
assert.ok(editor.includes("localStorage.setItem(LOCAL")&&editor.includes("core.validatePatch(p"));
assert.ok(editor.includes('if(state.source==="v6p")return;')&&editor.includes("queueMasterSync"),
  "v6p must not invent Otis master projection");
assert.ok(compositor.includes("V6PPartOverrides")&&compositor.includes("urlFor(src)"));
assert.ok(studio.includes("Edit di Pixel Editor")&&studio.includes('id="save-drive"')&&studio.includes('id="edit-top"')&&studio.includes('id="edit-face"'));
assert.ok(studio.includes("Tersimpan ke Drive, akan masuk game otomatis")||drive.includes("Tersimpan ke Drive, akan masuk game otomatis"));
assert.match(drive,/369223065433-idbuhhj6akuf2cmo6vpbiblkhu019csn/);
assert.match(drive,/auth\/drive\.file/);
assert.match(drive,/Mahluk Hidup/);
assert.match(drive,/Pixel Edits/);
assert.ok(drive.includes("saveV6pPart"));
assert.ok(!drive.includes("localStorage.setItem")||!/localStorage\.setItem\([^)]*token/.test(drive));
assert.ok(drive.includes("token=\"\"")||drive.includes("token='',expires")||drive.includes('token="",expires=0'));
assert.ok(fs.existsSync(path.join(root,"DRIVE_SYNC_CONTRACT.md")));
assert.ok(fs.readFileSync(path.join(root,"site/EDIT_GUIDE.md"),"utf8").includes("Save ke Drive"));

// Mock Drive upload (no real Google login).
const calls=[];
const folders={};
global.window={
  V6PPartCatalog:catalog,
  localStorage:{getItem(){return null;},setItem(){}},
  google:{accounts:{oauth2:{
    initTokenClient(opts){return {requestAccessToken(){opts.callback({access_token:"tok",expires_in:3600});}};},
    hasGrantedAllScopes:()=>true
  }}}
};
if(typeof Blob==="undefined")throw Error("Blob required");
global.fetch=async(url,opts={})=>{
  const method=(opts.method||"GET").toUpperCase();
  let bodyText="";
  if(opts.body&&typeof opts.body.text==="function")bodyText=await opts.body.text();
  else if(typeof opts.body==="string")bodyText=opts.body;
  calls.push({url:String(url),method,bodyText});
  const json=obj=>({ok:true,status:200,json:async()=>obj,text:async()=>JSON.stringify(obj)});
  if(method==="GET"){
    const q=decodeURIComponent(String(url).replace(/\+/g," "));
    const nameMatch=q.match(/name = '([^']+)'/);
    if(nameMatch&&folders[nameMatch[1]])return json({files:[folders[nameMatch[1]]]});
    for(const name of Object.keys(folders)){
      if(q.includes(name)&&folders[name].id&&folders[name].id.indexOf("file-")===0)return json({files:[folders[name]]});
    }
    return json({files:[]});
  }
  if(String(url).includes("/upload/drive/v3/files")){
    const name=(bodyText.match(/"name":"([^"]+)"/)||[])[1]||"upload.bin";
    const rec={id:folders[name]?.id||"file-"+name,name,modifiedTime:"t1",appProperties:{app:"mahluk"}};
    folders[name]=rec;
    return json(rec);
  }
  if(method==="POST"){
    const name=(bodyText.match(/"name":"([^"]+)"/)||[])[1]||"folder";
    const rec={id:"dir-"+name,name};
    folders[name]=rec;
    return json(rec);
  }
  return json({files:[]});
};
delete require.cache[require.resolve("../site/drive-sync.js")];
const api=require("../site/drive-sync.js");
assert.equal(api.CLIENT_ID.includes("369223065433"),true);
const png=Buffer.alloc(16,7);
const sha=crypto.createHash("sha256").update(png).digest("hex");
(async()=>{
  const first=await api.saveV6pPart({part:"top/nude",png:new Uint8Array(png),sha256:sha,width:384,height:4928,jsonText:"{\"format\":\"virtual-life-v6p-part-patch-v1\"}"});
  assert.equal(first.status,"Tersimpan ke Drive, akan masuk game otomatis");
  assert.equal(first.filename,"v6p--top__nude.png");
  assert.equal(first.appProperties.part,"top/nude");
  assert.equal(first.appProperties.kind,"v6pPart");
  assert.equal(first.appProperties.sha256,sha);
  const uploads=calls.filter(c=>c.url.includes("/upload/drive/v3/files"));
  assert.ok(uploads.length>=2,"png + sidecar");
  assert.ok(uploads.some(c=>c.bodyText.includes("v6p--top__nude.png")));
  assert.ok(uploads.some(c=>c.bodyText.includes('"kind":"v6pPart"')&&c.bodyText.includes('"part":"top/nude"')));
  const createUploads=uploads.filter(c=>c.method==="POST");
  const second=await api.saveV6pPart({part:"top/nude",png:new Uint8Array(png),sha256:sha,width:384,height:4928});
  const later=calls.filter(c=>c.url.includes("/upload/drive/v3/files"));
  assert.ok(later.some(c=>c.method==="PATCH"),"re-save must overwrite via PATCH");
  assert.equal(second.png.overwrote,true);
  assert.ok(!calls.some(c=>String(c.bodyText).includes("access_token")&&c.url.includes("localStorage")));

  // sync script: copy + mark a pixel via python, then ingest
  const tmp=fs.mkdtempSync(path.join(require("node:os").tmpdir(),"v6p-sync-"));
  const fakeRoot=path.join(tmp,"repo");
  const media=path.join(fakeRoot,"site/media/v6p/top");
  fs.mkdirSync(media,{recursive:true});
  fs.mkdirSync(path.join(fakeRoot,"site"),{recursive:true});
  fs.copyFileSync(path.join(root,"site/v6p-part-catalog.js"),path.join(fakeRoot,"site/v6p-part-catalog.js"));
  const src=path.join(root,"site/media/v6p/top/nude.png");
  const dest=path.join(media,"nude.png");
  fs.copyFileSync(src,dest);
  const inbox=path.join(tmp,"inbox");
  fs.mkdirSync(inbox);
  const painted=path.join(inbox,"v6p--top__nude.png");
  const py=spawnSync("python3",["-c",
    "from PIL import Image; im=Image.open('"+src+"').convert('RGBA'); im.putpixel((10,448+30),(255,0,128,255)); im.save('"+painted+"')"],{encoding:"utf8"});
  if(py.status!==0)throw Error(py.stderr||py.stdout||"paint failed");
  const paintedBytes=fs.readFileSync(painted);
  const psha=crypto.createHash("sha256").update(paintedBytes).digest("hex");
  fs.writeFileSync(painted+".meta.json",JSON.stringify({name:"v6p--top__nude.png",appProperties:{
    app:"mahluk",kind:"v6pPart",part:"top/nude",width:"384",height:"4928",sha256:psha}}));
  const run=spawnSync("node",[path.join(root,"tools/sync-v6p-from-drive.mjs"),inbox,"--root",fakeRoot],{encoding:"utf8"});
  assert.equal(run.status,0,run.stderr+"\n"+run.stdout);
  assert.match(run.stdout,/updated top\/nude/);
  const after=crypto.createHash("sha256").update(fs.readFileSync(dest)).digest("hex");
  assert.equal(after,psha);
  const baks=fs.readdirSync(media).filter(n=>n.startsWith("nude.png.bak-"));
  assert.equal(baks.length,1);
  console.log("PASS: v6p catalog, editor/studio wiring, mocked Drive overwrite, sync script");
})().catch(err=>{console.error(err);process.exit(1);});

const catalogJs=fs.readFileSync(path.join(root,"site/v6p-project-catalog.js"),"utf8");
const galleryJs=fs.readFileSync(path.join(root,"site/v6p-asset-gallery.js"),"utf8");
assert.ok(page.includes("shared-pixel-selection.js"));
assert.ok(page.includes('id="copy-selection"')&&page.includes('id="paste-selection"')&&page.includes('id="overlay-actions"'));
assert.ok(editor.includes("MH2PixelSelection")&&editor.includes("loadProject")&&editor.includes("refreshOverlay"));
assert.ok(editor.includes("overlayCanvas")&&editor.includes("NEVER")||editor.includes("not exported")||editor.includes("tidak ikut"));
assert.ok(compositor.includes("loadAccessoryImages")&&compositor.includes("accessories"));
assert.ok(drive.includes("saveV6pUserProject")&&drive.includes("v6pUserProject"));
assert.ok(drive.includes("v6p-user--"));
assert.ok(studio.includes('id="tab-btn-gallery"')&&studio.includes("ASSET GALLERY")&&studio.includes("studio-accessory"));
assert.ok(studio.includes("v6p-asset-gallery.js")&&studio.includes("v6p-project-catalog.js"));
assert.ok(studio.includes("v6p-activity-contract.js")&&studio.includes("v6p-clip-store.js"));
assert.ok(page.includes("v6p-activity-contract.js")&&page.includes("id=\"clip-play\""));
assert.ok(galleryJs.includes("composeActivity")||galleryJs.includes("V6PClipStore"));

assert.ok(galleryJs.includes("Open in editor")||galleryJs.includes("vagOpen"));
assert.ok(catalogJs.includes("never writes")||catalogJs.includes("Never writes"));
assert.ok(fs.readFileSync(path.join(root,"DRIVE_SYNC_CONTRACT.md"),"utf8").includes("v6pUserProject"));
assert.ok(catalog.PARTS.length===133,"133 whitelist unchanged");
assert.equal(catalog.isPart("accessory/front/hat"),false);
assert.throws(()=>catalog.normalizePart("accessory/front/hat"));
console.log("PASS: accessory/gallery wiring keeps whitelist and Drive ingest separate");
