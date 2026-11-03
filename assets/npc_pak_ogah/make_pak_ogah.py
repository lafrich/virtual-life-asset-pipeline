#!/usr/bin/env python3
"""Virtual Life - NPC 'Pak Ogah' (street-junction traffic helper), v6b style. PREVIEW ONLY, not integrated / not deployed.
Body, head, face, cap (npc_v6b cap()), face mask (npc_v6b mask_face()), idle + walk rows = the game's v6b generator
(job_common.render, same calls as npc_v6b.build). Added here: hi-vis vest (lime + orange stripes), cargo pockets,
flip-flops, red flag on a wooden pole, custom work-pose arms (wave flag, stop car), whistle. sw / nw = mirrors (as the game)."""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from job_common import *
OUT = os.path.dirname(os.path.abspath(__file__)); NM = 'pak_ogah'
N = dict(body='m', skin='medium', hair='short', hc='black', top='tee_long', tc='navy', pants='trousers', pc='walnut', shoes='shoes', sc='night',
         cap='night', mask=('#7FB2DE', '#3E6FA8', '#27386B'))                       # mask: pal6 'sky' + steel + navy (existing hexes)
LIME = [hx(c) for c in ('#E9F98A', '#C8E63C', '#A6C82E', '#7A9A22', '#556E1A')]   # NEW (hi-vis vest, no lime in v6b)
ORANGE = [hx(c) for c in ('#FFB36B', '#FF8A3D', '#E0662A', '#A9441F', '#6B2A16')]  # Gfunk / Theodore orange ramp
RED = [hx(c) for c in ('#F07A7E', '#E5484D', '#B8352E', '#8E1F24', '#7A2E35')]     # Gfunk RED + pal6 red + v6b oxblood
WOOD = [hx(c) for c in ('#94704F', '#94704F', '#6B4F3A', '#5E4636', '#3D2A1E')]     # v6b walnut / mustache / dark walnut
TEAL = [hx(c) for c in ('#6FA9A9', '#3D7A80', '#2A5266')]                           # Theodore teal ramp (flip-flops)
CHROME = [hx(c) for c in ('#FFFFFF', '#E7EBF2', '#B9C0CC', '#8D97A8', '#5A6577')]   # whistle

def tones(a, mask=None):
    m = a[..., 3] == 255 if mask is None else mask
    return sorted({tuple(p[:3]) for p in a[m]}, key=lum, reverse=True)

def layers(view, anim, f):
    L, pal, bob = render(N, anim, f, view)
    L0, _, _ = render(N, 'idle', 0, view)
    dy = bbox(L['shirt'])[1] - bbox(L0['shirt'])[1]                   # torso bob of this row/frame
    # --- hi-vis vest over the torso (sleeves stay blue): generator fold pattern remapped onto the lime ramp
    sh = L['shirt']; yy, xx = np.mgrid[0:FH, 0:FW]
    xs0, xs1 = (25, 39)
    m = (sh[..., 3] == 255) & (xx >= xs0) & (xx <= xs1) & (yy >= 54 + dy)
    if view == 'se': m &= ~((yy < 60 + dy) & (np.abs(xx + .5 - 33.5) < (60 + dy - yy) * .9))     # V neck
    else: m &= ~((yy < 55 + dy) & (np.abs(xx + .5 - 32.5) < 4))
    sh = remap(sh, m, LIME[1:])
    for y in range(54 + dy, 71 + dy):                                  # vest edges: darkest lime at armholes / right, light on the left
        for x in (xs0, xs1):
            if m[y, x]: put(sh, x, y, LIME[4] if x == xs1 else LIME[2])
    put(sh, 27, 56 + dy, LIME[0]); put(sh, 27, 57 + dy, LIME[0])     # left-lit highlight
    # orange reflective stripes: two verticals + hem band
    for y in range(57 + dy, 69 + dy):
        for x, c in ((28, ORANGE[1]), (29, ORANGE[2]), (36, ORANGE[2]), (37, ORANGE[3])):
            if m[y, x]: put(sh, x, y, c)
    for x in range(xs0, xs1 + 1):
        for y, c in ((65 + dy, ORANGE[1] if x < 33 else ORANGE[2]), (66 + dy, ORANGE[2] if x < 33 else ORANGE[3])):
            if m[y, x]: put(sh, x, y, c)
    if view == 'se':
        for y in range(60 + dy, 70 + dy): put(sh, 33, y, LIME[3])     # front zip line
    L['shirt'] = sh
    # --- cargo pockets on the outer thighs (follow the legs per row)
    pa = L['pants']; pt = tones(pa)
    for y in range(80, 87):
        xs = np.nonzero(pa[y, :, 3])[0]
        if not len(xs): continue
        for x in range(xs.min() + 1, xs.min() + 4): put(pa, x, y, pt[min(len(pt) - 1, 2 if y == 80 else 1)])
        for x in range(xs.max() - 3, xs.max()): put(pa, x, y, pt[min(len(pt) - 1, 3 if y == 80 else 2)])
    L['pants'] = pa
    # --- flip-flops: feet skin, teal strap row, dark teal sole
    so = L['shoes']; sk = [pal[k] for k in ('Ki', 'Kh', 'Ke', 'Ka', 'K7')]
    new = np.zeros_like(so)
    for x in range(FW):
        ys = np.nonzero(so[:, x, 3])[0]
        if not len(ys): continue
        for y in ys:
            r = y - ys.min(); last = y == ys.max()
            xl = not so[y, x - 1, 3]; xr = not so[y, x + 1, 3]
            c = TEAL[2] if last else (TEAL[0] if r == 1 and not xr else TEAL[1] if r == 1 else (sk[4] if xr else sk[1] if xl else sk[2]))
            put(new, x, y, c)
    L['shoes'] = new
    return L, pal, dy

