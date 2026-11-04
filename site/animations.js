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
  let lastActionContext = null;
  const validActionId = id=>typeof id==="string"&&/^[a-z][a-z0-9_]{0,89}$/.test(id);

  function actionContext(extra={}) {
    const requested = new URLSearchParams(location.search);
    const chosenMotion=typeof state!=="undefined"?state.motion?.id:"";
    const motionAction=validActionId(chosenMotion)?chosenMotion:"idle";
    const actor=extra.actor||requested.get("actor")||
      (typeof state!=="undefined"?state.selected?.id:null)||"ichsan";
    const action=extra.action||requested.get("action")||motionAction;
    return {actor,action:validActionId(action)?action:"toilet",
      building:extra.building||requested.get("building")||"",
      floor:extra.floor||requested.get("floor")||"",
      fixture:extra.fixture||requested.get("fixture")||"",
      scene:extra.scene||requested.get("scene")||""};
  }
  function sendActionContext(context){
    lastActionContext=context;
    if(!actionFrameStarted){
      const target=new URL("./action-scene-editor.html",location.href);
      target.searchParams.set("embedded","1");
      target.searchParams.set("ui","multi-character-act-v1");
      for(const [key,value] of Object.entries(context))if(value)target.searchParams.set(key,value);
      actionFrameStarted=true;
      actionFrame.src=target.href;
      return;
    }
    actionFrame.contentWindow?.postMessage({type:"mahluk-action-context",context},location.origin);
  }
  function openActionTab(extra={}){
    setMode("actions");
    sendActionContext(actionContext(extra));
    if(location.hash!=="#actions")history.replaceState(null,"","#actions");
  }
  window.VLMahlukActionsTab=Object.freeze({open:openActionTab});
  document.addEventListener("mahluk:open-action-editor",event=>openActionTab(event.detail||{}));
  actionTab.addEventListener("click",()=>openActionTab());
  actionFrame.addEventListener("load",()=>{
    if(actionFrame.src==="about:blank")return;
    actionFrame.contentWindow?.postMessage(
      {type:"mahluk-action-context",context:lastActionContext||actionContext()},location.origin);
  });
  const list = el("animation-file-list");
  const mainImage = el("animation-main-image");
  const pause = el("animation-play-toggle");
  const empty = el("animation-missing");

  let library = [];
  let mediaVersion = "";
  function currentMedia(path){
    // animations.json is always fetched fresh; append its deployed SHA so a
    // corrected GIF never gets stuck behind an old browser/CDN cached file.
    if(!path||!mediaVersion||!/^(?:\.\/)?media\//.test(path))return path;
    const delimiter=path.includes("?")?"&":"?";
    return path+delimiter+"v="+encodeURIComponent(mediaVersion);
  }
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
    const button=el("animation-apply"),actor=selectedTarget();
    const id=actionForClip(selected),motion=actor?.motions?.find(m=>m.id===id);
    const playable=!!(actor?.sheet&&motion?.available&&
      (motion.playback==="authored"||motion.playback==="procedural"));
    button.disabled=!playable;
    button.textContent=!actor?"SELECT CHARACTER":
      !playable?"NO PLAYABLE ACTOR SPRITE":
      "▶ "+(motion.playback==="authored"?"ORIGINAL":"OWN-SPRITE AUTO PREVIEW")+
        " / "+actor.name.toUpperCase();
    button.title=motion?.playback==="authored"?
      "Original frame animation from this character":
      "Shared action preview only; not a finished native sprite animation";
    const author=el("animation-author");
    author.disabled=!validActionId(id)||!actor;
    author.textContent="✥ ADJUST IN BANGUN RUANG";
  }
  async function loadTargets() {
    try {
      const response = await fetch("./catalog.json", {cache: "no-store"});
      const catalog = await response.json();
      const res=await fetch("./player-actions.json",{cache:"no-store"});
      const canonical=res.ok?(await res.json()).actions:[];
      const raw=Array.isArray(catalog.characters)?catalog.characters.map(ch=>{
        const old=Array.isArray(ch.motions)?ch.motions:[];
        const shared=window.VLUniversalSleep?.actionsFor(ch)||[];
        return {...ch,motions:[...old,...shared.filter(m=>!old.some(x=>x.id===m.id))]};
      }):[];
      const union=[...(canonical||[])],ids=new Set(union.map(a=>a.id));
      for(const ch of raw)for(const m of ch.motions){
        if(!ids.has(m.id)){
          ids.add(m.id);union.push({id:m.id,label:m.name,category:m.category});
        }
      }
      targets=raw.map(ch=>({...ch,
        motions:window.VLUniversalMotions.catalogFor(ch,union)}));
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
  // The legacy catalog stays intact on disk, but is not published to this UI.
  // Build the visible list deliberately, one completed/approved action at a time.
  // Put the explicit IDs of QA-approved animations here when ready.
  const APPROVED_ANIMATION_IDS = new Set(["sleep_bed_right","sleep_bed_left","bathe_male_v1","bathe_female_v1",
    "bathtub_bathe_male_v1","bathtub_bathe_female_v1"]);
  const clipSet = () => library.filter(clip =>
    APPROVED_ANIMATION_IDS.has(clip.id) &&
    Boolean(clip.gif) &&
    (group === "all" || clip.group === group) &&
    [clip.name, clip.id, clip.note, clip.group].join(" ").toLowerCase().includes(query)
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
    const total = animation ? clipSet().length : (typeof state !== "undefined" ? state.characters.length : 0);
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
      mainImage.src = currentMedia(playable && playing ? selected.gif : selected.poster);
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
      clip.status === "still" ? "STILL / ONE FRAME" :
      clip.status === "ready" ? "NATIVE V6B / PLAYABLE" :
      "PREVIEW / NOT IN GAME");
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
      clip.status === "still" ? "STILL POSE / NO ANIMATION" :
      clip.status === "ready" ?
        (clip.universal ? "UNIVERSAL" : "ACTOR NATIVE") + " / READY IN GAME" :
      "PREVIEW ONLY / NOT IN GAME");
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
      dl.href = currentMedia(clip.gif);
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
      (clip.status === "planned" ? " / PLANNED / NOT PLAYABLE" :
       clip.status === "ready" ? " / NATIVE / PLAYABLE" :
       clip.status === "template" ? " / DRAFT" : " / PREVIEW");
  }

  function renderList(pickFirst = true) {
    const records = clipSet();
    writing("anim-file-count", String(records.length).padStart(2, "0"));
    const fragment = document.createDocumentFragment();
    if (!records.length) {
      selected = null;
      mainImage.hidden = true;
      mainImage.removeAttribute("src");
      empty.hidden = false;
      el("animation-loading").hidden = true;
      el("animation-apply").disabled = true;
      el("animation-author").disabled = true;
      syncPlaying();
      empty.querySelector("strong").textContent = "START WITH ONE ACTION.";
      empty.querySelector("span").textContent = "CREATE ACTION → TEST FRAMES → APPROVE → ADD TO LIBRARY";
      const noResults = document.createElement("p");
      noResults.className = "file-empty";
      noResults.textContent = query ? "NO MATCHING ANIMATION." : "NO ANIMATIONS YET. CREATE YOUR FIRST ACTION BELOW.";
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
        img.src = currentMedia(clip.poster);
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
      secondary.textContent = clip.status === "ready" ?
          (clip.universal ? "UNIVERSAL V6B" : "HUMAN NATIVE") +
            " / "+clip.frame_count+" FRAMES / READY" :
        clip.status === "planned" ? clip.priority + " / " + clip.category.toUpperCase() + " / PLAN" :
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
  el("animation-author").addEventListener("click",()=>{
    const id=actionForClip(selected);
    if(!validActionId(id))return;
    openActionTab({actor:selectedTarget()?.id||"ichsan",action:id});
  });
  el("animation-apply").addEventListener("click", () => {
    // Planned entries are shown as procedural preview, not authored.
    const target = selectedTarget();
    const actionId = actionForClip(selected);
    const action = target?.motions?.find(item => item.id === actionId && item.available);
    if (!target || !action||!target.sheet||
        !["authored","procedural"].includes(action.playback)) return;
    // Apply to the SAME actor object used by the Characters workspace;
    // duplicate loaded target objects previously desynced motion selection.
    const selectedActor=state.characters.find(ch=>ch.id===target.id)||target;
    selectCharacter(selectedActor);
    setInspectorTab("motions");
    const chosen=selectedActor.motions.find(m=>m.id===actionId)||action;
    selectMotion(chosen);
    setMode("characters");
    location.hash = "#character";
  });
  el("animation-create-action").addEventListener("click", () => openActionTab());
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
    group = "all";
    document.querySelectorAll(".anim-filter").forEach(other => {
      const active = other.dataset.animFilter === "all";
      other.classList.toggle("selected", active);
      other.setAttribute("aria-pressed", String(active));
    });
    renderList();
    el("status").textContent = "ANIMATIONS / READY FOR FIRST ACTION";
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

  // Initialize ALL panel state, DOM references and event listeners before
  // handling a direct #actions link. The old early call above used 'writing'
  // and 'library' while still in the temporal-dead-zone, aborting the rest of
  // this script and leaving tabs/buttons without their click handlers.
  // Don't wait for animations.json: the Action Editor opens independently.
  if(["#actions","#action-editor"].includes(location.hash)){
    openActionTab();
  }
  loadTargets();
  (async () => {
    try {
      const response = await fetch("./animations.json", {cache:"no-store"});
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      if (!Array.isArray(data.animations)) throw new Error("BAD MOTION INDEX");
      mediaVersion = typeof data.build_version === "string" ? data.build_version : "";
      library = data.animations;
      writing("animation-total", String(clipSet().length).padStart(2, "0"));
      renderList();
      if (["#animations","#motion","#rigs"].includes(location.hash)) {setMode("animations");if(location.hash==="#rigs")history.replaceState(null,"","#animations");}
      else if (["#actions","#action-editor"].includes(location.hash))
        openActionTab();
    } catch(error) {
      el("animation-loading").textContent = "ANIMATIONS UNAVAILABLE";
      el("status").textContent = "MOTION ERROR: " + error.message;
    }
  })();
})();
