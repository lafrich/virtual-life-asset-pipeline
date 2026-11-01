// Virtual Life - Nokia-style HP UI renderer. Pixel art, 1x logical px, scaled nearest-neighbour.
(function(){
'use strict';
// ---------------- palette ----------------
const P={
 out:'#14181F', body:'#3E4A5C', bodyL:'#56647B', bodyLL:'#6E7D94', bodyD:'#2E3746', bodyDD:'#232A36',
 rim:'#AEB4BB', rimL:'#D5D9DE', rimD:'#858B94',
 win:'#1B2028', winL:'#313946',
 lcd:'#8DA37D', lcdSh:'#7B906C', lcdEdge:'#76896A',
 key:'#BFC3C8', keyL:'#E4E7EA', keyD:'#8A9097', keyP:'#A2A7AE', keyTxt:'#262B33',
 blue:'#56C3F0', blueL:'#B4EBFF', blueD:'#2A82BE',
 green:'#2E9E4C', red:'#CF3A3A', plate:'#262E3B', logo:'#DCE1E7'
};
const LCD_PIX=['#55684F','#3A4A38','#1E2A1E','#121A12','#080D08']; // contrast levels
// ---------------- fonts ----------------
const F={
A:'.###.|#...#|#...#|#####|#...#|#...#|#...#',B:'####.|#...#|#...#|####.|#...#|#...#|####.',C:'.###.|#...#|#....|#....|#....|#...#|.###.',
D:'####.|#...#|#...#|#...#|#...#|#...#|####.',E:'#####|#....|#....|####.|#....|#....|#####',F:'#####|#....|#....|####.|#....|#....|#....',
G:'.###.|#...#|#....|#.###|#...#|#...#|.####',H:'#...#|#...#|#...#|#####|#...#|#...#|#...#',I:'###|.#.|.#.|.#.|.#.|.#.|###',
J:'...#|...#|...#|...#|...#|#..#|.##.',K:'#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',L:'#...|#...|#...|#...|#...|#...|####',
M:'#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',N:'#...#|#...#|##..#|#.#.#|#..##|#...#|#...#',O:'.###.|#...#|#...#|#...#|#...#|#...#|.###.',
P:'####.|#...#|#...#|####.|#....|#....|#....',Q:'.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',R:'####.|#...#|#...#|####.|#.#..|#..#.|#...#',
S:'.####|#....|#....|.###.|....#|....#|####.',T:'#####|..#..|..#..|..#..|..#..|..#..|..#..',U:'#...#|#...#|#...#|#...#|#...#|#...#|.###.',
V:'#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',W:'#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.',X:'#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
Y:'#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',Z:'#####|....#|...#.|..#..|.#...|#....|#####',
a:'....|....|.##.|...#|.###|#..#|.###',b:'#...|#...|###.|#..#|#..#|#..#|###.',c:'...|...|.##|#..|#..|#..|.##',
d:'...#|...#|.###|#..#|#..#|#..#|.###',e:'....|....|.##.|#..#|####|#...|.###',f:'.##|#..|###|#..|#..|#..|#..',
g:'....|....|.###|#..#|#..#|.###|...#|.##.',h:'#...|#...|###.|#..#|#..#|#..#|#..#',i:'#|.|#|#|#|#|#',j:'.#|..|.#|.#|.#|.#|.#|#.',
k:'#...|#...|#..#|#.#.|##..|#.#.|#..#',l:'#.|#.|#.|#.|#.|#.|.#',m:'.....|.....|####.|#.#.#|#.#.#|#.#.#|#.#.#',
n:'....|....|###.|#..#|#..#|#..#|#..#',o:'....|....|.##.|#..#|#..#|#..#|.##.',p:'....|....|###.|#..#|#..#|###.|#...|#...',
q:'....|....|.###|#..#|#..#|.###|...#|...#',r:'...|...|#.#|##.|#..|#..|#..',s:'....|....|.###|#...|.##.|...#|###.',
t:'.#.|.#.|###|.#.|.#.|.#.|..#',u:'....|....|#..#|#..#|#..#|#..#|.###',v:'.....|.....|#...#|#...#|.#.#.|.#.#.|..#..',
w:'.....|.....|#...#|#...#|#.#.#|#.#.#|.#.#.',x:'....|....|#..#|#..#|.##.|#..#|#..#',y:'....|....|#..#|#..#|#..#|.###|...#|.##.',
z:'....|....|####|...#|.##.|#...|####',
'0':'.##.|#..#|#..#|#..#|#..#|#..#|.##.','1':'.#.|##.|.#.|.#.|.#.|.#.|###','2':'.##.|#..#|...#|..#.|.#..|#...|####',
'3':'###.|...#|...#|.##.|...#|...#|###.','4':'..#.|.##.|#.#.|#.#.|####|..#.|..#.','5':'####|#...|###.|...#|...#|#..#|.##.',
'6':'.##.|#...|#...|###.|#..#|#..#|.##.','7':'####|...#|..#.|..#.|.#..|.#..|.#..','8':'.##.|#..#|#..#|.##.|#..#|#..#|.##.',
'9':'.##.|#..#|#..#|.###|...#|...#|.##.',
' ':'..','.':'.|.|.|.|.|.|#',',':'.|.|.|.|.|.|#|#',':':'.|.|#|.|.|#|.','-':'...|...|...|###|...|...|...',
'+':'.....|..#..|..#..|#####|..#..|..#..|.....','/':'..#|..#|.#.|.#.|.#.|#..|#..','(':'.#|#.|#.|#.|#.|#.|.#',')':'#.|.#|.#|.#|.#|.#|#.',
'!':'#|#|#|#|#|.|#','?':'.##.|#..#|...#|..#.|.#..|....|.#..','%':'##...|##..#|...#.|..#..|.#...|#..##|...##',
'*':'.....|#.#.#|.###.|#####|.###.|#.#.#|.....','#':'.#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.',
'>':'...|#..|.#.|..#|.#.|#..|...','<':'...|..#|.#.|#..|.#.|..#|...','=':'...|...|###|...|###|...|...',"'":'#|#|.|.|.|.|.',
'_':'....|....|....|....|....|....|....|####','·':'.|.|.|#|.|.|.'
};
const S={ // 3x5
'0':'###|#.#|#.#|#.#|###','1':'.#.|##.|.#.|.#.|###','2':'###|..#|###|#..|###','3':'###|..#|.##|..#|###','4':'#.#|#.#|###|..#|..#',
'5':'###|#..|###|..#|###','6':'###|#..|###|#.#|###','7':'###|..#|.#.|.#.|.#.','8':'###|#.#|###|#.#|###','9':'###|#.#|###|..#|###',
':':'.|#|.|#|.','/':'..#|..#|.#.|#..|#..','+':'...|.#.|###|.#.|...','-':'...|...|###|...|...','%':'#.#|..#|.#.|#..|#.#',' ':'..','.':'.|.|.|.|#',
a:'.#.|#.#|###|#.#|#.#',b:'##.|#.#|##.|#.#|##.',c:'.##|#..|#..|#..|.##',d:'##.|#.#|#.#|#.#|##.',e:'###|#..|##.|#..|###',f:'###|#..|##.|#..|#..',
g:'.##|#..|#.#|#.#|.##',h:'#.#|#.#|###|#.#|#.#',i:'###|.#.|.#.|.#.|###',j:'..#|..#|..#|#.#|.#.',k:'#.#|#.#|##.|#.#|#.#',l:'#..|#..|#..|#..|###',
m:'#.#|###|###|#.#|#.#',n:'##.|#.#|#.#|#.#|#.#',o:'.#.|#.#|#.#|#.#|.#.',p:'##.|#.#|##.|#..|#..',q:'.#.|#.#|#.#|##.|.##',r:'##.|#.#|##.|#.#|#.#',
s:'.##|#..|.#.|..#|##.',t:'###|.#.|.#.|.#.|.#.',u:'#.#|#.#|#.#|#.#|###',v:'#.#|#.#|#.#|#.#|.#.',w:'#.#|#.#|###|###|#.#',x:'#.#|#.#|.#.|#.#|#.#',
y:'#.#|#.#|.#.|.#.|.#.',z:'###|..#|.#.|#..|###'
};
function parse(src){const o={};for(const k in src){const rows=src[k].split('|');const w=Math.max(...rows.map(r=>r.length));o[k]={w,rows}}return o}
const FG=parse(F), SG=parse(S);
// ---------------- 1-bit icons ----------------
const BM=s=>s.split('|');
const ICON={
 dompet:BM('.#####.|#.....#|#...###|#...#.#|#...###|#.....#|.#####.'),
 skill:BM('...#...|..###..|#######|.#####.|..###..|.##.##.|.#...#.'),
 kursus:BM('##...##|#.#.#.#|#..#..#|#..#..#|#..#..#|##.#.##|..###..'),
 market:BM('#......|.######|.#...#.|.#####.|.#.....|..####.|..#..#.'),
 furnitur:BM('.......|.#####.|.#...#.|##...##|#######|#.....#|#.....#'),
 peta:BM('..###..|.#...#.|.#.#.#.|.#...#.|..#.#..|...#...|.#####.'),
 kontak:BM('..###..|.#...#.|.#...#.|..###..|.......|.#####.|#######'),
 profil:BM('#######|#.....#|#.#.###|#.#...#|#.#.###|#.....#|#######'),
 setting:BM('..#.#..|.#####.|##...##|.#...#.|##...##|.#####.|..#.#..'),
 house:BM('...#...|..###..|.#####.|#######|.#...#.|.#.#.#.|.#.#.#.'),
 cup:BM('.......|#####..|#...###|#...#.#|#...###|.###...|#####..'),
 office:BM('.#####.|.#.#.#.|.#####.|.#.#.#.|.#####.|.#.#.#.|.##.##.'),
 tree:BM('..###..|.#####.|#######|.#####.|..###..|...#...|..###..'),
 stall:BM('#######|#.#.#.#|#######|.#...#.|.#.#.#.|.#.#.#.|.#####.'),
 on:BM('.###.|#####|#####|#####|.###.'), off:BM('.###.|#...#|#...#|#...#|.###.'),
 avatar:BM('....######....|...#......#...|..#.##..##.#..|..#........#..|..#..#..#..#..|..#........#..|..#...##...#..|...#......#...|....######....|.....#..#.....|..##########..|.#..........#.|#............#|#............#')
};
const ITEMBM={
 sofa:BM('.##########.|.#........#.|##........##|#.########.#|#.#......#.#|############|#..........#|##........##|.#........#.'),
 meja:BM('............|############|#..........#|############|.#........#.|.#........#.|.#........#.|.#........#.|............'),
 tanaman:BM('....#..#....|.#..#.#..#..|..#.#.#.#...|...#####....|....###.....|..#######...|...#####....|...#####....|....###.....'),
 lampu:BM('...######...|..#......#..|.#........#.|.##########.|.....##.....|.....##.....|.....##.....|....####....|...######...'),
 kursi:BM('..########..|..#......#..|..#......#..|..#......#..|.##########.|.#........#.|.##########.|.#........#.|.#........#.'),
 rak:BM('############|#....#.....#|#.##.#.###.#|############|#.#.#....#.#|#.#.#.##.#.#|############|#..........#|##........##')
};
// ---------------- LCD 1-bit buffer ----------------
const LW=96, LH=64;
const lcd=new Uint8Array(LW*LH);
function cls(){lcd.fill(0)}
function ps(x,y,v=1){if(x>=0&&y>=0&&x<LW&&y<LH)lcd[y*LW+x]=v}
function fr(x,y,w,h,v=1){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)ps(i,j,v)}
function bm(rows,x,y,v=1,sc=1){rows.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(r[i]==='#')fr(x+i*sc,y+j*sc,sc,sc,v)})}
function tw(s,bold=false,G=FG){let w=0;for(const ch of s){const g=G[ch]||G['?']||G[' '];w+=g.w+1+(bold?1:0)}return Math.max(0,w-1)}
function tx(s,x,y,v=1,bold=false,G=FG,sc=1){for(const ch of s){const g=G[ch]||G['?']||G[' '];bm(g.rows,x,y,v,sc);if(bold)bm(g.rows,x+sc,y,v,sc);x+=(g.w+1+(bold?1:0))*sc}return x}
const stw=s=>tw(s,false,SG);
function stx(s,x,y,v=1){return tx(s.toLowerCase(),x,y,v,false,SG)}
function txR(s,xr,y,v=1,bold=false){tx(s,xr-tw(s,bold)+1,y,v,bold)}
function txC(s,y,v=1,bold=false,sc=1){tx(s,Math.floor((LW-tw(s,bold)*sc)/2),y,v,bold,FG,sc)}
function fit(s,maxw,bold){if(tw(s,bold)<=maxw)return s;while(s.length&&tw(s+'.',bold)>maxw)s=s.slice(0,-1);return s+'.'}
function dots(y,x0=0,x1=LW-1){for(let x=x0;x<=x1;x+=2)ps(x,y)}
function bar(x,y,w,h,frac,v=1){fr(x,y,w,1,v);fr(x,y+h-1,w,1,v);fr(x,y,1,h,v);fr(x+w-1,y,1,h,v);fr(x+1,y+1,Math.round((w-2)*Math.max(0,Math.min(1,frac))),h-2,v)}

