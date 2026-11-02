#!/usr/bin/env python3
"""Virtual Office - floating astronaut/alien NPC preview v2 (PREVIEW ONLY, not integrated).
Base body, head, face, hair, arms, legs, boots and shading come from the SAME generator as the live v6b characters
(chars-iso/v6b/tools/npc_v6b.py + live_v6b.py, approved 31 Oct 2026; base6.py reproduces the
live grok_bot idle frame pixel-for-pixel). This script only adds the space layer on top: bubble helmet, neck ring,
belt, chest panel, gloves, raised reaching arm, props, alien heads/faces and the float offset + separated shadow."""
import os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import base6, npc_v6b as nv, live_v6b as lv, pal6
OUT = os.path.dirname(os.path.abspath(__file__))
FW, FH = 64, 112
hx = lambda s: tuple(int(s.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4))
# ---- colours (project palette first; extras listed in README)
GLASS_FILL = hx('#2A3242'); GLASS_LT = hx('#B9C0CC'); GLASS_MD = hx('#8D97A8'); GLASS_DK = hx('#5A6577'); SPEC = hx('#E7EBF2')
MET = [hx('#E7EBF2'), hx('#B9C0CC'), hx('#8D97A8'), hx('#5A6577')]            # neck ring / belt (cool grey metal)
GLOVE = {'Ki': hx('#E7EBF2'), 'Kh': hx('#D0D4DA'), 'Ke': hx('#D0D4DA'), 'Ka': hx('#A6A9AE'), 'K7': hx('#70757E'), 'K5': hx('#70757E')}
BRASS = [hx('#FFD166'), hx('#E0A526'), hx('#C99A2E'), hx('#6B5320')]
PANEL = hx('#3A4458'); LED_A = hx('#FFD166'); LED_B = hx('#7194BE')
RED = hx('#E5484D'); RED_DK = hx('#8E1F24'); VOID = hx('#1C2330')
# extra suit / skin colours (not in the v6b creator list) go through the generator's own ramp functions
nv.CL.update({'ember': '#CF7440', 'oxbred': '#9A3A40', 'teal': '#6FA9A9', 'brass': '#B8914A'})   # muted to sit with the live v6b tops
nv.HR.update({'blonde': pal6.HAIR['blonde'], 'chestnut': pal6.HAIR['chestnut']})
nv.SK.update({'alien_green': pal6.skin('#8FC46E'), 'alien_lav': pal6.skin('#C2B0DE'), 'robot': pal6.skin('#D9DEE7')})

NPCS = [
 ('1_cosmo',    'Cosmo',    dict(body='m', skin='light',  hair='short', hc='blonde',   top='tee_long', tc='ember',  pants='trousers', pc='ember',  shoes='boots', sc='paper'), dict(prop='bubble')),
 ('2_rocketta', 'Rocketta', dict(body='f', skin='deep',   hair='mid',   hc='black',    top='tee_long', tc='oxbred', pants='trousers', pc='oxbred', shoes='boots', sc='paper'), dict(prop='rocket')),
 ('3_sol',      'Sol',      dict(body='m', skin='medium', hair='swept', hc='chestnut', top='tee_long', tc='teal',   pants='trousers', pc='teal',   shoes='boots', sc='paper'), dict(prop='planet')),
 ('4_zib',      'Zib',      dict(body='m', skin='alien_green', hair='short', hc='black', top='tee_long', tc='paper', pants='trousers', pc='paper', shoes='boots', sc='black'), dict(prop='bubble', alien='zib')),
 ('5_klank',    'Klank',    dict(body='m', skin='robot',  hair='short', hc='black',    top='tee_long', tc='steel',  pants='trousers', pc='steel',  shoes='boots', sc='paper'), dict(prop='planet', alien='klank')),
 ('6_nebi',     'Nebi',     dict(body='f', skin='alien_lav', hair='short', hc='black', top='tee_long', tc='brass',  pants='trousers', pc='brass',  shoes='boots', sc='paper'), dict(prop='rocket', alien='nebi')),
]

def A(im): return np.array(im)
def put(a, x, y, c):
    if 0 <= x < FW and 0 <= y < FH: a[y, x, :3] = c; a[y, x, 3] = 255

