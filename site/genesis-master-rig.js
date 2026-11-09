/* Genesis master profiles, strictly limited to the two original approved bases.
 * Stable IDs remain unchanged. This stores editable rig/masks, NOT new characters
 * and NOT an executable animation. The original Genesis source PNGs stay intact.
 */
(function(root,factory){"use strict";const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.GenesisMasterRig=api;})(typeof window!=="undefined"?window:null,function(root){
 "use strict";
 const FORMAT="genesis-v6b-master-rig-v1";
 const IDS=Object.freeze({male:"genesis_male_nude",female:"genesis_female_nude"});
 const DIRS=Object.freeze(["se","sw","ne","nw"]);
 const PARTS=Object.freeze(["leg_l","leg_r","torso","arm_l","arm_r","head"]);
 // 255 = no puppet slice assigned. Pixels are preserved, rendered at their
 // original position, and can be painted back into any slice later.
 const UNSELECTED=255;
 const PIVOTS=Object.freeze({leg_l:[25,84],leg_r:[39,84],torso:[32,60],arm_l:[25,61],arm_r:[39,61],head:[32,35]});
 const JOINTS=Object.freeze({
  head:[32,44],neck:[32,53],torso:[32,67],
  shoulder_near:[22,63],elbow_near:[21,70],hand_near:[20,76],
  shoulder_far:[42,63],elbow_far:[43,70],hand_far:[44,76],
  hip_near:[28,80],knee_near:[27,90],foot_near:[26,100],
  hip_far:[37,80],knee_far:[38,90],foot_far:[39,100]
 });
 const KEY="vl-genesis-master-rig-v1";
 const clone=x=>JSON.parse(JSON.stringify(x));
 function fail(s){throw Error("Genesis Master: "+s)}
 function partAt(x,y){
  if(y<44)return 5; // HEAD including hair + face; Emosi is composited last
  if(y<80)return x<23?3:x>40?4:2;
  return x<32?0:1;
 }
 function maskDefault(){
  const mask=new Uint8Array(64*112);
  for(let y=0;y<112;y++)for(let x=0;x<64;x++)mask[y*64+x]=partAt(x,y);
  return encode(mask);
 }
 function encode(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length!==7168)fail("mask needs 64×112 pixels");
  return btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(""));
 }
 function decode(base64){
  if(typeof base64!=="string"||base64.length>9600||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))fail("invalid mask encoding");
  let raw;try{raw=atob(base64)}catch{fail("invalid base64 mask")}
  if(raw.length!==7168)fail("mask dimensions must remain 64×112");
  const a=Uint8Array.from(raw,c=>c.charCodeAt(0));
  if(a.some(b=>b>=PARTS.length&&b!==UNSELECTED))fail("unknown mask slice value");
  return a;
 }
 function initial(gender){
  if(!IDS[gender])fail("male or female required");
  const mask=maskDefault();
  return {
   format:FORMAT,id:IDS[gender],gender,version:1,updated:"",pixelFrames:{},
   joints:Object.fromEntries(DIRS.map(d=>[d,clone(JOINTS)]).map(([d,v])=>
    [d,Object.fromEntries(Object.entries(v).map(([k,xy])=>[k,{x:xy[0],y:xy[1]}]))])),
   pivots:Object.fromEntries(DIRS.map(d=>[d,Object.fromEntries(Object.entries(PIVOTS).map(([k,xy])=>[k,{x:xy[0],y:xy[1]}]))])),
   masks:Object.fromEntries(DIRS.map(d=>[d,mask]))
  };
 }
 function validate(row){
  if(!row||row.format!==FORMAT||!Object.keys(IDS).includes(row.gender)||row.id!==IDS[row.gender])fail("only two stable Genesis master IDs are permitted");
  if(row.version!==1)fail("unsupported rig version");
  const out={format:FORMAT,id:row.id,gender:row.gender,version:1,updated:typeof row.updated==="string"?row.updated:"",pixelFrames:{},joints:{},pivots:{},masks:{}};
  for(const d of DIRS){
   const joints=row.joints?.[d],pivots=row.pivots?.[d];
   if(!joints||Object.keys(joints).sort().join()!=Object.keys(JOINTS).sort().join())fail("all 15 native joints required for "+d);
   if(!pivots||Object.keys(pivots).sort().join()!=PARTS.slice().sort().join())fail("all six native slice pivots required for "+d);
   out.joints[d]={};out.pivots[d]={};
   for(const k of Object.keys(JOINTS)){
    const p=joints[k];if(!Number.isInteger(p?.x)||!Number.isInteger(p?.y)||p.x<0||p.x>=64||p.y<0||p.y>=112)fail("invalid "+d+" joint "+k);
    out.joints[d][k]={x:p.x,y:p.y};
   }
   for(const k of PARTS){
    const p=pivots[k];if(!Number.isInteger(p?.x)||!Number.isInteger(p?.y)||p.x<0||p.x>=64||p.y<0||p.y>=112)fail("invalid "+d+" pivot "+k);
    out.pivots[d][k]={x:p.x,y:p.y};
   }
   decode(row.masks?.[d]);out.masks[d]=row.masks[d];
  }
  const edits=Object.entries(row.pixelFrames||{});
  if(edits.length>160)fail("Too many Genesis source pixel edits");
  let total=0;
  for(const [key,png] of edits){
   const fields=key.split("|");
   if(fields.length!==4)fail("Invalid Genesis pixel edit key");
   const [part,action,dir,frame]=fields;
   if(!/^(?:base\/(?:body|body_f|body_front|body_front_f)|(?:top|pants|shoes)\/[a-z_]+|hair\/[a-z_]+)$/.test(part)||
    !["walk","idle","talk","sit","sit_type","sleep","tired","swim","float","lie","perch"].includes(action)||
    !DIRS.includes(dir)||!/^(?:0|[1-9]\d?)$/.test(frame)||Number(frame)>5||
    typeof png!=="string"||!/^data:image\/png;base64,[a-z0-9+/]+=*$/i.test(png)||png.length>120000)
    fail("Invalid Genesis source pixel correction: "+key);
   total+=png.length;if(total>3000000)fail("Source edits exceed safe master size");
   out.pixelFrames[key]=png;
  }
  return out;
 }
 function load(gender){
  const base=initial(gender);
  try{
   const saved=JSON.parse(root?.localStorage?.getItem(KEY)||"{}");
   if(saved?.[gender])return validate(saved[gender]);
  }catch{}
  return base;
 }
 function apply(row,{persist=true}={}){
  const valid=validate(row);
  if(persist){
   const current={};
   try{Object.assign(current,JSON.parse(root?.localStorage?.getItem(KEY)||"{}"))}catch{}
   current[valid.gender]=valid;
   root?.localStorage?.setItem(KEY,JSON.stringify(current));
  }
  try{root?.dispatchEvent(new CustomEvent("genesis:master-updated",{detail:{gender:valid.gender,id:valid.id}}))}catch{}
  return clone(valid);
 }
 function cloudRows(rows){
  let count=0;
  for(const gender of ["male","female"]){
   const candidates=(Array.isArray(rows)?rows:[]).filter(x=>x?.id===IDS[gender]&&x?.format===FORMAT)
    .sort((a,b)=>String(b.updated).localeCompare(String(a.updated)));
   if(candidates.length){try{apply(candidates[0]);count++}catch{}}
  }
  return count;
 }
 return Object.freeze({FORMAT,IDS,DIRS,PARTS,UNSELECTED,PIVOTS,JOINTS,KEY,initial,validate,encode,decode,load,apply,cloudRows});
});
