#!/usr/bin/env python3
"""v6b part library for the in-game Character Creator (client-side layer composition + palette recolouring).
Every part is rendered through the SAME pipeline as the Ichsan/Noor game sheets (live_v6b.py: poses, head drop, lie_flat,
seated legs, back views), but recolourable codes are written as KEY colours (one unique RGB per palette code). The client
composites the part sheets in layer order and swaps key colours for the chosen hair / skin / clothes ramps.
Output: v6b/live/parts6/ (+ keys.json)."""
import os, sys, json, copy, time
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import live_v6b as lv
from multiprocessing import Pool

FW, FH, COLS, ROWS = lv.FW, lv.FH, lv.COLS, lv.ROWS
OUT = os.path.join(lv.ROOT, 'live', 'parts6')
CODES = ['H0', 'H1', 'H2', 'H3', 'H4', 'B', 'Ki', 'Kh', 'Ke', 'Ka', 'K7', 'K5', 'C1', 'C2', 'C3', 'C4', 'C5', 'O1', 'O2', 'O3', 'O4', 'O5', 'OD',
         'P1', 'P2', 'P3', 'P4', 'S0', 'S1', 'S2', 'S3', 'Mu', 'St', 'St2', 'GL']
KEYS = {c: (255, 8 + 6 * i, 250 - 3 * i) for i, c in enumerate(CODES)}
SKIN = {k: 'K' + k for k in ('i', 'h', 'e', 'a', '7', '5')}
SETS = ['baked'] + lv.VARS
CFG0 = json.load(open(os.path.join(lv.ROOT, 'live/chars/ichsan.json')))

HAIRS = {'short': ('short', None), 'swept': ('short', False), 'mid_curtain': ('mid', 'curtain'), 'mid': ('mid', None),
         'wavy': ('wavy', None), 'wavy_curtain': ('wavy', 'curtain'), 'long': ('long', None), 'long_curtain': ('long', 'curtain')}
FRINGE = {None: 'bangs', False: 'swept', 'curtain': 'curtain'}
TOPS = {'tee': dict(shirt={'id': 'tee', 'type': 'tee', 'color': '#2A3242'}),
        'tee_long': dict(shirt={'id': 'tee_long', 'type': 'tee', 'color': '#2A3242'}, sleeves='long'),
        'tee_graphic': dict(shirt={'id': 'tee_graphic', 'type': 'tee', 'color': '#2A3242', 'graphic': {'c1': '#ECF0F4', 'c2': '#E4572E', 'c3': '#F2C14E'}}),
        'shirt': dict(shirt={'id': 'shirt', 'type': 'shirt', 'color': '#ECEFF3', 'notie': True}),
        'shirt_tie': dict(shirt={'id': 'shirt_tie', 'type': 'shirt', 'color': '#ECEFF3'}),
        'cardigan': dict(shirt={'id': 'tee', 'type': 'tee', 'color': '#1C2330'}, outer={'id': 'cardigan', 'type': 'cardigan', 'color': '#2A3242'}, sleeves='long'),
        'cardigan_dots': dict(shirt={'id': 'tee', 'type': 'tee', 'color': '#1C2330'}, outer={'id': 'cardigan_dots', 'type': 'cardigan', 'color': '#2A3242', 'dots': '#ECF0F4'}, sleeves='long')}
PANTS = {'trousers': {'type': 'trousers', 'color': '#3A4458'}, 'trousers_ripped': {'type': 'trousers', 'color': '#3A4458', 'rips': True},
         'baggy': {'type': 'baggy', 'color': '#3A4458'}, 'baggy_ripped': {'type': 'baggy', 'color': '#3A4458', 'rips': True}}
SHOES = ['shoes', 'sneakers', 'boots', 'hightops']
GLASSES = {'round': 'round', 'square': None}
FACIAL = {'mustache': dict(mustache='#5E4636', mu_droop=True), 'stubble': dict(stubble=['#D8B79C', '#B08E76']), 'both': dict(mustache='#5E4636', mu_droop=True, stubble=['#D8B79C', '#B08E76'])}

TL, TR = 10, 24          # torso edge columns (canvas) at waist level, identical for se and ne views
NOPINCH = ('hair_front', 'hair_back', 'pants', 'rips', 'shoes', 'shoes_over', 'face', 'brows', 'acc_head')
TORSO = ('shirt', 'shirt_graphic', 'outer', 'acc', 'body')
HANG = ('idle', 'walk', 'talk', 'tired')


