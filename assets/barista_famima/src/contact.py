# contact sheet 4x: NPC (frame kunci tiap animasi x 4 arah) + prop famicafe (4 arah) + ikon (menu, bahan, modifier)
import json, glob, os
from PIL import Image, ImageDraw
import common as C
B = 'assets/barista_famima/'
BG = (231, 235, 242); BG2 = (210, 213, 217)
def checker(w, h):
    im = Image.new('RGBA', (w, h), BG); d = ImageDraw.Draw(im)
    for y in range(0, h, 8):
        for x in range(0, w, 8):
            if (x // 8 + y // 8) % 2: d.rectangle([x, y, x + 7, y + 7], fill=BG2)
    return im
mn = json.load(open(B + 'npc/manifest_npc.json'))
anims = list(mn['rows'].keys()); dirs = mn['dirs']
# NPC block: rows=anim, cols=dir x 2 frame (f0 + mid)
cells = []
for a in anims:
    n = mn['anims'][a]['frames']
    row = []
    for dr in dirs:
        for f in (0, n // 2):
            row.append(Image.open(B + f'npc/frames/barista_famima_{dr}_{a}_f{f}.png').convert('RGBA'))
    cells.append(row)
fw, fh = 64, 112
npc = checker(len(cells[0]) * fw, len(cells) * fh)
for r, row in enumerate(cells):
    for c, im in enumerate(row): npc.alpha_composite(im, (c * fw, r * fh))
# props: famicafe group, 4 oris per row
P = json.load(open(B + 'src/_props.json'))
base = sorted({k.rsplit('_', 1)[0] for k, v in P.items() if k.rsplit('_', 1)[1] in ('se', 'sw', 'ne', 'nw') and not any(m['id'] in k for m in C.MENU)})
prow = []
for b in base:
    ims = [Image.open(B + P[f'{b}_{o}']['file']).convert('RGBA') for o in ('se', 'sw', 'ne', 'nw') if f'{b}_{o}' in P]
    prow.append(ims)
pw = max(sum(i.width + 6 for i in r) for r in prow); ph = sum(max(i.height for i in r) + 6 for r in prow)
pr = checker(pw, ph); y = 0
for r in prow:
    x = 0
    for i in r: pr.alpha_composite(i, (x, y)); x += i.width + 6
    y += max(i.height for i in r) + 6
# icons grid
ics = sorted(glob.glob(B + 'icons/*.png')); cols = 12
ig = checker(cols * 34, ((len(ics) + cols - 1) // cols) * 34)
for k, f in enumerate(ics): ig.alpha_composite(Image.open(f).convert('RGBA'), ((k % cols) * 34 + 1, (k // cols) * 34 + 1))
W = npc.width + 8 + max(pr.width, ig.width); H = max(npc.height, pr.height + 8 + ig.height)
out = Image.new('RGBA', (W, H), BG); out.alpha_composite(npc, (0, 0)); out.alpha_composite(pr, (npc.width + 8, 0)); out.alpha_composite(ig, (npc.width + 8, pr.height + 8))
out = out.resize((W * 4, H * 4), Image.NEAREST).convert('RGB'); out.save(B + 'contact_sheet_barista_famima_4x.png'); print(out.size, anims, len(base))
