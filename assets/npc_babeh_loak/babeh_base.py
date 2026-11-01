"""Babeh loak - base layers (v6b generator via ../npc_pak_ogah/job_common + the same npc_v6b calls), outfit overlays.
PREVIEW ONLY. All overlay colours are taken from the game palette (see README for the audit)."""
import os, sys, math
sys.path.insert(0, 'assets/npc_pak_ogah')
from job_common import *
from job_common import nv, lv, pv, pal6

def X(*cs): return [hx(c) for c in cs]
# ---------------------------------------------------------------- palette (all existing game hexes)
PECI = X('#3A4458', '#2A3242', '#24252B', '#1C2330', '#10141B')                 # night / charcoal / slate (v6b CL)
GREYC = X('#E7EBF2', '#B9C0CC', '#A9B1BF', '#8D97A8', '#5A6577')                # paper / lgrey / silver
KHAKI = X('#BCA479', '#B49A6A', '#9E885D', '#7E6C4A', '#5E4636')                # pal6 khaki pants ramp + walnut edge (pet cap)
WOOD = X('#A87A4E', '#94704F', '#6B4F3A', '#5E4636', '#3D2A1E')                  # walnut ramp + pal6 shoe tan (cowboy hat, stool)
TEAL = X('#6FA9A9', '#3D7A80', '#2A5266')                                          # Theodore teal (sarung, sandals)
TOWEL = X('#E7EBF2', '#B9C0CC', '#8D97A8', '#5A6577')
RED = X('#FF8AA2', '#FF5A5F', '#E0434A', '#B8323A', '#7A2E35')                  # street_buildings bangku merah
BLUE = X('#A9D6F5', '#86CCFF', '#3AA6F2', '#2479CC', '#1A3F87')                 # street_buildings bangku biru
MONEY = X('#FF8AA2', '#E0434A', '#B8323A')                                         # Rp 100rb (pink-red)
MONEY_B = X('#86CCFF', '#3AA6F2', '#2479CC')                                       # Rp 50rb (blue)
CALC = X('#5A6577', '#3A4458', '#2A3242', '#7FB2DE', '#E7EBF2')                   # calculator body + lcd
BRASS = X('#FFD166', '#E0A526', '#C99A2E')
BAG = X('#94704F', '#6B4F3A', '#5E4636', '#3D2A1E')

BABEH = {
 'babeh_pemilik': dict(body='m', skin='medium', hair='short', hc='silver', top='tee', tc='paper', pants='trousers', pc='walnut', shoes='shoes', sc='night',
                       skirt=('long', 'skin'), facial=dict(mustache='#5A6577', mu_droop=True), glasses=True, gshape='round', hat='peci',
                       sandal=(WOOD[1], WOOD[2], WOOD[4]), top_style='koko', stool=RED, title='Babeh Pemilik Toko Loak'),
 'babeh_jam':     dict(body='m', skin='tan', hair='short', hc='silver', top='tee', tc='green', pants='trousers', pc='khaki', shoes='shoes', sc='night',
                       facial=dict(mustache='#5A6577'), glasses=True, gshape=None, hat='pet', sandal=(PECI[0], PECI[1], PECI[3]), top_style='polo',
                       stool=BLUE, title='Babeh Lapak Jam & Aksesori'),
 'babeh_tas':     dict(body='m', skin='brown', hair='short', hc='silver', top='shirt', tc='red', pants='trousers', pc='slate', shoes='shoes', sc='night',
                       facial=dict(mustache='#E7EBF2', mu_droop=True, stubble=['#B9C0CC', '#E7EBF2']), glasses=False, hat='koboi',
                       sandal=TEAL, top_style='plaid', towel=True, stool=WOOD, title='Babeh Lapak Tas / Barang Bekas'),
}
TC = {'paper': '#E7EBF2', 'green': '#3E7A4E', 'red': '#B8352E'}
PC = {'walnut': '#6B4F3A', 'khaki': '#B49A6A', 'slate': '#3A4458'}

