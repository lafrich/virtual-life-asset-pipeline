# v2 grass floor tiles 64x32, anchor (32,0) = top corner (same mask as environment/tiles/grass_a.png).
# All scatter features are stamped on a torus in tile (u,v) space, so a tile wraps onto itself seamlessly.
import numpy as np, random, math
from PIL import Image
from veg import hx
W,H=64,32
LAWN=['#1A6A3A','#22894A','#279249','#2A9E52','#33AA5A','#4FB36B']   # tone 3 = street lawn; #33AA5A new (light patch)
COL={'g':LAWN,'w':['#A7B2C4','#E7EBF2'],'y':['#E7B416','#FFD43B'],'p':['#7A5BB0','#C4B0F0'],'yg':['#55A23E','#78BE4E','#A3D66A'],
     'd':['#8C7A3E','#A8955A','#C3AD8D','#D4C8AE'],'s':['#4F3727','#6B4F3A','#766B59','#9B866F'],'k':['#8D97A8','#C8CCD1']}
def mask():
    m=np.zeros((H,W),bool)
    for y in range(16): m[y,31-2*y:33+2*y]=True; m[H-1-y,31-2*y:33+2*y]=True
    return m
M=mask()
def to_uv(x,y): X=(x+0.5-32)/32; Y=(y+0.5)/16; return (Y+X)/2,(Y-X)/2
def to_px(u,v): return int(math.floor(32+(u-v)*32)), int(math.floor((u+v)*16))
class T:
    def __init__(t,seed):
        t.rng=random.Random(seed); t.c=[[('g',3) for _ in range(W)] for _ in range(H)]
    def stamp(t,u,v,ox,oy,col):
        du=(ox/32+oy/16)/2; dv=(oy/16-ox/32)/2
        x,y=to_px((u+du)%1,(v+dv)%1)
        for xx,yy in ((x,y),(x-1,y),(x,y-1),(x+1,y),(x,y+1)):   # nudge onto the mask at diamond borders
            if 0<=xx<W and 0<=yy<H and M[yy,xx]: t.c[yy][xx]=col; return
    def patch(t,u,v,r,tone,p=0.55,mat='g'):
        for y in range(H):
            for x in range(W):
                if not M[y,x]: continue
                uu,vv=to_uv(x,y); du=(uu-u+0.5)%1-0.5; dv=(vv-v+0.5)%1-0.5
                dx=(du-dv)*32; dy=(du+dv)*16; d=math.hypot(dx,dy*2)/r
                if d<1 and t.rng.random()<p*(1-d*0.6): t.c[y][x]=(mat,tone if isinstance(tone,int) else t.rng.choice(tone))
    def rnd(t): return t.rng.random(),t.rng.random()
    def tuft(t):
        u,v=t.rnd()
        for _ in range(t.rng.randint(3,6)):
            ox=t.rng.randint(-3,3); h=t.rng.randint(2,3); t.stamp(u,v,ox,1,('g',1))
            for j in range(h): t.stamp(u,v,ox+(t.rng.choice([-1,1]) if j==h-1 and t.rng.random()<0.4 else 0),-j,('g',5 if j==h-1 else 4 if ox<=0 else 2))
    def tick(t):
        u,v=t.rnd()
        if t.rng.random()<0.5: t.stamp(u,v,0,0,('g',2)); t.stamp(u,v,0,1,('g',1))
        else: t.stamp(u,v,0,0,('g',5)); t.stamp(u,v,0,1,('g',4))
    def clover(t):
        u,v=t.rnd()
        for _ in range(t.rng.randint(2,4)):
            ox=t.rng.randint(-4,4); oy=t.rng.randint(-2,2)
            t.stamp(u,v,ox,oy+1,('g',1)); t.stamp(u,v,ox,oy,('g',5)); t.stamp(u,v,ox+1,oy,('g',4)); t.stamp(u,v,ox,oy-1,('g',5))
    def leaf(t):
        u,v=t.rnd(); m=t.rng.choice(['d','d','s']); t.stamp(u,v,0,0,(m,1)); t.stamp(u,v,1,0,(m,0))
    def flower(t,m):
        u,v=t.rnd(); t.stamp(u,v,0,1,('g',1)); t.stamp(u,v,0,0,(m,1)); t.stamp(u,v,1,0,(m,0))
    def img(t):
        a=np.zeros((H,W,4),np.uint8)
        for y in range(H):
            for x in range(W):
                if M[y,x]: m,k=t.c[y][x]; a[y,x]=hx(COL[m][k])+(255,)
        return Image.fromarray(a,'RGBA')

def edge_d(x,y,side):
    X=(x+0.5-32)/32; Y=(y+0.5-16)/16
    return {'sw':1-(Y-X),'se':1-(Y+X),'nw':1+Y+X,'ne':1-(X-Y)}[side]
