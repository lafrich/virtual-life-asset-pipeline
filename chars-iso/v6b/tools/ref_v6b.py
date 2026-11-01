#!/usr/bin/env python3
"""v6b: reference-faithful build. The reference sprite is recovered on its native pixel grid (study/ref_native.png, 24x69 blocks,
1 block = 11.6 px in the jpg) and used 1 block = 1 sheet px. Ichsan se-idle IS the reference (palette-snapped). Other poses /
directions and Noor are derived from it with the same palette ramps, edge colours and block shapes. ONE pixel grid everywhere.
Frame 64x112, pivot (32,100), live row map, dirs se sw ne nw (sw/nw mirrored)."""
import os, json, sys
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FW, FH, COLS, ROWS = 64, 112, 6, 44
ROWMAP = {'walk': 0, 'idle': 4, 'talk': 8, 'sit': 12, 'sit_type': 16, 'sleep': 20, 'tired': 24, 'swim': 28, 'float': 32, 'lie': 36, 'perch': 40}
DIRS = ['se', 'sw', 'ne', 'nw']
ORDER = ['shadow', 'hair_back', 'body', 'shoes', 'pants', 'rips', 'shirt', 'shirt_graphic', 'outer', 'acc', 'body_front', 'held', 'face', 'hair_front', 'acc_head', 'brows']
EXPRS = ['neutral', 'smile', 'happy', 'sad', 'angry', 'surprised', 'sleepy', 'blink', 'talk_open', 'talk_closed', 'embarrassed']
BAKE = {'talk': ['talk_open', 'talk_closed'], 'tired': ['sleepy'], 'sleep': ['blink'], 'lie': ['blink'], 'swim': ['smile'], 'float': ['smile']}
CW, CH = 40, 72          # sprite canvas; ref block (x, y) -> canvas (x + OX, y)
OX = 4
FX, FY = 15, 31          # canvas -> frame offset (ref feet bottom row 69 -> frame y 100, ref x 13 -> frame x 32)

SYM = '0123456789abcdefghijklmnopqrstuvwxyz'
REFPAL = {SYM[i]: tuple(int(v) for v in c) for i, c in enumerate(np.load(os.path.join(ROOT, 'study/ref_palette.npy')))}
# named ramps measured on the reference (code letters = reference cluster ids)
# hair: 0 deep(lid/bottom) 1 edge 3 base 4 highlight | skin: i base h right-side shade e blush/shade a deep 7 edge 5 jaw edge
# shirt: k base j mid g fold d edge b deep | tie: f light 9 mid 8 shade 5/6 dark | pants: c light 9 mid 8 shade 6 edge | shoes: 0 base 2 highlight


def load_ref():
    L = np.load(os.path.join(ROOT, 'study/ref_labels.npy')); m = np.load(os.path.join(ROOT, 'study/ref_mask.npy'))
    S = np.load(os.path.join(ROOT, 'study/ref_sem.npy')); raw = np.load(os.path.join(ROOT, 'study/ref_blocks.npy'))
    code = np.full(L.shape, '.', '<U2'); code[m] = np.vectorize(lambda k: SYM[k])(L[m])
    return code, S, raw, m


def empty(): return np.full((CH, CW), '', '<U2')


def ref_layers():
    """split the reference (se idle) into material layers of palette codes; cup keeps its raw colours (codes 'G0'..)"""
    code, S, raw, m = load_ref(); H, W = code.shape
    Ls = {k: empty() for k in ORDER}; extra = {}
    def put(layer, y, x, c): Ls[layer][y, x + OX] = c
    gi = 0
    for y in range(H):
        for x in range(W):
            if not m[y, x]: continue
            s = S[y, x]; c = code[y, x]
            if 38 <= y <= 41 and 15 <= x <= 19 and not (raw[y, x, 0] - raw[y, x, 2] > 40 and raw[y, x, 0] > 140):
                k = 'G' + SYM[gi]; gi += 1; extra[k] = tuple(int(v) for v in raw[y, x]); put('held', y, x, k); continue
            if s == 'H': put('hair_front', y, x, c)
            elif s in 'EWMBN': put('face', y, x, c); put('body', y, x, 'i' if s != 'B' else 'i')
            elif s == 'S' or (s == '?' and y < 20):
                if y >= 32 and x <= 17: put('body_front', y, x, c)
                else: put('body', y, x, 'h' if (s == '?') else c)
            elif s == 'C' or (s == '?' and 19 < y < 40): put('shirt', y, x, c if s == 'C' else 'd')
            elif s == 'T': put('acc', y, x, c)
            elif s == 'P' or (s == 'G'): put('pants', y, x, c if s == 'P' else '6')
            elif s == 'O' or s == '?': put('shoes', y, x, c if s == 'O' else '0')
    # fringe-gap skin under hair rows (x15 rows 8-10) stays in body; skin under the far-eye shade
    return Ls, extra


