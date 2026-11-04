"""High-fidelity Indonesia 200 vegetation, matching the established Kebon Sirih tree standard.

20 distinct botanical silhouettes. Pixel-size leaflet clusters and detailed
branching, authored in the same native 2:1 Loc/Spr space as the Indonesia pack;
NO reused flat sprites, low-poly spheres, cube crowns or opaque square tiles.
Occlusion maps derive from actual winning 3D foliage/branches via Spr.d.
Deterministic per-species fixed seeds make all views reproducible.
"""
from __future__ import annotations
import math
import zlib
import numpy as np
from engine import mat, MI
from indonesia_200_quality import box, pole, ball, shadow

MATERIALS={
 'VF_DARK':['#102E26','#16452F','#20583A','#30764A','#4A9460'],
 'VF_LEAF':['#193F28','#25613B','#31824A','#47A05B','#71BB76'],
 'VF_FRESH':['#2C512D','#3C7036','#519444','#74B251','#A0CC6B'],
 'VF_OLIVE':['#253B2A','#3C5232','#526E3B','#6E8A4C','#91AB64'],
 'VF_PALM':['#173D30','#266A3A','#398C47','#59A05D','#8BC97B'],
 'VF_BARK':['#31251F','#47382A','#65503A','#896B48','#B48C62'],
 'VF_GREY':['#323837','#53605A','#778078','#A1A89A','#D3D4C7'],
 'VF_PINK':['#822F52','#B43B65','#DE5C85','#F3819F','#FFB4BE'],
 'VF_FLOWER':['#A49B77','#D0C49C','#E8DFBD','#F4EFD7','#FFFFFF'],
 'VF_BANANA':['#253B25','#3A6732','#4C9544','#74B755','#A5D271'],
 'VF_GOLD':['#70632B','#948337','#B7A148','#D7C363','#EFE59A'],
 'VF_PURPLE':['#423455','#6F4D82','#9868A9','#C18DCE','#E2BBDF']
}
for name,palette in MATERIALS.items():
 if name not in MI:mat(name,palette)

def rngfor(s,tag=0):
 return np.random.default_rng((zlib.crc32(s['id'].encode())+int(tag)*9091)&0xffffffff)

def crarrays(L,a,b):
 # Map world local a/b to actual 3D c/r; orientation and flip preserved.
 b=np.asarray(b,dtype=np.float32)
 a=np.asarray(a,dtype=np.float32)
 if L.flip:b=L.D-b
 if L.o=='sw':return L.c0+a,L.r0+L.D-b
 return L.c0+L.D-b,L.r0+L.W-a

def pts(L,a,b,z,matname='VF_LEAF',tones=None):
 a=np.asarray(a,dtype=np.float32).ravel()
 b=np.asarray(b,dtype=np.float32).ravel()
 z=np.asarray(z,dtype=np.float32).ravel()
 if not len(a):return
 c,r=crarrays(L,a,b)
 if tones is None:tones=np.full(len(a),3,dtype=np.int8)
 L.s.points(c,r,z,matname,tones)

def limb(L,coords,diam=.12,m='VF_BARK',tag=17):
 """Curved tapered 3D limb with bark/grain, not just a straight vertical rod."""
 rng=np.random.default_rng(tag*7769+31)
 aa=[];bb=[];zz=[];tt=[]
 for p,q in zip(coords[:-1],coords[1:]):
  dist=math.dist(p,q)
  n=max(140,int(dist*17))
  t=np.linspace(0,1,n)
  width=np.maximum(.015,diam*(1-.55*t))
  a=p[0]+(q[0]-p[0])*t+rng.normal(0,.23,n)*width
  b=p[1]+(q[1]-p[1])*t+rng.normal(0,.23,n)*width
  z=p[2]+(q[2]-p[2])*t+rng.normal(0,.6,n)
  aa.append(a);bb.append(b);zz.append(z)
  tt.append(np.where((np.arange(n)+tag)%9==0,4,np.where(t>.78,2,3)).astype(np.int8))
 a=np.concatenate(aa);b=np.concatenate(bb);z=np.concatenate(zz);tone=np.concatenate(tt)
 good=(a>.04)&(a<L.W-.04)&(b>.04)&(b<L.D-.04)
 pts(L,a[good],b[good],z[good],m,tone[good])

