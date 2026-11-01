"""Item temuan (found items) for Virtual Life: modelled with the street_buildings v6b engine (palette, light from the left,
5-tone ramps, darker right/bottom edge instead of an outline, flat black shadow alpha 56). One model function per item, drawn in
local px units (x along +c, y along +r, z up; 1 unit = 1 px at k=1) and scaled by k: ground sprite k=GK, icon k chosen to fit 32x32."""
import sys, math
sys.path.insert(0, 'assets/street_buildings/_work')
import numpy as np
from engine import Spr, Tex, MI, shade_n
GK = 1.5                    # ground sprites: real size exaggerated x1.5 for readability (avatar 86 px)

class It:
    def __init__(s, sp, c, r, k):
        s.sp, s.c, s.r, s.k = sp, c, r, k
    def C(s, x): return s.c + x * s.k / 32
    def R(s, y): return s.r + y * s.k / 32
    def Z(s, z): return int(round(z * s.k))
    def box(s, x0, y0, x1, y1, z0, z1, m, t=3, top=None, sw=None, se=None):
        Z0, Z1 = s.Z(z0), s.Z(z1)
        if Z1 <= Z0: Z1 = Z0 + 1
        tf = None
        if top is not None:
            tf = (lambda c, r, f=top: f((c - s.c) * 32 / s.k, (r - s.r) * 32 / s.k)) if callable(top) else top
        s.sp.box(s.C(x0), s.R(y0), s.C(x1), s.R(y1), Z0, Z1, m, t, sw=sw, se=se, topf=tf)
    def flat(s, x0, y0, x1, y1, z, f):
        tf = (lambda c, r: f((c - s.c) * 32 / s.k, (r - s.r) * 32 / s.k)) if callable(f) else f
        s.sp.top(s.C(x0), s.R(y0), s.C(x1), s.R(y1), s.Z(z), tf, shift=0)
    def cyl(s, x, y, z0, z1, rad, m, t=3, tf=None):
        s.sp.cyl(s.C(x), s.R(y), s.Z(z0), max(s.Z(z1), s.Z(z0) + 1), rad * s.k / 32, m, t, tf=tf)
    def dome(s, x, y, z0, rad, h, m, t=3):
        s.sp.dome(s.C(x), s.R(y), s.Z(z0), rad * s.k / 32, max(1, h * s.k), m, t)
    def _pts(s, X, Y, Zs, N, m, t):
        mm = m if not isinstance(m, str) else MI[m]
        tt = shade_n(N.reshape(-1, 3), t) if N is not None else np.full(X.size, t, np.int8)
        s.sp.points(s.C(X.ravel()), s.R(Y.ravel()), Zs.ravel() * s.k, mm, tt)
    def hcyl(s, a0, a1, y, zc, rad, m, t=3, axis='c', cap=True, x=None):
        """horizontal cylinder along +c (axis 'c': a = x, y fixed) or +r (axis 'r': a = y, x fixed)"""
        n = max(8, int((a1 - a0) * s.k * 3)); A = np.linspace(a0, a1, n)
        ph = np.linspace(0, 2 * np.pi, max(16, int(rad * s.k * 14)), endpoint=False); Aa, P = np.meshgrid(A, ph)
        u, w = np.cos(P), np.sin(P)
        if axis == 'c': X, Y, N = Aa, y + rad * u, np.stack([np.zeros_like(u), u, w], -1)
        else: X, Y, N = (x if x is not None else 0) + rad * u, Aa, np.stack([u, np.zeros_like(u), w], -1)
        s._pts(X, Y, zc + rad * w, N, m, t)
        if cap:
            rr = np.linspace(0, rad, max(3, int(rad * s.k * 2))); P2, R2 = np.meshgrid(ph, rr)
            for e, sg in ((a0, -1), (a1, 1)):
                if axis == 'c': X, Y = np.full(P2.shape, float(e)), y + R2 * np.cos(P2); NN = np.zeros(P2.shape + (3,)); NN[..., 0] = sg
                else: X, Y = (x if x is not None else 0) + R2 * np.cos(P2), np.full(P2.shape, float(e)); NN = np.zeros(P2.shape + (3,)); NN[..., 1] = sg
                s._pts(X, Y, zc + R2 * np.sin(P2), NN, m, t)
    def torus(s, x, y, z0, R, rad, m, t=3, th0=0, th1=2 * np.pi):
        th = np.linspace(th0, th1, max(24, int(R * s.k * 10))); ph = np.linspace(0, 2 * np.pi, max(10, int(rad * s.k * 12)), endpoint=False)
        T, P = np.meshgrid(th, ph); rr = R + rad * np.cos(P)
        X = x + rr * np.cos(T); Y = y + rr * np.sin(T); Zs = z0 + rad + rad * np.sin(P)
        N = np.stack([np.cos(P) * np.cos(T), np.cos(P) * np.sin(T), np.sin(P)], -1)
        s._pts(X, Y, Zs, N, m, t)
    def line(s, pts, m, t, rad=0.5):
        """thin rod through 3D points (x,y,z)"""
        for (a, b) in zip(pts, pts[1:]):
            L = max(1e-3, math.dist(a, b)); n = max(4, int(L * s.k * 3))
            T = np.linspace(0, 1, n)[:, None]; P = np.array(a)[None] + (np.array(b) - np.array(a))[None] * T
            s._pts(P[:, 0], P[:, 1], P[:, 2] + rad, None, m, t)
    def disc(s, x, y, z, rad, m, t=3, f=None):
        ph = np.linspace(0, 2 * np.pi, max(16, int(rad * s.k * 12)), endpoint=False); rr = np.linspace(0, rad, max(3, int(rad * s.k * 3)))
        P, Rr = np.meshgrid(ph, rr); X = x + Rr * np.cos(P); Y = y + Rr * np.sin(P)
        if f is None: s._pts(X, Y, np.full(X.shape, z, float), None, m, t)
        else:
            mm, tt = f(X.ravel() - x, Y.ravel() - y)
            s.sp.points(s.C(X.ravel()), s.R(Y.ravel()), np.full(X.size, z * s.k), mm, tt)
    def shadow(s, rx, ry, dx=2):
        s.sp.ellipse_shadow(s.c, s.r, int(round(rx * s.k)), int(round(ry * s.k)), dx=int(round(dx * s.k)))

