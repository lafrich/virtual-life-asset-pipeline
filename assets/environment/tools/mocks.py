import os
from mock import Room, BY, ROOT
OUT = os.path.join(ROOT, 'previews'); os.makedirs(OUT, exist_ok=True)

def workspace():
    m = Room(10, 8, 'floor_night', title='Workspace')
    m.wallR(2, 'window'); m.wallR(6, 'window'); m.wallL(5, 'door')
    m.add('clock_R', 4, 0); m.add('poster_L', 0, 2); m.add('whiteboard_wall_L', 0, 0)
    m.add('pool_warm_1', 2, 3); m.add('pool_warm_1', 1, 6)
    # row of desks, sitters with their backs to the camera (facing ne)
    m.add('desk_double_sw', 1, 1); m.add('office_chair_ne', 1, 2); m.add('office_chair_ne', 2, 2)
    m.sit('raka', 'desk_double_sw', 1, 1, 0, 'sit_type', 1); m.sit('nadia', 'desk_double_sw', 1, 1, 1, 'sit_type', 2)
    # facing desk: sitter faces the camera (sw)
    m.add('desk_double_ne', 4, 4); m.add('office_chair_sw', 4, 3); m.add('office_chair_sw', 5, 3)
    m.sit('bima', 'desk_double_ne', 4, 4, 0, 'sit_type', 0)
    m.sit('ellen', 'desk_double_ne', 4, 4, 1, 'sit', 0)
    # single desk against the L wall side, sitter facing nw
    m.add('desk_single_se', 1, 5); m.add('office_chair_nw', 2, 5); m.sit('grok_bot', 'desk_single_se', 1, 5, 0, 'sit_type', 3)
    m.add('cubicle_sw', 7, 4); m.add('office_chair_ne', 8, 5); m.sit('reference_man', 'cubicle_sw', 7, 4, 0, 'sit', 0)
    m.add('filing_cabinet_sw', 4, 0); m.add('filing_cabinet_sw', 5, 0); m.add('copier_sw', 8, 0)
    m.add('water_dispenser_sw', 9, 0); m.add('plant_palm', 9, 7); m.add('trash_bin', 3, 2); m.add('pc_tower_sw', 0, 1)
    m.add('plant_bush', 0, 7)
    m.avatar('reference_man_original', 7.5, 2.5, 'idle', 'sw', 0)
    m.avatar('ellen', 6.5, 6.5, 'walk', 'ne', 2)
    return m


def library():
    m = Room(9, 8, 'wood_walnut', skin='library', title='Library')
    m.wallL(5, 'window'); m.wallR(7, 'door')
    for c in (0, 2, 4): m.add('bookshelf_tall_sw', c, 0)
    for r in (1, 2, 3): m.add('bookshelf_tall_1_se', 0, r)
    m.add('library_ladder_sw', 3, 1)
    m.add('rug_library_sw', 3, 2)
    m.add('reading_table_sw', 3, 3); m.add('library_chair_ne', 3, 4); m.add('library_chair_ne', 4, 4)
    m.add('library_chair_sw', 4, 2)
    m.sit('nadia', 'library_chair_ne', 3, 4, 0, 'sit'); m.sit('bima', 'library_chair_sw', 4, 2, 0, 'sit')
    m.add('armchair_leather_se', 1, 6); m.add('floor_lamp', 1, 7); m.add('pool_warm_2', 0, 6)
    m.sit('raka', 'armchair_leather_se', 1, 6, 0, 'sit')
    m.add('globe', 7, 5); m.add('bookshelf_low_sw', 6, 0); m.add('plant_snake', 8, 7)
    m.avatar('grok_bot', 6.5, 2.5, 'idle', 'ne', 0)
    return m

