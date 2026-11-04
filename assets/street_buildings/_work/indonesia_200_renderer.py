"""Native Indonesian World Pack 200 — scene recipes.

All artwork is rendered by the existing 2:1 v6b Loc/Spr engine, not external
image generation or empty placeholders. Two/four authentic views per asset,
real material shading, transparent background, stable world-space pivot.
"""
from __future__ import annotations
import json, math
from pathlib import Path
from lib import asset, bshadow, roof_flat, Tex, REG
from indonesia_200_details import special
from indonesia_200_quality import render as quality_render
from indonesia_200_finishing import quality_override
from indonesia_200_art_direction_v5 import refine as art_direct
from indonesia_200_umkm_signature import variant as umkm_signature

SPEC_PATH=Path('assets/street_buildings/_work/indonesia_200_specs.json')
SPECS=json.loads(SPEC_PATH.read_text(encoding='utf-8'))['items']
COLORS=['GREEN','BLUE','RED','TEAL','YEL','ORANGE','TERRA','CREAM']
DARK=['CONC','WOOD','DARK','SENG']
SIGN_SHORT={'Warteg etalase hijau':'WARTEG','Rumah makan Padang':'NASI PADANG',
 'Kedai kopi tubruk':'KOPI','Toko sembako':'SEMBAKO',
 'Konter pulsa dan HP':'PULSA','Fotokopi dan ATK':'FOTOKOPI',
 'Puskesmas kecamatan':'PUSKESMAS','Masjid lingkungan':'MASJID',
 'Gedung SMP SMA':'SMP SMA','Sekolah dasar negeri':'SD NEGERI'}

def profile(s):
 category=s['category'];kind=s['kind']
 if category=='transport':
  if kind in ('bus',):return ('prop',5.3,2.2,152,('sw','se','ne','nw'))
  if kind in ('truck','pickup','van','angkot'):return ('prop',4.1,2.0,143,('sw','se','ne','nw'))
  if kind in ('andong','bajaj','becak','bentor'):return ('prop',2.7,1.6,145,('sw','se','ne','nw'))
  return ('prop',2.2,1.25,135,('sw','se','ne','nw'))
 if category in ('warung','bangunan'):
  W=5.5 if category=='bangunan' else 3.7
  H=216 if category=='bangunan' else 166
  if kind in ('ruko','sekolah','public','pasar','gudang','masjid','gereja'):W+=1.2;H+=55
  return ('kampung' if category=='warung' or kind in ('rumah','mushola') else 'jalan',
          W,4.6 if category=='bangunan' else 3.4,H,('sw','se'))
 if category=='tanaman':
  # Reuse the original approved native species' exact footprint and extent.
  # This keeps the 3D isometric pivot inside every cropped PNG, especially
  # for very narrow plants such as sansevieria and hanging sirih gading.
  original_species={
   'Pohon pisang pekarangan':(2.7,2.7,176),
   'Pohon kelapa pesisir':(2.7,2.7,230),
   'Pohon mangga rindang':(2.7,2.7,211),
   'Pohon pepaya berbuah':(1.9,1.9,193),
   'Pohon rambutan':(2.8,2.8,222),
   'Pohon sawo':(2.6,2.6,198),
   'Rumpun bambu':(2.2,2.2,212),
   'Pohon kamboja bunga':(2.3,2.3,174),
   'Daun pandan wangi':(1.7,1.7,106),
   'Bougenville berbunga':(1.6,1.6,126),
   'Sirih gading pot':(1.5,1.4,120),
   'Lidah mertua pot':(1.35,1.35,118)
  }
  if s['label'] in original_species:
   return ('prop',*original_species[s['label']],('sw','se'))
  if kind in ('pohon','kelapa','ketapang','kamboja','bambu','pisang','pepaya'):
   return ('prop',2.8,2.8,214,('sw','se'))
  return ('prop',2.1,2.1,118,('sw','se'))
 if category=='publik' and kind in ('warung','public','mushola','saung'):
  return ('kampung',4,3.7,188,('sw','se'))
 if category=='jalan' and kind in ('halte','pos','gapura'):
  return ('prop',3.5,2.3,167,('sw','se'))
 if category=='budaya' and kind in ('pendopo','panggung','tenda','gapura','booth'):
  return ('prop',4.1,3,171,('sw','se'))
 if category in ('gerobak','pasar') and kind in ('gerobak','lapak','tenda'):
  return ('prop',3,1.8,149,('sw','se','ne','nw'))
 return ('prop',2.3,1.7,143,('sw','se'))

