#!/usr/bin/env python3
"""Virtual Life - NPC 'Babeh loak' x3 (flea-market traders, Betawi 'babeh' style), v6b. PREVIEW ONLY, not integrated / not deployed.
Body, head, face (glasses, mustache, stubble), hair, idle / walk / sit rows = the game's v6b generator (babeh_base.render_b = the
job_common.render path of Pak Ogah / Manusia Silver + the generator's own facial / glasses / skirt options, as npc_v6b.build).
Added here: belly, hats (peci / flat cap / cowboy hat), koko / polo / plaid details, sarung check, sandals, towel, stools,
v2-style work-pose arms (limb(): shoulder cap + sleeve + upper arm + forearm shaded across, simple hands; from Manusia Silver v2),
props (money, calculator, bag, radio) and the etalase counter. sw / nw = mirrors (as the game)."""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from babeh_base import *
OUT = os.path.dirname(os.path.abspath(__file__))
VIEWS = ('se', 'sw', 'ne', 'nw')

# ---------------------------------------------------------------- limbs (Manusia Silver v2 limb(), with a short sleeve)
def seg_shade(P, Q, r, t):
    m = tube([P, Q], r); a = E(); pad = np.pad(m, 1)
    dx, dy_ = Q[0] - P[0], Q[1] - P[1]; L_ = math.hypot(dx, dy_) or 1; ux, uy = dx / L_, dy_ / L_
    nx, ny = -uy, ux
    if nx > 0 or (abs(nx) < 1e-6 and ny > 0): nx, ny = -nx, -ny
    for y, x in zip(*np.nonzero(m)):
        px, py = x + .5 - P[0], y + .5 - P[1]; tt = max(0, min(L_, px * ux + py * uy))
        sd = ((px - ux * tt) * nx + (py - uy * tt) * ny) / r
        edge = not (pad[y, x + 1] and pad[y + 2, x + 1] and pad[y + 1, x] and pad[y + 1, x + 2])
        c = (t[3] if sd > 0 else t[4]) if edge else (t[0] if sd > .3 else t[1] if sd > -.35 else t[2])
        a[y, x, :3] = c; a[y, x, 3] = 255
    return a

def over(*ls):
    o = Image.new('RGBA', (FW, FH))
    for l in ls:
        if l is not None: o.alpha_composite(Image.fromarray(l))
    return np.array(o)

def limb(S, Eb, W, hk, hp, hd, pal, n):
    """S shoulder, Eb elbow, W wrist; hk fist/open/point; hp hand centre; hd finger direction"""
    K = skin_ramp(pal); C = shirt_ramp(pal)
    LT = (K[0], K[1], K[2], K[3], K[4]); CT = (C[0], C[1], C[2], C[3], C[4])
    M = (S[0] + (Eb[0] - S[0]) * .55, S[1] + (Eb[1] - S[1]) * .55)
    skin = over(seg_shade(M, Eb, 1.75, LT), seg_shade(Eb, W, 1.6, LT))
    sl = over(shade(disk(S[0], S[1] + .3, 2.5), CT), seg_shade(S, M, 2.2, CT))
    # sleeve hem: px of the sleeve near M -> dark line (koko / polo) or light rolled cuff (plaid)
    ux, uy = Eb[0] - S[0], Eb[1] - S[1]; ln = math.hypot(ux, uy) or 1; ux, uy = ux / ln, uy / ln
    for y, x in zip(*np.nonzero(sl[..., 3])):
        d = (x + .5 - M[0]) * ux + (y + .5 - M[1]) * uy
        if n['top_style'] == 'plaid':
            if -1.6 < d <= 0: sl[y, x, :3] = C[0] if d > -.8 else C[1]
            elif -2.6 < d <= -1.6: sl[y, x, :3] = C[4]
        elif -1 < d <= 0: sl[y, x, :3] = C[3]
    hx_, hy_ = hp; dx, dy_ = hd; nn = math.hypot(dx, dy_) or 1; dx, dy_ = dx / nn, dy_ / nn
    h = shade(disk(hx_, hy_, 1.7), (K[0], K[0], K[1], K[2], K[4]), bias=-.05)
    if hk == 'open': h = over(seg_shade((hx_, hy_), (hx_ + dx * 2.5, hy_ + dy_ * 2.5), 1.2, LT), h)
    a = over(skin, sl, h)
    if hk == 'point':
        for k in (2, 3, 4): put(a, int(hx_ + dx * k), int(hy_ + dy_ * k), K[1] if k < 4 else K[2])
    if hk == 'fist': put(a, int(hx_ + .5), int(hy_ + .8), K[3])
    put(a, int(Eb[0]), int(Eb[1]), K[3])
    return a