// ---------------- game/example state ----------------
const ST={
 clock:null, // null = real time
 saldo:1250000, contrast:2, sound:true, vib:true, music:false,
 course:null, // {name,total,start}
 now:()=>ST.fakeNow!=null?ST.fakeNow:Date.now(), fakeNow:null,
 mark:-1
};
const rp=n=>'Rp '+n.toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.');
function clockStr(){if(ST.clock)return ST.clock;const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}

// ---------------- common chrome ----------------
function status(){ // y0..4
 for(let i=0;i<4;i++)fr(i*2,4-(i+1),1,i+2); // signal bars 2..5 px
 const c=clockStr(); stx(c,Math.floor((LW-stw(c))/2),0);
 fr(86,0,9,1);fr(86,4,9,1);fr(86,0,1,5);fr(94,0,1,5);fr(95,1,1,3);fr(88,2,5,1); // battery
}
function title(t,num){tx(fit(t,num?78:94,true),1,6,1,true); if(num)stx(num,LW-stw(num),8); dots(15)}
function soft(l,r){if(l)tx(l,1,56);if(r)txR(r,LW-1,56)}
function scrollbar(sel,n,y0=16,y1=51){for(let y=y0;y<=y1;y+=2)ps(94,y);const th=5;const t=n>1?Math.round(sel/(n-1)*(y1-y0+1-th)):0;fr(93,y0+t,3,th)}

