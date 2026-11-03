#!/usr/bin/env python3
"""Virtual Life - NPC 'Kang Parkir' (parking attendant in front of the Indomaret), v6b style. PREVIEW ONLY, not integrated / not deployed.
Body, head, face, cap (npc_v6b cap()), idle + walk rows = the game's v6b generator (../npc_babeh_loak/babeh_base.render_b = the
../npc_pak_ogah/job_common.render path + generator options). Added: orange parking vest with silver reflective stripes + 'P' patch,
towel around the neck, whistle on a cord, flip-flops, work-pose arms (limb() of Manusia Silver v2 / Babeh loak):
whistle (tiup peluit), direct (mengarahkan motor: 'terus.. terus.. kiri'), money (menerima uang parkir). sw / nw = mirrors."""
import os, sys, math
sys.path.insert(0, 'assets/npc_babeh_loak')
from make_babeh_loak import limb, bills, over, MONEY, P
from babeh_base import *
OUT = os.path.dirname(os.path.abspath(__file__)); NM = 'kang_parkir'
N = dict(body='m', skin='brown', hair='short', hc='black', top='tee', tc='#2A3242', pants='trousers', pc='#4A6A9A', shoes='shoes', sc='night',
         cap=('#10141B', '#2A3242', '#5A6577'), facial=dict(stubble=['#8B4F2F', '#6B361D']), top_style='tee', sandal=(PECI[0], PECI[1], PECI[3]))
ORANGE = X('#FFB36B', '#FF8A3D', '#E0662A', '#A9441F', '#6B2A16')       # Gfunk / Pak Ogah orange ramp
CHROME = X('#FFFFFF', '#E7EBF2', '#B9C0CC', '#8D97A8', '#5A6577')
VIEWS = ('se', 'sw', 'ne', 'nw')

def layers(view, anim, f, expr='neutral'):
    L, pal, bob = render_b(N, anim, f, view, expr)
    L0, _, _ = render_b(N, 'idle', 0, view)
    dy = bbox(L['shirt'])[1] - bbox(L0['shirt'])[1]
    sh = L['shirt']; yy, xx = np.mgrid[0:FH, 0:FW]
    m = (sh[..., 3] == 255) & (xx >= 25) & (xx <= 39) & (yy >= 54 + dy)
    if view == 'se': m &= ~((yy < 59 + dy) & (np.abs(xx + .5 - 33) < (59 + dy - yy) * .9))       # V neck
    sh = remap(sh, m, ORANGE[:4])
    for y in range(54 + dy, 71 + dy):
        for x in (25, 39):
            if m[y, x]: put(sh, x, y, ORANGE[4] if x == 39 else ORANGE[2])
    for yb in (60, 66):                                                    # reflective stripes (silver)
        for x in range(25, 40):
            if m[yb + dy, x]: put(sh, x, yb + dy, CHROME[1] if x < 33 else CHROME[2])
            if m[yb + 1 + dy, x]: put(sh, x, yb + 1 + dy, CHROME[2] if x < 33 else CHROME[3])
    if view == 'se':
        for y in range(59 + dy, 70 + dy):
            if m[y, 33]: put(sh, 33, y, ORANGE[3])                             # front opening
        for (x, y, c) in ((27, 62, CHROME[1]), (28, 62, CHROME[1]), (29, 62, CHROME[1]), (27, 63, CHROME[2]), (28, 63, ORANGE[3]), (29, 63, CHROME[2]),
                          (27, 64, CHROME[2]), (28, 64, CHROME[2]), (29, 64, CHROME[3])):        # small 'P' badge
            put(sh, x, y + dy, c)
    else:
        for (x, y) in ((31, 62), (32, 62), (33, 62), (31, 63), (33, 63), (31, 64), (32, 64), (31, 65)):   # 'P' on the back
            put(sh, x, y + dy, ORANGE[4])
    L['shirt'] = sh
    # towel around the neck (white with a teal stripe), ends on the chest in se
    tw = E(); TW = [CHROME[1], CHROME[2], CHROME[3], TEAL[1]]
    for x in range(26, 39):
        put(tw, x, 53 + dy, TW[0] if x < 32 else TW[1]); put(tw, x, 54 + dy, TW[1] if x < 32 else TW[2])
    if view == 'se':
        for y in range(55, 60): put(tw, 28, y + dy, TW[0]); put(tw, 29, y + dy, TW[1]); put(tw, 37, y + dy, TW[1]); put(tw, 38, y + dy, TW[2])
        put(tw, 28, 58 + dy, TW[3]); put(tw, 29, 58 + dy, TW[3]); put(tw, 37, 58 + dy, TW[3]); put(tw, 38, 58 + dy, TW[3])
        for (x, y, c) in ((34, 56, CHROME[2]), (34, 57, CHROME[3]), (35, 58, CHROME[3]), (35, 59, CHROME[1]), (36, 59, CHROME[2]), (35, 60, CHROME[3])):   # whistle on cord
            put(tw, x, y + dy, c)
    L['towel'] = tw
    sandals(L, pal, N['sandal'])
    return L, pal, dy

