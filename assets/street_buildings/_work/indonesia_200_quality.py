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
  bike(L,m=color,rider=False,
       passenger=False,cart='roti' in name)
  if 'box' in name or 'kurir' in name or 'delivery' in name:
   box(L,.05,.12,.64,D-.13,48,82,'RED')
   board(L,'ANTAR',60,'RED')
  if k=='sepeda':
   wheel(L,.3,D*.53,.30);wheel(L,W-.3,D*.53,.30)
   box(L,.5,.52,W-.5,D*.53,38,42,'WOOD')
  return True
 if k in ('becak','bentor'):
  bike(L,.65,W-.33,D*.65,'RED',rider=False,cart=False)
  wheel(L,.39,D*.18,.21)
  box(L,.14,.12,1.14,D*.74,24,57,'CREAM')
  box(L,.16,.12,1.14,D*.74,56,63,'WOOD')
  box(L,.10,.13,1.20,D*.75,88,96,'RED')
  for xx in (.15,1.1):pole(L,xx,D*.2,89,.05,'WOOD')
  # front-facing curved seat, owner behind.
  box(L,.3,.14,.95,D*.36,60,84,'DARK')
  # Driver and passengers are now separate live Mahluk Hidup NPC rigs.
  return True
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
  return True
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
 if kind in ('sekolah','public','ruko','kos') or 'kos' in name.lower():
  for z in range(95,H-23,61):
   for x in range(13,W-14,36):
    t.rect(x,z,x+21,z+28,'DARK',2)
    t.rect(x+3,z+3,x+18,z+23,'GLASS',3)
    t.rect(x+10,z+3,x+12,z+24,'CONC',2)
    t.rect(x-2,z-2,x+23,z+1,'CREAM',3)
  t.rect(0,89,W,94,'CONC',4)
 if kind in ('masjid','mushola','gereja'):
  # Arched prayer-space openings are not corporate-office glazing.
  for x in range(14,W-15,31):
   t.rect(x,23,x+19,78,'WOOD',2)
   t.rect(x+3,26,x+16,69,'GLASS' if kind=='gereja' else 'DARK',2)
   t.rect(x+5,68,x+14,77,'CREAM',3)
   if kind!='gereja':t.rect(x+1,20,x+18,24,'GREEN',3)
 if kind in ('pasar','gudang'):
  # Large open market bays or metal roll shutters.
  for x in range(6,W-12,36):
   t.rect(x,8,x+29,84,'DARK',2)
   if kind=='gudang':
    for zz in range(13,82,7):
     t.rect(x+2,zz,x+27,zz+2,'CONC',3)
   else:
    for zz in (16,34,52):
     t.rect(x+2,zz,x+27,zz+3,'WOOD',2)
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


