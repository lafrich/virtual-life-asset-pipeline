"use strict";

const $ = id => document.getElementById(id);
const DIRS = ["se", "sw", "ne", "nw"];
const FIELDS = [
  "name", "template", "hair_style", "fringe", "hair_color", "skin_color",
  "glasses", "lashes", "mustache", "stubble", "glasses_shape", "shirt_kind",
  "shirt_color", "outer_color", "pants_kind", "pants_color",
  "shoes_color", "cardigan_dots", "rips"
];
const PRESETS = {
  ichsan: {
    hair_style: "mid", fringe: "curtain", hair_color: "#2a3242",
    skin_color: "#f1d3b5", glasses: true, lashes: false, mustache: true,
    stubble: true, glasses_shape: "round", shirt_kind: "tee",
    shirt_color: "#2a3242", outer_color: "#454b5b",
    pants_kind: "trousers", pants_color: "#3a4458",
    shoes_color: "#5a412f", cardigan_dots: false, rips: false
  },
  noor: {
    hair_style: "wavy", fringe: "bangs", hair_color: "#2a3242",
    skin_color: "#f1d3b5", glasses: false, lashes: true, mustache: false,
    stubble: false, glasses_shape: "square", shirt_kind: "cardigan",
    shirt_color: "#1c2330", outer_color: "#2a3242",
    pants_kind: "trousers", pants_color: "#1c2330",
    shoes_color: "#1c2330", cardigan_dots: true, rips: false
  }
};
const state = {
  id: "", name: "", playing: true, frame: 0, count: 4,
  atlas: new Map(), desired: "", loaded: null, busy: false, dirty: true
};

function status(message, kind) {
  $("message").textContent = message;
  $("status-label").textContent = kind === "error" ? "ERROR" :
    kind === "busy" ? "GENERATING..." :
    state.dirty ? "UNBUILT CHANGES" : "V6B READY";
  $("status-label").className = "status-label " + (kind || (state.dirty ? "dirty" : "ready"));
}

function getConfig() {
  const config = {};
  for (const key of FIELDS) {
    const input = $(key);
    config[key] = input.type === "checkbox" ? input.checked : input.value;
  }
  return config;
}

function setConfig(config) {
  for (const key of FIELDS) {
    if (config[key] === undefined || config[key] === null) continue;
    const input = $(key);
    if (input.type === "checkbox") input.checked = Boolean(config[key]);
    else input.value = config[key];
  }
  markDirty();
}

function setPreset(name) {
  if (!PRESETS[name]) return;
  const currentName = $("name").value;
  setConfig(Object.assign({template: name}, PRESETS[name]));
  $("name").value = currentName;
}

function markDirty() {
  state.dirty = true;
  $("revision").textContent = "SOURCE SETTINGS MODIFIED";
  if (state.id) status("Settings changed. Select Generate to update the native sprite.");
  else status("Configure your character, then select Generate.");
}

function frameCount() {
  return ["walk", "swim"].includes($("action").value) ? 6 : 4;
}

function draw() {
  if (!state.loaded) return;
  const image = state.loaded;
  for (const [index, dir] of DIRS.entries()) {
    const canvas = $("view-" + dir);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 64, 112);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, state.frame * 64, index * 112, 64, 112, 0, 0, 64, 112);
  }
  $("frame-label").textContent =
    "FRAME " + String(state.frame + 1).padStart(2, "0") +
    " / " + String(state.count).padStart(2, "0");
  for (const button of $("frame-markers").querySelectorAll("button")) {
    const active = Number(button.dataset.frame) === state.frame;
    button.classList.toggle("selected", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

function markers() {
  state.count = frameCount();
  if (state.frame >= state.count) state.frame = 0;
  const rail = $("frame-markers");
  rail.replaceChildren();
  for (let i = 0; i < state.count; i++) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.frame = String(i);
    button.textContent = String(i + 1).padStart(2, "0");
    button.title = "Frame " + (i + 1);
    button.addEventListener("click", () => {
      state.frame = i;
      state.playing = false;
      setPlayButton();
      draw();
    });
    rail.append(button);
  }
  draw();
}

function atlasUrl() {
  const q = new URLSearchParams({
    id: state.id, action: $("action").value, expression: $("expression").value
  });
  return "/api/atlas?" + q.toString();
}

function refreshAtlas() {
  markers();
  if (!state.id) return;
  const url = atlasUrl();
  state.desired = url;
  if (state.atlas.has(url)) {
    state.loaded = state.atlas.get(url);
    draw();
    return;
  }
  const image = new Image();
  image.onload = () => {
    state.atlas.set(url, image);
    if (state.desired === url) {
      state.loaded = image;
      draw();
    }
  };
  image.onerror = () => status("Couldn't load the native expression atlas.", "error");
  image.src = url;
}

function setPlayButton() {
  $("play").textContent = state.playing ? "Ⅱ PAUSE" : "▶ PLAY";
  $("play").setAttribute("aria-pressed", String(state.playing));
}

async function build() {
  if (state.busy) return;
  state.busy = true;
  state.playing = false;
  setPlayButton();
  $("build").disabled = true;
  $("build").textContent = "GENERATING...";
  status("Running original V6B generator. This may take some time.", "busy");
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(getConfig())
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || "Generation failed");
    state.id = result.id;
    state.name = result.name;
    state.atlas.clear();
    state.loaded = null;
    state.frame = 0;
    state.dirty = false;
    $("sprite-title").textContent = result.name.toUpperCase() + ".SPR";
    $("revision").textContent = "NATIVE / 64 × 112 / PIVOT 32,100";
    $("save-png").disabled = false;
    $("save-json").disabled = false;
    status("Built " + result.name + " from live_v6b.py. Four directions are ready.", "ready");
    refreshAtlas();
    state.playing = true;
    setPlayButton();
  } catch (error) {
    status("Generation error: " + error.message, "error");
  } finally {
    state.busy = false;
    $("build").disabled = false;
    $("build").textContent = "✳ GENERATE CHARACTER";
  }
}

