"""Tenda tunawisma: terpal biru (TARPB) model A di atas dinding kardus rendah, alas kardus, kardus samping.
Status: tutup (flap turun, dijepit) dan buka (flap diangkat jadi kanopi di 2 tongkat). Orientasi sw / se (pintu menghadap arah itu).
Buka = 2 layer (belakang: lantai + bagian dalam; depan: atap terlihat + gable berlubang + kanopi), karakter digambar di antaranya."""
import sys
sys.path.insert(0, 'assets/street_buildings/_work')
from lib import *
import engine
TW, TB0, D, W = 1.8, 0.55, 2.45, 2.45          # lebar tenda (a), depan tenda di b=TB0, kedalaman total, lebar total (+kardus samping)
ZE, ZR = 6, 40                                   # tinggi dinding kardus, bubungan (px)
K = (ZR - ZE) / (TW / 2)
def zf_ab(L, z0, ka, kb):
    """z = z0 + ka*a + kb*b  ->  slope coef (a, b_c, d_r) di koordinat c/r"""
    if L.o == 'sw': return (z0 + kb * D, ka, -kb)
    return (z0 + ka * W + kb * D, -kb, -ka)
def visible(zf): return 32 - zf[1] - zf[2] > 0
def tarp_fn(L, base):
    def f(c, r, z):
        a, b = L.ab(c, r)
        t = np.full(a.shape, base, np.int8)
        t = np.where((np.abs(((b - TB0) % 0.62) - 0.31) > 0.29), base - 1, t)                     # sambungan terpal
        t = np.where(((a * 7 + b * 3) % 1.0) < 0.07, base - 1, t)                                 # kerut
        m = np.full(a.shape, MI['TARPB'], np.int16)
        return m, t
    return f
def slopes(L, want_visible=True, base=None, inside=False):
    for (a0, a1, zf) in ((0, TW / 2, zf_ab(L, ZE, K, 0)), (TW / 2, TW, zf_ab(L, ZE + K * TW, -K, 0))):
        if visible(zf) != want_visible: continue
        c0, r0, c1, r1 = L.rect(a0, TB0, a1, D)
        if inside:
            fn = lambda c, r, z: (np.full(c.shape, MI['TARPB'], np.int16), np.where(((L.ab(c, r)[1] - TB0) % 0.62) < 0.04, 0, 1).astype(np.int8))
        else: fn = tarp_fn(L, base if base is not None else 2)
        L.s.slope(c0, r0, c1, r1, zf, fn, shift=0)
def gable_tex(open_):
    Wp = int(round(TW * 32)); tx = gable_end(Wp, ZR + 2, ZE, ZR, 'TARPB', 3)
    for v in range(ZR + 2):
        for u in range(Wp):
            if tx.m[v, u] >= 0 and (v < 1): tx.t[v, u] = 2
    tx.rect(0, 0, Wp, ZE, 'CARD', 3); tx.rect(0, ZE - 1, Wp, ZE, 'CARD', 2)
    cu = Wp // 2
    if open_:
        for v in range(0, 31):
            hw = int(round(13 - v * 0.30))
            tx.rect(cu - hw, v, cu + hw, v + 1, 'CLEAR', None)
        for v in range(0, 31):                                                  # tepi lubang = tone gelap (tanpa outline hitam)
            hw = int(round(13 - v * 0.30))
            for u in (cu - hw - 1, cu + hw):
                if 0 <= u < Wp and tx.m[v, u] >= 0: tx.t[v, u] = 1
    else:
        tx.rect(cu, ZE, cu + 1, 31, 'TARPB', 1)                                 # jahitan flap
        for v in range(ZE, 31, 5): tx.px(cu - 1, v, 'TARPB', 2); tx.px(cu + 1, v + 2, 'TARPB', 2)
        tx.rect(cu - 1, 17, cu + 2, 21, 'WOOD', 4); tx.px(cu, 16, 'WOOD', 2)    # jepitan jemuran kayu
        tx.rect(cu - 7, ZE, cu + 7, ZE + 2, 'TARPB', 1)                         # ujung flap menumpuk di tanah
    return tx
def body(L, state, layer):
    """layer: 'all' | 'back' | 'front'"""
    back = layer in ('all', 'back'); front = layer in ('all', 'front')
    if back:
        L.top(0.06, TB0 + 0.04, TW - 0.06, D - 0.04, 1, lambda a, b: (np.full(a.shape, MI['CARD'], np.int16),
              np.where((np.abs(b - 1.5) < 0.03) | (np.abs(a - 0.62) < 0.03), 0, 1).astype(np.int8)), shift=0)            # di dalam tenda = gelap
        if state == 'buka':
            slopes(L, False, inside=True)
            gb = gable_end(int(round(TW * 32)), ZR + 2, ZE, ZR, 'TARPB', 0); gb.rect(0, 0, gb.W, ZE, 'CARD', 1)
            L.front(0, TW, D, 0, ZR + 2, gb)
            L.box(0.35, 1.85, 1.0, 2.3, 1, 5, 'FBLUE', 1)                                            # bantal buntelan
    if front:
        L.box(0, TB0, 0.06, D, 0, ZE, 'CARD', 3); L.box(TW - 0.06, TB0, TW, D, 0, ZE, 'CARD', 3)       # dinding kardus kiri/kanan
        slopes(L, True, base=3 if L.o == 'se' else 2)
        L.front(0, TW, TB0, 0, ZR + 2, gable_tex(state == 'buka'))
        # tali pasak di sudut depan
        for (a, sgn) in ((0.0, -1), (TW, 1)):
            n = 14; aa = np.linspace(a, a + sgn * 0.28, n); bb = np.full(n, TB0 - 0.02); zz = np.linspace(ZE + 2, 0, n)
            L.pts(aa, bb, zz, 'DARK', 4)
        # kardus samping (barang)
        L.box(TW + 0.1, 1.35, W - 0.05, 2.0, 0, 15, 'CARD', 3, topf=lambda a, b: (np.full(a.shape, MI['CARD'], np.int16),
              np.where(np.abs(a - (TW + 0.1 + W - 0.05) / 2) < 0.03, 2, 4).astype(np.int8)))
        if state == 'buka':                                                    # flap diangkat jadi kanopi
            c0, r0, c1, r1 = L.rect(0.5, 0.02, 1.3, TB0)
            L.s.slope(c0, r0, c1, r1, zf_ab(L, 34 + 8 * 0.0, 0, -8 * 1.0 / 1.0) if False else zf_ab(L, 34, 0, -8 / TB0 * 1.0 * 1.0 if False else -7.3),
                      lambda c, r, z: (np.full(c.shape, MI['TARPB'], np.int16), np.where(np.abs(L.ab(c, r)[0] - 0.9) < 0.02, 2, 3).astype(np.int8)), shift=0)
            for a in (0.53, 1.27):
                L.pts(np.full(40, a), np.full(40, 0.05), np.linspace(0, 34, 40), 'WOOD', 2)
