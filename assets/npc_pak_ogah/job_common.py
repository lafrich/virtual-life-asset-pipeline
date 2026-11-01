"""Shared v6b renderer for the street-job NPCs (Pak Ogah, Manusia Silver). PREVIEW ONLY.
Body / head / face / idle + walk rows come from the game's own v6b generator (live_v6b + npc_v6b: same calls as
npc_v6b.build, incl. its cap() and mask_face() NPC features). This module returns frame-space RGBA layers (64x112,
unmirrored se or ne) so the NPC scripts can add props and custom work-pose arms on top."""
import os, sys, math
sys.path.insert(0, 'chars-iso/v6b/tools')
sys.path.insert(0, 'assets/npc_gfunk')
sys.path.insert(0, 'assets/npc_preview_v2')
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import live_v6b as lv, npc_v6b as nv, parts_v6b as pv, pal6
FW, FH = 64, 112
hx = lv.hx
def H(c): return '#%02X%02X%02X' % tuple(c[:3])
SEQ = ['hair_back', 'body', 'arm_far', 'shoes', 'pants', 'shoes_over', 'rips', 'shirt', 'shirt_graphic', 'outer', 'acc', 'arm_near', 'body_front', 'held']

def render(n, anim='idle', f=0, view='se', expr='neutral', skin_ramp=None):
    """n: npc_v6b-style dict (supports cap / mask). returns dict of frame RGBA numpy layers + pal + bob"""
    C, O = nv.make_cfg(n)
    if skin_ramp: C['skin_map'] = dict(skin_ramp)
    se, pal = lv.build_char_layers(C, O)
    for k, v in C['hair_map'].items(): pal['H' + k] = hx(v)
    pal['B'] = hx(C['brow'])
    ne = lv.back_layers(se, C, O)
    face_window = {(x, y) for y in range(13, 22) for x in range(lv.CW) if se['body'][y, x] and not se['hair_front'][y, x]}
    if n.get('cap'):
        nv.cap(se, ne); cr = nv.ramp(nv.CL[n['cap']]); pal.update({'X1': cr[0], 'X2': cr[2], 'X3': cr[4]})
    if n.get('mask'):
        mc = n['mask']; pal.update({'M1': hx(mc[0]), 'M2': hx(mc[1]), 'M3': hx(mc[2])})
    for i, c in enumerate(('C2', 'C3', 'C4', 'C4', 'C5')): pal.setdefault(f'O{i + 1}', pal[c])
    kind = lv.KIND[anim]
    P = lv.pose_layers(se if view == 'se' else ne, kind, f, view, C, O)
    for mk, mp in pal['_maps'].items(): P[mk] = lv.recolor(P[mk], mp)
    P['shoes_over'] = pv.shoe_style(P, n['shoes'])
    if n['shoes'] in ('boots', 'hightops'): pal.setdefault('S3', hx('#E8E6E0'))
    if n['shoes'] in ('sneakers',): pal.setdefault('S3', hx('#B4B0A8'))
    for k, v in C['skin_map'].items(): pal.setdefault('K' + k, hx(v))
    rg = {k: lv.to_img(v, pal) for k, v in P.items() if k not in ('face', 'brows', 'acc_head')}
    imgs = {k: np.array(v) for k, v in lv.frame_img(rg).items()}
    bob = (-1 if f in (2, 3) else 0) if kind in ('idle', 'talk') else ((-1 if f in (1, 4) else 0) if kind == 'walk' else 0)
    F, B, G = lv.face_layer(expr, C, view, 0, bob, False, 0)
    F = lv.recolor(F, pv.SKIN)
    if n.get('mask'): nv.mask_face(F, view, 0, bob, 0, face_window)
    fi = {k: np.array(v) for k, v in lv.frame_img({'f': lv.to_img(F, pal), 'b': lv.to_img(B, pal), 'g': lv.to_img(G, pal)}).items()}
    imgs['face'] = fi['f']; imgs['brows'] = fi['b']; imgs['glasses'] = fi['g']
    return imgs, pal, bob

def compose(L, keys):
    im = Image.new('RGBA', (FW, FH))
    for k in keys:
        if k in L and L[k] is not None: im.alpha_composite(Image.fromarray(L[k]))
    return np.array(im)

def shadow(cx=32, rx=11):
    yy, xx = np.mgrid[0:FH, 0:FW]; o = np.zeros((FH, FW, 4), np.uint8)
    o[((xx + .5 - cx) / rx) ** 2 + ((yy + .5 - 100.5) / 2.4) ** 2 <= 1] = (0, 0, 0, 56); return o

def put(a, x, y, c):
    if 0 <= x < FW and 0 <= y < FH: a[y, x, :3] = c[:3]; a[y, x, 3] = 255

def disk(cx, cy, rx, ry=None):
    ry = rx if ry is None else ry; yy, xx = np.mgrid[0:FH, 0:FW]
    return ((xx + .5 - cx) / rx) ** 2 + ((yy + .5 - cy) / ry) ** 2 <= 1

