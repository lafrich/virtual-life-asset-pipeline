import numpy as np
from sdf import *
from grade import grade
from cars import common_ramps, wheel_mat

R5=lambda *h: [hexrgb(x) for x in h]
SKIN=R5('#F7E1CB','#F1D3B5','#D9A47E','#B07A55','#8A5A3C')
SKIN2=R5('#E8B48C','#D9A47E','#B48455','#8A5A3C','#6B4F3A')

class Person:
    def __init__(s,x0,kind,skin='light',pose='ride',hz=0.0,head_r=7.6,arm_to=None,yaw=0.0):
        s.__dict__.update(locals()); del s.__dict__['s']
        s.hip=V(x0,0,23.5+hz); s.hc=V(x0+2.5,0,46+hz); s.fd=V(np.cos(yaw),np.sin(yaw),0); s.fp=V(-np.sin(yaw),np.cos(yaw),0)
    def parts(s):
        x0=s.x0; hz=s.hz; P=[]; hc=s.hc; hr=s.head_r
        P.append(('torso',lambda p: sd_ellip(p,V(x0+1.2,0,31.5+hz),V(4.8,6.4,9.0))))
        P.append(('head',lambda p: sd_sphere(p,hc,hr)))
        # legs
        for sy in (1,-1):
            k=V(x0+9,sy*4.2,23+hz); h=V(x0,sy*3.4,23.5+hz); f=V(x0+10,sy*4.4,11.5)
            if s.pose=='pillion': k=V(x0+7,sy*5.2,24.5+hz); f=V(x0+6.5,sy*5.6,13.5)
            P.append(('thigh',(lambda h,k:(lambda p: sd_capsule(p,h,k,3.1)))(h,k)))
            P.append(('shin',(lambda k,f:(lambda p: sd_capsule(p,k,f,2.6)))(k,f)))
            P.append(('shoe',(lambda f:(lambda p: sd_rbox(p,f+V(1.6,0,-1.2),(3.0,1.9,1.5),0.8)))(f)))
        # arms: list of (shoulder, elbow, hand) per side
        for sy in (1,-1):
            sh=V(x0+2,sy*6.0,37.5+hz)
            if s.arm_to and sy in s.arm_to: el_,hd=s.arm_to[sy]
            else: el_=V(x0+7.5,sy*7.6,31+hz); hd=V(12.5,sy*6.6,32.5)
            P.append(('upper',(lambda a,b:(lambda p: sd_capsule(p,a,b,2.2)))(sh,el_)))
            P.append(('fore',(lambda a,b:(lambda p: sd_capsule(p,a,b,2.0)))(el_,hd)))
            P.append(('hand',(lambda c:(lambda p: sd_sphere(p,c,1.9)))(hd)))
        if s.kind in ('gojek','maxim','pax'):
            def helmet(p,hc=hc,hr=hr):
                d=sd_sphere(p,hc+V(-0.6,0,1.2),hr+1.3)
                q=p-hc; q=np.stack([q@s.fd,q@s.fp,q[:,2]],-1)
                face=sd_rbox(q,V(hr+1.0,0,-2.4),(4.2,hr*0.74,hr*0.62),2.0)
                return np.maximum(d,-face)
            P.append(('helmet',helmet))
        if s.kind=='sma':
            def hijab(p,hc=hc,hr=hr):
                d=sd_sphere(p,hc+V(-1.2,0,0.6),hr+1.0)
                q=p-hc; q=np.stack([q@s.fd,q@s.fp,q[:,2]],-1)
                face=sd_ellip(q,V(hr*0.8,0,-1.0),V(5.0,hr*0.72,hr*0.78))
                d=np.maximum(d,-face)
                drape=sd_rcone(p,hc+V(-3.0,0,-6.5),V(x0+0.5,0,34+s.hz),5.6,7.2)
                return smin(d,drape,1.5)
            P.append(('hijab',hijab))
        return P

