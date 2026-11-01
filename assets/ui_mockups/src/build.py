import os, json
from PIL import Image
import ui, scenes
from ui import *
OUT='assets/ui_mockups'
ENV='assets/environment/'
MAN={a['id']:a for a in json.load(open(ENV+'manifest.json'))['assets']}
def spr(id):
    e=MAN[id]; f=e.get('main') or e['animation']['files'][0]['main']; return Image.open(ENV+f).convert('RGBA')
def thumb(id,box):
    im=spr(id).crop(spr(id).getbbox())
    k=1
    while im.width//k>box or im.height//k>box: k+=1
    return im.resize((im.width//k,im.height//k),Image.NEAREST) if k>1 else im
PORT=scenes.frame('ichsan','idle','se').crop((17,29,47,59))
_SC={}
def P(m,c,r): return (int(m.X0+(c-r)*32), int(m.Y0+(c+r)*16))
def scene(name,W,H,**kw):
    key=(name,W,H,tuple(kw.items()))
    if key not in _SC:
        m=getattr(scenes,name)(**kw); im=m.render(scale=1,label=False)
        cx,cy={'cafe':(470 if W<800 else 452,250),'school':(400,250),'bagshop':(400,230),'room':(248,214)}[name]
        out=Image.new('RGBA',(W,H),(11,14,19,255)); ox,oy=W//2-cx,H//2-cy; out.alpha_composite(im,(ox,oy))
        _SC[key]=(out,m,ox,oy)
    out,m,ox,oy=_SC[key]; return out.copy(),(lambda c,r:(P(m,c,r)[0]+ox,P(m,c,r)[1]+oy))
# ---------------- HUD ----------------
def hud(im,W,H,work=False,prompt_npc=None,action_label='Bicara',tas_badge=None,hide=False,pressed=False):
    d=D(im)
    avatar_card(im,8,8,PORT,'Ichsan','Lv. 4',0.55,target='04h_profil')
    mw=tw('Rp 1.250.000',11,True)+30; money_pill(im,W-8-mw,8,'Rp 1.250.000',target='04a_dompet')
    minimap(im,W-80,36,target='04f_peta')
    round_btn(im,W-104,58,18,'phone','blue','HP',target='03_hp_home')
    joystick(im,48,H-46,34,disabled=work)
    for i,(ic,f,c) in enumerate([('hunger',.7,C['amber']),('hygiene',.45,C['sky']),('bladder',.25,'#F5D547'),('energy',.8,C['green'])]):
        need_bar(im,92+(i%2)*88,H-48+(i//2)*22,ic,f,c)
    round_btn(im,W-118,H-34,22,'bag','blue','Tas',target='05_tas')
    if tas_badge:
        bw=tw(tas_badge,9,True)+6; rbox(d,W-118+8,H-34-26,bw,13,fill=C['err'],ol='#FFFFFF',cut=1); text(d,W-118+11,H-34-27,tas_badge,'#FFFFFF',9,True)
    if work: round_btn(im,W-46,H-50,30,'hand','grey','Action',grey=True)
    else:
        round_btn(im,W-46,H-50,30,'hand','green' if not pressed else 'dark','Action',target='ACTION')
        if action_label and not pressed:
            disc(im,W-46+22,H-50-22,10,'#FFFFFF','#FFFFFF','#D6D3CE',C['startb']); icon(im,{'Bicara':'talk','Ambil':'box'}.get(action_label,'hand'),W-46+14,H-50-30)
        if action_label:
            w=chip(im,W-46-(tw(action_label,10,True)+26)//2,H-50-30-24,action_label,'talk' if action_label=='Bicara' else 'hand')
    if prompt_npc:
        x,y=prompt_npc; nameplate(im,x,y-30,'Barista','NPC profesi'); prompt(im,x+52,y+10,'Bicara')
def base(name,W,H,**kw):
    im,Pf=scene(name,W,H,**kw); ui.HOT.clear(); return im,Pf
def npc_head(Pf,c,r): x,y=Pf(c,r); return (x,y-96)
# ---------------- screens ----------------
def s01(W,H):
    im,Pf=base('cafe',W,H); hud(im,W,H,prompt_npc=npc_head(Pf,6,0.6)); return im
def s02(W,H):
    im,Pf=base('cafe',W,H); dim(im,60); hud(im,W,H,action_label=None,pressed=True)
    d=D(im); cx,cy=W-46,H-50
    d.arc([cx-122,cy-122,cx+122,cy+122],185,290,fill='#E7EBF2',width=1)
    d.arc([cx-35,cy-35,cx+35,cy+35],0,360,fill='#2A3242',width=4); d.arc([cx-35,cy-35,cx+35,cy+35],-90,180,fill=C['glow'],width=4)
    items=[('Kentut','fart',165,'01_hud',False),('Pipis','pee',135,None,True),('Emote','emote',105,'01_hud',False),('Cancel','cancel',75,'01_hud',False)]
    import math
    for l,ic,a,t,dis in items:
        x=int(cx+100*math.cos(math.radians(a))); y=int(cy-100*math.sin(math.radians(a)))
        round_btn(im,x,y,20,ic,'grey' if dis else ('red' if l=='Cancel' else 'blue'),l,grey=dis,target=t)
        if dis: icon(im,'lock',x+8,y+6)
        if l=='Pipis': px,py=x,y
    balloon(im,px-206,py-80,200,46,'Hadap tembok dulu','Pipis hanya saat menghadap tembok.',ic='warn',tx=px-6)
    # legend of contextual tap labels
    lx=W//2-200; ly=58
    rbox(d,lx-6,ly-16,412,66,fill=C['floor'],ol=C['wtop'],cut=1); text(d,lx,ly-13,'Tap Action = aksi kontekstual (label muncul di atas objek)',C['grey'],10)
    x=lx
    for l,ic in [('Bicara','talk'),('Minum','coffee'),('Makan','food'),('Tidur','bed'),('Mandi','shower'),('Ambil','box')]: x+=chip(im,x,ly+2,l,ic)+4
    text(d,lx,ly+28,'Area kosong = Kentut  ·  Hold (tahan) = menu radial',C['grey'],10)
    # inset: facing wall
    ix,iy=8,H-160
    rbox(d,ix,iy,118,58,fill=C['floor'],ol=C['wtop'],cut=1); text(d,ix+6,iy+3,'Menghadap tembok:',C['grey'],9)
    round_btn(im,ix+24,iy+32,14,'pee','blue',None,s=1); text(d,ix+44,iy+26,'Pipis aktif',C['paper'],10,True)
    return im
def phone(im,W,H):
    d=D(im); pw,ph=196,H-24; x,y=(W-pw)//2,12
    rbox(d,x,y,pw,ph,fill='#2A3242',ol='#0B0E13',cut=2); d.line([x+3,y+1,x+pw-4,y+1],fill='#5A6577'); d.line([x+1,y+3,x+1,y+ph-4],fill='#3A4458')
    sx,sy,sw,sh=x+8,y+20,pw-16,ph-52
    d.rectangle([x+pw//2-14,y+8,x+pw//2+14,y+10],fill='#1C2330')
    # Bliss wallpaper (flat bands)
    bands(d,sx,sy,sw,[('#2E6FD8',18),('#3A82E4',22),('#4E96EA',22),('#6FAEF0',18),('#93C6F4',sh)])
    hill=Image.new('RGBA',(sw,sh)); hd=ImageDraw.Draw(hill); hd.ellipse([-60,sh-120,sw+120,sh+160],fill='#5DAA34'); hd.ellipse([-120,sh-80,sw-10,sh+200],fill='#4E9A2C'); im.alpha_composite(hill,(sx,sy))
    # status bar (taskbar)
    bands(d,sx,sy,sw,[(C['taskl'],1),(C['task'],13),(C['taskd'],1)]); text(d,sx+4,sy+2,'HP',C['paper'],9,True); text(d,sx+sw-4,sy+2,'10:24','#FFFFFF',9,True,anchor='ra')
    for i in range(4): d.rectangle([sx+sw-48+i*3,sy+10-i*2,sx+sw-47+i*3,sy+11],fill='#FFFFFF')
    apps=[('Dompet','wallet','04a_dompet'),('Skill','skill','04b_skill'),('Online Course','course','04c_course'),('Marketplace','market','04d_market'),
          ('Furniture Shop','sofa','04e_furniture'),('Peta','map','04f_peta'),('Kontak','contacts','04g_kontak'),('Profil','profile','04h_profil'),('Pengaturan','gear','04i_pengaturan')]
    cw=sw//3; chh=(sh-24)//3
    for i,(l,ic,t) in enumerate(apps):
        cx=sx+(i%3)*cw+cw//2; cy=sy+22+(i//3)*chh
        rbox(d,cx-19,cy,38,38,fill='#FFFFFF',ol='#0A246A',cut=2); d.rectangle([cx-17,cy+2,cx+16,cy+35],fill='#F3F6FB' ); icon(im,ic,cx-16,cy+3,2)
        words=l.split(' '); yy=cy+41
        for w_ in words: text(d,cx,yy,w_,'#FFFFFF',9,True,anchor='ma',sh='#0B0E13'); yy+=10
        hot(cx-24,cy,48,58,t,l)
    disc(im,x+pw//2,y+ph-16,10,'#3A4458','#5A6577','#1C2330','#0B0E13')
    close_btn(im,x+pw+6,y,target='01_hud')
def s03(W,H):
    im,_=base('cafe',W,H); hud(im,W,H,action_label=None); dim(im,170); ui.HOT[:]=[]; phone(im,W,H); return im
def win_base(W,H,title,ic,ww=560,wh=330,sc='cafe',close='03_hp_home'):
    im,Pf=base(sc,W,H); hud(im,W,H,action_label=None); dim(im,170); ui.HOT[:]=[]
    ww=min(ww,W-40); wh=min(wh,H-24); x,y=(W-ww)//2,(H-wh)//2
    r=window(im,x,y,ww,wh,title,ic,close=close); return im,r,Pf
def note(d,x,y,s,ic=None,im=None,col='#4D4D4D'):
    if ic: icon(im,ic,x,y-3); x+=20
    text(d,x,y,s,col,10)
def s04a(W,H):
    im,(x,y,w,h),_=win_base(W,H,'Dompet','wallet'); d=D(im)
    rbox(d,x+8,y+8,w-16,46,fill='#E3F5E3',ol='#2BA52B',cut=2); icon(im,'wallet',x+16,y+15,2)
    text(d,x+58,y+13,'Saldo',  '#1E6B1E',10,True); text(d,x+58,y+26,'Rp 1.250.000','#0B3D0B',16,True)
    text(d,x+w-16,y+26,'HP & saldo tidak memakai slot tas','#4D7A4D',9,anchor='ra')
    tabs(im,x+8,y+62,['Riwayat transaksi'],0,pw=w-16,ph=h-96)
    rows=[('+ Rp 110','Upah kerja · Barista','10:24','#1E8A1E'),('- Rp 300','Online Course · Basic Trading Course','09:58','#C0302F'),('- Rp 3.000','Business School · Biaya','Kemarin','#C0302F'),
          ('+ Rp 2.500','Marketplace · Jual Barang Antik','Kemarin','#1E8A1E'),('- Rp 1.800','Furniture Shop · Sofa','Kemarin','#C0302F'),('+ Rp 110','Upah kerja · Barista','2 hari','#1E8A1E')]
    for i,(a,t,tm,c) in enumerate(rows):
        row(im,x+9,y+84+i*22,w-18,22,[(8,a,{'col':c,'b':True}),(92,t,{}),(w-30,tm,{'col':'#6D6D6D','r':True})],alt=i%2==1)
    note(d,x+10,y+h-12,'Data contoh. Saldo hanya berubah setelah validasi server.')
    return im
def s04b(W,H):
    im,(x,y,w,h),_=win_base(W,H,'Skill','skill'); d=D(im)
    sk=[('Trading','coin',3,120,200,'Upah kerja dagang +5%, kerja lebih cepat +4%'),('Administration','profile',2,60,150,'Upah kerja kantor +3%, membuka kerja berkualifikasi'),('Barista','coffee',4,170,250,'Kerja Barista lebih cepat +8%, upah +6%')]
    for i,(n,ic,lv,xp,mx,b) in enumerate(sk):
        yy=y+8+i*70; rbox(d,x+8,yy,w-16,64,fill='#FFFFFF',ol=C['xpedit'],cut=1); d.rectangle([x+14,yy+8,x+49,yy+43],fill='#DCE6F6'); icon(im,ic,x+16,yy+10,2)
        text(d,x+58,yy+7,n,'#000',11,True); text(d,x+w-20,yy+7,f'Lv. {lv}','#0046D5',11,True,anchor='ra')
        progress(im,x+58,yy+24,w-170,12,xp/mx); text(d,x+w-20,yy+24,f'{xp}/{mx} XP','#000',10,anchor='ra')
        text(d,x+58,yy+44,'Manfaat: '+b,'#3A4458',10)
    note(d,x+10,y+h-28,'Skill naik lewat kerja (NPC), Online Course, atau Sekolah. Skill memengaruhi kecepatan kerja & upah.')
    note(d,x+10,y+h-14,'Angka = data contoh (balancing nanti).')
    return im
def s04c(W,H):
    im,(x,y,w,h),_=win_base(W,H,'Online Course','course'); d=D(im)
    # in progress
    rbox(d,x+8,y+8,w-16,74,fill='#EEF4FF',ol=C['xpsel'],cut=1); icon(im,'coin',x+16,y+18,2)
    text(d,x+58,y+13,'Basic Trading Course','#000',11,True); text(d,x+w-18,y+13,'Sedang berjalan','#0046D5',10,True,anchor='ra')
    text(d,x+58,y+29,'Rp 300  ·  90 detik  ·  +40 Trading XP','#3A4458',10)
    progress(im,x+58,y+45,w-230,14,0.62); text(d,x+w-162,y+46,'00:34 tersisa','#000',10)
    button(im,x+w-74,y+42,58,21,'Batal',target='04c_course')
    text(d,x+58,y+66,'Bisa di mana saja, selama karakter tidak terkunci aksi.','#6D6D6D',9)
    # list
    rows=[('Basic Administration Course','profile','Rp 450  ·  120 detik  ·  +50 Administration XP','Mulai','normal'),
          ('Basic Barista Course','coffee','Rp 250  ·  60 detik  ·  +30 Barista XP','Mulai','normal'),
          ('Intro Marketplace Course','market','Selesai · XP kursus ini tidak bisa diulang','Selesai','disabled')]
    for i,(n,ic,s,b,st) in enumerate(rows):
        yy=y+90+i*48; rbox(d,x+8,yy,w-16,44,fill='#FFFFFF',ol=C['xpedit'],cut=1); d.rectangle([x+16,yy+5,x+51,yy+39],fill='#DCE6F6'); icon(im,ic,x+18,yy+6,2)
        text(d,x+58,yy+7,n,'#000' if st!='disabled' else C['xpdis'],11,True); text(d,x+58,yy+24,s,'#3A4458' if st!='disabled' else C['xpdis'],10)
        button(im,x+w-86,yy+11,70,23,b,state=st,ic='check' if st=='disabled' else None)
    note(d,x+10,y+h-12,'Tanpa sertifikat formal. Selain Basic Trading Course, kursus & angka = data contoh.')
    return im
def s04d(W,H):
    im,(x,y,w,h),_=win_base(W,H,'Marketplace','market'); d=D(im)
    tabs(im,x+8,y+6,['Beli','Jual','Listing'],0,w=70,pw=w-16,ph=h-44)
    rows=[('vase','Barang Antik (kondisi Baik)','Raka','Rp 2.500'),('vase2','Barang Antik (kondisi Retak)','Nadia','Rp 900'),('book','Buku','Bima','Rp 120'),('key','Kunci','Ellen','Rp 60'),('bottle','Air Mineral  x4','Noor','Rp 40')]
    text(d,x+44,y+32,'Barang','#6D6D6D',10,True); text(d,x+260,y+32,'Penjual','#6D6D6D',10,True); text(d,x+w-110,y+32,'Harga','#6D6D6D',10,True,anchor='ra')
    for i,(ic,n,s,p) in enumerate(rows):
        yy=y+46+i*30; row(im,x+9,yy,w-18,30,[(10,('icon',ic),{}),(36,n,{}),(252,s,{'col':'#3A4458'}),(w-120,p,{'b':True,'r':True})],sel=(i==0),alt=i%2==1)
        button(im,x+w-92,yy+4,68,22,'Beli',state='default' if i==0 else 'normal')
    note(d,x+10,y+h-12,'Barang dibeli masuk tas (butuh slot kosong). Transaksi divalidasi server. Data contoh.')
    return im
def s04e(W,H):
    im,(x,y,w,h),_=win_base(W,H,'Furniture Shop','sofa'); d=D(im)
    items=[('sofa_2_sw','Sofa','Rp 1.800'),('armchair_lounge_sw','Armchair','Rp 900'),('coffee_table_sw','Meja Kopi','Rp 650'),('tv_stand_sw','TV','Rp 2.200'),('plant_tall','Tanaman','Rp 300'),('rug_round','Karpet Bulat','Rp 500')]
    cw=(w-16-10)//3; ch=(h-60)//2
    for i,(sid,n,p) in enumerate(items):
        cx=x+8+(i%3)*(cw+5); cy=y+8+(i//2*0)+(i//3)*(ch+4)
        rbox(d,cx,cy,cw,ch,fill='#FFFFFF',ol=C['xpedit'],cut=1); d.rectangle([cx+4,cy+4,cx+cw-5,cy+ch-34],fill='#EEF4FF')
        t=thumb(sid,min(cw-12,ch-42)); im.alpha_composite(t,(cx+(cw-t.width)//2,cy+4+(ch-38-t.height)//2))
        text(d,cx+6,cy+ch-28,n,'#000',11,True); text(d,cx+6,cy+ch-14,p,'#1E6B1E',10,True)
        button(im,cx+cw-56,cy+ch-28,50,22,'Beli',state='default' if i==0 else 'normal')
    rbox(d,x+8,y+h-44,w-16,24,fill=C['balloon'],ol='#C9B458',cut=1); icon(im,'box',x+14,y+h-40); text(d,x+36,y+h-38,'Dikirim ke storage kamar (tidak memakai slot tas).','#000',10,True)
    note(d,x+10,y+h-13,'Harga = data contoh. Sprite = aset furnitur game (diperkecil 1/2 bila perlu).')
    return im
def citymap(im,x,y,w,h,full=True):
    d=D(im); d.rectangle([x,y,x+w-1,y+h-1],fill='#7DC75A',outline=C['xpedit'])
    for rx in (x+w//3,x+2*w//3): d.rectangle([rx-6,y+1,rx+6,y+h-2],fill='#8D97A8'); d.line([rx,y+1,rx,y+h-2],fill='#E7EBF2')
    ry=y+h//2; d.rectangle([x+1,ry-6,x+w-2,ry+6],fill='#8D97A8')
    for xx in range(x+2,x+w-2,8): d.line([xx,ry,xx+3,ry],fill='#E7EBF2')
    lm=[(0.16,0.25,'house','Kamar Kamu','#E7EBF2'),(0.5,0.22,'school','Sekolah','#F3E0C7'),(0.84,0.25,'bag','Toko Tas','#F5D9A8'),(0.16,0.76,'coffee','Kafe (NPC Barista)','#D7E9F7'),(0.5,0.78,'box','Toko Perlengkapan','#E6DCF2'),(0.84,0.76,'market','Pasar','#F7D7D7')]
    for fx,fy,ic,l,c in lm:
        cx,cy=int(x+fx*w),int(y+fy*h); rbox(d,cx-24,cy-20,48,34,fill=c,ol='#3A4458',cut=1); icon(im,ic,cx-16,cy-19,2)
        lw=tw(l,9,True)+6; rbox(d,cx-lw//2,cy+16,lw,13,fill='#FFFFFF',ol='#3A4458',cut=1); text(d,cx-lw//2+3,cy+16,l,'#000',9,True)
    px,py=int(x+w*0.33),int(y+h*0.5); disc(im,px,py,6,C['err'],'#F08A8D','#A4373C','#FFFFFF'); text(d,px+9,py-18,'Kamu','#000',9,True)
def s04f(W,H):
    im,(x,y,w,h),_=win_base(W,H,'Peta','map'); d=D(im)
    citymap(im,x+8,y+8,w-16,h-32)
    note(d,x+10,y+h-14,'Layout kota & nama landmark selain Sekolah / Toko Tas = data contoh.')
    return im
def s04g(W,H):
    im,(x,y,w,h),_=win_base(W,H,'Kontak','contacts'); d=D(im)
    sunken(d,x+8,y+8,w-16,h-30)
    rows=[('Online (3)',None,None),('Raka','Online · di kota',C['green']),('Nadia','Online · di Sekolah',C['green']),('Bima','Online · sedang kerja',C['amber']),
          ('Offline (2)',None,None),('Ellen','Offline · 2 jam lalu',C['idle']),('Noor','Offline · kemarin',C['idle'])]
    yy=y+9
    for n,s,c in rows:
        if s is None:
            d.rectangle([x+9,yy,x+w-10,yy+17],fill='#DCE6F6'); text(d,x+14,yy+3,n,'#0A246A',10,True); yy+=18; continue
        row(im,x+9,yy,w-18,28,[(30,n,{'b':True}),(130,s,{'col':'#4D4D4D'})],sel=(n=='Raka'))
        disc(im,x+20,yy+14,5,c,'#FFFFFF',c,'#3A4458'); yy+=28
    note(d,x+10,y+h-13,'Teman multiplayer. Nama & status = data contoh.')
    return im
def s04h(W,H):
    im,(x,y,w,h),_=win_base(W,H,'Profil','profile'); d=D(im)
    sunken(d,x+8,y+8,150,h-32,'#EEF4FF'); f=scenes.frame('ichsan','idle','se').resize((128,224),Image.NEAREST); im.alpha_composite(f.crop((0,10,128,224-14)),(x+19,y+12))
    stats=[('Nama','Ichsan'),('Level','Lv. 4'),('Saldo','Rp 1.250.000'),('Tas','Basic Bag · 12 slot'),('Sertifikat','Business Certificate (sedang sekolah)'),('Skill tertinggi','Barista Lv. 4'),('Sesi kerja selesai','23'),('Kamar','Kamar privat · 6 furnitur')]
    for i,(k,v) in enumerate(stats):
        row(im,x+166,y+8+i*26,w-174,26,[(8,k,{'col':'#4D4D4D'}),(118,v,{'b':True})],alt=i%2==1)
    note(d,x+10,y+h-13,'Statistik = data contoh. Sprite = karakter game (2x).')
    return im
def slider(im,x,y,w,f):
    d=D(im); d.rectangle([x,y+5,x+w,y+8],fill='#FFFFFF',outline=C['xpedit']); kx=x+int(w*f)
    rbox(d,kx-5,y,11,15,fill='#F4F3EE',ol=C['xpbtnb'],cut=1); d.line([kx-3,y+12,kx+3,y+12],fill='#2BC12B')
def check(im,x,y,on,label):
    d=D(im); d.rectangle([x,y,x+12,y+12],fill='#FFFFFF',outline='#1C5180')
    if on: d.line([x+3,y+6,x+5,y+8],fill='#21A121',width=2); d.line([x+5,y+8,x+9,y+3],fill='#21A121',width=2)
    text(d,x+18,y,label,'#000',11)
def s04i(W,H):
    im,(x,y,w,h),_=win_base(W,H,'Pengaturan','gear'); d=D(im)
    gw=(w-24)//2
    groupbox(im,x+8,y+6,gw,104,'Suara')
    text(d,x+18,y+28,'Musik','#000',11); slider(im,x+110,y+26,gw-120,0.7)
    text(d,x+18,y+54,'Efek suara','#000',11); slider(im,x+110,y+52,gw-120,0.5)
    check(im,x+18,y+80,True,'Suara kentut')
    groupbox(im,x+16+gw,y+6,gw,104,'Kontrol')
    text(d,x+26+gw,y+28,'Joystick','#000',11); button(im,x+gw+110,y+24,gw-110,21,'Kiri  ▾')
    check(im,x+26+gw,y+54,True,'Getar saat tombol ditekan'); check(im,x+26+gw,y+80,False,'Tampilkan label aksi')
    groupbox(im,x+8,y+118,w-16,70,'Tampilan')
    text(d,x+18,y+140,'Skala UI','#000',11); 
    for i,l in enumerate(['1x','2x','3x']): button(im,x+110+i*48,y+136,44,21,l,state='default' if i==1 else 'normal')
    check(im,x+18,y+166,True,'Bahasa: Indonesia')
    button(im,x+w-112,y+h-34,100,23,'Keluar akun')
    note(d,x+10,y+h-28,'Isi pengaturan = usulan (tidak ada di brief).')
    return im
BAG=[('coffee','Kopi',3,None,'Minum untuk Energy. Bisa di-stack.'),('food','Makanan',2,None,'Makan untuk Hunger. Bisa di-stack.'),('bottle','Air Mineral',4,None,'Item contoh, bisa di-stack.'),
     ('vase','Barang Antik',None,'Unik','Kondisi: Baik. Item unik, punya slot sendiri.'),('vase2','Barang Antik',None,'Unik','Kondisi: Retak. Item unik, punya slot sendiri.'),
     ('key','Kunci',None,None,'Item contoh.'),('book','Buku',None,None,'Item contoh.'),('box','Kotak',None,None,'Item contoh.')]
def s05(W,H,full=False):
    im,(x,y,w,h),_=win_base(W,H,'Tas','bag',close='01_hud'); d=D(im)
    items=BAG+([('coffee','Kopi',1,None,''),('food','Makanan',1,None,''),('key','Kunci',None,None,''),('book','Buku',None,None,'')] if full else [])
    cap=len(items)
    text(d,x+10,y+8,'Basic Bag','#000',11,True); text(d,x+80,y+8,f'Kapasitas {cap}/12','#0046D5',11,True)
    progress(im,x+10,y+24,186,10,cap/12,col='#316AC5',hi='#7FA7E6',lo='#21509F')
    s=44
    for i in range(12):
        sx,sy=x+10+(i%4)*47,y+42+(i//4)*47
        if i<cap: ic,n,c,tag,_=items[i]; slot(im,sx,sy,s,ic,c,sel=(i==0),tag=tag,target='05_tas')
        else: slot(im,sx,sy,s,empty=True)
    # detail
    dx=x+206; dw=w-214
    rbox(d,dx,y+8,dw,184,fill='#FFFFFF',ol=C['xpedit'],cut=1)
    d.rectangle([dx+8,y+16,dx+57,y+65],fill='#EEF4FF',outline=C['xpedit']); icon(im,'coffee',dx+9,y+17,3)
    text(d,dx+66,y+18,'Kopi','#000',13,True); text(d,dx+66,y+36,'Jumlah: 3  ·  bisa di-stack','#3A4458',10); text(d,dx+66,y+50,'Pakai = minum (animasi ngopi)','#3A4458',10)
    wrap(d,dx+8,y+76,'Item fisik. Dipakai dari tas atau saat Action di dekat Kopi. HP dan saldo tidak memakai slot tas.',dw-16,'#000',10,lh=13)
    bw=(dw-24)//3
    button(im,dx+8,y+150,bw,26,'Pakai',state='default',ic='check',target='01_hud')
    button(im,dx+12+bw,y+150,bw,26,'Buang',target='05_tas')
    button(im,dx+16+2*bw,y+150,bw,26,'Simpan',state='disabled',ic='store')
    text(d,dx+16+2*bw,y+178,'hanya di kamar','#8D8D8D',9)
    rbox(d,x+8,y+h-64,w-16,40,fill='#F4F3EE',ol='#D0D0BF',cut=1); icon(im,'lock',x+16,y+h-56)
    text(d,x+38,y+h-58,'Kapasitas berikutnya: Medium Bag · 20 slot','#000',11,True); text(d,x+38,y+h-43,'Upgrade hanya lewat NPC toko tas / toko perlengkapan di peta.','#3A4458',10)
    note(d,x+10,y+h-13,'Item & jumlah = data contoh. Tidak ada wallet / aplikasi digital di tas.')
    return im
def s05b(W,H):
    im,Pf=base('cafe',W,H); hud(im,W,H,action_label='Ambil',tas_badge='12/12')
    px,py=Pf(6.2,3.4); bx,by=Pf(5.4,4.6); icon(im,'box',bx-8,by-14)
    d=D(im); d.ellipse([bx-8,by-2,bx+8,by+3],fill=None)
    prompt(im,bx,by-40,'Ambil','hand')
    balloon(im,W//2-110,64,220,48,'Tas Penuh','Barang tetap di lokasi / penjualnya.',ic='bag',tx=W//2-20)
    ui.HOT.append((0,0,W,H,'01_hud','tutup toast'))
    return im
def dialog(im,x,y,w,h,title,port,lines,btns,close='01_hud',extra=None):
    r=window(im,x,y,w,h,title,'talk',close=close); cx,cy,cw,ch=r; d=D(im)
    d.rectangle([cx+8,cy+8,cx+71,cy+71],fill='#EEF4FF',outline=C['xpedit']); im.alpha_composite(port,(cx+9,cy+9))
    rbox(d,cx+80,cy+8,cw-88,64,fill='#FFFFFF',ol='#000000',cut=2); d.polygon([(cx+80,cy+22),(cx+72,cy+28),(cx+80,cy+34)],fill='#FFFFFF'); d.line([cx+80,cy+22,cx+72,cy+28],fill='#000'); d.line([cx+72,cy+28,cx+80,cy+34],fill='#000')
    yy=cy+14
    for l in lines: yy=wrap(d,cx+88,yy,l,cw-104,'#000',11,lh=14)
    by=cy+82
    for (l,ic,st,t) in btns: button(im,cx+8,by,cw-16,24,l,state=st,ic=ic,target=t); by+=28
    if extra: extra(d,cx,by,cw)
    return r
def bigport(name,d='se'):
    f=scenes.frame(name,'idle',d).crop((17,29,48,60)); return f.resize((62,62),Image.NEAREST)
def s06a(W,H):
    im,Pf=base('cafe',W,H); hud(im,W,H,action_label=None); dim(im,140); ui.HOT[:]=[]
    ww,wh=360,min(282,H-20); x,y=(W-ww)//2,(H-wh)//2
    dialog(im,x,y,ww,wh,'Barista · NPC profesi',bigport('fm_barista'),['Halo! Butuh kerja? Lagi ramai nih.'],
        [('Kerja','box','default','06b_working'),('Ngobrol','talk','normal','01_hud'),('Tutup','cancel','normal','01_hud')],
        extra=lambda d,cx,by,cw: text(d,cx+10,by+2,'Kerja: ±45 detik · upah & Skill XP tergantung skill (contoh)','#4D4D4D',9))
    return im
def workpanel(im,W,H,frac,t):
    d=D(im); pw,ph=300,62; x,y=(W-pw)//2,10
    rbox(d,x,y,pw,ph,fill=C['xpface'],ol=C['xpdark'],cut=2); bands(d,x+1,y+1,pw-2,[('#4C96FF',1),(C['xpblue'],16),('#0A49C8',1)])
    icon(im,'coffee',x+5,y+2); text(d,x+24,y+4,'Bekerja: Barista','#FFFFFF',11,True,sh=C['xpsh'])
    progress(im,x+8,y+26,pw-90,14,frac); text(d,x+pw-78,y+27,t,'#000',11,True)
    button(im,x+pw-50,y+23,42,21,'Batal',target='01_hud')
    text(d,x+8,y+45,'Movement & aksi lain nonaktif selama kerja.','#4D4D4D',9)
    hot(x+8,y+26,pw-90,14,'06c_result','(demo) lompat ke selesai')
def s06b(W,H):
    im,Pf=base('cafe',W,H,work=True); hud(im,W,H,work=True,action_label=None); workpanel(im,W,H,0.6,'00:18'); return im
def s06c(W,H,pending=False):
    im,Pf=base('cafe',W,H,work=True); hud(im,W,H,action_label=None); dim(im,140); ui.HOT[:]=[]
    ww,wh=300,200; x,y=(W-ww)//2,(H-wh)//2
    cx,cy,cw,ch=window(im,x,y,ww,wh,'Kerja Selesai' if not pending else 'Kerja Selesai · memverifikasi','check' if not pending else 'clock',close='01_hud'); d=D(im)
    g=pending
    for i,(ic,l,v) in enumerate([('coin','Upah','+ Rp 110'),('star','Barista XP (Skill XP)','+ 20 XP')]):
        yy=cy+10+i*34; rbox(d,cx+10,yy,cw-20,30,fill='#F4F3EE' if g else '#FFFFFF',ol=C['xpedit'],cut=1); icon(im,ic,cx+16,yy+7,grey=g)
        text(d,cx+38,yy+8,l,C['xpdis'] if g else '#000',11); text(d,cx+cw-18,yy+8,v,C['xpdis'] if g else '#1E6B1E',12,True,anchor='ra')
    if g:
        progress(im,cx+10,cy+84,cw-20,12,0.35,col='#2BC12B'); text(d,cx+10,cy+100,'Menunggu konfirmasi server…','#000',10,True)
        text(d,cx+10,cy+114,'Reward belum masuk sampai server konfirmasi.','#4D4D4D',9)
        button(im,cx+cw-90,cy+ch-32,80,24,'OK',state='disabled')
    else:
        icon(im,'check',cx+10,cy+84); text(d,cx+30,cy+86,'Dikonfirmasi server · masuk Dompet & Skill','#1E6B1E',10,True)
        text(d,cx+10,cy+106,'Angka = data contoh.','#6D6D6D',9)
        button(im,cx+cw-90,cy+ch-32,80,24,'OK',state='default',target='01_hud')
    return im
def s07a(W,H):
    im,Pf=base('school',W,H); hud(im,W,H,action_label=None); dim(im,140); ui.HOT[:]=[]
    ww,wh=min(520,W-30),min(330,H-20); x,y=(W-ww)//2,(H-wh)//2
    cx,cy,cw,ch=window(im,x,y,ww,wh,'Sekolah · NPC Pendidikan','school',close='01_hud'); d=D(im)
    d.rectangle([cx+8,cy+8,cx+71,cy+71],fill='#EEF4FF',outline=C['xpedit']); im.alpha_composite(bigport('theodore'),(cx+9,cy+9))
    text(d,cx+82,cy+8,'Business School','#000',14,True); text(d,cx+82,cy+28,'Biaya: Rp 3.000  ·  4 modul (contoh)  ·  durasi panjang','#3A4458',10)
    text(d,cx+82,cy+44,'Harus datang ke gedung Sekolah. Bukan aplikasi HP.','#3A4458',10)
    groupbox(im,cx+8,cy+80,cw//2-12,112,'Modul')
    for i,m in enumerate(['Modul 1','Modul 2','Modul 3','Modul 4']): icon(im,'book',cx+18,cy+98+i*22); text(d,cx+40,cy+100+i*22,m+'  ·  sesi berwaktu','#000',10)
    groupbox(im,cx+cw//2,cy+80,cw//2-8,112,'Reward')
    for i,(ic,l) in enumerate([('star','Administration XP'),('cert','Business Certificate'),('lock','Unlock: pekerjaan berkualifikasi')]): icon(im,ic,cx+cw//2+10,cy+98+i*26); text(d,cx+cw//2+32,cy+100+i*26,l,'#000',10,True)
    button(im,cx+8,cy+ch-34,180,26,'Daftar · Rp 3.000',state='default',ic='coin',target='07b_school_progress')
    button(im,cx+196,cy+ch-34,90,26,'Tutup',target='01_hud')
    text(d,cx+cw-8,cy+ch-26,'Pembayaran divalidasi server','#6D6D6D',9,anchor='ra')
    return im
def s07b(W,H):
    im,Pf=base('school',W,H); hud(im,W,H,action_label=None); dim(im,140); ui.HOT[:]=[]
    ww,wh=min(520,W-30),min(330,H-20); x,y=(W-ww)//2,(H-wh)//2
    cx,cy,cw,ch=window(im,x,y,ww,wh,'Business School · Progress','school',close='01_hud'); d=D(im)
    text(d,cx+10,cy+8,'Progress total: 1/4 modul','#000',11,True); progress(im,cx+170,cy+8,cw-180,12,0.25+0.1)
    mods=[('Modul 1','Selesai · +Administration XP','check',1.0,'disabled','Selesai'),('Modul 2','Sesi 2/3 · sisa 04:12','clock',0.55,'default','Lanjut'),('Modul 3','Terkunci · selesaikan Modul 2','lock',0,'disabled','Mulai'),('Modul 4','Terkunci','lock',0,'disabled','Mulai')]
    for i,(n,s,ic,f,st,b) in enumerate(mods):
        yy=cy+28+i*44; rbox(d,cx+8,yy,cw-16,40,fill='#EEF4FF' if i==1 else '#FFFFFF',ol=C['xpsel'] if i==1 else C['xpedit'],cut=1)
        icon(im,ic,cx+16,yy+12); text(d,cx+40,yy+5,n,'#000' if i<2 else C['xpdis'],11,True); text(d,cx+40,yy+21,s,'#3A4458' if i<2 else C['xpdis'],10)
        if 0<f<1: progress(im,cx+220,yy+14,cw-330,12,f)
        button(im,cx+cw-92,yy+8,76,24,b,state=st,target='07b_school_progress' if st!='disabled' else None)
    icon(im,'cert',cx+10,cy+ch-22); text(d,cx+30,cy+ch-20,'Lulus semua modul = Business Certificate. Progress tersimpan permanen.','#000',10)
    return im
def s07c(W,H):
    im,Pf=base('bagshop',W,H); hud(im,W,H,action_label=None); dim(im,140); ui.HOT[:]=[]
    ww,wh=min(480,W-30),min(300,H-20); x,y=(W-ww)//2,(H-wh)//2
    cx,cy,cw,ch=window(im,x,y,ww,wh,'Toko Tas · NPC','bag',close='01_hud'); d=D(im)
    d.rectangle([cx+8,cy+8,cx+71,cy+71],fill='#EEF4FF',outline=C['xpedit']); im.alpha_composite(bigport('fm_kasir'),(cx+9,cy+9))
    text(d,cx+82,cy+10,'Upgrade tas = tambah slot permanen.','#000',11,True); text(d,cx+82,cy+28,'Tas kamu sekarang: Basic Bag · 12 slot (8/12 terisi)','#3A4458',10)
    rows=[('Basic Bag','12 slot','Dipakai','disabled',None,'check'),('Medium Bag','20 slot  ·  Rp 1.500','Upgrade','default','05_tas','coin'),('Large Bag','28 slot  ·  Rp 4.000','Butuh Medium','disabled',None,'lock')]
    for i,(n,s,b,st,t,ic) in enumerate(rows):
        yy=cy+80+i*40; rbox(d,cx+8,yy,cw-16,36,fill='#EEF4FF' if i==1 else '#FFFFFF',ol=C['xpsel'] if i==1 else C['xpedit'],cut=1); icon(im,'bag',cx+14,yy+2,2)
        text(d,cx+54,yy+4,n,'#000',11,True); text(d,cx+54,yy+19,s,'#3A4458',10)
        button(im,cx+cw-118,yy+6,104,24,b,state=st,ic=ic if st!='default' else 'coin',target=t)
    text(d,cx+10,cy+ch-18,'Harga = data contoh. Pembelian divalidasi server.','#6D6D6D',9)
    return im
def s08(W,H):
    im,Pf=base('room',W,H); ui.HOT.clear(); d=D(im)
    # footprint highlight of sofa_2_sw at (2,0) fp 2x1
    for (c,r) in [(2,0),(3,0)]:
        pts=[Pf(c,r),Pf(c+1,r),Pf(c+1,r+1),Pf(c,r+1)]; d.line(pts+[pts[0]],fill=C['green'])
    # ghost move target tiles
    for (c,r) in [(4,1),(5,1)]:
        pts=[Pf(c,r),Pf(c+1,r),Pf(c+1,r+1),Pf(c,r+1)]
        for i in range(4):
            (x0,y0),(x1,y1)=pts[i],pts[(i+1)%4]
            for k in range(0,32,4):
                t0,t1=k/32,(k+2)/32; d.line([x0+(x1-x0)*t0,y0+(y1-y0)*t0,x0+(x1-x0)*t1,y0+(y1-y0)*t1],fill=C['sky'])
    sx,sy=Pf(3,0); sy-=70
    rbox(d,sx-50,sy-6,100,28,fill=C['xpface'],ol=C['xpdark'],cut=2)
    for i,(ic,t) in enumerate([('move','08_room_edit'),('rotate','08_room_edit'),('store','08_room_edit'),('cancel','08_room_edit')]):
        button(im,sx-46+i*24,sy-2,22,20,'',ic=None,target=t); icon(im,ic,sx-43+i*24,sy)
    text(d,sx,sy+24,'Sofa',C['paper'],10,True,anchor='ma',sh='#0B0E13')
    # top bar
    tw_=300; x=(W-tw_)//2
    rbox(d,x,6,tw_,26,fill=C['task'],ol=C['taskd'],cut=2); d.line([x+2,7,x+tw_-3,7],fill=C['taskl'])
    icon(im,'house',x+6,11); text(d,x+26,12,'Edit Mode · Kamar Ichsan','#FFFFFF',11,True,sh=C['taskd'])
    button(im,x+tw_-70,9,62,20,'Selesai',state='default',target='01_hud')
    # storage tray
    th=74; ty=H-th-4; d2=D(im)
    rbox(d2,8,ty,W-16,th,fill=C['xpface'],ol=C['xpdark'],cut=2); bands(d2,9,ty+1,W-18,[('#4C96FF',1),(C['xpblue'],14),('#0A49C8',1)])
    icon(im,'box',13,ty+1); text(d2,33,ty+3,'Storage Kamar · 4 furnitur','#FFFFFF',11,True,sh=C['xpsh'])
    text(d2,W-16,ty+3,'Pesanan Furniture Shop masuk sini','#CFE0FF',9,anchor='ra')
    for i,(sid,n,c) in enumerate([('armchair_lounge_sw','Armchair',1),('plant_tall','Tanaman',2),('coffee_table_sw','Meja Kopi',1),('tv_stand_sw','TV',1)]):
        sx_=14+i*66; slot(im,sx_,ty+20,48,sel=(i==0)); t=thumb(sid,44); im.alpha_composite(t,(sx_+(48-t.width)//2,ty+22+(44-t.height)//2))
        if c>1: d2.rectangle([sx_+36,ty+56,sx_+46,ty+66],fill='#0A246A'); text(d2,sx_+38,ty+55,str(c),'#FFFFFF',9,True)
        text(d2,sx_+52,ty+20,'',None)
    text(d2,290,ty+26,'Tap furnitur → tap tile hijau untuk taruh.','#000',10,True)
    text(d2,290,ty+42,'Hanya di kamar sendiri. Posisi tersimpan permanen (server).','#3A4458',10)
    text(d2,290,ty+56,'Ikon: Pindah · Putar · Simpan ke storage · Batal (usulan)','#6D6D6D',9)
    return im
def s01b(W,H):
    im,Pf=base('cafe',W,H); d=D(im); SA=24  # safe area (notch) left/right
    # thin need bars across top
    x0=SA+150+12
    avatar_card(im,SA,6,PORT,'Ichsan','Lv. 4',0.55,target='04h_profil')
    for i,(ic,f,c) in enumerate([('hunger',.7,C['amber']),('hygiene',.45,C['sky']),('bladder',.25,'#F5D547'),('energy',.8,C['green'])]):
        x=x0+i*78; icon(im,ic,x,8); progress(im,x+18,13,56,6,f,col=c,hi=c,lo=c,bg='#2A3242',seg=4,gap=1,ol='#5A6577')
    mw=tw('Rp 1.250.000',11,True)+30; money_pill(im,W-SA-mw,6,'Rp 1.250.000',target='04a_dompet')
    minimap(im,W-SA-72,34,target='04f_peta'); round_btn(im,W-SA-100,58,20,'phone','blue','HP',target='03_hp_home')
    joystick(im,SA+44,H-52,40)
    round_btn(im,W-SA-132,H-38,28,'bag','blue','Tas',target='05_tas')
    round_btn(im,W-SA-50,H-58,38,'hand','green','Action',s=3,target='ACTION')
    disc(im,W-SA-50+28,H-58-28,11,'#FFFFFF','#FFFFFF','#D6D3CE',C['startb']); icon(im,'talk',W-SA-50+20,H-58-36)
    x,y=npc_head(Pf,6,0.6); nameplate(im,x,y-30,'Barista','NPC profesi'); prompt(im,x+52,y+10,'Bicara')
    # label
    rbox(d,W//2-150,H-30,300,24,fill=C['balloon'],ol='#C9B458',cut=1)
    text(d,W//2,H-29,'USULAN BAYMAX (alternatif, belum diputuskan)','#7A2E35',9,True,anchor='ma')
    text(d,W//2,H-18,'Tap area kosong = tidak ada aksi · Kentut hanya di menu hold','#000',9,anchor='ma')
    for xx in (SA-1,W-SA):
        for yy in range(0,H,6): d.line([xx,yy,xx,yy+2],fill=C['err'])
    text(d,SA+2,H//2,'safe area',C['err'],8)
    return im
SCREENS=[('01b_hud_usulan_baymax','HUD alternatif (Usulan Baymax)',s01b),('01_hud','HUD gameplay',s01),('02_action_radial','Action hold: menu radial',s02),('03_hp_home','HP Home',s03),
 ('04a_dompet','HP · Dompet',s04a),('04b_skill','HP · Skill',s04b),('04c_course','HP · Online Course',s04c),('04d_market','HP · Marketplace',s04d),
 ('04e_furniture','HP · Furniture Shop',s04e),('04f_peta','HP · Peta',s04f),('04g_kontak','HP · Kontak',s04g),('04h_profil','HP · Profil',s04h),('04i_pengaturan','HP · Pengaturan',s04i),
 ('05_tas','Tas fisik',s05),('05b_tas_penuh','Toast Tas Penuh',s05b),('05c_tas_12of12','Tas 12/12',lambda W,H:s05(W,H,True)),
 ('06a_npc_dialog','NPC dialog',s06a),('06b_working','Mode kerja',s06b),('06c_pending','Menunggu server',lambda W,H:s06c(W,H,True)),('06d_result','Kerja Selesai',s06c),
 ('07a_school','Sekolah: Business School',s07a),('07b_school_progress','Sekolah: progress modul',s07b),('07c_bag_shop','NPC Toko Tas',s07c),('08_room_edit','Kamar: Edit Mode',s08)]
