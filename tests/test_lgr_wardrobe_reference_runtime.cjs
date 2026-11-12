const {test}=require("node:test");
const assert=require("node:assert/strict");
const W=require("../site/lgr-wear.js");
const SHA="d4de1eb210ed07f7ec6135ff670377a97cecaf341c6eabeefa907863630d248d";
const REF={
 format:"lgr1-pakaian-v2",id:"male_pants_trousers",gender:"male",
 group:"pants",variant:"trousers",approved:true,baseVersion:"official-9",
 baseRigSha256:SHA,files:{"pants/trousers":"data:image/png;base64,RENDERED"},
 rev:1,updated:"2026-11-13T00:00:00.000Z"
};
const previous={fetch:globalThis.fetch,Image:globalThis.Image,
 LGRActor:globalThis.LGRActor,LGRDB:globalThis.LGRDB};
function setup({rig=SHA,local=null}={}){
 W.clearCache();
 globalThis.LGRActor={loadBases:async()=>({male:{version:"official-9",pkg:{rigSha256:rig}}})};
 globalThis.LGRDB={get:()=>local};
 globalThis.fetch=async url=>{
  assert.match(url,/wardrobe-approved\/male_pants_trousers\.json/);
  return {ok:true,json:async()=>REF};
 };
 globalThis.Image=class{
  constructor(){this.onload=null;this.onerror=null}
  set src(value){this.value=value;if(this.onload)this.onload()}
 };
}
test("Lafrich artist pants baseline is a valid standalone static fallback",async()=>{
 setup();
 const actual=await W.activeStrip("pants/trousers","male");
 assert.ok(actual);assert.equal(actual.value,REF.files["pants/trousers"]);
});
test("local or Drive-approved master takes precedence over published reference",async()=>{
 const local={...REF,files:{"pants/trousers":"LOCAL-OVERRIDE"}};
 setup({local});
 let networkCalls=0;
 globalThis.fetch=async()=>{networkCalls++;throw Error("unexpected fetch")};
 const actual=await W.activeStrip("pants/trousers","male");
 assert.ok(actual);assert.equal(actual.value,"LOCAL-OVERRIDE");
 assert.equal(networkCalls,0);
});
test("wrong Genesis SHA cannot activate published baseline",async()=>{
 setup({rig:"f".repeat(64)});
 assert.equal(await W.activeStrip("pants/trousers","male"),null);
});
test("unsupported variants cannot revive pre-Genesis wardrobe",async()=>{
 setup();let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error("unexpected network")};
 assert.equal(await W.activeStrip("pants/baggy","male"),null);
 assert.equal(await W.activeStrip("shoes/sneakers","male"),null);
 assert.equal(calls,0);
});
test("restore test browser globals",()=>{
 for(const k of Object.keys(previous)){
  if(previous[k]===undefined)delete globalThis[k];
  else globalThis[k]=previous[k];
 }
 assert.ok(true);
});
