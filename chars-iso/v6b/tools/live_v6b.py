#!/usr/bin/env python3
"""v6b-live: the v6b drawing language with the LIVE characters' identity + outfits, arms down and swinging (no held item).
Fork of ref_v6b.py. Output: v6b/live/.
v6b: reference-faithful build. The reference sprite is recovered on its native pixel grid (study/ref_native.png, 24x69 blocks,
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
ORDER = ['shadow', 'hair_back', 'body', 'arm_far', 'shoes', 'pants', 'rips', 'shirt', 'shirt_graphic', 'outer', 'acc', 'arm_near', 'body_front', 'held', 'face', 'hair_front', 'acc_head', 'brows', 'fx']
OUTD = None
EXPRS = ['neutral', 'smile', 'happy', 'sad', 'angry', 'surprised', 'sleepy', 'blink', 'talk_open', 'talk_closed', 'embarrassed']
BAKE = {'talk': ['talk_open', 'talk_closed', 'talk_open', 'talk_closed'], 'tired': ['sleepy'], 'sleep': ['blink'], 'lie': ['blink'], 'swim': ['smile'], 'float': ['smile']}
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


def glasses_codes(shape=None):
    g = 'GL'; P = []
    if shape == 'round':                                   # round, thick-ish frame (photo ref): 7x6 near lens, 5x6 far lens
        P += [(x, 12, g) for x in (11, 12, 13)] + [(10, 13, g), (14, 13, g)] + [(9, y, g) for y in (14, 15)] + [(15, y, g) for y in (14, 15)]
        P += [(10, 16, g), (14, 16, g)] + [(x, 17, g) for x in (11, 12, 13)] + [(10, 12, g), (14, 12, g)]
        P += [(x, 12, g) for x in (19, 20, 21)] + [(18, y, g) for y in (13, 14, 15, 16)] + [(22, y, g) for y in (13, 14, 15, 16)] + [(x, 17, g) for x in (19, 20, 21)]
        P += [(15, 13, g), (16, 13, g), (17, 13, g), (8, 14, g), (7, 14, g)]
        return P
    for x in range(9, 16): P += [(x, 12, g), (x, 16, g)]
    for y in range(13, 16): P += [(9, y, g), (15, y, g)]
    for x in range(18, 23): P += [(x, 12, g), (x, 16, g)]
    for y in range(13, 16): P += [(18, y, g), (22, y, g)]
    P += [(16, 13, g), (17, 13, g), (8, 13, g), (7, 13, g)]
    P = [p for p in P if (p[0], p[1]) not in {(9, 12), (15, 12), (9, 16), (15, 16), (18, 12), (22, 12), (18, 16), (22, 16)}]
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


def draw_arms(kind, t, view, bob=0, long_sleeve=False):
    """arms hanging at the sides, 3 blocks wide (edge 7 / base i / shade h, far arm a / e / 7), hand = last 3 rows, rounded.
    walk: swing opposite to the leg on the same side (hand moves 2 blocks along the screen)."""
    an, af = empty(), empty(); R = lambda x: x + OX
    if kind in ('sit', 'perch', 'sleep'):
        return sit_arms(view, long_sleeve)
    if kind == 'sit_type':
        return sit_arms(view, long_sleeve, mode='type', t=t)
    if kind == 'swim':
        return swim_arms(view, t, long_sleeve)
    if kind == 'float':
        return spread_arms(view, long_sleeve)
    D = 0
    top, bot = 32 + bob + D, 44 + bob + D
    sw = [0, 1, 1, 0, -1, -1][t] if kind == 'walk' else 0
    for arr, x0, sg, cols in ((an, R(1) + TDX, -2 * sw, ('7', 'i', 'h')), (af, R(19) + TDX, 2 * sw, ('a', 'e', '7'))):
        for y in range(top, bot + 1):
            o = int(round(sg * (y - top) / (bot - top)))
            for j, c in enumerate(cols):
                if y == bot and j == 0: continue
                cc = '7' if (y == bot or (y == bot - 1 and j == 2 and arr is an)) else c
                if y >= bot - 2 and arr is an and j == 1 and y < bot: cc = 'i'
                if long_sleeve and y < bot - 2:
                    cc = (('O4', 'O1', 'O2') if arr is an else ('O2', 'O3', 'O4'))[j]
                    if y == bot - 3: cc = 'O4'
                arr[y, x0 + o + j] = cc
    if kind == 'talk' and t in (1, 2) and view == 'se':        # talking: near hand comes up in front of the chest
        x0 = R(1) + TDX; an[:, :] = ''
        for y in range(32, 39):
            for j, c in enumerate(('7', 'i', 'h')): an[y, x0 + j] = ((('O4', 'O1', 'O2')[j]) if long_sleeve else c)
        lift = 1 if t == 2 else 0
        for k in range(4):                                          # forearm forward/up
            y = 38 - k - lift; x = x0 + 2 + k
            for j, c in enumerate(('7', 'i', 'h')): an[y + j - 1, x] = c if not (long_sleeve and k < 2) else ('O4', 'O1', 'O2')[j]
        for y in range(32 - lift, 35 - lift):                       # open hand
            for x in range(x0 + 6, x0 + 9): an[y, x] = '7' if (y == 34 - lift or x == x0 + 8) else 'i'
        an[31 - lift, x0 + 7] = '7'
    if view == 'ne': an, af = mirror(an), mirror(af)
    if kind == 'tired':                                            # slumped: arms hang 1 lower, a little forward
        an = shift_rows(an, 0, CH - 1, 1); af = shift_rows(af, 0, CH - 1, 1)
    return an, af


def swim_arms(view, t, long_sleeve=False):
    """swimming (breast stroke): upper body above the water, both arms out to the sides at shoulder height, sweeping fwd/back"""
    an, af = empty(), empty(); R = lambda x: x + OX
    s = [0, 1, 2, 1, 0, -1][t]
    for arr, x0, dx, cols in ((an, R(2) + TDX, -1, ('7', 'i', 'h')), (af, R(20) + TDX, 1, ('a', 'e', '7'))):
        for k in range(7):
            x = x0 + dx * k; y = 26 + (k * (1 + s)) // 4
            for j, c in enumerate(cols):
                arr[y + j, x] = (('O4', 'O1', 'O2')[j] if (long_sleeve and k < 4) else c)
        hx_ = x0 + dx * 7; hy = 26 + (7 * (1 + s)) // 4
        for y in range(hy, hy + 3):
            for x in (hx_, hx_ + dx):
                arr[y, x] = '7' if (y == hy + 2 or x == hx_ + dx) else 'i'
    if view == 'ne': an, af = mirror(an), mirror(af)
    return an, af


def spread_arms(view, long_sleeve=False):
    """floating on the back: arms spread out diagonally (starfish), drawn in the standing frame before the lie transform"""
    an, af = empty(), empty(); R = lambda x: x + OX
    for arr, x0, dx, cols in ((an, R(2) + TDX, -1, ('7', 'i', 'h')), (af, R(20) + TDX, 1, ('a', 'e', '7'))):
        for k in range(9):
            x = x0 + dx * (k * 2 // 3); y = 25 + k
            for j, c in enumerate(cols):
                arr[y, x + dx * j] = (('O4', 'O1', 'O2')[j] if (long_sleeve and k < 6) else c)
        hx_ = x0 + dx * 6
        for y in range(34, 37):
            for j in range(3): arr[y, hx_ + dx * j] = '7' if (y == 36 or j == 2) else 'i'
    if view == 'ne': an, af = mirror(an), mirror(af)
    return an, af


SIT_NE_LX = 4
SIT_D = 0        # seated: upper body stays at standing height -> hips (crotch, ref row 49) at frame y 80 = live sit hip line; warteg split cut 84 falls just below


def sit_arms(view, long_sleeve=False, mode='lap', t=0):
    """hands resting on the lap: upper arm down at the side, forearm forward onto the thigh, hand on top of the thigh.
    mode 'type': forearms forward and level (on a desk / keyboard), hands tapping alternately."""
    an, af = empty(), empty(); R = lambda x: x + OX
    sl = (lambda j, near: (('O4', 'O1', 'O2') if near else ('O2', 'O3', 'O4'))[j]) if long_sleeve else None
    nx = R(1) + TDX; fx = R(19) + TDX
    if view == 'se' and mode == 'type':
        tn = 1 if t % 2 else 0; tf = 0 if t % 2 else 1
        for y in range(32, 39):
            for j, c in enumerate(('7', 'i', 'h')): an[y, nx + j] = sl(j, True) if sl else c
            for j, c in enumerate(('a', 'e', '7')): af[y, fx + j] = sl(j, False) if sl else c
        for k in range(6):                                         # near forearm: level, forward to the right
            y = 39 + k // 3; x = nx + 1 + k
            for j, c in enumerate(('7', 'i', 'h')): an[y + j - 1, x] = c if not (sl and k < 2) else sl(j, True)
        for y in range(39 - tn, 42 - tn):
            for x in range(nx + 7, nx + 10): an[y, x] = '7' if (y == 41 - tn or x == nx + 9) else 'i'
        for k in range(5):                                         # far forearm: level, forward (left of the far side), in front
            y = 39 + k // 3; x = fx - k
            for j, c in enumerate(('a', 'e', '7')): an[y + j - 1, x] = c if not (sl and k < 2) else sl(j, False)
        for y in range(38 - tf, 41 - tf):
            for x in range(fx - 7, fx - 4): an[y, x] = '7' if (y == 40 - tf or x == fx - 7) else 'e'
        return an, af
    if view == 'se':
        for y in range(32, 40):                                    # upper arms
            for j, c in enumerate(('7', 'i', 'h')): an[y, nx + j] = sl(j, True) if sl else c
            for j, c in enumerate(('a', 'e', '7')): af[y, fx + j] = sl(j, False) if sl else c
        for y in range(40, 45):                                    # near forearm forward/right over the thigh
            o = y - 39
            for j, c in enumerate(('7', 'i', 'h')): an[y, nx + o + j] = (sl(j, True) if (sl and y < 43) else c)
        for y in range(44, 47):                                    # near hand on the lap
            for j in range(4): an[y, nx + 5 + j] = '7' if (y == 46 or j == 0 or j == 3) else 'i'
        an[46, nx + 5] = ''; an[46, nx + 8] = ''
        for y in range(40, 44):                                    # far forearm comes in front of the far thigh
            o = y - 39
            for j, c in enumerate(('a', 'e', '7')): an[y, fx - o + j] = (sl(j, False) if (sl and y < 42) else c)
        for y in range(43, 46):
            for j in range(3): an[y, fx - 5 + j] = '7' if (y == 45 or j == 0) else 'e'
        an[45, fx - 5] = ''
    else:                                                          # back view: forearms forward (hidden), elbows at the sides
        for y in range(32, 41):
            for j, c in enumerate(('7', 'i', 'h')): an[y, nx + j] = (sl(j, True) if sl else c) if y < 40 else '7'
            for j, c in enumerate(('a', 'e', '7')): af[y, fx + j] = (sl(j, False) if sl else c) if y < 40 else '7'
        an = mirror(an); af = mirror(af)
    return an, af


def sit_legs2(p, view):
    """seated on a bench/chair, knees ~90 deg. se: thighs come toward the viewer (short foreshortened blocks), knees, shins straight
    down, feet flat under the knees. ne (back): seat of the trousers, the lower legs drop just below/right of it, heels visible."""
    R = lambda x: x + OX; out = empty(); sh = empty()
    hb = 49
    if view == 'se':
        up = p.copy(); up[47:] = ''; out = merge(out, up)
        far = {(x, y) for y in range(45, 50) for x in range(R(11) + (y - 45), R(22) + (y - 45))} | rect(R(22), 50, R(25), 60)
        near = {(x, y) for y in range(46, 53) for x in range(R(5) + max(0, y - 47), R(17) + (y - 46))} | rect(R(17), 53, R(22), 63)
        a = empty(); paint_box(a, far, '9', '6', '8'); out = merge(out, a)
        a = empty(); paint_box(a, near, 'c', '6', '9')
        for y in range(47, 53):                                      # crease between the two thighs / inner thigh shade
            x = R(5) + max(0, y - 47)
            if a[y, x + 1]: a[y, x + 1] = '9'
        for x in range(R(17), R(23)):
            if (x, 53) in near: a[53, x] = '6'                      # knee crease (thigh over shin)
        for y in range(55, 63):
            if a[y, R(20)] in ('c', '9'): a[y, R(20)] = '9'         # shin fold
        out = merge(out, a)
        S = [rect(R(22), 60, R(27), 63) - {(R(27), 60)}, rect(R(16), 64, R(24), 68) - {(R(16), 64), (R(24), 64), (R(24), 65)}]
    else:
        cx = 22 + SIT_NE_LX; up = p.copy(); up[48:] = ''; out = merge(out, up)
        seat = rect(22 - 6, 46, 22 + 5, 49)
        farl = rect(cx - 4, 51, cx - 1, 59); nearl = rect(cx + 1, 51, cx + 5, 61)
        a = empty(); paint_box(a, farl, '8', '6', '8'); out = merge(out, a)
        a = empty(); paint_box(a, nearl, '9', '6', '8'); out = merge(out, a)
        a = empty(); paint_box(a, seat, '9', '6', '8')
        out = merge(out, a)
        S = [rect(cx - 4, 59, cx, 61), rect(cx + 1, 61, cx + 6, 64) - {(cx + 6, 61)}]
    for Sx in S:
        yb = max(yy for _, yy in Sx)
        for (x, y) in Sx:
            sh[y, x] = '2' if ((x, y - 1) not in Sx and (x - 1, y) in Sx and y < yb - 1) else '0'
    return out, sh


def perch_legs(p, view):
    """perched on a high stool / ledge: thighs only slightly forward, shins hang straight down, toes pointing down"""
    R = lambda x: x + OX; out = empty(); sh = empty()
    if view == 'se':
        up = p.copy(); up[47:] = ''; out = merge(out, up)
        far = {(x, y) for y in range(45, 50) for x in range(R(12) + (y - 45) // 2, R(21) + (y - 45) // 2)} | rect(R(19), 50, R(22), 63)
        near = {(x, y) for y in range(46, 52) for x in range(R(6) + max(0, y - 47) // 2, R(16) + (y - 46) // 2)} | rect(R(13), 52, R(18), 65)
        a = empty(); paint_box(a, far, '9', '6', '8'); out = merge(out, a)
        a = empty(); paint_box(a, near, 'c', '6', '9')
        for x in range(R(13), R(19)):
            if (x, 52) in near: a[52, x] = '6'
        for y in range(54, 65):
            if a[y, R(16)] in ('c', '9'): a[y, R(16)] = '9'
        out = merge(out, a)
        S = [rect(R(19), 63, R(23), 66) - {(R(23), 63)}, rect(R(12), 66, R(19), 69) - {(R(12), 69), (R(19), 66)}]
    else:
        cx = 22 + 1; up = p.copy(); up[48:] = ''; out = merge(out, up)
        seat = rect(22 - 6, 46, 22 + 5, 49)
        farl = rect(cx - 5, 50, cx - 2, 62); nearl = rect(cx + 1, 50, cx + 5, 64)
        a = empty(); paint_box(a, farl, '8', '6', '8'); out = merge(out, a)
        a = empty(); paint_box(a, nearl, '9', '6', '8'); out = merge(out, a)
        a = empty(); paint_box(a, seat, '9', '6', '8'); out = merge(out, a)
        S = [rect(cx - 5, 62, cx - 1, 65), rect(cx + 1, 64, cx + 6, 67)]
    for Sx in S:
        yb = max(yy for _, yy in Sx)
        for (x, y) in Sx:
            sh[y, x] = '2' if ((x, y - 1) not in Sx and (x - 1, y) in Sx and y < yb - 1) else '0'
    return out, sh


HEAD_KEYS = ('hair_front', 'hair_back')


def head_drop(L, dy, dx=0):
    """slump: the head (hair layers, head skin rows 0..19 of the body) drops dy rows (and dx forward)"""
    for k in HEAD_KEYS: L[k] = shift_rows(L[k], 0, CH - 1 - dy, dy, dx)
    L['body'] = shift_rows(L['body'], 0, 19, dy, dx)
    return L


def attach_arm_roots(L):
    """Weld both arm roots to the torso for every 4-way animation frame.

    Near/far arms are independently animated on three-pixel strips. In the
    original drawing x=R(1)+TDX and R(19)+TDX, while the torso begins/ends
    around R(6)+TDX/R(17)+TDX. That leaves 1-2 TRANSPARENT pixels at the
    upper shoulder on some poses, especially right arm on rear views.

    Only bridge the first few rows where an actual arm meets a shirt/outer
    body edge. Do not move the arm or modify hands, animated swing or clothing.
    """
    torso = (L['shirt'] != '') | (L['outer'] != '')
    if not torso.any():
        return L
    for key in ('arm_near', 'arm_far'):
        arm = L[key]
        hits = np.where(np.any(arm[26:48] != '', axis=1))[0]
        if len(hits) == 0:
            continue
        start = int(hits[0]) + 26
        # Shoulder root only: the elbow, hand and pose remain unchanged.
        for y in range(start, min(start + 5, 48, CH)):
            arm_x = np.flatnonzero(arm[y] != '')
            torso_x = np.flatnonzero(torso[y])
            if not len(arm_x) or not len(torso_x):
                continue
            arm_mid = (int(arm_x[0]) + int(arm_x[-1])) / 2
            torso_mid = (int(torso_x[0]) + int(torso_x[-1])) / 2
            if arm_mid < torso_mid:  # arm on the left; extend inward
                x0, x1 = int(arm_x[-1]), int(torso_x[0])
                edge_code = arm[y, x0]
                path = range(x0 + 1, x1)
            else:                    # arm on the right; extend inward
                x0, x1 = int(torso_x[-1]), int(arm_x[0])
                edge_code = arm[y, x1]
                path = range(x0 + 1, x1)
            # A narrower female torso can move inward another 1-2 pixels
            # after the pose is built. Bridge the SHOULDER only, not the
            # forearm or hand, and keep existing joined shapes untouched.
            if 0 < abs(x1 - x0) - 1 <= 5:
                for x in path:
                    if 0 <= x < CW and arm[y, x] == '':
                        arm[y, x] = edge_code
        L[key] = arm
    return L


def pose_layers(base, kind, t, view, C, O):
    L = _pose_layers(base, kind, t, view, C, O)
    if C.get('arms') == 'down':
        bob = (-1 if t in (2, 3) else 0) if kind in ('idle', 'talk') else ((-1 if t in (1, 4) else 0) if kind == 'walk' else 0)
        L['arm_near'], L['arm_far'] = draw_arms(kind if kind != 'lie' else 'idle0', t, view, bob if kind in ('idle', 'walk', 'talk') else 0, C.get('sleeves') == 'long')
    # Apply to both new down-arm poses AND characters that retain legacy
    # arms: they use the same shared shoulder/torso split.
    L = attach_arm_roots(L)
    if kind == 'sleep': L = head_drop(L, 3, 1 if view == 'se' else 0)
    if kind == 'tired': L = head_drop(L, 2, 1 if view == 'se' else 0)
    if kind == 'swim':                                              # only the chest-up part is above the water
        for k in L:
            if k not in ('arm_near', 'arm_far'): L[k][31:] = ''
        for k in ('arm_near', 'arm_far'): L[k][33:] = ''
    if view == 'ne': L = {k: shift_cols(v, NE_DX) for k, v in L.items()}
    return L


def _pose_layers(base, kind, t, view, C, O):
    """base: se (or ne) idle code layers. returns posed copy"""
    L = {k: v.copy() for k, v in base.items()}
    HIP = 49; LEG0, LEG1 = 50, 64; SHOE0 = 65
    upper_keys = [k for k in ORDER if k not in ('shoes', 'shadow')]
    if kind in ('tired', 'swim', 'float', 'lie'): kind = 'idle0'
    if kind == 'talk': kind = 'idle'
    if kind == 'idle0': return L
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
    if kind in ('perch',):
        L['pants'], L['shoes'] = perch_legs(base['pants'], view); L['rips'] = empty(); return L
    if kind in ('sit', 'sit_type', 'sleep'):
        D = SIT_D
        for k in upper_keys:
            if k in ('pants', 'rips'): continue
            L[k] = shift_rows(L[k], 0, HIP, D)
        L['pants'], L['shoes'] = sit_legs2(base['pants'], view)
        L['rips'] = empty()
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
    # v6e: from behind the hair wraps the whole head; only a small 2x2 ear peeks out at the side (no cheek/jaw block)
    ear = {(R(x), y) for x in (3, 4) for y in (14, 15)} & head
    neck = {(R(x), y) for x in range(10, 17) for y in range(17, 23)}
    hair = {(x, y) for (x, y) in head if (x, y) not in ear and y <= 17}
    hair -= {(R(3), 17), (R(3), 16), (R(4), 17)}                   # rounded nape corner
    hair -= {(R(x), 17) for x in (9, 10, 15, 16, 17, 18, 19, 20, 21)}
    if style == 'long':
        hair |= {(x, y) for x in range(R(3), R(25)) for y in range(10, 35)} | {(x, y) for x in range(R(4), R(24)) for y in range(35, 37)}
        hair -= {(x, 36) for x in range(R(4), R(24), 3)}
    if style == 'mid':
        hair |= {(x, y) for x in range(R(3), R(24)) for y in range(10, 22 + MID_LEN)} | {(x, y) for x in range(R(4), R(23)) for y in range(22 + MID_LEN, 24 + MID_LEN)}
        hair -= {(x, 23 + MID_LEN) for x in range(R(4), R(23), 3)}
        ear = set()
    if style == 'wavy':
        for y in range(10, 31):
            w = WAVE[y % 8]
            for x in range(R(2) + w, R(25) + w): hair.add((x, y))
        for x in range(R(3), R(24)):
            if x % 3 != 1: hair.add((x, 31 + (x % 2)))
        ear = set()
    hb = empty()
    for (x, y) in hair:
        c = '3'
        if (x - 1, y) not in hair or (x + 1, y) not in hair or (x, y - 1) not in hair: c = '1'
        if (x, y + 1) not in hair:
            # The back view already has the restored scalp underneath the
            # short hairstyle. A near-black hair-hem stroke across its lower
            # edge reads as an artificial horizontal line below the head.
            # Finish the short nape in the normal hair material instead.
            c = '3' if style == 'short' and y >= 15 else '0'
        hb[y, x] = c
    for (x, y) in [(5, 5), (6, 5), (5, 6), (6, 6), (7, 6), (8, 7), (10, 7), (11, 7), (12, 7), (16, 6), (17, 6), (18, 7), (19, 5), (20, 5), (20, 6), (8, 11), (13, 12), (19, 11), (11, 14), (16, 14)]:
        if hb[y, R(x)] == '3': hb[y, R(x)] = '4'
    for x in (9, 14, 19):
        for y in range(8, 17):
            if hb[y, R(x)] == '3' and y % 4 != 0: hb[y, R(x)] = '1'
    if style in ('mid', 'wavy'):
        for x in range(R(3), R(25), 3):
            for y in range(12, 31):
                xx = x + (WAVE[y % 8] if style == 'wavy' else 0)
                if hb[y, xx] == '3' and (y + x) % 5: hb[y, xx] = '1'
        for (x, y) in ((R(7), 19), (R(12), 22), (R(17), 18), (R(21), 24), (R(9), 27), (R(15), 28)):
            if hb[y, x] == '3': hb[y, x] = '4'
    if style == 'long':
        for (x, y0, y1) in ((5, 14, 31), (8, 18, 35), (11, 15, 28), (13, 22, 35), (16, 16, 32), (19, 19, 35), (22, 14, 30)):
            for y in range(y0, y1):
                if hb[y, R(x)] == '3': hb[y, R(x)] = '1'
        for (x, y) in [(7, 20), (8, 21), (15, 22), (16, 23), (11, 27), (19, 26), (6, 30), (13, 31)]:
            if hb[y, R(x)] == '3': hb[y, R(x)] = '4'
    L['hair_front'] = hb
    # ---- body: rear skull + ear + nape + neck, then arms at the sides.
    # The reference rear hairstyle intentionally ends around y=16/17.
    # Previously only a narrow 7px neck was drawn under it, leaving the
    # *lower back of the head* absent (a flat cut on every short hairstyle).
    # Complete the rounded scalp with skin beneath the existing hairstyle.
    # These are 40x72 source-local coordinates; the four gameplay directions
    # inherit the same silhouette through the native pose/mirror pipeline.
    body = empty()
    for y, left, right in ((17, 5, 22), (18, 6, 21), (19, 7, 20),
                           (20, 8, 19), (21, 9, 18)):
        for x_local in range(left, right + 1):
            x = R(x_local)
            if (x, y) in hair:
                continue                   # keep long/mid/wavy hair intact
            edge = x_local in (left, right)
            body[y, x] = '7' if edge else (
                'e' if y >= 20 else ('h' if x_local >= 15 else 'i'))
    for (x, y) in ear:
        body[y, x] = se['body'][y, x] or 'i'
    for (x, y) in neck:
        if (x, y) in hair:
            continue
        # Preserve the restored rear skull. The previous pair of dark '7'
        # edge columns at x=10/16 cut TWO vertical stripes into the nape
        # below the haircut, even where the neck is inside the head mass.
        if body[y, x]:
            continue
        body[y, x] = 'e' if y >= 21 else ('h' if x >= R(14) else 'i')
    for y in range(22, 45):
        for x in range(CW):
            c = se['body'][y, x]
            if c and x >= R(18): body[y, x] = c                    # far arm at the side
    bf = empty()
    for y in range(30, 40):
        for x in range(CW):
            c = se['body_front'][y, x]
            if c and x <= R(5) and y <= 37: bf[y, x] = c        # near upper arm / elbow only
    if C.get('arms') != 'down':
        for x in (R(2), R(3), R(4)): bf[38, x] = '7'
        bf[37, R(5)] = '7'
    L['body'] = body; L['body_front'] = bf
    # ---- shirt back
    sh = se['shirt'].copy()
    torso = {(x, y) for y in range(22, 39) for x in range(R(6) + (TDX if y >= 24 else 0), R(18) + (TDX if y >= 24 else 0))}
    for (x, y) in torso:
        if not sh[y, x] or se['acc'][y, x] or se['body_front'][y, x] or se['held'][y, x] or se['body'][y, x]:
            sh[y, x] = 'd' if y == 38 else ('j' if x in (R(12), R(13)) and y % 3 else 'k')
    for x in range(R(8), R(18)):
        sh[21, x] = 'd'; sh[22, x] = 'g' if x not in (R(8), R(17)) else 'd'
    for x in range(R(9), R(17)): sh[23, x] = 'k' if sh[23, x] else sh[23, x]
    for y in range(24, 38):
        if sh[y, R(17) + TDX]: sh[y, R(17) + TDX] = 'j'
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
    # ---- shirt colour (tee recoloured, same ramp positions as the reference shirt)
    if st.get('color'):
        shc = L['shirt']; bad = (shc != '') & ~np.isin(shc, list('kjgdb')); shc[bad] = 'j'
        cc = hx(st['color']); pal.update({'C1': mix(cc, (255, 255, 255), 0.10), 'C2': cc, 'C3': tone(cc, 0.90), 'C4': tone(cc, 0.72), 'C5': tone(cc, 0.62)})
        maps['shirt'] = {'k': 'C1', 'j': 'C2', 'g': 'C3', 'd': 'C4', 'b': 'C5'}
    if ou and ou.get('dots'): pal['OD'] = hx(ou['dots'])
    if O.get('mustache_color') or C.get('mustache'): pal['Mu'] = hx(C.get('mustache', '#6B4F3A'))
    if C.get('stubble'): pal['St'] = hx(C['stubble'][0]); pal['St2'] = hx(C['stubble'][1])
    if C.get('arms') == 'down': arms_down(L)
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
        maps['body'] = maps['body_front'] = maps['arm_near'] = maps['arm_far'] = {k: 'K' + k for k in C['skin_map']}
    # ---- hair
    if C['hair_style'] in ('long', 'mid', 'wavy'):
        hm = {k: 'H' + k for k in '01234'}
        for k, v in C['hair_map'].items(): pal['H' + k] = hx(v)
        HF = {'long': long_hair_front, 'mid': mid_hair_front, 'wavy': wavy_hair_front}[C['hair_style']]
        HB = {'long': long_hair_back, 'mid': mid_hair_back, 'wavy': wavy_hair_back}[C['hair_style']]
        L['hair_front'] = HF(L['hair_front']); L['hair_back'] = HB()
        if C.get('fringe') is False: remove_fringe(L)
        if C.get('fringe') == 'curtain': curtain_fringe(L)
        L['hair_front'] = recolor(L['hair_front'], hm); L['hair_back'] = recolor(L['hair_back'], hm); maps['hair_front'] = maps['hair_back'] = hm
        pal['B'] = hx(C['brow'])
    pal['_maps'] = maps
    return L, pal


WAVE = [0, 0, 1, 1, 1, 0, -1, -1]


def remove_fringe(L):
    """no bangs: forehead skin from row 8, hair swept back from a side part (part at ref x 11), temples covered by the side curtains"""
    h, b = L['hair_front'], L['body']; R = lambda x: x + OX
    line = {x: 8 for x in range(11, 20)}            # hairline row per column (forehead top)
    line.update({10: 9, 20: 9, 9: 11, 21: 11})
    for x, y0 in line.items():
        for y in range(y0, 13):
            h[y, R(x)] = ''
            b[y, R(x)] = 'h' if x >= 19 else 'i'
    for x in range(11, 20): h[7, R(x)] = '0' if h[7, R(x)] else h[7, R(x)]       # deep tone along the hairline
    h[8, R(10)] = '0'; h[10, R(9)] = '0'; h[8, R(20)] = '0'; h[10, R(21)] = '0'
    for (x, y) in ((11, 6), (12, 6), (13, 5), (14, 5), (15, 5), (16, 6), (17, 6), (18, 6)):    # swept strands from the part
        if h[y, R(x)] in ('3', '4'): h[y, R(x)] = '1' if (x + y) % 2 else '4'
    return L


def curtain_fringe(L):
    """centre-parted curtain fringe (photo ref): part at ref x 15/16, strands sweep down-out over both sides of the forehead,
    covering the outer brow ends; a V of forehead stays open in the middle. Flyaway strands on top."""
    remove_fringe(L)
    h = L['hair_front']; R = lambda x: x + OX
    near = {8: range(9, 15), 9: range(9, 13), 10: range(9, 12), 11: range(9, 11), 12: range(9, 10)}
    far = {8: range(17, 22), 9: range(19, 22), 10: range(20, 22), 11: range(21, 22)}
    for side in (near, far):
        for y, xs in side.items():
            xs = list(xs)
            for x in xs:
                c = '3'
                if y == max(yy for yy, v in side.items() if x in v): c = '0'          # strand tips
                h[y, R(x)] = c
    for (x, y) in ((13, 8), (11, 9), (10, 10), (18, 8), (19, 9), (20, 10)):        # diagonal sweep highlight
        h[y, R(x)] = '4'
    for (x, y) in ((11, 8), (10, 9), (20, 8), (21, 9)):
        h[y, R(x)] = '1'
    for (x, y) in ((15, 7), (16, 7)): h[y, R(x)] = '1'                          # part
    for (x, y) in ((14, 6), (13, 7), (17, 6), (18, 7)): h[y, R(x)] = '4'
    for (x, y, c) in ((12, 0, '1'), (18, 0, '1'), (19, 1, '3'), (8, 2, '1'), (7, 3, '3'), (21, 2, '1')):   # flyaways
        if not h[y, R(x)]: h[y, R(x)] = c
    return L


def default_brows(e):
    near = {'sad': [(10, 11), (11, 11), (12, 10), (13, 10)], 'angry': [(10, 10), (11, 10), (12, 11), (13, 11)], 'surprised': [(10, 10), (11, 10), (12, 10), (13, 10)]}
    far = {'sad': [(19, 10), (20, 11), (21, 11)], 'angry': [(19, 11), (20, 10), (21, 10)], 'surprised': [(19, 10), (20, 10), (21, 10)]}
    return [(x, y, 'B') for (x, y) in near.get(e, [(10, 11), (11, 11), (12, 11), (13, 11)]) + far.get(e, [(19, 11), (20, 11), (21, 11)])]


def arms_down(L):
    """remove the reference's crossed forearms / hands / cup; torso and trousers filled where they were covered"""
    R = lambda x: x + OX
    L['body_front'] = empty(); L['held'] = empty()
    b = L['body']
    for y in range(31, CH):
        for x in range(R(16), CW):
            if b[y, x]: b[y, x] = ''
    sh = L['shirt']
    for y in range(23, 31):          # V-neck / tie gaps -> closed tee front
        xs = [x for x in range(CW) if sh[y, x]]
        for x in range(min(xs), max(xs) + 1):
            if not sh[y, x]: sh[y, x] = 'k'
            if b[y, x]: b[y, x] = ''
    for y in range(31, 40):
        for x in range(R(4), R(19)):
            if not sh[y, x] or y == 39:
                sh[y, x] = 'd' if (x in (R(4), R(18)) or y == 39) else ('j' if x >= R(15) else ('g' if (x - y) % 7 == 0 else 'k'))
    for y in range(31, 40):        # near upper arm/sleeve hem below row 31 is the arm layer now
        for x in range(R(0), R(4)): sh[y, x] = ''
    for x in range(R(1), R(5)): sh[31, x] = 'd'
    for y in range(31, 34):
        for x in range(R(19), R(22)): sh[y, x] = ''
    ou = L['outer']
    for y in range(31, 40):
        for x in range(CW):
            if ou[y, x] and not sh[y, x]: ou[y, x] = ''
    p = L['pants']
    for y in range(39, 44):
        for x in range(R(6), R(21)):
            if p[44, x]: p[y, x] = p[44, x] if y > 39 else ('6' if p[44, x] else '')
    if L['outer'].any():
        for y in range(31, 40):
            for x in range(R(4), R(19)):
                if sh[y, x] and not (R(10) <= x <= R(15) and y >= 24):
                    ou[y, x] = 'O4' if (x in (R(4), R(18)) or y == 39 or x in (R(9), R(16))) else ('O2' if x >= R(15) else 'O1')
    # ALIGN: the reference torso sits 2.5 blocks left of the head/hips (balanced there by the crossed arms + cup).
    # With the arms down it reads as a sideways shift -> torso rows 24..39 move right by TDX so neck, chest, hips and feet share one centre.
    for k, edge in (('shirt', 'd'), ('outer', 'O4'), ('shirt_graphic', None), ('acc', None)):
        a = L[k]
        if not a.any(): continue
        a[24:40] = shift_cols(a[24:40], TDX)
        if edge and a[23].any() and a[24].any():
            r23 = [x for x in range(CW) if a[23, x]]; r24 = [x for x in range(CW) if a[24, x]]
            for x in range(max(max(r23) + 1, max(r24) - TDX), max(r24)): a[23, x] = edge   # close the right shoulder step only
    return L


