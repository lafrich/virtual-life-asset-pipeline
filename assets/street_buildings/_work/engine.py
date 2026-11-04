# street_buildings engine: exact-pixel iso 2:1 renderer with per-pixel depth, material ramps, v6b shading.
import numpy as np, json, re
from PIL import Image, ImageDraw
SRC=open('game/index_extract.txt').read()
PXF=json.loads(re.search(r'const PXF=(\{.*?\});',SRC).group(1))
def hx(h): h=h.lstrip('#'); return (int(h[0:2],16),int(h[2:4],16),int(h[4:6],16))
M=[]; MI={}
def mat(name,hexes):
    MI[name]=len(M); M.append([hx(h) for h in hexes])
R5=lambda *a:list(a)
mat('WHITE',R5('#8D97A8','#C7CFDC','#D2D5D9','#E7EBF2','#FFFFFF'))
mat('CREAM',R5('#9B866F','#C3AD8D','#D4C8AE','#E8DEC6','#F4EBDA'))
mat('CONC',R5('#535969','#788197','#8D97A8','#A7B2C4','#C7CFDC'))
mat('DARK',R5('#15151F','#1C2330','#2A3242','#3A4458','#5A6577'))
mat('GLASS',R5('#1C2330','#2E3B52','#4F6A86','#7A9FB2','#BFD8E4'))
mat('OGLASS',R5('#1C2330','#2E3B52','#3371A7','#8ECDEB','#CEDBFF'))
mat('WARM',R5('#B07A1C','#F2B530','#FFD166','#FFE27A','#FFF0C8'))
mat('RED',R5('#7A2E35','#B8323A','#E0434A','#FF5A5F','#FF8AA2'))
mat('YEL',R5('#6B5320','#B07A1C','#F2B530','#FFC93C','#FFE27A'))
mat('BLUE',R5('#1A3F87','#2457B8','#2C6BD8','#3F7FE0','#86CCFF'))
mat('DOOR',R5('#1D5E80','#2479CC','#3AA6F2','#86CCFF','#CEDBFF'))
mat('GREEN',R5('#1A6A3A','#22894A','#2A9A52','#4FB36B','#86E59A'))
mat('GRASS',R5('#1A6A3A','#22894A','#2A9E52','#4FB36B','#86E59A'))
mat('TEAL',R5('#154E4B','#1F7A55','#22984C','#35C46A','#86E59A'))
mat('GOLD',R5('#6B5320','#B07A1C','#C99A2E','#E0A526','#FFD166'))
mat('TERRA',R5('#6B4F3A','#9A6A3E','#C9692F','#E8894A','#F2A066'))
mat('SENG',R5('#535969','#766B59','#9D9A91','#B8B2A8','#D4C8AE'))
mat('WOOD',R5('#3D2A1E','#6B4F3A','#94704F','#B48455','#D49A5E'))
mat('PAVE',R5('#9EA3A9','#B4B8BE','#C8CCD1','#D2D5D9','#E1E3E6'))
mat('ASPH',R5('#2A3242','#404857','#4A5362','#596373','#8D97A8'))
mat('GANG',R5('#535969','#766B59','#9D9A91','#B8B2A8','#C8BC9F'))
mat('TARPB',R5('#1A3F87','#2479CC','#3AA6F2','#86CCFF','#A9D6F5'))
mat('ORANGE',R5('#9A6A3E','#D9682A','#FF9440','#FFB394','#FFD0A8'))
mat('PINK',R5('#BE2F56','#EE4D72','#FF8AA2','#FFC2B8','#FFDDBE'))
mat('PURP',R5('#2A2438','#4C4868','#5B67AF','#7C95FF','#BAC5E7'))
mat('SKIN',R5('#3D2A1E','#8A5A3C','#D9A47E','#F1D3B5','#FFDDBE'))
mat('BAGK',R5('#15151F','#2A2438','#3B3752','#4C4868','#788197'))
mat('CARD',R5('#6B4F3A','#9A6A3E','#B48455','#D49A5E','#F0C08A'))
mat('FBLUE',R5('#535969','#788197','#A7B2C4','#BAC5E7','#CEDBFF'))
mat('FTEAL',R5('#2A5266','#3D7A80','#6FA9A9','#9CE6DE','#B2EEE7'))
mat('FPINK',R5('#9B866F','#E8B48C','#EABED1','#FFC2B8','#FFDDBE'))
mat('FYEL',R5('#9B866F','#C8BC9F','#F0C08A','#FFE7A8','#FAF3E5'))
mat('LITE',R5('#A7B2C4','#E7EBF2','#F4F1EA','#FAF3E5','#FFFFFF'))
mat('LAMPR',R5('#7A2E35','#B8323A','#E0434A','#FF5A5F','#FFC2B8'))
mat('LAMPG',R5('#154E4B','#1F7A55','#35C46A','#86E59A','#B3EBC4'))
mat('OFF',R5('#0B0E13','#15151F','#1C2330','#2A3242','#3A4458'))
mat('SOIL',R5('#3D2A1E','#6B4F3A','#766B59','#9B866F','#C3AD8D'))
mat('WATER',R5('#1C2330','#2A3242','#3A4458','#535969','#788197'))

