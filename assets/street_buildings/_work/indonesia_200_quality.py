"""Indonesia 200 v2 quality studio — native-authored, recognizable 2:1 pixel assets.

Unlike the first mass pack, these recipes distinguish objects by actual form
and scene content, not just recoloured cuboids. All geometry is fed through
the existing v6b Spr/Loc pipeline: deterministic materials, native alpha,
pivot, per-pixel depth, multiple directions and collision footprint.

Each category has bespoke material/scale/detail rules. Drawings intentionally
have no opaque floor tiles or extraneous rectangular backgrounds.
"""
from __future__ import annotations
import math
from lib import Tex,bshadow,window,roof_flat,roof_flat as flatroof
TAU=math.tau
PALETTE=('RED','TEAL','BLUE','TERRA','GREEN','YEL','CREAM','ORANGE','WOOD','CONC')
CLOTH=('BLUE','CREAM','RED','TERRA','GREEN','YEL','WHITE')
FOOD=('GREEN','YEL','ORANGE','RED','TERRA','CREAM','WOOD')
def box(L,a,b,c,d,z0,z1,m='WOOD',t=3,front=None,side=None):
 a=max(.025,float(a));b=max(.025,float(b))
 c=min(L.W-.025,float(c));d=min(L.D-.025,float(d))
 z0=int(round(z0));z1=int(round(z1))
 if c>a+.035 and d>b+.035 and z1>z0:
  L.box(a,b,c,d,z0,z1,m,t,front=front,side=side)
def pole(L,a,b,top=95,r=.055,m='WOOD',base=0):
 if .07<=a<L.W-.04 and .07<=b<L.D-.04 and top>base+1:
  L.s.cyl(*L.cr(a,b),int(base),int(top),r,m,3)
def ball(L,a,b,z,r=.20,h=13,m='GREEN',tone=3):
 if .05<a<L.W-.05 and .05<b<L.D-.05:
  L.s.dome(*L.cr(a,b),int(z),max(.025,r),int(h),m,tone)
def shadow(L):
 bshadow(L,.03,.04,L.W-.03,L.D-.04,80)
def rectshade(L,a,b,c,d,z,mat='CONC'):
 box(L,a,b,c,d,z,z+5,mat,3)
