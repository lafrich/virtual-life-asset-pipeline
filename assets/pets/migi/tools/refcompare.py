"""Reference comparison: photo crops beside the sprite."""
import json
from PIL import Image, ImageOps, ImageDraw, ImageFont
PET = 'assets/pets/migi'; REF = 'assets/references/migi'
META = json.load(open(f'{PET}/metadata.json')); MAN = {a['id']: a for a in json.load(open(f'{PET}/manifest.json'))['assets']}
SHEET = Image.open(f'{PET}/migi_sheet.png').convert('RGBA'); SHAD = Image.open(f'{PET}/migi_sheet_shadow.png').convert('RGBA')
F = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'; FNT = ImageFont.truetype(F, 15); FNTB = ImageFont.truetype(F, 20)
BG = (16, 20, 27, 255); LBL = (141, 151, 168, 255); BRASS = (224, 165, 38, 255); TILE = (28, 35, 48, 255)
def photo(name, box, h=360):
    im = ImageOps.exif_transpose(Image.open(f'{REF}/{name}')).convert('RGBA').crop(box)
    return im.resize((int(im.width * h / im.height), h), Image.LANCZOS)
def fr(anim, d, f, S=8, bed=False):
    r = META['animations'][anim]['rows'][d]; box = (f * 32, r * 32, f * 32 + 32, r * 32 + 32)
    if bed:
        e = MAN['pet_bed_grid']; c = Image.new('RGBA', (56, 44), TILE)
        b = Image.open(f'{PET}/{e["shadow"]}').convert('RGBA'); b.alpha_composite(Image.open(f'{PET}/{e["main"]}').convert('RGBA'))
        ax, ay = e['anchor']; c.alpha_composite(b, (28 - ax, 10 - ay))
        cat = SHAD.crop(box); cat.alpha_composite(SHEET.crop(box)); c.alpha_composite(cat, (28 - 16, 26 - 24 - 8))
        return c.resize((c.width * 6, c.height * 6), Image.NEAREST)
    c = Image.new('RGBA', (32, 32), TILE); c.alpha_composite(SHAD.crop(box)); c.alpha_composite(SHEET.crop(box))
    return c.resize((32 * S, 32 * S), Image.NEAREST)
rows = [
    ('face: black mask split by a white blaze, green eyes, pink nose, white muzzle - the wide-eyed stare',
     [photo('migi_1_lying.jpg', (1250, 650, 2350, 1700))], [('sit sw', fr('sit', 'sw', 0, 9)), ('meow sw f2', fr('meow', 'sw', 2, 9)), ('sit se', fr('sit', 'se', 0, 9))]),
    ('body: mostly white, chubby, big black patches on back/flank, black spot on the hind leg, fluffy black tail',
     [photo('migi_3_side.jpg', (0, 600, 3000, 4000))], [('walk se', fr('walk', 'se', 1, 9)), ('sit ne (back)', fr('sit', 'ne', 0, 9)), ('loaf nw', fr('loaf', 'nw', 0, 9))]),
    ('pillow: black pillow with a cream grid - his favourite spot',
     [photo('migi_2_pillow.jpg', (900, 300, 3000, 3600))], [('sleep sw on pet_bed_grid', fr('sleep', 'sw', 0, bed=True)), ('loaf se on pet_bed_grid', fr('loaf', 'se', 0, bed=True))]),
]
W = 1330; y = 60; parts = []
for t, ph, sp in rows:
    h = max([p.height for p in ph] + [s.height for _, s in sp]); parts.append((y, t, ph, sp)); y += h + 70
out = Image.new('RGBA', (W, y + 10), BG); d = ImageDraw.Draw(out)
d.text((20, 16), 'MIGI · reference photos vs. sprite (1x art shown at 8-9x; previews use the shadow layer on a navy tile)', fill=BRASS, font=FNTB)
for y0, t, ph, sp in parts:
    d.text((20, y0), t, fill=LBL, font=FNT); x = 20; yy = y0 + 26
    for p in ph: out.alpha_composite(p, (x, yy)); x += p.width + 30
    for lab, s in sp:
        out.alpha_composite(s, (x, yy)); d.text((x, yy + s.height + 2), lab, fill=LBL, font=FNT); x += s.width + 20
out.convert('RGB').save(f'{PET}/previews/reference_comparison.png'); print(out.size)
