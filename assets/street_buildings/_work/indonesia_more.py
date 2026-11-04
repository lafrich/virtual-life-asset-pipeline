"""Indonesia urban life pack — second extension to the SAME native v6b pipeline.
10 distinctly Indonesian home-garden plants, 8 street props and 6 small shops.
Everything is modeled with the shared isometric sprite/depth generator.
Native transparency (no square ground tiles), canonical footprints and pivots.
"""
import math
from lib import asset, bshadow, Tex, roof_flat, window

PLANTS=[
    ("id_pohon_nangka","Pohon nangka berbuah","plant"),
    ("id_pohon_sawo","Pohon sawo kecik pekarangan","plant"),
    ("id_pohon_belimbing","Pohon belimbing buah kuning","plant"),
    ("id_pohon_jeruk_nipis","Pohon jeruk nipis","plant"),
    ("id_pohon_kelor","Pohon kelor","plant"),
    ("id_bunga_sepatu","Rumpun bunga sepatu merah","plant"),
    ("id_tanaman_cabai","Tanaman cabai merah","plant"),
    ("id_rumpun_serai","Rumpun serai wangi","plant"),
    ("id_lidah_mertua","Lidah mertua di pot","plant"),
    ("id_sirih_gading_gantung","Sirih gading pot gantung","plant"),
]
STREET=[
    ("id_gerobak_siomay","Gerobak siomay Bandung","street"),
    ("id_gerobak_cilok","Gerobak cilok jajanan","street"),
    ("id_bak_sampah_rt","Bak sampah lingkungan RT","street"),
    ("id_toren_air_biru","Toren air biru di rangka","street"),
    ("id_rak_sandal","Rak sandal depan rumah","street"),
    ("id_kandang_ayam","Kandang ayam bambu","street"),
    ("id_keranjang_buah","Keranjang mangga dan jeruk","street"),
    ("id_tumpukan_karung_beras","Karung beras toko sembako","street"),
]
BUILDINGS=[
    ("id_warkop_sederhana","Warkop kopi dan mi instan","building"),
    ("id_kios_pulsa","Kios pulsa dan paket data","building"),
    ("id_pangkas_rambut","Pangkas rambut kampung","building"),
    ("id_depot_air_isi_ulang","Depot air minum isi ulang","building"),
    ("id_tambal_ban","Bengkel tambal ban pinggir jalan","building"),
    ("id_rumah_kontrakan","Rumah kontrakan petak","building"),
]
PACK=PLANTS+STREET+BUILDINGS

def shade(L,W,D,H=120):
    # Only native shadow; keep ground transparent on road, grass and sidewalk.
    bshadow(L,0,0,W,D,H)

def stem(L,a,b,z,rad=.075,material="WOOD"):
    c,r=L.cr(a,b)
    L.s.cyl(c,r,1,z,rad,material,3)

def globe(L,a,b,z,rad=.37,height=22,material="GREEN"):
    L.s.dome(*L.cr(a,b),z,rad,height,material,3)

def crown_clumps(L,centers,material="GREEN"):
    for a,b,z,r,h in centers:
        globe(L,a,b,z,r,h,material)

def fruit(L,coords,material="YEL"):
    for a,b,z in coords:
        globe(L,a,b,z,.092,9,material)

def leaf_fan(L,a,b,z,material="GREEN",span=.47,count=7,scale=.085):
    for i in range(count):
        angle=math.tau*i/count
        x=a+span*math.cos(angle)
        y=b+span*math.sin(angle)
        L.box(max(.02,x-scale),max(.02,y-scale),
              min(L.W-.02,x+scale),min(L.D-.02,y+scale),
              z-19-(i%3)*3,z-(i%3)*3,material,2+i%3)
    globe(L,a,b,z-11,.19,16,material)

def pot(L,a,b,r=.31,h=32,material="TERRA"):
    L.box(a-r,b-r,a+r,b+r,0,h,material,3)
    L.box(a-r+.05,b-r+.05,a+r-.05,b+r-.05,h,h+3,"DARK",2)

