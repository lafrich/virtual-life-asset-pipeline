#!/usr/bin/env python3
"""Virtual Life - animasi 'ambil barang' (pickup, 9 frame) + 'cari barang' (rummage loop, 4 frame), v6b. PREVIEW ONLY.
Body / head / face / hair / glasses / shoes = the game's own v6b generator, untouched (only shifted, never compressed):
 - ichsan : the player sheet assets/chars/ichsan_v6b_sheet.png = live_v6b on v6b/live/chars/ichsan.json (idle f0 se/ne re-rendered
            here is pixel-identical to the game sheet; checked at build time)
 - npc    : a generic NPC through the npc_v6b.build path (../npc_pak_ogah/job_common.render)
Added: crouch (upper layers shifted down = 'geser, jangan kompres'), squat legs (pants ramp, left-lit), work arms with shoulder /
sleeve / elbow / forearm / hand (limb() of the babeh loak & kang parkir NPCs, not a 3 px tube), held item = item_temuan generator.
sw / nw = horizontal mirrors of se / ne (as the game sheet)."""
import os, sys, json, math
sys.path.insert(0, 'assets/npc_babeh_loak')
sys.path.insert(0, 'assets/item_temuan/_work')
from babeh_base import *                       # job_common: lv, nv, pv, FW, FH, shade, tube, disk, put, shadow, sheet, gif, strip, bbox, flipx, tones ...
from make_babeh_loak import limb, over
import job_common as JC
import render_items as RI, items as IT
OUT = os.path.dirname(os.path.abspath(__file__))
ICH = json.load(open('chars-iso/v6b/live/chars/ichsan.json'))
GAME_SHEET = 'game/assets/chars/ichsan_v6b_sheet.png'
NPC = dict(body='m', skin='medium', hair='short', hc='black', top='tee', tc='steel', pants='trousers', pc='charcoal', shoes='sneakers', sc='paper')
CHARS = {'ichsan': dict(top_style='tee'), 'npc': dict(top_style='tee')}
VIEWS = ('se', 'sw', 'ne', 'nw')
UPPER = ['hair_back', 'body', 'shirt', 'shirt_graphic', 'outer', 'acc', 'body_front', 'held', 'face', 'hair_front', 'glasses', 'brows']

# ------------------------------------------------------------------ generator layers
def ichsan_layers(view, expr='neutral'):
    C = ICH; O = C['outfits'][C['default_outfit']]; gl = C.get('glasses_default', False)
    se, pal = lv.build_char_layers(C, O); ne = lv.back_layers(se, C, O)
    for k in '01234': pal.setdefault('H' + k, lv.REFPAL[k])
    P = lv.pose_layers(se if view == 'se' else ne, 'idle', 0, view, C, O)
    for mk, mp in pal['_maps'].items(): P[mk] = lv.recolor(P[mk], mp)
    rg = {k: lv.to_img(v, pal) for k, v in P.items() if k not in ('face', 'brows', 'acc_head')}
    imgs = {k: np.array(v) for k, v in lv.frame_img(rg).items()}
    F, B, G = lv.face_layer(expr, C, view, 0, 0, gl, 0)
    fi = {k: np.array(v) for k, v in lv.frame_img({'f': lv.to_img(F, pal), 'b': lv.to_img(B, pal), 'g': lv.to_img(G, pal)}).items()}
    imgs['face'] = fi['f']; imgs['brows'] = fi['b']; imgs['glasses'] = fi['g']
    return imgs, pal
def npc_layers(view, expr='neutral'):
    imgs, pal, bob = JC.render(NPC, 'idle', 0, view, expr); return imgs, pal
LAYERS = {'ichsan': ichsan_layers, 'npc': npc_layers}
ORDER0 = ['hair_back', 'body', 'arm_far', 'shoes', 'pants', 'shoes_over', 'rips', 'shirt', 'shirt_graphic', 'outer', 'acc', 'arm_near', 'body_front', 'held', 'face', 'hair_front', 'glasses', 'brows']
def compose_idle(L):
    im = Image.fromarray(shadow())
    for k in ORDER0:
        if k in L: im.alpha_composite(Image.fromarray(L[k]))
    return im

