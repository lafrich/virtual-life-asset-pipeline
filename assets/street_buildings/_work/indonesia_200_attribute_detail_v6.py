"""Semesta / ATRIBUT KOTA — authored detail pass (v6).

Adds recognizable 1x native isometric surface features to *existing* Indonesia
200 street objects. Semantic details, not procedural grain or resized billboards.
The approved material ramps, Loc coordinates, pivots, alpha and real pixel-depth
renderer remain canonical. Called after the original individual scene recipe.
"""
from __future__ import annotations
import math
from indonesia_200_quality import box, pole, ball
from lib import Tex

SCOPE={'jalan','pasar','rumah','budaya','gerobak','publik'}

def b(L,a,z0,z1,m='DARK',w=.09,y=.095,d=.10,t=3):
    box(L,a,y,a+w,y+d,z0,z1,m,t)

def pin(L,a,y,z,material='CONC'):
    box(L,a,y,a+.064,y+.075,z,z+2,material,4)

def twin_bolts(L,a,z,span=.55,mat='CONC',y=.09):
    pin(L,a,y,z,mat)
    pin(L,a+span,y,z,mat)

def warning(L,a,z,y=.08):
    # Electrical cabinet / service-panel indicator: inset rectangle + toggle.
    box(L,a,y,a+.24,y+.13,z,z+14,'YEL',3)
    box(L,a+.075,y-.012,a+.15,y+.095,z+3,z+9,'DARK',2)
    pin(L,a+.09,y-.020,z+11,'RED')

def grille(L,xa,xb,z0,z1,rows=5,y=.09):
    # Vent slots in recess, with 1x bright lip and dark cavity.
    for i in range(rows):
        z=z0+i*(z1-z0)/max(1,rows-1)
        box(L,xa,y,xb,y+.05,z,z+2,'DARK',1)
        box(L,xa,y+.047,xb,y+.078,z+2,z+3,'CONC',4)

def braces(L,x0,x1,y,z,mat='CONC'):
    for k in range(3):
        x=x0+k*(x1-x0)/3
        box(L,x,y,x+.035,y+.16,z+k%2,z+k%2+16,mat,3)

