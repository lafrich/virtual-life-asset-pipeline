"""Style sheet v1.3 builders: Brainstorming, Meeting Room, Outdoor pool (night).
Same conventions as assets.py: LOCAL coords a in [0,W], b in [0,D], FRONT = +b, z px at 1x."""
import random, math
import numpy as np
from iso import Sprite, scr, SX, SY, OX, OY, _xs, _ys
from palette import C, mat, M, ACCENT_BRAINSTORM as ACB, ACCENT_MEETING as ACM
from assets import SEAT_Z, DESK_Z, vis, lay_if, office_chair, meeting_table, mug, WT, WALL_H, wall_skin, rug, light_pool

HIGH_SEAT_Z = 26          # high stool seat (sit frames lifted 12 px)
HIGH_TABLE_Z = 40         # standing table top
LIE_Z = 12                # lounger mattress top = pelvis height in lie frames
WATER_Z = -6              # water surface below deck/coping top
WATER_LINE_PX = 40        # swim frames: water surface 40 px above pivot
POOL_FRAMES = 4

def acc(name, i):  # accent ramp key: 0 light, 1 mid, 2 shadow
    return M[name][i]

# ================================================================ floors
FLOORS13 = {
    'carpet_coral': ('coral_fa', 'coral_fb', None),
    'carpet_teal': ('teal_fa', 'teal_fb', None),
    'grass_night': ('grass_dk', 'grass_dk', 'blades'),
    'deck_stone': ('gallery_fa', 'gallery_fb', 'slabs'),   # dimmed 2 steps into the gallery_dk/navy family
}
def floor13(s, frame=0, kind='carpet_coral', var='a'):
    ca, cb, pat = FLOORS13[kind]
    with s.part():
        s.top(0, 0, 1, 1, 0, ca if var == 'a' else cb)
        if pat == 'blades':
            rnd = random.Random(21 if var == 'a' else 22)
            for i in range(18 if var == 'a' else 26):
                a, b = rnd.random() * 0.94, rnd.random() * 0.94
                s.top(a, b, a + 1 / 32, b + 1 / 16, 0, 'grass_md')
        elif pat == 'slabs':
            # two slabs per tile, joint lines in wall_top (1px), offset per variant
            # slab joints 1px floor_lt (one navy step below both deck values)
            j = 'floor_lt'
            s.top(0, 0, 1, 1 / 32, 0, j); s.top(0, 0, 1 / 32, 1, 0, j)
            if var == 'a': s.top(0.5, 0, 0.5 + 1 / 32, 1, 0, j)
            else: s.top(0, 0.5, 1, 0.5 + 1 / 32, 0, j)

# ================================================================ brainstorm
def whiteboard_big(s, frame=0):
    """3-tile wall whiteboard: paper #EDE6D8 with cool_grey marks, coral marker tray."""
    W = s.W; z0, z1 = 30, 82
    with s.part(outline=C['void']):
        s.box(0.04, 0, W - 0.04, 0.06, z0, z1, 'metal')
    with s.part():
        s.face('front', 0.06, 0.08, W - 0.08, z0 + 2, z1 - 2, 'gallery')
        s.face('front', 0.06, 0.04, W - 0.04, z0, z0 + 1, 'wall_top')
        g = 'grey'
        # mind-map: central box + spokes + side lists (all cool_grey, 1px)
        cx = W / 2
        s.face('front', 0.06, cx - 0.32, cx + 0.32, 54, 55, g); s.face('front', 0.06, cx - 0.32, cx + 0.32, 62, 63, g)
        s.face('front', 0.06, cx - 0.32, cx - 0.29, 54, 63, g); s.face('front', 0.06, cx + 0.29, cx + 0.32, 54, 63, g)
        s.face('front', 0.06, cx - 0.2, cx + 0.2, 58, 59, 'wall_top')
        for k, (u, zz) in enumerate(((0.3, 70), (0.35, 44), (W - 0.75, 70), (W - 0.8, 42))):
            s.face('front', 0.06, u, u + 0.42, zz, zz + 1, g); s.face('front', 0.06, u, u + 0.3, zz - 3, zz - 2, 'wall_top')
        for u0, u1, zz in ((0.72, cx - 0.32, 66), (cx + 0.32, W - 0.75, 66), (0.77, cx - 0.32, 50), (cx + 0.32, W - 0.8, 48)):
            s.face('front', 0.06, u0, u1, zz, zz + 1, g)
        for k in range(4):
            s.face('front', 0.06, W - 0.42, W - 0.39, 72 - k * 5, 73 - k * 5, g); s.face('front', 0.06, W - 0.36, W - 0.2 - (k % 2) * 0.06, 72 - k * 5, 73 - k * 5, g)
    with s.part(outline=C['void']):
        s.box(0.5, 0.06, W - 0.5, 0.15, z0 - 3, z0, ACB)          # coral marker tray
    with s.part():
        for k, col in enumerate(('night', acc(ACB, 2), 'grey')):
            s.top(0.7 + k * 0.22, 0.08, 0.84 + k * 0.22, 0.12, z0, col)
    s.meta['wall_z'] = (z0, z1)

