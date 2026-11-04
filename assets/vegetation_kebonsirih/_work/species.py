import math
from veg import *

# ======================= TREES =======================
def asam(k=1.0,seed=11):
    s=Spr(360,320,180,290,seed); s.set_shadow(46*k+6)
    def tr():
        limb(s,[(0,0),(-5*k,-30*k),(9*k,-58*k),(8*k,-80*k)],18*k,9*k,'bark',wfn=lambda t:(19-10*t+(6 if t<0.05 else 3 if t<0.1 else 0))*k)
        limb(s,[(-6*k,1),(-12*k,2)],4*k,2,'bark'); limb(s,[(5*k,1),(11*k,3)],4*k,2,'bark')
        limb(s,[(6*k,-70*k),(-12*k,-98*k),(-44*k,-118*k)],7*k,3*k,'bark')
        limb(s,[(8*k,-78*k),(30*k,-100*k),(58*k,-120*k)],7*k,3*k,'bark')
        limb(s,[(8*k,-80*k),(10*k,-115*k),(4*k,-142*k)],6*k,3*k,'bark')
        limb(s,[(-20*k,-106*k),(-30*k,-140*k)],3*k,2,'bark')
    trunk_with_tuft(s,tr,22*k+3,8*k+3)
    cl=[(-46*k,-122*k,24*k,15*k),(-24*k,-146*k,26*k,18*k),(6*k,-158*k,30*k,18*k),(36*k,-142*k,30*k,18*k),
        (62*k,-120*k,20*k,12*k),(-62*k,-110*k,13*k,9*k),(14*k,-122*k,18*k,10*k),(-8*k,-126*k,12*k,8*k)]
    canopy(s,cl,'asam',br=max(3.0,4.6*k),droop=3)
    return s

def trembesi(k=1.0,seed=12):
    s=Spr(420,260,210,230,seed); s.set_shadow(58*k+6)
    def tr():
        limb(s,[(0,0),(-1,-20*k),(0,-38*k)],18*k,12*k,'bark',wfn=lambda t:(18-6*t+(5 if t<0.08 else 0))*k)
        for ex,ey in [(-70,-58),(-38,-70),(0,-74),(38,-70),(72,-58)]:
            limb(s,[(0,-34*k),(ex*0.45*k,-46*k),(ex*k,ey*k)],7*k,3*k,'bark')
    trunk_with_tuft(s,tr,26*k+3,9*k+3)
    cl=[]
    for i,x in enumerate(range(-80,81,20)): cl.append((x*k,(-64+abs(x)*0.06)*k,17*k,11*k))
    for x in range(-60,61,24): cl.append((x*k,-84*k,19*k,12*k))
    for x in (-24,0,24): cl.append((x*k,-100*k,18*k,10*k))
    canopy(s,cl,'saman',br=max(3.2,4.8*k))
    return s

def angsana(k=1.0,seed=13):
    s=Spr(340,300,170,270,seed); s.set_shadow(42*k+5)
    def tr():
        limb(s,[(0,0),(3*k,-30*k),(1*k,-56*k)],12*k,7*k,'barkg',wfn=lambda t:(12-5*t+(3 if t<0.07 else 0))*k)
        limb(s,[(1*k,-48*k),(-22*k,-70*k),(-40*k,-80*k)],5*k,2.5*k,'barkg'); limb(s,[(2*k,-50*k),(24*k,-72*k),(42*k,-82*k)],5*k,2.5*k,'barkg')
    trunk_with_tuft(s,tr,20*k+3,7*k+3)
    cl=[(-40*k,-82*k,20*k,14*k),(40*k,-84*k,20*k,14*k),(0*k,-80*k,22*k,13*k),(-24*k,-106*k,24*k,16*k),(24*k,-108*k,24*k,16*k),(0,-128*k,24*k,14*k)]
    canopy(s,cl,'leaf',br=max(2.8,4.3*k),droop=int(8*k)+2)
    return s

def mahoni(k=1.0,seed=14):
    s=Spr(300,320,150,290,seed); s.set_shadow(34*k+5)
    def tr():
        limb(s,[(0,0),(0,-40*k),(1*k,-72*k)],11*k,6*k,'bark',wfn=lambda t:(11-5*t+(3 if t<0.06 else 0))*k)
        limb(s,[(0,-58*k),(-18*k,-80*k)],4*k,2,'bark'); limb(s,[(1*k,-62*k),(18*k,-86*k)],4*k,2,'bark')
    trunk_with_tuft(s,tr,17*k+3,6*k+3)
    cl=[(-22*k,-76*k,16*k,12*k),(22*k,-78*k,16*k,12*k),(0,-72*k,14*k,8*k),(-18*k,-102*k,20*k,16*k),(18*k,-104*k,20*k,16*k),(0,-126*k,22*k,16*k),(0,-146*k,14*k,9*k),(0,-94*k,16*k,14*k)]
    canopy(s,cl,'dark',br=max(2.6,3.6*k))
    return s