def street(L,k,n):
    W,D=L.W,L.D
    mid=W*.5
    if k=='halte':
        # Platform, shelter glazing, benches, route map and bolts.
        for x in (.42,W*.69):
            b(L,x,37,41,'WOOD',.44,D-.20,.10)
            b(L,x,31,37,'DARK',.07,D-.20,.09)
            pin(L,x+.06,D-.22,41,'CONC')
        box(L,W*.70,D-.29,W*.92,D-.19,61,91,'CREAM',3)
        for i in range(4):
            box(L,W*.73,D-.31,W*.86,D-.28,65+i*5,67+i*5,
                'BLUE' if i%2 else 'GREEN',3)
        for x in (.16,W-.22):
            for z in (15,75,104):
                pin(L,x,D-.32,z,'CONC')
        if 'transjakarta' in n:
            box(L,.29,.13,W*.66,.29,0,5,'YEL')
            for i in range(6):
                pin(L,.37+i*.26,.12,5,'DARK')
    elif k=='pos':
        # Guard booth edges + ticket slot, door handle and roof fasteners.
        box(L,W*.73,.10,W*.78,.25,22,68,'CONC')
        b(L,W*.75,40,45,'LITE',.046,.08,.09)
        grille(L,.34,.77,12,23,3)
        box(L,W*.44,.09,W*.66,.23,61,65,'DARK')
        for x in (.23,W-.33):pin(L,x,.17,112)
    elif k in ('portal','gapura'):
        for x in (.18,W-.30):
            box(L,x,.09,x+.16,.25,7,19,'DARK',3)
            pin(L,x+.04,.075,23,'LITE')
            pin(L,x+.045,.09,105,'CONC')
        for i in range(5):
            x=.32+i*(W-.65)/5
            box(L,x,.11,x+.085,.23,101+i%2*2,104+i%2*2,
                'YEL' if i%2 else 'WHITE')
        if k=='portal':
            box(L,.24,.075,.51,.19,31,53,'YEL',3)
            box(L,.31,.069,.39,.15,42,47,'DARK',2)
    elif k=='jalan':
        # Keep ground markings flat, with worn road repair edge.
        for i in range(4):
            x=.26+i*(W-.52)/4
            box(L,x,D*.38,x+.07,D*.61,4,5,'CONC',1)
        pin(L,W*.17,D*.28,3,'YEL')
        pin(L,W*.78,D*.72,3,'YEL')
    elif k=='blok':
        for x in (.31,W*.78):
            box(L,x,.11,x+.055,D-.12,16,20,'SENG',3)
            pin(L,x,.10,22,'LITE')
        box(L,.12,.085,W-.16,.20,35,37,'YEL',3)
    elif k=='cone':
        x=mid
        box(L,x-.40,D*.32,x+.40,D*.69,0,4,'DARK',3)
        for a in (x-.30,x+.24):
            for z in (4,6):pin(L,a,D*.30,z,'CONC')
        for z in (22,35,48):
            box(L,x-.13,D*.35,x+.13,D*.65,z,z+3,'WHITE')
            pin(L,x-.025,D*.33,z+3,'LITE')
    elif k in ('lampu','tiang','toa','bts'):
        # Service hatch, clamp rings, insulators and underside reflector.
        x=mid
        box(L,x-.17,D*.38,x+.20,D*.66,19,37,'DARK')
        box(L,x-.11,D*.35,x+.14,D*.43,23,33,'CONC',2)
        pin(L,x-.09,D*.33,35)
        pin(L,x+.09,D*.33,20)
        for z in (15,46,79):
            box(L,x-.10,D*.39,x+.10,D*.60,z,z+2,'SENG')
        if k=='lampu':
            box(L,x+.20,D*.39,x+.58,D*.51,109,113,'WARM',4)
            pin(L,x+.32,D*.38,114,'LITE')
        if 'kabel' in n:
            box(L,x+.20,D*.48,x+.44,D*.55,104,109,'DARK')
            for z in (96,101):
                pin(L,x+.31,D*.45,z,'CONC')
    elif k in ('gardu','trafo'):
        # PLN cabinet panels, realistic vents and porcelain insulators.
        grille(L,.28,W-.28,18,38,5)
        warning(L,W*.65,54)
        for z in (47,70,89):
            twin_bolts(L,.25,z,max(.2,W-.55),'CONC')
        for a in (.32,W*.77):
            box(L,a,D*.53,a+.06,D*.65,97,110,'DARK')
            ball(L,a,D*.56,110,.11,5,'CREAM')
    elif k in ('papan','banner','baliho'):
        for x in (.22,W-.28):
            for z in (93,111,120):pin(L,x,.07,z,'CONC')
        box(L,.15,.077,W-.16,.14,91,93,'DARK')
        box(L,.20,.078,W-.18,.14,117,119,'LITE')
        if k=='banner':
            box(L,W*.79,.09,W*.86,.22,104,107,'RED')
    elif k=='hidran':
        x=mid
        box(L,x-.28,D*.33,x+.28,D*.68,5,10,'DARK')
        for a in (x-.22,x+.20):
            pin(L,a,D*.31,9,'CONC')
        for z in (29,33):
            box(L,x-.17,D*.27,x+.17,D*.72,z,z+3,'RED')
        ball(L,x,D*.5,64,.12,6,'SENG')
        box(L,x+.11,D*.45,x+.38,D*.53,24,32,'SENG')
    elif k=='sampah':
        boxes(L,'CONC',52)
    else:
        # Street-level fixture without its own subrecipe: material seams.
        for a in (W*.22,W*.75):pin(L,a,.09,11,'CONC')

def boxes(L,m,z=48):
    W=L.W;D=L.D
    for i in range(4):
        x=.22+i*(W-.45)/4
        box(L,x,.12,x+.034,.22,8,z,m,3)
    for a in (.16,W-.22):
        pin(L,a,.09,z+3,'LITE')
    box(L,W*.38,.08,W*.61,.17,z*.44,z*.44+6,'CREAM',2)

