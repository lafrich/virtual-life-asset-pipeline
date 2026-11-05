/* Emotion Studio — GitHub-backed universal emotion database and frame editor. */
(function(){"use strict";
const U=window.MH2UniversalEmotions,P=window.MH2PlanePixelEditor;
const $=id=>document.getElementById(id),DIR=U.DIR;
let catalog=null,selected=null,atlas=null,frame=0,direction="se",dirty=false,playing=false,authToken="",saving=false,editor=null;
const snapshot=()=>({...selected}),clone=x=>JSON.parse(JSON.stringify(x));
function status(s,error=false){$("status").textContent=s;$("status").style.color=error?"#b62230":""}
function setDirty(value=true){dirty=value;$("dirty").textContent=dirty?"● UNSAVED / NOT ON GITHUB":"✓ GITHUB / SYNCED";$("dirty").style.color=dirty?"#b62230":"#276744"}
function stageImage(index=frame){const c=document.createElement("canvas");c.width=64;c.height=448;
 if(atlas)c.getContext("2d").drawImage(atlas,index*64,0,64,448,0,0,64,448);return c}
function drawTile(target,index,dir="se"){const ctx=target.getContext("2d");ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,target.width,target.height);
 if(!atlas)return;const sy=DIR.indexOf(dir)*112;ctx.drawImage(atlas,index*64,sy,64,112,0,0,target.width,target.height)}
function drawPreview(){drawTile($("preview"),frame,direction);$("previewInfo").textContent=direction.toUpperCase()+" · FRAME "+(frame+1)+" / "+selected.frames}
function renderFrames(){const t=$("timeline");t.replaceChildren();
 for(let i=0;i<selected.frames;i++){const b=document.createElement("button");b.className="frame-cell"+(i===frame?" active":"");
  const c=document.createElement("canvas");c.width=64;c.height=112;drawTile(c,i,"se");
  const num=document.createElement("span");num.textContent="◆ "+String(i+1).padStart(2,"0");b.append(c,num);b.title="Edit frame "+(i+1);b.onclick=()=>{frame=i;renderFrames();drawPreview()};t.append(b)}
 $("frameInfo").textContent=selected.frames+" FRAME(S) · "+selected.fps+" FPS";
}
function render(){if(!selected||!atlas)return;$("name").value=selected.name;$("base").value=selected.base;$("fps").value=selected.fps||6;
 for(const b of document.querySelectorAll("[data-dir]"))b.classList.toggle("active",b.dataset.dir===direction);
 renderFrames();drawPreview();}
async function choose(entry,{force=false}={}){
 if(dirty&&!force&&!window.confirm("Unsaved pixels are not on GitHub. Discard them?"))return;
 playing=false;$("play").textContent="▶ PLAY";selected=clone(entry);frame=0;
 try{atlas=await U.renderAtlas(selected)}catch(e){status("ASSET INVALID: "+e.message,true);return}
 setDirty(false);render();renderList();status("LOADED / "+selected.name.toUpperCase()+" · "+selected.frames+" FRAMES");
}
async function renderList(){
 const list=$("cards");if(!catalog)return;list.replaceChildren();
 const q=$("filter").value.trim().toLowerCase();const entries=selected&&!catalog.entries.some(x=>x.id===selected.id)?[...catalog.entries,selected]:catalog.entries;
 const filtered=entries.filter(x=>x.name.toLowerCase().includes(q)||x.id.includes(q));
 $("count").textContent=filtered.length+" ASSETS";
 for(const item of filtered){const row=document.createElement("button");row.className="emotion-card"+(selected?.id===item.id?" active":"");
  const thumb=document.createElement("canvas");thumb.width=64;thumb.height=112;
  U.renderAtlas(item).then(src=>{const ctx=thumb.getContext("2d");ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,64,112);ctx.drawImage(src,0,0,64,112,0,0,64,112)}).catch(()=>{});
  const labels=document.createElement("span"),name=document.createElement("b"),info=document.createElement("small");
  name.textContent=item.name;info.textContent=item.frames+" FRAMES · "+item.base.toUpperCase();labels.append(name,info);row.append(thumb,labels);
  row.onclick=()=>choose(item);list.append(row);
 }
}
async function reload({force=false}={}){if(dirty&&!force&&!window.confirm("Discard unsaved emotion edits?"))return;
 status("LOADING GITHUB CATALOG ...");try{const result=await U.loadCatalog();catalog=result.catalog;
 $("online").textContent="GITHUB / "+(result.from==="github"?"LIVE":"PUBLISHED");
 const next=catalog.entries.find(x=>x.id===selected?.id)||catalog.entries[0];if(next)await choose(next,{force:true});else{status("No assets in catalog",true);await renderList()}
 }catch(e){status("CATALOG LOAD FAILED: "+e.message,true);$("online").textContent="GITHUB / OFFLINE"}}
