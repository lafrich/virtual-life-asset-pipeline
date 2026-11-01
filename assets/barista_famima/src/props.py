"""Prop FamiCafe (engine street_buildings v6b: iso 2:1, tile 64x32, cahaya kiri, edge = tone gelap material sama, bayangan alpha 56).
Tinggi px mengikuti interior FamilyMart di index.html (counter 11.8 h-unit x 3.2 = ~37 px; mesin kopi 12.2..20 h-unit).
Material baru di engine ini: FMG (hijau FamilyMart) = hex yang sudah ada di index.html (#105824 #16702D #1F8F3A #1FA34A #7FD99A)."""
import sys, os, json, math
sys.path.insert(0, 'assets/street_buildings/_work')
from lib import *
import engine
from common import MENU, OUT, audit
if 'FMG' not in MI: engine.mat('FMG', ['#105824', '#16702D', '#1F8F3A', '#1FA34A', '#7FD99A'])
G = 'famicafe'
CZ = 37                                   # counter top height (px)
LABEL = {'dark': 'DARK', 'card': 'CARD', 'lite': 'LITE', 'coffee': 'WOOD', 'gold': 'GOLD', 'blue': 'BLUE', 'choco': 'SOIL', 'fmg': 'FMG'}
# ---------------------------------------------------------------- helpers
def wall(s, c, r, z0, z1, rad, fn):
    """cylinder wall without cap; fn(phi, z) -> (mat name, tone delta)"""
    ph = np.linspace(0, 2 * np.pi, int(rad * 32 * 16 + 60), endpoint=False); zz = np.arange(z0, z1, 0.5)
    P_, Z = np.meshgrid(ph, zz); n = np.stack([np.cos(P_), np.sin(P_), np.zeros_like(P_)], -1)
    t = engine.shade_n(n.reshape(-1, 3), 3).astype(int); mm = np.zeros(P_.size, np.int16)
    for i, (p, z) in enumerate(zip(P_.ravel(), Z.ravel())):
        m, dt = fn(p, z); mm[i] = MI[m]; t[i] = t[i] + dt
    s.points(c + rad * np.cos(P_), r + rad * np.sin(P_), Z, mm, np.clip(t, 0, 4).astype(np.int8))
def disc(s, c, r, z, rad, m, t, fn=None):
    rr = np.linspace(0, rad, int(rad * 64) + 2); ph = np.linspace(0, 2 * np.pi, int(rad * 32 * 16 + 60), endpoint=False)
    P2, R2 = np.meshgrid(ph, rr); cc = c + R2 * np.cos(P2); rc = r + R2 * np.sin(P2)
    if fn is None: s.points(cc, rc, np.full(P2.shape, z), m, t)
    else:
        M_, T_ = fn(R2.ravel() / rad, P2.ravel()); s.points(cc, rc, np.full(P2.shape, z), M_, T_)
FACE = math.pi / 4                         # world direction (+c,+r) = toward the camera
def near(p, w=.55): return abs(((p - FACE + math.pi) % (2 * math.pi)) - math.pi) < w
# ---------------------------------------------------------------- cups (one cell footprint, drawn at the cell centre; real size exaggerated ~1.6x like item_temuan)
CUP = {'R': dict(h=9, rt=0.062, rb=0.05), 'L': dict(h=12, rt=0.07, rb=0.055)}
def cup_paper(L, size, label='WOOD', lid=False, surf='WOOD'):
    c, r = L.cr(0.5, 0.5); k = CUP[size]; h = k['h']
    def fn(p, z):
        u = z / h
        if .38 < u < .72: return ('LITE', 0) if (near(p, .42) and .44 < u < .66) else ('FMG', 0)
        if .30 < u <= .38: return ('BLUE', 0)
        return ('WHITE', 0)
    for z0 in np.arange(0, h, 0.5):                                         # tapered: stack thin rings
        rad = k['rb'] + (k['rt'] - k['rb']) * z0 / h
        wall(L.s, c, r, z0, z0 + .5, rad, fn)
    if label and not lid:
        pass
    # sticker colour (menu) on the facing side, inside the white tag
    ph = np.linspace(FACE - .22, FACE + .22, 9); zz = np.arange(h * .48, h * .62, .5); P_, Z = np.meshgrid(ph, zz)
    rad = k['rb'] + (k['rt'] - k['rb']) * .55 + .002
    L.s.points(c + rad * np.cos(P_), r + rad * np.sin(P_), Z, MI[label], 2)
    if lid:
        disc(L.s, c, r, h, k['rt'] + .006, 'WHITE', 4); wall(L.s, c, r, h, h + 1.5, k['rt'] - .006, lambda p, z: ('WHITE', 0))
        disc(L.s, c, r, h + 1.5, k['rt'] - .012, 'WHITE', 4); L.s.points([c + .02], [r + .02], [h + 1.6], MI['DARK'], 2)
    else:
        disc(L.s, c, r, h - .5, k['rt'], 'WHITE', 4)
        disc(L.s, c, r, h - 1.0, k['rt'] - .012, surf, 3, fn=lambda u, p: (np.full(u.shape, MI[surf], np.int16),
             np.where(u < .45, 4, np.where(u < .8, 3, 2)).astype(np.int8)))
    L.s.ellipse_shadow(c, r, 6, 3, dx=3)