@asset("id_pohon_nangka","prop",2.7,2.7,220,note="Pohon nangka rindang, buah nangka besar menggantung dekat batang")
def nangka(L):
    shade(L,2.7,2.7,178)
    stem(L,1.35,1.34,130,.18)
    crown_clumps(L,[(.97,1.12,126,.48,28),(1.67,1.10,129,.49,28),
                     (1.1,1.75,121,.5,29),(1.62,1.75,131,.48,27),
                     (1.36,1.35,148,.53,31)])
    for a,b,z in [(1.18,1.18,65),(1.49,1.25,84),(1.38,1.57,74)]:
        globe(L,a,b,z,.18,30,"YEL")

@asset("id_pohon_sawo","prop",2.6,2.6,198,note="Pohon sawo kecik dengan kanopi gelap dan buah cokelat")
def sawo(L):
    shade(L,2.6,2.6,155)
    stem(L,1.3,1.3,114,.19)
    crown_clumps(L,[(1,1,114,.47,29),(1.58,1.04,117,.48,30),
                     (1,1.65,112,.44,26),(1.6,1.62,121,.48,28),
                     (1.3,1.32,135,.49,31)],"TEAL")
    fruit(L,[(.94,1.31,104),(1.55,1.17,107),(1.34,1.62,110)],"WOOD")

@asset("id_pohon_belimbing","prop",2.5,2.5,192,note="Belimbing manis di kebun rumah dengan buah kuning berbentuk bintang")
def belimbing(L):
    shade(L,2.5,2.5,153)
    stem(L,1.25,1.25,115,.155)
    crown_clumps(L,[(.9,1.12,113,.42,26),(1.58,1.08,118,.43,28),
                     (1.19,1.64,116,.44,25),(1.28,1.28,136,.43,28)])
    fruit(L,[(.88,1.2,103),(1.46,1.12,100),(1.38,1.59,104)],"YEL")

@asset("id_pohon_jeruk_nipis","prop",2.1,2.1,169,note="Pohon jeruk nipis berbuah hijau, pekarangan dapur")
def jeruk(L):
    shade(L,2.1,2.1,136)
    stem(L,1.05,1.03,92,.115)
    crown_clumps(L,[(.78,.86,98,.39,24),(1.35,.89,98,.36,23),
                     (.93,1.29,100,.39,23),(1.07,1.02,114,.37,22)],"GREEN")
    fruit(L,[(.79,1.1,92),(1.24,.89,87),(1.19,1.31,88)],"YEL")

@asset("id_pohon_kelor","prop",2.4,2.4,196,note="Kelor daun kecil dan percabangan ringan di pekarangan")
def kelor(L):
    shade(L,2.4,2.4,160)
    stem(L,1.22,1.18,123,.10)
    for a,b,z in [(.83,.9,101),(1.56,.82,112),(.91,1.47,118),
                  (1.58,1.53,117),(1.23,1.18,140)]:
        leaf_fan(L,a,b,z,"GREEN",.29,6,.07)

@asset("id_bunga_sepatu","prop",1.6,1.6,112,note="Kembang sepatu berdaun lebat dengan bunga merah tropis")
def sepatu(L):
    shade(L,1.6,1.6,85)
    for a,b,z in [(.61,.55,39),(1.06,.56,47),(.57,1.06,45),(1.06,1.06,42)]:
        stem(L,a,b,z,.045)
        globe(L,a,b,z,.29,21,"GREEN")
        globe(L,a,b,z+14,.11,10,"RED")

@asset("id_tanaman_cabai","prop",1.55,1.55,107,note="Tanaman cabai merah dalam tanah halaman dan buah kecil menggantung")
def cabai(L):
    shade(L,1.55,1.55,75)
    for a,b,h in [(.53,.63,48),(1.05,.69,55),(.77,1.12,48)]:
        stem(L,a,b,h,.045)
        leaf_fan(L,a,b,h,"TEAL",.21,5,.06)
        fruit(L,[(a+.12,b,h-9),(a-.1,b+.12,h-14)],"RED")

