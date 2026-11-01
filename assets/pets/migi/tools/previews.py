"""GIF previews (4x), overview, in-context mocks (real environment + character assets), reference comparison."""
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps
sys.path.insert(0, 'assets/environment/tools')
from mock import Room, BY, ROOT as ENV
PET = 'assets/pets/migi'
PV = f'{PET}/previews'; TMP = '/tmp/migi_preview_tmp'; os.makedirs(TMP, exist_ok=True)
META = json.load(open(f'{PET}/metadata.json')); MAN = json.load(open(f'{PET}/manifest.json'))
PBY = {a['id']: a for a in MAN['assets']}
SHEET = Image.open(f'{PET}/migi_sheet.png').convert('RGBA'); SHAD = Image.open(f'{PET}/migi_sheet_shadow.png').convert('RGBA')
FW, FH = META['frame']['width'], META['frame']['height']; PX, PY = META['pivot']['x'], META['pivot']['y']
DIRS = META['directions']
F = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
FNT = ImageFont.truetype(F, 10); FNTB = ImageFont.truetype(F, 13)
BG = (16, 20, 27, 255); LBL = (141, 151, 168, 255); BRASS = (224, 165, 38, 255)
TILE_A = Image.open(f'{ENV}/tiles/floor_night_a.png').convert('RGBA'); TILE_B = Image.open(f'{ENV}/tiles/floor_night_b.png').convert('RGBA')

def frame(anim, d, f, shadow=True):
    r = META['animations'][anim]['rows'][d]
    box = (f * FW, r * FH, f * FW + FW, r * FH + FH)
    im = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
    if shadow: im.alpha_composite(SHAD.crop(box))
    im.alpha_composite(SHEET.crop(box)); return im

def cell(anim, d, f):
    """64x52 cell: one floor tile with Migi on its centre"""
    c = Image.new('RGBA', (64, 52), BG)
    c.alpha_composite(TILE_B, (0, 20))                # tile centre = (32, 36)
    c.alpha_composite(frame(anim, d, f), (32 - PX, 36 - PY)); return c

def gifs():
    out = []
    for anim, a in META['animations'].items():
        frames = []
        for f in range(a['frames']):
            strip = Image.new('RGBA', (64 * 4 + 30, 52 + 14), BG); dr = ImageDraw.Draw(strip)
            for i, d in enumerate(DIRS):
                strip.alpha_composite(cell(anim, d, f), (6 + i * 70, 12)); dr.text((6 + i * 70, 0), d, fill=LBL, font=FNT)
            dr.text((200, 0), f'{anim} {f + 1}/{a["frames"]}', fill=BRASS, font=FNT)
            frames.append(strip.resize((strip.width * 4, strip.height * 4), Image.NEAREST).convert('RGB'))
        p = f'{PV}/migi_{anim}_4x.gif'
        frames[0].save(p, save_all=True, append_images=frames[1:], duration=int(1000 / a['fps']), loop=0, disposal=1)
        out.append(p)
    return out

def overview():
    S = 3; anims = list(META['animations'])
    W = 80 + 6 * (FW + 4) + 330
    rows = []
    for anim in anims:
        a = META['animations'][anim]
        for d in DIRS: rows.append((anim, d, a['frames']))
    H = 60 + len(rows) * (FH + 4) + 120
    im = Image.new('RGBA', (W, H), BG); dr = ImageDraw.Draw(im)
    dr.text((8, 6), 'MIGI  ·  pet sprite set v1.0  ·  frame 32x32, pivot (16,24)  ·  1x', fill=BRASS, font=FNTB)
    dr.text((8, 24), 'rows = anim*4 + dir (se, sw, ne, nw) · NOT mirrored: all 4 directions drawn (asymmetric patches)', fill=LBL, font=FNT)
    y = 44
    for anim, d, n in rows:
        dr.text((8, y + 10), f'{anim[:5]:5} {d}', fill=LBL, font=FNT)
        for f in range(n):
            x = 80 + f * (FW + 4)
            t = Image.new('RGBA', (FW, FH), (28, 35, 48, 255)); t.alpha_composite(frame(anim, d, f)); im.alpha_composite(t, (x, y))
            # 4x big copy for frame 0
        y += FH + 4
    # props
    dr.text((8, y + 8), 'props (environment schema, pets/migi/manifest.json)', fill=BRASS, font=FNT)
    x = 8; y += 26
    for pid in ('pet_bowl_empty', 'pet_bowl_full', 'pet_bed_grid'):
        e = PBY[pid]; p = Image.open(f'{PET}/{e["shadow"]}').convert('RGBA'); p.alpha_composite(Image.open(f'{PET}/{e["main"]}').convert('RGBA'))
        t = Image.new('RGBA', (64, 40), BG); t.alpha_composite(TILE_A, (0, 8))
        ax, ay = e['anchor']; t.alpha_composite(p, (32 - ax, 8 - ay)); im.alpha_composite(t, (x, y)); dr.text((x, y + 42), pid, fill=LBL, font=FNT); x += 110
    big = im.resize((im.width * S, im.height * S), Image.NEAREST)
    big.save(f'{PV}/migi_overview_3x.png'); im.save(f'{PV}/migi_overview_1x.png')

