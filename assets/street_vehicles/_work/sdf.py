"""Tiny SDF ray-marcher -> 1x iso pixel sprites in the game's 2:1 projection.
World px units: c,r (32 per tile), h (1 px). Screen: sx=c-r, sy=(c+r)/2-h. Viewer along +(1,1,1).
Local model frame: x forward, y left, z up."""
import numpy as np
from PIL import Image

def V(*a): return np.array(a, float)
def length(a): return np.sqrt((a*a).sum(-1))

# ---------- primitives (p: (N,3) local) ----------
def sd_sphere(p, c, r): return length(p-c)-r
def sd_ellip(p, c, rad):
    q=(p-c)/rad; k0=length(q); k1=length(q/rad); return k0*(k0-1)/np.maximum(k1,1e-6)
def sd_capsule(p, a, b, r):
    pa=p-a; ba=b-a; h=np.clip((pa@ba)/(ba@ba),0,1); return length(pa-h[:,None]*ba)-r
def sd_rcone(p,a,b,ra,rb):
    pa=p-a; ba=b-a; h=np.clip((pa@ba)/(ba@ba),0,1); return length(pa-h[:,None]*ba)-(ra+(rb-ra)*h)
def sd_rbox(p, c, half, rr=0):
    q=np.abs(p-c)-(np.asarray(half)-rr); return length(np.maximum(q,0))+np.minimum(q.max(-1),0)-rr
def sd_cyl_y(p, c, R, hw, rr=0.8):  # axis along local y
    q=p-c; d=np.stack([np.sqrt(q[:,0]**2+q[:,2]**2)-R+rr, np.abs(q[:,1])-hw+rr],-1)
    return np.minimum(d.max(-1),0)+length(np.maximum(d,0))-rr
def sd_cyl_x(p,c,R,hw,rr=0.6):
    q=p-c; d=np.stack([np.sqrt(q[:,1]**2+q[:,2]**2)-R+rr, np.abs(q[:,0])-hw+rr],-1)
    return np.minimum(d.max(-1),0)+length(np.maximum(d,0))-rr
def sd_poly(x, z, Vs):
    Vs=np.asarray(Vs,float); n=len(Vs)
    d=(x-Vs[0,0])**2+(z-Vs[0,1])**2; s=np.ones_like(x)
    j=n-1
    for i in range(n):
        ex,ez=Vs[j]-Vs[i]; wx=x-Vs[i,0]; wz=z-Vs[i,1]
        t=np.clip((wx*ex+wz*ez)/(ex*ex+ez*ez),0,1); bx=wx-ex*t; bz=wz-ez*t
        d=np.minimum(d,bx*bx+bz*bz)
        c1=z>=Vs[i,1]; c2=z<Vs[j,1]; c3=ex*wz>ez*wx
        flip=(c1&c2&c3)|(~c1&~c2&~c3); s=np.where(flip,-s,s); j=i
    return s*np.sqrt(d)
def sd_extrude(p, poly, hw, rr=2.0, tumble=0.0, z0=0.0):
    d2=sd_poly(p[:,0],p[:,2],poly)
    w=hw-tumble*np.maximum(p[:,2]-z0,0)
    q=np.stack([d2+rr, np.abs(p[:,1])-w+rr],-1)
    return np.minimum(q.max(-1),0)+length(np.maximum(q,0))-rr
def smin(a,b,k):
    h=np.clip(0.5+0.5*(b-a)/k,0,1); return b*(1-h)+a*h-k*h*(1-h)

# ---------- scene ----------
class Model:
    """parts: list of (name, fn(p)->d). mat(p_local, n_local, part_name, extra) -> material key (+tone shift)"""
    def __init__(s): s.parts=[]; s.groups={}
    def add(s,name,fn): s.parts.append((name,fn)); return s
    def eval(s,p):
        ds=np.stack([f(p) for _,f in s.parts],-1); i=ds.argmin(-1); return ds[np.arange(len(p)),i], i

DIRS={ # forward and left as (c,r) unit vectors
 'se':((1,0),(0,-1)), 'nw':((-1,0),(0,1)), 'sw':((0,1),(1,0)), 'ne':((0,-1),(-1,0)) }

def to_local(pw, d, origin):
    f,l=DIRS[d]; q=pw-origin
    return np.stack([q[:,0]*f[0]+q[:,1]*f[1], q[:,0]*l[0]+q[:,1]*l[1], q[:,2]],-1)
def vec_to_world(nl, d):
    f,l=DIRS[d]
    return np.stack([nl[:,0]*f[0]+nl[:,1]*l[0], nl[:,0]*f[1]+nl[:,1]*l[1], nl[:,2]],-1)

LIGHT=V(0.30,0.75,1.0); LIGHT/=np.linalg.norm(LIGHT)

