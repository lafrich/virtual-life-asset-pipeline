# mock street preview (4x): game street cross-section (index.html colours) + lawn of the new grass tiles + vegetation
import json, random
from PIL import Image, ImageDraw
OUT='assets/vegetation_kebonsirih'
SV='assets/street_vehicles'
man=json.load(open(OUT+'/manifest.json'))
C0,C1=-4,44; R0,R1=13.0,41.0
def P(c,r): return ((c-r)*32,(c+r)*16)
VIS=(0,20)
xs=[P(c,r)[0] for c in VIS for r in (R0,R1)]; ys=[P(c,r)[1] for c in VIS for r in (R0,R1)]
ox=-min(xs)+0; oy=-min(ys)+40
W=int(max(xs)-min(xs)); H=int(max(ys)-min(ys))+10
def S(c,r): x,y=P(c,r); return (round(x+ox),round(y+oy))
def quad(d,c0,r0,c1,r1,fill): d.polygon([S(c0,r0),S(c1,r0),S(c1,r1),S(c0,r1)],fill=fill)
bg=Image.new('RGBA',(W,H),'#2A9E52'); d=ImageDraw.Draw(bg)
T={k:Image.open(OUT+'/'+v['file']).convert('RGBA') for k,v in man['tiles'].items()}
rnd=random.Random(5)
TN=list(man['tiles'].keys())
FILL=[k for k in TN if 'edge' not in k and 'corner' not in k]
WT={k:(10 if 'plain' in k else 4 if ('tufty' in k or 'patch' in k or 'clover' in k) else 2 if ('leaves' in k or 'flowers' in k) else 0.6) for k in FILL}
PATH=(9,23)   # paved footpath: c in [9,10), r from 23 to the sidewalk
def pick(c,r):
    pc,pr=PATH
    if c==pc and r>=pr: return None
    if r==30:
        if c==pc-1: return 'grass_corner_out_s'
        if c==pc+1: return 'grass_corner_out_w'
        return 'grass_edge_sw'
    if r>=pr and c==pc-1: return 'grass_edge_se'
    if r>=pr and c==pc+1: return 'grass_edge_nw'
    if r==pr-1 and c==pc: return 'grass_edge_sw'
    if r==pr-1 and c==pc-1: return 'grass_corner_in_s'
    if r==pr-1 and c==pc+1: return 'grass_corner_in_w'
    return rnd.choices(FILL,[WT[k] for k in FILL])[0]
for c in range(C0-24,C1+2):
    for r in range(int(R0)-14,31):
        k=pick(c,r); x,y=S(c,r)
        if k: bg.alpha_composite(T[k],(x-32,y))
quad(d,PATH[0],PATH[1],PATH[0]+1,31,'#C8CCD1')
for r in range(PATH[1],31): d.line([S(PATH[0],r+0.5),S(PATH[0]+1,r+0.5)],fill='#B4B8BE'); d.line([S(PATH[0],r),S(PATH[0]+1,r)],fill='#B4B8BE')
d.line([S(PATH[0]+0.5,PATH[1]),S(PATH[0]+0.5,31)],fill='#B4B8BE')
quad(d,C0-24,31,C1+2,32.5,'#C8CCD1')
for i in range(-60,60):
    c=C0-20+i*0.75; d.line([S(c,31),S(c,32.5)],fill='#B4B8BE')
d.line([S(C0-20,31.75),S(C1+2,31.75)],fill='#B4B8BE')
quad(d,C0-20,31.95,C1+2,32.25,'#E7B416')
quad(d,C0-20,32.5,C1+2,32.75,'#B8B2A8')
for i in range(C0-20,C1+2,2): quad(d,i,32.62,i+1,32.75,'#1C2330')
quad(d,C0-20,32.44,C1+2,32.5,'#8D97A8')
quad(d,C0-20,32.75,C1+2,36.3,'#4A5362')
for _ in range(1600):
    c=rnd.uniform(C0-20,C1+2); r=rnd.uniform(32.85,36.2); x,y=S(c,r); d.rectangle([x,y,x+1,y],fill=rnd.choice(['#404857','#596373']))
quad(d,C0-20,32.75,C1+2,32.83,'#2A3242'); quad(d,C0-20,32.92,C1+2,32.98,'#F4F1EA'); quad(d,C0-20,36.07,C1+2,36.13,'#F4F1EA')
for i in range(C0-20,C1+2,2): quad(d,i,34.47,i+1,34.58,'#FFD166')
quad(d,C0-20,36.22,C1+2,36.3,'#2A3242'); quad(d,C0-20,36.3,C1+2,36.55,'#B8B2A8')
for i in range(C0-20,C1+2,2): quad(d,i,36.3,i+1,36.42,'#1C2330')
quad(d,C0-20,36.55,C1+2,37.7,'#C8CCD1')
for i in range(-60,60):
    c=C0-20+i*0.75; d.line([S(c,36.55),S(c,37.7)],fill='#B4B8BE')
