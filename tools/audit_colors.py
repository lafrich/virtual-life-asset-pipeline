#!/usr/bin/env python3
"""Colour + alpha audit for sprites. Usage: python3 tools/audit_colors.py path/or/glob [...]
Known colours = every #RRGGBB in game/index_extract.txt (the live game) + assets/npc_babeh_loak/_tools/known.json
(colours of existing game sprites) + assets/environment/palette.json. Reports opaque colours not in that set and any
alpha other than 0/56/255 (semi-transparent pixels must be pure black shadow at alpha 56).
Note: run it on SPRITES, not on mocks - mocks contain shadow-over-floor blends by design."""
import sys, re, json, glob, os
import numpy as np
from PIL import Image
K = set(h.upper().lstrip('#') for h in re.findall(r'#[0-9A-Fa-f]{6}\b', open('game/index_extract.txt').read()))
for v in json.load(open('assets/npc_babeh_loak/_tools/known.json')).values(): K |= set(x.lstrip('#').upper() for x in v)
def walk(o):
    if isinstance(o, str) and re.fullmatch(r'#?[0-9a-fA-F]{6}', o): K.add(o.lstrip('#').upper())
    elif isinstance(o, dict): [walk(v) for v in o.values()]
    elif isinstance(o, list): [walk(v) for v in o]
if os.path.exists('assets/environment/palette.json'): walk(json.load(open('assets/environment/palette.json')))
files = [f for a in sys.argv[1:] for f in (glob.glob(a, recursive=True) if any(c in a for c in '*?[') else (glob.glob(a + '/**/*.png', recursive=True) if os.path.isdir(a) else [a]))]
new = {}; bad_alpha = {}; bad_shadow = 0
for p in files:
    a = np.array(Image.open(p).convert('RGBA')).reshape(-1, 4)
    al = set(np.unique(a[:, 3]).tolist()) - {0, 56, 255}
    if al: bad_alpha[p] = sorted(al)
    semi = a[(a[:, 3] > 0) & (a[:, 3] < 255)]; bad_shadow += int((semi[:, :3] != 0).any(axis=1).sum())
    for c in np.unique(a[a[:, 3] == 255][:, :3], axis=0):
        h = '%02X%02X%02X' % tuple(c)
        if h not in K: new.setdefault('#' + h, []).append(os.path.basename(p))
print(f'{len(files)} files | known colours {len(K)}')
print('new colours:', {k: (len(v), v[:3]) for k, v in new.items()} or 'none')
print('alpha outside 0/56/255:', bad_alpha or 'none'); print('semi-transparent pixels that are not black:', bad_shadow)
sys.exit(1 if (new or bad_alpha or bad_shadow) else 0)