class Ride:
    """scooter + riders. kind: gojek | maxim | sma"""
    def __init__(s,name,scoot_cols,people,long=False,bag=None,mats=None):
        s.name=name; s.people=people; s.long=long; s.mats=mats
        m=Model(); rear=-28 if long else -22
        s.hl=25 if long else 21; s.hw=12
        wx=[15,-19 if long else -14]; s.wheels=[(w,0) for w in wx]; s.R=6.6
        for w in wx: m.add('wheel',(lambda w:(lambda p: sd_cyl_y(p,V(w,0,6.6),6.6,2.3,1.0)))(w))
        cowl=[(rear+3,12),(-3,10),(-0.5,15.5),(-4,19.5),(rear+1,22),(rear-1.5,19)]
        m.add('paint',lambda p: sd_extrude(p,cowl,4.4,2.2,0.15,14))
        m.add('seat',lambda p: sd_rbox(p,V((rear+1)/2,0,21.2),((-2-rear)/2,4.2,1.5),1.2))
        m.add('trim',lambda p: sd_rbox(p,V(3.5,0,8.6),(5.5,4,1.4),0.8))
        apron=[(7,8),(13,8),(17,17),(15,30),(11,30.5),(9,19)]
        m.add('paint',lambda p: sd_extrude(p,apron,5.2,2.0))
        m.add('paint2',lambda p: sd_rbox(p,V(13.5,0,31.5),(3.2,3.6,2.2),1.2))
        m.add('trim',lambda p: sd_capsule(p,V(12.5,-7.2,32.4),V(12.5,7.2,32.4),1.1))
        for sy in (1,-1): m.add('trim',(lambda sy:(lambda p: np.minimum(sd_capsule(p,V(12.5,sy*5.5,33),V(11.5,sy*7.5,39),0.6),sd_ellip(p,V(11.5,sy*7.8,39.6),V(0.8,1.6,1.1)))))(sy))
        m.add('bumper',lambda p: sd_capsule(p,V(-6,-4.8,8),V(rear+4,-4.8,10.5),1.5))
        if bag: m.add('bag',bag)
        for pp in people:
            for nm,fn in pp.parts(): m.add(nm,fn)
        s.model=m; s.height=72
        s.ramps=common_ramps(False)
        s.ramps.update(SK=SKIN,SK2=SKIN2)
        s.ramps['paint']=ramp5(*[grade(h) for h in scoot_cols[0:3]])
        s.ramps['paint2']=ramp5(*[grade(h) for h in scoot_cols[3:6]]) if len(scoot_cols)>3 else s.ramps['paint']
        s.ramps['seat']=s.ramps['trim']
        s.ramps['eye']=R5('#3D2A1E','#3D2A1E','#2A2438','#2A2438','#15151F')
        s.ramps.update(mats)
    def matfn(s,pl,nl,nw,names,lam,info):
        N=len(pl); m=np.array(['trim']*N,object); toff=np.zeros(N,int)
        x,y,z=pl[:,0],pl[:,1],pl[:,2]; nx,ny,nz=nl[:,0],nl[:,1],nl[:,2]
        for k in ('paint','paint2','seat','trim','bumper','bag'):
            m[names==k]=k
        w=names=='wheel'; wm=wheel_mat(pl,nl,s.wheels,s.R); m[w]=wm[w]
        # scooter lights
        m[(names=='paint2')&(nx>0.5)&(z>30.5)]='lamp_f'
        m[(names=='paint')&(nx<-0.5)&(z>14)&(z<19)]='lamp_r'
        # people: each person owns parts by proximity of x
        for pp in s.people:
            xs=np.array([q.x0 for q in s.people]); own=np.abs(x[:,None]-xs[None,:]-2).argmin(1); sel=own==s.people.index(pp)
            cl=pp.kind
            for part,mat in s.mats['_map'][cl].items():
                hit=(names==part)&sel&(m=='trim') if part not in ('paint',) else None
                if hit is not None: m[hit]=mat
            hc=pp.hc; rr=pp.head_r
            d=(pl-hc)/rr; d=np.stack([d@pp.fd,d@pp.fp,d[:,2]],-1)
            face=(names=='head')&sel
            m[face]=s.mats['_skin'][cl]
            eyes=face&(d[:,0]>0.55)&(d[:,2]>-0.02)&(d[:,2]<(0.16 if pp.pose=='laugh' else 0.3))&(np.abs(np.abs(d[:,1])-0.4)<0.14)
            m[eyes]='eye'
            if cl=='maxim': m[face&(d[:,2]<-0.12)&(d[:,0]>0.2)]='trim'
            if pp.pose=='coverface': pass
            # helmet visor band
            hm=(names=='helmet')&sel
            m[hm&(d[:,0]>0.55)&(d[:,2]>0.22)&(d[:,2]<0.62)]='visor'
            # decals
            if cl=='gojek':
                up=(names=='upper')&sel; m[up&(np.abs(z-(36+pp.hz))<0.9)]='white'
                tor=(names=='torso')&sel; m[tor&(np.abs(ny)>0.75)&(z>36+pp.hz)]='sleeve'
            if cl=='maxim':
                tor=(names=='torso')&sel
                # red ring logo: on the back and on the chest
                for cx,sgn in ((pp.x0-4,-1),(pp.x0+5.5,1)):
                    dd=np.sqrt((y-(-2.2 if sgn>0 else 0))**2+(z-(35+pp.hz))**2)
                    m[tor&(nx*sgn>0.4)&(dd<2.6)&(dd>1.2)]='red'
                up=(names=='upper')&sel
                m[up&(np.abs(z-(36.5+pp.hz))<1.0)&(x<pp.x0+3.5)]='red'; m[up&(np.abs(z-(35.3+pp.hz))<0.6)&(x<pp.x0+3.5)]='white'
        return m,toff
    def render(s,d):
        return render(s.model,d,s.hl+4,s.hw,s.height,shadow_rr=(s.hl-2,5.5,4),matfn=s.matfn,ramps=s.ramps,shadow_extra=1.0)

