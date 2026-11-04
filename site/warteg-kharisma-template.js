/* Warteg Kharisma Bahari — Virtual Life Asset Pipeline authored starter template.
 * All four exteriors are code-drawn 2:1 isometric pixel sprites.
 * Uses the virtual-life-asset-pipeline street-material tones, not photo tracing.
 * 8x6 tiles, one floor, edit-friendly interior action slots. No backend writes.
 */
(function(g){
'use strict';
const W=8,D=6,DIRS=['sw','se','ne','nw'];
const P={
 green:['#1A6A3A','#22894A','#2A9A52','#4FB36B','#86E59A'],
 teal:['#154E4B','#1F7A55','#22984C','#35C46A','#86E59A'],
 yellow:['#6B5320','#B07A1C','#F2B530','#FFC93C','#FFE27A'],
 warm:['#B07A1C','#F2B530','#FFD166','#FFE27A','#FFF0C8'],
 red:['#7A2E35','#B8323A','#E0434A','#FF5A5F','#FF8AA2'],
 concrete:['#535969','#788197','#8D97A8','#A7B2C4','#C7CFDC'],
 white:['#8D97A8','#C7CFDC','#D2D5D9','#E7EBF2','#FFFFFF'],
 cream:['#9B866F','#C3AD8D','#D4C8AE','#E8DEC6','#F4EBDA'],
 glass:['#1C2330','#2E3B52','#4F6A86','#7A9FB2','#BFD8E4'],
 dark:['#15151F','#1C2330','#2A3242','#3A4458','#5A6577'],
 terracotta:['#6B4F3A','#9A6A3E','#C9692F','#E8894A','#F2A066'],
 wood:['#3D2A1E','#6B4F3A','#94704F','#B48455','#D49A5E']
};
const FONT={
 A:['010','101','111','101','101'],B:['110','101','110','101','110'],
 C:['011','100','100','100','011'],D:['110','101','101','101','110'],
 E:['111','100','110','100','111'],F:['111','100','110','100','100'],
 G:['011','100','101','101','011'],H:['101','101','111','101','101'],
 I:['111','010','010','010','111'],J:['001','001','001','101','010'],
 K:['101','101','110','101','101'],L:['100','100','100','100','111'],
 M:['101','111','111','101','101'],N:['101','111','111','111','101'],
 O:['010','101','101','101','010'],P:['110','101','110','100','100'],
 Q:['010','101','101','111','011'],R:['110','101','110','101','101'],
 S:['011','100','010','001','110'],T:['111','010','010','010','010'],
 U:['101','101','101','101','111'],V:['101','101','101','101','010'],
 W:['101','101','111','111','101'],X:['101','101','010','101','101'],
 Y:['101','101','010','010','010'],Z:['111','001','010','100','111'],
 ' ':['000','000','000','000','000'],'0':['111','101','101','101','111']
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function sprite(direction){
 const se=direction==='se'||direction==='nw',back=direction==='ne'||direction==='nw';
 const can=document.createElement('canvas');can.width=620;can.height=500;
 const ctx=can.getContext('2d',{alpha:true});ctx.imageSmoothingEnabled=false;
 const OX=290,OY=214;
 const color=(m,t=3)=>P[m][clamp(t,0,4)];
 function xy(a,b,z=0){
  const c=se?D-b:a,r=se?W-a:D-b;
  return [Math.round(OX+(c-r)*32),Math.round(OY+(c+r)*16-z)];
 }
 // Scanline fill, never Canvas path antialias or browser image interpolation.
 function poly(coords,m,t=3){
  const pts=coords.map(v=>xy(...v));
  const ymin=Math.max(0,Math.floor(Math.min(...pts.map(v=>v[1]))));
  const ymax=Math.min(can.height,Math.ceil(Math.max(...pts.map(v=>v[1]))));
  ctx.fillStyle=color(m,t);
  for(let y=ymin;y<ymax;y++){
   const intersections=[],yy=y+.5;
   for(let i=0;i<pts.length;i++){
    const p=pts[i],q=pts[(i+1)%pts.length];
    if((p[1]<=yy&&q[1]>yy)||(q[1]<=yy&&p[1]>yy))
     intersections.push(p[0]+(yy-p[1])*(q[0]-p[0])/(q[1]-p[1]));
   }
   intersections.sort((a,b)=>a-b);
   for(let i=0;i+1<intersections.length;i+=2){
    const a=Math.ceil(intersections[i]-.5),b=Math.ceil(intersections[i+1]-.5);
    if(b>a)ctx.fillRect(a,y,b-a,1);
   }
  }
 }
 function line(points,m,t=3){
  const p=points.map(v=>xy(...v));ctx.fillStyle=color(m,t);
  for(let i=1;i<p.length;i++){
   const [x0,y0]=p[i-1],[x1,y1]=p[i];
   let x=x0,y=y0,dx=Math.abs(x1-x0),dy=Math.abs(y1-y0);
   const sx=x0<x1?1:-1,sy=y0<y1?1:-1;let err=dx-dy;
   for(;;){
    ctx.fillRect(x,y,1,1);
    if(x===x1&&y===y1)break;
    const e=2*err;if(e>-dy){err-=dy;x+=sx;}if(e<dx){err+=dx;y+=sy;}
   }
  }
 }
 const top=(a,b,c,d,z,m,t=3)=>poly([[a,b,z],[c,b,z],[c,d,z],[a,d,z]],m,t);
 const front=(a,c,z0,z1,m,t=3,b=1.05)=>poly([[a,b,z0],[c,b,z0],[c,b,z1],[a,b,z1]],m,t);
 const side=(b,d,z0,z1,m,t=3,a=se?0:W)=>poly([[a,b,z0],[a,d,z0],[a,d,z1],[a,b,z1]],m,t);
 function text(str,a,z,m,t=4,scale=1,b=1.05){
  str=String(str).toUpperCase();const start=a-(str.length*4-1)*scale/64;
  for(let k=0;k<str.length;k++){
   const bits=FONT[str[k]]||FONT[' '];
   for(let j=0;j<5;j++)for(let i=0;i<3;i++)if(bits[j][i]==='1'){
    const x=start+(4*k+i)*scale/32,v=z+(4-j)*scale;
    front(x,x+scale/32,v,v+scale,m,t,b);
   }
  }
 }
 // Apron; floor/collision footprint is 8x6 native Semesta tiles.
 for(let a=0;a<W;a++)for(let b=0;b<D;b++){
  const mat=b===0?'terracotta':'concrete',tone=3+(a+b)%2;
  top(a,b,a+1,b+1,-2,mat,tone);
  line([[a,b,-1],[a+1,b,-1]],mat,tone-2);
  line([[a,b,-1],[a,b+1,-1]],mat,tone-2);
 }
 // Side and back walls. Side is a solid yellow plaster wall with green skirt.
 side(1.05,D,0,128,'yellow',2);
 side(1.05,D,0,21,'green',2);
 side(1.05,D,120,128,'teal',2);
 for(let b=1.8;b<D;b+=1.15)line([[se?0:W,b,22],[se?0:W,b,119]],'yellow',3);
 // Front main facade, no photography layer baked into the art.
 front(0,W,0,128,'yellow',3);
 if(back){
  front(0,W,0,24,'green',2);
  for(const a of [1.0,3.2,5.4]){
   front(a,a+1.25,36,92,'green',1);
   front(a+.1,a+1.15,43,85,'glass',2);
  }
 }else{
  // Front: 3 windows, green frame, open entrance and lettering.
  front(.16,1.0,0,96,'dark',1);
  front(0,.17,0,106,'white',3);
  front(1.13,4.88,22,109,'green',1);
  front(1.22,4.78,30,102,'glass',1);
  front(1.18,1.26,23,108,'teal',3);
  front(4.75,4.82,23,108,'teal',3);
  front(1.15,4.84,101,109,'teal',2);
  front(1.28,4.72,24,36,'teal',3);
  front(4.94,5.56,0,102,'dark',1);
  front(4.90,5.01,0,109,'green',2);
  front(5.50,5.61,0,109,'green',2);
  front(5.58,7.79,24,109,'green',2);
  front(5.68,7.69,32,102,'glass',1);
  front(5.62,7.73,102,109,'teal',3);
  for(const a of [1.39,2.45,3.56,4.6,5.88,6.78])front(a,a+.025,36,98,'green',1);
  front(1.28,4.72,86,88,'glass',3);
  text('WARTEG',2.98,79,'white',4,1);
  text('KHARISMA',3,60,'red',3,3);
  text('BAHARI',3,45,'red',4,2);
  text('SEDIA SOTO AYAM',3,27,'warm',3,1);
  // Right pane oval emblem / WKB.
  for(let j=0;j<24;j++){
   const aa=j*Math.PI*2/24,bb=(j+1)*Math.PI*2/24;
   line([[6.69+Math.cos(aa)*.72,1.03,69+Math.sin(aa)*10],
    [6.69+Math.cos(bb)*.72,1.03,69+Math.sin(bb)*10]],'warm',3);
  }
  text('WKB',6.68,66,'red',4,2);
  text('KHARISMA',6.68,49,'white',4,1);
 }
 for(const a of [0,1.08,4.90,5.56,7.85])front(a,a+.10,0,109,'green',3);
 front(0,W,110,128,'yellow',3);

 // Full two-plane corrugated metal roof. Both slopes extend PAST the wall
 // on every side. The right-hand fascia is a continuous solid strip, not
 // a shortened polygon that exposes the yellow side wall.
 const e=145,peak=180,rf=.62,rb=D+.54,roofL=-.44,roofR=W+.52;
 poly([[roofL,rf,e],[W/2,rf,peak],[W/2,rb,peak],[roofL,rb,e]],'dark',3);
 poly([[W/2,rf,peak],[roofR,rf,e],[roofR,rb,e],[W/2,rb,peak]],'dark',2);
 // Roof gable infill beneath the metal planes at the facade and rear.
 poly([[0,1.05,128],[W/2,1.05,peak-7],[W,1.05,128]],'cream',2);
 // Corrugated seams run the complete roof depth (including right eave).
 for(let a=roofL+.24;a<W/2;a+=.28){
  const z=e+(peak-e)*(a-roofL)/(W/2-roofL);
  line([[a,rf,z+1],[a,rb,z+1]],'concrete',a<W/2-.6?1:2);
 }
 for(let a=W/2+.19;a<roofR-.06;a+=.28){
  const z=e+(peak-e)*(roofR-a)/(roofR-W/2);
  line([[a,rf,z+1],[a,rb,z+1]],'dark',a>W+.15?3:1);
 }
 line([[W/2,rf,peak+1],[W/2,rb,peak+1]],'concrete',3);
 // Right eave: exposed 6px white soffit + green 3px edge, from front to
 // back. The right end is deliberately beyond the wall at a=W.
 poly([[roofR,rf,e],[roofR,rb,e],[roofR,rb,e-7],[roofR,rf,e-7]],'white',4);
 poly([[roofR,rf,e-7],[roofR,rb,e-7],[roofR,rb,e-10],[roofR,rf,e-10]],'green',2);
 // Continue the finish across the rear drip edge as well.
 poly([[W/2,rb,peak],[roofR,rb,e],[roofR,rb,e-4],[W/2,rb,peak-4]],'white',3);
 line([[roofR,rf,e],[roofR,rb,e]],'concrete',4);
 // Mint-green extended flat awning/lintel, essential photographic silhouette.
 top(-.16,.4,8.16,1.43,135,'teal',4);
 front(-.16,8.16,128,135,'teal',3,.4);
 for(let a=0;a<8;a+=.30)line([[a,.40,135],[a,1.43,135]],'green',3);
 front(0,W,120,128,'cream',4,.4);
 front(0,W,117,121,'teal',4,.4);
 for(const a of [1.0,3.4,5.90,7.18])line([[a,.43,117],[a,.43,128]],'concrete',2);
 // Crop native RGBA with even bounds; center-footprint ground pivot preserved.
 const data=ctx.getImageData(0,0,can.width,can.height).data;
 let x0=can.width,y0=can.height,x1=0,y1=0;
 for(let y=0;y<can.height;y++)for(let x=0;x<can.width;x++){
  if(data[(y*can.width+x)*4+3]===0)continue;
  x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);
 }
 if(x1<=x0||y1<=y0)throw Error('Empty warteg native pixel sprite: '+direction);
 if((x1-x0)%2)x1++;if((y1-y0)%2)y1++;
 const out=document.createElement('canvas');out.width=x1-x0;out.height=y1-y0;
 const oc=out.getContext('2d',{alpha:true});oc.imageSmoothingEnabled=false;
 oc.drawImage(can,x0,y0,out.width,out.height,0,0,out.width,out.height);
 const [px,py]=xy(W/2,D/2,0);
 return {url:out.toDataURL('image/png'),size:[out.width,out.height],pivot:[px-x0,py-y0]};
}
const placements=[
 ['shelf',0,0,'Rak Piring','browse'],
 ['shelf',2,0,'Rak Bumbu dan Minuman','browse'],
 ['fridge',6,0,'Kulkas Minuman','open'],
 ['counter',2,1,'Etalase Lauk','buy'],
 ['counter',4,1,'Etalase Lauk','buy'],
 ['cashier',5,2,'Kasir Warteg','sell'],
 ['stove',7,0,'Kompor Dapur','cook'],
 ['kitchen_sink',7,2,'Bak Cuci','wash'],
 ['table',1,3,'Meja Makan','browse'],
 ['table',4,3,'Meja Tambahan','browse'],
 ['chair',1,4,'Kursi Makan','sit'],
 ['chair',2,4,'Kursi Makan','sit'],
 ['chair',5,4,'Bangku Warteg','sit'],
 ['chair',7,4,'Bangku Samping','sit']
];
function create(model){
 if(!model?.create||!model?.add)throw Error('Interior model not ready');
 const config={
  name:'Warteg Kharisma Bahari',baseId:'semesta:large',kind:'warung',
  w:W,d:D,floors:1,windows:3,wall:'green',roof:'slate',
  roofShape:'gable',detail:'storefront',sign:'KHARISMA',front:'sw',
  actions:'enter,buy,sell,sit,cook,wash,browse',collision:'yes',
  doorStyle:'glass',windowStyle:'wide',balcony:'no',interactive:true
 };
 const scene=model.create(config,'warung');scene.theme='warteg';
 scene.notes='Warteg Bahari · modular layout · detailed warteg visual preset from Virtual Life Asset Pipeline v2';
 scene.entrance={c:3,r:5};
 for(const [assetId,c,r,name,actionId] of placements){
  const item=model.add(scene,assetId,c,r);
  if(!item)throw Error('Warteg furniture overlap: '+name+' at '+c+','+r);
  item.id='warteg-'+assetId+'-'+scene.items.length;
  item.name=name;model.action(scene,item.id,actionId);
 }
 const views={};for(const dir of DIRS)views[dir]=sprite(dir);
 const id='br-warteg-kharisma-'+Date.now().toString(36);
 const slots=model.slots(scene).map(s=>({...s,floor:1}));
 return {format:'virtual-life-building-asset-v1',id,name:config.name,
  config,views,editedViews:{},semestaBase:config.baseId,
  projection:{type:'iso-2:1',tilePixels:[64,32],groundCoordinates:'c/r',directions:DIRS},
  footprint:[W,D],entranceFacing:'sw',blocking:'yes',
  interactions:['enter','buy','sell','sit','cook','wash','browse'],
  interactive:true,enterable:true,
  entrance:{facing:'sw',groundFloor:1,entry:{...scene.entrance},exit:{...scene.entrance}},
  interior:{format:'virtual-life-interiors-v1',version:1,activeFloor:1,floors:[scene]},
  actionSlots:slots,assetPipeline:{repo:'lafrich/virtual-life-asset-pipeline',family:'warteg_kharisma',version:2},updatedAt:new Date().toISOString()};
}
g.VLWartegKharismaTemplate=Object.freeze({id:'warteg-kharisma-bahari',label:'Warteg Kharisma Bahari',footprint:[8,6],sourceVersion:'pipeline-v2',create,render:sprite});
})(window);
