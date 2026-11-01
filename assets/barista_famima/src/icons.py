"""Ikon 32x32 (v6b: cahaya dari kiri, 4-5 tone, tepi = tone gelap material sama, tanpa outline hitam, alpha 0/255):
menu x {hot, es} x {R, L} (hot: gelas kertas FamiCafe tanpa tutup, latte art di permukaan; es: gelas plastik bening, lapisan, es batu,
tutup datar + sedotan), bahan (13), modifier (ukuran R/L, gula normal/less/no, shot 1/2)."""
import os, math
import numpy as np
from PIL import Image, ImageDraw
from common import *
S = 32
def cv(): return np.zeros((S, S, 4), np.uint8)
def ell(cx, cy, rx, ry):
    yy, xx = np.mgrid[0:S, 0:S]; return ((xx + .5 - cx) / rx) ** 2 + ((yy + .5 - cy) / ry) ** 2 <= 1
def poly(pts):
    im = Image.new('L', (S, S), 0); ImageDraw.Draw(im).polygon(pts, fill=255); return np.array(im) > 0
def rect(x0, y0, x1, y1):
    m = np.zeros((S, S), bool); m[y0:y1, x0:x1] = True; return m
def put(a, mask, c):
    a[mask, :3] = c; a[mask, 3] = 255
def px(a, x, y, c):
    if 0 <= x < S and 0 <= y < S: a[y, x, :3] = c; a[y, x, 3] = 255
def body(a, mask, rp, base=3, edge=True, vert=0.0):
    """left-lit cel shading across each row (+ optional vertical term); right / bottom silhouette px = darkest-but-one tone"""
    ys, xs = np.nonzero(mask); pad = np.pad(mask, 1)
    for y, x in zip(ys, xs):
        row = np.nonzero(mask[y])[0]; u = (x - row.min()) / max(1, row.max() - row.min())
        col = np.nonzero(mask[:, x])[0]; v = (y - col.min()) / max(1, col.max() - col.min())
        t = base + 1 if u < .2 else base if u < .55 else base - 1 if u < .85 else base - 2
        t -= int(vert * v)
        if edge and (not pad[y + 1, x + 2] or not pad[y + 2, x + 1]): t = min(t, base - 2)
        a[y, x, :3] = rp[max(0, min(4, t))]; a[y, x, 3] = 255
def shadow_line(a, x0, x1, y):                     # no alpha-56 in icons: a 1 px contact line in the material's dark tone handled by body edge
    pass
