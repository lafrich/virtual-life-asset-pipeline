"""item_catalog.json + contact sheet 4x + mock (gang + taman) with loose items and find spots. PREVIEW ONLY."""
import sys, os, json
sys.path.insert(0, 'assets/street_buildings/_work'); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import items as IT
OUT = 'assets/item_temuan'
SPR = json.load(open(f'{OUT}/_work/_sprites.json')); PRP = json.load(open(f'{OUT}/_work/_props.json'))
RAR = {'umum': {'warna_label': '#86E59A', 'peluang_per_cari': 0.80}, 'jarang': {'warna_label': '#86CCFF', 'peluang_per_cari': 0.17}, 'langka': {'warna_label': '#FFD166', 'peluang_per_cari': 0.03}}
LOK = {'jalan': 'tepi jalan raya / jalan lokal', 'trotoar': 'trotoar', 'taman': 'taman seberang', 'gang': 'gang loak & kampung', 'sekitar_warung': 'sekitar warung madura / warung kopi',
       'belakang_indomaret': 'belakang/samping Indomaret', 'tong_sampah': 'prop tong sampah', 'tumpukan_kardus': 'prop tumpukan kardus', 'kantong_kresek': 'prop kantong kresek',
       'got': 'prop got kecil', 'kolong_bangku': 'prop kolong bangku taman', 'karung_rongsok': 'prop karung rongsokan'}
def catalog():
    items = []
    for id_, e in IT.M.items():
        vs = [v for v in e['varian'] if v]
        items.append({'id': id_, 'nama': e['nama'], 'rarity': e['rarity'], 'harga_jual_rp': e['harga'], 'lokasi_temuan': e['lokasi'], 'bobot_spawn': e['bobot'],
                      'deskripsi': e['deskripsi'], 'varian': vs or None,
                      'sprite': {k: {'icon': SPR[k]['icon'], 'ground': SPR[k]['ground'], 'ground_pivot': SPR[k]['ground_pivot']} for k in SPR if SPR[k]['item'] == id_}})
    spots = {}
    for k, v in PRP.items():
        n = k.rsplit('_', 1)[0]
        spots.setdefault(n, {'nama': v['nama'], 'lokasi': v['lokasi'], 'sprite': {}, 'note': v['note']})['sprite'][v['facing']] = {'file': v['file'], 'kilau': v['kilau'], 'pivot': v['pivot']}
    pool = {n: [i['id'] for i in items if n in i['lokasi_temuan']] for n in ('tong_sampah', 'tumpukan_kardus', 'kantong_kresek', 'got', 'kolong_bangku')}
    pool['karung_rongsok'] = [i['id'] for i in items if 'gang' in i['lokasi_temuan'] and i['rarity'] != 'umum'] + ['kardus_lipat', 'besi_tua']
    for n in spots: spots[n]['pool_item'] = sorted(set(pool.get(n, [])))
    mek = {'status': 'USULAN, belum diimplementasi', 'cari_di_prop': 'pemain berdiri di sel interaksi prop yang berkilau lalu tekan Cari (animasi jongkok 1.2 dtk); dapat 0-1 item dari pool_item prop itu',
           'peluang_dapat': 0.7, 'peluang_rarity': {k: v['peluang_per_cari'] for k, v in RAR.items()},
           'pilih_item': 'dalam rarity terpilih, acak berbobot bobot_spawn dari item yang lokasi_temuan-nya cocok dengan prop/area',
           'cooldown_cari_per_prop_menit': 10, 'kilau': 'kilau tampil hanya saat prop siap (cooldown habis); habis dicari -> tanpa kilau',
           'barang_tergeletak': 'maks 6 item tergeletak di peta luar sekaligus, respawn tiap 3-5 menit di titik acak jalan/trotoar/taman/gang, pakai kilau_item_f0..2 di atasnya; diambil dengan jalan di atasnya + tombol Ambil',
           'kapasitas_tas': {'awal': 8, 'upgrade': [12, 16], 'catatan': 'item varian berbeda = slot berbeda; item sejenis menumpuk sampai 5'},
           'jual_ke_toko_loak': 'bicara ke babeh pemilik di etalase (player_sell_cell toko_loak); harga = harga_jual_rp x (0.8-1.2 acak harian); bonus +20% untuk 3 langka pertama per hari',
           'batas_harian': 'maks 30 kali cari per hari game agar ekonomi tidak bocor',
           'harga_rujukan': 'kisaran harga pengepul/loak Jakarta (plastik ±Rp2-4rb/kg, kardus ±Rp1.5-3rb/kg, tembaga ±Rp70-100rb/kg) dipakai sebagai patokan kasar; harga per buah di sini disederhanakan untuk game, bukan harga pasar terverifikasi'}
    cat = {'game': 'Virtual Life', 'versi': 'preview 1 Nov 2026', 'mata_uang': 'IDR', 'rarity': RAR, 'lokasi': LOK, 'item': items, 'tempat_temuan': spots,
           'sprite_umum': {'kilau_item': [f'props_temuan/kilau_item_f{i}.png' for i in range(3)]}, 'mekanik_usulan': mek,
           'aturan_gambar': 'ikon 32x32 tanpa bayangan; ground 2 px/unit (skala barang dilebihkan x1.5), pivot = titik tanah di bawah pusat barang, bayangan hitam alpha 56; kilau = lapisan glow (inti 255, halo alpha 90)'}
    json.dump(cat, open(f'{OUT}/item_catalog.json', 'w'), indent=1, ensure_ascii=False)
    return items
