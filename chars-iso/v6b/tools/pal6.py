#!/usr/bin/env python3
"""colour presets for the creator part library (key code -> hex), written to parts6/pal6.json; also a reference compositor."""
import os, json, sys
import numpy as np
from PIL import Image
D = os.path.join(os.path.dirname(__file__), '..', 'live', 'parts6')
hx = lambda c: tuple(int(c.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4))
H = lambda t: '#%02X%02X%02X' % tuple(max(0, min(255, int(round(v)))) for v in t)
mix = lambda a, b, t: tuple(a[i] + (b[i] - a[i]) * t for i in range(3))
tone = lambda c, v: tuple(x * v for x in c)
W = (255, 255, 255)
def hair(base, hi=None):
    b = hx(base); h4 = hx(hi) if hi else mix(b, W, .30)
    return [H(tone(b, .40)), H(tone(b, .66)), H(tone(b, .84)), H(b), H(h4)]
HAIR = {'black': ['#0F0E0E', '#1C1A1A', '#242121', '#2E2A2A', '#4C4644'],
        'navy': ['#10141B', '#1C2330', '#232A38', '#2A3242', '#3E5A88'],
        'brown': hair('#5C3B25', '#8A6040'), 'chestnut': hair('#86432A', '#B46A44'), 'blonde': hair('#D8B25A', '#F4DE9A'),
        'red': hair('#A33A26', '#D2663E'), 'white': hair('#C9CDD3', '#F2F4F7'), 'pink': hair('#D97BA0', '#F4B3CC')}
SKIN0 = {'i': '#F1D3B5', 'h': '#EBC8A8', 'e': '#E0AE8A', 'a': '#D9A47E', '7': '#A8704E', '5': '#8A5A3C'}
def skin(base):
    b = hx(base); r = hx(SKIN0['i'])
    return {k: H(tuple(b[j] * hx(v)[j] / r[j] for j in range(3))) for k, v in SKIN0.items()}
SKIN = {'porcelain': skin('#F8E4D6'), 'light': dict(SKIN0), 'tan': skin('#E3B791'), 'medium': skin('#C99364'), 'brown': skin('#9A6644'), 'deep': skin('#66412B')}
TOPC = {'charcoal': '#2A3242', 'white': '#ECEFF3', 'navy': '#22355E', 'red': '#B8352E', 'green': '#3E7A4E', 'mustard': '#D9A43A', 'sky': '#7FB2DE', 'pink': '#E59AB5'}
PANTC = {'slate': '#3A4458', 'night': '#1C2330', 'denim': '#4A6A9A', 'khaki': '#B49A6A', 'olive': '#5D6438', 'grey': '#7A7F88'}
SHOEC = {'walnut': '#5A412F', 'black': '#24252B', 'white': '#E9E7E2', 'red': '#B8352E', 'navy': '#22355E', 'tan': '#A87A4E'}
def shirt(c): c = hx(c); return [H(mix(c, W, .10)), H(c), H(tone(c, .90)), H(tone(c, .72)), H(tone(c, .62))]
def outer(c): c = hx(c); return [H(c), H(tone(c, .90)), H(tone(c, .82)), H(tone(c, .72)), H(tone(c, .64))]
def pants(c): c = hx(c); return [H(mix(c, W, .10)), H(c), H(tone(c, .88)), H(tone(c, .70))]
def shoes(c): c = hx(c); light = sum(c) > 500; return [H(c), H(tone(c, .85)), H(mix(c, W, .12)), '#B4B0A8' if light else '#E8E6E0']
PAL = {'hair': HAIR, 'skin': SKIN, 'top': {k: {'C': shirt(v), 'O': outer(v)} for k, v in TOPC.items()}, 'pants': {k: pants(v) for k, v in PANTC.items()},
       'shoes': {k: shoes(v) for k, v in SHOEC.items()}, 'swatch': {'hair': {k: v[3] for k, v in HAIR.items()}, 'skin': {k: v['i'] for k, v in SKIN.items()},
       'top': TOPC, 'pants': PANTC, 'shoes': SHOEC}, 'inner_dark': shirt('#1C2330'), 'inner_light': shirt('#ECEFF3'), 'glasses': '#4C5468'}

