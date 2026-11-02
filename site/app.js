"use strict";

// Characters is a read-only playback viewer; its embedded Pixel Editor edits
// only approved Otis master parts and source frames, saving drafts locally.
const $ = (id) => document.getElementById(id);
const canvas = $("sprite-canvas");
const ctx = canvas.getContext("2d", { alpha: false });
ctx.imageSmoothingEnabled = false;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const DIRECTION_LABELS = ["SE", "SW", "NE", "NW"];
const PALETTE = [
  "#f8f6f0","#ffffff","#111111","#003b7a","#1642b5","#457fe5","#a9c5fa",
  "#cabde8","#ffdbad","#e0d6cd","#7d5542","#d6d6d6","#8183a5","#e88291",
  "#1645ae","#ffa434","#b98166","#f4d38f","#bccbeb","#84a4f3","#c0dc4a",
  "#d3e6c3","#536b75","#fa9d78","#85a51d","#a43d62","#d35441","#f3b4c7"
];

const state = {
  characters: [], selected: null, type: "all", query: "",
  mode: "walk", expression: null, motion: null, direction: "auto", autoDir: 0,
  playing: !prefersReducedMotion, frame: 0, lastFrameTime: 0,
  zoom: 4, bg: "#f8f6f0", grid: false, image: null, motionImage: null,
  faceImage: null, faceOverlay: null, blinkOverlay: null, archiveImage: null, lastBlink: 0,
  imageCache: new Map(), working: false
};

function setStatus(message) { $("status").textContent = message; }

function cachedImage(src, onReady) {
  if (!src) return null;
  if (state.imageCache.has(src)) {
    const cached = state.imageCache.get(src);
    if (cached.complete && cached.naturalWidth) onReady?.(cached);
    else if (onReady) cached.addEventListener("load", () => onReady(cached), { once: true });
    return cached;
  }
  const image = new Image();
  image.decoding = "async";
  image.onload = () => onReady?.(image);
  image.onerror = () => setStatus("ERROR: COULD NOT LOAD SPRITE.");
  state.imageCache.set(src, image);
  image.src = src;
  return image;
}

function prettyName(character) {
  return String(character?.name || "UNKNOWN").toUpperCase();
}

function matchingCharacters() {
  const query = state.query.trim().toLowerCase();
  return state.characters.filter(character =>
    (state.type === "all" || character.type === state.type) &&
    [character.name, character.id, character.type, character.outfit,
      character.hairstyle, character.description].join(" ").toLowerCase().includes(query)
  );
}

function selectCharacter(character) {
  if (!character) return;
  state.selected = character;
  renderAccessoryStorage();
  state.mode = "walk";
  state.expression = null;
  state.motion = null;
  state.frame = 0;
  state.autoDir = 0;
  state.image = null;
  state.motionImage = null;
  state.archiveImage = null;
  state.faceImage = null;
  state.faceOverlay = null;
  state.blinkOverlay = null;
  state.playing = !prefersReducedMotion;
  $("canvas-loading").hidden = false;

  $("canvas-name").textContent = character.id.toUpperCase() + ".SPR";
  $("character-name").textContent = prettyName(character);
  $("prop-type").textContent = String(character.type || "npc").toUpperCase();
  $("prop-bone-model").textContent = character.skeleton_profile || "UNASSIGNED";
  $("prop-bone-skin").textContent = character.bone_skin_ready ? "BOUND / QA" : "PENDING PARTS";
  const previewImage = character.thumbnail || character.poster;
  const inspector = $("inspector-thumb");
  inspector.closest(".inspector-art").classList.toggle("empty", !previewImage);
  if (previewImage) inspector.src = previewImage; else inspector.removeAttribute("src");
  inspector.alt = character.name + " pixel-art preview";
  const sheetLink = $("download-sheet");
  sheetLink.hidden = !character.sheet;
  if (character.sheet) {
    sheetLink.href = character.sheet;
    sheetLink.download = character.id + "_v6b_sheet.png";
  } else sheetLink.removeAttribute("href");
  const renderStatus = character.asset_status || "verified";
  const statusLabel = {"verified":"V6B / VERIFIED", "generated_preview":"GENERATED / PREVIEW",
    "source_only":"SOURCE ONLY / NOT RENDERED", "archive_still":"ARCHIVE / STILL ONLY"}[renderStatus] || renderStatus.toUpperCase();
  $("character-render-status").textContent = statusLabel;
  $("character-render-status").classList.toggle("is-source", renderStatus === "source_only");
  $("tab-faces").disabled = !(character.expressions?.length);
  $("tool-expressions").disabled = !(character.expressions?.length);
  $("open-source").href = character.folder_url;
  $("edit-pixels").hidden = character.id !== "legacy_otis" || !character.sheet;
  $("face-tab-count").textContent = String(character.expressions?.length || 0).padStart(2, "0");
  buildFaces(character);
  buildMotions(character);
  setInspectorTab("info");
  state.motion = character.motions?.find(m => m.id === "walk" && m.available) || null;
  syncPlaybackButton();
  syncDirectionButtons();
  syncTools();
  renderFileList(false);
  setStatus("OPEN: " + character.id.toUpperCase() + ".SPR");
  canvas.setAttribute("aria-label", character.name + " sprite — 4 walk directions");

  if (!character.sheet) {
    state.playing = false;
    syncPlaybackButton();
    $("canvas-loading").hidden = true;
    const imageSource = character.poster || character.thumbnail;
    if (imageSource) cachedImage(imageSource, image => {
      if (state.selected !== character) return;
      state.archiveImage = image;
      draw();
    });
    setStatus(character.id.toUpperCase() + " / SOURCE REGISTERED / NO NATIVE SPRITES");
    draw();
    return;
  }
  cachedImage(character.sheet, image => {
    if (state.selected !== character) return;
    state.image = image;
    $("canvas-loading").hidden = true;
    // Slow sprite loading must not override a FACE selection with WALK.
    if (state.mode === "face") { draw(); return; }
    const first = character.motions?.find(a => a.id === "walk" && a.available) ||
      character.motions?.find(a => a.id === "idle" && a.available) ||
      character.motions?.find(a => a.available);
    if (first) selectMotion(first);
    else {
      state.playing = false;
      syncPlaybackButton();
      draw();
    }
  });
}

