#!/usr/bin/env python3
"""previews/mock_gabungan_v2_*.png - existing game OUTSIDE (game render, _game_outside_v2_1x.png: world x -930..860, y -200..910)
+ far-side row v2 chosen from the camera geometry so that NOTHING covers the main road:
  * every far-side sprite must satisfy  min ground-r covered on screen >= 36.55 (far kerb) -> road, zebra, traffic, near side all visible
  * row fronts at r = F (local road r F..F+4); lots pushed back from the far sidewalk (lawn belt between), tall buildings as 2-storey 'pendek'
  * Indomaret: paved forecourt (2.5 deep) inside its lot with motor bays, kang parkir there, sad pemuda on the terrace
  * Toko Loak inside the gang (left side, facing the lane), lapak + babeh along the lane
PREVIEW ONLY.  usage: python3 mock_gabungan_v2.py"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
sys.path.insert(0, 'assets/npc_babeh_loak')
import numpy as np
from PIL import Image
import scene as SC
from engine import Spr, MI
from lib import pave
from gang import gangfloor
from make_outputs import etalase
X0W, Y0W = -930, -200
GAME = Image.open(f'{HERE}/_game_outside_v2_1x.png').convert('RGBA')
OX, OY = 2 * (468 - X0W), 2 * (70 - Y0W)
F = 51.0                     # facade line of the far-side row; jalan lokal r F..F+4
ROAD_SAFE = 36.55            # far kerb of the main road: nothing may cover r < this
NPC = 'assets'
Fr = lambda d, p: (Image.open(f'{NPC}/{d}/frames/{p}.png'), None, (32, 100))
et, G = etalase('se')
CUSTOM = {'kang_parkir': Fr('npc_kang_parkir', 'kang_parkir_se_direct_f3'), 'kang_parkir_b': Fr('npc_kang_parkir', 'kang_parkir_sw_whistle_f1'),
          'pemuda': Fr('npc_pemuda_golda', 'pemuda_golda_se_drink_f2'),
          'babeh_jam': Fr('npc_babeh_loak', 'babeh_jam_se_sit_f0'), 'babeh_tas': Fr('npc_babeh_loak', 'babeh_tas_se_count_f2'),
          'babeh_pemilik': Fr('npc_babeh_loak', 'babeh_pemilik_se_counter_f4'), 'etalase': (et, None, G)}
_load = SC.load; SC.load = lambda k: CUSTOM[k] if k in CUSTOM else _load(k)

# ---- layout (game coords) ---------------------------------------------------------------------------------------------
ROW = [('mall_pendek', -29.5, 12, 7), ('hotel_pendek', -17.5, 8, 6), ('indomaret', -9.5, 6, 6), ('kafe_blue_doors', -3.5, 5, 5), ('bank_bca_pendek', 1.5, 6, 6),
       ('kantor_a_pendek', 7.5, 7, 6), ('ruko_c_pendek', 14.5, 3, 6), ('ruko_a_pendek', 25.5, 3, 6), ('masjid', 28.5, 9, 7)]
INDO_YARD = 2.5              # paved forecourt in front of the Indomaret building, inside its lot
LOTS = {n: (c0, c0 + W, F - D - (INDO_YARD if n == 'indomaret' else 0), F) for n, c0, W, D in ROW}
TOKO = ('toko_loak_se', 19.75, F - 2.5)       # 4 (r) x 3.5 (c): c 18..21.5, r F-4.5..F-0.5, faces the lane (+c)
LANE = (22.0, 24.0)

def ground(c, r):
    m = np.full(c.shape, -1, np.int16); t = np.full(c.shape, 2, np.int8)
    def S(mask, mat, tone):
        nonlocal m, t
        m = np.where(mask, MI[mat], m).astype(np.int16); t = np.where(mask, tone, t).astype(np.int8)
    S((r >= 43.0), 'GRASS', 2); S((r >= 43.0) & (SC.H(c, r) < 6), 'GRASS', 3)        # game lawn stops at r 43: extend it
    for n, (a0, a1, b0, b1) in LOTS.items():
        lot = (c >= a0) & (c < a1) & (r >= b0) & (r < b1); S(lot, 'CONC', 2)
    a0, a1, b0, b1 = LOTS['indomaret']; yd = (c >= a0) & (c < a1) & (r >= F - INDO_YARD) & (r < F)
    pm, pt = pave(c, r); m = np.where(yd, pm, m).astype(np.int16); t = np.where(yd, pt, t).astype(np.int8)
    bay = yd & (r >= F - 2.2) & (r < F - 0.9)
    S(bay & ((((c - a0) % (2 / 3)) < 0.05)), 'LITE', 2); S(yd & (r >= F - 0.95) & (r < F - 0.9) & (c < a1 - 0.2), 'LITE', 2)
    S(yd & (c >= a0 + 3.7) & (c < a0 + 4.6) & (r >= F - 2.2) & (r < F), 'PAVE', 4)                      # walkway to the door, kept free
    gz = (c >= 17.5) & (c < 25.5) & (r >= F - 6) & (r < F); gm, gt = gangfloor(c, r)
    m = np.where(gz, gm, m).astype(np.int16); t = np.where(gz, gt, t).astype(np.int8)               # loak plot (gang floor)
    return m, t

def build_scene():
    S = SC.Scene(-30, 44, 30, 56, 10); S.g = Spr(GAME.width, GAME.height, OX, OY)
    for c0 in range(-30, 36, 2):
        if 20 <= c0 <= 24: continue
        S.put('jalan_lokal_lurus_sw', c0 + 1, F + 2, ground=True)
    S.put('jalan_lokal_zebra_sw', 21.0, F + 2, ground=True); S.put('jalan_lokal_simpang_gang_sw', 23.0, F + 2, ground=True)
    S.put('jalan_lokal_lurus_sw', 25.0, F + 2, ground=True); S.put('jalan_lokal_lurus_sw', 36.5, F + 2, ground=True)
    S.put('jalan_lokal_tikungan_kanan_ke_raya_sw', 39.5, F + 2, ground=True)
    r = F - 1.0
    while r > 38.0: S.put('jalan_lokal_lurus_se', 39.5, r, ground=True); r -= 2.0
    S.put('jalan_lokal_lurus_se', 39.5, 38.7, ground=True); S.put('jalan_lokal_mulut_sw', 39.5, 37.2, ground=True)
    r = F - 2.0                                                                                     # gang lane from the main road to the local road
    while r > 38.5: S.put('lorong_lurus_sw', 23.0, r, ground=True); r -= 4.0
    S.put('lorong_lurus_sw', 23.0, 39.7, ground=True)
    for n, c0, W, D in ROW:
        yard = INDO_YARD if n == 'indomaret' else 0
        S.put(f'{n}_sw', c0 + W / 2, F - yard - D / 2)
    S.put('gapura_gang_sw', 23.0, F - 0.3)
    S.put(*TOKO); S.put('babeh_pemilik', TOKO[1] + 0.2, TOKO[2] + 0.15); S.put('etalase', TOKO[1] + 0.7, TOKO[2])
    for n, rr in [('lapak_tas_se', F - 6.5), ('lapak_jam_dinding_se', F - 8.5)]: S.put(n, 21.25, rr)
    for n, rr in [('lapak_jam_tangan_nw', F - 3.0), ('lapak_mainan_nw', F - 5.0), ('lapak_barang_bekas_nw', F - 7.0)]: S.put(n, 24.75, rr)
    S.put('babeh_tas', 22.25, F - 6.35, dk=0.6); S.put('babeh_jam', 22.3, F - 8.35, dk=0.6)
    a0 = -9.5; fy = F - INDO_YARD
    for col, k in [('hitam', 0), ('merah', 1), ('biru', 2), ('putih', 3)]: S.put(f'motor_matic_{col}_sw', a0 + 1 / 3 + k * 2 / 3, F - 1.55)
    S.put('motor_matic_abu_sw', a0 + 5 + 1 / 3, F - 1.55)
    S.put('kang_parkir', a0 + 3.3, F - 0.45, dk=0.3); S.put('pemuda', a0 + 1.05, fy - 1.15, dk=1.0)
    return S

def signals(S):
    S.put('lampu_pejalan_hijau_sw', 20.45, 32.25); S.put('lampu_pejalan_hijau_sw', 24.55, 32.25)
    S.put('lampu_pejalan_hijau_ne', 20.45, 36.8); S.put('lampu_pejalan_hijau_ne', 24.55, 36.8)

def coverage(S):
    """min ground r covered on screen by each far-side sprite (column-wise back-projection of its opaque pixels to z = 0)"""
    out = {}
    for dk, key, c, r in S.items:
        if r < 37.7: continue
        im, gl, p = SC.load(key); a = np.array(im)[..., 3] == 255
        ys, xs = np.nonzero(a); x = xs + S.g.X(c, r) - p[0]; y = ys + S.g.Y(c, r) - p[1]
        sx = (x + 0.5 - OX) / 32; ty = (y + 0.5 - OY) / 16; rr = (ty - sx) / 2
        out[f'{key} @({c:.2f},{r:.2f})'] = round(float(rr.min()), 2)
    return out

if __name__ == '__main__':
    S = build_scene(); cov = coverage(S)
    bad = {k: v for k, v in cov.items() if v < ROAD_SAFE}
    print('worst:', sorted(cov.items(), key=lambda kv: kv[1])[:6]); print('violations:', bad)
    sig = SC.Scene(18, 27, 31, 38, 10); sig.g = Spr(GAME.width, GAME.height, OX, OY); signals(sig)
    s_img, _ = sig.render(lambda c, r: (np.full(c.shape, -1, np.int16), np.zeros(c.shape, np.int8)), 18, 27, 31, 38)
    f_img, _ = S.render(ground, -30, 44, 37.7, 56.5)
    out = GAME.copy(); out.alpha_composite(s_img); out.alpha_composite(f_img); out = out.convert('RGB')
    P = f'{HERE}/../previews/mock_gabungan_v2'
    out.resize((out.width // 2, out.height // 2), Image.LANCZOS).save(P + '_overview.png')
    out.resize((out.width * 2, out.height * 2), Image.NEAREST).save(P + '_2x.png')
    out.resize((out.width * 4, out.height * 4), Image.NEAREST).save(P + '_4x.png')
    out.save(P + '_1x.png')
    json.dump({'F': F, 'road_safe_r': ROAD_SAFE, 'coverage_min_r': cov}, open(f'{HERE}/_mock_gabungan_v2_coverage.json', 'w'), indent=1)
    print(out.size)
