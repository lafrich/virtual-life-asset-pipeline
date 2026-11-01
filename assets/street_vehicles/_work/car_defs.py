from cars import *
def lift(poly,belt=33.0,k=1.12): return [(x,belt+(z-belt)*k if z>belt else z) for x,z in poly]

BIRD=["..##...",".####..","#######","...###.","....#.."]
def glyph_hits(u,z,u0,z0,rows,scale=1):
    """u: screen-reading coordinate, z height. rows top->bottom. returns bool mask"""
    H=len(rows); W=len(rows[0])
    i=np.floor((u-u0)/scale).astype(int); j=np.floor((z0-z)/scale).astype(int)
    ok=(i>=0)&(i<W)&(j>=0)&(j<H); out=np.zeros(len(u),bool)
    ii=np.where(ok)[0]
    for k in ii:
        if rows[j[k]][i[k]]=='#': out[k]=True
    return out
def text_rows(t):
    from font import text_mask
    pts,w=text_mask(t); return ["".join('#' if (i,j) in pts else '.' for i in range(w)) for j in range(5)]

def sedan(col,name='sedan'):
    return Car(name,2.9,1.05,
      body=[(-46,4),(46,4),(46.4,13),(45.6,20),(42.5,26),(32,29.5),(15,32),(-25,32.5),(-37,31),(-44.5,28),(-46.4,20),(-46.4,10)],
      cabin=lift([(16,30),(2,53),(-11,55),(-23,52.5),(-36,31)]),cab_hw=14.8,wheel_x=[28,-28],R=10.5,
      paint=col,side_win=(-27,11),bpill=(-7.5,-5),tl_z=(14,20))

def hatch(col):
    return Car('hatchback',2.6,1.05,
      body=[(-41,4),(41,4),(41.6,13),(40.6,20),(37.5,26),(27,29.5),(12,32),(-37,33),(-41.4,27),(-41.6,10)],
      cabin=lift([(13,30),(0,52),(-26,54),(-36.5,50),(-40.5,32)]),cab_hw=14.8,wheel_x=[25,-26],R=10.5,
      paint=col,side_win=(-31,9),bpill=(-10.5,-8),tl_z=(26,32),bumper_z=11)

def mpv(col):
    return Car('mpv',3.1,1.08,
      body=[(-49,4),(49,4),(49.6,13),(48.6,21),(44.5,27.5),(31,32.5),(-46,34),(-49.4,28),(-49.6,10)],
      cabin=[(31,31),(14,58),(-40,60),(-47.5,57),(-49,34)],cab_hw=15.6,wheel_x=[31,-32],R=11,
      paint=col,side_win=(-45,15),bpill=(-6,-3.5),bpill2=(-28,-25),tl_z=(24,33),belt=34,tumble=0.08)

def taxi_decal(s,pl,nl,names,m,toff,info):
    x,y,z=pl[:,0],pl[:,1],pl[:,2]; side=(np.abs(nl[:,1])>0.6)&(names=='body')
    u=x*info['xsign']
    # bird mark on the front door (centred x~2) + dark-blue door pinstripe
    uc=2*info['xsign']
    b=side&glyph_hits(u,z,uc-3.5,27,BIRD)&(m=='paint'); m[b]='bbblue'
    m[(names=='sign')]='white'
    sg=(names=='sign')&(z<60.6)&(np.abs(nl[:,2])<0.7); m[sg]='bbblue'
    m[(names=='body')&(np.abs(nl[:,0])>0.45)&(z>6.5)&(z<10.5)&(np.abs(y)<5)]='amber'
def taxi():
    def extra(s):
        return [('sign',lambda p: sd_rbox(p,V(-6,0,60.8),(5.5,6.5,3.0),1.4))]
    c=Car('taxi',3.1,1.05,
      body=[(-49,4),(49,4),(49.6,13),(48.8,20),(45.5,26),(34,29.5),(17,32),(-28,32.5),(-40,31),(-47.5,28),(-49.6,20),(-49.6,10)],
      cabin=lift([(18,30),(3,53),(-12,55),(-25,52.5),(-39,31)]),cab_hw=14.8,wheel_x=[30,-30],R=10.5,
      paint=['#5CC3EE','#45B3E6','#2F97CF'],brand=True,side_win=(-29,12),bpill=(-8,-5.5),tl_z=(14,20),extra=extra,decal=taxi_decal)
    c.ramps['bbblue']=[hexrgb('#3F63E8'),hexrgb('#2D45B4'),hexrgb('#24399A'),hexrgb('#1D2F80'),hexrgb('#15215C')]
    c.height=68
    return c

