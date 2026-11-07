/* Custom Wear: native V6B garment-pose inheritance.
   Four hand-painted IDLE F0 directions are the design source; all other
   actions retain native template silhouettes, pivot, shading and pose.
   This does not move body pixels or require animation-frame redraws. */
(function(root,factory){"use strict";const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.V6PCustomWear=api;})(typeof window!=="undefined"?window:null,function(root){
"use strict";
const TEMPLATES=Object.freeze({
 top:Object.freeze(["tee","tee_long","tee_graphic","shirt","shirt_tie","cardigan","cardigan_dots"]),
 pants:Object.freeze(["trousers","trousers_ripped","baggy","baggy_ripped"]),
 shoes:Object.freeze(["shoes","sneakers","boots","hightops"])
});
const DEFAULT=Object.freeze({top:"tee",pants:"trousers",shoes:"shoes"});
const DIRS=["se","sw","ne","nw"], FW=64,FH=112, BINS=64;
function selectedTemplate(row,kind){
 const candidate=row?.customWear?.[kind];
 return TEMPLATES[kind]?.includes(candidate)?candidate:DEFAULT[kind];
}
function layers(kind,body){
 if(!TEMPLATES[kind])throw Error("Invalid Custom Wear category");
 const f=body==="female"?"_f":"";
 if(kind==="top")return ["top/custom"+f,"top/custom_back"+f];
 return [kind+"/custom"+f];
}
function sourceFor(part,kind,template){return part.replace("/custom","/"+template);}
function isCustomPart(part){return /^(?:top\/custom(?:_back)?(?:_f)?|pants\/custom(?:_f)?|shoes\/custom(?:_f)?)$/.test(part||"");}
function directionsFor(part){
 // A top's "_back" layer is its occluded underlayer, not its rear-facing
 // sprite. Both physical layers have native sprites in every direction.
 return DIRS;
}
function same(a,b,i){return a[i]===b[i]&&a[i+1]===b[i+1]&&a[i+2]===b[i+2]&&a[i+3]===b[i+3]}
function rgb(a,i){return (a[i]<<16)|(a[i+1]<<8)|a[i+2]}
function putRGB(out,i,packed){out[i]=(packed>>>16)&255;out[i+1]=(packed>>>8)&255;out[i+2]=packed&255}
function paintRGB(bytes){
 return new Uint8ClampedArray(bytes);
}
function bounds(image,w=FW,h=FH){
 const d=image.data||image,points=[];
 let minX=w,minY=h,maxX=-1,maxY=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  if(d[(y*w+x)*4+3]<128)continue;
  points.push({x,y});if(x<minX)minX=x;if(x>maxX)maxX=x;
  if(y<minY)minY=y;if(y>maxY)maxY=y;
 }
 if(!points.length)return null;
 // Native garment mask determines material coordinates, not the body bbox.
 // Sleep/lie poses may turn the garment sideways.
 const horizontal=(maxX-minX)>1.5*(maxY-minY)&&maxX-minX>=9;
 let minV=1e5,maxV=-1e5;
 for(const p of points){
  const v=horizontal?p.x:p.y;
  if(v<minV)minV=v;if(v>maxV)maxV=v;
 }
 const bands=Array.from({length:BINS},()=>({min:1e5,max:-1e5,n:0}));
 function band(v){return Math.min(BINS-1,Math.max(0,Math.round((v-minV)/Math.max(1,maxV-minV)*(BINS-1))))}
 for(const p of points){
  const v=horizontal?p.x:p.y,u=horizontal?p.y:p.x,r=bands[band(v)];
  if(u<r.min)r.min=u;if(u>r.max)r.max=u;r.n++;
 }
 // Pixels may skip scanlines in sparse native art: use nearest occupied band.
 for(let i=0;i<BINS;i++)if(!bands[i].n){
  let closest=-1,dist=1e9;
  for(let j=0;j<BINS;j++)if(bands[j].n&&Math.abs(i-j)<dist){dist=Math.abs(i-j);closest=j}
  bands[i]=closest>=0?{...bands[closest]}:{min:0,max:0,n:0};
 }
 function uv(x,y){
  const v=horizontal?x:y,u=horizontal?y:x;
  const V=Math.min(1,Math.max(0,(v-minV)/Math.max(1,maxV-minV)));
  const r=bands[Math.min(BINS-1,Math.round(V*(BINS-1)))];
  return {u:Math.min(1,Math.max(0,(u-r.min)/Math.max(1,r.max-r.min))),v:V};
 }
 function point(U,V){
  const vNorm=Math.min(1,Math.max(0,V)),r=bands[Math.round(vNorm*(BINS-1))];
  const a=r.min+Math.min(1,Math.max(0,U))*(r.max-r.min),b=minV+vNorm*(maxV-minV);
  return horizontal?{x:Math.round(b),y:Math.round(a)}:{x:Math.round(a),y:Math.round(b)};
 }
 return {points,bands,horizontal,uv,point};
}
/* A dominant edit to one canonical clothing shade is a palette change.
   A smaller/non-uniform edit is a motif. We never infer global color from
   a tiny graphic and accidentally recolor the entire Tee. */
function paletteFromViews(views){
 const votes=new Map();
 for(const view of views){
  const src=view.source.data||view.source,edited=view.edited.data||view.edited;
  for(let i=0;i<src.length;i+=4){
   if(src[i+3]<128||edited[i+3]<128)continue;
   const key=rgb(src,i),value=rgb(edited,i);
   let row=votes.get(key);if(!row){row={total:0,colors:new Map()};votes.set(key,row)}
   row.total++;row.colors.set(value,(row.colors.get(value)||0)+1);
  }
 }
 const mapped=new Map();
 for(const [from,row] of votes){
  const ranked=[...row.colors.entries()].sort((a,b)=>b[1]-a[1]);
  const [to,count]=ranked[0]||[from,0];
  // Reject swatches/design details masquerading as a global palette.
  if(to!==from&&row.total>=5&&count/row.total>=0.58)mapped.set(from,to);
 }
 return mapped;
}
function detailsFromView(view,palette){
 const src=view.source.data||view.source,edited=view.edited.data||view.edited;
 const geom=bounds(src);
 if(!geom)return {geom:null,details:[],geometryChanges:0};
 const details=[];let geometryChanges=0;
 for(let i=0;i<src.length;i+=4){
  if(src[i+3]!==edited[i+3]){geometryChanges++;continue}
  if(src[i+3]<128||same(src,edited,i))continue;
  const mapped=palette.get(rgb(src,i));
  if(mapped===rgb(edited,i))continue; // Uniform color handled in all frames.
  const k=i/4,x=k%FW,y=Math.floor(k/FW);
  details.push({...geom.uv(x,y),rgb:rgb(edited,i),key:rgb(src,i)});
 }
 return {geom,details,geometryChanges};
}
function nearestMask(data,raw,x,y,key){
 let best=-1,score=Infinity;
 for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
  const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=FW||yy>=FH)continue;
  const i=(yy*FW+xx)*4;
  if(raw[i+3]<128)continue;
  const distance=dx*dx+dy*dy;
  const sameShade=rgb(raw,i)===key;
  const candidate=distance+(sameShade?0:1.8);
  if(candidate<score){score=candidate;best=i}
 }
 return best;
}
/* Pure pixel engine, shared by Node tests and browser compositor.
   Always paints only on pixels already occupied by the native target mask.
   The user-painted four IDLE directions remain exact; this function
   changes neither the native alpha/silhouette nor body motion. */
