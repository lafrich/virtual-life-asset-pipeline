# UI mini game Barista FamiCafe. Gaya HUD Vista ui_y2k (kaca, Tahoma 11 Wine, piksel 1x, upscale 2x nearest).
# Komponen kaca/tombol/teks dipakai ulang dari ui_loak_tas/src/lt.py (+ ui_y2k). Elemen datar (tiket, bar timing,
# bintang, chip) memakai hex yang sudah ada (common.R / ui_y2k).
import sys, os, json, math
sys.path.insert(0, 'assets/ui_loak_tas/src'); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lt
from lt import *
import common as C
import importlib.util as _iu
_sp = _iu.spec_from_file_location('bf_mock', os.path.dirname(os.path.abspath(__file__)) + '/mock.py'); mock = _iu.module_from_spec(_sp); _sp.loader.exec_module(mock)
B = 'assets/barista_famima/'
OUTU = B + 'ui/'
M = {m['id']: m for m in C.MENU}
PAPER, PAPER2, PEDGE, INK, INK2 = '#FAF3E5', '#F4F1EA', '#C8BC9F', '#2A3242', '#5A6577'
FG, FG2, FGD, FBL = '#1FA34A', '#7FD99A', '#16702D', '#2C6BD8'
ZR, ZY, ZG = '#E0434A', '#F5D547', '#3DDC84'
GOLD, GOLD2, EMPTY = '#FFD166', '#C99A2E', '#3A4458'
ORDER = dict(no=12, nama='Ichsan', mid='cafe_latte', suhu='hot', uk='L', gula='less', dbl=True)
QUEUE = [dict(no=13, nama='Raka', mid='kopi_susu_keluarga', suhu='es', uk='R', gula='normal', dbl=False),
         dict(no=14, nama='Pelanggan', mid='americano', suhu='es', uk='L', gula='no', dbl=False)]
STEPS = [('giling', 'Giling'), ('tamper', 'Tamper'), ('seduh', 'Seduh'), ('steam', 'Steam'), ('tuang', 'Tuang'), ('tutup', 'Tutup')]
def fit(t, w, b=True):
    while tw(t, 11, b) > w and len(t) > 3: t = t[:-3].rstrip() + '..' if not t.endswith('..') else t[:-3] + '..'
    return t
