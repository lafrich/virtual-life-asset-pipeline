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
 if name in ('Bus kota kecil','Elf travel antarkota','Motor kurir barang','Motor ojol box makanan'):
  from indonesia_200_quality import vehicle
  vehicle(L,s)
  if name=='Bus kota kecil':
   box(L,.18,.10,W-.19,.23,62,76,'BLUE')
   board(L,'BUS KOTA',81,'BLUE')
   box(L,W*.4,D*.22,W*.65,D*.69,121,132,'WHITE')
  elif name=='Elf travel antarkota':
   box(L,.22,.10,W-.24,.21,55,63,'TEAL')
   box(L,W*.3,D*.25,W*.8,D*.7,120,125,'DARK')
   for x in (.40,W-.52):
    box(L,x,D*.28,x+.07,D*.73,119,128,'CONC')
   board(L,'TRAVEL ELF',77,'TEAL')
  elif name=='Motor kurir barang':
   box(L,.12,.12,.67,D-.12,48,84,'BLUE')
   box(L,.14,.09,.65,D-.10,82,87,'CREAM')
   box(L,.40,.09,.47,D-.09,48,87,'DARK')
  else:
   box(L,.09,.12,.72,D-.12,50,85,'RED')
   box(L,.13,.09,.68,D-.10,61,70,'WHITE')
   board(L,'FOOD',63,'RED')
  return True
 if name=='Palang parkir':
  shadow(L)
  x=.25
  box(L,x,.20,x+.38,D-.23,0,69,'YEL')
  box(L,x+.06,.17,x+.31,D-.25,40,54,'DARK')
  box(L,x+.25,D*.43,W-.10,D*.56,66,75,'WHITE')
  for i in range(5):
   a=x+.29+i*(W-.55)/5
   box(L,a,D*.41,a+.18,D*.58,67,75,'RED')
  ball(L,x+.23,D*.5,68,.16,8,'DARK')
  return True
 if name=='Trafo pinggir jalan':
  shadow(L)
  for a in (.35,W-.42):
   pole(L,a,D*.53,133,.095,'CONC')
  box(L,.19,D*.42,W-.17,D*.65,87,97,'DARK')
  box(L,.30,D*.30,W-.31,D*.72,31,94,'SENG')
  for i in range(4):
   x=.32+i*.38
   pole(L,x,D*.50,128,.09,'DARK',base=94)
   ball(L,x,D*.5,128,.13,7,'CONC')
  box(L,.38,D*.27,W-.38,D*.30,63,70,'YEL')
  return True
 if name=='Kontainer sampah kota':
  shadow(L)
  box(L,.12,.13,W-.13,D-.16,0,64,'BLUE')
  for x in (.18,W-.29):
   for y in (.18,D-.27):pole(L,x,y,18,.055,'DARK')
  box(L,.09,.10,W-.10,D-.11,64,71,'CONC')
  for i in range(6):
   a=.23+i*(W-.46)/6
   box(L,a,.07,a+.055,.16,7,59,'CONC')
  box(L,W*.35,.08,W*.60,.18,32,40,'WHITE')
  return True
 if name=='Bak sampah komunal':
  shadow(L)
  for i,col in enumerate(('GREEN','BLUE','TERRA')):
   x=.15+i*(W-.28)/3
   box(L,x,.20,x+.58,D-.21,0,59,'CONC')
   box(L,x,.18,x+.58,.32,59,65,col)
   box(L,x+.08,.14,x+.44,.22,22,32,'DARK')
  return True
 if name in ('Sangkar burung gantung','Stand sangkar burung'):
  shadow(L)
  number=1 if name=='Sangkar burung gantung' else 3
  pole(L,W*.5,D*.55,128,.09,'WOOD')
  box(L,.19,D*.42,W-.19,D*.62,116,122,'WOOD')
  for i in range(number):
   x=W*.5 if number==1 else .36+i*.65
   y=D*.52
   pole(L,x,y,112,.04,'WOOD',base=79)
   box(L,x-.19,y-.21,x+.19,y+.21,55,60,'WOOD')
   for j in range(5):
    a=x-.17+j*.086
    box(L,a,y-.21,a+.018,y+.21,60,87,'SENG')
   ball(L,x,y,87,.20,12,'TERRA')
   ball(L,x,y,69,.09,8,'BLUE' if i%2 else 'GREEN')
  return True
 if name in ('Pagar roster','Tembok roster'):
  shadow(L)
  # Roster perforations are physical gaps, not black paint.
  rows=2 if name=='Pagar roster' else 4
  for i in range(11):
   x=.10+i*(W-.25)/11
   for j in range(rows):
    h=j*22
    box(L,x,.38,x+.12,.60,h,h+19,'CREAM')
    if i%2==0:box(L,x+.10,.40,x+.19,.59,h+13,h+19,'WOOD')
  box(L,.09,.35,W-.10,.64,rows*22,rows*22+7,'CONC')
  if rows>2:box(L,.08,.35,W-.11,.62,0,7,'CONC')
  return True
 if name in ('Kanopi rumah','Carport sederhana'):
  shadow(L)
  if name=='Carport sederhana':
   box(L,.10,.09,W-.10,D-.09,0,5,'PAVE')
   for a in (.18,W-.24):
    for b in (.19,D-.23):pole(L,a,b,109,.07,'CONC')
   box(L,.06,.10,W-.06,D-.11,109,116,'SENG')
   for i in range(9):
    x=.10+i*(W-.2)/9
    box(L,x,.10,x+.045,D-.11,116,119,'CONC')
  else:
   for a in (.16,W-.23):pole(L,a,.30,105,.07,'CONC')
   box(L,.08,.16,W-.08,D-.18,106,113,'GREEN')
   box(L,.07,.12,W-.07,.24,104,118,'WOOD')
   for i in range(7):
    x=.10+i*(W-.20)/7
    box(L,x,.18,x+.04,D-.18,111,114,'CONC')
  return True
 if name in ('Baliho informasi kampung','Banner pengajian warga'):
  shadow(L)
  if name.startswith('Baliho'):
   for a in (.17,W-.24):pole(L,a,D*.48,128,.07,'CONC')
   box(L,.11,.28,W-.09,D*.74,86,137,'GREEN')
   box(L,.14,.26,W-.13,D*.71,90,132,'CREAM')
   board(L,'INFO RT RW',97,'GREEN')
   for i in range(3):
    x=.26+i*.41
    box(L,x,.25,x+.27,.32,103,110,'BLUE')
  else:
   for a in (.12,W-.20):pole(L,a,D*.55,116,.05,'WOOD')
   box(L,.17,.30,W-.16,D*.67,69,108,'RED')
   board(L,'PENGAJIAN',78,'GREEN')
   for i in range(6):
    x=.21+i*(W-.44)/6
    box(L,x,.30,x+.12,.35,64+i%2*3,69,'CREAM')
  return True
 if name in ('Kursi hajatan','Meja registrasi hajatan','Meja lesehan','Bangku plastik warung','Meja makan warung','Kursi plastik warung'):
  shadow(L)
  if name in ('Kursi hajatan','Kursi plastik warung'):
   for a in (.23,W-.34):
    for b in (.27,D-.32):pole(L,a,b,37,.055,'CONC' if 'hajatan' in n else 'BLUE')
   box(L,.14,.19,W-.13,D-.17,37,45,'WHITE' if 'hajatan' in n else 'BLUE')
   box(L,.16,D-.35,W-.15,D-.23,44,91,'CREAM' if 'hajatan' in n else 'BLUE')
   if 'hajatan' in n:
    for i in range(4):
     a=.18+i*(W-.36)/4
     box(L,a,D-.36,a+.045,D-.22,47,90,'RED' if i%2 else 'WHITE')
  elif name=='Bangku plastik warung':
   box(L,.15,.19,W-.15,D-.17,24,34,'BLUE')
   for a in (.20,W-.30):
    box(L,a,.24,a+.18,D-.23,0,24,'BLUE')
   for i in range(3):
    a=.27+i*.43
    box(L,a,.17,a+.12,.23,30,34,'WHITE')
  elif name=='Meja lesehan':
   box(L,.13,.16,W-.13,D-.15,8,20,'WOOD')
   box(L,.15,.17,W-.15,D-.17,20,25,'TERRA')
   for i in range(4):
    a=.20+i*.37
    box(L,a,.18,a+.13,D-.15,23,26,'CREAM')
  elif name=='Meja registrasi hajatan':
   for a in (.20,W-.29):
    for b in (.21,D-.28):pole(L,a,b,46,.045,'WOOD')
   box(L,.13,.16,W-.13,D-.15,46,54,'WHITE')
   box(L,.17,.16,W-.16,.23,23,46,'CREAM')
   box(L,W*.32,.23,W*.54,.44,55,59,'WOOD')
   box(L,W*.37,.27,W*.48,.36,59,61,'WHITE')
   ball(L,W*.7,D*.42,56,.10,7,'BLUE')
  else:
   for a in (.17,W-.24):
    for b in (.20,D-.28):pole(L,a,b,50,.055,'WOOD')
   box(L,.10,.15,W-.10,D-.15,49,57,'WOOD')
   for i in range(3):
    a=.26+i*.48
    ball(L,a,D*.50,58,.10,7,'CREAM')
  return True
 if name in ('Rak snack warung','Rak mie instan','Rak sandal masjid','Rak sajadah dan kitab'):
  shadow(L)
  for a in (.14,W-.21):
   for b in (.19,D-.26):pole(L,a,b,102,.06,'WOOD')
  for h in (8,41,75):
   box(L,.10,.17,W-.11,D-.17,h,h+5,'WOOD')
  for row in range(3):
   for col in range(6):
    x=.18+col*(W-.38)/6
    y=.27+(row%2)*.30
    z=14+row*34
    if name=='Rak sandal masjid':
     box(L,x,y,x+.19,y+.32,z,z+6,'DARK')
     box(L,x+.03,y+.02,x+.10,y+.29,z+6,z+8,'RED' if col%3 else 'BLUE')
    elif name=='Rak sajadah dan kitab':
     if row==2:
      pole(L,x+.08,y,z+13,.09,'CREAM',base=z)
      box(L,x+.06,y-.11,x+.14,y+.11,z+10,z+15,'RED')
     else:
      box(L,x,y,x+.17,y+.26,z,z+17,'GREEN' if col%2 else 'TERRA')
      box(L,x,y-.01,x+.17,y+.01,z+7,z+10,'GOLD')
    elif name=='Rak mie instan':
     box(L,x,y,x+.18,y+.30,z,z+18,'ORANGE' if col%2 else 'YEL')
     box(L,x+.03,y-.02,x+.15,y+.03,z+6,z+12,'RED')
    else:
     box(L,x,y,x+.15,y+.24,z,z+23,'RED' if col%3 else 'BLUE')
     box(L,x+.03,y-.02,x+.13,y+.02,z+11,z+15,'YEL')
  return True
 if name=='Tabung gas melon':
  shadow(L)
  from indonesia_200_quality import gas
  gas(L,2)
  box(L,.21,.16,W*.64,.24,16,24,'YEL')
  return True
 return False