# ------------------------------------------------------------------ helpers
def shift(a, dx, dy):
    o = np.zeros_like(a); H_, W_ = a.shape[:2]
    ys0, ys1 = max(0, dy), min(H_, H_ + dy); xs0, xs1 = max(0, dx), min(W_, W_ + dx)
    o[ys0:ys1, xs0:xs1] = a[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]; return o
def ramp5(cols):
    cols = list(cols)
    while len(cols) < 5: cols.append(cols[-1])
    if len(cols) > 5: cols = [cols[round(i * (len(cols) - 1) / 4)] for i in range(5)]
    return cols
def torso_cols(sh, y):
    xs = np.nonzero(sh[y, :, 3])[0]; return int(xs.min()), int(xs.max())

# ------------------------------------------------------------------ squat legs
ANK_Y = 95.0
DMAX = 12.0
def leg_masks(view, d, lat):
    """squat legs, pixel-art convention (as the generator's sit pose, no true foreshortening): hips sink by d, knees rise toward
    hip height and splay OUT past the torso, shins run from the knees back in to the (fixed) feet. t = d / DMAX"""
    t = min(1.0, d / DMAX); hipY = 75.0 + d; out = []
    for side, x in (('A', lat[0]), ('B', lat[1])):
        sg = -1 if side == 'A' else 1
        ky = (85.0 + 3.0 * t) * (1 - t) + (hipY + 1.0) * t
        kx = x + sg * (1.0 + 4.0 * t)
        ax = x + sg * 0.5
        thigh = tube([(x - sg * 0.5, hipY), (kx, ky)], 2.9 + 0.3 * t)
        shin = tube([(kx, ky), (ax, ANK_Y)], 2.4)
        out.append((side, thigh, shin, (kx, ky)))
    return hipY, out
def squat_legs(L, view, d):
    P0 = L['pants']; rp = ramp5(tones(P0))
    if d <= 0: return {'pants': P0, 'rips': L.get('rips'), 'front': None}
    x0, y0, x1, y1 = bbox(P0); lat = (x0 + 3.5, x1 - 3.5)
    band = P0.copy(); band[y0 + 5:] = 0; band = shift(band, 0, d)          # waistband / hips of the generator pants, shifted down
    hipY, legs = leg_masks(view, d, lat)
    t = min(1.0, d / DMAX)
    def knee_hl(a, kn, sg):                        # knee cap: light tone on the upper-left (lit) side, edge tone under it
        kx, ky = kn; put(a, int(round(kx - 1)), int(round(ky - 2)), rp[0]); put(a, int(round(kx)), int(round(ky - 2)), rp[1])
        put(a, int(round(kx - 1 + (sg > 0))), int(round(ky + 2)), rp[4])
    if view == 'se':                               # far (B) leg first, near (A) leg on top; legs over the shirt hem
        lay = band
        for side, th, sn, kn in sorted(legs, key=lambda q: q[0] != 'B'):
            leg = over(shade(sn, rp), shade(th, rp, bias=-.12))
            if t > .3: knee_hl(leg, kn, -1 if side == 'A' else 1)
            lay = over(lay, leg)
        front = lay
    else:                                          # back view: knees out at the sides, shins under, the seat drawn over them (toward camera)
        lay = np.zeros((FH, FW, 4), np.uint8)
        for side, th, sn, kn in legs: lay = over(lay, shade(sn, rp, bias=.1), shade(th, rp, bias=.05))
        seat = disk((x0 + x1 + 1) / 2, hipY + 0.5 + 1.5 * t, (x1 - x0 + 1) / 2 + 0.2, 3.6 + 1.2 * t)
        seat |= disk((x0 + x1 + 1) / 2, hipY - 2, (x1 - x0 + 1) / 2, 3.0)
        sa = shade(seat, rp, bias=-.05)
        cx = int(round((x0 + x1 + 1) / 2)) - 1                              # seat seam
        for y in range(int(hipY - 1), int(hipY + 3 + 2 * t)):
            if sa[y, cx, 3]: sa[y, cx, :3] = rp[3]
        lay = over(lay, sa, band)
        front = lay
    return {'pants': np.zeros_like(P0), 'rips': None, 'front': front}

