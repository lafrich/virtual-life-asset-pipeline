#!/usr/bin/env python3
"""Virtual Office - NPC 'Yerbies' (copy of the Gfunk pipeline, overrides at the end). Original header: NPC 'Gfunk' (ex-Zib) preview, v6b style. PREVIEW ONLY, not integrated.
Head silhouette + skin ramp come from the live v6b generator (via ../npc_preview_v2/base6.py); bubble helmet,
neck ring and float/shadow come from make_npcs_v2.py. Everything else (chrome suit, porthole, chest unit, tank,
claws, stride legs, hover pads, cone) is drawn here with a 5-tone, left-lit, no-black-outline shader."""
import os, sys, math
sys.path.insert(0, 'assets/npc_preview_v2')
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import make_npcs_v2 as M, base6, npc_v6b as nv, pal6
OUT = os.path.dirname(os.path.abspath(__file__)); FW, FH = 64, 112; hx = M.hx
REF = '/cursor/stores/store-ccb8fbb5-b0d8-4258-bd14-d4f8ba6cf28b/grok-bot/agents/ad118ee4-3b46-4c35-9701-548a6434b84f/attachments/'
# ---- ramps: [highlight, light, mid, shade, edge]  (edge = darkest tone of the same material, no black outline)
SUIT = None
CHROME = [hx(c) for c in ('#E7EBF2', '#B9C0CC', '#8D97A8', '#5A6577', '#3A4458')]
WARM = hx('#C8B59A')                                                   # warm reflection hint on chrome (new)
ORANGE = [hx(c) for c in ('#FFB36B', '#FF8A3D', '#E0662A', '#A9441F', '#6B2A16')]   # tank (new except #FF8A3D)
BRASS = [hx(c) for c in ('#FFD166', '#E0A526', '#C99A2E', '#8A6A24', '#6B5320')]
GLASSD = [hx(c) for c in ('#E7EBF2', '#8D97A8', '#5A6577', '#2A3242', '#1C2330')]   # porthole glass
RED = [hx('#F07A7E'), hx('#E5484D'), hx('#8E1F24')]
EYE = dict(glow=hx('#FFD166'), iris=hx('#FF8A3D'), rim=hx('#A9441F'))
nv.SK.update({'gfunk': pal6.skin('#6DB88A')})                         # teal-green alien skin through the v6b skin ramp

def disk(cx, cy, rx, ry=None):
    ry = rx if ry is None else ry; yy, xx = np.mgrid[0:FH, 0:FW]
    return ((xx + .5 - cx) / rx) ** 2 + ((yy + .5 - cy) / ry) ** 2 <= 1
def tube(pts, r):
    m = np.zeros((FH, FW), bool)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 3) + 1
        for t in np.linspace(0, 1, n): m |= disk(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r)
    return m
def rect(x0, y0, x1, y1):
    m = np.zeros((FH, FW), bool); m[y0:y1 + 1, x0:x1 + 1] = True; return m

def shade(mask, ramp, spec=None, bias=0.0, edge=True, warm=False):
    """left-lit cel shading: edge px -> ramp[4]; interior by position in the shape (left/top lit, right dark)"""
    a = np.zeros((FH, FW, 4), np.uint8); ys, xs = np.nonzero(mask)
    if not len(ys): return a
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    pad = np.pad(mask, 1)
    for y, x in zip(ys, xs):
        row = np.nonzero(mask[y])[0]; col = np.nonzero(mask[:, x])[0]
        u = (x - row.min()) / max(1, row.max() - row.min()); v = (y - col.min()) / max(1, col.max() - col.min())
        t = .75 * u + .25 * v + bias
        isedge = not (pad[y, x + 1] and pad[y + 2, x + 1] and pad[y + 1, x] and pad[y + 1, x + 2])
        if edge and isedge and (u > .45 or v > .6): c = ramp[4]
        elif t < .3: c = ramp[1]
        elif t < .62: c = ramp[2]
        else: c = ramp[3]
        if warm and .5 < v < .62 and .72 < u < .9 and not isedge: c = WARM
        a[y, x, :3] = c; a[y, x, 3] = 255
    if spec is not None:
        sx, sy = spec; a[sy, sx, :3] = ramp[0]; a[sy, sx, 3] = 255
    return a
def put(a, x, y, c): M.put(a, x, y, c)
def comp(*layers):
    im = Image.new('RGBA', (FW, FH))
    for l in layers: im.alpha_composite(l if isinstance(l, Image.Image) else Image.fromarray(l))
    return np.array(im)
def bands(a, mask, pts, step, tone):
    """segment rings on a tube: every `step` px along the path, darken the tube one tone (cross-section line)"""
    (x0, y0), (x1, y1) = pts[0], pts[-1]; L = math.hypot(x1 - x0, y1 - y0); dx, dy = (x1 - x0) / L, (y1 - y0) / L
    for y, x in zip(*np.nonzero(mask)):
        s = (x + .5 - x0) * dx + (y + .5 - y0) * dy
        if 1 < s < L - 1 and int(s) % step == 0 and tuple(a[y, x, :3]) != tuple(SUIT[4]): a[y, x, :3] = SUIT[3] if tuple(a[y, x, :3]) != tuple(SUIT[3]) else SUIT[4]

def head(pal_out):
    cfg = dict(body='m', skin='gfunk', hair='short', hc='black', top='tee_long', tc='paper', pants='trousers', pc='paper', shoes='boots', sc='black')
    o, L, pal = base6.render(cfg); M.bald(L, pal)
    h = comp(L['body'], L['hair_front']); h[54:] = 0
    # skull read: hollow cheek under the big eye + narrower jaw corners
    f = h.copy()
    for (x, y) in ((23, 50), (24, 51), (25, 52), (42, 51), (41, 52)): f[y, x, 3] = 0
    for (x, y) in ((24, 50), (25, 51), (26, 52), (41, 51), (40, 52)):
        if f[y, x, 3]: f[y, x, :3] = pal['K7']
    # face: BIG left eye (viewer-left), smaller right eye, both amber glow; dark mouth with teeth hint
    for y in range(42, 48):
        for x in range(27, 33):
            if ((x - 29.5) / 3.1) ** 2 + ((y - 44.5) / 3.1) ** 2 <= 1:
                d = math.hypot(x + .5 - 30, y + .5 - 45)
                put(f, x, y, EYE['rim'] if d > 2.2 else EYE['iris'] if d > 1.0 else EYE['glow'])
    put(f, 28, 43, M.SPEC)
    for y in range(43, 47):
        for x in range(36, 40):
            if ((x - 37.5) / 2.1) ** 2 + ((y - 44.5) / 2.1) ** 2 <= 1:
                put(f, x, y, EYE['rim'] if (x in (36, 39) or y in (43, 46)) else EYE['iris'])
    put(f, 37, 44, EYE['glow'])
    put(f, 34, 47, pal['K7'])                                     # nasal slit
    for x in range(31, 38): put(f, x, 50, hx('#1C2330'))           # mouth
    for x in (32, 34, 36): put(f, x, 50, hx('#B9C0CC'))            # teeth hint
    for x in range(32, 37): put(f, x, 51, pal['K7'])
    for x in (26, 39): put(f, x, 40, pal['K7'])                    # brow ridges
    for x in (27, 38): put(f, x, 40, pal['K7'])
    pal_out.update(pal); return f

