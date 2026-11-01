"""barista_famima: shared data (menu FamiCafe, bahan, modifier, resep usulan), palette ramps (existing game hexes only), audit."""
import os, re, json, sys
import numpy as np
from PIL import Image
A = 'assets/'
OUT = A + 'barista_famima'
def hx(h): h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
def H(c): return '#%02X%02X%02X' % tuple(c[:3])
# ---------------------------------------------------------------- ramps (dark -> light), every hex exists in index.html or the asset palettes
R = {k: [hx(c) for c in v] for k, v in {
    'fmg':   ['#105824', '#16702D', '#1F8F3A', '#1FA34A', '#7FD99A'],      # FamilyMart green (index.html FamilyMart walls / bench / sign)
    'blue':  ['#1A3F87', '#2457B8', '#2C6BD8', '#3F7FE0', '#86CCFF'],      # engine BLUE (#2C6BD8 = FamilyMart sign stroke / floor mat)
    'white': ['#8D97A8', '#C7CFDC', '#D2D5D9', '#E7EBF2', '#FFFFFF'],      # engine WHITE
    'steel': ['#535969', '#788197', '#8D97A8', '#A7B2C4', '#C7CFDC'],      # engine CONC
    'dark':  ['#15151F', '#1C2330', '#2A3242', '#3A4458', '#5A6577'],      # engine DARK
    'glass': ['#1C2330', '#2E3B52', '#4F6A86', '#7A9FB2', '#BFD8E4'],      # engine GLASS
    'coffee':['#3D2A1E', '#6B4F3A', '#94704F', '#B48455', '#D49A5E'],      # engine WOOD
    'milkc': ['#9B866F', '#C3AD8D', '#D4C8AE', '#E8DEC6', '#F4EBDA'],      # engine CREAM (latte / milk coffee)
    'card':  ['#6B4F3A', '#9A6A3E', '#B48455', '#D49A5E', '#F0C08A'],      # engine CARD (caramel / aren)
    'gold':  ['#6B5320', '#B07A1C', '#C99A2E', '#E0A526', '#FFD166'],      # engine GOLD
    'matcha':['#1A6A3A', '#22894A', '#2A9A52', '#4FB36B', '#86E59A'],      # engine GREEN
    'lite':  ['#A7B2C4', '#E7EBF2', '#F4F1EA', '#FAF3E5', '#FFFFFF'],      # engine LITE (milk / foam)
    'red':   ['#7A2E35', '#B8323A', '#E0434A', '#FF5A5F', '#FF8AA2'],
    'ice':   ['#7A9FB2', '#9CE6DE', '#B2EEE7', '#CEDBFF', '#FFFFFF'],
    'choco': ['#3D2A1E', '#5E4636', '#6B4F3A', '#8A5A2B', '#94704F'],
    'teal':  ['#2A5266', '#3D7A80', '#6FA9A9', '#9CE6DE', '#B2EEE7'],      # engine FTEAL
}.items()}
# ---------------------------------------------------------------- menu FamiCafe (sumber: lihat README)
#  harga = harga reguler / large dari sumber (Rp); 'warna' = kode warna label menu (stiker di gelas, tiket, ikon)
MENU = [
 dict(id='americano', nama='Americano', harga=(13000, 16000), kopi=True, susu=False, base='coffee', top='crema', art=None, label='dark',
      bahan=['biji_kopi', 'air'], es_ok=True, ket='espresso + air'),
 dict(id='kopi_susu_keluarga', nama='Kopi Susu Keluarga', harga=(16000, 19000), kopi=True, susu=True, base='milkc', top='art', art='heart', label='card',
      bahan=['biji_kopi', 'susu', 'gula_aren'], es_ok=True, ket='espresso + susu segar + gula aren (signature)'),
 dict(id='cafe_latte', nama='Cafe Latte', harga=(16000, 19000), kopi=True, susu=True, base='milkc', top='art', art='rosetta', label='lite',
      bahan=['biji_kopi', 'susu'], es_ok=True, ket='espresso + susu segar'),
 dict(id='cappuccino', nama='Cappuccino', harga=(16000, 19000), kopi=True, susu=True, base='milkc', top='art', art='heart_foam', label='coffee',
      bahan=['biji_kopi', 'susu'], es_ok=True, ket='espresso + susu + busa susu tebal'),
 dict(id='caramel_macchiato', nama='Caramel Macchiato', harga=(16000, 19000), kopi=True, susu=True, base='lite', top='drizzle', art=None, label='gold',
      bahan=['biji_kopi', 'susu', 'sirup_vanila', 'saus_karamel'], es_ok=True, ket='susu + vanila, espresso di atas, saus karamel'),
 dict(id='dolce_latte', nama='Dolce Latte', harga=(16000, 19000), kopi=True, susu=True, base='milkc', top='art', art='tulip', label='blue',
      bahan=['biji_kopi', 'susu', 'saus_dolce'], es_ok=True, ket='espresso + susu + saus dolce (susu kental manis)'),
 dict(id='vanilla_latte', nama='Vanilla Latte', harga=(16000, 19000), kopi=True, susu=True, base='milkc', top='art', art='rosetta', label='lite',
      bahan=['biji_kopi', 'susu', 'sirup_vanila'], es_ok=True, ket='espresso + susu + sirup vanila'),
 dict(id='hazelnut_latte', nama='Creamy Hazelnut Latte', harga=(16000, 19000), kopi=True, susu=True, base='milkc', top='art', art='tulip', label='choco',
      bahan=['biji_kopi', 'susu', 'sirup_hazelnut'], es_ok=True, ket='espresso + susu + sirup hazelnut'),
 dict(id='premium_chocolate', nama='Premium Chocolate', harga=(16000, 19000), kopi=False, susu=True, base='choco', top='art', art='heart', label='choco',
      bahan=['cokelat', 'susu'], es_ok=True, ket='cokelat + susu segar (tanpa kopi)'),
 dict(id='matcha_latte', nama='Matcha Latte', harga=(16000, 19000), kopi=False, susu=True, base='matcha', top='art', art='heart', label='fmg',
      bahan=['matcha', 'susu'], es_ok=True, ket='matcha (green tea) + susu segar (tanpa kopi)'),
]
M = {m['id']: m for m in MENU}
BAHAN = [('biji_kopi', 'Biji kopi'), ('espresso', 'Shot espresso'), ('susu', 'Susu segar'), ('gula', 'Gula'), ('gula_aren', 'Gula aren'),
         ('es_batu', 'Es batu'), ('cokelat', 'Bubuk cokelat'), ('air', 'Air panas'), ('matcha', 'Bubuk matcha'), ('sirup_vanila', 'Sirup vanila'),
         ('sirup_hazelnut', 'Sirup hazelnut'), ('saus_karamel', 'Saus karamel'), ('saus_dolce', 'Saus dolce')]
