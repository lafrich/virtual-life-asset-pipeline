// LGR game runtime contract: no V6P runtime, every needed game motion resolves,
// and lookup order is cloud DB (bergerak:<id>) → built-in → stand-in.
const test=require("node:test"),assert=require("node:assert"),fs=require("fs"),path=require("path");
const site=path.join(__dirname,"..","site");
const src=fs.readFileSync(path.join(site,"lgr-game.js"),"utf8");
const needed=JSON.parse(fs.readFileSync(path.join(site,"media/lgr1/needed-motions.json"),"utf8")).motions.map(m=>m.id);
const lib=JSON.parse(fs.readFileSync(path.join(site,"media/lgr1/motions.json"),"utf8"));
function load(db){
 const root={LGRDB:db,LGRDB_BASE:"/x/"};
 const G=new Function("window","globalThis","module",src+";return window.LGRGame")(root,root,undefined);
 return {G,root};
}
test("lgr-game has no V6P dependency",()=>{assert.doesNotMatch(src,/V6PCompositor|v6p-compositor|media\/v6p/)});
test("every needed motion id is built-in or has a built-in stand-in",()=>{
 const ids=new Set(lib.motions.map(m=>m.id));const {G}=load(null);
 for(const id of needed)assert.ok(ids.has(id)||G.STAND_INS[id],"no motion for "+id);
 for(const id of Object.keys(G.STAND_INS)){let v=id,n=0;while(!ids.has(v)&&n++<5)v=Array.isArray(G.STAND_INS[v])?G.STAND_INS[v].find(x=>ids.has(x))||G.STAND_INS[v].at(-1):G.STAND_INS[v];assert.ok(ids.has(v),"stand-in chain for "+id+" never reaches a built-in")}
});
test("motion lookup prefers the cloud DB, then built-in, then stand-in",async()=>{
 const dbMotion={id:"ogah_flag",frames:[{ms:100,parts:{}}]};
 const db={motion:r=>r==="bergerak:ogah_flag"?dbMotion:null};
 const {G}=load(db);
 G.useLibrary(lib);
 assert.strictEqual(G.resolveAction("ogah_flag").source,"bergerak");
 assert.strictEqual(G.resolveAction("ogah_flag").motion,dbMotion);
 assert.deepStrictEqual([G.resolveAction("sit").source,G.resolveAction("sit").motion.id],["builtin","sit"]);
 assert.deepStrictEqual([G.resolveAction("sleep").id,G.resolveAction("sleep").source],["lie_sleep","builtin"]);
 const w=G.resolveAction("wc_squat");assert.deepStrictEqual([w.source,w.motion.id,w.standIn],["stand-in","crouch",true]);
 const cook={id:"cook",frames:[{ms:100,parts:{}}]};
 const {G:G3}=load({motion:r=>r==="bergerak:cook"?cook:null});G3.useLibrary(lib);
 assert.deepStrictEqual([G3.resolveAction("cook").source,G3.resolveAction("cook").motion],["bergerak",cook]);
 const c2=G.resolveAction("cook");assert.deepStrictEqual([c2.source,c2.motion.id],["stand-in","idle"]);
 const rt=G.resolveAction("rinse_tap");assert.deepStrictEqual([rt.motion.id,rt.via],["arms_up",["mandi","arms_up"]]);
 const mandi={id:"mandi",frames:[{ms:100,parts:{}}]};const {G:G4}=load({motion:r=>r==="bergerak:mandi"?mandi:null});G4.useLibrary(lib);
 assert.strictEqual(G4.resolveAction("rinse_tap").motion,mandi);
 assert.strictEqual(G.resolveAction("unknown_thing").motion.id,"idle");
 const {G:G2}=load(null);G2.useLibrary(lib);assert.strictEqual(G2.resolveAction("ogah_flag").source,"stand-in");
});
test("tired falls back to tired_walk (cloud DB), then built-in idle",()=>{
 const tw={id:"tired_walk",frames:[{ms:100,parts:{}}]};
 const {G}=load(null);G.useLibrary(lib);
 const a=G.resolveAction("tired");assert.deepStrictEqual([a.source,a.motion.id,a.via],["stand-in","idle",["tired_walk","idle"]]);
 const {G:G2}=load({motion:r=>r==="bergerak:tired_walk"?tw:null});G2.useLibrary(lib);
 const b=G2.resolveAction("tired");assert.deepStrictEqual([b.motion,b.via],[tw,["tired_walk"]]);
 assert.ok(needed.includes("tired"));
});
