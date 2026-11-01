import numpy as np
from sdf import *
from grade import grade
from font import text_mask

T=32.0; HS=3.2   # px per tile, px per game height unit (HS 1.6 x PPU 2)

def G(h,brand): return h if brand else grade(h)
def common_ramps(brand=False):
    g=lambda h:G(h,brand)
    return {
     'glass': [hexrgb('#BFD8E4'),hexrgb('#7A9FB2'),hexrgb('#4F6A86'),hexrgb('#2E3B52'),hexrgb('#1C2330')],
     'tyre':  [hexrgb('#3A4458'),hexrgb('#2A3242'),hexrgb('#1C2330'),hexrgb('#151A23'),hexrgb('#0B0E13')],
     'rim':   [hexrgb('#E7EBF2'),hexrgb('#C7CFDC'),hexrgb('#A7B2C4'),hexrgb('#8D97A8'),hexrgb('#5A6577')],
     'trim':  [hexrgb('#5A6577'),hexrgb('#3A4458'),hexrgb('#2A3242'),hexrgb('#1C2330'),hexrgb('#151A23')],
     'bumper':[hexrgb('#A7B2C4'),hexrgb('#8D97A8'),hexrgb('#5A6577'),hexrgb('#3A4458'),hexrgb('#2A3242')],
     'lamp_f':[hexrgb('#FFFFFF'),hexrgb('#FFF4C2'),hexrgb('#FFE27A'),hexrgb('#F2B530'),hexrgb('#B07A1C')],
     'lamp_r':[hexrgb('#FFB394'),hexrgb('#FF5A5F'),hexrgb('#D94B4B'),hexrgb('#BE2F56'),hexrgb('#7A2E35')],
     'amber': [hexrgb('#FFE27A'),hexrgb('#FFC93C'),hexrgb('#F2B530'),hexrgb('#D9682A'),hexrgb('#B07A1C')],
     'plate': [hexrgb('#FFFFFF'),hexrgb('#E7EBF2'),hexrgb('#C7CFDC'),hexrgb('#8D97A8'),hexrgb('#5A6577')],
     'white': [hexrgb('#FFFFFF'),hexrgb('#F4F1EA'),hexrgb('#E0DED5'),hexrgb('#C7CFDC'),hexrgb('#8D97A8')],
    }

def wheel_mat(pl,nl,wheels,R):
    m=np.array(['tyre']*len(pl),object)
    for (wx,wy) in wheels:
        rad=np.sqrt((pl[:,0]-wx)**2+(pl[:,2]-R)**2)
        near=(np.abs(pl[:,1]-wy)<6)
        m=np.where(near&(np.abs(nl[:,1])>0.55)&(rad<R*0.6),'rim',m)
        m=np.where(near&(np.abs(nl[:,1])>0.55)&(rad<R*0.2),'trim',m)
    return m

def top_of(poly,x):
    """max z of polygon at x (simple scan of edges)"""
    P=np.asarray(poly,float); out=np.full_like(x,-1e9)
    for i in range(len(P)):
        a,b=P[i-1],P[i]
        if a[0]==b[0]: continue
        lo,hi=min(a[0],b[0]),max(a[0],b[0]); t=(x-a[0])/(b[0]-a[0]); z=a[1]+t*(b[1]-a[1])
        out=np.where((x>=lo)&(x<=hi),np.maximum(out,z),out)
    return out