class Van(Car):
    """Gran Max style blind van (game's 'van'): cab-over, sloped windscreen, cream + pink stripe like the game's van"""
    def __init__(s,col):
        super().__init__('van',3.4,1.1,
          body=[(-54,4),(54,4),(54.4,14),(53.4,30),(50.5,36),(42,69),(38,73),(-52,73),(-54.4,69),(-54.4,10)],
          cabin=[(0,40),(1,40),(1,41)],cab_hw=4,wheel_x=[36,-34],R=10.5,paint=col,rr=4,mirrors=False)
        s.ramps['stripe']=ramp5(grade('#FF8AA2'),grade('#FF7A90'),grade('#EE4D72'))
        s.height=78
        s.model.add('mirror',lambda p: np.minimum(sd_rbox(p,V(46,s.hw+1.2,44),(1.2,1.4,3.0),0.5),sd_rbox(p,V(46,-s.hw-1.2,44),(1.2,1.4,3.0),0.5)))
    def matfn(s,pl,nl,nw,names,lam,info):
        x,y,z=pl[:,0],pl[:,1],pl[:,2]; nx,ny,nz=nl[:,0],nl[:,1],nl[:,2]
        N=len(pl); m=np.array(['paint']*N,object); toff=np.zeros(N,int); isb=names=='body'
        side=np.abs(ny)>0.55; fr=nx>0.35; rear=nx<-0.5
        m[isb&fr&(z>39)&(z<68)&(np.abs(y)<s.hw-2.2)&(nz<0.9)]='glass'
        sw=isb&side&(x>27)&(x<46-(z-38)*0.27)&(z>41)&(z<66); m[sw]='glass'
        m[isb&side&(x>-48)&(x<-30)&(z>44)&(z<64)]='glass'
        st=isb&side&(z>30)&(z<34.5)&(m=='paint'); m[st]='stripe'
        m[isb&fr&(z>18)&(z<25)&(np.abs(y)>s.hw-8)]='lamp_f'
        m[isb&fr&(z>12)&(z<18)&(np.abs(y)<s.hw-8)]='trim'
        m[isb&rear&(z>16)&(z<30)&(np.abs(y)>s.hw-5)]='lamp_r'
        m[isb&(np.abs(x)>s.hl-6)&(z<11.5)&(z>3)]='bumper'
        m[isb&(np.abs(nx)>0.45)&(z>6.5)&(z<10.5)&(np.abs(y)<5)]='plate'
        m[isb&(z<8.5)&side&(np.abs(x)<s.hl-6)]='trim'
        for xs in (25.5,-4,-28):
            toff[isb&side&(np.abs(x-xs)<0.6)&(z>9)&(z<69)&(m!='glass')]+=1
        g=m=='glass'; u=x*info['xsign']; toff[g&side&(np.mod(u+z,26)<2.2)]=-3; toff[g&fr&(np.mod(y*1.3+z,17)<1.6)]=-3
        w=names=='wheel'; wm=wheel_mat(pl,nl,s.wheels,s.R); m[w]=wm[w]
        m[names=='mirror']='trim'
        return m,toff