def building(L,s):
 shadow(L)
 name=s['label'].lower();kind=s['kind'];cat=s['category']
 W,D=L.W,L.D;N=s['num']
 residential=kind in ('rumah','kos','mushola') or name.startswith('rumah ') and cat=='bangunan'
 cafe=cat=='warung' or kind in ('warung','bengkel')
 tall=kind in ('ruko','sekolah','public','masjid','gereja','pasar','gudang')
 H=108 if cafe else 123 if residential else 182 if tall else 144
 if kind=='ruko':H=193 if 'dua' in name else 229
 if kind=='sekolah':H=195
 if kind=='masjid':H=181
 if kind=='mushola':H=129
 if kind=='gereja':H=194
 if cat=='publik':H=135
 # Each named public type must have its actual silhouette, not office template.
 if 'kos dua' in name:H=190
 if 'balai warga' in name:H=133
 if kind=='masjid':H=151
 if kind=='gereja':H=162
 if kind in ('pasar','gudang'):H=135
 accent=PALETTE[(N+1 if cat=='warung' else N+4)%len(PALETTE)]
 if 'Padang' in s['label']:accent='RED'
 elif 'Sunda' in s['label']:accent='GREEN'
 elif 'puskesmas' in name or 'apotek' in name:accent='TEAL'
 elif 'laundry' in name or 'air isi ulang' in name:accent='BLUE'
 elif 'minimarket' in name:accent='RED' if 'merah' in name else 'BLUE'
 elif kind in ('masjid','mushola'):accent='GREEN'
 elif 'sekolah' in name:accent='RED'
 wall='CREAM' if residential or N%3==0 else 'CONC' if N%3==1 else 'WHITE'
 # walls set back from footpath. Entire upper structure is NOT a faceless cube.
 fa=lambda w,h:facade_pattern(w,h,s['label'],kind,wall,accent,2 if H>155 else 1)
 box(L,.08,.55,W-.08,D-.13,0,H,wall,3,front=fa)
 # straight lintel and genuinely modelled porch/awning depth.
 box(L,.10,.40,W-.10,.65,74,82,'CONC',2)
 if cafe:
  box(L,.10,.22,W-.12,1.28,75,80,'SENG',3)
  box(L,.10,.19,W-.12,.35,77,90,accent,3)
  for a in (.12,W-.24):
   pole(L,a,.23,85,.055,'WOOD')
  # recessed dark service bay and front-facing display.
  box(L,.32,.11,W-.32,.36,7,64,'DARK',2)
  box(L,.45,.08,W-.46,.37,39,47,'WOOD')
  if any(x in name for x in ('nasi','warteg','padang','sunda','bakso','ayam','mie')):
   for i in range(5):
    a=.45+i*.35
    if a+.26>=W-.3:break
    box(L,a,.07,a+.26,.29,48,51,'WHITE')
    ball(L,a+.12,.13,53,.095,8,FOOD[(i+N)%len(FOOD)])
   # glazed food case.
   box(L,.42,.09,min(W-.38,2.52),.16,53,68,'GLASS',2)
  if 'martabak' in name:
   ball(L,W*.67,.17,51,.27,9,'TERRA')
   box(L,W*.68,.15,W*.73,.25,59,64,'YEL')
  elif 'sate' in name or 'gorengan' in name:
   box(L,W*.62,.09,W*.89,.44,43,55,'DARK')
   for i in range(5):
    a=W*.63+i*.13
    box(L,a,.10,a+.03,.42,55,60,'TERRA')
  elif 'kopi' in name or 'warmindo' in name:
   ball(L,W*.72,.17,50,.20,10,'SENG')
   for i in range(3):box(L,W*.55+i*.22,.1,W*.7+i*.22,.29,50,65,'WARM')
  elif 'pulsa' in name:
   for i in range(4):box(L,.35+i*.36,.09,.54+i*.36,.24,49,69,'BLUE' if i%2 else 'RED')
  elif 'laundry' in name:
   for a in (.42,1.05,1.69):
    box(L,a,.08,a+.5,.32,0,49,'WHITE')
    ball(L,a+.25,.05,29,.14,11,'DARK')
  elif 'air isi ulang' in name:
   galons(L,4,'OGLASS',.37,.27)
  elif 'pangkas' in name:
   pole(L,.28,.14,112,.10,'WHITE')
   for z in (25,40,55,70,85,100):
    box(L,.22,.07,.34,.22,z,z+6,'RED' if z%3 else 'BLUE')
  elif 'tambal' in name or 'bengkel' in name:
   for a in (.43,1.11):
    pole(L,a,.22,30,.21,'DARK')
   box(L,W*.66,.10,W*.89,.31,0,36,'WOOD')
  elif 'apot' in name:
   box(L,W-.47,.10,W-.22,.25,82,110,'GREEN')
   box(L,W-.57,.10,W-.13,.25,91,100,'GREEN')
  elif 'jus' in name or 'es teh' in name:
   galons(L,3,'OGLASS',.38,.26)
 elif residential:
  # sheltered porch, entry threshold, terracotta roof and water tank.
  box(L,.18,.18,W-.2,1.12,0,7,'CONC')
  for a in (.31,W-.40):pole(L,a,.38,82,.075,'WOOD')
  box(L,.23,.24,W-.26,1.15,81,90,'WOOD')
  box(L,W*.42,.12,W*.63,.36,8,62,'WOOD')
  for i in range(3):
   a=.28+i*.55
   if a+.45<W-.15:
    box(L,a,.12,a+.45,.32,0,18,'WOOD')
    ball(L,a+.22,.26,20,.14,11,'GREEN')
  if kind=='kos' or 'kos dua' in name:
   box(L,.15,.28,W-.15,1.1,93,102,'CONC')
   for a in (.3,W-.33):pole(L,a,.2,127,.05,'WOOD',base=98)
   box(L,.3,.18,W-.3,.28,126,131,'WOOD')
 else:
  # side window columns, balcony and approach steps for schools/offices.
  box(L,.23,.12,W-.2,.60,0,8,'PAVE')
  box(L,.45,.13,W-.45,.66,8,14,'CONC')
  if H>170:
   box(L,.15,.18,W-.16,.60,85,92,'CONC')
   for i in range(7):
    a=.33+i*(W-.65)/7
    box(L,a,.13,a+.05,.33,93,115,'DARK')
   box(L,.30,.12,W-.28,.25,113,118,'CREAM')
 # roof silhouettes vary significantly by real-world use.
 if residential or kind in ('gereja','gudang','pasar'):
  # sloping tiled kampung roof / warehouse zinc roof
  L.gable(.02,.50,W-.02,D-.1,H+1,H+22,'TERRA' if residential else 'SENG')
  for i in range(8):
   a=.15+i*(W-.32)/8
   box(L,a,.49,a+.04,D-.13,H+3,H+5,'WOOD' if residential else 'CONC')
 else:
  roof_flat(L,.08,.54,W-.08,D-.10,H,ph=7,
   pm='WHITE' if kind in ('public','sekolah') else 'CONC')
  if kind in ('ruko','sekolah','public'):
   for i in range(2):
    a=W*.23+i*W*.35
    box(L,a,D*.58,a+.54,D*.75,H+7,H+15,'SENG')
 # Local identity beyond generic sign and windows.
 if kind in ('masjid','mushola'):
  x=W*.60;y=D*.65
  ball(L,x,y,H+8,.82 if kind=='masjid' else .37,45 if kind=='masjid' else 26,'GREEN')
  ball(L,x,y,H+52 if kind=='masjid' else H+35,.09,10,'GOLD')
  pole(L,W-.32,D-.45,H+72 if kind=='masjid' else H+35,.11,'CREAM')
  ball(L,W-.32,D-.45,H+72 if kind=='masjid' else H+35,.15,13,'GREEN')
  if kind=='masjid':
   pole(L,.42,D*.72,H+64,.11,'CREAM')
   ball(L,.42,D*.72,H+64,.15,12,'GREEN')
  box(L,.18,.10,W*.33,.26,11,76,'DARK')
  # 3 pointed entry arches, frontage.
  for i in range(3):
   a=.42+i*.55
   ball(L,a,.20,72,.15,11,'CREAM')
 if kind=='gereja':
  box(L,W*.5-.07,D*.49,W*.5+.07,D*.62,H+13,H+54,'CREAM')
  box(L,W*.5-.27,D*.51,W*.5+.27,D*.59,H+28,H+36,'CREAM')
 if kind=='sekolah':
  # school flag and tiled front garden beds
  pole(L,W-.45,.28,110,.05,'CONC')
  box(L,W-.4,.16,W-.09,.24,81,93,'RED')
  box(L,W-.4,.16,W-.09,.24,70,81,'WHITE')
  for i in range(3):
   a=.34+i*.65
   ball(L,a,.18,7,.12,10,'GREEN')
 if kind in ('pasar','warung'):
  for i in range(4):
   a=.38+i*.52
   box(L,a,.08,a+.42,.32,7,16,FOOD[(i+N)%len(FOOD)])
 if kind=='rumah' and 'subsid' in name:
  box(L,.1,D-.30,W-.10,D-.17,39,52,'WOOD')
 if 'minimarket' in name:
  board(L,'MART',78,accent)
  for i in range(3):
   a=W*.28+i*.52
   box(L,a,.09,a+.3,.28,26,65,'CREAM')
   box(L,a,.07,a+.3,.13,50,54,'BLUE' if i%2 else 'RED')
 if kind=='pasar':
  for i in range(5):
   a=.27+i*.64
   box(L,a,.08,a+.58,.6,68,82,'BLUE' if i%2 else 'TERRA')
 if 'padang' in name:
  # Three Minang-inspired overlapping horn-shaped pitched roof sections.
  # Distinctive silhouette in the sprite rather than a large orange cube.
  for j in range(3):
   a=.32+j*(W-.64)/3
   b=min(W-.05,a+(W-.7)/3)
   L.gable(a,D*.45,b,D*.83,H+8,H+29+(j%2)*5,'TERRA')
  for a in (.45,W-.61):
   box(L,a,D*.52,a+.14,D*.73,H+7,H+21,'WOOD')
 return True