function buildFaces(character) {
  const container = $("face-grid");
  container.replaceChildren();
  const faces = Array.isArray(character.expressions) ? character.expressions : [];
  $("face-count").textContent = String(faces.length).padStart(2, "0");

  for (const face of faces) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "face-option";
    button.setAttribute("aria-pressed", "false");
    button.title = face.label;
    const img = new Image();
    img.loading = "lazy";
    img.alt = "";
    img.src = face.portrait || face.sprite || face.image;
    const label = document.createElement("span");
    label.textContent = String(face.label).toUpperCase();
    button.append(img, label);
    button.addEventListener("click", () => selectFace(face));
    container.append(button);
  }
}

function buildMotions(character) {
  const grid = $("motion-grid");
  grid.replaceChildren();
  const choices = Array.isArray(character.motions) ? character.motions : [];
  const available = choices.filter(action => action.available);
  $("motion-tab-count").textContent = String(available.length).padStart(2, "0");
  $("motion-count").textContent = String(choices.length).padStart(2, "0");
  choices.forEach(action => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "motion-option";
    button.disabled = !action.available;
    button.title = action.available ? "Use " + action.name + " on " + character.name :
      action.name + " — needs an authored rig for this character";
    button.setAttribute("aria-pressed", "false");
    const glyph = document.createElement("span");
    glyph.textContent = action.available ? "▶" : "⌁";
    const label = document.createElement("strong");
    label.textContent = action.name;
    const tag = document.createElement("small");
    tag.textContent = action.available ? action.frames + " FR / " +
      (action.loop ? "LOOP" : "ONCE") : "NEEDS RIG";
    button.append(glyph,label,tag);
    button.addEventListener("click", () => selectMotion(action));
    grid.append(button);
  });
  $("motion-availability-note").textContent =
    available.length + " RIGGED  /  " + (choices.length - available.length) + " NEEDS WORK";
}

function syncMotionSelection() {
  const motions = state.selected?.motions || [];
  [...$("motion-grid").children].forEach((button,i) => {
    const active = motions[i] === state.motion && state.mode === "action";
    button.classList.toggle("active",active);
    button.setAttribute("aria-pressed",String(active));
  });
}

function selectMotion(action) {
  if (!state.selected || !action || !action.available) return;
  state.mode = "action";
  state.motion = action;
  // Keep the chosen facial expression when switching body motion. Native
  // v6b expression delta sheets cover EVERY authored animation row.
  state.faceImage = null;
  state.frame = 0;
  state.autoDir = 0;
  state.lastFrameTime = 0;
  state.playing = !prefersReducedMotion;
  state.motionImage = null;
  $("canvas-name").textContent = state.selected.id.toUpperCase() + " / " + action.id.toUpperCase();
  const character = state.selected;
  if (action.source === "custom" && action.sheet) {
    cachedImage(action.sheet, image => {
      if (state.selected !== character || state.motion !== action) return;
      state.motionImage = image;
      draw();
    });
  }
  $("motion-expression-active").textContent = "FACE: " +
    (state.expression?.label?.toUpperCase() || "NEUTRAL") +
    (state.expression?.sheet ? " / IDLE PREVIEW ONLY." : " / SAME CHARACTER.");
  syncMotionSelection();
  syncPlaybackButton();
  syncTools();
  setStatus("MOTION: " + action.id.toUpperCase() + " / " + character.id.toUpperCase());
  draw();
}

function selectFace(face) {
  if (!state.selected || !face) return;
  state.mode = "face";
  state.expression = face;
  // Expression pixels only exist on the front SE/SW source views. Show a
  // visible face immediately instead of staying on an automatic/rear view.
  if (face.sheet && (state.direction === "auto" || Number(state.direction) >= 2)) {
    state.direction = "0";
    syncDirectionButtons();
  }
  state.faceImage = null;
  state.faceOverlay = null;
  state.blinkOverlay = null;
  state.frame = 0;
  state.autoDir = 0;
  state.lastFrameTime = 0;
  state.lastBlink = 0;
  state.playing = !prefersReducedMotion;
  $("canvas-name").textContent = state.selected.id.toUpperCase() + " / " +
    face.id.toUpperCase() + ".FACE";
  const character = state.selected;
  // Source-authored Gfunk / Theodore / Yerbies expression loops are full
  // same-character 4-direction sprites, not generic v6b facial deltas.
  if (face.sheet) cachedImage(face.sheet, image => {
    if (state.selected !== character || state.expression !== face) return;
    state.faceImage = image;
    draw();
  });
  const overlay = face.overlay;
  if (overlay) cachedImage(overlay, image => {
    if (state.selected !== character || state.expression !== face) return;
    state.faceOverlay = image;
    draw();
  });
  const blink = character.expressions?.find(x => x.id === "blink");
  if (blink?.overlay) cachedImage(blink.overlay, image => {
    if (state.selected !== character || state.expression !== face) return;
    state.blinkOverlay = image;
    draw();
  });
  [...$("face-grid").children].forEach((button,index) => {
    const active = character.expressions[index] === face;
    button.classList.toggle("active",active);
    button.setAttribute("aria-pressed",String(active));
  });
  $("motion-expression-active").textContent = "FACE: " + face.label.toUpperCase() +
    (face.sheet ? " / ORIGINAL IDLE LOOP + BLINK." : " / ACTIVE ON NATIVE MOTIONS.");
  syncMotionSelection();
  syncPlaybackButton();
  syncTools();
  setStatus("ANIMATED FACE: " + face.label.toUpperCase());
  draw();
}

function startWalking() {
  if (!state.selected) return;
  if (!state.selected.sheet) return setStatus("SOURCE ONLY / NO WALK SPRITES");
  if (!state.selected.motions?.some(m=>m.id==="walk" && m.available))
    return setStatus("NO AUTHORED WALK FOR THIS CHARACTER");
  const motion = state.selected.motions?.find(m => m.id === "walk" && m.available);
  if (motion) return selectMotion(motion);
  state.mode = "walk";
  state.playing = !prefersReducedMotion;
  state.frame = 0;
  syncPlaybackButton();
  draw();
}