def stripes(axis, k, m1, t1, m2, t2, w=0.5):
    def f(x, y):
        v = x if axis == 'x' else y; band = ((v / k) % 1) < w
        return np.where(band, MI[m1], MI[m2]).astype(np.int16), np.where(band, t1, t2).astype(np.int8)
    return f
def tex(fn):
    def mk(w, h):
        tx = Tex(max(1, w), max(1, h), 'DARK', 3); fn(tx, w, h); return tx
    return mk

# ================================================================ item models
M = {}
def item(id_, nama, rarity, harga, lokasi, bobot, deskripsi, varian=None):
    def deco(fn):
        M[id_] = dict(fn=fn, nama=nama, rarity=rarity, harga=harga, lokasi=lokasi, bobot=bobot, deskripsi=deskripsi, varian=varian or {'': {}})
        return fn
    return deco
L_JALAN, L_TROT, L_TAMAN, L_GANG, L_WARUNG, L_INDO, L_TONG, L_KARDUS, L_KRESEK, L_GOT, L_BANGKU = ('jalan', 'trotoar', 'taman', 'gang', 'sekitar_warung', 'belakang_indomaret', 'tong_sampah', 'tumpukan_kardus', 'kantong_kresek', 'got', 'kolong_bangku')

@item('botol_plastik', 'Botol plastik bekas', 'umum', 300, [L_JALAN, L_TROT, L_TAMAN, L_TONG, L_INDO], 14, 'botol air mineral kosong, penyok', {'bening': dict(b='GLASS', cap='BLUE', lab='BLUE'), 'hijau': dict(b='TEAL', cap='GREEN', lab='YEL')})
def botol(I, b='GLASS', cap='BLUE', lab='BLUE'):
    I.shadow(9, 3); I.hcyl(-7, 3, 0, 2.6, 2.6, b, 3); I.hcyl(-3, 0.5, 0, 2.6, 2.75, lab, 3, cap=False)
    I.hcyl(3, 5.5, 0, 2.6, 1.6, b, 3); I.hcyl(5.5, 7, 0, 2.6, 1.8, cap, 3)
@item('kaleng_minuman', 'Kaleng minuman bekas', 'umum', 400, [L_JALAN, L_TROT, L_TAMAN, L_TONG, L_WARUNG], 12, 'kaleng soda kosong, bisa dijual kiloan', {'merah': dict(m='RED'), 'hijau': dict(m='GREEN')})
def kaleng(I, m='RED'):
    I.shadow(6, 3); I.hcyl(-3.5, 3.5, 0, 2.6, 2.6, m, 3); I.hcyl(-1, 1, 0, 2.6, 2.65, 'LITE', 3, cap=False); I.hcyl(3.5, 4, 0, 2.6, 2.3, 'CONC', 3)
@item('kardus_lipat', 'Kardus bekas dilipat', 'umum', 800, [L_INDO, L_WARUNG, L_KARDUS, L_GANG], 12, 'kardus mi instan dilipat pipih')
def kardus(I):
    I.shadow(10, 6); I.box(-8, -6, 8, 6, 0, 2, 'CARD', 3, top=lambda x, y: (np.where(np.abs(y) < 1.2, MI['CARD'], MI['CARD']).astype(np.int16), np.where(np.abs(y) < 1.2, 3, np.where((x > 2) & (x < 6) & (y > 2) & (y < 4.5), 0, 2)).astype(np.int8)))
