"""Karakter spawn_hobo: Ichsan (live_v6b + v6b/live/chars/ichsan.json, sama dengan sheet game) dan NPC generik (npc_v6b lewat
job_common.render). Outfit 'lusuh' = overlay di atas layer generator (wajah, rambut, kacamata, badan tidak diubah):
jaket kanvas lusuh terbuka (ramp khaki yang sudah ada), kaus asli tetap terlihat di tengah, ujung jaket berjumbai, sobek kecil,
celana bertambal (ramp kayu) + sobek (kulit terlihat). Pose spawn (rebah, merangkak, berdiri, peregangan, menoleh) memakai
lie_flat milik generator, squat_legs + limb() dari anim_ambil_barang / babeh loak."""
import os, sys, json, math, copy
sys.path.insert(0, 'assets/anim_ambil_barang')
import make_anim_ambil_barang as AB
from make_anim_ambil_barang import *            # lv, JC, limb, squat_legs, shift, torso_cols, shadow, put, tube, disk, shade, over, X, H, FW, FH ...
ICH = AB.ICH; NPC = dict(AB.NPC)
GAME_SHEET = AB.GAME_SHEET
KH = [tuple(c) for c in X('#BCA479', '#B49A6A', '#9E885D', '#7E6C4A', '#5E4636')]      # jaket (khaki babeh, terang -> gelap)
PATCH = [tuple(c) for c in X('#B48455', '#94704F', '#6B4F3A')]                         # tambalan (WOOD)
STITCH = tuple(X('#E8DEC6')[0])
SKINR = [tuple(c) for c in X('#E0AE8A', '#A8704E')]                                    # kulit di sobekan (skin_map ichsan)
LAYS = ['hair_back', 'body', 'arm_far', 'shoes', 'pants', 'shoes_over', 'rips', 'shirt', 'shirt_graphic', 'outer', 'acc', 'arm_near', 'body_front', 'held', 'face', 'hair_front', 'glasses', 'brows']
# ------------------------------------------------------------------ generator layers for any anim/frame/view
def ich_layers(anim='idle', f=0, view='se', expr='neutral'):
    C = ICH; O = C['outfits'][C['default_outfit']]; gl = C.get('glasses_default', False)
    se, pal = lv.build_char_layers(C, O); ne = lv.back_layers(se, C, O)
    for k in '01234': pal.setdefault('H' + k, lv.REFPAL[k])
    kind = lv.KIND[anim]
    P = lv.pose_layers(se if view == 'se' else ne, kind, f, view, C, O)
    for mk, mp in pal['_maps'].items(): P[mk] = lv.recolor(P[mk], mp)
    rg = {k: lv.to_img(v, pal) for k, v in P.items() if k not in ('face', 'brows', 'acc_head')}
    imgs = {k: np.array(v) for k, v in lv.frame_img(rg).items()}
    bob = (-1 if f in (2, 3) else 0) if kind in ('idle', 'talk') else ((-1 if f in (1, 4) else 0) if kind == 'walk' else 0)
    F, B, G = lv.face_layer(expr, C, view, 0, bob, gl, 0)
    fi = {k: np.array(v) for k, v in lv.frame_img({'f': lv.to_img(F, pal), 'b': lv.to_img(B, pal), 'g': lv.to_img(G, pal)}).items()}
    imgs['face'] = fi['f']; imgs['brows'] = fi['b']; imgs['glasses'] = fi['g']
    return imgs, pal
def npc_layers(anim='idle', f=0, view='se', expr='neutral'):
    imgs, pal, bob = JC.render(NPC, anim, f, view, expr); return imgs, pal
LAYERS = {'ichsan': ich_layers, 'npc': npc_layers}
CHARS = {'ichsan': dict(top_style='tee'), 'npc': dict(top_style='tee')}
def compose(L, order=None, sh=True):
    im = Image.fromarray(shadow()) if sh else Image.new('RGBA', (FW, FH))
    for k in (order or LAYS):
        if k in L and L[k] is not None: im.alpha_composite(Image.fromarray(L[k]))
    return im
# ------------------------------------------------------------------ outfit lusuh (overlay)
def _cmap(pal):
    C = [tuple(int(v) for v in pal[k][:3]) for k in ('C1', 'C2', 'C3', 'C4', 'C5')]
    return {c: KH[i] for i, c in enumerate(C)}
def rag_pal(pal):
    p = dict(pal)
    for i, k in enumerate(('C1', 'C2', 'C3', 'C4', 'C5')): p[k] = KH[i]
    return p
def _remap(a, cm, keep=None):
    a = a.copy(); ys, xs = np.nonzero(a[..., 3])
    for y, x in zip(ys, xs):
        c = tuple(int(v) for v in a[y, x, :3])
        if c in cm and not (keep is not None and keep(x, y)): a[y, x, :3] = cm[c]
    return a
