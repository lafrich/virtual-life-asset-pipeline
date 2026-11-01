from engine import *
FH=90; GF=104   # px: upper floor height, ground floor height (avatar 86 px)
def gable_end(W,H,ze,zr,m,t=3,z0=0):
    """side texture for a gable end (u along depth), clears above the roof line"""
    tx=Tex(W,H,m,t)
    for u in range(W):
        f=min(u+0.5,W-u-0.5)/(W/2); top=ze+(zr-ze)*f-z0
        tx.m[int(max(0,np.ceil(top))):,u]=-1
    return tx
def pave(a,b,base=3,grid=0.75):
    ia=np.floor(a/grid).astype(int); ib=np.floor(b/grid).astype(int)
    fa=a/grid-ia; fb=b/grid-ib
    t=np.where((ia+ib)%2==0,base,base-1).astype(np.int8)
    t=np.where((fa<0.06)|(fb<0.06),base-2,t)
    return np.full(a.shape,MI['PAVE'],np.int16),t
def window(tx,u0,v0,w,h,glass='GLASS',frame='DARK',lit=False,sill='CONC',mull=True,t=2):
    tx.rect(u0-1,v0-1,u0+w+1,v0+h+1,frame,2)
    if lit:
        tx.rect(u0,v0,u0+w,v0+h,'WARM',3,glow=True); tx.rect(u0,v0+h-3,u0+w,v0+h,'WARM',4,glow=True)
    else:
        tx.rect(u0,v0,u0+w,v0+h,glass,t)
        for k in range(0,w+h,6):   # diagonal glints
            for d in range(2):
                uu=u0+k-d; vv=v0+h-1-(k%h if h else 0)
        tx.rect(u0+1,v0+h-3,u0+3,v0+h-1,glass,4)
    if mull and w>14: tx.rect(u0+w//2,v0,u0+w//2+1,v0+h,frame,2)
    if sill: tx.rect(u0-2,v0-3,u0+w+2,v0-1,sill,3)
def shelves(tx,u0,v0,w,h,seed=1):
    rng=np.random.default_rng(seed)
    tx.rect(u0,v0,u0+w,v0+h,'LITE',3,glow=True)
    cols=['RED','YEL','BLUE','TEAL','ORANGE','PINK','PURP']
    for vv in range(v0+4,v0+h-6,9):
        tx.rect(u0,vv,u0+w,vv+1,'CONC',2,glow=True)
        u=u0+1
        while u<u0+w-2:
            ww=int(rng.integers(2,4)); hh=int(rng.integers(3,7)); c=cols[int(rng.integers(len(cols)))]
            tx.rect(u,vv+1,u+ww,vv+1+hh,c,int(rng.integers(2,4)),glow=True); u+=ww+1
def glassdoor(tx,u0,w,h,frame='DARK',inside='LITE'):
    tx.rect(u0-1,0,u0+w+1,h+1,frame,2); tx.rect(u0,0,u0+w,h,inside,3,glow=True)
    tx.rect(u0+w//2,0,u0+w//2+1,h,frame,2); tx.rect(u0+w//2-3,h//2-4,u0+w//2-2,h//2+4,'CONC',4); tx.rect(u0+w//2+2,h//2-4,u0+w//2+3,h//2+4,'CONC',4)
def rolling_door(tx,u0,w,h,m='CONC',open_=0.0):
    tx.rect(u0,0,u0+w,h,m,3)
    for v in range(0,h,3): tx.rect(u0,v,u0+w,v+1,m,2)
    tx.rect(u0,h-4,u0+w,h,m,1)
def ac_unit(L,a,b,z):
    L.box(a,b,a+0.45,b+0.3,z,z+12,'WHITE',3); 
def toren(L,a,b,z,m='ORANGE'):
    c,r=L.cr(a,b); L.s.box(c-0.25,r-0.25,c+0.25,r+0.25,z,z+6,'CONC',2); L.s.cyl(c,r,z+6,z+26,0.32,m,3); L.s.dome(c,r,z+25,0.32,5,m,3)
def parapet(L,a0,b0,a1,b1,z,h=8,m='WHITE',t=3,cap=None,th=0.12):
    for (x0,y0,x1,y1) in [(a0,b0,a1,b0+th),(a0,b1-th,a1,b1),(a0,b0,a0+th,b1),(a1-th,b0,a1,b1)]:
        L.box(x0,y0,x1,y1,z,z+h,m,t)
def roof_flat(L,a0,b0,a1,b1,z,m='CONC',ph=8,pm='WHITE',seed=0):
    L.top(a0,b0,a1,b1,z,lambda a,b:(np.full(a.shape,MI[m],np.int16),np.where(((a*2)%1<0.05)|((b*2)%1<0.05),2,3).astype(np.int8)),shift=0)
    parapet(L,a0,b0,a1,b1,z,ph,pm)
def ground(L,a0,b0,a1,b1,f=None):
    L.top(a0,b0,a1,b1,0,f if f is not None else (lambda a,b:pave(a,b)),ground=True,shift=0)
def grass_ground(L,a0,b0,a1,b1,seed=3):
    def f(a,b):
        h=(np.floor(a*16).astype(int)*73856093^np.floor(b*16).astype(int)*19349663)%97
        t=np.where(h<9,3,np.where(h>90,1,2)).astype(np.int8); return np.full(a.shape,MI['GRASS'],np.int16),t
    L.top(a0,b0,a1,b1,0,f,ground=True,shift=0)
def bshadow(L,a0,b0,a1,b1,h):
    c0,r0,c1,r1=L.rect(a0,b0,a1,b1); L.s.shadow([(c0,r0),(c1,r0),(c1,r1),(c0,r1)],dx=int(min(56,8+h*0.12)))
def mk(W,D,Hmax):
    S=max(W,D); sp=Spr(int((W+D)*32+160),int((W+D)*16+Hmax+80),int(S*32+40),int(Hmax+40)); return sp
def finish(sp,L,W,D):
    o,g=sp.render()
    c,r=L.cr(W/2,D/2); piv=(sp.X(c,r),sp.Y(c,r))
    c0,r0,_,_=L.rect(0,0,W,D); anc=(sp.X(c0,r0),sp.Y(c0,r0))
    o2,g2,p2=crop(o,g,piv); dx=piv[0]-p2[0]; dy=piv[1]-p2[1]
    return o2,g2,p2,(anc[0]-dx,anc[1]-dy)
REG={}
def asset(name,group,W,D,Hmax,oris=('sw','se'),note='',interact=None,states=None):
    def deco(fn):
        REG[name]=dict(fn=fn,group=group,W=W,D=D,Hmax=Hmax,oris=oris,note=note,interact=interact)
        return fn
    return deco

def build(name,ori):
    A=REG[name]; base={'sw':'sw','se':'se','ne':'sw','nw':'se'}[ori]; back=ori in ('ne','nw')
    sp=mk(A['W'],A['D'],A['Hmax']); L=Loc(sp,base,A['W'],A['D'])
    if back and A['group']=='sinyal': A['fn'](L,back=True)
    elif back: L.flip=True; A['fn'](L)
    else: A['fn'](L)
    return finish(sp,L,A['W'],A['D'])
