from lib import *
STAND=["..###..","..###..","...#...",".#####.","#.###.#","#.###.#","..###..","..#.#..","..#.#..","..#.#..","..#.#.."]
WALK =["...##..","...##..","...#...","..####.",".#.##.#","#..##..","...##..","..#..#.",".#....#","#.....#","......."]
def glyph(tx,u0,v0,G,m,t,glow):
    for j,row in enumerate(G):
        for i,ch in enumerate(row):
            if ch=='#': tx.px(u0+i,v0+len(G)-1-j,m,t,glow)
def disc(tx,cu,cv,R,m,t,glow=False):
    for du in range(-R,R+1):
        for dv in range(-R,R+1):
            if du*du+dv*dv<=R*R+R*0.6: tx.px(cu+du,cv+dv,m,t,glow)
PED_STATES=['merah','hijau','hijau_kedip_off','padam']
VEH_STATES=['merah','kuning','hijau']
def ped_head_tex(state):
    def f(Wp,Hh):
        tx=Tex(Wp,Hh,'DARK',2)
        # upper window: red standing man ; lower: green walking man
        for (v0,G,mat,on) in [(Hh-17,STAND,'LAMPR',state=='merah'),(3,WALK,'LAMPG',state=='hijau')]:
            tx.rect(1,v0-1,Wp-1,v0+14,'OFF',1)
            if on:
                tx.rect(2,v0,Wp-2,v0+13,'OFF',2); glyph(tx,(Wp-7)//2,v0+1,G,mat,3,True)
                for i in range(Wp): pass
            else:
                glyph(tx,(Wp-7)//2,v0+1,G,mat,0,False)
        tx.rect(0,Hh-2,Wp,Hh,'DARK',3)
        return tx
    return f
def ped_signal(L,state,lamps_front=True):
    """pole at local (0.5,0.5); head faces -b (front) if lamps_front else +b (back, hidden)"""
    c,r=L.cr(0.5,0.5); L.s.ellipse_shadow(c,r,7,3,dx=6)
    L.s.cyl(c,r,0,4,0.1,'CONC',3); L.s.cyl(c,r,4,150,0.05,'DARK',3)
    hb0,hb1=(0.3,0.5) if lamps_front else (0.5,0.7)
    blank=lambda w,h:Tex(w,h,'DARK',3).rect(0,h-2,w,h,'DARK',4)
    if lamps_front:
        L.box(0.3,hb0,0.72,hb1,104,146,'DARK',3,front=ped_head_tex(state),side=blank)
        # visors over each lamp
        L.box(0.3,hb0-0.08,0.72,hb0,141,143,'DARK',2); L.box(0.3,hb0-0.08,0.72,hb0,121,123,'DARK',2)
    else:
        L.box(0.3,hb0,0.72,hb1,104,146,'DARK',3,front=blank,side=blank)
    # push button box (faces the waiting side = opposite to the head)
    bb0,bb1=(0.55,0.68) if lamps_front else (0.32,0.45)
    def btn(w,h):
        tx=Tex(w,h,'YEL',3); disc(tx,w//2,h-8,2,'CONC',4); tx.rect(w//2-1,4,w//2+2,7,'LAMPR' if state=='merah' else 'OFF',4 if state=='merah' else 2,glow=(state=='merah'))
        tx.rect(1,10,w-1,11,'YEL',2); return tx
    L.box(0.4,bb0,0.62,bb1,44,66,'YEL',3,front=btn if not lamps_front else (lambda w,h:Tex(w,h,'YEL',3)),side=lambda w,h:Tex(w,h,'YEL',3))
    if lamps_front:  # button face is on the hidden back: show its LED on the visible side strip
        pass
def veh_head_tex(state):
    def f(Wp,Hh):
        tx=Tex(Wp,Hh,'DARK',2); tx.rect(0,0,Wp,Hh,'DARK',2)
        for k,(st,m) in enumerate([('hijau','LAMPG'),('kuning','YEL'),('merah','LAMPR')]):
            cv=7+k*14; on=state==st
            disc(tx,Wp//2,cv,5,'OFF',1)
            disc(tx,Wp//2,cv,4,m,3 if on else 0,on)
            if on: tx.px(Wp//2-2,cv+2,'LITE',4,True)
        return tx
    return f
def veh_signal(L,state,lamps_front=True):
    """pole at local (0.5,0.5) on the curb corner; mast arm 1.4 tiles: toward +a when lamps face the camera (sw/se), toward -a for the back views (ne/nw).
    In game terms: se sprite = far-side pole (r~36.75) arm reaches -r over the road; nw sprite = near-side pole (r~32.3) arm reaches +r."""
    c,r=L.cr(0.5,0.5); L.s.ellipse_shadow(c,r,8,3,dx=8)
    L.s.cyl(c,r,0,6,0.12,'CONC',3); L.s.cyl(c,r,6,196,0.07,'DARK',3)
    if lamps_front: a0,a1,h0,h1=0.5,1.9,1.45,1.85
    else: a0,a1,h0,h1=-0.9,0.5,-0.85,-0.45
    L.box(a0,0.46,a1,0.54,186,192,'DARK',3)
    hb0,hb1=(0.38,0.6) if lamps_front else (0.4,0.62)
    blank=lambda w,h:Tex(w,h,'DARK',3).rect(0,h-2,w,h,'DARK',4)
    L.box(h0,hb0,h1,hb1,138,186,'DARK',3,front=veh_head_tex(state) if lamps_front else blank,side=blank)
    if lamps_front:
        for k in range(3): L.box(h0,hb0-0.1,h1,hb0,148+k*14,150+k*14,'DARK',2)
    # secondary low head on the pole (for the first car in line)
    L.box(0.3,hb0,0.7,hb1,92,140,'DARK',3,front=veh_head_tex(state) if lamps_front else blank,side=blank)
for st in PED_STATES:
    for face,front in (('lampu',True),('belakang',False)):
        pass
def _reg_ped(st):
    @asset(f'lampu_pejalan_{st}','sinyal',1,1,170,oris=('sw','se','ne','nw'),note=f'tiang lampu penyeberangan pejalan kaki, state {st}; tombol seberang kuning')
    def f(L,back=False): ped_signal(L,st,not back)
def _reg_veh(st):
    @asset(f'lampu_lalin_{st}','sinyal',1,1,220,oris=('sw','se','ne','nw'),note=f'tiang lampu lalu lintas kendaraan (lengan + kepala 3 lampu + kepala rendah), state {st}')
    def f(L,back=False): veh_signal(L,st,not back)
for st in PED_STATES: _reg_ped(st)
for st in VEH_STATES: _reg_veh(st)
