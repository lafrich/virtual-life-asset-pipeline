"""Kebon Sirih, Jakarta Pusat — hand-tuned 1x pixel city-ground textures.
Native Semesta terrain assets: 64px/1 world tile. Seamless edge rules,
quiet material grain, no font or image dependencies. Deterministic build.
"""
from pathlib import Path
import json,random,math
from PIL import Image,ImageDraw

OUT=Path('assets/kebon_sirih/terrain')
OUT.mkdir(parents=True,exist_ok=True)
N=64
PALETTE={
 'road_asphalt':('#565b60','#4e5358','#60666a','#424a50'),
 'road_concrete':('#989c99','#888c8a','#abb0ac','#6c7271'),
 'sidewalk':('#b0b0a9','#999b95','#c1c0b7','#747b79'),
 'plaza':('#c9bfb0','#b7afa3','#ddd3c4','#8c8982'),
 'soil':('#756653','#675846','#8c775e','#51483c'),
 'grass':('#66805a','#58754e','#759069','#435f43'),
 'water':('#568b96','#4b7d89','#6ca0aa','#39727f')
}

def rgb(h):
 return tuple(bytes.fromhex(h[1:]))
def img_color(kind):
 return tuple(rgb(v) for v in PALETTE[kind])
def grain(im, colors, seed, pieces=90, large=6):
 rand=random.Random(seed)
 d=ImageDraw.Draw(im)
 base,dark,light,verydark=colors
 # 1-2px mineral flecks; restrained tonal variance avoids noisy game tiles.
 for i in range(pieces):
  x=rand.randrange(N);y=rand.randrange(N)
  w=1+(rand.random()<.2);h=1+(rand.random()<.12)
  color=dark if rand.random()<.45 else light
  d.rectangle((x,y,x+w,y+h),fill=(*color,255))
 for i in range(large):
  x=rand.randrange(N);y=rand.randrange(N)
  w=rand.randint(4,12);h=rand.randint(2,5)
  color=dark if rand.random()<.6 else light
  # Very light weathering: pixel stipple, not solid geometric blobs.
  for yy in range(y,min(N,y+h)):
   for xx in range(x,min(N,x+w)):
    if rand.random()<.14:im.putpixel((xx,yy),(*color,255))
 return im

def base(kind,seed):
 cs=img_color(kind)
 im=Image.new('RGBA',(N,N),(*cs[0],255))
 grain(im,cs,seed,50 if kind=='road_asphalt' else 65,5)
 return im

def asphalt():
 im=base('road_asphalt',803)
 d=ImageDraw.Draw(im)
 cs=img_color('road_asphalt')
 # Long-jointed patched strip, very low contrast against asphalt body.
 d.line([(13,15),(16,18),(16,27),(19,30)],fill=(*cs[1],255),width=1)
 d.line([(51,37),(49,40),(53,43)],fill=(*cs[2],255),width=1)
 for x,y in [(6,55),(34,12),(46,61),(56,27)]:
  d.point((x,y),fill=(*cs[3],255))
 return im

def concrete():
 im=base('road_concrete',807)
 d=ImageDraw.Draw(im)
 c=img_color('road_concrete')
 # Rigid pavement repair joints on a 2-tile repeat.
 for x in [0,63]:
  d.line([(x,0),(x,63)],fill=(*c[1],255))
 for y in [0,63]:
  d.line([(0,y),(63,y)],fill=(*c[1],255))
 d.line([(2,1),(62,1)],fill=(*c[2],255))
 return im

