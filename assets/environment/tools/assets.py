"""Asset builders (style sheet v1.1 scale). LOCAL coords on a Sprite:
a in [0,W] (width), b in [0,D] (depth), FRONT = +b. z in px at 1x.
Scale: tile 64x32, height step 32 px, avatar 84-88 px (frame 64x112, pivot 32,100),
seat top 18 px (= chars-iso hip height), desk/table top 26 px (1x1 desk = 58 px tall),
chair 0.5 tile wide, back top 44 px (sprite ~60 px), full wall 96, half wall 32."""
import random, math
from iso import Sprite, scr
from palette import C, mat, M

SEAT_Z = 14
DESK_Z = 26
TORSO_HALF = 12       # px: avatar torso half-width kept clear in desk front slices

def vis(s, side):
    n = {'front': (0, 1), 'back': (0, -1), 'right': (1, 0), 'left': (-1, 0)}[side]
    x, y = s.Rv(*n); return x > 0 or y > 0

def lay_if(s, side):
    """'front' when `side` of the object faces the camera (it must cover a seated avatar)."""
    return 'front' if vis(s, side) else 'base'

# ================================================================ desk props
def monitor(s, a, b, z, lay='base'):
    with s.part(outline=C['void'], layer=lay):
        s.box(a - 0.14, b - 0.1, a + 0.14, b + 0.08, z, z + 2, 'night')
        s.box(a - 0.03, b - 0.03, a + 0.03, b + 0.02, z + 2, z + 9, 'metal_d')
        s.box(a - 0.36, b - 0.05, a + 0.36, b + 0.03, z + 9, z + 32, 'night')
    with s.part(layer=lay):
        if s.face('front', b + 0.03, a - 0.32, a + 0.32, z + 11, z + 30, 'floor_dk'):
            s.face('front', b + 0.03, a - 0.29, a + 0.29, z + 12, z + 29, 'steel_dk')
            for i, u1 in enumerate((0.1, 0.2, 0.0, 0.16, 0.06)):
                s.face('front', b + 0.03, a - 0.24, a + u1, z + 26 - i * 3, z + 27 - i * 3, 'steel_lt')
            s.face('front', b + 0.03, a + 0.12, a + 0.24, z + 13, z + 17, 'steel')
            s.face('front', b + 0.03, a + 0.22, a + 0.25, z + 27, z + 28, 'paper')    # 1px glint
            s.glow_face('front', b + 0.03, a - 0.29, a + 0.29, z + 12, z + 29, 'steel', 45)
        else:
            s.face('back', b - 0.05, a - 0.22, a + 0.22, z + 14, z + 26, 'wall_shd')
            s.face('back', b - 0.05, a - 0.1, a + 0.1, z + 22, z + 23, 'floor_lt')

def keyboard(s, a, b, z, lay='base'):
    with s.part(outline=C['wall_shd'], layer=lay):
        s.box(a - 0.28, b - 0.09, a + 0.28, b + 0.09, z, z + 2, 'metal')
    with s.part(layer=lay):
        for i in range(6):
            s.top(a - 0.24 + i * 0.08, b - 0.06, a - 0.19 + i * 0.08, b + 0.05, z + 2, 'grey')
        s.top(a + 0.36, b - 0.04, a + 0.42, b + 0.05, z + 1, 'paper')        # mouse

def mug(s, a, b, z, lay='base'):
    with s.part(outline=C['gallery_dk'], layer=lay):
        s.cyl(a, b, z, z + 7, 3, 'paper')
        s.rect(a, b, z, 3, -6, 2, 3, 'gallery_mid')
    with s.part(layer=lay):
        s.ell(a, b, z + 7, 2, 'wal_dk')

def desk_lamp(s, a, b, z, lay='base'):
    with s.part(outline=C['void'], layer=lay):
        s.ell(a, b, z, 5, 'brass_shd'); s.ell(a, b, z + 1, 4, 'brass')
        s.rect(a, b, z, 0, -22, 1, 22, 'grey')
        s.rect(a, b, z, 0, -23, 7, 1, 'grey')
        s.poly(a, b, z, [(3, -25), (10, -25), (13, -17), (1, -17)], C['brass'])
        s.poly(a, b, z, [(7, -25), (10, -25), (13, -17), (8, -17)], C['brass_shd'])
        s.rect(a, b, z, 4, -25, 2, 1, 'brass_lt')
    with s.part(layer=lay):
        s.rect(a, b, z, 2, -17, 10, 1, 'glow')
    s.glow_ell(a, b, z, 6, 'glow', 70, ry=3, dx=7, dy=-15)

def pc_tower(s, frame=0):
    s.shadow(inset=0.25)
    with s.part(outline=C['void']):
        s.box(0.32, 0.18, 0.68, 0.82, 0, 34, 'night')
    with s.part():
        s.face('front', 0.82, 0.38, 0.62, 26, 30, 'wall_shd')
        s.face('front', 0.82, 0.4, 0.45, 20, 21, 'steel_lt')
        s.face('right', 0.68, 0.26, 0.74, 6, 7, 'wall_shd'); s.face('right', 0.68, 0.26, 0.74, 9, 10, 'wall_shd')
    s.glow_face('front', 0.82, 0.4, 0.45, 20, 21, 'steel', 80)

def prop_monitor(s, frame=0): monitor(s, 0.5, 0.5, 0)
def prop_keyboard(s, frame=0): keyboard(s, 0.45, 0.5, 0)
def prop_lamp(s, frame=0): desk_lamp(s, 0.5, 0.5, 0)
def prop_mug(s, frame=0): mug(s, 0.5, 0.5, 0)
def prop_papers(s, frame=0, z=0, lay='base'):
    with s.part(outline=C['gallery_dk'], layer=lay):
        s.box(0.3, 0.32, 0.7, 0.66, z, z + 2, 'paper'); s.box(0.33, 0.35, 0.68, 0.63, z + 2, z + 4, 'paper')
    with s.part(layer=lay):
        s.top(0.38, 0.42, 0.6, 0.45, z + 4, 'grey'); s.top(0.38, 0.5, 0.55, 0.53, z + 4, 'grey')

# ================================================================ desks
def _desk_body(s, W, D, lay_top, lay_side, b0=0.04, b1=0.96, ped=True):
    """legs + optional drawer pedestal + top slab. Tops into lay_top, vertical sides into lay_side."""
    def parts(top, sides, lay):
        with s.part(outline=C['wal_dk'], layer=lay):
            s.box(0.05, b0 + 0.06, 0.15, b1 - 0.06, 0, DESK_Z - 4, 'walnut', top=top, sides=sides)
            if ped: s.box(W - 0.5, b0 + 0.06, W - 0.06, b1 - 0.08, 0, DESK_Z - 4, 'walnut', top=top, sides=sides)
            else: s.box(W - 0.15, b0 + 0.06, W - 0.05, b1 - 0.06, 0, DESK_Z - 4, 'walnut', top=top, sides=sides)
            s.box(0, b0, W, b1, DESK_Z - 4, DESK_Z, 'walnut', top=top, sides=sides)
        with s.part(layer=lay):
            if sides:
                s.face('front', b1, 0, W, DESK_Z - 3, DESK_Z - 2, 'brass')                  # brass inlay
                if ped:
                    for z in (6, 13):
                        s.face('front', b1 - 0.08, W - 0.46, W - 0.1, z, z + 1, 'wal_dk')
                        s.face('front', b1 - 0.08, W - 0.32, W - 0.24, z + 3, z + 4, 'brass')
            if top:
                s.top(0.2, b0 + 0.32, W - 0.2, b1 - 0.1, DESK_Z, 'baize')
    if lay_top == lay_side:
        parts(True, True, lay_top)
    else:
        parts(True, False, lay_top); parts(False, True, lay_side)

def desk(s, frame=0, pc=True):
    """W x 1 desk. Seats on the local +b side (chair tile in front), one per tile.
    sitter faces the desk (-b)."""
    W = s.W
    s.shadow()
    sitter_back_to_cam = vis(s, 'front')
    if sitter_back_to_cam:
        _desk_body(s, W, 1, 'base', 'base')
        if pc:
            for i in range(W):
                a = i + 0.5
                monitor(s, a, 0.3, DESK_Z); keyboard(s, a - 0.05, 0.72, DESK_Z)
            desk_lamp(s, W - 0.22, 0.2, DESK_Z) if W > 1 else desk_lamp(s, 0.14, 0.18, DESK_Z)
            mug(s, W - 0.18, 0.62, DESK_Z)
        # FRONT SLICE: desk front face (covers the avatar's knees/shins under the desk),
        # with a clear band where the avatar's torso is (torso is physically in front).
        _desk_body(s, W, 1, 'front', 'front')
        s.L['front'][..., 3] = s.L['front'][..., 3]  # keep
        import numpy as np
        from iso import SX, SY, OX, OY
        # drop the top surface from the front slice (only vertical faces stay)
        tmp = Sprite(s.W, s.D, s.facing); _desk_body(tmp, W, 1, 'base', 'base')
        topmask = np.zeros(s.L['front'].shape[:2], bool)
        t2 = Sprite(s.W, s.D, s.facing)
        with t2.part():
            t2.box(0, 0.04, W, 0.96, DESK_Z - 4, DESK_Z, 'walnut', sides=False)
        topmask = t2.L['base'][..., 3] > 0
        s.L['front'][topmask] = 0
        for i in range(W):
            s.clear_band('front', i + 0.5, 1.5, 0, TORSO_HALF)
    else:
        # sitter behind the desk, facing the camera: tops + things under the hands behind the
        # avatar; every camera-facing vertical face + monitor + lamp in front of the avatar.
        _desk_body(s, W, 1, 'base', 'front')
        if pc:
            for i in range(W):
                a = i + 0.5
                keyboard(s, a - 0.05, 0.72, DESK_Z, lay='base')
                monitor(s, a + (0.12 if W == 1 else 0), 0.3, DESK_Z, lay='front')
            mug(s, W - 0.18, 0.62, DESK_Z, lay='base')
            desk_lamp(s, W - 0.22, 0.2, DESK_Z, lay='front') if W > 1 else None
    s.meta['seats'] = [{'local': (i + 0.5, 1.5), 'face': 'back'} for i in range(W)]
    s.meta['surface_z'] = DESK_Z

