#!/usr/bin/env python3
"""Hangout loop: Gfunk + Yerbies + Theodore chatting. Transparent GIF / APNG / PNG frames, 4x nearest.
Uses only the existing sprites: frames/ idle + poses/ talk files, and the generators' own expression option
(make_*.frames(view,'idle',expr) / make_theodore.frame(view,'idle',i,expr)) pre-rendered into /tmp/npcparts by gen.py.
Bubbles: 1x pixel icons in the game's z-z colours (#ECF0F6 fill / #282E3C ink) + the existing red #E5484D."""
import os, numpy as np
from PIL import Image
B = 'assets'; P = '/tmp/npcparts'; OUT = f'{B}/npc_all'; S = 4; TICK = 100; N = 72
def L(p): return np.array(Image.open(p).convert('RGBA'))
def idle(who, v, e, i): return L(f'{P}/{who}_{v}_idle_{e}_f{i}.png')
def talk(who, v, i): return L(f'{B}/npc_{who}/poses/{who}_talk_{v}_f{i}.png')
INK, FILL, RED = (40, 46, 60, 255), (236, 240, 246, 255), (229, 72, 77, 255)
# 1x icons ('#'=ink, 'r'=red); drawn inside a 9x7 bubble
ICONS = {
 'dots1': ['     ', '     ', '#    '], 'dots2': ['     ', '     ', '# #  '], 'dots3': ['     ', '     ', '# # #'],
 'bang':  [' r ', ' r ', ' r ', '   ', ' r '],
 'q':     ['### ', '   #', ' ## ', '    ', ' #  '],
 'heart': ['rr rr', 'rrrrr', ' rrr ', '  r  '],
}
def bubble(icon, tail=0):
    w, h = 11, 9; a = np.zeros((h + 2, w, 4), np.uint8)
    for y in range(h):
        for x in range(w):
            corner = (x in (0, w - 1)) and (y in (0, h - 1))
            if corner: continue
            edge = x in (0, w - 1) or y in (0, h - 1) or ((x in (1, w - 2)) and (y in (1, h - 2)))
            a[y, x] = INK if edge else FILL
    a[1, 1] = a[1, w - 2] = a[h - 2, 1] = a[h - 2, w - 2] = INK
    tx = w // 2 + tail                                                 # 2px tail under the bubble
    a[h - 1, tx] = FILL; a[h - 1, tx + 1] = FILL if False else a[h - 1, tx + 1]
    a[h, tx] = INK; a[h - 1, tx] = FILL; a[h, tx - 1] = INK if tail < 0 else a[h, tx - 1]; a[h, tx + 1] = INK if tail >= 0 else a[h, tx + 1]
    a[h + 1, tx] = INK
    ic = ICONS[icon]; ih, iw = len(ic), len(ic[0]); ox, oy = (w - iw) // 2, (h - ih) // 2
    if icon.startswith('dots'): ox, oy = 3, 4
    for y, r in enumerate(ic):
        for x, c in enumerate(r):
            if c == '#': a[oy + y, ox + x] = INK
            if c == 'r': a[oy + y, ox + x] = RED
    return a
ANGER = np.zeros((5, 5, 4), np.uint8)                                  # small red cross-vein mark, no bubble
for x, y in ((1, 0), (3, 0), (0, 1), (4, 1), (0, 3), (4, 3), (1, 4), (3, 4), (1, 1), (3, 1), (1, 3), (3, 3)): ANGER[y, x] = RED

