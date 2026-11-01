import os,json,pickle,base64,io,math
from PIL import Image
import ui,build
from ui import *
OUT=build.OUT
def save(name,im):
    im=im.convert('RGB'); im.save(f'{OUT}/1x_native/{name}.png')
    im.resize((im.width*2,im.height*2),Image.NEAREST).save(f'{OUT}/{name}.png')
    im.resize((im.width*3,im.height*3),Image.NEAREST).save(f'{OUT}/3x/{name}.png')
# ---------- components sheet ----------
W,H=844,600
im=Image.new('RGBA',(W,H),C['floor']); d=D(im)
def lab(x,y,s): text(d,x,y,s,C['grey'],10,True)
text(d,10,6,'KOMPONEN UI · Pixel XP (1x native)',C['paper'],12,True)
lab(10,26,'1 Window frame (hanya X)')
window(im,10,40,250,120,'Judul Window','bag'); text(d,20,72,'Isi window (#ECE9D8)','#000',11)
lab(270,26,'2 Tombol X: normal / hover / pressed')
for i,s in enumerate(['normal','hover','pressed']): rbox(d,270+i*30-3,40-3,27,27,fill=C['xpblue']); close_btn(im,270+i*30,40,s)
lab(270,74,'3 XP button: normal / hover / default / pressed / disabled')
for i,s in enumerate(['normal','hover','default','pressed','disabled']): button(im,270+i*78,90,72,23,['Kerja','Ngobrol','Pakai','Buang','Simpan'][i],state=s)
button(im,270,120,110,24,'Dengan ikon',ic='check',state='default')
lab(10,170,'4 Progress bar (XP blok)')
for i,f in enumerate([0.25,0.6,1.0]): progress(im,10,186+i*18,250,12,f)
progress(im,10,240,250,10,0.5,col='#316AC5',hi='#7FA7E6',lo='#21509F')
lab(270,156,'5 Need bar: Hunger / Hygiene / Bladder / Energy')
for i,(ic,f,c) in enumerate([('hunger',.7,C['amber']),('hygiene',.45,C['sky']),('bladder',.25,'#F5D547'),('energy',.8,C['green'])]): need_bar(im,270+i*90,172,ic,f,c)
lab(270,200,'6 Item slot: kosong / item / stack / unik / terpilih')
slot(im,270,216,44,empty=True); slot(im,320,216,44,'key'); slot(im,370,216,44,'coffee',3); slot(im,420,216,44,'vase',tag='Unik'); slot(im,470,216,44,'food',2,sel=True)
lab(530,200,'7 Tab strip')
tabs(im,530,216,['Beli','Jual','Listing'],0,w=70,pw=300,ph=30)
lab(10,262,'8 List row: normal / alt / terpilih / disabled')
for i,(sel,alt,dis) in enumerate([(0,0,0),(0,1,0),(1,0,0),(0,0,1)]):
    row(im,10,278+i*22,400,22,[(8,('icon','coin'),{}),(30,'Baris list',{}),(390,'Rp 1.250.000',{'r':True,'b':True})],sel=sel,alt=alt,dis=dis)
