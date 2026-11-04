"""Additional everyday Indonesian plants and kampung props.
Native v6b isometric 2:1 assets; every object uses the shared pixel/depth
renderer and is published by indonesia.py with a tested asset manifest.
No source photos or copyrighted third-party sprites.
"""
from math import cos, sin, pi
from lib import asset, grass_ground, ground, bshadow, Tex

PLANTS=[
 ("id_pohon_kelapa","Pohon kelapa kampung","plant"),
 ("id_pohon_pisang","Rumpun pohon pisang","plant"),
 ("id_pohon_pepaya","Pohon pepaya berbuah","plant"),
 ("id_pohon_mangga","Pohon mangga pekarangan","plant"),
 ("id_pohon_jambu_biji","Pohon jambu biji","plant"),
 ("id_pohon_rambutan","Pohon rambutan berbuah","plant"),
 ("id_rumpun_bambu","Rumpun bambu","plant"),
 ("id_pohon_kamboja","Pohon kamboja","plant"),
 ("id_tanaman_singkong","Tanaman singkong","plant"),
 ("id_tanaman_talas","Rumpun daun talas","plant"),
 ("id_tanaman_pandan","Pandan wangi","plant"),
 ("id_pot_bougenvil","Bougenville pot merah muda","plant"),
]
PROPS=[
 ("id_gerobak_sate","Gerobak sate ayam","street"),
 ("id_gerobak_es_kelapa","Gerobak es kelapa","street"),
 ("id_angkringan","Angkringan pinggir jalan","street"),
 ("id_tenda_pecel_lele","Tenda pecel lele","street"),
 ("id_kursi_plastik","Kursi plastik warung","street"),
 ("id_galon_air","Galon air isi ulang","street"),
 ("id_tabung_gas_melon","Tabung gas LPG 3 kg","street"),
 ("id_jemuran_kampung","Jemuran pakaian kampung","street"),
 ("id_pagar_bambu","Pagar bambu pendek","street"),
 ("id_spanduk_warung","Spanduk warung makan","street"),
 ("id_bangku_bambu","Bangku bambu panjang","street"),
 ("id_pot_semen","Pot tanaman semen","street"),
]
PACK=PLANTS+PROPS

def base(L,w,d,plant=False):
    if plant: grass_ground(L,0,0,w,d)
    else: ground(L,0,0,w,d)
    bshadow(L,0,0,w,d,105)

def trunk(L,a,b,h,r=.085,material="WOOD"):
    c,y=L.cr(a,b)
    L.s.cyl(c,y,1,h,r,material,3)

def crown(L,a,b,z,r=.47,h=27,color="GREEN"):
    c,y=L.cr(a,b)
    L.s.dome(c,y,z,r,h,color,3)

def leaf_ring(L,a,b,z,span=.68,count=7,color="GREEN",width=.20):
    # Architectural fan of horizontally radiating, taper-like isometric leaves.
    for i in range(count):
        ang=2*pi*i/count
        dx,dy=cos(ang)*span,sin(ang)*span
        x=a+dx*.55;y=b+dy*.55
        L.box(max(.02,x-width*.5),max(.02,y-width*.5),
              min(L.W-.02,x+width*.5),min(L.D-.02,y+width*.5),
              z-8-(i%3)*3,z+2-(i%3)*3,
              color,2+(i%3))
        x=a+dx*.9;y=b+dy*.9
        L.box(max(.02,x-width*.36),max(.02,y-width*.36),
              min(L.W-.02,x+width*.36),min(L.D-.02,y+width*.36),
              z-14-(i%3)*4,z-5-(i%3)*4,color,3)
    crown(L,a,b,z-10,.24,14,color)

def fruits(L,a,b,z,color,n=5):
    for i in range(n):
        ang=2*pi*i/n
        x=a+.43*cos(ang);y=b+.43*sin(ang)
        c,r=L.cr(x,y)
        L.s.dome(c,r,z-(i%3)*9,.115,11,color,3)

@asset("id_pohon_kelapa","prop",2.7,2.7,230,note="Pohon kelapa tropis dengan pelepah menjuntai dan buah kelapa")
def kelapa(L):
    base(L,2.7,2.7,True)
    trunk(L,1.32,1.34,152,.12,"WOOD")
    for z in range(14,146,16):
        L.box(1.18,1.19,1.44,1.48,z,z+3,"TERRA",2)
    leaf_ring(L,1.32,1.34,158,.91,9,"GREEN",.29)
    for x,y in [(1.15,1.22),(1.48,1.24),(1.39,1.49)]:
        L.s.dome(*L.cr(x,y),142,.12,14,"WOOD",3)

