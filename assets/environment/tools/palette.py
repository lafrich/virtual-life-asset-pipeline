"""Palette for environment assets.
AD = binding colours from art-direction/style-sheet.md (v1, Bima).
DERIVED = extra shades of the AD room accents, needed for the 3-value rule
(top/left/right). They are NOT in the AD sheet -> pending AD sign-off.
Recolour: edit the hex here and re-run build.py.
"""
AD = {
    'void': '#0B0E13', 'floor_dk': '#10141B', 'floor_lt': '#1C2330',
    'wall_shd': '#2A3242', 'wall_lit': '#3A4458', 'wall_top': '#5A6577',
    'grey': '#8D97A8', 'paper': '#E7EBF2',
    'wal_dk': '#3D2A1E', 'wal': '#6B4F3A', 'wal_lt': '#94704F',
    'skin_lt': '#F1D3B5', 'skin_mid': '#D9A47E', 'skin_dp': '#8A5A3C',
    'brass_shd': '#6B5320', 'brass': '#C99A2E', 'brass_lt': '#E0A526', 'glow': '#FFD166',
    'baize': '#1F7A55', 'oxblood': '#7A2E35', 'plum': '#5B3F73',
    'steel': '#3E6FA8', 'gallery': '#EDE6D8', 'ember': '#FF8A3D',
}
# Accent shades (AD review 21 Oct 2026, env v1.1): computed with the system rule
#   shadow = accent HLS-lightness x0.75, hue shifted 10 deg toward night navy #1C2330 (never black)
#   hilite = 30% toward paper #E7EBF2 (cool) or toward glow #FFD166 (warm)
# baize/oxblood/plum/steel reuse the exact values of the character set (chars-iso metadata.palette).
DERIVED = {
    'baize_lt': '#5B9C84', 'baize_dk': '#175C4B',
    'oxblood_lt': '#A25F44', 'oxblood_dk': '#5C2231',
    'plum_lt': '#857399', 'plum_dk': '#3E2F56',
    'steel_lt': '#7194BE', 'steel_dk': '#2F467E',
    'gallery_mid': '#CFC6B4', 'gallery_dk': '#A89F8D',   # EXCEPTION: hand shade kept (see SHADE_STATUS)
    'ember_dk': '#B3561F',                               # EXCEPTION: hand shade kept
}
SHADE_STATUS = {
    'baize_lt':   dict(old='#2F8F5B', computed='#5B9C84', status='approved: computed, identical to chars'),
    'baize_dk':   dict(old='#155C3F', computed='#175C4B', status='approved: computed, identical to chars'),
    'oxblood_lt': dict(old='#96424A', computed='#A25F44', status='approved: computed (warm -> #FFD166), identical to chars'),
    'oxblood_dk': dict(old='#521E24', computed='#5C2231', status='approved: computed, identical to chars'),
    'plum_lt':    dict(old='#74578E', computed='#857399', status='approved: computed, identical to chars'),
    'plum_dk':    dict(old='#3E2A50', computed='#3E2F56', status='approved: computed, identical to chars'),
    'steel_lt':   dict(old='#5B8CC4', computed='#7194BE', status='approved: computed, identical to chars'),
    'steel_dk':   dict(old='#2A4C75', computed='#2F4A7E', status='approved: chars value #2F467E reused (computed #2F4A7E differs by 4 in G only; identical-to-chars wins)'),
    'gallery_mid': dict(old='#CFC6B4', computed='#C9BF8B', status='EXCEPTION: hand shade kept',
                        reason='x0.75 HLS lightness keeps saturation, so the near-white warm grey turns mustard (#C9BF8B); on the gallery walls/plinths (largest light areas on screen) it reads as yellow staining, not shadow'),
    'gallery_dk': dict(old='#A89F8D', computed='#ADAE51', status='EXCEPTION: hand shade kept',
                       reason='second shadow step of gallery (rule applied twice) becomes olive #ADAE51; reads as a different, saturated colour and breaks the calm museum wall'),
    'ember_dk':   dict(old='#B3561F', computed='#ED3700', status='EXCEPTION: hand shade kept',
                       reason='ember is fully saturated, so x0.75 lightness gives a neon red-orange #ED3700 that is barely darker in value than ember (fails the 3-value read on the fire bed/rug ring and the no-neon rule)'),
}

# Floor tints (AD in-context review, 21 Oct 2026): room floors are night navy with a low-contrast
# 2-value check; a room may tint its floor at most 10-15% toward its accent. Computed, not hand-picked:
#   <acc>_fa = mix(floor_dk, accent, FLOOR_TINT)   <acc>_fb = mix(floor_lt, accent, FLOOR_TINT)
# Walnut check: wal_b = mix(wal, wal_dk, 0.15) (replaces the old wal_lt plank row on the b tile).
FLOOR_TINT = 0.12
def _mix(a, b, t):
    A = [int(a[i:i + 2], 16) for i in (1, 3, 5)]; B = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return '#%02X%02X%02X' % tuple(round(x + (y - x) * t) for x, y in zip(A, B))
FLOOR_TINTS = {}
for _acc in ('plum', 'steel', 'oxblood', 'baize', 'gallery'):
    FLOOR_TINTS[_acc + '_fa'] = _mix(AD['floor_dk'], AD[_acc], FLOOR_TINT)
    FLOOR_TINTS[_acc + '_fb'] = _mix(AD['floor_lt'], AD[_acc], FLOOR_TINT)
