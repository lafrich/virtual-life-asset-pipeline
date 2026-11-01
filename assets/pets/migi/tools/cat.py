"""Migi poses, markings, shading and face stamps."""
import numpy as np
from PIL import Image
from model import Prim, render, project, rot_y, rot_z, LIGHT, VIEW, ROT
from palette_migi import C, RAMP, INNER, RIM

# ---------------------------------------------------------------- poses
HS = 1.25
HR = HS * np.array([4.8, 5.9, 4.9])
def _legs(P, front_x, back_x, fl, fr, bl, br, top_z=7.0, foot_z=1.5, wf=2.8, wb=3.4):
    """fl.. = (dx, lift) foot offsets for the walk cycle"""
    for name, x, y, (dx, lift), r0 in (('leg_fl', front_x, wf, fl, 2.3), ('leg_fr', front_x, -wf, fr, 2.3),
                                       ('leg_bl', back_x, wb, bl, 2.6), ('leg_br', back_x, -wb, br, 2.6)):
        P.append(Prim('cap', name, p0=(x, y, top_z), p1=(x + dx, y, foot_z + lift), r0=r0, r1=1.8, k=0.9))

def _tail(P, pts, r):
    for i in range(len(pts) - 1):
        P.append(Prim('cap', 'tail', p0=pts[i], p1=pts[i + 1], r0=r[i], r1=r[i + 1], k=1.0 if i == 0 else 0.6))

def _head(P, c, pitch=0.0, yaw=0.0, ears=True, mouth=0.0):
    c = np.array(c, float)
    R = rot_z(yaw) @ rot_y(pitch)
    P.append(Prim('ell', 'head', c=c, r=HR, R=R, k=1.6))
    mz = c + R @ (HS * np.array([4.0, 0, -1.9]))
    P.append(Prim('ell', 'muzzle', c=mz, r=HS * np.array([2.0, 2.5, 1.8]), R=R, k=0.7))
    if ears:
        for s in (1, -1):
            b = c + R @ (HS * np.array([-0.4, 3.2 * s, 3.2])); ap = c + R @ (HS * np.array([0.0, 4.4 * s, 7.4]))
            P.append(Prim('cone', 'ear', p0=b, p1=ap, r0=2.3 * HS, r1=0.4, k=0.5))
    return dict(c=c, R=R)

