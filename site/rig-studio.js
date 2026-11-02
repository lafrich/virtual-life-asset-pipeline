"use strict";
/* Virtual Life Rig Studio — Mixamo-like selector for actual 2D source rigs.
 * It never copies a sprite of one character onto another. Browsing PLAN
 * never creates poses. INCLUDE exports the selected actor's ready clip.
 */
(() => {
  const $=id=>document.getElementById(id);
  const rig=$("rig-workspace");
  const tabs=[$("switch-chars"),$("switch-animations"),$("switch-rigs")];
  const paint=$("rig-canvas");
  const ctx=paint.getContext("2d",{alpha:false});
  const motionList=$("rig-motion-list");
  const actorSelect=$("rig-character");
  const studio=window.VirtualLifeRig;
  let data=null, pack=null, actor=null, selected=null, atlas=null;
  let view="se", filter="ready", query="", playing=true, elapsed=0, last=0;
  let generation=0, records=[], cache=new Map();

  const setText=(id,v)=>{$(id).textContent=String(v??"—");};
  const showTab=()=>{
    rig.hidden=false;
    $("character-workspace").hidden=true;
    $("animation-workspace").hidden=true;
    tabs.forEach((tab,i)=>{
      const on=i===2;
      tab.classList.toggle("active",on);
      tab.setAttribute("aria-selected",String(on));
    });
    $("status").textContent="RIG STUDIO / ORIGINAL-SOURCE MOTION PACKS";
    document.querySelector(".window-title strong").textContent="RIG_STUDIO";
    if(data){
      const total=data.characters.length;
      setText("asset-total",String(total).padStart(2,"0"));
      setText("status-asset-count",String(total).padStart(2,"0"));
      setText("status-object-label","RIGS");
    }
  };
  $("switch-rigs").addEventListener("click",showTab);
  for(const tab of tabs.slice(0,2))tab.addEventListener("click",()=>{
    rig.hidden=true;
    tabs[2].classList.remove("active");
    tabs[2].setAttribute("aria-selected","false");
  });

  function getRecords(){
    if(!data||!pack)return [];
    const real=pack.clips.map(clip=>({
      id:clip.id,label:clip.name,ready:true,clip,
      category:"real source",priority:"READY",
    }));
    const have=new Set(real.map(r=>r.id));
    const unready=data.registry.filter(spec=>!have.has(spec.id)).map(spec=>({
      ...spec,ready:false,clip:null,
    }));
    return [...real,...unready].filter(item=>
      (filter==="ready" ? item.ready :
       filter==="planned" ? item.status==="planned" : true) &&
      [item.id,item.label,item.category,item.priority,
        ...(item.requirements||[])].join(" ").toLowerCase().includes(query)
    );
  }
  function renderList(pickFirst=true){
    records=getRecords();
    setText("rig-motion-total",String(records.length).padStart(2,"0"));
    const fragment=document.createDocumentFragment();
    for(const item of records){
      const b=document.createElement("button");
      b.type="button";
      b.className="file-item rig-motion-item";
      b.classList.toggle("chosen",selected?.id===item.id);
      b.setAttribute("role","option");
      b.setAttribute("aria-selected",String(selected?.id===item.id));
      const marker=document.createElement("span");
      marker.className="rig-item-marker";
      marker.textContent=item.ready?"▶":item.priority||"—";
      marker.classList.toggle("rig-item-ready",item.ready);
      const title=document.createElement("span");
      title.className="file-label";
      title.textContent=item.label||item.id.toUpperCase();
      const sub=document.createElement("small");
      sub.textContent=item.ready?"ORIGINAL / READY":(item.priority||"NO RIG")+" / "+(item.category||"PLAN").toUpperCase();
      title.append(sub);
      b.append(marker,title);
      b.addEventListener("click",()=>choose(item));
      fragment.append(b);
    }
    if(!records.length){
      const p=document.createElement("p");
      p.className="file-empty";
      p.textContent="NO MOTIONS MATCH FILTER.";
      fragment.append(p);
    }
    motionList.replaceChildren(fragment);
    if(pickFirst){
      const next=records.find(x=>x.id===selected?.id)||records[0];
      if(next)choose(next,false);else choose(null,false);
    }
  }
  function choose(item,refresh=true){
    selected=item;
    atlas=null;
    elapsed=0;
    last=0;
    playing=Boolean(item?.ready);
    setText("rig-action-title",item?.label||"SELECT MOTION");
    setText("rig-ready-status",item?.ready?"READY / ORIGINAL SOURCE":item?.status==="planned"?"PLANNED / NOT RIGGED":"NEEDS CHARACTER RIG");
    $("rig-ready-status").classList.toggle("is-template",!item?.ready);
    setText("rig-inspect-model",actor?.model_type||"—");
    setText("rig-inspect-adapter",actor?.adapter||"—");
    setText("rig-inspect-frames",item?.ready?item.clip.frames:"—");
    setText("rig-inspect-source",item?.ready?item.clip.source.toUpperCase():"NO ACTOR FRAMES");
    const n=item?.ready ?
      "Native authored poses for "+actor.name+". Source atlas: "+item.clip.atlas+
      ". Four directions and frame timings are ready for inclusion." :
      item?.status==="planned"?
      "Priority "+(item.priority||"—")+" / "+(item.category||"").toUpperCase()+
      ". Required props: "+(item.requirements?.join(", ")||"none")+
      ". Phases: "+(item.phases?.join(" → ")||"not authored")+
      ". This model requires genuine authored poses before inclusion." :
      "This character has no reviewed source rig for this action.";
    setText("rig-inspect-note",n);
    setText("rig-canvas-title",actor?.id.toUpperCase()+" / "+(item?.id.toUpperCase()||"—"));
    $("status").textContent="RIG: "+(actor?.id.toUpperCase()||"—")+" / "+(item?.id.toUpperCase()||"—")+" / "+(item?.ready?"READY":"NEEDS RIG");
    $("rig-include").disabled=!item?.ready;
    $("rig-copy").disabled=!item?.ready;
    $("rig-canvas-overlay").hidden=Boolean(item?.ready);
    if(!item?.ready){
      $("rig-canvas-overlay").textContent=item?.status==="planned"?"NO ANIMATED FRAMES — PLANNED ACTION":"CHOOSE AN AVAILABLE MOTION";
    } else {
      const src=item.clip.atlas;
      if(cache.has(src)){
        atlas=cache.get(src);
      }else{
        const image=new Image();
        image.onload=()=>{cache.set(src,image);if(selected===item)atlas=image;};
        image.onerror=()=>{if(selected===item){$("rig-canvas-overlay").hidden=false;$("rig-canvas-overlay").textContent="SOURCE SPRITE COULD NOT LOAD";}};
        image.src=src;
      }
    }
    setText("rig-play",playing?"Ⅱ PAUSE":"▶ PLAY");
    if(refresh)renderList(false);
  }
  async function chooseActor(id){
    const token=++generation;
    actor=data.characters.find(c=>c.id===id);
    if(!actor)return;
    selected=null;atlas=null;pack=null;records=[];elapsed=0;
    setText("rig-model-name",actor.model_type);
    setText("rig-model-adapter",actor.adapter.toUpperCase()+
      (actor.source_evidence.startsWith("provisional")?" / PROVISIONAL":""));
    setText("rig-inspect-model",actor.model_type);
    setText("rig-inspect-adapter",actor.adapter);
    $("rig-canvas-overlay").hidden=false;
    $("rig-canvas-overlay").textContent="LOADING ORIGINAL ACTOR SPRITES...";
    try{
      const nextPack=await studio.fetchPack(actor.pack);
      if(token!==generation)return;
      if(nextPack.actor!==actor.id || nextPack.model_type!==actor.model_type)
        throw new Error("Motion pack and selected model mismatch");
      pack=nextPack;
      filter="ready";
      document.querySelectorAll("[data-rig-filter]").forEach(b=>{
        const active=b.dataset.rigFilter==="ready";
        b.classList.toggle("selected",active);
        b.setAttribute("aria-pressed",String(active));
      });
      renderList();
    }catch(e){
      if(token!==generation)return;
      $("rig-canvas-overlay").textContent="RIG PACK UNAVAILABLE";
      setText("rig-inspect-note",e.message);
    }
  }
  const setDirection=dir=>{
    view=dir;
    document.querySelectorAll("[data-rig-dir]").forEach(b=>{
      const active=b.dataset.rigDir===dir;
      b.classList.toggle("active",active);
      b.setAttribute("aria-pressed",String(active));
    });
  };
  function tick(now){
    requestAnimationFrame(tick);
    if(rig.hidden){last=now;return;}
    if(last&&playing)elapsed+=Math.min(100,Math.max(0,now-last));
    last=now;
    const w=paint.width,h=paint.height;
    ctx.imageSmoothingEnabled=false;
    ctx.fillStyle="#f2f3f6";ctx.fillRect(0,0,w,h);
    ctx.strokeStyle="#d6d9e4";ctx.beginPath();ctx.moveTo(0,h-62);
    ctx.lineTo(w,h-62);ctx.stroke();
    if(!selected?.ready||!atlas)return;
    const clip=selected.clip;
    const used=studio.draw(ctx,atlas,clip,view,elapsed,w/2,h/2+120,3);
    const f=studio.frameAt(clip,view,elapsed);
    if(used&&f)setText("rig-frame",String(f.frame+1).padStart(2,"0")+"/"+clip.frames);
    if(f?.ended && !clip.loop){playing=false;setText("rig-play","▶ REPLAY");}
  }
  function toggle(){
    if(!selected?.ready)return;
    if(!playing && !selected.clip.loop && elapsed>=selected.clip.frame_ms.reduce((a,b)=>a+b,0))elapsed=0;
    playing=!playing;last=0;
    setText("rig-play",playing?"Ⅱ PAUSE":"▶ PLAY");
  }
  function step(delta){
    if(!records.length)return;
    const i=records.findIndex(r=>r.id===selected?.id);
    choose(records[(i+delta+records.length)%records.length]);
  }
  $("rig-play").addEventListener("click",toggle);
  $("rig-toggle").addEventListener("click",toggle);
  $("rig-prev").addEventListener("click",()=>step(-1));
  $("rig-next").addEventListener("click",()=>step(1));
  actorSelect.addEventListener("change",()=>chooseActor(actorSelect.value));
  $("rig-search").addEventListener("input",e=>{query=e.target.value.trim().toLowerCase();renderList();});
  document.querySelectorAll("[data-rig-filter]").forEach(b=>b.addEventListener("click",()=>{
    filter=b.dataset.rigFilter;
    document.querySelectorAll("[data-rig-filter]").forEach(other=>{
      const active=other===b;other.classList.toggle("selected",active);
      other.setAttribute("aria-pressed",String(active));
    });
    selected=null;renderList();
  }));
  document.querySelectorAll("[data-rig-dir]").forEach(b=>b.addEventListener("click",()=>setDirection(b.dataset.rigDir)));
  $("rig-include").addEventListener("click",()=>{
    if(!selected?.ready||!pack)return;
    const exportData=studio.exportedClip(pack,selected.clip,document.baseURI);
    const blob=new Blob([JSON.stringify(exportData,null,2)+"\n"],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=pack.actor+"_"+selected.id+"_motion.json";
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    $("status").textContent="EXPORTED "+pack.actor+" / "+selected.id+" / ORIGINAL SOURCE";
  });
  $("rig-copy").addEventListener("click",async()=>{
    if(!selected?.ready||!pack)return;
    const base=new URL("./",document.baseURI).href;
    const code="// Add once: <script src="+JSON.stringify(base+"rig-runtime.js")+"><\\/script>\n"+
      "const pack = await VirtualLifeRig.fetchPack("+JSON.stringify(base+actor.pack)+");\n"+
      "const clip = VirtualLifeRig.clipFor(pack,"+JSON.stringify(selected.id)+");\n"+
      "const image = new Image(); image.src = new URL(clip.atlas,"+JSON.stringify(base)+").href;\n"+
      "// Per-frame: VirtualLifeRig.draw(ctx,image,clip,\"se\",elapsedMs,x,y,scale);";
    try{await navigator.clipboard.writeText(code);$("status").textContent="COPIED CHARACTER-SPECIFIC IMPORT SNIPPET";}
    catch(e){$("status").textContent="CLIPBOARD NOT AVAILABLE; DOWNLOAD JSON INSTEAD";}
  });
  (async()=>{
    try{
      const response=await fetch("./rigs.json",{cache:"no-store"});
      if(!response.ok)throw new Error("RIGS.JSON unavailable");
      data=await response.json();
      for(const item of data.characters){
        const option=document.createElement("option");
        option.value=item.id;option.textContent=item.name+" · "+item.model_type;
        actorSelect.append(option);
      }
      const start=data.characters.find(c=>c.id==="aladdin_sane")||
        data.characters.find(c=>c.ready_count>0)||data.characters[0];
      if(start){actorSelect.value=start.id;await chooseActor(start.id);}
      if(location.hash==="#rigs")showTab();
    }catch(e){
      $("rig-canvas-overlay").textContent="RIG STUDIO UNAVAILABLE";
      setText("rig-inspect-note",e.message);
    }
  })();
  requestAnimationFrame(tick);
})();
