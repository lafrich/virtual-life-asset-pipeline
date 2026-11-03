"use strict";
// Execute the *real parent* animation-tab script against #actions, not a
// static source check. Before the fix, deep-link routing ran before 'writing'
// was initialized and threw a TDZ ReferenceError, skipping all tab listeners.
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const js=fs.readFileSync("site/animations.js","utf8");
class El{
 constructor(tag="div"){this.tagName=tag.toUpperCase();this.handlers={};this.children=[];
  this.hidden=false;this.src="about:blank";this.value="";this.dataset={};this.textContent="";
  this.style={backgroundColor:"",setProperty(){}};
  this.classList={toggle(){},add(){},remove(){}};
  this.contentWindow={postMessage(){}};
 }
 addEventListener(name,cb){(this.handlers[name]??=[]).push(cb);}
 trigger(name,...args){for(const cb of this.handlers[name]||[])cb(...args);}
 setAttribute(){}
 removeAttribute(){}
 append(...elements){this.children.push(...elements);}
 appendChild(e){this.children.push(e);}
 replaceChildren(...e){this.children=e;}
 querySelector(){return new El();}
}
const ids=new Map();
const get=id=>{if(!ids.has(id))ids.set(id,new El());return ids.get(id);};
const doc={getElementById:get,querySelector(){return new El();},
 querySelectorAll(){return [];},createDocumentFragment(){return new El();},
 createElement(tag){return new El(tag)},addEventListener(){}};
const location={href:"https://lafrich.github.io/virtual-life-asset-pipeline/#actions",
 origin:"https://lafrich.github.io",search:"",hash:"#actions"};
const window={};
const fetch=async path=>({ok:true,async json(){
 return String(path).includes("animations.json")?{animations:[]}:{characters:[]};
}});
vm.runInNewContext(js,{document:doc,window,location,URL,URLSearchParams,
 fetch,console,history:{replaceState(){}},setTimeout});
const frame=get("action-editor-embed");
assert.ok(frame.src.includes("action-editor.html"));
assert.ok(frame.src.includes("embedded=1"));
assert.equal(get("action-workspace").hidden,false);
assert.ok(get("switch-chars").handlers.click?.length,"Characters tab handler missing");
assert.ok(get("switch-animations").handlers.click?.length,"Animations tab handler missing");
assert.ok(get("switch-actions").handlers.click?.length,"Action Editor handler missing");
assert.ok(get("animation-author").handlers.click?.length,"Author button handler missing");
get("switch-chars").trigger("click");
assert.equal(get("character-workspace").hidden,false);
assert.equal(get("action-workspace").hidden,true);
get("switch-animations").trigger("click");
assert.equal(get("animation-workspace").hidden,false);
get("switch-actions").trigger("click");
assert.equal(get("action-workspace").hidden,false);
console.log("PASS direct #actions loads after all DOM controls; Characters, Animations, Actions and Author buttons remain clickable");
