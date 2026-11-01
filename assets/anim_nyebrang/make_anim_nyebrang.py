#!/usr/bin/env python3
"""Virtual Life - animasi NYEBRANG (menyeberang di zebra cross mengikuti sinyal), v6b 64x112 pivot (32,100). PREVIEW ONLY
(tidak di-deploy, index.html tidak diubah; mekanik sinyal oleh Baymax - ini hanya aset + manifest timing).
Body / head / face / legs / walk stride = the game's own v6b generator, never compressed (only shifted):
 - ichsan : live_v6b on v6b/live/chars/ichsan.json (= assets/chars/ichsan_v6b_sheet.png; idle f0 + walk f0..5 se/ne checked vs the sheet)
 - npc    : generic NPC, npc_v6b.make_cfg path (same cfg as anim_ambil_barang)
 - crossers a/b/c : npc_v6b build path incl. hijab / skirt / female body (npc_v6b.hijab, nv.skirt, pv.fem_jaw / fem_body)
Work arms = limb() of the babeh loak NPCs (shoulder + sleeve + elbow + forearm + hand), drawn in SCREEN coords (left-lit in every view).
Both base views face screen-right (se = down-right, ne = up-right, game: dr>0 'sw', dr<0 'ne', dc>0 'se', dc<0 'nw'); sw / nw = mirrors."""
import os, sys, json, math
sys.path.insert(0, 'assets/anim_ambil_barang')
sys.path.insert(0, 'assets/npc_babeh_loak')
from babeh_base import *
from make_babeh_loak import limb, over
import job_common as JC
OUT = os.path.dirname(os.path.abspath(__file__))
ICH = json.load(open('chars-iso/v6b/live/chars/ichsan.json'))
GAME_SHEET = 'game/assets/chars/ichsan_v6b_sheet.png'
NPC = dict(body='m', skin='medium', hair='short', hc='black', top='tee', tc='steel', pants='trousers', pc='charcoal', shoes='sneakers', sc='paper')
CROSSERS = {   # 3 crosser variations (look + pose)
 'penyeberang_a': dict(body='f', skin='medium', hair='long', hc='black', top='tee_long', tc='steel', pants='trousers', pc='night', shoes='shoes', sc='night',
                       hijab='oxblood', skirt=('long', 'night'), pose='santai', note='ibu berhijab, jalan biasa (lengan generator)'),
 'penyeberang_b': dict(body='m', skin='light', hair='short', hc='black', top='shirt', tc='paper', pants='trousers', pc='charcoal', shoes='shoes', sc='night',
                       pose='hp', note='pegawai kemeja putih, jalan sambil lihat HP (kepala menunduk)'),
 'penyeberang_c': dict(body='m', skin='deep', hair='short', hc='black', top='tee', tc='navy', pants='trousers', pc='slate', shoes='sneakers', sc='paper',
                       pose='permisi', note='pelajar, jalan sambil mengangkat tangan "permisi" ke mobil'),
}
TOPSTYLE = dict(top_style='tee')
VIEWS = ('se', 'sw', 'ne', 'nw')
UPPER = ['hair_back', 'body', 'arm_far', 'arm_near', 'shirt', 'shirt_graphic', 'outer', 'acc', 'body_front', 'held', 'face', 'hair_front', 'glasses', 'brows']
WATCH = X('#2A3242', '#1C2330', '#E7EBF2')
PHONE = X('#1C2330', '#2A3242', '#7FB2DE', '#E7EBF2')
WALK_BOB = lambda f: -1 if f in (1, 4) else 0
IDLE_BOB = lambda f: -1 if f in (2, 3) else 0

# ------------------------------------------------------------------ generator layers (frame space, unmirrored se / ne)
def ichsan_layers(anim, f, view, expr):
    C = ICH; O = C['outfits'][C['default_outfit']]; gl = C.get('glasses_default', False)
    se, pal = lv.build_char_layers(C, O); ne = lv.back_layers(se, C, O)
    for k in '01234': pal.setdefault('H' + k, lv.REFPAL[k])
    P = lv.pose_layers(se if view == 'se' else ne, lv.KIND[anim], f, view, C, O)
    for mk, mp in pal['_maps'].items(): P[mk] = lv.recolor(P[mk], mp)
    rg = {k: lv.to_img(v, pal) for k, v in P.items() if k not in ('face', 'brows', 'acc_head')}
    imgs = {k: np.array(v) for k, v in lv.frame_img(rg).items()}
    bob = WALK_BOB(f) if anim == 'walk' else IDLE_BOB(f)
    F, B, G = lv.face_layer(expr, C, view, 0, bob, gl, 0)
    fi = {k: np.array(v) for k, v in lv.frame_img({'f': lv.to_img(F, pal), 'b': lv.to_img(B, pal), 'g': lv.to_img(G, pal)}).items()}
    imgs['face'] = fi['f']; imgs['brows'] = fi['b']; imgs['glasses'] = fi['g']
    return imgs, pal