# ------------------------------------------------------------------ poses (se coordinates; ne poses are drawn in se coords and flipped)
def A(E_, W, hk, hp, hd=(0, 1)): return (E_, W, hk, hp, hd)
#  each frame: d (crouch px), lean (screen px toward facing), near arm, far arm (None = generator arm), grab (True: the grab hand holds the item), expr (se)
POSES = {
 ('ambil', 'se'): [
  dict(d=0, lean=0, near=None, far=None, item=False, expr='neutral'),
  dict(d=3, lean=0, near=A((22.5, 68.5), (24.5, 75), 'open', (25.5, 76.5), (.3, 1)), far=A((43, 68.5), (44.5, 75), 'open', (45, 77), (.15, 1)), item=False, expr='neutral'),
  dict(d=8, lean=1, near=A((23.5, 73.5), (26.5, 80), 'open', (27.5, 81.5), (.35, 1)), far=A((45, 73.5), (46, 81), 'open', (46, 83), (0, 1)), item=False, expr='neutral'),
  dict(d=12, lean=2, near=A((23.5, 79), (26.5, 85), 'open', (28, 86), (.7, .6)), far=A((45.5, 79.5), (46, 88.5), 'open', (46, 91), (0, 1)), item=False, expr='neutral'),
  dict(d=12, lean=2, near=A((23.5, 79), (26.5, 85), 'open', (28, 86), (.7, .6)), far=A((45.5, 80), (45.5, 90), 'fist', (45.5, 92)), item=True, expr='surprised'),
  dict(d=11, lean=1, near=A((23.5, 77), (26.5, 83), 'open', (28, 84), (.7, .6)), far=A((46, 76.5), (44.5, 82.5), 'fist', (44, 84)), item=True, expr='surprised'),
  dict(d=7, lean=1, near=A((23, 72), (24.5, 78.5), 'open', (25, 80), (.2, 1)), far=A((45.5, 72.5), (42, 75.5), 'fist', (40.5, 76)), item=True, expr='happy'),
  dict(d=2, lean=0, near=A((22.5, 67), (23, 73.5), 'fist', (23, 75)), far=A((44, 67.5), (40.5, 68.5), 'fist', (39, 68)), item=True, expr='happy'),
  dict(d=0, lean=0, near=A((22.5, 65), (23, 71.5), 'fist', (23, 73)), far=A((44, 65.5), (40.5, 66), 'fist', (39, 65.5)), item=True, expr='smile'),
 ],
 ('cari', 'se'): [                         # rummage: one hand digs deep (open), the other pulls junk up (fist), alternating
  dict(d=9, lean=1, near=A(None, None, 'open', (31, 87), (.3, 1)), far=A(None, None, 'fist', (44.5, 75.5)), item=False, expr='neutral', bits=0),
  dict(d=9, lean=1, near=A(None, None, 'fist', (30, 81.5)), far=A(None, None, 'open', (45, 82.5), (0, 1)), item=False, expr='neutral', bits=1),
  dict(d=9, lean=1, near=A(None, None, 'fist', (29, 76)), far=A(None, None, 'open', (45.5, 88), (0, 1)), item=False, expr='neutral', bits=0),
  dict(d=9, lean=1, near=A(None, None, 'open', (30.5, 82.5), (.3, 1)), far=A(None, None, 'fist', (45, 81)), item=False, expr='neutral', bits=2),
 ],
 # ne (se coords before the flip): the grabbing hand = near arm, kept OUTSIDE the body silhouette (side of the body), never behind the head
 ('ambil', 'ne'): [
  dict(d=0, lean=0, near=None, far=None, item=False),
  dict(d=3, lean=0, near=A((22, 68.5), (21.5, 75), 'open', (21, 77), (-.1, 1)), far=A((42.5, 68.5), (42.5, 75), 'open', (42.5, 77)), item=False),
  dict(d=8, lean=1, near=A((20.5, 73.5), (19.5, 81), 'open', (19, 83), (-.05, 1)), far=A((43, 73.5), (43, 80), 'open', (43, 82)), item=False),
  dict(d=12, lean=2, near=A((19.5, 79.5), (18.5, 88), 'open', (18, 90.5)), far=A((43.5, 79), (42.5, 85), 'open', (42, 87)), item=False),
  dict(d=12, lean=2, near=A((19.5, 80), (18.5, 89.5), 'fist', (18.5, 91.5)), far=A((43.5, 79), (42.5, 85), 'open', (42, 87)), item=True),
  dict(d=11, lean=1, near=A((19.5, 78), (19, 83.5), 'fist', (19, 85)), far=A((43.5, 77), (42.5, 83), 'open', (42, 85)), item=True),
  dict(d=7, lean=1, near=A((20, 73), (19.5, 78.5), 'fist', (19.5, 80)), far=A((43, 72), (42.5, 78.5), 'open', (42.5, 80.5)), item=True),
  dict(d=2, lean=0, near=A((21, 67.5), (20, 72), 'fist', (20, 73.5)), far=A((42.5, 67), (42.5, 73.5), 'fist', (42.5, 75)), item=True),
  dict(d=0, lean=0, near=A((21, 65.5), (20, 70), 'fist', (20, 71.5)), far=A((42.5, 65), (42.5, 71.5), 'fist', (42.5, 73)), item=True),
 ],
 ('cari', 'ne'): [
  dict(d=9, lean=1, near=A(None, None, 'open', (18.5, 87)), far=A(None, None, 'fist', (44.5, 77)), item=False, bits=0),
  dict(d=9, lean=1, near=A(None, None, 'fist', (19.5, 82)), far=A(None, None, 'open', (45, 83)), item=False, bits=1),
  dict(d=9, lean=1, near=A(None, None, 'fist', (19.5, 77)), far=A(None, None, 'open', (45, 88)), item=False, bits=0),
  dict(d=9, lean=1, near=A(None, None, 'open', (19, 83)), far=A(None, None, 'fist', (44.5, 81)), item=False, bits=2),
 ],
}
GRAB = {'se': 'far', 'ne': 'near'}            # the hand that picks up the item (screen right in both base views)
MS = {'ambil': [260, 110, 110, 120, 260, 120, 110, 120, 320], 'cari': [140, 140, 140, 140]}
ITEM_DIAMBIL = 4

