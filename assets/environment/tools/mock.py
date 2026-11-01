"""Assemble mock rooms from manifest.json using ONLY the integration contract."""
import os, json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAN = json.load(open(os.path.join(ROOT, 'manifest.json')))
BY = {a['id']: a for a in MAN['assets']}
CH = 'chars-iso/examples'
ANIM = {'walk': 0, 'idle': 1, 'talk': 2, 'sit': 3, 'sit_type': 4, 'sleep': 5, 'tired': 6, 'swim': 7, 'float': 8, 'lie': 9}
DIRS = {'se': 0, 'sw': 1, 'ne': 2, 'nw': 3}
_img = {}
def img(rel):
    if rel not in _img: _img[rel] = Image.open(os.path.join(ROOT, rel)).convert('RGBA')
    return _img[rel]
def sheet(name):
    k = 'CH:' + name
    if k not in _img:
        p = os.path.join(CH, name + '_sheet_no_overlay.png')
        _img[k] = Image.open(p).convert('RGBA') if os.path.exists(p) else None
    return _img[k]

def screen(dst, src, xy):
    """screen blend src (RGBA) onto dst at xy"""
    x, y = xy; w, h = src.size
    D = np.asarray(dst).astype(np.float32).copy(); S = np.asarray(src).astype(np.float32)
    x0, y0, x1, y1 = max(0, x), max(0, y), min(dst.width, x + w), min(dst.height, y + h)
    if x1 <= x0 or y1 <= y0: return dst
    d = D[y0:y1, x0:x1, :3] / 255; s = S[y0 - y:y1 - y, x0 - x:x1 - x]
    a = s[..., 3:4] / 255; sc = s[..., :3] / 255
    res = 1 - (1 - d) * (1 - sc)
    D[y0:y1, x0:x1, :3] = (d * (1 - a) + res * a) * 255
    return Image.fromarray(D.clip(0, 255).astype(np.uint8), 'RGBA')

