#!/usr/bin/env python3
"""previews/mock_jalan_tambahan_4x.png: KAMERA STANDAR GAME (tanpa rotasi; koordinat game asli, P(c,r) = ((c-r)*32, (c+r)*16) px sprite).
Jalan raya existing (r 31..37.7, digambar ulang dari index.html OUTSIDE) di bagian atas, deretan seberang memakai varian _sw
(muka ke +r = ke kamera) dengan garis muka r 44.7, lalu jalan lokal baru r 44.7..48.7 di depan muka gedung (paling dekat kamera).
PREVIEW ONLY: index.html tidak diubah."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
from PIL import Image
import scene as SC, lib, jalan_lokal
from lib import MI, pave
from gang import gangfloor, H_
NPC = 'assets'
F = lambda d, p: (Image.open(f'{NPC}/{d}/frames/{p}.png'), None, (32, 100))
CUSTOM = {'kang_parkir': F('npc_kang_parkir', 'kang_parkir_se_direct_f3'), 'pemuda': F('npc_pemuda_golda', 'pemuda_golda_se_drink_f2')}
_load = SC.load; SC.load = lambda k: CUSTOM[k] if k in CUSTOM else _load(k)
FRONT = 44.7                                   # garis muka deretan seberang (= ujung lot r 37.7..44.7)

def ground(c, r):
    """index.html OUTSIDE ground in game coords (lawn, sidewalk, guide strips, kerbs, asphalt, lines, zebra, far sidewalk) + lots"""
    m = np.full(c.shape, MI['GRASS'], np.int16); t = np.where(SC.H(c, r) < 6, 3, 2).astype(np.int8)
    def S(mask, mat, tone):
        nonlocal m, t
        m = np.where(mask, MI[mat], m).astype(np.int16); t = np.where(mask, tone, t).astype(np.int8)
    def P_(mask):
        nonlocal m, t
        pm, pt = pave(c, r); m = np.where(mask, pm, m).astype(np.int16); t = np.where(mask, pt, t).astype(np.int8)
    P_((r >= 31) & (r < 32.5))
    S((r >= 31.95) & (r < 32.25), 'YEL', 3); S((r >= 31.95) & (r < 32.5) & (c >= 20.6) & (c < 24.4), 'YEL', 2)
    S((r >= 32.5) & (r < 32.75), 'SENG', 3); S((r >= 32.62) & (r < 32.75) & ((np.floor(c) % 2) == 0), 'DARK', 1)
    asp = (r >= 32.75) & (r < 36.3); S(asp, 'ASPH', 2); S(asp & (SC.H(c, r) < 5), 'ASPH', 1); S(asp & (SC.H(c, r) > 93), 'ASPH', 3)
    S((r >= 32.75) & (r < 32.83), 'ASPH', 0); S((r >= 36.22) & (r < 36.3), 'ASPH', 0)
    S(((r >= 32.92) & (r < 32.98)) | ((r >= 36.07) & (r < 36.13)), 'LITE', 2)
    S((r >= 34.47) & (r < 34.58) & ((c % 2) < 1) & ((c < 20.6) | (c > 24.4)), 'YEL', 3)
    S((c >= 21.2) & (c < 23.9) & (r >= 32.98) & (r < 36.07) & (((c - 21.2) % 0.6) < 0.32), 'LITE', 3)
    S((r >= 36.3) & (r < 36.55), 'SENG', 3); S((r >= 36.3) & (r < 36.55) & ((np.floor(c) % 2) == 0), 'DARK', 1)
    P_((r >= 36.55) & (r < 37.7))
    S((r >= 36.95) & (r < 37.2), 'YEL', 3); S((r >= 36.55) & (r < 37.0) & (c >= 20.6) & (c < 24.4), 'YEL', 2)
    sd = (c >= 38.5) & (c < 40.8) & (r >= 36.3) & (r < 37.7)                                           # side street mouth: kerb lowered
    S(sd, 'ASPH', 2); S(sd & (r < 36.55), 'YEL', 3)
    lot = (r >= 37.7) & (r < FRONT)
    S(lot, 'CONC', 2); S(lot & (SC.H(c, r) < 8), 'CONC', 1)                                             # back yards / service strip
    gz = (c >= 20.5) & (c < 25.5) & lot; gm, gt = gangfloor(c, r); m = np.where(gz, gm, m).astype(np.int16); t = np.where(gz, gt, t).astype(np.int8)
    return m, t

def mock():
    S = SC.Scene(-12, 44, 29, 51, 720)
    # ---- jalan lokal (ground modules), r 44.7..48.7
    for c0 in range(-12, 36, 2):
        if 20 <= c0 <= 24: continue
        key = 'jalan_lokal_parkir_sw' if -10 <= c0 < -4 else 'jalan_lokal_lurus_sw'
        S.put(key, c0 + 1, FRONT + 2, ground=True)
    S.put('jalan_lokal_zebra_sw', 21.0, FRONT + 2, ground=True); S.put('jalan_lokal_simpang_gang_sw', 23.0, FRONT + 2, ground=True)
    S.put('jalan_lokal_lurus_sw', 25.0, FRONT + 2, ground=True); S.put('jalan_lokal_lurus_sw', 36.5, FRONT + 2, ground=True)
    S.put('jalan_lokal_tikungan_kanan_ke_raya_sw', 39.5, FRONT + 2, ground=True)                       # right end: turns towards the main road
    for r in (43.7, 41.7, 39.7, 38.7): S.put('jalan_lokal_lurus_se', 39.5, r, ground=True)
    S.put('jalan_lokal_mulut_sw', 39.5, 37.2, ground=True)              # _sw = side street running along r
    # gang loak between ruko_b and ruko_a (lane c 22..24, lapak on both sides)
    for r in (39.7, 42.7): S.put('lorong_lurus_sw', 23.0, r, ground=True)
    # ---- deretan seberang, varian _sw (muka ke kamera), garis muka r 44.7
    B = [('indomaret', -9.5, 6, 6), ('kafe_blue_doors', -3.5, 5, 5), ('bank_bca', 1.5, 6, 6), ('kantor_a', 7.5, 7, 6), ('ruko_c', 14.5, 3, 6),
         ('ruko_b', 17.5, 3, 6), ('ruko_a', 25.5, 3, 6), ('masjid', 28.5, 9, 7)]
    for n, c0, W, D in B: S.put(f'{n}_sw', c0 + W / 2, FRONT - D / 2)
    S.put('gapura_gang_sw', 23.0, FRONT - 0.3)
    for n, r in [('lapak_tas_se', 39.2), ('lapak_jam_dinding_se', 41.2)]: S.put(n, 21.25, r)
    for n, r in [('lapak_jam_tangan_nw', 39.2), ('lapak_mainan_nw', 41.2)]: S.put(n, 24.75, r)
    # ---- Indomaret front: motors in the painted bays, kang parkir, sad pemuda on the terrace
    for col, c in [('hitam', -8.5), ('merah', -7.83), ('biru', -6.5), ('putih', -5.83), ('abu', -4.5)]: S.put(f'motor_matic_{col}_sw', c, FRONT + 1.5)
    S.put('pemuda', -8.45, 43.55, dk=1.0); S.put('kang_parkir', -7.15, FRONT + 2.6)
    # ---- main road traffic + poles (far sidewalk)
    S.put('mpv_silver_se', 8.0, 33.05); S.put('sedan_red_nw', 30.0, 34.85); S.put('taxi_bluebird_nw', -2.0, 34.85)
    for c in (-4.0, 12.5, 26.8): S.put('tiang_listrik_sw', c, 37.3)
    S.put('lampu_pejalan_hijau_ne', 20.45, 36.8); S.put('lampu_pejalan_hijau_ne', 24.55, 36.8)
    img, glow = S.render(ground, -12, 44, 29, 51)
    return S, img

if __name__ == '__main__':
    S, img = mock(); X, Y = S.g.X, S.g.Y
    x0 = X(-11.0, 46.5) - 10; x1 = X(42.0, 34.0) - 20; y0 = min(Y(-8, 30.6) - 10, Y(-6.5, 41.7) - 262); y1 = Y(41.5, 48.7) + 10
    img = img.crop((max(0, x0), max(0, y0), x1, y1))
    bg = Image.new('RGBA', img.size, (42, 158, 82, 255)); bg.alpha_composite(img)
    out = sys.argv[1] if len(sys.argv) > 1 else f'{HERE}/../previews/mock_jalan_tambahan_4x.png'
    s = int(sys.argv[2]) if len(sys.argv) > 2 else 4
    bg.convert('RGB').resize((img.width * s, img.height * s), Image.NEAREST).save(out); print(img.size, out)
