/* MAHLUK HIDUP · PAKAIAN.EXE — standalone, non-destructive wardrobe authoring.
 * Source for six base garments: 2026-11-13 artist-approved Genesis v2 PNGs; other varieties require approval.
 * Saved drafts/approval are LOCAL ONLY until explicitly exported and ingested.
 * Never edits Genesis, original wardrobe PNGs, or Bergerak/Emosi databases.
 */
(function(root){"use strict";
const DIRS=["se","sw","ne","nw"], GROUPS=["top","pants","shoes","hair","glasses","facial"];
const KEY="lgr1-pakaian-drafts-v1", CKEY="lgr1-pakaian-approved-local-v1";
const BASE="media/lgr1/mh-wear/", $=id=>document.getElementById(id);
const make=(t,attrs={},...kids)=>{const e=document.createElement(t);for(const [k,v] of Object.entries(attrs)){if(k==="text")e.textContent=v;else if(k==="class")e.className=v;else if(k==="html")e.innerHTML=v;else if(k.startsWith("on"))e[k]=v;else e.setAttribute(k,v)}for(const x of kids.flat())if(x!=null)e.append(x.nodeType?x:document.createTextNode(String(x)));return e};
const cv=(w=64,h=112)=>{const c=document.createElement("canvas");c.width=w;c.height=h;return c};
const clone=o=>JSON.parse(JSON.stringify(o));
const dbRead=k=>{try{return JSON.parse(localStorage.getItem(k)||"{}")}catch{return {}}};
const S={ready:false,index:null,gender:"male",group:"top",variant:"tee",dir:"se",side:"front",tone:"light",ink:"C2",tool:"pen",motion:"idle",frame:0,base:"",basePackages:{},bufs:new Map(),draft:null,changed:new Set(),undo:[],redo:[],copied:null,selection:null,selectFrom:null,drag:false,playing:null,previewToken:0,edited:false,masterCache:{},resetPending:false};
const rootUrl=()=>root.LGRDB_BASE||"./";
const say=(s,bad=false)=>{const p=$("pk-status");if(p){p.textContent=s;p.style.color=bad?"#a8291d":"#315577"}};
const kID=()=>S.gender+"|"+S.group+"|"+S.variant;
const allVersions=()=>dbRead(KEY);
const validPath=p=>typeof p==="string"&&S.index.items.includes(p);
const canSide=()=>S.group==="top"||S.group==="hair";
function pathOf(side=S.side) {
 let n=S.variant;
 if(S.group==="hair")n=n+"_"+(side==="back"?"back":"front");
 else if(S.group==="top"&&side==="back")n=n+"_back";
 if(["top","pants","shoes"].includes(S.group)&&S.gender==="female")n+="_f";
 return S.group+"/"+n;
}
function options(){
 const names=new Set();
 for(const file of S.index.items){
  const seg=file.split("/");if(seg[0]!==S.group)continue;
  let n=seg[1];
  if(["top","pants","shoes"].includes(S.group))n=n.replace(/_f$/,"");
  if(S.group==="top")n=n.replace(/_back$/,"");
  if(S.group==="hair")n=n.replace(/_(front|back)$/,"");
  if(n&&n!=="nude"&&!n.startsWith("custom"))names.add(n);
 }
 return [...names].sort();
}
function setSelect(id,opts,chosen) {
 const e=$(id);e.replaceChildren(...opts.map(([v,l])=>new Option(l,v)));
 e.value=chosen&&opts.some(x=>x[0]===chosen)?chosen:(opts[0]?.[0]||"");
 return e.value;
}
function palettes(){
 const by={top:["C1","C2","C3","C4","C5","O1","O2","O3","O4","O5","OD","Ki","Kh","Ke"],pants:["P1","P2","P3","P4","Ki","Kh"],shoes:["S0","S1","S2","S3"],hair:["H0","H1","H2","H3","H4","B"],glasses:["GL"],facial:["H0","H1","H2","H3","H4"]};
 const ids=by[S.group]||["C2"],w=root.LGRWear;
 $("pk-inks").replaceChildren(...ids.filter(k=>w.K[k]).map(k=>{
  const b=make("button",{type:"button",title:k,"data-key":k,style:"background:"+w.K[k]+";color:#fff;text-shadow:0 1px #222",text:k});
  b.onclick=()=>{S.ink=k;palettes()};b.setAttribute("aria-pressed",String(k===S.ink));return b;
 }));
 if(!ids.includes(S.ink))S.ink=ids[0];
 const palette={top:"top",pants:"pants",shoes:"shoes",hair:"hair",glasses:"hair",facial:"hair"}[S.group];
 const entries=Object.keys(w.P.swatch[palette]||{});
 setSelect("pk-color",entries.map(x=>[x,x]),S.color&&entries.includes(S.color)?S.color:entries[0]);
 S.color=$("pk-color").value;
}
async function loadImage(src){
 return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error("Asset tidak ditemukan: "+src));im.src=src});
}
async function buffer(path){
 if(S.bufs.has(path))return S.bufs.get(path);
 if(!validPath(path))return null;
 const existing=S.draft?.files?.[path];
 const im=await loadImage(existing||rootUrl()+BASE+path+".png");
 if(im.width!==256||im.height!==112)throw Error("Sprite harus 256×112: "+path);
 const c=cv(256,112);c.getContext("2d").drawImage(im,0,0);S.bufs.set(path,c);return c;
}
function getCell(c,d=S.dir){return c.getContext("2d",{willReadFrequently:true}).getImageData(DIRS.indexOf(d)*64,0,64,112)}
function putCell(c,data,d=S.dir){c.getContext("2d").putImageData(data,DIRS.indexOf(d)*64,0)}
function recolored(imdata){
 const copy=new ImageData(new Uint8ClampedArray(imdata.data),64,112);
 const spec={skin:S.tone,topColor:S.group==="top"?S.color:"navy",pantsColor:S.group==="pants"?S.color:"denim",shoesColor:S.group==="shoes"?S.color:"white",hairColor:["hair","facial","glasses"].includes(S.group)?S.color:"brown"};
 root.LGRWear.recolor(copy.data,root.LGRWear.lookup(spec));return copy;
}
function drawCellTo(target,data){
 const c=cv();c.getContext("2d").putImageData(recolored(data),0,0);
 const g=target.getContext("2d");g.clearRect(0,0,target.width,target.height);g.imageSmoothingEnabled=false;g.drawImage(c,0,0,target.width,target.height);
}
async function draw(){
 const path=pathOf(),c=await buffer(path);$("pk-file").textContent=path+".png";
 if(!c){say("Bagian ini tidak punya sprite stok.",true);return}
 const editor=$("pk-editor"),g=editor.getContext("2d");g.clearRect(0,0,64,112);
 if($("pk-ghost").checked){
  try{
   const bare=await rigFor(),prepared=await root.LafrichPuppetRenderer.prepare(bare,null,S.dir);
   const naked=root.LafrichPuppetRenderer.render(prepared,root.LafrichPuppetCore.blankPose());
   g.globalAlpha=.33;g.drawImage(naked,0,0);g.globalAlpha=1;
  }catch(e){console.warn("Ghost base",e)}
 }
 const cell=cv();cell.getContext("2d").putImageData(recolored(getCell(c)),0,0);g.drawImage(cell,0,0);
 if(S.selection){
  const r=S.selection;g.save();g.strokeStyle="#ffcc20";g.setLineDash([2,1]);g.lineWidth=1;
  g.strokeRect(r.x+.5,r.y+.5,r.w,r.h);g.restore();
 }
 for(let i=0;i<4;i++){
  const t=$("pk-v"+i),out=cv(),u=getCell(c,DIRS[i]);out.getContext("2d").putImageData(recolored(u),0,0);
  const tg=t.getContext("2d");tg.clearRect(0,0,64,112);tg.drawImage(out,0,0);
  t.setAttribute("aria-pressed",String(DIRS[i]===S.dir));
 }
}
const fresh=()=>{S.undo=[];S.redo=[];S.selection=null;S.copied=null;};
/* The six uploaded 2026-11-13 Genesis fitting masters are authoritative
 * everywhere, including Mahluk Hidup's Pakaian editor (not just Mainkan).
 * Source mode and GitHub Pages both load the same exact native-key PNG art.
 * A newer intentional local edit is preserved; older master caches are not
 * allowed to silently obscure the freshly approved base.
 */