def render_b(n, anim='idle', f=0, view='se', expr='neutral'):
    """job_common.render + the generator's own facial (mustache/stubble), glasses and skirt options (as npc_v6b.build)"""
    m = dict(n); m['tc'] = 'paper'; m['pc'] = 'walnut'; m['skin'] = 'medium'; m.pop('cap', None)
    C, O = nv.make_cfg(m)
    O['shirt']['color'] = TC.get(n['tc'], n['tc']); O['pants']['color'] = PC.get(n['pc'], n['pc'])
    C.update(n.get('facial', {})); C['glasses_shape'] = n.get('gshape')
    C['skin_map'] = dict(pal6.SKIN[n['skin']])
    se, pal = lv.build_char_layers(C, O)
    for k, v in C['hair_map'].items(): pal['H' + k] = hx(v)
    pal['B'] = hx(C['brow']); pal['GL'] = hx('#3A4458')
    ne = lv.back_layers(se, C, O)
    if n.get('cap'):                                   # npc_v6b cap() (as job_common.render); X1..X3 from a given palette ramp
        nv.cap(se, ne); cr = n['cap']; pal.update({'X1': hx(cr[0]), 'X2': hx(cr[1]), 'X3': hx(cr[2])})
    for i, c in enumerate(('C2', 'C3', 'C4', 'C4', 'C5')): pal.setdefault(f'O{i + 1}', pal[c])
    kind = lv.KIND[anim]
    P = lv.pose_layers(se if view == 'se' else ne, kind, f, view, C, O)
    for mk, mp in pal['_maps'].items(): P[mk] = lv.recolor(P[mk], mp)
    if n.get('skirt'): nv.skirt(P, kind, *n['skirt'])
    P['shoes_over'] = pv.shoe_style(P, n['shoes'])
    if n['shoes'] in ('sneakers', 'hightops', 'boots'): pal.setdefault('S3', hx('#E8E6E0'))
    for k, v in C['skin_map'].items(): pal.setdefault('K' + k, hx(v))
    rg = {k: lv.to_img(v, pal) for k, v in P.items() if k not in ('face', 'brows', 'acc_head')}
    imgs = {k: np.array(v) for k, v in lv.frame_img(rg).items()}
    bob = (-1 if f in (2, 3) else 0) if kind in ('idle', 'talk') else ((-1 if f in (1, 4) else 0) if kind == 'walk' else 0)
    F, B, G = lv.face_layer(expr, C, view, lv.SIT_D if kind in lv.SEATED else 0, bob, bool(n.get('glasses')), 0)
    F = lv.recolor(F, pv.SKIN)
    fi = {k: np.array(v) for k, v in lv.frame_img({'f': lv.to_img(F, pal), 'b': lv.to_img(B, pal), 'g': lv.to_img(G, pal)}).items()}
    imgs['face'] = fi['f']; imgs['brows'] = fi['b']; imgs['glasses'] = fi['g']
    return imgs, pal, bob

E = lambda: np.zeros((FH, FW, 4), np.uint8)
def tones(a, mask=None):
    m = a[..., 3] == 255 if mask is None else mask
    return sorted({tuple(p[:3]) for p in a[m]}, key=lum, reverse=True)
def flipx(a): return np.roll(a[:, ::-1], 1, axis=1)
def shirt_ramp(pal): return [pal['C1'], pal['C2'], pal['C3'], pal['C4'], pal['C5']]
def skin_ramp(pal): return [pal['Ki'], pal['Kh'], pal['Ke'], pal['Ka'], pal['K7'], pal['K5']]

