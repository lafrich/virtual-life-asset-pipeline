"""riders v2: v6b office-NPC characters (seated pose rows) on the v1 scooter. 4 dirs x 4 frames per rider."""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import chars as ch, scoot as sc
DIRS = ['se', 'sw', 'ne', 'nw']
NF = 4
BODY_DY = [0, -1, 0, 0]          # scooter body suspension bob (px, up = -1); wheels stay on the ground
RIDER_DY = [0, -1, -1, 0]        # riders follow one frame later (soft lag)
PHASE = [0.0, np.pi / 8, 0.0, np.pi / 8]   # wheel spoke phase (4 spokes, 2 alternating states)
AX, AZ = 1.5, 2.0                # char pivot (32,100) sits at local (hip_x + AX, 0, AZ)

def P(**k): return k
OJ_G = P(body='m', skin='medium', hair='short', hc='black', top='hoodie', tc='gojek', inner='night', pants='trousers', pc='walnut', shoes='shoes', sc='night', helmet='gojek', logo='gojek')
OJ_M = P(body='m', skin='deep', hair='short', hc='black', top='hoodie', tc='maxim', inner='night', pants='trousers', pc='night', shoes='shoes', sc='night', helmet='maxim', logo='maxim')
PAX_G = P(body='f', skin='light', hair='long', hc='black', top='tee_long', tc='steel', pants='trousers', pc='navy', shoes='sneakers', sc='paper', helmet='gojek')
PAX_M = P(body='m', skin='light', hair='short', hc='black', top='tee', tc='oxblood', pants='trousers', pc='steel', shoes='sneakers', sc='paper', helmet='charcoal')
SMA = lambda **k: P(**{**dict(body='f', skin='light', hair='long', hc='black', top='shirt_l', tc='paper', pants='trousers', pc='smagrey', shoes='shoes', sc='night', skirt=('long', 'smagrey')), **k})
COM = lambda tc, motif, kind, helmet, skin='medium', pc='charcoal': P(body='m', skin=skin, hair='short', hc='black', top='shirt', tc=tc, pants='trousers', pc=pc, shoes='shoes', sc='night', helmet=helmet, batik=(motif, kind))
BLACK = ['#3A4458', '#2A3242', '#1C2330']; RED = ['#E5484D', '#BE2F56', '#7A2E35']; WHITE = ['#FFFFFF', '#E7EBF2', '#A7B2C4']
BLUE = ['#3F63E8', '#2D45B4', '#24399A']; SILVER = ['#E7EBF2', '#B9C0CC', '#8D97A8']; NIGHT = ['#1C2330', '#151A23', '#0B0E13']
# name: (scooter kwargs, [(spec, hip_x, anim, expr)] back -> front, footprint L tiles, note)
RIDERS = {
 'gojek':      (dict(paint=BLACK, paint2=RED, bag=True), [(OJ_G, -6, 'sit_type', 'neutral')], 1.3, 'Gojek driver + red food bag (replaces game moto)'),
 'gojek_pax':  (dict(paint=BLACK, paint2=RED), [(PAX_G, -15, 'sit', 'smile'), (OJ_G, -6, 'sit_type', 'neutral')], 1.3, 'Gojek driver + passenger (green pax helmet)'),
 'maxim':      (dict(paint=WHITE, paint2=RED), [(OJ_M, -6, 'sit_type', 'neutral')], 1.3, 'Maxim driver'),
 'maxim_pax':  (dict(paint=WHITE, paint2=RED), [(PAX_M, -15, 'sit', 'neutral'), (OJ_M, -6, 'sit_type', 'neutral')], 1.3, 'Maxim driver + passenger'),
 'sma_triple': (dict(paint=BLUE, paint2=NIGHT, long=True), [(SMA(hijab='paper', skin='medium'), -21, 'sit', 'happy'), (SMA(), -11, 'sit', 'smile'),
                (SMA(hijab='paper'), -1, 'sit_type', 'happy')], 1.55, '3 SMA girls on one scooter (front + back hijab, middle hair)'),
 'commuter_batik_sogan': (dict(paint=BLACK, paint2=RED), [(COM('sogan', '#EDE6D8', 'parang', 'night'), -6, 'sit_type', 'neutral')], 1.3, 'plain commuter, brown sogan batik (parang stripes), black helmet'),
 'commuter_batik_blue':  (dict(paint=SILVER, paint2=BLACK), [(COM('bblue', '#7A9FB2', 'kawung', 'paper', skin='light'), -6, 'sit_type', 'neutral')], 1.3, 'plain commuter, indigo batik (kawung rosettes), white helmet'),
 'commuter_batik_red':   (dict(paint=RED, paint2=BLACK), [(COM('bred', '#E0A526', 'truntum', 'grey', skin='deep', pc='night'), -6, 'sit_type', 'neutral')], 1.3, 'plain commuter, maroon batik (gold truntum dots), grey helmet'),
}
CV, PV = 160, (80, 124)          # work canvas + pivot

