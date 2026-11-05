"""Jakarta urban streetscape (Semesta) — native v6b iso Spr geometry.
Deterministic 1x render, existing engine palette, true per-pixel depth.
The catalog aliases legacy lampu_taman and tong_sampah; no authored map IDs move.
"""
from lib import *
import numpy as np

def center(L):
    return L.cr(L.W/2, L.D/2)

def shadow(L,rx=13,ry=5):
    c,r=center(L); L.s.ellipse_shadow(c,r,rx,ry,dx=5)

def noise_top(material,seed=0,dark=2,bright=3,extra=None):
    def fn(a,b):
        x=np.floor(a*25).astype(np.int32); y=np.floor(b*25).astype(np.int32)
        h=((x*374761393)^(y*668265263)^(seed*1442695041))&1023
        m=np.full(a.shape,MI[material],dtype=np.int16)
        t=np.where(h<36,dark,np.where(h>984,bright+1,bright)).astype(np.int8)
        if extra: m,t=extra(a,b,m,t,h)
        return m,t
    return fn

# Sturdy twin-arm pedestrian lamp, black powder-coated municipal mast,
# rectangular glass housings with separate emissive layer.
@asset('lampu_taman_jakarta','taman',1,1,170,note='Lampu taman Jakarta: tiang urban dua kepala, top warm light, black metal')
def lamp(L):
    c,r=center(L)
    L.s.cyl(c,r,0,8,.15,'DARK',3)
    L.s.cyl(c,r,8,137,.054,'DARK',3)
    L.s.cyl(c,r,80,82,.075,'CONC',2)
    L.s.cyl(c,r,131,140,.083,'DARK',3)
    # Physical arms and separate warm lenses. Light from upper left.
    L.box(.16,.45,.84,.54,135,139,'DARK',3)
    for a in (.14,.72):
        L.box(a,.35,a+.16,.65,128,136,'DARK',2)
        L.box(a+.02,.37,a+.14,.63,126,129,'WARM',3,glow=True)
        L.box(a+.03,.39,a+.13,.61,124,126,'LITE',3,glow=True)
    L.s.dome(c,r,139,.09,4,'DARK',3)
    shadow(L,12,5)

# The two bins are deliberate separate compartments, not a blended yellow/green can.
@asset('tong_sampah_jakarta','taman',1.3,1,70,note='Tempat sampah kota 2 bak hijau dan kuning; pegas tutup dan rangka besi')
def bins(L):
    for a,m in ((.34,'GREEN'),(.96,'YEL')):
        L.box(a-.23,.24,a+.23,.77,3,37,m,3)
        L.box(a-.25,.22,a+.25,.78,36,41,'DARK',2)
        L.box(a-.21,.27,a+.21,.73,39,40,m,4)
        # Front slot is dark, clearly visible at 1x.
        L.box(a-.11,.14,a+.11,.25,29,32,'DARK',1)
        L.box(a-.17,.24,a-.12,.74,4,35,'DARK',2)
    for a in (.05,1.24):
        L.box(a,.22,a+.045,.78,0,43,'DARK',3)
    L.box(.05,.49,1.29,.55,9,12,'DARK',2)
    shadow(L,23,8)

@asset('hydrant_jakarta','prop',1,1,84,note='Hydrant merah kota: pipa utama, kopling kiri kanan dan top cap')
def hydrant(L):
    c,r=center(L)
    L.s.cyl(c,r,0,5,.26,'DARK',2)
    L.s.cyl(c,r,5,38,.18,'RED',3)
    L.s.cyl(c,r,30,35,.205,'RED',2)
    L.s.cyl(c,r,38,47,.22,'RED',3)
    L.s.dome(c,r,47,.21,10,'RED',3)
    L.s.cyl(c,r,55,59,.065,'DARK',3)
    for a in (.18,.82):
        L.box(a,.40,a+.10,.60,22,32,'RED',2)
        L.box(a-.03,.34,a+.13,.66,25,30,'CONC',3)
        L.box(a-.04,.37,a+.14,.63,26,29,'DARK',2)
    shadow(L,17,6)

