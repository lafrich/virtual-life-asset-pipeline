#!/usr/bin/env python3
"""Pixel diff between a generated sheet and the game's sheet (RGBA exact). Usage: python3 tools/diff_sheet.py NEW.png GAME.png
Prints the number of differing pixels (goal for regenerated game characters: 0) and writes NEW.diff.png (red = different)."""
import sys, numpy as np
from PIL import Image
a = np.array(Image.open(sys.argv[1]).convert('RGBA')); b = np.array(Image.open(sys.argv[2]).convert('RGBA'))
if a.shape != b.shape: print('size differs', a.shape, b.shape); sys.exit(2)
d = np.any(a != b, axis=2); n = int(d.sum()); print(f'{n} px differ of {d.size}')
if n:
    o = a.copy(); o[d] = (255, 0, 0, 255); Image.fromarray(o).save(sys.argv[1].rsplit('.', 1)[0] + '.diff.png')
sys.exit(0 if n == 0 else 1)
