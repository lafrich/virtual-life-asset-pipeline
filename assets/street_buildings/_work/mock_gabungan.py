#!/usr/bin/env python3
"""previews/mock_gabungan_scene_*.png: the EXISTING game OUTSIDE (rendered by the game itself, capture_game_outside.py -> _game_outside_1x.png,
far-side trees in the new lots removed) + the proposed far-side row (_sw, fronts at r 44.7) with the jalan lokal r 44.7..48.7, Indomaret front
(motors, kang parkir, sad pemuda), gang loak with babeh, pedestrian signals at the existing zebra. Standard game camera, no rotation.
World rect of the capture: x -690..860, y -200..820 (game units) at 2 px/unit = sprite px.  PREVIEW ONLY.
usage: python3 mock_gabungan.py [occf]   (occf = tall far-side buildings drawn at 30 % like the game's .occf.occl)"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
from PIL import Image
import scene as SC
from engine import Spr
from mock_jalan_tambahan import ground as far_ground, FRONT
OCCF = 'occf' in sys.argv[1:]
X0W, Y0W = -690, -200
GAME = Image.open(f'{HERE}/_game_outside_1x.png').convert('RGBA')
NPC = 'assets'
F = lambda d, p: (Image.open(f'{NPC}/{d}/frames/{p}.png'), None, (32, 100))
CUSTOM = {'kang_parkir': F('npc_kang_parkir', 'kang_parkir_se_direct_f3'), 'pemuda': F('npc_pemuda_golda', 'pemuda_golda_se_drink_f2'),
          'babeh_jam': F('npc_babeh_loak', 'babeh_jam_se_sit_f0'), 'babeh_tas': F('npc_babeh_loak', 'babeh_tas_se_count_f2')}
TALL = {'kantor_a_sw', 'bank_bca_sw', 'masjid_sw', 'hotel_sw', 'mall_sw'}
_load = SC.load
def load(k):
    im, gl, p = CUSTOM[k] if k in CUSTOM else _load(k)
    if OCCF and k in TALL:
        a = np.array(im.convert('RGBA')); a[..., 3] = (a[..., 3].astype(int) * 30 // 100).astype(np.uint8); im = Image.fromarray(a); gl = None
    return im, gl, p
SC.load = load

def gnd(c, r):
    m, t = far_ground(c, r)
    keep = (r >= 37.7) & (r < FRONT) & (c >= -29.5) & (c < 43.5)
    return np.where(keep, m, -1).astype(np.int16), t

def far_layer():
    S = SC.Scene(-30, 44, 30, 50, 10)
    S.g = Spr(GAME.width, GAME.height, 2 * (468 - X0W), 2 * (70 - Y0W))           # same origin as the game capture
    for c0 in range(-30, 36, 2):
        if 20 <= c0 <= 24: continue
        key = 'jalan_lokal_parkir_sw' if -10 <= c0 < -4 else 'jalan_lokal_lurus_sw'
        S.put(key, c0 + 1, FRONT + 2, ground=True)
    S.put('jalan_lokal_zebra_sw', 21.0, FRONT + 2, ground=True); S.put('jalan_lokal_simpang_gang_sw', 23.0, FRONT + 2, ground=True)
    S.put('jalan_lokal_lurus_sw', 25.0, FRONT + 2, ground=True); S.put('jalan_lokal_lurus_sw', 36.5, FRONT + 2, ground=True)
    S.put('jalan_lokal_tikungan_kanan_ke_raya_sw', 39.5, FRONT + 2, ground=True)
    for r in (43.7, 41.7, 39.7, 38.7): S.put('jalan_lokal_lurus_se', 39.5, r, ground=True)
    S.put('jalan_lokal_mulut_sw', 39.5, 37.2, ground=True)
    for r in (39.7, 42.7): S.put('lorong_lurus_sw', 23.0, r, ground=True)
    B = [('mall', -29.5, 12, 7), ('hotel', -17.5, 8, 6), ('indomaret', -9.5, 6, 6), ('kafe_blue_doors', -3.5, 5, 5), ('bank_bca', 1.5, 6, 6), ('kantor_a', 7.5, 7, 6),
         ('ruko_c', 14.5, 3, 6), ('ruko_b', 17.5, 3, 6), ('ruko_a', 25.5, 3, 6), ('masjid', 28.5, 9, 7)]
    for n, c0, W, D in B: S.put(f'{n}_sw', c0 + W / 2, FRONT - D / 2)
    S.put('gapura_gang_sw', 23.0, FRONT - 0.3)
    for n, r in [('lapak_tas_se', 39.2), ('lapak_jam_dinding_se', 41.2)]: S.put(n, 21.25, r)
    for n, r in [('lapak_jam_tangan_nw', 39.2), ('lapak_mainan_nw', 41.2)]: S.put(n, 24.75, r)
    S.put('babeh_tas', 22.25, 39.55, dk=0.6); S.put('babeh_jam', 22.3, 41.55, dk=0.6)
    for col, c in [('hitam', -8.5), ('merah', -7.83), ('biru', -6.5), ('putih', -5.83), ('abu', -4.5)]: S.put(f'motor_matic_{col}_sw', c, FRONT + 1.5)
    S.put('pemuda', -8.45, 43.55, dk=1.0); S.put('kang_parkir', -7.15, FRONT + 2.6)
    img, glow = S.render(gnd, -30, 44, 37.7, 49)
    return img

def signals():
    """pedestrian signals (street_buildings/sinyal, preview) at the suggested spots by the existing zebra"""
    S = SC.Scene(18, 27, 31, 38, 10); S.g = Spr(GAME.width, GAME.height, 2 * (468 - X0W), 2 * (70 - Y0W))
    S.put('lampu_pejalan_hijau_sw', 20.45, 32.25); S.put('lampu_pejalan_hijau_sw', 24.55, 32.25)
    S.put('lampu_pejalan_hijau_ne', 20.45, 36.8); S.put('lampu_pejalan_hijau_ne', 24.55, 36.8)
    img, _ = S.render(lambda c, r: (np.full(c.shape, -1, np.int16), np.zeros(c.shape, np.int8)), 18, 27, 31, 38)
    return img

if __name__ == '__main__':
    out = GAME.copy(); out.alpha_composite(signals()); out.alpha_composite(far_layer())
    out = out.convert('RGB'); P = f'{HERE}/../previews/mock_gabungan_scene' + ('_occf' if OCCF else '')
    out.save(P + '_1x.png'); out.resize((out.width * 2, out.height * 2), Image.NEAREST).save(P + '_2x.png')
    out.resize((out.width * 4, out.height * 4), Image.NEAREST).save(P + '_4x.png')
    out.resize((out.width // 2, out.height // 2), Image.LANCZOS).save(P + '_overview.png')
    print(out.size, P)
