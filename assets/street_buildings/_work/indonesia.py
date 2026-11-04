"""Indonesia city pack — v6b native isometric assets for Semesta.

Run from repository root:
    python assets/street_buildings/_work/indonesia.py

Uses the canonical street engine (Loc, Tex, depth renderer, palette).
No modifications to older approved assets.
"""
from pathlib import Path
import json
from PIL import Image
from lib import *
from render_native_depth import render as render_depth, GROUPDIR

PACK = [
    ("id_warteg_sederhana", "Warteg pinggir jalan", "building"),
    ("id_bengkel_motor", "Bengkel motor", "building"),
    ("id_laundry_kiloan", "Laundry kiloan", "building"),
    ("id_apotek", "Apotek", "building"),
    ("id_toko_kelontong", "Toko kelontong", "building"),
    ("id_sekolah_sd", "Sekolah dasar negeri", "building"),
    ("id_puskesmas", "Puskesmas", "building"),
    ("id_pasar_rakyat", "Pasar rakyat", "building"),
    ("id_rumah_betawi", "Rumah Betawi", "building"),
    ("id_kantor_kelurahan", "Kantor kelurahan", "building"),
    ("id_gerobak_bakso", "Gerobak bakso", "street"),
    ("id_gerobak_nasgor", "Gerobak nasi goreng", "street"),
    ("id_halte_angkot", "Halte angkot", "street"),
    ("id_pos_satpam", "Pos satpam", "street"),
    ("id_portal_gang", "Portal gang", "street"),
    ("id_papan_nama_jalan", "Papan nama jalan", "street"),
    ("id_bendera_merah_putih", "Bendera Merah Putih", "street"),
    ("id_umbul_umbul", "Umbul-umbul 17 Agustus", "street"),
    ("id_gardu_listrik", "Gardu listrik", "street"),
    ("id_rambu_sekolah", "Rambu zona sekolah", "street"),
]