GRIP = (12.3, 6.4, 32.5)          # scooter-local grip point (hand centre); bar ends at y +-7.2
GRIP_END = 7.9                   # bar end shown past the hand
WAIST = (-1.0, 4.6, 30.0)
LEG_Y = 86                       # v6b frame row below which the seated back-view legs are behind the cowl sides         # pax hand target relative to the hip of the rider in front

def _lum(c): return .3 * c[0] + .59 * c[1] + .11 * c[2]

def arm_ramps(info):
    px = info['px']; skin = info['skin']
    sl = sorted({c for c, y, x in px if c not in skin}, key=_lum); sk = sorted({c for c, y, x in px if c in skin}, key=_lum)
    nsk = sum(1 for c, y, x in px if c in skin); long_ = nsk < 10
    if not sk: sk = sorted(skin, key=_lum)
    if not sl: sl = sk
    pick = lambda r: (r[-1], r[len(r) // 2], r[0])          # light, mid, edge (darkest of the same material)
    return pick(sl), pick(sk), long_

def shoulder(info, pos):
    ys = [y for c, y, x in info['px']]; t = min(ys)
    xs = [x for c, y, x in info['px'] if y <= t + 2]
    return (pos[0] + sum(xs) / len(xs) + .5, pos[1] + t + 2.5)

def tube_img(W, H, pts, r):
    yy, xx = np.mgrid[0:H, 0:W]; m = np.zeros((H, W), bool)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        dx, dy = x1 - x0, y1 - y0; L2 = max(dx * dx + dy * dy, 1e-6)
        t = np.clip(((xx + .5 - x0) * dx + (yy + .5 - y0) * dy) / L2, 0, 1)
        m |= np.hypot(xx + .5 - (x0 + t * dx), yy + .5 - (y0 + t * dy)) <= r
    return m

def paint(a, m, ramp):
    """left/top lit cel shading: edge on the lower/right side -> edge tone, upper rows of the tube -> light, else mid"""
    L, Mi, E = ramp; pad = np.pad(m, 1)
    for y, x in zip(*np.nonzero(m)):
        edge = not (pad[y, x + 2] and pad[y, x] and pad[y + 2, x + 1] and pad[y, x + 1])
        lit_side = not pad[y, x + 1] or not pad[y + 1, x]       # top or left boundary
        if edge and not lit_side: c = E
        elif not pad[y, x + 1]: c = L
        else: c = Mi
        a[y, x, :3] = c; a[y, x, 3] = 255

def draw_arm(cv, sh, hand, ramps, bar_dir=None, hand_only=False, arm_only=False):
    """2-segment arm (elbow sags 2 px) from shoulder to hand; sleeve ramp on the upper part (all of it for long sleeves),
    skin forearm; 3x3 rounded fist on the target; optional bar end poking out of the fist (bar_dir = unit screen vector)."""
    W, H = cv.size; a = np.zeros((H, W, 4), np.uint8); sl, sk, long_ = ramps
    ex, ey = (sh[0] + hand[0]) / 2, (sh[1] + hand[1]) / 2 + 2
    if not hand_only:
        up = tube_img(W, H, [sh, (ex, ey)], 1.45); lo = tube_img(W, H, [(ex, ey), hand], 1.3)
        if long_: paint(a, up | lo, sl)
        else:
            cut = tube_img(W, H, [sh, (sh[0] + (ex - sh[0]) * .7, sh[1] + (ey - sh[1]) * .7)], 1.6)
            paint(a, (up | lo) & ~cut, sk); sub = np.zeros_like(a); paint(sub, up & cut, sl); a[sub[..., 3] > 0] = sub[sub[..., 3] > 0]
    if not arm_only:
        if bar_dir is not None:                                   # grip end of the bar, past the fist
            gx, gy = hand[0] + bar_dir[0] * 2.4, hand[1] + bar_dir[1] * 2.4
            g = tube_img(W, H, [hand, (gx, gy)], .9); paint(a, g, (sc.hexrgb('#3A4458'), sc.hexrgb('#2A3242'), sc.hexrgb('#151A23')))
        hx_, hy_ = int(np.floor(hand[0])), int(np.floor(hand[1]))
        fist = np.zeros((H, W), bool); fist[hy_ - 1:hy_ + 2, hx_ - 1:hx_ + 2] = True; fist[hy_ - 1, hx_ - 1] = False
        h = np.zeros_like(a); paint(h, fist, sk); a[h[..., 3] > 0] = h[h[..., 3] > 0]
    cv.alpha_composite(Image.fromarray(a))

def scr(d, p, piv_cv, dy=0):
    sx, sy = sc.to_screen(d, *p); return (piv_cv[0] + sx, piv_cv[1] + sy + dy)

def build(name):
    skw, people, L, note = RIDERS[name]; s = sc.Scoot(**skw)
    Bs = [(ch.build_char(spec), hx_, anim, ex) for spec, hx_, anim, ex in people]
    out = {}
    for d in DIRS:
        facing = d in ('se', 'sw')        # facing the viewer: back riders first, front body over the riders
        wheels = {ph: s.render('wheels', d, ph) for ph in sorted(set(PHASE))}
        rear, piv = s.render('rear', d); front, _ = s.render('front', d)
        if not facing:
            cowl, _ = s.render('cowl', d); s2 = sc.Scoot(**{**skw, 'bag': False}); rearnb, _ = s2.render('rear', d)
            bag = s.render('bag', d)[0] if skw.get('bag') else None
        for f in range(NF):
            cv = Image.new('RGBA', (CV, CV)); ox, oy = PV[0] - piv[0], PV[1] - piv[1]
            cv.alpha_composite(wheels[PHASE[f]][0], (ox, oy))
            by, ry = BODY_DY[f], RIDER_DY[f]
            R = []                                                   # back -> front along the scooter
            for k, (B, hx_, anim, ex) in enumerate(Bs):
                im, info = ch.frame(B, anim, 0, d, ex, noarms=True)
                sx, sy = sc.to_screen(d, hx_ + AX, 0, AZ); px = 31 if d in ('sw', 'nw') else 32
                pos = (int(round(PV[0] + sx - px)), int(round(PV[1] + sy - 100)) + ry)
                shs = [shoulder(info[k2], pos) for k2 in ('arm_near', 'arm_far')]
                rmp = arm_ramps(info['arm_near']); rmp = (rmp[0], rmp[1], B['n']['top'] in ('hoodie', 'tee_long', 'shirt_l'))
                if k == len(Bs) - 1:                                 # driver: both fists on the grips
                    tg = [scr(d, (GRIP[0], sgn * GRIP[1], GRIP[2]), PV, by) for sgn in (1, -1)]
                    ends = [scr(d, (GRIP[0], sgn * GRIP_END, GRIP[2]), PV, by) for sgn in (1, -1)]
                    bdir = []
                    for t, e in zip(tg, ends):
                        v = (e[0] - t[0], e[1] - t[1]); n = max(1e-6, (v[0] ** 2 + v[1] ** 2) ** .5); bdir.append((v[0] / n, v[1] / n))
                else:                                                # passenger: hands on the waist of the rider in front
                    fh = Bs[k + 1][1]
                    tg = [scr(d, (fh + WAIST[0], sgn * WAIST[1], WAIST[2]), PV, RIDER_DY[f]) for sgn in (1, -1)]; bdir = [None, None]
                # pair shoulders and targets by screen x (no crossed arms)
                order_s = sorted(range(2), key=lambda i: shs[i][0]); order_t = sorted(range(2), key=lambda i: tg[i][0])
                arms = [(shs[order_s[i]], tg[order_t[i]], bdir[order_t[i]]) for i in range(2)]
                # depth of each target: larger c+r = nearer the viewer
                R.append(dict(im=im, pos=pos, arms=arms, ramps=rmp, driver=(k == len(Bs) - 1)))
            def arm_depth(t):                                         # screen y of target ~ nearer is lower
                return t[1][1]
            if facing:
                cv.alpha_composite(rear, (ox, oy + by))
                for i, r in enumerate(R):
                    far, near = sorted(r['arms'], key=arm_depth)
                    draw_arm(cv, *far[:2], r['ramps'], far[2], arm_only=True)        # far arm behind the body
                    cv.alpha_composite(r['im'], r['pos'])
                    if not r['driver']: draw_arm(cv, *far[:2], r['ramps'], None, hand_only=True); r['near'] = near
                    else: r['near'] = near; r['far'] = far
                cv.alpha_composite(front, (ox, oy + by))
                for r in R:
                    if r['driver']:
                        draw_arm(cv, *r['far'][:2], r['ramps'], r['far'][2], hand_only=True)
                    draw_arm(cv, *r['near'][:2], r['ramps'], r['near'][2])
            else:
                # back views (ne/nw), fixed 1 Nov: seat UNDER the riders. Order: front body, rear cowl + seat (one render, so
                # the seat keeps its shading), riders (front rider first = farthest), then the cowl again but only where it
                # covers a rider's lower legs (frame y >= LEG_Y: below the thighs), then the Gojek bag (behind the back rider).
                cv.alpha_composite(front, (ox, oy + by))
                cv.alpha_composite(rearnb, (ox, oy + by))
                legs = np.zeros((CV, CV), bool)
                for r in R[::-1]:
                    for a_ in r['arms']: draw_arm(cv, *a_[:2], r['ramps'], a_[2])
                    cv.alpha_composite(r['im'], r['pos'])
                    a = np.array(r['im'])[..., 3] > 0; a[:LEG_Y] = False; ys, xs = np.nonzero(a)
                    yy, xx = ys + r['pos'][1], xs + r['pos'][0]; ok = (yy >= 0) & (yy < CV) & (xx >= 0) & (xx < CV)
                    legs[yy[ok], xx[ok]] = True
                cw = Image.new('RGBA', (CV, CV)); cw.alpha_composite(cowl, (ox, oy + by)); cwa = np.array(cw)
                cwa[~legs] = 0; cwa[cwa[..., 3] < 255] = 0
                cv.alpha_composite(Image.fromarray(cwa))
                if bag is not None: cv.alpha_composite(bag, (ox, oy + by))
            out[d, f] = cv
    return name, out
