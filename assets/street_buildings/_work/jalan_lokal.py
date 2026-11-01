"""Jalan lokal (jalan tambahan) di depan deretan seberang: modul tanah datar (aspal, trotoar, kerb, marka) gaya v6b, palet engine.
Penampang (d = jarak dari garis muka gedung, sel): trotoar 0..0.85 | kerb 0.85..1.0 | aspal 1.0..3.3 (marka tengah putih putus2 di 2.11..2.19)
| kerb 3.3..3.45 | trotoar luar 3.45..3.95 | bibir tepi 3.95..4.0.  Modul 4 sel dalam arah melintang.
Orientasi (engine): _sw = jalan memanjang sepanjang +c, gedung di sisi r kecil (deretan seberang, muka ke kamera);
_se = memanjang sepanjang r, gedung di sisi c kecil; _ne/_nw = sama tapi sisi gedung dibalik."""
from lib import *
from gang import gangfloor, H_
D4 = 4
S0, K0, A0, A1, K1, T1 = 0.85, 1.0, 3.3, 3.45, 3.95, 4.0
MID0, MID1 = 2.11, 2.19

def section(x, d, dashed=True):
    """material/tone for a straight section; x along the road, d across (0 = building side)"""
    m, t = pave(x, d)
    m = m.copy(); t = t.copy()
    def S(mask, mat, tone):                          # in place, so extras applied after section() returns also take effect (fix v3)
        m[mask] = MI[mat]; t[mask] = tone
    kerb = ((d >= S0) & (d < K0)) | ((d >= A0) & (d < A1))
    S(kerb, 'SENG', 3); S(kerb & ((np.floor(x) % 2) == 0), 'DARK', 2)
    asp = (d >= K0) & (d < A0); h = H_(x, d)
    S(asp, 'ASPH', 2); S(asp & (h < 5), 'ASPH', 1); S(asp & (h > 93), 'ASPH', 3)
    S(((d >= K0) & (d < K0 + 0.06)) | ((d >= A0 - 0.06) & (d < A0)), 'ASPH', 0)      # gutter shade along both kerbs
    if dashed: S((d >= MID0) & (d < MID1) & ((x % 1.0) >= 0.25) & ((x % 1.0) < 0.75), 'LITE', 2)
    S((d >= K1) & (d < T1), 'CONC', 2)                                                 # outer edge lip
    return m, t, S

def straight(L, W, extra=None, dashed=True):
    def f(a, b):
        x, d = a, L.D - b
        m, t, S = section(x, d, dashed)
        if extra: extra(x, d, S)
        return m, t
    L.top(0, 0, W, L.D, 0, f, ground=True, shift=0)

@asset('jalan_lokal_lurus', 'lokal', 2, 4, 10, oris=('sw', 'se', 'ne', 'nw'),
       note='jalan lokal lurus 2x4: trotoar 0.85 + kerb hitam-putih + aspal 2.3 sel (marka tengah putih putus-putus) + kerb + trotoar luar. d=0 = sisi muka gedung')
def lurus(L): straight(L, 2)

@asset('jalan_lokal_parkir', 'lokal', 2, 4, 10, oris=('sw', 'se', 'ne', 'nw'),
       note='jalan lokal 2x4 dengan petak parkir motor (3 petak 0.66 sel, garis putih) di tepi aspal sisi gedung')
def parkir_(L):
    def ex(x, d, S):
        lane = (d >= K0) & (d < K0 + 0.95)
        S(lane & (((x + 0.02) % (2 / 3)) < 0.05), 'LITE', 2)                          # bay dividers
        S((d >= K0 + 0.92) & (d < K0 + 0.97), 'LITE', 2)                                 # bay end line
        # small painted 'P' (white) in the middle bay
        px = (x - 0.95) * 10; py = (d - 1.25) * 10
        P_ = ((px >= 0) & (px < 1) & (py >= 0) & (py < 5)) | ((py >= 0) & (py < 1) & (px >= 0) & (px < 3)) | ((py >= 2) & (py < 3) & (px >= 0) & (px < 3)) | ((px >= 2) & (px < 3) & (py >= 0) & (py < 3))
        S(P_, 'LITE', 3)
    straight(L, 2, ex)

@asset('jalan_lokal_zebra', 'lokal', 2, 4, 10, oris=('sw', 'se', 'ne', 'nw'),
       note='jalan lokal 2x4 dengan zebra cross (5 strip putih sejajar arah lalu lintas, berjajar melintang) + kerb diturunkan (strip kuning) di kedua sisi')
def zebra(L):
    def ex(x, d, S):
        # zebra (fix v3): white bars run PARALLEL to traffic (long along x), stacked across the road (d); people cross along d
        zb = (x >= 0.2) & (x < 1.8) & (d >= K0 + 0.12) & (d < A0 - 0.08) & (((d - K0 - 0.12) % 0.42) < 0.22)
        S(zb, 'LITE', 2)
        ramp = (x >= 0.1) & (x < 1.9); S(ramp & (((d >= S0) & (d < K0)) | ((d >= A0) & (d < A1))), 'YEL', 3)
        S(ramp & (((d >= S0 - 0.2) & (d < S0)) | ((d >= A1) & (d < A1 + 0.2))) & ((((x * 8) % 1) < 0.6)), 'YEL', 2)
    straight(L, 2, ex, dashed=False)