def arm_ramps(pal):
    sl = [pal['O1'], pal['O1'], pal['O2'], pal['O3'], pal['O5']]
    sk = [pal['Ki'], pal['Ki'], pal['Kh'], pal['Ke'], pal['K7']]
    return sl, sk

def arm(pts, pal, fist=True, palm=False):
    """custom arm: sleeve tube (shoulder->elbow->wrist) + skin hand, left-lit, edge = darkest of the material"""
    sl, sk = arm_ramps(pal)
    a = shade(tube(pts[:-1] + [((pts[-2][0] + pts[-1][0] * 2) / 3, (pts[-2][1] + pts[-1][1] * 2) / 3)], 1.45), sl)
    hx_, hy_ = pts[-1]
    if palm:            # open palm facing out: 3x4 block + fingers up
        hm = np.zeros((FH, FW), bool); x0, y0 = int(hx_) - 1, int(hy_) - 2
        hm[y0:y0 + 4, x0:x0 + 3] = True; hm[y0 - 1, x0:x0 + 3:2] = True
        h = shade(hm, sk)
    else: h = shade(disk(hx_, hy_, 1.7), sk)
    o = Image.fromarray(a); o.alpha_composite(Image.fromarray(h)); return np.array(o)

def pole(p0, p1, r=.75):
    return shade(tube([p0, p1], r), WOOD)

def flag_cloth(A, B, dvec, phase=0.0, rows=None):
    """cloth quad from pole segment A(top)-B(bottom) towards dvec (free edge), sin ripple along the cloth; shading bands"""
    ax, ay = A; bx, by = B; dx, dy_ = dvec
    m = np.zeros((FH, FW), bool); U = np.zeros((FH, FW)); V = np.zeros((FH, FW))
    for i in range(0, 61):
        for j in range(0, 61):
            s, u = i / 60, j / 60
            w = math.sin(u * math.pi * 1.6 + phase) * 1.3 * u
            px = ax + (bx - ax) * s + dx * u + (-dy_) / max(1, math.hypot(dx, dy_)) * 0 
            py = ay + (by - ay) * s + dy_ * u + w
            xi, yi = int(px), int(py)
            if 0 <= xi < FW and 0 <= yi < FH: m[yi, xi] = True; U[yi, xi] = u; V[yi, xi] = s
    a = np.zeros((FH, FW, 4), np.uint8); pad = np.pad(m, 1)
    for y, x in zip(*np.nonzero(m)):
        u = U[y, x]; k = math.sin(u * math.pi * 1.6 + phase + .9)
        c = RED[1] if k > .35 else RED[2] if k > -.45 else RED[3]
        if k > .85 and V[y, x] < .5: c = RED[0]
        edge = not (pad[y, x + 1] and pad[y + 2, x + 1] and pad[y + 1, x] and pad[y + 1, x + 2])
        if edge and (u > .85 or V[y, x] > .9): c = RED[4]
        a[y, x, :3] = c; a[y, x, 3] = 255
    return a

def hand_pos(arm_layer):
    ys, xs = np.nonzero(arm_layer[..., 3]); yb = ys.max(); return xs[ys >= yb - 2].min(), xs[ys >= yb - 2].max(), yb

def fingers(a, hx0, hy, px, pal, n=2):
    """fist wrapping a vertical pole: skin px over the pole between hand and pole"""
    sk = [pal['Ki'], pal['Kh'], pal['Ke'], pal['K7']]
    for i, y in enumerate(range(hy - 2, hy - 2 + n)):
        for x in range(min(px, hx0), max(px, hx0) + 1): put(a, x, y, sk[1] if i == 0 else sk[2])
        put(a, min(px, hx0), y, sk[3] if i else sk[2])