# ------------------------------------------------------------------ face language (se coords = ref block coords)
def face_codes(expr, C):
    """returns list of (x, y, code) for the face layer and brows layer, in ref block coords, se view"""
    F = []; B = []
    lid, eye, wht, mo, bl, nose = '0', '1', 'j', '7', 'e', 'e'
    tong = 'a'
    def near_open(): F.extend([(x, 13, lid) for x in range(10, 15)] + [(x, y, eye) for x in (11, 12, 13) for y in (14, 15)] + [(10, 15, wht), (14, 15, wht)])
    def far_open(): F.extend([(x, 13, lid) for x in (19, 20, 21)] + [(x, y, eye) for x in (19, 20) for y in (14, 15)] + [(21, 14, 'e')])
    lash = C.get('lash')
    e = expr
    if e in ('neutral', 'talk_open', 'talk_closed'):
        near_open(); far_open()
    elif e == 'smile':
        F.extend([(x, 13, lid) for x in range(10, 15)] + [(x, 14, eye) for x in (11, 12, 13)] + [(x, 15, 'a') for x in (11, 12, 13)])
        F.extend([(x, 13, lid) for x in (19, 20, 21)] + [(x, 14, eye) for x in (19, 20)] + [(19, 15, 'a'), (20, 15, 'a')])
    elif e == 'happy':
        F.extend([(x, 13, lid) for x in (11, 12, 13)] + [(10, 14, lid), (14, 14, lid)] + [(19, 13, lid), (20, 13, lid), (18, 14, lid), (21, 14, lid)])
    elif e == 'sad':
        F.extend([(x, 13, lid) for x in (11, 12, 13, 14)] + [(10, 14, lid)] + [(x, y, eye) for x in (11, 12, 13) for y in (14, 15)] + [(14, 15, wht), (14, 16, 'T1')])
        F.extend([(19, 13, lid), (20, 13, lid), (21, 14, lid)] + [(x, y, eye) for x in (19, 20) for y in (14, 15)])
        B.extend([(13, 12, 'B'), (14, 12, 'B'), (19, 12, 'B')])
    elif e == 'angry':
        F.extend([(x, 13, lid) for x in range(10, 15)] + [(x, 14, lid) for x in (13, 14)] + [(11, 14, eye), (12, 14, eye)] + [(x, 15, eye) for x in (11, 12, 13)] + [(10, 15, wht)])
        F.extend([(x, 13, lid) for x in (19, 20, 21)] + [(19, 14, lid), (20, 14, eye), (19, 15, eye), (20, 15, eye)])
        B.extend([(12, 12, 'B'), (13, 12, 'B'), (14, 12, 'B'), (19, 12, 'B'), (20, 12, 'B')])
    elif e == 'surprised':
        F.extend([(x, 12, lid) for x in range(10, 15)] + [(x, 12, lid) for x in (19, 20, 21)])
        F.extend([(10, 13, wht), (14, 13, wht), (10, 14, wht), (14, 14, wht), (10, 15, wht), (14, 15, wht)] + [(x, y, eye) for x in (11, 12, 13) for y in (13, 14, 15)])
        F.extend([(21, 13, wht), (21, 14, wht), (21, 15, wht)] + [(x, y, eye) for x in (19, 20) for y in (13, 14, 15)])
    elif e == 'sleepy':
        F.extend([(x, 13, 'a') for x in range(10, 15)] + [(x, 14, lid) for x in range(10, 15)] + [(x, 15, eye) for x in (11, 12, 13)])
        F.extend([(x, 13, 'a') for x in (19, 20, 21)] + [(x, 14, lid) for x in (19, 20, 21)] + [(19, 15, eye), (20, 15, eye)])
    elif e == 'blink':
        F.extend([(x, 13, 'a') for x in range(10, 15)] + [(x, 15, lid) for x in range(10, 15)] + [(x, 13, 'a') for x in (19, 20, 21)] + [(x, 15, lid) for x in (19, 20, 21)])
    elif e == 'embarrassed':
        F.extend([(11, 13, lid), (10, 13, lid), (12, 14, lid), (13, 14, lid), (11, 15, lid), (10, 15, lid)])
        F.extend([(20, 13, lid), (21, 13, lid), (19, 14, lid), (20, 15, lid), (21, 15, lid)])
    if lash and e not in ('happy', 'embarrassed'):
        ly = 12 if e == 'surprised' else (14 if e in ('sleepy',) else 15 if e == 'blink' else 13)
        F.append((9, ly, lid)); F.append((22, ly, lid))
    # nose
    F.append((17, 17, nose))
    # blush
    blm = {'neutral': 1, 'smile': 2, 'happy': 2, 'talk_open': 1, 'talk_closed': 1, 'sleepy': 1, 'blink': 1, 'sad': 1, 'embarrassed': 3}.get(e, 0)
    if blm >= 1: F.extend([(10, 17, bl), (11, 17, bl), (20, 17, bl), (21, 17, bl)])
    if blm >= 2: F.extend([(9, 17, bl), (12, 17, bl)])
    if blm == 3: F.extend([(9, 17, 'a'), (11, 17, 'a'), (20, 17, 'a'), (10, 16, bl), (12, 16, bl), (19, 16, bl), (21, 16, bl), (22, 17, bl)])
    MO = {'neutral': [(15, 19, mo), (16, 19, mo), (17, 19, mo)], 'talk_closed': [(15, 19, mo), (16, 19, mo), (17, 19, mo)], 'blink': [(15, 19, mo), (16, 19, mo), (17, 19, mo)],
          'smile': [(14, 18, mo), (15, 19, mo), (16, 19, mo), (17, 19, mo), (18, 18, mo)],
          'happy': [(14, 19, mo), (15, 19, '0'), (16, 19, '0'), (17, 19, '0'), (18, 19, mo), (15, 20, mo), (16, 20, tong), (17, 20, mo)],
          'sad': [(14, 20, mo), (15, 19, mo), (16, 19, mo), (17, 19, mo), (18, 20, mo)],
          'angry': [(14, 19, mo), (15, 19, mo), (16, 19, mo), (17, 19, mo), (18, 19, mo), (14, 20, mo), (18, 20, mo)],
          'surprised': [(16, 19, '0'), (16, 20, '0'), (15, 19, mo), (17, 19, mo), (15, 20, mo), (17, 20, mo), (16, 18, mo), (16, 21, mo)],
          'sleepy': [(16, 19, mo)],
          'talk_open': [(15, 19, mo), (16, 19, '0'), (17, 19, mo), (16, 20, mo)],
          'embarrassed': [(14, 19, mo), (15, 20, mo), (16, 19, mo), (17, 20, mo), (18, 19, mo)]}[e]
    F.extend(MO)
    return F, B


def glasses_codes():
    g = 'GL'; P = []
    for x in range(9, 16): P += [(x, 12, g), (x, 16, g)]
    for y in range(13, 16): P += [(9, y, g), (15, y, g)]
    for x in range(18, 23): P += [(x, 12, g), (x, 16, g)]
    for y in range(13, 16): P += [(18, y, g), (22, y, g)]
    P += [(16, 13, g), (17, 13, g), (8, 13, g), (7, 13, g)]
    return P


