# Y2K Windows-style pixel icons, drawn in a 32-unit space and rendered natively at 32 and 16 px.
# Each icon gets the same "system icon" pass: auto outline (dark tint of the fill, or black),
# light top-left inner edge, dark bottom-right inner edge, hard 1-2 px drop shadow.
from PIL import Image, ImageDraw
def hx(c):
    c=c.lstrip('#'); return tuple(int(c[i:i+2],16) for i in (0,2,4))
def mix(a,b,t):
    a,b=hx(a) if isinstance(a,str) else a, hx(b) if isinstance(b,str) else b
    return tuple(int(round(a[i]+(b[i]-a[i])*t)) for i in range(3))
CLEAR=(0,0,0,0)
class IC:
    def __init__(s,n): s.n=n; s.k=n/32; s.im=Image.new('RGBA',(n,n)); s.d=ImageDraw.Draw(s.im)
    def p(s,v): return int(round(v*s.k))
    def P(s,ps): return [(s.p(x),s.p(y)) for x,y in ps]
    def rect(s,x0,y0,x1,y1,c):
        a,b=s.p(x0),s.p(y0); s.d.rectangle([a,b,max(a,s.p(x1)),max(b,s.p(y1))],fill=c)
    def ell(s,x0,y0,x1,y1,c):
        a,b=s.p(x0),s.p(y0); s.d.ellipse([a,b,max(a+1,s.p(x1)),max(b+1,s.p(y1))],fill=c)
    def poly(s,ps,c): s.d.polygon(s.P(ps),fill=c)
    def line(s,ps,c,w=1): s.d.line(s.P(ps),fill=c,width=max(1,s.p(w)) if w>1 else 1)
    def px(s,x,y,c): s.d.point((s.p(x),s.p(y)),fill=c)
    def big(s): return s.n>=32
    def vgrad(s,x0,y0,x1,y1,c1,c2):
        """vertical 4-step gradient with checker dither between steps (Win9x feel)"""
        a,b,e,f=s.p(x0),s.p(y0),s.p(x1),s.p(y1); h=max(1,f-b)
        cols=[mix(c1,c2,t/3) for t in range(4)]
        for y in range(b,f+1):
            lv=(y-b)/h*3; i=int(lv); fr=lv-i
            for x in range(a,e+1):
                j=min(3,i+1) if (fr>0.5 and (x+y)%2==0) else i
                s.im.putpixel((x,y),cols[min(3,j)]+(255,))
def style(im,ol=None,hl=0.5,sh=0.7,shadow=True):
    w,h=im.size; src=im.load()
    A=lambda x,y: 0<=x<w and 0<=y<h and src[x,y][3]>0
    out=Image.new('RGBA',(w,h)); o=out.load()
    for y in range(h):
        for x in range(w):
            if not A(x,y): continue
            r,g,b,a=src[x,y]
            if hl and (not A(x-1,y) or not A(x,y-1)): r,g,b=mix((r,g,b),(255,255,255),hl)
            elif sh and (not A(x+1,y) or not A(x,y+1)): r,g,b=int(r*sh),int(g*sh),int(b*sh)
            o[x,y]=(r,g,b,255)
    for y in range(h):
        for x in range(w):
            if A(x,y): continue
            nb=[src[x+dx,y+dy] for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)) if A(x+dx,y+dy)]
            if nb:
                if ol: o[x,y]=hx(ol)+(255,)
                else:
                    r=sum(c[0] for c in nb)//len(nb); g=sum(c[1] for c in nb)//len(nb); b=sum(c[2] for c in nb)//len(nb)
                    o[x,y]=(int(r*.32),int(g*.32),int(b*.36),255)
    if shadow:
        base=out.copy(); bl=base.load(); sd=Image.new('RGBA',(w,h)); sl=sd.load()
        offs=[(1,1,110)]+([(2,2,60)] if w>=32 else [])
        for dx,dy,al in offs:
            for y in range(h):
                for x in range(w):
                    if bl[x,y][3] and 0<=x+dx<w and 0<=y+dy<h and not bl[x+dx,y+dy][3] and not sl[x+dx,y+dy][3]:
                        sl[x+dx,y+dy]=(0,0,0,al)
        sd.alpha_composite(out); out=sd
    return out