def leaf_fan(L,x,y,z,reach=.62,count=8,green='GREEN',wide=.14,drop=12):
 for i in range(count):
  theta=i*TAU/count
  ex=x+reach*math.cos(theta);ey=y+reach*math.sin(theta)
  mx=x+reach*.53*math.cos(theta);my=y+reach*.53*math.sin(theta)
  box(L,mx-wide,my-wide,mx+wide,my+wide,z-drop*.45,z+1,green,2+i%3)
  box(L,ex-wide*.78,ey-wide*.78,ex+wide*.78,ey+wide*.78,
      z-drop,z-drop*.40,green,3)
 ball(L,x,y,z-4,.20,13,green)
def forest_crown(L,x,y,z,rad=.46,base='GREEN',fruit=None):
 for i in range(7):
  theta=i*TAU/7
  px=x+rad*.79*math.cos(theta)
  py=y+rad*.78*math.sin(theta)
  ball(L,px,py,z-(i%3)*9,.37,24,base,3 if i%2 else 2)
 ball(L,x,y,z+8,.52,28,base)
 if fruit:
  for i in range(9):
   theta=i*TAU/9
   xx=x+rad*.92*math.cos(theta);yy=y+rad*.88*math.sin(theta)
   ball(L,xx,yy,z-24-(i%3)*6,.075,9,fruit,4)
def palms(L,x,y,z):
 pole(L,x,y,z,.12,'WOOD')
 for h in range(16,z,18):
  box(L,x-.10,y-.09,x+.1,y+.1,h,h+3,'TERRA')
 leaf_fan(L,x,y,z+5,.97,9,'GREEN',.20,24)
 for dx,dy in ((.12,.13),(-.10,.18),(.19,-.1)):
  ball(L,x+dx,y+dy,z-10,.11,13,'WOOD')
def grass_leaf(L,x,y,h=48,col='TEAL'):
 pole(L,x,y,h,.035,'GREEN')
 for dx,dy,dz in ((-.24,0,-11),(.24,0,-13),(0,-.25,-9),(0,.27,-14)):
  box(L,x+dx-.06,y+dy-.045,x+dx+.06,y+dy+.045,h+dz,h+dz+23,col)
