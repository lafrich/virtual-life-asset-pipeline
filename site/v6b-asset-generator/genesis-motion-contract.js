/* Genesis GIF reference → V6P motion-stock draft contract.
 * Additive staging only. Does NOT publish/overwrite approved Mahluk stock.
 * Node-compatible for deterministic validation and future GIF retarget pipelines.
 */
(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.GenesisMotionContract=api;
})(typeof window!=="undefined"?window:typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const FORMAT="genesis-motion-stock-draft-v1";
 const CLIP_FORMAT="v6p-act-clip-manifest-v1";
 const CLIP_CONTRACT="v6p-act ACTIVITY SHEET CONTRACT v2";
 const W=64,H=112,PIVOT=Object.freeze([32,100]);
 const DIRS=Object.freeze(["se","sw","ne","nw"]);
 const PARTS=Object.freeze(["leg_l","leg_r","torso","arm_l","arm_r","head"]);
 const ANCHORS=Object.freeze({head:[32,35],torso:[32,60],arm_l:[20,54],arm_r:[44,54],leg_l:[25,84],leg_r:[39,84]});
 const GENESIS=Object.freeze({male:"Genesis Male Nude",female:"Genesis Female Nude"});
 const ATLAS=Object.freeze({w:384,h:2688,cols:6,rows:24,cell:[64,112],pivot:[32,100]});
 function validGender(gender){if(!GENESIS[gender])throw Error("Only Genesis Male Nude / Genesis Female Nude allowed");return gender;}
 function pose(){
   const out={};
   for(const part of PARTS){const a=ANCHORS[part];out[part]={x:0,y:0,angle:0,ax:a[0],ay:a[1]};}
   return out;
 }
 function tracks(frameCount=4){
   const n=Number(frameCount);
   if(!Number.isInteger(n)||n<1||n>6)throw Error("V6P stock atlas supports 1-6 frames");
   return Object.fromEntries(DIRS.map(dir=>[dir,Array.from({length:n},pose)]));
 }
 function cleanName(name){return String(name||"").trim().slice(0,80);}
 function create({name,gender="male",template="idle",frameCount=4,ms=140,loop=true,id}={}){
   validGender(gender);
   if(!["idle","sit","lie","sleep"].includes(template))throw Error("Unsupported Genesis starting pose");
   const title=cleanName(name);if(!title)throw Error("Animation name required");
   const n=Number(frameCount);if(!Number.isInteger(n)||n<1||n>6)throw Error("Use 1-6 frames");
   const duration=Number(ms);if(!Number.isFinite(duration)||duration<40||duration>800)throw Error("Frame length must be 40-800ms");
   const slug=title.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,24)||"motion";
   const safeId=id||("clip_genesis_"+slug+"_"+Date.now().toString(36));
   if(!/^clip_[a-z0-9_]{4,70}$/.test(safeId))throw Error("Invalid stock clip id");
   return {format:FORMAT,id:safeId,name:title,gender,genesis:GENESIS[gender],template,
     loop:!!loop,frames:Array.from({length:n},(_,i)=>({key:"f"+i,ms:Math.round(duration)})),
     dirs:DIRS.slice(),pivot:PIVOT.slice(),tracks:tracks(n),
     source:{kind:"gif-reference",filename:null,appliedAsArtwork:false},
     reviewStatus:"DRAFT_NOT_APPROVED"};
 }
 function validate(draft){
   if(!draft||draft.format!==FORMAT)throw Error("Unknown Genesis motion draft");
   validGender(draft.gender);
   if(draft.genesis!==GENESIS[draft.gender])throw Error("Genesis source mismatched");
   if(!/^clip_[a-z0-9_]{4,70}$/.test(draft.id||""))throw Error("Invalid clip id");
   if(!cleanName(draft.name))throw Error("Missing animation title");
   if(!["idle","sit","lie","sleep"].includes(draft.template))throw Error("Unsupported base pose");
   if(!Array.isArray(draft.frames)||draft.frames.length<1||draft.frames.length>6)throw Error("Invalid frame count");
   draft.frames.forEach(f=>{if(!Number.isFinite(f.ms)||f.ms<40||f.ms>800)throw Error("Invalid frame duration");});
   for(const dir of DIRS){
     const rows=draft.tracks?.[dir];if(!Array.isArray(rows)||rows.length!==draft.frames.length)throw Error("Missing "+dir+" frames");
     rows.forEach(p=>{for(const part of PARTS){
       const t=p?.[part];if(!t||["x","y","angle","ax","ay"].some(k=>!Number.isFinite(t[k])))throw Error("Invalid "+dir+" "+part+" pose");
     }});
   }
   return true;
 }
 function record(draft,atlasDataUrl){
   validate(draft);
   if(typeof atlasDataUrl!=="string"||!atlasDataUrl.startsWith("data:image/png;base64,"))throw Error("Atlas PNG is required");
   const manifest={
     format:CLIP_FORMAT,contract:CLIP_CONTRACT,id:draft.id,name:draft.name,
     band:"custom",bandStart:0,loop:draft.loop,emosi:false,
     dirs:DIRS.slice(),frames:draft.frames.map(f=>({key:String(f.key).slice(0,32),ms:Math.round(f.ms)})),
     requiredParts:["base/body"],sheet:{w:384,h:2688,cols:6,rows:24,cell:[64,112],pivot:PIVOT.slice()}
   };
   const meta={id:draft.id,name:draft.name,gender:draft.gender,template:draft.template,
     frames:manifest.frames,loop:draft.loop,tracks:draft.tracks,genesis:draft.genesis,
     source:draft.source,updated:new Date().toISOString()};
   return {format:FORMAT,status:"REVIEW_ONLY_NOT_INSTALLED",id:draft.id,meta,
     clip:{manifest,layers:{"base/body":atlasDataUrl}},
     notes:"Import via reviewed Mahluk animation ingestion. This draft must NOT overwrite approved native stock."};
 }
 return Object.freeze({FORMAT,CLIP_FORMAT,W,H,PIVOT,DIRS,PARTS,ANCHORS,GENESIS,ATLAS,pose,tracks,create,validate,record});
});