def flipx(a):
    """se-drawn overlay -> ne side (the game's back view puts the near arm at 65 - x, i.e. flip + 1 px)"""
    return np.roll(a[:, ::-1], 1, axis=1)

def build(view, kind, f):
    base = 'se' if view in ('se', 'sw') else 'ne'; mir = view in ('sw', 'nw')
    anim = kind if kind in ('idle', 'walk') else 'idle'
    L, pal, dy = layers(base, anim, f if kind in ('idle', 'walk') else 0)
    E = lambda: np.zeros((FH, FW, 4), np.uint8)
    behind, front, top = E(), E(), E()       # behind = before body, front = in arm_near slot, top = after face
    if kind in ('idle', 'walk'):
        hx0, hx1, hy = hand_pos(L['arm_near'])
        if base == 'se': px = hx0 - 3
        else: px = hx1 + 2
        y0, y1 = (hy - 36, hy + 24) if kind == 'idle' else (hy - 36, hy + 12)
        if kind == 'idle': y1 = 99
        pl = pole((px + 1, y0), (px + 1, y1), .9)
        side = -1 if base == 'se' else 1
        ph = [0, .8, 1.6, .8, 0, -.8][f % 6] if kind == 'walk' else [0, .3, .5, .3][f % 4]
        cl = flag_cloth((px + 1 + side * 0.5, y0 + 1), (px + 1 + side * .5, y0 + 15), (side * 13, 4 + (2 if kind == 'idle' else 0)), ph)
        st = Image.fromarray(cl); st.alpha_composite(Image.fromarray(pl)); front = np.array(st)
        fg = E(); fingers(fg, hx0 if base == 'se' else hx1, hy, px if base == 'se' else px + 1, pal)
        L['held'] = fg
    elif kind == 'wave_flag':
        th = [5, -15, -35, -45, -25, -5][f]; cd = [(-14, 3), (-6, -2), (12, -4), (13, -6), (5, 2), (-12, 4)][f]; ph = [0, .6, 1.2, 1.8, 2.4, 3.0][f]
        hand = (20.5 - th / 30, 45.5 + abs(th) / 25); sh_ = (24, 58)
        L['arm_near'] = arm([sh_, (18.5, 53), hand], pal)
        t = math.radians(th); ux, uy = math.sin(t), -math.cos(t)
        P0 = (hand[0] - ux * 9, hand[1] - uy * 9); P1 = (hand[0] + ux * 27, hand[1] + uy * 27)
        A = (hand[0] + ux * 27, hand[1] + uy * 27); B = (hand[0] + ux * 14, hand[1] + uy * 14)
        cl = flag_cloth(A, B, cd, ph); pl = pole(P0, P1, .9)
        st = Image.fromarray(pl); st.alpha_composite(Image.fromarray(cl)); behind_ne = np.array(st)
        front = behind_ne
        fg = E(); h2 = shade(disk(hand[0] + .2, hand[1] - .3, 1.6), arm_ramps(pal)[1]); fg = h2
        L['held'] = fg
        if base == 'ne': L['arm_near'] = flipx(L['arm_near']); front = flipx(front); L['held'] = flipx(L['held'])
    elif kind == 'stop_car':
        push = [0, 1, 0][f]
        L['arm_far'] = arm([(40.5, 58), (46, 55 - push * .5), (46.5 + push * .5, 47 - push)], pal, palm=True)
        # near hand holds the flag low and out to the side, cloth hanging, slight sway
        hand = (21, 70); L['arm_near'] = arm([(24, 58), (21.5, 64), hand], pal)
        th = [-19, -17, -21][f]; t = math.radians(th); ux, uy = math.sin(t), -math.cos(t)
        P0 = (hand[0] - ux * 10, hand[1] - uy * 10); A = (hand[0] + ux * 30, hand[1] + uy * 30); B = (hand[0] + ux * 17, hand[1] + uy * 17)
        cl = flag_cloth(A, B, (-5, 10 + f % 2), [0, .5, 1.0][f]); pl = pole(P0, A, .9)
        st = Image.fromarray(cl); st.alpha_composite(Image.fromarray(pl)); front = np.array(st)
        L['held'] = shade(disk(hand[0] + .2, hand[1] - .3, 1.6), arm_ramps(pal)[1])
        if base == 'se':                                               # whistle in front of the mask + cord to the collar
            for (x, y, c) in ((37, 50, CHROME[1]), (38, 50, CHROME[2]), (39, 50, CHROME[3]), (37, 51, CHROME[2]), (38, 51, CHROME[3]), (39, 51, CHROME[4]),
                              (40, 49, CHROME[2]) if f == 1 else (0, 0, None), (36, 52, CHROME[3]), (35, 53, CHROME[3])):
                if c is not None: put(top, x, y, c)
            if f == 1:
                for (x, y) in ((42, 48), (43, 47), (42, 51), (43, 52)): put(top, x, y, CHROME[1])     # toot
        if base == 'ne':
            L['arm_near'] = flipx(L['arm_near']); front = flipx(front); L['held'] = flipx(L['held']); L['arm_far'] = flipx(L['arm_far'])
    # Connect actual shoulder roots AFTER custom flag-wave/stop-car arms.
    weld_arm_rgba_layers(L)
    ordr = ['hair_back', 'body', 'arm_far', 'shoes', 'pants', 'shoes_over', 'rips', 'shirt', 'outer', 'acc']
    im = Image.fromarray(shadow())
    im.alpha_composite(Image.fromarray(behind))
    if base == 'ne' and kind in ('wave_flag',): im.alpha_composite(Image.fromarray(front)); front = None
    for k in ordr:
        if k in L: im.alpha_composite(Image.fromarray(L[k]))
    if front is not None and base == 'ne': im.alpha_composite(Image.fromarray(front)); front = None
    if front is not None and kind == 'stop_car': im.alpha_composite(Image.fromarray(front)); front = None
    if front is not None: im.alpha_composite(Image.fromarray(front))
    for k in ('arm_near', 'held', 'face', 'hair_front', 'glasses', 'brows'):
        if k in L: im.alpha_composite(Image.fromarray(L[k]))
    im.alpha_composite(Image.fromarray(top))
    if mir: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im