def ketapang():
    s=Spr(240,280,120,250,15); s.set_shadow(30)
    def tr(): limb(s,[(0,0),(0,-140)],6,3,'barkg',wfn=lambda t:6-3*t+(2 if t<0.05 else 0))
    trunk_with_tuft(s,tr,16,6)
    tiers=[(-38,48,8),(-64,42,7),(-88,34,6),(-110,26,6),(-128,17,5),(-141,9,4)]
    for y,w,h in tiers:
        limb(s,[(0,y+2),(-w*0.8,y+3)],2,1,'barkg'); limb(s,[(0,y+2),(w*0.8,y+3)],2,1,'barkg')
    for y,w,h in tiers:
        canopy(s,[(-w*0.45,y,w*0.55,h),(w*0.45,y,w*0.55,h),(0,y-2,w*0.4,h*0.8)],'fresh',br=2.4,gbox=(-48,48,-150,-30))
    return s

def beringin():
    s=Spr(380,320,190,290,16); s.set_shadow(62)
    def tr():
        for dx,w in [(-8,9),(0,12),(9,8)]: limb(s,[(dx,0),(dx*0.6,-30),(dx*0.3,-60)],w,w*0.6,'barkg')
        for x in range(-62,64,5):
            if abs(x)<14 or s.rng.random()<0.45: continue
            top=-62-abs(x)*0.15; L=int((-top)*(0.15+s.rng.random()*0.5)) if abs(x)>24 or s.rng.random()<0.5 else int(-top)
            for j in range(L): s.put(x+(1 if j%9>6 else 0),top+j,'barkg',2 if x<0 else 1)
            if L>-top-4: s.put(x,0,'barkg',1)
    trunk_with_tuft(s,tr,30,10)
    cl=[(x,-70-abs(x)*0.05,17,11) for x in range(-66,67,22)]+[(x,-96,20,15) for x in range(-50,51,25)]+[(x,-124,21,14) for x in (-28,0,28)]+[(0,-144,18,9)]
    canopy(s,cl,'dark',br=4.4,droop=4)
    return s

def kiara():
    s=Spr(260,220,130,195,17); s.set_shadow(36)
    def tr():
        limb(s,[(0,0),(0,-30)],9,6,'bark'); limb(s,[(0,-26),(-16,-42)],4,2,'bark'); limb(s,[(0,-26),(16,-42)],4,2,'bark')
    trunk_with_tuft(s,tr,18,7)
    cl=[(x,-44+abs(x)*0.12,15,9) for x in range(-36,37,18)]+[(x,-64,17,12) for x in (-24,0,24)]+[(0,-84,20,10)]
    canopy(s,cl,'kiara',br=2.8,jit=0.25)
    return s

def flamboyan():
    s=Spr(360,240,180,215,18); s.set_shadow(48)
    def tr():
        limb(s,[(0,0),(-2,-24),(0,-42)],11,7,'barkg',wfn=lambda t:11-4*t+(3 if t<0.08 else 0))
        for ex,ey in [(-66,-64),(-30,-78),(30,-80),(66,-66)]: limb(s,[(0,-40),(ex*0.5,-52),(ex,ey)],5,2.5,'barkg')
    trunk_with_tuft(s,tr,22,8)
    cl=[(x,-72+abs(x)*0.08,18,10) for x in range(-66,67,22)]+[(x,-90,20,10) for x in (-40,-13,13,40)]+[(0,-102,18,7)]
    b=canopy(s,cl,'fresh',br=3.0)
    flowers(s,b,'flam',frac=0.42,r=2.3,cut=-76)
    return s

def tabebuya():
    s=Spr(240,260,120,235,19); s.set_shadow(28)
    def tr():
        limb(s,[(0,0),(2,-40),(-1,-66)],7,4,'barkg')
        limb(s,[(1,-56),(-20,-80),(-28,-100)],3,2,'barkg'); limb(s,[(0,-60),(18,-84),(24,-106)],3,2,'barkg'); limb(s,[(-1,-64),(2,-120)],3,2,'barkg')
    trunk_with_tuft(s,tr,14,6)
    cl=[(-28,-90,15,13),(24,-96,15,14),(0,-112,18,14),(-12,-128,12,8),(14,-126,11,8),(0,-78,9,6)]
    b=canopy(s,cl,'fresh',br=2.6,dens=0.75,fill_t=1)
    flowers(s,b,'tabeb',frac=0.85,r=2.6)
    return s

def palem():
    s=Spr(220,300,110,275,20); s.set_shadow(20)
    def tr():
        limb(s,[(0,0),(1,-70),(0,-150)],8,6,'palm',bark=False,wfn=lambda t:8+3.5*math.sin(t*math.pi)*(t<0.6)+(2 if t<0.04 else 0)-2*t)
        for y in range(-146,-8,7):
            for x in range(-5,6):
                if s.get(x,y)>=0: s.put(x,y,'palm',2 if x<0 else 1)
        limb(s,[(0,-150),(0,-176)],7,6,'leaf',bark=False,tb=2.6)
    trunk_with_tuft(s,tr,12,5)
    top=(0,-178)
    for ang,L,drop in [(-170,40,26),(-140,38,14),(-115,30,2),(-90,24,-4),(-65,30,2),(-40,38,14),(-10,40,26),(-155,30,32),(-25,30,32),(150,22,30),(30,22,30)]:
        a=math.radians(ang); ex=top[0]+math.cos(a)*L; ey=top[1]+math.sin(a)*L*0.55+drop
        mx=top[0]+math.cos(a)*L*0.55; my=top[1]+math.sin(a)*L*0.4-8
        pts=[top,(mx,my),(ex,ey)]
        n=int(L*1.3)
        for i in range(n):
            t=i/n; x,y=bez(pts,t); lw=int(round(5*(1-t)+1))
            for j in range(1,lw+1):
                s.put(x,y+j,'leaf',3 if ang<-90 else 2); 
                if t>0.15: s.put(x,y-j*0.6,'leaf',4 if ang<-90 else 3)
            s.put(x,y,'leaf',1)
    return s