// ---------------- screens ----------------
// A screen: {draw(), key(k)->bool, soft:[l,r]}
let stack=[]; let phoneOpen=true;
const top=()=>stack[stack.length-1];
function push(s){stack.push(s)} function pop(){if(stack.length>1)stack.pop()}
function home(){stack=[Standby()]}
function popTo(n){while(stack.length>n)stack.pop()}

function List(o){ // o:{title,num,items,rowH,y0,y1,soft,header(),onOpen(item,i)}
 const s={sel:0,top:0,...o};
 s.rowH=s.rowH||9; s.y0=s.y0??16; s.y1=s.y1??52;
 s.vis=()=>Math.floor((s.y1-s.y0+1)/s.rowH);
 s.draw=()=>{
  status(); title(s.title,(s.num!=null?s.num:'')+(s.items.length?(s.sel+1):''));
  if(s.header)s.header();
  const n=s.items.length,vis=s.vis();
  if(s.sel<s.top)s.top=s.sel; if(s.sel>=s.top+vis)s.top=s.sel-vis+1;
  for(let r=0;r<vis&&s.top+r<n;r++){
   const i=s.top+r,it=s.items[i],y=s.y0+r*s.rowH,sel=i===s.sel,v=sel?0:1;
   if(sel)fr(0,y,92,s.rowH,1);
   let x=2;
   if(s.numbered){tx(String(i+1),x,y+1,v);x+=7}
   if(it.icon){const I=ICON[it.icon];bm(I,x,y+(I.length<7?2:1),v);x+=I[0].length+3}
   const rt=typeof it.right==='function'?it.right():it.right;
   const rw=rt?tw(rt)+3:0;
   tx(fit(it.label,90-x-rw),x,y+1,v);
   if(rt)txR(rt,90,y+1,v);
   if(it.sub)tx(fit(it.sub,86-x),x,y+10,v);
   if(it.bar!=null){bar(x,y+11,52,5,it.bar,v);if(it.barTxt)stx(it.barTxt,x+56,y+11,v)}
  }
  if(!n)txC('(kosong)',30);
  scrollbar(s.sel,n||1,s.y0,s.y1);
  soft(...(s.soft||['Pilih','Kembali']));
 };
 s.key=k=>{
  const n=s.items.length;
  if(k==='U'){s.sel=(s.sel-1+n)%n;return true}
  if(k==='D'){s.sel=(s.sel+1)%n;return true}
  if((k==='OK'||k==='L')&&n){open(s,s.sel);return true}
  if(/^[1-9]$/.test(k)&&s.numKeys!==false){const i=+k-1;if(i<n){s.sel=i;open(s,i)}return true}
  if(k==='R'){pop();return true}
  return false;
 };
 function open(s,i){const it=s.items[i];if(it.open){const r=it.open();if(r)push(r)}else if(it.act)it.act();}
 return s;
}
function Text(o){ // o:{title,num,lines:[[text,bold]]|fn,soft,onL}
 const s={...o,off:0};
 s.draw=()=>{status();title(s.title,s.num);if(s.body)s.body();else{const L=s.lines;for(let i=0;i<L.length&&i<4;i++){const l=L[i];if(l)tx(fit(l[0],94,l[1]),1,17+i*9,1,!!l[1])}}soft(...(s.soft||['','Kembali']))};
 s.key=k=>{if(k==='R'){pop();return true}if((k==='L'||k==='OK')&&s.onL){s.onL();return true}if(s.k2)return s.k2(k);return false};
 return s;
}
function Msg(lines,back,okLabel='OK'){ // centered notice; OK pops `back` screens
 const s={};
 s.draw=()=>{status();const y0=Math.max(18,34-lines.length*5);lines.forEach((l,i)=>txC(l,y0+i*10,1,i===0));soft(okLabel,'')};
 s.key=k=>{if(k==='L'||k==='OK'||k==='R'){for(let i=0;i<back;i++)pop();return true}return false};
 return s;
}
function Confirm(q,lines,onYes){
 const s={};
 s.draw=()=>{status();txC(q,18,1,true);lines.forEach((l,i)=>txC(l,30+i*9));soft('Ya','Tidak')};
 s.key=k=>{if(k==='R'){pop();return true}if(k==='L'||k==='OK'){onYes();return true}return false};
 return s;
}
// ---- Standby
function skyline(x0,y0){ // 60x22 1-bit city
 const B=[[0,10,7],[8,4,9],[18,13,6],[25,7,8],[34,0,6],[41,9,9],[51,5,9]];
 for(const [x,y,w] of B){const h=22-y;fr(x0+x,y0+y,w,h);for(let j=y0+y+2;j<y0+21;j+=3)for(let i=x0+x+1;i<x0+x+w-1;i+=2)if(((i*7+j*3)%5)>1)ps(i,j,0)}
 fr(x0+36,y0-3,2,3);ps(x0+37,y0-5); // antenna
 // moon
 fr(x0-6,y0+22,72,1);
}
function Standby(){const s={};
 s.draw=()=>{
  // vertical signal (left) & battery (right) like Nokia standby
  bm(BM('#.#.#|.###.|..#..|..#..|..#..'),0,41);
  for(let i=0;i<5;i++)fr(0,34-i*7,1+Math.min(i,3),5);
  bm(BM('.#.|###|#.#|#.#|#.#|###'),93,40);
  for(let i=0;i<4;i++)fr(95-Math.min(i,3),34-i*7,1+Math.min(i,3),5);
  tx('VLife',8,1); // operator name (example)
  const c=clockStr(); txR(c,88,1,1,true);
  skyline(17,14);
  txC(rp(ST.saldo),41,1,true);
  soft('Menu','Tutup');
 };
 s.key=k=>{
  if(k==='L'||k==='OK'){push(MainMenu());return true}
  if(k==='R'){closePhone();return true}
  if(k==='CALL'){const m=MainMenu();m.sel=6;push(m);push(Kontak());return true}
  if(/^[1-9]$/.test(k)){const m=MainMenu();push(m);m.key(k);return true}
  return false};
 return s;}
