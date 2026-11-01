#!/usr/bin/env python3
"""Virtual Life - NPC 'Manusia Silver' (living statue at a street junction), v6b style. PREVIEW ONLY, not integrated / not deployed.
Body, head, face, hair, idle + walk rows = the game's v6b generator (../npc_pak_ogah/job_common.render, same calls as npc_v6b.build)
with the skin ramp swapped for a cool silver ramp. Added here: shirt -> bare silver torso (pec / navel lines), khaki shorts
(pants below the knee -> silver legs), dark belt, silver feet, left-lit cool highlights + sky-blue rim glints, custom statue
arms, bow (receive money), wooden crate + money tin props. sw / nw = mirrors (as the game)."""
import os, sys, math
sys.path.insert(0, 'assets/npc_pak_ogah')
from job_common import *
import make_npcs_v2 as M
OUT = os.path.dirname(os.path.abspath(__file__)); NM = 'manusia_silver'
SILVER = [hx(c) for c in ('#E7EBF2', '#B9C0CC', '#A9B1BF', '#8D97A8', '#5A6577', '#3A4458')]   # v6b paper / lgrey / silver hair / chrome greys
GLINT = hx('#FFFFFF'); RIM = hx('#7FB2DE')                                                     # spec white + pal6 'sky' cool rim
SK = {'i': '#B9C0CC', 'h': '#A9B1BF', 'e': '#8D97A8', 'a': '#8D97A8', '7': '#5A6577', '5': '#3A4458'}
N = dict(body='m', skin='light', hair='short', hc='silver', top='tee', tc='paper', pants='trousers', pc='walnutlt', shoes='shoes', sc='grey')
WOOD = [hx(c) for c in ('#94704F', '#94704F', '#6B4F3A', '#5E4636', '#3D2A1E')]
BRASS = [hx(c) for c in ('#FFD166', '#E0A526', '#C99A2E', '#8A6A24', '#6B5320')]
TIN = [hx(c) for c in ('#E7EBF2', '#B9C0CC', '#8D97A8', '#5A6577', '#3A4458')]
BELT = [hx('#2A3242'), hx('#1C2330')]
SILV = {tuple(c) for c in SILVER} | {GLINT, RIM}
LIFT = 11                                                                                      # standing on the crate: body 11 px up

def is_sil(a): return np.array([[tuple(p[:3]) in SILV and p[3] == 255 for p in r] for r in a])

def layers(view, anim, f):
    L, pal, bob = render(N, anim, f, view, skin_ramp=SK)
    tmp = {k: Image.fromarray(v) for k, v in L.items()}; M.bald(tmp, pal)       # painted bald head: hair silhouette -> silver dome
    L['hair_front'] = np.array(tmp['hair_front']); L['brows'] = np.array(tmp['brows'])
    if view == 'ne': L['hair_front'] = back_head(L['hair_front'])
    L0, _, _ = render(N, 'idle', 0, view, skin_ramp=SK)
    dy = bbox(L['shirt'])[1] - bbox(L0['shirt'])[1]
    sh = L['shirt']; m = sh[..., 3] == 255
    sh = remap(sh, m, SILVER[1:5])                                     # tee -> bare silver torso (keeps the generator's shading)
    if view == 'se':                                                   # pec line, sternum, navel
        for x in range(27, 32): put(sh, x, 61 + dy, SILVER[3])
        for x in range(34, 38): put(sh, x, 61 + dy, SILVER[4])
        put(sh, 32, 59 + dy, SILVER[3]); put(sh, 32, 60 + dy, SILVER[3]); put(sh, 32, 67 + dy, SILVER[4])
        for y in range(63 + dy, 66 + dy): put(sh, 31, y, SILVER[3])
    else:
        for y in range(57 + dy, 68 + dy): put(sh, 32, y, SILVER[3])      # spine
        for x in (28, 29, 36, 37): put(sh, x, 59 + dy, SILVER[3])        # shoulder blades
    L['shirt'] = sh
    pa = L['pants']; yy = np.mgrid[0:FH, 0:FW][0]
    legm = (pa[..., 3] == 255) & (yy >= 86); pa = remap(pa, legm, SILVER[1:6])
    top = bbox(pa)[1]
    for y, c in ((top, BELT[0]), (top + 1, BELT[1])):
        xs = np.nonzero(pa[y, :, 3])[0]
        for x in xs: put(pa, x, y, c)
    if view == 'se': put(pa, 31, top, SILVER[0]); put(pa, 32, top, SILVER[2]); put(pa, 31, top + 1, SILVER[3])   # buckle
    for y in (86, 87):                                                  # shorts hem: one darker khaki row above the knee
        pass
    L['pants'] = pa
    so = L['shoes']; L['shoes'] = remap(so, so[..., 3] == 255, SILVER[1:5])     # painted bare feet
    return L, pal, dy

