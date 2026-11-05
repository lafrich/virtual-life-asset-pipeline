"use strict";

// Characters is a read-only playback viewer; its embedded Pixel Editor edits
// only approved Otis master parts and source frames, saving drafts locally.
const $ = (id) => document.getElementById(id);
const canvas = $("sprite-canvas");
const ctx = canvas.getContext("2d", { alpha: false });
ctx.imageSmoothingEnabled = false;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const DIRECTION_LABELS = ["SE", "SW", "NE", "NW"];
const UNIVERSAL_SLEEP = window.VLUniversalSleep;
const UNIVERSAL_BODY = window.VLUniversalBodyActions;
const UNIVERSAL_MOTIONS = window.VLUniversalMotions;
const EXPRESSION_CONTEXT = window.VLExpressionContext;
const CHAR_RESET = window.VLCharacterReferenceReset;

function modularReferenceRecord(){
 const rig=window.VLModularRigV2;
 if(!rig||CHAR_RESET?.active&&!CHAR_RESET.visible(rig.ID))return null;
 let base=rig.referencePose(),tracks=rig.makeTracks(),count=24;
 try{
  const saved=JSON.parse(window.localStorage.getItem("mahluk-modular-rig-studio-v2")||"null");
  if(saved?.format==="mahluk-rig-studio-v2"&&saved.artRevision===rig.ART_REVISION){
   base=rig.normalize(saved.base);
   tracks=saved.tracks&&typeof saved.tracks==="object"?saved.tracks:tracks;
   count=Math.max(4,Math.min(96,Number(saved.count)||24));
  }
 }catch{}
 const frames=6,dirs=rig.DIR,canvas=document.createElement("canvas");
 canvas.width=64*frames;canvas.height=112*4;
 const ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=false;
 const tile=document.createElement("canvas");tile.width=64;tile.height=112;
 const paint=tile.getContext("2d");
 function makeAtlas(emotion){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let d=0;d<4;d++)for(let fr=0;fr<frames;fr++){
   const current=rig.sampleTrack(tracks,Math.floor(fr*count/frames),count,base);
   if(emotion)current.emotion=emotion;
   paint.clearRect(0,0,64,112);rig.draw(paint,current,dirs[d]);
   ctx.drawImage(tile,fr*64,d*112);
  }
  return canvas.toDataURL("image/png");
 }
 const sheet=makeAtlas(),thumb=document.createElement("canvas");
 thumb.width=64;thumb.height=112;
 thumb.getContext("2d").drawImage(canvas,0,0,64,112,0,0,64,112);
 const portrait=thumb.toDataURL("image/png");
 const expressions=rig.EMOTIONS.map(id=>{
  const faceSheet=makeAtlas(id),faceTile=document.createElement("canvas");
  faceTile.width=64;faceTile.height=112;
  faceTile.getContext("2d").drawImage(canvas,0,0,64,112,0,0,64,112);
  return {
   id,label:({neutral:"Neutral",happy:"Happy",mischievous:"Jahil / Smirk",
    angry:"Angry",surprised:"Surprised",blush:"Blush",grin:"Grin"})[id]||id,
   sheet:faceSheet,portrait:faceTile.toDataURL("image/png"),
   frames,frame_ms:Array(frames).fill(150)
  };
 });
 return {
  id:rig.ID,name:"PIXEL REFERENCE 01",type:"npc",template:false,
  source:"modular-rig-v2",asset_status:"generated_preview",sheet,
  thumbnail:portrait,poster:portrait,frame_size:[64,112],
  row_starts:{walk:0,idle:0,talk:0},idle_frames:frames,walk_frames:frames,
  skeleton_profile:"MODULAR PIXEL V2",bone_skin_ready:true,
  motions:[{id:"idle",name:"MODULAR IDLE REFERENCE",category:"idle",
   source:"custom",sheet,available:true,frames,frame_ms:Array(frames).fill(150),
   loop:true,row:0}],
  expressions,palette:"dark streetwear",
  outfit:"oversized black tee / loose charcoal pants / chunky white sneakers",
  hairstyle:"voluminous dark-brown crown + three independent fringe pieces",
  folder_url:"https://github.com/lafrich/virtual-life-asset-pipeline/blob/main/site/modular-rig-v2.js",
  description:"DETAILED PIXEL REFERENCE / 4 directions / true modular head, hair crown + fringe, glasses, eyes, brows, cheeks, torso, loose trousers, shoes. Edit in 06 / RIG STUDIO."
 };
}

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
  expressionAuto:true,expressionContext:null,
  zoom: 4, bg: "#f8f6f0", grid: false, image: null, motionImage: null,
  faceImage: null, faceOverlay: null, blinkOverlay: null, motionFaceImage: null, archiveImage: null, lastBlink: 0,
  imageCache: new Map(), working: false
};

function setStatus(message) { $("status").textContent = message; }

