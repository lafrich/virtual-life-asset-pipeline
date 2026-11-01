import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_kamar as K
import props_kamar
from make_kamar import *
sys.path.insert(0, 'assets/anim_ambil_barang')
import make_anim_ambil_barang as AB
O = K.OUT; MAN = {'sprites': {}}
def save(img, name, sub='sprites'):
    p = f'{O}/{sub}/{name}.png'; (img if isinstance(img, Image.Image) else Image.fromarray(img)).save(p); return f'{sub}/{name}.png'
# shell layers (same canvas, same origin)
a, s = K.shell(); b, _ = K.shell('sekat_penuh'); c, _ = K.shell('sekat_rendah')
org = [s.X(0, 0), s.Y(0, 0)]
for nm, im in (('kamar_shell_ruang', a), ('kamar_shell_sekat_penuh', b), ('kamar_shell_sekat_rendah_cutaway', c)):
    MAN['sprites'][nm] = dict(file=save(im, nm), size=list(im.size), origin_px=org, origin_world=[K.C0, K.R0],
                              note='kanvas sama untuk 3 layer; origin_px = titik lantai sudut belakang (c0,r0). px = origin + ((c-c0)-(r-r0))*32 , ((c-c0)+(r-r0))*16')
# furniture
PL = {}
for name in ('kasur_kost', 'wc_gantung', 'papan_berdiri_belum_bisa_disewa', 'papan_berdiri_tersedia'):
    A = REG[name]
    for ori in A['oris']:
        img, gl, piv, anc = build(name, ori); fn = save(img, f'{name}_{ori}')
        e = dict(file=fn, size=[img.shape[1], img.shape[0]], pivot=list(map(int, piv)), anchor_n=list(map(int, anc)), footprint=[A['W'], A['D']], facing=ori, note=A['note'])
        if gl[..., 3].any(): e['glow'] = save(gl, f'{name}_{ori}__glow')
        MAN['sprites'][f'{name}_{ori}'] = e; PL[f'{name}_{ori}'] = (Image.fromarray(img), piv)
# props kamar mandi: ember, ember_air, ember_air_gayung, gayung (4 arah) -> props/
MAN['props'] = {}
for name in ('ember', 'ember_air', 'ember_air_gayung', 'gayung'):
    A = REG[name]
    for ori in A['oris']:
        img, gl, piv, anc = build(name, ori); fn = save(img, f'{name}_{ori}', 'props')
        MAN['props'][f'{name}_{ori}'] = dict(file=fn, size=[img.shape[1], img.shape[0]], pivot=list(map(int, piv)), anchor_n=list(map(int, anc)),
                                            footprint=[A['W'], A['D']], facing=ori, note=A['note'])
        PL[f'{name}_{ori}'] = (Image.fromarray(img), piv)
# doors
DOORST = {'milik': 'ICHSAN', 'milik_orang_lain': 'RAKA', 'terkunci': None, 'tersedia': None}
for st, nm in DOORST.items():
    o, g, p = K.door_sprite(4 if st == 'milik' else 3, st, nm); fn = save(o, f'pintu_lobi_{st}_sw')
    e = dict(file=fn, size=[o.shape[1], o.shape[0]], pivot=list(map(int, p)), facing='sw', note='muka pintu lobi (lebar 1.12 tile, tinggi 31.5 h = 101 px) ditempel di dinding lobi r=r0; pivot = tengah bawah di garis dinding')
    if g[..., 3].any(): e['glow'] = save(g, f'pintu_lobi_{st}_sw__glow')
    MAN['sprites'][f'pintu_lobi_{st}_sw'] = e
# Ichsan (live_v6b + chars/ichsan.json lewat anim_ambil_barang.ichsan_layers)
def ichsan(view):
    base = 'se' if view in ('se', 'sw') else 'ne'; L, _ = AB.ichsan_layers(base); im = AB.compose_idle(L)
    return im.transpose(Image.FLIP_LEFT_RIGHT) if view in ('sw', 'nw') else im
