"""Ember (plastik biru) + gayung (pink) untuk kamar mandi Cove kosongan. Engine street_buildings (points + shade_n), tanpa outline,
bayangan elips alpha 56. Ukuran: 1 px ~ 2 cm (avatar 86 px). Ember Ø ~30 cm, tinggi ~28 cm; gayung Ø ~14 cm + gagang ~16 cm.
Gagang gayung / pegangan ember diarahkan diagonal (a,b) sehingga 4 arah berbeda (ne/nw = flip b)."""
from make_kamar import *
from engine import shade_n
EB = 'BLUE'; GY = 'PINK'; WAT = 'GLASS'; HANDLE = 'CONC'
RB, RT, EH = .155, .19, 14                    # ember: radius bawah/atas (tile), tinggi px
def _cr(L, a, b): c, r = L.cr(a, b); return np.asarray(c, float), np.asarray(r, float)
def _dir(L, da, db):
    c0, r0 = L.cr(0.0, 0.0); c1, r1 = L.cr(da, db); v = np.array([c1 - c0, r1 - r0]); return v / np.linalg.norm(v)
def tapered(L, c, r, z0, h, rb, rt, m, base=3, ribs=(), inner=None, inner_floor=None):
    """wadah bulat meruncing (dinding luar + bibir + dinding dalam + dasar/isi)"""
    ph = np.linspace(0, 2 * np.pi, 220, endpoint=False); zz = np.arange(0, h, .5)
    P, Z = np.meshgrid(ph, zz); R = rb + (rt - rb) * Z / h
    cc = c + R * np.cos(P); rr = r + R * np.sin(P)
    slope = (rt - rb) / h * 32                                          # outward tilt
    n = np.stack([np.cos(P), np.sin(P), np.full(P.shape, -slope * .3)], -1).reshape(-1, 3)
    t = shade_n(n / np.linalg.norm(n, axis=1, keepdims=True), base)
    zr = Z.ravel()
    for zb in ribs: t = np.where(np.abs(zr - zb) < .6, np.clip(t - 1, 0, 4), t)
    L.s.points(cc.ravel(), rr.ravel(), (z0 + Z).ravel(), m, t)
    # bibir (rim) tebal 1 px, sedikit menonjol
    for dr_, tt in ((0.0, 4), (.012, 3)):
        L.s.points(c + (rt + dr_) * np.cos(ph), r + (rt + dr_) * np.sin(ph), np.full(ph.shape, z0 + h - .5 + (0 if dr_ == 0 else -1)), m, tt)
    # dinding dalam (hanya terlihat sisi belakang lewat bukaan)
    ri = rt - .02; zi = np.arange(1, h, .5); P2, Z2 = np.meshgrid(ph, zi); Ri = rb - .02 + (ri - rb + .02) * Z2 / h
    L.s.points((c + Ri * np.cos(P2)).ravel(), (r + Ri * np.sin(P2)).ravel(), (z0 + Z2).ravel() - .01, m, inner if inner is not None else 1)
    # dasar / isi air
    fz, fm, ft = inner_floor if inner_floor else (1, m, 1)
    rf = rb - .02 + (ri - rb + .02) * fz / h
    rad = np.linspace(0, rf, 14); P3, R3 = np.meshgrid(ph, rad)
    L.s.points((c + R3 * np.cos(P3)).ravel(), (r + R3 * np.sin(P3)).ravel(), np.full(P3.size, z0 + fz), fm, ft)
def water_fn(L, c, r, fz, rf):
    """air: tone 3, kilau tone 4 di sisi kiri (cahaya dari kiri)"""
    ph = np.linspace(0, 2 * np.pi, 220, endpoint=False); rad = np.linspace(0, rf, 14); P3, R3 = np.meshgrid(ph, rad)
    cc = c + R3 * np.cos(P3); rr = r + R3 * np.sin(P3)
    sx = (cc - c) - (rr - r); sy = (cc - c) + (rr - r)
    t = np.where((sx < -rf * .3) & (np.abs(sy) < rf * .35), 4, 3)
    L.s.points(cc.ravel(), rr.ravel(), np.full(cc.size, fz), WAT, t.ravel())
