#!/usr/bin/env python3
"""Virtual Office - NPC 'Theodore' (replaces v2 NPC 2 'Rocketta'), v6b style. PREVIEW ONLY, not integrated.
Body, head, face, expressions and every pose come straight from the game's v6b generator (base6.render -> npc_v6b/live_v6b,
Rocketta's red 'oxbred' suit, male, skin 'light' (v2), hair removed with the same bald() dome as the aliens). This script only adds
the Theodore parts on top: dome cap helmet, round goggles, red collar, chest emblem, belly marble porthole, teal belt,
white v6b boots (v2), red gloves, boxy pack (barrel only inside the back-view box, v2); GROUNDED (v3): game idle /
walk / talk / tired rows, game standing + seated shadows, no hover rings, Gfunk z helpers."""
import os, sys, math
sys.path.insert(0, 'assets/npc_gfunk')
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import make_gfunk as G, base6, make_npcs_v2 as M
from make_gfunk import disk, rect, shade, comp, put, hx, FW, FH, CHROME, RED, ORANGE, GLASSD
OUT = os.path.dirname(os.path.abspath(__file__))
CFG = dict(body='m', skin='light', hair='short', hc='black', top='tee_long', tc='oxbred', pants='trousers', pc='oxbred', shoes='boots', sc='paper')
TEAL = [hx('#7FE0E8'), hx('#6FA9A9'), hx('#3D7A80'), hx('#2A5266'), hx('#2A3242')]      # pool glow + slate-teal ramp (palette)
SHELL = [hx('#FFFFFF'), hx('#E7EBF2'), hx('#B9C0CC'), hx('#8D97A8'), hx('#5A6577')]
BAIZE = hx('#1F7A55'); DARK = hx('#1C2330'); PAPER = hx('#E7EBF2')

def lum(c): return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
def remap(img, mask, ramp):
    """recolour masked pixels by luminance rank onto a ramp (keeps the generator's shading pattern)"""
    a = np.array(img); cols = sorted({tuple(p[:3]) for p in a[mask]}, key=lum, reverse=True)
    if not cols: return img
    for i, c in enumerate(cols):
        t = ramp[min(len(ramp) - 1, round(i * (len(ramp) - 1) / max(1, len(cols) - 1)))] if len(cols) > 1 else ramp[1]
        m = mask & np.all(a[..., :3] == c, axis=2); a[m, :3] = t
    return Image.fromarray(a)

def bbox(img):
    ys, xs = np.nonzero(np.array(img)[..., 3]); return (xs.min(), ys.min()) if len(ys) else (0, 0)

def render(view, anim='idle', f=0, expr='neutral'):
    base = 'se' if view in ('se', 'sw') else 'ne'
    o, L, pal = base6.render(CFG, f=f, d=base, expr=expr, anim=anim)
    _, L0, _ = base6.render(CFG, f=0, d=base, anim='idle')
    hx0, hy0 = bbox(L0['hair_front']); hx1, hy1 = bbox(L['hair_front']); hd = (int(hx1 - hx0), int(hy1 - hy0))
    global BODYD; BODYD = int(bbox(L['shirt'])[1] - bbox(L0['shirt'])[1])      # v3: torso bob of the game rows (idle / walk / talk)
    if anim in ('sleep', 'tired'):                               # the game drops the face with the head (HEADD sleep 3,1 / tired 2,1)
        dd = 3 if anim == 'sleep' else 2
        for k in ('face', 'brows'): L[k] = Image.fromarray(np.roll(np.roll(np.array(L[k]), dd, 0), 1 if base == 'se' else 0, 1))
    br = L['brows']; M.bald(L, pal); L['brows'] = br               # no hair: skin dome (same as the aliens), keep brows
    skin = {tuple(v) for k, v in pal.items() if k.startswith('K') and isinstance(v, tuple)}
    # v2: boots are the plain v6b white boots (as NPC 1 Cosmo / old Rocketta) - no recolour
    sh = np.array(L['shirt']); suit = sorted({tuple(p[:3]) for p in sh[sh[..., 3] == 255]}, key=lum, reverse=True)
    for k in ('arm_near', 'arm_far'):                            # red gloves (suit tones, one step darker)
        if k in L:
            a = np.array(L[k]); m = (a[..., 3] == 255) & np.array([[tuple(p[:3]) in skin for p in r] for r in a])
            L[k] = remap(L[k], m, [hx('#%02X%02X%02X' % c) for c in suit[1:]])
    return L, pal, hd, base, suit