lab(430,262,'9 Toast / balloon')
balloon(im,430,278,200,46,'Tas Penuh','Barang tetap di lokasi.',ic='bag')
lab(650,262,'10 Groupbox')
rbox(d,646,276,190,70,fill=C['xpface']); groupbox(im,650,280,180,60,'Suara')
lab(10,372,'11 Tombol bulat HUD: Action / Tas / HP / disabled / Cancel')
round_btn(im,40,420,30,'hand','green','Action'); round_btn(im,110,426,22,'bag','blue','Tas'); round_btn(im,165,426,18,'phone','blue','HP'); round_btn(im,220,420,30,'hand','grey','off',grey=True); round_btn(im,280,426,20,'cancel','red','Cancel')
lab(330,372,'12 HUD: kartu avatar / saldo / minimap / joystick')
avatar_card(im,330,388,build.PORT,'Ichsan','Lv. 4',.55); money_pill(im,490,388,'Rp 1.250.000'); minimap(im,620,388,60); joystick(im,740,420,34)
lab(10,472,'13 Label dunia (gaya game): nameplate / prompt / chip')
nameplate(im,60,490,'Barista','NPC profesi'); prompt(im,170,494,'Bicara'); chip(im,240,494,'Minum','coffee')
lab(330,472,'14 Ikon 16px (dipakai 1x / 2x)')
for i,k in enumerate(list(ICONS)[:52]): icon(im,k,330+(i%26)*19,490+(i//26)*20)
lab(10,540,'15 Palet')
pal=[('#0831D9','Luna dark'),('#0A5FE8','Luna'),('#4C96FF','Luna light'),('#ECE9D8','XP face'),('#003C74','Btn border'),('#7F9DB9','Edit border'),('#316AC5','Seleksi'),('#E35A2F','Close'),('#3C9A3C','Start/Action'),('#0F8DEB','Tray'),('#10141B','Game floor'),('#C99A2E','Brass'),('#FFD166','Glow'),('#E7EBF2','Paper')]
for i,(h,n) in enumerate(pal):
    x=10+i*59; d.rectangle([x,556,x+54,572],fill=h,outline='#5A6577'); text(d,x,575,h,C['paper'],8); text(d,x,585,n,C['grey'],8)
save('09_components',im)
# ---------- flow ----------
W,H=844,390
im=Image.new('RGBA',(W,H),C['floor']); d=D(im)
window(im,8,8,W-16,H-16,'Flow Utama Pemain','star')
steps=[('house','Mulai di kamar'),('map','Jelajah kota'),('talk','Bicara NPC'),('box','Kerja'),('coin','Uang & XP'),('phone','HP'),('bag','Tas'),('school','Sekolah'),('sofa','Upgrade kamar')]
for i,(ic,l) in enumerate(steps):
    r,c=divmod(i,5); x=30+c*160 if r==0 else 110+(c)*160; y=70+r*150
    rbox(d,x,y,120,84,fill='#FFFFFF',ol=C['xpbtnb'],cut=2); d.rectangle([x+2,y+2,x+117,y+18],fill='#DCE6F6')
    text(d,x+6,y+4,f'{i+1}',C['xpsel'],11,True); icon(im,ic,x+44,y+22,2); text(d,x+60,y+62,l,'#000',11,True,anchor='ma')
    if i<len(steps)-1:
        if i==4: d.line([x+60,y+86,x+60,y+104],fill=C['xpsel'],width=2); d.line([x+60,y+104,190,y+104],fill=C['xpsel'],width=2); d.line([190,y+104,190,y+148],fill=C['xpsel'],width=2); d.polygon([(185,y+142),(195,y+142),(190,y+149)],fill=C['xpsel'])
        else: d.line([x+122,y+42,x+156,y+42],fill=C['xpsel'],width=2); d.polygon([(x+152,y+37),(x+158,y+42),(x+152,y+47)],fill=C['xpsel'])
text(d,24,36,'Dunia dulu, menu belakangan: Action untuk dunia, HP untuk layanan digital, Tas untuk barang fisik.','#000',10)
text(d,24,H-30,'Loop: kerja → uang & XP → kursus / sekolah → kerja lebih baik → upgrade tas & kamar.','#3A4458',10)
save('10_flow',im)
# ---------- overview contact sheet (1x native thumbnails) ----------
meta=json.load(open('build/uimock/hots.json')); names=[n for n,_ in meta['screens']]+['09_components','10_flow']
labels=dict(meta['screens']); labels.update({'09_components':'Komponen','10_flow':'Flow'})
cols=3; cw,chh=844,390+22
rows=math.ceil(len(names)/cols); sheet=Image.new('RGB',(cols*cw+(cols+1)*12,rows*(chh+12)+50),C['void']); sd=D(sheet)
text(sd,12,12,'Virtual Office · UI mockups Pixel XP · 844x390 (1x native) · angka = data contoh',C['paper'],14,True)
for i,n in enumerate(names):
    t=Image.open(f'{OUT}/1x_native/{n}.png')
    if t.height>390: t=t.crop((0,0,844,390))
    x=12+(i%cols)*(cw+12); y=44+(i//cols)*(chh+12); sheet.paste(t,(x,y+22)); text(sd,x,y+4,f'{n}  ·  {labels[n]}',C['glow'] if 'baymax' in n else C['paper'],12,True)
sheet.save(f'{OUT}/00_overview.png')
# ---------- HTML prototype ----------
def b64(p): return base64.b64encode(open(p,'rb').read()).decode()
data={n:b64(f'{OUT}/{n}.png') for n,_ in meta['screens']}
hot=meta['hot']
html="""<!doctype html><html lang=id><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Virtual Office · UI prototype (Pixel XP)</title>
<style>body{margin:0;background:#0B0E13;color:#E7EBF2;font:12px Tahoma,Verdana,sans-serif;display:flex;height:100vh}#side{width:220px;overflow:auto;background:#10141B;border-right:1px solid #2A3242;padding:8px;box-sizing:border-box}
#side a{display:block;color:#E7EBF2;text-decoration:none;padding:3px 6px;border-radius:2px}#side a.on{background:#316AC5}#side a.bm{color:#FFD166}#main{flex:1;display:flex;align-items:center;justify-content:center;position:relative}
#stage{position:relative;width:min(100%,1688px);aspect-ratio:844/390}#stage img{width:100%;height:100%;image-rendering:pixelated;display:block}.h{position:absolute;cursor:pointer}body.show .h{outline:1px dashed #FFD166;background:rgba(255,209,102,.12)}
#tip{position:absolute;bottom:6px;left:8px;color:#8D97A8}</style>
<div id=side><b>Layar</b><br><label><input type=checkbox id=sh> tampilkan hotspot</label><div id=list></div><p style="color:#8D97A8">Action: tap = dialog NPC (Bicara), tahan 0,5 detik = menu radial. X = kembali. Semua angka = data contoh.</p></div>
<div id=main><div id=stage><img id=img></div><div id=tip></div></div>
<script>const D=__DATA__,H=__HOT__,L=__LAB__;let cur='01_hud',hist=[];const st=document.getElementById('stage'),img=document.getElementById('img');
function go(n,push=true){if(!D[n])return;if(push&&cur!==n)hist.push(cur);cur=n;img.src='data:image/png;base64,'+D[n];st.querySelectorAll('.h').forEach(e=>e.remove());
(H[n]||[]).forEach(([x,y,w,h,t,l])=>{const e=document.createElement('div');e.className='h';Object.assign(e.style,{left:x/8.44+'%',top:y/3.9+'%',width:w/8.44+'%',height:h/3.9+'%'});e.title=l||t;
if(t==='ACTION'){let tm,held=false;e.onpointerdown=()=>{held=false;tm=setTimeout(()=>{held=true;go('02_action_radial')},500)};e.onpointerup=()=>{clearTimeout(tm);if(!held)go('06a_npc_dialog')}}else e.onclick=()=>go(t);st.appendChild(e)});
document.querySelectorAll('#side a').forEach(a=>a.classList.toggle('on',a.dataset.n===n));document.getElementById('tip').textContent=n+' · '+L[n]}
const li=document.getElementById('list');Object.keys(D).forEach(n=>{const a=document.createElement('a');a.href='#';a.dataset.n=n;a.textContent=n+' · '+L[n];if(n.includes('baymax'))a.className='bm';a.onclick=e=>{e.preventDefault();go(n)};li.appendChild(a)});
document.getElementById('sh').onchange=e=>document.body.classList.toggle('show',e.target.checked);go('01_hud',false);</script></html>"""
html=html.replace('__DATA__',json.dumps(data)).replace('__HOT__',json.dumps(hot)).replace('__LAB__',json.dumps(labels))
open(f'{OUT}/prototype.html','w').write(html)
print('ok',len(html)//1024,'KB')