def npcx_layers(n, anim, f, view, expr):
    """npc_v6b.build path for one frame: female jaw/body, hijab, skirt, shoes style, face with the row's bob"""
    fem = n['body'] == 'f'; C, O = nv.make_cfg(n)
    se, pal = lv.build_char_layers(C, O)
    if fem: pv.fem_jaw(se)
    for k, v in C['hair_map'].items(): pal['H' + k] = hx(v)
    pal['B'] = hx(C['brow'])
    ne = lv.back_layers(se, C, O)
    if n.get('hijab'):
        nv.hijab(se, ne); jr = nv.ramp(nv.CL[n['hijab']]); pal.update({'J1': jr[0], 'J2': jr[2], 'J3': jr[3], 'J4': jr[4]})
        pal['_maps'].pop('hair_front', None); pal['_maps'].pop('hair_back', None)
    if n.get('skirt') and n['skirt'][1] != 'skin':
        lc = hx(nv.CL[n['skirt'][1]]); pal.update({'L1': lv.tone(lc, .7), 'L2': lc, 'L3': lv.tone(lc, .88)})
    for i, c in enumerate(('C2', 'C3', 'C4', 'C4', 'C5')): pal.setdefault(f'O{i + 1}', pal[c])
    kind = lv.KIND[anim]
    P = lv.pose_layers(se if view == 'se' else ne, kind, f, view, C, O)
    for mk, mp in pal['_maps'].items(): P[mk] = lv.recolor(P[mk], mp)
    if fem: pv.fem_body(P, kind)
    if n.get('skirt'): nv.skirt(P, kind, *n['skirt'])
    P['shoes_over'] = pv.shoe_style(P, n['shoes'])
    if n['shoes'] in ('sneakers', 'hightops'): pal.setdefault('S3', hx('#E8E6E0') if sum(hx(nv.CL[n['sc']])) < 500 else hx('#B4B0A8'))
    for k, v in C['skin_map'].items(): pal.setdefault('K' + k, hx(v))
    rg = {k: lv.to_img(v, pal) for k, v in P.items() if k not in ('face', 'brows', 'acc_head')}
    imgs = {k: np.array(v) for k, v in lv.frame_img(rg).items()}
    bob = WALK_BOB(f) if anim == 'walk' else IDLE_BOB(f)
    F, B, G = lv.face_layer(expr, C, view, 0, bob, False, 0)
    F = lv.recolor(F, pv.SKIN)
    fi = {k: np.array(v) for k, v in lv.frame_img({'f': lv.to_img(F, pal), 'b': lv.to_img(B, pal), 'g': lv.to_img(G, pal)}).items()}
    imgs['face'] = fi['f']; imgs['brows'] = fi['b']; imgs['glasses'] = fi['g']
    return imgs, pal

def layers(char, anim, f, view, expr):
    if char == 'ichsan': return ichsan_layers(anim, f, view, expr)
    if char == 'npc': return npcx_layers(NPC, anim, f, view, expr)
    return npcx_layers(CROSSERS[char], anim, f, view, expr)

# ------------------------------------------------------------------ helpers
def shift(a, dx, dy):
    o = np.zeros_like(a); H_, W_ = a.shape[:2]
    ys0, ys1 = max(0, dy), min(H_, H_ + dy); xs0, xs1 = max(0, dx), min(W_, W_ + dx)
    o[ys0:ys1, xs0:xs1] = a[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]; return o
def torso_cols(sh, y=67):
    xs = np.nonzero(sh[y, :, 3])[0]; return int(xs.min()), int(xs.max())
def Arm(hp, hk='fist', hd=(0, 1), E=None, top=None):
    """arm spec in SCREEN coords (relative to the unleaned body): hand centre hp, hand kind, finger dir, optional elbow, draw-on-top override"""
    return dict(hp=hp, hk=hk, hd=hd, E=E, top=top)
def swing(f): return [0, 1, 1, 0, -1, -1][f % 6]

# ------------------------------------------------------------------ animation specs (screen coords, both base views face screen-right)
#  spec: gen (generator row), gf (row frame), expr (se face), look (face dx, dy in se / head dx, dy in ne), lean (upper body px),
#        hop (whole body dy), L / R (screen-left / screen-right arm: None = generator arm), props
def jog_arms(f):
    s = swing(f)                                   # generator walk swing: + = screen-left arm back / screen-right arm forward
    back, mid, fwd = (-3.0, 66.0), (0.5, 64.5), (4.5, 62.5)
    pick = lambda p: fwd if p > 0 else back if p < 0 else mid
    pl, pr = pick(-s), pick(s)
    return Arm((23 + pl[0], pl[1])), Arm((41.5 + pr[0], pr[1]))

