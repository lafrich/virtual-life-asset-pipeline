"""Build Migi's sprite sheet, shadow sheet, metadata.json. Run: python3 build.py"""
import os, json, sys
from multiprocessing import Pool
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cat import render_frame, pose
from palette_migi import C, PAL, USED_ROLES, RAMP

OUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FW, FH, PX, PY = 32, 32, 16, 24
SCALE = 0.64
DIRS = ['se', 'sw', 'ne', 'nw']
ANIMS = [  # name, frames, fps, loop, note
    ('walk', 6, 10, True, 'trot cycle, diagonal leg pairs, small body bob, tail sway'),
    ('sit', 6, 4, True, 'idle sit: f2 blink, f4-f5 tail-tip flick'),
    ('eat', 4, 6, True, 'head down to the bowl, chewing bob (f1/f3)'),
    ('sleep', 4, 2, True, 'curled ball, slow breathing (+1px), eyes closed'),
    ('meow', 4, 6, False, 'sit + mouth open (f1 small, f2 wide) + the wide-eyed stare; play once then return to sit'),
    ('loaf', 4, 3, True, 'lying loaf, paws tucked, breathing, f3 blink'),
]
COLS = 6

def job(args):
    a, f, n, d = args
    img, o = render_frame(a, f, n, d, FW, FH, PX, PY, SCALE)
    rx, ry = o['shadow']
    rx = rx * SCALE * 1.05; ry = rx / 2
    ys, xs = np.mgrid[0:FH, 0:FW]
    sh = np.zeros((FH, FW, 4), np.uint8)
    m = (((xs + 0.5 - PX) / rx) ** 2 + ((ys + 0.5 - PY) / ry) ** 2) <= 1
    sh[m] = (*C['void'][:3], 102)
    return a, f, d, img, sh

if __name__ == '__main__':
    jobs = [(a, f, n, d) for a, n, *_ in ANIMS for d in DIRS for f in range(n)]
    with Pool(min(8, os.cpu_count() or 2)) as p:
        res = p.map(job, jobs)
    rows = len(ANIMS) * 4
    sheet = Image.new('RGBA', (FW * COLS, FH * rows), (0, 0, 0, 0))
    shs = sheet.copy()
    rowmap = []
    for ai, (a, n, fps, loop, note) in enumerate(ANIMS):
        for di, d in enumerate(DIRS):
            rowmap.append(dict(row=ai * 4 + di, animation=a, direction=d, frames=n))
    for a, f, d, img, sh in res:
        ai = [x[0] for x in ANIMS].index(a); di = DIRS.index(d); r = ai * 4 + di
        sheet.paste(Image.fromarray(img, 'RGBA'), (f * FW, r * FH))
        shs.paste(Image.fromarray(sh, 'RGBA'), (f * FW, r * FH))
        bb = Image.fromarray(img).getbbox()
        if bb[0] == 0 or bb[1] == 0 or bb[2] == FW or bb[3] == FH: print('CLIPPED', a, f, d, bb)
    sheet.save(f'{OUT}/migi_sheet.png'); shs.save(f'{OUT}/migi_sheet_shadow.png')
    comp = shs.copy(); comp.alpha_composite(sheet); comp.save(f'{OUT}/migi_sheet_with_shadow.png')
    # palette check
    cols = set(tuple(px[:3]) for px in np.asarray(sheet).reshape(-1, 4) if px[3] > 0)
    pal = {tuple(int(v.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)): k for k, v in PAL.items()}
    bad = [c for c in cols if c not in pal]
    used = sorted(pal[c] for c in cols if c in pal)
    print('colours used:', used, 'violations:', bad)
    alphas = set(np.asarray(sheet)[..., 3].ravel().tolist()); print('alpha values in sheet:', alphas)
    HEIGHTS = {}
    for a, f, d, img, sh in res:
        if f == 0 and d == 'sw':
            ys = np.nonzero(img[..., 3])[0]; HEIGHTS[a] = int(PY - ys.min() - 1)   # pivot -> top of silhouette (excl. outline)
    meta = {
        'name': 'migi', 'species': 'cat', 'version': '1.0',
        'style_sheet': 'assets/art-direction/style-sheet.md (v1.4 + "Migi (the user\'s cat)" AD direction)',
        'projection': 'isometric 2:1 (dimetric), 64x32 floor tile, height step 32 px',
        'frame': {'width': FW, 'height': FH},
        'pivot': {'x': PX, 'y': PY, 'note': 'pivot = tile-centre foot point (same meaning as the characters\' (32,100)). '
                  'Draw the frame at (P.x - 16, P.y - 24) in sprite px; in index.html units (0.5 unit/px): <image x=P.x-8 y=P.y-12 width=16 height=16>.'},
        'scale': {'authored': '1x', 'integer_scaling_only': True, 'smoothing': 'none (nearest-neighbour)',
                  'model_scale': SCALE,
                  'heights_px': HEIGHTS,
                  'vs_characters': 'characters stand 84-88 px (knee ~23 px). Migi: ears ~17 px sitting (mid-shin to knee), ~21 px walking with the tail up, ~12 px loaf, ~9 px curled. Real cat/person ratio would be ~15 px, so he is drawn slightly larger than life like the other small props.'},
        'sheet': {'file': 'migi_sheet.png', 'columns': COLS, 'rows': rows, 'width': FW * COLS, 'height': FH * rows,
                  'shadow_file': 'migi_sheet_shadow.png', 'with_shadow_file': 'migi_sheet_with_shadow.png'},
        'directions': DIRS,
        'direction_notes': {
            'se': 'facing screen down-right (+c)', 'sw': 'down-left (+r)', 'ne': 'up-right (-r)', 'nw': 'up-left (-c)',
            'mirroring': 'DO NOT MIRROR. All 4 directions are drawn explicitly because Migi\'s patches are asymmetric '
                         '(big saddle + lower patch on his LEFT side, round heart patch on his RIGHT flank, black spot on the left hind leg). '
                         'A mirrored row would move the patches to the wrong side and flip the top-left light.'},
        'animations': {a: {'frames': n, 'fps': fps, 'loop': loop, 'note': note,
                           'rows': {d: ai * 4 + di for di, d in enumerate(DIRS)}}
                       for ai, (a, n, fps, loop, note) in enumerate(ANIMS)},
        'row_map': rowmap,
        'frame_index_formula': 'row = animIndex*4 + dirIndex ; index = row*6 + frame ; anims with 4 frames use columns 0-3',
        'layer_order': ['shadow (migi_sheet_shadow.png, same grid, #0B0E13 @ 40%)', 'sprite (migi_sheet.png)'],
        'shadow_rule': 'flat ellipse #0B0E13 alpha 102 centred on the pivot; draw it on the floor layer (before depth-sorted objects) or skip it if the engine draws its own.',
        'depth': 'key = pos.c + pos.r + 0.05 (same as avatars). On the bed, use the bed\'s use_point (key = bed c+r+0.95 < Migi).',
        'palette': {'rule': 'official hexes only, no new hexes, nothing pending (AD direction)', 'used': {k: PAL[k] for k in used},
                    'roles': USED_ROLES, 'ramps': RAMP},
        'props_manifest': 'manifest.json (environment schema)',
    }
    json.dump(meta, open(f'{OUT}/metadata.json', 'w'), indent=1, ensure_ascii=False)
    print('ok', sheet.size)