STICKY = ['paper', acc(ACB, 0), 'baize_lt', 'steel_lt']     # max 4 note colours, no new hexes
def sticky_wall(s, frame=0):
    """2-tile sticky-note wall: notes straight on the wall in loose columns (kanban-ish)."""
    W = s.W; rnd = random.Random(31)
    with s.part():
        for col in range(5):
            u0 = 0.12 + col * (W - 0.24) / 5
            s.face('front', 0.01, u0, u0 + 0.26, 80, 81, 'grey')            # column header line
            for row in range(4 - (col % 2)):
                zz = 70 - row * 11 - rnd.randint(0, 2); du = rnd.choice((0, 0.02, 0.04))
                c = STICKY[(col + row * 2 + rnd.randint(0, 1)) % 4]
                s.face('front', 0.01, u0 + du, u0 + du + 0.2, zz, zz + 8, c)
                s.face('front', 0.01, u0 + du, u0 + du + 0.2, zz, zz + 1, 'wall_top' if c != 'paper' else 'gallery_mid')
                s.face('front', 0.01, u0 + du + 0.04, u0 + du + 0.15, zz + 4, zz + 5, 'grey')
    s.meta['wall_z'] = (36, 82)

def moodboard(s, frame=0):
    """2-tile cork mood board with image swatches, coral pins."""
    W = s.W; z0, z1 = 36, 78; rnd = random.Random(41)
    with s.part(outline=C['void']):
        s.box(0.04, 0, W - 0.04, 0.06, z0, z1, 'walnut')
    with s.part():
        s.face('front', 0.06, 0.1, W - 0.1, z0 + 2, z1 - 2, 'tan')
        s.face('front', 0.06, 0.04, W - 0.04, z0, z0 + 1, 'wal_dk')
        cards = [(0.16, 50, 0.42, 22), (0.66, 58, 0.34, 14), (0.66, 42, 0.26, 12), (1.06, 48, 0.4, 24), (1.52, 56, 0.3, 16), (1.5, 40, 0.34, 12)]
        fills = [('steel_dk', 'steel_lt'), ('gallery', 'grey'), ('plum', 'plum_lt'), ('night', acc(ACB, 1)), ('paper', 'baize'), ('oxblood_dk', 'gallery_mid')]
        for (u, zz, w, h), (f1, f2) in zip(cards, fills):
            if u + w > W - 0.12: continue
            s.face('front', 0.06, u, u + w, zz, zz + h, 'paper' if f1 not in ('paper', 'gallery') else 'gallery_mid')
            s.face('front', 0.06, u + 0.03, u + w - 0.03, zz + 2, zz + h - 2, f1)
            s.face('front', 0.06, u + 0.06, u + w * 0.6, zz + 3, zz + 3 + max(2, h // 3), f2)
            s.face('front', 0.06, u + w / 2 - 0.02, u + w / 2 + 0.02, zz + h - 2, zz + h, acc(ACB, 1))   # pin
    s.meta['wall_z'] = (z0, z1)

def high_table(s, frame=0):
    """1x1 standing table, top z 40, walnut on a metal pedestal."""
    s.shadow(ellipse=True, rx=18)
    with s.part(outline=C['void']):
        s.box(0.3, 0.3, 0.7, 0.7, 0, 3, 'metal_d')
        s.box(0.46, 0.46, 0.54, 0.54, 3, HIGH_TABLE_Z - 3, 'metal_d')
        s.box(0.08, 0.08, 0.92, 0.92, HIGH_TABLE_Z - 3, HIGH_TABLE_Z, 'walnut')
    with s.part():
        s.face('front', 0.92, 0.08, 0.92, HIGH_TABLE_Z - 2, HIGH_TABLE_Z - 1, 'wal_dk')
    with s.part(outline=C['void']):
        s.box(0.22, 0.24, 0.48, 0.44, HIGH_TABLE_Z, HIGH_TABLE_Z + 2, ACB)      # sticky pad
        s.box(0.56, 0.5, 0.82, 0.74, HIGH_TABLE_Z, HIGH_TABLE_Z + 1, 'paper')
    with s.part():
        s.top(0.25, 0.27, 0.45, 0.41, HIGH_TABLE_Z + 2, acc(ACB, 0))
        s.top(0.58, 0.3, 0.76, 0.34, HIGH_TABLE_Z, 'night')               # marker
        s.top(0.6, 0.58, 0.78, 0.6, HIGH_TABLE_Z + 1, 'grey')
    s.meta['surface_z'] = HIGH_TABLE_Z
    s.meta['use'] = [{'local': (0.5, 1.5), 'face': 'back'}, {'local': (0.5, -0.5), 'face': 'front'},
                     {'local': (1.5, 0.5), 'face': 'left'}, {'local': (-0.5, 0.5), 'face': 'right'}]

def high_stool(s, frame=0):
    """backless high stool, coral seat at z 26, foot ring z 10."""
    s.shadow(ellipse=True, rx=11)
    with s.part(outline=C['void']):
        for a, b in ((0.34, 0.34), (0.62, 0.34), (0.34, 0.62), (0.62, 0.62)):
            s.box(a, b, a + 0.04, b + 0.04, 0, HIGH_SEAT_Z - 4, 'metal')
    with s.part():
        s.top(0.3, 0.3, 0.7, 0.7, 10, 'grey'); s.top(0.36, 0.36, 0.64, 0.64, 10, (0, 0, 0, 0))
    with s.part(outline=C['void']):
        s.cyl(0.5, 0.5, HIGH_SEAT_Z - 4, HIGH_SEAT_Z, 12, ACB)
    with s.part():
        s.ell(0.5, 0.5, HIGH_SEAT_Z, 6, acc(ACB, 0), dx=-2, dy=-1)
    s.meta['seats'] = [{'local': (0.5, 0.5), 'face': 'front', 'seat_z': HIGH_SEAT_Z}]

# ================================================================ meeting
def meeting_table_acc(s, frame=0):
    """the v1.1 3x2 meeting table, re-inlaid with the Meeting accent (walnut + teal, no brass)."""
    W, D = s.W, s.D
    s.shadow()
    with s.part(outline=C['wal_dk']):
        s.box(W / 2 - 0.5, D / 2 - 0.25, W / 2 + 0.5, D / 2 + 0.25, 0, 4, 'walnut')
        s.box(W / 2 - 0.16, D / 2 - 0.1, W / 2 + 0.16, D / 2 + 0.1, 4, DESK_Z - 4, 'walnut')
        s.box(0.06, 0.08, W - 0.06, D - 0.08, DESK_Z - 4, DESK_Z, 'walnut')
    with s.part():
        s.top(0.3, 0.3, W - 0.3, D - 0.3, DESK_Z, acc(ACM, 2))
        s.top(0.34, 0.34, W - 0.34, D - 0.34, DESK_Z, acc(ACM, 1))
        s.face('front', D - 0.08, 0.06, W - 0.06, DESK_Z - 3, DESK_Z - 2, 'wal_lt')
    with s.part(outline=C['gallery_dk']):
        s.box(0.6, 0.5, 0.92, 0.76, DESK_Z, DESK_Z + 2, 'paper'); s.box(W - 1.0, D - 0.85, W - 0.64, D - 0.55, DESK_Z, DESK_Z + 2, 'paper')
    mug(s, W - 0.5, 0.45, DESK_Z)
    with s.part(outline=C['void']):
        s.box(W / 2 - 0.12, D / 2 - 0.08, W / 2 + 0.12, D / 2 + 0.08, DESK_Z, DESK_Z + 3, 'night')
    with s.part():
        s.top(W / 2 - 0.08, D / 2 - 0.05, W / 2 + 0.08, D / 2 + 0.05, DESK_Z + 3, acc(ACM, 0))
    s.meta['surface_z'] = DESK_Z
    # 6 chair slots: 3 on each long side, sitter faces the table
    s.meta['chair_slots'] = [{'local': (k + 0.5, -0.5), 'face': 'front'} for k in range(int(W))] + \
                            [{'local': (k + 0.5, D + 0.5), 'face': 'back'} for k in range(int(W))]

def meeting_chair_acc(s, frame=0):
    office_chair(s, m=ACM)

def tv_meeting(s, frame=0):
    """2-tile wall TV: night body, brass 1px bezel + logo dot (the only brass), teal slide, glow layer."""
    W = s.W; z0, z1 = 40, 80
    with s.part(outline=C['void']):
        s.box(0.06, 0, W - 0.06, 0.06, z0, z1, 'night')
    with s.part():
        b = 0.06
        s.face('front', b, 0.08, W - 0.08, z0 + 1, z1 - 1, 'brass_shd')                  # bezel ring
        s.face('front', b, 0.1, W - 0.1, z0 + 2, z1 - 2, 'floor_dk')
        s.face('front', b, 0.14, W - 0.14, z0 + 4, z1 - 4, acc(ACM, 2))                  # slide bg
        s.face('front', b, 0.24, 1.0, z1 - 10, z1 - 8, 'paper')                          # title
        s.face('front', b, 0.24, 0.7, z1 - 14, z1 - 13, acc(ACM, 0))
        for k, h in enumerate((8, 13, 10, 17)):                                          # chart
            s.face('front', b, 1.1 + k * 0.17, 1.2 + k * 0.17, z0 + 7, z0 + 7 + h, acc(ACM, 0) if k != 3 else 'paper')
        for k in range(3):
            s.face('front', b, 0.24, 0.84 - k * 0.12, z0 + 20 - k * 5, z0 + 21 - k * 5, 'gallery_mid')
        s.face('front', b, W / 2 - 0.03, W / 2 + 0.03, z0 + 1, z0 + 2, 'brass_lt')       # logo dot on bezel
        s.glow_face('front', b, 0.14, W - 0.14, z0 + 4, z1 - 4, acc(ACM, 1), 60)
    s.meta['wall_z'] = (z0, z1)

def glass_panel(s, side, u0, u1, z0, z1, fill):
    """fake glass on a back-wall plane: fill + one 1px paper diagonal highlight."""
    pl = 'y' if side == 'R' else 'x'
    def F(a0, a1, v0, v1, col):
        s._put(s.mask_plane(pl, 0, a0, a1, v0, v1), C[col])
    F(u0, u1, z0, z1, fill)
    n = int((u1 - u0) * 16)
    for i in range(min(n, 10)):          # diagonal 1px highlight streak
        uu = u0 + 0.12 + i / 32
        zz = z1 - 18 + i
        if uu < u1 and zz < z1: F(uu, uu + 1 / 32, zz, zz + 1, 'paper')

def wall_glass(s, frame=0, side='R', kind='glass', fill='teal_glass', H=WALL_H, warm=False, cutaway=False):
    """glass back-wall segment (R/L), WORLD coords like wall_seg. kind: glass | glassdoor.
    cutaway: frame (posts, sill, top rail) + 1px paper highlight, no fill -> for glass on the camera side."""
    if cutaway:
        mm = mat('metal_d')
        def bx(u0, u1, z0, z1):
            if side == 'R': s.wbox(u0, -WT, u1, 0, z0, z1, mm)
            else: s.wbox(-WT, u0, 0, u1, z0, z1, mm)
        with s.part(outline=C['void']):
            bx(0, 0.06, 0, H); bx(0.94, 1, 0, H); bx(0, 1, H - 6, H); bx(0, 1, 0, 4)
            if kind == 'glassdoor':
                bx(0.06, 0.12, 0, 82); bx(0.88, 0.94, 0, 82); bx(0.12, 0.88, 80, 84); bx(0.48, 0.52, 0, 80)
        pl = 'y' if side == 'R' else 'x'
        with s.part():
            s._put(s.mask_plane(pl, 0, 0.06, 0.94, H - 6, H - 5), C['paper'])
            if kind == 'glassdoor':
                s._put(s.mask_plane(pl, 0, 0.4, 0.44, 34, 50), C['paper']); s._put(s.mask_plane(pl, 0, 0.56, 0.6, 34, 50), C['paper'])
        return
    with s.part():
        if side == 'R': s.wbox(0, -WT, 1, 0, 0, H, mat('metal_d'))
        else: s.wbox(-WT, 0, 0, 1, 0, H, mat('metal_d'))
    pl = 'y' if side == 'R' else 'x'
    def F(u0, u1, v0, v1, col, layer='base'):
        with s.part(layer=layer):
            s._put(s.mask_plane(pl, 0, u0, u1, v0, v1), C[col])
    side_col = 'grey' if side == 'R' else 'wall_top'
    F(0, 1, 0, H, side_col)                       # cool_grey frame (lit R / shade L)
    F(0, 1, 0, 5, 'wall_lit')                     # sill
    with s.part():
        if kind == 'glass':
            glass_panel(s, side, 0.06, 0.94, 6, H - 6, fill)
            F(0, 1, 44, 46, side_col)             # transom rail
        else:
            glass_panel(s, side, 0.06, 0.94, 84, H - 4, fill)          # transom light
            F(0.1, 0.9, 0, 82, 'wall_top'); glass_panel(s, side, 0.14, 0.86, 0, 79, fill)
            F(0.48, 0.52, 0, 79, 'wall_top')                            # sliding leaf meeting rail
            F(0.4, 0.44, 34, 50, 'paper'); F(0.56, 0.6, 34, 50, 'paper') # pull bars both leaves (mirror-safe)
    if warm:   # interior light seen through the door glass (glow layer)
        if side == 'R': s._glow(s.mask_plane('y', 0, 0.14, 0.86, 0, 79), s.mask_plane('y', 0, 0.14, 0.86, 0, 79), 'glow', 70)
        else: s._glow(s.mask_plane('x', 0, 0.14, 0.86, 0, 79), s.mask_plane('x', 0, 0.14, 0.86, 0, 79), 'glow', 56)

def glass_partition(s, frame=0, H=64, cutaway=False):
    """free-standing 1-tile glass partition (2 height steps), runs along local a, centred in cell.
    cutaway: frame + top rail + 1px paper highlight only, NO fill (for partitions that can occlude avatars)."""
    t0, t1 = 0.45, 0.55
    if cutaway:
        with s.part(outline=C['void']):
            s.box(0, t0, 1, t1, 0, 4, 'metal_d')
            s.box(0, t0, 0.06, t1, 4, H, 'metal_d'); s.box(0.94, t0, 1, t1, 4, H, 'metal_d')
            s.box(0, t0, 1, t1, H - 4, H, 'metal_d')
        with s.part():
            if vis(s, 'front'): s.face('front', t1, 0.06, 0.94, H - 4, H - 3, 'paper')
            else: s.face('back', t0, 0.06, 0.94, H - 4, H - 3, 'paper')
        return
    with s.part(outline=C['void']):
        s.box(0, t0, 1, t1, 0, 6, 'metal_d')
        s.box(0, t0, 0.06, t1, 6, H, 'metal_d'); s.box(0.94, t0, 1, t1, 6, H, 'metal_d')
        s.box(0, t0, 1, t1, H - 4, H, 'metal_d')
        s.box(0.06, t0 + 0.03, 0.94, t1 - 0.03, 6, H - 4, (C['teal_glass'], C['teal_glass'], C['teal_glass']))
    with s.part():
        if vis(s, 'front'):
            for i in range(9):
                s.face('front', t1 - 0.03, 0.2 + i / 32, 0.2 + (i + 1) / 32, H - 22 + i, H - 21 + i, 'paper')
        else:
            for i in range(9):
                s.face('back', t0 + 0.03, 0.2 + i / 32, 0.2 + (i + 1) / 32, H - 22 + i, H - 21 + i, 'paper')

# ================================================================ outdoor: pool
def _water_ripples(s, frame, glow_only=False):
    """world-continuous ripple pattern (periodic per tile), 4-frame slow loop."""
    ph = frame / POOL_FRAMES
    rip = [(0.12, 0.1, 0.34), (0.37, 0.55, 0.28), (0.62, 0.2, 0.3), (0.86, 0.68, 0.24)]
    for k, (v, u, L) in enumerate(rip):
        vv = (v + ph * 0.25) % 1.0
        uu = (u + ph * (0.5 if k % 2 else -0.5)) % 1.0
        segs = [(uu, min(1, uu + L))] + ([(0, uu + L - 1)] if uu + L > 1 else [])
        for a0, a1 in segs:
            if not glow_only:
                s.top(a0, vv, a1, vv + 1 / 32, 0, 'water_dp')
                s.top(a0 + 0.06, vv - 1 / 32, min(a1, a0 + 0.06 + L * 0.5), vv, 0, 'water_glow')
    return rip

def pool_water(s, frame=0):
    """water cell (swim zone). base = deep body #1B4F6B with a few 1px ripple glints;
    glow = sparse 1px paper caustics @40% (animated). The mid/glow gradient lives in pool_light (2 per pool)."""
    with s.part():
        s.top(0, 0, 1, 1, 0, 'water_dp')
    full = s.mask_plane('z', 0, 0, 1, 0, 1)
    ph = frame / POOL_FRAMES
    caus = np.zeros_like(full); rnd = random.Random(5)
    for i in range(3):
        a = (rnd.random() * 0.8 + ph * 0.25 * (1 if i % 2 else -1)) % 0.85; b = (rnd.random() * 0.8 + ph * 0.25) % 0.9
        L = 0.1 + rnd.random() * 0.1
        caus |= s.mask_plane('z', 0, a, a + L, b, b + 1 / 32)
    caus &= full
    s.G[caus] = (*C['paper'][:3], 102)

def pool_light(s, frame=0):
    """underwater light spot (2x2 overlay, screen): stepped gradient mid #2D8FB0 (50% checker rim -> solid)
    to a #7FE0E8 core. Place 2 per pool on water cells, ~1 tile in from the far wall. 4 frames = slow pulse."""
    W = s.W; pul = (0, 1, 2, 1)[frame % 4]
    cx, cy = W / 2, s.D / 2
    s.glow_ell(cx, cy, 0, 40 + pul, 'water', 120, rim=1.0)          # placeholder fill replaced below
    s.G[:] = 0
    X = SX + OX; Y = SY + OY
    px, py = s.S(cx, cy, 0)
    d = ((X - px) / 1.0) ** 2 + ((Y - py) * 2.0) ** 2
    chk = ((_xs + _ys) % 2 == 0)
    for r, col, al, dith in ((44 + pul, 'water', 110, True), (32 + pul, 'water', 110, False),
                             (18 + pul, 'water_glow', 120, True), (12 + pul, 'water_glow', 150, False), (5, 'water_glow', 210, False)):
        m = d <= r * r
        if dith: m &= chk | (d <= (r - 6) ** 2)
        s.G[m] = (*C[col][:3], al)

def pool_coping(s, frame=0, sides='', inner=''):
    """coping overlay drawn on a WATER cell. sides: any of 'nesw' = grid edges that border deck:
    n = -r edge (screen up-right), w = -c edge (up-left), s = +r edge (down-left), e = +c edge (down-right).
    inner: vertices (n/e/s/w) where only the diagonal neighbour is deck (concave corner)."""
    CW = 0.16
    top, side_lit, side_shd = mat('coping')
    with s.part():
        # inner lips (visible only on far edges n and w): coping face then 6px drop to the water
        if 'n' in sides: s._put(s.mask_plane('y', CW, 0 if 'w' not in sides else CW, 1, WATER_Z, 0), side_lit); s._put(s.mask_plane('y', CW, 0, 1, WATER_Z, WATER_Z + 2), C['water_dp'])
        if 'w' in sides: s._put(s.mask_plane('x', CW, 0 if 'n' not in sides else CW, 1, WATER_Z, 0), side_shd); s._put(s.mask_plane('x', CW, 0, 1, WATER_Z, WATER_Z + 2), C['water_dp'])
        # near edges: 1px dark water line under the coping (no visible lip)
        if 's' in sides: s.top(0, 1 - CW - 1 / 32, 1, 1 - CW, 0, 'water_dp')
        if 'e' in sides: s.top(1 - CW - 1 / 32, 0, 1 - CW, 1, 0, 'water_dp')
        for sd in sides:
            a0, b0, a1, b1 = {'n': (0, 0, 1, CW), 's': (0, 1 - CW, 1, 1), 'w': (0, 0, CW, 1), 'e': (1 - CW, 0, 1, 1)}[sd]
            s.top(a0, b0, a1, b1, 0, top)
        for v in inner:
            a0, b0 = {'n': (0, 0), 'e': (1 - CW, 0), 's': (1 - CW, 1 - CW), 'w': (0, 1 - CW)}[v]
            if v in 'nw' or v == 'e' or v == 's':
                if v in ('n', 'e'): s._put(s.mask_plane('y', b0 + CW, a0, a0 + CW, WATER_Z, 0), side_lit)
                if v in ('n', 'w'): s._put(s.mask_plane('x', a0 + CW, b0, b0 + CW, WATER_Z, 0), side_shd)
            s.top(a0, b0, a0 + CW, b0 + CW, 0, top)
    # 1-tile glow spill on the coping (deck spill is a separate overlay: pool_spill)
    if sides or inner:
        m = np.zeros(s.G.shape[:2], bool)
        for sd in sides:
            a0, b0, a1, b1 = {'n': (0, 0, 1, CW), 's': (0, 1 - CW, 1, 1), 'w': (0, 0, CW, 1), 'e': (1 - CW, 0, 1, 1)}[sd]
            m |= s.mask_plane('z', 0, a0, a1, b0, b1)
        s._glow(m & False, m, 'water_glow', 40)

def pool_spill(s, frame=0):
    """1-tile underwater-glow spill for deck cells next to water (50% checker dither, screen)."""
    full = s.mask_plane('z', 0, 0, 1, 0, 1)
    s._glow(full & False, full, 'water_glow', 36)

def sun_lounger(s, frame=0, towel=None):
    """1x2 lounger, walnut + paper. Feet toward local +b ('front'), backrest (head) at b~0."""
    s.shadow(inset=0.18)
    back_lay = lay_if(s, 'back')
    with s.part(outline=C['void']):
        for a in (0.22, 0.72):
            for b in (0.2, 1.74):
                s.box(a, b, a + 0.06, b + 0.06, 0, 6, 'walnut')
        s.box(0.2, 0.12, 0.8, 1.9, 6, 9, 'walnut')
        s.box(0.24, 0.6, 0.76, 1.86, 9, LIE_Z, 'paper')
    with s.part():
        for k in range(5):
            s.top(0.24, 0.85 + k * 0.22, 0.76, 0.85 + k * 0.22 + 1 / 32, LIE_Z, 'gallery_mid')    # mattress quilting
        if towel:
            t, l, r = M[towel]
            s.top(0.24, 1.2, 0.76, 1.46, LIE_Z, t)
            s.face('front', 1.86, 0.3, 0.7, 6, LIE_Z, l) if vis(s, 'front') else None
            if vis(s, 'right'): s.face('right', 0.76, 1.2, 1.46, 2, LIE_Z, r)
            if vis(s, 'left'): s.face('left', 0.24, 1.2, 1.46, 2, LIE_Z, l)
    # backrest: inclined quad from (b 0.62, z 12) up to (b 0.16, z 30)
    p = [s.S(0.24, 0.62, LIE_Z), s.S(0.76, 0.62, LIE_Z), s.S(0.76, 0.16, 30), s.S(0.24, 0.16, 30)]
    o = s.S(0, 0, 0)
    pts = [(x - o[0], y - o[1]) for x, y in p]
    with s.part(outline=C['void'], layer=back_lay):
        s.poly(0, 0, 0, pts, C['gallery'] if vis(s, 'front') else C['wal'])
        # support strut under the raised end
        s.box(0.3, 0.16, 0.34, 0.2, 9, 28, 'walnut'); s.box(0.66, 0.16, 0.7, 0.2, 9, 28, 'walnut')
    with s.part(layer=back_lay):
        if vis(s, 'front'):
            q = [s.S(0.3, 0.5, LIE_Z + 4), s.S(0.7, 0.5, LIE_Z + 4), s.S(0.7, 0.24, 27), s.S(0.3, 0.24, 27)]
            s.poly(0, 0, 0, [(x - o[0], y - o[1]) for x, y in q], C['paper'])
        else:
            s.face('back', 0.16, 0.24, 0.76, 9, 30, 'walnut')          # back of the raised backrest
            for k in range(3):
                s.face('back', 0.16, 0.24, 0.76, 13 + k * 6, 14 + k * 6, 'wal_dk')
            s.face('back', 0.16, 0.24, 0.76, 29, 30, 'wal_lt')
    s.meta['seats'] = [{'local': (0.5, 1.0), 'face': 'front', 'seat_z': LIE_Z, 'anims': ['lie'], 'pose': 'lie',
                        'note': 'pivot = footprint midpoint; feet toward facing, head on the backrest; lie frames author pelvis 12 px above pivot'}]

def parasol(s, frame=0, open_=True):
    """8-panel octagon parasol, muted yellow (pending AD hex). Exactly one, by the pool bar."""
    s.shadow(ellipse=True, rx=10)
    with s.part(outline=C['void']):
        s.cyl(0.5, 0.5, 0, 4, 10, 'stone')
        s.box(0.48, 0.48, 0.52, 0.52, 4, 98, 'walnut')
    if not open_:
        with s.part(outline=C['void']):
            s.poly(0.5, 0.5, 96, [(-1, 0), (1, 0), (5, 40), (0, 46), (-5, 40)], C['parasol'])
        return
    R = 1.0; zr, za = 80, 98
    cx, cy = s.S(0.5, 0.5, za)
    rim = []
    for k in range(8):
        ang = math.radians(22.5 + k * 45)
        rim.append(s.S(0.5 + R * math.cos(ang), 0.5 + R * math.sin(ang), zr))
    with s.part(outline=C['void']):
        for k in range(8):
            p1, p2 = rim[k], rim[(k + 1) % 8]
            mx = (p1[0] + p2[0]) / 2 - cx; my = (p1[1] + p2[1]) / 2 - cy
            lit = mx < 0                                   # key light top-left
            col = ('parasol_lt' if k % 2 == 0 else 'parasol') if lit else ('parasol' if k % 2 == 0 else 'parasol_dk')
            o = s.S(0.5, 0.5, za)
            s.poly(0.5, 0.5, za, [(0, 0), (p1[0] - o[0], p1[1] - o[1]), (p2[0] - o[0], p2[1] - o[1])], C[col])
    with s.part():
        o = s.S(0.5, 0.5, za)
        for k in range(8):                                      # ribs
            x1, y1 = rim[k][0] - o[0], rim[k][1] - o[1]
            n = int(max(abs(x1), abs(y1)))
            for i in range(1, n):
                s.rect(0.5, 0.5, za, int(round(x1 * i / n)), int(round(y1 * i / n)), 1, 1, 'parasol_dk')
        for k in range(8):                                      # valance hem: 1px dark along the camera-side rim
            p1, p2 = rim[k], rim[(k + 1) % 8]
            if (p1[1] + p2[1]) / 2 < cy + 4: continue
            n = int(max(abs(p2[0] - p1[0]), abs(p2[1] - p1[1])))
            for i in range(n + 1):
                x = p1[0] + (p2[0] - p1[0]) * i / n - o[0]; y = p1[1] + (p2[1] - p1[1]) * i / n - o[1]
                s.rect(0.5, 0.5, za, int(round(x)), int(round(y)) - 1, 1, 1, 'parasol_dk')
        s.rect(0.5, 0.5, za, -1, -3, 2, 3, 'walnut')            # finial

def pool_bar(s, frame=0):
    """2x1 pool bar: walnut counter, paper-grey top, bottles; string lights on two posts (single #FFD166 points)."""
    W = s.W
    s.shadow()
    with s.part(outline=C['void']):
        s.box(0.06, 0.3, W - 0.06, 0.92, 0, 33, 'walnut')
        s.box(0.02, 0.26, W - 0.02, 0.96, 33, 36, 'coping')
    with s.part():
        if vis(s, 'front'):
            for i in range(int(W * 3)):
                s.face('front', 0.92, 0.12 + i / 3, 0.12 + i / 3 + 1 / 32, 3, 31, 'wal_dk')
            s.face('front', 0.92, 0.06, W - 0.06, 3, 4, 'wal_dk')
    rnd = random.Random(3)
    for k, col in enumerate(('steel', 'baize', 'oxblood', 'coral', 'paper')):
        a = 0.3 + k * 0.28
        with s.part(outline=C['void']):
            s.box(a, 0.36, a + 0.08, 0.44, 36, 46 + (k % 2) * 3, col)
            s.box(a + 0.025, 0.385, a + 0.055, 0.415, 46 + (k % 2) * 3, 50 + (k % 2) * 3, col)
    with s.part(outline=C['void']):
        s.box(W - 0.6, 0.62, W - 0.48, 0.74, 36, 42, 'metal')
    # string light posts + string + bulbs
    with s.part(outline=C['void']):
        for a in (0.04, W - 0.1):
            s.box(a, 0.14, a + 0.06, 0.2, 0, 100, 'walnut')
    o0 = s.S(0.07, 0.17, 98); o1 = s.S(W - 0.07, 0.17, 98)
    n = 34; pts = []
    for i in range(n + 1):
        t = i / n; x = o0[0] + (o1[0] - o0[0]) * t; y = o0[1] + (o1[1] - o0[1]) * t + 10 * math.sin(math.pi * t)
        pts.append((x, y))
    o = s.S(0, 0, 0)
    with s.part():
        for x, y in pts:
            s.rect(0, 0, 0, int(round(x - o[0])), int(round(y - o[1])), 1, 1, 'grey')
        for i in range(2, n - 1, 3):
            x, y = pts[i]
            s.rect(0, 0, 0, int(round(x - o[0])), int(round(y - o[1])) + 1, 1, 1, 'glow')
            gx, gy = int(round(x)), int(round(y)) + 1
            s.G[gy, gx] = (*C['glow'][:3], 255)
            # 1px warm spill on the bar top straight below the bulb (glow layer only)
            t = i / n; a_ = 0.07 + (W - 0.14) * t
            sx_, sy_ = s.S(a_, 0.6, 36)
            s.G[int(sy_), int(sx_)] = (*C['glow'][:3], 120)
    s.meta['surface_z'] = 36
    s.meta['use'] = [{'local': (W / 2, 1.5), 'face': 'back'}]

def towel_box(s, a0, b0, a1, b1, z0, z1, accm):
    with s.part(outline=C['void']):
        s.box(a0, b0, a1, b1, z0, z1, accm)
    with s.part():
        s.top(a0 + 0.04, b0 + (b1 - b0) * 0.5, a1 - 0.04, b0 + (b1 - b0) * 0.5 + 1 / 32, z1, M[accm][1])

TOWELS = ['plum', 'steel', 'coral', 'baize']
def towel_stack(s, frame=0):
    """low walnut side table with 3 folded towels (room-accent lights on top)."""
    s.shadow(inset=0.22)
    with s.part(outline=C['void']):
        s.box(0.22, 0.22, 0.78, 0.78, 0, 12, 'walnut')
    for k, m_ in enumerate(('steel', 'coral', 'plum')):
        towel_box(s, 0.3 - k * 0.02, 0.3, 0.7 - k * 0.02, 0.7, 12 + k * 4, 16 + k * 4, m_)

def towel_folded(s, frame=0, m='steel'):
    towel_box(s, 0.3, 0.32, 0.7, 0.68, 0, 4, m)

def planter_hedge(s, frame=0):
    W = s.W
    s.shadow(inset=0.1)
    with s.part(outline=C['void']):
        s.box(0.1, 0.18, W - 0.1, 0.82, 0, 16, 'deck')
    with s.part(outline=C['void']):
        s.box(0.16, 0.24, W - 0.16, 0.76, 16, 34, (C['baize'], C['baize_dk'], C['grass_dk']))
    with s.part():
        rnd = random.Random(int(W * 7))
        for i in range(int(14 * W)):
            a = 0.2 + rnd.random() * (W - 0.4); b = 0.28 + rnd.random() * 0.44
            s.top(a, b, a + 1 / 32, b + 1 / 32, 34, 'baize_lt' if rnd.random() < 0.4 else 'grass_md')

def door_spill(s, frame=0):
    light_pool(s, col='glow', alpha=60)
