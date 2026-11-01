"""Taman (park) modules for the far side behind / around the new row: v6b engine, palette from engine.py only (no new hex).
Furniture: bangku_taman (4 oris), lampu_taman, tong_sampah (organik/anorganik), meja_taman (concrete table + 4 stools),
pergola (open wooden pergola with 2 benches), gazebo (raised wooden gazebo, tiled roof). Ground: jalur_paving_lurus, jalur_paving_simpang,
plaza_paving (4x4). Loc frame: a along the facade, b depth (0 = side facing the viewer); ne/nw = back view (flip)."""
from lib import *
G = 'taman'
def wood_slats(axis='b', k=10, m='WOOD'):
    def f(a, b):
        v = b if axis == 'b' else a
        return np.full(a.shape, MI[m], np.int16), np.where((v * k) % 1 < 0.22, 2, 3).astype(np.int8)
    return f
def path_tex(a, b, edge_b=None, edge_a=None, W=2, D=2):
    m, t = pave(a, b, base=3, grid=0.5)
    ia = np.floor(a / 0.5).astype(int); ib = np.floor(b / 0.5).astype(int)
    t = np.where(((ia + 2 * ib) % 3 == 0) & (t == 3), 4, t).astype(np.int8)       # lighter block every 3rd: subtle pattern
    m = m.copy(); t = t.copy()
    def S(mask, mat, tone): m[mask] = MI[mat]; t[mask] = tone
    if edge_b:
        k = (b < 0.1) | (b > D - 0.1); S(k, 'CONC', 3); S(k & (((a * 4) % 1) < 0.08), 'CONC', 2)
    if edge_a == 'corners':
        k = ((a < 0.1) | (a > W - 0.1)) & ((b < 0.1) | (b > D - 0.1)); S(k, 'CONC', 3)
    return m, t

# ---------------------------------------------------------------- furniture
@asset('bangku_taman', G, 2, 1, 60, oris=('sw', 'se', 'ne', 'nw'),
       note='bangku taman 2 sel: dudukan & sandaran bilah kayu, kaki/rangka besi hitam. _sw/_se duduk menghadap kamera, _ne/_nw membelakangi')
def bangku(L):
    for a in (0.2, 1.7):
        L.box(a, 0.28, a + 0.1, 0.36, 0, 16, 'DARK', 3); L.box(a, 0.62, a + 0.1, 0.7, 0, 16, 'DARK', 3)      # legs
        L.box(a, 0.28, a + 0.1, 0.7, 24, 26, 'DARK', 3); L.box(a, 0.28, a + 0.1, 0.34, 16, 24, 'DARK', 3)   # armrest + post
        L.box(a, 0.7, a + 0.1, 0.76, 16, 40, 'DARK', 3)                                                    # back post
    L.box(0.12, 0.3, 1.88, 0.7, 16, 19, 'WOOD', 3, topf=wood_slats('b', 10))
    def back(w, h):
        tx = Tex(w, h, 'WOOD', 3)
        for v in (5, 11): tx.rect(0, v, w, v + 1, 'WOOD', 1)
        return tx
    L.box(0.12, 0.7, 1.88, 0.76, 22, 39, 'WOOD', 3, front=back)
    c, r = L.cr(1.0, 0.5); L.s.ellipse_shadow(c, r, 30, 8, dx=6)

@asset('lampu_taman', G, 1, 1, 130, note='lampu taman: tiang besi hitam ramping, lentera kaca hangat (glow), tutup kubah')
def lampu(L):
    c, r = L.cr(0.5, 0.5)
    L.s.cyl(c, r, 0, 6, 0.12, 'DARK', 3); L.s.cyl(c, r, 6, 92, 0.045, 'DARK', 3); L.s.cyl(c, r, 92, 96, 0.1, 'DARK', 2)
    L.s.cyl(c, r, 96, 111, 0.1, 'WARM', 3, glow=True); L.s.cyl(c, r, 111, 113, 0.13, 'DARK', 3); L.s.dome(c, r, 113, 0.13, 7, 'DARK', 3)
    L.s.ellipse_shadow(c, r, 10, 4, dx=4)

@asset('tong_sampah', G, 1, 1, 60, note='tong sampah taman 2 bak: hijau ORGANIK, kuning ANORGANIK, rangka besi hitam')
def tong(L):
    L.box(0.08, 0.47, 0.13, 0.53, 0, 38, 'DARK', 3); L.box(0.87, 0.47, 0.92, 0.53, 0, 38, 'DARK', 3)
    L.box(0.08, 0.47, 0.92, 0.53, 34, 37, 'DARK', 3)
    for a, m in ((0.3, 'GREEN'), (0.7, 'YEL')):
        c, r = L.cr(a, 0.45); L.s.cyl(c, r, 4, 30, 0.15, m, 3); L.s.cyl(c, r, 30, 33, 0.165, 'DARK', 3); L.s.cyl(c, r, 26, 28, 0.152, m, 2)
    c, r = L.cr(0.5, 0.5); L.s.ellipse_shadow(c, r, 16, 5, dx=4)

@asset('meja_taman', G, 2, 2, 50, note='area duduk: meja bundar beton + 4 bangku bulat beton di atas paving bulat')
def meja(L):
    L.top(0, 0, 2, 2, 0, lambda a, b: path_tex(a, b), ground=True, shift=0)
    c, r = L.cr(1, 1)
    L.s.cyl(c, r, 0, 24, 0.09, 'CONC', 3); L.s.cyl(c, r, 24, 28, 0.42, 'CONC', 3); L.s.cyl(c, r, 27, 28, 0.38, 'CONC', 4)
    for dc, dr in ((0.68, 0), (-0.68, 0), (0, 0.68), (0, -0.68)): L.s.cyl(c + dc, r + dr, 0, 15, 0.14, 'CONC', 3)
    L.s.ellipse_shadow(c, r, 34, 12, dx=8)

