"use strict";

const grid = document.querySelector("#grid");
const status = document.querySelector("#status");
const empty = document.querySelector("#empty");
const search = document.querySelector("#search");
const totalCount = document.querySelector("#total-count");
const countPill = document.querySelector("#count-pill");
const template = document.querySelector("#character-template");
const filterButtons = Array.from(document.querySelectorAll(".filter"));
const motionReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let characters = [];
let filter = "all";
let term = "";

function text(node, value) {
  node.textContent = String(value ?? "");
}

function card(character, index) {
  const node = template.content.firstElementChild.cloneNode(true);
  const image = node.querySelector(".character-image");
  const toggle = node.querySelector(".motion-toggle");
  const type = character.type === "player" ? "PLAYER" : "NPC";
  text(node.querySelector(".stage-index"), String(index + 1).padStart(3, "0"));
  text(node.querySelector(".stage-type"), type);
  text(node.querySelector("h3"), character.name);
  text(node.querySelector(".card-id"), character.id.toUpperCase().replaceAll("_", "-"));
  text(node.querySelector(".description"), character.description || character.outfit || "Game-ready v6b character");
  image.alt = character.name + " — pixel art walking animation, four directions";
  image.src = motionReduced ? character.poster : character.walk;
  image.width = 350;
  image.height = 386;
  const source = node.querySelector(".source-link");
  const download = node.querySelector(".download-link");
  source.href = character.folder_url;
  source.setAttribute("aria-label", "View " + character.name + " source files in GitHub");
  download.href = character.sheet;
  download.download = character.id + "_v6b_sheet.png";
  download.setAttribute("aria-label", "Download " + character.name + " PNG sprite sheet");

  function setPaused(paused) {
    image.src = paused ? character.poster : character.walk;
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", paused ? "Play animation" : "Pause animation");
    toggle.replaceChildren(document.createTextNode(paused ? "▶ " : "Ⅱ "));
    const label = document.createElement("span");
    label.textContent = paused ? "PLAY" : "PAUSE";
    toggle.appendChild(label);
  }
  setPaused(motionReduced);
  toggle.addEventListener("click", () => {
    const paused = toggle.getAttribute("aria-pressed") !== "true";
    setPaused(paused);
    if (!paused) {
      node.querySelector(".stage-direction").textContent = "WALK / 4 DIRECTIONS";
      node.querySelectorAll(".expression-choice").forEach(button => {
        button.setAttribute("aria-pressed", "false");
        button.classList.remove("is-selected");
      });
    }
  });

  const choices = node.querySelector(".expression-grid");
  const details = node.querySelector(".expression-details");
  const faceList = Array.isArray(character.expressions) ? character.expressions : [];
  node.querySelector(".expression-count").textContent = String(faceList.length).padStart(2, "0");
  if (faceList.length === 0) {
    details.hidden = true;
  } else {
    const selected = node.querySelector(".expression-feature-image");
    const selectedLabel = node.querySelector(".expression-feature-label");
    function showExpression(face, button) {
      selected.src = face.image;
      selected.alt = character.name + " showing " + face.label + " expression";
      selectedLabel.textContent = face.label.toUpperCase();
      setPaused(true);
      image.src = face.image;
      image.alt = selected.alt;
      node.querySelector(".stage-direction").textContent = "EXPRESSION / " + face.label.toUpperCase();
      choices.querySelectorAll(".expression-choice").forEach(item => {
        const active = item === button;
        item.setAttribute("aria-pressed", String(active));
        item.classList.toggle("is-selected", active);
      });
    }
    faceList.forEach((face, i) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "expression-choice";
      button.setAttribute("aria-label", "Preview " + face.label + " expression");
      button.setAttribute("aria-pressed", "false");
      const thumb = document.createElement("img");
      thumb.src = face.image;
      thumb.alt = "";
      thumb.loading = "lazy";
      const label = document.createElement("span");
      label.textContent = face.label;
      button.append(thumb, label);
      button.addEventListener("click", () => showExpression(face, button));
      choices.appendChild(button);
      if (i === 0) showExpression(face, button);
    });
    // Leave the normal animated walking GIF visible until Expressions opens.
    setPaused(motionReduced);
    image.alt = character.name + " — pixel art walking animation, four directions";
    node.querySelector(".stage-direction").textContent = "WALK / 4 DIRECTIONS";
    details.addEventListener("toggle", () => {
      if (details.open) showExpression(faceList[0], choices.firstElementChild);
    });
  }
  return node;
}

function render() {
  const matching = characters.filter((character) => {
    if (filter !== "all" && character.type !== filter) return false;
    const haystack = [character.name, character.id, character.type, character.description,
      character.outfit, character.hairstyle].join(" ").toLowerCase();
    return haystack.includes(term);
  });

  const fragment = document.createDocumentFragment();
  matching.forEach((character) => fragment.appendChild(card(character, characters.indexOf(character))));
  grid.replaceChildren(fragment);
  grid.setAttribute("aria-busy", "false");
  countPill.textContent = String(matching.length).padStart(2, "0");
  empty.hidden = matching.length !== 0;
  status.textContent = matching.length === characters.length
    ? "Displaying all " + characters.length + " archived character" + (characters.length === 1 ? "" : "s") + "."
    : "Showing " + matching.length + " of " + characters.length + " characters.";
}

filterButtons.forEach((button) => button.addEventListener("click", () => {
  filter = button.dataset.filter;
  filterButtons.forEach((item) => {
    const active = item === button;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  render();
}));

search.addEventListener("input", () => {
  term = search.value.trim().toLowerCase();
  render();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "/" || event.altKey || event.ctrlKey || event.metaKey) return;
  const target = event.target;
  if (target instanceof HTMLElement && (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
  event.preventDefault();
  search.focus();
});

(async function init() {
  try {
    const response = await fetch("./catalog.json", { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.characters)) throw new Error("Invalid catalog");
    characters = payload.characters;
    totalCount.textContent = String(characters.length).padStart(2, "0");
    render();
    if (!characters.length) {
      document.querySelector("#empty h3").textContent = "No characters yet.";
      document.querySelector("#empty p").textContent = "Add a verified v6b character to the repository to start the catalog.";
    }
  } catch (error) {
    grid.setAttribute("aria-busy", "false");
    totalCount.textContent = "00";
    countPill.textContent = "00";
    empty.hidden = false;
    document.querySelector("#empty h3").textContent = "Catalog unavailable.";
    document.querySelector("#empty p").textContent = "Please check the GitHub Pages deployment.";
    status.textContent = "Could not load catalog.json (" + error.message + ").";
  }
})();