def shadow_(L):
    c0, r0, c1, r1 = L.rect(-0.05, TB0, TW + 0.05, D); L.s.shadow([(c0, r0), (c1, r0), (c1, r1), (c0, r1)], dx=16)
    c0, r0, c1, r1 = L.rect(TW + 0.1, 1.35, W - 0.05, 2.0); L.s.shadow([(c0, r0), (c1, r0), (c1, r1), (c0, r1)], dx=8)
def build_tent(state, ori):
    """-> dict layer->(img RGBA np), pivot, anchors (px dalam sprite crop)"""
    layers = ('all',) if state == 'tutup' else ('back', 'front')
    outs = {}; refs = None
    for ly in layers:
        sp = mk(W, D, 60); L = Loc(sp, ori, W, D)
        if ly in ('all', 'back'): shadow_(L)
        body(L, state, ly)
        o, g = sp.render(); outs[ly] = o
        refs = {k: (sp.X(*L.cr(a, b)), sp.Y(*L.cr(a, b))) for k, (a, b) in
                dict(pivot=(W / 2, D / 2), anchor_kiri_depan=(0, 0), pintu=(TW / 2, TB0), tidur=(TW / 2, 1.5), keluar=(TW / 2, TB0 - 0.75),
                     kantong=(TW + 0.25, 0.85), cangkir=(TW + 0.15, 0.55)).items()}
    a = np.maximum.reduce([o[..., 3] for o in outs.values()]); ys, xs = np.nonzero(a)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    if (x1 - x0) % 2: x1 += 1
    if (y1 - y0) % 2: y1 += 1
    outs = {k: v[y0:y1, x0:x1] for k, v in outs.items()}
    refs = {k: (int(x - x0), int(y - y0)) for k, (x, y) in refs.items()}
    return outs, refs
# ------------------------------------------------------------------ props
@asset('alas_kardus', 'prop', 0.8, 1.5, 10)
def _alas(L):
    L.s.shadow([L.cr(0.02, 0.02), L.cr(0.78, 0.02), L.cr(0.78, 1.48), L.cr(0.02, 1.48)], dx=2)
    L.box(0.02, 0.02, 0.78, 1.48, 0, 2, 'CARD', 3, topf=lambda a, b: (np.full(a.shape, MI['CARD'], np.int16),
          np.where((np.abs(b - 0.75) < 0.025) | (np.abs(a - 0.4) < 0.02), 2, np.where((np.abs(a - 0.2) < 0.08) & (np.abs(b - 1.2) < 0.06), 2, 3)).astype(np.int8)))
@asset('kantong_plastik', 'prop', 0.42, 0.42, 20)
def _kantong(L):
    c, r = L.cr(0.21, 0.21); L.s.ellipse_shadow(c, r, 7, 3, dx=2)
    L.s.dome(c, r, 0, 0.13, 10, 'RED', base=3)
    for (da, db, z) in ((-0.05, 0, 10), (-0.06, 0, 11), (-0.06, 0, 12), (0.05, 0, 10), (0.06, 0, 11), (0.06, 0, 12), (0.0, 0, 11)):
        L.pts(np.array([0.21 + da]), np.array([0.21 + db]), np.array([z]), 'RED', 2 if da > 0 else 3)
@asset('cangkir_kaleng', 'prop', 0.3, 0.3, 14)
def _cangkir(L):
    c, r = L.cr(0.15, 0.15); L.s.ellipse_shadow(c, r, 5, 2, dx=2)
    def tf(P, Z, mm, t):
        t = np.where((np.abs(Z - 1) < .6) | (np.abs(Z - 7.5) < .6), np.clip(t - 1, 0, 4), t)               # bibir/rusuk kaleng
        return mm, t
    L.s.cyl(c, r, 0, 9, 0.075, 'CONC', base=3, tf=tf)
    L.s.points(*np.meshgrid(np.linspace(-.05, .05, 9) + c, np.linspace(-.05, .05, 9) + r), np.full((9, 9), 8.6), 'DARK', 1)
    L.pts(np.array([0.13, 0.17]), np.array([0.15, 0.15]), np.array([8.8, 8.8]), 'GOLD', 4)          # receh