def bald(L, pal):
    """alien / robot head: the hair silhouette becomes a skin dome, shaded like the v6b skin (left lit, right shade, darker edge)"""
    h = A(L['hair_front']); m = h[..., 3] == 255
    ys, xs = np.nonzero(m); cx = (xs.min() + xs.max()) / 2
    # The native v6b BACK hairstyle stops at the hairline (and deliberately
    # carves pixels out of row 17). Recoloring only those hair pixels creates
    # the missing lower skull / severed-looking neck in bald NE and NW views.
    # Restore a narrow, rounded nape in SKIN COLORS, following each posed
    # head's real offset rather than drawing a fixed row of pixels.
    rear = L.get('face') is not None and not np.any(A(L['face'])[..., 3])
    if rear and len(ys):
        last = int(ys.max())
        left, right = int(xs.min()), int(xs.max())
        half = (right - left) / 2
        # Complete the actual rear scalp curve, tapering toward the neck.
        # The body underneath already has the 7-pixel skin neck.
        for dy,scale in ((0,.82),(1,.78),(2,.69),(3,.54),(4,.35)):
            y = last + dy
            if y >= FH: break
            x0 = max(0,int(round(cx-half*scale)))
            x1 = min(FW-1,int(round(cx+half*scale)))
            for x in range(x0,x1+1):
                m[y,x] = True
                if h[y,x,3] == 0: h[y,x] = (*pal['Ki'],255)
    full = Image.new('RGBA', (FW, FH))
    for v in L.values(): full.alpha_composite(v)
    body = A(full)[..., 3] == 255
    for y, x in zip(ys, xs):
        nb = [(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, -1))]
        edge = any(not (m[q[1], q[0]] or body[q[1], q[0]]) for q in nb)
        if edge: c = pal['K7']
        elif x >= xs.max() - 2: c = pal['Ke']
        elif x > cx + 3: c = pal['Kh']
        else: c = pal['Ki']
        h[y, x, :3] = c
    L['hair_front'] = Image.fromarray(h)
    br = A(L['brows']); br[...] = 0; L['brows'] = Image.fromarray(br)

def gloves(L, pal):
    for k in ('arm_far', 'arm_near'):
        a = A(L[k])
        for code, g in GLOVE.items():
            m = np.all(a[..., :3] == pal[code], axis=2) & (a[..., 3] == 255); a[m, :3] = g
        L[k] = Image.fromarray(a)

def reach_arm(pal):
    """near arm raised up and out to the screen-left (se view), drawn in the v6b arm language: 3 px band
    (edge O4 / base O1 / shade O2 on sleeves), hand = 3x3 with the edge on its right + top, glove tones"""
    a = np.zeros((FH, FW, 4), np.uint8)
    O4, O1, O2 = pal['O4'], pal['O1'], pal['O2']
    for y in range(55, 65):
        x0 = 22 - (64 - y) // 2 if y < 64 else 22
        for j, c in enumerate((O4, O1, O2)): put(a, x0 + j, y, c)
    put(a, 18, 54, O4); put(a, 19, 54, O4)
    for y in range(51, 54):                           # glove
        for x in range(16, 19):
            put(a, x, y, GLOVE['K7'] if (x == 18 or y == 51) else (GLOVE['Ki'] if x == 16 else GLOVE['Kh']))
    put(a, 15, 52, GLOVE['K7']); put(a, 15, 53, GLOVE['Kh'])      # thumb
    for x in range(16, 20): put(a, x, 54, GLOVE['Ka'])          # cuff
    return Image.fromarray(a)

def face(L, pal, kind):
    f = A(L['face']); lid = hx('#30231B'); eye = hx('#312827'); wh = hx('#CCC7BF')
    if kind is None: return
    m = lambda c: np.all(f[..., :3] == c, axis=2) & (f[..., 3] == 255)
    if kind == 'zib':                                 # big glossy alien eyes, no whites / lid
        for c in (lid, eye, wh): f[m(c), :3] = pal['Ki']
        for (x0, w) in ((29, 4), (37, 3)):
            for y in range(44, 48):
                for x in range(x0, x0 + w):
                    if (y == 47 and x in (x0, x0 + w - 1)): continue
                    put(f, x, y, VOID if y < 47 else hx('#10141B'))
            put(f, x0, 44, SPEC)
        mo = m(pal['K7']); ys, xs = np.nonzero(mo & (np.arange(FH)[:, None] == 50))
        for x in xs: put(f, x, 50, pal['Ki'])
        put(f, 34, 50, pal['K7']); put(f, 35, 50, pal['K7'])
    elif kind == 'nebi':                              # normal v6b eyes + a third eye on the forehead
        pass                                          # third eye is drawn over the dome in head_extras
    elif kind == 'klank':                             # skull: dark sockets, red eyes, nose hole, teeth
        for c in (lid, eye, wh): f[m(c), :3] = pal['Ki']
        for (x0, w) in ((29, 5), (37, 4)):
            for y in range(44, 48):
                for x in range(x0, x0 + w):
                    if y == 47 and x in (x0, x0 + w - 1): continue
                    put(f, x, y, VOID)
        for x in (30, 31): put(f, x, 45, RED)
        put(f, 30, 46, RED_DK); put(f, 31, 46, RED_DK)
        put(f, 38, 45, RED); put(f, 38, 46, RED_DK)
        put(f, 35, 48, VOID); put(f, 34, 49, VOID); put(f, 35, 49, VOID)
        for x in range(31, 39): put(f, x, 50, VOID if x % 2 else pal['Ki']); put(f, x, 51, VOID)
        for x in range(31, 39, 2): put(f, x, 51, pal['Kh'])
    L['face'] = Image.fromarray(f)

