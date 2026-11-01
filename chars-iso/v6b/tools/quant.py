import numpy as np
from PIL import Image
c = np.load('study/ref_blocks.npy'); m = np.load('study/ref_mask.npy')
pts = c[m]
# simple k-means
rng = np.random.default_rng(0); K = 26
cent = pts[rng.choice(len(pts), K, replace=False)]
for it in range(60):
    d = ((pts[:, None] - cent[None]) ** 2).sum(-1); lab = d.argmin(1)
    for k in range(K):
        if (lab == k).any(): cent[k] = pts[lab == k].mean(0)
# merge near-duplicates
cent = cent[np.argsort(cent.sum(1))]
keep = []
for cc in cent:
    if all(np.abs(cc - k).sum() > 18 for k in keep): keep.append(cc)
cent = np.array(keep)
d = ((c[..., None, :] - cent[None, None]) ** 2).sum(-1); L = d.argmin(-1)
sym = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJ'
print(len(cent), 'colours')
for k, cc in enumerate(cent): print(sym[k], '#%02X%02X%02X' % tuple(int(v) for v in cc), int((L[m] == k).sum()))
for j in range(L.shape[0]):
    print('%2d ' % j + ''.join(sym[L[j, i]] if m[j, i] else '.' for i in range(L.shape[1])))
q = np.zeros(c.shape[:2] + (4,), np.uint8); q[..., :3] = cent[L].clip(0, 255); q[..., 3] = m * 255
Image.fromarray(q, 'RGBA').save('study/ref_quant.png'); np.save('study/ref_labels.npy', L); np.save('study/ref_palette.npy', cent)
Image.fromarray(q, 'RGBA').resize((q.shape[1] * 12, q.shape[0] * 12), Image.NEAREST).save('study/ref_quant_x12.png')