function togglePlayback() {
  if (!state.selected || !state.selected.sheet) return;
  // Replay the completed one-shot action when clicking PLAY.
  if (state.mode === "action" && !state.playing && state.motion?.loop === false &&
      state.frame >= state.motion.frames - 1) {
    state.frame = 0;
  }
  state.playing = !state.playing;
  state.lastFrameTime = 0;
  syncPlaybackButton();
  syncTools();
  setStatus(state.playing ? "PLAYING." : "PAUSED.");
  draw();
}

function syncPlaybackButton() {
  const b = $("play-toggle");
  b.innerHTML = state.playing ? "Ⅱ <span>PAUSE</span>" : "▶ <span>PLAY</span>";
  b.setAttribute("aria-pressed",String(state.playing));
}

function setDirection(value) {
  state.direction = value;
  state.autoDir = value === "auto" ? 0 : Number(value);
  state.frame = 0;
  state.lastFrameTime = 0;
  syncDirectionButtons();
  setStatus("DIRECTION: " + (value === "auto" ? "AUTO" : DIRECTION_LABELS[Number(value)]));
  draw();
}

function syncDirectionButtons() {
  document.querySelectorAll(".dir").forEach(button => {
    const active = button.dataset.dir === state.direction;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}


/* Accessory V1: local, 4-view overlays on original 64x112 sprites.
   Never rewrite NPC atlases. Storage is browser-local until exported. */
const ACCESSORY_STORE="virtual-life-accessories-v1";
const ACCESSORY_EQUIP="virtual-life-accessory-equipment-v1";
const accessoryRuntime={items:[],equipment:{}};
function readAccessoryJson(key,fallback){
 try{const value=JSON.parse(localStorage.getItem(key));return value??fallback}
 catch(error){return fallback}
}
function refreshAccessoryEquipment(){
 const stored=readAccessoryJson(ACCESSORY_STORE,[]);
 accessoryRuntime.items=Array.isArray(stored)?stored.filter(x=>x&&typeof x.id==="string"&&
  (x.category==="helmet"||x.category==="bag")&&x.frames):[];
 const equipment=readAccessoryJson(ACCESSORY_EQUIP,{});
 accessoryRuntime.equipment=equipment&&typeof equipment==="object"?equipment:{};
 renderAccessoryStorage();
 populateCustomAccessories();
 renderCustomStorage();
 draw();
}
window.VirtualLifeAccessoryRefresh=refreshAccessoryEquipment;
function accessoryFor(actor,category){
 const id=accessoryRuntime.equipment[actor]?.[category];
 return accessoryRuntime.items.find(item=>item.id===id&&item.category===category);
}
function drawEquippedAccessory(x,y,z,dirIndex){
 if(!state.selected)return;
 const dirs=["se","sw","ne","nw"];
 for(const category of ["bag","helmet"]){
  const item=accessoryFor(state.selected.id,category),src=item?.frames?.[dirs[dirIndex]];
  if(typeof src!=="string"||!src.startsWith("data:image/png;base64,")||src.length>100000)continue;
  let image=state.imageCache.get(src);
  if(!image)image=cachedImage(src,()=>draw());
  if(image?.complete&&image.naturalWidth===64&&image.naturalHeight===112){
   ctx.imageSmoothingEnabled=false;ctx.drawImage(image,x,y,64*z,112*z);
  }
 }
}
function renderAccessoryStorage(){
 const list=$("accessory-storage-list");if(!list)return;
 list.replaceChildren();
 const actor=state.selected?.id||"";
 const current=accessoryRuntime.equipment[actor]||{};
 if(!accessoryRuntime.items.length){
  const empty=document.createElement("p");empty.className="accessory-note";
  empty.textContent="STORAGE EMPTY. CUSTOM HELM OR TAS TO START.";list.append(empty);
 }
 for(const item of accessoryRuntime.items){
  const row=document.createElement("div");row.className="accessory-item";
  const name=document.createElement("div");name.className="accessory-name";
  name.textContent=item.name||"UNNAMED ACCESSORY";
  const meta=document.createElement("small");meta.textContent=(item.category==="helmet"?"HELM":"TAS")+" / 4 VIEW / LOCAL STORAGE";
  name.append(meta);
  const button=document.createElement("button");button.className="chrome-button";
  const active=current[item.category]===item.id;
  button.textContent=active?"REMOVE":"+ WEAR";
  button.classList.toggle("equipped",active);
  button.disabled=!state.selected?.sheet;
  button.onclick=()=>{
   const all=readAccessoryJson(ACCESSORY_EQUIP,{});
   const slots={...(all[actor]||{})};
   if(active)delete slots[item.category];else slots[item.category]=item.id;
   all[actor]=slots;
   try{localStorage.setItem(ACCESSORY_EQUIP,JSON.stringify(all))}
   catch(e){setStatus("EQUIPMENT STORAGE FULL");return}
   refreshAccessoryEquipment();
   setStatus((active?"REMOVED ":"EQUIPPED ")+(item.name||"ACCESSORY")+" ON "+actor.toUpperCase());
  };
  row.append(name,button);list.append(row);
 }
 const count=["helmet","bag"].map(k=>current[k]? (k==="helmet"?"HELM":"TAS")+": "+(accessoryRuntime.items.find(x=>x.id===current[k])?.name||"NONE"):"").filter(Boolean);
 $("accessory-equipped").textContent=count.length?"EQUIPPED / "+count.join(" · "):"NO ACCESSORIES ATTACHED TO "+(actor||"CHARACTER").toUpperCase();
}
function openAccessoryEditor(category){
 if(!["helmet","bag"].includes(category))return;
 const overlay=$("pixel-editor-overlay");
 overlay.hidden=false;document.body.classList.add("pixel-editor-open");
 $("pixel-editor-heading-title").textContent="AKSESORIS / "+(category==="helmet"?"CUSTOM HELM":"CUSTOM TAS")+" — PAINT";
 const url=new URL("./accessory-editor.html",window.location.href);
 url.searchParams.set("embedded","1");url.searchParams.set("actor",state.selected?.id||"legacy_theodore");
 url.searchParams.set("category",category);url.searchParams.set("version","accessories-v1");
 url.searchParams.set("refresh",String(Date.now()));
 $("pixel-editor-embed").src=url.href;$("close-pixel-editor").focus();
}


/* Astrofrich Custom Characters: immutable original base sprite + equipment
   references. Saved characters inherit all source-authored motions/faces. */
const CHAR_STORAGE="virtual-life-character-storage-v1";
let catalogCharacters=[],workingCustomId=null;
function savedCustomCharacters(){
 const rows=readAccessoryJson(CHAR_STORAGE,[]);
 return Array.isArray(rows)?rows.filter(x=>x&&typeof x.id==="string"&&
  /^custom_astro_[a-z0-9-]+$/.test(x.id)&&typeof x.name==="string"&&
  x.name.length<=40&&x.base==="astrofrich_base").slice(0,60):[];
}
function baseAstrofrich(){return catalogCharacters.find(x=>x.id==="astrofrich_base")||null;}
function hydrateCharacter(row,base){
 return {...base,id:row.id,name:row.name,type:"npc",template:false,
  template_category:"astrofrich",custom_character:true,base_id:base.id,
  description:"Astrofrich · "+row.name+" · modular 4-view equipment · original motion & expression atlas"};
}
function rebuildCustomCharacters(){
 const base=baseAstrofrich(),oldId=state.selected?.id;
 state.characters=[...catalogCharacters,
  ...(base?savedCustomCharacters().map(row=>hydrateCharacter(row,base)):[])];
 const updated=state.characters.find(x=>x.id===oldId);
 if(updated&&state.selected?.custom_character)state.selected=updated;
 const total=String(state.characters.length).padStart(2,"0");
 $("asset-total").textContent=total;$("status-asset-count").textContent=total;
 renderCustomStorage();renderFileList(false);
}
function populateCustomAccessories(){
 const selectedHelmet=$("custom-helmet").value,selectedBag=$("custom-bag").value;
 for(const [id,kind,active] of [["custom-helmet","helmet",selectedHelmet],["custom-bag","bag",selectedBag]]){
  const select=$(id);select.replaceChildren();
  const blank=document.createElement("option");blank.value="";blank.textContent=kind==="helmet"?"— NO HELMET —":"— NO BAG —";
  select.append(blank);
  for(const a of accessoryRuntime.items.filter(x=>x.category===kind)){
   const option=document.createElement("option");option.value=a.id;option.textContent=a.name||"UNNAMED";
   select.append(option);
  }
  select.value=Array.from(select.options).some(x=>x.value===active)?active:"";
 }
 const base=baseAstrofrich();
 $("custom-animation-count").textContent=base?
  "ASTROFRICH · "+base.motions.filter(x=>x.available).length+" ANIMATIONS · "+
   base.expressions.length+" EXPRESSIONS · 4 DIRECTIONS":
  "ASTROFRICH TEMPLATE LOADING";
}
function editCustomCharacter(id){
 const row=savedCustomCharacters().find(x=>x.id===id);if(!row)return;
 workingCustomId=row.id;
 $("custom-name").value=row.name;
 const equipped=accessoryRuntime.equipment[row.id]||{};
 populateCustomAccessories();
 $("custom-helmet").value=equipped.helmet||"";
 $("custom-bag").value=equipped.bag||"";
 setInspectorTab("custom");
 setStatus("EDIT CUSTOM CHAR: "+row.name.toUpperCase());
}
function resetCustomForm(){
 workingCustomId=null;$("custom-name").value="";
 $("custom-category").value="astrofrich";$("custom-base").value="astrofrich_base";
 populateCustomAccessories();
 $("custom-helmet").value="";$("custom-bag").value="";
}
function saveCustomCharacter(){
 const base=baseAstrofrich();
 if(!base){setStatus("ASTROFRICH BASE NOT YET AVAILABLE");return}
 const name=$("custom-name").value.trim().replace(/\s+/g," ").slice(0,40);
 if(!name){setStatus("ENTER A CHARACTER NAME BEFORE SAVING");$("custom-name").focus();return}
 if(savedCustomCharacters().length>=60&&!workingCustomId){setStatus("CHARACTER STORAGE LIMIT: 60");return}
 const rows=savedCustomCharacters();
 let id=workingCustomId;
 if(!id||!rows.some(x=>x.id===id)){
  id="custom_astro_"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6);
 }
 const record={id,name,base:"astrofrich_base",category:"astrofrich",updated:Date.now()};
 const index=rows.findIndex(x=>x.id===id);
 if(index<0)rows.unshift(record);else rows[index]=record;
 const slots={helmet:$("custom-helmet").value,bag:$("custom-bag").value};
 const equipment=readAccessoryJson(ACCESSORY_EQUIP,{});
 equipment[id]={...slots};
 try{
  localStorage.setItem(CHAR_STORAGE,JSON.stringify(rows));
  localStorage.setItem(ACCESSORY_EQUIP,JSON.stringify(equipment));
 }catch(error){setStatus("CHARACTER STORAGE FULL · EXPORT ACCESSORIES AND CLEAR OLD ITEMS");return}
 workingCustomId=id;
 accessoryRuntime.equipment=equipment;
 rebuildCustomCharacters();
 const character=state.characters.find(x=>x.id===id);
 if(character){selectCharacter(character);setInspectorTab("custom")}
 setStatus("SAVED "+name.toUpperCase()+" TO CHARACTER STORAGE · "+
  base.motions.filter(x=>x.available).length+" MOTIONS / "+base.expressions.length+" FACES / 4 DIRECTIONS");
}
function deleteCustomCharacter(id){
 const character=savedCustomCharacters().find(x=>x.id===id);
 if(!character||!confirm("Delete custom character "+character.name+"? Accessory assets remain in Storage."))return;
 const rows=savedCustomCharacters().filter(x=>x.id!==id);
 const equipment=readAccessoryJson(ACCESSORY_EQUIP,{});
 delete equipment[id];
 try{localStorage.setItem(CHAR_STORAGE,JSON.stringify(rows));
  localStorage.setItem(ACCESSORY_EQUIP,JSON.stringify(equipment));}
 catch(error){setStatus("STORAGE ERROR");return}
 if(workingCustomId===id)resetCustomForm();
 if(state.selected?.id===id){const base=baseAstrofrich();if(base)selectCharacter(base)}
 accessoryRuntime.equipment=equipment;rebuildCustomCharacters();
 setStatus("DELETED CUSTOM CHARACTER · ACCESSORIES RETAINED");
}
function renderCustomStorage(){
 const list=$("custom-storage-list");if(!list)return;
 list.replaceChildren();
 const rows=savedCustomCharacters();
 if(!rows.length){
  const p=document.createElement("p");p.className="accessory-note";
  p.textContent="NO CUSTOM CHARACTERS YET. ENTER A NAME TO SAVE AN ASTROFRICH.";list.append(p);
 }
 for(const row of rows){
  const node=document.createElement("div");node.className="custom-item";
  const heading=document.createElement("strong");heading.textContent=row.name;
  const meta=document.createElement("small");meta.textContent="ASTROFRICH · 7 MOTIONS · 5 FACES";
  heading.append(meta);
  const open=document.createElement("button");open.type="button";open.className="chrome-button";
  open.textContent="OPEN";open.onclick=()=>{
   const actor=state.characters.find(x=>x.id===row.id);
   if(actor)selectCharacter(actor);
   editCustomCharacter(row.id);
  };
  const del=document.createElement("button");del.type="button";del.className="chrome-button";
  del.textContent="×";del.setAttribute("aria-label","Delete "+row.name);
  del.onclick=()=>deleteCustomCharacter(row.id);
  node.append(heading,open,del);list.append(node);
 }
}

function setInspectorTab(tab) {
  const isFace = tab === "faces";
  const isMotion = tab === "motions";
  const isAccessories = tab === "accessories";
  const isCustom = tab === "custom";
  $("info-panel").hidden = isFace || isMotion || isAccessories || isCustom;
  $("faces-panel").hidden = !isFace;
  $("motions-panel").hidden = !isMotion;
  $("accessories-panel").hidden = !isAccessories;
  $("custom-char-panel").hidden = !isCustom;
  for (const [id,active] of [["tab-info", !isFace && !isMotion && !isAccessories && !isCustom],
                             ["tab-faces", isFace], ["tab-motions", isMotion],
                             ["tab-accessories", isAccessories],["tab-custom-char",isCustom]]) {
    $(id).classList.toggle("active",active);
    $(id).setAttribute("aria-selected",String(active));
  }
  if (isFace && state.selected && state.selected.expressions?.length && state.mode !== "face") {
    // A selected facial expression persists across MOTION, but its preview
    // sprites are reloaded when returning to FACE (including custom atlases).
    selectFace(state.expression || state.selected.expressions[0]);
  }
  if (isMotion && state.selected && state.mode === "face") {
    const choice = state.motion?.available ? state.motion :
      state.selected.motions?.find(m => m.id === "walk" && m.available);
    if (choice) selectMotion(choice);
  }
  if(isAccessories)renderAccessoryStorage();
  if(isCustom){populateCustomAccessories();renderCustomStorage();}
  syncTools();
}

function syncTools() {
  $("tool-select").classList.toggle("active", $("info-panel").hidden === false);
  $("tool-select").setAttribute("aria-pressed", String($("info-panel").hidden === false));
  $("tool-expressions").classList.toggle("active", !$("faces-panel").hidden);
  $("tool-grid").classList.toggle("active",state.grid);
  $("tool-grid").setAttribute("aria-pressed",String(state.grid));
  $("tool-walk").classList.toggle("active",state.playing && state.mode !== "face");
  $("tool-walk").disabled = !state.selected?.motions?.some(m=>m.id==="walk"&&m.available);
}

function applyZoom(next) {
  state.zoom = Math.max(2, Math.min(5, next));
  $("zoom-label").textContent = state.zoom + "X";
  draw();
  setStatus("ZOOM: " + state.zoom + "X");
}

function toggleGrid() {
  state.grid = !state.grid;
  $("canvas-space").classList.toggle("grid-on", state.grid);
  syncTools();
  setStatus(state.grid ? "GRID: ON" : "GRID: OFF");
}

function selectNext(step) {
  const matches = matchingCharacters();
  if (!matches.length) return;
  let index = matches.indexOf(state.selected);
  index = (index + step + matches.length) % matches.length;
  selectCharacter(matches[index]);
}

function renderFileList(pickFirst = true) {
  const characters = matchingCharacters();
  const list = $("file-list");
  const fragment = document.createDocumentFragment();
  $("file-count").textContent = String(characters.length).padStart(2, "0");
  $("asset-current-count").textContent = String(characters.length).padStart(2, "0");

  if (!characters.length) {
    const empty = document.createElement("p");
    empty.className = "file-empty";
    empty.textContent = "NO FILES.";
    fragment.append(empty);
  }
  characters.forEach((character, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "file-item";
    button.setAttribute("role", "option");
    const active = character === state.selected;
    button.classList.toggle("chosen", active);
    button.setAttribute("aria-selected", String(active));
    button.title = character.name;

    const preview = document.createElement("span");
    preview.className = "file-preview";
    const image = new Image();
    image.loading = index < 4 ? "eager" : "lazy";
    image.alt = "";
    if (character.thumbnail || character.poster) {
      image.src = character.thumbnail || character.poster;
      preview.append(image);
    } else {
      preview.classList.add("file-source-only");
      preview.textContent = "SRC";
    }
    const label = document.createElement("span");
    label.className = "file-label";
    label.textContent = String(character.name).toUpperCase();
    const small = document.createElement("small");
    const condition = character.asset_status === "source_only" ? "SOURCE" :
      character.asset_status === "archive_still" ? "STILL" :
      character.asset_status === "generated_preview" ? "PREVIEW" : (character.type || "npc").toUpperCase();
    small.textContent = condition + " / " + String(index + 1).padStart(3, "0");
    label.append(small);
    button.append(preview, label);
    button.addEventListener("click", () => selectCharacter(character));
    fragment.append(button);
  });
  list.replaceChildren(fragment);
  if (pickFirst && characters.length && !characters.includes(state.selected)) {
    selectCharacter(characters[0]);
  }
  if (pickFirst && !characters.length) {
    setStatus("NO MATCHING FILES.");
  }
}

function drawFaceCloseup(image, direction, frame, label) {
  // Pixel-perfect magnifier uses the selected actor's real face atlas.
  // The body remains in the center; the visible expression has a close-up.
  if (direction > 1) return; // Rear-view source contains no facial features.
  const sourceX = frame * 64 + 17, sourceY = direction * 112 + 30;
  const cropW = 31, cropH = 32, scale = 5;
  const left = canvas.width - cropW * scale - 13, top = 36;
  ctx.fillStyle = "#f8f6f0";
  ctx.fillRect(left - 6, top - 21, cropW * scale + 12, cropH * scale + 44);
  ctx.strokeStyle = "#8492a9";
  ctx.lineWidth = 1;
  ctx.strokeRect(left - 6.5, top - 21.5, cropW * scale + 13, cropH * scale + 45);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, sourceX, sourceY, cropW, cropH,
    left, top, cropW * scale, cropH * scale);
  ctx.fillStyle = "#173b85";
  ctx.textAlign = "left";
  ctx.font = "bold 10px monospace";
  ctx.fillText("FACE: " + label.toUpperCase(), left, top - 7);
  ctx.font = "9px monospace";
  ctx.fillText("5X PIXEL DETAIL", left, top + cropH * scale + 14);
}

