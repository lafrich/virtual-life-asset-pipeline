"""Indonesia 200: bespoke structural silhouettes for ten recognizable roadside UMKM.

The original first-pass warungs all shared the same closed rectangular shop.
These are fully independent native 2:1 isometric scenes: no image imports,
no blank stand-ins. Their differences survive removal of signage and colour.
"""
from __future__ import annotations
import math
from lib import Tex,bshadow
from indonesia_200_quality import box,pole,ball,wheel,board,shadow
TAU=math.tau

def roof(L,h,material='SENG',gabled=True):
 if gabled:
  L.gable(.10,.13,L.W-.11,L.D-.16,h,h+19,material)
 else:
  box(L,.08,.09,L.W-.09,L.D-.11,h,h+8,material)
 for x in (.12,L.W-.18):
  for y in (.15,L.D-.22):
   pole(L,x,y,h,.067,'WOOD')

def awning(L,z=99,c='BLUE'):
 box(L,.08,.09,L.W-.09,L.D*.49,z,z+7,c)
 for j in range(9):
  x=.10+j*(L.W-.2)/9
  box(L,x,.06,x+.12,.18,z-7,z+4,'CREAM' if j%2 else c)

def plank(L,z=45,m='WOOD',a=.23,b=.19,w=None,d=None):
 box(L,a,b,w or L.W-.23,d or L.D*.5,z,z+9,m)

