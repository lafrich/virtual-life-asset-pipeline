# Pixel XP UI component library (1x, aliased). All drawing on RGBA PIL images.
from PIL import Image, ImageDraw, ImageFont
G='/usr/share/fonts/truetype/dejavu/'
_F={}
def font(sz=11,b=False):
    k=(sz,b)
    if k not in _F: _F[k]=ImageFont.truetype(G+('DejaVuSans-Bold.ttf' if b else 'DejaVuSans.ttf'),sz)
    return _F[k]
def D(im):
    d=ImageDraw.Draw(im); d.fontmode='1'; return d
HOT=[]  # hotspots: (x,y,w,h,target,label)
def hot(x,y,w,h,t,l=''):
    if t: HOT.append((x,y,w,h,t,l))
# ---------- palette ----------
C=dict(
 void='#0B0E13',floor='#10141B',wshd='#2A3242',wlit='#3A4458',wtop='#5A6577',grey='#8D97A8',paper='#E7EBF2',
 brass='#C99A2E',brassl='#E0A526',glow='#FFD166',green='#3DDC84',amber='#F5B941',sky='#5CB8FF',idle='#9AA4B2',err='#E5484D',
 # XP Luna
 xpface='#ECE9D8',xpdark='#0831D9',xpblue='#0A5FE8',xpmid='#2A7BF6',xplight='#4C96FF',xptxt='#000000',xpsh='#0F2E8C',
 xpbtnb='#003C74',xpsel='#316AC5',xpedit='#7F9DB9',xpdis='#ACA899',xptab='#919B9C',orange='#E68B2C',
 start='#3C9A3C',startl='#6CC56C',startd='#2B6F2B',startb='#1D4F1D',
 tray='#0F8DEB',trayd='#1042AF',task='#245EDC',taskl='#3C81F3',taskd='#1941A5',
 xpred='#E35A2F',xpredl='#F08A64',xpredd='#B8361A',balloon='#FFFFE1')
def text(d,x,y,s,col='#000000',sz=11,b=False,anchor='la',sh=None):
    f=font(sz,b)
    if sh: d.text((x+1,y+1),s,fill=sh,font=f,anchor=anchor)
    d.text((x,y),s,fill=col,font=f,anchor=anchor)
def tw(s,sz=11,b=False): return int(font(sz,b).getlength(s))
def wrap(d,x,y,s,w,col='#000',sz=11,b=False,lh=13):
    line=''
    for word in s.split(' '):
        t=(line+' '+word).strip()
        if tw(t,sz,b)>w and line: text(d,x,y,line,col,sz,b); y+=lh; line=word
        else: line=t
    if line: text(d,x,y,line,col,sz,b); y+=lh
    return y
def rbox(d,x,y,w,h,fill=None,ol=None,cut=1):
    """rect with pixel-cut corners (cut=0,1,2)"""
    x1,y1=x+w-1,y+h-1
    if fill:
        d.rectangle([x+1,y+1,x1-1,y1-1],fill=fill)
        if cut==0: d.rectangle([x,y,x1,y1],fill=fill)
    if ol:
        d.line([x+cut,y,x1-cut,y],fill=ol); d.line([x+cut,y1,x1-cut,y1],fill=ol)
        d.line([x,y+cut,x,y1-cut],fill=ol); d.line([x1,y+cut,x1,y1-cut],fill=ol)
        if cut==2:
            for px,py in [(x+1,y+1),(x1-1,y+1),(x+1,y1-1),(x1-1,y1-1)]: d.point((px,py),fill=ol)
    elif fill and cut:
        d.line([x+cut,y,x1-cut,y],fill=fill); d.line([x+cut,y1,x1-cut,y1],fill=fill)
        d.line([x,y+cut,x,y1-cut],fill=fill); d.line([x1,y+cut,x1,y1-cut],fill=fill)
def bands(d,x,y,w,rows):
    for col,n in rows:
        if n>0: d.rectangle([x,y,x+w-1,y+n-1],fill=col); y+=n
    return y
def sunken(d,x,y,w,h,fill='#FFFFFF'):
    d.rectangle([x,y,x+w-1,y+h-1],fill=fill); d.rectangle([x,y,x+w-1,y+h-1],outline=C['xpedit'])
def dim(im,a=150):
    o=Image.new('RGBA',im.size,(11,14,19,a)); im.alpha_composite(o)
# ---------- icons (16x16 primitives) ----------
def _ic(fn):
    im=Image.new('RGBA',(16,16)); d=ImageDraw.Draw(im); fn(d); return im