def board(L,label,z=75,paint='GREEN',w=None):
 # Written 5px-native font. Not a giant unreadable full-name slab.
 short=label.upper()[:16]
 ww=int(min((L.W-.24)*32,max(48,5.3*len(short)+8))) if w is None else w
 tex=Tex(max(22,ww),22,paint,3)
 tex.rect(1,1,tex.W-1,4,'CREAM',4)
 tex.text(tex.W//2,9,short,'WHITE',4,sc=1,bold=True)
 # width must match L.front screen-space or it stretches; use canonical width.
 span=min(L.W-.28,tex.W/32)
 L.front(.14,.14+span,.085,z,z+22,tex,dep=1)
def canopy(L,z=120,cloth='BLUE',margin=.12):
 box(L,margin,.10,L.W-margin,L.D-.12,z,z+9,cloth,3)
 for x in (.15,L.W-.23):
  for y in (.13,L.D-.22):pole(L,x,y,z-2,.055,'WOOD')
def rail(L,ax,bx,z=35,paint='WOOD',rows=5):
 for j in range(rows):
  x=ax+(bx-ax)*j/max(1,rows-1)
  box(L,x,.09,x+.055,.24,0,z,paint,3)
 box(L,ax,.07,bx+.055,.26,z-3,z+2,paint)
def crates(L,count=4,material='WOOD',a=.24,b=.17,width=.39):
 for i in range(count):
  x=a+(i%4)*(.45)
  y=b+(i//4)*(.50)
  box(L,x,y,x+width,y+.39,0,22,material,3)
  rectshade(L,x+.04,y+.02,x+width-.04,y+.36,21,'SENG')
  for j in range(3):
   ball(L,x+.11+(j%2)*.13,y+.10+(j//2)*.13,25,.085,8,FOOD[(i+j)%len(FOOD)])
def sacks(L,number=4):
 for i in range(number):
  x=.25+(i%3)*.50;y=.25+(i//3)*.45
  box(L,x,y,x+.4,y+.35,(i//3)*22,(i//3)*22+30,'CREAM',3)
  box(L,x+.09,y+.05,x+.29,y+.12,(i//3)*22+12,(i//3)*22+17,'WOOD',2)
def galons(L,count=3,material='OGLASS',a=.34,b=.5):
 for i in range(count):
  x=a+(i%4)*.55;y=b+(i//4)*.45
  pole(L,x,y,44,.20,material)
  pole(L,x,y,50,.11,'BLUE')
def gas(L,count=3,small=False):
 for i in range(count):
  a=.39+i*.51;b=L.D*.5
  pole(L,a,b,36,.18,'GREEN' if not small else 'BLUE')
  pole(L,a,b,40,.105,'DARK',base=36)
  ball(L,a,b,39,.08,5,'CONC')
def wheel(L,a,b,diam=.2):
 L.s.cyl(*L.cr(a,b),2,16,diam,'DARK',2)
 L.s.cyl(*L.cr(a,b),16,18,diam*.5,'CONC',3)
 ball(L,a,b,18,diam*.25,3,'WOOD')
def human(L,a,b,z=0,shirt='GREEN',helm='GREEN'):
 # low-poly but readable 1-tile rider/worker: pants, torso, hands & helmet.
 box(L,a-.12,b-.11,a-.015,b+.10,z+3,z+29,'DARK',3)
 box(L,a+.018,b-.11,a+.12,b+.10,z+3,z+29,'DARK',3)
 box(L,a-.19,b-.12,a+.19,b+.12,z+29,z+57,shirt,3)
 box(L,a-.24,b-.075,a-.18,b+.065,z+37,z+53,'SKIN',3)
 box(L,a+.18,b-.075,a+.24,b+.065,z+37,z+53,'SKIN',3)
 ball(L,a,b,z+59,.145,13,'SKIN')
 ball(L,a,b,z+70,.16,11,helm)
def bike(L,x0=.3,x1=None,y=None,m='BLUE',rider=False,passenger=False,cart=False):
 x1=x1 or L.W-.3;y=y or L.D*.53
 wheel(L,x0,y,.23);wheel(L,x1,y,.23)
 # frame, fender, headlight, handlebar, saddle, engine assembly
 box(L,x0+.16,y-.065,x1-.12,y+.07,21,29,'DARK')
 box(L,x0+.27,y-.17,x1-.28,y+.18,30,36,'CONC')
 box(L,x0+.34,y-.14,x1-.45,y+.15,33,48,m)
 box(L,x1-.27,y-.11,x1-.12,y+.11,29,51,m)
 pole(L,x1-.24,y,65,.045,'DARK')
 box(L,x1-.39,y-.23,x1-.10,y+.24,62,65,'DARK')
 box(L,x0+.18,y-.15,x0+.68,y+.16,49,54,'DARK')
 ball(L,x1-.16,y,53,.075,6,'WHITE')
 if rider:human(L,L.W*.55,y,37,m,m)
 if passenger:
  human(L,L.W*.30,y,35,'TERRA','GREEN')
  box(L,x0+.07,y-.26,x0+.46,y+.23,48,73,'RED',3)
 if cart:
  box(L,.08,.09,.72,L.D-.11,22,49,'WOOD')
  box(L,.09,.08,.70,L.D-.12,49,55,'CREAM')
def vehicle(L,s):
 shadow(L)
 k=s['kind'];name=s['label'].lower();W=L.W;D=L.D
 color={'angkot':'TEAL','bajaj':'ORANGE','bentor':'GREEN','becak':'CREAM',
        'motor':'TEAL' if s['num']%2 else 'RED','sepeda':'TERRA',
        'pickup':'CREAM','truck':'TERRA','bus':'RED','van':'WHITE',
        'andong':'WOOD'}.get(k,'BLUE')
 if k in ('motor','sepeda'):
  bike(L,m=color,rider=k=='motor' or 'tukang' in name,
       passenger='penumpang' in name,cart='roti' in name)
  if 'box' in name or 'kurir' in name or 'delivery' in name:
   box(L,.05,.12,.64,D-.13,48,82,'RED')
   board(L,'ANTAR',60,'RED')
  if k=='sepeda':
   wheel(L,.3,D*.53,.30);wheel(L,W-.3,D*.53,.30)
   box(L,.5,.52,W-.5,D*.53,38,42,'WOOD')
  return
 if k in ('becak','bentor'):
  bike(L,.65,W-.33,D*.65,'RED',rider=k=='bentor',cart=False)
  wheel(L,.39,D*.18,.21)
  box(L,.14,.12,1.14,D*.74,24,57,'CREAM')
  box(L,.16,.12,1.14,D*.74,56,63,'WOOD')
  box(L,.10,.13,1.20,D*.75,88,96,'RED')
  for xx in (.15,1.1):pole(L,xx,D*.2,89,.05,'WOOD')
  # front-facing curved seat, owner behind.
  box(L,.3,.14,.95,D*.36,60,84,'DARK')
  if k=='becak':human(L,W*.69,D*.6,22,'BLUE','CREAM')
  return
 if k=='andong':
  # identifiable carriage + horse in front (not generic pickup body).
  wheel(L,.43,D*.61,.38);wheel(L,W*.51,D*.61,.38)
  box(L,.22,.20,W*.53,D-.21,39,86,'WOOD')
  box(L,.27,.24,W*.51,D-.24,86,93,'TERRA')
  canopy(L,124,'CREAM')
  for a in (W*.20,W*.52):pole(L,a,.24,123,.06,'WOOD')
  # horse legs, belly, mane, head and reins
  box(L,W*.68,.30,W*.91,D-.32,57,81,'WOOD')
  for a in (W*.69,W*.84):
   for b in (.37,D-.40):box(L,a,b,a+.065,b+.08,0,58,'WOOD')
  box(L,W*.84,D*.49,W-.15,D*.59,81,117,'WOOD')
  ball(L,W-.16,D*.5,112,.18,14,'WOOD')
  box(L,W*.48,D*.42,W*.9,D*.48,52,55,'DARK')
  return
 # 4-wheeled vehicles: lowered chassis, proper cab/windshield/wheels, rear body.
 for xx in (.56,W-.63):
  for yy in (D*.26,D*.81):
   wheel(L,xx,yy,.26)
 box(L,.14,.14,W-.13,D-.14,20,45,'DARK',2)
 sedan=k in ('angkot','van')
 pickup=k in ('pickup','truck')
 cabStart=W*.58 if pickup else .25
 cabEnd=W-.20
 if pickup:
  box(L,.20,.22,W*.59,D-.17,45,56,'WOOD' if 'sayur' in name else 'CONC')
  for x in (.23,W*.56):
   box(L,x,.20,x+.065,D-.18,49,84,'CONC')
  if 'pasir' in name:
   for i in range(16):
    xx=.35+(i%4)*.34;yy=.33+(i//4)*.34
    ball(L,xx,yy,58,.19,10,'SOIL')
  elif 'material' in name:
   for i in range(7):
    xx=.30+(i%4)*.43;yy=.30+(i//4)*.38
    box(L,xx,yy,xx+.35,yy+.27,55,74,'TERRA')
  elif 'galon' in name:
   for i in range(4):
    xx=.35+(i%2)*.63;yy=.35+(i//2)*.52
    pole(L,xx,yy,82,.18,'OGLASS',base=55)
    pole(L,xx,yy,87,.10,'BLUE',base=82)
  else:crates(L,5,'WOOD',.2,.24)
 if k=='bajaj':
  box(L,.28,.15,W-.24,D-.16,45,103,'ORANGE')
  box(L,.35,.11,W-.31,.27,67,94,'GLASS')
  box(L,.35,.21,W-.32,D-.22,105,110,'DARK')
  box(L,.35,D-.29,W-.35,D-.16,61,92,'DARK')
 else:
  box(L,cabStart,.16,cabEnd,D-.16,44,112 if k in ('angkot','bus','van') else 95,'CREAM' if k in ('angkot','van') else color)
  # actual glazing along side: segmented with defined mullions.
  nwin=4 if k=='bus' else 3 if k in ('angkot','van') else 2
  for i in range(nwin):
   aa=cabStart+.12+i*(cabEnd-cabStart-.25)/nwin
   bb=aa+(cabEnd-cabStart-.37)/nwin
   box(L,aa,.13,bb,.26,79,105 if k in ('angkot','bus','van') else 88,'GLASS')
   box(L,aa,.12,aa+.045,.27,79,105 if k in ('angkot','bus','van') else 88,'DARK',2)
  box(L,cabStart+.10,D-.26,cabEnd-.12,D-.15,79,105,'OGLASS')
  box(L,cabStart+.08,.12,cabEnd-.06,D-.10,112 if sedan else 96,118 if sedan else 102,'CONC')
  if k=='angkot':
   box(L,.23,.10,W-.23,.23,55,67,'GREEN')
   box(L,.33,.1,.75,.19,80,101,'DARK',2)
   board(L,'ANGKOT',53,'BLUE')
  elif k=='bus':
   box(L,.17,.1,W-.14,.20,45,60,'RED')
   board(L,'TRAVEL',52,'RED')
  elif k=='van':
   board(L,'PUSKESMAS' if 'ambulans' in name else 'TRAVEL',54,'RED')
   box(L,W*.55,.06,W*.69,.13,65,84,'RED')
   box(L,W*.60,.05,W*.65,.13,60,88,'RED')
  else:
   box(L,W-.44,D*.3,W-.2,D*.65,54,61,'DARK',2)
 # headlamps, mirrors, license-panel and bumpers are pixel art geo.
 for yy in (D*.29,D*.75):
  box(L,W-.22,yy-.08,W-.1,yy+.11,43,54,'YEL',4)
 box(L,W-.18,D*.42,W-.09,D*.59,36,41,'CONC')
 return True

def facade_pattern(w,h,name,kind,wall,accent,floors=1):
 W=max(4,int(w));H=max(4,int(h))
 t=Tex(W,H,wall,3)
 # moulding, plinth, base brick and weathering.
 t.rect(0,0,W,6,'CONC',2)
 for y in range(6,35,7):t.rect(0,y,5,y+1,'WOOD',2)
 t.rect(5,12,W-5,min(78,H-21),'DARK',2)
 t.rect(10,15,W-10,min(70,H-23),'GLASS' if kind not in ('gudang','bengkel','pasar','warung') else 'WOOD',2)
 t.rect(W//2-2,13,W//2+2,70,'DARK',2)
 for x in range(16,W-10,26):
  t.rect(x,16,x+1,68,'CONC',2)
 if kind in ('sekolah','public','ruko','kos','gereja','masjid'):
  for z in range(95,H-23,61):
   for x in range(13,W-14,36):
    t.rect(x,z,x+21,z+28,'DARK',2)
    t.rect(x+3,z+3,x+18,z+23,'GLASS',3)
    t.rect(x+10,z+3,x+12,z+24,'CONC',2)
    t.rect(x-2,z-2,x+23,z+1,'CREAM',3)
  t.rect(0,89,W,94,'CONC',4)
 if kind in ('rumah','mushola'):
  for x in (15,W-47):
   t.rect(x,26,x+23,65,'WOOD',2)
   t.rect(x+4,31,x+19,56,'DARK',3)
   t.rect(x+10,28,x+12,61,'CREAM',3)
 t.rect(0,H-30,W,H-10,accent,2)
 label=(name.replace(' Rumah','').split('/')[0]).upper()
 if len(label)>17:label=" ".join(label.split()[:2])[:17]
 t.text(W//2,H-23,label,'WHITE',4,bold=True)
 return t