VERT={'n':(32,0),'e':(63,16),'s':(32,31),'w':(0,16)}
def edges(t,sides=(),inner=()):
    for y in range(H):
        for x in range(W):
            if not M[y,x]: continue
            for sd in sides:
                d=edge_d(x,y,sd)
                if d<0.07: t.c[y][x]=('s',0 if d<0.035 else 1)
                elif d<0.14+t.rng.uniform(-0.04,0.05): t.c[y][x]=('g',t.rng.choice([1,2,2,5]))
            for vt in inner:
                vx,vy=VERT[vt]; d=math.hypot(x-vx,(y-vy)*2)
                if d<6: t.c[y][x]=('s',0 if d<3.5 else 1)
                elif d<9+t.rng.uniform(-1.5,1.5): t.c[y][x]=('g',t.rng.choice([1,2,2,5]))

def build(spec,seed):
    t=T(seed); r=t.rng
    for _ in range(spec.get('dark',2)): t.patch(*t.rnd(),r.uniform(7,13),[2,2,1] if spec.get('darker') else 2,0.5)
    for _ in range(spec.get('light',2)): t.patch(*t.rnd(),r.uniform(6,11),4,0.5)
    if spec.get('dry'):   t.patch(0.5,0.5,15,[0,1,2,1],0.85,'d'); t.patch(0.4,0.6,9,[1,2],0.5,'d')
    for _ in range(spec.get('yg',0)): t.patch(*t.rnd(),r.uniform(6,11),[0,0,1,2],0.5,'yg')
    for _ in range(spec.get('bare',0)): t.patch(*t.rnd(),r.uniform(3.5,6),[1,2,1,3],0.85,'s')
    if spec.get('dirt'):  t.patch(0.5,0.5,10,[1,2,1,3],0.9,'s')
    for _ in range(spec.get('ticks',26)): t.tick()
    for _ in range(spec.get('tufts',3)): t.tuft()
    for _ in range(spec.get('clover',0)): t.clover()
    for _ in range(spec.get('leaves',0)): t.leaf()
    for m,n in spec.get('flowers',{}).items():
        for _ in range(n): t.flower(m)
    if spec.get('pebbles'):
        for _ in range(spec['pebbles']):
            u,v=t.rnd(); t.stamp(u,v,0,0,('k',1)); t.stamp(u,v,1,0,('k',0))
    edges(t,spec.get('edges',()),spec.get('inner',()))
    return t.img()

P={}
for i,s in enumerate('abcdef'): P['plain_'+s]=({'dark':1+i%3,'light':1+(i+1)%3,'tufts':2+i%4,'ticks':22+i*3},'Rumput polos '+s.upper()+' (bercak gelap/terang, rumpun)')
P.update({
 'tufty_a':({'tufts':9,'ticks':30},'Rumput rimbun (banyak rumpun) A'),
 'tufty_b':({'tufts':12,'ticks':20,'dark':3},'Rumput rimbun B'),
 'patch_dark':({'dark':5,'darker':1,'light':0,'tufts':4},'Bercak gelap (lembap / teduh)'),
 'patch_light':({'dark':0,'light':5,'tufts':3},'Bercak terang (kena matahari)'),
 'clover_a':({'clover':6,'tufts':2},'Semanggi / daun kecil A'),
 'clover_b':({'clover':10,'tufts':1,'dark':3},'Semanggi / daun kecil B'),
 'leaves_a':({'leaves':10,'tufts':2},'Daun kecil gugur A'),
 'leaves_b':({'leaves':18,'tufts':2,'dark':3},'Daun asam gugur B (teduh)'),
 'tufty_c':({'tufts':10,'ticks':26,'light':3},'Rumput rimbun C (terang)'),
 'clover_c':({'clover':8,'tufts':3,'light':2},'Semanggi hijau C'),
 'leaves_c':({'leaves':12,'tufts':3,'yg':1},'Daun gugur + rumput kekuningan'),
 'yellowgreen_a':({'yg':2,'tufts':3},'Rumput hijau-kekuningan A'),
 'yellowgreen_b':({'yg':4,'tufts':2,'dark':1},'Rumput hijau-kekuningan B (kering sebagian)'),
 'bare_a':({'bare':2,'tufts':4,'pebbles':2},'Rumput + tanah terbuka kecil A'),
 'bare_b':({'bare':3,'tufts':3,'leaves':4},'Rumput + tanah terbuka kecil B'),
 'dry':({'dry':1,'tufts':2},'Rumput kering / menguning'),
 'dirt':({'dirt':1,'tufts':3,'pebbles':4},'Rumput botak (tanah)'),
})
for sd,lab in (('sw','sisi SW / +r, ke trotoar'),('se','sisi SE / +c'),('nw','sisi NW / -c'),('ne','sisi NE / -r')):
    P['edge_'+sd]=({'edges':(sd,),'tufts':3},'Tepi paving '+lab)
for vt,(a,b) in {'s':('sw','se'),'w':('sw','nw'),'n':('nw','ne'),'e':('ne','se')}.items():
    P['corner_out_'+vt]=({'edges':(a,b),'tufts':3},f'Sudut luar {vt.upper()} (paving di {a}+{b})')
for vt in 'swne':
    P['corner_in_'+vt]=({'inner':(vt,),'tufts':3},f'Sudut dalam {vt.upper()} (paving hanya di titik {vt.upper()})')
TILES=[('grass_'+k,v[1]) for k,v in P.items()]
def make(name,i): return build(P[name[6:]][0],200+i)