@asset("id_rumpun_serai","prop",1.6,1.6,112,note="Serai wangi dengan rumpun daun panjang sempit")
def serai(L):
    shade(L,1.6,1.6,75)
    for a,b,h in [(.56,.6,44),(1.03,.66,45),(.65,1.03,52),(1.06,1.06,43)]:
        stem(L,a,b,20,.052,"CREAM")
        leaf_fan(L,a,b,h,"GREEN",.33,9,.043)

@asset("id_lidah_mertua","prop",1.35,1.35,118,note="Sansevieria daun tegak dalam pot semen pada teras")
def lidah_mertua(L):
    pot(L,.68,.68,.35,33,"CONC")
    for a,b,h in [(.51,.58,87),(.72,.61,94),(.88,.67,74),(.57,.86,83),(.79,.87,87)]:
        L.box(a-.08,b-.065,a+.08,b+.065,33,h,"TEAL",3)
        L.box(a-.023,b-.067,a+.023,b+.067,45,h-2,"YEL",3)

@asset("id_sirih_gading_gantung","prop",1.5,1.4,120,note="Sirih gading menjuntai dari pot gantung di depan rumah")
def sirih_gading(L):
    shade(L,1.5,1.4,80)
    L.box(.32,.23,1.2,1.07,65,78,"TERRA",3)
    for a,b in [(.35,.34),(1.14,.36),(.42,1.02),(1.04,.96)]:
        L.box(a-.03,b-.03,a+.03,b+.03,78,112,"WOOD",3)
    L.box(.45,.35,1.07,.9,112,116,"SENG",2)
    for a,b,h in [(.37,.4,35),(1.12,.55,27),(.59,1.05,43)]:
        stem(L,a,b,67,.025,"WOOD")
        globe(L,a,b,h,.16,13,"GREEN")
        globe(L,a,b,h+16,.13,10,"TEAL")

def cart(L,accent="BLUE"):
    shade(L,2.8,1.5,115)
    for a in (.45,2.23):
        L.s.cyl(*L.cr(a,.42),2,18,.19,"DARK",2)
    L.box(.22,.18,2.55,1.15,18,59,"WOOD",3)
    L.box(.23,.16,2.54,1.12,59,65,"SENG",3)
    L.box(.34,.25,2.45,1.05,66,102,"GLASS",2)
    for a in (.39,2.46):
        L.box(a,.22,a+.075,.32,65,119,"WOOD",3)
    L.box(.22,.15,2.57,1.23,119,129,accent,3)

def sign(L,label,base="BLUE",z=95,w=3.2):
    t=Tex(90,18,base,3)
    t.text(45,7,label,"WHITE",4,sc=1,bold=True)
    L.front(.18,min(w-.18,L.W-.15),.12,z,z+18,t)

@asset("id_gerobak_siomay","prop",2.8,1.5,165,note="Gerobak siomay Bandung, panci kukusan, atap biru dan roda")
def siomay(L):
    cart(L,"BLUE")
    for a in (.61,1.20,1.77):
        L.s.cyl(*L.cr(a,.55),66,84,.17,"SENG",3)
        globe(L,a,.55,84,.16,7,"CONC")
    sign(L,"SIOMAY","BLUE",99,w=2.8)

@asset("id_gerobak_cilok","prop",2.8,1.5,165,note="Gerobak cilok dengan panci bulat, stoples saus dan atap merah")
def cilok(L):
    cart(L,"RED")
    L.s.cyl(*L.cr(1.29,.67),67,88,.31,"SENG",3)
    globe(L,1.29,.67,88,.3,8,"CONC")
    for a in (.51,2.04):
        L.box(a,.38,a+.19,.62,65,87,"OGLASS",3)
        L.box(a,.38,a+.19,.62,87,90,"RED",3)
    sign(L,"CILOK","RED",99,w=2.8)

