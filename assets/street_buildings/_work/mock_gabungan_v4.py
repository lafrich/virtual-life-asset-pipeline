#!/usr/bin/env python3
"""previews/mock_gabungan_v4_*.png + mock_taman_v4_4x.png: v3 (busy loak area, corrected zebra, short buildings, far local road,
Indomaret parking in its yard) + a park (taman) on the empty far-side land:
  * belt between the main road's far sidewalk and the lot backs: paving path, benches, park lamps, bins, small Kebon Sirih trees
  * strip right of the side street (c > 41.5): path, gazebo on a plaza, benches, trees
  * land beyond the local road (r > 55): promenade along the road, cross paths, plazas with gazebo / pergola / meja taman,
    benches, lamps, bins, Kebon Sirih trees (no flowering species, no shrubs), varied grass tiles + tufts (vegetation_kebonsirih v3)
Hard rule: every far-side sprite covers ground r >= 36.55 only (main road, zebra, traffic, player side untouched).
Soft rule (park beyond the local road): covers r >= 51.0 only, so the new shop fronts stay visible. PREVIEW ONLY."""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
from PIL import Image
import mock_gabungan_v3 as V3
from mock_gabungan_v3 import SC, F, OX, OY, GAME, ROAD_SAFE, LOTS, KAMP, MI
VA = 'assets/vegetation_kebonsirih'
VM = json.load(open(f'{VA}/manifest.json'))
for k, e in VM['tiles'].items(): V3.CUSTOM['tile_' + k] = (Image.open(f'{VA}/{e["file"]}'), None, tuple(e['anchor']))
FRONT_SAFE = 51.0
C_MAX = 44.0                                   # right edge of the current game world (main road ends at c ~44): park stays inside it
rng = np.random.default_rng(7)

# ---------------------------------------------------------------- park layout
PATHS = []          # (key, c, r, footprint rect c0,c1,r0,r1) ground modules
def path(key, c, r, W, D):
    PATHS.append((key, c, r, (c - W / 2, c + W / 2, r - D / 2, r + D / 2)))
CROSS = [-20.0, -4.0, 12.0, 28.0]            # cross paths (along r) in the park beyond the local road
PLAZA = {-20.0: 'meja_taman_sw', -4.0: 'gazebo_sw', 12.0: 'pergola_sw', 28.0: 'meja_taman_sw'}
PZ_R = 64.0
def layout(S):
    # promenade along the local road (r 56..58), c -36..44, junctions at the cross paths
    for c0 in np.arange(-36.0, 42.0, 2.0):
        cc = c0 + 1
        path('jalur_paving_simpang_sw' if cc in CROSS or cc == 43 else 'jalur_paving_lurus_sw', cc, 57.0, 2, 2)
    path('jalur_paving_simpang_sw', 43.0, 57.0, 2, 2)
    for cx in CROSS:                                                   # cross paths r 58..62, plaza r 62..66, path on to 70
        for rc in (59.0, 61.0, 67.0, 69.0): path('jalur_paving_lurus_se', cx, rc, 2, 2)
        path('plaza_paving_sw', cx, PZ_R, 4, 4); S.put(PLAZA[cx], cx, PZ_R)
        if PLAZA[cx].startswith('meja'): S.put('bangku_taman_ne', cx, PZ_R - 1.45); S.put('tong_sampah_sw', cx + 1.55, PZ_R + 1.55)
    # path up along the side street (c 42..44), r 38..56
    for rc in np.arange(39.0, 56.0, 2.0): path('jalur_paving_lurus_se', 43.0, rc, 2, 2)
    # belt path between the main road and the lot backs (r 38.2..40.2): left of the loak kampung and between masjid / side street
    for c0 in np.arange(-36.0, 14.0, 2.0): path('jalur_paving_lurus_sw', c0 + 1, 39.2, 2, 2)
    for c0 in (29.0, 31.0, 33.0, 35.0): path('jalur_paving_lurus_sw', c0 + 1, 39.2, 2, 2)
    for k, (key, c, r, rect) in enumerate(PATHS): S.put(key, c, r, ground=True)
    # promenade furniture: lamps + benches (facing the promenade, back to the road) on the verge, benches opposite (backs to camera)
    for k, c in enumerate(np.arange(-34.0, 42.0, 4.0)):
        if any(abs(c - x) < 1.6 for x in CROSS + [43.0]): continue
        if k % 2 == 0: S.put('lampu_taman_sw', c, 55.5)
        else:
            S.put('bangku_taman_sw', c, 55.55); S.put('tong_sampah_sw', c + 1.4, 55.55)
    for c in np.arange(-32.0, 42.0, 8.0):
        if any(abs(c - x) < 2.2 for x in CROSS + [43.0]): continue
        S.put('bangku_taman_ne', c, 58.55)
    # side-street path furniture
    for rc in (41.0, 46.0, 51.0): S.put('lampu_taman_sw', 41.78, rc)            # verge between side street and path (world edge c 44)
    S.put('tong_sampah_se', 41.8, 53.6)
    # belt behind the lot backs: only the paving path (furniture there would be hidden behind the row / poke out above roofs);
    # furniture only in the visible lawn between masjid and side street
    for c, key in ((30.5, 'bangku_taman_ne'), (33.0, 'lampu_taman_sw'), (35.5, 'bangku_taman_ne')): S.put(key, c, 40.75 if 'bangku' in key else 40.65)
    trees(S)