def shopfront(label, wall='CREAM', band='GREEN', door='GLASS', open_shutter=False, plus=False):
    """Facade textures stay 1x; native Tex lettering is aligned to each iso face."""
    def draw(w, h):
        t = Tex(w, h, wall, 3)
        t.rect(3, 2, w-3, 7, 'CONC', 2)
        if open_shutter:
            t.rect(5, 6, w-5, h-38, 'DARK', 2)
            t.rect(8, 8, w-8, h-42, 'GLASS', 2)
            for k in range(16, max(18, w-12), 14):
                t.rect(k, 10, k+7, 36, 'WOOD', 3)
                t.rect(k, 34, k+8, 39, 'WARM', 3)
        else:
            t.rect(7, 6, w-7, h-41, door, 2)
            for u in range(7,w-7,18):
                t.rect(u,6,u+2,h-41,'DARK',2)
            t.rect(w//2-1,6,w//2+1,h-41,'DARK',2)
            t.rect(w//2+3,24,w//2+5,31,'LITE',4)
        t.rect(0, h-37, w, h-10, band, 2)
        t.rect(0, h-38, w, h-35, 'LITE', 3)
        t.rect(0, h-13, w, h-10, band, 3)
        t.text(w//2, h-29, label, 'LITE', 4, sc=1, bold=True)
        if plus:
            t.rect(w-23,h-33,w-19,h-14,'LITE',4)
            t.rect(w-30,h-25,w-12,h-21,'LITE',4)
        return t
    return draw

def sidewall(w,h,material='CREAM'):
    t=Tex(w,h,material,2)
    for u in range(15,max(16,w-20),32):
        window(t,u,42,16,22,glass='GLASS',mull=True)
    return t

def shop(L,W,D,H,label,wall='CREAM',band='GREEN',op=False,plus=False):
    ground(L,0,0,W,D)
    bshadow(L,0,0.8,W,D,H)
    L.box(0,0.8,W,D,0,H,wall,3,front=shopfront(label,wall,band,open_shutter=op,plus=plus),
          side=lambda w,h: sidewall(w,h,wall))
    L.box(0,0.5,W,0.94,H-39,H-35,'DARK',2)
    roof_flat(L,0,0.8,W,D,H,ph=5,pm='CONC')

@asset('id_warteg_sederhana','kampung',3,3,185,note='warteg sederhana with food display and two low stools')
def warteg(L):
    shop(L,3,3,115,'WARTEG','CREAM','GREEN',op=True)
    L.box(0.35,0.2,2.5,0.65,16,44,'WOOD',3)
    for i,m in enumerate(('ORANGE','GREEN','YEL','TERRA')):
        L.box(0.47+i*.47,0.27,0.8+i*.47,0.5,44,50,m,3)
    for a in (.45,2.25):
        L.box(a,0.12,a+.3,.38,0,19,'RED',3)

@asset('id_bengkel_motor','kampung',4,4,205,note='small motor repair garage, tyres and tools')
def bengkel(L):
    shop(L,4,4,134,'BENGKEL','CONC','BLUE',op=True)
    for a in (.52,1.02):
        c,r=L.cr(a,.25)
        L.s.cyl(c,r,0,25,.3,'DARK',2)
        L.s.cyl(c,r,2,5,.32,'CONC',2)
    L.box(2.7,.22,3.45,.65,0,35,'DARK',3)
    L.box(2.77,.25,3.4,.6,35,37,'WOOD',3)

@asset('id_laundry_kiloan','kampung',3,4,190,note='laundry kiloan shop with visible washers')
def laundry(L):
    shop(L,3,4,124,'LAUNDRY','WHITE','BLUE')
    for a in (.45,1.13,1.81):
        L.box(a,.11,a+.49,.55,0,34,'WHITE',3,
              front=lambda w,h:Tex(w,h,'WHITE',3).rect(4,10,w-4,28,'GLASS',2))
    L.box(2.38,.15,2.84,.7,0,22,'CARD',3)

@asset('id_apotek','jalan',4,4,195,note='urban pharmacy with green cross and glass entrance')
def apotek(L):
    shop(L,4,4,126,'APOTEK','WHITE','GREEN',plus=True)
    L.box(.35,.25,.75,.7,0,34,'WHITE',3)
    for i in range(3):
        L.box(2.9+i*.22,.22,3.1+i*.22,.75,0,22,'GREEN',2)

@asset('id_toko_kelontong','kampung',3,3,180,note='small grocery storefront and outdoor crate stacks')
def kelontong(L):
    shop(L,3,3,111,'TOKO SEMBAKO','CREAM','RED',op=True)
    for a,b,m in ((.3,.2,'CARD'),(1.98,.25,'WOOD'),(2.35,.3,'CARD')):
        L.box(a,b,a+.35,b+.45,0,28,m,3)
    L.box(.4,.16,1.13,.55,25,32,'GREEN',3)

@asset('id_sekolah_sd','jalan',8,5,320,note='two-storey SD school building, repetitive windows and red-white flag')
def sekolah(L):
    W,D,H=8,5,220
    ground(L,0,0,W,D); bshadow(L,0,.7,W,D,H)
    def f(w,h):
        t=Tex(w,h,'CREAM',3)
        for z in (28,120):
            for u in range(13,w-15,42):
                window(t,u,z,26,43,'GLASS',lit=(u//42)%4==1)
        t.rect(0,100,w,110,'CONC',3)
        t.rect(w//2-39,2,w//2+39,84,'DARK',2)
        t.rect(w//2-35,2,w//2+35,79,'GLASS',2)
        t.rect(0,h-31,w,h-10,'RED',2)
        t.text(w//2,h-24,'SEKOLAH DASAR','LITE',4)
        return t
    L.box(0,.7,W,D,0,H,'CREAM',3,front=f,side=lambda w,h:sidewall(w,h,'CREAM'))
    L.box(2.3,.3,5.7,.7,88,94,'CONC',3)
    roof_flat(L,0,.7,W,D,H,ph=10,pm='RED')
    flag(L,7.1,.2,130)

@asset('id_puskesmas','jalan',7,5,300,note='community health clinic, teal sign and accessible entrance')
def puskesmas(L):
    W,D,H=7,5,172
    ground(L,0,0,W,D); bshadow(L,0,.8,W,D,H)
    def f(w,h):
        t=shopfront('PUSKESMAS','WHITE','TEAL',plus=True)(w,h)
        for u in (20,60,140,176):
            if u+24<w:window(t,u,50,23,35,'GLASS')
        return t
    L.box(0,.8,W,D,0,H,'WHITE',3,front=f,side=lambda w,h:sidewall(w,h,'WHITE'))
    L.box(2,.15,5,.9,67,73,'CONC',3)
    roof_flat(L,0,.8,W,D,H,ph=9,pm='WHITE')

@asset('id_pasar_rakyat','jalan',8,6,265,note='market hall, awning stalls and rooftop ventilation')
def pasar(L):
    W,D,H=8,6,156
    ground(L,0,0,W,D); bshadow(L,0,.65,W,D,H)
    def f(w,h):
        t=Tex(w,h,'CREAM',3)
        for i in range(5):
            u=9+i*(w-18)//5
            t.rect(u,6,u+(w-22)//5,76,'DARK',2)
            t.rect(u+3,8,u+(w-25)//5,56,'WOOD',3)
            for v in (19,34,48):
                t.rect(u+4,v,u+(w-29)//5,v+3,['GREEN','ORANGE','CARD'][i%3],3)
        t.rect(0, h-34,w,h-9,'TERRA',2)
        t.text(w//2,h-27,'PASAR RAKYAT','LITE',4)
        return t
    L.box(0,.65,W,D,0,H,'CREAM',3,front=f,side=lambda w,h:sidewall(w,h,'CREAM'))
    for i,m in enumerate(('GREEN','RED','YEL','BLUE','GREEN')):
        L.box(.1+i*1.55,.15,1.53+i*1.55,.65,78,84,m,3)
    roof_flat(L,0,.65,W,D,H,ph=7,pm='SENG')
    for a in (1.6,4,6.2):
        L.box(a,3.5,a+.65,4.8,H,H+20,'SENG',3)

@asset('id_rumah_betawi','kampung',5,4,255,note='urban Betawi house: front veranda and clay-tile gable roof')
def betawi(L):
    W,D,H=5,4,139
    ground(L,0,0,W,D); bshadow(L,0,.75,W,D,H+32)
    def f(w,h):
        t=Tex(w,h,'CREAM',3)
        for u in (17,w-55):
            window(t,u,33,29,40,'WOOD',frame='WOOD',mull=True)
        t.rect(w//2-16,0,w//2+16,76,'WOOD',2)
        t.rect(w//2-12,5,w//2+12,72,'DARK',3)
        t.rect(0,h-13,w,h-9,'WOOD',2)
        return t
    L.box(0,.75,W,D,0,H,'CREAM',3,front=f,side=lambda w,h:sidewall(w,h,'CREAM'))
    L.box(0.12,0.3,4.88,.88,100,106,'WOOD',3)
    for a in (.3,4.6):L.box(a,.35,a+.15,.5,0,103,'WOOD',3)
    L.gable(0,.7,W,D,H,H+29,'TERRA')
    L.box(.3,.16,4.7,.6,0,7,'CONC',3)

@asset('id_kantor_kelurahan','jalan',6,5,260,note='kelurahan office with service windows and formal banner')
def kelurahan(L):
    W,D,H=6,5,169
    ground(L,0,0,W,D); bshadow(L,0,.8,W,D,H)
    def f(w,h):
        t=Tex(w,h,'CREAM',3)
        for u in (13,54,141):
            if u+28<w:window(t,u,43,27,46,'GLASS',mull=True)
        t.rect(w//2-21,2,w//2+21,79,'DARK',2)
        t.rect(0,h-36,w,h-10,'BLUE',2)
        t.text(w//2,h-28,'KELURAHAN','LITE',4)
        return t
    L.box(0,.8,W,D,0,H,'CREAM',3,front=f,side=lambda w,h:sidewall(w,h,'CREAM'))
    L.box(1.4,.2,4.6,.9,88,96,'CONC',3)
    roof_flat(L,0,.8,W,D,H,ph=9,pm='CONC')
    flag(L,5.45,.3,118)

def cart(L,label,accent):
    # Wheel hubs belong at z=8; never shift the whole sprite manually.
    for a in (.45,1.5):
        c,r=L.cr(a,.35)
        L.s.cyl(c,r,0,13,.19,'DARK',2)
        L.s.cyl(c,r,1,3,.12,'CONC',3)
    L.box(.22,.17,1.77,.78,16,42,'WOOD',3)
    L.box(.18,.14,1.81,.8,42,45,'CONC',3)
    L.box(.4,.22,1.54,.69,45,78,'GLASS',2,
          front=lambda w,h:Tex(w,h,'GLASS',2).rect(4,3,w-4,7,'LITE',3))
    L.box(.2,.11,1.8,.19,78,101,accent,3)
    L.box(.2,.77,1.8,.84,78,101,accent,2)
    L.box(.17,.09,1.84,.86,101,106,accent,3)
    t=Tex(48,14,accent,2)
    t.text(24,4,label,'LITE',4)
    L.front(.25,1.75,.1,48,62,t)
    L.box(1.81,.48,2.08,.58,29,32,'WOOD',3)

@asset('id_gerobak_bakso','prop',2.2,1.2,150,oris=('sw','se','ne','nw'),note='mobile meatball noodle cart')
def bakso(L):cart(L,'BAKSO','BLUE')

@asset('id_gerobak_nasgor','prop',2.2,1.2,150,oris=('sw','se','ne','nw'),note='street fried rice cart')
def nasgor(L):cart(L,'NASGOR','RED')

@asset('id_halte_angkot','prop',3,1.5,160,oris=('sw','se','ne','nw'),note='simple open-sided angkot waiting shelter')
def halte(L):
    ground(L,0,0,3,1.5)
    for a in (.2,2.72):
        for b in (.2,1.25):L.box(a,b,a+.08,b+.08,0,111,'CONC',3)
    L.box(0,.1,3,1.45,111,119,'BLUE',3)
    L.box(.3,1.1,2.7,1.35,27,30,'WOOD',3)
    for a in (.45,2.45):L.box(a,1.15,a+.08,1.24,0,26,'DARK',2)
    t=Tex(75,16,'BLUE',2).text(37,4,'ANGKOT','LITE',4)
    L.front(.24,2.76,.12,93,109,t)

@asset('id_pos_satpam','kampung',2,2,155,note='guard station for kampung or office gate')
def satpam(L):
    shop(L,2,2,88,'SATPAM','CONC','BLUE')
    L.box(.2,.14,1.8,.67,24,31,'WOOD',3)

@asset('id_portal_gang','prop',3,.65,160,oris=('sw','se','ne','nw'),note='painted security gate with red/white arm')
def portal(L):
    for a in (.15,2.7):
        L.box(a,.19,a+.12,.4,0,103,'CONC',3)
    L.box(.25,.23,2.8,.35,92,101,'RED',3)
    for i in range(6):
        a=.3+i*.4
        L.box(a,.2,a+.2,.4,94,100,'LITE',4)
    L.box(2.7,.12,2.93,.47,0,110,'CONC',2)

@asset('id_papan_nama_jalan','prop',1,1,170,oris=('sw','se','ne','nw'),note='blue Jakarta street name sign')
def jalan(L):
    c,r=L.cr(.5,.5)
    L.s.cyl(c,r,0,125,.04,'DARK',3)
    L.box(.02,.42,.98,.53,111,140,'BLUE',3,
          front=lambda w,h:Tex(w,h,'BLUE',2).text(w//2,12,'JL SIRIH','LITE',4))
    L.s.ellipse_shadow(c,r,8,3,dx=3)

def flag(L,a,b,h):
    L.box(a,b,a+.08,b+.08,0,h,'CONC',3)
    L.box(a+.07,b,a+.95,b+.07,h-30,h-16,'RED',3)
    L.box(a+.07,b,a+.95,b+.07,h-44,h-30,'LITE',4)

@asset('id_bendera_merah_putih','prop',1.5,1,170,oris=('sw','se','ne','nw'),note='red-white Indonesian national flag')
def bendera(L):
    flag(L,.2,.55,135)
    c,r=L.cr(.75,.5)
    L.s.ellipse_shadow(c,r,12,5,dx=3)

@asset('id_umbul_umbul','prop',1,1,170,oris=('sw','se','ne','nw'),note='Independence Day red-white vertical pennant')
def umbul(L):
    c,r=L.cr(.5,.5)
    L.s.ellipse_shadow(c,r,12,5,dx=3)
    L.box(.35,.4,.42,.48,0,145,'WOOD',2)
    for i in range(7):
        m='RED' if i%2==0 else 'LITE'
        L.box(.42,.39,.84-i*.065,.5,55+i*12,67+i*12,m,3)

@asset('id_gardu_listrik','prop',1.5,1.3,125,note='electricity distribution cabinet with warning triangle')
def gardu(L):
    L.box(.1,.2,1.4,1.2,0,88,'CONC',3,
          front=lambda w,h:Tex(w,h,'CONC',3).rect(5,18,w-5,29,'YEL',3))
    L.box(.1,.2,1.4,1.2,88,94,'DARK',3)
    for a in (.36,.7,1.05):
        L.box(a,.16,a+.06,.21,39,62,'DARK',2)

@asset('id_rambu_sekolah','prop',1,1,160,oris=('sw','se','ne','nw'),note='children crossing / school area warning sign')
def rambu(L):
    c,r=L.cr(.5,.5)
    L.s.cyl(c,r,0,110,.045,'CONC',3)
    L.box(.15,.39,.85,.54,103,131,'YEL',3,
          front=lambda w,h:Tex(w,h,'YEL',3).text(w//2,10,'SD','DARK',1))
    L.s.ellipse_shadow(c,r,8,3,dx=2)

def publish():
    root=Path('assets/street_buildings')
    entries=[]
    for name,label,category in PACK:
        spec=REG[name]
        entry=dict(id=name,file='pipeline:'+name,label=label,group=spec['group'],
                   source='pipeline-street',country='ID',pack='indonesia-v1',note=spec.get('note',''),
                   category=category,footprint=[spec['W'],spec['D']],
                   collision=category=='building',published=True,variants={})
        for ori in spec['oris']:
            img,glow,piv,_=build(name,ori)
            out=root/GROUPDIR[spec['group']]/(name+'_'+ori+'.png')
            out.parent.mkdir(parents=True,exist_ok=True)
            Image.fromarray(img,'RGBA').save(out,optimize=True)
            if glow[...,3].max()>0:
                Image.fromarray(glow,'RGBA').save(out.with_name(out.stem+'__glow.png'),optimize=True)
            size=[int(img.shape[1]),int(img.shape[0])]
            entry['variants'][ori]=dict(file=str(out.relative_to(root)),size=size,
                                        pivot=[int(piv[0]),int(piv[1])])
            with Image.open(out) as check:
                assert check.mode=='RGBA' and check.size==tuple(size) and check.getbbox(),out
            assert 0<=piv[0]<=size[0] and 0<piv[1]<=size[1],(name,ori,piv,size)
            # Same winning geometry, per-pixel depth for the 3D Semesta compositor.
            render_depth(name,ori)
        first=entry['variants'].get('sw') or entry['variants']['se']
        entry.update(size=first['size'],pivot=first['pivot'],
                     width=round(first['size'][0]/50,3),
                     height=round(first['size'][1]/50,3))
        entries.append(entry)
    dest=root/'indonesia_catalog.json'
    dest.write_text(json.dumps(dict(version=1,projection='isometric-2:1',
                  tile=[64,32],palette='v6b-existing-only',assets=entries),
                  indent=2,ensure_ascii=False)+'\n')
    # Dark-background contact sheet: each real 1x sprite, nearest 2x.
    previews=[]
    for e in entries:
        p=root/e['variants']['sw']['file']
        im=Image.open(p).convert('RGBA')
        im.thumbnail((180,180),Image.Resampling.NEAREST)
        previews.append((e['label'],im))
    from PIL import ImageDraw
    cols=5; cellw,cellh=210,230
    sheet=Image.new('RGB',(cols*cellw,((len(previews)+cols-1)//cols)*cellh),(30,38,52))
    draw=ImageDraw.Draw(sheet)
    for i,(name,im) in enumerate(previews):
        x=(i%cols)*cellw+(cellw-im.width)//2
        y=(i//cols)*cellh+8
        sheet.paste(im,(x,y),im)
        draw.text(((i%cols)*cellw+12,(i//cols)*cellh+196),name,fill=(235,240,236))
    sheet.save(root/'indonesia_contact_sheet.png',optimize=True)
    print('Generated',len(entries),'Indonesia assets with',sum(len(x['variants']) for x in entries),
          'native PNG views and matching depth maps')

if __name__=='__main__':publish()