@asset('jalan_lokal_simpang_gang', 'lokal', 2, 4, 10, oris=('sw', 'se', 'ne', 'nw'),
       note='pertemuan lorong gang loak (lebar 2) dengan jalan lokal: lantai cor gang + selokan ditutup plat menembus trotoar, kerb diturunkan, zebra, garis henti')
def simpang(L):
    def f(a, b):
        x, d = a, L.D - b
        m, t, S = section(x, d, dashed=False)
        gz = d < S0
        gm, gt = gangfloor(x, d); m[gz] = gm[gz]; t[gz] = gt[gz]        # in place (fix v3: S() from section() writes into m, t)
        gut = gz & ((x < 0.25) | (x > 1.75)) & (d < 0.45)
        S(gut, 'WATER', 1); S(gz & ((x < 0.25) | (x > 1.75)) & (d >= 0.45), 'CONC', 2)    # gutter, then cover plates
        S(gz & ((x < 0.25) | (x > 1.75)) & (d >= 0.45) & ((((d - 0.45) * 10) % 1) < 0.25), 'CONC', 1)
        S((d >= S0) & (d < K0), 'YEL', 3)                                                # lowered kerb
        S((d >= K0 + 0.06) & (d < K0 + 0.12) & (x >= 0.05) & (x < 0.95), 'LITE', 3)    # stop line (exit lane)
        zb = (x >= 0.2) & (x < 1.8) & (d >= K0 + 0.3) & (d < A0 - 0.08) & (((d - K0 - 0.3) % 0.42) < 0.22)   # zebra fix v3 (bars along traffic)
        S(zb, 'LITE', 2); S((x >= 0.1) & (x < 1.9) & (d >= A0) & (d < A1), 'YEL', 3)
        return m, t
    L.top(0, 0, 2, 4, 0, f, ground=True, shift=0)

@asset('jalan_lokal_mulut', 'lokal', 4, 1, 10, oris=('sw', 'se', 'ne', 'nw'),
       note='mulut jalan samping 4x1 di trotoar jalan raya: aspal menembus trotoar (kerb diturunkan, strip kuning), trotoar kiri-kanan. _sw = jalan samping yang memanjang arah r (sisi gedung di c kecil), _ne = sisi gedung di c besar; _se/_nw = jalan samping memanjang arah c')
def mulut(L):
    def f(a, b):
        x, y = a, L.D - b                       # x across the side street (0 = building side), y along it (0 = main-road kerb)
        m, t = pave(x, y); m = m.copy(); t = t.copy()
        def S(mask, mat, tone):
            nonlocal m, t
            m = np.where(mask, MI[mat], m).astype(np.int16); t = np.where(mask, tone, t).astype(np.int8)
        asp = (x >= K0) & (x < A0); h = H_(x, y)
        S(asp, 'ASPH', 2); S(asp & (h < 5), 'ASPH', 1); S(asp & (h > 93), 'ASPH', 3)
        S(((x >= S0) & (x < K0)) | ((x >= A0) & (x < A1)), 'YEL', 3)
        S(asp & (y < 0.12), 'YEL', 3)
        S((x >= K1) & (x < T1), 'CONC', 2)
        return m, t
    L.top(0, 0, 4, 1, 0, f, ground=True, shift=0)

def corner(L, cx, cy):
    """quarter-annulus bend centred on footprint corner (cx, cy) in (x = c-c0, y = r-r0) cell coords"""
    def f(a, b):
        x, y = a, L.D - b
        rho = np.hypot(x - cx, y - cy); ang = np.arctan2(np.abs(y - cy), np.abs(x - cx))
        m, t, S = section(ang * 2.3, rho, dashed=False)
        S((rho >= MID0) & (rho < MID1) & (((ang * 2.3) % 1.0) >= 0.25) & (((ang * 2.3) % 1.0) < 0.75), 'LITE', 2)
        S(rho >= T1, 'PAVE', 3); S((rho >= T1) & (((x * 4) % 1 < 0.06) | ((y * 4) % 1 < 0.06)), 'PAVE', 1)
        return m, t
    L.top(0, 0, 4, 4, 0, f, ground=True, shift=0)

for nm, cx, cy, txt in [('kanan_ke_raya', 0, 0, 'datang dari -c, belok ke -r (ke jalan raya); ujung kanan deretan'),
                        ('kiri_ke_raya', 4, 0, 'datang dari +c, belok ke -r (ke jalan raya); ujung kiri deretan'),
                        ('kanan_ke_belakang', 0, 4, 'datang dari -c, belok ke +r (menjauh dari jalan raya)'),
                        ('kiri_ke_belakang', 4, 4, 'datang dari +c, belok ke +r')]:
    def _mk(cx=cx, cy=cy):
        def fn(L): corner(L, cx, cy)
        return fn
    asset(f'jalan_lokal_tikungan_{nm}', 'lokal', 4, 4, 10, oris=('sw',), note=f'tikungan 4x4 (seperempat lingkaran): {txt}. Koordinat game langsung (x=c-c0, y=r-r0), hanya _sw')(_mk())