def ic(name): return Image.open(B + 'icons/' + name + '.png').convert('RGBA')
def mic(o, uk=None): return ic(f"menu_{o['mid']}_{o['suhu']}_{uk or o['uk']}")
def big(img, k=2): return img.resize((img.width * k, img.height * k), Image.NEAREST)
def mname(o): return ('Hot ' if o['suhu'] == 'hot' else 'Iced ') + M[o['mid']]['nama']
def price(o): return M[o['mid']]['harga'][0 if o['uk'] == 'R' else 1] + (3000 if o['dbl'] else 0)
# ---------------- background ----------------
_BGI = {}
def scene_bar(W, H):
    if 'b' not in _BGI:
        img, pp, bp = mock.compose(16, 11, False); _BGI['b'] = (img, bp)
    img, bp = _BGI['b']
    out = Image.new('RGBA', (W, H), '#1B2230'); out.alpha_composite(img, (W // 2 - bp[0] + 60, H // 2 - bp[1] + 40)); return out
def base(W, H, dimv=150, money=None):
    im = scene_bar(W, H)
    if money: y2k.vlayout.__defaults__ = (money,); y2k.bar_cluster.__defaults__ = ('normal', 'normal', 'normal', None, money, False)
    hud(im, W, H, work=True); dim(im, dimv); return im
# ---------------- components ----------------
def portrait_b(im, cx, cy, r=15, anim='idle', f=0):
    orb(im, cx, cy, r, 'green', alpha=235)
    p = Image.open(B + f'npc/frames/barista_famima_se_{anim}_f{f}.png').convert('RGBA')
    c = p.crop((18, 27, 46, 27 + 2 * r - 3))
    m = Image.new('L', c.size, 0); ImageDraw.Draw(m).ellipse([-1, -1, c.width, c.height + 6], fill=255)
    lay = Image.new('RGBA', c.size); lay.paste(c, (0, 0), m); im.alpha_composite(lay, (cx - 14, cy - r + 2)); y2k.gloss(im, cx, cy, r, a=40)
def chip(im, x, y, label, on=True, col=FG, icon=None, name=None, small=False):
    """chip modifier di tiket kertas: isi warna bila aktif, garis putus bila tidak"""
    d = D(im); w = tw(label, 11, True) + 10 + (18 if icon else 0); h = 17
    if name: rec(name, x, y, w, h)
    if on: d.rectangle([x, y, x + w - 1, y + h - 1], fill=col); d.line([x + 1, y + h - 1, x + w - 2, y + h - 1], fill=INK)
    else: d.rectangle([x, y, x + w - 1, y + h - 1], outline=PEDGE)
    tx = x + 5
    if icon: im.alpha_composite(ic(icon).resize((16, 16), Image.NEAREST) if False else ic(icon).crop((8, 8, 24, 24)), (x + 3, y + 1)); tx += 18
    text(d, tx, y + 2, label, '#FFFFFF' if on else INK2, 11, True); return w
def ticket(im, x, y, w, o, cur=True, name='tiket_order'):
    """kertas order: kepala hijau FamiCafe, nomor antre, ikon menu 2x, chip ukuran/gula/double shot, harga"""
    d = D(im); h = 214 if cur else 40
    rec(name, x, y, w, h)
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=PAPER, outline=PEDGE)
    for k in range(x, x + w, 4): d.point((k + 1, y + h - 1), fill='#1B2230'); d.point((k + 2, y + h - 1), fill='#1B2230')   # sobekan
    d.rectangle([x, y, x + w - 1, y + 15], fill=FG); d.line([x, y + 16, x + w - 1, y + 16], fill=FBL)
    text(d, x + 5, y + 2, 'FamiCafe', '#FFFFFF', 11, True); text(d, x + w - 5, y + 2, f"#{o['no']}", '#FFFFFF', 11, True, anchor='ra')
    if not cur:
        im.alpha_composite(mic(o), (x + 2, y + 9 if False else y + 17 - 8)) if False else None
        text(d, x + 5, y + 20, mname(o), INK, 11, True)
        s = f"{'L' if o['uk']=='L' else 'R'} · {C.GULA[o['gula']]}" + (' · 2x' if o['dbl'] else '')
        return h
    i = big(mic(o)); im.alpha_composite(i, (x + 4, y + 20))
    hot = o['suhu'] == 'hot'; chip(im, x + 72, y + 22, 'HOT' if hot else 'ICED', True, '#E0434A' if hot else FBL)
    text(d, x + 72, y + 42, 'a.n. ' + o['nama'], INK2, 11); text(d, x + 72, y + 58, rp(price(o)), FGD, 11, True)
    text(d, x + 5, y + 86, fit(M[o['mid']]['nama'], w - 10), INK, 11, True)
    yy = y + 106
    for lab, opts, val, col in (('Ukuran', [('R', 'Regular'), ('L', 'Large')], o['uk'], FBL),
                                ('Gula', [('normal', 'Normal'), ('less', 'Less'), ('no', 'No')], o['gula'], FG),
                                ('Double Shot', [(True, 'Ya'), (False, 'Tidak')], o['dbl'], '#B07A1C')):
        text(d, x + 5, yy, lab, INK2, 11); xx = x + 5; yy += 13
        for k, t in opts: xx += chip(im, xx, yy, t, k == val, col, name=f'chip_{lab.split()[0].lower()}_{str(k).lower()}' if name == 'tiket_order' else None) + 3
        yy += 21
    d.line([x + 5, yy, x + w - 6, yy], fill=PEDGE)
    return h
def mini_ticket(im, x, y, w, o, k):
    d = D(im); h = 34; rec(f'tiket_antre_{k}', x, y, w, h)
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=PAPER2, outline=PEDGE); d.rectangle([x, y, x + 3, y + h - 1], fill=FG)
    im.alpha_composite(mic(o), (x + 5, y + 1))
    text(d, x + 39, y + 3, fit(f"#{o['no']} {mname(o)}", w - 44), INK, 11, True)
    s = ('Large' if o['uk'] == 'L' else 'Regular') + ' · ' + C.GULA[o['gula']].replace(' Sugar', '') + (' · 2 shot' if o['dbl'] else '')
    text(d, x + 39, y + 17, s, INK2, 11); return h
def patience(im, x, y, w, frac, label='Sabar pelanggan', name='bar_sabar'):
    d = D(im); rec(name, x, y, w, 26); wtext(d, x, y, label, '#9AA6B6', False)
    well(im, x, y + 14, w, 10); n = (w - 4) // 6
    for k in range(n):
        on = k < int(n * frac); c = (ZG if frac > .5 else ZY if frac > .25 else ZR) if on else '#1B2230'
        d.rectangle([x + 2 + k * 6, y + 16, x + 2 + k * 6 + 4, y + 21], fill=c)
