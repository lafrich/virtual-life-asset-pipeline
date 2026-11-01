import os, sys, json
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__)); import live_v6b as T
R = T.ROOT + '/live'; PV = R + '/previews'; os.makedirs(PV, exist_ok=True); BG = (240, 236, 228, 255)
LIVE = T.ROOT + '/../examples'
def fr(sh, row, col): return sh.crop((col * 64, row * 112, col * 64 + 64, row * 112 + 112))
def on(im, z, bg=BG): b = Image.new('RGBA', im.size, bg); b.alpha_composite(im); return b.resize((im.width * z, im.height * z), Image.NEAREST)
CROP = (2, 24, 62, 108); Z = 4; CWp = (CROP[2] - CROP[0]) * Z; CHp = (CROP[3] - CROP[1]) * Z
for n, sn, live in (('ichsan', 'ichsan_v6b_sheet.png', 'reference_man_sheet.png'), ('noor', 'noor_v6b_sheet.png', 'noor_sheet.png')):
    sh = Image.open(f'{R}/{sn}'); lv = Image.open(f'{LIVE}/{live}')
    # 1. walk-cycle sheet: rows se sw ne nw | idle, walk 1-6, sit
    o = Image.new('RGBA', (60 + 8 * CWp, 30 + 4 * CHp), BG); d = ImageDraw.Draw(o)
    for i, t in enumerate(['idle'] + [f'walk {k}' for k in range(1, 7)] + ['sit']): d.text((60 + i * CWp + 6, 10), t, fill=(0, 0, 0))
    for di, dd in enumerate(T.DIRS):
        d.text((8, 30 + di * CHp + CHp // 2), dd, fill=(160, 0, 0))
        cells = [(T.ROWMAP['idle'] + di, 0)] + [(T.ROWMAP['walk'] + di, f) for f in range(6)] + [(T.ROWMAP['sit'] + di, 0)]
        for i, (r, c) in enumerate(cells): o.alpha_composite(on(fr(sh, r, c).crop(CROP), Z), (60 + i * CWp, 30 + di * CHp))
    o.save(f'{PV}/{n}_walkcycle_sheet.png')
    # 2. GIFs: one per direction + all four side by side
    frames_all = []
    for di, dd in enumerate(T.DIRS):
        fs = [on(fr(sh, T.ROWMAP['walk'] + di, f).crop(CROP), 5).convert('P', palette=Image.ADAPTIVE) for f in range(6)]
        fs[0].save(f'{PV}/{n}_walk_{dd}.gif', save_all=True, append_images=fs[1:], duration=100, loop=0, disposal=2)
    for f in range(6):
        im = Image.new('RGBA', (4 * (CROP[2] - CROP[0]) * 4, (CROP[3] - CROP[1]) * 4), BG)
        for di in range(4): im.alpha_composite(on(fr(sh, T.ROWMAP['walk'] + di, f).crop(CROP), 4), (di * (CROP[2] - CROP[0]) * 4, 0))
        frames_all.append(im.convert('P', palette=Image.ADAPTIVE))
    frames_all[0].save(f'{PV}/{n}_walk_all4.gif', save_all=True, append_images=frames_all[1:], duration=100, loop=0)
    # 3. vs live (same scale): idle se / ne, walk se f1, sit se
    cells = [('idle se', 4, 0), ('idle ne', 6, 0), ('walk se', 0, 1), ('walk nw', 3, 1), ('sit se', 12, 0)]
    o = Image.new('RGBA', (60 + len(cells) * CWp, 40 + 2 * CHp), BG); d = ImageDraw.Draw(o)
    for i, (lb, r, c) in enumerate(cells):
        d.text((60 + i * CWp + 6, 10), lb, fill=(0, 0, 0))
        o.alpha_composite(on(fr(lv, r, c).crop(CROP), Z), (60 + i * CWp, 30)); o.alpha_composite(on(fr(sh, r, c).crop(CROP), Z), (60 + i * CWp, 30 + CHp))
    d.text((6, 30 + CHp // 2), 'LIVE', fill=(160, 0, 0)); d.text((6, 30 + CHp + CHp // 2), 'v6b', fill=(160, 0, 0))
    o.save(f'{PV}/{n}_vs_live.png')
    # 4. layer breakdown (se idle)
    man = json.load(open(f'{R}/parts/{n}/manifest.json')); key = list(man['sheets'])[0]; lay = man['sheets'][key]['layers']
    ks = [k for k in T.ORDER if Image.open(f'{R}/parts/{n}/{lay[k]}').crop((0, 4 * 112, 64, 5 * 112)).getbbox()]
    W = 44 * 3 + 8; o = Image.new('RGBA', ((len(ks) + 1) * W + 10, 80 * 3 + 44), BG); d = ImageDraw.Draw(o); acc = Image.new('RGBA', (64, 112))
    for i, k in enumerate(ks):
        im = Image.open(f'{R}/parts/{n}/{lay[k]}').crop((0, 4 * 112, 64, 5 * 112)); acc.alpha_composite(im)
        o.alpha_composite(im.crop((10, 26, 54, 106)).resize((132, 240), Image.NEAREST), (i * W, 40)); d.text((i * W + 2, 6), k, fill=(0, 0, 0)); d.text((i * W + 2, 20), os.path.basename(lay[k])[:-4][:20], fill=(90, 90, 150))
    o.alpha_composite(acc.crop((10, 26, 54, 106)).resize((132, 240), Image.NEAREST), (len(ks) * W, 40)); d.text((len(ks) * W + 2, 6), '= composite', fill=(200, 0, 0))
    o.save(f'{PV}/{n}_layers.png')
print('ok')