def spec(anim, base, f, n=None):
    S = dict(gen='idle', gf=0, expr='neutral', look=(0, 0), lean=(0, 0), hop=0, L=None, R=None, props=())
    if anim == 'idle': S.update(gen='idle', gf=f)
    elif anim == 'tunggu':                         # waiting at the kerb: glance left, glance right, look up at the signal, check the watch
        S.update(gen='idle', gf=[0, 1, 2, 3][f])
        if f == 0: S['look'] = (-1, 0)
        if f == 1: S['look'] = (1, 0)
        if f == 2: S['look'] = (0, -1); S['expr'] = 'neutral'
        if f == 3:
            S['look'] = (0, 1)
            if base == 'se': S['L'] = Arm((31, 62.5), 'fist', (1, 0), E=(23.5, 66.5)); S['props'] = ('watch',)
            else: S['R'] = Arm((40.5, 62), 'fist', (-1, 0), E=(43.5, 66), top=False); S['props'] = ()
    elif anim == 'tekan':                          # press the crossing button: screen-right hand forward to the pole box
        hp = [(46, 58), (49.5, 54.5), (51, 53.5), (46.5, 57.5)][f]; hk = ['fist', 'point', 'point', 'fist'][f]
        S.update(gen='idle', gf=0, lean=(1, 0) if f == 2 else (0, 0), R=Arm(hp, hk, (1, -.3)))
    elif anim == 'jalan': S.update(gen='walk', gf=f)
    elif anim == 'lari':                           # small jog on green-blink: generator stride, lean +1, extra bob, bent swinging arms
        l, r = jog_arms(f); S.update(gen='walk', gf=f, lean=(1, 0), hop=WALK_BOB(f), L=l, R=r)
    elif anim == 'kaget':                          # startled stop / dodge back when a car passes
        if f == 0: S.update(gen='walk', gf=0)
        elif f == 1: S.update(gen='idle', gf=0, hop=-1, lean=(-2, 0), expr='surprised', look=(0, 0),
                              L=Arm((27, 52.5) if base == 'se' else (20.5, 53), 'open', (.3, -1)), R=Arm((43.5, 51.5) if base == 'se' else (44.5, 52), 'open', (.2, -1), top=True))
        elif f == 2: S.update(gen='idle', gf=0, lean=(-1, 0), expr='surprised',
                              L=Arm((27, 55.5) if base == 'se' else (21, 56), 'open', (.3, -1)), R=Arm((43, 54.5) if base == 'se' else (44, 55), 'open', (.2, -1), top=True))
        else: S.update(gen='idle', gf=0, expr='neutral', L=Arm((29.5, 60.5), 'open', (1, -.2)) if base == 'se' else None)
    elif anim == 'terima_kasih':                   # raise a hand to the waiting car (thank you), small wave + nod
        hp = [(44.5, 52), (45.5, 46.5), (47, 46), (45.5, 46.5)][f]; hd = [(.2, -1), (.15, -1), (.45, -1), (.15, -1)][f]
        S.update(gen='idle', gf=0, expr='smile', look=(0, 1) if f in (1, 3) else (0, 0), R=Arm(hp, 'open', hd, top=True))
    elif anim == 'ragu':                           # hesitating at a red light: glance, half step, glance back, step back
        S.update(gen=['idle', 'walk', 'idle', 'idle'][f], gf=[0, 1, 0, 0][f], look=[(-1, 0), (0, 0), (1, 0), (-1, 0)][f], lean=[(0, 0), (1, 0), (0, 0), (-1, 0)][f])
    elif anim == 'terobos':                        # running the red: jog + screen-right palm raised to the traffic, glancing
        l, _ = jog_arms(f); S.update(gen='walk', gf=f, lean=(1, 0), hop=WALK_BOB(f), L=l, R=Arm((46, 52), 'open', (.6, -1), top=True),
                                     look=(1, 0) if f < 3 else (-1, 0))
    elif anim == 'nyebrang':                       # crosser NPC variations (walk 6 f)
        S.update(gen='walk', gf=f)
        pose = n['pose']
        if pose == 'hp':
            S['look'] = (0, 1)
            if base == 'se': S['L'] = Arm((30, 61.5), 'fist', (1, -.5), E=(24.5, 66.5)); S['props'] = ('phone',)
            else: S['R'] = Arm((40, 62), 'fist', (-1, 0), E=(43.5, 66), top=False)
        if pose == 'permisi': S['R'] = Arm((45.5, 47 + (1 if f in (1, 4) else 0)), 'open', (.3, -1), top=True); S['expr'] = 'smile'
    return S

ANIMS = {   # name: frames, frame_ms, loop
 'idle': (4, [250] * 4, True), 'tunggu': (4, [700, 700, 650, 900], True), 'tekan': (4, [150, 160, 260, 200], False),
 'jalan': (6, [139] * 6, True), 'lari': (6, [80] * 6, True), 'kaget': (4, [100, 160, 420, 320], False),
 'terima_kasih': (4, [180, 180, 180, 180], False), 'ragu': (4, [420, 260, 420, 300], True), 'terobos': (6, [80] * 6, True),
}
CROSS_ANIM = (6, [139] * 6, True)