def pose(anim, f, n, facing='se'):
    """returns (prims, head_info, opts). f = frame index, n = frame count"""
    P = []; o = dict(eyes='open', mouth=0, shadow=(10, 5), zoff=0.0)
    # the signature stare: in the camera-facing directions Migi turns the head toward the viewer
    cam = {'se': 1, 'sw': -1}.get(facing, 0)
    ph = 2 * np.pi * f / max(n, 1)
    if anim in ('walk', 'eat'):
        bob = 0.0; head_c = (11.0, 0, 16.0); hp = 0.0
        if anim == 'walk':
            s = np.sin(ph); c = np.cos(ph)
            st = 2.6
            fl = (st * s, max(0, c) * 1.3); br = (st * s, max(0, c) * 1.3)
            fr = (-st * s, max(0, -c) * 1.3); bl = (-st * s, max(0, -c) * 1.3)
            bob = 0.6 * abs(np.cos(ph))
            tail_sw = 1.2 * np.sin(ph)
        else:
            fl = fr = (0.6, 0); bl = br = (0, 0); tail_sw = 0.3 * np.sin(ph)
            chew = [0, 0.8, 0, 0.8][f % 4]
            head_c = (9.9, 0, 7.8 + chew); hp = -0.75
            o['eyes'] = 'half'
        P.append(Prim('ell', 'body', c=(0, 0, 10.2 + bob), r=(10.0, 7.2, 6.6), k=0))
        P.append(Prim('ell', 'chest', c=(6.6, 0, 9.6 + bob), r=(4.6, 5.6, 5.6), k=1.6))
        for s in (1, -1):
            P.append(Prim('ell', 'haunch', c=(-5.8, 3.6 * s, 8.6 + bob), r=(5.0, 3.4, 5.4), k=1.4))
        _legs(P, 6.8, -6.2, fl, fr, bl, br, top_z=7.5 + bob)
        H = _head(P, (head_c[0], head_c[1], head_c[2] + bob), pitch=hp, yaw=cam * (0.25 if anim == 'walk' else 0.0))
        tb = (-9.0, 0, 11.5 + bob)
        if anim == 'walk':
            _tail(P, [tb, (-12.5, tail_sw * 0.5, 14.5 + bob), (-14.5, tail_sw, 18.5 + bob), (-14.0, tail_sw * 1.3, 22.0 + bob)],
                  [2.4, 3.3, 3.6, 2.6])
        else:   # eating: tail held up as a plume, closer to the body
            _tail(P, [tb, (-11.0, tail_sw, 15.0), (-11.5, tail_sw * 1.5, 19.0), (-10.0, tail_sw * 2, 22.0)], [2.4, 3.3, 3.5, 2.6])
        o['shadow'] = (11, 6)
    elif anim in ('sit', 'meow'):
        flick = 0.0; o['eyes'] = 'open'
        if anim == 'sit':
            if f == 2: o['eyes'] = 'closed'
            flick = [0, 0, 0, 0, 1.0, -0.6][f % 6]
            yaw = cam * 0.6; hp = 0.0
        else:
            m = [0, 1, 2, 1][f % 4]; o['mouth'] = m; o['eyes'] = 'wide' if m else 'open'
            yaw = cam * 0.6; hp = 0.12 * m
        bodyR = rot_y(1.0)
        P.append(Prim('ell', 'body', c=(-1.5, 0, 9.0), r=(9.4, 7.2, 6.8), R=bodyR, k=0))
        P.append(Prim('ell', 'chest', c=(3.6, 0, 11.5), r=(4.4, 5.6, 6.2), k=1.6))
        for s in (1, -1):
            P.append(Prim('ell', 'haunch', c=(-3.0, 4.2 * s, 4.6), r=(6.0, 3.4, 4.6), k=1.4))
            P.append(Prim('cap', 'leg_bl' if s > 0 else 'leg_br', p0=(1.5, 4.0 * s, 1.6), p1=(4.0, 3.4 * s, 1.4), r0=1.8, r1=1.7, k=0.8))
        P.append(Prim('cap', 'leg_fl', p0=(4.6, 2.4, 9.0), p1=(5.6, 2.4, 1.5), r0=2.0, r1=1.8, k=0.8))
        P.append(Prim('cap', 'leg_fr', p0=(4.6, -2.4, 9.0), p1=(5.6, -2.4, 1.5), r0=2.0, r1=1.8, k=0.8))
        H = _head(P, (5.2, 0, 19.0), pitch=hp, yaw=yaw)
        # tail wrapped forward around the right side on the floor, tip flicks up
        _tail(P, [(-8.5, 0, 3.6), (-9.0, -5.5, 2.6), (-4.0, -8.6, 2.4), (2.5, -8.0, 2.6 + flick * 2.2)], [2.6, 3.2, 3.2, 2.4])
        o['shadow'] = (10, 5)
    elif anim == 'loaf':
        breath = [0, 0.35, 0.6, 0.35][f % 4]
        if f % 4 == 3: o['eyes'] = 'closed'
        P.append(Prim('ell', 'body', c=(-1.0, 0, 6.6), r=(11.0, 7.8, 6.2 + breath), k=0))
        P.append(Prim('ell', 'chest', c=(6.0, 0, 6.8), r=(4.8, 6.4, 5.4 + breath * 0.5), k=1.6))
        for s in (1, -1):
            P.append(Prim('ell', 'haunch', c=(-6.0, 4.0 * s, 5.6), r=(5.4, 3.6, 5.2), k=1.4))
            P.append(Prim('cap', 'leg_fl' if s > 0 else 'leg_fr', p0=(8.0, 2.6 * s, 1.8), p1=(10.6, 2.4 * s, 1.6), r0=1.8, r1=1.7, k=0.7))
        H = _head(P, (10.0, 0, 13.0 + breath * 0.5), yaw=cam * 0.55)
        _tail(P, [(-9.5, 0, 4.2), (-9.8, -5.4, 2.9), (-4.0, -8.3, 2.7), (3.0, -8.0, 2.6)], [2.6, 3.2, 3.2, 2.4])
        o['shadow'] = (12, 6)
    elif anim == 'sleep':
        breath = [0, 0.4, 0.7, 0.4][f % 4]
        o['eyes'] = 'closed'; o['ears_inner'] = False
        # curled ball; in the camera-facing directions the tucked face points at the viewer
        phi = {'se': 0.62, 'sw': -0.62}.get(facing, 0.0)
        Rz = rot_z(phi)
        P.append(Prim('ell', 'body', c=(-0.5, 0, 5.5), r=(8.6, 9.0, 5.3 + breath), R=rot_z(phi - 0.3), k=0))
        for s_ in (1, -1):
            P.append(Prim('ell', 'haunch', c=Rz @ np.array([-4.5, 4.5 * s_, 4.4]), r=(5.0, 4.0, 4.3 + breath * 0.6), R=Rz, k=1.4))
        H = _head(P, Rz @ np.array([8.6, -0.4, 6.4 + breath * 0.3]), pitch=0.1, yaw=phi + 0.1)
        pts = []
        for ang, rr, zz in ((200, 7.0, 3.2), (240, 8.4, 2.6), (290, 9.0, 2.5), (330, 8.8, 2.5), (360, 8.4, 2.4)):
            t = np.radians(ang) + phi
            pts.append((rr * np.cos(t) - 0.5, rr * np.sin(t), zz))
        _tail(P, pts, [2.6, 3.4, 3.6, 3.3, 2.4])
        o['shadow'] = (12, 6)
    o['head'] = H
    return P, o

