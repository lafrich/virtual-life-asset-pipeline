/* LGR-1 game character runtime (Mainkan test play, Semesta, Bangun Ruang).
 *
 * Thin game adapter over the shared LGR stack (no V6P runtime):
 *   LGRActor  official LGR-1 base (official-9) + skin tone       (lgr-actor.js)
 *   LGRWear   six artist-approved base outfits + hair (wardrobe-approved)    (lgr-wear.js)
 *   LGRDB     Bergerak motions / Beraksi scenes from the cloud DB (lgr-db.js)
 *   LafrichPuppetRenderer → LGR1Raster (joint fill on), Emosi face under the
 *   front hair in SE/SW only.
 * Motion lookup for a game action id: cloud DB (bergerak:<id>) → built-in
 * (builtin:<id>) → stand-in table below → builtin idle.
 * Needs: lafrich-puppet-core.js, lafrich-puppet-renderer.js, lgr1-raster.js,
 * lgr1-motion.js, lgr-skin.js, lgr-wear.js, lgr-actor.js, lgr-db.js.
 */
(function(root,factory){"use strict";const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.LGRGame=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(root){
"use strict";
const VERSION="lgr-game-8-artist-base-20261113";
const DIRS=["se","sw","ne","nw"];
const here=(()=>{try{const s=document.currentScript?.src;return s?s.slice(0,s.lastIndexOf("/")+1):"/virtual-life-asset-pipeline/"}catch{return "/virtual-life-asset-pipeline/"}})();
if(root&&!root.LGRDB_BASE)root.LGRDB_BASE=here;
const rel=p=>(root.LGRDB_BASE||here)+p;
// Game action id → stand-in built-in motion, used only while neither the cloud
// DB (Bergerak) nor the built-in library has a motion with that id. Ids follow
// media/lgr1/needed-motions.json; legacy game actions alias onto them.
const STAND_INS=Object.freeze({
 tent_sleep:"lie_sleep",tent_crawl_out:"crouch",bench_sleep:"lie_sleep",mandi:"arms_up",wc_squat:"crouch",
 pee_stand:"idle",fishing_cast:"wave",fishing_wait:"idle",pick_up:"bow",silver_pose:"idle",ogah_flag:"wave",
 parkir_whistle:"wave",eat:"talk",drink_coffee:"talk",faint:"lie_sleep",arrested:"arms_up",clean_gorong:"crouch",
 pray_generic:"bow",give_sedekah:"wave",tired_walk:"walk",tired:["tired_walk","idle"],cook:"idle",
 eat_sit:"sit",drink_coffee_sit:"sit",fishing_wait_sit:"sit",mulung_pick:"bow",walk_carry_sack:"walk",check_phone:"talk",
 sit_lesehan:"sit",run:"walk",sweep:"idle",rinse_tap:"mandi",hand_over:"pick_up",protest:"talk",get_up:"idle",use_storage:"pick_up",
 accident_wet:"idle",cook_stir:"cook",mix_drink:"drink_coffee",eat_snack:"eat",sell_food_stall:"talk",sit_class:"sit",read_book:"sit",online_learning:"check_phone",work_bank_counter:"sit",pee_wall:"pee_stand",steal:"pick_up",help_npc:"hand_over",collect:"pick_up"});
const ALIASES=Object.freeze({
 sleep:"lie_sleep",rest:"lie_sleep",sleep_bed_right:"lie_sleep",sleep_bed_left:"lie_sleep",
 sit_type:"sit",work:"sit",study:"sit",perch:"sit",bathtub_bathe:"sit",
 toilet:"wc_squat",pee:"pee_stand",bathe:"mandi",swim:"walk",float:"idle"});
const ALIAS_DIR=Object.freeze({sleep_bed_right:"se",sleep_bed_left:"sw"});
const state={ready:false,loading:null,error:null,version:null,db:null,lib:null};
const preps=new Map(),frames=new Map(),strips=new Map(),faceImgs=new Map();
const dep=n=>{const v=root?.[n];if(!v)throw Error("LGR runtime missing "+n);return v};
function cv(w=64,h=112){const c=document.createElement("canvas");c.width=w;c.height=h;return c}
function image(url){
 if(strips.has(url))return strips.get(url);
 const p=new Promise(res=>{const i=new Image();i.crossOrigin="anonymous";i.onload=()=>res(i);i.onerror=()=>res(null);i.src=url});
 strips.set(url,p);return p;
}
function clearRendered(){frames.clear()}
async function connectDatabase(){
 const DB=root?.LGRDB;
 if(!DB){state.db={connected:false,bergerak:0,beraksi:0};return state.db}
 try{
  const r=await DB.ready({sync:true});
  state.db={connected:true,...r,state:DB.state};
  if(!state.dbWatch){state.dbWatch=true;DB.onChange?.(()=>{preps.clear();clearRendered();root.LGRWear?.clearCache?.();root.LGRActor?.clearCaches?.();state.db={...state.db,changedAt:Date.now()}})}
 }catch(e){console.warn("LGR database",e);state.db={connected:false,error:String(e.message||e)}}
 return state.db;
}
async function load(){
 if(state.ready)return state;
 if(state.loading)return state.loading;
 state.loading=(async()=>{
  const A=dep("LGRActor");dep("LGRWear");dep("LGR1Raster");
  const bases=await A.loadBases();state.version=bases.male.version;
  state.lib=await A.motions();
  await connectDatabase();
  state.ready=true;return state;
 })().catch(e=>{state.error=e;state.loading=null;throw e});
 return state.loading;
}
function builtin(id){return state.lib?.motions.find(m=>m.id===id)||null}
function resolveAction(action){
 const id=ALIASES[action]||action,DB=root?.LGRDB;
 const db=DB?.motion?.("bergerak:"+id);
 if(db)return {id,motion:db,source:"bergerak",standIn:false,dir:ALIAS_DIR[action]};
 const own=builtin(id);
 if(own)return {id,motion:own,source:"builtin",standIn:false,dir:ALIAS_DIR[action]};
 // stand-in: the fallback id is itself resolved (cloud DB → built-in → its own
 // stand-in), e.g. rinse_tap → mandi (DB) → arms_up; ends at builtin idle.
 let fb=STAND_INS[id],sub=null,via=[];
 // An array is an explicit ordered chain (each tried DB → built-in, no further hops),
 // e.g. tired → tired_walk → idle.
 if(Array.isArray(fb)){for(const f of fb){via.push(f);sub=DB?.motion?.("bergerak:"+f)||builtin(f);if(sub)break;}fb=null;}
 for(let n=0;fb&&n<4&&!sub;n++){via.push(fb);sub=DB?.motion?.("bergerak:"+fb)||builtin(fb);if(!sub)fb=STAND_INS[fb];}
 return {id,motion:sub||builtin("idle"),source:"stand-in",standIn:true,via,dir:ALIAS_DIR[action]};
}
// virtual-office profile.appearance → LGRWear spec
function spec(profile){
 const a=profile.appearance||{};
 // Mainkan must render the six currently approved artist bases, even for
 // profiles created before the wardrobe refit. Unapproved old category styles
 // visually fall back to the matching base rather than becoming invisible.
 const s={top:"tee",pants:"trousers",shoes:"shoes"};
 for(const [key,legacy] of [["top","topStyle"],["pants","pantsStyle"],["shoes","shoesStyle"]]){
  const value=a[legacy];
  if(value==="nude"||value==="none"){delete s[key];continue}
  if(value&&value!=="custom"){
   const approved={top:"tee",pants:"trousers",shoes:"shoes"}[key];
   s[key]=approved;
  }
 }
 if(a.hairStyle&&!["custom","nude","none"].includes(a.hairStyle))s.hair=a.hairStyle;
 for(const k of ["topColor","pantsColor","shoesColor","hairColor"])if(a[k])s[k]=a[k];
 return s;
}
const toneOf=p=>{const t=p.appearance?.skinTone;return dep("LGRSkin").TONES[t]?t:"light"};
const genderOf=p=>p.gender==="female"?"female":"male";
// Glasses / facial hair: same mh-wear strips (256×112, SE|SW|NE|NW), merged into
// the accessory layer and recoloured with the player's palette.
async function accessory(profile,tone){
 const a=profile.appearance||{},W=dep("LGRWear"),paths=[];
 if(a.facialHair&&a.facialHair!=="none")paths.push("facial/"+a.facialHair);
 if(a.glasses&&a.glasses!=="none")paths.push("glasses/"+a.glasses);
 if(!paths.length)return null;
 const M=W.lookup({...spec(profile),skin:tone}),out={};
 for(let di=0;di<4;di++){
  const c=cv(),g=c.getContext("2d",{willReadFrequently:true});let any=false;
  for(const p of paths){const im=await W.activeStrip(p,genderOf(profile));if(im){g.drawImage(im,di*64,0,64,112,0,0,64,112);any=true}}
  if(!any)continue;const d=g.getImageData(0,0,64,112);W.recolor(d.data,M);
  if(!d.data.some((v,i)=>i%4===3&&v))continue;g.putImageData(d,0,0);out[DIRS[di]]=c.toDataURL("image/png");
 }
 return Object.keys(out).length?out:null;
}
// Emosi atlas column → image whose skin follows the player's tone (face is
// authored on the light ramp; converted light → key → tone).
function faceImage(face,col,tone){
 if(!face)return Promise.resolve(null);
 const key=face.src+"#"+col+"#"+tone;
 if(faceImgs.has(key))return faceImgs.get(key);
 const p=(async()=>{
  if(!face.complete)await face.decode();
  const c=cv(64,448),g=c.getContext("2d",{willReadFrequently:true});g.drawImage(face,col*64,0,64,448,0,0,64,448);
  const S=root?.LGRSkin;
  if(S&&tone!=="light"){const d=g.getImageData(0,0,64,448);S.toKey(d.data);S.fromKey(d.data,S.rampFor(tone));g.putImageData(d,0,0)}
  const im=new Image();im.src=c.toDataURL("image/png");await im.decode();return im;
 })();
 faceImgs.set(key,p);if(faceImgs.size>120)faceImgs.delete(faceImgs.keys().next().value);
 return p;
}
const lookKey=p=>JSON.stringify([genderOf(p),toneOf(p),spec(p),p.appearance?.facialHair||"",p.appearance?.glasses||""]);
function prepare(profile,d,face,faceCol){
 const X=root.LGR1Raster,key=lookKey(profile)+"|"+d+"|"+(face?face.src+"#"+faceCol:"-")+"|ls="+(X&&X.LOWER_SPRITES?"1":"0");
 if(preps.has(key))return preps.get(key);
 const p=(async()=>{
  const A=dep("LGRActor"),W=dep("LGRWear"),C=dep("LafrichPuppetCore"),R=dep("LafrichPuppetRenderer");
  const g=genderOf(profile),tone=toneOf(profile),m=await A.master(g,tone);
  const wear=await W.layers(spec(profile),g,tone),acc=await accessory(profile,tone);
  if(acc)wear.accessory=acc;
  const ch=Object.keys(wear).length?C.validateCharacter({format:C.CHARACTER,id:"lgr_game",name:"player",gender:g,wear,faceId:""}):null;
  const fimg=(d==="se"||d==="sw")?await faceImage(face,faceCol,tone):null;
  const X=dep("LGR1Raster"),S=root.LGRSkin;
  const recolor=S?data=>{S.fromKey(data,S.rampFor(tone));W.recolor(data,W.lookup({...spec(profile),skin:tone}))}:null;
  return R.prepare(m,ch,d,fimg,{lowerSprites:X.LOWER_SPRITES,recolor});
 })();
 preps.set(key,p);if(preps.size>160)preps.delete(preps.keys().next().value);
 p.then(v=>{p.done=true;p.value=v},e=>{p.done=true;p.error=e;console.warn("LGR prepare",e)});
 return p;
}
/* Render one frame. Returns a 64×112 canvas, or null while assets load (the
 * caller keeps the previous picture). t = seconds since the action started. */
function frame(profile,dir,action,t,face,faceCol=0){
 if(!state.ready){load().catch(()=>{});return null}
 const d=DIRS.includes(dir)?dir:"se",r=resolveAction(action),m=r.motion,M=dep("LGR1Motion");
 const i=M.frameIndexAt(m,Math.max(0,t||0)*1000);
 const pp=prepare(profile,d,face,faceCol);
 if(!pp.done||pp.error)return null;
 const A=dep("LGRActor"),R=dep("LafrichPuppetRenderer"),X=dep("LGR1Raster");
 const {pose,order}=A.poseOf(pp.value.master,state.lib,m,i,d);
 const use=X.LOWER_SPRITES,cv=X.CANVAS,avail=pp.value.lower?.avail;
 const picked=use?X.selectLower(pose,pp.value.outfit||"base",avail):"rig";
 const fkey=lookKey(profile)+"|"+d+"|"+r.source+":"+m.id+"|"+i+"|"+(face?face.src+"#"+faceCol:"-")+"|lower="+picked+"|cv="+cv;
 if(frames.has(fkey))return frames.get(fkey);
 const c=R.render(pp.value,pose,{order,canvas:cv,lowerSprites:use});
 frames.set(fkey,c);if(frames.size>600)frames.delete(frames.keys().next().value);
 return c;
}
function actionTable(){
 const ids=[...new Set([...Object.keys(STAND_INS),...Object.keys(ALIASES)])];
 return ids.map(a=>{const r=resolveAction(a);return {action:a,id:r.id,motion:r.motion?.id,source:r.source,standIn:r.standIn}});
}
function status(){return {version:VERSION,ready:state.ready,error:state.error?String(state.error.message||state.error):null,
 base:state.version,db:state.db,preps:preps.size,frames:frames.size,
 prepStates:[...preps.values()].map(p=>p.done?(p.error?"err:"+p.error.message:"ok"):"pending")}}
// test hook / offline use: supply an already validated built-in library
function useLibrary(lib){state.lib=lib;frames.clear()}
return Object.freeze({VERSION,STAND_INS,ALIASES,useLibrary,load,frame,prepare,status,connectDatabase,actionTable,resolveAction,spec,
 clear(){preps.clear();frames.clear();faceImgs.clear()}});
});