def bungur():
    s=Spr(260,260,130,235,21); s.set_shadow(32)
    def tr():
        limb(s,[(0,0),(-3,-30),(0,-52)],8,5,'barkg'); limb(s,[(0,-46),(-20,-62)],3,2,'barkg'); limb(s,[(0,-46),(20,-64)],3,2,'barkg')
    trunk_with_tuft(s,tr,16,6)
    cl=[(-26,-66,16,11),(26,-68,16,11),(0,-64,14,8),(-14,-88,20,14),(16,-90,20,14),(0,-108,18,10)]
    b=canopy(s,cl,'leaf',br=3.0)
    rng=s.rng
    for bx,by,_ in b:
        if by<-70 and rng.random()<0.33:
            h=rng.randint(5,8)
            for j in range(h):
                w=max(1,int((h-j)/2.6))
                for x in range(-w,w+1): s.put(bx+x,by-j,'bungur',3+(x<0)-(x>0)-(j==0))
    return s

def glodokan():
    s=Spr(140,300,70,270,22); s.set_shadow(16)
    def tr(): limb(s,[(0,0),(0,-20)],5,4,'bark')
    trunk_with_tuft(s,tr,10,4)
    cl=[(0,-24-i*14,7+6*math.sin(min(1,(i+1)/3)*math.pi/2)*(1-i/14),9) for i in range(11)]
    b=canopy(s,cl,'dark',br=2.4,droop=3,gbox=(-14,14,-180,-14))
    return s


# Additional endemic Indonesian timber species for Semesta.
# Same Spr / trunk_with_tuft / limb / canopy pipeline as the original trees.
def cendana():
    s=Spr(280,310,140,279,73); s.set_shadow(29)
    def tr():
        limb(s,[(0,0),(-2,-38),(2,-73),(0,-107)],8,3,'barkg')
        for ex,ey in [(-34,-81),(31,-93),(-28,-125),(29,-136),(1,-151)]:
            limb(s,[(0,-89),(ex*.54,ey*.88),(ex,ey)],3.7,1.2,'barkg')
    trunk_with_tuft(s,tr,16,6)
    cl=[(-31,-89,14,12),(29,-94,15,12),(-38,-118,14,13),
        (36,-124,15,13),(-16,-142,19,16),(17,-145,19,16),
        (1,-164,18,15),(-18,-111,17,12),(16,-116,18,12)]
    canopy(s,cl,'cendana',br=2.8,jit=.25)
    return s

def ulin():
    s=Spr(330,440,165,404,74); s.set_shadow(43)
    def tr():
        limb(s,[(0,0),(-3,-58),(3,-126),(2,-194)],19,8,'bark_ulin',
             wfn=lambda t:19-11*t+(8 if t<.05 else 3 if t<.15 else 0))
        for side in (-1,1):
            limb(s,[(0,-18),(side*12,-4),(side*25,2)],8,2.5,'bark_ulin')
        for ex,ey in [(-48,-161),(49,-172),(-33,-211),(30,-222),(1,-244)]:
            limb(s,[(1,-180),(ex*.53,ey*.9),(ex,ey)],6,2,'bark_ulin')
    trunk_with_tuft(s,tr,24,9)
    cl=[(-50,-166,22,17),(48,-177,22,17),(-41,-205,22,19),
        (38,-211,25,20),(-11,-228,25,20),(19,-234,24,20),
        (-23,-259,22,18),(22,-270,22,19),(0,-292,20,17),
        (0,-203,16,15)]
    canopy(s,cl,'ulin',br=3.5,droop=2)
    return s

def kayu_hitam():
    s=Spr(340,390,170,355,75); s.set_shadow(46)
    def tr():
        limb(s,[(0,0),(4,-54),(-1,-120),(2,-164)],17,7,'bark_eboni',
             wfn=lambda t:17-10*t+(6 if t<.06 else 0))
        for ex,ey in [(-51,-127),(54,-139),(-30,-184),(39,-197),(0,-218)]:
            limb(s,[(0,-151),(ex*.53,ey*.87),(ex,ey)],5,2,'bark_eboni')
    trunk_with_tuft(s,tr,24,8)
    cl=[(-53,-129,24,17),(51,-140,23,18),(-47,-168,25,19),
        (46,-179,26,20),(-17,-190,22,18),(19,-206,24,21),
        (-23,-228,22,18),(19,-245,21,17),(0,-267,19,16)]
    canopy(s,cl,'eboni',br=3.8)
    return s