def cup_es(L, size, label='WOOD', layers=(('LITE', .55), ('WOOD', .45))):
    c, r = L.cr(0.5, 0.5); k = CUP[size]; h = k['h'] + 2
    def fn(p, z):
        u = z / h; acc = 0
        if u > .86: return ('GLASS', 1)
        if near(p, .32) and .4 < u < .58: return (label, -1)
        if near(p, .8) and abs(((p - FACE + math.pi) % (2 * math.pi)) - math.pi) > .6 and u < .8: return ('GLASS', 1)   # clear wall highlight
        for m, f in layers:
            acc += f * .86
            if u <= acc + 1e-6: return (m, 0)
        return (layers[-1][0], 0)
    for z0 in np.arange(0, h, 0.5):
        rad = k['rb'] + (k['rt'] - k['rb']) * z0 / h; wall(L.s, c, r, z0, z0 + .5, rad, fn)
    disc(L.s, c, r, h, k['rt'] + .005, 'GLASS', 4)
    # straw (FMG) up to the right of the lid centre
    zz = np.arange(h, h + 7, .5); L.s.points(np.full(zz.shape, c + .01), np.full(zz.shape, r - .015), zz, MI['FMG'], 3)
    L.s.points(np.full(zz.shape, c + .018), np.full(zz.shape, r - .007), zz, MI['FMG'], 1)
    L.s.ellipse_shadow(c, r, 6, 3, dx=3)
ESL = {   # engine-material layers (bottom -> top) for the iced cups per menu
 'americano': (('WOOD', 1.0),), 'kopi_susu_keluarga': (('CARD', .2), ('CREAM', .8)), 'cafe_latte': (('LITE', .55), ('CREAM', .2), ('WOOD', .25)),
 'cappuccino': (('CREAM', .6), ('LITE', .4)), 'caramel_macchiato': (('LITE', .6), ('WOOD', .25), ('GOLD', .15)), 'dolce_latte': (('LITE', .25), ('CREAM', .75)),
 'vanilla_latte': (('CREAM', 1.0),), 'hazelnut_latte': (('SOIL', .3), ('CREAM', .7)), 'premium_chocolate': (('SOIL', 1.0),), 'matcha_latte': (('LITE', .55), ('FMG', .45))}
SURF = {'americano': 'WOOD', 'premium_chocolate': 'SOIL', 'matcha_latte': 'FMG'}
for size in ('R', 'L'):
    asset(f'gelas_hot_{size}', G, 1, 1, 30, oris=('sw', 'se', 'ne', 'nw'), note=f'gelas kertas FamiCafe {size} terbuka (pita hijau, garis biru, stiker label menu)')(lambda L, s=size: cup_paper(L, s, surf='CARD'))
    asset(f'cup_tutup_{size}', G, 1, 1, 30, oris=('sw', 'se', 'ne', 'nw'), note=f'gelas kertas FamiCafe {size} + tutup (siap diserahkan)')(lambda L, s=size: cup_paper(L, s, lid=True))
    asset(f'gelas_es_{size}', G, 1, 1, 36, oris=('sw', 'se', 'ne', 'nw'), note=f'gelas plastik es {size}: isi berlapis, tutup datar, sedotan hijau, stiker label')(lambda L, s=size: cup_es(L, s))
    for m in MENU:   # label variants (sw only: round cups, the sticker faces the camera)
        lab = LABEL[m['label']]
        asset(f"cup_tutup_{size}_{m['id']}", G + '_label', 1, 1, 30, oris=('sw',), note=f"{m['nama']} hot {size}, tutup, stiker {lab}")(lambda L, s=size, lab=lab: cup_paper(L, s, label=lab, lid=True))
        asset(f"gelas_es_{size}_{m['id']}", G + '_label', 1, 1, 36, oris=('sw',), note=f"{m['nama']} es {size}, stiker {lab}")(lambda L, s=size, lab=lab, mid=m['id']: cup_es(L, s, lab, ESL[mid]))