// ---- Main menu
const MENU=[
 ['Dompet','dompet',()=>Dompet()],['Skill','skill',()=>Skill()],['Kursus Online','kursus',()=>Kursus()],
 ['Marketplace','market',()=>Market()],['Toko Furnitur','furnitur',()=>Furnitur()],['Peta','peta',()=>Peta()],
 ['Kontak','kontak',()=>Kontak()],['Profil','profil',()=>Profil()],['Pengaturan','setting',()=>Pengaturan()]];
function MainMenu(){return List({title:'Menu',num:'',numbered:true,items:MENU.map(([l,ic,f])=>({label:l,icon:ic,open:f}))})}
// ---- Dompet (example history)
const HIST=[['Gaji kerja','+75rb','+Rp 75.000','Kerja barista','Hari ini 09:40'],['Kursus','-300','-Rp 300','Basic Trading Course','Hari ini 08:15'],
 ['Sofa Biru','-450rb','-Rp 450.000','Toko Furnitur','Kemarin 20:02'],['Jual lampu','+80rb','+Rp 80.000','Marketplace','Kemarin 13:30'],['Gaji kerja','+75rb','+Rp 75.000','Kerja barista','Kemarin 10:00']];
function Dompet(){const l=List({title:'Dompet',num:'1-',y0:36,y1:53,items:HIST.map(h=>({label:h[0],right:h[1],open:()=>Text({title:h[0],num:'',lines:[[h[2],1],[h[3]],[h[4]],['(data contoh)']]})})),
  header:()=>{tx('Saldo',1,17);tx(rp(ST.saldo),1,26,1,true);dots(35)}});return l}
// ---- Skill (example data, total 350 = 120+60+170 like earlier mockups)
const SK=[['Trading',2,120,200],['Barista',1,60,100],['Coding',3,170,300],['Desain',1,0,100]];
function Skill(){return List({title:'Skill',num:'2-',rowH:18,items:SK.map(([n,lv,xp,mx])=>({label:n,right:'Lv'+lv,bar:xp/mx,barTxt:xp+'/'+mx,
 open:()=>Text({title:n,num:'Lv'+lv,body:()=>{tx('Level '+lv,1,17,1,true);bar(1,27,90,7,xp/mx);tx(xp+' / '+mx+' XP',1,36);tx('Naik lewat kursus',1,46)}})}))})}
// ---- Kursus Online (Basic Trading = brief data; others example)
const CR=[['Basic Trading',300,90,'+40 Trading XP'],['Barista Dasar',500,120,'+40 Barista XP'],['Coding Dasar',800,180,'+50 Coding XP'],['Desain Dasar',600,150,'+40 Desain XP']];
const mmss=t=>String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');
function Kursus(){return List({title:'Kursus Online',num:'3-',rowH:18,items:CR.map(c=>({label:c[0],sub:rp(c[1])+' · '+c[2]+' dtk',open:()=>KursusDetail(c)}))})}
function KursusDetail(c){return Text({title:c[0],num:'',lines:[[rp(c[1]),1],['Durasi '+c[2]+' detik'],[c[3]],['Belajar via HP']],soft:['Mulai','Kembali'],
 onL:()=>{if(ST.course&&!courseDone()){push(Progress());return}push(Confirm('Bayar?',[rp(c[1]),c[0]],()=>{ST.course={c,start:ST.now()};pop();push(Progress())}))}})}