# ------------------------------------------------------------------ pose ops on code layers
def shift_rows(a, y0, y1, dy, dx=0):
    """move rows y0..y1 (inclusive) by (dx, dy); returns new array"""
    out = a.copy(); out[y0:y1 + 1] = ''
    for y in range(y0, y1 + 1):
        ny = y + dy
        if 0 <= ny < CH:
            row = a[y]
            for x in range(CW):
                if row[x] and 0 <= x + dx < CW: out[ny, x + dx] = row[x]
    return out


def pose_layers(base, kind, t, view, C, O):
    """base: se (or ne) idle code layers. returns posed copy"""
    L = {k: v.copy() for k, v in base.items()}
    HIP = 49; LEG0, LEG1 = 50, 64; SHOE0 = 65
    upper_keys = [k for k in ORDER if k not in ('shoes', 'shadow')]
    if kind == 'idle':
        b = -1 if t in (2, 3) else 0
        if b:
            for k in upper_keys:
                if k == 'pants':
                    L[k] = stretch_legs(L[k], b, {'A': (0, 0, 0), 'B': (0, 0, 0)})
                else: L[k] = shift_rows(L[k], 0, HIP, b)
        return L
    if kind == 'walk':
        s = [0, 1, 1, 0, -1, -1][t]; lift = [0, 1, 0, 0, 1, 0][t]
        fy = 1 if view == 'se' else -1
        b = -1 if t in (1, 4) else 0
        legs = {'A': (s, s * fy, lift if s > 0 or t == 1 else 0), 'B': (-s, -s * fy, lift if s < 0 or t == 4 else 0)}
        for k in upper_keys:
            if k == 'pants': L[k] = stretch_legs(L[k], b, legs)
            elif k == 'rips': L[k] = stretch_legs(L[k], b, legs, rips=True)
            else: L[k] = shift_rows(L[k], 0, HIP, b)
        # shoes: split at the leg gap column
        sh = L['shoes']; gap = leg_gap(base['pants'])
        A = sh.copy(); Bs = sh.copy(); A[:, gap:] = ''; Bs[:, :gap] = ''
        dxA, dyA, lA = legs['A']; dxB, dyB, lB = legs['B']
        A = shift_rows(A, SHOE0 - 2, CH - 1, dyA - lA, dxA); Bs = shift_rows(Bs, SHOE0 - 2, CH - 1, dyB - lB, dxB)
        L['shoes'] = merge(Bs, A) if dyA >= dyB else merge(A, Bs)
        return L
    if kind == 'sit':
        D = 3
        for k in upper_keys:
            if k in ('pants', 'rips'): continue
            L[k] = shift_rows(L[k], 0, HIP, D)
        L['pants'] = sit_legs(base['pants'], D, view, O)
        L['rips'] = sit_rips(base['rips'], D, view) if O['pants'].get('rips') else empty()
        L['shoes'] = sit_shoes(view)
        return L
    return L


def merge(a, b):
    o = a.copy(); o[b != ''] = b[b != '']; return o


def leg_gap(p):
    """column (canvas) of the gap between the legs in the reference pants"""
    rows = p[55]; xs = [x for x in range(CW) if rows[x]]
    for x in range(min(xs), max(xs)):
        if not rows[x]: return x
    return (min(xs) + max(xs)) // 2


def stretch_legs(p, b, legs, rips=False, HIP=49, LEG0=50, LEG1=64):
    out = p.copy(); out[:HIP + 1] = ''
    src = p; up = shift_rows(src, 0, HIP, b); out = merge(out, up); out[LEG0:LEG1 + 1] = ''
    gap = leg_gap(src) if not rips else 12 + OX
    order = sorted(legs, key=lambda n: legs[n][1])
    for n in order:
        dx, dy, lift = legs[n]
        cols = range(0, gap) if n == 'A' else range(gap + 1, CW)
        top = LEG0 + b; bot = LEG1 + dy - lift
        for y in range(top, bot + 1):
            fr = (y - top) / max(1, bot - top); sy = int(round(LEG0 + fr * (LEG1 - LEG0)))
            sx = int(round(dx * fr))
            for x in cols:
                c = src[sy, x]
                if c and 0 <= x + sx < CW: out[y, x + sx] = c
    return out


def paint_box(a, pts_fill, fill, edge='6', shade='8', light=None):
    """pts_fill: set of (x,y). fill colour, darker right column shade, 'edge' on left/right/bottom silhouette (ref trouser language)"""
    S = set(pts_fill)
    for (x, y) in S:
        c = fill
        if (x + 1, y) not in S or (x + 2, y) not in S: c = shade
        if light and (x - 1, y) in S and (x - 2, y) not in S: c = light
        if (x - 1, y) not in S or (x + 1, y) not in S or (x, y + 1) not in S: c = edge
        if 0 <= y < CH and 0 <= x < CW: a[y, x] = c


def rect(x0, y0, x1, y1): return {(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)}


def sit_legs(p, D, view, O):
    out = empty(); hb = 49 + D
    hp = shift_rows(p, 0, 49, D); hp[hb + 1:] = ''; out = merge(out, hp)
    R = lambda x: x + OX
    # seated 3/4: thighs come toward the camera (screen right/down) as short thick blocks, shins straight down, feet forward
    far = rect(R(11), hb - 3, R(21), hb + 1) | rect(R(17), hb + 1, R(21), 62)
    near = rect(R(6), hb - 2, R(18), hb + 3) | rect(R(13), hb + 3, R(18), 64)
    near -= {(R(18), hb - 2)}; far -= {(R(21), hb - 3)}
    if view == 'ne':
        far = rect(16, hb - 3, 25, hb) | rect(18, hb, 21, 62)
        near = rect(15, hb - 2, 27, hb + 1) | rect(22, hb + 1, 26, 63)
    a = empty(); paint_box(a, far, '9', '6', '8'); out = merge(out, a)
    a = empty(); paint_box(a, near, 'c', '6', '9')
    for x in (range(R(7), R(17)) if view == 'se' else range(16, 26)):
        y = hb + 1 if view == 'se' else hb
        if a[y, x] == 'c' and x % 3 == 0: a[y, x] = '8'        # fabric fold across the lap
    for y in range(hb + 4, 64):
        x = R(15) if view == 'se' else 24
        if a[y, x] in ('c', '9'): a[y, x] = '9'                 # trouser fold down the shin (ref)
    out = merge(out, a)
    return out


