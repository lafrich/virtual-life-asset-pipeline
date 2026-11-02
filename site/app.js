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
    setPaused(toggle.getAttribute("aria-pressed") !== "true");
  });
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
