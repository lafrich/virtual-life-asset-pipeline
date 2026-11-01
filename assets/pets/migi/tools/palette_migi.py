"""Palette for Migi. Official hexes only (style-sheet.md s.3, approved accent shades, v1.3 spark coral).
AD direction for Migi (style-sheet.md 'Migi (the user's cat)'): NO new hexes, nothing pending."""
AD = {
    'void': '#0B0E13', 'floor_dk': '#10141B', 'floor_lt': '#1C2330',
    'wall_shd': '#2A3242', 'wall_lit': '#3A4458', 'wall_top': '#5A6577',
    'grey': '#8D97A8', 'paper': '#E7EBF2',
    'wal_dk': '#3D2A1E', 'wal': '#6B4F3A', 'wal_lt': '#94704F',
    'skin_lt': '#F1D3B5', 'skin_mid': '#D9A47E', 'skin_dp': '#8A5A3C',
    'brass_shd': '#6B5320', 'brass': '#C99A2E', 'brass_lt': '#E0A526', 'glow': '#FFD166',
    'baize': '#1F7A55', 'oxblood': '#7A2E35', 'plum': '#5B3F73',
    'steel': '#3E6FA8', 'gallery': '#EDE6D8', 'ember': '#FF8A3D',
    # approved accent shades (environment v1.1 / chars v1.1)
    'baize_lt': '#5B9C84', 'baize_dk': '#175C4B', 'oxblood_lt': '#A25F44', 'oxblood_dk': '#5C2231',
    'steel_lt': '#7194BE', 'steel_dk': '#2F467E',
    'gallery_mid': '#CFC6B4', 'gallery_dk': '#A89F8D',
    # v1.3 spark coral ramp
    'coral_lt': '#F4A182', 'coral': '#E8745A', 'coral_dk': '#A9484C',
}
PENDING = {}   # AD binding direction: none
PAL = dict(AD)
def rgb(h, a=255):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)
C = {k: rgb(v) for k, v in PAL.items()}
# ramps (light/top, mid/left, shadow/right)
RAMP = {
    'white': ('paper', 'grey', 'grey'),              # AD: paper + cool_grey (mid and shadow); never pure white
    'black': ('wall_lit', 'wall_shd', 'floor_lt'),   # AD: lifted black-hair ramp
}
INNER = {'white': 'grey', 'black': 'floor_lt'}      # inner lines = darkest local value
RIM = 'grey'                                         # AD: 1px cool_grey top-left rim on black fur
USED_ROLES = {
    'paper': 'white fur light, eye glint, blaze', 'grey': 'white fur mid/shadow, black-fur rim, closed-eye lids',
    'wall_lit': 'black fur light', 'wall_shd': 'black fur mid', 'floor_lt': 'black fur shadow',
    'baize_lt': 'eye light', 'baize': 'eye mid', 'coral_lt': 'nose, inner ears',
    'oxblood': 'open mouth (meow)', 'void': 'outer outline, shadow (40%)',
}