# ---------------------------------------------------------------- props (all existing palette colours)
def bills(a, x, y, ramp=MONEY, w=4, n=1):
    for k in range(n):
        for i in range(w):
            put(a, x + i + k, y - k, ramp[0] if k == n - 1 and i < w - 1 else ramp[1]); put(a, x + i + k, y + 1 - k, ramp[2] if i == w - 1 else ramp[1])
def calculator(a, x, y, lit=0):
    for j in range(6):
        for i in range(5): put(a, x + i, y + j, CALC[1] if i < 4 else CALC[2])
    for i in range(1, 4): put(a, x + i, y + 1, CALC[3] if not (lit and i == 3) else CALC[4])
    for (i, j) in ((1, 3), (3, 3), (1, 4), (3, 4)): put(a, x + i, y + j, CALC[0])
    put(a, x + 2, y + 3, CALC[4] if lit else CALC[0])
def bag(a, x, y):
    """hand at (x, y): handle loop + leather body below (7 x 6), flap, brass clasp"""
    for (i, j) in ((-1, 1), (1, 1), (-2, 2), (2, 2)): put(a, x + i, y + j, BAG[3])
    for j in range(3, 9):
        for i in range(-3, 4):
            c = BAG[0] if i < -1 else BAG[1] if i < 2 else BAG[2]
            if j == 8 or i == 3: c = BAG[3]
            put(a, x + i, y + j, c)
    for i in range(-3, 4): put(a, x + i, y + 5, BAG[2] if i < 2 else BAG[3])
    put(a, x, y + 5, BRASS[0]); put(a, x, y + 6, BRASS[1])
def radio(a, x, y):
    """small old transistor radio (wood + grey grill) 7 x 5"""
    for j in range(5):
        for i in range(7):
            put(a, x + i, y + j, WOOD[1] if i < 3 else WOOD[2] if i < 6 else WOOD[4])
    for (i, j) in ((1, 1), (2, 2), (1, 3), (3, 1), (3, 3), (2, 1), (2, 3)): put(a, x + i, y + j, GREYC[2])
    put(a, x + 5, y + 1, BRASS[0]); put(a, x + 5, y + 3, GREYC[0]); put(a, x + 6, y - 1, GREYC[3]); put(a, x + 6, y - 2, GREYC[3])

# ---------------------------------------------------------------- poses: (near, far, far_on_top) in se coords; per view base
SN, SF = (23.5, 57.5), (41.5, 57.5)
def P(S, Eb, W, hk, hp, hd=(0, 1)): return (S, Eb, W, hk, hp, hd)
POSES = {
 # offer: near hand presents the goods to the side (open palm), f2 points at an item
 'offer': {'se': [(P(SN, (19, 63), (17.5, 68), 'open', (16.5, 69.5), (-.6, .6)), None, False),
                  (P(SN, (18, 61.5), (14, 62.5), 'open', (12.5, 62.5), (-1, .15)), None, False),
                  (P(SN, (18, 60.5), (13.5, 58.5), 'point', (12, 58), (-1, -.35)), None, False),
                  (P(SN, (18, 61), (14, 61.5), 'open', (12.5, 61.5), (-1, .05)), None, False)]},
 # haggle: near palm up 'stop / nggak bisa', far hand on the hip; head shakes
 'haggle': {'se': [(P(SN, (18.5, 62), (19, 56), 'open', (19, 53.5), (0, -1)), P(SF, (46, 63), (42.5, 68), 'fist', (41.5, 69)), False),
                   (P(SN, (18, 62), (18, 56), 'open', (17.5, 53.5), (-.3, -1)), P(SF, (46, 63), (42.5, 68), 'fist', (41.5, 69)), False),
                   (P(SN, (18.5, 62), (19, 56), 'open', (19, 53.5), (0, -1)), P(SF, (46, 63), (42.5, 68), 'fist', (41.5, 69)), False),
                   (P(SN, (19, 62), (20, 56), 'open', (20.5, 53.5), (.3, -1)), P(SF, (46, 63), (42.5, 68), 'fist', (41.5, 69)), False)]},
}
HEAD_DX = {'haggle': [0, -1, 0, 1]}
EXPR = {'offer': ['smile', 'talk_open', 'talk_closed', 'talk_open'], 'haggle': ['talk_open', 'angry', 'talk_closed', 'angry'],
        'count': ['neutral', 'neutral', 'blink', 'smile'], 'weigh': ['neutral', 'talk_closed', 'surprised', 'talk_open'],
        'counter': ['smile', 'neutral', 'neutral', 'surprised', 'smile', 'happy'], 'sit': ['neutral', 'blink', 'neutral', 'neutral']}