def tank():
    a = np.zeros((FH, FW, 4), np.uint8)
    body = disk(15.5, 44.5, 5.5, 5.5) | rect(10, 44, 20, 68) | disk(15.5, 68.5, 5.5, 5.5)
    a = comp(a, shade(body, ORANGE, spec=(12, 42)))
    for y in (52, 53, 62, 63):                                      # two silver bands
        xs = np.nonzero(body[y])[0]
        for x in xs: put(a, x, y, CHROME[4] if x in (xs[0], xs[-1]) else (CHROME[1] if x < 15 else CHROME[2]) if y in (52, 62) else CHROME[3])
    pw = disk(15.0, 46.5, 2.7)                                       # round white porthole
    a = comp(a, shade(pw, [hx('#FFFFFF'), hx('#E7EBF2'), hx('#E7EBF2'), hx('#B9C0CC'), hx('#8D97A8')]))
    put(a, 15, 45, CHROME[2]); put(a, 15, 46, CHROME[2]); put(a, 15, 47, CHROME[2])   # porthole latch line
    for y in range(34, 39): put(a, 15, y, CHROME[2])                # antenna rod + red ball
    for (x, y, c) in ((14, 32, RED[0]), (15, 32, RED[1]), (14, 33, RED[1]), (15, 33, RED[2])): put(a, x, y, c)
    put(a, 14, 39, CHROME[3]); put(a, 15, 39, CHROME[3]); put(a, 16, 39, CHROME[3])
    return a

def claw(cx, cy, facing):
    """metal crab pincer: wrist cuff + two hooked prongs, open towards `facing` (+1 right / -1 down)"""
    a = np.zeros((FH, FW, 4), np.uint8)
    if facing == 1:
        m = disk(cx, cy, 2.2) | tube([(cx + 1, cy - 1), (cx + 3, cy - 3), (cx + 5, cy - 2)], .8) | tube([(cx + 1, cy + 1), (cx + 3, cy + 3), (cx + 5, cy + 2)], .8)
    else:
        m = disk(cx, cy, 2.2) | tube([(cx - 1, cy + 1), (cx - 3, cy + 3), (cx - 2, cy + 5)], .8) | tube([(cx + 1, cy + 1), (cx + 2, cy + 4), (cx + 1, cy + 6)], .8)
    a = comp(a, shade(m, CHROME, spec=(int(cx) - 1, int(cy) - 1)))
    put(a, int(cx), int(cy), CHROME[4])                              # pivot rivet
    return a

def limb(pts, r, step=4, joint=None, spec=None):
    m = tube(pts, r); a = shade(m, SUIT, spec=spec, warm=False)
    for p, q in zip(pts, pts[1:]): bands(a, tube([p, q], r), [p, q], step, None)
    if joint:
        j = disk(joint[0], joint[1], r + .9); a = comp(a, shade(j, CHROME, spec=(int(joint[0]) - 1, int(joint[1]) - 1)))
    return a

def hover(cx, cy):
    """foot disc/flange + glowing white concentric target rings under it"""
    a = np.zeros((FH, FW, 4), np.uint8)
    def ell(rx, ry):                                                  # 1px ellipse outline on whole px
        pts = set()
        for k in range(360):
            t = math.radians(k); pts.add((int(math.floor(cx + rx * math.cos(t))), int(math.floor(cy + ry * math.sin(t)))))
        return pts
    for x, y in ell(4.6, 2.0): put(a, x, y, hx('#E7EBF2'))
    for x, y in ell(2.4, 1.0): put(a, x, y, hx('#B9C0CC'))
    put(a, int(cx), int(cy), EYE['iris'])
    return a
def boot(cx, cy):
    m = disk(cx, cy, 3.6, 1.3) | rect(int(cx) - 1, int(cy) - 3, int(cx) + 1, int(cy))
    return shade(m, CHROME, spec=(int(cx) - 2, int(cy)))

def torso():
    m = disk(32, 60, 9.2, 5.6) | rect(24, 60, 40, 72) | disk(32, 72, 8.0, 4.0)
    a = shade(m, CHROME, spec=(26, 57), warm=False)
    # boxy chest unit with dials + orange indicator strip
    for y in range(55, 62):
        for x in range(27, 39):
            c = CHROME[4] if (x in (27, 38) or y in (55, 61)) else CHROME[0] if (y == 56 and x < 33) else CHROME[1] if x < 32 else CHROME[2]
            put(a, x, y, c)
    for (x, y) in ((29, 57), (36, 57)):
        for dx, dy, c in ((0, 0, CHROME[4]), (1, 0, CHROME[3]), (0, 1, CHROME[3]), (1, 1, CHROME[2])): put(a, x + dx, y + dy, c)
    put(a, 29, 57, CHROME[0])
    for x in range(31, 35): put(a, x, 59, ORANGE[1] if x < 33 else ORANGE[2])
    for x in range(31, 35): put(a, x, 60, ORANGE[3])
    # big glass-marble porthole: dark ring, glass dome, one highlight dot
    ringm = disk(32.5, 67.0, 5.0) & ~disk(32.5, 67.0, 3.4)
    a = comp(a, shade(ringm, GLASSD[1:] + [GLASSD[4]], bias=.25))
    dome = disk(32.5, 67.0, 3.4); g = shade(dome, [GLASSD[0], GLASSD[1], GLASSD[2], GLASSD[3], GLASSD[4]], spec=(31, 65), bias=.05)
    a = comp(a, g); put(a, 32, 65, GLASSD[1]); put(a, 34, 69, GLASSD[1])
    # brass belt ring
    for y in (74, 75):
        xs = np.nonzero(m[y])[0]
        for x in xs: put(a, x, y, BRASS[4] if x in (xs[0], xs[-1]) else (BRASS[1] if x < 30 else BRASS[2] if x < 36 else BRASS[3]) if y == 74 else BRASS[3])
    put(a, 27, 74, BRASS[0])
    hip = disk(32, 78, 6.5, 2.8) & ~rect(0, 0, 63, 75)
    a = comp(shade(hip, CHROME, spec=(28, 77), warm=False), a)
    return a

def cone():
    a = np.zeros((FH, FW, 4), np.uint8)
    rows = {21: (32, 32), 22: (32, 33), 23: (31, 33), 24: (31, 34), 25: (30, 34)}
    for y, (x0, x1) in rows.items():
        for x in range(x0, x1 + 1):
            t = (x - x0) / max(1, x1 - x0)
            put(a, x, y, CHROME[0] if (y == 21) else CHROME[1] if t < .34 else CHROME[2] if t < .7 else CHROME[3])
        put(a, x1, y, CHROME[3] if y < 24 else CHROME[4])
    for x in range(29, 37): put(a, x, 26, CHROME[4] if x in (29, 36) else CHROME[2] if x < 33 else CHROME[3])
    put(a, 31, 24, CHROME[0])
    return a

def build():
    pal = {}
    hd = head(pal)
    T = tank()
    # far (screen-left/back) arm hangs, bent, claw low beside the tank; near arm reaches forward, claw open
    arm_back = comp(limb([(25, 58), (21, 65), (21, 70)], 1.5, joint=(21, 65)), claw(21, 72.5, -1))
    leg_back = comp(limb([(28.5, 79), (25, 87), (22, 94)], 1.8, joint=(25, 87)), boot(22, 96))
    leg_front = comp(limb([(36, 79), (41, 85), (40.5, 92)], 1.9, joint=(41, 85)), boot(40.5, 94))
    pads = comp(hover(22, 99), hover(40.5, 97.5))
    arm_front = comp(limb([(39, 58), (45, 62), (49, 61)], 1.6, joint=(45, 62)), claw(51, 61, 1))
    back = np.zeros((FH, FW, 4), np.uint8); M.helmet_back(back)
    a = comp(T, back, pads, leg_back, arm_back, leg_front, torso(), hd)
    M.helmet_front(a); a = comp(a, cone(), arm_front)
    return Image.fromarray(a), pal