@asset("id_bak_sampah_rt","prop",2.2,1.3,119,note="Bak sampah semen lingkungan RT dengan penutup dan angka RT")
def bak(L):
    L.box(.1,.16,2.06,1.15,0,64,"CONC",3)
    L.box(.1,.16,2.06,1.15,65,70,"DARK",3)
    sign(L,"SAMPAH RT","BLUE",31,w=2.2)

@asset("id_toren_air_biru","prop",2.0,2.0,168,note="Toren air biru berdiri di atas rangka besi rumah kontrakan")
def toren(L):
    for a in (.36,1.51):
        for b in (.35,1.46):
            L.box(a,b,a+.09,b+.09,0,77,"DARK",3)
    L.box(.3,.31,1.65,1.59,74,82,"CONC",2)
    L.s.cyl(*L.cr(.98,.96),82,139,.57,"BLUE",3)
    globe(L,.98,.96,138,.55,11,"BLUE")

@asset("id_rak_sandal","prop",2.15,.95,100,note="Rak sandal di teras rumah, sepatu dan sandal berwarna campur")
def sandals(L):
    for a in (.12,1.93):
        L.box(a,.12,a+.1,.83,0,73,"WOOD",3)
    for z in (13,44,76):
        L.box(.08,.14,2.05,.83,z,z+5,"WOOD",3)
    for i,c in enumerate(("BLUE","TERRA","DARK","YEL")):
        a=.23+i*.42
        for z in (19,51):
            L.box(a,.25,a+.27,.45,z,z+8,c,3)

@asset("id_kandang_ayam","prop",2.5,1.8,123,note="Kandang ayam bambu sederhana dengan bilah kayu dan atap seng")
def kandang(L):
    L.box(.15,.15,2.32,1.65,0,10,"WOOD",2)
    for a in (.19,2.21):
        for b in (.19,1.53):
            L.box(a,b,a+.075,b+.075,0,95,"WOOD",3)
    for i in range(11):
        a=.18+i*.2
        L.box(a,.19,a+.05,.29,6,88,"WOOD",3)
    for i in range(7):
        b=.18+i*.22
        L.box(2.2,b,2.3,b+.045,6,88,"WOOD",2)
    L.box(.12,.1,2.4,1.73,96,103,"SENG",3)
    for a,b in [(.87,.58),(1.64,.95)]:
        globe(L,a,b,16,.16,17,"WHITE")
        globe(L,a+.12,b,30,.09,8,"RED")

@asset("id_keranjang_buah","prop",1.9,1.6,98,note="Keranjang bambu mangga dan jeruk untuk lapak buah")
def buah(L):
    for a,b in [(.53,.57),(1.20,.88)]:
        L.box(a-.31,b-.29,a+.31,b+.29,0,27,"WOOD",3)
        L.box(a-.33,b-.31,a+.33,b+.31,28,33,"TERRA",2)
        for x,y in [(a-.16,b-.1),(a+.13,b-.1),(a,b+.13)]:
            globe(L,x,y,32,.15,10,"GREEN" if a<.8 else "YEL")

@asset("id_tumpukan_karung_beras","prop",1.95,1.35,110,note="Tumpukan karung beras warna krem pada toko sembako")
def beras(L):
    for i,(a,b,z) in enumerate(((.16,.22,0),(.89,.22,0),(.51,.4,36))):
        L.box(a,b,a+.82,b+.82,z,z+31,"CREAM",3)
        L.box(a+.1,b-.015,a+.63,b+.06,z+12,z+20,"GREEN",2)