def tengkawang():
    s=Spr(360,430,180,390,76); s.set_shadow(49)
    def tr():
        limb(s,[(0,0),(-1,-60),(2,-132),(1,-181)],17,8,'bark',
             wfn=lambda t:17-9*t+(7 if t<.09 else 0))
        for side in (-1,1):
            limb(s,[(0,-17),(side*14,-4),(side*26,2)],7,2,'bark')
        for ex,ey in [(-62,-169),(59,-179),(-45,-215),(44,-221),(0,-250)]:
            limb(s,[(0,-165),(ex*.58,ey*.89),(ex,ey)],5.5,2,'bark')
    trunk_with_tuft(s,tr,23,8)
    cl=[(-57,-172,25,19),(56,-182,26,19),(-40,-206,30,23),
        (37,-215,30,24),(-6,-201,25,20),(-38,-244,26,21),
        (34,-254,29,22),(-4,-269,30,24),(0,-301,22,18)]
    canopy(s,cl,'tengkawang',br=4.1)
    return s

def meranti():
    s=Spr(360,480,180,445,77); s.set_shadow(45)
    def tr():
        limb(s,[(0,0),(2,-68),(-2,-147),(1,-241)],18,7,'bark',
             wfn=lambda t:18-11*t+(10 if t<.07 else 0))
        for side in (-1,1):
            limb(s,[(0,-16),(side*17,-2),(side*31,2)],8,2,'bark')
        for ex,ey in [(-50,-196),(49,-208),(-37,-253),(40,-273),(0,-309)]:
            limb(s,[(0,-225),(ex*.5,ey*.88),(ex,ey)],6,2,'bark')
    trunk_with_tuft(s,tr,22,7)
    cl=[(-53,-197,20,16),(50,-211,22,17),(-43,-245,22,18),
        (40,-259,24,17),(-10,-263,21,15),(19,-281,23,18),
        (-24,-306,24,19),(23,-318,23,17),(0,-341,20,16)]
    canopy(s,cl,'meranti',br=3.6,droop=2)
    return s

# ======================= SHRUBS / PLANTS =======================
def bush(clumps,m,br,seed,shadow,base=(16,6)):
    s=Spr(120,100,60,80,seed); s.set_shadow(shadow)
    back,front=tuft_base(s,*base,blades=0.6); blades(s,back)
    b=canopy(s,clumps,m,br=br); blades(s,front,hmax=4); return s,b

def bugenvil():
    s,b=bush([(-8,-12,11,9),(8,-13,11,9),(0,-22,12,9),(-3,-30,7,5)],'leaf',2.4,31,14,(17,6))
    flowers(s,b,'bougv',frac=0.6,r=2.2); return s
def pucuk_merah():
    s=Spr(100,100,50,80,32); s.set_shadow(12)
    back,front=tuft_base(s,13,5,blades=0.5); blades(s,back)
    b=canopy(s,[(0,-14,12,10),(0,-28,11,9),(0,-38,7,5)],'leaf',br=2.0,jit=0.2)
    cut=[(x,y,r) for x,y,r in b if y<-25]
    for bx,by,r in cut: disc_shaded(s,bx,by,r,'pucuk',gl=0.2)
    blades(s,front,hmax=3); return s
def soka():
    s,b=bush([(-9,-9,10,7),(9,-9,10,7),(0,-17,13,8)],'leaf',2.2,33,13,(17,7))
    rng=s.rng
    for bx,by,_ in b:
        if by<-6 and rng.random()<0.4: disc_shaded(s,bx,by-1,2.1,'ixora',gl=0.3)
    return s
def teh_tehan():   # clipped iso hedge, 1 tile along c (screen down-right)
    s=Spr(130,100,65,64,34)
    fp=[(-14,-13),(26,7),(14,13),(-26,-7)]          # ground footprint (o, o+u, o+u+v, o+v)
    s.sh_poly([(x+9,y+2) for x,y in fp]+[],0); s.sh_poly([(x+9,y+2) for x,y in [(-26,-7),(-14,-13),(26,7),(14,13)]],0)
    s.sh_poly([(-16,-14),(29,8),(15,15),(-29,-7)],1)
    back,front=tuft_base(s,31,13,blades=0.5); blades(s,back)
    # footprint: along c from (-16,-8)->(16,8) iso, width along r 0.35 tile
    h=16; rng=s.rng
    # draw by stacking: side faces then top
    def inpar(px,py,o,u,v):
        # parallelogram o + a*u + b*v , 0<=a,b<=1
        det=u[0]*v[1]-u[1]*v[0]; dx,dy=px-o[0],py-o[1]
        a=(dx*v[1]-dy*v[0])/det; b=(u[0]*dy-u[1]*dx)/det; return 0<=a<=1 and 0<=b<=1
    u=(40,20); v=(-12,6)   # c 1.25 tile, r 0.38 tile in px (iso)
    o=(-14,-13)
    for y in range(-50,30):
        for x in range(-45,45):
            n=rng.uniform(-0.45,0.45)
            if inpar(x,y,(o[0],o[1]-h),u,v): s.put(x,y,'kiara',3.4+n); continue
            if inpar(x,y,(o[0]+v[0],o[1]+v[1]-h),u,(0,h)): s.put(x,y,'kiara',1.6+n); continue   # front (SW-facing, long) face
            if inpar(x,y,(o[0]+u[0],o[1]+u[1]-h),v,(0,h)): s.put(x,y,'kiara',0.8+n); continue  # end (SE-facing) face
    for i in range(70):
        a=rng.random(); b=rng.random(); x=o[0]+a*u[0]+b*v[0]; y=o[1]+a*u[1]+b*v[1]-h
        s.put(x,y,'kiara',4); s.put(x+1,y,'kiara',4)
    blades(s,front,hmax=4)
    return s