# ------------------------------------------------------------------ frame builder
def frame(char, anim, view, f):
    base = 'se' if view in ('se', 'sw') else 'ne'; mir = view in ('sw', 'nw')
    n = CROSSERS.get(char)
    S = spec(anim, base, f, n)
    L, pal = layers(char, S['gen'], S['gf'], base, S['expr'] if base == 'se' else 'neutral')
    lx, ly = S['lean']; hop = S['hop']
    dx, dy = S['look']
    if base == 'se':
        for k in ('face', 'brows', 'glasses'):
            if k in L: L[k] = shift(L[k], dx, dy)
    else:
        for k in ('hair_front', 'hair_back'):
            if k in L: L[k] = shift(L[k], dx, dy)
    tx0, tx1 = torso_cols(L['shirt'])
    info = {'hand': None}
    arms = {}
    for side, a in (('L', S['L']), ('R', S['R'])):
        if a is None: continue
        # erase this side's generator arm + sleeve (outside the torso columns); limb() redraws shoulder, sleeve, elbow, forearm, hand
        gen_arm = ('arm_near' if side == 'L' else 'arm_far') if base == 'se' else ('arm_far' if side == 'L' else 'arm_near')
        L[gen_arm] = np.zeros_like(L[gen_arm]); sh = L['shirt'].copy()
        if side == 'L': sh[:, :tx0] = 0
        else: sh[:, tx1 + 1:] = 0
        L['shirt'] = sh
        Sx = (tx0 - 1.0, 57.5) if side == 'L' else (tx1 + 1.5, 57.5)
        hp = a['hp']; hd = a['hd']; W = None; E_ = a['E']
        ux, uy = hd; nn = math.hypot(ux, uy) or 1
        W = (hp[0] - ux / nn * 1.6, hp[1] - uy / nn * 1.6)
        if E_ is None:                             # auto elbow, bent outward (away from the torso)
            mx, my = (Sx[0] + W[0]) / 2, (Sx[1] + W[1]) / 2; L_ = math.hypot(W[0] - Sx[0], W[1] - Sx[1])
            bend = min(3.0, math.sqrt(max(0.0, 9.0 ** 2 - (L_ / 2) ** 2))); out = -1 if side == 'L' else 1
            vx, vy = (W[1] - Sx[1]) / (L_ or 1), -(W[0] - Sx[0]) / (L_ or 1)
            if vx * out < 0: vx, vy = -vx, -vy
            E_ = (mx + vx * bend, my + vy * bend)
        o = lambda p: (p[0] + lx, p[1] + ly)
        img = limb(o(Sx), o(E_), o(W), a['hk'], o(hp), hd, pal, TOPSTYLE)
        if 'watch' in S['props'] and side == 'L':
            wx, wy = int(W[0] - 1 + lx), int(W[1] + ly)
            put(img, wx, wy - 1, WATCH[0]); put(img, wx, wy, WATCH[2]); put(img, wx, wy + 1, WATCH[1]); put(img, wx - 1, wy, WATCH[0])
        if 'phone' in S['props'] and side == 'L':
            px, py = int(hp[0] + lx), int(hp[1] + ly)
            for j in range(-4, 0):
                for i in range(-1, 2): put(img, px + i, py + j, PHONE[2] if (i == 0 and j > -4) else PHONE[0] if i == 1 else PHONE[1])
            put(img, px - 1, py - 4, PHONE[3])
        front = a['top'] if a['top'] is not None else ((side == 'L') if base == 'se' else (side == 'R'))
        arms[side] = (img, front)
        if side == 'R': info['hand'] = [round(hp[0] + lx, 1), round(hp[1] + ly + hop, 1)]
    U = {k: shift(L[k], lx, ly) for k in UPPER if k in L}
    im = Image.fromarray(shadow())
    body = Image.new('RGBA', (FW, FH))
    for _, (img, front) in arms.items():
        if not front: body.alpha_composite(Image.fromarray(img))
    seq = ['hair_back', 'body', 'arm_far', 'shoes', 'pants', 'shoes_over', 'rips', 'shirt', 'shirt_graphic', 'outer', 'acc', 'arm_near', 'body_front', 'held', 'face', 'hair_front', 'glasses', 'brows']
    for k in seq:
        a = U.get(k) if k in U else L.get(k)
        if a is not None: body.alpha_composite(Image.fromarray(a))
    for _, (img, front) in arms.items():
        if front: body.alpha_composite(Image.fromarray(img))
    b = np.array(body)
    if hop: b = shift(b, 0, hop)
    im.alpha_composite(Image.fromarray(b))
    if mir:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
        if info['hand']: info['hand'] = [round(63 - info['hand'][0], 1), info['hand'][1]]
    return im, info

def check_identity():
    g = np.array(Image.open(GAME_SHEET).convert('RGBA')); res = {}
    for v, di in (('se', 0), ('ne', 2)):
        for anim, r0, nf in (('idle', 4, 1), ('walk', 0, 6)):
            d = 0
            for f in range(nf):
                im, _ = frame('ichsan', 'idle' if anim == 'idle' else 'jalan', v, f)
                d += int(np.any(g[(r0 + di) * 112:(r0 + di + 1) * 112, f * 64:(f + 1) * 64] != np.array(im), axis=2).sum())
            res[f'{anim}_{v}'] = d
    return res


# ------------------------------------------------------------------ crossing data (street_buildings/manifest.json 'crossing')
SBM = json.load(open('assets/street_buildings/manifest.json')); CROSS = SBM['crossing']; SPR = SBM['sprites']
VM = json.load(open('assets/street_vehicles/manifest.json'))['sprites']
WAIT_NEAR = tuple(CROSS['waiting_cells']['near_sidewalk']); WAIT_FAR = tuple(CROSS['waiting_cells']['far_sidewalk'])
GAME_SPEED = 1.95            # index.html SPEED (cells/s, player)
WALK_FPS = 7.2               # index.html: walk 10 fps x 0.72 pacing
def button_offset(sprite):
    e = SPR[sprite]; a = np.array(Image.open('assets/street_buildings/' + e['file']).convert('RGBA')).astype(int)
    m = (a[..., 0] > 200) & (a[..., 1] > 150) & (a[..., 2] < 110) & (a[..., 3] == 255); ys, xs = np.nonzero(m)
    return ((xs.min() + xs.max()) / 2 - e['pivot'][0], (ys.min() + ys.max()) / 2 - e['pivot'][1])
def press_stand(pole_cell, sprite, view, hand):
    """cell where the avatar stands so that the tekan f2 hand (frame px) sits on the pole's button box (screen px offsets -> cells)"""
    bx, by = button_offset(sprite); hx_, hy_ = hand[0] - 32, hand[1] - 100
    dX, dY = bx - hx_, by - hy_                    # avatar pivot relative to the pole foot (screen px)
    a, b = dX / 32, dY / 16                         # a = dc - dr, b = dc + dr
    return [round(pole_cell[0] + (a + b) / 2, 3), round(pole_cell[1] + (b - a) / 2, 3)]

PHASES = [   # real timing for the game (s) + mock timing (ticks of 100 ms, compressed) ; states per signal head
 dict(id=1, nama='kendaraan_hijau_pejalan_merah', s=None, mock=10, lalin='hijau', pejalan='merah', avatar='tunggu / ragu (boleh tekan tombol)', catatan='default; tombol ditekan -> LED tombol menyala, minimal hijau kendaraan lalu lanjut ke fase 2'),
 dict(id=2, nama='kendaraan_kuning', s=3.0, mock=15, lalin='kuning', pejalan='merah', avatar='tunggu', catatan=''),
 dict(id=3, nama='semua_merah', s=1.5, mock=10, lalin='merah', pejalan='merah', avatar='tunggu (lihat lampu: tunggu f2)', catatan='jeda aman'),
 dict(id=4, nama='pejalan_hijau', s=7.0, mock=35, lalin='merah', pejalan='hijau', avatar='jalan (boleh masuk zebra); terima_kasih ke mobil yang berhenti', catatan=''),
 dict(id=5, nama='pejalan_hijau_kedip', s=4.0, mock=20, lalin='merah', pejalan='hijau <-> hijau_kedip_off tiap 400 ms', avatar='yang sudah di zebra: lari; yang belum masuk: tunggu / ragu', catatan='jangan mulai menyeberang'),
 dict(id=6, nama='pejalan_merah_semua_merah', s=1.5, mock=10, lalin='merah', pejalan='merah', avatar='masih di zebra: lari; menerobos: terobos / kaget', catatan='lalu kembali ke fase 1'),
]

