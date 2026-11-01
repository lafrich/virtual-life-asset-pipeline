"""Kamar Cove kosongan (preview): shell kamar (lantai, 2 dinding, sekat kamar mandi + ambang pintu, keset pintu keluar), kasur,
WC gantung, pintu lobi 4 status + papan 'BELUM BISA DISEWA' / 'TERSEDIA UNTUK DIBELI'. Engine street_buildings (v6b: iso 2:1,
tile 64x32, cahaya dari kiri, 4-5 tone, bayangan alpha 56, tanpa outline hitam).
Ukuran dan posisi diambil dari index.html (Cove: CV c0=-21.6 c1=-12.8 rr0=21.0 R=28, sekat PW=-16.5, ambang r 25.75-26.75,
kasur c -21.5..-19.3 r 21.05..23.65, WC c -13.55..-13.02 r 21.05..21.78, dinding HW=40 h-unit; 1 h-unit = HS 1.6 x PPU 2 = 3.2 px)."""
import sys, os, json
sys.path.insert(0, 'assets/street_buildings/_work')
from lib import *
import engine
OUT = 'assets/kamar_cove_kosong'
H = lambda h: int(round(h * 3.2))                         # game h-unit -> px
# ---- materials: semua hex dari interior Cove di index.html
for n, hx_ in (('COVEW', ['#9EA2A9', '#BFC2C8', '#CBCED4', '#D9DBE0', '#E4E6EA']),        # dinding kamar (abu muda)
               ('COVEF', ['#3A3C41', '#74777D', '#8A8D92', '#9EA2A9', '#B8BEC6']),        # lantai keramik abu
               ('LOBF', ['#3E4742', '#4E5852', '#66716A', '#7C887E', '#8F8172']),         # lantai lobi
               ('BRICK', ['#B8B2A8', '#CBC6BC', '#D8D4CB', '#E5E2DB', '#F2F0EB']),        # bata putih lobi
               ('DOORO', ['#93492A', '#B9692A', '#C77A35', '#D9823A', '#EE9D50']),        # pintu oranye lobi
               ('BANDO', ['#B86A28', '#C9772F', '#E3913C', '#F0A24A', '#FFD9A0']),        # pita plafon oranye
               ('BOWL', ['#5A6577', '#9FB7BF', '#CFDDE2', '#E7EBF2', '#FFFFFF'])):        # keramik WC (lubang biru keabuan)
    if n not in MI: engine.mat(n, hx_)
