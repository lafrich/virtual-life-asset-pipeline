/* Genesis Experiment Studio v2 — self-contained beta. Never mutates canonical source files. */
(function(){
"use strict";
var R=window.LGR1Raster, OFFICIAL=window.GENESIS_EXPERIMENT_SOURCES;
var W=64,H=112,N=W*H,DIRS=["se","sw","ne","nw"],PARTS=R&&R.PARTS||[],LAYERS=R&&R.LAYERS||[];
var $=function(id){return document.getElementById(id)};
if(!R||!OFFICIAL){var status=$("status");if(status)status.textContent="ERROR: Genesis raster or official snapshots not loaded.";return}
var models={male:JSON.parse(JSON.stringify(OFFICIAL.male)),female:JSON.parse(JSON.stringify(OFFICIAL.female))};
var cache=new Map(),rawCache=new Map(),history=[],editSeq=0,renderSeq=0,last=null,playingFrame=null,playStart=0;
var st={gender:"male",dir:"se",skin:"light",preset:"sit",intensity:1,playing:false,t:0,effector:"leg_near",flip:1,overlap:true,markers:true,grid:false,targets:{}};
var ed={tool:"pixel",part:"leg_near_lower",layer:"body",maskView:true,lock:true,brush:1,useKey:true,key:"i",hex:"#d9a47e",raw:null,mask:null,drag:false,dirty:false,hover:null,gender:null,dir:null,layerId:null};
var labels={pelvis:"Pelvis",torso:"Torso",head:"Head",arm_near_upper:"Arm near · upper",arm_near_lower:"Arm near · lower",arm_far_upper:"Arm far · upper",arm_far_lower:"Arm far · lower",leg_near_upper:"Leg near · thigh",leg_near_lower:"Leg near · shin",leg_far_upper:"Leg far · thigh",leg_far_lower:"Leg far · shin"};
var names={leg_near:"Leg · Near (Knee/Ankle)",leg_far:"Leg · Far (Knee/Ankle)",arm_near:"Arm · Near (Elbow/Wrist)",arm_far:"Arm · Far (Elbow/Wrist)",head:"Head + Torso (Neck)"};
function clone(obj){return JSON.parse(JSON.stringify(obj))}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function p(x,y){return {x:x,y:y}}
function plus(a,b){return p(a.x+b.x,a.y+b.y)}
function minus(a,b){return p(a.x-b.x,a.y-b.y)}
function magnitude(a){return Math.hypot(a.x,a.y)}
function lerp(a,b,t){return a+(b-a)*t}
function rad(d){return d*Math.PI/180}
function deg(r){return r*180/Math.PI}
function transform(m,pt){return p(m[0]*pt.x+m[2]*pt.y+m[4],m[1]*pt.x+m[3]*pt.y+m[5])}
function inverse(m){var det=m[0]*m[3]-m[1]*m[2];if(Math.abs(det)<1e-10)throw Error("Singular transform");return [m[3]/det,-m[1]/det,-m[2]/det,m[0]/det,(m[2]*m[5]-m[3]*m[4])/det,(m[1]*m[4]-m[0]*m[5])/det]}
function rot(a,th){return p(a.x*Math.cos(th)-a.y*Math.sin(th),a.x*Math.sin(th)+a.y*Math.cos(th))}
function status(msg,bad){$("status").textContent=msg;$("status").classList.toggle("error",!!bad)}
function editStatus(msg){$("gx-status").textContent=msg}
function encodeMask(mask){var s="";for(var i=0;i<N;i++)s+=String.fromCharCode(mask[i]);return btoa(s)}
function decodeMask(s){var a=atob(s),out=Uint8Array.from(a,function(c){return c.charCodeAt(0)});if(out.length!==N)throw Error("Invalid slice mask ("+out.length+")");return out}
function rgb(hex){return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),255]}
function keyOf(c){return "#"+[c[0],c[1],c[2]].map(function(v){return v.toString(16).padStart(2,"0")}).join("").toUpperCase()}
function reader(uri){
 if(!uri)return Promise.resolve(new Uint8ClampedArray(N*4));
 if(rawCache.has(uri))return Promise.resolve(new Uint8ClampedArray(rawCache.get(uri)));
 return new Promise(function(resolve,reject){
  var image=new Image();
  image.onload=function(){try{
   if(image.naturalWidth!==W||image.naturalHeight!==H)throw Error("Sprite must be 64x112");
   var canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
   var ctx=canvas.getContext("2d",{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
   ctx.drawImage(image,0,0);var data=ctx.getImageData(0,0,W,H).data;
   rawCache.set(uri,new Uint8ClampedArray(data));resolve(new Uint8ClampedArray(data));
  }catch(e){reject(e)}};
  image.onerror=function(){reject(Error("Could not decode embedded sprite PNG"))};
  image.src=uri;
 });
}
function tint(raw,model,tone){
 var out=new Uint8ClampedArray(raw),to=model.skin.tones[tone],keys=model.skin.keys,colors={};
 if(!to)throw Error("Invalid skin tone "+tone);
 Object.keys(keys).forEach(function(k){colors[keys[k].toUpperCase()]=rgb(to[k])});
 for(var i=0;i<out.length;i+=4){
  if(out[i+3]===0)continue;
  var target=colors[keyOf([out[i],out[i+1],out[i+2]])];
  if(target){out[i]=target[0];out[i+1]=target[1];out[i+2]=target[2]}
 }
 return out;
}
function encodeRaw(raw){
 var c=document.createElement("canvas");c.width=W;c.height=H;
 c.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(raw),W,H),0,0);
 return c.toDataURL("image/png");
}
function clearCache(){cache.clear();rawCache.clear()}
function endpoint(mask,part,edge){
 var idx=PARTS.indexOf(part),extreme=edge==="top"?H:-1;
 for(var i=0;i<N;i++)if(mask[i]===idx){var y=Math.floor(i/W);extreme=edge==="top"?Math.min(y,extreme):Math.max(y,extreme)}
 if(extreme===H||extreme===-1)throw Error(part+" has no assigned pixels");
 var sumX=0,count=0;for(var j=0;j<N;j++)if(mask[j]===idx&&(edge==="top"?Math.floor(j/W)<=extreme+3:Math.floor(j/W)>=extreme-3)){sumX+=j%W;count++}
 return p(sumX/count,extreme+(edge==="top"?2:-1));
}
async function prepared(gender,dir,tone,cap){
 var id=[gender,dir,tone,cap].join("|");if(cache.has(id))return cache.get(id);
 var model=models[gender],rig=model.rig,mask=decodeMask(rig.masks[dir]),layers={};
 for(var i=0;i<LAYERS.length;i++){
  var name=LAYERS[i],uri=rig.layers[name]&&rig.layers[name][dir];
  if(uri)layers[name]=tint(await reader(uri),model,tone)
 }
 var caps=Object.assign({},rig.capRadius||{});
 if(cap){["leg_near_lower","leg_far_lower","arm_near_lower","arm_far_lower"].forEach(function(name){caps[name]=3})}
 else{["leg_near_lower","leg_far_lower","arm_near_lower","arm_far_lower"].forEach(function(name){caps[name]=0})}
 var info={model:model,rig:rig,mask:mask,pivots:rig.pivots[dir],placements:rig.placements[dir],dir:dir,ends:{}};
 ["leg_near_lower","leg_far_lower","arm_near_lower","arm_far_lower"].forEach(function(part){info.ends[part]=endpoint(mask,part,"bottom")});
 info.ends.head=endpoint(mask,"head","top");
 info.prep=R.prepare({mask:mask,layers:layers,order:rig.drawOrders[dir],pivots:info.pivots,placements:info.placements,caps:caps});
 cache.set(id,info);return info;
}
function solve(start,middle,end,target,sign){
 var a=minus(middle,start),b=minus(end,middle),len1=magnitude(a),len2=magnitude(b),line=minus(target,start),d=magnitude(line);
 if(len1<.5||len2<.5)throw Error("IK chain degenerate; adjust its pivot or slice.");
 var dist=clamp(d,Math.abs(len1-len2)+.001,len1+len2-.001);
 var dir=d>1e-6?p(line.x/d,line.y/d):p(0,1),limited=plus(start,p(dir.x*dist,dir.y*dist));
 var alpha=Math.atan2(dir.y,dir.x),beta=Math.acos(clamp((len1*len1+dist*dist-len2*len2)/(2*len1*dist),-1,1));
 var thigh=alpha-sign*beta,knee=plus(start,p(len1*Math.cos(thigh),len1*Math.sin(thigh)));
 var shin=Math.atan2(limited.y-knee.y,limited.x-knee.x);
 var upper=deg(thigh-Math.atan2(a.y,a.x)),lower=deg(shin-Math.atan2(b.y,b.x))-upper;
 return {upper:upper,lower:lower,reach:Math.max(0,d-dist),target:target,clamped:limited,knee:knee,len1:len1,len2:len2};
}
function basePose(progress){
 var a=st.intensity*(st.playing?.5-.5*Math.cos(progress*3.2):1);
 var pose={},face=st.dir==="sw"||st.dir==="nw"?-1:1;
 if(["sit","squat","step","bow","reach","wave","look"].includes(st.preset)){
  var rise=st.preset==="sit"?8:st.preset==="squat"?10:st.preset==="step"?-1:0;
  pose.pelvis={x:0,y:rise*a,a:0};
 }
 if(st.preset==="sit"||st.preset==="squat"||st.preset==="bow"){
  pose.torso={a:(st.preset==="sit"?-8:st.preset==="squat"?12:28)*face*a};
  pose.head={a:-pose.torso.a*.55};
 }
 return {pose:pose,amount:a,face:face};
}
function compute(info,time){
 var initial=basePose(time),pose=initial.pose,a=initial.amount,face=initial.face,targets={},solutions={},active=[];
 var piv=info.pivots,custom=st.targets;
 var anim=st.preset,dir=st.dir,placements=info.placements;
 function applyChain(key,upper,lower,parent,tip,getTarget,sign){
  var isCustom=anim==="custom"&&custom[key];
  var eligible=isCustom||getTarget&&anim!=="custom";
  if(!eligible||!a)return;
  var mats=R.matrices(piv,placements,pose),pm=mats[parent].mat;
  var source=piv[upper],joint=piv[lower],end=tip;
  var desired=isCustom?transform(inverse(pm),custom[key]):getTarget(source,end,a,face);
  var sol=solve(source,joint,end,desired,sign*st.flip);
  pose[upper]={a:sol.upper};pose[lower]={a:sol.lower};
  targets[key]=transform(pm,desired);
  solutions[key]=sol;active.push({key:key,upper:upper,lower:lower,tip:tip,parent:parent});
 }
 function feet(side){
  var key="leg_"+side,upper=key+"_upper",lower=key+"_lower",isCustom=anim==="custom"&&custom[key];
  if(!isCustom&&!["sit","squat","step"].includes(anim))return;
  var at=info.ends[lower];
  applyChain(key,upper,lower,"pelvis",at,function(hip,rest,t,dirFace){
   var dx=anim==="sit"?(side==="near"?10:9):anim==="squat"?(side==="near"?3:-3):(side==="near"?8:-6);
   var dy=anim==="sit"?14:anim==="squat"?(side==="near"?12:13):(side==="near"?19:18);
   var gait=anim==="step"&&st.playing?Math.sin(time*3.2+(side==="far"?Math.PI:0)):0;
   var target=p(hip.x+dirFace*(dx*t+gait*5*t),hip.y+(dy*t+(rest.y-hip.y)*(1-t)-Math.max(0,gait)*2*t));
   return target;
  },face);
 }
 /* Head/torso IK: pelvis pivot -> neck pivot -> top of head. */
 var useHead=anim==="look"||anim==="custom"&&!!custom.head;
 if(useHead&&a){
  var htip=info.ends.head,basemat=R.matrices(piv,placements,pose).pelvis.mat,orig=piv.torso,neck=piv.head;
  var desired=anim==="custom"&&custom.head?transform(inverse(basemat),custom.head):p(htip.x+face*7*a,htip.y+4*a);
  var hs=solve(orig,neck,htip,desired,face*st.flip);
  pose.torso={a:hs.upper};pose.head={a:hs.lower};
  targets.head=transform(basemat,desired);solutions.head=hs;
  active.push({key:"head",upper:"torso",lower:"head",tip:htip,parent:"pelvis"});
 }
 feet("near");feet("far");
 function arms(side){
  var key="arm_"+side,upper=key+"_upper",lower=key+"_lower",isCustom=anim==="custom"&&custom[key];
  if(!isCustom&&!["wave","reach","step"].includes(anim))return;
  var at=info.ends[lower];
  applyChain(key,upper,lower,"torso",at,function(shoulder,rest,t,dirFace){
   var dx=rest.x-shoulder.x,dy=rest.y-shoulder.y;
   if(anim==="wave")return side==="near"?p(shoulder.x+dirFace*10*t+dx*(1-t),shoulder.y-14*t+dy*(1-t)):rest;
   if(anim==="reach")return p(shoulder.x+(side==="near"?dirFace*15:-dirFace*9)*t+dx*(1-t),shoulder.y+3*t+dy*(1-t));
   var gait=st.playing?Math.sin(time*3.2+(side==="near"?Math.PI:0)):1;
   return p(rest.x+dirFace*gait*7*t,rest.y-3*Math.max(0,gait)*t);
  },(side==="near"?face:-face));
 }
 arms("near");arms("far");
 var control=clone(pose);
 active.forEach(function(item){control[item.lower]={a:0}});
 return {pose:pose,control:control,active:active,targets:targets,solutions:solutions};
}
function drawImg(id,pixels){
 var cv=$(id),ctx=cv.getContext("2d");ctx.clearRect(0,0,W,H);
 ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels),W,H),0,0);
}
function marker(ctx,pt,color,r){ctx.beginPath();ctx.arc(pt.x,pt.y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.lineWidth=.6;ctx.strokeStyle="#10131c";ctx.stroke()}
function overlay(id,info,pose,rendered,forIK){
 var cv=$(id),ctx=cv.getContext("2d");ctx.clearRect(0,0,W,H);
 if(st.grid){ctx.strokeStyle="rgba(235,244,255,.23)";ctx.lineWidth=.16;for(var i=0;i<=W;i+=8){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,H);ctx.stroke()}for(var j=0;j<=H;j+=8){ctx.beginPath();ctx.moveTo(0,j);ctx.lineTo(W,j);ctx.stroke()}}
 if(!st.markers)return;
 var mats=R.matrices(info.pivots,info.placements,pose);
 var chains=["leg_far","leg_near","arm_far","arm_near","head"];
 chains.forEach(function(key){
  var upper=key==="head"?"torso":key+"_upper",lower=key==="head"?"head":key+"_lower",end=info.ends[lower],start=transform(mats[upper].mat,info.pivots[upper]),joint=transform(mats[lower].mat,info.pivots[lower]),tip=transform(mats[lower].mat,end);
  ctx.strokeStyle=st.effector===key?"#edbd76":"rgba(170,198,213,.5)";ctx.lineWidth=.65;
  ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(joint.x,joint.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();
  marker(ctx,start,"#bca0ee",.9);marker(ctx,joint,"#79d2c2",1.15);
  if(st.effector===key)marker(ctx,tip,"#fbf5ee",1.7);
  if(forIK&&st.effector===key){
   var goal=rendered.targets[key]||tip;
   ctx.strokeStyle="#f9be60";ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(tip.x,tip.y);ctx.lineTo(goal.x,goal.y);ctx.stroke();
   marker(ctx,goal,"#f2b052",2.2);
  }
 });
}
async function render(){
 var stamp=++renderSeq;try{
  var g=st.gender,d=st.dir,tone=st.skin;
  var two=await Promise.all([prepared(g,d,tone,false),prepared(g,d,tone,st.overlap)]);
  if(stamp!==renderSeq)return;
  var a=two[0],b=two[1],motion=compute(b,st.t);
  var before=R.render(a.prep,motion.control),after=R.render(b.prep,motion.pose);
  if(stamp!==renderSeq)return;
  drawImg("before",before);drawImg("after",after);
  overlay("beforeOverlay",a,motion.control,motion,false);overlay("afterOverlay",b,motion.pose,motion,true);
  var mats=R.matrices(b.pivots,b.placements,motion.pose);
  var lines=[];
  motion.active.forEach(function(o){
   var now=transform(mats[o.lower].mat,o.tip),error=magnitude(minus(now,motion.targets[o.key])),sol=motion.solutions[o.key];
   lines.push(names[o.key].split(" (")[0]+": "+Math.round(sol.upper)+"°/"+Math.round(sol.lower)+"° · error "+error.toFixed(2)+"px"+(sol.reach>.05?" (limit)":""));
  });
  $("metrics").textContent=lines.length?lines.join(" | "):"Neutral · seluruh joint mengikuti pivot Genesis resmi.";
  $("protection").textContent="Working draft "+g.toUpperCase()+" · sumber "+b.model.rigSha256.slice(0,12)+"… · 11 parts · 4 directions · NO SAVE TO MASTER";
  last={motion:motion,b:b,before:before,after:after};
  if(!$("status").classList.contains("error"))status("IK arms + knees + head/torso siap. Pilih target dan drag titik emas pada preview kanan.");
 }catch(e){console.error(e);status("Render gagal: "+e.message,true)}
}
function requestRender(){render()}
function updateButtons(){
 document.querySelectorAll("[data-preset]").forEach(function(b){b.classList.toggle("active",b.dataset.preset===st.preset)});
 $("bendval").textContent=Math.round(st.intensity*100)+"%";$("bend").value=Math.round(st.intensity*100);
 $("play").textContent=st.playing?"❚❚ Stop":"▶ Animasi";
 $("overlap").textContent=st.overlap?"● Cap Overlap ON":"○ Cap Overlap OFF";
 $("overlap").classList.toggle("active",st.overlap);
 $("markers").classList.toggle("active",st.markers);$("grid").classList.toggle("active",st.grid);
 $("bendDir").textContent=st.flip===1?"↔ Balik arah sendi":"↔ Sendi terbalik";
}
function stop(){st.playing=false;if(playingFrame!==null)cancelAnimationFrame(playingFrame);playingFrame=null;updateButtons()}
function tick(ms){if(!st.playing)return;st.t=(ms-playStart)/1000;requestRender();playingFrame=requestAnimationFrame(tick)}
function selectPreset(mode){stop();st.preset=mode;st.t=0;updateButtons();requestRender()}
function moveTarget(event){
 var rect=$("afterOverlay").getBoundingClientRect();
 var x=clamp((event.clientX-rect.left)*W/rect.width,0,W-1),y=clamp((event.clientY-rect.top)*H/rect.height,0,H-1);
 st.targets[st.effector]=p(x,y);st.preset="custom";st.intensity=1;updateButtons();requestRender();
}
function exportFile(name,content,type){
 var blob=content instanceof Blob?content:new Blob([content],{type:type||"application/json"});
 var u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(function(){URL.revokeObjectURL(u)},3000);
}
function poseExport(){
 if(!last){status("No pose has been rendered yet",true);return}
 var o={format:"genesis-experiment-pose-v2",experimental:true,model:st.gender,direction:st.dir,preset:st.preset,intensity:st.intensity,pose:last.motion.pose,targets:last.motion.targets,solvers:last.motion.solutions,rigSha256:models[st.gender].rigSha256,notForProduction:true};
 exportFile("genesis-experiment-pose-"+st.gender+".json",JSON.stringify(o,null,2));
}
function savePreview(){
 var c=document.createElement("canvas"),scale=4,margin=12;
 c.width=(W*2+margin*3)*scale;c.height=(H+margin*2)*scale;
 var ctx=c.getContext("2d");ctx.fillStyle="#121821";ctx.fillRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;
 ctx.drawImage($("before"),margin*scale,margin*scale,W*scale,H*scale);
 ctx.drawImage($("after"),(W+margin*2)*scale,margin*scale,W*scale,H*scale);
 c.toBlob(function(blob){if(blob)exportFile("genesis-experiment-"+st.gender+"-"+st.preset+".png",blob)},"image/png");
}
function installUI(){
 document.querySelector("h1").textContent="Genesis Experiment";
 document.title="Genesis Experiment — Pixel Editor + Full Body IK Beta";
 document.querySelector(".brand .sub").textContent="LGR-1 · PIXEL EDITOR · SLICE & PIVOT · FULL-BODY IK";
 document.querySelector(".lead").textContent="Beta terisolasi berbasis Genesis Male Official-8 / Female Official-9. Ubah pixel, mask slicing dan pivot tiap part, lalu tes IK lutut, siku serta kepala/torso. Tidak ada penyimpanan otomatis, publish, atau perubahan pada master/game.";
 document.querySelector(".viewer-head p").textContent="Kontrol: rotasi tanpa koreksi ujung IK";
 document.querySelectorAll(".viewer-head h2")[1].textContent="Full Body IK + Joint Caps";
 document.querySelectorAll(".viewer-head p")[1].textContent="Knees · elbows · head / torso";
 document.querySelector('label[for="leg"]').textContent="Target IK yang digeser";
 $("leg").innerHTML=Object.keys(names).map(function(k){return '<option value="'+k+'">'+names[k]+'</option>'}).join("");
 $("leg").value=st.effector;
 document.querySelector(".panel .section:nth-child(3) h2").textContent="03 / Full-body IK";
 document.querySelector(".panel .section:nth-child(3) .hint").textContent="Pilih kaki, tangan, atau kepala/torso. Seret target IK di preview kanan. Overlap cap tambahan hanya mengubah sambungan; joint fill LGR tetap aktif.";
 document.querySelector(".viewer:nth-child(2) .legend").textContent="Titik emas = target terpilih. Ungu = pivot awal, hijau = sendi, putih = ujung bone. Drag langsung di preview.";
 $("presets").insertAdjacentHTML("beforeend",'<button data-preset="reach">Reach</button><button data-preset="look">Look</button><button data-preset="bow">Bow</button>');
 document.querySelector("footer").textContent="BETA v2: semua file eksperimen berada di site/genesis-experiment/. Hapus folder ini untuk rollback. Tidak ada perubahan pada Genesis Official, registry, atau Mahluk Hidup.";
 document.querySelector(".compare").insertAdjacentHTML("afterend",[
 '<section class="genex-workbench" aria-label="Rig editing studio">',
 '<div class="genex-title"><div><h2>05 / Pixel Editor & Rig Adjust</h2><p>Edit sprite asli, part mask, pivot, dan layer. Preview langsung memakai hasil edit sementara.</p></div><span class="idtag">LOCAL DRAFT</span></div>',
 '<div class="genex-tabs genex-toolset" id="gx-tools">',
 '<button data-gx-tool="pixel" class="active">✎ Pixel</button><button data-gx-tool="erase">⌫ Erase</button><button data-gx-tool="pick">⌖ Pick</button>',
 '<button data-gx-tool="fill">▣ Fill</button><button data-gx-tool="slice">◩ Slice</button><button data-gx-tool="unassign">◫ Unassign</button>',
 '<button data-gx-tool="pivot">◎ Pivot</button></div>',
 '<div class="genex-editor-layout">',
 '<div><div class="genex-editor-stage" id="gx-stage"><canvas id="gx-image" width="64" height="112"></canvas><canvas id="gx-overlay" width="64" height="112" tabindex="0" aria-label="Pixel editor: tap or drag to edit at native resolution"></canvas></div>',
 '<div class="genex-edit-tool-note" id="gx-help">Pencil: klik/geser untuk menggambar pixel pada layer terpilih.</div>',
 '<div class="genex-status" id="gx-status">Loading pixel source…</div></div>',
 '<div class="genex-controls">',
 '<div class="genex-control-group"><div><label for="gx-part">Rig part (11)</label><select id="gx-part"></select></div><div><label for="gx-layer">Pixel layer</label><select id="gx-layer"></select></div></div>',
 '<div class="genex-colors"><div><label for="gx-use-key">Skin-key color</label><label class="genex-check"><input type="checkbox" id="gx-use-key" checked> Use skin key</label><select id="gx-skin-key"></select></div>',
 '<div><label for="gx-color">Manual HEX</label><input id="gx-color" type="color" value="#d9a47e"><label for="gx-brush">Brush: <span id="gx-brush-val">1</span> px</label><input id="gx-brush" type="range" min="1" max="5" value="1"></div></div>',
 '<div class="genex-control-group"><label class="genex-check"><input type="checkbox" id="gx-lock" checked> Lock to selected part</label><label class="genex-check"><input type="checkbox" id="gx-mask-view" checked> Mask overlay</label></div>',
 '<div class="genex-control-group"><label class="genex-check"><input type="checkbox" id="gx-grid"> Pixel grid</label><span class="genex-tip" id="gx-coordinates">x: —  y: —</span></div>',
 '<div class="genex-section-line"><label>Pivot untuk part terpilih (pixel koordinat)</label><div class="genex-pivots"><label>X<input id="gx-px" type="number" min="0" max="63" step="1"></label><label>Y<input id="gx-py" type="number" min="0" max="111" step="1"></label></div>',
 '<div class="genex-small">Mode Pivot: klik atau seret titik pivot pada canvas. Mengubah pivot tidak menggeser source artwork. Slice/part mask disimpan terpisah per arah.</div></div>',
 '<div class="genex-section-line genex-full"><button id="gx-undo">↶ Undo</button><button id="gx-export" class="primary">↓ Export Rig JSON</button>',
 '<button id="gx-import">↑ Import Draft</button><input type="file" id="gx-import-file" accept=".json,application/json"><button id="gx-reset">↺ Reset Official</button></div>',
 '<div class="genex-note"><strong>Non-destruktif:</strong> hanya memodifikasi working copy di tab browser. Tidak ada autosave, sinkronisasi, commit, atau overwrite base. Export terlebih dahulu jika ingin menyimpan hasil eksperimen.</div>',
 '</div></div></section>'
 ].join(""));
 Object.keys(labels).forEach(function(k){$("gx-part").add(new Option(labels[k],k))});$("gx-part").value=ed.part;
 LAYERS.forEach(function(k){$("gx-layer").add(new Option(k.replaceAll("_"," "),k))});$("gx-layer").value=ed.layer;
 ["i","h","e","a","7","5"].forEach(function(k){$("gx-skin-key").add(new Option(k,k))});
 $("gx-skin-key").value=ed.key;
}
async function openEditor(){
 var seq=++editSeq,g=st.gender,d=st.dir,layer=ed.layer,model=models[g],uri=model.rig.layers[layer]&&model.rig.layers[layer][d];
 try{
  var raw=await reader(uri);if(seq!==editSeq)return;
  ed.raw=raw;ed.mask=decodeMask(model.rig.masks[d]);ed.gender=g;ed.dir=d;ed.layerId=layer;ed.dirty=false;
  updatePivotFields();paintEditor();editStatus("Loaded "+g.toUpperCase()+" · "+d.toUpperCase()+" · "+layer+" · 64×112");
 }catch(e){console.error(e);editStatus("Load failed: "+e.message)}
}
function updatePivotFields(){
 var current=models[st.gender].rig.pivots[st.dir][ed.part];
 $("gx-px").value=current.x;$("gx-py").value=current.y;
}
function displayColor(){
 var model=models[st.gender],key=ed.key;
 return ed.useKey?model.skin.keys[key]:ed.hex;
}
function paintEditor(){
 if(!ed.raw||!ed.mask)return;
 var model=models[st.gender],preview=tint(ed.raw,model,st.skin),c=$("gx-image").getContext("2d"),o=$("gx-overlay").getContext("2d");
 c.putImageData(new ImageData(preview,W,H),0,0);o.clearRect(0,0,W,H);
 if(ed.maskView){
  var id=PARTS.indexOf(ed.part),overlayData=o.createImageData(W,H);
  for(var i=0;i<N;i++){
   var at=i*4,own=ed.mask[i];if(ed.raw[at+3]===0&&own===255)continue;
   if(own===id){overlayData.data[at]=255;overlayData.data[at+1]=184;overlayData.data[at+2]=50;overlayData.data[at+3]=ed.raw[at+3]?63:30}
   else if(own===255&&ed.raw[at+3]){overlayData.data[at]=255;overlayData.data[at+1]=55;overlayData.data[at+2]=128;overlayData.data[at+3]=155}
   else if(ed.raw[at+3]){overlayData.data[at]=12;overlayData.data[at+1]=18;overlayData.data[at+2]=28;overlayData.data[at+3]=60}
  }
  o.putImageData(overlayData,0,0);
 }
 var pivots=model.rig.pivots[st.dir];
 Object.keys(pivots).forEach(function(part){
  var pv=pivots[part],selected=part===ed.part;
  o.lineWidth=selected?.8:.5;o.strokeStyle=selected?"#fff1c4":"rgba(223,239,255,.48)";
  o.beginPath();o.moveTo(pv.x-1.5,pv.y);o.lineTo(pv.x+1.5,pv.y);o.moveTo(pv.x,pv.y-1.5);o.lineTo(pv.x,pv.y+1.5);o.stroke();
  if(selected)marker(o,pv,"#f7ba5e",1.2);
 });
 if(ed.hover){o.strokeStyle="#ffffff";o.lineWidth=.33;o.strokeRect(ed.hover.x+.15,ed.hover.y+.15,.7,.7)}
}
function currentXY(event,canvas){
 var rect=canvas.getBoundingClientRect();
 return p(clamp(Math.floor((event.clientX-rect.left)*W/rect.width),0,W-1),clamp(Math.floor((event.clientY-rect.top)*H/rect.height),0,H-1));
}
function pushUndo(){
 history.push({gender:st.gender,rig:JSON.stringify(models[st.gender].rig)});
 if(history.length>30)history.shift();
}
function applyPixel(pt,tool){
 var color=rgb(displayColor()),id=PARTS.indexOf(ed.part),radius=Math.floor(ed.brush/2),raw=ed.raw,mask=ed.mask,changed=false;
 for(var sy=pt.y-radius;sy<=pt.y+radius;sy++)for(var sx=pt.x-radius;sx<=pt.x+radius;sx++){
  if(sx<0||sy<0||sx>=W||sy>=H)continue;var idx=sy*W+sx,at=idx*4;
  if(ed.lock&&mask[idx]!==id)continue;
  if(tool==="erase"){if(raw[at+3]){raw.fill(0,at,at+4);changed=true}}
  else if(raw[at]!==color[0]||raw[at+1]!==color[1]||raw[at+2]!==color[2]||raw[at+3]!==255){
   raw[at]=color[0];raw[at+1]=color[1];raw[at+2]=color[2];raw[at+3]=255;changed=true;
  }
 }
 return changed;
}
function flood(pt){
 var raw=ed.raw,mask=ed.mask,id=PARTS.indexOf(ed.part),start=pt.y*W+pt.x;
 if(ed.lock&&mask[start]!==id)return false;
 var col=rgb(displayColor()),off=start*4,original=[raw[off],raw[off+1],raw[off+2],raw[off+3]];
 if(original[0]===col[0]&&original[1]===col[1]&&original[2]===col[2]&&original[3]===255)return false;
 var seen=new Uint8Array(N),stack=[start],count=0;
 while(stack.length){
  var pos=stack.pop(),x=pos%W,y=Math.floor(pos/W),i=pos*4;
  if(seen[pos])continue;seen[pos]=1;
  if(ed.lock&&mask[pos]!==id)continue;
  if(raw[i]!==original[0]||raw[i+1]!==original[1]||raw[i+2]!==original[2]||raw[i+3]!==original[3])continue;
  raw[i]=col[0];raw[i+1]=col[1];raw[i+2]=col[2];raw[i+3]=255;count++;
  if(x>0)stack.push(pos-1);if(x<W-1)stack.push(pos+1);
  if(y>0)stack.push(pos-W);if(y<H-1)stack.push(pos+W);
 }
 return count>0;
}
function eyedrop(pt){
 var i=(pt.y*W+pt.x)*4;if(ed.raw[i+3]===0){editStatus("Transparent pixel");return}
 var color=keyOf([ed.raw[i],ed.raw[i+1],ed.raw[i+2]]),keys=models[st.gender].skin.keys;
 var match=Object.keys(keys).find(function(k){return keys[k].toUpperCase()===color});
 ed.useKey=!!match;if(match){ed.key=match;$("gx-skin-key").value=match}else{ed.hex=color;$("gx-color").value=color}
 $("gx-use-key").checked=ed.useKey;editStatus("Picked "+color+(match?" (skin key "+match+")":""));
}
function brushSlice(pt,unassign){
 var owner=unassign?255:PARTS.indexOf(ed.part),radius=Math.floor(ed.brush/2),changed=false;
 for(var y=pt.y-radius;y<=pt.y+radius;y++)for(var x=pt.x-radius;x<=pt.x+radius;x++){
  if(x<0||y<0||x>=W||y>=H)continue;var i=y*W+x;
  if(ed.mask[i]!==owner){ed.mask[i]=owner;changed=true}
 }
 return changed;
}
function movePivot(pt){
 var model=models[st.gender],pivot=model.rig.pivots[st.dir][ed.part];
 if(pivot.x===pt.x&&pivot.y===pt.y)return false;
 pivot.x=pt.x;pivot.y=pt.y;updatePivotFields();return true;
}
function brushAt(pt){
 if(!ed.raw||!ed.mask)return;
 if(ed.tool==="pick"){eyedrop(pt);return}
 var changed=false;
 if(ed.tool==="pixel"||ed.tool==="erase")changed=applyPixel(pt,ed.tool);
 else if(ed.tool==="fill")changed=flood(pt);
 else if(ed.tool==="slice"||ed.tool==="unassign")changed=brushSlice(pt,ed.tool==="unassign");
 else if(ed.tool==="pivot")changed=movePivot(pt);
 if(changed){ed.dirty=true;paintEditor()}
}
function finishEdit(){
 if(!ed.drag)return;ed.drag=false;
 if(!ed.dirty)return;
 var rig=models[st.gender].rig;
 if(["pixel","erase","fill"].includes(ed.tool)){
  if(!rig.layers[ed.layer])rig.layers[ed.layer]={};
  rig.layers[ed.layer][st.dir]=encodeRaw(ed.raw);
 }else if(["slice","unassign"].includes(ed.tool)){rig.masks[st.dir]=encodeMask(ed.mask)}
 // Pivot was modified directly in the working rig, never in official snapshots.
 ed.dirty=false;clearCache();paintEditor();requestRender();
 editStatus("Draft updated · "+st.gender+" "+st.dir+" · "+ed.tool+" · not saved to production");
}
function setTool(tool){
 ed.tool=tool;document.querySelectorAll("[data-gx-tool]").forEach(function(b){b.classList.toggle("active",b.dataset.gxTool===tool)});
 var help={pixel:"Pencil: klik/geser mengubah RGBA pixel pada layer terpilih.",erase:"Erase: hapus pixel pada layer aktif.",pick:"Pick: klik pixel untuk sampling color atau skin key.",fill:"Flood Fill: isi area terhubung, menghormati Lock to Part.",slice:"Slice Paint: assign setiap sel mask ke part terpilih.",unassign:"Unassign: bebaskan sel dari mask part (value 255).",pivot:"Pivot: klik atau drag untuk memindahkan pivot part terpilih. Numerik X/Y juga bisa."};
 $("gx-help").textContent=help[tool];
}
function undo(){
 var entry=history.pop();if(!entry){editStatus("Undo history empty");return}
 models[entry.gender].rig=JSON.parse(entry.rig);clearCache();
 st.gender=entry.gender;$("gender").value=entry.gender;st.targets={};
 openEditor();requestRender();editStatus("Undo restored previous "+entry.gender+" rig state");
}
function setPivotXY(){
 if(!models[st.gender])return;
 var x=Number($("gx-px").value),y=Number($("gx-py").value);
 if(!Number.isFinite(x)||!Number.isFinite(y))return;
 x=clamp(Math.round(x),0,63);y=clamp(Math.round(y),0,111);
 var cur=models[st.gender].rig.pivots[st.dir][ed.part];
 if(cur.x===x&&cur.y===y)return;
 pushUndo();cur.x=x;cur.y=y;clearCache();paintEditor();requestRender();
 editStatus("Pivot moved: "+ed.part+" to ("+x+", "+y+")");
}
function resetOfficial(){
 if(!confirm("Reset working "+st.gender+" rig to official snapshot? Unsaved pixel, slice, pivot edits for this gender will be lost."))return;
 pushUndo();models[st.gender]=clone(OFFICIAL[st.gender]);clearCache();st.targets={};openEditor();requestRender();editStatus("Restored official snapshot "+st.gender);
}
function exportRig(){
 var model=clone(models[st.gender]);model.notes="Experimental draft only — not promoted to official Genesis";
 var data={format:"genesis-experiment-rig-v2",experimental:true,notForProduction:true,created:new Date().toISOString(),gender:st.gender,source:st.gender==="male"?"Official-8":"Official-9",model:model};
 exportFile("genesis-experiment-"+st.gender+"-draft.json",JSON.stringify(data,null,2));
 editStatus("Exported experimental draft with 4-view pixel layers, masks, pivots and skin keys.");
}
async function importRig(event){
 var file=event.target.files&&event.target.files[0];if(!file)return;
 try{
  var data=JSON.parse(await file.text());
  if(data.format!=="genesis-experiment-rig-v2"||!data.model||!["male","female"].includes(data.model.gender))throw Error("Only experimental Genesis rig v2 JSON is accepted");
  var mod=data.model,rig=mod.rig;
  if(mod.format!=="lafrich-genesis-base-v1"||!rig||!rig.layers||!rig.masks||!rig.pivots||!rig.drawOrders)throw Error("Invalid Genesis master structure");
  for(var d of DIRS){
   decodeMask(rig.masks[d]);
   for(var part of PARTS){var pv=rig.pivots[d][part];if(!pv||!Number.isFinite(pv.x)||!Number.isFinite(pv.y))throw Error("Invalid "+d+" pivot "+part)}
   for(var layer of Object.keys(rig.layers))if(rig.layers[layer]&&rig.layers[layer][d]&&!rig.layers[layer][d].startsWith("data:image/png;base64,"))throw Error("Only embedded PNG layers are accepted");
  }
  pushUndo();models[mod.gender]=clone(mod);st.gender=mod.gender;$("gender").value=mod.gender;
  st.targets={};clearCache();await openEditor();requestRender();editStatus("Imported "+mod.gender+" experimental rig into this tab only.");
 }catch(e){console.error(e);editStatus("IMPORT FAILED: "+e.message)}
 finally{event.target.value=""}
}
function bind(){
 document.querySelectorAll("[data-preset]").forEach(function(b){b.addEventListener("click",function(){selectPreset(b.dataset.preset)})});
 ["gender","dir","skin"].forEach(function(id){$(id).addEventListener("change",async function(){stop();st[id]=this.value;st.targets={};st.preset="sit";st.t=0;updateButtons();await openEditor();requestRender()})});
 $("leg").addEventListener("change",function(){st.effector=this.value;requestRender()});
 $("bend").addEventListener("input",function(){st.intensity=Number(this.value)/100;updateButtons();requestRender()});
 $("play").addEventListener("click",function(){if(st.playing){stop();return}st.playing=true;playStart=performance.now();updateButtons();playingFrame=requestAnimationFrame(tick)});
 $("reset").addEventListener("click",function(){stop();st.preset="neutral";st.intensity=1;st.targets={};st.t=0;st.flip=1;updateButtons();requestRender()});
 $("bendDir").addEventListener("click",function(){st.flip*=-1;updateButtons();requestRender()});
 $("overlap").addEventListener("click",function(){st.overlap=!st.overlap;updateButtons();requestRender()});
 $("markers").addEventListener("click",function(){st.markers=!st.markers;updateButtons();requestRender()});
 $("grid").addEventListener("click",function(){st.grid=!st.grid;updateButtons();requestRender()});
 $("export").addEventListener("click",poseExport);$("snapshot").addEventListener("click",savePreview);
 var dragIK=false,preview=$("afterOverlay");
 preview.addEventListener("pointerdown",function(e){dragIK=true;preview.setPointerCapture(e.pointerId);stop();moveTarget(e)});
 preview.addEventListener("pointermove",function(e){if(dragIK)moveTarget(e)});
 preview.addEventListener("pointerup",function(){dragIK=false});
 preview.addEventListener("pointercancel",function(){dragIK=false});
 document.querySelectorAll("[data-gx-tool]").forEach(function(b){b.addEventListener("click",function(){setTool(b.dataset.gxTool)})});
 $("gx-part").addEventListener("change",function(){ed.part=this.value;updatePivotFields();paintEditor()});
 $("gx-layer").addEventListener("change",function(){ed.layer=this.value;openEditor()});
 $("gx-use-key").addEventListener("change",function(){ed.useKey=this.checked;editStatus("Pixel color "+(this.checked?"skin key":"manual HEX"))});
 $("gx-skin-key").addEventListener("change",function(){ed.key=this.value});
 $("gx-color").addEventListener("input",function(){ed.hex=this.value;ed.useKey=false;$("gx-use-key").checked=false});
 $("gx-brush").addEventListener("input",function(){ed.brush=Number(this.value);$("gx-brush-val").textContent=this.value});
 $("gx-lock").addEventListener("change",function(){ed.lock=this.checked});
 $("gx-mask-view").addEventListener("change",function(){ed.maskView=this.checked;paintEditor()});
 $("gx-grid").addEventListener("change",function(){$("gx-stage").classList.toggle("show-grid",this.checked)});
 ["gx-px","gx-py"].forEach(function(id){$(id).addEventListener("change",setPivotXY)});
 var canvas=$("gx-overlay");
 canvas.addEventListener("pointerdown",function(e){
  if(!ed.raw||!ed.mask)return;
  canvas.focus();ed.drag=true;ed.dirty=false;canvas.setPointerCapture(e.pointerId);
  var pt=currentXY(e,canvas);ed.hover=pt;
  if(ed.tool!=="pick")pushUndo();
  brushAt(pt);
 });
 canvas.addEventListener("pointermove",function(e){
  var pt=currentXY(e,canvas);ed.hover=pt;$("gx-coordinates").textContent="x: "+pt.x+" · y: "+pt.y;
  if(ed.drag&&ed.tool!=="pick"&&ed.tool!=="fill")brushAt(pt);else paintEditor();
 });
 canvas.addEventListener("pointerup",finishEdit);
 canvas.addEventListener("pointercancel",finishEdit);
 canvas.addEventListener("pointerleave",function(){ed.hover=null;paintEditor()});
 canvas.addEventListener("keydown",function(e){
  if(e.ctrlKey&&e.key.toLowerCase()==="z"){e.preventDefault();undo()}
 });
 $("gx-undo").addEventListener("click",undo);
 $("gx-export").addEventListener("click",exportRig);
 $("gx-import").addEventListener("click",function(){$("gx-import-file").click()});
 $("gx-import-file").addEventListener("change",importRig);
 $("gx-reset").addEventListener("click",resetOfficial);
}
installUI();bind();updateButtons();openEditor();requestRender();
})();