@asset("id_pohon_pisang","prop",2.7,2.7,176,note="Rumpun pisang dengan daun lebar dan tandan buah hijau")
def pisang(L):
    base(L,2.7,2.7,True)
    for a,b,h in [(1.18,1.05,111),(1.68,1.55,86),(.76,1.65,69)]:
        trunk(L,a,b,h,.12,"TEAL")
        leaf_ring(L,a,b,h,.65,7,"GREEN",.35)
    for dz in (0,10,20):
        L.box(1.02,1.08,1.23,1.28,74+dz,80+dz,"YEL",3)

@asset("id_pohon_pepaya","prop",1.9,1.9,193,note="Pohon pepaya ramping dengan buah bergelantungan")
def pepaya(L):
    base(L,1.9,1.9,True)
    trunk(L,.95,.94,135,.105,"WOOD")
    leaf_ring(L,.95,.94,140,.69,8,"GREEN",.23)
    for a,b,z in [(.80,.95,103),(1.11,1.0,113),(.95,.82,121)]:
        L.s.dome(*L.cr(a,b),z,.125,13,"YEL",3)

@asset("id_pohon_mangga","prop",2.7,2.7,211,note="Pohon mangga rindang sebagai peneduh pekarangan")
def mangga(L):
    base(L,2.7,2.7,True)
    trunk(L,1.35,1.36,119,.19,"WOOD")
    for x,y,z in [(1.04,1.09,100),(1.64,1.1,105),(1.1,1.68,105),(1.66,1.66,108),(1.35,1.38,133)]:
        crown(L,x,y,z,.59,33,"GREEN")
    fruits(L,1.35,1.35,105,"YEL",5)

@asset("id_pohon_jambu_biji","prop",2.4,2.4,186,note="Jambu biji berbuah di halaman rumah Indonesia")
def jambu(L):
    base(L,2.4,2.4,True)
    trunk(L,1.2,1.2,87,.16,"WOOD")
    for a,b,z in [(.94,1.05,92),(1.47,1.06,96),(1.05,1.47,98),(1.51,1.51,92)]:
        crown(L,a,b,z,.45,32,"TEAL")
    fruits(L,1.2,1.2,91,"GREEN",5)

@asset("id_pohon_rambutan","prop",2.8,2.8,222,note="Pohon rambutan berkanopi lebat dan buah merah")
def rambutan(L):
    base(L,2.8,2.8,True)
    trunk(L,1.4,1.4,113,.19,"WOOD")
    for a,b,z in [(1,1.1,116),(1.77,1.1,125),(1,1.78,118),(1.74,1.8,120),(1.39,1.43,150)]:
        crown(L,a,b,z,.57,33,"GREEN")
    fruits(L,1.38,1.39,116,"RED",9)

@asset("id_rumpun_bambu","prop",2.2,2.2,212,note="Rumpun bambu hijau dengan batang beruas")
def bambu(L):
    base(L,2.2,2.2,True)
    for a,b,h in [(.7,.7,127),(1.1,.8,160),(1.6,1.05,130),(.85,1.6,145),(1.45,1.55,117)]:
        trunk(L,a,b,h,.064,"TEAL")
        for z in range(18,h,22):
            L.box(a-.08,b-.07,a+.08,b+.08,z,z+2,"YEL",2)
        leaf_ring(L,a,b,h-.4,.25,5,"GREEN",.12)

@asset("id_pohon_kamboja","prop",2.3,2.3,174,note="Pohon kamboja dengan cabang melengkung dan bunga krem")
def kamboja(L):
    base(L,2.3,2.3,True)
    trunk(L,1.14,1.15,80,.16,"CONC")
    for a,b,z in [(.76,.85,96),(1.49,.87,102),(.78,1.46,96),(1.51,1.48,104)]:
        crown(L,a,b,z,.41,26,"TEAL")
        L.s.dome(*L.cr(a,b),z+19,.115,8,"CREAM",4)

@asset("id_tanaman_singkong","prop",1.7,1.7,115,note="Tanaman singkong kebun rumah dengan daun menjari")
def singkong(L):
    base(L,1.7,1.7,True)
    for a,b,h in [(.52,.67,63),(1.05,.94,76),(.8,1.21,58)]:
        trunk(L,a,b,h,.04,"WOOD")
        leaf_ring(L,a,b,h,.33,7,"GREEN",.12)

