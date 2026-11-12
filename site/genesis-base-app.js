/* GENESIS BASE by Lafrich — LGR-1 base editor (own copy of the former Mahluk Hidup workshop code).
 * The only source of anatomy is the approved frozen V6B Genesis Male/Female.
 * Art -> pivot/slice -> immutable binding -> pose test -> approved master.
 * Old character, action, animation and Genesis local databases are never read.
 * Facial art is always an optional Emosi.exe overlay, not baked into body art.
 */
(function(root){"use strict";
const C=root.LafrichPuppetCore,R=root.LafrichPuppetRenderer,P=root.MH2PlanePixelEditor,M=root.LGR1Motion;
const $=id=>document.getElementById(id),DIR=C.DIRS,PARTS=C.PARTS,STEPS=["pixel","rig","bind","test","motion","save"];
const TOTAL_REVIEWS=PARTS.length*4; // 11 parts × 4 angles = 44
const USER_MOTION_KEY="vl-lgr1-user-motions-v1",OUTFIT_TWEAK_KEY="vl-lgr1-outfit-tweaks-v1";
const SOURCE=Object.freeze({male:"genesis_male_nude",female:"genesis_female_nude"});
const MASTER_IDS=Object.freeze({male:"lafrich_genesis_male",female:"lafrich_genesis_female"});
// Genesis Base (genesis-base.html) runs this same workshop limited to
// 01 pixel + 02 pivot/slice, with its OWN draft store; packaging/Drive lives
// in genesis-base.js through the small GenesisWorkbench hook below.
const BASE_MODE=true; // genesis-base.html only
const WORKBENCH_DRAFT_KEY="vl-lafrich-genesis-workbench-drafts-v1";
const DRAFT_KEY=BASE_MODE?"vl-lafrich-genesis-base-drafts-v1":WORKBENCH_DRAFT_KEY;
const MASTER_KEY="vl-lafrich-genesis-approved-masters-v1";
const MASTER_FORMAT="lafrich-genesis-master-v1",BIND_FORMAT="lafrich-genesis-binding-v1",RIG_FORMAT="LGR-1";
const cv=() => R.rgba(64,112),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const clone=C.clone;
let gender="male",dir="se",selected="head",step="pixel",tool="pivot",zoom=5,activeLayer="body";
let drafts={},source={},preparedCache=new Map(),rev=0,paintDrag=null,renderRequest=0;
let pixelEditor=null,pixelSession=null,maskCopied=null,partCopied=null,isolated=false,maskUndo=[],maskRedo=[];
let faceEntries=[],faceImage=null,faceId="",page="workshop",sourcePending=Promise.resolve();
let playing=false,playTick=0,playFrame=0,motionMs=0,rigPreviewTimer=0;
let motionLib={poses:{neutral:{}},motions:[]},userMotions=[],editMotion=null,editFrame=0,motionPart="arm_r_upper";
let outfitId="",outfitChar=null,outfitCache={},outfitTweaks={};
let unassignedClusters=[],activeUnassigned=-1,unassignedUndo=null;
function clustersOf(active,d,kind,extra){
 const visited=new Uint8Array(C.N),found=[];
 for(let start=0;start<C.N;start++){
  if(!active[start]||visited[start])continue;
  const queue=[start],pixels=[];visited[start]=1;
  let minX=63,minY=111,maxX=0,maxY=0;
  for(let i=0;i<queue.length;i++){
   const index=queue[i],x=index%64,y=Math.floor(index/64);
   pixels.push(index);minX=Math.min(minX,x);maxX=Math.max(maxX,x);
   minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   // 8-neighbor grouping treats diagonally touching stray pixels as one cluster.
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;
    const nx=x+dx,ny=y+dy;
    if(nx<0||nx>=64||ny<0||ny>=112)continue;
    const n=ny*64+nx;
    if(active[n]&&!visited[n]){visited[n]=1;queue.push(n)}
   }
  }
  found.push({dir:d,kind,pixels,count:pixels.length,minX,minY,maxX,maxY,...(extra?extra(pixels):{})});
 }
 return found;
}
const FLOATER_MAX=6;
function scanUnassignedClusters(outfitMasks=null){
 // UNASSIGNED: visible source pixels that belong to no part.
 // FLOATER: tiny isolated islands (≤6 px) of visible art touching nothing.
 // OUTFIT: Custom Wear pixels outside the body outline (auto → nearest part).
 if(!master()||!source[gender])return [];
 const found=[];
 for(const d of DIR){
  const composite=source[gender][d];
  if(!composite)continue;
  const alpha=composite.getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112).data;
  const mask=C.decode(master().masks[d]);
  const active=new Uint8Array(C.N),visible=new Uint8Array(C.N);
  for(let k=0;k<C.N;k++){if(alpha[k*4+3]>0){visible[k]=1;if(mask[k]===255)active[k]=1}}
  const unassigned=clustersOf(active,d,"unassigned");
  found.push(...unassigned);
  const inUnassigned=new Set(unassigned.flatMap(c=>c.pixels));
  const islands=clustersOf(visible,d,"floater").filter(c=>c.count<=FLOATER_MAX&&!c.pixels.some(k=>inUnassigned.has(k)));
  if(islands.length&&visible.reduce((n,v)=>n+v,0)>FLOATER_MAX)found.push(...islands);
  const wear=outfitMasks?.[d];
  if(wear){
   const bm=new Uint8Array(C.N).fill(255);
   for(let k=0;k<C.N;k++)if(visible[k])bm[k]=mask[k];
   const expanded=root.LGR1Raster.expandMask(bm);
   const tw=outfitFor("test")?.maskTweaks?.[d];
   const tweak=tw?Uint8Array.from(atob(tw),c=>c.charCodeAt(0)):null;
   const outside=new Uint8Array(C.N);
   for(let k=0;k<C.N;k++)if(wear[k]&&!visible[k])outside[k]=1;
   found.push(...clustersOf(outside,d,"outfit",px=>{
    const votes=new Map();
    for(const k of px){const o=tweak&&tweak[k]!==254?tweak[k]:expanded[k];votes.set(o,(votes.get(o)||0)+1)}
    const owner=[...votes.entries()].sort((a,b)=>b[1]-a[1])[0][0];
    return {owner:owner===255?"STATIC":PARTS[owner],tweaked:!!tweak&&px.some(k=>tweak[k]!==254)};
   }));
  }
 }
 return found;
}
function selectedUnassigned(){return unassignedClusters[activeUnassigned]||null}
function updateUnassignedUI(){
 const choice=$("unassigned-clusters");
 if(!choice)return;
 choice.replaceChildren();
 const total=unassignedClusters.reduce((n,c)=>n+c.count,0);
 for(let i=0;i<unassignedClusters.length;i++){
  const c=unassignedClusters[i];
  const tag=c.kind==="floater"?"LOOSE PIXELS":c.kind==="outfit"?"OUTFIT MOVES WITH "+(c.owner==="STATIC"?"STATIC":labels[c.owner])+(c.tweaked?" (tweaked)":""):"NO BODY PART";
  choice.add(new Option(c.dir.toUpperCase()+" · "+tag+" · "+c.count+
   " px · x "+c.minX+"–"+c.maxX+", y "+c.minY+"–"+c.maxY,String(i)));
 }
 if(!unassignedClusters.length)choice.add(new Option("No unassigned pixels or floaters found",""));
 const valid=activeUnassigned>=0&&activeUnassigned<unassignedClusters.length;
 choice.value=valid?String(activeUnassigned):"";
 const current=selectedUnassigned();
 if($("unassigned-reason"))$("unassigned-reason").textContent=current?issueReason(current):"";
 $("unassigned-detail").textContent=total===0?
  "✓ No visible unassigned pixels, floaters"+(outfitChar?" or outfit overhang":"")+" across four directions.":
  total+" px in "+unassignedClusters.length+" issue clusters ("+
  ["unassigned","floater","outfit"].map(k=>unassignedClusters.filter(c=>c.kind===k).length+" "+k).join(", ")+") across "+
  DIR.filter(d=>unassignedClusters.some(c=>c.dir===d)).map(d=>d.toUpperCase()).join(", ")+
  (current?" · HIGHLIGHT: "+current.dir.toUpperCase()+" / "+current.count+" px":"");
 $("next-unassigned").disabled=!unassignedClusters.length;
 $("remove-stray-group").disabled=!current||current.kind==="outfit";
 $("remove-strays-angle").disabled=!unassignedClusters.some(c=>c.dir===dir&&c.kind!=="outfit");
 $("assign-outfit-cluster").disabled=!current||current.kind!=="outfit";
 $("reset-outfit-tweaks").disabled=!outfitChar||!outfitTweaks?.[gender]?.[outfitChar?.id];
 $("undo-stray-delete").disabled=!unassignedUndo||unassignedUndo.gender!==gender;
}
function focusUnassignedIssue(index){
 if(!unassignedClusters.length){activeUnassigned=-1;updateUnassignedUI();return}
 activeUnassigned=((index%unassignedClusters.length)+unassignedClusters.length)%unassignedClusters.length;
 const group=selectedUnassigned();
 dir=group.dir;
 if(step!=="rig")switchStep("rig");else syncControls();
 setZoom(Math.max(zoom,9));updateUnassignedUI();void renderAll();
 root.requestAnimationFrame(()=>{
  if(activeUnassigned<0||selectedUnassigned()!==group)return;
  const wrap=$("stagewrap");
  const centerX=(group.minX+group.maxX+1)/2*zoom;
  const centerY=(group.minY+group.maxY+1)/2*zoom;
  wrap.scrollLeft=Math.max(0,centerX-wrap.clientWidth/2);
  wrap.scrollTop=Math.max(0,centerY-wrap.clientHeight/2);
 });
 status(group.dir.toUpperCase()+" x "+group.minX+"–"+group.maxX+", y "+group.minY+"–"+group.maxY+" · "+issueReason(group));
}
function issueReason(c){
 if(c.kind==="floater")return "WHY: "+c.count+" loose pixel(s) not touching the body (usually a leftover of the old seed). Delete them, or in NE/NW use 01 · BACK HEAD FROM WHOLE FRONT HEAD.";
 if(c.kind==="outfit")return "WHY: "+c.count+" outfit pixel(s) stick out past the body outline. They are fine and will move with "+
  (c.owner==="STATIC"?"nothing (static)":labels[c.owner])+". Only if that's wrong: pick another body part and ASSIGN (this outfit only).";
 return "WHY: "+c.count+" visible pixel(s) belong to NO body part, so they would not move. Paint them into a part (SLICE PAINT) or delete them if they are stray art.";
}
async function outfitMasksForScan(){
 if(!outfitChar)return null;
 const out={};for(const d of DIR)out[d]=await outfitAlpha(d);return out;
}
async function findUnassignedPixels(){
 await sourcePending;
 unassignedClusters=scanUnassignedClusters(await outfitMasksForScan());
 activeUnassigned=unassignedClusters.length?0:-1;
 updateUnassignedUI();
 if(unassignedClusters.length)focusUnassignedIssue(0);
 else status("CLEAN · no unassigned pixels or floaters in any of 4 angles.");
 return unassignedClusters;
}
function paintUnassignedFocus(destination,d){
 const issue=selectedUnassigned();
 if(!issue||issue.dir!==d||step!=="rig")return;
 const image=destination.createImageData(64,112);
 for(const k of issue.pixels){
  const off=k*4;
  image.data[off]=255;image.data[off+1]=227;image.data[off+2]=23;image.data[off+3]=208;
 }
 const marker=cv(),mctx=marker.getContext("2d");
 mctx.putImageData(image,0,0);
 destination.drawImage(marker,0,0);
 destination.save();destination.strokeStyle="#ffdf00";destination.lineWidth=1;
 destination.strokeRect(issue.minX-1.5,issue.minY-1.5,
  issue.maxX-issue.minX+3,issue.maxY-issue.minY+3);
 destination.restore();
}
async function eraseUnassignedStrays(allInAngle=false){
 await sourcePending;
 const chosen=selectedUnassigned(),targetDir=allInAngle?dir:chosen?.dir;
 if(!targetDir)throw Error("Use FIND UNASSIGNED first");
 // Rescan so a stale result can never erase a pixel that was assigned meanwhile.
 const current=scanUnassignedClusters().filter(c=>c.dir===targetDir&&c.kind!=="outfit");
 const matching=allInAngle?current:current.filter(c=>c.kind===chosen?.kind&&c.pixels.includes(chosen?.pixels[0]));
 const pixelIndices=[...new Set(matching.flatMap(c=>c.pixels))];
 if(!pixelIndices.length){
  await findUnassignedPixels();throw Error("Issue changed; scan updated, nothing deleted");
 }
 const count=pixelIndices.length;
 if(!confirm("DELETE "+count+" visible unassigned / floater source pixel(s) in "+
  targetDir.toUpperCase()+"? This ERASES artwork in ALL affected physical layers "+
  "at those exact coordinates. It will NOT assign any part, change pivots, or "+
  "reset your "+TOTAL_REVIEWS+"/"+TOTAL_REVIEWS+" reviews. Undo available until the page is reloaded."))return;
 const g=gender,r=record(),rig=r.rig;
 const original=Object.fromEntries(C.LAYERS.map(layer=>[layer,rig.layers[layer]?.[targetDir]||null]));
 const changed={};let layerHits=0;
 for(const layer of C.LAYERS){
  const old=original[layer];if(!old)continue;
  const surface=await canvasFromData(old),context=surface.getContext("2d",{willReadFrequently:true});
  const data=context.getImageData(0,0,64,112);let hits=0;
  for(const k of pixelIndices){
   if(data.data[k*4+3]===0)continue;
   data.data.fill(0,k*4,k*4+4);hits++;
  }
  if(hits){context.putImageData(data,0,0);changed[layer]=surface.toDataURL("image/png");layerHits+=hits}
 }
 if(gender!==g||record()!==r)throw Error("Current character changed; retry cleanup");
 if(!layerHits)throw Error("No source artwork pixels matched; nothing deleted");
 unassignedUndo={gender:g,dir:targetDir,layers:original};
 for(const [layer,png] of Object.entries(changed))rig.layers[layer][targetDir]=png;
 R.clearCache();sourcePending=sourceCanvases(g);await sourcePending;
 makeDirty(); // Only the source artwork changes, NOT masks/pivots/previous QA receipts.
 await findUnassignedPixels();
 status("REMOVED "+count+" stray pixels from "+targetDir.toUpperCase()+
  " ("+layerHits+" artwork-layer pixels cleared). "+TOTAL_REVIEWS+" part/angle reviews preserved."+
  " Undo remains available.");
}
async function undoUnassignedRemoval(){
 const entry=unassignedUndo;if(!entry||entry.gender!==gender)return;
 await sourcePending;
 const rig=master();
 for(const layer of C.LAYERS){
  if(entry.layers[layer])rig.layers[layer][entry.dir]=entry.layers[layer];
  else delete rig.layers[layer]?.[entry.dir];
 }
 unassignedUndo=null;
 R.clearCache();sourcePending=sourceCanvases(gender);await sourcePending;
 makeDirty();await findUnassignedPixels();
 status("UNDO COMPLETE · original artwork restored in "+entry.dir.toUpperCase()+
  ". No slicing/pivot reviews changed.");
}
function scheduleRigPreview(){
 if(rigPreviewTimer)return;
 rigPreviewTimer=root.setTimeout(()=>{rigPreviewTimer=0;flushCache()},85);
}
function cancelRigPreview(){
 if(rigPreviewTimer){root.clearTimeout(rigPreviewTimer);rigPreviewTimer=0}
}
const reviewKey=(direction,part)=>direction+"|"+part;
function reviewCount(){
 const r=record();
 return DIR.reduce((n,d)=>n+PARTS.filter(part=>r?.reviewed?.[reviewKey(d,part)]).length,0);
}
function missingReviews(){
 const r=record();
 return DIR.flatMap(d=>PARTS.filter(part=>!r?.reviewed?.[reviewKey(d,part)]).map(part=>d.toUpperCase()+" / "+labels[part]));
}
function invalidateReviews(direction=null,parts=null){
 const r=record();if(!r)return;
 if(!direction)r.reviewed={};
 else for(const part of parts||PARTS)delete r.reviewed?.[reviewKey(direction,part)];
 r.testedAngles={};makeDirty();
}
function stopPlayback(){
 playing=false;playTick=0;
 for(const id of ["test-play","motion-play"])if($(id))$(id).textContent="▶ PLAY PREVIEW";
}
let lastShownFrame=-1;
function animatePlayback(now){
 if(!playing)return;
 if((step!=="test"&&step!=="motion")||page!=="workshop"){stopPlayback();return}
 if(!playTick)playTick=now;
 const speed=Number($("test-speed").value)||1;
 motionMs+=(now-playTick)*speed;playTick=now;
 const mo=currentMotion();
 if(mo){
  const total=M.duration(mo);motionMs%=total;
  $("test-scrub").value=Math.round(motionMs/total*100);
  const i=M.frameIndexAt(mo,motionMs);
  if(i!==lastShownFrame){lastShownFrame=i;if(step==="motion")editFrame=i;void renderAll();if(step==="motion")syncMotionControls()}
 }
 root.requestAnimationFrame(animatePlayback);
}
function togglePlayback(){
 if(playing){stopPlayback();syncControls();return}
 if(step==="test"&&!record()?.bound){status("Bind a rig before testing motion",true);return}
 if(!currentMotion()){status("Choose a motion first",true);return}
 playing=true;playTick=0;playFrame=0;lastShownFrame=-1;
 for(const id of ["test-play","motion-play"])if($(id))$(id).textContent="Ⅱ PAUSE PREVIEW";
 root.requestAnimationFrame(animatePlayback);
}
const canvas=$("stage"),ctx=canvas.getContext("2d",{willReadFrequently:true});
const labels={head:"KEPALA / HEAD",torso:"TORSO (BADAN ATAS)",pelvis:"PINGGUL / PELVIS",arm_near_upper:"LENGAN DEPAN · ATAS",
 arm_near_lower:"LENGAN DEPAN · BAWAH",arm_far_upper:"LENGAN BELAKANG · ATAS",
 arm_far_lower:"LENGAN BELAKANG · BAWAH",leg_near_upper:"PAHA DEPAN",
 leg_near_lower:"BETIS DEPAN",leg_far_upper:"PAHA BELAKANG",
 leg_far_lower:"BETIS BELAKANG"};
