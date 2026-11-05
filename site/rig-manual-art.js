/* Original V6B character artwork: NON-DESTRUCTIVE editable colour + bone ownership.
 * The protected source remains in /media/original-rig. Saving creates only
 * sparse browser-local pixel/weight patches, never overwrites source art.
 */
(function(root,factory){
 "use strict";
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.VLManualRigArt=api;
})(typeof window!=="undefined"?window:null,function(root){
 "use strict";
 const W=64,H=112,PIXELS=W*H;
 const DIR=["se","sw","ne","nw"];
 const STORE="mahluk-clothed-v6b-manual-art-v1";
 const FORMAT="mahluk-original-clothed-manual-art-v1";
 const LIBRARY_STORE="mahluk-original-v6b-custom-versions-v1";
 const ACTIVE_STORE="mahluk-original-v6b-active-version-v1";
 const index=(x,y)=>Math.floor(y)*W+Math.floor(x);
 const bounds=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&y>=0&&x<W&&y<H;
 const copy=x=>JSON.parse(JSON.stringify(x));
 const rgbaColor=(value)=>{
  if(!Array.isArray(value)||value.length!==4)return null;
  return value.map(n=>Math.max(0,Math.min(255,Math.round(Number(n)||0))));
 };
 function blankState(){
  return {format:FORMAT,original:"protected-native-v6b-clothed",name:"CUSTOM CHARACTER 01",
   pixels:Object.fromEntries(DIR.map(d=>[d,[]])),
   weights:Object.fromEntries(DIR.map(d=>[d,[]]))};
 }
 function normalizeState(raw,bones){
  const o=blankState();
  if(!raw||raw.format!==FORMAT)return o;
  o.name=typeof raw.name==="string"?raw.name.slice(0,80):o.name;
  for(const dir of DIR){
   const seenPixel=new Map(),seenWeight=new Map();
   for(const row of raw.pixels?.[dir]||[]){
    if(!Array.isArray(row)||!Number.isInteger(row[0])||row[0]<0||row[0]>=PIXELS)continue;
    const col=rgbaColor(row.slice(1));
    if(col)seenPixel.set(row[0],[row[0],...col]);
   }
   for(const row of raw.weights?.[dir]||[]){
    if(!Array.isArray(row)||!Number.isInteger(row[0])||row[0]<0||row[0]>=PIXELS)continue;
    if(bones.includes(row[1]))seenWeight.set(row[0],[row[0],row[1]]);
   }
   o.pixels[dir]=[...seenPixel.values()];
   o.weights[dir]=[...seenWeight.values()];
  }
  return o;
 }
 class Editor{
  constructor(rig,host=root){
   if(!rig||!host?.document)throw Error("Character editor needs Rig Studio and Canvas");
   this.rig=rig;this.host=host;
   this.bones=rig.BONES.map(b=>b.id);
   this.state=blankState();
   this.src=null;this.baseCache=new Map();this.cache=new Map();
   this.undo=[];this.redo=[];this.onChange=null;
   this.activeVersion="draft";this.loadLocal();
  }
  loadLocal(){
   try{
    this.state=normalizeState(JSON.parse(this.host.localStorage?.getItem(STORE)||"null"),this.bones);
    this.activeVersion=this.host.localStorage?.getItem(ACTIVE_STORE)||"draft";
   }catch{this.state=blankState();this.activeVersion="draft";}
   this.cache.clear();
  }
  library(){
   try{
    const rows=JSON.parse(this.host.localStorage?.getItem(LIBRARY_STORE)||"[]");
    return Array.isArray(rows)?rows.filter(v=>v&&typeof v.id==="string"&&v.data?.format===FORMAT):[];
   }catch{return [];}
  }
  listVersions(){
   return this.library().map(v=>({id:v.id,name:v.name}));
  }
  saveLocal(){
   try{
    this.host.localStorage?.setItem(STORE,JSON.stringify(this.state));
    this.host.localStorage?.setItem(ACTIVE_STORE,this.activeVersion);
    if(this.activeVersion!=="draft"&&this.activeVersion!=="original"){
     const rows=this.library(),item=rows.find(v=>v.id===this.activeVersion);
     if(item){
      item.name=this.state.name;item.data=this.serialize();
      this.host.localStorage?.setItem(LIBRARY_STORE,JSON.stringify(rows));
     }
    }
    return true;
   }catch{return false;}
  }
  saveAsVersion(name){
   const rows=this.library();
   const next=rows.reduce((n,v)=>Math.max(n,Number(v.id.replace("custom-",""))||0),0)+1;
   const id="custom-"+next;
   this.state.name=String(name||"CUSTOM CHARACTER "+next).slice(0,80);
   rows.push({id,name:this.state.name,data:this.serialize()});
   try{
    this.host.localStorage?.setItem(LIBRARY_STORE,JSON.stringify(rows));
    this.activeVersion=id;this.saveLocal();return id;
   }catch{return null;}
  }
  openVersion(id){
   this.snapshot();
   const version=this.library().find(v=>v.id===id);
   if(id==="original"){
    this.state=blankState();this.state.name="ORIGINAL CLOTHED MASTER";
    this.activeVersion="original";
   }else if(version){
    this.state=normalizeState(version.data,this.bones);
    this.activeVersion=id;
   }else return false;
   this.cache.clear();this.saveLocal();this.changed();return true;
  }
  serialize(){return copy(this.state);}
  importState(data){
   this.snapshot();
   this.state=normalizeState(data,this.bones);
   this.cache.clear();this.saveLocal();this.changed();
  }
  reset(direction){
   this.snapshot();
   if(direction&&DIR.includes(direction)){
    this.state.pixels[direction]=[];this.state.weights[direction]=[];
   }else this.state=blankState();
   this.cache.clear();this.saveLocal();this.changed();
  }
  snapshot(){
   this.undo.push(JSON.stringify(this.state));
   if(this.undo.length>30)this.undo.shift();
   this.redo=[];
  }
  history(direction){
   const from=direction==="undo"?this.undo:this.redo;
   const to=direction==="undo"?this.redo:this.undo;
   if(!from.length)return false;
   to.push(JSON.stringify(this.state));
   this.state=normalizeState(JSON.parse(from.pop()),this.bones);
   this.cache.clear();this.saveLocal();this.changed();return true;
  }
  changed(dir){
   if(dir){
    for(const key of [...this.cache.keys()])
     if(key.startsWith(dir+":"))this.cache.delete(key);
   }else this.cache.clear();
   this.onChange?.();
  }
  setPixel(dir,x,y,color,bone,redraw=true){
   if(!DIR.includes(dir)||!bounds(x,y))return false;
   const col=rgbaColor(color);if(!col)return false;
   const p=index(x,y),entries=new Map(this.state.pixels[dir].map(x=>[x[0],x]));
   entries.set(p,[p,...col]);this.state.pixels[dir]=[...entries.values()];
   if(bone&&this.bones.includes(bone)&&col[3]>0)this.setWeight(dir,x,y,bone,false);
   if(redraw)this.changed(dir);return true;
  }
  setWeight(dir,x,y,bone,redraw=true){
   if(!DIR.includes(dir)||!bounds(x,y)||!this.bones.includes(bone))return false;
   const p=index(x,y),entries=new Map(this.state.weights[dir].map(x=>[x[0],x]));
   entries.set(p,[p,bone]);this.state.weights[dir]=[...entries.values()];
   if(redraw)this.changed(dir);return true;
  }
  brush(dir,x,y,radius,tool,bone,color){
   const r=Math.max(0,Math.min(8,Math.floor(radius)));
   let count=0;
   for(let yy=Math.floor(y)-r;yy<=Math.floor(y)+r;yy++)
   for(let xx=Math.floor(x)-r;xx<=Math.floor(x)+r;xx++){
    if(!bounds(xx,yy)||(xx-x)**2+(yy-y)**2>r*r)continue;
    if(tool==="paint"||tool==="erase")
     count+=this.setPixel(dir,xx,yy,tool==="erase"?[0,0,0,0]:color,
       tool==="paint"?bone:null,false)?1:0;
    else if(tool==="weight")count+=this.setWeight(dir,xx,yy,bone,false)?1:0;
    else if(tool==="unweight")count+=this.setWeight(dir,xx,yy,"root",false)?1:0;
   }
   if(count)this.changed(dir);
   return count;
  }
  async init(){
   this.src=await this.rig.loadNativeArt();
   if(!this.src?.slots?.some(s=>!s.gender))throw Error("Original clothed V6B layers not found");
   this.rig.setManualLayerProvider((direction,emotion,faceLayers)=>this.layers(direction,emotion,faceLayers));
   return this;
  }
  makeCanvas(){
   const canvas=this.host.document.createElement("canvas");
   canvas.width=W;canvas.height=H;return canvas;
  }
  source(direction,emotion="neutral"){
   const dir=DIR.indexOf(direction),key=direction+":"+emotion;
   if(dir<0||!this.src)return null;
   if(this.baseCache.has(key))return this.baseCache.get(key);
   const canvas=this.makeCanvas(),ctx=canvas.getContext("2d",{willReadFrequently:true});
   const owner=new Int16Array(PIXELS);owner.fill(-1);
   const rank={};
   const colorCanvas=this.makeCanvas(),colorCtx=colorCanvas.getContext("2d",{willReadFrequently:true});
   for(const [order,part] of this.src.slots.entries()){
    if(part.gender)continue;
    colorCtx.clearRect(0,0,W,H);
    colorCtx.drawImage(part.image,
     part.expression?Math.max(0,this.src.emotions.indexOf(emotion))*W:0,dir*H,
     W,H,0,0,W,H);
    const rgba=colorCtx.getImageData(0,0,W,H).data;
    const bone=this.bones.indexOf(part.bone);
    if(bone<0)continue;
    for(let p=0;p<PIXELS;p++)if(rgba[p*4+3]>0)owner[p]=bone;
    rank[part.bone]=order;
    ctx.drawImage(colorCanvas,0,0);
   }
   const result={canvas,owner,color:ctx.getImageData(0,0,W,H),rank};
   this.baseCache.set(key,result);return result;
  }
  composite(direction,emotion="neutral"){
   const original=this.source(direction,emotion);
   if(!original)return null;
   const data=new Uint8ClampedArray(original.color.data);
   for(const row of this.state.pixels[direction])data.set(row.slice(1),row[0]*4);
   const canvas=this.makeCanvas();
   const ctx=canvas.getContext("2d");
   const im=ctx.createImageData(W,H);im.data.set(data);ctx.putImageData(im,0,0);
   return {canvas,data,owner:original.owner,rank:original.rank};
  }
  layers(direction,emotion="neutral",faceLayers={}){
   if(!DIR.includes(direction)||!this.src)return null;
   if(!this.state.pixels[direction].length&&!this.state.weights[direction].length)
    return null; // protected untouched art is drawn directly from V6B atlas
   const key=direction+":"+emotion+":"+JSON.stringify(faceLayers||{});
   if(this.cache.has(key))return this.cache.get(key);
   const dir=DIR.indexOf(direction),source=this.source(direction,emotion);
   const colors=new Map(this.state.pixels[direction].map(row=>[row[0],row.slice(1)]));
   const weights=new Map(this.state.weights[direction]);
   const pixelsToChange=new Set([...colors.keys(),...weights.keys()]);
   const parts=[],rank=source.rank;
   // Keep EVERY native art cutout and its original hidden, overlapping
   // pixels. Editing one pixel cannot flatten or destroy the other parts.
   for(const [order,part] of this.src.slots.entries()){
    if(part.gender)continue;
    const cv=this.makeCanvas(),ctx=cv.getContext("2d",{willReadFrequently:true});
    const partEmotion=faceLayers?.[part.bone]||emotion;
    ctx.drawImage(part.image,
     part.expression?Math.max(0,this.src.emotions.indexOf(partEmotion))*W:0,
     dir*H,W,H,0,0,W,H);
    const image=ctx.getImageData(0,0,W,H),rgba=image.data;
    for(const idx of pixelsToChange){
     const off=idx*4;
     rgba[off]=rgba[off+1]=rgba[off+2]=rgba[off+3]=0;
    }
    if(pixelsToChange.size)ctx.putImageData(image,0,0);
    parts.push({bone:part.bone,image:cv,order,kind:"source"});
   }
   // Only user-painted/weight-edited coordinates become override pixels.
   // The original transparent overlaps at shoulders, hips and face remain.
   const newData=new Map();
   for(const idx of pixelsToChange){
    const old=source.color.data.slice(idx*4,idx*4+4);
    const rgba=colors.get(idx)||old;
    if(!rgba[3])continue; // eraser removes only this coordinate
    const owner=weights.get(idx)||this.bones[source.owner[idx]]||"root";
    const bone=this.bones.includes(owner)?owner:"root";
    if(!newData.has(bone))newData.set(bone,new Uint8ClampedArray(PIXELS*4));
    newData.get(bone).set(rgba,idx*4);
   }
   for(const [bone,data] of newData){
    const cv=this.makeCanvas(),context=cv.getContext("2d");
    const image=context.createImageData(W,H);image.data.set(data);
    context.putImageData(image,0,0);
    // Render after the original layer owning that bone and before the
    // character's later foreground parts (eyes, fringe, near hand etc.).
    parts.push({bone,image:cv,order:(rank[bone]??-1)+.5,kind:"override"});
   }
   parts.sort((a,b)=>a.order-b.order);
   const output=parts.map(({bone,image})=>({bone,image}));
   this.cache.set(key,output);return output;
  }
 }
 let sharedPromise=null;
 function getSharedEditor(rig){
  if(!sharedPromise){
   sharedPromise=(async()=>{const editor=new Editor(rig);await editor.init();return editor;})()
    .catch(e=>{sharedPromise=null;throw e;});
  }
  return sharedPromise;
 }
 return Object.freeze({W,H,DIR,STORE,LIBRARY_STORE,FORMAT,blankState,normalizeState,Editor,getSharedEditor});
});