def _drop(a, rows, c, side):
    """remove column c in the given rows; the part outside c slides 1px inward"""
    r0, r1 = rows
    if side < 0: a[r0:r1, 1:c + 1] = a[r0:r1, 0:c].copy(); a[r0:r1, 0] = ''
    else: a[r0:r1, c:-1] = a[r0:r1, c + 1:].copy(); a[r0:r1, -1] = ''


def fem_jaw(se):
    """female head: softer jaw - lighter jaw outline, chin corner rounded in by 1px (applied to the unposed se body)"""
    b = se['body']
    for y in range(15, 22):
        xs = np.nonzero(b[y] != '')[0]
        if not len(xs): continue
        b[y][b[y] == 'K5'] = 'K7'
        if y in (19, 20) and len(xs) > 6:
            b[y, xs[-1]] = ''; b[y, xs[-2]] = 'K7'


def fem_body(P, kind):
    """female template on posed code layers: narrower shoulders, waist taper, fuller hips, smaller hands and feet"""
    seat = kind in lv.SEATED
    for k, a in P.items():
        if k in NOPINCH or not isinstance(a, np.ndarray): continue
        _drop(a, (22, 47), TL, -1); _drop(a, (22, 47), TR, 1)
        if k in TORSO:
            _drop(a, (32, 39), TL + 1, -1); _drop(a, (32, 39), TR - 1, 1)
            _drop(a, (34, 38), TL + 2, -1); _drop(a, (34, 38), TR - 2, 1)
    if kind in HANG:
        for k in ('arm_near', 'arm_far', 'body_front'):
            a = P.get(k)
            if a is None: continue
            for x in range(lv.CW):
                ys = np.nonzero(a[30:60, x] != '')[0]
                if len(ys) >= 4: a[30 + ys[-1], x] = ''
        pa = P['pants']
        for y in range(44, 49):
            xs = np.nonzero(pa[y] != '')[0]
            if len(xs) > 8:
                pa[y, xs[0] - 1] = pa[y, xs[0]]; pa[y, xs[0]] = pa[y, xs[0] + 1]
                pa[y, xs[-1] + 1] = pa[y, xs[-1]]; pa[y, xs[-1]] = pa[y, xs[-1] - 1]
    sh = P['shoes']
    for y in range(lv.FH if False else sh.shape[0]):
        xs = np.nonzero(sh[y] != '')[0]
        if len(xs) >= 4:
            # trim the outer toe/heel pixel of each foot blob
            runs = np.split(xs, np.nonzero(np.diff(xs) > 1)[0] + 1)
            for i, r in enumerate(runs):
                if len(r) < 5: continue
                if len(runs) > 1 and i == 0: sh[y, r[0]] = ''        # outer side of each foot only
                else: sh[y, r[-1]] = ''


_orig_face = lv.face_layer


def face_layer(expr, C, view, sitD=0, bob=0, glasses=False, dx=0):
    """creator mustache: fuller (drooping corners) so the ON/OFF state reads at game zoom"""
    F, B, G = _orig_face(expr, C, view, sitD, bob, glasses, dx)
    if view == 'se' and C.get('mu_droop') and C.get('mustache') and expr != 'surprised':
        for (x, y) in ((13, 19), (19, 19)): F[y + sitD + bob, x + lv.OX + dx] = 'Mu'
    return F, B, G


lv.face_layer = face_layer

_orig_bcl = lv.build_char_layers


def bcl(C, O):
    """live_v6b.build_char_layers + creator extras: short hair recolourable, swept short, collared shirt without tie, rips on trousers"""
    L, pal = _orig_bcl(C, O)
    hm = {k: 'H' + k for k in '01234'}
    if C['hair_style'] == 'short':
        if C.get('fringe') is False: lv.remove_fringe(L)
        L['hair_front'] = lv.recolor(L['hair_front'], hm); L['hair_back'] = lv.recolor(L['hair_back'], hm)
        pal['_maps']['hair_front'] = pal['_maps']['hair_back'] = hm
    if O['shirt'].get('notie'):
        for y in range(18, 40):
            for x in range(lv.CW):
                if L['acc'][y, x] and y >= 23: L['shirt'][y, x] = 'C2' if (x + y) % 5 else 'C3'
        L['acc'] = lv.empty()
    pt = O['pants']
    if pt.get('rips') and pt['type'] == 'trousers':
        for (x, y) in ((8, 46), (9, 46), (7, 54), (8, 54), (15, 50), (16, 50), (9, 59), (16, 58)): L['rips'][y, x + lv.OX] = 'RW'
        for (x, y) in ((8, 47), (7, 55), (15, 51)): L['rips'][y, x + lv.OX] = 'RS'
    return L, pal