@item('koran_bekas', 'Koran bekas', 'umum', 500, [L_TROT, L_TAMAN, L_WARUNG, L_BANGKU], 12, 'koran lama terlipat, dijual kiloan')
def koran(I):
    I.shadow(9, 5)
    def f(x, y):
        m = np.full(x.shape, MI['LITE'], np.int16); t = np.full(x.shape, 2, np.int8)
        line = ((np.floor(y) % 2) == 0) & (np.abs(x) < 5.5) & (y > -3); t = np.where(line, 0, t)
        head = (y < -3.2) & (y > -5) & (np.abs(x) < 5.5); m = np.where(head, MI['DARK'], m); t = np.where(head, 2, t)
        pic = (x > 0.5) & (x < 5) & (y > 0) & (y < 3.5); m = np.where(pic, MI['CONC'], m); t = np.where(pic, 2, t)
        return m, t
    I.box(-7, -6, 7, 6, 0, 2, 'LITE', 2, top=f)
@item('sandal_jepit', 'Sandal jepit putus', 'umum', 300, [L_JALAN, L_TROT, L_TAMAN, L_GOT, L_GANG], 10, 'sandal jepit karet, talinya putus', {'biru': dict(m='TARPB', s='BLUE'), 'merah': dict(m='RED', s='WHITE')})
def sandal(I, m='TARPB', s='BLUE'):
    I.shadow(9, 5)
    for x0, y0 in ((-6, -5), (1, -2)):
        I.box(x0, y0, x0 + 4, y0 + 9, 0, 1.5, 'WHITE', 2, top=lambda x, y: (np.full(x.shape, MI[m], np.int16), np.full(x.shape, 3, np.int8)))
    I.line([(-4, -3.5, 1.5), (-5.6, 0, 1.5)], s, 3); I.line([(-4, -3.5, 1.5), (-2.4, 0, 1.5)], s, 3)
    I.line([(3, -0.5, 1.5), (1.4, 2.5, 1.5)], s, 3)
@item('kabel_bekas', 'Gulungan kabel bekas', 'umum', 1500, [L_GANG, L_TONG, L_GOT, L_WARUNG], 9, 'kabel listrik sisa, tembaganya bisa dijual')
def kabel(I):
    I.shadow(8, 4); I.torus(0, 0, 0, 5, 0.9, 'BAGK', 3); I.torus(0.5, 0.3, 0.8, 4.2, 0.8, 'BAGK', 3)
    I.line([(4.5, 2, 0.5), (8, 4, 0.5)], 'BAGK', 3); I.box(8, 3, 10.5, 5.5, 0, 2.5, 'WHITE', 3)
@item('charger_rusak', 'Charger HP rusak', 'umum', 1500, [L_WARUNG, L_TONG, L_TROT, L_GANG], 8, 'kepala charger putih, kabel terkelupas')
def charger(I):
    I.shadow(7, 4); I.box(-3, -2, 2, 2, 0, 4, 'WHITE', 3); I.box(-4.5, -1, -3, -0.4, 1.5, 2.3, 'CONC', 4); I.box(-4.5, 0.6, -3, 1.2, 1.5, 2.3, 'CONC', 4)
    I.line([(2, 0, 1), (4, 2, 0.3), (2, 4, 0.2), (5, 6, 0.2), (7, 4, 0.2)], 'WHITE', 2)
@item('kaset_pita', 'Kaset pita lama', 'umum', 2500, [L_GANG, L_TONG, L_KARDUS, L_WARUNG], 7, 'kaset lagu lawas, pitanya sedikit kusut')
def kaset(I):
    I.shadow(7, 5)
    def f(x, y):
        m = np.full(x.shape, MI['BAGK'], np.int16); t = np.full(x.shape, 2, np.int8)
        lab = (np.abs(x) < 4) & (y > -3) & (y < 2.5); m = np.where(lab, MI['ORANGE'], m); t = np.where(lab, 3, t)
        win = (np.abs(x) < 2.6) & (y > -0.8) & (y < 1.2); m = np.where(win, MI['DARK'], m); t = np.where(win, 1, t)
        reel = (np.hypot(np.abs(x) - 1.6, y - 0.2) < 0.7); m = np.where(reel, MI['WHITE'], m); t = np.where(reel, 3, t)
        return m, t
    I.box(-5, -3.5, 5, 3.5, 0, 1.5, 'BAGK', 2, top=f)
    I.line([(4, 2, 1.5), (6, 3.5, 0.2), (7.5, 2, 0.2)], 'DARK', 1)