function status(s,error=false){
 $("statusmsg").textContent=String(s);$("status").classList.toggle("error",error);
}
function record(){return drafts[gender]}
function master(){return record()?.rig}
function flushCache(){preparedCache.clear();rev++;void renderAll()}
function makeDirty(){
 const r=record();if(!r)return;
 r.bound=null;r.approved=false;r.saved=false;r.edited=new Date().toISOString();
 flushCache();persistDraft();refreshRigMotionNow();
}
function download(name,data,mime){
 const blob=new Blob([data],{type:mime||"application/json"}),u=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=u;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(u),30000);
}
function persistDraft(){
 try{
  const payload={format:"lafrich-genesis-draft-store-v1",drafts};
  localStorage.setItem(DRAFT_KEY,JSON.stringify(payload));
  return true;
 }catch(error){status("LOCAL DRAFT SAVE FAILED: "+error.message+". Export or cloud-save a JSON backup.",true);return false}
}
// Pre-pelvis (10-part) bindings still open; their rig is migrated in memory by
// C.validateMaster (pelvis = lower torso). The old binding itself cannot be
// re-used (44 reviews needed), so the draft goes back to review + rebind.
const isLegacyBound=b=>Array.isArray(b?.hierarchy?.parts)&&b.hierarchy.parts.length!==PARTS.length;
let legacyNotice=[];
function loadStored(){
 let s=null;
 try{s=JSON.parse(localStorage.getItem(DRAFT_KEY)||"null")}catch{}
 if(s?.format==="lafrich-genesis-draft-store-v1"){
  for(const g of ["male","female"]){
   const x=s.drafts?.[g];
   if(!x?.rig)continue;
   try{
    const legacy=C.isLegacyMaster(x.rig),rig=C.validateMaster(x.rig);
    const bound=x.bound?.format===BIND_FORMAT&&!isLegacyBound(x.bound)?x.bound:null;
    if(legacy)legacyNotice.push(g.toUpperCase());
    drafts[g]={rig,bound,
     reviewed:x.reviewed&&typeof x.reviewed==="object"?x.reviewed:{},
     testedAngles:bound&&x.testedAngles&&typeof x.testedAngles==="object"?x.testedAngles:{},
     approved:!!x.approved&&!!bound,saved:!!x.saved&&!!bound,edited:String(x.edited||""),
     manual:x.manual&&typeof x.manual==="object"?x.manual:{},
     skin:root.LGRSkin?root.LGRSkin.normalize(x.skin):{tone:"light"},seed:x.seed==="official"?"official":x.seed==="v6b"?"v6b":""};
   }catch(e){status("Existing "+g+" draft invalid; preserved in storage: "+e.message,true)}
  }
 }
}
async function canvasFromData(data){
 const c=cv();
 if(data){
  const im=await R.loadPng(data);
  if(!im)throw Error("Cannot load original Genesis pixel PNG");
  c.getContext("2d").drawImage(im,0,0);
 }
 return c;
}
async function sourceCanvases(g){
 // Composite physical source layers only for references and Python neutral export;
 // keep skin/body, top, trousers, shoes and hair independently editable in rig.
 source[g]={};
 const files=drafts[g].rig.layers;
 for(const d of DIR){
  const c=cv(),g2=c.getContext("2d",{willReadFrequently:true});
  g2.imageSmoothingEnabled=false;
  for(const layer of C.LAYERS){
   const png=files[layer]?.[d],img=await R.loadPng(png);
   if(img)g2.drawImage(img,0,0);
  }
  source[g][d]=c;
 }
}
// Official LGR-1 base (approved by Lafrich, site/media/lgr1/base/) is the
// default seed; the frozen V6B source is only the fallback / "OLD V6B" reset.
const OFFICIAL_BASE_VERSION="official-7";
async function officialRecord(g){
 // Resolve active official-6 male/female bases via approved index and checksum.
 // Previously approved packages stay at their original paths. Never replace a local draft.
 const rootPath="./media/lgr1/base/";
 const ix=await fetch(rootPath+"index.json?v="+OFFICIAL_BASE_VERSION,{cache:"no-store"});
 if(!ix.ok)throw Error("official index HTTP "+ix.status);
 const index=await ix.json();
 const info=index?.bases?.[g];
 if(!info||index.version!==OFFICIAL_BASE_VERSION||
    !/^genesis-base-(male|female)(?:-official-[0-9]+)?\.json$/.test(info.package))
  throw Error("official "+g+" base index invalid");
 const r=await fetch(rootPath+info.package+"?v="+OFFICIAL_BASE_VERSION,{cache:"no-store"});
 if(!r.ok)throw Error("official base HTTP "+r.status);
 const pkg=await r.json();
 if(pkg.rigSha256!==info.rigSha256)throw Error("official "+g+" rig version mismatch");
 for(let i=0;i<50&&!root.GenesisBase;i++)await new Promise(res=>setTimeout(res,100));
 if(!root.GenesisBase)throw Error("Genesis Base package module missing");
 const p=await root.GenesisBase.readPackage(pkg); // checksum + key ramp → light
 if(p.g!==g)throw Error("official base gender mismatch");
 return p;
}
async function seed(g,from="official"){
 if(from==="official"){
  try{
   const p=await officialRecord(g);
   drafts[g]={rig:C.validateMaster(p.rig),bound:null,reviewed:{},testedAngles:{},approved:false,saved:false,
    edited:new Date().toISOString(),manual:p.manual&&typeof p.manual==="object"?p.manual:{},skin:SK?SK.normalize(p.skin):{tone:"light"},seed:"official"};
   await sourceCanvases(g);R.clearCache();flushCache();persistDraft();
   return "official";
  }catch(e){status("Official "+g+" base unavailable ("+e.message+") · using frozen V6B",true)}
 }
 const original=root.VLGenesisSource?.bases?.[SOURCE[g]];
 if(!original||original.gender!==g||original.faceSource!=="emosi.exe")
  throw Error("Frozen V6B "+SOURCE[g]+" source not found");
 // Preserve every V6B physical layer. A flattened source would prevent
 // independent skin/garment customization in future Character Editor.
 const originalLayers=await R.seedFromV6B(g);
 const rig=C.validateMaster(originalLayers);
 if(!DIR.every(d=>Boolean(rig.layers.body[d])))
  throw Error("V6B missing a physical body layer");
 drafts[g]={rig,bound:null,reviewed:{},testedAngles:{},approved:false,saved:false,edited:new Date().toISOString(),seed:"v6b"};
 await sourceCanvases(g);
 R.clearCache();flushCache();persistDraft();
 return "v6b";
}
async function ensure(g){
 if(drafts[g]&&source[g])return;
 if(drafts[g]){await sourceCanvases(g);return}
 await seed(g);
}
function allMotions(){return [...motionLib.motions,...userMotions]}
function currentMotion(){
 if(step==="motion")return editMotion;
 const id=$("test-preset")?.value||"";
 return allMotions().find(m=>m.id===id)||null;
}
function rigSides(rig){return M.sidesOf(rig||activeRig())}
function baseOrder(d,rig){
 const o=(rig||activeRig())?.drawOrders?.[d];
 return Array.isArray(o)&&o.length===PARTS.length?o.slice():C.DRAW_ORDER.slice();
}
function poseFor(d,rig){
 // Returns {pose, order} for one direction: shared motion data (anatomical,
 // authored as seen in SE) is mapped to near/far pieces per direction.
 const p=C.blankPose();let order=null;
 if(step!=="test"&&step!=="save"&&step!=="motion")return {pose:p,order};
 const mo=currentMotion();
 if(mo){
  const valid=step==="motion"?safeMotion(mo):mo;
  if(valid){
   const i=step==="motion"&&!playing?Math.min(editFrame,valid.frames.length-1):M.frameIndexAt(valid,motionMs);
   Object.assign(p,M.framePose(motionLib.poses,valid,i,d,rigSides(rig)));
   order=M.frameOrder(baseOrder(d,rig),valid,i,d,rigSides(rig));
  }
 }
 if(step==="test"){
  p[selected].a+=Number($("test-angle").value)||0;
  p[selected].x+=Number($("test-x").value)||0;
  p[selected].y+=Number($("test-y").value)||0;
 }
 return {pose:p,order};
}
function safeMotion(m){try{return M.validateMotion(m,motionLib.poses)}catch{return null}}
function activeRig(){
 return (step==="test"||step==="save"||step==="motion")&&record()?.bound?
 record().bound.rig:master();
}
async function faceForPreview(){
 if(!faceId)return null;
 if(faceImage?.id===faceId)return faceImage.image;
 const f=faceEntries.find(x=>x.id===faceId);
 if(!f)return null;
 const img=await new Promise((resolve,reject)=>{
  const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error("Emosi PNG cannot load"));im.src=f.overlay;
 });
 faceImage={id:faceId,image:img};return img;
}
// What actually moves with each part, pixel by pixel, using the SAME rules as
// the LGR-1 raster: hair → head, outfit → tweak / nearest body part, body →
// slice mask. Empty canvas = no part. Joint fill is internal and never shown.
const ownershipCache=new Map();
function strHash(t){let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)+t.length}
async function ownershipMap(d,rig){
 const wear=outfitFor(step),key=rev+"|"+gender+"|"+d+"|"+(wear?outfitId+"#"+tweakRev:"")+"|"+strHash(rig.masks[d]);
 if(ownershipCache.has(key))return ownershipCache.get(key);
 const mask=C.decode(rig.masks[d]),owner=new Uint8Array(C.N).fill(254); // 254 = empty
 const layers={},wearPx={},HEAD=PARTS.indexOf("head");
 for(const l of C.LAYERS){
  const own=await R.pixels(rig.layers?.[l]?.[d]);if(own)layers[l]=own;
  const custom=wear&&C.WEAR.includes(l)?wear.wear?.[l]?.[d]:null;
  if(custom)wearPx[l]=await R.pixels(custom);
 }
 const anyWear=Object.keys(wearPx).length>0;
 const expanded=anyWear?root.LGR1Raster.expandMask(root.LGR1Raster.bodyMask(mask,layers)):null;
 const tw=anyWear&&wear.maskTweaks?.[d]?Uint8Array.from(atob(wear.maskTweaks[d]),c=>c.charCodeAt(0)):null;
 // Same ownership rule as LGR1Raster.prepare (hair → head; outfit → tweak or nearest body part).
 for(const l of C.LAYERS){
  const fromWear=!!wearPx[l],src=wearPx[l]||layers[l];if(!src)continue;
  const hair=l==="hair_back"||l==="hair_front";
  for(let k=0;k<C.N;k++){
   if(!src[k*4+3])continue;
   let o=hair?HEAD:mask[k];
   if(fromWear){if(tw&&tw[k]!==254)o=tw[k];else if(!hair)o=expanded[k]}
   owner[k]=o;
  }
 }
 if(ownershipCache.size>40)ownershipCache.clear();
 ownershipCache.set(key,owner);return owner;
}
async function maskHighlight(destination,d,rig){
 const own=await ownershipMap(d,rig),idx=PARTS.indexOf(selected);
 const image=destination.createImageData(64,112);
 for(let k=0;k<own.length;k++){
  if(own[k]===254)continue;
  const p=k*4;
  if(own[k]===255){image.data[p]=235;image.data[p+1]=47;image.data[p+2]=73;image.data[p+3]=160;}
  else if(own[k]===idx){image.data[p]=39;image.data[p+1]=126;image.data[p+2]=239;image.data[p+3]=83;}
  else if(step==="pixel"){image.data[p]=51;image.data[p+1]=61;image.data[p+2]=80;image.data[p+3]=30;}
 }
 const overlay=cv();overlay.getContext("2d").putImageData(image,0,0);
 destination.drawImage(overlay,0,0);
}
function showPivot(destination,d,rig){
 const p=rig.pivots[d][selected];
 destination.save();destination.strokeStyle="#ffffff";destination.lineWidth=1;
 destination.strokeRect(p.x-2.5,p.y-2.5,5,5);
 destination.strokeStyle="#e63351";destination.beginPath();
 destination.moveTo(p.x-6,p.y+.5);destination.lineTo(p.x+7,p.y+.5);
 destination.moveTo(p.x+.5,p.y-6);destination.lineTo(p.x+.5,p.y+7);
 destination.stroke();destination.restore();
}
/* ---------------- skin tone preview (game key ramp, non-destructive) ---------------- */
// Draft pixels stay in the V6B "light" tone (= exact 1:1 with the key ramp).
// Every preview (stage, thumbnails, motion, editor, sheets) swaps light → the
// chosen tone at draw time; export writes KEY colours (genesis-base.js).
const SK=root.LGRSkin,skinUrlCache=new Map();
function skinSetting(){return SK?SK.normalize(record()?.skin):{tone:"light"}}
function skinRamp(){const s=skinSetting();return SK?SK.rampFor(s.tone,s.custom):null}
function skinId(){const s=skinSetting();return s.tone+(s.custom?":"+s.custom:"")}
async function skinnedUrl(url){
 const id=skinId();if(!url||!SK||id==="light")return url;
 const key=id+"|"+url;let hit=skinUrlCache.get(key);if(hit)return hit;
 const c=await canvasFromData(url),g=c.getContext("2d",{willReadFrequently:true}),im=g.getImageData(0,0,64,112);
 if(!SK.swap(im.data,SK.TONES.light,skinRamp()))hit=url;else{g.putImageData(im,0,0);hit=c.toDataURL("image/png")}
 if(skinUrlCache.size>400)skinUrlCache.clear();skinUrlCache.set(key,hit);return hit;
}
async function skinned(m){
 if(!m||!SK||skinId()==="light")return m;
 const layers={};
 for(const [L,v] of Object.entries(m.layers||{})){layers[L]={};for(const d of Object.keys(v||{}))layers[L][d]=await skinnedUrl(v[d])}
 return {...m,layers}; // pivots/masks stay the live objects
}
function setSkin(s){
 const r=record();if(!r||!SK)return;
 r.skin=SK.normalize(s);persistDraft();R.clearCache();flushCache();refreshRigMotionNow();syncSkinUI();
 status("SKIN "+(r.skin.tone==="custom"?"CUSTOM "+r.skin.custom:r.skin.tone.toUpperCase())+" · preview only (game swaps the key ramp); pixels stay on the base ramp.");
}
let skinCheckTicket=0;
async function syncSkinUI(){
 const box=$("gb-skin-tones");if(!box||!SK)return;
 const s=skinSetting();
 if(!box.childElementCount){
  for(const t of SK.TONE_ORDER){const b=document.createElement("button");b.type="button";b.dataset.tone=t;b.title=t;
   b.style.background=SK.TONES[t].i;b.style.color=SK.TONE_ORDER.indexOf(t)>=4?"#fff":"#2b1b10";b.style.textShadow="none";b.style.borderBottom="6px solid "+SK.TONES[t]["7"];b.textContent=t.toUpperCase();
   b.onclick=()=>setSkin({tone:t});box.append(b)}
  $("gb-skin-custom").oninput=()=>setSkin({tone:"custom",custom:$("gb-skin-custom").value});
 }
 for(const b of box.querySelectorAll("button"))b.setAttribute("aria-pressed",String(b.dataset.tone===s.tone));
 if(s.custom)$("gb-skin-custom").value=s.custom.toLowerCase();
 const ticket=++skinCheckTicket,m=master();if(!m)return;
 let count=0;const colors={};
 for(const v of Object.values(m.layers||{}))for(const url of Object.values(v||{})){
  if(!url)continue;const a=(await canvasFromData(url)).getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112).data;
  const o=SK.offRamp(a);count+=o.count;for(const [c,n] of Object.entries(o.colors))colors[c]=(colors[c]||0)+n;
 }
 if(ticket!==skinCheckTicket)return;
 const list=Object.entries(colors).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([c,n])=>c+" ×"+n).join(", ");
 $("gb-skin-info").textContent=(s.tone==="custom"?"CUSTOM "+s.custom:s.tone.toUpperCase())+" · "+
  (count?"⚠ "+count+" skin-like px NOT on the key ramp (stay fixed in game): "+list:"✓ all skin pixels are on the key ramp");
}
async function renderAll(){
 await sourcePending.catch(()=>{});
 if(!master()||page!=="workshop")return;
 const token=++renderRequest,currentGender=gender,currentStep=step,m=activeRig();
 let face=null;
 try{face=await faceForPreview()}catch(e){status(e.message,true)}
 for(const d of DIR){
  if(token!==renderRequest)return;
  try{
   const wear=outfitFor(currentStep);
   const key=rev+"|"+currentGender+"|"+currentStep+"|"+d+"|"+faceId+"|"+(wear?outfitId+"#"+tweakRev:"");
   let prepared=preparedCache.get(key);
   if(!prepared){
    prepared=await R.prepare(await skinned(m),wear,d,face);
    if(token!==renderRequest)return;
    preparedCache.set(key,prepared);
   }
   const fp=poseFor(d,m);
   const output=R.render(prepared,fp.pose,fp.order?{order:fp.order}:undefined);
   if(token!==renderRequest)return;
   const out=cv(),o=out.getContext("2d",{willReadFrequently:true});
   o.imageSmoothingEnabled=false;o.drawImage(output,0,0);
   if(currentStep==="rig"&&isolated){
    const data=o.getImageData(0,0,64,112),own=await ownershipMap(d,m);
    if(token!==renderRequest)return;
    const owner=PARTS.indexOf(selected);
    for(let k=0;k<own.length;k++)if(own[k]!==owner)data.data[k*4+3]=
     Math.min(data.data[k*4+3],28);
    o.putImageData(data,0,0);
   }
   if(BASE_MODE)drawHairOverlay(o,d,m,fp.pose,1,1,true); // screen-only guide
   if(currentStep==="pixel"||currentStep==="rig"){
    await maskHighlight(o,d,m);if(token!==renderRequest)return;
    if(currentStep==="rig"){showPivot(o,d,m);paintUnassignedFocus(o,d);}
   }
   const view=$("thumb-"+d);
   if(view){const vc=view.getContext("2d");vc.imageSmoothingEnabled=false;vc.clearRect(0,0,64,112);vc.drawImage(out,0,0)}
   if(d===dir){
    ctx.clearRect(0,0,64,112);ctx.imageSmoothingEnabled=false;ctx.drawImage(out,0,0);
   }
  }catch(e){status("Preview "+d+": "+e.message,true);break}
 }
 if(currentStep==="rig"&&token===renderRequest)void renderRigMotion(true);
}
/* ---------------- 02 · motion preview on the current draft ---------------- */
let rigMotion={playing:false,ms:0,tick:0,cache:new Map(),rev:-1,frame:-1,busy:false};
function rigMotionCurrent(){const id=$("rig-motion-select")?.value;const m=allMotions().find(x=>x.id===id);return m?safeMotion(m):null}
// Redraw the preview right away (next frame) with the live, unsaved pivots;
// used on every pivot drag step, joint cap, draw order and near-side change.
let rigMotionRaf=0;
function refreshRigMotionNow(){
 if(rigMotionRaf)return;
 rigMotionRaf=root.requestAnimationFrame(()=>{rigMotionRaf=0;void renderRigMotion(true)});
}
function rotatesIn(mo,part,d,sides){
 for(let i=0;i<mo.frames.length;i++){const t=M.framePose(motionLib.poses,mo,i,d,sides)?.[part];if(t&&(t.a||t.x||t.y))return true}
 return false;
}
async function renderRigMotion(force){
 if(rigMotion.busy){if(force)rigMotion.again=true;return}
 if(step!=="rig"||page!=="workshop"||!master())return;
 const mo=rigMotionCurrent(),all=$("rig-motion-all").checked;
 for(const d of DIR)$("rig-motion-"+d).hidden=!all&&d!==dir;
 $("rig-motion-views").classList.toggle("all",all);
 if(!mo)return;
 if(rigMotion.rev!==rev){rigMotion.cache.clear();rigMotion.rev=rev;force=true}
 const i=M.frameIndexAt(mo,rigMotion.ms);
 if(!force&&i===rigMotion.frame)return;
 rigMotion.busy=true;
 try{
  const m=master(),sides=rigSides(m),g=gender;
  for(const d of DIR){
   if(!all&&d!==dir)continue;
   let prep=rigMotion.cache.get(g+"|"+d);
   if(!prep){prep=await R.prepare(await skinned(m),null,d);rigMotion.cache.set(g+"|"+d,prep)}
   const pose=Object.assign(C.blankPose(),M.framePose(motionLib.poses,mo,i,d,sides));
   const out=R.render(prep,pose,{order:M.frameOrder(baseOrder(d,m),mo,i,d,sides)});
   const c=$("rig-motion-"+d).getContext("2d");c.imageSmoothingEnabled=false;c.clearRect(0,0,64,112);c.drawImage(out,0,0);
   if(BASE_MODE)drawHairOverlay(c,d,m,pose,1,1,true); // screen-only guide
   // selected part: live pivot (magenta cross) where it is in this frame
   const pv=m.pivots?.[d]?.[selected];
   if(pv&&root.LGR1Raster?.matrices){
    const t=root.LGR1Raster.matrices(m.pivots[d],m.placements?.[d]||{},pose)[selected].mat;
    const wx=Math.round(t[0]*pv.x+t[2]*pv.y+t[4]),wy=Math.round(t[1]*pv.x+t[3]*pv.y+t[5]);
    c.fillStyle="rgba(255,0,200,.95)";c.fillRect(wx-2,wy,5,1);c.fillRect(wx,wy-2,1,5);
   }
  }
  const note=$("rig-motion-note");
  if(note)note.textContent=rotatesIn(mo,selected,dir,sides)?
   "✣ = "+labels[selected]+" pivot (live, unsaved values) · it moves in "+mo.name+".":
   "✣ = "+labels[selected]+" pivot · "+labels[selected]+" does not move in "+mo.name+", so its pivot changes nothing here; pick a motion that moves it.";
  rigMotion.frame=i;
 }catch(e){status("Motion preview: "+e.message,true);stopRigMotion()}
 finally{rigMotion.busy=false;if(rigMotion.again){rigMotion.again=false;refreshRigMotionNow()}}
}
function stopRigMotion(){rigMotion.playing=false;rigMotion.tick=0;if($("rig-motion-play"))$("rig-motion-play").textContent="▶ PLAY"}
function animateRigMotion(now){
 if(!rigMotion.playing)return;
 if(step!=="rig"||page!=="workshop"){stopRigMotion();return}
 if(!rigMotion.tick)rigMotion.tick=now;
 rigMotion.ms+=now-rigMotion.tick;rigMotion.tick=now;
 const mo=rigMotionCurrent();if(mo)rigMotion.ms%=M.duration(mo);
 void renderRigMotion(false);
 root.requestAnimationFrame(animateRigMotion);
}
function toggleRigMotion(){
 if(rigMotion.playing){stopRigMotion();return}
 if(!rigMotionCurrent()){status("Choose a motion to preview",true);return}
 rigMotion.playing=true;rigMotion.tick=0;$("rig-motion-play").textContent="Ⅱ PAUSE";
 root.requestAnimationFrame(animateRigMotion);
}
function buildAngleButtons(){
 const el=$("views");el.replaceChildren();
 for(const d of DIR){
  const btn=document.createElement("button");btn.type="button";btn.dataset.dir=d;
  const title=document.createElement("b");title.textContent=d.toUpperCase();
  const preview=document.createElement("canvas");preview.width=64;preview.height=112;preview.id="thumb-"+d;
  btn.append(title,preview);btn.onclick=()=>switchAngle(d);el.append(btn);
 }
}
function buildPartButtons(){
 const el=$("bodyparts");el.replaceChildren();
 const picker=$("part-select");picker.replaceChildren();
 for(const part of PARTS)picker.add(new Option(labels[part],part));
 picker.onchange=()=>selectPart(picker.value);
 $("part-prev").onclick=()=>selectPart(PARTS[(PARTS.indexOf(selected)+PARTS.length-1)%PARTS.length]);
 $("part-next").onclick=()=>selectPart(PARTS[(PARTS.indexOf(selected)+1)%PARTS.length]);
 const matrix=$("review-matrix");matrix.replaceChildren();
 const corner=document.createElement("span");corner.textContent="PART";matrix.append(corner);
 for(const d of DIR){const head=document.createElement("b");head.textContent=d.toUpperCase();matrix.append(head)}
 for(let i=0;i<PARTS.length;i++){
  const part=PARTS[i],short=document.createElement("span");
  short.textContent=String(i+1).padStart(2,"0");short.title=labels[part];matrix.append(short);
  for(const d of DIR){
   const b=document.createElement("button");
   b.type="button";b.dataset.reviewDir=d;b.dataset.reviewPart=part;
   b.title=labels[part]+" / "+d.toUpperCase()+" (click to pick this part + view, not to approve)";
   // stays in the current step: in 01 PIXEL EDITOR it just picks part + view
   b.onclick=()=>{selectPart(part);switchAngle(d);if(step!=="rig"&&step!=="pixel")switchStep("rig")};
   matrix.append(b);
  }
 }
 for(const part of PARTS){
  const b=document.createElement("button");
  b.type="button";b.dataset.part=part;b.innerHTML=(C.PARENTS[part]?"↳ ":"◆ ")+
   "<strong>"+labels[part]+"</strong> <span class='parent'>"+(C.PARENTS[part]||"ROOT")+"</span>";
  b.onclick=()=>selectPart(part);el.append(b);
 }
 const anatomy=$("anatomy");anatomy.replaceChildren();
 for(const part of PARTS){
  const line=document.createElement("div");
  line.textContent=(C.PARENTS[part]?" ↳ ":" ◆ ")+labels[part]+" ← "+(C.PARENTS[part]||"ROOT");
  anatomy.append(line);
 }
}
function selectPart(part){
 if(!PARTS.includes(part))return;
 selected=part;syncControls();void renderAll();void autoLayer(true);refreshRigMotionNow();
}
// V6B keeps each part's skin in the layer it was painted on (nude base: head
// in BODY, chest/arms in TOP, hips/legs in PANTS, feet in SHOES ...). Show the
// pixel count of the selected part per layer and, when the part changes,
// jump to the layer holding most of it so the editor never opens empty
// (any other layer can still be chosen afterwards to add pixels there).
const alphaCache=new Map();
async function alphaOf(url){
 if(!url)return null;let a=alphaCache.get(url);if(a)return a;
 const d=(await canvasFromData(url)).getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112).data;
 a=new Uint8Array(C.N);for(let k=0;k<C.N;k++)a[k]=d[k*4+3]?1:0;
 if(alphaCache.size>300)alphaCache.clear();alphaCache.set(url,a);return a;
}
async function partLayerCounts(part){
 const m=master(),idx=PARTS.indexOf(part),out={};if(!m)return out;
 const masks=DIR.map(d=>C.decode(m.masks[d]));
 for(const L of Object.keys(m.layers||{})){
  let n=0;
  for(let i=0;i<DIR.length;i++){const a=await alphaOf(m.layers[L]?.[DIR[i]]);if(!a)continue;for(let k=0;k<C.N;k++)if(a[k]&&masks[i][k]===idx)n++}
  out[L]=n;
 }
 return out;
}
let autoLayerTicket=0;
async function autoLayer(switchIfEmpty){
 const ticket=++autoLayerTicket,part=selected,g=gender;
 try{
  const counts=await partLayerCounts(part);
  if(ticket!==autoLayerTicket||part!==selected||g!==gender)return;
  for(const o of $("art-layer").options){
   o.dataset.label=o.dataset.label||o.textContent;
   o.textContent=o.dataset.label+(counts[o.value]?" · "+counts[o.value]+" px":" · empty");
  }
  if(switchIfEmpty){
   const best=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
   if(best&&best!==activeLayer&&counts[best]>(counts[activeLayer]||0)&&[...$("art-layer").options].some(o=>o.value===best)){
    activeLayer=best;$("art-layer").value=best;
    status(labels[part]+" pixels are on layer "+$("art-layer").selectedOptions[0].dataset.label+" · switched there (pick another layer to edit/add pixels on it).");
   }
  }
 }catch(e){if(ticket===autoLayerTicket)status("Layer check: "+e.message,true)}
}
function syncControls(){
 updateUnassignedUI();
 $("gender").value=gender;$("art-layer").value=activeLayer;
 $("part-select").value=selected;
 const done=reviewCount();
 $("part-progress").textContent="RIG REVIEW: "+done+" / "+TOTAL_REVIEWS+" · per angle: "+DIR.map(d=>d.toUpperCase()+" "+
  PARTS.filter(p=>record()?.reviewed?.[reviewKey(d,p)]).length+"/"+PARTS.length).join(" · ");
 renderRigSettings();syncMotionControls();
 if($("outfit-preview"))$("outfit-preview").value=outfitId;
 $("rig-review-message").textContent=(record()?.reviewed?.[reviewKey(dir,selected)]?"✓ REVIEWED":"NOT REVIEWED")+
  " · "+labels[selected]+" / "+dir.toUpperCase()+" · inspect and mark only when slice AND pivot are correct.";
 $("mark-reviewed").textContent=record()?.reviewed?.[reviewKey(dir,selected)]?"✓ REVIEWED · MARK AGAIN":"✓ MARK PART / ANGLE REVIEWED";
 for(const cell of document.querySelectorAll("#review-matrix button")){
  const marked=!!record()?.reviewed?.[reviewKey(cell.dataset.reviewDir,cell.dataset.reviewPart)];
  cell.textContent=marked?"✓":"·";cell.setAttribute("aria-pressed",String(marked));
  cell.classList.toggle("current",cell.dataset.reviewDir===dir&&cell.dataset.reviewPart===selected);
 }
 $("mark-angle-tested").textContent=record()?.testedAngles?.[dir]?"✓ "+dir.toUpperCase()+" TESTED":"✓ MARK "+dir.toUpperCase()+" TESTED";
 $("test-review-message").textContent="TESTED DIRECTIONS: "+DIR.filter(d=>record()?.testedAngles?.[d]).map(d=>d.toUpperCase()).join(", ")+
  " ("+DIR.filter(d=>record()?.testedAngles?.[d]).length+"/4) · check neutral and animated poses in every direction";
 $("test-play").textContent=playing?"Ⅱ PAUSE PREVIEW":"▶ PLAY PREVIEW";
 $("pivot-x").value=master()?.pivots?.[dir]?.[selected]?.x??32;
 $("pivot-y").value=master()?.pivots?.[dir]?.[selected]?.y??50;
 $("selection-details").textContent=labels[selected]+" · "+dir.toUpperCase();
 $("side-title").textContent="SELECTED PART";
 $("viewdetail").textContent=gender.toUpperCase()+" · "+dir.toUpperCase()+
  " · "+labels[selected]+" · 64×112 px · "+(record()?.bound?"BOUND":"NOT BOUND");
 for(const b of document.querySelectorAll("#views button"))b.setAttribute("aria-pressed",String(b.dataset.dir===dir));
 for(const b of document.querySelectorAll("#bodyparts button"))b.setAttribute("aria-pressed",String(b.dataset.part===selected));
 for(const b of document.querySelectorAll("#progress button"))b.setAttribute("aria-selected",String(b.dataset.step===step));
 for(const section of document.querySelectorAll("[data-panel]"))section.classList.toggle("active",section.dataset.panel===step);
 $("rig-pivot").setAttribute("aria-pressed",String(tool==="pivot"));
 $("rig-paint").setAttribute("aria-pressed",String(tool==="paint"));
 $("rig-erase").setAttribute("aria-pressed",String(tool==="erase"));
 $("rig-pan").setAttribute("aria-pressed",String(tool==="pan"));
 $("rig-isolate").setAttribute("aria-pressed",String(isolated));
 $("export-python").disabled=!record()?.bound;
 $("export-json").disabled=!record()?.bound;
 $("bind-next").disabled=!record()?.bound;
 $("cloud-master").disabled=!record()?.approved;
 $("download-master").disabled=!record()?.approved;
 $("download-binding").disabled=!record()?.bound;
 const title={pixel:"01 · PIXEL EDITOR · "+labels[selected],rig:"02 · PIVOT + SLICING · "+labels[selected],
  bind:"03 · LGR-1 RIG DATA BINDING",test:"04 · CHECK BINDING · SHARED MOTIONS",
  motion:"05 · MOTION EDITOR · "+(editMotion?.name||"no motion")+(record()?.bound?"":" · preview on unbound draft"),save:"06 · LGR-1 MASTER"};
 $("preview-title").textContent=title[step];
 const b=record()?.bound;
 $("binding-result").textContent=b?
  ("BOUND · "+b.id+" · "+PARTS.length+" parts · 4 views · "+
   (record().approved?"APPROVED":"TEST REQUIRED")):"NOT BOUND · Edit pixels, pivots, masks, then bind.";
 $("master-details").textContent=record()?.saved?
  ("LGR-1 MASTER SAVED: "+MASTER_IDS[gender]+" · ready for the Character Editor and shared motion library"):
  ("MASTER NOT YET SAVED · "+(record()?.approved?"binding approved":"binding test pending"));
}
function switchAngle(d){
 if(!DIR.includes(d))return;
 dir=d;
 if(selectedUnassigned()?.dir!==d){
  activeUnassigned=unassignedClusters.findIndex(c=>c.dir===d);
 }
 syncControls();void renderAll();
}
function switchStep(next){
 if(!STEPS.includes(next))return;
 if(BASE_MODE&&next!=="pixel"&&next!=="rig")next="rig";
 if(next!=="rig")stopRigMotion();
 if(next!=="test")stopPlayback();
 if((next==="test"||next==="save")&&!record()?.bound){status("Bind all 4 views before checking",true);next="bind"}
 if(next==="motion"&&!editMotion){const first=allMotions()[0];if(first)startEdit(first)}
 if(next==="save"&&!record()?.approved){status("Approve the binding in CHECK BINDING before saving master",true);next="test"}
 step=next;syncControls();void renderAll();
}
function setZoom(z){
 zoom=clamp(Number(z)||5,2,14);$("zoom").value=zoom;$("zoom-label").textContent=zoom*100+"%";
 canvas.style.width=(64*zoom)+"px";canvas.style.height=(112*zoom)+"px";
}
function coords(e){
 const r=canvas.getBoundingClientRect();
 return {x:clamp(Math.floor((e.clientX-r.left)/r.width*64),0,63),
  y:clamp(Math.floor((e.clientY-r.top)/r.height*112),0,111)};
}
function snapshot(){
 maskUndo.push({dir,pivots:clone(master().pivots[dir]),mask:master().masks[dir]});
 if(maskUndo.length>32)maskUndo.shift();maskRedo=[];
}
function applySnapshot(which,opposite){
 if(!which.length)return;
 opposite.push({dir,pivots:clone(master().pivots[dir]),mask:master().masks[dir]});
 const s=which.pop();master().pivots[s.dir]=s.pivots;master().masks[s.dir]=s.mask;
 dir=s.dir;invalidateReviews(s.dir);syncControls();
}
// Manual slice paint: pixels the artist painted by hand are remembered per
// angle (draft.manual) so RE-SLICE FROM SHAPE can keep them.
function manualLock(d,create){
 const r=record();if(!r)return null;
 if(!r.manual)r.manual={};
 if(!r.manual[d]){if(!create)return null;r.manual[d]=C.encode(new Uint8Array(C.N).fill(0))}
 return C.decode(r.manual[d]);
}
function manualCount(d){const l=manualLock(d,false);let n=0;if(l)for(let k=0;k<C.N;k++)if(l[k])n++;return n}
function maskPaint(p,erase,from){
 const m=master(),mask=C.decode(m.masks[dir]),idx=PARTS.indexOf(selected),size=Number($("mask-brush").value)||3;
 const half=Math.floor(size/2),onlyVisible=$("mask-visible-only")?.checked!==false;
 const alpha=onlyVisible?source[gender]?.[dir]?.getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112).data:null;
 const lock=manualLock(dir,true);
 // stroke from the previous pointer position so a fast drag leaves no holes
 const pts=[];const a=from||p,steps=Math.max(Math.abs(p.x-a.x),Math.abs(p.y-a.y),1);
 for(let i=from?1:0;i<=steps;i++)pts.push({x:Math.round(a.x+(p.x-a.x)*i/steps),y:Math.round(a.y+(p.y-a.y)*i/steps)});
 for(const q of pts)
 for(let y=Math.max(0,q.y-half);y<=Math.min(111,q.y+half);y++)
  for(let x=Math.max(0,q.x-half);x<=Math.min(63,q.x+half);x++)
   {
    const k=y*64+x;
    if(alpha&&!alpha[k*4+3])continue; // empty canvas stays no part
    const previous=mask[k];
    if(paintDrag?.dirtyParts&&previous!==255)paintDrag.dirtyParts.add(PARTS[previous]);
    mask[k]=erase?255:idx;lock[k]=1;
   }
 m.masks[dir]=C.encode(mask);record().manual[dir]=C.encode(lock);
 scheduleRigPreview();
}
function setPivot(x,y,commit=true){
 const p=master().pivots[dir][selected];
 const nx=clamp(Math.round(x),0,63),ny=clamp(Math.round(y),0,111);
 if(p.x===nx&&p.y===ny)return;
 p.x=nx;p.y=ny;
 if(commit)invalidateReviews(dir,[selected]);
 else scheduleRigPreview(); // Drag preview only; no multi-MB localStorage writes per pointermove.
 syncControls();refreshRigMotionNow();
}
function bindMaskCopy(flipped){
 if(!maskCopied){status("Copy a mask first",true);return}
 snapshot();
 const src=C.decode(maskCopied),dst=new Uint8Array(C.N);
 for(let y=0;y<112;y++)for(let x=0;x<64;x++){
  let v=src[y*64+(flipped?63-x:x)];
  if(flipped&&v!==255){
   let p=PARTS[v];
   if(p.includes("_near_"))p=p.replace("_near_","_far_");
   else if(p.includes("_far_"))p=p.replace("_far_","_near_");
   v=PARTS.indexOf(p);
  }
  dst[y*64+x]=v;
 }
 master().masks[dir]=C.encode(dst);invalidateReviews(dir);syncControls();
}
function pasteCopiedPart(){
 if(!partCopied)return status("COPY PART from a chosen source angle first",true);
 if(partCopied.part!==selected&&!confirm(
  "Copied "+labels[partCopied.part]+". Paste its mask as "+labels[selected]+" instead?"))return;
 const sourceMask=C.decode(partCopied.mask),target=C.decode(master().masks[dir]);
 const sourceIndex=PARTS.indexOf(partCopied.part),targetIndex=PARTS.indexOf(selected);
 let overwrite=0;
 for(let k=0;k<sourceMask.length;k++)if(sourceMask[k]===sourceIndex&&
    target[k]!==255&&target[k]!==targetIndex)overwrite++;
 if(overwrite&&!confirm(overwrite+" pixels are already assigned to OTHER body parts in "+dir.toUpperCase()+
   ". Reassign them to "+labels[selected]+"?"))return;
 snapshot();
 const touched=new Set([selected]);
 for(let k=0;k<target.length;k++)if(target[k]===targetIndex)target[k]=255;
 for(let k=0;k<sourceMask.length;k++)if(sourceMask[k]===sourceIndex){
  if(target[k]!==255)touched.add(PARTS[target[k]]);
  target[k]=targetIndex;
 }
 master().masks[dir]=C.encode(target);
 invalidateReviews(dir,[...touched]);syncControls();
 status("Pasted only "+labels[selected]+" slice to "+dir.toUpperCase()+
  " · "+touched.size+" affected part reviews reset.");
}
function channel(v){return cv().getContext("2d",{willReadFrequently:true})}
async function openPixels(){
 if(step!=="pixel")return switchStep("pixel");
 if(!P)throw Error("Original pixel editor engine missing");
 const layer=activeLayer;
 const atlas=document.createElement("canvas");atlas.width=64;atlas.height=448;
 const a=atlas.getContext("2d",{willReadFrequently:true}),refs={};
 const idx=PARTS.indexOf(selected),originals={};
 for(let i=0;i<4;i++){
  const d=DIR[i],src=await canvasFromData(await skinnedUrl(master().layers[layer]?.[d]));
  originals[d]=(await canvasFromData(master().layers[layer]?.[d])).getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112); // un-skinned
  const raw=src.getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112);
  const mask=C.decode(master().masks[d]);
  for(let k=0;k<C.N;k++)if(mask[k]!==idx)raw.data.fill(0,k*4,k*4+4);
  a.putImageData(raw,0,i*112);refs[d]=source[gender][d];
 }
 if(!pixelEditor){
  pixelEditor=P.create({overlay:$("pixelOverlay"),canvas:$("pixelCanvas"),
   onApply:applyPixels,onSaveDefault:applyPixels,onRestore:()=>{},guide:pixelGuide});
 }
 // union of every OTHER layer per view: a pixel erased here that no other
 // layer covers becomes unassigned on APPLY (auto-slice)
 const others={};
 for(const d of DIR){const u=new Uint8Array(C.N);for(const L of Object.keys(master().layers||{})){if(L===layer)continue;const a=await alphaOf(master().layers[L]?.[d]);if(a)for(let k=0;k<C.N;k++)if(a[k])u[k]=1}others[d]=u}
 pixelSession={gender,selected,layer,originals,others,skin:skinId(),ramp:skinRamp()};
 pixelEditor.open({id:"LAFRICH GENESIS "+gender.toUpperCase()+" / "+selected+" / "+layer,
  initialAtlas:atlas,originalAtlas:atlas,referenceImages:refs,direction:dir});
 status("Pixel editing "+labels[selected]+" / "+layer+" · SE/SW/NE/NW with original selection tools.");
}
function applyPixels(){
 if(!pixelSession||pixelSession.gender!==gender||
    pixelSession.selected!==selected||pixelSession.layer!==activeLayer){
  status("Pixel editing context changed; source not modified",true);return false;
 }
 try{
  const atlas=pixelEditor.getAtlas(),g=atlas.getContext("2d",{willReadFrequently:true});
  const next={},idx=PARTS.indexOf(selected),layer=activeLayer,touched={};
  let expandCount=0,stealCount=0,added=0,cleared=0,keptLocked=0;
  const auto=$("pixel-auto-slice")?.checked!==false;
  // Draw into the selected layer only. Every other physical appearance layer
  // stays pixel-exact, allowing independent future skin/clothing edits.
  for(let di=0;di<4;di++){
   const d=DIR[di];
   const oldCtx=cv().getContext("2d",{willReadFrequently:true});
   // Restore full physical layer snapshot, not only the selected slice.
   const original=pixelSession.originals[d];
   oldCtx.putImageData(original,0,0);
   const old=oldCtx.getImageData(0,0,64,112),edited=g.getImageData(0,di*112,64,112);
   const mask=C.decode(master().masks[d]),pixels=old.data,part=edited.data,before=original.data;
   // the editor showed the preview skin tone: store base-ramp colours again
   if(SK&&pixelSession.skin!=="light")SK.swap(part,pixelSession.ramp,SK.TONES.light);
   const hit=new Set(),lock=manualLock(d,false),other=pixelSession.others?.[d];
   for(let k=0;k<C.N;k++){
    const p=k*4,wasPart=mask[k]===idx;
    if(wasPart) pixels.fill(0,p,p+4);
    if(part[p+3]){
     if(!wasPart){
      if(auto){
       // AUTO-SLICE: new / moved / pasted pixels join the edited part, except
       // where another part's slice was hand-painted (that stays theirs).
       if(lock&&lock[k]&&mask[k]!==255)keptLocked++;
       else{if(mask[k]!==255)hit.add(PARTS[mask[k]]);mask[k]=idx;added++}
      }else{expandCount++;if(pixels[p+3])stealCount++;if(mask[k]!==255)hit.add(PARTS[mask[k]]);mask[k]=idx}
     }
     pixels.set(part.subarray(p,p+4),p);
    }else if(wasPart&&auto&&before[p+3]&&!(other&&other[k])){mask[k]=255;cleared++} // erased → no part
   }
   let changed=false;
   for(let i=0;i<before.length;i++)if(before[i]!==pixels[i]){changed=true;break}
   if(changed||hit.size)touched[d]=[selected,...hit];
   oldCtx.putImageData(old,0,0);
   next[d]={mask:C.encode(mask),png:oldCtx.canvas.toDataURL("image/png")};
  }
  if(!auto&&expandCount&&!confirm("Your pixel edit expands this part's slice ownership by "+expandCount+
    " pixels across 4 angles. "+stealCount+" pixels are already painted in this physical layer."+
    " Confirm changing the rig masks as well? Cancel keeps the original rig unchanged."))return false;
  for(const d of DIR){
   master().layers[layer][d]=next[d].png;
   master().masks[d]=next[d].mask;
  }
  R.clearCache();
  pixelSession=null;
  const appliedGender=gender,appliedPart=selected;
  // Invalidate approved/bound data IMMEDIATELY. Binding waits for the
  // full composite to rebuild so it never exports stale source sprites.
  sourcePending=sourceCanvases(appliedGender);
  // Only the edited part (and parts that lost pixels to it) in the edited
  // directions lose their review; everything else keeps its receipt.
  const touchedDirs=Object.keys(touched);
  for(const d of touchedDirs)invalidateReviews(d,touched[d]);
  if(!touchedDirs.length)makeDirty();
  syncControls();
  void sourcePending.then(()=>{
   flushCache();syncControls();
   const slice=[added?"+"+added+" px → "+labels[appliedPart]:"",cleared?"−"+cleared+" px unassigned":"",keptLocked?keptLocked+" hand-sliced px kept":""].filter(Boolean).join(" · ");
   status((auto&&slice?slice+" · ":"")+
    "APPLIED "+labels[appliedPart]+" / "+layer+" · changed: "+(touchedDirs.map(d=>d.toUpperCase()).join(", ")||"nothing")+
    " · only those part reviews reset ("+reviewCount()+"/"+TOTAL_REVIEWS+" kept).");
   void autoLayer(false);
  }).catch(e=>status("Composite rebuild failed: "+e.message,true));
  return true;
 }catch(e){status("Pixel editor Apply failed: "+e.message,true);return false}
}
async function audit(){
 await sourcePending;
 const m=C.validateMaster(master()),errors=[],counts={},globalCoverage=Array(PARTS.length).fill(0);
 for(const d of DIR){
  const mask=C.decode(m.masks[d]),raw=source[gender][d].getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112);
  let unassigned=0,visible=0;const per=Array(PARTS.length).fill(0);
  for(let k=0;k<C.N;k++){
   if(!raw.data[k*4+3])continue;
   visible++;
   if(mask[k]===255)unassigned++;else per[mask[k]]++;
  }
  counts[d]={visible,unassigned,per,occluded:PARTS.filter((_,i)=>per[i]===0)};
  if(unassigned)errors.push(d.toUpperCase()+": "+unassigned+" visible pixels unassigned");
  for(let i=0;i<PARTS.length;i++)globalCoverage[i]+=per[i];
 }
 // A back-side limb may be FULLY hidden by the torso in one perspective.
 // Never invent filler pixels to make an occluded part visible. Each bone
 // still receives a unique independently editable pivot in every view.
 for(let i=0;i<PARTS.length;i++)if(!globalCoverage[i])
  errors.push(PARTS[i]+": no visible pixels in ANY of the four angles");
 return {m,errors,counts};
}
async function makeBinding(){
 try{
  const missing=missingReviews();
  if(missing.length){
   status("Rig incomplete: "+missing.length+" part/angle combinations not reviewed. Start with "+missing[0],true);
   $("binding-result").textContent="MANUAL QA INCOMPLETE · "+missing.length+"/"+TOTAL_REVIEWS+" missing: "+missing.slice(0,7).join(" · ")+
    (missing.length>7?" ...":"");
   return;
  }
  const report=await audit();
  if(report.errors.length){
   if(DIR.some(d=>report.counts[d]?.unassigned)){
    unassignedClusters=scanUnassignedClusters();activeUnassigned=-1;
    updateUnassignedUI();
   }
   status("Cannot bind: "+report.errors.slice(0,3).join("; ")+(report.errors.length>3?"…":"")+
    (unassignedClusters.length?" · Use FIND VISIBLE UNASSIGNED PIXELS to locate/erase stray artwork.":""),true);
   $("binding-result").textContent=report.errors.join(" · ");
   return;
  }
  const m=report.m;
  const out={
   format:BIND_FORMAT,rigFormat:RIG_FORMAT,rigType:"2d-skeletal-cutout-pixel-rig",id:MASTER_IDS[gender],gender,sourceId:SOURCE[gender],
   originalNative:"V6B",faceSource:"emosi.exe",
   frame:{width:64,height:112,pivot:[32,100],directions:[...DIR]},
   hierarchy:{parts:[...PARTS],parents:clone(C.PARENTS),drawOrder:[...C.DRAW_ORDER]},
   views:Object.fromEntries(DIR.map(d=>[d,{
    pivots:clone(m.pivots[d]),maskBase64:m.masks[d],
    spritePng:source[gender][d].toDataURL("image/png"),coverage:report.counts[d].visible,
    occluded:report.counts[d].occluded,
    drawOrder:baseOrder(d,m),nearSide:M.sidesOf(m)[d]
   }])),
   motionLibrary:"media/lgr1/motions.json",
   rig:clone(m),pythonEngine:"genesis_procedural_runtime.py",
   createdAt:new Date().toISOString()
  };
  out.reviewed=clone(record().reviewed);
  record().bound=out;record().testedAngles={};record().approved=false;record().saved=false;
  persistDraft();syncControls();status("Pivots + slice maps bound for ALL FOUR views. Open CHECK BINDING.");
 }catch(e){status("Binding failed: "+e.message,true)}
}
function validatedBinding(){
 const b=record()?.bound;
 if(!b||b.format!==BIND_FORMAT||b.gender!==gender||b.id!==MASTER_IDS[gender]||
    (b.rigFormat!==undefined&&b.rigFormat!==RIG_FORMAT)||b.sourceId!==SOURCE[gender])
  throw Error("LGR-1 binding missing / invalid");
 C.validateMaster(b.rig);
 for(const d of DIR)for(const part of PARTS)
  if(b.reviewed?.[reviewKey(d,part)]!==true)
   throw Error("Binding must include "+TOTAL_REVIEWS+" verified part/angle reviews: missing "+d+" / "+part);
 for(const d of DIR)if(!b.views?.[d]||!b.views[d].spritePng)throw Error("Missing "+d+" binding");
 return b;
}
function toMaster(){
 const b=validatedBinding();
 return {format:MASTER_FORMAT,rigFormat:RIG_FORMAT,rigType:"2d-skeletal-cutout-pixel-rig",id:b.id,gender,sourceId:SOURCE[gender],
  faceSource:"emosi.exe",approvedAt:new Date().toISOString(),
  animationContract:"lafrich-genesis-binding-v1",binding:clone(b)};
}
function toPython(b){
 // Python accepts declarative JSON string: geometry and RGBA PNG data. Never
 // execute imported browser code. Procedural animation is applied to pivots.
 const value=JSON.stringify(b).replace(/'''/g,"");
 return "# LGR-1 / LAFRICH GENESIS RIG · four-angle / "+PARTS.length+"-piece (pelvis root) / no baked face\n"+
  "# Machine-readable Python source. Motion is computed from time + transforms,\n"+
  "# NOT stored as rendered frame-by-frame sprites. Use genesis_procedural_runtime.py.\n"+
  "import json\nLAFRICH_GENESIS = json.loads(r'''"+value+"''')\n";
}
function exportPython(){try{
 const b=validatedBinding();download(b.id+"_binding.py",toPython(b),"text/x-python");
 status("Exported declarative Python rig + 4-angle pixel binding.");
 }catch(e){status(e.message,true)}
}
function exportJson(){try{
 const b=validatedBinding();download(b.id+"_binding.json",JSON.stringify(b,null,2));
 }catch(e){status(e.message,true)}
}
async function restoreDraftRecord(data,label){
 if(!data||typeof data!=="object")throw Error("Empty LGR-1 draft");
 const target=data.rig?.gender;
 if(!SOURCE[target])throw Error("Draft does not contain a valid Male/Female body");
 const rig=C.validateMaster(data.rig);
 if(target!==gender&&!confirm("This draft is "+target.toUpperCase()+
   ". Switch from "+gender.toUpperCase()+" to restore it?"))return false;
 const validBound=data.bound?.format===BIND_FORMAT&&!isLegacyBound(data.bound)&&
  data.bound.id===MASTER_IDS[target]&&data.bound.gender===target&&
  data.bound.sourceId===SOURCE[target]&&
  JSON.stringify(C.validateMaster(data.bound.rig))===JSON.stringify(rig);
 const reviewed={};
 for(const d of DIR)for(const part of PARTS){
  const key=reviewKey(d,part);
  if(data.reviewed?.[key]===true)reviewed[key]=true;
 }
 const testedAngles=validBound?Object.fromEntries(DIR.filter(d=>data.testedAngles?.[d]===true).map(d=>[d,true])):{};
 const approved=!!validBound&&!!data.approved&&DIR.every(d=>testedAngles[d]);
 stopPlayback();gender=target;dir="se";selected="head";maskUndo=[];maskRedo=[];
 faceId="";faceImage=null;motionMs=0;
 drafts[target]={rig,bound:validBound?clone(data.bound):null,reviewed,testedAngles,
  approved,saved:false,edited:String(data.edited||new Date().toISOString())};
 await sourceCanvases(target);
 R.clearCache();preparedCache.clear();rev++;renderRequest++;
 step=approved?"save":validBound?"test":"rig";
 const okay=persistDraft();syncControls();void renderAll();
 status(label+" · "+target.toUpperCase()+" restored · "+
  reviewCount()+"/"+TOTAL_REVIEWS+" rig checks · "+(okay?"local copy saved":"LOCAL STORAGE FULL: save another backup"),!okay);
 return true;
}
async function importDraftFile(file){
 try{
  if(!file||file.size>12000000)throw Error("Draft JSON missing or exceeds 12 MB");
  const json=JSON.parse(await file.text());
  const data=json.format==="lgr-1-draft-v1"?json.record:
   json.format==="lafrich-genesis-draft-store-v1"?json.drafts?.[gender]:json;
  if(!data?.rig)throw Error("Unsupported LGR-1 draft JSON");
  if(!confirm("Import "+(data.rig?.gender||"unknown")+" draft? This replaces the current editable draft, not the cloud master."))return;
  await restoreDraftRecord(data,"IMPORTED JSON");
 }catch(e){status("IMPORT FAILED: "+e.message,true)}
}
async function refreshDraftRevisions(){
 const cloud=root.VLGenesisCloud;
 if(!cloud?.connected())throw Error("Connect Google Drive first");
 const versions=await cloud.listDrafts(MASTER_IDS[gender]);
 const list=$("draft-revisions");list.replaceChildren();
 if(!versions.length)list.add(new Option("No versions saved yet",""));
 for(const v of versions){
  const readable=v.createdTime?new Date(v.createdTime).toLocaleString():v.name;
  list.add(new Option(readable+" · "+v.name.slice(-19),v.id));
 }
 return versions;
}
async function cloudSaveDraft(){
 try{
  const cloud=root.VLGenesisCloud;
  if(!cloud?.connected())throw Error("CONNECT DRIVE first");
  const v=await cloud.saveDraft(MASTER_IDS[gender],clone(record()));
  await refreshDraftRevisions();
  $("draft-revisions").value=v.fileId;
  status("CLOUD DRAFT VERIFIED · immutable version "+v.name);
 }catch(e){status("CLOUD DRAFT: "+e.message,true)}
}
async function cloudLoadDraft(){
 try{
  const cloud=root.VLGenesisCloud;
  if(!cloud?.connected())throw Error("CONNECT DRIVE first");
  const fileId=$("draft-revisions").value;
  if(!fileId)throw Error("Select or refresh a saved cloud draft revision");
  const data=await cloud.loadDraft(MASTER_IDS[gender],fileId);
  if(!confirm("Restore cloud revision "+data.name+
    "? Current unexported edits will be replaced. A cloud revision is never deleted."))return;
  await restoreDraftRecord(data.record,"CLOUD DRAFT "+data.name);
 }catch(e){status("RESTORE CLOUD DRAFT: "+e.message,true)}
}
function saveApproved(){
 if(!record().approved){status("CHECK BINDING must be approved first",true);return false}
 try{
  const v=toMaster();
  const all=JSON.parse(localStorage.getItem(MASTER_KEY)||"{}");
  all[gender]=v;
  localStorage.setItem(MASTER_KEY,JSON.stringify(all));
  record().saved=true;persistDraft();syncControls();
  root.dispatchEvent(new CustomEvent("lafrich:genesis-master-saved",{detail:{gender,id:v.id}}));
  status("APPROVED MASTER SAVED · "+v.id+" · local database ready for Character Editor.");
  return true;
 }catch(e){status("Master local save failed: "+e.message+". Cloud save may still be verified.",true);return false}
}
async function cloudSave(){
 try{
  if(!record().approved)throw Error("Approve binding before cloud save");
  const d=root.VLGenesisCloud;if(!d?.connected())throw Error("CONNECT DRIVE first");
  const v=toMaster();
  await d.save(v.id,v);
  const localOkay=saveApproved();
  $("statuscloud").textContent="DRIVE VERIFIED";
  status("Drive read-back verified · "+v.id+" · canonical LGR-1 master"+
   (localOkay?"":" · browser local save failed, Drive copy is safe"),!localOkay);
 }catch(e){status("Cloud save: "+e.message,true)}
}
async function cloudLoad(){
 try{
  const d=root.VLGenesisCloud;if(!d?.connected())throw Error("CONNECT DRIVE first");
  const data=await d.load(MASTER_IDS[gender]);
  if(!data)throw Error("No approved LGR-1 master for "+gender+" on Drive");
  if(data.format!==MASTER_FORMAT||data.gender!==gender||data.id!==MASTER_IDS[gender]||
    data.binding?.format!==BIND_FORMAT)throw Error("Invalid LGR-1 cloud master");
  if(!confirm("Replace current "+gender+" draft with this verified Drive master? Export current draft first. Unsaved edits will be lost."))return;
  await d.acknowledgeLoadedMaster(data.id,data);
  const legacy=isLegacyBound(data.binding);
  drafts[gender]={rig:C.validateMaster(data.binding.rig),bound:legacy?null:data.binding,
   reviewed:data.binding.reviewed||{},testedAngles:legacy?{}:Object.fromEntries(DIR.map(d=>[d,true])),
   approved:!legacy,saved:!legacy,edited:data.approvedAt||""};
  await sourceCanvases(gender);persistDraft();flushCache();syncControls();renderAll();
  status(legacy?"Old 10-part Drive master opened · PELVIS derived from the lower torso (in this browser only, Drive file unchanged). "+
   "Review PELVIS in 4 angles (AUTO-CHECK), rebind, approve, then SAVE to Drive when you are ready.":
   "Verified LGR-1 master loaded from Drive: "+data.id);
 }catch(e){status("Cloud load: "+e.message,true)}
}
async function refreshFace(){
 try{
  const b=root.VLMahlukEmosiBridge;if(!b)throw Error("Emosi bridge unavailable");
  const state=await b.refresh();
  const actor={gender,template_category:"human",id:SOURCE[gender],expressions:[]};
  b.apply(actor);faceEntries=actor.expressions.filter(x=>x.source==="emosi"&&x.overlay);
  const sel=$("face");sel.replaceChildren(new Option("BLANK / NONE",""));
  for(const f of faceEntries)sel.add(new Option(f.label||f.id,f.id));
  if(faceEntries.some(f=>f.id===faceId))sel.value=faceId;else{faceId="";faceImage=null}
  status("Emosi.exe: "+faceEntries.length+" compatible authored faces available; body art unchanged.");
  void renderAll();
 }catch(e){status("Emosi refresh: "+e.message,true)}
}
/* ---------------- LGR-1 outfits (Custom Wear preview) ---------------- */
const OUTFITS=Object.freeze({
 tee_trousers:{label:"Tee + Trousers + Sneakers · short hair",top:"tee",pants:"trousers",shoes:"sneakers",hair:"short",topColor:"red",pantsColor:"denim",shoesColor:"white",hairColor:"brown"},
 shirt_tie_baggy:{label:"Shirt & tie + Baggy + Shoes · long curtain hair",top:"shirt_tie",pants:"baggy",shoes:"shoes",hair:"long_curtain",topColor:"white",pantsColor:"khaki",shoesColor:"black",hairColor:"black"},
 cardigan_ripped:{label:"Cardigan + Ripped trousers + Sneakers · wavy hair",top:"cardigan",pants:"trousers_ripped",shoes:"sneakers",hair:"wavy",topColor:"mustard",pantsColor:"night",shoesColor:"red",hairColor:"chestnut"}
});
let tweakRev=0;
function loadOutfitTweaks(){
 try{const s=JSON.parse(localStorage.getItem(OUTFIT_TWEAK_KEY)||"null");
  if(s?.format==="lgr1-outfit-tweaks-v1"&&s.tweaks&&typeof s.tweaks==="object")outfitTweaks=s.tweaks}catch{}
}
function persistOutfitTweaks(){
 try{localStorage.setItem(OUTFIT_TWEAK_KEY,JSON.stringify({format:"lgr1-outfit-tweaks-v1",tweaks:outfitTweaks}));return true}
 catch(e){status("Outfit tweak save failed: "+e.message,true);return false}
}
function withTweaks(ch){
 const t=outfitTweaks?.[gender]?.[ch.id];
 return t&&Object.keys(t).length?{...ch,maskTweaks:t}:ch;
}
function outfitFor(st){
 if(!outfitChar||outfitChar.gender!==gender)return null;
 if(st==="pixel"||st==="bind")return null;
 if(st==="rig"&&!$("outfit-in-rig")?.checked)return null;
 return withTweaks(outfitChar);
}
async function buildOutfit(id){
 const key=gender+"|"+id;
 if(outfitCache[key])return outfitCache[key];
 const o=OUTFITS[id],V=root.V6PCompositor,base=root.VLGenesisSource?.bases?.[SOURCE[gender]];
 if(!o||!V||!base)throw Error("Outfit preview needs the V6B compositor");
 const f=gender==="female"?"_f":"";
 const ch=V.norm({...base.appearance,...o,body:gender,gender,face:"blank"});
 const files={hair_back:"hair/"+o.hair+"_back",top_back:"top/"+o.top+"_back"+f,top:"top/"+o.top+f,
  pants:"pants/"+o.pants+f,shoes:"shoes/"+o.shoes+f,hair_front:"hair/"+o.hair+"_front"};
 const wear={};
 for(const [layer,src] of Object.entries(files)){
  const atlas=await V.img(src);if(!atlas)continue;
  wear[layer]={};
  for(const d of DIR){
   const frame=V.extractFrame(atlas,"idle",d,0);
   const im=frame.getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112);
   const c=cv();c.getContext("2d").putImageData(V.keysToDisplay(im,ch),0,0);
   wear[layer][d]=c.toDataURL("image/png");
  }
 }
 outfitCache[key]=C.validateCharacter({format:C.CHARACTER,id,name:o.label.slice(0,90),gender,wear,faceId:""});
 return outfitCache[key];
}
async function chooseOutfit(id){
 outfitId=OUTFITS[id]?id:"";
 outfitChar=outfitId?await buildOutfit(outfitId):null;
 tweakRev++;flushCache();
 if(unassignedClusters.length)await findUnassignedPixels();
 status(outfitId?"OUTFIT PREVIEW · "+OUTFITS[outfitId].label+" · inherits the body mask; pixels outside the body follow the nearest part.":"Outfit preview off.");
}
async function outfitAlpha(d){
 const ch=outfitFor("test");if(!ch)return null;
 const a=new Uint8Array(C.N);let any=false;
 for(const layer of C.WEAR){
  if(layer==="hair_back"||layer==="hair_front")continue; // hair always follows the head
  const png=ch.wear?.[layer]?.[d];if(!png)continue;
  const px=await R.pixels(png);
  for(let k=0;k<C.N;k++)if(px[k*4+3]){a[k]=1;any=true}
 }
 return any?a:null;
}
function setOutfitTweak(pixelsIdx,d,value){
 if(!outfitChar)return;
 const g=outfitTweaks[gender]??={},o=g[outfitChar.id]??={};
 const bytes=o[d]?Uint8Array.from(atob(o[d]),c=>c.charCodeAt(0)):new Uint8Array(C.N).fill(254);
 for(const k of pixelsIdx)bytes[k]=value;
 let chars="";for(const b of bytes)chars+=String.fromCharCode(b);
 o[d]=btoa(chars);
 persistOutfitTweaks();tweakRev++;flushCache();
}
/* ---------------- automated review checks ---------------- */
function components8(list){
 const set=new Set(list),seen=new Set();let n=0;
 for(const s of list){
  if(seen.has(s))continue;n++;
  const q=[s];seen.add(s);
  for(let i=0;i<q.length;i++){const k=q[i],x=k%64,y=(k-x)/64;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=x+dx,ny=y+dy,n2=ny*64+nx;
    if((dx||dy)&&nx>=0&&nx<64&&ny>=0&&ny<112&&set.has(n2)&&!seen.has(n2)){seen.add(n2);q.push(n2)}}}
 }
 return n;
}
function nearestDist(p,list){
 let best=Infinity;
 for(const k of list){const x=k%64,y=(k-x)/64,d=Math.hypot(x-p.x,y-p.y);if(d<best)best=d}
 return best;
}
function partChecks(d){
 const m=master(),mask=C.decode(m.masks[d]);
 const alpha=source[gender][d].getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112).data;
 const lists=PARTS.map(()=>[]);
 for(let k=0;k<C.N;k++)if(alpha[k*4+3]&&mask[k]!==255)lists[mask[k]].push(k);
 const out={};
 for(let i=0;i<PARTS.length;i++){
  const part=PARTS[i],list=lists[i],issues=[],pv=m.pivots[d][part],parent=C.PARENTS[part];
  if(!list.length)issues.push("no visible pixels (OK only if fully hidden)");
  else{
   const n=components8(list);if(n>2)issues.push(n+" separate islands");
   if(parent){
    const own=nearestDist(pv,list);if(own>3)issues.push("pivot "+Math.round(own)+" px away from this part");
    const plist=lists[PARTS.indexOf(parent)];
    if(plist.length){const pd=nearestDist(pv,plist);if(pd>3)issues.push("pivot "+Math.round(pd)+" px away from "+labels[parent])}
   }
  }
  out[part]=issues;
 }
 const cx=list=>list.reduce((s,k)=>s+k%64,0)/list.length;
 const near=lists[PARTS.indexOf("arm_near_upper")],far=lists[PARTS.indexOf("arm_far_upper")];
 if(near.length&&far.length){
  const nearLeft=cx(near)<cx(far),expectLeft=!C.MIRRORED[d];
  if(nearLeft!==expectLeft)out.arm_near_upper.push("near arm is on screen-"+(nearLeft?"left":"right")+
   "; in "+d.toUpperCase()+" the limb closest to camera is on screen-"+(expectLeft?"left":"right")+" (use PASTE FLIP)");
 }
 return out;
}
async function reviewAngle(){
 await sourcePending;
 const checks=partChecks(dir),passed=[],failed=[];
 record().reviewed??={};
 for(const part of PARTS){
  if(checks[part].length)failed.push(labels[part]+": "+checks[part].join(", "));
  else{record().reviewed[reviewKey(dir,part)]=true;passed.push(part)}
 }
 persistDraft();syncControls();
 $("rig-review-message").textContent=dir.toUpperCase()+" AUTO-CHECK · "+passed.length+"/"+PARTS.length+" passed and marked reviewed"+
  (failed.length?" · NEEDS YOUR EYES: "+failed.join(" · ")+" — fix, or select the part and MARK it after looking.":"");
 status(dir.toUpperCase()+" angle review: "+passed.length+"/"+PARTS.length+" parts passed automated checks · "+reviewCount()+"/"+TOTAL_REVIEWS+" total.",failed.length>0);
 return {passed,failed};
}
/* ---------------- per-direction draw order, near side, joint caps ---------------- */
function renderRigSettings(){
 const el=$("order-list");if(!el||!master())return;
 el.replaceChildren();
 const order=baseOrder(dir,master());
 order.forEach((part,i)=>{
  const row=document.createElement("div");row.className="order-row"+(part===selected?" current":"");
  const name=document.createElement("span");name.textContent=(i+1)+". "+labels[part];
  const up=document.createElement("button");up.type="button";up.textContent="▲";up.title="Draw earlier (further back)";
  const down=document.createElement("button");down.type="button";down.textContent="▼";down.title="Draw later (in front)";
  up.disabled=i===0;down.disabled=i===order.length-1;
  up.onclick=()=>moveOrder(part,-1);down.onclick=()=>moveOrder(part,1);
  name.onclick=()=>selectPart(part);
  row.append(name,up,down);el.append(row);
 });
 $("order-title").textContent="DRAW ORDER · "+dir.toUpperCase()+" (top = furthest back)";
 $("near-side").value=M.sidesOf(master())[dir];
 $("joint-cap").value=master().capRadius?.[selected]??root.LGR1Raster.CAP_RADIUS[selected];
 $("joint-cap").disabled=!C.PARENTS[selected];
}
function moveOrder(part,delta){
 const o=baseOrder(dir,master()),i=o.indexOf(part),j=i+delta;
 if(j<0||j>=o.length)return;
 [o[i],o[j]]=[o[j],o[i]];
 master().drawOrders??={};master().drawOrders[dir]=o;
 makeDirty();renderRigSettings();
 status("DRAW ORDER "+dir.toUpperCase()+" changed · rebind to apply (reviews kept).");
}
/* ---------------- shape-based re-slice (existing drafts) ---------------- */
// Manual, confirmed action only. Never runs on load and never touches Drive.
async function resliceHeadDraft(){
 await sourcePending;
 const rig=master(),plan=[];
 for(const d of DIR){
  const rgba=source[gender][d].getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112).data;
  const r=C.resliceFromShape(C.decode(rig.masks[d]),rgba,d);
  // a pivot moves only while it is still at its default/migrated spot
  const def=C.defaultPivots(d),moves={};
  for(const [part,to] of [["head",r.headPivot],["torso",r.torsoPivot],["pelvis",r.pelvisPivot]]){
   const pv=rig.pivots[d][part];
   if(pv.y===def[part].y&&(pv.x!==to.x||pv.y!==to.y))moves[part]=to;
  }
  const pivotMoves=Object.keys(moves).length>0;
  plan.push({d,r,pivotMoves,moves});
 }
 const manualTotal=plan.reduce((n,p)=>n+manualCount(p.d),0);
 const total=plan.reduce((n,p)=>n+p.r.changed,0);
 if(!total&&!plan.some(p=>p.pivotMoves)){status("Slices already follow the body shape · nothing changed.");return false}
 const parts=[...new Set(plan.flatMap(p=>p.r.parts))].map(p=>labels[p]||p);
 if(!confirm("RE-SLICE FROM SHAPE ("+gender.toUpperCase()+", all 4 angles)?\n\n"+
   "• Head = skull + chin + neck down to the shoulder line ("+plan.map(p=>p.d.toUpperCase()+" row "+p.r.shoulder).join(", ")+")\n"+
   "• Arms = only the arm (split at the armpit / arm outline); shoulders stay torso\n"+
   "• Legs split at the real gap between the legs\n"+
   "• PELVIS = hips/crotch band (waist "+plan.map(p=>p.d.toUpperCase()+" row "+p.r.waist).join(", ")+"), parent of both thighs\n"+
   "• Empty canvas no longer belongs to any part · pixel art is NOT changed\n"+
   (manualTotal?"• You hand-painted "+manualTotal+" px: you will be asked next whether to KEEP them\n":"• RIG UNDO restores each angle\n")+
   "• Reviews reset only for parts that changed: "+(parts.join(", ")||"none")))return false;
 const keepManual=manualTotal>0&&confirm("KEEP your "+manualTotal+" hand-painted slice pixels?\n\nOK = keep them (shape slice everywhere else)\nCancel = replace them with the shape slice too");
 for(const p of plan){
  const old=C.decode(rig.masks[p.d]),lock=manualLock(p.d,false);
  if(keepManual&&lock){
   const m=p.r.mask,set=new Set();let n=0;
   for(let k=0;k<C.N;k++)if(lock[k])m[k]=old[k];
   for(let k=0;k<C.N;k++)if(m[k]!==old[k]){n++;if(m[k]!==255)for(const v of [m[k],old[k]])if(v<PARTS.length)set.add(PARTS[v])}
   p.r.changed=n;p.r.moved=n;p.r.parts=[...set];
  }else if(lock&&record().manual)delete record().manual[p.d];
 }
 for(const p of plan){
  if(!p.r.changed&&!p.pivotMoves)continue;
  maskUndo.push({dir:p.d,pivots:clone(rig.pivots[p.d]),mask:rig.masks[p.d]});
  rig.masks[p.d]=C.encode(p.r.mask);
  for(const [part,to] of Object.entries(p.moves))rig.pivots[p.d][part]={...to};
  invalidateReviews(p.d,[...new Set([...p.r.parts,...Object.keys(p.moves)])]);
 }
 const resetParts=[...new Set(plan.flatMap(p=>p.r.changed||p.pivotMoves?[...p.r.parts,...Object.keys(p.moves)]:[]))].map(p=>labels[p]||p);
 if(maskUndo.length>32)maskUndo.splice(0,maskUndo.length-32);maskRedo=[];
 ownershipCache.clear();flushCache();persistDraft();syncControls();void renderAll();
 status("RE-SLICED FROM SHAPE · "+plan.reduce((n,p)=>n+p.r.moved,0)+" visible pixels moved to a better part · empty canvas cleared · reviews reset only for: "+(resetParts.join(", ")||"none")+(keepManual?" · your hand-painted pixels kept":"")+" ("+reviewCount()+"/"+TOTAL_REVIEWS+" kept). Check each angle and AUTO-CHECK again.");
 return true;
}
/* ---------------- NE/NW bald back head repair ---------------- */
let backHeadUndo=null;
async function repairBackHeadDraft(){
 // 01 · BACK HEAD FROM WHOLE FRONT HEAD: NE/NW get the whole SE/SW head
 // (rows above their own neck); neck and body stay. Draft only; UNDO restores.
 await sourcePending;
 const rig=master(),fixes=[];
 for(const [front,back] of [["se","ne"],["sw","nw"]]){
  const f=await R.pixels(rig.layers.body?.[front]),b=await R.pixels(rig.layers.body?.[back]);
  if(!f||!b)continue;
  const out=R.wholeBackHead(f,b);if(out.changed)fixes.push([back,out]);
 }
 if(!fixes.length){status("NE/NW already use the whole front head · nothing changed.");return false}
 if(!confirm("Build the NE/NW back head from the WHOLE front head ("+fixes.map(f=>f[0].toUpperCase()+" ← "+(f[0]==="ne"?"SE":"SW")+", rows above y"+f[1].neckRow).join(" · ")+
   ")?\n\n"+fixes.reduce((n,f)=>n+f[1].changed,0)+" body pixels change; the back neck and body stay. Head pixels become HEAD in the slice. "+
   "Only this draft changes (not Drive) · ↶ UNDO BACK HEAD restores it."))return false;
 backHeadUndo={gender,layers:{},masks:{}};
 for(const [back,out] of fixes){
  backHeadUndo.layers[back]=rig.layers.body[back];backHeadUndo.masks[back]=rig.masks[back];
  const c=cv();c.getContext("2d").putImageData(new ImageData(out.data,64,112),0,0);
  rig.layers.body[back]=c.toDataURL("image/png");
 }
 R.clearCache();sourcePending=sourceCanvases(gender);await sourcePending;
 for(const [back,out] of fixes){
  // the whole head belongs to HEAD; pixels that vanished belong to no part
  const comp=source[gender][back].getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112).data;
  const mask=C.decode(rig.masks[back]),H=PARTS.indexOf("head");
  for(let k=0;k<out.neckRow*64;k++)mask[k]=comp[k*4+3]?H:255;
  rig.masks[back]=C.encode(mask);
  invalidateReviews(back,["head"]);
 }
 ownershipCache.clear();makeDirty();
 $("repair-head-undo").disabled=false;
 status("BACK HEAD = WHOLE FRONT HEAD · "+fixes.map(f=>f[0].toUpperCase()).join(" + ")+" · only HEAD reviews there reset · ↶ UNDO BACK HEAD to revert.");
 return true;
}
async function undoBackHead(){
 if(!backHeadUndo||backHeadUndo.gender!==gender){status("Nothing to undo for the back head.",true);return false}
 const rig=master();
 for(const d of Object.keys(backHeadUndo.layers)){rig.layers.body[d]=backHeadUndo.layers[d];rig.masks[d]=backHeadUndo.masks[d];invalidateReviews(d,["head"])}
 backHeadUndo=null;$("repair-head-undo").disabled=true;
 R.clearCache();sourcePending=sourceCanvases(gender);await sourcePending;
 ownershipCache.clear();makeDirty();status("BACK HEAD UNDONE · NE/NW restored.");return true;
}
async function warnHeadless(){
 try{
  const rig=master();const missing=[];
  for(const d of ["ne","nw"]){const b=await R.pixels(rig?.layers?.body?.[d]);if(b&&R.headRows(b)<40)missing.push(d.toUpperCase())}
  if(missing.length)status("This draft has no back head in "+missing.join("+")+" (old seed). Use 01 · BACK HEAD FROM WHOLE FRONT HEAD.",true);
 }catch{}
}
/* ---------------- motion library + editor ---------------- */
async function loadMotionLibrary(){
 const r=await fetch("./media/lgr1/motions.json?v=lgr1-fix-1",{cache:"no-store"});
 if(!r.ok)throw Error("Motion library HTTP "+r.status);
 motionLib=M.validateLibrary(await r.json());
}
function loadUserMotions(){
 try{
  const s=JSON.parse(localStorage.getItem(USER_MOTION_KEY)||"null");
  if(s?.format==="lgr1-user-motions-v1"&&Array.isArray(s.motions))
   userMotions=s.motions.map(m=>safeMotion(m)).filter(Boolean).filter(m=>!motionLib.motions.some(x=>x.id===m.id));
 }catch{}
}
function persistUserMotions(){
 try{localStorage.setItem(USER_MOTION_KEY,JSON.stringify({format:"lgr1-user-motions-v1",motions:userMotions}));return true}
 catch(e){status("Local motion save failed: "+e.message,true);return false}
}
function isLibraryId(id){return motionLib.motions.some(m=>m.id===id)}
function populateMotionSelects(){
 const rm=$("rig-motion-select"),rkeep=rm.value;rm.replaceChildren();
 for(const m of allMotions())rm.add(new Option((isLibraryId(m.id)?"":"★ ")+m.name+" · "+m.frames.length+"f",m.id));
 rm.value=allMotions().some(m=>m.id===rkeep)?rkeep:(allMotions().find(m=>m.id==="walk")?.id||allMotions()[0]?.id||"");
 const test=$("test-preset"),keep=test.value;
 test.replaceChildren(new Option("Neutral · no motion",""));
 for(const m of allMotions())test.add(new Option((isLibraryId(m.id)?"":"★ ")+m.name+" · "+m.frames.length+"f",m.id));
 test.value=allMotions().some(m=>m.id===keep)?keep:(allMotions()[0]?.id||"");
 const sel=$("motion-select");sel.replaceChildren();
 for(const m of allMotions())sel.add(new Option((isLibraryId(m.id)?"LIBRARY · ":"★ MINE · ")+m.name,m.id));
 if(editMotion&&allMotions().some(m=>m.id===editMotion.id))sel.value=editMotion.id;
 const src=$("motion-source");src.replaceChildren();
 for(const k of Object.keys(motionLib.poses))src.add(new Option(k,k));
 const part=$("motion-part");
 if(!part.options.length)for(const a of M.ANAT)part.add(new Option(M.LABELS[a],a));
 const snap=$("motion-snap");
 if(!snap.options.length)for(const v of M.SNAPS)snap.add(new Option(v===1?"OFF (1°)":v+"°",String(v)));
}
function startEdit(m){
 editMotion=clone(m);editFrame=0;motionMs=0;stopPlayback();
 syncMotionControls();void renderAll();
}
function touchMotion(){
 // Library motions are shared data: editing one creates your own copy.
 if(editMotion&&isLibraryId(editMotion.id)){
  let id=editMotion.id+"_mine",n=2;
  while(allMotions().some(m=>m.id===id))id=editMotion.id+"_mine"+n++;
  editMotion.id=id;editMotion.name=(editMotion.name+" (mine)").slice(0,60);
  status("Library motion copied as "+id+" · save LOCAL or DRIVE to keep it.");
 }
}
function frameObj(){return editMotion?.frames?.[Math.min(editFrame,editMotion.frames.length-1)]}
function dirOnly(){return !!$("motion-dironly")?.checked}
function effectiveValue(frame){
 const base=motionLib.poses[editMotion.source]?.[motionPart]||{},d=frame.parts[motionPart]||{};
 return {x:(Number(base.x||0)+Number(d.x||0)),y:Number(base.y||0)+Number(d.y||0),a:Number(base.a||0)+Number(d.a||0)};
}
function partValue(){
 const f=frameObj();if(!f)return {x:0,y:0,a:0};
 if(dirOnly()){const o=f.dirs?.[dir]?.[motionPart];if(o)return {x:o.x||0,y:o.y||0,a:o.a||0}}
 const v=f.parts[motionPart]||{};return {x:v.x||0,y:v.y||0,a:v.a||0};
}
function setPartValue(field,value){
 const f=frameObj();if(!f)return;
 touchMotion();
 const v=Math.max(field==="a"?-360:-32,Math.min(field==="a"?360:32,Number(value)||0));
 if(dirOnly()){
  f.dirs??={};f.dirs[dir]??={};
  if(!f.dirs[dir][motionPart]){
   const e=effectiveValue(f),k=M.FACING[dir];
   f.dirs[dir][motionPart]={x:e.x*k,y:e.y,a:e.a*k};
  }
  f.dirs[dir][motionPart][field]=v;
 }else{
  f.parts[motionPart]??={x:0,y:0,a:0};f.parts[motionPart][field]=v;
 }
 syncMotionControls();void renderAll();
}
function syncMotionControls(){
 if(!$("motion-panel"))return;
 const has=!!editMotion;
 for(const el of document.querySelectorAll("#motion-panel [data-needs-motion]"))el.disabled=!has;
 if(!has){$("motion-info").textContent="Choose a motion or NEW.";return}
 $("motion-id").value=editMotion.id;$("motion-name").value=editMotion.name;
 $("motion-source").value=editMotion.source;$("motion-snap").value=String(editMotion.angleSnap);
 $("motion-loop").checked=editMotion.loop!==false;
 const frames=$("motion-frames");frames.replaceChildren();
 editMotion.frames.forEach((f,i)=>{
  const b=document.createElement("button");b.type="button";b.textContent=String(i+1);
  b.setAttribute("aria-pressed",String(i===editFrame));
  b.onclick=()=>{stopPlayback();editFrame=i;motionMs=editMotion.frames.slice(0,i).reduce((n,x)=>n+x.ms,0);syncMotionControls();void renderAll()};
  frames.append(b);
 });
 $("motion-add-frame").disabled=editMotion.frames.length>=6;
 $("motion-del-frame").disabled=editMotion.frames.length<=1;
 const f=frameObj();
 $("motion-ms").value=f.ms;
 $("motion-part").value=motionPart;
 const v=partValue();
 $("motion-a").value=v.a;$("motion-a-num").value=v.a;$("motion-x").value=v.x;$("motion-y").value=v.y;
 $("motion-x-num").value=v.x;$("motion-y-num").value=v.y;
 $("motion-behind").checked=!!f.behindTorso?.includes(motionPart);
 $("motion-behind").disabled=motionPart==="torso"||motionPart==="head"||motionPart==="pelvis";
 const mapped=M.rigPart(motionPart,dir,rigSides());
 const valid=safeMotion(editMotion);
 $("motion-info").textContent=(isLibraryId(editMotion.id)?"LIBRARY (read-only: first edit makes your copy)":"★ YOUR MOTION")+
  " · frame "+(editFrame+1)+"/"+editMotion.frames.length+" · "+M.LABELS[motionPart]+" → "+dir.toUpperCase()+" piece "+labels[mapped]+
  (dirOnly()?" · editing "+dir.toUpperCase()+" ONLY (screen values)":" · values as seen in SE, mirrored to SW/NW")+
  (()=>{const own=DIR.filter(d=>f.dirs?.[d]?.[motionPart]);
   return own.length&&!dirOnly()?" · ⚠ "+own.map(d=>d.toUpperCase()).join("+")+" keep their own value for this part (tick EDIT ONLY THIS DIRECTION there)":""})()+
  (motionPart==="torso"?" · TORSO angle bends the upper body at the WAIST (legs stay); X/Y move the whole body":
   motionPart==="pelvis"?" · PELVIS is the root: X/Y move the whole body, angle tilts the hips (legs + upper body follow)":"")+
  (valid?"":" · ⚠ INVALID");
}
function newMotion(){
 let n=1;while(allMotions().some(m=>m.id==="my_motion_"+n))n++;
 startEdit({format:M.MOTION_FORMAT,id:"my_motion_"+n,name:"My motion "+n,source:"neutral",angleSnap:5,loop:true,frames:[{ms:160,parts:{}}]});
}
function saveMotionLocal(){
 try{
  const v=M.validateMotion(editMotion,motionLib.poses);
  if(isLibraryId(v.id))throw Error("ID "+v.id+" belongs to the shared library · change ID first");
  userMotions=userMotions.filter(m=>m.id!==v.id);userMotions.push(v);
  if(!persistUserMotions())return false;
  editMotion=clone(v);populateMotionSelects();syncMotionControls();
  status("MOTION SAVED LOCALLY · "+v.id+" · "+v.frames.length+" keyframes · also available in 04 CHECK BINDING.");
  return true;
 }catch(e){status("Motion save: "+e.message,true);return false}
}
async function saveMotionDrive(){
 try{
  if(!saveMotionLocal())return;
  const cloud=root.VLGenesisCloud;if(!cloud?.connected())throw Error("CONNECT DRIVE first (motion kept locally)");
  const r=await cloud.saveMotion(M.validateMotion(editMotion,motionLib.poses));
  await refreshDriveMotions();
  status("MOTION DRIVE VERSION VERIFIED · "+r.name+" (new immutable file, nothing overwritten)");
 }catch(e){status("Motion Drive: "+e.message,true)}
}
async function refreshDriveMotions(){
 const cloud=root.VLGenesisCloud;if(!cloud?.connected())throw Error("CONNECT DRIVE first");
 const list=await cloud.listMotions(),sel=$("motion-drive-list");sel.replaceChildren();
 if(!list.length)sel.add(new Option("No motions on Drive yet",""));
 for(const f of list)sel.add(new Option(f.name.replace(/^lgr1_motion\./,""),f.id));
 return list;
}
async function loadDriveMotion(){
 try{
  const cloud=root.VLGenesisCloud;if(!cloud?.connected())throw Error("CONNECT DRIVE first");
  const id=$("motion-drive-list").value;if(!id)throw Error("Refresh and choose a Drive motion");
  const r=await cloud.loadMotion(id),v=M.validateMotion(r.motion,motionLib.poses);
  if(isLibraryId(v.id))v.id+="_drive";
  userMotions=userMotions.filter(m=>m.id!==v.id);userMotions.push(v);persistUserMotions();
  populateMotionSelects();startEdit(v);
  status("Loaded Drive motion "+r.name+" · saved locally as "+v.id);
 }catch(e){status("Load Drive motion: "+e.message,true)}
}
function setup(){
 buildAngleButtons();buildPartButtons();
 for(const b of document.querySelectorAll("#progress button"))b.onclick=()=>switchStep(b.dataset.step);
 $("gender").onchange=async e=>{
  const g=e.target.value;
  if(!SOURCE[g])return;
  try{
   gender=g;dir="se";selected="head";activeLayer="body";maskUndo=[];maskRedo=[];faceId="";faceImage=null;
   unassignedClusters=[];activeUnassigned=-1;unassignedUndo=null;
   await ensure(g);
   stopPlayback();motionMs=0;
   if(step==="save"&&!record()?.approved)step=record()?.bound?"test":"pixel";
   if(step==="test"&&!record()?.bound)step="rig";
   syncControls();flushCache();void refreshFace();void autoLayer(true);void syncSkinUI();
   if(root.VLGenesisCloud?.connected()&&!BASE_MODE)void refreshDraftRevisions().catch(()=>{});
  }catch(err){status("V6B source error: "+err.message,true)}
 };
 $("seed").onclick=async()=>{
  if(!confirm("Reset "+gender+" draft to the OFFICIAL "+gender.toUpperCase()+" BASE? This replaces this browser's unsaved pixels, slices and pivots (export first if needed)."))return;
  try{const from=await seed(gender,"official");step="pixel";syncControls();void autoLayer(true);void syncSkinUI();
   if(from==="official")status("Reset to the OFFICIAL "+gender.toUpperCase()+" BASE (media/lgr1/base).")}catch(e){status(e.message,true)}
 };
 if($("seed-v6b"))$("seed-v6b").onclick=async()=>{
  if(!confirm("Reset "+gender+" draft to the OLD frozen V6B source (before the official base)? This replaces this browser's draft."))return;
  try{await seed(gender,"v6b");step="pixel";syncControls();void autoLayer(true);void syncSkinUI();status("Reset to the OLD V6B "+gender+" source (fallback).")}catch(e){status(e.message,true)}
 };
 $("save-draft").onclick=()=>{
  const okay=persistDraft();
  download("genesis_"+gender+"_draft.json",JSON.stringify({format:"lgr-1-draft-v1",gender,record:record()},null,2));
  status(okay?"Draft saved locally + JSON downloaded.":"Local browser storage FULL — only JSON backup was downloaded.",!okay);
 };
 $("art-layer").onchange=()=>{activeLayer=$("art-layer").value;status("Editing layer "+activeLayer+" · body part "+labels[selected])};
 $("pixel-next").onclick=()=>switchStep("rig");
 $("rig-next").onclick=()=>switchStep("bind");
 $("edit-pixels").onclick=()=>void openPixels().catch(e=>status(e.message,true));
 $("rig-pivot").onclick=()=>{tool="pivot";syncControls()};
 $("rig-paint").onclick=()=>{tool="paint";syncControls()};
 $("rig-erase").onclick=()=>{tool="erase";syncControls()};
 $("rig-pan").onclick=()=>{tool="pan";syncControls();status("PAN MODE · drag canvas to scroll without editing anatomy")};
 $("rig-isolate").onclick=()=>{isolated=!isolated;syncControls();void renderAll()};
 $("find-unassigned").onclick=()=>void findUnassignedPixels().catch(e=>status("Find unassigned: "+e.message,true));
 $("find-unassigned-from-bind").onclick=()=>void findUnassignedPixels().catch(e=>status("Find unassigned: "+e.message,true));
 $("next-unassigned").onclick=()=>focusUnassignedIssue(activeUnassigned+1);
 $("unassigned-clusters").onchange=()=>{
  if($("unassigned-clusters").value!=="")focusUnassignedIssue(Number($("unassigned-clusters").value))
 };
 $("remove-stray-group").onclick=()=>void eraseUnassignedStrays(false).catch(e=>status("Remove stray: "+e.message,true));
 $("remove-strays-angle").onclick=()=>void eraseUnassignedStrays(true).catch(e=>status("Remove angle strays: "+e.message,true));
 $("undo-stray-delete").onclick=()=>void undoUnassignedRemoval().catch(e=>status("Undo stray: "+e.message,true));
 $("copy-part-slice").onclick=()=>{
  partCopied={mask:master().masks[dir],part:selected,direction:dir};
  status("Copied ONLY "+labels[selected]+" from "+dir.toUpperCase());
 };
 $("paste-part-slice").onclick=pasteCopiedPart;
 for(const field of ["x","y"])$("pivot-"+field).onchange=()=>{
  snapshot();setPivot(Number($("pivot-x").value),Number($("pivot-y").value));
 };
 $("copy-slice").onclick=()=>{
  maskCopied=master().masks[dir];
  status("Copied WHOLE "+dir.toUpperCase()+" slice map. Pasting will replace every part's mask.");
 };
 $("paste-slice").onclick=()=>{
  if(!maskCopied||!confirm("Replace the ENTIRE "+dir.toUpperCase()+
    " "+PARTS.length+"-part mask with the copied mask? All reviews of this angle will reset."))return;
  bindMaskCopy(false);
 };
 $("flip-slice").onclick=()=>{
  if(!maskCopied||!confirm("Replace the ENTIRE "+dir.toUpperCase()+
    " mask with a horizontally flipped copy (near/far swapped)? All reviews of this angle will reset."))return;
  bindMaskCopy(true);
 };
 $("mark-reviewed").onclick=async()=>{
  await sourcePending;
  if(!master()?.pivots?.[dir]?.[selected])return status("Pivot missing",true);
  const mask=C.decode(master().masks[dir]);
  const rgba=source[gender][dir].getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112).data;
  let pixels=0;
  for(let i=0;i<mask.length;i++)if(mask[i]===PARTS.indexOf(selected)&&rgba[i*4+3]>0)pixels++;
  const issues=partChecks(dir)[selected];
  if(issues.length&&!confirm(labels[selected]+" / "+dir.toUpperCase()+" automated check:\n• "+issues.join("\n• ")+
    "\n\nMark reviewed anyway? Only do this if you looked at it and it is correct (e.g. fully hidden limb)."))return;
  record().reviewed??={};
  record().reviewed[reviewKey(dir,selected)]=true;
  persistDraft();syncControls();status("Reviewed "+labels[selected]+" / "+dir.toUpperCase()+
    " · "+reviewCount()+"/40. This is a manual anatomy check.");
 };
 $("clear-reviewed").onclick=()=>{
  if(!confirm("Clear review for "+labels[selected]+" / "+dir.toUpperCase()+"?"))return;
  delete record().reviewed?.[reviewKey(dir,selected)];record().testedAngles={};record().bound=null;record().approved=false;record().saved=false;
  persistDraft();syncControls();
 };
 $("rig-undo").onclick=()=>applySnapshot(maskUndo,maskRedo);
 $("rig-redo").onclick=()=>applySnapshot(maskRedo,maskUndo);
 $("make-binding").onclick=()=>void makeBinding();
 $("export-python").onclick=exportPython;
 $("export-json").onclick=exportJson;
 $("bind-next").onclick=()=>switchStep("test");
 $("test-play").onclick=togglePlayback;
 $("test-scrub").oninput=()=>{stopPlayback();const mo=currentMotion();
  motionMs=mo?Number($("test-scrub").value)/100*M.duration(mo):0;
  if(mo&&step==="motion"){editFrame=M.frameIndexAt(mo,motionMs);syncMotionControls()}
  void renderAll()};
 $("test-speed").onchange=()=>{playTick=0};
 $("test-preset").onchange=()=>{motionMs=0;$("test-scrub").value=0;void renderAll()};
 for(const id of ["test-angle","test-x","test-y"])$(id).oninput=()=>void renderAll();
 $("edit-binding").onclick=()=>{record().bound=null;record().approved=false;record().saved=false;
  persistDraft();switchStep("rig");status("Binding reopened. Edit pivots/slices and BIND again.")};
 $("mark-angle-tested").onclick=()=>{
  if(!record()?.bound)return status("Bind anatomy before marking angle tested",true);
  record().testedAngles??={};record().testedAngles[dir]=true;
  persistDraft();syncControls();status("Marked "+dir.toUpperCase()+" binding test passed.");
 };
 $("approve-binding").onclick=()=>{try{validatedBinding();
   const missing=DIR.filter(d=>!record()?.testedAngles?.[d]);
   if(missing.length)throw Error("Test and mark all 4 views before approval: "+missing.join(", "));
   record().approved=true;stopPlayback();persistDraft();
   switchStep("save");status("BINDING APPROVED · save as the canonical LGR-1 master");
  }catch(e){status(e.message,true)}};
 $("save-master").onclick=saveApproved;
 $("download-master").onclick=()=>{try{download(MASTER_IDS[gender]+".json",JSON.stringify(toMaster(),null,2));status("Master JSON downloaded")}catch(e){status(e.message,true)}};
 $("download-binding").onclick=exportPython;
 $("cloud-master").onclick=()=>void cloudSave();
 $("load-cloud").onclick=()=>void cloudLoad();
 $("cloud-draft").onclick=()=>void cloudSaveDraft();
 $("refresh-drafts").onclick=()=>void refreshDraftRevisions().then(v=>
  status(v.length+" cloud draft versions found.")).catch(e=>status("Draft list: "+e.message,true));
 $("load-cloud-draft").onclick=()=>void cloudLoadDraft();
 $("import-draft").onclick=()=>$("draft-file").click();
 $("draft-file").onchange=()=>{const file=$("draft-file").files?.[0];
  $("draft-file").value="";if(file)void importDraftFile(file);
 };
 $("connect-drive").onclick=async()=>{
  try{await root.VLGenesisCloud.connect();$("connect-drive").textContent="☁ CONNECTED";$("statuscloud").textContent="DRIVE CONNECTED";
   if(BASE_MODE){root.dispatchEvent(new Event("genesis-base-drive"));status("Drive connected · Genesis Base folder only.");return}
   await refreshDraftRevisions();
   status("LGR-1 Drive connected · draft versions loaded · no legacy records touched.");
  }catch(e){status("Drive: "+e.message,true)}
 };
 $("face").onchange=()=>{faceId=$("face").value;faceImage=null;flushCache()};
 $("refresh-face").onclick=()=>void refreshFace();
 $("open-face").onclick=()=>showPage("emotion");
 $("nav-workshop").onclick=()=>showPage("workshop");
 $("nav-emotion").onclick=()=>showPage("emotion");
 $("fullscreen").onclick=async()=>{
  try{
   if(document.fullscreenElement)await document.exitFullscreen();
   else await document.documentElement.requestFullscreen();
  }catch(e){status("Fullscreen unsupported in this browser: "+e.message,true)}
 };
 $("zoom-out").onclick=()=>setZoom(zoom-1);$("zoom-in").onclick=()=>setZoom(zoom+1);
 $("zoom-fit").onclick=()=>{const v=$("stagewrap");const fit=Math.floor(Math.min((v.clientWidth-20)/64,(v.clientHeight-20)/112));setZoom(clamp(fit,2,14));};
 $("zoom").oninput=()=>setZoom($("zoom").value);
 $("stagewrap").addEventListener("wheel",e=>{if(page!=="workshop")return;e.preventDefault();setZoom(zoom+(e.deltaY<0?1:-1))},{passive:false});
 canvas.addEventListener("pointerdown",e=>{
  if(step!=="rig"||e.button!==0)return;
  canvas.setPointerCapture?.(e.pointerId);
  if(tool==="pan"){
   const wrap=$("stagewrap");
   paintDrag={id:e.pointerId,pan:true,x:e.clientX,y:e.clientY,
    left:wrap.scrollLeft,top:wrap.scrollTop};
   return;
  }
  const p=coords(e);snapshot();
  paintDrag={id:e.pointerId,last:"",prev:p,direction:dir,dirtyParts:new Set([selected])};
  if(tool==="pivot"){setPivot(p.x,p.y,false)}
  else maskPaint(p,tool==="erase");
 });
 canvas.addEventListener("pointermove",e=>{
  if(!paintDrag||paintDrag.id!==e.pointerId||step!=="rig")return;
  if(paintDrag.pan){
   $("stagewrap").scrollLeft=paintDrag.left-(e.clientX-paintDrag.x);
   $("stagewrap").scrollTop=paintDrag.top-(e.clientY-paintDrag.y);
   return;
  }
  const p=coords(e),key=p.x+"|"+p.y;
  if(paintDrag.last===key)return;paintDrag.last=key;
  if(tool==="pivot")setPivot(p.x,p.y,false);
  else{maskPaint(p,tool==="erase",paintDrag.prev);paintDrag.prev=p}
 });
 const end=e=>{
  if(paintDrag?.id!==e.pointerId)return;
  const changed=paintDrag;paintDrag=null;
  if(changed.pan)return;
  cancelRigPreview();
  if(changed.direction===dir)invalidateReviews(dir,[...changed.dirtyParts]);
  else invalidateReviews();
  syncControls();
 };
 for(const k of ["pointerup","pointercancel","lostpointercapture"])canvas.addEventListener(k,end);
 setupLgr1Controls();
 setZoom(5);
}
function setupLgr1Controls(){
 const guard=(fn,label)=>(...a)=>{try{const r=fn(...a);if(r?.catch)r.catch(e=>status(label+": "+e.message,true))}catch(e){status(label+": "+e.message,true)}};
 // 02 · rig settings + lighter review gate
 $("review-angle").onclick=guard(reviewAngle,"Angle review");
 $("order-reset").onclick=()=>{if(master()?.drawOrders?.[dir]){delete master().drawOrders[dir];makeDirty();renderRigSettings();status("DRAW ORDER "+dir.toUpperCase()+" reset to default.")}};
 $("near-side").onchange=()=>{
  const v=$("near-side").value;if(v!=="left"&&v!=="right")return;
  master().sides={...M.sidesOf(master()),[dir]:v};
  invalidateReviews(dir,PARTS.filter(p=>p!=="head"&&p!=="torso"&&p!=="pelvis"));syncControls();
  status("NEAR SIDE "+dir.toUpperCase()+" = "+v.toUpperCase()+" · motions now drive the "+v+" limbs with the near pieces here. Limb reviews of this angle reset.");
 };
 $("joint-cap").onchange=()=>{
  if(!C.PARENTS[selected])return;
  const v=clamp(Math.round(Number($("joint-cap").value)||0),0,6);
  master().capRadius={...(master().capRadius||{}),[selected]:v};
  makeDirty();flushCache();syncControls();
  status("JOINT CAP "+labels[selected]+" = "+v+" px · rebind to use it in the check step.");
 };
 $("reslice-head").onclick=guard(resliceHeadDraft,"Re-slice head");
 $("rig-motion-play").onclick=()=>toggleRigMotion();
 $("rig-motion-select").onchange=()=>{rigMotion.ms=0;void renderRigMotion(true)};
 $("rig-motion-all").onchange=()=>void renderRigMotion(true);
 $("repair-head").onclick=guard(async()=>{if(await repairBackHeadDraft()){syncControls();flushCache()}},"Back head");
 $("repair-head-undo").onclick=guard(async()=>{if(await undoBackHead()){syncControls();flushCache()}},"Back head undo");
 // outfits
 $("outfit-preview").onchange=guard(()=>chooseOutfit($("outfit-preview").value),"Outfit");
 $("outfit-in-rig").onchange=guard(async()=>{tweakRev++;flushCache();if(unassignedClusters.length)await findUnassignedPixels()},"Outfit");
 $("assign-outfit-cluster").onclick=guard(async()=>{
  const c=unassignedClusters[activeUnassigned];if(!c||c.kind!=="outfit")return;
  setOutfitTweak(c.pixels,c.dir,PARTS.indexOf(selected));
  await findUnassignedPixels();
  status("Outfit "+outfitChar.id+" · "+c.count+" px in "+c.dir.toUpperCase()+" now follow "+labels[selected]+" (this outfit only).");
 },"Outfit tweak");
 $("reset-outfit-tweaks").onclick=guard(async()=>{
  if(!outfitChar||!confirm("Reset all part tweaks for outfit "+outfitChar.id+"?"))return;
  delete outfitTweaks[gender]?.[outfitChar.id];persistOutfitTweaks();tweakRev++;flushCache();
  await findUnassignedPixels();status("Outfit tweaks reset · outfit follows the body mask again.");
 },"Outfit tweak");
 // 05 · motion editor
 $("motion-select").onchange=()=>{const m=allMotions().find(x=>x.id===$("motion-select").value);if(m)startEdit(m)};
 $("motion-new").onclick=()=>{newMotion();populateMotionSelects();status("NEW MOTION · edit frames, then SAVE.")};
 $("motion-dup").onclick=()=>{if(!editMotion)return;const c=clone(editMotion);let id=(c.id.slice(0,34))+"_copy",n=2;
  while(allMotions().some(m=>m.id===id))id=c.id.slice(0,32)+"_copy"+n++;
  c.id=id;c.name=(c.name+" copy").slice(0,60);startEdit(c);status("Duplicated as "+id+" · SAVE to keep.")};
 $("motion-del").onclick=()=>{
  if(!editMotion)return;
  if(isLibraryId(editMotion.id))return status("Library motions are shared data and cannot be deleted here",true);
  if(!confirm("Delete your local motion "+editMotion.id+"? (Drive versions stay.)"))return;
  userMotions=userMotions.filter(m=>m.id!==editMotion.id);persistUserMotions();
  editMotion=null;populateMotionSelects();const f=allMotions()[0];if(f)startEdit(f);status("Local motion deleted.");
 };
 $("motion-id").onchange=()=>{const v=$("motion-id").value.trim().toLowerCase();
  if(!/^[a-z0-9_]{1,40}$/.test(v)){status("ID: a-z 0-9 _ only, 1–40",true);syncMotionControls();return}
  editMotion.id=v;syncMotionControls()};
 $("motion-name").onchange=()=>{touchMotion();editMotion.name=$("motion-name").value.slice(0,60)||editMotion.id;syncMotionControls()};
 $("motion-source").onchange=()=>{touchMotion();editMotion.source=$("motion-source").value;syncMotionControls();void renderAll()};
 $("motion-snap").onchange=()=>{touchMotion();editMotion.angleSnap=Number($("motion-snap").value);
  for(const id of ["motion-a","motion-a-num"])$(id).step=String(editMotion.angleSnap);syncMotionControls();void renderAll()};
 $("motion-loop").onchange=()=>{touchMotion();editMotion.loop=$("motion-loop").checked;syncMotionControls()};
 $("motion-add-frame").onclick=()=>{
  if(!editMotion||editMotion.frames.length>=6)return;touchMotion();
  editMotion.frames.splice(editFrame+1,0,clone(frameObj()));editFrame++;stopPlayback();syncMotionControls();void renderAll();
 };
 $("motion-del-frame").onclick=()=>{
  if(!editMotion||editMotion.frames.length<=1)return;touchMotion();
  editMotion.frames.splice(editFrame,1);editFrame=Math.max(0,editFrame-1);syncMotionControls();void renderAll();
 };
 $("motion-ms").onchange=()=>{touchMotion();frameObj().ms=clamp(Math.round(Number($("motion-ms").value)||120),40,2000);syncMotionControls()};
 $("motion-part").onchange=()=>{motionPart=$("motion-part").value;syncMotionControls()};
 const angle=v=>M.snap(Number(v)||0,editMotion?.angleSnap||5);
 $("motion-a").oninput=()=>setPartValue("a",angle($("motion-a").value));
 $("motion-a-num").onchange=()=>setPartValue("a",angle($("motion-a-num").value));
 for(const k of ["x","y"]){
  $("motion-"+k).oninput=()=>setPartValue(k,Math.round(Number($("motion-"+k).value)));
  $("motion-"+k+"-num").onchange=()=>setPartValue(k,Math.round(Number($("motion-"+k+"-num").value)));
 }
 $("motion-reset-part").onclick=()=>{const f=frameObj();if(!f)return;touchMotion();
  if(dirOnly())delete f.dirs?.[dir]?.[motionPart];else delete f.parts[motionPart];
  syncMotionControls();void renderAll()};
 $("motion-behind").onchange=()=>{const f=frameObj();if(!f)return;touchMotion();
  const set=new Set(f.behindTorso||[]);$("motion-behind").checked?set.add(motionPart):set.delete(motionPart);
  if(set.size)f.behindTorso=[...set];else delete f.behindTorso;syncMotionControls();void renderAll()};
 $("motion-dironly").onchange=()=>syncMotionControls();
 $("motion-play").onclick=togglePlayback;
 $("motion-save").onclick=()=>void saveMotionLocal();
 $("motion-save-drive").onclick=()=>void saveMotionDrive();
 $("motion-export").onclick=()=>{try{const v=M.validateMotion(editMotion,motionLib.poses);
  download("lgr1_motion_"+v.id+".json",JSON.stringify(v,null,2));status("Motion JSON downloaded · add to media/lgr1/motions.json to share it with everyone.")}
  catch(e){status("Export: "+e.message,true)}};
 $("motion-refresh-drive").onclick=()=>void refreshDriveMotions().then(l=>status(l.length+" Drive motions found.")).catch(e=>status("Drive motions: "+e.message,true));
 $("motion-load-drive").onclick=()=>void loadDriveMotion();
}
function showPage(next){
 page=next;
 const isEmotion=next==="emotion";
 if(isEmotion)stopPlayback();
 $("workspace").hidden=isEmotion;$("progress").hidden=isEmotion;
 $("emotionpanel").style.display=isEmotion?"block":"none";
 $("nav-emotion").setAttribute("aria-selected",String(isEmotion));
 $("nav-workshop").setAttribute("aria-selected",String(!isEmotion));
 if(isEmotion&&$("emotion-frame").src==="about:blank")
  $("emotion-frame").src="/virtual-office/emotion-studio/";
 if(!isEmotion)void renderAll();
}
/* ---------------- hair design overlay (guide only, t631u) ----------------
 * V6P hair designs drawn on SCREEN canvases only (pixel editor, views, rig
 * motion preview), placed with the head transform the game uses. Never written
 * into layers, masks, drafts, exports or checksums; the choice lives in its own
 * localStorage key. */
const HAIR_KEY="lafrich-genesis-base-hair-overlay-v1";
const HAIR_STYLES=Object.freeze(["short","swept","mid_curtain","mid","wavy","wavy_curtain","long","long_curtain"]);
let hairGuide={style:"",opacity:50,front:true};
const hairCache={};
function loadHairGuide(){
 try{const s=JSON.parse(localStorage.getItem(HAIR_KEY)||"null");
  if(s&&typeof s==="object")hairGuide={style:HAIR_STYLES.includes(s.style)?s.style:"",
   opacity:Math.max(10,Math.min(100,Math.round(Number(s.opacity)||50))),front:s.front!==false}}catch{}
}
function saveHairGuide(){try{localStorage.setItem(HAIR_KEY,JSON.stringify(hairGuide))}catch{}}
function hairImages(style){
 if(hairCache[style])return hairCache[style];
 hairCache[style]=(async()=>{
  const V=root.V6PCompositor;if(!V)throw Error("V6P compositor missing");
  const ch=V.norm({hair:style,hairColor:"brown",skin:"light",body:"male",gender:"male",face:"blank"}),out={back:{},front:{}};
  for(const part of ["back","front"]){
   const atlas=await V.img("hair/"+style+"_"+part);if(!atlas)continue;
   for(const d of DIR){
    const im=V.extractFrame(atlas,"idle",d,0).getContext("2d",{willReadFrequently:true}).getImageData(0,0,64,112);
    const c=cv();c.getContext("2d").putImageData(V.keysToDisplay(im,ch),0,0);out[part][d]=c;
   }
  }
  hairCache[style].ready=out;return out;
 })();
 return hairCache[style];
}
function hairReady(){const p=hairGuide.style&&hairCache[hairGuide.style];return p&&p.ready||null}
function headMat(d,m,pose){
 return root.LGR1Raster.matrices(m.pivots[d],m.placements?.[d]||{},pose||C.blankPose()).head.mat;
}
// g2: target context (identity transform); scale: screen px per sprite px;
// behind via destination-over when the target already holds the body.
function drawHairOverlay(g2,d,m,pose,sx=1,sy=sx,destOver=false){
 const h=hairReady();if(!h||!m)return false;
 const t=headMat(d,m,pose);
 g2.save();g2.imageSmoothingEnabled=false;g2.globalAlpha=hairGuide.opacity/100;
 if(destOver&&!hairGuide.front)g2.globalCompositeOperation="destination-over";
 g2.setTransform(t[0]*sx,t[1]*sy,t[2]*sx,t[3]*sy,t[4]*sx,t[5]*sy);
 for(const part of (destOver&&!hairGuide.front)?["front","back"]:["back","front"]){const c=h[part]?.[d];if(c)g2.drawImage(c,0,0)}
 g2.restore();return true;
}
function pixelGuide(out,d,u,v,phase){
 if(!hairGuide.style||phase!==(hairGuide.front?"front":"behind"))return;
 drawHairOverlay(out,d,master(),null,u,v,false);
}
function syncHairUI(){
 for(const [sel,op,lab,front] of [["hair-style","hair-opacity","hair-opacity-label","hair-front"],["pixelHairStyle","pixelHairOpacity","pixelHairOpacityLabel","pixelHairFront"]]){
  if($(sel))$(sel).value=hairGuide.style;
  if($(op))$(op).value=String(hairGuide.opacity);
  if($(lab))$(lab).textContent=hairGuide.opacity+"%";
  if($(front))$(front).value=hairGuide.front?"front":"behind";
 }
}
async function setHairGuide(patch){
 hairGuide={...hairGuide,...patch};saveHairGuide();syncHairUI();
 if(hairGuide.style){try{await hairImages(hairGuide.style)}catch(e){status("Hair overlay: "+e.message,true)}}
 pixelEditor?.redraw?.();void renderAll();refreshRigMotionNow();
}
function setupHairUI(){
 for(const sel of ["hair-style","pixelHairStyle"]){const el=$(sel);if(!el)continue;
  if(el.options.length<2)for(const h of HAIR_STYLES)el.add(new Option(h.replaceAll("_"," ").toUpperCase(),h));
  el.onchange=()=>setHairGuide({style:el.value})}
 for(const op of ["hair-opacity","pixelHairOpacity"]){const el=$(op);if(el)el.oninput=()=>setHairGuide({opacity:Number(el.value)})}
 for(const f of ["hair-front","pixelHairFront"]){const el=$(f);if(el)el.onchange=()=>setHairGuide({front:el.value!=="behind"})}
 syncHairUI();
 if(hairGuide.style)void hairImages(hairGuide.style).then(()=>{pixelEditor?.redraw?.();void renderAll();refreshRigMotionNow()}).catch(()=>{});
}
async function boot(){
 try{
  if(!C||!R||!P)throw Error("Required anatomy, compositor or pixel editor engine absent");
  if(!root.LGR1Raster||!M)throw Error("LGR-1 raster / motion modules absent");
  loadStored();
  await loadMotionLibrary();loadUserMotions();loadOutfitTweaks();loadHairGuide();
  setup();populateMotionSelects();if(BASE_MODE)setupHairUI();
  await ensure(gender);
  syncControls();await renderAll();void autoLayer(true);void syncSkinUI();
  if(BASE_MODE)status("GENESIS BASE · edit Male/Female pixels in 4 views (01), then cut + pivots (02) · ▶ PREVIEW MOTION checks it · EXPORT / SAVE TO DRIVE when done.");
  else status("LGR-1 · V6B MALE loaded · "+allMotions().length+" shared motions · edit "+PARTS.length+" body parts (pelvis split from torso) across four directions.");
  if(!BASE_MODE)await refreshFace().catch(()=>{});
  await warnHeadless();
  if(legacyNotice.length)status("Old 10-part draft ("+legacyNotice.join("+")+") opened · PELVIS was derived from the lower torso in memory (nothing saved yet). "+
   "Press 02 · ✂ RE-SLICE FROM SHAPE for the new head/arm/leg/pelvis cut, AUTO-CHECK each angle, then rebind.",true);
 }catch(e){status("LGR-1 boot failed: "+e.message,true)}
}
if(BASE_MODE)root.GenesisWorkbench=Object.freeze({
 gender:()=>gender,record,master,status,DRAFT_KEY,WORKBENCH_DRAFT_KEY,
 async renderSheet(g,kind){ // 4 views side by side (art or part-colour mask), 64×112 each
  const rig=drafts[g]?.rig;if(!rig)throw Error("No "+g+" draft");
  const out=R.rgba(64*4,112),o=out.getContext("2d");
  for(let i=0;i<DIR.length;i++){const d=DIR[i];
   if(kind==="mask"){const m=C.decode(rig.masks[d]),im=o.createImageData(64,112);
    for(let k=0;k<C.N;k++){const v=m[k];if(v===255||!PART_RGB[PARTS[v]])continue;im.data.set([...PART_RGB[PARTS[v]],255],k*4)}
    o.putImageData(im,i*64,0)}
   else{const sk=g===gender?await skinned(rig):rig,prep=await R.prepare(sk,null,d);o.drawImage(R.render(prep,C.blankPose()),i*64,0)}
  }
  return out;
 },
 skin:()=>skinSetting(),
 setSkin:s=>setSkin(s),
 motions:()=>allMotions().map(m=>({id:m.id,name:m.name,frames:m.frames.length})),
 // one motion frame of the current draft (current skin tone), for QA sheets
 async renderPose(motionId,i,d){
  const m=master(),mo=allMotions().find(x=>x.id===motionId);if(!m||!mo)throw Error("No draft or motion "+motionId);
  const smo=safeMotion(mo),sides=rigSides(m),prep=await R.prepare(await skinned(m),null,d);
  const pose=Object.assign(C.blankPose(),M.framePose(motionLib.poses,smo,i,d,sides));
  return R.render(prep,pose,{order:M.frameOrder(baseOrder(d,m),smo,i,d,sides)});
 },
 async adopt(g,rig,manual,label,skin){
  if(!SOURCE[g])throw Error("Unknown gender");
  drafts[g]={rig:C.validateMaster(rig),bound:null,reviewed:{},testedAngles:{},approved:false,saved:false,
   edited:new Date().toISOString(),manual:manual&&typeof manual==="object"?manual:{},skin:SK?SK.normalize(skin):{tone:"light"}};
  await sourceCanvases(g);R.clearCache();persistDraft();
  if(g!==gender){$("gender").value=g;$("gender").dispatchEvent(new Event("change"))}
  else{maskUndo=[];maskRedo=[];flushCache();syncControls();void autoLayer(true);void syncSkinUI()}
  status(label||("Opened "+g+" Genesis Base"));
 }
});
const PART_RGB={head:[255,140,0],torso:[255,235,59],pelvis:[0,170,170],arm_near_upper:[156,39,176],arm_near_lower:[206,147,216],
 arm_far_upper:[46,160,67],arm_far_lower:[150,220,150],leg_near_upper:[30,90,220],leg_near_lower:[120,170,255],
 leg_far_upper:[160,60,40],leg_far_lower:[220,120,90]};
void boot();
})(window);