def back_head(hf):
    """v2: back-view head = round skull (ellipse fitted to the generator head box, bottom tapered into the neck), sphere-shaded
    left-lit with the silver ramp, spec px top-left, small ears; replaces the boxy bald() dome of v1"""
    x0, y0, x1, y1 = bbox(hf); cx = (x0 + x1 + 1) / 2; rx = (x1 - x0 + 1) / 2; cy = y0 + 9.6; ry = 9.8
    yy, xx = np.mgrid[0:FH, 0:FW]; nx = (xx + .5 - cx) / rx; ny = (yy + .5 - cy) / ry; m = nx ** 2 + ny ** 2 <= 1
    a = np.zeros((FH, FW, 4), np.uint8); pad = np.pad(m, 1)
    for y, x in zip(*np.nonzero(m)):
        z = math.sqrt(max(0., 1 - nx[y, x] ** 2 - ny[y, x] ** 2)); l = -.55 * nx[y, x] - .45 * ny[y, x] + .55 * z
        edge = not (pad[y, x + 1] and pad[y + 2, x + 1] and pad[y + 1, x] and pad[y + 1, x + 2])
        c = SILVER[0] if l > .72 else SILVER[1] if l > .38 else SILVER[2] if l > .12 else SILVER[3] if l > -.15 else SILVER[4]
        if edge and (nx[y, x] > .2 or ny[y, x] > .5): c = SILVER[4] if ny[y, x] < .5 else SILVER[5]
        a[y, x, :3] = c; a[y, x, 3] = 255
    put(a, int(cx - rx * .45), int(cy - ry * .55), GLINT)
    ey = int(cy + 2)                                                    # ears
    for (x, c) in ((int(cx - rx) - 1, SILVER[2]), (int(cx + rx), SILVER[4])):
        put(a, x, ey, c); put(a, x, ey + 1, SILVER[3] if c == SILVER[2] else SILVER[5])
    return a

ARAMP = None
def hand_mask(kind, p, d):
    hx_, hy_ = p; dx, dy_ = d; n = math.hypot(dx, dy_) or 1; dx, dy_ = dx / n, dy_ / n
    m = disk(hx_, hy_, 1.75)
    if kind == 'open':  m |= tube([(hx_, hy_), (hx_ + dx * 2.6, hy_ + dy_ * 2.6)], 1.25)          # flat fingers
    if kind == 'point': m |= tube([(hx_, hy_), (hx_ + dx * 3.6, hy_ + dy_ * 3.6)], .55)            # index finger
    return m