# ---------------------------------------------------------------- machines
@asset('mesin_espresso', G, 1, 1, 60, oris=('sw', 'se', 'ne', 'nw'), note='mesin espresso 2 group: badan stainless, panel hijau FamilyMart, 2 portafilter, nampan tetes, steam wand, cangkir di atas. diletakkan di atas counter (z +37)')
def espresso(L):
    L.box(0.12, 0.28, 0.88, 0.72, 0, 2, 'DARK', 3)                                                   # feet / base
    def frontf(w, h):
        tx = Tex(w, h, 'CONC', 3); tx.rect(0, h - 6, w, h - 2, 'FMG', 3); tx.rect(0, h - 2, w, h, 'CONC', 4)
        tx.rect(2, h - 5, 8, h - 3, 'LAMPG', 4, glow=True)
        tx.rect(0, 3, w, 5, 'DARK', 2); tx.rect(0, 2, w, 3, 'CONC', 2)
        return tx
    L.box(0.12, 0.3, 0.88, 0.7, 2, 26, 'CONC', 3, front=frontf)
    L.box(0.1, 0.28, 0.9, 0.72, 26, 28, 'CONC', 4)                                                    # top rail
    for a in (0.32, 0.62):                                                                            # 2 cups warming on top
        c, r = L.cr(a, 0.5); L.s.cyl(c, r, 28, 32, 0.035, 'WHITE')
    L.box(0.16, 0.0, 0.84, 0.3, 2, 4, 'DARK', 2)                                                       # drip tray
    for a in (0.3, 0.62):                                                                              # group heads + portafilters
        c, r = L.cr(a + .05, 0.24); L.s.cyl(c, r, 15, 19, 0.06, 'CONC', 4); L.s.cyl(c, r, 13, 15, 0.055, 'DARK', 2)
        L.box(a + .03, 0.02, a + .07, 0.18, 13, 15, "DARK", 1)
        c2, r2 = L.cr(a + .05, 0.12); L.s.cyl(c2, r2, 4, 9, 0.03, 'WHITE')                             # cup under the spout
    c, r = L.cr(0.92, 0.26); L.s.cyl(c, r, 8, 19, 0.012, 'CONC', 4)                                     # steam wand
    c, r = L.cr(0.5, 0.5); L.s.ellipse_shadow(c, r, 26, 10, dx=5)

@asset('grinder', G, 1, 1, 50, oris=('sw', 'se', 'ne', 'nw'), note='grinder kopi: badan gelap, hopper bening berisi biji kopi, corong ke portafilter. di atas counter')
def grinder(L):
    c, r = L.cr(0.5, 0.5)
    L.box(0.36, 0.36, 0.64, 0.64, 0, 3, 'DARK', 3)
    L.s.cyl(c, r, 3, 18, 0.1, 'DARK', 3); L.s.cyl(c, r, 18, 20, 0.11, 'CONC', 4)
    for z0 in np.arange(20, 31, .5):                                                                     # hopper: cone, beans in the lower part
        rad = 0.05 + (z0 - 20) * 0.006
        wall(L.s, c, r, z0, z0 + .5, rad, lambda p, z: (('WOOD', 0) if z < 27 else ('GLASS', 1)))
    disc(L.s, c, r, 31, 0.116, 'DARK', 3)
    cs, rs = L.cr(0.5, 0.36); L.box(0.44, 0.3, 0.56, 0.38, 8, 12, 'CONC', 4)                              # chute
    L.box(0.38, 0.28, 0.62, 0.34, 3, 5, 'DARK', 2)                                                       # fork
    L.box(0.4, 0.62, 0.6, 0.66, 10, 14, 'FMG', 3)                                                         # green dose button panel
    L.s.ellipse_shadow(c, r, 12, 5, dx=4)

@asset('pitcher_susu', G, 1, 1, 24, oris=('sw', 'se', 'ne', 'nw'), note='pitcher susu stainless (ujung tuang + gagang)')
def pitcher(L):
    c, r = L.cr(0.5, 0.5)
    for z0 in np.arange(0, 9, .5):
        rad = 0.05 - abs(z0 - 3.5) * 0.002; wall(L.s, c, r, z0, z0 + .5, rad, lambda p, z: ('CONC', 1))
    disc(L.s, c, r, 8.6, 0.044, 'LITE', 4)
    cs, rs = L.cr(0.5, 0.42); L.s.points([cs, cs + .005], [rs, rs - .005], [9, 9.5], MI['CONC'], 4)            # spout
    L.box(0.48, 0.56, 0.52, 0.6, 2, 8, 'CONC', 2)                                                             # handle
    L.s.ellipse_shadow(c, r, 5, 2, dx=3)