def desk_plain(s, frame=0): desk(s, pc=False)

def desk_L(s, frame=0):
    """2x2 L-desk (sw/se only): top along back (b 0..1) + return along +a (a 1..2, b 1..2).
    seat cell local (0,1) -> sitter faces -b."""
    s.shadow()
    _desk_body(s, 2, 1, 'base', 'base')
    with s.part(outline=C['wal_dk']):
        s.box(1.25, 1.1, 1.94, 1.92, 0, DESK_Z - 4, 'walnut')
        s.box(1.0, 0.96, 2, 2, DESK_Z - 4, DESK_Z, 'walnut')
    with s.part():
        for z in (6, 13):
            s.face('left', 1.25, 1.2, 1.86, z, z + 1, 'wal_dk')
        s.face('left', 1.0, 1.0, 2.0, DESK_Z - 3, DESK_Z - 2, 'brass')
        s.face('front', 2, 1.0, 2.0, DESK_Z - 3, DESK_Z - 2, 'brass')
        s.top(1.2, 1.2, 1.8, 1.8, DESK_Z, 'baize')
    monitor(s, 0.5, 0.3, DESK_Z); keyboard(s, 0.48, 0.72, DESK_Z)
    desk_lamp(s, 1.78, 0.2, DESK_Z); mug(s, 1.5, 1.7, DESK_Z); prop_papers(s, z=DESK_Z) if False else None
    with s.part(outline=C['gallery_dk']):
        s.box(1.3, 1.25, 1.65, 1.55, DESK_Z, DESK_Z + 2, 'paper'); s.box(1.33, 1.28, 1.62, 1.52, DESK_Z + 2, DESK_Z + 4, 'paper')
    # front slice: vertical faces of the main top facing the seat, torso band cleared
    with s.part(outline=C['wal_dk'], layer='front'):
        s.box(0, 0.04, 1.0, 0.96, DESK_Z - 4, DESK_Z, 'walnut', top=False)
        s.box(0.05, 0.1, 0.15, 0.9, 0, DESK_Z - 4, 'walnut', top=False)
        s.box(1.0, 0.96, 2, 2, DESK_Z - 4, DESK_Z, 'walnut', top=False)
    with s.part(layer='front'):
        s.face('front', 0.96, 0, 1.0, DESK_Z - 3, DESK_Z - 2, 'brass'); s.face('left', 1.0, 1.0, 2.0, DESK_Z - 3, DESK_Z - 2, 'brass')
    s.clear_band('front', 0.5, 1.5, 0, TORSO_HALF)
    s.meta['seats'] = [{'local': (0.5, 1.5), 'face': 'back'}]
    s.meta['walkable_local'] = [(0, 1)]
    s.meta['surface_z'] = DESK_Z

def cubicle(s, frame=0):
    """2x2 cubicle (sw/se only): fabric panels on back (b=0) and left (a=0), 1 height step + 12.
    desk 2x1 along the back; seat cell local (1,1)."""
    s.shadow()
    H = 46
    with s.part(outline=C['void']):
        s.box(0, 0, 2, 0.08, 0, H, 'wall'); s.box(0, 0.08, 0.08, 2, 0, H, 'wall')
    with s.part():
        s.face('front', 0.08, 0.12, 1.92, 24, H - 4, 'baize_dk'); s.face('right', 0.08, 0.12, 1.92, 24, H - 4, 'baize_dk')
        s.face('front', 0.08, 0.3, 0.6, 30, 39, 'paper'); s.face('front', 0.08, 1.5, 1.72, 28, 36, 'gallery')
        s.face('front', 0.08, 1.56, 1.6, 34, 35, 'oxblood')
        s.face('right', 0.08, 0.5, 0.75, 30, 38, 'paper')
        s.top(0, 0, 2, 0.08, H, 'wall_top'); s.top(0, 0, 0.08, 2, H, 'wall_top')
    with s.part(outline=C['wal_dk']):
        s.box(0.1, 0.14, 0.6, 0.88, 0, DESK_Z - 4, 'walnut'); s.box(1.85, 0.14, 1.95, 0.9, 0, DESK_Z - 4, 'walnut')
        s.box(0.08, 0.08, 2, 0.96, DESK_Z - 4, DESK_Z, 'walnut')
    with s.part():
        for z in (6, 13):
            s.face('front', 0.88, 0.14, 0.56, z, z + 1, 'wal_dk'); s.face('front', 0.88, 0.3, 0.38, z + 3, z + 4, 'brass')
        s.face('front', 0.96, 0.08, 2, DESK_Z - 3, DESK_Z - 2, 'brass')
        s.top(0.3, 0.4, 1.8, 0.86, DESK_Z, 'baize')
    monitor(s, 1.5, 0.32, DESK_Z); keyboard(s, 1.45, 0.72, DESK_Z); mug(s, 0.4, 0.6, DESK_Z)
    with s.part(outline=C['wal_dk'], layer='front'):
        s.box(0.08, 0.08, 2, 0.96, DESK_Z - 4, DESK_Z, 'walnut', top=False)
        s.box(1.85, 0.14, 1.95, 0.9, 0, DESK_Z - 4, 'walnut', top=False)
        s.box(0.1, 0.14, 0.6, 0.88, 0, DESK_Z - 4, 'walnut', top=False)
    with s.part(layer='front'):
        s.face('front', 0.96, 0.08, 2, DESK_Z - 3, DESK_Z - 2, 'brass')
    s.clear_band('front', 1.5, 1.5, 0, TORSO_HALF)
    s.meta['seats'] = [{'local': (1.5, 1.5), 'face': 'back'}]
    s.meta['walkable_local'] = [(0, 1), (1, 1)]
    s.meta['surface_z'] = DESK_Z

# ================================================================ chairs (back slice + arm/front slice)
def office_chair(s, frame=0, m='wall', arms=True):
    """sitter faces local +b; chair body half a tile wide (a,b in 0.25..0.75); ~60 px sprite."""
    s.shadow(ellipse=True, rx=15)
    back_lay = lay_if(s, 'back')
    with s.part(outline=C['void']):
        s.box(0.3, 0.48, 0.7, 0.53, 0, 3, 'metal_d'); s.box(0.48, 0.3, 0.53, 0.7, 0, 3, 'metal_d')
        s.box(0.47, 0.47, 0.54, 0.54, 3, SEAT_Z - 4, 'metal_d')
    with s.part(outline=C['void']):
        s.box(0.25, 0.27, 0.75, 0.76, SEAT_Z - 4, SEAT_Z, m)
    with s.part():
        s.top(0.3, 0.34, 0.7, 0.72, SEAT_Z, C[M[m][1]] if m != 'wall' else C['wall_top'])
        s.top(0.3, 0.52, 0.7, 0.54, SEAT_Z, C[M[m][2]])                    # seam
    with s.part(outline=C['void'], layer=back_lay):
        s.box(0.47, 0.22, 0.54, 0.3, SEAT_Z, 24, 'metal_d')
        s.box(0.26, 0.2, 0.74, 0.3, 24, 44, m)
    with s.part(layer=back_lay):
        s.top(0.26, 0.2, 0.74, 0.3, 44, C[M[m][0]])
        if vis(s, 'back'): s.face('back', 0.2, 0.3, 0.7, 28, 40, C[M[m][2]] if m == 'wall' else 'wall_shd')
        else: s.face('front', 0.3, 0.3, 0.7, 28, 40, C[M[m][0]] if m == 'wall' else C[M[m][1]])
    if arms:
        for a0 in (0.22, 0.72):
            with s.part(outline=C['void'], layer='front'):
                s.box(a0 + 0.01, 0.5, a0 + 0.05, 0.54, SEAT_Z, 22, 'metal_d')
                s.box(a0, 0.36, a0 + 0.06, 0.68, 22, 24, 'night')
    s.meta['seats'] = [{'local': (0.5, 0.5), 'face': 'front'}]

def meeting_chair(s, frame=0): office_chair(s, m='steel')
def library_chair(s, frame=0): office_chair(s, m='oxblood', arms=False)

def armchair(s, frame=0, m='oxblood'):
    s.shadow()
    with s.part(outline=C['void']):
        for a, b in ((0.14, 0.16), (0.8, 0.16), (0.14, 0.82), (0.8, 0.82)):
            s.box(a, b, a + 0.06, b + 0.06, 0, 5, 'walnut')
        s.box(0.1, 0.12, 0.9, 0.92, 5, SEAT_Z, m)
    with s.part():
        s.top(0.26, 0.32, 0.74, 0.88, SEAT_Z, C[M[m][0]])
        s.top(0.26, 0.6, 0.74, 0.62, SEAT_Z, C[M[m][2]])     # stitched seam
        if vis(s, 'front'): s.face('front', 0.92, 0.2, 0.8, 9, 10, C[M[m][2]])
    with s.part(outline=C['void'], layer=lay_if(s, 'back')):
        s.box(0.1, 0.1, 0.9, 0.3, SEAT_Z, 44, m)
    with s.part(layer=lay_if(s, 'back')):
        s.top(0.1, 0.1, 0.9, 0.3, 44, C[M[m][0]])
        s.top(0.14, 0.1, 0.86, 0.12, 44, 'brass') if False else None
    for a0 in (0.1, 0.74):
        with s.part(outline=C['void'], layer='front'):
            s.box(a0, 0.28, a0 + 0.16, 0.92, SEAT_Z, 26, m)
        with s.part(layer='front'):
            s.top(a0, 0.28, a0 + 0.16, 0.92, 26, C[M[m][0]])
    s.meta['seats'] = [{'local': (0.5, 0.55), 'face': 'front'}]