FLOOR_TINTS['wal_b'] = _mix(AD['wal'], AD['wal_dk'], 0.15)
PAL = {**AD, **DERIVED, **FLOOR_TINTS}

# ---- style sheet v1.3 (Oct 21 2026): new areas. Ramps below are PRE-APPROVED by Bima (AD).
ACCENT_BRAINSTORM = 'coral'   # single swap point: material name used for the Brainstorming accent
ACCENT_MEETING = 'teal'       # single swap point: material name used for the Meeting Room accent
V13 = {
    'coral_lt': '#F4A182', 'coral': '#E8745A', 'coral_dk': '#A9484C',      # Brainstorming "spark coral"
    'teal_lt': '#6FA9A9', 'teal': '#3D7A80', 'teal_dk': '#2A5266',         # Meeting Room "slate teal"
    'water_dp': '#1B4F6B', 'water': '#2D8FB0', 'water_glow': '#7FE0E8',   # Outdoor pool water ramp
}
def _scale(h, f):
    return '#%02X%02X%02X' % tuple(round(int(h[i:i + 2], 16) * f) for i in (1, 3, 5))
# Computed from v1.3 rules (no hand picks):
V13_DERIVED = {
    'coral_fa': _mix(AD['floor_dk'], V13['coral'], FLOOR_TINT), 'coral_fb': _mix(AD['floor_lt'], V13['coral'], FLOOR_TINT),
    'teal_fa': _mix(AD['floor_dk'], V13['teal'], FLOOR_TINT), 'teal_fb': _mix(AD['floor_lt'], V13['teal'], FLOOR_TINT),
    # glass fill: "floor seen through, 1 step lighter than the floor tint" -> next navy step (wall_shd) at the same 12% teal tint
    'teal_glass': _mix(AD['wall_shd'], V13['teal'], FLOOR_TINT),
    # night grass: baize shadow / mid at about -10% value
    'grass_dk': _scale(DERIVED['baize_dk'], 0.81), 'grass_md': _scale(AD['baize'], 0.81),   # 2 night steps (x0.9 each), AD outdoor review
}
# Parasol "muted yellow": the style sheet gives no hex, so it is COMPUTED and PENDING AD:
#   mid = mix(glow #FFD166, cool_grey, 0.35) (muted); shadow = rule (value x0.75 in HSV, hue 10 deg toward navy
#   -- the HSV form reproduces the AD coral shadow within 1 step: #E8745A -> #AE4543 vs approved #A9484C);
#   light = 30% toward #FFD166 (warm).
import colorsys as _cs
def _rule_shadow(hx, f=0.75, shift=10, navy=219.0):
    r, g, b = [int(hx[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    h, s_, v = _cs.rgb_to_hsv(r, g, b); h *= 360
    d = ((navy - h + 180) % 360) - 180; h = (h + max(-shift, min(shift, d))) % 360
    return '#%02X%02X%02X' % tuple(round(x * 255) for x in _cs.hsv_to_rgb(h / 360, s_, v * f))
_par = _mix(AD['glow'], AD['grey'], 0.35)
V13_PENDING = {'parasol_lt': _mix(_par, AD['glow'], 0.3), 'parasol': _par, 'parasol_dk': _rule_shadow(_par)}
PAL.update(V13); PAL.update(V13_DERIVED); PAL.update(V13_PENDING)

def rgb(h):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)

C = {k: rgb(v) for k, v in PAL.items()}

# 3-value material ramps: (top, left/lit, right/shadow) -- key light top-left
M = {
    'wall':    ('wall_top', 'wall_lit', 'wall_shd'),
    'night':   ('floor_lt', 'wall_shd', 'floor_dk'),   # dark furniture body
    'walnut':  ('wal_lt', 'wal', 'wal_dk'),
    'metal':   ('paper', 'grey', 'wall_top'),
    'metal_d': ('grey', 'wall_top', 'wall_lit'),
    'brass':   ('brass_lt', 'brass', 'brass_shd'),
    'paper':   ('paper', 'gallery', 'gallery_mid'),
    'gallery': ('gallery', 'gallery_mid', 'gallery_dk'),
    'baize':   ('baize_lt', 'baize', 'baize_dk'),
    'oxblood': ('oxblood_lt', 'oxblood', 'oxblood_dk'),
    'plum':    ('plum_lt', 'plum', 'plum_dk'),
    'steel':   ('steel_lt', 'steel', 'steel_dk'),
    'ember':   ('glow', 'ember', 'ember_dk'),
    'tan':     ('skin_mid', 'wal_lt', 'wal'),          # tan leather / cork
    'cream':   ('gallery', 'gallery_mid', 'gallery_dk'),
    'stone':   ('grey', 'wall_top', 'wall_shd'),
    'coral':   ('coral_lt', 'coral', 'coral_dk'),
    'teal':    ('teal_lt', 'teal', 'teal_dk'),
    'water':   ('water_glow', 'water', 'water_dp'),
    'parasol': ('parasol_lt', 'parasol', 'parasol_dk'),
    'coping':  ('wall_top', 'wall_lit', 'wall_shd'),     # one step lighter than the dimmed deck
    'deck':    ('wall_lit', 'wall_shd', 'floor_lt'),
}
def mat(name):
    return tuple(C[k] for k in M[name])
def dark(name):
    return C[M[name][2]]
