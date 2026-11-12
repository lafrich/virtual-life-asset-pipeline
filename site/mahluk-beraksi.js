/* MAHLUK HIDUP · BERAKSI — action-scene maker (lgr1-beraksi-v1).
 * Several LGR-1 characters on one stage: base Male/Female + skin + outfit or
 * none + hair, a sequence of animations (Bergerak database + built-ins) with
 * durations, an Emosi face track, drag position (feet anchor, relative to the
 * stage centre on the ground line), view + flip, front/behind layer order.
 * Saved to the LGR database (lgr-db.js → Drive Database/Beraksi).
 */
(function(root){"use strict";
const U=root.MHUI,el=U.el,DB=()=>root.LGRDB,A=()=>root.LGRActor,M=()=>root.LGR1Motion;
const DIRS=["se","sw","ne","nw"],SW=256,SH=160,Z=3,GX=SW/2,GY=128;
const S={lib:null,bases:null,scene:null,isNew:true,dirty:false,sel:null,t:0,playing:false,raf:0,drag:null,ui:{},ready:false,boxes:[],ticket:0};
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
function blankScene(){
 return {format:"lgr1-beraksi-v1",id:"",name:"Adegan baru",category:"umum",notes:"",loop:true,durationMs:null,stage:{width:SW,height:SH},actors:[]};
}
function newActor(gender){
 const n=S.scene.actors.length,keys=new Set(S.scene.actors.map(a=>a.key));let i=1;while(keys.has("a"+i))i++;
 return {key:"a"+i,name:(gender==="female"?"Cewek ":"Cowok ")+i,gender,skin:{tone:"light"},outfit:"none",wear:{hair:gender==="female"?"long":"short",hairColor:"brown"},
  x:n%2?24:-24,y:0,dir:n%2?"sw":"se",flip:false,layer:n,track:[{motion:"builtin:idle",ms:2000}],emosi:[]};
}
const actorBy=k=>S.scene.actors.find(a=>a.key===k);
const sel=()=>actorBy(S.sel);
function motionOptions(){
 const db=DB().all("bergerak").map(e=>({label:"✦ "+e.name,value:"bergerak:"+e.id}));
 const bi=S.lib.motions.map(m=>({label:"◇ "+m.name,value:"builtin:"+m.id}));
 return [...(db.length?[{group:"Database Bergerak",items:db}]:[]),{group:"Bawaan LGR-1",items:bi}];
}
function resolve(ref){
 const m=DB().resolveMotion(ref);if(!m)return null;
 try{return ref.startsWith("bergerak:")?DB().validateMotionLong({...m,id:ref.split(":")[1]},S.lib.poses):m}catch{return null}
}
function duration(){
 if(S.scene.durationMs)return S.scene.durationMs;
 return Math.max(40,...S.scene.actors.map(a=>a.track.reduce((n,t)=>n+t.ms,0)));
}
function touch(rebuild){S.dirty=true;if(rebuild)rebuildActor();syncScene();schedule()}
/* ---- stage rendering ---- */
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;void draw()})}
async function actorFrame(a,t){
 const ti=DB().trackAt(a,t),mo=resolve(ti.item.motion);
 const fi=mo?M().frameIndexAt(mo,ti.localMs):0,face=DB().emosiAt(a,t);
 return {img:await A().frameCanvas(a,{motion:mo,frame:fi,dir:a.dir,faceId:face?.face||"",faceMs:face?.localMs||0}),shadow:DB().shadowAt(mo,fi),missing:!mo,face};
}
function drawGround(g){
 g.fillStyle="#cdd9c4";g.fillRect(0,0,SW*Z,SH*Z);
 g.fillStyle="#e7eef5";g.fillRect(0,0,SW*Z,(GY-40)*Z);
 g.strokeStyle="rgba(60,90,60,.25)";g.lineWidth=1;
 for(let x=-SW;x<SW*2;x+=16){g.beginPath();g.moveTo((GX+x)*Z,(GY-40)*Z);g.lineTo((GX+x+ (x-0)*0.6)*Z,SH*Z);g.stroke()}
 for(let y=GY-40;y<SH;y+=8){g.beginPath();g.moveTo(0,y*Z);g.lineTo(SW*Z,y*Z);g.stroke()}
 g.strokeStyle="rgba(23,74,150,.55)";g.setLineDash([6,4]);g.beginPath();g.moveTo(0,GY*Z);g.lineTo(SW*Z,GY*Z);g.stroke();
 g.beginPath();g.moveTo(GX*Z,(GY-6)*Z);g.lineTo(GX*Z,(GY+6)*Z);g.stroke();g.setLineDash([]);
}
async function draw(){
 if(!S.ready)return;
 const ticket=++S.ticket,t=S.t,cv=S.ui.stage,g=cv.getContext("2d");
 try{
  const order=DB().drawOrder(S.scene),frames=await Promise.all(order.map(a=>actorFrame(a,t)));
  if(ticket!==S.ticket)return;
  g.imageSmoothingEnabled=false;drawGround(g);S.boxes=[];
  order.forEach((a,i)=>{
   const {img,shadow}=frames[i],x0=GX+a.x-A().FOOT.x,y0=GY+a.y-A().FOOT.y;
   if(shadow.enabled){
    g.fillStyle="rgba(0,0,0,"+(56/255)+")";
    const cx=GX+a.x+(a.flip?-shadow.x:shadow.x),cy=GY+a.y+shadow.y;
    for(let yy=Math.floor(cy-shadow.ry);yy<Math.ceil(cy+shadow.ry);yy++)
     for(let xx=Math.floor(cx-shadow.rx);xx<Math.ceil(cx+shadow.rx);xx++)
      if(((xx+.5-cx)/shadow.rx)**2+((yy+.5-cy)/shadow.ry)**2<=1)g.fillRect(xx*Z,yy*Z,Z,Z);
   }
   g.save();
   if(a.flip){g.translate((x0+64)*Z,y0*Z);g.scale(-1,1);g.drawImage(img,0,0,64*Z,112*Z)}else g.drawImage(img,x0*Z,y0*Z,64*Z,112*Z);
   g.restore();
   const alpha=img.getContext("2d").getImageData(0,0,64,112).data;
   S.boxes.push({key:a.key,x0,y0,flip:a.flip,alpha});
   if(a.key===S.sel&&!S.playing){g.strokeStyle="#e5a52d";g.lineWidth=2;g.setLineDash([5,4]);g.strokeRect((x0+18)*Z,(y0+30)*Z,28*Z,74*Z);g.setLineDash([]);
    g.fillStyle="#e5352d";g.beginPath();g.arc((GX+a.x)*Z,(GY+a.y)*Z,4,0,Math.PI*2);g.fill()}
   g.fillStyle="rgba(21,63,130,.85)";g.font="bold 11px Tahoma";g.textAlign="center";g.fillText(a.name,(GX+a.x)*Z,(y0+28)*Z);
  });
  g.fillStyle="rgba(21,63,130,.5)";g.font="10px Tahoma";g.textAlign="right";g.fillText("Beraksi · by Lafrich",SW*Z-6,SH*Z-6);
  S.ui.time.value=fmt(t)+" / "+fmt(duration());S.ui.scrub.max=String(duration());if(!S.drag)S.ui.scrub.value=String(Math.round(t));
 }catch(e){U.status("Stage: "+e.message,true)}
}
const fmt=ms=>(ms/1000).toFixed(2)+"s";
/* ---- stage interaction: drag characters ---- */
function stagePoint(e){const r=S.ui.stage.getBoundingClientRect();return [(e.clientX-r.left)/r.width*SW,(e.clientY-r.top)/r.height*SH]}
function hit(x,y){
 for(let i=S.boxes.length-1;i>=0;i--){const b=S.boxes[i];let lx=Math.floor(x-b.x0),ly=Math.floor(y-b.y0);if(b.flip)lx=63-lx;
  if(lx<0||ly<0||lx>=64||ly>=112)continue;
  // generous: any opaque pixel within 2 px
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const X=lx+dx,Y=ly+dy;if(X>=0&&Y>=0&&X<64&&Y<112&&b.alpha[(Y*64+X)*4+3])return b.key}}
 return null;
}
function onDown(e){
 const [x,y]=stagePoint(e),k=hit(x,y);
 if(k){if(k!==S.sel){S.sel=k;rebuildActors();rebuildActor()}const a=sel();S.drag={id:e.pointerId,x,y,ax:a.x,ay:a.y};S.ui.stage.setPointerCapture?.(e.pointerId);e.preventDefault()}
 schedule();
}
function onMove(e){
 const d=S.drag;if(!d||d.id!==e.pointerId)return;const [x,y]=stagePoint(e),a=sel();if(!a)return;
 a.x=Math.max(-SW,Math.min(SW,Math.round(d.ax+x-d.x)));a.y=Math.max(-GY,Math.min(SH-GY,Math.round(d.ay+y-d.y)));
 S.dirty=true;syncActorPos();schedule();
}
function onUp(e){if(S.drag?.id===e.pointerId){S.drag=null;syncScene()}}
/* ---- playback ---- */
function play(){S.playing=true;S.ui.play.textContent="■ STOP";let last=performance.now();
 const tick=now=>{if(!S.playing)return;S.t+=now-last;last=now;const D=duration();
  if(S.t>=D){if(S.scene.loop)S.t%=D;else{S.t=D-1;stop();return}}
  schedule();S.raf=requestAnimationFrame(tick)};S.raf=requestAnimationFrame(tick)}