def head_extras(a, kind, pal):
    if kind == 'nebi':                                # third eye (same lid / eye / white language) + two short nubs
        lid, eye, wh = hx('#30231B'), hx('#312827'), hx('#CCC7BF')
        for x in range(32, 37): put(a, x, 38, lid)
        for x in range(33, 36): put(a, x, 39, eye); put(a, x, 40, eye)
        put(a, 32, 40, wh); put(a, 36, 40, wh)
        for x in (27, 38):
            for y in (29, 30, 31): put(a, x, y, pal['Ke'] if y > 29 else pal['K7'])
            put(a, x + 1, 30, pal['Ki']); put(a, x + 1, 31, pal['Ki']); put(a, x + 1, 29, pal['K7'])
    if kind == 'zib':
        for x in (28, 37):
            put(a, x, 31, pal['K7']); put(a, x + 1, 30, pal['K7']); put(a, x + 1, 31, pal['Ki'])
            put(a, x + 1, 29, pal['K7']); put(a, x + 2, 28, pal['K7']); put(a, x + 2, 29, pal['Ka'])

CX, CY, R = 32.5, 42.0, 14.6   # helmet centre / radius (frame px) - head is x 22-44, y 32-53

def helmet_back(a):
    for y in range(26, 55):
        for x in range(16, 50):
            d = math.hypot(x + .5 - CX, y + .5 - CY)
            if d < R - .5 and a[y, x, 3] == 0: put(a, x, y, GLASS_FILL)

def helmet_front(a):
    for y in range(24, 56):
        for x in range(14, 52):
            d = math.hypot(x + .5 - CX, y + .5 - CY)
            if R - .5 <= d < R + .6 and y <= 53:
                ang = math.degrees(math.atan2(y + .5 - CY, x + .5 - CX))
                c = GLASS_LT if -170 < ang < -60 else (GLASS_DK if 0 < ang < 120 else GLASS_MD)
                put(a, x, y, c)
            if R - 2.6 <= d < R - 1.4 and -158 < math.degrees(math.atan2(y + .5 - CY, x + .5 - CX)) < -118:
                put(a, x, y, SPEC)
    put(a, 24, 39, SPEC)                               # one specular dot (glass allowed 1 highlight)
    # neck ring (cool-grey metal, 3 values, lit left), sits on the shoulders and closes the bubble
    for y, row in ((52, 1), (53, 0), (54, 2), (55, 3)):
        for x in range(22, 44):
            if y == 52 and not (24 <= x <= 41): continue
            c = MET[row]
            if row in (0, 1) and x >= 38: c = MET[row + 1]
            if x in (22, 43) and y > 52: c = MET[3]
            put(a, x, y, c)

def suit(a, L, pal):
    sh = A(L['shirt'])[..., 3] == 255; pa = A(L['pants'])[..., 3] == 255
    py = int(np.nonzero(pa.any(1))[0][0])
    for y in (py - 1, py):                             # belt: 2 rows metal over the waist, brass buckle
        xs = np.nonzero(sh[y] | pa[y])[0]
        for x in xs:
            put(a, x, y, MET[3] if x in (xs[0], xs[-1]) else (MET[1] if y == py - 1 else MET[2]))
    for x, y, c in ((31, py - 1, BRASS[0]), (32, py - 1, BRASS[1]), (31, py, BRASS[2]), (32, py, BRASS[3])): put(a, x, y, c)
    for y in range(58, 62):                            # chest panel, centred (mirror-safe)
        for x in range(29, 35):
            put(a, x, y, MET[3] if (y in (58, 61) or x in (29, 34)) else PANEL)
    put(a, 30, 59, LED_A); put(a, 32, 59, LED_B); put(a, 30, 60, MET[2]); put(a, 31, 60, MET[2]); put(a, 32, 60, MET[2]); put(a, 33, 60, MET[2])

