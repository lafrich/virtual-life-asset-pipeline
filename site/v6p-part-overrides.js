/* Browser-local v6p part override layer. Same-origin localStorage (lafrich.github.io / VLHub). */
(function(root,factory){"use strict";const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.V6PPartOverrides=api;})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(root){"use strict";
const KEY="vl-v6p-part-overrides-v1";
const catalog=(root&&root.V6PPartCatalog)||(typeof require==="function"?require("./v6p-part-catalog.js"):null);
function storage(){try{return root&&root.localStorage;}catch{return null;}}
function readMap(){
 const raw=storage()?.getItem(KEY);
 if(!raw)return {};
 try{const obj=JSON.parse(raw);return obj&&typeof obj==="object"&&!Array.isArray(obj)?obj:{};}
 catch{return {};}
}
function writeMap(map){throw Error("Legacy V6P pixel overrides are archived read-only under LGR-1.");
 const s=storage();
 if(!s)throw Error("localStorage unavailable");
 s.setItem(KEY,JSON.stringify(map));
}
function get(part){
 if(!catalog||!catalog.isPart(part))return null;
 const row=readMap()[part];
 if(!row||typeof row.dataUrl!=="string"||row.dataUrl.indexOf("data:image/png;base64,")!==0)return null;
 return row;
}
function urlFor(src){
 const part=String(src||"").replace(/\.png$/i,"");
 const row=get(part);
 return row?row.dataUrl:null;
}
function list(){return Object.keys(readMap()).filter(p=>catalog&&catalog.isPart(p)&&get(p));}
function set(part,dataUrl,meta){
 const p=catalog.normalizePart(part);
 if(typeof dataUrl!=="string"||dataUrl.indexOf("data:image/png;base64,")!==0)throw Error("Override must be a PNG data URL");
 if(dataUrl.length>9000000)throw Error("Override PNG too large for localStorage");
 const map=readMap();
 map[p]={dataUrl,part:p,width:meta&&meta.width||catalog.W,height:meta&&meta.height||catalog.H,
  sha256:meta&&meta.sha256||"",updatedAt:new Date().toISOString()};
 writeMap(map);
 return map[p];
}
function clear(part){
 if(part){
  const map=readMap();
  if(catalog.isPart(part)) delete map[part];
  writeMap(map);
  return;
 }
 writeMap({});
}
return Object.freeze({KEY,get,set,clear,list,urlFor,readMap});
});
