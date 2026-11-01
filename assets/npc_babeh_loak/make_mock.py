#!/usr/bin/env python3
"""mock_lorong_babeh_4x.png: the street_buildings close-up of the loak lane ('kamera seberang' coords, as street_buildings/_work/closeup.py)
with the old box vendors removed (pedagang_duduk prop + the seated box figures inside the lapak sprites re-rendered in memory
without person_seated) and the 3 babeh placed. Nothing in street_buildings is written. PREVIEW ONLY."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, 'assets/street_buildings/_work')
import numpy as np
from PIL import Image
import scene as SC, gang, lib
sys.path.insert(0, HERE)
from make_outputs import etalase

gang.person_seated = lambda *a, **k: None                      # old box vendors off (in memory only)
CUSTOM = {}
for key in ('lapak_tas_b_se', 'lapak_jam_dinding_se', 'lapak_jam_tangan_nw', 'lapak_barang_bekas_nw'):
    name, ori = key.rsplit('_', 1); img, gl, piv, anc = lib.build(name, ori)
    CUSTOM[key] = (Image.fromarray(img), Image.fromarray(gl) if gl[..., 3].any() else None, piv)
F = lambda p: Image.open(f'{HERE}/frames/{p}.png')
CUSTOM['babeh_pemilik'] = (F('babeh_pemilik_se_counter_f4'), None, (32, 100))
CUSTOM['babeh_jam'] = (F('babeh_jam_se_sit_f0'), None, (32, 100))
CUSTOM['babeh_tas'] = (F('babeh_tas_se_count_f2'), None, (32, 100))
CUSTOM['babeh_jam_tangan_back'] = (F('babeh_jam_nw_offer_f1'), None, (32, 100))
et, G = etalase('se'); CUSTOM['etalase'] = (et, None, G)
_load = SC.load
SC.load = lambda key: CUSTOM[key] if key in CUSTOM else _load(key)

def mock():
    S = SC.Scene(11, 28, 12, 34, 300)
    for r in (29.35, 25.35, 21.35): S.put('lorong_lurus_sw', 20.0, r, ground=True)
    S.put('lorong_tikungan_sw', 20.0, 18.35, ground=True)
    S.put('gapura_gang_sw', 20.0, 31.05)
    for n, r in [('lapak_tas_se', 29.6), ('lapak_jam_dinding_se', 27.6), ('lapak_aksesori_se', 25.6), ('lapak_tas_b_se', 23.6)]: S.put(n, 18.25, r)
    S.put('toko_loak_se', 17.25, 20.6)
    for n, c, r in [('lapak_jam_tangan_nw', 21.75, 29.6), ('lapak_mainan_nw', 21.75, 27.6), ('motor_parkir_merah_nw', 21.5, 25.6), ('lapak_barang_bekas_nw', 21.75, 23.6)]: S.put(n, c, r)
    S.put('kardus_tumpuk_se', 22.15, 25.2)
    # --- babeh (replacing pedagang_duduk_b_nw at 22.35, 28.3 and the box figures baked in the lapak)
    S.put('babeh_jam', 19.3, 26.7)                          # seated on his blue stool in front of the wall-clock lapak, facing the lane
    S.put('babeh_tas', 19.4, 28.3)                            # weighing a bag at the bag lapak by the gapura
    S.put('babeh_pemilik', 17.45, 20.75)                      # behind the toko loak counter (counter_rect c' 17.75..18.15)
    S.put('etalase', 17.95, 20.6)                             # glass counter prop drawn over him at the counter line
    S.put('babeh_jam_tangan_back', 22.45, 28.6)               # 2nd lane: same Babeh Jam rig seen from behind (nw) at the watch lapak
    for n, c, r in [('rumah_kampung_b_se', 14.4, 29.8), ('rumah_kampung_c_se', 14.4, 26.6), ('rumah_kampung_e_se', 14.4, 23.4), ('rumah_kampung_a_sw', 16.0, 16.2),
                    ('rumah_kampung_d_sw', 23.5, 16.6), ('rumah_kampung_c_sw', 26.0, 20.0)]: S.put(n, c, r)
    S.put('pos_ronda_se', 25.5, 23.5); S.put('jemuran_se', 24.6, 27.5); S.put('pot_tanaman_se', 16.7, 31.0); S.put('pot_tanaman_se', 23.0, 31.0)
    S.put('motor_parkir_hitam_se', 16.5, 32.0); S.put('tiang_listrik_se', 22.75, 30.9); S.put('tiang_listrik_se', 23.0, 22.6)
    S.cables.append((22.75, 30.9, 23.0, 22.6, 222)); S.cables.append((23.0, 22.6, 23.2, 15.0, 222))
    S.put('pohon_kiara_payung', 25.8, 30.6); S.put('tembok_gang_b_se', 24.7, 25.2)
    img, glow = S.render(SC.street_ground(lambda c, r: (r < 31.35)), 11, 28, 12, 34)
    return S, img

if __name__ == '__main__':
    S, img = mock()
    a = np.array(img); ys, xs = np.nonzero(a[..., 3]); img = img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    bg = Image.new('RGBA', img.size, (42, 158, 82, 255)); bg.alpha_composite(img); img = bg
    # crop to the lane (gapura -> toko loak)
    X = lambda c, r: S.g.X(c, r) - xs.min(); Y = lambda c, r: S.g.Y(c, r) - ys.min()
    x0 = X(15.0, 31.5) - 40; x1 = X(23.5, 19.0) + 60; y0 = Y(16.0, 18.5) - 150; y1 = Y(22.5, 31.5) + 30
    img = img.crop((max(0, x0), max(0, y0), min(img.width, x1), min(img.height, y1)))
    img.convert('RGB').resize((img.width * 4, img.height * 4), Image.NEAREST).save(f'{HERE}/mock_lorong_babeh_4x.png')
    print(img.size)
