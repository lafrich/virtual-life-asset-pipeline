"""v6b seated characters for the riders (same generator as the office NPCs: live_v6b poses + parts_v6b + npc_v6b extras).
Rider-only extras drawn as code layers on the v6b base canvas: helmet (+visor rim), jacket logo, batik motif."""
import sys
sys.path.insert(0, 'chars-iso/v6b/tools')
import numpy as np
from PIL import Image
import live_v6b as lv, parts_v6b as pv, npc_v6b as nv
FW, FH, CW, CH, OX = lv.FW, lv.FH, lv.CW, lv.CH, lv.OX
hx = lv.hx
# rider colours added to the generator colour table (in memory only; npc_v6b.py is not edited)
nv.CL.update({'gojek': '#2EB84A', 'maxim': '#F2C14E', 'smagrey': '#8D97A8',
              'sogan': '#6B4F3A', 'bblue': '#27386B', 'bred': '#7A2E35'})
VISOR = (hx('#2E3B52'), hx('#4F6A86'))

def _helmet(se, ne):
    """helmet over the head (key Y1 edge .. Y4 highlight): hair rows to y17, forehead to y11, visor rim row 12 (V1/V2)"""
    for L, view in ((se, 'se'), (ne, 'ne')):
        hf, hb, bd = L['hair_front'], L['hair_back'], L['body']
        head = {(x, y) for y in range(0, 23) for x in range(CW) if hf[y, x] or hb[y, x] or bd[y, x]}
        face = {(x, y) for (x, y) in head if 12 <= y <= 21 and bd[y, x] and not hf[y, x]} if view == 'se' else set()
        m = {(x, y) for (x, y) in head if y <= 17 and (x, y) not in face}
        if view == 'se': m |= {(x, y) for (x, y) in head if y <= 11}
        else: m |= {(x, y) for (x, y) in head if y <= 18 and not (bd[y, x] and y >= 18)}
        dome = set()
        for (x, y) in m:                                      # 1 px bulk: shell is bigger than the hair
            for dx, dy in ((0, -1), (-1, 0), (1, 0)):
                q = (x + dx, y + dy)
                if q not in m and q not in face and q[1] <= 15 and 0 <= q[0] < CW and q[1] >= 0: dome.add(q)
        m |= dome
        for (x, y) in m:
            hf[y, x] = ''; hb[y, x] = ''
        ys = [y for _, y in m]; y0 = min(ys)
        for (x, y) in m:
            row = [xx for (xx, yy) in m if yy == y]; a, b = min(row), max(row); u = (x - a) / max(1, b - a)
            edge = any((x + dx, y + dy) not in m and (x + dx, y + dy) not in face for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if edge and (u > .4 or y > y0 + 6 or y == y0): c = 'Y1'
            elif y <= y0 + 3 and u < .45: c = 'Y4'
            elif u > .68: c = 'Y2'
            else: c = 'Y3'
            hf[y, x] = c
        if view == 'se':                                     # dark visor band (rows 11-12) just above the eyes, one glint
            band = [(x, y) for (x, y) in m | face if y in (11, 12) and (x, y) in head and x >= min(xx for xx, yy in face if yy == 12)]
            for (x, y) in band: hf[y, x] = 'V1'
            xs = sorted(x for x, y in band if y == 11)
            if xs: hf[11, xs[1]] = 'V2'; hf[11, xs[2]] = 'V2'
        else:
            pass

def _ramp(c): return nv.ramp(nv.CL[c])

def build_char(n):
    """base layers + palette for one rider spec (npc_v6b dict + helmet / inner / logo / batik keys)"""
    fem = n['body'] == 'f'; C, O = nv.make_cfg(n)
    if n.get('inner'): O['shirt']['color'] = nv.CL[n['inner']]
    se, pal = lv.build_char_layers(C, O)
    if fem: pv.fem_jaw(se)
    for k, v in C['hair_map'].items(): pal['H' + k] = hx(v)
    pal['B'] = hx(C['brow'])
    ne = lv.back_layers(se, C, O)
    if n.get('hijab'):
        nv.hijab(se, ne, False); jr = _ramp(n['hijab'])
        pal.update({'J1': jr[0], 'J2': jr[2], 'J3': jr[3], 'J4': jr[4]})
        pal['_maps'].pop('hair_front', None); pal['_maps'].pop('hair_back', None)
    if n.get('ponytail'): nv.ponytail(se, ne)
    if n.get('helmet'):
        _helmet(se, ne); r = _ramp(n['helmet'])
        pal.update({'Y1': r[0], 'Y2': r[2], 'Y3': r[3], 'Y4': r[4], 'V1': VISOR[0], 'V2': VISOR[1]})
        pal['_maps'].pop('hair_front', None); pal['_maps'].pop('hair_back', None)
    if n.get('skirt') and n['skirt'][1] != 'skin':
        lc = hx(nv.CL[n['skirt'][1]]); pal.update({'L1': lv.tone(lc, .7), 'L2': lc, 'L3': lv.tone(lc, .88)})
    for i, c in enumerate(('C2', 'C3', 'C4', 'C4', 'C5')): pal.setdefault(f'O{i + 1}', pal[c])
    return dict(n=n, C=C, O=O, se=se, ne=ne, pal=pal, fem=fem)

def _lum(c): return .3 * c[0] + .59 * c[1] + .11 * c[2]

def batik(img, cols, motif, kind):
    """repaint the shirt pixels with a small repeated motif (readable at 1x). cols = set of shirt RGB values.
    Darkest shirt tone (edge) is kept; motif light on lit tones, motif shade on shaded tones."""
    a = np.array(img); tones = sorted(cols, key=_lum)
    if len(tones) < 2: return img
    edge = tones[0]; lit = set(tones[len(tones) // 2:])
    ml, md = hx(motif), lv.tone(hx(motif), .78)
    for y, x in zip(*np.nonzero(a[..., 3] == 255)):
        c = tuple(int(v) for v in a[y, x, :3])
        if c not in cols or c == edge: continue
        if kind == 'parang': on = (x + y) % 4 == 0 and (x - y) % 8 != 0     # broken diagonal bands
        elif kind == 'kawung': on = (x % 4, y % 4) in ((1, 0), (0, 1), (2, 1), (1, 2))          # 4-petal rosettes
        else: on = (x % 3 == 1 and y % 3 == 1) or ((x + 1) % 6 == 0 and (y + 1) % 6 == 0 and False)  # truntum dots
        if on: a[y, x, :3] = ml if c in lit else md
    return Image.fromarray(a)

def logo(o, kind, view):
    """jacket logo: Gojek white ring, Maxim red mark, on chest (se) and back (ne); frame coords before mirroring"""
    a = np.array(o)
    W, R1, R2 = hx('#F4F1EA'), hx('#E5484D'), hx('#BE2F56')
    if view == 'se':
        pts = [(36, 59), (37, 59), (36, 60), (37, 60)]
        c = {(36, 59): W, (37, 59): W, (36, 60): W, (37, 60): hx('#C7CFDC')} if kind == 'gojek' else {(36, 59): R1, (37, 59): R1, (36, 60): R2, (37, 60): R2}
    else:
        ring = [(31, 58), (32, 58), (33, 58), (30, 59), (34, 59), (30, 60), (34, 60), (31, 61), (32, 61), (33, 61)]
        c = {p: (W if kind == 'gojek' else R1) for p in ring}
        if kind == 'gojek': c[(32, 60)] = W
        else: c.update({(33, 60): R2, (34, 61): R2})
    for (x, y), col in c.items():
        if a[y, x, 3] == 255: a[y, x, :3] = col
    return Image.fromarray(a)

def frame(B, anim, f, d, expr='neutral', noarms=False):
    """one 64x112 RGBA frame of a v6b character (no shadow). d in se/sw/ne/nw (sw/nw = mirrored se/ne, as in the game)"""
    n, C, O, pal = B['n'], B['C'], B['O'], B['pal']
    kind = lv.KIND[anim]; view = 'se' if d in ('se', 'sw') else 'ne'; mir = d in ('sw', 'nw')
    P = lv.pose_layers(B['se'] if view == 'se' else B['ne'], kind, f, view, C, O)
    for mk, mp in pal['_maps'].items(): P[mk] = lv.recolor(P[mk], mp)
    if B['fem']: pv.fem_body(P, kind)
    if n.get('skirt'): nv.skirt(P, kind, *n['skirt'])
    P['shoes_over'] = pv.shoe_style(P, n['shoes'])
    if n['shoes'] in ('sneakers', 'hightops'): pal.setdefault('S3', hx('#E8E6E0') if sum(hx(nv.CL[n['sc']])) < 500 else hx('#B4B0A8'))
    if n['shoes'] in ('boots', 'hightops'): pal.setdefault('S3', hx('#E8E6E0'))
    rg = {k: lv.to_img(v, pal) for k, v in P.items() if k not in ('face', 'brows', 'acc_head')}
    imgs = lv.frame_img(rg)
    if n.get('batik'):
        col, kd = n['batik']; cols = set()
        for k in ('shirt',):
            a = np.array(imgs[k]); cols |= {tuple(int(v) for v in p[:3]) for p in a.reshape(-1, 4) if p[3] == 255}
        for k in ('shirt', 'arm_near', 'arm_far', 'outer'):
            if k in imgs: imgs[k] = batik(imgs[k], cols, col, kd)
    F, Bw, G = lv.face_layer(expr, C, view, lv.SIT_D if kind in lv.SEATED else 0, 0, False, 0)
    F = lv.recolor(F, pv.SKIN)
    for k, v in C['skin_map'].items(): pal.setdefault('K' + k, hx(v))
    fi = lv.frame_img({'f': lv.to_img(F, pal), 'b': lv.to_img(Bw, pal), 'g': lv.to_img(G, pal)})
    o = Image.new('RGBA', (FW, FH))
    for k in ['hair_back', 'body', 'arm_far', 'shoes', 'pants', 'shoes_over', 'rips', 'shirt', 'shirt_graphic', 'outer', 'acc']:
        if k in imgs: o.alpha_composite(imgs[k])
    if n.get('logo'): o = logo(o, n['logo'], view)
    info = {}
    if noarms:                                               # arms are redrawn by the compositor (gripping the bars / a waist)
        skin = {tuple(int(v) for v in pal[k]) for k in pal if k.startswith('K') and isinstance(pal[k], tuple)}
        for k in ('arm_near', 'arm_far'):
            a = np.array(imgs[k].transpose(Image.FLIP_LEFT_RIGHT) if mir else imgs[k])
            px = [(tuple(int(v) for v in a[y, x, :3]), y, x) for y, x in zip(*np.nonzero(a[..., 3] == 255))]
            info[k] = dict(px=px, skin=skin)
    for k in (['body_front', 'held'] if noarms else ['arm_near', 'body_front', 'held']):
        if k in imgs: o.alpha_composite(imgs[k])
    o.alpha_composite(fi['f']); o.alpha_composite(imgs['hair_front'])
    if not n.get('helmet'): o.alpha_composite(fi['b'])
    o = o.transpose(Image.FLIP_LEFT_RIGHT) if mir else o
    return (o, info) if noarms else o