TDX = 2
NE_DX = -5      # back views: the mirrored canvas puts the figure 5 px right of the pivot; re-centre on the feet


def shift_cols(a, dx):
    o = np.full(a.shape, '', a.dtype)
    if dx > 0: o[:, dx:] = a[:, :-dx]
    elif dx < 0: o[:, :dx] = a[:, -dx:]
    else: o[:] = a
    return o


def add_dots(o, codes=('O1', 'O2', 'O3')):
    """white print dots on the cardigan (1 block, staggered 3x3 grid, never on the edge tone)"""
    o = o.copy()
    for y in range(CH):
        for x in range(CW):
            if o[y, x] in codes and y % 3 == 1 and (x + (y // 3) % 2 * 2) % 4 == 0: o[y, x] = 'OD'
    return o


def curtain(h, S, strands=(), lights=()):
    for (x, y) in S:
        c = '3'
        if (x - 1, y) not in S or (x + 1, y) not in S: c = '1'
        if (x, y + 1) not in S: c = '0'
        if 0 <= y < CH and 0 <= x < CW: h[y, x] = c
    for (x, y0, y1) in strands:
        for y in range(y0, y1):
            if h[y, x] == '3': h[y, x] = '1'
    for (x, y) in lights:
        if h[y, x] in ('3', '1'): h[y, x] = '4'
    return h


MID_LEN = 3    # +3 rows: side hair falls to the jaw/shoulder line (photo ref, "half-shoulder")


def mid_hair_front(h):
    """Ichsan: mid-length (half way to the shoulders), covers the ears, ragged tips at the jaw/neck"""
    h = h.copy(); R = lambda x: x + OX
    L = MID_LEN
    near = rect(R(3), 11, R(8), 20 + L) | rect(R(4), 21 + L, R(8), 22 + L) - {(R(5), 22 + L), (R(8), 22 + L), (R(6), 22 + L)}
    near -= rect(R(7), 11, R(8), 12)
    far = rect(R(21), 11, R(24), 19 + L) | rect(R(22), 20 + L, R(24), 21 + L) - {(R(23), 21 + L)}
    curtain(h, near, ((R(5), 14, 21 + L), (R(7), 16, 22 + L)), ((R(4), 13), (R(5), 13), (R(6), 17), (R(4), 23)))
    curtain(h, far, ((R(23), 14, 20 + L),), ((R(22), 12), (R(23), 13), (R(22), 22)))
    for (x, y) in ((R(9), 12), (R(9), 13), (R(20), 12), (R(20), 13)): h[y, x] = '1'
    return h


def mid_hair_back():
    a = empty(); R = lambda x: x + OX
    e = 22 + MID_LEN
    S = rect(R(3), 12, R(24), e) - {(x, e) for x in range(R(3), R(24), 3)} - {(R(3), e - 1), (R(24), e - 1)}
    return curtain(a, S, ((R(6), 15, e), (R(12), 18, e), (R(19), 15, e)))


def wavy_hair_front(h):
    """Noor: black, wavy, just past the shoulders: side curtains follow a period-8 wave, strands follow it too"""
    h = h.copy(); R = lambda x: x + OX
    near, far = set(), set()
    for y in range(11, 31):
        w = WAVE[y % 8]
        x0, x1 = R(2) + w, R(8) + (w if y > 14 else 0)
        if y >= 27: x0 += 1
        for x in range(x0, x1 + 1): near.add((x, y))
        if y <= 28:
            f0, f1 = R(21) + (w if y > 14 else 0), R(25) + w
            if y >= 25: f1 -= 1
            for x in range(f0, f1 + 1): far.add((x, y))
    near -= rect(R(7), 11, R(9), 12)
    for x in range(R(3), R(8)):
        if x % 2: near.add((x + WAVE[31 % 8], 31))
    st_n = [(R(4) + WAVE[y % 8], y, y + 1) for y in range(14, 30)] + [(R(6) + WAVE[y % 8], y, y + 1) for y in range(17, 31) if y % 3]
    st_f = [(R(23) + WAVE[y % 8], y, y + 1) for y in range(15, 28)]
    curtain(h, near, st_n, [(R(3) + WAVE[y % 8], y) for y in (12, 13, 20, 21)] + [(R(5) + WAVE[y % 8], y) for y in (16, 24, 25)])
    curtain(h, far, st_f, [(R(22) + WAVE[y % 8], y) for y in (12, 13, 20)] + [(R(24) + WAVE[y % 8], y) for y in (17, 25)])
    for (x, y) in ((R(9), 12), (R(9), 13), (R(20), 12), (R(20), 13)): h[y, x] = '1'
    return h


def wavy_hair_back():
    a = empty(); R = lambda x: x + OX
    S = set()
    for y in range(12, 31):
        w = WAVE[y % 8]
        for x in range(R(2) + w, R(25) + w + 1): S.add((x, y))
    for x in range(R(3), R(24)):
        if x % 3 != 1: S.add((x, 31))
    return curtain(a, S, [(R(8) + WAVE[y % 8], y, y + 1) for y in range(16, 31)] + [(R(14) + WAVE[y % 8], y, y + 1) for y in range(14, 30)] + [(R(19) + WAVE[y % 8], y, y + 1) for y in range(18, 31)])


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


def face_layer(expr, C, view, sitD=0, bob=0, glasses=False, dx=0):
    F = empty(); B = empty(); G = empty()
    if view == 'ne': return F, B, G
    fc, bc = face_codes(expr, C)
    if C.get('fringe') is False: bc = default_brows(expr)
    if C.get('fringe') == 'curtain': bc = [p for p in default_brows(expr) if p[0] in (11, 12, 13, 19, 20)]   # outer brow ends under the curtain fringe
    if C.get('stubble'):
        st = [(13, 21), (14, 21), (18, 21), (19, 21), (14, 22), (18, 22), (10, 20), (11, 21), (21, 20), (20, 21)]
        core = [(15, 21), (16, 21), (17, 21), (15, 22), (16, 22), (17, 22), (16, 20)]
        fc = list(fc) + [(x, y, 'St') for (x, y) in st] + [(x, y, 'St2') for (x, y) in core]
    if C.get('mustache') and expr not in ('surprised',):
        fc = [p for p in fc if not (p[1] == 18 and p[0] in (14, 15, 17, 18))] + [(14, 18, 'Mu'), (15, 18, 'Mu'), (17, 18, 'Mu'), (18, 18, 'Mu')]
        if C.get('stubble'): fc += [(13, 19, 'Mu'), (19, 19, 'Mu')]          # thin mustache drooping at the corners
    elif C.get('mustache'):
        fc = list(fc) + [(14, 18, 'Mu'), (18, 18, 'Mu')]
    for (x, y, c) in fc: F[y + sitD + bob, x + OX + dx] = c
    for (x, y, c) in bc: B[y + sitD + bob, x + OX + dx] = c
    if glasses:
        for (x, y, c) in glasses_codes(C.get('glasses_shape')): G[y + sitD + bob, x + OX + dx] = c
    return F, B, G


GAME = os.environ.get('V6B_GAME') == '1'
VARS = ['blink', 'embarrassed', 'sleepy', 'smile', 'happy', 'sad', 'angry', 'surprised']
VNAME = {'blink': 'blink', 'embarrassed': 'emb', 'sleepy': 'sleepy', 'smile': 'smile', 'happy': 'happy', 'sad': 'sad', 'angry': 'angry', 'surprised': 'surpr'}
KIND = {'walk': 'walk', 'idle': 'idle', 'talk': 'talk', 'sit': 'sit', 'sit_type': 'sit_type', 'sleep': 'sleep', 'tired': 'tired', 'swim': 'swim', 'float': 'float', 'lie': 'lie', 'perch': 'perch'}
SEATED = ('sit', 'sit_type', 'sleep', 'perch')
HEADD = {'sleep': (3, 1), 'tired': (2, 1)}
CLOSED = ('sleep', 'lie')      # these rows keep closed eyes in every face variant



def lie_frame(imgs, view, f, upper_only=False):
    """reclining on a bed/lounger, built from the seated frame: upper body leans back (moved down-left), the legs are redrawn
    stretched out along the iso axis (se: towards screen right-down, ne: right-up), same trouser/shoe ramps, one pixel grid"""
    CUT = FY + 49 + 1               # hip line (frame y) of the standing pose the lie is built from
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
    hipx, hipy = 32 + dx + 3, CUT + dy - 1          # hip (frame), after the lean
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


DROP_SE = [58, 62, 66, 70, 74, 83, 85, 87, 89, 91, 93, 95, 97]   # frame rows dropped (torso/legs) so the lying body fits the 64 px frame
LIE_C = {'lie': 86, 'float': 64}                         # frame y of the body centre (lie: bed/floor, float: water surface)


def lie_flat(imgs, view, anim):
    """lying FLAT (on the back) along the iso axis, built from the standing frame: drop a few torso/leg rows, rotate 90 deg
    (head to the left), shear by 1/2 (se: feet go down-right, ne: feet go up-right). Pixel-exact (no resampling)."""
    keep = [y for y in range(30, 102) if y not in DROP_SE]
    n = len(keep); x0 = (FW - n) // 2; imid = n // 2
    cy = LIE_C[anim]; sg = 1 if view == 'se' else -1
    out = {}
    for k, im in imgs.items():
        a = np.array(im); o = np.zeros_like(a)
        if k == 'shadow': out[k] = o; continue
        for i, y in enumerate(keep):             # column of the lying figure = row of the standing one
            X = x0 + i; sh = int(np.floor((i - imid) * sg / 2))
            for x in range(FW):
                if a[y, x, 3] == 0: continue
                Y = cy + sh - (x - 32)
                if 0 <= Y < FH: o[Y, X] = a[y, x]
        out[k] = o
    # soft shadow under the whole body
    m = np.zeros((FH, FW), bool)
    for k, v in out.items(): m |= v[..., 3] > 0
    shd = np.zeros((FH, FW, 4), np.uint8); mm = np.zeros_like(m); mm[2:] = m[:-2]; mm[:, 1:] |= m[:, :-1]
    shd[mm & ~m] = (0, 0, 0, 46)
    if anim == 'lie': out['shadow'] = shd
    return {k: Image.fromarray(v, 'RGBA') for k, v in out.items()}


ZG = ['111', '..1', '.1.', '1..', '111']



def lie_head_shift(imgs, view='se'):
    """Attach the unscaled original head to the TRANSFORMED neck/shoulder.

    Do not position the head against a fixed screen coordinate: the collar
    changes position with the V6B perspective and each character's build.
    Pick the head's bottom-centre and a real source neckline pixel that
    survives lie_flat, then project the latter through that SAME body map.
    One integer translation must also be used for eyes, hair and headwear.
    """
    head = None
    for key in ('body', 'figure', 'hair_front', 'hair_back', 'face'):
        if key not in imgs:
            continue
        rgba = np.asarray(imgs[key].convert('RGBA'))
        if np.any(rgba[:56, :, 3]):
            head = rgba
            break
    if head is None:
        return (0, 0)

    ys, xs = np.nonzero(head[:56, :, 3] > 0)
    if not len(xs):
        return (0, 0)
    # The last few opaque skull/neck rows contain the connection to the body.
    # Never use the entire head bbox: its top-left corner is not a joint.
    neck_y = int(ys.max())
    neck_band = xs[ys >= max(43, neck_y - 2)]
    neck_x = int(round(float(np.median(neck_band)))) if len(neck_band) else 32

    keep = [y for y in range(30, 102) if y not in DROP_SE]
    imid = len(keep) // 2
    x0 = (FW - len(keep)) // 2
    # Prefer real neck skin. Fall back to an actual shirt or shoulder pixel
    # if a costume masks the neck completely.
    choices = []
    for priority, key in enumerate(('body', 'figure', 'shirt', 'outer',
                                    'arm_far', 'arm_near')):
        if key not in imgs:
            continue
        arr = np.asarray(imgs[key].convert('RGBA'))
        for source_y in keep:
            if source_y < 56:
                continue
            if source_y > 67:
                break
            cols = np.flatnonzero(arr[source_y, :, 3] > 0)
            if not len(cols):
                continue
            source_x = int(cols[np.argmin(np.abs(cols - neck_x))])
            distance = abs(source_x - neck_x)
            # The nearest intact neckline should win, not an arm, skirt or
            # a shirt hem that happens to be closer to the character origin.
            score = ((source_y - 56) + max(0, distance - 7) * 4
                     + (0 if priority < 2 else 2), distance, priority)
            choices.append((score, source_x, source_y))
    if choices:
        _, source_x, source_y = min(choices)
    else:
        source_x, source_y = neck_x, 56

    index = keep.index(source_y)
    perspective = 1 if view in ('se', 'sw') else -1
    shoulder_x = x0 + index
    shoulder_y = (LIE_C['lie']
                  + int(np.floor((index - imid) * perspective / 2))
                  - (source_x - 32))
    # The original head-neck pixel now lands ON the transformed shoulder.
    # A one-pixel overlap eliminates the detached ball-head silhouette.
    return (int(shoulder_x - neck_x), int(shoulder_y - neck_y))

def lie_preserve_head(imgs, view, shift=None):
    """Isometric bed sleep: lie body, but preserve the HEAD at native 1:1 pixels.

    The old lie_flat rotates the entire upright character into the ground plane,
    flattening the skull, eye and hair silhouette. Split only head materials,
    transform the rest of the body into the existing horizontal bed pose, then
    move (NEVER rotate/shear/scale) the native head onto the pillow end.
    Keeping the same transform for face/brows/glasses preserves expression
    alignment across all four camera views and costume variants.
    """
    head_materials = {
        'body', 'hair_back', 'hair_front', 'face', 'brows', 'acc_head',
        'figure', 'f', 'b', 'g', 'glasses',
    }
    separated, preserved = {}, {}
    for key, image in imgs.items():
        source = np.array(image.convert('RGBA'), copy=True)
        # Trailing long hair may drape slightly onto the pillow, but keep
        # the torso and legs in the horizontal projection.
        cut = 65 if key == 'hair_back' else 56
        if key in head_materials:
            head = source.copy()
            head[cut:] = 0
            source[:cut] = 0
            preserved[key] = head
        separated[key] = Image.fromarray(source, 'RGBA')

    reclined = lie_flat(separated, view, 'lie')
    opaque_heads = [image[..., 3] > 0 for image in preserved.values()]
    if opaque_heads and np.any(np.logical_or.reduce(opaque_heads)):
        # Face and hair must share the EXACT body offset, not independent
        # bounding-box offsets that move the eyes to the corner of the head.
        dx, dy = shift if shift is not None else lie_head_shift(imgs, view)
        for key, image in preserved.items():
            if not np.any(image[..., 3]):
                continue
            moved = Image.new('RGBA', (FW, FH))
            moved.paste(Image.fromarray(image, 'RGBA'), (dx, dy))
            if key in reclined:
                merged = reclined[key].copy()
                merged.alpha_composite(moved)
                reclined[key] = merged
            else:
                reclined[key] = moved

    # Recompute a thin ground contact beneath both the original head and the
    # transformed body. Never put a blurred shadow over face/head pixels.
    material = np.zeros((FH, FW), bool)
    for key, image in reclined.items():
        if key in ('shadow', 'fx'):
            continue
        material |= np.asarray(image.convert('RGBA'))[..., 3] > 0
    under = np.zeros_like(material)
    under[2:] = material[:-2]
    under[:, 1:] |= material[:, :-1]
    shade = np.zeros((FH, FW, 4), dtype=np.uint8)
    shade[under & ~material] = (0, 0, 0, 46)
    reclined['shadow'] = Image.fromarray(shade, 'RGBA')
    return reclined


def zzz_img(anim, f, view, mir=False):
    """little 'z z' rising above the head (sleep / tired / lie), white with a dark outline; mir: mirrored row (position mirrored,
    letters not)"""
    o = np.zeros((FH, FW, 4), np.uint8)
    if anim == 'lie': base = [(10, 63), (5, 56)]
    else: base = [(42, 30), (47, 24)]
    if mir: base = [(FW - 3 - x, y) for (x, y) in base]
    ph = f % 4
    for n, (x0, y0) in enumerate(base):
        pass   # tired shows the same 'z Z' as sleep (Oct 31: user asked for zZ on the tired pose)
        y0 -= ph if n == 0 else (ph + 2) % 4
        for j, row in enumerate(ZG):
            for i, c in enumerate(row):
                if c == '1':
                    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1), (0, 0)):
                            X, Y = x0 + i + dx, y0 + j + dy
                            if 0 <= X < FW and 0 <= Y < FH and o[Y, X, 3] == 0: o[Y, X] = (40, 46, 60, 255)
        for j, row in enumerate(ZG):
            for i, c in enumerate(row):
                if c == '1' and 0 <= x0 + i < FW and 0 <= y0 + j < FH: o[y0 + j, x0 + i] = (236, 240, 246, 255)
    return o