const ARTIST_BASE_IDS=new Set(["male_top_tee","female_top_tee",
 "male_pants_trousers","female_pants_trousers","male_shoes_shoes","female_shoes_shoes"]);
async function officialGarment(id){
 if(!ARTIST_BASE_IDS.has(id))return null;
 if(!S.masterCache[id]){
  S.masterCache[id]=(async()=>{
   for(const [folder,artist] of [["wardrobe-approved",false],["wardrobe-artist-reference",true]]){
    try{
     const r=await fetch(rootUrl()+"media/lgr1/"+folder+"/"+id+".json",{cache:"no-cache"});
     if(!r.ok)continue;
     const data=await r.json(),part=id.split("_"),gender=part[0],group=part[1],variant=part.slice(2).join("_");
     if(data.id!==id||data.gender!==gender||data.group!==group||data.variant!==variant)continue;
     if(artist){
      if(data.format!=="lafrich-wardrobe-artist-reference-v1"||!data.approvedReference)continue;
      const family={top:"C",pants:"P",shoes:"S"}[group];
      if(data.sourceKeyFamily!==family)continue;
     }else if(data.format!=="lgr1-pakaian-v2"||!data.approved)continue;
     const approved=(await root.LGRActor.loadBases())[gender];
     if(data.baseVersion!==approved?.version||data.baseRigSha256!==approved?.pkg?.rigSha256)continue;
     return artist?{format:"lgr1-pakaian-v2",gender,group,variant,id,
      approved:true,baseVersion:data.baseVersion,baseRigSha256:data.baseRigSha256,
      files:data.files,updated:data.sourceUpdated,rev:2,artistBase:true}:data;
    }catch(err){console.warn("Official wardrobe base",id,folder,err)}
   }
   return null;
  })();
 }
 return S.masterCache[id];
}
async function openItem(){
 if(S.changed.size)saveDraft(true);
 S.bufs.clear();S.changed.clear();fresh();
 const id=S.gender+"_"+S.group+"_"+S.variant,local=allVersions()[kID()],
  saved=root.LGRDB?.get?.("pakaian",id)||null,
  official=await officialGarment(id);
 const newer=a=>a&&official&&Date.parse(a.updated||"")>Date.parse(official.updated||"");
 S.draft=official?(newer(local)?local:newer(saved)?saved:official):(local||saved||null);
 $("pk-version").textContent=S.draft?(S.draft===official?"✓ BASE RESMI 2026-11-13":S.draft.approved?"MASTER v2":"DRAFT"):"STOK / BELUM DIEDIT";
 $("pk-note").value=S.draft?.note||"";
 $("pk-side").disabled=!canSide();if(!canSide())S.side="front";$("pk-side").value=S.side;
 palettes();await draw();void preview();
}
function saveDraft(silent=false,approved=false){
 const store=allVersions(),old=store[kID()]||S.draft||{},files=S.resetPending?{}:{...(old.files||{})};
 for(const p of S.changed)if(S.bufs.has(p))files[p]=S.bufs.get(p).toDataURL("image/png");
 const out={format:"lgr1-wardrobe-master-v1",gender:S.gender,group:S.group,variant:S.variant,baseVersion:S.base,dirs:DIRS,cell:[64,112],keyColours:true,updated:new Date().toISOString(),note:$("pk-note").value,files,approved:!!approved};
 store[kID()]=out;S.resetPending=false;
 try{localStorage.setItem(KEY,JSON.stringify(store));S.draft=out;S.changed.clear();$("pk-version").textContent=approved?"MASTER LOKAL":"DRAFT";if(!silent)say(approved?"Master ditandai untuk review lokal. Export untuk integrasi game.":"Draft tersimpan di browser ini.")}
 catch(e){say("Gagal simpan: "+e.message,true);throw e}
 return out;
}
function markDirty(path){S.changed.add(path);S.edited=true;$("pk-version").textContent="● UNSAVED";void draw()}
async function actionAt(x,y){
 const path=pathOf(),c=await buffer(path);if(!c)return;
 const im=getCell(c),a=im.data,at=(xx,yy)=>(yy*64+xx)*4;
 if(S.tool==="pick"){const i=at(x,y),rgb="#"+[a[i],a[i+1],a[i+2]].map(n=>n.toString(16).padStart(2,"0")).join("").toUpperCase();S.ink=Object.keys(root.LGRWear.K).find(k=>root.LGRWear.K[k].toUpperCase()===rgb)||S.ink;palettes();say("Color Key: "+rgb);return}
 if(S.tool==="select"){if(!S.selectFrom){S.selectFrom={x,y}}else{const z=S.selectFrom;S.selection={x:Math.min(z.x,x),y:Math.min(z.y,y),w:Math.abs(x-z.x)+1,h:Math.abs(y-z.y)+1};S.selectFrom=null;void draw()}return}
 if(S.tool==="paste"){if(!S.copied){say("COPY dulu pixel selection.",true);return}pushUndo(im);
  const cp=S.copied,ox=Math.max(0,Math.min(64-cp.w,x)),oy=Math.max(0,Math.min(112-cp.h,y));
  for(let yy=0;yy<cp.h;yy++)for(let xx=0;xx<cp.w;xx++){
   const src=(yy*cp.w+(S.flipPaste?cp.w-xx-1:xx))*4,dst=at(ox+xx,oy+yy);
   for(let k=0;k<4;k++)a[dst+k]=cp.data[src+k];
  }
  putCell(c,im);markDirty(path);S.tool="pen";setTool("pen");void preview();return;
 }
 if(!S.drag)pushUndo(im);
 const i=at(x,y),ink=root.LGRWear.K[S.ink]||"#FF56D3";
 if(S.tool==="fill"){
  const old=[a[i],a[i+1],a[i+2],a[i+3]],rgba=S.tool==="erase"?[0,0,0,0]:[parseInt(ink.slice(1,3),16),parseInt(ink.slice(3,5),16),parseInt(ink.slice(5,7),16),255];
  if(old.every((v,k)=>v===rgba[k]))return;
  const queue=[y*64+x],seen=new Uint8Array(64*112);seen[y*64+x]=1;
  for(let q=0;q<queue.length;q++){const id=queue[q],p=id*4;
   if(!old.every((v,k)=>a[p+k]===v))continue;
   a.set(rgba,p);const px=id%64,py=(id/64)|0;
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=px+dx,yy=py+dy;if(xx<0||yy<0||xx>63||yy>111)continue;const ni=yy*64+xx;if(!seen[ni]){seen[ni]=1;queue.push(ni)}}}
 }else if(S.tool==="erase")a.fill(0,i,i+4);
 else{a[i]=parseInt(ink.slice(1,3),16);a[i+1]=parseInt(ink.slice(3,5),16);a[i+2]=parseInt(ink.slice(5,7),16);a[i+3]=255}
 putCell(c,im);markDirty(path);
}
function pushUndo(im){S.undo.push(new Uint8ClampedArray(im.data));if(S.undo.length>32)S.undo.shift();S.redo=[]}
async function undoRedo(type){
 const from=type==="undo"?S.undo:S.redo,to=type==="undo"?S.redo:S.undo;
 if(!from.length)return;
 const p=pathOf(),c=await buffer(p),im=getCell(c);to.push(new Uint8ClampedArray(im.data));
 im.data.set(from.pop());putCell(c,im);markDirty(p);void preview();
}
function setTool(t){S.tool=t;document.querySelectorAll("[data-pk-tool]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.pkTool===t)));say("Tool: "+t)}
function point(e){const r=$("pk-editor").getBoundingClientRect();return [Math.max(0,Math.min(63,Math.floor((e.clientX-r.left)/r.width*64))),Math.max(0,Math.min(111,Math.floor((e.clientY-r.top)/r.height*112)))]}
async function makeWear(d){
 const W=root.LGRWear,base={top:"tee",pants:"trousers",shoes:"sneakers",hair:"short",hairColor:"brown",topColor:"navy",pantsColor:"denim",shoesColor:"white"};
 if(["top","pants","shoes","hair"].includes(S.group))base[S.group]=S.variant;
 const colorName={top:"topColor",pants:"pantsColor",shoes:"shoesColor",hair:"hairColor"}[S.group];
 if(colorName)base[colorName]=S.color;
 const layers=await W.layers(base,S.gender,S.tone),spec={...base,skin:S.tone};
 for(const side of canSide()?["back","front"]:["front"]){
  const p=pathOf(side),buf=await buffer(p);if(!buf)continue;
  const layer={top:side==="back"?"top_back":"top",pants:"pants",shoes:"shoes",hair:side==="back"?"hair_back":"hair_front",glasses:"accessory",facial:"accessory"}[S.group];
  const image=getCell(buf,d);
  const col=recolored(image),frame=cv();frame.getContext("2d").putImageData(col,0,0);
  if(layer==="accessory"){
   if(layers.accessory?.[d]){
    const old=await loadImage(layers.accessory[d]);frame.getContext("2d").drawImage(old,0,0);
   }
   layers.accessory=layers.accessory||{};
  }else layers[layer]=layers[layer]||{};
  layers[layer][d]=frame.toDataURL("image/png");
 }
 return layers;
}
function updateBaseLabel(){
 const label=$("pk-base-label");if(label)label.textContent="Base aktif: "+S.base+" (Genesis resmi dari repository)";
}
async function rigFor(){return root.LGRActor.master(S.gender,S.tone)}
async function preview(){
 if(!S.ready)return;
 const ticket=++S.previewToken;
 try{
  const C=root.LafrichPuppetCore,R=root.LafrichPuppetRenderer,A=root.LGRActor;
  const master=await rigFor(),lib=await A.motions();
  const motion=lib.motions.find(m=>m.id===S.motion)||lib.motions.find(m=>m.id==="idle")||null;
  const canvases=[];
  for(const d of DIRS){
   const wear=await makeWear(d);
   const character=C.validateCharacter({format:C.CHARACTER,id:"pakaian_preview",name:"Pakaian Preview",gender:S.gender,wear,faceId:""});
   const prep=await R.prepare(master,character,d);
   const p=A.poseOf(master,lib,motion,S.frame,d),art=R.render(prep,p.pose,{order:p.order});
   canvases.push(art);
  }
  if(ticket!==S.previewToken)return;
  for(let i=0;i<4;i++){const t=$("pk-r"+i),g=t.getContext("2d");g.clearRect(0,0,64,112);g.drawImage(canvases[i],0,0)}
  $("pk-motion-label").textContent=S.motion+" · frame "+(S.frame+1);
  root.dispatchEvent(new CustomEvent("lgr-pakaian-preview-ready",{detail:{id:kID(),frame:S.frame,motion:S.motion}}));
 }catch(e){if(ticket===S.previewToken)say("Preview rig: "+e.message,true)}
}
function download(name,content){
 const blob=new Blob([content],{type:"application/json"}),url=URL.createObjectURL(blob),a=make("a",{href:url,download:name});
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function buildMaster(){
 if(S.changed.size)saveDraft(true);
 const DB=root.LGRDB;if(!DB)throw Error("Database belum terhubung");
 const approved=(await root.LGRActor.loadBases())[S.gender];
 if(!approved?.pkg?.rigSha256)throw Error("Official Genesis aktif belum tersedia");
 const files={},paths=canSide()?[pathOf("front"),pathOf("back")]:[pathOf("front")];
 for(const path of paths){
  if(!validPath(path))continue;
  const buf=await buffer(path);if(buf)files[path]=buf.toDataURL("image/png");
 }
 const now=new Date().toISOString();
 const entry={format:"lgr1-pakaian-v2",schema:2,id:S.gender+"_"+S.group+"_"+S.variant,
  gender:S.gender,group:S.group,variant:S.variant,name:S.variant.replace(/_/g," "),
  baseVersion:approved.version,baseRigSha256:approved.pkg.rigSha256,
  files,note:$("pk-note").value,approved:true,updated:now,created:now,rev:1};
 return DB.validate("pakaian",entry);
}
async function saveMaster(){
 const btn=$("pk-approve");btn.disabled=true;
 try{
  const record=await buildMaster(),result=await root.LGRDB.save("pakaian",record,{overwrite:true});
  try{const local=allVersions();delete local[kID()];localStorage.setItem(KEY,JSON.stringify(local))}catch(e){console.warn("Draft cleanup skipped",e)}
  S.draft=result.entry;S.changed.clear();
  $("pk-version").textContent=result.synced?"✓ MASTER v2 · DRIVE":"● MASTER v2 · PENDING SYNC";
  root.LGRWear?.clearCache?.();root.LGRActor?.clearCaches?.();root.LGRGame?.clear?.();
  root.dispatchEvent(new CustomEvent("lgr-db-changed",{detail:{kind:"pakaian",id:result.entry.id}}));
  await draw();await preview();
  say(result.synced?"Master Pakaian v2 aktif & terverifikasi di Drive. Game membaca versi baru.":
   "Master Pakaian v2 aktif di cache perangkat ini, tapi BELUM sync ke Drive. Hubungkan Drive lalu tekan SYNC.");
 }catch(e){say("SAVE MASTER GAGAL: "+e.message,true)}
 finally{btn.disabled=false}
}
/* Portable artwork-only export for Lafrich fitting references.
 * NOT an approved lgr1-pakaian-v2 game master; preserves ALL 4 views, both
 * relevant layer strips and the exact active Male/Female rig SHA.
 */
async function exportDraft(){
 try{
  const {pkg,version}=(await root.LGRActor.loadBases())[S.gender]||{};
  if(!pkg?.rigSha256)throw Error("Genesis resmi belum tersedia");
  const paths=canSide()?[pathOf("front"),pathOf("back")]:[pathOf("front")],files={};
  for(const p of paths){
   if(!validPath(p))throw Error("Path pakaian tidak terdaftar: "+p);
   const canvas=await buffer(p);
   if(!canvas||canvas.width!==256||canvas.height!==112)throw Error("Artwork 4 arah tidak lengkap: "+p);
   files[p]=canvas.toDataURL("image/png");
  }
  const record={
   format:"lgr1-wardrobe-master-v1",gender:S.gender,group:S.group,variant:S.variant,
   baseVersion:version,baseRigSha256:pkg.rigSha256,dirs:DIRS.slice(),
   cell:[64,112],strip:[256,112],keyColours:true,approved:false,referenceOnly:true,
   updated:new Date().toISOString(),note:$("pk-note").value,files
  };
  const name="LGR_REF_"+S.gender+"_"+S.group+"_"+S.variant+"_4view.json";
  download(name,JSON.stringify(record,null,2));
  say("✓ Export JSON draft 4 arah: "+name+" · Tidak publish ke game / Drive.");
  return record;
 }catch(e){say("Export draft gagal: "+e.message,true);throw e}
}
async function exportMaster(){
 try{
  const data=await buildMaster(),n="pakaian-v2-"+S.gender+"-"+S.group+"-"+S.variant+".json";
  download(n,JSON.stringify(data,null,2));say("Export "+n+" (master v2, tidak otomatis publish).");
 }catch(e){say("Export gagal: "+e.message,true)}
}
/* Lafrich renamed the exported reference files to the actual garment category
 * after the original Pixel Editor mistakenly exported all six as top/tee.
 * When these specific LGR_REF files are imported, the filename defines the
 * category. The user's painted alpha geometry remains unchanged.
 */
function categoryFromRefFilename(name){
 if(!/^LGR_REF_/i.test(String(name||"")))return null;
 const n=String(name).toLowerCase();
 if(/sepatu|tshoes|shoes/.test(n))return {group:"shoes",variant:"shoes"};
 if(/celana|clana|pants/.test(n))return {group:"pants",variant:"trousers"};
 if(/top_tee|baju/.test(n))return {group:"top",variant:"tee"};
 return null;
}
async function convertReferenceKeyStrip(uri,group){
 if(!["pants","shoes"].includes(group))return uri;
 const im=await loadImage(uri),c=cv(256,112),g=c.getContext("2d",{willReadFrequently:true});
 g.drawImage(im,0,0,256,112);
 const data=g.getImageData(0,0,256,112),K=root.LGRWear.K,
  refs=group==="pants"?["P1","P2","P3","P4","P4"]:["S0","S1","S2","S3","S3"];
 const rgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
 const table=new Map();
 for(let i=0;i<5;i++)table.set(rgb(K["C"+(i+1)]).join(","),rgb(K[refs[i]]));
 let changed=0;
 for(let i=0;i<data.data.length;i+=4){
  if(data.data[i+3]===0)continue;
  const source=[data.data[i],data.data[i+1],data.data[i+2]].join(",");
  const newColor=table.get(source);
  if(!newColor)throw Error("Unknown colour KEY in imported "+group+" garment");
  data.data[i]=newColor[0];data.data[i+1]=newColor[1];data.data[i+2]=newColor[2];changed++;
 }
 if(!changed)throw Error("Imported garment contains no visible pixels");
 g.putImageData(data,0,0);
 return c.toDataURL("image/png");
}
async function importMaster(f){
 if(!f||f.size>3000000)throw Error("JSON maksimal 3 MB");
 const p=JSON.parse(await f.text());
 if(!["lgr1-wardrobe-master-v1","lgr1-pakaian-v2","lafrich-wardrobe-artist-reference-v1"].includes(p.format)||
    !GROUPS.includes(p.group)||!["male","female"].includes(p.gender)||
    typeof p.variant!=="string"||!p.files||typeof p.files!=="object")
  throw Error("Format master pakaian tidak cocok");
 const inferred=categoryFromRefFilename(f.name);
 const mapping=inferred&&p.group==="top"&&p.variant==="tee"?
  inferred:{group:p.group,variant:p.variant};
 const files={};
 if(mapping.group!==p.group){
  // Original image was saved under top/tee although it was drawn as pants/shoes.
  const src=p.files["top/tee"+(p.gender==="female"?"_f":"")];
  if(!src)throw Error("Reference source top/tee is missing");
  const target=mapping.group+"/"+mapping.variant+(p.gender==="female"?"_f":"");
  if(!validPath(target))throw Error("Target garment path invalid: "+target);
  files[target]=await convertReferenceKeyStrip(src,mapping.group);
 }else{
  for(const [k,v] of Object.entries(p.files)){
   if(!validPath(k)||typeof v!=="string"||!v.startsWith("data:image/png;base64,")||v.length>800000)
    throw Error("Asset key invalid: "+k);
   files[k]=p.sourceKeyFamily==="C"&&["pants","shoes"].includes(mapping.group)?
    await convertReferenceKeyStrip(v,mapping.group):v;
  }
 }
 if(S.changed.size)saveDraft(true);
 S.gender=p.gender;S.group=mapping.group;S.variant=mapping.variant;
 $("pk-gender").value=S.gender;$("pk-group").value=S.group;
 refreshOptions();
 if(!options().includes(S.variant))throw Error("Varian tidak ada dalam database stok");
 $("pk-item").value=S.variant;
 const all=allVersions();
 all[kID()]={...p,group:S.group,variant:S.variant,files,approved:false,referenceOnly:true,updated:new Date().toISOString()};
 localStorage.setItem(KEY,JSON.stringify(all));
 await openItem();
 say(inferred&&p.group!==S.group?
  "Import "+f.name+" sebagai "+S.group+"/"+S.variant+" dengan KEY yang benar, DRAFT saja.":
  "Import sebagai draft. SAVE MASTER hanya jika sudah ditinjau.");
}
function refreshOptions(){
 const opts=options();S.variant=setSelect("pk-item",opts.map(x=>[x,x.replace(/_/g," ")]),S.variant);
}
/* Genesis Pixel Editor bridge: keep the original 256×112 wardrobe strip.
 * Convert the editor's vertical four-view atlas to the unchanged game format.
 */
async function pixelContext(){
 const path=pathOf(),canvas=await buffer(path);
 return {path,canvas,dir:S.dir,gender:S.gender,group:S.group,variant:S.variant,tone:S.tone};
}
function pixelSelectDirection(dir){
 if(!DIRS.includes(dir))return;
 S.dir=dir;fresh();$("pk-direction").textContent=dir.toUpperCase();
 void draw();
}
function pixelCommit(id,atlas,saveLocal){
 const path=pathOf();
 if(id!==path.replaceAll("/","_")||!atlas||atlas.width!==64||atlas.height!==448)return false;
 const dest=S.bufs.get(path);if(!dest)return false;
 const g=dest.getContext("2d",{willReadFrequently:true});
 g.clearRect(0,0,256,112);
 g.imageSmoothingEnabled=false;
 for(let i=0;i<4;i++)g.drawImage(atlas,0,i*112,64,112,i*64,0,64,112);
 S.changed.add(path);S.edited=true;fresh();
 $("pk-version").textContent="● UNSAVED";
 if(saveLocal)saveDraft(true);
 void draw();void preview();
 say(saveLocal?"Pixel Editor: perubahan 4 arah disimpan sebagai DRAFT. SAVE MASTER untuk game.":"Pixel Editor: perubahan 4 arah sudah diterapkan. SAVE MASTER untuk game.");
 return true;
}
/* Outfit Adjust (draft-only): nudge the selected 64×112 garment cell by
 * integer pixels. There is no body or pivot modification. Uses the same
 * per-view undo stack as the existing Pixel Editor.
 */
async function translateView(dx,dy){
 dx=Math.trunc(Number(dx)||0);dy=Math.trunc(Number(dy)||0);
 if(!dx&&!dy)return true;
 if(Math.abs(dx)>64||Math.abs(dy)>112)throw Error("Offset is out of range");
 const p=pathOf(),canvas=await buffer(p);
 if(!canvas)throw Error("No garment sprite for "+p);
 const original=getCell(canvas),after=new Uint8ClampedArray(original.data.length);
 for(let y=0;y<112;y++)for(let x=0;x<64;x++){
  const nx=x+dx,ny=y+dy;
  if(nx<0||nx>=64||ny<0||ny>=112)continue;
  const k=(y*64+x)*4,n=(ny*64+nx)*4;
  after.set(original.data.subarray(k,k+4),n);
 }
 pushUndo(original);
 original.data.set(after);putCell(canvas,original);
 markDirty(p);void preview();
 root.dispatchEvent(new CustomEvent("lgr-wardrobe-nudged",{detail:{id:kID(),dir:S.dir,side:S.side,dx,dy}}));
 return true;
}
/* Six-base Genesis Adjust: artist may paint OUTSIDE the original garment alpha
 * without editing the anatomy. A single commit records one undo step and only
 * touches the selected 64x112 view/layer. Pixel-key colours stay canonical.
 */
function fitKeyCodes(group){
 return group==="top"?["C1","C2","C3","C4","C5","O1","O2","O3","O4","O5"]:
  group==="pants"?["P1","P2","P3","P4"]:group==="shoes"?["S0","S1","S2","S3"]:[];
}
function fitKeyColor(code){
 const hex=root.LGRWear.K[code];
 if(!hex)return null;
 return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),255];
}
async function paintFitStroke({points,erase=false,ink=null,size=1}={}){
 if(!["top","pants","shoes"].includes(S.group))throw Error("Base garment only");
 if(!Array.isArray(points)||!points.length||points.length>12000)throw Error("No valid stroke");
 const code=fitKeyCodes(S.group).includes(ink)?ink:fitKeyCodes(S.group)[1]||fitKeyCodes(S.group)[0];
 const color=erase?[0,0,0,0]:fitKeyColor(code);
 const p=pathOf(),c=await buffer(p),im=getCell(c),old=new Uint8ClampedArray(im.data);
 const radius=Math.max(0,Math.min(3,Math.trunc(size)-1));
 const setPixel=(x,y)=>{
  for(let yy=y-radius;yy<=y+radius;yy++)for(let xx=x-radius;xx<=x+radius;xx++){
   if(xx<0||xx>=64||yy<0||yy>=112)continue;
   im.data.set(color,(yy*64+xx)*4);
  }
 };
 const coords=points.map(p=>[Math.round(Number(p.x)),Math.round(Number(p.y))])
   .filter(p=>p.every(Number.isFinite));
 for(let i=0;i<coords.length;i++){
  const [x,y]=coords[i];setPixel(x,y);
  if(i>0){let [px,py]=coords[i-1],dx=Math.abs(x-px),dy=Math.abs(y-py),
   sx=px<x?1:-1,sy=py<y?1:-1,err=dx-dy,n=0;
   while((px!==x||py!==y)&&n++<120){
    const e2=2*err;if(e2>-dy){err-=dy;px+=sx}if(e2<dx){err+=dx;py+=sy}
    setPixel(px,py);
   }
  }
 }
 if(im.data.every((x,i)=>x===old[i]))return {changed:0};
 pushUndo({data:old});putCell(c,im);markDirty(p);void preview();
 root.dispatchEvent(new CustomEvent("lgr-wardrobe-fit-edited",{detail:{group:S.group,gender:S.gender,dir:S.dir,side:S.side}}));
 return {changed:1};
}
async function coverFitSkin(radius=1){
 if(!["top","pants","shoes"].includes(S.group))throw Error("Select a base garment");
 radius=Math.max(1,Math.min(3,Math.trunc(Number(radius))||1));
 const p=pathOf(),c=await buffer(p),im=getCell(c),old=new Uint8ClampedArray(im.data);
 const master=await root.LGRActor.master(S.gender,S.tone),
  prep=await root.LafrichPuppetRenderer.prepare(master,null,S.dir),
  bare=root.LafrichPuppetRenderer.render(prep,root.LafrichPuppetCore.blankPose());
 const body=bare.getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112).data;
 const allowed=fitKeyCodes(S.group).map(fitKeyColor);
 const allowedSet=new Set(allowed.map(x=>x.slice(0,3).join(",")));
 const inside=(x,y)=>x>=0&&x<64&&y>=0&&y<112;
 const hasBody=(x,y)=>inside(x,y)&&body[(y*64+x)*4+3]>0;
 const alpha=(x,y)=>inside(x,y)?old[(y*64+x)*4+3]:0;
 let yMin=112,yMax=-1;
 for(let k=0;k<64*112;k++)if(old[k*4+3]){const y=(k/64)|0;yMin=Math.min(yMin,y);yMax=Math.max(yMax,y)}
 if(yMax<0)throw Error("Garment is empty");
 const limits=S.group==="top"?[36,89]:S.group==="pants"?[65,108]:[84,111];
 const lower=Math.max(limits[0],yMin-radius),upper=Math.min(limits[1],yMax+radius);
 let filled=0;
 for(let y=lower;y<=upper;y++)for(let x=0;x<64;x++){
  const k=(y*64+x)*4;
  if(old[k+3])continue;
  const nearBody=hasBody(x,y)||hasBody(x-1,y)||hasBody(x+1,y)||hasBody(x,y-1)||hasBody(x,y+1);
  if(!nearBody)continue;
  let best=null,bestDist=1e5;
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
   const xx=x+dx,yy=y+dy;if(!inside(xx,yy))continue;
   const at=(yy*64+xx)*4;if(!old[at+3])continue;
   const rgb=[old[at],old[at+1],old[at+2]];
   if(!allowedSet.has(rgb.join(",")))continue;
   const dist=Math.abs(dx)+Math.abs(dy);
   if(dist<bestDist){bestDist=dist;best=[...rgb,255]}
  }
  if(best){im.data.set(best,k);filled++}
 }
 if(!filled)return {filled:0};
 pushUndo({data:old});putCell(c,im);markDirty(p);void preview();
 root.dispatchEvent(new CustomEvent("lgr-wardrobe-fit-edited",{detail:{filled,group:S.group,gender:S.gender,dir:S.dir,side:S.side}}));
 return {filled};
}
async function selectOutfit({gender,group,variant,dir,side}={}){
 if(!["male","female"].includes(gender)||!["top","pants","shoes"].includes(group))
  throw Error("Select valid Male/Female garment");
 if(typeof variant!=="string"||!variant||!S.index?.items)throw Error("No outfit item");
 if(S.changed.size)saveDraft(true);
 S.gender=gender;S.group=group;S.variant=variant;S.dir=DIRS.includes(dir)?dir:S.dir;
 S.side=side==="back"&&group==="top"?"back":"front";
 if(!validPath(pathOf("front")))throw Error("Variant is not listed in stock: "+pathOf("front"));
 $("pk-gender").value=gender;$("pk-group").value=group;refreshOptions();
 $("pk-item").value=variant;$("pk-side").value=S.side;
 $("pk-direction").textContent=S.dir.toUpperCase();
 S.ink={top:"C2",pants:"P2",shoes:"S0"}[group];
 updateBaseLabel();await openItem();
 return {gender,group,variant,dir:S.dir,side:S.side};
}
function currentOutfit(){return {gender:S.gender,group:S.group,variant:S.variant,dir:S.dir,side:S.side,dirty:S.changed.size>0}}
function saveOutfitDraft(){return saveDraft(false,false)}
async function refreshOutfit(){await openItem()}
/* Build an editable wardrobe template from the ACTIVE Genesis body, not old
 * garments. Cover ALL BODY is deliberate: it is a working mask to ERASE from
 * with the existing shared Genesis Pixel Editor, never an approved outfit.
 */
