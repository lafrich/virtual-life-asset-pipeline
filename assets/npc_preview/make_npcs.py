# Virtual Office - floating astronaut/alien NPC preview. Pure pixel drawing with PIL, no AA.
from PIL import Image, ImageDraw, ImageFont
import math
W, H = 48, 96
def hx(s): s=s.lstrip('#'); return tuple(int(s[i:i+2],16) for i in (0,2,4))
def M(hi, li, mid, sh, line): return dict(c=[hx(hi),hx(li),hx(mid),hx(sh)], line=hx(line))
MAT = {
 'orange': M('#F2A66A','#E0803F','#B8602E','#7E3E22','#4A2416'),
 'red':    M('#D8676A','#B8444A','#8E3038','#5E1F28','#3A1218'),
 'teal':   M('#7CC4B8','#4E9C93','#357570','#22504F','#14302F'),
 'steel':  M('#86A9D2','#5D88BD','#3E6FA8','#2B4E7A','#182D48'),
 'ochre':  M('#D9B867','#B8913A','#8E6E2C','#5F4A22','#382A12'),
 'chrome': M('#F4F7FB','#C5CCD8','#8D97A8','#5A6577','#2A3242'),
 'brass':  M('#FFD166','#E0A526','#C99A2E','#6B5320','#3D2A1E'),
 'glass':  M('#DCE7EE','#7F9DB2','#5D7A90','#46617A','#34495B'),
 'glove':  M('#E7EBF2','#C9CFD9','#9AA4B2','#6B7484','#3A4458'),
 'boot':   M('#5A6577','#3A4458','#2A3242','#1C2330','#0B0E13'),
 'skinL':  M('#F8E2CB','#F1D3B5','#D9A47E','#B9805C','#8A5A3C'),
 'skinD':  M('#C08A63','#A26E4C','#8A5A3C','#6A4029','#3D2418'),
 'skinM':  M('#F1D3B5','#D9A47E','#B47B57','#8A5A3C','#5A3826'),
 'green':  M('#A9D98A','#7DB861','#57914A','#3A6536','#22401F'),
 'lav':    M('#D6C6EA','#B09ACF','#8A72AE','#5B3F73','#36244A'),
 'blonde': M('#F2D98A','#DDB654','#B58A34','#7E5C22','#4A3514'),
 'darkh':  M('#5A4A44','#3E302C','#2C2220','#1C1514','#100B0A'),
 'auburn': M('#C9784A','#A0512F','#7A3A22','#522617','#30150C'),
 'coral':  M('#F4A182','#E8745A','#C25A50','#A9484C','#5E2629'),
 'dark':   M('#3A4458','#1C2330','#1C2330','#10141B','#0B0E13'),
}
REDEYE=hx('#E5484D'); REDDK=hx('#8E1F24'); EYE=hx('#2A3242'); WHITE=hx('#F4F7FB'); GLOW=hx('#FFD166'); EMBER=hx('#FF8A3D')

def disc(cx,cy,rx,ry=None):
    ry=ry or rx; s=set()
    for y in range(int(cy-ry)-1,int(cy+ry)+2):
        for x in range(int(cx-rx)-1,int(cx+rx)+2):
            if ((x+.5-cx)/rx)**2+((y+.5-cy)/ry)**2<=1: s.add((x,y))
    return s
def capsule(a,b,r):
    s=set(); (ax,ay),(bx,by)=a,b
    for y in range(int(min(ay,by)-r)-1,int(max(ay,by)+r)+2):
        for x in range(int(min(ax,bx)-r)-1,int(max(ax,bx)+r)+2):
            px,py=x+.5,y+.5; dx,dy=bx-ax,by-ay; L=dx*dx+dy*dy
            t=0 if L==0 else max(0,min(1,((px-ax)*dx+(py-ay)*dy)/L))
            if (px-ax-t*dx)**2+(py-ay-t*dy)**2<=r*r: s.add((x,y))
    return s
def rect(x0,y0,x1,y1): return {(x,y) for x in range(x0,x1+1) for y in range(y0,y1+1)}