@item('buku_bekas', 'Buku bekas', 'umum', 2000, [L_TAMAN, L_BANGKU, L_KARDUS, L_GANG], 9, 'buku pelajaran lama, sampulnya lecek', {'merah': dict(m='RED'), 'biru': dict(m='BLUE')})
def buku(I, m='RED'):
    I.shadow(8, 5)
    pages = tex(lambda tx, w, h: [tx.rect(0, 0, w, h, 'CREAM', 3), tx.rect(0, h - 1, w, h, m, 2), tx.rect(0, 0, w, 1, m, 2)])
    I.box(-5, -6.5, 5, 6.5, 0, 3, m, 3, sw=pages, se=pages, top=lambda x, y: (np.where((np.abs(x) < 3) & (np.abs(y + 2.5) < 1), MI['LITE'], MI[m]).astype(np.int16), np.where((np.abs(x) < 3) & (np.abs(y + 2.5) < 1), 3, np.where(x < -4, 2, 3)).astype(np.int8)))
@item('payung_rusak', 'Payung rusak', 'umum', 2000, [L_TROT, L_TAMAN, L_TONG, L_JALAN], 6, 'payung lipat, rangkanya patah', {'ungu': dict(m='PURP'), 'hitam': dict(m='BAGK')})
def payung(I, m='PURP'):
    I.shadow(12, 3)
    for k, rad in enumerate(np.linspace(2.4, 0.8, 8)): I.hcyl(-9 + k * 2, -7 + k * 2, 0, 2.6, rad, m, 3, cap=False)
    I.hcyl(7, 10, 0, 2.6, 0.5, 'CONC', 3); I.line([(-9, 0, 2.2), (-11, 0, 2.2), (-11.5, 1.5, 1.4), (-10.5, 2.5, 0.6)], 'WOOD', 2, rad=0.7)
    I.line([(-3, 2, 4.5), (-1, 5.5, 3.5)], 'CONC', 3); I.line([(1, -2, 4), (3, -4.5, 5.5)], 'CONC', 3)
@item('sepatu_bekas', 'Sepatu bekas', 'umum', 3000, [L_TROT, L_TAMAN, L_TONG, L_GANG], 7, 'sepatu kets sebelah, solnya mangap', {'putih': dict(m='WHITE', s='RED'), 'hitam': dict(m='BAGK', s='WHITE')})
def sepatu(I, m='WHITE', s='RED'):
    I.shadow(10, 4); I.box(-8, -3, 8, 3, 0, 2, 'WHITE', 2)
    I.box(-8, -2.6, 2, 2.6, 2, 7, m, 3); I.dome(3, 0, 2, 3.4, 3, m, 3); I.box(-8, -2.8, -6, 2.8, 2, 8, m, 2)
    I.line([(-4, -2.7, 4), (0, -2.7, 4)], s, 3); I.flat(-5, -1.6, -1, 1.6, 7.01, ('DARK', 2))
@item('dompet_kosong', 'Dompet kosong', 'umum', 3000, [L_TROT, L_TAMAN, L_BANGKU, L_GOT], 6, 'dompet kulit sintetis, isinya sudah tidak ada (KTP tidak ada)')
def dompet(I):
    I.shadow(7, 5); I.box(-5, -4, 5, 4, 0, 2.5, 'WOOD', 2, top=lambda x, y: (np.full(x.shape, MI['WOOD'], np.int16), np.where((np.abs(np.abs(x) - 4.2) < 0.4) | (np.abs(np.abs(y) - 3.2) < 0.4), 3, 2).astype(np.int8)))
    I.box(1, -4.2, 5, -1, 1.2, 1.8, 'GOLD', 3)
@item('gelas_plastik', 'Gelas plastik es teh', 'umum', 200, [L_JALAN, L_TROT, L_WARUNG, L_TONG], 14, 'gelas plastik bekas es teh, sedotannya masih nancep')
def gelas(I):
    I.shadow(5, 3); I.cyl(0, 0, 0, 7, 2.3, 'GLASS', 4); I.cyl(0, 0, 7, 8, 2.7, 'LITE', 3); I.line([(0.5, 0.5, 8), (1.6, 0.8, 13)], 'RED', 3)
    I.cyl(0, 0, 1, 3, 2.35, 'ORANGE', 2)
@item('ember_bocor', 'Ember bocor', 'umum', 2500, [L_GANG, L_WARUNG, L_KARDUS], 6, 'ember plastik hitam, dasarnya bolong')
def ember(I):
    I.shadow(8, 4); I.cyl(0, 0, 0, 9, 5, 'BAGK', 3); I.disc(0, 0, 8.6, 4.2, 'DARK', 1); I.torus(0, 0, 8.4, 5, 0.6, 'BAGK', 3)
    I.line([(-5, 0, 8), (-3, -3, 13), (3, -3, 13), (5, 0, 8)], 'CONC', 3)