def sit_rips(r, D, view):
    a = empty()
    if view == 'se':
        for (x, y) in ((OX + 9, 50 + D), (OX + 10, 50 + D), (OX + 19, 58), (OX + 20, 58)): a[y, x] = 'RW'
        a[51 + D, OX + 9] = 'RS'
    return a


def sit_shoes(view):
    a = empty(); R = lambda x: x + OX
    if view == 'se':
        far = rect(R(16), 63, R(23), 66) - {(R(16), 63), (R(23), 63)}; near = rect(R(12), 65, R(20), 69) - {(R(12), 65), (R(20), 65), (R(20), 66)}
    else:
        far = rect(17, 62, 22, 65) - {(22, 62)}; near = rect(21, 64, 28, 68) - {(28, 64)}
    for S in (far, near):
        yb = max(yy for _, yy in S)
        for (x, y) in S:
            a[y, x] = '2' if ((x, y - 1) not in S and (x - 1, y) in S and y < yb - 1) else '0'
    return a


# ------------------------------------------------------------------ back view (ne): derived from the mirrored reference
def mirror(a): return a[:, ::-1].copy()


def mx(x): return CW - 1 - x      # canvas x mirror


def back_layers(se, C, O):
    """back 3/4 view drawn in reference coords (ear on the left, like the ref), then mirrored -> ne"""
    L = {k: v.copy() for k, v in se.items()}
    L['face'] = empty(); L['held'] = empty(); L['acc'] = empty(); L['shirt_graphic'] = empty()
    R = lambda x: x + OX
    style = C['hair_style']
    head = {(x, y) for y in range(0, 22) for x in range(CW) if (se['hair_front'][y, x] or (se['body'][y, x] and y <= 20) or se['face'][y, x])}
    ear = {(R(x), y) for x in range(3, 9) for y in range(12, 19)} & head
    neck = {(R(x), y) for x in range(10, 17) for y in range(17, 23)}
    hair = {(x, y) for (x, y) in head if (x, y) not in ear and y <= 17}
    hair -= {(R(x), 17) for x in (9, 10, 15, 16, 17, 18, 19, 20, 21)}
    if style == 'long':
        hair |= {(x, y) for x in range(R(3), R(25)) for y in range(10, 35)} | {(x, y) for x in range(R(4), R(24)) for y in range(35, 37)}
        hair -= {(x, 36) for x in range(R(4), R(24), 3)}
    hb = empty()
    for (x, y) in hair:
        c = '3'
        if (x - 1, y) not in hair or (x + 1, y) not in hair or (x, y - 1) not in hair: c = '1'
        if (x, y + 1) not in hair: c = '0'
        hb[y, x] = c
    for (x, y) in [(5, 5), (6, 5), (5, 6), (6, 6), (7, 6), (8, 7), (10, 7), (11, 7), (12, 7), (16, 6), (17, 6), (18, 7), (19, 5), (20, 5), (20, 6), (8, 11), (13, 12), (19, 11), (11, 14), (16, 14)]:
        if hb[y, R(x)] == '3': hb[y, R(x)] = '4'
    for x in (9, 14, 19):
        for y in range(8, 17):
            if hb[y, R(x)] == '3' and y % 4 != 0: hb[y, R(x)] = '1'
    if style == 'long':
        for (x, y0, y1) in ((5, 14, 31), (8, 18, 35), (11, 15, 28), (13, 22, 35), (16, 16, 32), (19, 19, 35), (22, 14, 30)):
            for y in range(y0, y1):
                if hb[y, R(x)] == '3': hb[y, R(x)] = '1'
        for (x, y) in [(7, 20), (8, 21), (15, 22), (16, 23), (11, 27), (19, 26), (6, 30), (13, 31)]:
            if hb[y, R(x)] == '3': hb[y, R(x)] = '4'
    L['hair_front'] = hb
    # ---- body: ear + neck + arms at the sides (forearms/hands are in front of the body -> hidden)
    body = empty()
    for (x, y) in ear: body[y, x] = se['body'][y, x] or 'i'
    for (x, y) in neck:
        if (x, y) in hair: continue
        body[y, x] = '7' if x in (R(10), R(16)) else ('e' if y >= 21 else ('h' if x >= R(14) else 'i'))
    for y in range(22, 45):
        for x in range(CW):
            c = se['body'][y, x]
            if c and x >= R(18): body[y, x] = c                    # far arm at the side
    bf = empty()
    for y in range(30, 40):
        for x in range(CW):
            c = se['body_front'][y, x]
            if c and x <= R(5) and y <= 37: bf[y, x] = c        # near upper arm / elbow only
    for x in (R(2), R(3), R(4)): bf[38, x] = '7'
    bf[37, R(5)] = '7'
    L['body'] = body; L['body_front'] = bf
    # ---- shirt back
    sh = se['shirt'].copy()
    torso = {(x, y) for y in range(22, 39) for x in range(R(6), R(18))}
    for (x, y) in torso:
        if not sh[y, x] or se['acc'][y, x] or se['body_front'][y, x] or se['held'][y, x] or se['body'][y, x]:
            sh[y, x] = 'd' if y == 38 else ('j' if x in (R(12), R(13)) and y % 3 else 'k')
    for x in range(R(8), R(18)):
        sh[21, x] = 'd'; sh[22, x] = 'g' if x not in (R(8), R(17)) else 'd'
    for x in range(R(9), R(17)): sh[23, x] = 'k' if sh[23, x] else sh[23, x]
    for y in range(24, 38):
        if sh[y, R(17)]: sh[y, R(17)] = 'j'
    L['shirt'] = sh
    if O.get('outer'):
        ou = L['outer'].copy()
        for (x, y) in torso:
            if sh[y, x] and not ou[y, x]: ou[y, x] = 'O1' if x < R(15) else 'O2'
        for x in range(R(6), R(18)): 
            if ou[38, x]: ou[38, x] = 'O4'
        L['outer'] = ou
    # ---- pants back
    p = se['pants'].copy()
    for y in range(38, 43):
        for x in range(R(6), R(21)):
            if not p[y, x] and y >= 39: p[y, x] = '6' if x in (R(6), R(20)) else ('c' if x < R(12) else '9')
    pk = {'c': '8', '9': '8', 'P1': 'P3', 'P2': 'P3'}
    for (x0, y0) in ((R(8), 44), (R(15), 44)):
        for dx in range(3):
            for dy in range(2):
                c = p[y0 + dy, x0 + dx]
                if c: p[y0 + dy, x0 + dx] = pk.get(c, c)
    L['pants'] = p
    L['rips'] = empty()
    return {k: mirror(v) for k, v in L.items()}