@asset("id_tanaman_talas","prop",1.8,1.8,115,note="Rumpun daun talas berdaun besar menyerupai hati")
def talas(L):
    base(L,1.8,1.8,True)
    for a,b,h in [(.62,.67,65),(1.22,.69,83),(.78,1.26,57),(1.31,1.19,72)]:
        trunk(L,a,b,h,.045,"TEAL")
        crown(L,a,b,h-.9,.25,14,"GREEN")

@asset("id_tanaman_pandan","prop",1.7,1.7,106,note="Pandan wangi, daun lancip rapat di pekarangan")
def pandan(L):
    base(L,1.7,1.7,True)
    for a,b,h in [(.65,.65,45),(1.03,.7,48),(.76,1.10,52),(1.12,1.11,43)]:
        leaf_ring(L,a,b,h,.31,7,"TEAL",.10)

@asset("id_pot_bougenvil","prop",1.6,1.6,126,note="Bunga kertas bugenvil berwarna pink dalam pot tanah liat")
def bugenvil(L):
    base(L,1.6,1.6)
    L.box(.52,.52,1.08,1.08,0,24,"TERRA",3)
    trunk(L,.8,.8,54,.055,"WOOD")
    for a,b,z in [(.57,.68,57),(.99,.65,62),(.75,1.0,65),(.82,.82,77)]:
        crown(L,a,b,z,.27,18,"GREEN")
        L.s.dome(*L.cr(a,b),z+14,.11,9,"PINK",3)

def stall_banner(L,title,color,z=89):
    t=Tex(102,23,color,3)
    t.text(51,10,title,"WHITE",4,sc=1,bold=True)
    L.front(.15,2.85,.08,z,z+23,t)

@asset("id_gerobak_sate","prop",3,1.5,166,note="Gerobak sate ayam dengan panggangan arang dan tenda kecil")
def sate(L):
    base(L,3,1.5)
    for a in (.56,2.18):
        L.s.cyl(*L.cr(a,.5),2,18,.20,"DARK",2)
    L.box(.22,.18,2.76,1.15,18,54,"WOOD",3)
    L.box(.3,.25,2.7,.93,54,60,"SENG",2)
    L.box(1.3,.24,2.47,.83,60,68,"DARK",3)
    for a in (1.43,1.65,1.87,2.09):
        L.box(a,.31,a+.07,.77,67,69,"TERRA",3)
    L.box(.12,.15,2.87,1.3,109,118,"RED",3)
    for a in (.18,2.77):
        L.box(a,.13,a+.09,.24,55,111,"WOOD",3)
    stall_banner(L,"SATE AYAM","RED",88)

@asset("id_gerobak_es_kelapa","prop",3,1.5,168,note="Gerobak es kelapa muda dengan atap hijau dan buah kelapa")
def es_kelapa(L):
    base(L,3,1.5)
    for a in (.6,2.20):
        L.s.cyl(*L.cr(a,.45),2,18,.20,"DARK",2)
    L.box(.22,.16,2.8,1.25,18,56,"WOOD",3)
    L.box(.35,.24,2.65,1.04,56,65,"SENG",3)
    for a,b in [(.6,.42),(1.13,.45),(1.66,.46),(2.19,.42)]:
        L.s.dome(*L.cr(a,b),65,.22,22,"GREEN",3)
    for a in (.18,2.75):
        L.box(a,.18,a+.09,.28,65,116,"WOOD",3)
    L.box(.12,.16,2.88,1.32,114,124,"GREEN",3)
    stall_banner(L,"ES KELAPA","GREEN",89)

@asset("id_angkringan","prop",3.3,2.2,175,note="Angkringan gerobak dengan ceret, bangku dan tudung kain")
def angkringan(L):
    base(L,3.3,2.2)
    L.box(.4,.30,2.75,1.25,17,60,"WOOD",3)
    L.box(.3,.25,2.88,1.38,61,66,"TERRA",3)
    for a in (.45,2.77):
        L.box(a,.22,a+.09,.31,20,133,"WOOD",3)
    L.box(.32,.2,2.96,1.46,134,143,"BLUE",3)
    L.s.dome(*L.cr(.95,.63),67,.20,13,"SENG",3)
    for a in (1.5,2.05):
        L.box(a,.37,a+.3,.83,67,81,"WARM",3)
    L.box(1.1,1.5,2.75,1.92,0,23,"WOOD",3)
    for a in (1.16,2.65):
        L.box(a,1.55,a+.11,1.88,0,23,"WOOD",3)

