#!/usr/bin/env python3
"""v6b NPC sheets: every existing game NPC rebuilt with the SAME modular v6b generator (live_v6b poses + parts_v6b creator
extras + female body template), real colours, plus NPC-only features drawn as code layers: hijab, face mask, ponytail,
cap, hair tufts, skirt / dress, apron, sleeve trim. Output: v6b/live/npc/<name>_v6b_sheet.png (+ _f<expr>.png overlays)."""
import os, sys, json, copy
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import live_v6b as lv
import parts_v6b as pv
import pal6
from multiprocessing import Pool

FW, FH, COLS, ROWS, OX, CW, CH = lv.FW, lv.FH, lv.COLS, lv.ROWS, lv.OX, lv.CW, lv.CH
OUT = os.path.join(lv.ROOT, 'live', 'npc')
hx = lv.hx
CL = {'night': '#1C2330', 'charcoal': '#2A3242', 'slate': '#3A4458', 'grey': '#5A6577', 'paper': '#E7EBF2', 'ivory': '#EDE6D8', 'walnut': '#6B4F3A',
      'walnutlt': '#94704F', 'oxblood': '#7A2E35', 'steel': '#3E6FA8', 'navy': '#27386B', 'lgrey': '#B9C0CC', 'black': '#24252B'}
HR = {'walnut': pal6.hair('#6B4F3A', '#94704F'), 'darkwalnut': pal6.hair('#3D2A1E', '#6B4F3A'), 'black': pal6.HAIR['navy'], 'silver': pal6.hair('#A9B1BF', '#E7EBF2')}
SK = {'light': pal6.SKIN['light'], 'medium': pal6.SKIN['medium'], 'deep': pal6.SKIN['brown']}

# ---------------------------------------------------------------- NPC roster (role / outfit / colours kept from the old sheets)
NPCS = {
 'raka':       dict(body='f', skin='light', hair='swept', hc='walnut', top='tee', tc='walnutlt', pants='trousers', pc='slate', shoes='sneakers', sc='paper', ponytail=True),
 'nadia':      dict(body='f', skin='light', hair='mid', hc='darkwalnut', top='tee', tc='steel', pants='trousers', pc='steel', shoes='shoes', sc='night', skirt=('knee', 'night')),
 'bima':       dict(body='m', skin='light', hair='short', hc='black', top='shirt', tc='paper', pants='trousers', pc='lgrey', shoes='boots', sc='night'),
 'ellen':      dict(body='f', skin='light', hair='long', hc='walnut', top='tee', tc='oxblood', pants='trousers', pc='charcoal', shoes='shoes', sc='night', skirt=('knee', 'skin')),
 'grok_bot':   dict(body='m', skin='light', hair='short', hc='silver', top='tee', tc='paper', pants='trousers', pc='grey', shoes='sneakers', sc='paper'),
 'bu_warteg':  dict(body='f', skin='medium', hair='long', hc='black', top='tee_long', tc='steel', pants='trousers', pc='steel', shoes='shoes', sc='night', hijab='oxblood', skirt=('long', 'night'), apron=True),
 'fm_kasir':   dict(body='f', skin='medium', hair='long', hc='black', top='tee_long', tc='charcoal', pants='trousers', pc='night', shoes='shoes', sc='night', hijab='night', glasses=True),
 'fm_barista': dict(body='m', skin='light', hair='short', hc='black', top='tee', tc='charcoal', pants='trousers', pc='charcoal', shoes='shoes', sc='night', cap='black', trim='#2EB84A'),
 # forest-fire protest group (visual only, walk strip)
 'mhs_f1': dict(body='f', skin='light', hair='long', hc='black', top='shirt_l', tc='navy', pants='trousers', pc='night', shoes='shoes', sc='night', hijab='night', mask='white', skirt=('long', 'night')),
 'mhs_f2': dict(body='f', skin='medium', hair='long', hc='black', top='shirt_l', tc='navy', pants='trousers', pc='charcoal', shoes='sneakers', sc='paper', hijab='charcoal'),
 'mhs_m1': dict(body='m', skin='medium', hair='short', hc='black', top='shirt_l', tc='navy', pants='trousers', pc='night', shoes='sneakers', sc='night', mask='white'),
 'mhs_m2': dict(body='m', skin='light', hair='swept', hc='black', top='shirt_l', tc='navy', pants='trousers', pc='charcoal', shoes='shoes', sc='night', quiff=True),
 'mhs_f3': dict(body='f', skin='light', hair='long', hc='black', top='shirt_l', tc='navy', pants='trousers', pc='night', shoes='sneakers', sc='grey', hijab='night', mask='black'),
 'mhs_m3': dict(body='m', skin='deep', hair='short', hc='black', top='shirt_l', tc='navy', pants='trousers', pc='slate', shoes='sneakers', sc='night', tufts=True),
 'war_m1': dict(body='m', skin='medium', hair='short', hc='black', top='tee', tc='charcoal', pants='trousers', pc='slate', shoes='sneakers', sc='night', mask='black'),
 'war_f1': dict(body='f', skin='medium', hair='long', hc='black', top='hoodie', tc='grey', pants='trousers', pc='charcoal', shoes='sneakers', sc='paper', hijab='charcoal', mask='white'),
 'war_m2': dict(body='m', skin='deep', hair='long', hc='black', top='tee', tc='charcoal', pants='trousers', pc='night', shoes='sneakers', sc='night', hijab='ivory', checker=True, mask='black'),
 'war_m3': dict(body='m', skin='light', hair='long', hc='black', top='tee', tc='charcoal', pants='trousers', pc='charcoal', shoes='shoes', sc='night'),
}
DEMO_ORDER = ['mhs_f1', 'mhs_f2', 'mhs_m1', 'mhs_m2', 'mhs_f3', 'mhs_m3', 'war_m1', 'war_f1', 'war_m2', 'war_m3']