class Car:
    """generic car: side profile body + cabin, arches, 4 wheels; material rules by zones"""
    def __init__(s,name,Ltiles,wtiles,body,cabin,cab_hw,wheel_x,R,paint,brand=False,belt=33.0,
                 side_win=(-26,12),bpill=(-7,-4.5),tumble=0.12,rr=3.0,extra=None,decal=None,hl_z=(18,24),tl_z=(19,25),cab_rr=2.5,
                 bumper_z=11.5,grille=True,plate='plate',bpill2=None,mirrors=True):
        s.__dict__.update(locals()); del s.__dict__['s']
        s.hl=Ltiles*T/2; s.hw=wtiles*T/2
        hw=s.hw; m=Model()
        arches=[(wx,R) for wx in wheel_x]
        def bodyf(p):
            d=sd_extrude(p,body,hw,rr)
            dc=sd_extrude(p,cabin,cab_hw,cab_rr,tumble,belt)
            d=smin(d,dc,2.0)
            for wx,R_ in arches: d=np.maximum(d,-sd_cyl_y(p,V(wx,0,R_),R_+2.2,hw+5,0.5))
            return d
        m.add('body',bodyf)
        s.wheels=[(wx,sy*(hw-4.6)) for wx in wheel_x for sy in (1,-1)]
        for (wx,wy) in s.wheels:
            m.add('wheel',(lambda wx,wy:(lambda p: sd_cyl_y(p,V(wx,wy,R),R,4.0,1.2)))(wx,wy))
        # mirrors
        mx=cabin[0][0]-4
        for sy in ((1,-1) if mirrors else ()): m.add('mirror',(lambda sy:(lambda p: sd_rbox(p,V(mx,sy*(cab_hw+0.6),belt+2.5),(1.6,1.8,1.6),0.6)))(sy))
        if extra:
            for nm,fn in extra(s): m.add(nm,fn)
        s.model=m
        s.ramps=common_ramps(brand); s.ramps['paint']=ramp5(*[G(h,brand) for h in paint[:3]])
        if len(paint)>3: s.ramps['paint2']=ramp5(*[G(h,brand) for h in paint[3:6]])
        s.height=max(z for _,z in cabin)+(12 if extra else 4)

    def matfn(s,pl,nl,nw,names,lam,info):
        x,y,z=pl[:,0],pl[:,1],pl[:,2]; nx,ny,nz=nl[:,0],nl[:,1],nl[:,2]
        N=len(pl); m=np.array(['paint']*N,object); toff=np.zeros(N,int)
        roof=top_of(s.cabin,x)
        isb=names=='body'
        # glass
        hwz=s.cab_hw-s.tumble*np.maximum(z-s.belt,0)
        rg=max(zz for _,zz in s.cabin)-3.5
        glass=isb&(z>s.belt+1.5)&(z<rg)&(nz<0.86)
        fr=nx>0.35; rear=nx<-0.35; side=np.abs(ny)>0.5
        frame=(fr|rear)&(np.abs(y)>hwz-2.0)
        sidewin=side&~fr&~rear&(x>s.side_win[0])&(x<s.side_win[1])&~((x>s.bpill[0])&(x<s.bpill[1]))&~((x>(s.bpill2 or (0,0))[0])&(x<(s.bpill2 or (0,0))[1]))
        g=glass&(frame==False)&((fr|rear)|sidewin)
        m[g]='glass'
        # glass highlight: diagonal streaks
        u=x*info['xsign']
        streak=g&side&(np.mod(u*1.0+z*1.0,26)<2.2)
        streak|=g&fr&(np.mod(y*1.3+z,17)<1.6)
        toff[streak]=-3
        # lights / grille / bumper / plate
        m[isb&(nx>0.45)&(z>s.hl_z[0])&(z<s.hl_z[1])&(np.abs(y)>s.hw-8.5)]='lamp_f'
        if s.grille: m[isb&(nx>0.45)&(z>s.bumper_z+0.5)&(z<s.hl_z[0]+1)&(np.abs(y)<s.hw-9)]='trim'
        m[isb&(nx<-0.45)&(z>s.tl_z[0])&(z<s.tl_z[1])&(np.abs(y)>s.hw-8)]='lamp_r'
        m[isb&(np.abs(x)>s.hl-7)&(z<s.bumper_z)&(z>3)]='bumper'
        m[isb&(np.abs(nx)>0.45)&(z>6.5)&(z<10.5)&(np.abs(y)<5)]=s.plate
        m[isb&(z<8.5)&side&(np.abs(x)<s.hl-7)]='trim'
        # door seams + handles
        if s.side_win[1]-s.side_win[0]>20:
            for xs in (s.bpill[1]+0.5,s.side_win[1]-0.5):
                seam=isb&side&(np.abs(x-xs)<0.6)&(z>10)&(z<s.belt+0.5)&(m=='paint'); toff[seam]+=1
            for xs in (s.bpill[0]-3,s.side_win[1]-5):
                h=isb&side&(x>xs-2)&(x<xs+1)&(z>s.belt-6)&(z<s.belt-4.4)&(m=='paint'); toff[h]+=1
        # wheels
        w=names=='wheel'; wm=wheel_mat(pl,nl,s.wheels,s.R); m[w]=wm[w]
        m[names=='mirror']='paint'
        if s.decal: s.decal(s,pl,nl,names,m,toff,info)
        return m,toff

    def render(s,d):
        img,piv=render(s.model,d,s.hl+3,s.hw+3,s.height,shadow_rr=(s.hl,s.hw,6),matfn=s.matfn,ramps=s.ramps)
        return img,piv