C0, C1, R0, R1 = -21.6, -12.8, 21.0, 28.0
PW, DA, DB = -16.5, 25.75, 26.75
HW = H(40)                                                # 128 px
def lc(c): return c - C0
def lr(r): return r - R0
# ---------------------------------------------------------------- shell
def shell(part='ruang'):
    """part: 'ruang' = lantai + 2 dinding + keset; 'sekat_penuh' / 'sekat_rendah' (cutaway, seperti sekat transparan di game) di kanvas yang sama"""
    W, D = C1 - C0, R1 - R0
    s = Spr(int((W + D) * 32) + 80, int((W + D) * 16) + HW + 80, int(D * 32) + 40, HW + 40)
    pw, da, db = lc(PW), lr(DA), lr(DB)
    def floor(c, r):
        bath = c >= pw
        g = np.where(bath, .4, .5)
        line = ((c % g) < .035) | ((r % g) < .035)
        m = np.where(bath, MI['WHITE'], MI['COVEF']).astype(np.int16)
        t = np.where(bath, np.where(line, 2, 3), np.where(line, 1, 2)).astype(np.int8)
        mat_ = (c > 1.4) & (c < 2.6) & (r > 6.35) & (r < 6.95)                         # keset pintu keluar (ke lobi)
        m = np.where(mat_, MI['DARK'], m); t = np.where(mat_, np.where(((c * 8) % 1) < .5, 1, 2), t)
        return m.astype(np.int16), t.astype(np.int8)
    if part != 'ruang': return sekat(s, part == 'sekat_penuh')
    s.top(0, 0, W, D, 0, floor, shift=0, ground=True)
    # dinding belakang (r=0): kamar polos; kamar mandi keramik putih sampai h26, lalu cat; pita plafon gelap
    Wb = int(round(W * 32)); tb = Tex(Wb, HW, 'COVEW', 3)
    ub = int(round(pw * 32))
    tb.rect(ub, 0, Wb, H(26), 'WHITE', 3)
    for v in range(0, H(26), 8): tb.rect(ub, v, Wb, v + 1, 'WHITE', 2)
    for u in range(ub, Wb, 13): tb.rect(u, 0, u + 1, H(26), 'WHITE', 2)
    tb.rect(0, 0, Wb, 2, 'COVEW', 1)                                                       # plint
    tb.rect(0, HW - 3, Wb, HW, 'COVEW', 1)
    s.face_sw(0, W, 0, 0, HW, tb)
    # dinding samping (c=0): jendela dengan kerai (r 22.3-24.3, h 13-33)
    Ds = int(round(D * 32)); ts = Tex(Ds, HW, 'COVEW', 3)
    ts.rect(0, 0, Ds, 2, 'COVEW', 1); ts.rect(0, HW - 3, Ds, HW, 'COVEW', 1)
    u0, u1 = int(round((D - lr(24.3)) * 32)), int(round((D - lr(22.3)) * 32))           # face_se: u=0 di depan (r besar)
    ts.rect(u0 - 1, H(12.4), u1 + 1, H(33) + 1, 'DARK', 2); ts.rect(u0, H(13), u1, H(33), 'GLASS', 4)
    for v in range(H(13) + 2, H(33), 4): ts.rect(u0, v, u1, v + 2, 'GLASS', 3)
    ts.rect(u0 - 2, H(12.4) - 2, u1 + 2, H(12.4), 'COVEW', 4)                                # ambang jendela
    s.face_se(0, D, 0, 0, HW, ts)
    o, g = s.render(edges=False)
    return Image.fromarray(o), s
def sekat(s, full):
    W, D = C1 - C0, R1 - R0; pw, da, db = lc(PW), lr(DA), lr(DB); top_ = HW if full else H(7)
    # sekat kamar | kamar mandi (c=PW), ambang pintu r DA-DB; sisi kamar mandi keramik
    def pface(r0_, r1_, z0, z1):
        w = int(round((r1_ - r0_) * 32)); t = Tex(w, z1 - z0, 'COVEW', 3)
        top = min(z1, H(26)) - z0
        if top > 0:
            t.rect(0, 0, w, top, 'WHITE', 3)
            for v in range(0, top, 8): t.rect(0, v, w, v + 1, 'WHITE', 2)
            for u in range(0, w, 13): t.rect(u, 0, u + 1, top, 'WHITE', 2)
        return t
    for (a, b) in ((0, da), (db, D)):
        s.box(pw - .1, a, pw + .04, b, 0, top_, 'COVEW', 3, se=pface(a, b, 0, top_))
    if full: s.box(pw - .1, da, pw + .04, db, H(30), HW, 'COVEW', 3, se=pface(da, db, H(30), HW))
    s.box(pw + .04, da, pw + .08, da + .07, 0, H(30) if full else top_, 'DARK', 2); s.box(pw + .04, db - .07, pw + .08, db, 0, H(30) if full else top_, 'DARK', 2)   # kusen
    o, g = s.render(edges=False)
    return Image.fromarray(o), s
# ---------------------------------------------------------------- furniture (asset registry -> 4 arah)
@asset('kasur_kost', 'cove_kosong', 1.3, 2.6, 60, oris=('sw', 'se', 'ne', 'nw'),
       note='kasur single kost: rangka kayu, kasur putih, bantal, selimut abu-biru terlipat di kaki. sandaran kepala di b=D (rapat dinding)')