VIEWS = ('se', 'sw', 'ne', 'nw')
ANIMS = [('idle', 4, 300), ('walk', 6, 150), ('wave_flag', 6, 120), ('stop_car', 3, 350)]

def props():
    """flag on pole as a separate prop (upright, cloth hanging), 64x112, bottom of pole at the pivot line"""
    a = flag_cloth((31.5, 41), (31.5, 55), (-13, 6), .3); p = pole((32, 40), (32, 99), .9)
    im = Image.fromarray(shadow(32, 3)); im.alpha_composite(Image.fromarray(a)); im.alpha_composite(Image.fromarray(p)); return im

if __name__ == '__main__':
    for d in ('frames', 'poses'): os.makedirs(f'{OUT}/{d}', exist_ok=True)
    FR = {}
    for kind, n, ms in ANIMS:
        for v in VIEWS:
            FR[v, kind] = [build(v, kind, i) for i in range(n)]
            for i, im in enumerate(FR[v, kind]): im.save(f'{OUT}/frames/{NM}_{v}_{kind}_f{i}.png')
    for v in VIEWS:
        FR[v, 'idle'][0].save(f'{OUT}/poses/{NM}_{v}_idle.png'); FR[v, 'wave_flag'][2].save(f'{OUT}/poses/{NM}_{v}_wave_flag_key.png')
        FR[v, 'stop_car'][0].save(f'{OUT}/poses/{NM}_{v}_stop_car_key.png')
    props().save(f'{OUT}/poses/prop_flag_pole.png')
    sheet('PAK OGAH  ·  4x  ·  64x112, pivot 32,100  ·  v6b generator body + vest / flag / work arms  ·  sw / nw = mirrors  ·  transparent',
          [(f'{k} {v}', [(f'f{i}', im) for i, im in enumerate(FR[v, k])]) for k, n, ms in ANIMS for v in VIEWS] + [('prop', [('flag_pole', props())])],
          f'{OUT}/{NM}_sheet_4x.png')
    sheet('PAK OGAH  ·  work poses (se)  ·  4x  ·  on dark bg', [(k, [(f'f{i}', im) for i, im in enumerate(FR['se', k])]) for k in ('wave_flag', 'stop_car')],
          f'{OUT}/{NM}_work_se_4x_darkbg.png', bg=BG)
    for kind, n, ms in ANIMS:
        gif([strip([FR[v, kind][i] for v in VIEWS]) for i in range(n)], f'{OUT}/{NM}_{kind}_4views_4x.gif', ms)
    cols = set()
    for fr in FR.values():
        for im in fr: cols |= {tuple(p[:3]) for p in np.array(im).reshape(-1, 4) if p[3] == 255}
    al = set()
    for fr in FR.values():
        for im in fr: al |= set(np.unique(np.array(im)[..., 3]).tolist())
    print(len(cols), 'colours; alpha values', sorted(al)); print(' '.join(sorted(H(c) for c in cols)))