def trunk(L,x,y,height,rad=.15,m='VF_BARK',seed=0,lean=0):
 # Architectural buttress roots and a subtly curving trunk.
 limb(L,[(x,y,0),(x+lean*.2,y-.015,height*.31),
        (x+lean*.55,y+.025,height*.69),
        (x+lean,y,height)],diam=rad*2.2,m=m,tag=seed+21)
 for j in range(4):
  angle=j*math.tau/4+.14
  ex=x+.21*math.cos(angle);ey=y+.18*math.sin(angle)
  limb(L,[(x,y,11),(ex,ey,2)],diam=rad*.75,m=m,tag=seed+j+40)
 for z in range(14,int(height*.80),14):
  a=x+lean*.36*(z/height)
  limb(L,[(a-.04,y-.015,z),(a+.042,y+.04,z+.3)],
       diam=.019,m=m,tag=seed+int(z))

def canopy(L,s,clumps,material='VF_LEAF',density=1.,seed=0,fruit=None,
            leaf_radius=.035,overlay=True):
 """Layered dense microleaf foliage: 3D lobes + deliberate voids and highlights.

 clumps=(a,b,z,rx,ry,h) with z at center, not base. No spherical dome blobs.
 Each lobe has thousands of 1-2px leaflets, canopy micro-occlusion and
 foreground/background shading as on existing Kebon Sirih pixel foliage.
 """
 rng=rngfor(s,seed)
 for i,(a,b,z,rx,ry,h) in enumerate(clumps):
  count=max(800,int((rx*ry*18000+h*22)*density))
  uv=rng.normal(0,.43,(count,3))
  mask=(uv[:,0]**2+uv[:,1]**2+uv[:,2]**2)<.88
  uv=uv[mask]
  if not len(uv):continue
  a0=a+uv[:,0]*rx*.93
  b0=b+uv[:,1]*ry*.93
  z0=z+uv[:,2]*h*.92
  # Narrow interruptions create visible twigs and leafy clump edges.
  a0+=.042*np.sin(uv[:,2]*8+i*1.7)
  b0+=.028*np.cos(uv[:,0]*9+i*.7)
  safe=(a0>.05)&(a0<L.W-.05)&(b0>.05)&(b0<L.D-.05)&(z0>2)&(z0<s['Hmax']-2)
  a0,b0,z0=a0[safe],b0[safe],z0[safe]
  if not len(a0):continue
  # Each botanical leaf is a 2-4px stepped mark with normals controlling tone.
  # Avoid a uniform mass of unnaturally round identical puffy spheres.
  light=3+(uv[:,2][safe]*1.2)-(uv[:,0][safe]*.55)+(uv[:,1][safe]*.4)
  light+=rng.normal(0,.67,len(a0))
  tone=np.clip(np.rint(light),0,4).astype(np.int8)
  scatter=int(len(a0)*.60)
  pts(L,a0,b0,z0,material,tone)
  if overlay and scatter:
   idx=rng.choice(len(a0),scatter,replace=False)
   jitter=rng.normal(0,.022,(scatter,2))
   aa=np.clip(a0[idx]+jitter[:,0],.05,L.W-.06)
   bb=np.clip(b0[idx]+jitter[:,1],.05,L.D-.06)
   pts(L,aa,bb,z0[idx]+rng.choice([-1.,0.,1.],size=scatter),
       material,np.clip(tone[idx]+rng.integers(0,2,scatter),0,4))
  if fruit and i%2==0:
   for j in range(3):
    th=math.tau*(j+.23*i)/3
    fx=a+rx*.68*math.cos(th);fy=b+ry*.62*math.sin(th)
    if .1<fx<L.W-.1 and .1<fy<L.D-.1:
     ball(L,fx,fy,z-h*.62,.072,8,fruit)

def twig_crown(L,s,x,y,h,material='VF_LEAF',count=6,rad=.60,seed=20,fruit=None,
               flat=False,density=1.0):
 rng=rngfor(s,seed)
 clumps=[]
 for i in range(count):
  th=math.tau*i/count+.18
  r=rad*(.60+.24*rng.random())
  cx=x+r*math.cos(th);cy=y+r*.84*math.sin(th)
  high=h+int(rng.integers(-13,13))
  limb(L,[(x,y,h-66),(cx*.6+x*.4,cy*.6+y*.4,h-29),(cx,cy,high-11)],
       .065,'VF_BARK',seed+i+51)
  clumps.append((cx,cy,high,.32 if not flat else .38,.30 if not flat else .26,
                 27 if not flat else 14))
 clumps.append((x,y,h+15,rad*.60,rad*.52,25 if not flat else 15))
 canopy(L,s,clumps,material,density,seed+5,fruit)