def kasur(L):
    W, D = 1.3, 2.6
    L.box(0, D - .15, W, D, 0, H(13), 'WOOD', 3)                                            # sandaran kepala
    L.box(.05, 0, W - .05, D - .15, 0, H(3.6), 'WOOD', 2)                                   # dipan
    L.box(.08, .03, W - .08, D - .17, H(3.6), H(6.2), 'LITE', 3)                            # kasur
    L.box(.12, D - .75, W - .12, D - .22, H(6.2), H(7.6), 'WHITE', 4)                      # bantal
    L.box(.06, .02, W - .06, .75, H(6.2), H(7.0), 'FBLUE', 3)                              # selimut terlipat di kaki
    L.box(.06, .62, W - .06, .75, H(7.0), H(7.3), 'FBLUE', 2)
    bshadow(L, 0, 0, W, D, H(7.6))
@asset('wc_gantung', 'cove_kosong', .53, .75, 50, oris=('sw', 'se', 'ne', 'nw'),
       note='WC gantung (closet duduk) + panel tangki di dinding (b=D) + tombol flush; dudukan gelap, seperti WC kamar Cove v6e')
def wc(L):
    W, D = .53, .75
    L.box(0, D - .25, W, D, H(5.4), H(12), 'WHITE', 4)                                     # panel tangki (di dinding)
    L.front(.17, .36, D - .25, H(9.2), H(10.6), Tex(7, 5, 'CONC', 3).rect(0, 0, 7, 1, 'CONC', 2))   # tombol flush
    L.box(.05, 0, W - .05, D - .2, H(2.4), H(4.6), 'BOWL', 3)                              # mangkuk
    c, r = L.cr(W / 2, (D - .2) / 2 + .02)
    th = np.linspace(0, 2 * np.pi, 160)
    for k, (ra, rb, m, t) in enumerate(((.19, .23, 'DARK', 2), (.13, .17, 'DARK', 3), (.115, .15, 'BOWL', 2), (.07, .095, 'BOWL', 1))):
        rr_ = np.linspace(0, 1, 9)[:, None]
        if k == 0: rr_ = np.linspace(.62, 1, 6)[:, None]
        cc = c + ra * rr_ * np.cos(th); rc = r + rb * rr_ * np.sin(th)
        L.s.points(cc, rc, np.full(cc.shape, H(4.6) + .5 + k * .01), m, t)
    bshadow(L, 0, 0, W, D, H(4))
