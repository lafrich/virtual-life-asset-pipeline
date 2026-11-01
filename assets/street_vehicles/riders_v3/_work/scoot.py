"""scooter only (rider-less), split into 3 render groups so v6b riders can be layered in between:
wheels (+ flat alpha-56 shadow, 2 spoke phases), rear body (cowl/seat/bag), front body (floor/leg shield/headlamp/bars).
Geometry = the v1 scooter (street_vehicles/_work/riders.py Ride), same SDF renderer + material ramps."""
import sys
sys.path.insert(0, 'assets/street_vehicles/_work')
import numpy as np
from sdf import *
from grade import grade
from cars import common_ramps

def _wheel_mat(pl, nl, wheels, R, phase):
    m = np.array(['tyre'] * len(pl), object)
    for wx in wheels:
        dx, dz = pl[:, 0] - wx, pl[:, 2] - R; rad = np.sqrt(dx ** 2 + dz ** 2); side = np.abs(nl[:, 1]) > 0.55
        m = np.where(side & (rad < R * 0.62), 'rim', m)
        sp = np.cos(4 * (np.arctan2(dz, dx) + phase)) > 0.55                         # 4 spokes, phase = spin
        m = np.where(side & (rad < R * 0.62) & (rad > R * 0.22) & sp, 'trim', m)
        m = np.where(side & (rad < R * 0.2), 'trim', m)
    return m

class Scoot:
    def __init__(s, paint, paint2=None, long=False, bag=False, graded=True):
        s.long = long; rear = -28 if long else -22; s.rear = rear
        s.hl = 25 if long else 21; s.hw = 12; s.R = 6.6
        s.wx = [15, -19 if long else -14]
        g = (lambda h: grade(h)) if graded else (lambda h: h)
        s.ramps = common_ramps(False)
        s.ramps['paint'] = ramp5(*[g(h) for h in paint])
        s.ramps['paint2'] = ramp5(*[g(h) for h in (paint2 or paint)])
        s.ramps['seat'] = s.ramps['trim']
        s.ramps['bag'] = [hexrgb(c) for c in ('#FF7A5C', '#D94B4B', '#BE2F56', '#7A2E35', '#5A1F26')]
        s.bag = bag
    def model(s, group):
        m = Model(); rear = s.rear
        if group == 'wheels':
            for w in s.wx: m.add('wheel', (lambda w: (lambda p: sd_cyl_y(p, V(w, 0, 6.6), 6.6, 2.3, 1.0)))(w))
        elif group in ('rear', 'cowl', 'seat', 'bag'):
            cowl = [(rear + 3, 12), (-3, 10), (-0.5, 15.5), (-4, 19.5), (rear + 1, 22), (rear - 1.5, 19)]
            if group in ('rear', 'cowl'):
                m.add('paint', lambda p: sd_extrude(p, cowl, 4.4, 2.2, 0.15, 14))
                m.add('bumper', lambda p: sd_capsule(p, V(-6, -4.8, 8), V(rear + 4, -4.8, 10.5), 1.5))
            if group in ('rear', 'seat'): m.add('seat', lambda p: sd_rbox(p, V((rear + 1) / 2, 0, 21.2), ((-2 - rear) / 2, 4.2, 1.5), 1.2))
            if s.bag and group in ('rear', 'bag'): m.add('bag', lambda p: sd_rbox(p, V(-19, 0, 30), (4.6, 6.2, 7.0), 1.2))
        else:
            m.add('trim', lambda p: sd_rbox(p, V(3.5, 0, 8.6), (5.5, 4, 1.4), 0.8))
            apron = [(7, 8), (13, 8), (17, 17), (15, 30), (11, 30.5), (9, 19)]
            m.add('paint', lambda p: sd_extrude(p, apron, 5.2, 2.0))
            m.add('paint2', lambda p: sd_rbox(p, V(13.5, 0, 31.5), (3.2, 3.6, 2.2), 1.2))
            m.add('trim', lambda p: sd_capsule(p, V(12.5, -7.2, 32.4), V(12.5, 7.2, 32.4), 1.1))
            for sy in (1, -1):
                m.add('trim', (lambda sy: (lambda p: np.minimum(sd_capsule(p, V(12.5, sy * 5.5, 33), V(11.5, sy * 7.5, 39), 0.6),
                                                               sd_ellip(p, V(11.5, sy * 7.8, 39.6), V(0.8, 1.6, 1.1)))))(sy))
        return m
    def render(s, group, d, phase=0.0):
        m = s.model(group)
        def matfn(pl, nl, nw, names, lam, info):
            N = len(pl); mm = np.array(['trim'] * N, object); x, z = pl[:, 0], pl[:, 2]; nx = nl[:, 0]
            for k in ('paint', 'paint2', 'seat', 'trim', 'bumper', 'bag'): mm[names == k] = k
            w = names == 'wheel'
            if w.any(): wm = _wheel_mat(pl, nl, s.wx, s.R, phase); mm[w] = wm[w]
            mm[(names == 'paint2') & (nx > 0.5) & (z > 30.5)] = 'lamp_f'
            mm[(names == 'paint') & (nx < -0.5) & (z > 14) & (z < 19)] = 'lamp_r'
            return mm, np.zeros(N, int)
        sh = (s.hl - 2, 5.5, 4) if group == 'wheels' else None
        return render(m, d, s.hl + 4, s.hw, 72, shadow_rr=sh, matfn=matfn, ramps=s.ramps, shadow_extra=1.0)

def to_screen(d, x, y, z):
    """local scooter point -> screen offset from the pivot (local origin)"""
    f, l = DIRS[d]; c = x * f[0] + y * l[0]; r = x * f[1] + y * l[1]
    return (c - r, (c + r) / 2 - z)
