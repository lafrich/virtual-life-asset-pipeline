/* Mahluk Hidup universal 2D pixel rig: persistent local assets, categories
 * and animation contracts. No network, no claims of AI vision or auto-publish.
 */
(function(root,factory){"use strict";const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.VLUniversalRig=api;})(typeof window!=="undefined"?window:null,function(root){
"use strict";
const KEY="mahluk-hidup-rig-assets-v1",VERSION=1;
const DIR=["se","sw","ne","nw"],ID=/^ai_[a-z0-9_]{2,64}$/;
const categoryNames=Object.freeze({
 human_standard:"HUMAN / STANDARD",
 human_long_hair:"HUMAN / LONG HAIR",
 human_outerwear:"HUMAN / OUTERWEAR",
 human_skirt_dress:"HUMAN / SKIRT & DRESS",
 human_accessory_heavy:"HUMAN / ACCESSORY HEAVY",
 mascot_simple:"MASCOT / BIPED",
 nonhuman_custom:"NONHUMAN / CUSTOM"
});
const PROFILES=Object.freeze({
 core:["idle","walk"],
 interior:["sit","sleep","toilet","bathe","eat","office_type"],
 social:["talk","wave","laugh","cry","dance"],
 job:["type","cook","sweep","carry_box","serve"]
});
const BONES=Object.freeze([
 "root","pelvis","spine","neck","head","shoulder_far","elbow_far","hand_far",
 "shoulder_near","elbow_near","hand_near","hip_far","knee_far","foot_far",
 "hip_near","knee_near","foot_near"]);
const anchors=Object.freeze({
 root:[32,100],pelvis:[32,80],spine:[32,64],neck:[32,55],head:[32,42],
 shoulder_far:[20,59],elbow_far:[18,69],hand_far:[18,82],
 shoulder_near:[44,59],elbow_near:[46,69],hand_near:[46,82],
 hip_far:[27,82],knee_far:[27,91],foot_far:[27,99],
 hip_near:[38,82],knee_near:[38,91],foot_near:[38,99]
});
const attach=Object.freeze({head_top:"head",face:"head",back:"spine",chest:"spine",waist:"pelvis",
 left_hand:"hand_far",right_hand:"hand_near",feet:"root"});
const layerOrder=Object.freeze(["shadow","hair_back","arm_far","leg_far","leg_near","feet",
 "torso","outer_back","arm_near","face","hair_front","acc_head","back_item","held_item"]);
function parseFeatures(spec){
 const p=(spec?.prompt||"").toLowerCase();
 return {longHair:/long hair|rambut panjang|ponytail|kuncir/.test(p),
 outerwear:/jacket|jaket|hoodie|coat|cardigan/.test(p),
 skirt:/skirt|rok|dress|gaun/.test(p),
 accessory:/helmet|helm|topi|hat|bag|tas|kacamata|glasses/.test(p)};
}
function suggestCategory(spec){
 if(spec?.species==="animal"||spec?.body==="custom")return "nonhuman_custom";
 if(spec?.species!=="human")return "mascot_simple";
 const f=parseFeatures(spec);
 if(f.skirt)return "human_skirt_dress";
 if(f.outerwear)return "human_outerwear";
 if(f.longHair)return "human_long_hair";
 if(f.accessory)return "human_accessory_heavy";
 return "human_standard";
}
function validAsset(row){
 return Boolean(row&&typeof row==="object"&&ID.test(row.id)&&
 typeof row.name==="string"&&row.name.length>0&&row.name.length<=50&&
 row.spec&&typeof row.spec.prompt==="string"&&row.spec.prompt.length<=2000&&
 row.colors&&typeof row.colors==="object"&&
 ["draft_base","base_approved","rigging","rig_ready"].includes(row.status));
}
function list(){
 try{
  const a=JSON.parse(root.localStorage.getItem(KEY)||"[]");
  return Array.isArray(a)?a.filter(validAsset).slice(0,40):[];
 }catch{return []}
}
function get(id){return list().find(x=>x.id===id)||null}
function save(row){
 if(!validAsset(row))throw Error("Invalid character asset");
 const rows=list();const i=rows.findIndex(x=>x.id===row.id);
 if(i<0&&rows.length>=40)throw Error("Local character storage full (40 assets)");
 const updated={...row,updatedAt:Date.now()};
 if(i>=0)rows[i]=updated;else rows.unshift(updated);
 root.localStorage.setItem(KEY,JSON.stringify(rows));
 root.dispatchEvent?.(new CustomEvent("mahluk:rig-assets-changed",{detail:{id:row.id,status:row.status}}));
 return updated;
}
function remove(id){const rows=list();if(!rows.some(x=>x.id===id))return false;
 root.localStorage.setItem(KEY,JSON.stringify(rows.filter(x=>x.id!==id)));
 root.dispatchEvent?.(new CustomEvent("mahluk:rig-assets-changed",{detail:{id,removed:true}}));return true;
}
function idFor(name){
 const stem=String(name||"character").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,20)||"character";
 return "ai_"+stem+"_"+Date.now().toString(36);
}
function createBase(spec,colors){
 const name=String(spec.name||"").trim().slice(0,50);
 if(!name)throw Error("Enter character name before generating");
 return {version:VERSION,id:idFor(name),name,spec:{name,species:spec.species,body:spec.body,proportion:spec.proportion,
 prompt:String(spec.prompt||"").slice(0,2000)},colors:{...colors},status:"draft_base",rig:null,source:"local-pixel-draft"};
}
function buildRig(row,category,profiles){
 if(!categoryNames[category])throw Error("Unknown rig category");
 const requested=[...new Set(profiles.filter(p=>Object.hasOwn(PROFILES,p)))];
 const humanoid=category!=="nonhuman_custom";
 return {version:1,category,family:humanoid?"humanoid_v1":"custom_v1",profiles:requested,
 bones:humanoid?[...BONES]:[],anchors:humanoid?JSON.parse(JSON.stringify(anchors)):{},
 attach:humanoid?{...attach}:{},layers:humanoid?[...layerOrder]:[],
 animationSlots:Object.fromEntries(requested.flatMap(p=>PROFILES[p].map(a=>[a,a==="idle"||a==="walk"?"test_required":"not_authored"]))),
 tested:{},ready:false};
}
function canPreview(row,action){return row?.rig?.ready&&["idle","walk"].includes(action)&&row.rig.tested?.[action]===true}
function testCore(row,renderer){
 if(!row?.rig||row.status!=="base_approved"&&row.status!=="rigging")throw Error("Approve base character first");
 if(row.rig.family!=="humanoid_v1")return {pass:false,errors:["Custom nonhumanoid requires manually authored bones and actions"]};
 if(!renderer?.render)throw Error("Pixel renderer unavailable");
 const errors=[];
 for(const d of DIR){
  const idle=renderer.render(row.spec,d,row.colors,"idle",0);
  const walkA=renderer.render(row.spec,d,row.colors,"walk",0);
  const walkB=renderer.render(row.spec,d,row.colors,"walk",2);
  if([idle,walkA,walkB].some(c=>c.width!==64||c.height!==112))errors.push(d+": invalid frame size");
  const a=walkA.getContext("2d").getImageData(0,0,64,112).data;
  const b=walkB.getContext("2d").getImageData(0,0,64,112).data;
  if(!a.some((n,i)=>n!==b[i]))errors.push(d+": walk frames identical");
 }
 return {pass:errors.length===0,errors,testedActions:["idle","walk"]};
}
function finishRig(row,result){
 if(!result?.pass||!row?.rig)throw Error("Core rig test has not passed");
 return {...row,status:"rig_ready",rig:{...row.rig,tested:{idle:true,walk:true},
 animationSlots:{...row.rig.animationSlots,idle:"authored_local",walk:"authored_local"},ready:true}};
}
function sourceSheet(row,renderer){
 if(!canPreview(row,"walk"))return null;
 const c=root.document.createElement("canvas"),ctx=c.getContext("2d");c.width=384;c.height=896;ctx.imageSmoothingEnabled=false;
 for(let d=0;d<4;d++){
  for(let f=0;f<6;f++)ctx.drawImage(renderer.render(row.spec,DIR[d],row.colors,"walk",f),f*64,d*112);
  for(let f=0;f<4;f++)ctx.drawImage(renderer.render(row.spec,DIR[d],row.colors,"idle",f),f*64,(d+4)*112);
 }
 return c.toDataURL("image/png");
}
function thumb(row,renderer){return renderer.render(row.spec,"se",row.colors,"idle",0).toDataURL("image/png")}
return Object.freeze({key:KEY,categoryNames,profiles:PROFILES,bones:BONES,anchors,attach,layerOrder,
 suggestCategory,parseFeatures,validAsset,list,get,save,remove,createBase,buildRig,testCore,finishRig,canPreview,sourceSheet,thumb});
});