UKURAN = {'R': dict(nama='Regular', ml=(240, 360), susu_ml=(150, 200)), 'L': dict(nama='Large', ml=(360, 480), susu_ml=(220, 280))}   # ml (hot, es) usulan
GULA = {'normal': 'Normal', 'less': 'Less Sugar', 'no': 'No Sugar'}
LANGKAH = {
 'giling': 'Giling biji kopi (tahan sampai takaran pas)', 'tamper': 'Tekan / tamper bubuk di portafilter (tekanan rata)',
 'seduh': 'Seduh espresso (bar timing 25-30 dtk)', 'seduh_2': 'Seduh shot kedua (double shot)',
 'steam': 'Steam susu (suhu 60-65 C, bar timing)', 'susu_dingin': 'Tuang susu dingin + es', 'es': 'Isi es batu ke gelas',
 'larut': 'Larutkan bubuk (cokelat / matcha) dengan sedikit air panas', 'air': 'Tambah air (panas / dingin)',
 'sirup': 'Tambah sirup / saus (takaran sesuai gula)', 'gula': 'Gula sesuai pesanan (Normal / Less / No)',
 'tuang': 'Tuang ke gelas (latte art untuk hot)', 'tutup': 'Pilih gelas (R/L), tutup, cek stiker', 'serah': 'Serahkan ke pelanggan',
}
def recipe(mid, suhu, ukuran='R', gula='normal', double=False):
    """resep USULAN: bahan + urutan langkah mini game untuk satu pesanan"""
    m = M[mid]; st = []
    if m['kopi']: st += ['giling', 'tamper', 'seduh'] + (['seduh_2'] if double else [])
    else: st += ['larut']
    if suhu == 'es': st += ['es']
    if m['id'] == 'americano': st += ['air']
    elif suhu == 'hot': st += ['steam']
    else: st += ['susu_dingin']
    sweet = [b for b in m['bahan'] if b.startswith(('sirup', 'saus', 'gula_aren'))]
    if sweet or gula != 'no': st += ['sirup' if sweet else 'gula']
    st += ['tuang', 'tutup', 'serah']
    if gula == 'no' and not sweet and 'gula' in st: st.remove('gula')
    return st
# upah & tip (USULAN)
EKONOMI = dict(upah_dasar_rp=2500, upah_large_rp=500, upah_double_rp=500, upah_es_rp=0,
               tip_per_bintang_rp=[0, 0, 500, 1000, 2000, 3000], bonus_combo_rp=500,
               bintang_dari_akurasi=[(0.9, 5), (0.75, 4), (0.6, 3), (0.4, 2), (0.0, 1)],
               salah_modifier='-1 bintang per modifier salah (ukuran / gula / shot), salah menu = gagal (0 upah, pelanggan pergi)',
               waktu_tunggu_dtk=dict(R=45, L=50, double=8),
               catatan='upah dibayar per gelas selesai (shift barista), tip dari pelanggan; dibulatkan Rp 100')
def upah(ukuran, double, bintang):
    e = EKONOMI; u = e['upah_dasar_rp'] + (e['upah_large_rp'] if ukuran == 'L' else 0) + (e['upah_double_rp'] if double else 0)
    return u, e['tip_per_bintang_rp'][bintang]
# ---------------------------------------------------------------- audit
def known_hex():
    s = open('game/index_extract.txt').read(); k = set(x.upper() for x in re.findall(r'#[0-9A-Fa-f]{6}\b', s))
    K = json.load(open(A + 'npc_babeh_loak/_tools/known.json')); [k.update(x.upper() for x in v) for v in K.values()]
    return k
def audit(paths):
    k = known_hex(); cols = set(); al = set()
    for p in paths:
        a = np.array(Image.open(p).convert('RGBA')); m = a[..., 3] > 0
        cols |= {H(c) for c in a[a[..., 3] == 255][:, :3]}; al |= set(np.unique(a[..., 3]).tolist())
    return sorted(cols - k), sorted(al), len(cols)