function draw() {
  const w = canvas.width, h = canvas.height;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = state.bg;
  ctx.fillRect(0,0,w,h);
  if (!state.selected) {
    ctx.fillStyle = "#153fa0";
    ctx.font = "bold 17px monospace";
    ctx.textAlign = "center";
    ctx.fillText("OPEN A FILE.",w/2,h/2);
    return;
  }
  const z = state.zoom, x = Math.round((w-64*z)/2), y = Math.round((h-112*z)/2)-9;
  if (!state.selected.sheet) {
    if (state.archiveImage?.naturalWidth) {
      const source = state.archiveImage, aspect = source.width / source.height;
      const h0 = Math.min(h - 60, 310), w0 = Math.min(w - 50,h0 * aspect);
      ctx.drawImage(source,(w-w0)/2,(h-h0)/2,w0,h0);
    } else {
      ctx.fillStyle = "#1c3d80"; ctx.font = "bold 17px monospace"; ctx.textAlign="center";
      ctx.fillText("SOURCE REGISTERED",w/2,h/2-10);
      ctx.font="12px monospace"; ctx.fillText("NO REVIEWABLE SPRITE YET",w/2,h/2+15);
    }
    return;
  }
  ctx.fillStyle = "#161b2640";
  ctx.beginPath();
  ctx.ellipse(x+32*z,y+100*z+6,27*z,Math.max(4,5*z),0,0,Math.PI*2);
  ctx.fill();

  const d = state.direction === "auto" ? state.autoDir : Number(state.direction);
  if (state.image?.complete && state.image.naturalWidth) {
    if (state.mode === "face") {
      // Actual character's own 4-frame idle / blink and expression overlays,
      // not the original Ichsan character or a photograph/video filter.
      const row = (state.selected.row_starts?.idle ?? 4) + d;
      const col = state.frame % Math.max(1,state.selected.idle_frames || 4);
      if (state.expression?.sheet) {
        if (state.faceImage?.naturalWidth) {
          ctx.drawImage(state.faceImage,state.frame*64,d*112,64,112,x,y,64*z,112*z);
          drawFaceCloseup(state.faceImage,d,state.frame,state.expression.label);
          drawEquippedAccessory(x,y,z,d);
        } else {
          ctx.fillStyle = "#173b85";
          ctx.font = "bold 13px monospace";
          ctx.textAlign = "center";
          ctx.fillText("LOADING " + state.expression.label.toUpperCase() + " FACE...",w/2,h/2);
        }
        return;
      }
      ctx.drawImage(state.image,col*64,row*112,64,112,x,y,64*z,112*z);
      if (state.faceOverlay?.naturalWidth) {
        ctx.drawImage(state.faceOverlay,col*64,row*112,64,112,x,y,64*z,112*z);
      }
      // A blink is applied as a second facial delta at a predictable interval.
      const blinking = state.playing && state.expression?.id !== "blink" &&
        state.blinkOverlay?.naturalWidth && state.lastBlink === 1;
      if (blinking) {
        ctx.drawImage(state.blinkOverlay,col*64,row*112,64,112,x,y,64*z,112*z);
      }
    } else {
      const motion = state.motion;
      const custom = state.mode === "action" && motion?.source === "custom";
      const source = custom ? state.motionImage : state.image;
      if (source?.naturalWidth) {
        const row = (motion?.row ?? 0) + d;
        ctx.drawImage(source,state.frame*64,row*112,64,112,x,y,64*z,112*z);
        // Expression blend is pixel-aligned on the selected actor's native
        // 44-row sheet; never apply original-row deltas onto unrelated custom rigs.
        if (!custom && state.expression && state.faceOverlay?.naturalWidth) {
          ctx.drawImage(state.faceOverlay,state.frame*64,row*112,64,112,x,y,64*z,112*z);
          if (state.expression.id !== "blink" && state.lastBlink === 1 &&
              state.blinkOverlay?.naturalWidth) {
            ctx.drawImage(state.blinkOverlay,state.frame*64,row*112,64,112,x,y,64*z,112*z);
          }
        }
      }
    }
  }
  drawEquippedAccessory(x,y,z,d);
}

