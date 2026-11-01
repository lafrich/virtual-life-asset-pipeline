import os, sys, json
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__)); import ref_v6b as T
R = T.ROOT; PV = f'{R}/previews'; BG = (246, 243, 236, 255); S = 4
def fr(sheet, row, col): return sheet.crop((col * 64, row * 112, col * 64 + 64, row * 112 + 112))
def on(im, sc, bg=BG): b = Image.new('RGBA', im.size, bg); b.alpha_composite(im); return b.resize((im.width * sc, im.height * sc), Image.NEAREST)
def lab(dr, xy, t, c=(0, 0, 0, 255)): dr.text(xy, t, fill=c)
SH = {k: Image.open(f'{R}/{v}') for k, v in (('ich_ref', 'ichsan_v6b_reference_sheet.png'), ('ich', 'ichsan_v6b_sheet.png'), ('ich_g', 'ichsan_v6b_default_glasses_sheet.png'),
                                             ('noor', 'noor_v6b_sheet.png'), ('noor_c', 'noor_v6b_cardigan_sheet.png'))}
# 1. vs reference at IDENTICAL scale: ref native grid (1 block = 1 px) and v6b frames both x6
ref = Image.open(f'{R}/study/ref_native.png')
Z = 6; box = (15, 30, 49, 102)        # frame crop that holds the figure
cells = [('reference (native grid)', None), ('v6b ichsan = ref outfit', SH['ich_ref']), ('v6b ichsan default', SH['ich']), ('v6b ichsan + glasses', SH['ich_g']),
         ('v6b noor', SH['noor']), ('v6b noor cardigan', SH['noor_c'])]
W = (box[2] - box[0]) * Z
o = Image.new('RGBA', (len(cells) * (W + 16) + 16, (box[3] - box[1]) * Z + 40), BG); dr = ImageDraw.Draw(o)
for i, (lb, sh) in enumerate(cells):
    if sh is None:
        t = Image.new('RGBA', (64, 112)); t.alpha_composite(ref, (32 - 13 - T.OX + T.OX - 0 + 0 - 0, 31 - 0)) if False else t.paste(ref, (T.FX + T.OX, T.FY))
    else: t = fr(sh, T.ROWMAP['idle'], 0)
    o.alpha_composite(on(t.crop(box), Z), (16 + i * (W + 16), 30)); lab(dr, (16 + i * (W + 16), 8), lb)
o.save(f'{PV}/v6b_vs_reference.png')
# also: original jpg next to v6b ichsan at the jpg's own scale (11.6 px per block ~ x12)
jpg = Image.open(f'{R}/study/reference.jpg').convert('RGBA').crop((180, 100, 560, 1000))
t = fr(SH['ich_ref'], T.ROWMAP['idle'], 0).crop(box); t = on(t, 12).crop((0, 0, 34 * 12, 72 * 12))
o = Image.new('RGBA', (jpg.width + t.width + 60, max(jpg.height, t.height) + 30), BG); dr = ImageDraw.Draw(o)
o.alpha_composite(jpg, (20, 26)); o.alpha_composite(t, (jpg.width + 40, 26)); lab(dr, (20, 6), 'reference jpg'); lab(dr, (jpg.width + 40, 6), 'v6b ichsan (ref outfit) x12')
o.save(f'{PV}/v6b_vs_reference_jpg.png')
# 2. sheet previews
for n, key in (('ichsan', 'ich'), ('noor', 'noor')):
    sh = SH[key]; W = 8 * 64 * 3 + 40; H = 4 * 80 * 3 + 30
    o = Image.new('RGBA', (W, H), BG); dr = ImageDraw.Draw(o); lab(dr, (8, 6), f'{n} v6b - idle | walk x6 | sit    rows: se sw ne nw   (3x)')
    for di, d in enumerate(T.DIRS):
        x = 30; y = 22 + di * 80 * 3; lab(dr, (4, y + 60), d, (180, 0, 0, 255))
        for a, nf in (('idle', 1), ('walk', 6), ('sit', 1)):
            for f in range(nf): o.alpha_composite(on(fr(sh, T.ROWMAP[a] + di, f).crop((0, 26, 64, 106)), 3), (x, y)); x += 64 * 3
    o.save(f'{PV}/{n}_v6b_sheet_preview.png')