def ember_body(L, air=False):
    c, r = _cr(L, .25, .25); L.s.ellipse_shadow(float(c), float(r), 10, 4, dx=3)
    fl = (EH - 4, WAT, 3) if air else (1, EB, 1)
    tapered(L, float(c), float(r), 0, EH, RB, RT, EB, 3, ribs=(3, EH - 3), inner=1, inner_floor=fl)
    if air: water_fn(L, float(c), float(r), EH - 4, RB - .02 + (RT - .04 - RB + .02) * (EH - 4) / EH)
    # pegangan kawat: engsel di kiri/kanan (sumbu u), rebah ke belakang ~55 derajat
    u = _dir(L, 1, -.35); bk = np.array([-u[1], u[0]])
    if bk[0] + bk[1] > 0: bk = -bk                                      # 'belakang' = arah c+r mengecil (menjauh dari kamera)
    t = np.linspace(0, np.pi, 90); rad = RT + .01
    cc = c + rad * np.cos(t) * u[0] + rad * .55 * np.sin(t) * bk[0]
    rr = r + rad * np.cos(t) * u[1] + rad * .55 * np.sin(t) * bk[1]
    zz = EH - 1 + 6 * np.sin(t)
    L.s.points(cc, rr, zz, HANDLE, 3)
    for sgn in (-1, 1): L.s.points(np.array([c + sgn * rad * u[0]]), np.array([r + sgn * rad * u[1]]), np.array([EH - 2.0]), EB, 2)   # engsel
    return float(c), float(r)
def gayung(L, c, r, z0, hd, tilt=0.0):
    """gayung: mangkuk Ø ~0.09 tile, tinggi 7 px + gagang tabung arah hd (unit c/r), naik 'tilt' px per tile"""
    tapered(L, c, r, z0, 7, .075, .095, GY, 3, ribs=(), inner=1, inner_floor=(1, GY, 2))
    s = np.linspace(.09, .33, 70)
    for w in (-.008, 0, .008):
        pc = c + s * hd[0] + w * -hd[1]; pr = r + s * hd[1] + w * hd[0]; pz = z0 + 5 + (s - .09) * tilt
        L.s.points(pc, pr, pz, GY, 3 if w <= 0 else 2)
        L.s.points(pc, pr, pz + .9, GY, 4 if w <= 0 else 3)
    e = .33; L.s.points(np.array([c + e * hd[0]]), np.array([r + e * hd[1]]), np.array([z0 + 5 + (e - .09) * tilt - 1]), GY, 2)  # ujung
@asset('ember', 'cove_kosong_mandi', .5, .5, 40, oris=('sw', 'se', 'ne', 'nw'), note='ember plastik biru kosong, pegangan kawat rebah ke belakang')
def _ember(L): ember_body(L, False)
@asset('ember_air', 'cove_kosong_mandi', .5, .5, 40, oris=('sw', 'se', 'ne', 'nw'), note='ember plastik biru berisi air')
def _ember_air(L): ember_body(L, True)
@asset('ember_air_gayung', 'cove_kosong_mandi', .5, .5, 40, oris=('sw', 'se', 'ne', 'nw'),
       note='ember berisi air + gayung terapung di dalam, gagang bersandar di bibir ember')
def _ember_g(L):
    c, r = ember_body(L, True); hd = _dir(L, 1, .55)
    gayung(L, c - hd[0] * .06, r - hd[1] * .06, EH - 5, hd, tilt=14)
@asset('gayung', 'cove_kosong_mandi', .5, .5, 30, oris=('sw', 'se', 'ne', 'nw'), note='gayung plastik pink berdiri di lantai, gagang lurus')
def _gayung(L):
    hd = _dir(L, 1, -.6); c, r = _cr(L, .25, .25); c, r = float(c) - hd[0] * .1, float(r) - hd[1] * .1
    L.s.ellipse_shadow(c + hd[0] * .1, r + hd[1] * .1, 8, 3, dx=2)
    gayung(L, c, r, 0, hd, tilt=0)
