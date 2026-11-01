from y2k import *
import y2k
def checker(W,H):
    im=Image.new('RGBA',(W,H)); d=ImageDraw.Draw(im)
    for y in range(0,H,16):
        for x in range(0,W,32): d.polygon([(x+16,y),(x+32,y+8),(x+16,y+16),(x,y+8)],fill='#A4D9F2')
    bg=Image.new('RGBA',(W,H),'#8ECDEB'); bg.alpha_composite(im); return bg
def head(d,x,y,s,sub=None):
    text(d,x,y,s,'#000',11,True)
    if sub: text(d,x,y+14,sub,'#4D4D4D',11)
def panel(W,H,title):
    im=Image.new('RGBA',(W,H),P['face']); d=D(im); caption(im,0,0,W,title,'info'); return im,d
# ---- 03 Action target variants + bar (HP/Tas/uang) states ----
def bar_demo(im,x,y,W=330,H=84,**kw):
    """draw a bar cluster on a scene-like checker, Action orb included, using the real HUD layout maths"""
    im.alpha_composite(checker(W,H),(x,y)); sub=Image.new('RGBA',(W,H)); sub.alpha_composite(checker(W,H))
    L=vlayout(W,H); act_state=kw.pop('act_state','normal'); bar_cluster(sub,L,**kw)
    cx,cy=L['act']; orb_button(sub,cx,cy,ACT_R,'hand','green',act_state,label='Action')
    im.alpha_composite(sub,(x,y)); D(im).rectangle([x-1,y-1,x+W,y+H],outline=P['dk'])
