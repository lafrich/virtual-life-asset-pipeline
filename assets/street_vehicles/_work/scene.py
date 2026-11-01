# street-scene preview GIF: game road cross-section (index.html outdoor street, r 31..37.7) as a flat pixel strip
import json, random
from PIL import Image, ImageDraw
OUT='assets/street_vehicles'
man=json.load(open(OUT+'/manifest.json'))['sprites']
C0,C1=-6,22            # world strip drawn (tiles along c)
VIS=(0,14)             # visible c range (crop)
R0,R1=30.6,38.0
def P(c,r): return ((c-r)*32, (c+r)*16)
xs=[P(c,r)[0] for c in VIS for r in (R0,R1)]; ys=[P(c,r)[1] for c in VIS for r in (R0,R1)]
ox=-min(xs); oy=-min(ys)+70
W=int(max(xs)-min(xs)); H=int(max(ys)-min(ys))+70
def S(c,r): x,y=P(c,r); return (round(x+ox), round(y+oy))
def quad(d,c0,r0,c1,r1,fill): d.polygon([S(c0,r0),S(c1,r0),S(c1,r1),S(c0,r1)],fill=fill)
bg=Image.new('RGBA',(W,H),'#2A9E52'); d=ImageDraw.Draw(bg)
quad(d,C0,R0,C1,31,'#279249')
# sidewalk paving (light grey slabs with grout)
quad(d,C0,31,C1,32.5,'#C8CCD1'); quad(d,C0,36.55,C1,37.7,'#C8CCD1')
for c in [C0+i*0.75 for i in range(int((C1-C0)/0.75)+1)]:
    for a,b in ((31,32.5),(36.55,37.7)): d.line([S(c,a),S(c,b)],fill='#B4B8BE')
for r in (31.75,37.12): d.line([S(C0,r),S(C1,r)],fill='#B4B8BE')
quad(d,C0,31.95,C1,32.25,'#E7B416')                      # tactile guide strip
quad(d,C0,36.95,C1,37.2,'#E7B416')
quad(d,C0,32.5,C1,32.75,'#B8B2A8')                       # curb
for i in range(C0,C1,2): quad(d,i,32.62,i+1,32.75,'#1C2330')   # black/white curb paint
quad(d,C0,32.44,C1,32.5,'#8D97A8')
quad(d,C0,32.75,C1,36.3,'#4A5362')                       # asphalt
rnd=random.Random(3)
for _ in range(900):
    c=rnd.uniform(C0,C1); r=rnd.uniform(32.85,36.2); x,y=S(c,r)
    d.rectangle([x,y,x+1,y],fill=rnd.choice(['#404857','#596373']))
quad(d,C0,32.75,C1,32.83,'#2A3242'); quad(d,C0,32.92,C1,32.98,'#F4F1EA'); quad(d,C0,36.07,C1,36.13,'#F4F1EA')
for i in range(C0,C1,2): quad(d,i,34.47,i+1,34.58,'#FFD166')   # dashed centre line
quad(d,C0,36.22,C1,36.3,'#2A3242'); quad(d,C0,36.3,C1,36.55,'#B8B2A8'); quad(d,C0,36.3,C1,36.36,'#8D97A8')
LOOP=24.0; N=64; SP=LOOP/N      # 0.375 tile/frame ~ the game's 5 tiles/s at 80 ms
def foot(name,lane):
    a,b={'sedan':(0.05,1.1),'hatchback':(0.05,1.1),'mpv':(0.05,1.13),'taxi':(0.05,1.1),'van':(0.05,1.15),'bus':(-0.1,1.2)}.get(name.split('_')[0],(0.15,0.85))
    return lane+(a+b)/2
# (sprite base, lane, dir, start c of footprint centre)
SE=[('sedan_red',0),('gojek',4),('taxi_bluebird',7.5),('sma_triple',12),('hatchback_orange',15.5),('maxim',19.5)]
NW=[('bus_transjakarta',2),('maxim_pax',7),('sedan_teal',10.5),('mpv_silver',14.5),('gojek_pax',17.3),('van_cream',20.2)]
cast=[(n,33.05,'se',c0) for n,c0 in SE]+[(n,34.85,'nw',c0) for n,c0 in NW if n]
spr={k:Image.open(OUT+'/'+v['file']).convert('RGBA') for k,v in man.items()}
frames=[]
for f in range(N):
    fr=bg.copy(); items=[]
    for n,lane,dr,c0 in cast:
        c=((c0+(SP*f if dr=='se' else -SP*f))%LOOP)-5
        r=foot(n,lane); key=f'{n}_{dr}'; m=man[key]; px,py=m['pivot_footprint_centre']
        x,y=S(c,r); items.append(((r,c),spr[key],(x-px,y-py)))
    for _,im,pos in sorted(items,key=lambda t:t[0]): fr.alpha_composite(im,pos)
    frames.append(fr)
s4=[fr.resize((W*4,H*4),Image.NEAREST).convert('RGB').quantize(colors=255,method=Image.MEDIANCUT,dither=Image.Dither.NONE) for fr in frames]
s4[0].save(OUT+'/previews/street_scene_4x.gif',save_all=True,append_images=s4[1:],duration=80,loop=0,optimize=True)
frames[20].resize((W*4,H*4),Image.NEAREST).save(OUT+'/previews/street_scene_4x_frame.png')
print(W,H)
