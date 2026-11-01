from lib import *
def side_plain(m='WHITE',bands=(),wins=()):
    def f(W,H):
        tx=Tex(W,H,m,3)
        for (z0,z1,mm,t) in bands: tx.rect(0,z0,W,z1,mm,t)
        for (u,z,w,h) in wins: window(tx,int(u*W),z,w,h)
        return tx
    return f
def parking(a,b):
    m,t=pave(a,b)
    t=np.where((np.abs((a*1.6)%1-0.5)<0.03)&(b<1.15)&(b>0.15),4,t)
    return m,t
# v2 (1 Nov 2026): colours / layout corrected to the user's photo: single tall storey, white walls + columns, full glass front,
# brown wood-panel fascia with red / blue / yellow stripes (white seams), oval logo at the right end, black steel canopy with
# truss brackets, black chairs + tables outside, galon rack, yellow bin. v1 kept in ../jalan_besar/_prev_indomaret_v1/.
INDO_STRIPES=[(0,20,'WOOD',3),(20,21,'LITE',4),(21,27,'YEL',3),(27,28,'LITE',4),(28,34,'BLUE',2),(34,35,'LITE',4),(35,41,'RED',2),(41,42,'LITE',4),(42,48,'WOOD',3),(48,50,'DARK',2)]
def indo_fascia(tx,v0,Wp,logo=True,glow=True):
    for (z0,z1,m,t) in INDO_STRIPES: tx.rect(0,v0+z0,Wp,v0+z1,m,t,glow=glow and m in ('YEL','BLUE','RED','LITE'))
    for u in range(16,Wp,34):                                  # panel joints: dark seams in the wood, white seams across the stripes
        tx.rect(u,v0,u+1,v0+20,'WOOD',2); tx.rect(u,v0+42,u+1,v0+48,'WOOD',2); tx.rect(u,v0+21,u+1,v0+41,'LITE',4,glow=glow)
    for u in range(0,Wp,6): tx.rect(u,v0+3,u+3,v0+4,'WOOD',4)   # wood grain hint
    if logo:
        u1=Wp-6; u0=u1-46; tv0=v0+19; tv1=v0+44
        tx.rect(u0,tv0,u1,tv1,'RED',2,glow=glow); tx.rect(u0+2,tv0+2,u1-2,tv1-2,'LITE',4,glow=glow)
        for (uu,vv) in ((u0,tv0),(u1-1,tv0),(u0,tv1-1),(u1-1,tv1-1)): tx.rect(uu,vv,uu+1,vv+1,'CLEAR',None)
        tx.text(u0+4,tv0+8,'INDO','RED',2,sc=1,glow=glow,center=False,bold=True); tx.text(u0+4+tx.lastw+1,tv0+8,'MARET','BLUE',1,sc=1,glow=glow,center=False,bold=True)
    return tx
def indo_glass(tx,u0,u1,v0,v1,seed=2):
    tx.rect(u0,v0,u1,v1,'GLASS',3)
    tx.rect(u0,v1-12,u1,v1,'LITE',3,glow=True)                  # bright ceiling inside
    for vv in (v1-10,v1-6): tx.rect(u0+2,vv,u1-2,vv+1,'LITE',4,glow=True)   # ceiling light rows
    shelves(tx,u0+3,v0+4,u1-u0-6,30,seed=seed)                  # shelves seen through the glass (low)
    tx.rect(u0,v0+34,u1,v0+38,'GLASS',4)                        # reflection band
    for u in range(u0,u1,22): tx.rect(u,v0,u+2,v1,'DARK',2)     # mullions
    tx.rect(u0,v0,u1,v0+2,'DARK',2); tx.rect(u0,v1-1,u1,v1+1,'DARK',2); tx.rect(u1-2,v0,u1,v1,'DARK',2)
