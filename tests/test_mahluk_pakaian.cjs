/* PAKAIAN.EXE integration: only new v2 masters go to shared DB; Genesis unchanged. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const site="site/";
const html=fs.readFileSync(site+"genesis-workbench.html","utf8");
const shell=fs.readFileSync(site+"mahluk-hidup-shell.js","utf8");
const editor=fs.readFileSync(site+"mahluk-pakaian.js","utf8");
const css=fs.readFileSync(site+"mahluk-pakaian.css","utf8");
const stock=JSON.parse(fs.readFileSync(site+"media/lgr1/mh-wear/index.json","utf8"));
assert.ok(!html.includes('id="nav-pakaian"')&&!html.includes('id="pakaianpanel"'), 'Pakaian UI retired');
assert.ok(!html.includes('./mahluk-pakaian.js')&&!html.includes('./mahluk-pakaian.css'), 'Pakaian scripts no longer loaded');
assert.ok(!shell.includes('MahlukPakaian.init')&&!shell.includes('nav-pakaian'), 'Pakaian cannot initialize');
assert.ok(html.includes('./lgr-wear.js')&&html.includes('./lgr-db.js'), 'Keep existing outfit/wardrobe data consumption');
new vm.Script(editor,{filename:"mahluk-pakaian.js"});
assert.ok(editor.includes('lgr1-wardrobe-master-v1'));
assert.ok(editor.includes('LGRWear.lookup')&&editor.includes('LGRWear.recolor'));
assert.ok(editor.includes('root.LafrichPuppetRenderer.prepare')&&editor.includes('A.motions()'));
assert.ok(editor.includes('rigFor()')&&editor.includes('buildMaster()'));
assert.ok(editor.includes('LGRDB.save("pakaian",record,{overwrite:true})')&&editor.includes('lgr1-pakaian-v2'));
assert.ok(!editor.includes('pk-base-import'), 'do not allow previewing retired Genesis 5 instead of active Genesis');
assert.ok(editor.includes('pk-export')&&editor.includes('pk-approve'));
assert.ok(!editor.includes('fetch("https://www.googleapis.com/upload/'));
assert.ok(!editor.includes('DELETE /'),"Wardrobe editor must not delete Drive data");
for(const group of ["top","pants","shoes","hair","facial","glasses"])
 assert.ok(stock.items.some(p=>p.startsWith(group+"/")),"Missing source group "+group);
assert.ok(css.includes("@media(max-width:650px)"));
console.log("Pakaian UI retired; existing wardrobe code/data preserved: OK");