# ---------------- v2 proportions (user feedback 31 Oct): body masks taken from the v6b generator, like NPC 1 / NPC 2
def v6b_masks():
    cfg = dict(body='m', skin='gfunk', hair='short', hc='black', top='tee_long', tc='paper', pants='trousers', pc='paper', shoes='boots', sc='black')
    o, L, pal = base6.render(cfg)
    return {k: np.array(L[k])[..., 3] == 255 for k in ('shirt', 'pants', 'shoes', 'arm_near', 'arm_far')}

def torso2(Mk):
    sh = Mk['shirt']; a = shade(sh, CHROME, spec=(24, 55), warm=False)
    for y in range(55, 61):                                          # boxy chest unit (same design, fits the v6b chest)
        for x in range(27, 38):
            c = CHROME[4] if (x in (27, 37) or y in (55, 60)) else CHROME[0] if (y == 56 and x < 32) else CHROME[1] if x < 32 else CHROME[2]
            put(a, x, y, c)
    for (x, y) in ((28, 57), (35, 57)):
        for dx, dy, c in ((0, 0, CHROME[4]), (1, 0, CHROME[3]), (0, 1, CHROME[3]), (1, 1, CHROME[2])): put(a, x + dx, y + dy, c)
    put(a, 28, 57, CHROME[0])
    for x in range(30, 34): put(a, x, 58, ORANGE[1] if x < 32 else ORANGE[2]); put(a, x, 59, ORANGE[3])
    ringm = disk(32.0, 64.5, 4.2) & ~disk(32.0, 64.5, 2.7)          # glass-marble porthole
    a = comp(a, shade(ringm, GLASSD[1:] + [GLASSD[4]], bias=.25))
    a = comp(a, shade(disk(32.0, 64.5, 2.7), GLASSD, spec=(31, 63), bias=.05)); put(a, 31, 64, GLASSD[1]); put(a, 33, 66, GLASSD[1])
    return a

def legs2(Mk):
    pa = Mk['pants']; xs = np.nonzero(pa.any(0))[0]; py = int(np.nonzero(pa.any(1))[0][0]); mid = 32.5
    a = np.zeros((FH, FW, 4), np.uint8); yb = int(np.nonzero(pa.any(1))[0][-1])
    for side in (0, 1):
        m = pa.copy(); xx = np.arange(FW)[None, :]
        m &= (xx < mid) if side == 0 else (xx >= mid)
        l = shade(m, CHROME, warm=False)
        kn = py + 13                                                  # knee joint ring + segment bands every 4 px
        for y in range(py + 3, yb):
            row = np.nonzero(m[y])[0]
            if not len(row): continue
            if y in (kn - 1, kn + 1): tone = CHROME[3]
            elif y == kn: tone = None
            elif (y - py) % 4 == 0 and y < yb - 1: tone = CHROME[3]
            else: continue
            for x in row:
                if tone is None: put(l, x, y, CHROME[1] if x < row.mean() else CHROME[2])
                elif tuple(l[y, x, :3]) != tuple(CHROME[4]): put(l, x, y, tone)
            if tone is None: put(l, row[0], y, CHROME[2]); put(l, row[-1], y, CHROME[4]); put(l, row[0] + 1, y, CHROME[0])
        a = comp(a, l)
    bl = np.zeros((FH, FW, 4), np.uint8)
    for y in (py - 1, py):                                           # brass belt ring (2 rows, as in v2 suit())
        row = np.nonzero(Mk['shirt'][y] | pa[y])[0]
        for x in row: put(bl, x, y, BRASS[4] if x in (row[0], row[-1]) else (BRASS[1] if x < 30 else BRASS[2] if x < 36 else BRASS[3]) if y == py - 1 else BRASS[3])
    put(bl, row[0] + 1, py - 1, BRASS[0])
    return a, py, bl

def build():
    pal = {}; hd = head(pal); Mk = v6b_masks(); T = tank()
    sx = np.nonzero(Mk['shoes'].any(0))[0]; sy = np.nonzero(Mk['shoes'].any(1))[0]
    pa = Mk['pants']; xx = np.nonzero(pa.any(0))[0]
    fl, fr = (xx.min() + 31) / 2 + .5, (33 + xx.max()) / 2 + .5     # foot centres under each v6b leg
    fy = sy.min() + 1.5
    boots = comp(boot(fl, fy), boot(fr, fy)); pads = comp(hover(fl, sy.max() + .5), hover(fr, sy.max() + .5))
    lg, py, belt = legs2(Mk)
    # arms: v6b arm thickness (3 px) and length; near arm hangs (v6b arm_near mask), far arm reaches forward like v2's reach
    an = Mk['arm_near']; ay = np.nonzero(an.any(1))[0]
    arm_back = comp(shade(an, SUIT, spec=(22, int(ay.min()) + 1)), claw(23.0, ay.max() + 2.0, -1))
    arm_front = comp(limb([(41, 56), (45, 61), (48, 64)], 1.5, joint=(45, 61)), claw(50, 64, 1))
    back = np.zeros((FH, FW, 4), np.uint8); M.helmet_back(back)
    a = comp(T, back, pads, lg, boots, torso2(Mk), belt, arm_back, hd)
    M.helmet_front(a); a = comp(a, cone(), arm_front)
    return Image.fromarray(a), pal

# ---------------- v3 (user feedback 31 Oct): no ears, tank on the back + straps, 4 views, expressions, float idle/move
CFG = dict(body='m', skin='gfunk', hair='short', hc='black', top='tee_long', tc='paper', pants='trousers', pc='paper', shoes='boots', sc='black')
def v6b(view):
    o, L, pal = base6.render(CFG, d=view); M.bald(L, pal)
    Mk = {k: np.array(L[k])[..., 3] == 255 for k in ('shirt', 'pants', 'shoes', 'arm_near', 'arm_far')}
    h = comp(L['body'], L['hair_front']); h[54:] = 0
    return h, Mk, pal
def unear_se(h, pal):
    """erase the v6b ear (x22-27, y44-49) and close the skull edge with the skin edge tone"""
    edge = {44: 23, 45: 23, 46: 24, 47: 25, 48: 26, 49: 27}
    for y, ex in edge.items():
        for x in range(20, 29):
            if x < ex: h[y, x, 3] = 0
            elif x == ex: h[y, x, :3] = pal['K7']; h[y, x, 3] = 255
            elif h[y, x, 3] and tuple(h[y, x, :3]) in (tuple(pal['Ka']), tuple(pal['Kh']), tuple(pal['K7'])) and x < 28: h[y, x, :3] = pal['Ki']
    for (x, y) in ((23, 50), (24, 51), (25, 52), (42, 51), (41, 52)): h[y, x, 3] = 0           # skull cheeks / narrow jaw
    for (x, y) in ((27, 50), (26, 50), (28, 51), (40, 52), (41, 51)):
        if h[y, x, 3]: h[y, x, :3] = pal['K7']
    return h
def unear_ne(h, pal):
    for x in range(20, 46):
        if not (29 <= x <= 35): h[48, x, 3] = 0
        if h[47, x, 3] and not (29 <= x <= 35): h[47, x, :3] = pal['K7']
    for y in (45, 46): h[y, 42, 3] = 0; h[y, 41, :3] = pal['K7']
    return h

def eye_big(f, small_glow=False):
    for y in range(42, 48):
        for x in range(27, 33):
            if ((x - 29.5) / 3.1) ** 2 + ((y - 44.5) / 3.1) ** 2 <= 1:
                d = math.hypot(x + .5 - 30, y + .5 - 45)
                put(f, x, y, EYE['rim'] if d > 2.2 else EYE['iris'] if (d > 1.0 or small_glow) else EYE['glow'])
    if small_glow: put(f, 29, 44, EYE['glow'])
    put(f, 28, 43, M.SPEC)