function stop(){S.playing=false;cancelAnimationFrame(S.raf);if(S.ui.play)S.ui.play.textContent="▶ PLAY";schedule()}
/* ---- layer order ---- */
function normalizeLayers(){DB().drawOrder(S.scene).forEach((a,i)=>a.layer=i)}
function shiftLayer(delta){
 const a=sel();if(!a)return;normalizeLayers();const order=DB().drawOrder(S.scene),i=order.indexOf(a),j=i+delta;
 if(j<0||j>=order.length)return;const b=order[j];[a.layer,b.layer]=[b.layer,a.layer];touch(true);rebuildActors();
}
/* ---- scene library ---- */
function confirmLeave(){return !S.dirty||confirm("Adegan ini belum disimpan. Lanjut?")}
function openScene(e){if(!confirmLeave())return;stop();S.scene=U.clone(e);S.isNew=false;S.dirty=false;S.sel=S.scene.actors[0]?.key||null;S.t=0;rebuildAll();U.status("Membuka adegan "+e.name+".")}
function newScene(){if(!confirmLeave())return;stop();S.scene=blankScene();S.isNew=true;S.dirty=false;S.t=0;
 S.scene.actors.push(newActor("male"));S.scene.actors.push(newActor("female"));S.sel="a1";rebuildAll();U.status("Adegan baru: 2 karakter. Drag buat geser, atur animasi & Emosi di panel.")}