def heliconia():
    s=Spr(120,120,60,100,35); s.set_shadow(14)
    back,front=tuft_base(s,14,5,blades=0.5); blades(s,back); rng=s.rng
    for ang,L in [(-125,40),(-100,46),(-80,44),(-58,38),(-140,30),(-40,30)]:
        a=math.radians(ang); bx=math.cos(a)*L*0.35; by=-L*0.55
        limb(s,[(0,0),(bx*0.5,by*0.5),(bx,by)],2,1.5,'leaf',bark=False,tb=2)
        ex=bx+math.cos(a)*L*0.4; ey=by+math.sin(a)*L*0.55
        for i in range(24):
            t=i/23; x=bx+(ex-bx)*t; y=by+(ey-by)*t; w=4.5*math.sin(t*math.pi)+0.6
            for j in range(-int(w),int(w)+1): s.put(x+j,y,'leaf',(3 if j<0 else 2)+(1 if j==-1 else 0))
    for hx0,hy0 in [(-6,-30),(7,-34)]:  # hanging lobster-claw bracts
        for i in range(6):
            x=hx0+(2 if i%2 else -1); y=hy0+i*3
            for dx in range(3): s.put(x+dx,y,'ixora',3-dx*0.7); s.put(x+dx,y+1,'yel',4-dx)
            s.put(hx0,y,'leaf',1)
    blades(s,front,hmax=3); return s
def lidah_mertua():
    s=Spr(80,90,40,70,36); s.set_shadow(10)
    back,front=tuft_base(s,10,4,blades=0.4); blades(s,back)
    for dx,h,lean in [(-6,26,-5),(-2,34,-2),(3,30,3),(7,22,6),(0,20,0),(-9,16,-6)]:
        for y in range(h):
            t=y/h; w=2.5*(1-t**2)+0.5; x=dx+lean*t
            for j in range(-int(w),int(w)+1):
                edge=abs(j)==int(w)
                band=(y%6)<2
                s.put(x+j,-y,'yel' if edge and h>20 else 'dark',(3 if edge else (3 if band else (2 if j<=0 else 1))))
    blades(s,front,hmax=2); return s
def talas():
    s=Spr(110,110,55,90,37); s.set_shadow(13)
    back,front=tuft_base(s,13,5,blades=0.5); blades(s,back)
    for lx,ly,w,dirx in [(-15,-28,9,-1),(15,-32,10,1),(-3,-44,11,-1),(5,-20,8,1)]:
        limb(s,[(0,0),(lx*0.4,ly*0.7),(lx,ly)],2,1.5,'fresh',bark=False,tb=2)
        # leaf blade: heart base at (lx,ly), tip hangs down-outward
        for i in range(int(w*2.2)):
            t=i/(w*2.2); cx=lx+dirx*t*w*0.9; cy=ly-w*0.5+t*w*2.0
            hw=w*0.85*math.sin(min(1,t*1.6+0.25)*math.pi*0.5)*(1-t)**0.6
            for x in range(-int(hw),int(hw)+1):
                if t<0.12 and abs(x)<2: continue
                tt=3.0-(x/max(1,hw))*1.1-t*0.6+s.rng.uniform(-.2,.2)
                if x==0 or (t>0.3 and abs(x)==int(hw*0.5) and i%3==0): tt=4
                s.put(cx+x,cy,'fresh',tt)
    blades(s,front,hmax=3); return s
def puring():
    s=Spr(100,100,50,80,38); s.set_shadow(12)
    back,front=tuft_base(s,13,5,blades=0.5); blades(s,back); rng=s.rng
    limb(s,[(0,0),(0,-14)],3,2,'bark')
    leaves=[]
    for i in range(40):
        a=rng.uniform(math.pi*1.05,math.pi*1.95); r=rng.uniform(4,14)
        leaves.append((math.cos(a)*r*1.1,-14+math.sin(a)*r*0.9+ rng.uniform(-3,6),a))
    leaves.sort(key=lambda l:-l[1])
    for x,y,a in leaves:
        m=rng.choice(['yel','pucuk','dark','dark','yel','ixora'])
        L=rng.randint(5,8); dx,dy=math.cos(a)*0.4+rng.uniform(-.5,.5),abs(math.sin(a))*0.5+0.4
        for j in range(L):
            w=1 if 1<j<L-2 else 0
            for q in range(-w,w+1): s.put(x+dx*j+q,y+dy*j,m,3-q+(1 if j<2 else 0)-(1 if m=='dark' else 0))
        s.put(x+dx*2,y+dy*2,'dark',1)
    blades(s,front,hmax=3); return s