@item('hp_jadul', 'HP jadul rusak', 'jarang', 15000, [L_TROT, L_TAMAN, L_BANGKU, L_GOT, L_WARUNG], 5, 'HP Nokia klasik, layarnya retak, masih bisa diservis', {'biru': dict(m='BLUE'), 'abu': dict(m='CONC')})
def hp(I, m='BLUE'):
    I.shadow(4, 6)
    def f(x, y):
        mm = np.full(x.shape, MI[m], np.int16); t = np.full(x.shape, 2, np.int8)
        scr = (np.abs(x) < 1.6) & (y > -5) & (y < -1.5); mm = np.where(scr, MI['GLASS'], mm); t = np.where(scr, 1, t)
        crack = scr & (np.abs((x + 1.6) * 1.1 - (y + 5)) < 0.35); mm = np.where(crack, MI['LITE'], mm); t = np.where(crack, 3, t)
        keys = (np.abs(x) < 1.8) & (y > 0) & (y < 5) & ((np.floor(x * 1.4) % 2) == 0) & ((np.floor(y * 1.2) % 2) == 0); mm = np.where(keys, MI['LITE'], mm); t = np.where(keys, 1, t)
        return mm, t
    I.box(-2.6, -6, 2.6, 6, 0, 2, m, 2, top=f)
@item('jam_tangan_rusak', 'Jam tangan rusak', 'jarang', 12000, [L_TROT, L_TAMAN, L_BANGKU, L_GOT], 5, 'jam tangan analog, kacanya retak, talinya kulit')
def jam_tangan(I):
    I.shadow(5, 6); I.box(-1.6, -7, 1.6, 7, 0, 0.8, 'WOOD', 2); I.cyl(0, 0, 0, 1.6, 2.8, 'CONC', 3)
    I.disc(0, 0, 1.7, 2.2, 'LITE', 3); I.line([(0, 0, 1.6), (0, -1.6, 1.6)], 'DARK', 1, 0.2); I.line([(0, 0, 1.6), (1.2, 0, 1.6)], 'DARK', 1, 0.2)
@item('kacamata', 'Kacamata bekas', 'jarang', 8000, [L_TAMAN, L_BANGKU, L_TROT], 6, 'kacamata minus, satu gagangnya longgar')
def kacamata(I):
    I.shadow(7, 3)
    for x in (-2.8, 2.8): I.torus(x, 0, 0.5, 2.2, 0.45, 'DARK', 2); I.disc(x, 0, 1.0, 1.9, 'GLASS', 4)
    I.line([(-0.6, 0, 1.4), (0.6, 0, 1.4)], 'DARK', 2); I.line([(-5, -0.3, 1), (-5.4, -7, 0.5)], 'DARK', 2); I.line([(5, -0.3, 1), (6.5, -5.5, 0.3)], 'DARK', 2)
@item('kunci_lama', 'Kunci lama', 'jarang', 5000, [L_GANG, L_GOT, L_TROT, L_BANGKU], 7, 'dua anak kunci kuningan di ring besi')
def kunci(I):
    I.shadow(6, 3); I.torus(-3, 0, 0, 1.8, 0.35, 'CONC', 3)
    for dy in (-0.8, 1.2):
        I.torus(-0.5, dy, 0, 1.0, 0.45, 'GOLD', 3); I.box(0.5, dy - 0.4, 6, dy + 0.4, 0, 0.9, 'GOLD', 3); I.box(4, dy + 0.4, 5, dy + 1.2, 0, 0.9, 'GOLD', 3); I.box(5.4, dy + 0.4, 6, dy + 1, 0, 0.9, 'GOLD', 3)
@item('besi_tua', 'Besi tua', 'jarang', 6000, [L_GANG, L_KARDUS, L_INDO, L_GOT], 8, 'potongan pipa besi berkarat + mur, dijual kiloan')
def besi(I):
    I.shadow(11, 3); I.hcyl(-10, 9, 0, 1.8, 1.8, 'TERRA', 2)
    I.hcyl(-10, -8, 0, 1.8, 2.2, 'SOIL', 2); I.cyl(4, 4, 0, 1.5, 1.6, 'CONC', 2); I.disc(4, 4, 1.6, 0.6, 'DARK', 1)
@item('helm_bekas', 'Helm bekas', 'jarang', 20000, [L_TROT, L_INDO, L_WARUNG, L_TONG], 5, 'helm half-face, kaca visornya baret', {'merah': dict(m='RED'), 'putih': dict(m='WHITE'), 'hitam': dict(m='BAGK')})
def helm(I, m='RED'):
    I.shadow(9, 5); I.cyl(0, 0, 0, 1.5, 7, 'DARK', 2); I.dome(0, 0, 1, 7, 8, m, 3)
    I.flat(-4, 4, 4, 7.2, 4.5, ('GLASS', 3)); I.line([(-6, 2, 0.5), (-4, 6, 0.3), (0, 7, 0.3)], 'DARK', 1)