class Tex:
    """face texture; u left->right, v bottom->top (v=0 is z0)"""
    def __init__(s,W,H,m,t=3):
        # Heights from curved leaves can be fractional; raster textures need integer dimensions.
        W,H=max(1,int(round(W))),max(1,int(round(H)))
        s.W,s.H=W,H; s.m=np.full((H,W),MI[m] if isinstance(m,str) else m,np.int16); s.t=np.full((H,W),t,np.int8); s.g=np.zeros((H,W),bool)
    def rect(s,u0,v0,u1,v1,m,t,glow=False):
        u0,u1=max(0,int(u0)),min(s.W,int(u1)); v0,v1=max(0,int(v0)),min(s.H,int(v1))
        if u1<=u0 or v1<=v0: return s
        if m=='CLEAR': s.m[v0:v1,u0:u1]=-1
        elif m is not None: s.m[v0:v1,u0:u1]=MI[m]
        if t is not None: s.t[v0:v1,u0:u1]=t
        s.g[v0:v1,u0:u1]=glow; return s
    def tone_add(s,u0,v0,u1,v1,d):
        u0,u1=max(0,int(u0)),min(s.W,int(u1)); v0,v1=max(0,int(v0)),min(s.H,int(v1))
        if u1>u0 and v1>v0: s.t[v0:v1,u0:u1]=np.clip(s.t[v0:v1,u0:u1]+d,0,4)
        return s
    def px(s,u,v,m,t,glow=False):
        if 0<=u<s.W and 0<=v<s.H: s.m[v,u]=MI[m]; s.t[v,u]=t; s.g[v,u]=glow
    def text(s,u,v,txt,m,t,sc=1,glow=False,center=True,bold=False):
        pts,w=text_mask(txt)
        W=w*sc+(1 if bold else 0)
        u0=int(u-W/2) if center else int(u)
        for (i,j) in pts:
            for a in range(sc+(1 if bold else 0)):
                for b in range(sc):
                    s.px(u0+i*sc+a,int(v)+(4-j)*sc+b,m,t,glow)
        s.lastw=W; return s
def text_mask(t):
    t=t.upper(); pts=set(); x=0
    for ch in t:
        g=PXF.get(ch,PXF.get('?'))
        for j in range(5):
            for i in range(len(g[0])):
                if g[j][i]=='#': pts.add((x+i,j))
        x+=len(g[0])+1
    return pts,max(0,x-1)

def q(v): return round(v*16)/16

