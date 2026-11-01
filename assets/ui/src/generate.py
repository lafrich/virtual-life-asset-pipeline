#!/usr/bin/env python3
"""Virtual Office UI kit + emotes generator (Habbo-style pixel art, drawn in code at 1x).

Run:  python3 generate.py            (re-renders everything into ../, plus @2x/@4x, sheet, README)
Edit palette.json to swap colours; every pixel colour comes from there.
"""
import json, os, shutil
from PIL import Image, ImageDraw
import font

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)
PAL = json.load(open(os.path.join(HERE, 'palette.json')))
SCALES = (2, 4)
SUBDIRS = ['bubbles', 'buttons', 'panels', 'status', 'icons', 'emotes', 'moods', 'frames', 'font', 'samples']

# ---------------------------------------------------------------- colour
def _hx(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
BASE = {k: _hx(v) for k, v in PAL['colors'].items()}
DERIVED_USED = {}

def c(key, a=255):
    """Palette colour. key = 'name' or 'name:tint' (tint from palette.json 'tints')."""
    if ':' in key:
        name, t = key.split(':')
        toward, amt = PAL['tints'][t]
        if toward == 'paper' and name in PAL['warm']['keys']:
            toward = PAL['warm']['lighten_toward']          # AD rule 1: warm hues lighten toward glow
        a0, b0 = BASE[name], BASE[toward]
        rgb = tuple(round(a0[i] + (b0[i] - a0[i]) * amt) for i in range(3))
        DERIVED_USED[key] = '#%02X%02X%02X' % rgb
    else:
        rgb = BASE[key]
    return rgb + (a,)
AL = PAL['alpha']
T = (0, 0, 0, 0)

def new(w, h): return Image.new('RGBA', (w, h), T)

def px(im, x, y, col):
    if 0 <= x < im.width and 0 <= y < im.height: im.putpixel((x, y), col)

def rect(im, x0, y0, x1, y1, col):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): px(im, x, y, col)

def ascii_img(rows, legend):
    rows = [r for r in rows]
    w = len(rows[0]); assert all(len(r) == w for r in rows), rows
    im = new(w, len(rows))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.': im.putpixel((x, y), legend[ch])
    return im

def paste(dst, src, x, y):
    """Alpha-over paste at integer coords (no resampling)."""
    tmp = new(dst.width, dst.height); tmp.paste(src, (x, y)); dst.alpha_composite(tmp)

def replace(dst, src, x, y):
    """Hard paste: every pixel of src (incl. transparent) replaces dst."""
    dst.paste(src, (x, y))