def seg_shade(P, Q, r, tones):
    """one limb segment, shaded across its width like the generator arms: lit side (screen left / top) light, centre mid,
    far side dark; silhouette px = edge tones (lit-side edge one step lighter than the shadow-side edge). tones: light, mid, dark, edge_l, edge_r"""
    m = tube([P, Q], r); a = np.zeros((FH, FW, 4), np.uint8); pad = np.pad(m, 1)
    dx, dy_ = Q[0] - P[0], Q[1] - P[1]; L_ = math.hypot(dx, dy_) or 1; ux, uy = dx / L_, dy_ / L_
    nx, ny = -uy, ux
    if nx > 0 or (abs(nx) < 1e-6 and ny > 0): nx, ny = -nx, -ny             # normal towards the light (left / up)
    for y, x in zip(*np.nonzero(m)):
        px, py = x + .5 - P[0], y + .5 - P[1]; t = max(0, min(L_, px * ux + py * uy))
        sd = ((px - ux * t) * nx + (py - uy * t) * ny) / r
        edge = not (pad[y, x + 1] and pad[y + 2, x + 1] and pad[y + 1, x] and pad[y + 1, x + 2])
        if edge: c = tones[3] if sd > 0 else tones[4]
        else: c = tones[0] if sd > .3 else tones[1] if sd > -.35 else tones[2]
        a[y, x, :3] = c; a[y, x, 3] = 255
    return a

LT = (SILVER[1], SILVER[2], SILVER[3], SILVER[3], SILVER[4])            # limb tones (same silver ramp, darker edges vs. torso)
def limb(S, E, W, hk='fist', hp=None, hd=(0, -1)):
    """v2 arm: shoulder cap + upper arm (r 1.7) + forearm (r 1.4) shaded across the width like the v6b arms, simple hand
    (fist / open fingers / index finger); elbow = joint px one tone darker. edge = darker silver of the same part, no outline"""
    hp = hp or W
    o = Image.fromarray(shade(disk(S[0], S[1] + .5, 2.3), (SILVER[0], SILVER[1], SILVER[2], SILVER[3], SILVER[4])))   # deltoid
    o.alpha_composite(Image.fromarray(seg_shade(S, E, 1.7, LT)))
    o.alpha_composite(Image.fromarray(seg_shade(E, W, 1.4, LT)))
    hx_, hy_ = hp; dx, dy_ = hd; n = math.hypot(dx, dy_) or 1; dx, dy_ = dx / n, dy_ / n
    if hk == 'open': o.alpha_composite(Image.fromarray(seg_shade((hx_, hy_), (hx_ + dx * 2.4, hy_ + dy_ * 2.4), 1.25, LT)))
    o.alpha_composite(Image.fromarray(shade(disk(hx_, hy_, 1.7), (SILVER[0], SILVER[1], SILVER[2], SILVER[3], SILVER[4]), bias=-.05)))
    a = np.array(o)
    if hk == 'point':
        for k in (2, 3, 4): put(a, int(hx_ + dx * k), int(hy_ + dy_ * k), SILVER[2] if k < 4 else SILVER[3])
    if hk == 'fist': put(a, int(hx_ + .5), int(hy_ + .8), SILVER[3])        # knuckle line
    put(a, int(E[0]), int(E[1]), SILVER[4])                               # elbow joint
    return a

def arm(pts, palm=False, point=False):
    ramp = [SILVER[0], SILVER[1], SILVER[2], SILVER[3], SILVER[4]]
    a = shade(tube(pts, 1.6), ramp)
    hx_, hy_ = pts[-1]
    if palm:
        hm = np.zeros((FH, FW), bool); x0, y0 = int(hx_) - 1, int(hy_) - 2; hm[y0:y0 + 4, x0:x0 + 3] = True; hm[y0 - 1, x0:x0 + 3:2] = True
        h = shade(hm, ramp)
    else: h = shade(disk(hx_, hy_, 1.75), ramp)
    o = Image.fromarray(a); o.alpha_composite(Image.fromarray(h)); a = np.array(o)
    if point:                                                          # index finger along the arm direction
        (x0, y0), (x1, y1) = pts[-2], pts[-1]; d = math.hypot(x1 - x0, y1 - y0); ux, uy = (x1 - x0) / d, (y1 - y0) / d
        for k in (2, 3): put(a, int(x1 + ux * k), int(y1 + uy * k), SILVER[1])
    return a