# ---------------------------------------------------------------- belly (perut buncit)
def belly(L, view, dy, pal, seated=False):
    """perut buncit: belly bulge on the rows below the chest (chest/shoulders keep the generator width). The bulge is larger on
    the facing side (se: screen right, unmirrored ne: screen left) like a 3/4 profile; arms move outward so the hands stay
    visible; underside shadow + hem sagging over the waistband. edge = darkest shirt tone (no outline)"""
    C = shirt_ramp(pal); sh = L['shirt']; o = sh.copy()
    prof = {60: (0, 1), 61: (1, 1), 62: (1, 2), 63: (1, 2), 64: (2, 3), 65: (2, 3), 66: (2, 3), 67: (2, 3), 68: (1, 3), 69: (1, 2), 70: (0, 2), 71: (0, 1)}
    if view == 'ne': prof = {k: (v[1] - 1, max(0, v[0] - 1)) for k, v in prof.items()}       # back: smaller, side bulge only
    for y in range(58 + dy, 72 + dy):
        xs = np.nonzero(sh[y, :, 3])[0]
        if not len(xs): continue
        core = [x for x in xs if 25 <= x <= 39] or list(xs)
        a, b = min(core), max(core)
        pl, pr = prof.get(y - dy, (0, 0))
        for k in range(1, pl + 1):
            if not o[y, a - k, 3] or True: o[y, a - k] = sh[y, a]
        for k in range(1, pr + 1): o[y, b - 1 + k] = sh[y, b - 1]; o[y, b + k] = sh[y, b]
        if pr: o[y, b + pr] = (*C[4], 255)
    xs = np.nonzero(o[70 + dy, :, 3])[0]
    if len(xs):
        a, b = xs.min(), xs.max()
        for x in range(a + 2, b): put(o, x, 71 + dy, C[3] if x < b - 3 else C[4])                 # sag over the waistband
        if view == 'se':
            for x in range(a + 3, b - 2): put(o, x, 70 + dy, C[2] if x < (a + b) // 2 else C[3])
    if view == 'se':
        for (x, y) in ((28, 62), (29, 62), (27, 63), (28, 63), (27, 64), (26, 65)): put(o, x, y + dy, C[0])     # left-lit belly highlight
        for (x, y) in ((40, 64), (41, 65), (41, 66), (41, 67), (40, 68), (39, 69)): put(o, x, y + dy, C[3])     # curve of the belly
        for (x, y) in ((33, 66),): put(o, x, y + dy, C[3])                                                         # navel fold
    else:
        for (x, y) in ((25, 64), (25, 65)): put(o, x, y + dy, C[0])
    L['shirt'] = o
    for k in ('arm_near', 'arm_far'):
        a = L[k]; bb = bbox(a)
        if bb is None or seated: continue
        cx = (bb[0] + bb[2]) / 2; left = cx < 32
        s = (-1 if view == 'se' else -2) if left else (2 if view == 'se' else 1)
        sl = np.roll(a, s, axis=1); L[k] = sl
        # sleeve continuity: extend the sleeve rows above the forearm outward by the same amount
        for y in range(54 + dy, 64 + dy):
            xs = np.nonzero(o[y, :, 3])[0]
            if not len(xs): continue
            if left:
                x = xs.min()
                for j in range(1, -s + 1): o[y, x - j] = o[y, x]
            else:
                x = xs.max()
                for j in range(1, s + 1): o[y, x + j] = o[y, x]
        L['shirt'] = o

# ---------------------------------------------------------------- tops
def top_details(L, n, view, dy, pal):
    C = shirt_ramp(pal); sh = L['shirt']; st = n['top_style']
    if st == 'koko':                     # stand collar + front placket with tone-on-tone embroidery
        if view == 'se':
            for y in range(56, 69):
                put(sh, 33, y + dy, C[3])
                if y % 2 == 0 and y < 64: put(sh, 32, y + dy, C[2]); put(sh, 34, y + dy, C[2])
            for (x, y) in ((28, 54), (29, 54), (30, 55), (31, 55), (35, 55), (36, 55), (37, 54), (38, 54), (32, 56), (34, 56)): put(sh, x, y + dy, C[2])
            for (x, y) in ((27, 60), (28, 60), (29, 60), (27, 61), (29, 61)): put(sh, x, y + dy, C[2])      # breast pocket
        else:
            for x in range(27, 38): 
                if sh[53 + dy, x, 3]: put(sh, x, 53 + dy, C[2])
    elif st == 'polo':                   # flat collar flaps + 2-button placket
        if view == 'se':
            for (x, y, c) in ((27, 54, 0), (28, 54, 0), (29, 54, 0), (28, 55, 0), (29, 55, 1), (30, 55, 2), (30, 56, 3),
                              (36, 55, 1), (37, 54, 1), (38, 54, 2), (35, 55, 2), (36, 56, 3), (39, 54, 3)):
                put(sh, x, y + dy, C[c])
            for y in range(56, 61): put(sh, 33, y + dy, C[3])
            put(sh, 32, 57 + dy, C[0]); put(sh, 32, 59 + dy, C[0])
        else:
            for x in range(26, 39):
                for yy in (52, 53):
                    if sh[yy + dy, x, 3]: put(sh, x, yy + dy, C[0] if yy == 52 else C[2])
    elif st == 'plaid':                  # red check: dark lines every 5 px both ways + thin light line, rolled sleeve cuffs
        m = sh[..., 3] == 255; ys, xs = np.nonzero(m)
        for y, x in zip(ys, xs):
            c = tuple(sh[y, x, :3]); r = [tuple(t) for t in C].index(c) if c in [tuple(t) for t in C] else 2
            vx = (x - 1) % 5 == 0; hy = (y - dy) % 5 == 0; lx = (x - 3) % 5 == 0
            if vx and hy: r = 4
            elif vx or hy: r = min(4, r + 2)
            elif lx and r <= 2: r = 0
            put(sh, x, y, C[r])
        for x in range(FW):                                                    # rolled cuffs on the short sleeves
            if 25 <= x <= 39: continue
            ys = [y for y in range(54 + dy, 66 + dy) if sh[y, x, 3]]
            if ys:
                put(sh, x, max(ys), C[0]); put(sh, x, max(ys) - 1, C[1] if x < 32 else C[2])
                if x in (22, 23, 41, 42) or True: put(sh, x, max(ys) - 2, C[4])
        if L.get('acc') is not None and bbox(L['acc']) is not None:           # collar: plain red, lighter
            ac = L['acc']; m = ac[..., 3] == 255; ac[m, :3] = C[1]
    L['shirt'] = sh

# ---------------------------------------------------------------- lower body
def sarung(L, dy):
    """skirt (generator nv.skirt 'long') recoloured to a teal check sarung: luminance rank -> teal ramp, dark + light check lines"""
    pa = L['pants']; m = pa[..., 3] == 255
    if not m.any(): return
    tl = tones(pa, m); keep = {tuple(pv) for pv in tl}
    rank = {c: i for i, c in enumerate(tl)}; nrank = max(1, len(tl) - 1)
    ys, xs = np.nonzero(m); y0 = ys.min()
    skin = set()
    for y, x in zip(ys, xs):
        c = tuple(pa[y, x, :3]); t = rank[c] / nrank
        # skin (ankles) stays as is
        if c in L.get('_skin', set()): continue
        base = TEAL[0] if t < .2 else TEAL[1] if t < .75 else TEAL[2]
        if (x + 0) % 6 == 0 or (y - y0) % 6 == 0: base = PECI[3] if t > .5 else TEAL[2]
        elif (x + 3) % 6 == 0 and t < .75: base = GREYC[1]
        if (y - y0) in (11, 12) and t < .9: base = PECI[3]                     # waist fold ('kepala' band)
        put(pa, x, y, base)
    L['pants'] = pa

def sandals(L, pal, ramp):
    so = L['shoes']; sk = [pal['Ki'], pal['Kh'], pal['Ke'], pal['Ka'], pal['K7']]; new = E()
    for x in range(FW):
        ys = np.nonzero(so[:, x, 3])[0]
        if not len(ys): continue
        for y in ys:
            r = y - ys.min(); last = y == ys.max()
            xl = not so[y, x - 1, 3]; xr = not so[y, x + 1, 3]
            c = ramp[2] if last else (ramp[0] if r == 1 and not xr else ramp[1] if r == 1 else (sk[4] if xr else sk[1] if xl else sk[2]))
            put(new, x, y, c)
    L['shoes'] = new

# ---------------------------------------------------------------- hats
def hat(L, n, view):
    hf = L['hair_front']; bb = bbox(hf)
    if bb is None: return E(), E()
    x0, y0, x1, y1 = [int(v) for v in bb]; cx = (x0 + x1 + 1) // 2
    front, back = E(), E()
    kind = n['hat']
    if kind == 'peci':                 # black velvet peci: oval drum on the crown, lit left, flat lighter top
        m = np.zeros((FH, FW), bool)
        for y in range(y0 - 2, y0 + 5):
            a = x0 + 2 if y > y0 - 2 else x0 + 4; b = x1 - 2 if y > y0 - 2 else x1 - 4
            if y == y0 - 1: a, b = x0 + 2, x1 - 2
            m[y, a:b + 1] = True
        a = shade(m, PECI, edge=True)
        for x in range(x0 + 4, x1 - 3): put(a, x, y0 - 2, PECI[0] if x < cx else PECI[1])        # top rim
        for x in range(x0 + 3, x1 - 2): put(a, x, y0 + 4, PECI[3])                               # lower band edge
        put(a, x0 + 3, y0, PECI[0]); put(a, x0 + 3, y0 + 1, PECI[0])
        front = a
    elif kind == 'pet':                # flat cap (topi pet): soft crown slightly overhanging, short brim to the facing side
        m = np.zeros((FH, FW), bool)
        for y in range(y0 - 1, y0 + 6):
            a = x0 + (2 if y == y0 - 1 else 0); b = x1 - (2 if y == y0 - 1 else 0)
            if view == 'se': b += 1 if y >= y0 + 1 else 0
            else: a -= 1 if y >= y0 + 1 else 0
            m[y, a:b + 1] = True
        a = shade(m, KHAKI, edge=True)
        for x in range(x0 + 1, x1 + 1): put(a, x, y0 + 5, KHAKI[3])                              # band
        if view == 'se':
            for x in range(x1 - 9, x1 + 3): put(a, x, y0 + 6, KHAKI[1] if x < x1 - 2 else KHAKI[2])
            for x in range(x1 - 8, x1 + 3): put(a, x, y0 + 7, KHAKI[3])
            for x in range(x1 - 6, x1 + 2): put(a, x, y0 + 8, KHAKI[4])
            put(a, cx, y0 - 1, KHAKI[3])
            for y in range(y0, y0 + 5): put(a, cx + 2, y, KHAKI[2])                              # front seam                                                         # button
        else:
            put(a, cx - 1, y0 - 1, KHAKI[3])
        front = a
    elif kind == 'koboi':              # brown cowboy hat: dented crown + wide brim curled up at the ends
        for k in ('hair_front', 'hair_back', 'body'):
            ly = L[k]; ly[:y0 + 4] = 0 if k != 'body' else ly[:y0 + 4]
        L['hair_front'][:y0 + 4] = 0
        by = y0 + 5; rx = 15.5; bcx = cx + (1 if view == 'se' else -1)
        yy, xx = np.mgrid[0:FH, 0:FW]
        brim = ((xx + .5 - bcx) / rx) ** 2 + ((yy + .5 - by) / 2.6) ** 2 <= 1
        bm = np.zeros((FH, FW, 4), np.uint8)
        for y, x in zip(*np.nonzero(brim)):
            u = (x + .5 - bcx) / rx; v = yy[y, x] + .5 - by
            c = WOOD[1] if v < -0.5 else WOOD[2] if v < 1 else WOOD[3]
            if v >= 1.5: c = WOOD[4]
            if u < -.55 and v < 0: c = WOOD[0]
            put(bm, x, y, c)
        for x in range(FW):                                                     # curl: ends 1 px up
            u = (x + .5 - bcx) / rx
            if abs(u) > .8:
                col = np.nonzero(bm[:, x, 3])[0]
                if len(col): bm[col.min() - 1, x] = bm[col.min(), x]; bm[col.max(), x] = 0
        cm = np.zeros((FH, FW), bool)
        for y in range(y0 - 3, by):
            a = int(cx - 7) + (1 if y == y0 - 3 else 0); b = int(cx + 6) - (1 if y == y0 - 3 else 0)
            cm[y, a:b + 1] = True
        cm[y0 - 3, int(cx - 2):int(cx + 2)] = False                             # pinch dent on top
        cr = shade(cm, WOOD, edge=True)
        for x in range(int(cx - 7), int(cx + 7)):
            if cm[by - 2, x]: put(cr, x, by - 2, WOOD[4]); put(cr, x, by - 3, WOOD[3])          # hat band
        put(cr, int(cx - 1), y0 - 2, WOOD[3]); put(cr, int(cx), y0 - 2, WOOD[3])
        back = bm.copy(); back[by:] = 0                                         # back half of the brim behind the crown
        o = Image.fromarray(back); o.alpha_composite(Image.fromarray(cr)); fr = np.array(o)
        bf = bm.copy(); bf[:by] = 0
        o = Image.fromarray(fr); o.alpha_composite(Image.fromarray(bf)); front = np.array(o); back = E()
    return front, back

# ---------------------------------------------------------------- towel on the near shoulder (Babeh Tas)
def towel(view, dy):
    m = np.zeros((FH, FW), bool)
    for y in range(53, 66):
        if y < 56: a, b = 24, 30
        else: a, b = 26, 29
        m[y + dy, a:b + 1] = True
    a = shade(m, [TOWEL[0], TOWEL[0], TOWEL[1], TOWEL[2], TOWEL[3]], edge=True)
    for x in range(26, 30): put(a, x, 63 + dy, TEAL[1]); put(a, x, 65 + dy, TOWEL[2] if x % 2 else TOWEL[1])
    for y in range(56, 63): put(a, 28, y + dy, TOWEL[1])
    return a if view == 'se' else flipx(a)

# ---------------------------------------------------------------- stool (plastic / wooden), frame space, seat top ~ y 80
def stool(ramp, cx=32, top=79):
    a = E(); hw, hh = 8, 4
    def P(pts):
        im = Image.new('L', (FW, FH)); ImageDraw.Draw(im).polygon(pts, fill=255); return np.array(im) > 0
    seat = P([(cx - hw, top + hh), (cx, top), (cx + hw - 1, top + hh), (cx, top + 2 * hh)])
    lip = P([(cx - hw, top + hh), (cx, top + 2 * hh), (cx, top + 2 * hh + 2), (cx - hw, top + hh + 2)]) & ~seat
    lipr = P([(cx, top + 2 * hh), (cx + hw - 1, top + hh), (cx + hw - 1, top + hh + 2), (cx, top + 2 * hh + 2)]) & ~seat & ~lip
    for (x0, yb) in ((cx - hw + 1, 99), (cx - 1, 100), (cx + hw - 3, 99)):
        for y in range(top + hh + 2, yb):
            spl = (y - top - hh) // 9
            xx = x0 - spl if x0 < cx - 2 else (x0 + spl if x0 > cx + 2 else x0)
            for dx in range(2): put(a, xx + dx, y, ramp[2] if dx == 0 and x0 < cx + 2 else ramp[3])
            if x0 == cx - 1: put(a, xx, y, ramp[2]); put(a, xx + 1, y, ramp[3])
    for y in range(top + hh + 4, top + hh + 6):                                 # cross brace
        for x in range(cx - hw + 2, cx + hw - 2):
            if not a[y, x, 3]: put(a, x, y, ramp[4])
    a[seat, :3] = ramp[1]; a[seat, 3] = 255; a[lip, :3] = ramp[2]; a[lip, 3] = 255; a[lipr, :3] = ramp[3]; a[lipr, 3] = 255
    for y, x in zip(*np.nonzero(seat)):
        if y == top + hh and abs(x - cx) < 3: a[y, x, :3] = ramp[0]
    ys, xs = np.nonzero(seat)
    for x in range(cx - hw, cx + hw):
        col = [y for y in range(FH) if seat[y, x]]
        if col: put(a, x, min(col), ramp[0] if x <= cx else ramp[1])
    return a

def shadow_c(cx=32, rx=11):
    return shadow(cx, rx)

# ---------------------------------------------------------------- base build: layers for any generator row
def base_layers(n, view, anim, f, expr='neutral'):
    L, pal, bob = render_b(n, anim, f, view, expr)
    L0, _, _ = render_b(n, 'idle' if anim != 'sit' else 'sit', 0, view)
    dy = bbox(L['shirt'])[1] - bbox(L0['shirt'])[1]
    top_details(L, n, view, dy, pal)
    belly(L, view, dy, pal, seated=(anim == 'sit'))
    if n.get('skirt'):
        L['_skin'] = {tuple(c) for c in (pal[k] for k in ('Ki', 'Kh', 'Ke', 'Ka', 'K7', 'K5'))}
        sarung(L, dy); L.pop('_skin')
    sandals(L, pal, n['sandal'])
    hf, hb = hat(L, n, view)
    L['hat'] = hf
    if n.get('towel'): L['towel'] = towel(view, dy)
    return L, pal, dy, bob

ORDER = ['hair_back', 'body', 'arm_far', 'shoes', 'pants', 'shoes_over', 'rips', 'shirt', 'shirt_graphic', 'outer', 'acc', 'towel', 'arm_near', 'body_front', 'held',
         'face', 'hair_front', 'glasses', 'brows', 'hat']
