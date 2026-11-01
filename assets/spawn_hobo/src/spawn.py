"""Animasi spawn tunawisma (se; sw = cermin): bangun (rebah di dalam tenda) -> merangkak keluar -> berdiri -> peregangan -> menoleh."""
from chars import *
A = AB.A
def lie(char, expr, ragged=True, dy=0):
    L, pal = LAYERS[char]('idle', 0, 'se', expr)
    if ragged: L = rag(L, pal, 'se')
    order = ['shadow'] + LAYS
    imgs = {k: Image.fromarray(v) for k, v in L.items()}
    imgs['shadow'] = Image.fromarray(shadow())
    out = lv.lie_flat(imgs, 'se', 'lie')
    im = Image.new('RGBA', (FW, FH))
    for k in order:
        if k in out: im.alpha_composite(out[k])
    if dy: a = np.array(im); im = Image.fromarray(shift(a, 0, dy))
    return im
def pose(char, p, ragged=True):
    """p: d (jongkok px), lean, near/far = A(...) atau None (lengan generator), expr, look (geser wajah px)"""
    expr = p.get('expr', 'neutral'); L, pal = LAYERS[char]('idle', 0, 'se', expr)
    if ragged: L = rag(L, pal, 'se')
    look = p.get('look', 0)
    if look:
        for k in ('face', 'brows', 'glasses'):
            if k in L: L[k] = shift(L[k], look, 0)
    if p.get('near') is None and p.get('d', 0) == 0: return compose(L)
    d, lx = p.get('d', 0), p.get('lean', 0)
    sh0 = L['shirt']; tx0, tx1 = torso_cols(sh0, 67)
    legs = squat_legs(L, 'se', d)
    if ragged and legs['front'] is not None: legs['front'] = patch_pants(legs['front'], stitch=False)
    U = {k: shift(L[k], lx, d) for k in AB.UPPER if k in L}
    shc = U['shirt'].copy(); shc[:, :tx0 + lx] = 0; shc[:, tx1 + 1 + lx:] = 0; U['shirt'] = shc
    if 'body_front' in U:                                         # generator hands/arms (arms_down) removed: limb() redraws both arms
        bf = U['body_front'].copy(); bf[60 + d:, :] = 0; U['body_front'] = bf
    pl = rag_pal(pal) if ragged else pal
    SN, SF = (tx0 - 1.0 + lx, 57.5 + d), (tx1 + 1.5 + lx, 57.5 + d)
    def arm(S, a):
        E_, W, hk, hp, hd = a
        if E_ is None:
            ux, uy = hd; nn = math.hypot(ux, uy) or 1; W = (hp[0] - ux / nn * 1.6, hp[1] - uy / nn * 1.6)
            mx, my = (S[0] + W[0]) / 2, (S[1] + W[1]) / 2; L_ = math.hypot(W[0] - S[0], W[1] - S[1])
            bend = min(3.0, math.sqrt(max(0.0, 9.0 ** 2 - (L_ / 2) ** 2))); out = -1 if S[0] < 32 else 1
            vx, vy = (W[1] - S[1]) / (L_ or 1), -(W[0] - S[0]) / (L_ or 1)
            if vx * out < 0: vx, vy = -vx, -vy
            E_ = (mx + vx * bend, my + vy * bend)
        return limb(S, E_, W, hk, hp, hd, pl, CHARS[char])
    near = arm(SN, p['near']); far = arm(SF, p['far'])
    im = Image.fromarray(shadow())
    for k in ['hair_back', 'body', 'shoes', 'shoes_over', 'pants', 'LEGS', 'shirt', 'shirt_graphic', 'outer', 'acc', 'FAR', 'body_front', 'held', 'face', 'hair_front', 'glasses', 'brows', 'NEAR']:
        if k == 'LEGS': a = legs['front']
        elif k == 'FAR': a = far
        elif k == 'NEAR': a = near
        elif k in ('shoes', 'shoes_over'): a = L.get(k)
        elif k == 'pants': a = legs['pants']
        else: a = U.get(k)
        if a is not None: im.alpha_composite(Image.fromarray(a))
    return im