def _hand(d):
    sk,sd,ol='#F1D3B5','#D9A47E','#8A5A3C'
    for i,(x,t) in enumerate([(4,3),(6,1),(8,1),(10,2)]): d.rectangle([x,t,x+1,9],fill=sk); d.point((x+1,t),fill=sd)
    d.rectangle([4,7,11,13],fill=sk); d.rectangle([2,6,3,10],fill=sk); d.point((3,11),fill=sk)
    d.line([5,14,11,14],fill=sd); d.line([12,8,12,13],fill=sd); d.point((2,6),fill=sd)
def _bag(d):
    d.rectangle([5,2,10,3],outline='#3D2A1E'); d.rectangle([2,4,13,14],fill='#94704F'); d.rectangle([2,4,13,6],fill='#B88A5E')
    d.rectangle([11,7,13,14],fill='#6B4F3A'); d.rectangle([6,8,9,10],fill='#C99A2E'); d.point((7,9),fill='#FFD166')
def _phone(d):
    d.rectangle([4,1,11,14],fill='#2A3242'); d.rectangle([5,3,10,11],fill='#5CB8FF'); d.rectangle([5,3,10,4],fill='#9AD3FF'); d.rectangle([7,12,8,13],fill='#8D97A8')
def _wallet(d):
    d.rectangle([1,4,14,13],fill='#6B4F3A'); d.rectangle([1,4,14,5],fill='#94704F'); d.rectangle([3,2,12,4],fill='#3DDC84'); d.rectangle([9,7,14,10],fill='#3D2A1E'); d.point((11,8),fill='#FFD166'); d.point((12,8),fill='#FFD166')
def _skill(d):
    for i,(h,c) in enumerate([(4,'#3DDC84'),(7,'#F5B941'),(11,'#5CB8FF')]): d.rectangle([2+i*4,14-h,4+i*4,14],fill=c); d.line([2+i*4,14-h,4+i*4,14-h],fill='#FFFFFF')
    d.point((14,2),fill='#FFD166'); d.line([13,2,15,2],fill='#FFD166'); d.line([14,1,14,3],fill='#FFD166')
def _course(d):
    d.rectangle([2,3,13,10],fill='#3A4458'); d.rectangle([3,4,12,9],fill='#5CB8FF'); d.rectangle([4,5,8,5],fill='#FFFFFF'); d.rectangle([4,7,10,7],fill='#E7EBF2')
    d.rectangle([0,11,15,13],fill='#8D97A8'); d.line([0,11,15,11],fill='#E7EBF2')
def _market(d):
    d.rectangle([2,6,13,14],fill='#E7EBF2'); d.rectangle([5,9,8,14],fill='#6B4F3A'); d.rectangle([10,9,12,11],fill='#5CB8FF')
    for i in range(4): d.rectangle([1+i*4-0,2,1+i*4+3,5],fill='#E5484D' if i%2==0 else '#FFFFFF')
def _sofa(d):
    d.rectangle([2,4,13,9],fill='#3E6FA8'); d.rectangle([1,7,14,12],fill='#2F527B'); d.rectangle([3,8,12,9],fill='#5A8FD0'); d.rectangle([2,13,3,14],fill='#3D2A1E'); d.rectangle([12,13,13,14],fill='#3D2A1E')
def _map(d):
    d.polygon([(1,3),(5,1),(10,3),(14,1),(14,12),(10,14),(5,12),(1,14)],fill='#7DC75A'); d.polygon([(5,1),(10,3),(10,14),(5,12)],fill='#5FAE44')
    d.line([1,9,14,6],fill='#E7EBF2'); d.rectangle([8,4,10,6],fill='#E5484D'); d.point((9,7),fill='#E5484D')
def _contacts(d):
    for ox,c in [(7,'#3E6FA8'),(1,'#1F7A55')]: d.ellipse([ox+1,2,ox+6,7],fill='#F1D3B5'); d.rectangle([ox,9,ox+7,14],fill=c); d.rectangle([ox+1,8,ox+6,8],fill=c)
def _profile(d):
    d.rectangle([1,3,14,13],fill='#FFFFFF'); d.rectangle([1,3,14,13],outline='#7F9DB9'); d.rectangle([3,5,7,10],fill='#D9A47E'); d.rectangle([3,5,7,6],fill='#3D2A1E')
    d.line([9,6,12,6],fill='#3A4458'); d.line([9,8,12,8],fill='#8D97A8'); d.line([9,10,11,10],fill='#8D97A8')
def _gear(d):
    d.ellipse([3,3,12,12],fill='#8D97A8')
    for x,y in [(7,0),(7,13),(0,7),(13,7),(2,2),(12,2),(2,12),(12,12)]: d.rectangle([x,y,x+1,y+1] if x not in (7,) and y not in (7,) else [x,y,x+1,y+2] if x==7 else [x,y,x+2,y+1],fill='#8D97A8')
    d.ellipse([5,5,10,10],fill='#3A4458'); d.ellipse([6,6,9,9],fill='#E7EBF2')