# layout on the 1x stage (frame top-left), Yerbies behind (pivot 9 px higher)
POS = {'yerbies': (42, 6), 'gfunk': (0, 21), 'theodore': (84, 21)}
SW, SH = 152, 136
def state(t):
    p = (t // 3) % 4                                                   # 300 ms per idle frame, like the sprite GIFs
    g = dict(v='se', e='neutral', talk=False, hop=0, fx=None)
    y = dict(v='se', e='neutral', talk=False, hop=0, fx=None)
    th = dict(v='sw', e='neutral', talk=False, hop=0, fx=None)
    if 6 <= t < 30: y['v'] = 'sw'                                      # Yerbies turns to Gfunk
    if 12 <= t < 30:                                                   # Gfunk talks
        g['talk'] = True; g['fx'] = 'dots%d' % (1 + (t // 2) % 3)
        if t >= 20: y['e'] = 'happy'
    if 30 <= t < 39:                                                   # Theodore reacts
        th['e'] = 'surprised'; th['fx'] = 'bang'; g['e'] = 'happy'; y['e'] = 'surprised'
    if 39 <= t < 51:                                                   # all laugh
        g['e'] = y['e'] = th['e'] = 'happy'
        g['hop'] = -((t // 2) % 2); y['hop'] = -(((t + 1) // 2) % 2); th['hop'] = -((t // 2) % 2) if t % 4 < 2 else 0
        if t >= 42: y['fx'] = 'heart'
    if 51 <= t < 61:                                                   # Yerbies grumpy at Gfunk, Gfunk confused
        y['v'] = 'sw'; y['e'] = 'angry'; y['fx'] = 'anger'
        if t >= 53: g['e'] = 'surprised'; g['fx'] = 'q'
    if 61 <= t < 64: y['v'] = 'sw'                                     # calm down, look back, idle to the loop start
    return p, {'gfunk': g, 'yerbies': y, 'theodore': th}

def render(t):
    p, st = state(t)
    stage = np.zeros((SH, SW, 4), np.uint8); figs = []
    for who in ('yerbies', 'gfunk', 'theodore'):
        s = st[who]
        a = talk(who, s['v'], p) if s['talk'] else idle(who, s['v'], s['e'], p)
        sh = a[..., 3] == 56; fg = a[..., 3] == 255
        x0, y0 = POS[who]
        reg = stage[y0:y0 + 112, x0:x0 + 64]
        reg[sh & (reg[..., 3] == 0)] = (0, 0, 0, 56)                   # shadows first (all, on the floor)
        figs.append((who, s, a, fg, x0, y0))
    for who, s, a, fg, x0, y0 in figs:
        y1 = y0 + s['hop']; reg = stage[y1:y1 + 112, x0:x0 + 64]; reg[fg] = a[fg]
        if s['fx']:
            ys, xs = np.nonzero(fg); top = ys.min(); head = xs[ys < top + 8].mean()
            if s['fx'] == 'anger':
                ic = ANGER; bx, by = int(head) + x0 + (8 if s['v'] == 'se' else -12), top + y1 + 2
            else:
                ic = bubble(s['fx']); bx = int(round(head)) + x0 - 5 + (4 if s['v'] == 'se' else -4); by = top + y1 - ic.shape[0] - 2
            h_, w_ = ic.shape[:2]; m = ic[..., 3] > 0; stage[by:by + h_, bx:bx + w_][m] = ic[m]
    return stage

if __name__ == '__main__':
    raw = [render(t) for t in range(N)]
    al = np.any([r[..., 3] > 0 for r in raw], 0); ys, xs = np.nonzero(al)
    cx0, cy0, cx1, cy1 = max(xs.min() - 2, 0), max(ys.min() - 2, 0), xs.max() + 3, ys.max() + 3
    raw = [r[cy0:cy1, cx0:cx1] for r in raw]; h, w = raw[0].shape[:2]
    up = lambda a: Image.fromarray(a).resize((w * S, h * S), Image.NEAREST)
    os.makedirs(f'{OUT}/hangout_frames', exist_ok=True)
    rgba = [up(r) for r in raw]
    for i, im in enumerate(rgba): im.save(f'{OUT}/hangout_frames/hangout_f{i:02d}.png')
    rgba[0].save(f'{OUT}/npc_hangout_4x.png', save_all=True, append_images=rgba[1:], duration=TICK, loop=0, disposal=1, blend=0)
    # GIF: 1-bit alpha; shadow (alpha 56) -> 1x checker dither of #10141B; index 0 = transparent; disposal 2 (restore bg)
    SHC = (16, 20, 27)
    pal = {}; idx = []
    for r in raw:
        a = r.copy(); yy, xx = np.mgrid[0:h, 0:w]; part = (a[..., 3] > 0) & (a[..., 3] < 255)
        on = part & (((xx + cx0) + (yy + cy0)) % 2 == 0)
        a[on] = (*SHC, 255); a[part & ~on] = 0
        ix = np.zeros((h, w), np.uint8)
        for y in range(h):
            for x in range(w):
                if a[y, x, 3] == 255:
                    c = tuple(a[y, x, :3]); ix[y, x] = pal.setdefault(c, len(pal) + 1)
        idx.append(ix)
    assert len(pal) < 256, len(pal)
    flat = [0, 0, 0] + [v for c in sorted(pal, key=pal.get) for v in c]; flat += [0] * (768 - len(flat))
    gif = []
    for ix in idx:
        im = Image.fromarray(ix, 'P').resize((w * S, h * S), Image.NEAREST); im.putpalette(flat); im.info['transparency'] = 0; gif.append(im)
    gif[0].save(f'{OUT}/npc_hangout_4x.gif', save_all=True, append_images=gif[1:], duration=TICK, loop=0, disposal=2,
                transparency=0, optimize=False)
    print('frame', w * S, 'x', h * S, '(1x', w, 'x', h, ')', N, 'frames @', TICK, 'ms =', N * TICK / 1000, 's; colours', len(pal))
