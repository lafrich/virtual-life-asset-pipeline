"""Build semua output spawn_hobo: sprite tenda + props, frame/sheet karakter, mock + GIF, contact sheet, _build.json (dipakai manifest)."""
import os, json, sys
import numpy as np
from PIL import Image
import spawn as S, chars as CH, tent as T
OUT = 'assets/spawn_hobo'
FW, FH, PIV = 64, 112, (32, 100)
info = {'tent': {}, 'props': {}, 'sheets': {}, 'mock': {}}
def save(im, p):
    os.makedirs(os.path.dirname(p), exist_ok=True); im.save(p); return os.path.relpath(p, OUT)
def up(im, k): return im.resize((im.width * k, im.height * k), Image.NEAREST)
# ---------------------------------------------------------------- tenda + props
TENT = {}
for st in ('tutup', 'buka'):
    for o in ('sw', 'se'):
        outs, refs = T.build_tent(st, o); TENT[(st, o)] = (outs, refs)
        files = {}
        if st == 'tutup': files['utuh'] = save(Image.fromarray(outs['all']), f'{OUT}/sprites/tenda_tutup_{o}.png')
        else:
            files['belakang'] = save(Image.fromarray(outs['back']), f'{OUT}/sprites/tenda_buka_{o}__belakang.png')
            files['depan'] = save(Image.fromarray(outs['front']), f'{OUT}/sprites/tenda_buka_{o}__depan.png')
            im = Image.fromarray(outs['back']); im.alpha_composite(Image.fromarray(outs['front']))
            files['utuh_preview'] = save(im, f'{OUT}/sprites/tenda_buka_{o}.png')
        h, w = list(outs.values())[0].shape[:2]
        info['tent'][f'tenda_{st}_{o}'] = dict(files=files, size=[w, h], pivot=refs['pivot'], anchors={k: v for k, v in refs.items() if k != 'pivot'})
PROPS = {}
for n in ('alas_kardus', 'kantong_plastik', 'cangkir_kaleng'):
    for o in ('sw', 'se'):
        i, g, p, a = T.build(n, o); im = Image.fromarray(i); PROPS[(n, o)] = (im, (int(p[0]), int(p[1])))
        info['props'][f'{n}_{o}'] = dict(file=save(im, f'{OUT}/props/{n}_{o}.png'), size=list(im.size), pivot=[int(p[0]), int(p[1])],
                                         anchor_sudut=[int(a[0]), int(a[1])])
# ---------------------------------------------------------------- frames + sheets
FR = {}
for ch in ('ichsan', 'npc'):
    for v in ('se', 'sw'):
        rows = []
        for ph in S.ORDER_PH:
            fs = [S.frame(ch, ph, f, v) for f in range(len(S.PH[ph]))]; FR[(ch, v, ph)] = fs; rows.append(fs)
        sh = Image.new('RGBA', (FW * 8, FH * len(rows)))
        for ri, fs in enumerate(rows):
            for ci, f in enumerate(fs): sh.alpha_composite(f, (ci * FW, ri * FH))
        info['sheets'][f'spawn_{ch}_{v}'] = dict(file=save(sh, f'{OUT}/sheets/spawn_{ch}_{v}.png'), size=list(sh.size), cols=8,
                                                rows={ph: i for i, ph in enumerate(S.ORDER_PH)}, frames={ph: len(S.PH[ph]) for ph in S.ORDER_PH})
    # outfit lusuh: format sheet game (6 kolom; walk baris 0-3, idle baris 4-7; arah se, sw, ne, nw)
    sh = Image.new('RGBA', (FW * 6, FH * 8)); RAG = {}
    for ai, (anim, n) in enumerate((('walk', 6), ('idle', 4))):
        for di, v in enumerate(('se', 'sw', 'ne', 'nw')):
            for f in range(n):
                im = CH.anim_frame(ch, anim, f, v, ragged=True); RAG[(anim, v, f)] = im
                sh.alpha_composite(im, (f * FW, (ai * 4 + di) * FH))
    FR[(ch, 'rag')] = RAG
    info['sheets'][f'lusuh_{ch}'] = dict(file=save(sh, f'{OUT}/sheets/lusuh_{ch}_walk_idle.png'), size=list(sh.size), cols=6,
                                        rows={'walk_se': 0, 'walk_sw': 1, 'walk_ne': 2, 'walk_nw': 3, 'idle_se': 4, 'idle_sw': 5, 'idle_ne': 6, 'idle_nw': 7},
                                        frames={'walk': 6, 'idle': 4})
