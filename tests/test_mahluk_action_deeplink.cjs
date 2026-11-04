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
let redirected=null,opened=null;
const location={href:"https://lafrich.github.io/virtual-life-asset-pipeline/#actions",
 origin:"https://lafrich.github.io",search:"",hash:"#actions",
 replace(url){redirected=url;}};

const window={open(url){opened=url;}};
const fetch=async path=>({ok:true,async json(){
 return String(path).includes("animations.json")?{animations:[]}:{characters:[]};
}});
vm.runInNewContext(js,{document:doc,window,location,URL,URLSearchParams,
 fetch,console,history:{replaceState(){}},setTimeout});
const frame=get("action-editor-embed");
assert.equal(frame.src,"about:blank","Hidden legacy iframe should not load");
assert.match(redirected,/virtual-office\/world-builder\/bangun-ruang/,
 "Legacy #actions deep link should open the new Bangun Ruang alignment workflow");
assert.ok(get("switch-chars").handlers.click?.length,"Characters tab missing");
assert.ok(get("switch-animations").handlers.click?.length,"Animations tab missing");
assert.ok(get("animation-author").handlers.click?.length,"Adjustment link missing");
get("switch-chars").trigger("click");
assert.equal(get("character-workspace").hidden,false);
get("switch-animations").trigger("click");
assert.equal(get("animation-workspace").hidden,false);
get("animation-create-action").trigger("click");
assert.match(opened,/virtual-office\/world-builder\/bangun-ruang/);
console.log("PASS legacy Action Editor deeplink redirects to Bangun Ruang; native Characters/Animations remain clickable");