function tick(time) {
  if (state.playing && state.image?.naturalWidth) {
    if (!state.lastFrameTime) state.lastFrameTime = time;
    let frames, duration, done, loop;
    if (state.mode === "face") {
      frames = state.expression?.frames || state.selected?.idle_frames || 4;
      duration = state.expression?.frame_ms?.[state.frame] || 210;
      loop = true;
      state.lastBlink = Math.floor(time / 200) % 24 === 19 ? 1 : 0;
    } else {
      const motion = state.motion;
      frames = motion?.frames || 6;
      duration = motion?.frame_ms?.[state.frame] || 145;
      loop = motion?.loop ?? true;
      state.lastBlink = state.expression && Math.floor(time / 200) % 24 === 19 ? 1 : 0;
    }
    if (time-state.lastFrameTime >= duration) {
      state.lastFrameTime = time;
      if (state.frame + 1 >= frames) {
        if (loop) {
          state.frame = 0;
          if (state.mode !== "face" && state.direction === "auto") {
            state.autoDir = (state.autoDir+1)%4;
          }
        } else {
          state.frame = frames-1;
          state.playing = false;
          syncPlaybackButton();
        }
      } else state.frame++;
    }
    draw();
  }
  requestAnimationFrame(tick);
}

function saveCanvasPNG(out, name) {
  // User-initiated local export; no source sprites uploaded to any server.
  const link = document.createElement("a");
  link.download = name;
  link.href = out.toDataURL("image/png");
  document.body.append(link);
  link.click();
  link.remove();
}