# ------------------------------------------------------------------ characters
def recolor(a, mp):
    o = a.copy()
    for k, v in mp.items(): o[a == k] = v
    return o


def build_char_layers(C, O):
    """se idle code layers for this character/outfit (derived from the reference)"""
    L, extra = ref_layers()
    pal = dict(REFPAL); pal.update(extra)
    pal.update({'B': hx(C.get('brow', '#2E2626')), 'T1': (150, 196, 232), 'RW': (236, 240, 246), 'RS': (190, 150, 132), 'GL': hx(C.get('glasses', '#4A4650'))})
    # ---- held item
    held = O.get('held')
    if not held or held['type'] != 'cup':
        hl = L['held']; L['held'] = empty()
        for y in range(CH):
            for x in range(CW):
                if hl[y, x]:
                    # hands continue where the cup was
                    if y >= 38 and x <= OX + 18: L['body_front'][y, x] = '7' if (y == 41 or x == OX + 18 or y == 38) else 'i'
                    elif y >= 40: L['pants'][y, x] = '6'
        if held and held['type'] == 'phone':
            for (x, y, c) in ((15, 37, 'Ph'), (16, 37, 'Ph'), (15, 38, 'Pl'), (16, 38, 'Ph'), (15, 39, 'Ph'), (16, 39, 'Ph')):
                L['held'][y, x + OX] = c
            pal.update({'Ph': (52, 52, 64), 'Pl': (124, 160, 206)})
    # ---- shirt type
    st = O['shirt']
    if st['type'] == 'tee':
        # remove the collar points + tie; crew neck ring; tie area becomes shirt fabric (keeping the ref fold language)
        for y in range(20, 40):
            for x in range(CW):
                if L['acc'][y, x]: L['shirt'][y, x] = 'k' if (x + y) % 5 else 'j'
        L['acc'] = empty()
        for (x, y) in ((8, 21), (9, 21), (10, 21), (8, 20), (9, 20), (16, 22), (17, 22), (17, 21), (18, 22), (18, 23), (7, 22)):
            if L['shirt'][y, x + OX] and y <= 22: L['shirt'][y, x + OX] = ''
        for y in range(20, 27):
            for x in range(CW):
                c = L['shirt'][y, x]
                if c in ('g', 'd', 'b', 'j'):
                    edge = not L['shirt'][y, x - 1] or not L['shirt'][y, x + 1] or not L['shirt'][y - 1, x]
                    L['shirt'][y, x] = 'd' if edge else ('j' if x >= OX + 17 else 'k')
        for x in range(10, 18):
            L['body'][21, x + OX] = 'i' if 11 <= x <= 16 else '7'; L['body'][22, x + OX] = 'e' if 11 <= x <= 16 else '7'
            L['shirt'][21, x + OX] = ''; L['shirt'][22, x + OX] = ''
        for x in range(9, 19): L['shirt'][23, x + OX] = 'd' if x in (9, 18) else 'g'
        if st.get('graphic'):
            g = st['graphic']; pal.update({'Q1': hx(g['c1']), 'Q2': hx(g['c2']), 'Q3': hx(g['c3'])})
            pat = ['.1111.', '122221', '123321', '122221', '.1111.']
            for j, row in enumerate(pat):
                for i, ch in enumerate(row):
                    if ch != '.': L['shirt_graphic'][27 + j, 11 + i + OX] = 'Q' + ch
    # ---- outer (cardigan): sides of the shirt recoloured into the outer layer, centre strip stays the tee
    ou = O.get('outer')
    if ou:
        om = {'k': 'O1', 'j': 'O2', 'g': 'O3', 'd': 'O4', 'b': 'O5'}
        oc = hx(ou['color']); pal.update({'O1': oc, 'O2': tone(oc, 0.90), 'O3': tone(oc, 0.82), 'O4': tone(oc, 0.72), 'O5': tone(oc, 0.64)})
        sh = L['shirt']; out = empty()
        for y in range(22, 40):
            for x in range(CW):
                if sh[y, x] and not (OX + 10 <= x <= OX + 15 and y >= 24):
                    out[y, x] = om.get(sh[y, x], 'O2')
        for y in range(24, 40):
            out[y, OX + 9] = 'O4' if out[y, OX + 9] else out[y, OX + 9]; out[y, OX + 16] = 'O4' if out[y, OX + 16] else out[y, OX + 16]
        for x in list(range(OX + 2, OX + 10)) + list(range(OX + 16, OX + 21)):
            if out[38, x] or out[37, x]: out[39, x] = 'O4'
        L['outer'] = out
    maps = {}
    # ---- pants
    pt = O['pants']
    if pt['type'] == 'baggy':
        pc = hx(pt['color']); pal.update({'P1': mix(pc, (255, 255, 255), 0.12), 'P2': pc, 'P3': tone(pc, 0.9), 'P4': tone(pc, 0.70)})
        L['pants'] = recolor(L['pants'], {'c': 'P1', '9': 'P2', '8': 'P3', '6': 'P4', 'f': 'P1', '7': 'P4', '5': 'P4'})
        maps['pants'] = {'c': 'P1', '9': 'P2', '8': 'P3', '6': 'P4'}
        p = L['pants']
        for y in range(50, 65):   # widen each leg outward by 1 (baggy), more at the hem
            for x0, d in ((OX + 6, -1), (OX + 18, 1)):
                xs = [x for x in range(CW) if p[y, x]]
                if not xs: continue
                if d < 0: x = min(xs); p[y, x - 1] = 'P4'; p[y, x] = 'P1'
                else: x = max(xs); p[y, x + 1] = 'P4'; p[y, x] = 'P3'
            if y >= 61:
                xs = [x for x in range(CW) if p[y, x]]; p[y, min(xs) - 1] = 'P4'; p[y, max(xs) + 1] = 'P4'
        if pt.get('rips'):
            for (x, y) in ((8, 46), (9, 46), (7, 54), (8, 54), (15, 50), (16, 50), (9, 59), (16, 58)):
                L['rips'][y, x + OX] = 'RW'
            for (x, y) in ((8, 47), (7, 55), (15, 51)): L['rips'][y, x + OX] = 'RS'
    elif pt['type'] == 'trousers' and pt.get('color'):
        pc = hx(pt['color']); pal.update({'P1': mix(pc, (255, 255, 255), 0.10), 'P2': pc, 'P3': tone(pc, 0.88), 'P4': tone(pc, 0.70)})
        L['pants'] = recolor(L['pants'], {'c': 'P1', '9': 'P2', '8': 'P3', '6': 'P4', 'f': 'P1', '7': 'P4', '5': 'P4'})
        maps['pants'] = {'c': 'P1', '9': 'P2', '8': 'P3', '6': 'P4'}
    # ---- shoes colour
    if O['shoes'].get('color'):
        sc = hx(O['shoes']['color']); pal.update({'S0': sc, 'S2': mix(sc, (255, 255, 255), 0.12), 'S1': tone(sc, 0.85)})
        L['shoes'] = recolor(L['shoes'], {'0': 'S0', '2': 'S2', '1': 'S1'}); maps['shoes'] = {'0': 'S0', '2': 'S2', '1': 'S1'}
    # ---- skin
    if C.get('skin_map'):
        for k, v in C['skin_map'].items(): pal['K' + k] = hx(v)
        for key in ('body', 'body_front'):
            L[key] = recolor(L[key], {k: 'K' + k for k in C['skin_map']})
        maps['body'] = maps['body_front'] = {k: 'K' + k for k in C['skin_map']}
    # ---- hair
    if C['hair_style'] == 'long':
        hm = {k: 'H' + k for k in '01234'}
        for k, v in C['hair_map'].items(): pal['H' + k] = hx(v)
        L['hair_front'] = long_hair_front(L['hair_front']); L['hair_back'] = long_hair_back()
        L['hair_front'] = recolor(L['hair_front'], hm); L['hair_back'] = recolor(L['hair_back'], hm); maps['hair_front'] = maps['hair_back'] = hm
        pal['B'] = hx(C['brow'])
    pal['_maps'] = maps
    return L, pal