# ---------------------------------------------------------------- lobby door (sw face) + boards
def text_up(tex, u, v, txt, m, t, face='sw', W=None):
    """teks tegak di layar pada muka iso: tiap huruf dikompensasi geser 1:2 (face_sw: y = U//2 - V) agar huruf tidak terpotong
    geser; garis dasar tiap huruf mengikuti kemiringan papan (tangga per huruf). u = tengah, v = bawah huruf."""
    x = 0; g_all = []
    for ch in txt.upper():
        g = engine.PXF.get(ch, engine.PXF.get('?')); g_all.append((x, g)); x += len(g[0]) + 1
    u0 = int(u - (x - 1) / 2)
    for gx, g in g_all:
        ug = u0 + gx
        for j in range(5):
            for i in range(len(g[0])):
                if g[j][i] != '#': continue
                U = ug + i
                d = (U // 2 - ug // 2) if face == 'sw' else -(((W - 1 - U) // 2) - ((W - 1 - ug) // 2))
                tex.px(U, v + (4 - j) + d, m, t)
    return tex
def board_tex(lines, w, mode, face='sw'):
    hh = 5 + 7 * len(lines); t = Tex(w, hh, 'CARD' if mode == 'kayu' else 'LITE', 3)
    t.rect(0, 0, w, 1, 'WOOD' if mode == 'kayu' else 'CONC', 2); t.rect(0, hh - 1, w, hh, 'WOOD' if mode == 'kayu' else 'CONC', 2)
    t.rect(0, 0, 1, hh, 'WOOD' if mode == 'kayu' else 'CONC', 2); t.rect(w - 1, 0, w, hh, 'WOOD' if mode == 'kayu' else 'CONC', 2)
    col = {'kayu': 'RED', 'hijau': 'GREEN'}[mode]
    for i, ln in enumerate(lines): text_up(t, w // 2, hh - 9 - i * 7, ln, col, 1, face, w)
    return t
BOARDS = {'belum_bisa_disewa': (['BELUM', 'BISA', 'DISEWA'], 'kayu'), 'tersedia_untuk_dibeli': (['TERSEDIA', 'UNTUK', 'DIBELI'], 'hijau')}
def door_tex(num, status, name=None):
    """face texture of one lobby door incl. frame (1.12 tile wide, h 31.5): status milik | milik_orang_lain | terkunci | tersedia"""
    w = int(round(1.12 * 32)); hh = H(31.5); t = Tex(w, hh, 'DOORO', 2)
    for v in range(8, hh, 8): t.rect(0, v, w, v + 1, 'DOORO', 1)                              # bata kusen oranye
    lu0, lu1 = 4, w - 4; t.rect(lu0, 0, lu1, H(30), 'DOORO', 4); t.rect(lu0, 0, lu0 + 1, H(30), 'DOORO', 3)
    t.rect(lu1 - 5, H(13.4), lu1 - 3, H(16.5), 'OFF', 1); t.rect(lu1 - 7, H(14.6), lu1 - 3, H(15.2) + 1, 'OFF', 1)   # gagang
    t.rect(w // 2 - 6, H(24.5), w // 2 + 6, H(28.2), 'LITE', 4); text_up(t, w // 2, H(24.5) + 2, str(num), 'DARK', 1)
    if status in ('milik', 'milik_orang_lain') and name:
        t.rect(lu0 + 1, H(19.5), lu1 - 1, H(22.3), 'OFF', 2); text_up(t, w // 2, H(19.5) + 1, name, 'BANDO', 4)
    if status == 'milik_orang_lain':
        t.rect(lu1 - 6, H(17.5), lu1 - 3, H(18.5) + 1, 'LAMPR', 3, glow=True)               # lampu kunci merah
    if status == 'terkunci':
        t.rect(lu1 - 7, H(11.5), lu1 - 2, H(13.2), 'GOLD', 3); t.rect(lu1 - 6, H(13.2), lu1 - 3, H(14.2) + 1, 'CONC', 3)   # gembok
        for k in range(lu0, lu1, 2): t.px(k, H(15) + ((k // 2) % 2), 'CONC', 4)          # rantai melintang
    if status in ('terkunci', 'tersedia'):
        lines, mode = BOARDS['belum_bisa_disewa' if status == 'terkunci' else 'tersedia_untuk_dibeli']
        bt = board_tex(lines, w - 2, mode); v0 = H(2.5)
        t.m[v0:v0 + bt.H, 0:bt.W] = bt.m; t.t[v0:v0 + bt.H, 0:bt.W] = bt.t
        nv = v0 + bt.H + 5; t.rect(w // 2, nv, w // 2 + 1, nv + 2, 'CONC', 1)                  # paku + tali pendek
        for k in range(1, 6): t.px(w // 2 - 6 + k, nv - k + 1 if False else v0 + bt.H + k - 1, 'OFF', 2); t.px(w // 2 + 6 - k, v0 + bt.H + k - 1, 'OFF', 2)
    return t
def door_sprite(num, status, name=None):
    s = Spr(140, 200, 40, 160); t = door_tex(num, status, name)
    s.face_sw(0, 1.12, 0, 0, t.H, t)
    o, g = s.render(edges=False); piv = (s.X(.56, 0), s.Y(.56, 0)); o, g, p = crop(o, g, piv); return o, g, p
@asset('papan_berdiri_belum_bisa_disewa', 'cove_status', 1.0, .3, 60, oris=('sw', 'se'), note="papan berdiri kayu 'BELUM BISA DISEWA' di depan pintu kamar")
def papan_b(L): papan(L, 'belum_bisa_disewa')
@asset('papan_berdiri_tersedia', 'cove_status', 1.0, .3, 60, oris=('sw', 'se'), note="papan berdiri putih-hijau 'TERSEDIA UNTUK DIBELI'")
def papan_t(L): papan(L, 'tersedia_untuk_dibeli')
def papan(L, key):
    lines, mode = BOARDS[key]; w = 32; bt = board_tex(lines, w, mode, L.o); z0 = H(6)
    for a in (.12, .82): L.box(a, .12, a + .06, .18, 0, z0 + bt.H - 2, 'WOOD', 2)          # kaki
    L.box(0, .1, 1.0, .14, z0, z0 + bt.H, 'CARD' if mode == 'kayu' else 'LITE', 3, front=bt)
    bshadow(L, 0, .1, 1, .2, z0 + bt.H)
# ---------------------------------------------------------------- lobby
LC0, LR0, LR1 = -21.6, 24.6, 28.0
DOORS = [-20.5, -18.85, -17.2, -15.55, -13.9]
def lobby(states):
    W, D = C1 - C0, LR1 - LR0
    s = Spr(int((W + D) * 32) + 80, int((W + D) * 16) + HW + 80, int(D * 32) + 40, HW + 40)
    def floor(c, r):
        line = ((c % .5) < .035) | ((r % .5) < .035)
        return np.full(c.shape, MI['LOBF'], np.int16), np.where(line, 1, 2).astype(np.int8)
    s.top(0, 0, W, D, 0, floor, shift=0, ground=True)
    Wb = int(round(W * 32)); tb = Tex(Wb, HW, 'BRICK', 4)
    for row, v in enumerate(range(8, HW - 16, 8)):
        tb.rect(0, v, Wb, v + 1, 'BRICK', 2)
        for u in range(8 if row % 2 else 0, Wb, 16): tb.rect(u, v - 7, u + 1, v, 'BRICK', 2)
    tb.rect(0, HW - 16, Wb, HW, 'BANDO', 3); tb.rect(0, HW - 17, Wb, HW - 16, 'BANDO', 1); tb.rect(0, HW - 1, Wb, HW, 'BANDO', 0)
    for i in range(4):                                                                      # lampu dinding bulat
        u = int(round((((DOORS[i] + DOORS[i + 1]) / 2) - C0) * 32)); tb.rect(u - 2, H(30), u + 3, H(31.6), 'WARM', 4, glow=True)
    for i, dc in enumerate(DOORS):
        st, nm = states[i]; dt = door_tex(i + 1, st, nm); u = int(round((dc - .56 - C0) * 16)) * 2
        tb.m[0:dt.H, u:u + dt.W] = dt.m; tb.t[0:dt.H, u:u + dt.W] = dt.t; tb.g[0:dt.H, u:u + dt.W] = dt.g
    s.face_sw(0, W, 0, 0, HW, tb)
    Ds = int(round(D * 32)); ts = Tex(Ds, HW, 'BRICK', 3)
    for row, v in enumerate(range(8, HW - 16, 8)):
        ts.rect(0, v, Ds, v + 1, 'BRICK', 1)
        for u in range(8 if row % 2 else 0, Ds, 16): ts.rect(u, v - 7, u + 1, v, 'BRICK', 1)
    ts.rect(0, HW - 16, Ds, HW, 'BANDO', 2); ts.rect(0, HW - 1, Ds, HW, 'BANDO', 0)
    s.face_se(0, D, 0, 0, HW, ts)
    o, g = s.render(edges=False); return Image.fromarray(o), Image.fromarray(g), s