def collar(a, base, suit):
    S = [hx('#%02X%02X%02X' % c) for c in suit]
    for y, row in ((52, 0), (53, 1), (54, 3)):
        for x in range(27, 39):
            if y == 52 and not (28 <= x <= 37): continue
            c = S[min(len(S) - 1, row + (1 if x >= 35 else 0))]
            if x in (27, 38): c = S[-1]
            put(a, x, y, c)

def chest(a, dy=0, ex=26.5):
    """v2: emblem on the VIEWER'S LEFT chest (ex=26.5 in se). For sw it is drawn at the mirrored x (37.5) before the flip,
    so after the flip it also lands on the viewer's left. Dark round patch, green rim, white 'O.' logo"""
    em = disk(ex, 58.5 + dy, 2.6); ix = int(ex)
    for y, x in zip(*np.nonzero(em)): put(a, x, y, BAIZE if not disk(ex, 58.5 + dy, 1.7)[y, x] else DARK)
    if ex < 32: put(a, ix - 1, 58 + dy, PAPER); put(a, ix + 1, 58 + dy, hx('#B9C0CC'))
    else: put(a, ix + 1, 58 + dy, PAPER); put(a, ix - 1, 58 + dy, hx('#B9C0CC'))       # logo pre-mirrored, reads the same after flip
    ring = disk(32.0, 64.5 + dy, 4.5) & ~disk(32.0, 64.5 + dy, 2.9)             # belly marble porthole (Gfunk construction)
    a2 = comp(a, shade(ring, [ORANGE[0], ORANGE[1], ORANGE[1], ORANGE[2], ORANGE[3]], spec=(29, 61 + dy), bias=-.15))
    a2 = comp(a2, shade(disk(32.0, 64.5 + dy, 2.9), SHELL, spec=(31, 63 + dy), bias=-.1)); a[...] = a2

def belt(a, py):
    for y, t in ((py - 1, 1), (py, 2)):
        xs = np.nonzero(a[y, :, 3] == 255)[0]
        if not len(xs): continue
        for x in range(xs.min(), xs.max() + 1): put(a, x, y, TEAL[4 - 1] if x in (xs.min(), xs.max()) else (TEAL[t - 1] if x < 29 else TEAL[t]))

def goggles(a, base, d=(0, 0), closed=False):
    dx, dy = d
    if base == 'se':
        for (cx, cy, r) in ((31.0, 45.5, 3.4), (39.0, 45.5, 2.6)):
            cx += dx; cy += dy
            for y in range(int(cy - r) - 1, int(cy + r) + 2):
                for x in range(int(cx - r) - 1, int(cx + r) + 2):
                    dd = math.hypot(x + .5 - cx, y + .5 - cy)
                    if r - 1 <= dd < r:
                        ang = math.degrees(math.atan2(y + .5 - cy, x + .5 - cx))
                        put(a, x, y, TEAL[1] if -170 < ang < -40 else TEAL[3] if 10 < ang < 150 else TEAL[2])
                    elif dd < r - 1 and a[y, x, 3] and lum(a[y, x, :3]) > 120:      # lens tint over skin only, eyes stay
                        a[y, x, :3] = SHELL[1] if lum(a[y, x, :3]) > 150 else SHELL[2]   # pale lens (no blending)
            put(a, int(cx - r * .45), int(cy - r * .45), PAPER)            # glass highlight
        for x in range(34 + dx, 37 + dx): put(a, x, 45 + dy, CHROME[3])  # bridge
        for x in range(23 + dx, 28 + dx): put(a, x, 45 + dy, CHROME[4]); put(a, x, 44 + dy, CHROME[3])   # strap to the side
    else:
        ys = 45 + dy
        xs = np.nonzero(a[ys, :, 3] == 255)[0]
        for x in range(xs.min(), xs.max() + 1): put(a, x, ys, CHROME[4]); put(a, x, ys - 1, CHROME[3])