def RR(*h): return R5(*h)
COMMON_MATS=dict(
  white=R5('#FFFFFF','#F4F1EA','#E0DED5','#C7CFDC','#8D97A8'),
  visor=R5('#7A9FB2','#4F6A86','#2E3B52','#1C2330','#151A23'),
  red=R5('#FF7A5C','#E5484D','#BE2F56','#7A2E35','#5A1F26'),
  black=R5('#535969','#3A4458','#2A3242','#1C2330','#0B0E13'),
)
def gojek(pax=False,look=-1):
    mats=dict(COMMON_MATS)
    mats.update(green=ramp5(grade('#5BE07A'),grade('#35C46A'),grade('#22984C')),
                ghelm=ramp5(grade('#5BE07A'),grade('#35C46A'),grade('#22984C')),
                brown=R5('#94704F','#6B4F3A','#5A4130','#3D2A1E','#2A1C14'),
                jeans=R5('#7A9FB2','#3371A7','#2D5A8A','#24466E','#1A3350'),
                grey=R5('#C7CFDC','#A7B2C4','#8D97A8','#5A6577','#3A4458'),
                bagred=R5('#FF7A5C','#D94B4B','#BE2F56','#7A2E35','#5A1F26'),
                sleeve=R5('#535969','#3A4458','#2A3242','#1C2330','#0B0E13'))
    mats['_map']={'gojek':{'torso':'green','upper':'sleeve','fore':'sleeve','hand':'SK2','thigh':'brown','shin':'brown','shoe':'black','helmet':'ghelm'},
                  'pax':{'torso':'grey','upper':'grey','fore':'SK','hand':'SK','thigh':'jeans','shin':'jeans','shoe':'black','helmet':'ghelm'}}
    mats['_skin']={'gojek':'SK2','pax':'SK'}
    mats['bag']=mats['bagred']
    ppl=[Person(-6,'gojek',pose='ride',yaw=look*0.45)]
    bag=None
    if pax:
        ppl.append(Person(-15,'pax',pose='pillion',hz=1.5,yaw=look*0.7,arm_to={1:(V(-10,6.5,31),V(-5,4.5,29)),-1:(V(-10,-6.5,31),V(-5,-4.5,29))}))
    else:
        bag=lambda p: sd_rbox(p,V(-17,0,29),(4.6,6.2,7.0),1.2)
    return Ride('gojek'+('_pax' if pax else ''),['#3A4458','#2A3242','#1C2330','#E5484D','#BE2F56','#7A2E35'],ppl,bag=bag,mats=mats)