def lounge():
    m = Room(10, 8, 'carpet_plum', title='Lounge')
    m.wallL(2, 'window'); m.wallL(5, 'window'); m.wallR(8, 'doorway')
    m.add('rug_lounge_se', 2, 2)
    m.add('sofa_3_se', 1, 2); m.add('coffee_table_se', 2, 3); m.add('armchair_lounge_nw', 4, 3)
    m.add('sofa_2_ne', 2, 5)
    m.sit('ellen', 'sofa_3_se', 1, 2, 0, 'sit'); m.sit('raka', 'sofa_3_se', 1, 2, 2, 'talk' if False else 'sit')
    m.sit('nadia', 'armchair_lounge_nw', 4, 3, 0, 'sit')
    m.add('pingpong_table_sw', 5, 5)
    pp = BY['pingpong_table_sw']['use_points']
    m.avatar('bima', 5 + pp[0]['point'][0], 5 + pp[0]['point'][1], 'idle', pp[0]['facing'])
    m.avatar('grok_bot', 5 + pp[1]['point'][0] - 0.2, 5 + pp[1]['point'][1], 'idle', 'nw')
    m.add('coffee_counter_sw', 2, 0); m.add('plant_tall', 0, 0); m.add('plant_palm', 9, 0); m.add('plant_bush', 0, 7)
    m.add('plant_snake', 5, 0); m.add('poster_R', 6, 0); m.add('clock_R', 7, 0)
    m.avatar('reference_man', 2.5, 1.5, 'idle', 'ne')
    m.add('pool_warm_2', 2, 2)
    return m

def coordination():
    m = Room(9, 8, 'carpet_steel', title='Coordination Area')
    m.add('rug_coordination_sw', 2, 2)
    m.wallR(6, 'window'); m.wallL(5, 'door')
    m.add('whiteboard_wall_R', 2, 0); m.add('tv_wall_L', 0, 1); m.add('clock_R', 5, 0)
    m.add('meeting_table_sw', 3, 3)
    for c in (3, 4, 5): m.add('meeting_chair_sw', c, 2); m.add('meeting_chair_ne', c, 5)
    m.add('meeting_chair_se', 2, 3); m.add('meeting_chair_nw', 6, 4)
    m.sit('bima', 'meeting_chair_sw', 3, 2, 0, 'sit'); m.sit('ellen', 'meeting_chair_sw', 5, 2, 0, 'sit_type')
    m.sit('raka', 'meeting_chair_ne', 4, 5, 0, 'sit'); m.sit('nadia', 'meeting_chair_se', 2, 3, 0, 'sit')
    m.avatar('grok_bot', 2.5, 1.2, 'talk', 'se', 1)
    return m

def gallery():
    m = Room(9, 7, 'floor_gallery', skin='gallery', title='Gallery')
    m.wallR(8, 'doorway')
    m.add('frame_large_R', 1, 0); m.add('frame_medium_R', 4, 0); m.add('frame_portrait_R', 5, 0); m.add('frame_small_R', 6, 0)
    m.add('frame_medium_L', 0, 1); m.add('frame_large_L', 0, 3); m.add('frame_small_L', 0, 6)
    for c in (1.5, 4, 5): m.add('picture_light_R', c, 0)
    for r in (1, 3.5): m.add('picture_light_L', 0, r)
    m.add('pedestal_bust', 3, 3); m.add('pedestal_sculpture', 6, 4)
    m.add('light_spot', 3, 3); m.add('light_spot', 6, 4)
    m.add('easel_sw', 7, 2); m.add('easel_se', 2, 5)
    m.avatar('raka', 2.5, 1.6, 'idle', 'ne'); m.avatar('nadia', 1.6, 4.0, 'idle', 'nw')
    m.avatar('bima', 6.5, 5.5, 'idle', 'ne')
    m.add('plant_snake', 8, 6)
    return m

