/* Ensure wardrobe reuses Genesis's actual pixel editor, not a visual imitation. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const h=fs.readFileSync("site/genesis-workbench.html","utf8");
const e=fs.readFileSync("site/mahluk-pakaian.js","utf8");
const adapter=fs.readFileSync("site/mahluk-pakaian-pixel.js","utf8");
const shared=fs.readFileSync("site/emotion-studio/shared-pixel-editor.js","utf8");
const selection=fs.readFileSync("site/emotion-studio/shared-pixel-selection.js","utf8");
const css=fs.readFileSync("site/mahluk-pakaian.css","utf8");
new vm.Script(adapter);new vm.Script(e);new vm.Script(shared);new vm.Script(selection);
// The Pakaian application is retired from the shell; retain its source as an
// inert reference and preserve stock wardrobe assets for existing characters.
for(const name of ["mahluk-pakaian.js","mahluk-pakaian-pixel.js","shared-pixel-editor.js","shared-pixel-selection.js","mahluk-action-frame-pixel.css"])
 assert.ok(!h.includes(name),"Retired wardrobe editor must not load: "+name);
const match=adapter.match(/node\.innerHTML=("(?:\\.|[^"\\])*");/);
assert.ok(match,"Missing shared-editor modal template");
const html=JSON.parse(match[1]);
const coreIds=[...shared.matchAll(/overlay\.querySelector\("#([^"]+)"\)/g)].map(m=>m[1]);
for(const id of coreIds)assert.ok(html.includes('id="'+id+'"'),"Shared-editor button missing: "+id);
for(const feature of ['data-pixel-tool="move-pixels"','id="pixelGrid"','id="pixelGridType"','value="1"','value="8"','value="16"','id="pixelZoom"','id="pixelZoomFit"','id="pixelToolbarPasteFlip"','id="pixelFlipH"','id="pixelFlipV"'])
 assert.ok(html.includes(feature),"Missing Genesis feature: "+feature);
assert.ok(adapter.includes("ED().create({overlay:modal,canvas"),"Use the original editor, not a replacement");
assert.ok(adapter.includes("g.drawImage(strip,n*64,0,64,112,0,n*112,64,112)"),"Each 4-view wardrobe strip cell must convert to vertical editor atlas");
assert.ok(e.includes("g.drawImage(atlas,0,i*112,64,112,i*64,0,64,112)"),"Editor atlas must round-trip back to horizontal master layout");
assert.ok(e.includes("S.changed.add(path)")&&e.includes("pixelCommit")&&e.includes("saveDraft(true)"),"Applied pixel changes must persist in wardrobe draft");
assert.ok(e.includes('pk-open-full-editor')&&e.includes('PakaianPixelEditor.open()'),"Full editor must be reachable");
assert.ok(css.includes(".pk-editor-launch"),"Visible full-editor launcher missing");
assert.ok(!adapter.includes("LGRDB.save("),"Editor changes should not bypass deliberate SAVE MASTER");
console.log("Pakaian UI retired; inactive editor source still parses and wardrobe data remains protected: OK");
