/* Mahluk Hidup 2.0 — reusable, renderer-agnostic master rig rules.
 * Art stays in source pixels. Anchor + parent control rotation origins;
 * drawOrder controls which transparent plane is in front. All three are
 * independent of per-character expressions, motion keys and wardrobe.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MH2RigRules=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const FORMAT="mahluk-2-general-rig-v1",KEY="mahluk-2-general-rig-rules-v1";
 const HIDDEN=new Set(["brow_l","brow_r","eye_l","eye_r","nose","mouth","blush_l","blush_r"]);
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):min));
 function defaults(rig){
  return {format:FORMAT,version:1,anchors:Object.fromEntries(rig.BONES.map(b=>[b.id,{x:b.x,y:b.y}])),
   parents:Object.fromEntries(rig.BONES.map(b=>[b.id,b.id==="glasses"?"head":b.parent])),
   order:[]};
 }
 function normalize(src,rig){
  const out=defaults(rig),ids=new Set(rig.BONES.map(b=>b.id));
  if(!src||typeof src!=="object")return out;
  for(const b of rig.BONES){
   const a=src.anchors?.[b.id];
   if(a&&Number.isFinite(Number(a.x))&&Number.isFinite(Number(a.y)))
    out.anchors[b.id]={x:clamp(a.x,0,64),y:clamp(a.y,0,112)};
  }
  for(const b of rig.BONES){
   if(b.id==="root")continue;
   const parent=src.parents?.[b.id];
   if(typeof parent==="string"&&ids.has(parent)&&parent!==b.id){
    let cursor=parent,cycle=false,visited=new Set([b.id]);
    while(cursor){
     if(visited.has(cursor)){cycle=true;break}
     visited.add(cursor);cursor=out.parents[cursor];
    }
    if(!cycle)out.parents[b.id]=parent;
   }
  }
  const seen=new Set();
  out.order=(Array.isArray(src.order)?src.order:[]).filter(id=>{
   if(!ids.has(id)||HIDDEN.has(id)||seen.has(id))return false;
   seen.add(id);return true;
  });
  return out;
 }
 function canParent(rules,id,parent,rig){
  if(id==="root"||!rig.BMAP[id]||!rig.BMAP[parent]||id===parent)return false;
  let cursor=parent,seen=new Set();
  while(cursor){
   if(seen.has(cursor)||cursor===id)return false;
   seen.add(cursor);cursor=rules.parents[cursor]??null;
  }
  return true;
 }
 function setParent(rules,id,parent,rig){
  if(!canParent(rules,id,parent,rig))return false;
  rules.parents[id]=parent;return true;
 }
 function setAnchor(rules,id,x,y,rig){
  if(!rig.BMAP[id])return false;
  rules.anchors[id]={x:clamp(x,0,64),y:clamp(y,0,112)};return true;
 }
 function effectiveOrder(rules,ids){
  const current=[...new Set(ids||[])],set=new Set(current);
  if(!rules.order.length)return current;
  return [...rules.order.filter(x=>set.has(x)),...current.filter(x=>!rules.order.includes(x))];
 }
 function moveLayer(rules,id,delta,visible){
  const order=effectiveOrder(rules,visible),at=order.indexOf(id),to=at+delta;
  if(at<0||to<0||to>=order.length)return false;
  [order[at],order[to]]=[order[to],order[at]];
  rules.order=order;return true;
 }
 function layerRank(rules,id,order){
  if(!rules.order.length)return order.indexOf(id);
  const found=rules.order.indexOf(id);
  return found>=0?found:rules.order.length+order.indexOf(id);
 }
 function world(state,rules,rig){
  const model=rig.normalize(state),out={},visiting=new Set();
  const rule=normalize(rules,rig);
  function visit(id){
   if(out[id])return out[id];
   if(visiting.has(id))throw Error("Cyclic plane hierarchy: "+id);
   visiting.add(id);
   const p=model.parts[id],parentId=rule.parents[id]||null,
    parent=parentId?visit(parentId):null,
    anchor=rule.anchors[id],pa=parentId?rule.anchors[parentId]:null;
   const lx=(pa?anchor.x-pa.x:anchor.x)+p.x,
    ly=(pa?anchor.y-pa.y:anchor.y)+p.y,
    theta=(parent?.angle||0)*Math.PI/180,co=Math.cos(theta),si=Math.sin(theta),
    parentScale=parent?.scale||1;
   const node={x:(parent?.x||0)+(lx*co-ly*si)*parentScale,
    y:(parent?.y||0)+(lx*si+ly*co)*parentScale,
    z:(parent?.z||0)+(p.z||0),
    angle:(parent?.angle||0)+p.angle,scale:parentScale*p.scale,
    visible:(parent?.visible??true)&&p.visible,parent:parentId};
   out[id]=node;visiting.delete(id);return node;
  }
  for(const b of rig.BONES)visit(b.id);
  return out;
 }
 function read(store,rig){
  try{
   const saved=JSON.parse(store?.getItem(KEY)||"null");
   return saved?.format===FORMAT?{rules:normalize(saved.rules,rig),
    defaultParts:sanitizeParts(saved.defaultParts,rig),
    pixelPlanes:sanitizePixelPlanes(saved.pixelPlanes,rig),headMerged:saved.headMerged===true,
    savedAt:saved.savedAt||null,revision:saved.revision||1}:null;
  }catch{return null}
 }
 function sanitizeParts(parts,rig){
  if(!parts||typeof parts!=="object")return null;
  const state=rig.normalize({parts});
  return state.parts;
 }
 function sanitizePixelPlanes(sources,rig){
  if(!sources||typeof sources!=="object"||Array.isArray(sources))return {};
  const out={},valid=new Set(rig.BONES.map(b=>b.id));
  for(const [bone,value] of Object.entries(sources)){
   if(!valid.has(bone)||HIDDEN.has(bone)||Object.keys(out).length>=32)continue;
   const png=typeof value==="string"?value:value?.png;
   if(typeof png!=="string"||png.length>200000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(png))continue;
   out[bone]=png;
  }
  return out;
 }
 function save(store,rig,rules,parts,pixelPlanes,headMerged){
  const prior=read(store,rig),doc={format:FORMAT,version:1,
   rules:normalize(rules,rig),defaultParts:sanitizeParts(parts,rig),
   pixelPlanes:sanitizePixelPlanes(pixelPlanes===undefined?prior?.pixelPlanes:pixelPlanes,rig),
   headMerged:headMerged===undefined?(prior?.headMerged===true):headMerged===true,
   revision:(prior?.revision||0)+1,savedAt:new Date().toISOString()};
  store.setItem(KEY,JSON.stringify(doc));return doc;
 }
 return Object.freeze({KEY,FORMAT,HIDDEN,defaults,normalize,canParent,setParent,
  setAnchor,effectiveOrder,moveLayer,layerRank,world,read,save,sanitizeParts,sanitizePixelPlanes});
});
