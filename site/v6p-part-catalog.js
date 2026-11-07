/* Generated whitelist of existing site/media/v6p part sheets. */
(function(root,factory){"use strict";const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.V6PPartCatalog=api;})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){"use strict";
const PARTS=Object.freeze(["base/body", "base/body_f", "base/body_front", "base/body_front_f", "base/fx", "base/shadow", "brows/bangs_angry", "brows/bangs_baked", "brows/bangs_blink", "brows/bangs_emb", "brows/bangs_happy", "brows/bangs_sad", "brows/bangs_sleepy", "brows/bangs_smile", "brows/bangs_surpr", "brows/curtain_angry", "brows/curtain_baked", "brows/curtain_blink", "brows/curtain_emb", "brows/curtain_happy", "brows/curtain_sad", "brows/curtain_sleepy", "brows/curtain_smile", "brows/curtain_surpr", "brows/swept_angry", "brows/swept_baked", "brows/swept_blink", "brows/swept_emb", "brows/swept_happy", "brows/swept_sad", "brows/swept_sleepy", "brows/swept_smile", "brows/swept_surpr", "face/f_angry", "face/f_baked", "face/f_blank", "face/f_blink", "face/f_emb", "face/f_happy", "face/f_sad", "face/f_sleepy", "face/f_smile", "face/f_surpr", "face/m_angry", "face/m_baked", "face/m_blank", "face/m_blink", "face/m_emb", "face/m_happy", "face/m_sad", "face/m_sleepy", "face/m_smile", "face/m_surpr", "facial/both", "facial/both_surpr", "facial/mustache", "facial/mustache_surpr", "facial/stubble", "facial/stubble_surpr", "glasses/round", "glasses/square", "hair/long_back", "hair/long_curtain_back", "hair/long_curtain_front", "hair/long_front", "hair/mid_back", "hair/mid_curtain_back", "hair/mid_curtain_front", "hair/mid_front", "hair/short_back", "hair/short_front", "hair/swept_back", "hair/swept_front", "hair/wavy_back", "hair/wavy_curtain_back", "hair/wavy_curtain_front", "hair/wavy_front", "pants/baggy", "pants/baggy_f", "pants/baggy_ripped", "pants/baggy_ripped_f", "pants/nude", "pants/nude_f", "pants/trousers", "pants/trousers_f", "pants/trousers_ripped", "pants/trousers_ripped_f", "shoes/boots", "shoes/boots_f", "shoes/boots_over", "shoes/boots_over_f", "shoes/hightops", "shoes/hightops_f", "shoes/hightops_over", "shoes/hightops_over_f", "shoes/nude", "shoes/nude_f", "shoes/shoes", "shoes/shoes_f", "shoes/sneakers", "shoes/sneakers_f", "top/cardigan", "top/cardigan_back", "top/cardigan_back_f", "top/cardigan_dots", "top/cardigan_dots_back", "top/cardigan_dots_back_f", "top/cardigan_dots_f", "top/cardigan_f", "top/nude", "top/nude_back", "top/nude_back_f", "top/nude_f", "top/shirt", "top/shirt_back", "top/shirt_back_f", "top/shirt_f", "top/shirt_tie", "top/shirt_tie_back", "top/shirt_tie_back_f", "top/shirt_tie_f", "top/tee", "top/tee_back", "top/tee_back_f", "top/tee_f", "top/tee_graphic", "top/tee_graphic_back", "top/tee_graphic_back_f", "top/tee_graphic_f", "top/tee_long", "top/tee_long_back", "top/tee_long_back_f", "top/tee_long_f"]);
const PART_SET=new Set(PARTS);
const W=384,H=4928,FW=64,FH=112,PIVOT=Object.freeze([32,100]);
const DIRS=Object.freeze(["se","sw","ne","nw"]);
const ROWS=Object.freeze({walk:0,idle:4,talk:8,sit:12,sit_type:16,sleep:20,tired:24,swim:28,float:32,lie:36,perch:40});
const FRAMES=Object.freeze({walk:6,idle:4,talk:4,sit:4,sit_type:4,sleep:4,tired:4,swim:6,float:4,lie:4,perch:4});
const ACTIONS=Object.freeze(Object.keys(ROWS));
function isPart(part){return typeof part==="string"&&PART_SET.has(part);}
function normalizePart(part){const p=String(part||"").trim().replace(/^\/+/,"").replace(/\.png$/i,"");if(!isPart(p))throw Error("Not a whitelisted v6p part: "+part);return p;}
function filename(part){return "v6p--"+normalizePart(part).replaceAll("/","__")+".png";}
function sidecarName(part){return "v6p--"+normalizePart(part).replaceAll("/","__")+".pixel-edits.json";}
function parseFilename(name){
  const n=String(name||"");
  const m=n.match(/^v6p--([A-Za-z0-9_]+(?:__[A-Za-z0-9_]+)*)\.png$/);
  if(!m)return null;
  const part=m[1].replaceAll("__","/");
  return isPart(part)?part:null;
}
function mediaPath(part){return "media/v6p/"+normalizePart(part)+".png";}
function mediaUrl(part){return "./"+mediaPath(part);}
function cellOrigin(action,dir,frame){
  if(!Object.prototype.hasOwnProperty.call(ROWS,action))throw Error("Unknown v6p action "+action);
  const di=DIRS.indexOf(dir);
  if(di<0)throw Error("Unknown direction "+dir);
  const nf=FRAMES[action]||4;
  if(!Number.isInteger(frame)||frame<0||frame>=nf)throw Error("Invalid frame "+frame);
  return {x:frame*FW,y:(ROWS[action]+di)*FH,w:FW,h:FH};
}
function clips(){
  return ACTIONS.map(id=>({id,name:id.replaceAll("_"," ").toUpperCase(),status:"ready",frames:FRAMES[id],
    frame_size:[FW,FH],row_start:ROWS[id],columns:FRAMES[id],rows:4,directions:DIRS.slice()}));
}
function appProperties(part,sha256){
  const p=normalizePart(part);
  return {app:"mahluk",kind:"v6pPart",part:p,width:String(W),height:String(H),sha256:String(sha256||"")};
}
return Object.freeze({PARTS,W,H,FW,FH,PIVOT,DIRS,ROWS,FRAMES,ACTIONS,isPart,normalizePart,filename,sidecarName,parseFilename,mediaPath,mediaUrl,cellOrigin,clips,appProperties});
});