def bakung():
    s=Spr(110,100,55,80,39); s.set_shadow(13)
    back,front=tuft_base(s,13,5,blades=0.4); blades(s,back); rng=s.rng
    for ang in range(-170,-5,16):
        a=math.radians(ang); L=rng.randint(18,26)
        pts=[(0,0),(math.cos(a)*L*0.5,-16),(math.cos(a)*L,-10+rng.randint(-2,6))]
        n=40
        for i in range(n):
            t=i/n; x,y=bez(pts,t); w=2 if t<0.7 else 1
            for j in range(w): s.put(x,y+j,'leaf',3 if j==0 else 2)
    limb(s,[(1,-6),(2,-30)],2,1.5,'fresh',bark=False)
    for i in range(9):
        a=math.radians(-180+i*22); 
        for j in range(5): s.put(2+math.cos(a)*j,-31+math.sin(a)*j*0.8,'white',4 if j<4 else 3)
    blades(s,front,hmax=2); return s
def andong():
    s=Spr(90,110,45,90,40); s.set_shadow(10)
    back,front=tuft_base(s,10,4,blades=0.4); blades(s,back); rng=s.rng
    for cx,h in [(-3,30),(4,22)]:
        limb(s,[(cx,0),(cx,-h)],3,2,'bamboo',bark=False)
        for ang in range(-175,0,14):
            a=math.radians(ang+rng.uniform(-5,5)); L=rng.randint(9,14)
            for j in range(L):
                t=j/L; x=cx+math.cos(a)*j; y=-h+math.sin(a)*j*0.7+ (t**2)*6
                s.put(x,y,'maroon',(3 if ang<-90 else 2)+(1 if j<3 else 0)); s.put(x,y+1,'maroon',1)
    blades(s,front,hmax=2); return s
def sirih():
    s=Spr(70,110,35,92,41); s.set_shadow(9)
    back,front=tuft_base(s,9,4,blades=0.4); blades(s,back); rng=s.rng
    for y in range(0,48):
        s.put(-1,-y,'bamboo',3); s.put(0,-y,'bamboo',2); s.put(1,-y,'bamboo',1)
        if y%12==0: s.put(-1,-y,'bamboo',4); s.put(0,-y,'bamboo',4); s.put(1,-y,'bamboo',3)
    for i in range(14):
        y=-4-i*3.2; side=-1 if i%2 else 1; x=side*4
        for yy in range(-3,4):
            hw=3.2*math.sqrt(max(0,1-(yy/3.6)**2))*(1 if yy<2 else 0.6)
            for xx in range(-int(hw),int(hw)+1): s.put(x+xx,y+yy,'leaf',(3 if xx<0 else 2)+(1 if yy==-2 and xx<0 else 0))
        s.put(side*1.5,y,'leaf',1)
    blades(s,front,hmax=2); return s
def lili_paris():
    s=Spr(80,60,40,45,42); s.set_shadow(10)
    rng=s.rng; tuft_base(s,10,4,blades=0.2)
    for ang in range(-175,-4,9):
        a=math.radians(ang+rng.uniform(-4,4)); L=rng.randint(9,13)
        pts=[(0,0),(math.cos(a)*L*0.5,-9),(math.cos(a)*L,-2+rng.randint(0,3))]
        for i in range(24):
            x,y=bez(pts,i/24); s.put(x,y,'white' if i%4<2 and i>4 else 'fresh',3); s.put(x,y+1,'fresh',2)
    return s

# ======================= GROUND TUFTS / PROPS =======================
def g_tuft(seed,rx,ry,h=(2,4),dens=1.4):
    s=Spr(60,40,30,28,seed); back,front=tuft_base(s,rx,ry,blades=dens); blades(s,back,hmin=h[0],hmax=h[1]); blades(s,front,hmin=h[0],hmax=h[1]); return s
def t_rumput_a(): return g_tuft(51,9,4)
def t_rumput_b(): return g_tuft(52,6,3,(3,5),2.0)
def t_ilalang():
    s=Spr(60,50,30,38,53); back,front=tuft_base(s,7,3,blades=0.2); rng=s.rng
    for i in range(16):
        x=rng.uniform(-6,6); h=rng.randint(7,13); lean=rng.uniform(-0.35,0.35)
        for j in range(h): s.put(x+lean*j,-j,'fresh' if j>h*0.4 else 'grass',3 if j<h-1 else 4)
    return s
def t_kacang_hias():
    s=g_tuft(54,11,5,(1,2),0.6); rng=s.rng
    for i in range(30):
        x=rng.uniform(-10,10); y=rng.uniform(-4,4)
        if (x/11)**2+(y/5)**2<0.85: s.put(x,y-1,'leaf',4); s.put(x+1,y-1,'leaf',3)
    for i in range(7):
        x=rng.uniform(-8,8); y=rng.uniform(-3,3); s.put(x,y-2,'yel',4); s.put(x+1,y-2,'yel',3)
    return s
