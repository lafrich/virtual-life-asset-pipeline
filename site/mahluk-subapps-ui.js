/* Small DOM helpers shared by Bergerak + Beraksi (no framework). */
(function(root){"use strict";
function el(tag,attrs,...kids){
 const e=document.createElement(tag);
 for(const [k,v] of Object.entries(attrs||{})){
  if(v==null||v===false)continue;
  if(k==="class")e.className=v;else if(k==="text")e.textContent=v;else if(k==="html")e.innerHTML=v;
  else if(k.startsWith("on"))e[k]=v;else if(k==="style")e.style.cssText=v;else if(k in e&&k!=="list")try{e[k]=v}catch{e.setAttribute(k,v)}else e.setAttribute(k,v===true?"":v);
 }
 for(const c of kids.flat())if(c!=null&&c!==false)e.append(c.nodeType?c:document.createTextNode(String(c)));
 return e;
}
function select(options,value,onchange,attrs){
 const s=el("select",attrs||{});
 for(const o of options){if(o.group){const g=el("optgroup",{label:o.group});for(const x of o.items)g.append(new Option(x.label,x.value));s.append(g)}else s.add(new Option(o.label,o.value))}
 s.value=value;if(onchange)s.onchange=()=>onchange(s.value);return s;
}
function status(s,err){const m=document.getElementById("statusmsg");if(m)m.textContent=s;document.getElementById("status")?.classList.toggle("error",!!err)}
function guard(fn){return async(...a)=>{try{return await fn(...a)}catch(e){console.error(e);status(e.message||String(e),true)}}}
const clone=v=>JSON.parse(JSON.stringify(v));
function fit(canvas,cssW){canvas.style.width=cssW+"px"}
/* JSON import / export dialog (file picker OR paste, phone friendly).
 * importDialog({title, check(text, pick)→{entry,fixes,errors,candidates}, open(entry, result)}) */
function modal(title){
 const box=el("section",{class:"sa-gate sa-json",role:"dialog","aria-modal":"true"});
 const body=el("div",{});const close=el("button",{type:"button",class:"sa-x",text:"✕",title:"Tutup",onclick:()=>box.remove()});
 box.append(el("div",{class:"panel"},el("strong",{},title,close),body));document.body.append(box);return {box,body};
}
function importDialog(o){
 const {box,body}=modal(o.title||"↑ IMPORT JSON");
 const ta=el("textarea",{id:"imp-text",rows:9,spellcheck:false,placeholder:"Paste JSON di sini (boleh langsung dari chat AI, termasuk ```json … ```), atau pilih file."});
 const file=el("input",{type:"file",accept:".json,application/json,text/plain",hidden:true});
 const pick=el("select",{id:"imp-pick",hidden:true});
 const report=el("div",{class:"sa-report",id:"imp-report"});
 const openB=el("button",{type:"button",class:"primary",id:"imp-open",disabled:true,text:"✓ BUKA DI EDITOR (preview)"});
 let last=null;
 const check=()=>{
  report.replaceChildren();openB.disabled=true;
  const r=o.check(ta.value,Number(pick.value)||0);last=r;
  if(r.candidates&&r.candidates.length>1){if(pick.hidden||pick.options.length!==r.candidates.length){pick.replaceChildren(...r.candidates.map(c=>new Option((c.index+1)+". "+c.label,String(c.index))));pick.hidden=false}}
  else pick.hidden=true;
  if(r.errors.length)report.append(el("p",{class:"bad",text:"✕ "+r.errors.length+" masalah — belum bisa disimpan. Perbaiki JSON-nya lalu CEK lagi:"}),el("ul",{class:"bad"},...r.errors.slice(0,40).map(e=>el("li",{text:e}))));
  else report.append(el("p",{class:"good",text:"✓ Valid. Bisa dibuka di editor, dicek, lalu ☁ SIMPAN."}));
  if(r.fixes.length)report.append(el("p",{class:"fix",text:"Diperbaiki otomatis ("+r.fixes.length+"):"}),el("ul",{class:"fix"},...r.fixes.slice(0,60).map(e=>el("li",{text:e}))));
  openB.disabled=!r.entry;
 };
 file.onchange=async()=>{const f=file.files?.[0];if(!f)return;if(f.size>3e6){report.textContent="File terlalu besar (maks 3 MB).";return}ta.value=await f.text();file.value="";pick.hidden=true;check()};
 pick.onchange=check;
 openB.onclick=()=>{if(last?.entry){box.remove();o.open(last.entry,last)}};
 body.append(ta,file,el("div",{class:"sa-row"},el("button",{type:"button",id:"imp-file",text:"📂 PILIH FILE",onclick:()=>file.click()}),
  el("button",{type:"button",id:"imp-check",text:"🔍 CEK",onclick:check}),pick),report,openB,
  el("p",{class:"sa-hint",text:o.hint||"Data yang tidak valid tidak bisa disimpan. Hasil impor muncul di editor dulu (belum tersimpan)."}));
 if(o.text){ta.value=o.text;check()}
 return box;
}
function exportDialog(title,filename,obj){
 const {body}=modal(title||"↓ EXPORT JSON"),text=JSON.stringify(obj,null,1);
 const ta=el("textarea",{rows:12,readOnly:true,spellcheck:false,id:"exp-text"});ta.value=text;
 const dl=()=>{const u=URL.createObjectURL(new Blob([text],{type:"application/json"})),a=el("a",{href:u,download:filename});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000)};
 const cp=el("button",{type:"button",text:"⎘ COPY",onclick:async()=>{try{await navigator.clipboard.writeText(text);cp.textContent="✓ TERCOPY"}catch{ta.select();document.execCommand?.("copy");cp.textContent="✓ (pilih & copy)"}}});
 body.append(ta,el("div",{class:"sa-row"},el("button",{type:"button",class:"primary",id:"exp-download",text:"↓ DOWNLOAD "+filename,onclick:dl}),cp));
}
/* new entry vs existing names/ids: ask overwrite (backup kept) or rename.
 * list = existing entries; reserved = ids that can never be overwritten (built-ins) */
function resolveName(e,list,reserved,label){
 const DB=root.LGRDB,low=s=>String(s||"").trim().toLowerCase();
 const want=DB.slug(e.id||e.name);
 const same=list.find(x=>x.id===want||x.id===DB.slug(e.name)||low(x.name)===low(e.name));
 const names=new Set(list.map(x=>low(x.name))),ids=new Set([...list.map(x=>x.id),...(reserved||[])]);
 const freshId=b=>{let id=DB.slug(b),n=2;while(ids.has(id))id=DB.slug(b).slice(0,36)+"_"+n++;return id};
 if(same&&confirm("Sudah ada "+label+" '"+same.name+"' (id "+same.id+") di database.\n\nOK = TIMPA (versi lama disimpan ke Drive / Backup)\nBatal = simpan dengan nama baru"))
  return {entry:{...e,id:same.id},overwrite:true};
 let name=e.name;if(same||names.has(low(name))){let n=2;while(names.has(low(e.name+" "+n)))n++;name=e.name+" "+n}
 return {entry:{...e,name,id:ids.has(want)||same?freshId(name):want},overwrite:false};
}
root.MHUI=Object.freeze({resolveName,el,select,status,guard,clone,fit,importDialog,exportDialog,modal});
})(window);
