"""Migi: tiny analytic 3D cat model, ray-cast at 1x into a 2:1 iso frame.
World units: sx = a - b ; sy = (a + b)/2 - z  (same projection as the environment: 64x32 tile = 32 units/side).
Cat local frame: x forward, y left, z up. Facing rotations are PROPER rotations (never mirrored),
so asymmetric patches stay on the same physical side in every direction.
"""
import numpy as np
from palette_migi import C

ROT = {  # local (x,y) -> world (a,b)
    'se': ((1, 0), (0, 1)),
    'sw': ((0, -1), (1, 0)),
    'ne': ((0, 1), (-1, 0)),
    'nw': ((-1, 0), (0, -1)),
}
LIGHT = np.array([-0.09, 0.48, 0.87]); LIGHT = LIGHT / np.linalg.norm(LIGHT)
VIEW = np.array([1.0, 1.0, 1.0]) / np.sqrt(3)

def rot_y(ang):  # pitch: positive = nose up
    c, s = np.cos(ang), np.sin(ang)
    return np.array([[c, 0, -s], [0, 1, 0], [s, 0, c]])

def rot_z(ang):
    c, s = np.cos(ang), np.sin(ang)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])

class Prim:
    """kind: 'ell' (centre, radii, R) | 'cap' (p0, p1, r0, r1) | 'cone' (base centre, apex, r)"""
    def __init__(self, kind, tag, **kw):
        self.kind, self.tag = kind, tag; self.__dict__.update(kw)
        if kind == 'ell':
            self.R = kw.get('R', np.eye(3)); self.c = np.array(self.c, float); self.r = np.array(self.r, float)
        if kind in ('cap', 'cone'):
            self.p0 = np.array(self.p0, float); self.p1 = np.array(self.p1, float)
    def sdf(self, P):  # P: (...,3) local
        if self.kind == 'ell':
            q = (P - self.c) @ self.R          # into prim frame (R columns = prim axes)
            k0 = np.linalg.norm(q / self.r, axis=-1); k1 = np.linalg.norm(q / self.r ** 2, axis=-1)
            return k0 * (k0 - 1) / np.maximum(k1, 1e-6)
        ba = self.p1 - self.p0; pa = P - self.p0
        h = np.clip((pa @ ba) / (ba @ ba), 0, 1)
        r = self.r0 + (self.r1 - self.r0) * h
        return np.linalg.norm(pa - h[..., None] * ba, axis=-1) - r
    def local(self, P):  # normalised coords inside the primitive (for markings)
        if self.kind == 'ell':
            return ((P - self.c) @ self.R) / self.r
        ba = self.p1 - self.p0; pa = P - self.p0
        return np.stack([(pa @ ba) / (ba @ ba)] * 3, -1)

def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)

def fluff(P, amp):
    if amp <= 0: return 0
    x, y, z = P[..., 0], P[..., 1], P[..., 2]
    return amp * (np.sin(1.9 * x + 0.7 * z) * np.sin(2.3 * y + 1.1) * np.sin(2.1 * z + 0.5 * x))

def render(prims, facing, W, H, PX, PY, scale=1.0, fluff_amp=0.45, zoff=0.0):
    """Return (tag index map, local hit points, normals(world), depth) for a WxH frame, pivot (PX,PY)."""
    (r00, r01), (r10, r11) = ROT[facing]
    M = np.array([[r00, r01, 0], [r10, r11, 0], [0, 0, 1.0]])     # local->world
    ys, xs = np.mgrid[0:H, 0:W]
    sx = xs + 0.5 - PX; sy = ys + 0.5 - PY
    a0 = sy + sx / 2; b0 = sy - sx / 2
    def field(Pw, fl=fluff_amp):
        Pl = (Pw @ M) / scale                                        # world->local (M orthogonal)
        Pl = Pl - np.array([0, 0, zoff])
        ds = np.stack([p.sdf(Pl) for p in prims], 0)
        d = ds[0]
        for i, p in enumerate(prims[1:], 1):
            d = smin(d, ds[i], getattr(p, 'k', 1.2)) if getattr(p, 'k', 1.2) > 0 else np.minimum(d, ds[i])
        w = np.array([getattr(p, 'fluff', 1.0) for p in prims])[np.argmin(ds, 0)]
        d = d - fluff(Pl, fl) * w
        return d * scale, ds, Pl
    hit = np.zeros((H, W), bool); T = np.full((H, W), -99.0)
    t = 48.0
    while t > -8:
        Pw = np.stack([a0 + t, b0 + t, np.full_like(a0, t)], -1)
        d, _, _ = field(Pw)
        new = (d < 0) & ~hit
        T[new] = t; hit |= new
        t -= 0.12
    # refine + normals
    Pw = np.stack([a0 + T, b0 + T, T], -1)
    d, ds, Pl = field(Pw)
    tag = np.argmin(ds, 0); tag[~hit] = -1
    e = 0.35; n = np.zeros((H, W, 3))
    for k in range(3):
        o = np.zeros(3); o[k] = e
        n[..., k] = field(Pw + o)[0] - field(Pw - o)[0]
    n /= np.linalg.norm(n, axis=-1, keepdims=True) + 1e-9
    e = 0.8; ns = np.zeros((H, W, 3))
    for k in range(3):
        o = np.zeros(3); o[k] = e
        ns[..., k] = field(Pw + o, 0)[0] - field(Pw - o, 0)[0]
    ns /= np.linalg.norm(ns, axis=-1, keepdims=True) + 1e-9
    return dict(hit=hit, tag=tag, Pl=Pl, n=n, n_smooth=ns, T=T, M=M, scale=scale, zoff=zoff, PX=PX, PY=PY)

def project(Pl, R, facing, PX, PY, scale=1.0, zoff=0.0):
    (r00, r01), (r10, r11) = ROT[facing]
    M = np.array([[r00, r01, 0], [r10, r11, 0], [0, 0, 1.0]])
    p = np.array(Pl, float) + np.array([0, 0, zoff])
    a, b, z = (M @ p) * scale
    return PX + (a - b), PY + (a + b) / 2 - z, z
