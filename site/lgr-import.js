/* LGR-1 IMPORT — turns JSON from other apps / AI into valid Bergerak
 * (lgr1-bergerak-v1) or Beraksi (lgr1-beraksi-v1) entries.
 * normalize*(input, ctx) → {entry|null, fixes:[…], errors:[…], candidates?}
 *  - fixes  = trivial things repaired automatically (Indonesian, with field path)
 *  - errors = anything that would change meaning → the save is BLOCKED
 * The final gate is always LGRDB.validate* (the same strict check the cloud
 * database runs on every save and sync). Formats: docs/BERGERAK_FORMAT.md,
 * docs/BERAKSI_FORMAT.md. Pure; runs in node (tests/test_lgr_import.cjs).
 */
(function(root,factory){"use strict";const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root&&root.document)root.LGRImport=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(root){
"use strict";
const DB=()=>root?.LGRDB||(typeof require==="function"?require("./lgr-db.js"):null);
const ANAT=["head","torso","pelvis","arm_r_upper","arm_r_lower","arm_l_upper","arm_l_lower","leg_r_upper","leg_r_lower","leg_l_upper","leg_l_lower"];
const DIRS=["se","sw","ne","nw"];
const TONES=["porcelain","light","tan","medium","brown","deep"];
const HAIRS=["none","short","swept","mid_curtain","mid","wavy","wavy_curtain","long","long_curtain"];
const OUTFITS=["none","tee_trousers","shirt_tie_baggy","cardigan_ripped","custom"];
// rig piece names as seen in the SE view (near = right)
const PIECE={arm_near_upper:"arm_r_upper",arm_near_lower:"arm_r_lower",arm_far_upper:"arm_l_upper",arm_far_lower:"arm_l_lower",
 leg_near_upper:"leg_r_upper",leg_near_lower:"leg_r_lower",leg_far_upper:"leg_l_upper",leg_far_lower:"leg_l_lower"};
function jointName(raw){
 const k0=String(raw||"");if(ANAT.includes(k0))return {name:k0,fixed:false};
 if(PIECE[k0])return {name:PIECE[k0],fixed:true};
 let k=k0.replace(/([a-z])([A-Z])/g,"$1_$2").toLowerCase().replace(/[^a-z]+/g,"_").replace(/^_|_$/g,"");
 if(ANAT.includes(k))return {name:k,fixed:true};
 const t=new Set(k.split("_"));
 const side=t.has("r")||t.has("right")||t.has("kanan")?"r":t.has("l")||t.has("left")||t.has("kiri")?"l":"";
 const has=(...w)=>w.some(x=>t.has(x));
 if(has("head","kepala","neck","leher","skull"))return {name:"head",fixed:true};
 if(has("torso","chest","spine","body","badan","dada","upperbody","upper_body"))return {name:"torso",fixed:true};
 if(has("pelvis","hip","hips","pinggul","root","waist","pinggang"))return {name:"pelvis",fixed:true};
 const lower=has("lower","forearm","bawah","elbow","siku","shin","calf","betis","knee","lutut","lowerarm","lowerleg");
 const upper=has("upper","atas","shoulder","bahu","thigh","paha","upperarm","upperleg");
 if(side&&has("arm","lengan","forearm","upperarm","lowerarm","shoulder","bahu","elbow","siku"))return {name:"arm_"+side+"_"+(lower?"lower":"upper"),fixed:true};
 if(side&&has("leg","kaki","thigh","paha","shin","calf","betis","knee","lutut","upperleg","lowerleg"))return {name:"leg_"+side+"_"+(lower&&!upper?"lower":upper?"upper":lower?"lower":"upper"),fixed:true};
 if(side&&has("forearm"))return {name:"arm_"+side+"_lower",fixed:true};
 return null;
}
const isObj=v=>v&&typeof v==="object"&&!Array.isArray(v);
const numOk=v=>typeof v==="number"&&Number.isFinite(v)||typeof v==="string"&&v.trim()!==""&&Number.isFinite(Number(v));
function parseInput(text){
 if(typeof text!=="string")return {value:text};
 let s=text.trim().replace(/^```(?:json)?\s*/i,"").replace(/```\s*$/,"").trim(); // AI chat code fences
 if(!s)return {error:"JSON kosong. Paste isi file atau pilih file .json."};
 try{return {value:JSON.parse(s)}}catch(e){
  // common AI glitches: trailing commas, smart quotes
  const t=s.replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/,\s*([}\]])/g,"$1");
  try{return {value:JSON.parse(t),fix:"JSON diperbaiki: koma di akhir / tanda kutip miring dihapus."}}
  catch{return {error:"Bukan JSON yang valid: "+e.message}}
 }
}
function unwrap(v,fixes){
 if(isObj(v)&&v.schema==="lgr1-db-file-v1"&&isObj(v.entry)){fixes.push("File Drive (lgr1-db-file-v1) → isi 'entry' dipakai.");return v.entry}
 if(isObj(v)&&isObj(v.data)&&!v.frames&&!v.actors){fixes.push("Isi 'data' dipakai.");return v.data}
 return v;
}
/* ---------------- Bergerak ---------------- */
function candidatesOf(v){
 if(Array.isArray(v))return v;
 if(isObj(v)&&Array.isArray(v.motions))return v.motions;
 if(isObj(v)&&Array.isArray(v.bergerak))return v.bergerak;
 if(isObj(v)&&Array.isArray(v.animations))return v.animations;
 return null;
}
function normalizeBergerak(input,ctx={}){
 const fixes=[],errors=[],p=parseInput(input);
 if(p.error)return {entry:null,fixes,errors:[p.error]};
 if(p.fix)fixes.push(p.fix);
 let v=unwrap(p.value,fixes);
 const list=candidatesOf(v);
 if(list){
  if(!list.length)return {entry:null,fixes,errors:["Daftar animasi kosong."]};
  const i=Math.max(0,Math.min(list.length-1,ctx.pick|0));
  if(list.length>1)fixes.push("File berisi "+list.length+" animasi; yang dibuka: #"+(i+1)+" ("+(list[i]?.name||list[i]?.id||"tanpa nama")+"). Pilih yang lain di daftar.");
  const r=normalizeBergerak(list[i],ctx);r.fixes.unshift(...fixes);r.candidates=list.map((m,j)=>({index:j,label:String(m?.name||m?.id||"animasi "+(j+1))}));return r;
 }
 if(!isObj(v))return {entry:null,fixes,errors:["Isi JSON harus object animasi ({ \"frames\": [...] })."]};
 let m=v;
 if(v.format==="lgr1-bergerak-v1"){if(!isObj(v.motion))return {entry:null,fixes,errors:["motion: tidak ada. lgr1-bergerak-v1 butuh field \"motion\" berisi frames."]};m={...v.motion}}
 else if(v.format&&v.format!=="lgr1-motion-v1")errors.push("format: '"+v.format+"' bukan lgr1-bergerak-v1 / lgr1-motion-v1.");
 else fixes.push("Animasi mentah (frames) dibungkus jadi lgr1-bergerak-v1.");
 const poses=ctx.poses||{neutral:{}};
 // frames
 let frames=m.frames??m.keyframes??m.frame;
 if(frames!==undefined&&m.frames===undefined)fixes.push("'"+(m.keyframes?"keyframes":"frame")+"' dibaca sebagai frames.");
 if(!Array.isArray(frames)||!frames.length){errors.push("frames: wajib ada, minimal 1 frame (array).");frames=[]}
 const max=DB().MAX_FRAMES;
 if(frames.length>max)errors.push("frames: "+frames.length+" frame, maksimal "+max+".");
 // angle units
 const unit=String(m.angleUnit||m.units||m.unit||"").toLowerCase();
 const allA=[];
 const fps=numOk(m.fps)?Number(m.fps):0;
 const out=frames.slice(0,max).map((f,i)=>{
  const at="frames["+i+"]";
  if(!isObj(f)){errors.push(at+": harus object { ms, parts }.");return {ms:150,parts:{}}}
  // duration
  let ms=f.ms??f.duration??f.durationMs??f.time??f.delay;
  if(f.ms===undefined&&ms!==undefined)fixes.push(at+": durasi dibaca dari '"+["duration","durationMs","time","delay"].find(k=>f[k]!==undefined)+"'.");
  if(ms===undefined&&fps){ms=Math.round(1000/fps);if(i===0)fixes.push("ms tiap frame dihitung dari fps "+fps+" = "+ms+" ms.")}
  if(ms===undefined){ms=150;fixes.push(at+".ms: tidak ada → 150 ms.")}
  if(!numOk(ms)){errors.push(at+".ms: '"+ms+"' bukan angka (40–2000 ms).");ms=150}
  ms=Number(ms);
  if(ms>0&&ms<=10&&!Number.isInteger(ms)||ms>0&&ms<=5&&String(m.timeUnit||"").startsWith("s")){fixes.push(at+".ms: "+ms+" kelihatan detik → "+Math.round(ms*1000)+" ms.");ms=Math.round(ms*1000)}
  if(!Number.isInteger(ms)){fixes.push(at+".ms: "+ms+" dibulatkan → "+Math.round(ms)+".");ms=Math.round(ms)}
  if(ms<40||ms>2000)errors.push(at+".ms: "+ms+" di luar 40–2000 ms.");
  const parts=normalizePose(f.parts??f.pose??f.joints??f.bones,at+".parts",fixes,errors,allA,f.parts===undefined);
  const fr={ms,parts};
  // Preserve optional authored shadow, validation happens in LGRDB.
  if(f.shadow!==undefined)fr.shadow=f.shadow;
  if(f.behindTorso!==undefined){
   const b=Array.isArray(f.behindTorso)?f.behindTorso:[];const ok=[];
   for(const x of b){const j=jointName(x);if(j&&!["head","torso","pelvis"].includes(j.name))ok.push(j.name);else fixes.push(at+".behindTorso: '"+x+"' diabaikan (cuma lengan/kaki).")}
   if(ok.length)fr.behindTorso=[...new Set(ok)];
  }
  if(f.dirs!==undefined){
   if(!isObj(f.dirs))errors.push(at+".dirs: harus object {se|sw|ne|nw: {...}}.");
   else{const d={};for(const [k,pv] of Object.entries(f.dirs)){const dk=String(k).toLowerCase();
    if(!DIRS.includes(dk)){errors.push(at+".dirs."+k+": arah tidak dikenal (pakai se, sw, ne, nw).");continue}
    if(dk!==k)fixes.push(at+".dirs."+k+" → "+dk+".");
    const pp=normalizePose(pv,at+".dirs."+dk,fixes,errors,allA,false);if(Object.keys(pp).length)d[dk]=pp}
    if(Object.keys(d).length)fr.dirs=d}
  }
  return fr;
 });
 // radians?
 const rad=unit.startsWith("rad")||(!unit&&allA.length&&allA.every(o=>Math.abs(o.v.a)<=6.3)&&allA.some(o=>o.v.a!==0&&!Number.isInteger(o.v.a)));
 if(rad){for(const o of allA)o.v.a=Math.round(o.v.a*180/Math.PI);fixes.push("Sudut kelihatan radian → dikonversi ke derajat ("+allA.length+" nilai).")}
 for(const o of allA){
  if(!Number.isInteger(o.v.a)){o.v.a=Math.round(o.v.a)}
  if(Math.abs(o.v.a)>360)errors.push(o.at+".a: "+o.v.a+"° di luar -360…360.");
  for(const k of ["x","y"])if(Math.abs(o.v[k]||0)>32)errors.push(o.at+"."+k+": "+o.v[k]+" px di luar -32…32.");
 }
 const source=String(m.source||"neutral");
 if(!poses[source])errors.push("source: pose dasar '"+source+"' tidak ada (pakai: "+Object.keys(poses).join(", ")+").");
 let snapStep=Number(m.angleSnap??5);
 if(!DB().validateMotionLong||![1,5,10,15,30,45,90].includes(snapStep)){fixes.push("angleSnap: '"+m.angleSnap+"' → 1 (tanpa pembulatan).");snapStep=1}
 if(m.angleSnap===undefined)fixes.push("angleSnap: tidak ada → 5°.");
 const name=String(v.name||m.name||m.id||v.id||"Animasi impor").slice(0,60);
 if(!v.name&&!m.name)fixes.push("name: tidak ada → '"+name+"'.");
 let id=String(v.id||m.id||"");
 if(!/^[a-z0-9_]{1,40}$/.test(id)){const s=DB().slug(id||name);if(id)fixes.push("id: '"+id+"' → '"+s+"' (huruf kecil, angka, _).");id=s}
 const entry={format:"lgr1-bergerak-v1",id,name,category:String(v.category||m.category||"impor").slice(0,30),notes:String(v.notes||m.notes||m.description||"").slice(0,500),
  basedOn:v.basedOn||null,preview:{gender:v.preview?.gender==="female"?"female":"male"},
  motion:{source,angleSnap:snapStep,loop:m.loop!==false&&m.loop!=="false",frames:out}};
 if(errors.length)return {entry:null,fixes,errors};
 try{DB().validateBergerak({...entry,rev:1,updated:new Date().toISOString()},poses)}catch(e){errors.push("Validasi akhir: "+e.message)}
 return {entry:errors.length?null:entry,fixes,errors};
}
function normalizePose(p,at,fixes,errors,allA,aliasNote){
 const out={};if(p===undefined)return out;
 if(aliasNote&&p!==undefined)fixes.push(at+": dibaca dari pose/joints/bones.");
 if(Array.isArray(p)){ // [{name, angle}] style
  const o={};for(const it of p){if(isObj(it)&&(it.name||it.joint||it.bone))o[it.name||it.joint||it.bone]=it;else errors.push(at+": item tanpa nama sendi.")}
  fixes.push(at+": daftar sendi diubah jadi object.");p=o;
 }
 if(!isObj(p)){errors.push(at+": harus object {nama_sendi: {a, x, y}}.");return out}
 for(const [k,raw] of Object.entries(p)){
  const j=jointName(k);
  if(!j){errors.push(at+": nama sendi '"+k+"' tidak dikenal. Pakai: "+ANAT.join(", ")+".");continue}
  if(j.fixed)fixes.push(at+": '"+k+"' → "+j.name+".");
  let v=raw;
  if(numOk(v)){v={a:Number(v)};fixes.push(at+"."+j.name+": angka → {a:"+v.a+"}.")}
  if(!isObj(v)){errors.push(at+"."+j.name+": harus {a, x, y} atau angka sudut.");continue}
  const a=v.a??v.angle??v.rotation??v.rot??v.r??v.deg,x=v.x??v.dx??0,y=v.y??v.dy??0;
  if(v.a===undefined&&a!==undefined)fixes.push(at+"."+j.name+": sudut dibaca dari '"+["angle","rotation","rot","r","deg"].find(q=>v[q]!==undefined)+"'.");
  const val={};
  for(const [kk,vv] of [["a",a??0],["x",x],["y",y]]){if(!numOk(vv)){errors.push(at+"."+j.name+"."+kk+": '"+vv+"' bukan angka.");continue}val[kk]=Number(vv)}
  for(const kk of ["x","y"])if(val[kk]!==undefined&&!Number.isInteger(val[kk]))val[kk]=Math.round(val[kk]);
  const clean={};if(val.a)clean.a=val.a;if(val.x)clean.x=val.x;if(val.y)clean.y=val.y;
  if(out[j.name])fixes.push(at+": sendi "+j.name+" muncul 2× → yang terakhir dipakai.");
  out[j.name]=clean;allA.push({v:clean,at:at+"."+j.name});
  if(clean.a===undefined)clean.a=0;
 }
 // drop zero-angle placeholders after unit handling: keep a:0 (harmless)
 return out;
}
/* ---------------- Beraksi ---------------- */
const GENDER={male:"male",m:"male",pria:"male",cowok:"male",laki:"male",man:"male",boy:"male",cowo:"male",female:"female",f:"female",wanita:"female",cewek:"female",perempuan:"female",woman:"female",girl:"female",cewe:"female"};
function normalizeBeraksi(input,ctx={}){
 const fixes=[],errors=[],p=parseInput(input);
 if(p.error)return {entry:null,fixes,errors:[p.error]};
 if(p.fix)fixes.push(p.fix);
 let v=unwrap(p.value,fixes);
 if(Array.isArray(v)||isObj(v)&&Array.isArray(v.scenes)){const list=Array.isArray(v)?v:v.scenes;const i=Math.max(0,Math.min(list.length-1,ctx.pick|0));
  if(!list.length)return {entry:null,fixes,errors:["Daftar adegan kosong."]};
  const r=normalizeBeraksi(list[i],ctx);if(list.length>1)r.fixes.unshift("File berisi "+list.length+" adegan; yang dibuka #"+(i+1)+".");
  r.candidates=list.map((s,j)=>({index:j,label:String(s?.name||s?.id||"adegan "+(j+1))}));return r}
 if(!isObj(v))return {entry:null,fixes,errors:["Isi JSON harus object adegan ({ \"actors\": [...] })."]};
 if(v.format&&v.format!=="lgr1-beraksi-v1")errors.push("format: '"+v.format+"' bukan lgr1-beraksi-v1.");
 if(!v.format)fixes.push("format: tidak ada → lgr1-beraksi-v1.");
 let actors=v.actors??v.characters??v.karakter??v.cast;
 if(v.actors===undefined&&actors!==undefined)fixes.push("'"+["characters","karakter","cast"].find(k=>v[k]!==undefined)+"' dibaca sebagai actors.");
 if(!Array.isArray(actors)||!actors.length){errors.push("actors: wajib ada, 1–"+DB().MAX_ACTORS+" karakter.");actors=[]}
 if(actors.length>DB().MAX_ACTORS)errors.push("actors: "+actors.length+" karakter, maksimal "+DB().MAX_ACTORS+".");
 const known=ctx.motions||{},faces=ctx.faces||[];
 const keys=new Set();
 const outA=actors.slice(0,DB().MAX_ACTORS).map((a,i)=>{
  const at="actors["+i+"]";if(!isObj(a)){errors.push(at+": harus object karakter.");return null}
  let key=String(a.key||a.id||"").toLowerCase().replace(/[^a-z0-9_]/g,"_").slice(0,20);
  if(!key||keys.has(key)){const k="a"+(i+1);if(a.key)fixes.push(at+".key: '"+a.key+"' dobel/kosong → "+k+".");key=k}
  if(key!==a.key&&a.key!==undefined&&!fixes.some(f=>f.startsWith(at+".key")))fixes.push(at+".key: '"+a.key+"' → "+key+".");
  keys.add(key);
  const g=GENDER[String(a.gender??a.sex??a.base??"").toLowerCase()];
  if(!g)errors.push(at+".gender: '"+(a.gender??"")+"' harus male atau female.");
  else if(g!==a.gender)fixes.push(at+".gender: '"+(a.gender??a.sex??a.base)+"' → "+g+".");
  let tone=String(a.skin?.tone??a.skin??a.tone??"light").toLowerCase();
  if(!TONES.includes(tone)){fixes.push(at+".skin: '"+tone+"' tidak dikenal → light. (pilihan: "+TONES.join(", ")+")");tone="light"}
  let outfit=String(a.outfit??"none");if(outfit==="nude"||outfit==="tanpa_baju"||outfit===""){if(outfit!=="none")fixes.push(at+".outfit: '"+outfit+"' → none.");outfit="none"}
  if(!OUTFITS.includes(outfit))errors.push(at+".outfit: '"+outfit+"' tidak ada. Pilihan: "+OUTFITS.join(", ")+".");
  let wear=a.wear&&isObj(a.wear)?{...a.wear}:null;
  if(a.hair!==undefined&&!wear?.hair){wear={...(wear||{}),hair:a.hair,hairColor:a.hairColor};fixes.push(at+".hair dipindah ke wear.hair.")}
  if(wear?.hair&&!HAIRS.includes(wear.hair))errors.push(at+".wear.hair: '"+wear.hair+"' tidak ada. Pilihan: "+HAIRS.join(", ")+".");
  if(wear&&ctx.opt)for(const k of ["top","topColor","pants","pantsColor","shoes","shoesColor","hairColor"])if(wear[k]!=null&&ctx.opt[k]&&!ctx.opt[k].includes(wear[k]))errors.push(at+".wear."+k+": '"+wear[k]+"' tidak ada. Pilihan: "+ctx.opt[k].join(", ")+".");
  if(wear)for(const k of Object.keys(wear))if(wear[k]==null)delete wear[k];
  const pos=isObj(a.position)?a.position:a;
  const x=numOk(pos.x)?Math.round(Number(pos.x)):0,y=numOk(pos.y)?Math.round(Number(pos.y)):0;
  if(pos.x===undefined||pos.y===undefined)fixes.push(at+": posisi x/y kosong → 0.");
  if(Math.abs(x)>512||Math.abs(y)>256)errors.push(at+": posisi x "+x+" / y "+y+" di luar batas (x ±512, y ±256).");
  let dir=String(a.dir??a.facing??a.direction??"se").toLowerCase();
  if(!DIRS.includes(dir)){errors.push(at+".dir: '"+dir+"' harus se, sw, ne atau nw.");dir="se"}
  const flip=a.flip===true||a.flip==="true"||a.flip===1;if(a.flip!==undefined&&typeof a.flip!=="boolean")fixes.push(at+".flip: '"+a.flip+"' → "+flip+".");
  let layer=numOk(a.layer)?Math.round(Number(a.layer)):i;if(a.layer===undefined)fixes.push(at+".layer: kosong → "+i+" (urutan di daftar).");
  let track=a.track??a.animations??a.animasi??a.motions;
  if(a.track===undefined&&track!==undefined)fixes.push(at+": animasi dibaca dari '"+["animations","animasi","motions"].find(k=>a[k]!==undefined)+"'.");
  if(typeof track==="string")track=[{motion:track}];
  if(!Array.isArray(track)||!track.length){errors.push(at+".track: minimal 1 animasi ({motion, ms}).");track=[]}
  const outT=track.slice(0,24).map((t,j)=>{
   const tat=at+".track["+j+"]";if(typeof t==="string")t={motion:t};
   if(!isObj(t)){errors.push(tat+": harus {motion, ms}.");return null}
   let ref=String(t.motion??t.id??t.name??t.animation??"");
   const r=resolveRef(ref,known);
   if(!r)errors.push(tat+".motion: animasi '"+ref+"' tidak ada di database Bergerak atau bawaan ("+Object.keys(known).slice(0,12).join(", ")+(Object.keys(known).length>12?", …":"")+").");
   else if(r.ref!==ref)fixes.push(tat+".motion: '"+ref+"' → "+r.ref+".");
   let ms=t.ms??t.duration??t.durationMs;
   if(ms===undefined){ms=r?.duration||1000;fixes.push(tat+".ms: kosong → "+ms+" (1 putaran animasi).")}
   if(!numOk(ms)){errors.push(tat+".ms: '"+ms+"' bukan angka.");ms=1000}
   ms=Number(ms);if(ms>0&&ms<=30&&!Number.isInteger(ms)){fixes.push(tat+".ms: "+ms+" kelihatan detik → "+Math.round(ms*1000)+" ms.");ms=Math.round(ms*1000)}
   ms=Math.round(ms);if(ms<40||ms>600000)errors.push(tat+".ms: "+ms+" di luar 40–600000 ms.");
   return {motion:r?.ref||ref,ms};
  }).filter(Boolean);
  let emo=a.emosi??a.emotions??a.faces??a.emotion??[];
  if(a.emosi===undefined&&(a.emotions||a.faces||a.emotion))fixes.push(at+": emosi dibaca dari '"+["emotions","faces","emotion"].find(k=>a[k]!==undefined)+"'.");
  if(typeof emo==="string")emo=[{face:emo}];
  if(!Array.isArray(emo)){errors.push(at+".emosi: harus array [{face, startMs, ms}].");emo=[]}
  let cursor=0;
  const outE=emo.slice(0,24).map((f,j)=>{
   const eat=at+".emosi["+j+"]";if(typeof f==="string")f={face:f};
   if(!isObj(f)){errors.push(eat+": harus {face, startMs, ms}.");return null}
   const want=String(f.face??f.id??f.name??f.emosi??"");
   const hit=resolveFace(want,faces,g);
   if(!hit)errors.push(eat+".face: Emosi '"+want+"' tidak ditemukan"+(faces.length?" (ada "+faces.length+" Emosi, mis. "+faces.slice(0,4).map(x=>x.label||x.id).join(", ")+")":" — database Emosi belum kebaca, buka tab Emosi / sync dulu")+".");
   else if(hit.id!==want)fixes.push(eat+".face: '"+want+"' → "+hit.id+".");
   let st=f.startMs??f.start??f.at,ms=f.ms??f.duration??f.durationMs;
   if(st===undefined){st=cursor;fixes.push(eat+".startMs: kosong → "+st+".")}
   if(ms===undefined){ms=1500;fixes.push(eat+".ms: kosong → 1500.")}
   if(!numOk(st)||!numOk(ms)){errors.push(eat+": startMs/ms harus angka.");return null}
   st=Math.round(Number(st));ms=Math.round(Number(ms));if(ms<40)errors.push(eat+".ms: minimal 40.");if(st<0)errors.push(eat+".startMs: tidak boleh negatif.");
   cursor=st+ms;return {face:hit?.id||want,startMs:st,ms};
  }).filter(Boolean);
  return {key,name:String(a.name||(g==="female"?"Cewek ":"Cowok ")+(i+1)).slice(0,40),gender:g||"male",skin:{tone},outfit,wear,x,y,dir,flip,layer,track:outT,emosi:outE};
 }).filter(Boolean);
 const name=String(v.name||v.title||v.id||"Adegan impor").slice(0,60);if(!v.name)fixes.push("name: kosong → '"+name+"'.");
 let id=String(v.id||"");if(!/^[a-z0-9_]{1,40}$/.test(id)){const s=DB().slug(id||name);if(id)fixes.push("id: '"+id+"' → '"+s+"'.");id=s}
 let dur=v.durationMs??v.duration??null;if(dur!=null&&!numOk(dur)){errors.push("durationMs: bukan angka.");dur=null}
 const entry={format:"lgr1-beraksi-v1",id,name,category:String(v.category||"impor").slice(0,30),notes:String(v.notes||v.description||"").slice(0,500),
  loop:v.loop!==false&&v.loop!=="false",durationMs:dur!=null?Math.round(Number(dur)):null,stage:{width:256,height:160},actors:outA};
 if(errors.length)return {entry:null,fixes,errors};
 try{DB().validateBeraksi({...entry,rev:1,updated:new Date().toISOString()})}catch(e){errors.push("Validasi akhir: "+e.message)}
 return {entry:errors.length?null:entry,fixes,errors};
}
// known: {"builtin:walk":{duration}, "bergerak:x":{duration}}
function resolveRef(ref,known){
 if(known[ref])return {ref,duration:known[ref].duration};
 const id=String(ref).replace(/^(builtin|bergerak|bawaan):/,"");const s=DB().slug(id);
 for(const pre of ["bergerak:","builtin:"])for(const k of [id,s])if(known[pre+k])return {ref:pre+k,duration:known[pre+k].duration};
 const byName=Object.entries(known).find(([,v])=>v.name&&DB().slug(v.name)===s);
 return byName?{ref:byName[0],duration:byName[1].duration}:null;
}
function resolveFace(want,faces,gender){
 if(!want)return null;
 const ok=f=>!gender||!f.genders||f.genders.includes(gender);
 const w=String(want),s=DB().slug(w.replace(/^emosi_/,""));
 return faces.find(f=>f.id===w&&ok(f))||faces.find(f=>f.id==="emosi_"+w&&ok(f))||
  faces.find(f=>ok(f)&&DB().slug(String(f.label||"").replace(/ \/ EMOSI\.EXE$/,""))===s)||null;
}
// checks a ready entry against the live databases before a save (blocks unknown refs)
function checkRefs(scene,known,faces){
 const errors=[];
 scene.actors.forEach((a,i)=>{
  a.track.forEach((t,j)=>{if(!known[t.motion])errors.push("actors["+i+"] "+a.name+" · animasi #"+(j+1)+": '"+t.motion+"' tidak ada di database.")});
  (a.emosi||[]).forEach((f,j)=>{if(!faces.some(x=>x.id===f.face))errors.push("actors["+i+"] "+a.name+" · emosi #"+(j+1)+": '"+f.face+"' tidak ada di Emosi.")});
 });
 return errors;
}
return Object.freeze({ANAT,jointName,parseInput,normalizeBergerak,normalizeBeraksi,resolveRef,resolveFace,checkRefs});
});
