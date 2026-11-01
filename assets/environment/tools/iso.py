"""Tiny isometric pixel rasteriser (2:1, 64x32 tile, no anti-aliasing).
World: x (= grid c), y (= grid r) in tiles; z in pixels (up).
Screen: sx = OX + (x - y)*32 ; sy = OY + (x + y)*16 - z
Every face is filled by inverse-mapping pixel centres onto its plane, so all
diagonals are clean 2-across/1-up stairs and adjacent faces never overlap.
"""
import numpy as np
from PIL import Image
from contextlib import contextmanager
from palette import C, mat, M
def colr(c):
    if isinstance(c, str):
        return C[c] if c in C else mat(c)[1]
    return c

HW, HH = 32, 16           # half tile width / height (tile = 64x32)
CW, CH = 400, 360         # working canvas
OX, OY = 200, 196         # projection of local origin (0,0,0)
_ys, _xs = np.mgrid[0:CH, 0:CW]
SX = _xs + 0.5 - OX
SY = _ys + 0.5 - OY

R = {  # facing -> linear part of local->world rotation (orientation preserving)
    'sw': ((1, 0), (0, 1)), 'se': ((0, 1), (-1, 0)),
    'ne': ((-1, 0), (0, -1)), 'nw': ((0, -1), (1, 0)),
}

def scr(x, y, z=0):
    return OX + (x - y) * HW, OY + (x + y) * HH - z

def erode4(m):
    p = np.pad(m, 1)
    return m & p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]

