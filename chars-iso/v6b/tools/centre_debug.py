"""centre-line debug: per direction, idle / walk 1-6 / sit; red = pivot x 32, ticks: head (hair+skin rows 32-52), torso (shirt rows 56-68),
hips (pants rows 71-74), feet (shoes). Also prints the numbers."""
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__)); import live_v6b as T
R = T.ROOT + '/live'; PV = R + '/previews'
COL = {'head': (40, 160, 255), 'torso': (255, 160, 0), 'hips': (170, 60, 220), 'feet': (0, 170, 80)}
def centre(a, y0, y1):
    m = a[y0:y1, :, 3] > 0
    xs = np.nonzero(m.any(0))[0]
    return None if not len(xs) else (xs.min() + xs.max()) / 2
for n in ('ichsan', 'noor'):
    man = json.load(open(f'{R}/parts/{n}/manifest.json')); key = list(man['sheets'])[0]; lay = man['sheets'][key]['layers']
    Ls = {k: np.array(Image.open(f'{R}/parts/{n}/{lay[k]}')) for k in T.ORDER}
    sh = np.array(Image.open(f'{R}/{n}_v6b_sheet.png'))
    Z = 5; cw, chh = 60, 84; o = Image.new('RGBA', (70 + 8 * cw * Z, 30 + 4 * chh * Z), (250, 250, 248, 255)); d = ImageDraw.Draw(o)
    for i, t in enumerate(['idle'] + [f'walk {k}' for k in range(1, 7)] + ['sit']): d.text((70 + i * cw * Z + 6, 8), t, fill=(0, 0, 0))
    print(n)
    for di, dd in enumerate(T.DIRS):
        d.text((10, 30 + di * chh * Z + 40), dd, fill=(200, 0, 0))
        cells = [(T.ROWMAP['idle'] + di, 0)] + [(T.ROWMAP['walk'] + di, f) for f in range(6)] + [(T.ROWMAP['sit'] + di, 0)]
        line = []
        for i, (r, c) in enumerate(cells):
            def cut(a): return a[r * 112:(r + 1) * 112, c * 64:(c + 1) * 64]
            head = np.maximum(cut(Ls['hair_front']), cut(Ls['body'])); head[53:] = 0
            torso = np.maximum(cut(Ls['shirt']), cut(Ls['outer']))
            yt = 56 if r < 12 or r > 15 else 59
            m = {'head': centre(head, 30, 53), 'torso': centre(torso, yt, yt + 12), 'hips': centre(cut(Ls['pants']), yt + 15, yt + 18), 'feet': centre(cut(Ls['shoes']), 90, 101)}
            line.append(' '.join(f'{k[0]}{v:.1f}' if v is not None else f'{k[0]}-' for k, v in m.items()))
            fr = Image.fromarray(cut(sh)); bg = Image.new('RGBA', (64, 112), (236, 232, 224, 255)); bg.alpha_composite(fr)
            im = bg.crop((2, 24, 62, 108)).resize((cw * Z, chh * Z), Image.NEAREST); dd2 = ImageDraw.Draw(im)
            X = lambda x: (x - 2 + 0.5) * Z
            dd2.line([(X(32), 0), (X(32), chh * Z)], fill=(230, 0, 0), width=1)
            for k, yy in (('head', 34), ('torso', yt + 6), ('hips', yt + 16), ('feet', 98)):
                if m[k] is not None:
                    x = X(m[k]); y = (yy - 24) * Z; dd2.line([(x, y - 12), (x, y + 12)], fill=COL[k], width=3)
            o.alpha_composite(im, (70 + i * cw * Z, 30 + di * chh * Z))
        print(' ', dd, ' | '.join(line))
    y = o.height - 20
    for j, (k, c) in enumerate(COL.items()): d.text((70 + j * 120, 14 + 0), '', fill=c)
    o.save(f'{PV}/{n}_centreline_debug.png')