function renderPose(native,paintedSource,sourceBase,palette,opts={}){
 const raw=native.data||native,src=sourceBase.data||sourceBase;
 const out=paintRGB(raw);
 const target=opts.targetGeometry||bounds(raw);
 let changed=0,detailCount=0;
 for(let i=0;i<out.length;i+=4){
  if(raw[i+3]<128)continue;
  const mapped=palette.get(rgb(raw,i));
  if(mapped!==undefined&&mapped!==rgb(raw,i)){putRGB(out,i,mapped);changed++}
 }
 const detail=detailsFromView({source:src,edited:paintedSource},palette);
 if(target&&detail.geom){
  for(const mark of detail.details){
   const at=target.point(mark.u,mark.v);
   const index=nearestMask(out,raw,at.x,at.y,mark.key);
   if(index<0)continue;
   putRGB(out,index,mark.rgb);
   detailCount++;changed++;
  }
 }
 return {data:out,changed,details:detailCount,geometryChanges:detail.geometryChanges};
}
function extract(sheet,C,action,dir,frame){
 return sheet.getContext("2d",{willReadFrequently:true}).getImageData(
  ...Object.values(C.cellOrigin(action,dir,frame)).slice(0,4));
}
function stamp(sheet,C,action,dir,frame,data){
 const o=C.cellOrigin(action,dir,frame);
 sheet.getContext("2d",{willReadFrequently:true}).putImageData(
  new ImageData(new Uint8ClampedArray(data),FW,FH),o.x,o.y);
}
function snapshot(pixels){
 const c=document.createElement("canvas");c.width=FW;c.height=FH;
 c.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(pixels),FW,FH),0,0);
 return c.toDataURL("image/png");
}
/* Back-view repair for drafts created by the old editor:
   NE/NW were wrongly painted on top/custom_back, whose native sheet contains
   only a small occluded underlayer. Transfer those edits onto the actually
   visible main top/custom NE/NW source without replacing any existing art.
   The original back sheet remains untouched as the user's safety copy. */