lv.build_char_layers = bcl


def keypal(pal):
    p = dict(pal); p.update(KEYS)
    p['RS'] = KEYS['Ka']
    return p


def shoe_style(P, style):
    """sneakers: white sole row; boots / hightops: 2-3 row shaft over the trouser hem (own layer drawn after the pants)"""
    over = lv.empty()
    if style == 'shoes': return over
    sh = P['shoes']; pa = P['pants']
    cols = [x for x in range(lv.CW) if (sh[:, x] != '').any()]
    if style in ('sneakers', 'hightops'):
        ymax = max(max(np.nonzero(sh[:, x] != '')[0]) for x in cols) if cols else 0
        for x in cols:     # sole only along the ground line (seated back foot / overlaps would leave stray white pixels)
            y = max(np.nonzero(sh[:, x] != '')[0])
            if y >= ymax - 2: sh[y, x] = 'S3'
    if style in ('boots', 'hightops'):
        n = 3 if style == 'boots' else 2
        for x in cols:
            y0 = min(np.nonzero(sh[:, x] != '')[0])
            for y in range(max(0, y0 - n), y0):
                if pa[y, x]:
                    l = x - 1 < 0 or not pa[y, x - 1]; r = x + 1 >= lv.CW or not pa[y, x + 1]
                    over[y, x] = 'S1' if (l or r) else ('S2' if y == y0 - n and style == 'boots' else 'S0')
                    if style == 'hightops' and y == y0 - n: over[y, x] = 'S3'
    return over