def colmap(ch):
    """key code -> rgb for a character (same rules as the JS composer)"""
    hm = HAIR[ch['hairColor']]; sk = SKIN[ch['skin']]; tc = ch['topColor']; T = PAL['top'][tc]
    m = {f'H{i}': hm[i] for i in range(5)}; m['B'] = hm[0]; m['Mu'] = hm[1]
    m.update({'K' + k: v for k, v in sk.items()})
    m['St'] = H(mix(hx(sk['i']), hx(hm[1]), .16)); m['St2'] = H(mix(hx(sk['i']), hx(hm[1]), .28))
    card = ch['top'].startswith('cardigan')
    C = (PAL['inner_dark'] if sum(hx(TOPC[tc])) > 360 else PAL['inner_light']) if card else T['C']
    O = T['O'] if card else [C[1], C[2], C[3], C[3], C[4]]
    m.update({f'C{i + 1}': C[i] for i in range(5)}); m.update({f'O{i + 1}': O[i] for i in range(5)})
    m['OD'] = '#2A3242' if tc == 'white' else '#ECF0F4'
    p = PAL['pants'][ch['pantsColor']]; m.update({f'P{i + 1}': p[i] for i in range(4)})
    s = PAL['shoes'][ch['shoesColor']]; m.update({'S0': s[0], 'S1': s[1], 'S2': s[2], 'S3': s[3]})
    m['GL'] = PAL['glasses']
    return m

def compose(ch, faceset='baked'):
    K = json.load(open(os.path.join(D, 'keys.json')))
    fr = K['fringe'][ch['hair']]; ld = lambda p: Image.open(os.path.join(D, p)).convert('RGBA') if os.path.getsize(os.path.join(D, p)) > 100 else None
    fs = faceset; lash = 'f' if ch.get('body') == 'female' else 'm'
    b = '_f' if lash == 'f' else ''      # female body template: own body / clothes sheets
    L = [f'hair/{ch["hair"]}_back.png', f'base/body{b}.png', f'top/{ch["top"]}_back{b}.png', f'shoes/{ch["shoes"]}{b}.png', f'pants/{ch["pants"]}{b}.png',
         f'shoes/{ch["shoes"]}_over{b}.png' if ch['shoes'] in ('boots', 'hightops') else None, f'top/{ch["top"]}{b}.png', f'base/body_front{b}.png',
         f'face/{lash}_{fs}.png', (f'facial/{ch["facial"]}' + ('_surpr' if fs == 'surpr' else '') + '.png') if ch.get('facial', 'none') != 'none' else None,
         f'hair/{ch["hair"]}_front.png', f'glasses/{ch["glasses"]}.png' if ch.get('glasses', 'none') != 'none' else None, f'brows/{fr}_{fs}.png']
    o = Image.new('RGBA', (384, 4928))
    for p in L:
        if p and (im := ld(p)) is not None: o.alpha_composite(im)
    a = np.array(o); km = {hx(v): k for k, v in K['keys'].items()}; cm = colmap(ch)
    rgb = a[..., :3].astype(np.int32); packed = (rgb[..., 0] << 16) | (rgb[..., 1] << 8) | rgb[..., 2]
    for kc, code in km.items():
        m = (packed == ((kc[0] << 16) | (kc[1] << 8) | kc[2])) & (a[..., 3] == 255)
        if m.any(): a[m, :3] = hx(cm[code])
    out = Image.new('RGBA', o.size); out.alpha_composite(Image.open(os.path.join(D, 'base/shadow.png')).convert('RGBA')); out.alpha_composite(Image.fromarray(a, 'RGBA'))
    out.alpha_composite(Image.open(os.path.join(D, 'base/fx.png')).convert('RGBA'))
    return out

if __name__ == '__main__':
    json.dump(PAL, open(os.path.join(D, 'pal6.json'), 'w'), indent=1); print('pal6.json')
    if len(sys.argv) > 2:
        ch = json.loads(sys.argv[1]); compose(ch, sys.argv[3] if len(sys.argv) > 3 else 'baked').save(sys.argv[2]); print('saved', sys.argv[2])
