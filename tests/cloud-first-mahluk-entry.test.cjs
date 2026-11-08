const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),crypto=require("node:crypto");
const JS=fs.readFileSync("site/cloud-first-mahluk-entry.js","utf8");
const HTML=fs.readFileSync("site/mahluk-hidup.html","utf8");
function boot(initial={}){
 const records=new Map(Object.entries(initial)),calls=[];
 const D={
  connected:()=>true,connect:async()=>{calls.push("connect")},
  listRecords:async kind=>[...records.values()].filter(r=>r.kind===kind).map(r=>r.data),
  loadRecord:async(kind,id)=>records.get(kind+"/"+id)?.data||null,
  saveRecord:async(kind,id,data)=>{calls.push("save "+kind+"/"+id);records.set(kind+"/"+id,{kind,data});return {verified:true,id}}
 };
 const U={hash:async x=>crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex")};
 let config=null;
 const Gate={mount:cfg=>{config=cfg;return {exportUniversal:async()=>true}}};
 const document={readyState:"complete",querySelector:()=>null,addEventListener:()=>{},getElementById:()=>null};
 const window={MembangunUniversal:U,MembangunCloudStartup:Gate,VLMahlukHubDrive:D,document};
 vm.runInNewContext(JS,{window,document,location:{origin:"https://lafrich.github.io"},console});
 return {config,D,U,calls,records};
}
test("Mahluk startup lists verified native Character, Action and Animation Drive records",async()=>{
 const s=boot({"character/a":{kind:"character",data:{id:"a",v6p:{}}},
  "action/b":{kind:"action",data:{id:"b",actors:[]}},
  "animation/c":{kind:"animation",data:{id:"c",meta:{}}}});
 assert.equal(s.config.app,"mahluk");
 const r=await s.config.adapter.loadAll();
 assert.equal(r.verified,true);assert.equal(r.count,3);
 assert.deepEqual([...r.records.map(x=>x.kind)].sort(),["action","animation","character"]);
});
test("Mahluk import refuses overwriting changed Drive content",async()=>{
 const s=boot({"character/a":{kind:"character",data:{id:"a",v6p:{hair:"old"}}}});
 const incoming={app:"mahluk",kind:"character",id:"a",data:{id:"a",v6p:{hair:"new"}}};
 const sha=await s.U.hash(incoming.data);
 await assert.rejects(s.config.adapter.upload({...incoming,sha256:sha}),/CLOUD CONFLICT/);
 assert.deepEqual(s.records.get("character/a").data,{id:"a",v6p:{hair:"old"}});
 assert.equal(s.calls.length,0);
});
test("Mahluk import creates new Drive records with verified readback",async()=>{
 const s=boot(),incoming={app:"mahluk",kind:"action",id:"hello",data:{id:"hello",actors:[]}};
 incoming.sha256=await s.U.hash(incoming.data);
 assert.equal((await s.config.adapter.upload(incoming)).verified,true);
 const back=await s.config.adapter.readback(incoming);
 assert.deepEqual(JSON.parse(JSON.stringify(back.data)),incoming.data);
});
test("Mahluk startup preserves local data and hides deprecated backup/restore UI",()=>{
 assert.ok(!/localStorage\.(?:clear|removeItem)\s*\(/.test(JS));
 assert.ok(!/indexedDB\.(?:deleteDatabase|open)\s*\(/.test(JS));
 for(const f of ["cloud-first-universal.js","cloud-first-startup.js","cloud-first-mahluk-entry.js"])
  assert.ok(HTML.includes('src="./'+f),f);
 assert.match(HTML,/id="drive-save" hidden style="display:none"/);
 assert.match(HTML,/id="drive-load" hidden style="display:none"/);
});
