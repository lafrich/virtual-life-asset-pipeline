/* Original Python V6B / NumPy / Pillow procedural preview in an isolated Web Worker.
 * Uploaded .py source is NEVER evaluated. Only validated declarative JSON reaches Python.
 */
"use strict";
const CDN="https://cdn.jsdelivr.net/pyodide/v0.28.2/full/";
let loading=null,py=null,renderer=null;
async function init(){
 if(loading)return loading;
 loading=(async()=>{
  postMessage({type:"status",text:"Loading native Python V6B renderer…"});
  importScripts(CDN+"pyodide.js");
  py=await loadPyodide({indexURL:CDN});
  await py.loadPackage(["numpy","pillow"]);
  const files=[
   ["tools/live_v6b.py","tools/live_v6b.py"],
   ["tools/genesis_native_render.py","../genesis-native-render.py"],
   ...["ref_labels.npy","ref_mask.npy","ref_sem.npy","ref_blocks.npy","ref_palette.npy"].map(n=>["study/"+n,"study/"+n]),
   ["live/chars/ichsan.json","live/chars/ichsan.json"],
   ["live/chars/noor.json","live/chars/noor.json"]
  ];
  py.FS.mkdirTree("/v6b/tools");
  py.FS.mkdirTree("/v6b/study");
  py.FS.mkdirTree("/v6b/live/chars");
  for(const [dest,source] of files){
   const url=new URL("genesis-native-source/"+source,self.location.href);
   // The renderer's actual Python source lives at the site root.
   const target=dest==="tools/genesis_native_render.py"?
     new URL("genesis-native-render.py",self.location.href):url;
   const response=await fetch(target);
   if(!response.ok)throw Error("Native Python source unavailable: "+target.pathname+" HTTP "+response.status);
   py.FS.writeFile("/v6b/"+dest,new Uint8Array(await response.arrayBuffer()));
  }
  py.runPython("import sys; sys.path.insert(0, '/v6b/tools'); import genesis_native_render");
  postMessage({type:"ready"});
 })().catch(e=>{loading=null;throw e});
 return loading;
}
onmessage=async event=>{
 const msg=event.data||{};
 if(msg.type!=="render"&&msg.type!=="renderBatch")return;
 try{
  await init();
  py.globals.set("GENESIS_RENDER_REQUEST",JSON.stringify(msg.request));
  if(msg.type==="renderBatch"){
   const images=py.runPython("import json; {d: genesis_native_render.render({**json.loads(GENESIS_RENDER_REQUEST), 'direction':d}) for d in genesis_native_render.DIRS}");
   postMessage({type:"renderBatch",id:msg.id,images:images.toJs({dict_converter:Object.fromEntries})});
   images.destroy();
  }else{
   const src=py.runPython("import json; genesis_native_render.render(json.loads(GENESIS_RENDER_REQUEST))");
   postMessage({type:"render",id:msg.id,src});
  }
 }catch(e){postMessage({type:"error",id:msg.id,message:String(e.message||e)})}
};