# ------------------------------------------------------------------ held item (item_temuan generator, small hand-held scale) + debris
HELD_K = 0.75
def held_item(key='kaleng_minuman', var='merah'):
    e = IT.M[key]; o, _ = RI.draw(e['fn'], e['varian'][var], HELD_K, shadow=False); x0, y0, x1, y1 = RI.bbox(o)
    return o[y0:y1, x0:x1]
def ground_item(key='kaleng_minuman', var='merah'):
    """preview: the same item lying on the ground at the hand scale (HELD_K, shadow alpha 56). pivot = ground point"""
    e = IT.M[key]; o, piv = RI.draw(e['fn'], e['varian'][var], HELD_K, shadow=True); x0, y0, x1, y1 = RI.bbox(o)
    return o[y0:y1, x0:x1], [piv[0] - x0, piv[1] - y0]
PAPER = X('#E7EBF2', '#B9C0CC'); CARD = X('#BCA479', '#9E885D')

def paste(dst, a, x, y):
    im = Image.fromarray(dst); im.alpha_composite(Image.fromarray(a), (int(x), int(y))); return np.array(im)

# ------------------------------------------------------------------ frame builder
def frame(char, anim, view, f, with_item=True):
    base = 'se' if view in ('se', 'sw') else 'ne'; mir = view in ('sw', 'nw')
    p = POSES[(anim, base)][f]; expr = p.get('expr', 'neutral') if base == 'se' else 'neutral'
    L, pal = LAYERS[char](base, expr)
    info = {'hand': None, 'item': False}
    if p['near'] is None and p['d'] == 0:
        im = np.array(compose_idle(L))
        if mir: im = im[:, ::-1].copy()
        return Image.fromarray(im), info
    d, lean = p['d'], p['lean']; lx = lean if base == 'se' else lean      # lean toward the facing side (screen right for se and ne)
    sh0 = L['shirt']; tx0, tx1 = torso_cols(sh0, 67)
    legs = squat_legs(L, base, d)
    U = {k: shift(L[k], lx, d) for k in UPPER if k in L}
    sh = U['shirt'].copy(); sh[:, :tx0 + lx] = 0; sh[:, tx1 + 1 + lx:] = 0     # sleeves are redrawn by limb() (shoulder + sleeve + elbow)
    U['shirt'] = sh
    n = CHARS[char]
    # shoulders: generator sleeve top, moved with the upper body
    if base == 'se': SN, SF = (tx0 - 1.0 + lx, 57.5 + d), (tx1 + 1.5 + lx, 57.5 + d)
    else: SN, SF = (64 - (tx1 + 1.5 + lx), 57.5 + d), (64 - (tx0 - 1.0 + lx), 57.5 + d)     # se-coords of the flipped (ne) shoulders
    def arm(S, a):
        E_, W, hk, hp, hd = a
        if E_ is None:                             # auto elbow: wrist just behind the hand, elbow bent OUTWARD (away from the torso)
            ux, uy = hd; nn = math.hypot(ux, uy) or 1; W = (hp[0] - ux / nn * 1.6, hp[1] - uy / nn * 1.6)
            mx, my = (S[0] + W[0]) / 2, (S[1] + W[1]) / 2; L_ = math.hypot(W[0] - S[0], W[1] - S[1])
            bend = min(3.0, math.sqrt(max(0.0, 9.0 ** 2 - (L_ / 2) ** 2))); out = -1 if S[0] < 32 else 1
            vx, vy = (W[1] - S[1]) / (L_ or 1), -(W[0] - S[0]) / (L_ or 1)
            if vx * out < 0: vx, vy = -vx, -vy
            E_ = (mx + vx * bend, my + vy * bend)
        return limb(S, E_, W, hk, hp, hd, pal, n)
    near = arm(SN, p['near']); far = arm(SF, p['far'])
    gh = p['near'] if GRAB[base] == 'near' else p['far']; hp = gh[3]
    if base == 'ne': near, far = flipx(near), flipx(far); hp = (64 - hp[0], hp[1])
    info['hand'] = [round(hp[0], 1), round(hp[1], 1)]
    im = Image.fromarray(shadow())
    order = (['hair_back', 'body', 'shoes', 'shoes_over', 'pants', 'LEGS', 'shirt', 'shirt_graphic', 'outer', 'acc', 'FAR', 'body_front', 'held', 'face', 'hair_front', 'glasses', 'brows', 'NEAR']
             if base == 'se' else
             ['FAR', 'hair_back', 'body', 'shoes', 'shoes_over', 'pants', 'LEGS', 'shirt', 'shirt_graphic', 'outer', 'acc', 'body_front', 'held', 'face', 'hair_front', 'glasses', 'brows', 'NEAR'])
    it = held_item() if (with_item and p['item']) else None
    for k in order:
        if k == 'LEGS': a = legs['front']
        elif k == 'FAR': a = far
        elif k == 'NEAR': a = near
        elif k in ('shoes', 'shoes_over'): a = L.get(k)
        elif k == 'pants': a = legs['pants']
        else: a = U.get(k)
        if a is None: continue
        if it is not None and ((k == 'FAR' and GRAB[base] == 'far') or (k == 'NEAR' and GRAB[base] == 'near')):
            ih, iw = it.shape[:2]; im.alpha_composite(Image.fromarray(it), (int(round(hp[0] - iw / 2)), int(round(hp[1] - ih / 2 + 1))))
            info['item'] = True
        im.alpha_composite(Image.fromarray(a))
    if anim == 'cari' and p.get('bits'):           # debris flicked up above the digging (open) hand: paper / cardboard bits
        top = E()
        for a in (p['near'], p['far']):
            if a[2] != 'open': continue
            x, y = a[3]; x = x if base == 'se' else 64 - x
            pts = [((x - 2, y - 7), PAPER), ((x + 2, y - 9), CARD)] if p['bits'] == 1 else [((x + 1, y - 6), CARD), ((x - 3, y - 10), PAPER)]
            for (bx, by), rp in pts:
                put(top, int(bx), int(by), rp[0]); put(top, int(bx) + 1, int(by), rp[0]); put(top, int(bx), int(by) + 1, rp[1]); put(top, int(bx) + 1, int(by) + 1, rp[1])
        im.alpha_composite(Image.fromarray(top))
    if mir:
        im = im.transpose(Image.FLIP_LEFT_RIGHT); info['hand'] = [round(63 - info['hand'][0], 1), info['hand'][1]]
    return im, info