# ------------------------------------------------------------------ mock (game capture with ZEBRA_FIX, traffic removed: _work/bg_zebra_1x.png)
BG_IMG = f'{OUT}/_work/bg_zebra_1x.png'
MOX, MOY = 2 * (468 - 77), 2 * (70 - 356)          # capture world box x 77.., y 356.. (2 px per world unit, same as the frames)
VPOLE_SE_MOCK = (26.6, 36.75)   # manifest (25.0, 36.75) sits in front of the zebra column on screen and hides walkers; shifted +1.6 c in the mock only
MX = lambda c, r: MOX + (c - r) * 32; MY = lambda c, r: MOY + (c + r) * 16
def sprite_img(key):
    if key in SPR: e = SPR[key]; return Image.open('assets/street_buildings/' + e['file']).convert('RGBA'), e['pivot']
    e = VM[key]; return Image.open('assets/street_vehicles/' + e['file']).convert('RGBA'), e['pivot_footprint_centre']
def lerp(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
def dir_of(a, b):
    dc, dr = b[0] - a[0], b[1] - a[1]
    return ('se' if dc > 0 else 'nw') if abs(dc) >= abs(dr) else ('sw' if dr > 0 else 'ne')

def mock(FRC):
    """FRC(char, anim, view, f) -> PIL frame (cached). returns list of (PIL frame 1x crop, label) at 100 ms"""
    bg = Image.open(BG_IMG).convert('RGBA')
    pole_nl, pole_nr, pole_fl, pole_fr = (tuple(CROSS['ped_signal_poles'][k]['cell']) for k in ('near_left', 'near_right', 'far_left', 'far_right'))
    hand_nw = FRC_hand('tekan', 'nw', 2)
    PS = tuple(press_stand(pole_nr, 'lampu_pejalan_merah_sw', 'nw', hand_nw))     # near-right pole: clear of the pole cluster above the zebra
    T = []                                   # phase per tick
    # timeline: player walks to the pole (8), presses (9, button at tick 13), walks to the wait point, waits
    walk_ticks = lambda a, b: max(1, int(round(math.hypot(b[0] - a[0], b[1] - a[1]) / GAME_SPEED * 10)))
    start = (PS[0] + 1.5, PS[1] + 0.1)
    plan = [('walk', start, PS, walk_ticks(start, PS)), ('tekan', PS, PS, 9), ('walk', PS, WAIT_NEAR, walk_ticks(PS, WAIT_NEAR))]
    t_press = plan[0][3] + 5
    ph_start = {}; t = t_press
    for p in PHASES:
        ph_start[p['id']] = t; t += p['mock']
    t_end = t + 16
    def phase(tk):
        cur = 1
        for p in PHASES:
            if tk >= ph_start[p['id']]: cur = p['id']
        if tk >= ph_start[6] + PHASES[5]['mock']: cur = 1
        return cur
    g4 = ph_start[4]
    mid = (WAIT_NEAR[0], 33.8)
    plan2_t0 = sum(p[3] for p in plan)
    plan += [('tunggu', WAIT_NEAR, WAIT_NEAR, g4 + 3 - plan2_t0), ('walk', WAIT_NEAR, mid, walk_ticks(WAIT_NEAR, mid)), ('terima_kasih', mid, mid, 8),
             ('walk', mid, WAIT_FAR, walk_ticks(mid, WAIT_FAR)), ('idle', WAIT_FAR, WAIT_FAR, 200)]
    def actor_at(plan, tk, char):
        t0 = 0
        for kind, a, b, n in plan:
            if tk < t0 + n:
                u = (tk - t0) / n; pos = lerp(a, b, u); ms = (tk - t0) * 100
                if kind == 'walk':
                    d = dir_of(a, b); f = int(ms * WALK_FPS / 1000) % 6; return pos, char, 'jalan', d, f
                if kind == 'lari':
                    d = dir_of(a, b); f = int(ms / 80) % 6; return pos, char, 'lari', d, f
                if kind == 'tekan': return pos, char, 'tekan', 'nw', min(3, [0, 0, 1, 1, 2, 2, 2, 3, 3][min(8, tk - t0)])
                if kind == 'tunggu':
                    fm = ANIMS['tunggu'][1]; tt = ms % sum(fm); f = 0
                    while tt >= fm[f]: tt -= fm[f]; f += 1
                    return pos, char, 'tunggu', 'sw', f
                if kind == 'terima_kasih': return pos, char, 'terima_kasih', 'sw', min(3, (tk - t0) // 2)
                if kind == 'idle': return pos, char, 'idle', b and 'sw', int(ms / 250) % 4
                if kind == 'wait_ne': return pos, char, 'idle', 'ne', int(ms / 250) % 4
                if kind == 'wait_sw': return pos, char, 'idle', 'sw', int(ms / 250) % 4
            t0 += n
        return None
    # other pedestrians: hijab lady far -> near on green; student near -> far (permisi); generic NPC near -> far, jogs on the blink
    fa0, fa1 = (22.15, 36.95), (22.15, 32.05)
    npa = [('wait_ne', fa0, fa0, g4 + 2), ('walk', fa0, fa1, walk_ticks(fa0, fa1)), ('wait_ne', fa1, fa1, 300)]
    sc0, sc1 = (23.05, 31.95), (23.05, 36.95)
    npc_c = [('wait_sw', sc0, sc0, g4 + 6), ('walk', sc0, sc1, walk_ticks(sc0, sc1)), ('wait_sw', sc1, sc1, 300)]
    n0 = (23.45, 32.05); nm = (23.45, 33.6); n1 = (23.45, 36.95)
    tb = ph_start[5]
    npc_g = [('wait_sw', n0, n0, tb - walk_ticks(n0, nm)), ('walk', n0, nm, walk_ticks(n0, nm)), ('lari', nm, n1, int(round(math.hypot(0, n1[1] - nm[1]) / (GAME_SPEED * 1.6) * 10))), ('wait_sw', n1, n1, 300)]
    # cars: A passes on green before the press, B (taxi, -c lane) and C (hatchback, +c lane) arrive on yellow and stop at the stop lines
    LA, LB = 33.05 + 0.55, 34.85 + 0.55
    STOP_A, STOP_B = 20.4 - 1.45, 24.6 + 2.0
    def car_pos(tk):
        out = []
        ca = 8.0 + tk * 0.7
        if ca < 40: out.append(('sedan_teal_se', (ca, LA)))
        t2 = ph_start[2]; t1b = ph_start[6] + PHASES[5]['mock'] + 3
        def approach(key, c_from, c_stop, sgn, t_arr):
            if tk < t_arr - 20: return None
            if tk < t_arr: u = (tk - (t_arr - 20)) / 20; c = c_from + (c_stop - c_from) * (1 - (1 - u) ** 2)
            elif tk < t1b: c = c_stop
            else: c = c_stop + sgn * 0.08 * (tk - t1b) ** 1.5
            return (key, (c, LA if sgn > 0 else LB))
        for q in (approach('hatchback_orange_se', 6.0, STOP_A, 1, t2 + 14), approach('taxi_bluebird_nw', 39.0, STOP_B, -1, t2 + 10)):
            if q: out.append(q)
        return out
    frames = []
    crop = (230, 150, 590, 460)
    for tk in range(t_end):
        ph = phase(tk); P = {p['id']: p for p in PHASES}[ph]
        ped = P['pejalan'] if ph != 5 else ('hijau' if ((tk - ph_start[5]) // 4) % 2 == 0 else 'hijau_kedip_off')
        lal = P['lalin'] if not (ph == 1 and tk >= ph_start[6]) else 'hijau'
        items = []
        for cell, ori in ((pole_nl, 'sw'), (pole_nr, 'sw'), (pole_fl, 'ne'), (pole_fr, 'ne')): items.append((cell, f'lampu_pejalan_{ped}_{ori}'))
        items.append(((20.0, 32.3), f'lampu_lalin_{lal}_nw')); items.append((VPOLE_SE_MOCK, f'lampu_lalin_{lal}_se'))
        for key, cell in car_pos(tk): items.append((cell, key))
        people = []
        for pl, ch in ((plan, 'ichsan'), (npa, 'penyeberang_a'), (npc_c, 'penyeberang_c'), (npc_g, 'npc')):
            st = actor_at(pl, tk, ch)
            if st: people.append(st)
        im = bg.copy()
        draw = [(c + r, 'S', key, (c, r)) for (c, r), key in items] + [(p[0][0] + p[0][1], 'P', p, p[0]) for p in people]
        for dk, typ, obj, (c, r) in sorted(draw, key=lambda q: q[0]):
            if typ == 'S':
                spr, pv_ = sprite_img(obj); im.alpha_composite(spr, (int(round(MX(c, r) - pv_[0])), int(round(MY(c, r) - pv_[1]))))
            else:
                pos, ch, an, d, f = obj
                if ch in CROSSERS and an == 'jalan': an = 'nyebrang'
                if ch in CROSSERS and an not in ('nyebrang',): an = 'idle_x'
                fr = FRC(ch, an, d, f)
                im.alpha_composite(fr, (int(round(MX(c, r) - 32)), int(round(MY(c, r) - 100))))
        frames.append((im.crop(crop), f'fase {ph}: kendaraan {lal.upper()} / pejalan {ped.upper().replace("_KEDIP_OFF", " (kedip)")}'))
    return frames, dict(press_tick=t_press, phase_start_tick=ph_start, press_stand=PS, ticks=t_end)

_FC = {}
def FRC(char, anim, view, f):
    k = (char, anim, view, f)
    if k not in _FC:
        if anim == 'idle_x': _FC[k] = frame_cross_idle(char, view, f)
        else: _FC[k] = frame(char, anim, view, f)[0]
    return _FC[k]
def frame_cross_idle(char, view, f):
    """crosser waiting: generator idle row (no extra pose)"""
    base = 'se' if view in ('se', 'sw') else 'ne'
    L, pal = layers(char, 'idle', f, base, 'neutral')
    im = Image.fromarray(shadow())
    for k in ['hair_back', 'body', 'arm_far', 'shoes', 'pants', 'shoes_over', 'rips', 'shirt', 'shirt_graphic', 'outer', 'acc', 'arm_near', 'body_front', 'held', 'face', 'hair_front', 'glasses', 'brows']:
        if k in L: im.alpha_composite(Image.fromarray(L[k]))
    return im.transpose(Image.FLIP_LEFT_RIGHT) if view in ('sw', 'nw') else im
def FRC_hand(anim, view, f): return frame('ichsan', anim, view, f)[1]['hand']

def save_gif(frames_rgba, path, ms, scale=4, label=None):
    out = []
    for i, im in enumerate(frames_rgba):
        big = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        c = Image.new('RGBA', (big.width, big.height + (28 if label else 0)), BG); c.alpha_composite(big, (0, 28 if label else 0))
        if label:
            d = ImageDraw.Draw(c); d.text((10, 6), label[i], fill=(231, 235, 242), font=fb)
        out.append(c.convert('RGB').quantize(colors=255, method=Image.MEDIANCUT, dither=Image.NONE))
    out[0].save(path, save_all=True, append_images=out[1:], duration=ms, loop=0, optimize=True)

if __name__ == '__main__':
    os.makedirs(f'{OUT}/frames', exist_ok=True)
    ident = check_identity(); print('ichsan vs game sheet (diff px):', ident)
    FR = {}; INFO = {}
    for char in ('ichsan', 'npc'):
        for anim, (n_, ms, loop) in ANIMS.items():
            for v in VIEWS:
                for f in range(n_):
                    im, info = frame(char, anim, v, f); im.save(f'{OUT}/frames/{char}_{anim}_{v}_f{f}.png'); FR[char, anim, v, f] = im; INFO[char, anim, v, f] = info
    for char in CROSSERS:
        for v in VIEWS:
            for f in range(6):
                im, info = frame(char, 'nyebrang', v, f); im.save(f'{OUT}/frames/{char}_nyebrang_{v}_f{f}.png'); FR[char, 'nyebrang', v, f] = im
    # GIFs (4x, 4 dirs side by side, transparent) + sheets
    for char in ('ichsan', 'npc'):
        for anim, (n_, ms, loop) in ANIMS.items():
            gif([strip([FR[char, anim, v, i] for v in VIEWS]) for i in range(n_)], f'{OUT}/{char}_{anim}_4arah_4x.gif', ms)
        sheet(f'{char.upper()}  ·  NYEBRANG  ·  4x  ·  64x112 pivot 32,100  ·  sw/nw = mirror  ·  transparan',
              [(f'{a} {v}', [(f'f{i}', FR[char, a, v, i]) for i in range(ANIMS[a][0])]) for a in ANIMS for v in VIEWS], f'{OUT}/{char}_nyebrang_sheet_4x.png')
    for char in CROSSERS:
        gif([strip([FR[char, 'nyebrang', v, i] for v in VIEWS]) for i in range(6)], f'{OUT}/{char}_nyebrang_4arah_4x.gif', [139] * 6)
    sheet('PENYEBERANG NPC (3 variasi)  ·  jalan 6 f  ·  4x  ·  sw/nw = mirror  ·  transparan',
          [(f'{c[-1]} {v}', [(f'f{i}', FR[c, 'nyebrang', v, i]) for i in range(6)]) for c in CROSSERS for v in VIEWS], f'{OUT}/penyeberang_sheet_4x.png')
    sheet('NYEBRANG  ·  pose kunci se (ichsan / npc)  ·  4x  ·  latar gelap',
          [(c, [(a, FR[c, a, 'se', {'tunggu': 3, 'tekan': 2, 'lari': 1, 'kaget': 1, 'terima_kasih': 2, 'ragu': 1, 'terobos': 1, 'jalan': 1, 'idle': 0}[a]]) for a in ANIMS]) for c in ('ichsan', 'npc')],
          f'{OUT}/nyebrang_pose_kunci_4x_darkbg.png', bg=BG)
    # manifest
    hand_t = {v: INFO['ichsan', 'tekan', v, 2]['hand'] for v in VIEWS}
    poles = CROSS['ped_signal_poles']
    stands = {}
    for k, e in poles.items():
        spr = e['sprite'].replace('<state>', 'merah')
        view = 'nw' if spr.endswith('_sw') else 'ne'
        stands[k] = {'pole_cell': e['cell'], 'avatar_dir': view, 'avatar_cell': press_stand(e['cell'], spr, view, hand_t[view]),
                     'button_px_from_pole_pivot': [round(x, 1) for x in button_offset(spr)]}
    frames_m, minfo = mock(FRC)
    man = {'name': 'anim_nyebrang', 'preview_only': True, 'frame': [FW, FH], 'pivot': [32, 100], 'dirs': list(VIEWS),
           'mirror': {'sw': 'se (flip horizontal)', 'nw': 'ne (flip horizontal)'},
           'dir_rule_game': "index.html: dc>0 'se', dc<0 'nw', dr>0 'sw', dr<0 'ne'  (near -> far side = +r = 'sw', far -> near = 'ne')",
           'files': {'pattern': 'frames/{char}_{anim}_{dir}_f{i}.png', 'chars': ['ichsan', 'npc'], 'crossers': {k: {'pattern': f'frames/{k}_nyebrang_{{dir}}_f{{i}}.png', 'note': v['note']} for k, v in CROSSERS.items()}},
           'chars': {'ichsan': {'source': 'v6b/live/chars/ichsan.json via live_v6b (= assets/chars/ichsan_v6b_sheet.png)', 'diff_px_vs_game_sheet': ident},
                     'npc': {'source': 'npc_v6b.make_cfg path', 'cfg': NPC}},
           'anims': {}, 'crossing': {}}
    for a, (n_, ms, loop) in list(ANIMS.items()) + [('nyebrang', CROSS_ANIM)]:
        man['anims'][a] = {'frames': n_, 'frame_ms': ms, 'fps': round(1000 * n_ / sum(ms), 2), 'loop': loop, 'total_ms': sum(ms)}
    man['anims']['jalan'].update(fps_game=WALK_FPS, note='= baris walk generator; game memutar walk 10 fps x 0.72 = 7.2 fps; frame_ms 139 = 7.2 fps. Kecepatan 1.95 sel/s (SPEED)')
    man['anims']['lari'].update(speed_cells_s=round(GAME_SPEED * 1.6, 2), note='lari kecil saat hijau berkedip / merah sudah di zebra: 12.5 fps, kecepatan ~1.6x jalan')
    man['anims']['terobos'].update(speed_cells_s=round(GAME_SPEED * 1.6, 2), note='menerobos merah: lari + telapak diangkat ke kendaraan; masuki dari ragu')
    man['anims']['tekan'].update(events={'tombol_ditekan': {'frame': 2, 't_ms': sum(ANIMS['tekan'][1][:2])}, 'selesai': {'frame': 3, 't_ms': sum(ANIMS['tekan'][1])}},
                                 hand_px=hand_t, note='tangan kanan-layar maju ke kotak tombol; setelah tombol_ditekan game menyalakan LED / mulai hitung fase')
    man['anims']['kaget'].update(events={'mundur': {'frame': 1}, 'pulih': {'frame': 3}}, note='dipicu bila kendaraan lewat dekat; f1-f2 badan mundur 1-2 px (geser, tidak kompres); setelah selesai lanjut ke tunggu / jalan')
    man['anims']['terima_kasih'].update(note='sekali jalan (720 ms) di tengah zebra ke kendaraan yang berhenti; avatar boleh berhenti sebentar atau game putar sambil diam di tempat')
    man['anims']['tunggu'].update(frame_meaning=['lirik kiri', 'lirik kanan', 'lihat lampu (kepala naik)', 'lihat jam tangan'])
    man['anims']['ragu'].update(frame_meaning=['lirik kiri', 'setengah langkah maju', 'lirik kanan', 'mundur'])
    man['crossing'] = {
        'source': 'street_buildings/manifest.json "crossing" (zebra index.html extBuild + ZEBRA_FIX strip sejajar jalan: r 33.1..35.7 tiap 0.5, tebal 0.28, c 21.2..23.9)',
        'wait_points': {'near_sidewalk': list(WAIT_NEAR), 'far_sidewalk': list(WAIT_FAR)},
        'wait_dir': {'near_sidewalk': 'sw', 'far_sidewalk': 'ne'},
        'path': {'near_to_far': {'from': list(WAIT_NEAR), 'to': list(WAIT_FAR), 'dir': 'sw', 'length_cells': round(WAIT_FAR[1] - WAIT_NEAR[1], 2),
                                 'zebra_enter_r': 32.98, 'zebra_exit_r': 36.07, 'walk_s': round((WAIT_FAR[1] - WAIT_NEAR[1]) / GAME_SPEED, 2)},
                 'far_to_near': {'from': list(WAIT_FAR), 'to': list(WAIT_NEAR), 'dir': 'ne'},
                 'lanes_c': 'antre di c 21.5..23.6 (dalam zebra); jarak antar pejalan >= 0.45 sel'},
        'press_button_stand': stands,
        'phases': PHASES,
        'signal_sprites': {'pejalan': 'street_buildings/sinyal/lampu_pejalan_<merah|hijau|hijau_kedip_off|padam>_<dir>.png', 'kedip_ms': 400,
                           'lalin': 'street_buildings/sinyal/lampu_lalin_<merah|kuning|hijau>_<dir>.png', 'poles': CROSS['ped_signal_poles'], 'vehicle_poles': CROSS['vehicle_signal_poles']},
        'anim_per_phase': {str(p['id']): p['avatar'] for p in PHASES},
        'vehicle_stop': {'lane_r33.05_+c': 'berhenti di c 20.4 (moncong); mock: pivot hatchback_orange_se c 18.95 r 33.6', 'lane_r34.85_-c': 'berhenti di c 24.6 (moncong); mock: pivot taxi_bluebird_nw c 26.6 r 35.4'}, 'mock_vehicle_pole_se_cell': list(VPOLE_SE_MOCK),
        'mock': {'file': 'mock_nyebrang_4x.gif', 'tick_ms': 100, 'note': 'durasi fase di mock dipadatkan (kolom mock, 100 ms/tick); angka s = usulan untuk game', **{k: (v if not isinstance(v, tuple) else list(v)) for k, v in minfo.items()}},
    }
    json.dump(man, open(f'{OUT}/manifest.json', 'w'), indent=1, ensure_ascii=False)
    save_gif([f for f, _ in frames_m], f'{OUT}/mock_nyebrang_4x.gif', 100, 4, [l for _, l in frames_m])
    # key mock stills (4x png) for review
    for name, tk in (('tekan', minfo['press_tick']), ('tunggu', minfo['phase_start_tick'][3] + 2), ('nyebrang', minfo['phase_start_tick'][4] + 14), ('kedip', minfo['phase_start_tick'][5] + 6)):
        f, l = frames_m[tk]; f.resize((f.width * 4, f.height * 4), Image.NEAREST).save(f'{OUT}/_work/mock_{name}_4x.png')
    K = json.load(open('assets/npc_babeh_loak/_tools/known.json')); known = set().union(*[set(v) for v in K.values()])
    cols = set(); al = set()
    for im in FR.values():
        a = np.array(im); cols |= {H(p) for p in a.reshape(-1, 4) if p[3] == 255}; al |= set(np.unique(a[..., 3]).tolist())
    print(len(cols), 'colours; alpha', sorted(al), 'not in known.json:', sorted(c for c in cols if c not in known))
    print('press stands', stands, 'mock', minfo)