def t_seruni():
    s=g_tuft(55,10,5,(1,3),0.7); rng=s.rng
    for i in range(6):
        x=rng.uniform(-8,8); y=rng.uniform(-3,3)
        for dx,dy in [(0,-1),(-1,0),(1,0),(0,1)]: s.put(x+dx,y-3+dy,'tabeb',3)
        s.put(x,y-3,'yel',1)
    return s
def t_daun_gugur():
    s=Spr(50,30,25,18,56); rng=s.rng
    for i in range(26):
        x=rng.uniform(-11,11); y=rng.uniform(-4,4)
        if (x/12)**2+(y/5)**2>1: continue
        m=rng.choice(['dry','dry','soil','soil']); s.put(x,y,m,rng.choice([2,3,4])); s.put(x+1,y,m,2)
    return s
def t_kerikil():
    s=Spr(50,30,25,18,57); s.set_shadow(7,3)
    for x,y,r in [(-4,-1,3),(3,0,2.2),(0,2,1.6),(6,-2,1.4)]: disc_shaded(s,x,y-r*0.6,r,'stone',ry=r*0.75,gl=0.3)
    return s
def t_tunggul():
    s=Spr(60,50,30,36,58); s.set_shadow(10)
    back,front=tuft_base(s,10,4,blades=0.8); blades(s,back)
    for y in range(0,9):
        for x in range(-6,7): s.put(x,-y,'bark',2.6-x*0.25)
    ell_fill(s,0,-9,6.5,3.2,'dry',4); ell_fill(s,0,-9,4,2,'dry',3); ell_fill(s,0,-9,1.5,0.8,'bamboo',2)
    blades(s,front); return s

def g_overlay(seed,kind):
    s=Spr(60,40,30,24,seed); rng=s.rng
    if kind.startswith('tuft'):
        rx,ry,n,h={'tuft_c':(5,2,10,(2,3)),'tuft_d':(12,4,26,(1,3)),'tuft_e':(4,2,9,(3,5)),'tuft_f':(8,3,18,(2,4))}[kind]
        for _ in range(int(rx*ry*1.2)):
            a=rng.uniform(0,6.28); r=math.sqrt(rng.random()); 
            if rng.random()<0.6: s.put(math.cos(a)*rx*r,math.sin(a)*ry*r,'grass',rng.choice([2,3,3]))
        pts=[(rng.uniform(-rx,rx)*0.9,rng.uniform(-ry,ry)) for _ in range(n)]
        blades(s,sorted(pts,key=lambda p:p[1]),hmin=h[0],hmax=h[1])
    elif kind=='clover':
        for _ in range(14):
            x=rng.uniform(-9,9); y=rng.uniform(-3.5,3.5)
            s.put(x,y+1,'grass',1); s.put(x,y,'grass',4); s.put(x+1,y,'grass',3); s.put(x,y-1,'grass',4)
    elif kind.startswith('dots'):
        m={'dots_putih':'white','dots_kuning':'tabeb','dots_ungu':'bungur'}[kind]
        for _ in range(9):
            x=rng.uniform(-9,9); y=rng.uniform(-4,4)
            s.put(x,y+1,'grass',2); s.put(x,y,'grass',3); s.put(x,y-1,m,4); s.put(x+1,y-1,m,2)
    elif kind=='kering':
        for _ in range(16):
            x=rng.uniform(-6,6); y=rng.uniform(-2.5,2.5); h=rng.randint(2,4)
            for j in range(h): s.put(x+(1 if j==h-1 and rng.random()<0.3 else 0),y-j,rng.choice(['fresh','dry','fresh']),4 if j==h-1 else 3)
    elif kind=='tanah':
        for _ in range(60):
            a=rng.uniform(0,6.28); r=math.sqrt(rng.random()); x=math.cos(a)*7*r; y=math.sin(a)*3*r
            s.put(x,y,'soil' if r<0.75 else 'grass',rng.choice([1,2,2,3]) if r<0.75 else 2)
        for _ in range(3): s.put(rng.uniform(-4,4),rng.uniform(-1.5,1.5),'stone',3)
    elif kind=='semanggi_b':
        for _ in range(26):
            x=rng.uniform(-12,12); y=rng.uniform(-4.5,4.5)
            if (x/12)**2+(y/4.5)**2>1: continue
            s.put(x,y+1,'grass',1); s.put(x,y,'grass',4); s.put(x+1,y,'grass',3); s.put(x,y-1,'grass',4)
    elif kind=='daun_kecil':
        for _ in range(12):
            x=rng.uniform(-10,10); y=rng.uniform(-4,4); mm=rng.choice(['dry','dry','grass','soil'])
            s.put(x,y,mm,3); s.put(x+1,y,mm,2 if mm!='grass' else 1)
    return s