@asset('indomaret','jalan',6,6,250,note='minimarket 1 lantai tinggi (v2, sesuai foto): fasad kaca, papan kayu cokelat + garis merah/biru/kuning, logo oval, kanopi baja hitam, kursi/meja hitam di teras (pixel approximation)')
def indomaret(L):
    W,D=6,6; B=1.9; H=GF+44
    ground(L,0,0,W,D,parking)
    bshadow(L,0,B,W,D,H)
    def front(Wp,Hh):
        tx=Tex(Wp,Hh,'WHITE',3)
        G1=GF-24                                               # top of the glass
        indo_glass(tx,8,Wp//2-14,3,G1,seed=2)
        glassdoor(tx,Wp//2-6,30,G1-3); tx.rect(Wp//2-8,G1-3,Wp//2+26,G1,'DARK',2)
        indo_glass(tx,Wp//2+30,Wp-8,3,G1,seed=5)
        for u in (0,Wp//2-14,Wp//2+24,Wp-8): tx.rect(u,0,u+8 if u in (0,Wp-8) else u+6,G1+6,'WHITE',4 if u==0 else 3)   # white columns
        tx.rect(0,0,Wp,3,'CONC',2)
        indo_fascia(tx,Hh-50,Wp)
        return tx
    def side(Wp,Hh):
        tx=Tex(Wp,Hh,'WHITE',3); tx.rect(0,0,Wp,3,'CONC',2)
        tx.rect(Wp-30,6,Wp-6,40,'CONC',3)                        # louvred utility box (as photo, left)
        for v in range(9,38,3): tx.rect(Wp-28,v,Wp-8,v+1,'CONC',2)
        indo_fascia(tx,Hh-50,Wp,logo=False,glow=False)
        return tx
    L.box(0,B,W,D,0,H,'WHITE',3,front=front,side=side)
    # black steel canopy + truss brackets under the fascia
    L.box(0.05,B-0.75,W-0.05,B,GF-22,GF-19,'DARK',2)
    L.box(0.05,B-0.78,W-0.05,B-0.72,GF-24,GF-16,'DARK',1)
    for a in np.arange(0.35,W,0.75): L.box(a,B-0.72,a+0.05,B,GF-19,GF-17,'DARK',1); L.box(a,B-0.12,a+0.05,B,GF-17,GF-10,'DARK',1)
    roof_flat(L,0,B,W,D,H,ph=4,pm='WHITE'); ac_unit(L,1,4,H); ac_unit(L,1.7,4,H)
    # terrace furniture: black chairs + small round tables (left of the door), bins, galon rack, yellow bin
    for (a,b) in ((0.55,B-0.45),(1.55,B-0.45)):
        c,r=L.cr(a,b); L.s.cyl(c,r,0,26,0.03,'DARK',2); L.s.cyl(c,r,26,28,0.22,'DARK',3)
        for da in (-0.32,0.32):
            L.box(a+da-0.1,b-0.08,a+da+0.1,b+0.1,15,17,'DARK',2)
            L.box(a+da-0.1,b+0.08,a+da+0.1,b+0.1,17,32,'DARK',3)
            for (x,y) in ((-0.09,-0.07),(0.07,-0.07),(-0.09,0.07),(0.07,0.07)): L.box(a+da+x,b+y,a+da+x+0.02,b+y+0.02,0,15,'DARK',1)
    c,r=L.cr(3.05,B-0.2); L.s.cyl(c,r,0,24,0.1,'CONC',3); L.s.cyl(c,r,24,26,0.11,'DARK',2)
    for i in range(3):
        for j in range(2): c,r=L.cr(4.35+i*0.22,B-0.25+0*j); L.s.cyl(c,r,j*12,j*12+11,0.09,'BLUE',2+j)
    L.box(5.3,B-0.4,5.75,B-0.05,0,26,'YEL',3); L.box(5.28,B-0.42,5.77,B-0.03,26,28,'YEL',2)
    for a in (0.6,1.6,2.6): L.box(a,0.15,a+0.4,0.3,0,4,'CONC',2)   # wheel stops (motor parking)

def office_front(floors,glassm='OGLASS',wallm='CONC',name='',fins=False,lobby='LITE'):
    def f(Wp,Hh):
        tx=Tex(Wp,Hh,wallm,3)
        # lobby
        tx.rect(6,0,Wp-6,GF-12,'GLASS',2)
        for u in range(6,Wp-6,24): tx.rect(u,0,u+2,GF-12,'DARK',2)
        glassdoor(tx,Wp//2-18,36,70)
        tx.rect(Wp//2-18,70,Wp//2+18,GF-12,lobby,3,glow=True)
        tx.rect(0,GF-12,Wp,GF,wallm,2)
        if name: tx.text(Wp//2,GF-10,name,'LITE',4,sc=1,glow=True)
        for k in range(floors-1):
            z=GF+k*FH
            tx.rect(0,z,Wp,z+10,wallm,3); tx.rect(0,z+10,Wp,z+FH-6,glassm,2)
            tx.rect(0,z+FH-8,Wp,z+FH-6,glassm,1)
            rng=np.random.default_rng(k*7+floors)
            for u in range(0,Wp,16):
                tx.rect(u,z+10,u+(3 if fins else 1),z+FH-6,wallm if fins else 'DARK',3 if fins else 2)
                if rng.random()<0.28: tx.rect(u+3,z+14,u+13,z+FH-12,'WARM',3,glow=True)
                if rng.random()<0.35: tx.rect(u+4,z+FH-20,u+7,z+FH-10,glassm,4)
            tx.rect(0,z+FH-6,Wp,z+FH,wallm,4 if k%2 else 3)
        tx.rect(0,Hh-10,Wp,Hh,wallm,4)
        return tx
    return f
def office_side(floors,glassm='OGLASS',wallm='CONC'):
    def f(Wp,Hh):
        tx=Tex(Wp,Hh,wallm,3)
        for k in range(floors-1):
            z=GF+k*FH; tx.rect(10,z+10,Wp-10,z+FH-6,glassm,2)
            for u in range(10,Wp-10,16): tx.rect(u,z+10,u+1,z+FH-6,'DARK',2)
        tx.rect(10,6,Wp-10,GF-14,'GLASS',2); return tx
    return f
@asset('kantor_a','jalan',7,6,600,note='gedung perkantoran 5 lantai, kaca biru + pita beton')
def kantor_a(L):
    W,D,B,F=7,6,1.25,5; H=GF+(F-1)*FH+10
    ground(L,0,0,W,D); bshadow(L,0,B,W,D,H)
    L.box(0,B,W,D,0,H,'CONC',3,front=office_front(F,name='MENARA SIRIH'),side=office_side(F))
    # entrance canopy
    L.box(2.2,B-0.9,4.8,B,GF-20,GF-14,'DARK',3)
    for a in (2.35,4.55): L.box(a,B-0.85,a+0.1,B-0.75,0,GF-20,'CONC',4)
    roof_flat(L,0,B,W,D,H,ph=10,pm='CONC'); L.box(0.6,3.2,2.6,5.4,H,H+30,'CONC',2); ac_unit(L,4,3,H); ac_unit(L,4.7,3,H); ac_unit(L,5.4,3,H)
    # name stone + flag pole
    L.box(0.3,0.25,1.6,0.5,0,14,'CONC',2,front=lambda w,h:Tex(w,h,'DARK',3).text(w//2,4,'MS','GOLD',3))
@asset('kantor_b','jalan',6,6,860,note='gedung perkantoran 8 lantai, sirip vertikal, mahkota atap')
def kantor_b(L):
    W,D,B,F=6,6,1.25,8; H=GF+(F-1)*FH+10
    ground(L,0,0,W,D); bshadow(L,0,B,W,D,H)
    L.box(0,B,W,D,0,H,'WHITE',3,front=office_front(F,'GLASS','WHITE','GRAHA KS',fins=True),side=office_side(F,'GLASS','WHITE'))
    L.box(1.6,B-0.8,4.4,B,GF-20,GF-14,'WHITE',3)
    roof_flat(L,0,B,W,D,H,ph=12,pm='WHITE'); L.box(1,2.5,5,5.4,H,H+40,'WHITE',2,front=lambda w,h:Tex(w,h,'WHITE',3).rect(0,24,w,32,'GLASS',2))
    L.box(4.5,3.2,4.6,3.3,H+40,H+80,'CONC',4)
@asset('bank_bca','jalan',6,6,330,note='bank BCA: biru, papan BCA (pixel approximation), galeri ATM')
def bank_bca(L):
    W,D,B=6,6,1.25; H=GF+2*FH+8
    ground(L,0,0,W,D); bshadow(L,0,B,W,D,H)
    def front(Wp,Hh):
        tx=Tex(Wp,Hh,'WHITE',3)
        tx.rect(0,0,Wp,GF,'BLUE',2)
        tx.rect(10,4,Wp-70,GF-20,'GLASS',2)
        for u in range(10,Wp-70,20): tx.rect(u,4,u+1,GF-20,'DARK',2)
        glassdoor(tx,40,30,70)
        # ATM gallery
        tx.rect(Wp-62,4,Wp-8,GF-20,'LITE',3,glow=True)
        for i in range(3):
            u=Wp-58+i*17; tx.rect(u,4,u+13,56,'CONC',3,glow=True); tx.rect(u+2,34,u+11,44,'BLUE',3,glow=True); tx.rect(u+3,26,u+10,28,'DARK',2,glow=True)
        tx.text(Wp-35,GF-30,'ATM','BLUE',2,glow=True)
        for k in range(2):
            z=GF+k*FH
            for i in range(5): window(tx,10+i*36,z+22,24,46,glass='OGLASS')
        tx.rect(0,GF,Wp,GF+6,'BLUE',3)
        return tx
    L.box(0,B,W,D,0,H,'WHITE',3,front=front,side=side_plain('WHITE',[(0,GF,'BLUE',2),(GF,GF+6,'BLUE',3)],[(0.3,GF+22,24,46),(0.65,GF+22,24,46),(0.3,GF+FH+22,24,46),(0.65,GF+FH+22,24,46)]))
    # big BCA sign box on the roof edge
    def sign(Wp,Hh):
        tx=Tex(Wp,Hh,'BLUE',3); tx.rect(0,0,Wp,Hh,'BLUE',3,glow=True); tx.rect(2,2,Wp-2,Hh-2,'BLUE',2,glow=True)
        tx.text(Wp//2,8,'BCA','LITE',4,sc=4,glow=True,bold=True); return tx
    L.box(1.5,B+0.1,4.5,B+0.35,H,H+40,'BLUE',3,front=sign,side=lambda w,h:Tex(w,h,'BLUE',2))
    def sign2(Wp,Hh):
        tx=Tex(Wp,Hh,'LITE',4); tx.rect(0,0,Wp,Hh,'LITE',4,glow=True); tx.text(Wp//2,4,'BANK BCA','BLUE',2,glow=True); return tx
    L.box(0.2,B-0.1,3.4,B,GF-18,GF-4,'LITE',4,front=sign2)
    roof_flat(L,0,B,W,D,H,ph=8,pm='WHITE'); ac_unit(L,1,4.6,H); ac_unit(L,1.7,4.6,H)
    # ATM drive-up stand + security post
    L.box(4.8,0.3,5.4,0.75,0,52,'BLUE',3,front=lambda w,h:Tex(w,h,'BLUE',3).rect(3,26,w-3,38,'LITE',4,glow=True).text(w//2,42,'ATM','LITE',4,glow=True))
@asset('masjid','jalan',9,7,420,note='masjid: kubah hijau, menara, gerbang + pagar, tanpa figur')
def masjid(L):
    W,D=9,7; Bf=1.6; H=118
    ground(L,0,0,W,D)
    # courtyard paving lighter
    L.top(0.2,0.2,W-0.2,Bf,0,lambda a,b:pave(a,b,4,0.5),ground=True,shift=0)
    bshadow(L,1,Bf,8,D,H+70)
    def front(Wp,Hh):
        tx=Tex(Wp,Hh,'WHITE',3)
        n=7; step=(Wp-16)//n
        for i in range(n):
            u=8+i*step; w=step-8
            tx.rect(u,0,u+w,70,'GLASS',2)
            for k in range(w//2+1):  # pointed arch top
                hh=int((k/(w/2))**0.6*12)
                tx.rect(u+k,70,u+k+1,70+hh,'GLASS',2); tx.rect(u+w-1-k,70,u+w-k,70+hh,'GLASS',2)
            tx.rect(u-2,0,u,84,'TEAL',2)
            if i==n//2: tx.rect(u,0,u+w,60,'WOOD',2); tx.rect(u+w//2,0,u+w//2+1,60,'WOOD',1)
        tx.rect(0,Hh-14,Wp,Hh-8,'TEAL',3); tx.rect(0,Hh-8,Wp,Hh,'WHITE',4)
        for u in range(4,Wp,10): tx.rect(u,Hh-20,u+5,Hh-14,'TEAL',2)
        tx.rect(0,0,Wp,4,'CONC',3)
        return tx
    L.box(1,Bf+0.8,8,D,0,H,'WHITE',3,front=front,side=side_plain('WHITE',[(H-14,H-8,'TEAL',3),(0,4,'CONC',3)],[(0.3,30,20,40),(0.7,30,20,40)]))
    # serambi (porch) columns + roof slab
    for a in np.linspace(1.15,7.7,6): L.box(a,Bf,a+0.18,Bf+0.18,0,92,'WHITE',4)
    L.box(1,Bf,8,Bf+0.8,92,100,'WHITE',3,front=lambda w,h:Tex(w,h,'TEAL',3))
    L.top(1,Bf,8,Bf+0.8,0,('CREAM',4),ground=True,shift=0)
    roof_flat(L,1,Bf+0.8,8,D,H,ph=6,pm='WHITE')
    # drum + dome
    c,r=L.cr(4.5,4.3); L.s.cyl(c,r,H,H+26,1.55,'WHITE',3)
    for k in range(16):
        ang=k/16*2*np.pi; L.s.points(c+1.56*np.cos(ang)+np.zeros(30),r+1.56*np.sin(ang)+np.zeros(30),H+8+np.linspace(0,12,30),'TEAL',2)
    L.s.dome(c,r,H+26,1.62,78,'TEAL',3,onion=0.18)
    L.s.cyl(c,r,H+104,H+112,0.08,'GOLD',3); L.s.dome(c,r,H+112,0.14,6,'GOLD',3)
    L.s.points(c+np.zeros(10),r,H+118+np.arange(10),'GOLD',3)
    # minaret (right-front corner in local frame)
    mc,mr=L.cr(8.3,2.8); L.s.box(mc-0.45,mr-0.45,mc+0.45,mr+0.45,0,40,'WHITE',3)
    L.s.cyl(mc,mr,40,300,0.34,'WHITE',3,tf=lambda P_,Z,mm,t:(np.where(((Z//50)%2==1)&(Z%50<6),MI['TEAL'],mm).astype(np.int16),t))
    L.s.cyl(mc,mr,300,306,0.5,'TEAL',3); L.s.cyl(mc,mr,306,330,0.3,'WHITE',3,tf=lambda P_,Z,mm,t:(np.where((P_*4//np.pi)%2==0,MI['GLASS'],mm).astype(np.int16),t))
    L.s.dome(mc,mr,330,0.36,30,'TEAL',3,onion=0.25); L.s.points(mc+np.zeros(12),mr,362+np.arange(12),'GOLD',3)
    L.s.ellipse_shadow(mc,mr,26,8,dx=10)
    # fence + gate (gapura) on the street edge
    for a0,a1 in [(0.15,3.6),(5.4,8.85)]:
        L.box(a0,0.15,a1,0.3,0,10,'WHITE',3)
        for a in np.arange(a0,a1,0.25): L.box(a,0.19,a+0.04,0.26,10,34,'TEAL',2)
        L.box(a0,0.15,a1,0.3,34,37,'TEAL',3)
    for a in (3.6,5.2):
        L.box(a,0.1,a+0.3,0.4,0,74,'WHITE',3)
        cc_,rr_=L.cr(a+0.15,0.25); L.s.dome(cc_,rr_,74,0.2,12,'TEAL',3)
    def gate(Wp,Hh):
        tx=Tex(Wp,Hh,'WHITE',3)
        for u in range(Wp):
            x=(u-Wp/2)/(Wp/2); top=int(Hh-12-(1-x*x)**0.5*0)  # flat
        tx.rect(0,0,Wp,10,'TEAL',3); tx.text(Wp//2,1,'AL-IKHLAS','LITE',4,glow=False)
        return tx
    L.box(3.9,0.12,5.2,0.38,62,74,'WHITE',3,front=gate)
@asset('kafe_blue_doors','jalan',5,5,240,note='kafe kekinian: pintu-pintu biru, kursi luar (pixel approximation)')
def kafe(L):
    W,D,B=5,5,1.4; H=GF+FH-4
    ground(L,0,0,W,D,lambda a,b:pave(a,b,3,0.5)); bshadow(L,0,B,W,D,H)
    def front(Wp,Hh):
        tx=Tex(Wp,Hh,'WHITE',4)
        n=4; step=Wp//n
        for i in range(n):
            u=i*step+8; w=step-16
            tx.rect(u-2,0,u+w+2,82,'DOOR',1)
            tx.rect(u,0,u+w,78,'DOOR',3); tx.rect(u+2,40,u+w-2,74,'WARM',3,glow=True)
            tx.rect(u+w//2,0,u+w//2+1,78,'DOOR',1); tx.rect(u+3,8,u+w-3,34,'DOOR',2)
            for k in range(w//2+2):   # round arch top
                hh=int(((1-((k-(w/2+1))/(w/2+1))**2)**0.5)*8)
                tx.rect(u-1+k,82,u+k,82+hh,'DOOR',1)
            tx.rect(u+w//2-4,46,u+w//2-2,50,'GOLD',4)
        tx.rect(0,GF-4,Wp,GF,'CONC',4)
        for i in range(3): window(tx,14+i*52,GF+24,30,38,glass='GLASS',frame='DOOR')
        tx.rect(0,Hh-6,Wp,Hh,'WHITE',4)
        return tx
    L.box(0,B,W,D,0,H,'WHITE',4,front=front,side=side_plain('WHITE',[(0,4,'CONC',3)],[(0.4,GF+24,30,38)]))
    def sign(Wp,Hh):
        tx=Tex(Wp,Hh,'DOOR',2); tx.rect(0,0,Wp,Hh,'DOOR',2,glow=True); tx.text(Wp//2,3,'BLUE DOORS','LITE',4,glow=True); return tx
    L.box(1.2,B-0.1,3.8,B,GF+2,GF+14,'DOOR',2,front=sign)
    # awning stripes
    L.box(0.1,B-0.5,W-0.1,B,GF-10,GF-6,'DOOR',3,front=lambda w,h:Tex(w,h,'DOOR',3),topf=lambda a,b:(np.full(a.shape,MI['WHITE'],np.int16),np.where((a*6)%1<0.5,3,2).astype(np.int8)))
    roof_flat(L,0,B,W,D,H,ph=6,pm='WHITE'); ac_unit(L,3.5,4,H)
    # outdoor tables + chairs
    for a in (0.8,2.3,3.8):
        c,r=L.cr(a,0.7); L.s.cyl(c,r,0,24,0.04,'DARK',3); L.s.cyl(c,r,24,26,0.28,'WOOD',3)
        for da in (-0.42,0.42):
            L.box(a+da-0.12,0.58,a+da+0.12,0.82,0,14,'DOOR',3); L.box(a+da-0.12,0.78 if da<0 else 0.58,a+da+0.12,0.82 if da<0 else 0.62,14,30,'DOOR',2)
        L.s.ellipse_shadow(c,r,12,4,dx=4)
    for a in (0.15,4.6):
        c,r=L.cr(a+0.12,1.15); L.s.box(c-0.12,r-0.12,c+0.12,r+0.12,0,12,'CONC',2)
        for k in range(30):
            ang=k*2.4; rad=0.04+0.12*(k%5)/5
            L.s.points(c+rad*np.cos(ang),r+rad*np.sin(ang),12+k%12+np.zeros(1),'GREEN',2+k%3)
@asset('hotel','jalan',8,6,620,note='hotel 6 lantai, balkon, papan HOTEL vertikal, porte-cochere')
def hotel(L):
    W,D,B,F=8,6,1.5,6; H=GF+(F-1)*FH+10
    ground(L,0,0,W,D); bshadow(L,0,B,W,D,H)
    def front(Wp,Hh):
        tx=Tex(Wp,Hh,'CREAM',3)
        tx.rect(20,0,Wp-20,GF-14,'GLASS',2); glassdoor(tx,Wp//2-20,40,72)
        tx.rect(20,72,Wp-20,GF-14,'WARM',3,glow=True)
        for u in range(20,Wp-20,22): tx.rect(u,0,u+2,GF-14,'GOLD',2)
        for k in range(F-1):
            z=GF+k*FH
            for i in range(6):
                u=14+i*38; lit=((i*3+k*5)%7)<3
                window(tx,u,z+18,26,52,lit=lit,frame='WOOD',sill=None)
                tx.rect(u-4,z+8,u+30,z+12,'CREAM',4); tx.rect(u-4,z+12,u+30,z+28,'DARK',3)
                for x in range(u-4,u+30,3): tx.rect(x,z+12,x+1,z+28,'DARK',4)
        tx.rect(0,Hh-12,Wp,Hh,'CREAM',4)
        return tx
    L.box(0,B,W,D,0,H,'CREAM',3,front=front,side=side_plain('CREAM',[(0,4,'CONC',3)],[(0.3,GF+30,22,46),(0.7,GF+30,22,46),(0.3,GF+FH+30,22,46),(0.7,GF+FH+30,22,46),(0.3,GF+2*FH+30,22,46),(0.7,GF+2*FH+30,22,46),(0.3,GF+3*FH+30,22,46),(0.7,GF+3*FH+30,22,46),(0.3,GF+4*FH+30,22,46),(0.7,GF+4*FH+30,22,46)]))
    # porte-cochere
    L.box(2.3,0.35,5.7,B,GF-12,GF-2,'CREAM',4,front=lambda w,h:Tex(w,h,'GOLD',2).text(w//2,2,'HOTEL SIRIH','LITE',4,glow=True))
    for a in (2.45,5.45): L.box(a,0.45,a+0.15,0.6,0,GF-12,'CREAM',4)
    # vertical HOTEL sign on the left corner
    def vs(Wp,Hh):
        tx=Tex(Wp,Hh,'RED',2); tx.rect(0,0,Wp,Hh,'RED',2,glow=True)
        for i,ch in enumerate('HOTEL'): tx.text(Wp//2,Hh-16-i*16,ch,'LITE',4,sc=2,glow=True)
        return tx
    L.box(0.2,B-0.25,0.65,B,GF+60,GF+150,'RED',2,front=vs,side=lambda w,h:Tex(w,h,'RED',1))
    roof_flat(L,0,B,W,D,H,ph=10,pm='CREAM'); L.box(5,3,7,5,H,H+24,'CREAM',2); toren(L,1.5,4.5,H,'BLUE'); toren(L,2.4,4.5,H,'BLUE')
@asset('mall','jalan',12,7,460,note='mal 4 lantai, atrium kaca, panel iklan, papan SIRIH MALL')
def mall(L):
    W,D,B=12,7,1.6; H=GF+3*100
    ground(L,0,0,W,D,lambda a,b:pave(a,b,3,1.0)); bshadow(L,0,B,W,D,H)
    def front(Wp,Hh):
        tx=Tex(Wp,Hh,'WHITE',2)
        for u in range(0,Wp,32): tx.rect(u,0,u+1,Hh,'WHITE',1)
        for z in range(GF,Hh,50): tx.rect(0,z,Wp,z+1,'WHITE',1)
        # shop windows ground
        for i in range(4):
            u=10+i*40; shelves(tx,u,6,30,60,seed=10+i)
        for i in range(4):
            u=Wp-170+i*40; shelves(tx,u,6,30,60,seed=20+i)
        # banners
        tx.rect(30,GF+60,90,GF+200,'PINK',2); tx.text(60,GF+170,'SALE','LITE',4,sc=2); tx.text(60,GF+150,'50%','LITE',4,sc=2)
        tx.rect(Wp-90,GF+60,Wp-30,GF+200,'TEAL',2); tx.text(Wp-60,GF+170,'NEW','LITE',4,sc=2); tx.rect(Wp-80,GF+80,Wp-40,GF+130,'YEL',3)
        tx.rect(0,0,Wp,3,'CONC',2)
        return tx
    L.box(0,B,W,D,0,H,'WHITE',2,front=front,side=side_plain('WHITE',[(0,3,'CONC',2)]))
    # glass atrium (central volume, protruding)
    def atr(Wp,Hh):
        tx=Tex(Wp,Hh,'OGLASS',2)
        for u in range(0,Wp,16): tx.rect(u,0,u+1,Hh,'DARK',3)
        for z in range(0,Hh,26): tx.rect(0,z,Wp,z+1,'DARK',3)
        for z in (GF,GF+100,GF+200): tx.rect(0,z,Wp,z+4,'CONC',3)
        tx.rect(0,0,Wp,GF-20,'LITE',3,glow=True); glassdoor(tx,Wp//2-24,48,70)
        for u in range(8,Wp,16): tx.rect(u,GF+20,u+6,GF+60,'WARM',3,glow=True)
        return tx
    L.box(4,B-0.6,8,B+1.5,0,H+20,'OGLASS',2,front=atr,side=lambda w,h:atr(w,h))
    def sign(Wp,Hh):
        tx=Tex(Wp,Hh,'DARK',2); tx.rect(0,0,Wp,Hh,'DARK',2); tx.text(Wp//2,6,'SIRIH MALL','WARM',3,sc=2,glow=True,bold=True); return tx
    L.box(3.8,B-0.75,8.2,B-0.6,H-50,H-20,'DARK',2,front=sign)
    L.box(3.4,0.2,8.6,B-0.6,GF-14,GF-6,'WHITE',3)
    for a in (3.5,8.35): L.box(a,0.3,a+0.15,0.45,0,GF-14,'CONC',4)
    roof_flat(L,0,B,W,D,H,ph=12,pm='WHITE'); L.top(4,B-0.6,8,B+1.5,H+20,('OGLASS',3))
    for a in (1,2,9.5,10.5): ac_unit(L,a,5.5,H)
@asset('ruko_a','jalan',3,6,330,note='ruko 3 lantai, rolling door, papan toko FOTOKOPI')
def ruko_a(L): ruko(L,3,'FOTOKOPI','YEL','CREAM',seed=1)
@asset('ruko_b','jalan',3,6,250,note='ruko 2 lantai, APOTEK')
def ruko_b(L): ruko(L,2,'APOTEK','TEAL','WHITE',seed=2)
@asset('ruko_c','jalan',3,6,330,note='ruko 3 lantai, warung kopi / RUMAH MAKAN')
def ruko_c(L): ruko(L,3,'RM PADANG','RED','FYEL',seed=3)
def ruko(L,F,txt,sm,wm,seed=0):
    W,D,B=3,6,1.2; H=GF+(F-1)*FH+8
    ground(L,0,0,W,D); bshadow(L,0,B,W,D,H)
    def front(Wp,Hh):
        tx=Tex(Wp,Hh,wm,3)
        if seed==1: rolling_door(tx,6,Wp-12,GF-30)
        else:
            shelves(tx,6,0,Wp-12,GF-34,seed=seed); tx.rect(Wp//2-12,0,Wp//2+12,GF-34,'GLASS',2)
        tx.rect(0,GF-30,Wp,GF-4,sm,2,glow=True); tx.rect(2,GF-28,Wp-2,GF-6,sm,3,glow=True)
        tx.text(Wp//2,GF-23,txt,'LITE',4,sc=1 if len(txt)>7 else 2,glow=True)
        for k in range(F-1):
            z=GF+k*FH
            window(tx,10,z+20,Wp-20,40,frame='DARK'); tx.rect(4,z+6,Wp-4,z+18,'DARK',3)
            for x in range(4,Wp-4,4): tx.rect(x,z+6,x+1,z+18,'DARK',4)
        tx.rect(0,Hh-6,Wp,Hh,wm,4)
        return tx
    L.box(0,B,W,D,0,H,wm,3,front=front,side=side_plain(wm,[(0,3,'CONC',2)]))
    L.box(0.1,B-0.5,W-0.1,B,GF-34,GF-30,'SENG',3,front=lambda w,h:Tex(w,h,'SENG',2))
    roof_flat(L,0,B,W,D,H,ph=6,pm=wm); toren(L,1.5,4.8,H,'ORANGE' if seed%2 else 'BLUE')