def eye_small(f):
    for y in range(43, 47):
        for x in range(36, 40):
            if ((x - 37.5) / 2.1) ** 2 + ((y - 44.5) / 2.1) ** 2 <= 1:
                put(f, x, y, EYE['rim'] if (x in (36, 39) or y in (43, 46)) else EYE['iris'])
    put(f, 37, 44, EYE['glow'])
EXPRS = ('neutral', 'happy', 'surprised', 'angry', 'sleepy')
def face_se(h, pal, expr='neutral'):
    f = h.copy(); K, D, T = pal['K7'], hx('#1C2330'), hx('#B9C0CC'); S = pal['Ki']
    if expr != 'sleepy': eye_big(f, small_glow=(expr == 'surprised')); eye_small(f)
    put(f, 34, 47, K)                                                 # nasal slit
    brow_y = 39 if expr == 'surprised' else 40
    if expr == 'angry':                                               # brows slant down to the centre, eyes squint
        for x in range(27, 33): put(f, x, 42, S)
        for x in range(36, 40): put(f, x, 43, S)
        for (x, y) in ((26, 40), (27, 40), (28, 41), (29, 41), (30, 42), (31, 42), (32, 42), (36, 43), (37, 42), (38, 42), (39, 41), (40, 41)): put(f, x, y, K)
        for x in range(27, 33): put(f, x, 43, EYE['rim'])
        for x in range(36, 40): put(f, x, 44, EYE['rim'])
    else:
        for x in (26, 27, 38, 39): put(f, x, brow_y, K)
    if expr == 'happy':                                               # cheeks push the eyes up into arcs
        for x in range(27, 33): put(f, x, 46, S); put(f, x, 47, S)
        for x in range(28, 32): put(f, x, 45, EYE['rim'])
        for x in range(36, 40): put(f, x, 46, S)
        for x in (37, 38): put(f, x, 45, EYE['rim'])
    if expr == 'sleepy':                                              # closed lids, a sliver of glow under the big one
        for x in range(27, 33): put(f, x, 45, K)
        for x in range(28, 32): put(f, x, 46, EYE['rim'])
        for x in range(36, 40): put(f, x, 45, K)
    # mouth
    if expr == 'surprised':
        for (x, y) in ((33, 49), (34, 49), (35, 49), (33, 50), (34, 50), (35, 50), (34, 51)): put(f, x, y, D)
        put(f, 33, 51, K); put(f, 35, 51, K)
    elif expr == 'sleepy':
        for x in range(33, 37): put(f, x, 50, K)
    else:
        for x in range(31, 38): put(f, x, 50, D)
        for x in (32, 34, 36): put(f, x, 50, T)
        for x in range(32, 37): put(f, x, 51, K)
        if expr == 'happy': put(f, 30, 49, D); put(f, 38, 49, D)
        if expr == 'angry': put(f, 30, 51, D); put(f, 38, 51, D); put(f, 33, 49, K); put(f, 35, 49, K)
    return f

def tank_c(cx, top, bot, tint=None):
    """orange capsule tank centred on cx; `tint` = mask of pixels seen through the helmet glass (one tone darker)"""
    r = 6.0; body = disk(cx, top + r, r, r) | rect(int(cx - r + .5), int(top + r), int(cx + r - .5), int(bot - r)) | disk(cx, bot - r, r, r)
    a = shade(body, ORANGE, spec=(int(cx - r + 2), int(top + 3)))
    ys = np.nonzero(body.any(1))[0]; h = ys.max() - ys.min()
    for y in (int(ys.min() + h * .42), int(ys.min() + h * .42) + 1, int(ys.min() + h * .72), int(ys.min() + h * .72) + 1):
        xs = np.nonzero(body[y])[0]; first = y in (int(ys.min() + h * .42), int(ys.min() + h * .72))
        for x in xs: put(a, x, y, CHROME[4] if x in (xs[0], xs[-1]) else (CHROME[1] if x < cx else CHROME[2]) if first else CHROME[3])
    py = int(top + 7)
    a = comp(a, shade(disk(cx - .5, py + .5, 2.7), [hx('#FFFFFF'), hx('#E7EBF2'), hx('#E7EBF2'), hx('#B9C0CC'), hx('#8D97A8')]))
    for y in (py - 1, py, py + 1): put(a, int(cx - .5), y, CHROME[2])
    ax = int(cx - .5)
    for y in range(int(top) - 5, int(top)): put(a, ax, y, CHROME[2])
    for (x, y, c) in ((ax - 1, top - 7, RED[0]), (ax, top - 7, RED[1]), (ax - 1, top - 6, RED[1]), (ax, top - 6, RED[2])): put(a, int(x), int(y), c)
    for x in (ax - 1, ax, ax + 1): put(a, x, int(top) - 1, CHROME[3])
    if tint is not None:                                              # fake see-through glass: one ramp step darker, no blending
        dk = {tuple(ORANGE[i]): ORANGE[min(4, i + 2)] for i in range(5)}
        dk.update({tuple(CHROME[i]): CHROME[min(4, i + 1)] for i in range(5)}); dk[(255, 255, 255)] = hx('#B9C0CC'); dk[tuple(RED[0])] = RED[1]
        for y, x in zip(*np.nonzero(tint & (a[..., 3] == 255))):
            c = tuple(a[y, x, :3]); a[y, x, :3] = dk.get(c, c)
    return a

def bubble_mask():
    yy, xx = np.mgrid[0:FH, 0:FW]; return np.hypot(xx + .5 - M.CX, yy + .5 - M.CY) < M.R - .5

def straps_se(a):
    """two silver harness straps over the shoulders, either side of the chest unit"""
    for y in range(56, 64):
        put(a, 24, y, CHROME[3]); put(a, 25, y, CHROME[4])
        put(a, 39, y, CHROME[3]); put(a, 40, y, CHROME[4])
    put(a, 24, 63, CHROME[0]); put(a, 39, 63, CHROME[1])

def feet(Mk, pulse):
    sy = np.nonzero(Mk['shoes'].any(1))[0]; xx = np.nonzero(Mk['pants'].any(0))[0]
    fl, fr = (xx.min() + 31) / 2 + .5, (33 + xx.max()) / 2 + .5; fy = sy.min() + 1.5
    boots = comp(boot(fl, fy), boot(fr, fy))
    pads = comp(hover2(fl, sy.max() + .5, pulse), hover2(fr, sy.max() + .5, pulse))
    return boots, pads
def hover2(cx, cy, pulse):
    """hover rings; pulse 0 = outer ring bright, 1 = outer ring dim + wider, inner ring bright"""
    a = np.zeros((FH, FW, 4), np.uint8)
    def ell(rx, ry):
        return {(int(math.floor(cx + rx * math.cos(math.radians(k)))), int(math.floor(cy + ry * math.sin(math.radians(k))))) for k in range(360)}
    outer = (4.6, 2.0) if pulse == 0 else (5.0, 2.0)
    for x, y in ell(*outer): put(a, x, y, hx('#E7EBF2') if pulse == 0 else hx('#B9C0CC'))
    for x, y in ell(2.4, 1.0): put(a, x, y, hx('#B9C0CC') if pulse == 0 else hx('#E7EBF2'))
    put(a, int(cx), int(cy), EYE['iris'] if pulse == 0 else EYE['glow'])
    return a