def plant(L,s):
 shadow(L);kind=s['kind'];N=s['num'];name=s['label'].lower()
 X=L.W*.5;Y=L.D*.50
 if kind in ('air','padi'):
  if kind=='padi':
   for i in range(26):
    a=.16+(i%7)*.32;b=.15+(i//7)*.44
    grass_leaf(L,a,b,29+(i%4)*6,'GREEN')
    ball(L,a,b,35+(i%4)*6,.055,9,'YEL')
  else:
   # floating leaves + isolated pink/white flowers, without square lake tile
   for i in range(14):
    a=.22+(i%4)*.41;b=.15+(i//4)*.37
    ball(L,a,b,4,.17,4,'GREEN' if i%3 else 'TEAL')
    if i%4==0:
     ball(L,a,b,7,.085,7,'PINK' if 'teratai' in name else 'CREAM')
  return True
 if kind in ('semak','ilalang','pandan','pot'):
  if kind=='pot':
   box(L,X-.37,Y-.32,X+.37,Y+.32,0,26,'TERRA' if 'monstera' in name else 'CONC')
   box(L,X-.4,Y-.35,X+.4,Y+.35,24,30,'WOOD',2)
  for i in range(12 if kind=='ilalang' else 8):
   th=i*TAU/(12 if kind=='ilalang' else 8)
   ax=X+.38*math.cos(th);ay=Y+.37*math.sin(th)
   h=(37+i%5*7)+(17 if kind!='ilalang' else 25)
   grass_leaf(L,ax,ay,h,'GREEN' if i%2 else 'TEAL')
   if kind=='semak':
    ball(L,ax,ay,h,.115,10,'PINK' if 'bougenville' in name else 'RED' if i%4==0 else 'GREEN')
   if kind=='pot' and 'lidah' in name:
    box(L,ax-.04,ay-.07,ax+.04,ay+.07,30,h+25,'TEAL')
    box(L,ax-.018,ay-.08,ax+.018,ay+.08,35,h+20,'YEL')
  return True
 if kind=='bambu':
  for j in range(7):
   xx=X+(j%3-1)*.28;yy=Y+(j//3-1)*.28
   top=104+(j%4)*12
   pole(L,xx,yy,top,.055,'TEAL')
   for h in range(18,top,23):
    box(L,xx-.065,yy-.065,xx+.065,yy+.065,h,h+2,'YEL')
   leaf_fan(L,xx,yy,top-.6,.31,6,'GREEN',.08,13)
  return True
 if kind=='pisang':
  for j,(dx,dy,height) in enumerate(((-.32,-.14,116),(.28,.22,97),(-.13,.36,81))):
   xx=X+dx;yy=Y+dy
   pole(L,xx,yy,height,.115,'TEAL')
   for k in range(7):
    th=k*TAU/7
    ex=xx+.70*math.cos(th);ey=yy+.65*math.sin(th)
    mx=(xx+ex)/2;my=(yy+ey)/2
    box(L,mx-.16,my-.12,mx+.17,my+.12,height-15,height-6,'GREEN',2)
    box(L,ex-.17,ey-.10,ex+.17,ey+.10,height-24,height-10,'TEAL',3)
   if j==0:
    for h in (73,85,97):
     ball(L,xx+.14,yy+.14,h,.08,8,'YEL')
  return True
 if kind=='pepaya':
  pole(L,X,Y,132,.13,'WOOD')
  leaf_fan(L,X,Y,138,.73,10,'GREEN',.17,15)
  for dx,dy,h in ((.18,.11,101),(-.14,.18,115),(.08,-.17,89)):
   ball(L,X+dx,Y+dy,h,.17,19,'YEL')
  return True
 if kind=='kelapa':
  palms(L,X,Y,136);return True
 if kind=='kamboja':
  pole(L,X,Y,92,.15,'CONC')
  for k in range(5):
   th=k*TAU/5;xx=X+.5*math.cos(th);yy=Y+.5*math.sin(th)
   pole(L,xx,yy,102+k%2*10,.055,'CONC',base=40)
   ball(L,xx,yy,112,.30,21,'TEAL')
   for j in range(3):
    ball(L,xx+.1*math.cos(j*TAU/3),yy+.1*math.sin(j*TAU/3),136,.085,8,'CREAM')
  return True
 if kind in ('pohon','ketapang'):
  pole(L,X,Y,119 if kind=='pohon' else 131,.17,'WOOD')
  fruit=None
  if 'mangga' in name:fruit='YEL'
  if 'rambutan' in name:fruit='RED'
  if 'sawo' in name:fruit='WOOD'
  forest_crown(L,X,Y,126 if kind=='pohon' else 141,
     .54 if kind=='pohon' else .77,'TEAL' if kind=='ketapang' or 'sawo' in name else 'GREEN',fruit)
  if kind=='ketapang':
   for i in range(5):
    angle=i*TAU/5
    ball(L,X+.65*math.cos(angle),Y+.61*math.sin(angle),104,.24,16,'GREEN')
  return True
 return False


def stall(L,name,color='BLUE',roof=108):
 # Four construction posts, striped tarpaulin, low fruit/meat display stands.
 for x in (.18,L.W-.24):
  for y in (.15,L.D-.26):pole(L,x,y,roof,.047,'WOOD')
 box(L,.07,.10,L.W-.07,L.D-.10,roof,roof+8,color)
 for i in range(6):
  xx=.13+i*(L.W-.25)/6
  box(L,xx,.08,xx+.22,.25,roof-11,roof+3,'CREAM' if i%2 else color)
 box(L,.15,.20,L.W-.16,L.D-.22,9,32,'WOOD')
 box(L,.13,.20,L.W-.15,L.D-.20,32,38,'SENG')
 board(L,name,roof-34,color)
def merch(L,name,allDifferent=False):
 n=name.lower()
 if 'ikan' in n:
  for i in range(5):
   a=.3+i*.38
   ball(L,a,L.D*.4,45,.17,8,'FBLUE')
   ball(L,a+.11,L.D*.43,47,.055,5,'CONC')
 elif 'ayam' in n:
  for i in range(5):
   a=.3+i*.34
   ball(L,a,L.D*.45,44,.17,9,'CREAM')
 elif 'bumbu' in n:
  for i in range(9):
   a=.3+(i%5)*.36;b=.33+(i//5)*.47
   ball(L,a,b,42,.11,7,FOOD[i%7])
 elif 'buah' in n:
  for i in range(13):
   a=.25+(i%5)*.38;b=.28+(i//5)*.31
   ball(L,a,b,40,.105,10,'ORANGE' if i%3 else 'GREEN')
 else:
  for i in range(12):
   a=.25+(i%5)*.39;b=.24+(i//5)*.26
   ball(L,a,b,40,.09,10,'GREEN' if i%3 else 'YEL')
def cart(L,s):
 shadow(L);N=s['num'];kind=s['kind'];name=s['label']
 W,D=L.W,L.D;color=PALETTE[(N+3)%len(PALETTE)]
 if kind in ('lapak','tenda'):
  stall(L,name,color)
  merch(L,name)
  if 'sayur' in name.lower():
   for i in range(4):
    a=.3+i*.49
    box(L,a,.15,a+.43,.43,0,23,'WOOD')
  return True
 # Every mobile food cart: wheels, wooden chassis, stainless counter,
 # realistic hanging canopy and typed cooking equipment, not a hollow frame.
 wheel(L,.44,D*.51,.22);wheel(L,W-.49,D*.51,.22)
 box(L,.14,.18,W-.17,D-.20,19,53,'WOOD')
 box(L,.11,.15,W-.14,D-.19,53,59,'SENG')
 for xx in (.23,W-.26):pole(L,xx,.20,113,.065,'WOOD',base=51)
 box(L,.09,.10,W-.12,D-.14,114,123,color)
 for i in range(7):
  a=.1+i*(W-.2)/7
  box(L,a,.09,a+.14,.22,109,115,'CREAM' if i%2 else color)
 board(L,name.replace('Gerobak ','')[:13],80,color)
 # glazed showcase and individual food silhouettes
 box(L,.28,.14,1.23,D-.22,59,87,'OGLASS',2)
 box(L,.32,.12,1.18,D-.23,61,66,'CONC')
 for i in range(5):
  x=.4+(i%3)*.22;y=.25+(i//3)*.38
  ball(L,x,y,70,.11,10,FOOD[(i+N)%7])
 nn=name.lower()
 if any(q in nn for q in ('sate','jagung','kerak telor','tahu bulat')):
  box(L,W*.51,.22,W-.25,D-.3,59,67,'DARK')
  for i in range(7):
   x=W*.53+i*.18
   box(L,x,.28,x+.055,D-.35,66,71,'TERRA')
  for i in range(4):
   ball(L,W*.58+i*.18,D*.6,72,.085,6,'ORANGE')
 elif any(q in nn for q in ('es cendol','es doger')):
  for i in range(3):
   x=W*.56+i*.31
   pole(L,x,D*.43,74,.17,'OGLASS',base=59)
   box(L,x-.13,D*.27,x+.13,D*.55,71,78,'GREEN' if 'cendol' in nn else 'PINK')
 elif any(q in nn for q in ('bakmi','bubur','cilok','pempek','nasgor','nasi goreng','ketoprak')):
  for i in range(2):
   x=W*.61+i*.39
   ball(L,x,D*.46,61,.28,14,'SENG')
   ball(L,x,D*.46,73,.15,7,'CREAM')
   if i==0:
    pole(L,x+.19,D*.38,89,.027,'WOOD',base=73)
  box(L,W-.59,D*.26,W-.24,D*.58,38,59,'GREEN')
 else:
  crates(L,3,'WOOD',W*.47,.23)
 # pushing handle and rubber grip
 box(L,W-.19,D*.24,W-.08,D*.67,40,45,'DARK')
 return True

def produce_market(L,s):
 shadow(L);k=s['kind'];name=s['label'].lower()
 if k in ('lapak','tenda'):return cart(L,s)
 if 'karung' in name:return sacks(L,5) or True
 if 'buah plastik' in name or 'styrofoam' in name:
  crates(L,5,'WOOD' if 'buah' in name else 'WHITE');return True
 if k=='gas':gas(L,5);return True
 if k=='galon':galons(L,5);return True
 if k=='etalase':
  box(L,.18,.19,L.W-.16,L.D-.18,0,47,'WOOD')
  box(L,.2,.19,L.W-.19,L.D-.20,47,90,'OGLASS')
  for i in range(5):
   a=.22+i*.36
   ball(L,a,.3,55,.12,9,FOOD[i%7])
  box(L,.16,.15,L.W-.15,L.D-.15,88,94,'SENG')
  return True
 if k=='payung':
  pole(L,L.W*.5,L.D*.5,111,.055,'WOOD')
  for i in range(10):
   th=TAU*i/10
   x=L.W*.5+math.cos(th)*.72;y=L.D*.5+math.sin(th)*.69
   ball(L,x,y,91,.23,15,'RED' if i%2 else 'YEL')
  ball(L,L.W*.5,L.D*.5,106,.40,17,'RED')
  return True
 if k=='freezer':
  box(L,.20,.24,L.W-.22,L.D-.25,0,62,'WHITE')
  box(L,.15,.20,L.W-.17,L.D-.18,62,70,'BLUE')
  for i in range(3):
   a=.25+i*.55
   box(L,a,.19,a+.4,.31,66,70,'GLASS')
  board(L,'ES KRIM',46,'BLUE')
  return True
 if k=='rak':
  for z in (5,41,75):
   box(L,.16,.19,L.W-.16,L.D-.20,z,z+5,'WOOD')
  for x in (.17,L.W-.27):pole(L,x,.24,101,.065,'CONC')
  for i in range(15):
   a=.22+(i%5)*.37;b=.26+(i//5)*.41
   box(L,a,b,a+.22,b+.25,8+(i//5)*34,26+(i//5)*34,FOOD[i%7],3)
  return True
 if k=='timbangan':
  box(L,.16,.2,L.W-.18,L.D-.19,0,28,'BLUE')
  box(L,.30,.28,L.W-.32,L.D-.31,28,35,'SENG')
  box(L,L.W*.46,.10,L.W*.66,.22,20,32,'DARK')
  return True
 if k in ('meja','kursi','bangku'):
  for x in (.21,L.W-.33):
   for y in (.27,L.D-.34):pole(L,x,y,36,.05,'WOOD')
  box(L,.12,.17,L.W-.13,L.D-.20,35,42,'BLUE' if k=='kursi' else 'WOOD')
  if k=='kursi':
   box(L,.12,L.D-.38,L.W-.13,L.D-.25,42,85,'BLUE')
  return True
 if k=='gerobak':return cart(L,s)
 if k in ('kompor','panci','penanak','nampan','lampu'):
  if k=='kompor':
   box(L,.24,.23,L.W-.23,L.D-.24,0,29,'DARK')
   for a in (.56,L.W-.47):
    ball(L,a,L.D*.5,30,.23,7,'SENG')
    ball(L,a,L.D*.5,39,.11,5,'ORANGE')
   box(L,.14,.18,L.W-.15,L.D-.21,28,32,'CONC')
  elif k=='panci':
   for a in (.48,1.23):
    pole(L,a,L.D*.5,55,.30,'SENG')
    ball(L,a,L.D*.5,55,.3,8,'CONC')
    box(L,a-.36,L.D*.42,a+.36,L.D*.58,56,62,'WOOD')
  elif k=='penanak':
   box(L,.25,.23,L.W-.20,L.D-.2,0,46,'WHITE')
   box(L,.22,.22,L.W-.18,L.D-.18,45,54,'CONC')
   ball(L,L.W*.5,L.D*.52,56,.23,8,'WHITE')
   box(L,L.W*.45,.15,L.W*.57,.24,29,40,'RED')
  elif k=='nampan':
   box(L,.15,.18,L.W-.15,L.D-.18,0,9,'SENG')
   for i in range(15):
    a=.23+(i%5)*.36;b=.26+(i//5)*.41
    ball(L,a,b,9,.12,7,'TERRA' if i%2 else 'YEL')
  elif k=='lampu':
   pole(L,L.W*.5,L.D*.5,115,.055,'WOOD')
   ball(L,L.W*.5,L.D*.5,114,.26,13,'YEL')
   box(L,L.W*.2,L.D*.33,L.W*.8,L.D*.67,111,118,'WOOD')
  return True
 return None

def home(L,s):
 shadow(L);k=s['kind'];name=s['label'].lower();W=L.W;D=L.D
 if k in ('toren','antena','parabola','sangkar','kandang','wudhu'):
  # Reuse hand-modelled silhouettes from the bespoke Indonesian objects module.
  from indonesia_200_details import special
  if special(L,s):return True
 if k=='jemuran':
  for x in (.14,W-.22):pole(L,x,.5,116,.07,'WOOD')
  box(L,.17,.45,W-.20,.51,112,116,'SENG')
  for i in range(7):
   a=.20+i*(W-.48)/7
   hh=55+i%3*8
   box(L,a,.39,a+.32,.54,hh,111,CLOTH[i%7],2+(i%3))
   box(L,a+.09,.37,a+.12,.56,111,113,'CONC')
  return True
 if k=='pagar':
  mat='WOOD' if 'roster' in name else 'DARK'
  if 'roster' in name:
   for i in range(12):
    x=.11+i*(W-.21)/12
    box(L,x,.40,x+.18,.62,0,67,'CREAM')
    box(L,x+.05,.37,x+.11,.64,18,54,'DARK',2)
   box(L,.10,.36,W-.1,.65,64,69,'CONC')
  else:
   for i in range(12):
    x=.11+i*(W-.20)/12
    box(L,x,.40,x+.07,.61,0,74,mat)
   box(L,.10,.35,W-.09,.64,31,36,'DARK')
   box(L,.10,.35,W-.09,.64,69,75,'DARK')
  return True
 if k in ('kanopi','pos'):
  for x in (.17,W-.24):
   for y in (.20,D-.28):
    pole(L,x,y,101,.055,'WOOD' if k=='pos' else 'CONC')
  box(L,.09,.12,W-.11,D-.12,100,107,'SENG')
  for i in range(8):
   a=.10+i*(W-.2)/8
   box(L,a,.10,a+.05,D-.14,101,107,'CONC')
  if k=='pos':
   box(L,.17,.22,W-.17,D-.20,0,66,'CREAM')
   box(L,.28,.12,W-.25,.29,28,66,'GLASS')
   board(L,'POS RONDA',75,'BLUE')
  return True
 if k=='bangku':
  for x in (.3,W-.43):
   for y in (.26,D-.32):pole(L,x,y,38,.065,'WOOD')
  box(L,.16,.19,W-.14,D-.16,37,43,'WOOD')
  box(L,.19,D-.3,W-.19,D-.2,43,71,'WOOD')
  return True
 if k=='rak':
  for z in (8,38,70):
   box(L,.13,.18,W-.13,D-.19,z,z+6,'WOOD')
  for x in (.18,W-.24):pole(L,x,.24,97,.07,'WOOD')
  for i in range(7):
   a=.28+i*.20
   if a+.16<W:
    box(L,a,.18,a+.15,.39,14+i%2*32,25+i%2*32,'DARK' if i%2 else 'TERRA')
  return True
 if k=='pot':
  box(L,W*.5-.43,D*.5-.35,W*.5+.43,D*.5+.38,0,32,'TERRA')
  box(L,W*.5-.46,D*.5-.38,W*.5+.46,D*.5+.40,29,35,'CONC')
  for i in range(9):
   th=TAU*i/9
   x=W*.5+.29*math.cos(th);y=D*.5+.27*math.sin(th)
   pole(L,x,y,54+i%3*7,.032,'WOOD',base=31)
   ball(L,x,y,53+i%3*7,.17,12,'GREEN')
  return True
 if k=='sampah':
  box(L,.2,.2,W-.18,D-.21,0,52,'BLUE' if s['num']%2 else 'TERRA')
  box(L,.15,.17,W-.12,D-.18,53,59,'DARK')
  box(L,W*.41,.15,W*.63,.25,59,63,'CONC')
  return True
 if k=='kotak':
  box(L,.25,.26,W-.23,D-.20,17,73,'CONC')
  box(L,.27,.21,W-.26,.30,42,48,'DARK')
  board(L,'PLN',65,'BLUE')
  return True
 if k=='pompa':
  ball(L,W*.5,D*.5,2,.32,11,'CONC')
  pole(L,W*.5,D*.5,74,.09,'CONC')
  box(L,W*.3,.24,W*.72,.40,69,75,'DARK')
  ball(L,W*.65,D*.5,71,.12,9,'RED')
  return True
 if k=='papan':
  for x in (.24,W-.31):pole(L,x,D*.5,106,.075,'WOOD')
  box(L,.17,.37,W-.15,D*.61,74,114,'CREAM')
  board(L,'INFO RT/RW',84,'GREEN')
  return True
 # exact distinctive other props
 from indonesia_200_details import special
 if special(L,s):return True
 return None

def streets(L,s):
 shadow(L);k=s['kind'];name=s['label'].lower();W=L.W;D=L.D
 from indonesia_200_details import special
 if k=='lampu' and 'merah' not in name:
  # PJU is an outward-facing lantern, NOT a red/yellow/green traffic signal.
  pole(L,W*.5,D*.54,133,.075,'CONC' if 'modern' in name else 'WOOD')
  box(L,W*.46,D*.46,W*.92,D*.55,120,127,'SENG')
  ball(L,W*.87,D*.5,113,.20,12,'YEL')
  if 'antik' in name:
   box(L,W*.73,D*.43,W*.98,D*.57,116,123,'WOOD')
   ball(L,W*.86,D*.5,114,.22,14,'WARM')
  return True
 if k in ('cone','hidran','tiang','portal','blok','lampu') or k=='jalan':
  if special(L,s):return True
 if k=='halte':
  canopy(L,114,'BLUE')
  box(L,.16,D-.29,W-.16,D-.20,12,97,'OGLASS',2)
  for x in (.28,W-.37):pole(L,x,D-.23,114,.055,'CONC')
  box(L,.3,.18,W-.30,.53,33,41,'WOOD')
  for x in (.38,W-.49):pole(L,x,.39,33,.05,'WOOD')
  board(L,'TRANSJAKARTA' if 'TransJakarta' in s['label'] else 'ANGKOT',82,'BLUE')
  return True
 if k=='gapura':
  for x in (.12,W-.30):
   box(L,x,.17,x+.25,D-.16,0,123,'CREAM')
   box(L,x+.04,.18,x+.21,.39,42,112,'TERRA')
  box(L,.10,.14,W-.1,D-.14,121,140,'TERRA')
  board(L,'RT RW',114,'RED')
  for x in (.15,W-.22):
   pole(L,x,.33,150,.045,'WOOD',base=135)
   box(L,x+.03,.25,x+.31,.35,135,147,'RED')
   box(L,x+.03,.25,x+.31,.35,123,135,'WHITE')
  return True
 if k=='pos':
  canopy(L,112,'BLUE')
  box(L,.25,.20,W-.25,D-.24,0,72,'CONC')
  box(L,.33,.12,W-.31,.32,31,67,'OGLASS')
  board(L,'POS POLISI' if 'polisi' in name else 'PARKIR',79,'BLUE')
  return True
 if k in ('gardu','trafo'):
  box(L,.15,.20,W-.15,D-.18,0,97,'CONC')
  box(L,.12,.20,W-.14,D-.18,97,105,'SENG')
  for i in range(4):
   x=.25+i*.29
   box(L,x,.13,x+.10,.25,37,82,'DARK')
  board(L,'PLN',65,'YEL')
  if k=='trafo':
   for x in (.35,.81,1.25):
    pole(L,x,D*.54,118,.07,'DARK',base=97)
    ball(L,x,D*.54,119,.12,6,'WHITE')
  return True
 if k in ('papan','banner'):
  for x in (.25,W-.34):pole(L,x,D*.5,116,.07,'WOOD')
  box(L,.15,.29,W-.15,D*.71,86,123,'BLUE' if k=='papan' else 'GREEN')
  board(L,'JL GANG' if 'gang' in name else 'INFO WARGA',94,'BLUE')
  return True
 if k=='jalan':
  box(L,.10,.15,W-.1,D-.15,0,3,'ASPH')
  for i in range(6):
   x=.2+i*(W-.40)/6
   box(L,x,.19,x+.16,D-.20,3,5,'WHITE')
  return True
 if special(L,s):return True
 return False

def celebration(L,s):
 shadow(L);k=s['kind'];name=s['label'].lower();W=L.W;D=L.D
 from indonesia_200_details import special
 if k in ('bedug','ondel','speaker','tugu','pinang','sangkar') and special(L,s):return True
 if k in ('tenda','panggung','pendopo','gapura','booth'):
  canopy(L,120,'RED' if '17' in name else 'BLUE' if 'hajatan' in name else 'TERRA')
  for i in range(10):
   x=.12+i*(W-.2)/10
   box(L,x,.08,x+.13,.24,107-i%3*3,120,'CREAM' if i%2 else 'RED')
  box(L,.18,.19,W-.18,D-.17,0,14,'WOOD')
  if k=='panggung':
   box(L,.16,.20,W-.16,D-.19,14,42,'WOOD')
   box(L,.12,D-.34,W-.12,D-.20,42,103,'RED')
   for x in (.4,W-.8):
    box(L,x,.14,x+.31,.38,42,81,'DARK')
  elif k=='tenda':
   for i in range(8):
    x=.30+(i%4)*.48;y=.4+(i//4)*1.05
    if x+.32<W:
     box(L,x,y,x+.32,y+.28,0,33,'BLUE')
     box(L,x,y+.20,x+.32,y+.28,33,62,'BLUE')
  elif k=='booth':
   box(L,.25,.21,W-.24,D-.21,0,67,'CREAM')
   box(L,.31,.13,W-.31,.34,32,57,'OGLASS')
   board(L,'POSYANDU',79,'GREEN')
  elif k=='gapura':
   for xx in (.13,W-.31):
    box(L,xx,.19,xx+.25,D-.21,0,118,'WHITE')
   board(L,'MERDEKA',105,'RED')
  elif k=='pendopo':
   for i in range(5):
    x=.3+i*.55
    box(L,x,.37,x+.31,D-.33,12,34,'WOOD')
  return True
 if k in ('bendera','umbul'):
  for j in range(1 if k=='bendera' else 3):
   x=.18+j*.6;pole(L,x,D*.5,128,.065,'WOOD')
   if k=='bendera':
    box(L,x+.08,D*.41,x+.69,D*.52,98,113,'RED')
    box(L,x+.08,D*.41,x+.69,D*.52,84,98,'WHITE')
   else:
    for i in range(6):
     box(L,x+.075,D*.4,x+.35-i*.04,D*.55,110-i*11,120-i*11,'RED' if i%2 else 'WHITE')
  return True
 if k=='toa':
  pole(L,W*.5,D*.5,123,.08,'CONC')
  for i in range(3):ball(L,.3+i*.49,D*.5,120,.14,12,'WHITE')
  return True
 if k in ('rak','kursi','meja','wastafel'):
  # Reuse market furniture recipes except ritual washbasin.
  if k=='wastafel':
   box(L,.20,.22,W-.19,D-.19,0,72,'WHITE')
   ball(L,W*.5,D*.44,72,.28,7,'GLASS')
   pole(L,W*.50,D*.32,91,.05,'CONC',base=73)
   return True
  return produce_market(L,{**s,'kind':'rak' if k=='rak' else k})
 if k in ('banner','papan','baliho'):
  for xx in (.15,W-.25):pole(L,xx,D*.50,121,.07,'WOOD')
  box(L,.13,.27,W-.15,D*.63,89,122,'RED' if '17' in name else 'GREEN')
  board(L,'INFO WARGA',98,'WHITE')
  return True
 return False

def public_facility(L,s):
 shadow(L);k=s['kind'];name=s['label'].lower();W=L.W;D=L.D
 if k in ('warung','public','saung','mushola'):return building(L,s)
 if k in ('booth','pos'):
  if 'atm' in name:
   box(L,.18,.20,W-.2,D-.23,0,116,'WHITE')
   box(L,.14,.17,W-.14,D-.19,116,124,'BLUE')
   box(L,.38,.13,W-.35,.29,20,77,'GLASS')
   box(L,W*.48,.10,W*.65,.22,44,67,'DARK')
   board(L,'ATM',88,'BLUE')
  else:
   canopy(L,110,'GREEN')
   box(L,.22,.22,W-.22,D-.20,0,64,'CREAM')
   box(L,.28,.13,W-.28,.32,25,52,'WOOD')
   board(L,'PANGKALAN',78,'GREEN')
  return True
 if k=='pommini':
  box(L,.19,.21,W-.20,D-.22,0,95,'WHITE')
  box(L,.16,.18,W-.17,D-.19,95,103,'RED')
  box(L,.27,.13,W-.26,.28,58,81,'GLASS')
  box(L,W*.44,.09,W*.61,.17,35,47,'DARK')
  board(L,'BENSIN',78,'RED')
  return True
 if k=='bts':
  for i in range(4):
   x=.22+i*.35
   pole(L,x,D*.5,138,.06,'CONC')
   for z in (31,62,93):box(L,.16,D*.40,W-.16,D*.55,z,z+3,'CONC')
   ball(L,x,D*.5,140,.08,8,'WHITE')
  return True
 if k in ('sampah','gerobak'):
  box(L,.16,.18,W-.18,D-.22,10,77,'GREEN' if 'kebersihan' in name else 'CONC')
  box(L,.13,.15,W-.15,D-.18,76,84,'SENG')
  if k=='gerobak':
   wheel(L,.32,D*.42,.22);wheel(L,W-.40,D*.42,.22)
   box(L,W-.15,D*.37,W-.07,D*.64,28,34,'WOOD')
  return True
 if k=='lapangan':
  box(L,.1,.12,W-.1,D-.12,0,3,'GREEN')
  for i in range(6):
   x=.12+i*(W-.2)/6;box(L,x,.15,x+.04,D-.15,3,5,'WHITE')
  for x in (.17,W-.24):pole(L,x,D*.5,112,.06,'WOOD')
  for z in (52,68,84):box(L,.18,D*.47,W-.22,D*.54,z,z+2,'WHITE')
  return True
 if k=='basket':
  pole(L,W*.54,D*.61,111,.07,'CONC')
  box(L,W*.3,D*.43,W*.8,D*.58,108,135,'WHITE')
  box(L,W*.45,D*.33,W*.65,D*.41,96,102,'RED')
  ball(L,W*.55,D*.34,96,.18,6,'RED')
  return True
 if k in ('sangkar','papan'):
  from indonesia_200_details import special
  if special(L,s):return True
  for x in (.18,W-.23):pole(L,x,D*.5,116,.06,'WOOD')
  box(L,.12,.3,W-.12,D*.63,89,123,'GREEN')
  board(L,'OJEK',95,'WHITE')
  return True
 return False

def render(L,s):
 c=s['category'];k=s['kind']
 if c=='transport':return vehicle(L,s)
 if c in ('warung','bangunan'):return building(L,s)
 if c=='tanaman':return plant(L,s)
 if c=='gerobak':return cart(L,s) if k=='gerobak' else produce_market(L,s)
 if c=='pasar':return produce_market(L,s)
 if c=='rumah':return home(L,s)
 if c=='jalan':return streets(L,s)
 if c=='budaya':return celebration(L,s)
 if c=='publik':return public_facility(L,s)
 return False