class Canvas:
    def __init__(s): s.px={}; s.parts=[]; s.over={}
    def paint(s,name,mask,mat,shade='cyl',sep=True,selfol=False,outer=True,center=None):
        idx=len(s.parts); m=MAT[mat]; s.parts.append(dict(name=name,mat=m,sep=sep,selfol=selfol,outer=outer))
        mask={p for p in mask if 0<=p[0]<W and 0<=p[1]<H}
        if not mask: return
        rows={}
        for x,y in mask: rows.setdefault(y,[]).append(x)
        xs=[p[0] for p in mask]; ys=[p[1] for p in mask]
        cx,cy=center or ((min(xs)+max(xs)+1)/2,(min(ys)+max(ys)+1)/2)
        rx=max(1,(max(xs)-min(xs)+1)/2); ry=max(1,(max(ys)-min(ys)+1)/2)
        for x,y in mask:
            if shade=='cyl':
                r=rows[y]; w=max(r)-min(r)+1; t=(x-min(r)+.5)/w
                i=1 if t<.42 else 2 if t<.78 else 3
                if w>=5 and .14<=t<.3: i=0
            elif shade=='sphere':
                d=-.62*(x+.5-cx)/rx-.78*(y+.5-cy)/ry
                i=0 if d>.62 else 1 if d>.12 else 2 if d>-.45 else 3
            elif shade=='flat': i=1
            elif shade=='mid': i=2
            else: i=shade
            s.px[(x,y)]=(m['c'][i],idx)
    def dot(s,pts,col,part=None):
        for p in pts:
            if p in s.px: s.px[p]=(col,s.px[p][1] if part is None else part)
            else: s.px[p]=(col,len(s.parts)-1)
    def overlay(s,pts,col):
        for p in pts: s.over[p]=col
    def finalize(s):
        N=[(1,0),(-1,0),(0,1),(0,-1)]
        new=dict(s.px)
        for (x,y),(c,i) in s.px.items():
            P=s.parts[i]
            for dx,dy in N:
                q=s.px.get((x+dx,y+dy))
                if P['sep'] and q and q[1]>i and s.parts[q[1]]['name'].split(':')[0]!=P['name'].split(':')[0]:
                    new[(x,y)]=(P['mat']['line'],i); break
                if P['selfol'] and (q is None or s.parts[q[1]]['name']=='glass'):
                    new[(x,y)]=(P['mat']['line'],i); break
        s.px=new; out=dict(new)
        for y in range(H):
            for x in range(W):
                if (x,y) in new: continue
                best=None
                for dx,dy in N:
                    q=new.get((x+dx,y+dy))
                    if q and s.parts[q[1]]['outer'] and (best is None or q[1]>best[1]): best=q
                if best: out[(x,y)]=(s.parts[best[1]]['mat']['line'],best[1])
        s.px=out
        for p,c in s.over.items(): s.px[p]=(c,0)
    def image(s,dy=0):
        im=Image.new('RGBA',(W,H),(0,0,0,0))
        for (x,y),(c,i) in s.px.items():
            if 0<=x<W and 0<=y+dy<H: im.putpixel((x,y+dy),c+(255,))
        return im

def mirror_pt(p): return (48-p[0],p[1])
ARMS={'relaxed':(((15.5,27),(11.8,37),(10.8,46)),((32.5,27),(36.2,37),(37.2,46))),
      'raiseR':(((15.5,27),(11.8,37),(10.8,46)),((32.5,27),(38.5,33),(40.5,25.5)))}
ARMS['raiseL']=tuple(tuple(mirror_pt(p) for p in a) for a in reversed(ARMS['raiseR']))
LEGS={'dangle':(((20.5,48),(19.8,62),(19.8,74)),((27.5,48),(28.2,62),(28.2,74))),
      'tuckR':(((20.5,48),(19.6,63),(19.4,76)),((27.5,48),(30.2,57),(28.6,67))),
      'together':(((20.5,48),(20.8,62),(22.0,74.5)),((27.5,48),(27.2,62),(26.0,74.5)))}
LEGS['tuckL']=tuple(tuple(mirror_pt(p) for p in a) for a in reversed(LEGS['tuckR']))

def draw_leg(c,side,leg,suit,trim):
    hip,knee,ank=leg
    c.paint('leg%s'%side,capsule(hip,knee,3.3)|capsule(knee,ank,2.9),suit)
    c.paint('leg%s:pad'%side,disc(knee[0],knee[1],2.0,1.5),trim,shade='sphere',sep=False)
    ax,ay=int(round(ank[0]-.5)),int(round(ank[1]))
    boot=rect(ax-3,ay,ax+3,ay+5)|rect(ax-2,ay+6,ax+2,ay+7)
    c.paint('boot%s'%side,boot,'boot')
    c.paint('boot%s:cuff'%side,rect(ax-3,ay-1,ax+3,ay),trim,sep=False)

