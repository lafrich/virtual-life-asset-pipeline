"""Varian PENDEK (2 lantai) gedung jalan besar untuk deretan seberang di kamera standar: tingginya dibatasi supaya atapnya tidak
menutupi jalan raya (lihat README 'mock_gabungan_v2'). Same materials / textures as roadside.py (no new colours), fewer floors."""
from lib import *
from roadside import office_front, office_side, side_plain, ruko
@asset('kantor_a_pendek', 'pendek', 7, 6, 300, note='kantor_a versi pendek 2 lantai (MENARA SIRIH), kaca biru + pita beton')
def kantor_a_p(L):
    W, D, B, F = 7, 6, 1.25, 2; H = GF + (F - 1) * FH + 10
    ground(L, 0, 0, W, D); bshadow(L, 0, B, W, D, H)
    L.box(0, B, W, D, 0, H, 'CONC', 3, front=office_front(F, name='MENARA SIRIH'), side=office_side(F))
    L.box(2.2, B - 0.9, 4.8, B, GF - 20, GF - 14, 'DARK', 3)
    for a in (2.35, 4.55): L.box(a, B - 0.85, a + 0.1, B - 0.75, 0, GF - 20, 'CONC', 4)
    roof_flat(L, 0, B, W, D, H, ph=10, pm='CONC'); ac_unit(L, 4, 3, H); ac_unit(L, 4.7, 3, H)
    L.box(0.3, 0.25, 1.6, 0.5, 0, 14, 'CONC', 2, front=lambda w, h: Tex(w, h, 'DARK', 3).text(w // 2, 4, 'MS', 'GOLD', 3))
@asset('bank_bca_pendek', 'pendek', 6, 6, 260, note='bank BCA versi pendek 2 lantai, papan BCA di tepi atap lebih rendah')
def bca_p(L):
    W, D, B = 6, 6, 1.25; H = GF + FH + 8
    ground(L, 0, 0, W, D); bshadow(L, 0, B, W, D, H)
    def front(Wp, Hh):
        tx = Tex(Wp, Hh, 'WHITE', 3); tx.rect(0, 0, Wp, GF, 'BLUE', 2)
        tx.rect(10, 4, Wp - 70, GF - 20, 'GLASS', 2)
        for u in range(10, Wp - 70, 20): tx.rect(u, 4, u + 1, GF - 20, 'DARK', 2)
        glassdoor(tx, 40, 30, 70)
        tx.rect(Wp - 62, 4, Wp - 8, GF - 20, 'LITE', 3, glow=True)
        for i in range(3):
            u = Wp - 58 + i * 17; tx.rect(u, 4, u + 13, 56, 'CONC', 3, glow=True); tx.rect(u + 2, 34, u + 11, 44, 'BLUE', 3, glow=True); tx.rect(u + 3, 26, u + 10, 28, 'DARK', 2, glow=True)
        tx.text(Wp - 35, GF - 30, 'ATM', 'BLUE', 2, glow=True)
        for i in range(5): window(tx, 10 + i * 36, GF + 22, 24, 46, glass='OGLASS')
        tx.rect(0, GF, Wp, GF + 6, 'BLUE', 3); return tx
    L.box(0, B, W, D, 0, H, 'WHITE', 3, front=front, side=side_plain('WHITE', [(0, GF, 'BLUE', 2), (GF, GF + 6, 'BLUE', 3)], [(0.3, GF + 22, 24, 46), (0.65, GF + 22, 24, 46)]))
    def sign(Wp, Hh):
        tx = Tex(Wp, Hh, 'BLUE', 3); tx.rect(0, 0, Wp, Hh, 'BLUE', 3, glow=True); tx.rect(2, 2, Wp - 2, Hh - 2, 'BLUE', 2, glow=True)
        tx.text(Wp // 2, 6, 'BCA', 'LITE', 4, sc=3, glow=True, bold=True); return tx
    L.box(1.8, B + 0.1, 4.2, B + 0.35, H, H + 30, 'BLUE', 3, front=sign, side=lambda w, h: Tex(w, h, 'BLUE', 2))
    def sign2(Wp, Hh):
        tx = Tex(Wp, Hh, 'LITE', 4); tx.rect(0, 0, Wp, Hh, 'LITE', 4, glow=True); tx.text(Wp // 2, 4, 'BANK BCA', 'BLUE', 2, glow=True); return tx
    L.box(0.2, B - 0.1, 3.4, B, GF - 18, GF - 4, 'LITE', 4, front=sign2)
    roof_flat(L, 0, B, W, D, H, ph=8, pm='WHITE'); ac_unit(L, 1, 4.6, H); ac_unit(L, 1.7, 4.6, H)
    L.box(4.8, 0.3, 5.4, 0.75, 0, 52, 'BLUE', 3, front=lambda w, h: Tex(w, h, 'BLUE', 3).rect(3, 26, w - 3, 38, 'LITE', 4, glow=True).text(w // 2, 42, 'ATM', 'LITE', 4, glow=True))
@asset('hotel_pendek', 'pendek', 8, 6, 300, note='hotel versi pendek 2 lantai, papan HOTEL vertikal lebih pendek, porte-cochere')
def hotel_p(L):
    W, D, B, F = 8, 6, 1.5, 2; H = GF + (F - 1) * FH + 10
    ground(L, 0, 0, W, D); bshadow(L, 0, B, W, D, H)
    def front(Wp, Hh):
        tx = Tex(Wp, Hh, 'CREAM', 3)
        tx.rect(20, 0, Wp - 20, GF - 14, 'GLASS', 2); glassdoor(tx, Wp // 2 - 20, 40, 72); tx.rect(20, 72, Wp - 20, GF - 14, 'WARM', 3, glow=True)
        for u in range(20, Wp - 20, 22): tx.rect(u, 0, u + 2, GF - 14, 'GOLD', 2)
        z = GF
        for i in range(6):
            u = 14 + i * 38; lit = (i * 3 % 7) < 3
            window(tx, u, z + 18, 26, 52, lit=lit, frame='WOOD', sill=None)
            tx.rect(u - 4, z + 8, u + 30, z + 12, 'CREAM', 4); tx.rect(u - 4, z + 12, u + 30, z + 28, 'DARK', 3)
            for x in range(u - 4, u + 30, 3): tx.rect(x, z + 12, x + 1, z + 28, 'DARK', 4)
        tx.rect(0, Hh - 12, Wp, Hh, 'CREAM', 4); return tx
    L.box(0, B, W, D, 0, H, 'CREAM', 3, front=front, side=side_plain('CREAM', [(0, 4, 'CONC', 3)], [(0.3, GF + 30, 22, 46), (0.7, GF + 30, 22, 46)]))
    L.box(2.3, 0.35, 5.7, B, GF - 12, GF - 2, 'CREAM', 4, front=lambda w, h: Tex(w, h, 'GOLD', 2).text(w // 2, 2, 'HOTEL SIRIH', 'LITE', 4, glow=True))
    for a in (2.45, 5.45): L.box(a, 0.45, a + 0.15, 0.6, 0, GF - 12, 'CREAM', 4)
    def vs(Wp, Hh):
        tx = Tex(Wp, Hh, 'RED', 2); tx.rect(0, 0, Wp, Hh, 'RED', 2, glow=True)
        for i, ch in enumerate('HOTEL'): tx.text(Wp // 2, Hh - 14 - i * 14, ch, 'LITE', 4, sc=1, glow=True)
        return tx
    L.box(0.2, B - 0.25, 0.65, B, GF + 2, GF + 80, 'RED', 2, front=vs, side=lambda w, h: Tex(w, h, 'RED', 1))
    roof_flat(L, 0, B, W, D, H, ph=10, pm='CREAM'); toren(L, 1.5, 4.5, H, 'BLUE'); toren(L, 2.4, 4.5, H, 'BLUE')
@asset('mall_pendek', 'pendek', 12, 7, 300, note='mal versi pendek 2 lantai, atrium kaca, papan SIRIH MALL')
def mall_p(L):
    W, D, B = 12, 7, 1.6; H = GF + 80
    ground(L, 0, 0, W, D, lambda a, b: pave(a, b, 3, 1.0)); bshadow(L, 0, B, W, D, H)
    def front(Wp, Hh):
        tx = Tex(Wp, Hh, 'WHITE', 2)
        for u in range(0, Wp, 32): tx.rect(u, 0, u + 1, Hh, 'WHITE', 1)
        tx.rect(0, GF, Wp, GF + 1, 'WHITE', 1)
        for i in range(4): shelves(tx, 10 + i * 40, 6, 30, 60, seed=10 + i)
        for i in range(4): shelves(tx, Wp - 170 + i * 40, 6, 30, 60, seed=20 + i)
        tx.rect(30, GF + 8, 90, GF + 70, 'PINK', 2); tx.text(60, GF + 46, 'SALE', 'LITE', 4, sc=2); tx.text(60, GF + 26, '50%', 'LITE', 4, sc=2)
        tx.rect(Wp - 90, GF + 8, Wp - 30, GF + 70, 'TEAL', 2); tx.text(Wp - 60, GF + 46, 'NEW', 'LITE', 4, sc=2)
        tx.rect(0, 0, Wp, 3, 'CONC', 2); return tx
    L.box(0, B, W, D, 0, H, 'WHITE', 2, front=front, side=side_plain('WHITE', [(0, 3, 'CONC', 2)]))
    def atr(Wp, Hh):
        tx = Tex(Wp, Hh, 'OGLASS', 2)
        for u in range(0, Wp, 16): tx.rect(u, 0, u + 1, Hh, 'DARK', 3)
        for z in range(0, Hh, 26): tx.rect(0, z, Wp, z + 1, 'DARK', 3)
        tx.rect(0, GF, Wp, GF + 4, 'CONC', 3); tx.rect(0, 0, Wp, GF - 20, 'LITE', 3, glow=True); glassdoor(tx, Wp // 2 - 24, 48, 70)
        for u in range(8, Wp, 16): tx.rect(u, GF + 20, u + 6, GF + 60, 'WARM', 3, glow=True)
        return tx
    L.box(4, B - 0.6, 8, B + 1.5, 0, H + 16, 'OGLASS', 2, front=atr, side=lambda w, h: atr(w, h))
    def sign(Wp, Hh):
        tx = Tex(Wp, Hh, 'DARK', 2); tx.rect(0, 0, Wp, Hh, 'DARK', 2); tx.text(Wp // 2, 6, 'SIRIH MALL', 'WARM', 3, sc=2, glow=True, bold=True); return tx
    L.box(3.8, B - 0.75, 8.2, B - 0.6, GF + 12, GF + 42, 'DARK', 2, front=sign)
    L.box(3.4, 0.2, 8.6, B - 0.6, GF - 14, GF - 6, 'WHITE', 3)
    for a in (3.5, 8.35): L.box(a, 0.3, a + 0.15, 0.45, 0, GF - 14, 'CONC', 4)
    roof_flat(L, 0, B, W, D, H, ph=12, pm='WHITE'); L.top(4, B - 0.6, 8, B + 1.5, H + 16, ('OGLASS', 3))
    for a in (1, 2, 9.5, 10.5): ac_unit(L, a, 5.5, H)
@asset('ruko_a_pendek', 'pendek', 3, 6, 250, note='ruko_a versi 2 lantai (FOTOKOPI)')
def ruko_a_p(L): ruko(L, 2, 'FOTOKOPI', 'YEL', 'CREAM', seed=1)
@asset('ruko_c_pendek', 'pendek', 3, 6, 250, note='ruko_c versi 2 lantai (RM PADANG)')
def ruko_c_p(L): ruko(L, 2, 'RM PADANG', 'RED', 'FYEL', seed=3)