# ------------------------------------------------------------------ build
def check_identity():
    g = np.array(Image.open(GAME_SHEET).convert('RGBA'))
    res = {}
    for v, row in (('se', 4), ('ne', 6)):
        L, _ = ichsan_layers(v); a = np.array(compose_idle(L)); res[v] = int(np.any(g[row * 112:(row + 1) * 112, 0:64] != a, axis=2).sum())
    return res

def preview_frame(im, anim, view, f, char):
    """preview-only composite: ground item lying before the grab frame (game: world sprite, removed at item_diambil)"""
    if anim != 'ambil' or f >= ITEM_DIAMBIL: return im
    gi, piv = ground_item(); _, info = frame(char, 'ambil', view, ITEM_DIAMBIL)
    hx_, hy_ = info['hand']; c = Image.new('RGBA', (FW, FH)); c.alpha_composite(Image.fromarray(gi), (int(hx_ - piv[0]), int(hy_ + 3 - piv[1])))
    c.alpha_composite(im); return c          # the item lies beside the grab hand, under the figure

if __name__ == '__main__':
    os.makedirs(f'{OUT}/frames', exist_ok=True)
    Image.fromarray(held_item()).save(f'{OUT}/held_kaleng_minuman_merah.png'); Image.fromarray(ground_item()[0]).save(f'{OUT}/ground_kecil_kaleng_minuman_merah.png')
    ident = check_identity(); print('ichsan idle f0 vs game sheet (diff px):', ident)
    man = {'name': 'anim_ambil_barang', 'preview_only': True, 'frame': [FW, FH], 'pivot': [32, 100], 'dirs': list(VIEWS),
           'mirror': {'sw': 'se (flip horizontal)', 'nw': 'ne (flip horizontal)'}, 'chars': {}, 'anims': {}}
    FR = {}; INFO = {}
    for char in CHARS:
        for anim in ('ambil', 'cari'):
            n_ = len(POSES[(anim, 'se')])
            for v in VIEWS:
                for wi in ((True, False) if anim == 'ambil' else (False,)):
                    for f in range(n_):
                        im, info = frame(char, anim, v, f, wi)
                        tag = '' if anim == 'cari' else ('_item' if wi else '_kosong')
                        im.save(f'{OUT}/frames/{char}_{anim}{tag}_{v}_f{f}.png')
                        FR[char, anim, wi, v, f] = im; INFO[char, anim, v, f] = info
    for anim in ('ambil', 'cari'):
        ms = MS[anim]; n_ = len(ms)
        man['anims'][anim] = {
            'frames': n_, 'loop': anim == 'cari', 'fps_nominal': round(1000 / (sum(ms) / n_), 1), 'frame_ms': ms, 'total_ms': sum(ms),
            'item_diambil': ITEM_DIAMBIL if anim == 'ambil' else None,
            'events': ({'item_diambil': {'frame': ITEM_DIAMBIL, 't_ms': sum(ms[:ITEM_DIAMBIL])}, 'selesai': {'frame': n_ - 1, 't_ms': sum(ms)}} if anim == 'ambil'
                       else {'loop_hint': 'ulang 2-3x (±1,1-1,7 s); bila dapat barang lanjut ke ambil f3..f8 (item_diambil di f4), bila tidak dapat lanjut ambil f6..f8 dengan frame _kosong'}),
            'files': {'pattern': f'frames/{{char}}_{anim}' + ('_{item|kosong}' if anim == 'ambil' else '') + '_{dir}_f{i}.png'},
            'crouch_px': [POSES[(anim, 'se')][i]['d'] for i in range(n_)],
            'hand_px': {c: {v: [INFO[c, anim, v, i]['hand'] for i in range(n_)] for v in VIEWS} for c in CHARS},
            'item_in_hand_frames': [i for i in range(n_) if POSES[(anim, 'se')][i]['item']]}
    man['anims']['ambil']['ground_item_offset_from_pivot'] = {v: [round(INFO['ichsan', 'ambil', v, ITEM_DIAMBIL]['hand'][0] - 32, 1), round(INFO['ichsan', 'ambil', v, ITEM_DIAMBIL]['hand'][1] + 3 - 100, 1)] for v in VIEWS}
    man['chars'] = {'ichsan': {'source': 'v6b/live/chars/ichsan.json via live_v6b (= assets/chars/ichsan_v6b_sheet.png)', 'idle_f0_diff_vs_game_sheet_px': ident},
                    'npc': {'source': 'npc_v6b.make_cfg + job_common.render (npc_v6b.build path)', 'cfg': NPC}}
    man['held_item_preview'] = {'item': 'kaleng_minuman_merah', 'scale_k': HELD_K, 'note': 'penanda posisi tangan; game boleh tempel ikon/ground sprite lain di hand_px'}
    for an in man['anims']: man['anims'][an]['hand_px_note'] = 'titik tengah tangan yang memegang barang (frame px, sudah dicerminkan untuk sw/nw); null = lengan bawaan generator (idle f0)'
    json.dump(man, open(f'{OUT}/manifest.json', 'w'), indent=1, ensure_ascii=False)
    # previews
    for char in CHARS:
        for anim in ('ambil', 'cari'):
            n_ = len(MS[anim])
            fl = [strip([preview_frame(FR[char, anim, anim == 'ambil', v, i], anim, v, i, char) for v in VIEWS]) for i in range(n_)]
            # gif with per-frame timing
            out = []
            for st in fl:
                big = st.resize((st.width * 4, st.height * 4), Image.NEAREST); c = Image.new('RGBA', big.size, BG); c.alpha_composite(big); out.append(c.convert('RGB'))
            out[0].save(f'{OUT}/{char}_{anim}_4arah_4x.gif', save_all=True, append_images=out[1:], duration=MS[anim], loop=0)
        rows = []
        for anim in ('ambil', 'cari'):
            for v in VIEWS:
                rows.append((f'{anim} {v}', [(f'f{i}' + (' *ambil' if anim == 'ambil' and i == ITEM_DIAMBIL else ''), FR[char, anim, anim == 'ambil', v, i]) for i in range(len(MS[anim]))]))
        sheet(f'{char.upper()}  ·  ambil barang (9f) + cari barang (loop 4f)  ·  4x  ·  64x112 pivot 32,100  ·  * = item_diambil  ·  sw/nw = mirror', rows, f'{OUT}/{char}_ambil_cari_sheet_4x.png', bg=BG)
    # audit
    import json as J
    K = J.load(open('assets/npc_babeh_loak/_tools/known.json')); known = set().union(*[set(v) for v in K.values()])
    cols = set(); al = set()
    for im in FR.values():
        a = np.array(im); cols |= {H(p) for p in a.reshape(-1, 4) if p[3] == 255}; al |= set(np.unique(a[..., 3]).tolist())
    print(len(cols), 'colours; alpha', sorted(al), 'not in known.json:', sorted(c for c in cols if c not in known))
