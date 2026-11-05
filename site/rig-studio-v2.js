/* Rig Studio v2 — non-destructive companion to existing Mahluk Hidup editors.
 * All original Pose Maker, Action Editor and sprite catalogs remain unchanged.
 */
(function(root){
 "use strict";
 const R=root.VLModularRigV2,G=root.VLRigGizmoV2;
 if(!R||!G||!root.document)return;
 const STORE="mahluk-modular-rig-studio-v2";
 const $=id=>document.getElementById(id);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
 const fnum=n=>String(Math.round(Number(n)*10)/10);
 const faces=new Set(["emotion","brow_l","brow_r","eye_l","eye_r","nose","mouth",
  "blush_l","blush_r","glasses"]);
 const groups={
  "ROOT / BODY":["root","pelvis","torso","neck"],
  "HEAD BASE":["head","hair_back","hair_cap"],
  "HAIR / INDEPENDENT FRINGE":["fringe_l","fringe_mid","fringe_r"],
  "HEAD → EMOTION / FACE":["emotion","brow_l","brow_r","eye_l","eye_r",
    "nose","mouth","blush_l","blush_r","glasses"],
  "LEFT ARM":["shoulder_l","elbow_l","wrist_l"],
  "RIGHT ARM":["shoulder_r","elbow_r","wrist_r"],
  "PROP / PHONE":["phone"],
  "LEG L":["hip_l","knee_l","ankle_l"],
  "LEG R":["hip_r","knee_r","ankle_r"]
 };
 let base=R.referencePose(),model=R.normalize(base),tracks=R.makeTracks(),
  view="se",selected="head",frame=0,count=24,fps=12,playing=false,last=0,acc=0,drag=null,jointsVisible=true;
 function say(message){$("rig-v2-status").textContent=message;}
 function select(node){
  if(!R.BMAP[node])return;
  selected=node;$("rig-v2-selected").textContent=R.BMAP[node].label;
  $("rig-v2-parent").textContent=R.HIERARCHY[node]||"—";
  for(const btn of document.querySelectorAll("[data-rig-v2-bone]")){
   btn.classList.toggle("active",btn.dataset.rigV2Bone===node);
  }
  updateInputs();drawAll();drawTracks();
 }
 function updateInputs(){
  const p=model.parts[selected],fields={x:"rig-v2-x",y:"rig-v2-y",
   angle:"rig-v2-angle",scale:"rig-v2-scale"};
  for(const [name,id] of Object.entries(fields))$(id).value=fnum(p[name]);
  $("rig-v2-visible").checked=p.visible;
  $("rig-v2-emotion").value=model.emotion;
  $("rig-v2-phone").checked=model.phone;
  $("rig-v2-gender").value=model.gender;
  $("rig-v2-outfit").value=model.outfit?"outfit":"base";
  $("rig-v2-face-note").textContent=faces.has(selected)?
   "HEAD → EMOTION CHILD · INDEPENDENT FACIAL POSITION, ROTATION & KEYFRAMES":
   R.BMAP[selected].kind==="hair"?
    "HEAD → SEPARATE HAIR CUTOUT · INHERITS HEAD PIVOT":
    "MODULAR BODY PART · INDEPENDENT PIVOT, POSITION AND ROTATION";
 }
 function drawTo(ctx,direction,controls=false){
  const canvas=ctx.canvas;ctx.imageSmoothingEnabled=false;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  R.draw(ctx,model,direction);
  if(!controls)return;
  const world=R.world(model);
  ctx.save();
  // A 1px translucent dot does not obstruct native 64×112 sprite art.
  // Only the active joint receives an editable transform gizmo.
  if(jointsVisible){
   for(const b of R.BONES){
    if(b.id===selected)continue;
    const p=world[b.id];if(!p?.visible)continue;
    const n=G.projected(p,direction);
    if(n.x<0||n.x>=64||n.y<0||n.y>=112)continue;
    ctx.globalAlpha=.20;
    ctx.fillStyle=b.kind==="emotion"?"#bb6bcd":"#4078b7";
    ctx.fillRect(Math.round(n.x),Math.round(n.y),1,1);
   }
  }
  const p=world[selected];
  if(p?.visible){
   const n=G.projected(p,direction),theta=(G.mirror(direction)?-1:1)*p.angle*Math.PI/180-Math.PI/2;
   ctx.globalAlpha=.58;ctx.strokeStyle="#3f80c7";ctx.lineWidth=.48;
   ctx.beginPath();ctx.arc(n.x,n.y,G.RING,0,Math.PI*2);ctx.stroke();
   ctx.globalAlpha=.6;
   ctx.beginPath();ctx.moveTo(n.x,n.y);
   ctx.lineTo(n.x+Math.cos(theta)*G.ROTATE_HANDLE,n.y+Math.sin(theta)*G.ROTATE_HANDLE);
   ctx.stroke();
   ctx.globalAlpha=.88;ctx.fillStyle="#edfaff";ctx.strokeStyle="#1551a1";
   ctx.lineWidth=.55;ctx.beginPath();ctx.arc(n.x,n.y,1.8,0,Math.PI*2);
   ctx.fill();ctx.stroke();
   ctx.fillStyle="#e4a64d";ctx.strokeStyle="#1551a1";
   ctx.beginPath();ctx.arc(n.x+Math.cos(theta)*G.ROTATE_HANDLE,
    n.y+Math.sin(theta)*G.ROTATE_HANDLE,1.8,0,Math.PI*2);
   ctx.fill();ctx.stroke();
  }
  ctx.restore();
 }
 function drawAll(){
  const main=$("rig-v2-main");if(!main)return;
  drawTo(main.getContext("2d"),view,true);
  for(const d of R.DIR){
   const c=$("rig-v2-preview-"+d);if(c)drawTo(c.getContext("2d"),d,false);
  }
  $("rig-v2-frame-label").textContent="F "+String(frame+1).padStart(2,"0")+
   " / "+count+" · "+R.DIR.indexOf(view).toString()+" · "+view.toUpperCase();
  $("rig-v2-playhead").value=String(frame);
  $("rig-v2-playhead").max=String(count-1);
 }
 function createTree(){
  const panel=$("rig-v2-tree");panel.replaceChildren();
  for(const [group,ids] of Object.entries(groups)){
   const heading=document.createElement("div");heading.className="rig-v2-tree-heading";
   heading.textContent=group;panel.append(heading);
   for(const id of ids){
    const b=R.BMAP[id],btn=document.createElement("button");
    btn.type="button";btn.className="rig-v2-tree-item";
    btn.dataset.rigV2Bone=id;btn.textContent=b.label;
    btn.title=b.parent?"PARENT: "+b.parent:"ROOT";
    btn.onclick=()=>select(id);panel.append(btn);
   }
  }
 }
 function go(next){
  frame=Math.round(clamp(next,0,count-1));
  model=R.sampleTrack(tracks,frame,count,base);
  updateInputs();drawAll();drawTracks();
 }
 function drawTracks(){
  const rows=$("rig-v2-tracks");if(!rows)return;rows.replaceChildren();
  for(const b of R.BONES){
   const line=document.createElement("div");line.className="rig-v2-track-row";
   if(b.id===selected)line.classList.add("selected");
   const label=document.createElement("button");label.type="button";
   label.className="rig-v2-track-label";label.textContent=b.label;label.title="Edit "+b.label;
   label.onclick=()=>select(b.id);line.append(label);
   const grid=document.createElement("div");grid.className="rig-v2-track-grid";
   grid.style.gridTemplateColumns="repeat("+count+",21px)";
   for(let f=0;f<count;f++){
    const key=(tracks[b.id]||[]).some(k=>k.frame===f);
    const cell=document.createElement("button");cell.type="button";
    cell.className="rig-v2-frame"+(f===frame?" is-current":"")+(key?" is-keyed":"");
    cell.innerHTML=key?"◆":"·";cell.title=b.label+" / Frame "+(f+1);
    cell.onclick=()=>{
     if(f!==frame)go(f);
     select(b.id);
     const index=(tracks[b.id]||[]).findIndex(k=>k.frame===f);
     if(index>=0){
      tracks[b.id].splice(index,1);say("◇ KEY DELETED · "+b.label+" · F"+(f+1));
      model=R.sampleTrack(tracks,frame,count,base);updateInputs();
     }else{
      R.key(tracks,b.id,f,model.parts[b.id],model.emotion);
      say("◆ KEY SET · "+b.label+" · F"+(f+1));
     }
     drawAll();drawTracks();
    };
    grid.append(cell);
   }
   line.append(grid);rows.append(line);
  }
 }
 function save(){
  try{
   const data={format:"mahluk-rig-studio-v2",artRevision:R.ART_REVISION,base,tracks,frame,count,fps,view,selected};
   root.localStorage.setItem(STORE,JSON.stringify(data));
   root.document.dispatchEvent(new CustomEvent("mahluk:modular-rig-saved",{detail:{id:R.ID}}));
   say("SAVED + SYNCED TO CHARACTER VIEWER · "+R.ID+" · ORIGINALS UNCHANGED");
  }catch(e){say("SAVE FAILED: "+e.message);}
 }
 function restore(){
  try{
   const raw=root.localStorage.getItem(STORE);
   const r=JSON.parse(raw||"null");
   if(!r||r.format!=="mahluk-rig-studio-v2")return false;
   if(r.artRevision!==R.ART_REVISION){
    // Keep the user's old adjustments in a separate archive, and start the
    // new proportions from a clean base rather than applying obsolete offsets.
    if(!root.localStorage.getItem(STORE+"-previous-reference-backup"))
     root.localStorage.setItem(STORE+"-previous-reference-backup",raw);
    say("OLDER POSE ARCHIVED · NEW DETAIL/PROPORTION REFERENCE LOADED");
    return false;
   }
   base=R.normalize(r.base);tracks=cleanTracks(r.tracks);
   count=Math.round(clamp(r.count||24,4,96));fps=Math.round(clamp(r.fps||12,4,30));
   frame=Math.round(clamp(r.frame||0,0,count-1));
   view=R.DIR.includes(r.view)?r.view:"se";
   selected=R.BMAP[r.selected]?r.selected:"head";
   model=R.sampleTrack(tracks,frame,count,base);
   return true;
  }catch(e){say("SAVED RIG INVALID · "+e.message);return false;}
 }
 function cleanTracks(raw){
  const out=R.makeTracks();if(!raw||typeof raw!=="object")return out;
  for(const b of R.BONES){
   const rows=Array.isArray(raw[b.id])?raw[b.id]:[];
   for(const item of rows.slice(0,97)){
    if(!Number.isInteger(item?.frame)||!item.value||item.frame<0||item.frame>95)continue;
    const state=R.normalize({parts:{[b.id]:item.value}});
    R.key(out,b.id,item.frame,state.parts[b.id],item.emotion);
   }
  }
  return out;
 }
 function download(name,blob){
  const url=root.URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  root.setTimeout(()=>root.URL.revokeObjectURL(url),5000);
 }
 function exportJSON(){
  const bundle={...R.exportModel(base,tracks),fps,frames:count};
  download("pixel_reference_v2_rig.json",new Blob([JSON.stringify(bundle,null,2)],{type:"application/json"}));
  say("EXPORTED JSON · HIERARCHY, PIVOTS, ALL EMOTION LAYERS + KEYFRAMES");
 }
 function exportPNG(){
  const sheet=document.createElement("canvas");sheet.width=R.W*count;sheet.height=R.H*4;
  const ctx=sheet.getContext("2d");ctx.imageSmoothingEnabled=false;
  const tile=document.createElement("canvas");tile.width=R.W;tile.height=R.H;
  for(let d=0;d<4;d++)for(let f=0;f<count;f++){
   const sprite=R.sampleTrack(tracks,f,count,base),tc=tile.getContext("2d");
   tc.clearRect(0,0,R.W,R.H);R.draw(tc,sprite,R.DIR[d]);
   ctx.drawImage(tile,f*R.W,d*R.H);
  }
  sheet.toBlob(blob=>{
   if(!blob)return say("PNG EXPORT FAILED");
   download("pixel_reference_v2_4dir_"+count+"f.png",blob);
   say("EXPORTED 4-DIRECTION RGBA / "+count+" FRAMES · 64×112 / FRAME");
  },"image/png");
 }
 async function importJSON(file){
  try{
   if(!file)return;
   const data=JSON.parse(await file.text());
   if(data.format!=="mahluk-modular-rig-v2"||data.character_id!==R.ID)throw Error("Wrong rig schema");
   base=R.normalize(data.model);tracks=cleanTracks(data.tracks);
   count=Math.round(clamp(data.frames||24,4,96));fps=Math.round(clamp(data.fps||12,4,30));
   frame=0;model=R.sampleTrack(tracks,0,count,base);
   $("rig-v2-count").value=String(count);$("rig-v2-fps").value=String(fps);
   updateInputs();drawAll();drawTracks();say("IMPORTED MODULAR RIG / 4 DIRECTIONS");
  }catch(e){say("IMPORT FAILED: "+e.message);}
 }
 async function mount(){
  const panel=$("rig-v2-workspace"),tab=$("switch-rig-v2");if(!panel||!tab)return;
  createTree();restore();
  root.addEventListener("mahluk:rig-art-changed",()=>drawAll());
  try{
   await R.loadNativeArt();
  }catch(error){
   say("SOURCE ART FAILED · "+error.message);
   return;
  }
  $("rig-v2-count").value=String(count);$("rig-v2-fps").value=String(fps);
  const oldTabs=["switch-chars","switch-animations","switch-actions","tab-custom-char","switch-poser"];
  for(const id of oldTabs)$(id)?.addEventListener("click",()=>{panel.hidden=true;playing=false;},true);
  tab.addEventListener("click",()=>{
   for(const id of ["character-workspace","animation-workspace","action-workspace","custom-workspace","pose-workspace"])
    if($(id))$(id).hidden=true;
   for(const t of document.querySelectorAll(".library-tab")){
    t.classList.remove("active");t.setAttribute("aria-selected","false");
   }
   panel.hidden=false;tab.classList.add("active");tab.setAttribute("aria-selected","true");
   say("RESTORED CLOTHED V6B MASTER · EDIT PIXELS + WEIGHTS TO BUILD YOUR OWN CHARACTER");
   drawAll();
  });
  for(const btn of document.querySelectorAll("[data-rig-v2-view]"))btn.addEventListener("click",()=>{
   view=btn.dataset.rigV2View;
   for(const n of document.querySelectorAll("[data-rig-v2-view]"))n.classList.toggle("active",n===btn);
   drawAll();
  });
  for(const prop of ["x","y","angle","scale"]){
   $("rig-v2-"+prop).addEventListener("input",e=>{
    const value=Number(e.target.value);
    if(Number.isFinite(value)){
     model.parts[selected][prop]=clamp(value,prop==="scale"?0.4:prop==="angle"?-180:-48,
      prop==="scale"?2:prop==="angle"?180:48);
     drawAll();
     say("UNKEYED CHANGE / "+R.BMAP[selected].label+" · CLICK ◆ SET KEY");
    }
   });
  }
  $("rig-v2-gender").addEventListener("change",e=>{
   base.gender=model.gender=e.target.value==="female"?"female":"male";
   drawAll();
   say("BODY BASE: "+model.gender.toUpperCase()+" · BONE SYSTEM UNCHANGED");
  });
  $("rig-v2-outfit").addEventListener("change",e=>{
   base.outfit=model.outfit=e.target.value==="outfit";
   drawAll();
   say("ORIGINAL CLOTHED MASTER IS FIXED · USE EDIT PIXELS + WEIGHTS FOR YOUR OWN VERSION");
  });
  $("rig-v2-joints-visible").addEventListener("change",e=>{
   jointsVisible=e.target.checked;drawAll();
  });
  $("rig-v2-visible").addEventListener("change",e=>{
   model.parts[selected].visible=e.target.checked;drawAll();
  });
  $("rig-v2-emotion").addEventListener("change",e=>{
   model.emotion=e.target.value;select("emotion");drawAll();
  });
  $("rig-v2-phone").addEventListener("change",e=>{model.phone=e.target.checked;base.phone=e.target.checked;drawAll();});
  const canvas=$("rig-v2-main");
  const locate=e=>{
   const rect=canvas.getBoundingClientRect();
   return {x:(e.clientX-rect.left)*R.W/rect.width,
    y:(e.clientY-rect.top)*R.H/rect.height};
  };
  canvas.addEventListener("pointerdown",e=>{
   if(e.button!==0)return;
   const screen=locate(e),coords=R.world(model);
   const interactive=jointsVisible?coords:{[selected]:coords[selected]};
   const hit=G.hitTest(interactive,selected,screen,view);
   if(!hit)return; // Do not accidentally drag character when clicking empty area.
   if(hit.bone!==selected)select(hit.bone);
   const node=R.world(model)[selected],center=G.projected(node,view);
   drag={id:e.pointerId,mode:hit.mode,node:selected,
    x:screen.x,y:screen.y,
    startAngle:G.angle(center,screen),
    current:model.parts[selected].angle,
    angle:model.parts[selected].angle};
   canvas.setPointerCapture(e.pointerId);
   canvas.style.cursor=hit.mode==="rotate"?"grabbing":"move";
   e.preventDefault();
  });
  canvas.addEventListener("pointermove",e=>{
   const screen=locate(e),coords=R.world(model);
   if(!drag||drag.id!==e.pointerId){
    const interactive=jointsVisible?coords:{[selected]:coords[selected]};
    const hit=G.hitTest(interactive,selected,screen,view);
    canvas.style.cursor=hit?.mode==="rotate"?"crosshair":hit?"move":"default";
    return;
   }
   if(drag.mode==="rotate"){
    const center=G.projected(coords[selected],view);
    const now=G.angle(center,screen);
    const sign=G.mirror(view)?-1:1;
    let deg=drag.angle+sign*G.deltaAngle(drag.startAngle,now);
    if(e.shiftKey)deg=Math.round(deg/15)*15;
    model.parts[selected].angle=clamp(deg,-180,180);
   }else{
    const prev=G.mirror(view)?64-drag.x:drag.x;
    const next=G.mirror(view)?64-screen.x:screen.x;
    const dx=next-prev,dy=screen.y-drag.y;
    const parent=coords[R.HIERARCHY[selected]];
    const a=(parent?.angle||0)*Math.PI/180,cs=Math.cos(a),sn=Math.sin(a),scale=parent?.scale||1;
    model.parts[selected].x=clamp(model.parts[selected].x+(dx*cs+dy*sn)/scale,-40,40);
    model.parts[selected].y=clamp(model.parts[selected].y+(-dx*sn+dy*cs)/scale,-48,48);
   }
   drag.x=screen.x;drag.y=screen.y;
   updateInputs();drawAll();
  });
  for(const type of ["pointerup","pointercancel"])canvas.addEventListener(type,e=>{
   if(drag?.id!==e.pointerId)return;
   const mode=drag.mode;drag=null;canvas.style.cursor="crosshair";
   try{canvas.releasePointerCapture(e.pointerId)}catch{}
   say((mode==="rotate"?"ROTATION":"POSITION")+
    " ADJUSTED · PRESS ◆ SET KEY TO RECORD THIS FRAME");
  });
  $("rig-v2-key").onclick=()=>{
   R.key(tracks,selected,frame,model.parts[selected],model.emotion);
   drawTracks();say("◆ KEYED "+R.BMAP[selected].label+" / FRAME "+(frame+1));
  };
  $("rig-v2-unkey").onclick=()=>{
   tracks[selected]=(tracks[selected]||[]).filter(k=>k.frame!==frame);
   model=R.sampleTrack(tracks,frame,count,base);
   updateInputs();drawAll();drawTracks();say("◇ REMOVED KEY / FRAME "+(frame+1));
  };
  $("rig-v2-playhead").oninput=e=>{playing=false;go(Number(e.target.value));};
  $("rig-v2-count").onchange=e=>{
   count=Math.round(clamp(e.target.value,4,96));e.target.value=String(count);
   for(const id of Object.keys(tracks))tracks[id]=tracks[id].filter(k=>k.frame<count);
   go(Math.min(frame,count-1));
  };
  $("rig-v2-fps").onchange=e=>{
   fps=Math.round(clamp(e.target.value,4,30));e.target.value=String(fps);
  };
  $("rig-v2-play").onclick=()=>{
   playing=!playing;last=0;acc=0;
   $("rig-v2-play").textContent=playing?"Ⅱ PAUSE":"▶ PLAY";
  };
  $("rig-v2-new").onclick=()=>{
   if(!confirm("Restore original clothed rig pose? Your custom pixel edits stay saved separately."))return;
   base=R.referencePose();tracks=R.makeTracks();model=R.normalize(base);frame=0;
   count=24;fps=12;$("rig-v2-count").value="24";$("rig-v2-fps").value="12";
   updateInputs();drawAll();drawTracks();say("NEW RIG / ORIGINAL REFERENCE RESTORED");
  };
  $("rig-v2-rest").onclick=()=>{
   base=R.neutral();model=R.normalize(base);tracks=R.makeTracks();frame=0;
   updateInputs();drawAll();drawTracks();say("REST POSE · ARMS UNBENT / NO FORCED WEIGHTS");
  };
  $("rig-v2-save").onclick=save;
  $("rig-v2-export").onclick=exportJSON;$("rig-v2-png").onclick=exportPNG;
  $("rig-v2-import").onchange=e=>{importJSON(e.target.files?.[0]);e.target.value="";};
  function tick(now){
   if(playing&&!panel.hidden){
    if(last)acc+=Math.min(150,now-last);
    last=now;
    if(acc>=1000/fps){acc=0;go((frame+1)%count);}
   }else last=0;
   root.requestAnimationFrame(tick);
  }
  select(selected);drawAll();drawTracks();root.requestAnimationFrame(tick);
 }
 root.addEventListener("DOMContentLoaded",mount);
 root.VLRigStudioV2=Object.freeze({mount,STORE});
})(window);