# ---------------- drawings (32-unit space) ----------------
def bag(s):  # backpack
    s.rect(13,1,19,2,'#5A3A1E'); s.rect(12,2,13,5,'#5A3A1E'); s.rect(19,2,20,5,'#5A3A1E')
    s.ell(5,4,27,16,'#C98A4B')
    s.vgrad(5,10,27,29,'#C98A4B','#8F5A2B') if s.big() else s.rect(5,10,27,29,'#B5763C')
    s.rect(9,16,23,28,'#9C6532'); s.rect(9,16,23,18,'#B5763C') if s.big() else None
    s.rect(15,18,17,22,'#E0A526')
    if s.big(): s.line([(7,9),(7,27)],'#7A4A22'); s.line([(25,9),(25,27)],'#7A4A22'); s.px(15,18,'#FFE08A')
def hand(s):  # Windows link-select hand cursor
    W='#FFFFFF'
    s.rect(12,2,15,17,W); s.rect(16,10,18,19,W); s.rect(19,11,21,19,W); s.rect(22,13,24,20,W)
    s.poly([(5,16),(8,14),(12,18),(12,22)],W); s.rect(10,17,24,26,W); s.rect(11,26,23,29,W)
    if s.big():
        for x in (16,19,22): s.line([(x,14),(x,18)],'#9A9A9A')
        s.line([(13,29),(22,29)],'#C8C8C8')
def hunger(s):
    s.line([(18,1),(24,13)],'#8A5A3C',2); s.line([(23,1),(27,12)],'#6B4228',2)
    s.ell(4,11,28,22,'#F5B941')
    if s.big():
        for y in (14,17): s.line([(8,y),(12,y+1),(16,y),(20,y+1),(24,y)],'#D8961E')
    s.ell(3,14,29,30,'#FFFFFF'); s.rect(3,13,29,19,CLEAR); s.ell(4,11,28,21,'#F5B941') if not s.big() else None
    if s.big():
        s.ell(5,11,27,20,'#F5B941')
        for y in (13,16): s.line([(8,y),(12,y+1),(16,y),(20,y+1),(24,y)],'#D8961E')
    s.rect(4,20,28,21,'#3E6FA8'); s.rect(12,28,20,30,'#D9D9D9')
def hygiene(s):
    s.poly([(3,20),(9,15),(27,15),(21,20)],'#BFE6FF'); s.rect(3,20,21,28,'#5CB8FF'); s.poly([(21,20),(27,15),(27,23),(21,28)],'#3E8FD0')
    s.ell(16,2,27,13,'#DDF1FF'); s.ell(7,5,15,13,'#DDF1FF'); s.ell(24,12,30,18,'#DDF1FF') if s.big() else None
    if s.big(): s.px(19,5,'#FFFFFF'); s.px(9,7,'#FFFFFF'); s.rect(7,22,15,23,'#9AD3FF')
def bladder(s):
    s.rect(5,3,14,16,'#F4F4F4'); s.rect(5,3,14,4,'#D0D0D0'); s.rect(10,7,12,8,'#9A9A9A')
    s.ell(7,13,29,22,'#FFFFFF'); s.ell(11,15,25,20,'#5CB8FF'); s.poly([(12,21),(25,21),(22,29),(15,29)],'#F0F0F0')
def energy(s):  # battery (Power Options)
    s.rect(3,9,26,24,'#C8C8C8'); s.rect(27,13,29,20,'#8D8D8D')
    s.rect(5,11,24,22,'#2A3242'); s.rect(5,11,18,22,'#3DDC84')
    if s.big(): s.rect(5,11,18,12,'#9BF0C0')
    s.poly([(17,6),(10,18),(15,18),(13,27),(21,14),(16,14)],'#FFD166')
def phone(s):  # Nokia 3310-ish handset
    s.vgrad(9,1,23,30,'#3E5A9C','#1F2E5A') if s.big() else s.rect(9,1,23,30,'#2B3A67')
    s.rect(11,4,21,14,'#C9D1B0'); s.rect(12,5,20,13,'#9DB37A')
    if s.big():
        s.line([(13,7),(19,7)],'#3F4E2A'); s.line([(13,10),(17,10)],'#3F4E2A'); s.line([(14,2),(18,2)],'#0F1730')
        s.ell(12,16,20,19,'#D0D4DC')
        for yy in (21,24,27):
            for xx in (12,15,18): s.rect(xx,yy,xx+2,yy+1,'#AEB6C6')
    else:
        s.rect(13,17,19,18,'#D0D4DC'); s.rect(12,22,20,26,'#AEB6C6')
def coin(s):
    for i,y in enumerate((24,20,16)):
        s.ell(2,y,20,y+7,'#C99A2E'); s.ell(2,y-1,20,y+5,'#FFD166')
    s.ell(13,4,30,21,'#C99A2E'); s.ell(13,3,29,20,'#E0A526'); s.ell(16,6,26,17,'#FFD166')
    if s.big(): s.rect(20,8,22,15,'#C99A2E'); s.line([(19,9),(23,9)],'#C99A2E')