def pad(im, w, h, valign='center'):
    out = new(w, h)
    y = (h - im.height) // 2 if valign == 'center' else h - im.height
    replace(out, im, (w - im.width) // 2, y); return out

def silhouette(mask_img, col):
    """Return image where every non-transparent pixel of mask_img is col."""
    out = new(mask_img.width, mask_img.height)
    for y in range(mask_img.height):
        for x in range(mask_img.width):
            if mask_img.getpixel((x, y))[3]: out.putpixel((x, y), col)
    return out

def outline(im, col):
    """Add a 1px 4-neighbour outline around opaque pixels (canvas must have room)."""
    out = im.copy()
    for y in range(im.height):
        for x in range(im.width):
            if im.getpixel((x, y))[3]: continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < im.width and 0 <= yy < im.height and im.getpixel((xx, yy))[3]:
                    out.putpixel((x, y), col); break
    return out

def disc(size, fill, shade, hilite, line='void'):
    """Pixel circle with void outline, bottom-right shade, top-left hilite (no AA)."""
    im = new(size, size); cc = (size - 1) / 2; r = size / 2 - 1.0
    inside = lambda x, y: (x - cc) ** 2 + (y - cc) ** 2 <= (r + 0.15) ** 2
    for y in range(size):
        for x in range(size):
            if inside(x, y):
                col = c(fill)
                if (x - cc) + (y - cc) > r * 0.85 and shade: col = c(shade)
                im.putpixel((x, y), col)
            elif any(inside(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                im.putpixel((x, y), c(line))
    if hilite:
        hx, hy = int(cc - r * 0.55), int(cc - r * 0.55)
        if c(hilite) == c(fill):     # e.g. glow:hilite == glow under AD rule 1 -> single paper specular
            px(im, hx, hy, c('paper'))
        else:
            px(im, hx, hy, c(hilite)); px(im, hx + 1, hy, c(hilite)); px(im, hx, hy + 1, c(hilite))
    return im

def text_img(text, col, shadow=None, spacing=1):
    w = font.width(text, spacing); im = new(w, font.H + (1 if shadow else 0))
    if shadow: font.draw(im, 0, 1, text, shadow, spacing)
    font.draw(im, 0, 0, text, col, spacing)
    return im

# ---------------------------------------------------------------- registry / export
REG = []   # (rel, img, group, note)

def save(rel, im, note='', sheet=True):
    path = os.path.join(OUT, rel); os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path)
    stem = path[:-4]
    for s in SCALES:
        im.resize((im.width * s, im.height * s), Image.NEAREST).save('%s@%dx.png' % (stem, s))
    REG.append((rel, im, rel.split('/')[0], note, sheet))
    return im

# ---------------------------------------------------------------- 9-slice helpers
def bevel_box(w, h, layers, fill, round_corner=True):
    """layers: list of (top_left_colour, bottom_right_colour) from the outside in."""
    im = new(w, h)
    rect(im, 0, 0, w - 1, h - 1, fill)
    for i, (a, b) in enumerate(layers):
        x0, y0, x1, y1 = i, i, w - 1 - i, h - 1 - i
        for x in range(x0, x1 + 1): px(im, x, y0, a); px(im, x, y1, b)
        for y in range(y0, y1 + 1): px(im, x0, y, a); px(im, x1, y, b)
        px(im, x1, y0, b if i else a); px(im, x0, y1, b if i else a)
    if round_corner and layers:
        o = layers[0][0]
        for (x, y, dx, dy) in ((0, 0, 1, 1), (w - 1, 0, -1, 1), (0, h - 1, 1, -1), (w - 1, h - 1, -1, -1)):
            px(im, x, y, T)
            if len(layers) > 1: px(im, x + dx, y + dy, layers[0][0] if (dx, dy) == (1, 1) else layers[0][1])
    return im

def slice9(src, ins):
    l, t, r, b = ins; W, H = src.size
    xs = [(0, l), (l, W - r), (W - r, W)]; ys = [(0, t), (t, H - b), (H - b, H)]
    names = [['tl', 't', 'tr'], ['l', 'c', 'r'], ['bl', 'b', 'br']]
    return {names[j][i]: src.crop((xs[i][0], ys[j][0], xs[i][1], ys[j][1])) for j in range(3) for i in range(3)}

def assemble9(src, ins, w, h):
    p = slice9(src, ins); l, t, r, b = ins; out = new(w, h)
    mw, mh = w - l - r, h - t - b
    st = lambda im, ww, hh: im.resize((max(1, ww), max(1, hh)), Image.NEAREST)
    replace(out, p['tl'], 0, 0); replace(out, p['tr'], w - r, 0); replace(out, p['bl'], 0, h - b); replace(out, p['br'], w - r, h - b)
    replace(out, st(p['t'], mw, t), l, 0); replace(out, st(p['b'], mw, b), l, h - b)
    replace(out, st(p['l'], l, mh), 0, t); replace(out, st(p['r'], r, mh), w - r, t)
    replace(out, st(p['c'], mw, mh), l, t)
    return out

NINE = {}   # name -> dict(insets, size)

def export9(folder, name, src, ins, note):
    save('%s/%s.png' % (folder, name), src, note + ' 9-slice source; insets L,T,R,B = %d,%d,%d,%d.' % ins)
    for k, im in slice9(src, ins).items():
        save('%s/%s_%s.png' % (folder, name, k), im, '9-slice piece', sheet=False)
    NINE[name] = ins

# ================================================================ 1. bubbles + name tags
def bubbles():
    # light speech bubble: paper fill (translucent), void outline, 1px rounded corners
    fill_l = c('paper', AL['bubble_light_fill'])
    src = bevel_box(12, 12, [(c('void'), c('void'))], fill_l)
    ins = (3, 3, 3, 3)
    export9('bubbles', 'bubble_light', src, ins, 'Speech bubble, paper @ %d/255 alpha, void outline.' % AL['bubble_light_fill'])
    F, O = fill_l, c('void')
    # tail pieces: top 3 rows reproduce the bubble's bottom edge (fill, fill, outline with a gap)
    tail_down = ascii_img(["fffffff", "fffffff", "offfffo", ".offfo.", "..ofo..", "...o..."], {'f': F, 'o': O})
    tail_left = ascii_img(["fffffff", "fffffff", "offfffo", "offffo.", "offo...", "oo....."], {'f': F, 'o': O})
    tail_thought = ascii_img(["fffffff", "fffffff", "ooooooo", "..ooo..", "..ofo..", "..ooo..", ".oo....", ".oo...."], {'f': F, 'o': O})
    save('bubbles/bubble_light_tail_down.png', tail_down, 'Bottom-edge insert with tail (centre). Rows 0-2 = bottom edge; replaces a 7px run of the bottom edge.')
    save('bubbles/bubble_light_tail_left.png', tail_left, 'Bottom-edge insert, tail pointing down-left (place near left corner).')
    save('bubbles/bubble_light_tail_thought.png', tail_thought, 'Bottom-edge insert, thought-bubble circles.')
    # dark translucent bubble (status line / system bubble)
    fill_d = c('floor_dk', AL['bubble_dark_fill'])
    srcd = bevel_box(12, 12, [(c('void'), c('void')), (c('wall_top'), c('wall_shd'))], fill_d)
    export9('bubbles', 'bubble_dark', srcd, (3, 3, 3, 3), 'Dark bubble, floor_dk @ %d/255 alpha, void outline + wall_top/wall_shd inner rim.' % AL['bubble_dark_fill'])
    R, S, Fd = c('wall_top'), c('wall_shd'), fill_d
    tdd = ascii_img(["fffffff", "sffffss", "offfffo", ".offfo.", "..oso..", "...o..."], {'f': Fd, 'o': O, 's': S})
    save('bubbles/bubble_dark_tail_down.png', tdd, 'Bottom-edge insert with tail for bubble_dark.')
    # name tag: AD spec = floor_dk plate, 1px brass rim, name paper, role cool grey
    fill_n = c('floor_dk', AL['nametag_fill'])
    srcn = bevel_box(8, 8, [(c('brass'), c('brass'))], fill_n)
    export9('bubbles', 'nametag', srcn, (2, 2, 2, 2), 'Name tag plate, floor_dk @ %d/255 alpha, 1px brass rim (AD spec).' % AL['nametag_fill'])
    B = c('brass')
    ntail = ascii_img(["fffff", "bfffb", ".bfb.", "..b.."], {'f': fill_n, 'b': B})
    save('bubbles/nametag_tail_down.png', ntail, 'Bottom-edge insert for nametag (rows 0-1 = bottom edge).')
    return src, srcd, srcn, tail_down, tail_left, tail_thought, tdd, ntail

def bubble_with_tail(src, ins, tail, w, h, tx, edge_rows):
    body = assemble9(src, ins, w, h)
    out = new(w, h + tail.height - edge_rows)
    replace(out, body, 0, 0); replace(out, tail, tx, h - edge_rows)
    return out

# ================================================================ 2. buttons
def ramp_accent(k):
    return dict(face=c(k), hover=c(k + ':hover'), pressed=c(k + ':pressed'), light=c(k + ':light'),
                hlight=c(k + ':hilite'), side=c(k + ':dark'), shade=c(k + ':shade'), ink=c('paper'), inkshadow=c(k + ':dark'))
RAMP_CTRL = lambda: dict(face=c('wall_lit'), hover=c('wall_top'), pressed=c('wall_shd'), light=c('wall_top'),
                         hlight=c('cool_grey'), side=c('wall_shd'), shade=c('wall_shd'), ink=c('paper'), inkshadow=c('floor_dk'))

def button(w, h, rp, state, icon):
    im = new(w, h)
    top, depth = (0, 2) if state in ('normal', 'hover') else (2, 0)
    rect(im, 0, top, w - 1, h - 1, c('void'))
    fb = h - 2 - depth                      # face bottom row
    face = {'normal': rp['face'], 'hover': rp['hover'], 'pressed': rp['pressed']}[state]
    rect(im, 1, top + 1, w - 2, fb, face)
    if depth: rect(im, 1, fb + 1, w - 2, h - 2, rp['side'])
    if state == 'pressed':
        for x in range(1, w - 1): px(im, x, top + 1, rp['side'])
        for y in range(top + 1, fb + 1): px(im, 1, y, rp['side'])
    else:
        hl = rp['hlight'] if state == 'hover' else rp['light']
        for x in range(1, w - 2): px(im, x, top + 1, hl)
        for y in range(top + 1, fb): px(im, 1, y, hl)
        for y in range(top + 2, fb + 1): px(im, w - 2, y, rp['shade'])
        for x in range(2, w - 1): px(im, x, fb, rp['shade'])
    for (x, y) in ((0, top), (w - 1, top), (0, h - 1), (w - 1, h - 1)): px(im, x, y, T)
    if icon is not None:
        ic = icon(rp)
        fw, fh = w - 4, fb - top - 2            # inner face (inside bevels)
        ix = 2 + (fw - ic.width + 1) // 2; iy = top + 2 + (fh - ic.height + 1) // 2
        paste(im, ic, ix, iy)
    return im

def ink_icon(rows):
    def f(rp):
        g = ascii_img(rows, {'#': rp['ink']}); sh = silhouette(g, rp['inkshadow'])
        out = new(g.width, g.height + 1); paste(out, sh, 0, 1); paste(out, g, 0, 0); return out
    return f

def text_icon(t):
    return lambda rp: text_img(t, rp['ink'], rp['inkshadow'])

ARROWS = {'up': ["..#..", ".###.", "#####"], 'down': ["#####", ".###.", "..#.."],
          'left': ["..#", ".##", "###", ".##", "..#"], 'right': ["#..", "##.", "###", "##.", "#.."]}
GLYPH_PLUS = ["..#..", "..#..", "#####", "..#..", "..#.."]
GLYPH_MINUS = ["#####"]
GLYPH_FIT = ["##.##", "#...#", ".....", "#...#", "##.##"]
GLYPH_X = ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"]

def gallery_icon(rp):
    W_, n, h, G = c('paper'), c('floor_lt'), c('workspace:light'), c('glow')
    g = ascii_img(["WWWWWWWWWWW", "WnnnnnnnnnW", "WnnnnnnGGnW", "WnnhnnnGGnW", "WnhhhnnnnnW", "WhhhhhnnhnW", "WhhhhhhhhhW", "WWWWWWWWWWW"],
                  {'W': W_, 'n': n, 'h': h, 'G': G})
    out = new(g.width, g.height + 1); paste(out, silhouette(g, rp['inkshadow']), 0, 1); paste(out, g, 0, 0); return out

def talk_icon(rp):
    W_, f = c('paper'), rp['face']
    g = ascii_img([".WWWWWWWWW.", "WWWWWWWWWWW", "WWfWWfWWfWW", "WWWWWWWWWWW", ".WWWWWWWWW.", "..WW.......", "..W........"],
                  {'W': W_, 'f': rp['inkshadow']})
    out = new(g.width, g.height + 1); paste(out, silhouette(g, rp['inkshadow']), 0, 1); paste(out, g, 0, 0); return out

def label_icon(iconf, t):
    def f(rp):
        ic = iconf(rp); tx = text_img(t, rp['ink'], rp['inkshadow'])
        out = new(ic.width + 3 + tx.width, max(ic.height, tx.height))
        paste(out, ic, 0, (out.height - ic.height) // 2); paste(out, tx, ic.width + 3, (out.height - tx.height) // 2 + (1 if ic.height > tx.height else 0))
        return out
    return f

STATES = ('normal', 'hover', 'pressed')
def buttons():
    ctrl = RAMP_CTRL(); out = {}
    def trio(name, w, h, rp, icon, note):
        for s in STATES:
            out[(name, s)] = save('buttons/%s_%s.png' % (name, s), button(w, h, rp, s, icon), note)
    for d in ('up', 'down', 'left', 'right'):
        trio('dpad_' + d, 13, 13, ctrl, ink_icon(ARROWS[d]), 'D-pad arrow key.')
    trio('zoom_in', 13, 13, ctrl, ink_icon(GLYPH_PLUS), 'Zoom in (+).')
    trio('zoom_out', 13, 13, ctrl, ink_icon(GLYPH_MINUS), 'Zoom out (-).')
    trio('fit', 13, 13, ctrl, ink_icon(GLYPH_FIT), 'Fit whole office to screen.')
    trio('run', 26, 16, ramp_accent('workspace'), text_icon('RUN'), 'RUN (hold), workspace green.')
    trio('gallery', 20, 18, ramp_accent('lounge'), gallery_icon, 'Gallery, icon only, lounge plum.')
    trio('talk', 20, 18, ramp_accent('library'), talk_icon, 'Talk, icon only, library oxblood.')
    trio('gallery_label', 46, 16, ramp_accent('lounge'), label_icon(gallery_icon, 'GALLERY'), 'Gallery with text label.')
    trio('talk_label', 36, 16, ramp_accent('library'), label_icon(talk_icon, 'TALK'), 'Talk with text label.')
    trio('close', 9, 10, ramp_accent('library'), ink_icon(["#.#", ".#.", "#.#"]), 'Panel close (x).')
    # D-pad base plate: arrows go at up(14,0) left(0,14) right(28,14) down(14,28)
    base = new(41, 41)
    for (x0, y0, x1, y1) in ((13, 0, 27, 40), (0, 13, 40, 27)):
        rect(base, x0, y0, x1, y1, c('floor_dk', 200))
    base = outline(base.crop((0, 0, 41, 41)), c('void')) if False else base
    shape = new(43, 43); paste(shape, base, 1, 1); shape = outline(shape, c('void')).crop((1, 1, 42, 42))
    # hub
    hub = disc(9, 'wall_lit', 'wall_shd', 'wall_top'); paste(shape, hub, 16, 16)
    save('buttons/dpad_base.png', shape, 'D-pad plate (translucent floor_dk + void outline). Arrow keys sit at up(14,0) left(0,14) right(28,14) down(14,28); 1px gutter.')
    comp = shape.copy()
    for d, (x, y) in {'up': (14, 0), 'left': (0, 14), 'right': (28, 14), 'down': (14, 28)}.items():
        paste(comp, out[('dpad_' + d, 'normal')], x, y)
    save('buttons/dpad_full_normal.png', comp, 'Convenience composite: base + 4 normal arrows.')
    comp2 = shape.copy()
    for d, (x, y) in {'up': (14, 0), 'left': (0, 14), 'right': (28, 14), 'down': (14, 28)}.items():
        paste(comp2, out[('dpad_' + d, 'pressed' if d == 'up' else 'normal')], x, y)
    save('samples/dpad_up_pressed_sample.png', comp2, 'Sample: up arrow pressed.')

# ================================================================ 3. panels
def panels():
    layers = [(c('void'), c('void')), (c('wall_top'), c('wall_shd')), (c('wall_lit'), c('wall_lit')),
              (c('wall_lit'), c('wall_lit')), (c('brass'), c('brass_shd')), (c('void'), c('void'))]
    src = bevel_box(24, 24, layers, c('floor_dk', AL['panel_fill']))
    for (x, y) in ((2, 2), (21, 2), (2, 21), (21, 21)):   # brass rivets in the corners
        px(src, x, y, c('brass_lt'))
    export9('panels', 'panel', src, (7, 7, 7, 7), 'Window/panel frame: wall bevel, 1px brass inlay, translucent floor_dk body @ %d/255.' % AL['panel_fill'])
    # header strip (3-slice) to lay over the top of a panel or use alone as a title bar
    hd = new(16, 11)
    rect(hd, 0, 0, 15, 10, c('void'))
    rect(hd, 1, 1, 14, 9, c('wall_lit'))
    for x in range(1, 15): px(hd, x, 1, c('wall_top')); px(hd, x, 9, c('wall_shd'))
    for y in range(1, 10): px(hd, 1, y, c('wall_top')); px(hd, 14, y, c('wall_shd'))
    for x in range(2, 14): px(hd, x, 8, c('brass_shd'))
    for (x, y) in ((0, 0), (15, 0), (0, 10), (15, 10)): px(hd, x, y, T)
    save('panels/panel_header.png', hd, 'Title bar, 3-slice horizontally: left cap 3px, stretch middle, right cap 3px. Title text baseline row 3, ink paper.')
    save('panels/panel_header_l.png', hd.crop((0, 0, 3, 11)), '3-slice piece', sheet=False)
    save('panels/panel_header_m.png', hd.crop((3, 0, 13, 11)), '3-slice piece', sheet=False)
    save('panels/panel_header_r.png', hd.crop((13, 0, 16, 11)), '3-slice piece', sheet=False)
    # divider
    dv = new(8, 2); rect(dv, 0, 0, 7, 0, c('void')); rect(dv, 0, 1, 7, 1, c('wall_lit'))
    save('panels/panel_divider.png', dv, 'Horizontal divider, tile/stretch horizontally.')
    return src, hd

# ================================================================ 4. status dots
STATUS = [('online', 'working', None), ('busy', 'error', 'bar'), ('away', 'wait_user', 'clock'),
          ('offline', 'idle', 'hollow'), ('working', 'working', 'spin'), ('thinking', 'wait_bot', 'dots')]
SPIN = [(4, 1), (6, 2), (7, 4), (6, 6), (4, 7), (2, 6), (1, 4), (2, 2)]

def status_dot(colk, glyph, frame=0):
    if glyph == 'hollow':
        im = disc(9, 'wall_shd', None, None)
        ring = disc(9, colk, None, None)
        for y in range(9):
            for x in range(9):
                if ring.getpixel((x, y))[3] and im.getpixel((x, y)) != c('void') and ((x - 4) ** 2 + (y - 4) ** 2) >= 7:
                    im.putpixel((x, y), c(colk))
        return im
    im = disc(9, colk, colk + ':shade', 'paper')
    ink = c(colk + ':dark')
    if glyph == 'bar':
        rect(im, 2, 4, 6, 4, c('paper'))
        px(im, 2, 2, c(colk)); px(im, 3, 2, c(colk)); px(im, 2, 3, c(colk))
    elif glyph == 'clock':
        for p in ((4, 2), (4, 3), (4, 4), (5, 4), (6, 4)): px(im, *p, ink)
    elif glyph == 'spin':
        px(im, 2, 2, c(colk)); px(im, 3, 2, c(colk)); px(im, 2, 3, c(colk))
        for k in range(3):
            x, y = SPIN[(frame + k) % 8]
            px(im, x, y, c('paper') if k == 2 else c(colk + ':light'))
        px(im, 4, 4, ink)
    elif glyph == 'dots':
        px(im, 2, 2, c(colk)); px(im, 3, 2, c(colk)); px(im, 2, 3, c(colk))
        for k, x in enumerate((2, 4, 6)):
            px(im, x, 4, c('paper') if k == frame % 3 else ink)
    return im

def status():
    for name, colk, g in STATUS:
        save('status/dot_%s.png' % name, status_dot(colk, g), 'Status dot, %s (%s).' % (name, PAL['colors'][colk]))
        pip = disc(5, colk, None, None)
        px(pip, 1, 1, c('paper')) if g != 'hollow' else None
        if g == 'hollow': px(pip, 2, 2, c('wall_shd'))
        save('status/pip_%s.png' % name, pip, 'Small 5px pip for name tags.')
    for f in range(8):
        save('status/dot_working_anim_f%d.png' % f, status_dot('working', 'spin', f), 'Working spinner, 8 frames @ ~100 ms.', sheet=(f < 4))
    for f in range(3):
        save('status/dot_thinking_anim_f%d.png' % f, status_dot('wait_bot', 'dots', f), 'Thinking dots, 3 frames @ ~300 ms.')

# ================================================================ 5. handoff envelope
def env_closed():
    W_, O, g, e = c('paper'), c('void'), c('cool_grey'), c('gallery')
    im = new(17, 12); rect(im, 0, 0, 16, 11, O); rect(im, 1, 1, 15, 10, W_)
    for x in range(1, 16): px(im, x, 10, e)
    for y in range(1, 11): px(im, 15, y, e)
    d = ImageDraw.Draw(im)
    d.line([(1, 9), (6, 6)], fill=e); d.line([(15, 9), (10, 6)], fill=g)
    d.line([(1, 1), (8, 6)], fill=g); d.line([(15, 1), (8, 6)], fill=g)
    for p, k in (((8, 5), 'brass_lt'), ((7, 6), 'brass'), ((8, 6), 'glow'), ((9, 6), 'brass'), ((8, 7), 'brass_shd'), ((7, 7), 'brass_shd'), ((9, 7), 'brass_shd')):
        px(im, *p, c(k))
    return im

def icons():
    cl = env_closed(); save('icons/envelope_closed.png', cl, 'Handoff envelope, sealed with brass wax.')
    W_, O, g, e = c('paper'), c('void'), c('cool_grey'), c('gallery')
    op = new(17, 18); d = ImageDraw.Draw(op)
    d.polygon([(0, 6), (8, 0), (16, 6)], fill=e, outline=O)          # open flap (inside)
    rect(op, 0, 6, 16, 17, O); rect(op, 1, 7, 15, 16, c('cool_grey'))  # envelope back
    rect(op, 3, 3, 13, 12, O); rect(op, 4, 4, 12, 12, W_)              # letter
    for y in (6, 8, 10): rect(op, 6, y, 10 if y != 10 else 8, y, g)
    px(op, 5, 6, c('brass')); px(op, 5, 8, c('brass')); px(op, 5, 10, c('brass'))
    front = new(17, 9); rect(front, 0, 0, 16, 8, O); rect(front, 1, 1, 15, 7, W_)
    for x in range(1, 16): px(front, x, 7, e)
    dd = ImageDraw.Draw(front); dd.line([(1, 1), (8, 5)], fill=g); dd.line([(15, 1), (8, 5)], fill=g)
    px(front, 0, 0, O); px(front, 16, 0, O)
    paste(op, front, 0, 9)
    save('icons/envelope_open.png', op, 'Handoff envelope, opened, letter showing (received / read).')
    # handoff: closed envelope + arrow
    ho = new(22, 14); paste(ho, cl, 0, 0)
    arrow = ascii_img(["....o...", "....oo..", "ooooolo.", "oLLLLllo", "olllllo.", "ooooolo.".replace('l', 'o', 0), "....oo..", "....o..."][:0] or
                      ["....o..", "....oo.", "oooooLo", "oLLLLLL", "olllllo", "oooooo.", "....o.."], {'o': O, 'L': c('wait_bot'), 'l': c('coordination')})
    arrow = ascii_img(["....oo...", "....oLo..", "ooooolLo.", "oLLLLLlLo", "olllllllo", "ooooollo.", "....olo..", "....oo..."],
                      {'o': O, 'L': c('wait_bot'), 'l': c('coordination')})
    paste(ho, arrow, 13, 6)
    save('icons/envelope_handoff.png', ho, 'Handoff in transit: sealed envelope + arrow (wait-for-bot blue).')
    mini = ascii_img(["ooooooooo", "ogWWWWWgo", "oWgWWWgWo", "oWWgBgWWo", "oWWWWWWWo", "ooooooooo"],
                     {'o': O, 'W': W_, 'g': g, 'B': c('brass')})
    save('icons/envelope_mini.png', mini, 'Mini envelope for name tags / activity rows.')
    return cl, op, ho, mini

# ================================================================ 6. emotes (all on a 15x15 canvas)
EM = 15
def emotes():
    O, W_ = c('void'), c('paper')
    heart = ascii_img(["..ooo.ooo..", ".oWRRoRRRo.", "oWRRRRRRRDo", "oRRRRRRRRDo", "oRRRRRRRRDo", ".oRRRRRRDo.",
                       "..oRRRRDo..", "...oRRDo...", "....oDo....", ".....o....."],
                      {'o': O, 'W': W_, 'R': c('error'), 'D': c('library')})
    save('emotes/heart.png', pad(heart, EM, EM), 'Heart.')
    drop = ascii_img(["...o...", "..oBo..", "..oBo..", ".oBBBo.", ".oWBBo.", "oWBBBSo", "oWBBBSo", "oBBBBSo", ".oBBSo.", "..ooo.."],
                     {'o': O, 'W': W_, 'B': c('wait_bot'), 'S': c('coordination')})
    save('emotes/sweat_drop.png', pad(drop, EM, EM), 'Sweat drop.')
    sp0 = ascii_img([".....o.....", "....oGo....", "....oGo....", "...oGWYo...", ".ooGWWWYoo.", "oGGWWWWWYYo",
                     ".ooGWWWYoo.", "...oGWYo...", "....oYo....", "....oYo....", ".....o....."],
                    {'o': O, 'G': c('glow'), 'Y': c('brass_lt'), 'W': W_})
    small = ascii_img(["..o..", ".oGo.", "oGWYo", ".oYo.", "..o.."], {'o': O, 'G': c('glow'), 'Y': c('brass_lt'), 'W': W_})
    tiny = ascii_img([".o.", "oGo", ".o."], {'o': O, 'G': c('glow')})
    f0 = new(EM, EM); paste(f0, sp0, 2, 2); paste(f0, tiny, 11, 0)
    f1 = new(EM, EM); paste(f1, small, 3, 4); paste(f1, sp0.resize((11, 11)), 2, 2) if False else None
    paste(f1, small, 1, 1); paste(f1, small, 9, 8); paste(f1, tiny, 11, 1); paste(f1, tiny, 2, 11)
    save('emotes/sparkle.png', f0, 'Sparkle (static = frame 0).')
    save('emotes/sparkle_anim_f0.png', f0, 'Sparkle twinkle, 2 frames @ ~250 ms.', sheet=False)
    save('emotes/sparkle_anim_f1.png', f1, 'Sparkle twinkle frame 1.')
    # typing / thinking "..."
    def dots_bubble(active, thought=False):
        im = new(EM, EM)
        body = bevel_box(15, 9, [(O, O)], W_)
        replace(im, body, 0, 1)
        for k, x in enumerate((3, 6, 9)):
            col = O if (active is None or k == active) else c('cool_grey')
            rect(im, x, 4, x + 2 - 1, 5, col)
        if thought:
            replace(im, ascii_img([".oo.", "oWWo", "oWWo", ".oo."], {'o': O, 'W': W_}), 3, 10)
            replace(im, ascii_img(["oo", "oo"], {'o': O}), 1, 13)
        else:
            tail = ascii_img(["oWWo", "oWo.", "oo..", "o..."], {'o': O, 'W': W_}); replace(im, tail, 3, 9)
        return im
    save('emotes/typing.png', dots_bubble(None), "'...' typing (static).")
    for f in range(3):
        save('emotes/typing_anim_f%d.png' % f, dots_bubble(f), "'...' typing, 3 frames @ ~250 ms.")
    save('emotes/thinking.png', dots_bubble(None, True), "'...' thinking (thought tail, static).")
    for f in range(3):
        save('emotes/thinking_anim_f%d.png' % f, dots_bubble(f, True), "'...' thinking, 3 frames @ ~350 ms.", sheet=False)
    # laugh: tears of joy face
    lf = disc(13, 'glow', 'brass_lt', 'paper')
    for p in ((3, 5), (4, 4), (5, 5), (7, 5), (8, 4), (9, 5)): px(lf, *p, O)
    for x in range(3, 10): px(lf, x, 7, O)
    px(lf, 3, 8, O); px(lf, 9, 8, O); rect(lf, 4, 8, 8, 8, c('library')); px(lf, 4, 9, O); px(lf, 8, 9, O)
    rect(lf, 5, 9, 7, 9, c('error')); rect(lf, 5, 10, 7, 10, O)
    lau = new(EM, EM); paste(lau, lf, 1, 1)
    for p in ((1, 6), (1, 7), (13, 6), (13, 7)): px(lau, *p, c('wait_bot'))
    px(lau, 0, 8, O); px(lau, 1, 8, c('coordination')); px(lau, 13, 8, c('coordination')); px(lau, 14, 8, O)
    save('emotes/laugh.png', lau, 'Laugh (tears of joy).')
    # handshake: two blocky hands, contrasting 3px cuffs carry the read, one skin_mid shadow row, no fingers
    hs = ascii_img(["......ooo......", "ooooooLLLoooooo", "oCCCLLLLLLLPPPo", "oCCCLLLLLLLPPPo", "oCCCLLLLLLLPPPo",
                    "oCCCMMMMMMMPPPo", "ooooooooooooooo"],
                   {'o': O, 'C': c('coordination'), 'P': c('lounge'), 'L': c('skin_lt'), 'M': c('skin_mid')})
    save('emotes/handshake_hands_alt.png', pad(hs, EM, EM), 'Alternate (not shipped): blocky hands, coordination cuff left, lounge cuff right. Did not read at 1x.')
    chk = disc(13, 'working', 'working:shade', 'working:hilite')
    for p in ((3, 6), (4, 7), (5, 8), (6, 7), (7, 6), (8, 5), (9, 4)): px(chk, *p, c('paper'))
    ck = new(EM, EM); paste(ck, chk, 1, 1)
    save('emotes/handshake.png', ck, 'Handshake / handoff accepted (shipped): AD fallback, working disc + 1px paper check.')

# ================================================================ 7. moods (15x15, disc + expression + glyph)
MOODS = {
    'focused': ('coordination:light', ["eyes_flat", "brow_flat", "mouth_flat"], None),
    'tired': ('idle', ["eyes_lid", "mouth_o"], 'z'),
    'happy': ('glow', ["eyes_dot", "mouth_smile"], None),
    'curious': ('working', ["eyes_curious", "mouth_small"], '?'),
    'calm': ('lounge:light', ["eyes_closed", "mouth_soft"], None),
    'mildly_frustrated': ('sharing', ["eyes_low", "brow_angry2", "mouth_flat_off"], 'steam'),
    'relieved': ('wait_bot', ["eyes_closed_up", "mouth_smile_small"], 'puff'),
    'mildly_anxious': ('wait_user', ["eyes_dot", "brow_worried", "mouth_zigzag"], 'drop2'),
}
def mood_icon(name):
    colk, feats, glyph = MOODS[name]
    im = new(15, 15); bk = colk.split(':')[0]; face = disc(13, colk, bk + ':shade', bk + ':hilite'); paste(im, face, 1, 1)
    O = c('void'); ink = O
    P = lambda pts: [px(im, x, y, ink) for (x, y) in pts]
    for f in feats:
        if f == 'eyes_flat': P([(4, 6), (5, 6), (6, 6), (8, 6), (9, 6), (10, 6)]); P([(5, 7), (9, 7)])
        if f == 'brow_flat': P([(4, 4), (5, 4), (6, 4), (8, 4), (9, 4), (10, 4)])
        if f == 'mouth_flat': P([(6, 10), (7, 10), (8, 10)])
        if f == 'eyes_lid': P([(4, 7), (5, 7), (6, 7), (8, 7), (9, 7), (10, 7)])
        if f == 'eyes_low': P([(5, 7), (5, 8), (9, 7), (9, 8)])
        if f == 'brow_angry2': P([(4, 4), (5, 5), (9, 5), (10, 4)])
        if f == 'mouth_flat_off': P([(7, 10), (8, 10), (9, 10)])
        if f == 'mouth_zigzag': P([(5, 10), (6, 9), (7, 10), (8, 9), (9, 10)])
        if f == 'mouth_o': P([(7, 10), (6, 11), (8, 11), (7, 12)]) if False else P([(6, 10), (7, 10), (6, 11), (7, 11)])
        if f == 'eyes_dot': P([(5, 5), (5, 6), (9, 5), (9, 6)])
        if f == 'mouth_smile': P([(4, 9), (5, 10), (6, 10), (7, 10), (8, 10), (9, 10), (10, 9)])
        if f == 'eyes_curious': P([(4, 5), (5, 5), (4, 6), (5, 6), (9, 6)]); P([(3, 3), (4, 3), (5, 3)])
        if f == 'mouth_small': P([(7, 10), (8, 10)])
        if f == 'eyes_closed': P([(4, 6), (5, 7), (6, 6), (8, 6), (9, 7), (10, 6)])
        if f == 'mouth_soft': P([(6, 10), (7, 10), (8, 10)]); P([(5, 9), (9, 9)]) if False else None
        if f == 'brow_angry': P([(4, 3), (5, 4), (9, 4), (10, 3)])
        if f == 'mouth_wobble': P([(5, 10), (6, 9), (7, 10), (8, 9), (9, 10)])
        if f == 'eyes_closed_up': P([(4, 6), (5, 5), (6, 6), (8, 6), (9, 5), (10, 6)])
        if f == 'mouth_smile_small': P([(5, 9), (6, 10), (7, 10), (8, 10), (9, 9)])
        if f == 'brow_worried': P([(4, 4), (5, 3), (9, 3), (10, 4)])
    if name == 'calm':
        px(im, 3, 8, c('lounge:hilite')); px(im, 4, 8, c('lounge:hilite')); px(im, 10, 8, c('lounge:hilite')); px(im, 11, 8, c('lounge:hilite'))
    if glyph == 'z':
        z = ascii_img(["oooo.", "oWWo.", "ooWoo", ".oWWo", ".oooo"][:0] or ["ooooo", "oWWWo", "ooWoo", "oWooo", "oWWWo", "ooooo"],
                      {'o': O, 'W': c('paper')}); replace(im, z, 10, 0)
    if glyph == '?':
        q = ascii_img(["ooooo", "oWWWo", "oooWo", ".oWWo", ".oooo", ".oWo.", ".ooo."], {'o': O, 'W': c('paper')}); replace(im, q, 10, 0)
    if glyph == 'vein':
        v = ascii_img([".o.o.", "oRoRo", ".o.o.", "oRoRo", ".o.o."], {'o': O, 'R': c('error')})
        v = ascii_img([".ooo.", "oRoRo", "ooooo", "oRoRo", ".ooo."], {'o': O, 'R': c('error')}); replace(im, v, 10, 0)
    if glyph == 'drop':
        d = ascii_img([".o..", "oBo.", "oBBo", "oWBo", ".oo."], {'o': O, 'B': c('wait_bot'), 'W': c('paper')}); replace(im, d, 11, 2)
    if glyph == 'steam':
        st = ascii_img([".oo..", "oWWo.", ".oWWo", "..oo."], {'o': O, 'W': c('paper')}); replace(im, st, 10, 0)
    if glyph == 'drop2':
        d = ascii_img([".o.", "oBo", "oBo", ".o."], {'o': O, 'B': c('wait_bot')}); replace(im, d, 11, 1)
    if glyph == 'puff':
        pf = ascii_img([".ooo.", "oWWWo", "oWWWo", ".ooo."], {'o': O, 'W': c('paper')})
        replace(im, pf, 10, 10); px(im, 10, 9, T) if False else None
    return im

def moods():
    for n in MOODS:
        save('moods/mood_%s.png' % n, mood_icon(n), 'Mood: %s (disc `%s`).' % (n.replace('_', ' '), MOODS[n][0]))

# ================================================================ 8. gallery frames
FRAME_SIZES = {'md': (56, 40), 'sm': (32, 24)}
INNER = {}

def frame_front(style, size):
    W, H = FRAME_SIZES[size]; md = size == 'md'
    top = 3 if style == 'ornate_gold' else 0
    im = new(W, H + top)
    if style == 'ornate_gold':   # AD fix: brass base, brass_shd shadows, brass_lt only top-left; md thinned by 1px
        L = [('void', 'void'), ('brass_lt', 'brass_shd'), ('brass', 'brass'), ('brass_shd', 'brass'), ('brass_shd', 'brass_shd')]
        if not md: L = [('void', 'void'), ('brass_lt', 'brass_shd'), ('brass', 'brass'), ('brass_shd', 'brass_shd')]
    elif style == 'simple_wood':
        L = [('void', 'void'), ('walnut_lt', 'walnut_dk'), ('walnut', 'walnut'), ('walnut', 'walnut'), ('walnut_dk', 'walnut_dk')]
        if not md: L = [('void', 'void'), ('walnut_lt', 'walnut_dk'), ('walnut_dk', 'walnut_dk')]
    else:  # modern_black, AD fix: 1px gallery mat (no paper)
        L = [('void', 'void'), ('wall_shd', 'floor_dk'), ('floor_dk', 'floor_dk'), ('floor_dk', 'floor_dk'), ('gallery', 'gallery')]
        if not md: L = [('void', 'void'), ('wall_shd', 'floor_dk'), ('gallery', 'gallery')]
    b = len(L)
    box = bevel_box(W, H, [(c(a), c(bb)) for a, bb in L], T, round_corner=(style != 'modern_black'))
    if style == 'ornate_gold':
        # AD fix 2: brass_lt only on the 1px top-left edge (layer 1); no brass_lt beads
        for (cx, cy) in ((2, 2), (W - 3, 2), (2, H - 3), (W - 3, H - 3)):   # corner ornaments, 1px glow specular each
            for (dx, dy) in ((1, 0), (0, 1)): px(box, cx + dx, cy + dy, c('brass_shd'))
            px(box, cx, cy, c('glow'))
    if style == 'simple_wood':   # mitre joints + grain
        for k in range(1, b - 1):
            for (x, y) in ((k, k), (W - 1 - k, k), (k, H - 1 - k), (W - 1 - k, H - 1 - k)):
                px(box, x, y, c('walnut_dk'))
        for x in range(4, W - 5, 7):
            px(box, x, 2, c('walnut_dk')); px(box, x + 1, 2, c('walnut_dk'))
            if md: px(box, x + 3, 3, c('walnut_dk')); px(box, x + 4, H - 4, c('walnut_dk'))
            px(box, x + 2, H - 3, c('walnut_dk'))
        for y in range(4, H - 5, 6):
            px(box, 2, y, c('walnut_dk')); px(box, W - 3, y + 2, c('walnut_dk'))
    if style == 'modern_black':
        px(box, 1, 1, c('wall_top'))   # single specular
    replace(im, box, 0, top)
    if style == 'ornate_gold':   # small crest, brass only
        cx = W // 2
        crest = ascii_img(["..ooo..", ".oBBBo.", "oBBBBSo"], {'o': c('void'), 'B': c('brass'), 'S': c('brass_shd')})
        replace(im, crest, cx - 3, 0)
        for x in range(cx - 2, cx + 3): px(im, x, top, c('brass'))
    return im, (b, top + b, W - 2 * b, H - 2 * b), top

DARKEST = {'ornate_gold': 'brass_shd', 'simple_wood': 'walnut_dk', 'modern_black': 'void'}

def add_depth(fr, inner, top, style, n, side):
    """AD fix: return edge of n px on the bottom + `side` ('right'/'left'), in the frame's darkest value,
    a void outline around it, then a 1px void@40% cast shadow below and right. Returns (img, mask)."""
    P = 4; W, H = fr.size
    im = new(W + 2 * P, H + 2 * P); replace(im, fr, P, 0)
    mask = new(im.width, im.height); ix, iy, iw, ih = inner
    rect(mask, ix + P, iy, ix + P + iw - 1, iy + ih - 1, (255, 255, 255, 255))
    S = lambda x, y: 0 <= x < im.width and 0 <= y < im.height and im.getpixel((x, y))[3] > 0
    inn = lambda x, y: 0 <= x < im.width and 0 <= y < im.height and mask.getpixel((x, y))[3] > 0
    ret = c(DARKEST[style]); pts = set()
    x0, x1, y0, y1 = P, P + W - 1, top, H - 1          # frame rect (without crest)
    for x in range(x0 + 1, x1 + (n if side == 'right' else 0) + 1):     # bottom return
        for k in range(1, n + 1): pts.add((x - (n if side == 'left' else 0) if False else x, y1 + k))
    if side == 'left':
        pts = {(x - n, y) for (x, y) in pts}
    for y in range(y0 + 1, y1 + n + 1):                                  # side return
        for k in range(1, n + 1): pts.add((x1 + k, y) if side == 'right' else (x0 - k, y))
    if side == 'right': pts.discard((x1 + n, y1 + n))
    else: pts.discard((x0 - n, y1 + n))
    for p in pts:
        if not S(*p) and not inn(*p): px(im, *p, ret)
    if style != 'modern_black':   # outline the return (black frames: return is already void)
        ol = set()
        for (x, y) in pts:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = (x + dx, y + dy)
                if not S(*q) and not inn(*q) and q not in pts: ol.add(q)
        for q in ol: px(im, *q, c('void'))
    sh = c('void', 102); snap = im.copy()
    Sn = lambda x, y: 0 <= x < snap.width and 0 <= y < snap.height and snap.getpixel((x, y))[3] > 0
    for y in range(im.height):
        for x in range(im.width):
            if Sn(x, y) or inn(x, y): continue
            if (Sn(x, y - 1) and not inn(x, y - 1) and y - 1 > top) or (Sn(x - 1, y) and not inn(x - 1, y) and y > top + 1):
                px(im, x, y, sh)
    return im, mask

def shear(im, mode):
    """2:1 iso shear. 'back' = wall descends to the right (y += x//2); 'side' = wall rises to the right."""
    if mode == 'front': return im
    W, H = im.size; off = lambda x: x // 2 if mode == 'back' else (W - 1 - x) // 2
    out = new(W, H + (W - 1) // 2)
    for x in range(W):
        for y in range(H):
            p = im.getpixel((x, y))
            if p[3]: out.putpixel((x, y + off(x)), p)
    return out

def frames():
    for style in ('ornate_gold', 'simple_wood', 'modern_black'):
        for size in ('md', 'sm'):
            fr, inner, top = frame_front(style, size)
            base = 'frame_%s_%s' % (style, size)
            for mode in ('front', 'back', 'side'):
                n = 1 if (mode == 'front' or size == 'sm') else 2
                im, mask = add_depth(fr, inner, top, style, n, 'left' if mode == 'side' else 'right')
                im, mask = shear(im, mode), shear(mask, mode)
                bb = im.getbbox(); im, mask = im.crop(bb), mask.crop(bb)
                mb = mask.getbbox(); name = '%s_%s' % (base, 'front' if mode == 'front' else 'wall_' + mode)
                if mode == 'front':
                    rx, ry, rw, rh = mb[0], mb[1], mb[2] - mb[0], mb[3] - mb[1]
                    note = 'Front-facing, %dpx return + 1px cast shadow. Inner (transparent) rect x=%d y=%d w=%d h=%d.' % (n, rx, ry, rw, rh)
                    INNER[name] = dict(x=rx, y=ry, w=rw, h=rh, size=im.size)
                else:
                    xl, xr = mb[0], mb[2] - 1
                    col = lambda x: [y for y in range(mask.height) if mask.getpixel((x, y))[3]]
                    corners = [(xl, min(col(xl))), (xr, min(col(xr))), (xr, max(col(xr))), (xl, max(col(xl)))]
                    sh = 'x//2' if mode == 'back' else '(W-1-x)//2'
                    note = ('Iso, %s wall (%s), %dpx return (bottom + %s) + 1px cast shadow. Inner parallelogram TL,TR,BR,BL = %s.'
                            % (mode, 'descends to the right' if mode == 'back' else 'rises to the right', n, 'right' if mode == 'back' else 'left',
                               ' '.join('(%d,%d)' % p for p in corners)))
                    INNER[name] = dict(corners=corners, size=im.size, shear=sh, src_rect=(inner[0], inner[1], inner[2], inner[3]))
                if style == 'ornate_gold': note += ' Gallery featured pieces only.'
                save('frames/%s.png' % name, im, note)
                save('frames/masks/%s_inner.png' % name, mask, 'Inner-area mask (white = artwork).', sheet=False)

# ================================================================ font sheet
def font_sheet():
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 .,!?:-+/'()*@\u00b7<>=_#&%"
    t = text_img(chars, c('paper'))
    im = new(t.width + 4, t.height + 4); rect(im, 0, 0, im.width - 1, im.height - 1, c('floor_dk')); paste(im, t, 2, 2)
    save('font/raka3x5_specimen.png', im, 'Bitmap font specimen (font.py). 5px cap height, 1px spacing, caps only.')

# ================================================================ samples (assembled examples)
def samples(bl, bd, nt, td, tl, tt, tdd, ntl, panel_src, hd):
    # speech bubble with text
    lines = ["HI! WANT TO SEE", "MY NEW SKETCH?"]
    w = max(font.width(l) for l in lines) + 8; h = len(lines) * 7 + 5
    b = bubble_with_tail(bl, (3, 3, 3, 3), td, w, h, w // 2 - 3, 3)
    for i, l in enumerate(lines): font.draw(b, 4, 3 + i * 7, l, c('void'))
    save('samples/bubble_light_sample.png', b, 'Assembled: bubble_light + tail_down + text.')
    b2 = bubble_with_tail(bl, (3, 3, 3, 3), tt, 46, 12, 6, 3); font.draw(b2, 4, 3, "HMM...", c('void'))
    save('samples/bubble_thought_sample.png', b2, 'Assembled: bubble_light + tail_thought.')
    b3 = bubble_with_tail(bl, (3, 3, 3, 3), tl, 50, 12, 3, 3); font.draw(b3, 4, 3, "ON MY WAY!", c('void'))
    save('samples/bubble_left_sample.png', b3, 'Assembled: bubble_light + tail_left.')
    t1 = "WAITING FOR A BOT"; w = font.width(t1) + 18
    d = bubble_with_tail(bd, (3, 3, 3, 3), tdd, w, 13, w // 2 - 3, 3)
    paste(d, status_dot('wait_bot', 'dots', 0), 3, 2); font.draw(d, 14, 4, t1, c('paper'))
    save('samples/bubble_dark_sample.png', d, 'Assembled: bubble_dark + tail + status dot.')
    name, role = "BIMA", "ART DIRECTOR"; w = font.width(name) + font.width(role) + 4 + 4 + 8
    n = bubble_with_tail(nt, (2, 2, 2, 2), ntl, w, 11, w // 2 - 2, 2)
    paste(n, disc(5, 'working', None, None), 3, 3); px(n, 4, 4, c('paper'))
    x = font.draw(n, 10, 3, name, c('paper')); font.draw(n, x + 3, 3, role, c('cool_grey'))
    save('samples/nametag_sample.png', n, 'Assembled: nametag + tail + pip + name/role.')
    p = assemble9(panel_src, (7, 7, 7, 7), 120, 60)
    hh = new(120, 11); replace(hh, hd.crop((0, 0, 3, 11)), 0, 0); replace(hh, hd.crop((3, 0, 13, 11)).resize((114, 11), Image.NEAREST), 3, 0); replace(hh, hd.crop((13, 0, 16, 11)), 117, 0)
    font.draw(hh, 5, 3, "ACTIVITY", c('paper')); replace(p, hh, 0, 0)
    for i, (dot, txt) in enumerate((('working', 'BIMA  REVIEWING FRAMES'), ('wait_user', 'ELLEN  WAITING FOR USER'), ('wait_bot', 'RAKA  HANDOFF SENT'), ('idle', 'NADIA  IDLE'))):
        y = 16 + i * 9; paste(p, disc(5, dot, None, None), 9, y); font.draw(p, 17, y, txt, c('paper'))
    paste(p, env_closed().crop((0, 0, 17, 12)), 70, 42) if False else None
    save('samples/panel_sample.png', p, 'Assembled: panel 120x60 + header + rows.')

# ================================================================ contact sheet
def contact_sheet():
    S = 4; BG = c(PAL['contact_sheet_bg']); ink = c('paper'); dim = c('floor_dk')
    groups = ['bubbles', 'samples', 'buttons', 'panels', 'status', 'icons', 'emotes', 'moods', 'frames', 'font']
    MAXW = 2600; pad_ = 24; out_rows = []
    def lab(t, sc):
        im = text_img(t.upper(), ink, dim); return im.resize((im.width * sc, im.height * sc), Image.NEAREST)
    blocks = []
    for g in groups:
        items = [(r, im) for (r, im, gg, n, sh) in REG if gg == g and sh]
        if not items: continue
        cells = []
        for r, im in items:
            big = im.resize((im.width * S, im.height * S), Image.NEAREST)
            nm = os.path.basename(r)[:-4]
            if g == 'frames' and 'wall' in nm: nm = nm.replace('frame_', '')
            elif g == 'frames': nm = nm.replace('frame_', '')
            lb = lab(nm, 2)
            cw = max(big.width, lb.width) + pad_; ch = big.height + lb.height + 10 + pad_
            cell = new(cw, ch); paste(cell, big, (cw - big.width) // 2, 0); paste(cell, lb, (cw - lb.width) // 2, big.height + 8)
            cells.append(cell)
        rows, cur, cw_ = [], [], 0
        for cell in cells:
            if cur and cw_ + cell.width > MAXW: rows.append(cur); cur, cw_ = [], 0
            cur.append(cell); cw_ += cell.width
        rows.append(cur)
        blocks.append((g, rows))
    total_h = 40 + 30
    for g, rows in blocks: total_h += 40 + sum(max(c_.height for c_ in r) for r in rows) + 16
    sheet = Image.new('RGBA', (MAXW + 60, total_h), BG)
    title = lab("VIRTUAL OFFICE UI KIT + EMOTES  \u00b7  ALL AT 4X  \u00b7  PALETTE: BIMA AD V1", 4)
    paste(sheet, title, 30, 20); y = 20 + title.height + 30
    for g, rows in blocks:
        h = lab(g, 4); paste(sheet, h, 30, y); y += h.height + 14
        for r in rows:
            x = 30
            for cell in r: paste(sheet, cell, x, y); x += cell.width
            y += max(c_.height for c_ in r)
        y += 16
    sheet = sheet.crop((0, 0, sheet.width, y + 10))
    sheet.save(os.path.join(OUT, 'preview_sheet.png'))

# ================================================================ README
def readme():
    L = []
    A = L.append
    A('# Virtual Office · UI kit, emotes, mood icons, gallery frames')
    A('Owner: Raka (UI) · generated by `src/generate.py` · style per `art-direction/style-sheet.md` (Bima, v1).')
    A('')
    A('Native 1x pixel art, transparent PNG, no anti-aliasing, 1px dark outline, top-left light with 3 values. Every native file `name.png` has nearest-neighbour upscales `name@2x.png` and `name@4x.png` next to it. Contact sheet: `preview_sheet.png` (4x on `%s` %s).' % (PAL['contact_sheet_bg'], PAL['colors'][PAL['contact_sheet_bg']]))
    A('')
    A('## Re-render')
    A('```')
    A('cd assets/ui/src && python3 generate.py')
    A('```')
    A('Needs Python 3 + Pillow. Swap colours in `src/palette.json` (`colors`, `tints`, `alpha`) and re-run; the script wipes and rewrites the asset folders, the sheet and this README. Font glyphs live in `src/font.py`.')
    A('')
    A('## Palette')
    A('Source: **%s**.' % PAL['source'])
    A('')
    A('| Key | Hex |'); A('|---|---|')
    for k, v in PAL['colors'].items(): A('| `%s` | `%s` |' % (k, v))
    A('')
    A('### Derived tints (signed off by Bima, review.md 21 Oct 2026; new keys still need a quick AD check)')
    A('The room accents and status colours have one value each, so buttons, dots and mood discs use straight RGB mixes of an AD colour toward `paper` (lighten) or `void` (darken): ' +
      ', '.join('`%s` = %d%% toward %s' % (k, round(v[1] * 100), v[0]) for k, v in PAL['tints'].items() if not k.startswith('_')) +
      '. Signed off by Bima (review.md, 21 Oct 2026) with two rules: (1) warm hues (%s) lighten toward `%s` instead of paper; (2) `hilite` is capped at 40%% toward paper. Where rule 1 makes `glow:hilite` equal to `glow` itself, discs use a single 1px `paper` specular instead.' % (', '.join('`%s`' % k for k in PAL['warm']['keys']), PAL['warm']['lighten_toward']))
    A('')
    A('| Derived key | Hex |'); A('|---|---|')
    for k in sorted(DERIVED_USED): A('| `%s` | `%s` |' % (k, DERIVED_USED[k]))
    A('')
    A('Translucency (alpha out of 255): ' + ', '.join('`%s` = %d' % kv for kv in AL.items()) + '.')
    A('')
    A('## 9-slice insets')
    A('Insets are L,T,R,B in native px. Each source also ships as 9 pieces `<name>_{tl,t,tr,l,c,r,bl,b,br}.png`. Edges and centre are flat colour, so stretch or tile both work. In CSS: `border-image: url(<name>@2x.png) <inset*2> fill / <inset*2>px stretch; image-rendering: pixelated;`.')
    A('')
    A('| Source | Native size | Insets L,T,R,B |'); A('|---|---|---|')
    for k, ins in NINE.items():
        im = [i for (r, i, g, n, s) in REG if os.path.basename(r) == k + '.png'][0]
        A('| `%s.png` | %dx%d | %s |' % (k, im.width, im.height, ','.join(map(str, ins))))
    A('| `panel_header.png` | 16x11 | 3-slice: L 3, R 3 (pieces `_l`, `_m`, `_r`) |')
    A('')
    A('**Bubble tails.** `*_tail_*.png` are bottom-edge inserts, not overlays: their top rows (3 rows for bubbles, 2 for the name tag) reproduce the bottom edge with a gap. Build the bottom edge as `[bl][b stretched][tail][b stretched][br]`, so the tail sits flush and the translucent fill never doubles. See `samples/`.')
    A('')
    A('## D-pad layout')
    A('`dpad_base.png` (41x41) + 13x13 arrow keys at up (14,0), left (0,14), right (28,14), down (14,28). Button states share one canvas size; `pressed` moves the face down 2px (the 2px key-side disappears), so swapping states never shifts the layout.')
    A('')
    A('## Gallery frame inner rects')
    A('The inner area is fully transparent (alpha 0); put the artwork underneath, or composite it with the matching mask in `frames/masks/`. Wall variants are the front frame sheared on the 2:1 grid: `back` = wall descending to the right (the build\'s back wall, `y += x//2`), `side` = wall rising to the right (the build\'s side wall at c=22.7, `y += (W-1-x)//2`). To place art on a wall frame, scale it to the front inner rect, then apply the same column shear.')
    A('')
    A('| Frame | Canvas | Inner |'); A('|---|---|---|')
    for k, v in INNER.items():
        if 'x' in v: A('| `%s.png` | %dx%d | rect x=%d y=%d w=%d h=%d |' % (k, v['size'][0], v['size'][1], v['x'], v['y'], v['w'], v['h']))
        else: A('| `%s.png` | %dx%d | parallelogram TL,TR,BR,BL = %s (front rect %s, shear `y += %s`) |' % (k, v['size'][0], v['size'][1], ' '.join('(%d,%d)' % p for p in v['corners']), 'x=%d y=%d w=%d h=%d' % v['src_rect'], v['shear']))
    A('')
    A('## Frame usage and depth')
    A('- `ornate_gold` is for the Gallery\'s featured pieces only; everywhere else use `simple_wood` or `modern_black`.')
    A('- Depth per AD review: wall frames get a return edge (md 2px, sm 1px) in the frame\'s darkest value (`brass_shd`, `walnut_dk`, `void`) on the bottom + right (back wall) or bottom + left (side wall), outlined in void, plus a 1px `void` @ 40% (alpha 102) cast shadow below and right. Front frames get a 1px bottom + right return and the same shadow. Canvases and inner rects below include these.')
    A('')
    A('## Emote notes')
    A('- `emotes/handshake.png` ships as the AD fallback (working green disc + paper check). The cuffed-hands version is kept as `handshake_hands_alt.png`; at 1x it read as a bar, not hands.')
    A('')
    A('## Animation frames')
    A('- `status/dot_working_anim_f0..f7` spinner, ~100 ms/frame · `status/dot_thinking_anim_f0..f2` ~300 ms')
    A('- `emotes/typing_anim_f0..f2` ~250 ms · `emotes/thinking_anim_f0..f2` ~350 ms · `emotes/sparkle_anim_f0..f1` ~250 ms')
    A('')
    A('## Colour semantics')
    A('Status dots follow the AD UI semantics: online = working green, busy = error red (bar), away = waiting-for-user amber (clock), offline = idle grey (hollow ring), working = green with spinner, thinking = waiting-for-bot blue with dots. Buttons: RUN = workspace green, Gallery = lounge plum, Talk / close = library oxblood, camera and D-pad = wall greys.')
    A('')
    A('## Files (native size)')
    groups = {}
    for (r, im, g, n, s) in REG: groups.setdefault(g, []).append((r, im, n))
    for g, items in groups.items():
        A(''); A('### %s/ (%d files)' % (g, len(items))); A('')
        A('| File | Size | Notes |'); A('|---|---|---|')
        for r, im, n in items: A('| `%s` | %dx%d | %s |' % (r, im.width, im.height, n))
    A('')
    A('Total native PNGs: %d (each with @2x and @4x, %d files overall), plus `preview_sheet.png`.' % (len(REG), len(REG) * 3))
    open(os.path.join(OUT, 'README.md'), 'w').write('\n'.join(L) + '\n')

def main():
    for d in SUBDIRS:
        p = os.path.join(OUT, d)
        if os.path.isdir(p): shutil.rmtree(p)
    bl, bd, nt, td, tl, tt, tdd, ntl = bubbles()
    buttons(); panel_src, hd = panels(); status(); icons(); emotes(); moods(); frames(); font_sheet()
    samples(bl, bd, nt, td, tl, tt, tdd, ntl, panel_src, hd)
    contact_sheet(); readme()
    print('native assets:', len(REG))
    from collections import Counter
    print(Counter(g for (_, _, g, _, _) in REG))

if __name__ == '__main__':
    main()