def _hunger(d):
    d.ellipse([2,7,13,14],fill='#E7EBF2'); d.rectangle([2,7,13,9],fill='#F5B941'); d.ellipse([4,4,7,8],fill='#F5B941'); d.ellipse([8,3,11,8],fill='#E0A526'); d.line([2,10,13,10],fill='#8D97A8')
def _hyg(d):
    d.polygon([(8,1),(13,9),(8,14),(3,9)],fill='#5CB8FF'); d.ellipse([3,6,13,14],fill='#5CB8FF'); d.point((6,9),fill='#FFFFFF'); d.point((6,10),fill='#FFFFFF')
def _blad(d):
    d.rectangle([4,1,11,5],fill='#E7EBF2'); d.ellipse([2,5,13,12],fill='#FFFFFF'); d.ellipse([4,6,11,10],fill='#5CB8FF'); d.rectangle([5,12,10,14],fill='#E7EBF2'); d.rectangle([4,1,11,1],fill='#8D97A8')
def _energy(d):
    d.polygon([(9,0),(3,9),(7,9),(5,15),(12,6),(8,6)],fill='#F5B941'); d.line([9,0,5,7],fill='#FFD166')
def _coffee(d):
    d.rectangle([3,6,10,14],fill='#FFFFFF'); d.rectangle([4,6,9,7],fill='#6B4F3A'); d.rectangle([11,8,13,11],outline='#FFFFFF'); d.line([5,2,5,4],fill='#B9C0CC'); d.line([8,1,8,4],fill='#B9C0CC')
def _food(d):
    d.ellipse([1,4,14,13],fill='#E0A526'); d.ellipse([2,4,13,10],fill='#F5B941'); d.line([4,7,11,7],fill='#FFD166'); d.rectangle([2,11,13,12],fill='#94704F')
def _bed(d):
    d.rectangle([1,5,3,14],fill='#6B4F3A'); d.rectangle([3,9,14,12],fill='#E7EBF2'); d.rectangle([7,8,14,10],fill='#3E6FA8'); d.rectangle([4,7,6,9],fill='#FFFFFF'); d.rectangle([13,12,14,14],fill='#6B4F3A')
def _shower(d):
    d.line([3,14,3,3],fill='#8D97A8'); d.line([3,3,9,3],fill='#8D97A8'); d.rectangle([8,4,12,5],fill='#B9C0CC')
    for x,y in [(8,8),(10,10),(12,8),(9,12),(11,14),(13,11)]: d.point((x,y),fill='#5CB8FF')
def _box(d):
    d.rectangle([2,4,13,14],fill='#94704F'); d.rectangle([2,4,13,6],fill='#B88A5E'); d.rectangle([7,4,8,14],fill='#E0A526')
def _key(d):
    d.ellipse([1,4,7,10],fill='#E0A526'); d.ellipse([3,6,5,8],fill='#00000000'); d.rectangle([7,6,14,8],fill='#E0A526'); d.rectangle([11,9,12,10],fill='#E0A526'); d.rectangle([13,9,14,11],fill='#C99A2E')
def _vase(d):
    d.rectangle([6,1,9,3],fill='#1F7A55'); d.ellipse([3,4,12,14],fill='#1F7A55'); d.rectangle([4,8,11,9],fill='#E0A526'); d.point((5,6),fill='#7DE0B0')
def _vase2(d):
    _vase(d); d.line([8,4,6,9],fill='#0B0E13'); d.line([6,9,9,13],fill='#0B0E13')
def _bottle(d):
    d.rectangle([6,1,9,3],fill='#3E6FA8'); d.rectangle([4,4,11,14],fill='#9AD3FF'); d.rectangle([4,7,11,10],fill='#3E6FA8'); d.line([5,5,5,13],fill='#FFFFFF')
def _book(d):
    d.rectangle([3,2,13,14],fill='#7A2E35'); d.rectangle([3,2,4,14],fill='#5A1F26'); d.rectangle([6,4,11,6],fill='#E0A526')
def _fart(d):
    for b in [(1,6,8,13),(5,3,12,10),(8,7,15,14)]: d.ellipse(b,fill='#B9D77A')
    d.ellipse([6,5,9,8],fill='#D6EBA3')
def _pee(d):
    d.polygon([(8,1),(13,9),(8,14),(3,9)],fill='#F5D547'); d.ellipse([3,6,13,14],fill='#F5D547'); d.point((6,9),fill='#FFFFFF')
