"use strict";

/* Read-only animation database overlay for the Paint catalog.
 * Original character sprites and playback are unchanged in app.js. */
(() => {
  const el = id => document.getElementById(id);
  const motionTab = el("switch-animations");
  const characterTab = el("switch-chars");
  const clipsPanel = el("animation-workspace");
  const characterPanel = el("character-workspace");
  const actionTab = el("switch-actions");
  const actionPanel = el("action-workspace");
  const actionFrame = el("action-editor-embed");
  let actionFrameStarted = false;
  const actionTypes = new Set(["toilet","bathe","sleep"]);

  function actionContext(extra={}) {
    const requested = new URLSearchParams(location.search);
    const chosenMotion=typeof state!=="undefined"?state.motion?.id:"";
    const motionAction=["sit","sit_type","toilet"].includes(chosenMotion)?"toilet":
      ["swim","bathe"].includes(chosenMotion)?"bathe":
      ["sleep","sleep_seat","lie"].includes(chosenMotion)?"sleep":"toilet";
    const actor=extra.actor||requested.get("actor")||
      (typeof state!=="undefined"?state.selected?.id:null)||"ichsan";
    const action=extra.action||requested.get("action")||motionAction;
    return {actor,action:actionTypes.has(action)?action:"toilet",
      building:extra.building||requested.get("building")||"",
      floor:extra.floor||requested.get("floor")||"",
      fixture:extra.fixture||requested.get("fixture")||""};
  }
  function sendActionContext(context){
    if(!actionFrameStarted){
      const target=new URL("./action-editor.html",location.href);
      target.searchParams.set("embedded","1");
      for(const [key,value] of Object.entries(context))if(value)target.searchParams.set(key,value);
      actionFrameStarted=true;
      actionFrame.src=target.href;
      return;
    }
    actionFrame.contentWindow?.postMessage({type:"mahluk-action-context",context},location.origin);
  }
  function openActionTab(extra={}){
    setMode("actions");
    // The editor stays mounted while switching tabs; no loss of unsaved pixels.
    sendActionContext(actionContext(extra));
  }
  window.VLMahlukActionsTab=Object.freeze({open:openActionTab});
  document.addEventListener("mahluk:open-action-editor",event=>openActionTab(event.detail||{}));
  actionTab.addEventListener("click",()=>openActionTab());
  // Deep links from Bangun Ruang open the embedded tab immediately, even
  // while the unrelated animation GIF catalog is still loading.
  if(["#actions","#action-editor"].includes(location.hash))openActionTab();
  actionFrame.addEventListener("load",()=>{
    if(actionFrame.src==="about:blank")return;
    actionFrame.contentWindow?.postMessage(
      {type:"mahluk-action-context",context:actionContext()},location.origin);
  });
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
  let targets = [];
  const MOTION_MAP = {
    jalan_nyebrang: "walk",
    babeh_walk: "walk",
    tekan_tombol: "press_button",
    ambil_barang: "pick_up",
  };
  // A library clip may be tied to a particular source actor. Use only an
  // actual, published rig binding; never play another NPC's GIF as a substitute.
  function actionForClip(clip) {
    return clip?.action_id || MOTION_MAP[clip?.id] || "";
  }
  function selectedTarget() {
    const id = el("animation-target-char").value;
    return targets.find(character => character.id === id) || null;
  }
  function updateApply() {
    const button = el("animation-apply");
    const character = selectedTarget();
    const actionId = actionForClip(selected);
    const motion = character?.motions?.find(item => item.id === actionId);
    const planned = selected?.status === "planned";
    const available = !planned && Boolean(motion?.available);
    const sharedBones = Boolean(actionId && character?.bone_actions?.includes(actionId));
    button.disabled = !available; // real preview requires this actor's rendered pixels
    button.textContent = available ? "▶ TRY ON " + character.name.toUpperCase() :
      sharedBones ? "SHARED BONES / SKIN PENDING" :
      planned ? "PLANNED / BONE MOTION NOT AUTHORED" :
      actionId ? "BONE MOTION NOT AUTHORED" : "REFERENCE ONLY";
    button.title = available ? "Switch to this character and play its original pixel motion" :
      sharedBones ? "Shared skeletal keys support this model category, but this actor has no bound body-part sprites yet" :
      "No authored shared skeletal keys and actor-specific rendered action are available";
  }
  async function loadTargets() {
    try {
      const response = await fetch("./catalog.json", {cache: "no-store"});
      const catalog = await response.json();
      targets = Array.isArray(catalog.characters) ? catalog.characters : [];
      const select = el("animation-target-char");
      select.replaceChildren();
      for (const character of targets) {
        const option = document.createElement("option");
        option.value = character.id;
        option.textContent = character.name.toUpperCase();
        select.append(option);
      }
      const sourceActor = selected?.actor && targets.find(c => c.id === selected.actor);
      const bowie = targets.find(c => c.id === "aladdin_sane");
      if (sourceActor || bowie) select.value = (sourceActor || bowie).id;
      updateApply();
    } catch (error) {
      el("animation-apply").textContent = "CHARACTER INDEX UNAVAILABLE";
    }
  }


  // Preserve the original real-preview view. Unrendered roadmapped actions
  // belong only in PLANNED/P0 views, never mixed into working GIFs.
  const clipSet = () => library.filter(clip =>
    (group === "planned" ? clip.status === "planned" :
      group === "p0" ? clip.status === "planned" && clip.priority === "P0" :
      clip.status !== "planned" &&
        (group === "all" || (group === "template" ? clip.status === "template" : clip.group === group))) &&
    [clip.name, clip.id, clip.note, clip.group, clip.status,
      clip.category, clip.priority, ...(clip.requirements || [])].join(" ").toLowerCase().includes(query)
  );
  const writing = (id, value) => { el(id).textContent = String(value ?? "—"); };

  function setMode(mode) {
    currentTab = mode;
    const animation = mode === "animations";
    const actions = mode === "actions";
    clipsPanel.hidden = !animation;
    characterPanel.hidden = animation || actions;
    actionPanel.hidden = !actions;
    motionTab.classList.toggle("active", animation);
    characterTab.classList.toggle("active", !animation && !actions);
    actionTab.classList.toggle("active", actions);
    motionTab.setAttribute("aria-selected", String(animation));
    characterTab.setAttribute("aria-selected", String(!animation && !actions));
    actionTab.setAttribute("aria-selected", String(actions));
    // The original Paint palette remains available in either workspace.
    const total = animation ? library.length : (typeof state !== "undefined" ? state.characters.length : 0);
    el("asset-total").textContent = String(total).padStart(2, "0");
    el("status-asset-count").textContent = String(total).padStart(2, "0");
    writing("status-object-label", actions ? "FRAMES" : animation ? "CLIPS" : "OBJECTS");
    document.querySelector(".window-title strong").textContent = "MAHLUK HIDUP";
    el("menu-file").href = animation
      ? "https://github.com/lafrich/virtual-life-asset-pipeline/tree/main/assets/animation_library"
      : "https://github.com/lafrich/virtual-life-asset-pipeline/tree/main/assets/character_stock";
    el("menu-help").href = animation
      ? "https://github.com/lafrich/virtual-life-asset-pipeline/blob/main/docs/animation-library.md"
      : "https://github.com/lafrich/virtual-life-asset-pipeline/blob/main/assets/character_stock/README.md";
    el("menu-edit").title = animation ? "Show motion templates" : "Expressions";
    el("menu-view").title = animation ? "Toggle motion canvas grid" : "Toggle canvas grid";
    el("status").textContent = actions ? "MAHLUK HIDUP / ACTION EDITOR + SIMULATION" :
      animation ? "MAHLUK HIDUP / ANIMATIONS" : "MAHLUK HIDUP / CHARACTERS READY";
  }

  function syncPlaying() {
    const playable = Boolean(selected && selected.gif);
    const still = Boolean(selected && !selected.gif && selected.poster);
    pause.disabled = !playable;
    el("anim-tool-play").disabled = !playable;
    pause.innerHTML = playable && playing ? "Ⅱ <span>PAUSE</span>" : "▶ <span>PLAY</span>";
    pause.setAttribute("aria-pressed", String(playable && playing));
    el("anim-tool-play").classList.toggle("active", Boolean(playable && playing));
    if (playable || still) {
      mainImage.src = playable && playing ? selected.gif : selected.poster;
      mainImage.alt = selected.name + (playing ? " — animated preview" : " — first frame");
      mainImage.hidden = false;
      empty.hidden = true;
    } else {
      mainImage.removeAttribute("src");
      mainImage.hidden = true;
      empty.hidden = false;
      empty.querySelector("strong").textContent = selected?.status === "planned" ? "PLANNED ACTION." :
        selected?.status === "source_only" ? "SOURCE ONLY." : "NO FRAMES.";
      empty.querySelector("span").textContent = selected?.status === "planned"
        ? "GAMEPLAY CONTRACT ONLY / NO CHARACTER FRAMES OR PLAYABLE ANIMATION"
        : selected?.status === "source_only"
        ? "ANIMATION DEFINED IN SOURCE / RENDER NOT AVAILABLE"
        : "TEMPLATE / EDIT POSES TO PREVIEW";
    }
  }

  function choose(clip) {
    selected = clip;
    // Default TRY ON to the clip's real actor when imported and rigged.
    // Other targets remain selectable, but only compatible actions enable it.
    const sourceActor = targets.find(c => c.id === clip.actor);
    if (sourceActor) el("animation-target-char").value = sourceActor.id;
    playing = Boolean(clip.gif);
    writing("animation-canvas-title", clip.id.toUpperCase() + (clip.gif ? ".GIF" : clip.status === "planned" ? ".PLAN" : ".TPL"));
    writing("animation-canvas-tag", clip.status === "planned" ? "PLANNED / NO SPRITE" :
      clip.status === "template" ? "TEMPLATE / DRAFT" :
      clip.status === "source_only" ? "SOURCE / NO RENDER" :
      clip.status === "still" ? "STILL / ONE FRAME" : "PREVIEW / NOT IN GAME");
    writing("animation-name", clip.name);
    writing("animation-type", clip.group.toUpperCase());
    writing("animation-frames", clip.frame_count ? String(clip.frame_count).padStart(2, "0") : "--");
    writing("animation-loop", clip.loop ? "YES" : "NO");
    writing("animation-duration", clip.duration_ms ? (clip.duration_ms / 1000).toFixed(2) + " S" : "—");
    writing("animation-views", clip.directions.length + " DIR");
    writing("animation-directions", clip.layout === "four_up" ? "SE / SW / NE / NW  •  4-UP" : clip.directions.join(" / ").toUpperCase());
    writing("animation-frame-display", clip.gif ? "GIF" : "NO GIF");
    writing("animation-review-status", clip.status === "planned" ? "PLANNED / NO FRAMES / NOT IN GAME" :
      clip.status === "template" ? "TEMPLATE / NO APPROVED POSES" :
      clip.status === "source_only" ? "SOURCE ONLY / NO FRAMES" :
      clip.status === "still" ? "STILL POSE / NO ANIMATION" : "PREVIEW ONLY / NOT IN GAME");
    writing("animation-note", [clip.note || "No additional metadata",
      clip.actor ? "SOURCE ACTOR: " + (targets.find(c => c.id === clip.actor)?.name || clip.actor).toUpperCase() : ""
    ].filter(Boolean).join(" / "));
    const plannedMeta = el("animation-roadmap-meta");
    plannedMeta.hidden = clip.status !== "planned";
    if (clip.status === "planned") {
      writing("animation-plan-priority", clip.priority + " / BATCH " + clip.batch);
      writing("animation-plan-category", (clip.category || "").toUpperCase());
      writing("animation-plan-phases", clip.phases.join(" → ").toUpperCase());
      writing("animation-plan-requires", clip.requirements.length
        ? clip.requirements.join(", ").replaceAll("_", " ").toUpperCase() : "NO PROP");
      writing("animation-plan-event", clip.event?.name?.toUpperCase() || "NONE");
      writing("animation-plan-sync", (clip.sync || "solo").toUpperCase());
    }
    el("animation-review-status").classList.toggle("is-template", clip.status !== "preview");

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
    if (clip.status === "planned") {
      source.href = "https://github.com/lafrich/virtual-life-asset-pipeline/blob/main/assets/animation_library/backlog.json";
      source.hidden = false;
    }

    el("animation-loading").hidden = true;
    syncPlaying();
    updateApply();
    renderList(false);
    el("status").textContent = "MOTION: " + clip.id.toUpperCase() +
      (clip.status === "planned" ? " / PLANNED / NOT PLAYABLE" : clip.status === "template" ? " / DRAFT" : " / PREVIEW");
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
        preview.textContent = clip.status === "planned" ? (clip.priority || "P?") :
          clip.status === "source_only" ? "SRC" : "TPL";
        preview.classList.add("animation-template-icon");
      }
      const label = document.createElement("span");
      label.className = "file-label";
      label.textContent = clip.name;
      const secondary = document.createElement("small");
      secondary.textContent = clip.status === "planned" ? clip.priority + " / " + clip.category.toUpperCase() + " / PLAN" :
        clip.status === "template" ? "TEMPLATE / DRAFT" :
        clip.status === "source_only" ? "SOURCE / NO GIF" :
        clip.status === "still" ? "POSE / 1 FRAME" : clip.group.toUpperCase() + " / GIF";
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

  el("animation-target-char").addEventListener("change", updateApply);
  el("animation-apply").addEventListener("click", () => {
    if (selected?.status === "planned") return; // roadmap is never playable
    const target = selectedTarget();
    const actionId = actionForClip(selected);
    const action = target?.motions?.find(item => item.id === actionId && item.available);
    if (!target || !action) return;
    selectCharacter(target);
    setInspectorTab("motions");
    selectMotion(action);
    setMode("characters");
    location.hash = "#character";
  });
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
  // Paint's global Edit and View menus retain meaningful behavior in motion
  // mode without triggering the hidden character inspector.
  el("menu-edit").addEventListener("click", event => {
    if (currentTab !== "animations") return;
    event.stopImmediatePropagation();
    el("animation-search").value = "";
    query = "";
    group = "template";
    document.querySelectorAll(".anim-filter").forEach(other => {
      const active = other.dataset.animFilter === "template";
      other.classList.toggle("selected", active);
      other.setAttribute("aria-pressed", String(active));
    });
    renderList();
    el("status").textContent = "MOTION TEMPLATES";
  }, true);
  el("menu-view").addEventListener("click", event => {
    if (currentTab !== "animations") return;
    event.stopImmediatePropagation();
    el("animation-canvas-space").classList.toggle("grid-on");
  }, true);
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

  loadTargets();
  (async () => {
    try {
      const response = await fetch("./animations.json", {cache:"no-store"});
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      if (!Array.isArray(data.animations)) throw new Error("BAD MOTION INDEX");
      library = data.animations;
      writing("animation-total", String(library.length).padStart(2, "0"));
      renderList();
      if (["#animations","#motion","#rigs"].includes(location.hash)) {setMode("animations");if(location.hash==="#rigs")history.replaceState(null,"","#animations");}
      else if (["#actions","#action-editor"].includes(location.hash)) openActionTab();
    } catch(error) {
      el("animation-loading").textContent = "ANIMATIONS UNAVAILABLE";
      el("status").textContent = "MOTION ERROR: " + error.message;
    }
  })();
})();