def rag(L, pal, view, legs_key='pants'):
    """jaket lusuh di atas kaus + celana bertambal. view: se/ne (sebelum mirror)."""
    cm = _cmap(pal); L = dict(L)
    sh = L['shirt']
    if not sh[..., 3].any(): return L
    ys, xs = np.nonzero(sh[..., 3]); y0, y1 = ys.min(), ys.max()
    try: tx0, tx1 = torso_cols(sh, min(67, y1 - 2))
    except Exception: tx0, tx1 = xs.min(), xs.max()
    cx = (tx0 + tx1) / 2
    keep = (lambda x, y: abs(x + .5 - cx - .5) <= 2.0 and y >= y0 + 2) if view == 'se' else None
    jac = _remap(sh, cm, keep)
    if view == 'se':                                                    # tepi jaket (kerah terbuka) = tone gelap khaki
        for y in range(y0 + 2, y1 + 1):
            for x in (int(round(cx - 2.5)), int(round(cx + 3.5))):
                if 0 <= x < FW and jac[y, x, 3] and tuple(jac[y, x, :3]) in KH: jac[y, x, :3] = KH[3]
    # ujung jaket berjumbai: kolom berselang dipotong / diperpanjang 1 px
    for x in range(FW):
        col = np.nonzero(jac[:, x, 3])[0]
        if not len(col): continue
        yb = col.max()
        if tuple(jac[yb, x, :3]) not in KH: continue
        if x % 3 == 0: jac[yb, x, 3] = 0
        elif x % 3 == 1 and yb + 1 < FH: jac[yb + 1, x] = (*KH[4], 255)
    # sobek kecil + noda
    for (dx, dy, c) in ((2, 10, KH[4]), (3, 10, KH[4]), (3, 11, KH[3]), (-3, 6, KH[3])):
        x = int((tx0 if dx > 0 else tx1) + dx); y = int(y0 + dy)
        if 0 <= x < FW and 0 <= y < FH and jac[y, x, 3] and tuple(jac[y, x, :3]) in KH: jac[y, x, :3] = c
    L['shirt'] = jac
    for k in ('arm_near', 'arm_far', 'body_front', 'outer'):
        if k in L and L[k] is not None: L[k] = _remap(L[k], cm)
    if legs_key in L and L[legs_key] is not None: L[legs_key] = patch_pants(L[legs_key])
    return L
def patch_pants(p, stitch=True):
    """tambalan kayu di lutut kaki kiri layar + sobekan kulit di kaki kanan layar (hanya di piksel celana yang ada)"""
    if p is None or not p[..., 3].any(): return p
    p = p.copy(); ys, xs = np.nonzero(p[..., 3]); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    py0 = y0 + max(6, (y1 - y0) // 2 - 2)
    for y in range(py0, py0 + 4):
        for x in range(x0 + 1, x0 + 5):
            if p[y, x, 3]:
                edge = y in (py0, py0 + 3) or x in (x0 + 1, x0 + 4)
                p[y, x, :3] = PATCH[2] if edge else (PATCH[0] if x == x0 + 2 else PATCH[1])
    for (x, y) in (((x0 + 1, py0), (x0 + 4, py0 + 3)) if stitch else ()):
        if p[y, x, 3]: p[y, x, :3] = STITCH
    ry = y0 + max(4, (y1 - y0) // 3)
    for (x, y, c) in ((x1 - 3, ry, SKINR[0]), (x1 - 2, ry, SKINR[0]), (x1 - 3, ry + 1, SKINR[1])):
        if 0 <= y < FH and p[y, x, 3]: p[y, x, :3] = c
    return p
# ------------------------------------------------------------------ plain anim frame (idle / walk), outfit default or lusuh
def anim_frame(char, anim, f, view, ragged=True, expr='neutral'):
    base = 'se' if view in ('se', 'sw') else 'ne'; L, pal = LAYERS[char](anim, f, base, expr)
    if ragged: L = rag(L, pal, base)
    im = compose(L)
    return im.transpose(Image.FLIP_LEFT_RIGHT) if view in ('sw', 'nw') else im
def check_identity():
    g = np.array(Image.open(GAME_SHEET).convert('RGBA')); res = {}
    for anim, r0, f in (('idle', 4, 0), ('walk', 0, 1), ('idle', 4, 2)):
        for di, v in enumerate(('se', 'sw', 'ne', 'nw')):
            a = np.array(anim_frame('ichsan', anim, f, v, ragged=False, expr='neutral'))
            b = g[(r0 + di) * 112:(r0 + di + 1) * 112, f * 64:(f + 1) * 64]; res[f'{anim}_f{f}_{v}'] = int(np.any(a != b, axis=2).sum())
    return res
if __name__ == '__main__':
    print(check_identity())