def tube(pts, r):
    m = np.zeros((FH, FW), bool)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 3) + 1
        for t in np.linspace(0, 1, n): m |= disk(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r)
    return m

def shade(mask, ramp, bias=0.0, edge=True):
    """left-lit cel shading on a mask; ramp = [hl, light, mid, shade, edge]; edge = darkest tone of the same material"""
    a = np.zeros((FH, FW, 4), np.uint8); ys, xs = np.nonzero(mask)
    pad = np.pad(mask, 1)
    for y, x in zip(ys, xs):
        row = np.nonzero(mask[y])[0]; col = np.nonzero(mask[:, x])[0]
        u = (x - row.min()) / max(1, row.max() - row.min()); v = (y - col.min()) / max(1, col.max() - col.min())
        t = .75 * u + .25 * v + bias
        isedge = not (pad[y, x + 1] and pad[y + 2, x + 1] and pad[y + 1, x] and pad[y + 1, x + 2])
        if edge and isedge and (u > .45 or v > .6): c = ramp[4]
        elif t < .18: c = ramp[0] if len(row) > 2 else ramp[1]
        elif t < .36: c = ramp[1]
        elif t < .64: c = ramp[2]
        else: c = ramp[3]
        a[y, x, :3] = c; a[y, x, 3] = 255
    return a

def lum(c): return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
def remap(a, mask, ramp):
    """recolour masked px by luminance rank onto ramp (keeps the generator's shading pattern)"""
    a = a.copy(); cols = sorted({tuple(p[:3]) for p in a[mask]}, key=lum, reverse=True)
    for i, c in enumerate(cols):
        t = ramp[min(len(ramp) - 1, round(i * (len(ramp) - 1) / max(1, len(cols) - 1)))] if len(cols) > 1 else ramp[1]
        m = mask & np.all(a[..., :3] == c, axis=2); a[m, :3] = t
    return a

def bbox(a):
    ys, xs = np.nonzero(a[..., 3]); return (xs.min(), ys.min(), xs.max(), ys.max()) if len(ys) else None

# ---------- preview helpers
BG = (16, 20, 27, 255); S = 4
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
fb = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
def sheet(title, rows, path, bg=None):
    """rows: [(label, [(lab, PIL)])]. bg None -> transparent sheet (labels on a dark strip)"""
    n = max(len(r[1]) for r in rows); W = 16 + n * (FW * S + 12); HH = FH * S
    sh = Image.new('RGBA', (W, 40 + len(rows) * (HH + 30)), bg or (0, 0, 0, 0)); d = ImageDraw.Draw(sh)
    if not bg: d.rectangle([0, 0, W, 34], fill=BG)
    d.text((16, 8), title, fill=(231, 235, 242), font=fb)
    for j, (rl, items) in enumerate(rows):
        y = 40 + j * (HH + 30)
        if not bg: d.rectangle([0, y, W, y + 15], fill=BG)
        for i, (lab, f) in enumerate(items):
            x = 16 + i * (FW * S + 12); sh.alpha_composite(f.convert('RGBA').resize((FW * S, HH), Image.NEAREST), (x, y + 16))
            d.text((x + 4, y + 1), (rl + '  ' if i == 0 and rl else '') + lab, fill=(141, 151, 168), font=font)
    sh.save(path)

def gif(frames_list, path, ms, transparent=True):
    """frames_list: list of PIL frames (each may be a wide strip). saved 4x, transparent GIF (index 0 = transparent)"""
    out = []
    for im in frames_list:
        big = im.resize((im.width * S, im.height * S), Image.NEAREST)
        if transparent:
            a = np.array(big); key = (255, 0, 255)
            rgb = a[..., :3].copy(); al = a[..., 3]
            # GIF has 1-bit alpha: the alpha-56 shadow is flattened to a dark grey so it stays visible
            sh = (al > 0) & (al < 255); rgb[sh] = (np.array(BG[:3]) * 0 + 40).astype(np.uint8)
            rgb[al == 0] = key
            p = Image.fromarray(rgb, 'RGB').quantize(colors=255, method=Image.MEDIANCUT, dither=Image.NONE)
            pa = np.array(p); pl = p.getpalette()[:765]
            ki = [i for i in range(len(pl) // 3) if tuple(pl[i * 3:i * 3 + 3]) == key]
            out.append((p, ki[0] if ki else None))
        else:
            c = Image.new('RGBA', big.size, BG); c.alpha_composite(big); out.append((c.convert('RGB'), None))
    ims = [o[0] for o in out]
    kw = dict(save_all=True, append_images=ims[1:], duration=ms, loop=0, disposal=2)
    if transparent and out[0][1] is not None: kw['transparency'] = out[0][1]
    ims[0].save(path, **kw)

def strip(frames):
    c = Image.new('RGBA', (FW * len(frames), FH))
    for j, f in enumerate(frames): c.alpha_composite(f, (j * FW, 0))
    return c