def font(sz=10):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',):
        if os.path.exists(p): return ImageFont.truetype(p, sz)
    return ImageFont.load_default()
def sheet(items):
    cols = 8; cw, ch = 96, 96; keys = list(SPR)
    rows = (len(keys) + cols - 1) // cols
    W = cols * cw; Hh = 30 + rows * ch + 40 + 2 * 80
    out = Image.new('RGBA', (W, Hh), (42, 158, 82, 255)); d = ImageDraw.Draw(out)
    by = {i['id']: i for i in items}
    for i, k in enumerate(keys):
        x = (i % cols) * cw; y = 30 + (i // cols) * ch; e = by[SPR[k]['item']]
        ic = Image.open(f"{OUT}/{SPR[k]['icon']}"); gr = Image.open(f"{OUT}/{SPR[k]['ground']}")
        d.rectangle([x + 4, y + 4, x + 37, y + 37], fill=(26, 106, 58, 255)); out.alpha_composite(ic, (x + 5, y + 5))
        out.alpha_composite(gr, (x + 42 + max(0, (50 - gr.width) // 2), y + 38 - gr.height))
    by_key = {}
    y0 = 30 + rows * ch
    px = 4
    for k, v in PRP.items():
        if v['facing'] != 'sw': continue
        im = Image.open(f"{OUT}/{v['file']}"); kl = Image.open(f"{OUT}/{v['kilau'][1]}")
        out.alpha_composite(im, (px, y0 + 60 - im.height + 70)); out.alpha_composite(kl, (px, y0 + 60 - im.height + 70)); px += im.width + 24
    for f in range(3): out.alpha_composite(Image.open(f'{OUT}/props_temuan/kilau_item_f{f}.png'), (px + f * 20, y0 + 110))
    big = out.resize((W * 4, Hh * 4), Image.NEAREST); d = ImageDraw.Draw(big); F = font(26); F2 = font(22)
    d.text((16, 20), 'ITEM TEMUAN - ikon 32x32 (kotak) + versi tergeletak (2 px/unit). Label: nama, rarity, harga jual usulan', fill=(255, 255, 255), font=F)
    col = {'umum': (134, 229, 154), 'jarang': (134, 204, 255), 'langka': (255, 209, 102)}
    for i, k in enumerate(keys):
        x = (i % cols) * cw * 4; y = (30 + (i // cols) * ch) * 4; e = by[SPR[k]['item']]
        nm = e['nama'] + (f" ({SPR[k]['varian']})" if SPR[k]['varian'] else '')
        d.text((x + 16, y + 170), nm[:30], fill=(255, 255, 255), font=F2); d.text((x + 16, y + 200), nm[30:60], fill=(255, 255, 255), font=F2) if len(nm) > 30 else None
        d.text((x + 16, y + 300), f"{e['rarity']}  Rp{e['harga_jual_rp']:,}".replace(',', '.'), fill=col[e['rarity']], font=F2)
    d.text((16, (y0 + 10) * 4), 'TEMPAT TEMUAN (prop interaksi "cari barang") + kilau frame 1; kanan: kilau_item f0-f2', fill=(255, 255, 255), font=F)
    os.makedirs(f'{OUT}/sheets', exist_ok=True); big.convert('RGB').save(f'{OUT}/sheets/contact_sheet_4x.png'); print('sheet', big.size)
def mock():
    import scene as SC
    from gang import gangfloor
    from lib import pave, MI
    C = {}
    for k, v in SPR.items():
        im = Image.open(f"{OUT}/{v['ground']}"); kl = Image.open(f'{OUT}/props_temuan/kilau_item_f1.png'); p = v['ground_pivot']
        can = Image.new('RGBA', (max(im.width, 16), im.height + 12), (0, 0, 0, 0)); can.alpha_composite(im, (0, 12)); can.alpha_composite(kl, (im.width // 2 - 8, 0))
        C['it_' + k] = (can, None, (p[0], p[1] + 12))
    for k, v in PRP.items():
        im = Image.open(f"{OUT}/{v['file']}").copy(); im.alpha_composite(Image.open(f"{OUT}/{v['kilau'][1]}")); C['pt_' + k] = (im, None, tuple(v['pivot']))
    _l = SC.load; SC.load = lambda k: C[k] if k in C else _l(k)
    S = SC.Scene(0, 16, 0, 10, 260)
    def g(c, r):
        m, t = gangfloor(c, r); m = m.copy(); t = t.copy()
        gr = c >= 7.0; m[gr] = MI['GRASS']; t[gr] = np.where(SC.H(c, r)[gr] < 6, 3, 2)
        pm, pt = pave(c, r); pth = gr & (r >= 4) & (r < 6); m[pth] = pm[pth]; t[pth] = pt[pth]
        k = pth & ((np.abs(r - 4.05) < 0.05) | (np.abs(r - 5.95) < 0.05)); m[k] = MI['CONC']; t[k] = 3
        return m, t
    # gang (c 0..7): walls at the back, warung corner; taman (c 7..16): path, bench, bins, trees
    S.put('tembok_gang_a_sw', 1.0, 0.15); S.put('tembok_gang_b_sw', 3.0, 0.15); S.put('tembok_gang_a_sw', 5.0, 0.15)
    S.put('tiang_listrik_polos_se', 6.4, 1.0); S.put('warung_madura_se', 1.6, 7.0)
    S.put('pt_kantong_kresek_sw', 0.6, 0.8); S.put('pt_tumpukan_kardus_sw', 2.4, 0.9); S.put('pt_karung_rongsok_sw', 5.4, 0.8)
    S.put('pt_got_kecil_se', 6.4, 4.0)
    S.put('pt_kolong_bangku_sw', 10.0, 3.35); S.put('pt_tong_sampah_besi_sw', 11.6, 3.4); S.put('lampu_taman_sw', 8.5, 3.4)
    S.put('bangku_taman_ne', 13.0, 6.6); S.put('pohon_trembesi_L', 13.5, 1.5); S.put('pohon_kiara_payung', 9.0, 8.5); S.put('pohon_asam_M', 15.0, 8.8)
    for k, c, r in [('botol_plastik_bening', 3.2, 3.2), ('kaleng_minuman_merah', 4.6, 5.0), ('sandal_jepit_biru', 2.0, 4.6), ('hp_jadul_biru', 9.4, 5.3),
                    ('koran_bekas', 11.0, 7.4), ('kunci_lama', 14.6, 4.6), ('payung_rusak_ungu', 12.2, 8.6), ('radio_tua', 4.2, 2.2), ('koin_kuno', 15.2, 6.2), ('gelas_plastik', 7.6, 7.2)]:
        S.put('it_' + k, c, r)
    img, glow = S.render(g, 0, 16, 0, 10)
    a = np.array(img); ys, xs = np.nonzero(a[..., 3]); img = img.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    bg = Image.new('RGBA', img.size, (42, 158, 82, 255)); bg.alpha_composite(img)
    os.makedirs(f'{OUT}/sheets', exist_ok=True); bg.convert('RGB').resize((img.width * 4, img.height * 4), Image.NEAREST).save(f'{OUT}/sheets/mock_taman_gang_4x.png'); print('mock', img.size)
if __name__ == '__main__':
    it = catalog(); sheet(it); mock()