def lounge_armchair(s, frame=0): armchair(s, m='plum')

def sofa(s, frame=0, m='plum'):
    W = s.W
    s.shadow()
    with s.part(outline=C['void']):
        for a in (0.12, W - 0.18):
            for b in (0.18, 0.82):
                s.box(a, b, a + 0.06, b + 0.06, 0, 5, 'walnut')
        s.box(0.08, 0.12, W - 0.08, 0.92, 5, SEAT_Z, m)
    with s.part():
        for i in range(W):
            s.top(0.24 + i if i == 0 else i + 0.04, 0.36, (i + 0.96) if i < W - 1 else W - 0.24, 0.88, SEAT_Z, C[M[m][0]])
        if vis(s, 'front'): s.face('front', 0.92, 0.2, W - 0.2, 9, 10, C[M[m][2]])
    with s.part(outline=C['void'], layer=lay_if(s, 'back')):
        s.box(0.08, 0.1, W - 0.08, 0.34, SEAT_Z - 2, 40, m)
    with s.part(layer=lay_if(s, 'back')):
        s.top(0.08, 0.1, W - 0.08, 0.34, 40, C[M[m][0]])
        for i in range(1, W):
            s.face('front', 0.34, i - 0.01, i + 0.01, SEAT_Z, 38, C[M[m][2]]) if vis(s, 'front') else s.face('back', 0.1, i - 0.01, i + 0.01, SEAT_Z, 38, C[M[m][2]])
    for a0 in (0.04, W - 0.24):
        with s.part(outline=C['void'], layer='front'):
            s.box(a0, 0.1, a0 + 0.2, 0.94, 5, 25, m)
        with s.part(layer='front'):
            s.top(a0, 0.1, a0 + 0.2, 0.94, 25, C[M[m][0]])
    s.meta['seats'] = [{'local': (i + 0.5, 0.58), 'face': 'front'} for i in range(W)]

# ================================================================ workspace misc
def filing_cabinet(s, frame=0):
    s.shadow()
    with s.part(outline=C['void']):
        s.box(0.18, 0.18, 0.82, 0.84, 0, 52, 'metal_d')
    with s.part():
        if vis(s, 'front'):
            for i in range(3):
                z = 3 + i * 16
                s.face('front', 0.84, 0.22, 0.78, z, z + 14, 'metal')
                s.face('front', 0.84, 0.22, 0.78, z + 14, z + 15, 'wall_lit')
                s.face('front', 0.84, 0.42, 0.58, z + 10, z + 11, 'brass')
                s.face('front', 0.84, 0.44, 0.56, z + 5, z + 8, 'paper')
        s.top(0.24, 0.24, 0.55, 0.52, 52, 'paper')
    with s.part(outline=C['gallery_dk']):
        s.box(0.26, 0.26, 0.54, 0.5, 52, 54, 'paper')
    s.meta['use'] = [{'local': (0.5, 1.5), 'face': 'back'}]

def trash_bin(s, frame=0):
    s.shadow(ellipse=True, rx=11)
    with s.part(outline=C['void']):
        s.cyl(0.5, 0.5, 0, 20, 9, 'metal_d')
    with s.part():
        s.ell(0.5, 0.5, 20, 8, 'wall_shd')
        for dx in (-6, -3, 0, 3, 6):
            s.rect(0.5, 0.5, 0, dx, -18, 1, 14, C['wall_top'] if dx < 2 else C['wall_shd'])
    with s.part(outline=C['gallery_dk']):
        s.ell(0.5, 0.5, 20, 4, 'paper', dx=-2, dy=-2); s.ell(0.5, 0.5, 20, 3, 'paper', dx=3, dy=0)

def copier(s, frame=0):
    s.shadow()
    with s.part(outline=C['void']):
        s.box(0.1, 0.14, 0.86, 0.86, 0, 32, 'metal')
        s.box(0.1, 0.14, 0.86, 0.86, 32, 38, 'metal_d')
        s.box(0.14, 0.17, 0.82, 0.82, 38, 41, 'metal')
    with s.part():
        if vis(s, 'front'):
            for z in (4, 15):
                s.face('front', 0.86, 0.16, 0.8, z, z + 9, 'gallery_mid')
                s.face('front', 0.86, 0.38, 0.58, z + 6, z + 7, 'wall_top')
            s.face('front', 0.86, 0.1, 0.86, 28, 29, 'wall_top')
        s.top(0.56, 0.6, 0.78, 0.78, 41, 'steel_dk'); s.top(0.6, 0.63, 0.7, 0.7, 41, 'steel_lt')
        s.top(0.2, 0.22, 0.5, 0.5, 41, 'grey')
    with s.part(outline=C['void']):
        s.box(0.86, 0.3, 0.98, 0.7, 20, 22, 'metal_d')
    with s.part(outline=C['gallery_dk']):
        s.box(0.87, 0.33, 0.97, 0.67, 22, 23, 'paper')
    s.glow_ell(0.65, 0.66, 41, 5, 'steel', 45)
    s.meta['use'] = [{'local': (0.5, 1.5), 'face': 'back'}]

def water_dispenser(s, frame=0):
    s.shadow(inset=0.22)
    with s.part(outline=C['void']):
        s.box(0.26, 0.26, 0.74, 0.74, 0, 42, 'paper')
    with s.part():
        if vis(s, 'front'):
            s.face('front', 0.74, 0.3, 0.7, 20, 28, 'wall_shd')
            s.face('front', 0.74, 0.36, 0.42, 29, 32, 'steel'); s.face('front', 0.74, 0.58, 0.64, 29, 32, 'oxblood')
            s.face('front', 0.74, 0.3, 0.7, 20, 21, 'grey')
    with s.part(outline=C['void']):
        s.cyl(0.5, 0.5, 42, 64, 11, 'steel', ry=5.5)
        s.cyl(0.5, 0.5, 64, 67, 5, 'steel')
    with s.part():
        s.rect(0.5, 0.5, 42, -8, -19, 1, 13, 'steel_lt'); s.rect(0.5, 0.5, 42, -7, -20, 1, 1, 'paper')
    s.meta['use'] = [{'local': (0.5, 1.5), 'face': 'back'}]

# ================================================================ library
BOOKS = ['oxblood', 'walnut', 'cream', 'tan', 'stone', 'oxblood', 'night', 'baize']

def bookshelf(s, frame=0, h=88, rows=5, seed=1):
    W = s.W; rnd = random.Random(seed + W * 7 + h)
    s.shadow()
    with s.part(outline=C['void']):
        s.box(0, 0.25, W, 0.95, 0, h, 'walnut')
    with s.part():
        s.top(0, 0.25, W, 0.95, h, 'wal_lt')
        if vis(s, 'front'):
            rh = (h - 6) // rows
            for r in range(rows):
                z0 = 4 + r * rh; z1 = z0 + rh - 2
                s.face('front', 0.95, 0.06, W - 0.06, z0, z1, 'wal_dk')
                u = 0.08
                while u < W - 0.1:
                    w = rnd.choice([2, 3, 3, 4, 4]) / 32
                    if u + w > W - 0.08: break
                    bh = rnd.randint(rh - 8, rh - 3)
                    if rnd.random() < 0.07: u += w; continue
                    if rnd.random() < 0.05 and u + 0.3 < W:      # a lying stack
                        for k in range(3):
                            s.face('front', 0.95, u, u + 0.22, z0 + k * 2, z0 + k * 2 + 2, rnd.choice(BOOKS))
                        u += 0.26; continue
                    s.face('front', 0.95, u, u + w, z0, z0 + bh, rnd.choice(BOOKS))
                    u += w + (1 / 32 if rnd.random() < 0.25 else 0)
            s.face('front', 0.95, 0, W, h - 3, h - 2, 'brass')
        else:
            s.face('back', 0.25, 0, W, 2, h - 2, 'wal')
            for k in range(1, W * 2):
                s.face('back', 0.25, k / 2 - 0.01, k / 2 + 0.01, 2, h - 2, 'wal_dk')

def bookshelf_low(s, frame=0): bookshelf(s, h=40, rows=2, seed=5)