@asset('pergola', G, 3, 3, 130, note='pergola kayu terbuka 3x3 (tanpa tanaman rambat): 4 tiang, balok + kasau, 2 bangku taman di dalam, lantai paving')
def pergola(L):
    L.top(0, 0, 3, 3, 0, lambda a, b: path_tex(a, b, edge_b=True, W=3, D=3), ground=True, shift=0)
    # benches inside (along a, at the back and front), facing each other
    for b0, back_b in ((2.15, 2.6), (0.45, 0.4)):
        L.box(0.5, b0, 2.5, b0 + 0.4, 16, 19, 'WOOD', 3, topf=wood_slats('b', 10))
        for a in (0.6, 2.3): L.box(a, b0 + 0.05, a + 0.08, b0 + 0.35, 0, 16, 'DARK', 3)
    L.box(0.5, 2.55, 2.5, 2.6, 22, 38, 'WOOD', 3)
    for a in (0.1, 2.75):
        for b in (0.1, 2.75): L.box(a, b, a + 0.15, b + 0.15, 0, 98, 'WOOD', 2)
    for b in (0.1, 2.75): L.box(0, b, 3, b + 0.15, 98, 104, 'WOOD', 3)               # main beams along a
    for a in np.arange(0.05, 3.0, 0.35): L.box(a, 0, a + 0.1, 3, 104, 108, 'WOOD', 3)  # rafters along b
    c, r = L.cr(1.5, 1.5); L.s.ellipse_shadow(c, r, 70, 20, dx=14)

@asset('gazebo', G, 3, 3, 170, note='gazebo taman 3x3: lantai kayu panggung di atas umpak beton, 4 tiang, bangku keliling, atap genteng pelana')
def gazebo(L):
    L.top(0, 0, 3, 3, 0, lambda a, b: path_tex(a, b, edge_b=True, W=3, D=3), ground=True, shift=0)
    L.box(0.2, 0.2, 2.8, 2.8, 0, 6, 'CONC', 3)
    L.box(0.25, 0.25, 2.75, 2.75, 6, 12, 'WOOD', 3, topf=wood_slats('a', 6))
    L.box(1.1, 0.0, 1.9, 0.25, 0, 6, 'CONC', 3, topf=lambda a, b: (np.full(a.shape, MI['CONC'], np.int16), np.full(a.shape, 4, np.int8)))   # step
    for a in (0.3, 2.55):
        for b in (0.3, 2.55): L.box(a, b, a + 0.15, b + 0.15, 12, 92, 'WOOD', 2)
    for (a0, b0, a1, b1) in ((0.4, 2.3, 2.6, 2.6), (0.4, 0.4, 0.7, 2.3), (2.3, 0.4, 2.6, 2.3)):           # bench around 3 sides
        L.box(a0, b0, a1, b1, 12, 26, 'WOOD', 3, topf=wood_slats('a', 8))
    L.box(0.3, 2.55, 2.7, 2.7, 26, 46, 'WOOD', 2)                                                         # back rail
    L.box(0.3, 0.3, 2.7, 2.7, 88, 94, 'WOOD', 2)                                                         # ring beam
    L.side(0.0, 3.0, 2.95, 94, 136, gable_end(96, 42, 0, 42, 'WOOD', 2))                                  # gable end (visible side)
    L.gable(-0.1, -0.05, 3.1, 3.05, 92, 136, 'TERRA', fnab=lambda a, b, z: (np.full(a.shape, MI['TERRA'], np.int16), np.where((a * 6) % 1 < 0.14, 2, np.where((b * 5) % 1 < 0.1, 2, 3)).astype(np.int8)))
    c, r = L.cr(1.5, 1.5); L.s.ellipse_shadow(c, r, 80, 24, dx=16)

# ---------------------------------------------------------------- ground modules
@asset('jalur_paving_lurus', G, 2, 2, 10, note='jalur paving taman 2x2 lurus (blok 0.5 sel, pola terang tiap ke-3), kanstin beton di kedua tepi. _sw memanjang arah c, _se memanjang arah r')
def jl(L): L.top(0, 0, 2, 2, 0, lambda a, b: path_tex(a, b, edge_b=True), ground=True, shift=0)
@asset('jalur_paving_simpang', G, 2, 2, 10, note='simpang jalur paving 2x2 (perempatan): kanstin hanya di 4 sudut')
def js(L): L.top(0, 0, 2, 2, 0, lambda a, b: path_tex(a, b, edge_a='corners'), ground=True, shift=0)
@asset('plaza_paving', G, 4, 4, 10, note='plaza paving 4x4: blok paving dengan cincin terang + kanstin beton (alas gazebo/pergola/area duduk)')
def plaza(L):
    def f(a, b):
        m, t = path_tex(a, b); rr = np.hypot(a - 2, b - 2)
        ring = (rr > 1.15) & (rr < 1.35); t = np.where(ring, 4, t).astype(np.int8)
        k = (a < 0.1) | (a > 3.9) | (b < 0.1) | (b > 3.9); m = np.where(k, MI['CONC'], m).astype(np.int16); t = np.where(k, 3, t).astype(np.int8)
        return m, t
    L.top(0, 0, 4, 4, 0, f, ground=True, shift=0)
