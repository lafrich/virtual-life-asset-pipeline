import os,json,math
from PIL import Image,ImageDraw
import ui,build,scenes
from ui import *
from build import base,PORT,npc_head,thumb,window,phone,workpanel,BAG,slot
OUT=build.OUT
TAG='USULAN BAYMAX (belum diputuskan)'
def banner(im,W,y,sub):
    d=D(im); w=max(tw(TAG,9,True),tw(sub,9))+16; x=W//2-w//2
    rbox(d,x,y,w,26,fill=C['balloon'],ol='#C9B458',cut=1); text(d,W//2,y+2,TAG,'#7A2E35',9,True,anchor='ma'); text(d,W//2,y+13,sub,'#000',9,anchor='ma')
def hud2(im,W,H,lock=False,work=False,needs=None,blink=False,card=None,action_label='Bicara'):
    d=D(im)
    if card: card(im)
    else: avatar_card(im,8,8,PORT,'Ichsan','Lv. 4',0.55)
    mw=tw('Rp 1.250.000',11,True)+30; money_pill(im,W-8-mw,8,'Rp 1.250.000'); minimap(im,W-80,36)
    round_btn(im,W-104,58,18,'phone','blue','HP',target='11a_hp_input_lock')
    off=lock or work
    joystick(im,48,H-46,34,disabled=off)
    nd=needs or [('hunger',.7,C['amber']),('hygiene',.45,C['sky']),('bladder',.25,'#F5D547'),('energy',.8,C['green'])]
    for i,(ic,f,c) in enumerate(nd):
        x,y=92+(i%2)*88,H-48+(i//2)*22; need_bar(im,x,y,ic,f,c)
        if blink and i==0: rbox(d,x,y,84,18,ol=C['err'],cut=1); rbox(d,x+1,y+1,82,16,ol='#F08A8D',cut=1)
    round_btn(im,W-118,H-34,22,'bag','grey' if lock else 'blue','Tas',grey=lock)
    if off:
        round_btn(im,W-46,H-50,30,'hand','grey','Action',grey=True)
        for cx,cy in [(48,H-46),(W-46,H-50)]+([(W-118,H-34)] if lock else []): icon(im,'lock',cx+8,cy+4)
    else:
        round_btn(im,W-46,H-50,30,'hand','green','Action')
        if action_label:
            disc(im,W-46+22,H-50-22,10,'#FFFFFF','#FFFFFF','#D6D3CE',C['startb']); icon(im,'talk',W-46+14,H-50-30)
def sa(W,H):
    im,Pf=base('cafe',W,H); hud2(im,W,H,lock=True); dim(im,120); ui.HOT[:]=[]
    phone(im,W,H)
    d=D(im); x=W//2+110
    rbox(d,x,150,W-x-90 if W>700 else W-x-8,92,fill=C['floor'],ol=C['wtop'],cut=1)
    yy=156
    for s,c in [('Navigasi HP:',C['glow']),('X di app = kembali ke HP Home',C['paper']),('X di HP Home = tutup HP',C['paper']),('Saat HP terbuka: joystick,',C['grey']),('Action & Tas terkunci',C['grey'])]:
        text(d,x+6,yy,s,c,9,True); yy+=16
    banner(im,W,H-30,'Satu window/HP saja · input gameplay terkunci')
    return im
def sb(W,H):
    im,Pf=base('room',W,H); dim(im,140); ui.HOT[:]=[]
    ww,wh=min(540,W-30),min(320,H-40); x,y=(W-ww)//2,8
    cx,cy,cw,ch=window(im,x,y,ww,wh,'Storage Kamar · Paket','box',close='01_hud'); d=D(im)
    text(d,cx+10,cy+8,'Beli lewat HP (Furniture Shop / Marketplace) = paket ke sini, bukan ke tas.','#000',10,True)
    rows=[('sofa_2_sw','Paket: Sofa','Furniture Shop · tiba','Buka','default'),('vase','Paket: Barang Antik (Baik)','Marketplace · tiba','Buka','normal'),
          ('coffee_table_sw','Paket: Meja Kopi','Furniture Shop · dikirim, 02:10','Menunggu','disabled')]
    for i,(sid,n,s,b,st) in enumerate(rows):
        yy=cy+28+i*58; rbox(d,cx+8,yy,cw-16,52,fill='#EEF4FF' if i==0 else '#FFFFFF',ol=C['xpsel'] if i==0 else C['xpedit'],cut=1)
        d.rectangle([cx+14,yy+4,cx+57,yy+47],fill='#F5E6C8',outline='#94704F'); icon(im,'box',cx+28,yy+18)
        if sid in ICONS: icon(im,sid,cx+40,yy+6)
        else: t=thumb(sid,26); im.alpha_composite(t,(cx+44-t.width//2+6,yy+6))
        text(d,cx+66,yy+8,n,'#000' if st!='disabled' else C['xpdis'],11,True); text(d,cx+66,yy+26,s,'#3A4458',10)
        button(im,cx+cw-100,yy+14,84,24,b,state=st,ic='clock' if st=='disabled' else None)
    text(d,cx+10,cy+ch-34,'Buka = isi masuk storage furnitur (Edit Mode). Barang non-furnitur bisa dipindah ke tas dari sini.','#3A4458',9)
    text(d,cx+10,cy+ch-20,'Status paket & isi divalidasi server. Data contoh.','#6D6D6D',9)
    banner(im,W,H-30,'Paket HP masuk storage kamar, tidak memakai slot tas')
    return im
def bag(W,H,sc='cafe',confirm=True,room=False):
    im,Pf=base(sc,W,H); hud2(im,W,H,lock=True); dim(im,170); ui.HOT[:]=[]
    ww,wh=min(560,W-40),min(320,H-46); x0,y0=(W-ww)//2,8
    x,y,w,h=window(im,x0,y0,ww,wh,'Tas','bag',close='01_hud'); d=D(im)
    items=BAG+[('coffee','Kopi',1,None,''),('food','Makanan',1,None,''),('key','Kunci',None,None,''),('book','Buku',None,None,'')]
    text(d,x+10,y+8,'Basic Bag','#000',11,True); text(d,x+80,y+8,'12/12','#C0302F',11,True)
    rbox(d,x+124,y+6,62,15,fill=C['err'],ol='#A4373C',cut=1); text(d,x+129,y+7,'Tas Penuh','#FFFFFF',9,True)
    progress(im,x+10,y+24,186,10,1.0,col='#E5484D',hi='#F08A8D',lo='#A4373C')
    for i in range(12):
        ic,n,c,tag,_=items[i]; slot(im,x+10+(i%4)*47,y+42+(i//4)*47,44,ic,c,sel=(i==0),tag=tag)
    dx=x+206; dw=w-214
    rbox(d,dx,y+8,dw,184,fill='#FFFFFF',ol=C['xpedit'],cut=1)
    d.rectangle([dx+8,y+16,dx+57,y+65],fill='#EEF4FF',outline=C['xpedit']); icon(im,'coffee',dx+9,y+17,3)
    text(d,dx+66,y+18,'Kopi','#000',13,True); text(d,dx+66,y+36,'Jumlah: 3  ·  bisa di-stack','#3A4458',10)
    bw=(dw-24)//3
    if confirm:
        rbox(d,dx+8,y+74,dw-16,70,fill=C['balloon'],ol='#000000',cut=2); icon(im,'warn',dx+14,y+80)
        text(d,dx+34,y+80,'Buang 1 Kopi?','#000',11,True); wrap(d,dx+34,y+96,'Barang jatuh di lokasi ini dan bisa diambil orang lain.',dw-50,'#000',10,lh=12)
        button(im,dx+34,y+118,90,22,'Ya, buang',state='default'); button(im,dx+130,y+118,70,22,'Batal')
        btn_states=('normal','pressed','disabled')
    else:
        wrap(d,dx+8,y+78,'Di kamar sendiri: Simpan memindahkan item ke storage kamar, membebaskan slot tas.',dw-16,'#000',10,lh=13)
        btn_states=('default','normal','default')
    button(im,dx+8,y+150,bw,26,'Pakai',state=btn_states[0],ic='check')
    button(im,dx+12+bw,y+150,bw,26,'Buang',state=btn_states[1])
    button(im,dx+16+2*bw,y+150,bw,26,'Simpan',state=btn_states[2],ic='store')
    text(d,dx+16+2*bw,y+178,'aktif (di kamar)' if room else 'hanya di kamar','#1E6B1E' if room else '#8D8D8D',9)
    rbox(d,x+8,y+h-64,w-16,40,fill='#F4F3EE',ol='#D0D0BF',cut=1); icon(im,'lock',x+16,y+h-56)
    text(d,x+38,y+h-58,'Buang selalu tersedia, juga saat tas penuh.','#000',11,True); text(d,x+38,y+h-43,'Simpan hanya aktif di kamar sendiri. Kapasitas berikutnya: Medium Bag · 20 slot (NPC toko tas).','#3A4458',9)
    banner(im,W,H-28,'Tas 12/12: Buang selalu ada (dengan konfirmasi), Simpan hanya di kamar')
    return im
def sd(W,H):
    im,Pf=base('cafe',W,H,work=True); hud2(im,W,H,work=True,action_label=None)
    d=D(im); pw,ph=300,62; x,y=(W-pw)//2,10
    rbox(d,x,y,pw,ph,fill=C['xpface'],ol=C['xpdark'],cut=2); bands(d,x+1,y+1,pw-2,[('#4C96FF',1),(C['xpblue'],16),('#0A49C8',1)])
    icon(im,'coffee',x+5,y+2); text(d,x+24,y+4,'Bekerja: Barista','#FFFFFF',11,True,sh=C['xpsh'])
    progress(im,x+8,y+26,pw-112,14,0.6); text(d,x+pw-100,y+27,'00:18','#000',11,True)
    button(im,x+pw-62,y+23,54,21,'Berhenti')
    text(d,x+8,y+45,'Berhenti = tidak dibayar, tanpa penalti.','#4D4D4D',9)
    banner(im,W,78,'Hanya tombol Berhenti · joystick & Action nonaktif')
    return im
def se(W,H,f):
    im,Pf=base('cafe',W,H); c=C['amber'] if f==0 else '#F08A5D'
    hud2(im,W,H,needs=[('hunger',.25,c),('hygiene',.45,C['sky']),('bladder',.25,'#F5D547'),('energy',.8,C['green'])],blink=(f==1))
    x,y=npc_head(Pf,6,0.6); nameplate(im,x,y-30,'Barista','NPC profesi')
    d=D(im); text(d,92,H-62,f'Frame {f+1}/2 · Hunger 25%',C['glow'],9,True,sh='#0B0E13')
    banner(im,W,4,'Hunger 25%: bar berkedip pelan (2 frame, ±1 detik), tanpa popup')
    return im
TOT=120+60+170
def card_total(im,x=8,y=8,s=1):
    d=D(im); w=150; h=40
    rbox(d,x,y,w,h,fill=C['task'],ol=C['taskd'],cut=2); d.line([x+2,y+1,x+w-3,y+1],fill=C['taskl'])
    d.rectangle([x+4,y+4,x+35,y+35],fill='#9AD3FF',outline='#FFFFFF'); im.alpha_composite(PORT,(x+5,y+5))
    text(d,x+42,y+5,'Ichsan','#FFFFFF',11,True,sh=C['taskd']); icon(im,'star',x+42,y+20); text(d,x+62,y+21,f'{TOT}','#FFD166',11,True,sh=C['taskd'])
def sf(W,H):
    im,Pf=base('cafe',W,H); hud2(im,W,H,card=lambda i:card_total(i))
    # zoom inset
    tmp=Image.new('RGBA',(150,40)); card_total(tmp,0,0); z=tmp.resize((450,120),Image.NEAREST)
    d=D(im); bx,by=W//2-240,90
    rbox(d,bx,by,480,200,fill=C['floor'],ol=C['wtop'],cut=1); im.alpha_composite(z,(bx+15,by+12))
    text(d,bx+15,by+140,'Angka level = total XP semua skill (satu angka, tanpa bar XP terpisah):',C['paper'],10,True)
    text(d,bx+15,by+156,'Trading 120 + Administration 60 + Barista 170 = 350',C['glow'],11,True)
    text(d,bx+15,by+174,'XP per skill tetap terlihat di app Skill (HP). Data contoh.',C['grey'],9)
    banner(im,W,H-30,'Avatar: satu angka = total XP semua skill')
    return im
def sg(W,H):
    im,Pf=base('room',W,H); d=D(im)
    lay=Image.new('RGBA',im.size); ld=ImageDraw.Draw(lay)
    for c in range(8): ld.line([Pf(c,0),Pf(c,6)],fill=(231,235,242,90))
    for r in range(7): ld.line([Pf(0,r),Pf(7,r)],fill=(231,235,242,90))
    for (c,r) in [(4,1),(5,1)]:
        ld.polygon([Pf(c,r),Pf(c+1,r),Pf(c+1,r+1),Pf(c,r+1)],fill=(61,220,132,90))
    im.alpha_composite(lay)
    for (c,r) in [(4,1),(5,1)]:
        pts=[Pf(c,r),Pf(c+1,r),Pf(c+1,r+1),Pf(c,r+1)]; d.line(pts+[pts[0]],fill=C['green'])
    for (c,r) in [(2,0),(3,0)]:
        pts=[Pf(c,r),Pf(c+1,r),Pf(c+1,r+1),Pf(c,r+1)]; d.line(pts+[pts[0]],fill=C['glow'])
    sx,sy=Pf(3,0); prompt(im,sx,sy-96,'Sofa dipilih','hand')
    gx,gy=Pf(5,1); text(d,gx,gy+18,'snap ke grid',C['green'],9,True,anchor='ma',sh='#0B0E13')
    d.line([sx+10,sy+6,gx-10,gy+2],fill=C['glow']); d.polygon([(gx-10,gy-2),(gx-4,gy+3),(gx-12,gy+6)],fill=C['glow'])
    # top bar
    tw_=230; x=(W-tw_)//2
    rbox(d,x,6,tw_,26,fill=C['task'],ol=C['taskd'],cut=2); d.line([x+2,7,x+tw_-3,7],fill=C['taskl'])
    icon(im,'house',x+6,11); text(d,x+26,12,'Edit Mode · Kamar Ichsan','#FFFFFF',11,True,sh=C['taskd'])
    # big buttons bottom-right
    button(im,W-210,H-78,96,34,'Putar',ic='rotate',sz=12,b=True)
    button(im,W-108,H-78,96,34,'Selesai',state='default',ic='check',sz=12,b=True)
    # steps
    rbox(d,8,40,214,68,fill=C['floor'],ol=C['wtop'],cut=1)
    for i,s in enumerate(['1  Tap furnitur untuk memilih','2  Geser: posisi nempel ke grid','3  Putar, lalu Selesai (disimpan server)']): text(d,14,46+i*20,s,C['paper'],10,True)
    # compact storage tray
    ty=H-78; rbox(d,8,ty,W-236,70,fill=C['xpface'],ol=C['xpdark'],cut=2); bands(d,9,ty+1,W-238,[('#4C96FF',1),(C['xpblue'],14),('#0A49C8',1)])
    icon(im,'box',13,ty+1); text(d,33,ty+3,'Storage Kamar','#FFFFFF',11,True,sh=C['xpsh'])
    for i,sid in enumerate(['armchair_lounge_sw','plant_tall','coffee_table_sw','tv_stand_sw']):
        sx_=14+i*52; slot(im,sx_,ty+20,46); t=thumb(sid,42); im.alpha_composite(t,(sx_+(46-t.width)//2,ty+22+(42-t.height)//2))
    banner(im,W,36,'Tap pilih · snap grid · tombol Putar & Selesai besar')
    return im
NEW=[('11a_hp_input_lock','Baymax: HP terbuka, input terkunci',sa),('11b_paket_storage','Baymax: Paket di storage kamar',sb),
 ('11c_tas_penuh_buang','Baymax: Tas 12/12, konfirmasi Buang',lambda W,H:bag(W,H)),('11c2_tas_di_kamar','Baymax: Tas di kamar, Simpan aktif',lambda W,H:bag(W,H,'room',False,True)),
 ('11d_kerja_berhenti','Baymax: Kerja, hanya Berhenti',sd),('11e_hunger_blink_f1','Baymax: Hunger 25% frame 1',lambda W,H:se(W,H,0)),('11e_hunger_blink_f2','Baymax: Hunger 25% frame 2',lambda W,H:se(W,H,1)),
 ('11f_level_total_xp','Baymax: Level = total XP',sf),('11g_room_edit_v2','Baymax: Edit Mode kamar v2',sg)]
if __name__=='__main__':
    for n,l,f in NEW:
        im=f(844,390).convert('RGB'); im.save(f'{OUT}/1x_native/{n}.png')
        im.resize((1688,780),Image.NEAREST).save(f'{OUT}/{n}.png'); im.resize((2532,1170),Image.NEAREST).save(f'{OUT}/3x/{n}.png')
        f(667,375).convert('RGB').resize((1334,750),Image.NEAREST).save(f'{OUT}/667x375/{n}_667x375@2x.png')
    fr=[Image.open(f'{OUT}/11e_hunger_blink_f{i}.png').convert('P',palette=Image.ADAPTIVE) for i in (1,2)]
    fr[0].save(f'{OUT}/11e_hunger_blink.gif',save_all=True,append_images=fr[1:],duration=600,loop=0)
    print('ok')