function exportFile(kind) {
  if (!state.id) return;
  const path = kind === "sheet" ? "/api/sheet" : "/api/config";
  const link = document.createElement("a");
  link.href = path + "?" + new URLSearchParams({id: state.id});
  link.download = state.name + (kind === "sheet" ? "_v6b_sheet.png" : ".json");
  document.body.append(link);
  link.click();
  link.remove();
}

async function importFile(file) {
  try {
    if (!file || file.size > 16384) throw Error("Invalid or oversized JSON file");
    const json = JSON.parse(await file.text());
    let config = json._studio || json;
    if (json.hair_map && !json._studio) {
      const outfit = json.outfits?.[json.default_outfit] || {};
      config = {
        name: json.name, hair_style: json.hair_style,
        hair_color: json.hair_map["3"], skin_color: json.skin_map?.i,
        fringe: json.fringe === false ? "swept" : json.fringe || "bangs",
        lashes: Boolean(json.lash), glasses: Boolean(json.glasses_default),
        glasses_shape: json.glasses_shape || "square",
        mustache: Boolean(json.mustache), stubble: Boolean(json.stubble),
        shirt_color: outfit.shirt?.color, outer_color: outfit.outer?.color,
        shirt_kind: outfit.outer ? "cardigan" :
          outfit.shirt?.graphic ? "graphic" : outfit.shirt?.type === "shirt" ? "shirt" : "tee",
        pants_kind: outfit.pants?.type,
        pants_color: outfit.pants?.color,
        rips: Boolean(outfit.pants?.rips),
        shoes_color: outfit.shoes?.color
      };
    }
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      throw Error("JSON must contain a V6B character configuration");
    }
    setConfig(config);
    status("Imported configuration. Select Generate to rebuild it.");
  } catch (error) {
    status("Import failed: " + error.message, "error");
  }
}

function connect() {
  for (const key of FIELDS) {
    $(key).addEventListener("input", markDirty);
    $(key).addEventListener("change", markDirty);
  }
  $("template").addEventListener("change", () => setPreset($("template").value));
  $("action").addEventListener("change", refreshAtlas);
  $("expression").addEventListener("change", refreshAtlas);
  $("build").addEventListener("click", build);
  $("play").addEventListener("click", () => {
    state.playing = !state.playing;
    setPlayButton();
  });
  $("save-png").addEventListener("click", () => exportFile("sheet"));
  $("save-json").addEventListener("click", () => exportFile("config"));
  $("import").addEventListener("click", () => $("file-input").click());
  $("file-input").addEventListener("change", async event => {
    await importFile(event.target.files?.[0]);
    event.target.value = "";
  });
  setPreset("ichsan");
  $("name").value = "new_character";
  markers();
  setPlayButton();
  for (const dir of DIRS) {
    const ctx = $("view-" + dir).getContext("2d");
    ctx.imageSmoothingEnabled = false;
  }
  let lastTick = 0;
  function animate(now) {
    if (state.playing && state.loaded && now - lastTick > 210) {
      state.frame = (state.frame + 1) % state.count;
      draw();
      lastTick = now;
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}
document.addEventListener("DOMContentLoaded", connect);