def strap(L,a,b,z0,ra,angle,length=.65,drop=24,material='VF_PALM',
          width=.12,seed=1):
 """Curved leaf/stem composed of many pixel-level streaks."""
 rng=np.random.default_rng(seed+109)
 n=350
 t=np.linspace(.01,1,n)
 aa=a+ra*np.cos(angle)*length*t
 bb=b+ra*np.sin(angle)*length*t
 zz=z0+11*np.sin(t*np.pi*.85)-drop*t*t
 aa+=rng.normal(0,width*.18,n)*(1-t)
 bb+=rng.normal(0,width*.18,n)*(1-t)
 tones=np.clip(np.rint(4-2*t+rng.normal(0,.6,n)),0,4).astype(np.int8)
 pts(L,aa,bb,zz,material,tones)
 # Leaf lamina tapers and twists, avoids blocky square paddles.
 for off in (-1,1):
  taper=(np.sin(t*np.pi)**.72)*width*off
  ax=aa+taper*np.sin(angle)
  by=bb-taper*np.cos(angle)
  good=(ax>.04)&(ax<L.W-.04)&(by>.04)&(by<L.D-.04)
  pts(L,ax[good],by[good],zz[good]-2.6,material,
      np.clip(tones[good]+off,0,4))

def broad_leaf(L,a,b,z,angle,length=.64,width=.16,drop=15,
               material='VF_BANANA',seed=1,fenestrated=False):
 """Actual pixel-filled banana/Monstera leaf lamina with midrib, serration
 and optional Monstera fenestration. Much wider than a thin palm frond."""
 rng=np.random.default_rng(1337+int(seed))
 t=np.repeat(np.linspace(.025,.99,112),25)
 side=np.tile(np.linspace(-1,1,25),112)
 wave=(np.sin(t*np.pi)**.68)
 breadth=width*wave*(1+.08*np.sin(t*17+seed*.2))
 aa=a+length*t*np.cos(angle)+side*breadth*np.sin(angle)
 bb=b+length*t*np.sin(angle)-side*breadth*np.cos(angle)
 zz=z+9*np.sin(t*np.pi)-drop*t*t+side*2.0
 # Species-correct torn banana edges and Monstera split leaf holes.
 rag=(np.abs(side)>.80)&((np.floor(t*18+seed)%7)<2)
 good=~rag if not fenestrated else np.ones(len(t),dtype=bool)
 if fenestrated:
  holes=(t>.38)&(t<.79)&(np.abs(side)>.32)&(np.abs(side)<.56)&(
     np.floor(t*18+seed)%4<2)
  good &= ~holes
 good &= (aa>.035)&(aa<L.W-.035)&(bb>.035)&(bb<L.D-.035)
 tone=np.clip(np.rint(3.6-.85*np.abs(side)+.4*np.cos(angle)+
                 rng.normal(0,.40,len(side))),1,4).astype(np.int8)
 pts(L,aa[good],bb[good],zz[good],material,tone[good])
 # continuous midrib and tiny lateral venation streaks
 rib=np.abs(side)<.075
 mask=good&rib
 pts(L,aa[mask],bb[mask],zz[mask]+1.3,'VF_FRESH',
     np.full(np.count_nonzero(mask),4,dtype=np.int8))

def pot(L,x,y,z=31,size=.29,color='TERRA'):
 box(L,x-size,y-size,x+size,y+size,0,z,color,3)
 box(L,x-size-.04,y-size-.04,x+size+.04,y+size+.04,z-3,z+4,'CONC')
 box(L,x-size+.04,y-size+.04,x+size-.04,y+size-.04,z+2,z+5,'SOIL')