@item('tas_bekas', 'Tas bekas', 'jarang', 15000, [L_TAMAN, L_BANGKU, L_TONG, L_GANG], 5, 'tas selempang, resletingnya macet', {'coklat': dict(m='TERRA'), 'hitam': dict(m='BAGK')})
def tas(I, m='TERRA'):
    I.shadow(9, 5); I.box(-7, -3, 7, 3, 0, 10, m, 3)
    I.box(-7, 1.8, 7, 3.2, 4, 10.5, m, 2); I.line([(-5, 0, 10), (-3, 0, 15), (3, 0, 15), (5, 0, 10)], 'BAGK', 2, 0.6)
    I.box(-2, 3.2, 2, 3.4, 5, 7, 'GOLD', 3)
@item('boneka_kain', 'Boneka beruang kumal', 'jarang', 7000, [L_TAMAN, L_BANGKU, L_TONG, L_KARDUS], 6, 'boneka beruang kain, satu matanya copot')
def boneka(I):
    I.shadow(7, 4); I.dome(0, 0, 0, 4.5, 8, 'CARD', 3); I.dome(0, 0.5, 7, 3.5, 6, 'CARD', 3)
    for x in (-2.6, 2.6): I.dome(x, 0, 11.5, 1.3, 2, 'CARD', 2)
    I.dome(0, 2.8, 8.5, 1.2, 1.5, 'CREAM', 3); I.sp.points([I.C(-1)], [I.R(3.1)], [10.6 * I.k], 'DARK', 0)
    for x in (-3.5, 3.5): I.dome(x, 2.5, 0, 1.6, 2.5, 'CARD', 3)
@item('mainan_mobil', 'Mobil-mobilan rusak', 'jarang', 6000, [L_TAMAN, L_GANG, L_BANGKU, L_KARDUS], 6, 'mobil-mobilan plastik, satu rodanya hilang', {'merah': dict(m='RED'), 'kuning': dict(m='YEL')})
def mobil(I, m='RED'):
    I.shadow(9, 5); I.box(-7, -3, 7, 3, 1.5, 5, m, 3); I.box(-3, -2.6, 3, 2.6, 5, 8, m, 3)
    I.flat(-2.8, -2.4, 2.8, 2.4, 8.01, ('GLASS', 3))
    for x, y in ((-4.5, 3), (4.5, 3), (-4.5, -3)): I.hcyl(y - 0.8, y + 0.8, 0, 1.8, 1.8, 'DARK', 2, axis='r', x=x)
@item('kipas_angin', 'Kipas angin meja rusak', 'jarang', 25000, [L_GANG, L_KARDUS, L_WARUNG], 4, 'kipas angin meja, baling-balingnya patah satu')
def kipas(I):
    I.shadow(9, 5); I.cyl(0, 0, 0, 2, 5, 'WHITE', 3); I.cyl(0, 0, 2, 12, 0.9, 'WHITE', 3)
    I.cyl(0, -0.5, 10, 13, 2, 'WHITE', 2)
    ph = np.linspace(0, 2 * np.pi, 120); 
    for rad, m in ((7, 'CONC'), (5, 'CONC')):
        I.line([(rad * math.cos(a), 1.5, 16 + rad * math.sin(a)) for a in ph], m, 3, 0.25)
    for a in (0.3, 2.4):
        I.line([(0, 1.3, 16), (5 * math.cos(a), 1.3, 16 + 5 * math.sin(a))], 'TARPB', 3, 0.9)
    I.line([(0, 1.3, 16), (2.5 * math.cos(4.5), 1.3, 16 + 2.5 * math.sin(4.5))], 'TARPB', 3, 0.9)
    I.cyl(0, 1.6, 15.2, 16.8, 1, 'BLUE', 3)
@item('setrika_lama', 'Setrika lama', 'jarang', 12000, [L_GANG, L_KARDUS, L_WARUNG], 4, 'setrika listrik jadul, kabelnya putus')
def setrika(I):
    I.shadow(9, 5)
    I.box(-6, -3.5, 6, 3.5, 0, 1.5, 'CONC', 4); I.box(-5, -3, 4, 3, 1.5, 5, 'RED', 3); I.dome(4, 0, 1.5, 3, 3.5, 'RED', 3)
    I.line([(-4, 0, 5), (-4, 0, 9), (2, 0, 9), (3, 0, 5)], 'BAGK', 2, 0.8); I.line([(-6, 0, 3), (-9, 2, 0.3), (-11, 0, 0.3)], 'BAGK', 2)