def glints(a):
    """left-lit: 1 px in from each silver run's left edge -> highlight; right-most px of wide runs -> sky rim glint (sparse)"""
    s = is_sil(a); o = a.copy()
    for y in range(FH):
        xs = np.nonzero(s[y])[0]
        if not len(xs): continue
        runs = np.split(xs, np.nonzero(np.diff(xs) > 1)[0] + 1)
        for r in runs:
            if len(r) >= 4 and lum(a[y, r[1], :3]) >= lum(SILVER[2]) - 1: o[y, r[1], :3] = SILVER[0]
            if len(r) >= 6 and y % 4 == 1: o[y, r[-2], :3] = RIM
    return o

def bow_lean(a, b, dxh, neck=54, hip=70):
    """v2 bow: head + neck block (rows < neck) move RIGIDLY (b down, dxh forward) - no head compression; the torso between
    neck and hip slides with a linear offset (foreshortened lean); legs stay"""
    o = np.zeros_like(a); o[hip:] = a[hip:]
    order = range(hip - 1, -1, -1) if dxh >= 0 else range(0, hip)       # se: head drawn over the chest; ne (away): shoulders over the head
    for y in order:
        t = 1. if y < neck else (hip - y) / (hip - neck)
        dy = int(round(b * t)); dx = int(round(dxh * t)); row = np.roll(a[y], dx, axis=0); ny = y + dy
        if 0 <= ny < FH: m = row[:, 3] > 0; o[ny][m] = row[m]
    return o

def bow_shear(a, b, fwd, hip=70):
    """bend the upper body forward: rows above the hip move down b*(t) and forward fwd*b*0.7*(t), t = 0 at hip .. 1 at the head top"""
    o = np.zeros_like(a)
    o[hip:] = a[hip:]
    for y in range(hip - 1, -1, -1):
        t = (hip - y) / 40; dy = int(round(b * t)); dx = int(round(fwd * b * .75 * t))
        row = np.roll(a[y], dx, axis=0)
        ny = y + dy
        if 0 <= ny < FH:
            m = row[:, 3] > 0; o[ny][m] = row[m]
    return o

def crate(cx=32, cy=89, hw=12, hh=5, Hh=6):
    """low wooden crate (iso box): top lit, left face mid, right face dark; plank seams; edge = darkest wood, no outline"""
    from PIL import ImageDraw
    def poly(pts):
        im = Image.new('L', (FW, FH)); ImageDraw.Draw(im).polygon(pts, fill=255); return np.array(im) > 0
    top = poly([(cx - hw, cy), (cx, cy - hh), (cx + hw - 1, cy), (cx, cy + hh)])
    lf = poly([(cx - hw, cy), (cx, cy + hh), (cx, cy + hh + Hh), (cx - hw, cy + Hh)]) & ~top
    rt = poly([(cx, cy + hh), (cx + hw - 1, cy), (cx + hw - 1, cy + Hh), (cx, cy + hh + Hh)]) & ~top & ~lf
    a = np.zeros((FH, FW, 4), np.uint8)
    for m, c in ((top, WOOD[0]), (lf, WOOD[2]), (rt, WOOD[3])): a[m, :3] = c; a[m, 3] = 255
    for y, x in zip(*np.nonzero(top)):                                   # plank seams across the top (parallel to the left-front edge)
        if (2 * (x - cx) - 4 * (y - cy)) % 10 == 0 and abs(x - cx) < hw - 2: a[y, x, :3] = WOOD[2]
    for y, x in zip(*np.nonzero(lf | rt)):                               # one board seam on each side face
        yt = cy + hh - abs(x + .5 - cx) * hh / hw
        if int(y - yt) == Hh // 2: a[y, x, :3] = WOOD[3] if lf[y, x] else WOOD[4]
    for x in range(FW):                                                  # bottom edge + top rim
        ys = np.nonzero(a[:, x, 3])[0]
        if len(ys): a[ys.max(), x, :3] = WOOD[4]
        ys = np.nonzero(top[:, x])[0]
        if len(ys) and x < cx + hw - 1: a[ys.min(), x, :3] = WOOD[1] if x <= cx else WOOD[2]
    for y in range(FH):
        xs = np.nonzero(a[y, :, 3])[0]
        if len(xs): a[y, xs.max(), :3] = WOOD[4]
    for y in range(cy + hh, cy + hh + Hh): a[y, cx, :3] = WOOD[3]       # front corner
    return a