# ---------------------------------------------------------------- counters
def fm_front(label, kasir=False):
    def f(w, h):
        tx = Tex(w, h, 'WHITE', 3)
        tx.rect(0, 3, w, h - 6, 'FMG', 3); tx.rect(0, h - 9, w, h - 6, 'BLUE', 2); tx.rect(0, 3, w, 5, 'FMG', 1)
        tx.rect(0, 0, w, 3, 'WHITE', 1)
        tx.text(w // 2, h - 22, label, 'LITE', 4, sc=1)
        if kasir: tx.rect(w // 2 - 14, 8, w // 2 + 14, 10, 'FMG', 4)
        return tx
    return f
def counter_top(m='WHITE'):
    return lambda a, b: (np.full(a.shape, MI[m], np.int16), np.where(((a * 8) % 1) < .04, 3, 4).astype(np.int8))
@asset('counter_barista', G, 3, 1, 70, oris=('sw', 'se', 'ne', 'nw'), interact={'barista_stand': (1.5, 1.35), 'pelanggan': (1.5, -0.35)},
       note='counter barista FamiCafe 3 sel: badan putih, panel depan hijau + garis biru, tulisan FAMICAFE, top putih (z 37). ne/nw = sisi barista (rak bawah)')
def counter_barista(L):
    L.box(0.0, 0.2, 3.0, 0.95, 0, CZ - 2, 'WHITE', 3, front=fm_front('FAMICAFE'))
    L.box(-0.03, 0.17, 3.03, 0.98, CZ - 2, CZ, 'WHITE', 4, topf=counter_top())
    if L.flip:                                                                                           # back (barista side): open shelves with cups
        pass
    L.box(2.4, 0.3, 2.85, 0.7, CZ, CZ + 2, 'DARK', 2)                                                     # knock box
    bshadow(L, 0, 0.05, 3, 0.95, CZ)
@asset('counter_kasir', G, 2, 1, 70, oris=('sw', 'se', 'ne', 'nw'), interact={'kasir_stand': (1.0, 1.35), 'pelanggan': (1.0, -0.35)},
       note='counter kasir 2 sel: sama dengan counter barista + mesin kasir (layar hijau toska), EDC, tulisan KASIR')
def counter_kasir(L):
    L.box(0.0, 0.2, 2.0, 0.95, 0, CZ - 2, 'WHITE', 3, front=fm_front('KASIR', True))
    L.box(-0.03, 0.17, 2.03, 0.98, CZ - 2, CZ, 'WHITE', 4, topf=counter_top())
    L.box(0.9, 0.45, 1.5, 0.85, CZ, CZ + 6, 'DARK', 3)                                                    # register
    def scr(w, h):
        tx = Tex(w, h, 'DARK', 2); tx.rect(1, 1, w - 1, h - 1, 'FTEAL', 4, glow=True); return tx
    L.box(1.0, 0.55, 1.4, 0.62, CZ + 6, CZ + 14, 'DARK', 3, front=scr)
    L.box(0.35, 0.3, 0.6, 0.55, CZ, CZ + 3, 'DARK', 3); L.box(0.38, 0.33, 0.57, 0.5, CZ + 3, CZ + 4, 'FTEAL', 3)   # EDC
    bshadow(L, 0, 0.05, 2, 0.95, CZ)

def build_all():
    d = OUT + '/props'; os.makedirs(d, exist_ok=True); man = {}
    for name, A in REG.items():
        if A['group'] not in (G, G + '_label'): continue
        for ori in A['oris']:
            img, gl, piv, anc = build(name, ori); fn = f'{name}_{ori}.png'; Image.fromarray(img).save(f'{d}/{fn}')
            e = {'file': f'props/{fn}', 'size': [img.shape[1], img.shape[0]], 'pivot': [int(piv[0]), int(piv[1])], 'anchor_n': [int(anc[0]), int(anc[1])],
                 'footprint': [A['W'], A['D']], 'facing': ori, 'note': A['note'], 'group': A['group']}
            if gl[..., 3].any(): Image.fromarray(gl).save(f'{d}/{name}_{ori}__glow.png'); e['glow'] = f'props/{name}_{ori}__glow.png'
            if A.get('interact'): e['interact_local_ab'] = A['interact']
            man[f'{name}_{ori}'] = e
    return man
if __name__ == '__main__':
    man = build_all(); json.dump(man, open(OUT + '/src/_props.json', 'w'), indent=1); print(len(man), 'sprites')
    import glob; print(audit([p for p in glob.glob(OUT + '/props/*.png')]))