@item('radio_tua', 'Radio tua', 'jarang', 30000, [L_GANG, L_KARDUS, L_WARUNG], 3, 'radio transistor kayu, masih ada bunyi kresek-kresek')
def radio(I):
    I.shadow(10, 5)
    def front(tx, w, h):
        tx.rect(0, 0, w, h, 'WOOD', 3); tx.rect(1, 1, int(w * 0.55), h - 2, 'SENG', 2)
        for v in range(2, h - 2, 2): tx.rect(1, v, int(w * 0.55), v + 1, 'SENG', 1)
        tx.rect(int(w * 0.62), int(h * 0.55), w - 2, h - 2, 'CREAM', 3); tx.rect(int(w * 0.65), int(h * 0.7), w - 3, int(h * 0.7) + 1, 'RED', 3)
        tx.rect(int(w * 0.65), 2, int(w * 0.78), int(h * 0.35), 'GOLD', 3); tx.rect(int(w * 0.82), 2, w - 2, int(h * 0.35), 'GOLD', 3)
    I.box(-7, -3, 7, 3, 0, 10, 'WOOD', 3, sw=tex(front)); I.line([(5, -1, 10), (9, -3, 22)], 'CONC', 4, 0.3)
    I.line([(-4, 0, 10), (-2, 0, 13), (2, 0, 13), (4, 0, 10)], 'BAGK', 2, 0.5)
@item('jam_dinding', 'Jam dinding mati', 'jarang', 15000, [L_GANG, L_KARDUS, L_WARUNG], 4, 'jam dinding bulat, jarumnya berhenti di 10:10')
def jam_dinding(I):
    I.shadow(8, 5); I.cyl(0, 0, 0, 2, 6.5, 'RED', 3); I.disc(0, 0, 2.05, 5.6, 'WHITE', 4)
    for a in np.linspace(0, 2 * np.pi, 12, endpoint=False): I.sp.points([I.C(4.6 * math.cos(a))], [I.R(4.6 * math.sin(a))], [2.2 * I.k], 'DARK', 2)
    I.line([(0, 0, 2.1), (-2.2, -2.2, 2.1)], 'DARK', 1, 0.15); I.line([(0, 0, 2.1), (3, -3, 2.1)], 'DARK', 1, 0.15)
