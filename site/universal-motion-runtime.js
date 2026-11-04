/* Mahluk Hidup: one canonical action catalog per actor, source-safe previews. */
(function(root,factory){"use strict";const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.VLUniversalMotions=api;
})(typeof window!=="undefined"?window:null,function(){"use strict";
 const ids=["se","sw","ne","nw"],timing=[190,170,210,180,210,190];
 const safe=x=>typeof x==="string"&&/^[a-z][a-z0-9_]{0,89}$/.test(x);
 function primitive(action){
  const a=action.id||"",cat=action.category||"";
  if(/run|dash|jump|stumble|fall|slip|dance|panic/.test(a))return "energetic";
  if(/walk|sneak|cross_road|backstep|stairs/.test(a)||cat==="movement")return "move";
  if(/sleep|lie|nap|bed_|faint|bathtub_bathe/.test(a))return "lie";
  if(/sit|toilet|drive|ride_|queue|wait_bus/.test(a))return "sit";
  if(/type|phone|work|write|read|meeting/.test(a))return "type";
  if(/pick|put_down|crouch|clean|sweep|mop|chop/.test(a))return "reach";
  if(/wave|point|greet|knock|give|receive|press|open|close|hug/.test(a))return "gesture";
  if(/shower|bath|pee|poop|wash|brush_teeth/.test(a))return "wash";
  return cat==="facial"?"face":"talk";
 }
 function prototype(actor,action){
  // Archive-only records may carry a placeholder sheet. Do not mistake that
  // blank asset for an authored four-way character rig.
  if(["source_only","archive_still"].includes(actor?.asset_status))return null;
  const own=Array.isArray(actor.motions)?actor.motions:[],type=primitive(action);
  const prefs={energetic:["walk","talk","idle"],move:["walk","idle"],
   lie:["lie","sit","idle"],sit:["sit_type","sit","idle"],
   type:["sit_type","talk","idle"],reach:["sit","talk","idle"],
   gesture:["talk","idle"],wash:["bathe","sit","idle"],face:["idle","talk"],
   talk:["talk","idle"]}[type];
  const preferred=action.id==="bathtub_bathe"?["lie","sleep_seat","sit","idle"]:prefs;
  const real=preferred.map(id=>own.find(m=>m.id===id&&m.available&&
   (m.source==="native"||m.source==="custom"))).find(Boolean);
  if(real)return {id:real.id,row:real.row||0,frames:real.frames||4,
   sheet:real.sheet||actor.sheet||""};
  return actor.sheet?{id:"idle",row:actor.row_starts?.idle??0,
   frames:actor.idle_frames||4,sheet:actor.sheet}:null;
 }
 function catalogFor(actor,definitions){
  const current=Array.isArray(actor?.motions)?actor.motions:[];
  const registry=Array.isArray(definitions)?definitions:definitions?.actions||[];
  const seen=new Set(),out=[];
  for(const a of registry){
   if(!safe(a.id)||seen.has(a.id))continue;
   seen.add(a.id);
   const real=current.find(m=>m.id===a.id&&m.available&&
    (m.source==="native"||m.source==="custom"||m.source==="universal-native"));
   if(real){out.push({...real,playback:"authored"});continue}
   const base=prototype(actor,a);
   out.push({id:a.id,name:a.label||a.id.replaceAll("_"," ").toUpperCase(),
    category:a.category||"action",frames:6,frame_ms:[...timing],loop:true,
    available:true,source:base?"procedural":"reference",
    playback:base?"procedural":"reference",primitive:primitive(a),prototype:base,
    reason:base?"AUTO PREVIEW / ACTOR'S OWN PIXELS":"REFERENCE ONLY / NO SPRITE"});
  }
  for(const m of current)if(safe(m.id)&&!seen.has(m.id)){
   out.push({...m,playback:m.available?"authored":"reference"});seen.add(m.id);
  }
  return out;
 }
 const movement={energetic:[[0,0],[1,-3],[2,-7],[0,-4],[-1,0],[0,-2]],
  move:[[0,0],[1,-1],[1,0],[0,-1],[-1,0],[-1,-1]],
  sit:[[0,0],[0,1],[0,2],[0,2],[0,1],[0,0]],
  lie:[[0,0],[0,1],[0,2],[0,2],[0,1],[0,0]],
  reach:[[0,0],[1,1],[2,3],[1,3],[0,2],[0,0]],
  gesture:[[0,0],[1,-1],[2,-2],[1,-1],[0,0],[-1,0]],
  wash:[[0,0],[0,-1],[1,-2],[0,-1],[-1,0],[0,0]],
  type:[[0,0],[0,-1],[1,0],[0,-1],[-1,0],[0,0]],
  talk:[[0,0],[0,-1],[1,0],[0,-1],[-1,0],[0,0]]};
 function render(ctx,{action,image,dir=0,frame=0,x=0,y=0,scale=1}){
  const p=action?.prototype,w=image?.naturalWidth||image?.width||0,
   h=image?.naturalHeight||image?.height||0;
  if(!ctx||!p||!w||!h)return false;
  const sx=(frame%(p.frames||4))*64,sy=((p.row||0)+dir)*112;
  if(sx+64>w||sy+112>h)return false;
  const offsets=movement[action.primitive]||movement.talk;
  const [ox,oy]=offsets[frame%offsets.length];
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(image,sx,sy,64,112,Math.round(x+ox*scale),
   Math.round(y+oy*scale),64*scale,112*scale);return true;
 }
 return Object.freeze({DIRECTIONS:ids,primitive,prototype,catalogFor,render});
});