def build3(view='se', expr='neutral', arm=0, pulse=0):
    """view in ('se','ne') - sw/nw are mirrors. arm = 0/1 pincer drift, pulse = 0/1 hover-ring pulse"""
    h, Mk, pal = v6b(view)
    lg, py, belt = legs2(Mk); boots, pads = feet(Mk, pulse)
    back = np.zeros((FH, FW, 4), np.uint8); M.helmet_back(back)
    if view == 'se':
        hd = face_se(unear_se(h, pal), pal, expr)
        T = tank_c(24.5, 31, 73, tint=bubble_mask())                     # on the back = up-left of the torso in se
        an = Mk['arm_near']; ay = np.nonzero(an.any(1))[0]
        arm_back = comp(shade(an, SUIT, spec=(22, int(ay.min()) + 1)), claw(23.0, ay.max() + 2.0 + arm, -1))
        arm_front = comp(limb([(41, 56), (45, 61), (48, 64 + arm)], 1.5, joint=(45, 61)), claw(50, 64 + arm, 1))
        t = torso2(Mk); straps_se(t)
        a = comp(back, T, pads, lg, boots, t, belt, arm_back, hd)
        M.helmet_front(a); a = comp(a, cone(), arm_front)
    else:                                                                 # back view: tank centred over the torso
        hd = unear_ne(h, pal)
        t = shade(Mk['shirt'], SUIT, spec=(24, 54), warm=False)
        T = tank_c(32.5, 44, 75)
        arms = []
        for k in ('arm_far', 'arm_near'):
            am = Mk[k]; ay = np.nonzero(am.any(1))[0]; xs = np.nonzero(am.any(0))[0]
            arms.append(comp(shade(am, SUIT, spec=(int(xs.min()), int(ay.min()) + 1)), claw(xs.mean() + .5, ay.max() + 2.0 + arm, -1)))
        a = comp(back, pads, lg, boots, t, belt, hd)
        M.helmet_front(a)
        # straps: from the neck ring down to the tank top on both shoulders
        for x0 in (26, 37):
            for y in range(56, 59): put(a, x0, y, CHROME[3]); put(a, x0 + 1, y, CHROME[4])
        a = comp(a, T, *arms, cone())
    return Image.fromarray(a)

LIFT = [6, 5, 4, 5]                    # idle float: up / mid / down / mid  (px above the pivot line)
SHADOW_RX = {6: 7.0, 5: 7.5, 4: 8.0}   # higher = smaller shadow
ARM = [0, 0, 1, 1]; PULSE = [0, 1, 0, 1]
def place(fig, lift, lean=0):
    o = np.zeros((FH, FW, 4), np.uint8); yy, xx = np.mgrid[0:FH, 0:FW]
    o[((xx + .5 - 32) / SHADOW_RX[lift]) ** 2 + ((yy + .5 - 100.5) / 2.0) ** 2 <= 1] = (0, 0, 0, 56)
    f = np.zeros((FH, FW, 4), np.uint8); src = np.array(fig)
    f[:FH - lift] = src[lift:]
    if lean:                                                          # lean toward the facing side: shear, 1 px per ~27 rows
        g = np.zeros_like(f)
        for y in range(FH):
            s = int(round(lean * max(0, 96 - lift - y) / 80))
            g[y, s:] = f[y, :FW - s] if s else f[y]
        f = g
    im = Image.fromarray(o); im.alpha_composite(Image.fromarray(f)); return im
def frames(view, kind='idle', expr='neutral'):
    base = 'se' if view in ('se', 'sw') else 'ne'; mir = view in ('sw', 'nw'); out = []
    for i in range(4):
        fr = place(build3(base, expr, ARM[i], PULSE[i]), LIFT[i], lean=2 if kind == 'move' else 0)
        out.append(fr.transpose(Image.FLIP_LEFT_RIGHT) if mir else fr)
    return out

# ---------------- v4 (user feedback 31 Oct): activity poses built on the game's own v6b pose rows
import live_v6b as lv
def posed(view, anim, f):
    """generator masks for a pose row (pants / shoes / arms) + the hand pixels (skin tones inside the arm layers)"""
    o, L, pal = base6.render(CFG, f=f, d=view, anim=anim)
    skin = {tuple(v) for k, v in pal.items() if k.startswith('K') and isinstance(v, tuple)}
    Mk = {k: np.array(L[k])[..., 3] == 255 for k in ('pants', 'shoes', 'arm_near', 'arm_far')}
    for k in ('arm_near', 'arm_far'):
        a = np.array(L[k]); Mk[k + '_hand'] = Mk[k] & np.array([[tuple(p[:3]) in skin for p in row] for row in a])
    return Mk
def arm_with_claw(Mk, k, view, anim):
    am, hm = Mk[k] & ~Mk[k + '_hand'], Mk[k + '_hand']
    if not am.any(): return np.zeros((FH, FW, 4), np.uint8)
    xs = np.nonzero(am.any(0))[0]; ys = np.nonzero(am.any(1))[0]
    a = shade(am, SUIT, spec=(int(xs.min()), int(ys.min()) + 1))
    if hm.any():
        hy, hx_ = np.nonzero(hm); cx, cy = hx_.mean() + .5, hy.mean() + .5
        fwd = view == 'se' and anim == 'sit_type'
        a = comp(a, claw(cx, cy, 1 if fwd else -1))
    return a
SEAT_SHADOW = lambda: ((lambda yy, xx: ((xx + .5 - 33) / 11) ** 2 + ((yy + .5 - 100.5) / 2.4) ** 2 <= 1)(*np.mgrid[0:FH, 0:FW]))
def zz(anim, f, view, mir):
    return lv.zzz_img(anim, f, view, mir)

def build_pose(view, anim, f, mir=False):
    """anim in game rows: sit, sit_type, sleep (seated nap), talk.  Upper body / helmet / tank are the approved Gfunk parts
    (the game keeps the seated upper body at standing height, SIT_D = 0); legs, boots and arms come from the pose row."""
    base = 'se' if view in ('se', 'sw') else 'ne'
    h, Mi, pal = v6b(base); P = posed(base, anim, f)
    Mk = dict(Mi); Mk['pants'] = P['pants']
    legs = shade(P['pants'], SUIT, warm=False); boots = shade(P['shoes'], CHROME, spec=None)
    _, py, belt = legs2(dict(Mk, pants=P['pants']))
    if anim == 'talk':                                                 # floating talk keeps the idle segmented legs + disc boots
        legs, py, belt = legs2(Mi); boots, _ = feet(Mi, 0)
    arms = [arm_with_claw(P, k, base, anim) for k in ('arm_far', 'arm_near')]
    back = np.zeros((FH, FW, 4), np.uint8); M.helmet_back(back)
    expr = 'sleepy' if anim == 'sleep' else ('happy' if anim == 'talk' and f in (1, 2) else 'neutral')
    if base == 'se':
        hd = face_se(unear_se(h, pal), pal, expr)
        if anim == 'sleep': hd = np.roll(np.roll(hd, 2, 0), 1, 1)       # head nods inside the bubble (game sleep: head drop)
        T = tank_c(24.5, 31, 73, tint=bubble_mask()); t = torso2(Mi); straps_se(t)
        a = comp(back, T, arms[0], legs, boots, t, belt, hd)
        M.helmet_front(a); a = comp(a, cone(), arms[1])
    else:
        hd = unear_ne(h, pal)
        if anim == 'sleep': hd = np.roll(hd, 2, 0)
        t = shade(Mi['shirt'], SUIT, spec=(24, 54), warm=False); T = tank_c(32.5, 44, 75)
        a = comp(back, legs, boots, t, belt, hd); M.helmet_front(a)
        for x0 in (26, 37):
            for y in range(56, 59): put(a, x0, y, CHROME[3]); put(a, x0 + 1, y, CHROME[4])
        a = comp(a, T, *arms, cone())
    o = np.zeros((FH, FW, 4), np.uint8); o[SEAT_SHADOW() if anim != 'talk' else disk(32, 100.5, 8, 2)] = (0, 0, 0, 56)
    if anim == 'talk':                                                 # talking while floating: idle lift + hover rings
        _, pads = feet(Mi, f % 2); fig = Image.fromarray(comp(pads, a))
        lift = LIFT[f]; o[...] = 0; o[disk(32, 100.5, SHADOW_RX[lift], 2)] = (0, 0, 0, 56)
        src = np.array(fig); g = np.zeros_like(src); g[:FH - lift] = src[lift:]; a = g
    im = Image.fromarray(o); im.alpha_composite(Image.fromarray(a))
    if mir: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if anim == 'sleep': im.alpha_composite(Image.fromarray(zz('sleep', f, base, mir)))   # letters never mirrored
    return im