def tin(cx=47, base=99):
    """small money tin (open can) with a couple of brass coins on top"""
    a = np.zeros((FH, FW, 4), np.uint8)
    m = np.zeros((FH, FW), bool); m[base - 6:base, cx - 3:cx + 3] = True
    m |= disk(cx, base - .5, 3, 1.2); body = shade(m, TIN)
    a = body
    rim = disk(cx, base - 6, 3, 1.3)
    for y, x in zip(*np.nonzero(rim)): put(a, x, y, TIN[1] if x < cx else TIN[2])
    for y, x in zip(*np.nonzero(disk(cx, base - 6, 2, .8))): put(a, x, y, TIN[4])
    put(a, cx - 1, base - 6, BRASS[1]); put(a, cx, base - 6, BRASS[3]); put(a, cx - 3, base - 4, TIN[0])
    for y in range(base - 4, base - 1): put(a, cx - 3, y, TIN[1])
    return a

def tin_shadow(cx=47):
    yy, xx = np.mgrid[0:FH, 0:FW]; o = np.zeros((FH, FW, 4), np.uint8)
    o[((xx + .5 - cx) / 3.6) ** 2 + ((yy + .5 - 99.5) / 1.4) ** 2 <= 1] = (0, 0, 0, 56); return o

# statue arms v2: (shoulder, elbow, wrist, hand kind, hand pos, finger dir) in se coords; ne = flipped (65 - x).
# per pose: se -> (near, far, far_on_top), ne -> same with hands moved to the EDGE of the head so they stay visible from behind
SN, SF = (24, 57), (40.5, 57)
POSES = {
    'hands_face': {'se': ((SN, (17, 52), (25.5, 47.5), 'open', (28, 45.5), (1, -1)), (SF, (46.5, 51.5), (38.5, 47.5), 'open', (36, 45.5), (-1, -1)), True),
                   'ne': ((SN, (15.5, 51), (19.5, 45), 'open', (21, 42.5), (.3, -1)), (SF, (48.5, 51), (45, 45), 'open', (43.5, 42.5), (-.3, -1)), True)},
    'point_sky':  {'se': ((SN, (20, 49.5), (17.5, 43), 'point', (16.8, 40.8), (-.3, -1)), (SF, (45.5, 63), (41.5, 68.5), 'fist', (40.5, 69.5), (0, 1)), False),
                   'ne': ((SN, (20, 49.5), (17.5, 43), 'point', (16.8, 40.8), (-.3, -1)), (SF, (45.5, 63), (41.5, 68.5), 'fist', (40.5, 69.5), (0, 1)), False)},
    'salute':     {'se': ((SN, (16.5, 50.5), (24.5, 44.5), 'open', (27.5, 41.5), (1, -.3)), (SF, (41.5, 65), (42, 71.5), 'fist', (42, 73.5), (0, 1)), False),
                   'ne': ((SN, (16, 50.5), (19.5, 44), 'open', (21.5, 40.5), (1, -.6)), (SF, (41.5, 65), (42, 71.5), 'fist', (42, 73.5), (0, 1)), False)},
    'thinker':    {'se': ((SN, (25.5, 66.5), (30.5, 58), 'fist', (32, 54.5), (0, -1)), (SF, (40, 65), (34, 68), 'open', (30.5, 68.5), (-1, 0)), True),
                   'ne': ((SN, (16.5, 52), (19.5, 45.5), 'fist', (21, 43), (0, -1)), (SF, (45.5, 63), (41.5, 68.5), 'fist', (40.5, 69.5), (0, 1)), False)},
}
BOW_ARM = {2: (SN, (24.5, 64), (27.5, 69.5), 'open', (29.5, 71), (1, .2)), 3: (SN, (24.5, 64), (27.5, 69.5), 'open', (29.5, 71), (1, .2)),
           4: (SN, (24.5, 64), (27.5, 69.5), 'open', (29.5, 71), (1, .2)), 5: (SN, (25, 66), (29.5, 63), 'open', (31.5, 62), (1, -.3))}
