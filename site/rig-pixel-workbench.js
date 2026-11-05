/* Compact editable paint/weight workbench for the ORIGINAL clothed V6B actor.
 * Every modification is local and reversible; original GitHub source immutable.
 */
(function(root){
 "use strict";
 const R=root.VLModularRigV2,E=root.VLManualRigArt;
 if(!R||!E||!root.document)return;
 const $=id=>root.document.getElementById(id);
 const DIR=E.DIR;
 let editor=null,selected="torso",direction="se",mode="paint",drawing=false;
 let radius=1,color=[228,174,142,255],mirror=true,showWeights=false;
 const other={se:"sw",sw:"se",ne:"nw",nw:"ne"};
 const canvas=()=>$("rig-paint-canvas");
 const refreshMain=()=>root.dispatchEvent(new Event("mahluk:rig-art-changed"));
 function info(message){const e=$("rig-paint-status");if(e)e.textContent=message;}
 function hex(col){return "#"+col.slice(0,3).map(x=>Number(x).toString(16).padStart(2,"0")).join("");}
 function fromHex(str){const v=str.replace("#","");return [0,2,4].map(i=>parseInt(v.slice(i,i+2),16)).concat(255);}
 function refreshVersions(){
  const select=$("rig-paint-version");if(!select||!editor)return;
  select.replaceChildren();
  const add=(id,label)=>{
   const opt=root.document.createElement("option");
   opt.value=id;opt.textContent=label;select.append(opt);
  };
  add("original","ORIGINAL CLOTHED / MASTER");
  if(editor.activeVersion==="draft")add("draft","WORKING DRAFT");
  for(const item of editor.listVersions())add(item.id,item.name);
  select.value=editor.activeVersion;
 }
 function syncFields(){
  $("rig-paint-bone").value=selected;
  $("rig-paint-size").value=String(radius);
  $("rig-paint-size-out").textContent=String(radius*2+1)+" PX";
  $("rig-paint-color").value=hex(color);
  $("rig-paint-name").value=editor.state.name;
  refreshVersions();
  $("rig-paint-mirror").checked=mirror;
  $("rig-paint-weights").checked=showWeights;
  for(const button of root.document.querySelectorAll("[data-rig-paint-mode]")){
   const active=button.dataset.rigPaintMode===mode;
   button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));
  }
  for(const button of root.document.querySelectorAll("[data-rig-paint-dir]")){
   button.classList.toggle("active",button.dataset.rigPaintDir===direction);
  }
 }
 function location(e){
  const rect=canvas().getBoundingClientRect();
  return {x:Math.floor((e.clientX-rect.left)*E.W/rect.width),
   y:Math.floor((e.clientY-rect.top)*E.H/rect.height)};
 }
 function sourceAndWeight(){
  const data=editor.composite(direction,"neutral");
  if(!data)return null;
  const base=editor.source(direction,"neutral"),owners=new Int16Array(base.owner);
  for(const row of editor.state.weights[direction])
   owners[row[0]]=editor.bones.indexOf(row[1]);
  return {data,owners};
 }
 function draw(){
  if(!editor)return;
  const c=canvas(),ctx=c.getContext("2d",{willReadFrequently:true});
  ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,E.W,E.H);
  const prepared=sourceAndWeight();if(!prepared)return;
  ctx.drawImage(prepared.data.canvas,0,0);
  let weighted=0,painted=editor.state.pixels[direction].length;
  const target=editor.bones.indexOf(selected);
  for(let p=0;p<E.W*E.H;p++){
   if(prepared.owners[p]!==target||!prepared.data.data[p*4+3])continue;
   weighted++;
   if(showWeights){ctx.fillStyle="rgba(58,128,251,.21)";ctx.fillRect(p%E.W,Math.floor(p/E.W),1,1);}
  }
  $("rig-paint-pixel-count").textContent=weighted+" WEIGHT PIXELS · "+painted+" PAINTED";
  for(const dir of DIR){
   const preview=$("rig-paint-preview-"+dir);
   if(!preview)continue;
   const cctx=preview.getContext("2d");cctx.clearRect(0,0,E.W,E.H);
   const composite=editor.composite(dir,"neutral");
   if(composite)cctx.drawImage(composite.canvas,0,0);
  }
 }
 function sample(x,y){
  if(x<0||x>=E.W||y<0||y>=E.H)return;
  const image=editor.composite(direction,"neutral");
  const n=(y*E.W+x)*4,raw=image.data;
  if(!raw[n+3]){info("TRANSPARENT PIXEL · pick a skin swatch to paint");return;}
  color=[raw[n],raw[n+1],raw[n+2],255];mode="paint";syncFields();
  info("COLOR PICKED · "+hex(color));
 }
 function paintPoint(x,y){
  if(x<0||x>=E.W||y<0||y>=E.H)return;
  editor.brush(direction,x,y,radius,mode,selected,color);
  if(mirror){
   const paired=other[direction];
   editor.brush(paired,E.W-1-x,y,radius,mode,R.mirrorBone(selected,paired),color);
  }
 }
 function save(){
  if(!editor)return;
  const value=String($("rig-paint-name").value||"CUSTOM CHARACTER 01").trim().slice(0,80);
  const modified=E.DIR.some(dir=>
   editor.state.pixels[dir].length||editor.state.weights[dir].length);
  editor.state.name=value;
  // Never save paint into the protected ORIGINAL profile. On the first
  // painted stroke from MASTER, automatically make a named independent copy.
  let okay;
  if(editor.activeVersion==="original"&&modified){
   const id=editor.saveAsVersion(value==="ORIGINAL CLOTHED MASTER"?"CUSTOM CHARACTER 01":value);
   okay=Boolean(id);
  }else okay=editor.saveLocal();
  refreshVersions();
  refreshMain();
  if(okay)root.document.dispatchEvent(new Event("mahluk:rig-art-saved"));
  info(okay?"SAVED CUSTOM CHARACTER + WEIGHTS · MASTER UNTOUCHED":
   "STORAGE FULL · EXPORT JSON TO KEEP YOUR WORK");
 }
 function download(name,blob){
  const url=root.URL.createObjectURL(blob),a=root.document.createElement("a");
  a.href=url;a.download=name;root.document.body.append(a);a.click();a.remove();
  root.setTimeout(()=>root.URL.revokeObjectURL(url),1500);
 }
 function exportJSON(){
  save();
  download("mahluk-custom-character-art-weights.json",
   new Blob([JSON.stringify(editor.serialize(),null,2)],{type:"application/json"}));
  info("EXPORTED · CUSTOM PIXELS + BONE WEIGHTS (4 VIEWS)");
 }
 function exportPNG(){
  const atlas=root.document.createElement("canvas");atlas.width=256;atlas.height=112;
  const ctx=atlas.getContext("2d");ctx.imageSmoothingEnabled=false;
  for(let i=0;i<4;i++)ctx.drawImage(editor.composite(DIR[i],"neutral").canvas,i*64,0);
  atlas.toBlob(blob=>{
   if(!blob)return info("PNG EXPORT FAILED");
   download("mahluk-custom-character-4-views.png",blob);
   info("EXPORTED · SE / SW / NE / NW · PNG");
  },"image/png");
 }
 async function importJSON(file){
  if(!file)return;
  try{
   const data=JSON.parse(await file.text());
   if(data.format!==E.FORMAT)throw Error("Wrong artwork file");
   editor.importState(data);draw();syncFields();refreshMain();
   info("CUSTOM ART + WEIGHTS IMPORTED · ORIGINAL SOURCE SAFE");
  }catch(error){info("IMPORT FAILED · "+error.message);}
 }
 async function mount(){
  try{editor=await E.getSharedEditor(R);}
  catch(error){info("EDITOR UNAVAILABLE · "+error.message);return;}
  editor.onChange=()=>{draw();refreshMain();};
  for(const b of R.BONES){
   const option=root.document.createElement("option");
   option.value=b.id;option.textContent=b.label;
   $("rig-paint-bone").append(option);
  }
  $("rig-v2-edit-art").onclick=()=>{
   $("rig-v2-manual-editor").hidden=false;syncFields();draw();
   info("ORIGINAL CLOTHED MASTER · PAINT YOUR OWN BODY / ASSIGN BONES");
  };
  $("rig-paint-close").onclick=()=>{$("rig-v2-manual-editor").hidden=true;save();};
  for(const button of root.document.querySelectorAll("[data-rig-paint-dir]"))
   button.onclick=()=>{direction=button.dataset.rigPaintDir;syncFields();draw();};
  for(const button of root.document.querySelectorAll("[data-rig-paint-mode]"))
   button.onclick=()=>{mode=button.dataset.rigPaintMode;syncFields();draw();};
  $("rig-paint-bone").onchange=e=>{selected=e.target.value;draw();};
  $("rig-paint-version").onchange=e=>{
   const id=e.target.value;
   if(id===editor.activeVersion)return;
   const dirty=E.DIR.some(dir=>
    editor.state.pixels[dir].length||editor.state.weights[dir].length);
   if(editor.activeVersion==="draft"&&dirty){
    editor.state.name=$("rig-paint-name").value||"CUSTOM CHARACTER 01";
    editor.saveAsVersion(editor.state.name);
   }else if(editor.activeVersion==="original"&&dirty){
    editor.saveAsVersion($("rig-paint-name").value||"CUSTOM CHARACTER 01");
   }else editor.saveLocal();
   if(editor.openVersion(id)){syncFields();draw();refreshMain();
    root.document.dispatchEvent(new Event("mahluk:rig-art-saved"));
    info(id==="original"?"PROTECTED ORIGINAL CLOTHED MASTER RESTORED":
     "CUSTOM VERSION LOADED · PIXELS AND WEIGHTS RESTORED");
   }else{syncFields();info("VERSION NOT FOUND");}
  };
  $("rig-paint-save-as").onclick=()=>{
   editor.state.name=$("rig-paint-name").value||"CUSTOM CHARACTER 01";
   const id=editor.saveAsVersion(editor.state.name);
   if(id){
    syncFields();refreshMain();
    root.document.dispatchEvent(new Event("mahluk:rig-art-saved"));
    info("SAVED AS NEW CHARACTER VERSION · "+editor.state.name);
   }else info("COULD NOT SAVE CUSTOM VERSION · EXPORT JSON");
  };
  $("rig-paint-size").oninput=e=>{radius=Number(e.target.value);syncFields();};
  $("rig-paint-color").oninput=e=>{color=fromHex(e.target.value);mode="paint";syncFields();};
  $("rig-paint-mirror").onchange=e=>{mirror=e.target.checked;};
  $("rig-paint-weights").onchange=e=>{showWeights=e.target.checked;draw();};
  for(const button of root.document.querySelectorAll("[data-rig-paint-swatch]"))
   button.onclick=()=>{color=fromHex(button.dataset.rigPaintSwatch);mode="paint";syncFields();};
  canvas().addEventListener("pointerdown",e=>{
   if(e.button!==0)return;
   const p=location(e);
   if(mode==="pick"){sample(p.x,p.y);return;}
   editor.snapshot();drawing=true;
   canvas().setPointerCapture(e.pointerId);
   paintPoint(p.x,p.y);e.preventDefault();
  });
  canvas().addEventListener("pointermove",e=>{
   if(!drawing)return;
   const p=location(e);paintPoint(p.x,p.y);
  });
  for(const event of ["pointerup","pointercancel"])
   canvas().addEventListener(event,()=>{if(!drawing)return;drawing=false;save();});
  $("rig-paint-undo").onclick=()=>{if(editor.history("undo")){syncFields();draw();}};
  $("rig-paint-redo").onclick=()=>{if(editor.history("redo")){syncFields();draw();}};
  $("rig-paint-reset").onclick=()=>{
   if(!root.confirm("RESET THE CURRENT VIEW edits and weights? Original V6B artwork is preserved."))return;
   editor.reset(direction);draw();save();
  };
  $("rig-paint-save").onclick=save;
  $("rig-paint-export").onclick=exportJSON;
  $("rig-paint-png").onclick=exportPNG;
  $("rig-paint-import").onchange=e=>{
   importJSON(e.target.files?.[0]);e.target.value="";
  };
  root.VLRigPaintWorkbench=Object.freeze({
   get editor(){return editor;},open:()=>$("rig-v2-edit-art").click(),
   refresh:draw
  });
  draw();refreshMain();
 }
 root.addEventListener("DOMContentLoaded",mount);
})(window);
