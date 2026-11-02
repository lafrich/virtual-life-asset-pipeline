"use strict";

/* Read-only animation database overlay for the Paint catalog.
 * Original character sprites and playback are unchanged in app.js. */
(() => {
  const el = id => document.getElementById(id);
  const motionTab = el("switch-animations");
  const characterTab = el("switch-chars");
  const clipsPanel = el("animation-workspace");
  const characterPanel = el("character-workspace");
  const list = el("animation-file-list");
  const mainImage = el("animation-main-image");
  const pause = el("animation-play-toggle");
  const empty = el("animation-missing");

  let library = [];
  let selected = null;
  let group = "all";
  let query = "";
  let playing = true;
  let currentTab = "characters";

  const clipSet = () => library.filter(clip =>
    (group === "all" || (group === "template" ? clip.status === "template" : clip.group === group)) &&
    [clip.name, clip.id, clip.note, clip.group, clip.status].join(" ").toLowerCase().includes(query)
  );
  const writing = (id, value) => { el(id).textContent = String(value ?? "—"); };

  function setMode(mode) {
    currentTab = mode;
    const animation = mode === "animations";
    clipsPanel.hidden = !animation;
    characterPanel.hidden = animation;
    motionTab.classList.toggle("active", animation);
    characterTab.classList.toggle("active", !animation);
    motionTab.setAttribute("aria-selected", String(animation));
    characterTab.setAttribute("aria-selected", String(!animation));
    // The original Paint palette remains available in either workspace.
    el("asset-total").textContent = String(animation ? library.length :
      (typeof state !== "undefined" ? state.characters.length : 0)).padStart(2, "0");
    el("status").textContent = animation ? "ANIMATION DATABASE / PREVIEW MODE" : "CHARACTER STOCK / READY";
  }

  function syncPlaying() {
    const playable = Boolean(selected && selected.gif);
    pause.disabled = !playable;
    el("anim-tool-play").disabled = !playable;
    pause.innerHTML = playable && playing ? "Ⅱ <span>PAUSE</span>" : "▶ <span>PLAY</span>";
    pause.setAttribute("aria-pressed", String(playable && playing));
    el("anim-tool-play").classList.toggle("active", Boolean(playable && playing));
    if (playable) {
      mainImage.src = playing ? selected.gif : selected.poster;
      mainImage.alt = selected.name + (playing ? " — animated preview" : " — first frame");
      mainImage.hidden = false;
      empty.hidden = true;
    } else {
      mainImage.removeAttribute("src");
      mainImage.hidden = true;
      empty.hidden = false;
    }
  }

  function choose(clip) {
    selected = clip;
    playing = Boolean(clip.gif);
    writing("animation-canvas-title", clip.id.toUpperCase() + (clip.gif ? ".GIF" : ".TPL"));
    writing("animation-canvas-tag", clip.status === "template" ? "TEMPLATE / DRAFT" : "PREVIEW / NOT IN GAME");
    writing("animation-name", clip.name);
    writing("animation-type", clip.group.toUpperCase());
    writing("animation-frames", clip.frame_count ? String(clip.frame_count).padStart(2, "0") : "--");
    writing("animation-loop", clip.loop ? "YES" : "NO");
    writing("animation-duration", clip.duration_ms ? (clip.duration_ms / 1000).toFixed(2) + " S" : "—");
    writing("animation-views", clip.directions.length + " DIR");
    writing("animation-directions", clip.layout === "four_up" ? "SE / SW / NE / NW  •  4-UP" : clip.directions.join(" / ").toUpperCase());
    writing("animation-frame-display", clip.gif ? "GIF" : "NO GIF");
    writing("animation-review-status", clip.status === "template" ? "TEMPLATE / NO APPROVED POSES" : "PREVIEW ONLY / NOT IN GAME");
    writing("animation-note", clip.note || "No additional metadata");
    el("animation-review-status").classList.toggle("is-template", clip.status === "template");

    const dl = el("animation-download");
    if (clip.gif) {
      dl.href = clip.gif;
      dl.download = clip.id + "_preview.gif";
      dl.textContent = "↓ PREVIEW.GIF";
      dl.hidden = false;
    } else if (clip.template_json) {
      dl.href = clip.template_json;
      dl.download = clip.id + "_template.json";
      dl.textContent = "↓ TEMPLATE.JSON";
      dl.hidden = false;
    } else {
      dl.hidden = true;
    }
    const source = el("animation-source");
    if (clip.source_url) {
      source.href = clip.source_url;
      source.hidden = false;
    } else {
      source.hidden = true;
    }

    el("animation-loading").hidden = true;
    syncPlaying();
    renderList(false);
    el("status").textContent = "MOTION: " + clip.id.toUpperCase() + (clip.status === "template" ? " / DRAFT" : " / PREVIEW");
  }

  function renderList(pickFirst = true) {
    const records = clipSet();
    writing("anim-file-count", String(records.length).padStart(2, "0"));
    const fragment = document.createDocumentFragment();
    if (!records.length) {
      const noResults = document.createElement("p");
      noResults.className = "file-empty";
      noResults.textContent = "NO MOTION FOUND.";
      fragment.appendChild(noResults);
    }
    for (const clip of records) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "file-item animation-item";
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(selected === clip));
      item.classList.toggle("chosen", selected === clip);

      const preview = document.createElement("span");
      preview.className = "file-preview animation-item-preview";
      if (clip.poster) {
        const img = document.createElement("img");
        img.src = clip.poster;
        img.loading = "lazy";
        img.alt = "";
        preview.append(img);
      } else {
        preview.textContent = "TPL";
        preview.classList.add("animation-template-icon");
      }
      const label = document.createElement("span");
      label.className = "file-label";
      label.textContent = clip.name;
      const secondary = document.createElement("small");
      secondary.textContent = (clip.status === "template" ? "TEMPLATE" : clip.group.toUpperCase()) +
        " / " + (clip.gif ? "GIF" : "DRAFT");
      label.append(secondary);
      item.append(preview, label);
      item.addEventListener("click", () => choose(clip));
      fragment.append(item);
    }
    list.replaceChildren(fragment);
    if (pickFirst && records.length && !records.includes(selected)) choose(records[0]);
  }

  function togglePlayback() {
    if (!selected?.gif) return;
    playing = !playing;
    syncPlaying();
    el("status").textContent = playing ? "PREVIEW / PLAY" : "PREVIEW / PAUSE";
  }

  function changeSelection(delta) {
    const records = clipSet();
    if (!records.length) return;
    const i = records.indexOf(selected);
    choose(records[(i + delta + records.length) % records.length]);
  }

  motionTab.addEventListener("click", () => setMode("animations"));
  characterTab.addEventListener("click", () => setMode("characters"));
  pause.addEventListener("click", togglePlayback);
  el("anim-tool-play").addEventListener("click", togglePlayback);
  el("anim-tool-prev").addEventListener("click", () => changeSelection(-1));
  el("anim-tool-next").addEventListener("click", () => changeSelection(1));
  el("animation-search").addEventListener("input", event => {
    query = event.target.value.trim().toLowerCase();
    renderList();
  });
  document.querySelectorAll(".anim-filter").forEach(button => button.addEventListener("click", () => {
    group = button.dataset.animFilter;
    document.querySelectorAll(".anim-filter").forEach(other => {
      const active = button === other;
      other.classList.toggle("selected", active);
      other.setAttribute("aria-pressed", String(active));
    });
    renderList();
  }));
  // Capture before app.js's original character keyboard handlers: only the
  // active viewer should respond to Space/left/right shortcuts.
  document.addEventListener("keydown", event => {
    if (currentTab !== "animations" || event.altKey || event.ctrlKey || event.metaKey) return;
    const tag = event.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || event.target?.isContentEditable) return;
    if (event.code === "Space" || event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.code === "Space") togglePlayback();
      if (event.key === "ArrowLeft") changeSelection(-1);
      if (event.key === "ArrowRight") changeSelection(1);
    }
  }, true);

  // Palette affects the preview background as in Paint's character viewer.
  el("swatches").addEventListener("click", event => {
    const swatch = event.target.closest(".swatch");
    if (swatch?.style.backgroundColor) el("animation-canvas-space")
      .style.setProperty("--canvas", swatch.style.backgroundColor);
  });

  (async () => {
    try {
      const response = await fetch("./animations.json", {cache:"no-store"});
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      if (!Array.isArray(data.animations)) throw new Error("BAD MOTION INDEX");
      library = data.animations;
      writing("animation-total", String(library.length).padStart(2, "0"));
      renderList();
      if (location.hash === "#animations" || location.hash === "#motion") setMode("animations");
    } catch(error) {
      el("animation-loading").textContent = "ANIMATIONS UNAVAILABLE";
      el("status").textContent = "MOTION ERROR: " + error.message;
    }
  })();
})();