def flipx(a): return np.roll(a[:, ::-1], 1, axis=1)

def build(view, kind, f=0):
    base = 'se' if view in ('se', 'sw') else 'ne'; mir = view in ('sw', 'nw')
    anim = kind if kind in ('idle', 'walk') else 'idle'
    L, pal, dy = layers(base, anim, f if kind in ('idle', 'walk') else 0)
    on_box = kind not in ('idle', 'walk')
    behind = [];  near = None; far = None
    far_top = False
    if kind.startswith('statue_'):
        nsp, fsp, far_top = POSES[kind[7:]][base]
        near = limb(*nsp); far = limb(*fsp)
        if base == 'ne': near, far = flipx(near), flipx(far)
        L['arm_near'] = np.zeros_like(L['arm_near']); L['arm_far'] = np.zeros_like(L['arm_far'])
    if kind == 'bow' and f in BOW_ARM:
        near = limb(*BOW_ARM[f])
        if f in (3, 4):                                                 # brass coin in the open palm
            for (x, y, c) in ((30, 69, BRASS[0]), (31, 69, BRASS[1]), (32, 69, BRASS[2]), (31, 70, BRASS[3])): put(near, x, y, c)
        if base == 'ne': far, near, far_top = flipx(near), None, False      # back view: the reaching arm is in front of the body -> behind the torso
        L['arm_near'] = np.zeros_like(L['arm_near'])
    lower = compose(L, ['shoes', 'pants', 'shoes_over', 'rips'])
    upper = Image.new('RGBA', (FW, FH))
    for k in ('hair_back', 'body', 'arm_far'): upper.alpha_composite(Image.fromarray(L[k]))
    if far is not None and not far_top: upper.alpha_composite(Image.fromarray(far))     # far arm behind the torso
    for k in ('shirt', 'outer', 'acc', 'arm_near', 'body_front', 'held', 'face', 'hair_front', 'glasses', 'brows'):
        if k in L: upper.alpha_composite(Image.fromarray(L[k]))
    if far is not None and far_top: upper.alpha_composite(Image.fromarray(far))         # raised to the face / head: in front
    if near is not None: upper.alpha_composite(Image.fromarray(near))
    up = np.array(upper)
    if kind == 'bow': up = bow_lean(up, [0, 2, 4, 5, 3, 0][f], [0, 1, 3, 3, 2, 0][f] * (1 if base == 'se' else -1))
    body = Image.fromarray(lower); body.alpha_composite(Image.fromarray(up))
    body = np.array(body)
    # recolour any leftover skin-mapped pixels (hands) the generator drew, then add the left-lit highlights / glints
    body = glints(body)
    im = Image.fromarray(shadow())
    if on_box:
        bd = np.roll(body, -LIFT, axis=0); bd[-LIFT:] = 0
        tinl = Image.fromarray(tin(47 if base == 'se' else 20, 99) if True else None)
        shd = np.maximum(shadow(), tin_shadow(47 if base == 'se' else 20)); im = Image.fromarray(shd)   # one flat shadow layer (alpha 56 only)
        if base == 'ne': im.alpha_composite(tinl)
        im.alpha_composite(Image.fromarray(crate())); im.alpha_composite(Image.fromarray(bd))
        if base == 'se': im.alpha_composite(tinl)
    else:
        im.alpha_composite(Image.fromarray(body))
    if mir: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im

