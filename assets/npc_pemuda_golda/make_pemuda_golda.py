#!/usr/bin/env python3
"""Virtual Life - NPC 'Pemuda Golda' (sad young man on a black Indomaret chair with a Golda latte bottle - 'titik terendah pria'),
v6b style. PREVIEW ONLY, not integrated / not deployed. Body, head, face (generator 'sad' expression), cap (npc_v6b cap()),
glasses (generator) + filled dark lenses = sunglasses, seated row = the game's v6b generator (../npc_babeh_loak/babeh_base.render_b).
Added: slumped pose (torso sunk 1 px, head stays up and leans back = staring up), sigh cycle with breath puff, slow sip,
long-sleeve work arm (limb_long), Golda bottle, black plastic chair (separate prop + baked). sw / nw = mirrors."""
import os, sys, math
sys.path.insert(0, 'assets/npc_babeh_loak')
from make_babeh_loak import seg_shade, over, P
from babeh_base import *
OUT = os.path.dirname(os.path.abspath(__file__)); NM = 'pemuda_golda'
N = dict(body='m', skin='medium', hair='short', hc='black', top='tee_long', tc='#1C2330', pants='trousers', pc='#3A4458', shoes='sneakers', sc='night',
         cap=('#10141B', '#22355E', '#3E6FA8'), glasses=True, top_style='tee')
CHAIR = X('#5A6577', '#3A4458', '#2A3242', '#1C2330', '#15151F')        # street_buildings DARK ramp
GOLDA = X('#FFD166', '#E0A526', '#C99A2E', '#E8DEC6', '#C3AD8D', '#94704F', '#6B4F3A')   # cap gold / label cream / coffee
LENS = X('#10141B', '#2A3242', '#5A6577')
PUFF = X('#E7EBF2', '#B9C0CC')
VIEWS = ('se', 'sw', 'ne', 'nw')

def fill_lenses(g):
    """sunglasses: fill the enclosed holes of the generator glasses frame with dark lens tones + 1 px glint (top-left)"""
    m = g[..., 3] > 0
    if not m.any(): return g
    ys, xs = np.nonzero(m); y0, y1, x0, x1 = ys.min() - 1, ys.max() + 2, xs.min() - 1, xs.max() + 2
    sub = m[y0:y1, x0:x1]; seen = np.zeros_like(sub); st = [(0, 0)]
    while st:
        y, x = st.pop()
        if 0 <= y < sub.shape[0] and 0 <= x < sub.shape[1] and not sub[y, x] and not seen[y, x]:
            seen[y, x] = True; st += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    hole = ~sub & ~seen; o = g.copy()
    for y, x in zip(*np.nonzero(hole)):
        top = not hole[y - 1, x] if y > 0 else True; left = not hole[y, x - 1] if x > 0 else True
        put(o, x0 + x, y0 + y, LENS[2] if (top and left) else LENS[1] if top else LENS[0])
    return o

def limb_long(S, Eb, W, hp, pal):
    """long black sleeve arm (cloth ramp across the width) + cuff + skin fist"""
    C = shirt_ramp(pal); K = skin_ramp(pal); CT = (C[0], C[1], C[2], C[3], C[4])
    a = over(shade(disk(S[0], S[1] + .3, 2.5), CT), seg_shade(S, Eb, 1.9, CT), seg_shade(Eb, W, 1.75, CT))
    put(a, int(Eb[0]), int(Eb[1]), C[3])
    h = shade(disk(hp[0], hp[1], 1.7), (K[0], K[0], K[1], K[2], K[4]), bias=-.05)
    return over(a, h)