# mock kamar kosong: ruang + kasur + WC + sekat cutaway + Ichsan
EMBER = (8.35, 6.45)                                          # lokal (c-c0, r-r0): sisi kanan kamar mandi, seberang depan WC (WC di r 0.05-0.78), jauh dari ambang r 4.75-5.75
EMBER_DIR = os.environ.get('EMBER_DIR', 'sw')
def mock_room():
    img = a.copy(); items = []
    def add(key, c, r, dk=0.0): im, piv = PL[key]; items.append((c + r + dk, im, piv, c, r))
    add('kasur_kost_sw', lc(-20.45), 1.35); add('wc_gantung_sw', lc(-13.285), .425)
    chs = ichsan('se'); items.append((3.0 + 4.6, chs, (32, 100), 3.0, 4.6))
    for dk, im, piv, c_, r_ in sorted(items, key=lambda t: t[0]): img.alpha_composite(im, (s.X(c_, r_) - int(piv[0]), s.Y(c_, r_) - int(piv[1])))
    img.alpha_composite(c)                                    # sekat rendah (cutaway) terakhir: di depan kamar tidur
    eim, epv = PL[f'ember_air_gayung_{EMBER_DIR}']                      # ember+gayung di sisi kamar mandi (c > PW): digambar setelah sekat
    img.alpha_composite(eim, (s.X(*EMBER) - int(epv[0]), s.Y(*EMBER) - int(epv[1])))
    return img
m = mock_room(); m_bb = m.getbbox(); m = m.crop(m_bb); save(m, 'mock_kamar_kosong_1x', 'mock'); save(m.resize((m.width * 4, m.height * 4), Image.NEAREST), 'mock_kamar_kosong_4x', 'mock')
# mock lobi: 5 pintu dengan status
STATES = [('terkunci', None), ('tersedia', None), ('milik_orang_lain', 'RAKA'), ('milik', 'ICHSAN'), ('milik_orang_lain', 'NOOR')]
lo, lg, ls = K.lobby(STATES); li = lo.copy(); li.alpha_composite(lg)
ip = ichsan('ne'); pc_, pr_ = K.DOORS[2] - K.C0, 0.95
li.alpha_composite(ip, (ls.X(pc_, pr_) - 32, ls.Y(pc_, pr_) - 100))
pb, pp = PL['papan_berdiri_belum_bisa_disewa_sw']; li.alpha_composite(pb, (ls.X(K.DOORS[0] - K.C0 + .1, .75) - int(pp[0]), ls.Y(K.DOORS[0] - K.C0 + .1, .75) - int(pp[1])))
pt, pq = PL['papan_berdiri_tersedia_sw']; li.alpha_composite(pt, (ls.X(K.DOORS[1] - K.C0 + .1, .75) - int(pq[0]), ls.Y(K.DOORS[1] - K.C0 + .1, .75) - int(pq[1])))
bb = li.getbbox(); li = li.crop(bb); save(li, 'mock_lobi_status_pintu_1x', 'mock'); save(li.resize((li.width * 4, li.height * 4), Image.NEAREST), 'mock_lobi_status_pintu_4x', 'mock')
MAN['mock'] = {'mock/mock_kamar_kosong_4x.png': 'kamar kosong: kasur + WC + ember berisi air dengan gayung (sisi kanan kamar mandi, seberang depan WC, jauh dari pintu kamar mandi) + Ichsan (idle se), sekat versi cutaway',
               'mock/mock_lobi_status_pintu_4x.png': 'lobi Cove: kamar 1 terkunci (BELUM BISA DISEWA), 2 tersedia (TERSEDIA UNTUK DIBELI), 3 milik orang lain (RAKA, lampu merah), 4 milik Ichsan, 5 milik orang lain (NOOR); Ichsan di depan pintu 3',
               'mock_kamar_ember_px': [s.X(*EMBER) - m_bb[0], s.Y(*EMBER) - m_bb[1]], 'mock_kamar_ember_local_cr': list(EMBER), 'mock_kamar_ember_sprite': f'props/ember_air_gayung_{EMBER_DIR}.png', 'mock_kamar_ember_world_cr': [round(K.C0 + EMBER[0], 3), round(K.R0 + EMBER[1], 3)],
               'lobby_ichsan_px': [ls.X(pc_, pr_) - bb[0], ls.Y(pc_, pr_) - bb[1]]}
json.dump(MAN, open(O + '/src/_sprites.json', 'w'), indent=1, ensure_ascii=False); print('ok', m.size, li.size, s.X(*EMBER) - m_bb[0], s.Y(*EMBER) - m_bb[1])