def draw_arm(c,side,arm,suit,trim):
    sh,el,hd=arm
    c.paint('arm%s'%side,capsule(sh,el,2.7)|capsule(el,hd,2.5),suit)
    cx=el[0]+(hd[0]-el[0])*.72; cy=el[1]+(hd[1]-el[1])*.72
    c.paint('arm%s:cuff'%side,disc(cx,cy,2.6),trim,shade='sphere',sep=False)
    c.paint('glove%s'%side,disc(hd[0],hd[1],2.7),'glove',shade='sphere')

TORSO_HW={24:7,25:8}
for y in range(26,35): TORSO_HW[y]=9
for y in range(35,39): TORSO_HW[y]=8
for y in range(39,45): TORSO_HW[y]=7
for y in range(45,50): TORSO_HW[y]=8
def torso_mask(): return {(x,y) for y,hw in TORSO_HW.items() for x in range(24-hw,24+hw)}

def draw_head(c,kind,skin,hair):
    if kind=='human':
        head=disc(24,14.5,4.7,5.6); c.paint('neck',rect(22,19,25,21),skin,shade=2)
        c.paint('head',head,skin,shade='sphere',selfol=True,sep=False,center=(24,14.5))
        cap={p for p in head if p[1]<=11}
        side={p for p in head if p[1]<=hair[1] and (p[0]<=20 or p[0]>=27)}
        bang={(21,12),(22,12),(25,12),(26,12),(24,12)}
        extra=disc(24,7.6,2.3,1.8) if hair[2]=='bun' else set()
        c.paint('hair',cap|side|bang|extra,hair[0],shade='sphere',selfol=True,center=(24,12))
        c.dot([(22,14),(22,15),(25,14),(25,15)],EYE)
        c.dot([(23,17),(24,17)],MAT[skin]['c'][3])
    elif kind=='green':
        head=disc(24,13.6,5.2,5.6)-{p for p in disc(24,13.6,5.2,5.6) if p[1]>=17 and abs(p[0]+.5-24)>3.6-(p[1]-17)*.6}
        c.paint('head',head,'green',shade='sphere',selfol=True,sep=False,center=(24,13))
        c.paint('neck',rect(22,19,25,21),'green',shade=3)
        for ex in (20,25):
            c.dot([(ex,14),(ex+1,14),(ex+2,14),(ex,15),(ex+1,15)] if ex==20 else [(ex,14),(ex+1,14),(ex+2,14),(ex+1,15),(ex+2,15)],REDEYE)
        c.dot([(20,13),(27,13)],REDDK); c.dot([(21,14),(26,14)],WHITE)
        c.dot([(23,18),(24,18)],MAT['green']['c'][3])
    elif kind=='skull':
        cran=disc(24,13.2,5.3,5.0); jaw=rect(21,16,26,20)
        c.paint('head',cran|jaw,'chrome',shade='sphere',selfol=True,sep=False,center=(23,12))
        for sx in (20,25):
            c.dot([(sx,13),(sx+1,13),(sx+2,13),(sx,14),(sx+1,14),(sx+2,14),(sx+1,15)],MAT['dark']['c'][1])
        c.dot([(21,14),(26,14)],REDEYE); c.dot([(21,13),(26,13)],REDDK)
        c.dot([(23,16),(24,16)],MAT['dark']['c'][0])
        c.dot([(22,19),(24,19),(26,19)],MAT['chrome']['c'][3]); c.dot([(21,18),(22,18),(23,18),(24,18),(25,18),(26,18)],MAT['chrome']['line'])
    elif kind=='lav':
        head=disc(24,14.2,5.0,5.6)
        c.paint('ant',capsule((21,10),(19,6.5),.6)|capsule((27,10),(29,6.5),.6),'lav',shade=3,sep=False)
        c.paint('neck',rect(22,19,25,21),'lav',shade=3)
        c.paint('head',head,'lav',shade='sphere',selfol=True,sep=False,center=(24,14))
        c.dot([(18,6),(19,6),(28,6),(29,6),(18,5),(29,5)],MAT['brass']['c'][1]); c.dot([(18,5),(29,5)],GLOW)
        for ex,ey in ((21,13),(26,13),(23,11)):
            c.dot([(ex,ey),(ex+1,ey),(ex,ey+1),(ex+1,ey+1)],MAT['dark']['c'][1]); c.dot([(ex,ey)],WHITE)
        c.dot([(23,17),(24,17)],MAT['lav']['c'][3])

