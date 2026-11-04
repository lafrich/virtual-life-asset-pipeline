# Kebon Sirih vegetation preview sprites: procedural pixel art at 1x (iso 2:1, 64x32 tile, PPU 2)
import numpy as np, random, math
from PIL import Image, ImageDraw

def hx(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))
# 5-tone ramps, darkest -> lightest. Existing game/style-sheet hexes reused where possible.
R = {
 'cendana': ['#46523B','#65734B','#84945C','#A4B473','#C1CD8A'],
 'ulin': ['#123B32','#1D5445','#2D7055','#408563','#659F75'],
 'eboni': ['#102C2B','#183F36','#235345','#376953','#56836A'],
 'tengkawang': ['#204532','#316745','#468552','#65A260','#90B775'],
 'meranti': ['#153E30','#215944','#347451','#4E9460','#77B077'],
 'bark_ulin': ['#2C2928','#413830','#5C493A','#785C44','#9C7953'],
 'bark_eboni': ['#25282A','#37383A','#504843','#6A584C','#846C59'],
 'leaf':   ['#134F2E','#1A6A3A','#22894A','#2A9E52','#4FB36B'],   # game greens; tone 3 = lawn #2A9E52 so shrubs tie into the grass
 'dark':   ['#0F3F26','#155232','#1A6A3A','#22894A','#3FA45E'],   # mahoni, beringin, glodokan
 'asam':   ['#18492C','#1F5F35','#2A7A3E','#3C944B','#62B061'],   # tamarind: olive-dark fine foliage
 'fresh':  ['#2B6A2C','#3C8834','#55A23E','#78BE4E','#A3D66A'],   # ketapang kencana, flamboyan leaves
 'saman':  ['#1A5E32','#23803F','#2F9A48','#4DB35A','#84CB6C'],   # trembesi
 'kiara':  ['#124A2B','#1A6338','#237F45','#31A055','#58BD6B'],
 'bark':   ['#3D2A1E','#4F3727','#6B4F3A','#8A5E3C','#A87C55'],   # walnut ramp + game trunk #8A5E3C
 'barkg':  ['#4A4038','#5E5347','#766B59','#9B866F','#B8A68A'],   # warm grey bark (angsana, flamboyan, tabebuya)
 'palm':   ['#6E6658','#8F8574','#AFA592','#CFC6B4','#E3DCCD'],   # royal palm column: warm light grey (gallery_mid #CFC6B4)
 'grass':  ['#1A6A3A','#22894A','#279249','#2A9E52','#4FB36B'],   # street lawn #2A9E52 / #279249
 'flam':   ['#8E2A1C','#B8381F','#E0522B','#FF7A3D','#FFA25C'],   # flamboyan flowers
 'tabeb':  ['#8A6A0C','#B88C0E','#E7B416','#FFD43B','#FFE27A'],   # tabebuya kuning (game guide-strip yellows)
 'bungur': ['#3E2B57','#5B3F73','#7A5BB0','#9C7FD6','#C4B0F0'],
 'bougv':  ['#6E1847','#9C2266','#C8327F','#E5559E','#F78CC0'],
 'ixora':  ['#7A1E22','#A82A2B','#D9442F','#F26B45','#FF9A6A'],
 'pucuk':  ['#6E1E24','#9E2A2B','#C93A3A','#E85A4A','#FF8A6A'],
 'yel':    ['#6B5320','#B07A1C','#E0A526','#F2B530','#FFD166'],   # brass/yellow ramp (stripes, bracts)
 'maroon': ['#3A1626','#5A1F33','#7A2E35','#9C3F4A','#C25C66'],   # andong merah (library oxblood family)
 'white':  ['#8D97A8','#A7B2C4','#C8CCD1','#E7EBF2','#FFFFFF'],
 'soil':   ['#4F3727','#6B4F3A','#766B59','#9B866F','#C3AD8D'],
 'dry':    ['#6B5A2E','#8C7A3E','#A8955A','#C3AD8D','#D4C8AE'],
 'stone':  ['#4E5668','#6B7487','#8C96A8','#A7B2C4','#C8CCD1'],
 'bamboo': ['#6B5320','#8C6E2A','#B48455','#C8A46A','#E0C48C'],
}
MATS = list(R.keys()); MID = {k:i for i,k in enumerate(MATS)}
SHADOW_A = 56; CONTACT_A = 90   # 2-level shadow: canopy/body projection 56, ground-contact 90

