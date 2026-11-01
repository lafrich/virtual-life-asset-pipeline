"""render ground sprites (ground/, k=GK, shadow alpha 56, pivot = ground point) and 32x32 icons (icons/, no shadow)"""
import os, json, numpy as np
from PIL import Image
import items as IT
from engine import Spr, crop
OUT = 'assets/item_temuan'
def draw(fn, kw, k, shadow=True, W=260, H=260):
    sp = Spr(W, H, W // 2, int(H * 0.62)); I = IT.It(sp, 0.0, 0.0, k)
    if not shadow: I.shadow = lambda *a, **kw_: None
    fn(I, **kw); o, g = sp.render()
    return o, (sp.X(0, 0), sp.Y(0, 0))
def bbox(a):
    ys, xs = np.nonzero(a[..., 3]); return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
def ground(fn, kw):
    o, piv = draw(fn, kw, IT.GK); x0, y0, x1, y1 = bbox(o)
    if (x1 - x0) % 2: x1 += 1
    return Image.fromarray(o[y0:y1, x0:x1]), [int(piv[0] - x0), int(piv[1] - y0)]
def icon(fn, kw):
    o, _ = draw(fn, kw, IT.GK, shadow=False); x0, y0, x1, y1 = bbox(o)
    k = IT.GK * min(28 / (x1 - x0), 28 / (y1 - y0))
    for _ in range(12):
        o, _ = draw(fn, kw, k, shadow=False, W=400, H=400); x0, y0, x1, y1 = bbox(o)
        if x1 - x0 <= 30 and y1 - y0 <= 30: break
        k *= 0.93
    a = o[y0:y1, x0:x1]; out = np.zeros((32, 32, 4), np.uint8)
    ox = (32 - a.shape[1]) // 2; oy = (32 - a.shape[0]) // 2
    out[oy:oy + a.shape[0], ox:ox + a.shape[1]] = a
    return Image.fromarray(out), round(k, 2)
if __name__ == '__main__':
    os.makedirs(f'{OUT}/icons', exist_ok=True); os.makedirs(f'{OUT}/ground', exist_ok=True)
    man = {}
    for id_, e in IT.M.items():
        for v, kw in e['varian'].items():
            key = id_ + (f'_{v}' if v else '')
            g, piv = ground(e['fn'], kw); g.save(f'{OUT}/ground/{key}.png')
            ic, k = icon(e['fn'], kw); ic.save(f'{OUT}/icons/{key}.png')
            man[key] = {'item': id_, 'varian': v or None, 'ground': f'ground/{key}.png', 'ground_size': list(g.size), 'ground_pivot': piv, 'icon': f'icons/{key}.png', 'icon_scale_k': k}
            print(key, g.size, piv, k)
    json.dump(man, open(f'{OUT}/_work/_sprites.json', 'w'), indent=1)
