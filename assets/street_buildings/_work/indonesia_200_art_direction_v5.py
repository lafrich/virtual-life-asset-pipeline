"""Indonesia 200 • Art Direction v5 — contextual, hand-articulated pixel finishing.

This is a native scene-geometry pass, not thumbnail retouching.
All geometry uses the existing exact-pixel 2:1 Loc/Spr renderer. Avoid adding
generic random noise: each decoration follows the asset's label, use and scale.
No opaque rectangular ground plates are introduced here.
"""
from __future__ import annotations

import math

from indonesia_200_quality import box, pole, ball, board
from lib import Tex

T=math.tau
PAINT=('TERRA','GREEN','BLUE','CREAM','RED','TEAL','WOOD','CONC')
FRUIT=('GREEN','YEL','ORANGE','RED','TERRA','CREAM')

def small_leaf(L,x,y,z,col='GREEN',stem=True):
 if stem:pole(L,x,y,z-6,.023,'WOOD',base=max(0,z-25))
 box(L,x-.095,y-.09,x+.095,y+.09,z-8,z+2,col,3)
 box(L,x-.045,y-.08,x+.065,y+.04,z+2,z+5,'TEAL',3)

def awning_stripes(L,z,width=5,striped='BLUE'):
 for i in range(width):
  x=.2+i*(L.W-.40)/width
  box(L,x,.09,x+(L.W-.40)/width*.49,.24,z-7,z+4,
      'CREAM' if i%2 else striped,3)

def small_sign(L,label,z,col='CREAM',x=None):
 x=x if x is not None else L.W*.65
 w=.56
 box(L,x-.04,.10,x+w,.27,z,z+25,'DARK')
 tx=Tex(25,21,col,3)
 tx.text(13,10,label.upper()[:5],'DARK',4,sc=1)
 L.front(max(.08,x),min(L.W-.08,x+w),.08,z,z+21,tx,dep=2)

def dust_or_clutter(L,count=4,y=.23,m='TERRA',z=2):
 for i in range(count):
  x=.23+(i+.5)*(L.W-.46)/count
  box(L,x,y,x+.06,y+.09,z,z+2,m,2)

def post_stripes(L,x,y,z0=28,z1=78,m='RED'):
 for z in range(z0,z1,11):
  box(L,x-.13,y-.12,x+.14,y+.12,z,z+4,m,4)

def glass_glint(L,x,y,z=83,length=.25):
 box(L,x,y,x+length,y+.05,z,z+4,'FBLUE',4)
 box(L,x+.05,y,x+.12,y+.04,z+5,z+11,'WHITE',4)

def roof_vent(L,x,y,z,mat='SENG'):
 box(L,x-.20,y-.22,x+.19,y+.21,z,z+9,mat,3)
 box(L,x-.25,y-.27,x+.23,y+.26,z+9,z+12,'CONC')
 for j in range(3):
  a=x-.15+j*.12
  box(L,a,y-.25,a+.06,y-.18,z+3,z+8,'DARK',2)

def vent_face(L,x,z,material='DARK'):
 for i in range(4):
  a=x+i*.12
  box(L,a,.105,a+.06,.22,z+i%2,z+i%2+11,material,2)

def cargo_tie(L,x0,x1,z=63):
 box(L,x0,.12,x1,.18,z,z+4,'DARK')
 box(L,x0,.16,x0+.08,.68,z-4,z+14,'WOOD')
 box(L,x1-.05,.16,x1+.03,.68,z-4,z+14,'WOOD')