def clipped_hedge(L,low=False):
    W=L.W
    h=15 if low else 28
    L.box(.07,.22,W-.07,.77,0,h,'GREEN',2)
    L.box(.09,.23,W-.10,.74,h-5,h+1,'GRASS',3,
      topf=noise_top('GREEN',17,2,3))
    for a in np.arange(.13,W-.07,.14):
        z=h+(1 if int(a*17)%3 else 3)
        L.box(a,.26,a+.06,.72,z-2,z+2,'GREEN',4)
    for a in np.arange(.17,W-.16,.29):
        L.box(a,.13,a+.035,.22,3,9,'GREEN',1)
    shadow(L,int(W*19),8)

@asset('semak_kota_pagar','taman',2,.75,65,note='Semak teh-tehan rapat sebagai divider kota Jakarta')
def semak_pagar(L): clipped_hedge(L)
@asset('semak_kota_pendek','taman',1,.75,50,note='Semak taman pendek, bisa disusun modular sepanjang trotoar')
def semak_pendek(L): clipped_hedge(L,True)

@asset('semak_kota_rimbun','taman',1.35,1.1,70,note='Semak kota oval tidak beraturan, daun lebih gelap di bawah')
def semak_rimbun(L):
    c,r=center(L)
    for dc,dr,z,rad,h in [(-.28,-.10,7,.34,17),(.18,.20,5,.38,19),
                           (.14,-.20,12,.30,21),(-.18,.19,13,.29,18),(0,0,18,.32,21)]:
        L.s.dome(c+dc,r+dr,z,rad,h,'GREEN',2)
    for dx,dy in [(-.2,.05),(.13,-.11),(.24,.22),(-.29,-.20)]:
        cc,rr=c+dx,r+dy
        L.s.cyl(cc,rr,2,10,.028,'GRASS',4)
    shadow(L,24,9)

@asset('rumput_kota_rumpun','taman',.8,.8,42,note='Rumpun rumput liar tepi jalan: batang daun hijau beragam tinggi')
def rumput_rumpun(L):
    c,r=center(L)
    for k,(x,y,h) in enumerate([(-.16,-.15,12),(.1,-.15,19),(.19,.02,11),(-.20,.17,15),
                                 (.03,.19,17),(0,0,23),(.23,-.09,13),(-.05,.09,10)]):
        xx,rr=c+x,r+y
        L.s.points([xx]*h,[rr+(i/h-.5)*.065 for i in range(h)],
                   list(range(1,h+1)), 'GREEN',3+(k%2))
    shadow(L,13,5)

@asset('rumput_kota_hampar','taman',1.4,1.2,25,note='Hampar rumput kota menempel tanah dengan rumput pendek tersebar')
def rumput_hampar(L):
    L.top(0,0,L.W,L.D,0,noise_top('GRASS',55,1,2),ground=True,shift=0)
    for a,b in [(0.22,.15),(.62,.28),(1.16,.30),(.31,.82),(.81,.87),(1.21,.95)]:
        L.box(a,b,a+.045,b+.08,0,5+(int(a*10)%3),'GREEN',3)
    # Ground patches must not throw a broad black object shadow.

@asset('aspal_patch_jakarta','lokal',2,2,20,note='Patch aspal kota gelap lembut dengan tambalan bitumen, tile isometric')
def aspal_patch(L):
    def tx(a,b):
        m,t=noise_top('ASPH',26,1,2)(a,b)
        repaired=(a>.43)&(a<1.37)&(b>.28)&(b<1.48)
        t=np.where(repaired,2,t).astype(np.int8)
        cracks=(abs(a-.92)<.017)&(b>.3)&(b<1.7)
        t=np.where(cracks,0,t).astype(np.int8)
        return m,t
    L.top(0,0,2,2,0,tx,ground=True,shift=0)