SN, SF = (24, 57.5), (40.5, 57.5)
def pose(kind, f, view):
    """(near, far, far_on_top, prop, toot) in se coords; view 'ne' gets back-view variants (hands kept clear of the head)"""
    if kind == 'whistle':
        if view == 'se':
            nr = P(SN, (20, 62), (28, 54.5), 'fist', (31, 51.5)); fr = P(SF, (44.5, 61), (47.5, 54), 'open', (48, 51.5), (.2, -1)) if f in (1, 2) else None
            return nr, fr, False, None, f in (1, 3)
        nr = P(SN, (19, 61), (19, 54), 'fist', (20.5, 51.5)); fr = P(SF, (44.5, 61), (47.5, 54), 'open', (48, 51.5), (.2, -1)) if f in (1, 2) else None
        return nr, fr, False, None, f in (1, 3)
    if kind == 'direct':                                              # beckon with the near hand, point the way with the far hand
        wave = [(15, 58), (13.5, 61), (15, 58), (16.5, 56), (14, 60), (15.5, 57.5)][f]
        nr = P(SN, (18.5, 62.5), (wave[0] + 1, wave[1] + 2), 'open', wave, (-.4, -1))
        fr = P(SF, (45.5, 59), (50, 58.5), 'point', (51.5, 58.5), (1, .1)) if f >= 3 else None
        return nr, fr, False, None, f == 0
    if kind == 'money':
        if view == 'se':
            T = [P(SN, (21, 63.5), (25.5, 67), 'open', (28, 67.5), (1, .2)), P(SN, (21, 63.5), (26, 67), 'open', (28.5, 67.5), (1, .2)),
                 P(SN, (21, 63), (27, 62), 'fist', (29, 61)), P(SN, (21, 63), (26, 66.5), 'fist', (27.5, 67.5))]
            pr = [None, ('bill', (27, 66)), ('bill', (28, 60)), None][f]
            return T[f], None, False, pr, False
        T = [P(SN, (19, 63), (17.5, 68), 'open', (17, 70), (-.3, .8)), P(SN, (19, 63), (17.5, 68), 'open', (17, 70), (-.3, .8)),
             P(SN, (19, 63), (18.5, 66), 'fist', (19.5, 67)), P(SN, (19, 63), (18, 68), 'fist', (18, 70))]
        pr = [None, ('bill', (15, 69)), ('bill', (17, 65)), None][f]
        return T[f], None, False, pr, False

EXPR = {'whistle': ['neutral', 'surprised', 'neutral', 'surprised'], 'direct': ['talk_open', 'talk_closed', 'talk_open', 'talk_open', 'talk_closed', 'smile'],
        'money': ['smile', 'smile', 'happy', 'smile']}