def _emote(d):
    d.ellipse([1,1,14,14],fill='#FFD166'); d.rectangle([5,5,5,7],fill='#3D2A1E'); d.rectangle([10,5,10,7],fill='#3D2A1E'); d.line([4,10,11,10],fill='#3D2A1E'); d.point((3,9),fill='#3D2A1E'); d.point((12,9),fill='#3D2A1E')
def _cancel(d):
    d.ellipse([1,1,14,14],fill='#E5484D'); d.line([5,5,10,10],fill='#FFFFFF',width=2); d.line([5,10,10,5],fill='#FFFFFF',width=2)
def _talk(d):
    d.rectangle([1,2,14,10],fill='#FFFFFF'); d.polygon([(4,10),(4,14),(8,10)],fill='#FFFFFF'); d.rectangle([4,5,5,6],fill='#3A4458'); d.rectangle([7,5,8,6],fill='#3A4458'); d.rectangle([10,5,11,6],fill='#3A4458')
def _coin(d):
    d.ellipse([1,1,14,14],fill='#C99A2E'); d.ellipse([2,1,14,13],fill='#E0A526'); d.ellipse([4,3,12,11],fill='#FFD166'); d.rectangle([7,5,8,9],fill='#C99A2E')
def _school(d):
    d.polygon([(8,1),(15,6),(1,6)],fill='#7A2E35'); d.rectangle([2,6,13,14],fill='#E7EBF2'); 
    for x in (3,6,9,12): d.rectangle([x,8,x,13],fill='#8D97A8')
    d.rectangle([7,10,8,14],fill='#6B4F3A'); d.point((8,4),fill='#FFD166')
def _cert(d):
    d.rectangle([1,3,14,12],fill='#FFF6D5'); d.rectangle([1,3,14,12],outline='#C99A2E'); d.line([3,5,11,5],fill='#8D97A8'); d.line([3,7,9,7],fill='#8D97A8'); d.ellipse([9,8,13,12],fill='#E5484D'); d.rectangle([10,12,12,15],fill='#E5484D')
def _lock(d):
    d.rectangle([5,2,10,7],outline='#8D97A8'); d.rectangle([3,7,12,14],fill='#E0A526'); d.rectangle([7,9,8,11],fill='#6B5320')
def _check(d):
    d.ellipse([1,1,14,14],fill='#3DDC84'); d.line([4,8,6,10],fill='#FFFFFF',width=2); d.line([6,10,11,5],fill='#FFFFFF',width=2)
def _warn(d):
    d.polygon([(8,1),(15,14),(1,14)],fill='#F5B941'); d.rectangle([7,5,8,10],fill='#0B0E13'); d.rectangle([7,12,8,12],fill='#0B0E13')
def _plant(d):
    d.rectangle([5,10,10,14],fill='#94704F'); d.ellipse([2,2,8,9],fill='#3DDC84'); d.ellipse([7,1,13,8],fill='#1F7A55'); d.ellipse([5,4,10,10],fill='#2FBF6F')
def _lamp(d):
    d.polygon([(4,2),(11,2),(13,8),(2,8)],fill='#E0A526'); d.rectangle([7,8,8,13],fill='#6B5320'); d.rectangle([4,13,11,14],fill='#6B5320')
def _tv(d):
    d.rectangle([1,2,14,11],fill='#2A3242'); d.rectangle([2,3,13,10],fill='#3E6FA8'); d.rectangle([4,12,11,14],fill='#6B4F3A')
def _rug(d):
    d.polygon([(8,4),(15,8),(8,12),(1,8)],fill='#E68B2C'); d.polygon([(8,6),(11,8),(8,10),(5,8)],fill='#FFD166')
def _chair(d):
    d.rectangle([4,2,11,8],fill='#3E6FA8'); d.rectangle([3,8,12,10],fill='#2F527B'); d.line([4,11,4,14],fill='#3A4458'); d.line([11,11,11,14],fill='#3A4458')
def _sell(d):
    d.polygon([(2,2),(9,2),(14,7),(8,13),(2,7)],fill='#F5B941'); d.ellipse([4,4,6,6],fill='#FFFFFF')
def _list(d):
    for i in range(4): d.rectangle([1,2+i*3,3,3+i*3],fill='#316AC5'); d.line([5,2+i*3,14,2+i*3],fill='#3A4458')
def _house(d):
    d.polygon([(8,1),(15,8),(1,8)],fill='#E5484D'); d.rectangle([3,8,12,14],fill='#E7EBF2'); d.rectangle([7,10,9,14],fill='#6B4F3A'); d.rectangle([4,9,5,10],fill='#5CB8FF')
def _clock(d):
    d.ellipse([1,1,14,14],fill='#FFFFFF'); d.ellipse([1,1,14,14],outline='#3A4458'); d.line([8,4,8,8],fill='#0B0E13'); d.line([8,8,11,8],fill='#0B0E13')