def gutter(L,mode):
    # Concrete lips flank a dark open water trough. Each cell connects.
    water= lambda a,b:(
      np.full(a.shape,MI['WATER'],np.int16),
      np.where((np.floor(a*14).astype(int)+np.floor(b*9).astype(int))%19==0,3,2).astype(np.int8))
    L.top(0,0,1,1,0,('CONC',2),ground=True,shift=0)
    if mode=='corner':
        L.top(.14,.18,.86,1,1,water,ground=True,shift=0)
        L.top(.18,.14,1,.86,1,water,ground=True,shift=0)
        sides=[(.07,0,.18,.9),(.9,.07,1,.88),(0,.9,.9,1)]
    elif mode=='junction':
        L.top(0,.20,1,.82,1,water,ground=True,shift=0)
        L.top(.20,0,.82,.83,1,water,ground=True,shift=0)
        sides=[(0,.06,.18,.18),(.86,.06,1,.18),(0,.86,1,1)]
    else:
        L.top(0,.20,1,.80,1,water,ground=True,shift=0)
        sides=[(0,.03,1,.18),(0,.82,1,.97)]
    for (a,b,x,y) in sides:L.box(a,b,x,y,0,5,'CONC',2)
    if mode=='covered':
        for a in np.arange(.13,.9,.18):
            L.box(a,.14,a+.055,.86,4,6,'DARK',2)

@asset('selokan_lurus','lokal',1,1,24,note='Selokan beton terbuka modular tile lurus')
def drain_straight(L): gutter(L,'straight')
@asset('selokan_belok','lokal',1,1,24,note='Selokan beton belok 90 derajat')
def drain_corner(L): gutter(L,'corner')
@asset('selokan_simpang','lokal',1,1,24,note='Selokan beton simpang T')
def drain_junction(L): gutter(L,'junction')
@asset('selokan_grill','lokal',1,1,24,note='Selokan tutup kisi besi dan air gelap')
def drain_grill(L): gutter(L,'covered')

def river(L,bank='both',corner=False):
    W,D=L.W,L.D
    def water(a,b):
        m=np.full(a.shape,MI['WATER'],np.int16)
        z=((np.floor(a*15).astype(int)*13+np.floor(b*17).astype(int)*7)%83)
        t=np.where(z<4,4,np.where(z>76,1,2)).astype(np.int8)
        return m,t
    L.top(0,0,W,D,0,water,ground=True,shift=0)
    if bank in ('both','left'):
        L.box(0,0,.19,D,0,9,'CONC',3)
        L.box(.15,0,.24,D,0,5,'SOIL',2)
    if bank in ('both','right'):
        L.box(W-.19,0,W,D,0,9,'CONC',2)
        L.box(W-.24,0,W-.15,D,0,5,'SOIL',2)
    if corner:
        L.box(.04,0,W,.19,0,8,'CONC',2)
    # Water glints are restrained and in the same palette.
    for a,b in [(.64,.34),(1.21,.84),(.83,1.38),(1.19,1.68)]:
        if a<W and b<D:L.top(a,b,a+.21,b+.045,1,('WATER',4),ground=True,shift=0)

@asset('sungai_lurus','lokal',2,2,28,note='Sungai kota aliran keruh tenang, dua bibir beton')
def sungai_lurus(L): river(L)
@asset('sungai_tepi_kiri','lokal',2,2,28,note='Sungai tepi/tanggul beton sisi kiri')
def sungai_kiri(L): river(L,'left')
@asset('sungai_tepi_kanan','lokal',2,2,28,note='Sungai tepi/tanggul beton sisi kanan')
def sungai_kanan(L): river(L,'right')
@asset('sungai_belok','lokal',2,2,28,note='Sungai kota sudut tikungan dengan beton bantaran')
def sungai_corner(L): river(L,'both',True)

ALIASES={'lampu_taman':'lampu_taman_jakarta',
         'tong_sampah':'tong_sampah_jakarta'}