def long_hair_front(h):
    """reference hair cap + long side curtains in the same block language (edge 1, base 3, highlight 4, deep 0 tips)"""
    h = h.copy(); R = lambda x: x + OX
    near = rect(R(3), 11, R(8), 30) | rect(R(4), 31, R(8), 33) | rect(R(5), 34, R(7), 34)
    near -= rect(R(7), 11, R(8), 12)
    far = rect(R(21), 11, R(24), 27) | rect(R(21), 28, R(23), 30)
    for S in (near, far):
        for (x, y) in S:
            c = '3'
            if (x - 1, y) not in S or (x + 1, y) not in S: c = '1'
            if (x, y + 1) not in S: c = '0'
            h[y, x] = c
    for (x, y0, y1) in ((R(5), 16, 27), (R(7), 19, 31), (R(22), 15, 25)):
        for y in range(y0, y1):
            if h[y, x] == '3': h[y, x] = '1'
    for (x, y) in ((R(4), 13), (R(5), 13), (R(4), 14), (R(6), 20), (R(6), 21), (R(23), 13), (R(22), 12), (R(23), 19)):
        if h[y, x] in ('3', '1'): h[y, x] = '4'
    for (x, y) in ((R(9), 12), (R(9), 13), (R(20), 12), (R(20), 13)): h[y, x] = '1'
    return h


def long_hair_back():
    a = empty(); R = lambda x: x + OX
    S = rect(R(3), 12, R(24), 33) | rect(R(4), 34, R(23), 35)
    for x in range(R(4), R(24), 3): S.discard((x, 35))
    for (x, y) in S:
        c = '3'
        if (x - 1, y) not in S or (x + 1, y) not in S: c = '1'
        if (x, y + 1) not in S: c = '0'
        a[y, x] = c
    for (x, y0, y1) in ((R(6), 16, 30), (R(10), 20, 33), (R(14), 15, 29), (R(18), 18, 34), (R(21), 14, 31)):
        for y in range(y0, y1):
            if a[y, x] == '3': a[y, x] = '1'
    return a


def hx(c): c = c.lstrip('#'); return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))
def mix(a, b, t): return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))
def tone(c, v): return tuple(int(round(x * v)) for x in c)


def to_img(a, pal):
    im = np.zeros((CH, CW, 4), np.uint8)
    for y in range(CH):
        for x in range(CW):
            k = a[y, x]
            if k: im[y, x, :3] = pal[k]; im[y, x, 3] = 255
    return im


def frame_img(layers_rgba):
    fr = {}
    for k, a in layers_rgba.items():
        o = np.zeros((FH, FW, 4), np.uint8); o[FY:FY + CH, FX:FX + CW] = a[:min(CH, FH - FY), :]
        fr[k] = Image.fromarray(o, 'RGBA')
    return fr


def face_layer(expr, C, view, sitD=0, bob=0, glasses=False):
    F = empty(); B = empty(); G = empty()
    if view == 'ne': return F, B, G
    fc, bc = face_codes(expr, C)
    for (x, y, c) in fc: F[y + sitD + bob, x + OX] = c
    for (x, y, c) in bc: B[y + sitD + bob, x + OX] = c
    if glasses:
        for (x, y, c) in glasses_codes(): G[y + sitD + bob, x + OX] = c
    return F, B, G