def shop(L,label,w=3,d=3,wall="CREAM",band="BLUE",h=115):
    shade(L,w,d,h)
    L.box(0,.63,w,d,0,h,wall,3)
    L.box(.13,.22,w-.13,.68,1,h-38,"DARK",3)
    L.box(.19,.16,w-.19,.51,8,h-42,"GLASS",2)
    L.box(0,.51,w,.85,h-29,h-10,band,3)
    L.box(.02,.46,w-.02,.88,h-11,h+1,"SENG",2)
    sign(L,label,band,h-28,w=w)
    roof_flat(L,0,.63,w,d,h,ph=6,pm="CONC")
    for a in (.12,w-.22):
        L.box(a,.25,a+.07,.73,0,45,"WOOD",3)

@asset("id_warkop_sederhana","kampung",3.6,3.4,201,note="Warung kopi sederhana, meja dan bangku serta spanduk kopi")
def warkop(L):
    shop(L,"WARKOP",3.6,3.4,"CREAM","GREEN",128)
    L.box(.5,.1,2.22,.68,15,46,"WOOD",3)
    for a in (.59,1.2):
        L.box(a,.14,a+.45,.56,46,51,"WOOD",3)
    for a in (2.5,2.9):
        L.box(a,.18,a+.29,.55,0,22,"BLUE",3)

@asset("id_kios_pulsa","kampung",2.9,3.1,193,note="Konter pulsa kecil dengan banner paket data dan etalase kaca")
def pulsa(L):
    shop(L,"PULSA",2.9,3.1,"CREAM","RED",118)
    L.box(.34,.16,2.49,.55,22,55,"GLASS",3)
    L.box(.34,.15,2.49,.57,56,61,"CONC",2)
    for a in (.42,1.1,1.78):
        L.box(a,.13,a+.34,.25,64,82,"BLUE",3)

@asset("id_pangkas_rambut","kampung",3.1,3.4,203,note="Pangkas rambut kampung dengan kaca, kursi dan tanda barber")
def pangkas(L):
    shop(L,"PANGKAS",3.1,3.4,"WHITE","BLUE",128)
    L.box(.5,.11,1.62,.45,7,103,"OGLASS",3)
    L.box(.47,.12,1.64,.47,102,106,"DARK",2)
    L.box(2.05,.19,2.61,.77,0,36,"RED",3)

@asset("id_depot_air_isi_ulang","kampung",3.6,3.7,203,note="Depot air minum isi ulang dengan beberapa galon biru")
def depot(L):
    shop(L,"AIR ISI ULANG",3.6,3.7,"WHITE","TEAL",121)
    for a in (.45,1.26,2.06,2.87):
        L.s.cyl(*L.cr(a,.45),0,46,.20,"OGLASS",3)
        L.s.cyl(*L.cr(a,.45),46,52,.13,"BLUE",3)

@asset("id_tambal_ban","kampung",3.8,3.2,198,note="Tambal ban pinggir jalan, kompresor dan ban motor tersusun")
def tambal(L):
    shop(L,"TAMBAL BAN",3.8,3.2,"CONC","RED",121)
    for a in (.65,1.40,2.15):
        L.s.cyl(*L.cr(a,.23),1,40,.25,"DARK",2)
        L.s.cyl(*L.cr(a,.23),2,8,.16,"CONC",3)
    L.box(2.99,.18,3.5,.53,0,47,"BLUE",3)
    L.box(3.1,.22,3.42,.45,47,53,"DARK",3)

@asset("id_rumah_kontrakan","kampung",4.4,3.6,192,note="Rumah kontrakan petak dua pintu, ventilasi, jendela dan atap seng")
def kontrakan(L):
    shade(L,4.4,3.6,155)
    L.box(0,.6,4.4,3.6,0,118,"CREAM",3)
    for a in (.68,2.73):
        L.box(a,.1,a+.82,.67,0,75,"WOOD",3)
        L.box(a+.06,.08,a+.76,.16,13,69,"DARK",2)
        L.box(a+.93,.10,a+1.25,.64,38,75,"OGLASS",3)
    L.box(0,.47,4.4,3.55,118,129,"TERRA",3)
    L.box(.08,.5,4.33,3.51,129,139,"SENG",2)
    L.box(.1,.2,4.28,.65,75,82,"CONC",3)