def _star(d):
    d.polygon([(8,0),(10,5),(15,6),(11,9),(12,15),(8,12),(4,15),(5,9),(1,6),(6,5)],fill='#F5B941'); d.polygon([(8,2),(9,6),(7,6)],fill='#FFD166')
def _rotate(d):
    d.arc([2,2,13,13],30,330,fill='#316AC5',width=2); d.polygon([(10,0),(14,3),(10,6)],fill='#316AC5')
def _move(d):
    d.line([8,1,8,14],fill='#316AC5',width=2); d.line([1,8,14,8],fill='#316AC5',width=2)
    for p in [[(8,0),(5,3),(11,3)],[(8,15),(5,12),(11,12)],[(0,8),(3,5),(3,11)],[(15,8),(12,5),(12,11)]]: d.polygon(p,fill='#316AC5')
def _store(d):
    _box(d); d.polygon([(8,0),(12,4),(4,4)],fill='#316AC5')
def _music(d):
    d.rectangle([5,2,13,3],fill='#3A4458'); d.line([6,2,6,12],fill='#3A4458'); d.line([13,2,13,10],fill='#3A4458'); d.ellipse([2,10,6,14],fill='#3A4458'); d.ellipse([9,8,13,12],fill='#3A4458')
def _globe(d):
    d.ellipse([1,1,14,14],fill='#5CB8FF'); d.ellipse([4,3,9,9],fill='#3DDC84'); d.ellipse([9,8,12,12],fill='#3DDC84'); d.arc([1,1,14,14],0,360,fill='#3E6FA8')
ICONS={k:_ic(v) for k,v in dict(hand=_hand,bag=_bag,phone=_phone,wallet=_wallet,skill=_skill,course=_course,market=_market,sofa=_sofa,map=_map,
 contacts=_contacts,profile=_profile,gear=_gear,hunger=_hunger,hygiene=_hyg,bladder=_blad,energy=_energy,coffee=_coffee,food=_food,bed=_bed,shower=_shower,
 box=_box,key=_key,vase=_vase,vase2=_vase2,bottle=_bottle,book=_book,fart=_fart,pee=_pee,emote=_emote,cancel=_cancel,talk=_talk,coin=_coin,school=_school,
 cert=_cert,lock=_lock,check=_check,warn=_warn,plant=_plant,lamp=_lamp,tv=_tv,rug=_rug,chair=_chair,sell=_sell,list=_list,house=_house,clock=_clock,star=_star,
 rotate=_rotate,move=_move,store=_store,music=_music,globe=_globe).items()}
def icon(im,name,x,y,s=1,grey=False):
    x,y=int(x),int(y); i=ICONS[name]
    if grey:
        g=i.convert('LA').convert('RGBA'); a=i.split()[3].point(lambda v:v*0.55); g.putalpha(a); i=g
    if s>1: i=i.resize((16*s,16*s),Image.NEAREST)
    im.alpha_composite(i,(x,y))
# ---------- components ----------
def close_btn(im,x,y,state='normal',target=None):
    d=D(im); face={'normal':C['xpred'],'hover':'#F07A50','pressed':C['xpredd']}[state]
    rbox(d,x,y,21,21,fill=face,ol='#FFFFFF',cut=2)
    if state!='pressed': d.line([x+2,y+2,x+18,y+2],fill=C['xpredl']); d.line([x+2,y+3,x+2,y+12],fill=C['xpredl'])
    d.line([x+3,y+18,x+18,y+18],fill=C['xpredd']) if state!='pressed' else None
    for o in (0,1):
        d.line([x+6+o,y+6,x+14+o,y+14],fill='#FFFFFF'); d.line([x+14+o,y+6,x+6+o,y+14],fill='#FFFFFF')
    hot(x,y,21,21,target,'Tutup')
TITLE=[(C['xpdark'],1),('#4C96FF',2),('#2A7BF6',3),('#0B5DE6',12),('#0A55DA',3),('#0A49C8',1)]
def window(im,x,y,w,h,title,ic=None,close=None):
    d=D(im)
    d.rectangle([x,y+4,x+w-1,y+h-1],fill=C['xpblue'])
    yy=y
    for i,(col,n) in enumerate(TITLE):
        for k in range(n):
            ins=[4,2,1,1][yy-y] if yy-y<4 else 0
            d.line([x+ins,yy,x+w-1-ins,yy],fill=col); yy+=1
    # corner outline pixels
    for (px,py) in [(x+2,y+1),(x+3,y+1),(x+1,y+2),(x+w-3,y+1),(x+w-4,y+1),(x+w-2,y+2)]: d.point((px,py),fill=C['xpdark'])
    d.line([x,y+3,x,y+h-1],fill=C['xpdark']); d.line([x+w-1,y+3,x+w-1,y+h-1],fill=C['xpdark']); d.line([x,y+h-1,x+w-1,y+h-1],fill=C['xpdark'])
    d.line([x+1,y+22,x+1,y+h-2],fill=C['xpmid']); d.line([x+w-2,y+22,x+w-2,y+h-2],fill='#0A49C8'); d.line([x+1,y+h-2,x+w-2,y+h-2],fill='#0A49C8')
    d.rectangle([x+4,y+22,x+w-5,y+h-5],fill=C['xpface'])
    tx=x+7
    if ic: icon(im,ic,x+5,y+3); tx=x+25
    text(d,tx,y+5,title,'#FFFFFF',11,True,sh=C['xpsh'])
    close_btn(im,x+w-26,y+1,target=close)
    return (x+4,y+22,w-8,h-26)