# ---------------------------------------------------------------- latte art (drawn on the liquid ellipse)
def art(a, kind, cx, cy, rx, ry, base, mid):
    L = R['lite']; inside = ell(cx, cy, rx, ry)
    def p(x, y, c=L[4]):
        if 0 <= int(x) < S and 0 <= int(y) < S and inside[int(y), int(x)]: px(a, int(x), int(y), c)
    if kind == 'crema':                            # americano: crema ring lighter, darker centre
        put(a, inside & ~ell(cx, cy, rx - 1.5, ry - 1.2), R['card'][2]); put(a, ell(cx - 1, cy - .5, 2.2, 1.2), R['card'][3]); return
    if kind == 'drizzle':                          # caramel macchiato (hot): white foam + caramel cross-hatch
        put(a, ell(cx, cy, rx - .8, ry - .6), L[3])
        for k in range(-3, 4, 2):
            for t in np.linspace(-1, 1, 14):
                p(cx + k + t * 2.5, cy + t * (ry - 1), R['gold'][2]); p(cx + k + t * 2.5 - 1, cy - t * (ry - 1), R['card'][3])
        return
    if kind == 'heart_foam':                       # cappuccino: thick white foam disc with a brown rim + cocoa dots + small heart line
        put(a, ell(cx, cy, rx - 1.2, ry - 1.0), L[3]); put(a, ell(cx - .8, cy - .6, rx - 3, ry - 2.4), L[4])
        for (dx, dy) in ((-3, 0), (2, -1), (4, 1), (-1, 2), (1, 1)): p(cx + dx, cy + dy, R['coffee'][2])
        return
    BM = {'heart': ['.XX.XX.', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
          'tulip': ['..XXX..', '.......', '.XXXXX.', '.......', 'XXXXXXX', '...X...'],
          'rosetta': ['...X...', '.XX.XX.', '...X...', 'XXX.XXX', '...X...', '.XX.XX.']}
    bm = BM[kind]; h_ = len(bm); w_ = len(bm[0]); x0 = int(round(cx - w_ / 2)); y0 = int(round(cy - h_ / 2 + .3))
    for j, row in enumerate(bm):
        for i, ch in enumerate(row):
            if ch == 'X': p(x0 + i, y0 + j, L[4] if i < w_ // 2 + 1 else L[3])
    return
def surface(a, m, cx, cy, rx, ry):
    """liquid surface of a hot drink"""
    base = {'coffee': R['coffee'][1], 'milkc': R['card'][3], 'lite': R['lite'][3], 'choco': R['choco'][3], 'matcha': R['matcha'][3]}[m['base']]
    if m['id'] == 'americano': base = R['coffee'][1]
    mid = {'milkc': R['card'][2], 'choco': R['choco'][2], 'matcha': R['matcha'][2]}.get(m['base'], R['coffee'][2])
    put(a, ell(cx, cy, rx, ry), base)
    put(a, ell(cx, cy, rx, ry) & ~ell(cx + .6, cy + .5, rx, ry), mid)            # inner wall shadow (upper-left lip)
    art(a, m['art'] or m['top'] if m['top'] != 'art' else m['art'], cx, cy, rx, ry, base, mid)
# ---------------------------------------------------------------- hot cup (paper cup FamiCafe: white, green band, blue pin-stripe, menu sticker)
def hot(m, size):
    a = cv(); L_ = size == 'L'
    cx = 16; rt = 10.5 if L_ else 9.5; rb = 7 if L_ else 6.5; ry = 5.2 if L_ else 4.8; yt = 9 if L_ else 11; yb = 29 if L_ else 27
    bd = poly([(cx - rt, yt), (cx + rt, yt), (cx + rb, yb), (cx - rb, yb)]) | ell(cx, yb, rb, 2.0)
    body(a, bd, R['white'], base=3)
    # band
    by0, by1 = yt + (8 if L_ else 7), yt + (13 if L_ else 11)
    band = bd & rect(0, by0, S, by1); body(a, band, R['fmg'], base=3)
    stripe = bd & rect(0, by1, S, by1 + 1); body(a, stripe, R['blue'], base=3, edge=False)
    # menu sticker: small white tag + label colour
    sx = cx - 4; put(a, rect(sx, by0 + 1, sx + 4, by1 - 1), R['white'][4]); put(a, rect(sx + 1, by0 + 2, sx + 3, by1 - 2), R[m['label']][2])
    # rim + surface
    put(a, ell(cx, yt, rt, ry), R['white'][4]); put(a, ell(cx, yt, rt, ry) & ~ell(cx - .5, yt - .4, rt, ry), R['white'][2])
    surface(a, m, cx, yt + .2, rt - 1.3, ry - 1.1)
    return a
# ---------------------------------------------------------------- iced (clear plastic cup, layers, ice, flat lid, straw)
LAYERS = {   # bottom -> top (fraction, ramp, tone)
 'americano':          [(1.0, 'coffee', 1)],
 'kopi_susu_keluarga': [(.18, 'card', 1), (.82, 'milkc', 2)],
 'cafe_latte':         [(.55, 'lite', 3), (.2, 'milkc', 3), (.25, 'coffee', 2)],
 'cappuccino':         [(.6, 'milkc', 2), (.4, 'lite', 4)],
 'caramel_macchiato':  [(.6, 'lite', 3), (.25, 'coffee', 2), (.15, 'gold', 3)],
 'dolce_latte':        [(.25, 'lite', 4), (.75, 'milkc', 2)],
 'vanilla_latte':      [(1.0, 'milkc', 3)],
 'hazelnut_latte':     [(.3, 'choco', 4), (.7, 'milkc', 2)],
 'premium_chocolate':  [(1.0, 'choco', 3)],
 'matcha_latte':       [(.55, 'lite', 3), (.45, 'matcha', 3)],
}
def es(m, size):
    a = cv(); L_ = size == 'L'
    cx = 16; rt = 10 if L_ else 9; rb = 7 if L_ else 6.5; yt = 6 if L_ else 9; yb = 30 if L_ else 29
    bd = poly([(cx - rt, yt), (cx + rt, yt), (cx + rb, yb), (cx - rb, yb)]) | ell(cx, yb, rb, 1.6)
    liq_top = yt + 3
    ys = np.arange(S); h = yb - liq_top; y = yb + 1
    for frac, rk, t in LAYERS[m['id']]:
        n = max(1, int(round(frac * h))); ly0 = max(liq_top, y - n)
        body(a, bd & rect(0, ly0, S, y), R[rk], base=min(4, t + 1), edge=False); y = ly0
    put(a, bd & rect(0, yt, S, liq_top), R['glass'][4])
    # ice cubes (top of the drink)
    for (dx, dy) in ((-4, 1), (2, 0), (-1, 4), (4, 4)):
        x0, y0 = cx + dx - 2, liq_top + dy - 1
        put(a, rect(x0, y0, x0 + 4, y0 + 3) & bd, R['ice'][3]); px(a, x0, y0, R['ice'][4]); put(a, rect(x0 + 3, y0 + 1, x0 + 4, y0 + 3) & bd, R['ice'][1])
    # clear wall: left highlight column, right edge, cup bottom
    for yy in range(yt, yb + 1):
        row = np.nonzero(bd[yy])[0]
        if len(row): px(a, row.min() + 1, yy, R['glass'][4]); px(a, row.max(), yy, R['glass'][2]); px(a, row.min(), yy, R['glass'][3])
    for x in np.nonzero(bd[min(S - 1, yb + 1)])[0]: px(a, x, yb + 1, R['glass'][2])
    # flat lid + menu sticker on the cup
    lid = ell(cx, yt, rt + .6, 2.6); put(a, lid, R['ice'][4]); put(a, lid & ~ell(cx - .6, yt - .5, rt + .6, 2.6), R['glass'][3])
    put(a, ell(cx, yt, rt - 2, 1.2), R['glass'][4])
    sy = yb - 9 if L_ else yb - 8; put(a, rect(cx - 2, sy, cx + 3, sy + 4), R['white'][4]); put(a, rect(cx - 1, sy + 1, cx + 2, sy + 3), R[m['label']][2])
    put(a, rect(cx + 3, sy, cx + 4, sy + 4), R['fmg'][2])
    # straw (FamilyMart green), from the lid centre up-right
    for k in range(0, 9 if L_ else 8):
        x = cx + 2 + k // 2; yy = yt - k
        px(a, x, yy, R['fmg'][3]); px(a, x + 1, yy, R['fmg'][1])
    return a
# ---------------------------------------------------------------- bahan + modifier
def bahan(bid):
    a = cv()
    if bid == 'biji_kopi':
        for (x, y) in ((10, 20), (17, 22), (22, 17), (14, 14), (20, 11), (9, 12)):
            b = ell(x, y, 4.2, 3.0); body(a, b, R['coffee'], base=2)
            for k in range(-2, 3): px(a, x + k, y + (1 if abs(k) == 2 else 0) - 0, R['coffee'][0])
    elif bid == 'espresso':
        g = poly([(9, 10), (23, 10), (21, 27), (11, 27)]); body(a, g, R['glass'], base=4)
        put(a, poly([(10, 15), (22, 15), (21, 26), (11, 26)]), R['coffee'][1]); body(a, poly([(10, 15), (22, 15), (21, 26), (11, 26)]) & ~rect(0, 0, S, 17), R['coffee'], base=1, edge=False)
        put(a, rect(10, 15, 22, 17), R['card'][3]); put(a, ell(16, 10, 7, 2), R['glass'][4])
    elif bid == 'susu':
        bx = poly([(8, 9), (22, 9), (22, 29), (8, 29)]); body(a, bx, R['white'], base=3)
        side = poly([(22, 9), (26, 7), (26, 27), (22, 29)]); body(a, side, R['white'], base=2)
        put(a, poly([(8, 9), (15, 3), (22, 9)]), R['white'][4]); put(a, poly([(15, 3), (19, 1), (26, 7), (22, 9)]), R['white'][2])
        body(a, rect(8, 16, 22, 22), R['blue'], base=3); put(a, rect(22, 16, 26, 21), R['blue'][1])
        put(a, rect(11, 18, 19, 20), R['white'][4])
    elif bid == 'gula':
        for (x, y) in ((8, 18), (16, 18), (12, 11), (20, 11)):
            c = rect(x, y, x + 8, y + 8); body(a, c, R['white'], base=4)
            put(a, rect(x, y, x + 8, y + 2), R['white'][4]); px(a, x + 2, y + 4, R['white'][2]); px(a, x + 5, y + 6, R['white'][2])
    elif bid == 'gula_aren':
        for (x, y, r_) in ((11, 19, 6), (21, 20, 5), (16, 12, 5.5)):
            body(a, ell(x, y, r_, r_ * .8), R['card'], base=2); put(a, ell(x - 1, y - 2, r_ - 2, 1.4), R['card'][3])
    elif bid == 'es_batu':
        for (x, y) in ((6, 16), (16, 18), (11, 7)):
            put(a, rect(x, y, x + 10, y + 10), R['ice'][3]); put(a, rect(x, y, x + 10, y + 2), R['ice'][4]); put(a, rect(x + 8, y + 2, x + 10, y + 10), R['ice'][1])
            put(a, rect(x + 2, y + 3, x + 4, y + 6), R['ice'][4]); put(a, rect(x, y + 9, x + 10, y + 10), R['ice'][0])
    elif bid in ('cokelat', 'matcha'):
        rk = 'choco' if bid == 'cokelat' else 'matcha'
        j = poly([(8, 12), (24, 12), (23, 29), (9, 29)]); body(a, j, R['white'] if bid == 'cokelat' else R['dark'], base=3)
        body(a, rect(9, 17, 24, 24) & j, R[rk], base=3)
        put(a, ell(16, 12, 8, 2.6), R[rk][3]); put(a, ell(16, 12, 6, 1.6), R[rk][4]); put(a, ell(16, 8, 3, 2.5), R[rk][2])
        put(a, ell(15, 7, 1.5, 1.0), R[rk][4])
    elif bid == 'air':
        k = ell(15, 19, 9, 8) | rect(7, 19, 24, 28); body(a, k, R['steel'], base=3)
        put(a, poly([(23, 18), (30, 11), (31, 13), (24, 22)]), R['steel'][2]); put(a, ell(15, 11, 6, 2), R['steel'][4]); put(a, rect(13, 8, 18, 10), R['dark'][3])
        for (x, y) in ((28, 7), (29, 4), (27, 2)): px(a, x, y, R['white'][4]); px(a, x, y + 1, R['white'][3])
        put(a, rect(7, 28, 24, 29), R['steel'][0])
    elif bid.startswith(('sirup', 'saus')):
        col = {'sirup_vanila': 'lite', 'sirup_hazelnut': 'choco', 'saus_karamel': 'gold', 'saus_dolce': 'milkc'}[bid]
        b = poly([(10, 12), (22, 12), (22, 29), (10, 29)]) | ell(16, 12, 6, 2.5); body(a, b, R['glass'], base=3)
        body(a, rect(11, 15, 22, 29) & b, R[col], base=3)
        body(a, rect(11, 18, 22, 24), R['white'], base=4); put(a, rect(13, 20, 20, 22), R[col][1])
        put(a, rect(15, 4, 18, 11), R['dark'][3]); put(a, rect(15, 4, 24, 6), R['dark'][4]); put(a, rect(14, 9, 19, 11), R['dark'][2])
    return a
def mod(kind):
    a = cv()
    if kind in ('ukuran_R', 'ukuran_L'):
        L_ = kind.endswith('L'); h = 22 if L_ else 15; w = 9 if L_ else 7
        bd = poly([(16 - w, 29 - h), (16 + w, 29 - h), (16 + w - 2, 29), (16 - w + 2, 29)]); body(a, bd, R['white'], base=3)
        body(a, bd & rect(0, 29 - h + h // 3, S, 29 - h + h // 3 + 4), R['fmg'], base=3); put(a, ell(16, 29 - h, w, 2), R['white'][4])
        # letter R / L (3x5 pixel font, blue)
        G = {'R': ['110', '101', '110', '101', '101'], 'L': ['100', '100', '100', '100', '111']}['L' if L_ else 'R']
        ox, oy = 14, 29 - h // 3 - 3
        for j, row in enumerate(G):
            for i, ch in enumerate(row):
                if ch == '1': put(a, rect(ox + i * 2 - 2, oy + j * 2 - 2, ox + i * 2, oy + j * 2), R['blue'][1])
    elif kind.startswith('gula_'):
        n = {'gula_normal': 3, 'gula_less': 1, 'gula_no': 0}[kind]
        for k in range(3):
            x, y = 4 + k * 9, 14; c = rect(x, y, x + 7, y + 7)
            if k < n: body(a, c, R['white'], base=4); put(a, rect(x, y, x + 7, y + 2), R['white'][4])
            else:
                for (i, j) in [(i, j) for i in range(7) for j in range(7) if i in (0, 6) or j in (0, 6)]:
                    if (i + j) % 2 == 0: px(a, x + i, y + j, R['steel'][2])
        if n == 0:
            for t in range(24): px(a, 4 + t, 26 - t // 2 - 4, R['red'][2]); px(a, 4 + t, 27 - t // 2 - 4, R['red'][1])
    elif kind in ('shot_1', 'shot_2'):
        for k in range(1 if kind == 'shot_1' else 2):
            x = (11 if kind == 'shot_1' else 5 + k * 12)
            g = poly([(x, 10), (x + 11, 10), (x + 10, 27), (x + 1, 27)]); body(a, g, R['glass'], base=4)
            put(a, poly([(x + 1, 15), (x + 10, 15), (x + 9, 26), (x + 2, 26)]), R['coffee'][1]); put(a, rect(x + 1, 15, x + 10, 17), R['card'][3])
    return a
def save(a, path): Image.fromarray(a, 'RGBA').save(path)
def build():
    d = OUT + '/icons'; os.makedirs(d, exist_ok=True); out = {}
    for m in MENU:
        for size in ('R', 'L'):
            for t, fn in (('hot', hot), ('es', es)):
                k = f"menu_{m['id']}_{t}_{size}"; save(fn(m, size), f'{d}/{k}.png'); out[k] = f'icons/{k}.png'
    for b, _ in BAHAN: k = f'bahan_{b}'; save(bahan(b), f'{d}/{k}.png'); out[k] = f'icons/{k}.png'
    for k in ('ukuran_R', 'ukuran_L', 'gula_normal', 'gula_less', 'gula_no', 'shot_1', 'shot_2'): save(mod(k), f'{d}/mod_{k}.png'); out['mod_' + k] = f'icons/mod_{k}.png'
    return out
if __name__ == '__main__':
    o = build(); print(len(o), 'icons')
    import glob; print(audit(glob.glob(OUT + '/icons/*.png')))
