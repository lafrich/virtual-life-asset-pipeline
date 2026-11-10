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
 for(const id of needed)assert.ok(ids.has(id)||ids.has(G.STAND_INS[id]),"no motion for "+id);
 for(const v of Object.values(G.STAND_INS))assert.ok(ids.has(v),"stand-in "+v+" missing from motions.json");
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
 assert.strictEqual(G.resolveAction("unknown_thing").motion.id,"idle");
 const {G:G2}=load(null);G2.useLibrary(lib);assert.strictEqual(G2.resolveAction("ogah_flag").source,"stand-in");
});