function courseLeft(){return ST.course?Math.max(0,ST.course.c[2]-(ST.now()-ST.course.start)/1000):0}
function courseDone(){return ST.course&&courseLeft()<=0}
function Progress(){const s={};
 s.draw=()=>{status();const c=ST.course.c;title('Belajar','');
  if(courseDone()){txC('Selesai!',19,1,true);txC(c[0],30);txC(c[3],40,1,true);soft('OK','');return}
  tx(fit(c[0],94),1,17);const t=courseLeft();txC(mmss(Math.ceil(t)),27,1,true,2);bar(1,45,94,6,1-t/c[2]);soft('','Kembali')};
 s.key=k=>{if(courseDone()&&(k==='L'||k==='OK')){ST.course=null;popTo(3);return true}if(k==='R'){popTo(3);return true}return false};
 return s;}
// ---- Marketplace
const MK=[['Lampu Meja',80000,'Raka'],['Kursi Kayu',120000,'Theo'],['Poster Kota',35000,'Dita'],['Rak Buku',210000,'Raka']];
function Market(){return List({title:'Marketplace',num:'4-',numbered:true,items:[
 {label:'Beli',open:()=>List({title:'Beli',num:'4-1-',rowH:18,items:MK.map(m=>({label:m[0],right:Math.round(m[1]/1000)+'rb',sub:'oleh '+m[2],open:()=>MarketItem(m)}))})},
 {label:'Jual',open:()=>List({title:'Jual',num:'4-2-',y0:25,header:()=>{tx('Dari storage kamar:',1,16)},items:[['Kursi Kayu'],['Poster Kota'],['Tanaman']].map(j=>({label:j[0],open:()=>Harga(j[0])}))})},
 {label:'Listing Saya',open:()=>List({title:'Listing Saya',num:'4-3-',rowH:18,items:[['Lampu Meja','Aktif','Rp 80.000'],['Rak Kecil','Terjual','Rp 60.000']].map(l=>({label:l[0],right:l[1],sub:l[2],
   open:()=>Text({title:l[0],num:'',lines:[[l[2],1],['Status: '+l[1]],['Dilihat 12x'],['(data contoh)']]})}))})}]})}
function MarketItem(m){return Text({title:m[0],num:'',lines:[[rp(m[1]),1],['Penjual: '+m[2]],['Kondisi: baru'],['']],soft:['Beli','Kembali'],
 onL:()=>push(Confirm('Beli?',[m[0],rp(m[1])],()=>{pop();push(Msg(['Dibeli!','Dikirim ke','storage kamar'],2))}))})}
function Harga(name){const s={v:''};
 s.draw=()=>{status();title('Harga jual','');tx(fit(name,94),1,17);tx('Rp',1,30,1,true);const t=s.v.replace(/\B(?=(\d{3})+(?!\d))/g,'.');const x=tx(t,18,30,1,true);if((Math.floor(ST.now()/500)%2)===0||ST.fakeNow!=null)fr(x,29,1,9);dots(41,1,94);tx('Ketik angka',1,44);soft(s.v?'OK':'',s.v?'Hapus':'Kembali')};
 s.key=k=>{if(/^[0-9]$/.test(k)){if(s.v.length<9&&!(s.v===''&&k==='0'))s.v+=k;return true}
  if(k==='R'){if(s.v)s.v=s.v.slice(0,-1);else pop();return true}
  if((k==='L'||k==='OK')&&s.v){push(Msg(['Dipasang!',name,'Rp '+(+s.v).toLocaleString('id-ID')],2));return true}return false};
 return s;}
// ---- Toko Furnitur
const FU=[['Sofa Biru',450000,'sofa'],['Meja Kopi',150000,'meja'],['Kursi Kayu',120000,'kursi'],['Tanaman',60000,'tanaman'],['Lampu',90000,'lampu'],['Rak Buku',210000,'rak']];
function Furnitur(){return List({title:'Toko Furnitur',num:'5-',items:FU.map(f=>({label:f[0],right:Math.round(f[1]/1000)+'rb',open:()=>FurniturDetail(f)}))})}
function FurniturDetail(f){return Text({title:f[0],num:'',soft:['Beli','Kembali'],body:()=>{
  fr(0,17,28,20);fr(1,18,26,18,0);bm(ITEMBM[f[2]],2,18,1,2);
  tx(rp(f[1]),31,19,1,true);tx('Ukuran 2x1',31,29);
  tx('Dikirim ke',1,38);tx('storage kamar',1,47);},
 onL:()=>push(Confirm('Beli?',[f[0],rp(f[1])],()=>{pop();push(Msg(['Dibeli!','Dikirim ke','storage kamar'],2))}))})}