# ---------------------------------------------------------------- markings
BODY_C = {'walk': (0, 0, 10.2), 'eat': (0, 0, 10.2)}
def _cap(u, d, ang):
    d = np.array(d, float); d /= np.linalg.norm(d)
    un = u / (np.linalg.norm(u, axis=-1, keepdims=True) + 1e-9)
    return (un @ d) > np.cos(np.radians(ang))

def markings(tag_name, Pl, prims, idx, head):
    """returns 'white' | 'black' | 'cream'"""
    out = np.full(Pl.shape[:-1], 'white', dtype=object)
    body = [p for p in prims if p.tag == 'body'][0]
    if tag_name in ('body', 'haunch', 'chest'):
        u = (Pl - body.c) @ body.R / body.r
        blk = (_cap(u, (0.05, 0.55, 1.0), 33)        # saddle over the back, spills down the LEFT side
               | _cap(u, (-0.35, 1.0, -0.1), 22)      # big lower patch on the LEFT flank
               | _cap(u, (0.1, -1.0, 0.35), 21)       # round 'heart' patch on the RIGHT flank
               | _cap(u, (-1.0, 0.0, 0.5), 25))       # rump / tail base
        out[blk] = 'black'
    elif tag_name in ('head', 'muzzle', 'ear'):
        hc = head['c']; R = head['R']
        q = ((Pl - hc) @ R) / HR
        hx, hy, hz = q[..., 0], q[..., 1], q[..., 2]
        mask = hz > (-0.02 - 0.25 * np.abs(hy) ** 1.5)
        blaze = (hx > 0.0) & (hz < 0.8) & (np.abs(hy) < 0.14 + 0.6 * np.clip(0.5 - hz, 0, 1))
        back = (hx < -0.25) & (hz > -0.3)
        blk = (mask & ~blaze) | back
        if tag_name == 'muzzle': blk[:] = False
        if tag_name == 'ear': blk[:] = True
        out[blk] = 'black'
    elif tag_name == 'tail':
        out[:] = 'black'
    elif tag_name == 'leg_bl':
        p = [pp for pp in prims if pp.tag == 'leg_bl'][0]
        h = p.local(Pl)[..., 0]
        out[(h > 0.35) & (h < 0.7)] = 'black'       # the black spot on the left hind leg (photo 3)
    return out

# ---------------------------------------------------------------- frame render
N4 = ((0, 1), (0, -1), (1, 0), (-1, 0))
def smooth_silhouette(R, passes=3):
    """Clean 1-2-3 px stairs: fill 1-px notches (empty px with >=3 filled 4-neighbours, or 2 opposite ones),
    prune 1-px nubs (filled px with <=1 filled 4-neighbour, or only 2 opposite ones). Filled px copy the nearest neighbour's data."""
    hit = R['hit']; H, W = hit.shape
    keys = ('tag', 'T', 'Pl', 'n', 'n_smooth')
    for _ in range(passes):
        changed = False
        p = np.pad(hit, 1)
        nb = [p[1 + dy:H + 1 + dy, 1 + dx:W + 1 + dx] for dy, dx in N4]
        cnt = sum(x.astype(int) for x in nb)
        opp = (nb[0] & nb[1] & ~nb[2] & ~nb[3]) | (nb[2] & nb[3] & ~nb[0] & ~nb[1])
        fill = ~hit & (cnt >= 3)            # 1-px gaps between legs are kept (no opposite-pair fill)
        prune = hit & ((cnt <= 1) | ((cnt == 2) & opp))
        for y, x in zip(*np.where(fill)):
            best = None
            for dy, dx in N4:
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and hit[yy, xx] and (best is None or R['T'][yy, xx] > R['T'][best]): best = (yy, xx)
            for k in keys: R[k][y, x] = R[k][best]
            changed = True
        hit = (hit | fill) & ~prune
        if prune.any(): changed = True
        R['tag'][~hit] = -1
        if not changed: break
    R['hit'] = hit
    return R

