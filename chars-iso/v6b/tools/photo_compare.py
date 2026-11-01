# front-view zoom vs the photo reference (photo rotated upright, downscaled beside the sprite)
from PIL import Image, ImageDraw, ImageOps
import os, sys
B = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ph = Image.open(sys.argv[1]); ph = ImageOps.exif_transpose(ph)
if ph.width > ph.height: ph = ph.rotate(90, expand=True)
H = 560; ph = ph.resize((int(ph.width * H / ph.height), H), Image.LANCZOS).convert('RGBA')
sh = Image.open(f'{B}/live/ichsan_v6b_sheet.png').convert('RGBA')
Z = 10; cells = []
for r, lab in ((4, 'idle se'), (5, 'idle sw'), (6, 'idle ne')):
    c = sh.crop((0, r * 112, 64, (r + 1) * 112)).crop((14, 28, 50, 84)); bg = Image.new('RGBA', c.size, (236, 232, 224, 255)); bg.alpha_composite(c)
    cells.append((bg.resize((c.width * Z, c.height * Z), Image.NEAREST), lab))
tiny = ph.resize((36, int(36 * ph.height / ph.width)), Image.LANCZOS).resize((360, int(360 * ph.height / ph.width)), Image.NEAREST)
W = ph.width + tiny.width + sum(c.width for c, _ in cells) + 20 * 5
o = Image.new('RGBA', (W, H + 30), (255, 255, 255, 255)); d = ImageDraw.Draw(o); x = 10
for im, lab in [(ph, 'photo'), (tiny, 'photo @ ~sprite res')] + cells:
    o.alpha_composite(im, (x, 24)); d.text((x, 6), lab, fill=(0, 0, 0, 255)); x += im.width + 20
o.save(f'{B}/live/previews/ichsan_photo_vs_sprite.png'); print('ok', o.size)
