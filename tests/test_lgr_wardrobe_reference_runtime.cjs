const {test}=require("node:test");
const assert=require("node:assert/strict");
const W=require("../site/lgr-wear.js");
const SHA="d4de1eb210ed07f7ec6135ff670377a97cecaf341c6eabeefa907863630d248d";
const REF={
 format:"lgr1-pakaian-v2",id:"male_pants_trousers",gender:"male",
 group:"pants",variant:"trousers",approved:true,baseVersion:"official-9",
 baseRigSha256:SHA,files:{"pants/trousers":"data:image/png;base64,CANONICAL"},
 rev:2,updated:"2026-11-13T06:36:50.615Z",artistBase:true
};
const previous={fetch:globalThis.fetch,Image:globalThis.Image,
 LGRActor:globalThis.LGRActor,LGRDB:globalThis.LGRDB};
function setup({rig=SHA,local=null,remote=REF}={}){
 W.clearCache();
 globalThis.LGRActor={loadBases:async()=>({male:{version:"official-9",pkg:{rigSha256:rig}}})};
 globalThis.LGRDB={get:()=>local};
 globalThis.fetch=async url=>{
  assert.match(url,/wardrobe-approved\/male_pants_trousers\.json/);
  return remote?{ok:true,json:async()=>remote}:{ok:false};
 };
 globalThis.Image=class{
  constructor(){this.onload=null;this.onerror=null}
  set src(value){this.value=value;if(this.onload)this.onload()}
 };
}
test("latest artist canonical pants used when no local master exists",async()=>{
 setup();
 const actual=await W.activeStrip("pants/trousers","male");
 assert.equal(actual.value,REF.files["pants/trousers"]);
});
test("older approved local/Drive master cannot obscure newly committed canonical base",async()=>{
 const old={...REF,updated:"2026-11-12T22:00:00.000Z",files:{"pants/trousers":"OLD-LOCAL"}};
 setup({local:old});
 const actual=await W.activeStrip("pants/trousers","male");
 assert.equal(actual.value,REF.files["pants/trousers"]);
});
test("explicit newly approved master after canonical timestamp is respected",async()=>{
 const newer={...REF,updated:"2026-11-13T08:00:00.000Z",files:{"pants/trousers":"NEW-LOCAL"}};
 setup({local:newer});
 const actual=await W.activeStrip("pants/trousers","male");
 assert.equal(actual.value,"NEW-LOCAL");
});
test("offline fallback can still use saved approved master",async()=>{
 const saved={...REF,updated:"2026-11-12T00:00:00.000Z",files:{"pants/trousers":"OFFLINE-SAVED"}};
 setup({local:saved,remote:null});
 const actual=await W.activeStrip("pants/trousers","male");
 assert.equal(actual.value,"OFFLINE-SAVED");
});
test("wrong Genesis SHA cannot activate saved or published baseline",async()=>{
 setup({rig:"f".repeat(64),local:REF});
 assert.equal(await W.activeStrip("pants/trousers","male"),null);
});
test("unsupported variants do not revive old wardrobe assets",async()=>{
 setup();let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error("unexpected network")};
 assert.equal(await W.activeStrip("pants/baggy","male"),null);
 assert.equal(await W.activeStrip("shoes/sneakers","male"),null);
 assert.equal(calls,0);
});
test("restore browser mock globals",()=>{
 for(const k of Object.keys(previous)){
  if(previous[k]===undefined)delete globalThis[k];
  else globalThis[k]=previous[k];
 }
 assert.ok(true);
});
