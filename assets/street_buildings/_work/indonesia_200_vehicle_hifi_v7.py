"""Indonesia 200 transport v7 — individually art-directed 2:1 native pixel vehicles.

20 distinct playable empty-vehicle bodies authored in the approved Loc/Spr engine.
No baked human/child pixels: rider slots stay in indonesia_200_npc_slots.py.
World footprint, existing ID, 4 directions, scale and pivot policy unchanged.
Details are physically attached geometry with true per-pixel depth maps.
"""
from __future__ import annotations
import math
from lib import Tex
from indonesia_200_quality import box as _box, pole as _pole, ball as _ball, shadow as _shadow

TAU=math.tau

def B(L,x0,y0,x1,y1,z0,z1,m='CONC',t=3):
    _box(L,x0,y0,x1,y1,z0,z1,m,t)

def dot(L,x,y,z,m='CONC',r=.05):
    _ball(L,x,y,z,r,3,m,4)

def pole(L,x,y,z0,z1,m='DARK',r=.036):
    _pole(L,x,y,z1,r,m,z0)

def screw(L,x,y,z):
    B(L,x-.026,y-.025,x+.028,y+.027,z,z+2,'SENG',4)

def strip(L,x0,x1,z,m='DARK',y=.105,h=3):
    B(L,x0,y,x1,y+.065,z,z+h,m,3)

def wheel(L,x,y,r=.26,spokes=False):
    """Real rubber shoulder, metal hub, lug nuts, optional bicycle spokes."""
    c,rr=L.cr(x,y)
    L.s.cyl(c,rr,3,18,r,'DARK',2)
    L.s.cyl(c,rr,17,20,r*.72,'CONC',2)
    L.s.cyl(c,rr,20,22,r*.39,'SENG',4)
    L.s.cyl(c,rr,22,23,r*.18,'DARK',2)
    for j in range(5):
        t=j*TAU/5
        xx=x+math.cos(t)*r*.48;yy=y+math.sin(t)*r*.48
        dot(L,xx,yy,22,'LITE',.028)
    if spokes:
        for j in range(10):
            t=j*TAU/10
            xx=x+math.cos(t)*r*.65;yy=y+math.sin(t)*r*.65
            pole(L,xx,yy,14,18,'SENG',.018)
    # Rubber arch/panel above the tire; does not convert into a cuboid wheel.
    B(L,x-r*.65,y-.12,x+r*.67,y+.12,20,24,'DARK',2)

def chassis(L,W,D,paint='CREAM',axles=None):
    axles=axles or (.55,W-.64)
    B(L,.17,.19,W-.16,D-.18,23,43,'DARK',2)
    B(L,.20,.19,W-.20,D-.19,42,48,paint,2)
    # Side running board + rubber guard, front and rear mudguard.
    B(L,.33,.12,W-.32,.20,23,26,'SENG',2)
    for x in axles:
        for y in (D*.23,D*.80):
            wheel(L,x,y,.265)
            B(L,x-.29,.14,x+.29,.22,28,32,'DARK',2)
    for x in (.23,W-.26):
        for y in (.17,D-.23):
            screw(L,x,y,29)

