import numpy as np
L = np.load('study/ref_labels.npy'); m = np.load('study/ref_mask.npy'); c = np.load('study/ref_blocks.npy'); pal = np.load('study/ref_palette.npy')
sym = '0123456789abcdefghijklmnopqrstuvwxyz'
lab = np.vectorize(lambda k: sym[k])(L)
H, W = L.shape; S = np.full((H, W), '.', '<U1')
green = (c[..., 1] - c[..., 0] > 8) & m
for y in range(H):
    for x in range(W):
        if not m[y, x]: continue
        l = lab[y, x]
        if green[y, x]: S[y, x] = 'G'; continue
        if y <= 22 and l in '01234':
            S[y, x] = 'E' if (13 <= y <= 15 and (10 <= x <= 15 or 18 <= x <= 21)) else 'H'
        elif y <= 16 and 13 <= y and l in 'jgk' : S[y, x] = 'W'
        elif y <= 23 and l in 'iheа7a5' and not (y >= 21 and l in 'dgbkj'):
            S[y, x] = 'S'
        elif y <= 23 and l in 'ihea75': S[y, x] = 'S'
        elif 21 <= y <= 39 and l in 'kjgdb': S[y, x] = 'C'
        elif 23 <= y <= 38 and 12 <= x <= 18 and l in '6958f': S[y, x] = 'T'
        elif y <= 42 and l in 'ihea75': S[y, x] = 'S'
        elif y >= 39 and l in 'c9864f': S[y, x] = 'P'
        elif y >= 64 and l in '02': S[y, x] = 'O'
        else: S[y, x] = '?'
# facial features
S[19, 15:18] = 'M'
for x in (10, 11, 20, 21): S[17, x] = 'B'
S[17, 17] = 'N'
np.save('study/ref_sem.npy', S)
for y in range(H): print('%2d ' % y + ''.join(S[y]) + '   ' + ''.join(lab[y, x] if m[y, x] else '.' for x in range(W)))
