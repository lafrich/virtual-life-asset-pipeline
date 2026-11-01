from lib import *
def H_(a,b,k=1):  # hash noise 0..96
    return ((np.floor(a*16).astype(np.int64)*73856093)^(np.floor(b*16).astype(np.int64)*19349663*k))%97
def gangfloor(a,b,base=3):
    h=H_(a,b); t=np.where(h<6,base-1,np.where(h>92,base+1,base)).astype(np.int8)
    crack=((np.abs(((a*3+b*1.3)%2.1)-1.0)<0.02)&(H_(a*0.25,b*0.25)<60)); t=np.where(crack,base-2,t)
    return np.full(a.shape,MI['GANG'],np.int16),t
def selokan(L,a0,a1,b0,b1,along='b'):
    """open gutter: dark water strip with concrete lips (as ground)"""
    L.top(a0,b0,a1,b1,0,lambda a,b:(np.full(a.shape,MI['WATER'],np.int16),np.where(H_(a,b)<20,2,1).astype(np.int8)),ground=True,shift=0)
def bag_panel(tx,u0,v0,u1,v1,seed=0):
    rng=np.random.default_rng(seed); cols=[('BAGK',2),('CARD',2),('WOOD',2),('RED',1),('BLUE',1),('BAGK',3),('CARD',3),('TEAL',1),('PURP',2)]
    tx.rect(u0,v0,u1,v1,'DARK',3)
    for x in range(u0,u1,4): tx.rect(x,v0,x+1,v1,'CONC',2)
    for v in range(v1-4,v0,-16):
        u=u0+1
        while u<u1-5:
            w=int(rng.integers(6,11)); h=int(rng.integers(8,14)); m,t=cols[int(rng.integers(len(cols)))]
            tx.rect(u,v-h,u+w,v,m,t); tx.rect(u,v-3,u+w,v,m,t+1); tx.rect(u+1,v-h,u+2,v-h+3,m,t-1)
            tx.rect(u+w//2-2,v,u+w//2+2,v+2,m,t-1)  # handle
            if rng.random()<0.5: tx.rect(u+2,v-h//2,u+w-2,v-h//2+1,'GOLD',3)
            u+=w+1
def clock_panel(tx,u0,v0,u1,v1,seed=0):
    rng=np.random.default_rng(seed); tx.rect(u0,v0,u1,v1,'LITE',2)
    for x in range(u0,u1,3):
        for v in range(v0,v1,3): tx.px(x,v,'CONC',3)
    for (cu,cv) in [(u0+9+i*16+(j%2)*8,v0+10+j*16) for j in range((v1-v0-6)//16) for i in range((u1-u0-10)//16)]:
        R=int(rng.integers(5,8)); rim=['BAGK','WOOD','GOLD','RED','LITE'][int(rng.integers(5))]
        for du in range(-R,R+1):
            for dv in range(-R,R+1):
                d=du*du+dv*dv
                if d<=R*R: tx.px(cu+du,cv+dv,rim,2 if du>0 else 3)
                if d<=(R-2)*(R-2): tx.px(cu+du,cv+dv,'LITE',4)
        for k in range(R-2): tx.px(cu,cv+k,'DARK',1)
        for k in range(R-3): tx.px(cu+k,cv,'DARK',1)
def bead_panel(tx,u0,v0,u1,v1,seed=0):
    rng=np.random.default_rng(seed); tx.rect(u0,v0,u1,v1,'DARK',2)
    for u in range(u0+1,u1-1,2):
        m=['RED','YEL','TEAL','PINK','WOOD','LITE','BLUE','BAGK','ORANGE'][int(rng.integers(9))]; L_=int(rng.integers((v1-v0)//3,v1-v0-2))
        for v in range(v1-2,v1-2-L_,-1):
            if (v+u)%3: tx.px(u,v,m,3 if (v//2)%2 else 2)
        tx.px(u,v1-2-L_,m,4)
def goods_top(kind,seed=0):
    cols={'toys':[('RED',3),('YEL',3),('BLUE',3),('TEAL',3),('PINK',3),('ORANGE',3),('PURP',3),('LITE',4)],
          'watch':[('LITE',4),('GOLD',3),('CONC',4),('BAGK',2),('WOOD',2)],
          'misc':[('CONC',3),('WOOD',2),('RED',2),('BLUE',2),('BAGK',2),('CARD',3),('GOLD',2),('LITE',3)],
          'beads':[('RED',3),('YEL',3),('TEAL',3),('WOOD',3),('LITE',4),('BAGK',2)]}[kind]
    def f(a,b):
        cell=(np.floor(a*8).astype(int)*31+np.floor(b*8).astype(int)*17+seed)%len(cols)
        h=H_(a,b,3); edge=((a*8)%1<0.18)|((b*8)%1<0.18)
        mm=np.array([MI[c[0]] for c in cols],np.int16)[cell]; tt=np.array([c[1] for c in cols],np.int8)[cell]
        if kind=='watch':
            base=np.where(h<45,MI['LITE'],MI['BAGK']); mm=np.where(edge,MI['DARK'],np.where(((a*8)%1<0.6)&((b*8)%1<0.6),mm,base)).astype(np.int16); tt=np.where(edge,2,tt).astype(np.int8)
        else:
            mm=np.where(edge&(h<50),MI['CARD'],mm).astype(np.int16); tt=np.where(edge&(h<50),2,tt).astype(np.int8)
        return mm,tt
    return f
def tarp(L,a0,b0,a1,b1,zf,zb,m,poles=True,ph=None):
    """sloped tarp (high at back b1, low at front b0) on poles"""
    if poles:
        for a in (a0+0.04,a1-0.1):
            L.box(a,b0+0.02,a+0.06,b0+0.08,0,zf,'WOOD',2)
            L.box(a,b1-0.08,a+0.06,b1-0.02,0,zb,'WOOD',2)
    k=(zb-zf)/(b1-b0)
    s=L.s; c0,r0,c1,r1=L.rect(a0,b0,a1,b1)
    if L.o=='sw': base=L.r0+L.D; zf_=(zf+k*(base-b0),0.0,-k) if not L.flip else (zf+k*(L.D-base-b0),0.0,k)
    else: base=L.c0+L.D; zf_=(zf+k*(base-b0),-k,0.0) if not L.flip else (zf+k*(L.D-base-b0),k,0.0)
    def F(c,r,z):
        a,b=L.ab(c,r); t=np.where((a*4)%1<0.1,2,3)+np.where(H_(np.floor(a*4),np.floor(b*3))<12,-1,0)
        return np.full(a.shape,MI[m],np.int16),t.astype(np.int8)
    s.slope(c0,r0,c1,r1,zf_,F,shift=0 if L.o=='sw' else -1)
    # front hem (vertical flap)
    L.front(a0,a1,b0,zf-8,zf,Tex(int(round((a1-a0)*32)),8,m,2).rect(0,0,999,1,m,1))
def stool(L,a,b,m='RED'):
    L.box(a,b,a+0.3,b+0.3,22,26,m,3)
    for da,db in [(0,0),(0.24,0),(0,0.24),(0.24,0.24)]: L.box(a+da,b+db,a+da+0.06,b+db+0.06,0,22,m,2)
def person_seated(L,a,b,shirt='TEAL',seed=0,stool_m='RED'):
    """simple seated vendor facing the front (-b): stool, hips, thighs forward, shins down, torso, head"""
    stool(L,a,b,stool_m)
    L.box(a+0.04,b-0.16,a+0.13,b+0.12,26,32,'BAGK',3); L.box(a+0.17,b-0.16,a+0.26,b+0.12,26,32,'BAGK',3)   # thighs forward
    L.box(a+0.04,b-0.16,a+0.13,b-0.08,2,26,'BAGK',2); L.box(a+0.17,b-0.16,a+0.26,b-0.08,2,26,'BAGK',2)    # shins
    L.box(a+0.03,b-0.2,a+0.14,b-0.08,0,3,'DARK',3); L.box(a+0.16,b-0.2,a+0.27,b-0.08,0,3,'DARK',3)        # sandals
    L.box(a+0.02,b+0.04,a+0.28,b+0.26,30,56,shirt,3)                                                  # torso
    L.box(a-0.02,b+0.0,a+0.04,b+0.14,36,54,shirt,2); L.box(a+0.26,b+0.0,a+0.32,b+0.14,36,54,shirt,2)   # arms
    c,r=L.cr(a+0.15,b+0.15); L.s.cyl(c,r,56,60,0.06,'SKIN',3); L.s.cyl(c,r,60,70,0.12,'SKIN',3); L.s.dome(c,r,70,0.13,6,'BAGK',2)
    L.s.ellipse_shadow(c,r,10,3,dx=3)
def motor(L,a,b,col='BAGK',along='a'):
    """parked scooter, long axis along a"""
    s=L.s
    def wheel(aa):
        for th in np.linspace(0,2*np.pi,90):
            for rr_ in np.linspace(0,0.17,7):
                c,r=L.cr(aa+rr_*np.cos(th),b+0.12); s.points(c,r,9+rr_*32*np.sin(th)*1.0+np.zeros(1),'BAGK' if rr_>0.1 else 'CONC',1 if rr_>0.1 else 3)
                c,r=L.cr(aa+rr_*np.cos(th),b+0.2); s.points(c,r,9+rr_*32*np.sin(th)+np.zeros(1),'BAGK',1)
    wheel(a+0.2); wheel(a+1.15)
    L.box(a+0.35,b+0.06,a+1.0,b+0.26,8,18,col,3)                       # floorboard/body
    L.box(a+0.75,b+0.04,a+1.15,b+0.28,14,30,col,3)                     # rear body
    L.box(a+0.72,b+0.05,a+1.12,b+0.27,30,34,'BAGK',2)                  # seat
    L.box(a+0.25,b+0.06,a+0.38,b+0.26,10,38,col,3)                     # front shield
    L.box(a+0.22,b+0.02,a+0.3,b+0.3,38,42,'DARK',3)                    # handlebar
    L.box(a+0.2,b+0.12,a+0.26,b+0.2,30,38,'LITE',4)                    # headlamp
    c,r=L.cr(a+0.7,b+0.16); s.ellipse_shadow(c,r,26,6,dx=4)
def kardus(L,a,b,n=3,seed=0):
    rng=np.random.default_rng(seed); z=0
    for i in range(n):
        w=0.3+0.12*rng.random(); d=0.28+0.1*rng.random(); h=int(12+8*rng.random()); da=0.05*rng.random()
        L.box(a+da,b,a+da+w,b+d,z,z+h,'CARD',3,front=lambda W_,H_,h=h:Tex(W_,H_,'CARD',3).rect(W_//2-1,0,W_//2+1,H_,'CARD',2).rect(0,H_-2,W_,H_,'CARD',4))
        z+=h
# ---------------------------------------------------------------- stalls
def stall_tall(L,W,D,panel,tm,seed,low_goods=None,person=None):
    L.top(0,0,W,D,0,lambda a,b:gangfloor(a,b),ground=True,shift=0)
    bshadow(L,0,D-0.3,W,D,60)
    def pf(Wp,Hh):
        tx=Tex(Wp,Hh,'WOOD',2); panel(tx,2,6,Wp-2,Hh-2,seed); return tx
    L.box(0.05,D-0.3,W-0.05,D-0.15,0,104,'WOOD',2,front=pf)
    if low_goods:
        L.box(0.2,D-0.75,W-0.2,D-0.32,0,26,'WOOD',2,front=lambda w,h:Tex(w,h,'WOOD',2).rect(0,h-3,w,h,'WOOD',3),topf=goods_top(low_goods,seed))
    tarp(L,0,0.65,W,D,110,124,tm)
    if person: person_seated(L,W-0.55,0.35,person,seed)
@asset('lapak_tas','loak',2,1.5,140,note='lapak tas: rak gantung penuh tas, terpal biru')
def lapak_tas(L): stall_tall(L,2,1.5,bag_panel,'TARPB',1)
@asset('lapak_tas_b','loak',2,1.5,140,note='lapak tas varian: tas + koper di depan, terpal merah, pedagang duduk')
def lapak_tas_b(L):
    stall_tall(L,2,1.5,bag_panel,'RED',4,person='TEAL')
    L.box(0.2,0.9,0.55,1.1,0,34,'BAGK',2); L.box(0.6,0.95,0.92,1.12,0,30,'DARK',3)   # koper
@asset('lapak_jam_dinding','loak',2,1.5,140,note='lapak jam dinding: papan penuh jam, meja jam, terpal merah')
def lapak_jam(L): stall_tall(L,2,1.5,clock_panel,'RED',2,low_goods='misc',person='BLUE')
@asset('lapak_aksesori','loak',2,1.5,140,note='lapak aksesori: untaian manik/gelang tergantung, meja aksesori, terpal oranye')
def lapak_aks(L): stall_tall(L,2,1.5,bead_panel,'ORANGE',3,low_goods='beads')
def stall_low(L,W,D,kind,tm,seed,person=None):
    L.top(0,0,W,D,0,lambda a,b:gangfloor(a,b),ground=True,shift=0)
    L.box(0.1,0.25,W-0.1,D-0.45,0,30,'WOOD',2,front=lambda w,h:Tex(w,h,'WOOD',2).rect(0,h-3,w,h,'WOOD',3).rect(4,0,6,h-3,'WOOD',1).rect(w-6,0,w-4,h-3,'WOOD',1),topf=goods_top(kind,seed))
    if kind=='watch':
        L.box(0.1,0.25,W-0.1,D-0.45,30,34,'GLASS',3,topf=lambda a,b:(lambda m,t:(m,t))(*goods_top('watch',seed)(a,b)))
    tarp(L,0,D-0.55,W,D,104,112,tm)
    if person: person_seated(L,0.8,D-0.4,person,seed)
    c,r=L.cr(W/2,D/2); L.s.ellipse_shadow(c,r,30,8,dx=6)
@asset('lapak_jam_tangan','loak',2,1.5,130,oris=('sw','se','ne','nw'),note='lapak jam tangan: etalase kaca rendah, terpal oranye di belakang (barang terlihat dari atas)')
def lapak_jt(L): stall_low(L,2,1.5,'watch','ORANGE',5,person='RED')
@asset('lapak_mainan','loak',2,1.5,130,oris=('sw','se','ne','nw'),note='lapak mainan bekas: meja penuh mainan warna-warni, terpal biru')
def lapak_mainan(L): stall_low(L,2,1.5,'toys','TARPB',6)
@asset('lapak_barang_bekas','loak',2,1.5,130,oris=('sw','se','ne','nw'),note='lapak barang bekas campur (radio, ketel, sepatu), terpal biru, pedagang')
def lapak_bekas(L):
    stall_low(L,2,1.5,'misc','TARPB',7,person='CONC')
    L.box(0.3,0.35,0.6,0.55,30,44,'BAGK',3,front=lambda w,h:Tex(w,h,'BAGK',3).rect(2,3,w//2,h-3,'CONC',2))  # radio
    c,r=L.cr(1.3,0.5); L.s.cyl(c,r,30,40,0.1,'CONC',4); L.s.dome(c,r,40,0.1,4,'CONC',4)       # ketel
# ---------------------------------------------------------------- toko loak utama
@asset('toko_loak','loak',4,3.5,190,note='Toko Loak utama (tempat pemain jual barang): papan LOAK / BELI BARANG BEKAS, meja etalase',interact={'npc_buyer_cell':[2.0,0.55],'player_sell_cell':[2.0,0.2],'counter_rect':[0.6,0.85,3.4,1.25]})
def toko_loak(L):
    W,D=4,3.5; H=118
    L.top(0,0,W,D,0,lambda a,b:gangfloor(a,b),ground=True,shift=0); bshadow(L,0,1.3,W,D,H)
    def front(Wp,Hh):
        tx=Tex(Wp,Hh,'FYEL',3)
        tx.rect(6,0,Wp-6,92,'DARK',2)     # open shop mouth (dark interior)
        bag_panel(tx,10,48,40,90,9); clock_panel(tx,44,40,Wp-44,90,8); bead_panel(tx,Wp-40,40,Wp-10,90,7)
        for v in (20,38): tx.rect(10,v,Wp-10,v+2,'WOOD',3)
        rng=np.random.default_rng(3)
        for v in (22,40):
            u=12
            while u<Wp-14:
                w=int(rng.integers(4,10)); h=int(rng.integers(5,10)); m=['CONC','RED','BLUE','WOOD','LITE','TEAL','GOLD'][int(rng.integers(7))]
                tx.rect(u,v,u+w,v+h if v==22 else v+min(h,6),m,3); u+=w+2
        tx.rect(0,92,Wp,96,'WOOD',2); tx.rect(0,Hh-4,Wp,Hh,'FYEL',4)
        return tx
    L.box(0,1.3,W,D,0,H,'FYEL',3,front=front,side=side_k('FYEL'))
    # lean-to seng roof + overhang
    L.box(-0.05,0.75,W+0.05,1.3,96,100,'SENG',3,front=lambda w,h:Tex(w,h,'SENG',2))
    k_=gable_end
    L.top(0,1.3,W,D,H,lambda a,b:(np.full(a.shape,MI['SENG'],np.int16),np.where((a*8)%1<0.25,2,3).astype(np.int8)),shift=0)
    # big sign board (painted plank)
    def sign(Wp,Hh):
        tx=Tex(Wp,Hh,'YEL',3); tx.rect(0,0,Wp,Hh,'YEL',3); tx.rect(0,0,Wp,2,'YEL',1); tx.rect(0,Hh-2,Wp,Hh,'YEL',4)
        tx.text(Wp//2,Hh-15,'LOAK','RED',2,sc=2,bold=True); tx.text(Wp//2,4,'BELI BARANG BEKAS','DARK',2)
        return tx
    L.box(0.3,1.15,W-0.3,1.3,100,128,'YEL',3,front=sign)
    # etalase counter (glass top, goods inside)
    L.box(0.6,0.85,W-0.6,1.25,0,30,'WOOD',2,front=lambda w,h:Tex(w,h,'WOOD',2).rect(2,8,w-2,h-2,'GLASS',3).rect(4,10,w-4,14,'GOLD',3).rect(0,h-2,w,h,'WOOD',3))
    L.box(0.6,0.85,W-0.6,1.25,30,33,'GLASS',4,topf=goods_top('watch',11))
    # scale + bell on counter, stool + owner behind
    L.box(2.9,0.95,3.2,1.15,33,38,'CONC',3); L.box(2.95,0.98,3.15,1.12,38,40,'RED',3)
    kardus(L,0.1,0.25,3,2); kardus(L,3.5,0.2,2,5)
    # price tag sign standing
    L.box(0.15,0.95,0.5,1.0,0,40,'LITE',4,front=lambda w,h:Tex(w,h,'LITE',4).text(w//2,26,'TERIMA','RED',2).text(w//2,18,'JUAL','RED',2).text(w//2,8,'BELI','DARK',2))
def side_k(m,win=True):
    def f(W,H):
        tx=Tex(W,H,m,3)
        h=np.random.default_rng(W+H)
        for _ in range(6):   # faded paint stains
            u=int(h.integers(0,max(1,W-12))); v=int(h.integers(0,max(1,H-10))); tx.rect(u,v,u+int(h.integers(4,14)),v+int(h.integers(3,9)),m,2)
        tx.rect(0,0,W,6,'CONC',2)
        if win and W>40: window(tx,W//2-10,34,20,26,frame='WOOD',sill=None)
        return tx
    return f
# ---------------------------------------------------------------- warung madura
@asset('warung_madura','kampung',3,3,170,note='warung madura: rolling door terbuka, rak rokok/snack, galon, bangku, buka 24 jam')
def warung(L):
    W,D=3,3; H=100
    L.top(0,0,W,D,0,lambda a,b:gangfloor(a,b,3),ground=True,shift=0); bshadow(L,0,0.9,W,D,H)
    def front(Wp,Hh):
        tx=Tex(Wp,Hh,'WHITE',3)
        tx.rect(4,0,Wp-4,82,'LITE',3,glow=True)   # lit interior
        rng=np.random.default_rng(4)
        for v in range(6,78,10):
            tx.rect(4,v,Wp-4,v+1,'CONC',2,glow=True); u=6
            while u<Wp-6:
                w=int(rng.integers(2,5)); m=['RED','YEL','BLUE','TEAL','ORANGE','PINK','LITE','PURP'][int(rng.integers(8))]
                tx.rect(u,v+1,u+w,v+1+int(rng.integers(4,8)),m,3,glow=True); u+=w+1
        for u in range(10,Wp-10,8):   # renceng sachet strips hanging from the top
            m=['RED','YEL','ORANGE','BLUE','TEAL','PINK'][(u//8)%6]
            for v in range(82-int(16+(u*7)%14),82): tx.px(u,v,m,4 if v%3 else 2,glow=True); tx.px(u+1,v,m,3,glow=True)
        tx.rect(0,82,Wp,94,'CONC',3)
        for v in range(83,94,2): tx.rect(0,v,Wp,v+1,'CONC',2)
        tx.rect(0,0,4,Hh,'WHITE',3); tx.rect(Wp-4,0,Wp,Hh,'WHITE',3)
        return tx
    L.box(0,0.9,W,D,0,H,'WHITE',3,front=front,side=side_k('WHITE',False))
    # sign board (green-ish generic: WARUNG MADURA), 24 JAM tag
    def sign(Wp,Hh):
        tx=Tex(Wp,Hh,'TEAL',2); tx.rect(0,0,Wp,Hh,'TEAL',2,glow=True); tx.rect(0,0,Wp,2,'TEAL',1,glow=True)
        tx.text(Wp//2,10,'WARUNG MADURA','LITE',4,glow=True); tx.text(Wp//2,2,'BUKA 24 JAM','YEL',4,glow=True); return tx
    L.box(0.05,0.82,W-0.05,0.9,96,116,'TEAL',2,front=sign)
    L.top(0,0.9,W,D,H,('SENG',3),shift=0)
    L.box(-0.05,0.4,W+0.05,0.9,88,91,'SENG',3)
    # glass cigarette counter in front of the opening
    L.box(0.3,0.5,2.0,0.85,0,34,'GLASS',3,front=lambda w,h:Tex(w,h,'GLASS',3).rect(2,4,w-2,h-4,'LITE',3,glow=True).rect(4,6,w-4,12,'RED',3,glow=True).rect(4,14,w-4,20,'BLUE',3,glow=True).rect(4,22,w-4,28,'YEL',3,glow=True))
    # galon stack (blue jugs) right
    for i,(da,db,z) in enumerate([(0,0,0),(0.32,0,0),(0.16,0.02,26)]):
        c,r=L.cr(2.3+da,0.62+db); L.s.cyl(c,r,z,z+22,0.15,'TARPB',3); L.s.cyl(c,r,z+22,z+26,0.06,'TARPB',4)
    # wooden bench + tiny banner (no flowers)
    L.box(0.2,0.05,1.6,0.3,14,18,'WOOD',3)
    for a in (0.25,1.45): L.box(a,0.08,a+0.1,0.27,0,14,'WOOD',2)
    L.box(2.55,0.2,2.6,0.25,0,80,'CONC',3)
    L.box(2.6,0.2,2.95,0.24,56,78,'RED',3,front=lambda w,h:Tex(w,h,'RED',3).rect(0,0,w,h//2,'LITE',4))
    c,r=L.cr(W/2,0.4); L.s.ellipse_shadow(c,r,30,6,dx=6)
# ---------------------------------------------------------------- kampung houses
def house(L,W,D,wall,roof,F=1,porch=0.9,fence='TEAL',seed=0,jemuran=False,motor_c=None,pots=True,brick=False):
    H=GF-8; HT=H+(F-1)*FH
    L.top(0,0,W,D,0,lambda a,b:gangfloor(a,b,3),ground=True,shift=0); bshadow(L,0,porch,W,D,HT+30)
    def front(Wp,Hh):
        tx=Tex(Wp,Hh,wall,3)
        rng=np.random.default_rng(seed)
        for _ in range(8):
            u=int(rng.integers(0,Wp-10)); v=int(rng.integers(0,Hh-8)); tx.rect(u,v,u+int(rng.integers(5,16)),v+int(rng.integers(3,8)),wall,2)
        if brick:
            for v in range(0,Hh,4):
                for u in range((v//4%2)*4,Wp,8): tx.rect(u,v,u+7,v+3,'TERRA',2 if (u+v)%3 else 1)
            tx.rect(0,0,Wp,Hh//3,'CONC',3)
        tx.rect(0,0,Wp,8,'CONC',2)
        tx.rect(14,0,34,64,'WOOD',2); tx.rect(16,2,32,62,'WOOD',3); tx.rect(29,30,31,34,'GOLD',4)
        window(tx,44,26,Wp-60 if Wp-60<40 else 36,28,frame='WOOD',sill=None,glass='GLASS')
        tx.rect(44,58,44+min(Wp-60,36),62,'WOOD',2)
        for k in range(1,F):
            z=H+(k-1)*FH; tx.rect(0,z,Wp,z+4,'CONC',3)
            window(tx,14,z+22,26,34,frame='WOOD',sill=None); window(tx,Wp-44,z+22,26,34,frame='WOOD',sill=None)
        # electric meter + house number
        tx.rect(Wp-10,40,Wp-4,50,'CONC',3); tx.rect(Wp-9,44,Wp-5,48,'LITE',3)
        tx.text(Wp-8,56,str(seed+3),'DARK',2)
        return tx
    L.box(0,porch,W,D,0,HT,wall,3,front=front,side=gable_end(int((D-porch)*32),HT+46,HT,HT+44,wall) if roof else side_k(wall))
    if roof:
        def rf(a,b,z):
            if roof=='TERRA': t=np.where(((b*8)%1)<0.22,2,3)+np.where(H_(a,b)<5,-1,0)
            else: t=np.where(((a*6)%1)<0.2,2,3)+np.where(H_(a,b)<10,-1,0)
            return np.full(a.shape,MI[roof],np.int16),t.astype(np.int8)
        L.gable(-0.15,porch-0.35,W+0.15,D+0.1,HT-6,HT+44,roof,fnab=rf)
        L.front(-0.15,W+0.15,porch-0.35,HT-10,HT-6,Tex(int((W+0.3)*32),4,roof,2))
    # porch: low wall + fence + gate
    if fence:
        L.box(0.05,0.08,W-0.05,0.2,0,12,'CONC',3)
        for a in np.arange(0.1,W-0.1,0.16):
            if 1.0<a<1.7: continue
            L.box(a,0.11,a+0.04,0.17,12,40,fence,2)
        L.box(0.05,0.1,1.0,0.18,38,41,fence,3); L.box(1.7,0.1,W-0.05,0.18,38,41,fence,3)
        L.box(1.02,0.12,1.68,0.16,0,38,fence,3,front=lambda w,h:Tex(w,h,fence,3).rect(0,0,w,h,'CLEAR',None).rect(0,0,w,2,fence,3).rect(0,h-2,w,h,fence,3).rect(0,0,2,h,fence,3).rect(w-2,0,w,h,fence,3).rect(w//2-1,0,w//2+1,h,fence,2))
    if pots:
        for a in (0.3,W-0.45):
            c,r=L.cr(a,0.45); L.s.cyl(c,r,0,9,0.1,'TERRA',3)
            for k in range(26):
                ang=k*2.39; rad=0.03+0.11*(k%6)/6; L.s.points(c+rad*np.cos(ang),r+rad*np.sin(ang),9+(k*7)%13+np.zeros(1),'GREEN',1+k%3)
    if jemuran:
        a0,a1=0.25,W-0.35; b=0.55
        for a in (a0,a1): L.box(a,b,a+0.04,b+0.04,0,58,'CONC',3)
        cols=['RED','TARPB','YEL','LITE','PINK','TEAL']
        for i,a in enumerate(np.arange(a0+0.12,a1-0.15,0.32)):
            m=cols[(i+seed)%len(cols)]; L.front(a,a+0.24,b+0.02,30+(i%2)*6,56,Tex(8,26,m,3).rect(0,0,8,3,m,2))
        L.front(a0,a1,b+0.02,56,57,Tex(int((a1-a0)*32),1,'DARK',3))
    if motor_c: motor(L,0.25,0.25,motor_c)
@asset('rumah_kampung_a','kampung',3,3.2,190,note='rumah kampung: tembok krem pudar, genteng, pagar besi hijau, pot hijau')
def rka(L): house(L,3,3.2,'CREAM','TERRA',seed=1)
@asset('rumah_kampung_b','kampung',3,3.2,190,note='rumah kampung: tembok biru pudar, atap seng, jemuran')
def rkb(L): house(L,3,3.2,'FBLUE','SENG',seed=2,fence=None,jemuran=True)
@asset('rumah_kampung_c','kampung',3,3.2,280,note='rumah 2 lantai sempit: tembok pink pudar, genteng, pagar')
def rkc(L): house(L,3,3.2,'FPINK','TERRA',F=2,seed=3,fence='BAGK')
@asset('rumah_kampung_d','kampung',4,3.2,190,note='rumah kampung: tembok hijau pudar, genteng, motor parkir, pagar')
def rkd(L): house(L,4,3.2,'FTEAL','TERRA',seed=4,fence='CONC',motor_c='RED',pots=True)
@asset('rumah_kampung_e','kampung',3,3.2,190,note='rumah setengah jadi: bata ekspos, atap seng, pot hijau')
def rke(L): house(L,3,3.2,'FYEL','SENG',seed=5,fence=None,brick=True)
@asset('pos_ronda','kampung',2,2,150,note='pos ronda: bale kayu, atap seng, kentongan')
def pos_ronda(L):
    L.top(0,0,2,2,0,lambda a,b:gangfloor(a,b),ground=True,shift=0)
    L.box(0.15,0.3,1.85,1.85,20,26,'WOOD',3,topf=lambda a,b:(np.full(a.shape,MI['WOOD'],np.int16),np.where((a*6)%1<0.15,2,3).astype(np.int8)))
    for a,b in [(0.15,0.3),(1.75,0.3),(0.15,1.75),(1.75,1.75)]: L.box(a,b,a+0.1,b+0.1,0,96,'WOOD',2)
    L.box(0.15,1.75,1.85,1.85,26,60,'WOOD',2,front=lambda w,h:Tex(w,h,'WOOD',2).rect(0,0,w,h,'WOOD',2).text(w//2,18,'POS RONDA','LITE',4).text(w//2,8,'RT 05','LITE',4))
    L.gable(0.0,0.15,2.0,2.0,90,118,'SENG')
    L.box(1.62,0.3,1.7,0.38,56,86,'WOOD',4)   # kentongan
    c,r=L.cr(1,1); L.s.ellipse_shadow(c,r,40,10,dx=8)
# ---------------------------------------------------------------- gang structure
@asset('gapura_gang','gang',3,0.6,200,note='gapura mulut gang: GG. SIRIH II, RT 005 / RW 02, spanduk PASAR LOAK')
def gapura(L):
    L.top(0,0,3,0.6,0,lambda a,b:gangfloor(a,b),ground=True,shift=0)
    for a in (0.0,2.6):
        L.box(a,0.1,a+0.4,0.5,0,150,'WHITE',3,front=lambda w,h:Tex(w,h,'WHITE',3).rect(0,0,w,20,'RED',3).rect(0,h-10,w,h,'RED',3).rect(0,h-16,w,h-10,'WHITE',4))
        c,r=L.cr(a+0.2,0.3); L.s.dome(c,r,150,0.2,14,'RED',3)
    def beam(Wp,Hh):
        tx=Tex(Wp,Hh,'WHITE',4); tx.rect(0,0,Wp,3,'RED',3); tx.rect(0,Hh-3,Wp,Hh,'RED',3)
        tx.text(Wp//2,14,'GG. SIRIH II','RED',2,sc=1,bold=True); tx.text(Wp//2,5,'RT 005 / RW 02','DARK',2); return tx
    L.box(0.4,0.15,2.6,0.45,118,142,'WHITE',4,front=beam)
    def ban(Wp,Hh):
        tx=Tex(Wp,Hh,'TARPB',3); tx.rect(0,0,Wp,Hh,'YEL',4); tx.rect(0,0,Wp,2,'RED',3); tx.rect(0,Hh-2,Wp,Hh,'RED',3)
        tx.text(Wp//2,4,'PASAR LOAK','RED',2,sc=1,bold=True); return tx
    L.front(0.45,2.55,0.32,98,112,ban(int(2.1*32),14))
    for a in (0.45,2.55): L.front(a-0.02,a+0.02,0.32,98,118,Tex(2,20,'DARK',2))
@asset('tembok_gang_a','gang',2,0.3,90,note='tembok gang 2 sel: cat pudar, noda lumut, meteran listrik')
def tembok_a(L): tembok(L,'CREAM',1)
@asset('tembok_gang_b','gang',2,0.3,90,note='tembok gang 2 sel: bata ekspos sebagian, poster')
def tembok_b(L): tembok(L,'FTEAL',2,brick=True)
def tembok(L,m,seed,brick=False):
    def f(Wp,Hh):
        tx=Tex(Wp,Hh,m,3); rng=np.random.default_rng(seed)
        if brick:
            for v in range(0,30,4):
                for u in range((v//4%2)*4,Wp//2,8): tx.rect(u,v,u+7,v+3,'TERRA',2)
        for _ in range(7):
            u=int(rng.integers(0,Wp-10)); v=int(rng.integers(0,Hh-10)); tx.rect(u,v,u+int(rng.integers(4,12)),v+int(rng.integers(2,6)),m,2)
        tx.rect(0,0,Wp,6,'GREEN',1); 
        for u in range(0,Wp,5): tx.rect(u,6,u+2,6+int(rng.integers(1,6)),'GREEN',1)
        tx.rect(0,Hh-4,Wp,Hh,'CONC',3)
        if seed==1: tx.rect(Wp-18,34,Wp-8,48,'CONC',3); tx.rect(Wp-16,40,Wp-10,46,'LITE',3)
        else: tx.rect(10,30,26,52,'LITE',4); tx.text(18,42,'SEDOT','RED',2); tx.text(18,34,'WC','RED',2)
        return tx
    L.box(0,0,2,0.3,0,64,m,3,front=f)
def lorong(L,W,D,kind='lurus'):
    def f(a,b):
        m,t=gangfloor(a,b)
        if kind=='tikungan':
            gut=((a<0.25)&(b>0))|((b>D-0.25)&(a>0))
        elif kind=='ujung':
            gut=(a<0.25)|(a>W-0.25)
        else: gut=(a<0.25)|(a>W-0.25)
        m=np.where(gut,MI['WATER'],m).astype(np.int16); t=np.where(gut,np.where(H_(a,b)<20,2,1),t).astype(np.int8)
        lip=(np.abs(a-0.25)<0.04)|(np.abs(a-(W-0.25))<0.04) if kind!='tikungan' else (np.abs(a-0.25)<0.04)|(np.abs(b-(D-0.25))<0.04)
        m=np.where(lip,MI['CONC'],m).astype(np.int16); t=np.where(lip,3,t).astype(np.int8)
        return m,t
    L.top(0,0,W,D,0,f,ground=True,shift=0)
    if kind=='ujung':
        L.box(0,D-0.25,W,D,0,64,'CREAM',3,front=lambda w,h:Tex(w,h,'CREAM',3).rect(0,0,w,6,'GREEN',1).rect(w//2-10,20,w//2+10,44,'WOOD',2).rect(0,h-4,w,h,'CONC',3))
@asset('lorong_lurus','gang',2,4,20,note='modul lorong lurus 2x4 sel: cor beton retak + selokan kiri-kanan. _sw = memanjang arah r (masuk ke kanan-atas), _se = memanjang arah c')
def lorong_lurus(L): lorong(L,2,4)
@asset('lorong_ujung','gang',2,2,90,note='modul ujung lorong 2x2: selokan + tembok buntu dengan pintu kayu')
def lorong_ujung(L): lorong(L,2,2,'ujung')
@asset('lorong_tikungan','gang',2,2,20,note='modul tikungan lorong 2x2 (belok), selokan mengikuti sisi luar')
def lorong_tik(L): lorong(L,2,2,'tikungan')
# ---------------------------------------------------------------- props
@asset('tiang_listrik','prop',1,1,250,note='tiang listrik beton + palang + isolator + ujung kabel')
def tiang(L):
    c,r=L.cr(0.5,0.5); L.s.cyl(c,r,0,230,0.09,'CONC',3); L.s.ellipse_shadow(c,r,12,4,dx=6)
    L.box(0.05,0.45,0.95,0.55,212,218,'DARK',3)
    for a in (0.12,0.35,0.65,0.88): L.box(a,0.47,a+0.05,0.53,218,224,'LITE',3)
    L.box(0.42,0.6,0.62,0.7,150,176,'CONC',2)   # small box
    for a in (0.14,0.37,0.67,0.9):
        for k in range(18): L.pts(a+0.0*k,0.5+k*0.03,224-k*0.6,'DARK',1)
@asset('tiang_listrik_polos','prop',1,1,250,note='tiang listrik tanpa ujung kabel menjuntai (untuk tiang yang kabelnya digambar terpisah antar tiang; tidak ada kabel putus)')
def tiang_polos(L):
    c,r=L.cr(0.5,0.5); L.s.cyl(c,r,0,230,0.09,'CONC',3); L.s.ellipse_shadow(c,r,12,4,dx=6)
    L.box(0.05,0.45,0.95,0.55,212,218,'DARK',3)
    for a in (0.12,0.35,0.65,0.88): L.box(a,0.47,a+0.05,0.53,218,224,'LITE',3)
    L.box(0.42,0.6,0.62,0.7,150,176,'CONC',2)
@asset('tiang_trafo','prop',1,1,250,note='tiang listrik dengan trafo (gardu tiang)')
def trafo(L):
    tiang(L); L.box(0.2,0.62,0.8,0.95,150,190,'CONC',3,front=lambda w,h:Tex(w,h,'CONC',3).rect(2,4,w-2,6,'CONC',2).rect(4,10,10,16,'YEL',4))
    for a in (0.3,0.5,0.7): L.box(a,0.75,a+0.05,0.8,190,198,'LITE',3)
def kabel(L,n):
    for k in range(int(n*32)):
        t=k/(n*32); a=t*n
        for dz,m in ((0,'DARK'),(6,'DARK'),(-6,'BAGK')): L.pts(np.array([a]),np.array([0.5]),np.array([222+dz-28*4*t*(1-t)]),m,1)
@asset('kabel_4','prop',4,1,250,note='kabel listrik melendut antar tiang (4 sel), _sw sepanjang c, _se sepanjang r; z sambungan 222 px')
def kabel4(L): kabel(L,4)
@asset('bangku_plastik_merah','prop',1,1,40,oris=('sw','se','ne','nw'),note='bangku plastik merah')
def bpm(L): stool(L,0.35,0.35,'RED'); c,r=L.cr(0.5,0.5); L.s.ellipse_shadow(c,r,8,3,dx=2)
@asset('bangku_plastik_biru','prop',1,1,40,oris=('sw','se','ne','nw'),note='bangku plastik biru')
def bpb(L): stool(L,0.35,0.35,'TARPB'); c,r=L.cr(0.5,0.5); L.s.ellipse_shadow(c,r,8,3,dx=2)
@asset('kardus_tumpuk','prop',1,1,70,note='tumpukan kardus')
def kt(L): kardus(L,0.25,0.3,3,1); c,r=L.cr(0.45,0.45); L.s.ellipse_shadow(c,r,12,4,dx=4)
@asset('motor_parkir_hitam','prop',2,1,60,oris=('sw','se','ne','nw'),note='motor bebek/matic parkir, hitam (sumbu panjang searah muka)')
def mph(L): motor(L,0.3,0.35,'BAGK')
@asset('motor_parkir_merah','prop',2,1,60,oris=('sw','se','ne','nw'),note='motor parkir merah')
def mpm(L): motor(L,0.3,0.35,'RED')
@asset('pedagang_duduk_a','prop',1,1,80,oris=('sw','se','ne','nw'),note='pedagang duduk di bangku plastik (siluet sederhana, kaos hijau)')
def pda(L): person_seated(L,0.4,0.4,'TEAL',1)
@asset('pedagang_duduk_b','prop',1,1,80,oris=('sw','se','ne','nw'),note='pedagang duduk (kaos biru, bangku biru)')
def pdb(L): person_seated(L,0.4,0.4,'BLUE',2,'TARPB')
@asset('rak_gantung_tas','prop',1,0.6,120,note='rak gantung tas berdiri (bisa disusun)')
def rgt(L):
    L.box(0.05,0.3,0.95,0.4,0,100,'WOOD',2,front=lambda w,h:(lambda tx:(bag_panel(tx,1,4,w-1,h-2,12),tx)[1])(Tex(w,h,'DARK',3)))
    for a in (0.05,0.85): L.box(a,0.1,a+0.1,0.5,0,4,'DARK',3)
@asset('papan_jam_dinding','prop',1,0.6,120,note='papan pajang jam dinding berdiri')
def pjd(L):
    L.box(0.05,0.3,0.95,0.4,0,100,'WOOD',2,front=lambda w,h:(lambda tx:(clock_panel(tx,1,8,w-1,h-2,13),tx)[1])(Tex(w,h,'WOOD',2)))
    for a in (0.05,0.85): L.box(a,0.1,a+0.1,0.5,0,4,'WOOD',2)
@asset('nampan_jam_tangan','prop',1,1,40,note='meja kaca kecil berisi jam tangan')
def njt(L): L.box(0.15,0.25,0.85,0.75,0,28,'WOOD',2,topf=goods_top('watch',3)); L.box(0.15,0.25,0.85,0.75,28,31,'GLASS',4,topf=goods_top('watch',3))
@asset('meja_mainan','prop',1,1,40,note='meja kecil berisi mainan')
def mm(L): L.box(0.15,0.25,0.85,0.75,0,28,'WOOD',2,topf=goods_top('toys',3))
@asset('terpal_biru','prop',2,1.5,130,note='terpal biru di 4 tiang (pengisi atap lapak)')
def tb(L): tarp(L,0,0.1,2,1.4,96,118,'TARPB')
@asset('terpal_merah','prop',2,1.5,130,note='terpal merah')
def tm_(L): tarp(L,0,0.1,2,1.4,96,118,'RED')
@asset('terpal_oranye','prop',2,1.5,130,note='terpal oranye')
def to(L): tarp(L,0,0.1,2,1.4,96,118,'ORANGE')
@asset('pot_tanaman','prop',1,1,40,note='pot tanaman hijau (tanpa bunga)')
def pot(L):
    c,r=L.cr(0.5,0.5); L.s.cyl(c,r,0,16,0.18,'TERRA',3); L.s.cyl(c,r,14,16,0.2,'TERRA',4)
    rng=np.random.default_rng(5)
    for k in range(70):   # leaf clumps (green only)
        ang=rng.random()*6.28; rad=rng.random()*0.24; z=16+rng.random()*26*(1-rad*2.5)
        cc=c+rad*np.cos(ang); rr=r+rad*np.sin(ang); tone=3 if np.cos(ang)<0 and z>28 else (2 if z>22 else 1)
        L.s.dome(cc,rr,z,0.045,3,'GREEN',tone)
    L.s.ellipse_shadow(c,r,10,4,dx=3)
@asset('jemuran','prop',2,0.5,70,note='jemuran baju di tiang')
def jem(L):
    for a in (0.1,1.8): L.box(a,0.2,a+0.05,0.25,0,58,'CONC',3)
    cols=['RED','TARPB','YEL','LITE','PINK']
    for i,a in enumerate(np.arange(0.25,1.6,0.3)): L.front(a,a+0.22,0.22,30+(i%2)*6,56,Tex(8,26,cols[i%5],3).rect(0,0,8,3,cols[i%5],2))
    L.front(0.1,1.85,0.22,56,57,Tex(56,1,'DARK',3))
