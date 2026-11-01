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

def build(name):
    skw, people, L, note = RIDERS[name]; s = sc.Scoot(**skw)
    Bs = [(ch.build_char(spec), hx_, anim, ex) for spec, hx_, anim, ex in people]
    out = {}
    for d in DIRS:
        far_first = d in ('se', 'sw')        # facing the viewer: back riders first, front body over the riders
        wheels = [s.render('wheels', d, ph) for ph in sorted(set(PHASE))]; wmap = dict(zip(sorted(set(PHASE)), wheels))
        rear, piv = s.render('rear', d); front, _ = s.render('front', d)
        for f in range(NF):
            cv = Image.new('RGBA', (CV, CV)); ox, oy = PV[0] - piv[0], PV[1] - piv[1]
            cv.alpha_composite(wmap[PHASE[f]][0], (ox, oy))
            by = BODY_DY[f]
            riders = []
            for B, hx_, anim, ex in Bs:
                im = ch.frame(B, anim, 0, d, ex)
                sx, sy = sc.to_screen(d, hx_ + AX, 0, AZ)
                px = 31 if d in ('sw', 'nw') else 32
                riders.append((im, (int(round(PV[0] + sx - px)), int(round(PV[1] + sy - 100)) + RIDER_DY[f])))
            if far_first:
                cv.alpha_composite(rear, (ox, oy + by))
                for im, pos in riders: cv.alpha_composite(im, pos)
                cv.alpha_composite(front, (ox, oy + by))
            else:
                cv.alpha_composite(front, (ox, oy + by))
                # back view: front rider is farthest -> draw front rider first, then the ones behind, then the rear body
                for im, pos in riders[::-1]: cv.alpha_composite(im, pos)
                cv.alpha_composite(rear, (ox, oy + by))
            out[d, f] = cv
    return name, out