class Spr:
    def __init__(s, W=320, H=300, px=None, py=None, seed=1):
        s.W,s.H=W,H; s.px=W//2 if px is None else px; s.py=H-40 if py is None else py
        s.mat=np.full((H,W),-1,np.int16); s.tone=np.zeros((H,W),np.int8); s.rng=random.Random(seed)
        s.shadow=None; s.noedge=set()
        s.sh=[Image.new('L',(W,H),0),Image.new('L',(W,H),0)]   # [alpha56 mask, alpha90 mask]
    def sh_ell(s,cx,cy,rx,ry,lv=0):
        x=cx+s.px; y=cy+s.py; ImageDraw.Draw(s.sh[lv]).ellipse([x-rx,y-ry,x+rx,y+ry],fill=255)
    def sh_poly(s,pts,lv=0):
        ImageDraw.Draw(s.sh[lv]).polygon([(x+s.px,y+s.py) for x,y in pts],fill=255)
    def put(s,x,y,m,t):
        x=int(round(x))+s.px; y=int(round(y))+s.py
        if 0<=x<s.W and 0<=y<s.H:
            s.mat[y,x]=MID[m]; s.tone[y,x]=max(0,min(4,int(round(t))))
    def get(s,x,y):
        x=int(round(x))+s.px; y=int(round(y))+s.py
        if 0<=x<s.W and 0<=y<s.H: return s.mat[y,x]
        return -1
    def set_shadow(s,rx,ry=None,dx=0,contact=True):
        ry=ry or rx/2; s.shadow=(rx,ry,dx)
        s.sh_ell(dx+rx*0.28,1,rx,ry,0)                      # body/canopy shadow pushed right (light from the left)
        if contact: s.sh_ell(dx+1,0.5,max(2,rx*0.42),max(1.2,ry*0.5),1)   # dark contact patch under the trunk/stem

# ---------- primitives (coords relative to pivot, y up = negative) ----------
def disc_shaded(s,cx,cy,r,m,gl=0.0,ry=None,jit=0.35,rim=True,base=2.0):
    ry=ry or r; rng=s.rng
    for y in range(int(math.floor(cy-ry))-1,int(math.ceil(cy+ry))+1):
        for x in range(int(math.floor(cx-r))-1,int(math.ceil(cx+r))+1):
            dx=(x+0.5-cx)/r; dy=(y+0.5-cy)/ry; d=dx*dx+dy*dy
            if d>1: continue
            l=-(dx*0.62+dy*0.78)
            t=base+gl+l*1.55+rng.uniform(-jit,jit)
            if l>0.55 and d<0.55 and gl>-0.4: t+=0.8
            if rim and d>0.6 and (dx*0.55+dy*0.83)>0.3: t=min(t,0.6 if gl<0.6 else 1.2)
            s.put(x,y,m,t)

def ell_fill(s,cx,cy,rx,ry,m,t):
    for y in range(int(cy-ry)-1,int(cy+ry)+2):
        for x in range(int(cx-rx)-1,int(cx+rx)+2):
            if ((x+0.5-cx)/rx)**2+((y+0.5-cy)/ry)**2<=1: s.put(x,y,m,t)

def bez(p,t):
    if len(p)==2: (a,b),(c,d)=p; return a+(c-a)*t,b+(d-b)*t
    if len(p)==3:
        u=1-t; return (u*u*p[0][0]+2*u*t*p[1][0]+t*t*p[2][0], u*u*p[0][1]+2*u*t*p[1][1]+t*t*p[2][1])
    u=1-t; return (u**3*p[0][0]+3*u*u*t*p[1][0]+3*u*t*t*p[2][0]+t**3*p[3][0], u**3*p[0][1]+3*u*u*t*p[1][1]+3*u*t*t*p[2][1]+t**3*p[3][1])

