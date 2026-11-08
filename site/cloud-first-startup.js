/* Reusable cloud-first startup UI. Requires a per-app, real Drive adapter.
 * Never automatically wipes browser data. Not included in production pages yet.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.MembangunCloudStartup=api;
})(typeof window!=="undefined"?window:null,function(root){"use strict";
 function mount(config){
  if(!root?.document||!root.MembangunUniversal)throw Error("Cloud-first core not loaded");
  const U=root.MembangunUniversal,api=config?.adapter;
  for(const name of ["connect","loadAll","upload","readback","apply","exportRows"])
   if(typeof api?.[name]!=="function")throw Error("Missing cloud adapter: "+name);
  if(!U.APPS.has(config.app))throw Error("Unknown cloud-first app");
  let busy=false,ready=false,pending="";
  const view=root.document.createElement("section");
  view.setAttribute("role","dialog");view.setAttribute("aria-modal","true");
  view.setAttribute("aria-label","Cloud startup");
  view.style.cssText="position:fixed;inset:0;z-index:2147483000;background:#008080;display:flex;align-items:center;justify-content:center;padding:16px;font:13px Tahoma,Arial,sans-serif;color:#111";
  const panel=root.document.createElement("div");
  panel.style.cssText="width:min(100%,490px);background:#c0c0c0;border:2px solid;border-color:#fff #333 #333 #fff;box-shadow:5px 5px 0 #222;padding:12px;display:grid;gap:12px";
  const title=root.document.createElement("strong");
  title.style.cssText="display:block;background:#000080;color:#fff;padding:9px";
  title.textContent="▣ "+config.app.toUpperCase()+".EXE / CLOUD DATABASE";
  const desc=root.document.createElement("p");
  desc.textContent="Connect Google Drive, or import a Universal file and upload it to Drive before editing.";
  const state=root.document.createElement("p");state.setAttribute("role","status");state.textContent="NOT CONNECTED";
  const actions=root.document.createElement("div");actions.style.cssText="display:grid;grid-template-columns:1fr 1fr;gap:8px";
  function button(label){const b=root.document.createElement("button");b.type="button";b.textContent=label;b.style.cssText="min-height:42px;border:2px solid;border-color:#fff #555 #555 #fff;background:#d6d6d6;color:#111;font:700 12px Tahoma;padding:8px";return b}
  const sync=button("☁ SYNC FROM DRIVE"),importButton=button("↓ IMPORT UNIVERSAL");
  const confirm=button("↑ CONNECT & UPLOAD IMPORT");confirm.hidden=true;
  confirm.style.gridColumn="1 / -1";
  const file=root.document.createElement("input");file.type="file";file.accept=".json,application/json";file.hidden=true;
  actions.append(sync,importButton,confirm);
  panel.append(title,desc,state,actions,file);view.append(panel);
  root.document.body.append(view);
  const message=(s,error)=>{state.textContent=s;state.style.color=error?"#9b0000":"#102e49"};
  function toggle(disabled){busy=disabled;sync.disabled=importButton.disabled=confirm.disabled=disabled}
  async function enter(data){
   if(!data||data.verified!==true)throw Error("Drive load not verified; editor locked");
   if(typeof api.cleanup==="function")await api.cleanup(data);
   ready=true;view.remove();
   if(typeof config.onReady==="function")await config.onReady(data);
  }
  sync.onclick=async()=>{
   if(busy)return;toggle(true);message("Connecting to Google Drive…");
   try{await api.connect();message("Loading and verifying cloud records…");await enter(await api.loadAll())}
   catch(e){message("SYNC FAILED: "+e.message,true)}finally{toggle(false)}
  };
  importButton.onclick=()=>{if(!busy)file.click()};
  file.onchange=async()=>{
   const f=file.files?.[0];if(!f)return;
   try{
    if(f.size>25*1024*1024)throw Error("File exceeds 25 MB");
    pending=await f.text();const unpacked=await U.unpack(pending);
    message("VALID UNIVERSAL FILE · "+unpacked.records.length+" records · connect Drive to upload");
    confirm.hidden=false;
   }catch(e){pending="";confirm.hidden=true;message("INVALID FILE: "+e.message,true)}
  };
  confirm.onclick=async()=>{
   if(busy||!pending)return;toggle(true);message("Connecting Google Drive…");
   try{
    await api.connect();message("Uploading and verifying every imported record…");
    const imported=await U.syncImported(pending,api);
    message("UPLOAD VERIFIED · Loading current Drive database…");
    const data=await api.loadAll();
    await enter({...data,imported});
   }catch(e){message("IMPORT NOT APPLIED: "+e.message,true)}finally{toggle(false)}
  };
  async function exportUniversal(){
   if(!ready)throw Error("Cannot export before verified Drive load");
   const rows=await api.exportRows();
   const packet=await U.pack(rows,config.app),data=JSON.stringify(packet,null,2);
   const blob=new Blob([data],{type:"application/json"}),url=URL.createObjectURL(blob);
   const link=root.document.createElement("a");
   link.href=url;link.download="membangun-"+config.app+"-universal-"+new Date().toISOString().slice(0,10)+".json";
   root.document.body.append(link);link.click();link.remove();
   setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  return Object.freeze({exportUniversal,isReady:()=>ready,view});
 }
 return Object.freeze({mount});
});