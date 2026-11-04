"""Indonesian identity details on top of the 200-asset parametric pack.
Focused bespoke geometry for unmistakably local landmarks and props.
No external sprites, no default cubes in place of cultural objects.
"""
import math
from lib import Tex,bshadow

def B(L,a,b,c,d,z0,z1,m='WOOD',t=3):
 a=max(.02,a);b=max(.02,b);c=min(L.W-.02,c);d=min(L.D-.02,d)
 z0,z1=int(round(z0)),int(round(z1))
 if c>a+.05 and d>b+.05 and z1>z0:L.box(a,b,c,d,z0,z1,m,t)
def P(L,x,y,z=100,m='WOOD',r=.07):
 L.s.cyl(*L.cr(x,y),0,int(z),r,m,3)
def D(L,x,y,z,r=.2,h=17,m='GREEN'):
 L.s.dome(*L.cr(x,y),int(z),r,int(h),m,3)
def sh(L):
 bshadow(L,.08,.08,L.W-.08,L.D-.08,85)
def plate(L,text,z=85,paint='BLUE'):
 w=max(16,int((L.W-.25)*32))
 t=Tex(w,24,paint,3)
 t.text(w//2,12,text[:16].upper(),'LITE',4,sc=1,bold=True)
 L.front(.13,L.W-.13,.09,z,z+24,t,dep=2)

def special(L,s):
 kind=s['kind'];c=s['category'];text=s['label'].lower()
 W,D_=L.W,L.D
 if c=='transport':return False  # canonical native transport scene recipe
 if c in ('warung','bangunan','publik') and (c!='publik' or kind in ('public','warung','saung','mushola')):
  return False # Main renderer supplies shop facade; embellishments below.
 if c=='budaya' and kind=='ondel':
  sh(L)
  for x in (.7,1.42):
   D(L,x,D_*.55,56,.43,45,'RED' if x<1 else 'BLUE')
   B(L,x-.31,.58,x+.32,D_-.2,10,50,'RED' if x<1 else 'BLUE',3)
   P(L,x,D_*.56,85,'SKIN',.13);D(L,x,D_*.56,92,.21,22,'SKIN')
   for i in range(5):
    xx=x+.34*math.cos(i*math.tau/5)
    yy=D_*.55+.22*math.sin(i*math.tau/5)
    D(L,xx,yy,111,.11,13,'RED' if i%2 else 'PINK')
   B(L,x-.36,.54,x+.38,.64,78,84,'CREAM',3)
  return True
 if c=='budaya' and kind=='bedug':
  sh(L);x=W*.5;y=D_*.50
  for a in (.45,W-.57):P(L,a,y,54,'WOOD',.11)
  B(L,.36,.24,W-.38,D_-.28,31,47,'WOOD',3)
  L.s.cyl(*L.cr(x,y),40,91,.37,'WOOD',3)
  D(L,x,y,91,.36,9,'CREAM')
  for dx in (-.19,0,.19):B(L,x+dx-.025,.21,x+dx+.025,D_-.2,72,77,'DARK',2)
  return True
 if kind in ('cone','hidran') and c=='jalan':
  sh(L);x=W*.48;y=D_*.52
  if kind=='cone':
   B(L,x-.35,y-.34,x+.35,y+.32,0,7,'DARK')
   B(L,x-.27,y-.28,x+.27,y+.28,7,22,'ORANGE')
   B(L,x-.2,y-.19,x+.2,y+.19,22,37,'WHITE')
   B(L,x-.12,y-.13,x+.12,y+.13,37,53,'ORANGE')
  else:
   L.s.cyl(*L.cr(x,y),0,51,.21,'RED',3)
   D(L,x,y,51,.25,13,'RED')
   B(L,x-.42,y-.13,x+.42,y+.12,24,33,'RED')
  return True
 if c=='jalan' and kind in ('lampu','tiang'):
  sh(L);x=W*.50;y=D_*.47
  P(L,x,y,124,'DARK',.07)
  if kind=='lampu':
   for i,col in enumerate(('RED','YEL','GREEN')):
    D(L,x,y,94+i*13,.17,9,col)
   B(L,x-.19,y-.13,x+.19,y+.15,88,125,'DARK',2)
   for i,col in enumerate(('RED','YEL','GREEN')):
    D(L,x,y-.10,95+i*13,.12,7,col)
  else:
   B(L,x-.5,y-.05,x+.5,y+.05,88,96,'WOOD')
   B(L,x-.48,y-.05,x+.47,y+.06,113,120,'WOOD')
   for xx in (x-.41,x,x+.40):
    D(L,xx,y,118,.08,6,'CONC')
  return True
 if c=='jalan' and kind=='blok':
  sh(L)
  for i in range(4):
   x=.13+i*(W-.3)/4
   B(L,x,.23,x+.43,D_-.2,0,43,'CONC')
   B(L,x,.19,x+.43,.27,22,32,'YEL')
  return True
 if c=='jalan' and kind=='jalan' and 'polisi tidur' in text:
  sh(L)
  B(L,.10,.20,W-.1,D_-.18,0,5,'ASPH',2)
  B(L,.15,D_*.38,W-.13,D_*.62,5,16,'TERRA',3)
  for i in range(5):
   x=.18+i*(W-.36)/5
   B(L,x,D_*.36,x+.13,D_*.64,15,18,'YEL',4)
  return True
 if c=='jalan' and kind=='portal':
  sh(L)
  for x in (.16,W-.28):P(L,x,D_*.48,94,'CONC',.11)
  B(L,.20,D_*.46,W-.22,D_*.54,87,96,'WHITE',4)
  for i in range(7):
   x=.22+i*(W-.44)/7
   B(L,x,D_*.44,x+.2,D_*.56,90,96,'RED',4)
  return True
 if c=='budaya' and kind=='pinang':
  sh(L);x=W*.52;y=D_*.5
  P(L,x,y,143,'TERRA',.10)
  for i,m in enumerate(('RED','WHITE','BLUE','YEL','CREAM')):
   B(L,x-.45+i*.15,y-.13,x-.31+i*.15,y+.13,137,152,m)
  D(L,x,y,149,.16,8,'YEL')
  return True
 if c=='budaya' and kind=='tugu':
  sh(L);x=W*.5;y=D_*.5
  B(L,x-.46,y-.44,x+.46,y+.44,0,21,'CONC')
  B(L,x-.30,y-.3,x+.30,y+.3,21,99,'CREAM')
  B(L,x-.18,y-.18,x+.18,y+.18,99,117,'GOLD')
  D(L,x,y,117,.11,14,'GOLD')
  return True
 if c=='budaya' and kind=='speaker':
  sh(L)
  for x in (.42,W-.50):
   B(L,x,.26,x+.43,D_-.22,0,72,'DARK',3)
   for z in (17,48):
    D(L,x+.20,D_*.55,z,.16,8,'CONC')
  return True
 if c=='publik' and kind=='basket':
  sh(L);x=W*.55;y=D_*.56
  P(L,x,y,106,'CONC',.08)
  B(L,x-.42,y-.12,x+.42,y+.12,103,133,'WHITE')
  B(L,x-.28,y-.14,x+.27,y-.10,105,110,'RED')
  D(L,x,y-.20,100,.17,6,'RED')
  return True
 if c=='rumah' and kind=='sangkar' or c=='publik' and kind=='sangkar':
  sh(L);x=W*.5;y=D_*.52
  P(L,x,y,113,'WOOD',.07)
  B(L,x-.43,y-.35,x+.43,y+.35,39,44,'WOOD')
  for dx in (-.32,-.16,0,.16,.32):
   B(L,x+dx-.03,y-.28,x+dx+.03,y+.28,44,83,'SENG',2)
  D(L,x,y,83,.43,13,'TERRA')
  D(L,x,y,58,.10,10,'BLUE')
  return True
 if c=='rumah' and kind=='kandang':
  sh(L)
  B(L,.2,.2,W-.2,D_-.2,0,12,'WOOD')
  for i in range(8):
   x=.25+i*(W-.5)/8
   B(L,x,.18,x+.055,.35,10,68,'WOOD')
  B(L,.16,.18,W-.16,D_-.19,74,84,'SENG')
  for x in (.6,1.4):
   D(L,x,D_*.55,23,.14,13,'WHITE')
   D(L,x+.13,D_*.55,34,.08,7,'RED')
  return True
 if c=='budaya' and kind=='sangkar':
  sh(L)
  P(L,W*.5,D_*.6,118,'WOOD')
  D(L,W*.5,D_*.6,92,.4,12,'TERRA')
  for i in range(9):
   a=W*.5+.35*math.cos(i*math.tau/9);b=D_*.6+.31*math.sin(i*math.tau/9)
   P(L,a,b,83,'SENG',.025)
  return True
 if c=='rumah' and kind in ('antena','parabola'):
  sh(L);x=W*.5;y=D_*.55;P(L,x,y,112,'CONC',.04)
  if kind=='antena':
   for z in (63,79,93,109):
    B(L,x-.44,y-.025,x+.44,y+.025,z,z+3,'SENG')
  else:
   D(L,x,y,108,.38,11,'CONC')
   B(L,x-.13,y-.09,x+.13,y+.09,108,121,'DARK')
  return True
 if c=='rumah' and kind=='toren':
  sh(L);x=W*.5;y=D_*.52
  for a in (x-.3,x+.25):
   for b in (y-.3,y+.25):P(L,a,b,39,'DARK',.05)
  B(L,x-.34,y-.32,x+.34,y+.32,38,45,'CONC')
  L.s.cyl(*L.cr(x,y),45,103,.40,'BLUE',3)
  D(L,x,y,103,.38,12,'BLUE')
  return True
 if c=='rumah' and kind=='wudhu':
  sh(L)
  B(L,.16,.18,W-.18,D_-.2,0,23,'CONC')
  for i in range(3):
   x=.4+i*.46
   B(L,x,.18,x+.26,D_-.2,23,51,'CREAM')
   D(L,x+.14,.25,44,.07,7,'SENG')
  return True
 if c=='pasar' and kind=='payung':
  sh(L);x=W*.5;y=D_*.55;P(L,x,y,104,'WOOD',.07)
  for i in range(8):
   a=x+.60*math.cos(i*math.tau/8)
   b=y+.60*math.sin(i*math.tau/8)
   D(L,a,b,92,.22,12,'YEL' if i%2 else 'RED')
  D(L,x,y,104,.36,12,'RED')
  return True
 if c in ('pasar','gerobak') and kind in ('kursi','bangku','meja'):
  sh(L)
  for x in (.26,W-.35):
   for y in (.3,D_-.31):P(L,x,y,31,'WOOD',.04)
  B(L,.15,.18,W-.14,D_-.17,30,37,'BLUE' if kind=='kursi' else 'WOOD')
  if kind=='kursi':B(L,.2,D_-.35,W-.16,D_-.22,37,87,'BLUE')
  return True
 return False
