# port of the game's outdoor colour grade (index.html gradeRGB / palNear): non-brand outdoor colours pass through this in game
import math
INPAL=["#0B0E13","#15151F","#1C8FA0","#22984C","#2479CC","#267BCD","#2A2438","#2D45B4","#2EC3C3","#3371A7","#35C46A","#3AA6F2","#3B3752","#3D2A1E","#3F63E8","#4C4868","#535969","#5B67AF","#6B4F3A","#6B5320","#766B59","#788197","#7A9FB2","#7C95FF","#84B2F6","#86CCFF","#86E59A","#86EDE6","#8ECDEB","#9A6A3E","#9B866F","#9CE6DE","#9D9A91","#9FE3B4","#A7B2C4","#A9D6F5","#B07A1C","#B2EEE7","#B3EBC4","#B48455","#BAC5E7","#BE2F56","#BFD8E4","#C3AD8D","#C8BC9F","#CEDBFF","#D49A5E","#D4C8AE","#D94B4B","#D9682A","#E8B48C","#E8DEC6","#EABED1","#EE4D72","#F0C08A","#F2B530","#F4EBDA","#FAF3E5","#FF7A5C","#FF8AA2","#FF9440","#FFB394","#FFC2B8","#FFC93C","#FFD0A8","#FFDDBE","#FFE27A","#FFFFFF"]
P=[tuple(int(s[i:i+2],16) for i in (1,3,5)) for s in INPAL]
def lab(r,g,b):
    f=lambda v:(((v/255)+0.055)/1.055)**2.4 if v/255>0.04045 else (v/255)/12.92
    R,G,B=f(r),f(g),f(b)
    x=(R*0.4124+G*0.3576+B*0.1805)/0.95047; y=R*0.2126+G*0.7152+B*0.0722; z=(R*0.0193+G*0.1192+B*0.9505)/1.08883
    t=lambda v: v**(1/3) if v>0.008856 else 7.787*v+16/116
    x,y,z=t(x),t(y),t(z); return (116*y-16,500*(x-y),200*(y-z))
PL=[lab(*c) for c in P]
def near(r,g,b):
    L=lab(r,g,b); return min(zip(PL,P),key=lambda q:(q[0][0]-L[0])**2*1.4+(q[0][1]-L[1])**2+(q[0][2]-L[2])**2)[1]
def grade(h):
    r,g,b=[int(h[i:i+2],16)/255 for i in (1,3,5)]
    mx,mn=max(r,g,b),min(r,g,b); hh=s=0; l=(mx+mn)/2; d=mx-mn
    if d>1e-6:
        s=d/(2-mx-mn) if l>0.5 else d/(mx+mn)
        hh=((g-b)/d+(6 if g<b else 0)) if mx==r else ((b-r)/d+2) if mx==g else ((r-g)/d+4); hh*=60
    s=min(s,0.7)*0.84
    if 80<hh<170: s=min(s,0.5); l=min(l,0.6)*0.9
    l=0.035+l*0.87
    if l>0.72: l=0.72+(l-0.72)*0.8
    q=l*(1+s) if l<0.5 else l+s-l*s; p=2*l-q
    def f(t):
        t=((t+360)%360)/360
        return p+(q-p)*6*t if t<1/6 else q if t<1/2 else p+(q-p)*(2/3-t)*6 if t<2/3 else p
    o=[l,l,l] if s<1e-6 else [f(hh+120),f(hh),f(hh-120)]
    o=[min(1,o[0]*1.03),o[1],o[2]*0.95]; o=[round(max(0,min(1,v))*255) for v in o]
    n=near(*o); return '#%02X%02X%02X'%tuple(round(o[i]*0.7+n[i]*0.3) for i in range(3))
