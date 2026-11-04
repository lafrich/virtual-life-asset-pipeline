"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const html=fs.readFileSync("site/index.html","utf8");
const app=fs.readFileSync("site/app.js","utf8");
const animations=fs.readFileSync("site/animations.js","utf8");
const editorHtml=fs.readFileSync("site/action-editor.html","utf8");
const editor=fs.readFileSync("site/action-editor.js","utf8");
const css=fs.readFileSync("site/style.css","utf8");
const embedded=fs.readFileSync("site/action-editor.css","utf8");
assert.ok(html.includes('id="switch-chars"'));
assert.ok(html.includes('id="switch-animations"'));
assert.ok(html.includes('id="switch-actions"'));
assert.ok(html.includes('id="action-workspace"'));
assert.ok(html.includes('id="action-editor-embed"'));
assert.ok(html.indexOf('id="switch-chars"')<html.indexOf('id="switch-animations"'));
assert.ok(html.indexOf('id="switch-animations"')<html.indexOf('id="switch-actions"'));
assert.ok(animations.includes('actionPanel.hidden = !actions;'));
assert.ok(animations.includes('characterPanel.hidden = animation || actions;'));
assert.ok(animations.includes('const actionFrame = el("action-editor-embed");'));
assert.ok(animations.includes('window.VLMahlukActionsTab=Object.freeze'));
assert.ok(animations.includes('window.addEventListener("message"')===false);
assert.ok(animations.includes('actionFrame.contentWindow?.postMessage'));
assert.ok(animations.includes('target.searchParams.set("embedded","1")'));
assert.ok(animations.includes('["#actions","#action-editor"].includes(location.hash)'));
assert.ok(app.includes('window.open(url.href,"_blank","noopener")'));
assert.ok(app.includes('virtual-office/world-builder/bangun-ruang/'));
assert.ok(html.includes('id="switch-actions" role="tab" aria-selected="false" aria-controls="action-workspace" hidden'));
assert.ok(html.includes('style="display:none !important" tabindex="-1"'));
assert.ok(animations.includes('virtual-office/world-builder/bangun-ruang/'));
assert.ok(editorHtml.includes("ae-embedded"));
assert.ok(editor.includes('event.data?.type==="mahluk-action-context"'));
assert.ok(editor.includes('if(changesActor||changesAction){setAction(nextAction);}'));
assert.ok(css.includes("#action-workspace"));
assert.ok(embedded.includes(".ae-embedded .ae-titlebar,.ae-embedded .ae-menu{display:none!important}"));
// Action workspace must use the SAME XP Paint hierarchy as both sibling tabs,
// rather than a separate blue three-column application embedded in the frame.
for(const klass of [
 'class="tools-panel ae-rail"',
 'class="asset-panel ae-library"',
 'class="canvas-panel ae-preview"',
 'class="details-panel ae-inspector"',
 'class="canvas-head"',
 'class="canvas-space ae-stage"',
 'class="canvas-toolbar ae-playback"',
 'class="detail-content ae-inspector-content"',
 'class="panel-heading"'
])assert.ok(editorHtml.includes(klass),"Missing Paint UI component: "+klass);
assert.ok(editorHtml.includes('id="new-action"'),"New action picker must exist");
assert.ok(editorHtml.includes('id="create-action"'),"Create action button must exist");
assert.ok(!editorHtml.includes('data-ae-action="toilet"'),"Unmade actions must not be hardcoded");
assert.ok(editor.includes('btn.dataset.aeAction===next'),"Action selection stays interactive");
assert.ok(embedded.includes("grid-template-columns:77px 188px minmax(0,1fr) 248px"),
 "The Action Editor must match Characters and Animations column sizes");
assert.ok(embedded.includes("background:var(--canvas)"),
 "The simulated room must inherit Paint canvas surface");
assert.ok(embedded.includes('font:800 10px "Courier New"'),
 "Action controls must use Paint typography instead of an unrelated blue theme");
assert.ok(embedded.includes(".ae-action-item.chosen"),
 "Selected action must use the shared Paint file-list selection treatment");
assert.ok(editor.includes('btn.addEventListener("click",()=>setAction(btn.dataset.aeAction))'),
 "Action thumbnails must be interactive, not decorative");
console.log("PASS Mahluk Hidup hides Action Editor tab and routes alignment to Bangun Ruang while preserving legacy pixel sources");