def up_arm(hp, hk='open', hd=(0, -1)): return A(None, None, hk, hp, hd)
# --------------------------------------------------------------- phases (se coords)
PH = {
 'bangun': [dict(lie='blink'), dict(lie='blink'), dict(lie='sleepy'), dict(lie='blink'), dict(lie='sleepy'), dict(lie='neutral', dy=-1)],
 'merangkak': [
  dict(d=12, lean=6, near=A(None, None, 'open', (38, 97), (.7, .3)), far=A(None, None, 'open', (52, 95), (.7, .3))),
  dict(d=12, lean=6, near=A(None, None, 'open', (41, 96), (.7, .3)), far=A(None, None, 'open', (50, 94), (.7, .3))),
  dict(d=12, lean=7, near=A(None, None, 'open', (43, 97), (.7, .3)), far=A(None, None, 'open', (53, 95), (.7, .3))),
  dict(d=12, lean=6, near=A(None, None, 'open', (39, 96), (.7, .3)), far=A(None, None, 'open', (55, 96), (.7, .3))),
  dict(d=12, lean=6, near=A(None, None, 'open', (41, 97), (.7, .3)), far=A(None, None, 'open', (52, 94), (.7, .3))),
  dict(d=12, lean=7, near=A(None, None, 'open', (44, 96), (.7, .3)), far=A(None, None, 'open', (54, 95), (.7, .3)))],
 'berdiri': [
  dict(d=12, lean=3, near=A(None, None, 'fist', (24, 87)), far=A(None, None, 'fist', (43, 87))),
  dict(d=11, lean=3, near=A(None, None, 'fist', (24, 86)), far=A(None, None, 'fist', (43, 86))),
  dict(d=8, lean=2, near=A(None, None, 'fist', (24, 84)), far=A(None, None, 'fist', (42, 84))),
  dict(d=5, lean=1, near=A(None, None, 'fist', (24, 80)), far=A(None, None, 'fist', (42, 80))),
  dict(d=2, lean=0, near=A(None, None, 'fist', (23, 75)), far=A(None, None, 'fist', (42, 75))),
  dict(d=0, lean=0, near=None, far=None)],
 'peregangan': [
  dict(d=0, near=A(None, None, 'fist', (27, 66)), far=A(None, None, 'fist', (38, 66))),
  dict(d=0, near=A(None, None, 'fist', (21, 50)), far=A(None, None, 'fist', (44, 50)), expr='neutral'),
  dict(d=0, near=up_arm((18, 42)), far=up_arm((47, 42)), expr='sleepy'),
  dict(d=0, near=up_arm((17, 40)), far=up_arm((48, 40)), expr='happy'),
  dict(d=0, near=up_arm((17, 39)), far=up_arm((48, 39)), expr='happy'),
  dict(d=0, near=A(None, None, 'open', (11, 57), (-1, 0)), far=A(None, None, 'open', (54, 57), (1, 0)), expr='smile'),
  dict(d=0, near=A(None, None, 'open', (17, 68), (-.4, 1)), far=A(None, None, 'open', (48, 68), (.4, 1)), expr='neutral'),
  dict(d=0, near=None, far=None, expr='neutral')],
 'menoleh': [dict(look=0), dict(look=-1), dict(look=-1, expr='surprised'), dict(look=0, flip=True), dict(look=-1, flip=True),
             dict(look=0), dict(look=1), dict(look=0, expr='smile')],
}
MS = {'bangun': [420, 320, 320, 260, 320, 380], 'merangkak': [140] * 6, 'berdiri': [150, 150, 140, 140, 140, 220],
      'peregangan': [150, 140, 140, 260, 260, 160, 140, 220], 'menoleh': [300, 240, 260, 260, 280, 220, 260, 340]}
ORDER_PH = ['bangun', 'merangkak', 'berdiri', 'peregangan', 'menoleh']
CRAWL_TILES = 1.45                                              # gerak akar total selama merangkak (tile, arah hadap)
def root_px(view, k, n=6):
    """offset akar (px, relatif posisi awal merangkak) per frame merangkak: se = +c (layar kanan-bawah), sw = +r (kiri-bawah)"""
    t = (k + 1) / n * CRAWL_TILES; dx = round(t * 32); dy = round(t * 16)
    return (dx if view == 'se' else -dx, dy)
def frame(char, ph, f, view='se', ragged=True):
    p = PH[ph][f]
    if ph == 'bangun':
        im = lie(char, p['lie'], ragged, p.get('dy', 0))
        a = np.array(im); m = (a[..., 3] > 0) & (a[..., 3] < 255); a[m] = (0, 0, 0, 56); im = Image.fromarray(a)   # bayangan rebah generator (alpha 46) -> 56
    else:
        im = pose(char, p, ragged)
        if p.get('flip'): im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im.transpose(Image.FLIP_LEFT_RIGHT) if view == 'sw' else im