def render(model, d, half_len, half_wid, height, shadow_rr=None, matfn=None, ramps=None, pad=3, shadow_extra=2.0):
    """local bbox: x in [-half_len,half_len], y in [-half_wid,half_wid], z in [0,height].
    Local origin at footprint centre on the ground. Returns RGBA image, pivot of the local origin (px)."""
    # world origin = (0,0,0); corners
    xs=[-half_len,half_len]; ys=[-half_wid,half_wid]; zs=[0,height]
    corners=[]
    f,l=DIRS[d]
    for x in xs:
        for y in ys:
            for z in zs:
                c=x*f[0]+y*l[0]; r=x*f[1]+y*l[1]; corners.append((c-r,(c+r)/2-z))
    corners=np.array(corners)
    x0=int(np.floor(corners[:,0].min()))-pad; x1=int(np.ceil(corners[:,0].max()))+pad
    y0=int(np.floor(corners[:,1].min()))-pad; y1=int(np.ceil(corners[:,1].max()))+pad
    W=x1-x0; H=y1-y0
    sx,sy=np.meshgrid(np.arange(x0,x1)+0.5, np.arange(y0,y1)+0.5)
    sx=sx.ravel(); sy=sy.ravel(); N=len(sx)
    hh=np.full(N, height+half_len+half_wid+4.0)
    hit=np.zeros(N,bool); alive=np.ones(N,bool); hmin=-1.0
    S3=np.sqrt(3)
    for it in range(260):
        idx=np.where(alive)[0]
        if len(idx)==0: break
        h=hh[idx]; c=sy[idx]+h+sx[idx]/2; r=sy[idx]+h-sx[idx]/2
        pl=to_local(np.stack([c,r,h],-1),d,0)
        dist,_=model.eval(pl)
        hh[idx]=h-np.maximum(dist,0.05)/S3*0.9
        done=dist<0.08; hit[idx[done]]=True
        dead=(hh[idx]<hmin); alive[idx[done|dead]]=False
    # surface data
    idx=np.where(hit)[0]
    h=hh[idx]; c=sy[idx]+h+sx[idx]/2; r=sy[idx]+h-sx[idx]/2
    pl=to_local(np.stack([c,r,h],-1),d,0)
    _,part=model.eval(pl)
    e=0.35; nl=np.zeros_like(pl)
    for k in range(3):
        o=np.zeros(3); o[k]=e
        nl[:,k]=model.eval(pl+o)[0]-model.eval(pl-o)[0]
    nl/=np.maximum(length(nl)[:,None],1e-6)
    nw=vec_to_world(nl,d)
    lam=np.clip(nw@LIGHT,0,1)
    depth=np.full(N,np.inf); depth[idx]=-(c+r+h)  # smaller = nearer viewer
    names=[model.parts[i][0] for i in part]
    out=np.zeros((N,4),np.uint8)
    matk=np.empty(N,object); matk[:]=None
    tone=np.full(N,-1)
    # screen-reading sign for local +x on the visible side
    xsign=1 if (f[0]-f[1])>0 else -1
    info=dict(dir=d,xsign=xsign)
    for j,i in enumerate(idx):
        pass
    mats,toff=matfn(pl,nl,nw,np.array(names),lam,info)
    # tone from lambert
    t=np.where(lam>0.93,0,np.where(lam>0.66,1,np.where(lam>0.43,2,np.where(lam>0.12,3,4))))
    t=np.clip(t+toff,0,4)
    matk[idx]=mats; tone[idx]=t
    # edge darkening
    T=tone.reshape(H,W); M=matk.reshape(H,W); D=depth.reshape(H,W); hitm=np.isfinite(D)
    T2=T.copy()
    for yy in range(H):
        for xx in range(W):
            if not hitm[yy,xx]: continue
            m=M[yy,xx]; edge=False; dark3=False
            for dy,dx in ((0,1),(0,-1),(1,0),(-1,0)):
                y2,x2=yy+dy,xx+dx
                if y2<0 or x2<0 or y2>=H or x2>=W or not hitm[y2,x2]: edge=True; break
                if D[y2,x2] < D[yy,xx]-5 and M[y2,x2]==m: dark3=True
            if edge: T2[yy,xx]=4
            elif dark3: T2[yy,xx]=max(T2[yy,xx],3)
    img=np.zeros((H,W,4),np.uint8)
    for yy in range(H):
        for xx in range(W):
            if hitm[yy,xx]:
                ramp=ramps[M[yy,xx]]; col=ramp[min(T2[yy,xx],len(ramp)-1)]
                img[yy,xx,:3]=col; img[yy,xx,3]=255
    # flat shadow on ground: rounded rect of the footprint (local), alpha 56 black
    if shadow_rr is not None:
        hl,hwid,rr=shadow_rr
        for yy in range(H):
            for xx in range(W):
                if img[yy,xx,3]: continue
                gx=sx.reshape(H,W)[yy,xx]; gy=sy.reshape(H,W)[yy,xx]
                c=gy+gx/2; r=gy-gx/2
                q=to_local(np.array([[c,r,0.0]]),d,0)[0]
                dd=sd_rbox(np.array([[q[0],q[1],0]]),V(0,0,0),(hl+shadow_extra,hwid+shadow_extra*0.5,1),rr)[0]
                if dd<0: img[yy,xx]=(0,0,0,56)
    pivot=(-x0, -y0)  # screen pos of local origin (0,0,0)
    return Image.fromarray(img,'RGBA'), pivot

def hexrgb(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
def rgbhex(c): return '#%02X%02X%02X'%tuple(int(v) for v in c)
def mix(a,b,t): return tuple(round(a[i]*(1-t)+b[i]*t) for i in range(3))
def ramp5(top,mid,dark,hi=None,edge=None):
    T,Mi,D=hexrgb(top),hexrgb(mid),hexrgb(dark)
    H=hexrgb(hi) if hi else mix(T,(255,255,255),0.35)
    E=hexrgb(edge) if edge else tuple(round(v*0.62) for v in D)
    return [H,T,Mi,D,E]
