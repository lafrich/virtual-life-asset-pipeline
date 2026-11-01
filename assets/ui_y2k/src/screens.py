from y2k import *
import y2k
FLOOR=('#A4D9F2','#8ECDEB')
def s01(W,H):
    im,Pf=build.base('cafe',W,H); hud(im,W,H,npc=build.npc_head(Pf,6,0.6)); return im
def ring(im,cx,cy,r1,r2,frac,segs=24,col='#2BC12B'):
    lay=Image.new('RGBA',(2*r2+3,2*r2+3)); px=lay.load(); c=icons.hx(col); hi=icons.hx('#A9EBA9'); dk=icons.hx(P['dk']); lt=icons.hx(P['hi'])
    step=360/segs
    for yy in range(lay.height):
        for xx in range(lay.width):
            dx,dy=xx-r2-1,yy-r2-1; dd=math.hypot(dx,dy)
            if dd>r2+.3 or dd<r1-.3: continue
            if dd>=r2-.7 or dd<=r1+.7: px[xx,yy]=(dk if (dx+dy)<0 else lt)+(255,) if dd>=r2-.7 else (lt if (dx+dy)<0 else dk)+(255,); continue
            a=(math.degrees(math.atan2(dx,-dy))+360)%360; seg=int(a//step)
            if a%step<2.2: px[xx,yy]=(255,255,255,255); continue
            if seg<frac*segs: px[xx,yy]=(hi if dd<r1+2.5 else c)+(255,)
            else: px[xx,yy]=(255,255,255,255)
    im.alpha_composite(lay,(cx-r2-1,cy-r2-1))
def s02(W,H):
    def draw():
        im,Pf=build.base('cafe',W,H); dim(im,70)
        L=layout(W,H); cx,cy=L['act']
        ring(im,cx,cy,ACT_R+4,ACT_R+10,.75)
        hud(im,W,H,action_label=None,action_target=None,action_state='pressed')
        tooltip(im,cx-14,cy-ACT_R-10-24,'Tahan... 75%','hourglass',False,tail=-1,anchor='c')
        return im,L,cx,cy
    im,L,cx,cy=draw()
    items=[('Kentut','fart','sel'),('Pipis','pee','dis'),('Emote','emote','n',True),None,('Batal','cancel','n')]
    h=sum(8 if it is None else 28 for it in items)+6
    mx=cx-ACT_R-14-150; my=L['bar'][1]-8-h
    (x,y,w,h),rows=context_menu(im,mx,my,items)
    px,py,_,_=rows['Pipis']
    ui.balloon(im,px-214,py-40,206,46,'Hadap tembok dulu','Pipis hanya saat menghadap tembok.',ic='y16_warn',tx=px-30)
    return im
def s01_blink(W,H,f):
    im,Pf=build.base('cafe',W,H); hud(im,W,H,vals=(.25,.45,.6,.8),blink='hunger',frame_i=f,npc=build.npc_head(Pf,6,0.6)); return im
def s06_locked(W,H):
    im,Pf=build.base('cafe',W,H); hud(im,W,H,locked=True,action_label=None,hp_state='pressed'); dim(im,110)
    spr,bb=y2k.phone_mask_sprite(); x=(W-spr.width)//2; y=bb[1] if H>=390 else (H-spr.height)//2
    im.alpha_composite(spr,(x,y))
    tw_=tw('Input terkunci selama HP terbuka')+22; tooltip(im,max(4,x-10-tw_),200,'Input terkunci selama HP terbuka','lock',False)
    return im
def s10_tas(W,H):
    im,Pf=build.base('cafe',W,H); hud(im,W,H,action_label=None,tas_state='pressed'); dim(im,170)
    ww,wh=min(560,W-40),min(330,H-24); X,Y=(W-ww)//2,(H-wh)//2
    x,y,w,h=ui.window(im,X,Y,ww,wh,'Tas','y16_bag'); d=D(im)
    items=[('coffee','Kopi',3),('food','Makanan',2),('bottle','Air Mineral',4),('key','Kunci',None),('book','Buku',None),('box','Kotak',None)]
    text(d,x+10,y+8,'Basic Bag','#000',11,True); text(d,x+80,y+8,f'Kapasitas {len(items)}/12','#0046D5',11,True)
    ui.progress(im,x+10,y+24,186,10,len(items)/12,col='#316AC5',hi='#7FA7E6',lo='#21509F')
    for i in range(12):
        sx,sy=x+10+(i%4)*47,y+42+(i//4)*47
        if i<len(items): n,l,c=items[i]; ui.slot(im,sx,sy,44,'y32_'+n,c,sel=(i==0))
        else: ui.slot(im,sx,sy,44,empty=True)
    dx=x+206; dw=w-214
    rbox(d,dx,y+8,dw,184,fill='#FFFFFF',ol=C['xpedit'],cut=1)
    d.rectangle([dx+8,y+16,dx+51,y+59],fill='#EEF4FF',outline=C['xpedit']); ic(im,'coffee',dx+14,y+22,32)
    text(d,dx+60,y+18,'Kopi','#000',11,True); text(d,dx+60,y+34,'Jumlah: 3 · bisa di-stack','#3A4458',11); text(d,dx+60,y+48,'Pakai = minum (+Energi)','#3A4458',11)
    ui.wrap(d,dx+8,y+70,'Item fisik. Dipakai dari tas atau saat Action di dekat kopi. HP dan saldo tidak memakai slot tas.',dw-16,'#000',11,lh=14)
    bw=(dw-24)//3
    ui.button(im,dx+8,y+150,bw,26,'Pakai',state='default',ic='y16_check')
    ui.button(im,dx+12+bw,y+150,bw,26,'Buang',ic='y16_cancel')
    ui.button(im,dx+16+2*bw,y+150,bw,26,'Simpan',state='disabled',ic='y16_house')
    text(d,dx+16+2*bw,y+178,'hanya di kamar','#8D8D8D',11)
    if h>250:
        rbox(d,x+8,y+h-62,w-16,40,fill='#F4F3EE',ol='#D0D0BF',cut=1); ic(im,'lock',x+16,y+h-54)
        text(d,x+38,y+h-57,'Kapasitas berikutnya: Medium Bag · 20 slot','#000',11,True); text(d,x+38,y+h-42,'Upgrade lewat NPC toko tas / toko perlengkapan.','#3A4458',11)
    text(d,x+10,y+h-16,'Nama item & jumlah = data contoh.','#7A7A7A',11)
    return im
def s11_work(W,H):
    im,Pf=build.base('cafe',W,H,work=True); hud(im,W,H,action_label=None,work=True)
    ww,wh=320,118; X,Y=(W-ww)//2,10
    x,y,w,h=ui.window(im,X,Y,ww,wh,'Bekerja: Barista','y16_coffee'); d=D(im)
    ic(im,'work',x+8,y+8,32)
    text(d,x+48,y+8,'Membuat kopi untuk pelanggan...','#000',11)
    ui.progress(im,x+48,y+26,w-112,16,.6); text(d,x+w-10,y+28,'00:18','#000',11,True,anchor='ra')
    text(d,x+48,y+48,'Upah Rp 50.000 · +10 Skill XP (contoh)','#3A4458',11)
    ui.button(im,x+w-88,y+h-30,80,24,'Berhenti',ic='y16_cancel')
    text(d,x+8,y+h-25,'Berhenti = tidak dibayar.','#7A7A7A',11)
    tooltip(im,20,H-10-36-34-26,'Jalan & Action nonaktif','lock',False)
    return im
FULL=[('01_hud_y2k',s01),('02_action_hold_y2k',s02),('04_needs25_blink_f1',lambda W,H:s01_blink(W,H,0)),('04_needs25_blink_f2',lambda W,H:s01_blink(W,H,1)),
      ('06_locked_phone_open_y2k',s06_locked),('10_window_tas_y2k',s10_tas),('11_window_kerja_y2k',s11_work)]
if __name__=='__main__':
    import sys
    only=sys.argv[1:] or None
    for n,f in FULL:
        if only and n not in only: continue
        save(n,f(844,390)); save(n,f(667,375),'667'); print(n)
    fr=[Image.open(f'{OUT}/04_needs25_blink_f{i}.png').convert('P',palette=Image.ADAPTIVE) for i in (1,2)]
    fr[0].save(f'{OUT}/04_needs25_blink.gif',save_all=True,append_images=fr[1:],duration=600,loop=0)
