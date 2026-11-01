#!/usr/bin/env python3
"""NPC Barista FamiCafe (v6b, PREVIEW). Body / head / face / topi (npc_v6b cap()) / idle + walk = generator v6b game lewat
npc_babeh_loak/babeh_base.render_b (= npc_pak_ogah/job_common.render, jalur npc_v6b.build). Ditambah: seragam gaya FamilyMart
(kemeja putih, kerah + manset hijau, celemek hijau dengan tali biru, saku putih, name tag), topi hijau, pose kerja dengan limb()
(bahu, lengan kaos, siku, lengan bawah, tangan): giling, steam_tuang, seduh, serah, ramah. sw / nw = cermin se / ne."""
import os, sys, json
sys.path.insert(0, 'assets/npc_babeh_loak')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_babeh_loak import limb, P
from babeh_base import *
from common import OUT as ROOT, R as RP, audit
OUT = ROOT + '/npc'; NM = 'barista_famima'
FMG = X('#7FD99A', '#1FA34A', '#1F8F3A', '#16702D', '#105824')        # light -> dark (index.html FamilyMart greens)
BLU = X('#86CCFF', '#3F7FE0', '#2C6BD8', '#2457B8', '#1A3F87')
WHT = X('#FFFFFF', '#F4F4F0', '#E7EBF2', '#C7CFDC', '#8D97A8')
STEEL = X('#C7CFDC', '#A7B2C4', '#8D97A8', '#788197', '#535969')
DARKR = X('#5A6577', '#3A4458', '#2A3242', '#1C2330', '#15151F')
COF = X('#D49A5E', '#B48455', '#94704F', '#6B4F3A', '#3D2A1E')
N = dict(body='m', skin='light', hair='short', hc='black', top='tee', tc='#F4F4F0', pants='trousers', pc='#2A3242', shoes='shoes', sc='night',
         cap=('#105824', '#1FA34A', '#7FD99A'), facial={}, top_style='tee')
VIEWS = ('se', 'sw', 'ne', 'nw')

def uniform(L, pal, view, dy):
    """white shirt (generator shading kept, remapped to the white ramp), green collar + cuffs, green apron with blue ties, name tag"""
    for i, c in enumerate(WHT): pal['C%d' % (i + 1)] = c                    # limb() sleeves use the same white ramp
    sh = L['shirt']; yy, xx = np.mgrid[0:FH, 0:FW]; m = sh[..., 3] == 255
    sh = remap(sh, m, WHT[1:]); ys, xs = np.nonzero(m)
    top = ys.min()
    for x in range(FW):                                                     # sleeve cuffs: lowest 2 sleeve rows outside the torso
        if 25 <= x <= 39: continue
        col = [y for y in range(top, top + 12) if m[y, x]]
        if col: put(sh, x, max(col), FMG[3]); put(sh, x, max(col) - 1, FMG[1])
    for x in range(26, 39):                                                  # collar band
        if m[top + 1, x]: put(sh, x, top + 1, FMG[2] if x < 32 else FMG[3])
        if m[top, x]: put(sh, x, top, FMG[1] if x < 32 else FMG[2])
    L['shirt'] = sh
    ap = E()
    if view == 'se':                                                        # apron bib + skirt (front), left-lit
        for y in range(58 + dy, 85 + dy):
            if y < 66 + dy: x0, x1 = 28, 36
            else: x0, x1 = 26, 38
            for x in range(x0, x1 + 1):
                c = FMG[1] if x < x0 + 3 else FMG[2] if x < x1 - 2 else FMG[3]
                if x == x1 or y == 84 + dy: c = FMG[4]
                put(ap, x, y, c)
        for x in range(25, 40): put(ap, x, 66 + dy, BLU[2] if x < 33 else BLU[3]); put(ap, x, 67 + dy, BLU[3])     # waist tie
        for y in range(54 + dy, 58 + dy): put(ap, 28, y, FMG[3]); put(ap, 36, y, FMG[3])                        # neck straps
        for y in range(71 + dy, 76 + dy):                                     # pocket (white)
            for x in range(29, 35): put(ap, x, y, WHT[1] if y > 71 + dy else WHT[3])
        for (x, y) in ((33, 60), (34, 60), (35, 60), (33, 61), (34, 61), (35, 61)): put(ap, x, y + dy, WHT[0] if y == 60 else BLU[2])  # name tag
    else:                                                                    # back: crossed straps + blue bow at the waist
        for k in range(0, 12):
            put(ap, 28 + k, 55 + dy + k, FMG[3]); put(ap, 39 - k, 55 + dy + k, FMG[3])
        for x in range(24, 41): put(ap, x, 67 + dy, BLU[2] if x < 33 else BLU[3])
        for (x, y) in ((31, 66), (32, 66), (33, 66), (30, 68), (31, 69), (34, 68), (35, 69), (32, 68), (33, 68)): put(ap, x, y + dy, BLU[1])
        for x in (25, 38):                                                    # apron edges visible at the sides
            for y in range(68 + dy, 84 + dy): put(ap, x, y, FMG[3])
    L['apron'] = ap