# ---------------------------------------------------------------- mock dunia (taman -> trotoar -> kerb -> aspal)
sys.path.insert(0, 'assets/street_buildings/_work')
from lib import Spr, Loc, MI, pave
def world_ground():
    sp = Spr(1500, 1000, 750, 300)                                            # kanvas dunia (1x)
    def f(c, r):
        h = (np.floor(c * 16).astype(int) * 73856093 ^ np.floor(r * 16).astype(int) * 19349663) % 97
        grass = r < 4.3; side = (r >= 4.3) & (r < 5.7); curb = (r >= 5.7) & (r < 5.9)
        m = np.where(grass, MI['GRASS'], np.where(side, MI['PAVE'], np.where(curb, MI['CONC'], MI['ASPH'])))
        tg = np.where(h < 9, 3, np.where(h > 90, 1, 2))
        pm, pt = pave(c, r)
        tp = np.where(((c * 1.0) % 1 < 0.5) & (np.abs(r - 6.7) < 0.04), 4, 2)                     # marka putus-putus
        t = np.where(grass, tg, np.where(side, pt, np.where(curb, 3, tp)))
        m = np.where(side, pm, m)
        return m.astype(np.int16), t.astype(np.int8)
    sp.top(-8, -8, 16, 14, 0, f, shift=0, ground=True)
    o, g = sp.render(edges=False); return Image.fromarray(o), sp
GROUND, GSP = world_ground()
def tent_origin(o):
    """letak tenda di dunia (Loc c0/r0) -> offset paste (piksel) dari sprite tenda"""
    c0, r0 = (1.6, 1.25) if o == 'sw' else (1.0, 1.7)
    return c0, r0
def world_pt(o, a, b):
    c0, r0 = tent_origin(o); L = Loc(GSP, o, T.W, T.D, c0, r0); c, r = L.cr(a, b); return GSP.X(c, r), GSP.Y(c, r)
def tent_paste_xy(o, st):
    outs, refs = TENT[(st, o)]; wx, wy = world_pt(o, T.W / 2, T.D / 2); return wx - refs['pivot'][0], wy - refs['pivot'][1]
def scene(o, st, char=None, root_ab=None, props=True, dy_extra=0):
    im = GROUND.copy(); outs, refs = TENT[(st, o)]; px, py = tent_paste_xy(o, st)
    if props:
        for (n, a, b) in (('kantong_plastik', T.TW + 0.3, 0.9), ('cangkir_kaleng', T.TW + 0.12, 0.55)):
            pi, pv = PROPS[(n, o)]; x, y = world_pt(o, a, b); im.alpha_composite(pi, (x - pv[0], y - pv[1]))
    lay = ['all'] if st == 'tutup' else ['back', 'front']
    inside = root_ab is not None and root_ab[1] > T.TB0 - 0.05
    def draw_char():
        if char is None: return
        x, y = world_pt(o, *root_ab); im.alpha_composite(char, (x - PIV[0], y - PIV[1] + dy_extra))
    for ly in lay:
        if ly == 'front' and inside: draw_char()
        im.alpha_composite(Image.fromarray(outs[ly]), (px, py))
    if not inside: draw_char()
    return im
B_TIDUR, B_START, B_END = 1.0, 1.0, -0.45
def seq(ch, o):
    """list (img, ms, fase, frame) urutan spawn lengkap di mock"""
    out = []
    out.append((scene(o, 'tutup'), 900, 'tenda_tutup', 0))
    for f, im in enumerate(FR[(ch, o, 'bangun')]):
        out.append((scene(o, 'buka', im, (T.TW / 2, B_TIDUR), dy_extra=14), S.MS['bangun'][f], 'bangun', f))
    n = len(FR[(ch, o, 'merangkak')])
    for f, im in enumerate(FR[(ch, o, 'merangkak')]):
        b = B_START + (B_END - B_START) * (f + 1) / n
        out.append((scene(o, 'buka', im, (T.TW / 2, b)), S.MS['merangkak'][f], 'merangkak', f))
    for ph in ('berdiri', 'peregangan', 'menoleh'):
        for f, im in enumerate(FR[(ch, o, ph)]):
            out.append((scene(o, 'buka', im, (T.TW / 2, B_END)), S.MS[ph][f], ph, f))
    walk = [CH.anim_frame(ch, 'walk', f, o, True) for f in range(6)]
    for k in range(12):                                                    # jalan keluar ke trotoar
        b = B_END - 0.12 * (k + 1)
        out.append((scene(o, 'buka', walk[k % 6], (T.TW / 2, b)), 110, 'jalan', k % 6))
    return out
