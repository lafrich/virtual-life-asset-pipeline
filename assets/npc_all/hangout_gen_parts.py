import sys, os, numpy as np
who = sys.argv[1]; O = '/tmp/npcparts'
EX = ('neutral','happy','surprised','angry')
if who == 'gfunk':
    sys.path.insert(0, 'assets/npc_gfunk'); import make_gfunk as G
    for v in ('se','sw'):
        for e in EX:
            for i, f in enumerate(G.frames(v, 'idle', e)): f.save(f'{O}/gfunk_{v}_idle_{e}_f{i}.png')
elif who == 'yerbies':
    sys.path.insert(0, 'assets/npc_yerbies'); import make_yerbies as Y
    for v in ('se','sw'):
        for e in EX:
            for i, f in enumerate(Y.frames(v, 'idle', e)): f.save(f'{O}/yerbies_{v}_idle_{e}_f{i}.png')
else:
    sys.path.insert(0, 'assets/npc_theodore'); import make_theodore as T
    for v in ('se','sw'):
        for e in EX:
            for i in range(4): T.frame(v, 'idle', i, e).save(f'{O}/theodore_{v}_idle_{e}_f{i}.png')
