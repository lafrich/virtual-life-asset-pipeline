import os, sys, json, pickle, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont
OUT = 'assets/street_vehicles/riders_v3'; V1 = 'assets/street_vehicles/riders_v2'
man = json.load(open(f'{OUT}/manifest.json'))['sprites']
FR = {k: Image.fromarray(v) for k, v in pickle.load(open(f'{OUT}/_work/frames.pkl', 'rb')).items()}
NAMES = list(dict.fromkeys(k[0] for k in FR)); DIRS = ['se', 'sw', 'ne', 'nw']
S = 4; BG = (96, 106, 118, 255); BG2 = (84, 94, 106, 255)
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22); Fs = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
CELL = (70, 100)
def sheet():
    cols = ['v2 se f0 (old)'] + [f'{d} f0' for d in DIRS] + ['se f1', 'se f2', 'se f3']
    lab = 230; W = lab + len(cols) * CELL[0] * S; H = 70 + len(NAMES) * (CELL[1] * S + 10)
    o = Image.new('RGBA', (W, H), BG); d = ImageDraw.Draw(o)
    d.text((16, 12), 'Riders v3: hands on the grips / pax hands on the waist in front, 4x, 1 cell = 70x100 px, line = pivot (ground under footprint centre)', fill=(231, 235, 242), font=F)
    for i, c in enumerate(cols): d.text((lab + i * CELL[0] * S + 6, 44), c, fill=(255, 209, 102), font=Fs)
    for j, n in enumerate(NAMES):
        y = 70 + j * (CELL[1] * S + 10)
        if j % 2: d.rectangle([0, y, W, y + CELL[1] * S], fill=BG2)
        d.multiline_text((12, y + 40), n.replace('_', '\n'), fill=(231, 235, 242), font=Fs)
        cells = []
        v1 = f'{V1}/frames/{n}_se_f0.png'
        cells.append((Image.open(v1).convert('RGBA'), tuple(json.load(open(f'{V1}/manifest.json'))['sprites'][f'{n}_se']['pivot_footprint_centre'])))
        for dd in DIRS: cells.append((FR[n, dd, 0], tuple(man[f'{n}_{dd}']['pivot_footprint_centre'])))
        for f in (1, 2, 3): cells.append((FR[n, 'se', f], tuple(man[f'{n}_se']['pivot_footprint_centre'])))
        for i, c in enumerate(cells):
            if c is None: d.text((lab + i * CELL[0] * S + 20, y + 180), '(new)', fill=(141, 151, 168), font=Fs); continue
            im, (px, py) = c; cx = CELL[0] // 2; gy = CELL[1] - 8
            t = Image.new('RGBA', CELL); t.alpha_composite(im, (cx - px, gy - py))
            o.alpha_composite(t.resize((CELL[0] * S, CELL[1] * S), Image.NEAREST), (lab + i * CELL[0] * S, y))
            d.line([(lab + i * CELL[0] * S + 8, y + gy * S), (lab + (i + 1) * CELL[0] * S - 8, y + gy * S)], fill=(42, 50, 66))
    o.convert('RGB').save(f'{OUT}/previews/riders_v3_all_4x.png'); print('sheet', o.size)
def ride_gif():
    """every rider, 4 directions, looping ride frames (transparent-free dark bg), 4x"""
    fr = []
    for f in range(4):
        c = Image.new('RGBA', (len(DIRS) * 70, len(NAMES) * 100), (16, 20, 27, 255))
        for j, n in enumerate(NAMES):
            for i, dd in enumerate(DIRS):
                px, py = man[f'{n}_{dd}']['pivot_footprint_centre']; c.alpha_composite(FR[n, dd, f], (i * 70 + 35 - px, j * 100 + 92 - py))
        fr.append(c.resize((c.width * S, c.height * S), Image.NEAREST).convert('RGB'))
    fr[0].save(f'{OUT}/previews/riders_v3_ride_loop_4x.gif', save_all=True, append_images=fr[1:], duration=120, loop=0)