def build(view, kind, f=0):
    base = 'se' if view in ('se', 'sw') else 'ne'; mir = view in ('sw', 'nw')
    anim = kind if kind in ('idle', 'walk') else 'idle'
    expr = EXPR.get(kind, ['neutral'] * 6)[f] if base == 'se' and kind in EXPR else 'neutral'
    L, pal, dy = layers(base, anim, f if anim == kind else 0, expr)
    near = far = None; prop = None; toot = False
    n = dict(N)
    if kind not in ('idle', 'walk'):
        nr, fr, ft, prop, toot = pose(kind, f, base)
        flip = base == 'ne'
        sh = L['shirt']
        if nr is not None:
            near = limb(*nr, pal, n); L['arm_near'] = E()
            for y in range(54 + dy, 64 + dy): sh[y, :25] = 0
        if fr is not None:
            far = limb(*fr, pal, n); L['arm_far'] = E()
            for y in range(54 + dy, 64 + dy): sh[y, 40:] = 0
        if flip:
            near = flipx(near) if near is not None else None; far = flipx(far) if far is not None else None
    near, far = weld_arm_rgba_layers(L, near, far)
    im = Image.fromarray(shadow())
    for k in ['hair_back', 'body', 'arm_far', 'shoes', 'pants', 'shoes_over', 'rips', 'shirt', 'outer', 'acc', 'towel', 'arm_near', 'body_front', 'held', 'face', 'hair_front', 'glasses', 'brows']:
        if k == 'shirt' and far is not None: im.alpha_composite(Image.fromarray(far))
        if k in L: im.alpha_composite(Image.fromarray(L[k]))
    top = E()
    if prop:
        k, (x, y) = prop
        if base == 'ne': x = 65 - x - 4
        bills(top, x, y, MONEY, 4, 1)
    if near is not None: im.alpha_composite(Image.fromarray(near))
    if kind == 'whistle' and base == 'se':                               # whistle at the mouth + sound marks
        for (x, y, c) in ((33, 50, CHROME[1]), (34, 50, CHROME[2]), (35, 50, CHROME[3]), (33, 51, CHROME[2]), (34, 51, CHROME[3])): put(top, x, y, c)
    if toot:
        pts = ((38, 47), (39, 46), (38, 51), (39, 52), (40, 49), (41, 49)) if base == 'se' else ((44, 45), (45, 44), (46, 47), (47, 47))
        if kind == 'direct': pts = ((9, 52), (8, 51), (10, 55), (9, 56))
        for (x, y) in pts: put(top, x if base == 'se' or kind != 'whistle' else x, y, CHROME[1])
    im.alpha_composite(Image.fromarray(top))
    if mir: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im

ANIMS = [('idle', 4, 300), ('walk', 6, 150), ('whistle', 4, 220), ('direct', 6, 200), ('money', 4, 320)]
if __name__ == '__main__':
    for d in ('frames', 'poses'): os.makedirs(f'{OUT}/{d}', exist_ok=True)
    FR = {}
    for kind, n_, ms in ANIMS:
        for v in VIEWS:
            FR[v, kind] = [build(v, kind, i) for i in range(n_)]
            for i, im in enumerate(FR[v, kind]): im.save(f'{OUT}/frames/{NM}_{v}_{kind}_f{i}.png')
    for v in VIEWS:
        FR[v, 'idle'][0].save(f'{OUT}/poses/{NM}_{v}_idle.png'); FR[v, 'whistle'][1].save(f'{OUT}/poses/{NM}_{v}_whistle_key.png')
        FR[v, 'direct'][3].save(f'{OUT}/poses/{NM}_{v}_direct_key.png'); FR[v, 'money'][1].save(f'{OUT}/poses/{NM}_{v}_money_key.png')
    sheet('KANG PARKIR  ·  4x  ·  64x112, pivot 32,100  ·  v6b generator body + rompi parkir / handuk / peluit / pose kerja  ·  sw / nw = mirrors  ·  transparent',
          [(f'{k} {v}', [(f'f{i}', im) for i, im in enumerate(FR[v, k])]) for k, n_, ms in ANIMS for v in VIEWS], f'{OUT}/{NM}_sheet_4x.png')
    sheet('KANG PARKIR  ·  pose kerja (se / ne)  ·  4x  ·  dark bg', [(f'{k} {v}', [(f'f{i}', im) for i, im in enumerate(FR[v, k])]) for k in ('whistle', 'direct', 'money') for v in ('se', 'ne')],
          f'{OUT}/{NM}_work_4x_darkbg.png', bg=BG)
    for kind, n_, ms in ANIMS:
        gif([strip([FR[v, kind][i] for v in VIEWS]) for i in range(n_)], f'{OUT}/{NM}_{kind}_4views_4x.gif', ms)
    cols = set(); al = set()
    for fr in FR.values():
        for im in fr:
            a = np.array(im); cols |= {H(p) for p in a.reshape(-1, 4) if p[3] == 255}; al |= set(np.unique(a[..., 3]).tolist())
    import json
    K = json.load(open('assets/npc_babeh_loak/_tools/known.json')); known = set().union(*[set(v) for v in K.values()])
    print(len(cols), 'colours; alpha', sorted(al), 'new:', sorted(c for c in cols if c not in known))
