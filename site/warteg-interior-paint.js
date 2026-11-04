/* Warteg Kharisma Bahari: procedural 2:1 native-pixel interior decorations.
 * Authored in Virtual Life Asset Pipeline; also used by Bangun Ruang / Semesta.
 * Floor-plan objects remain selectable and independently editable. No actors baked.
 */
(function(g){
'use strict';
const V={green:['#1A6A3A','#22894A','#2A9A52','#4FB36B','#86E59A'],
 yellow:['#6B5320','#B07A1C','#F2B530','#FFC93C','#FFE27A'],
 cream:['#9B866F','#C3AD8D','#D4C8AE','#E8DEC6','#F4EBDA'],
 white:['#8D97A8','#C7CFDC','#D2D5D9','#E7EBF2','#FFFFFF'],
 steel:['#535969','#788197','#8D97A8','#A7B2C4','#C7CFDC'],
 glass:['#1C2330','#2E3B52','#4F6A86','#7A9FB2','#BFD8E4'],
 dark:['#15151F','#1C2330','#2A3242','#3A4458','#5A6577'],
 red:['#7A2E35','#B8323A','#E0434A','#FF5A5F','#FF8AA2'],
 orange:['#9A6A3E','#D9682A','#FF9440','#FFB394','#FFD0A8'],
 wood:['#3D2A1E','#6B4F3A','#94704F','#B48455','#D49A5E']};
const col=(k,t=3)=>V[k][Math.max(0,Math.min(4,t))];
const glyph={
 A:['010','101','111','101','101'],B:['110','101','110','101','110'],
 D:['110','101','101','101','110'],E:['111','100','110','100','111'],
 H:['101','101','111','101','101'],I:['111','010','010','010','111'],
 K:['101','101','110','101','101'],M:['101','111','111','101','101'],
 R:['110','101','110','101','101'],S:['011','100','010','001','110'],
 T:['111','010','010','010','010'],W:['101','101','111','111','101'],
 ' ':['000','000','000','000','000']};
function walls(ctx,geo,api){
 const {point,polygon,line,box}=api,at=(a,b,z)=>point(geo,a,b,z);
 const face=(corners,color)=>polygon(ctx,corners.map(v=>at(...v)),color);
 // Low saffron ceramic tile course along both rear walls.
 face([[0,0,0],[geo.w,0,0],[geo.w,0,49],[0,0,49]],col('yellow',3));
 face([[0,0,0],[0,geo.d,0],[0,geo.d,49],[0,0,49]],col('yellow',2));
 for(let c=1;c<geo.w;c++){
  line(ctx,...at(c,0,3),...at(c,0,49),col('yellow',2));
 }
 line(ctx,...at(0,0,50),...at(geo.w,0,50),col('green',3));
 line(ctx,...at(0,0,50),...at(0,geo.d,50),col('green',3));
 // Long green shelf with packets/cups against the rear wall.
 face([[.65,0,56],[geo.w-.35,0,56],[geo.w-.35,0,60],[.65,0,60]],col('green',2));
 const packet=['red','yellow','orange','green','red','cream','yellow','green','red','orange'];
 for(let i=0;i<packet.length;i++){
  const c=.83+i*.64,h=10+(i%3)*3,k=packet[i];
  face([[c,0,60],[c+.38,0,60],[c+.38,0,60+h],[c,0,60+h]],col(k,2+(i%2)));
  line(ctx,...at(c+.07,0,60+h-3),...at(c+.30,0,60+h-3),col('white',3));
 }
 // Photo/menu strip close to the top of the wall (mosaic silhouettes, not portraits).
 for(let i=0;i<10;i++){
  let c=.32+i*.7;
  face([[c,0,105],[c+.56,0,105],[c+.56,0,116],[c,0,116]],col('dark',1));
  face([[c+.04,0,107],[c+.52,0,107],[c+.52,0,114],[c+.04,0,114]],col(['orange','wood','green','red'][i%4],2));
  line(ctx,...at(c+.12,0,110),...at(c+.40,0,110),col('white',3));
 }
 // Left wall: WKB identity + hand-painted menu board.
 face([[0,.9,69],[0,3.1,69],[0,3.1,116],[0,.9,116]],col('dark',1));
 face([[0,1.04,77],[0,2.98,77],[0,2.98,81],[0,1.04,81]],col('green',2));
 const pixelText=(str,r,z,material)=>{
  const bits=String(str).toUpperCase().split('');
  let offset=r;
  for(const letter of bits){
   const pat=glyph[letter]||glyph[' '];
   for(let row=0;row<5;row++)for(let bit=0;bit<3;bit++)if(pat[row][bit]==='1'){
    face([[0,offset+bit*.04,z+(4-row)*1.12],
     [0,offset+(bit+1)*.04,z+(4-row)*1.12],
     [0,offset+(bit+1)*.04,z+(5-row)*1.12],
     [0,offset+bit*.04,z+(5-row)*1.12]],col(material,4));
   }
   offset+=.16;
  }
 };
 pixelText('WKB',1.65,93,'red');
 pixelText('BAHARI',1.39,83,'white');
 // Additional tiny wall signs, colored stickers.
 for(let i=0;i<4;i++){
  face([[0,3.5+i*.5,99],[0,3.85+i*.5,99],[0,3.85+i*.5,113],[0,3.5+i*.5,113]],col(['green','yellow','orange','red'][i],2));
 }
 // Wall clock composed from original 1x points, no antialias.
 const clock=(c,r,z,rad=8)=>{
  const cx=at(c,r,z),pts=[];
  for(let i=0;i<24;i++){
   const t=i*Math.PI/12;
   pts.push([Math.round(cx[0]+Math.cos(t)*rad),Math.round(cx[1]+Math.sin(t)*rad)]);
  }
  polygon(ctx,pts,col('white',4));
  for(let i=0;i<pts.length;i++)line(ctx,...pts[i],...pts[(i+1)%pts.length],col('dark',2));
  line(ctx,cx[0],cx[1],cx[0],cx[1]-5,col('dark',2));
  line(ctx,cx[0],cx[1],cx[0]+4,cx[1]+2,col('dark',2));
 };
 clock(4.4,-.012,88,7);
 // Ceiling fan: three solid flat blades, no blur/glow.
 const fan=at(3.1,1.05,108);
 const blades=[[[-21,-6],[-6,-3],[-5,0],[-23,-2]],[[3,-19],[6,-4],[2,3],[-1,-18]],[[4,2],[23,7],[23,11],[2,5]]];
 for(const b of blades)polygon(ctx,b.map(([x,y])=>[Math.round(fan[0]+x),Math.round(fan[1]+y)]),col('cream',3));
 ctx.fillStyle=col('steel',2);ctx.fillRect(Math.round(fan[0]-3),Math.round(fan[1]-3),6,6);
 // Simple pendant lamps and kitchen wall ventilation.
 for(const c of [1,6.7]){
  const p=at(c,.24,117);line(ctx,p[0],p[1],p[0],p[1]+9,col('steel',3));
  ctx.fillStyle=col('white',4);ctx.fillRect(Math.round(p[0]-2),Math.round(p[1]+9),5,3);
 }
}
function fixture(ctx,geo,item,api){
 const {fixtureBox,box,point,line,polygon}=api,kind=item.assetId;
 const B=(a,b,w,d,z0,z1,mat)=>{
  const p=fixtureBox(item,a,b,w,d);
  box(ctx,geo,p.c,p.r,p.w,p.d,z0,z1,mat);
 };
 const p=(a,b,z)=>{const loc=api.fixturePoint(item,a,b);return point(geo,loc.c,loc.r,z)};
 const L=(a,b,z,c,d,z2,color)=>line(ctx,...p(a,b,z),...p(c,d,z2),col(color,3));
 if(kind==='counter'){
  // Stainless buffet and individual ready-to-eat lauk trays behind glass.
  B(.06,.08,1.88,.82,25,30,'steel');
  const foods=['green','orange','wood','yellow','red','wood'];
  for(let i=0;i<6;i++){
   const a=.12+(i%3)*.60,b=.17+Math.floor(i/3)*.34;
   B(a,b,.48,.25,30,32,'steel');
   const food=foods[i],loc=api.fixtureBox(item,a+.04,b+.05,.40,.15);
   polygon(ctx,[
    point(geo,loc.c,loc.r,33),point(geo,loc.c+loc.w,loc.r,33),
    point(geo,loc.c+loc.w,loc.r+loc.d,33),point(geo,loc.c,loc.r+loc.d,33)
   ],col(food,2+i%2));
  }
  // Four posts, top rail and back glass edge, with no opaque pane.
  for(const a of [.08,.72,1.34,1.91]){
   L(a,.12,30,a,.12,56,'steel');
   L(a,.89,30,a,.89,56,'steel');
  }
  L(.08,.12,56,1.91,.12,56,'white');
  L(.08,.89,56,1.91,.89,56,'glass');
  L(.08,.12,56,.08,.89,56,'glass');
  L(1.91,.12,56,1.91,.89,56,'glass');
 } else if(kind==='sofa'||kind==='chair'){
  const w=kind==='sofa'?2:1;
  B(.12,.24,w-.24,.52,10,19,'green');
  B(.13,.08,w-.26,.15,17,30,'green');
  B(.10,.21,w-.20,.55,19,21,'green');
 } else if(kind==='table'){
  B(.06,.08,1.88,.84,24,27,'cream');
  B(.07,.1,1.86,.78,27,28,'green');
  // Tissue, spoons and condiment bottles.
  B(.62,.31,.3,.28,28,36,'white');
  B(1.08,.26,.12,.12,28,38,'red');
  B(1.34,.26,.12,.12,28,36,'yellow');
 } else if(kind==='shelf'){
  // Small snack packets in contrasting palette-matched tones.
  for(let z of [14,29,45])for(let j=0;j<5;j++){
   B(.12+j*.35,.26,.25,.37,z,z+9,['red','yellow','green','orange','cream'][j]);
  }
 } else if(kind==='fridge'){
  B(.09,.12,.82,.78,9,50,'white');
  B(.17,.70,.68,.04,15,45,'glass');
  for(let z of [16,27,38])for(let i=0;i<3;i++)
   B(.26+i*.18,.61,.10,.08,z,z+7,['green','red','orange'][i]);
 } else if(kind==='stove'){
  B(.12,.1,.76,.77,27,31,'steel');
  B(.2,.2,.58,.5,32,35,'steel');
  B(.26,.26,.46,.37,35,41,'steel');
  B(.36,.35,.25,.22,41,43,'white');
 } else if(kind==='cashier'){
  // Trays, plates and sauces on the service area.
  for(let j=0;j<4;j++)B(.20+j*.28,.5,.19,.17,29,31,'white');
  for(let j=0;j<3;j++)B(1.32+j*.16,.36,.12,.13,29,37,['red','yellow','green'][j]);
 } else if(kind==='kitchen_sink'){
  B(.13,.13,.73,.69,25,28,'steel');
  L(.60,.35,28,.60,.35,41,'steel');
  L(.60,.35,41,.38,.40,41,'steel');
 }
}
g.VLWartegInteriorArt=Object.freeze({source:'virtual-life-asset-pipeline',version:2,walls,fixture});
})(window);