GAME = os.environ.get('V6B_GAME') == '1'
VARS = ['blink', 'embarrassed', 'sleepy']; VNAME = {'blink': 'blink', 'embarrassed': 'emb', 'sleepy': 'sleepy'}


def lie_frame(imgs, view, f, upper_only=False):
    """reclining on a bed/lounger, built from the seated frame: upper body leans back (moved down-left), the legs are redrawn
    stretched out along the iso axis (se: towards screen right-down, ne: right-up), same trouser/shoe ramps, one pixel grid"""
    CUT = FY + 49 + 3 + 1           # seated hip line (frame y)
    dx, dy = (-9, 9) if view == 'se' else (-8, 6)
    out = {}
    for k, im in imgs.items():
        a = np.array(im); up = a.copy(); up[CUT:] = 0
        if k == 'shadow': up[:] = 0
        sh = np.zeros_like(a)
        y0, x0 = max(0, dy), max(0, dx); y1, x1 = FH + min(0, dy), FW + min(0, dx)
        sh[y0:y1, x0:x1] = up[y0 - dy:y1 - dy, x0 - dx:x1 - dx]
        out[k] = sh
    if upper_only: return {k: Image.fromarray(v, 'RGBA') for k, v in out.items()}
    # colours from the seated frame
    def ramp(k):
        a = np.array(imgs[k]); px = a[a[..., 3] > 200][:, :3]
        if not len(px): return None
        u, n = np.unique(px, axis=0, return_counts=True); u = u[np.argsort(-n)][:6]
        u = sorted(u.tolist(), key=lambda c: sum(c)); return [tuple(c) for c in u]
    P = ramp('pants'); S = ramp('shoes') or [(40, 40, 44), (70, 70, 76)]
    L = np.zeros((FH, FW, 4), np.uint8); SH = np.zeros((FH, FW, 4), np.uint8)
    def put(a, x, y, c):
        if 0 <= x < FW and 0 <= y < FH: a[y, x] = (*c, 255)
    hipx, hipy = 32 + dx + 5, CUT + dy - 1          # hip (frame), after the lean
    if P:
        edge, shade, fill, light = P[0], P[min(1, len(P) - 1)], P[len(P) // 2], P[-1]
        n = 22 if view == 'se' else 20; sl = 1 if view == 'se' else -1
        for leg, (ox, oy, th) in enumerate(((0, 0, 6), (2, -2 if view == 'se' else 1, 5))):
            for t in range(n):
                cx = hipx + ox + t; cy = hipy + oy + int(round(t * sl / 2))
                for j in range(th):
                    c = light if j == 0 else (edge if j == th - 1 else (shade if j == th - 2 else fill))
                    if t == n - 1: c = edge
                    put(L, cx, cy + j - th // 2, c)
            fx = hipx + ox + n; fy = hipy + oy + int(round(n * sl / 2))
            for yy in range(fy - th // 2 - 3, fy + th - th // 2):       # shoe: toes up
                for xx in range(fx, fx + 3):
                    put(SH, xx, yy, S[min(1, len(S) - 1)] if (yy == fy - th // 2 - 3 or xx == fx + 2) else S[0])
    # shadow under the whole body
    yy, xx = np.mgrid[0:FH, 0:FW]; shd = np.zeros((FH, FW, 4), np.uint8)
    shd[((xx + .5 - 34) / 24) ** 2 + ((yy + .5 - (hipy + 6)) / 4) ** 2 <= 1] = (0, 0, 0, 50); out['shadow'] = shd
    lg = Image.fromarray(L, 'RGBA'); sh = Image.fromarray(SH, 'RGBA')
    pants = Image.fromarray(out['pants'], 'RGBA'); base = Image.new('RGBA', (FW, FH))
    if view == 'se': base.alpha_composite(pants); base.alpha_composite(lg)
    else: base.alpha_composite(lg); base.alpha_composite(pants)
    out['pants'] = np.array(base)
    sho = Image.fromarray(out['shoes'], 'RGBA'); sho.alpha_composite(sh); out['shoes'] = np.array(sho)
    return {k: Image.fromarray(v, 'RGBA') for k, v in out.items()}


def build(cfg_path, outfit=None, glasses=None):
    C = json.load(open(cfg_path)); name = C['name']; outfit = outfit or C['default_outfit']; O = C['outfits'][outfit]
    gl = C.get('glasses_default', False) if glasses is None else glasses
    od = os.path.join(ROOT, 'parts', name); os.makedirs(od + '/faces', exist_ok=True)
    se, pal = build_char_layers(C, O)
    # the face features on the body skin are blanked so expressions swap cleanly
    ne = back_layers(se, C, O)
    blank = lambda: Image.new('RGBA', (FW * COLS, FH * ROWS))
    layers = {k: blank() for k in ORDER}; EX = {e: (blank(), blank()) for e in EXPRS}; VS = {e: blank() for e in VARS}
    shadow = np.zeros((FH, FW, 4), np.uint8)
    yy, xx = np.mgrid[0:FH, 0:FW]
    for anim, r0 in ROWMAP.items():
        kind = {'walk': 'walk', 'idle': 'idle', 'talk': 'idle', 'sit': 'sit', 'sit_type': 'sit', 'perch': 'sit', 'sleep': 'sit', 'lie': 'sit'}.get(anim, 'idle')
        nf = 6 if anim in ('walk', 'swim') else 4
        for di, d in enumerate(DIRS):
            view = 'se' if d in ('se', 'sw') else 'ne'; mir = d in ('sw', 'nw')
            for f in range(nf):
                base = se if view == 'se' else ne
                P = pose_layers(base, kind, f, view, C, O)
                for mk, mp in pal['_maps'].items(): P[mk] = recolor(P[mk], mp)
                if kind == 'sit' and view == 'ne': pass
                pos = (f * FW, (r0 + di) * FH)
                rg = {k: to_img(v, pal) for k, v in P.items() if k not in ('face', 'brows', 'acc_head')}
                imgs = frame_img(rg)
                if anim == 'lie': imgs = lie_frame(imgs, view, f)
                sh = np.zeros((FH, FW, 4), np.uint8); cx = 32 + (3 if kind == 'sit' else 0)
                sh[((xx + .5 - cx) / 11) ** 2 + ((yy + .5 - 100.5) / 2.4) ** 2 <= 1] = (0, 0, 0, 56); imgs['shadow'] = Image.fromarray(sh, 'RGBA')
                fl = (lambda im: im.transpose(Image.FLIP_LEFT_RIGHT)) if mir else (lambda im: im)
                for k, im in imgs.items(): layers[k].paste(fl(im), pos)
                sitD = 3 if kind == 'sit' else 0
                bob = (-1 if f in (2, 3) else 0) if kind == 'idle' else ((-1 if f in (1, 4) else 0) if kind == 'walk' else 0)
                def faceimgs(e):
                    F, B, G = face_layer(e, C, view, sitD, bob, gl)
                    fi = frame_img({'f': to_img(F, pal), 'b': to_img(B, pal), 'g': to_img(G, pal)})
                    if anim == 'lie': fi = lie_frame(fi, view, f, upper_only=True)
                    return fl(fi['f']), fl(fi['b']), fl(fi['g'])
                for e in EXPRS:
                    a, b, _ = faceimgs(e); EX[e][0].paste(a, pos); EX[e][1].paste(b, pos)
                seq = BAKE.get(anim, ['neutral']); ex = seq[f % len(seq)]
                if anim == 'idle' and f == 3 and not GAME: ex = 'blink'
                a, b, g = faceimgs(ex); layers['face'].paste(a, pos); layers['brows'].paste(b, pos); layers['acc_head'].paste(g, pos)
                # runtime face variants (game): same frame, other expression. sleep/lie keep closed eyes.
                body = Image.new('RGBA', (FW, FH))
                for k in ORDER:
                    if k in imgs and k not in ('face', 'brows', 'acc_head'): body.alpha_composite(fl(imgs[k]))
                for ve in VARS:
                    e2 = 'blink' if anim in ('sleep', 'lie') else ve
                    a2, b2, g2 = faceimgs(e2); fr2 = body.copy()
                    # same layer order as the sheet: face under hair_front, then acc_head, brows
                    fr2 = Image.new('RGBA', (FW, FH))
                    for k in ORDER:
                        if k == 'face': fr2.alpha_composite(a2)
                        elif k == 'brows': fr2.alpha_composite(b2)
                        elif k == 'acc_head': fr2.alpha_composite(g2)
                        elif k in imgs: fr2.alpha_composite(fl(imgs[k]))
                    VS[ve].paste(fr2, pos)
    opt = {'hair_back': C['hair_style'], 'hair_front': C['hair_style'], 'body': 'base', 'body_front': 'arms_' + ((O.get('held') or {}).get('type') or 'empty'),
           'shirt': O['shirt']['id'], 'shirt_graphic': O['shirt']['id'], 'outer': (O.get('outer') or {}).get('id', 'none'), 'acc': (O.get('acc') or {}).get('id', 'none'),
           'pants': O['pants']['id'], 'rips': O['pants']['id'], 'shoes': O['shoes']['id'], 'held': (O.get('held') or {}).get('id', 'none'),
           'acc_head': 'glasses' if gl else 'none', 'face': 'baked', 'brows': 'baked', 'shadow': 'base'}
    man_p = os.path.join(od, 'manifest.json'); man = json.load(open(man_p)) if os.path.exists(man_p) else {'sheets': {}, 'modules': {}}
    sheet = Image.new('RGBA', (FW * COLS, FH * ROWS)); used = {}
    for k in ORDER:
        os.makedirs(f'{od}/{k}', exist_ok=True); fn = f'{od}/{k}/{opt[k]}.png'; layers[k].save(fn); used[k] = f'{k}/{opt[k]}.png'
        man['modules'][k] = sorted(set(man['modules'].get(k, []) + [opt[k]])); sheet.alpha_composite(layers[k])
    for e, (fa, br) in EX.items(): fa.save(f'{od}/faces/face_{e}.png'); br.save(f'{od}/faces/brows_{e}.png')
    tag = outfit + ('_glasses' if gl else '')
    sn = f'{name}_v6b_sheet.png' if (outfit == C['default_outfit'] and gl == C.get('glasses_default', False)) else f'{name}_v6b_{tag}_sheet.png'
    sheet.save(os.path.join(ROOT, sn)); man['sheets'][tag] = {'sheet': sn, 'layers': used}
    if GAME:   # face-diff overlays: only pixels that differ from the base sheet (drawn by the game on top of the base, same frame grid)
        os.makedirs(os.path.join(ROOT, 'game'), exist_ok=True); sheet.save(os.path.join(ROOT, 'game', sn))
        A = np.array(sheet)
        for ve, im in VS.items():
            V = np.array(im); d = np.any(V != A, axis=2); O = np.zeros_like(V); O[d] = V[d]
            O[d & (V[..., 3] == 0)] = 0
            Image.fromarray(O, 'RGBA').save(os.path.join(ROOT, 'game', sn.replace('_sheet.png', '_f' + VNAME[ve] + '.png')), optimize=True)
            im.save(os.path.join(ROOT, 'game', 'full_' + sn.replace('_sheet.png', '_' + ve + '.png')))
    man.update({'name': name, 'frame': [FW, FH], 'pivot': [32, 100], 'pixel_grid': '1 reference block = 1 sheet px', 'rows': ROWMAP, 'dirs': DIRS,
                'layer_order': ORDER, 'expressions': EXPRS, 'baked': {'idle': 'neutral, col 3 blink', **BAKE, 'other': 'neutral'}})
    json.dump(man, open(man_p, 'w'), indent=1); print('built', sn)


if __name__ == '__main__':
    a = sys.argv[1:]; cfg = a[0]; outfit = a[1] if len(a) > 1 and not a[1].startswith('--') else None
    g = True if '--glasses' in a else (False if '--noglasses' in a else None)
    build(cfg, outfit, g)
