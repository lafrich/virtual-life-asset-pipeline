"use strict";
/* Functional smoke-test for the embedded Action Editor UI. This recreates
 * failed optional room images and verifies that real click handlers still work.
 * No network, browser library or changes to original artwork are needed.
 */
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const data=new Map(),storage={
 getItem:key=>data.get(key)||null,
 setItem:(key,value)=>data.set(key,String(value)),
 removeItem:key=>data.delete(key)
};
const actors=JSON.parse(fs.readFileSync("assets/animation_library/actions.json","utf8"));
const bindings=JSON.parse(fs.readFileSync("assets/animation_library/gameplay_bindings.json","utf8"));
const catalog={characters:[{id:"ichsan",name:"Ichsan",
 sheet:"media/ichsan.png",motions:[{id:"idle",frames:4,row:4,available:true}],
 expressions:[{id:"sleepy",label:"Sleepy",overlay:"media/ichsan-face-layer-sleepy.png"}]}]};
class E{
 constructor(tag="div",id=""){
  this.tag=tag;this.id=id;this._value="";this.children=[];this.dataset={};
  this.listeners={};this.textContent="";this.disabled=false;this.width=64;this.height=112;
  this.classList={toggle:()=>{},add:()=>{},remove:()=>{}};
 }
 get options(){return this.children.filter(e=>e.tag==="option");}
 get value(){
  return this._value||(this.tag==="select"?(this.options[0]?.value||""):"");
 }
 set value(v){this._value=String(v);}
 append(...items){
  for(const item of items){
   if(item?.tag==="fragment")this.children.push(...item.children);
   else this.children.push(item);
  }
 }
 replaceChildren(...items){this.children=[];this.append(...items);}
 addEventListener(event,fn){(this.listeners[event]??=[]).push(fn);}
 fire(event,payload={}){for(const fn of this.listeners[event]||[])fn(payload);}
 setAttribute(){}
 getContext(){return{
  clearRect(){},drawImage(){},fillRect(){},save(){},restore(){},clip(){},
  getImageData(){return{data:new Uint8ClampedArray([32,44,52,255])}},
  putImageData(){}
 };}
 getBoundingClientRect(){return{left:0,top:0,width:64,height:112};}
 setPointerCapture(){}
 toDataURL(){return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";}
}
const nodes=new Map();
const el=id=>{if(!nodes.has(id))nodes.set(id,new E(
 ["actor","action","direction","building","floor","furniture","brush",
  "action-category","object-layer","template-speed"].includes(id)?"select":"button",id));
 return nodes.get(id);};
el("direction").value="sw";
el("template-speed").value="210";
el("object-layer").value="front";
el("template-rotation").value="0";
el("template-expression").value="neutral";
el("template-loop").checked=true;
el("frame").value="0";
el("brush").value="1";
el("color").value="#445566";
el("pixel").tag="canvas";
el("simulation").tag="canvas";
const list=new E("div","action-list");
const document={
 getElementById:el,
 querySelector(selector){return selector===".ae-action-list"?list:null;},
 querySelectorAll(selector){return selector==="[data-ae-action]"?
  list.children.filter(x=>x.dataset.aeAction):[];},
 createElement(tag){return new E(tag);},
 createDocumentFragment(){return new E("fragment");},
 body:new E("body")
};
const window={VLActionFrames:null,VLBuildingInterior:null,VLInteriorIso:null,
 addEventListener(){},dispatchEvent(){},parent:null};
window.parent=window;
class Img{
 constructor(){this.listeners={};this.complete=false;this.naturalWidth=0;}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 set src(value){
  this.url=value;
  queueMicrotask(()=>{
   if(this.onerror)this.onerror();
   for(const fn of this.listeners.error||[])fn();
  });
 }
}
const fetch=async target=>({
 ok:true,status:200,
 async json(){
  const p=String(target);
  return p.endsWith("player-actions.json")?actors:
   p.endsWith("gameplay-bindings.json")?bindings:catalog;
 }
});
const sandbox={
 window,document,localStorage:storage,Image:Img,fetch,
 location:{origin:"https://lafrich.github.io",href:"https://lafrich.github.io/virtual-life-asset-pipeline/action-editor.html?embedded=1",search:""},
 URL,URLSearchParams,CustomEvent:class{},setTimeout,clearTimeout,
 requestAnimationFrame(){},console,queueMicrotask
};
vm.runInNewContext(fs.readFileSync("site/action-frame-bridge.js","utf8"),sandbox);
vm.runInNewContext(fs.readFileSync("site/action-template-bridge.js","utf8"),sandbox);
vm.runInNewContext(fs.readFileSync("site/action-editor.js","utf8"),sandbox);
async function settle(){
 for(let n=0;n<5;n++)await new Promise(resolve=>setImmediate(resolve));
}
(async()=>{
 await settle();
 for(const id of ["save","save-template","sync","play","next","prev",
  "restart","pencil","erase","pick","undo","reset-frame","download","clear"]){
  assert.equal(typeof el(id).onclick,"function",id+" click handler missing");
 }
 assert.equal(typeof el("action-search").oninput,"function");
 assert.equal(typeof el("action-category").onchange,"function");
 assert.equal(typeof el("direction").onchange,"function");
 assert.equal(typeof el("object-layer").onchange,"function");
 assert.equal(typeof el("template-speed").onchange,"function");
 assert.ok(list.children.length>=200,"All 203 activities should be selectable");
 assert.match(el("sim-status").textContent,/PIXEL EDITOR STILL ACTIVE/);
 // A missing PNG must finish loading to unlock painting rather than freeze.
 el("save").onclick();
 assert.match(el("status").textContent,/DRAW ON THE FRAME/);
 const px=el("pixel");
 px.fire("pointerdown",{button:0,pointerId:1,clientX:20,clientY:30,preventDefault(){}});
 px.fire("pointerup");
 el("save").onclick();
 assert.ok(window.VLActionFrames.get("ichsan","toilet","sw",0),
  "A painted action frame must save even if the external room renderer fails");
 el("object-layer").value="behind";
 el("object-layer").onchange();
 assert.ok(el("template-expression").options.some(x=>x.value==="sleepy"),
  "Native expression selector must read authentic selected actor metadata");
 el("template-rotation").value="90";
 el("template-rotation").onchange();
 el("template-expression").value="sleepy";
 el("template-expression").onchange();
 el("template-loop").checked=false;
 el("template-loop").onchange();
 el("save-template").onclick();
 const draft=window.VLActionTemplates.get("ichsan","toilet");
 assert.ok(draft,"Save to Semesta must create a draft");
 assert.equal(draft.objectLayer,"behind");
 assert.equal(draft.rotation,90);
 assert.equal(draft.expression,"sleepy");
 assert.equal(draft.loop,false);
 assert.equal(draft.ready,false);
 const rows=list.children.filter(x=>x.dataset.aeAction);
 assert.ok(rows.some(x=>x.dataset.aeAction==="clock_in"),"All player activities selectable");
 const target=rows.find(x=>x.dataset.aeAction==="clock_in");
 target.fire("click");
 await settle();
 assert.match(el("ae-canvas-title").textContent,/CLOCK_IN/);
 el("play").onclick();el("next").onclick();el("prev").onclick();el("restart").onclick();
 el("sync").onclick();
 console.log("PASS Action Editor buttons, fallback image load, pixel-save, Semesta templates, four-way picker and XP tab selection");
})().catch(e=>{console.error(e);process.exitCode=1;});
