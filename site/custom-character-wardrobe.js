/* Mahluk Hidup — built-in four-view native wardrobe for custom characters.
 * Source: published male/female V6B generator. Previews and thumbnails are
 * composed only in the browser; original NPC/character atlases are untouched.
 * Selected presets materialize into EXISTING accessory storage so Semesta and
 * Bangun Ruang see exactly the same outfit on the user's browser/origin.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const DIRS=["se","sw","ne","nw"],SLOTS=["hair","shirt","pants","shoes"];
const STORE="virtual-life-accessories-v1",BASES=["human_male_base","human_female_base"];
const BASE_FRAME=Object.freeze({width:64,height:112,pivot:[32,100]});
const PRESET_FILE=/^media\/wardrobe-(male|female)-(hair|shirt|pants|shoes)-[a-z0-9_]+\.png$/;
let presets=[],direction="se",ready=false,error="";
const cache=new Map();
const safeJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
function baseId(){return $("custom-base")?.value||"human_male_base";}
function srcFor(relative){return "./"+relative+"?v=custom-wardrobe-v1";}
function imageFor(src){
 if(!src)return null;
 if(!cache.has(src)){
  const pic=new Image(),entry={pic,ready:false,error:false};
  cache.set(src,entry);
  pic.onload=()=>{entry.ready=true;render();};
  pic.onerror=()=>{entry.error=true;render();};
  pic.src=src;
 }
 return cache.get(src);
}
function readyImage(src){
 return new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>resolve(img);
  img.onerror=()=>reject(Error("Wardrobe image unavailable: "+src));
  img.src=src;
 });
}
function selectedPreset(id,base=baseId(),slot=""){
 return presets.find(p=>p.id===id&&p.template_base===base&&(!slot||p.category===slot))||null;
}
function storedAccessory(id,base,slot){
 const records=safeJson(STORE,[]);
 return Array.isArray(records)?records.find(x=>x?.id===id&&x.template_base===base&&x.category===slot):null;
}
function addOptions(base=baseId()){
 if(!BASES.includes(base)){render();return;}
 for(const slot of SLOTS){
  const select=$("custom-"+slot);if(!select)continue;
  const prior=select.value,seen=new Set([...select.options].map(x=>x.value));
  for(const p of presets.filter(x=>x.template_base===base&&x.category===slot)){
   if(seen.has(p.id))continue;
   const option=document.createElement("option");
   option.value=p.id;option.textContent="V6B / "+p.name;
   select.append(option);
  }
  if([...select.options].some(x=>x.value===prior))select.value=prior;
 }
 render();
}
function chooseStarter(){
 const base=baseId();
 addOptions(base);
 if(!BASES.includes(base))return;
 const defaults={hair:"short_black",shirt:"tee_white",pants:"trousers_black",shoes:"sneakers_white"};
 for(const [slot,code] of Object.entries(defaults)){
  const select=$("custom-"+slot),id="preset_"+base+"_"+slot+"_"+code;
  if(select&&[...select.options].some(option=>option.value===id))select.value=id;
 }
 render();
}
function paintSlot(ctx,base,slot,dir,entries=null){
 const id=$("custom-"+slot)?.value||"";
 if(!id)return;
 const preset=selectedPreset(id,base,slot);
 let item=null;
 if(!preset){
  const records=entries||safeJson(STORE,[]);
  item=Array.isArray(records)?records.find(x=>x?.id===id&&x.template_base===base&&x.category===slot):null;
 }
 const src=preset?srcFor(preset.sheet):item?.frames?.[dir];
 const loaded=imageFor(src);
 if(!loaded?.ready)return;
 const index=DIRS.indexOf(dir),im=loaded.pic;
 ctx.imageSmoothingEnabled=false;
 if(preset&&im.naturalWidth===256&&im.naturalHeight===112)
  ctx.drawImage(im,index*64,0,64,112,0,0,64,112);
 else if(item&&im.naturalWidth===64&&im.naturalHeight===112)
  ctx.drawImage(im,0,0);
}
function render(){
 const canvas=$("custom-preview");if(!canvas)return;
 const ctx=canvas.getContext("2d"),base=baseId();
 ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,64,112);
 const gender=base==="human_female_base"?"female":"male";
 const sheet=base==="astrofrich_base"?"media/astrofrich-base-sheet.png":
   "media/human-"+gender+"-base-sheet.png";
 const source=imageFor(srcFor(sheet)),index=DIRS.indexOf(direction);
 if(source?.ready&&source.pic.naturalWidth>=384&&source.pic.naturalHeight>=4928){
  paintSlot(ctx,base,"bag",direction);
  ctx.drawImage(source.pic,0,(4+index)*112,64,112,0,0,64,112);
  if(BASES.includes(base)&&root.VLUniversalBodyActions?.tintBase)
   root.VLUniversalBodyActions.tintBase(ctx,{
    id:base,bodyType:gender,skinTone:$("custom-skin-tone").value
   });
  for(const slot of ["shoes","pants","shirt","hair","helmet"])
   paintSlot(ctx,base,slot,direction);
 }
 const title=($("custom-name")?.value.trim()||"NEW CHARACTER").toUpperCase();
 $("custom-preview-title").textContent=title+".SPR";
 $("custom-preview-status").textContent=
  (BASES.includes(base)?gender.toUpperCase():"ASTROFRICH")+" / "+direction.toUpperCase()+
  (source?.ready?" / LIVE 4-VIEW PREVIEW":" / LOADING SPRITE");
 for(const button of document.querySelectorAll("[data-custom-dir]")){
  const active=button.dataset.customDir===direction;
  button.classList.toggle("selected",active);
  button.setAttribute("aria-pressed",String(active));
 }
}
async function materializeSelected(base=baseId()){
 if(!BASES.includes(base))return 0;
 let items=safeJson(STORE,[]);
 if(!Array.isArray(items))throw Error("Invalid accessory storage");
 items=items.slice();
 let count=0;
 // All 4 views are derived from authentic V6B layers, NOT copied from
 // flattened male/female NPC sprites; equipment remains independent.
 for(const slot of SLOTS){
  const id=$("custom-"+slot).value,preset=selectedPreset(id,base,slot);
  if(!preset||items.some(x=>x.id===id))continue;
  const sheet=await readyImage(srcFor(preset.sheet));
  if(sheet.naturalWidth!==256||sheet.naturalHeight!==112)
   throw Error("Preset dimensions invalid: "+preset.name);
  const frames={};
  for(let i=0;i<4;i++){
   const canvas=document.createElement("canvas");canvas.width=64;canvas.height=112;
   const ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=false;
   ctx.drawImage(sheet,i*64,0,64,112,0,0,64,112);
   frames[DIRS[i]]=canvas.toDataURL("image/png");
   if(frames[DIRS[i]].length>100000)
    throw Error("Preset frame exceeds local equipment storage capacity");
  }
  items.push({id:preset.id,name:preset.name,category:slot,template_base:base,
   frames,size:[64,112],source:"native-wardrobe",updated:Date.now()});
  count++;
 }
 if(count){
  try{localStorage.setItem(STORE,JSON.stringify(items));}
  catch(e){throw Error("Browser storage is full. Preset images could not be saved.");}
 }
 return count;
}
async function createPortrait(base=baseId()){
 const gender=base==="human_female_base"?"female":"male";
 const sheet=base==="astrofrich_base"?"media/astrofrich-base-sheet.png":
  "media/human-"+gender+"-base-sheet.png";
 const source=await readyImage(srcFor(sheet));
 if(source.naturalWidth<384||source.naturalHeight<4928)return null;
 const canvas=document.createElement("canvas");canvas.width=64;canvas.height=112;
 const ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=false;
 const items=safeJson(STORE,[]);
 const paint=async slot=>{
  const id=$("custom-"+slot)?.value||"";
  const item=Array.isArray(items)?items.find(x=>x?.id===id&&x.template_base===base&&x.category===slot):null;
  if(!item?.frames?.se)return;
  const overlay=await readyImage(item.frames.se);
  if(overlay.naturalWidth===64&&overlay.naturalHeight===112)ctx.drawImage(overlay,0,0);
 };
 await paint("bag");
 ctx.drawImage(source,0,4*112,64,112,0,0,64,112);
 if(BASES.includes(base)&&root.VLUniversalBodyActions?.tintBase)
  root.VLUniversalBodyActions.tintBase(ctx,{id:base,bodyType:gender,
   skinTone:$("custom-skin-tone").value});
 for(const slot of ["shoes","pants","shirt","hair","helmet"])await paint(slot);
 return canvas.toDataURL("image/png");
}
async function load(){
 try{
  const response=await fetch("./wardrobe-presets.json",{cache:"no-store"});
  if(!response.ok)throw Error("HTTP "+response.status);
  const json=await response.json();
  if(json.format!=="mahluk-hidup-native-wardrobe-v1"||
     json.frame?.join(",")!=="64,112"||
     json.directions?.join(",")!=="se,sw,ne,nw"||
     !Array.isArray(json.presets))throw Error("Invalid wardrobe manifest");
  presets=json.presets.filter(p=>
   typeof p.id==="string"&&
   /^preset_human_(male|female)_base_(hair|shirt|pants|shoes)_[a-z0-9_]+$/.test(p.id)&&
   BASES.includes(p.template_base)&&SLOTS.includes(p.category)&&
   PRESET_FILE.test(p.sheet)&&typeof p.name==="string");
  ready=presets.length>=36;
  $("custom-preset-status").textContent=presets.length+
   " NATIVE V6B OUTFIT OPTIONS / MALE + FEMALE / FOUR SIDES";
  addOptions();
  if(ready&&!$("custom-name").value.trim()&&
     SLOTS.every(slot=>!$("custom-"+slot).value))chooseStarter();
 }catch(e){
  error=String(e.message||e);
  $("custom-preset-status").textContent=
   "PRESET LIBRARY UNAVAILABLE — DRAW CUSTOM OUTFITS IN PIXEL EDITOR";
  render();
 }
}
for(const dirButton of document.querySelectorAll("[data-custom-dir]")){
 dirButton.addEventListener("click",()=>{direction=dirButton.dataset.customDir;render();});
}
for(const key of ["category","base","name","skin-tone","helmet","bag","hair","shirt","pants","shoes"]){
 const item=$("custom-"+key);
 if(item)item.addEventListener(key==="name"?"input":"change",()=>{
  // Base/categories are adjusted by Mahluk Hidup's own editor first.
  if(key==="base"||key==="category")addOptions();
  render();
 });
}
root.addEventListener("storage",event=>{if(event.key===STORE)render();});
root.VLHumanWardrobe=Object.freeze({
 populate:addOptions,chooseStarter,render,refresh:render,
 materializeSelected,createPortrait,BASE_FRAME,DIRS,SLOTS,
 get count(){return presets.length;},get ready(){return ready;},get error(){return error;}
});
load();
})(window);
