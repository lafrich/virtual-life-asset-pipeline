/* Isolated Genesis motion authoring: native Mahluk V6P Genesis base,
 * GIF reference for human guidance, never GIF pixels as character art.
 * No local/browser persistence and no automatic stock registration.
 */
(function(root){"use strict";
 const C=root.GenesisMotionContract,V=root.V6PCompositor;
 const $=id=>document.getElementById(id);
 const stage=$("stage"),ctx=stage.getContext("2d",{willReadFrequently:true});
 ctx.imageSmoothingEnabled=false;
 let draft=null,sheet=null,dir="se",index=0,selectedPart="head",playing=false,timer=null,drag=null,revision=0,gifUrl=null;
 const sourceCache=new Map();
 function status(msg){$("status").textContent=msg;}
 function available(){return !!(draft&&sheet);}
 function stop(){playing=false;clearTimeout(timer);timer=null;$("play").textContent="▶ PLAY";}
 function canvas(w,h){const c=document.createElement("canvas");c.width=w;c.height=h;return c;}
 function clone(o){return JSON.parse(JSON.stringify(o));}
 function partAt(x,y){
   if(y<44)return "head";
   if(y<80){if(x<23)return "arm_l";if(x>40)return "arm_r";return "torso";}
   return x<32?"leg_l":"leg_r";
 }
 function sourceFrame(d=dir,f=index){
   const key=[draft.gender,draft.template,d,f].join("/");
   if(sourceCache.has(key))return sourceCache.get(key);
   const src=V.extractFrame(sheet,draft.template,d,f%V.FRAMES[draft.template]);
   sourceCache.set(key,src);
   return src;
 }
 function segments(frame){
   const pix=frame.getContext("2d").getImageData(0,0,C.W,C.H).data;
   const parts={};const buffers={};
   for(const part of C.PARTS){parts[part]=canvas(C.W,C.H);buffers[part]=parts[part].getContext("2d").createImageData(C.W,C.H);}
   for(let y=0;y<C.H;y++)for(let x=0;x<C.W;x++){
     const i=(y*C.W+x)*4,k=partAt(x,y),buf=buffers[k].data;
     buf[i]=pix[i];buf[i+1]=pix[i+1];buf[i+2]=pix[i+2];buf[i+3]=pix[i+3];
   }
   for(const part of C.PARTS)parts[part].getContext("2d").putImageData(buffers[part],0,0);
   return parts;
 }
 function poseAt(d=dir,f=index){return draft.tracks[d][f];}
 function bake(d=dir,f=index){
   const result=canvas(C.W,C.H);
   if(!available())return result;
   const s=sourceFrame(d,f),pieces=segments(s),p=draft.tracks[d][f],c=result.getContext("2d");
   c.imageSmoothingEnabled=false;
   for(const part of C.PARTS){
     const t=p[part];c.save();
     c.translate(t.ax+t.x,t.ay+t.y);c.rotate(t.angle*Math.PI/180);
     c.drawImage(pieces[part],-t.ax,-t.ay);c.restore();
   }
   return result;
 }
 function syncInputs(){
   if(!draft)return;
   $("part").value=selectedPart;
   const p=poseAt()[selectedPart];
   for(const key of ["x","y","angle"])$(key).value=p[key];
   $("ms").value=draft.frames[index].ms;
 }
 function redraw(){
   ctx.clearRect(0,0,C.W,C.H);
   if(available())ctx.drawImage(bake(),0,0);
   else{ctx.fillStyle="#365a82";ctx.font="7px monospace";ctx.fillText("INITIALIZE",8,55);}
   $("dirs").replaceChildren(...C.DIRS.map(d=>{
     const b=document.createElement("button");b.textContent=d.toUpperCase();b.className=d===dir?"selected":"";
     b.onclick=()=>{stop();dir=d;redraw();};return b;
   }));
   $("frames").replaceChildren(...(draft?.frames||[]).map((f,i)=>{
     const b=document.createElement("button");b.textContent="F"+(i+1);b.className=i===index?"selected":"";
     b.onclick=()=>{stop();index=i;redraw();};return b;
   }));
   $("export").disabled=!available();$("export-png").disabled=!available();
   syncInputs();
 }
 async function initialize(){
   const serial=++revision;stop();sourceCache.clear();
   const gender=$("gender").value,template=$("template").value,name=$("name").value;
   const frames=Number($("frame-count").value),duration=Number($("duration").value);
   try{
     if(!V||!C)throw Error("Mahluk native compositor or motion contract unavailable");
     const next=C.create({name,gender,template,frameCount:frames,ms:duration,loop:$("loop").checked});
     if($("gif").files?.[0])next.source.filename=$("gif").files[0].name;
     status("Loading native Genesis "+gender+" from Mahluk assets…");
     const appearance=V.norm({...V.DEF,body:gender,gender,hair:"none",skin:"light",
       top:"nude",pants:"nude",shoes:"nude",face:"blank",glasses:"none",facial:"none"});
     const nextSheet=await V.sheet(appearance,null,"");
     if(serial!==revision)return;
     if(!nextSheet)throw Error("Genesis native sprite missing: "+(V.missing||[]).join(", "));
     if(nextSheet.width!==384||nextSheet.height!==4928)throw Error("Unexpected native character atlas dimensions");
     draft=next;sheet=nextSheet;dir="se";index=0;selectedPart="head";
     $("part").value=selectedPart;
     redraw();status("Genesis loaded · "+next.genesis+" · "+next.frames.length+" frames × 4 directions · draft only");
   }catch(e){if(serial!==revision)return;draft=null;sheet=null;redraw();status("ERROR · "+e.message);}
 }
 function transform(){
   if(!available())return;
   const p=poseAt()[selectedPart];
   for(const key of ["x","y","angle"]){
     const v=Number($(key).value);if(Number.isFinite(v))p[key]=Math.max(-120,Math.min(120,Math.round(v)));
   }
   const ms=Number($("ms").value);
   if(ms>=40&&ms<=800)draft.frames[index].ms=Math.round(ms);
   redraw();
 }
 function tick(){
   if(!playing||!available())return;
   const duration=draft.frames[index].ms;
   timer=setTimeout(()=>{
     if(!playing)return;
     if(index===draft.frames.length-1&&!draft.loop){stop();return;}
     index=(index+1)%draft.frames.length;redraw();tick();
   },duration);
 }
 function play(){
   if(playing){stop();return;}
   if(!available())return;
   playing=true;$("play").textContent="❚❚ PAUSE";tick();
 }
 function exportAtlas(){
   if(!available())throw Error("Initialize Genesis first");
   C.validate(draft);
   const atlas=canvas(C.ATLAS.w,C.ATLAS.h),c=atlas.getContext("2d",{willReadFrequently:true});
   c.imageSmoothingEnabled=false;
   for(let d=0;d<4;d++)for(let f=0;f<draft.frames.length;f++){
     const img=bake(C.DIRS[d],f);
     const bytes=img.getContext("2d").getImageData(0,0,C.W,C.H).data;
     let visible=false;for(let i=3;i<bytes.length;i+=4){if(bytes[i]>0){visible=true;break;}}
     if(!visible)throw Error("Empty sprite "+C.DIRS[d]+" F"+(f+1));
     c.drawImage(img,f*C.W,d*C.H);
   }
   return atlas;
 }
 function download(blob,filename){
   const url=URL.createObjectURL(blob),a=document.createElement("a");
   a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 function saveDraft(){
   try{
     stop();draft.name=$("name").value.trim().slice(0,80);
     draft.loop=$("loop").checked;
     const atlas=exportAtlas();
     const packageRecord=C.record(draft,atlas.toDataURL("image/png"));
     packageRecord.draft=clone(draft);
     download(new Blob([JSON.stringify(packageRecord,null,2)],{type:"application/json"}),draft.id+".mahluk-animation-stock-draft.json");
     status("EXPORTED · "+draft.name+" · four directions · REVIEW ONLY. No stock/database was overwritten.");
   }catch(e){status("EXPORT FAILED · "+e.message);}
 }
 function savePng(){
   try{const atlas=exportAtlas();atlas.toBlob(blob=>{
     if(!blob)return status("PNG encoding failed");
     download(blob,draft.id+"_384x2688.png");status("Atlas PNG exported · not installed in Mahluk");
   },"image/png");}catch(e){status("EXPORT FAILED · "+e.message);}
 }
 $("initialize").onclick=initialize;
 $("part").onchange=()=>{selectedPart=$("part").value;redraw();};
 for(const k of ["x","y","angle","ms"])$(k).onchange=transform;
 $("reset").onclick=()=>{if(!available())return;poseAt()[selectedPart]=C.pose()[selectedPart];redraw();};
 $("play").onclick=play;
 $("prev").onclick=()=>{if(!draft)return;stop();index=(index-1+draft.frames.length)%draft.frames.length;redraw();};
 $("next").onclick=()=>{if(!draft)return;stop();index=(index+1)%draft.frames.length;redraw();};
 $("duplicate").onclick=()=>{if(!draft||index===0)return;stop();draft.tracks[dir][index]=clone(draft.tracks[dir][index-1]);redraw();};
 $("loop").onchange=()=>{if(draft)draft.loop=$("loop").checked;};
 $("export").onclick=saveDraft;$("export-png").onclick=savePng;
 $("gif").onchange=()=>{
   if(gifUrl)URL.revokeObjectURL(gifUrl);gifUrl=null;
   const file=$("gif").files?.[0];
   if(!file){$("ref").hidden=true;$("empty-ref").hidden=false;return;}
   if(file.type!=="image/gif")return status("Only GIF reference files are supported");
   gifUrl=URL.createObjectURL(file);$("ref").src=gifUrl;$("ref").hidden=false;$("empty-ref").hidden=true;
   if(draft)draft.source.filename=file.name;
   status("GIF reference loaded: "+file.name+". Animation inference is not automatic; author the Genesis poses.");
 };
 stage.addEventListener("pointerdown",e=>{
   if(!available())return;
   stop();const rect=stage.getBoundingClientRect(),x=(e.clientX-rect.left)*C.W/rect.width,y=(e.clientY-rect.top)*C.H/rect.height;
   selectedPart=partAt(x,y);drag={x,y,pose:clone(poseAt()[selectedPart])};
   stage.setPointerCapture(e.pointerId);redraw();
 });
 stage.addEventListener("pointermove",e=>{
   if(!drag||!available())return;
   const rect=stage.getBoundingClientRect(),x=(e.clientX-rect.left)*C.W/rect.width,y=(e.clientY-rect.top)*C.H/rect.height;
   const p=poseAt()[selectedPart];p.x=Math.round(drag.pose.x+x-drag.x);p.y=Math.round(drag.pose.y+y-drag.y);redraw();
 });
 for(const event of ["pointerup","pointercancel"])stage.addEventListener(event,()=>{drag=null;});
 root.addEventListener("pagehide",()=>{stop();if(gifUrl)URL.revokeObjectURL(gifUrl);});
 redraw();
})(window);