def market(L,k,n):
    W,D=L.W,L.D
    if k in ('lapak','tenda','payung'):
        # Contextual market: product crate lips and canopy stitch seams.
        for i in range(5):
            x=.28+i*(W-.56)/5
            box(L,x,.10,x+.065,.25,104,108,'CONC')
            pin(L,x,.10,111,'WHITE')
        for i in range(4):
            x=.28+i*(W-.46)/4
            box(L,x,.23,x+.11,.47,26,30,'WOOD')
            pin(L,x+.04,.22,31,'CREAM')
    elif k in ('rak','etalase','freezer'):
        for z in (17,38,61):
            box(L,.17,.12,W-.18,.20,z,z+3,'DARK')
            box(L,.18,.11,W-.18,.17,z+3,z+4,'LITE')
        for i in range(5):
            x=.26+i*(W-.54)/5
            box(L,x,.12,x+.05,.21,46+i%2*3,53+i%2*3,
                'BLUE' if i%2 else 'RED')
        twin_bolts(L,.20,72,W-.46)
    elif k in ('karung','peti','kotak'):
        for i in range(4):
            x=.30+i*(W-.60)/4
            box(L,x,.09,x+.04,.20,27+i%2*5,42+i%2*5,'WOOD',2)
        twin_bolts(L,.25,8,W-.55,'CONC')
    elif k in ('gas','galon'):
        for i in range(3):
            x=.28+i*.58
            ball(L,x,D*.48,42,.13,5,'CONC')
            pin(L,x+.05,D*.33,26,'WHITE')
            b(L,x-.035,13,15,'DARK',.17,D*.32,.06)
    elif k in ('timbangan','penanak','panci','kompor'):
        warning(L,W*.42,28)
        for a in (W*.27,W*.69):pin(L,a,.12,9,'SENG')
    elif k in ('kursi','meja','bangku'):
        for x in (.28,W-.38):
            box(L,x,.13,x+.08,.22,13,17,'DARK')
        for i in range(3):
            x=.22+i*(W-.45)/3
            box(L,x,.08,x+.035,D-.15,38,40,'WOOD')
    elif k=='sampah' or k=='gerobak':
        boxes(L,'SENG',61)

def home(L,k,n):
    W,D=L.W,L.D
    if k in ('pagar','kanopi'):
        for i in range(7):
            x=.17+i*(W-.32)/7
            box(L,x,.13,x+.035,.25,62+i%2*2,65+i%2*2,'SENG')
        for a in (.20,W-.25):
            pin(L,a,.10,75,'CONC')
    elif k in ('toren','pompa'):
        for z in (19,35,58):
            box(L,W*.28,D*.25,W*.72,D*.33,z,z+2,'DARK',2)
        box(L,W*.73,D*.45,W*.88,D*.54,29,35,'CONC')
        for i in range(3):
            pin(L,W*.34+i*.12,D*.24,65,'CREAM')
    elif k in ('antena','parabola'):
        for z in (31,62,86):
            box(L,W*.38,D*.43,W*.60,D*.57,z,z+2,'SENG')
        for i in range(3):
            pin(L,W*.40+i*.13,D*.32,102+i*2,'LITE')
    elif k in ('sangkar','kandang'):
        for i in range(7):
            x=.19+i*(W-.40)/7
            box(L,x,.11,x+.025,.26,64,102,'DARK')
        box(L,.14,.095,W-.14,.21,47,50,'WOOD')
        for a in (.23,W-.32):pin(L,a,.08,54,'CONC')
    elif k in ('kotak','papan'):
        warning(L,W*.46,46)
        twin_bolts(L,.24,14,W-.54)
    elif k=='jemuran':
        for i in range(4):
            x=.31+i*(W-.54)/4
            box(L,x,.10,x+.06,.23,91,98,'DARK')
            pin(L,x,.095,100,'CREAM')
    elif k in ('wudhu','sumur'):
        for i in range(3):
            x=.33+i*.50
            box(L,x,.10,x+.08,.20,38,44,'OGLASS')
        box(L,.18,.09,W-.19,.19,5,8,'CONC')
    elif k in ('bangku','rak'):
        for i in range(7):
            x=.22+i*(W-.41)/7
            box(L,x,.10,x+.055,.23,35,38,'WOOD')
        for z in (7,41):
            twin_bolts(L,.21,z,W-.51)
    elif k=='sampah':
        boxes(L,'DARK',57)
    elif k=='pot':
        for i in range(5):
            a=.35+i*(W-.64)/5
            ball(L,a,D*.42,35+i%2*5,.075,4,'GREEN')