def water_img(anim, f, front):
    """water ring around the swimmer / floater (front half or back half)"""
    o = np.zeros((FH, FW, 4), np.uint8)
    cx, cy, rx, ry = (32, 62, 15, 3) if anim == 'swim' else (32, 70, 28, 7)
    rx += f % 2
    for t in range(0, 360, 2):
        a = np.radians(t); x = int(round(cx + rx * np.cos(a))); y = int(round(cy + ry * np.sin(a)))
        if (y >= cy) == front and 0 <= x < FW and 0 <= y < FH: o[y, x] = (176, 226, 240, 220)
    return o


def build(cfg_path, outfit=None, glasses=None):
    C = json.load(open(cfg_path)); name = C['name']; outfit = outfit or C['default_outfit']; O = C['outfits'][outfit]
    gl = C.get('glasses_default', False) if glasses is None else glasses
    OUT = os.path.join(ROOT, 'live'); od = os.path.join(OUT, 'parts', name); os.makedirs(od + '/faces', exist_ok=True)
    se, pal = build_char_layers(C, O)
    # the face features on the body skin are blanked so expressions swap cleanly
    ne = back_layers(se, C, O)
    blank = lambda: Image.new('RGBA', (FW * COLS, FH * ROWS))
    layers = {k: blank() for k in ORDER}; EX = {e: (blank(), blank()) for e in EXPRS}; VS = {e: blank() for e in VARS}
    shadow = np.zeros((FH, FW, 4), np.uint8)
    yy, xx = np.mgrid[0:FH, 0:FW]
    for anim, r0 in ROWMAP.items():
        kind = KIND[anim]
        nf = 6 if anim in ('walk', 'swim') else 4
        for di, d in enumerate(DIRS):
            view = 'se' if d in ('se', 'sw') else 'ne'; mir = d in ('sw', 'nw')
            for f in range(nf):
                base = se if view == 'se' else ne
                P = pose_layers(base, kind, f, view, C, O)
                for mk, mp in pal['_maps'].items(): P[mk] = recolor(P[mk], mp)
                if (O.get('outer') or {}).get('dots'): P['outer'] = add_dots(P['outer'])
                if (O.get('outer') or {}).get('dots'): P['shirt'] = add_dots(P['shirt'], ('C1', 'C2', 'C3')); P['arm_near'] = add_dots(P['arm_near']); P['arm_far'] = add_dots(P['arm_far'])
                if kind == 'sit' and view == 'ne': pass
                pos = (f * FW, (r0 + di) * FH)
                rg = {k: to_img(v, pal) for k, v in P.items() if k not in ('face', 'brows', 'acc_head')}
                imgs = frame_img(rg)
                sh = np.zeros((FH, FW, 4), np.uint8); cx = 32 + (1 if kind in SEATED else 0)
                if kind not in ('swim', 'float'): sh[((xx + .5 - cx) / 11) ** 2 + ((yy + .5 - 100.5) / 2.4) ** 2 <= 1] = (0, 0, 0, 56)
                imgs['shadow'] = Image.fromarray(sh, 'RGBA')
                head_shift = lie_head_shift(imgs, view) if anim == 'lie' else None
                if anim == 'lie': imgs = lie_preserve_head(imgs, view, head_shift)
                elif anim == 'float': imgs = lie_flat(imgs, view, anim)
                fxa = np.zeros((FH, FW, 4), np.uint8)
                if anim in ('swim', 'float'):
                    imgs['shadow'] = Image.fromarray(water_img(anim, f, False), 'RGBA'); fxa = water_img(anim, f, True)
                imgs['fx'] = Image.fromarray(fxa, 'RGBA')
                fl = (lambda im: im.transpose(Image.FLIP_LEFT_RIGHT)) if mir else (lambda im: im)
                if anim in ('sleep', 'tired', 'lie'):          # z z: pre-flipped so the letters read correctly after the row flip
                    zi = Image.fromarray(zzz_img(anim, f, view, mir), 'RGBA')
                    imgs['fx'] = Image.alpha_composite(imgs['fx'], fl(zi))
                for k, im in imgs.items(): layers[k].paste(fl(im), pos)
                sitD = SIT_D if kind in SEATED else 0
                hd, hdx = HEADD.get(anim, (0, 0))
                bob = (-1 if f in (2, 3) else 0) if kind in ('idle', 'talk') else ((-1 if f in (1, 4) else 0) if kind == 'walk' else 0)
                bob += hd
                def faceimgs(e):
                    F, B, G = face_layer(e, C, view, sitD, bob, gl, hdx if view == 'se' else 0)
                    fi = frame_img({'f': to_img(F, pal), 'b': to_img(B, pal), 'g': to_img(G, pal)})
                    if anim == 'lie': fi = lie_preserve_head(fi, view, head_shift)
                    elif anim == 'float': fi = lie_flat(fi, view, anim)
                    return fl(fi['f']), fl(fi['b']), fl(fi['g'])
                for e in EXPRS:
                    a, b, _ = faceimgs(e); EX[e][0].paste(a, pos); EX[e][1].paste(b, pos)
                seq = BAKE.get(anim, ['neutral']); ex = seq[f % len(seq)]
                if anim == 'idle' and f == 3 and not GAME: ex = 'blink'
                a, b, g = faceimgs(ex); layers['face'].paste(a, pos); layers['brows'].paste(b, pos); layers['acc_head'].paste(g, pos)
                if GAME:   # runtime face variants: same frame, other expression; sleep/lie keep closed eyes
                    for ve in VARS:
                        e2 = 'blink' if anim in CLOSED else ve
                        a2, b2, g2 = faceimgs(e2); fr2 = Image.new('RGBA', (FW, FH))
                        for k in ORDER:
                            if k == 'face': fr2.alpha_composite(a2)
                            elif k == 'brows': fr2.alpha_composite(b2)
                            elif k == 'acc_head': fr2.alpha_composite(g2)
                            elif k in imgs: fr2.alpha_composite(fl(imgs[k]))
                        VS[ve].paste(fr2, pos)
    opt = {'hair_back': C['hair_style'], 'hair_front': C['hair_style'], 'body': 'base', 'body_front': 'arms_' + ((O.get('held') or {}).get('type') or 'empty'),
           'shirt': O['shirt']['id'], 'shirt_graphic': O['shirt']['id'], 'outer': (O.get('outer') or {}).get('id', 'none'), 'acc': (O.get('acc') or {}).get('id', 'none'),
           'pants': O['pants']['id'], 'rips': O['pants']['id'], 'shoes': O['shoes']['id'], 'held': (O.get('held') or {}).get('id', 'none'),
           'acc_head': 'glasses' if gl else 'none', 'face': 'baked', 'brows': 'baked', 'shadow': 'base', 'arm_near': 'down_swing', 'arm_far': 'down_swing', 'fx': 'zzz_water'}
    man_p = os.path.join(od, 'manifest.json'); man = json.load(open(man_p)) if os.path.exists(man_p) else {'sheets': {}, 'modules': {}}
    sheet = Image.new('RGBA', (FW * COLS, FH * ROWS)); used = {}
    for k in ORDER:
        os.makedirs(f'{od}/{k}', exist_ok=True); fn = f'{od}/{k}/{opt[k]}.png'; layers[k].save(fn); used[k] = f'{k}/{opt[k]}.png'
        man['modules'][k] = sorted(set(man['modules'].get(k, []) + [opt[k]])); sheet.alpha_composite(layers[k])
    for e, (fa, br) in EX.items(): fa.save(f'{od}/faces/face_{e}.png'); br.save(f'{od}/faces/brows_{e}.png')
    tag = outfit + ('_glasses' if gl else '')
    sn = f'{name}_v6b_sheet.png' if (outfit == C['default_outfit'] and gl == C.get('glasses_default', False)) else f'{name}_v6b_{tag}_sheet.png'
    if GAME:   # game build: sheet + face-diff overlays into live/game/ (only pixels that differ from the base sheet)
        gd = os.path.join(OUT, 'game'); os.makedirs(gd, exist_ok=True); sheet.save(os.path.join(gd, sn)); A = np.array(sheet)
        for ve, im in VS.items():
            V = np.array(im); d = np.any(V != A, axis=2); O2 = np.zeros_like(V); O2[d] = V[d]; O2[d & (V[..., 3] == 0)] = 0
            Image.fromarray(O2, 'RGBA').save(os.path.join(gd, sn.replace('_sheet.png', '_f' + VNAME[ve] + '.png')), optimize=True)
        print('game', sn); return
    sheet.save(os.path.join(OUT, sn)); man['sheets'][tag] = {'sheet': sn, 'layers': used}
    man.update({'name': name, 'frame': [FW, FH], 'pivot': [32, 100], 'pixel_grid': '1 reference block = 1 sheet px', 'rows': ROWMAP, 'dirs': DIRS,
                'layer_order': ORDER, 'expressions': EXPRS, 'baked': {'idle': 'neutral, col 3 blink', **BAKE, 'other': 'neutral'}})
    json.dump(man, open(man_p, 'w'), indent=1); print('built', sn)


if __name__ == '__main__':
    a = sys.argv[1:]; cfg = a[0]; outfit = a[1] if len(a) > 1 and not a[1].startswith('--') else None
    g = True if '--glasses' in a else (False if '--noglasses' in a else None)
    build(cfg, outfit, g)