def jaggies(alpha):
    """count single-pixel nubs/notches on a silhouette mask (for the QA report)"""
    hit = alpha > 0; H, W = hit.shape; p = np.pad(hit, 1)
    nb = [p[1 + dy:H + 1 + dy, 1 + dx:W + 1 + dx] for dy, dx in N4]; cnt = sum(x.astype(int) for x in nb)
    return int((hit & (cnt <= 1)).sum() + (~hit & (cnt >= 3)).sum())

def cleanup(mat, band, hit, passes=2):
    H, W = hit.shape
    for _ in range(passes):
        m2 = mat.copy(); b2 = band.copy()
        for y in range(H):
            for x in range(W):
                if not hit[y, x]: continue
                nb = [(y + dy, x + dx) for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0))
                      if 0 <= y + dy < H and 0 <= x + dx < W and hit[y + dy, x + dx]]
                if len(nb) < 3: continue
                ms = [mat[p] for p in nb]
                if all(v != mat[y, x] for v in ms):
                    m2[y, x] = max(set(ms), key=ms.count)
                bs = [band[p] for p in nb if mat[p] == m2[y, x]]
                if len(bs) >= 2 and all(v != band[y, x] for v in bs):
                    b2[y, x] = max(set(bs), key=bs.count)
        mat, band = m2, b2
    return mat, band

def render_frame(anim, f, n, facing, W, H, PX, PY, scale):
    prims, o = pose(anim, f, n, facing)
    for p in prims:                       # v1.1 polish: no noise on tail / head silhouettes (clean stairs)
        if p.tag in ('tail', 'head', 'muzzle', 'ear'): p.fluff = 0.0
    R = render(prims, facing, W, H, PX, PY, scale=scale, zoff=o['zoff'])
    smooth_silhouette(R)
    hit, tag, Pl, nrm, T = R['hit'], R['tag'], R['Pl'], R['n'], R['T']
    tags = [p.tag for p in prims]
    mat = np.full((H, W), '', dtype=object)
    for i, t in enumerate(tags):
        m = hit & (tag == i)
        if not m.any(): continue
        mk = markings(t, Pl[m], prims, i, o['head'])
        mat[m] = mk
    l = R['n_smooth'] @ LIGHT
    band = np.where(l > 0.12, 0, np.where(l > -0.35, 1, 2))
    face_white = np.zeros_like(hit)
    for i, t in enumerate(tags):
        if t in ('head', 'muzzle'): face_white |= hit & (tag == i)
    band[face_white & (mat == 'white') & (band == 1)] = 0     # keep the muzzle/cheeks reading white
    mat, band = cleanup(mat, band, hit)
    img = np.zeros((H, W, 4), np.uint8)
    for y in range(H):
        for x in range(W):
            if hit[y, x]:
                img[y, x] = C[RAMP[mat[y, x]][band[y, x]]]
    # inner lines: farther pixel next to a much nearer one -> darkest shade of its own ramp
    inner = np.zeros((H, W), bool)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        Tn = np.roll(np.roll(T, dy, 0), dx, 1); hn = np.roll(np.roll(hit, dy, 0), dx, 1)
        inner |= hit & hn & (Tn > T + 3.2)
    for y, x in zip(*np.where(inner)):
        img[y, x] = C[INNER[mat[y, x]]]
    # 1px cool_grey rim on the top-left silhouette edge of black fur
    pad = np.pad(hit, 1)
    edge_tl = hit & (~pad[:-2, 1:-1] | ~pad[1:-1, :-2])
    img[edge_tl & (mat == 'black')] = C[RIM]
    # outer outline
    pad = np.pad(hit, 1)
    nb = pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
    ol = nb & ~hit
    img[ol] = C['void']
    po = np.pad(ol | hit, 1)                 # fill 1-px notches in the outline ring so its stairs stay clean
    c4 = po[:-2, 1:-1].astype(int) + po[2:, 1:-1] + po[1:-1, :-2] + po[1:-1, 2:]
    img[~(ol | hit) & (c4 >= 3)] = C['void']
    ear_mask = np.isin(tag, [i for i, t in enumerate(tags) if t == 'ear']) & hit
    face(img, hit, T, o, facing, PX, PY, scale, ear_mask)
    return img, o

