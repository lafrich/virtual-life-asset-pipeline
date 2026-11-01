"""props_temuan: interactable 'cari barang' spots (v6b engine via street_buildings lib), each with 3 sparkle frames (glow layer:
core 255 + halo alpha 90) used as the 'something here' marker. sw/se oris. PREVIEW ONLY."""
import sys, os, json
sys.path.insert(0, 'assets/street_buildings/_work')
import numpy as np
from PIL import Image
from lib import mk, Loc, Tex, MI, crop, pave
import taman
from gang import gangfloor
OUT = 'assets/item_temuan/props_temuan'
P = {}
def prop(name, W, D, Hmax, nama, lokasi, sparkle, note):
    def deco(fn): P[name] = dict(fn=fn, W=W, D=D, Hmax=Hmax, nama=nama, lokasi=lokasi, sparkle=sparkle, note=note); return fn
    return deco

@prop('tong_sampah_besi', 1, 1, 70, 'Tong sampah', ['trotoar', 'taman', 'belakang_indomaret', 'sekitar_warung'], [(0.45, 0.4, 50), (0.7, 0.6, 30)],
      'tong sampah fiber hijau, tutup miring, kantong kresek menyembul, kaleng di tanah')
def tong(L):
    c, r = L.cr(0.5, 0.5); L.s.ellipse_shadow(c, r, 16, 6, dx=6)
    L.s.cyl(c, r, 0, 40, 0.28, 'GREEN', 3); L.s.cyl(c, r, 36, 40, 0.3, 'GREEN', 2); L.s.cyl(c, r, 14, 17, 0.29, 'YEL', 3)
    L.s.dome(c - 0.05, r - 0.02, 40, 0.18, 8, 'BAGK', 3)
    L.box(0.3, 0.55, 0.85, 0.95, 38, 42, 'GREEN', 3)                         # lid pushed aside
    L.box(0.75, 0.05, 0.95, 0.15, 0, 5, 'RED', 3)                           # can on the ground
@prop('tumpukan_kardus', 1, 1, 80, 'Tumpukan kardus', ['belakang_indomaret', 'sekitar_warung', 'gang'], [(0.4, 0.3, 46), (0.75, 0.5, 20)],
      'tumpukan kardus bekas diikat tali rafia, satu kardus terbuka')