def render(C, O, gl=False, faces=False, shoes='shoes', facial_C=None, fem=False):
    se, pal = lv.build_char_layers(C, O)
    if fem: fem_jaw(se)
    ne = lv.back_layers(se, C, O)
    pal = keypal(pal)
    blank = lambda: Image.new('RGBA', (FW * COLS, FH * ROWS))
    layers = {k: blank() for k in lv.ORDER + ['shoes_over']}
    FS = {s: [blank(), blank(), blank()] for s in SETS} if faces else None    # face, brows, facial
    yy, xx = np.mgrid[0:FH, 0:FW]
    Cp = dict(C); Cp.pop('mustache', None); Cp.pop('stubble', None)
    for anim, r0 in lv.ROWMAP.items():
        kind = lv.KIND[anim]; nf = 6 if anim in ('walk', 'swim') else 4
        for di, d in enumerate(lv.DIRS):
            view = 'se' if d in ('se', 'sw') else 'ne'; mir = d in ('sw', 'nw')
            for f in range(nf):
                base = se if view == 'se' else ne
                P = lv.pose_layers(base, kind, f, view, C, O)
                for mk, mp in pal['_maps'].items(): P[mk] = lv.recolor(P[mk], mp)
                if (O.get('outer') or {}).get('dots'):
                    P['outer'] = lv.add_dots(P['outer']); P['shirt'] = lv.add_dots(P['shirt'], ('C1', 'C2', 'C3')); P['arm_near'] = lv.add_dots(P['arm_near']); P['arm_far'] = lv.add_dots(P['arm_far'])
                if fem: fem_body(P, kind)
                # Restore both shoulder joins after female waist/arm pinching.
                lv.attach_arm_roots(P)
                P['shoes_over'] = shoe_style(P, shoes)
                pos = (f * FW, (r0 + di) * FH)
                rg = {k: lv.to_img(v, pal) for k, v in P.items() if k not in ('face', 'brows', 'acc_head')}
                imgs = lv.frame_img(rg)
                sh = np.zeros((FH, FW, 4), np.uint8); cx = 32 + (1 if kind in lv.SEATED else 0)
                if kind not in ('swim', 'float'): sh[((xx + .5 - cx) / 11) ** 2 + ((yy + .5 - 100.5) / 2.4) ** 2 <= 1] = (0, 0, 0, 56)
                imgs['shadow'] = Image.fromarray(sh, 'RGBA')
                if anim in ('lie', 'float'): imgs = lv.lie_flat(imgs, view, anim)
                fxa = np.zeros((FH, FW, 4), np.uint8)
                if anim in ('swim', 'float'):
                    imgs['shadow'] = Image.fromarray(lv.water_img(anim, f, False), 'RGBA'); fxa = lv.water_img(anim, f, True)
                imgs['fx'] = Image.fromarray(fxa, 'RGBA')
                fl = (lambda im: im.transpose(Image.FLIP_LEFT_RIGHT)) if mir else (lambda im: im)
                if anim in ('sleep', 'tired', 'lie'):
                    zi = Image.fromarray(lv.zzz_img(anim, f, view, mir), 'RGBA'); imgs['fx'] = Image.alpha_composite(imgs['fx'], fl(zi))
                for k, im in imgs.items(): layers[k].paste(fl(im), pos)
                sitD = lv.SIT_D if kind in lv.SEATED else 0
                hd, hdx = lv.HEADD.get(anim, (0, 0))
                bob = (-1 if f in (2, 3) else 0) if kind in ('idle', 'talk') else ((-1 if f in (1, 4) else 0) if kind == 'walk' else 0)
                bob += hd; fdx = hdx if view == 'se' else 0
                def fimgs(e, CC, g=False):
                    F, B, G = lv.face_layer(e, CC, view, sitD, bob, g, fdx)
                    F = lv.recolor(F, SKIN)
                    return F, B, G
                def place(arrs):
                    fi = lv.frame_img({k: lv.to_img(v, pal) for k, v in arrs.items()})
                    if anim in ('lie', 'float'): fi = lv.lie_flat(fi, view, anim)
                    return {k: fl(v) for k, v in fi.items()}
                seq = lv.BAKE.get(anim, ['neutral']); bk = seq[f % len(seq)]
                F, B, G = fimgs(bk, Cp, gl)
                o = place({'f': F, 'b': B, 'g': G}); layers['face'].paste(o['f'], pos); layers['brows'].paste(o['b'], pos); layers['acc_head'].paste(o['g'], pos)
                if faces:
                    for s in SETS:
                        e = bk if s == 'baked' else ('blink' if anim in lv.CLOSED else s)
                        F, B, _ = fimgs(e, Cp)
                        arr = {'f': F, 'b': B}
                        if facial_C:
                            F2, _, _ = fimgs(e, facial_C); D = lv.empty(); m = F2 != F; D[m] = F2[m]; arr['x'] = D
                        o = place(arr); FS[s][0].paste(o['f'], pos); FS[s][1].paste(o['b'], pos)
                        if facial_C: FS[s][2].paste(o['x'], pos)
    return layers, FS


def cfg(hair='mid_curtain', top='tee', pants='trousers', lash=False, facial=None, gshape=None):
    C = copy.deepcopy(CFG0); C.pop('mustache', None); C.pop('stubble', None)
    st, fr = HAIRS[hair]; C['hair_style'] = st
    if fr is None: C.pop('fringe', None)
    else: C['fringe'] = fr
    C['hair_map'] = {k: v for k, v in CFG0['hair_map'].items()}
    T = TOPS[top]; C['sleeves'] = T.get('sleeves', 'short')
    if lash: C['lash'] = True
    if facial: C.update(FACIAL[facial])
    if gshape is not None or True: C['glasses_shape'] = gshape
    O = {'shirt': copy.deepcopy(T['shirt']), 'outer': copy.deepcopy(T.get('outer')), 'acc': None, 'pants': copy.deepcopy(PANTS[pants]),
         'shoes': {'id': 'x', 'color': '#5A412F'}, 'held': None}
    return C, O