function mark(){setDirty();renderFrames();drawPreview()}
function addFrame(){if(selected.frames>=48){status("MAXIMUM 48 FRAMES",true);return}
 const next=document.createElement("canvas");next.width=(selected.frames+1)*64;next.height=448;
 const ctx=next.getContext("2d");ctx.drawImage(atlas,0,0);ctx.drawImage(atlas,frame*64,0,64,448,selected.frames*64,0,64,448);
 atlas=next;frame=selected.frames++;mark()}
function removeFrame(){if(selected.frames<=1){status("ONE FRAME MUST REMAIN",true);return}
 const next=document.createElement("canvas");next.width=(selected.frames-1)*64;next.height=448;const ctx=next.getContext("2d");
 let x=0;for(let f=0;f<selected.frames;f++)if(f!==frame){ctx.drawImage(atlas,f*64,0,64,448,x*64,0,64,448);x++}
 atlas=next;selected.frames--;frame=Math.min(frame,selected.frames-1);mark()}
async function applyFrame(png){const im=await new Promise((resolve,reject)=>{const x=new Image();x.onload=()=>resolve(x);x.onerror=()=>reject(Error("Frame PNG invalid"));x.src=png});
 if(im.width!==64||im.height!==448)throw Error("Frame must be 64×448");
 const ctx=atlas.getContext("2d");ctx.clearRect(frame*64,0,64,448);ctx.drawImage(im,frame*64,0);mark();status("FRAME "+(frame+1)+" APPLIED · SAVE TO GITHUB TO PUBLISH")}
function openEditor(){if(!atlas)return;const img=stageImage();
 editor.open({id:"emotion-frame-"+(frame+1),initialAtlas:img,originalAtlas:img,direction});
}
function newEmotion(){if(dirty&&!window.confirm("Discard unsaved emotion edits?"))return;
 const id="emotion-"+Date.now().toString(36),fresh={id,name:"NEW EMOTION",base:"universal",frames:1,fps:6,template:"neutral"};
 choose(fresh,{force:true}).then(()=>{setDirty();$("name").focus();$("name").select()})}
function exportPng(){if(!atlas)return;atlas.toBlob(blob=>{if(!blob)return;const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=(selected.id||"emotion")+".png";a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)},"image/png")}
async function importPng(file){if(!file)return;
 if(!/^image\/png$/.test(file.type)){status("SELECT A PNG FILE",true);return}
 try{const url=URL.createObjectURL(file);let im;try{im=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url})}finally{URL.revokeObjectURL(url)}
 if(im.naturalHeight!==448||im.naturalWidth%64||im.naturalWidth<64||im.naturalWidth>64*48)throw Error("PNG must be 64×N width and exactly 448 height");
 if(dirty&&!window.confirm("Discard unsaved edits?"))return;
 const canvas=document.createElement("canvas");canvas.width=im.naturalWidth;canvas.height=448;canvas.getContext("2d").drawImage(im,0,0);
 const id="emotion-"+Date.now().toString(36);
 const fresh={id,name:file.name.replace(/\.png$/i,"").slice(0,80)||"Imported emotion",base:"universal",fps:6,frames:canvas.width/64,png:canvas.toDataURL("image/png")};
 await choose(fresh,{force:true});setDirty();status("IMPORTED INTO EDITOR · SAVE TO GITHUB TO PUBLISH");
 }catch(e){status("IMPORT FAILED: "+e.message,true)}}