def map_(s):
    s.poly([(2,7),(11,3),(11,27),(2,30)],'#8BD067'); s.poly([(11,3),(21,7),(21,30),(11,27)],'#62B046'); s.poly([(21,7),(30,3),(30,26),(21,30)],'#8BD067')
    s.line([(2,22),(11,17),(21,21),(30,15)],'#F4E7C5',2 if s.big() else 1)
    s.ell(17,3,26,12,'#E5484D'); s.poly([(18,9),(25,9),(21,17)],'#E5484D'); s.ell(20,6,23,9,'#FFFFFF')
def user(s):
    s.ell(4,17,28,40,'#3E6FA8'); s.rect(0,31,31,31,CLEAR) if False else None
    s.ell(10,3,22,16,'#F1C9A0'); s.ell(10,2,22,9,'#3D2A1E'); s.rect(10,6,22,7,'#3D2A1E')
    s.poly([(13,18),(16,23),(19,18)],'#FFFFFF')
    # cut bottom to keep 1px margin
    s.d.rectangle([0,s.p(30),s.n-1,s.n-1],fill=CLEAR)
def talk(s):
    s.ell(2,3,29,22,'#FFFFFF'); s.poly([(7,18),(6,28),(14,20)],'#FFFFFF')
    for x in (9,15,21): s.rect(x,11,x+2,13,'#316AC5')
def coffee(s):
    if s.big(): s.line([(11,2),(12,4),(11,6)],'#B9C0CC'); s.line([(16,1),(17,3),(16,5)],'#B9C0CC')
    s.ell(3,25,27,30,'#D0D0D0'); s.ell(19,12,27,22,'#FFFFFF'); s.ell(21,14,25,20,CLEAR)
    s.rect(7,9,21,27,'#FFFFFF'); s.ell(7,7,21,12,'#6B4F3A')
def food(s):
    s.ell(2,13,30,29,'#FFFFFF'); s.ell(6,15,26,27,'#EDEDED')
    s.ell(7,12,19,23,'#FAFAF0'); s.ell(15,15,27,24,'#FFFFFF'); s.ell(18,17,23,21,'#F5B941')
    if s.big(): s.px(10,16,'#C8C8B8'); s.px(13,18,'#C8C8B8'); s.rect(8,23,11,24,'#3DDC84')
def chair(s):
    s.rect(10,2,22,15,'#3E6FA8'); s.poly([(6,16),(26,16),(28,20),(4,20)],'#2F527B')
    s.rect(15,20,17,25,'#8D97A8'); s.line([(6,26),(26,26)],'#5A6577',2)
    for x in (5,15,25): s.rect(x,28,x+2,29,'#1C2330')
def bed(s):
    s.rect(2,8,6,28,'#8A5A3C'); s.rect(6,17,29,23,'#FFFFFF'); s.rect(13,15,29,24,'#3E6FA8')
    if s.big(): s.line([(13,18),(29,18)],'#5A8FD0')
    s.ell(7,12,15,19,'#F4F4F4'); s.rect(27,24,29,29,'#8A5A3C'); s.rect(3,28,5,29,'#8A5A3C')
def box(s):
    s.poly([(3,12),(18,17),(18,30),(3,25)],'#C8935A'); s.poly([(18,17),(29,11),(29,24),(18,30)],'#A0703F')
    s.poly([(3,12),(14,7),(29,11),(18,17)],'#E2B47A'); s.line([(8,10),(23,14)],'#F4E3B0',2 if s.big() else 1)
def lock(s):
    s.ell(8,2,24,20,'#9AA4B2'); s.ell(11,5,21,18,CLEAR)
    s.vgrad(5,13,27,29,'#FFD166','#C99A2E') if s.big() else s.rect(5,13,27,29,'#E0A526')
    s.ell(14,17,18,21,'#4A3410'); s.rect(15,20,17,25,'#4A3410')
def fart(s):
    for b in [(2,12,17,27),(10,5,25,20),(16,13,30,28)]: s.ell(*b,'#A8D06A')
    if s.big(): s.ell(13,8,18,12,'#D6EBA3'); s.ell(5,15,9,19,'#D6EBA3')
def pee(s):
    s.ell(7,12,25,30,'#F5D547'); s.poly([(16,2),(8,19),(24,19)],'#F5D547')
    if s.big(): s.rect(11,17,12,22,'#FFF2A8')
def emote(s):
    s.ell(2,2,29,29,'#FFD166')
    s.rect(10,10,12,14,'#3D2A1E'); s.rect(19,10,21,14,'#3D2A1E')
    s.line([(8,19),(11,22),(20,22),(23,19)],'#3D2A1E',1)
