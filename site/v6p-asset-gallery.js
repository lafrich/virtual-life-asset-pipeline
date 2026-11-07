/* Asset Gallery tab for Mahluk Hidup v6p studio, modelled on Semesta's Asset Library. */
(function(root){"use strict";
if(!root)return;
const $=id=>document.getElementById(id);
function catalog(){return root.V6PProjectCatalog;}
function partCatalog(){return root.V6PPartCatalog;}
let selected=null, query="", filter="user", timer=0;
function typeLabel(it){
 return ({accessory:"ACCESSORY",clip:"CUSTOM CLIP","part-edit":"EDITED PART",part:"BUILT-IN PART"})[it.type]||it.type;
}
function originLabel(it){
 return it.origin==="built-in"?"BUILT-IN":"USER";
}
function saveLabel(it){
 if(it.saveStatus==="drive")return "SAVED TO DRIVE";
 if(it.saveStatus==="stock")return "STOCK / GITHUB";
 if(it.type==="part-edit")return "LOCAL ONLY · STOCK UNTOUCHED";
 return "LOCAL ONLY";
}
function matches(it){
 const q=query.trim().toLowerCase();
 if(filter==="user"&&it.origin!=="user")return false;
 if(filter==="built-in"&&it.origin!=="built-in")return false;
 if(filter==="accessory"&&it.type!=="accessory")return false;
 if(filter==="clip"&&it.type!=="clip")return false;
 if(filter==="part-edit"&&it.type!=="part-edit")return false;
 if(!q)return true;
 return [it.name,it.type,it.part,it.compatibility,it.placement,it.id].join(" ").toLowerCase().includes(q);
}
function thumbSrc(it){
 if(it.thumbDataUrl)return it.thumbDataUrl;
 if(it.sheetDataUrl)return it.sheetDataUrl;
 if(it.part&&partCatalog()&&it.type==="part")return partCatalog().mediaUrl(it.part);
 return "";
}
function stopAnim(el){
 if(el&&el._clipTimer){clearTimeout(el._clipTimer);clearInterval(el._clipTimer);el._clipTimer=0;}
}
function animateClip(img,it){
 stopAnim(img);
 if(it.type!=="clip")return;
 if(it.manifest&&root.V6PCompositor&&root.V6PCompositor.composeActivity){
  const man=it.manifest;
  let f=0;
  const tick=async()=>{
   try{
    const ch=root.V6PCompositor.previewAppearance("male");
    const cv=await root.V6PCompositor.composeActivity(ch,man,f,"se");
    if(cv&&!cv._disabled) img.src=cv.toDataURL("image/png");
    const frames=man.frames||[{ms:it.frameMs||140}];
    f=(f+1)%Math.max(1,frames.length);
    const ms=(frames[f]&&frames[f].ms)||it.frameMs||140;
    img._clipTimer=setTimeout(tick,ms);
   }catch{}
  };
  tick();
  return;
 }
 if(!it.sheetDataUrl||!partCatalog())return;
 const C=partCatalog();
 const sheet=new Image();
 sheet.onload=()=>{
  const actions=(it.paintedActions&&it.paintedActions.length)?it.paintedActions:C.ACTIONS;
  const action=actions.includes("idle")?"idle":actions[0];
  if(!action||C.ROWS[action]==null)return;
  const nf=C.FRAMES[action]||4;
  const cv=document.createElement("canvas");cv.width=C.FW;cv.height=C.FH;
  const ctx=cv.getContext("2d");ctx.imageSmoothingEnabled=false;
  let f=0;
  const draw=()=>{
   ctx.clearRect(0,0,C.FW,C.FH);
   ctx.drawImage(sheet,f*C.FW,(C.ROWS[action]+0)*C.FH,C.FW,C.FH,0,0,C.FW,C.FH);
   img.src=cv.toDataURL("image/png");
   f=(f+1)%nf;
  };
  draw();
  img._clipTimer=setInterval(draw,it.frameMs||140);
 };
 sheet.src=it.sheetDataUrl;
}
function entries(){
 const clips=root.V6PClipStore?root.V6PClipStore.galleryEntries():[];
 const Cat=catalog();
 const rest=Cat?Cat.entries({includeBuiltIn:filter==="built-in"||filter==="all"||filter===""}).filter(e=>e.type!=="clip"||!clips.some(c=>c.id===e.id)):[];
 return clips.concat(rest);
}
function renderCards(){
 const gallery=$("vagGallery");
 if(!gallery)return;
 gallery.replaceChildren();
 const all=entries().filter(matches);
 $("vagCount").textContent=all.length+" ASET";
 if(!all.length){
  const note=document.createElement("p");
  note.className="vag-empty";
  note.textContent="Belum ada aset untuk filter ini. Buat aksesoris atau clip di Pixel Editor, atau edit part lalu kembali ke sini — tanpa import JSON.";
  gallery.append(note);
  return;
 }
 all.forEach(it=>{
  const b=document.createElement("button");
  b.type="button";b.className="vag-card"+(selected&&selected.id===it.id?" selected":"");
  b.setAttribute("data-id",it.id);
  const img=document.createElement("img");
  img.alt="";img.width=64;img.height=112;
  const src=thumbSrc(it);
  if(src)img.src=src;
  if(it.type==="clip")animateClip(img,it);
  const title=document.createElement("strong");title.textContent=it.name;
  const meta=document.createElement("small");meta.textContent=typeLabel(it)+" · "+originLabel(it);
  const save=document.createElement("small");save.className="vag-save";save.textContent=saveLabel(it);
  b.append(img,title,meta,save);
  b.onclick=()=>{selected=it;detail();renderCards();};
  gallery.append(b);
 });
}
function detail(){
 const it=selected;
 $("vagName").textContent=it?it.name:"Pilih aset";
 $("vagSource").textContent=it?(typeLabel(it)+" · "+originLabel(it)+" · "+saveLabel(it)):"";
 $("vagCompat").textContent=it?(it.compatibility||""):"";
 const hero=$("vagHero");hero.replaceChildren();
 if(it){
  const img=document.createElement("img");
  img.alt=it.name;img.width=128;img.height=224;
  const src=thumbSrc(it);
  if(src)img.src=src;
  if(it.type==="clip")animateClip(img,it);
  hero.append(img);
 }
 $("vagOpen").disabled=!it;
 $("vagWear").hidden=!it||it.type!=="accessory";
}
function openSelected(){
 if(!selected)return;
 const url=selected.openUrl||(catalog()&&catalog().editorUrl(selected));
 if(url)location.href=url;
}
function wearSelected(){
 if(!selected||selected.type!=="accessory")return;
 if(typeof root.__v6pWearAccessory==="function"){root.__v6pWearAccessory(selected.id);return;}
 const sel=$("studio-accessory");
 if(sel){
  if(![...sel.options].some(o=>o.value===selected.id)){
   const o=document.createElement("option");o.value=selected.id;o.textContent=selected.name+" ("+selected.placement+")";
   sel.append(o);
  }
  sel.value=selected.id;
  sel.dispatchEvent(new Event("change"));
 }
}
function refresh(){
 renderCards();
 detail();
}
function mount(){
 if(!catalog()||!$("vagGallery"))return;
 $("vagSearch").oninput=e=>{query=e.target.value;refresh();};
 $("vagFilter").onchange=e=>{filter=e.target.value;refresh();};
 $("vagOpen").onclick=openSelected;
 $("vagWear").onclick=wearSelected;
 $("vagRefresh").onclick=refresh;
 window.addEventListener("storage",e=>{
  if(e.key===catalog().KEY||e.key===(root.V6PPartOverrides&&root.V6PPartOverrides.KEY)||e.key===(root.V6PClipStore&&root.V6PClipStore.KEY))refresh();
 });
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh();});
 refresh();
}
root.V6PAssetGallery={mount,refresh};
})(typeof window!=="undefined"?window:null);