function exportActionSheet() {
  const action = state.motion || state.selected?.motions?.find(m => m.id === "walk");
  if (!state.selected || !action?.available || !state.image?.naturalWidth) {
    setStatus("MOTION NOT RIGGED FOR THIS CHARACTER.");
    return;
  }
  const source = action.source === "custom" ? state.motionImage : state.image;
  if (!source?.naturalWidth) return setStatus("ACTION SPRITE NOT YET LOADED.");
  const out = document.createElement("canvas");
  out.width = 64 * action.frames;
  out.height = 112 * 4;
  const context = out.getContext("2d");
  context.imageSmoothingEnabled = false;
  for (let dir = 0; dir < 4; dir++) for (let frame = 0; frame < action.frames; frame++) {
    context.drawImage(source, frame * 64, (action.row + dir) * 112, 64, 112,
      frame * 64, dir * 112, 64, 112);
    if (action.source === "native" && state.expression && state.faceOverlay?.naturalWidth) {
      context.drawImage(state.faceOverlay,frame*64,(action.row+dir)*112,64,112,
        frame*64,dir*112,64,112);
      if (!customFace && state.expression.id !== "blink" && frame === 2 && state.blinkOverlay?.naturalWidth)
        context.drawImage(state.blinkOverlay,frame*64,(action.row+dir)*112,64,112,
          frame*64,dir*112,64,112);
    }
  }
  saveCanvasPNG(out, state.selected.id + "_" + action.id + "_4dir.png");
  setStatus("EXPORTED: " + action.id.toUpperCase() + " / " + state.selected.id.toUpperCase());
}

