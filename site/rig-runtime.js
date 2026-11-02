/* Virtual Life reusable 2D motion-pack runtime. UMD: browser + Node.
 * Zero side effects on the main game; import intentionally in the host game.
 * Plays only native actor-specific sprites, no guessed pixel retargeting. */
(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module==="object" && module.exports) module.exports=api;
  if(root) root.VirtualLifeRig=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
  "use strict";
  const directions=["se","sw","ne","nw"];
  function clipFor(pack,id) {
    if(!pack || pack.format!=="virtual-life-sprite-motion-v1" || !Array.isArray(pack.clips)) return null;
    return pack.clips.find(c=>c.id===id && c.status==="ready")||null;
  }
  function frameAt(clip, direction, elapsedMs) {
    if(!clip || !Array.isArray(clip.frame_ms) || clip.frame_ms.length!==clip.frames ||
        !directions.includes(direction)) return null;
    if(clip.frames<1 || clip.frame_ms.some(t=>!Number.isInteger(t)||t<=0)) return null;
    const duration=clip.frame_ms.reduce((a,b)=>a+b,0);
    if(!duration) return null;
    const time=Math.max(0,Number(elapsedMs)||0);
    const pos=clip.loop?time%duration:Math.min(time,Math.max(0,duration-1));
    let acc=0,index=clip.frames-1;
    for(let i=0;i<clip.frames;i++){acc+=clip.frame_ms[i];if(pos<acc){index=i;break;}}
    const dir=directions.indexOf(direction);
    return {
      sx:index*64,sy:(clip.row_start+dir)*112,
      sw:64,sh:112,frame:index,direction,duration,
      ended:!clip.loop&&time>=duration,
      pivot:[32,100],
    };
  }
  function draw(ctx,image,clip,direction,elapsedMs,x,y,scale=4) {
    const f=frameAt(clip,direction,elapsedMs);
    if(!f || !image || !(image.naturalWidth||image.width)) return false;
    if(!Number.isFinite(scale)||scale<=0) return false;
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(image,f.sx,f.sy,f.sw,f.sh,
      Math.round(x-32*scale),Math.round(y-100*scale),64*scale,112*scale);
    return true;
  }
  function exportedClip(pack,clip,origin) {
    if(clipFor(pack,clip.id)!==clip) throw new Error("Clip must exist in actor's approved motion pack");
    const atlas=origin?new URL(clip.atlas,origin).href:clip.atlas_url;
    if(!atlas) throw new Error("Missing original sprite atlas URL");
    return {
      format:"virtual-life-sprite-motion-v1",version:1,
      actor:pack.actor,model_type:pack.model_type,adapter:pack.adapter,
      clip:{...clip,atlas_url:atlas},frame_size:[64,112],pivot:[32,100],
      directions:[...directions],included_in_game:false,
    };
  }
  async function fetchPack(url,fetchFn){
    const impl=fetchFn||(typeof fetch==="function"?fetch:null);
    if(!impl)throw new Error("No fetch implementation available");
    const response=await impl(url);
    if(!response.ok)throw new Error("Could not load motion pack: "+response.status);
    const pack=await response.json();
    if(pack.format!=="virtual-life-sprite-motion-v1") throw new Error("Invalid pack format");
    return pack;
  }
  return {directions,clipFor,frameAt,draw,exportedClip,fetchPack};
});
