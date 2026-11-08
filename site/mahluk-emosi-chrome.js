(() => {
"use strict";
function $(id){return document.getElementById(id);}
function closeDrawers(){
  document.querySelectorAll(".mahluk-drawer").forEach((panel) => {panel.hidden = true;});
  document.querySelectorAll(".mahluk-drawer-btn").forEach((btn) => btn.setAttribute("aria-expanded", "false"));
}
function syncChrome(){
  const clip = $("clip-actions");
  document.body.classList.toggle("is-clip", !!(clip && !clip.hasAttribute("hidden")));
  const partFrames = $("mahluk-part-frames");
  if (partFrames) partFrames.hidden = !!(clip && !clip.hasAttribute("hidden"));

}
function init(){
  document.querySelectorAll(".mahluk-drawer-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = $("drawer-" + btn.dataset.drawer);
      if (!panel) return;
      const willOpen = panel.hidden;
      closeDrawers();
      if (willOpen) {
        panel.hidden = false;
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawers();
  });
  ["clip-actions"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    new MutationObserver(syncChrome).observe(el, {attributes: true, attributeFilter: ["hidden"]});
  });
  syncChrome();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
})();