def dome(a, base, d=(0, 0)):
    """half-circle cap helmet: wider than the head, covers the top of the head only; shell + teal brim + red knob"""
    dx, dy = d; cx, by = 33.0 + dx + (0 if base == 'se' else -1), 41 + dy
    m = disk(cx, by, 14.5, 11.0) & (np.arange(FH)[:, None] < by)
    a[...] = comp(a, shade(m, SHELL, spec=(int(cx) - 6, by - 9), bias=-.05))
    for x in range(int(cx - 14.5) + 1, int(cx + 14.5) + 1):          # brim: teal band + dark underside
        put(a, x, by, TEAL[1] if x < cx + 4 else TEAL[2]); put(a, x, by - 1, TEAL[0] if x < cx else TEAL[1])
        if 23 + dx <= x <= 43 + dx: put(a, x, by + 1, CHROME[4])
    put(a, int(cx - 14.5) + 1, by, TEAL[3]); put(a, int(cx + 14.5), by, TEAL[3])
    kx = int(cx - 9) if base == 'se' else int(cx + 8)                 # small red knob on the side of the shell
    for (x, y, c) in ((kx, by - 10, RED[0]), (kx + 1, by - 10, RED[1]), (kx, by - 9, RED[1]), (kx + 1, by - 9, RED[2]), (kx, by - 11, RED[1])): put(a, x, y, c)