def targets():
    W,H=844,560; im,d=panel(W,H,'HUD states · Action orb + target badge · bar HP/Tas/Uang (1x, ditampilkan 2x)')
    head(d,8,22,'Action: tap = aksi kontekstual. Badge kanan atas = target saat ini. Prioritas: NPC > makanan/kopi > kursi/kasur > barang > area kosong.')
    vs=[('talk','Bicara','NPC'),('coffee','Minum','kopi'),('food','Makan','makanan'),('chair','Duduk','kursi'),('bed','Tidur','kasur'),('box','Ambil','barang'),(None,'Kentut','area kosong')]
    for i,(t,l,sub) in enumerate(vs):
        x=10+i*118; y=44; im.alpha_composite(checker(110,120),(x,y)); frame(d,x-1,y-1,112,122,'sunken')
        orb_button(im,x+55,y+78,ACT_R,'hand','green',label='Action',badge=(t,'icon') if t else None)
        tooltip(im,x+49,y+8,l,None,True,tail=-1,anchor='c')
        text(d,x+55,y+124,'target: '+sub,'#000',11,anchor='ma')
    y=192; head(d,8,y,'Action orb')
    for i,(st,lab) in enumerate([('normal','normal'),('pressed','ditekan / hold'),('disabled','nonaktif')]):
        x=10+i*96; im.alpha_composite(checker(88,96),(x,y+18)); orb_button(im,x+44,y+64,ACT_R,'hand','green',st,label='Action'); text(d,x+44,y+116,lab,'#000',11,anchor='ma')
    y=330; head(d,8,y,'Bar kesatuan HP · Tas · Uang (glass semi-transparan, dok ke orb Action)')
    cells=[(dict(),'normal'),(dict(tas_state='pressed'),'Tas ditekan (tas terbuka)'),(dict(tas_badge='12/12'),'Tas penuh: badge 12/12'),
           (dict(hp_state='pressed',tas_state='disabled',locked=True,act_state='disabled'),'HP terbuka: lainnya nonaktif')]
    for i,(kw,lab) in enumerate(cells):
        x=10+(i%2)*416; yy=y+20+(i//2)*104; bar_demo(im,x,yy,404,84,**kw); text(d,x+202,yy+86,lab,'#000',11,anchor='ma')
    return im
# ---- 05 money states (segment of the bar) ----
def money():
    W,H=844,264; im,d=panel(W,H,'HUD states · Uang = segmen teks di bar kesatuan (1x, ditampilkan 2x)')
    cells=[('normal','normal'),('pressed','ditekan (buka Dompet di HP)'),('pending','menunggu konfirmasi server'),('gain','uang masuk (toast 2 dtk)')]
    for i,(st,lab) in enumerate(cells):
        x=10+(i%2)*416; y=24+(i//2)*114; bar_demo(im,x,y+8,400,84,money_state='normal' if st=='gain' else st)
        L=vlayout(400,84); mx=L['money'][0]
        if st=='pending': tooltip(im,x+mx+8,y+12,'Menunggu server...','hourglass',False)
        if st=='gain': ui.balloon(im,x+mx,y+6,130,26,'+Rp 50.000',None,ic='y16_check',tx=x+mx+30)
        text(d,x+200,y+94,lab,'#000',11,anchor='ma')
    text(d,10,H-16,'Saldo hanya dibaca dari state server; UI tidak mengubah angka sendiri. Angka = data contoh.','#4D4D4D',11)
    return im
# ---- 07 icon sheet ----
MAP=[('Tas / bag','bag','bag'),('Action / hand pointer','hand','hand'),('Lapar / Hunger','hunger','hunger'),('Bersih / Hygiene','hygiene','hygiene'),
 ('Pipis / Bladder','bladder','bladder'),('Energi / Energy','energy','energy'),('HP (handset Nokia)','phone','phone'),('Uang / money badge','coin','coin'),
 ('Peta / minimap','map','map'),('Profil / user','profile','user'),('Bicara / NPC','talk','talk'),('Kopi / Minum','coffee','coffee'),('Makanan / Makan','food','food'),
 ('Kursi / Duduk','chair','chair'),('Kasur / Tidur','bed','bed'),('Barang / Ambil','box','box'),('Gembok / locked','lock','lock'),('Kentut','fart','fart'),
 ('Pipis (aksi)','pee','pee'),('Emote','emote','emote'),('Batal / error','cancel','cancel'),('Peringatan','warn','warn'),('Info (baru)',None,'info'),
 ('OK / Pakai','check','check'),('Jam / timer','clock','clock'),('Menunggu (baru)',None,'hourglass'),('Kunci','key','key'),('Buku','book','book'),
 ('Air mineral','bottle','bottle'),('Simpan / kamar','house','house'),('Kerja (baru)',None,'work')]
def iconsheet():
    cols=3; rh=40; cw=214; rows=(len(MAP)+cols-1)//cols
    W,H=cols*cw+8,40+rows*rh+34; im,d=panel(W,H,'Ikon HUD · lama (16 px, Pixel XP) vs baru (Y2K Windows, 16 + 32 px native) · sheet 4x')
    for c in range(cols):
        x=4+c*cw; text(d,x+4,20,'nama',P['dk'],11); text(d,x+104,20,'lama',P['dk'],11); text(d,x+138,20,'16',P['dk'],11); text(d,x+172,20,'32',P['dk'],11)
    for i,(lab,old,new) in enumerate(MAP):
        c,r=i//rows,i%rows; x=4+c*cw; y=36+r*rh
        if r%2==0: d.rectangle([x,y,x+cw-6,y+rh-1],fill='#F4F2E6')
        ui.wrap(d,x+4,y+6,lab,96,'#000',11,lh=13)
        if old: im.alpha_composite(ui.ICONS[old],(x+108,y+12))
        else: text(d,x+112,y+13,'-','#8D8D8D',11)
        ic(im,new,x+136,y+12,16); ic(im,new,x+164,y+4,32)
    text(d,8,H-30,'Lama = ui_mockups/src/ui.py ICONS (16 px; di HUD lama diperbesar 2x = campuran skala piksel).','#4D4D4D',11); text(d,8,H-16,'Baru = ui_y2k/src/icons.py, digambar terpisah di 16 dan 32 px, tampil 1:1 di HUD.','#4D4D4D',11)
    return im
# ---- 08 before / after ----
def beforeafter():
    b=Image.open('assets/ui_mockups/1x_native/01_hud.png').convert('RGBA'); a=Image.open(f'{OUT}/1x_native/01_hud_y2k.png').convert('RGBA')
    W=844*2+24; H=24+18+390+16+18+152+20; im,d=panel(W,H,'Before / after · HUD gameplay (1x, ditampilkan 2x)')
    text(d,8,24,'SEBELUM: HUD Pixel XP (ui_mockups/01_hud, tata letak = HUD live: kartu avatar + Lv, uang, minimap, HP, Tas, Action)','#000',11,True)
    text(d,844+16,24,'SESUDAH: Y2K + orb kaca Vista (bar HP/Tas/Uang, joystick lama, Tahoma, ikon 32/16 native)','#000',11,True)
    im.alpha_composite(b,(8,42)); im.alpha_composite(a,(844+16,42))
    y=42+390+8; text(d,8,y,'Zoom 2x: kiri-atas dan kanan-bawah','#000',11,True); y+=16
    for j,src in enumerate((b,a)):
        for k,box in enumerate(((0,0,190,76),(844-190,390-76,844,390))):
            c=src.crop(box).resize((380,152),Image.NEAREST); im.alpha_composite(c,(8+j*(844+8)+k*(380+40),y))
    return im
# ---- 09 components ----
def components():
    W,H=844,640; im,d=panel(W,H,'Komponen Y2K + orb kaca Vista · font Tahoma 11 (Wine Tahoma, aliased) · 1x, ditampilkan 2x')
    y=22; head(d,8,y,'1. Bevel states (2 px klasik)')
    for i,k in enumerate(['raised','pressed','sunken','etched','flat']):
        x=8+i*74; frame(d,x,y+16,64,30,k,P['face']); text(d,x+32,y+50,k,'#000',11,anchor='ma')
    head(d,390,y,'2. Tombol XP Luna (window) · Tahoma')
    for i,st in enumerate(['normal','hover','default','pressed','disabled']):
        ui.button(im,390+i*90,y+18,82,24,st.capitalize() if st!='default' else 'Default',state=st); 
    for i,st in enumerate(['normal','pressed','disabled']):
        x=390+i*90; frame(d,x,y+48,82,24,'pressed' if st=='pressed' else 'raised',P['face'])
        (emboss(d,x+41,y+53,'Klasik',11,False,'ma') if st=='disabled' else text(d,x+41+(st=='pressed'),y+53+(st=='pressed'),'Klasik','#000',11,anchor='ma'))
    text(d,660,y+53,'tombol klasik (HUD)','#4D4D4D',11)
    y=100; head(d,8,y,'3. Orb kaca Vista + bar kesatuan')
    im.alpha_composite(checker(484,86),(8,y+16))
    for i,(t,st) in enumerate([('green','normal'),('green','pressed'),('green','disabled')]): orb_button(im,48+i*76,y+59,ACT_R,'hand',t,st,label='Action',badge=('talk','icon') if st=='normal' else None)
    for i,(icn,st) in enumerate([('bag','normal'),('bag','pressed'),('phone','normal'),('bag','disabled')]): orb_button(im,262+i*46,y+40,SML_R,icn,'blue',st)
    orb_button(im,446,y+40,SML_R,'bag','blue',badge=('12/12','count'))
    capsule(im,240,y+66,240,28); wtext(D(im),252,y+74,'capsule kaca (alpha ~150)')
    head(d,500,y,'4. Joystick (kembali ke versi lama)')
    im.alpha_composite(checker(200,86),(500,y+16)); old_joystick(im,550,y+59,34); old_joystick(im,640,y+59,34,disabled=True)
    text(d,710,y+40,'normal /','#4D4D4D',11); text(d,710,y+54,'nonaktif','#4D4D4D',11)
    y=205; head(d,8,y,'5. Progress bar')
    ui.progress(im,8,y+18,200,14,.6); text(d,214,y+19,'XP Luna (window kerja)','#4D4D4D',11)
    bar(im,8,y+38,200,13,.55,P['blue']); text(d,214,y+38,'XP level (kartu profil)','#4D4D4D',11)
    for i,k in enumerate(['hunger','hygiene','bladder','energy']):
        ic(im,k,8,y+56+i*18); bar(im,28,y+57+i*18,180,14,[.7,.45,.6,.8][i],P[k]); text(d,214,y+58+i*18,k+' '+P[k],'#4D4D4D',11)
    ic(im,'hunger',8,y+128); bar(im,28,y+129,180,14,.25,P['err']); text(d,214,y+130,'<= 25%: merah + kedip','#4D4D4D',11)
    bar(im,8,y+148,200,13,.4,'#0A246A',seg=6,gap=2); text(d,214,y+148,'klasik Win2000 (navy)','#4D4D4D',11)
    import screens
    ring_x=420; im.alpha_composite(checker(110,110),(ring_x,y+18)); screens.ring(im,ring_x+55,y+73,40,46,.75); text(d,ring_x+55,y+132,'ring hold 75%','#4D4D4D',11,anchor='ma')
    head(d,550,y,'6. Tab strip (XP, Tahoma)')
    ui.tabs(im,550,y+18,['Beli','Jual','Listing'],0,pw=280,ph=40); text(d,560,y+46,'Isi tab','#000',11)
    # classic tabs
    xx=550; ty=y+70
    for i,l in enumerate(['Umum','Tampilan','Suara']):
        tw_=tw(l)+16; on=i==0; yy=ty if on else ty+2
        d.rectangle([xx,yy,xx+tw_-1,ty+19],fill=P['face']); d.line([xx,yy+2,xx,ty+19],fill=P['hi']); d.line([xx+2,yy,xx+tw_-3,yy],fill=P['hi']); d.point((xx+1,yy+1),fill=P['hi'])
        d.line([xx+tw_-1,yy+2,xx+tw_-1,ty+19],fill=P['blk']); d.line([xx+tw_-2,yy+1,xx+tw_-2,ty+19],fill=P['sh'])
        text(d,xx+8,yy+3,l,'#000',11,on); xx+=tw_
    frame(d,550,ty+20,280,30,'raised',P['face']); d.line([551,ty+20,550+tw('Umum')+14,ty+20],fill=P['face']); text(d,560,ty+28,'tab strip klasik (Pengaturan)','#000',11)
    y=390; head(d,8,y,'7. Window XP Luna (hanya X) · Tahoma')
    x0,y0,w0,h0=ui.window(im,8,y+18,260,120,'Contoh window','y16_bag'); text(d,x0+8,y0+8,'Isi window. Judul Tahoma Bold 11.','#000',11)
    ui.button(im,x0+w0-88,y0+h0-30,80,24,'OK',state='default',ic='y16_check')
    head(d,290,y,'8. Caption HUD (gradient Win2000)')
    caption(im,290,y+18,180,'Ichsan','user'); caption(im,290,y+38,180,'Peta (nonaktif)','map',active=False)
    head(d,290,y+62,'9. Tooltip / label dunia')
    tooltip(im,290,y+80,'Bicara','talk',True); tooltip(im,360,y+80,'Barista',None,True,tail=-1,sub='NPC profesi'); tooltip(im,450,y+80,'Bicara',None,True,tail=-1)
    head(d,520,y,'10. Menu konteks (hold)')
    context_menu(im,520,y+18,[('Kentut','fart','sel'),('Pipis','pee','dis'),('Emote','emote','n',True),None,('Batal','cancel','n')])
    head(d,700,y,'11. Font')
    text(d,700,y+18,'Tahoma 11','#000',11); text(d,700,y+32,'Tahoma Bold 11','#000',11,True); text(d,700,y+46,'Rp 1.250.000','#000',11,True)
    emboss(d,700,y+60,'Nonaktif (emboss)'); text(d,700,y+76,'Tahoma 10 (hindari)','#000',10)
    y=545; head(d,8,y,'12. Palet chrome baru (hex)')
    sw=[('face','#ECE9D8'),('hi','#FFFFFF'),('lt','#F1EFE2'),('sh','#ACA899'),('dk','#716F64'),('blk','#404040'),('cap1','#0A246A'),('cap2','#A6CAF0'),
        ('icap1','#808080'),('icap2','#C0C0C0'),('sel','#316AC5'),('tip','#FFFFE1'),('g1','#3C9A3C'),('g2','#6CC56C'),('gdk','#1D4F1D'),('glt','#A9E3A9'),('xp','#2A7BF6'),('err','#E5484D'),('orbG','#8EE08A>#1E7A22'),('orbB','#8CC4F5>#0B3F86'),('glass','#566E8E/#142034 a150')]
    for i,(n,c) in enumerate(sw):
        x=8+(i%11)*76; yy=y+18+(i//11)*36; d.rectangle([x,yy,x+20,yy+20],fill=c[:7],outline='#000'); text(d,x+24,yy+1,n,'#000',11,True); text(d,x+24,yy+12,c if len(c)<9 else c[:7]+'..','#4D4D4D',10)
    return im
if __name__=='__main__':
    def out(name,im,k=2):
        im=im.convert('RGB'); im.save(f'{OUT}/1x_native/{name}.png'); im.resize((im.width*k,im.height*k),Image.NEAREST).save(f'{OUT}/{name}.png')
    out('03_states_action_targets_tas',targets()); out('05_states_money_badge',money()); out('07_icon_sheet_4x',iconsheet(),4)
    out('08_before_after',beforeafter()); out('09_components_y2k',components()); print('ok')
