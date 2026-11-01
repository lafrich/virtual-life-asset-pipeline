#!/usr/bin/env python3
"""Virtual Office - NPC 'Gfunk' (ex-Zib) preview, v6b style. PREVIEW ONLY, not integrated.
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
        if 1 < s < L - 1 and int(s) % step == 0 and tuple(a[y, x, :3]) != tuple(CHROME[4]): a[y, x, :3] = CHROME[3] if tuple(a[y, x, :3]) != tuple(CHROME[3]) else CHROME[4]

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
    m = tube(pts, r); a = shade(m, CHROME, spec=spec, warm=True)
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
    for x, y in ell(6.0, 2.5): put(a, x, y, hx('#E7EBF2'))
    for x, y in ell(3.0, 1.0): put(a, x, y, hx('#B9C0CC'))
    put(a, int(cx), int(cy), EYE['iris'])
    return a
def boot(cx, cy):
    m = disk(cx, cy, 3.6, 1.3) | rect(int(cx) - 1, int(cy) - 3, int(cx) + 1, int(cy))
    return shade(m, CHROME, spec=(int(cx) - 2, int(cy)))

def torso():
    m = disk(32, 60, 9.2, 5.6) | rect(24, 60, 40, 72) | disk(32, 72, 8.0, 4.0)
    a = shade(m, CHROME, spec=(26, 57), warm=True)
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
    a = comp(shade(hip, CHROME, spec=(28, 77), warm=True), a)
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

if __name__ == '__main__':
    fig, pal = build()
    fa, fb = M.float_frame(fig, M.FLOAT[0]), M.float_frame(fig, M.FLOAT[1])
    fa.save(f'{OUT}/gfunk_se_A.png'); fb.save(f'{OUT}/gfunk_se_B.png')
    fa.transpose(Image.FLIP_LEFT_RIGHT).save(f'{OUT}/gfunk_sw_A.png'); fb.transpose(Image.FLIP_LEFT_RIGHT).save(f'{OUT}/gfunk_sw_B.png')
    st = Image.new('RGBA', (FW * 2, FH)); st.paste(fa, (0, 0)); st.paste(fb, (FW, 0)); st.save(f'{OUT}/gfunk_float_2f.png')
    BG = (16, 20, 27, 255); S = 4; fr = []
    for f in (fa, fb):
        c = Image.new('RGBA', (FW, FH), BG); c.alpha_composite(f); fr.append(c.convert('RGB').resize((FW * S, FH * S), Image.NEAREST))
    fr[0].save(f'{OUT}/gfunk_float_4x.gif', save_all=True, append_images=fr[1:], duration=333, loop=0)
    # preview sheet: se A, se B, sw A at 4x + 3 reference crops at the same height
    refs = [('01M69856CNYQSWV5WNJZAXQFKV.jpg', (250, 600, 2330, 3660)), ('01M69855SFXHNQD55BJ9XSWNMY.jpg', (290, 0, 1330, 2900)), ('01M69855P1D0HPMRD846456P8X.jpg', (60, 0, 1460, 2248))]
    H = FH * S; crops = []
    for fn, box in refs:
        im = Image.open(REF + fn).convert('RGB').crop(box); crops.append(im.resize((round(im.width * H / im.height), H), Image.LANCZOS))
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12); fb_ = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
    W = 16 + 3 * (FW * S + 12) + 24 + sum(c.width + 12 for c in crops) + 4
    sh = Image.new('RGBA', (W, H + 64), BG); d = ImageDraw.Draw(sh)
    d.text((16, 8), 'GFUNK  ·  v6b NPC preview  ·  4x  ·  64x112, pivot 32,100  ·  se A / se B / sw A   |   reference (original 3D art)', fill=(231, 235, 242), font=fb_)
    x = 16
    for lab, f in (('se  frame A', fa), ('se  frame B', fb), ('sw  frame A (mirror)', fa.transpose(Image.FLIP_LEFT_RIGHT))):
        sh.alpha_composite(f.resize((FW * S, H), Image.NEAREST), (x, 40)); d.text((x + 4, 28), lab, fill=(141, 151, 168), font=font)
        d.line([(x, 40 + 100 * S), (x + FW * S - 1, 40 + 100 * S)], fill=(42, 50, 66)); x += FW * S + 12
    x += 24
    for i, c in enumerate(crops):
        sh.paste(c, (x, 40)); d.text((x + 4, 28), f'ref {i + 1}', fill=(141, 151, 168), font=font); x += c.width + 12
    sh.convert('RGB').save(f'{OUT}/gfunk_preview_sheet_4x.png')
    cols = sorted({tuple(p[:3]) for p in np.array(fa).reshape(-1, 4) if p[3] == 255})
    print(len(cols), ' '.join('#%02X%02X%02X' % c for c in cols))