def color(s):
 return COLORS[(s['num']*3 + len(s['kind']) + len(s['category']))%len(COLORS)]
def safe_box(L,a,b,c,d,z0,z1,m,t=3,front=None):
 a,b=max(.025,a),max(.025,b);c,d=min(L.W-.025,c),min(L.D-.025,d)
 if c<=a+.04 or d<=b+.04:return
 lo,hi=int(round(z0)),int(round(z1))
 if hi<=lo:return
 L.box(a,b,c,d,lo,hi,m,t,front=front)
def pole(L,x,y,h=102,m='CONC',r=.06):
 L.s.cyl(*L.cr(x,y),0,int(h),r,m,3)
def dome(L,x,y,z,r=.36,h=24,m='GREEN'):
 L.s.dome(*L.cr(x,y),int(z),r,int(h),m,3)
def shadow(L):
 bshadow(L,.05,.05,L.W-.05,L.D-.05,80)
def nameplate(L,s,band='BLUE',z=88):
 text=SIGN_SHORT.get(s['label'],s['label'])
 text=' '.join(text.split()[:2]).upper()[:15]
 w=max(18,int((L.W-.3)*32))
 t=Tex(w,26,band,3)
 t.rect(1,1,w-1,4,'WHITE',4)
 t.text(w//2,11,text,'LITE',4,sc=1)
 L.front(.15,L.W-.15,.11,z,z+26,t)
def wheels(L,pairs,rad=.20):
 for x,y in pairs:
  L.s.cyl(*L.cr(x,y),1,19,rad,'DARK',2)
  L.s.cyl(*L.cr(x,y),19,21,rad*.52,'CONC',3)

def draw_vehicle(L,s):
 shadow(L)
 W,D=L.W,L.D; k=s['kind']; paint=color(s)
 bike=k in ('motor','sepeda','becak','bentor')
 truck=k in ('truck','pickup')
 bus=k in ('angkot','bus','van')
 if bike:
  wheels(L,[(.32,D*.6),(W-.34,D*.6)],.17 if k=='sepeda' else .24)
  safe_box(L,.38,.35,W-.3,D-.3,18,30,'DARK',2)
  safe_box(L,.6,.48,W-.67,D-.3,30,46,paint,3)
  if k in ('becak','bentor'):
   safe_box(L,.08,.12,.85,D-.22,18,75,'WOOD',3)
   safe_box(L,.12,.18,.8,D-.2,73,81,paint,4)
  elif k=='andong':
   safe_box(L,.2,.22,W-.2,D-.22,22,62,'WOOD',3)
  else:
   safe_box(L,W*.47,.46,W*.68,D-.13,45,73,paint,3)
   pole(L,W*.58,D*.45,81,'DARK',.045)
   dome(L,W*.55,D*.56,72,.16,16,'SKIN')
   dome(L,W*.55,D*.56,91,.16,12,paint)
   if 'box' in s['label'].lower() or 'kurir' in s['label'].lower():
    safe_box(L,.16,.18,.60,D-.18,41,78,'RED',3)
   if 'penumpang' in s['label'].lower():
    dome(L,W*.28,D*.55,77,.15,13,'GREEN')
  return
 wheels(L,[(.5,.37),(W-.6,.37)],.27)
 safe_box(L,.18,.18,W-.18,D-.18,23,68,paint,3)
 if bus:
  safe_box(L,.24,.22,W-.25,D-.25,68,116,'CREAM',3)
  for i in range(5 if k=='bus' else 3):
   x=.4+i*(W-.8)/(5 if k=='bus' else 3)
   safe_box(L,x,.155,x+.47,D-.15,77,110,'GLASS',3)
 elif truck:
  safe_box(L,W*.63,.2,W-.2,D-.2,62,112,'CREAM',3)
  safe_box(L,.28,.2,W*.58,D-.2,63,92,'WOOD' if 'sayur' in s['label'].lower() else 'SENG',3)
 else:
  safe_box(L,W*.3,.2,W*.75,D-.2,67,94,'GLASS',2)
 if 'ambulans' in s['label'].lower():
  safe_box(L,W*.46,.11,W*.57,.2,69,84,'RED',4)
  safe_box(L,W*.41,.11,W*.63,.2,74,79,'RED',4)
 if 'sampah' in s['label'].lower():
  safe_box(L,.28,.14,W*.58,D-.2,61,96,'GREEN',3)

def draw_building(L,s):
 shadow(L);W,D=L.W,L.D;k=s['kind'];paint=color(s)
 wall='CREAM' if s['category']=='bangunan' else ('WHITE' if s['num']%3==0 else 'CONC')
 H=127 if s['category']=='warung' else 168
 if k in ('ruko','sekolah','public','pasar','gudang','masjid','gereja'):H+=45
 if k=='ruko' and 'tiga' in s['label']:H+=32
 def facade(w,h):
  t=Tex(max(1,int(w)),max(1,int(h)),wall,3)
  # Opening and shutters are never just blank painted boxes.
  t.rect(5,7,w-5,min(h-28,76),'DARK',2)
  t.rect(9,11,w-9,min(h-30,73),'GLASS' if k not in ('warung','bengkel','gudang','pasar') else 'WOOD',2)
  t.rect(w//2-3,8,w//2+3,71,'CONC',2)
  for xx in range(24,w-16,31):
   t.rect(xx,16,xx+2,min(h-32,64),'DARK',2)
  if H>=163:
   for xx in range(16,w-16,34):
    t.rect(xx,97,xx+18,127,'GLASS',2)
    t.rect(xx,115,xx+18,118,'CONC',3)
  t.rect(0,h-32,w,h-11,paint,3)
  t.text(w//2,h-25,SIGN_SHORT.get(s['label'],s['label'].split()[0]).upper()[:11],'LITE',4)
  return t
 safe_box(L,.06,.48,W-.06,D-.08,0,H,wall,3,facade)
 safe_box(L,.04,.47,W-.04,.91,H-24,H-14,paint,3)
 safe_box(L,.04,.48,W-.04,D-.1,H,H+7,'SENG',3)
 if k in ('mushola','masjid','gereja'):
  if k!='gereja':
   pole(L,W-.47,D-.6,H+40,'CREAM',.14)
   dome(L,W-.47,D-.6,H+24,.28,22,'GREEN')
  else:
   safe_box(L,W-.65,D-.61,W-.51,D-.45,H+5,H+40,'WOOD',3)
   safe_box(L,W-.78,D-.57,W-.38,D-.48,H+19,H+26,'WOOD',3)
 if k in ('pasar','warung','bengkel'):
  for i in range(3):
   x=.3+i*.65
   if x+.4<W-.1:safe_box(L,x,.08,x+.42,.36,0,23,COLORS[(i+s['num'])%len(COLORS)],3)
 if s['category']=='warung' or k in ('ruko','public','sekolah','pasar','gudang','masjid','mushola','gereja','bengkel'):
  nameplate(L,s,paint,H-56)
 if k in ('rumah','ruko'):
  for x in (.3,W-.95):
   safe_box(L,x,.13,x+.62,.46,4,58,'WOOD',3)

def draw_plant(L,s):
 shadow(L);kind=s['kind'];W,D=L.W,L.D
 x=W*.49;y=D*.5
 if kind in ('padi','air'):
  for i in range(10):
   a=.2+(i%5)*.34;b=.25+(i//5)*.65
   if kind=='padi':
    pole(L,a,b,22+(i%3)*7,'GREEN',.027)
    dome(L,a,b,29+(i%3)*5,.09,9,'YEL')
   else:
    dome(L,a,b,4,.18,4,'GREEN')
    if i%3==0:dome(L,a,b,6,.08,6,'PINK')
  return
 if kind in ('pot','pandan','ilalang','semak'):
  if kind=='pot':safe_box(L,x-.34,y-.35,x+.34,y+.35,0,31,'TERRA',3)
  for i in range(9):
   a=x+.33*math.cos(i*math.tau/9)
   b=y+.29*math.sin(i*math.tau/9)
   pole(L,a,b,38+(i%4)*8,'GREEN',.026)
   dome(L,a,b,37+(i%4)*7,.14,14,'GREEN' if i%3 else 'TEAL')
   if kind=='semak' and i%3==0:dome(L,a,b,57,.08,8,'PINK')
  return
 if kind in ('pisang','bambu','pepaya'):
  for j in range(3 if kind!='bambu' else 6):
   xj=x+(j%3-1)*.25;yj=y+(j//3-.3)*.24
   pole(L,xj,yj,89+j*9,'WOOD' if kind!='bambu' else 'TEAL',.075)
   for i in range(7):
    xx=xj+.4*math.cos(i*math.tau/7)
    yy=yj+.35*math.sin(i*math.tau/7)
    dome(L,xx,yy,87+j*8,.23 if kind=='pisang' else .13,17,'GREEN')
  if kind=='pepaya':dome(L,x,y,86,.14,23,'YEL')
  return
 pole(L,x,y,102,'WOOD',.16)
 for dx,dy,z in [(-.33,-.22,106),(.38,-.18,114),(-.3,.43,112),(.35,.38,107),(0,0,134)]:
  dome(L,x+dx,y+dy,z,.43 if kind!='kelapa' else .32,31,'TEAL' if kind=='ketapang' else 'GREEN')
 if kind in ('kelapa','kamboja'): 
  for i in range(8):
   a=x+.65*math.cos(i*math.tau/8);b=y+.65*math.sin(i*math.tau/8)
   dome(L,a,b,133,.20,16,'GREEN')
 if kind in ('pohon','pepaya') and s['num']%3==0:
  for i in range(4):dome(L,x+.2*math.cos(i),y+.3*math.sin(i),103,.11,11,'RED')
 if kind=='kamboja':
  for i in range(4):dome(L,x+.25*math.cos(i),y+.2*math.sin(i),154,.12,9,'WHITE')

def draw_cart(L,s):
 shadow(L);W,D=L.W,L.D;accent=color(s);kind=s['kind']
 if kind in ('lapak','tenda'):
  for x in (.2,W-.23):
   pole(L,x,.28,104,'WOOD',.06)
   pole(L,x,D-.3,104,'WOOD',.06)
  safe_box(L,.1,.12,W-.09,D-.14,105,117,accent,3)
 else:
  wheels(L,[(.45,D*.4),(W-.46,D*.4)],.24)
  safe_box(L,.2,.15,W-.18,D-.15,19,49,'WOOD',3)
  safe_box(L,.23,.15,W-.18,D-.15,50,59,'SENG',3)
  for x in (.3,W-.38):pole(L,x,.2,106,'WOOD',.05)
  safe_box(L,.13,.11,W-.1,D-.1,110,119,accent,3)
 if kind=='gerobak':
  dome(L,W*.56,D*.46,58,.31,16,'CONC')
  safe_box(L,W*.19,.18,W*.37,.55,60,82,'OGLASS',3)
 elif kind=='lapak':
  for i in range(4):
   a=.25+i*(W-.5)/4
   safe_box(L,a,.25,a+.35,D-.25,12,23,COLORS[(s['num']+i)%8],3)
 nameplate(L,s,accent,75)

def draw_structure(L,s):
 cat=s['category'];kind=s['kind'];W,D=L.W,L.D;paint=color(s);shadow(L)
 if kind in ('tenda','panggung','kanopi','halte','pos','pendopo','booth','saung','gapura'):
  for a in (.18,W-.28):
   for b in (.18,D-.3):pole(L,a,b,103,'WOOD' if kind in ('saung','pendopo') else 'CONC',.055)
  safe_box(L,.1,.1,W-.1,D-.12,105,115,'TERRA' if kind in ('saung','pendopo') else paint,3)
  if kind in ('pos','booth','halte'):
   safe_box(L,.35,D*.4,W-.35,D-.14,5,70,'CREAM',2)
  if kind in ('gapura','booth','halte','pos'):nameplate(L,s,paint,76)
  return
 if kind in ('toren','galon','gas','penanak','panci','bedug','freezer','pommini','pompa'):
  for n in range(1 if kind in ('toren','freezer','pommini') else 3):
   x=.4+n*.58
   if x+.25>W:continue
   if kind in ('freezer','pommini'):
    safe_box(L,x,.35,x+.45,D-.3,0,72,'WHITE',3)
    safe_box(L,x,.3,x+.45,.48,55,68,paint,2)
   else:
    L.s.cyl(*L.cr(x,D*.52),0,69 if kind=='toren' else 36,.25,'BLUE' if kind in ('galon','toren') else 'GREEN' if kind=='gas' else 'SENG',3)
    dome(L,x,D*.52,36 if kind!='toren' else 69,.24,8,'CONC')
  return
 if kind in ('tiang','lampu','toa','bendera','umbul','antenna','antena','parabola','pinang','bts'):
  for i in range(1 if kind not in ('bts',) else 3):
   x=W*.45+(i-1)*.37;y=D*.48
   pole(L,x,y,118,'CONC',.055)
   if kind in ('bendera','umbul'):
    safe_box(L,x+.06,y-.04,x+.7,y+.05,99,113,'RED',4)
    safe_box(L,x+.06,y-.04,x+.7,y+.05,86,98,'WHITE',4)
   elif kind in ('lampu','toa'):
    dome(L,x,y,118,.19,13,'YEL')
   elif kind in ('bts','parabola'):dome(L,x,y,119,.24,12,'CONC')
  return
 if kind in ('pagar','portal','blok','jalan','lapangan'):
  if kind in ('jalan','lapangan'):
   # Ground markings are actual flat world-space sprites, not vertical boards.
   safe_box(L,.15,.18,W-.14,D-.16,0,2,'ASPH' if kind=='jalan' else 'GREEN',2)
   for i in range(4):
    a=.25+i*(W-.5)/4
    safe_box(L,a,.18,a+.1,D-.2,2,4,'LITE',3)
  else:
   for i in range(6):
    x=.15+i*(W-.3)/6
    safe_box(L,x,.43,x+.085,.58,0,76,'WOOD' if kind=='pagar' else 'CONC',3)
   safe_box(L,.1,.4,W-.15,.61,52,58,'RED' if kind=='portal' else 'WOOD',3)
  return
 if kind in ('rak','etalase','peti','karung','kotak','sampah','kandang','sangkar','baliho','papan','banner'):
  for i in range(3 if kind in ('rak','peti','karung') else 1):
   x=.13+i*.62
   if x+.53>W:break
   safe_box(L,x,.23,x+.53,D-.22,0,38+i%2*7,'WOOD' if kind in ('peti','karung','rak') else paint,3)
   if kind in ('rak','etalase'):
    for z in (40,62):safe_box(L,x,.25,x+.5,D-.23,z,z+5,'SENG',3)
  if kind in ('papan','banner','baliho'): 
   pole(L,W*.5,D*.7,106,'WOOD',.055)
   safe_box(L,.17,.2,W-.19,.44,91,121,paint,3)
   nameplate(L,s,paint,92)
  return
 if kind in ('meja','bangku','kursi','speaker','wastafel','basket','cone','hidran','sangkar','timbangan','antena','kompor','nampan','penanak','sepeda'):
  safe_box(L,.24,.22,W-.23,D-.25,19,42,paint,3)
  for x in (.33,W-.45):pole(L,x,D*.48,29,'WOOD',.053)
  if kind in ('speaker','basket','wastafel'):
   pole(L,W*.53,D*.47,95,'DARK',.08)
   safe_box(L,W*.4,.24,W*.75,.58,86,104,'CONC',3)
  return
 if kind in ('payung','padi','ilalang','air','kamboja','kelapa','pohon','bambu','pandan','semak'):
  draw_plant(L,s);return
 if kind in ('jemuran','sangkar','pohon','bendera'):
  for x in (.2,W-.25):pole(L,x,.5,115,'WOOD',.052)
  safe_box(L,.25,.42,W-.2,.55,84,88,'SENG',3)
  for i in range(3):
   a=.25+i*(W-.45)/3
   safe_box(L,a,.37,a+.37,.55,56,85,COLORS[(i+s['num'])%8],3)
  return
 # Familiar household street-level objects: box + content + readable sign.
 safe_box(L,.2,.18,W-.2,D-.2,0,63,paint,3)
 safe_box(L,.25,.16,W-.25,D-.22,63,70,'SENG',3)
 for i in range(2):
  a=.42+i*.6
  if a+.3<W:safe_box(L,a,.17,a+.28,.31,22,48,'WOOD',2)

def draw(L,s):
 # Quality gate: NO legacy faceless-cube fallback for the 200-asset pack.
 # Every asset must have a recognizable authored v2 recipe.
 if umkm_signature(L,s):return
 if quality_override(L,s) or quality_render(L,s):
  art_direct(L,s)
  return
 raise ValueError('Missing Indonesia 200 authored scene recipe: '+s['id'])
 if special(L,s):return
 cat=s['category'];kind=s['kind']
 if cat=='transport':draw_vehicle(L,s)
 elif cat in ('warung','bangunan') or (cat=='publik' and kind in ('warung','public','mushola','saung')):
  draw_building(L,s)
 elif cat=='tanaman':draw_plant(L,s)
 elif cat=='gerobak' and kind=='gerobak' or cat=='pasar' and kind in ('lapak','tenda','gerobak'):
  draw_cart(L,s)
 else:draw_structure(L,s)

def register():
 for s in SPECS:
  group,w,d,h,oris=profile(s)
  s.update(group=group,W=w,D=d,Hmax=h,oris=list(oris))
  def painter(loc,ref=s):draw(loc,ref)
  asset(s['id'],group,w,d,h,oris=oris,note=s['label']+' · Indonesia 200 / '+s['category'])(painter)
 assert len(SPECS)==200 and len({x['id'] for x in SPECS})==200
 assert all(s['id'] in REG for s in SPECS)
 return SPECS