def _vis(T, x, y, z, hit, tol=1.6):
    H, W = T.shape
    if not (0 <= x < W and 0 <= y < H) or not hit[y, x]: return False
    return abs(T[y, x] - z) < tol

def face(img, hit, T, o, facing, PX, PY, scale, ear_mask=None):
    hd = o['head']; c = hd['c']; R = hd['R']
    fwd_w = np.array(ROT[facing][0] + (0,), float) if False else None
    # head forward vector in world -> facing camera?
    (r00, r01), (r10, r11) = ROT[facing]
    M = np.array([[r00, r01, 0], [r10, r11, 0], [0, 0, 1.0]])
    fw = M @ (R @ np.array([1.0, 0, 0]))
    if fw @ VIEW < -0.05: return      # back of head to the camera
    zoff = o['zoff']
    pts = {}
    for name, lp in (('eyeL', (3.9, 2.25, 0.9)), ('eyeR', (3.9, -2.25, 0.9)), ('nose', (6.0, 0, -0.9)),
                     ('mouth', (5.6, 0, -2.6))):
        P = c + R @ (HS * np.array(lp))
        sx, sy, z = project(P, None, facing, PX, PY, scale, zoff)
        pts[name] = (int(np.floor(sx)), int(np.floor(sy)), z)
    def put(x, y, col):
        if 0 <= y < img.shape[0] and 0 <= x < img.shape[1] and hit[y, x]: img[y, x] = C[col]
    for th in np.linspace(np.radians(8), np.radians(80), 24):     # white blaze down the forehead midline
        P = c + R @ (np.array([np.cos(th), 0, np.sin(th)]) * HR + np.array([0.25, 0, 0]))
        sx, sy, z = project(P, None, facing, PX, PY, scale, zoff)
        x, y = int(np.floor(sx)), int(np.floor(sy))
        if _vis(T, x, y, z, hit, 2.2): put(x, y, 'paper')
    for s_ in (1, -1):                    # inner ear: 1px spark coral light, camera-facing only
        P = c + R @ (HS * np.array([0.9, 3.7 * s_, 5.2]))
        sx, sy, z = project(P, None, facing, PX, PY, scale, zoff)
        x, y = int(np.floor(sx)), int(np.floor(sy))
        if o.get('ears_inner', True) and fw @ VIEW > 0.8 and 0 <= y < hit.shape[0] and 0 <= x < hit.shape[1] and ear_mask[y, x] and _vis(T, x, y, z, hit, 2.0): put(x, y, 'coral_lt')
    for e in ('eyeL', 'eyeR'):
        x, y, z = pts[e]
        # visibility: the eye centre must be on the surface (not hidden behind the head)
        if not any(_vis(T, x + dx, y + dy, z, hit, 4.0 if o['eyes'] == 'closed' else 1.6) for dx in (0, -1, 1) for dy in (0, -1, 1)): continue
        ew = o['eyes']
        if ew in ('open', 'wide'):     # AD: 2px baize light/mid + 1px paper glint
            put(x - 1, y - 1, 'paper'); put(x, y - 1, 'baize_lt')
            put(x - 1, y, 'baize_lt'); put(x, y, 'baize')
            if ew == 'wide': put(x - 1, y - 2, 'baize_lt'); put(x, y - 2, 'baize_lt')
        elif ew == 'half':
            put(x - 1, y, 'baize_lt'); put(x, y, 'baize')
        else:  # closed: lid line in the lightest black-fur value so it reads on the mask
            put(x - 1, y - 1, 'grey'); put(x, y - 1, 'grey')
    x, y, z = pts['nose']
    if _vis(T, x, y, z, hit) or True:
        put(x, y, 'coral_lt')
    if o['mouth']:
        x, y, _ = pts['mouth']
        put(x, y, 'oxblood');
        if o['mouth'] >= 2: put(x, y + 1, 'oxblood'); put(x - 1, y, 'oxblood_dk')