def face_plate(L,label,x0,x1,z,color='BLUE',h=12):
    w=max(24,int((x1-x0)*32))
    tex=Tex(w,h,color,3)
    tex.rect(0,0,w,2,'CREAM',4)
    tex.text(w//2,max(3,h//2-2),label[:15].upper(),'WHITE',4,sc=1)
    L.front(x0,x1,.075,z,z+h,tex,dep=1)

def window_band(L,x0,x1,high=110,low=74,n=4,front=True):
    span=x1-x0
    for j in range(n):
        a=x0+j*span/n+.025
        b=x0+(j+1)*span/n-.075
        if b-a<.045:continue
        B(L,a,.115,b,.27,low,high,'DARK',2)
        B(L,a+.035,.107,b-.025,.20,low+4,high-4,'GLASS',3)
        B(L,a+.045,.102,a+.085,.17,high-15,high-5,'FBLUE',4)
        B(L,a+.035,.100,b-.035,.16,low+7,low+10,'BLUE',2)
        if j<n-1:B(L,b,.106,b+.045,.27,low-2,high+2,'DARK',3)

def road_details(L,W,D,red=False):
    for y in (D*.27,D*.73):
        B(L,W-.29,y-.1,W-.14,y+.10,36,47,'CREAM',4)
        B(L,.12,y-.08,.26,y+.085,36,46,'RED',4)
    B(L,W-.17,D*.39,W-.085,D*.62,26,30,'CONC',4)
    B(L,W-.26,D*.44,W-.11,D*.56,31,34,'DARK',2)
    for x in (.20,W-.20):
        screw(L,x,.17,37)
        screw(L,x,D-.20,37)
    # Reflectors and rubber bumper caps
    for y in (D*.30,D*.70):
        dot(L,W-.22,y,26,'YEL',.040)
    if red:
        B(L,W*.35,.10,W*.48,.19,120,126,'RED',4)
        B(L,W*.50,.10,W*.63,.19,120,126,'BLUE',4)

def mirror(L,W,D):
    for y in (.20,D-.22):
        pole(L,W-.32,y,54,81,'DARK',.03)
        B(L,W-.43,y-.05,W-.24,y+.05,69,79,'DARK',3)
        B(L,W-.39,y-.052,W-.28,y-.01,72,77,'SENG',4)

def van(L,s):
    W,D=L.W,L.D;k=s['kind'];n=s['label'].lower()
    is_angkot=k=='angkot'
    is_ambulance=k=='van'
    is_elf='elf' in n
    bus_city='bus kota' in n
    paint='WHITE' if is_ambulance or is_elf else 'TEAL' if is_angkot else 'BLUE'
    _shadow(L);chassis(L,W,D,paint)
    B(L,.23,.20,W-.25,D-.20,47,108 if is_angkot else 116,paint,3)
    B(L,.25,.17,W-.25,D-.22,107 if is_angkot else 115,
      114 if is_angkot else 123,'CONC' if is_elf else paint,3)
    B(L,.28,.21,W-.28,D-.23,114 if is_angkot else 123,
      118 if is_angkot else 127,'DARK',2)
    # Distinct profiles: long multi-window Elf, wide city-bus sliding doors,
    # angkot lower window with openable side ventilation.
    nwin=3 if is_angkot else 5 if bus_city else 4
    window_band(L,.36,W-.39,109 if is_angkot else 116,75,nwin)
    B(L,.23,D-.28,W-.24,D-.17,76,106,'OGLASS',2)
    for x in (.33,W*.63):
        B(L,x,.105,x+.035,.27,53,75,'DARK',2)
        B(L,x,.102,x+.22,.17,58,62,'CONC',4)
    # Sliding window seal, door track, recessed door handle and side-steps.
    B(L,W*.37,.11,W*.39,.20,45,104,'DARK',2)
    B(L,W*.41,.095,W*.47,.16,57,60,'SENG',4)
    B(L,W*.28,.09,W*.61,.17,42,45,'DARK')
    B(L,W*.31,.09,W*.57,.17,45,47,'CONC')
    for x in (.31,W-.39):
        pole(L,x,D-.26,117,125,'DARK',.045)
        B(L,x-.06,D-.29,x+.06,D-.21,124,126,'SENG',3)
    mirror(L,W,D);road_details(L,W,D,is_ambulance)
    if is_angkot:
        strip(L,.27,W-.30,54,'GREEN',.095,9)
        strip(L,.27,W-.30,65,'YEL',.094,3)
        face_plate(L,'ANGKOT',.36,1.70,53,'BLUE',13)
        for x in (.65,1.62,2.60):
            B(L,x,.08,x+.17,.16,94,100,'DARK')
        B(L,.41,.085,.91,.18,84,92,'FBLUE',4)
        B(L,.30,.10,W-.30,.15,69,72,'DARK',3)
    elif is_elf:
        strip(L,.35,W-.35,61,'TEAL',.085,5)
        strip(L,.43,W-.45,55,'BLUE',.084,2)
        face_plate(L,'ELF TRAVEL',.42,2.18,53,'TEAL',15)
        B(L,W*.28,.14,W*.73,.24,119,121,'DARK')
        for x in (.70,1.7,3.5):
            B(L,x,D*.30,x+.15,D*.71,125,128,'SENG')
    elif bus_city:
        strip(L,.29,W-.29,52,'RED',.083,7)
        strip(L,.31,W-.31,65,'CREAM',.083,4)
        face_plate(L,'BUS KOTA',.46,2.14,55,'BLUE',12)
        # Double-door frame, floor grip and route box.
        for x in (W*.47,W*.67):
            B(L,x,.085,x+.045,.19,47,110,'DARK')
        B(L,W*.48,.083,W*.66,.19,72,79,'GLASS')
        B(L,W*.68,.087,W*.91,.19,102,111,'DARK')
        face_plate(L,'KOTA',W*.68,W*.93,104,'DARK',10)
    elif is_ambulance:
        strip(L,.28,W-.27,56,'RED',.086,7)
        # Red cross on side, smaller red cross on back. Roof LED lightbar.
        B(L,W*.37,.083,W*.55,.19,62,87,'RED',4)
        B(L,W*.31,.083,W*.61,.19,70,78,'RED',4)
        B(L,W*.43,D-.22,W*.55,D-.14,76,91,'RED',4)
        B(L,W*.38,D-.22,W*.60,D-.14,81,85,'RED',4)
        B(L,W*.37,D*.36,W*.66,D*.64,125,129,'DARK')
        B(L,W*.38,D*.39,W*.48,D*.61,129,134,'RED',4)
        B(L,W*.52,D*.39,W*.62,D*.61,129,134,'BLUE',4)
        face_plate(L,'AMBULANS',.35,1.75,53,'RED',14)

def truck(L,s):
    W,D=L.W,L.D;n=s['label'].lower();is_pickup=s['kind']=='pickup'
    garbage='sampah' in n
    color='GREEN' if garbage else 'WHITE' if is_pickup else 'TERRA'
    _shadow(L);chassis(L,W,D,color)
    cargo_end=W*.62
    # Cabin is separate: stepped bonnet, raked windshield and two mirrors.
    B(L,W*.62,.22,W-.19,D-.20,46,91,'WHITE' if is_pickup else 'CREAM',3)
    B(L,W*.66,.19,W-.24,D-.23,91,101,'CONC',3)
    B(L,W*.67,.16,W-.28,D-.23,71,89,'DARK',2)
    B(L,W*.69,.145,W-.32,.19,75,87,'GLASS',3)
    B(L,W-.32,D-.28,W-.23,D-.17,74,90,'GLASS',2)
    B(L,W*.62,.12,W-.21,.19,61,65,'DARK')
    B(L,W*.82,.095,W*.91,.19,63,66,'SENG')
    mirror(L,W,D)
    # Cargo bed distinctly LOWER than cabin, not a flat roofed passenger van.
    B(L,.19,.21,cargo_end,D-.20,46,54,'WOOD' if 'sayur' in n else 'CONC',3)
    B(L,.18,.17,cargo_end,.23,50,79,'GREEN' if garbage else 'SENG',3)
    B(L,.18,D-.24,cargo_end,D-.17,50,80,'GREEN' if garbage else 'SENG',3)
    for x in (.19,cargo_end-.06):
        B(L,x,.18,x+.06,D-.18,51,83,'DARK')
    for x in (.29,.91,1.53,2.13):
        B(L,x,.11,x+.055,.18,57,78,'DARK',2)
        screw(L,x,.10,60)
    if 'sayur' in n:
        for i in range(14):
            x=.31+(i%4)*.37;y=.32+(i//4)*.34
            if x>=cargo_end-.25 or y>=D-.25:continue
            B(L,x-.13,y-.12,x+.15,y+.13,56+i%3*4,67+i%3*4,'WOOD')
            _ball(L,x,y,69+i%3*4,.15,10,'GREEN' if i%3 else 'TEAL',3)
            for t in (0,TAU/3,TAU*2/3):
                xx=x+math.cos(t)*.1;yy=y+math.sin(t)*.07
                pole(L,xx,yy,72+i%3*4,79+i%3*4,'GREEN',.022)
        B(L,.22,.12,cargo_end,.18,80,84,'CREAM')
    elif 'galon' in n:
        for i in range(6):
            x=.35+(i%3)*.57;y=.35+(i//3)*.63
            L.s.cyl(*L.cr(x,y),55,78,.20,'OGLASS',3)
            L.s.cyl(*L.cr(x,y),78,83,.085,'BLUE',2)
            _ball(L,x,y,84,.09,5,'CREAM',3)
        for x in (.3,1.4):
            B(L,x,.16,x+.08,D-.17,85,89,'DARK',2)
        B(L,.27,D-.15,cargo_end-.06,D-.10,83,87,'DARK')
        face_plate(L,'AIR ISI ULANG',.32,1.64,54,'BLUE',12)
    elif 'pasir' in n:
        # Raised mounded load and uneven aggregate, with visible tailgate.
        B(L,.22,.22,cargo_end-.05,D-.22,53,69,'SOIL',3)
        for i in range(25):
            x=.28+(i%6)*.28;y=.28+(i//6)*.31
            if x>=cargo_end-.2 or y>=D-.2:continue
            _ball(L,x,y,69+(i%4)*2,.12+(i%3)*.025,7,'SOIL',2+i%3)
        B(L,.18,.16,cargo_end,.25,71,75,'TERRA',2)
        for x in (.28,cargo_end-.16):
            B(L,x,.12,x+.06,.20,52,74,'WOOD',3)
    elif 'material' in n:
        # Explicit brick stack, cement sacks, tied rebar lengths.
        for i in range(12):
            x=.28+(i%4)*.39;y=.30+(i//4)*.34
            if x>=cargo_end-.2 or y>=D-.22:continue
            B(L,x,y,x+.29,y+.26,55+i%3*5,65+i%3*5,'TERRA',2+i%3)
            B(L,x+.03,y-.015,x+.11,y+.02,64+i%3*5,67+i%3*5,'CREAM')
        for y in (.30,.45,.64):
            B(L,.28,y,cargo_end-.17,y+.045,80,83,'SENG',3)
        B(L,.31,.12,cargo_end-.18,.18,84,87,'DARK')
    elif garbage:
        # Municipal green refuse compactor: ribbed hopper, rear loader lip,
        # hydraulic ram and hazard chevrons, entirely non-human.
        B(L,.22,.23,cargo_end-.02,D-.23,52,103,'GREEN',3)
        for x in (.29,.68,1.08,1.47):
            B(L,x,.155,x+.065,D-.24,56,96,'DARK',2)
            B(L,x+.075,.15,x+.11,D-.25,60,94,'TEAL',3)
        B(L,.19,.14,.29,D-.13,32,84,'SENG')
        B(L,.22,.12,.55,.27,31,47,'YEL',3)
        for i in range(4):
            x=.22+i*.11
            B(L,x,.10,x+.055,.27,34+i%2*6,42+i%2*6,'DARK',2)
        B(L,.27,D-.25,.42,D-.11,49,74,'CONC')
        B(L,.37,D-.27,.48,D-.15,47,78,'DARK')
        face_plate(L,'DINAS KEBERSIHAN',.34,1.93,77,'GREEN',12)
    road_details(L,W,D)

def tricycle(L,s):
    W,D=L.W,L.D;n=s['label'].lower();k=s['kind']
    bajaj=k=='bajaj'
    _shadow(L)
    # Three visually separated wheels including powered rear wheel.
    for x,y,r in ((.38,D*.26,.28),(.38,D*.78,.28),(W-.43,D*.52,.27)):
        wheel(L,x,y,r,spokes=(k=='becak'))
    B(L,.18,.24,W-.18,D-.22,20,28,'DARK')
    if bajaj:
        B(L,.32,.23,W-.28,D-.20,26,52,'ORANGE')
        B(L,.28,.19,W-.34,D-.19,52,93,'ORANGE',3)
        # Three-quarter shaped black top and generous passenger window gap.
        B(L,.37,.25,W-.40,D-.26,92,103,'DARK',2)
        L.s.dome(*L.cr(W*.50,D*.51),102,.56,16,'DARK',3)
        for x in (.39,1.10,1.75):
            pole(L,x,D*.28,58,99,'DARK',.042)
        B(L,.51,.105,W-.59,.20,65,89,'GLASS',2)
        B(L,.59,.09,W-.73,.14,74,85,'FBLUE',4)
        B(L,W-.35,.13,W-.20,.27,35,57,'ORANGE')
        dot(L,W-.24,D*.38,51,'YEL',.08)
        dot(L,W-.24,D*.69,51,'YEL',.08)
        B(L,.37,.12,.92,.20,31,35,'DARK')
        B(L,.45,.16,1.16,D-.21,53,59,'WOOD')
        face_plate(L,'BAJAJ',.45,1.20,34,'ORANGE',11)
        B(L,.34,D-.26,.56,D-.18,68,93,'DARK')
    else:
        # Becak = front passenger seat and canopy, exposed bicycle drivetrain;
        # bentor = scooter nose & motor casing, unlike an ordinary becak.
        B(L,.12,.16,1.22,D-.22,29,49,'WOOD',3)
        B(L,.18,.19,1.15,D-.21,49,55,'CREAM')
        B(L,.20,D*.28,1.07,D*.69,55,66,'DARK')
        B(L,.18,D*.69,1.14,D*.78,51,77,'RED' if k=='becak' else 'GREEN')
        for x in (.19,1.16):
            pole(L,x,D*.23,51,102,'DARK',.044)
            pole(L,x,D*.80,51,102,'DARK',.044)
        B(L,.13,.13,1.24,D-.12,101,110,'RED' if k=='becak' else 'GREEN')
        for x in (.34,.69,1.05):
            B(L,x,.13,x+.05,D-.14,110,113,'CREAM',4)
        B(L,1.20,D*.48,W-.31,D*.57,28,35,'DARK')
        B(L,W*.56,D*.35,W*.75,D*.66,34,53,'DARK')
        B(L,W*.67,D*.34,W*.79,D*.67,56,62,'WOOD')
        B(L,W*.75,D*.33,W*.91,D*.63,62,65,'DARK')
        # Rear drivetrain/pedals are distinct from the live rider.
        L.s.cyl(*L.cr(W*.58,D*.52),26,30,.14,'SENG',3)
        B(L,W*.52,D*.44,W*.64,D*.57,25,31,'CONC')
        if k=='bentor':
            B(L,W*.66,D*.31,W*.91,D*.69,21,47,'TEAL')
            B(L,W*.77,D*.36,W*.91,D*.65,45,67,'GREEN')
            dot(L,W*.91,D*.49,61,'YEL',.08)
            B(L,W*.49,D*.30,W*.69,D*.69,48,54,'DARK')
        else:
            B(L,W*.48,D*.31,W*.74,D*.36,39,43,'SENG')
            B(L,W*.67,D*.38,W*.83,D*.48,25,30,'WOOD')
        B(L,.26,.09,1.03,.16,26,34,'CREAM')
        face_plate(L,'BECAK' if k=='becak' else 'BENTOR',.25,1.10,31,'GREEN' if k=='bentor' else 'BLUE',11)

def horse_cart(L,s):
    W,D=L.W,L.D;_shadow(L)
    # Horse at the nose; carriage has independent spoked wheels, wooden body.
    # Driver/passenger actors remain modular and are NOT drawn here.
    for x,y in ((.40,D*.28),(1.34,D*.77)):
        wheel(L,x,y,.38,True)
    B(L,.18,.22,1.45,D-.20,36,79,'WOOD',3)
    B(L,.23,.19,1.41,D-.24,79,86,'TERRA')
    for x in (.22,1.28):
        for y in (.25,D-.29):
            pole(L,x,y,32,112,'DARK',.049)
    B(L,.16,.15,1.51,D-.14,109,118,'CREAM',3)
    for x in (.22,.51,.80,1.09,1.35):
        B(L,x,.145,x+.06,D-.15,117,120,'TERRA')
    B(L,.31,D*.27,1.26,D*.74,53,61,'DARK')
    B(L,.21,D*.19,1.44,D*.28,72,86,'WOOD')
    # Leather reins connect horse's neck to passenger cart.
    for y in (D*.43,D*.61):
        B(L,1.31,y,2.43,y+.038,59,63,'DARK',3)
    # Horse torso, arched neck, head and 4 legs.
    B(L,1.66,.35,2.38,D-.37,52,80,'WOOD',3)
    B(L,2.28,D*.42,2.49,D*.60,77,103,'WOOD')
    _ball(L,2.49,D*.50,103,.16,12,'WOOD',3)
    B(L,2.40,D*.37,2.55,D*.46,104,109,'DARK')
    for x in (1.74,2.20):
        for y in (.43,D-.43):
            B(L,x,y,x+.085,y+.10,2,53,'WOOD')
            B(L,x-.02,y-.02,x+.12,y+.12,1,6,'DARK')
    for x in (1.79,2.14):
        B(L,x,.29,x+.095,.42,66,71,'DARK')
    B(L,1.58,D*.48,1.74,D*.53,64,69,'DARK')
    B(L,2.37,D*.37,2.45,D*.44,110,116,'WOOD')
    dot(L,2.57,D*.42,103,'DARK',.045)
    # Horse's tail and harness straps
    for i in range(3):
        B(L,1.56,D*.45+i*.08,1.64,D*.55+i*.08,44-i*5,63-i*5,'DARK')
    B(L,1.70,D*.43,2.32,D*.47,70,73,'DARK')

def bike(L,s):
    W,D=L.W,L.D;k=s['kind'];n=s['label'].lower()
    bicycle=k=='sepeda';is_matic='matik' in n;is_bebek='bebek' in n
    _shadow(L)
    left,right=.28,W-.30;yy=D*.54
    wheel(L,left,yy,.295 if bicycle else .235,bicycle)
    wheel(L,right,yy,.295 if bicycle else .235,bicycle)
    # Bicycle triangle / motor crankframe in the same footprint.
    B(L,left+.17,yy-.07,right-.13,yy+.065,22,29,'DARK')
    B(L,left+.42,yy-.125,right-.42,yy+.13,28,33,'CONC',2)
    B(L,left+.30,yy-.12,right-.29,yy+.13,34,41,'DARK')
    if bicycle:
        # Real open-frame double-triangle and visible chain rings.
        B(L,left+.19,yy-.065,right-.11,yy+.02,34,39,'WOOD' if 'ontel' in n else 'BLUE')
        B(L,left+.41,yy-.085,left+.49,yy+.09,30,63,'WOOD')
        B(L,right-.40,yy-.09,right-.32,yy+.09,28,60,'DARK')
        B(L,left+.48,yy-.09,right-.32,yy+.08,57,60,'WOOD')
        L.s.cyl(*L.cr(W*.53,yy),27,29,.17,'SENG',3)
        B(L,W*.51,yy-.17,W*.56,yy+.17,25,27,'DARK')
        B(L,left+.32,yy-.12,right-.25,yy+.07,44,48,'WOOD')
        B(L,left+.34,yy-.11,left+.70,yy+.12,47,51,'DARK')
        pole(L,right-.29,yy,32,73,'DARK',.04)
        B(L,right-.49,yy-.20,right-.07,yy+.20,70,73,'DARK')
        B(L,left+.20,yy-.15,left+.24,yy+.17,40,67,'DARK')
        if 'ontel' in n:
            B(L,left-.10,yy-.09,left+.13,yy+.10,30,55,'WOOD')
            B(L,left-.11,yy-.17,left+.38,yy-.09,55,57,'SENG')
            B(L,right-.17,yy-.18,right+.04,yy-.11,44,46,'CONC')
            B(L,left+.18,yy-.19,right-.21,yy-.13,61,65,'WOOD')
        else:
            # Street baker's carrier with distinct slatted box and bread trays.
            B(L,left-.11,.19,left+.55,D-.16,51,77,'CREAM')
            B(L,left-.13,.18,left+.57,D-.17,75,80,'WOOD')
            for z in (57,65,73):
                B(L,left-.15,.17,left+.57,.23,z,z+2,'DARK',2)
            for i in range(7):
                xx=left+.04+(i%3)*.16;y=.32+(i//3)*.19
                _ball(L,xx,y,78,.09,7,'TERRA' if i%2 else 'ORANGE',3)
            face_plate(L,'ROTI',left+.01,left+.49,55,'CREAM',12)
        return
    # Motor shells distinguish semi-step-through bebek, automatic scooter,
    # commuter Ojol motor and larger delivery rear carrier.
    B(L,left+.28,yy-.15,right-.25,yy+.15,32,51,'RED' if is_bebek else 'TEAL')
    if is_matic:
        B(L,W*.43,.29,W*.66,D-.29,33,61,'RED',3)
        B(L,W*.54,.32,W*.75,D-.31,54,79,'CREAM',3)
        B(L,W*.53,.27,W*.72,.34,55,59,'DARK')
    elif is_bebek:
        B(L,W*.39,.37,W*.66,D-.27,39,62,'BLUE')
        B(L,W*.44,.33,W*.50,.45,49,64,'CREAM')
        B(L,W*.34,.30,W*.40,D*.66,31,58,'SENG')
    else:
        B(L,W*.37,.32,W*.69,D-.26,41,67,'GREEN' if 'ojol' in n else 'BLUE')
        B(L,W*.47,.26,W*.63,.34,57,62,'DARK')
    # Real uncovered seat, not a baked rider torso.
    B(L,left+.36,yy-.21,right-.38,yy+.21,55,61,'DARK')
    B(L,left+.43,yy-.16,right-.39,yy+.16,60,63,'CONC',2)
    B(L,right-.31,yy-.11,right-.13,yy+.12,38,64,'DARK')
    pole(L,right-.27,yy,52,79,'DARK',.045)
    B(L,right-.43,yy-.21,right-.11,yy+.22,76,79,'DARK')
    dot(L,right-.18,yy,66,'CREAM',.075)
    B(L,left-.02,yy-.15,left+.22,yy+.15,36,40,'RED',4)
    B(L,W*.52,yy-.21,W*.65,yy-.14,33,37,'SENG')
    B(L,left+.26,yy-.15,left+.36,yy-.08,20,24,'SENG')
    if 'keluarga' in n or 'penumpang' in n:
        B(L,left+.19,yy-.21,W*.71,yy+.21,57,63,'DARK')
        B(L,left+.09,yy-.20,left+.14,yy+.19,49,65,'DARK')
        B(L,left+.08,yy-.19,left+.26,yy+.19,65,68,'CONC')
        for x in (.34,W*.73):
            B(L,x,yy-.31,x+.17,yy-.24,25,31,'SENG')
        if 'penumpang' in n:
            B(L,left-.08,yy-.30,left+.14,yy-.19,38,54,'GREEN')
    if 'box makanan' in n:
        B(L,left-.08,.20,left+.54,D-.20,52,89,'GREEN')
        B(L,left-.10,.18,left+.56,D-.18,88,94,'CREAM')
        B(L,left+.01,.17,left+.44,.24,64,69,'WHITE')
        face_plate(L,'FOOD',left+.02,left+.46,72,'GREEN',11)
        for x in (left-.04,left+.48):
            B(L,x,.18,x+.045,D-.18,47,81,'DARK')
    elif 'kurir' in n:
        B(L,left-.14,.17,left+.59,D-.17,49,90,'BLUE')
        B(L,left-.16,.15,left+.61,D-.15,88,95,'CREAM')
        B(L,left-.06,.14,left+.48,.20,59,65,'YEL')
        face_plate(L,'KURIR',left+.01,left+.46,74,'BLUE',11)
        for x in (left-.10,left+.52):
            B(L,x,.15,x+.045,D-.15,48,85,'DARK')
    elif 'ojol' in n:
        B(L,left+.18,yy-.25,left+.44,yy-.19,47,53,'GREEN')
        B(L,left+.20,yy+.19,left+.40,yy+.23,46,50,'GREEN')
    elif is_bebek:
        B(L,left-.01,yy-.23,left+.29,yy-.14,44,49,'CREAM')
        B(L,left+.05,yy-.16,left+.15,yy+.13,47,56,'BLUE')

def render(L,s):
    if s.get('category')!='transport' or not s['id'].startswith('id200_transport_'):
        return False
    k=s['kind']
    if k in ('motor','sepeda'):bike(L,s)
    elif k in ('bajaj','becak','bentor'):tricycle(L,s)
    elif k=='andong':horse_cart(L,s)
    elif k in ('angkot','bus','van'):van(L,s)
    elif k in ('pickup','truck'):truck(L,s)
    else:raise ValueError('Unmodelled transport type '+k)
    return True
