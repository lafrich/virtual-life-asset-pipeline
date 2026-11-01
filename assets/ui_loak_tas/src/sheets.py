from lt import *
import loak_screens as screens
def bgsheet(W,H,title):
    """latar sheet = adegan loak digelapkan, supaya kaca semi-transparan terlihat seperti di game"""
    im=scene('loak',W,H) if W<=844 else Image.new('RGBA',(W,H),'#2A3242'); dim(im,150); d=D(im)
    glass(im,0,0,W,18,r=0,head=18); wtext(d,6,3,title); return im,d
def lab(d,x,y,s): wtext(d,x,y,s,'#9AA6B6',False)
# ---------- components (1x, diekspor 4x) ----------
def components():
    W,H=844,430; im,d=bgsheet(W,H,'Komponen UI Toko Loak + Tas · gaya Vista ui_y2k · Tahoma 11 · 1x (sheet 4x)')
    y=26; lab(d,8,y,'1. Tombol kaca: normal / hover / pressed / disabled')
    for r,(t,l,ic) in enumerate([('green','Jual','check'),('blue','Jual semua','coin'),('brass','Tawar','talk'),('red','Buang','cancel')]):
        for c,st in enumerate(['normal','hover','pressed','disabled']): gbutton(im,8+c*104,y+16+r*30,96,24,l,t,st,icon=ic)
    for c,st in enumerate(['normal','hover','pressed']): closeb(im,520+c*84,y+16,st)
    lab(d,440,y+44,'Tutup: normal / hover / pressed')
    y=160; lab(d,8,y,'2. Slot 40: kosong / umum / jarang / langka / dipilih / terkunci / tumpukan x2..x5 (x5 = maks, emas)')
    xs=8
    slot(im,xs,y+16,40,state='empty'); slot(im,xs+48,y+16,40,'botol_plastik_bening','umum'); slot(im,xs+96,y+16,40,'radio_tua','jarang')
    slot(im,xs+144,y+16,40,'arloji_saku','langka'); slot(im,xs+192,y+16,40,'koin_kuno','langka',sel=True); slot(im,xs+240,y+16,40,state='locked')
    for k,n in enumerate([2,3,4,5]): slot(im,xs+300+k*48,y+16,40,'kaleng_minuman_hijau','umum',n)
    lab(d,500,y+18,'Slot daftar jual = 38 (ikon 32 + border).'); lab(d,500,y+32,'Ikon besar detail = slot 72, ikon 2x.')
    y=226; lab(d,8,y,'3. Rarity (katalog)')
    for k,r in enumerate(['umum','jarang','langka']): rlabel(d,8+k*60,y+16,r)
    lab(d,230,y,'4. Indikator harga hari ini x0,8 - 1,2')
    for k,m in enumerate([.8,.9,1.0,1.1,1.2]): price_meter(im,230+(k%3)*205,y+16+(k//3)*20,m)
    y=280; lab(d,8,y,'5. Potret babeh x4 pose')
    for k,p in enumerate(['offer','haggle','count','idle']): portrait(im,24+k*40,y+34,p)
    lab(d,190,y,'6. Kapasitas 8/12/16/penuh')
    for k,(n,cap) in enumerate([(5,8),(9,12),(16,16),(12,12)]):
        yy=y+16+k*14; full=n>=cap; wtext(d,190,yy-2,f'{n}/{cap}','#E5484D' if full else '#FFFFFF')
        for j in range(cap): d.rectangle([240+j*7,yy,245+j*7,yy+9],fill=(229,72,77) if full else ((61,220,132) if j<n else (20,32,52)),outline=G['edge'])
    lab(d,380,y,'7. Balon ucapan babeh'); balloon(im,386,y+16,200,'Waduh, segitu kemahalan. Babeh kasih Rp 33.000 deh.',tail_x=True)
    lab(d,600,y,'8. Panel kaca (kepala 34)'); glass(im,600,y+16,236,60,head=26); wtext(d,608,y+23,'Judul panel')
    y=356; lab(d,8,y,'9. Toast "Dapat" (3 frame kilau)')
    sub=Image.new('RGBA',(W,60)); 
    for f in range(3):
        t=Image.new('RGBA',(270,56)); screens.toast(t,270,f); im.alpha_composite(t,(8+f*276,y+12-10+6))
    return im
# ---------- sample items (semua ikon dari katalog) ----------
def samples():
    rows=[]
    for it in CAT['item']:
        for sid in it['sprite']: rows.append((it,sid))
    cols=4; cw=210; rh=48; n=len(rows); R=(n+cols-1)//cols
    W,H=cols*cw+8,24+R*rh+24; im=Image.new('RGBA',(W,H),'#10141B')
    glass(im,0,0,W,H,r=0,head=18,alpha=235); d=D(im); wtext(d,6,3,f'Contoh isi: {n} ikon / {len(CAT["item"])} jenis dari item_catalog.json · nama, rarity, harga jual (Rp) · sheet 4x')
    for k,(it,sid) in enumerate(rows):
        c,r=k//R,k%R; x=4+c*cw; y=24+r*rh
        if r%2==0: im.alpha_composite(Image.new('RGBA',(cw-4,rh),(86,110,142,40)),(x,y))
        slot(im,x+4,y+4,40,sid,it['rarity'])
        var=sid.replace(it['id'],'').strip('_')
        wtext(d,x+50,y+5,it['nama']+(f' ({var})' if var else '')) if tw(it['nama']+(f' ({var})' if var else ''),11,True)<cw-56 else wtext(d,x+50,y+5,it['nama'])
        rlabel(d,x+50,y+19,it['rarity']); wtext(d,x+cw-10,y+33,rp(it['harga_jual_rp']),'#3DDC84',anchor='ra')
        wtext(d,x+50,y+33,('var: '+var) if var else '','#9AA6B6',False)
    wtext(d,6,H-18,'Harga = harga_jual_rp katalog (usulan, belum harga pasar). Di Toko Loak dikali x0,8-1,2 harian.','#9AA6B6',False)
    return im
# ---------- atlas + slices + manifest ----------
def atlas():
    parts=[]
    def add(name,w,h,fn):
        t=Image.new('RGBA',(w,h)); fn(t); parts.append((name,t))
    for t,l,ic in [('green','Jual','check'),('blue','Jual semua','coin'),('brass','Tawar','talk'),('red','Buang','cancel')]:
        for st in ['normal','hover','pressed','disabled']:
            add(f'btn_{t}_{st}',98,26,lambda im,t=t,l=l,ic=ic,st=st: gbutton(im,1,1,96,24,l,t,st,icon=ic))
            add(f'btn_{t}_blank_{st}',98,26,lambda im,t=t,st=st: gbutton(im,1,1,96,24,'',t,st))
    for st in ['normal','hover','pressed']: add(f'btn_tutup_{st}',tw('Tutup',11,True)+32,22,lambda im,st=st: closeb(im,im.width-1,1,st))
    add('slot40_empty',40,40,lambda im: slot(im,0,0,40,state='empty')); add('slot40_locked',40,40,lambda im: slot(im,0,0,40,state='locked'))
    for r in ['umum','jarang','langka']:
        add(f'slot40_{r}',40,40,lambda im,r=r: slot(im,0,0,40,None,r)); add(f'slot38_{r}',38,38,lambda im,r=r: slot(im,0,0,38,None,r)); add(f'slot72_{r}',72,72,lambda im,r=r: slot(im,0,0,72,None,r))
    add('slot40_sel_ring',44,44,lambda im: slot(im,2,2,40,None,None,sel=True))
    for n in range(2,6): add(f'badge_x{n}',20,14,lambda im,n=n: badge(im,19,13,n))
    for p in ['offer','haggle','count','idle']: add(f'potret_babeh_{p}',34,34,lambda im,p=p: portrait(im,17,17,p))
    add('panel_glass_9slice_64',64,64,lambda im: glass(im,0,0,64,64,head=26))
    add('toast_bg_258x50',258,50,lambda im: glass(im,0,0,258,50,r=8,head=25,alpha=215))
    add('well_9slice_32',32,32,lambda im: well(im,0,0,32,32))
    for f in range(3): add(f'kilau_f{f}',16,16,lambda im,f=f: sparkle(im,0,0,f))
    # pack (shelf)
    AW=420; x=y=0; sh=0; rects={}
    for name,t in parts:
        if x+t.width>AW: x=0; y+=sh+2; sh=0
        rects[name]=dict(x=x,y=y,w=t.width,h=t.height); x+=t.width+2; sh=max(sh,t.height)
    at=Image.new('RGBA',(AW,y+sh)); 
    for name,t in parts:
        r=rects[name]; at.alpha_composite(t,(r['x'],r['y'])); t.save(f'{OUT}/slices/{name}.png')
    at.save(f'{OUT}/slices/atlas_1x.png'); at.resize((at.width*4,at.height*4),Image.NEAREST).save(f'{OUT}/slices_atlas_4x.png')
    return rects
if __name__=='__main__':
    def out(name,im,k=4):
        im=im.convert('RGB'); im.save(f'{OUT}/1x_native/{name}.png'); im.resize((im.width*k,im.height*k),Image.NEAREST).save(f'{OUT}/{name}.png')
    out('30_komponen_4x',components()); out('31_contoh_isi_item_4x',samples())
    rects=atlas()
    import pickle; REC2=pickle.load(open('/tmp/lt_rec.pkl','rb'))
    scr={}
    for r in REC2:
        k=r['screen']; sz=r['size']; scr.setdefault(k,{}).setdefault(sz,[]).append({kk:r[kk] for kk in ('name','x','y','w','h')})
    man=dict(versi='preview 1 Nov 2026',catatan='Koordinat logis 1x (px). Layar: 844x390 dan 667x375; PNG 2x = koordinat x2. Atlas: slices/atlas_1x.png (RGBA, alpha kaca dipertahankan); tiap slice juga ada sebagai slices/<nama>.png.',
             font=dict(nama='Tahoma (klon Wine, ../ui_y2k/fonts/)',ukuran_px=11,bold_untuk='judul, nama barang, harga',angka_besar='Tahoma Bold 22 (hanya kartu Terjual)'),
             atlas=dict(file='slices/atlas_1x.png',rects=rects),layar=scr)
    json.dump(man,open(f'{OUT}/manifest.json','w'),indent=1,ensure_ascii=False)
    print('ok',len(rects))