def accessory(c,kind,where):
    x,y=where
    if kind=='rocket':
        body=rect(x-2,y-6,x+2,y+5)|rect(x-1,y-7,x+1,y-7)
        c.paint('rkt',body,'chrome')
        c.paint('rkt:nose',rect(x-1,y-10,x+1,y-8)|{(x,y-11)},'red',shade='cyl',sep=False)
        c.paint('rkt:fin',rect(x-4,y+2,x-3,y+6)|rect(x+3,y+2,x+4,y+6),'red',sep=False)
        c.paint('rkt:win',disc(x+.5,y-3.5,1.6),'dark',shade='mid',sep=False)
        c.dot([(x,y-4)],MAT['glass']['c'][0])
        c.paint('rkt:fl',rect(x-1,y+6,x+1,y+7)|{(x,y+8),(x,y+9)},'brass',shade=1,sep=False,outer=False)
        c.dot([(x,y+8)],EMBER); c.dot([(x,y+7)],GLOW)
    elif kind=='saturn':
        ring=set()
        for xx in range(x-7,x+8):
            yy=y+int(round((xx-x)*-.28)); ring|={(xx,yy),(xx,yy+1)} if abs(xx-x)<6 else {(xx,yy)}
        back={p for p in ring if p[1]<=y+int(round((p[0]-x)*-.28)) and abs(p[0]-x)<4}
        c.paint('sat:back',back,'brass',shade=3,sep=False)
        c.paint('sat',disc(x+.5,y+.5,3.6),'coral',shade='sphere')
        c.paint('sat:ring',ring-back,'brass',shade='cyl',sep=False)
    elif kind=='bubble':
        for (bx,by,r) in [(x,y,4.6),(x+4,y-7,1.7)]:
            d=disc(bx,by,r); inner=disc(bx,by,r-1.1); ringp=d-inner
            for p in ringp:
                br=(p[0]+.5-bx)+(p[1]+.5-by)
                c.overlay([p],hx('#9FC3D6') if br<1 else hx('#5F86A0'))
            if r>3: c.overlay([(int(bx-2),int(by-2)),(int(bx-1),int(by-3)),(int(bx-3),int(by-1))],WHITE); c.overlay([(int(bx+1),int(by+2))],hx('#CFE3EC'))

def build(spec):
    c=Canvas(); suit,trim=spec['suit'],spec['trim']
    held=spec['acc'] if spec['acc']!='bubble' else None
    if held and spec.get('acc_behind',True): accessory(c,held,spec['acc_at'])
    L,R=LEGS[spec['legs']]
    draw_leg(c,'L',L,suit,trim); draw_leg(c,'R',R,suit,trim)
    c.paint('torso',torso_mask(),suit)
    c.paint('torso:tag',rect(17,27,20,28),'glove',shade=1,sep=False)
    c.dot([(18,28),(20,27)],MAT['dark']['c'][0])
    c.paint('torso:seam',rect(24,38,24,42),suit,shade=3,sep=False)
    c.paint('belt',rect(17,43,30,44),trim,sep=True)
    c.paint('belt:buckle',rect(22,42,25,45),'brass',shade='sphere',sep=False)
    c.paint('port',disc(24,33,4.6),trim,shade='sphere')
    c.paint('port:glass',disc(24,33,2.7),'dark',shade='mid',sep=False)
    c.dot([(23,32)],MAT['glass']['c'][1]); c.dot([(22,32),(23,31)],MAT['glass']['c'][2]); c.dot([(25,34)],spec.get('glowc',EMBER))
    a1,a2=ARMS[spec['arms']]; draw_arm(c,'L',a1,suit,trim); draw_arm(c,'R',a2,suit,trim)
    c.paint('collar',capsule((17.5,22.2),(30.5,22.2),2.3),trim,shade='cyl')
    c.paint('glass',disc(24,13.5,9.1),'glass',shade='sphere',sep=False)
    draw_head(c,spec['head'],spec.get('skin'),spec.get('hair'))
    # helmet specular arc top-left + small bottom-right glint
    arc=[(18,8),(17,9),(19,7),(17,10),(20,6)]
    c.overlay(arc,MAT['glass']['c'][0]); c.overlay([(19,8)],WHITE); c.overlay([(29,19),(30,18)],MAT['glass']['c'][0])
    c.overlay([(23,4),(24,4),(25,4)],MAT[trim]['c'][1])  # tiny helmet crest/vent
    c.finalize()
    b=None
    if spec['acc']=='bubble':
        b=Canvas(); accessory(b,'bubble',spec['acc_at']); b.finalize()
    return c,b

