"""Migi props built with the ENVIRONMENT rasteriser (environment/tools/iso.py) so anchors,
outline and light match the environment contract exactly. Palette-only (no new hexes)."""
import os, sys, json
ENV_TOOLS = 'assets/environment/tools'
sys.path.insert(0, ENV_TOOLS)
import numpy as np
from PIL import Image
import iso, palette
from palette import C, M
M['hair'] = ('wall_lit', 'wall_shd', 'floor_lt')        # AD: black-hair ramp pillow
M['ceramic'] = ('paper', 'grey', 'wall_top')            # = environment 'metal' ramp
M['kibble'] = ('wal_lt', 'wal', 'wal_dk')
OUT = 'assets/pets/migi/props'

def line(s, p, q, z, col='gallery_mid'):
    """clean 2:1 stair line on a top plane between two local points (2 px across per 1 px down)"""
    x0, y0 = s.S(p[0], p[1], z); x1, y1 = s.S(q[0], q[1], z)
    n = int(round(abs(x1 - x0)))
    sx = 1 if x1 > x0 else -1; sy = 1 if y1 > y0 else -1
    m = np.zeros(iso.SX.shape, bool)
    for i in range(0, n):
        x = int(np.floor(x0)) + sx * i; y = int(np.floor(y0)) + sy * (i // 2)
        m[y, x] = True
    s._put(m, C[col])

def bed(s):
    s.shadow(inset=0.10)
    lo, hi = 0.13, 0.87
    with s.part(outline=C['void']):
        s.box(lo, lo, hi, hi, 0, 5, 'hair')
        s.box(lo + 0.04, lo + 0.04, hi - 0.04, hi - 0.04, 5, 8, 'hair')   # puffed top
    n = 3; step = (hi - lo - 0.08) / n
    with s.part():
        a0, a1 = lo + 0.04, hi - 0.04
        for k in range(1, n):                       # cream grid on the top (gallery_mid)
            u = a0 + k * step
            line(s, (u, a0), (u, a1), 8)
            line(s, (a0, u), (a1, u), 8)
        for side in ('front', 'right'):            # grid continues down the visible sides
            for k in range(1, n):
                u = a0 + k * step
                if side == 'front': s.face('front', hi, u - 0.012, u + 0.012, 0, 5, 'gallery_mid')
                else: s.face('right', hi, u - 0.012, u + 0.012, 0, 5, 'gallery_mid')
        s.face('front', hi, lo, hi, 2, 3, 'gallery_mid'); s.face('right', hi, lo, hi, 2, 3, 'gallery_mid')
        # dimple in the middle (pillow button), darkest value
        s.top(0.49, 0.49, 0.51, 0.51, 8, 'floor_lt')

def bowl(s, full=False):
    s.shadow(ellipse=True, rx=10)
    with s.part(outline=C['void']):
        s.cyl(0.5, 0.5, 0, 4, 8, 'ceramic')
    with s.part():
        s.rect(0.5, 0.5, 0, -7, -3, 15, 1, C['baize'])          # 1px workspace-baize band
        s.rect(0.5, 0.5, 0, -7, -3, 4, 1, C['baize_lt'])
        s.ell(0.5, 0.5, 4, 6, 'wall_top' if not full else 'wal_dk')
        if full:
            s.ell(0.5, 0.5, 5, 5, 'wal', dy=0)
            for dx, dy, col in ((-2, -1, 'wal_lt'), (1, -1, 'wal_lt'), (3, 0, 'wal_dk'), (-1, 0, 'wal_lt'), (0, -2, 'wal_lt'), (2, 1, 'wal_dk')):
                s.rect(0.5, 0.5, 5, dx, dy, 1, 1, C[col])
        else:
            s.rect(0.5, 0.5, 4, -4, 0, 8, 1, C['wall_shd'])     # inner shadow (bowl floor)

def build(fn, name, **kw):
    s = iso.Sprite(1, 1, 'sw'); fn(s, **kw)
    B, Sh = s.L['base'], s.sh
    u = B[..., 3] > 0
    e = u & ~iso.erode4(u); B[e] = C['void']
    allm = u | (Sh[..., 3] > 0)
    ys, xs = np.nonzero(allm); l, t, r, b = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    main = Image.fromarray(B, 'RGBA').crop((l, t, r, b))
    shadow = Image.fromarray(Sh, 'RGBA').crop((l, t, r, b))
    main.save(f'{OUT}/{name}.png'); shadow.save(f'{OUT}/{name}__shadow.png')
    anchor = (int(iso.OX - l), int(iso.OY - t))
    return dict(size=[int(r - l), int(b - t)], anchor=list(anchor),
                floor_center_px=[anchor[0] + 0.0, anchor[1] + 16.0])

if __name__ == '__main__':
    info = {'pet_bed_grid': build(bed, 'pet_bed_grid'),
            'pet_bowl_empty': build(bowl, 'pet_bowl_empty', full=False),
            'pet_bowl_full': build(bowl, 'pet_bowl_full', full=True)}
    json.dump(info, open(f'{OUT}/_props_info.json', 'w'), indent=1)
    print(info)