def layers(view, anim, f, expr='neutral'):
    L, pal, bob = render_b(N, anim, f, view, expr)
    L0, _, _ = render_b(N, 'idle', 0, view)
    dy = bbox(L['shirt'])[1] - bbox(L0['shirt'])[1]
    uniform(L, pal, view, dy)
    return L, pal, dy

# ---------------------------------------------------------------- hand props
def cup(a, x, y, lid=True):                     # paper cup 5 x 6 (hand at the bottom-left), green band
    for j in range(6):
        for i in range(5):
            c = WHT[1] if i < 2 else WHT[2] if i < 4 else WHT[3]
            if 2 <= j <= 3: c = FMG[1] if i < 2 else FMG[2] if i < 4 else FMG[3]
            put(a, x + i, y - 6 + j, c)
    if lid:
        for i in range(-1, 6): put(a, x + i, y - 7, WHT[0] if i < 3 else WHT[2])
def pitcher(a, x, y, tilt=0):                    # steel pitcher 5 x 6 (+ spout); tilt 1 = poured to the right
    for j in range(6):
        for i in range(5):
            put(a, x + i + (j // 3 if tilt else 0) * 0, y - 6 + j, STEEL[0] if i < 2 else STEEL[2] if i < 4 else STEEL[3])
    put(a, x + 5, y - 6, STEEL[1]); put(a, x + 6, y - 7 + (2 if tilt else 0), STEEL[2])
    if tilt:
        for k in range(3): put(a, x + 6, y - 5 + k, WHT[1])               # milk stream
def portafilter(a, x, y):                        # basket + dark handle to the left
    for i in range(5): put(a, x + i, y, STEEL[1] if i < 3 else STEEL[3]); put(a, x + i, y + 1, STEEL[3])
    for i in range(1, 6): put(a, x - i, y + (1 if i > 3 else 0), DARKR[2])
def tamper(a, x, y):
    for i in range(4): put(a, x + i, y, STEEL[1] if i < 2 else STEEL[3])
    put(a, x + 1, y - 1, DARKR[1]); put(a, x + 2, y - 1, DARKR[2]); put(a, x + 1, y - 2, DARKR[1]); put(a, x + 2, y - 2, DARKR[2])
def puff(a, pts):
    for (x, y) in pts: put(a, x, y, WHT[0]); put(a, x + 1, y, WHT[2])

SN, SF = (24, 57.5), (40.5, 57.5)
def pose(kind, f):
    """se coords: (near, far, props list [(fn, x, y, kw)], fx points)"""
    if kind == 'giling':                     # near hand holds the portafilter under the grinder chute, far hand taps the button
        nr = P(SN, (25, 65.5), (30, 66), 'fist', (31.5, 66))
        tap = [0, 1, 0, 1][f]
        fr = P(SF, (43, 64), (40, 60.5 + tap), 'point', (38.5, 60 + tap), (-1, .2))
        return nr, fr, [(portafilter, 33, 66, {})], []
    if kind == 'steam_tuang':
        if f < 2:                            # steam: pitcher held up under the wand (moves up / down), steam puffs
            yv = [62, 61][f]
            nr = P(SN, (25, 65), (31, yv + 2), 'fist', (32.5, yv + 2)); fr = P(SF, (43, 64.5), (39, yv + 1.5), 'fist', (37.5, yv + 1.5))
            return nr, fr, [(pitcher, 33, yv + 3, {})], [((35, yv - 6), (37, yv - 8)), ((34, yv - 8), (36, yv - 10))][f]
        # pour: cup in the near hand, pitcher tilted over it
        nr = P(SN, (24.5, 66), (29, 69), 'fist', (30.5, 69)); fr = P(SF, (43, 63), (39, 63 + f - 2), 'fist', (37.5, 63 + f - 2))
        return nr, fr, [(cup, 30, 70, dict(lid=False)), (pitcher, 33, 63 + f - 2, dict(tilt=1))], []
    if kind == 'seduh':                      # tamp (f0, f1) then lock + press brew (f2, f3)
        if f < 2:
            nr = P(SN, (25, 66), (29.5, 68.5), 'fist', (31, 68.5)); ty = [63, 65][f]
            fr = P(SF, (43, 63), (38.5, ty), 'fist', (37, ty))
            return nr, fr, [(portafilter, 33, 68, {}), (tamper, 34, ty + 2, {})], []
        nr = P(SN, (24.5, 64), (29, 61), 'fist', (31, 60)); fr = P(SF, (44, 61), (42, 56 + (f - 2)), 'point', (41, 54.5 + (f - 2)), (-.3, -1))
        return nr, fr, [(portafilter, 33, 60, {})], []
    if kind == 'serah':                      # hand the cup over the counter (toward the camera / customer), smile
        reach = [0, 1.5, 3, 3][f]
        nr = P(SN, (25, 65), (31 + reach * .5, 67 - reach * .3), 'fist', (32.5 + reach * .6, 67 - reach * .4))
        fr = P(SF, (43, 64), (40 + reach * .4, 66 - reach * .3), 'open', (38.5 + reach * .5, 67 - reach * .4), (-.6, .4))
        return nr, fr, [(cup, int(31 + reach * .6), int(67 - reach * .4), {})], []
    if kind == 'ramah':                      # friendly wave (far hand stays at the apron)
        wave = [(15, 50), (14, 48.5), (15, 50), (16.5, 48.5)][f]
        nr = P(SN, (18.5, 59), (wave[0] + 1, wave[1] + 3), 'open', wave, (-.2, -1))
        fr = P(SF, (43, 64), (40.5, 70), 'fist', (39.5, 71.5))
        return nr, fr, [], []
EXPR = {'giling': ['neutral', 'neutral', 'blink', 'neutral'], 'steam_tuang': ['neutral', 'neutral', 'smile', 'smile'], 'seduh': ['neutral', 'neutral', 'neutral', 'smile'],
        'serah': ['smile', 'smile', 'happy', 'happy'], 'ramah': ['happy', 'talk_open', 'happy', 'talk_closed']}

def build(view, kind, f=0):
    base = 'se' if view in ('se', 'sw') else 'ne'; mir = view in ('sw', 'nw')
    anim = kind if kind in ('idle', 'walk') else 'idle'
    expr = EXPR[kind][f] if (base == 'se' and kind in EXPR) else 'neutral'
    L, pal, dy = layers(base, anim, f if anim == kind else 0, expr)
    near = far = None; top = E(); n = dict(N)
    if kind not in ('idle', 'walk'):
        nr, fr, props, fx = pose(kind, f)
        sh = L['shirt']
        near = limb(*nr, pal, n); L['arm_near'] = E()
        for y in range(54, 64): sh[y, :25] = 0
        far = limb(*fr, pal, n); L['arm_far'] = E()
        for y in range(54, 64): sh[y, 40:] = 0
        for fn, x, y, kw in props: fn(top, x, y, **kw)
        puff(top, fx)
        if base == 'ne': near, far, top = flipx(near), flipx(far), flipx(top)
    im = Image.fromarray(shadow())
    order = ['hair_back', 'body', 'arm_far', 'shoes', 'pants', 'shoes_over', 'rips', 'shirt', 'apron', 'outer', 'acc', 'arm_near', 'body_front', 'held', 'face', 'hair_front', 'glasses', 'brows']
    for k in order:
        if k == 'apron' and far is not None and base == 'se': im.alpha_composite(Image.fromarray(L['apron'])); im.alpha_composite(Image.fromarray(far)); continue
        if k == 'shirt' and far is not None and base == 'ne': im.alpha_composite(Image.fromarray(far))
        if k in L: im.alpha_composite(Image.fromarray(L[k]))
    if base == 'se': im.alpha_composite(Image.fromarray(top))
    if near is not None: im.alpha_composite(Image.fromarray(near))
    if base == 'ne': im.alpha_composite(Image.fromarray(top))
    if mir: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im

ANIMS = [('idle', 4, 300), ('walk', 6, 150), ('giling', 4, 180), ('steam_tuang', 4, 260), ('seduh', 4, 240), ('serah', 4, 220), ('ramah', 4, 240)]
if __name__ == '__main__':
    os.makedirs(f'{OUT}/frames', exist_ok=True); FR = {}; files = []
    for kind, n_, ms in ANIMS:
        for v in VIEWS:
            FR[v, kind] = [build(v, kind, i) for i in range(n_)]
            for i, im in enumerate(FR[v, kind]):
                p = f'{OUT}/frames/{NM}_{v}_{kind}_f{i}.png'; im.save(p); files.append(p)
    # game-format sheet: 6 cols x (anims x 4 dirs) rows, 64x112 cells
    sheet_im = Image.new('RGBA', (6 * FW, len(ANIMS) * 4 * FH)); rows = {}
    for a, (kind, n_, ms) in enumerate(ANIMS):
        rows[kind] = a * 4
        for d, v in enumerate(VIEWS):
            for i, im in enumerate(FR[v, kind]): sheet_im.alpha_composite(im, (i * FW, (a * 4 + d) * FH))
    sheet_im.save(f'{OUT}/{NM}_sheet.png')
    sheet('BARISTA FAMICAFE  ·  4x  ·  64x112, pivot 32,100  ·  v6b generator + seragam gaya FamilyMart  ·  sw / nw = mirror',
          [(f'{k} {v}', [(f'f{i}', im) for i, im in enumerate(FR[v, k])]) for k, n_, ms in ANIMS for v in VIEWS], f'{OUT}/{NM}_sheet_4x.png', bg=BG)
    for kind, n_, ms in ANIMS:
        gif([strip([FR[v, kind][i] for v in VIEWS]) for i in range(n_)], f'{OUT}/{NM}_{kind}_4arah_4x.gif', ms)
    json.dump({'name': NM, 'frame': [FW, FH], 'pivot': [32, 100], 'sheet': f'npc/{NM}_sheet.png', 'cols': 6, 'dirs': list(VIEWS),
               'rows': rows, 'anims': {k: {'frames': n_, 'frame_ms': ms, 'loop': True} for k, n_, ms in ANIMS},
               'cfg': {k: v for k, v in N.items()}}, open(f'{OUT}/manifest_npc.json', 'w'), indent=1)
    print(audit(files))