class Sprite:
    def __init__(self, W=1, D=1, facing='sw'):
        self.W, self.D, self.facing = W, D, facing
        self.WW, self.DD = (W, D) if facing in ('sw', 'ne') else (D, W)
        self.L = {'base': np.zeros((CH, CW, 4), np.uint8), 'front': np.zeros((CH, CW, 4), np.uint8)}
        self.sh = np.zeros((CH, CW, 4), np.uint8)
        self.G = np.zeros((CH, CW, 4), np.uint8)
        self.cur = None
        self.meta = {}

    # ---- transforms
    def T(self, a, b):
        W, D, f = self.W, self.D, self.facing
        if f == 'sw': return a, b
        if f == 'se': return b, W - a
        if f == 'ne': return W - a, D - b
        return D - b, a
    def Rv(self, da, db):
        (p, q), (r, s) = R[self.facing]
        return p * da + q * db, r * da + s * db

    # ---- low level
    @contextmanager
    def part(self, outline=None, layer='base'):
        prev = self.cur
        self.cur = np.zeros((CH, CW, 4), np.uint8)
        yield self
        buf = self.cur
        if outline is not None:
            m = buf[..., 3] > 0
            e = m & ~erode4(m)
            buf[e] = outline
        dst = self.L[layer]
        m = buf[..., 3] > 0
        dst[m] = buf[m]
        self.cur = prev
    def _put(self, mask, col):
        if self.cur is None:
            with self.part(): self.cur[mask] = col
        else:
            self.cur[mask] = col
    def mask_plane(self, plane, k, u0, u1, v0, v1):
        if plane == 'z':
            u = (SX / HW + (SY + k) / HH) / 2; v = ((SY + k) / HH - SX / HW) / 2
        elif plane == 'y':
            u = SX / HW + k; v = (u + k) * HH - SY
        else:
            u = k - SX / HW; v = (k + u) * HH - SY
        return (u >= u0) & (u < u1) & (v >= v0) & (v < v1)

    # ---- primitives in LOCAL coords (a along width W, b along depth D, front = +b)
    def wbox(self, x0, y0, x1, y1, z0, z1, m, top=True, sides=True):
        t, l, r = m
        if sides:
            self._put(self.mask_plane('y', y1, x0, x1, z0, z1), l)
            self._put(self.mask_plane('x', x1, y0, y1, z0, z1), r)
        if top: self._put(self.mask_plane('z', z1, x0, x1, y0, y1), t)
    def box(self, a0, b0, a1, b1, z0, z1, m, top=True, sides=True):
        if isinstance(m, str): m = mat(m)
        p, q = self.T(a0, b0), self.T(a1, b1)
        self.wbox(min(p[0], q[0]), min(p[1], q[1]), max(p[0], q[0]), max(p[1], q[1]), z0, z1, m, top, sides)
    # ---- glow (separate blend layer: screen/additive). solid core + 50% checker rim
    def _glow(self, core, rim, col, alpha):
        col = colr(col)
        chk = ((_xs + _ys) % 2 == 0)
        g = self.G
        for m, a in ((rim & chk & ~core, alpha), (core, alpha)):
            sel = m & (g[..., 3] < a)
            g[sel] = (*col[:3], a)
    def glow_ell(self, a, b, z, rx, col='glow', alpha=110, ry=None, dx=0, dy=0, rim=1.0):
        cx, cy = self.S(a, b, z); cx += dx; cy += dy
        ry = ry if ry is not None else rx / 2
        d = ((SX + OX - cx) / rx) ** 2 + ((SY + OY - cy) / ry) ** 2
        self._glow(d <= 1, d <= rim * rim, col, alpha)
    def glow_face(self, side, k, u0, u1, v0, v1, col='glow', alpha=90, pad=0.0, padz=0):
        n = {'front': (0, 1), 'back': (0, -1), 'right': (1, 0), 'left': (-1, 0)}[side]
        nx, ny = self.Rv(*n)
        if nx < 0 or ny < 0: return False
        p, q = (self.T(u0, k), self.T(u1, k)) if side in ('front', 'back') else (self.T(k, u0), self.T(k, u1))
        if ny > 0: pl, kk, lo, hi = 'y', p[1], min(p[0], q[0]), max(p[0], q[0])
        else: pl, kk, lo, hi = 'x', p[0], min(p[1], q[1]), max(p[1], q[1])
        self._glow(self.mask_plane(pl, kk, lo, hi, v0, v1), self.mask_plane(pl, kk, lo - pad, hi + pad, v0 - padz, v1 + padz), col, alpha)
        return True
    def clear_band(self, layer, a, b, z, half):
        cx, _ = self.S(a, b, z)
        X = SX + OX
        self.L[layer][(X >= cx - half) & (X < cx + half)] = 0
    def top(self, a0, b0, a1, b1, z, col):
        col = colr(col)
        p, q = self.T(a0, b0), self.T(a1, b1)
        self._put(self.mask_plane('z', z, min(p[0], q[0]), max(p[0], q[0]), min(p[1], q[1]), max(p[1], q[1])), col)
    def face(self, side, k, u0, u1, v0, v1, col):
        """Detail on a vertical local plane. side: front(+b) back(-b) right(+a) left(-a).
        k = plane position, u = along the other local axis, v = z px. col: colour,
        palette key, or material name/tuple (then shaded by world orientation).
        Returns False when the plane faces away from the camera."""
        n = {'front': (0, 1), 'back': (0, -1), 'right': (1, 0), 'left': (-1, 0)}[side]
        nx, ny = self.Rv(*n)
        if nx < 0 or ny < 0: return False
        if side in ('front', 'back'): p, q = self.T(u0, k), self.T(u1, k)
        else: p, q = self.T(k, u0), self.T(k, u1)
        if isinstance(col, str): col = mat(col) if col in __import__('palette').M else C[col]
        if isinstance(col, tuple) and len(col) == 3 and isinstance(col[0], tuple):
            col = col[1] if ny > 0 else col[2]
        if ny > 0:
            self._put(self.mask_plane('y', p[1], min(p[0], q[0]), max(p[0], q[0]), v0, v1), col)
        else:
            self._put(self.mask_plane('x', p[0], min(p[1], q[1]), max(p[1], q[1]), v0, v1), col)
        return True
    def front_visible(self):
        nx, ny = self.Rv(0, 1); return nx > 0 or ny > 0
    def S(self, a, b, z=0):
        x, y = self.T(a, b); return scr(x, y, z)
    def ell(self, a, b, z, rx, col, ry=None, dx=0, dy=0):
        col = colr(col)
        cx, cy = self.S(a, b, z); cx += dx; cy += dy
        ry = ry if ry is not None else rx / 2
        self._put(((SX + OX - cx) / rx) ** 2 + ((SY + OY - cy) / ry) ** 2 <= 1, col)
    def rect(self, a, b, z, dx, dy, w, h, col):
        """screen-aligned rect, offset (dx,dy) px from projected local point"""
        col = colr(col)
        cx, cy = self.S(a, b, z)
        X = SX + OX; Y = SY + OY
        self._put((X >= cx + dx) & (X < cx + dx + w) & (Y >= cy + dy) & (Y < cy + dy + h), col)
    def poly(self, a, b, z, pts, col):
        """screen polygon (offsets from projected point), even-odd test on pixel centres"""
        col = colr(col)
        cx, cy = self.S(a, b, z)
        X = SX + OX - cx; Y = SY + OY - cy
        ins = np.zeros(X.shape, bool); n = len(pts)
        for i in range(n):
            x1, y1 = pts[i]; x2, y2 = pts[(i + 1) % n]
            cond = ((y1 > Y) != (y2 > Y))
            with np.errstate(divide='ignore', invalid='ignore'):
                xi = (x2 - x1) * (Y - y1) / (y2 - y1 + 1e-12) + x1
            ins ^= cond & (X < xi)
        self._put(ins, col)
    def cyl(self, a, b, z0, z1, rx, m, ry=None):
        if isinstance(m, str): m = mat(m)
        t, l, r = m
        ry = ry if ry is not None else rx / 2
        cx, cy0 = self.S(a, b, z0); _, cy1 = self.S(a, b, z1)
        X = SX + OX - cx; Y = SY + OY
        body = (np.abs(X) < rx) & (Y >= cy1) & (Y < cy0)
        bot = (X / rx) ** 2 + ((Y - cy0) / ry) ** 2 <= 1
        side = body | bot
        self._put(side & (X < rx * 0.25), l)
        self._put(side & (X >= rx * 0.25), r)
        self.ell(a, b, z1, rx, t, ry)
    def shadow(self, inset=0.08, ellipse=False, rx=None, a=None, b=None):
        col = (*C['void'][:3], 102)
        if ellipse:
            a = self.W / 2 if a is None else a; b = self.D / 2 if b is None else b
            cx, cy = self.S(a, b, 0); rx = rx or 14; ry = rx / 2
            m = ((SX + OX - cx) / rx) ** 2 + ((SY + OY - cy) / ry) ** 2 <= 1
        else:
            p, q = self.T(inset, inset), self.T(self.W - inset, self.D - inset)
            m = self.mask_plane('z', 0, min(p[0], q[0]), max(p[0], q[0]), min(p[1], q[1]), max(p[1], q[1]))
        self.sh[m] = col

    # ---- output
    def finish(self, silhouette=True, box=None):
        B, F, Sh, G = self.L['base'], self.L['front'], self.sh, self.G
        if silhouette:
            u = (B[..., 3] > 0) | (F[..., 3] > 0)
            e = u & ~erode4(u)
            F[e & (F[..., 3] > 0)] = C['void']; B[e & (B[..., 3] > 0)] = C['void']
        base = Image.fromarray(Sh, 'RGBA'); base.alpha_composite(Image.fromarray(B, 'RGBA'))
        front = Image.fromarray(F, 'RGBA')
        allm = (B[..., 3] > 0) | (F[..., 3] > 0) | (Sh[..., 3] > 0) | (G[..., 3] > 0)
        ys, xs = np.nonzero(allm)
        if len(xs) == 0: raise ValueError('empty sprite')
        l, t, r, b = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        if box is not None: l, t, r, b = box
        self.bbox = (int(l), int(t), int(r), int(b))
        base = base.crop((l, t, r, b)); front = front.crop((l, t, r, b))
        has_front = (F[..., 3] > 0).any()
        glow = Image.fromarray(G, 'RGBA').crop((l, t, r, b)) if (G[..., 3] > 0).any() else None
        self.crop = (int(l), int(t))
        return {'base': base, 'front': front if has_front else None, 'glow': glow}, (int(OX - l), int(OY - t))