def reading_table(s, frame=0):
    W = s.W
    s.shadow()
    with s.part(outline=C['wal_dk']):
        for a, b in ((0.08, 0.1), (W - 0.16, 0.1), (0.08, 0.82), (W - 0.16, 0.82)):
            s.box(a, b, a + 0.08, b + 0.08, 0, DESK_Z - 4, 'walnut')
        s.box(0, 0.02, W, 0.98, DESK_Z - 4, DESK_Z, 'walnut')
    with s.part():
        s.top(0.18, 0.16, W - 0.18, 0.84, DESK_Z, 'oxblood_dk')
        s.face('front', 0.98, 0, W, DESK_Z - 3, DESK_Z - 2, 'brass')
    a, b, z = W / 2, 0.32, DESK_Z         # the library's one brass reading lamp
    with s.part(outline=C['void']):
        s.ell(a, b, z, 6, 'brass_shd'); s.ell(a, b, z + 1, 5, 'brass')
        s.rect(a, b, z, 0, -14, 1, 13, 'brass')
        s.poly(a, b, z, [(-9, -19), (9, -19), (6, -14), (-6, -14)], C['brass'])
        s.poly(a, b, z, [(1, -19), (9, -19), (6, -14), (1, -14)], C['brass_shd'])
        s.rect(a, b, z, -6, -19, 4, 1, 'brass_lt')
    with s.part():
        s.rect(a, b, z, -5, -14, 11, 1, 'glow')
    s.glow_ell(a, b, z, 16, 'glow', 80, ry=8, dy=-10)
    with s.part(outline=C['gallery_dk']):
        s.box(0.2, 0.56, 0.48, 0.88, z, z + 2, 'paper'); s.box(0.48, 0.56, 0.76, 0.88, z, z + 2, 'cream')
    with s.part(outline=C['oxblood_dk']):
        s.box(W - 0.62, 0.48, W - 0.24, 0.8, z, z + 4, 'oxblood'); s.box(W - 0.6, 0.5, W - 0.28, 0.76, z + 4, z + 7, 'walnut')
    s.meta['surface_z'] = DESK_Z

def globe(s, frame=0):
    s.shadow(ellipse=True, rx=13)
    with s.part(outline=C['void']):
        s.ell(0.5, 0.5, 0, 11, 'wal_dk'); s.ell(0.5, 0.5, 3, 10, 'wal')
        for dx in (-8, 7):
            s.rect(0.5, 0.5, 0, dx, -24, 2, 22, 'wal')
        s.rect(0.5, 0.5, 0, -1, -22, 2, 19, 'wal')
    with s.part(outline=C['brass_shd']):
        s.ell(0.5, 0.5, 38, 13, 'cream', ry=13)
    with s.part():
        s.ell(0.5, 0.5, 38, 10, 'gallery', ry=10, dx=-2, dy=-2)
        s.ell(0.5, 0.5, 38, 5, 'tan', ry=4, dx=-4, dy=-5); s.ell(0.5, 0.5, 38, 4, 'tan', ry=5, dx=4, dy=4)
        s.ell(0.5, 0.5, 38, 3, 'wal_lt', ry=2, dx=6, dy=-3)
        s.rect(0.5, 0.5, 38, -13, 0, 27, 1, 'brass')
        s.rect(0.5, 0.5, 38, -6, -8, 1, 1, 'paper')

def ladder(s, frame=0):
    """library ladder leaning back against a shelf / wall (top at local b ~0.25)."""
    s.shadow(inset=0.25)
    with s.part(outline=C['void']):
        for a in (0.24, 0.7):
            for k in range(0, 90, 2):
                bb = 0.9 - k * (0.62 / 90)
                s.box(a, bb - 0.03, a + 0.06, bb + 0.03, k, k + 2.0, 'walnut')
        for k in range(8, 90, 12):
            bb = 0.9 - k * (0.62 / 90)
            s.box(0.3, bb - 0.02, 0.7, bb + 0.02, k, k + 2, 'walnut')
    with s.part():
        s.top(0.23, 0.25, 0.31, 0.31, 90, 'brass_lt'); s.top(0.69, 0.25, 0.77, 0.31, 90, 'brass_lt')

def floor_lamp(s, frame=0):
    s.shadow(ellipse=True, rx=9)
    with s.part(outline=C['void']):
        s.ell(0.5, 0.5, 0, 7, 'brass_shd'); s.ell(0.5, 0.5, 1, 6, 'brass')
        s.rect(0.5, 0.5, 0, 0, -62, 1, 62, 'brass')
        s.poly(0.5, 0.5, 0, [(-7, -78), (8, -78), (12, -62), (-11, -62)], C['gallery'])
        s.poly(0.5, 0.5, 0, [(1, -78), (8, -78), (12, -62), (1, -62)], C['gallery_mid'])
    with s.part():
        s.rect(0.5, 0.5, 0, -10, -62, 22, 1, 'glow'); s.rect(0.5, 0.5, 0, -7, -78, 15, 1, 'brass')
    s.glow_ell(0.5, 0.5, 0, 13, 'glow', 60, ry=9, dy=-68)

# ================================================================ lounge
def coffee_table(s, frame=0):
    W = s.W
    s.shadow()
    with s.part(outline=C['wal_dk']):
        for a, b in ((0.14, 0.2), (W - 0.22, 0.2), (0.14, 0.72), (W - 0.22, 0.72)):
            s.box(a, b, a + 0.08, b + 0.08, 0, 11, 'walnut')
        s.box(0.08, 0.14, W - 0.08, 0.86, 11, 14, 'walnut')
    with s.part():
        s.face('front', 0.86, 0.08, W - 0.08, 12, 13, 'brass')
    with s.part(outline=C['gallery_dk']):
        s.box(0.3, 0.32, 0.75, 0.62, 14, 17, 'cream')
    mug(s, W - 0.4, 0.45, 14)
    s.meta['surface_z'] = 14

def pingpong(s, frame=0):
    """3x2 table, long axis = local a. play points at both short ends."""
    W, D = s.W, s.D
    s.shadow()
    with s.part(outline=C['void']):
        for a, b in ((0.3, 0.3), (W - 0.38, 0.3), (0.3, D - 0.38), (W - 0.38, D - 0.38)):
            s.box(a, b, a + 0.08, b + 0.08, 0, 22, 'metal_d')
        s.box(0.05, 0.1, W - 0.05, D - 0.1, 22, 26, 'plum')
    with s.part():
        s.top(0.05, 0.1, W - 0.05, D - 0.1, 26, 'plum_dk')
        s.top(0.1, 0.15, W - 0.1, D - 0.15, 26, 'plum')
        s.top(0.1, D / 2 - 0.02, W - 0.1, D / 2 + 0.02, 26, 'paper')
        s.top(0.06, 0.11, 0.1, D - 0.11, 26, 'paper'); s.top(W - 0.1, 0.11, W - 0.06, D - 0.11, 26, 'paper')
        s.top(0.06, 0.11, W - 0.06, 0.15, 26, 'paper'); s.top(0.06, D - 0.15, W - 0.06, D - 0.11, 26, 'paper')
    with s.part(outline=C['void']):
        s.box(W / 2 - 0.03, 0.0, W / 2 + 0.03, D, 26, 34, 'metal')
    with s.part():
        for k in range(1, 8):
            s.face('front', D, W / 2 - 0.03, W / 2 + 0.03, 26 + k, 26 + k + 0.5, 'grey') if False else None
    with s.part(outline=C['void']):
        s.box(0.45, 0.5, 0.62, 0.68, 26, 27, 'oxblood')
    with s.part():
        s.ell(W - 0.7, D / 2 + 0.3, 27, 2, 'paper')
    s.meta['use'] = [{'local': (-0.5, D / 2), 'face': 'right'}, {'local': (W + 0.5, D / 2), 'face': 'left'}]

def coffee_machine(s, a, b, z, frame=0):
    with s.part(outline=C['void']):
        s.box(a - 0.26, b - 0.22, a + 0.26, b + 0.2, z, z + 30, 'night')
        s.box(a - 0.26, b - 0.22, a + 0.26, b + 0.2, z + 30, z + 34, 'metal_d')
    with s.part():
        s.face('front', b + 0.2, a - 0.19, a + 0.19, z + 4, z + 16, 'floor_dk')
        s.face('front', b + 0.2, a - 0.21, a + 0.21, z + 21, z + 22, 'brass')
        s.face('front', b + 0.2, a - 0.16, a - 0.06, z + 24, z + 27, 'steel_lt')
        s.face('front', b + 0.2, a + 0.06, a + 0.14, z + 24, z + 27, 'glow')
    s.glow_face('front', b + 0.2, a + 0.06, a + 0.14, z + 24, z + 27, 'glow', 90)
    mug(s, a, b + 0.1, z + 3)
    pts = [[(0, 0), (1, -2), (0, -4), (-1, -6), (0, -8)], [(1, 0), (0, -2), (1, -4), (0, -7), (1, -9)],
           [(0, -1), (-1, -3), (0, -5), (1, -7), (0, -10)]][frame % 3]
    with s.part():
        for i, (dx, dy) in enumerate(pts):
            s.rect(a + 0.05, b + 0.1, z + 34, dx, dy, 1, 2, 'paper' if i < 3 else 'grey')

def coffee_counter(s, frame=0):
    W = s.W
    s.shadow()
    CZ = 36
    with s.part(outline=C['void']):
        s.box(0.05, 0.12, W - 0.05, 0.92, 0, CZ - 4, 'walnut')
        s.box(0, 0.06, W, 0.96, CZ - 4, CZ, 'stone')
    with s.part():
        if vis(s, 'front'):
            for i in range(W * 2):
                u0 = 0.1 + i * 0.5
                s.face('front', 0.92, u0, u0 + 0.36, 4, CZ - 8, 'walnut')
                s.face('front', 0.92, u0, u0 + 0.36, CZ - 9, CZ - 8, 'wal_dk')
                s.face('front', 0.92, u0 + 0.15, u0 + 0.21, CZ - 12, CZ - 11, 'brass')
    coffee_machine(s, 0.5, 0.42, CZ, frame)
    for k, a in enumerate((1.15, 1.4)):
        mug(s, a, 0.55 + 0.1 * k, CZ)
    with s.part(outline=C['void']):
        s.cyl(1.72, 0.32, CZ, CZ + 11, 5, 'cream')
    with s.part():
        s.ell(1.72, 0.32, CZ + 11, 4, 'wal_dk')
    s.meta['use'] = [{'local': (0.5, 1.5), 'face': 'back'}]
    s.meta['surface_z'] = CZ