# 3. layers
for n, key in (('ichsan', 'default'), ('noor', 'default'), ('noor', 'cardigan')):
    man = json.load(open(f'{R}/parts/{n}/manifest.json')); lay = man['sheets'][key]['layers']
    ks = [k for k in T.ORDER if Image.open(f'{R}/parts/{n}/{lay[k]}').crop((0, 4 * 112, 64, 5 * 112)).getbbox()]
    o = Image.new('RGBA', ((len(ks) + 1) * 136 + 10, 80 * 3 + 44), BG); dr = ImageDraw.Draw(o); acc = Image.new('RGBA', (64, 112))
    for i, k in enumerate(ks):
        im = Image.open(f'{R}/parts/{n}/{lay[k]}').crop((0, 4 * 112, 64, 5 * 112)); acc.alpha_composite(im)
        o.alpha_composite(im.crop((10, 26, 54, 106)).resize((44 * 3, 80 * 3), Image.NEAREST), (i * 136, 40))
        lab(dr, (i * 136 + 2, 4), k); lab(dr, (i * 136 + 2, 18), os.path.basename(lay[k])[:-4][:20], (90, 90, 150, 255))
    o.alpha_composite(acc.crop((10, 26, 54, 106)).resize((44 * 3, 80 * 3), Image.NEAREST), (len(ks) * 136, 40)); lab(dr, (len(ks) * 136 + 2, 4), '= composite', (200, 0, 0, 255))
    o.save(f'{PV}/{n}_v6b_layers_{key}.png')
# 4. expressions (zoomed heads, x8), se + sw for both
rows = []
for n, key in (('noor', 'default'), ('ichsan', 'default'), ('ichsan', 'default_glasses')):
    man = json.load(open(f'{R}/parts/{n}/manifest.json')); lay = man['sheets'][key]['layers']
    for di, dd in ((0, 'se'), (1, 'sw')):
        row = []
        for e in T.EXPRS:
            t = Image.new('RGBA', (64, 112), BG)
            for k in T.ORDER:
                p = f'{R}/parts/{n}/{lay[k]}'
                if k == 'face': p = f'{R}/parts/{n}/faces/face_{e}.png'
                if k == 'brows': p = f'{R}/parts/{n}/faces/brows_{e}.png'
                t.alpha_composite(Image.open(p).crop((0, (T.ROWMAP['idle'] + di) * 112, 64, (T.ROWMAP['idle'] + di + 1) * 112)))
            row.append(t.crop((18, 30, 46, 54)))
        rows.append((f'{n}{" +glasses" if "glasses" in key else ""} {dd}', row))
Z = 9; W, H = 28 * Z + 6, 24 * Z + 6
o = Image.new('RGBA', (110 + W * len(T.EXPRS), 20 + H * len(rows)), (252, 252, 252, 255)); dr = ImageDraw.Draw(o)
for i, e in enumerate(T.EXPRS): lab(dr, (110 + i * W + 4, 4), e)
for r, (lb, row) in enumerate(rows):
    lab(dr, (4, 20 + r * H + H // 2), lb)
    for i, im in enumerate(row): o.alpha_composite(im.resize((28 * Z, 24 * Z), Image.NEAREST), (110 + i * W, 20 + r * H))
o.save(f'{PV}/v6b_expressions.png')
# 5. vs v6
v6n = Image.open(f'{R}/../v6/noor_v6_sheet.png'); v6i = Image.open(f'{R}/../v6/ichsan_v6_default_noglasses_sheet.png')
o = Image.new('RGBA', (6 * 64 * 3 + 20, 80 * 3 + 30), BG); dr = ImageDraw.Draw(o)
for i, (lb, sh) in enumerate((('v6 ichsan', v6i), ('v6b ichsan', SH['ich_ref']), ('reference', None), ('v6 noor', v6n), ('v6b noor', SH['noor']), ('v6b noor cardigan', SH['noor_c']))):
    if sh is None: t = Image.new('RGBA', (64, 112)); t.paste(ref, (T.FX + T.OX, T.FY))
    else: t = fr(sh, 4, 0)
    o.alpha_composite(on(t.crop((0, 26, 64, 106)), 3), (10 + i * 192, 26)); lab(dr, (14 + i * 192, 6), lb)
o.save(f'{PV}/v6_vs_v6b.png')
print('ok')