def progress(im, x, y, w, cur, double=True, name='langkah'):
    """baris langkah: selesai (centang hijau), aktif (kaca biru terang), belum (redup)"""
    d = D(im); n = len(STEPS); sw = (w - (n - 1) * 3) // n; rec(name, x, y, w, 20)
    for i, (k, lab) in enumerate(STEPS):
        bx = x + i * (sw + 3); t = lab + (' x2' if (k == 'seduh' and double) else '')
        if i < cur: c, tc = (31, 163, 74, 200), '#FFFFFF'
        elif i == cur: c, tc = (49, 106, 197, 230), '#FFFFFF'
        else: c, tc = (20, 32, 52, 170), '#9AA6B6'
        lay = Image.new('RGBA', (sw, 20), c); im.alpha_composite(lay, (bx, y))
        if i == cur: d.rectangle([bx, y, bx + sw - 1, y + 19], outline=G['sel2'])
        else: d.rectangle([bx, y, bx + sw - 1, y + 19], outline=G['edge'])
        if i < cur: im.alpha_composite(icons.get('check', 16), (bx + 2, y + 2))
        text(d, (bx + 18 + (sw - 18) // 2) if i < cur else bx + sw // 2, y + 3, t, tc, 11, i == cur, anchor='ma')
def tbar(im, x, y, w, zones, mark, label=None, ticks=None, ghost=None, name='bar_timing', h=18, verdict=None):
    """bar timing/akurasi: zona merah/kuning/hijau (0..1), penanda putih + segitiga, bayangan target"""
    d = D(im); rec(name, x, y - (14 if label else 0), w, h + (14 if label else 0) + (12 if ticks else 0))
    if label: wtext(d, x, y - 14, label, '#FFFFFF', False)
    well(im, x, y, w, h, alpha=200)
    iw = w - 4
    for a, b, c in zones:
        d.rectangle([x + 2 + int(a * iw), y + 2, x + 2 + int(b * iw) - 1, y + h - 3], fill=c)
    for a, b, c in zones:   # garis atas lebih terang per zona (1 baris)
        d.line([x + 2 + int(a * iw), y + 2, x + 2 + int(b * iw) - 1, y + 2], fill={ZR: '#FF8AA2', ZY: '#FFD166', ZG: '#86E59A'}.get(c, c))
    if ghost is not None:
        gx = x + 2 + int(ghost * iw)
        for yy in range(y + 2, y + h - 2, 2): d.point((gx, yy), fill='#FFFFFF')
    mx = x + 2 + int(mark * iw)
    d.rectangle([mx - 1, y - 2, mx + 1, y + h + 1], fill='#FFFFFF'); d.line([mx - 2, y - 2, mx - 2, y + h + 1], fill=G['edge']); d.line([mx + 2, y - 2, mx + 2, y + h + 1], fill=G['edge'])
    d.polygon([(mx - 4, y - 7), (mx + 4, y - 7), (mx, y - 3)], fill='#FFFFFF', outline=G['edge'])
    if ticks:
        for t, s in ticks:
            tx = x + 2 + int(t * iw); d.line([tx, y + h, tx, y + h + 2], fill='#9AA6B6'); wtext(d, tx, y + h + 2, s, '#9AA6B6', False, anchor='la' if t == 0 else 'ra' if t == 1 else 'ma')
    if verdict:
        t, col = verdict; wtext(d, x + w, y - 14, t, col, True, anchor='ra')
def star5(d, cx, cy, R, on=True, half=False):
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5; r = R if k % 2 == 0 else R * .45
        pts.append((round(cx + r * math.cos(a)), round(cy + r * math.sin(a))))
    d.polygon(pts, fill=GOLD if on else EMPTY, outline=GOLD2 if on else '#1B2230')
    if on: d.point((cx - 1, cy - R // 2), fill='#FFFFFF'); d.point((cx, cy - R // 2), fill='#FFFFFF')
def stars(im, x, y, n, R=11, gap=4, name='bintang'):
    d = D(im); rec(name, x, y, 5 * (2 * R + gap), 2 * R + 2)
    for k in range(5): star5(d, x + R + k * (2 * R + gap), y + R + 1, R, k < n)
def bigbar(im, x, y, w, h, frac, col=ZG, name=None):
    d = D(im); well(im, x, y, w, h, alpha=200)
    if name: rec(name, x, y, w, h)
    d.rectangle([x + 2, y + 2, x + 2 + int((w - 4) * frac) - 1, y + h - 3], fill=col)
# ---------------- panel ----------------
def panel(im, W, H, o, step, title, sub, dbl_shot=None):
    pw = min(600, W - 40); ph = H - 36; px = (W - pw) // 2; py = 18; rec('panel', px, py, pw, ph)
    glass(im, px, py, pw, ph, head=34); d = D(im)
    portrait_b(im, px + 22, py + 17, anim={0: 'giling', 1: 'giling', 2: 'seduh', 3: 'steam_tuang', 4: 'steam_tuang', 5: 'serah'}.get(step, 'ramah') if step is not None else 'ramah')
    rec('potret_barista', px + 7, py + 2, 30, 30)
    wtext(d, px + 42, py + 5, title); wtext(d, px + 42, py + 18, sub, '#9AA6B6', False)
    closeb(im, px + pw - 8, py + 7, name='btn_berhenti')
    LC = 150; lx = px + 8; y0 = py + 42
    if o: ticket(im, lx, y0, LC, o)
    rx = lx + LC + 10; rw = px + pw - 8 - rx
    if step is not None: progress(im, rx, y0, rw, step, o['dbl'] if o else False)
    return dict(px=px, py=py, pw=pw, ph=ph, lx=lx, rx=rx, rw=rw, y0=y0, LC=LC, d=d)
def area(im, P, top=26):
    x, y, w = P['rx'], P['y0'] + top, P['rw']; h = P['py'] + P['ph'] - 8 - y; well(im, x, y, w, h, alpha=110); rec('area_langkah', x, y, w, h); return x, y, w, h
def prop(name, k=2): return big(Image.open(B + 'props/' + name + '.png').convert('RGBA'), k)
def bahan_row(im, x, y, items):
    d = D(im)
    for i, (b, t) in enumerate(items):
        im.alpha_composite(ic('bahan_' + b), (x + i * 64 + 16, y)); wtext(d, x + i * 64 + 32, y + 33, t, '#FFFFFF', False, anchor='ma')
# ---------------- screens ----------------
SUB = 'Shift barista · FamilyMart'
def s01(W, H):
    SCREEN[0] = '01_pesanan'; im = base(W, H); o = ORDER
    P = panel(im, W, H, o, None, 'FamiCafe · Pesanan masuk', SUB); d = P['d']; x, y, w = P['rx'], P['y0'], P['rw']
    wtext(d, x, y, 'Antrean (3)', '#9AA6B6', False)
    for k, q in enumerate(QUEUE): mini_ticket(im, x + k * ((w - 6) // 2 + 6), y + 14, (w - 6) // 2, q, k)
    yy = y + 56; wtext(d, x, yy, 'Resep: ' + mname(o) + ' · Large · Less Sugar · Double Shot', '#FFFFFF')
    st = C.recipe(o['mid'], o['suhu'], o['uk'], o['gula'], o['dbl'])
    well(im, x, yy + 15, w, 96); rec('resep_langkah', x, yy + 15, w, 96)
    cols = 3; cw = (w - 8) // cols
    for i, s in enumerate(st):
        cx = x + 4 + (i % cols) * cw; cy = yy + 19 + (i // cols) * 30
        dd = D(im); dd.rectangle([cx, cy, cx + 17, cy + 17], fill=FG if i else FBL); text(dd, cx + 9, cy + 3, str(i + 1), '#FFFFFF', 11, True, anchor='ma')
        lab = {'giling': 'Giling 18 g', 'tamper': 'Tamper', 'seduh': 'Seduh shot 1', 'seduh_2': 'Seduh shot 2', 'steam': 'Steam 250 ml',
               'gula': 'Gula: Less (1/2)', 'tuang': 'Tuang + art', 'tutup': 'Tutup Large', 'serah': 'Serahkan'}.get(s, s)
        wtext(dd, cx + 22, cy + 3, lab, '#FFD166' if s in ('seduh_2', 'gula', 'tutup', 'steam') else '#FFFFFF', False)
    yb = yy + 117
    patience(im, x, yb, 200, .82, 'Sabar pelanggan · 58 dtk')
    wtext(d, x + 212, yb, 'Upah usulan', '#9AA6B6', False); wtext(d, x + 212, yb + 13, rp(C.upah('L', True, 5)[0]) + ' + tip', '#3DDC84')
    by = P['py'] + P['ph'] - 34
    gbutton(im, x + w - 150, by, 150, 26, 'Mulai racik', 'green', 'hover', icon='check', name='btn_mulai')
    gbutton(im, x + w - 150 - 8 - 96, by, 96, 26, 'Tolak', 'red', icon='cancel', name='btn_tolak')
    gbutton(im, x, by, 120, 26, 'Lihat menu', 'blue', icon='book', name='btn_menu')
    return im
def step_screen(W, H, step, title, hint):
    im = base(W, H); P = panel(im, W, H, ORDER, step, 'FamiCafe · ' + title, hint); return im, P
def s02(W, H):
    SCREEN[0] = '02_giling'; im, P = step_screen(W, H, 0, 'Giling', 'Tahan tombol sampai takaran 18 g'); d = P['d']
    x, y, w, h = area(im, P)
    g = prop('grinder_sw'); im.alpha_composite(g, (x + 14, y + 12))
    bahan_row(im, x + 90, y + 92, [('biji_kopi', '18 g'), ('espresso', '2 shot')])
    tbar(im, x + 96, y + 34, w - 112, [(0, .55, ZR), (.55, .7, ZY), (.7, .82, ZG), (.82, .9, ZY), (.9, 1, ZR)], .64, 'Takaran bubuk',
         [(0, '0'), (.76, '18 g'), (1, '24 g')], ghost=.76, name='bar_takaran', verdict=('16,4 g', '#FFD166'))
    gbutton(im, x + w - 168, y + h - 34, 160, 26, 'Tahan: giling', 'green', 'pressed', icon='hourglass', name='btn_tahan')
    wtext(d, x + 96, y + h - 28, 'Lepas di zona hijau.', '#9AA6B6', False)
    return im
def s03(W, H):
    SCREEN[0] = '03_tamper'; im, P = step_screen(W, H, 1, 'Tamper', 'Tekan rata, jangan miring'); d = P['d']
    x, y, w, h = area(im, P)
    # tampilan atas portafilter (lingkaran bubuk) + level rata
    cx, cy, r = x + 60, y + 62, 34
    d.ellipse([cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4], fill='#5A6577', outline='#1B2230'); d.ellipse([cx - r, cy - r, cx + r, cy + r], fill='#6B4F3A')
    d.ellipse([cx - r + 6, cy - r + 6, cx + r - 6, cy + r - 6], fill='#94704F'); d.rectangle([cx + r + 2, cy - 5, cx + r + 34, cy + 5], fill='#2A3242')
    d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], outline='#D49A5E'); rec('portafilter_atas', cx - r - 4, cy - r - 4, 2 * r + 40, 2 * r + 8)
    wtext(d, cx, cy + r + 10, 'Rata 92%', '#3DDC84', anchor='ma')
    tbar(im, x + 130, y + 30, w - 146, [(0, .35, ZR), (.35, .55, ZY), (.55, .8, ZG), (.8, .9, ZY), (.9, 1, ZR)], .68, 'Tekanan',
         [(0, 'pelan'), (.67, '15 kg'), (1, 'keras')], ghost=.67, name='bar_tekanan', verdict=('Pas!', '#3DDC84'))
    tbar(im, x + 130, y + 92, w - 146, [(0, .2, ZR), (.2, .4, ZY), (.4, .6, ZG), (.6, .8, ZY), (.8, 1, ZR)], .47, 'Kemiringan',
         [(0, 'kiri'), (.5, 'rata'), (1, 'kanan')], ghost=.5, name='bar_miring')
    gbutton(im, x + w - 168, y + h - 34, 160, 26, 'Tekan', 'green', 'normal', icon='check', name='btn_tekan')
    return im
def s04(W, H, shot=2):
    SCREEN[0] = '04_seduh'; im, P = step_screen(W, H, 2, 'Seduh espresso', f'Shot {shot}/2 · stop di 25-30 detik'); d = P['d']
    x, y, w, h = area(im, P)
    m = prop('mesin_espresso_sw'); im.alpha_composite(m, (x + 6, y + 8)); gl = B + 'props/mesin_espresso_sw__glow.png'
    if os.path.exists(gl): im.alpha_composite(big(Image.open(gl).convert('RGBA')), (x + 6, y + 8))
    sx = x + 136; wtext(d, sx, y + 8, 'Shot', '#9AA6B6', False)
    for k in range(2):
        i = ic('mod_shot_1'); im.alpha_composite(i if k < shot else icons.grey(i), (sx + 30 + k * 34, y + 2))
    wtext(d, sx + 104, y + 8, f'{shot}/2', '#FFD166'); rec('shot_counter', sx, y + 2, 140, 32)
    wtext(d, x + w - 10, y + 8, '27,4 dtk', '#FFFFFF', anchor='ra'); rec('timer_seduh', x + w - 80, y + 6, 70, 16)
    tbar(im, sx, y + 62, w - 146, [(0, .5, ZR), (.5, .625, ZY), (.625, .75, ZG), (.75, .825, ZY), (.825, 1, ZR)], .685, 'Waktu ekstraksi',
         [(0, '0'), (.625, '25'), (.75, '30'), (1, '40 dtk')], name='bar_seduh', verdict=('Pas!', '#3DDC84'), h=22)
    wtext(d, sx, y + 112, 'Shot 1: 28,1 dtk  Pas', '#3DDC84', False); rec('hasil_shot_1', sx, y + 112, 160, 14)
    gbutton(im, x + w - 168, y + h - 34, 160, 26, 'Stop', 'red', 'normal', icon='cancel', name='btn_stop')
    return im
def s05(W, H):
    SCREEN[0] = '05_steam'; im, P = step_screen(W, H, 3, 'Steam susu', 'Susu 250 ml (Large) · 60-65 °C'); d = P['d']
    x, y, w, h = area(im, P)
    pt = prop('pitcher_susu_sw', 4); im.alpha_composite(pt, (x + 64 - pt.width // 2, y + 12))
    bahan_row(im, x + 32, y + 26 + pt.height, [('susu', '250 ml')])
    sx = x + 136
    tbar(im, sx, y + 30, w - 146, [(0, .55, '#5A6577'), (.55, .7, ZY), (.7, .78, ZG), (.78, .86, ZY), (.86, 1, ZR)], .73, 'Suhu susu',
         [(0, '20'), (.74, '62 °C'), (1, '80')], name='bar_suhu', verdict=('62 °C', '#3DDC84'), h=22)
    wtext(d, sx, y + 86, 'Busa (microfoam)', '#FFFFFF', False); bigbar(im, sx, y + 100, w - 146, 12, .7, '#E7EBF2', name='bar_busa')
    wtext(d, x + w - 10, y + 86, 'tipis · pas untuk latte', '#9AA6B6', False, anchor='ra')
    gbutton(im, x + w - 168, y + h - 34, 160, 26, 'Tahan: steam', 'green', 'pressed', icon='hourglass', name='btn_tahan_steam')
    return im
def latte_surface(im, cx, cy, rx, ry, prog):
    d = D(im); rec('permukaan_latte', cx - rx - 4, cy - ry - 4, 2 * rx + 9, 2 * ry + 9)
    d.ellipse([cx - rx - 4, cy - ry - 4, cx + rx + 4, cy + ry + 4], fill='#FFFFFF', outline='#A7B2C4')
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill='#94704F'); d.ellipse([cx - rx + 4, cy - ry + 3, cx + rx - 4, cy + ry - 3], fill='#B48455')
    # rosetta: daun bertumpuk (bentuk referensi titik-titik) + bagian yang sudah dituang (isi susu)
    n = 6
    for k in range(n):
        yy = cy - ry + 10 + k * (2 * ry - 22) // n; ww = int((rx - 10) * (1 - k * .11))
        box = [cx - ww, yy - 4, cx + ww, yy + 5]
        box = [cx - ww, yy - 6, cx + ww, yy + 8]
        if k >= n - int(n * prog): d.arc(box, 180, 360, fill='#F4EBDA', width=3)
        else:
            for t in range(186, 360, 10):
                a = math.radians(t); d.point((round(cx + ww * math.cos(a)), round(yy + 1 + 7 * math.sin(a))), fill='#F4EBDA')
    d.line([cx, cy - ry + 8, cx, cy + ry - 6], fill='#F4EBDA'); d.ellipse([cx - 4, cy - ry + 5, cx + 4, cy - ry + 11], fill='#F4EBDA')
def s06(W, H):
    SCREEN[0] = '06_tuang_latteart'; im, P = step_screen(W, H, 4, 'Tuang & latte art', 'Rosetta · goyang pelan lalu tarik'); d = P['d']
    x, y, w, h = area(im, P)
    latte_surface(im, x + 70, y + 66, 56, 40, .6)
    wtext(d, x + 70, y + 114, 'Rosetta 60%', '#FFD166', anchor='ma')
    sx = x + 150
    tbar(im, sx, y + 30, w - 160, [(0, .25, ZR), (.25, .4, ZY), (.4, .6, ZG), (.6, .75, ZY), (.75, 1, ZR)], .52, 'Kecepatan tuang',
         [(0, 'pelan'), (.5, 'pas'), (1, 'deras')], name='bar_tuang', verdict=('Pas!', '#3DDC84'))
    wtext(d, sx, y + 76, 'Isi gelas Large', '#FFFFFF', False); bigbar(im, sx, y + 90, w - 160, 12, .72, '#F4EBDA', name='bar_isi')
    d.line([sx + 2 + int((w - 164) * .92), y + 87, sx + 2 + int((w - 164) * .92), y + 104], fill='#FFD166'); wtext(d, sx + w - 160, y + 106, 'batas 480 ml', '#FFD166', False, anchor='ra')
    gbutton(im, x + w - 168, y + h - 34, 160, 26, 'Tahan: tuang', 'green', 'pressed', icon='hourglass', name='btn_tahan_tuang')
    gbutton(im, x + w - 168 - 128, y + h - 34, 120, 26, 'Tarik garis', 'blue', name='btn_tarik')
    return im
def choice(im, x, y, w, h, label, sel, name, icon=None, ok=None):
    d = D(im); rec(name, x, y, w, h)
    lay = Image.new('RGBA', (w, h), (49, 106, 197, 160) if sel else (20, 32, 52, 150)); im.alpha_composite(lay, (x, y))
    d.rectangle([x, y, x + w - 1, y + h - 1], outline=G['sel2'] if sel else G['edge'])
    if sel: d.rectangle([x - 1, y - 1, x + w, y + h], outline='#FFFFFF')
    tx = x + 6
    if icon is not None: im.alpha_composite(icon, (x + 3, y + (h - icon.height) // 2)); tx = x + icon.width + 6
    wtext(d, tx, y + (h - 12) // 2, label, '#FFFFFF' if sel else '#C8C8C8', sel)
    if ok is not None: im.alpha_composite(icons.get('check' if ok else 'cancel', 16), (x + w - 19, y + 2))
def s07(W, H, wrong=False):
    SCREEN[0] = '07_tutup_serahkan' if not wrong else '07b_serahkan_salah'; im, P = step_screen(W, H, 5, 'Tutup & serahkan', 'Cek pesanan di tiket sebelum diserahkan'); d = P['d']
    x, y, w, h = area(im, P)
    cw = (w - 24) // 2
    wtext(d, x + 8, y + 6, 'Ukuran gelas', '#9AA6B6', False)
    uk = 'R' if wrong else 'L'
    for i, (k, t) in enumerate((('R', 'Regular'), ('L', 'Large'))):
        choice(im, x + 8 + i * (cw + 8), y + 20, cw, 36, t + (' 360 ml' if k == 'R' else ' 480 ml'), k == uk, f'pilih_ukuran_{k}', icon=ic(f'menu_cafe_latte_hot_{k}'),
               ok=(k == 'L') if k == uk else None)
    wtext(d, x + 8, y + 62, 'Gula', '#9AA6B6', False); gw = (w - 32) // 3
    for i, k in enumerate(('normal', 'less', 'no')):
        choice(im, x + 8 + i * (gw + 8), y + 76, gw, 36, C.GULA[k], k == 'less', f'pilih_gula_{k}', icon=ic('mod_gula_' + k), ok=True if k == 'less' else None)
    wtext(d, x + 8, y + 118, 'Double Shot', '#9AA6B6', False); wtext(d, x + 16 + 2 * (gw + 8), y + 118, 'Tutup', '#9AA6B6', False)
    for i, (k, t) in enumerate(((True, 'Ya'), (False, 'Tidak'))):
        choice(im, x + 8 + i * (gw + 8), y + 132, gw, 36, t, k, f'pilih_shot_{str(k).lower()}', icon=ic('mod_shot_' + ('2' if k else '1')), ok=True if k else None)
    choice(im, x + 8 + 2 * (gw + 8), y + 132, gw, 36, 'Tutup', True, 'pilih_tutup', icon=ic('menu_cafe_latte_hot_L'), ok=True)
    cup = prop('cup_tutup_L_cafe_latte_sw' if os.path.exists(B + 'props/cup_tutup_L_cafe_latte_sw.png') else 'cup_tutup_L_sw')
    bh = y + h - 34
    if wrong:
        balloon(im, x + 8, bh - 4, w - 190, 'Ukuran beda dengan tiket (Large). Tetap serahkan? -1 bintang.')
        gbutton(im, x + w - 168, bh, 160, 26, 'Serahkan', 'brass', 'hover', icon='warn', name='btn_serahkan')
    else:
        wtext(d, x + 8, bh + 7, 'Semua cocok dengan tiket #12', '#3DDC84')
        gbutton(im, x + w - 168, bh, 160, 26, 'Serahkan', 'green', 'hover', icon='check', name='btn_serahkan')
    return im
def result(W, H, ok=True):
    SCREEN[0] = '08_hasil_sukses' if ok else '09_hasil_gagal'
    im = base(W, H, 150, money=rp(1250000 + (5500 if ok else 0))); dim(im, 60)
    w, h = 340, 300; x, y = (W - w) // 2, (H - h) // 2; rec('popup_hasil', x, y, w, h); glass(im, x, y, w, h, head=34, alpha=225); d = D(im)
    portrait_b(im, x + 22, y + 17, anim='ramah' if ok else 'idle')
    wtext(d, x + 42, y + 5, 'Pesanan #12 ' + ('selesai' if ok else 'gagal')); wtext(d, x + 42, y + 18, mname(ORDER) + ' · Large · Less · 2 shot', '#9AA6B6', False)
    if ok:
        stars(im, x + (w - 5 * 26) // 2 + 2, y + 42, 4)
        wtext(d, x + w // 2, y + 70, 'Ichsan: "Enak, pas manisnya!"', '#FFFFFF', False, anchor='ma')
        rows = [('Giling', .92), ('Tamper', .88), ('Seduh (2 shot)', .84), ('Steam', .9), ('Latte art', .6), ('Pesanan cocok', 1)]
    else:
        stars(im, x + (w - 5 * 26) // 2 + 2, y + 42, 0)
        wtext(d, x + w // 2, y + 70, 'Pelanggan pergi: espresso gosong 41 dtk', '#E5484D', True, anchor='ma')
        rows = [('Giling', .8), ('Tamper', .7), ('Seduh (2 shot)', .1), ('Steam', 0), ('Latte art', 0), ('Pesanan cocok', 0)]
    yy = y + 90; well(im, x + 10, yy, w - 20, 100); rec('rincian_akurasi', x + 10, yy, w - 20, 100)
    for i, (lab, v) in enumerate(rows):
        ry = yy + 4 + i * 16; wtext(d, x + 16, ry, lab, '#FFFFFF', False)
        col = ZG if v >= .75 else ZY if v >= .4 else ZR
        d.rectangle([x + 120, ry + 3, x + 120 + 150, ry + 10], fill='#1B2230'); d.rectangle([x + 120, ry + 3, x + 120 + int(150 * v), ry + 10], fill=col) if v > 0 else None
        wtext(d, x + w - 16, ry, f'{int(v*100)}%', col, anchor='ra')
    yy += 106; well(im, x + 10, yy, w - 20, 62); rec('rincian_upah', x + 10, yy, w - 20, 62)
    if ok:
        u, t = C.upah('L', True, 4)
        L = [('Upah dasar', rp(2500), '#FFFFFF'), ('+ Large / + Double Shot', rp(500) + ' / ' + rp(500), '#FFFFFF'), ('Tip (4 bintang)', rp(t), '#FFD166'), ('Total', '+' + rp(u + t), '#3DDC84')]
    else:
        L = [('Upah dasar', rp(0), '#9AA6B6'), ('Modifier', '-', '#9AA6B6'), ('Tip', rp(0), '#9AA6B6'), ('Total', rp(0), '#E5484D')]
    for i, (a, b, c) in enumerate(L):
        wtext(d, x + 16, yy + 3 + i * 14, a, '#9AA6B6' if i < 3 else '#FFFFFF', i == 3); wtext(d, x + w - 16, yy + 3 + i * 14, b, c, True, anchor='ra')
    by = y + h - 34
    if ok:
        gbutton(im, x + 10, by, 156, 26, 'Pesanan berikut', 'green', 'hover', icon='check', name='btn_berikut')
        gbutton(im, x + 174, by, 156, 26, 'Selesai shift', 'blue', icon='clock', name='btn_selesai')
    else:
        gbutton(im, x + 10, by, 156, 26, 'Coba lagi', 'brass', 'hover', icon='hourglass', name='btn_coba_lagi')
        gbutton(im, x + 174, by, 156, 26, 'Selesai shift', 'red', icon='cancel', name='btn_selesai')
    return im
SCREENS = [('01_pesanan', s01), ('02_giling', s02), ('03_tamper', s03), ('04_seduh', s04), ('05_steam', s05), ('06_tuang_latteart', s06),
           ('07_tutup_serahkan', s07), ('07b_serahkan_salah', lambda W, H: s07(W, H, True)),
           ('08_hasil_sukses', lambda W, H: result(W, H, True)), ('09_hasil_gagal', lambda W, H: result(W, H, False))]
def savei(name, im, W):
    im = im.convert('RGB')
    if W == 844: im.save(f'{OUTU}1x_native/{name}.png'); big(im).save(f'{OUTU}{name}.png')
    else: im.save(f'{OUTU}1x_native/{name}_667x375.png'); big(im).save(f'{OUTU}667x375/{name}_667x375@2x.png')
def components():
    """lembar komponen 4x + slice atlas (elemen datar di atas latar transparan/kaca)"""
    W, H = 300, 280; im = Image.new('RGBA', (W, H), '#1B2230'); SCREEN[0] = '_komponen'; SIZE[0] = 'komponen'
    glass(im, 4, 4, W - 8, H - 8, head=0); d = D(im)
    ticket(im, 10, 10, 150, ORDER, name='k_tiket')
    mini_ticket(im, 10, 234, 150, QUEUE[0], 'k')
    x = 168
    tbar(im, x, 28, 120, [(0, .5, ZR), (.5, .625, ZY), (.625, .75, ZG), (.75, .825, ZY), (.825, 1, ZR)], .685, 'Bar timing', name='k_bar_timing')
    stars(im, x, 58, 3, R=9, gap=3, name='k_bintang')
    patience(im, x, 84, 120, .4, 'Sabar', name='k_sabar')
    for i, (st) in enumerate(('normal', 'hover', 'pressed', 'disabled')): gbutton(im, x, 116 + i * 24, 120, 20, st.capitalize(), ['green', 'blue', 'red', 'green'][i], st, name=f'k_btn_{st}')
    chip(im, x, 214, 'Large', True, FBL, name='k_chip_on'); chip(im, x + 52, 214, 'Regular', False, name='k_chip_off')
    return im
if __name__ == '__main__':
    for W, H in ((844, 390), (667, 375)):
        SIZE[0] = f'{W}x{H}'
        for n, f in SCREENS: savei(n, f(W, H), W)
    k = components(); big(k, 4).convert('RGB').save(OUTU + '30_komponen_4x.png')
    # slices transparan (elemen datar)
    SL = {}
    def sl(name, fn, w, h):
        c = Image.new('RGBA', (w, h)); SCREEN[0] = '_slice'; fn(c); c.save(OUTU + 'slices/' + name + '.png'); SL[name] = [w, h]
    sl('tiket_order', lambda c: ticket(c, 0, 0, 150, ORDER, name='s'), 150, 214)
    sl('tiket_antre', lambda c: mini_ticket(c, 0, 0, 150, QUEUE[0], 's'), 150, 34)
    for z in ('on', 'off'):
        sl(f'chip_{z}', lambda c, z=z: chip(c, 0, 0, 'Large', z == 'on', FBL), 44, 17)
    for n in range(6): sl(f'bintang_{n}', lambda c, n=n: stars(c, 0, 0, n), 130, 24)
    st = lambda c, on: star5(D(c), 11, 11, 11, on)
    sl('bintang_isi', lambda c: st(c, True), 23, 23); sl('bintang_kosong', lambda c: st(c, False), 23, 23)
    for nm, zs in (('zona_seduh', [(0, .5, ZR), (.5, .625, ZY), (.625, .75, ZG), (.75, .825, ZY), (.825, 1, ZR)]),):
        c = Image.new('RGBA', (240, 18)); dd = D(c)
        for a, b, col in zs: dd.rectangle([int(a * 240), 0, int(b * 240) - 1, 17], fill=col)
        c.save(OUTU + 'slices/bar_' + nm + '.png'); SL['bar_' + nm] = [240, 18]
    c = Image.new('RGBA', (9, 26)); dd = D(c); dd.polygon([(0, 0), (8, 0), (4, 4)], fill='#FFFFFF'); dd.rectangle([3, 5, 5, 25], fill='#FFFFFF'); c.save(OUTU + 'slices/penanda_bar.png'); SL['penanda_bar'] = [9, 26]
    json.dump(dict(rects=lt.REC, slices=SL), open(B + 'src/_ui.json', 'w'), indent=1, ensure_ascii=False)
    print(len(lt.REC), 'rects')