def street():
    """both street lanes of the game (rebuilt like street_vehicles/_work/scene.py): se lane r 33.05, nw lane r 34.85"""
    C0, C1 = -6, 22; VIS = (0, 14); R0, R1 = 30.6, 38.0
    P = lambda c, r: ((c - r) * 32, (c + r) * 16)
    xs = [P(c, r)[0] for c in VIS for r in (R0, R1)]; ys = [P(c, r)[1] for c in VIS for r in (R0, R1)]
    ox = -min(xs); oy = -min(ys) + 80; W = int(max(xs) - min(xs)); H = int(max(ys) - min(ys)) + 80
    Sx = lambda c, r: (round(P(c, r)[0] + ox), round(P(c, r)[1] + oy))
    bg = Image.new('RGBA', (W, H), '#2A9E52'); d = ImageDraw.Draw(bg)
    q = lambda c0, r0, c1, r1, fill: d.polygon([Sx(c0, r0), Sx(c1, r0), Sx(c1, r1), Sx(c0, r1)], fill=fill)
    q(C0, R0, C1, 31, '#279249'); q(C0, 31, C1, 32.5, '#C8CCD1'); q(C0, 36.55, C1, 37.7, '#C8CCD1')
    q(C0, 31.95, C1, 32.25, '#E7B416'); q(C0, 36.95, C1, 37.2, '#E7B416'); q(C0, 32.5, C1, 32.75, '#B8B2A8')
    for i in range(C0, C1, 2): q(i, 32.62, i + 1, 32.75, '#1C2330')
    q(C0, 32.75, C1, 36.3, '#4A5362'); rnd = random.Random(3)
    for _ in range(900):
        x, y = Sx(rnd.uniform(C0, C1), rnd.uniform(32.85, 36.2)); d.rectangle([x, y, x + 1, y], fill=rnd.choice(['#404857', '#596373']))
    q(C0, 32.92, C1, 32.98, '#F4F1EA'); q(C0, 36.07, C1, 36.13, '#F4F1EA')
    for i in range(C0, C1, 2): q(i, 34.47, i + 1, 34.58, '#FFD166')
    q(C0, 36.22, C1, 36.3, '#2A3242'); q(C0, 36.3, C1, 36.55, '#B8B2A8')
    LOOP = 24.0; N = 64; SP = 0.25
    # live car sprites (the ones the game copied into assets/vehicles in v8a / 53e2e20), static, + riders
    VM = json.load(open('assets/street_vehicles/manifest.json'))['sprites']
    CARF = {'sedan': (.05, 1.1), 'hatchback': (.05, 1.1), 'mpv': (.05, 1.13), 'taxi': (.05, 1.1), 'van': (.05, 1.15), 'bus': (-.1, 1.2)}
    for k, v in VM.items():
        if k.split('_')[0] in CARF and (k.endswith('_se') or k.endswith('_nw')):
            n, dd = k.rsplit('_', 1); im = Image.open(f'game/assets/vehicles/{n}_{dd}.png').convert('RGBA') if os.path.exists(f'game/assets/vehicles/{n}_{dd}.png') else Image.open(f'assets/street_vehicles/{v["file"]}').convert('RGBA')
            for f in range(4): FR[n, dd, f] = im
            man[k] = v
    SE = [('sedan_red', 0), ('gojek', 4.5), ('commuter_batik_sogan', 7), ('taxi_bluebird', 10.2), ('sma_triple', 14.3), ('maxim_pax', 17), ('hatchback_orange', 20.3)]
    NW = [('bus_transjakarta', 1), ('maxim', 7.5), ('commuter_batik_blue', 10), ('sedan_teal', 13.2), ('gojek_pax', 17), ('mpv_silver', 20.6)]
    off = lambda n: sum(CARF[n.split('_')[0]]) / 2 if n.split('_')[0] in CARF else .5
    cast = [(n, 33.05 + off(n), 'se', c0) for n, c0 in SE] + [(n, 34.85 + off(n), 'nw', c0) for n, c0 in NW]
    out = []
    for f in range(N):
        fr = bg.copy(); items = []
        for n, r, dr, c0 in cast:
            c = ((c0 + (SP * f if dr == 'se' else -SP * f)) % LOOP) - 5; m = man[f'{n}_{dr}']; px, py = m['pivot_footprint_centre']
            x, y = Sx(c, r); items.append(((r, c), FR[n, dr, f % 4], (x - px, y - py)))
        for _, im, pos in sorted(items, key=lambda t: t[0]): fr.alpha_composite(im, pos)
        out.append(fr)
    s4 = [f.resize((W * S, H * S), Image.NEAREST).convert('RGB').quantize(colors=255, method=Image.MEDIANCUT, dither=Image.Dither.NONE) for f in out]
    s4[0].save(f'{OUT}/previews/street_lanes_riders_v3_with_cars_4x.gif', save_all=True, append_images=s4[1:], duration=120, loop=0, optimize=True)
    out[12].resize((W * S, H * S), Image.NEAREST).save(f'{OUT}/previews/street_lanes_riders_v3_with_cars_4x_frame.png'); print('street', W, H)
if __name__ == '__main__':
    sheet(); ride_gif(); street()