TREE_FRONT = ['pohon_asam_L', 'pohon_trembesi_L', 'pohon_angsana_L', 'pohon_mahoni_L', 'pohon_ketapang_kencana', 'pohon_beringin',
              'pohon_asam_M', 'pohon_trembesi_M', 'pohon_kiara_payung', 'pohon_palem_raja', 'pohon_glodokan_tiang', 'pohon_angsana_M', 'pohon_mahoni_M']
TREE_SMALL = ['pohon_kiara_payung', 'pohon_asam_S', 'pohon_mahoni_M', 'pohon_angsana_M', 'pohon_trembesi_M']
TREES = []
def trees(S):
    k = 0
    for rr in (60.4, 63.6, 67.0, 70.2):
        for c in np.arange(-34.0, 44.0, 3.2):
            cc = c + (0.8 if int(rr) % 2 else 0) + rng.uniform(-0.4, 0.4)
            if any(abs(cc - x) < (3.0 if 61.5 < rr < 66.5 else 1.8) for x in CROSS): continue
            if cc + rr > 106 or cc > C_MAX - 1.0: continue
            TREES.append((TREE_FRONT[k % len(TREE_FRONT)], cc, rr + rng.uniform(-0.3, 0.3))); k += 1
    # belt: small trees only where they stay clear of the road (checked per pixel), in gaps between furniture
    for c in (31.5, 36.0): TREES.append((TREE_SMALL[k % len(TREE_SMALL)], c, 42.9)); k += 1
    for key, c, r in TREES: S.put(key, c, r)

def blocked(c, r):
    b = (r < 37.7) | (c >= C_MAX)
    for (a0, a1, b0, b1) in LOTS.values(): b |= (c >= a0) & (c < a1) & (r >= b0) & (r < b1)
    b |= (c >= KAMP[0]) & (c < KAMP[1]) & (r >= 37.7) & (r < F)
    b |= (c < 41.5) & (r >= F) & (r < 55.0)                       # local road
    b |= (c >= 37.5) & (c < 41.5) & (r < 55.0)                   # side street
    for (_, _, _, (a0, a1, b0, b1)) in PATHS: b |= (c >= a0) & (c < a1) & (r >= b0) & (r < b1)
    return b

def grass_tiles(S):
    names = [k for k in VM['tiles'] if k.startswith('grass_') and not any(x in k for x in ('edge', 'corner'))]
    w = np.array([6 if 'plain' in n else (0.6 if n in ('grass_dirt', 'grass_bare_a', 'grass_bare_b', 'grass_dry') else 1.5) for n in names]); w /= w.sum()
    n = 0
    for c in range(-40, 58):
        for r in range(37, 74):
            if c + r > 106 or c - r < -90 or c - r > 26: continue
            cs = np.array([c, c + 0.999, c, c + 0.999, c + 0.5]); rs = np.array([r, r, r + 0.999, r + 0.999, r + 0.5])
            if blocked(cs, rs).any(): continue
            S.put('tile_' + names[rng.choice(len(names), p=w)], float(c), float(r), ground=True); n += 1
    tufts = [k for k in VM['sprites'] if k.startswith(('tuft_rumput', 'overlay_semanggi', 'overlay_daun', 'prop_kerikil'))]
    m = 0
    while m < 420:
        c = rng.uniform(-38, 56); r = rng.uniform(38, 73)
        if c + r > 105 or c - r < -88 or c - r > 25: continue
        if blocked(np.array([c]), np.array([r])).any(): continue
        S.put(tufts[m % len(tufts)], c, r); m += 1
    return n