def save(im, rel):
    p = os.path.join(OUT, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    if im.getbbox() is None: im = Image.new('RGBA', (1, 1))
    im.save(p, optimize=True)


def merge_layers(L, keys):
    o = Image.new('RGBA', L[keys[0]].size)
    for k in keys: o.alpha_composite(L[k])
    return o


def job(j):
    t0 = time.time(); kind, name = j
    if kind == 'hair':
        C, O = cfg(hair=name); L, FS = render(C, O, faces=True)
        save(L['hair_back'], f'hair/{name}_back.png'); save(L['hair_front'], f'hair/{name}_front.png')
        np.save(os.path.join(OUT, f'_body_{name}.npy'), np.array(L['body']))
        fr = FRINGE[HAIRS[name][1]]
        if name in ('short', 'swept', 'mid_curtain'):
            for s in SETS: save(FS[s][1], f'brows/{fr}_{lv.VNAME.get(s, s)}.png')
    elif kind == 'hairf':       # female body template: body union only (hair parts are shared)
        C, O = cfg(hair=name); L, _ = render(C, O, fem=True)
        np.save(os.path.join(OUT, f'_bodyf_{name}.npy'), np.array(L['body']))
    elif kind == 'face':
        lash = name == 'f'; C, O = cfg(lash=lash); L, FS = render(C, O, faces=True, fem=lash)
        for s in SETS: save(FS[s][0], f'face/{name}_{lv.VNAME.get(s, s)}.png')
        if not lash:
            save(L['shadow'], 'base/shadow.png'); save(L['fx'], 'base/fx.png'); save(L['body_front'], 'base/body_front.png')
        else: save(L['body_front'], 'base/body_front_f.png')
    elif kind == 'facial':
        C, O = cfg(); Cf, _ = cfg(facial=name); L, FS = render(C, O, faces=True, facial_C=Cf)
        save(FS['baked'][2], f'facial/{name}.png'); save(FS['surprised'][2], f'facial/{name}_surpr.png')
    elif kind == 'glasses':
        C, O = cfg(gshape=GLASSES[name]); L, _ = render(C, O, gl=True)
        save(L['acc_head'], f'glasses/{name}.png')
    else:
        for fem, sf in ((False, ''), (True, '_f')):
            if kind == 'top':
                C, O = cfg(top=name); L, _ = render(C, O, fem=fem)
                save(L['arm_far'], f'top/{name}_back{sf}.png'); save(merge_layers(L, ['shirt', 'shirt_graphic', 'outer', 'acc', 'arm_near']), f'top/{name}{sf}.png')
            elif kind == 'pants':
                C, O = cfg(pants=name); L, _ = render(C, O, fem=fem)
                save(merge_layers(L, ['pants', 'rips']), f'pants/{name}{sf}.png')
            elif kind == 'shoes':
                C, O = cfg(); L, _ = render(C, O, shoes=name, fem=fem)
                save(L['shoes'], f'shoes/{name}{sf}.png')
                if name in ('boots', 'hightops'): save(L['shoes_over'], f'shoes/{name}_over{sf}.png')
    return f'{kind}:{name} {time.time() - t0:.0f}s'


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    jobs = [('hair', h) for h in HAIRS] + [('hairf', h) for h in HAIRS] + [('face', 'm'), ('face', 'f')] + [('facial', k) for k in FACIAL] + [('top', t) for t in TOPS] + \
           [('pants', p) for p in PANTS] + [('shoes', s) for s in SHOES] + [('glasses', g) for g in GLASSES]
    only = sys.argv[1:]
    if only: jobs = [j for j in jobs if j[0] in only or f'{j[0]}:{j[1]}' in only]
    with Pool(int(os.environ.get('NP', '4'))) as p:
        for r in p.imap_unordered(job, jobs): print(r, flush=True)
    # body = union of the body layers of every hair run (forehead skin of swept/curtain, ears of short hair) - hair is drawn over it
    for pre, outn in (('_body_', 'base/body.png'), ('_bodyf_', 'base/body_f.png')):
        bs = sorted(f for f in os.listdir(OUT) if f.startswith(pre))
        if bs and (not only or 'hair' in only or 'hairf' in only):
            acc = None
            for f in bs:
                a = np.load(os.path.join(OUT, f))
                if acc is None: acc = a.copy()
                else: m = (acc[..., 3] == 0) & (a[..., 3] > 0); acc[m] = a[m]
            save(Image.fromarray(acc, 'RGBA'), outn)
    json.dump({'keys': {c: '#%02X%02X%02X' % k for c, k in KEYS.items()}, 'hairs': list(HAIRS), 'fringe': {h: FRINGE[v[1]] for h, v in HAIRS.items()},
               'tops': list(TOPS), 'pants': list(PANTS), 'shoes': SHOES, 'glasses': list(GLASSES), 'facial': list(FACIAL), 'sets': [lv.VNAME.get(s, s) for s in SETS]},
              open(os.path.join(OUT, 'keys.json'), 'w'), indent=1)
    print('done')