// ---- Peta
const LM=[['Rumah','house',12,20],['Kafe','cup',44,20],['Kantor','office',76,20],['Toko Furnitur','furnitur',12,41],['Taman','tree',44,41],['Pasar','stall',76,41]];
function Peta(){const s={sel:1};
 s.draw=()=>{status();const L=LM[s.sel];title(L[0],(s.sel+1)+'/'+LM.length);
  for(let y=16;y<=54;y++)for(let x=0;x<96;x++){if(((x%4)===0)&&((y%4)===2))ps(x,y)}
  fr(0,32,96,5,0);fr(0,32,96,1);fr(0,36,96,1);
  for(const rx of [29,61]){fr(rx,16,5,39,0);fr(rx,16,1,39);fr(rx+4,16,1,39)}
  for(let x=1;x<96;x+=4)ps(x,34); for(const rx of [29,61])for(let y=17;y<55;y+=4)ps(rx+2,y);
  LM.forEach((l,i)=>{fr(l[2]-2,l[3]-2,11,11,0);if(i===s.sel){fr(l[2]-2,l[3]-2,11,11,1);bm(ICON[l[1]],l[2],l[3],0)}else{bm(ICON[l[1]],l[2],l[3],1)}
   if(i===ST.mark){fr(l[2]+9,l[3]-2,1,6);fr(l[2]+10,l[3]-2,3,3)}});
  // player marker (blinks in prototype)
  if((Math.floor(ST.now()/400)%2)===0||ST.fakeNow!=null){fr(22,33,3,3);ps(23,32);ps(23,36);ps(21,34);ps(25,34)}
  soft(ST.mark===s.sel?'Hapus tanda':'Tandai','Kembali')};
 s.key=k=>{if(k==='U'){s.sel=(s.sel-1+LM.length)%LM.length;return true}if(k==='D'){s.sel=(s.sel+1)%LM.length;return true}
  if(/^[1-6]$/.test(k)){s.sel=+k-1;return true}
  if(k==='L'||k==='OK'){ST.mark=ST.mark===s.sel?-1:s.sel;return true}if(k==='R'){pop();return true}return false};
 return s;}
// ---- Kontak (example friends)
const KO=[['Raka',1,'Kafe'],['Dita',1,'Taman'],['Theodore',0,'2 jam lalu'],['Sinta',0,'Kemarin'],['Bima',1,'Kantor']];
function Kontak(){return List({title:'Kontak',num:'7-',items:KO.map(c=>({label:c[0],icon:c[1]?'on':'off',
 open:()=>Text({title:c[0],num:'',body:()=>{bm(ICON.avatar,1,18);tx(c[0],19,18,1,true);bm(ICON[c[1]?'on':'off'],19,29);tx(c[1]?'Online':'Offline',26,28);
   tx(c[1]?'Di: '+c[2]:'Terakhir: '+c[2],1,38);tx('Teman',1,47)}})}))})}
// ---- Profil (example)
function Profil(){return Text({title:'Profil',num:'8',body:()=>{bm(ICON.avatar,1,18);tx('Ichsan',19,18,1,true);tx('Total XP 350',19,28);tx(rp(ST.saldo),1,38);tx('Teman 5 · Kamar 3B',1,47)}})}
// ---- Pengaturan
function Pengaturan(){const tog=(k)=>({right:()=>ST[k]?'Aktif':'Mati',act:()=>{ST[k]=!ST[k]}});
 return List({title:'Pengaturan',num:'9-',numbered:true,items:[{label:'Suara',...tog('sound')},{label:'Getar',...tog('vib')},{label:'Musik',...tog('music')},
  {label:'Kontras',right:()=>String(ST.contrast+1),open:()=>Kontras()},{label:'Bahasa',right:'ID',act:()=>{}},{label:'Keluar game',open:()=>Confirm('Keluar?',['Kembali ke','layar judul'],()=>{pop()})}],soft:['Pilih','Kembali']})}
function Kontras(){const s={old:ST.contrast};
 s.draw=()=>{status();title('Kontras','9-4');txC('Atur dengan',19);txC('tombol atas/bawah',28);
  for(let i=0;i<5;i++){const x=18+i*12;fr(x,40,10,9);if(i>ST.contrast)fr(x+1,41,8,7,0)}soft('OK','Kembali')};
 s.key=k=>{if(k==='U'){ST.contrast=Math.min(4,ST.contrast+1);return true}if(k==='D'){ST.contrast=Math.max(0,ST.contrast-1);return true}
  if(k==='L'||k==='OK'){pop();return true}if(k==='R'){ST.contrast=s.old;pop();return true}return false};
 return s;}

// ---------------- input dispatch ----------------
function press(k){
 if(!phoneOpen){if(k==='OPEN'||k==='OK'||k==='L'){openPhone();}return}
 if(k==='END'){if(stack.length>1)home();else closePhone();return}
 top().key(k);
}
function openPhone(){phoneOpen=true;home()}
function closePhone(){phoneOpen=false}

// ---------------- phone body (pixel art) ----------------
const PW=244, PH=366;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function inRR(x,y,x0,y0,x1,y1,r){const px=x+.5,py=y+.5;if(px<x0||px>x1+1||py<y0||py>y1+1)return false;const cx=clamp(px,x0+r,x1+1-r),cy=clamp(py,y0+r,y1+1-r);return (px-cx)**2+(py-cy)**2<=r*r}
function inEl(x,y,cx,cy,rx,ry){const dx=(x+.5-cx)/rx,dy=(y+.5-cy)/ry;return dx*dx+dy*dy<=1}
function rot(fn,cx,cy,a){const c=Math.cos(-a),s=Math.sin(-a);return(x,y)=>{const dx=x+.5-cx,dy=y+.5-cy;return fn(Math.floor(cx+dx*c-dy*s),Math.floor(cy+dx*s+dy*c))}}
const waist=y=>Math.round(2.5*Math.sin(Math.PI*clamp((y-40)/290,0,1)));
const M_body=(x,y)=>{const w=waist(y);if(y<PH/2)return inRR(x,y,w,0,PW-1-w,PH+40,40);return inRR(x,y,w,-40,PW-1-w,PH-1,30)};
const yA=x=>{const d=(x+.5-PW/2)/114;return 202+30*Math.sqrt(Math.max(0,1-d*d))};
const M_A=(x,y)=>{const w=waist(y);return inRR(x,y,w+8,7,PW-9-w,PH,32)&&y<=yA(x)};
const yB=x=>{const d=(x+.5-PW/2)/108;return 183+7*Math.sqrt(Math.max(0,1-d*d))};
const M_B=(x,y)=>{const w=waist(y);return inRR(x,y,w+13,12,PW-14-w,PH,27)&&y<=yB(x)};
const M_win=(x,y)=>inRR(x,y,21,45,222,182,5);
const LCDX=26, LCDY=50;
// keys: id -> {m:mask, bb:[x0,y0,x1,y1]}
const KEYS={};
function defKey(id,m,bb,hit){KEYS[id]={m,bb,hit:hit||m}}
const NAVC=[122,209];
defKey('NAV',(x,y)=>inEl(x,y,122,209,36,17),[84,190,160,228]);
defKey('L',rot((x,y)=>inRR(x,y,24,196,76,213,8),50,204,0.22),[18,186,84,224]);
defKey('R',rot((x,y)=>inRR(x,y,168,196,220,213,8),194,204,-0.22),[160,186,226,224]);
defKey('CALL',(x,y)=>inRR(x,y,22,234,82,253,9),[20,232,84,255]);
defKey('END',(x,y)=>inRR(x,y,162,234,222,253,9),[160,232,224,255]);
const KP=[['1','oo'],['2','abc'],['3','def'],['4','ghi'],['5','jkl'],['6','mno'],['7','pqrs'],['8','tuv'],['9','wxyz'],['*','+'],['0','_'],['#','']];
const KPC=[];
KP.forEach((k,i)=>{const c=i%3,r=Math.floor(i/3);const cx=[50,122,194][c],cy=270+r*24+(c===1?3:0);const a=[0.12,0,-0.12][c];
 KPC.push([k[0],cx,cy]);defKey(k[0],rot((x,y)=>inEl(x,y,cx,cy,26,10.5),cx,cy,a),[cx-30,cy-14,cx+30,cy+14])});