def work_arms(nm, kind, f, base):
    """returns near, far, far_top, extra (props layer), far_behind_in_ne for the job-specific poses"""
    n = BABEH[nm]
    if kind in POSES:
        nr, fr, ft = POSES[kind]['se'][f]; return nr, fr, ft, None
    if kind == 'count' and nm == 'babeh_jam':           # count money: bill flicked from the near stack to the far hand
        if base == 'se':
            nr = P(SN, (21.5, 64), (26, 67.5), 'fist', (27.5, 67.5)); fr = P(SF, (44, 63.5), (39.5, 66), 'fist', (37.5, 65.5))
            return nr, fr, True, ('bills_se', f)
        nr = P(SN, (19, 63.5), (18, 67.5), 'fist', (17.5, 69)); fr = P(SF, (47, 63), (43, 66.5), 'fist', (41, 67))
        return nr, fr, False, ('bills_ne', f)
    if kind == 'count' and nm == 'babeh_pemilik':        # calculator: near hand holds it, far index finger taps
        if base == 'se':
            nr = P(SN, (21.5, 64), (26, 66.5), 'fist', (27.5, 66.5)); tap = [0, 1, 0, 1][f]
            fr = P(SF, (44, 63), (38.5, 64 + tap), 'point', (36.5, 64 + tap), (-1, -.2))
            return nr, fr, True, ('calc_se', f)
        nr = P(SN, (19, 63.5), (18, 67.5), 'fist', (17.5, 69)); fr = P(SF, (47, 63), (43, 66.5), 'fist', (41, 67))
        return nr, fr, False, ('calc_ne', f)
    if kind == 'count' and nm == 'babeh_tas':            # weigh a bag in the hand (up / down)
        hy = [69, 65, 62.5, 66][f]
        nr = P(SN, (19, 63.5), (17.5, hy - 1.5), 'fist', (17, hy))
        fr = P(SF, (46, 63), (42.5, 68), 'fist', (41.5, 69))
        return nr, fr, False, ('bag', (17, int(hy) + 1))
    if kind == 'counter':                                # behind the etalase: receive an item, inspect, pay
        rest_n = P(SN, (22, 64), (27, 70), 'fist', (28.5, 71)); rest_f = P(SF, (44, 64), (39.5, 70), 'fist', (38, 71))
        T = [(rest_n, rest_f, True, None),
             (P(SN, (24, 64.5), (31, 70.5), 'open', (33, 71), (1, .3)), rest_f, True, None),
             (P(SN, (24, 64.5), (31, 70.5), 'fist', (33, 71)), rest_f, True, ('radio', (31, 70))),
             (P(SN, (21, 64), (25, 59), 'fist', (26.5, 57.5)), rest_f, True, ('radio', (24, 54))),
             (P(SN, (21.5, 64.5), (26, 68), 'fist', (27.5, 68)), P(SF, (45, 63), (45.5, 69), 'open', (46.5, 71), (1, .4)), False, ('pay', (27.5, 68))),
             (rest_n, rest_f, True, None)]
        return T[f]
    raise KeyError(kind)

def erase_sleeve(L, side, dy):
    """remove the hanging short sleeve on one side (the custom limb redraws shoulder + sleeve)"""
    sh = L['shirt']
    for y in range(54 + dy, 64 + dy):
        for x in range(FW):
            if (side < 0 and x <= 24) or (side > 0 and x >= 41 and y < 60 + dy): sh[y, x] = 0

def place_props(spec, base):
    a = E()
    if spec is None: return a
    k, v = spec
    if k == 'bills_se':
        f = v; bills(a, 26, 64, MONEY, 4, 3)
        if f == 1: bills(a, 31, 62, MONEY, 4, 1)
        if f in (2, 3): bills(a, 35, 63, MONEY, 3, 1 + (f == 3))
    elif k == 'bills_ne':
        f = v; bills(a, 14, 67, MONEY, 4, 2)
        if f in (1, 2): bills(a, 13 - (f == 2), 65 - f, MONEY, 3, 1)
    elif k == 'calc_se':
        calculator(a, 26, 61, lit=v % 2)
    elif k == 'calc_ne':
        calculator(a, 14, 63, lit=v % 2)
    elif k == 'bag':
        bag(a, *v)
    elif k == 'radio':
        radio(a, *v)
    elif k == 'pay':
        radio(a, 24, 66); bills(a, 46, 70, MONEY, 4, 2)
    return a

