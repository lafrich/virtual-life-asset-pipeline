#!/usr/bin/env python3
"""frames, poses, props, sheets, GIFs for the 3 babeh (PREVIEW ONLY). python3 make_outputs.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_babeh_loak import *
from PIL import ImageDraw
GLASS = X('#A9D6F5', '#86CCFF', '#3AA6F2', '#2479CC')

def poly(pts, W, H):
    im = Image.new('L', (W, H)); ImageDraw.Draw(im).polygon(pts, fill=255); return np.array(im) > 0

def etalase(ori='se'):
    """glass display counter (etalase) for the owner, 1.2 cells along r x 0.4 along c, 26 px high, wooden frame + glass,
    goods inside. ori se: long side faces +c (camera-right, the player side). returns (img, pivot)"""
    W, H = 84, 64; G = (42, 50)
    Lr, Dc, Z = 1.2, 0.4, 20
    def p(c, r, z=0): return (G[0] + (c - r) * 32, G[1] + (c + r) * 16 - z)
    c0, c1, r0, r1 = -Dc / 2, Dc / 2, -Lr / 2, Lr / 2
    a = np.zeros((H, W, 4), np.uint8)
    top = poly([p(c0, r0, Z), p(c1, r0, Z), p(c1, r1, Z), p(c0, r1, Z)], W, H)
    fse = poly([p(c1, r0, 0), p(c1, r1, 0), p(c1, r1, Z), p(c1, r0, Z)], W, H) & ~top          # long face toward +c (shade)
    fsw = poly([p(c0, r1, 0), p(c1, r1, 0), p(c1, r1, Z), p(c0, r1, Z)], W, H) & ~top & ~fse   # end face toward +r (lit)
    def fill(m, c): a[m, :3] = c; a[m, 3] = 255
    fill(top, GLASS[0]); fill(fse, GLASS[2]); fill(fsw, GLASS[1])
    ys, xs = np.nonzero(fse)
    for y, x in zip(ys, xs):                                       # goods on 2 shelves behind the glass + wooden plinth
        col = [yy for yy in range(H) if fse[yy, x]]; t = y - min(col); hgt = len(col)
        if t >= hgt - 7: a[y, x, :3] = WOOD[3] if t < hgt - 1 else WOOD[4]
        elif t in (8, 9) : a[y, x, :3] = WOOD[2]
        elif 3 <= t <= 7 and x % 4 in (1, 2): a[y, x, :3] = [BRASS[0], RED[2], TEAL[1], GREYC[1], WOOD[1]][(x // 4) % 5]
        elif 11 <= t <= 14 and x % 5 in (0, 1, 2): a[y, x, :3] = [GREYC[2], BRASS[1], BLUE[3], WOOD[2]][(x // 5) % 4]
    ys, xs = np.nonzero(fsw)
    for y, x in zip(ys, xs):
        col = [yy for yy in range(H) if fsw[yy, x]]; t = y - min(col)
        if t >= len(col) - 7: a[y, x, :3] = WOOD[2]
    for y, x in zip(*np.nonzero(top)):                              # glass top: wooden rim + glints
        e = not (top[y - 1, x] and top[y + 1, x] and top[y, x - 1] and top[y, x + 1])
        if e: a[y, x, :3] = WOOD[1]
        elif (x + 2 * y) % 13 == 0: a[y, x, :3] = GREYC[0]
    for (q0, q1) in ((p(c1, r0, Z), p(c1, r0, 0)), (p(c1, r1, Z), p(c1, r1, 0)), (p(c0, r1, Z), p(c0, r1, 0))):   # posts
        for y in range(int(q0[1]), int(q1[1]) + 1): 
            if 0 <= int(q0[0]) < W: a[y, min(W - 1, int(q0[0])), :3] = WOOD[3]; a[y, min(W - 1, int(q0[0])), 3] = 255
    for x in range(W):                                               # bottom edge darkest
        ys2 = np.nonzero(a[:, x, 3])[0]
        if len(ys2): a[ys2.max(), x, :3] = WOOD[4]
    sh = np.zeros((H, W, 4), np.uint8)
    m = poly([p(c0, r0, 0), p(c1 + .12, r0, 0), p(c1 + .12, r1, 0), p(c0, r1, 0)], W, H); sh[m] = (0, 0, 0, 56)
    o = Image.fromarray(sh); o.alpha_composite(Image.fromarray(a)); o = np.array(o)
    if ori == 'sw': o = o[:, ::-1].copy(); G = (W - 1 - G[0], G[1])   # mirrored (same mirror rule as the NPC frames)
    return Image.fromarray(o), G

def counter_scene(nm, view, f):
    """preview: owner frame + etalase in front (se/sw) or behind (ne/nw); canvas 96x120, babeh pivot (40,100)"""
    im = Image.new('RGBA', (96, 120)); fr = build(nm, view, 'counter', f)
    base = 'se' if view in ('se', 'sw') else 'ne'; et, G = etalase('se' if view in ('se', 'ne') else 'sw')
    off = (18, 9)   # +0.55 c in front of the owner
    if view == 'sw': off = (-18, 9)
    if view == 'ne': off = (-18, -9)
    if view == 'nw': off = (18, -9)
    pos = (40 + off[0] - G[0], 100 + off[1] - G[1])
    if base == 'ne': im.alpha_composite(et, pos); im.alpha_composite(fr, (8, 0))
    else: im.alpha_composite(fr, (8, 0)); im.alpha_composite(et, pos)
    return im

def counter_scene_fix(im):
    a = np.array(im); al = a[..., 3]; a[(al > 0) & (al < 255)] = (0, 0, 0, 56); return Image.fromarray(a)

if __name__ == '__main__':
    for d in ('frames', 'poses'): os.makedirs(f'{OUT}/{d}', exist_ok=True)
    ALL = {}
    for nm in BABEH:
        AN = ANIMS_OWNER if nm == 'babeh_pemilik' else ANIMS
        FR = {}
        for kind, k, ms in AN:
            for v in VIEWS:
                FR[v, kind] = [build(nm, v, kind, i) for i in range(k)]
                for i, im in enumerate(FR[v, kind]): im.save(f'{OUT}/frames/{nm}_{v}_{kind}_f{i}.png')
        ALL[nm] = FR
        for v in VIEWS:
            FR[v, 'idle'][0].save(f'{OUT}/poses/{nm}_{v}_idle.png'); FR[v, 'sit'][0].save(f'{OUT}/poses/{nm}_{v}_sit.png')
            FR[v, 'offer'][1].save(f'{OUT}/poses/{nm}_{v}_offer_key.png'); FR[v, 'count'][1].save(f'{OUT}/poses/{nm}_{v}_count_key.png')
            FR[v, 'haggle'][1].save(f'{OUT}/poses/{nm}_{v}_haggle_key.png')
            if nm == 'babeh_pemilik': FR[v, 'counter'][4].save(f'{OUT}/poses/{nm}_{v}_counter_key.png')
        st = Image.fromarray(shadow(33)); st.alpha_composite(Image.fromarray(stool(BABEH[nm]['stool'], 31, 80))); st.save(f'{OUT}/poses/prop_stool_{nm}_se.png')
        st = Image.fromarray(shadow(33)); st.alpha_composite(Image.fromarray(stool(BABEH[nm]['stool'], 33, 80))); st.save(f'{OUT}/poses/prop_stool_{nm}_ne.png')
        rows = [(f'{k} {v}', [(f'f{i}', im) for i, im in enumerate(FR[v, k])]) for k, n_, ms in AN for v in VIEWS]
        sheet(f'{BABEH[nm]["title"].upper()}  ·  4x  ·  64x112, pivot 32,100  ·  v6b generator body + babeh overlays  ·  sw / nw = mirrors  ·  transparent',
              rows, f'{OUT}/{nm}_sheet_4x.png')
        for kind, k, ms in AN:
            if kind in ('idle', 'walk', 'sit'):
                gif([strip([FR[v, kind][i] for v in VIEWS]) for i in range(k)], f'{OUT}/{nm}_{kind}_4views_4x.gif', ms)
        seq = []
        for kind in ('offer', 'count', 'haggle'):
            for rep in range(2):
                for i in range(4): seq.append(strip([FR[v, kind][i] for v in VIEWS]))
        gif(seq, f'{OUT}/{nm}_work_4views_4x.gif', 260)
        print('built', nm, flush=True)
    for o in ('se', 'sw'):
        et, G = etalase(o); et.save(f'{OUT}/poses/prop_etalase_{o}.png'); print('etalase', o, et.size, 'pivot', G)
    CS = {v: [counter_scene_fix(counter_scene('babeh_pemilik', v, i)) for i in range(6)] for v in VIEWS}
    gif([strip_w([CS[v][i] for v in VIEWS]) if False else None for i in range(0)], '/dev/null', 1) if False else None
    def stripw(fs):
        c = Image.new('RGBA', (96 * len(fs), 120))
        for j, f in enumerate(fs): c.alpha_composite(f, (j * 96, 0))
        return c
    gif([stripw([CS[v][i] for v in VIEWS]) for i in range(6)], f'{OUT}/babeh_pemilik_counter_etalase_4views_4x.gif', 380)
    big = Image.new('RGBA', (16 + 6 * (96 * 4 + 12), 40 + 4 * (120 * 4 + 30)), BG); d = ImageDraw.Draw(big)
    d.text((16, 8), 'BABEH PEMILIK  ·  counter (terima barang -> periksa -> bayar) di balik etalase  ·  4x  ·  etalase = prop terpisah', fill=(231, 235, 242), font=fb)
    for j, v in enumerate(VIEWS):
        for i in range(6):
            x = 16 + i * (96 * 4 + 12); y = 40 + j * (120 * 4 + 30)
            d.text((x, y), f'{v} f{i}', fill=(141, 151, 168), font=font); big.alpha_composite(CS[v][i].resize((384, 480), Image.NEAREST), (x, y + 16))
    big.save(f'{OUT}/babeh_pemilik_counter_etalase_4x_darkbg.png')
    # combined sheets: key poses per babeh, 4 views
    keys = [('idle', 0), ('walk', 1), ('sit', 0), ('offer', 1), ('count', 1), ('haggle', 1)]
    rows = []
    for nm in BABEH:
        for v in VIEWS: rows.append((f'{nm[6:]} {v}', [(k, ALL[nm][v, k][i]) for k, i in keys] + ([('counter', ALL[nm][v, 'counter'][4])] if nm == 'babeh_pemilik' else [])))
    t = 'BABEH LOAK x3  ·  pemilik toko / lapak jam / lapak tas  ·  key poses  ·  4x  ·  64x112 pivot 32,100'
    sheet(t + '  ·  dark bg', rows, f'{OUT}/babeh_loak_all_4x_darkbg.png', bg=BG)
    sheet(t + '  ·  transparent', rows, f'{OUT}/babeh_loak_all_4x_transparent.png')
    # audit
    cols = set(); al = set()
    for FR in ALL.values():
        for fr in FR.values():
            for im in fr:
                a = np.array(im); cols |= {H(p) for p in a.reshape(-1, 4) if p[3] == 255}; al |= set(np.unique(a[..., 3]).tolist())
    for o in ('se', 'sw'):
        a = np.array(etalase(o)[0]); cols |= {H(p) for p in a.reshape(-1, 4) if p[3] == 255}; al |= set(np.unique(a[..., 3]).tolist())
    import json
    K = json.load(open(f'{OUT}/_tools/known.json')); known = set().union(*[set(v) for v in K.values()])
    new = sorted(c for c in cols if c not in known); inidx = sorted(c for c in cols if c not in set(K['index']))
    print(len(cols), 'colours; alpha', sorted(al)); print('not in any existing game/asset palette:', new); print('not in index.html (but in existing sprites):', len(inidx))
    json.dump({'colours': sorted(cols), 'alpha': sorted(int(x) for x in al), 'new_vs_all_existing': new, 'not_in_index_html_but_in_existing_sprites': [c for c in inidx if c not in new]},
              open(f'{OUT}/colour_audit.json', 'w'), indent=1)