async function save(asNew){
 const e=U.clone(S.scene);e.name=String(S.ui.name.value||"").trim()||"Adegan";e.category=String(S.ui.cat.value||"").trim()||"umum";
 let overwrite=false;
 if(S.isNew||asNew||!e.id){
  let r0=U.resolveName(asNew?{...e,id:""}:e,DB().all("beraksi"),[],"adegan");
  if(asNew&&r0.overwrite)r0=U.resolveName({...e,id:"",name:e.name+" copy"},DB().all("beraksi"),[],"adegan");
  Object.assign(e,r0.entry);overwrite=asNew?false:r0.overwrite;
 }
 // strict: every animation and Emosi must exist, schema must pass → otherwise nothing is saved
 DB().validateBeraksi({...e,rev:1,updated:new Date().toISOString()});
 const refErr=root.LGRImport.checkRefs(e,knownMotions(),A().faces);
 if(refErr.length)throw Error("Belum bisa disimpan: "+refErr.slice(0,3).join(" · ")+(refErr.length>3?" (+"+(refErr.length-3)+")":""));
 U.status("Menyimpan adegan "+e.name+"…");
 const r=await DB().save("beraksi",e,{overwrite});S.scene=U.clone(r.entry);S.isNew=false;S.dirty=false;rebuildAll();
 U.status((r.synced?"✓ ADEGAN TERSIMPAN DI CLOUD · ":"✓ TERSIMPAN (offline, sync nanti) · ")+r.entry.name+" · id "+r.entry.id+" · rev "+r.entry.rev);
}
function knownMotions(){
 const out={};
 for(const m of S.lib.motions)out["builtin:"+m.id]={name:m.name,duration:M().duration(m)};
 for(const e of DB().all("bergerak"))out["bergerak:"+e.id]={name:e.name,duration:e.motion.frames.reduce((n,f)=>n+f.ms,0)};
 return out;
}
function importJson(){
 U.importDialog({title:"↑ IMPORT JSON · ADEGAN (Beraksi)",
  check:(t,pick)=>root.LGRImport.normalizeBeraksi(t,{motions:knownMotions(),faces:A().faces,opt:root.LGRWear?.OPT,pick}),
  hint:"Format: lgr1-beraksi-v1 (docs/BERAKSI_FORMAT.md). Animasi harus ada di Bergerak/bawaan, Emosi harus ada di Emosi.exe.",
  open:(e,r)=>{if(!confirmLeave())return;stop();S.scene=e;S.isNew=true;S.dirty=true;S.t=0;S.sel=e.actors[0]?.key||null;rebuildAll();
   U.status("IMPOR dibuka: "+e.actors.length+" karakter"+(r.fixes.length?" · "+r.fixes.length+" perbaikan otomatis":"")+" · cek ▶ PLAY, edit kalau perlu, lalu ☁ SIMPAN.")}});
}
function exportJson(){
 const e=U.clone(S.scene);e.name=String(S.ui.name.value||"").trim()||"Adegan";e.category=String(S.ui.cat.value||"").trim()||"umum";if(!e.id)e.id=DB().slug(e.name);
 const v=DB().validateBeraksi({...e,rev:S.scene.rev||1,updated:S.scene.updated||new Date().toISOString()});
 U.exportDialog("↓ EXPORT JSON · "+v.name,"beraksi-"+v.id+".json",v);
}
async function removeScene(){
 if(S.isNew)return;if(!confirm("Hapus adegan '"+S.scene.name+"'? File Drive dipindah ke Backup."))return;
 await DB().remove("beraksi",S.scene.id);S.dirty=false;newScene();U.status("Adegan dihapus (backup di Drive).");
}
/* ---- UI ---- */
function rebuildList(){
 const box=S.ui.list;box.replaceChildren();const cur=S.isNew?"":S.scene.id;
 const all=DB().all("beraksi");
 if(!all.length)box.append(el("div",{class:"it",text:"Belum ada adegan di database."}));
 for(const e of all)box.append(el("div",{class:"it","aria-selected":String(e.id===cur),onclick:()=>openScene(e)},"⚔ ",e.name,el("small",{text:e.category+" · "+e.actors.length+" karakter"})));
}
function rebuildActors(){
 const box=S.ui.actors;box.replaceChildren();
 const order=DB().drawOrder(S.scene).slice().reverse(); // front first
 for(const a of order)box.append(el("div",{class:"it","aria-selected":String(a.key===S.sel),onclick:()=>{S.sel=a.key;rebuildActors();rebuildActor();schedule()}},
  a.gender==="female"?"♀ ":"♂ ",a.name,el("small",{text:"lapis "+(a.layer+1)+(a.flip?" · flip":"")+" · "+a.dir.toUpperCase()})));
}
function syncActorPos(){if(S.ui.ax){const a=sel();if(a){S.ui.ax.value=String(a.x);S.ui.ay.value=String(a.y)}}}
function syncScene(){
 S.ui.saveState.textContent=S.isNew?"BARU · belum disimpan":(S.dirty?"● belum disimpan":"✓ tersimpan · rev "+(S.scene.rev||1));
 S.ui.saveState.className="sa-tag"+(S.dirty||S.isNew?" warn":"");S.ui.del.disabled=S.isNew;
 S.ui.loop.checked=S.scene.loop!==false;S.ui.dur.value=S.scene.durationMs?String(S.scene.durationMs):"";S.ui.dur.placeholder="auto "+duration();
}
function trackRow(a,i){
 const t=a.track[i];
 const s=U.select(motionOptions(),t.motion,v=>{t.motion=v;const m=resolve(v);if(m)t.ms=Math.max(t.ms,40);touch()});
 const ms=el("input",{type:"number",min:40,step:100,value:t.ms,title:"durasi (ms)",onchange:()=>{t.ms=Math.max(40,Math.round(num(ms.value))||1000);touch()}});
 const mo=resolve(t.motion);
 return el("div",{class:"row"},el("b",{text:(i+1)+"."}),s,ms,el("span",{class:"sa-hint",text:"ms"}),
  el("button",{type:"button",text:"1×",title:"Durasi = 1 putaran animasi",onclick:()=>{const m=resolve(t.motion);if(m){t.ms=M().duration(m);touch(true)}}}),
  el("button",{type:"button",text:"↑",onclick:()=>{if(i>0){[a.track[i-1],a.track[i]]=[a.track[i],a.track[i-1]];touch(true)}}}),
  el("button",{type:"button",text:"↓",onclick:()=>{if(i<a.track.length-1){[a.track[i+1],a.track[i]]=[a.track[i],a.track[i+1]];touch(true)}}}),
  el("button",{type:"button",class:"danger",text:"✕",onclick:()=>{if(a.track.length>1){a.track.splice(i,1);touch(true)}else U.status("Minimal 1 animasi per karakter.",true)}}),
  mo?null:el("span",{class:"sa-tag warn",text:"animasi hilang"}));
}
function emosiRow(a,i){
 const f=a.emosi[i],faces=A().facesFor(a.gender);
 const opts=[{label:"(tanpa emosi)",value:""},...faces.map(x=>({label:x.label.replace(" / EMOSI.EXE",""),value:x.id}))];
 if(f.face&&!faces.some(x=>x.id===f.face))opts.push({label:f.face+" (tidak ada di Emosi)",value:f.face});
 const s=U.select(opts,f.face,v=>{f.face=v;touch()});
 const st=el("input",{type:"number",min:0,step:100,value:f.startMs,title:"mulai (ms)",onchange:()=>{f.startMs=Math.max(0,Math.round(num(st.value)));touch()}});
 const ms=el("input",{type:"number",min:40,step:100,value:f.ms,title:"durasi (ms)",onchange:()=>{f.ms=Math.max(40,Math.round(num(ms.value))||1000);touch()}});
 return el("div",{class:"row"},el("b",{text:"☺"}),s,el("span",{class:"sa-hint",text:"mulai"}),st,el("span",{class:"sa-hint",text:"selama"}),ms,
  el("button",{type:"button",text:"@now",title:"Mulai di waktu sekarang",onclick:()=>{f.startMs=Math.round(S.t);touch(true)}}),
  el("button",{type:"button",class:"danger",text:"✕",onclick:()=>{a.emosi.splice(i,1);touch(true)}}));
}
function rebuildActor(){
 const box=S.ui.actor,a=sel();box.replaceChildren();
 if(!a){box.append(el("p",{class:"sa-hint",text:"Tambah karakter dulu (＋ COWOK / ＋ CEWEK)."}));return}
 const name=el("input",{type:"text",class:"grow",value:a.name,maxLength:40,oninput:()=>{a.name=name.value;S.dirty=true;rebuildActorsSoon();schedule()}});
 const tones=el("div",{class:"sa-tones"});
 for(const t of root.LGRSkin.TONE_ORDER)tones.append(el("button",{type:"button",title:t,"aria-pressed":String(a.skin.tone===t),style:"background:"+root.LGRSkin.TONES[t].i+";border-bottom-color:"+root.LGRSkin.TONES[t]["7"],onclick:()=>{a.skin={tone:t};touch(true)}}));
 const gender=U.select([{label:"♂ Cowok (base male)",value:"male"},{label:"♀ Cewek (base female)",value:"female"}],a.gender,v=>{a.gender=v;touch(true);rebuildActors()});
 const official=S.bases?.[a.gender];
 const approved=(group)=>new Set(DB().all("pakaian").filter(e=>e.group===group&&e.gender===a.gender&&e.approved&&e.baseVersion===official?.version&&e.baseRigSha256===official?.pkg?.rigSha256).map(e=>e.variant));
 const available=Object.entries(A().OUTFITS).filter(([k,o])=>k==="none"||k==="custom"||
   (approved("top").has(o.top)&&approved("pants").has(o.pants)&&approved("shoes").has(o.shoes)));
 const outfit=U.select(available.map(([k,o])=>({label:o.label,value:k})),available.some(([k])=>k===a.outfit)?a.outfit:"none",v=>{a.outfit=v;if(v==="custom")a.wear={top:"nude",pants:"nude",shoes:"nude",...(a.wear||{})};touch(true)});
 const V=root.LGRWear,w=a.wear||(a.wear={});
 const pick=(k,list,label)=>U.select(list.map(v=>({label:label+": "+v,value:v})),w[k]||list[0],v=>{w[k]=v;touch()});
 const custom=a.outfit==="custom"&&V?el("div",{class:"sa-row"},
  pick("top",["nude",...approved("top")],"atasan"),pick("topColor",V.OPT.topColor,"warna"),
  pick("pants",["nude",...approved("pants")],"celana"),pick("pantsColor",V.OPT.pantsColor,"warna"),
  pick("shoes",["nude",...approved("shoes")],"sepatu"),pick("shoesColor",V.OPT.shoesColor,"warna")):null;
 const hair=U.select(A().HAIRS.map(h=>({label:h==="none"?"tanpa rambut":"rambut "+h,value:h})),w.hair||"none",v=>{w.hair=v;touch()});
 const hairColor=V?U.select(V.OPT.hairColor.map(c=>({label:"warna rambut: "+c,value:c})),w.hairColor||"brown",v=>{w.hairColor=v;touch()}):null;
 const dirs=el("div",{class:"sa-row"},el("span",{class:"sa-hint",text:"hadap"}),...DIRS.map(d=>el("button",{type:"button","aria-pressed":String(a.dir===d),text:d.toUpperCase(),onclick:()=>{a.dir=d;touch(true)}})),
  el("button",{type:"button",id:"bx-flip","aria-pressed":String(a.flip),text:"⇋ FLIP",onclick:()=>{a.flip=!a.flip;touch(true);rebuildActors()}}));
 S.ui.ax=el("input",{type:"number",value:a.x,onchange:()=>{a.x=Math.round(num(S.ui.ax.value));touch()}});
 S.ui.ay=el("input",{type:"number",value:a.y,onchange:()=>{a.y=Math.round(num(S.ui.ay.value));touch()}});
 const layer=el("div",{class:"sa-row"},el("button",{type:"button",id:"bx-front",text:"▲ KE DEPAN",onclick:()=>shiftLayer(1)}),el("button",{type:"button",id:"bx-back",text:"▼ KE BELAKANG",onclick:()=>shiftLayer(-1)}),
  el("label",{},"x",S.ui.ax),el("label",{},"y",S.ui.ay));
 const track=el("div",{class:"sa-track"},...a.track.map((_,i)=>trackRow(a,i)));
 const addAnim=el("button",{type:"button",id:"bx-addanim",text:"＋ ANIMASI",onclick:()=>{if(a.track.length>=24)return;a.track.push({motion:"builtin:idle",ms:1000});touch(true)}});
 const emosi=el("div",{class:"sa-track"},...a.emosi.map((_,i)=>emosiRow(a,i)));
 const addEmo=el("button",{type:"button",id:"bx-addemosi",text:"＋ EMOSI",onclick:()=>{const prev=a.emosi[a.emosi.length-1];a.emosi.push({face:A().facesFor(a.gender)[0]?.id||"",startMs:prev?prev.startMs+prev.ms:0,ms:1500});touch(true)}});
 const total=a.track.reduce((n,t)=>n+t.ms,0);
 box.append(...[el("div",{class:"sa-row"},name,el("button",{type:"button",class:"danger",text:"🗑",title:"Hapus karakter",onclick:()=>{S.scene.actors=S.scene.actors.filter(x=>x!==a);S.sel=S.scene.actors[0]?.key||null;touch(true);rebuildActors()}})),
  el("div",{class:"sa-row"},gender,tones),el("div",{class:"sa-row"},outfit,hair,hairColor),custom,dirs,layer,
  el("h4",{style:"margin:8px 0 4px;font-size:11px;color:#153f82",text:"ANIMASI (berurutan) · total "+fmt(total)}),track,el("div",{class:"sa-row"},addAnim),
  el("h4",{style:"margin:8px 0 4px;font-size:11px;color:#153f82",text:"EMOSI (muka) · "+A().facesFor(a.gender).length+" tersedia"}),emosi,el("div",{class:"sa-row"},addEmo,
   el("span",{class:"sa-hint",text:"Muka di bawah poni; tidak kelihatan pas hadap belakang (NE/NW)."}))].filter(Boolean));
}
let actorsTimer=0;function rebuildActorsSoon(){clearTimeout(actorsTimer);actorsTimer=setTimeout(rebuildActors,250)}
function rebuildAll(){S.ui.name.value=S.scene.name;S.ui.cat.value=S.scene.category||"umum";rebuildList();rebuildActors();rebuildActor();syncScene();schedule()}
function build(panel){
 const ui=S.ui;
 ui.stage=el("canvas",{width:SW*Z,height:SH*Z,id:"bx-stage","aria-label":"Panggung adegan: drag karakter"});
 ui.stage.addEventListener("pointerdown",onDown);ui.stage.addEventListener("pointermove",onMove);ui.stage.addEventListener("pointerup",onUp);ui.stage.addEventListener("pointercancel",onUp);
 ui.play=el("button",{type:"button",class:"primary",id:"bx-play",text:"▶ PLAY",onclick:()=>S.playing?stop():play()});
 ui.scrub=el("input",{type:"range",min:0,max:1000,step:10,value:0,id:"bx-scrub",oninput:()=>{if(S.playing)stop();S.t=num(ui.scrub.value);schedule()}});
 ui.time=el("output",{});
 ui.loop=el("input",{type:"checkbox",onchange:()=>{S.scene.loop=ui.loop.checked;touch()}});
 ui.dur=el("input",{type:"number",min:40,step:100,id:"bx-dur",title:"kosong = otomatis (animasi terpanjang)",onchange:()=>{const v=Math.round(num(ui.dur.value));S.scene.durationMs=v>=40?v:null;touch()}});
 const timeBox=el("div",{class:"sa-box"},el("div",{class:"sa-time"},ui.play,el("button",{type:"button",text:"⏮",onclick:()=>{S.t=0;schedule()}}),ui.scrub,ui.time),
  el("div",{class:"sa-row"},el("label",{},ui.loop,"loop"),el("label",{},"durasi adegan",ui.dur,"ms")));
 ui.name=el("input",{type:"text",class:"grow",id:"bx-name",maxLength:60,placeholder:"Nama adegan",oninput:()=>{S.dirty=true;syncScene()}});
 ui.cat=el("input",{type:"text",id:"bx-cat",maxLength:30,placeholder:"kategori (ngobrol, berantem…)",style:"width:130px",oninput:()=>{S.dirty=true;syncScene()}});
 ui.saveState=el("span",{class:"sa-tag"});
 ui.del=el("button",{type:"button",class:"danger",text:"🗑 HAPUS",onclick:U.guard(removeScene)});
 ui.list=el("div",{class:"sa-list",id:"bx-list"});
 const libBox=el("div",{class:"sa-box"},el("h3",{text:"DATABASE ADEGAN"}),el("div",{class:"sa-row"},ui.name,ui.cat),
  el("div",{class:"sa-row"},el("button",{type:"button",class:"primary",id:"bx-save",text:"☁ SIMPAN",onclick:U.guard(()=>save(false))}),
   el("button",{type:"button",text:"⧉ SIMPAN SEBAGAI BARU",onclick:U.guard(()=>save(true))}),el("button",{type:"button",id:"bx-new",text:"＋ BARU",onclick:newScene}),ui.del,ui.saveState),
  el("div",{class:"sa-row"},el("button",{type:"button",id:"bx-import",text:"↑ IMPORT JSON",onclick:importJson}),el("button",{type:"button",id:"bx-export",text:"↓ EXPORT JSON",onclick:U.guard(exportJson)})),ui.list);
 ui.actors=el("div",{class:"sa-list sa-actors",id:"bx-actors"});
 const castBox=el("div",{class:"sa-box"},el("h3",{text:"KARAKTER (atas = paling depan)"}),
  el("div",{class:"sa-row"},el("button",{type:"button",id:"bx-addm",text:"＋ COWOK",onclick:()=>addActor("male")}),el("button",{type:"button",id:"bx-addf",text:"＋ CEWEK",onclick:()=>addActor("female")}),
   el("button",{type:"button",text:"⧉ DUPLIKAT",onclick:()=>{const a=sel();if(!a)return;const b=U.clone(a),n=newActor(a.gender);b.key=n.key;b.name=a.name+" 2";b.x+=16;b.layer=S.scene.actors.length;addActor(null,b)}})),ui.actors);
 ui.actor=el("div",{id:"bx-actor"});
 const actorBox=el("div",{class:"sa-box"},el("h3",{text:"KARAKTER TERPILIH"}),ui.actor);
 const stageCol=el("div",{class:"sa-stagecol"},el("div",{class:"sa-canvaswrap"},ui.stage),timeBox,
  el("p",{class:"sa-hint",text:"Drag karakter di panggung buat geser. Titik merah = kaki (anchor). Garis biru putus-putus = tanah (y 0), tengah = x 0."}));
 panel.replaceChildren(el("div",{class:"sa-wrap"},stageCol,el("div",{class:"sa-side"},libBox,castBox,actorBox)));
 const resize=()=>{ui.stage.style.width=Math.max(240,Math.floor(Math.min(stageCol.clientWidth-12,SW*Z)))+"px"};root.addEventListener("resize",resize);setTimeout(resize,0);
}
function addActor(gender,given){
 if(S.scene.actors.length>=DB().MAX_ACTORS){U.status("Maksimal "+DB().MAX_ACTORS+" karakter.",true);return}
 const a=given||newActor(gender);S.scene.actors.push(a);S.sel=a.key;touch(true);rebuildActors();
}
async function init(panel){
 if(S.ready){rebuildList();rebuildActor();schedule();return}
 U.status("Beraksi: memuat base, animasi, Emosi…");
 S.lib=await A().motions();await DB().loadBuiltin();DB().setPoses(S.lib.poses);S.bases=await A().loadBases();await A().refreshFaces().catch(()=>[]);
 build(panel);S.ready=true;S.isNew=true;S.scene=blankScene();S.scene.actors.push(newActor("male"));S.scene.actors.push(newActor("female"));S.sel="a1";S.dirty=false;rebuildAll();
 root.addEventListener("lgr-db-synced",()=>{if(S.ready){rebuildList();rebuildActor()}});
 root.addEventListener("lgr-db-changed",()=>{if(S.ready)rebuildActor()});
 U.status("Beraksi siap: "+A().faces.length+" Emosi · drag karakter, atur animasi/Emosi, ▶ PLAY, ☁ SIMPAN.");
}
root.MahlukBeraksi=Object.freeze({importJson,exportJson,knownMotions,init,get state(){return S},save,newScene,openScene,play,stop});
})(window);