@asset("id_tenda_pecel_lele","prop",3.5,2.4,178,note="Tenda kaki lima pecel lele dengan terpal dan meja makan")
def pecel_lele(L):
    base(L,3.5,2.4)
    for a in (.15,3.18):
        for b in (.15,2.19):
            L.box(a,b,a+.10,b+.10,0,129,"WOOD",3)
    L.box(.05,.10,3.43,2.35,127,138,"BLUE",3)
    L.box(.13,.18,3.35,.29,78,119,"RED",3,
          front=lambda w,h:Tex(w,h,"RED",3).text(w//2,25,"PECEL LELE","WHITE",4))
    L.box(.5,.45,2.8,1.35,0,29,"WOOD",3)
    L.box(.38,.38,3,1.45,30,36,"SENG",2)
    for a in (.69,2.65):
        L.box(a,.45,a+.4,.82,36,45,"WARM",3)

@asset("id_kursi_plastik","prop",.9,.9,95,note="Kursi plastik warung warna biru")
def kursi(L):
    L.box(.14,.12,.75,.74,26,32,"BLUE",3)
    L.box(.16,.56,.75,.69,32,79,"BLUE",3)
    for a in (.18,.63):
        for b in (.17,.63):
            L.box(a,b,a+.07,b+.07,0,27,"BLUE",3)

@asset("id_galon_air","prop",1.1,1.1,87,note="Galon air minum isi ulang dengan tutup biru")
def galon(L):
    for a,b in [(.3,.33),(.7,.65)]:
        L.s.cyl(*L.cr(a,b),0,53,.23,"OGLASS",3)
        L.s.cyl(*L.cr(a,b),53,61,.13,"BLUE",3)

@asset("id_tabung_gas_melon","prop",1.4,1.1,83,note="Tabung LPG hijau 3 kilogram di depan warung")
def gas(L):
    for a,b in [(.37,.46),(.97,.65)]:
        L.s.cyl(*L.cr(a,b),0,37,.23,"GREEN",3)
        L.s.cyl(*L.cr(a,b),37,44,.14,"DARK",3)
        L.s.cyl(*L.cr(a,b),44,49,.10,"GREEN",3)

@asset("id_jemuran_kampung","prop",3.1,1.2,149,note="Jemuran baju sarung dan kaos di gang kampung")
def jemuran(L):
    for a in (.18,2.82):
        L.box(a,.38,a+.085,.5,0,118,"WOOD",3)
    L.box(.19,.42,2.91,.49,114,119,"SENG",3)
    for i,color in enumerate(["BLUE","RED","WHITE","GREEN","TERRA"]):
        a=.28+i*.50
        L.box(a,.39,a+.38,.48,78-(i%2)*12,114,color,2+(i%3))

@asset("id_pagar_bambu","prop",3.2,.8,98,note="Pagar halaman dari bilah bambu hijau kecokelatan")
def pagar(L):
    for i in range(15):
        a=.10+i*.2
        L.box(a,.24,a+.12,.52,0,60+(i%3)*5,"WOOD",2+(i%3))
    for z in (13,47):
        L.box(.05,.19,3.18,.6,z,z+7,"WOOD",3)

@asset("id_spanduk_warung","prop",3,.8,137,note="Spanduk kain warung nasi pada rangka pipa di pinggir jalan")
def spanduk(L):
    for a in (.15,2.72):
        L.box(a,.34,a+.09,.47,0,115,"CONC",3)
    L.box(.18,.31,2.83,.51,70,106,"YEL",3,
          front=lambda w,h:Tex(w,h,"YEL",3).text(w//2,17,"WARUNG NASI","DARK",4,sc=1,bold=True))
    L.box(.10,.31,2.91,.53,108,113,"WOOD",3)

@asset("id_bangku_bambu","prop",2.7,.9,76,note="Bangku panjang bambu untuk teras rumah dan warung")
def bangku(L):
    for a in (.27,2.18):
        L.box(a,.14,a+.18,.70,0,34,"WOOD",3)
    for i in range(5):
        a=.18+i*.49
        L.box(a,.10,a+.43,.8,35,41,"WOOD",2+(i%2))

@asset("id_pot_semen","prop",1.35,1.35,108,note="Pot semen sederhana dengan tanaman hijau pekarangan")
def pot_semen(L):
    L.box(.22,.22,1.13,1.13,0,39,"CONC",3)
    L.box(.30,.3,1.05,1.05,39,44,"DARK",2)
    trunk(L,.68,.68,62,.065,"WOOD")
    for a,b,z in [(.43,.52,63),(.9,.53,70),(.62,.88,69),(.85,.85,61)]:
        crown(L,a,b,z,.21,15,"GREEN")