@item('gembok_tua', 'Gembok tua', 'jarang', 8000, [L_GANG, L_GOT, L_KARDUS], 6, 'gembok kuningan tanpa kunci')
def gembok(I):
    I.shadow(5, 3); I.box(-3, -1.5, 3, 1.5, 0, 6, 'GOLD', 3, sw=tex(lambda tx, w, h: [tx.rect(0, 0, w, h, 'GOLD', 3), tx.rect(w // 2 - 1, h // 4, w // 2 + 1, h // 2 + 1, 'DARK', 1)])); I.line([(2.2 * math.cos(a), 0, 6 + 2.6 * math.sin(a)) for a in np.linspace(0, np.pi, 24)], 'CONC', 3, 0.7)
    I.box(-0.4, 1.5, 0.4, 1.7, 2, 4, 'DARK', 1)
@item('senter_rusak', 'Senter rusak', 'jarang', 5000, [L_GANG, L_TROT, L_BANGKU], 6, 'senter plastik kuning, baterainya bocor')
def senter(I):
    I.shadow(9, 3); I.hcyl(-7, 3, 0, 2, 2, 'YEL', 3); I.hcyl(3, 6, 0, 2.4, 2.8, 'YEL', 3); I.hcyl(6, 6.4, 0, 2.4, 2.4, 'GLASS', 4)
    I.hcyl(-2, 0, 0, 2, 2.1, 'DARK', 2, cap=False)
@item('koin_kuno', 'Koin kuno', 'langka', 50000, [L_TAMAN, L_GOT, L_BANGKU, L_GANG], 2, 'beberapa koin lama (100 rupiah 1973, sen Hindia Belanda)')
def koin(I):
    I.shadow(6, 3)
    for x, y, m in ((-2.5, 0, 'GOLD'), (1.5, -1, 'CONC'), (0.5, 2, 'GOLD'), (3.5, 1.5, 'TERRA')):
        I.cyl(x, y, 0, 0.8, 1.8, m, 3); I.disc(x, y, 0.85, 1.2, m, 4)
@item('tembaga_gulungan', 'Gulungan kawat tembaga', 'langka', 40000, [L_GANG, L_KARDUS, L_INDO], 3, 'kawat tembaga bekas gulungan dinamo, mahal di pengepul')
def tembaga(I):
    I.shadow(8, 5)
    for k in range(4): I.torus(0, 0, k * 1.1, 5.2 - k * 0.25, 0.7, 'TERRA', 3 + (k % 2))
    I.line([(4, 2, 4), (7, 5, 0.5)], 'ORANGE', 3, 0.4)
@item('aki_bekas', 'Aki bekas', 'langka', 35000, [L_GANG, L_INDO, L_WARUNG], 3, 'aki motor/mobil bekas, berat, dibeli pengepul')
def aki(I):
    I.shadow(10, 6)
    def side(tx, w, h): tx.rect(0, 0, w, h, 'BAGK', 3); tx.rect(1, int(h * 0.35), w - 1, int(h * 0.7), 'YEL', 3); tx.rect(2, int(h * 0.45), w - 2, int(h * 0.6), 'DARK', 2)
    I.box(-7, -4, 7, 4, 0, 9, 'BAGK', 3, sw=tex(side))
    I.cyl(-4.5, 1, 9, 11, 1, 'RED', 3); I.cyl(4.5, 1, 9, 11, 1, 'DARK', 3)
@item('kamera_analog', 'Kamera analog', 'langka', 80000, [L_TAMAN, L_BANGKU, L_KARDUS], 2, 'kamera film jadul, lensanya masih utuh')
def kamera(I):
    I.shadow(8, 5); I.box(-6, -2.5, 6, 2.5, 0, 7, 'BAGK', 3); I.box(-6, -2.5, 6, 2.5, 7, 8, 'CONC', 4)
    I.box(-4.5, -1.5, -2, 1.5, 8, 9.5, 'CONC', 3)
    I.hcyl(2.5, 6, 0, 3.6, 2.6, 'BAGK', 3, axis='r', x=0.5); I.hcyl(6, 6.3, 0, 3.6, 2, 'GLASS', 4, axis='r', x=0.5)
    I.box(3, -1, 4.5, 1, 8, 9, 'RED', 3)
@item('walkman', 'Walkman kaset', 'langka', 60000, [L_TAMAN, L_BANGKU, L_KARDUS], 2, 'pemutar kaset portabel tahun 80-an')
def walkman(I):
    I.shadow(6, 7)
    def f(x, y):
        m = np.full(x.shape, MI['YEL'], np.int16); t = np.full(x.shape, 3, np.int8)
        w = (np.abs(x) < 2.5) & (y > -3) & (y < 1.5); m = np.where(w, MI['GLASS'], m); t = np.where(w, 2, t)
        b = (y > 3) & (y < 4.5) & (np.abs(x) < 3) & ((np.floor(x * 1.2) % 2) == 0); m = np.where(b, MI['CONC'], m); t = np.where(b, 4, t)
        return m, t
    I.box(-4, -5.5, 4, 5.5, 0, 2.5, 'YEL', 2, top=f)
    I.line([(-3, -5.5, 2), (-6, -7, 0.3), (-8, -4, 0.3)], 'DARK', 1); I.cyl(-8.5, -3.5, 0, 1.5, 1.4, 'ORANGE', 3)
@item('piringan_hitam', 'Piringan hitam', 'langka', 70000, [L_GANG, L_KARDUS], 2, 'piringan hitam lagu keroncong dalam sampul kertas')
def piringan(I):
    I.shadow(10, 6); I.box(-8, -8, 8, 8, 0, 1, 'CARD', 3, top=lambda x, y: (np.where((x > 2) & (y > 2), MI['RED'], MI['CARD']).astype(np.int16), np.full(x.shape, 3, np.int8)))
    I.disc(-1.5, -1.5, 1.4, 7.5, 'DARK', 2, f=lambda x, y: (np.where(np.hypot(x, y) < 2.3, MI['RED'], MI['DARK']).astype(np.int16), np.where(np.hypot(x, y) < 2.3, 3, np.where((np.hypot(x, y) * 2.5) % 1 < 0.3, 3, 2)).astype(np.int8)))
@item('arloji_saku', 'Arloji saku antik', 'langka', 120000, [L_TAMAN, L_GOT, L_BANGKU], 1, 'arloji saku kuningan dengan rantai, barang antik incaran kolektor')
def arloji(I):
    I.shadow(6, 4); I.cyl(0, 0, 0, 1.6, 3.4, 'GOLD', 3); I.disc(0, 0, 1.65, 2.7, 'CREAM', 4)
    I.line([(0, 0, 1.7), (0, -1.9, 1.7)], 'DARK', 1, 0.15); I.line([(0, 0, 1.7), (1.3, 0.4, 1.7)], 'DARK', 1, 0.15)
    I.torus(0, -3.8, 0.5, 0.5, 0.3, 'GOLD', 3); I.line([(0, -4.4, 0.4), (-3, -6, 0.2), (-6, -3, 0.2), (-6.5, 1, 0.2)], 'GOLD', 4, 0.2)
@item('lampu_petromaks', 'Lampu petromaks', 'langka', 90000, [L_GANG, L_KARDUS], 1, 'lampu petromaks kuningan peninggalan pedagang malam')
def petromaks(I):
    I.shadow(7, 4); I.cyl(0, 0, 0, 5, 3.6, 'GOLD', 3); I.cyl(0, 0, 5, 6, 1.4, 'GOLD', 2)
    I.cyl(0, 0, 6, 12, 2.4, 'GLASS', 4); I.cyl(0, 0, 8, 10, 1, 'WHITE', 4)
    I.cyl(0, 0, 12, 13, 2.8, 'GOLD', 3); I.dome(0, 0, 13, 2.6, 3, 'GOLD', 3)
    I.line([(-2.6, 0, 13), (-2.6, 0, 18), (2.6, 0, 18), (2.6, 0, 13)], 'CONC', 3, 0.3)