def limb(s,pts,w0,w1,m,tb=2.0,bark=True,wfn=None):
    L=sum(math.dist(pts[i],pts[i+1]) for i in range(len(pts)-1)); n=max(4,int(L*2))
    for i in range(n+1):
        t=i/n; x,y=bez(pts,t); w=wfn(t) if wfn else w0+(w1-w0)*t; r=max(0.5,w/2)
        for yy in range(int(math.floor(y-r)),int(math.ceil(y+r))+1):
            for xx in range(int(math.floor(x-r)),int(math.ceil(x+r))+1):
                dx=(xx+0.5-x)/r; dy=(yy+0.5-y)/r
                if dx*dx+dy*dy>1.05: continue
                tt=tb-dx*1.35-dy*0.35
                if bark and ((xx*7+yy//3*13+int(xx*0.5)*5)%11==0): tt-=1   # fissure streaks
                s.put(xx,yy,m,tt)

def canopy(s,clumps,m,br=4.0,dens=1.0,gbox=None,droop=0,fill_t=1,jit=0.18,brr=0.0):
    """clumps: (cx,cy,rx,ry). Dark interior fill, then shaded leaf blobs painted bottom->top (scale look)."""
    rng=s.rng
    xs=[c[0]-c[2] for c in clumps]+[c[0]+c[2] for c in clumps]; ys=[c[1]-c[3] for c in clumps]+[c[1]+c[3] for c in clumps]
    x0,x1,y0,y1=gbox or (min(xs),max(xs),min(ys),max(ys))
    gx=lambda x:(x-(x0+x1)/2)/max(1,(x1-x0)/2); gy=lambda y:(y-(y0+y1)/2)/max(1,(y1-y0)/2)
    for cx,cy,rx,ry in clumps: ell_fill(s,cx,cy,rx*0.92,ry*0.9,m,fill_t)
    blobs=[]
    for cx,cy,rx,ry in clumps:
        step=br*1.15/dens
        yy=cy-ry
        while yy<=cy+ry:
            xx=cx-rx
            while xx<=cx+rx:
                px=xx+rng.uniform(-step*0.4,step*0.4); py=yy+rng.uniform(-step*0.3,step*0.3)
                if ((px-cx)/rx)**2+((py-cy)/ry)**2<=0.92:
                    blobs.append((px,py,br*rng.uniform(0.8,1.15)+brr*rng.random()))
                xx+=step
            yy+=step*0.8
    for cx,cy,rx,ry in clumps:   # project each clump onto the ground, shifted right with height
        s.sh_ell(cx*0.9+min(20,-cy*0.13)+rx*0.1,1+min(5,-cy*0.02),rx*1.0,rx*0.5,0)
    blobs.sort(key=lambda b:-b[1])
    for bx,by,r in blobs:
        g=-(gx(bx)*0.55+gy(by)*0.95)*0.9
        disc_shaded(s,bx,by,r,m,gl=g,ry=r*0.85,jit=jit)
    if droop:
        for cx,cy,rx,ry in clumps:
            for k in range(int(rx*0.9)):
                x=cx-rx*0.85+k*rx*1.7/max(1,int(rx*0.9)); yb=cy+ry*math.sqrt(max(0,1-((x-cx)/rx)**2))*0.92
                if rng.random()<0.55:
                    L=rng.randint(2,droop)
                    for j in range(L): s.put(x,yb+j,m,1 if j<L-1 else 2)
    return blobs

def flowers(s,blobs,m,frac=0.3,r=1.6,top_bias=True,cut=None):
    rng=s.rng
    for bx,by,_ in blobs:
        if cut is not None and by>cut: continue
        if rng.random()<frac: disc_shaded(s,bx+rng.uniform(-1.5,1.5),by+rng.uniform(-1.5,0.5),r*rng.uniform(0.8,1.25),m,gl=0.3,jit=0.4,rim=True)

def tuft_base(s,rx,ry,m='grass',blades=1.0,cx=0,cy=0):
    """grass skirt: lawn-coloured (tone 3 = #2A9E52) patch, darker towards the stem (contact),
    dissolving outer rim + outward blades so the plant sits IN the lawn"""
    rng=s.rng
    for y in range(int(cy-ry)-2,int(cy+ry)+3):
        for x in range(int(cx-rx)-3,int(cx+rx)+4):
            d=((x+0.5-cx)/rx)**2+((y+0.5-cy)/ry)**2
            dn=d+rng.uniform(-0.18,0.18)
            if dn>1.05: continue
            if dn>0.78 and rng.random()<0.45: continue          # dissolve into the lawn
            t=1 if dn<0.18 else 2 if dn<0.45 else 3
            if rng.random()<0.10: t=min(4,t+1)
            elif rng.random()<0.10: t=max(1,t-1)
            s.put(x,y,m,t)
    back=[];front=[]
    for _ in range(int(rx*ry*0.7*blades)+6):
        a=rng.uniform(0,2*math.pi); rr=math.sqrt(rng.random())*1.05
        x=cx+math.cos(a)*rx*rr; y=cy+math.sin(a)*ry*rr; (front if y>cy else back).append((x,y))
    return back,front

def blades(s,pts,m='grass',hmin=2,hmax=4):
    rng=s.rng
    for x,y in pts:
        h=rng.randint(hmin,hmax); lean=rng.choice([-1,0,0,1])
        for j in range(h):
            s.put(x+(lean if j==h-1 else 0),y-j,m,(4 if j==h-1 else 3 if j>0 else 2) if rng.random()<0.8 else 2)

def trunk_with_tuft(s,trunkfn,rx,ry,bl=1.0):
    s.sh_ell(1,0.5,rx*0.5,ry*0.55,1)
    back,front=tuft_base(s,rx,ry,blades=bl)
    blades(s,back); trunkfn(); blades(s,front)

def ground_overlap(s,band=14,p=0.6,hmax=4):
    g=MID['grass']; rng=s.rng
    for X in range(s.W):
        col=s.mat[:,X]
        ys=[Y for Y in range(max(0,s.py-band),min(s.H,s.py+band)) if col[Y]>=0 and col[Y]!=g]
        if not ys or rng.random()>p: continue
        Y=max(ys)+1; h=rng.randint(2,hmax)
        for j in range(h): s.put(X-s.px,Y-s.py-j,'grass',4 if j==h-1 else 3 if j>0 else 2)

# ---------- render ----------
def render(s,edge=True):
    H,W=s.H,s.W; mat=s.mat; tone=s.tone.copy()
    if edge:
        op=mat>=0
        def sh(a,dy,dx):
            o=np.zeros_like(a)
            ys=slice(max(0,dy),H+min(0,dy)); yd=slice(max(0,-dy),H+min(0,-dy))
            xs=slice(max(0,dx),W+min(0,dx)); xd=slice(max(0,-dx),W+min(0,-dx))
            o[yd,xd]=a[ys,xs]; return o
        right=~sh(op,0,1); down=~sh(op,1,0); left=~sh(op,0,-1); up=~sh(op,-1,0)
        gr=mat==MID['grass']
        dr=op&(right|down)&~gr; ul=op&(left|up)&~dr&~gr
        tone[dr]=0; tone[ul]=np.minimum(tone[ul],1)
    img=np.zeros((H,W,4),np.uint8)
    s56=np.array(s.sh[0])>0; s90=np.array(s.sh[1])>0
    gr=mat==MID['grass']                                   # shadows fall on the grass skirt as darker tones
    tone[gr&s56]=np.maximum(0,tone[gr&s56]-1); tone[gr&s90]=np.maximum(0,tone[gr&s90]-1)
    img[s56]=(0,0,0,SHADOW_A); img[s90]=(0,0,0,CONTACT_A)
    for i,k in enumerate(MATS):
        ramp=[hx(h) for h in R[k]]
        for t in range(5):
            sel=(mat==i)&(tone==t)
            if sel.any(): img[sel]=ramp[t]+(255,)
    im=Image.fromarray(img,'RGBA'); bb=im.getbbox()
    x0,y0,x1,y1=bb; x0-=1;y0-=1;x1+=1;y1+=1
    # keep pivot horizontally centred in an even-width canvas
    half=max(s.px-x0,x1-s.px); x0=s.px-half; x1=s.px+half
    im=im.crop((x0,y0,x1,y1)); return im,(s.px-x0,s.py-y0)
