"""Hand-finished identity pass for recognizably Indonesian culture and ecology.

Uses the original 2026 approved art recipes for matching native plant species
rather than replacing them with lookalike procedural cylinders.
The remaining selective overrides hand-build unique geometry by name.
"""
from __future__ import annotations
import math
from indonesia_200_quality import box,pole,ball,board,wheel,shadow
from indonesia_extra import kelapa,pisang,pepaya,mangga,rambutan,bambu,kamboja,pandan,bugenvil
from indonesia_more import sawo,lidah_mertua,sirih_gading
from lib import Tex
TAU=math.tau
PLANT_SOURCES={
 'Pohon pisang pekarangan':pisang,
 'Pohon kelapa pesisir':kelapa,
 'Pohon mangga rindang':mangga,
 'Pohon pepaya berbuah':pepaya,
 'Pohon rambutan':rambutan,
 'Pohon sawo':sawo,
 'Rumpun bambu':bambu,
 'Pohon kamboja bunga':kamboja,
 'Daun pandan wangi':pandan,
 'Bougenville berbunga':bugenvil,
 'Sirih gading pot':sirih_gading,
 'Lidah mertua pot':lidah_mertua
}
def quality_override(L,s):
 name=s['label'];n=name.lower();k=s['kind'];c=s['category']
 W,D=L.W,L.D
 if c=='tanaman' and name in PLANT_SOURCES:
  PLANT_SOURCES[name](L)
  return True
 if c=='tanaman' and name=='Pohon ketapang':
  shadow(L)
  pole(L,W*.5,D*.5,118,.17,'WOOD')
  # Layered terminalia canopy, unlike a round mango tree.
  for tier,z,spread in ((0,98,.77),(1,125,.63),(2,152,.43)):
   for i in range(7):
    angle=TAU*i/7;x=W*.5+spread*math.cos(angle);y=D*.5+spread*math.sin(angle)
    ball(L,x,y,z,.31,15,'TEAL' if tier==0 else 'GREEN')
   ball(L,W*.5,D*.5,z+7,.40,17,'GREEN')
  return True
 if c=='tanaman' and name=='Monstera dalam pot':
  shadow(L)
  x=W*.5;y=D*.5
  box(L,x-.35,y-.32,x+.35,y+.32,0,33,'TERRA')
  box(L,x-.37,y-.34,x+.37,y+.34,31,36,'CONC')
  for i in range(8):
   phi=TAU*i/8
   a=x+.42*math.cos(phi);b=y+.36*math.sin(phi)
   pole(L,a,b,72+i%4*6,.055,'WOOD',base=35)
   # Large split-leaf plates: stepped rib + lobes (not skinny grass).
   for j in range(4):
    xx=a+.16*(j-1.5)*math.cos(phi+.7)
    yy=b+.13*(j-1.5)*math.sin(phi+.7)
    box(L,xx-.11,yy-.10,xx+.12,yy+.11,68+i%4*6+j%2*4,77+i%4*6+j%2*4,
        'GREEN' if j%2 else 'TEAL')
  return True
 if c=='tanaman' and name=='Pucuk merah pekarangan':
  shadow(L)
  for j in range(3):
   xx=.56+j*.59;yy=D*.50
   pole(L,xx,yy,60+j%2*4,.08,'WOOD')
   for i in range(5):
    a=xx+.23*math.cos(i*TAU/5)
    b=yy+.22*math.sin(i*TAU/5)
    ball(L,a,b,57+i%3*8,.18,13,'RED' if i%2 else 'GREEN')
   ball(L,xx,yy,76,.22,15,'RED')
  return True
 if c=='tanaman' and name=='Semak teh tehan pagar':
  shadow(L)
  for j in range(8):
   xx=.24+j*(W-.48)/8;yy=D*.52
   pole(L,xx,yy,37+j%2*5,.05,'WOOD')
   for b in (D*.37,D*.63):
    ball(L,xx,b,39,.18,17,'TEAL')
  return True
 if c=='jalan' and name in ('Lampu jalan antik','Lampu PJU modern'):
  shadow(L)
  x=W*.43;y=D*.52;classic='antik' in n
  pole(L,x,y,130,.09,'DARK' if classic else 'CONC')
  pole(L,x+.42,y-.06,128,.05,'WOOD' if classic else 'CONC',base=119)
  box(L,x,y-.07,x+.54,y+.05,124,130,'DARK' if classic else 'CONC')
  if classic:
   box(L,x+.40,y-.26,x+.72,y+.13,107,122,'DARK')
   box(L,x+.46,y-.23,x+.66,y+.10,109,119,'WARM')
   ball(L,x+.56,y,122,.18,9,'TERRA')
  else:
   box(L,x+.43,y-.23,x+.90,y+.12,115,121,'CONC')
   box(L,x+.47,y-.19,x+.85,y+.08,111,115,'YEL')
  return True
 if c=='warung' and name=='Tenda pecel lele':
  shadow(L)
  for x in (.15,W-.25):
   for y in (.15,D-.22):
    pole(L,x,y,118,.065,'WOOD')
  box(L,.08,.07,W-.07,D-.10,116,125,'BLUE')
  for i in range(10):
   a=.10+i*(W-.2)/10
   box(L,a,.07,a+.17,.23,105-i%2*4,116,'RED' if i%2 else 'WHITE')
  # Long hanging front banner, still open underneath.
  def front(w,h):
   t=Tex(max(1,int(w)),max(1,int(h)),'RED',3)
   t.text(int(w)//2,int(h)//2,'PECEL LELE','WHITE',4)
   return t
  box(L,.18,.08,W-.16,.22,75,102,'RED',front=front)
  box(L,.35,.32,W*.7,1.24,0,41,'WOOD')
  box(L,.30,.23,W*.74,1.29,41,47,'SENG')
  for i in range(5):
   x=.48+i*.35
   ball(L,x,.35,49,.105,7,'YEL' if i%2 else 'TERRA')
  box(L,W*.72,.28,W-.24,1.2,0,30,'WOOD')
  box(L,W*.71,.29,W-.22,1.2,30,35,'SENG')
  for a in (.50,1.2,2.05):
   box(L,a,D*.53,a+.40,D*.88,0,29,'BLUE')
  return True
 if c=='publik' and k=='saung':
  shadow(L)
  # Open-sided Sundanese bamboo gazebo / saung, platform 1 tile above grade.
  box(L,.16,.14,W-.17,D-.16,10,34,'WOOD')
  for a in (.19,W-.27):
   for b in (.18,D-.26):pole(L,a,b,127,.085,'WOOD')
  for a in (.2,W-.35):
   box(L,a,.17,a+.065,D-.2,32,67,'WOOD')
  for z in (47,77):
   box(L,.17,.16,W-.17,.24,z,z+6,'WOOD')
  # Bamboo gable instead of concrete flat-roof shophouse.
  L.gable(.08,.11,W-.09,D-.11,129,159,'TERRA')
  for j in range(8):
   x=.15+j*(W-.3)/8
   box(L,x,.12,x+.035,D-.14,127,131,'WOOD')
  for xx in (W*.32,W*.62):
   box(L,xx,D*.4,xx+.36,D*.7,35,59,'WOOD')
  board(L,'SAUNG' if 'saung' in n else 'GAZEBO',73,'WOOD')
  return True
 if c=='budaya' and k=='bedug':
  shadow(L)
  # Horizontal barrel on two timber trestles, leather membranes, metal hoops.
  for a in (W*.28,W*.70):
   box(L,a-.08,.24,a+.09,D-.22,0,46,'WOOD')
   box(L,a-.21,.24,a+.21,D-.21,45,51,'WOOD')
  box(L,.30,.29,W-.27,D-.31,58,85,'WOOD')
  for i in range(7):
   x=.37+i*(W-.7)/7
   box(L,x,.28,x+.055,D-.30,56,88,'DARK' if i%2 else 'TERRA')
  for a in (.28,W-.40):
   ball(L,a,D*.5,72,.26,24,'CREAM')
  box(L,.25,.26,W-.23,D-.27,49,56,'CREAM')
  box(L,.27,.24,W-.23,D-.26,87,92,'CREAM')
  # Two beaters on support
  pole(L,W-.26,.25,66,.03,'WOOD')
  ball(L,W-.26,.25,65,.07,8,'TERRA')
  return True
 if c=='budaya' and k=='ondel':
  shadow(L)
  for j,(a,cloth) in enumerate(((W*.31,'RED'),(W*.71,'BLUE'))):
   # Wide cone-skirt silhouettes, arm sleeves, traditional decorated belt.
   box(L,a-.31,.28,a+.30,D-.24,0,28,cloth)
   box(L,a-.24,.31,a+.24,D-.26,28,73,cloth)
   for q in range(4):
    box(L,a-.30+q*.16,.24,a-.24+q*.16,D-.20,12,22,'CREAM' if q%2 else 'TERRA')
   box(L,a-.21,.22,a+.20,D-.25,67,76,'GOLD')
   box(L,a-.4,.38,a-.25,D-.31,44,74,cloth)
   box(L,a+.25,.38,a+.4,D-.31,44,74,cloth)
   pole(L,a,D*.50,96,.12,'SKIN',base=72)
   ball(L,a,D*.5,98,.20,23,'SKIN')
   # Eyes, brows, lips and black hair ornamentation.
   for off in (-.10,.10):
    box(L,a+off-.045,.20,a+off+.04,.29,99,106,'WHITE')
    box(L,a+off-.018,.19,a+off+.02,.28,100,104,'DARK')
   box(L,a-.095,.20,a+.095,.29,88,92,'RED')
   box(L,a-.25,.29,a+.24,D-.31,114,120,'DARK')
   for i in range(7):
    x=a+.27*math.cos(i*TAU/7)
    y=D*.50+.18*math.sin(i*TAU/7)
    ball(L,x,y,126+i%2*5,.09,13,'RED' if j==0 else 'PINK')
  return True
 return False