VIEWS = ('se', 'sw', 'ne', 'nw')
ANIMS = [('idle', 4, 300), ('walk', 6, 150), ('bow', 6, 160)] + [(f'statue_{p}', 1, 0) for p in POSES]

if __name__ == '__main__':
    for d in ('frames', 'poses'): os.makedirs(f'{OUT}/{d}', exist_ok=True)
    FR = {}
    for kind, n, ms in ANIMS:
        for v in VIEWS:
            FR[v, kind] = [build(v, kind, i) for i in range(n)]
            for i, im in enumerate(FR[v, kind]): im.save(f'{OUT}/frames/{NM}_{v}_{kind}_f{i}.png')
    for v in VIEWS:
        FR[v, 'idle'][0].save(f'{OUT}/poses/{NM}_{v}_idle.png')
        for p in POSES: FR[v, f'statue_{p}'][0].save(f'{OUT}/poses/{NM}_{v}_statue_{p}.png')
        FR[v, 'bow'][3].save(f'{OUT}/poses/{NM}_{v}_bow_key.png')
    cr = Image.fromarray(shadow()); cr.alpha_composite(Image.fromarray(crate())); cr.save(f'{OUT}/poses/prop_crate.png')
    tn = Image.fromarray(tin_shadow(32)); tn.alpha_composite(Image.fromarray(tin(32, 99))); tn.save(f'{OUT}/poses/prop_money_tin.png')
    sheet('MANUSIA SILVER  ·  4x  ·  64x112, pivot 32,100  ·  v6b generator body, silver skin ramp  ·  statue poses on crate  ·  sw / nw = mirrors  ·  transparent',
          [(f'{k} {v}', [(f'f{i}', im) for i, im in enumerate(FR[v, k])]) for k in ('idle', 'walk', 'bow') for v in VIEWS] +
          [(v, [(p, FR[v, f'statue_{p}'][0]) for p in POSES]) for v in VIEWS] + [('props', [('crate', cr), ('money tin', tn)])],
          f'{OUT}/{NM}_sheet_4x.png')
    sheet('MANUSIA SILVER  ·  statue poses + bow (se)  ·  4x  ·  on dark bg', [('statue', [(p, FR['se', f'statue_{p}'][0]) for p in POSES]),
          ('bow', [(f'f{i}', im) for i, im in enumerate(FR['se', 'bow'])])], f'{OUT}/{NM}_work_se_4x_darkbg.png', bg=BG)
    sheet('MANUSIA SILVER  ·  statue poses + bow (ne / nw)  ·  4x  ·  on dark bg', [(v, [(p, FR[v, f'statue_{p}'][0]) for p in POSES]) for v in ('ne', 'nw')] +
          [(f'bow {v}', [(f'f{i}', im) for i, im in enumerate(FR[v, 'bow'])]) for v in ('ne', 'nw')], f'{OUT}/{NM}_work_ne_nw_4x_darkbg.png', bg=BG)
    for kind, n, ms in ANIMS[:3]:
        gif([strip([FR[v, kind][i] for v in VIEWS]) for i in range(n)], f'{OUT}/{NM}_{kind}_4views_4x.gif', ms)
    # statue loop: each frozen pose held, then a short bow (as a busker cycle)
    seq = []; dur = []
    for p in POSES: seq.append(strip([FR[v, f'statue_{p}'][0] for v in VIEWS]))
    gif(seq, f'{OUT}/{NM}_statue_poses_4views_4x.gif', 900)
    cols = set(); al = set()
    for fr in FR.values():
        for im in fr:
            a = np.array(im); cols |= {tuple(p[:3]) for p in a.reshape(-1, 4) if p[3] == 255}; al |= set(np.unique(a[..., 3]).tolist())
    print(len(cols), 'colours; alpha', sorted(al)); print(' '.join(sorted(H(c) for c in cols)))