def save_tmp(im, name):
    p = f'{TMP}/{name}.png'; im.save(p); return p

class PetRoom(Room):
    def prop(self, pid, c, r):
        e = PBY[pid]; pos = self.pos(e, c, r, 0)
        self.overlays.append((c + r, f'{PET}/{e["shadow"]}', pos, None))
        self.items.append((c + r + e['depth_offset']['back'], f'{PET}/{e["main"]}', pos))
    def migi(self, anim, d, f, c, r, dy=0):
        x, y = self.P(c, r)
        rr = META['animations'][anim]['rows'][d]; box = (f * FW, rr * FH, f * FW + FW, rr * FH + FH)
        self.overlays.append((c + r + 0.01, save_tmp(SHAD.crop(box), f'sh_{anim}_{d}_{f}_{c}_{r}'), (int(x - PX), int(y - PY + dy)), None))
        self.items.append((c + r + 0.05, SHEET.crop(box), (int(x - PX), int(y - PY + dy))))

def mocks():
    m = PetRoom(6, 5, 'floor_night', title='Workspace · Migi')
    m.wallR(3, 'window'); m.add('poster_L', 0, 2)
    m.add('desk_double_sw', 1, 1); m.add('office_chair_ne', 1, 2); m.add('office_chair_ne', 2, 2)
    m.sit('raka', 'desk_double_sw', 1, 1, 0, 'sit_type', 1)
    m.add('pool_warm_1', 1, 1)
    m.add('plant_bush', 5, 0); m.add('filing_cabinet_sw', 4, 0)
    m.avatar('reference_man_original', 3.5, 2.5, 'idle', 'sw', 0)
    m.migi('sit', 'sw', 0, 3.2, 3.25)                      # the stare, next to the user's own avatar
    m.prop('pet_bowl_full', 0, 4)
    bp = PBY['pet_bowl_full']['use_points'][1]               # se, camera-facing
    m.migi('eat', 'se', 0, 0 + bp['point'][0], 4 + bp['point'][1]) if False else None
    m.prop('pet_bed_grid', 4, 3)
    im = m.render(scale=3); im.save(f'{PV}/mock_workspace_migi_3x.png')
    # closeup of the main mock (Migi next to the user's avatar), 1x crop -> 4x
    raw = m.render(scale=1)
    x, y = m.P(3.2, 3.25); box = (int(x - 70), int(y - 105), int(x + 70), int(y + 30))
    raw.crop(box).resize(((box[2] - box[0]) * 4, (box[3] - box[1]) * 4), Image.NEAREST).save(f'{PV}/mock_closeup_4x.png')
    # use points demo: one room, three poses of Migi shown at once (sleep on the bed, eat at the bowl, walk)
    m2 = PetRoom(6, 3, 'floor_night', title='use points demo')
    up = PBY['pet_bed_grid']['use_points'][0]; bp = PBY['pet_bowl_full']['use_points'][0]
    m2.prop('pet_bed_grid', 1, 1)
    m2.migi('sleep', 'sw', 0, 1 + up['point'][0], 1 + up['point'][1], dy=up['pet_offset_y_px'])
    m2.prop('pet_bowl_full', 4, 1)
    m2.migi('eat', bp['facing'], 0, 4 + bp['point'][0], 1 + bp['point'][1])
    m2.prop('pet_bowl_empty', 5, 0)
    m2.migi('walk', 'se', 1, 2.6, 2.3)
    m2.add('plant_bush', 0, 0)
    raw = m2.render(scale=1, label=False)
    raw.resize((raw.width * 3, raw.height * 3), Image.NEAREST).save(f'{PV}/mock_use_points_3x.png')
    return m, m2

if __name__ == '__main__':
    print(gifs()); overview(); mocks(); print('ok')