quad(d,C0-20,36.95,C1+2,37.2,'#E7B416')
# far-side planting strip (roadside green strip like the 'now' photo)
for c in range(C0-20,C1+2):
    for r in (38,39,40):
        k='grass_edge_ne' if r==38 else rnd.choices(FILL,[WT[k] for k in FILL])[0]
        x,y=S(c,r); bg.alpha_composite(T[k],(x-32,y))
quad(d,C0-20,37.7,C1+2,38.0,'#9B866F')
spr={k:Image.open(OUT+'/'+v['file']).convert('RGBA') for k,v in man['sprites'].items()}
items=[]
def put(name,c,r):
    v=man['sprites'][name]; x,y=S(c,r); items.append((c+r,spr[name],(x-v['pivot'][0],y-v['pivot'][1])))
# near side: asam row on the lawn edge (like the photo), a few species further back, big open lawn in between
for name,c,r in [('pohon_asam_L',2.5,29.6),('pohon_asam_M',7.0,29.8),('pohon_asam_L',13.2,29.6),('pohon_asam_M',18.5,29.7),
                 ('pohon_trembesi_L',3.0,17.0),('pohon_angsana_L',16.5,19.5),('pohon_mahoni_L',11.0,16.0),('pohon_beringin',20.5,14.5),
                 ('pohon_ketapang_kencana',6.0,22.5),('pohon_kiara_payung',14.0,24.0),('pohon_asam_S',-1.0,22.0),('pohon_palem_raja',8.2,20.0),('pohon_palem_raja',10.8,20.0),
                 ('pohon_mahoni_M',19.5,23.5),('pohon_angsana_M',0.5,15.0),('pohon_glodokan_tiang',21.8,27.2)]: put(name,c,r)
for name,c,r in [('prop_tunggul',17.0,27.0),('prop_kerikil',5.5,25.5)]: put(name,c,r)
OV=[k for k in man['sprites'] if k.startswith('tuft_') or k.startswith('overlay_')]
for _ in range(220):
    c=rnd.uniform(-6,24); r=rnd.uniform(12.5,30.2)
    if PATH[0]-0.2<c<PATH[0]+1.2 and r>PATH[1]-0.3: continue
    put(rnd.choice(OV),c,r)
# far side: planting strip
for name,c,r in [('pohon_angsana_L',1.0,38.9),('pohon_mahoni_M',5.2,38.8),('pohon_trembesi_M',9.4,39.0),('pohon_asam_S',13.0,38.8),('pohon_angsana_M',16.8,38.9),('pohon_asam_M',20.5,38.9)]: put(name,c,r)
pass
# scale refs: one avatar (64x112 frame, pivot 32,100) and the street_vehicles sedan
ch=Image.open(SV+'/_work/char_ref.png').convert('RGBA').crop((0,0,256,448)).resize((64,112),Image.NEAREST)
bgc=ch.getpixel((1,1)); px=ch.load()
for y in range(112):
    for x in range(64):
        p=px[x,y]
        if abs(p[0]-bgc[0])+abs(p[1]-bgc[1])+abs(p[2]-bgc[2])<12: px[x,y]=(0,0,0,0)
        elif y>95 and p[0]<100 and abs(p[0]-p[2])<25 and p[3]==255 and abs(p[0]-bgc[0])<40: px[x,y]=(0,0,0,56)
x,y=S(9.5,29.2); items.append((9.5+29.2,ch,(x-32,y-100)))
sv=json.load(open(SV+'/manifest.json'))['sprites']['sedan_red_se']; car=Image.open(SV+'/'+sv['file']).convert('RGBA')
x,y=S(12.0,33.6); items.append((9+33.6,car,(x-sv['pivot_footprint_centre'][0],y-sv['pivot_footprint_centre'][1])))
for _,im,pos in sorted(items,key=lambda t:t[0]): bg.alpha_composite(im,pos)
out=bg.resize((W*4,H*4),Image.NEAREST); out.convert('RGB').save(OUT+'/preview_street_4x.png',optimize=True)
import os; os.makedirs(OUT+'/_work/chk',exist_ok=True); bg.save(OUT+'/_work/chk/preview_1x.png'); print(W,H,out.size)