def sharing():
    m = Room(8, 8, 'carpet_oxblood', title='Sharing Room')
    m.wallR(6, 'window'); m.wallL(6, 'door')
    m.add('rug_round', 2, 2); m.add('pool_ember_3', 2, 2)
    m.add('campfire', 3, 3, frame=0)
    spots = [((3, 1), 'sw', 'oxblood', 'raka'), ((5, 2), 'nw', 'plum', 'bima'), ((5, 4), 'nw', 'steel', None),
             ((3, 5), 'ne', 'baize', 'nadia'), ((1, 4), 'se', 'tan', 'ellen'), ((1, 2), 'se', 'cream', 'grok_bot')]
    for (c, r), f, col, who in spots:
        bid = f'beanbag_{col}_{f}'; m.add(bid, c, r)
        if who: m.sit(who, bid, c, r, 0, 'sit')
    m.add('notice_board_wall_R', 1, 0)
    m.add('floor_cushion_plum', 6, 5); m.add('floor_cushion_tan', 6, 6); m.add('plant_bush', 7, 0); m.add('plant_palm', 0, 7)
    m.add('notice_board_stand_se', 7, 2)
    return m


def brainstorm():
    m = Room(9, 8, 'carpet_coral', title='Brainstorming Room')
    m.wallR(7, 'window'); m.wallL(7, 'door')
    m.add('whiteboard_big_R', 2, 0); m.add('sticky_wall_L', 0, 1); m.add('moodboard_L', 0, 4)
    m.add('clock_R', 6, 0)
    m.add('rug_brainstorm_sw', 2, 3)
    m.add('high_table', 3, 3)
    for c, r in ((3, 2), (2, 3), (4, 3), (3, 4)): m.add('high_stool', c, r)
    m.add('high_table', 6, 5); m.add('high_stool', 6, 6); m.add('high_stool', 7, 5)
    m.add('plant_tall', 8, 0); m.add('plant_bush', 0, 7); m.add('plant_snake', 8, 7); m.add('floor_lamp', 0, 0)
    m.add('pool_warm_1', 0, 0)
    off = BY['high_stool']['seats'][0]['avatar_offset_y_px']
    m.avatar('nadia', 3.5, 4.5, 'sit', 'ne', 0, off)       # facing the table
    m.avatar('raka', 2.5, 3.5, 'sit', 'se', 1, off)
    m.avatar('ellen', 6.5, 6.5, 'sit', 'ne', 2, off)
    m.avatar('bima', 3.5, 1.3, 'talk', 'sw', 1)               # presenting at the whiteboard
    m.avatar('grok_bot', 1.3, 2.5, 'idle', 'nw', 0)           # at the sticky wall
    return m

def meeting():
    m = Room(9, 7, 'carpet_teal', title='Meeting Room')
    for r in range(7): m.wallL(r, 'glass_meeting')
    m.wallL(4, 'glassdoor_meeting'); m.wallR(7, 'window')
    m.add('tv_meeting_R', 3, 0); m.add('clock_R', 6, 0)
    t = BY['meeting_table_teal_sw']; m.add('meeting_table_teal_sw', 2, 2)
    who = ['bima', 'raka', None, 'nadia', 'ellen', 'grok_bot']
    for k, sl in enumerate(t['chair_slots']):
        c, r = 2 + sl['cell'][0], 2 + sl['cell'][1]
        m.add(sl['chair'], c, r)
        if who[k]: m.sit(who[k], sl['chair'], c, r, 0, 'sit_type' if k == 3 else 'sit', k % 4)
    m.add('glass_partition_tall_cutaway_sw', 7, 2); m.add('glass_partition_tall_cutaway_sw', 8, 2)
    # front (camera-side) glass run along r = R: cutaway, so avatars behind stay visible
    for c in range(m.C):
        k = 'glassdoor' if c == 5 else 'glass'
        m.front_wall(f'wall_R_{k}_meeting_cutaway', c, m.R, c + m.R + 0.5)
    m.add('plant_tall', 8, 0); m.add('water_dispenser_sw', 7, 0); m.add('plant_bush', 8, 6)
    m.avatar('reference_man', 6.5, 6.5, 'walk', 'nw', 2)
    return m

