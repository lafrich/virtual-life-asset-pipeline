/* Pixel Editor contract shared by browser and Node regression tests. */
(function(root,factory){"use strict";const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;if(root)root.VirtualLifePixelEdit=api;})(typeof window!=="undefined"?window:null,function(){"use strict";
const WIDTH=64,HEIGHT=112,REGION=Object.freeze([8,18,56,72]);
const ACTOR="legacy_otis",DIRECTIONS=Object.freeze(["se","sw","ne","nw"]);
const ACTIONS=Object.freeze(["idle","walk","sit","sit_type","sleep_seat","nap_stand","talk"]);
function key(action,direction,frame){if(!ACTIONS.includes(action)||!DIRECTIONS.includes(direction)||!Number.isInteger(frame)||frame<0||frame>5)throw Error("Invalid Otis frame");return action+"|"+direction+"|"+frame;}
function isEditable(x,y){return Number.isInteger(x)&&Number.isInteger(y)&&x>=REGION[0]&&x<REGION[2]&&y>=REGION[1]&&y<REGION[3];}
function validatePatch(p){
 if(!p||!["virtual-life-pixel-patch-v1","virtual-life-pixel-patch-v2"].includes(p.format)||p.actor!==ACTOR||
    (p.version!==1&&p.version!==2)||
    !Array.isArray(p.frame_size)||p.frame_size.join(",")!=="64,112"||
    !Array.isArray(p.region)||
    p.region.join(",")!==(p.version===2?"0,0,64,112":REGION.join(","))||
    !Array.isArray(p.frames)||
    p.frames.length>140)throw Error("Not an Otis 64×112 pixel patch");
 const seen=new Set();
 for(const item of p.frames){
  if(!item||typeof item.png!=="string"||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(item.png)||
      item.png.length>1000000)throw Error("Invalid PNG frame patch");
  const k=key(item.action,item.direction,item.frame);
  if(seen.has(k))throw Error("Duplicate frame "+k);seen.add(k);
 }
 return true;
}
function bresenham(x0,y0,x1,y1){
 const out=[],dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;
 let err=dx-dy;
 for(;;){out.push([x0,y0]);if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>-dy){err-=dy;x0+=sx;}if(e2<dx){err+=dx;y0+=sy;}}
 return out;
}
function flood(image,x,y,color,erase=false,region=REGION){
 const inside=(x,y)=>x>=region[0]&&y>=region[1]&&x<region[2]&&y<region[3];
 if(!inside(x,y))return false;
 const w=WIDTH,p=image.data,off=(x,y)=>(y*w+x)*4,start=off(x,y),target=Array.from(p.slice(start,start+4));
 const desired=erase?[0,0,0,0]:color;
 if(target.every((v,i)=>v===desired[i]))return false;
 const stack=[[x,y]],seen=new Uint8Array(w*HEIGHT);
 while(stack.length){const [cx,cy]=stack.pop();if(!inside(cx,cy))continue;const i=off(cx,cy),j=cy*w+cx;if(seen[j])continue;seen[j]=1;
  if(!target.every((v,t)=>p[i+t]===v))continue;
  for(let k=0;k<4;k++)p[i+k]=desired[k];
  stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
 }
 return true;
}

/* Rectangular 1-pixel-accurate selection primitives; always restrict transfers
   to the active semantic part so other body regions cannot be changed. */
function validBox(box,region){
 if(!Array.isArray(box)||!Array.isArray(region)||box.length!==4||region.length!==4||
  !box.every(Number.isInteger)||!region.every(Number.isInteger)||
  region[0]<0||region[1]<0||region[2]>WIDTH||region[3]>HEIGHT||
  region[0]>=region[2]||region[1]>=region[3]||
  box[0]<region[0]||box[1]<region[1]||box[2]>region[2]||box[3]>region[3]||
  box[0]>=box[2]||box[1]>=box[3])throw Error("Invalid pixel selection bounds");
}
function selectionRect(x0,y0,x1,y1,region=REGION){
 if(![x0,y0,x1,y1].every(Number.isInteger))throw Error("Invalid pixel selection points");
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(n,hi-1));
 const a=clamp(x0,region[0],region[2]),b=clamp(y0,region[1],region[3]);
 const c=clamp(x1,region[0],region[2]),d=clamp(y1,region[1],region[3]);
 const box=[Math.min(a,c),Math.min(b,d),Math.max(a,c)+1,Math.max(b,d)+1];
 validBox(box,region);return box;
}
function imageDataArray(image){
 if(!image||!image.data||image.data.length!==WIDTH*HEIGHT*4)throw Error("Invalid pixel frame");
 return image.data;
}
function movePixels(image,box,dx,dy,region=REGION){
 validBox(box,region);imageDataArray(image);
 if(!Number.isInteger(dx)||!Number.isInteger(dy))throw Error("Pixel movement must be integer");
 dx=Math.max(region[0]-box[0],Math.min(dx,region[2]-box[2]));
 dy=Math.max(region[1]-box[1],Math.min(dy,region[3]-box[3]));
 const before=image.data,after=new Uint8ClampedArray(before);
 const width=box[2]-box[0],height=box[3]-box[1],buffer=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const source=((box[1]+y)*WIDTH+(box[0]+x))*4;
  buffer.set(before.subarray(source,source+4),(y*width+x)*4);
  after.fill(0,source,source+4);
 }
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const target=((box[1]+dy+y)*WIDTH+(box[0]+dx+x))*4;
  after.set(buffer.subarray((y*width+x)*4,(y*width+x)*4+4),target);
 }
 return {data:after,box:[box[0]+dx,box[1]+dy,box[2]+dx,box[3]+dy],dx,dy};
}
function flipPixels(image,box,axis,region=REGION){
 validBox(box,region);imageDataArray(image);
 if(axis!=="horizontal"&&axis!=="vertical")throw Error("Invalid flip axis");
 const before=image.data,after=new Uint8ClampedArray(before);
 for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++){
  const from=(y*WIDTH+x)*4;
  const xx=axis==="horizontal"?box[0]+box[2]-1-x:x;
  const yy=axis==="vertical"?box[1]+box[3]-1-y:y;
  after.set(before.subarray(from,from+4),(yy*WIDTH+xx)*4);
 }
 return {data:after,box:box.slice()};
}

return Object.freeze({WIDTH,HEIGHT,REGION,ACTOR,DIRECTIONS,ACTIONS,key,isEditable,validatePatch,bresenham,flood,selectionRect,movePixels,flipPixels});
});