def ground(c, r):
    m, t = V3.ground(c, r)
    g = (r >= 37.7) & (c < C_MAX) & (m == -1) & ~((c >= 37.5) & (c < 41.5) & (r < 55.0)) & ~((c < 41.5) & (r >= F) & (r < 55.0))
    m = np.where(g, MI['GRASS'], m).astype(np.int16); t = np.where(g, np.where(SC.H(c, r) < 6, 3, 2), t).astype(np.int8)
    return m, t

def coverage(S):
    out = {}
    for dk, key, c, r in S.items:
        if r < 37.7: continue
        im, gl, p = SC.load(key); a = np.array(im)[..., 3] == 255
        ys, xs = np.nonzero(a)
        if not len(xs): continue
        x = xs + S.g.X(c, r) - p[0]; y = ys + S.g.Y(c, r) - p[1]
        sx = (x + 0.5 - OX) / 32; ty = (y + 0.5 - OY) / 16; rr = (ty - sx) / 2
        out[f'{key} @({c:.2f},{r:.2f})'] = (round(float(rr.min()), 2), r)
    for k, (ca, ra, cb, rb, z) in enumerate(S.cables): out[f'kabel_{k}'] = (round(min(ra, rb) - (z + 5) / 32, 2), min(ra, rb))
    return out

if __name__ == '__main__':
    S = V3.build_scene(); layout(S); nt = grass_tiles(S)
    cov = coverage(S)
    hard = {k: v[0] for k, v in cov.items() if v[0] < ROAD_SAFE}
    soft = {k: v[0] for k, v in cov.items() if v[1] >= 55.0 and v[0] < FRONT_SAFE}
    print('tiles', nt, 'items', len(S.items)); print('hard violations:', hard); print('soft (front park) violations:', soft)
    print('worst:', sorted(((v[0], k) for k, v in cov.items()))[:8])
    sig = SC.Scene(18, 27, 31, 38, 10); sig.g = V3.Spr(GAME.width, GAME.height, OX, OY); V3.signals(sig)
    s_img, _ = sig.render(lambda c, r: (np.full(c.shape, -1, np.int16), np.zeros(c.shape, np.int8)), 18, 27, 31, 38)
    f_img, _ = S.render(ground, -42, C_MAX, 37.7, 75)
    out = GAME.copy(); out.alpha_composite(s_img); out.alpha_composite(f_img); out = out.convert('RGB')
    P = f'{HERE}/../previews/mock_gabungan_v4'
    out.resize((out.width // 2, out.height // 2), Image.LANCZOS).save(P + '_overview.png')
    out.resize((out.width * 2, out.height * 2), Image.NEAREST).save(P + '_2x.png')
    out.resize((out.width * 4, out.height * 4), Image.NEAREST).save(P + '_4x.png')
    out.save(P + '_1x.png')
    X = lambda c, r: OX + (c - r) * 32; Y = lambda c, r: OY + (c + r) * 16
    box = (int(X(-12, 70)), int(Y(-12, 52)) - 60, int(X(22, 54)), int(Y(22, 70)))
    cu = out.crop(box); cu.resize((cu.width * 4, cu.height * 4), Image.NEAREST).save(f'{HERE}/../previews/mock_taman_v4_4x.png')
    json.dump({'road_safe_r': ROAD_SAFE, 'front_safe_r': FRONT_SAFE, 'coverage_min_r': {k: v[0] for k, v in cov.items()}}, open(f'{HERE}/_mock_gabungan_v4_coverage.json', 'w'), indent=1)
    print(out.size, cu.size)