# ---------------------------------------------------------------- frame build
def build(nm, view, kind, f=0):
    n = BABEH[nm]; base = 'se' if view in ('se', 'sw') else 'ne'; mir = view in ('sw', 'nw')
    anim = kind if kind in ('idle', 'walk', 'sit') else 'idle'
    gf = f if kind in ('idle', 'walk') else 0
    expr = EXPR.get(kind, ['neutral'] * 6)[f % len(EXPR.get(kind, ['neutral']))] if base == 'se' else 'neutral'
    L, pal, dy, bob = base_layers(n, base, anim, gf, expr)
    near = far = None; far_top = False; props = E()
    if kind not in ('idle', 'walk', 'sit'):
        nr, fr, far_top, spec = work_arms(nm, kind, f, base)
        flip = base == 'ne' and not (kind == 'count' and nm in ('babeh_jam', 'babeh_pemilik'))
        if nr is not None:
            near = limb(*nr, pal, n); L['arm_near'] = E(); erase_sleeve(L, -1 if not (base == 'ne' and not flip) else -1, dy)
        if fr is not None:
            far = limb(*fr, pal, n); L['arm_far'] = E(); erase_sleeve(L, 1, dy)
        props = place_props(spec, base)
        if base == 'ne':
            if flip:
                # back view: the same gesture seen from behind (arms mirrored to the other side like the game's back layers);
                # anything that is in front of the chest from the front is behind the torso from the back
                near = flipx(near) if near is not None else None; far = flipx(far) if far is not None else None; props = flipx(props)
                L['shirt'] = flipx(L['shirt']) if False else L['shirt']
                if kind == 'counter': far_top = False
            # ne specific: front-of-body hands go behind the torso
            if kind in ('counter',): near, far, far_top = None if near is None else near, far, False
    # ---- compose
    sh = shadow(33 if kind == 'sit' else 32)
    im = Image.fromarray(sh)
    if kind == 'sit': im.alpha_composite(Image.fromarray(stool(n['stool'], 31 if base == 'se' else 33, 80)))
    body = Image.new('RGBA', (FW, FH))
    behind_torso = []
    if base == 'ne' and kind == 'counter':
        behind_torso = [near, props]; near = None; props = None          # in front of the chest -> hidden by the back
    for k in ORDER:
        if k == 'arm_near' and near is not None: continue
        if k == 'shirt':
            if far is not None and not far_top: body.alpha_composite(Image.fromarray(far))
            for b in behind_torso:
                if b is not None: body.alpha_composite(Image.fromarray(b))
        if k in L and L[k] is not None: body.alpha_composite(Image.fromarray(L[k]))
    b = np.array(body)
    if kind in HEAD_DX:                                  # head shake: head + hat rows move rigidly
        dxh = HEAD_DX[kind][f]
        if base == 'ne': dxh = -dxh
        nk = 52 + dy; b[:nk] = np.roll(b[:nk], dxh, axis=1)
    body = Image.fromarray(b)
    if far is not None and far_top: body.alpha_composite(Image.fromarray(far))
    if kind == 'counter' and base == 'se' and f in (2, 3): body.alpha_composite(Image.fromarray(props)); props = None
    if near is not None: body.alpha_composite(Image.fromarray(near))
    if kind == 'sit' and f in (2, 3):                    # seated breathing: upper body 1 px up
        a = np.array(body); up = a[:76].copy(); a[:75] = up[1:76]
        lo = np.array(Image.fromarray(a)); body = Image.fromarray(lo)
        tmp = Image.new('RGBA', (FW, FH)); tmp.alpha_composite(body)
        body = tmp
    if props is not None:
        if base == 'ne' and kind == 'count' and nm == 'babeh_tas': body.alpha_composite(Image.fromarray(props))
        else: body.alpha_composite(Image.fromarray(props))
    im.alpha_composite(body)
    if mir: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im

ANIMS = [('idle', 4, 300), ('walk', 6, 150), ('sit', 4, 400), ('offer', 4, 280), ('count', 4, 260), ('haggle', 4, 220)]
ANIMS_OWNER = ANIMS + [('counter', 6, 380)]

if __name__ == '__main__':
    import sys as _s
    names = _s.argv[1:] or list(BABEH)
    for nm in names:
        for d in ('frames', 'poses'): os.makedirs(f'{OUT}/{d}', exist_ok=True)
        AN = ANIMS_OWNER if nm == 'babeh_pemilik' else ANIMS
        for kind, k, ms in AN:
            for v in VIEWS:
                for i in range(k): build(nm, v, kind, i).save(f'{OUT}/frames/{nm}_{v}_{kind}_f{i}.png')
        print('built', nm)
