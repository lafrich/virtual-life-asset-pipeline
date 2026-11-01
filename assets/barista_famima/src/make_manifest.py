# menyusun manifest.json (root): NPC, prop, ikon, UI (rect per layar per resolusi + slice), menu + resep USULAN + modifier + ekonomi
import json, glob, os
import common as C
B = C.OUT + '/'
npc = json.load(open(B + 'npc/manifest_npc.json'))
props = json.load(open(B + 'src/_props.json'))
ui = json.load(open(B + 'src/_ui.json'))
mock = json.load(open(B + 'src/_mock.json'))
SUMBER = [
 dict(judul='Daftar Menu Kopi Family Mart Terbaru 2026, Enak dan Murah (Rumah123, 25 Feb 2026)', url='https://artikel.rumah123.com/daftar-menu-kopi-family-mart-terbaru-2026-enak-dan-murah',
      isi='Kopi Series Hot/Cold harga reguler/large (KSK 16.000/19.000, Americano 13.000/16.000, Caramel Macchiato, Dolce, Cappuccino, Cafe Latte, Vanilla, Creamy Hazelnut 16.000/19.000); add-on Espresso Rp3.000'),
 dict(judul='Daftar Menu Kopi di Family Mart (IDN Times)', url='https://www.idntimes.com/food/dining-guide/fina-wahibatun-nisa-1/daftar-menu-kopi-di-family-mart',
      isi='Regular/Large; Premium Chocolate 16.000/19.000, Green Tea Latte 16.000/19.000 (non-kopi)'),
 dict(judul='Daftar Harga Menu Delivery FamilyMart Grand Indonesia (MenuKuliner.net)', url='https://menukuliner.net/menu/323382/familymart-grand-indonesia',
      isi='deskripsi bahan (Americano = single shot espresso + water, Cappuccino = espresso + fresh milk + milk foam, Dolce = espresso + fresh milk + dolce sauce), level gula No/Less/Normal/Extra Sweet, extra Espresso +Rp3.000'),
 dict(judul='Promo FamilyMart Hari Ini, Bayar Suka-Suka untuk FamiCafe Beverage Regular (Kompas.com, 1 Apr 2026)', url='https://www.kompas.com/jawa-barat/read/2026/04/01/084401788/promo-familymart-hari-ini-bayar-suka-suka-untuk-famicaf-beverage',
      isi='nama FamiCafe dan daftar minuman: Premium Chocolate, Matcha Latte, Kopi Susu Keluarga, Caramel Macchiato, Dolce Latte, Coconut Latte, Americano'),
]
MOD = {
 'ukuran': {'R': dict(nama='Regular', ml_hot=240, ml_es=360, susu_ml=[150, 200], ikon='icons/mod_ukuran_R.png', harga='harga[0]', upah_tambah_rp=0, waktu_tunggu_dtk=45),
            'L': dict(nama='Large', ml_hot=360, ml_es=480, susu_ml=[220, 280], ikon='icons/mod_ukuran_L.png', harga='harga[1]', upah_tambah_rp=C.EKONOMI['upah_large_rp'], waktu_tunggu_dtk=50)},
 'gula': {'normal': dict(nama='Normal', takaran=1.0, ikon='icons/mod_gula_normal.png'),
          'less': dict(nama='Less Sugar', takaran=0.5, ikon='icons/mod_gula_less.png'),
          'no': dict(nama='No Sugar', takaran=0.0, ikon='icons/mod_gula_no.png', catatan='langkah gula dilewati; menu bersirup tetap pakai sirup/saus tapi takaran 0 untuk gula tambahan')},
 'double_shot': {False: dict(nama='Tidak', shot=1, ikon='icons/mod_shot_1.png', upah_tambah_rp=0, harga_tambah_rp=0),
                 True: dict(nama='Ya', shot=2, ikon='icons/mod_shot_2.png', upah_tambah_rp=C.EKONOMI['upah_double_rp'], harga_tambah_rp=3000,
                            waktu_tambah_dtk=C.EKONOMI['waktu_tunggu_dtk']['double'], langkah_tambah='seduh_2', catatan='hanya menu berkopi; harga add-on espresso Rp3.000 dari sumber')},
 'aturan': ['modifier tampil di tiket (chip Ukuran / Gula / Double Shot) dan dipilih ulang di langkah 07 Tutup & serahkan',
            'tiap modifier yang tidak cocok saat diserahkan: -1 bintang (tip turun), upah tetap dibayar',
            'menu salah / waktu habis / shot gosong (>33 dtk) = gagal: 0 upah, 0 tip'],
}
menu = []
for m in C.MENU:
    e = dict(id=m['id'], nama=m['nama'], harga_rp=dict(R=m['harga'][0], L=m['harga'][1]), ket=m['ket'], kopi=m['kopi'], bahan=m['bahan'], latte_art=m['art'],
             ikon={f'{s}_{u}': f"icons/menu_{m['id']}_{s}_{u}.png" for s in ('hot', 'es') for u in ('R', 'L')},
             gelas_label={k: f"props/{p}_{u}_{m['id']}_sw.png" for k, p in (('hot', 'cup_tutup'), ('es', 'gelas_es')) for u in ('R', 'L')} if False else
             {f'{s}_{u}': f"props/{p}_{u}_{m['id']}_sw.png" for s, p in (('hot', 'cup_tutup'), ('es', 'gelas_es')) for u in ('R', 'L')},
             resep={s: dict(langkah_dasar=C.recipe(m['id'], s, 'R', 'normal', False),
                            langkah_double_shot=C.recipe(m['id'], s, 'R', 'normal', True) if m['kopi'] else None,
                            langkah_no_sugar=C.recipe(m['id'], s, 'R', 'no', False)) for s in ('hot', 'es')})
    if m['id'] == 'matcha_latte': e['catatan_harga'] = 'harga dari Green Tea Latte (IDN Times); nama Matcha Latte dari Kompas 2026 (diasumsikan menu yang sama)'
    if m['id'] == 'premium_chocolate': e['catatan_harga'] = 'IDN Times (artikel lebih lama dari 2026; bisa berubah)'
    menu.append(e)
