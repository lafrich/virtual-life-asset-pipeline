# zoomed sit comparison: new v6b sit (se/sw/ne/nw) vs the live sit sprite, hip line y80 (green) and warteg split cut y84 (red)
from PIL import Image, ImageDraw
import os
B = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EX = os.path.join(B, '..', 'examples')
for n, live in (('ichsan', 'reference_man_sheet.png'), ('noor', 'noor_sheet.png')):
    new = Image.open(f'{B}/live/{n}_v6b_sheet.png').convert('RGBA'); old = Image.open(f'{EX}/{live}').convert('RGBA')
    Z = 5; W = 64 * 8; o = Image.new('RGBA', (W, 112), (236, 232, 224, 255))
    for i in range(4):
        o.alpha_composite(old.crop((0, (12 + i) * 112, 64, (13 + i) * 112)), (i * 128, 0))
        o.alpha_composite(new.crop((0, (12 + i) * 112, 64, (13 + i) * 112)), (i * 128 + 64, 0))
    d = o.load()
    for x in range(0, W, 2): d[x, 84] = (220, 0, 0, 255); d[x, 80] = (0, 150, 0, 255)
    o = o.crop((0, 16, W, 112)).resize((W * Z, 96 * Z), Image.NEAREST)
    dr = ImageDraw.Draw(o)
    for i, v in enumerate(('se', 'sw', 'ne', 'nw')):
        dr.text((i * 128 * Z + 6, 4), f'LIVE {v}', fill=(60, 60, 60, 255)); dr.text(((i * 128 + 64) * Z + 6, 4), f'NEW {v}', fill=(0, 0, 0, 255))
    dr.text((6, 96 * Z - 14), 'green = hip line y80, red = warteg/FamilyMart split cut y84', fill=(0, 0, 0, 255))
    o.save(f'{B}/live/previews/{n}_sit_zoom_vs_live.png')
print('ok')