def shadow(frame):
    im=Image.new('RGBA',(W,H),(0,0,0,0)); rx=8.5 if frame==0 else 7.5
    for p in disc(24,91,rx+1.5,2.1): im.putpixel(p,(11,14,19,130))
    for p in disc(24,91,rx-1.5,1.3): im.putpixel(p,(6,8,11,230))
    return im

NPCS=[
 dict(id=1,name='cosmo',suit='orange',trim='chrome',head='human',skin='skinL',hair=('blonde',19,''),arms='raiseR',legs='tuckR',acc='bubble',acc_at=(40,15),
      desc='Astronaut, muted ember-orange jumpsuit, chrome collar + porthole, blonde hair in a glass bubble helmet, reaching for a soap bubble.'),
 dict(id=2,name='rocketta',suit='red',trim='brass',head='human',skin='skinD',hair=('darkh',14,'bun'),arms='raiseL',legs='tuckL',acc='rocket',acc_at=(8,24),
      desc='Astronaut, oxblood-red suit with brass fittings, deep skin, dark hair bun, holding up a mini rocket.'),
 dict(id=3,name='sol',suit='teal',trim='chrome',head='human',skin='skinM',hair=('auburn',14,''),arms='raiseR',legs='together',acc='saturn',acc_at=(40,18),
      desc='Astronaut, muted teal suit, chrome trim, short auburn hair, balancing a tiny coral planet with a brass ring.'),
 dict(id=4,name='zib',suit='chrome',trim='brass',head='green',arms='raiseL',legs='dangle',acc='bubble',acc_at=(8,15),glowc=REDEYE,
      desc='Green alien with red almond eyes in a bubble helmet, full chrome suit with brass ring/belt, a soap bubble drifting by.'),
 dict(id=5,name='klank',suit='steel',trim='chrome',head='skull',arms='raiseR',legs='tuckR',acc='saturn',acc_at=(40,18),glowc=REDEYE,
      desc='Skull-faced silver robot-alien with red eye lights, steel-blue suit, chrome fittings, spinning a ringed planet.'),
 dict(id=6,name='nebi',suit='ochre',trim='chrome',head='lav',arms='raiseR',legs='together',acc='rocket',acc_at=(41,24),
      desc='Three-eyed lavender alien with brass-bulb antennae, ochre/brass-toned suit, chrome trim, carrying a mini rocket.'),
]
BG=hx('#10141B')
def frames(spec):
    c,b=build(spec); out=[]
    for f,dy in ((0,0),(1,-2)):
        im=shadow(f); im.alpha_composite(c.image(dy))
        if b: im.alpha_composite(b.image(0 if f==0 else 1))
        out.append(im)
    return out

font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22)
sm=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15)
S=4; cellw=2*W*S+40; cellh=H*S+50
sheet=Image.new('RGB',(3*cellw+40,2*cellh+70),BG); d=ImageDraw.Draw(sheet)
d.text((24,16),'VIRTUAL OFFICE  ·  FLOATING NPC PREVIEW  ·  frame A / frame B (2px bob)  ·  4x',font=sm,fill=hx('#8D97A8'))
allf={}
for i,sp in enumerate(NPCS):
    fr=frames(sp); allf[sp['id']]=fr
    fr[0].save(f"npc_{sp['id']}_{sp['name']}.png")
    strip=Image.new('RGBA',(2*W,H),(0,0,0,0)); strip.paste(fr[0],(0,0)); strip.paste(fr[1],(W,0)); strip.save(f"npc_{sp['id']}_{sp['name']}_float_2f.png")
    cx=20+(i%3)*cellw; cy=50+(i//3)*cellh
    for k in range(2):
        tile=Image.new('RGBA',(W,H),BG+(255,)); tile.alpha_composite(fr[k])
        sheet.paste(tile.convert('RGB').resize((W*S,H*S),Image.NEAREST),(cx+k*(W*S+12),cy+30))
    d.text((cx,cy),f"{sp['id']}  {sp['name'].upper()}",font=font,fill=hx('#E7EBF2'))
sheet.save('npc_contact_sheet_4x.png')
for nid in (1,5):
    sp=NPCS[nid-1]; g=[]
    for fr in allf[nid]:
        t=Image.new('RGBA',(W,H),BG+(255,)); t.alpha_composite(fr); g.append(t.convert('RGB').resize((W*S,H*S),Image.NEAREST))
    g[0].save(f"npc_{nid}_{sp['name']}_float_4x.gif",save_all=True,append_images=g[1:],duration=380,loop=0)
print('ok')