let img=null, pressedKey=null;
function shadeMask(m,bb,base,lt,dk,opts={}){
 const [x0,y0,x1,y1]=bb;
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(!m(x,y))continue;
  let c=base; const inv=opts.inset;
  const tl=!m(x,y-1)||!m(x-1,y), br=!m(x,y+1)||!m(x+1,y);
  const tl2=!m(x,y-2)||!m(x-2,y), br2=!m(x,y+2)||!m(x+2,y);
  if(tl)c=inv?dk:lt;else if(br)c=inv?lt:dk;else if(opts.bev2&&tl2)c=inv?(opts.dk2||dk):(opts.lt2||lt);else if(opts.bev2&&br2)c=inv?(opts.lt2||lt):(opts.dk2||dk);
  put(x,y,c)}
 if(opts.outline)for(let y=y0-1;y<=y1+1;y++)for(let x=x0-1;x<=x1+1;x++){if(m(x,y))continue;if(m(x+1,y)||m(x-1,y)||m(x,y+1)||m(x,y-1))put(x,y,opts.outline)}
}
const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
let PB=null; // phone pixel buffer RGBA (PW+4)x(PH+4), offset 2
function put(x,y,c){x+=2;y+=2;if(x<0||y<0||x>=PW+4||y>=PH+4)return;const i=(y*(PW+4)+x)*4,[r,g,b]=typeof c==='string'?hex(c):c;PB[i]=r;PB[i+1]=g;PB[i+2]=b;PB[i+3]=255}
function rect(x,y,w,h,c){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)put(i,j,c)}
function pbm(rows,x,y,c){rows.forEach((r,j)=>{for(let i=0;i<r.length;i++)if(r[i]==='#')put(x+i,y+j,c)})}
function ptx(s,x,y,c,G=FG,bold=false){for(const ch of s){const g=G[ch]||G[' '];pbm(g.rows,x,y,c);if(bold)pbm(g.rows,x+1,y,c);x+=g.w+1+(bold?1:0)}return x}
const ptw=(s,G=FG,bold=false)=>{let w=0;for(const ch of s){const g=G[ch]||G[' '];w+=g.w+1+(bold?1:0)}return w-1};