def kardus(L):
    c, r = L.cr(0.5, 0.5); L.s.ellipse_shadow(c, r, 22, 8, dx=8)
    L.box(0.1, 0.25, 0.8, 0.8, 0, 18, 'CARD', 3, front=lambda w, h: Tex(w, h, 'CARD', 3).rect(0, h // 2 - 1, w, h // 2 + 1, 'RED', 3))
    L.box(0.15, 0.3, 0.75, 0.75, 18, 34, 'CARD', 2, front=lambda w, h: Tex(w, h, 'CARD', 2).rect(w // 2 - 1, 0, w // 2 + 1, h, 'RED', 3))
    L.box(0.2, 0.35, 0.6, 0.7, 34, 46, 'CARD', 3); L.top(0.2, 0.35, 0.6, 0.7, 46, lambda a, b: (np.full(a.shape, MI['DARK'], np.int16), np.full(a.shape, 2, np.int8)), shift=0)
    L.box(0.6, 0.85, 0.95, 0.92, 0, 30, 'CARD', 4)                          # flattened sheet leaning
@prop('kantong_kresek', 1, 1, 50, 'Kantong kresek di sudut', ['gang', 'sekitar_warung', 'trotoar', 'belakang_indomaret'], [(0.35, 0.4, 26), (0.7, 0.3, 14)],
      'tiga kantong kresek (hitam, putih, merah) diikat, ditaruh di sudut')
def kresek(L):
    c, r = L.cr(0.5, 0.5); L.s.ellipse_shadow(c, r, 18, 7, dx=6)
    for (a, b, rad, h, m) in ((0.35, 0.55, 0.22, 20, 'BAGK'), (0.65, 0.45, 0.18, 16, 'LITE'), (0.45, 0.2, 0.15, 13, 'RED')):
        cc, rr = L.cr(a, b); L.s.dome(cc, rr, 0, rad, h, m, 3 if m != 'LITE' else 2); L.s.dome(cc, rr, h - 1, 0.05, 5, m, 2)
@prop('got_kecil', 2, 1, 20, 'Got kecil (selokan)', ['gang', 'trotoar', 'jalan'], [(0.7, 0.5, 4), (1.4, 0.5, 6)],
      'segmen got beton 2 sel dengan tutup besi berlubang, air keruh, sampah tersangkut')
def got(L):
    def f(a, b):
        m = np.full(a.shape, MI['CONC'], np.int16); t = np.full(a.shape, 2, np.int8)
        ch = (b > 0.25) & (b < 0.75); m = np.where(ch, MI['WATER'], m); t = np.where(ch, 2, t)
        gr = ch & (a > 0.15) & (a < 1.15); m = np.where(gr, MI['DARK'], m); t = np.where(gr, np.where(((a * 10) % 1) < 0.45, 3, 1), t)
        lip = (np.abs(b - 0.25) < 0.04) | (np.abs(b - 0.75) < 0.04); t = np.where(lip, 3, t)
        return m, t
    L.top(0, 0, 2, 1, 0, f, ground=True, shift=0)
    L.box(1.3, 0.35, 1.7, 0.5, 0, 4, 'GLASS', 4); L.box(1.55, 0.55, 1.75, 0.68, 0, 3, 'CARD', 3)
@prop('kolong_bangku', 2, 1, 60, 'Kolong bangku taman', ['taman'], [(0.8, 0.5, 6), (1.3, 0.4, 3)],
      'bangku taman (sama dengan street_buildings/taman/bangku_taman) dengan koran dan botol terselip di kolongnya')
def kolong(L):
    L.box(0.6, 0.35, 1.0, 0.6, 0, 2, 'LITE', 2); L.box(1.15, 0.45, 1.5, 0.55, 0, 4, 'GLASS', 4)
    taman.bangku(L)
@prop('karung_rongsok', 1, 1, 60, 'Karung rongsokan', ['gang', 'sekitar_warung', 'belakang_indomaret'], [(0.5, 0.5, 40), (0.3, 0.7, 18)],
      'karung plastik putih bergaris berisi rongsokan, mulut karung terbuka')
def karung(L):
    c, r = L.cr(0.5, 0.5); L.s.ellipse_shadow(c, r, 18, 7, dx=6)
    L.s.cyl(c, r, 0, 26, 0.26, 'LITE', 2, tf=lambda P_, Z, mm, t: (mm, np.where((Z % 8) < 1.5, 1, t).astype(np.int8)))
    L.s.dome(c, r, 25, 0.26, 10, 'LITE', 2); L.s.dome(c, r, 33, 0.14, 4, 'DARK', 1)
    L.box(0.3, 0.45, 0.45, 0.6, 34, 42, 'CONC', 3)                          # pipe sticking out

def sparkle(sp, pts, frame):
    """4-point star (glow) at local points; frame 0: plus, 1: big star, 2: dot (blink)"""
    for i, (c, r, z) in enumerate(pts):
        f = (frame + i) % 3; arm = [1, 3, 0][f]
        x, y = sp.X(c, r), sp.Y(c, r) - z
        px = [(0, 0)] + [(d * s, 0) for d in range(1, arm + 1) for s in (-1, 1)] + [(0, d * s) for d in range(1, arm + 1) for s in (-1, 1)]
        for (dx, dy) in px:
            sp.m[y + dy, x + dx] = MI['WARM' if (dx, dy) != (0, 0) else 'LITE']; sp.t[y + dy, x + dx] = 4; sp.g[y + dy, x + dx] = True; sp.d[y + dy, x + dx] = 99
def build(name, ori):
    A = P[name]; sp = mk(A['W'], A['D'], A['Hmax']); L = Loc(sp, ori, A['W'], A['D']); A['fn'](L)
    o, g = sp.render(); c, r = L.cr(A['W'] / 2, A['D'] / 2); piv = (sp.X(c, r), sp.Y(c, r))
    frames = []
    for f in range(3):
        sp2 = mk(A['W'], A['D'], A['Hmax']); L2 = Loc(sp2, ori, A['W'], A['D'])
        sparkle(sp2, [L2.cr(a, b) + (z,) for (a, b, z) in A['sparkle']], f); _, g2 = sp2.render(); frames.append(g2)
    al = np.maximum(o[..., 3], np.max([g[..., 3] for g in frames], 0)); ys, xs = np.nonzero(al)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    if (x1 - x0) % 2: x1 += 1
    cut = lambda a: a[y0:y1, x0:x1]
    return cut(o), [cut(g) for g in frames], (int(piv[0] - x0), int(piv[1] - y0))
if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True); man = {}
    for name, A in P.items():
        for ori in ('sw', 'se'):
            o, fr, piv = build(name, ori); key = f'{name}_{ori}'
            Image.fromarray(o).save(f'{OUT}/{key}.png')
            for i, g in enumerate(fr): Image.fromarray(g).save(f'{OUT}/{key}__kilau_f{i}.png')
            man[key] = {'file': f'props_temuan/{key}.png', 'kilau': [f'props_temuan/{key}__kilau_f{i}.png' for i in range(3)], 'size': [o.shape[1], o.shape[0]], 'pivot': list(piv),
                        'footprint': [A['W'], A['D']], 'facing': ori, 'nama': A['nama'], 'lokasi': A['lokasi'], 'note': A['note']}
            print(key, o.shape[1], o.shape[0], piv)
    # generic sparkle for a loose ground item (16x16, glow layer), 3 frames
    for f in range(3):
        a = np.zeros((16, 16, 4), np.uint8); arm = [1, 3, 0][f]
        from engine import M
        warm = M[MI['WARM']][4]; lite = M[MI['LITE']][4]
        for d in range(-arm, arm + 1):
            for (x, y) in ((8 + d, 8), (8, 8 + d)): a[y, x, :3] = warm; a[y, x, 3] = 255
        a[8, 8, :3] = lite
        core = a[..., 3] == 255; halo = np.zeros_like(core)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1): halo |= np.roll(np.roll(core, dy, 0), dx, 1)
        halo &= ~core; a[halo, :3] = warm; a[halo, 3] = 90
        Image.fromarray(a).save(f'{OUT}/kilau_item_f{f}.png')
    json.dump(man, open('assets/item_temuan/_work/_props.json', 'w'), indent=1)