def build_float_sleep(view, f, mir=False):
    """floating nap: idle float body, arms hanging (v6b idle arms), head nodded, closed eyes, game z-z, slow 2-frame bob"""
    base = 'se' if view in ('se', 'sw') else 'ne'
    h, Mk, pal = v6b(base); lg, py, belt = legs2(Mk); boots, pads = feet(Mk, f % 2)
    P = posed(base, 'idle', 0)
    arms = [arm_with_claw(P, k, base, 'idle') for k in ('arm_far', 'arm_near')]
    back = np.zeros((FH, FW, 4), np.uint8); M.helmet_back(back)
    if base == 'se':
        hd = np.roll(np.roll(face_se(unear_se(h, pal), pal, 'sleepy'), 2, 0), 1, 1)
        T = tank_c(24.5, 31, 73, tint=bubble_mask()); t = torso2(Mk); straps_se(t)
        a = comp(back, T, pads, arms[0], lg, boots, t, belt, hd); M.helmet_front(a); a = comp(a, cone(), arms[1])
    else:
        hd = np.roll(unear_ne(h, pal), 2, 0); t = shade(Mk['shirt'], SUIT, spec=(24, 54), warm=False); T = tank_c(32.5, 44, 75)
        a = comp(back, pads, lg, boots, t, belt, hd); M.helmet_front(a)
        for x0 in (26, 37):
            for y in range(56, 59): put(a, x0, y, CHROME[3]); put(a, x0 + 1, y, CHROME[4])
        a = comp(a, T, *arms, cone())
    lift = (5, 4)[f]; z = np.roll(np.array(zz('sleep', (0, 2)[f], base, mir)), -lift, 0)
    im = place(Image.fromarray(a), lift)
    if mir: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im.alpha_composite(Image.fromarray(z)); return im

POSES = [('sit', 4), ('sit_type', 4), ('sleep_seat', 4), ('sleep_float', 2), ('talk', 4)]
def pose_frames(pose, view):
    mir = view in ('sw', 'nw')
    if pose == 'sleep_float': return [build_float_sleep(view, f, mir) for f in range(2)]
    anim = 'sleep' if pose == 'sleep_seat' else pose
    return [build_pose(view, anim, f, mir) for f in range(4)]

# =====================================================================================================================
# YERBIES overrides (built on the Gfunk pipeline; npc_gfunk/make_gfunk.py is copied, nothing in npc_gfunk is touched)
# orange suit + silver accents, plain white ball head (v6b head size), big left eye + 4 orange mouth holes, cream pack
# =====================================================================================================================
SUIT = ORANGE                                                         # suit ramp = Gfunk tank ramp (no new hexes)
WHITE = [hx('#FFFFFF'), hx('#FFFFFF'), hx('#E7EBF2'), hx('#B9C0CC'), hx('#8D97A8')]
CREAM = [hx('#EDE6D8'), hx('#EDE6D8'), hx('#D8C7A8'), hx('#BFA683'), hx('#94704F')]   # pack: #D8C7A8 #BFA683 new
YEYE = dict(rim=hx('#A9441F'), fill=hx('#E0662A'), lit=hx('#FF8A3D'), gloss=hx('#FFFFFF'))
HOLE = hx('#E0662A')
HCX, HCY, HR = 33.0, 43.0, 10.45                                     # ball = v6b head box (x22-43, y32-53)

def ball():
    return shade(disk(HCX, HCY, HR), WHITE, spec=(27, 36), bias=-.18)
def unear_se(h, pal): return h
def unear_ne(h, pal): return ball()
def oval(f, x0, y0, w, h_, big):
    cx, cy = x0 + w / 2, y0 + h_ / 2
    for y in range(y0, y0 + h_):
        for x in range(x0, x0 + w):
            u, v = (x + .5 - cx) / (w / 2), (y + .5 - cy) / (h_ / 2)
            if u * u + v * v <= 1:
                edge = u * u + v * v > (.45 if big else .3)
                put(f, x, y, YEYE['rim'] if edge else (YEYE['lit'] if (u < -.1 and v < .1) else YEYE['fill']))
    put(f, x0 + 2, y0 + 2, YEYE["gloss"])