async function connect(){const proposed=$("token").value.trim();if(!proposed){status("ENTER GITHUB FINE-GRAINED TOKEN FOR THIS REPOSITORY",true);return}
 $("connect").disabled=true;try{await U.loadCatalog(proposed);authToken=proposed;$("token").value="";$("authLabel").textContent="✓ GITHUB AUTHORIZED · THIS TAB ONLY";status("GITHUB CONNECTED / READY TO PUBLISH")}
 catch(e){authToken="";status("TOKEN CHECK FAILED: "+e.message,true)}finally{$("connect").disabled=false}}
async function save(){
 if(!selected||!atlas||saving)return;
 if(!authToken){status("CONNECT GITHUB FIRST TO SAVE (Contents: Read and write)",true);$("token").focus();return}
 saving=true;$("save").disabled=true;status("PUBLISHING EMOTION TO GITHUB ...");
 try{const entry={...snapshot(),name:$("name").value.trim()||"UNTITLED",base:$("base").value,frames:selected.frames,fps:Math.max(1,Math.min(30,Number($("fps").value)||6)),png:atlas.toDataURL("image/png")};
 delete entry.template;
 if(entry.png.length>3000000)throw Error("PNG too large for GitHub catalog");
 const result=await U.saveEntry(entry,authToken);catalog=result.catalog;selected=clone(entry);
 setDirty(false);await renderList();status("✓ SAVED ON GITHUB · "+result.commit.slice(0,10)+" · REFRESH MAHLUK HIDUP 2 TO LOAD");
 }catch(e){status("SAVE FAILED: "+e.message,true)}finally{saving=false;$("save").disabled=false}
}
function animationTick(t){if(playing&&selected&&atlas&&!editor?.isOpen()){
 if(!animationTick.prev||t-animationTick.prev>=1000/(selected.fps||6)){frame=(frame+1)%selected.frames;animationTick.prev=t;renderFrames();drawPreview()}
 }requestAnimationFrame(animationTick)}
function wire(){editor=P.create({overlay:$("pixelOverlay"),canvas:$("pixelCanvas"),reference:$("preview"),
 onApply:(id,png)=>{applyFrame(png).then(()=>editor.close()).catch(e=>status(e.message,true));return false},
 onSaveDefault:(id,png)=>{applyFrame(png).then(()=>editor.close()).catch(e=>status(e.message,true));return false}});
 $("filter").oninput=renderList;$("reload").onclick=()=>reload();$("new").onclick=newEmotion;$("export").onclick=exportPng;
 $("import").onchange=e=>{importPng(e.target.files?.[0]);e.target.value=""};
 $("duplicateFrame").onclick=addFrame;$("deleteFrame").onclick=removeFrame;$("edit").onclick=openEditor;
 $("play").onclick=()=>{playing=!playing;$("play").textContent=playing?"Ⅱ PAUSE":"▶ PLAY";animationTick.prev=0};
 for(const b of document.querySelectorAll("[data-dir]"))b.onclick=()=>{direction=b.dataset.dir;render()};
 $("name").oninput=()=>{if(selected){selected.name=$("name").value;setDirty();renderList()}};
 $("base").onchange=()=>{if(selected){selected.base=$("base").value;setDirty()}};
 $("fps").onchange=()=>{if(selected){selected.fps=Math.max(1,Math.min(30,Number($("fps").value)||6));setDirty();renderFrames()}};
 $("connect").onclick=connect;$("save").onclick=save;
 window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue=""}});
 requestAnimationFrame(animationTick);
}
wire();reload({force:true});
})();