class Spr:
    def __init__(s,W,H,ox,oy):
        s.W,s.H,s.ox,s.oy=W,H,ox,oy
        s.m=np.full((H,W),-1,np.int16); s.t=np.zeros((H,W),np.int8); s.d=np.full((H,W),-1e9,np.float32)
        s.g=np.zeros((H,W),bool); s.gr=np.zeros((H,W),bool); s.sh=np.zeros((H,W),np.uint8)
    def X(s,c,r): return s.ox+int(round((c-r)*32))
    def Y(s,c,r): return s.oy+int(round((c+r)*16))
    def _put(s,xs,ys,ms,ts,ds,gs,ground=False):
        ok=(xs>=0)&(xs<s.W)&(ys>=0)&(ys<s.H)&(ms>=0)
        xs,ys,ms,ts,ds,gs=xs[ok],ys[ok],ms[ok],ts[ok],ds[ok],gs[ok]
        o=np.argsort(ds,kind='stable'); xs,ys,ms,ts,ds,gs=xs[o],ys[o],ms[o],ts[o],ds[o],gs[o]
        win=ds>=s.d[ys,xs]-1e-5
        xs,ys=xs[win],ys[win]
        s.m[ys,xs]=ms[win]; s.t[ys,xs]=np.clip(ts[win],0,4); s.d[ys,xs]=ds[win]; s.g[ys,xs]=gs[win]; s.gr[ys,xs]=ground
    # vertical face along +c at r (visible sw face)
    def face_sw(s,c0,c1,r,z0,z1,tex,shift=0,dep=0.0):
        c0,c1,r=q(c0),q(c1),q(r); XL=s.X(c0,r); YL=s.Y(c0,r); W=s.X(c1,r)-XL; H=z1-z0
        if W<=0 or H<=0: return
        U,V=np.meshgrid(np.arange(W),np.arange(H)); lower=YL+1+U//2
        ys=lower-1-(z0+V); xs=XL+U
        tm=tex.m[:H,:W] if tex.W>=W and tex.H>=H else np.pad(tex.m,((0,max(0,H-tex.H)),(0,max(0,W-tex.W))),mode='edge')[:H,:W]
        tt=tex.t if tex.W>=W and tex.H>=H else np.pad(tex.t,((0,max(0,H-tex.H)),(0,max(0,W-tex.W))),mode='edge')
        tg=tex.g if tex.W>=W and tex.H>=H else np.pad(tex.g,((0,max(0,H-tex.H)),(0,max(0,W-tex.W))),mode='edge')
        ds=c0+(U+0.5)/32+r+(z0+V)/32+dep
        s._put(xs.ravel(),ys.ravel(),tm.ravel(),(tt[:H,:W]+shift).ravel(),ds.ravel().astype(np.float32),tg[:H,:W].ravel())
    # vertical face along -r at c (visible se face); u=0 at r1 (front corner)
    def face_se(s,r0,r1,c,z0,z1,tex,shift=-1,dep=0.0):
        r0,r1,c=q(r0),q(r1),q(c); XB=s.X(c,r1); XR=s.X(c,r0); YR=s.Y(c,r0); W=XR-XB; H=z1-z0
        if W<=0 or H<=0: return
        U,V=np.meshgrid(np.arange(W),np.arange(H)); x=XB+U; lower=YR+1+(XR-1-x)//2
        ys=lower-1-(z0+V)
        pad=lambda a:(a if a.shape[0]>=H and a.shape[1]>=W else np.pad(a,((0,max(0,H-a.shape[0])),(0,max(0,W-a.shape[1]))),mode='edge'))[:H,:W]
        ds=c+r1-(U+0.5)/32+(z0+V)/32+dep
        s._put(x.ravel(),ys.ravel(),pad(tex.m).ravel(),(pad(tex.t)+shift).ravel(),ds.ravel().astype(np.float32),pad(tex.g).ravel())
    def _span(s,c0,r0,c1,r1):
        XL,YL=s.X(c0,r1),s.Y(c0,r1); XR,YR=s.X(c1,r0),s.Y(c1,r0)
        x=np.arange(XL,XR); xr=XR-1-x
        up=np.maximum(YL-1-(x-XL)//2,YR-1-xr//2); lo=np.minimum(YL+1+(x-XL)//2,YR+1+xr//2)
        return x,up,lo
    # horizontal surface at height z; fn(c,r)->(mid array,tone array) or a (mat,tone)
    def top(s,c0,r0,c1,r1,z,fn,shift=1,ground=False,glow=False,dep=0.0):
        c0,r0,c1,r1=q(c0),q(r0),q(c1),q(r1)
        x,up,lo=s._span(c0,r0,c1,r1)
        if len(x)==0: return
        hmax=int((lo-up).max());
        if hmax<=0: return
        X_,K=np.meshgrid(x,np.arange(hmax)); Y_=up[None,:]+K; ok=Y_<lo[None,:]
        X_,Y_=X_[ok],Y_[ok]
        sx=(X_+0.5-s.ox)/32; ty=(Y_+0.5-s.oy)/16; cc=(sx+ty)/2; rr=(ty-sx)/2
        if callable(fn): mm,tt=fn(cc,rr)
        else: mm=np.full(cc.shape,MI[fn[0]],np.int16); tt=np.full(cc.shape,fn[1],np.int8)
        ds=(cc+rr+z/32+dep).astype(np.float32)
        gl=np.full(cc.shape,glow) if not isinstance(glow,np.ndarray) else glow
        s._put(X_,Y_-z,np.asarray(mm,np.int16),np.asarray(tt,np.int8)+shift,ds,gl,ground)
    def box(s,c0,r0,c1,r1,z0,z1,m,t=3,sw=None,se=None,topf=None,tshift=1,dep=0.0,glow=False):
        c0,r0,c1,r1=q(c0),q(r0),q(c1),q(r1)
        z0,z1=int(round(z0)),int(round(z1))
        if z1<=z0:return
        Wsw=s.X(c1,r1)-s.X(c0,r1); Wse=s.X(c1,r0)-s.X(c1,r1); H=z1-z0
        if sw is None: sw=Tex(max(1,Wsw),max(1,H),m,t)
        if se is None: se=Tex(max(1,Wse),max(1,H),m,t)
        if glow: sw.g[:]=True; se.g[:]=True
        if callable(sw): sw=sw(Wsw,H)
        if callable(se): se=se(Wse,H)
        s.face_sw(c0,c1,r1,z0,z1,sw,0,dep); s.face_se(r0,r1,c1,z0,z1,se,-1,dep)
        s.top(c0,r0,c1,r1,z1,topf if topf is not None else (m,t),tshift,glow=glow,dep=dep)
    def slope(s,c0,r0,c1,r1,zf,fn,shift=0,inside=None):
        """surface z=zf(c,r) linear: zf=(a,b,d) z=a+b*c+d*r"""
        a,b,d=zf; XL=s.X(c0,r1); XR=s.X(c1,r0)
        zmax=max(a+b*c+d*r for c in (c0,c1) for r in (r0,r1)); ytop=s.Y(c0,r0)-int(zmax)-2; ybot=s.Y(c1,r1)+2
        X_,Y_=np.meshgrid(np.arange(XL,XR),np.arange(ytop,ybot)); X_=X_.ravel(); Y_=Y_.ravel()
        sx=(X_+0.5-s.ox)/32; yy=Y_+0.5-s.oy
        rr=(yy+a+b*sx-16*sx)/(32-b-d); cc=rr+sx
        ok=(cc>=c0)&(cc<c1)&(rr>=r0)&(rr<r1)
        if inside is not None: ok&=inside(cc,rr)
        X_,Y_,cc,rr=X_[ok],Y_[ok],cc[ok],rr[ok]; z=a+b*cc+d*rr
        mm,tt=fn(cc,rr,z) if callable(fn) else (np.full(cc.shape,MI[fn[0]],np.int16),np.full(cc.shape,fn[1],np.int8))
        s._put(X_,Y_,np.asarray(mm,np.int16),np.asarray(tt,np.int8)+shift,(cc+rr+z/32).astype(np.float32),np.zeros(cc.shape,bool))
    def shadow(s,pts_cr,dx=0):
        im=Image.new('L',(s.W,s.H),0); dr=ImageDraw.Draw(im)
        P=[(s.X(c,r),s.Y(c,r)) for c,r in pts_cr]
        hull=P+[(x+dx,y) for x,y in P]
        from math import atan2
        cx=sum(p[0] for p in hull)/len(hull); cy=sum(p[1] for p in hull)/len(hull)
        # convex hull
        pts=sorted(set(hull))
        def cross(o,a,b): return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
        lo=[];
        for p in pts:
            while len(lo)>=2 and cross(lo[-2],lo[-1],p)<=0: lo.pop()
            lo.append(p)
        hi=[]
        for p in reversed(pts):
            while len(hi)>=2 and cross(hi[-2],hi[-1],p)<=0: hi.pop()
            hi.append(p)
        dr.polygon(lo[:-1]+hi[:-1],fill=1)
        s.sh|=np.array(im,np.uint8)
    def ellipse_shadow(s,c,r,rx,ry,dx=0):
        im=Image.new('L',(s.W,s.H),0); dr=ImageDraw.Draw(im); x,y=s.X(c,r)+dx,s.Y(c,r)
        dr.ellipse([x-rx,y-ry,x+rx,y+ry],fill=1); s.sh|=np.array(im,np.uint8)
    def render(s,edges=True):
        op=s.m>=0
        t=s.t.astype(int).copy()
        # shadow falling on own ground surfaces -> one tone darker
        t[op&s.gr&(s.sh>0)]-=1
        if edges:
            right=np.zeros_like(op); right[:,:-1]=op[:,:-1]&~op[:,1:]; right[:,-1]=op[:,-1]
            below=np.zeros_like(op); below[:-1,:]=op[:-1,:]&~op[1:,:]; below[-1,:]=op[-1,:]
            e=(right|below)&~s.g
            t[e]-=1
        t=np.clip(t,0,4)
        out=np.zeros((s.H,s.W,4),np.uint8)
        pal=np.array([[c for c in r] for r in M],np.uint8)
        mm=np.where(op,s.m,0)
        out[...,:3]=pal[mm,t]; out[...,3]=np.where(op,255,0)
        shm=(~op)&(s.sh>0); out[shm]=(0,0,0,56)
        glow=np.zeros((s.H,s.W,4),np.uint8)
        gm=op&s.g
        glow[gm,:3]=pal[mm,np.clip(t+1,0,4)][gm]; glow[gm,3]=255
        # 1px halo alpha 90
        if gm.any():
            hm=gm.copy()
            for _ in range(2):
                h2=hm.copy(); h2[1:]|=hm[:-1]; h2[:-1]|=hm[1:]; h2[:,1:]|=hm[:,:-1]; h2[:,:-1]|=hm[:,1:]; hm=h2
            hm&=~gm
            # halo colour = nearest glow colour (shifted copies)
            col=glow.copy()
            for dy,dx in [(0,1),(0,-1),(1,0),(-1,0),(1,1),(-1,-1),(0,2),(0,-2),(2,0),(-2,0)]:
                sh=np.roll(np.roll(glow,dy,0),dx,1); f=(col[...,3]==0)&(sh[...,3]==255)
                col[f]=sh[f]
            glow[hm,:3]=col[hm,:3]; glow[hm,3]=90
        return out,glow
def crop(img,glow,pivot):
    a=np.maximum(img[...,3],glow[...,3]); ys,xs=np.nonzero(a)
    y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    # keep even width centred-ish: just crop, pivot adjusts
    if (x1-x0)%2: x1+=1
    if (y1-y0)%2: y1+=1
    return img[y0:y1,x0:x1],glow[y0:y1,x0:x1],(pivot[0]-x0,pivot[1]-y0)

    # (Spr) arbitrary sampled points
def points(s,c,r,z,m,t,glow=False):
    c=np.asarray(c,float).ravel(); r=np.asarray(r,float).ravel(); z=np.asarray(z,float).ravel()
    x=np.floor(s.ox+(c-r)*32).astype(int); y=np.floor(s.oy+(c+r)*16-z).astype(int)
    mm=np.broadcast_to(np.asarray(m if not isinstance(m,str) else MI[m],np.int16),c.shape).copy()
    tt=np.broadcast_to(np.asarray(t,np.int8),c.shape).copy()
    gg=np.broadcast_to(np.asarray(glow,bool),c.shape).copy()
    s._put(x,y,mm,tt,(c+r+z/32).astype(np.float32),gg)
Spr.points=points
LIGHT=np.array([-0.55,0.35,0.76]); LIGHT=LIGHT/np.linalg.norm(LIGHT)   # world (c,r,z-up): light from screen-left and above
def shade_n(n,base=3):
    d=n@LIGHT
    return np.clip(np.round(base-1+d*2.2),0,4).astype(np.int8)
def dome(s,c,r,z0,rad,h,m,base=3,glow=False,onion=0.0):
    th=np.linspace(0,np.pi/2,int(h*6+60)); ph=np.linspace(0,2*np.pi,int(rad*32*14+80),endpoint=False)
    T,Pp=np.meshgrid(th,ph); prof=np.cos(T)*(1+onion*np.sin(2*T))
    cc=c+rad*prof*np.cos(Pp); rr=r+rad*prof*np.sin(Pp); zz=z0+h*np.sin(T)
    # gradient-space normal (tiles,tiles,px), cull faces turned away from the view ray (1,1,32)
    gn=np.stack([np.cos(T)*np.cos(Pp)/rad,np.cos(T)*np.sin(Pp)/rad,np.sin(T)*32/h],-1)
    vis=(gn@np.array([1,1,1.0]))>-0.02
    n=gn/np.linalg.norm(gn,axis=-1,keepdims=True)
    s.points(cc[vis],rr[vis],zz[vis],m,shade_n(n[vis].reshape(-1,3),base),glow)
def cyl(s,c,r,z0,z1,rad,m,base=3,glow=False,tf=None):
    ph=np.linspace(0,2*np.pi,int(rad*32*14+60),endpoint=False); zz=np.arange(z0,z1,0.5)
    P_,Z=np.meshgrid(ph,zz); cc=c+rad*np.cos(P_); rr=r+rad*np.sin(P_)
    n=np.stack([np.cos(P_),np.sin(P_),np.zeros_like(P_)],-1)
    t=shade_n(n.reshape(-1,3),base)
    mm=np.full(cc.size,MI[m],np.int16)
    if tf is not None: mm,t=tf(P_.ravel(),Z.ravel(),mm,t)
    s.points(cc,rr,Z,mm,t,glow)
    # cap
    rr_=np.linspace(0,rad,int(rad*64)+2); P2,R2=np.meshgrid(ph,rr_)
    s.points(c+R2*np.cos(P2),r+R2*np.sin(P2),np.full(P2.shape,z1-0.5),m,base+1,glow)
Spr.dome=dome; Spr.cyl=cyl

class Loc:
    """local building frame: a along facade (left->right), b depth (0=facade, + = back), facade faces the viewer.
    ori 'sw': facade on the sw face (lit). ori 'se': facade on the se face (shadow side)."""
    def __init__(s,spr,ori,W,D,c0=0.0,r0=0.0):
        s.s,s.o,s.W,s.D,s.c0,s.r0=spr,ori,W,D,c0,r0; s.flip=False
    def cr(s,a,b):
        if s.flip: b=s.D-b
        if s.o=='sw': return s.c0+a, s.r0+s.D-b
        return s.c0+s.D-b, s.r0+s.W-a
    def ab(s,c,r):
        if s.o=='sw': a,b= c-s.c0, s.D-(r-s.r0)
        else: a,b= s.W-(r-s.r0), s.D-(c-s.c0)
        return (a,s.D-b) if s.flip else (a,b)
    def rect(s,a0,b0,a1,b1):
        if s.flip: b0,b1=s.D-b1,s.D-b0
        if s.o=='sw': return s.c0+a0, s.r0+s.D-b1, s.c0+a1, s.r0+s.D-b0
        return s.c0+s.D-b1, s.r0+s.W-a1, s.c0+s.D-b0, s.r0+s.W-a0
    def _tf(s,f):
        if f is None or not callable(f): return f
        def g(c,r):
            a,b=s.ab(c,r); return f(a,b)
        return g
    def box(s,a0,b0,a1,b1,z0,z1,m,t=3,front=None,side=None,topf=None,glow=False,dep=0.0):
        c0,r0,c1,r1=s.rect(a0,b0,a1,b1)
        if s.flip: front=None
        if s.o=='sw': s.s.box(c0,r0,c1,r1,z0,z1,m,t,sw=front,se=side,topf=s._tf(topf),glow=glow,dep=dep)
        else: s.s.box(c0,r0,c1,r1,z0,z1,m,t,sw=side,se=front,topf=s._tf(topf),glow=glow,dep=dep)
    def top(s,a0,b0,a1,b1,z,f,ground=False,shift=1):
        c0,r0,c1,r1=s.rect(a0,b0,a1,b1); s.s.top(c0,r0,c1,r1,z,s._tf(f),shift,ground=ground)
    def front(s,a0,a1,b,z0,z1,tex,dep=0.0):
        """a flat face parallel to the facade at depth b (e.g. sign, window inset)"""
        if s.flip: b=s.D-b
        if s.o=='sw': s.s.face_sw(s.c0+a0,s.c0+a1,s.r0+s.D-b,z0,z1,tex,0,dep)
        else: s.s.face_se(s.r0+s.W-a1,s.r0+s.W-a0,s.c0+s.D-b,z0,z1,tex,-1,dep)
    def side(s,b0,b1,a,z0,z1,tex,dep=0.0):
        """face perpendicular to facade at a (visible end): sw-variant shows right ends (a=W side), se shows left ends"""
        if s.flip: b0,b1=s.D-b1,s.D-b0
        if s.o=='sw': s.s.face_se(s.r0+s.D-b1,s.r0+s.D-b0,s.c0+a,z0,z1,tex,-1,dep)
        else: s.s.face_sw(s.c0+s.D-b1,s.c0+s.D-b0,s.r0+s.W-a,z0,z1,tex,0,dep)
    def pts(s,a,b,z,m,t,glow=False):
        a=np.asarray(a,float); b=np.asarray(b,float); c,r=s.cr(a,b); s.s.points(c,r,z,m,t,glow)
    def gable(s,a0,b0,a1,b1,ze,zr,m,fnab=None,shiftF=None,shiftB=None):
        """gable roof, ridge parallel to facade at b mid; eave z ze, ridge zr"""
        bm=(b0+b1)/2; k=(zr-ze)/(bm-b0)
        sF=(0 if s.o=='sw' else -1) if shiftF is None else shiftF; sB=(-1 if s.o=='sw' else 0) if shiftB is None else shiftB
        def F(c,r,z):
            a,b=s.ab(c,r)
            if fnab: return fnab(a,b,z)
            return np.full(a.shape,MI[m],np.int16),np.full(a.shape,3,np.int8)
        for (bb0,bb1,sgn,sh) in [(b0,bm,1,sF),(bm,b1,-1,sB)]:
            c0,r0,c1,r1=s.rect(a0,bb0,a1,bb1)
            # z = ze + k*(b-b0) (front) ; z = ze + k*(b1-b) (back) ; express b in c/r
            if s.o=='sw':   # b = D - (r-r0)
                base=s.r0+s.D
                if sgn>0: zf=(ze+k*(base-b0),0.0,-k)
                else: zf=(ze+k*(b1-base),0.0,k)
            else:           # b = D - (c-c0)
                base=s.c0+s.D
                if sgn>0: zf=(ze+k*(base-b0),-k,0.0)
                else: zf=(ze+k*(b1-base),k,0.0)
            s.s.slope(c0,r0,c1,r1,zf,F,shift=sh)
        # gable end triangle on the visible end
        return k