def detail_transport(L,s):
 name=s['label'].lower()
 k=s['kind'];W=L.W;D=L.D
 if k in ('angkot','bus','van','pickup','truck','bajaj'):
  # Real vehicle micro-art: brake lights, weather seals, rubber running board,
  # side mirror, front-panel bolts and separated license-plate strip.
  box(L,W-.33,D*.34,W-.13,D*.44,43,50,'CREAM')
  box(L,W-.33,D*.63,W-.13,D*.74,43,50,'RED')
  box(L,W-.28,D*.48,W-.08,D*.54,32,36,'DARK')
  for x in (.38,W*.69):
   glass_glint(L,x,.11,83,.21)
  if k!='bajaj':
   box(L,W*.68,.05,W*.85,.16,71,76,'DARK')
   pole(L,W*.73,.11,78,.035,'WOOD',base=55)
 if k=='angkot':
  box(L,.34,.11,W*.66,.24,60,66,'GREEN')
  box(L,W*.23,.07,W*.50,.15,51,55,'YEL')
  for i in range(5):
   x=.46+i*.29
   box(L,x,.09,x+.05,.17,86,103,'DARK')
  box(L,W*.36,.08,W*.52,.16,36,48,'DARK')
  small_sign(L,'KOTA',58,'YEL',W*.19)
 elif k=='bajaj':
  # Round roof/black tarpaulin arches and open passenger door.
  ball(L,W*.48,D*.52,100,.47,18,'DARK')
  box(L,W*.22,.10,W*.73,.24,48,78,'DARK')
  box(L,W*.26,.09,W*.66,.20,78,92,'FBLUE')
  box(L,W*.72,.12,W*.85,D*.32,51,82,'ORANGE')
  box(L,W*.32,.10,W*.48,.20,31,36,'DARK')
 elif k in ('bus','van'):
  if 'bus kota' in name:
   for i in range(4):
    x=.42+i*(W-.82)/4
    box(L,x,.07,x+.20,.18,54,60,'BLUE')
   for x in (.44,W*.72):
    box(L,x,.08,x+.13,.19,76,101,'DARK')
   box(L,W*.62,.11,W*.81,.18,29,41,'DARK')
   small_sign(L,'KOTA',53,'YEL')
  if 'elf' in name:
   box(L,.35,.06,W-.30,.16,51,58,'BLUE')
   for i in range(3):
    x=.41+i*.50
    box(L,x,.07,x+.065,.17,71,105,'DARK')
   small_sign(L,'ELF',61,'YEL')
  if 'ambulans' in name:
   box(L,W*.42,D*.34,W*.58,D*.53,117,123,'RED')
   for x in (W*.35,W*.64):
    ball(L,x,D*.47,124,.12,8,'RED' if x<W*.5 else 'BLUE')
   box(L,.48,.06,.61,.15,63,87,'RED')
   box(L,.41,.06,.69,.15,72,79,'RED')
 elif k in ('pickup','truck'):
  if 'sayur' in name:
   for i in range(10):
    x=.28+(i%4)*.35;y=.28+(i//4)*.40
    small_leaf(L,x,y,82+(i%3)*4,'TEAL' if i%2 else 'GREEN')
   cargo_tie(L,.18,W*.56,84)
  elif 'galon' in name:
   cargo_tie(L,.18,W*.57,83)
   for j in range(4):
    x=.37+(j%2)*.61;y=.36+(j//2)*.46
    ball(L,x,y,85,.10,5,'BLUE')
  elif 'pasir' in name:
   for i in range(16):
    x=.24+(i%5)*.24;y=.3+(i//5)*.34
    ball(L,x,y,80+i%4*2,.10,5,'SOIL')
   box(L,.18,.13,W*.58,.20,57,64,'TERRA')
  elif 'material' in name:
   for i in range(7):
    x=.25+(i%3)*.32;y=.27+(i//3)*.35
    box(L,x,y,x+.26,y+.21,79+i%2*4,86+i%2*4,'TERRA')
    box(L,x+.04,y+.01,x+.1,y+.18,86,90,'WOOD')
  elif 'sampah' in name:
   for j in range(6):
    x=.36+j*.27
    box(L,x,.12,x+.12,.2,63,87,'GREEN')
   box(L,.28,.11,W*.57,.2,83,89,'YEL')
 if k in ('motor','sepeda','becak','bentor'):
  # Exposed wheel spokes, handlebars, rear reflector, rider leg silhouette.
  for x in (.35,W-.31):
   for j in range(6):
    ang=j*T/6
    xx=x+.09*math.cos(ang);yy=D*.55+.09*math.sin(ang)
    box(L,xx-.022,yy-.022,xx+.023,yy+.023,16,18,'CONC')
  box(L,W*.73,D*.42,W*.92,D*.60,56,62,'DARK')
  ball(L,W*.90,D*.5,61,.06,5,'CREAM')
  if 'motor' in name or k=='bentor':
   box(L,W*.48,.12,W*.62,.24,58,68,'DARK')
   box(L,W*.54,.12,W*.58,.22,69,74,'WHITE')
  if 'kurir' in name:
   box(L,.18,.08,.7,.19,51,83,'BLUE')
   box(L,.24,.08,.65,.17,78,82,'CREAM')
  elif 'box makanan' in name:
   box(L,.17,.06,.65,.17,70,78,'WHITE')
   box(L,.22,.06,.59,.14,56,64,'RED')
  elif 'tukang roti' in name:
   for i in range(5):
    x=.15+(i%3)*.17
    ball(L,x,D*.42,51+(i//3)*10,.095,8,'TERRA')
  elif 'sepeda ontel' in name:
   box(L,.36,D*.40,W*.68,D*.51,42,46,'WOOD')
   pole(L,.38,D*.45,66,.033,'WOOD',base=42)
  elif 'becak' in name or 'bentor' in name:
   for i in range(4):
    x=.2+i*.20
    box(L,x,.14,x+.12,.28,50,57,'WOOD')
   box(L,.19,.12,1.10,.20,94,100,'RED')
 elif k=='andong':
  for x in (.36,W*.5):
   box(L,x,.09,x+.1,.20,87,101,'TERRA')
  # Harness geometry and horse tail, not a generic wagon.
  box(L,W*.60,D*.45,W*.87,D*.48,66,70,'DARK')
  for i in range(4):
   x=W*.84+i*.055
   box(L,x,D*.46,x+.04,D*.61,80,96,'DARK')
  ball(L,W-.23,D*.56,109,.09,7,'WHITE')
 return

def detail_buildings(L,s):
 name=s['label'].lower();k=s['kind'];c=s['category'];W=L.W;D=L.D
 big=(c=='bangunan' or c=='publik')
 H=174 if big else 117
 # Details at actual facade level: downpipes, security rail, entry step,
 # shallow door reveal, ventilated brick, electrical conduits.
 box(L,.13,.43,.24,.52,10,min(H-7,91),'CONC',2)
 for z in (16,35,54):
  box(L,.24,.43,.34,.55,z,z+4,'DARK',2)
 for x in (W*.18,W*.77):
  box(L,x,.16,x+.18,.28,2,6,'CONC')
  box(L,x+.025,.13,x+.15,.22,6,9,'CREAM')
 if not any(x in name for x in ('masjid','gereja','sekolah')):
  box(L,W*.79,.11,W*.94,.27,26,37,'CONC')
  box(L,W*.80,.10,W*.91,.17,34,40,'DARK')
 # Native local roof/metal gutter seams across all buildings.
 if big and k not in ('mushola','gereja'):
  for i in range(5):
   x=.28+i*(W-.56)/5
   if x+.06<W-.15:box(L,x,D*.75,x+.06,D*.88,H+3,H+5,'CONC')
 if k in ('ruko','public','sekolah') or 'kantor' in name:
  for i in range(4):
   x=.39+i*(W-.85)/4
   if x+.18<W-.19:
    box(L,x,.12,x+.15,.19,101,122,'GLASS')
    box(L,x+.06,.11,x+.09,.20,103,120,'CONC')
  box(L,W*.61,.14,W*.78,.27,118,122,'DARK')
  if W>5:
   roof_vent(L,W*.35,D*.68,212 if k=='ruko' else 185)
 if 'kos' in name or 'kontrakan' in name:
  for j in range(4):
   x=.32+j*.66
   box(L,x,.14,x+.35,.28,45,58,'WOOD')
   box(L,x+.27,.13,x+.3,.2,47,50,'CREAM')
  if 'kos' in name:
   for x in (W*.21,W*.64):glass_glint(L,x,.10,91,.32)
 if 'sekolah' in name or 'SMP' in s['label']:
  for j in range(5):
   x=.3+j*.6
   box(L,x,.14,x+.30,.28,10,24,'CREAM')
   box(L,x+.10,.12,x+.17,.20,26,29,'GREEN')
  ball(L,W*.82,D*.38,7,.16,11,'TEAL')
 if 'puskesmas' in name or 'apotek' in name:
  box(L,W*.34,.12,W*.47,.20,69,95,'RED')
  box(L,W*.29,.12,W*.51,.2,77,86,'RED')
  for i in range(3):
   x=.32+i*.4
   ball(L,x,D*.52,9,.1,7,'GREEN')
 if 'minimarket' in name:
  for j in range(10):
   x=.21+j*(W-.39)/10
   box(L,x,.095,x+.055,.18,83,87,'WHITE' if j%2 else 'RED')
  box(L,.20,.13,W-.21,.30,1,10,'CONC')
 if 'bengkel' in name or 'tambal ban' in name:
  ball(L,W*.55,.31,18,.28,11,'DARK')
  for i in range(5):
   x=.33+i*.27
   box(L,x,.105,x+.1,.20,53+i%2*4,61+i%2*4,'SENG')
 if 'padang' in name:
  # dark maroon storefront pattern distinct from warteg.
  for j in range(4):
   x=.29+j*.41
   box(L,x,.14,x+.22,.23,83,93,'RED')
  ball(L,W*.75,.25,61,.16,8,'YEL')
 if 'warteg' in name:
  for i in range(7):
   x=.28+i*.27
   ball(L,x,.11,49,.075,6,FRUIT[i%6])
  box(L,.18,.10,W*.74,.19,61,65,'GLASS')
 if 'warmindo' in name:
  for j in range(3):
   x=.48+j*.39
   box(L,x,.10,x+.30,.23,61,72,'YEL')
   box(L,x+.05,.09,x+.23,.15,68,72,'RED')
 if 'sate' in name:
  for j in range(6):
   x=.3+j*.22
   box(L,x,.10,x+.025,.46,51,56,'WOOD')
   ball(L,x,.29,55,.075,6,'TERRA')
 if 'kopi' in name:
  for j in range(3):
   x=.34+j*.36
   ball(L,x,.17,61,.1,6,'CREAM')
   box(L,x+.07,.13,x+.13,.22,59,65,'WOOD')
 if 'laundry' in name:
  for j in range(5):
   x=.28+j*.32
   box(L,x,.11,x+.20,.24,24,43,'WHITE')
   ball(L,x+.10,.12,29,.065,7,'GLASS')
 if 'pulsa' in name:
  for j in range(8):
   x=.22+j*.22
   box(L,x,.09,x+.14,.19,47+j%3*3,65+j%3*3,PAINT[j%8])
 if 'martabak' in name:
  ball(L,W*.56,.20,54,.30,7,'TERRA')
  for j in range(4):
   x=.42+j*.23
   box(L,x,.12,x+.19,.22,49,54,'YEL')
 if 'mushola' in name or 'masjid' in name:
  for j in range(6):
   x=.3+j*.4
   box(L,x,.15,x+.17,.25,37,67,'GREEN' if j%2 else 'CREAM')
  pole(L,W*.72,D*.77,H+32,.022,'GOLD',base=H+5)
  ball(L,W*.72,D*.77,H+30,.10,7,'GOLD')
 if 'rumah ' in name:
  # shoe rack, sandals, vent blocks, door lamp/letterbox.
  for j in range(3):
   x=W*.26+j*.29
   box(L,x,.13,x+.16,.27,3,9,PAINT[j+2])
  box(L,W*.68,.13,W*.75,.19,44,50,'YEL')
  for i in range(5):
   x=.25+i*.18
   box(L,x,.12,x+.055,.25,82,87,'DARK')
 return

def detail_plants(L,s):
 label=s['label'].lower();k=s['kind'];W=L.W;D=L.D;X=W*.49;Y=D*.51
 h=min(int(s['Hmax'])-22,125)
 if k in ('pohon','kelapa','pisang','pepaya','ketapang','kamboja','bambu'):
  # Root buttresses, scarred stems, leaf ribs and variegated tips.
  for i in range(4):
   ang=i*T/4
   x=X+.17*math.cos(ang);y=Y+.17*math.sin(ang)
   box(L,x-.05,y-.05,x+.05,y+.05,9,16,'WOOD' if 'kamboja' not in label else 'CONC')
  if 'kelapa' in label:
   for j in range(4):
    ang=j*T/4
    x=X+.28*math.cos(ang);y=Y+.24*math.sin(ang)
    ball(L,x,y,h+8,.095,9,'WOOD')
    small_leaf(L,x+.11,y,h+28,'GREEN',False)
  if 'rambutan' in label:
   for i in range(8):
    a=X+.38*math.cos(i*T/8);b=Y+.38*math.sin(i*T/8)
    ball(L,a,b,h+9,.075,7,'RED')
  if 'mangga' in label:
   for i in range(6):
    a=X+.32*math.cos(i*T/6);b=Y+.30*math.sin(i*T/6)
    ball(L,a,b,h+8,.085,9,'YEL')
  if 'pisang' in label:
   for j in range(8):
    a=X+.35*math.cos(j*T/8);b=Y+.32*math.sin(j*T/8)
    box(L,a-.095,b-.10,a+.095,b+.10,h+9,h+16,'TEAL')
  if 'kamboja' in label:
   for i in range(7):
    x=X+.33*math.cos(i*T/7);y=Y+.35*math.sin(i*T/7)
    ball(L,x,y,h+24,.072,6,'CREAM')
  if 'bambu' in label:
   for i in range(6):
    a=X+.29*math.cos(i*T/6);b=Y+.28*math.sin(i*T/6)
    box(L,a-.08,b-.065,a+.08,b+.065,34,37,'YEL')
 if 'pucuk merah' in label:
  for i in range(9):
   a=.40+i%3*.60;b=.36+(i//3)*.36
   small_leaf(L,a,b,72+(i%3)*6,'RED')
 if 'bougenville' in label:
  for i in range(8):
   a=X+.38*math.cos(i*T/8);b=Y+.37*math.sin(i*T/8)
   ball(L,a,b,h-15,.075,7,'PINK')
 if 'padi' in label:
  for j in range(21):
   a=.16+(j%6)*.28;b=.17+(j//6)*.34
   box(L,a-.035,b-.03,a+.045,b+.03,12,28+j%3*3,'GREEN')
   ball(L,a+.04,b,33+j%3*3,.055,5,'YEL')
 if 'teratai' in label or 'eceng' in label:
  for j in range(4):
   a=.30+j*.37;b=.23+j%2*.39
   ball(L,a,b,7,.14,3,'GREEN')
   if 'teratai' in label:
    ball(L,a,b,12,.075,5,'PINK')
 if 'lidah mertua' in label:
  for j in range(6):
   a=X+.14*math.cos(j*T/6);b=Y+.14*math.sin(j*T/6)
   box(L,a-.03,b-.06,a+.03,b+.06,47,89+j%2*8,'YEL')
 if 'monstera' in label:
  for i in range(6):
   a=X+.27*math.cos(i*T/6);b=Y+.25*math.sin(i*T/6)
   small_leaf(L,a,b,68,'TEAL')
 return

def detail_street(L,s):
 name=s['label'].lower();k=s['kind'];W=L.W;D=L.D
 if 'halte' in name:
  for i in range(5):
   x=.30+i*.46
   box(L,x,D-.26,x+.09,D-.15,42,99,'CONC')
  box(L,.24,D-.31,W-.25,D-.25,98,104,'BLUE')
  small_sign(L,'RUTE',73,'WHITE',W*.23)
  if 'transjakarta' in name:
   for j in range(6):
    x=.24+j*.39
    box(L,x,.12,x+.19,.31,1,4,'YEL')
 if 'pos polisi' in name:
  box(L,W*.28,.08,W*.44,.2,69,89,'RED')
  box(L,W*.24,.08,W*.48,.2,73,84,'WHITE')
 if 'gapura' in name or 'portal' in name:
  for j in range(6):
   x=.18+j*(W-.40)/6
   box(L,x,.10,x+.15,.22,106,110,'RED' if j%2 else 'WHITE')
 if 'zebra cross' in name:
  for i in range(6):
   x=.14+i*(W-.30)/6
   box(L,x,.15,x+.19,D-.15,4,5,'WHITE')
 if 'kerucut' in name:
  for h in (16,31,44):
   box(L,W*.47-.19,D*.5-.13,W*.47+.19,D*.5+.13,h,h+4,'WHITE')
 if 'gardu' in name or 'trafo' in name:
  for j in range(7):
   x=.23+j*.24
   box(L,x,.13,x+.10,.18,34+j%3*6,47+j%3*6,'DARK')
  small_sign(L,'PLN',56,'YEL')
 if 'lampu' in name or 'tiang kabel' in name:
  for j in range(4):
   x=W*.40+j*.08
   box(L,x,D*.50-.05,x+.025,D*.5+.06,91+j*7,95+j*7,'CONC')
 if 'polisi tidur' in name:
  for j in range(6):
   x=.15+j*(W-.30)/6
   box(L,x,D*.36,x+.14,D*.64,11,17,'YEL' if j%2 else 'DARK')
 if 'spanduk' in name or 'papan' in name:
  for i in range(3):
   x=.30+i*.45
   box(L,x,.15,x+.28,.25,95,105,'CREAM')
 return

def detail_market(L,s):
 name=s['label'].lower();W=L.W;D=L.D
 # Hand-scale visible goods, price placards and wear at stall front.
 if any(k in name for k in ('sayur','buah','bumbu','ikan','ayam')):
  for j in range(10):
   x=.29+(j%5)*.34;y=.18+(j//5)*.37
   ball(L,x,y,42+j%3*4,.093,6,
        ('FBLUE' if 'ikan' in name else 'CREAM' if 'ayam' in name else FRUIT[j%6]))
  for i in range(3):
   x=.34+i*.48
   box(L,x,.075,x+.17,.19,48,57,'CREAM')
   box(L,x+.02,.069,x+.14,.15,52,55,'RED')
 if 'galon' in name:
  for j in range(3):
   x=.31+j*.53
   ball(L,x,D*.50,53,.105,6,'BLUE')
 if 'lpg' in name or 'gas melon' in name:
  for j in range(3):
   x=.32+j*.52
   box(L,x-.10,D*.37,x+.10,D*.62,19,26,'WHITE')
 if 'snack' in name or 'mie instan' in name:
  for j in range(10):
   x=.26+(j%5)*.35;y=.20+(j//5)*.37
   box(L,x,y,x+.13,y+.23,45+j%2*30,57+j%2*30,PAINT[j%8])
 if 'freezer' in name:
  for i in range(4):
   x=.25+i*.39
   box(L,x,.11,x+.15,.20,64,68,'BLUE')
 if 'karung' in name:
  for i in range(3):
   x=.28+i*.44
   box(L,x,.15,x+.26,.23,24+i%2*15,29+i%2*15,'WOOD')
 if 'timbangan' in name:
  box(L,W*.44,.10,W*.62,.25,38,54,'DARK')
  box(L,W*.46,.08,W*.59,.17,44,49,'GREEN')
 return

def detail_carts(L,s):
 name=s['label'].lower();k=s['kind'];W=L.W;D=L.D
 if k=='gerobak':
  # Chrome corner trim and worn painted boards.
  for z in (25,41):
   for i in range(7):
    x=.20+i*(W-.38)/7
    box(L,x,.10,x+.04,.16,z,z+4,'SENG')
  for xx in (.24,W-.28):
   pole(L,xx,D*.48,28,.05,'WOOD')
  # Hanging sachets and oil containers on back rail.
  for j in range(5):
   x=.36+j*.32
   box(L,x,.105,x+.13,.21,74,89,PAINT[(j+int(s['num']))%8])
  if any(q in name for q in ('sate','jagung','kerak telor','tahu bulat')):
   for j in range(6):
    x=W*.56+j*.12
    box(L,x,.26,x+.025,.58,66,69,'WOOD')
    ball(L,x,.42,70,.069,6,'TERRA')
  if any(q in name for q in ('es cendol','es doger')):
   for i in range(3):
    x=W*.52+i*.28
    box(L,x,.21,x+.17,.46,69,82,'OGLASS')
    box(L,x+.03,.19,x+.14,.40,71,77,'GREEN' if 'cendol' in name else 'PINK')
  if 'bakmi' in name or 'bubur' in name or 'nasi goreng' in name:
   for i in range(2):
    x=W*.58+i*.34
    ball(L,x,D*.48,70,.16,6,'CREAM')
    pole(L,x+.18,D*.4,78,.02,'WOOD',base=70)
 if 'kompor' in name:
  for i in range(3):
   x=.35+i*.46
   ball(L,x,D*.5,34,.11,5,'ORANGE')
 if 'panci' in name:
  for j in range(3):
   x=.26+j*.50
   box(L,x,.11,x+.10,D*.2,54,59,'SENG')
 if 'rice cooker' in name:
  box(L,.38,.11,W*.72,.19,35,44,'RED')
 if 'nampan' in name:
  for i in range(6):
   x=.28+(i%3)*.4;y=.38+(i//3)*.4
   ball(L,x,y,9,.09,5,'TERRA')
 return

def detail_home(L,s):
 name=s['label'].lower();W=L.W;D=L.D
 if 'jemuran' in name:
  for j in range(6):
   x=.26+j*(W-.52)/6
   box(L,x,.34,x+.14,.39,104,109,'CONC')
   box(L,x+.035,.32,x+.105,.41,110,114,'WOOD')
 if 'toren' in name:
  for z in (52,73,91):
   box(L,W*.29,D*.42,W*.73,D*.59,z,z+3,'BLUE')
  box(L,W*.48,.12,W*.56,.22,93,99,'DARK')
 if 'antena' in name or 'parabola' in name:
  for j in range(3):
   x=W*.46+j*.09
   box(L,x,D*.44,x+.025,D*.57,60+j*11,67+j*11,'CONC')
 if 'pagar' in name or 'roster' in name:
  for j in range(10):
   x=.14+j*(W-.28)/10
   box(L,x,.36,x+.045,.40,9,17,'WOOD')
 if 'rak sandal' in name:
  for j in range(7):
   x=.30+j*.18
   box(L,x,.10,x+.15,.18,10+j%3*26,19+j%3*26,
       'BLUE' if j%2 else 'TERRA')
 if 'kandang' in name:
  for i in range(5):
   x=.28+i*.27
   box(L,x,.11,x+.03,D-.11,17,67,'WOOD')
  ball(L,W*.52,D*.5,14,.16,7,'WHITE')
 if 'sangkar' in name:
  for i in range(6):
   a=W*.5+.19*math.cos(i*T/6)
   b=D*.5+.19*math.sin(i*T/6)
   box(L,a-.018,b-.02,a+.018,b+.02,51,84,'SENG')
 if 'pos ronda' in name:
  for i in range(5):
   x=.35+i*.35
   box(L,x,.09,x+.11,.18,42,47,'WOOD')
 if 'sumur' in name:
  box(L,W*.48,.12,W*.64,.18,57,63,'DARK')
  ball(L,W*.59,D*.48,12,.19,6,'WATER')
 return

def detail_culture(L,s):
 name=s['label'].lower();W=L.W;D=L.D
 if 'ondel' in name:
  for j,c in enumerate(('RED','BLUE')):
   X=W*(.31 if j==0 else .71)
   for i in range(6):
    x=X-.25+i*.08
    box(L,x,.15,x+.038,.21,9+i%2*4,29+i%2*4,'GOLD' if i%2 else 'CREAM')
   ball(L,X,D*.47,118,.1,8,'DARK')
 if 'bedug' in name:
  for i in range(9):
   x=.34+i*(W-.64)/9
   box(L,x,.24,x+.04,D-.23,54,58,'TERRA')
 if '17' in name or 'merdeka' in name or 'hajatan' in name:
  for i in range(8):
   x=.15+i*(W-.30)/8
   box(L,x,.10,x+.09,.22,104,110,'WHITE' if i%2 else 'RED')
 if 'umbul' in name:
  for j in range(3):
   x=.25+j*.56
   for z in range(45,95,18):
    box(L,x+.09,D*.43,x+.14,D*.60,z,z+9,'RED' if z%3 else 'WHITE')
 if 'sound system' in name:
  for xx in (.39,W-.57):
   for z in (24,52):
    ball(L,xx,D*.5,z,.13,6,'DARK')
 if 'posyandu' in name:
  box(L,.18,.13,W*.55,.34,50,60,'WHITE')
  for i in range(6):
   x=.30+i*.27
   box(L,x,.10,x+.15,.25,61,66,'RED' if i%2 else 'BLUE')
 if 'pengajian' in name:
  for i in range(7):
   x=.24+i*.29
   box(L,x,.08,x+.20,.17,95,100,'CREAM')
 if 'rak sajadah' in name:
  for j in range(5):
   x=.23+j*.32
   box(L,x,.11,x+.15,.25,16,46,'GREEN')
   box(L,x+.025,.09,x+.12,.13,39,42,'GOLD')
 return

def detail_public(L,s):
 name=s['label'].lower();W=L.W;D=L.D
 if 'atm' in name:
  box(L,W*.46,.08,W*.68,.17,36,59,'DARK')
  box(L,W*.5,.075,W*.63,.12,49,54,'GREEN')
  box(L,W*.51,.065,W*.56,.11,38,43,'WHITE')
 if 'bensin' in name:
  for j in range(4):
   x=.25+j*.24
   box(L,x,.11,x+.15,.17,65,72,'RED')
  pole(L,W*.72,D*.45,93,.03,'DARK')
 if 'kebersihan' in name or 'sampah' in name:
  for j in range(5):
   x=.29+j*.27
   box(L,x,.14,x+.10,.22,42,73,'GREEN')
  box(L,W*.39,.12,W*.65,.19,26,39,'WHITE')
 if 'warnet' in name or 'playstation' in name:
  for j in range(3):
   x=.38+j*.45
   box(L,x,.10,x+.28,.21,43,60,'DARK')
   box(L,x+.035,.09,x+.25,.16,47,55,'FBLUE')
 if 'jahit' in name:
  for j in range(4):
   x=.33+j*.30
   box(L,x,.10,x+.08,.23,42,57,PAINT[j])
  box(L,W*.66,.11,W*.89,.30,27,43,'CONC')
 if 'bts' in name:
  for z in (44,78,111):
   for j in range(3):
    x=.31+j*.35
    box(L,x,.17,x+.04,D*.7,z,z+3,'CONC')
 if 'lapangan voli' in name:
  for j in range(6):
   x=.28+j*.36
   box(L,x,D*.44,x+.022,D*.55,47,95,'WHITE')
 if 'basket' in name:
  box(L,W*.48,.16,W*.62,.27,95,101,'RED')
  for j in range(4):
   a=W*.50+j*.04
   box(L,a,.11,a+.02,.18,85,95,'WHITE')
 return

def refine(L,s):
 c=s['category']
 if c=='transport':detail_transport(L,s)
 elif c in ('warung','bangunan'):detail_buildings(L,s)
 elif c=='tanaman':detail_plants(L,s)
 elif c=='jalan':detail_street(L,s)
 elif c=='pasar':detail_market(L,s)
 elif c=='gerobak':detail_carts(L,s)
 elif c=='rumah':detail_home(L,s)
 elif c=='budaya':detail_culture(L,s)
 elif c=='publik':detail_public(L,s)