async function coverBodyDraft(){
 const group=S.group,mode=$("pk-cover-mode")?.value||"full";
 if(!["top","pants","shoes"].includes(group)){
  say("COVER BODY hanya untuk Atasan / Celana / Sepatu.",true);return;
 }
 if(!root.LGRWardrobeCover?.build){
  say("LGRWardrobeCover belum termuat.",true);return;
 }
 if(!confirm("Bangun DRAFT baru dari tubuh Genesis "+S.gender+" ("+mode+") di keempat arah? Editan draft item ini akan diganti; MASTER game dan Genesis tidak akan diubah."))return;
 const button=$("pk-cover-body");button.disabled=true;
 try{
  // Local rollback of any in-progress strip, including unsaved pixel edits.
  const old={draft:S.draft,bufs:{}};
  for(const [key,c] of S.bufs)old.bufs[key]=c.toDataURL("image/png");
  try{localStorage.setItem("lgr1-pakaian-cover-backup-v1:"+kID()+":"+Date.now(),JSON.stringify(old))}catch(e){console.warn("Local cover backup:",e)}
  const approved=(await root.LGRActor.loadBases())[S.gender],pkg=approved?.pkg;
  if(!pkg?.rig?.masks)throw Error("Official Genesis masks unavailable");
  if(JSON.stringify(pkg.parts)!==JSON.stringify(root.LGRWardrobeCover.PARTS))
   throw Error("Body part order mismatch; refusing to alter clothing");
  const master=await rigFor(),front=pathOf("front"),back=canSide()?pathOf("back"):null;
  if(!validPath(front)||(back&&!validPath(back)))throw Error("Wear path not in wardrobe index");
  const strip=cv(256,112),ctx=strip.getContext("2d",{willReadFrequently:true});
  ctx.imageSmoothingEnabled=false;
  let covered=0;
  for(let i=0;i<DIRS.length;i++){
   const d=DIRS[i],url=master.layers.body?.[d];
   if(!url)throw Error("Genesis body missing for "+d);
   const im=await loadImage(url),tmp=cv(),g=tmp.getContext("2d",{willReadFrequently:true});
   g.drawImage(im,0,0);
   const body=g.getImageData(0,0,64,112);
   const owners=Uint8Array.from(atob(pkg.rig.masks[d]),ch=>ch.charCodeAt(0));
   const result=root.LGRWardrobeCover.build(body.data,owners,group,mode);
   if(!result.count)throw Error("No body pixels found for "+d);
   covered+=result.count;
   ctx.putImageData(new ImageData(result.pixels,64,112),i*64,0);
  }
  // Generate on the working front layer. Clear OLD rear-layer art rather than
  // silently mix old official-2 sleeves behind the new official rig.
  S.bufs.set(front,strip);S.changed.add(front);
  if(back){S.bufs.set(back,cv(256,112));S.changed.add(back)}
  S.resetPending=false;S.edited=true;fresh();
  S.side="front";$("pk-side").value="front";
  saveDraft(true);
  await draw();await preview();
  say("✓ "+covered+" body pixels mengikuti Genesis "+approved.version+" · 4 arah · KEY "+group+" · DRAFT ONLY. Hapus bagian tidak perlu di Pixel Editor.");
  // Open user's real shared pixel editor with 4 directions & Move Pixels.
  await root.PakaianPixelEditor.open();
 }catch(e){console.error(e);say("COVER BODY gagal: "+e.message,true)}
 finally{button.disabled=false}
}
function controls(){
 $("pk-group").onchange=async e=>{if(S.changed.size)saveDraft(true);S.group=e.target.value;refreshOptions();S.side="front";$("pk-cover-mode").value=S.group==="pants"?"pants":S.group==="shoes"?"shoes":"full";S.ink={top:"C2",pants:"P2",shoes:"S0",hair:"H2",glasses:"GL",facial:"H2"}[S.group];await openItem()};
 $("pk-gender").onchange=async e=>{if(S.changed.size)saveDraft(true);S.gender=e.target.value;updateBaseLabel();await openItem()};
 $("pk-item").onchange=async e=>{if(S.changed.size)saveDraft(true);S.variant=e.target.value;await openItem()};
 $("pk-side").onchange=async e=>{S.side=e.target.value;fresh();await draw()};
 $("pk-tone").onchange=async e=>{S.tone=e.target.value;await draw();void preview()};
 $("pk-color").onchange=async e=>{S.color=e.target.value;await draw();void preview()};
 $("pk-motion").onchange=e=>{S.motion=e.target.value;S.frame=0;void preview()};
 $("pk-ghost").onchange=()=>void draw();
 $("pk-open-full-editor").onclick=()=>void root.PakaianPixelEditor.open();
 $("pk-cover-body").onclick=()=>void coverBodyDraft();
 $("pk-dir").onclick=e=>{const b=e.target.closest("button[data-dir]");if(!b)return;S.dir=b.dataset.dir;fresh();$("pk-direction").textContent=S.dir.toUpperCase();void draw()};
 for(let i=0;i<4;i++)$("pk-v"+i).onclick=()=>{S.dir=DIRS[i];fresh();$("pk-direction").textContent=S.dir.toUpperCase();void draw()};
 $("pk-save").onclick=()=>saveDraft();
 $("pk-approve").onclick=()=>{if(!confirm("Simpan sebagai MASTER PAKAIAN v2 untuk Genesis aktif? Master sebelumnya dibackup saat tersinkron ke Drive."))return;void saveMaster()};
 $("pk-export").onclick=exportMaster;
 $("pk-export-draft").onclick=()=>void exportDraft().catch(console.warn);
 $("pk-import").onchange=e=>{const f=e.target.files?.[0];if(f)importMaster(f).catch(x=>say(x.message,true));e.target.value=""};
 $("pk-reset").onclick=async()=>{
  const id=S.gender+"_"+S.group+"_"+S.variant,canonical=await officialGarment(id);
  if(!confirm(canonical?"Reset ke 6 BASE RESMI 2026-11-13 untuk "+id+"? Edit lokal akan dicadangkan. Genesis dan game tidak berubah.":
    "Reset ke stok lama "+id+"? Draft lama tetap tersedia sampai kamu simpan."))return;
  const old=allVersions()[kID()];
  if(old)try{localStorage.setItem("lgr-pakaian-backup-before-reset:"+kID()+":"+Date.now(),JSON.stringify(old))}catch(err){console.warn("Reset backup:",err)}
  S.bufs.clear();S.changed.clear();fresh();
  if(canonical){
   S.draft=canonical;S.resetPending=false;
   for(const p of Object.keys(canonical.files)){if(validPath(p)){await buffer(p);S.changed.add(p)}}
   $("pk-version").textContent="● BASE RESMI (RESET DRAFT)";
  }else{S.draft=null;S.resetPending=true}
  await draw();void preview();
  say(canonical?"Enam base resmi dipulihkan. SAVE DRAFT untuk menyimpan; master game tidak berubah.":"Sprite stok lama dimuat. SAVE DRAFT untuk menyimpan reset.");
 };
 $("pk-undo").onclick=()=>undoRedo("undo");$("pk-redo").onclick=()=>undoRedo("redo");
 $("pk-copy").onclick=async()=>{
  const c=await buffer(pathOf()),data=getCell(c),r=S.selection||{x:0,y:0,w:64,h:112};
  const out=new Uint8ClampedArray(r.w*r.h*4);for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++)out.set(data.data.slice(((r.y+y)*64+(r.x+x))*4,((r.y+y)*64+(r.x+x)+1)*4),(y*r.w+x)*4);
  S.copied={w:r.w,h:r.h,data:out};say("Copied "+r.w+"×"+r.h+". Pilih PASTE lalu klik canvas.");
 };
 $("pk-paste").onclick=()=>{S.flipPaste=false;setTool("paste")};
 $("pk-paste-flip").onclick=()=>{S.flipPaste=true;setTool("paste")};
 document.querySelectorAll("[data-pk-tool]").forEach(b=>b.onclick=()=>setTool(b.dataset.pkTool));
 const editor=$("pk-editor");
 editor.onpointerdown=async e=>{if(e.button!==0)return;e.preventDefault();editor.setPointerCapture(e.pointerId);S.drag=false;const [x,y]=point(e);S.lastPoint=[x,y];await actionAt(x,y);S.drag=true};
 editor.onpointermove=e=>{if(!S.drag||!["pen","erase"].includes(S.tool))return;const [x,y]=point(e);if(S.lastPoint[0]===x&&S.lastPoint[1]===y)return;S.lastPoint=[x,y];void actionAt(x,y)};
 editor.onpointerup=()=>{if(S.drag){S.drag=false;void preview()}};
 editor.onpointercancel=()=>{S.drag=false};
 $("pk-play").onclick=e=>{
  if(S.playing){clearInterval(S.playing);S.playing=null;e.target.textContent="▶ PLAY";return}
  e.target.textContent="Ⅱ PAUSE";
  S.playing=setInterval(()=>{if($("pakaianpanel").hidden)return;S.frame=(S.frame+1)%6;void preview()},230);
 };
}
async function init(panel){
 if(S.ready)return;
 panel.innerHTML='<div class="pk-layout"><aside class="pk-aside"><div class="pk-box"><h3>DATABASE PAKAIAN</h3><label>Gender<select id="pk-gender"><option value="male">Male</option><option value="female">Female</option></select></label><label>Kategori<select id="pk-group"><option value="top">Atasan</option><option value="pants">Celana</option><option value="shoes">Sepatu</option><option value="hair">Rambut</option><option value="glasses">Kacamata</option><option value="facial">Facial Hair</option></select></label><label>Item<select id="pk-item"></select></label><label>Layer<select id="pk-side"><option value="front">Depan</option><option value="back">Belakang</option></select></label><div class="pk-tag" id="pk-file"></div><div class="pk-tag" id="pk-version">STOK</div></div><div class="pk-box"><h3>WARNA / KEY PIXEL</h3><label>Skin Tone<select id="pk-tone"><option value="light">Light</option><option value="porcelain">Porcelain</option><option value="tan">Tan</option><option value="medium">Medium</option><option value="brown">Brown</option><option value="deep">Deep</option></select></label><label>Warna<select id="pk-color"></select></label><div id="pk-inks" class="pk-inks"></div><p class="pk-small">Pixel disimpan sebagai Color Key, warna preview tidak dibakar ke sprite.</p></div><div class="pk-box"><h3>VERSI / MASTER</h3><label>Catatan versi<textarea id="pk-note" rows="3" placeholder="Catatan penyesuaian..."></textarea></label><button id="pk-save">▣ SAVE DRAFT</button><button id="pk-approve">✓ SAVE MASTER → GAME / DRIVE</button><button id="pk-export-draft" class="primary" type="button">↓ EXPORT JSON REFERENSI (4 ARAH)</button><button id="pk-export">↓ EXPORT MASTER V2 (BELUM PUBLISH)</button><label class="pk-file">↑ IMPORT MASTER JSON<input id="pk-import" type="file" accept=".json,application/json"></label><button id="pk-reset">↶ RESET KE STOCK</button><p class="pk-small">SAVE MASTER membuat master v2 aktif. Bila Drive tersambung, master tersinkron ke Membangun / Mahluk Hidup / Database / Pakaian.</p></div></aside><main class="pk-main"><div class="pk-box"><h3>01 · PIXEL EDITOR — <span id="pk-direction">SE</span></h3><div class="pk-editor-launch"><div class="pk-cover-controls"><label>Cakupan tubuh dari Genesis<select id="pk-cover-mode"><option value="full">SELURUH BADAN (tanpa kepala)</option><option value="top">TORSO + LENGAN PENDEK</option><option value="long_top">TORSO + LENGAN PANJANG</option><option value="pants">PINGGUL + KAKI</option><option value="shoes">KAKI BAWAH / SEPATU</option></select></label><button id="pk-cover-body" class="primary" type="button">▨ COVER BODY → PIXEL EDITOR</button></div><p class="pk-small">Buat coverage 4 arah dari body mask Genesis resmi (bukan kaos lama); erase / move / detail di Pixel Editor. Hanya DRAFT pakaian, bukan update anatomi atau game.</p><button id="pk-open-full-editor" class="primary" type="button">✎ BUKA PIXEL EDITOR</button><p>Editor yang sama dengan Genesis: Move Pixels (M), Select (S), Grid 1/8/16 px, zoom/pinch, copy, paste flip, dan Undo/Redo. Pilih arah lewat thumbnail di bawah atau langsung dalam editor.</p></div><div class="pk-tools"><button data-pk-tool="pen" aria-pressed="true">✎ PEN</button><button data-pk-tool="erase">⌫ ERASE</button><button data-pk-tool="fill">▧ FILL</button><button data-pk-tool="pick">♢ PICK</button><button data-pk-tool="select">▤ SELECT</button><button id="pk-copy">COPY</button><button id="pk-paste">PASTE</button><button id="pk-paste-flip">PASTE FLIP</button><button id="pk-undo">↶ UNDO</button><button id="pk-redo">↷ REDO</button></div><div id="pk-dir" class="pk-dir"><button data-dir="se">SE</button><button data-dir="sw">SW</button><button data-dir="ne">NE</button><button data-dir="nw">NW</button><label><input type="checkbox" id="pk-ghost" checked>Base overlay</label></div><div class="pk-canvas"><canvas id="pk-editor" width="64" height="112" aria-label="Pixel Editor 64 × 112"></canvas></div><div class="pk-views"><canvas id="pk-v0" width="64" height="112"></canvas><canvas id="pk-v1" width="64" height="112"></canvas><canvas id="pk-v2" width="64" height="112"></canvas><canvas id="pk-v3" width="64" height="112"></canvas></div></div></main><aside class="pk-right"><div class="pk-box"><h3>02 · REVIEW IN MOTION</h3><div class="pk-small" id="pk-base-label">Base aktif: official</div><label>Animasi<select id="pk-motion"><option value="idle">Idle</option><option value="walk">Walk</option><option value="bow">Bow</option><option value="sit">Sit</option><option value="wave">Wave</option></select></label><div class="pk-views pk-review"><canvas id="pk-r0" width="64" height="112"></canvas><canvas id="pk-r1" width="64" height="112"></canvas><canvas id="pk-r2" width="64" height="112"></canvas><canvas id="pk-r3" width="64" height="112"></canvas></div><button id="pk-play">▶ PLAY</button><span id="pk-motion-label">Idle · frame 1</span><p class="pk-small">Preview memakai LGR1Raster & animasi official. Yang berubah hanya layer pakaian.</p></div><div class="pk-box"><h3>03 · ALUR MASTER</h3><ol><li>Pilih pakaian + gender</li><li>Edit 4 view + front/back</li><li>Review idle, walk, bow, sit</li><li>Save Draft → review</li><li>Export master untuk ingest ke game</li></ol><p class="pk-small">Genesis, pivots, slicing dan master animasi tidak disentuh.</p></div><div id="pk-status" role="status">Memuat database pakaian…</div></aside></div>';
 try{
  S.index=await(await fetch(rootUrl()+BASE+"index.json",{cache:"no-store"})).json();
  if(S.index.format!=="lgr1-wear-index-v1"||!Array.isArray(S.index.items))throw Error("Index pakaian tidak valid");
  S.base=(await root.LGRActor.loadBases()).male.version;
  S.basePackages={};
  controls();updateBaseLabel();refreshOptions();S.ready=true;await openItem();say("PAKAIAN.EXE aktif · "+S.index.items.length+" bahan stok lama untuk direvisi · Genesis "+S.base+". Master baru format v2.");
 }catch(e){console.error(e);say("Gagal memuat PAKAIAN.EXE: "+e.message,true)}
}
root.MahlukPakaian=Object.freeze({init,pixelContext,pixelCommit,pixelSelectDirection,exportDraft,translateView,selectOutfit,currentOutfit,saveOutfitDraft,refreshOutfit,paintFitStroke,coverFitSkin});
})(window);