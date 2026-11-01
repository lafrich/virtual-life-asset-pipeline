# recover the reference's native pixel grid: find pitch/offset per axis, sample block medians, cluster to a small palette
import numpy as np
from PIL import Image
a = np.array(Image.open('study/reference.jpg').convert('RGB')).astype(float)
H, W, _ = a.shape
def fit(g, lo=11.0, hi=12.5):
    best = None
    for p in np.arange(lo, hi, 0.01):
        for off in np.arange(0, p, 0.1):
            idx = np.round(np.arange(off, len(g) - 1, p)).astype(int)
            sc = g[idx].mean()
            if best is None or sc > best[0]: best = (sc, p, off)
    return best
gx = np.abs(np.diff(a, axis=1)).sum(-1); gy = np.abs(np.diff(a, axis=0)).sum(-1)
fx = fit(gx[100:1000].sum(0)); fy = fit(gy[:, 200:540].sum(1))
print('x pitch/off', fx[1:], 'y pitch/off', fy[1:])
px, ox = fx[1], fx[2]; py, oy = fy[1], fy[2]
nx = int((W - ox) // px); ny = int((H - oy) // py)
out = np.zeros((ny, nx, 3))
for j in range(ny):
    for i in range(nx):
        x0 = int(ox + i * px + px * 0.3); x1 = int(ox + (i + 1) * px - px * 0.3); y0 = int(oy + j * py + py * 0.3); y1 = int(oy + (j + 1) * py - py * 0.3)
        out[j, i] = np.median(a[y0:y1 + 1, x0:x1 + 1].reshape(-1, 3), 0)
bg = out[1, 1]; m = np.abs(out - bg).sum(-1) > 30
ys, xs = np.where(m); print('figure blocks bbox x', xs.min(), xs.max(), 'y', ys.min(), ys.max(), '=> size', xs.max() - xs.min() + 1, 'x', ys.max() - ys.min() + 1)
crop = out[ys.min() - 1:ys.max() + 2, xs.min() - 1:xs.max() + 2]; cm = m[ys.min() - 1:ys.max() + 2, xs.min() - 1:xs.max() + 2]
np.save('study/ref_blocks.npy', crop); np.save('study/ref_mask.npy', cm)
img = np.zeros(crop.shape[:2] + (4,), np.uint8); img[..., :3] = crop.clip(0, 255); img[..., 3] = cm * 255
Image.fromarray(img, 'RGBA').save('study/ref_native.png')
Image.fromarray(img, 'RGBA').resize((img.shape[1] * 12, img.shape[0] * 12), Image.NEAREST).save('study/ref_native_x12.png')