def ramp(c, kind='cloth'):
    c = hx(c); W = (255, 255, 255)
    return [lv.tone(c, .55), lv.tone(c, .72), lv.tone(c, .86), c, lv.mix(c, W, .22)]


# ---------------------------------------------------------------- base-layer features (unposed se / ne; posing moves them)
def _edge(m, x, y, extra=None):
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        q = (x + dx, y + dy)
        if q not in m: return True
    return False


def paint_cloth(a, m, face=frozenset(), checker=False, top_hl=True, folds=()):
    ys = [y for _, y in m] or [0]; y0 = min(ys); xs = [x for x, _ in m] or [0]; x0 = min(xs)
    for (x, y) in m:
        if any((x + dx, y + dy) in face for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): c = 'J2'
        elif _edge(m, x, y): c = 'J1'
        elif checker: c = 'J4' if ((x // 2 + y // 2) % 2) else 'J1'
        elif top_hl and y <= y0 + 3 and x <= x0 + 8: c = 'J4'
        elif x in folds and y >= 23: c = 'J2'
        else: c = 'J3'
        a[y, x] = c


def hijab(se, ne, checker=False):
    """head + neck wrapped, oval face opening, drape over the shoulders/chest (cloth ramp J1-J4)"""
    R = lambda x: x + OX
    for L, view in ((se, 'se'), (ne, 'ne')):
        hf, hb, bd, sh = L['hair_front'], L['hair_back'], L['body'], L['shirt']
        head = {(x, y) for y in range(0, 23) for x in range(CW) if hf[y, x] or hb[y, x] or bd[y, x]}
        face = set()
        if view == 'se':
            face = {(x, y) for (x, y) in head if 13 <= y <= 21 and bd[y, x] and not hf[y, x]}
            face -= {(x, 21) for x in range(CW)} - {(x, 21) for x in range(R(11), R(19))}
        m = head - face
        # drape: shoulders + chest, rounded hem
        for y in range(22, 31):
            xs = [x for x in range(CW) if sh[y, x] or L['outer'][y, x]]
            if not xs: continue
            a, b = min(xs), max(xs)
            cut = max(0, y - 27) * 2
            for x in range(a + cut, b - cut + 1): m.add((x, y))
        hf[:] = ''; hb[:] = ''
        paint_cloth(hf, m, face, checker, folds=(R(9), R(14)) if view == 'se' else (R(12), R(17)))


def ponytail(se, ne):
    R = lambda x: x + OX
    for (x, y) in [(x, y) for y in range(9, 27) for x in range(R(1), R(5)) if not (y > 22 and x in (R(1), R(4)))]:
        se['hair_back'][y, x] = 'H1' if x in (R(1),) or y == 26 else ('H3' if x == R(3) else 'H2')
    hf = ne['hair_front']; xs = [x for x in range(CW) if hf[8, x]]; cx = (min(xs) + max(xs)) // 2 if xs else R(18)
    for y in range(12, 28):
        w = 2 if y < 24 else 1
        for x in range(cx - w, cx + w):
            hf[y, x] = 'H1' if x == cx - w or y == 27 else ('H3' if x == cx else 'H2')
    for x in range(cx - 2, cx + 2): hf[11, x] = 'J?'.replace('J?', 'H0')


def tufts(se, ne):
    for L in (se, ne):
        hf = L['hair_front']; ys = [y for y in range(CH) if (hf[y] != '').any()]; top = min(ys)
        xs = np.nonzero(hf[top] != '')[0]
        for x in range(xs[0] - 3, xs[-1] + 4, 2):
            if hf[top + 1, x] or hf[top + 2, x]:
                hf[top - 1, x] = 'H2'; hf[top - 2, x] = 'H1' if x % 4 else ''
        for y in range(top + 2, top + 10, 2):
            for x in range(CW):
                if hf[y, x] and hf[y, x] not in ('H0',) and (x + y) % 3 == 0: hf[y, x] = 'H1'


def quiff(se, ne):
    hf = se['hair_front']; ys = [y for y in range(CH) if (hf[y] != '').any()]; top = min(ys)
    xs = np.nonzero(hf[top + 1] != '')[0]
    for x in range(xs[-1] - 7, xs[-1] + 1): hf[top - 1, x] = 'H3' if x < xs[-1] else 'H1'
    for x in range(xs[-1] - 5, xs[-1] - 1): hf[top - 2, x] = 'H4' if x % 2 else 'H3'
    hf2 = ne['hair_front']; ys = [y for y in range(CH) if (hf2[y] != '').any()]; t2 = min(ys); xs2 = np.nonzero(hf2[t2] != '')[0]
    for x in range(xs2[0], xs2[0] + 6): hf2[t2 - 1, x] = 'H3'


def cap(se, ne):
    for L, view in ((se, 'se'), (ne, 'ne')):
        hf = L['hair_front']; ys = [y for y in range(CH) if (hf[y] != '').any()]; top = min(ys)
        for y in range(top, top + 7):
            for x in range(CW):
                if hf[y, x]: hf[y, x] = 'X1' if (y == top or not hf[y - 1, x] or not hf[y, x - 1] or not hf[y, x + 1]) else ('X3' if y < top + 3 else 'X2')
        xs = np.nonzero(hf[top + 6] != '')[0]
        if view == 'se':
            for x in range(xs[-1] - 6, xs[-1] + 4): hf[top + 7, x] = 'X1'
            for x in range(xs[-1] - 4, xs[-1] + 3): hf[top + 6, x] = 'X2'
        else:
            for x in range(xs[0] - 3, xs[0] + 3): hf[top + 7, x] = 'X1'


def trim(se, ne):
    """coloured hem on the short sleeves (FamilyMart green)"""
    for L in (se, ne):
        sh = L['shirt']
        for x in range(CW):
            if OX + 6 <= x <= OX + 20: continue
            ys = [y for y in range(22, 33) if sh[y, x]]
            if ys: sh[max(ys), x] = 'G1'; sh[max(ys) - 1, x] = 'G2' if sh[max(ys) - 1, x] else ''


# ---------------------------------------------------------------- posed-layer features
STAND = ('idle', 'walk', 'talk', 'tired', 'idle0', 'lie', 'float')


def skirt(P, kind, length, legs):
    """pants -> skirt down to the hem; legs below the hem become skin (or tights)"""
    pa = P['pants']; ys = np.nonzero((pa != '').any(1))[0]
    if not len(ys): return
    y0 = ys[0]
    seated = kind in lv.SEATED
    if seated: hem = CH if length == 'long' else y0 + 9
    else: hem = 63 if length == 'long' else 55
    lm = ({'P1': 'Ki', 'P2': 'Ki', 'P3': 'Ke', 'P4': 'K7'} if legs == 'skin' else {'P1': 'L2', 'P2': 'L2', 'P3': 'L3', 'P4': 'L1'})
    new = pa.copy()
    for y in range(CH):
        xs = np.nonzero(pa[y] != '')[0]
        if not len(xs): continue
        if y > hem:
            for x in xs: new[y, x] = lm.get(pa[y, x], pa[y, x])
            continue
        if not seated and y >= 40:
            a, b = xs[0], xs[-1]
            fl = 1 if y >= 47 else 0
            fl += 1 if (length == 'long' and y >= 56) else 0
            for x in range(a - fl, b + fl + 1): new[y, x] = 'P1' if x == a - fl + 1 and y > 44 else 'P2'
            new[y, a - fl] = 'P4'; new[y, b + fl] = 'P4'
            if y == hem: new[y, a - fl:b + fl + 1] = 'P4'
            for x in range(a + 3, b - 1, 4):
                if y > 45: new[y, x] = 'P3'
    P['pants'] = new; P['rips'][:] = ''


def apron(P, kind, view):
    sh = P['shirt']; ys = np.nonzero((sh != '').any(1))[0]
    if not len(ys): return
    top = ys[0]; ac = P['acc']; seated = kind in lv.SEATED
    if view == 'se':
        xs = np.nonzero(sh[top + 8] != '')[0]
        if not len(xs): return
        A, Bx = xs[0] + 2, xs[-1] - 2
        yb = (top + 32) if not seated else (top + 17)
        for y in range(top + 4, yb + 1):
            if y < top + 13: a, b = A + 2, Bx - 2          # bib
            else: a, b = A - (1 if y > top + 20 else 0), Bx + (1 if y > top + 20 else 0)
            for x in range(a, b + 1):
                if y >= top + 18 and not P['pants'][y, x] and not sh[y, x]: continue
                edge = x in (a, b) or y in (top + 4, yb)
                ac[y, x] = 'A3' if edge else ('A2' if (x - a) % 4 == 3 and y > top + 14 else 'A1')
        for x in range(A - 2, Bx + 3):            # waist tie band
            if sh[top + 13, x] or P['outer'][top + 13, x]: ac[top + 13, x] = 'A2'
        for x in (A + 2, Bx - 2):                  # neck straps
            for y in range(top, top + 4): ac[y, x] = 'A2'
    else:
        xs = np.nonzero(sh[top + 13] != '')[0]
        for x in xs: ac[top + 13, x] = 'A2'
        if len(xs):
            c = (xs[0] + xs[-1]) // 2
            for (dx, dy) in ((-1, -1), (1, -1), (0, 0), (-1, 1), (1, 1), (0, 2), (-1, 3)): ac[top + 13 + dy, c + dx] = 'A1' if dy != 0 else 'A3'


def mask_face(F, view, sitD, bob, dx, face_window):
    if view != 'se': return
    for (x, y) in face_window:
        if 17 <= y <= 21:
            Y, X = y + sitD + bob, x + dx
            F[Y, X] = 'M3' if (y == 17 or (x, y + 1) not in face_window or (x + 1, y) not in face_window or (x - 1, y) not in face_window) else ('M2' if y == 19 else 'M1')


# ---------------------------------------------------------------- build
def make_cfg(n):
    fem = n['body'] == 'f'
    top = {'shirt_l': 'shirt', 'hoodie': 'cardigan'}.get(n['top'], n['top'])
    C, O = pv.cfg(hair=n['hair'], top=top, pants=n['pants'], lash=fem, gshape=None)
    if n['top'] in ('shirt_l', 'hoodie', 'tee_long'): C['sleeves'] = 'long'
    if n.get('hijab'): C['fringe'] = False
    hr = HR[n['hc']]; C['hair_map'] = {str(i): hr[i] for i in range(5)}; C['brow'] = hr[0]
    C['skin_map'] = dict(SK[n['skin']])
    O['shirt']['color'] = CL[n['tc']]
    if n['top'] == 'hoodie': O['shirt']['color'] = CL[n['tc']]; O['outer']['color'] = CL[n['tc']]
    if n['top'] == 'shirt_l' or n['top'] == 'shirt': O['shirt']['notie'] = True
    O['pants']['color'] = CL[n['pc']]; O['shoes'] = {'id': 'x', 'color': CL[n['sc']]}
    return C, O


def build(name):
    n = NPCS[name]; fem = n['body'] == 'f'; C, O = make_cfg(n)
    se, pal = lv.build_char_layers(C, O)
    if fem: pv.fem_jaw(se)
    hm = {k: 'H' + k for k in '01234'}
    for k, v in C['hair_map'].items(): pal['H' + k] = hx(v)
    pal['B'] = hx(C['brow'])
    ne = lv.back_layers(se, C, O)
    face_window = {(x, y) for y in range(13, 22) for x in range(CW) if se['body'][y, x] and not se['hair_front'][y, x]}
    if n.get('hijab'):
        hijab(se, ne, n.get('checker')); jr = ramp(CL[n['hijab']])
        pal.update({'J1': jr[0], 'J2': jr[2], 'J3': jr[3], 'J4': jr[4]})
        if n.get('checker'): pal.update({'J1': hx('#1C2330'), 'J2': hx('#3A4458'), 'J3': hx('#EDE6D8'), 'J4': hx('#EDE6D8')})
        face_window = {(x, y) for y in range(13, 22) for x in range(CW) if se['body'][y, x] and not se['hair_front'][y, x]}
        pal['_maps'].pop('hair_front', None); pal['_maps'].pop('hair_back', None)
    if n.get('ponytail'): ponytail(se, ne)
    if n.get('tufts'): tufts(se, ne)
    if n.get('quiff'): quiff(se, ne)
    if n.get('cap'):
        cap(se, ne); cr = ramp(CL[n['cap']]); pal.update({'X1': cr[0], 'X2': cr[2], 'X3': cr[4]})
    if n.get('trim'):
        trim(se, ne); t = hx(n['trim']); pal.update({'G1': t, 'G2': lv.tone(t, .78)})
    if n.get('apron'): pal.update({'A1': hx('#F2F0EA'), 'A2': hx('#D9D5CC'), 'A3': hx('#A9A49A')})
    if n.get('mask'):
        mc = {'white': ('#F4F6FA', '#D9DEE7', '#A9B1BF'), 'black': ('#2A3242', '#1C2330', '#10141B')}[n['mask']]
        pal.update({'M1': hx(mc[0]), 'M2': hx(mc[1]), 'M3': hx(mc[2])})
    if n.get('skirt') and n['skirt'][1] != 'skin':
        lc = hx(CL[n['skirt'][1]]); pal.update({'L1': lv.tone(lc, .7), 'L2': lc, 'L3': lv.tone(lc, .88)})
    for i, c in enumerate(('C2', 'C3', 'C4', 'C4', 'C5')): pal.setdefault(f'O{i + 1}', pal[c])   # long sleeves without an outer layer
    gl = bool(n.get('glasses'))
    blank = lambda: Image.new('RGBA', (FW * COLS, FH * ROWS))
    sheet = blank(); VS = {e: blank() for e in lv.VARS}
    yy, xx = np.mgrid[0:FH, 0:FW]
    for anim, r0 in lv.ROWMAP.items():
        kind = lv.KIND[anim]; nf = 6 if anim in ('walk', 'swim') else 4
        for di, d in enumerate(lv.DIRS):
            view = 'se' if d in ('se', 'sw') else 'ne'; mir = d in ('sw', 'nw')
            for f in range(nf):
                P = lv.pose_layers(se if view == 'se' else ne, kind, f, view, C, O)
                for mk, mp in pal['_maps'].items(): P[mk] = lv.recolor(P[mk], mp)
                if fem: pv.fem_body(P, kind)
                if n.get('skirt'): skirt(P, kind, *n['skirt'])
                if n.get('apron'): apron(P, kind, view)
                # Final shoulder check AFTER female reshape and outfit edits.
                lv.attach_arm_roots(P)
                P['shoes_over'] = pv.shoe_style(P, n['shoes'])
                if n['shoes'] in ('sneakers', 'hightops'): pal.setdefault('S3', hx('#E8E6E0') if sum(hx(CL[n['sc']])) < 500 else hx('#B4B0A8'))
                if n['shoes'] in ('boots', 'hightops'): pal.setdefault('S3', hx('#E8E6E0'))
                pos = (f * FW, (r0 + di) * FH)
                rg = {k: lv.to_img(v, pal) for k, v in P.items() if k not in ('face', 'brows', 'acc_head')}
                imgs = lv.frame_img(rg)
                sh = np.zeros((FH, FW, 4), np.uint8); cx = 32 + (1 if kind in lv.SEATED else 0)
                if kind not in ('swim', 'float'): sh[((xx + .5 - cx) / 11) ** 2 + ((yy + .5 - 100.5) / 2.4) ** 2 <= 1] = (0, 0, 0, 56)
                imgs['shadow'] = Image.fromarray(sh, 'RGBA')
                if anim in ('lie', 'float'): imgs = lv.lie_flat(imgs, view, anim)
                fxa = np.zeros((FH, FW, 4), np.uint8)
                if anim in ('swim', 'float'): imgs['shadow'] = Image.fromarray(lv.water_img(anim, f, False), 'RGBA'); fxa = lv.water_img(anim, f, True)
                imgs['fx'] = Image.fromarray(fxa, 'RGBA')
                fl = (lambda im: im.transpose(Image.FLIP_LEFT_RIGHT)) if mir else (lambda im: im)
                if anim in ('sleep', 'tired', 'lie'):
                    imgs['fx'] = Image.alpha_composite(imgs['fx'], fl(Image.fromarray(lv.zzz_img(anim, f, view, mir), 'RGBA')))
                sitD = lv.SIT_D if kind in lv.SEATED else 0
                hd, hdx = lv.HEADD.get(anim, (0, 0))
                bob = (-1 if f in (2, 3) else 0) if kind in ('idle', 'talk') else ((-1 if f in (1, 4) else 0) if kind == 'walk' else 0)
                bob += hd; fdx = hdx if view == 'se' else 0
                def faceimgs(e):
                    F, B, G = lv.face_layer(e, C, view, sitD, bob, gl, fdx)
                    F = lv.recolor(F, pv.SKIN)
                    for k, v in C['skin_map'].items(): pal.setdefault('K' + k, hx(v))
                    if n.get('mask'): mask_face(F, view, sitD, bob, fdx, face_window)
                    fi = lv.frame_img({'f': lv.to_img(F, pal), 'b': lv.to_img(B, pal), 'g': lv.to_img(G, pal)})
                    if anim in ('lie', 'float'): fi = lv.lie_flat(fi, view, anim)
                    return {k: fl(v) for k, v in fi.items()}
                def frame(e):
                    fi = faceimgs(e); o = Image.new('RGBA', (FW, FH))
                    for k in lv.ORDER + ['shoes_over']:
                        pass
                    seq = ['shadow', 'hair_back', 'body', 'arm_far', 'shoes', 'pants', 'shoes_over', 'rips', 'shirt', 'shirt_graphic', 'outer', 'acc', 'arm_near', 'body_front', 'held']
                    for k in seq:
                        if k in imgs: o.alpha_composite(fl(imgs[k]))
                    o.alpha_composite(fi['f']); o.alpha_composite(fl(imgs['hair_front'])); o.alpha_composite(fi['g']); o.alpha_composite(fi['b']); o.alpha_composite(fl(imgs['fx']))
                    return o
                seq = lv.BAKE.get(anim, ['neutral']); bk = seq[f % len(seq)]
                sheet.paste(frame(bk), pos)
                for ve in lv.VARS: VS[ve].paste(frame('blink' if anim in lv.CLOSED else ve), pos)
    os.makedirs(OUT, exist_ok=True)
    sn = os.path.join(OUT, f'{name}_v6b_sheet.png'); sheet.save(sn, optimize=True); A = np.array(sheet)
    for ve, im in VS.items():
        V = np.array(im); dd = np.any(V != A, axis=2); O2 = np.zeros_like(V); O2[dd] = V[dd]; O2[dd & (V[..., 3] == 0)] = 0
        Image.fromarray(O2, 'RGBA').save(sn.replace('_sheet.png', '_f' + lv.VNAME[ve] + '.png'), optimize=True)
    return name


def demo_strip():
    """protest group: walk se rows 0-9 + walk nw rows 10-19 (same layout as the old demo_walk_strip.png)"""
    o = Image.new('RGBA', (FW * 6, FH * 20))
    for i, nm in enumerate(DEMO_ORDER):
        s = Image.open(os.path.join(OUT, f'{nm}_v6b_sheet.png'))
        o.paste(s.crop((0, 0 * FH, FW * 6, 1 * FH)), (0, i * FH)); o.paste(s.crop((0, 3 * FH, FW * 6, 4 * FH)), (0, (10 + i) * FH))   # walk-nw (evening return)
    o.save(os.path.join(OUT, 'demo_walk_strip_v6b.png'), optimize=True)


if __name__ == '__main__':
    names = sys.argv[1:] or list(NPCS)
    with Pool(int(os.environ.get('NP', '8'))) as p:
        for r in p.imap_unordered(build, names): print('built', r, flush=True)
    if all(os.path.exists(os.path.join(OUT, f'{nm}_v6b_sheet.png')) for nm in DEMO_ORDER): demo_strip(); print('demo strip')
