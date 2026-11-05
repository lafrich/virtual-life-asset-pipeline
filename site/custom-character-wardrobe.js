/* Mahluk Hidup — canonical Male/Female model + independent color studio.
 * Native V6B four-facing PNGs are immutable templates. Wardrobe overlays
 * (including BACK and FRONT HAIR) are composed, recolored, and persisted as
 * per-character transparent four-way equipment PNGs. No NPC sprites changed.
 */
(function(root){"use strict";
const $=id=>document.getElementById(id);
const DIRS=["se","sw","ne","nw"],SLOTS=["hair","shirt","pants","shoes"];
const STORE="virtual-life-accessories-v1",BASES=["human_male_base","human_female_base"];
const BASE_FRAME=Object.freeze({width:64,height:112,pivot:[32,100]});
const PRESET_FILE=/^media\/wardrobe-(male|female)-(hair|shirt|pants|shoes|hairback)-[a-z0-9_]+\.png$/;
const HEX=/^#[0-9a-f]{6}$/i;
const START=Object.freeze({hair:"#4b352b",shirt:"#eee9e0",pants:"#3a495c",shoes:"#2c3138"});
const DEFAULT_MODEL=Object.freeze({hair:"short",shirt:"tee",pants:"trousers",shoes:"sneakers"});
let presets=[],direction="se",ready=false,error="",paletteSlot="hair";
const cache=new Map();
const safeJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const baseId=()=>$("custom-base")?.value||"human_male_base";
const srcFor=p=>"./"+p+"?v=wardrobe-colors-v4";
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
function readyImage(src){return new Promise((resolve,reject)=>{
 const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error("Missing wardrobe asset: "+src));im.src=src;
});}
function color(slot){const raw=$("custom-"+slot+"-color")?.value;return HEX.test(raw||"")?raw.toLowerCase():START[slot];}
function setColor(slot,hex){
 if(!SLOTS.includes(slot)||!HEX.test(hex||""))return false;
 $("custom-"+slot+"-color").value=hex.toLowerCase();
 $("custom-"+slot+"-hex").value=hex.toLowerCase();
 render();return true;
}
function setPaletteTarget(slot){
 if(!SLOTS.includes(slot))return;
 paletteSlot=slot;
 for(const button of document.querySelectorAll("[data-palette-slot]")){
  const active=button.dataset.paletteSlot===slot;
  button.classList.toggle("selected",active);
  button.setAttribute("aria-pressed",String(active));
 }
 const note=$("palette-note");
 if(note)note.textContent="EDIT "+slot.toUpperCase()+" COLOR · SELECT SWATCH";
 const chip=$("current-color");if(chip)chip.style.backgroundColor=color(slot);
}
function setPaletteColor(hex){
 if($("custom-workspace")?.hidden||!BASES.includes(baseId()))return false;
 return setColor(paletteSlot,hex);
}
function selectedPreset(id,base=baseId(),slot=""){
 return presets.find(p=>p.id===id&&p.template_base===base&&(!slot||p.category===slot))||null;
}
function presetsFor(base,slot){return presets.filter(x=>x.template_base===base&&x.category===slot);}
function addOptions(base=baseId()){
 if(!BASES.includes(base)){render();return;}
 for(const slot of SLOTS){
  const select=$("custom-"+slot);if(!select)continue;
  const previous=select.value,seen=new Set([...select.options].map(o=>o.value));
  for(const p of presetsFor(base,slot)){
   if(seen.has(p.id))continue;
   const option=document.createElement("option");option.value=p.id;option.textContent=p.name;
   select.append(option);
  }
  if([...select.options].some(o=>o.value===previous))select.value=previous;
 }
 render();
}
function chooseStarter(){
 const base=baseId();addOptions(base);
 if(!BASES.includes(base))return;
 for(const slot of SLOTS){
  const id="preset_"+base+"_"+slot+"_"+DEFAULT_MODEL[slot],select=$("custom-"+slot);
  if([...select.options].some(o=>o.value===id))select.value=id;
  setColor(slot,START[slot]);
 }
 setPaletteTarget("hair");
 render();
}
function recolor(ctx,hex){
 const image=ctx.getImageData(0,0,64,112),d=image.data;
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 for(let i=0;i<d.length;i+=4){
  if(d[i+3]<5)continue;
  const brightness=d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722;
  const shade=.35+(brightness/255)*.69;
  d[i]=Math.min(255,Math.round(rgb[0]*shade));
  d[i+1]=Math.min(255,Math.round(rgb[1]*shade));
  d[i+2]=Math.min(255,Math.round(rgb[2]*shade));
 }
 ctx.putImageData(image,0,0);
}
function frameOf(image,index,hex){
 const canvas=document.createElement("canvas");canvas.width=64;canvas.height=112;
 const ctx=canvas.getContext("2d",{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
 ctx.drawImage(image,index*64,0,64,112,0,0,64,112);
 if(hex)recolor(ctx,hex);
 return canvas;
}
function storedItem(id,base,slot,entries=null){
 const rows=entries||safeJson(STORE,[]);
 return Array.isArray(rows)?rows.find(x=>x?.id===id&&x.template_base===base&&x.category===slot):null;
}
function paintSlot(ctx,base,slot,dir,part="front",entries=null){
 const id=$("custom-"+slot)?.value||"";
 if(!id)return;
 const p=selectedPreset(id,base,slot);
 const item=p?null:storedItem(id,base,slot,entries);
 let src=null,hex=null;
 if(p){src=part==="back"?p.back_sheet:p.sheet;hex=color(slot);}
 else if(item){src=(part==="back"?item.back_frames:item.frames)?.[dir];}
 if(!src)return;
 const entry=imageFor(p?srcFor(src):src);
 if(!entry?.ready)return;
 const im=entry.pic,at=DIRS.indexOf(dir);
 if(p&&im.naturalWidth===256&&im.naturalHeight===112){
  const recolored=frameOf(im,at,hex);ctx.drawImage(recolored,0,0);
 }else if(item&&im.naturalWidth===64&&im.naturalHeight===112){
  ctx.drawImage(im,0,0);
 }
}
function sourceForBase(base){
 return base==="astrofrich_base"?"media/astrofrich-base-sheet.png":
  "media/human-"+(base==="human_female_base"?"female":"male")+"-base-sheet.png";
}
function render(){
 const canvas=$("custom-preview");if(!canvas)return;
 const ctx=canvas.getContext("2d"),base=baseId();
 ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,64,112);
 const entry=imageFor(srcFor(sourceForBase(base))),index=DIRS.indexOf(direction);
 if(entry?.ready&&entry.pic.naturalWidth>=384&&entry.pic.naturalHeight>=4928){
  paintSlot(ctx,base,"bag",direction,"front");
  paintSlot(ctx,base,"hair",direction,"back");
  const body=document.createElement("canvas");
  body.width=64;body.height=112;
  const bodyCtx=body.getContext("2d",{willReadFrequently:true});
  bodyCtx.imageSmoothingEnabled=false;
  bodyCtx.drawImage(entry.pic,0,(4+index)*112,64,112,0,0,64,112);
  if(BASES.includes(base)&&root.VLUniversalBodyActions?.tintBase)
   root.VLUniversalBodyActions.tintBase(bodyCtx,{
    id:base,skinTone:$("custom-skin-tone").value});
  // Tint only the native skin, not the warm hair placed BEHIND that skin.
  ctx.drawImage(body,0,0);
  for(const slot of ["shoes","pants","shirt","hair","helmet"])
   paintSlot(ctx,base,slot,direction);
 }
 const title=($("custom-name")?.value.trim()||"NEW CHARACTER").toUpperCase();
 $("custom-preview-title").textContent=title+".SPR";
 $("custom-preview-status").textContent=(base==="human_male_base"?"MALE":
  base==="human_female_base"?"FEMALE":"ASTROFRICH")+
  " / "+direction.toUpperCase()+(!entry?.ready?" / LOADING BASE":
  " / MODEL + INDEPENDENT COLOR");
 for(const btn of document.querySelectorAll("[data-custom-dir]")){
  const active=btn.dataset.customDir===direction;
  btn.classList.toggle("selected",active);btn.setAttribute("aria-pressed",String(active));
 }
}
async function materializeSelected(base=baseId()){
 const selected={};if(!BASES.includes(base))return selected;
 let rows=safeJson(STORE,[]);
 if(!Array.isArray(rows))throw Error("Bad local wardrobe storage");
 rows=rows.slice();
 for(const slot of SLOTS){
  const id=$("custom-"+slot).value,p=selectedPreset(id,base,slot);
  if(!p)continue;
  const hex=color(slot),variant=p.id+"_c"+hex.slice(1);
  const existing=rows.find(x=>x.id===variant);
  if(!existing){
   const source=await readyImage(srcFor(p.sheet));
   const back=p.back_sheet?await readyImage(srcFor(p.back_sheet)):null;
   if(source.naturalWidth!==256||source.naturalHeight!==112||
    (back&&(back.naturalWidth!==256||back.naturalHeight!==112)))
    throw Error("Invalid native 4-view asset for "+p.name);
   const frames={},back_frames={};
   for(let i=0;i<4;i++){
    const canvas=frameOf(source,i,hex);
    frames[DIRS[i]]=canvas.toDataURL("image/png");
    if(frames[DIRS[i]].length>100000)throw Error("Wardrobe frame too large");
    if(back){
     back_frames[DIRS[i]]=frameOf(back,i,hex).toDataURL("image/png");
     if(back_frames[DIRS[i]].length>100000)throw Error("Back-hair frame too large");
    }
   }
   rows.push({id:variant,name:p.name+" / "+hex,category:slot,
    template_base:base,frames,...(back?{back_frames}:{}),
    size:[64,112],source:"native-wardrobe",model:p.id,
    color:hex,updated:Date.now()});
  }
  selected[slot]=variant;
 }
 if(Object.keys(selected).length){
  try{localStorage.setItem(STORE,JSON.stringify(rows));}
  catch{throw Error("Browser storage full. Could not save outfit colors.");}
 }
 return selected;
}
async function paintSaved(ctx,base,slot,part="front",dir="se",list=null){
 const id=$("custom-"+slot)?.value;
 if(!id)return;
 const p=selectedPreset(id,base,slot),item=storedItem(id,base,slot,list);
 if(p){
  const src=part==="back"?p.back_sheet:p.sheet;
  if(!src)return;
  const im=await readyImage(srcFor(src));
  ctx.drawImage(frameOf(im,DIRS.indexOf(dir),color(slot)),0,0);
 }else{
  const src=(part==="back"?item?.back_frames:item?.frames)?.[dir];
  if(src)ctx.drawImage(await readyImage(src),0,0);
 }
}
async function createPortrait(base=baseId()){
 const main=await readyImage(srcFor(sourceForBase(base)));
 if(main.naturalWidth<384||main.naturalHeight<4928)return null;
 const canvas=document.createElement("canvas");canvas.width=64;canvas.height=112;
 const ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=false;
 await paintSaved(ctx,base,"bag");
 await paintSaved(ctx,base,"hair","back");
 const body=document.createElement("canvas");
 body.width=64;body.height=112;
 const bodyCtx=body.getContext("2d",{willReadFrequently:true});
 bodyCtx.imageSmoothingEnabled=false;
 bodyCtx.drawImage(main,0,4*112,64,112,0,0,64,112);
 if(BASES.includes(base)&&root.VLUniversalBodyActions?.tintBase)
  root.VLUniversalBodyActions.tintBase(bodyCtx,{id:base,skinTone:$("custom-skin-tone").value});
 ctx.drawImage(body,0,0);
 for(const slot of ["shoes","pants","shirt","hair","helmet"])
  await paintSaved(ctx,base,slot);
 return canvas.toDataURL("image/png");
}
function restoreSaved(equipped,items){
 for(const slot of SLOTS){
  const item=items.find(x=>x.id===equipped[slot]&&x.category===slot);
  if(!item||item.source!=="native-wardrobe"||!item.model)continue;
  const option=$("custom-"+slot);
  if([...option.options].some(x=>x.value===item.model))
   option.value=item.model;
  if(HEX.test(item.color||""))setColor(slot,item.color);
 }
 render();
}
async function load(){
 try{
  const response=await fetch("./wardrobe-presets.json",{cache:"no-store"});
  if(!response.ok)throw Error("HTTP "+response.status);
  const manifest=await response.json();
  if(manifest.version<2||manifest.format!=="mahluk-hidup-native-wardrobe-v1"||
   manifest.frame?.join(",")!=="64,112"||
   manifest.directions?.join(",")!=="se,sw,ne,nw"||
   !Array.isArray(manifest.presets))throw Error("Invalid wardrobe manifest");
  presets=manifest.presets.filter(p=>
   typeof p.id==="string"&&
   /^preset_human_(male|female)_base_(hair|shirt|pants|shoes)_[a-z0-9_]+$/.test(p.id)&&
   BASES.includes(p.template_base)&&SLOTS.includes(p.category)&&
   PRESET_FILE.test(p.sheet)&&(!p.back_sheet||PRESET_FILE.test(p.back_sheet)));
  ready=presets.length>=40;
  $("custom-preset-status").textContent=presets.length+
   " NATIVE MODEL OPTIONS / SELECT MODEL AND COLOR SEPARATELY";
  addOptions();
  if(ready&&!$("custom-name").value.trim()&&
    SLOTS.every(s=>!$("custom-"+s).value))chooseStarter();
 }catch(e){
  error=String(e.message||e);
  $("custom-preset-status").textContent="MODEL LIBRARY UNAVAILABLE / "+error;
  render();
 }
}
for(const btn of document.querySelectorAll("[data-custom-dir]"))
 btn.addEventListener("click",()=>{direction=btn.dataset.customDir;render();});
for(const slot of SLOTS){
 const picker=$("custom-"+slot+"-color"),hex=$("custom-"+slot+"-hex");
 picker?.addEventListener("input",()=>setColor(slot,picker.value));
 hex?.addEventListener("change",()=>{if(!setColor(slot,hex.value))hex.value=color(slot);});
 $("custom-"+slot)?.addEventListener("change",()=>{setPaletteTarget(slot);render();});
 document.querySelector('[data-palette-slot="'+slot+'"]')?.addEventListener("click",()=>setPaletteTarget(slot));
}
for(const key of ["base","category","name","skin-tone","helmet","bag"]){
 const item=$("custom-"+key);
 if(item)item.addEventListener(key==="name"?"input":"change",()=>{if(key==="base"||key==="category")addOptions();render();});
}
root.addEventListener("storage",e=>{if(e.key===STORE)render();});
root.VLHumanWardrobe=Object.freeze({
 populate:addOptions,chooseStarter,presetsFor,restoreSaved,setPaletteColor,
 materializeSelected,createPortrait,render,refresh:render,
 BASE_FRAME,DIRS,SLOTS,get count(){return presets.length;},
 get ready(){return ready;},get error(){return error;}
});
setPaletteTarget("hair");load();
})(window);