class Bus(Car):
    """Transjakarta single-body city bus (high-floor), brand colours kept exact (data-ng in game)"""
    def __init__(s):
        super().__init__('bus',6.6,1.3,
          body=[(-105,6),(105,6),(105.6,20),(104.6,95),(101.5,102.5),(95,105),(-100,105),(-104.6,100.5),(-105.6,20)],
          cabin=[(0,40),(1,40),(1,41)],cab_hw=4,wheel_x=[72,-56],R=15,paint=['#3F7FE0','#2C6BD8','#2457B8'],brand=True,rr=5,mirrors=False)
        s.ramps['paint']=[hexrgb('#5C95EA'),hexrgb('#3F7FE0'),hexrgb('#2C6BD8'),hexrgb('#2457B8'),hexrgb('#1A3F87')]
        s.ramps['ltblue']=[hexrgb('#CEDBFF'),hexrgb('#A9D6F5'),hexrgb('#86CCFF'),hexrgb('#5CB8FF'),hexrgb('#3A8FD0')]
        s.ramps['white']=[hexrgb('#FFFFFF'),hexrgb('#FFFFFF'),hexrgb('#F4F1EA'),hexrgb('#D9D3C7'),hexrgb('#A7B2C4')]
        s.ramps['ac']=[hexrgb('#FFFFFF'),hexrgb('#E7EBF2'),hexrgb('#C7CFDC'),hexrgb('#A7B2C4'),hexrgb('#8D97A8')]
        s.height=116
        s.model.add('ac',lambda p: sd_rbox(p,V(-20,0,107),(26,13,4),2.5))
        s.model.add('mirror',lambda p: np.minimum(sd_capsule(p,V(104,s.hw-2,96),V(109,s.hw+2,86),1.2),sd_capsule(p,V(104,-s.hw+2,96),V(109,-s.hw-2,86),1.2)))
        s.rows=text_rows('transjakarta'); s.doors=[(40,54),(4,18)]
    def matfn(s,pl,nl,nw,names,lam,info):
        x,y,z=pl[:,0],pl[:,1],pl[:,2]; nx,ny,nz=nl[:,0],nl[:,1],nl[:,2]
        N=len(pl); m=np.array(['paint']*N,object); toff=np.zeros(N,int); isb=names=='body'
        side=(np.abs(ny)>0.55)&isb; fr=(nx>0.5)&isb; rear=(nx<-0.5)&isb; u=x*info['xsign']
        # livery swoosh: white band + light-blue band rising toward the rear
        zc=14+16*np.clip(x/s.hl,0,1)**1.5
        m[side&(z>zc)&(z<zc+6)]='white'; m[side&(z>zc+8)&(z<zc+11)]='ltblue'
        # TRANSJAKARTA lettering (3x5 font at 2x) above the swoosh, front half
        tw=len(s.rows[0])*2; uc=-50*info['xsign']
        m[side&glyph_hits(u,z,uc-tw/2,49,s.rows,2)]='white'
        # logo: small white ring + light-blue dot near the front
        lx=86; d=np.sqrt((x-lx)**2+(z-44)**2); m[side&(d<4.4)&(d>2.6)]='white'; m[side&(d<=1.6)]='ltblue'
        # window band with black pillars
        win=side&(z>52)&(z<93)&(x>-99)&(x<99); m[win]='glass'
        for px in np.arange(-99,99,26.0): m[win&(np.abs(x-px)<1.4)]='trim'
        m[side&((np.abs(z-52.5)<1.0)|(np.abs(z-93)<1.0))&(x>-99)&(x<99)]='trim'
        # doors: glazed, dark frame, centre seam (high floor -> start at 30)
        for a,b in s.doors:
            dr=side&(x>a)&(x<b)&(z>30)&(z<93); m[dr]='glass'; m[dr&((np.abs(x-a)<1.2)|(np.abs(x-b)<1.2)|(np.abs(x-(a+b)/2)<0.7)|(z<32))]='trim'
        # front: big windscreen, destination sign, lamps, bumper
        m[fr&(z>42)&(z<92)&(np.abs(y)<s.hw-2.5)]='glass'
        m[fr&(z>94)&(z<101)&(np.abs(y)<s.hw-3)]='trim'; m[fr&(z>95.6)&(z<99)&(np.abs(y)<s.hw-7)&(np.mod(np.floor(y),3)!=0)]='amber'
        m[fr&(z>14)&(z<21)&(np.abs(y)>s.hw-9)]='lamp_f'
        m[fr&(z>24)&(z<36)&(np.abs(y)<s.hw-6)]='white'
        m[rear&(z>58)&(z<92)&(np.abs(y)<s.hw-4)]='glass'
        m[rear&(z>14)&(z<24)&(np.abs(y)>s.hw-7)]='lamp_r'
        m[isb&(np.abs(x)>s.hl-6)&(z<13)&(z>4)]='trim'
        m[isb&(np.abs(nx)>0.45)&(z>7)&(z<12)&(np.abs(y)<6)]='amber'
        m[side&(z<10)]='trim'
        g=m=='glass'; toff[g&side&(np.mod(u+z,34)<2.2)]=-3; toff[g&fr&(np.mod(y*1.3+z,21)<1.6)]=-3
        w=names=='wheel'; wm=wheel_mat(pl,nl,s.wheels,s.R); m[w]=wm[w]
        m[names=='mirror']='trim'; m[names=='ac']='ac'
        return m,toff

def all_cars():
    return [
      ('sedan_red',sedan(['#FF5A5F','#E0434A','#B8323A'])),
      ('sedan_teal',sedan(['#2EC4B6','#22A094','#1B7F76'])),
      ('hatchback_orange',hatch(['#FF9440','#E07A2E','#B85E22'])),
      ('mpv_silver',mpv(['#D5DCE6','#A7B2C4','#7C879B'])),
      ('taxi_bluebird',taxi()),
      ('van_cream',Van(['#F4F1EA','#D9D3C7','#B8B2A6'])),
      ('bus_transjakarta',Bus()),
    ]