def food(L,count=8,z=58,colors=None):
 colors=colors or ['GREEN','YEL','ORANGE','TERRA','CREAM','RED']
 for i in range(count):
  x=.35+(i%5)*.28;y=.24+(i//5)*.33
  ball(L,x,y,z+(i%3)*3,.092,8,colors[i%len(colors)])

def utensil(L,a,b,z=64,material='SENG'):
 ball(L,a,b,z,.25,11,material)
 box(L,a+.18,b-.04,a+.4,b+.04,z+3,z+7,'WOOD')

def label(L,name,z=83,col='GREEN'):
 ww=max(35,round((L.W-.27)*32))
 tx=Tex(ww,20,col,3)
 tx.text(ww//2,10,name.upper()[:17],'WHITE',4,bold=True)
 L.front(.14,L.W-.13,.08,z,z+20,tx)

def variant(L,s):
 if s['category']!='warung':return False
 n=s['label'].lower()
 match=next((q for q in ('warteg','warmindo','booth martabak','booth es teh',
                        'warung gorengan','tambal ban','pangkas rambut',
                        'konter pulsa','kopi tubruk','fotokopi','warung sate')
             if q in n),None)
 if match is None:return False
 shadow(L);W=L.W;D=L.D
 if match=='warteg':
  # Open front two-bay food display in zinc-frame, shaded food glass
  # counter and painted green wall. Distinct floor-to-ceiling proportions.
  box(L,.22,.45,W-.23,D-.20,0,112,'CREAM')
  box(L,.19,.41,W*.26,D-.19,0,124,'GREEN')
  box(L,W*.77,.41,W-.19,D-.19,0,124,'GREEN')
  roof(L,124,'SENG',False)
  box(L,.20,.12,W*.71,.44,7,54,'WOOD')
  box(L,.25,.09,W*.69,.25,54,88,'OGLASS',2)
  for z in (55,71,85):
   box(L,.24,.09,W*.70,.24,z,z+3,'CONC')
  for j in range(8):
   a=.35+(j%4)*.30
   ball(L,a,.16,61+(j//4)*18,.10,7,
        ['GREEN','YEL','TERRA','CREAM','RED'][j%5])
  for xx in (W*.72,W*.83):
   box(L,xx,.10,xx+.07,.29,0,82,'DARK')
  label(L,'WARTEG',102,'GREEN')
  return True
 if match=='warmindo':
  # Portable open sided warmindo; colorful noodle sachets hung beneath
  # angled tarpaulin with steaming aluminum cooking station.
  roof(L,116,'TERRA')
  for x in (.2,W-.24):
   pole(L,x,D*.48,111,.06,'WOOD')
  plank(L,47,'WOOD',.25,.18,W-.25,D*.65)
  for j in range(10):
   x=.35+(j%5)*.31
   box(L,x,.10,x+.19,.22,64+(j//5)*18,78+(j//5)*18,
       'YEL' if j%2 else 'RED')
   box(L,x+.035,.095,x+.16,.14,70+(j//5)*18,74+(j//5)*18,'CREAM')
  utensil(L,W*.72,D*.43,58)
  ball(L,W*.52,D*.46,57,.16,7,'CREAM')
  for x in (.3,W-.51):
   box(L,x,D*.77,x+.34,D-.14,0,28,'WOOD')
  label(L,'WARMINDO',91,'ORANGE')
  return True
 if match=='booth martabak':
  # Open low-height wok counter, paired martabak frying pans, no giant
  # closed shop body. Distinct overhanging red awning.
  roof(L,118,'TERRA',False)
  awning(L,105,'RED')
  box(L,.23,.18,W-.23,D*.61,0,48,'WOOD')
  box(L,.19,.15,W-.17,D*.61,49,57,'SENG')
  for x in (W*.43,W*.74):
   ball(L,x,D*.37,57,.28,8,'DARK')
   ball(L,x,D*.37,67,.23,6,'TERRA')
   for j in range(4):
    a=x+.13*math.cos(j*TAU/4);b=D*.37+.13*math.sin(j*TAU/4)
    ball(L,a,b,72,.07,4,'YEL')
  box(L,.25,.11,W*.31,.24,65,85,'OGLASS',2)
  for x in (.32,W-.5):
   pole(L,x,D*.75,43,.055,'WOOD')
  box(L,.28,D*.7,W-.32,D-.17,42,48,'WOOD')
  label(L,'MARTABAK',79,'RED')
  return True
 if match=='booth es teh':
  # Three stacked jars of colourful drinks and countertop blender,
  # clear plastic tumblers; no generic shop walls.
  roof(L,118,'BLUE',False)
  awning(L,108,'BLUE')
  box(L,.22,.19,W-.21,D*.57,0,61,'WHITE')
  box(L,.16,.14,W-.17,D*.61,61,66,'SENG')
  for j,col in enumerate(('GREEN','ORANGE','PINK','YEL')):
   x=.38+j*.46
   pole(L,x,.36,87,.16,'OGLASS',base=66)
   box(L,x-.14,.21,x+.14,.48,70,83,col)
   box(L,x-.18,.18,x+.18,.51,85,88,'DARK')
   pole(L,x,.36,92,.025,'WHITE',base=87)
  for j in range(5):
   x=.29+j*.30
   box(L,x,.07,x+.10,.16,66,82,'CREAM')
  box(L,W*.70,.13,W*.83,.25,86,104,'SENG')
  label(L,'ES TEH / JUS',95,'BLUE')
  return True
 if match=='warung gorengan':
  # Tented lightweight bamboo stall with real oil wok and assorted
  # golden fried food trays; front open and low roof.
  roof(L,116,'TARPB')
  plank(L,48,'WOOD',.14,.18,W-.16,D*.65)
  box(L,.27,.14,W*.64,D*.50,57,64,'SENG')
  food(L,10,65,['TERRA','YEL','ORANGE'])
  utensil(L,W*.78,.36,62)
  box(L,W*.72,.23,W*.92,.43,32,45,'DARK')
  for j in range(3):
   x=.23+j*.40
   ball(L,x,D*.47,58,.15,7,'TERRA')
  label(L,'GORENGAN',85,'TERRA')
  return True
 if match=='tambal ban':
  # Open mechanic canopy: tire stack, air hose/compressor, wheel stand
  # and tool storage. An office-building box is inappropriate here.
  roof(L,119,'BLUE')
  awning(L,100,'BLUE')
  plank(L,43,'WOOD',.32,.12,W*.56,D*.56)
  for i in range(3):
   a=.50+(i%2)*.42
   L.s.cyl(*L.cr(a,.43),i*18,i*18+9,.28,'DARK',2)
   L.s.cyl(*L.cr(a,.43),i*18+9,i*18+12,.17,'CONC',3)
  box(L,W*.60,D*.40,W*.89,D*.72,0,59,'CONC')
  box(L,W*.62,D*.38,W*.84,D*.52,40,50,'RED')
  pole(L,W*.79,D*.62,69,.035,'DARK',base=49)
  box(L,W*.41,.12,W*.69,.20,52,61,'SENG')
  for j in range(7):
   x=.3+j*.2
   box(L,x,.08,x+.035,.20,84,93,'SENG')
  label(L,'TAMBAL BAN',97,'BLUE')
  return True
 if match=='pangkas rambut':
  # One front mirror, short barber chair and red/white/blue pole.
  # Half-open shophouse wall encloses rather than blocks the station.
  box(L,.15,.45,W-.16,D-.18,0,121,'CREAM')
  box(L,W*.75,.30,W-.12,D-.21,0,126,'WOOD')
  roof(L,129,'SENG',False)
  box(L,.25,.25,W*.57,.40,29,107,'DARK')
  box(L,.32,.23,W*.53,.34,38,97,'GLASS')
  box(L,.34,.22,W*.48,.29,42,90,'FBLUE')
  box(L,W*.40,.14,W*.65,.38,0,25,'DARK')
  box(L,W*.39,.13,W*.68,.45,25,48,'RED')
  box(L,W*.46,.14,W*.60,.43,48,83,'BLUE')
  pole(L,.26,.19,115,.09,'WHITE')
  for j in range(9):
   z=19+j*10
   box(L,.19,.10,.33,.26,z,z+4,'RED' if j%2 else 'BLUE')
  label(L,'PANGKAS',103,'TERRA')
  return True
 if match=='konter pulsa':
  # Kiosk-sized telecom booth with hanging phone cards and glass case,
  # compact dark-blue box; separate from normal food warung.
  box(L,.16,.27,W*.73,D-.18,0,118,'BLUE')
  box(L,.14,.25,W*.73,D-.20,118,127,'SENG')
  box(L,.2,.12,W*.69,.42,18,75,'GLASS',2)
  for j in range(12):
   x=.26+(j%4)*.34;z=36+(j//4)*14
   box(L,x,.10,x+.22,.26,z,z+12,
       ('RED','YEL','GREEN','BLUE')[j%4])
   box(L,x+.06,.08,x+.16,.17,z+7,z+9,'CREAM')
  box(L,W*.74,.22,W-.16,D*.62,5,67,'WOOD')
  for i in range(3):
   x=W*.78+i*.23
   pole(L,x,D*.43,96,.03,'DARK',base=67)
  label(L,'PULSA & HP',88,'BLUE')
  return True
 if match=='kopi tubruk':
  # Small open timber coffee bar, hanging cups and black metal kettle.
  roof(L,121,'WOOD',True)
  plank(L,48,'WOOD',.17,.17,W-.14,D*.58)
  box(L,.16,.15,W-.16,D*.19,12,46,'WOOD')
  for j in range(6):
   x=.27+j*.36
   ball(L,x,.26,52,.10,5,'CREAM')
   box(L,x+.075,.18,x+.13,.30,51,57,'WOOD')
  utensil(L,W*.7,.42,56,'SENG')
  box(L,W*.68,.24,W*.82,.58,50,61,'DARK')
  for x in (.25,W*.65):
   box(L,x,D*.65,x+.39,D-.17,0,34,'WOOD')
  for i in range(4):
   x=.33+i*.42
   box(L,x,.11,x+.24,.24,75,88,'TERRA')
  label(L,'KOPI TUBRUK',101,'WOOD')
  return True
 if match=='fotokopi':
  # Paper shop with large visible printer/copier, shelves and ream paper.
  box(L,.20,.39,W-.19,D-.20,0,122,'CREAM')
  roof(L,128,'SENG',False)
  box(L,.24,.14,W*.75,.39,0,49,'DARK')
  box(L,.28,.11,W*.72,.35,49,61,'CONC')
  box(L,.35,.09,W*.57,.26,61,80,'CREAM')
  box(L,.39,.07,W*.55,.24,79,88,'SENG')
  box(L,W*.58,.09,W*.69,.19,68,74,'BLUE')
  for i in range(5):
   x=.35+i*.27
   box(L,x,.11,x+.21,.26,49,54,'WHITE')
  for x in (.25,W*.73):
   pole(L,x,.23,105,.065,'DARK',base=54)
  label(L,'FOTOKOPI',106,'BLUE')
  return True
 if match=='warung sate':
  # Open satay grilling corner and charcoal skewers underneath a
  # weathered red canvas awning.
  roof(L,117,'TERRA')
  awning(L,103,'RED')
  plank(L,49,'WOOD',.18,.17,W-.19,D*.61)
  box(L,W*.45,.12,W*.85,.52,57,68,'DARK')
  for j in range(9):
   x=W*.47+j*.12
   box(L,x,.16,x+.028,.46,66,71,'WOOD')
   ball(L,x,.33,73,.065,5,'TERRA')
  for i in range(5):
   x=.30+i*.20
   ball(L,x,.26,57,.085,8,'CREAM')
  for i in range(3):
   x=W*.59+i*.13
   box(L,x,.22,x+.075,.33,86+i%2*5,95+i%2*5,'CONC')
  label(L,'SATE AYAM',88,'RED')
  return True
 return False