def radial_shrub(L,s,x,y,h=67,material='VF_LEAF',flower=None,seed=21,
                 clumps=8,rad=.48,stem='VF_BARK'):
 for j in range(clumps):
  th=j*math.tau/clumps
  cx=x+rad*.74*math.cos(th);cy=y+rad*.66*math.sin(th)
  top=h+(j%3-1)*9
  limb(L,[(x,y,4),(cx,cy,top-10)],.054,m=stem,tag=seed+j)
 cc=[(x+rad*.64*math.cos(j*math.tau/clumps),
       y+rad*.57*math.sin(j*math.tau/clumps),
       h+(j%3-1)*8,.22,.20,18)for j in range(clumps)]
 cc.append((x,y,h+6,.31,.30,21))
 canopy(L,s,cc,material,1.04,seed,fruit=flower)

def tree(L,s,kind):
 shadow(L)
 x,y=L.W*.50,L.D*.49
 if kind=='mangga':
  trunk(L,x,y,94,.16,'VF_BARK',9,lean=-.06)
  twig_crown(L,s,x,y,136,'VF_DARK',8,.82,9,'YEL',density=1.18)
 elif kind=='rambutan':
  trunk(L,x,y,104,.17,'VF_BARK',13,lean=.08)
  twig_crown(L,s,x,y,149,'VF_LEAF',9,.91,14,'RED',density=1.28)
  for j in range(13):
   th=j*math.tau/13
   a=x+.55*math.cos(th);b=y+.51*math.sin(th)
   if .06<a<L.W-.06 and .06<b<L.D-.06:
    ball(L,a,b,119+j%4*7,.075,6,'RED')
 elif kind=='sawo':
  trunk(L,x,y,96,.17,'VF_BARK',24,lean=.09)
  twig_crown(L,s,x,y,130,'VF_OLIVE',8,.75,25,'WOOD',density=1.26)
 elif kind=='ketapang':
  trunk(L,x,y,144,.11,'VF_BARK',30)
  # Four horizontally tiered botanically recognizable Terminalia levels:
  # small flat broadleaf pads, lots of visible gaps, NOT a conical palm.
  for tier,(high,spread) in enumerate(((52,.74),(83,.63),(110,.50),(139,.30))):
   cl=[]
   for j in range(9):
    th=j*math.tau/9+.17
    a=x+spread*math.cos(th);b=y+spread*.78*math.sin(th)
    limb(L,[(x,y,high-5),(a,b,high)],.035,'VF_BARK',tier*20+j)
    cl.append((a,b,high+2,.16,.14,5))
   cl.append((x,y,high+3,.26,.22,6))
   canopy(L,s,cl,'VF_FRESH',1.06,tier+71)
 elif kind=='kamboja':
  trunk(L,x,y,64,.15,'VF_GREY',42,lean=-.08)
  leaves=[]
  for j in range(7):
   th=j*math.tau/7
   a=x+.63*math.cos(th);b=y+.58*math.sin(th);height=95+j%3*8
   limb(L,[(x,y,53),(x+(a-x)*.45,y+(b-y)*.45,68),(a,b,height)],
        .09,'VF_GREY',j+78)
   leaves.append((a,b,height+8,.16,.14,11))
  canopy(L,s,leaves,'VF_OLIVE',1.0,82)
  rng=rngfor(s,89)
  for j in range(27):
   a,b,z,*_=leaves[j%len(leaves)]
   fx=a+rng.normal(0,.12);fy=b+rng.normal(0,.12)
   if .07<fx<L.W-.07 and .07<fy<L.D-.07:
    ball(L,fx,fy,z+8,.065,5,'VF_FLOWER')
 elif kind=='kelapa':
  trunk(L,x,y,143,.105,'VF_BARK',54,lean=.25)
  x+=.25
  for j in range(10):
   th=j*math.tau/10+.15
   strap(L,x,y,146,1,th,.90,55,'VF_PALM',.11,j+60)
   for k in range(18):
    t=(k+1)/20
    xx=x+.86*math.cos(th)*t;yy=y+.86*math.sin(th)*t
    zz=146+11*math.sin(t*math.pi*.85)-53*t*t
    if .05<xx<L.W-.05 and .05<yy<L.D-.05:
     strap(L,xx,yy,zz,1,th+math.pi/2,.16,12,'VF_PALM',.025,k+j*17)
  for a,b in ((x-.12,y-.06),(x+.13,y-.13),(x+.02,y+.16)):
   ball(L,a,b,137,.12,11,'WOOD')
 elif kind=='pisang':
  # Pseudostems and LONG BROAD individual banana blades; never coconut wisps.
  for j,(dx,dy,height) in enumerate(((-.30,-.22,112),(.29,.12,93),(-.15,.34,82))):
   a=x+dx;b=y+dy
   pole(L,a,b,height-3,.11,'VF_PALM')
   for z in range(11,height-12,17):
    limb(L,[(a-.065,b-.02,z),(a+.08,b+.03,z+2)],.025,'VF_GOLD',j*90+z)
   for k in range(7):
    th=k*math.tau/7+j*.39
    broad_leaf(L,a,b,height,th,.78 if j==0 else .61,.21,24,
               'VF_BANANA',k+j*19)
   if j==0:
    for h in range(69,101,7):
     ball(L,a+.10,b+.14,h,.085,8,'VF_GOLD')
 elif kind=='pepaya':
  trunk(L,x,y,124,.085,'VF_BARK',97)
  for i in range(10):
   th=i*math.tau/10
   limb(L,[(x,y,123),(x+.35*math.cos(th),y+.35*math.sin(th),133)],
        .035,'VF_PALM',i+199)
   for j in range(3):
    th2=th+(j-1)*.34
    a=x+.31*math.cos(th);b=y+.31*math.sin(th)
    broad_leaf(L,a,b,134,th2,.29,.080,10,'VF_LEAF',i*10+j)
  for i in range(8):
   th=i*math.tau/8
   a=x+.15*math.cos(th);b=y+.17*math.sin(th)
   ball(L,a,b,105+(i%3)*7,.095,13,'YEL')
 return True