def prop(a, kind):
    if kind == 'bubble':                               # free-floating bubble just past the fingertips + one small one
        for (cx, cy, r) in ((11.5, 45.5, 3.6), (17.0, 40.0, 1.6)):
            for y in range(int(cy - r) - 1, int(cy + r) + 2):
                for x in range(int(cx - r) - 1, int(cx + r) + 2):
                    d = math.hypot(x + .5 - cx, y + .5 - cy)
                    if r - .5 <= d < r + .5:
                        ang = math.degrees(math.atan2(y + .5 - cy, x + .5 - cx))
                        put(a, x, y, GLASS_LT if -180 < ang < -60 else GLASS_MD if ang < 60 else GLASS_DK)
        put(a, 10, 44, SPEC)
    if kind == 'rocket':                               # mini rocket held upright in the glove
        body = [hx('#E7EBF2'), hx('#B9C0CC'), hx('#8D97A8')]
        for y in range(42, 51):
            for j, x in enumerate((16, 17, 18)): put(a, x, y, body[j])
        for y, xs in ((39, (17,)), (40, (16, 17, 18)), (41, (16, 17, 18))):
            for x in xs: put(a, x, y, hx('#A25F44') if x == 16 else hx('#7A2E35') if x == 17 else hx('#5C2231'))
        put(a, 17, 44, hx('#3E6FA8')); put(a, 17, 45, hx('#2F467E'))
        for x, y in ((15, 49), (15, 50), (19, 49), (19, 50)): put(a, x, y, hx('#7A2E35'))
        put(a, 17, 55, hx('#FFD166')); put(a, 16, 55, hx('#FF8A3D')); put(a, 18, 55, hx('#FF8A3D')); put(a, 17, 56, hx('#FF8A3D'))
    if kind == 'planet':                               # tiny planet above the glove, brass ring on a clean 2:1 stair
        cx, cy, r = 13.0, 46.0, 3.3
        P = [hx('#F4A182'), hx('#E8745A'), hx('#A9484C')]
        ring = {(x, 49 - (x - 7) // 2) for x in range(7, 20)}
        for (x, y) in ring:                            # back half of the ring (behind the disc)
            if x >= cx: put(a, x, y, BRASS[2])
        for y in range(41, 51):
            for x in range(8, 19):
                d = math.hypot(x + .5 - cx, y + .5 - cy)
                if d < r: put(a, x, y, P[2] if (d > r - 1 and (x > cx or y > cy)) else P[0] if (x < cx and y < cy) else P[1])
        for (x, y) in ring:                            # front half over the disc
            if x < cx: put(a, x, y, BRASS[1])
        put(a, 12, 44, hx('#FFD166'))

def build(cfg, opt, bob=0):
    o, L, pal = base6.render(cfg)
    if opt.get('alien'): bald(L, pal)
    gloves(L, pal); face(L, pal, opt.get('alien'))
    L['arm_near'] = reach_arm(pal)
    fig = np.zeros((FH, FW, 4), np.uint8); fig_im = Image.fromarray(fig)
    for k, v in L.items(): fig_im.alpha_composite(v)
    a = A(fig_im)
    head_extras(a, opt.get('alien'), pal)
    back = np.zeros_like(a); helmet_back(back)
    im = Image.fromarray(back); im.alpha_composite(Image.fromarray(a)); a = A(im)
    suit(a, L, pal); helmet_front(a); prop(a, opt['prop'])
    return Image.fromarray(a)

FLOAT = (-4, -6)            # frame A / frame B lift (feet 4-6 px above the pivot line, 2 px bob)
def float_frame(fig, lift):
    o = np.zeros((FH, FW, 4), np.uint8); yy, xx = np.mgrid[0:FH, 0:FW]
    rx = 8 if lift == FLOAT[0] else 7                  # higher = smaller shadow; same 0,0,0,56 flat ellipse as v6b
    o[((xx + .5 - 32) / rx) ** 2 + ((yy + .5 - 100.5) / 2.0) ** 2 <= 1] = (0, 0, 0, 56)
    im = Image.fromarray(o); f = Image.new('RGBA', (FW, FH)); f.paste(fig, (0, lift)); im.alpha_composite(f); return im

if __name__ == '__main__':
    import json
    res = {}
    for key, name, cfg, opt in NPCS:
        fig = build(cfg, opt)
        fa, fb = float_frame(fig, FLOAT[0]), float_frame(fig, FLOAT[1])
        fa.save(f'{OUT}/npc_{key}.png')
        strip = Image.new('RGBA', (FW * 2, FH)); strip.paste(fa, (0, 0)); strip.paste(fb, (FW, 0)); strip.save(f'{OUT}/npc_{key}_float_2f.png')
        fa.transpose(Image.FLIP_LEFT_RIGHT).save(f'{OUT}/npc_{key}_sw.png')
        res[key] = (name, fa, fb)
    # --- float-bob GIFs (top 2), 4x on #10141B, 2 frames @ 3 fps like the v6b float row
    BG = (16, 20, 27, 255)
    for key in ('1_cosmo', '5_klank'):
        _, fa, fb = res[key]; fr = []
        for f in (fa, fb):
            c = Image.new('RGBA', (FW, FH), BG); c.alpha_composite(f); fr.append(c.convert('RGB').resize((FW * 4, FH * 4), Image.NEAREST))
        fr[0].save(f'{OUT}/npc_{key}_float_4x.gif', save_all=True, append_images=fr[1:], duration=333, loop=0)
    try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14); small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 11)
    except Exception: font = small = ImageFont.load_default()
    # --- contact sheet 4x
    S = 4; cw, chh = FW * S * 2 + 16, FH * S + 34
    sheet = Image.new('RGBA', (cw * 3 + 16, chh * 2 + 30), BG); d = ImageDraw.Draw(sheet)
    d.text((16, 8), 'VIRTUAL OFFICE  ·  FLOATING NPC PREVIEW v2 (v6b style)  ·  frame A / frame B (2px bob)  ·  4x  ·  64x112, pivot 32,100', fill=(141, 151, 168), font=small)
    for i, (key, name, cfg, opt) in enumerate(NPCS):
        _, fa, fb = res[key]; x0 = 16 + (i % 3) * cw; y0 = 30 + (i // 3) * chh
        d.text((x0, y0), f'{i + 1}  {name.upper()}', fill=(231, 235, 242), font=font)
        for j, f in enumerate((fa, fb)): sheet.alpha_composite(f.resize((FW * S, FH * S), Image.NEAREST), (x0 + j * FW * S, y0 + 22))
    sheet.convert('RGB').save(f'{OUT}/npc_contact_sheet_4x.png')
    # --- side-by-side vs the live v6b characters (idle se, frame 0), same 4x
    live = ['grok_bot', 'ellen', 'nadia', 'bima', 'raka', 'ichsan']
    cmp_ = Image.new('RGBA', (16 + 6 * (FW * S * 2 + 24), FH * S + 70), BG); d = ImageDraw.Draw(cmp_)
    d.text((16, 8), 'LEFT = live v6b character (idle se, from assets/chars/*_v6b_sheet.png)   RIGHT = new NPC v2 (float frame A)   both 4x, same 64x112 frame, same pivot line', fill=(141, 151, 168), font=small)
    for i, (key, name, cfg, opt) in enumerate(NPCS):
        x0 = 16 + i * (FW * S * 2 + 24); lv_ = Image.open(f'game/assets/chars/{live[i]}_v6b_sheet.png').convert('RGBA').crop((0, 4 * FH, FW, 5 * FH))
        cmp_.alpha_composite(lv_.resize((FW * S, FH * S), Image.NEAREST), (x0, 40)); cmp_.alpha_composite(res[key][1].resize((FW * S, FH * S), Image.NEAREST), (x0 + FW * S, 40))
        d.line([(x0, 40 + 100 * S), (x0 + FW * S * 2, 40 + 100 * S)], fill=(90, 101, 119), width=1)
        d.text((x0 + 4, 26), live[i], fill=(141, 151, 168), font=small); d.text((x0 + FW * S + 4, 26), f'{i + 1} {name}', fill=(231, 235, 242), font=small)
    cmp_.convert('RGB').save(f'{OUT}/npc_v2_vs_final_4x.png')
    print('done')