def pack(base):
    """boxy silver/white pack with teal trim, red ring, green cone nozzle and a cannon barrel; same box as Yerbies (20x27)"""
    a = np.zeros((FH, FW, 4), np.uint8); dx, dy = (-4, -4) if base == 'se' else (0, 0)
    x0, y0, x1, y1 = 23 + dx, 50 + dy, 42 + dx, 76 + dy
    a = comp(a, shade(rect(x0, y0, x1, y1), SHELL, spec=(x0 + 1, y0 + 1), bias=-.05))
    for x in range(x0 + 1, x1): put(a, x, y0, SHELL[0])
    for y in range(y0 + 3, y1 - 2): put(a, x0 + 1, y, TEAL[1])     # teal trim
    for x in range(x0, x1 + 1): put(a, x, y1, SHELL[4])
    # v2: no barrel sticking out anywhere. Back view only: a short cannon barrel mounted INSIDE the box silhouette
    if base == 'ne':
        for y in range(y0 + 2, y1 - 3):
            put(a, x1 - 3, y, CHROME[1]); put(a, x1 - 2, y, CHROME[3])
        put(a, x1 - 3, y0 + 2, DARK); put(a, x1 - 2, y0 + 2, DARK)
        put(a, x1 - 3, y0 + 4, RED[1]); put(a, x1 - 2, y0 + 4, RED[2])
    if base == 'ne':
        for r, c in ((5.2, RED[1]), (3.4, RED[2])):                    # red concentric rings on the back plate
            ring = disk(32.5, 62.5, r) & ~disk(32.5, 62.5, r - 1)
            for y, x in zip(*np.nonzero(ring)): put(a, x, y, c)
        for y, x in zip(*np.nonzero(disk(32.5, 62.5, 2.0))): put(a, x, y, TEAL[1])
        put(a, 32, 62, PAPER)
        for i, y in enumerate(range(y1 + 1, y1 + 5)):                     # green cone nozzle pointing down
            for x in range(31 - (2 - i // 2), 34 + (2 - i // 2) + 1): put(a, x, y, BAIZE if x < 33 else hx('#2A5266'))
    else:
        put(a, x0 + 2, y0 + 8, BAIZE); put(a, x0 + 2, y0 + 11, RED[1])     # side indicator lights (side ref)
    return a

PY = 70   # trouser top (frame y) in the v6b body
def build(view='se', anim='idle', f=0, expr='neutral', pulse=0, modular=False):
    L, pal, hd, base, suit = render(view, anim, f, expr)
    bodyd = BODYD
    sg = np.zeros((FH, FW, 4), np.uint8)                          # overlays that sit on the shirt, under the near arm
    shirt = np.array(L['shirt'])
    if base == 'se':
        chest(shirt, bodyd, 37.5 if view == 'sw' else 26.5)
    pa = comp(np.array(L['pants']), shirt); belt(pa, PY + bodyd)
    bl = np.zeros((FH, FW, 4), np.uint8); bl[PY - 1 + bodyd:PY + 1 + bodyd] = pa[PY - 1 + bodyd:PY + 1 + bodyd]
    L['shirt'] = Image.fromarray(shirt)
    acc = np.zeros((FH, FW, 4), np.uint8); collar(acc, base, suit); acc = np.roll(acc, bodyd, 0); acc = comp(bl, acc)
    if base == 'ne' and not modular: acc = comp(acc, np.roll(pack('ne'), bodyd, 0))
    order = ['hair_back', 'body', 'arm_far', 'shoes', 'pants', 'shoes_over', 'rips', 'shirt', 'shirt_graphic', 'outer']
    im = Image.new('RGBA', (FW, FH))
    if base == 'se' and not modular: im.alpha_composite(Image.fromarray(np.roll(pack('se'), bodyd, 0)))
    for k in order:
        if k in L: im.alpha_composite(L[k])
    im.alpha_composite(Image.fromarray(acc))
    for k in ('acc', 'arm_near', 'body_front', 'held', 'face', 'hair_front', 'glasses', 'brows'):
        if k in L: im.alpha_composite(L[k])
    a = np.array(im)
    goggles(a, base, hd if anim != 'sleep' else (hd[0], hd[1]))
    if base == 'se' and expr in ('angry', 'happy', 'surprised', 'sleepy'):   # v3: stronger mouths / lids (goggles + helmet unchanged)
        lid = hx('#30231B'); mo = hx('#8E1F24'); dx, dy = hd; P = lambda pts, c: [put(a, x + dx, y + dy, c) for (x, y) in pts]
        if expr == 'angry':                                    # V lids inside both lenses + hard frown
            P(((30, 42), (31, 43), (32, 43), (33, 44), (29, 43), (39, 42), (38, 43), (37, 43), (37, 44)), lid)
            P(((33, 50), (34, 50), (35, 50), (36, 50), (37, 50), (32, 51), (38, 51)), lid)
        if expr == 'happy':                                    # wide open smile with raised corners
            P(((33, 50), (34, 50), (35, 50), (36, 50), (37, 50), (32, 49), (38, 49)), lid); P(((34, 51), (35, 51), (36, 51)), mo)
        if expr == 'surprised':                                # round open 'O'
            P(((34, 49), (35, 49), (36, 49), (33, 50), (37, 50), (34, 51), (35, 51), (36, 51)), lid); P(((34, 50), (35, 50), (36, 50)), mo)
        if expr == 'sleepy':                                   # small slack mouth
            P(((34, 50), (35, 50)), lid)
    if not modular: dome(a, base, hd)
    Mk = {k: np.array(L[k])[..., 3] == 255 for k in ('pants', 'shoes')}
    return a, Mk

def finish(a, Mk, view, anim, f, pulse=0, lift=0):
    """v3: Theodore is GROUNDED - feet on the floor, pivot (32,100), no hover rings, no lift; the game's own shadow
    (flat 0,0,0,56 ellipse rx 11 ry 2.4 at x32, x33 for seated rows, exactly as live_v6b builds the sheets)"""
    mir = view in ('sw', 'nw'); base = 'se' if view in ('se', 'sw') else 'ne'
    seated = anim in ('sit', 'sit_type', 'sleep')
    yy, xx = np.mgrid[0:FH, 0:FW]; o = np.zeros((FH, FW, 4), np.uint8)
    o[((xx + .5 - (33 if seated else 32)) / 11) ** 2 + ((yy + .5 - 100.5) / 2.4) ** 2 <= 1] = (0, 0, 0, 56)
    im = Image.fromarray(o); im.alpha_composite(Image.fromarray(a))
    if mir: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if anim in ('sleep', 'tired'): im.alpha_composite(Image.fromarray(G.zz(anim, f, base, mir)))
    return im

def frame(view, kind, i, expr='neutral', modular=False):
    if kind in ('idle', 'walk'):                                   # the game's idle (4 f, 1 px breathing bob) / walk (6 f) rows
        a, Mk = build(view, kind, i, expr, modular=modular); return finish(a, Mk, view, kind, i)
    if kind == 'nap_stand':                                        # the game's standing 'tired' row (head drop 2, z-z)
        a, Mk = build(view, 'tired', i, 'blink', modular=modular); return finish(a, Mk, view, 'tired', i)
    if kind == 'talk':
        a, Mk = build(view, 'talk', i, ['talk_open', 'talk_closed', 'talk_open', 'talk_closed'][i], modular=modular); return finish(a, Mk, view, 'talk', i)
    anim = 'sleep' if kind == 'sleep_seat' else kind
    a, Mk = build(view, anim, i, 'blink' if anim == 'sleep' else expr, modular=modular); return finish(a, Mk, view, anim, i)

VIEWS = ('se', 'sw', 'ne', 'nw'); EXPRS = ('neutral', 'happy', 'surprised', 'angry', 'sleepy')
POSES = [('sit', 4), ('sit_type', 4), ('sleep_seat', 4), ('nap_stand', 4), ('talk', 4)]
NF = {'idle': 4, 'walk': 6}
if __name__ == '__main__':
    BG = (16, 20, 27, 255); S = 4; H = FH * S
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12); fb_ = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
    for d in ('frames', 'expr', 'poses'): os.makedirs(f'{OUT}/{d}', exist_ok=True)
    FR = {}
    for v in VIEWS:
        for kind in ('idle', 'walk'):
            FR[v, kind] = [frame(v, kind, i) for i in range(NF[kind])]
            for i, f in enumerate(FR[v, kind]): f.save(f'{OUT}/frames/theodore_{v}_{kind}_f{i}.png')
        FR[v, 'idle'][0].save(f'{OUT}/theodore_{v}.png')
    EX = {e: frame('se', 'idle', 0, e) for e in EXPRS}
    for e, f in EX.items(): f.save(f'{OUT}/expr/theodore_se_{e}.png')
    PF = {}
    for pose, n in POSES:
        for v in VIEWS:
            PF[pose, v] = [frame(v, pose, i) for i in range(n)]
            for i, f in enumerate(PF[pose, v]): f.save(f'{OUT}/poses/theodore_{pose}_{v}_f{i}.png')
    def sheet(title, rows, path):
        n = max(len(r[1]) for r in rows); W = 16 + n * (FW * S + 12); sh = Image.new('RGBA', (W, 40 + len(rows) * (H + 30)), BG); d = ImageDraw.Draw(sh)
        d.text((16, 8), title, fill=(231, 235, 242), font=fb_)
        for j, (rl, items) in enumerate(rows):
            y = 40 + j * (H + 30)
            for i, (lab, f) in enumerate(items):
                x = 16 + i * (FW * S + 12); sh.alpha_composite(f.convert('RGBA').resize((FW * S, H), Image.NEAREST), (x, y + 16))
                d.line([(x, y + 16 + 100 * S), (x + FW * S - 1, y + 16 + 100 * S)], fill=(42, 50, 66))
                d.text((x + 4, y + 2), (rl + '  ' if i == 0 and rl else '') + lab, fill=(141, 151, 168), font=font)
        sh.convert('RGB').save(path)
    sheet('THEODORE  ·  VIEWS  ·  4x  ·  64x112, pivot 32,100  ·  idle f0  ·  sw / nw = mirrors  ·  no s / side view in the v6b generator',
          [('', [(v, FR[v, 'idle'][0]) for v in VIEWS])], f'{OUT}/theodore_views_4x.png')
    sheet('THEODORE  ·  EXPRESSIONS (se)  ·  4x  ·  v6b face expressions behind the goggles', [('', [(e, EX[e]) for e in EXPRS])], f'{OUT}/theodore_expressions_4x.png')
    # 8x face crop row (x18-48, y30-58 of the idle f0 image, i.e. the head incl. dome and goggles)
    C8 = 8; cw, ch = 30, 28; fc = Image.new('RGBA', (16 + len(EXPRS) * (cw * C8 + 12), ch * C8 + 50), BG); d8 = ImageDraw.Draw(fc)
    d8.text((16, 8), 'THEODORE  ·  EXPRESSIONS  ·  8x face crop (se)', fill=(231, 235, 242), font=fb_)
    for i, e in enumerate(EXPRS):
        x = 16 + i * (cw * C8 + 12); cr = EX[e].crop((18, 30, 18 + cw, 30 + ch)); c = Image.new('RGBA', cr.size, BG); c.alpha_composite(cr)
        fc.alpha_composite(c.resize((cw * C8, ch * C8), Image.NEAREST), (x, 40)); d8.text((x + 4, 26), e, fill=(141, 151, 168), font=font)
    fc.convert('RGB').save(f'{OUT}/theodore_expressions_face_8x.png')
    lab = ['f0 up', 'f1 mid', 'f2 down', 'f3 mid']
    sheet('THEODORE  ·  ANIMATION (grounded)  ·  4x  ·  game v6b idle (4 f, 1 px breathing bob) and walk (6 f) rows  ·  pivot line y100',
          [(f'{k} {v}', [(f'f{i}', f) for i, f in enumerate(FR[v, k])]) for v in ('se', 'ne') for k in ('idle', 'walk')], f'{OUT}/theodore_animation_4x.png')
    sheet('THEODORE  ·  POSES  ·  4x  ·  game v6b sit / sit_type / sleep / tired / talk rows, grounded  ·  se/sw/ne/nw f0, then se frames',
          [(p, [(f'{v} f0', PF[p, v][0]) for v in VIEWS] + [(f'se f{i}', PF[p, 'se'][i]) for i in range(1, n)]) for p, n in POSES], f'{OUT}/theodore_poses_4x.png')
    def on_bg(f): c = Image.new('RGBA', (FW, FH), BG); c.alpha_composite(f); return c.convert('RGB').resize((FW * S, H), Image.NEAREST)
    def gif4(get, n, path, ms):
        g = []
        for i in range(n):
            c = Image.new('RGBA', (FW * 4, FH), BG)
            for j, v in enumerate(VIEWS): c.alpha_composite(get(v)[i], (j * FW, 0))
            g.append(c.convert('RGB').resize((FW * 4 * S, H), Image.NEAREST))
        g[0].save(path, save_all=True, append_images=g[1:], duration=ms, loop=0)
    for kind, ms in (('idle', 300), ('walk', 150)):
        g = [on_bg(f) for f in FR['se', kind]]; g[0].save(f'{OUT}/theodore_{kind}_se_4x.gif', save_all=True, append_images=g[1:], duration=ms, loop=0)
    gif4(lambda v: FR[v, 'idle'], 4, f'{OUT}/theodore_idle_4views_4x.gif', 300)
    gif4(lambda v: FR[v, 'walk'], 6, f'{OUT}/theodore_walk_4views_4x.gif', 150)
    for p, n in POSES:
        gif4(lambda v: PF[p, v], n, f'{OUT}/theodore_{p}_4views_4x.gif', {'nap_stand': 500, 'sleep_seat': 400, 'talk': 300, 'sit_type': 200, 'sit': 400}[p])
    # comparison: Theodore se/ne | NPC 1 Cosmo | old NPC 2 Rocketta | Gfunk se | references
    REF = G.REF; refs = [('01M69A8PYEM149T966YWGWWMXQ.jpg', (222, 695, 682, 1516)), ('01M69A8Q2D1DRTZH4FGH09V2DJ.jpg', (222, 695, 682, 1516)), ('01M69A8Q83MCGMYMRY4KY4HSZC.jpg', (222, 695, 682, 1516))]
    crops = []
    for fn, box in refs:
        # Historical /cursor/stores/ screenshots are optional comparison art.
        # Original pixel characters and animation frames render independently.
        if not os.path.isfile(REF + fn):
            continue
        im = Image.open(REF + fn).convert('RGB').crop(box)
        crops.append(im.resize((round(im.width * H / im.height), H), Image.LANCZOS))
    P2 = 'assets/'
    items = [('Theodore se', FR['se', 'idle'][0]), ('Theodore ne', FR['ne', 'idle'][0]), ('NPC 1 Cosmo', Image.open(P2 + 'npc_preview_v2/npc_1_cosmo.png')),
             ('old NPC 2 Rocketta', Image.open(P2 + 'npc_preview_v2/npc_2_rocketta.png')), ('Gfunk se', Image.open(P2 + 'npc_gfunk/gfunk_se.png'))]
    W = 16 + len(items) * (FW * S + 12) + 24 + sum(c.width + 12 for c in crops)
    sh = Image.new('RGBA', (W, H + 64), BG); d = ImageDraw.Draw(sh); x = 16
    d.text((16, 8), 'THEODORE vs NPC 1 / old NPC 2 / Gfunk  ·  4x  ·  references (original 3D art)', fill=(231, 235, 242), font=fb_)
    for lab_, f in items:
        sh.alpha_composite(f.convert('RGBA').resize((FW * S, H), Image.NEAREST), (x, 40)); d.text((x + 4, 28), lab_, fill=(141, 151, 168), font=font)
        d.line([(x, 40 + 100 * S), (x + FW * S - 1, 40 + 100 * S)], fill=(42, 50, 66)); x += FW * S + 12
    x += 24
    for i, c in enumerate(crops): sh.paste(c, (x, 40)); d.text((x + 4, 28), f'ref {i + 1}', fill=(141, 151, 168), font=font); x += c.width + 12
    sh.convert('RGB').save(f'{OUT}/theodore_vs_npc1_gfunk_ref_4x.png')
    cols = set()
    for fr in list(FR.values()) + list(PF.values()) + [list(EX.values())]:
        for im in fr: cols |= {tuple(p[:3]) for p in np.array(im).reshape(-1, 4) if p[3] == 255}
    print(len(cols), ' '.join(sorted('#%02X%02X%02X' % c for c in cols)))