def button(im,x,y,w,h,label,state='normal',ic=None,target=None,sz=11,b=False):
    d=D(im); dis=state=='disabled'
    ol=C['xpdis'] if dis else C['xpbtnb']
    if state=='pressed': rows=[('#CDCAC3',2),('#E2E0D8',h-4),('#ECEAE3',2)]
    elif dis: rows=[('#F5F4EA',h)]
    else: rows=[('#FFFFFF',2),('#F7F6F2',max(0,h//2-2)),('#EEEDE5',h-h//2-4),('#DCD8CE',1),('#D0CBBF',1)]
    bands(d,x,y,w,rows); rbox(d,x,y,w,h,ol=ol,cut=2)
    # clear corners
    if state in('hover','default'):
        c1,c2=('#FDD889','#F8B330') if state=='hover' else ('#CEE7FF','#98B8EA')
        d.line([x+2,y+1,x+w-3,y+1],fill=c1); d.line([x+1,y+2,x+1,y+h-3],fill=c1); d.line([x+2,y+2,x+w-3,y+2],fill=c1)
        d.line([x+w-2,y+2,x+w-2,y+h-3],fill=c2); d.line([x+2,y+h-2,x+w-3,y+h-2],fill=c2); d.line([x+2,y+h-3,x+w-3,y+h-3],fill=c2)
    col=C['xpdis'] if dis else '#000000'
    tws=tw(label,sz,b)+(20 if ic else 0); tx=x+(w-tws)//2+(1 if state=='pressed' else 0); ty=y+(h-sz)//2-1+(1 if state=='pressed' else 0)
    if ic: icon(im,ic,tx,y+(h-16)//2,grey=dis); tx+=20
    text(d,tx,ty,label,col,sz,b)
    if not dis: hot(x,y,w,h,target,label)
def progress(im,x,y,w,h,frac,col='#2BC12B',hi='#A9EBA9',lo='#1E9E1E',bg='#FFFFFF',seg=6,gap=2,ol='#7F9DB9'):
    d=D(im); rbox(d,x,y,w,h,fill=bg,ol=ol,cut=1)
    iw=w-4; n=int(iw*frac); xx=x+2
    while xx<x+2+n:
        e=min(xx+seg-1,x+1+n)
        d.rectangle([xx,y+2,e,y+h-3],fill=col); d.line([xx,y+2,e,y+2],fill=hi) if h>5 else None; d.line([xx,y+h-3,e,y+h-3],fill=lo) if h>6 else None
        xx+=seg+gap
def slot(im,x,y,s=36,ic=None,count=None,sel=False,empty=False,tag=None,target=None):
    d=D(im)
    fill='#C1D2EE' if sel else ('#F4F3EE' if empty else '#EEF4FF')
    d.rectangle([x,y,x+s-1,y+s-1],fill=fill,outline=C['xpsel'] if sel else C['xpedit'])
    if sel: d.rectangle([x+1,y+1,x+s-2,y+s-2],outline=C['xpsel'])
    if not empty: d.line([x+1,y+s-2,x+s-2,y+s-2],fill='#E3E1D8') if not sel else None
    if ic: icon(im,ic,x+(s-32)//2,y+(s-32)//2,2) if s>=36 else icon(im,ic,x+(s-16)//2,y+(s-16)//2)
    if count:
        t=str(count); w_=tw(t,9,True)+4; d.rectangle([x+s-w_-2,y+s-12,x+s-3,y+s-3],fill='#0A246A'); text(d,x+s-w_,y+s-13,t,'#FFFFFF',9,True)
    if tag:
        d.rectangle([x+2,y+2,x+2+tw(tag,8,True)+3,y+11],fill=C['brass']); text(d,x+4,y+1,tag,'#FFFFFF',8,True)
    hot(x,y,s,s,target,'slot')
def tabs(im,x,y,labels,active,w=None,pw=None,ph=None):
    d=D(im); xx=x; hs=[]
    for i,l in enumerate(labels):
        tw_=w or tw(l)+18; on=i==active
        ty=y if on else y+2; th=20 if on else 18
        d.rectangle([xx,ty,xx+tw_-1,y+19],fill='#FCFCFE' if on else '#F2F1EA'); rbox(d,xx,ty,tw_,th+1 if on else th,ol=C['xptab'],cut=1)
        if on: d.line([xx+1,ty,xx+tw_-2,ty],fill=C['orange']); d.line([xx,ty+1,xx+tw_-1,ty+1],fill='#FFC73C'); d.line([xx,ty+2,xx+tw_-1,ty+2],fill='#FFC73C')
        text(d,xx+(tw_-tw(l,11,on))//2,ty+4,l,'#000',11,on)
        hs.append((xx,ty,tw_,th)); xx+=tw_-1
    if pw:
        d.rectangle([x,y+20,x+pw-1,y+20+ph-1],fill='#FCFCFE',outline=C['xptab'])
        a=hs[active]; d.line([a[0]+1,y+20,a[0]+a[2]-2,y+20],fill='#FCFCFE')
    return hs
def row(im,x,y,w,h=22,cells=(),sel=False,alt=False,dis=False):
    d=D(im); d.rectangle([x,y,x+w-1,y+h-1],fill=C['xpsel'] if sel else ('#F3F6FB' if alt else '#FFFFFF'))
    for cx,s,kw in cells:
        if isinstance(s,tuple) and s[0]=='icon': icon(im,s[1],x+cx,y+(h-16)//2,grey=dis); continue
        col=kw.get('col','#000'); col='#FFFFFF' if sel else (C['xpdis'] if dis else col)
        anchor='ra' if kw.get('r') else 'la'
        text(d,x+cx,y+(h-11)//2-1,s,col,kw.get('sz',11),kw.get('b',False),anchor=anchor)
def groupbox(im,x,y,w,h,label):
    d=D(im); rbox(d,x,y+6,w,h-6,ol='#D0D0BF',cut=1); d.rectangle([x+6,y,x+10+tw(label),y+12],fill=C['xpface']); text(d,x+8,y,label,'#0046D5',11)
def balloon(im,x,y,w,h,title,body=None,ic='warn',tail='down',tx=None):
    d=D(im); rbox(d,x,y,w,h,fill=C['balloon'],ol='#000000',cut=2)
    t=tx if tx is not None else x+20
    if tail=='down': d.polygon([(t,y+h-1),(t+12,y+h-1),(t,y+h+10)],fill=C['balloon']); d.line([t,y+h-1,t,y+h+10],fill='#000'); d.line([t,y+h+10,t+12,y+h-1],fill='#000')
    if ic: icon(im,ic,x+6,y+5)
    text(d,x+26,y+6,title,'#000',11,True)
    if body: wrap(d,x+26,y+21,body,w-34,'#000',10,lh=12)
def disc(im,cx,cy,r,body,light,dark,border):
    s=2*r+1; m=Image.new('L',(s,s),0); ImageDraw.Draw(m).ellipse([0,0,s-1,s-1],fill=255)
    lay=Image.new('RGBA',(s,s)); ld=ImageDraw.Draw(lay)
    ld.ellipse([0,0,s-1,s-1],fill=border); ld.ellipse([2,2,s-3,s-3],fill=dark); ld.ellipse([2,2,s-3,s-5],fill=body)
    ld.ellipse([int(s*.18),3,int(s*.62),int(s*.42)],fill=light)
    im.alpha_composite(lay,(cx-r,cy-r))
def round_btn(im,cx,cy,r,ic,kind='blue',label=None,s=2,grey=False,target=None,lab_col='#FFFFFF'):
    pal={'blue':(C['xpmid'],'#5AA0FF','#0A55DA',C['xpdark']),'green':(C['start'],C['startl'],C['startd'],C['startb']),
         'grey':('#B9C0CC','#E7EBF2','#8D97A8','#5A6577'),'red':(C['err'],'#F08A8D','#A4373C','#6E2024'),'dark':('#3A4458','#5A6577','#2A3242','#0B0E13')}[kind]
    disc(im,cx,cy,r,*pal); icon(im,ic,cx-8*s,cy-8*s-1,s,grey=grey)
    if label:
        d=D(im); text(d,cx,cy+r+2,label,lab_col,10,True,anchor='ma',sh='#0B0E13')
    hot(cx-r,cy-r,2*r,2*r,target,label or ic)
def nameplate(im,cx,y,name,role=None):
    d=D(im); w=max(tw(name,10,True),tw(role or '',9))+10; h=26 if role else 15; x=cx-w//2
    d.rectangle([x,y,x+w-1,y+h-1],fill=C['floor'],outline=C['brass']); text(d,x+5,y+2,name,C['paper'],10,True)
    if role: text(d,x+5,y+13,role,C['grey'],9)
    d.polygon([(cx-3,y+h),(cx+3,y+h),(cx,y+h+3)],fill=C['brass'])
def prompt(im,cx,y,label,ic='hand'):
    d=D(im); w=tw(label,11,True)+30; x=cx-w//2
    rbox(d,x,y,w,20,fill=C['floor'],ol=C['brass'],cut=1); icon(im,ic,x+4,y+2); text(d,x+23,y+4,label,C['glow'],11,True)
def chip(im,x,y,label,ic):
    d=D(im); w=tw(label,10,True)+26; rbox(d,x,y,w,20,fill=C['floor'],ol=C['brass'],cut=1); icon(im,ic,x+3,y+2); text(d,x+21,y+5,label,C['glow'],10,True); return w
def need_bar(im,x,y,ic,frac,col):
    d=D(im); rbox(d,x,y,84,18,fill=C['floor'],ol='#2A3242',cut=1); icon(im,ic,x+2,y+1)
    progress(im,x+20,y+5,60,8,frac,col=col,hi=col,lo=col,bg='#2A3242',seg=4,gap=1,ol='#5A6577')
def money_pill(im,x,y,amount,target=None):
    d=D(im); w=tw(amount,11,True)+30
    rbox(d,x,y,w,22,fill=C['tray'],ol=C['trayd'],cut=2); d.line([x+2,y+1,x+w-3,y+1],fill='#5CB8FF')
    icon(im,'coin',x+5,y+3); text(d,x+24,y+5,amount,'#FFFFFF',11,True,sh=C['trayd']); hot(x,y,w,22,target,'Dompet'); return w
def avatar_card(im,x,y,portrait,name,lvl,frac,target=None):
    d=D(im); w=150; h=40
    rbox(d,x,y,w,h,fill=C['task'],ol=C['taskd'],cut=2); d.line([x+2,y+1,x+w-3,y+1],fill=C['taskl']); d.line([x+2,y+h-2,x+w-3,y+h-2],fill='#1A4BC0')
    d.rectangle([x+4,y+4,x+35,y+35],fill='#9AD3FF',outline='#FFFFFF'); im.alpha_composite(portrait,(x+5,y+5))
    text(d,x+42,y+5,name,'#FFFFFF',11,True,sh=C['taskd']); text(d,x+42,y+20,lvl,'#E7EBF2',10,True,sh=C['taskd'])
    progress(im,x+80,y+22,62,8,frac,bg='#10141B',ol='#0C2F8C',seg=4,gap=1); hot(x,y,w,h,target,'Profil')
def minimap(im,x,y,s=72,target=None):
    d=D(im); rbox(d,x,y,s,s,fill='#7DC75A',ol=C['xpdark'],cut=2); d.rectangle([x+1,y+1,x+s-2,y+s-2],outline='#4C96FF')
    d.rectangle([x+2,y+30,x+s-3,y+38],fill='#8D97A8'); d.rectangle([x+30,y+2,x+38,y+s-3],fill='#8D97A8')
    for bx,by,c in [(6,6,'#E7EBF2'),(44,6,'#E5484D'),(6,44,'#F5B941'),(44,46,'#5CB8FF')]: d.rectangle([x+bx,y+by,x+bx+18,y+by+18],fill=c)
    d.polygon([(x+34,y+30),(x+31,y+37),(x+37,y+37)],fill='#FFFFFF'); d.point((x+34,y+34),fill=C['xpsel'])
    d.rectangle([x+s-12,y+3,x+s-4,y+12],fill=C['xpdark']); text(d,x+s-11,y+2,'N','#FFFFFF',9,True); hot(x,y,s,s,target,'Peta')
def joystick(im,cx,cy,r=34,disabled=False):
    disc(im,cx,cy,r,'#2A3242','#3A4458','#1C2330','#5A6577')
    d=D(im); col='#5A6577' if disabled else '#8D97A8'
    for p in [[(cx,cy-r+5),(cx-4,cy-r+10),(cx+4,cy-r+10)],[(cx,cy+r-5),(cx-4,cy+r-10),(cx+4,cy+r-10)],[(cx-r+5,cy),(cx-r+10,cy-4),(cx-r+10,cy+4)],[(cx+r-5,cy),(cx+r-10,cy-4),(cx+r-10,cy+4)]]: d.polygon(p,fill=col)
    if disabled: disc(im,cx,cy,13,'#5A6577','#8D97A8','#3A4458','#2A3242')
    else: disc(im,cx+4,cy-3,13,'#D6D3CE','#FFFFFF','#A5A29B','#5A6577')
