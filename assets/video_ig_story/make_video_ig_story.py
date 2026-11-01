"""Instagram Story grid videos (1080x1920, 30 fps, 15.0 s) from existing Virtual Life preview assets. NO TEXT (v2).
Read-only on sources. Pixel art: integer nearest-neighbour upscale only, all paste offsets even (chroma-aligned).
Run: python3 make_video_ig_story.py [v1 v2 v3]"""
import sys, os, math, json, random, subprocess, glob
import numpy as np
from PIL import Image
A = 'assets'
OUT = f'{A}/video_ig_story'
W, H, FPS, DUR = 1080, 1920, 30, 15.0
NF = int(FPS * DUR)
BG = (22, 26, 38); TILE_BG = (29, 34, 51); FRAME = (58, 66, 94); TXT = (231, 235, 242); ACC = (246, 196, 83); SUB = (140, 152, 186)
SAFE_TOP, SAFE_BOT = 250, 1920 - 340

def ev(x): return int(x) // 2 * 2

# ---------- sources ----------
def gif_frames(path, view=None, nviews=4, down=4, key=None, crop=None):
    """GIF -> list of 1x RGBA frames + durations. view: index of the 4-views strip. key: rgb to make transparent."""
    im = Image.open(path); fr, du = [], []
    for i in range(im.n_frames):
        im.seek(i); a = im.convert('RGBA')
        if view is not None:
            cw = a.width // nviews; a = a.crop((view * cw, 0, (view + 1) * cw, a.height))
        if crop: a = a.crop(crop)
        arr = np.array(a)[::down, ::down].copy() if down > 1 else np.array(a)
        arr[(arr[..., :3] == (255, 0, 255)).all(-1)] = 0          # GIF transparency key colour (lost on some frames)
        if key is not None:
            m = (arr[..., :3] == key).all(-1); arr[m] = 0
        fr.append(Image.fromarray(arr)); du.append(im.info.get('duration', 100) or 100)
    return fr, du
def png_frames(pattern, ms):
    fs = sorted(glob.glob(pattern), key=lambda p: int(p.rsplit('_f', 1)[1].split('.')[0]))
    assert fs, pattern
    return [Image.open(f).convert('RGBA') for f in fs], [ms] * len(fs)

class Anim:
    """looping frames; frame_at(t_ms) -> 1x RGBA"""
    def __init__(self, frames, durs): self.f, self.d = frames, durs; self.T = sum(durs)
    def at(self, t):
        t %= self.T
        for f, d in zip(self.f, self.d):
            if t < d: return f
            t -= d
        return self.f[-1]
class Playlist:
    """sequence of (Anim, loops) played in turn, whole list loops"""
    def __init__(self, items): self.items = [(a, a.T * n) for a, n in items]; self.T = sum(L for _, L in self.items)
    def at(self, t):
        t %= self.T
        for a, L in self.items:
            if t < L: return a.at(t)
            t -= L
        return self.items[-1][0].at(0)
    @property
    def f(self): return [fr for a, _ in self.items for fr in a.f]

def union_bbox(frames):
    bb = None
    for f in frames:
        b = f.getchannel('A').getbbox()
        if b: bb = b if bb is None else (min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3]))
    return bb

class Sprite:
    """character tile content: anim(s) cropped to union bbox, scaled k, several side by side"""
    def __init__(self, anims, k, gap=8, offsets=None):
        self.anims, self.k, self.gap = anims, k, gap
        self.bbs = [union_bbox(a.f) for a in anims]
        self.offs = offsets or [i * 1777 for i in range(len(anims))]
        self.w = sum((b[2] - b[0]) * k for b in self.bbs) + gap * (len(anims) - 1); self.h = max((b[3] - b[1]) * k for b in self.bbs)
    def render(self, t):
        c = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0)); x = 0
        for a, b, o in zip(self.anims, self.bbs, self.offs):
            f = a.at(t + o).crop(b); f = f.resize((f.width * self.k, f.height * self.k), Image.NEAREST)
            c.alpha_composite(f, (x, self.h - f.height)); x += f.width + self.gap
        return c

class Scene:
    """1x image(s) or anim, cropped window (x,y,w,h) in 1x, scale k, optional pan to (x2,y2) (display-px smooth, even steps)"""
    def __init__(self, anim, win, k, pan_to=None, pan_ms=15000):
        self.a, self.k, self.win, self.pan_to, self.pan_ms = anim, k, win, pan_to, pan_ms
        self.w, self.h = win[2] * k, win[3] * k; self._cache = {}
    def render(self, t):
        f = self.a.at(t)
        key = id(f)
        if key not in self._cache: self._cache[key] = f.resize((f.width * self.k, f.height * self.k), Image.NEAREST)
        big = self._cache[key]
        x, y = self.win[0] * self.k, self.win[1] * self.k
        if self.pan_to:
            u = (math.sin(2 * math.pi * (t % self.pan_ms) / self.pan_ms - math.pi / 2) + 1) / 2   # ping-pong ease
            x = ev(x + (self.pan_to[0] * self.k - x) * u); y = ev(y + (self.pan_to[1] * self.k - y) * u)
        return big.crop((x, y, x + self.w, y + self.h))