def maxim(pax=False,look=-1):
    mats=dict(COMMON_MATS)
    mats.update(yellow=ramp5(grade('#FFE27A'),grade('#FFC93C'),grade('#F2B530')),
                jeans=R5('#7A9FB2','#3371A7','#2D5A8A','#24466E','#1A3350'),
                grey=R5('#C7CFDC','#A7B2C4','#8D97A8','#5A6577','#3A4458'),
                plum=ramp5(grade('#8E6BAE'),grade('#5B3F73'),grade('#46305A')))
    mats['_map']={'maxim':{'torso':'yellow','upper':'yellow','fore':'yellow','hand':'black','thigh':'black','shin':'black','shoe':'black','helmet':'black'},
                  'pax':{'torso':'plum','upper':'plum','fore':'plum','hand':'SK','thigh':'jeans','shin':'jeans','shoe':'white','helmet':'yellow'}}
    mats['_skin']={'maxim':'SK2','pax':'SK'}
    ppl=[Person(-6,'maxim',pose='ride',yaw=look*0.45)]
    if pax: ppl.append(Person(-15,'pax',pose='pillion',hz=1.5,yaw=look*0.7,arm_to={1:(V(-10,6.5,31),V(-5,4.5,29)),-1:(V(-10,-6.5,31),V(-5,-4.5,29))}))
    return Ride('maxim'+('_pax' if pax else ''),['#FFFFFF','#E7EBF2','#A7B2C4','#E5484D','#BE2F56','#7A2E35'],ppl,mats=mats)
def sma(look=-1):
    mats=dict(COMMON_MATS)
    mats.update(hijabw=R5('#FFFFFF','#F4F1EA','#D9DEE6','#A7B2C4','#6B7487'),
                shirt=R5('#F4F1EA','#E7EBF2','#C7CFDC','#A7B2C4','#7C879B'),
                skirt=R5('#A7B2C4','#8D97A8','#788197','#535969','#3A4458'),
                sock=R5('#FFFFFF','#F4F1EA','#E0DED5','#C7CFDC','#8D97A8'))
    mp={'torso':'shirt','upper':'shirt','fore':'SK','hand':'SK','thigh':'skirt','shin':'skirt','shoe':'black','hijab':'hijabw'}
    mats['_map']={'sma':mp}; mats['_skin']={'sma':'SK'}
    hr=6.9
    p1=Person(0.5,'sma',pose='laugh',head_r=hr,yaw=look*0.8)
    p2=Person(-9.5,'sma',pose='coverface',hz=1.0,head_r=hr,yaw=look*0.5)
    p2.arm_to={1:(V(-3.5,7,31),V(p2.hc[0]+hr+0.4,2.4,p2.hc[2]-1.2)),-1:(V(-3.5,-7,31),V(p2.hc[0]+hr+0.4,-2.4,p2.hc[2]-1.2))}
    p3=Person(-19,'sma',pose='wave',hz=2.0,head_r=hr,yaw=look*1.0)
    p3.arm_to={-1:(V(-16,-10,43),V(-15,-11,52)),1:(V(-13,6.5,30),V(-9,4.5,29))}
    return Ride('sma_triple',['#3F63E8','#2D45B4','#24399A','#1C2330','#151A23','#0B0E13'],[p1,p2,p3],long=True,mats=mats)

LOOK={'se':-1,'nw':1,'sw':1,'ne':-1}