function drawKey(id,pressed,label){
 const K=KEYS[id];const base=pressed?P.keyP:P.key;
 shadeMask(K.m,K.bb,base,pressed?P.keyD:P.keyL,pressed?P.keyL:P.keyD,{outline:P.out,inset:false});
 if(pressed){} // darker face already
 if(label)label(pressed?1:0);
}
function renderPhone(){
 PB=new Uint8ClampedArray((PW+4)*(PH+4)*4);
 const BB=[0,0,PW-1,PH-1];
 shadeMask(M_body,BB,P.body,P.bodyL,P.bodyDD,{outline:P.out,bev2:true,lt2:P.bodyLL,dk2:P.bodyD});
 // side specular stripe
 for(let y=60;y<300;y++){const w=waist(y);put(w+4,y,P.bodyL)}
 shadeMask(M_A,BB,P.rim,P.rimL,P.rimD,{});
 shadeMask(M_B,BB,P.body,P.bodyDD,P.bodyL,{inset:true});
 // earpiece slots
 for(let i=0;i<4;i++){rect(117,17+i*4,10,2,P.out);rect(118,19+i*4,8,1,P.bodyL)}
 // logo plate
 const L='NOKIA', lw=ptw(L,FG,true); const lx=Math.floor(PW/2-lw/2);
 rect(lx-4,33,lw+8,11,P.plate);rect(lx-4,44,lw+8,1,P.bodyL);ptx(L,lx,35,P.logo,FG,true);
 // window
 shadeMask(M_win,BB,P.win,P.out,P.winL,{inset:false});
 for(let y=LCDY-1;y<LCDY+129;y++)for(let x=LCDX-1;x<LCDX+193;x++)put(x,y,P.lcdEdge);
 // keys
 drawKey('L',pressedKey==='L',p=>{pbm(BM('#####'),45,203+p,P.keyTxt)});
 drawKey('R',pressedKey==='R',p=>{pbm(BM('#####'),194,203+p,P.keyTxt)});
 const np=pressedKey==='NAV'?pressedKey:null;
 const navP=['U','D','OK'].includes(pressedKey);
 drawKey('NAV',navP,()=>{});
 const p=navP?1:0;
 // nav details: up/down arrows, OK pill with blue light
 pbm(BM('...#...|..###..|.#####.'),119,194+(pressedKey==='U'?1:0),P.keyTxt);
 pbm(BM('.#####.|..###..|...#...'),119,221+(pressedKey==='D'?1:0),P.keyTxt);
 const okP=pressedKey==='OK';
 const M_ok=(x,y)=>inEl(x,y,122,209.5+(okP?1:0),17,6);
 shadeMask(M_ok,[100,198,144,222],okP?P.keyP:P.key,okP?P.keyD:P.keyL,okP?P.keyL:P.keyD,{outline:P.keyD});
 rect(110,208+(okP?1:0),24,2,okP?P.blueD:P.blue);rect(112,208+(okP?1:0),20,1,okP?P.blue:P.blueL);
 drawKey('CALL',pressedKey==='CALL',q=>pbm(BM('##.......|###......|.##......|..##.....|...##.###|....#####|.....###.'),48,240+q,P.green));
 drawKey('END',pressedKey==='END',q=>pbm(BM('..#######..|.#########.|###.....###|##.......##'),187,241+q,P.red));
 KP.forEach((k,i)=>{const [d,cx,cy]=KPC[i];drawKey(d,pressedKey===d,q=>{
   const sw=k[1]?stw(k[1]):0, dw=ptw(d), tot=dw+(sw?3+sw:0); let x=Math.round(cx-tot/2);
   ptx(d,x,cy-4+q,P.keyTxt); if(k[1]==='oo')pbm(BM('.#..#.|#.##.#|.####.'),x+dw+3,cy-1+q,P.keyTxt); else if(k[1]==='_')rect(x+dw+3,cy+2+q,5,1,P.keyTxt); else if(k[1])ptx(k[1],x+dw+3,cy-1+q,P.keyTxt,SG);
 })});
 // LCD: bg, drop-shadow, pixels (each LCD px = 2x2)
 rect(LCDX,LCDY,192,128,P.lcd);
 const pc=LCD_PIX[ST.contrast];
 for(let j=0;j<LH;j++)for(let i=0;i<LW;i++)if(lcd[j*LW+i])rect(LCDX+i*2+1,LCDY+j*2+1,2,2,P.lcdSh);
 for(let j=0;j<LH;j++)for(let i=0;i<LW;i++)if(lcd[j*LW+i])rect(LCDX+i*2,LCDY+j*2,2,2,pc);
 for(let x=LCDX;x<LCDX+192;x++)put(x,LCDY,P.lcdEdge); for(let y=LCDY;y<LCDY+128;y++)put(LCDX,y,P.lcdEdge);
 return new ImageData(PB,PW+4,PH+4);
}
// ---------------- HUD composition ----------------
const DEV={'844':{W:844,H:390},'667':{W:667,H:375}};
function lockIcon(ctx,cx,cy){const rows=BM('..###..|.#...#.|.#...#.|#######|###.###|###.###|#######');ctx.fillStyle='#10141B';ctx.fillRect(cx-5,cy-5,11,11);
 rows.forEach((r,j)=>{for(let i=0;i<7;i++)if(r[i]==='#'){ctx.fillStyle='#C99A2E';ctx.fillRect(cx-3+i,cy-3+j,1,1)}})}
function compose(ctx,dev,bg){
 const {W,H}=DEV[dev];
 ctx.imageSmoothingEnabled=false; ctx.clearRect(0,0,W,H); ctx.drawImage(bg,0,0);
 if(!phoneOpen){ // closed: normal HUD, HP button pulse ring as hint
  ctx.strokeStyle='#FFD166';ctx.lineWidth=1;ctx.strokeRect(W-104-21+.5,58-21+.5,42,46);return}
 ctx.fillStyle='rgba(6,8,12,0.62)';ctx.fillRect(0,0,W,H);
 // dim + lock on joystick, Tas, Action
 [[48,H-46],[W-117,H-33],[W-46,H-48]].forEach(([x,y])=>lockIcon(ctx,x,y));
 cls(); top().draw();
 const im=renderPhone();
 const ox=Math.floor((W-PW)/2)-2, oy=Math.floor((H-PH)/2)-2;
 const c2=document.createElement('canvas');c2.width=PW+4;c2.height=PH+4;c2.getContext('2d').putImageData(im,0,0);
 // soft drop shadow (pixel) under phone
 ctx.fillStyle='rgba(0,0,0,0.4)';for(let y=0;y<PH;y++){let a=-1,b=-1;for(let x=0;x<PW;x++)if(M_body(x,y)){if(a<0)a=x;b=x}if(a>=0)ctx.fillRect(ox+2+a+4,oy+2+y+4,b-a+1,1)}
 ctx.drawImage(c2,ox,oy);
 compose.origin=[ox+2,oy+2];
}
function hitTest(dev,x,y){ // canvas logical coords -> key id
 const {W,H}=DEV[dev];
 if(!phoneOpen){if(Math.abs(x-(W-104))<=22&&Math.abs(y-58)<=24)return 'OPEN';return null}
 const [ox,oy]=compose.origin||[0,0];const px=Math.floor(x-ox),py=Math.floor(y-oy);
 // nav key split
 if(KEYS.NAV.m(px,py)){if(inEl(px,py,122,209.5,19,7.5))return 'OK';return py<209?'U':'D'}
 for(const id in KEYS){if(id==='NAV')continue;const K=KEYS[id];const [a,b,c,d]=K.bb;if(px<a-2||px>c+2||py<b-2||py>d+2)continue;if(K.m(px,py))return id}
 return null;
}
window.VL={press,compose,hitTest,home,openPhone,closePhone,ST,DEV,PW,PH,KEYS,KPC,NAVC,LCDX,LCDY,
 setPressed:k=>{pressedKey=k}, isOpen:()=>phoneOpen, depth:()=>stack.length, reset:()=>{phoneOpen=true;home();ST.course=null;ST.mark=-1;ST.contrast=2;ST.sound=true;ST.vib=true;ST.music=false;pressedKey=null}};
home();
})();
