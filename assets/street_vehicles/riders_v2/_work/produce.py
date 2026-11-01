import os, sys, json, re, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from multiprocessing import Pool
import riders_v2 as R
OUT = 'assets/street_vehicles/riders_v2'
for sub in ('frames', 'sheets', 'previews'): os.makedirs(f'{OUT}/{sub}', exist_ok=True)

if __name__ == '__main__':
    with Pool(8) as p: res = dict(p.map(R.build, list(R.RIDERS)))
    man = {'projection': 'iso 2:1, 1 tile = 64x32 px, 1 game height unit = 3.2 px (same as street_vehicles/manifest.json)',
           'frame_layout': 'frames/<name>_<dir>_f<0-3>.png; sheets/<name>_sheet.png = 4 cols (f0-f3) x 4 rows (se, sw, ne, nw), every cell = size',
           'animation': {'frames': 4, 'ms_per_frame': 120, 'loop': True, 'body_dy': R.BODY_DY, 'rider_dy': R.RIDER_DY, 'wheel_spoke_phase': 'f0/f2 vs f1/f3'},
           'sprites': {}}
    allframes = {}
    for name, fr in res.items():
        bb = None
        for im in fr.values():
            b = im.getbbox(); bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
        x0, y0, x1, y1 = bb[0] - 1, bb[1] - 1, bb[2] + 1, bb[3] + 1
        W, H = x1 - x0, y1 - y0; piv = (R.PV[0] - x0, R.PV[1] - y0)
        sheet = Image.new('RGBA', (W * 4, H * 4))
        L = R.RIDERS[name][2]; a, b = 0.15, 0.85
        for j, d in enumerate(R.DIRS):
            for f in range(R.NF):
                im = fr[d, f].crop((x0, y0, x1, y1)); allframes[name, d, f] = im
                im.save(f'{OUT}/frames/{name}_{d}_f{f}.png'); sheet.paste(im, (f * W, j * H))
            e = {'frames': [f'frames/{name}_{d}_f{f}.png' for f in range(R.NF)], 'size': [W, H], 'pivot_footprint_centre': list(piv),
                 'footprint_tiles': [L, round(b - a, 3)], 'note': R.RIDERS[name][3]}
            if d in ('se', 'nw'):
                dc = -L / 2 * 32; dr = -(a + b) / 2 * 32
                e['anchor_game_P0lane'] = [int(round(piv[0] + dc - dr)), int(round(piv[1] + (dc + dr) / 2))]
            man['sprites'][f'{name}_{d}'] = e
        sheet.save(f'{OUT}/sheets/{name}_sheet.png')
        print(name, W, H, piv, flush=True)
    man['notes'] = ['pivot_footprint_centre: px of the ground point under the scooter footprint centre (same meaning as v1 manifest)',
                    'anchor_game_P0lane (se/nw only): px of world point P(0,lane) at h=0, as in v1; place at P(0,lane) - anchor/PPU, width = size/PPU',
                    'se = driving +c (dirn +1), nw = driving -c (dirn -1); sw/ne extras. Riders: sw = mirror of the v6b se pose, nw = mirror of ne; the scooter itself is rendered per direction',
                    'riders are v6b characters (64x112 frame logic, pivot 32,100) placed with their pivot at scooter-local (hip_x+1.5, 0, 2)']
    json.dump(man, open(f'{OUT}/manifest.json', 'w'), indent=1)
    import pickle; pickle.dump({k: np.array(v) for k, v in allframes.items()}, open(f'{OUT}/_work/frames.pkl', 'wb'))