function exportFaceSheet() {
  if (!state.selected || !state.expression || !state.image?.naturalWidth) return;
  const customFace = Boolean(state.expression.sheet);
  const frames = customFace ? state.expression.frames : state.selected.idle_frames || 4;
  if (customFace && !state.faceImage?.naturalWidth) {
    return setStatus("FACE SPRITES NOT YET LOADED.");
  }
  const out = document.createElement("canvas");
  out.width = frames * 64;
  out.height = 112 * 4;
  const context = out.getContext("2d");
  context.imageSmoothingEnabled = false;
  for (let dir = 0; dir < 4; dir++) {
    for (let frame = 0; frame < frames; frame++) {
      const row = customFace ? dir : (state.selected.row_starts?.idle ?? 4) + dir;
      const sourceX = frame * 64, sourceY = row * 112;
      const x = frame * 64, y = dir * 112;
      context.drawImage(customFace ? state.faceImage : state.image,
        sourceX,sourceY,64,112,x,y,64,112);
      if (!customFace && state.faceOverlay?.naturalWidth)
        context.drawImage(state.faceOverlay,sourceX,sourceY,64,112,x,y,64,112);
      // Showcase the blink on frame 2 of the native idle breathing cycle.
      if (state.expression.id !== "blink" && frame === 2 && state.blinkOverlay?.naturalWidth)
        context.drawImage(state.blinkOverlay,sourceX,sourceY,64,112,x,y,64,112);
    }
  }
  saveCanvasPNG(out,state.selected.id + "_" + state.expression.id + "_face_4dir.png");
  setStatus("EXPORTED: ANIMATED FACE / " + state.expression.id.toUpperCase());
}

function renderPalette() {
  const grid = $("swatches");
  grid.replaceChildren();
  PALETTE.forEach((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swatch";
    button.style.backgroundColor = color;
    button.title = "Canvas background " + color;
    button.setAttribute("aria-label", "Canvas background " + color);
    button.setAttribute("aria-pressed", String(color === state.bg));
    button.classList.toggle("active", color === state.bg);
    button.addEventListener("click", () => {
      state.bg = color;
      $("canvas-space").style.setProperty("--canvas", color);
      $("current-color").style.backgroundColor = color;
      [...grid.children].forEach((other, i) => {
        const active = PALETTE[i] === color;
        other.classList.toggle("active", active);
        other.setAttribute("aria-pressed", String(active));
      });
      draw();
      setStatus("BACKGROUND: " + color.toUpperCase());
    });
    grid.append(button);
  });
  $("current-color").style.backgroundColor = state.bg;
}

document.querySelectorAll(".file-filter").forEach(button => {
  button.addEventListener("click", () => {
    state.type = button.dataset.filter;
    document.querySelectorAll(".file-filter").forEach(other => {
      const active = button === other;
      other.classList.toggle("selected", active);
      other.setAttribute("aria-pressed", String(active));
    });
    renderFileList();
  });
});
document.querySelectorAll(".dir").forEach(button => button.addEventListener("click",
  () => setDirection(button.dataset.dir)));

