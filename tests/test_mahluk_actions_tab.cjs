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
assert.ok(animations.includes('characterPanel.hidden = animation || actions || custom || poser;'));
assert.ok(animations.includes('posePanel.hidden = !poser;'));
assert.ok(html.includes('id="switch-poser"'));
assert.ok(html.includes('id="pose-workspace"'));
assert.ok(animations.includes('customPanel.hidden = !custom;'));
assert.ok(html.includes('id="tab-custom-char"'));
assert.ok(html.includes('id="custom-workspace"'));
assert.ok(animations.includes('const actionFrame = el("action-editor-embed");'));
assert.ok(animations.includes('window.VLMahlukActionsTab=Object.freeze'));
assert.ok(animations.includes('window.addEventListener("message"')===false);
assert.ok(animations.includes('actionFrame.contentWindow?.postMessage'));
assert.ok(animations.includes('target.searchParams.set("embedded","1")'));
assert.ok(animations.includes('["#actions","#action-editor"].includes(location.hash)'));
assert.ok(app.includes('window.VLMahlukActionsTab?.open'));
assert.ok(!html.includes('id="switch-actions" role="tab" aria-selected="false" aria-controls="action-workspace" hidden'));
assert.ok(animations.includes('action-scene-editor.html'));
assert.ok(animations.includes('setMode("actions");'));
assert.ok(!animations.includes("location.replace?."));
assert.ok(html.includes('03 / ACTION EDITOR'));
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
assert.ok(app.includes('playback:m.playback||(m.available&&["native","custom"].includes(m.source)'),
 "Native and custom published motion sprites must show as AUTHORED, not REFERENCE");
const sceneHtml=fs.readFileSync("site/action-scene-editor.html","utf8");
const sceneJs=fs.readFileSync("site/action-scene-editor.js","utf8");
for(const id of ["act-add-character","act-stage","act-motion","act-expression","act-layer",
 "act-gear-shirt","act-gear-pants","act-save","act-import","act-export",
 "act-character-list","act-saved-list","act-object-layer"]){
 assert.ok(sceneHtml.includes('id="'+id+'"'),"Missing multi-actor control "+id);
}
assert.ok(sceneJs.includes('A.save(scene)'));
assert.ok(sceneJs.includes('scene.participants'));
assert.ok(sceneJs.includes('pointermove'));
assert.ok(sceneJs.includes('m.outfit_masks'));
assert.ok(animations.includes('target.searchParams.set("embedded","1")'));

for(const id of ["act-face-asset","act-face-preview","act-apply-face",
 "act-face-upload","act-face-upload-button","act-face-offset-x",
 "act-face-offset-y","act-apply-outfit","act-outfit-pending"]){
 assert.ok(sceneHtml.includes('id="'+id+'"'),"Missing modular face/outfit control: "+id);
}
assert.equal((sceneHtml.match(/id="act-apply-outfit"/g)||[]).length,1,
 "Only one Apply Outfit button should control the selected actor");
assert.ok(sceneHtml.includes('class="scene-apply-bar"'),
 "Apply must stay outside the scrollable inspector");
assert.ok(sceneJs.includes('draft.equipment[slotName]=event.target.value'),
 "Outfit selection must stage edits rather than immediately changing other actors");
assert.ok(sceneJs.includes('p.equipment={...draft.equipment}'),
 "Apply Outfit must commit the selected character wardrobe");
assert.ok(sceneJs.includes('markDirty();paint();renderGear(p,actorFor(p));'),
 "Apply Outfit must redraw preview immediately");
assert.ok(sceneJs.includes('p.faceAssetId=id;p.faceAssetData=asset.data||null'),
 "Apply Face must attach a portable emotion asset to that actor");
assert.ok(sceneJs.includes('drawFacePatch(brush,actor,p,m,frame)'),
 "Face must be drawn from a modular asset on the selected character");
assert.ok(sceneJs.includes('face?.overlay||face?.sheet'),
 "Legacy expression-only NPC overlays must be supported");
assert.ok(sceneJs.includes('faceAssets.filter(x=>x.actorBase===actorBase(actor))'),
 "Face assets from a different character rig must not be offered");
console.log("PASS Mahluk Hidup Action Editor tab supports multi-character scene composition and preset storage");