def outdoor(frame=1):
    import json
    meta = json.load(open('chars-iso/metadata.json'))
    has = {k for k in ('swim', 'lie', 'float') if k in meta['animations']}
    m = Room(12, 10, 'deck_stone', title='Outdoor Pool (night)', walls='R', frame=frame)
    for c in (1, 6, 9): m.wallR(c, 'window')
    m.wallR(3, 'glassdoor_outdoor')
    m.add('door_spill', 3, 0)
    W = {(c, r) for c in range(3, 9) for r in range(3, 7)}
    for c in range(12):
        for r in range(10):
            if c >= 10 or r >= 8: m.tile(c, r, 'grass_night')
    for (c, r) in W:
        m.tile(c, r, 'pool_water')
        sides = ''.join(sd for sd, (dc, dr) in (('n', (0, -1)), ('e', (1, 0)), ('s', (0, 1)), ('w', (-1, 0))) if (c + dc, r + dr) not in W)
        corner = {'nw': 'n', 'ne': 'e', 'es': 's', 'sw': 'w'}
        key = ''.join(sorted(sides))
        if len(sides) == 2:
            nm = {'nw': 'n', 'en': 'e', 'es': 's', 'sw': 'w'}[key]; m.add(f'pool_corner_{nm}', c, r)
        elif len(sides) == 1:
            m.add(f'pool_edge_{sides}', c, r)
    for c in range(12):
        for r in range(10):
            if (c, r) in W: continue
            if any((c + dc, r + dr) in W for dc in (-1, 0, 1) for dr in (-1, 0, 1)): m.add('pool_spill', c, r)
    for c in (4, 5, 6): m.add('sun_lounger_towel_sw' if c != 5 else 'sun_lounger_sw', c, 1)
    m.add('sun_lounger_towel_coral_se', 0, 4); m.add('sun_lounger_se', 0, 5)
    m.add('towel_stack', 0, 3)
    m.add('pool_light', 4, 3); m.add('pool_light', 6, 4)
    m.add('pool_bar_sw', 9, 8); m.add('parasol', 8, 8)
    m.add('planter_hedge_2_sw', 0, 8); m.add('plant_palm', 10, 0); m.add('plant_tall', 11, 4); m.add('planter_hedge', 11, 7)
    sw = BY['pool_water']; off = sw['swim_avatar_offset_y_px']
    if 'swim' in has:
        m.avatar('ellen', 5.5, 4.5, 'swim', 'se', frame % 6, off)
        m.avatar('grok_bot', 7.5, 5.5, 'swim', 'nw', (frame + 3) % 6, off)
    else:
        m.avatar('ellen', 5.5, 4.5, 'idle', 'se', 0, off, sw['water_line_px'])
        m.avatar('grok_bot', 7.5, 5.5, 'idle', 'nw', 1, off, sw['water_line_px'])
    if 'float' in has: m.avatar('nadia', 4.5, 5.5, 'float', 'se', frame % 4, off)
    if 'lie' in has:
        m.sit('reference_man', 'sun_lounger_sw', 5, 1, 0, 'lie', frame % 4)
        m.sit('bima', 'sun_lounger_towel_coral_se', 0, 4, 0, 'lie', (frame + 1) % 4)
    m.avatar('raka', 9.5, 9.5, 'idle', 'ne', 0)
    m.avatar('reference_man_original', 3.5, 1.5, 'walk', 'sw', 1)
    return m

if __name__ == '__main__':
    import sys
    for name in (sys.argv[1:] or ['workspace', 'library', 'lounge', 'coordination', 'gallery', 'sharing', 'brainstorm', 'meeting', 'outdoor']):
        im = globals()[name]().render(2)
        im.save(os.path.join(OUT, f'mock_{name}.png')); print(name, im.size)
