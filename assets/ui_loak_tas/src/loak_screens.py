from lt import *
BAG=[('radio_tua','radio_tua',1),('koin_kuno','koin_kuno',1),('hp_jadul','hp_jadul_biru',1),('kacamata','kacamata',1),
     ('kabel_bekas','kabel_bekas',2),('kardus_lipat','kardus_lipat',2),('kaleng_minuman','kaleng_minuman_merah',3),('botol_plastik','botol_plastik_bening',5)]
MULT=1.10; SALDO=1250000
def offer(iid): return round(ITEM[iid]['harga_jual_rp']*MULT/10)*10
def set_amount(a):
    y2k.vlayout.__defaults__=(a,); y2k.bar_cluster.__defaults__=('normal','normal','normal',None,a,False)
set_amount(rp(SALDO))
def base_loak(W,H,dimv=150):
    im=scene('loak',W,H); hud(im,W,H); dim(im,dimv); return im
def loak_panel(im,W,H,items=BAG,sel=0,hover=None,btn_states=None,pose='offer',say=None):
    pw=min(600,W-40); ph=H-36; px=(W-pw)//2; py=18; rec('panel',px,py,pw,ph)
    glass(im,px,py,pw,ph,head=34); d=D(im)
    portrait(im,px+22,py+17,pose); rec('potret_babeh',px+7,py+2,30,30)
    wtext(d,px+42,py+5,'Toko Loak'); wtext(d,px+42,py+18,'Babeh Pemilik · jual barang temuan','#9AA6B6',False)
    closeb(im,px+pw-8,py+7)
    RC=190; rx=px+pw-RC-8; lx=px+8; lw=rx-8-lx; y0=py+42
    wtext(d,lx+4,y0,'Barang dibawa ('+str(len(items))+')','#9AA6B6',False); wtext(d,lx+lw-150,y0,'Jml','#9AA6B6',False); wtext(d,lx+lw-10,y0,'Tawaran','#9AA6B6',False,anchor='ra')
    ly=y0+16; lh=py+ph-8-ly; well(im,lx,ly,lw,lh); rec('daftar',lx,ly,lw,lh)
    RH=42; nvis=(lh-4)//RH
    if not items:
        im.alpha_composite(icons.get('bag',32),(lx+lw//2-16,ly+lh//2-40))
        wtext(d,lx+lw//2,ly+lh//2,'Belum ada barang temuan di tas.',anchor='ma')
        wtext(d,lx+lw//2,ly+lh//2+15,'Cari di tong sampah, kardus, got, kolong bangku.','#9AA6B6',False,anchor='ma')
    for i,(iid,sid,n) in enumerate(items[:nvis]):
        ry=ly+2+i*RH; it=ITEM[iid]
        if i==sel or i==hover:
            lay=Image.new('RGBA',(lw-12,RH-2),(49,106,197,150) if i==sel else (166,202,240,50)); im.alpha_composite(lay,(lx+2,ry))
            if i==sel: d.rectangle([lx+2,ry,lx+lw-11,ry+RH-3],outline=G['sel2'])
        rec(f'baris_{i}',lx+2,ry,lw-12,RH-2)
        slot(im,lx+5,ry+1,38,sid,it['rarity'])
        wtext(d,lx+50,ry+6,it['nama']); rlabel(d,lx+50,ry+21,it['rarity'])
        wtext(d,lx+lw-150,ry+13,f'x{n}','#FFD166' if n>=5 else '#FFFFFF')
        o=offer(iid); wtext(d,lx+lw-16,ry+6,rp(o*n),anchor='ra'); wtext(d,lx+lw-16,ry+21,'@ '+rp(o),'#9AA6B6',False,anchor='ra')
    if len(items)>nvis:   # scrollbar kaca tipis
        sx=lx+lw-8; d.rectangle([sx,ly+3,sx+4,ly+lh-4],fill=(20,32,52)); th=max(16,int((lh-8)*nvis/len(items)))
        d.rectangle([sx,ly+3,sx+4,ly+3+th],fill=(110,160,210)); d.line([sx,ly+3,sx,ly+3+th],fill='#EBF5FF'); rec('scrollbar',sx,ly+3,5,lh-7)
    # kolom kanan
    yy=y0
    h=balloon(im,rx+6,yy,RC-6,say or ('Barang bagus nih. Hari ini Babeh kasih x'+f'{MULT:.2f}'.replace('.',',')+'.'),tail_x=True); yy+=h+8
    price_meter(im,rx,yy,MULT); yy+=26
    tot_sel=offer(items[sel][0])*items[sel][2] if items else 0; tot=sum(offer(i)*n for i,_,n in items)
    well(im,rx,yy,RC,60); rec('ringkasan',rx,yy,RC,60)
    for k,(lab,val,col) in enumerate([('Dipilih',rp(tot_sel),'#FFFFFF'),('Total semua',rp(tot),'#3DDC84'),('Saldo',rp(SALDO),'#FFFFFF')]):
        wtext(d,rx+6,yy+5+k*17,lab,'#9AA6B6',False); wtext(d,rx+RC-6,yy+5+k*17,val,col,anchor='ra')
    if items: wtext(d,rx,yy+66,'Bonus +20%: 3 barang langka','#FFD166',False); wtext(d,rx,yy+80,'pertama tiap hari (usulan).','#9AA6B6',False)
    bs=btn_states or {}
    by=py+ph-8-3*30+4
    st=lambda k:'disabled' if not items else bs.get(k,'normal')
    gbutton(im,rx,by,RC,26,'Jual','green',st('jual'),icon='check',name='btn_jual')
    gbutton(im,rx,by+30,RC,26,'Jual semua','blue',st('semua'),icon='coin',name='btn_jual_semua')
    gbutton(im,rx,by+60,RC,26,'Tawar','brass',st('tawar'),icon='talk',name='btn_tawar')
    return (px,py,pw,ph)
def dialog(im,W,H,w,h,title,icn,name):
    x,y=(W-w)//2,(H-h)//2; rec(name,x,y,w,h); glass(im,x,y,w,h,head=26,alpha=225); d=D(im)
    if icn: im.alpha_composite(icons.get(icn,16),(x+8,y+5))
    wtext(d,x+28 if icn else x+8,y+7,title); return x,y,d
def s_jual(W,H):
    SCREEN[0]='01_loak_jual'; im=base_loak(W,H); loak_panel(im,W,H,sel=0,hover=2); return im
def s_tawar(W,H):
    SCREEN[0]='02_loak_tawar'; im=base_loak(W,H); loak_panel(im,W,H,sel=0,pose='haggle',btn_states={'tawar':'pressed'}); dim(im,90)
    x,y,d=dialog(im,W,H,300,178,'Tawar: Radio tua',None,'popup_tawar')
    portrait(im,x+290-16,y+13,'haggle',r=11) if False else None
    portrait(im,x+24,y+52,'haggle')
    balloon(im,x+46,y+34,244,'Waduh, segitu kemahalan. Babeh kasih Rp 33.000 deh.',tail_x=True)
    wtext(d,x+12,y+78,'Kamu minta','#9AA6B6',False)
    gbutton(im,x+96,y+74,22,20,'-','blue',name='btn_kurang'); wtext(d,x+165,y+78,'Rp 36.000',anchor='ma'); gbutton(im,x+212,y+74,22,20,'+','blue','hover',name='btn_tambah')
    wtext(d,x+240,y+78,'+9%','#3DDC84')
    wtext(d,x+12,y+102,'Peluang diterima','#9AA6B6',False); y2k.bar(im,x+110,y+100,178,14,.6,'#3DDC84') if False else None
    well(im,x+110,y+100,178,14)
    for k in range(10):
        c=(61,220,132) if k<6 else (20,32,52); d.rectangle([x+113+k*17,y+103,x+113+k*17+14,y+110],fill=c)
    wtext(d,x+12,y+120,'Maks +20%. Gagal: tawaran turun 5% (usulan).','#9AA6B6',False)
    gbutton(im,x+12,y+144,134,24,'Tawar','brass','normal',icon='talk',name='btn_tawar_kirim'); gbutton(im,x+154,y+144,134,24,'Batal','blue',name='btn_batal')
    return im
def s_konfirm(W,H):
    SCREEN[0]='03_loak_konfirmasi'; im=base_loak(W,H); loak_panel(im,W,H,sel=0,btn_states={'semua':'pressed'}); dim(im,90)
    tot=sum(offer(i)*n for i,_,n in BAG); cnt=sum(n for _,_,n in BAG)
    x,y,d=dialog(im,W,H,300,164,'Jual semua?','warn','popup_konfirmasi')
    wtext(d,x+12,y+36,f'{len(BAG)} jenis barang ({cnt} buah) dijual ke Babeh.',False and '#FFF' or '#FFFFFF',False)
    for k,(iid,sid,n) in enumerate(BAG):
        im.alpha_composite(icon_item(sid),(x+14+k*34,y+52))
    wtext(d,x+12,y+90,'Total','#9AA6B6',False); wtext(d,x+288,y+90,rp(tot),'#3DDC84',anchor='ra')
    wtext(d,x+12,y+105,'Saldo setelah','#9AA6B6',False); wtext(d,x+288,y+105,rp(SALDO+tot),anchor='ra')
    gbutton(im,x+12,y+130,134,24,'Ya, jual','green','hover',icon='check',name='btn_ya'); gbutton(im,x+154,y+130,134,24,'Batal','blue',name='btn_batal')
    return im
def s_terjual(W,H):
    SCREEN[0]='04_loak_terjual'; tot=sum(offer(i)*n for i,_,n in BAG)
    set_amount(rp(SALDO+tot)); im=scene('loak',W,H); hud(im,W,H); set_amount(rp(SALDO)); dim(im,120)
    w,h=300,204; x,y=(W-w)//2,(H-h)//2-16; rec('kartu_terjual',x,y,w,h); glass(im,x,y,w,h,head=26,alpha=225); d=D(im)
    im.alpha_composite(icons.get('check',16),(x+8,y+5)); wtext(d,x+28,y+7,'Terjual!')
    portrait(im,x+30,y+60,'count',r=18)
    big=y2k.ImageFont.truetype(y2k.TAH+'tahomabd.ttf',22)
    s='+'+rp(tot); d.text((x+59,y+43),s,fill='#05080E',font=big); d.text((x+58,y+42),s,fill='#3DDC84',font=big)
    for k,(cx,cy,f) in enumerate([(x+60,y+38,0),(x+270,y+44,1),(x+250,y+70,2)]): sparkle(im,cx-8,cy-8,f)
    wtext(d,x+58,y+72,'Babeh: "Makasih, lain kali bawa lagi!"','#9AA6B6',False)
    for k,(iid,sid,n) in enumerate(BAG): im.alpha_composite(icon_item(sid),(x+14+k*34,y+90))
    wtext(d,x+12,y+130,'Saldo','#9AA6B6',False); wtext(d,x+288,y+130,rp(SALDO)+'  >  '+rp(SALDO+tot),anchor='ra')
    wtext(d,x+12,y+146,'Tas: 0/8 slot terisi','#9AA6B6',False)
    gbutton(im,x+w//2-50,y+h-32,100,24,'OK','green',icon='check',name='btn_ok')
    L=y2k.vlayout(W,H,rp(SALDO+tot)); mx,my,mw,mh=L['money']; ui.balloon(im,mx,my-36,140,26,'+'+rp(tot),None,ic='y16_check',tx=mx+30)
    return im
def s_kosong(W,H):
    SCREEN[0]='05_loak_kosong'; im=base_loak(W,H); loak_panel(im,W,H,items=[],pose='idle',say='Belum bawa apa-apa? Cari dulu, nanti Babeh beli.'); return im
# ------------------ TAS ------------------
def tas_panel(im,W,H,items,cap,sel=0,btn='normal'):
    pw=min(560,W-40); ph=H-36; px=(W-pw)//2; py=18; rec('panel',px,py,pw,ph)
    glass(im,px,py,pw,ph,head=34); d=D(im)
    orb(im,px+20,py+17,13,'blue',alpha=235); im.alpha_composite(icons.get('bag',16),(px+12,py+9)); y2k.gloss(im,px+20,py+17,13,40)
    full=len(items)>=cap
    wtext(d,px+40,py+5,'Tas'); wtext(d,px+40,py+18,{8:'Basic Bag',12:'Medium Bag',16:'Large Bag'}[cap],'#9AA6B6',False)
    cx=px+130; wtext(d,cx,py+11,f'{len(items)}/{cap}','#E5484D' if full else '#FFFFFF'); bx=cx+tw(f'{len(items)}/{cap}',11,True)+8
    rec('kapasitas',bx,py+12,cap*7,10)
    for k in range(cap):
        c=(229,72,77) if full else ((61,220,132) if k<len(items) else (20,32,52))
        d.rectangle([bx+k*7,py+12,bx+k*7+5,py+21],fill=c,outline=G['edge'])
    if full:
        fx=bx+cap*7+8; fw=tw('Tas penuh',11,True)+26; gbutton(im,fx,py+7,fw,20,'Tas penuh','red','pressed',icon='warn',name='label_tas_penuh')
    closeb(im,px+pw-8,py+7)
    gx,gy=px+12,py+46; S=40; GAP=6
    for k in range(16):
        x=gx+(k%4)*(S+GAP); y=gy+(k//4)*(S+GAP)
        if k<len(items): iid,sid,n=items[k]; slot(im,x,y,S,sid,ITEM[iid]['rarity'],n if n>1 else None,sel=(k==sel),name=f'slot_{k}')
        elif k<cap: slot(im,x,y,S,state='empty',name=f'slot_{k}')
        else: slot(im,x,y,S,state='locked',name=f'slot_{k}')
    ty=gy+4*(S+GAP)+2
    if cap<16:
        im.alpha_composite(icons.get('lock',16),(gx,ty)); nxt={8:'Medium Bag (12)',12:'Large Bag (16)'}[cap]
        wtext(d,gx+20,ty+2,'Terkunci: upgrade','#9AA6B6',False); wtext(d,gx+20,ty+16,nxt+' di toko tas','#9AA6B6',False)
    wtext(d,gx,py+ph-22,'Sejenis menumpuk sampai x5.','#9AA6B6',False)
    # detail
    dx=gx+4*(S+GAP)+10; dw=px+pw-12-dx; dy=gy; dh=py+ph-12-dy; well(im,dx,dy,dw,dh); rec('detail',dx,dy,dw,dh)
    if items:
        iid,sid,n=items[sel]; it=ITEM[iid]
        slot(im,dx+10,dy+10,72,None,it['rarity']); big=icon_item(sid).resize((64,64),Image.NEAREST); im.alpha_composite(big,(dx+14,dy+14)); rec('ikon_besar',dx+10,dy+10,72,72)
        wtext(d,dx+92,dy+12,it['nama']); rlabel(d,dx+92,dy+27,it['rarity']); wtext(d,dx+92,dy+42,f'Tumpukan {n}/5','#9AA6B6',False)
        hj=it['harga_jual_rp']; wtext(d,dx+92,dy+60,'Harga jual','#9AA6B6',False); wtext(d,dx+dw-10,dy+60,rp(hj),'#3DDC84',anchor='ra')
        wtext(d,dx+10,dy+92,'Di Toko Loak x0,8 - 1,2 per hari:','#9AA6B6',False)
        wtext(d,dx+10,dy+106,rp(hj*.8)+' - '+rp(hj*1.2)+' / buah')
        line=''; yy=dy+128
        for wd in ('"'+it['deskripsi'][0].upper()+it['deskripsi'][1:]+'"').split(' '):
            t=(line+' '+wd).strip()
            if tw(t)>dw-20 and line: wtext(d,dx+10,yy,line,'#9AA6B6',False); yy+=13; line=wd
            else: line=t
        wtext(d,dx+10,yy,line,'#9AA6B6',False)
        gbutton(im,dx+dw-110,dy+dh-34,100,24,'Buang','red',btn,icon='cancel',name='btn_buang')
    return (px,py,pw,ph)
TAS5=BAG[:2]+[BAG[4],BAG[6],BAG[7]]
TAS12=BAG+[('kaset_pita','kaset_pita',2),('buku_bekas','buku_bekas_merah',1),('sepatu_bekas','sepatu_bekas_hitam',1),('besi_tua','besi_tua',4)]
TAS16=TAS12+[('helm_bekas','helm_bekas_merah',1),('walkman','walkman',1),('gembok_tua','gembok_tua',1)]
def base_tas(W,H): im=scene('taman',W,H); hud(im,W,H,tas_state='pressed'); dim(im,150); return im
def s_tas8(W,H): SCREEN[0]='10_tas_8slot'; im=base_tas(W,H); tas_panel(im,W,H,TAS5,8,sel=0); return im
def s_tas12(W,H): SCREEN[0]='11_tas_12_penuh'; im=base_tas(W,H); tas_panel(im,W,H,TAS12,12,sel=11); return im
def s_tas16(W,H): SCREEN[0]='12_tas_16slot'; im=base_tas(W,H); tas_panel(im,W,H,TAS16,16,sel=13); return im
def s_buang(W,H):
    SCREEN[0]='13_tas_buang_konfirmasi'; im=base_tas(W,H); tas_panel(im,W,H,TAS5,8,sel=0,btn='pressed'); dim(im,90)
    x,y,d=dialog(im,W,H,280,128,'Buang barang?','warn','popup_buang')
    slot(im,x+12,y+36,40,'radio_tua','jarang'); wtext(d,x+60,y+40,'Radio tua (x1)'); wtext(d,x+60,y+55,'Hilang permanen, tidak dapat uang.','#9AA6B6',False)
    gbutton(im,x+12,y+92,124,24,'Buang','red','hover',icon='cancel',name='btn_buang_ya'); gbutton(im,x+144,y+92,124,24,'Batal','blue',name='btn_batal')
    return im
def toast(im,W,f,iid='radio_tua',sid='radio_tua',full=False):
    it=ITEM[iid]; w=258 if not full else 300; h=50; x=(W-w)//2; y=10; rec('toast',x,y,w,h)
    glass(im,x,y,w,h,r=8,head=h//2,alpha=215); d=D(im)
    if full:
        im.alpha_composite(icons.get('warn',32),(x+10,y+9)); wtext(d,x+50,y+9,'Tas penuh (8/8)','#E5484D')
        wtext(d,x+50,y+25,it['nama']+' tetap di tanah. Buang/jual dulu.','#FFFFFF',False); return
    slot(im,x+6,y+5,40,sid,it['rarity'])
    pts=[[(x+6,y+2),(x+36,y+26),(x+28,y+0)],[(x+38,y+4),(x+4,y+30),(x+20,y+36)],[(x+30,y+30),(x+10,y+8),(x+40,y+16)]][f%3]
    for k,(sx,sy) in enumerate(pts):
        if k==0: sparkle(im,sx-8,sy-8,f)
        else: star(d,sx,sy,2 if (k+f)%2 else 1)
    wtext(d,x+54,y+7,'Dapat:','#9AA6B6',False); wtext(d,x+54+tw('Dapat: '),y+7,it['nama'])
    rlabel(d,x+54,y+23,it['rarity']); wtext(d,x+w-10,y+23,'jual ±'+rp(it['harga_jual_rp']),'#9AA6B6',False,anchor='ra')
    rec('kilau',x,y,48,48)
def s_toast(W,H,f):
    SCREEN[0]=f'20_toast_dapat_f{f}'; im=scene('taman',W,H); hud(im,W,H,tas_badge='+1'); toast(im,W,f); return im
def s_toast_full(W,H):
    SCREEN[0]='21_toast_tas_penuh'; im=scene('taman',W,H); hud(im,W,H,tas_badge='8/8'); toast(im,W,0,full=True); return im
FULL=[('01_loak_jual',s_jual),('02_loak_tawar',s_tawar),('03_loak_konfirmasi',s_konfirm),('04_loak_terjual',s_terjual),('05_loak_kosong',s_kosong),
      ('10_tas_8slot',s_tas8),('11_tas_12_penuh',s_tas12),('12_tas_16slot',s_tas16),('13_tas_buang_konfirmasi',s_buang),
      ('20_toast_dapat_f0',lambda W,H:s_toast(W,H,0)),('20_toast_dapat_f1',lambda W,H:s_toast(W,H,1)),('20_toast_dapat_f2',lambda W,H:s_toast(W,H,2)),('21_toast_tas_penuh',s_toast_full)]
if __name__=='__main__':
    only=sys.argv[1:]
    for n,f in FULL:
        if only and n not in only: continue
        for W,H in ((844,390),(667,375)):
            import lt; lt.SIZE[0]=f'{W}x{H}'; save(n,f(W,H),W)
        print(n)
    fr=[Image.open(f'{OUT}/20_toast_dapat_f{i}.png').convert('P',palette=Image.ADAPTIVE) for i in range(3)]
    fr[0].save(f'{OUT}/20_toast_dapat.gif',save_all=True,append_images=fr[1:],duration=180,loop=0)
    import pickle; pickle.dump(REC,open('/tmp/lt_rec.pkl','wb'))