def culture(L,k,n):
    W,D=L.W,L.D
    if k in ('tenda','panggung','pendopo','booth','gapura'):
        # Sewn fabric / roof fastening and bent steel support plates.
        for i in range(7):
            x=.21+i*(W-.43)/7
            pin(L,x,.11,117,'CREAM')
            box(L,x,.14,x+.06,.24,107,111,'DARK')
        for x in (.25,W-.30):
            box(L,x,.12,x+.12,.22,8,16,'CONC')
    elif k in ('banner','baliho','papan'):
        for z in (93,109,120):
            twin_bolts(L,.21,z,W-.47)
        box(L,.15,.10,W-.15,.18,88,91,'DARK')
    elif k in ('bendera','umbul'):
        for z in (24,62,100):
            box(L,.25,D*.42,.44,D*.58,z,z+3,'SENG')
        pin(L,.26,D*.43,116,'CREAM')
    elif k in ('toa','speaker'):
        grille(L,.23,W-.28,42,75,7)
        for a in (.26,W-.34):
            pin(L,a,.09,95,'CONC')
    elif k in ('rak','meja','kursi'):
        market(L,k,n)
    elif k in ('wastafel','bedug'):
        for x in (W*.28,W*.70):
            pin(L,x,.10,33,'SENG')
        box(L,W*.43,.09,W*.59,.19,65,70,'CONC')
    elif k in ('sangkar','pinang'):
        for z in (32,68,102):
            box(L,W*.43,D*.36,W*.60,D*.59,z,z+3,'WOOD')

def cart(L,k,n):
    W,D=L.W,L.D
    if k=='gerobak':
        # Wheel hub bolts, upper counter trim, hanging utensil hooks.
        for a in (.43,W-.48):
            pin(L,a,D*.28,18,'LITE')
            pin(L,a+.045,D*.29,19,'SENG')
        for i in range(6):
            x=.20+i*(W-.40)/6
            box(L,x,.08,x+.045,.16,46,52,'WOOD',2)
            pin(L,x,.10,55,'CONC')
        box(L,.17,.10,W-.19,.17,91,95,'SENG',3)
        for a in (.29,W-.36):
            box(L,a,.09,a+.07,.24,69,83,'DARK')
    elif k in ('gas','panci','penanak','kompor','nampan'):
        market(L,k,n)
    elif k in ('bangku','meja','lampu'):
        market(L,k,n)
    else:
        for x in (.25,W-.35):pin(L,x,.09,32,'DARK')

def public(L,k,n):
    W,D=L.W,L.D
    if k in ('booth','pos'):
        # ATM and shelter signage with separate display vs hardware.
        box(L,W*.48,.065,W*.71,.17,43,66,'DARK')
        box(L,W*.51,.058,W*.67,.13,51,59,'FBLUE')
        box(L,W*.53,.054,W*.62,.12,47,49,'YEL')
        for i in range(3):
            pin(L,W*.50+i*.065,.055,42+i%2,'CONC')
        twin_bolts(L,.27,112,W-.55)
    elif k=='pommini':
        box(L,.36,.09,W*.70,.20,52,71,'DARK')
        box(L,.42,.085,W*.63,.15,60,67,'LITE')
        box(L,W*.64,.07,W*.76,.15,27,54,'DARK')
        box(L,W*.67,.07,W*.72,.16,23,26,'SENG')
        twin_bolts(L,.22,97,W-.48,'CONC')
    elif k in ('sampah','gerobak'):
        boxes(L,'CONC',66)
    elif k=='bts':
        for z in (22,51,80,108):
            box(L,.22,D*.35,W-.20,D*.39,z,z+3,'DARK')
            box(L,.20,D*.64,W-.20,D*.69,z+3,z+6,'CONC')
        for i in range(3):
            a=.34+i*.45
            box(L,a,D*.41,a+.04,D*.56,130,142,'WHITE')
    elif k in ('basket','lapangan'):
        for i in range(9):
            a=.31+i*(W-.60)/9
            box(L,a,D*.45,a+.025,D*.52,64,98,'WHITE')
        for z in (73,86):
            box(L,.25,D*.48,W-.25,D*.53,z,z+2,'CONC')
    elif k in ('papan','sangkar'):
        home(L,k,n)

def refine(L,s):
    """Only the physical small/city attributes, never transport or buildings."""
    if s.get('group')!='prop':return False
    c=s.get('category')
    if c not in SCOPE:return False
    k=s['kind'];n=s['label'].lower()
    if c=='jalan':street(L,k,n)
    elif c=='pasar':market(L,k,n)
    elif c=='rumah':home(L,k,n)
    elif c=='budaya':culture(L,k,n)
    elif c=='gerobak':cart(L,k,n)
    elif c=='publik':public(L,k,n)
    return True