let spriteBuildVersion = "";
function freshAssetUrl(src) {
  if (!src || typeof src !== "string") return src;
  // Local user-created equipment uses data: URLs and must remain untouched.
  // Version only authored sprite/media, using the build SHA provided by
  // the always-fresh catalog. This defeats persistent mobile PNG caches.
  if (!spriteBuildVersion || !/^(?:\.\/)?media\//.test(src)) return src;
  return src + (src.includes("?") ? "&" : "?") +
    "build=" + encodeURIComponent(spriteBuildVersion);
}

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
  image.src = freshAssetUrl(src);
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
  state.expressionAuto=true;
  if($("motion-auto-face"))$("motion-auto-face").checked=true;
  // The base mannequins and Theodore have real same-actor face motion
  // atlases. Activate neutral by default so head/eyes animate on first play.
  state.expression = character.expressions?.find(f=>f.id==="neutral" &&
    f.motion_sheets?.walk) || null;
  state.motion = null;
  state.frame = 0;
  state.autoDir = 0;
  state.image = null;
  state.motionImage = null;
  state.archiveImage = null;
  state.faceImage = null;
  state.faceOverlay = null;
  state.blinkOverlay = null;
  state.motionFaceImage = null;
  state.playing = !prefersReducedMotion;
  $("canvas-loading").hidden = false;

  $("canvas-name").textContent = character.id.toUpperCase() + ".SPR";
  $("character-name").textContent = prettyName(character);
  $("prop-type").textContent = String(character.type || "npc").toUpperCase();
  $("prop-bone-model").textContent =
    character.skeleton_profile&&character.skeleton_profile!=="UNASSIGNED"?
    character.skeleton_profile:
    (character.sheet?"V6B / SHARED FRAME":"REFERENCE / NO PIXEL RIG");
  $("prop-bone-skin").textContent = character.bone_skin_ready ? "BOUND / QA" :
    (character.sheet?"ACTOR-PIXEL PREVIEW":"SOURCE REFERENCE");
  const previewImage = character.thumbnail || character.poster;
  const inspector = $("inspector-thumb");
  inspector.closest(".inspector-art").classList.toggle("empty", !previewImage);
  if (previewImage) inspector.src = freshAssetUrl(previewImage); else inspector.removeAttribute("src");
  inspector.alt = character.name + " pixel-art preview";
  const sheetLink = $("download-sheet");
  sheetLink.hidden = !character.sheet||["source_only","archive_still"].includes(character.asset_status);
  if (!sheetLink.hidden) {
    sheetLink.href = freshAssetUrl(character.sheet);
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
  // Enter each character with ALL actions visible; stale filters from a
  // previous actor must not hide Bathtub Bathe in Male/Female motion lists.
  $("motion-search").value="";
  $("motion-category").value="all";
  $("motion-grid").scrollTop=0;
  buildMotions(character);
  setInspectorTab("info");
  state.motion = character.motions?.find(m => m.id === "walk" && m.available) || null;
  syncPlaybackButton();
  syncDirectionButtons();
  syncTools();
  renderFileList(false);
  setStatus("OPEN: " + character.id.toUpperCase() + ".SPR");
  canvas.setAttribute("aria-label", character.name + " sprite — 4 walk directions");

  if (!character.sheet||["source_only","archive_still"].includes(character.asset_status)) {
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
    img.src = freshAssetUrl(face.portrait || face.sprite || face.image);
    const label = document.createElement("span");
    label.textContent = String(face.label).toUpperCase();
    button.append(img, label);
    button.addEventListener("click", () => selectFace(face));
    container.append(button);
  }
}

function buildMotions(character) {
  const grid=$("motion-grid");grid.replaceChildren();
  const builtins=Array.isArray(character.motions)?character.motions:[];
  // Pose Maker owns its own Male/Female PNGs. Show browser-saved motions
  // alongside canonical actions, without altering original catalog entries.
  const poser=window.VLPoseMakerMotion?.listFor(character.id)||[];
  const registered=[...builtins.filter(m=>!poser.some(p=>p.id===m.id)),...poser].map(m=>({
    ...m,playback:m.playback||(m.available&&["native","custom"].includes(m.source)?
      "authored":m.source==="procedural"?"procedural":"reference")
  }));
  // Bathtub is a shared action, not restricted to the two sample GIFs.
  // Pin it above the large canonical list so both Human bases and every
  // other character can find and apply it without scrolling 200+ actions.
  const bath=registered.find(m=>m.id==="bathtub_bathe");
  const fallback=UNIVERSAL_MOTIONS?.catalogFor(character,[
    {id:"bathtub_bathe",label:"BATHTUB BATHE",category:"hygiene"}
  ])?.find(m=>m.id==="bathtub_bathe");
  const choices=[...(bath?[bath]:(fallback?[fallback]:[])),
    ...registered.filter(m=>m.id!=="bathtub_bathe")];
  const categories=["all",...new Set(choices.map(a=>a.category||"action"))];
  const filter=$("motion-category"),old=filter.value;
  filter.replaceChildren();
  for(const key of categories){
    const option=document.createElement("option");option.value=key;
    option.textContent=key==="all"?"ALL CATEGORIES":key.replaceAll("_"," ").toUpperCase();
    filter.append(option);
  }
  filter.value=categories.includes(old)?old:"all";
  const query=$("motion-search").value.trim().toLowerCase(),category=filter.value;
  const visible=choices.filter(a=>(category==="all"||a.category===category)&&
    [a.id,a.name,a.category].join(" ").toLowerCase().includes(query));
  $("motion-tab-count").textContent=String(choices.length).padStart(2,"0");
  $("motion-count").textContent=String(choices.length).padStart(2,"0");
  for(const action of visible){
    const button=document.createElement("button");button.type="button";
    button.className="motion-option";button.disabled=false;
    button.dataset.motionId=action.id;
    button.title=action.playback==="authored"?
      "Original animation from this character":
      action.playback==="procedural"?
      "Shared action: procedural preview from the selected character's own sprite":
      "Shared action: original source has no complete sprite; reference preview only";
    button.setAttribute("aria-pressed","false");
    const glyph=document.createElement("span");glyph.textContent="▶";
    const label=document.createElement("strong");label.textContent=action.name;
    const tag=document.createElement("small");
    tag.textContent=action.playback==="authored"?
      action.frames+" FR / AUTHORED":action.playback==="procedural"?
      "AUTO PREVIEW":"REFERENCE";
    button.append(glyph,label,tag);
    button.addEventListener("click",()=>selectMotion(action));grid.append(button);
  }
  const authored=choices.filter(a=>a.playback==="authored").length;
  const auto=choices.filter(a=>a.playback==="procedural").length;
  $("motion-availability-note").textContent=
    visible.length+" SHOWN / "+choices.length+" COMMON ACTIONS · "+
    authored+" AUTHORED · "+auto+" AUTO PREVIEW · "+
    (choices.length-authored-auto)+" SOURCE REFERENCE";
  syncMotionSelection();
}

function syncMotionSelection() {
  [...$("motion-grid").children].forEach(button=>{
    const active=button.dataset.motionId===state.motion?.id&&state.mode==="action";
    button.classList.toggle("active",active);
    button.setAttribute("aria-pressed",String(active));
  });
}

function currentActionFace(){
  if(!state.motion)return {id:"neutral",source:"action",sheet:null};
  return EXPRESSION_CONTEXT?.playbackFace(
    state.expressionContext,state.motion,state.frame,
    state.expression,state.expressionAuto)||{id:"neutral",source:"action",sheet:null};
}
function syncActionFaceLabel(){
  const panel=$("motion-expression-active");
  if(!panel||!state.motion)return;
  const face=currentActionFace(),manual=face.source==="manual";
  const seq=EXPRESSION_CONTEXT?.track(state.expressionContext,state.motion)||["neutral"];
  const original=state.motion.playback==="authored"||
    ["native","custom"].includes(state.motion.source);
  panel.textContent="FACE: "+(manual?"MANUAL":"AUTO")+
    " / "+face.id.toUpperCase().replaceAll("_"," ")+
    (manual?" · ACTOR FACE SHEET":
      " · "+[...new Set(seq)].join(" / ").toUpperCase()+
      " · "+(original?"AUTHORED":"PROCEDURAL/REFERENCE"));
}
function selectMotion(action) {
  if (!state.selected || !action) return;
  // Preload the matching nude mannequin once when a hygiene action is
  // selected. Every render keeps the original actor's face and skin.
  const hygiene=UNIVERSAL_BODY?.resolve(state.selected,action.id);
  if(hygiene)cachedImage(hygiene.sheet,()=>draw());
  state.mode = "action";
  state.motion = action;
  // Keep the chosen facial expression when switching body motion. Native
  // v6b expression delta sheets cover EVERY authored animation row.
  state.faceImage = null;
  state.motionFaceImage = null;
  state.frame = 0;
  state.autoDir = 0;
  state.lastFrameTime = 0;
  state.playing = !prefersReducedMotion;
  state.motionImage = null;
  $("canvas-name").textContent = state.selected.id.toUpperCase() + " / " + action.id.toUpperCase();
  const character = state.selected;
  if ((action.source === "custom" && action.sheet)||
      (action.source === "procedural" && action.prototype?.sheet &&
       action.prototype.sheet!==character.sheet)) {
    cachedImage(action.source==="procedural"?action.prototype.sheet:action.sheet, image => {
      if (state.selected !== character || state.motion !== action) return;
      state.motionImage = image;
      draw();
    });
  }
  const motionFacePath = !state.expressionAuto?
    state.expression?.motion_sheets?.[action.id]:null;
  if (motionFacePath) {
    const face = state.expression;
    cachedImage(motionFacePath,image=>{
      if (state.selected !== character || state.motion !== action || state.expression !== face) return;
      state.motionFaceImage = image;
      draw();
    });
  }
  syncActionFaceLabel();
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
  state.expressionAuto=false;
  if($("motion-auto-face"))$("motion-auto-face").checked=false;
  // Expression pixels only exist on the front SE/SW source views. Show a
  // visible face immediately instead of staying on an automatic/rear view.
  if (face.sheet && (state.direction === "auto" || Number(state.direction) >= 2)) {
    state.direction = "0";
    syncDirectionButtons();
  }
  state.faceImage = null;
  state.faceOverlay = null;
  state.blinkOverlay = null;
  state.motionFaceImage = null;
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
  if(!state.selected)return;
  const motion=state.selected.motions?.find(m=>m.id==="walk");
  if(motion)return selectMotion(motion);
  setStatus("SHARED WALK ACTION NOT LOADED");
}

function togglePlayback() {
  if (!state.selected || (!state.selected.sheet&&!state.archiveImage)) return;
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
 // Human modular equipment was silently discarded here: only helmet/bag
 // survived validation even though the editor already exports shirt/pants/shoes.
 // Read the exact supported slot set for both generic and Human characters.
 accessoryRuntime.items=Array.isArray(stored)?stored.filter(x=>x&&
  typeof x.id==="string"&&
  ["helmet","bag","hair","shirt","pants","shoes"].includes(x.category)&&
  x.frames&&typeof x.frames==="object"&&
  ["se","sw","ne","nw"].every(d=>typeof x.frames[d]==="string")):[];
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
function drawEquippedAccessory(x,y,z,dirIndex,placement="front",targetCtx=ctx,only=null){
 if(!state.selected)return;
 // Do not float a backpack/standing outfit over the horizontal sleep pose.
 if(UNIVERSAL_SLEEP?.isSleep(state.motion?.id)&&state.mode==="action")return;
 const dirs=["se","sw","ne","nw"];
 for(const category of EQUIPMENT_SLOTS){
  if(only&&!only.includes(category))continue;
  // Backpack is ALWAYS the furthest-back layer, even in NE/NW.
  // This keeps Theodore's torso, shoulders and head in front of the bag.
  if(category==="bag"){
   if(placement!=="back")continue;
  }else if(category==="hair"){
   // Native V6B hair is two independent depths. Long rear locks are BEHIND
   // the actor head, and the fringe is in FRONT; never stack both over face.
   if(placement==="back"&&!accessoryFor(state.selected.id,"hair")?.back_frames)continue;
  }else if(placement!=="front")continue;
  const item=accessoryFor(state.selected.id,category);
  const src=(category==="hair"&&placement==="back"?
   item?.back_frames:item?.frames)?.[dirs[dirIndex]];
  const selectedBase=state.selected.base_id||state.selected.id;
  if(item&&(item.template_base||"astrofrich_base")!==selectedBase)continue;
  if(typeof src!=="string"||!src.startsWith("data:image/png;base64,")||src.length>100000)continue;
  let image=state.imageCache.get(src);
  if(!image)image=cachedImage(src,()=>draw());
  if(image?.complete&&image.naturalWidth===64&&image.naturalHeight===112){
   targetCtx.imageSmoothingEnabled=false;
   targetCtx.drawImage(image,x,y,64*z,112*z);
  }
 }
}
function renderAccessoryStorage(){
 const list=$("accessory-storage-list");if(!list)return;
 list.replaceChildren();
 const actor=state.selected?.id||"";
 const selectedBase=state.selected?.base_id||state.selected?.id||"";
 const current=accessoryRuntime.equipment[actor]||{};
 if(!accessoryRuntime.items.length){
  const empty=document.createElement("p");empty.className="accessory-note";
  empty.textContent="STORAGE EMPTY. DRAW RAMBUT / BAJU / CELANA / SEPATU OR HELM / TAS.";list.append(empty);
 }
 for(const item of accessoryRuntime.items.filter(x=>(x.template_base||"astrofrich_base")===selectedBase)){
  const row=document.createElement("div");row.className="accessory-item";
  const name=document.createElement("div");name.className="accessory-name";
  name.textContent=item.name||"UNNAMED ACCESSORY";
  const meta=document.createElement("small");meta.textContent=({helmet:"HELM",bag:"TAS",hair:"RAMBUT",shirt:"BAJU",pants:"CELANA",shoes:"SEPATU"}[item.category]||item.category.toUpperCase())+
   " / 4 VIEW / LOCAL STORAGE";
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
 const count=EQUIPMENT_SLOTS.map(k=>current[k]?
   ({helmet:"HELM",bag:"TAS",hair:"RAMBUT",shirt:"BAJU",pants:"CELANA",shoes:"SEPATU"}[k]||k.toUpperCase())+
    ": "+(accessoryRuntime.items.find(x=>x.id===current[k])?.name||"NONE"):"").filter(Boolean);
 $("accessory-equipped").textContent=count.length?"EQUIPPED / "+count.join(" · "):"NO ACCESSORIES ATTACHED TO "+(actor||"CHARACTER").toUpperCase();
}
function openAccessoryEditor(category){
 if(!EQUIPMENT_SLOTS.includes(category))return;
 const overlay=$("pixel-editor-overlay");
 overlay.hidden=false;document.body.classList.add("pixel-editor-open");
 $("pixel-editor-heading-title").textContent="AKSESORIS / "+
  ({helmet:"HELM",bag:"TAS",hair:"RAMBUT",shirt:"BAJU",pants:"CELANA",shoes:"SEPATU"}[category])+" — PAINT";
 const url=new URL("./accessory-editor.html",window.location.href);
 url.searchParams.set("embedded","1");url.searchParams.set("actor",state.selected?.id||"legacy_theodore");
 const base=(category==="helmet"||category==="bag")?"astrofrich_base":
  (HUMAN_BASES.includes(customBaseId())?customBaseId():"human_male_base");
 url.searchParams.set("category",category);url.searchParams.set("base",base);
 url.searchParams.set("build",spriteBuildVersion);
 url.searchParams.set("version","human-modular-v3");
 url.searchParams.set("refresh",String(Date.now()));
 $("pixel-editor-embed").src=url.href;$("close-pixel-editor").focus();
}


/* Astrofrich Custom Characters: immutable original base sprite + equipment
   references. Saved characters inherit all source-authored motions/faces. */
const CHAR_STORAGE="virtual-life-character-storage-v1";
const HUMAN_BASES=["human_male_base","human_female_base"];
const CUSTOM_BASES=["astrofrich_base",...HUMAN_BASES];
const EQUIPMENT_SLOTS=["shoes","pants","shirt","hair","bag","helmet"];
let catalogCharacters=[],workingCustomId=null;
function templateFor(id){return catalogCharacters.find(x=>x.id===id&&x.template)||null;}
function customBaseId(){return CUSTOM_BASES.includes($("custom-base").value)?$("custom-base").value:"astrofrich_base";}
function savedCustomCharacters(){
 const rows=readAccessoryJson(CHAR_STORAGE,[]);
 return Array.isArray(rows)?rows.filter(x=>x&&typeof x.id==="string"&&
  /^custom_(astro|human)_[a-z0-9-]+$/.test(x.id)&&typeof x.name==="string"&&
  x.name.length<=40&&CUSTOM_BASES.includes(x.base)).slice(0,60):[];
}
function hydrateCharacter(row,base){
 return {...base,id:row.id,name:row.name,type:"npc",template:false,
  template_category:base.template_category,custom_character:true,base_id:base.id,
  baseId:base.id,bodyType:base.gender||null,skinTone:HUMAN_BASES.includes(row.base)?
   (["base","light","medium","tan","deep","dark"].includes(row.skinTone)?row.skinTone:"base"):null,
  thumbnail:typeof row.portrait==="string"&&/^data:image\/png;base64,/.test(row.portrait)?
   row.portrait:base.thumbnail,
  description:base.template_category.toUpperCase()+" · "+row.name+" · 4-direction modular outfit / original motion & face atlases"};
}
function rebuildCustomCharacters(){
 const oldId=state.selected?.id;
 state.characters=[...catalogCharacters,
  ...savedCustomCharacters().map(row=>{
   const base=templateFor(row.base);return base?hydrateCharacter(row,base):null;
  }).filter(Boolean)];
 if(CHAR_RESET?.active)state.characters=CHAR_RESET.filter(state.characters);
 if(CHAR_RESET?.active)state.selected=null;
 if(state.selected?.custom_character){
  const updated=state.characters.find(x=>x.id===oldId);
  if(updated)state.selected=updated;
 }
 const total=String(state.characters.length).padStart(2,"0");
 $("asset-total").textContent=total;$("status-asset-count").textContent=total;
 renderCustomStorage();renderFileList(false);
}
function filterEquippedOptions(base,category,previous=""){
 const select=$("custom-"+category);select.replaceChildren();
 const blank=document.createElement("option");
 blank.value="";blank.textContent="— NO "+({hair:"RAMBUT",shirt:"BAJU",pants:"CELANA",shoes:"SEPATU",
   helmet:"HELM",bag:"TAS"}[category]||category.toUpperCase())+" —";
 select.append(blank);
 const options=accessoryRuntime.items.filter(x=>x.category===category&&
  (x.template_base||"astrofrich_base")===base);
 for(const preset of window.VLHumanWardrobe?.presetsFor?.(base,category)||[]){
  const option=document.createElement("option");option.value=preset.id;
  option.textContent=preset.name;select.append(option);
 }
 for(const entry of options){
  const option=document.createElement("option");option.value=entry.id;
  option.textContent=entry.name||"UNNAMED";select.append(option);
 }
 select.value=(options.some(x=>x.id===previous)||
   (window.VLHumanWardrobe?.presetsFor?.(base,category)||[]).some(x=>x.id===previous))?
   previous:"";
}
function populateCustomAccessories(){
 const baseId=customBaseId(),human=HUMAN_BASES.includes(baseId);
 $("astrofrich-outfit-slots").hidden=human;$("human-outfit-slots").hidden=!human;
 $("custom-skin-row").hidden=!human;
 $("custom-base-summary").textContent=human?"HUMAN":"ASTROFRICH";
 for(const kind of EQUIPMENT_SLOTS)filterEquippedOptions(baseId,kind,$("custom-"+kind).value);
 const base=templateFor(baseId);
 $("custom-animation-count").textContent=base?
  base.template_category.toUpperCase()+" · "+base.motions.filter(m=>m.available).length+
  " ANIMATIONS · "+base.expressions.length+" EXPRESSIONS · 4 DIRECTIONS":
  "TEMPLATE LOADING";
 window.VLHumanWardrobe?.populate?.(baseId);
}
function syncCustomCategory(){
 if(CHAR_RESET?.active)return;
 const category=$("custom-category").value;
 const desired=category==="human"?"human_male_base":"astrofrich_base";
 if((category==="human")!==HUMAN_BASES.includes(customBaseId()))$("custom-base").value=desired;
 for(const opt of $("custom-base").options)opt.hidden=(category==="human")!==(HUMAN_BASES.includes(opt.value));
 populateCustomAccessories();
}
function editCustomCharacter(id){
 const row=savedCustomCharacters().find(x=>x.id===id);if(!row)return;
 workingCustomId=row.id;$("custom-name").value=row.name;
 $("custom-skin-tone").value=["base","light","medium","tan","deep","dark"].includes(row.skinTone)?row.skinTone:"base";
 $("custom-category").value=HUMAN_BASES.includes(row.base)?"human":"astrofrich";
 $("custom-base").value=row.base;syncCustomCategory();
 const equipped=accessoryRuntime.equipment[row.id]||{};
 for(const kind of EQUIPMENT_SLOTS)filterEquippedOptions(row.base,kind,equipped[kind]);
 window.VLHumanWardrobe?.restoreSaved?.(equipped,accessoryRuntime.items);
 setInspectorTab("custom");setStatus("EDIT CUSTOM CHAR: "+row.name.toUpperCase());
}
function resetCustomForm(){
 if(CHAR_RESET?.active){
  workingCustomId=null;$("custom-name").value="";return;
 }
 workingCustomId=null;$("custom-name").value="";
 $("custom-skin-tone").value="base";
 $("custom-category").value="human";$("custom-base").value="human_male_base";
 syncCustomCategory();
 for(const kind of EQUIPMENT_SLOTS)$("custom-"+kind).value="";
 window.VLHumanWardrobe?.chooseStarter?.();
}
async function saveCustomCharacter(){
 if(CHAR_RESET?.active){
  setStatus(CHAR_RESET.message+" · IMPORT RIG BARU DULU");return;
 }
 const baseId=customBaseId(),base=templateFor(baseId);
 if(!base){setStatus("CUSTOM BASE NOT YET AVAILABLE: "+baseId);return}
 const name=$("custom-name").value.trim().replace(/\s+/g," ").slice(0,40);
 if(!name){setStatus("ENTER A CHARACTER NAME BEFORE SAVING");$("custom-name").focus();return}
 let selectedOutfit={};
 try{
  selectedOutfit=await window.VLHumanWardrobe?.materializeSelected?.(baseId)||{};
  refreshAccessoryEquipment();
 }catch(error){setStatus("WARDROBE PRESET NOT SAVED: "+error.message);return;}
 const rows=savedCustomCharacters();
 if(rows.length>=60&&!workingCustomId){setStatus("CHARACTER STORAGE LIMIT: 60");return}
 let id=workingCustomId;
 if(!id||!rows.some(x=>x.id===id)){
  id="custom_"+(base.template_category==="human"?"human":"astro")+"_"+
    Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6);
 }
 let portrait=null;
 try{portrait=await window.VLHumanWardrobe?.createPortrait?.(baseId);}
 catch(error){setStatus("CHARACTER PREVIEW ERROR: "+error.message);return;}
 const record={id,name,base:baseId,category:base.template_category,
  ...(HUMAN_BASES.includes(baseId)?{skinTone:$("custom-skin-tone").value}:{}),
  ...(portrait?{portrait}:{}),updated:Date.now()};
 const index=rows.findIndex(x=>x.id===id);
 if(index<0)rows.unshift(record);else rows[index]=record;
 const equipment=readAccessoryJson(ACCESSORY_EQUIP,{});
 const slots={};
 for(const kind of EQUIPMENT_SLOTS){
  if(selectedOutfit[kind]){slots[kind]=selectedOutfit[kind];continue;}
  const found=accessoryRuntime.items.find(x=>x.id===$("custom-"+kind).value &&
   (x.template_base||"astrofrich_base")===baseId && x.category===kind);
  if(found)slots[kind]=found.id;
 }
 equipment[id]=slots;
 try{localStorage.setItem(CHAR_STORAGE,JSON.stringify(rows));
  localStorage.setItem(ACCESSORY_EQUIP,JSON.stringify(equipment));}
 catch(e){setStatus("CHARACTER STORAGE FULL: CLEAR OLD ITEMS OR EXPORT PNG");return}
 workingCustomId=id;accessoryRuntime.equipment=equipment;
 rebuildCustomCharacters();
 const actor=state.characters.find(x=>x.id===id);
 if(actor){selectCharacter(actor);window.VLMahlukNavigation?.showCharacters?.()}
 setStatus("SAVED "+name.toUpperCase()+" / "+base.template_category.toUpperCase()+
  " / "+base.motions.filter(x=>x.available).length+" MOTIONS / "+
  base.expressions.length+" FACES / 4 DIRECTIONS · SYNCED LOCALLY TO SEMESTA + BANGUN RUANG");
}
function deleteCustomCharacter(id){
 const record=savedCustomCharacters().find(x=>x.id===id);
 if(!record||!confirm("Delete custom character "+record.name+"? Accessories remain in Storage."))return;
 const rows=savedCustomCharacters().filter(x=>x.id!==id);
 const equipment=readAccessoryJson(ACCESSORY_EQUIP,{});
 delete equipment[id];
 try{localStorage.setItem(CHAR_STORAGE,JSON.stringify(rows));
  localStorage.setItem(ACCESSORY_EQUIP,JSON.stringify(equipment));}
 catch(e){setStatus("STORAGE ERROR");return}
 if(workingCustomId===id)resetCustomForm();
 if(state.selected?.id===id){const original=templateFor(record.base);if(original)selectCharacter(original)}
 accessoryRuntime.equipment=equipment;rebuildCustomCharacters();
 setStatus("DELETED CUSTOM CHARACTER, OUTFIT ASSETS RETAINED");
}
function renderCustomStorage(){
 const list=$("custom-storage-list");if(!list)return;
 list.replaceChildren();
 if(CHAR_RESET?.active){
  const empty=document.createElement("p");empty.className="accessory-note";
  empty.textContent=CHAR_RESET.message;list.append(empty);return;
 }
 const rows=savedCustomCharacters();
 if(!rows.length){
  const p=document.createElement("p");p.className="accessory-note";
  p.textContent="NO CUSTOM CHARACTERS YET. CHOOSE ASTROFRICH OR HUMAN, NAME, AND SAVE.";list.append(p);
 }
 for(const row of rows){
  const item=document.createElement("div");item.className="custom-item";
  const label=document.createElement("strong");label.textContent=row.name;
  const meta=document.createElement("small");meta.textContent=
   (HUMAN_BASES.includes(row.base)?"HUMAN "+(row.base.includes("female")?"FEMALE":"MALE"):"ASTROFRICH")+
   " · "+(templateFor(row.base)?.motions?.filter(m=>m.available).length||0)+
    " MOTIONS · "+(templateFor(row.base)?.expressions?.length||0)+" FACES";
  label.append(meta);
  const open=document.createElement("button");open.type="button";open.className="chrome-button";
  open.textContent="OPEN";open.onclick=()=>{
   const actor=state.characters.find(x=>x.id===row.id);
   if(actor)selectCharacter(actor);
   editCustomCharacter(row.id);
  };
  const del=document.createElement("button");del.type="button";del.className="chrome-button";
  del.textContent="×";del.setAttribute("aria-label","Delete "+row.name);del.onclick=()=>deleteCustomCharacter(row.id);
  item.append(label,open,del);list.append(item);
 }
}

function setInspectorTab(tab) {
  const isFace = tab === "faces";
  const isMotion = tab === "motions";
  const isAccessories = tab === "accessories";
  if(tab==="custom"){window.VLMahlukNavigation?.openCustom?.();return;}
  $("info-panel").hidden = isFace || isMotion || isAccessories;
  $("faces-panel").hidden = !isFace;
  $("motions-panel").hidden = !isMotion;
  $("accessories-panel").hidden = !isAccessories;
  for (const [id,active] of [["tab-info", !isFace && !isMotion && !isAccessories],
                             ["tab-faces", isFace], ["tab-motions", isMotion],
                             ["tab-accessories", isAccessories]]) {
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
    empty.textContent = CHAR_RESET?.active ? CHAR_RESET.message : "NO FILES.";
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
      image.src = freshAssetUrl(character.thumbnail || character.poster);
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

function drawHumanBaseFrame(image,sx,sy,x,y,w,h){
  const actor=state.selected;
  if(!image?.naturalWidth)return;
  if(!actor?.skinTone||actor.skinTone==="base"||actor.skinTone==="light"||
    !UNIVERSAL_BODY?.tintBase){
   ctx.drawImage(image,sx,sy,64,112,x,y,w,h);return;
  }
  const off=document.createElement("canvas");off.width=64;off.height=112;
  const paint=off.getContext("2d",{willReadFrequently:true});
  paint.imageSmoothingEnabled=false;
  paint.drawImage(image,sx,sy,64,112,0,0,64,112);
  UNIVERSAL_BODY.tintBase(paint,actor);
  ctx.drawImage(off,x,y,w,h);
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
      const offsets=state.mode==="action"?[0,-1,-3,-2,0,1]:[0];
      ctx.drawImage(source,(w-w0)/2,(h-h0)/2+offsets[state.frame%offsets.length],w0,h0);
      if(state.mode==="action"){
       ctx.fillStyle="#173b85";ctx.font="bold 11px monospace";
       ctx.textAlign="center";
       ctx.fillText("REFERENCE PREVIEW / NO 4-VIEW SPRITE",w/2,h-17);
      }
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
  const hygiene=state.mode==="action"&&state.motion?
   UNIVERSAL_BODY?.resolve(state.selected,state.motion.id):null;
  if(hygiene){
    const original=state.motion.source==="custom"?state.motionImage:
      state.motion.source==="procedural"&&state.motion.prototype?.sheet!==state.selected.sheet?
      state.motionImage:state.image;
    const mannequin=cachedImage(hygiene.sheet);
    if(original?.naturalWidth&&mannequin?.naturalWidth){
      const off=document.createElement("canvas");off.width=64;off.height=112;
      const paint=off.getContext("2d",{willReadFrequently:true});
      paint.imageSmoothingEnabled=false;
      const row=(state.motion.source==="custom"?0:
        state.motion.source==="procedural"?
        state.motion.prototype?.row??state.selected.row_starts?.idle??4:
        state.motion.row||0)+d;
      const frame=state.frame%hygiene.frames;
      const originalFrame=frame%Math.max(1,state.motion.frames||4);
      if((originalFrame+1)*64<=original.naturalWidth&&(row+1)*112<=original.naturalHeight){
        // Mahluk Hidup source head and hair remain; equipped garments,
        // shoes, bags and helmets are never layered into a bath frame.
        paint.drawImage(original,originalFrame*64,row*112,64,112,0,0,64,112);
        UNIVERSAL_BODY.tintBase(paint,state.selected);
        if(UNIVERSAL_BODY.apply(paint,{actor:state.selected,action:state.motion.id,
             direction:["se","sw","ne","nw"][d],frame,bodyImage:mannequin})){
          // Hair remains part of the head; only clothing is removed for bath.
          // Upright hair overlay must not be pasted over a reclining head.
          // Native bathtub source retains the base head and open expression.
          if(hygiene.kind!=="bathtub")
            drawEquippedAccessory(0,0,1,d,"front",paint,["hair"]);
          ctx.drawImage(off,x,y,64*z,112*z);
        }
      }
    }else{
      ctx.fillStyle="#35547a";ctx.font="bold 12px monospace";
      ctx.fillText("LOADING BODY...",x,y+56*z);
    }
    return;
  }
  const nativeBath=state.mode==="action"&&state.motion?.id==="bathtub_bathe";
  // A reclining bath uses the character's own LIE, never standing outfit
  // equipment. The prop hides the lower body in Bangun Ruang/Semesta.
  if(!nativeBath)drawEquippedAccessory(x,y,z,d,"back");
  if(state.mode==="action"&&state.motion?.source==="procedural"){
    const src=state.motion.prototype?.sheet!==state.selected.sheet?
      state.motionImage:state.image;
    const done=UNIVERSAL_MOTIONS?.render(ctx,{action:state.motion,
      image:src,dir:d,frame:state.frame,x,y,scale:z});
    if(!done){
      ctx.fillStyle="#173b85";ctx.font="bold 11px monospace";
      ctx.fillText("LOADING ACTOR PREVIEW",x,y+56*z);
    }
    if(done&&nativeBath)UNIVERSAL_BODY?.drawBathFoam(ctx,{
      x,y,scale:z,frame:state.frame,
      direction:["se","sw","ne","nw"][d]
    });
    if(!nativeBath)drawEquippedAccessory(x,y,z,d);
    return;
  }
  if (state.image?.complete && state.image.naturalWidth) {
    if (state.mode === "face") {
      // Actual character's own 4-frame idle / blink and expression overlays,
      // not the original Ichsan character or a photograph/video filter.
      const row = (state.selected.row_starts?.idle ?? 4) + d;
      const col = state.frame % Math.max(1,state.selected.idle_frames || 4);
      if (state.expression?.sheet) {
        if (state.faceImage?.naturalWidth) {
          drawHumanBaseFrame(state.faceImage,state.frame*64,d*112,x,y,64*z,112*z);
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
      drawHumanBaseFrame(state.image,col*64,row*112,x,y,64*z,112*z);
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
      // Character-specific expression atlases contain the entire pose,
      // including the correctly positioned eyes/head for each walk frame.
      const synced = Boolean(!state.expressionAuto &&
        state.expression?.motion_sheets?.[motion?.id] &&
        state.motionFaceImage?.naturalWidth);
      const source = synced ? state.motionFaceImage : custom ? state.motionImage : state.image;
      if (source?.naturalWidth) {
        const sleepPose=UNIVERSAL_SLEEP?.isSleep(motion?.id);
        const oriented=sleepPose?UNIVERSAL_SLEEP.directionFor(motion.id,
          ["se","sw","ne","nw"][d]):["se","sw","ne","nw"][d];
        const row = (synced ? 0 : (motion?.row ?? 0)) +
          ["se","sw","ne","nw"].indexOf(oriented);
        const breath=sleepPose?UNIVERSAL_SLEEP.breathing(state.frame)*z:0;
        drawHumanBaseFrame(source,state.frame*64,row*112,
          x,y+breath,64*z,112*z);
        // Expression blend is pixel-aligned on the selected actor's native
        // 44-row sheet; never apply original-row deltas onto unrelated custom rigs.
        if (!sleepPose && !synced && !custom && state.expression && state.faceOverlay?.naturalWidth) {
          ctx.drawImage(state.faceOverlay,state.frame*64,row*112,64,112,x,y,64*z,112*z);
          if (state.expression.id !== "blink" && state.lastBlink === 1 &&
              state.blinkOverlay?.naturalWidth) {
            ctx.drawImage(state.blinkOverlay,state.frame*64,row*112,64,112,x,y,64*z,112*z);
          }
        }
      }
    }
  }
  if(nativeBath){
    if(state.motion?.source!=="custom")
      UNIVERSAL_BODY?.drawBathFoam(ctx,{x,y,scale:z,frame:state.frame,
        direction:["se","sw","ne","nw"][d]});
  }else drawEquippedAccessory(x,y,z,d);
}

function tick(time) {
  if (state.playing && (state.image?.naturalWidth || state.archiveImage?.naturalWidth)) {
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
    syncActionFaceLabel();
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
  if (!state.selected || !action?.available || !state.image?.naturalWidth){
    setStatus("SOURCE SPRITE REQUIRED TO EXPORT THIS ACTION.");
    return;
  }
  if(action.source==="procedural"){
    const out=document.createElement("canvas");
    out.width=64*action.frames;out.height=112*4;
    const paint=out.getContext("2d");paint.imageSmoothingEnabled=false;
    const src=state.motionImage?.naturalWidth?state.motionImage:state.image;
    for(let dir=0;dir<4;dir++)for(let frame=0;frame<action.frames;frame++){
      paint.save();paint.translate(frame*64,dir*112);
      UNIVERSAL_MOTIONS.render(paint,{action,image:src,dir,frame,x:0,y:0,scale:1});
      paint.restore();
    }
    saveCanvasPNG(out,state.selected.id+"_"+action.id+"_AUTO_PREVIEW.png");
    setStatus("EXPORTED PROCEDURAL PREVIEW / NOT AUTHOR-APPROVED ACTION");
    return;
  }
  if(action.source==="reference")return setStatus("SOURCE SPRITE REQUIRED TO EXPORT THIS ACTION.");
  const synced=Boolean(!state.expressionAuto&&
    state.expression?.motion_sheets?.[action.id]);
  const source=synced?state.motionFaceImage:
    action.source==="custom"?state.motionImage:state.image;
  if (!source?.naturalWidth) return setStatus("ACTION / FACE SPRITE NOT YET LOADED.");
  const out = document.createElement("canvas");
  out.width = 64 * action.frames;
  out.height = 112 * 4;
  const context = out.getContext("2d");
  context.imageSmoothingEnabled = false;
  for (let dir = 0; dir < 4; dir++) for (let frame = 0; frame < action.frames; frame++) {
    context.drawImage(source, frame * 64, ((synced?0:action.row)+dir) * 112, 64, 112,
      frame * 64, dir * 112, 64, 112);
    if (!synced && action.source === "native" && state.expression && state.faceOverlay?.naturalWidth) {
      context.drawImage(state.faceOverlay,frame*64,(action.row+dir)*112,64,112,
        frame*64,dir*112,64,112);
      if (state.expression.id !== "blink" && frame === 2 && state.blinkOverlay?.naturalWidth)
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
      if(!$("custom-workspace").hidden&&window.VLHumanWardrobe?.setPaletteColor?.(color)){
        for(const other of grid.children){
         const selected=other===button;
         other.classList.toggle("active",selected);
         other.setAttribute("aria-pressed",String(selected));
        }
        $("current-color").style.backgroundColor=color;
        setStatus("CUSTOM CHARACTER COLOR: "+color.toUpperCase());
        return;
      }
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
$("custom-category").addEventListener("change",syncCustomCategory);
$("custom-base").addEventListener("change",()=>{
 $("custom-category").value=HUMAN_BASES.includes(customBaseId())?"human":"astrofrich";
 syncCustomCategory();
});
$("custom-save").addEventListener("click",saveCustomCharacter);
$("custom-new").addEventListener("click",()=>{resetCustomForm();setInspectorTab("custom");});
$("custom-draw-helmet").addEventListener("click",()=>openAccessoryEditor("helmet"));
$("custom-draw-bag").addEventListener("click",()=>openAccessoryEditor("bag"));
$("custom-draw-hair").addEventListener("click",()=>openAccessoryEditor("hair"));
$("custom-draw-shirt").addEventListener("click",()=>openAccessoryEditor("shirt"));
$("custom-draw-pants").addEventListener("click",()=>openAccessoryEditor("pants"));
$("custom-draw-shoes").addEventListener("click",()=>openAccessoryEditor("shoes"));

$("make-helmet").addEventListener("click", () => openAccessoryEditor("helmet"));
$("make-bag").addEventListener("click", () => openAccessoryEditor("bag"));
window.addEventListener("storage",event=>{
 if(event.key===ACCESSORY_STORE||event.key===ACCESSORY_EQUIP)refreshAccessoryEquipment();
 if(event.key===CHAR_STORAGE)rebuildCustomCharacters();
});
function openActionEditor(){
  if(CHAR_RESET?.active){
    setStatus(CHAR_RESET.message);return;
  }
  // Open multi-character scene composition without modifying the source
  // sprites. Single-frame pixel editing remains in the legacy direct editor.
  window.VLMahlukActionsTab?.open({
    actor:state.selected?.id||"human_male_base",
    action:state.motion?.id||"idle"
  });
}
$("action-studio").addEventListener("click",openActionEditor);
$("action-studio-char").addEventListener("click",openActionEditor);
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
    spriteBuildVersion=String(payload.build_version||"").slice(0,20);
    // Virtual sleep clips reuse each actor's genuine V6B lie frames.
    // Cloned Male/Female/Astrofrich characters retain the same source rig.
    const withSleep=payload.characters.map(character=>{
      const existing=Array.isArray(character.motions)?character.motions:[];
      const native=UNIVERSAL_SLEEP?.actionsFor(character)||[];
      const hygiene=UNIVERSAL_BODY?.resolve(character,"use_toilet");
      const seated=existing.find(m=>m.id==="sit"&&m.available);
      const idle=existing.find(m=>m.id==="idle"&&m.available);
      const bodyActions=hygiene?[
        ...(["use_toilet","pee","poop"].filter(()=>!!seated).map(id=>({
          id,name:id.replaceAll("_"," ").toUpperCase(),category:"posture",
          source:seated.sheet?"custom":"native",sheet:seated.sheet,
          row:seated.sheet?0:seated.row,frames:4,frame_ms:[400,430,440,430],
          loop:true,available:true,body_override:"toilet_lower"
        }))),
        ...(idle?[{id:"bathe",name:"BATHE / SHOWER",category:"posture",
          source:idle.sheet?"custom":"native",sheet:idle.sheet,
          row:idle.sheet?0:idle.row,frames:4,frame_ms:[330,360,380,360],
          loop:true,available:true,body_override:"bath_full"}]:[])
      ]:[];
      return {...character,motions:[...existing,
        ...native.filter(a=>!existing.some(m=>m.id===a.id)),
        ...bodyActions.filter(a=>!existing.some(m=>m.id===a.id))]};
    });
    const actionResponse=await fetch("./player-actions.json",{cache:"no-store"});
    if(!actionResponse.ok)throw new Error("SHARED ACTION DB HTTP "+actionResponse.status);
    const definitions=await actionResponse.json();
    const faceResponse=await fetch("./expression-contexts.json",{cache:"no-store"});
    if(!faceResponse.ok)throw new Error("EXPRESSION DB HTTP "+faceResponse.status);
    const faceDatabase=await faceResponse.json();
    if(!EXPRESSION_CONTEXT?.validate(faceDatabase))
      throw new Error("EXPRESSION DB INVALID");
    state.expressionContext=faceDatabase;
    if(!Array.isArray(definitions.actions)||definitions.actions.length<200)
      throw new Error("SHARED ACTION DB INCOMPLETE");
    // Every actor receives the same complete IDs, including unique
    // creator-authored extras discovered on any other character.
    const union=[...definitions.actions],known=new Set(union.map(a=>a.id));
    for(const character of withSleep)for(const motion of character.motions||[]){
      if(!known.has(motion.id)){
       known.add(motion.id);union.push({id:motion.id,
        label:motion.name||motion.id.replaceAll("_"," ").toUpperCase(),
        category:motion.category||"action"});
      }
    }
    const unified=withSleep.map(character=>({...character,
      motions:UNIVERSAL_MOTIONS.catalogFor(character,union)}));
    const visible=CHAR_RESET?.active?CHAR_RESET.filter(unified):unified;
    const approvedReference=modularReferenceRecord();
    if(approvedReference)visible.unshift(approvedReference);
    catalogCharacters=visible.filter(c=>!["otis","legacy_otis"].includes(c.id));
    state.characters=visible;
    rebuildCustomCharacters();
    const total = String(state.characters.length).padStart(2, "0");
    $("asset-total").textContent = total;
    $("status-asset-count").textContent = total;
    resetCustomForm();
    renderFileList();
    if (!state.characters.length) {
      $("canvas-loading").hidden = true;
      setStatus(CHAR_RESET?.active?CHAR_RESET.message:"NO ASSETS YET.");
      if(CHAR_RESET?.active){
        $("canvas-loading").textContent=CHAR_RESET.message;
        $("canvas-loading").hidden=false;
        $("custom-preview-status").textContent=CHAR_RESET.message;
        $("custom-base").replaceChildren();
        const waiting=document.createElement("option");
        waiting.value="";waiting.textContent="MENUNGGU MODEL / RIG BARU";
        $("custom-base").append(waiting);
        $("custom-base").disabled=true;
        $("custom-save").disabled=true;
        $("custom-preview").getContext("2d").clearRect(0,0,64,112);
      }
    }
  } catch (error) {
    $("canvas-loading").hidden = true;
    $("canvas-loading").textContent = "ERROR";
    $("canvas-loading").hidden = false;
    setStatus("CATALOG ERROR: " + error.message);
  }
}
$("motion-auto-face").addEventListener("change",event=>{
  state.expressionAuto=Boolean(event.target.checked);
  const motion=state.motion;
  if(motion&&state.mode==="action")selectMotion(motion);
  else syncActionFaceLabel();
});
$("motion-search").addEventListener("input",()=>{
  if(state.selected)buildMotions(state.selected);
});
$("motion-category").addEventListener("change",()=>{
  if(state.selected)buildMotions(state.selected);
});
document.addEventListener("mahluk:modular-rig-saved",()=>{
  const approved=modularReferenceRecord();
  if(!approved)return;
  catalogCharacters=catalogCharacters.filter(c=>c.id!==approved.id);
  catalogCharacters.unshift(approved);
  const wasSelected=state.selected?.id===approved.id;
  rebuildCustomCharacters();
  if(wasSelected)selectCharacter(approved);
});
document.addEventListener("mahluk:pose-saved",()=>{
  if(state.selected&&["human_male_base","human_female_base"].includes(state.selected.id)){
    $("motion-search").value="";$("motion-category").value="all";
    buildMotions(state.selected);
  }
});
init();