def smaller(L,s):
 shadow(L)
 x,y=L.W*.5,L.D*.5
 name=s['label']
 if name=='Bougenville berbunga':
  radial_shrub(L,s,x,y,79,'VF_LEAF','VF_PINK',112,11,.54)
 elif name=='Pucuk merah pekarangan':
  for j in range(3):
   xx=x+(j-1)*.43
   radial_shrub(L,s,xx,y,60+j%2*7,'VF_DARK',None,125+j,6,.23)
   canopy(L,s,[(xx,y,87+j%2*4,.19,.17,12)],'VF_PINK',1.0,129+j)
 elif name=='Semak teh tehan pagar':
  # Multiple little clipped hedges: visible volumetric fine-leaf fence.
  for j in range(6):
   xx=.22+j*(L.W-.44)/6
   radial_shrub(L,s,xx,y,35,'VF_LEAF',None,141+j,5,.19)
 elif name=='Rumpun bambu':
  for j in range(10):
   th=j*math.tau/10
   xx=x+.49*math.cos(th);yy=y+.42*math.sin(th)
   height=111+j%4*12
   pole(L,xx,yy,height,.032,'VF_PALM')
   for z in range(19,height,22):
    limb(L,[(xx-.041,yy,z),(xx+.04,yy,z+.5)],.016,'VF_GOLD',z+j)
   for i in range(3):
    h=height-i*19
    ang=i*math.tau/3+j*.27
    aa=xx+.18*math.cos(ang);bb=yy+.18*math.sin(ang)
    limb(L,[(xx,yy,h-5),(aa,bb,h+3)],.020,'VF_PALM',j*15+i)
    canopy(L,s,[(aa,bb,h+4,.13,.13,7)],'VF_DARK',.62,j*30+i+150)
 elif name=='Daun pandan wangi':
  for j in range(27):
   ang=j*math.tau/27
   strap(L,x,y,57,1,ang,.42+(j%4)*.043,39,'VF_FRESH',.048,j+185)
 elif name=='Monstera dalam pot':
  pot(L,x,y,31,.32,'TERRA')
  for j in range(11):
   th=j*math.tau/11
   xx=x+.25*math.cos(th);yy=y+.24*math.sin(th);z=56+j%4*7
   limb(L,[(x,y,32),(xx,yy,z)],.035,'VF_PALM',j+190)
   # One broad perforated split leaf per stalk, visibly heart-like.
   broad_leaf(L,xx,yy,z,th,.37,.19,6,'VF_LEAF',j+350,True)
 elif name=='Sirih gading pot':
  # A true SUSPENDED pot: open air below. The old prop looked like an
  # orange ground-based cylinder and obscured the hanging foliage.
  box(L,x-.27,y-.24,x+.27,y+.24,69,85,'TERRA')
  box(L,x-.30,y-.27,x+.30,y+.27,82,89,'CONC')
  box(L,x-.23,y-.20,x+.23,y+.20,88,91,'SOIL')
  for i in range(4):
   th=i*math.tau/4
   a=x+.25*math.cos(th);b=y+.23*math.sin(th)
   limb(L,[(a,b,86),(x,y,116)],.020,'VF_BARK',288+i)
  for i in range(8):
   th=i*math.tau/8
   a=x+.23*math.cos(th)
   b=y+.24*math.sin(th)
   low=21+(i%4)*8
   limb(L,[(a,b,85),(a+.11*math.cos(th),b+.09*math.sin(th),55),
           (a-.05,b+.03,low)],.021,'VF_PALM',250+i)
   for j in range(7):
    z=25+j*9+(i%3)*2
    if z>90:continue
    xx=a+.10*math.sin(j+i);yy=b+.09*math.cos(j+i)
    if .09<xx<L.W-.09 and .09<yy<L.D-.09:
     broad_leaf(L,xx,yy,z,th,.18,.07,9,
                'VF_FRESH' if j%3 else 'VF_GOLD',j+i*19)
 elif name=='Lidah mertua pot':
  pot(L,x,y,34,.32,'CONC')
  for j in range(17):
   th=j*math.tau/17
   a=x+.18*math.cos(th);b=y+.17*math.sin(th)
   top=64+(j%5)*10
   strap(L,a,b,top,1,th,.16,top-36,'VF_DARK',.065,j+299)
   # Bright variegated yellow edges without fluorescent solid blocks.
   limb(L,[(a-.03,b,36),(a+.03,b,top)],.016,'VF_GOLD',j+310)
 elif name=='Petak sawah padi':
  for j in range(34):
   xx=.18+(j%8)*.205;yy=.18+(j//8)*.35
   height=32+j%4*5
   limb(L,[(xx,yy,1),(xx+.07,yy,height)],.023,'VF_PALM',j+315)
   for k in range(5):
    h=height-16+k*4
    ball(L,xx+.07+k*.025,yy,h,.033,3,'VF_GOLD')
 elif name=='Ilalang liar':
  # Grass grows UP from rhizomes; only seed heads emerge at the top.
  for j in range(69):
   rng=rngfor(s,343+j)
   xx=.13+rng.random()*(L.W-.26)
   yy=.12+rng.random()*(L.D-.24)
   h=47+int(rng.integers(0,29))
   lean=(j%5-2)*.028
   limb(L,[(xx,yy,1),(xx+lean*.5,yy+.015,30),
           (xx+lean,yy+.03,h)],.027,'VF_FRESH',j+420)
   for k in (-1,1):
    ang=j*.77+k*.38
    broad_leaf(L,xx,yy,17,ang,.18,.027,7,
               'VF_DARK',j*3+k+560)
   for k in range(5):
    a=xx+lean+(k%2)*.018
    b=yy+.03+(k//2)*.018
    ball(L,a,b,h-5+k*2,.029,3,'VF_GOLD')
 elif name in ('Eceng gondok kolam','Teratai kolam'):
  water_hyacinth=name.startswith('Eceng')
  for i in range(14):
   x0=.22+(i%4)*.41;y0=.18+(i//4)*.34
   for j in range(6):
    th=j*math.tau/6
    strap(L,x0,y0,7,1,th,.20,4,'VF_LEAF',.12,i*6+j+600)
   if i%3==0:
    if water_hyacinth:
     limb(L,[(x0,y0,7),(x0,y0,34)],.028,'VF_PALM',i+680)
     for z in (26,35):
      ball(L,x0,y0,z,.08,6,'VF_PURPLE')
    else:
     for j in range(5):
      th=j*math.tau/5
      a=x0+.08*math.cos(th);b=y0+.08*math.sin(th)
      ball(L,a,b,12,.075,5,'VF_PINK')
     ball(L,x0,y0,18,.065,7,'VF_GOLD')
 return True

def render(L,s):
 if s['category']!='tanaman':return False
 k=s['kind']
 if k in ('pohon','ketapang','kamboja','kelapa','pisang','pepaya'):
  kind={'ketapang':'ketapang','kamboja':'kamboja','kelapa':'kelapa',
        'pisang':'pisang','pepaya':'pepaya'}.get(k)
  if not kind:
   name=s['label']
   kind='mangga' if 'mangga' in name else 'rambutan' if 'rambutan' in name else 'sawo'
  return tree(L,s,kind)
 return smaller(L,s)