def cancel(s):
    s.ell(2,2,29,29,'#E5484D'); s.line([(10,10),(21,21)],'#FFFFFF',3); s.line([(10,21),(21,10)],'#FFFFFF',3)
def warn(s):
    s.poly([(16,2),(30,28),(2,28)],'#F5C842'); s.rect(15,10,17,20,'#000000'); s.rect(15,23,17,25,'#000000')
def info(s):
    s.ell(2,2,29,29,'#2A7BF6'); s.rect(14,13,17,24,'#FFFFFF'); s.rect(14,7,17,10,'#FFFFFF')
def check(s):
    s.ell(2,2,29,29,'#3C9A3C'); s.line([(8,16),(13,21),(23,10)],'#FFFFFF',3)
def clock(s):
    s.ell(2,2,29,29,'#3E6FA8'); s.ell(5,5,26,26,'#FFFFFF')
    s.line([(16,8),(16,16)],'#000000'); s.line([(16,16),(21,19)],'#000000')
    if s.big():
        for x,y in ((16,6),(16,25),(6,16),(25,16)): s.px(x,y,'#3E6FA8')
def hourglass(s):
    s.rect(7,2,25,5,'#8A5A3C'); s.rect(7,27,25,30,'#8A5A3C')
    s.poly([(9,6),(23,6),(17,16),(23,26),(9,26),(15,16)],'#DDF1FF')
    s.poly([(11,8),(21,8),(16,14)],'#E0A526'); s.poly([(16,19),(22,25),(10,25)],'#E0A526')
def key(s):
    s.ell(2,10,14,22,'#E0A526'); s.ell(5,13,11,19,CLEAR)
    s.rect(13,14,29,17,'#E0A526'); s.rect(22,17,24,21,'#C99A2E'); s.rect(26,17,29,22,'#C99A2E')
def book(s):
    s.rect(6,3,26,29,'#9C2F3A'); s.rect(6,3,9,29,'#6E1F28'); s.rect(23,5,26,28,'#F4F0E0'); s.rect(12,8,20,11,'#E0A526')
def bottle(s):
    s.rect(13,2,19,6,'#3E6FA8'); s.rect(12,6,20,9,'#BFE6FF'); s.rect(9,9,23,29,'#9AD3FF'); s.rect(9,15,23,22,'#3E6FA8')
    if s.big(): s.line([(11,10),(11,28)],'#E6F5FF')
def house(s):
    s.rect(21,5,24,12,'#7A2E35'); s.poly([(16,2),(30,15),(2,15)],'#C0392B')
    s.rect(6,15,26,29,'#F1E3C4'); s.rect(14,20,18,29,'#8A5A3C'); s.rect(8,18,12,22,'#5CB8FF'); s.rect(20,18,24,22,'#5CB8FF')
def work(s):  # briefcase
    s.rect(11,5,21,7,'#3D2A1E'); s.rect(11,7,13,10,'#3D2A1E'); s.rect(19,7,21,10,'#3D2A1E')
    s.vgrad(3,10,28,27,'#8A5A3C','#5A3A1E') if s.big() else s.rect(3,10,28,27,'#6E4A2C')
    s.line([(3,17),(28,17)],'#3D2A1E'); s.rect(14,15,17,19,'#E0A526')
OUTLINE={'hand':'#000000','warn':'#5A4300','cancel':'#7A1515','check':'#1D4F1D','info':'#0A246A'}
DEFS=dict(bag=bag,hand=hand,hunger=hunger,hygiene=hygiene,bladder=bladder,energy=energy,phone=phone,coin=coin,map=map_,user=user,talk=talk,
 coffee=coffee,food=food,chair=chair,bed=bed,box=box,lock=lock,fart=fart,pee=pee,emote=emote,cancel=cancel,warn=warn,info=info,check=check,
 clock=clock,hourglass=hourglass,key=key,book=book,bottle=bottle,house=house,work=work)
_cache={}
def get(name,n=32):
    k=(name,n)
    if k not in _cache:
        s=IC(n); DEFS[name](s)
        _cache[k]=style(s.im,ol=OUTLINE.get(name),hl=0 if name=='hand' else 0.45)
    return _cache[k]
def grey(img):
    g=img.convert('LA').convert('RGBA'); px=g.load(); a=img.split()[3]
    out=Image.new('RGBA',img.size); o=out.load(); al=a.load()
    for y in range(img.height):
        for x in range(img.width):
            if al[x,y]: v=px[x,y][0]; v=int(150+v*0.35); o[x,y]=(v,v-2,v-8,min(al[x,y],200))
    return out
