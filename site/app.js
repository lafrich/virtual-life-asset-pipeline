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
  mode: "walk", expression: null, direction: "auto", autoDir: 0,
  playing: !prefersReducedMotion, frame: 0, lastFrameTime: 0,
  zoom: 4, bg: "#f8f6f0", grid: false, image: null, faceImage: null,
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
  state.frame = 0;
  state.autoDir = 0;
  state.image = null;
  state.faceImage = null;
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
  setInspectorTab("info");
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

function selectFace(face) {
  if (!state.selected || !face) return;
  state.mode = "face";
  state.expression = face;
  state.playing = false;
  state.faceImage = null;
  syncPlaybackButton();
  syncTools();
  const all = state.selected.expressions || [];
  [...$("face-grid").children].forEach((button, index) => {
    const active = all[index] === face;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  setStatus("FACE: " + face.label.toUpperCase());
  const current = state.selected;
  cachedImage(face.sprite || face.image, image => {
    if (state.selected !== current || state.expression !== face) return;
    state.faceImage = image;
    draw();
  });
  draw();
}

function startWalking() {
  if (!state.selected) return;
  state.mode = "walk";
  state.expression = null;
  state.faceImage = null;
  state.playing = true;
  state.lastFrameTime = 0;
  syncPlaybackButton();
  syncTools();
  [...$("face-grid").children].forEach(b => {
    b.classList.remove("active");
    b.setAttribute("aria-pressed", "false");
  });
  draw();
  setStatus("WALK: " + state.selected.id.toUpperCase());
}

function togglePlayback() {
  if (!state.selected) return;
  if (state.mode === "face") return startWalking();
  state.playing = !state.playing;
  state.lastFrameTime = 0;
  syncPlaybackButton();
  syncTools();
  setStatus(state.playing ? "PLAYING." : "PAUSED.");
  draw();
}

function syncPlaybackButton() {
  const b = $("play-toggle");
  const playing = state.playing && state.mode === "walk";
  b.innerHTML = playing ? "Ⅱ <span>PAUSE</span>" : "▶ <span>PLAY</span>";
  b.setAttribute("aria-pressed", String(playing));
}

function setDirection(value) {
  state.direction = value;
  state.autoDir = value === "auto" ? 0 : Number(value);
  state.frame = 0;
  state.lastFrameTime = 0;
  if (state.mode === "face") startWalking();
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
  $("info-panel").hidden = isFace;
  $("faces-panel").hidden = !isFace;
  $("tab-faces").classList.toggle("active", isFace);
  $("tab-info").classList.toggle("active", !isFace);
  $("tab-faces").setAttribute("aria-selected", String(isFace));
  $("tab-info").setAttribute("aria-selected", String(!isFace));
  if (isFace && state.selected && !state.expression && state.selected.expressions?.length) {
    selectFace(state.selected.expressions[0]);
  }
  syncTools();
}

function syncTools() {
  $("tool-select").classList.toggle("active", $("faces-panel").hidden);
  $("tool-select").setAttribute("aria-pressed", String($("faces-panel").hidden));
  $("tool-expressions").classList.toggle("active", !$("faces-panel").hidden);
  $("tool-grid").classList.toggle("active", state.grid);
  $("tool-grid").setAttribute("aria-pressed", String(state.grid));
  $("tool-walk").classList.toggle("active", state.playing && state.mode === "walk");
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
  ctx.fillRect(0, 0, w, h);

  if (!state.selected) {
    ctx.fillStyle = "#153fa0";
    ctx.font = "bold 17px monospace";
    ctx.textAlign = "center";
    ctx.fillText("OPEN A FILE.", w / 2, h / 2);
    return;
  }

  const z = state.zoom, x = Math.round((w - 64 * z) / 2);
  const y = Math.round((h - 112 * z) / 2) - 9;
  const footX = x + 32 * z, footY = y + 100 * z;

  // Neutral floor shadow, separate from the source sprite itself.
  ctx.fillStyle = "#161b2640";
  ctx.beginPath();
  ctx.ellipse(footX, footY + 6, 27 * z, Math.max(4, 5 * z), 0, 0, Math.PI * 2);
  ctx.fill();

  if (state.mode === "face" && state.faceImage?.complete && state.faceImage.naturalWidth) {
    const f = state.faceImage;
    // Dedicated 64x112 transparent pixel preview; older builds have a 350x386
    // framed fallback, which still renders cleanly.
    if (f.naturalWidth === 64 && f.naturalHeight === 112) {
      ctx.drawImage(f, x, y, 64 * z, 112 * z);
    } else {
      ctx.drawImage(f, x - 6 * z, y - 2 * z, 76 * z, 112 * z);
    }
  } else if (state.image?.complete && state.image.naturalWidth) {
    const d = state.mode === "face" ? 0 :
      state.direction === "auto" ? state.autoDir : Number(state.direction);
    const row = (state.mode === "face" ? 4 : 0) + d;
    const frame = state.mode === "face" ? 0 : state.frame;
    ctx.drawImage(state.image, frame * 64, row * 112, 64, 112,
                  x, y, 64 * z, 112 * z);
  }
}

function tick(time) {
  if (state.playing && state.mode === "walk" && state.image?.naturalWidth) {
    if (!state.lastFrameTime) state.lastFrameTime = time;
    if (time - state.lastFrameTime >= 145) {
      state.lastFrameTime = time;
      const limit = Math.max(1, Math.min(6, state.selected?.walk_frames || 6));
      state.frame++;
      if (state.frame >= limit) {
        state.frame = 0;
        if (state.direction === "auto") state.autoDir = (state.autoDir + 1) % 4;
      }
      draw();
    }
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
