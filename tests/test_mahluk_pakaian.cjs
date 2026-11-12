/* PAKAIAN.EXE static integration contract: no stock or Genesis mutation. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const site="site/";
const html=fs.readFileSync(site+"genesis-workbench.html","utf8");
const shell=fs.readFileSync(site+"mahluk-hidup-shell.js","utf8");
const editor=fs.readFileSync(site+"mahluk-pakaian.js","utf8");
const css=fs.readFileSync(site+"mahluk-pakaian.css","utf8");
const stock=JSON.parse(fs.readFileSync(site+"media/lgr1/mh-wear/index.json","utf8"));
assert.ok(html.includes('id="nav-pakaian"')&&html.includes('id="pakaianpanel"'));
assert.ok(html.includes('./mahluk-pakaian.js')&&html.includes('./mahluk-pakaian.css'));
assert.ok(shell.includes('pakaian:"pakaianpanel"')&&shell.includes('MahlukPakaian.init'));
new vm.Script(editor,{filename:"mahluk-pakaian.js"});
assert.ok(editor.includes('lgr1-wardrobe-master-v1'));
assert.ok(editor.includes('LGRWear.lookup')&&editor.includes('LGRWear.recolor'));
assert.ok(editor.includes('root.LafrichPuppetRenderer.prepare')&&editor.includes('A.motions()'));
assert.ok(editor.includes('rigFor()')&&editor.includes('pk-base-import'));
assert.ok(editor.includes('pk-export')&&editor.includes('pk-approve'));
assert.ok(!editor.includes('fetch("https://www.googleapis.com/upload/'));
assert.ok(!editor.includes('DELETE /'),"Wardrobe editor must not delete Drive data");
for(const group of ["top","pants","shoes","hair","facial","glasses"])
 assert.ok(stock.items.some(p=>p.startsWith(group+"/")),"Missing source group "+group);
assert.ok(css.includes("@media(max-width:650px)"));
console.log("PAKAIAN.EXE static shell, syntax, stock catalog, and non-destructive authoring: OK");