async function migrateLegacyRear(id,ch,S,P,C,V){
 if(ch.top!=="custom")return {migrated:0};
 const row=S.get(id),template=selectedTemplate(row,"top");
 const ticket="native-main-rear-v2:"+template;
 const flag=ch.body==="female"?"topRearMainV2F":"topRearMainV2M";
 if(row?.customWear?.[flag]===ticket)return {migrated:0};
 const [mainPart,underPart]=layers("top",ch.body);
 const mainUrl=S.getPart(id,mainPart),underUrl=S.getPart(id,underPart);
 if(!mainUrl||!underUrl)return {migrated:0};
 const [mainSheet,underSheet,nativeMain,nativeUnder]=await Promise.all([
  P.loadSheetFromUrl(mainUrl),P.loadSheetFromUrl(underUrl),
  P.loadSheet(sourceFor(mainPart,"top",template)),P.loadSheet(sourceFor(underPart,"top",template))
 ]);
 const origMain=nativeMain,origUnder=nativeUnder;
 let moved=0,skipped=0,hasLegacyEdits=false;
 for(const dir of ["ne","nw"]){
  const oldMain=extract(mainSheet,C,"idle",dir,0);
  const baseMain=V.keysToDisplay(extract(origMain,C,"idle",dir,0),ch);
  const oldUnder=extract(underSheet,C,"idle",dir,0);
  const baseUnder=V.keysToDisplay(extract(origUnder,C,"idle",dir,0),ch);
  const mainData=oldMain.data,baseData=baseMain.data;
  const legacy=oldUnder.data,oldBase=baseUnder.data;
  const hasMainArt=mainData.some((value,i)=>value!==baseData[i]);
  const hasUnderArt=legacy.some((value,i)=>value!==oldBase[i]);
  if(!hasUnderArt)continue;
  hasLegacyEdits=true;
  if(hasMainArt){skipped++;continue} // Never overwrite a hand-drawn main rear view.
  const palette=paletteFromViews([{source:baseUnder,edited:oldUnder}]);
  const transferred=renderPose(baseMain,oldUnder,baseUnder,palette);
  let exact=0;
  // Some legacy designs were drawn outside the tiny native underlayer.
  // If a painted pixel already lands on the visible Tee mask, retain it
  // at that exact location rather than guessing a projection.
  for(let i=0;i<legacy.length;i+=4){
   if(oldBase[i+3]>=128||legacy[i+3]<128||baseData[i+3]<128)continue;
   transferred.data[i]=legacy[i];transferred.data[i+1]=legacy[i+1];transferred.data[i+2]=legacy[i+2];
   exact++;
  }
  if(transferred.changed||exact){
   stamp(mainSheet,C,"idle",dir,0,transferred.data);moved++;
  }
 }
 if(moved)S.setPart(id,mainPart,mainSheet.toDataURL("image/png"));
 // Remember the attempted migration, including drafts without legacy art:
 // a later native-rear edit must never be overwritten by old underlayer data.
 S.update(id,{customWear:{[flag]:ticket}});
 return {migrated:moved,skipped,legacy:hasLegacyEdits};
}
async function ensure(id,appearance,opts={}){
 const S=root?.V6PCharacterStore,P=root?.V6PPixelSource,C=root?.V6PPartCatalog,V=root?.V6PCompositor;
 if(!S||!P||!C||!V)throw Error("Custom Wear dependencies are missing");
 if(!S.get(id))throw Error("Create a character before editing custom clothing");
 const ch=V.norm({...appearance,characterId:id});
 const rows=[];
 for(const kind of Object.keys(TEMPLATES)){
  if(ch[kind]!=="custom" || opts.kind&&opts.kind!==kind)continue;
  const current=S.get(id),template=selectedTemplate(current,kind);
  for(const part of layers(kind,ch.body)){
   if(!C.isPart(part))throw Error("Missing Custom Wear part: "+part);
   if(S.getPart(id,part)){rows.push({part,template,created:false});continue}
   const stock=await P.loadSheet(sourceFor(part,kind,template));
   const g=stock.getContext("2d",{willReadFrequently:true}),original=g.getImageData(0,0,C.W,C.H);
   g.putImageData(V.keysToDisplay(original,ch),0,0);
   S.setPart(id,part,stock.toDataURL("image/png"));
   rows.push({part,template,created:true});
  }
 }
 if(ch.top==="custom"&&(!opts.kind||opts.kind==="top")&&opts.migrate!==false){
  const migrated=await migrateLegacyRear(id,ch,S,P,C,V);
  if(migrated.migrated)rows.push({part:layers("top",ch.body)[0],rearMigrated:migrated.migrated});
 }
 V.clearCache?.();return rows;
}
async function propagate(id,appearance,opts={}){
 const S=root?.V6PCharacterStore,P=root?.V6PPixelSource,C=root?.V6PPartCatalog,V=root?.V6PCompositor;
 if(!S||!P||!C||!V)throw Error("Custom Wear generator unavailable");
 const ch=V.norm({...appearance,characterId:id});
 await ensure(id,ch);
 const result={parts:[],frames:0,styled:0,details:0,manual:0,geometryChanges:0,warnings:[]};
 for(const kind of Object.keys(TEMPLATES)){
  if(ch[kind]!=="custom")continue;
  const row=S.get(id),template=selectedTemplate(row,kind),paths=layers(kind,ch.body);
  for(const part of paths){
   const origin=sourceFor(part,kind,template);
   const rawSheet=await P.loadSheet(origin);
   const saved=S.getPart(id,part);if(!saved)throw Error("Custom Wear source missing: "+part);
   const editedSheet=await P.loadSheetFromUrl(saved);
   const rawViews=[];
   for(const dir of directionsFor(part)){
    const original=extract(rawSheet,C,"idle",dir,0);
    const baseline=V.keysToDisplay(original,ch);
    const edited=extract(editedSheet,C,"idle",dir,0);
    rawViews.push({dir,source:baseline,raw:original,edited});
   }
   // The visible main Tee is the single four-direction design source.
   // The _back sheet is a native occluded seam layer: inherit its color
   // treatment from the visible Tee instead of making users draw it again.
   let pigmentViews=rawViews;
   if(kind==="top"&&part.includes("_back")){
    const mainPart=paths[0], mainRaw=await P.loadSheet(sourceFor(mainPart,kind,template));
    const mainSaved=await P.loadSheetFromUrl(S.getPart(id,mainPart));
    const mainViews=DIRS.map(dir=>({
     dir,source:V.keysToDisplay(extract(mainRaw,C,"idle",dir,0),ch),
     edited:extract(mainSaved,C,"idle",dir,0)
    }));
    pigmentViews=mainViews.concat(rawViews);
   }
   const palette=paletteFromViews(pigmentViews);
   const output=document.createElement("canvas");output.width=C.W;output.height=C.H;
   const g=output.getContext("2d",{willReadFrequently:true});g.imageSmoothingEnabled=false;
   // All custom layers are absolute RGB, including inactive/rear rows.
   // Never let stock palette-key magenta leak through the compositor.
   const rawAll=rawSheet.getContext("2d",{willReadFrequently:true}).getImageData(0,0,C.W,C.H);
   g.putImageData(V.keysToDisplay(rawAll,ch),0,0);
   const oldGenerated=["native-material-v1","native-material-v2"].includes(row.generated?.[part]?.engine);
   let styled=0,detailCount=0,manual=0,geometryChanges=0;
   for(const action of C.ACTIONS)for(const dir of directionsFor(part))for(let n=0;n<C.FRAMES[action];n++){
    const view=rawViews.find(x=>x.dir===dir);
    const edited=extract(editedSheet,C,action,dir,n);
    const native=extract(rawSheet,C,action,dir,n);
    const isMaster=action==="idle"&&n===0;
    if(isMaster){
     stamp(output,C,action,dir,n,view.edited.data);
     continue;
    }
    // Existing corrections are protected. Before first propagation, any
    // non-idle artwork different from the native cloned template is preserved.
    const base=V.keysToDisplay(native,ch);
    const changedBefore=edited.data.some((v,i)=>v!==base.data[i]);
    const corrected=S.shouldKeepCorrection?.(id,part,action,dir,n);
    if(corrected||(!oldGenerated&&changedBefore)){
     stamp(output,C,action,dir,n,edited.data);manual++;continue;
    }
    // Palette colors and projected motif pixels are layered directly on
    // the native rendered pose, preserving every original alpha pixel.
    const recolored=renderPose(base,view.edited,view.source,palette);
    // renderPose(base) preserves the native RGB mask and follows the
    // geometric correspondence of this particular pose.
    stamp(output,C,action,dir,n,recolored.data);
    if(recolored.changed){styled++;result.styled++;result.frames++}
    detailCount+=recolored.details;
    geometryChanges+=recolored.geometryChanges;
   }
   // Preserve all source views as independent 64x112 master art.
   for(const view of rawViews){
    const png=snapshot(view.edited.data);
    if(S.master(id,part,view.dir)!==png)S.setMaster(id,part,view.dir,png);
   }
   const done=output.toDataURL("image/png");
   S.setGenerated(id,part,done,{engine:"native-material-v2",template,
    propagatedFrames:styled,details:detailCount,protectedFrames:manual,geometryChanges});
   result.parts.push({part,template,frames:styled,details:detailCount,protectedFrames:manual,geometryChanges});
   result.details+=detailCount;result.manual+=manual;result.geometryChanges+=geometryChanges;
  }
 }
 if(result.geometryChanges)result.warnings.push("Siluet/alpha berubah di desain; animasi tetap menjaga siluet native.");
 V.clearCache?.();return result;
}
function changeTemplate(id,kind,template,opts={}){
 const S=root?.V6PCharacterStore,V=root?.V6PCompositor;
 if(!TEMPLATES[kind]?.includes(template))throw Error("Unknown wear template");
 if(!S?.get(id))throw Error("Character not found");
 if(opts.reset)for(const part of layers(kind,"male").concat(layers(kind,"female")))
  if(S.getPart(id,part))S.resetPart(id,part);
 S.update(id,{customWear:{[kind]:template}});V?.clearCache?.();
 return template;
}
return Object.freeze({TEMPLATES,DEFAULT,layers,selectedTemplate,sourceFor,isCustomPart,
 directionsFor,bounds,paletteFromViews,detailsFromView,renderPose,migrateLegacyRear,ensure,propagate,changeTemplate});
});