def by_screen(size):
    out = {}
    for r in ui['rects']:
        if r['size'] != size or r['screen'].startswith('_'): continue
        out.setdefault(r['screen'], {})[r['name']] = [r['x'], r['y'], r['w'], r['h']]
    return out
M = dict(
 nama='barista_famima', status='USULAN / preview (belum dipakai di index.html)',
 gaya='v6b: tanpa outline hitam, cahaya dari kiri, 4-5 tone, bayangan alpha 56, glow 90, tanpa anti-aliasing',
 sumber_menu=SUMBER,
 npc=npc,
 props=dict(grid='isometrik 64x32 per tile (engine street_buildings), pivot = piksel tanah tengah footprint', sprite=props),
 ikon=dict(ukuran=[32, 32], file=sorted(os.path.relpath(p, B) for p in glob.glob(B + 'icons/*.png')),
           pola=dict(menu='icons/menu_{id}_{hot|es}_{R|L}.png', bahan='icons/bahan_{id}.png', modifier='icons/mod_{ukuran_R|ukuran_L|gula_normal|gula_less|gula_no|shot_1|shot_2}.png')),
 bahan=[dict(id=k, nama=n, ikon=f'icons/bahan_{k}.png') for k, n in C.BAHAN],
 menu=menu,
 langkah=C.LANGKAH,
 langkah_ui={'giling': '02_giling', 'tamper': '03_tamper', 'seduh': '04_seduh', 'seduh_2': '04_seduh (Shot 2/2)', 'steam': '05_steam',
             'tuang': '06_tuang_latteart', 'tutup': '07_tutup_serahkan', 'serah': '07_tutup_serahkan',
             'es': '06_tuang_latteart (varian es: bar isi gelas)', 'susu_dingin': '06_tuang_latteart (varian es)', 'larut': '02_giling (varian: bar takaran bubuk)',
             'air': '06_tuang_latteart (bar isi)', 'sirup': '07_tutup_serahkan (pilihan gula)', 'gula': '07_tutup_serahkan (pilihan gula)'},
 modifier=MOD,
 ekonomi=dict(C.EKONOMI, contoh=dict(pesanan='Hot Cafe Latte Large, Less Sugar, Double Shot, 4 bintang', upah_rp=C.upah('L', True, 4)[0], tip_rp=C.upah('L', True, 4)[1]),
              zona_timing=dict(seduh_dtk=dict(merah=[0, 20], kuning=[20, 25], hijau=[25, 30], kuning2=[30, 33], merah2=[33, 40]),
                               steam_c=dict(kurang=[20, 53], kuning=[53, 59], hijau=[59, 64], kuning2=[64, 70], merah=[70, 80]),
                               giling_g=dict(hijau=[16.8, 19.7]), skor=dict(hijau=1.0, kuning=0.6, merah=0.15))),
 ui=dict(gaya='HUD Vista ui_y2k (kaca, Tahoma 11 Wine), piksel 1x, pratinjau 2x nearest', resolusi=['844x390', '667x375'],
         layar=[n for n in ('01_pesanan', '02_giling', '03_tamper', '04_seduh', '05_steam', '06_tuang_latteart', '07_tutup_serahkan', '07b_serahkan_salah', '08_hasil_sukses', '09_hasil_gagal')],
         file=dict(pratinjau_2x='ui/{layar}.png', native_1x='ui/1x_native/{layar}.png', native_667='ui/1x_native/{layar}_667x375.png', pratinjau_667='ui/667x375/{layar}_667x375@2x.png',
                   komponen_4x='ui/30_komponen_4x.png'),
         slices={k: dict(file=f'ui/slices/{k}.png', size=v) for k, v in ui['slices'].items()},
         warna=dict(zona_merah='#E0434A', zona_kuning='#F5D547', zona_hijau='#3DDC84', kertas='#FAF3E5', tepi_kertas='#C8BC9F', tinta='#2A3242', famima_hijau='#1FA34A', famima_biru='#2C6BD8', bintang='#FFD166'),
         rect={'844x390': by_screen('844x390'), '667x375': by_screen('667x375')}),
 mock=dict(file=['mock_counter_famima_1x.png', 'mock_counter_famima_4x.png'], **mock),
 contact_sheet='contact_sheet_barista_famima_4x.png',
)
json.dump(M, open(B + 'manifest.json', 'w'), indent=1, ensure_ascii=False, default=str)
print(len(menu), sum(len(v) for v in M['ui']['rect']['844x390'].values()), list(M['ui']['rect']['844x390'].keys()))
