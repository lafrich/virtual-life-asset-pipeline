/* Guided Character editor on top of original V6P sprite compositor.
   No dummy Noor entry; only real library records and Male/Female base. */
(function(root){"use strict";
const $=id=>document.getElementById(id),S=root.V6PCharacterStore,H=root.V6PCharacterHost,V=root.V6PCompositor;
if(!S||!H||!V)return;
const source=$("workflow-source"),list=$("workflow-list"),qa=$("qa-animation");
const status=s=>$("workflow-status").textContent=String(s);
function published(){try{const v=JSON.parse(localStorage.getItem("mahluk-2-library-v1")||"[]");return Array.isArray(v)?v.filter(x=>x&&x.v6p&&/^mh2_[a-z0-9]+$/.test(x.id)):[]}catch{return []}}
function add(sel,value,label){const o=document.createElement("option");o.value=value;o.textContent=label;sel.append(o)}
function refresh(){
 const choice=source.value,current=list.value;source.replaceChildren();list.replaceChildren();
 add(source,"base:male","MALE BASE · nude / no hair");
 add(source,"base:female","FEMALE BASE · nude / no hair");
 add(list,"","Choose a character…");
 add(list,"base:male","[TEMPLATE] Male Base — Nude");
 add(list,"base:female","[TEMPLATE] Female Base — Nude");
 const drafts=S.list(),saved=published(),seen=new Set();
 for(const row of drafts){add(source,"draft:"+row.id,row.name+" · editable");add(list,row.id,row.name+" · "+row.status);seen.add(row.id)}
 for(const row of saved)if(!seen.has(row.id)){add(source,"saved:"+row.id,row.name+" · database");add(list,row.id,row.name+" · database");seen.add(row.id)}
 if([...source.options].some(o=>o.value===choice))source.value=choice;
 if([...list.options].some(o=>o.value===current))list.value=current;
}
function fromChoice(value){
 if(value.startsWith("base:"))return {gender:value.slice(5)};
 const id=value.split(":")[1],draft=S.get(id),saved=published().find(x=>x.id===id);
 if(draft)return {from:id};
 if(saved)return {gender:saved.base==="female"?"female":"male",appearance:saved.v6p,faceId:saved.faceId||"",name:saved.name};
 return {gender:"male"};
}
async function open(id){
 if(id.startsWith("base:")){await H.useBase(id.slice(5));S.select("");status("Preview template "+id.slice(5)+". Click ADD NEW CHARACTER before saving your own edit.");return}
 let row=S.get(id);
 if(!row){const saved=published().find(x=>x.id===id);if(!saved){status("Record not found");return}
  row=S.create({name:saved.name,gender:saved.base==="female"?"female":"male"});
  row=S.update(row.id,{appearance:saved.v6p,faceId:saved.faceId||""});
 }
 S.select(row.id);await H.open(row);refresh();list.value=row.id;status("EDIT "+row.name+" · "+Object.keys(row.parts||{}).length+" custom sprite layers. Changes stay local to this character.");
 await H.qa(qa.value||"idle");
}
async function newCharacter(){
 const src=fromChoice(source.value);
 const name=root.prompt("Name your character",src.name?src.name+" Copy":src.gender==="female"?"New Female Character":"New Male Character");
 if(!name)return;
 let row=S.create({name,gender:src.gender,from:src.from});
 if(src.appearance)row=S.update(row.id,{appearance:src.appearance,faceId:src.faceId});
 await open(row.id);
}
qa.replaceChildren();for(const action of V.ACTIONS||Object.keys(V.ROWS))add(qa,action,action.toUpperCase().replaceAll("_"," "));
qa.value="idle";
const qp=document.createElement("label");qp.textContent="EDIT PART";qp.style.cssText="font-size:10px;width:100%";
const part=document.createElement("select");part.id="qa-part";
for(const p of ["body","hair","top","pants","shoes","face"])add(part,p,p.toUpperCase());
part.value="top";qp.append(part);$("all-views").after(qp);
for(const cv of document.querySelectorAll("[data-qa-dir]")){
 cv.title="Edit "+cv.dataset.qaDir.toUpperCase()+" at current frame";cv.style.cursor="pointer";
 cv.addEventListener("click",()=>H.edit(part.value,cv.dataset.qaDir,qa.value));
}
qa.addEventListener("change",()=>H.qa(qa.value));
$("workflow-new").onclick=()=>newCharacter().catch(e=>status(e.message));
$("workflow-clone").onclick=()=>{
 const current=H.get(),id=current.id;
 if(!id){status("Create or open a character before duplicating");return}
 source.value="draft:"+id;newCharacter().catch(e=>status(e.message));
};
$("workflow-open").onclick=()=>open(list.value).catch(e=>status(e.message));
list.addEventListener("dblclick",()=>open(list.value).catch(e=>status(e.message)));
const originalRefresh=$("refresh-assets");
originalRefresh.addEventListener("click",()=>H.qa(qa.value));
const originalSave=$("save");
originalSave.addEventListener("click",()=>{refresh();const row=S.get(H.get().id);if(row)status("SAVE requested · "+row.name+" · see preview status for validation.")});
root.addEventListener("storage",e=>{if([S.KEY,"mahluk-2-library-v1"].includes(e.key))refresh()});
root.addEventListener("message",e=>{if(e.origin!==location.origin||e.data?.type!=="mahluk:refresh-character")return;
 originalRefresh.click();refresh();
});
root.addEventListener("mahluk:character-ready",async()=>{
 refresh();const last=S.selected(),row=S.get(last);
 try{if(row)await open(row.id);else await H.useBase("male");await H.qa("idle")}catch(e){status(e.message)}
});
})(window);