$("search").addEventListener("input", event => {
  state.query = event.target.value.toLowerCase();
  renderFileList();
});
$("edit-pixels").addEventListener("click", () => {
  if (state.selected?.id !== "legacy_otis") return;
  $("pixel-editor-heading-title").textContent="CHARACTER / PIXEL & MASTER PARTS EDITOR";
  const overlay = $("pixel-editor-overlay");
  overlay.hidden = false;
  document.body.classList.add("pixel-editor-open");
  // Resolve the editor from the ORIGINAL landing page and force its HTML to refresh.
  // Previous mobile tabs could reuse an outdated iframe with PAN-only controls.
  const editorUrl = new URL("./pixel-editor.html", window.location.href);
  editorUrl.searchParams.set("actor", "legacy_otis");
  editorUrl.searchParams.set("embedded", "1");
  editorUrl.searchParams.set("ui", "xp-mobile-fit-20261103-v3");
  editorUrl.searchParams.set("refresh", String(Date.now()));
  $("pixel-editor-embed").src = editorUrl.href;
  $("close-pixel-editor").focus();
});
async function closePixelEditor() {
  try{
    await $("pixel-editor-embed").contentWindow?.VirtualLifePixelEditor?.flush?.();
    await $("pixel-editor-embed").contentWindow?.VirtualLifeAccessoryEditor?.flush?.();
  }catch(error){setStatus("EDITOR DRAFT SAVE FAILED: EXPORT PNG BEFORE CLOSING");return;}
  $("pixel-editor-overlay").hidden = true;
  $("pixel-editor-embed").src = "about:blank";
  document.body.classList.remove("pixel-editor-open");
  refreshAccessoryEquipment();
  if (!$("edit-pixels").hidden) $("edit-pixels").focus();
}
$("close-pixel-editor").addEventListener("click", closePixelEditor);
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !$("pixel-editor-overlay").hidden) {
    event.stopImmediatePropagation();event.preventDefault();closePixelEditor();
  }
}, true);
$("play-toggle").addEventListener("click", togglePlayback);
$("tool-walk").addEventListener("click", startWalking);
$("tool-expressions").addEventListener("click", () => setInspectorTab("faces"));
$("tool-select").addEventListener("click", () => {
  setInspectorTab("info");
  $("file-list").focus();
});
$("tool-zoom-in").addEventListener("click", () => applyZoom(state.zoom + 1));
$("tool-zoom-out").addEventListener("click", () => applyZoom(state.zoom - 1));
$("tool-grid").addEventListener("click", toggleGrid);
$("tool-rewind").addEventListener("click", () => selectNext(-1));
$("tool-next").addEventListener("click", () => selectNext(1));
$("tab-info").addEventListener("click", () => setInspectorTab("info"));
$("tab-faces").addEventListener("click", () => setInspectorTab("faces"));
$("tab-motions").addEventListener("click", () => setInspectorTab("motions"));
$("tab-accessories").addEventListener("click", () => setInspectorTab("accessories"));
$("tab-custom-char").addEventListener("click", () => setInspectorTab("custom"));
$("custom-save").addEventListener("click",saveCustomCharacter);
$("custom-new").addEventListener("click",()=>{resetCustomForm();setInspectorTab("custom");});
$("custom-draw-helmet").addEventListener("click",()=>openAccessoryEditor("helmet"));
$("custom-draw-bag").addEventListener("click",()=>openAccessoryEditor("bag"));

$("make-helmet").addEventListener("click", () => openAccessoryEditor("helmet"));
$("make-bag").addEventListener("click", () => openAccessoryEditor("bag"));
window.addEventListener("storage",event=>{
 if(event.key===ACCESSORY_STORE||event.key===ACCESSORY_EQUIP)refreshAccessoryEquipment();
 if(event.key===CHAR_STORAGE)rebuildCustomCharacters();
});
$("export-motion").addEventListener("click", exportActionSheet);
$("export-face").addEventListener("click", exportFaceSheet);
$("menu-edit").addEventListener("click", () => setInspectorTab("faces"));
$("menu-view").addEventListener("click", toggleGrid);
$("return-walk").addEventListener("click", () => { startWalking(); setInspectorTab("info"); });

document.addEventListener("keydown", event => {
  if ($("character-workspace").hidden) return; // Rig Studio and Motion DB own their shortcuts.
  const target = event.target;
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (target instanceof HTMLElement && (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" || target.isContentEditable)) {
    if (event.key === "Escape" && target.id === "search") {
      target.value = "";
      state.query = "";
      renderFileList();
      target.blur();
    }
    return;
  }
  if (event.key === "/") { event.preventDefault(); $("search").focus(); }
  else if (event.code === "Space") { event.preventDefault(); togglePlayback(); }
  else if (event.key === "ArrowLeft") { event.preventDefault(); selectNext(-1); }
  else if (event.key === "ArrowRight") { event.preventDefault(); selectNext(1); }
  else if (event.key.toLowerCase() === "e") { setInspectorTab("faces"); }
  else if (event.key.toLowerCase() === "m") { setInspectorTab("motions"); }
  else if (event.key.toLowerCase() === "g") { toggleGrid(); }
  else if (event.key === "+") { applyZoom(state.zoom + 1); }
  else if (event.key === "-") { applyZoom(state.zoom - 1); }
});

async function init() {
  renderPalette();
  refreshAccessoryEquipment();
  syncPlaybackButton();
  draw();
  requestAnimationFrame(tick);
  try {
    const response = await fetch("./catalog.json", { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const payload = await response.json();
    if (!Array.isArray(payload.characters)) throw new Error("BAD CATALOG");
    catalogCharacters=payload.characters;
    state.characters=payload.characters;
    rebuildCustomCharacters();
    const total = String(state.characters.length).padStart(2, "0");
    $("asset-total").textContent = total;
    $("status-asset-count").textContent = total;
    populateCustomAccessories();
    renderFileList();
    if (!state.characters.length) {
      $("canvas-loading").hidden = true;
      setStatus("NO ASSETS YET.");
    }
  } catch (error) {
    $("canvas-loading").hidden = true;
    $("canvas-loading").textContent = "ERROR";
    $("canvas-loading").hidden = false;
    setStatus("CATALOG ERROR: " + error.message);
  }
}
init();
