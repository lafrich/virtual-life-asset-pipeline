import sys
from PIL import Image
sh = Image.open(sys.argv[1]); Z = int(sys.argv[3]) if len(sys.argv) > 3 else 4
cells = [(4, 0), (0, 1), (0, 4), (12, 0), (5, 0), (6, 0), (2, 1), (14, 0), (4, 3)]
o = Image.new('RGBA', (64 * len(cells), 80), (240, 236, 228, 255))
for i, (r, c) in enumerate(cells):
    t = Image.new('RGBA', (64, 112), (240, 236, 228, 255)); t.alpha_composite(sh.crop((c * 64, r * 112, c * 64 + 64, r * 112 + 112))); o.paste(t.crop((0, 26, 64, 106)), (i * 64, 0))
o.resize((o.width * Z, o.height * Z), Image.NEAREST).save(sys.argv[2])