BIG, SMALL = (24, 38, 7, 8), (36, 40, 4, 5)
MOUTH = [(29, 49), (31, 49), (33, 49), (35, 49)]
def face_se(h, pal, expr='neutral'):
    f = ball(); base = f.copy(); cover = lambda x, y: f.__setitem__((y, x), base[y, x])
    if expr != 'sleepy':
        oval(f, *BIG, True); oval(f, *SMALL, False)
    bx, by, bw, bh = BIG; sx, sy, sw, sh = SMALL
    mouth = list(MOUTH)
    if expr == 'happy':                                               # lower lids push up -> arcs; outer holes lift (smile)
        for x in range(bx, bx + bw):
            for y in range(by + 4, by + bh): cover(x, y)
        for x in range(sx, sx + sw):
            for y in range(sy + 3, sy + sh): cover(x, y)
        for x in range(bx + 1, bx + bw - 1): put(f, x, by + 4, YEYE['rim'])
        for x in range(sx + 1, sx + sw - 1): put(f, x, sy + 3, YEYE['rim'])
        mouth = [(29, 48), (31, 49), (33, 49), (35, 48)]
    if expr == 'surprised':                                           # holes open into a small ring
        mouth = [(32, 48), (31, 49), (33, 49), (32, 50)]
        put(f, bx + 2, by + 3, YEYE['gloss'])
    if expr == 'angry':                                               # top of both eyes cut on a slant toward the centre
        for x in range(bx, bx + bw):
            for y in range(by, by + 2 + (x - bx) // 2): cover(x, y)
        for x in range(sx, sx + sw):
            for y in range(sy, sy + 1 + (sx + sw - 1 - x) // 2): cover(x, y)
        mouth = [(29, 50), (31, 49), (33, 49), (35, 50)]
    if expr == 'sleepy':
        for x in range(bx, bx + bw): put(f, x, by + 4, YEYE['rim'])
        for x in range(sx, sx + sw): put(f, x, sy + 3, YEYE['rim'])
    for (x, y) in mouth: put(f, x, y, HOLE)
    return f

def collar(a):                                                        # thin silver collar ring (the v2 neck ring, no bubble)
    for y, row in ((52, 1), (53, 0), (54, 2), (55, 3)):
        for x in range(23, 43):
            if y == 52 and not (25 <= x <= 40): continue
            c = M.MET[row]
            if row in (0, 1) and x >= 38: c = M.MET[row + 1]
            if x in (23, 42) and y > 52: c = M.MET[3]
            put(a, x, y, c)
M.helmet_back = lambda a: None
M.helmet_front = collar
def cone(): return np.zeros((FH, FW, 4), np.uint8)

def canister(a, x0, y0, h_):
    """small glass canister: copper cap, glass body (cool greys), one highlight"""
    for x in range(x0, x0 + 3): put(a, x, y0, BRASS[2] if x < x0 + 2 else BRASS[4])
    for y in range(y0 + 1, y0 + h_):
        put(a, x0, y, CHROME[1]); put(a, x0 + 1, y, CHROME[2]); put(a, x0 + 2, y, CHROME[3])
    put(a, x0, y0 + 1, CHROME[0])
    for x in range(x0, x0 + 3): put(a, x, y0 + h_, CHROME[4])
def tank_c(cx, top, bot, tint=None):
    """Yerbies backpack: boxy cream/tan pack. se (cx<30): up-left behind the torso, 2 canisters on top, round nozzle at the
    bottom. ne (back view): centred box with the round planet window and a canister on each side."""
    a = np.zeros((FH, FW, 4), np.uint8)
    if cx < 30:
        # v3 (31 Oct): the SAME pack as the ne view (box 20x27, side canisters 3x10, nozzle 6x3), seen from the front side:
        # centred on the back, offset 4 px up-left (the back side in se) so it sits behind the torso / shoulders
        dx, dy = -4, -4
        box = rect(23 + dx, 50 + dy, 42 + dx, 76 + dy); a = shade(box, CREAM, spec=(24 + dx, 51 + dy))
        for x in range(24 + dx, 42 + dx): put(a, x, 50 + dy, CREAM[0])
        canister(a, 20 + dx, 56 + dy, 9); canister(a, 43 + dx, 56 + dy, 9)
        for x in range(23 + dx, 43 + dx): put(a, x, 76 + dy, CREAM[4])
        nz = disk(32.5 + dx, 79.0 + dy, 3.0, 1.6); a = comp(a, shade(nz, CHROME, spec=(31 + dx, 78 + dy)))
    else:
        box = rect(23, 50, 42, 76); a = shade(box, CREAM, spec=(24, 51))
        for x in range(24, 42): put(a, x, 50, CREAM[0])
        ring = disk(32.5, 62.5, 5.2) & ~disk(32.5, 62.5, 3.6); a = comp(a, shade(ring, CHROME, spec=(30, 58)))
        pl = disk(32.5, 62.5, 3.6); a = comp(a, shade(pl, [ORANGE[1], ORANGE[1], ORANGE[2], ORANGE[3], ORANGE[4]], bias=.1))
        put(a, 31, 61, ORANGE[0]); put(a, 34, 64, ORANGE[3])
        canister(a, 20, 56, 9); canister(a, 43, 56, 9)
        for x in range(23, 43): put(a, x, 76, CREAM[4])
        nz = disk(32.5, 79.0, 3.0, 1.6); a = comp(a, shade(nz, CHROME, spec=(31, 78)))
    return a

def torso2(Mk):
    sh = Mk['shirt']; a = shade(sh, SUIT, spec=(24, 55))
    for y in range(55, 61):                                          # silver control panel: dial, knob, two red bars
        for x in range(27, 38):
            c = CHROME[4] if (x in (27, 37) or y in (55, 60)) else CHROME[0] if (y == 56 and x < 32) else CHROME[1] if x < 32 else CHROME[2]
            put(a, x, y, c)
    for dx, dy, c in ((0, 0, CHROME[3]), (1, 0, CHROME[4]), (0, 1, CHROME[4]), (1, 1, CHROME[3]), (2, 0, CHROME[4]), (2, 1, CHROME[4])): put(a, 28 + dx, 57 + dy, c)
    put(a, 29, 57, CHROME[0])                                        # dial
    put(a, 35, 57, CHROME[4]); put(a, 34, 57, CHROME[3])             # knob
    for x in (32, 33): put(a, x, 59, RED[1])
    for x in (35, 36): put(a, x, 59, RED[1])
    put(a, 33, 59, RED[2]); put(a, 36, 59, RED[2])
    ringm = disk(32.0, 64.5, 4.4) & ~disk(32.0, 64.5, 2.8)           # big silver-ringed porthole, pale glass
    a = comp(a, shade(ringm, CHROME, spec=(29, 61)))
    a = comp(a, shade(disk(32.0, 64.5, 2.8), [hx('#FFFFFF'), hx('#E7EBF2'), hx('#B9C0CC'), hx('#8D97A8'), hx('#5A6577')], spec=(31, 63)))
    return a

def legs2(Mk):
    pa = Mk['pants']; py = int(np.nonzero(pa.any(1))[0][0]); mid = 32.5
    a = np.zeros((FH, FW, 4), np.uint8); yb = int(np.nonzero(pa.any(1))[0][-1])
    for side in (0, 1):
        m = pa.copy(); xx = np.arange(FW)[None, :]
        m &= (xx < mid) if side == 0 else (xx >= mid)
        l = shade(m, SUIT); kn = py + 13
        for y in range(py + 3, yb + 1):
            row = np.nonzero(m[y])[0]
            if not len(row): continue
            if y in (kn, yb - 1):                                    # silver knee + ankle rings
                for x in row: put(l, x, y, CHROME[1] if x < row.mean() else CHROME[2])
                put(l, row[-1], y, CHROME[4]); put(l, row[0], y, CHROME[2])
            elif y in (kn - 1, kn + 1, yb - 2) or ((y - py) % 4 == 0 and y < yb - 2):
                for x in row:
                    if tuple(l[y, x, :3]) != tuple(SUIT[4]): put(l, x, y, SUIT[3])
        a = comp(a, l)
    bl = np.zeros((FH, FW, 4), np.uint8)
    for y in (py - 1, py):                                           # silver belt (ref: silver belt, not brass)
        row = np.nonzero(Mk['shirt'][y] | pa[y])[0]
        for x in row: put(bl, x, y, CHROME[4] if x in (row[0], row[-1]) else (CHROME[0] if x < 27 else CHROME[1] if x < 36 else CHROME[2]) if y == py - 1 else CHROME[3])
    return a, py, bl

def hover2(cx, cy, pulse):
    """glowing ORANGE hover rings (ref 2); pulse swaps outer / inner brightness"""
    a = np.zeros((FH, FW, 4), np.uint8)
    ell = lambda rx, ry: {(int(math.floor(cx + rx * math.cos(math.radians(k)))), int(math.floor(cy + ry * math.sin(math.radians(k))))) for k in range(360)}
    for x, y in ell(*((4.6, 2.0) if pulse == 0 else (5.0, 2.0))): put(a, x, y, ORANGE[1] if pulse == 0 else ORANGE[2])
    for x, y in ell(2.4, 1.0): put(a, x, y, hx('#FFD166') if pulse == 0 else ORANGE[1])
    put(a, int(cx), int(cy), hx('#FFD166'))
    return a

def straps_se(a):                                                    # silver straps over both shoulders
    for y in range(56, 63):
        put(a, 24, y, CHROME[2]); put(a, 25, y, CHROME[3])
        put(a, 39, y, CHROME[2]); put(a, 40, y, CHROME[3])
    put(a, 24, 56, CHROME[0]); put(a, 39, 56, CHROME[1])

if __name__ == '__main__':
    BG = (16, 20, 27, 255); S = 4; H = FH * S
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12); fb_ = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
    os.makedirs(f'{OUT}/frames', exist_ok=True); os.makedirs(f'{OUT}/expr', exist_ok=True)
    VIEWS = ('se', 'sw', 'ne', 'nw'); FR = {}
    for v in VIEWS:
        for kind in ('idle', 'move'):
            FR[v, kind] = frames(v, kind)
            for i, f in enumerate(FR[v, kind]): f.save(f'{OUT}/frames/yerbies_{v}_{kind}_f{i}.png')
        FR[v, 'idle'][0].save(f'{OUT}/yerbies_{v}.png')
    EX = {e: place(build3('se', e), LIFT[0]) for e in EXPRS}
    for e, f in EX.items(): f.save(f'{OUT}/expr/yerbies_se_{e}.png')
    def on_bg(f): c = Image.new('RGBA', (FW, FH), BG); c.alpha_composite(f); return c.convert('RGB').resize((FW * S, H), Image.NEAREST)
    def sheet(title, rows, path):
        n = max(len(r[1]) for r in rows); W = 16 + n * (FW * S + 12); sh = Image.new('RGBA', (W, 40 + len(rows) * (H + 30)), BG); d = ImageDraw.Draw(sh)
        d.text((16, 8), title, fill=(231, 235, 242), font=fb_)
        for j, (rl, items) in enumerate(rows):
            y = 40 + j * (H + 30)
            for i, (lab, f) in enumerate(items):
                x = 16 + i * (FW * S + 12); sh.alpha_composite(f.resize((FW * S, H), Image.NEAREST), (x, y + 16))
                d.line([(x, y + 16 + 100 * S), (x + FW * S - 1, y + 16 + 100 * S)], fill=(42, 50, 66))
                d.text((x + 4, y + 2), (rl + '  ' if i == 0 and rl else '') + lab, fill=(141, 151, 168), font=font)
        sh.convert('RGB').save(path)
    sheet('YERBIES  ·  VIEWS  ·  4x  ·  64x112, pivot 32,100 (line = pivot y100)  ·  idle frame 0  ·  sw / nw are mirrors of se / ne  ·  no s or pure-side view in the v6b generator',
          [('', [(v, FR[v, 'idle'][0]) for v in VIEWS])], f'{OUT}/yerbies_views_4x.png')
    sheet('YERBIES  ·  EXPRESSIONS (se)  ·  4x  ·  eye / mouth / brow pixels only',
          [('', [(e, EX[e]) for e in EXPRS])], f'{OUT}/yerbies_expressions_4x.png')
    lab = ['f0 up', 'f1 mid', 'f2 down', 'f3 mid']
    sheet('YERBIES  ·  FLOAT ANIMATION  ·  4x  ·  idle = vertical bob 6/5/4/5 px, shadow 7/7.5/8/7.5 rx, pincer drift, ring pulse  ·  move = same + 2 px lean',
          [('idle se', [(l, f) for l, f in zip(lab, FR['se', 'idle'])]), ('move se', [(l, f) for l, f in zip(lab, FR['se', 'move'])]),
           ('idle ne', [(l, f) for l, f in zip(lab, FR['ne', 'idle'])]), ('move ne', [(l, f) for l, f in zip(lab, FR['ne', 'move'])])], f'{OUT}/yerbies_animation_4x.png')
    def gif(frs, path, ms):
        g = [on_bg(f) for f in frs]; g[0].save(path, save_all=True, append_images=g[1:], duration=ms, loop=0)
    gif(FR['se', 'idle'], f'{OUT}/yerbies_idle_se_4x.gif', 300); gif(FR['se', 'move'], f'{OUT}/yerbies_move_se_4x.gif', 200)
    allv = []                                                          # 4 views side by side, idle
    for i in range(4):
        c = Image.new('RGBA', (FW * 4, FH), BG)
        for j, v in enumerate(VIEWS): c.alpha_composite(FR[v, 'idle'][i], (j * FW, 0))
        allv.append(c.convert('RGB').resize((FW * 4 * S, H), Image.NEAREST))
    allv[0].save(f'{OUT}/yerbies_idle_4views_4x.gif', save_all=True, append_images=allv[1:], duration=300, loop=0)
    # reference comparison sheet (se/ne + 3 reference crops)
    refs = [('01M699F0ZHCPKAR3BYRRSVPPRB.jpg', (200, 300, 1615, 2560)), ('01M699EZG9G0YT0GAJ130GW1SX.jpg', (40, 40, 420, 640)), ('01M699EZBDGCSJKWKGNKQ5N8W4.jpg', (40, 40, 360, 440))]
    crops = []
    for fn, box in refs:
        # Historical /cursor/stores/ screenshots are optional comparison art.
        # Original pixel characters and animation frames render independently.
        if not os.path.isfile(REF + fn):
            continue
        im = Image.open(REF + fn).convert('RGB').crop(box)
        crops.append(im.resize((round(im.width * H / im.height), H), Image.LANCZOS))
    W = 16 + 6 * (FW * S + 12) + 36 + sum(c.width + 12 for c in crops)
    sh = Image.new('RGBA', (W, H + 64), BG); d = ImageDraw.Draw(sh)
    d.text((16, 8), 'YERBIES  ·  4x  ·  Yerbies se/sw/ne/nw idle f0  |  Gfunk se/ne  |  reference (original 3D art)', fill=(231, 235, 242), font=fb_); x = 16
    for v in VIEWS:
        sh.alpha_composite(FR[v, 'idle'][0].resize((FW * S, H), Image.NEAREST), (x, 40)); d.text((x + 4, 28), v, fill=(141, 151, 168), font=font); x += FW * S + 12
    x += 12
    for v in ('se', 'ne'):
        gf = Image.open(f'assets/npc_gfunk/gfunk_{v}.png').convert('RGBA')
        sh.alpha_composite(gf.resize((FW * S, H), Image.NEAREST), (x, 40)); d.text((x + 4, 28), f'Gfunk {v}', fill=(141, 151, 168), font=font); x += FW * S + 12
    x += 24
    for i, c in enumerate(crops): sh.paste(c, (x, 40)); d.text((x + 4, 28), f'ref {i + 1}', fill=(141, 151, 168), font=font); x += c.width + 12
    sh.convert('RGB').save(f'{OUT}/yerbies_vs_gfunk_vs_ref_4x.png')
    cols = set()
    for f in list(FR.values()) + [list(EX.values())]:
        for im in f: cols |= {tuple(p[:3]) for p in np.array(im).reshape(-1, 4) if p[3] == 255}
    print(len(cols), ' '.join(sorted('#%02X%02X%02X' % c for c in cols)))
    # ---- v4 poses
    os.makedirs(f'{OUT}/poses', exist_ok=True); PF = {}
    for pose, n in POSES:
        for v in VIEWS:
            PF[pose, v] = pose_frames(pose, v)
            for i, f in enumerate(PF[pose, v]): f.save(f'{OUT}/poses/yerbies_{pose}_{v}_f{i}.png')
    rows = [(f'{pose}', [(f'{v} f0', PF[pose, v][0]) for v in VIEWS] + [(f'se f{i}', PF[pose, 'se'][i]) for i in range(1, n)]) for pose, n in POSES]
    sheet('YERBIES  ·  POSES  ·  4x  ·  64x112, pivot 32,100 (line = y100)  ·  se/sw/ne/nw f0, then se frames  ·  sit rows use the game sit/sit_type/sleep legs + arms (SIT_D = 0)',
          rows, f'{OUT}/yerbies_poses_4x.png')
    for pose, n in POSES:
        ms = {'sleep_float': 600, 'sleep_seat': 400, 'talk': 300, 'sit_type': 200, 'sit': 400}[pose]
        g = []
        for i in range(n):
            c = Image.new('RGBA', (FW * 4, FH), BG)
            for j, v in enumerate(VIEWS): c.alpha_composite(PF[pose, v][i], (j * FW, 0))
            g.append(c.convert('RGB').resize((FW * 4 * S, H), Image.NEAREST))
        g[0].save(f'{OUT}/yerbies_{pose}_4views_4x.gif', save_all=True, append_images=g[1:], duration=ms, loop=0)
    pc = set()
    for fr in PF.values():
        for im in fr: pc |= {tuple(p[:3]) for p in np.array(im).reshape(-1, 4) if p[3] == 255}
    print('poses', len(pc), 'new vs v3:', sorted('#%02X%02X%02X' % c for c in pc - cols))