class Room:
    def __init__(self, C, R, floor='floor_night', skin='night', title='', walls='LR', frame=0):
        self.C, self.R, self.title = C, R, title
        self.walls_on, self.fframe = walls, frame
        self.X0 = R * 32 + 40; self.Y0 = 96 + 40
        self.W = (C + R) * 32 + 80; self.H = (C + R) * 16 + 96 + 90
        self.floor, self.skin = floor, skin
        self.items = []; self.overlays = []; self.wall = []; self.glows = []; self.floormap = {}
        self.walls_R = {}; self.walls_L = {}; self.floorglow = []
    def P(self, c, r): return (self.X0 + (c - r) * 32, self.Y0 + (c + r) * 16)
    def pos(self, e, c, r, rel):
        ax, ay = e['anchor']; x, y = self.P(c, r)
        return (int(round(x - ax)), int(round(y - ay)))
    def tile(self, c, r, kind): self.floormap[(c, r)] = kind
    def wallR(self, c, kind): self.walls_R[c] = kind
    def wallL(self, r, kind): self.walls_L[r] = kind
    def add(self, id, c, r, frame=None):
        e = BY[id]
        if frame is None: frame = self.fframe
        files = e['animation']['files'][frame % e['animation']['frames']] if 'animation' in e else e
        if e['kind'] == 'floor_overlay':
            self.overlays.append((c + r, files['main'], self.pos(e, c, r, 0), e.get('blend'))); return
        if e['kind'] == 'wall_item':
            self.wall.append((c + r + 0.5, files['main'], self.pos(e, c, r, 0))); 
            if 'glow' in files: self.glows.append((files['glow'], self.pos(e, c, r, 0)))
            return
        dep = e.get('depth_offset', {'back': (e['footprint'][0] + e['footprint'][1]) / 2})
        p = self.pos(e, c, r, 0)
        if 'front' in files:
            self.items.append((c + r + dep['back'], files['back'], p)); self.items.append((c + r + dep['front'], files['front'], p))
        else:
            self.items.append((c + r + dep['back'], files['main'], p))
        if 'glow' in files: self.glows.append((files['glow'], p))
    def front_wall(self, id, c, r, depth):
        e = BY[id]; self.items.append((depth, e['main'], self.pos(e, c, r, 0)))
    def prop(self, id, c, r, z, host_depth):
        e = BY[id]; x, y = self.P(c, r); ax, ay = e['anchor']
        self.items.append((host_depth + 0.01, e['main'], (int(x - ax), int(y - ay - z))))
    def avatar(self, name, c, r, anim='idle', d='sw', frame=0, dy=0, water_line=None):
        sh = sheet(name)
        if sh is None: return
        row = ANIM[anim] * 4 + DIRS[d]
        fr = sh.crop((frame * 64, row * 112, frame * 64 + 64, row * 112 + 112))
        if water_line is not None:      # swim proxy: clip below the water line, 1px glow line (contract)
            yl = 100 - water_line
            a = np.asarray(fr).copy(); body = a[..., 3] > 0
            row_has = body[yl].nonzero()[0]
            a[yl:, :, 3] = 0
            if len(row_has):
                a[yl, row_has.min() - 1:row_has.max() + 2] = (127, 224, 232, 255)
            fr = Image.fromarray(a, 'RGBA')
        x, y = self.P(c, r)
        self.items.append((c + r + 0.05, fr, (int(x - 32), int(y - 100 + dy))))
    def sit(self, name, seat_host_id, c, r, k=0, anim='sit', frame=0):
        e = BY[seat_host_id]; st = e['seats'][k]
        self.avatar(name, c + st['point'][0], r + st['point'][1], anim, st['facing'], frame, st.get('avatar_offset_y_px', 0))
    def render(self, scale=2, label=True):
        im = Image.new('RGBA', (self.W, self.H), (11, 14, 19, 255))
        sfx = '' if self.skin == 'night' else '_' + self.skin
        for c in range(self.C):
            for r in range(self.R):
                k = self.floormap.get((c, r), self.floor)
                e = BY[k] if k in BY else BY[f"{k}_{'a' if (c + r) % 2 == 0 else 'b'}"]
                files = e['animation']['files'][self.fframe % e['animation']['frames']] if 'animation' in e else e
                im.alpha_composite(img(files['main']), self.pos(e, c, r, 0))
                if 'glow' in files: self.floorglow.append((files['glow'], self.pos(e, c, r, 0)))
        for c in range(self.C):
            e = BY['floor_edge_L']; im.alpha_composite(img(e['main']), self.pos(e, c, self.R - 1, 0))
        for r in range(self.R):
            e = BY['floor_edge_R']; im.alpha_composite(img(e['main']), self.pos(e, self.C - 1, r, 0))
        for f, p in self.floorglow: im = screen(im, img(f), p)
        for _, f, p, bl in sorted(self.overlays, key=lambda t: t[0]):
            im = screen(im, img(f), p) if bl == 'screen' else (im.alpha_composite(img(f), p) or im)
        walls = [(0, BY['wall_corner' + sfx], 0, 0)] if self.walls_on == 'LR' else []
        if 'R' in self.walls_on:
            for c in range(self.C): walls.append((c + 0.4, BY[f"wall_R_{self.walls_R.get(c, 'plain')}{sfx}"], c, 0))
            walls.append((self.C, BY['wall_R_cap' + sfx], self.C, 0))
        if 'L' in self.walls_on:
            for r in range(self.R): walls.append((r + 0.4, BY[f"wall_L_{self.walls_L.get(r, 'plain')}{sfx}"], 0, r))
            walls.append((self.R, BY['wall_L_cap' + sfx], 0, self.R))
        for _, e, c, r in sorted(walls, key=lambda t: t[0]):
            im.alpha_composite(img(e['main']), self.pos(e, c, r, 0))
            if 'glow' in e: self.glows.append((e['glow'], self.pos(e, c, r, 0)))
        for _, f, p in sorted(self.wall, key=lambda t: t[0]): im.alpha_composite(img(f), p)
        # door leaves of open doors are 'front' parts -> drawn with objects at depth of the wall cell
        for c, k in self.walls_R.items():
            e = BY[f"wall_R_{k}{sfx}"]
            if 'front' in e: self.items.append((c + 0.6, e['front'], self.pos(e, c, 0, 0)))
        for r, k in self.walls_L.items():
            e = BY[f"wall_L_{k}{sfx}"]
            if 'front' in e: self.items.append((r + 0.6, e['front'], self.pos(e, 0, r, 0)))
        for _, f, p in sorted(self.items, key=lambda t: t[0]):
            im.alpha_composite(f if isinstance(f, Image.Image) else img(f), p)
        for f, p in self.glows: im = screen(im, img(f), p)
        if label and self.title:
            d = ImageDraw.Draw(im)
            try: fnt = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 11)
            except Exception: fnt = None
            d.text((10, self.H - 18), '  '.join(self.title.upper()), fill=(141, 151, 168, 255), font=fnt)
        return im.resize((im.width * scale, im.height * scale), Image.NEAREST)
