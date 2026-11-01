#!/usr/bin/env python3
"""previews/mock_depan_indomaret_4x.png: Indomaret v2 front close-up in 'kamera seberang' coords (game rotated 180 deg, as scene.mock),
with the parked matic motors, kang parkir and the sad Golda pemuda on his black chair. PREVIEW ONLY (no game file touched)."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
from PIL import Image
import scene as SC
NPC = 'assets'
F = lambda d, p: (Image.open(f'{NPC}/{d}/frames/{p}.png'), None, (32, 100))
CUSTOM = {'kang_parkir': F('npc_kang_parkir', 'kang_parkir_se_direct_f3'), 'kang_parkir_b': F('npc_kang_parkir', 'kang_parkir_sw_whistle_f1'),
          'pemuda': F('npc_pemuda_golda', 'pemuda_golda_se_drink_f2')}
_load = SC.load; SC.load = lambda k: CUSTOM[k] if k in CUSTOM else _load(k)
ORI = sys.argv[1] if len(sys.argv) > 1 else 'sw'

def mock():
    S = SC.Scene(40, 58, 22, 38, 420)
    for n, c0, W, D in [('kafe_blue_doors', 41.5, 5, 5), ('indomaret', 46.5, 6, 6)]: S.put(f'{n}_sw', c0 + W / 2, 31.35 - D / 2)
    for i, (col, c) in enumerate([('hitam', 49.55), ('merah', 50.35), ('biru', 51.15), ('putih', 51.95)]): S.put(f'motor_matic_{col}_{ORI}', c, 30.55)
    S.put('motor_matic_abu_' + ORI, 47.4, 30.55)
    S.put('pemuda', 48.15, 30.05)
    S.put('kang_parkir', 48.75, 31.7)
    img, glow = S.render(SC.street_ground(lambda c, r: (c < 0)), 40, 58, 22, 38)
    return S, img

if __name__ == '__main__':
    S, img = mock()
    X = S.g.X; Y = S.g.Y
    x0 = X(46.0, 33.5) - 30; x1 = X(53.2, 28.0) + 40; y0 = Y(46.5, 25.3) - 330; y1 = Y(51, 34.4)
    img = img.crop((x0, y0, x1, y1))
    bg = Image.new('RGBA', img.size, (42, 158, 82, 255)); bg.alpha_composite(img)
    out = f'{HERE}/../previews/mock_depan_indomaret_4x.png' if len(sys.argv) < 3 else sys.argv[2]
    bg.convert('RGB').resize((img.width * 4, img.height * 4), Image.NEAREST).save(out); print(img.size, out)
