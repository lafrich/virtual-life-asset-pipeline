(() => {
"use strict";
function $(id){return document.getElementById(id);}
function closeDrawers(){
  document.querySelectorAll(".mahluk-drawer").forEach((panel) => {panel.hidden = true;});
  document.querySelectorAll(".mahluk-drawer-btn").forEach((btn) => btn.setAttribute("aria-expanded", "false"));
}
function syncChrome(){
  const overlay = $("overlay-actions");
  const overlayBtn = $("mahluk-overlay-btn");
  if (overlayBtn && overlay) overlayBtn.hidden = overlay.hasAttribute("hidden");
  const clip = $("clip-actions");
  document.body.classList.toggle("is-clip", !!(clip && !clip.hasAttribute("hidden")));
  const partFrames = $("mahluk-part-frames");
  if (partFrames) partFrames.hidden = !!(clip && !clip.hasAttribute("hidden"));
  if (overlay && overlay.hasAttribute("hidden") && $("drawer-overlay") && !$("drawer-overlay").hidden) {
    $("drawer-overlay").hidden = true;
    if (overlayBtn) overlayBtn.setAttribute("aria-expanded", "false");
  }
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
  ["overlay-actions", "clip-actions"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    new MutationObserver(syncChrome).observe(el, {attributes: true, attributeFilter: ["hidden"]});
  });
  syncChrome();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
})();
