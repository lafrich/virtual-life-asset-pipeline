import os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from mock import BY, MAN, ROOT, img, screen, sheet, Room
from palette import PAL
OUT = os.path.join(ROOT, 'previews')
FNT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 10)
FNTB = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 13)
BG = (16, 20, 27, 255)
AREAS = ['tiles', 'walls', 'workspace', 'library', 'lounge', 'coordination', 'gallery', 'sharing', 'misc', 'fx', 'brainstorm', 'meeting', 'outdoor']

def cell(e, scale):
    files = e['animation']['files'][0] if 'animation' in e else e
    im = Image.new('RGBA', img(files['main']).size, (0, 0, 0, 0))
    if e.get('blend') == 'screen':
        base = Image.new('RGBA', im.size, BG); im = screen(base, img(files['main']), (0, 0))
    else:
        im.alpha_composite(img(files['main']))
    if 'glow' in files:
        base = Image.new('RGBA', im.size, BG); base.alpha_composite(im); im = screen(base, img(files['glow']), (0, 0))
    return im.resize((im.width * scale, im.height * scale), Image.NEAREST)

def contact(entries, scale, path, maxw=1800, title=''):
    pad = 10; x = pad; y = 40; rowh = 0; places = []
    for area in AREAS:
        es = [e for e in entries if e['area'] == area]
        if not es: continue
        if x > pad: x = pad; y += rowh + 26; rowh = 0
        places.append(('H', area, x, y)); y += 20
        for e in es:
            c = cell(e, scale); w, h = c.size
            w2 = max(w, len(e['id']) * 6 + 4)
            if x + w2 > maxw: x = pad; y += rowh + 24; rowh = 0
            places.append(('C', (e, c), x, y)); x += w2 + 14; rowh = max(rowh, h)
        x = maxw
    H = y + rowh + 40
    out = Image.new('RGBA', (maxw + pad, H), BG); d = ImageDraw.Draw(out)
    d.text((pad, 10), title, fill=(224, 165, 38, 255), font=FNTB)
    for k, a, x, y in places:
        if k == 'H': d.text((x, y), a.upper(), fill=(141, 151, 168, 255), font=FNTB); d.line((x, y + 16, maxw - 10, y + 16), fill=(42, 50, 66, 255))
        else:
            e, c = a; out.alpha_composite(c, (x, y))
            d.text((x, y + c.height + 3), e['id'], fill=(141, 151, 168, 255), font=FNT)
    out.save(path); print(path, out.size)

def slices():
    """back / front / glow / assembled-with-avatar, for the layered seats + desks"""
    rows = [('desk_single_sw', 'office_chair_ne', 'raka', 'sit_type'), ('desk_double_ne', 'office_chair_sw', 'bima', 'sit_type'),
            ('desk_single_se', 'office_chair_nw', 'nadia', 'sit_type'), ('desk_single_nw', 'office_chair_se', 'ellen', 'sit_type'),
            (None, 'armchair_leather_sw', 'grok_bot', 'sit'), (None, 'sofa_2_ne', 'raka', 'sit'), (None, 'meeting_chair_se', 'ellen', 'sit')]
    S = 3; tiles = []
    for desk, chair, who, anim in rows:
        parts = []
        for id in [x for x in (desk, chair) if x]:
            e = BY[id]
            for k in ('back', 'front', 'glow'):
                if k in e:
                    i = img(e[k]); b = Image.new('RGBA', i.size, BG)
                    b = screen(b, i, (0, 0)) if k == 'glow' else (b.alpha_composite(i) or b)
                    parts.append((f'{id}:{k}', b))
        # assembled
        m = Room(3, 3, 'floor_night'); m.W, m.H = 320, 260; m.X0, m.Y0 = 160, 120
        if desk:
            dc, dr = 1, 1
            st = BY[desk]['seats'][0]; sc, sr = int(dc + st['point'][0]), int(dr + st['point'][1])
            m.add(desk, dc, dr); m.add(chair, sc, sr); m.sit(who, chair, sc, sr, 0, anim, 1)
        else:
            m.add(chair, 1, 1); m.sit(who, chair, 1, 1, 0, anim, 0)
        im = Image.new('RGBA', (m.W, m.H), BG)
        for _, f, p in sorted(m.items, key=lambda t: t[0]):
            im.alpha_composite(f if isinstance(f, Image.Image) else img(f), p)
        for f, p in m.glows: im = screen(im, img(f), p)
        bb = Image.new('RGBA', im.size, BG); diff = np.any(np.asarray(im) != np.asarray(bb), axis=2); ys, xs = np.nonzero(diff)
        parts.append((f'= {who} {anim}', im.crop((xs.min() - 4, ys.min() - 4, xs.max() + 5, ys.max() + 5))))
        tiles.append(parts)
    W = max(sum(max(p[1].width * S, len(p[0]) * 6) + 16 for p in r) for r in tiles) + 20
    H = sum(max(p[1].height for p in r) * S + 40 for r in tiles) + 40
    out = Image.new('RGBA', (W, H), BG); d = ImageDraw.Draw(out); y = 30
    d.text((10, 8), 'SLICES: back (under avatar) / front (over avatar) / glow (screen)  ->  assembled', fill=(224, 165, 38, 255), font=FNTB)
    for r in tiles:
        x = 10; rh = 0
        for lab, i in r:
            big = i.resize((i.width * S, i.height * S), Image.NEAREST); out.alpha_composite(big, (x, y + 14))
            d.text((x, y), lab.replace('\n', ' · '), fill=(141, 151, 168, 255), font=FNT); x += max(big.width, len(lab) * 6) + 16; rh = max(rh, big.height)
        y += rh + 40
    out.save(os.path.join(OUT, 'slices_seating.png')); print('slices', out.size)

def palette_check():
    allowed = {tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in PAL.values()}
    bad = {}
    for e in MAN['assets']:
        fl = [e] + (e['animation']['files'] if 'animation' in e else [])
        for f in fl:
            for k in ('main', 'back', 'front', 'glow'):
                if k not in f: continue
                a = np.asarray(img(f[k]))
                px = a[a[..., 3] > 0][:, :3]
                for c in set(map(tuple, px)):
                    if c not in allowed: bad.setdefault(f[k], set()).add(c)
    print('palette violations:', len(bad))
    for k, v in list(bad.items())[:10]: print(' ', k, list(v)[:5])
    return bad

if __name__ == '__main__':
    firsts, seen = [], set()
    for e in MAN['assets']:
        if e['base_id'] in seen: continue
        seen.add(e['base_id']); firsts.append(e)
    contact(firsts, 2, os.path.join(OUT, 'contact_sheet.png'), 2000, 'VIRTUAL OFFICE · ENVIRONMENT · 2x (first variant of each asset) · tile 64x32')
    contact(MAN['assets'], 1, os.path.join(OUT, 'contact_sheet_all_variants.png'), 2000, 'ALL VARIANTS · 1x')
    slices(); palette_check()