def crop(im, o):
    x1, y1 = world_pt(o, T.W / 2, T.D / 2); x2, y2 = world_pt(o, T.TW / 2, B_END - 1.2)
    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2 - 30
    return im.crop((cx - 170, cy - 130, cx + 170, cy + 130))
for ch in ('ichsan', 'npc'):
    for o in ('sw', 'se'):
        sq = seq(ch, o)
        frames = [up(crop(im, o), 3).convert('RGB') for im, ms, ph, f in sq]
        pal_src = frames[0].quantize(colors=255, method=Image.Quantize.MEDIANCUT)
        big = Image.new('RGB', (frames[0].width, frames[0].height * len(frames)))
        for i, fr in enumerate(frames): big.paste(fr, (0, i * fr.height))
        pq = big.quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        qf = [fr.quantize(palette=pq, dither=Image.Dither.NONE) for fr in frames]
        p = f'{OUT}/mock/spawn_{ch}_tenda_{o}_3x.gif'
        qf[0].save(p, save_all=True, append_images=qf[1:], duration=[ms for _, ms, _, _ in sq], loop=0, disposal=1, optimize=False)
        info['mock'][f'gif_{ch}_{o}'] = dict(file=os.path.relpath(p, OUT), scale=3, frames=len(sq), ms_total=sum(ms for _, ms, _, _ in sq),
                                           bytes=os.path.getsize(p), size=list(frames[0].size))
        if ch == 'ichsan':
            picks = {'tutup': 0, 'bangun': 3, 'merangkak': 9, 'peregangan': 23, 'menoleh': 29}
            for nm, i in picks.items():
                im1 = crop(sq[i][0], o); save(im1, f'{OUT}/mock/1x_native/mock_{o}_{nm}_1x.png')
                info['mock'][f'still_{o}_{nm}'] = dict(file=save(up(im1, 4), f'{OUT}/mock/mock_{o}_{nm}_4x.png'), seq_index=i, phase=sq[i][2])
# ---------------------------------------------------------------- contact sheets 4x (latar gelap)
BG = (24, 27, 34, 255)
def grid(rows, pad=4):
    w = max(sum(i.width for i in r) + pad * (len(r) + 1) for r in rows); h = sum(max(i.height for i in r) + pad for r in rows) + pad
    c = Image.new('RGBA', (w, h), BG); y = pad
    for r in rows:
        x = pad; rh = max(i.height for i in r)
        for i in r: c.alpha_composite(i, (x, y + rh - i.height)); x += i.width + pad
        y += rh + pad
    return c
for ch in ('ichsan', 'npc'):
    rows = [FR[(ch, 'se', ph)] for ph in S.ORDER_PH] + [FR[(ch, 'sw', ph)] for ph in S.ORDER_PH]
    rag = FR[(ch, 'rag')]
    rows += [[rag[('walk', v, f)] for f in range(6)] + [rag[('idle', v, f)] for f in range(4)] for v in ('se', 'sw', 'ne', 'nw')]
    c = grid(rows); info['mock'][f'kontak_{ch}'] = dict(file=save(up(c, 4), f'{OUT}/mock/kontak_{ch}_4x.png'), size=[c.width * 4, c.height * 4])
rows = [[Image.fromarray(TENT[(st, o)][0]['all']) if st == 'tutup' else Image.alpha_composite(Image.fromarray(TENT[(st, o)][0]['back']), Image.fromarray(TENT[(st, o)][0]['front']))
         for st in ('tutup', 'buka') for o in ('sw', 'se')],
        [Image.fromarray(TENT[('buka', o)][0][ly]) for o in ('sw', 'se') for ly in ('back', 'front')],
        [PROPS[(n, o)][0] for n in ('alas_kardus', 'kantong_plastik', 'cangkir_kaleng') for o in ('sw', 'se')]]
c = grid(rows, 8); info['mock']['kontak_tenda_props'] = dict(file=save(up(c, 4), f'{OUT}/mock/kontak_tenda_props_4x.png'), size=[c.width * 4, c.height * 4])
info['spawn'] = dict(order=S.ORDER_PH, frames={ph: len(S.PH[ph]) for ph in S.ORDER_PH}, ms=S.MS,
                     mock_root_b=dict(tidur=B_TIDUR, start=B_START, end=B_END), bangun_pivot_offset=[0, 14])
json.dump(info, open(f'{OUT}/src/_build.json', 'w'), indent=1, default=int)
print(json.dumps({k: v for k, v in info['mock'].items()}, indent=0, default=int))
