"use strict";

// Character Stock Paint is a viewer, not a pixel editor. Source sprites and
// facial-expression layers are read-only and auto-discovered by the builder.
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
  faceImage: null, faceOverlay: null, blinkOverlay: null, lastBlink: 0,
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
  state.mode = "walk";
  state.expression = null;
  state.motion = null;
  state.frame = 0;
  state.autoDir = 0;
  state.image = null;
  state.motionImage = null;
  state.faceImage = null;
  state.faceOverlay = null;
  state.blinkOverlay = null;
  state.playing = !prefersReducedMotion;
  $("canvas-loading").hidden = false;

  $("canvas-name").textContent = character.id.toUpperCase() + ".SPR";
  $("character-name").textContent = prettyName(character);
  $("prop-type").textContent = String(character.type || "npc").toUpperCase();
  $("inspector-thumb").src = character.thumbnail || character.poster;
  $("inspector-thumb").alt = character.name + " pixel-art preview";
  $("download-sheet").href = character.sheet;
  $("download-sheet").download = character.id + "_v6b_sheet.png";
  $("open-source").href = character.folder_url;
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

  cachedImage(character.sheet, image => {
    if (state.selected !== character) return;
    state.image = image;
    $("canvas-loading").hidden = true;
    draw();
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
    img.src = face.sprite || face.image;
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
  state.expression = null;
  state.faceImage = null;
  state.faceOverlay = null;
  state.blinkOverlay = null;
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
  [...$("face-grid").children].forEach(b => {
    b.classList.remove("active");
    b.setAttribute("aria-pressed","false");
  });
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
  state.motion = null;
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
  syncMotionSelection();
  syncPlaybackButton();
  syncTools();
  setStatus("ANIMATED FACE: " + face.label.toUpperCase());
  draw();
}

function startWalking() {
  if (!state.selected) return;
  const motion = state.selected.motions?.find(m => m.id === "walk" && m.available);
  if (motion) return selectMotion(motion);
  state.mode = "walk";
  state.playing = !prefersReducedMotion;
  state.frame = 0;
  syncPlaybackButton();
  draw();
}

function togglePlayback() {
  if (!state.selected) return;
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

function setInspectorTab(tab) {
  const isFace = tab === "faces";
  const isMotion = tab === "motions";
  $("info-panel").hidden = isFace || isMotion;
  $("faces-panel").hidden = !isFace;
  $("motions-panel").hidden = !isMotion;
  for (const [id,active] of [["tab-info", !isFace && !isMotion],
                             ["tab-faces", isFace], ["tab-motions", isMotion]]) {
    $(id).classList.toggle("active",active);
    $(id).setAttribute("aria-selected",String(active));
  }
  if (isFace && state.selected && !state.expression && state.selected.expressions?.length) {
    selectFace(state.selected.expressions[0]);
  }
  if (isMotion && state.selected && state.mode === "face") {
    startWalking();
  }
  syncTools();
}

function syncTools() {
  $("tool-select").classList.toggle("active", $("info-panel").hidden === false);
  $("tool-select").setAttribute("aria-pressed", String($("info-panel").hidden === false));
  $("tool-expressions").classList.toggle("active", !$("faces-panel").hidden);
  $("tool-grid").classList.toggle("active",state.grid);
  $("tool-grid").setAttribute("aria-pressed",String(state.grid));
  $("tool-walk").classList.toggle("active",state.playing && state.mode !== "face");
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
    image.src = character.thumbnail || character.poster;
    preview.append(image);
    const label = document.createElement("span");
    label.className = "file-label";
    label.textContent = String(character.name).toUpperCase();
    const small = document.createElement("small");
    small.textContent = (character.type || "npc").toUpperCase() + " / " +
      String(index + 1).padStart(3, "0");
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
      }
    }
  }
}

function tick(time) {
  if (state.playing && state.image?.naturalWidth) {
    if (!state.lastFrameTime) state.lastFrameTime = time;
    let frames, duration, done, loop;
    if (state.mode === "face") {
      frames = state.selected?.idle_frames || 4;
      duration = 210;
      loop = true;
      state.lastBlink = Math.floor(time / 200) % 24 === 19 ? 1 : 0;
    } else {
      const motion = state.motion;
      frames = motion?.frames || 6;
      duration = motion?.frame_ms?.[state.frame] || 145;
      loop = motion?.loop ?? true;
      state.lastBlink = 0;
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
$("menu-edit").addEventListener("click", () => setInspectorTab("faces"));
$("menu-view").addEventListener("click", toggleGrid);
$("return-walk").addEventListener("click", () => { startWalking(); setInspectorTab("info"); });

document.addEventListener("keydown", event => {
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
  syncPlaybackButton();
  draw();
  requestAnimationFrame(tick);
  try {
    const response = await fetch("./catalog.json", { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const payload = await response.json();
    if (!Array.isArray(payload.characters)) throw new Error("BAD CATALOG");
    state.characters = payload.characters;
    const total = String(state.characters.length).padStart(2, "0");
    $("asset-total").textContent = total;
    $("status-asset-count").textContent = total;
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