TREES=[
 ('pohon_asam_L',lambda:asam(1.0),'Asam jawa (besar, pohon utama)','Tamarindus indica'),
 ('pohon_asam_M',lambda:asam(0.78,111),'Asam jawa (sedang)','Tamarindus indica'),
 ('pohon_asam_S',lambda:asam(0.56,112),'Asam jawa (muda)','Tamarindus indica'),
 ('pohon_trembesi_L',lambda:trembesi(1.0),'Trembesi / ki hujan (besar)','Samanea saman'),
 ('pohon_trembesi_M',lambda:trembesi(0.68,121),'Trembesi / ki hujan (sedang)','Samanea saman'),
 ('pohon_angsana_L',lambda:angsana(1.0),'Angsana (besar)','Pterocarpus indicus'),
 ('pohon_angsana_M',lambda:angsana(0.72,131),'Angsana (sedang)','Pterocarpus indicus'),
 ('pohon_mahoni_L',lambda:mahoni(1.0),'Mahoni (besar)','Swietenia mahagoni'),
 ('pohon_mahoni_M',lambda:mahoni(0.72,141),'Mahoni (sedang)','Swietenia mahagoni'),
 ('pohon_ketapang_kencana',ketapang,'Ketapang kencana','Terminalia mantaly'),
 ('pohon_beringin',beringin,'Beringin','Ficus benjamina'),
 ('pohon_kiara_payung',kiara,'Kiara payung','Filicium decipiens'),
 ('pohon_flamboyan',flamboyan,'Flamboyan','Delonix regia'),
 ('pohon_tabebuya_kuning',tabebuya,'Tabebuya kuning','Handroanthus chrysotrichus'),
 ('pohon_palem_raja',palem,'Palem raja','Roystonea regia'),
 ('pohon_bungur',bungur,'Bungur','Lagerstroemia speciosa'),
 ('pohon_glodokan_tiang',glodokan,'Glodokan tiang','Monoon longifolium'),
 ('pohon_cendana',cendana,'Cendana','Santalum album'),
 ('pohon_ulin',ulin,'Ulin','Eusideroxylon zwageri'),
 ('pohon_kayu_hitam',kayu_hitam,'Kayu hitam / eboni','Diospyros celebica'),
 ('pohon_tengkawang',tengkawang,'Tengkawang','Shorea stenoptera'),
 ('pohon_meranti',meranti,'Meranti','Shorea spp.'),
]
SHRUBS=[
 ('semak_bugenvil',bugenvil,'Bugenvil','Bougainvillea spectabilis'),
 ('semak_soka',soka,'Soka','Ixora sp.'),
 ('semak_pucuk_merah',pucuk_merah,'Pucuk merah','Syzygium myrtifolium'),
 ('semak_teh_tehan_pagar',teh_tehan,'Teh-tehan (pagar pangkas)','Acalypha siamensis'),
 ('tanaman_heliconia',heliconia,'Pisang-pisangan / heliconia','Heliconia rostrata'),
 ('tanaman_lidah_mertua',lidah_mertua,'Lidah mertua','Dracaena trifasciata'),
 ('tanaman_kuping_gajah',talas,'Kuping gajah / talas hias','Alocasia sp.'),
 ('tanaman_puring',puring,'Puring','Codiaeum variegatum'),
 ('tanaman_bakung',bakung,'Bakung','Crinum asiaticum'),
 ('tanaman_andong_merah',andong,'Andong merah','Cordyline fruticosa'),
 ('tanaman_sirih',sirih,'Sirih (di tiang bambu)','Piper betle'),
 ('tanaman_lili_paris',lili_paris,'Lili paris','Chlorophytum comosum'),
]
GROUND=[
 ('tuft_rumput_a',t_rumput_a,'Rumput gajah mini','Axonopus compressus'),
 ('tuft_rumput_b',t_rumput_b,'Rumput (rumpun rapat)','Axonopus compressus'),
 ('tuft_ilalang',t_ilalang,'Rumput liar tinggi','Imperata cylindrica'),
 ('tuft_daun_asam_gugur',t_daun_gugur,'Daun gugur','(serasah daun)'),
 ('tuft_rumput_c',lambda:g_overlay(61,'tuft_c'),'Rumput (kecil)','Axonopus compressus'),
 ('tuft_rumput_d',lambda:g_overlay(62,'tuft_d'),'Rumput (hamparan rendah)','Axonopus compressus'),
 ('tuft_rumput_e',lambda:g_overlay(63,'tuft_e'),'Rumput (rumpun tinggi)','Axonopus compressus'),
 ('tuft_rumput_f',lambda:g_overlay(64,'tuft_f'),'Rumput (sedang)','Axonopus compressus'),
 ('overlay_semanggi',lambda:g_overlay(65,'clover'),'Semanggi / daun kecil','Oxalis sp. (tanpa bunga)'),
 ('overlay_rumput_kering',lambda:g_overlay(70,'kering'),'Rumput kering hijau-kuning','Axonopus compressus'),
 ('overlay_tanah_terbuka',lambda:g_overlay(71,'tanah'),'Tanah terbuka kecil','(tanah)'),
 ('overlay_semanggi_b',lambda:g_overlay(72,'semanggi_b'),'Semanggi hijau (hamparan)','Oxalis sp. (tanpa bunga)'),
 ('overlay_daun_kecil',lambda:g_overlay(69,'daun_kecil'),'Daun kecil gugur','(serasah)'),
 ('prop_kerikil',t_kerikil,'Kerikil','(batu)'),
 ('prop_tunggul',t_tunggul,'Tunggul pohon','(potongan batang)'),
]