def pave(kind='sidewalk',seed=1):
 im=base(kind,seed)
 d=ImageDraw.Draw(im)
 c=img_color(kind)
 step=16 if kind=='sidewalk' else 24
 # Precise andesite / urban plaza pavers with staggered stone courses.
 for y in range(0,N,step):
  d.line([(0,y),(N-1,y)],fill=(*c[1],255))
  if y+1<N:d.line([(0,y+1),(N-1,y+1)],fill=(*c[2],255))
  off=(step//2) if (y//step)%2 else 0
  for x in range(-off,N,step):
   d.line([(x,y),(x,y+step-1)],fill=(*c[1],255))
 # Subtle hairline seams.
 return im

def sidewalk(edge=None):
 im=pave('sidewalk',813)
 d=ImageDraw.Draw(im)
 dark,shade,hi,low=img_color('sidewalk')
 if edge:
  # Kerb at the carriageway boundary. Two pixel-dark bevel + light lip.
  if edge=='n':
   d.rectangle((0,0,63,2),fill=(*hi,255));d.line((0,3,63,3),fill=(*shade,255))
   strip=(10,0,17,63);axis='h'
  elif edge=='s':
   d.rectangle((0,61,63,63),fill=(*hi,255));d.line((0,60,63,60),fill=(*shade,255))
   strip=(46,0,53,63);axis='h'
  elif edge=='e':
   d.rectangle((61,0,63,63),fill=(*hi,255));d.line((60,0,60,63),fill=(*shade,255))
   strip=(0,46,63,53);axis='v'
  else:
   d.rectangle((0,0,2,63),fill=(*hi,255));d.line((3,0,3,63),fill=(*shade,255))
   strip=(0,10,63,17);axis='v'
  yellow=(186,158,65);shadow=(139,117,50);bright=(214,186,82)
  # Local tactile strip, parallel to road: not a fully yellow sidewalk.
  if axis=='h':
   left=strip[0];d.rectangle((0,left,63,left+7),fill=(*yellow,255))
   for y in (left+1,left+4):
    for x in range(3,64,7):
     d.rectangle((x,y,x+2,y+1),fill=(*bright,255))
     d.point((x+2,y+2),fill=(*shadow,255))
  else:
   top=strip[1];d.rectangle((top,0,top+7,63),fill=(*yellow,255))
   for x in (top+1,top+4):
    for y in range(3,64,7):
     d.rectangle((x,y,x+1,y+2),fill=(*bright,255))
     d.point((x+2,y+2),fill=(*shadow,255))
 return im

def grass():
 im=base('grass',901);d=ImageDraw.Draw(im)
 c=img_color('grass')
 rand=random.Random(901)
 for i in range(33):
  x=rand.randrange(2,N-2);y=rand.randrange(2,N-2)
  co=c[2] if i%3==0 else c[1]
  d.point((x,y),fill=(*co,255))
  if i%5==0:d.line((x-1,y+1,x,y-1),fill=(*co,255))
 return im

def soil():
 im=base('soil',902);d=ImageDraw.Draw(im)
 c=img_color('soil');rnd=random.Random(918)
 for i in range(32):
  x=rnd.randrange(N);y=rnd.randrange(N)
  d.point((x,y),fill=(*c[1 if i%2 else 2],255))
 return im

def water():
 im=base('water',923);d=ImageDraw.Draw(im)
 c=img_color('water')
 for x,y,w in [(8,7,10),(28,23,12),(12,43,9),(45,54,8)]:
  d.line((x,y,x+w,y),fill=(*c[2],255))
  d.line((x+3,y+2,x+w-2,y+2),fill=(*c[1],255))
 return im


# Jakarta urban drainage channel / larger river: native 64x64 nearest pixels.
# Concrete edges and water use only existing approved Kebon Sirih color ramps.
# The repeating texture is on a true horizontal 3D terrain tile, not a billboard.
def drain():
 im=base('road_concrete',1107);d=ImageDraw.Draw(im)
 conc=img_color('road_concrete');wat=img_color('water')
 # Narrow open drainage channel follows vertical tile boundary across rows.
 d.rectangle((11,0,53,63),fill=(*conc[1],255))
 d.rectangle((14,0,50,63),fill=(*conc[3],255))
 d.rectangle((19,0,45,63),fill=(*wat[1],255))
 d.rectangle((23,0,42,63),fill=(*wat[0],255))
 d.line((14,0,14,63),fill=(*conc[2],255),width=2)
 d.line((49,0,49,63),fill=(*conc[0],255),width=2)
 for y in (5,24,45):
  d.line((25,y,36,y),fill=(*wat[2],255))
  d.line((28,y+2,38,y+2),fill=(*wat[1],255))
 for y in (14,36,58):
  d.line((4,y,11,y),fill=(*conc[2],255))
  d.line((53,y+5,60,y+5),fill=(*conc[1],255))
 return im

def river():
 im=base('water',1521);d=ImageDraw.Draw(im)
 wat=img_color('water');conc=img_color('road_concrete')
 # Concrete-banked city river. Side seams tile on Y, no floating spray.
 d.rectangle((0,0,9,63),fill=(*conc[1],255))
 d.rectangle((54,0,63,63),fill=(*conc[1],255))
 d.rectangle((10,0,13,63),fill=(*conc[0],255))
 d.rectangle((50,0,53,63),fill=(*conc[3],255))
 d.line((14,0,14,63),fill=(*wat[3],255),width=2)
 d.line((49,0,49,63),fill=(*wat[1],255),width=2)
 # Muddy turquoise-brown water reads as urban, never pure blue.
 d.rectangle((18,0,46,63),fill=(*wat[1],255))
 rnd=random.Random(1521)
 for _ in range(41):
  x=rnd.randint(19,45);y=rnd.randrange(64);w=rnd.randint(2,10)
  d.line((x,y,min(46,x+w),y),fill=(*(wat[2] if rnd.random()<.36 else wat[0]),255))
 for y in (7,27,48):
  d.line((3,y,8,y),fill=(*conc[2],255))
  d.line((56,y+6,61,y+6),fill=(*conc[0],255))
 return im

sources={
 'road_asphalt':asphalt(),
 'road_concrete':concrete(),
 'sidewalk':sidewalk(),
 'sidewalk_edge_n':sidewalk('n'),
 'sidewalk_edge_e':sidewalk('e'),
 'sidewalk_edge_s':sidewalk('s'),
 'sidewalk_edge_w':sidewalk('w'),
 'plaza':pave('plaza',818),
 'grass':grass(),
 'soil':soil(),
 'water':water(),
 'drain':drain(),
 'river':river()
}
manifest={'style':'Kebon Sirih, Menteng, Jakarta Pusat — 2026 urban pixel streetscape',
 'revision':1,'projection':'flat seamless per-world-cell albedo for Three.js orthographic 2:1 projection',
 'pixels_per_cell':64,'authoring':'native Python Pillow 1x deterministic material sprites, nearest-neighbor no mipmap',
 'source':'Virtual Life Asset Pipeline','tiles':{}}
for name,img in sources.items():
 fn=name+'.png'
 img.save(OUT/fn,optimize=True)
 manifest['tiles'][name]={'file':'terrain/'+fn,'size':[N,N],
    'color_space':'srgb','wrap':'repeat','pixelated':True}
 (OUT/fn).stat()
(OUT.parent/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Rendered',len(sources),'Kebon Sirih pixel terrain tiles')
