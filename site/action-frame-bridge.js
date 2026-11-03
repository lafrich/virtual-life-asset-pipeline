/* Mahluk Hidup — local action-frame overrides shared with Bangun Ruang / Semesta.
 * Browser-local only; no changes to original published character sprites.
 * Entire 64x112 PNG frame, keyed by actor, action, direction and frame.
 */
(function(root,factory){
 "use strict";
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.VLActionFrames=api;
})(typeof window!=="undefined"?window:null,function(root){
 "use strict";
 const KEY="virtual-life-action-frame-edits-v1";
 const DIR=["se","sw","ne","nw"],ACTIONS=["toilet","bathe","sleep"];
 const ID=/^[a-z0-9_-]{1,90}$/;
 const PNG=/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/;
 let cached=null;
 function valid(actor,action,dir,frame){
  return ID.test(actor||"")&&ACTIONS.includes(action)&&DIR.includes(dir)&&
   Number.isInteger(frame)&&frame>=0&&frame<=39;
 }
 function data(){
  if(cached)return cached;
  try{
   const parsed=JSON.parse(localStorage.getItem(KEY)||"null");
   cached=parsed&&parsed.version===1&&parsed.actors&&
    typeof parsed.actors==="object"&&!Array.isArray(parsed.actors)?
    parsed:{version:1,actors:{}};
  }catch{cached={version:1,actors:{}};}
  return cached;
 }
 function actionData(actor,action){
  if(!ID.test(actor||"")||!ACTIONS.includes(action))return null;
  return data().actors[actor]?.[action]||null;
 }
 function get(actor,action,dir,frame){
  if(!valid(actor,action,dir,frame))return null;
  const v=actionData(actor,action)?.frames?.[dir+":"+frame];
  return typeof v==="string"&&v.length<100000&&PNG.test(v)?v:null;
 }
 function offset(actor,action){
  const v=actionData(actor,action)?.offset;
  const clip=n=>Math.max(-32,Math.min(32,Number(n)||0));
  return {x:clip(v?.x),y:clip(v?.y)};
 }
 function save(){
  try{localStorage.setItem(KEY,JSON.stringify(data()));}
  catch(e){cached=null;throw Error("Browser storage full. Export or clear older action edits.");}
  if(root&&typeof root.dispatchEvent==="function"&&typeof root.CustomEvent==="function")
   root.dispatchEvent(new root.CustomEvent("mahluk-action-frame-saved",{detail:{key:KEY}}));
 }
 function set(actor,action,dir,frame,url){
  if(!valid(actor,action,dir,frame))throw Error("Invalid actor/action/direction/frame");
  if(typeof url!=="string"||url.length>100000||!PNG.test(url))
   throw Error("Action frame must be a small 64×112 PNG data URL");
  const db=data(),a=db.actors[actor]||(db.actors[actor]={});
  const item=a[action]||(a[action]={frames:{},offset:{x:0,y:0}});
  item.frames[dir+":"+frame]=url;save();
 }
 function setOffset(actor,action,x,y){
  if(!ID.test(actor||"")||!ACTIONS.includes(action))throw Error("Invalid action offset");
  if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>32||Math.abs(y)>32)
   throw Error("Offset must be within ±32 native pixels");
  const db=data(),a=db.actors[actor]||(db.actors[actor]={});
  const item=a[action]||(a[action]={frames:{},offset:{x:0,y:0}});
  item.offset={x:Math.round(x),y:Math.round(y)};save();
 }
 function remove(actor,action,dir,frame){
  if(!valid(actor,action,dir,frame))return;
  const frames=actionData(actor,action)?.frames;
  if(frames){delete frames[dir+":"+frame];save();}
 }
 function entries(actor,action){
  const frames=actionData(actor,action)?.frames||{};
  return Object.keys(frames).filter(k=>get(actor,action,...parseKey(k))!==null);
 }
 function parseKey(k){
  const p=k.split(":");
  return [p[0],Number(p[1])];
 }
 function invalidate(){cached=null;}
 if(root&&typeof root.addEventListener==="function")
  root.addEventListener("storage",e=>{if(e.key===KEY)invalidate();});
 return Object.freeze({key:KEY,actions:Object.freeze(ACTIONS),directions:Object.freeze(DIR),
  get,offset,set,setOffset,remove,entries,invalidate});
});
