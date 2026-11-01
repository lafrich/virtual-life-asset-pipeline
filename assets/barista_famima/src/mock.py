"""Mock counter FamiCafe (FamilyMart interior, preview): lantai keramik putih, dinding hijau + layar menu, counter belakang (mesin espresso,
grinder, pitcher, gelas), counter depan (pickup) + kasir, barista (npc/), pemain Ichsan (sheet game) + pelanggan antre (sheet game raka).
Semua sprite di-composite dengan pivot + urutan kedalaman (c + r)."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import props as PR
from props import *
from common import OUT, audit
PJ = json.load(open(OUT + '/src/_props.json'))
GAME = 'game/assets/chars/'
def sp(key):
    e = PJ[key]; return Image.open(OUT + '/' + e['file']).convert('RGBA'), e['pivot']
def char_frame(sheet, row, col=0):
    im = Image.open(sheet).convert('RGBA'); return im.crop((col * 64, row * 112, col * 64 + 64, row * 112 + 112)), (32, 100)
def bar(name, kind='idle', f=0, view='sw'):
    return Image.open(f'{OUT}/npc/frames/barista_famima_{view}_{kind}_f{f}.png').convert('RGBA'), (32, 100)
C0, C1, R0, R1 = 0.0, 7.0, 0.0, 5.0; WALL = 118
def room(C1=7.0, R1=5.0):
    s = Spr(int((C1 - C0 + R1 - R0) * 32) + 80, int((C1 + R1 - C0 - R0) * 16 + WALL) + 80, int((R1 - C0) * 32) + 40, WALL + 40)
    def floor(c, r):
        t = np.where((((c % 1) < .03) | ((r % 1) < .03)), 3, 4).astype(np.int8)
        t = np.where(((np.abs(r - 3.95) < .08) | (np.abs(r - 1.95) < .06)) & (t == 4), 4, t).astype(np.int8)
        return np.full(c.shape, MI['WHITE'], np.int16), t
    s.top(C0, R0, C1, R1, 0, floor, shift=0, ground=True)
    W1 = int(round((C1 - C0) * 32)); tx = Tex(W1 * 1 + 0, WALL, 'FMG', 3)
    tx.rect(0, 0, W1, 6, 'FMG', 1); tx.rect(0, 6, W1, 44, 'WHITE', 4); tx.rect(0, 44, W1, 47, 'BLUE', 2); tx.rect(0, 108, W1, 112, 'WHITE', 4)
    for k, (u0, col) in enumerate(((40, 'CREAM'), (100, 'FYEL'), (160, 'FBLUE'))):                         # 3 menu screens
        tx.rect(u0, 58, u0 + 50, 92, 'DARK', 1); tx.rect(u0 + 2, 60, u0 + 48, 90, col, 4)
        tx.rect(u0 + 5, 64, u0 + 17, 84, ['RED', 'WOOD', 'FTEAL'][k], 3); tx.rect(u0 + 20, 80, u0 + 45, 86, 'FMG', 3)
        for j in range(3): tx.rect(u0 + 20, 66 + j * 4, u0 + 44 - j * 4, 68 + j * 4, 'DARK', 3)
    tx.text(118, 96, 'FAMICAFE', 'LITE', 4)
    s.face_sw(C0, C1, R0, 0, WALL, tx)
    D1 = int(round((R1 - R0) * 32)); t2 = Tex(D1, WALL, 'WHITE', 3); t2.rect(0, 0, D1, 6, 'FMG', 1); t2.rect(0, 108, D1, 112, 'FMG', 3)
    t2.rect(0, 44, D1, 47, 'FMG', 2)
    s.face_se(R0, R1, C0, 0, WALL, t2)
    o, g = s.render(edges=False); return Image.fromarray(o), s
def compose(C1=7.0, R1=5.0, crop=True):
    base, s = room(C1, R1); items = []
    def add(img, piv, c, r, z=0, dk=0.0): items.append((c + r + dk, img, piv, c, r, z))
    # back counter (machines) along the wall, front pickup counter + kasir
    add(*sp('counter_barista_sw'), 2.5, 0.75, 0, -.4)
    add(*sp('mesin_espresso_sw'), 1.6, 0.6, CZ, 0.0); add(*sp('grinder_sw'), 2.75, 0.62, CZ, 0.0); add(*sp('pitcher_susu_sw'), 3.25, 0.8, CZ, .1)
    for k, key in enumerate(('cup_tutup_R_sw', 'cup_tutup_L_sw', 'gelas_es_R_sw', 'gelas_es_L_sw')): add(*sp(key), 3.45 + k * .12, 0.55 + (k % 2) * .12, CZ, .1)
    add(*sp('counter_barista_sw'), 2.5, 2.75, 0, -.4)
    add(*sp('gelas_es_L_kopi_susu_keluarga_sw'), 1.7, 2.7, CZ, .2); add(*sp('cup_tutup_R_cafe_latte_sw'), 2.0, 2.78, CZ, .2)
    add(*sp('gelas_es_R_matcha_latte_sw'), 2.95, 2.62, CZ, .2)
    add(*sp('counter_kasir_sw'), 5.2, 2.75, 0, -.4)
    # people
    add(*bar('x', 'serah', 2, 'sw'), 2.5, 1.75, 0, 0)
    add(*char_frame(GAME + 'fm_kasir_v6b_sheet.png', 4 + 1), 5.2, 1.75, 0, 0)                       # kasir (game NPC) idle sw
    add(*char_frame(GAME + 'ichsan_v6b_sheet.png', 4 + 2), 2.45, 3.65, 0, 0)                        # pemain: idle ne (menghadap counter)
    add(*char_frame(GAME + 'raka_v6b_sheet.png', 4 + 3), 3.7, 4.35, 0, 0)                           # pelanggan antre: idle nw
    img = base.copy()
    for dk, im, piv, c, r, z in sorted(items, key=lambda t: t[0]):
        x = s.X(c, r) - piv[0]; y = s.Y(c, r) - piv[1] - z; img.alpha_composite(im, (x, y))
    bb = img.getbbox() if crop else (0, 0, 0, 0)
    if crop: img = img.crop(bb)
    return img, (s.X(2.45, 3.65) - bb[0], s.Y(2.45, 3.65) - bb[1]), (s.X(2.5, 1.75) - bb[0], s.Y(2.5, 1.75) - bb[1])
if __name__ == '__main__':
    img, pp, bp = compose()
    img.save(OUT + '/mock_counter_famima_1x.png'); img.resize((img.width * 4, img.height * 4), Image.NEAREST).save(OUT + '/mock_counter_famima_4x.png')
    json.dump({'player_px': pp, 'barista_px': bp, 'size': img.size}, open(OUT + '/src/_mock.json', 'w')); print(img.size, pp, bp)
    print(audit([OUT + '/mock_counter_famima_1x.png']))