class Crossfade:
    """list of content objects (same size), hold_ms each, fade_ms crossfade"""
    def __init__(self, items, hold_ms, fade_ms=500):
        self.items, self.hold, self.fade = items, hold_ms, fade_ms
        self.w, self.h = items[0].w, items[0].h; self.T = len(items) * hold_ms
    def render(self, t):
        t %= self.T; i = int(t // self.hold); u = t - i * self.hold
        a = self.items[i].render(t)
        if u > self.hold - self.fade:
            b = self.items[(i + 1) % len(self.items)].render(t)
            return Image.blend(a.convert('RGBA'), b.convert('RGBA'), (u - (self.hold - self.fade)) / self.fade)
        return a

class Stack:
    """vertical stack of contents (centered)"""
    def __init__(self, items, gap=12):
        self.items, self.gap = items, gap; self.w = max(i.w for i in items); self.h = sum(i.h for i in items) + gap * (len(items) - 1)
    def render(self, t):
        c = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0)); y = 0
        for it in self.items:
            c.alpha_composite(it.render(t).convert('RGBA'), (ev((self.w - it.w) / 2), y)); y += it.h + self.gap
        return c

class Bob:
    """row of static icons bobbing 1 source px (k display px) out of phase; honest: icons only"""
    def __init__(self, icons, k, gap=10, period=1200, cycle_ms=2400):
        self.icons, self.k, self.gap, self.period, self.cycle = icons, k, gap, period, cycle_ms
        self.n = 4; self.iw = max(i.width for i in icons) * k; self.w = self.n * self.iw + gap * (self.n - 1); self.h = max(i.height for i in icons) * k + 2 * k
    def render(self, t):
        c = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0)); g = int(t // self.cycle)
        for j in range(self.n):
            ic = self.icons[(g * self.n + j) % len(self.icons)]; ic = ic.resize((ic.width * self.k, ic.height * self.k), Image.NEAREST)
            dy = self.k if math.sin(2 * math.pi * (t + j * self.period / 4) / self.period) > 0 else 0
            c.alpha_composite(ic, (j * (self.iw + self.gap) + (self.iw - ic.width) // 2 // 2 * 2, self.h - ic.height - dy))
        return c

# ---------- layout (no text) ----------
X0, Y0, G = 24, 254, 12
CW, RH = 336, 322                                  # 3 cols x 4 rows -> x 24..1056, y 254..1578 (IG safe area 250..1580)
def cell(c, r, cs=1, rs=1):
    return (X0 + c * (CW + G), Y0 + r * (RH + G), CW * cs + G * (cs - 1), RH * rs + G * (rs - 1))
def row4(r):                                       # 4 tiles across one row
    w = 246; return [(X0 + i * (w + 16), Y0 + r * (RH + G), w, RH) for i in range(4)]
FW = 2

def draw_tile(cv, box, content, t):
    x, y, w, h = box
    cv.paste(FRAME, (x, y, x + w, y + h)); cv.paste(TILE_BG, (x + FW, y + FW, x + w - FW, y + h - FW))
    iw, ih = w - 2 * FW, h - 2 * FW
    if isinstance(content, Sprite) and not getattr(content, '_fit', False):
        while (content.w > iw - 16 or content.h > ih - 16) and content.k > 1:
            content.__init__(content.anims, content.k - 1, content.gap, content.offs)
        content._fit = True
    im = content.render(t)
    assert im.width <= iw and im.height <= ih, (box, im.size, (iw, ih))
    px, py = ev(x + FW + (iw - im.width) / 2), ev(y + FW + (ih - im.height) / 2)
    cv.paste(im.convert('RGB'), (px, py), im if im.mode == 'RGBA' else None)

def build(vid, tiles):
    rnd = random.Random(vid)
    offs = [rnd.randint(0, 4000) // 2 * 2 for _ in tiles]
    base = Image.new('RGB', (W, H), BG); black = Image.new('RGB', (W, H), BG)
    mpath = f'{OUT}/{vid}.mp4'
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
           '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
           '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '10', '-tune', 'animation', '-pix_fmt', 'yuv420p',
           '-profile:v', 'high', '-level', '4.1', '-x264-params', 'keyint=60', '-c:a', 'aac', '-b:a', '64k', '-frames:v', str(NF), '-t', '15', '-movflags', '+faststart', mpath]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for n in range(NF):
        t = n * 1000 / FPS
        fr = base.copy()
        for (box, content), o in zip(tiles, offs): draw_tile(fr, box, content, t + o)
        if t < 500: fr = Image.blend(black, fr, t / 500)                  # fade in
        if t > 14400: fr = Image.blend(fr, black, min(1, (t - 14400) / 500))   # closing fade (no card, no text)
        if n == 30: fr.save(f'{OUT}/{vid}_poster.png')
        p.stdin.write(fr.tobytes())
    p.stdin.close(); p.wait()
    return mpath

# ---------- content ----------
def char_gif(path, view=0, key=None): return Anim(*gif_frames(path, view=view, key=key))
def one(path, down=1):
    im = Image.open(path).convert('RGBA')
    if down > 1: im = Image.fromarray(np.array(im)[::down, ::down].copy())
    return im
class Still(Anim):
    def __init__(self, im): super().__init__([im], [1000])
def fr_ms(pat, ms):
    f, _ = png_frames(pat, 100); return Anim(f, ms if isinstance(ms, list) else [ms] * len(f))
SIL = f'{A}/npc_manusia_silver/manusia_silver_'
def silver(view, order):
    g = {k: char_gif(f'{SIL}{k}_4views_4x.gif', view=view) for k in ('idle', 'walk', 'bow', 'statue_poses')}
    return Sprite([Playlist([(g[k], n) for k, n in order])], 6)

def v1():
    ny = Anim(*gif_frames(f'{A}/anim_nyebrang/mock_nyebrang_4x.gif', crop=(0, 28, 1440, 1268)))
    nyebrang = Scene(ny, (0, 12, 322, 300), 2)                                        # top 12 px (CROSS sign) + right edge (mat lettering) cropped
    sil = silver(0, [('idle', 2), ('statue_poses', 1), ('bow', 2), ('walk', 4)])
    RV = f'{A}/street_vehicles/riders_v3/frames'
    ojol = Sprite([fr_ms(f'{RV}/{n}_f*.png', 120) for n in ('gojek_se', 'gojek_pax_se', 'maxim_pax_sw', 'maxim_sw')], 3, gap=8,
                  offsets=[0, 120, 240, 360])    # 4-frame ride loop (lanes preview GIF not used: its bus carries lettering)
    ogah = Sprite([Playlist([(char_gif(f'{A}/npc_pak_ogah/pak_ogah_stop_car_4views_4x.gif'), 3), (char_gif(f'{A}/npc_pak_ogah/pak_ogah_wave_flag_4views_4x.gif'), 3)])], 4)
    parkir = Sprite([Playlist([(char_gif(f'{A}/npc_kang_parkir/kang_parkir_whistle_4views_4x.gif'), 3), (char_gif(f'{A}/npc_kang_parkir/kang_parkir_direct_4views_4x.gif'), 2), (char_gif(f'{A}/npc_kang_parkir/kang_parkir_money_4views_4x.gif'), 2)])], 3)
    indomaret = Scene(Still(one(f'{A}/street_buildings/previews/mock_depan_indomaret_4x.png', down=4)), (150, 372, 121, 159), 2, pan_to=(234, 372), pan_ms=12000)   # below the store signs
    golda = Sprite([Playlist([(char_gif(f'{A}/npc_pemuda_golda/pemuda_golda_sit_sad_4views_4x.gif'), 2), (char_gif(f'{A}/npc_pemuda_golda/pemuda_golda_drink_4views_4x.gif'), 2)])], 3)
    babeh = Sprite([Playlist([(char_gif(f'{A}/npc_babeh_loak/babeh_jam_sit_4views_4x.gif'), 2), (char_gif(f'{A}/npc_babeh_loak/babeh_tas_sit_4views_4x.gif'), 2)])], 3)
    r3 = row4(3)
    return [(cell(0, 0, 2, 2), nyebrang), (cell(2, 0, 1, 2), sil), (cell(0, 2, 2, 1), ojol), (cell(2, 2), ogah),
            (r3[0], parkir), (r3[1], indomaret), (r3[2], golda), (r3[3], babeh)]

def v2():
    AMB = [260, 110, 110, 120, 260, 120, 110, 120, 320]
    cari = Sprite([Playlist([(fr_ms(f'{A}/anim_ambil_barang/frames/ichsan_cari_se_f*.png', 140), 3), (fr_ms(f'{A}/anim_ambil_barang/frames/ichsan_ambil_item_se_f*.png', AMB), 1)]),
                   Playlist([(fr_ms(f'{A}/anim_ambil_barang/frames/npc_cari_sw_f*.png', 140), 3), (fr_ms(f'{A}/anim_ambil_barang/frames/npc_ambil_kosong_sw_f*.png', 140), 1)])], 5, gap=24)
    loak = Scene(Still(one(f'{A}/street_buildings/previews/mock_loak_v3_4x.png', down=4)), (452, 140, 166, 326), 2)   # stalls only, shop/gate signs outside the crop
    def prop_kilau(p):
        base = Image.open(f'{A}/item_temuan/props_temuan/{p}.png').convert('RGBA'); ov, d = png_frames(f'{A}/item_temuan/props_temuan/{p}__kilau_f[0-9].png', 220)
        out = []
        for o in ov:
            b = base.copy(); b.alpha_composite(o); out.append(b)
        return Anim(out, d)
    kil = Crossfade([Scene(prop_kilau(p), (0, 0, 96, 48), 4) for p in ('karung_rongsok_se', 'tong_sampah_besi_se', 'kantong_kresek_se', 'got_kecil_se')], 3000, 300)
    icons = [Image.open(f).convert('RGBA') for f in sorted(glob.glob(f'{A}/item_temuan/icons/*.png'))]
    random.Random(7).shuffle(icons)
    temuan = Stack([kil, Bob(icons, 3, gap=16)], gap=14)
    pemilik = Sprite([Playlist([(char_gif(f'{A}/npc_babeh_loak/babeh_pemilik_counter_etalase_4views_4x.gif'), 2), (char_gif(f'{A}/npc_babeh_loak/babeh_pemilik_work_4views_4x.gif'), 1)])], 3)
    jam = Sprite([char_gif(f'{A}/npc_babeh_loak/babeh_jam_work_4views_4x.gif')], 3)
    tas = Sprite([char_gif(f'{A}/npc_babeh_loak/babeh_tas_work_4views_4x.gif', view=1)], 3)
    bar = Sprite([Playlist([(char_gif(f'{A}/barista_famima/npc/barista_famima_{a}_4arah_4x.gif'), n) for a, n in (('giling', 2), ('steam_tuang', 2), ('seduh', 2), ('serah', 1))])], 3)
    return [(cell(0, 0, 2, 2), cari), (cell(2, 0, 1, 2), loak), (cell(0, 2, 2, 1), temuan), (cell(2, 2), pemilik),
            (cell(0, 3), jam), (cell(1, 3), tas), (cell(2, 3), bar)]

def v3():
    spawn = Scene(Anim(*gif_frames(f'{A}/spawn_hobo/mock/spawn_ichsan_tenda_se_3x.gif', down=3)), (0, 0, 340, 260), 2)
    sil = silver(1, [('statue_poses', 1), ('bow', 2), ('idle', 2)])
    spawn_npc = Scene(Anim(*gif_frames(f'{A}/spawn_hobo/mock/spawn_npc_tenda_sw_3x.gif', down=3)), (0, 40, 340, 159), 2)
    kamar = Scene(Still(one(f'{A}/kamar_cove_kosong/mock/mock_kamar_kosong_1x.png')), (90, 92, 166, 159), 2)
    gf = Sprite([Playlist([(fr_ms(f'{A}/npc_gfunk/poses/gfunk_talk_se_f*.png', 300), 3), (fr_ms(f'{A}/npc_gfunk/poses/gfunk_sit_type_se_f*.png', 200), 3)])], 3)
    th = Sprite([Playlist([(char_gif(f'{A}/npc_theodore/theodore_walk_se_4x.gif', view=None, key=(16, 20, 27)), 4), (fr_ms(f'{A}/npc_theodore/poses/theodore_talk_se_f*.png', 300), 3)])], 3)
    yb = Sprite([Playlist([(fr_ms(f'{A}/npc_yerbies/poses/yerbies_talk_sw_f*.png', 300), 3), (fr_ms(f'{A}/npc_yerbies/poses/yerbies_sit_type_sw_f*.png', 200), 3)])], 3)
    return [(cell(0, 0, 2, 2), spawn), (cell(2, 0, 1, 2), sil), (cell(0, 2, 2, 1), spawn_npc), (cell(2, 2), kamar),
            (cell(0, 3), gf), (cell(1, 3), th), (cell(2, 3), yb)]

VIDEOS = {'v1': ('ig_story_1_jalanan_jakarta', v1), 'v2': ('ig_story_2_cari_jual_barang', v2), 'v3': ('ig_story_3_hidup_di_kota', v3)}
def still(k, t):
    name, fn = VIDEOS[k]; fr = Image.new('RGB', (W, H), BG)
    for box, content in fn(): draw_tile(fr, box, content, t)
    fr.save(f'{OUT}/_work/still_{k}.png'); return fr
if __name__ == '__main__' and sys.argv[1:2] == ['still']:
    for k in sys.argv[2:]: still(k, 1234)
    sys.exit()
if __name__ == '__main__':
    os.makedirs(f'{OUT}/_work', exist_ok=True)
    for k in (sys.argv[1:] or VIDEOS):
        name, fn = VIDEOS[k]; print(name, build(name, fn()))