def bottle(a, x, y, tilt=0):
    """Golda latte bottle, 3 px wide x 8 tall; (x, y) = top of the cap; tilt 0 upright, 1 = 45 deg towards +x (mouth), -1 towards -x"""
    rows = [(GOLDA[1], GOLDA[2], GOLDA[2]), (GOLDA[0], GOLDA[1], GOLDA[2]), (GOLDA[3], GOLDA[3], GOLDA[4]), (GOLDA[5], GOLDA[5], GOLDA[6]),
            (GOLDA[3], GOLDA[5], GOLDA[6]), (GOLDA[5], GOLDA[6], GOLDA[6]), (GOLDA[3], GOLDA[3], GOLDA[4]), (GOLDA[4], GOLDA[4], GOLDA[6])]
    for j, row in enumerate(rows):
        for i, c in enumerate(row):
            if tilt == 0: put(a, x + i - 1, y + j, c)
            else:
                d = -1 if tilt > 0 else 1
                put(a, x + d * (j * 7 // 10) + i - 1, y + (j * 7 // 10) + i * 0, c)
                put(a, x + d * (j * 7 // 10) + i - 1, y + (j * 7 // 10) + 1, c) if j == len(rows) - 1 else None

def bottle_line(a, b, c):
    """tilted Golda bottle from base point b (in the fist) to cap point c (at the mouth), 2 px thick, shaded right"""
    n = max(abs(c[0] - b[0]), abs(c[1] - b[1])) * 2 + 1
    for i in range(n + 1):
        t = i / n; x = int(round(b[0] + (c[0] - b[0]) * t)); y = int(round(b[1] + (c[1] - b[1]) * t))
        if t > .82: c1, c2 = GOLDA[1], GOLDA[2]
        elif t > .62: c1, c2 = GOLDA[3], GOLDA[4]
        elif t > .3: c1, c2 = GOLDA[5], GOLDA[6]
        else: c1, c2 = GOLDA[3], GOLDA[4]
        put(a, x, y, c1); put(a, x + 1, y, c2)

def chair(view):
    """black plastic chair: seat diamond (top y 80) + 4 legs + backrest; returns (behind, front) layers for this view"""
    cx, top, hw, hh = (31 if view == 'se' else 33), 79, 8, 4
    def Pm(pts):
        im = Image.new('L', (FW, FH)); ImageDraw.Draw(im).polygon(pts, fill=255); return np.array(im) > 0
    seat = Pm([(cx - hw, top + hh), (cx, top), (cx + hw - 1, top + hh), (cx, top + 2 * hh)])
    lip = Pm([(cx - hw, top + hh), (cx, top + 2 * hh), (cx + hw - 1, top + hh), (cx + hw - 1, top + hh + 2), (cx, top + 2 * hh + 2), (cx - hw, top + hh + 2)]) & ~seat
    B = E()
    for (x0, yb) in ((cx - hw + 1, 98), (cx - 1, 100), (cx + hw - 3, 98)):
        for y in range(top + hh + 2, yb): put(B, x0, y, CHAIR[2]); put(B, x0 + 1, y, CHAIR[3])
    B[seat, :3] = CHAIR[1]; B[seat, 3] = 255; B[lip, :3] = CHAIR[3]; B[lip, 3] = 255
    for x in range(cx - hw + 1, cx + 2): 
        col = [y for y in range(FH) if seat[y, x]]
        if col: put(B, x, min(col), CHAIR[0])
    F = E(); back = Pm([(cx - hw, top + hh), (cx, top), (cx, top - 19), (cx - hw, top + hh - 19)]) if view == 'se' else \
                   Pm([(cx - hw, top + hh), (cx, top + 2 * hh), (cx, top + 2 * hh - 19), (cx - hw, top + hh - 19)])
    tgt = B if view == 'se' else F
    for y, x in zip(*np.nonzero(back)):
        col = [yy for yy in range(FH) if back[yy, x]]; t = y - min(col)
        c = CHAIR[2]
        if t <= 1: c = CHAIR[0]
        elif 5 <= t <= 6 and view == 'ne' and cx - hw + 2 <= x <= cx - 3: c = CHAIR[4]                      # hand-grip slot
        if x in (cx - hw, cx - 1): c = CHAIR[3]
        put(tgt, x, y, c)
    return B, F

def chair_prop(view):
    B, F = chair(view); im = Image.fromarray(shadow(33)); im.alpha_composite(Image.fromarray(B)); im.alpha_composite(Image.fromarray(F)); return im

EXPR = {'sit_sad': ['sad', 'sad', 'sad', 'sleepy'], 'drink': ['sad', 'sad', 'sleepy', 'sleepy', 'sad', 'sad']}
SN = (24, 57.5)
DRINK_SE = [None, P(SN, (20.5, 66), (25, 67), 'fist', (27, 66)), P(SN, (21, 64), (27, 59.5), 'fist', (29, 58)),
            P(SN, (21, 63.5), (27, 58.5), 'fist', (29, 57)), P(SN, (20.5, 66), (25, 67), 'fist', (27, 66)), None]
DRINK_NE = [None, P(SN, (19.5, 65), (19.5, 62), 'fist', (20, 61)), P(SN, (18.5, 61), (19.5, 55), 'fist', (20.5, 53)),
            P(SN, (18.5, 61), (19.5, 54.5), 'fist', (20.5, 52.5)), P(SN, (19.5, 65), (19.5, 62), 'fist', (20, 61)), None]

def build(view, kind, f=0):
    base = 'se' if view in ('se', 'sw') else 'ne'; mir = view in ('sw', 'nw')
    expr = EXPR[kind][f] if base == 'se' else 'neutral'
    L, pal, bob = render_b(N, 'sit', 0, base, expr)
    L['glasses'] = fill_lenses(L['glasses'])
    near = None; top = E()
    spec = (DRINK_SE if base == 'se' else DRINK_NE)[f] if kind == 'drink' else None
    if spec is not None:
        near = limb_long(spec[0], spec[1], spec[2], spec[4], pal)
        if base == 'ne': near = flipx(near)
        L['arm_near'][:] = 0
        if base == 'se': L['arm_near'][71:78, 22:31] = 0
    body = Image.new('RGBA', (FW, FH))
    for k in ['hair_back', 'body', 'arm_far', 'shoes', 'pants', 'shoes_over', 'rips', 'shirt', 'outer', 'acc', 'arm_near', 'body_front', 'held']:
        if k in L: body.alpha_composite(Image.fromarray(L[k]))
    head = Image.new('RGBA', (FW, FH))
    for k in ('face', 'hair_front', 'glasses', 'brows'): head.alpha_composite(Image.fromarray(L[k]))
    b = np.array(body); h = np.array(head)
    # ---- sad posture: torso + arms sink (slump, shoulders down), head stays up and leans back (tilted up, staring at nothing)
    sink = {'sit_sad': [1, 0, 0, 2], 'drink': [1, 1, 1, 1, 1, 1]}[kind][f]
    hb = b.copy(); hb[52:] = 0; tb = b.copy(); tb[:52] = 0
    if sink:
        tb2 = np.zeros_like(tb); tb2[52 + sink:78] = tb[52:78 - sink]; tb2[78:] = tb[78:]
        for k in range(sink): tb2[52 + k] = tb[52]
        tb = tb2
    lean = -1 if base == 'se' else 1
    up = 1 if (kind == 'drink' and f in (2, 3)) else 0
    hb = np.roll(np.roll(hb, lean, axis=1), -up, axis=0); h = np.roll(np.roll(h, lean, axis=1), -up, axis=0)
    o = Image.fromarray(tb); o.alpha_composite(Image.fromarray(hb)); o.alpha_composite(Image.fromarray(h))
    # bottle
    if kind == 'sit_sad' or (kind == 'drink' and spec is None):
        if base == 'se': bottle(top, 33, 67 + sink)                        # held in the lap between the hands
    elif kind == 'drink':
        if base == 'se':
            if f in (1, 4): bottle(top, 27, 59)
            else: bottle_line(top, (29, 57 - up), (34, 49 - up))           # tipped up to the mouth
        else:
            if f in (1, 4): bottle(top, 44, 54)
            else: bottle_line(top, (43, 56 - up), (39, 47 - up))           # bottle end shows beside the head from behind
    o.alpha_composite(Image.fromarray(top))
    if near is not None: o.alpha_composite(Image.fromarray(near))
    if kind == 'sit_sad' and f == 3 and base == 'se':                        # long sigh: breath puff from the mouth
        for (x, y, c) in ((38, 50, PUFF[1]), (39, 49, PUFF[0]), (40, 49, PUFF[0]), (41, 48, PUFF[1]), (40, 47, PUFF[1])): put(np.array(o), x, y, c)
        oa = np.array(o)
        for (x, y, c) in ((38, 50, PUFF[1]), (39, 49, PUFF[0]), (40, 49, PUFF[0]), (41, 48, PUFF[1]), (40, 47, PUFF[1])): put(oa, x, y, c)
        o = Image.fromarray(oa)
    if kind == 'sit_sad' and f == 3 and base == 'ne':
        oa = np.array(o)
        for (x, y, c) in ((44, 44, PUFF[1]), (45, 43, PUFF[0]), (46, 43, PUFF[0]), (46, 42, PUFF[1])): put(oa, x, y, c)
        o = Image.fromarray(oa)
    Bc, Fc = chair(base)
    im = Image.fromarray(shadow(33)); im.alpha_composite(Image.fromarray(Bc)); im.alpha_composite(o); im.alpha_composite(Image.fromarray(Fc))
    if mir: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im

ANIMS = [('sit_sad', 4, 700), ('drink', 6, 450)]
if __name__ == '__main__':
    for d in ('frames', 'poses'): os.makedirs(f'{OUT}/{d}', exist_ok=True)
    FR = {}
    for kind, n_, ms in ANIMS:
        for v in VIEWS:
            FR[v, kind] = [build(v, kind, i) for i in range(n_)]
            for i, im in enumerate(FR[v, kind]): im.save(f'{OUT}/frames/{NM}_{v}_{kind}_f{i}.png')
    props = {}
    for v in VIEWS:
        FR[v, 'sit_sad'][0].save(f'{OUT}/poses/{NM}_{v}_sit_sad.png'); FR[v, 'drink'][2].save(f'{OUT}/poses/{NM}_{v}_drink_key.png')
        p = chair_prop('se' if v in ('se', 'sw') else 'ne')
        if v in ('sw', 'nw'): p = p.transpose(Image.FLIP_LEFT_RIGHT)
        p.save(f'{OUT}/poses/prop_kursi_hitam_{v}.png'); props[v] = p
    sheet('PEMUDA GOLDA (sedih)  ·  4x  ·  64x112, pivot 32,100  ·  v6b generator body, ekspresi sad  ·  kursi hitam terpanggang + prop terpisah  ·  sw / nw = mirrors  ·  transparent',
          [(f'{k} {v}', [(f'f{i}', im) for i, im in enumerate(FR[v, k])]) for k, n_, ms in ANIMS for v in VIEWS] + [('kursi', [(v, props[v]) for v in VIEWS])], f'{OUT}/{NM}_sheet_4x.png')
    sheet('PEMUDA GOLDA  ·  se / ne  ·  4x  ·  dark bg', [(f'{k} {v}', [(f'f{i}', im) for i, im in enumerate(FR[v, k])]) for k, n_, ms in ANIMS for v in ('se', 'ne')], f'{OUT}/{NM}_4x_darkbg.png', bg=BG)
    for kind, n_, ms in ANIMS: gif([strip([FR[v, kind][i] for v in VIEWS]) for i in range(n_)], f'{OUT}/{NM}_{kind}_4views_4x.gif', ms)
    cols = set(); al = set()
    for fr in list(FR.values()) + [list(props.values())]:
        for im in fr:
            a = np.array(im); cols |= {H(p) for p in a.reshape(-1, 4) if p[3] == 255}; al |= set(np.unique(a[..., 3]).tolist())
    import json
    K = json.load(open('assets/npc_babeh_loak/_tools/known.json')); known = set().union(*[set(v) for v in K.values()])
    print(len(cols), 'colours; alpha', sorted(al), 'new:', sorted(c for c in cols if c not in known))
