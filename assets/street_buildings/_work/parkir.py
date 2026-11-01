"""parked matic scooters (motor parkir), 5 colours x 4 directions, same engine / materials as gang.motor. PREVIEW ONLY."""
from lib import *
def scooter(L,a,b,col='BAGK',seat='BAGK',helmet=None):
    """matic scooter, long axis along a (front at small a): wheels, floorboard, rear body with side stripe, seat, front shield,
    handlebar + mirrors, head lamp, tail lamp, kickstand lean; flat shadow"""
    s=L.s
    def wheel(aa):
        for th in np.linspace(0,2*np.pi,90):
            for rr_ in np.linspace(0,0.16,7):
                for bb in (b+0.13,b+0.19):
                    c,r=L.cr(aa+rr_*np.cos(th),bb); s.points(c,r,8+rr_*32*np.sin(th)+np.zeros(1),'BAGK' if rr_>0.1 else 'CONC',1 if rr_>0.1 else 3)
    wheel(a+0.2); wheel(a+1.12)
    L.box(a+0.36,b+0.07,a+0.98,b+0.25,8,16,col,3)                       # floorboard
    L.box(a+0.36,b+0.07,a+0.98,b+0.25,16,17,'DARK',2)                   # foot mat
    L.box(a+0.74,b+0.04,a+1.2,b+0.28,12,30,col,3,front=lambda w,h:Tex(w,h,col,3).rect(0,h//2,w,h//2+2,'LITE',4).rect(w-4,h-8,w,h-4,'RED',2))
    L.box(a+1.18,b+0.08,a+1.24,b+0.24,22,28,'RED',3)                    # tail lamp
    L.box(a+0.72,b+0.05,a+1.15,b+0.27,30,34,seat,2)                     # seat
    L.box(a+0.24,b+0.06,a+0.4,b+0.26,10,38,col,3,front=lambda w,h:Tex(w,h,col,3).rect(0,h-10,w,h-8,'DARK',2))   # front shield
    L.box(a+0.26,b+0.08,a+0.36,b+0.24,4,10,col,2)                       # front fender
    L.box(a+0.2,b+0.0,a+0.3,b+0.32,38,42,'DARK',3)                      # handlebar
    for bb in (b+0.01,b+0.27): L.box(a+0.24,bb,a+0.27,bb+0.04,42,50,'DARK',2)   # mirrors
    L.box(a+0.18,b+0.11,a+0.24,b+0.21,30,37,'LITE',4)                   # head lamp
    if helmet: c,r=L.cr(a+0.9,b+0.16); s.dome(c,r,34,0.1,6,helmet,3)
    c,r=L.cr(a+0.7,b+0.16); s.ellipse_shadow(c,r,26,6,dx=4)
for nm,col,seat,hel,note in [('hitam','BAGK','BAGK',None,'hitam'),('merah','RED','BAGK','DARK','merah, helm hitam di jok'),('biru','BLUE','BAGK',None,'biru'),
                             ('putih','WHITE','BAGK','RED','putih, helm merah di jok'),('abu','CONC','BAGK',None,'abu-abu')]:
    def f(L,col=col,seat=seat,hel=hel): scooter(L,0.3,0.35,col,seat,hel)
    asset(f'motor_matic_{nm}','parkir',2,1,64,oris=('sw','se','ne','nw'),note=f'motor matic parkir {note} (sumbu panjang searah W; ne/nw = membelakangi kamera)')(f)