def prop_coffee_machine(s, frame=0): coffee_machine(s, 0.5, 0.5, 0, frame)

def pot(s, a, b, z, rx, h, m='walnut'):
    with s.part(outline=C['void']):
        s.cyl(a, b, z, z + h, rx, m)
    with s.part():
        s.ell(a, b, z + h, rx - 1, 'wal_dk')
        s.rect(a, b, z + h, -rx, 2, 2 * rx, 1, C[M[m][2]])

def leaves(s, a, b, z, blobs):
    with s.part(outline=C['void']):
        for dx, dy, r, col in blobs:
            s.ell(a, b, z, r, col, ry=r * 0.8, dx=dx, dy=dy)

def plant_palm(s, frame=0):
    s.shadow(ellipse=True, rx=14)
    pot(s, 0.5, 0.5, 0, 11, 18, 'stone')
    with s.part(outline=C['void']):
        s.rect(0.5, 0.5, 18, -1, -30, 3, 30, 'wal')
        fronds = [(-24, -18), (24, -18), (-18, -44), (18, -44), (0, -56), (-28, -32), (28, -32), (-10, -12), (11, -12), (-8, -52), (9, -50)]
        for x1, y1 in fronds:
            x0, y0 = 0, -32; n = 16
            for i in range(n + 1):
                t = i / n; x = x0 + (x1 - x0) * t; y = y0 + (y1 - y0) * t - 8 * t * (1 - t)
                w = 4 if i < n - 4 else 2
                col = C['baize_lt'] if x1 < -2 else (C['baize'] if abs(x1) <= 10 else C['baize_dk'])
                s.rect(0.5, 0.5, 18, int(round(x)) - w // 2, int(round(y)) - 1, w, 3, col)
    with s.part():
        s.rect(0.5, 0.5, 18, -9, -48, 1, 1, 'baize_lt'); s.rect(0.5, 0.5, 18, -1, -55, 1, 1, 'baize_lt')

def plant_bush(s, frame=0):
    s.shadow(ellipse=True, rx=14)
    pot(s, 0.5, 0.5, 0, 11, 14, 'walnut')
    leaves(s, 0.5, 0.5, 14, [(0, -14, 14, 'baize_dk'), (-6, -18, 10, 'baize'), (6, -12, 9, 'baize_dk'),
                              (-2, -26, 9, 'baize'), (-8, -26, 6, 'baize_lt'), (-10, -14, 6, 'baize_lt'), (7, -23, 6, 'baize')])

def plant_snake(s, frame=0):
    s.shadow(ellipse=True, rx=12)
    pot(s, 0.5, 0.5, 0, 9, 16, 'cream')
    with s.part(outline=C['void']):
        for dx, h, col in ((-6, 32, 'baize_lt'), (-2, 44, 'baize'), (2, 38, 'baize_dk'), (6, 26, 'baize_dk'), (-8, 20, 'baize')):
            s.poly(0.5, 0.5, 16, [(dx - 2, -1), (dx + 2, -1), (dx + 2, -h + 4), (dx, -h), (dx - 2, -h + 4)], C[col])
    with s.part():
        s.rect(0.5, 0.5, 16, -2, -38, 1, 6, 'gallery_mid')

def plant_small(s, frame=0):
    with s.part(outline=C['void']):
        s.cyl(0.5, 0.5, 0, 7, 4, 'cream')
    leaves(s, 0.5, 0.5, 7, [(0, -4, 6, 'baize_dk'), (-2, -7, 4, 'baize'), (-3, -8, 3, 'baize_lt')])

def plant_tall(s, frame=0):
    s.shadow(ellipse=True, rx=13)
    pot(s, 0.5, 0.5, 0, 10, 18, 'night')
    with s.part(outline=C['void']):
        s.rect(0.5, 0.5, 18, 0, -50, 2, 50, 'wal')
        for dx, dy, side in ((-8, -14, 0), (9, -22, 1), (-8, -32, 0), (9, -40, 1), (-6, -50, 0), (5, -58, 1), (0, -64, 0)):
            s.ell(0.5, 0.5, 18, 7, 'baize_lt' if side == 0 else 'baize_dk', ry=5, dx=dx, dy=dy)
            s.ell(0.5, 0.5, 18, 3, 'baize', ry=2, dx=dx + (1 if side == 0 else -1), dy=dy + 1)

# ================================================================ coordination
def meeting_table(s, frame=0):
    W, D = s.W, s.D
    s.shadow()
    with s.part(outline=C['wal_dk']):
        s.box(W / 2 - 0.5, D / 2 - 0.25, W / 2 + 0.5, D / 2 + 0.25, 0, 4, 'walnut')
        s.box(W / 2 - 0.16, D / 2 - 0.1, W / 2 + 0.16, D / 2 + 0.1, 4, DESK_Z - 4, 'walnut')
        s.box(0.06, 0.08, W - 0.06, D - 0.08, DESK_Z - 4, DESK_Z, 'walnut')
    with s.part():
        s.top(0.3, 0.3, W - 0.3, D - 0.3, DESK_Z, 'steel_dk')
        s.top(0.34, 0.34, W - 0.34, D - 0.34, DESK_Z, 'steel')
        s.face('front', D - 0.08, 0.06, W - 0.06, DESK_Z - 3, DESK_Z - 2, 'brass')
    with s.part(outline=C['gallery_dk']):
        s.box(0.6, 0.5, 0.92, 0.76, DESK_Z, DESK_Z + 2, 'paper'); s.box(W - 1.0, D - 0.85, W - 0.64, D - 0.55, DESK_Z, DESK_Z + 2, 'paper')
    mug(s, W - 0.5, 0.45, DESK_Z)
    with s.part(outline=C['void']):
        s.box(W / 2 - 0.12, D / 2 - 0.08, W / 2 + 0.12, D / 2 + 0.08, DESK_Z, DESK_Z + 3, 'night')
    with s.part():
        s.top(W / 2 - 0.08, D / 2 - 0.05, W / 2 + 0.08, D / 2 + 0.05, DESK_Z + 3, 'steel_lt')
    s.meta['surface_z'] = DESK_Z

def board_face(s, b, a0, a1, z0, z1, kind):
    if kind == 'white':
        s.face('front', b, a0, a1, z0, z1, 'paper')
        for k, (w, col) in enumerate(((0.8, 'steel'), (0.6, 'steel'), (0.7, 'wall_top'), (0.5, 'wall_top'))):
            s.face('front', b, a0 + 0.1, min(a1 - 0.1, a0 + 0.1 + w), z1 - 6 - k * 5, z1 - 5 - k * 5, col)
        for k, h in enumerate((7, 12, 9, 15)):
            s.face('front', b, a1 - 0.7 + k * 0.13, a1 - 0.62 + k * 0.13, z0 + 5, z0 + 5 + h, 'steel_lt' if k != 3 else 'steel')
        s.face('front', b, a1 - 0.75, a1 - 0.15, z0 + 4, z0 + 5, 'steel')
    elif kind == 'tv':
        s.face('front', b, a0, a1, z0, z1, 'floor_dk')
        s.face('front', b, a0 + 0.05, a1 - 0.05, z0 + 2, z1 - 2, 'steel_dk')
        for k, h in enumerate((7, 12, 9, 16, 12)):
            s.face('front', b, a0 + 0.18 + k * 0.16, a0 + 0.29 + k * 0.16, z0 + 4, z0 + 4 + h, 'steel_lt')
        s.face('front', b, a1 - 0.62, a1 - 0.18, z1 - 7, z1 - 6, 'paper')
        s.face('front', b, a1 - 0.62, a1 - 0.36, z1 - 10, z1 - 9, 'grey')
        s.face('front', b, a1 - 0.13, a1 - 0.1, z1 - 5, z1 - 4, 'paper')
        s.glow_face('front', b, a0 + 0.05, a1 - 0.05, z0 + 2, z1 - 2, 'steel', 60)
    elif kind == 'cork':
        s.face('front', b, a0, a1, z0, z1, 'tan')
        notes = [(0.08, 8, 12, 'paper'), (0.45, 12, 10, 'gallery'), (0.85, 5, 14, 'paper'), (1.25, 10, 11, 'cream'),
                 (0.25, 26, 9, 'gallery'), (1.0, 27, 8, 'paper'), (1.5, 24, 10, 'paper')]
        for u, zz, hh, col in notes:
            if a0 + u + 0.3 > a1 or z0 + zz + hh > z1 - 1: continue
            s.face('front', b, a0 + u, a0 + u + 0.3, z0 + zz, z0 + zz + hh, col)
            s.face('front', b, a0 + u + 0.13, a0 + u + 0.17, z0 + zz + hh - 2, z0 + zz + hh - 1, 'ember' if u < 0.6 else 'steel')
            s.face('front', b, a0 + u + 0.05, a0 + u + 0.24, z0 + zz + 4, z0 + zz + 5, 'grey')
            s.face('front', b, a0 + u + 0.05, a0 + u + 0.18, z0 + zz + 2, z0 + zz + 3, 'grey')

def wall_board(s, kind='white', z0=36, h=44, frame_m='metal'):
    W = s.W
    with s.part(outline=C['void']):
        s.box(0.04, 0, W - 0.04, 0.06, z0, z0 + h, frame_m)
    with s.part():
        board_face(s, 0.06, 0.08, W - 0.08, z0 + 2, z0 + h - 2, kind)
        s.face('front', 0.06, 0.04, W - 0.04, z0, z0 + 1, C[M[frame_m][2]])         # return edge (bottom)
    if kind == 'white':
        with s.part(outline=C['void']):
            s.box(0.25, 0.06, W - 0.25, 0.14, z0 - 2, z0, 'metal_d')
        with s.part():
            s.top(0.4, 0.07, 0.52, 0.12, z0, 'steel'); s.top(0.62, 0.07, 0.72, 0.12, z0, 'oxblood')
    s.meta['wall_z'] = (z0, z0 + h)

def whiteboard_wall(s, frame=0): wall_board(s, 'white', 34, 46)
def tv_wall(s, frame=0): wall_board(s, 'tv', 40, 38, 'night')
def notice_board_wall(s, frame=0): wall_board(s, 'cork', 36, 44, 'walnut')

def board_stand(s, kind='white', fm='metal'):
    W = s.W
    s.shadow(inset=0.2)
    with s.part(outline=C['void']):
        for a in (0.14, W - 0.2):
            s.box(a, 0.25, a + 0.06, 0.75, 0, 3, fm)
            s.box(a, 0.47, a + 0.06, 0.53, 3, 40, fm)
        s.box(0.06, 0.45, W - 0.06, 0.55, 34, 80, fm)
    with s.part():
        if vis(s, 'front'):
            board_face(s, 0.55, 0.1, W - 0.1, 36, 78, kind)
        else:
            s.face('back', 0.45, 0.1, W - 0.1, 37, 77, C[M[fm][2]])
            s.face('back', 0.45, 0.1, W - 0.1, 56, 57, C[M[fm][1]])
    s.meta['use'] = [{'local': (W / 2, 1.5), 'face': 'back'}]

def whiteboard_stand(s, frame=0): board_stand(s, 'white')
def notice_board_stand(s, frame=0): board_stand(s, 'cork', 'walnut')

def tv_stand(s, frame=0):
    W = s.W
    s.shadow()
    with s.part(outline=C['void']):
        s.box(0.05, 0.25, W - 0.05, 0.85, 0, 18, 'walnut')
    with s.part():
        if vis(s, 'front'):
            for i in range(W):
                s.face('front', 0.85, 0.1 + i * (W - 0.1) / W, (i + 1) * (W - 0.1) / W, 3, 15, 'wal_dk')
                s.face('front', 0.85, (i + 0.45) * (W - 0.1) / W, (i + 0.55) * (W - 0.1) / W, 9, 10, 'brass')
    with s.part(outline=C['void']):
        s.box(W / 2 - 0.22, 0.45, W / 2 + 0.22, 0.6, 18, 20, 'night')
        s.box(W / 2 - 0.04, 0.5, W / 2 + 0.04, 0.55, 20, 28, 'night')
        s.box(0.08, 0.48, W - 0.08, 0.56, 28, 64, 'night')
    with s.part():
        if vis(s, 'front'):
            board_face(s, 0.56, 0.12, W - 0.12, 30, 62, 'tv')
        else:
            s.face('back', 0.48, 0.3, W - 0.3, 38, 54, 'wall_shd')

# ================================================================ gallery
def art(s, b, a0, a1, z0, z1, seed):
    rnd = random.Random(seed)
    s.face('front', b, a0, a1, z0, z1, rnd.choice(['floor_lt', 'wall_shd', 'cream', 'steel_dk']))
    for i in range(rnd.randint(2, 4)):
        u = rnd.uniform(a0, a1 - 0.15); w = rnd.uniform(0.08, (a1 - a0) * 0.5)
        zz = rnd.randint(int(z0), int(z1) - 3); hh = rnd.randint(2, max(3, int(z1 - z0) // 2))
        s.face('front', b, u, min(a1, u + w), zz, min(z1, zz + hh),
               rnd.choice(['oxblood', 'brass', 'steel', 'paper', 'plum', 'baize', 'ember_dk', 'gallery_mid']))
    s.face('front', b, a0, a1, z0, z0 + 2, rnd.choice(['wall_shd', 'wal', 'gallery_dk']))

def frame_wall(s, w, z0, h, seed, empty=False, ret=2):
    """thin brass frame. return edge (`ret` px) at the bottom + 1px cast shadow (AD review fix)."""
    W = s.W; a0 = (W - w) / 2
    with s.part(outline=C['void']):
        s.box(a0, 0, a0 + w, 0.05, z0, z0 + h, 'brass')
    with s.part():
        if empty: s.face('front', 0.05, a0 + 0.06, a0 + w - 0.06, z0 + 2, z0 + h - 2, 'floor_dk')
        else: art(s, 0.05, a0 + 0.06, a0 + w - 0.06, z0 + 2, z0 + h - 2, seed)
        s.face('front', 0.05, a0 + 0.06, a0 + w - 0.06, z0 + h - 2, z0 + h - 1, 'brass_lt')
        s.face('front', 0.05, a0, a0 + w, z0, z0 + ret, 'brass_shd')                 # bottom return
    # cast shadow on the wall, below the frame (void @40%)
    from iso import SX, SY, OX, OY
    m = s.mask_plane('y' if vis(s, 'front') and s.Rv(0, 1)[1] > 0 else 'x', 0,
                     *(sorted([s.T(a0 + 0.03, 0)[0 if s.Rv(0, 1)[1] > 0 else 1], s.T(a0 + w + 0.03, 0)[0 if s.Rv(0, 1)[1] > 0 else 1]])), z0 - 1, z0)
    s.sh[m] = (*C['void'][:3], 102)
    s.meta['picture_local'] = (a0 + 0.06, a0 + w - 0.06, z0 + 2, z0 + h - 2, 0.05)
    s.meta['wall_z'] = (z0, z0 + h)

def frame_small(s, frame=0, empty=False): frame_wall(s, 0.62, 52, 22, 11, empty, ret=1)
def frame_medium(s, frame=0, empty=False): frame_wall(s, 1.0, 46, 30, 12, empty)
def frame_large(s, frame=0, empty=False): frame_wall(s, 1.8, 40, 42, 13, empty)
def frame_portrait(s, frame=0, empty=False): frame_wall(s, 0.62, 38, 46, 14, empty)

def picture_light(s, frame=0):
    with s.part(outline=C['void']):
        s.box(0.47, 0, 0.53, 0.04, 86, 90, 'brass')
        s.box(0.48, 0.04, 0.52, 0.2, 88, 89, 'brass')
        s.box(0.4, 0.16, 0.6, 0.24, 85, 88, 'brass')
    with s.part():
        s.face('front', 0.24, 0.42, 0.58, 85, 86, 'glow')
    # cone of light on the wall below (glow layer)
    s.glow_face('front', 0.02, 0.2, 0.8, 40, 84, 'glow', 40)
    s.meta['wall_z'] = (84, 90)

def easel(s, frame=0):
    s.shadow(inset=0.2)
    with s.part(outline=C['void']):
        for k in range(0, 70, 2):
            for a in (0.28 + k * 0.0025, 0.72 - k * 0.0025):
                s.box(a - 0.03, 0.62 - k * 0.003, a + 0.03, 0.68 - k * 0.003, k, k + 2, 'walnut')
        for k in range(0, 66, 2):
            s.box(0.48, 0.22 + k * 0.004, 0.54, 0.27 + k * 0.004, 66 - k, 68 - k, 'walnut')
        s.box(0.2, 0.48, 0.8, 0.6, 24, 27, 'walnut')
    with s.part(outline=C['void']):
        s.box(0.18, 0.47, 0.82, 0.51, 27, 66, 'cream')
    with s.part():
        if vis(s, 'front'): art(s, 0.51, 0.22, 0.78, 29, 64, 21)
        else: s.face('back', 0.47, 0.2, 0.8, 28, 65, 'wal_lt')

def pedestal(s, frame=0, piece='bust'):
    s.shadow(inset=0.18)
    with s.part(outline=C['void']):
        s.box(0.2, 0.2, 0.8, 0.8, 0, 4, 'gallery')
        s.box(0.25, 0.25, 0.75, 0.75, 4, 40, 'gallery')
        s.box(0.2, 0.2, 0.8, 0.8, 40, 43, 'gallery')
    with s.part():
        s.face('front', 0.75, 0.38, 0.62, 16, 19, 'brass')     # plaque
    with s.part(outline=C['void']):
        if piece == 'bust':
            s.cyl(0.5, 0.5, 43, 47, 7, 'stone')
            s.ell(0.5, 0.5, 60, 9, 'stone', ry=11)
            s.ell(0.5, 0.5, 60, 6, 'grey', ry=8, dx=-2, dy=-3)
            s.rect(0.5, 0.5, 60, 4, -4, 4, 10, 'wall_top')
        else:
            s.poly(0.5, 0.5, 43, [(-8, 0), (8, 0), (3, -14), (9, -30), (-1, -19), (-7, -32)], C['brass'])
            s.poly(0.5, 0.5, 43, [(1, 0), (8, 0), (3, -14), (9, -30), (1, -16)], C['brass_shd'])
            s.rect(0.5, 0.5, 43, -6, -27, 1, 2, 'glow')
    s.meta['use'] = [{'local': (0.5, 1.5), 'face': 'back'}]

def pedestal_sculpt(s, frame=0): pedestal(s, piece='twist')

# ================================================================ sharing room
FIRE = [[-12, -22, -14, -17, -18], [-15, -19, -16, -21, -14], [-13, -24, -12, -18, -20],
        [-16, -20, -15, -15, -21], [-12, -25, -16, -20, -17], [-15, -21, -13, -17, -23]]
def campfire(s, frame=0):
    s.shadow(ellipse=True, rx=28)
    with s.part(outline=C['void']):
        for k in range(12):
            t = k / 12 * 2 * math.pi
            dx, dy = round(math.cos(t) * 20), round(math.sin(t) * 10)
            col = 'grey' if dy < -2 else ('wall_top' if dy < 6 else 'wall_lit')
            s.ell(0.5, 0.5, 0, 5, col, ry=3.5, dx=dx, dy=dy - 1)
    with s.part():
        s.ell(0.5, 0.5, 0, 15, 'void', ry=7); s.ell(0.5, 0.5, 0, 12, 'ember_dk', ry=5)
    with s.part(outline=C['void']):
        s.poly(0.5, 0.5, 0, [(-13, -3), (8, 4), (10, 1), (-11, -6)], C['wal'])
        s.poly(0.5, 0.5, 0, [(13, -3), (-8, 4), (-10, 1), (11, -6)], C['wal_dk'])
    with s.part():
        s.rect(0.5, 0.5, 0, -12, -6, 3, 1, 'wal_lt')
    fl = FIRE[frame % 6]; xs = (-7, 0, 7, -3, 4)
    with s.part():
        for dx, h in zip(xs, fl):
            w = 5 if dx == 0 else 4
            s.poly(0.5, 0.5, 0, [(dx - w, -1), (dx + w, -1), (dx + 1, h), (dx, h - 3)], C['ember'])
        for dx, h in list(zip(xs, fl))[:3]:
            s.poly(0.5, 0.5, 0, [(dx - 3, -1), (dx + 3, -1), (dx, h + 7)], C['brass_lt'])
        s.poly(0.5, 0.5, 0, [(-2, -1), (3, -1), (0, fl[1] + 12)], C['glow'])
        sp = [(-9, -30), (8, -32), (3, -36), (-4, -33), (10, -28), (-7, -38)]
        x, y = sp[frame % 6]; s.rect(0.5, 0.5, 0, x, y, 1, 1, 'glow')
        x, y = sp[(frame + 3) % 6]; s.rect(0.5, 0.5, 0, x, y + 3, 1, 1, 'ember')
    s.glow_ell(0.5, 0.5, 0, 20 + (frame % 3), 'ember', 70, ry=16, dy=-14)
    s.glow_ell(0.5, 0.5, 0, 9, 'glow', 80, ry=9, dy=-10)

def beanbag(s, frame=0, m='oxblood'):
    s.shadow(ellipse=True, rx=20)
    t, l, r = mat(m)
    with s.part(outline=C['void']):
        s.ell(0.5, 0.5, 0, 20, r, ry=11, dy=-5)
        s.ell(0.5, 0.5, 0, 17, l, ry=10, dx=-3, dy=-8)
        s.ell(0.5, 0.5, 0, 14, l, ry=7, dx=0, dy=-12)
        s.ell(0.5, 0.5, 0, 12, t, ry=6, dx=-2, dy=-13)
    with s.part(outline=C['void'], layer=lay_if(s, 'back')):
        bx, by = s.Rv(0, -1)            # back puff sits on the local back side
        s.ell(0.5, 0.5, 0, 11, r, ry=8, dx=int(bx * 8 - by * 8), dy=-20 + int((bx + by) * 3))
        s.ell(0.5, 0.5, 0, 8, l, ry=5, dx=int(bx * 8 - by * 8) - 2, dy=-22 + int((bx + by) * 3))
    with s.part():
        s.ell(0.5, 0.5, 0, 6, t, ry=2, dx=-5, dy=-14)
    s.meta['seats'] = [{'local': (0.5, 0.5), 'face': 'front', 'seat_z': 14}]

def floor_cushion(s, frame=0, m='plum'):
    s.shadow(inset=0.14)
    with s.part(outline=C['void']):
        s.box(0.16, 0.16, 0.84, 0.84, 0, 6, m)
    with s.part():
        s.top(0.22, 0.22, 0.78, 0.78, 6, C[M[m][1]])
        s.top(0.26, 0.26, 0.74, 0.74, 6, C[M[m][0]])
        s.top(0.48, 0.48, 0.52, 0.52, 6, C[M[m][2]])
    s.meta['seats'] = [{'local': (0.5, 0.5), 'face': 'front', 'seat_z': 6}]

# ================================================================ misc wall items
def clock(s, frame=0):
    with s.part(outline=C['void']):
        s.box(0.3, 0, 0.7, 0.05, 70, 88, 'brass')
    with s.part():
        s.face('front', 0.05, 0.34, 0.66, 71, 87, 'paper')
        s.face('front', 0.05, 0.49, 0.52, 79, 86, 'void'); s.face('front', 0.05, 0.5, 0.62, 78, 79, 'void')
        for u, z in ((0.5, 85), (0.5, 72), (0.37, 79), (0.63, 79)):
            s.face('front', 0.05, u - 0.01, u + 0.02, z, z + 1, 'grey')
        s.face('front', 0.05, 0.3, 0.7, 70, 71, 'brass_shd')
    s.meta['wall_z'] = (70, 88)

def poster(s, frame=0):
    with s.part(outline=C['void']):
        s.box(0.15, 0, 0.85, 0.03, 36, 86, 'night')
    with s.part():
        s.face('front', 0.03, 0.2, 0.8, 40, 82, 'steel')
        s.face('front', 0.03, 0.2, 0.8, 40, 54, 'floor_lt')
        for k, h in enumerate((8, 16, 12, 20, 13)):
            s.face('front', 0.03, 0.24 + k * 0.1, 0.31 + k * 0.1, 48, 48 + h, 'wall_lit' if k % 2 else 'wall_shd')
        s.face('front', 0.03, 0.55, 0.7, 70, 78, 'glow')
        s.face('front', 0.03, 0.24, 0.6, 42, 43, 'paper'); s.face('front', 0.03, 0.24, 0.45, 45, 46, 'paper')
    s.meta['wall_z'] = (36, 86)

def window_wall(s, frame=0):
    """wall-mounted window (overlay for a plain wall segment), W tiles wide."""
    W = s.W; z0, h = 32, 52
    with s.part(outline=C['void']):
        s.box(0.08, 0, W - 0.08, 0.06, z0, z0 + h, 'metal_d')
        s.box(0.04, 0, W - 0.04, 0.16, z0 - 3, z0, 'wall')
    with s.part():
        s.face('front', 0.06, 0.14, W - 0.14, z0 + 3, z0 + h - 3, 'floor_dk')
        rnd = random.Random(4 + W)
        for k in range(int(W * 3)):
            u = 0.18 + k * 0.32
            if u + 0.22 < W - 0.14: s.face('front', 0.06, u, u + 0.22, z0 + 3, z0 + 3 + rnd.randint(8, 18), 'floor_lt')
        for i in range(int(W * 9)):
            u = rnd.uniform(0.18, W - 0.2); zz = rnd.randint(z0 + 5, z0 + 22)
            s.face('front', 0.06, u, u + 0.03, zz, zz + 1, rnd.choice(['steel_dk', 'wall_shd', 'glow', 'steel_dk']))
        s.face('front', 0.06, 0.3, 0.37, z0 + h - 16, z0 + h - 6, 'steel_dk')
        s.face('front', 0.06, 0.4, 0.43, z0 + h - 14, z0 + h - 7, 'steel_dk')
        s.face('front', 0.06, 0.3, 0.33, z0 + h - 7, z0 + h - 6, 'paper')
        s.face('front', 0.06, W / 2 - 0.03, W / 2 + 0.03, z0 + 3, z0 + h - 3, 'metal_d')
        s.face('front', 0.06, 0.14, W - 0.14, z0 + h // 2, z0 + h // 2 + 1, 'grey')
    s.meta['wall_z'] = (z0 - 3, z0 + h)

def picture_none(s, frame=0): pass

# ================================================================ walls / partitions / floors
WT = 0.125   # back-wall thickness (tiles), built OUTSIDE the room edge
WALL_H = 96

def wall_skin(skin):
    return {'night': ('wall', 'wall_shd', 'floor_lt'), 'gallery': ('gallery', 'gallery_dk', 'gallery_mid'),
            'library': ('wall', 'wal_dk', 'wal')}[skin]

def wall_seg(s, frame=0, side='R', kind='plain', skin='night', H=WALL_H):
    """1-tile back-wall segment, WORLD coords. R: along +c at r=0, inner face looks +r (sw) = lit.
    L: along +r at c=0, inner face looks +c (se) = shadow side."""
    m, base_c, wain = wall_skin(skin)
    mm = mat(m)
    with s.part():
        if side == 'R': s.wbox(0, -WT, 1, 0, 0, H, mm)
        else: s.wbox(-WT, 0, 0, 1, 0, H, mm)
    pl = 'y' if side == 'R' else 'x'
    def F(u0, u1, v0, v1, col, layer='base'):
        with s.part(layer=layer):
            s._put(s.mask_plane(pl, 0, u0, u1, v0, v1), C[col] if isinstance(col, str) else col)
    F(0, 1, 0, 5, base_c)                                 # skirting
    if skin == 'library':
        F(0, 1, 5, 40, wain); F(0, 1, 40, 41, 'brass')
    elif skin == 'night':
        F(0, 1, 44, 45, 'wall_shd' if side == 'R' else 'floor_lt')      # dado line
    if kind == 'window':
        z0, z1 = 34, 84
        F(0.12, 0.88, z0, z1, 'void'); F(0.16, 0.84, z0 + 3, z1 - 3, 'floor_dk')
        rnd = random.Random(9 if side == 'R' else 10)
        F(0.2, 0.42, z0 + 3, z0 + 16, 'floor_lt'); F(0.55, 0.74, z0 + 3, z0 + 11, 'floor_lt')
        for i in range(9):
            u = rnd.uniform(0.18, 0.8); zz = rnd.randint(z0 + 5, z0 + 24)
            F(u, u + 0.03, zz, zz + 1, rnd.choice(['steel_dk', 'glow', 'wall_shd']))
        F(0.27, 0.31, z1 - 16, z1 - 5, 'steel_dk'); F(0.33, 0.35, z1 - 12, z1 - 5, 'steel_dk'); F(0.27, 0.3, z1 - 6, z1 - 5, 'paper')
        F(0.48, 0.52, z0 + 3, z1 - 3, 'wall_top'); F(0.16, 0.84, 60, 61, 'grey')
        F(0.1, 0.9, z0 - 3, z0, 'wall_top')
    if kind in ('door', 'doorway', 'door_open'):
        F(0.14, 0.86, 0, 92, 'wall_top')
        F(0.18, 0.82, 0, 89, 'void')
        if kind == 'door':
            F(0.18, 0.82, 0, 89, 'wal'); F(0.18, 0.82, 0, 1, 'wal_dk')
            for z0, z1 in ((8, 40), (48, 82)):
                F(0.25, 0.75, z0, z1, 'wal_lt' if side == 'R' else 'wal'); F(0.25, 0.75, z0, z0 + 1, 'wal_dk')
            # brass handles on BOTH sides of the leaf -> survives mirroring
            F(0.68, 0.74, 42, 45, 'brass'); F(0.26, 0.32, 42, 45, 'brass')
        if kind == 'door_open':
            with s.part(outline=C['void'], layer='front'):
                if side == 'R': s.wbox(0.14, 0.0, 0.2, 0.62, 0, 89, mat('walnut'))
                else: s.wbox(0.0, 0.14, 0.62, 0.2, 0, 89, mat('walnut'))
            with s.part(layer='front'):
                if side == 'R': s._put(s.mask_plane('x', 0.2, 0.46, 0.52, 42, 45), C['brass'])
                else: s._put(s.mask_plane('y', 0.2, 0.46, 0.52, 42, 45), C['brass'])

def wall_corner(s, frame=0, skin='night', H=WALL_H):
    with s.part():
        s.wbox(-WT, -WT, 0, 0, 0, H, mat(wall_skin(skin)[0]))

def wall_cap(s, frame=0, side='R', skin='night', H=WALL_H):
    """closes the open front end of a back wall: R at (C,0), L at (0,R)."""
    with s.part():
        if side == 'R': s.wbox(0, -WT, WT, 0, 0, H, mat(wall_skin(skin)[0]))
        else: s.wbox(-WT, 0, 0, WT, 0, H, mat(wall_skin(skin)[0]))

def partition(s, frame=0, kind='low'):
    """1-tile interior divider centred in its cell (blocks the cell), runs along local a. 1 height step."""
    t0, t1 = 0.44, 0.56
    if kind == 'low':
        with s.part(outline=C['void']):
            s.box(0, t0, 1, t1, 0, 29, 'wall'); s.box(0, t0 - 0.02, 1, t1 + 0.02, 29, 32, 'walnut')
        with s.part():
            s.face('front', t1, 0, 1, 0, 4, 'floor_lt')
    elif kind == 'glass':
        with s.part(outline=C['void']):
            s.box(0, t0, 1, t1, 0, 12, 'walnut')
            s.box(0, t0 + 0.03, 1, t1 - 0.03, 12, 29, 'steel')
            s.box(0, t0 - 0.02, 1, t1 + 0.02, 29, 32, 'walnut')
        with s.part():
            s.face('front', t1 - 0.03, 0.15, 0.2, 15, 26, 'steel_lt'); s.face('front', t1 - 0.03, 0.23, 0.25, 19, 27, 'steel_lt')
            s.face('front', t1 - 0.03, 0.15, 0.18, 26, 27, 'paper')
            s.face('front', t1, 0, 1, 10, 11, 'brass')
    elif kind == 'doorway':
        with s.part(outline=C['void']):
            s.box(0, t0 - 0.02, 0.1, t1 + 0.02, 0, 36, 'walnut'); s.box(0.9, t0 - 0.02, 1, t1 + 0.02, 0, 36, 'walnut')
        with s.part():
            s.top(0, t0 - 0.02, 0.1, t1 + 0.02, 36, 'brass'); s.top(0.9, t0 - 0.02, 1, t1 + 0.02, 36, 'brass')
    elif kind == 'post':
        with s.part(outline=C['void']):
            s.box(t0 - 0.02, t0 - 0.02, t1 + 0.02, t1 + 0.02, 0, 35, 'walnut')
        with s.part():
            s.top(t0 - 0.02, t0 - 0.02, t1 + 0.02, t1 + 0.02, 35, 'brass')

def partition_low(s, frame=0): partition(s, kind='low')
def partition_glass(s, frame=0): partition(s, kind='glass')
def partition_doorway(s, frame=0): partition(s, kind='doorway')
def partition_post(s, frame=0): partition(s, kind='post')

FLOORS = {   # (a, b, pattern). Navy-based, low-contrast check; accent tint <= 12% (AD in-context review)
    'floor_night': ('floor_dk', 'floor_lt', None),
    'carpet_baize': ('baize_fa', 'baize_fb', None),
    'carpet_plum': ('plum_fa', 'plum_fb', None),
    'carpet_oxblood': ('oxblood_fa', 'oxblood_fb', None),
    'carpet_steel': ('steel_fa', 'steel_fb', None),
    'tile_stone': ('wall_shd', 'wall_lit', 'grout'),
    'wood_walnut': ('wal', 'wal_b', 'planks'),
    'grass': ('baize_dk', 'baize', 'blades'),
    'floor_gallery': ('gallery_fa', 'gallery_fb', None),
}
def floor_tile(s, frame=0, kind='floor_night', var='a'):
    ca, cb, pat = FLOORS[kind]
    with s.part():
        s.top(0, 0, 1, 1, 0, ca if var == 'a' else cb)
        if pat == 'planks':
            for k in range(1, 4):
                s.top(0, k / 4, 1, k / 4 + 1 / 32, 0, 'wal_dk')
            offs = (0.3, 0.75, 0.1, 0.55) if var == 'a' else (0.6, 0.2, 0.85, 0.4)
            for k, o in enumerate(offs):
                s.top(o, k / 4, o + 1 / 32, (k + 1) / 4, 0, 'wal_dk')
            s.top(0.12 if var == 'a' else 0.62, 0.34, 0.24 if var == 'a' else 0.74, 0.34 + 1 / 32, 0, 'wal_lt')
        elif pat == 'grout':
            s.top(0, 0.5 - 1 / 64, 1, 0.5 + 1 / 64, 0, 'floor_lt'); s.top(0.5 - 1 / 32, 0, 0.5 + 1 / 32, 1, 0, 'floor_lt')
        elif pat == 'blades':
            rnd = random.Random(7 if var == 'a' else 8); other = cb if var == 'a' else ca
            for i in range(26):
                a, b = rnd.random() * 0.94, rnd.random() * 0.94
                s.top(a, b, a + 1 / 32, b + 1 / 16, 0, other)
            for i in range(5):
                a, b = rnd.random() * 0.9, rnd.random() * 0.9
                s.top(a, b, a + 1 / 32, b + 1 / 32, 0, 'baize_lt')

def floor_edge(s, frame=0, side='L', depth=12):
    """visual slab side for the open front edges of a room (L = along r, R = along c)."""
    m = mat('wall')
    with s.part():
        if side == 'L':
            s._put(s.mask_plane('y', 1, 0, 1, -depth, 0), m[1]); s._put(s.mask_plane('y', 1, 0, 1, -2, 0), C['wall_top'])
        else:
            s._put(s.mask_plane('x', 1, 0, 1, -depth, 0), m[2]); s._put(s.mask_plane('x', 1, 0, 1, -2, 0), C['wall_lit'])

def rug(s, frame=0, m='plum', border='brass', shape='rect', lift=0):
    W, D = s.W, s.D
    t, l, r = mat(m)
    if lift: r, l = l, t          # lift the value one ramp step (AD polish: lounge rug)
    with s.part():
        if shape == 'round':
            rx = min(W, D) * 32 * 0.9
            for k, col in ((0, r), (4, l), (11, r), (13, l)):
                s.ell(W / 2, D / 2, 0, rx - k, col)
            s.ell(W / 2, D / 2, 0, rx * 0.35, C[border]); s.ell(W / 2, D / 2, 0, rx * 0.35 - 3, r)
            return
        s.top(0.1, 0.1, W - 0.1, D - 0.1, 0, r)
        s.top(0.18, 0.18, W - 0.18, D - 0.18, 0, l)
        s.top(0.3, 0.3, W - 0.3, D - 0.3, 0, C[border])
        s.top(0.3 + 1 / 16, 0.3 + 1 / 16, W - 0.3 - 1 / 16, D - 0.3 - 1 / 16, 0, l)
        s.top(W / 2 - 0.25, D / 2 - 0.25, W / 2 + 0.25, D / 2 + 0.25, 0, r)
        for k in range(int(W * 6)):
            a = 0.14 + k / 6
            if a < W - 0.14:
                s.top(a, 0.04, a + 1 / 32, 0.1, 0, 'gallery_mid'); s.top(a, D - 0.1, a + 1 / 32, D - 0.04, 0, 'gallery_mid')

def light_pool(s, frame=0, col='glow', alpha=46):
    """floor light pool (blend layer, 50% checker dither rim). Stored as GLOW only."""
    W = s.W
    rx = W * 32 * 0.62
    s.glow_ell(W / 2, s.D / 2, 0, rx, col, alpha, rim=1.45)
